# Tester Workflow

## Purpose

This document defines how features should be tested for the Recipe Book application.

Testing should validate documented business behaviour rather than only confirming that the implementation runs.

The tester should attempt to identify:

- incorrect behaviour
- missing validation
- boundary conditions
- authorization problems
- data inconsistencies
- regression issues
- unexpected interactions between services

---

# Before Testing

Before testing a feature:

1. Read `/docs/context.md`.
2. Read the relevant service documentation.
3. Read `/docs/database.md` if persistence is involved.
4. Understand the expected behaviour before inspecting test implementation.

Relevant services:

```text
Fridge → fridge.md
Recipe → recipe.md
Matching → matching.md
Shopping → shopping.md
```

Tests should be based on documented requirements and business rules.

---

# Testing Categories

Every feature should be evaluated against the following categories where applicable.

## 1. Happy Path

Verify the expected normal behaviour.

Example:

```text
Pantry:
Chicken Breast = 500 g

Recipe:
Chicken Breast = 300 g

Expected:
ENOUGH
Remaining = 200 g
```

---

## 2. Insufficient Quantity

Verify behaviour when the ingredient exists but there is not enough.

Example:

```text
Pantry:
Milk = 300 ml

Recipe:
Milk = 500 ml

Expected:
INSUFFICIENT
Missing = 200 ml
```

---

## 3. Missing Data

Test behaviour when required data does not exist.

Examples:

- ingredient does not exist in pantry
- recipe does not exist
- shopping list does not exist
- pantry item ID is invalid

Expected behaviour should be explicit rather than causing an unexpected error.

---

## 4. Boundary Conditions

Test important boundaries.

Examples:

```text
Required: 500 g
Available: 500 g
→ ENOUGH
```

```text
Required: 500 g
Available: 499 g
→ INSUFFICIENT
```

```text
Quantity: 0
```

Verify whether zero is allowed according to the service rules.

Other boundaries may include:

- empty lists
- maximum URL length
- very large ingredient quantities
- duplicate items

---

## 5. Invalid Input

Test malformed or unsupported input.

Examples:

```text
negative quantity
invalid unit
empty ingredient
invalid UUID
invalid recipe URL
unsupported URL protocol
```

The application should return controlled validation errors.

---

## 6. Authentication

Verify protected operations require authentication.

Examples:

- unauthenticated user requests pantry items
- unauthenticated user imports a recipe
- unauthenticated user modifies a shopping list

Expected:

```text
401 Unauthorized
```

where appropriate.

---

## 7. Authorization

Verify users cannot access another user's resources.

Example:

```text
User A owns pantry item 123.

User B attempts:

PATCH /api/fridge/items/123
```

Expected:

```text
403 Forbidden
```

or:

```text
404 Not Found
```

depending on the project's API convention.

The same behaviour should be consistent across services.

---

# Service-Specific Testing

## Authentication

Phase 1 automated tests must cover:

- email/password login and safe failure messages
- registration with and without email confirmation
- PKCE confirmation-code handling
- session restoration before route guards decide
- refreshed access tokens and cross-tab sign-out events
- logout success and retryable failure
- token attachment only to the configured Go API origin and path
- missing, malformed, duplicate, and rejected bearer credentials
- verified identity overriding any spoofed user ID input
- Auth outages, cancellation, and redirects failing closed
- public health and CORS preflight remaining available

Mock Supabase Auth in automated tests; do not create real users or send email.
For manual verification, use a Supabase development project with the Data API
disabled and follow the Auth setup in `/README.md`. Verify registration,
confirmation, login, reloading a protected page, and logout. This phase does not
require an application database migration.

## Fridge Service

Test:

- add pantry item
- update pantry item
- remove pantry item
- retrieve pantry items
- duplicate ingredient handling
- negative quantity rejection
- invalid measurement unit
- natural ingredient quantities
- ownership protection

Example:

```text
Existing:
Chicken Breast = 300 g

Update:
500 g

Expected:
Chicken Breast = 500 g
```

---

## Recipe Service

Test:

- valid recipe URL
- malformed URL
- unreachable URL
- redirect handling
- unsupported protocol
- localhost/private network rejection
- recipe without ingredients
- recipe without instructions
- JSON-LD recipe extraction
- measurement conversion
- natural measurement preservation
- unknown ingredient handling
- duplicate recipe import

Example:

```text
Original:
1 lb chicken

Expected:
Original quantity retained: 1 lb
Normalised quantity: approximately 454 g
```

---

## Matching Service

Test:

### Exact Match

```text
Recipe:
Chicken Breast = 200 g

Pantry:
Chicken Breast = 300 g

Expected:
ENOUGH
```

### Insufficient Match

```text
Recipe:
Chicken Breast = 500 g

Pantry:
Chicken Breast = 300 g

Expected:
INSUFFICIENT
Missing = 200 g
```

### Missing Ingredient

```text
Recipe:
Rice = 300 g

Pantry:
No Rice

Expected:
MISSING
```

### Count Matching

```text
Recipe:
Eggs = 3

Pantry:
Eggs = 6

Expected:
ENOUGH
Remaining = 3
```

### Natural Ingredient

```text
Recipe:
Parsley = 1 bunch

Pantry:
Parsley exists

Expected:
AVAILABLE
```

### Approximate Ingredient

```text
Recipe:
Salt = 1 pinch

Pantry:
Salt exists

Expected:
AVAILABLE
```

### Alias Normalisation

If the Recipe Service resolves:

```text
Scallion → Spring Onion
```

the Matching Service should receive the canonical ingredient ID.

The Matching Service should not need to perform raw text alias resolution.

---

## Shopping Service

Test:

### Missing Ingredient

```text
Recipe requires:
Rice = 300 g

Pantry:
No Rice

Expected shopping item:
Rice = 300 g
```

### Insufficient Ingredient

```text
Recipe requires:
Chicken = 500 g

Pantry:
Chicken = 300 g

Expected shopping item:
Chicken = 200 g
```

### Enough Ingredient

```text
Recipe requires:
Milk = 500 ml

Pantry:
Milk = 1,000 ml

Expected:
No shopping item created
```

### Purchased State

Verify:

```text
PENDING
↓
PURCHASED
```

and the item remains available until cleared or removed.

### Duplicate Items

Verify compatible quantities are combined where required.

Example:

```text
Existing:
Chicken = 200 g

Additional requirement:
Chicken = 300 g

Expected:
Chicken = 500 g
```

---

# Database Testing

Where persistence is involved, verify:

- records are created correctly
- updates affect only intended records
- deletions affect only intended records
- foreign keys remain valid
- uniqueness constraints behave correctly
- transactions roll back on failure
- user ownership is enforced

Tests should not depend on production data.

---

# API Testing

For APIs, verify:

- correct HTTP method
- correct status code
- correct response structure
- validation errors
- authorization
- empty responses
- malformed JSON
- unexpected fields where relevant

Example expected statuses:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

Use the project's documented API behaviour rather than assuming all statuses above are required.

---

# Regression Testing

After testing the new behaviour, identify related functionality that could have been affected.

Example:

If ingredient quantity logic changes, also test:

- Recipe measurement conversion
- Matching Service calculations
- Shopping Service missing quantity calculations

If canonical ingredient handling changes, also test:

- fridge ingredient selection
- recipe normalisation
- recipe matching

---

# Automated Tests

Prefer automated tests for repeatable business behaviour.

Go:

```bash
go test ./...
go test -race ./...
go vet ./...
```

Angular:

```bash
npm run test
npm run build
```

Use project-specific commands if they differ.

---

# Bug Reporting

When identifying a bug, document:

```text
Title:
Short description of the problem

Precondition:
Required setup or existing data

Steps:
1.
2.
3.

Expected:
What should happen

Actual:
What actually happened

Severity:
Low / Medium / High / Critical
```

Example:

```text
Title:
Shopping list adds full ingredient quantity instead of missing quantity

Precondition:
Pantry contains 300 g Chicken Breast

Steps:
1. Import recipe requiring 500 g Chicken Breast
2. Create shopping list

Expected:
Shopping list contains Chicken Breast — 200 g

Actual:
Shopping list contains Chicken Breast — 500 g

Severity:
Medium
```

---

# Definition of Done

Testing is complete when:

- happy paths pass
- relevant validation cases pass
- boundary cases are covered
- authentication and authorization are verified
- service business rules are covered
- regression risks have been tested
- automated tests pass
- no unresolved high-severity defects remain
