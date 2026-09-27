# Matching Service

## Responsibility

The Matching Service compares ingredients required by a recipe against ingredients available in the user's fridge or pantry.

It determines:

- whether an ingredient is available
- whether the available quantity is sufficient
- whether an ingredient name matches through an alias
- whether an approved substitute can be used
- the remaining quantity after the recipe requirement is deducted

It does **not**:

- scrape or import recipes
- manage fridge or pantry inventory
- create or manage shopping lists
- permanently deduct ingredients from inventory

Those responsibilities belong to their respective services.

---

## Core Operations

### 1. Basic Matching

Compare a recipe ingredient against the same ingredient stored in the user's fridge or pantry.

Example:

Fridge/Pantry:

```text
Chicken Breast
Available: 300 g
```

Recipe:

```text
Chicken Breast
Required: 200 g
```

Result:

```text
Status: Enough
Required: 200 g
Available: 300 g
Remaining: 100 g
```

The Matching Service does not modify the user's actual inventory during this operation.

---

### 2. Alias Matching

Different names may refer to the same ingredient.

Aliases should resolve to a canonical ingredient before quantity matching occurs.

Example:

Fridge/Pantry:

```text
Spring Onion
Available: 3 stalks
```

Recipe:

```text
Scallion
Required: 2 stalks
```

Alias resolution:

```text
Scallion → Spring Onion
```

Result:

```text
Status: Enough
Matched Ingredient: Spring Onion
Required: 2 stalks
Available: 3 stalks
```

Other examples may include:

```text
Bell Pepper → Capsicum
Cilantro → Coriander
Garbanzo Beans → Chickpeas
```

Alias matching means the two terms represent the **same ingredient**, not merely similar ingredients.

---

### 3. Substitute Matching

A substitute is a different ingredient that may be used when the requested ingredient is unavailable.

Example:

Recipe:

```text
Chicken Thigh
Required: 200 g
```

Fridge/Pantry:

```text
Chicken Breast
Available: 300 g
```

If Chicken Breast is configured as an acceptable substitute for Chicken Thigh:

```text
Status: Substitute Available
Requested Ingredient: Chicken Thigh
Substitute: Chicken Breast
Required: 200 g
Available: 300 g
```

Substitutions should be treated separately from aliases because the ingredients are not equivalent.

The UI should clearly inform the user when a substitute is being suggested.

---

## Ingredient Matching Logic

### Measured Ingredients

Measured ingredients use normalised metric units.

Canonical units:

- Weight → grams (g)
- Volume → millilitres (ml)

Example:

```text
Chicken Breast
Required: 500 g
Available: 700 g

→ Enough
→ Remaining: 200 g
```

Example:

```text
Milk
Required: 500 ml
Available: 300 ml

→ Insufficient
→ Missing: 200 ml
```

---

### Simple Count Ingredients

Ingredients naturally measured as individual items should use counts.

Example:

```text
Eggs
Required: 3
Available: 6

→ Enough
→ Remaining: 3
```

Other examples:

- onions
- lemons
- potatoes
- eggs

---

### Natural Ingredients

Some ingredients use natural culinary units where precise conversion is unnecessary.

Example:

```text
Parsley
Required: 1 bunch
Available: Parsley exists

→ Available
```

Other natural units may include:

- bunch
- stalk
- clove
- sprig

Quantity comparison should only be performed when both recipe and pantry quantities use compatible natural units.

---

### Approximate Ingredients

Some ingredients use approximate quantities where exact inventory comparison is not useful.

Example:

```text
Salt
Required: 1 pinch
Available: Salt exists

→ Available
```

Examples include:

- pinch
- dash
- to taste
- as needed

For approximate ingredients, the Matching Service should primarily determine whether the ingredient exists in the user's pantry.

---

## Matching Order

Ingredient matching should occur in the following order:

```text
Recipe Ingredient
      ↓
Normalise ingredient name
      ↓
Resolve alias
      ↓
Look for exact pantry ingredient
      ↓
Found?
 ┌────┴────┐
Yes         No
 ↓           ↓
Compare     Check approved
quantity    substitutes
 ↓           ↓
Result      Substitute / Missing
```

Priority:

1. Exact canonical ingredient match
2. Alias match
3. Approved substitute
4. Missing ingredient

An exact or alias match should always take priority over a substitute.

---

## Match Statuses

The Matching Service should return one of the following statuses:

```text
ENOUGH
INSUFFICIENT
AVAILABLE
SUBSTITUTE_AVAILABLE
MISSING
UNKNOWN
```

Example response:

```json
{
  "ingredient": "chicken breast",
  "status": "ENOUGH",
  "requiredQuantity": 200,
  "availableQuantity": 300,
  "remainingQuantity": 100,
  "unit": "g"
}
```

For insufficient quantity:

```json
{
  "ingredient": "milk",
  "status": "INSUFFICIENT",
  "requiredQuantity": 500,
  "availableQuantity": 300,
  "missingQuantity": 200,
  "unit": "ml"
}
```

---

## Business Rules

- Ingredient names must be normalised before matching.
- Metric measurements must use canonical units before quantity comparison.
- Exact matches take priority over aliases and substitutes.
- Aliases represent the same ingredient.
- Substitutes represent different but potentially usable ingredients.
- Substitute matches must be clearly identified to the user.
- Natural and approximate ingredients should not be unnecessarily converted to grams or millilitres.
- Matching must not automatically modify fridge or pantry quantities.
- The Matching Service should return sufficient information for the Recipe and Shopping List services to determine what the user has and what is missing.