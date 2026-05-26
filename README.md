<div align="center">

# DorckDashboard

**A local-first personal productivity workspace for macOS**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://www.sqlite.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm)](https://pnpm.io/)

[English](README.md) | [中文](README.zh-CN.md)

</div>

---

## Overview

DorckDashboard is a **local-first**, privacy-focused productivity workspace built with Electron and React. All data stays on your machine -- no cloud sync, no accounts, no tracking. It combines project management, content creation, media organization, RSS reading, and AI tool management into a single, beautifully designed desktop application.

Designed with the **"Vibrant Workspace"** design language -- a fusion of modern minimalism and soft geometry, featuring Material Design 3-inspired color tokens, purple-tinted ambient shadows, and pill-shaped interactive elements.

---

## Features

### Dashboard
- **Focus Project** -- pin your current main project with progress tracking
- **Priority Tasks** -- task list with high/medium/low priority badges, inline creation, and quick actions
- **Live Clock & Weather** -- real-time clock with configurable city weather (wttr.in API)
- **Activity Heatmap** -- 4-week activity grid with intensity visualization

### Writing Studio
- **Rich Text Editor** -- Tiptap/ProseMirror-powered WYSIWYG editor with full toolbar (bold, italic, headings, lists, code blocks, blockquotes, task lists)
- **Source Mode** -- toggle between WYSIWYG and raw HTML editing
- **Auto-save** -- 2-second debounced persistence
- **Multi-platform Publishing** -- export to Blog (HTML), Notion, Juejin (Markdown), WeChat (rich text), and Medium
- **Category Management** -- custom article categories

### Video Studio
- **Video Cover Grid** -- responsive card grid with thumbnails, duration overlays, and status filters
- **Audio Asset Library** -- manage audio files (WAV, MP3, M4A, FLAC, OGG)
- **Presentation Manager** -- import and organize HTML presentations

### Insights
- **RSS Feed Reader** -- subscribe to feeds, read articles with date/category/starred filtering, mark-as-read, and auto-fetch every 30 minutes
- **Feed Manager** -- add/edit/delete feeds with URL validation and auto-title detection; presets for Hacker News, TechCrunch, GitHub Blog, DEV.to
- **Social Analytics** -- track follower counts and engagement across Bilibili, YouTube, and Xiaohongshu

### AI Lab
- **Subscription Tracker** -- monitor AI service subscriptions (OpenAI, Anthropic, Google, Midjourney) with token usage
- **Tool Directory** -- quick access to 8 AI tools (Claude, ChatGPT, Gemini, Copilot, DALL-E 3, Midjourney, Perplexity, ElevenLabs)
- **Embedded Browser** -- persistent webview with address bar, navigation, and quick-access toolbar

### Global
- **Command Palette** (Cmd+K) -- full-text search across articles, tasks, notes, and drafts with keyboard navigation
- **Dark Mode** -- system-aware light/dark theme switching
- **Modular Architecture** -- enable/disable feature modules via `feature.config.ts`
- **Extension Points** -- 14 extension point types across 4 levels for deep customization

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Electron 33, Node.js |
| **Frontend** | React 18, TypeScript 5.7, React Router 6 |
| **Styling** | Tailwind CSS 3.4, Radix UI, Material Symbols Outlined |
| **State** | Zustand 5 |
| **Editor** | Tiptap 3 (ProseMirror), lowlight |
| **Database** | SQLite 3 (better-sqlite3, WAL mode) |
| **Build** | electron-vite 2, Vite 6, pnpm |
| **Package** | electron-builder |

---

## Architecture

```
DorckDashboard
├── src/main/              # Electron main process
│   ├── database/          # SQLite (22 tables, 6 migrations, 7 repositories)
│   ├── ipc/               # IPC handlers (60+ channels across 8 modules)
│   └── services/          # Weather, RSS fetcher, notifications, settings, file I/O
├── src/preload/           # Context bridge (typed electronAPI)
├── src/renderer/          # React SPA
│   ├── modules/           # 6 feature modules (dashboard, writing, video, insights, ai-lab, settings)
│   ├── components/        # Shared UI primitives (13 components)
│   ├── stores/            # Zustand stores (settings, UI)
│   ├── lib/               # Module registry, extension registry, module loader
│   └── hooks/             # IPC data/mutation hooks
└── src/shared/            # Types and constants shared across processes
```

**Data flow:** Renderer -> IPC (`invoke`) -> Main Process -> Repository -> SQLite -> Response

All IPC handlers return a typed `{ success, data?, error? }` envelope. The renderer uses `useIpcData` (read) and `useIpcMutation` (write) hooks for reactive data fetching.

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9

### Install

```bash
git clone https://github.com/Moosphan/DorckSpace.git
cd DorckSpace
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux
```

---

## Project Structure

```
├── src/
│   ├── main/                       # Electron main process
│   │   ├── database/               # SQLite layer (connection, migrations, repositories)
│   │   ├── ipc/                    # IPC handler modules
│   │   └── services/               # Background services
│   ├── preload/                    # Preload script (context bridge)
│   ├── renderer/                   # React frontend
│   │   ├── modules/                # Feature modules
│   │   ├── components/             # Shared UI components
│   │   ├── stores/                 # Zustand state stores
│   │   ├── lib/                    # Core libraries
│   │   └── hooks/                  # Custom React hooks
│   └── shared/                     # Shared types & constants
├── feature.config.ts               # Module enable/disable config
├── tailwind.config.ts              # Design system tokens
└── electron.vite.config.ts         # Build configuration
```

---

## Design System

The **Vibrant Workspace** design system uses:

- **Colors:** Material Design 3 palette with vibrant purple primary (`#6B38D4`), amber secondary (`#FEC300`), and a full surface hierarchy with dark mode support
- **Typography:** Alibaba PuHuiTi 3.0 + Plus Jakarta Sans, type scale from `headline-xl` (40px) to `label-sm` (12px)
- **Spacing:** Base-4 grid system (`xs: 4px` through `xl: 80px`)
- **Shapes:** Pill-shaped buttons/chips, 24px card radius, 8px base radius
- **Shadows:** Purple-tinted ambient shadows for depth
- **Icons:** Google Material Symbols Outlined exclusively

---

## Database

SQLite database with 22 tables across 6 domains:

| Domain | Tables |
|---|---|
| **Core** | `user_profile`, `settings` |
| **Dashboard** | `projects`, `tasks`, `calendar_events`, `activity_log` |
| **Writing** | `articles`, `article_publish_records`, `notes`, `drafts` |
| **Video** | `video_assets` |
| **Insights** | `rss_feeds`, `rss_articles`, `social_accounts`, `social_metrics` |
| **AI Lab** | `ai_subscriptions`, `ai_tools` |

All data is stored locally at `<userData>/database/dashboard.db` with WAL journal mode and foreign key constraints enabled.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the Apache License 2.0 -- see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with care by [Moosphan](https://github.com/Moosphan)**

</div>
