# Implementation Plan - Configure Vitest and write unit tests for useUrunanState

This plan details the steps required to set up Vitest and write comprehensive unit tests for the `useUrunanState` Hook.

---

## Phase 1: Setup Testing Framework

- [~] Task: Install and configure testing dependencies
    - [ ] Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` as devDependencies.
    - [ ] Configure `vitest.config.ts` to support React components and the JSDom environment.
    - [ ] Add `test`, `test:watch`, and `test:coverage` scripts to `package.json`.
- [ ] Task: Verify Vitest configuration with a dummy test
    - [ ] Create a simple dummy test file to ensure the test runner executes successfully.
    - [ ] Verify test runner and coverage reports run without errors.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Setup Testing Framework' (Protocol in workflow.md)

## Phase 2: Implement Unit Tests for useUrunanState Hook

- [ ] Task: Write initialization and basic actions tests
    - [ ] Write unit tests for default state values of participants, items, tethers, tax, and other fees.
    - [ ] Write unit tests for adding and deleting participants.
    - [ ] Write unit tests for adding and deleting receipt items.
- [ ] Task: Write tether and calculations tests
    - [ ] Write unit tests for tether modification actions.
    - [ ] Write unit tests verifying running totals, individual allocations, tax splits, and total bill calculations.
- [ ] Task: Write serialization and sharing tests
    - [ ] Write unit tests for state serialization and deserialization.
    - [ ] Write unit tests validating sharing URL generation and backward compatibility support.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Implement Unit Tests for useUrunanState Hook' (Protocol in workflow.md)
