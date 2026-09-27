package httpapi

import (
	"net/http"

	"stockpot/backend/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func NewRouter(frontendOrigin string, verifier auth.Verifier) http.Handler {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("{\"status\":\"ok\"}\n"))
	})
	r.With(auth.RequireUser(verifier)).Get("/api/auth/me", auth.Me)
	return r
}
