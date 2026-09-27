package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"stockpot/backend/internal/auth"
	"stockpot/backend/internal/config"
	"stockpot/backend/internal/httpapi"
)

func main() {
	if err := run(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(".env")
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	verifier, err := auth.NewSupabaseVerifier(cfg.SupabaseURL, cfg.SupabasePublishableKey)
	if err != nil {
		return err
	}
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.NewRouter(cfg.FrontendURL, verifier),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	failures := make(chan error, 1)
	go func() { failures <- server.ListenAndServe() }()
	log.Print("StockPot API starting on port " + cfg.Port)
	select {
	case err := <-failures:
		if !errors.Is(err, http.ErrServerClosed) {
			return errors.New("API could not listen; check PORT and whether it is already in use")
		}
		return nil
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			_ = server.Close()
			return errors.New("API shutdown timed out")
		}
		return nil
	}
}
