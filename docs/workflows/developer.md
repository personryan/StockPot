# Developer Workflow

## Purpose

This document defines how development work should be performed for the Recipe Book application.

The goal is to keep implementation consistent, minimise unnecessary changes, and ensure the developer understands the relevant domain before modifying code.

---

## Before Development

Before making any code changes:

1. Read `/docs/context.md`.
2. Identify the service or services affected by the task.
3. Read the relevant service documentation.

Examples:

- Fridge changes → `/docs/services/fridge.md`
- Recipe import changes → `/docs/services/recipe.md`
- Ingredient matching changes → `/docs/services/matching.md`
- Shopping list changes → `/docs/services/shopping.md`

4. Read `/docs/database.md` if the task:
   - reads or writes database data
   - changes entities or relationships
   - requires a new table or column
   - changes constraints
   - changes indexes

5. Inspect the existing implementation before writing new code.

Do not assume a feature does not already exist.

---

# Development Process

## 1. Understand the Requirement

Determine:

- what behaviour is being requested
- which service owns the behaviour
- whether frontend changes are required
- whether backend changes are required
- whether database changes are required
- whether an existing API contract changes

Before implementation, define the expected result.

Example:

```text
Feature:
Allow user to update pantry ingredient quantity.

Affected areas:
- Angular Fridge feature
- Go Fridge service
- Fridge API
- pantry_items table

Expected behaviour:
User can update Chicken Breast from 300 g to 500 g.
```

---

## 2. Respect Service Boundaries

Business logic must be implemented in the service that owns the behaviour.

Examples:

Recipe Service:
- imports recipes
- parses ingredients
- normalises recipe measurements

Matching Service:
- compares recipe ingredients against pantry ingredients
- determines enough / insufficient / missing

Shopping Service:
- creates and manages shopping list items

Fridge Service:
- manages pantry inventory

Do not duplicate domain logic between services.

---

## 3. Backend Structure

Go backend code should follow:

```text
HTTP Handler
    ↓
Service
    ↓
Repository
    ↓
Database
```

### Handler

Responsible for:

- parsing requests
- validating basic request structure
- authentication information
- calling the service
- returning HTTP responses

Handlers should not contain business logic.

### Service

Responsible for:

- business rules
- domain logic
- coordinating repositories or other services

### Repository

Responsible for:

- database queries
- persistence
- mapping database records

Repositories should not contain business decisions.

---

## 4. Frontend Structure

Angular code should be organised by feature.

Example:

```text
features/
├── fridge/
├── recipe/
├── matching/
└── shopping/
```

Prefer:

- standalone Angular components
- Angular Signals for local/reactive state
- Angular services for HTTP communication
- PrimeNG for existing complex UI components
- Tailwind CSS for layout and styling

Do not create custom UI components when an appropriate PrimeNG component already exists unless there is a specific requirement.

---

## 5. API Changes

When adding or modifying an API:

Define:

- HTTP method
- endpoint
- request model
- response model
- expected status codes
- error cases

Example:

```text
PATCH /api/fridge/items/{id}
```

Request:

```json
{
  "quantity": 500,
  "unit": "g"
}
```

Response:

```json
{
  "id": "123",
  "ingredient": "Chicken Breast",
  "quantity": 500,
  "unit": "g"
}
```

Avoid exposing database models directly as API response models where possible.

---

## 6. Database Changes

All database schema changes must use migrations.

Do not manually change the production schema without a migration.

For any database change:

1. Update the migration.
2. Update `/docs/database.md`.
3. Update affected repositories.
4. Update affected tests.

Avoid destructive schema changes unless explicitly required.

---

## 7. Ingredient Rules

Always follow the application's ingredient rules.

Measured ingredients:

```text
Weight → grams (g)
Volume → millilitres (ml)
```

Natural quantities should remain natural where appropriate:

```text
1 onion
2 cloves garlic
3 eggs
1 bunch parsley
1 pinch salt
```

Do not introduce new measurement behaviour without checking the Recipe and Matching Service documentation.

---

## 8. Error Handling

Errors should be explicit and meaningful.

Prefer domain errors such as:

```text
RECIPE_NOT_FOUND
INVALID_RECIPE_URL
INGREDIENT_NOT_FOUND
PANTRY_ITEM_NOT_FOUND
INSUFFICIENT_QUANTITY
UNAUTHORISED
```

Do not silently ignore unexpected failures.

Internal implementation details should not be exposed directly to the frontend.

---

## 9. Scope Control

Only modify code required for the requested feature.

Avoid:

- unrelated refactoring
- renaming unrelated files
- changing existing behaviour unnecessarily
- introducing new dependencies without a clear reason
- rewriting working code purely for stylistic reasons

If unrelated technical debt is discovered, document it separately rather than expanding the current task.

---

# After Development

## 10. Validate the Implementation

Before completing the task:

1. Run formatting.
2. Run affected unit tests.
3. Run affected integration tests.
4. Run the full backend test suite.
5. Run frontend tests where applicable.
6. Check for compilation errors.
7. Verify the feature against its expected behaviour.

For Go:

```bash
gofmt -w .
go test ./...
go vet ./...
```

For Angular:

```bash
npm run test
npm run build
```

Use project-specific commands if they differ.

---

## 11. Review for Regression Risk

Check whether the change could affect:

- authentication
- other users' data
- ingredient matching
- recipe importing
- shopping list quantities
- database compatibility
- existing API consumers

Do not assume a change is isolated simply because it was made in one service.

---

## 12. Documentation

Update documentation when behaviour changes.

Examples:

- new database field → update `database.md`
- new Matching Service rule → update `matching.md`
- new Recipe Service behaviour → update `recipe.md`
- architectural change → update `context.md`

Do not update documentation for implementation details that do not affect system behaviour.

---

# Definition of Done

A development task is complete when:

- requested behaviour is implemented
- code follows existing architecture
- service boundaries are respected
- tests pass
- no unrelated functionality is broken
- database migrations exist where required
- relevant documentation has been updated
- frontend and backend contracts remain consistent