# Urunan: Interactive Node-Based Expense Tracker

**Product Vision**
Urunan transforms the tedious chore of splitting group expenses into an engaging, visual, and frictionless experience. By replacing traditional spreadsheet-style lists with a gamified, physics-based node graph, the application provides a highly interactive interface. It relies on a completely serverless, local-storage-first architecture to ensure instant load times and zero backend maintenance, utilizing intelligent AI parsing for automated data entry.

**Core Features**

- **Force-Directed Node Interface:** Users and receipt items are represented as floating nodes. The expense allocation is executed by dragging and dropping item "orbs" onto user avatars, creating visual tethers that automatically calculate running totals. Shared items are placed between nodes to distribute the cost evenly.
- **AI-Powered Receipt Parsing:** Integration with the Gemini 1.5 Flash API processes raw images of receipts. The model extracts items, quantities, prices, taxes, and service charges, returning structured JSON that instantly populates the user interface with interactive orbs.
- **Backend-Less State Sharing:** All session data resides in localStorage. To share the finalized split, the JSON state is compressed and encoded into a generated URL or QR code. This allows peers to access the exact, read-only node graph instantly on their own devices without database queries.
- **Gamified Summaries:** The completion of an expense split triggers dynamic titles based on spending behavior (e.g., "The Big Spender" or "The Freeloader"). The interface incorporates micro-interactions, fluid animations, and visual snaps to provide satisfying feedback during the drag-and-drop process.

**Technical Architecture**

- **Frontend Framework:** Next.js and React.
- **Interactive Visualization:** React Flow or D3.js for rendering the drag-and-drop physics, collision detection, and connecting SVG lines.
- **Data Processing:** Gemini 1.5 Flash (via REST or Google AI SDK) for multimodal OCR-to-JSON conversion.
- **State Management:** Client-side localStorage combined with URL parameter encoding via lz-string (or similar compression libraries) for efficient stateless sharing.

**Initialization Command Reference**

```bash
rtk npx create-next-app@latest urunan
cd urunan
rtk npm install reactflow framer-motion lz-string

```
