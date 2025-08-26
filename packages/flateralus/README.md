# Flateralus Package Structure

This package is organized for clarity, scalability, and maintainability. The structure is based on the following taxonomy:

## Directory Structure

- `core/` — Core engine abstractions and base classes (e.g., `BaseAnimation`).
- `animations/` — Each animation implementation gets its own folder, containing its logic, manifest, and helpers.
- `types/` — All shared types, schemas, and utility types.

## Rationale

- **Separation of Concerns:** Engine logic, animation implementations, and type definitions are kept distinct.
- **Scalability:** New animations can be added in their own folders under `animations/`.
- **Maintainability:** Each part of the system is easy to locate and update.

## Export Pattern

Each directory contains an `index.ts` file to provide clean exports. The package root `index.ts` re-exports from these submodules for a simple public API.

---

This pattern should be followed for all future additions to the package.
