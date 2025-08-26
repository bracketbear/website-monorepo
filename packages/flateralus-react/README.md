# Flateralus React Package Structure

This package is organized for clarity, scalability, and maintainability. The structure is based on the following taxonomy:

## Directory Structure

- `components/` — All React components (e.g., `AnimationStage`, `DebugControls`).
- `hooks/` — Custom React hooks (present or future).

## Rationale

- **Separation of Concerns:** UI components and hooks are kept distinct.
- **Scalability:** New components and hooks can be added in their respective folders.
- **Maintainability:** Each part of the system is easy to locate and update.

## Export Pattern

Each directory contains an `index.ts` (or `index.tsx`) file to provide clean exports. The package root `index.tsx` re-exports from these submodules for a simple public API.

---

This pattern should be followed for all future additions to the package.
