# Strict Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-sidebar Strict mode toggle that only counts Spotify playback events with `ms_played >= 30000`.

**Architecture:** Preserve imported raw events and apply strict mode at query time. Parse `strictMode=true` in `server/track-query.ts`, apply the threshold in `server/tracks.ts` before grouping, and serialize the toggle from `src/main.tsx`.

**Tech Stack:** Bun test, TypeScript, React, PostgreSQL SQL through `pg`.

---

### Task 1: Query Parameter Support

**Files:**

- Modify: `server/track-query.ts`
- Modify: `tests/track-query.test.ts`

- [ ] **Step 1: Write failing tests** for `strictMode` defaulting to false and accepting only `strictMode=true`.
- [ ] **Step 2: Run** `rtk bun test tests/track-query.test.ts` and expect failure because `strictMode` is not returned.
- [ ] **Step 3: Add** `strictMode: boolean` to `TrackQuery` and parse it with `params.get("strictMode") === "true"`.
- [ ] **Step 4: Run** `rtk bun test tests/track-query.test.ts` and expect pass.

### Task 2: SQL Filtering

**Files:**

- Modify: `server/tracks.ts`
- Create: `tests/tracks.test.ts`

- [ ] **Step 1: Write failing tests** with a fake query client proving strict mode sends `true` and the SQL contains `ms_played >= 30000`.
- [ ] **Step 2: Run** `rtk bun test tests/tracks.test.ts` and expect failure because SQL does not include the threshold.
- [ ] **Step 3: Apply** the strict filter in the `streaming_events` WHERE clause before grouping.
- [ ] **Step 4: Run** `rtk bun test tests/tracks.test.ts` and expect pass.

### Task 3: Sidebar Toggle

**Files:**

- Modify: `src/main.tsx`

- [ ] **Step 1: Add** `strictMode` state.
- [ ] **Step 2: Include** `strictMode=true` in `/api/tracks` and playlist query serialization only when enabled.
- [ ] **Step 3: Add** a right-sidebar checkbox/toggle that resets page to 1 when changed.
- [ ] **Step 4: Clear** strict mode from the Clear filters button.

### Task 4: Verification

**Files:**

- Read: `package.json`

- [ ] **Step 1: Run** `rtk bun test` and expect all tests pass.
- [ ] **Step 2: Run** `rtk bun run build` and expect production build succeeds.
