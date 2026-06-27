# Friday

A journaling app for macOS. Nothing syncs anywhere. No accounts, no backend — everything stays on your machine.

## Why I built this

Notion felt like too much. Apple Notes felt like too little. I kept switching between things and nothing was quite right. I just wanted something that opened fast, greeted me by name, and let me write without thinking about where it lives or who could see it.

I used Claude to build it. Product and UX decisions were mine, Claude handled the code. Took a few days.

## What it does

- Local journal entries, stored in IndexedDB (nothing leaves your machine)
- Auto-tags entries by mood: ideas, tasks, memories, reflections
- Sidebar shows entries by date or grouped by type
- Time-aware greeting that asks your name the first time you open it
- Dark mode, autocorrect, keyboard shortcuts

## Runs on

macOS, Apple Silicon only (M1/M2/M3). Haven't tested it on Intel or other platforms.

## Run it locally

```bash
npm install
npm run dev
```

## Build the app

```bash
npm run package
```

Outputs `Friday.app` to `release/mac-arm64/`.

## The code

- `src/db.ts` — entry storage
- `src/tagger.ts` — mood and tag logic
- `src/components/NoteEditor.tsx` — the writing interface
- `src/components/Sidebar.tsx` — sidebar with date/type toggle
- `electron/main.js` — Electron config

Built with Claude Code. MIT.
