# Backend Migration Plan

Goal: keep the frontend as the premium interface, while moving pricing, catalogs, autofill rules, validation, and compatibility logic to backend endpoints.

## Boundary

Frontend keeps:

- room editor UI
- cover cards and layer interactions
- progress indicators
- passport drawer rendering
- user input and local draft state

Backend owns:

- covering catalogs and compatibility matrices
- package/style autofill rules
- required-field validation
- work and material pricing
- estimate calculation
- non-public coefficients and business logic

## First API Contracts

- `GET /backend/api/coverings.php?catalog=walls.decorative_plaster`
  - returns the backend-controlled covering catalog
  - current first catalog: decorative / Venetian plaster
- `GET /backend/api/coverings.php?catalog=floors.common`
  - returns the first backend-controlled floor covering catalog
  - current scope: required groups and package-based autofill for common floor coverings
- `POST /backend/api/covering-autofill.php`
  - returns backend suggestions for missing card passport fields
  - current catalogs: decorative / Venetian plaster and common floor coverings
  - for floors, suggestions are filtered by already selected format/parameters
- `POST /backend/api/covering-validate.php`
  - validates required passport groups against a backend-controlled catalog
  - current catalogs: decorative / Venetian plaster and common floor coverings
  - for floors, required groups are now context-aware and depend on covering + selected format
- `POST /backend/api/covering-options.php`
  - returns backend-compatible option groups, required groups and passport completion metadata for a covering and selected parameters
  - current first scope: common floor coverings and format-dependent options

Shared backend modules:

- `backend/lib/covering-floor.php`
  - shared floor covering detection, format detection, option compatibility and required-group logic

Future endpoints:

- `POST /backend/api/estimate/calculate.php`
- `GET /backend/api/assets/covering-preview.php`

## Migration Steps

1. Keep the current JS behavior stable.
2. Add backend-ready catalog contracts and PHP endpoints.
3. Move decorative plaster UI to consume `RepairCoveringsApi.fetchCoveringCatalog`.
4. Move card autofill to backend. Started for decorative / Venetian plaster and common floor coverings.
5. Move validation of required groups to backend. Started for decorative / Venetian plaster and common floor coverings via `covering-validate.php`.
6. Move compatibility matrices to backend. Started for common floor coverings via `covering-options.php`.
7. Move work/material calculations and private coefficients to backend.

## Security Notes

- Do not expose raw price lists or internal coefficients from public JS.
- Keep public image assets in `assets/repair-coverings`.
- Keep private compatibility and pricing rules in `backend/data` or a database.
- Add authorization/rate limiting before exposing calculation endpoints in production.
