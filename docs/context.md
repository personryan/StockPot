# Project Context

## Product

StockPot is a web application that helps users decide what they can
cook using ingredients currently available at home.

Users maintain a virtual fridge/pantry.

They can submit a recipe URL. The application extracts the recipe,
normalises its ingredients, compares them against the user's fridge,
and identifies missing ingredients.

Missing ingredients can be added to a shopping list.

---

## Core User Flow

1. User signs in.
2. User maintains fridge inventory.
3. User submits recipe URL.
4. Recipe service extracts recipe.
5. Matching service compares required ingredients with fridge.
6. Application displays:
   - ingredients available
   - ingredients missing
   - recipe instructions
7. Missing ingredients may be added to shopping list.

---

## Architecture

### Frontend

- Angular
- TypeScript
- Angular Signals
- Angular HttpClient
- Tailwind CSS
- PrimeNG

#### UI responsibilities

Tailwind CSS:
- page layout
- spacing
- responsive behaviour
- typography
- colours
- custom component styling

PrimeNG:
- dialogs
- dropdowns/selects
- autocomplete
- toast notifications
- date pickers
- tooltips
- loading indicators
- complex accessible UI controls

Prefer PrimeNG components for interactive UI controls.
Do not recreate existing PrimeNG components unless there is a
specific design or behaviour requirement.

### Backend
- Go
- Chi router
- pgx
- goquery

### Database
- PostgreSQL
- Hosted on Supabase

### Authentication
- Supabase Auth

### Deployment
- Angular frontend: Vercel
- Go backend: TBD / Vercel
- Database: Supabase

---

## Core Domains

### Fridge
Maintains ingredients owned by a user.

See:
`/docs/services/fridge.md`

### Recipe
Imports and stores recipes from URLs.

See:
`/docs/services/recipe.md`

### Matching
Compares recipe requirements against fridge inventory.

See:
`/docs/services/matching.md`

### Shopping List
Tracks ingredients a user needs to purchase.

See:
`/docs/services/shopping-list.md`

### Auth
Handles user authentication and access to protected application features.

See:
`/docs/services/auth.md`
---

## Ingredient Measurement Standard

All ingredient quantities must be normalised before being stored or compared.

Canonical units:

- Weight → grams (g)
- Volume → millilitres (ml)
- Countable ingredients → units/count
- Temperature → degrees Celsius (°C)

Alternative units such as kilograms, litres, ounces, pounds, cups,
tablespoons, and teaspoons must be converted into the canonical unit
before ingredient matching is performed.

The original recipe measurement must also be retained for display purposes.

## Engineering Principles

- Keep domain logic separate from HTTP handlers.
- Avoid business logic inside database repositories.
- Prefer simple Go standard-library patterns.
- Use interfaces only where they provide a clear benefit.
- All database changes require migrations.
- New behaviour requires tests.