# Specification - Configure Vitest and write unit tests for useUrunanState

## Background
To meet the project's quality guidelines (TDD, >80% test coverage) specified in `workflow.md`, we need a robust unit testing setup. This track configures Vitest and implements unit tests for `useUrunanState.ts`, which is the core state container for Urunan.

## Scope
- Configure Vitest, JSDom environment, and React Testing Library (if needed).
- Add testing scripts to `package.json`.
- Implement unit tests covering:
  - Default state initialization
  - Participant actions (add, delete)
  - Item actions (add, delete, parse)
  - Tether actions (add, toggle, clear)
  - URL serialization/deserialization logic (`packState`, `unpackState`)

## Technical Details
- **Testing Framework:** Vitest (fast, native ESM support, compatible with Vite/Next.js)
- **Environment:** jsdom (for testing hooks and DOM elements in React)
- **Target File:** `hooks/useUrunanState.ts`
