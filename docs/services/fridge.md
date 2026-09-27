# Fridge Service

## Responsibility

The fridge service manages ingredients currently owned by a user.

It does NOT:
- scrape recipes
- determine recipe compatibility
- create shopping lists

Those responsibilities belong to other services.

---

## Core Operations

### Add Ingredient

Input:
- user_id
- ingredient_id
- quantity
- unit
- expiry_date (optional)

Behaviour:
- creates pantry item
- validates quantity > 0

### Update Ingredient

User can update:
- quantity
- unit
- expiry date

### Remove Ingredient

Removes the pantry item from the user's inventory.

---

## Business Rules

- Pantry items belong to exactly one user.
- Users cannot access another user's pantry.
- Quantity cannot be negative.
- Duplicate ingredients should be merged when units are compatible.
- Expiry date is optional.

---

## Database Tables

Uses:
- ingredients
- pantry_items
- ingredient_aliases

See `/docs/database.md`.

---

## Package

`internal/fridge`

Expected structure:

fridge/
├── service.go
├── repository.go
├── handler.go
├── model.go
└── service_test.go

---

## Tests

At minimum:

- add ingredient
- update ingredient
- remove ingredient
- reject negative quantity
- reject unauthorized access