package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const testUserID = "1c467b92-e7df-46c3-93cc-412c8bd5d900"

func TestVerifiedIdentityAndRejectedTokens(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/user" || r.Method != "GET" || r.Header.Get("apikey") != "sb_publishable_test" {
			t.Error("unexpected verification request")
			w.WriteHeader(500)
			return
		}
		if r.Header.Get("Authorization") != "Bearer valid-access-token" {
			w.WriteHeader(401)
			_, _ = w.Write([]byte(`{"msg":"private upstream details"}`))
			return
		}
		_, _ = w.Write([]byte(`{"id":"` + testUserID + `","email":"test@example.com"}`))
	}))
	defer server.Close()
	verifier, err := NewSupabaseVerifier(server.URL, "sb_publishable_test")
	if err != nil {
		t.Fatal(err)
	}
	for _, token := range []string{"valid-access-token", "expired", "tampered", "wrong-project", "anon-key"} {
		t.Run(token, func(t *testing.T) {
			request := httptest.NewRequest("GET", "/api/auth/me?user_id=attacker", nil)
			request.Header.Set("Authorization", "Bearer "+token)
			request.Header.Set("X-User-ID", "attacker")
			response := httptest.NewRecorder()
			RequireUser(verifier)(http.HandlerFunc(Me)).ServeHTTP(response, request)
			if token == "valid-access-token" {
				if response.Code != 200 || !strings.Contains(response.Body.String(), testUserID) || strings.Contains(response.Body.String(), "attacker") {
					t.Fatal("identity was not taken from verified user")
				}
			} else if response.Code != 401 || strings.Contains(response.Body.String(), "private") {
				t.Fatal("token rejection was not safe")
			}
			if response.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("identity response must not be cached")
			}
		})
	}
}

type verifierFunc func(context.Context, string) (User, error)

func (f verifierFunc) Verify(ctx context.Context, token string) (User, error) { return f(ctx, token) }

func TestMalformedCredentialsNeverReachVerifier(t *testing.T) {
	for _, header := range []string{"", "Basic value", "Bearer", "Bearer one two", "Bearer " + strings.Repeat("x", 16385)} {
		request := httptest.NewRequest("GET", "/api/auth/me?user_id="+testUserID, nil)
		if header != "" {
			request.Header.Set("Authorization", header)
		}
		verifier := verifierFunc(func(context.Context, string) (User, error) {
			t.Fatal("malformed request reached verifier")
			return User{}, nil
		})
		response := httptest.NewRecorder()
		RequireUser(verifier)(http.HandlerFunc(Me)).ServeHTTP(response, request)
		if response.Code != 401 || response.Header().Get("WWW-Authenticate") != "Bearer" {
			t.Fatal("expected bearer challenge")
		}
	}
	request := httptest.NewRequest("GET", "/api/auth/me", nil)
	request.Header.Add("Authorization", "Bearer one")
	request.Header.Add("Authorization", "Bearer two")
	response := httptest.NewRecorder()
	RequireUser(nil)(http.HandlerFunc(Me)).ServeHTTP(response, request)
	if response.Code != 401 {
		t.Fatal("multiple credentials accepted")
	}
}

func TestUnavailableAuthFailsClosed(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		body   string
	}{
		{"outage", 500, "private"}, {"rate limited", 429, "private"},
		{"bad JSON", 200, "not JSON"}, {"missing ID", 200, `{}`},
		{"invalid ID", 200, `{"id":"not-a-user"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			verifier, err := NewSupabaseVerifier(server.URL, "sb_publishable_test")
			if err != nil {
				t.Fatal(err)
			}
			request := httptest.NewRequest("GET", "/api/auth/me", nil)
			request.Header.Set("Authorization", "Bearer value")
			response := httptest.NewRecorder()
			RequireUser(verifier)(http.HandlerFunc(Me)).ServeHTTP(response, request)
			if response.Code != 503 || response.Body.String() != "{\"error\":\"AUTH_UNAVAILABLE\"}\n" {
				t.Fatal("expected safe unavailable response")
			}
		})
	}
}

func TestVerifierDoesNotFollowRedirects(t *testing.T) {
	target := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Error("credentials followed redirect") }))
	defer target.Close()
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, target.URL, 302) }))
	defer source.Close()
	verifier, _ := NewSupabaseVerifier(source.URL, "sb_publishable_test")
	if _, err := verifier.Verify(context.Background(), "token"); !errors.Is(err, ErrUnavailable) {
		t.Fatal("redirect should fail closed")
	}
}

func TestVerifierHonorsTimeoutAndCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	defer server.Close()
	verifier, _ := NewSupabaseVerifier(server.URL, "sb_publishable_test")
	verifier.client.Timeout = 20 * time.Millisecond
	if _, err := verifier.Verify(context.Background(), "token"); !errors.Is(err, ErrUnavailable) {
		t.Fatal("expected timeout")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := verifier.Verify(ctx, "token"); !errors.Is(err, ErrUnavailable) {
		t.Fatal("expected cancellation")
	}
}

func TestVerifierRejectsUnsafeConfiguration(t *testing.T) {
	for _, project := range []string{"", "http://example.com", "https://user:secret@example.com", "https://example.com/path", "https://example.com?query=yes"} {
		if _, err := NewSupabaseVerifier(project, "sb_publishable_test"); err == nil {
			t.Fatal("accepted unsafe project configuration")
		}
	}
	for _, key := range []string{"", "sb_secret_private", "legacy-service-role-token"} {
		if _, err := NewSupabaseVerifier("https://example.supabase.co", key); err == nil {
			t.Fatal("accepted non-publishable key")
		}
	}
}

func TestMeRequiresVerifiedContext(t *testing.T) {
	response := httptest.NewRecorder()
	Me(response, httptest.NewRequest("GET", "/api/auth/me?user_id="+testUserID, nil))
	if response.Code != 401 {
		t.Fatal("accepted unverified identity")
	}
}
