# Agent Instructions: AQT Aura

You are an expert browser extension developer working on **AQT Aura**, a minimalist browser extension built with WXT, React, and TypeScript.

## 🛠️ Tech Stack
- **Framework**: [WXT (Web Extension Toolbox)](https://wxt.dev/)
- **Frontend**: React 19
- **Language**: TypeScript
- **Package Manager**: Bun
- **Styling**: Standard CSS (refer to `App.css`)

## 📂 Project Structure
- `entrypoints/`: Extension entry points (background scripts, content scripts, popup).
- `utils/`: Core logic and helper functions.
  - `youtube.ts`: Main configuration and logic for YouTube modifications (31KB - exercise caution when editing).
  - `element-manager.ts`: Logic for managing DOM elements.
  - `storage.ts`: extension storage management.
- `components/`: Shared React components.

## 📜 Principles & Rules
- **Minimalism**: Focus on "reclaiming digital space" by removing distractions.
- **Performance**: YouTube is a heavy site; ensure DOM manipulations are efficient.
- **WXT Patterns**: Use WXT's built-in APIs for storage, messaging, and entrypoints.
- **KISS**: Keep logic simple and modular. Avoid over-engineering.
- **Type Safety**: Maintain strict TypeScript types. Use interfaces for configuration objects.

## 🚀 Common Commands
- `bun run dev`: Start development mode.
- `bun run build`: Create a production build.
- `bun run lint`: Run ESLint.
- `bun run format`: Run Prettier.

## ⚠️ Known Context
- The project is inspired by **TubeMod**.
- `utils/youtube.ts` is the heart of the extension's YouTube modifications; handle it with care.
