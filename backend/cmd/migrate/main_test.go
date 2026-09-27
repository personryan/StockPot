package main

import (
	"os"
	"testing"
)

func TestRejectsUnknownCommands(t *testing.T) {
	for _, args := range [][]string{nil, {"reset"}, {"up", "extra"}} {
		if err := run(args); err == nil {
			t.Fatal("expected usage error")
		}
	}
}

func TestEmptyMigrationDirectory(t *testing.T) {
	t.Chdir(t.TempDir())
	if err := run([]string{"status"}); err == nil {
		t.Fatal("expected missing directory error")
	}
	if err := os.Mkdir("migrations", 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("DATABASE_URL", "invalid-connection-that-must-not-be-used")
	for _, command := range []string{"status", "up", "down"} {
		if err := run([]string{command}); err != nil {
			t.Fatal(err)
		}
	}
}
