// Package auth verifies bearer tokens with the configured Supabase Auth server.
// It never treats decoded JWT claims or client-supplied user IDs as identity.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var ErrInvalidToken = errors.New("invalid access token")
var ErrUnavailable = errors.New("authentication unavailable")
var userIDPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email,omitempty"`
}

type Verifier interface {
	Verify(context.Context, string) (User, error)
}

type SupabaseVerifier struct {
	endpoint string
	key      string
	client   *http.Client
}

func NewSupabaseVerifier(projectURL, publishableKey string) (*SupabaseVerifier, error) {
	u, err := url.Parse(projectURL)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return nil, errors.New("SUPABASE_URL must be a project origin")
	}
	if u.Scheme != "https" && !(u.Scheme == "http" && (u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1" || u.Hostname() == "::1")) {
		return nil, errors.New("SUPABASE_URL must use HTTPS (HTTP is allowed only for local development)")
	}
	if !strings.HasPrefix(publishableKey, "sb_publishable_") || strings.ContainsAny(publishableKey, "\r\n ") {
		return nil, errors.New("SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key")
	}
	return &SupabaseVerifier{
		endpoint: strings.TrimRight(projectURL, "/") + "/auth/v1/user", key: publishableKey,
		client: &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
	}, nil
}

func (v *SupabaseVerifier) Verify(ctx context.Context, token string) (User, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, v.endpoint, nil)
	if err != nil {
		return User{}, ErrUnavailable
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("apikey", v.key)
	response, err := v.client.Do(request)
	if err != nil {
		return User{}, ErrUnavailable
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusUnauthorized || response.StatusCode == http.StatusForbidden {
		return User{}, ErrInvalidToken
	}
	if response.StatusCode != http.StatusOK {
		return User{}, ErrUnavailable
	}
	var user User
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&user); err != nil || !userIDPattern.MatchString(user.ID) {
		return User{}, ErrUnavailable
	}
	return user, nil
}

type userContextKey struct{}

func UserFromContext(ctx context.Context) (User, bool) {
	user, ok := ctx.Value(userContextKey{}).(User)
	return user, ok
}

func RequireUser(verifier Verifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			headers := r.Header.Values("Authorization")
			parts := strings.Fields(r.Header.Get("Authorization"))
			if len(headers) != 1 || len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || len(parts[1]) > 16384 {
				respondError(w, http.StatusUnauthorized, "UNAUTHORISED")
				return
			}
			if verifier == nil {
				respondError(w, http.StatusServiceUnavailable, "AUTH_UNAVAILABLE")
				return
			}
			user, err := verifier.Verify(r.Context(), parts[1])
			if errors.Is(err, ErrInvalidToken) {
				respondError(w, http.StatusUnauthorized, "UNAUTHORISED")
				return
			}
			if err != nil || !userIDPattern.MatchString(user.ID) {
				respondError(w, http.StatusServiceUnavailable, "AUTH_UNAVAILABLE")
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey{}, user)))
		})
	}
}

func Me(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "UNAUTHORISED")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(user)
}

func respondError(w http.ResponseWriter, status int, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	if status == http.StatusUnauthorized {
		w.Header().Set("WWW-Authenticate", "Bearer")
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": code})
}
