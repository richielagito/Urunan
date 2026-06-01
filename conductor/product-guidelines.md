# Urunan: Product Guidelines

This document outlines the product design guidelines, user experience principles, language tone, and formatting rules for Urunan.

## 1. Tone and Language (Gaya Bahasa)
Urunan utilizes a **Semi-formal (Santai tapi sopan)** tone in Indonesian. This ensures the app is highly approachable for groups of friends while remaining clear, polite, and professional.
- **Conventions:**
  - Avoid overly rigid/academic Indonesian words where modern, lightweight equivalents fit better (e.g., use "Bagikan" instead of "Distribusikan", "Bayar" instead of "Lunasi").
  - Do not use overly slangy or localized dialect (e.g., avoid "lu", "gue", "cuy") to maintain usability across various Indonesian demographics.
  - Buttons and interactive prompts should be concise and action-oriented (e.g., "Mulai Scan", "Selesai", "Salin Tautan").

## 2. Visual Design & Branding (Estetika Visual)
The visual identity follows a **Minimalist Premium** aesthetic. It prioritizes clean space, high-quality typography, and subtle indicators over loud colors.
- **Color Palette:**
  - **Base Background:** Clean light background (slate-50 or cool-gray-50) and a sophisticated dark mode (neutral-950).
  - **Monochrome Base:** Use shades of slate, zinc, or neutral grays for borders, grid lines, and structures.
  - **Accent Colors:** Use subtle, premium gradients (e.g., indigo to violet or emerald to teal) to highlight interactive elements, avatar highlights, and successfully split item nodes.
- **Typography:**
  - Clean sans-serif fonts (such as Inter, Outfit, or system defaults) for modern and legible text.
- **Components:**
  - Soft drop-shadows and subtle borders to give nodes a floating card appearance.

## 3. Interaction & Physics (UX dan Animasi)
To make bill-splitting feel satisfying and gamified, Urunan incorporates **Springy & Bouncy** physics.
- **Node Graph Physics:**
  - Interactive items ("orbs") use elastic force-directed physics. Dragging an item creates a visible tether line to the avatar nodes.
  - When dropped onto an avatar node, the item should show a noticeable bounce/recoil animation before settling.
  - Dragging nodes away should show elastic stretching of connecting lines.
- **Micro-interactions:**
  - Light haptic feedback or subtle scale animation when an orb is hovered or clicked.
  - Soft confetti or particle burst when all items are fully allocated.

## 4. Localization and Data Formatting (Format Angka dan Mata Uang)
All monetary figures must follow **Strict Indonesian Rupiah (Rp)** formatting rules.
- **Format Rules:**
  - Currency symbol is prefix `Rp` without space (e.g., `Rp150.000`).
  - Use dots (`.`) as thousands separators.
  - Do not display decimal values or fractional cents (e.g., avoid `,00` unless explicitly requested, as cents are not standard in modern IDR splits).
  - Example: `Rp1.250.000` instead of `Rp 1,250,000` or `Rp1250000`.
