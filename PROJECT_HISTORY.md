# IronPulse — Comprehensive Project History, Architecture & Learning Log

> **Purpose**: This living document serves as the master record of all implementation plans, architectural decisions, user design directives, bug analyses, and technical learnings across the entire lifecycle of the **IronPulse** minimalist gym tracker.

---

## 📑 Table of Contents
1. [Core Architectural Philosophy](#1-core-architectural-philosophy)
2. [Chronological Implementation Phases](#2-chronological-implementation-phases)
3. [Critical Bug Post-Mortems & Root Cause Analyses](#3-critical-bug-post-mortems--root-cause-analyses)
4. [Master User Directives & UI Rules](#4-master-user-directives--ui-rules)
5. [Database Schema & Data Model Evolution](#5-database-schema--data-model-evolution)
6. [Future Roadmap & Guidelines for Next Steps](#6-future-roadmap--guidelines-for-next-steps)

---

## 1. Core Architectural Philosophy

- **Local-First & Offline-Native**:
  - Zero-latency user experience: All reads, writes, edits, and deletes execute instantly against client **IndexedDB** (`idb`).
  - Two-way background synchronization with backend **SQLite** (`sqlite3` / `better-sqlite3`) using Last-Write-Wins (LWW) timestamp conflict resolution.
- **Minimalist Editorial Aesthetics**:
  - Palette: Dark charcoal background (`#191816`), warm elevated cards (`#252320`), borders (`#383530`), terracotta accents (`#CC6543`), sage indicators (`#789D74`), amber highlights (`#E08E45`).
  - Auto-hiding floating navigation header to maximize screen space for content.
- **Uncluttered & User-Driven**:
  - No forced presets or unnecessary templates. Features (such as Workout Profiles) only exist if the user explicitly chooses to create them.

---

## 2. Chronological Implementation Phases

### Phase 1: Foundation & Offline Sync Engine
- **Stack**: React 18, TypeScript, Tailwind CSS, Vite, Express, SQLite, IndexedDB.
- **Deliverables**:
  - Full CRUD for workouts (sets, reps, RIR, weight, date, notes).
  - IndexedDB storage handler with offline queue (`sync_status: 'pending' | 'synced' | 'deleted'`).
  - Sync service with online/offline detection and manual sync triggers.

### Phase 2: Cartesian (0, 0) Progression Engine
- **Requirement**: Users needed a clear, measurable visual progression graph over time.
- **Implementation**:
  - SVG Cartesian line graph anchored strictly at `(0, 0)` origin.
  - Interactive nodes with hover glow, drop guide lines to X-axis, and `★ PB` (Personal Best) badges.
  - Timeframe toggles: **Week** (7 days), **Month** (30 days), **Year** (365 days).
  - Metric switches: **Peak Weight (kg)**, **Est. 1RM (kg)**, and **Workout Volume Load** ($\text{Sets} \times \text{Reps} \times \text{Weight}$).
  - 4-Card metric summary banner: *Current Weight*, *Peak Record*, *Growth (+/- %)*, and *Sessions count*.

### Phase 3: Strict Typography Refinement & Date Scopes
- **Typography**:
  - **Zero Monospace**: Completely removed `font-mono` / `JetBrains Mono` from all components and SVG text nodes.
  - **Bold Elements**: Standardized all bold headers, metric numbers, and titles to clean, tall, upright sans-serif (`font-bold`).
- **Contextual Date Split**:
  - **Exercise Overview Rows (`ExerciseHub.tsx`)**: Formatted as `d Month yyyy` (e.g. `30 August 2026`).
  - **Date Logging Inputs (`WorkoutForm.tsx` & `ExerciseDetailView.tsx`)**: Formatted in standard numeric `dd/mm/yy` (`31/08/26`).

### Phase 4: Direct Date Input Architecture
- **Fix**: Replaced fragile invisible overlay inputs with direct, dark-themed native date inputs (`[color-scheme:dark]`) with auto-fallback to today's date on blur to prevent empty state crashes.

### Phase 5: Workout Profiles System
- **Flow**:
  1. In the **Log Exercise** page: User can choose `None (General)` or select/create a profile (e.g. *Armwrestling*, *Rehab*).
  2. On submit: The workout is attached directly to the profile.
  3. In the **Exercises** tab: Created profiles appear as distinct **Profile Boxes** (showing exercise and session counts). Clicking a box drills down into that profile's workout catalog with a `← Back to Exercises` button.
  4. Individual delete options with inline `Delete? [Yes] [No]` confirmation on each profile box and exercise row.

### Phase 6: Direct Keyboard Typing for Sets & Reps
- **Enhancement**: Transformed Sets and Reps from static span elements into directly typeable `<input type="number" min="1" />` fields while retaining the quick `-` and `+` stepper buttons.

### Phase 7: Multi-Select & Bulk Operations
- **Features**:
  - **Select Mode**: Activated by the `Select` button in `ExerciseHub.tsx`.
  - **Checkboxes**: Select individual exercises or use `Select All` / `Deselect All`.
  - **Floating Action Bar**:
    - Move selected exercises to an existing profile.
    - Create a new profile inline and move selected exercises into it.
    - Move selected exercises to General (remove profile).
    - Bulk delete all selected exercises with confirmation prompt.

### Phase 8: User Profile, Activity Tracking & Socials Skeleton
- **Features**:
  - Added dedicated **Profile** tab in the auto-hiding top navigation header.
  - **General Progress & Training Analytics**: Total workouts, lifetime tonnage lifted (kg/tonnes), peak weight record, total volume reps, average effort (RIR).
  - **35-Day Consistency Heatmap Grid**: Visual calendar boxes showing active training days vs rest days.
  - **Social Media & Spotify Music Sharing**:
    - Share handles / links for Instagram, YouTube, TikTok, and Spotify Profile / Workout Playlists.
    - Clickable badges displayed on top profile card with direct external links.
  - **Account & Security Settings Skeleton**:
    - Change Username & Email with immediate local preview persistence.
    - Change Profile Picture (file upload / custom photo base64 preview with remove option).
    - Change Password (current, new, confirm inputs with client-side validation).
    - One-click JSON data backup export.
  - Designed with clean types (`client/src/types/user.ts`) for zero-friction mapping to future REST endpoints (`/api/user/profile`, `/api/user/password`) and SQLite user authentication tables.

---

## 3. Critical Bug Post-Mortems & Root Cause Analyses

### Post-Mortem 1: Date Input Disappearing on Backspace
- **Symptom**: Backspacing in the date field caused the text to vanish, and the user could not type any new numbers.
- **Root Cause**: An invisible overlay `<input type="date" className="opacity-0">` was overlaid on top of a `<span>{formatStandardDate(date)}</span>`. When backspaced, `date` became `""`, causing the `<span>` to collapse to 0 width/height. Partial browser date typing was invisible until full completion.
- **Resolution**: Removed the overlay hack in favor of a styled native `<input type="date" className="... [color-scheme:dark]" />` with safe fallback to `todayStr` on blur.

### Post-Mortem 2: Workout Profile Being Wiped Back to "General"
- **Symptom**: User chose `Armwrestling` when logging, but the workout kept appearing under "General Exercises", and the `Armwrestling` box showed `0 exercises`.
- **Root Cause**: In `server/src/controllers/workoutController.ts`, both `createWorkout` and `syncWorkouts` destructured incoming payloads and reconstructed the workout object for SQLite **without the `profile` property**. The server saved `profile: null` and returned it in the sync response, which overwrote the local client's profile tag.
- **Resolution**:
  1. Updated `workoutController.ts` to include `profile: w.profile ? String(w.profile).trim() : null` in all create and sync handlers.
  2. Auto-migrated database records to correctly associate existing logs with `Armwrestling`.
  3. Added auto-resolve logic in `WorkoutForm.tsx` to ensure inline typed profiles are created and bound immediately upon pressing "Save Exercise Log".

---

## 4. Master User Directives & UI Rules

1. **No Monospace**: Monospace fonts (`font-mono`) are forbidden anywhere in the project.
2. **Upright Sans-Serif Bold**: All bold headings, numbers, and badges must use `font-bold` sans-serif without forced italics.
3. **Cartesian Coordinates**: Graphs must always be anchored strictly at `(0, 0)` with clear X and Y axis titles.
4. **Contextual Dates**:
   - Spelled out (`d Month yyyy`) only on catalog summary rows.
   - Standard numeric (`dd/mm/yy`) on date pickers and log timestamps.
5. **No Forced Defaults**: Do not hardcode default profiles. If the user hasn't made one, keep the UI clean and general.
6. **Git Push Protocol**: Never execute `git push` to remote repositories unless explicitly instructed by the user. Keep work local until requested.

---

## 5. Database Schema & Data Model Evolution

### Workouts Table (SQLite & IndexedDB)
```sql
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  rir REAL NOT NULL,
  weight REAL,
  profile TEXT,                     -- Added in Phase 5
  date TEXT NOT NULL,               -- YYYY-MM-DD
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_workouts_exercise ON workouts(exercise_name);
CREATE INDEX IF NOT EXISTS idx_workouts_profile ON workouts(profile);
CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON workouts(updated_at);
```

### Metadata Store (IndexedDB)
- Key `last_synced_at`: ISO timestamp of last successful server sync.
- Key `custom_workout_profiles`: Array of user-created profile strings (`string[]`).

---

## 6. Future Roadmap & Guidelines for Next Steps
- When adding new workout fields or filters, update both `server/src/controllers/workoutController.ts` and `client/src/db/indexedDB.ts` simultaneously to maintain sync integrity.
- Maintain this `PROJECT_HISTORY.md` file with every subsequent feature release and bug fix.
