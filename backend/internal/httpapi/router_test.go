package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	response := httptest.NewRecorder()
	NewRouter("http://localhost:4200", nil).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("unexpected response: %d", response.Code)
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil || body.Status != "ok" {
		t.Fatal("invalid health body")
	}
}

func TestCORS(t *testing.T) {
	for _, tc := range []struct{ name, origin, allowed string }{
		{"allowed", "http://localhost:4200", "http://localhost:4200"},
		{"rejected", "https://untrusted.example", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, method := range []string{http.MethodGet, http.MethodOptions} {
				request := httptest.NewRequest(method, "/api/health", nil)
				request.Header.Set("Origin", tc.origin)
				if method == http.MethodOptions {
					request.Header.Set("Access-Control-Request-Method", "GET")
					request.Header.Set("Access-Control-Request-Headers", "Authorization")
				}
				response := httptest.NewRecorder()
				NewRouter("http://localhost:4200", nil).ServeHTTP(response, request)
				if response.Header().Get("Access-Control-Allow-Origin") != tc.allowed {
					t.Fatal("incorrect CORS origin")
				}
				if method == http.MethodOptions && tc.allowed != "" && response.Header().Get("Access-Control-Allow-Headers") == "" {
					t.Fatal("authorization preflight denied")
				}
			}
		})
	}
}

func TestUnknownRouteAndMethod(t *testing.T) {
	for _, tc := range []struct {
		method, path string
		status       int
	}{
		{http.MethodGet, "/api/missing", http.StatusNotFound},
		{http.MethodPost, "/api/health", http.StatusMethodNotAllowed},
	} {
		response := httptest.NewRecorder()
		NewRouter("http://localhost:4200", nil).ServeHTTP(response, httptest.NewRequest(tc.method, tc.path, nil))
		if response.Code != tc.status {
			t.Fatalf("wanted %d, got %d", tc.status, response.Code)
		}
	}
}

func TestProtectedRouteAndPreflight(t *testing.T) {
	router := NewRouter("http://localhost:4200", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest("GET", "/api/auth/me?user_id=forged", nil))
	if response.Code != http.StatusUnauthorized {
		t.Fatal("auth route is not protected")
	}
	request := httptest.NewRequest("OPTIONS", "/api/auth/me", nil)
	request.Header.Set("Origin", "http://localhost:4200")
	request.Header.Set("Access-Control-Request-Method", "GET")
	request.Header.Set("Access-Control-Request-Headers", "Authorization")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK && response.Code != http.StatusNoContent {
		t.Fatal("preflight incorrectly requires a token")
	}
	if response.Header().Get("Access-Control-Allow-Origin") != "http://localhost:4200" {
		t.Fatal("missing CORS permission")
	}
}
