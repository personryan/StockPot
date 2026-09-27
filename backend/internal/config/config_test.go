package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaults(t *testing.T) {
	cfg, err := parse(func(string) string { return "" })
	if err != nil || cfg.Port != "8080" || cfg.FrontendURL != "http://localhost:4200" {
		t.Fatal("default configuration was not loaded")
	}
}

func TestInvalidConfiguration(t *testing.T) {
	for _, tc := range []struct{ key, value string }{
		{"PORT", "0"}, {"PORT", "65536"}, {"PORT", "abc"},
		{"FRONTEND_URL", "*"}, {"FRONTEND_URL", "https://example.com/path"},
		{"FRONTEND_URL", "https://user:password@example.com"},
		{"FRONTEND_URL", "https://example.com?token=private"},
	} {
		t.Run(tc.key+tc.value[:1], func(t *testing.T) {
			_, err := parse(func(key string) string {
				if key == tc.key {
					return tc.value
				}
				return ""
			})
			if err == nil {
				t.Fatal("expected invalid configuration to fail")
			}
		})
	}
}

func TestLoadPreservesProcessEnvironment(t *testing.T) {
	t.Setenv("PORT", "9000")
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	t.Setenv("DATABASE_URL", "process-value")
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("PORT=8081\nDATABASE_URL=file-value\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil || cfg.Port != "9000" || cfg.DatabaseURL != "process-value" {
		t.Fatal("dotenv overwrote process environment")
	}
}

func TestLoadMissingFile(t *testing.T) {
	t.Setenv("PORT", "8080")
	t.Setenv("FRONTEND_URL", "http://localhost:4200")
	if _, err := Load(filepath.Join(t.TempDir(), "missing.env")); err != nil {
		t.Fatal(err)
	}
}

func TestLoadRedactsParseErrors(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte("SECRET='unterminated-private-value"), 0600); err != nil {
		t.Fatal(err)
	}
	_, err := Load(path)
	if err == nil || err.Error() != "could not read environment file; check its syntax and permissions" {
		t.Fatal("expected a safe dotenv error")
	}
}
