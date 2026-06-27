# Friday

A minimal journaling app for macOS. Built to stay out of your way — no accounts, no sync, no cloud. Everything lives locally on your machine.

## What it does

- Write daily entries with a clean, distraction-free editor
- Auto-tags entries by mood (`idea`, `memory`, `task`, `reflection`) and topic (`work`, `health`, `creative`, etc.)
- Browse by date or by type, with colored mood dots in the sidebar
- Dark mode, keyboard shortcuts, autocorrect
- Packages as a native macOS desktop app via Electron

## Stack

- React 18 + TypeScript
- Vite 4
- Tailwind CSS 3
- Electron 28
- IndexedDB (all data stays local)

## Run locally

```bash
npm install
npm run dev
```

## Build the macOS app

```bash
npm run package
```

This outputs a `.app` to `release/mac-arm64/`. Requires macOS arm64 (Apple Silicon).

## Use this as a starting point

If you want to build your own journaling or note-taking app on top of this:

- **`src/db.ts`** — IndexedDB setup, entry schema, all read/write operations
- **`src/tagger.ts`** — mood and tag analysis logic, easy to extend with your own categories
- **`src/components/NoteEditor.tsx`** — the main writing interface
- **`src/components/Sidebar.tsx`** — entry list with date/type toggle
- **`electron/main.js`** — Electron main process, minimal config

The app has no backend, no auth, and no external dependencies at runtime — just clone, install, and run.

## Built with AI

This project was designed and built using Claude Code as an AI development partner. The product decisions, UX direction, and feature choices are mine — Claude handled the implementation.

## License

MIT
