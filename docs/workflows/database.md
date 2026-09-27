# Database workflow

## Current state

The schema in [database.md](../database.md) is proposed. No business tables are
created by the scaffold. SQL migrations belong in `backend/migrations` and use
Goose, pinned in `backend/go.mod`. The runner uses pgx and loads `backend/.env`
when invoked from `backend`; process environment variables take precedence.

## Add a migration

1. Read the affected service docs and proposed schema.
2. Add a new file named `YYYYMMDDHHMMSS_description.sql` in `backend/migrations`.
   Use a unique, increasing UTC timestamp. Never edit an already applied migration.
3. Include both sections below, replacing the comments with the intended SQL:

   ```sql
   -- +goose Up
   -- Schema changes, constraints, indexes, and RLS policies.

   -- +goose Down
   -- Reverse only this migration, in dependency order.
   ```

4. SQL migrations run in a transaction by default. Use Goose statement blocks
   for functions containing internal semicolons. Document any operation that
   cannot run transactionally.
5. Test on a disposable Supabase development database, including ownership/RLS
   tests as the application role. A plain PostgreSQL database will not provide
   Supabase `auth.users` or `auth.uid()` automatically.
6. Update the schema and affected service documentation with implemented behaviour.

## Run commands

From `backend`, configure `DATABASE_URL` in the ignored `.env` file, or through
the process environment. Use the development database's direct or session
connection and its required SSL settings; do not put credentials in commands.

```sh
go run ./cmd/migrate status
go run ./cmd/migrate up
```

`status` prints the current applied version, and may initialise Goose's version
metadata table on a fresh database. `up` applies pending migrations. With no SQL
files, all commands report that there are no migrations and make no connection.
Only run one migration process against a database at a time. API startup does not
connect to the database or run migrations.

On a disposable database, test reversing the most recent migration and reapplying it:

```sh
go run ./cmd/migrate down
go run ./cmd/migrate up
```

`down` reverses one migration and can remove data. Review rollback SQL before use.
Do not automatically reset or migrate a production database during tests. The
runner has a two-minute timeout and suppresses database error details so connection
credentials and SQL data cannot leak to console output. Diagnose failures using
the reviewed SQL and access-controlled database tooling.

Reference: [Goose SQL migration documentation](https://github.com/pressly/goose).
