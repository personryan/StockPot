# StockPot

Recipe and pantry management application. This repository currently provides the
development foundation and Phase 1 authentication: an Angular shell, email/password
registration and login, logout, protected routes, and a Go API with health and
verified-user endpoints. Pantry, recipes, matching, and shopping are future work.

## Prerequisites

- Node.js 22.12+ (22.x) or 24.x and npm. Node 24 is the development default.
- Go 1.25 or newer on your PATH. Restart your terminal after installing Go.
- A Supabase development project with email/password Auth enabled. Keep the Data
  API disabled; application data will be accessed through Go.

## Start locally

### Backend

From the repository root:

```sh
cd backend
go mod download
go run ./cmd/api
```

If `backend/.env` does not exist, copy `backend/.env.example` to it first. Keep any
existing values. Run Go commands from `backend` so `.env` and migrations resolve
correctly. Existing process variables override `.env` values.

| Variable | Default | Current use |
|---|---|---|
| `PORT` | `8080` | API listener |
| `FRONTEND_URL` | `http://localhost:4200` | Single allowed browser origin for CORS |
| `DATABASE_URL` | Empty | Required by migration commands once SQL files exist |
| `SUPABASE_URL` | Required for API startup | Supabase project origin used for Auth validation |
| `SUPABASE_PUBLISHABLE_KEY` | Required for API startup | Public `sb_publishable_` key from the same project; no privileged key needed |

The API serves `GET http://localhost:8080/api/health` with HTTP 200 and
`{"status":"ok"}`. This is process health, not database or Supabase readiness.
Unknown routes return 404; unsupported methods on the health route return 405.
CORS permits the configured frontend origin and the Authorization header.
CORS does not authenticate requests. `GET /api/auth/me` requires a Supabase Bearer
access token and returns the verified user's ID and email. Go validates the token
with Supabase Auth on every protected request. Invalid credentials return 401;
Auth outages return 503. API startup validates Auth configuration without making a
network call; `/api/health` does not test those credentials.
Stop the server with Ctrl+C.

### Frontend

Open another terminal from the repository root:

```sh
cd frontend
npm ci
npm start
```

Open `http://localhost:4200`. The page checks the API connection and lets you retry
when the backend is unavailable. In PowerShell, use `npm.cmd` if execution policy
blocks `npm.ps1`.

Development builds replace `src/environments/environment.ts` with
`environment.development.ts`. The existing environment values are preserved.
`apiUrl` must include `/api` and match the backend port. Set `supabaseUrl` and
`supabasePublishableKey` to the same project used by the backend. Copy that public
key to `SUPABASE_PUBLISHABLE_KEY` in `backend/.env` if it is not set. Do not use
legacy anon JWT keys or privileged keys in this implementation.

### Supabase Auth setup

1. Enable the email/password provider. Choose whether email confirmation is required.
2. Set the Auth Site URL to `http://localhost:4200` for local development.
3. Add `http://localhost:4200/auth/callback` to the Auth redirect URL allowlist.
4. Use `/register` to create an account. If requested, confirm the email in the
   same browser, or sign in after confirming it. `/login` signs in; `/account`
   verifies identity with Go and provides logout.

Registration without an immediate session shows a confirmation message. The SDK
persists and refreshes the session. Logout affects this browser session; other
devices are unaffected. No profile table is created and no application data is
read through the Supabase Data API. See [Auth Service](docs/services/auth.md) for
the token validation contract and session behaviour.

`npm run build` creates an optimised production build in `frontend/dist/stockpot/browser`,
using `environment.ts`. Before deployment, configure its production values;
the existing file currently retains its placeholders and `production: false`.
Angular's production optimisation is controlled by `angular.json`, not that flag.
Frontend configuration is public: only Supabase publishable keys belong there,
never database credentials or service-role keys. The backend `.env` stays ignored.

## Verification

From `backend`:

```sh
go test ./...
go vet ./...
go build ./...
```

Format changed Go files with `gofmt`. Tests cover configuration defaults, dotenv
precedence and safe errors, health, CORS, token verification, identity spoofing,
Auth outages, redirect handling, and migration command arguments.
They need no database. Where a C compiler is available, also run `go test -race ./...`.

From `frontend`:

```sh
npm test
npm run build
```

Vitest smoke tests use mocked HTTP responses to check the routed shell, successful
health checks, session restoration, confirmation, login/logout, route protection,
and token isolation. Tests mock Supabase and send no registration emails.
For a manual smoke check, start both servers,
confirm “Connected to StockPot,” stop the backend, and use “Check connection” to
confirm the failure message. Restart the backend and retry to confirm recovery.
Also register a development user, confirm the email, sign in, reload `/account`,
verify the session, and sign out. A signed-out visit to `/account` must redirect to
login. Test with the Data API disabled throughout.

## Database migrations

From `backend`:

```sh
go run ./cmd/migrate status
go run ./cmd/migrate up
```

No business SQL migrations exist yet; these commands currently make no database
connection. See the [database workflow](docs/workflows/database.md) for migration
naming, SQL format, rollback, and validation. Schema changes are always explicit;
the API does not migrate on startup.

## Project guide

- `frontend/src/app/core`: shared HTTP services and future infrastructure.
- `frontend/src/app/features`: feature components; currently the home shell.
- `backend/cmd/api`: API entrypoint and graceful shutdown.
- `backend/internal/config`: environment loading and validation.
- `backend/internal/httpapi`: Chi router and HTTP smoke tests.
- `backend/cmd/migrate`, `backend/migrations`: migration runner and future SQL files.
- [AGENTS.md](AGENTS.md): instructions for repository changes.
- [Project context](docs/context.md), [database design](docs/database.md), and
  [developer workflow](docs/workflows/developer.md): feature requirements and conventions.

The frontend uses Angular 21, PrimeNG 21 with Aura, and Tailwind CSS 4 through
PostCSS. Integration references: [Angular compatibility](https://angular.dev/reference/versions),
[PrimeNG setup](https://primeng.org/installation), and
[Tailwind's Angular guide](https://tailwindcss.com/docs/installation/framework-guides/angular).
