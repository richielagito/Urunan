# Urunan: Technology Stack

This document defines the technology stack, libraries, and architectural patterns used in Urunan.

## 1. Core Platform
- **Programming Language:** TypeScript (v5.x)
- **Frontend Framework:** Next.js (v16.2.6) & React (v19.2.4) using the App Router architecture.
- **Styling:** Vanilla CSS (TailwindCSS is avoided unless requested) for precise custom styling and layout.

## 2. Interactive & Physics Engines
- **D3 Force-Directed Simulation (`d3-force`):** Used to compute and render the force-directed graph node physics, tethers, and collisions in real-time.
- **Canvas Confetti (`canvas-confetti`):** Renders lightweight, fluid confetti animations upon completing splits and achieving zero balance.
- **Lucide React (`lucide-react`):** Premium, consistent SVG icons for UI controls and nodes.

## 3. Data Flow & State Management
- **Local Storage:** Client-side `localStorage` acts as the primary data store for current session state and local history.
- **Stateless URL Sync (`lz-string`):** Compresses and base64-encodes the entire session JSON into URL query parameters. This allows instant, database-free sharing of read-only states between users.

## 4. AI & Parsing Integration
- **Gemini 2.5 Flash Lite API:** Powers the automated billing scanner. It processes raw images of receipts uploaded by the user, runs OCR-to-JSON extraction, and generates structured list items (name, price, tax/service charge) to feed into the node layout.

## 5. Development & Quality Tooling
- **Linting:** ESLint with Next.js presets.
- **Code Quality:** React Doctor (`react-doctor`) for validating React structure and performance.
