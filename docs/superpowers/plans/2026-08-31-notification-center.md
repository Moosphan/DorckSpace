# Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local, deduplicated unread notification center to the MyDashboard top bar.

**Architecture:** Persist one message per stable business key in SQLite before sending a system notification. Push successful inserts to the renderer through preload events; the renderer loads unread state once and applies incremental events.

**Tech Stack:** Electron 33 IPC and Notification API, SQLite via better-sqlite3, React 18, TypeScript, Tailwind CSS.

## Global Constraints

- Keep notification routes constrained by `normalizeNotificationRoute`.
- Do not expose raw `ipcRenderer` to the renderer.
- Do not poll for unread state after initial load.
- Desktop notifications are emitted only after a new persistent message is created.

### Task 1: Persist unread messages

**Files:**
- Create: `src/main/database/repositories/notification-center-repository.ts`
- Modify: `src/main/database/migrations/index.ts`
- Test: `scripts/test-notification-center.ts`

- [x] Write failing tests for first insert, duplicate key rejection, and one-message read state.
- [x] Run `pnpm test:notification-center` and confirm the repository import fails before implementation.
- [x] Add migration `031_notification_center_messages` with a unique business key and unread index.
- [x] Add repository methods `create`, `listUnread`, `getUnreadCount`, `markRead`, and `markAllRead`.
- [x] Run `pnpm test:notification-center` and confirm all repository tests pass.

### Task 2: Deliver one notification per persisted message

**Files:**
- Modify: `src/main/services/notification-service.ts`
- Modify: `src/preload/index.ts`
- Test: `scripts/test-notification-center.ts`

- [x] Resolve and validate the destination route before persistence.
- [x] Make `sendDedupedNotification` insert into the repository before broadcasting or calling `Notification.show()`.
- [x] Broadcast `notification:center:new`, `notification:center:read`, and `notification:center:allRead` through the preload whitelist.
- [x] Mark persistent message state before dispatching `notification:navigate` from a desktop notification click.

### Task 3: Render unread state in the top bar

**Files:**
- Create: `src/renderer/components/NotificationCenter.tsx`
- Modify: `src/renderer/layouts/MainLayout.tsx`

- [x] Fetch unread messages once on layout mount.
- [x] Update state from push events, not a timer.
- [x] Render red dot only when the unread list is non-empty.
- [x] Support per-message read-and-navigate and explicit mark-all-read actions.

### Task 4: Document and verify

**Files:**
- Create: `docs/notification-center.zh-CN.md`
- Create: `docs/backlogs/notification-center.zh-CN.md`

- [x] Document the data model, IPC contract, UI behavior, security boundary, and dedupe order.
- [x] Record P1 and P2 follow-up work.
- [ ] Run `pnpm test:notification-center && pnpm test:notification-navigation && pnpm typecheck && pnpm build && git diff --check`.
