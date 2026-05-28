<p align="center">
  <img src="./assets/app-logo.svg" alt="DorckDashboard" width="128" />
</p>

# DorckDashboard

**A local-first desktop productivity workspace**

![Apache 2.0](./assets/badges/license.svg)
![Electron 33](./assets/badges/electron.svg)
![React 18](./assets/badges/react.svg)
![TypeScript 5.7](./assets/badges/typescript.svg)
![pnpm 9](./assets/badges/pnpm.svg)
![Developing](./assets/badges/status.svg)

[English](README.md) | [中文](README.zh-CN.md)

---

## Overview

DorckDashboard is an Electron desktop app that brings projects, writing, media
assets, RSS reading, social insights, and AI tooling into one local-first
workspace. The app stores data on your machine with SQLite and file-based
storage, so you can work without cloud accounts or external sync as a baseline.

It is currently evolving from the author's own day-to-day workspace, which
means the product direction is shaped by real personal workflows first.

## Why This Project Exists

Many personal workflows are split across separate apps for task tracking,
writing, reference collection, media management, feed reading, and AI tools.
DorckDashboard aims to make those workflows feel like one coherent desktop
workspace instead of a loose collection of tabs and services.

## Key Capabilities

### Dashboard

- Focus projects, priority tasks, and activity tracking in one home view
- Live clock and weather widgets
- Quick search via a global command palette (`Cmd+K`)

### Writing Studio

- Rich-text editing powered by Tiptap
- Source mode for raw HTML editing
- Auto-save and local draft storage
- Multi-target publishing helpers for blog, Notion, Juejin, WeChat, and Medium

### Video Studio

- Video cover management
- Audio asset library
- HTML presentation asset management

### Insights

- RSS subscriptions and article reading
- Feed presets and periodic background refresh
- Social metrics tracking for selected platforms

### AI Lab

- AI subscription tracking
- AI tool directory and quick access
- Embedded browser-based tool workflow

## Current Architecture

DorckDashboard currently ships as a modular Electron app with six built-in
feature modules:

- `dashboard`
- `writing`
- `video`
- `insights`
- `ai-lab`
- `settings`

Feature enablement is controlled through
[feature.config.ts](./feature.config.ts).

At runtime, the app follows a standard Electron split:

- **Main process** for database access, background services, IPC handlers, and
  native integrations
- **Preload layer** for the typed `electronAPI` bridge
- **Renderer** for the React-based workspace UI

The codebase also includes design and architecture notes for a broader plugin
system in [docs/plugin-architecture.md](./docs/plugin-architecture.md). That
document is best read as a forward-looking design reference rather than a
complete statement of already-shipped runtime plugin behavior.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 33, Node.js |
| Frontend | React 18, TypeScript 5.7, React Router 6 |
| Styling | Tailwind CSS 3.4, Radix UI |
| State | Zustand 5 |
| Editor | Tiptap 3, lowlight |
| Data | SQLite via `better-sqlite3` |
| Build | electron-vite, Vite 6, pnpm |
| Packaging | electron-builder |

## Local Data Model

The app stores data locally under Electron's `userData` directory.

- SQLite database: `<userData>/database/dashboard.db`
- File storage directories initialized by the app:
  - `articles`
  - `notes`
  - `drafts`
  - `media/covers`
  - `media/audio`
  - `media/presentations`
  - `exports`
  - `cache`
  - `config`

SQLite is initialized with WAL mode and foreign-key support enabled.

## Getting Started

### Prerequisites

- Node.js `>= 18`
- pnpm `>= 9`

### Install

```bash
git clone https://github.com/Moosphan/DorckSpace.git
cd DorckSpace
pnpm install
```

### Run In Development

```bash
pnpm dev
```

### Build

Create production bundles:

```bash
pnpm build
```

Create packaged desktop artifacts with Electron Builder:

```bash
pnpm dist
```

Create macOS distribution artifacts:

```bash
pnpm dist:mac
```

The current `electron-builder.yml` is configured for macOS `arm64` targets
(`dmg` and `zip`). The existing README's previous `build:win` and `build:linux`
commands were removed because those scripts do not exist in `package.json`.

Because the app is built with Electron, the codebase itself is not inherently
macOS-only. However, the current packaging configuration in this repository is
focused on macOS targets.

## Project Structure

```text
src/
├── main/        # Electron main process, database, IPC, background services
├── preload/     # Typed context bridge
├── renderer/    # React application shell, modules, shared UI
└── shared/      # Cross-process constants and types
```

Supporting project files:

- [feature.config.ts](./feature.config.ts) for module toggles
- [electron.vite.config.ts](./electron.vite.config.ts) for app build config
- [electron-builder.yml](./electron-builder.yml) for packaging config
- [docs/](./docs/) for design and architecture notes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm lint` and `pnpm typecheck`
5. Open a pull request

## License

Apache License 2.0. See [LICENSE](./LICENSE).
