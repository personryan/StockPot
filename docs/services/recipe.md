# Recipe Service

## Responsibility

The Recipe Service imports recipes from user-provided URLs, extracts the relevant recipe information, and stores the recipe in the database.

It is responsible for:

- validating submitted recipe URLs
- fetching recipe content
- extracting recipe details
- extracting ingredients
- extracting cooking instructions
- preserving the original recipe measurements
- converting measurable ingredients into the application's metric format
- storing the recipe and its source URL

It does **not**:

- determine whether the user has enough ingredients
- compare recipe ingredients against the user's fridge/pantry
- determine ingredient substitutions
- create or manage shopping lists

Those responsibilities belong to other services.

---

## Core Operations

### 1. Import Recipe

Input:

```text
recipe_url
```

Example:

```text
https://example.com/chicken-carbonara
```

Behaviour:

1. Validate the supplied URL.
2. Confirm the URL uses an allowed protocol.
3. Fetch the webpage.
4. Attempt to extract structured recipe data.
5. Parse the recipe.
6. Extract ingredients and cooking instructions.
7. Normalise recognised ingredients.
8. Convert measurable quantities into metric units.
9. Store the recipe.
10. Store the original source URL.

---

## URL Validation

Before fetching a recipe, the service must validate the URL.

Allowed protocols:

```text
https
http
```

The Recipe Service must reject URLs targeting:

- localhost
- loopback addresses
- private/internal IP addresses
- link-local IP addresses
- unsupported protocols
- malformed URLs

Redirects must also be validated before following them.

The service should apply:

- request timeout
- maximum response size
- redirect limit
- allowed content-type validation

This protects the application from unsafe server-side requests.

---

## Recipe Extraction

The service should first attempt to extract structured recipe information from the webpage.

Preferred extraction order:

```text
JSON-LD / Schema.org Recipe
        ↓
Other supported structured metadata
        ↓
HTML parsing fallback
```

Structured recipe data should be preferred over site-specific HTML scraping where available.

---

## Recipe Data

Where available, the service should extract:

```text
Recipe Name
Description
Source URL
Source Website
Image URL
Serving Size
Preparation Time
Cooking Time
Total Time
Ingredients
Instructions
```

Not every recipe is required to contain every optional field.

At minimum, a valid imported recipe should contain:

- recipe name
- at least one ingredient
- cooking instructions

---

## Ingredient Extraction

Recipe ingredients must preserve the original text from the source.

Example source ingredient:

```text
2 cups whole milk
```

The stored recipe ingredient should preserve:

```text
Original Text: 2 cups whole milk
Original Quantity: 2
Original Unit: cups
```

Where possible, the ingredient should also be resolved to a canonical ingredient.

Example:

```text
Raw Ingredient:
whole milk

Canonical Ingredient:
Milk
```

The canonical ingredient should reference the application's ingredient code table.

---

## Ingredient Normalisation

Imported recipe ingredient names may not match the application's canonical ingredient names.

Example:

```text
Recipe:
Scallions

Canonical Ingredient:
Spring Onion
```

The Recipe Service should pass extracted ingredient names through the Ingredient Normalisation process before storage.

Normalisation may use:

- canonical ingredient names
- ingredient aliases

Example:

```text
scallion
    ↓
ingredient alias
    ↓
Spring Onion
    ↓
ingredient_id = 501
```

If an ingredient cannot be identified, its original value must still be preserved.

It should be marked as unresolved rather than silently mapped to an incorrect ingredient.

Example:

```text
Raw Ingredient: Chinese parsley
Canonical Ingredient: UNKNOWN
```

---

## Measurement Conversion

The application is metric-first.

Where an ingredient uses measurable weight or volume, the Recipe Service should calculate and store a normalised metric value.

Canonical units:

```text
Weight → grams (g)
Volume → millilitres (ml)
```

Example:

```text
Original:
1 lb chicken breast

Normalised:
454 g chicken breast
```

Both values should be retained.

Example stored data:

```text
original_quantity = 1
original_unit = lb

normalised_quantity = 454
normalised_unit = g
```

The UI may therefore display:

```text
1 lb • 454 g
```

Natural culinary units should not be unnecessarily converted.

Examples:

```text
1 onion
2 cloves garlic
3 eggs
1 bunch parsley
1 pinch salt
```

These should retain their natural measurement units.

---

## Recipe Instructions

Recipe instructions should be stored in their original order.

Example:

```text
1. Bring a pot of salted water to a boil.
2. Cook pasta until al dente.
3. Fry the bacon.
4. Mix eggs and parmesan.
5. Combine everything together.
```

Each instruction should retain its sequence number.

---

## Duplicate Recipe Handling

Before storing a recipe, the service should check whether the same user has already imported the same source URL.

Initial behaviour:

```text
Same user + same source URL
→ return existing recipe
```

The application should not create unnecessary duplicate recipes from the same URL.

---

## Import Failure

The Recipe Service should return a clear failure when:

- URL is invalid
- website cannot be reached
- website response times out
- recipe information cannot be found
- page content is unsupported
- recipe contains no ingredients
- recipe contains no instructions

Example:

```text
RECIPE_NOT_FOUND
```

The original webpage should not be stored as a valid recipe if extraction fails.

---

## Suggested Import Statuses

```text
IMPORTING
IMPORTED
FAILED
```

Possible failure reasons:

```text
INVALID_URL
FETCH_FAILED
UNSUPPORTED_CONTENT
RECIPE_NOT_FOUND
PARSING_FAILED
```

---

## Database Usage

The Recipe Service primarily uses:

```text
recipes
recipe_ingredients
recipe_instructions
ingredients
ingredient_aliases
```

See:

```text
/docs/database.md
```

for the database schema.

---

## Service Flow

```text
User submits URL
       ↓
Validate URL
       ↓
Fetch webpage
       ↓
Extract recipe
       ↓
Parse ingredients
       ↓
Resolve canonical ingredients
       ↓
Convert measurable units
       ↓
Store recipe
       ↓
Return imported recipe
```

The Matching Service may then use the stored canonical ingredient IDs and normalised quantities to compare the recipe against the user's fridge or pantry.