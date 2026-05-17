# what-do — Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Backend](#backend)
   - [Data Models](#data-models)
   - [API Endpoints](#api-endpoints)
   - [Authentication & Security](#authentication--security)
   - [XP & Leveling System](#xp--leveling-system)
   - [Audit Logging](#audit-logging)
5. [Frontend](#frontend)
   - [App Structure](#app-structure)
   - [State Management](#state-management)
   - [Routing & Guards](#routing--guards)
   - [Components](#components)
   - [Hooks](#hooks)
   - [API Services](#api-services)
6. [Feature Reference](#feature-reference)
   - [Tasks](#tasks)
   - [Subtasks](#subtasks)
   - [Categories](#categories)
   - [Sticky Notes](#sticky-notes)
   - [Pomodoro Timer](#pomodoro-timer)
   - [Calendar View](#calendar-view)
   - [Heatmap](#heatmap)
   - [Notifications & Alarms](#notifications--alarms)
   - [Themes](#themes)
   - [Guest Mode](#guest-mode)
   - [Admin Dashboard](#admin-dashboard)
7. [Database Migrations History](#database-migrations-history)
8. [Testing](#testing)
9. [Deployment & Configuration](#deployment--configuration)

---

## Project Overview

**what-do** is a gamified productivity and task management web application. Users earn XP, level up, and maintain streaks by completing tasks. The app features categories, sticky notes, a Pomodoro timer, a calendar view, a GitHub-style activity heatmap, deadline notifications, and a full admin dashboard.

Key design goals:
- Tight feedback loop: every completed task immediately awards XP and may trigger a level-up toast
- Progressive unlocking: higher levels unlock more tasks, categories, and sticky notes
- Offline-tolerant: optimistic UI updates with automatic rollback on failure
- Secure by default: JWT with rotation/blacklisting, account lockout, full audit trail

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Django 6.0 + Django REST Framework |
| Authentication | `djangorestframework-simplejwt` (rotating refresh tokens, blacklist) |
| Database | PostgreSQL in production (SQLite for local dev via `dj-database-url`) |
| Email | Resend API |
| Static files | WhiteNoise + Vite-built frontend |
| Frontend framework | React 18 + TypeScript (Vite) |
| Server state | TanStack Query (React Query) v5 |
| Client state | Zustand |
| HTTP client | Axios with request/response interceptors |
| CSS | CSS Modules |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Date utilities | `date-fns`, `react-datepicker` |
| HTML sanitisation | `bleach` (backend), `DOMPurify` (frontend) |
| Testing (backend) | Django `TestCase` + DRF `APITestCase` |
| Testing (frontend) | Vitest + React Testing Library |
| Deployment | Railway / Render (ASGI via Gunicorn/Whitenoise) |

---

## Architecture

```
what-do/
├── config/               # Django project config (settings, urls, wsgi, asgi)
├── apps/
│   ├── accounts/         # User profiles, XP/level, auth views, admin views, audit log
│   └── todo/             # Tasks, subtasks, categories, sticky notes
└── frontend/
    └── src/
        ├── api/          # Axios client + typed service functions
        ├── components/
        │   ├── layout/   # Greeting, filterbar, calendar, session guard, modals
        │   ├── tasks/    # TaskCard, TaskList, AddTask, Subtask
        │   ├── categories/
        │   └── widgets/  # Clock, Stats, StickyNote, Pomodoro, Heatmap
        ├── context/      # ThemeContext, ToastContext
        ├── hooks/        # useTasksQuery, useDataLoader, useAlarm, useSessionTimer, …
        ├── pages/        # home, login, register, admin, resetrequest, resetconfirm
        ├── store/        # useAppStore (Zustand)
        ├── types/        # Shared TypeScript interfaces
        └── utils/        # filterTasks, getErrorMessage
```

The frontend is served as a SPA from Django's template directory (`frontend_dist/`). All non-static, non-admin URLs are caught by a `re_path` wildcard that returns `index.html`, letting React Router handle navigation.

---

## Backend

### Data Models

#### `UserProfile` (`apps/accounts/models.py`)

Extends Django's built-in `User` with a OneToOne profile.

| Field | Type | Notes |
|---|---|---|
| `theme_mode` | CharField | `'light'`, `'dark'`, or `'custom'` |
| `theme_custom_colors` | JSONField | CSS variable overrides |
| `xp` | IntegerField | Total XP earned |
| `level` | IntegerField | Computed from `xp` via `calc_level()` |
| `streak` | IntegerField | Consecutive days with at least one completion |
| `last_completed_date` | DateField | Used for streak calculation |
| `pomodoros_today` | IntegerField | Resets each day |
| `last_pomodoro_date` | DateField | Tracks the pomodoro reset day |
| `failed_login_attempts` | IntegerField | Incremented on each failed login |
| `lockout_until` | DateTimeField | Set after `MAX_ATTEMPTS` (10) failures; 30-min lockout |
| `is_guest` | BooleanField | Temporary guest accounts, deleted on logout |

**Level configuration** (`LEVEL_CONFIG`):

| Level | XP Required | Max Tasks | Max Categories | Max Notes |
|---|---|---|---|---|
| 1 | 0 | 10 | 2 | 0 |
| 2 | 50 | 20 | 3 | 2 |
| 3 | 150 | 30 | 5 | 5 |
| 4 | 350 | unlimited | unlimited | unlimited |
| 5 | 700 | unlimited | unlimited | unlimited |

Guest limits are fixed at 10 tasks, 2 categories, 1 note regardless of XP.

#### `Todo` (`apps/todo/models.py`)

| Field | Type | Notes |
|---|---|---|
| `title` | CharField(255) | |
| `completed` | BooleanField | |
| `description` | TextField | nullable |
| `deadline` | DateTimeField | nullable |
| `category` | FK → Category | SET_NULL on delete |
| `priority` | CharField | `low / medium / high / critical` |
| `pinned` | BooleanField | Pinned tasks sort first |
| `position` | PositiveIntegerField | Used for manual drag-and-drop ordering |
| `completed_at` | DateTimeField | Set when task is marked complete |
| `is_onboarding` | BooleanField | Onboarding demo data; excluded from limits |
| `recurrence` | CharField | `daily / weekly / monthly / yearly` — spawns next instance on completion |

#### `Subtask` (`apps/todo/models.py`)

| Field | Type | Notes |
|---|---|---|
| `task` | FK → Todo | CASCADE |
| `title` | CharField(255) | |
| `completed` | BooleanField | |
| `completed_at` | DateTimeField | nullable |

Max 10 subtasks per task. When all subtasks are complete, the parent task auto-completes and awards XP. Deleting or unchecking a subtask can trigger XP deduction.

#### `Category`

| Field | Type |
|---|---|
| `name` | CharField(255) |
| `icon` | CharField(10) |
| `is_onboarding` | BooleanField |
| `owner` | FK → User |

#### `StickyNotes`

| Field | Type |
|---|---|
| `note` | TextField (HTML, sanitised by bleach) |
| `color` | CharField(20) — hex colour |
| `is_onboarding` | BooleanField |
| `owner` | FK → User |

#### `AuditLog`

Immutable append-only log of all significant actions. Fields: `actor`, `target_user`, `action` (choice field), `detail`, `ip`, `created_at`.

---

### API Endpoints

All endpoints require JWT authentication unless marked `[public]`.

#### Auth (`/api/auth/`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register/` [public] | Create account; triggers onboarding data |
| POST | `/api/auth/login/` [public] | Returns `access` + `refresh` JWT tokens; enforces lockout |
| POST | `/api/auth/refresh/` [public] | Rotates refresh token |
| POST | `/api/auth/logout/` | Blacklists current refresh token |
| POST | `/api/auth/password-reset/` [public] | Sends reset email via Resend |
| POST | `/api/auth/password-reset/confirm/` [public] | Validates UID+token, sets new password, blacklists all tokens |
| POST | `/api/auth/guest/` [public] | Creates temporary guest user |
| POST | `/api/auth/guest/logout/` | Deletes guest user + all data |
| POST | `/api/auth/pomodoro/complete/` | Awards 5 XP for a completed 25-min session |
| POST | `/api/auth/update-email/` | Updates user email |

#### User (`/api/`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/me/` | Profile data: XP, level, streak, limits, counts |
| GET | `/api/user/theme/` | Current theme settings |
| POST | `/api/user/theme/` | Save theme settings |
| POST | `/api/account/delete/` | Permanently deletes account (requires password) |
| GET | `/api/health/` [public] | Health check |

#### Tasks (`/api/tasks/`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks/` | List all tasks (paginated, 50/page); supports `completed`, `category`, `has_deadline`, `sort` query params |
| POST | `/api/tasks/` | Create task; enforces level limits; returns 409 on duplicate title |
| GET | `/api/tasks/<id>/` | Get single task |
| PATCH | `/api/tasks/<id>/` | Update fields; toggling `completed` awards/deducts XP; completing triggers recurrence spawn |
| DELETE | `/api/tasks/<id>/` | Delete task |
| POST | `/api/tasks/reorder/` | Bulk-update `position` for drag-and-drop ordering |
| GET | `/api/tasks/heatmap/` | Completed task counts per day for last 365 days |

#### Subtasks

| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks/<id>/subtasks/` | List subtasks |
| POST | `/api/tasks/<id>/subtasks/` | Create subtask (max 10) |
| PATCH | `/api/tasks/<id>/subtasks/<sid>/` | Toggle/rename; syncs parent task completion |
| DELETE | `/api/tasks/<id>/subtasks/<sid>/` | Delete; syncs parent task completion |

#### Categories

| Method | Path | Description |
|---|---|---|
| GET | `/api/categories/` | List user's categories |
| POST | `/api/categories/` | Create; enforces level limits |
| PATCH | `/api/categories/<id>/` | Update name/icon |
| DELETE | `/api/categories/<id>/` | Delete |

#### Sticky Notes

| Method | Path | Description |
|---|---|---|
| GET | `/api/sticky-notes/` | List notes |
| POST | `/api/sticky-notes/` | Create; HTML sanitised with bleach; enforces level limits |
| PATCH | `/api/sticky-notes/<id>/` | Update content/colour |
| DELETE | `/api/sticky-notes/<id>/` | Delete |

#### Admin (staff only)

All admin endpoints return `403` for non-staff. Access is logged to `AuditLog`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/stats/` | Dashboard stats: users, tasks, leaderboards, signup chart |
| GET | `/api/admin/users/` | Paginated user list |
| POST | `/api/admin/unlock/<id>/` | Clear lockout |
| DELETE | `/api/admin/users/<id>/delete/` | Delete non-staff user |
| PATCH | `/api/admin/users/<id>/edit/` | Edit XP, streak, email |
| POST | `/api/admin/users/<id>/reset-xp/` | Reset XP/level/streak to defaults |
| POST | `/api/admin/users/<id>/force-logout/` | Blacklist all tokens for a user |
| POST | `/api/admin/users/<id>/toggle-staff/` | Grant/revoke staff status |
| GET | `/api/admin/users/<id>/detail/` | Full task/category/note data (note content hidden by default) |
| POST | `/api/admin/users/<id>/award-xp/` | Award or deduct XP (±10000 range) |
| POST | `/api/admin/users/<id>/clear-onboarding/` | Wipe onboarding demo data |
| DELETE | `/api/admin/notes/<id>/delete/` | Delete any sticky note |
| GET | `/api/admin/notes/<id>/view/` | Read note content (logged to audit) |
| POST | `/api/admin/bulk-action/` | Bulk `unlock / reset_xp / delete` |
| GET | `/api/admin/export/users.csv` | CSV export of all users |
| GET | `/api/admin/audit-log/` | Filterable audit log (last 200 entries) |

---

### Authentication & Security

**JWT flow:**
- Access tokens expire after 15 minutes (5 minutes for staff).
- Refresh tokens expire after 7 days, rotate on every use, and are blacklisted after rotation.
- The Axios client proactively refreshes when the access token is within 60 seconds of expiry, queuing concurrent requests while refresh is in progress.
- On logout or account deletion, all outstanding tokens are blacklisted.

**Account lockout:**
- 10 consecutive failed login attempts trigger a 30-minute lockout.
- Failed attempt count resets on successful login.
- Lockout is stored in `UserProfile.lockout_until`.

**Rate limiting (DRF throttles):**
- Anonymous: 20/hour
- Authenticated: 1000/hour
- Login/refresh: 10/hour
- Registration: 5/hour

**HTML sanitisation:**
- Sticky note content is sanitised on the backend with `bleach` before storage. Allowed tags: `p, br, strong, em, img, ul, ol, li`. Allowed img attributes: `src, alt, style`.
- Frontend uses `DOMPurify` before rendering note content.

**HTTPS/security headers** (production only):
- `SECURE_SSL_REDIRECT`, `HSTS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `X-Content-Type-Options`, `X-XSS-Protection`.

**Session guard:**
- Frontend `useSessionTimer` warns after 55 minutes of inactivity and expires after 60 minutes, showing a modal that lets the user extend their session.

---

### XP & Leveling System

XP is awarded by `UserProfile.award_xp(task)`:

| Event | XP |
|---|---|
| Task completed (base) | +10 |
| Priority: `high` | +5 bonus |
| Priority: `critical` | +10 bonus |
| Completed before deadline | +5 bonus |
| Streak day 1 | +5 bonus |
| Streak day 2 | +10 bonus |
| Streak day 3+ (capped) | +15 bonus |
| Task uncompleted | −5 |
| Pomodoro session completed | +5 |

**Streak logic:** increments if the last completion was yesterday, resets to 1 if there was a gap, stays the same if two completions occur on the same day.

**Level-up:** computed by `calc_level(xp)` which scans `LEVEL_CONFIG` in descending order. When `award_xp` detects a level change, it returns `leveled_up: True` in the response, which the frontend uses to show the `LevelUpToast`.

---

### Audit Logging

Every significant action writes an `AuditLog` row via the `log(request, action, ...)` helper. The action field is a choice from a fixed set including `login_ok`, `login_fail`, `register`, `task_create`, `task_complete`, `task_delete`, `note_create`, `note_delete`, `cat_create`, `cat_delete`, `level_up`, `delete_account`, and all `admin_*` variants.

The IP address is extracted from `HTTP_X_FORWARDED_FOR` (first entry) or `REMOTE_ADDR`. Staff reading note content (`admin_view_note`) is always logged with the staff member's username in the `detail` field.

---

## Frontend

### App Structure

`App.tsx` is the root. It sets up:
- `QueryClientProvider` (TanStack Query)
- `ThemeProvider`
- `ToastProvider`
- `OfflineBanner`
- `ErrorHandlerRegistrar` — registers a global Axios error handler that pipes non-401 errors to the toast system
- Route tree with `PrivateRoute` and `AdminRoute` guards

`PrivateRoute` checks for a valid, non-expired JWT in `localStorage`. If valid, it renders `AppLoader` which calls `useDataLoader()` to kick off all data fetches.

### State Management

**Zustand store (`useAppStore`)** holds:
- User profile data: `username`, `xp`, `level`, `streak`, `nextLevelXp`, `limits`, `counts`, `pomodoros_today`, `isStaff`, `email`, `isGuest`
- `levelUpEvent` — set by `updateXp` when a level-up occurs; consumed and cleared by `LevelUpToast`
- `filter` — the current task filter/sort state; non-search/non-deadlineDay fields are persisted to `localStorage`
- `greeting` — custom display name, persisted to `localStorage`

**TanStack Query** handles all server state:
- Query keys: `['tasks']`, `['categories']`, `['notes']`, `['profile']`
- Stale time: 5 minutes; no refetch on window focus; refetch on reconnect
- Optimistic updates with rollback are used for toggle, delete, reorder, note mutations

### Routing & Guards

| Path | Component | Guard |
|---|---|---|
| `/` | `Dashboard` (home) | `PrivateRoute` |
| `/admin` | `AdminDashboard` | `AdminRoute` (staff only) |
| `/login` | `Login` | — |
| `/register` | `Register` | — |
| `/reset-password` | `ResetRequest` | — |
| `/reset-password/:uid/:token` | `ResetConfirm` | — |
| `*` | Redirect to `/` | — |

`AdminRoute` also checks `useAppStore.getState().isStaff` to prevent the UI from rendering for non-staff, though all admin API calls are independently enforced server-side.

### Components

#### Layout

**`Greeting`** — time-aware greeting (Good morning/afternoon/evening/night), editable display name, today's task progress bar. Filters tasks by `deadline` falling today or `completed_at` today.

**`FilterBar`** — search input (expands on focus), "today" shortcut button, sort dropdown, filters dropdown (status/priority/category/deadline range). Active filter count badge.

**`SessionGuard`** — wraps the app; shows a "Still there?" modal when the session timer fires. Uses `useFocusTrap` for accessibility.

**`LevelUpToast`** — fixed bottom-centre toast with animated stars; auto-dismisses after 4 seconds.

**`AlarmModal`** — queues deadline alarm events; shows one at a time with dismiss button.

**`OfflineBanner`** — fixed top banner shown when `navigator.onLine` is false.

**`GuestBanner`** — fixed top banner for guest sessions with a "Sign up / Log in" exit button.

**`CalendarView`** — full month grid with task pills per day, clickable day panel showing tasks with inline add/toggle/delete.

**`ShortcutsModal`** — keyboard shortcut reference modal.

**`DeleteAccountModal`** — password-confirmation modal using a portal.

#### Tasks

**`TaskList`** — wraps `DndContext` + `SortableContext` for drag-and-drop reordering, pagination (5 per page with ellipsis), bulk action bar (select, complete all, delete all), CSV export.

**`TaskCard`** — collapsed/expanded/edit states. Collapsed shows title (coloured by priority), countdown timer, subtask badge, progress bar, recurrence badge. Expanded shows detail chips, description, and the `Subtask` component. Edit form with inline date/time pickers.

**`AddTask`** — slide-in form with title, description, priority, category, due date + optional time, recurrence, and pending subtasks list. Draft saved to `localStorage` via `useDraft`.

**`Subtask`** — renders subtask rows with toggle/delete inside an expanded `TaskCard`. Inline add row. Max 10 per task.

#### Widgets

**`ClockWidget`** — live HH:MM:SS clock with AM/PM badge.

**`StatsWidget`** — circular progress ring (completion %), stat rows (total/done/active/overdue), priority breakdown bars.

**`StickyNotes`** — contenteditable notes with paste-image support, colour selector, expand/collapse, inline edit, draft restore, confirm-delete overlay.

**`Pomodoro`** — 25/5/15 minute timer with SVG ring progress, work/break cycle, XP toast on session complete, linked task selector.

**`Heatmap`** — 52-week GitHub-style contribution grid. Fetches `/api/tasks/heatmap/`, builds a week-by-week grid with month labels, tooltip on hover.

#### Categories

**`CategoryPanel`** — list of categories with task counts, active filter highlight, inline edit (contenteditable + icon picker), confirm-delete overlay, level-locked add button.

---

### Hooks

| Hook | Purpose |
|---|---|
| `useTasksQuery` | Fetches paginated tasks; unwraps `results` array |
| `useCategoriesQuery` | Fetches categories |
| `useNotesQuery` | Fetches sticky notes |
| `useProfileQuery` | Fetches `/api/me/` and writes result to `useAppStore` |
| `useDataLoader` | Composes all four query hooks + `useAlarms`; exposes `reload()` |
| `useAlarms` | Schedules browser `Notification` + `fireAlarmEvent` calls for tasks with deadlines; cancels stale timers |
| `useSessionTimer` | Fires `onWarn` at 55 min inactivity, `onExpire` at 60 min; resets on user activity events |
| `useFocusTrap` | Traps keyboard focus inside a modal; restores previous focus on close |
| `useOnlineStatus` | Subscribes to `online`/`offline` window events |
| `useDraft` | `localStorage`-backed save/load/clear for form drafts |
| `useKeyboardShortcuts` | Global `keydown` listener for `n`, `p`, `v`, `m`, `1`, `2`, `3`, `Escape`, `?` |

---

### API Services

`frontend/src/api/client.ts` creates an Axios instance with:
- Base URL from `VITE_API_URL`
- Request interceptor: proactive token refresh if expiry is within 60 seconds; queues concurrent requests during refresh; redirects to `/login` on refresh failure
- Response interceptor: 401 fallback refresh; pipes non-401 errors to the global error handler (unless `_silent: true` is set on the request config)

`frontend/src/api/services.ts` exports typed functions for every API endpoint. Requests that should not trigger the global error toast pass `{ _silent: true }` in the Axios config (e.g. `createTask`, `createCategory`).

---

## Feature Reference

### Tasks

- Title required, max 255 chars; duplicate titles for the same user return HTTP 409.
- Priority: `low / medium / high / critical` — affects XP bonus and card colour.
- Deadline: optional datetime. If hour is 23:59 the UI treats it as a date-only deadline (no countdown timer, day-based display). Any other time shows a live countdown.
- Pinned tasks always sort above non-pinned active tasks.
- Recurrence: when a recurring task is completed, a new identical task is spawned with the next deadline (daily/weekly/monthly/yearly).
- Manual drag-and-drop reordering persists via `POST /api/tasks/reorder/`.
- Bulk actions: select multiple tasks, mark all complete, or delete all.
- CSV export of the current filtered task list.

### Subtasks

- Up to 10 per task.
- Parent task auto-completes (with XP award) when all subtasks are checked.
- Parent task auto-uncompletes (with XP deduction) when a subtask is unchecked.
- Progress bar on collapsed task card shows completion ratio.

### Categories

- Limited by level (2 → 3 → 5 → unlimited).
- Deleting a category sets `category = NULL` on all associated tasks (Django `SET_NULL`).
- Onboarding categories are excluded from the limit count.

### Sticky Notes

- Level 1 users have 0 notes (locked). Unlocked at level 2 (2 notes), level 3 (5), level 4+ (unlimited).
- Rich-text editing via `contentEditable` div; supports pasted images (converted to base64 data URIs).
- HTML is sanitised by `bleach` on write and by `DOMPurify` on render.
- Notes persist a draft in `localStorage` between sessions.
- Six colour options per note, shown as a top accent bar.

### Pomodoro Timer

- Modes: Focus (25 min), Short Break (5 min), Long Break (15 min).
- Cycle: work → short → work → short → work → short → work → long → repeat.
- Completing a Focus session calls `POST /api/auth/pomodoro/complete/` which awards 5 XP and increments `pomodoros_today`.
- An XP toast (+5 XP) floats above the timer on completion.
- An audio bell (`/sounds/bell.mp3`) plays on session complete.
- Optional task link: select an active task to associate with the session.

### Calendar View

- Full month grid; navigate with chevron buttons or click the month label to jump to today.
- Tasks with deadlines on each day shown as coloured priority pills (up to 3, then "+N more").
- Clicking a day opens a side panel with the day's tasks and an inline add-task form.
- Toggle and delete tasks directly from the panel.

### Heatmap

- 52-week grid (last 364 days), columns = weeks, rows = days of week.
- Colour intensity based on completed task count per day (5 heat levels using CSS variables `--heat-0` to `--heat-4`).
- Tooltip on hover showing date and count.
- Month labels positioned absolutely above the grid.

### Notifications & Alarms

- Requires `Notification.permission === 'granted'`; user grants permission via the bell button in the sidebar footer.
- `useAlarms` schedules two timers per task with a deadline: one 15 minutes before (`warn`) and one at deadline (`due`).
- On fire, both a browser `Notification` and the `AlarmModal` queue are updated.
- Timers for completed tasks or tasks with removed deadlines are automatically cancelled on the next render.

### Themes

- Three modes: `light`, `dark`, `custom`.
- `dark` and `light` switch the `data-theme` attribute on `<html>`, applying CSS variable sets defined in `index.css`.
- `custom` mode applies per-variable overrides stored in `UserProfile.theme_custom_colors` (and locally in `ThemeContext`).
- Three colour pickers: Primary Accent, Secondary Accent, Background.
- Colour changes debounce 500ms before saving to the server.
- Theme is loaded from the API on mount and from `localStorage` for instant initial paint.

### Guest Mode

- Created via `POST /api/auth/guest/` — generates a random username and password, sets `is_guest = True` on the profile.
- Fixed limits: 10 tasks, 2 categories, 1 note. No XP or leveling.
- `GuestBanner` is shown across the top with a "Sign up / Log in" button.
- Clicking the button calls `POST /api/auth/guest/logout/` which deletes the user and all their data, then redirects to `/login`.
- Staff access tokens are shortened to 5 minutes.

### Admin Dashboard

Six tabs:

**Overview** — total users, active (7d/30d), new signups (7d), pomodoros today, signup trend line chart.

**Users** — searchable/filterable table of all users with columns: username, email, join date, last login, level, XP, streak, locked status. Per-row actions: view drill-down, unlock, edit (XP/streak/email/award XP), reset XP, force logout, toggle staff, delete. Bulk actions: unlock/reset XP/delete selected users. CSV export.

**Leaderboard** — XP top 10 and streak top 10 tables.

**Tasks** — aggregate stats: total, completed, avg per user, completion rate with a progress bar.

**System** — combined health overview with quick-check indicators.

**Audit Log** — last 200 entries, filterable by action type and search term. Shows actor, target, detail, IP, timestamp. Colour-coded by action type.

---

## Database Migrations History

The following outlines the evolution of the schema in chronological order:

**`todo` app:**
1. `0001_initial` — `Category`, `Todo` base models
2. `0002_...` — Alter icon default, description to TextField, add `StickyNotes`
3. `0003_stickynotes_color` — Add `color` to `StickyNotes`
4. `0004_todo_priority` — Add `priority` to `Todo` (default `low`)
5. `0005_alter_todo_priority` — Remove default from `priority`
6. `0006_todo_pinned` — Add `pinned` BooleanField
7. `0007_todo_completed_at` — Add `completed_at` DateTimeField
8. `0008_..._is_onboarding` — Add `is_onboarding` to `Category`, `StickyNotes`, `Todo`
9. `0009_subtask` — Add `Subtask` model
10. `0010_todo_recurrence` — Add `recurrence` to `Todo`
11. `0011_add_todo_position` — Add `position` PositiveIntegerField with `db_index`

**`accounts` app:**
1. `0001_initial` — `UserProfile` with theme fields
2. `0002_...` — Add `theme_custom_colors_light`, `theme_custom_mode`
3. `0003_...` — Remove light/custom_mode fields, set `theme_mode` default to `dark`
4. `0004_...` — Add `last_completed_date`, `level`, `streak`, `xp`
5. `0005_...` — Add `last_pomodoro_date`, `pomodoros_today`
6. `0006_...` — Add `failed_login_attempts`, `lockout_until`
7. `0007_auditlog` — Add `AuditLog` model
8. `0008_alter_auditlog_action` — Add `admin_view_user` action choice
9. `0009_alter_auditlog_action` — Add `admin_view_note` action choice
10. `0010_auditlog_is_guest` — Add `is_guest` to `AuditLog` (later removed)
11. `0011_...` — Remove `is_guest` from `AuditLog`, add `is_guest` to `UserProfile`

---

## Testing

### Backend

Tests use Django's `TestCase` and DRF's `APITestCase`. Test files:

- `apps/todo/tests/test_tasks.py` — CRUD, ownership, completion toggle, duplicate detection, unauthenticated access
- `apps/todo/tests/test_categories.py` — CRUD, ownership, limit enforcement
- `apps/todo/tests/test_userlevelview.py` — Integration tests for XP award/deduction, level limits, subtask sync, sticky note limits, admin-unlock
- `apps/todo/tests/test_bleach.py` — HTML sanitisation unit tests
- `apps/accounts/tests/test_auth.py` — Register, login, token refresh, lockout
- `apps/accounts/tests/test_calclevel.py` — `calc_level()` unit tests, `award_xp` scenarios including streak, priority bonuses, level-up detection
- `apps/accounts/tests/test_views.py` — Theme API, `/api/me/` counts, lockout after max attempts

### Frontend

Tests use Vitest + React Testing Library. Setup in `frontend/src/test/setup.js` mocks `localStorage`, the Axios client, all service functions, and all query hooks.

- `test/hooks/queryHooks.test.jsx` — `useTasksQuery`, `useCategoriesQuery`, `useNotesQuery` including auth-gating, pagination unwrapping, error states
- `test/integration/mutations.test.jsx` — Optimistic toggle/delete with rollback; add task cache update
- `test/store/useAppStore.test.js` — Profile setting, XP update, level-up event, filter merge/persist, `getFilteredTasks` utility (search, priority, status, sort, pinned ordering)
- `test/home.test.tsx` — Dashboard renders expected child components
- `test/calendarview.test.tsx` — Calendar renders, shows current month
- `test/categorypanel.test.tsx` — Categories render, add button present, filter click
- `test/useDataLoader.test.ts` — `reload()` function existence, invalidation

---

## Deployment & Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Django secret key |
| `DATABASE_URL` | Yes (prod) | PostgreSQL connection string |
| `DEBUG` | No | `'True'` for development |
| `ALLOWED_HOSTS` | No | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated frontend origins |
| `RESEND_API_KEY` | Yes (email) | API key for password reset emails |
| `FRONTEND_URL` | No | Base URL for reset links (default: `http://localhost:5173`) |
| `RENDER_URL` | No | Added to `CSRF_TRUSTED_ORIGINS` if set |
| `SUPERUSER_USERNAME` | No | Auto-created superuser on deploy |
| `SUPERUSER_PASSWORD` | No | Auto-created superuser password |
| `SUPERUSER_EMAIL` | No | Auto-created superuser email |

### Frontend

Vite reads `VITE_API_URL` for the API base URL. Build output goes to `frontend_dist/` which Django serves via WhiteNoise.

### Static Files

`collectstatic` gathers everything into `staticfiles/`. WhiteNoise serves from there with compressed, fingerprinted filenames (`CompressedManifestStaticFilesStorage`). `WHITENOISE_INDEX_FILE = True` serves `index.html` for unknown paths (enabling client-side routing without the wildcard `re_path` needing to do more work).

### Session / JWT Settings

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

### Onboarding Data

On registration, `create_onboarding_data()` creates 3 categories, 5 tasks, and 2 sticky notes all marked `is_onboarding=True`. These are excluded from limit counts and can be cleared by an admin via the "Clear onboarding data" button in the user drill-down modal.