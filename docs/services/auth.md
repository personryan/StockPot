# Auth Service

## Responsibility

The Auth Service handles user authentication and access to protected application features.

Authentication is provided using Supabase Auth.

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
4. Application creates any required application-level user profile.
5. User proceeds to initial pantry setup.

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