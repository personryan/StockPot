// Command migrate runs explicit, versioned database migrations. The API never migrates on startup.
package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"stockpot/backend/internal/config"
)

// Migration errors can include SQL and connection details; keep them out of console output.
type quietLogger struct{}

func (quietLogger) Printf(string, ...interface{}) {}
func (quietLogger) Fatalf(string, ...interface{}) {}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) != 1 || (args[0] != "up" && args[0] != "down" && args[0] != "status") {
		return errors.New("usage: go run ./cmd/migrate [up|down|status]")
	}
	if _, err := os.Stat("migrations"); err != nil {
		return errors.New("run this command from backend; migrations directory is missing")
	}
	files, err := filepath.Glob("migrations/*.sql")
	if err != nil {
		return errors.New("could not inspect migrations")
	}
	if len(files) == 0 {
		fmt.Println("No SQL migrations yet; no database connection was made.")
		return nil
	}
	cfg, err := config.Load(".env")
	if err != nil {
		return err
	}
	if cfg.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required for migrations")
	}
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return errors.New("could not configure database connection")
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return errors.New("database connection failed; check DATABASE_URL and network access")
	}
	goose.SetLogger(quietLogger{})
	if err := goose.SetDialect("postgres"); err != nil {
		return errors.New("could not configure migration dialect")
	}
	switch args[0] {
	case "up":
		err = goose.UpContext(ctx, db, "migrations")
	case "down":
		err = goose.DownContext(ctx, db, "migrations")
	case "status":
		var version int64
		version, err = goose.GetDBVersionContext(ctx, db)
		if err == nil {
			fmt.Printf("Database migration version: %d\n", version)
		}
	}
	if err != nil {
		return errors.New("migration command failed; check migration SQL and database access (details suppressed to protect credentials)")
	}
	fmt.Println("Migration command completed.")
	return nil
}
