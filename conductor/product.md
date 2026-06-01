# Initial Concept
Urunan: Interactive Node-Based Expense Tracker

# Urunan: Interactive Node-Based Expense Tracker

## Product Vision
Urunan transforms the tedious chore of splitting group expenses into an engaging, visual, and frictionless experience. By replacing traditional spreadsheet-style lists with a gamified, physics-based node graph, the application provides a highly interactive interface. It relies on a completely serverless, local-storage-first architecture to ensure instant load times and zero backend maintenance, utilizing intelligent AI parsing for automated data entry. The primary application interface and language is Indonesian.

## Target Audience
Urunan is a versatile bill-splitting application designed to handle a wide variety of group expense scenarios, including:
- **Casual Group Outings:** Friends splitting restaurant bills, cafe outings, drinks, or tickets.
- **Travel and Trips:** Cohorts tracking accommodation, transportation, and activities over several days.
- **Roommates and Shared Living:** Housemates dividing recurring utility, grocery, and household expenses.

## Core Features (MVP)
- **Force-Directed Node Interface:** Users and receipt items are represented as floating nodes. Users can drag and drop receipt items ("orbs") onto user avatars, creating a visual tether and allocating the expense. Shared items are positioned between user nodes to distribute the cost automatically.
- **AI-Powered Receipt Parsing:** Utilizes Gemini 2.5 Flash Lite API to parse photos/images of receipts. It extracts items, quantities, and prices (including taxes/service charges) and converts them into structured JSON to populate the interactive node graph.
- **Stateless Session Sharing:** Session data is compressed (using `lz-string` or equivalent) and encoded into a generated URL or QR code. Recipients can open this URL to view the exact, read-only interactive node graph on their own devices without needing an account or database queries.
- **Local Session History:** Automatically stores current and past sessions in the browser's `localStorage`, allowing users to easily retrieve or continue editing previous sessions.
- **Gamified Summaries & Badges:** Settlement summaries feature fun spending badges based on split behaviors, such as "The Big Spender" (paid the most) or "The Freeloader" (paid the least).

## Settlement Workflow (MVP)
1. **Input:** The user manually inputs members and items, or uploads a receipt to let the AI parse and generate items.
2. **Allocation:** The user drags-and-drops item nodes to user avatar nodes.
3. **Sharing:** Once complete, a shareable link or QR code is generated.
4. **Payment:** Users settle payments among themselves offline based on the calculated summary.

## Future Enhancements
- **Deep-Linked Payments:** Integration with payment apps (Venmo, PayPal, UPI, GoPay, OVO, Dana) to launch directly with pre-filled amounts.
- **Live Sync & Collaboration:** Real-time multi-device editing using lightweight WebSocket or WebRTC signaling.
- **Interactive Checklists:** Track who has already paid within the session via checklist markers.
