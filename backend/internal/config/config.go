package config

import (
	"errors"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	FrontendURL            string
	DatabaseURL            string
	SupabaseURL            string
	SupabasePublishableKey string
}

// Load reads an optional dotenv file. Existing process variables take precedence.
// Errors deliberately omit dotenv contents and configuration values.
func Load(path string) (Config, error) {
	if err := godotenv.Load(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, errors.New("could not read environment file; check its syntax and permissions")
	}
	return parse(os.Getenv)
}

func parse(getenv func(string) string) (Config, error) {
	cfg := Config{
		Port: getenv("PORT"), FrontendURL: getenv("FRONTEND_URL"),
		DatabaseURL: getenv("DATABASE_URL"), SupabaseURL: getenv("SUPABASE_URL"),
		SupabasePublishableKey: getenv("SUPABASE_PUBLISHABLE_KEY"),
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	port, err := strconv.Atoi(cfg.Port)
	if err != nil || port < 1 || port > 65535 {
		return Config{}, errors.New("PORT must be an integer between 1 and 65535")
	}
	cfg.Port = strconv.Itoa(port)
	if cfg.FrontendURL == "" {
		cfg.FrontendURL = "http://localhost:4200"
	}
	origin, err := url.Parse(cfg.FrontendURL)
	if err != nil || origin.Hostname() == "" || (origin.Scheme != "http" && origin.Scheme != "https") || origin.User != nil || origin.RawQuery != "" || origin.ForceQuery || origin.Fragment != "" || (origin.Path != "" && origin.Path != "/") || strings.Contains(cfg.FrontendURL, "*") {
		return Config{}, errors.New("FRONTEND_URL must be a single HTTP or HTTPS origin without credentials, query, or path")
	}
	cfg.FrontendURL = strings.TrimSuffix(cfg.FrontendURL, "/")
	return cfg, nil
}
