# Auth Service

## Responsibility

The Auth Service handles user authentication and access to protected application features.

Authentication is provided using Supabase Auth.

## Phase 1 implementation

Angular uses the Supabase Auth SDK for email/password registration, login, session
restoration, automatic token refresh, and logout. Only the SDK's Auth client is
exposed to application code. The Supabase Data API remains disabled; application
database operations must go through the Go backend.

Routes:

- `/login` and `/register`: public email/password forms.
- `/auth/callback`: public PKCE email-confirmation callback.
- `/account`: protected account page that checks the session with Go and allows logout.
- `/`: public application shell and process-health check.

The auth guard waits for session restoration before redirecting unauthenticated
users to `/login`. Signals track session changes, including refresh and sign-out
events from other tabs. The account page returns to login when the session clears.
Browser state controls the UI only; Go independently verifies every protected request.

The HTTP interceptor reads the current SDK session token and sets a Bearer header
only for URLs matching the configured Go API origin and path boundary. It does
not send tokens to Supabase through Angular HTTP, unrelated hosts, or similar path
prefixes. Supabase's Auth SDK manages its own requests. No caller-supplied user ID
or manually supplied Authorization header is used to establish the API identity.

### Server validation and endpoint

Go verifies each bearer token by calling the configured project's
`GET /auth/v1/user` with the token and `SUPABASE_PUBLISHABLE_KEY`. Supabase Auth
validates the token; Go uses the returned user ID, never an unverified JWT payload.
This is the REST equivalent of [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser).
It works independently of the Data API and does not require a JWT secret or
privileged Supabase key. The backend accepts the `sb_publishable_` key format.

Verification has a five-second timeout, does not follow redirects, and is not
cached. This adds an Auth network request per protected API request. A future
local JWT/JWKS verifier can replace it behind the verifier interface if needed.
No tokens, passwords, provider error bodies, or credentials are logged.

`GET /api/auth/me` takes no identity parameters and returns:

```json
{
  "id": "1c467b92-e7df-46c3-93cc-412c8bd5d900",
  "email": "user@example.com"
}
```

The ID is required; email is omitted if unavailable. The response is not cached.

- `200`: verified user identity.
- `401`, `{"error":"UNAUTHORISED"}`: missing/malformed bearer credentials or
  credentials rejected by Supabase. Includes `WWW-Authenticate: Bearer`.
- `503`, `{"error":"AUTH_UNAVAILABLE"}`: Auth timeout, outage, rate limit, or
  unusable upstream response. Access is denied and internal details are omitted.

The middleware places the verified user in typed request context; future services
must obtain identity through `auth.UserFromContext`. Query/body `user_id` and
`X-User-ID` headers are never accepted as proof of identity. CORS preflight and
`GET /api/health` remain public.

### Confirmation and logout

Registration uses a minimum of eight characters in the UI; Supabase enforces the
project's password policy. With email confirmation enabled, registration shows a
neutral “check your email” message and does not enter protected routes. Existing
accounts may receive the same message to avoid account enumeration. When Supabase
returns an immediate session, the user proceeds to `/account`.

Add `http://localhost:4200/auth/callback` to Supabase Auth's allowed redirect URLs,
and set the local Site URL to `http://localhost:4200`. Configure the corresponding
HTTPS URLs for deployed environments. The callback exchanges a PKCE code and
removes query parameters from the visible URL. Complete confirmation in the same
browser used to register; if code exchange cannot complete but email is confirmed,
sign in using the email/password form. Provider errors are shown as safe messages.

Logout uses the SDK's `local` scope: it signs out this browser session, clears SDK
session storage on success, and redirects to login. If the request fails, show a
retryable error instead of claiming logout succeeded. Already issued access tokens
can remain valid until expiry; logout is not a guarantee of immediate JWT revocation.

This phase creates no application profile or database tables and makes no Data API
calls. Pantry setup, Fridge Service, password reset, and other domain features are
future work.

The application is responsible for:

- registration flow
- login flow
- logout flow
- reading the authenticated user's identity
- protecting authenticated routes
- attaching authentication tokens to backend requests
- ensuring backend operations are scoped to the authenticated user

Supabase Auth is responsible for:

- securely storing user credentials
- password hashing
- issuing authentication tokens
- refreshing sessions
- validating authentication credentials

---

## Core Operations

### 1. Register User

Input:

```text
email
password
```

Behaviour:

1. Send registration request to Supabase Auth.
2. Supabase creates the authentication user.
3. Application receives the authenticated user's ID.
4. If confirmation is required, show the confirmation message without signing in.
5. Once a session exists, proceed to the protected account page. Application
   profiles and pantry setup are deferred beyond Phase 1.

Possible result:

```text
REGISTERED
EMAIL_CONFIRMATION_REQUIRED
REGISTRATION_FAILED
```

---

### 2. Login

Input:

```text
email
password
```

Behaviour:

1. Authenticate using Supabase Auth.
2. Receive authentication session/token.
3. Store session using the recommended Supabase client behaviour.
4. Redirect user to the application.

Possible result:

```text
AUTHENTICATED
INVALID_CREDENTIALS
LOGIN_FAILED
```

---

### 3. Logout

Behaviour:

1. Sign out through Supabase Auth.
2. Clear the local authentication session.
3. Redirect user to the login page.

---

### 4. Current User

Authenticated requests must identify the user using the authentication token.

Frontend:

```text
Angular
   ↓
Supabase session/token
   ↓
Authorization header
   ↓
Go API
```

Backend:

```text
Go API
   ↓
Validate authentication token
   ↓
Extract user ID
   ↓
Use user ID for service operations
```

The user ID must come from the validated authentication token.

The backend must not trust a `user_id` supplied by the frontend.

---

## Protected Routes

The following application areas require authentication:

- fridge/pantry
- saved recipes
- recipe imports
- matching
- shopping lists
- account/profile

Unauthenticated users should be redirected to login on the frontend.

Backend APIs should independently reject unauthenticated requests.

---

## Authorization

Authentication determines **who the user is**.

Authorization determines **which data the user may access**.

All user-owned data must be scoped to the authenticated user's ID.

Example:

```text
Authenticated User:
user_id = A
```

The backend must only allow access to:

```text
pantry_items.user_id = A
recipes.user_id = A
shopping_lists.user_id = A
```

A user must never be able to access another user's records by changing an ID in a request.

---

## Supabase Responsibilities

Supabase Auth should handle:

- password storage
- password hashing
- authentication tokens
- session management
- token refresh
- email verification if enabled
- password reset if enabled

The application should not implement its own password storage or authentication cryptography.

---

## Application User Data

Authentication data and application profile data should remain separate.

Supabase Auth provides the authentication user ID.

Application-specific data may be stored in a table such as:

```text
profiles
```

Example:

| Column | Description |
|---|---|
| id | Supabase Auth user ID |
| display_name | Optional |
| created_at | Profile creation time |
| updated_at | Last update |

The profile table should only contain application-specific information.

Do not duplicate passwords or authentication credentials in application tables.

---

## Frontend Responsibilities

Angular should:

- provide login and registration pages
- use the Supabase Auth client
- maintain authentication state
- protect authenticated routes
- include the access token when calling protected Go APIs
- redirect unauthenticated users appropriately

---

## Backend Responsibilities

Go should:

- validate Supabase-issued authentication tokens
- extract the authenticated user ID
- reject invalid or expired authentication
- enforce ownership checks
- never accept frontend-provided user IDs as proof of identity

---

## Security Rules

- Do not store passwords in the application database.
- Do not log access tokens.
- Do not expose Supabase service-role credentials to the frontend.
- Treat authentication and authorization as separate concerns.
- Every protected backend endpoint must validate authentication.
- Every user-owned database operation must be scoped to the authenticated user.

---

## Service Flow

```text
User
 ↓
Angular Login/Register
 ↓
Supabase Auth
 ↓
Session / Access Token
 ↓
Angular
 ↓
Go API
 ↓
Validate Token
 ↓
Authenticated User ID
 ↓
Fridge / Recipe / Shopping Services
```
