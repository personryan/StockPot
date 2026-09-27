# Shopping Service

## Responsibility

The Shopping Service creates and manages a shopping list based on ingredients that are missing or insufficient for a recipe the user wants to cook.

It uses the result produced by the Matching Service to determine what needs to be purchased.

It is responsible for:

- creating shopping list items from missing ingredients
- creating shopping list items for insufficient ingredient quantities
- allowing users to manually add items
- allowing users to mark items as purchased
- allowing users to remove items
- preventing unnecessary duplicate items where possible

It does **not**:

- scrape or import recipes
- determine whether pantry ingredients match recipe ingredients
- resolve ingredient aliases
- determine ingredient substitutions
- manage fridge or pantry inventory

Those responsibilities belong to other services.

---

## Core Operations

### 1. Create Shopping List From Recipe

The Shopping Service receives missing or insufficient ingredients from the Matching Service.

Example:

Recipe requires:

```text
Chicken Breast: 500 g
Milk: 500 ml
Eggs: 3
Garlic: 2 cloves
```

User's fridge contains:

```text
Chicken Breast: 300 g
Milk: 500 ml
Eggs: 1
Garlic: 5 cloves
```

Matching Service returns:

```text
Chicken Breast
Status: INSUFFICIENT
Missing: 200 g

Milk
Status: ENOUGH

Eggs
Status: INSUFFICIENT
Missing: 2

Garlic
Status: ENOUGH
```

Shopping Service creates:

```text
☐ Chicken Breast — 200 g
☐ Eggs — 2
```

Only the missing quantity should be added to the shopping list.

---

## 2. Shopping List Items

Each shopping list item should contain:

- ingredient
- required quantity
- unit
- purchased status
- source recipe, where applicable

Example:

```text
☐ Chicken Breast — 200 g
☐ Eggs — 2
☐ Parmesan — 100 g
```

Once purchased:

```text
☑ Chicken Breast — 200 g
☐ Eggs — 2
☐ Parmesan — 100 g
```

---

## 3. Add Missing Ingredient

When the Matching Service returns:

```text
MISSING
```

the entire recipe requirement should be added.

Example:

Recipe requires:

```text
Rice: 300 g
```

Pantry contains:

```text
No Rice
```

Shopping item:

```text
☐ Rice — 300 g
```

---

## 4. Add Insufficient Ingredient

When the Matching Service returns:

```text
INSUFFICIENT
```

only the difference between the required and available quantities should be added.

Example:

```text
Recipe requires: 500 g chicken
Pantry contains: 300 g chicken
```

Shopping item:

```text
☐ Chicken — 200 g
```

The Shopping Service should not add the full 500 g requirement.

---

## 5. Mark Item as Purchased

Users can mark individual shopping list items as purchased.

Input:

```text
shopping_list_item_id
purchased = true
```

Result:

```text
☑ Chicken Breast — 200 g
```

The item should remain visible until the user removes or clears completed items.

---

## 6. Manual Shopping Items

Users should also be able to manually add items that are unrelated to a recipe.

Example:

```text
☐ Dishwashing Liquid
☐ Kitchen Towels
☐ Bananas
```

Manual items do not require a recipe reference.

Where the manually added item corresponds to a recognised ingredient, it may reference the canonical ingredient table.

---

## 7. Duplicate Handling

When adding recipe ingredients to an existing shopping list, the service should avoid unnecessary duplicate entries.

Example:

Existing shopping list:

```text
Chicken Breast — 200 g
```

Another recipe requires an additional:

```text
Chicken Breast — 300 g
```

Where the units are compatible, the quantities may be combined:

```text
Chicken Breast — 500 g
```

Items from different recipes may retain references to each contributing recipe.

---

## Shopping List Status

A shopping list item should have a simple status:

```text
PENDING
PURCHASED
```

Initial value:

```text
PENDING
```

When the user checks the item:

```text
PURCHASED
```

---

## Business Rules

- Only missing quantities should be added to the shopping list.
- Ingredients already available in sufficient quantity must not be added.
- Missing ingredients should use the application's canonical ingredient where available.
- Compatible duplicate ingredients should be combined where appropriate.
- Users may manually add shopping items.
- Users may mark items as purchased or pending.
- Shopping list creation must not modify pantry quantities.
- Purchasing an item must not automatically add it to the pantry in the initial version.
- Shopping lists belong to a single authenticated user.
- Users must not access another user's shopping list.

---

## Service Flow

```text
Recipe
   ↓
Matching Service
   ↓
Match Results
   │
   ├── ENOUGH → Ignore
   │
   ├── AVAILABLE → Ignore
   │
   ├── MISSING → Add full required quantity
   │
   └── INSUFFICIENT → Add missing quantity
   ↓
Shopping Service
   ↓
Shopping List
```

---

## Database Usage

The Shopping Service primarily uses:

```text
shopping_lists
shopping_list_items
ingredients
recipes
```

See:

```text
/docs/database.md
```

for the database schema.