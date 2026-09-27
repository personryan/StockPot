# Agent Instructions

This repository contains a recipe and pantry management application.

Before making changes:

1. Read `/docs/context.md`.
2. Read `/docs/database.md` if the task involves persistence or data models.
3. Read the relevant service documentation:
   - Fridge → `/docs/services/fridge.md`
   - Recipe importing → `/docs/services/recipe.md`
   - Ingredient matching → `/docs/services/matching.md`
   - Shopping list → `/docs/services/shopping.md`
   - Auth → `/docs/services/autht.md`
4. Follow the appropriate workflow:
   - Development → `/docs/workflows/developer.md`
   - Testing → `/docs/workflows/tester.md`
   - Database changes → `/docs/database.md`

Do not change behaviour documented in these files without updating the
corresponding documentation.

Before implementing a feature:
- understand existing behaviour
- identify affected services
- identify database changes
- define acceptance criteria
- implement
- test
- update documentation if behaviour changes