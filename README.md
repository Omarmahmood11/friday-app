# Friday

A simple journaling app for macOS. Everything stays local — no accounts, no cloud, no sync.

## What it does

- Write and save journal entries
- Entries are auto-tagged by mood (ideas, tasks, memories, reflections) and topic
- Browse by date or by type in the sidebar
- Greeting changes based on time of day, asks your name on first launch
- Dark mode, autocorrect, keyboard shortcuts

## Built with

React 18, TypeScript, Vite, Tailwind CSS, Electron. Data stored in IndexedDB.

I'm not a developer — I built this using Claude as my coding partner. The product decisions were mine, Claude handled the implementation.

## Runs on

macOS, Apple Silicon (M1/M2/M3) only.

## Run locally

```bash
npm install
npm run dev
```

## Build the app

```bash
npm run package
```

Outputs `Friday.app` to `release/mac-arm64/`.

## License

MIT
