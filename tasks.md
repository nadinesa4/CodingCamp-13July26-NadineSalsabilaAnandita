# Implementation Plan: Personal Dashboard

## Overview

Implement a fully client-side personal dashboard as three static files (`index.html`, `css/style.css`, `js/app.js`) using vanilla HTML, CSS, and JavaScript only. The application is structured around pure helper modules (`GreetingLogic`, `TimerLogic`, `TodoLogic`, `LinksLogic`) separated from DOM-touching UI modules, a centralised `StorageService`, and a `ThemeManager`. All state is persisted to `localStorage`. A Node.js + Vitest + fast-check test harness validates the 15 correctness properties defined in the design.

---

## Tasks

- [x] 1. Set up project structure, HTML shell, and test harness
  - Create `index.html` with the full semantic HTML shell: `<head>` (including the synchronous theme script), the theme toggle button, and the four `<section>` widget containers with correct `id`s and `aria-label` attributes as specified in the design
  - Create `css/style.css` as an empty file with the correct relative path reference in `index.html`
  - Create `js/app.js` as an empty file with the correct relative path reference in `index.html`
  - Initialise `package.json` with `"type": "module"` and add `vitest` and `fast-check` as dev dependencies (`npm install --save-dev vitest fast-check`)
  - Create `vitest.config.js` configured for Node environment (no jsdom)
  - Create `tests/` directory with a placeholder `tests/.gitkeep`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 2. Implement `StorageService`
  - [x] 2.1 Write `StorageService` inside `js/app.js`
    - Implement `get(key)` — `JSON.parse` wrapped in `try/catch`; returns `null` on any error and emits `console.warn`
    - Implement `set(key, value)` — `JSON.stringify` + `localStorage.setItem` wrapped in `try/catch`; catches `QuotaExceededError` and `SecurityError`; emits `console.warn` on failure
    - Implement `remove(key)` — `localStorage.removeItem` wrapped in `try/catch`; silent on failure
    - Implement `isAvailable()` — probes `localStorage` with a test write/read/remove; returns `boolean`
    - _Requirements: 8.5, 8.6, 4.12, 6.10_

  - [x] 2.2 Write unit tests for `StorageService`
    - Test `get()` returns `null` and warns when JSON is corrupted
    - Test `set()` does not throw when storage is unavailable (mock `localStorage`)
    - Test `isAvailable()` returns `false` when `localStorage.setItem` throws
    - _Requirements: 8.6_

- [x] 3. Implement `GreetingLogic` pure helpers and property tests
  - [x] 3.1 Write `GreetingLogic` module inside `js/app.js`
    - `formatTime(date)` — returns zero-padded `"HH:MM"` from a `Date` object using `getHours()` / `getMinutes()`
    - `formatDate(date)` — returns `"Weekday, Month Day, Year"` using `Intl.DateTimeFormat` with `{ weekday:'long', year:'numeric', month:'long', day:'numeric' }`
    - `getGreeting(hour)` — returns `"Good Morning"` (5–11), `"Good Afternoon"` (12–17), `"Good Evening"` (18–20), `"Good Night"` (21–23 and 0–4)
    - `buildGreetingMessage(hour, name)` — returns `"<greeting>"` or `"<greeting>, <name>"` when trimmed name is non-empty
    - `sanitiseName(raw)` — returns `raw.trim()`; returns `""` for whitespace-only input
    - Export via `module.exports = { GreetingLogic }` (CommonJS-compatible export for test harness)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 2.2, 2.5_

  - [x] 3.2 Write property test — Property 1: Time formatting is always valid HH:MM
    - Create `tests/greetingLogic.test.js`
    - **Property 1: Time Formatting Is Always Valid HH:MM**
    - **Validates: Requirements 1.1**
    - Use `fc.date()` arbitrary; assert result matches `/^[0-2][0-9]:[0-5][0-9]$/` and hours are in `[00,23]`, minutes in `[00,59]`; `numRuns: 1000`

  - [x] 3.3 Write property test — Property 2: Date formatting always produces a non-empty, human-readable string
    - **Property 2: Date Formatting Always Produces a Non-Empty, Human-Readable String**
    - **Validates: Requirements 1.3**
    - Use `fc.date()` arbitrary; assert result is a non-empty string containing the four-digit year of the input date; `numRuns: 1000`

  - [x] 3.4 Write property test — Property 3: Greeting text covers all 24 hours without gaps or overlaps
    - **Property 3: Greeting Text Covers All 24 Hours Without Gaps or Overlaps**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
    - Use `fc.integer({ min: 0, max: 23 })`; assert result is one of the four valid strings and maps to the correct range; `numRuns: 1000`

  - [x] 3.5 Write property test — Property 4: Greeting message contains the name when name is non-empty
    - **Property 4: Greeting Message Contains the Name When Name Is Non-Empty**
    - **Validates: Requirements 2.2**
    - Use `fc.integer({ min: 0, max: 23 })` and `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)`; assert the result contains the trimmed name as a suffix; `numRuns: 1000`

  - [x] 3.6 Write property test — Property 5: Name sanitisation rejects all whitespace-only strings
    - **Property 5: Name Sanitisation Rejects All Whitespace-Only Strings**
    - **Validates: Requirements 2.5**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))`; assert `sanitiseName` returns `""`; `numRuns: 1000`

- [-] 4. Checkpoint — Ensure all GreetingLogic tests pass
  - Run `npx vitest run tests/greetingLogic.test.js` and confirm all property tests pass. Ask the user if questions arise.

- [ ] 5. Implement `GreetingWidget` UI
  - [~] 5.1 Write `GreetingWidget` DOM/UI module inside `js/app.js`
    - `init()` — reads `#clock`, `#greeting-date`, `#greeting-text`, `#name-form`, `#name-input` elements; calls `GreetingLogic.formatTime`, `formatDate`, `buildGreetingMessage` to render initial state; loads `userName` from `StorageService.get('userName')`; starts `setInterval` (1000 ms) updating `#clock` every second
    - Name form submit handler — calls `sanitiseName`; skips empty; saves trimmed name via `StorageService.set('userName', name)`; re-renders `#greeting-text`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 6. Implement `TimerLogic` pure helpers and property tests
  - [-] 6.1 Write `TimerLogic` module inside `js/app.js`
    - `formatTime(seconds)` — returns zero-padded `"MM:SS"`; `1500 → "25:00"`, `0 → "00:00"`, `65 → "01:05"`
    - `tick(remaining)` — returns `Math.max(0, remaining - 1)`
    - `isComplete(remaining)` — returns `remaining === 0`
    - `initialSeconds()` — returns `1500`
    - Export alongside other pure helpers
    - _Requirements: 3.1, 3.3_

  - [~] 6.2 Write property test — Property 6: Timer formatting covers the full countdown range
    - Create `tests/timerLogic.test.js`
    - **Property 6: Timer Formatting Covers the Full Countdown Range**
    - **Validates: Requirements 3.1, 3.3**
    - Use `fc.integer({ min: 0, max: 1500 })`; assert result matches `MM:SS` format, boundary values `1500 → "25:00"` and `0 → "00:00"` are correct; `numRuns: 1500`

- [ ] 7. Implement `TimerWidget` UI
  - [~] 7.1 Write `TimerWidget` DOM/UI module inside `js/app.js`
    - `TimerState` — `{ totalSeconds: 1500, remaining: 1500, intervalId: null, running: false }`
    - `init()` — queries `#timer-display`, `#timer-alert`, `#timer-start`, `#timer-stop`, `#timer-reset`; renders initial `"25:00"`; binds click handlers
    - Start handler — guard `!running`; clears any existing `intervalId` first; starts `setInterval` (1000 ms) calling `TimerLogic.tick`; disables Start, enables Stop; on complete clears interval, shows `#timer-alert`, disables both Start and Stop; auto-hides alert after 3 s via `setTimeout`
    - Stop handler — guard `running`; clears interval; disables Stop, enables Start
    - Reset handler — clears interval; restores `remaining = 1500`; re-renders display; hides `#timer-alert`; resets button states to initial
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 8. Implement `TodoLogic` pure helpers and property tests
  - [~] 8.1 Write `TodoLogic` module inside `js/app.js`
    - `createTask(text)` — returns `{ id: generateId(), text, completed: false }`
    - `sanitise(raw)` — returns `raw.trim()`
    - `isValidText(text)` — returns `text.length > 0`
    - `isDuplicate(text, tasks)` — case-insensitive exact-match against all tasks; returns `boolean`
    - `isDuplicateEdit(text, tasks, excludeId)` — same but skips the task whose `id === excludeId`
    - `toggleTask(tasks, id)` — returns new array with the target task's `completed` flipped
    - `updateTaskText(tasks, id, text)` — returns new array with only the target task's `text` updated
    - `deleteTask(tasks, id)` — returns new array omitting the task with the given `id`
    - `generateId()` fallback per design
    - _Requirements: 4.2, 4.3, 4.4, 4.6, 4.9, 5.1, 5.4_

  - [~] 8.2 Write property test — Property 7: Task creation and validation pipeline
    - Create `tests/todoLogic.test.js`
    - **Property 7: Task Creation and Validation Pipeline**
    - **Validates: Requirements 4.2, 4.3**
    - Two sub-properties: (a) `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` → `createTask(sanitise(text))` has `completed === false`, non-empty `id`, correct trimmed `text`; (b) `fc.string().filter(s => s.trim().length === 0)` → `isValidText(sanitise(text))` returns `false`; `numRuns: 1000`

  - [~] 8.3 Write property test — Property 8: Toggle task is its own inverse (round-trip)
    - **Property 8: Toggle Task Is Its Own Inverse (Round-Trip)**
    - **Validates: Requirements 4.4**
    - Generate array of tasks + pick a valid `id`; apply `toggleTask` twice; assert target task `completed` is unchanged and all other tasks are identical; `numRuns: 1000`

  - [~] 8.4 Write property test — Property 9: Update task text mutates only the target task
    - **Property 9: Update Task Text Mutates Only the Target Task**
    - **Validates: Requirements 4.6**
    - Generate tasks array, valid `id`, non-empty text; assert result has same length, only target task's `text` changed, all others (`id`, `text`, `completed`) unchanged; `numRuns: 1000`

  - [~] 8.5 Write property test — Property 10: Delete task removes exactly one task
    - **Property 10: Delete Task Removes Exactly One Task**
    - **Validates: Requirements 4.9**
    - Generate non-empty tasks array, valid `id`; assert result length is `tasks.length - 1` and contains no task with the deleted `id`; `numRuns: 1000`

  - [~] 8.6 Write property test — Property 11: Duplicate detection is case-insensitive and edit-aware
    - **Property 11: Duplicate Detection Is Case-Insensitive and Edit-Aware**
    - **Validates: Requirements 5.1, 5.4**
    - Two sub-properties: (a) `isDuplicate` returns `true` iff case-insensitive trimmed match exists; (b) `isDuplicateEdit` returns `false` when only the excluded task matches, `true` when another task matches; `numRuns: 1000`

- [~] 9. Checkpoint — Ensure all TodoLogic tests pass
  - Run `npx vitest run tests/todoLogic.test.js` and confirm all property tests pass. Ask the user if questions arise.

- [ ] 10. Implement `TodoWidget` UI
  - [~] 10.1 Write `TodoWidget` DOM/UI module inside `js/app.js`
    - `init()` — queries `#todo-form`, `#todo-input`, `#todo-list`, `#todo-error`; loads tasks array from `StorageService.get('tasks') ?? []`; renders all saved tasks
    - `renderTaskList(tasks)` — clears `#todo-list` and renders each task as `<li data-id>` with toggle, edit, delete buttons; applies `aria-pressed` and strikethrough/muted styling for completed tasks
    - Add form submit handler — calls `sanitise`, `isValidText`, `isDuplicate`; on invalid or duplicate shows inline error in `#todo-error` and retains input text; on valid calls `createTask`, pushes to `tasks`, calls `StorageService.set('tasks', tasks)`, re-renders; clears error via `input` event or `setTimeout` (3 s)
    - Toggle click handler — calls `toggleTask`; saves; re-renders
    - Delete click handler — calls `deleteTask`; saves; re-renders
    - Edit click handler — replaces `<span>` with edit input + Save/Cancel buttons; pre-fills current text
    - Save edit handler — calls `sanitise`; if trimmed-empty discards; if duplicate shows error + reverts; otherwise calls `updateTaskText`, saves, re-renders
    - Cancel edit handler — restores display view without saving
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 11. Implement `LinksLogic` pure helpers and property tests
  - [~] 11.1 Write `LinksLogic` module inside `js/app.js`
    - `createLink(name, url)` — returns `{ id: generateId(), name: name.trim(), url: url.trim() }`
    - `sanitiseName(raw)` — returns `raw.trim()`
    - `sanitiseUrl(raw)` — returns `raw.trim()`
    - `isValidName(name)` — returns `name.length > 0`
    - `isValidUrl(url)` — returns `url.startsWith('http://') || url.startsWith('https://')`
    - `isAtCapacity(links)` — returns `links.length >= 50`
    - `deleteLink(links, id)` — returns new array omitting the link with the given `id`
    - `validateAdd(name, url, links)` — returns `{ valid: true, error: null }` or `{ valid: false, error: '<message>' }` covering: empty name, empty URL, invalid URL scheme, at capacity
    - _Requirements: 6.2, 6.4, 6.5, 6.6, 6.7_

  - [~] 11.2 Write property test — Property 12: Link validation accepts valid inputs and rejects invalid ones
    - Create `tests/linksLogic.test.js`
    - **Property 12: Link Validation Accepts Valid Inputs and Rejects Invalid Ones**
    - **Validates: Requirements 6.2, 6.6**
    - Sub-property (a): `fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)`, `fc.oneof(fc.constant('http://'), fc.constant('https://'))` + `fc.string()` → `validateAdd` returns `valid: true`; links array has `< 50` entries; `numRuns: 1000`
    - Sub-property (b): arbitrary URL not starting with `http://` or `https://` → `isValidUrl` returns `false`; `numRuns: 1000`

  - [~] 11.3 Write property test — Property 13: Delete link removes exactly one link
    - **Property 13: Delete Link Removes Exactly One Link**
    - **Validates: Requirements 6.7**
    - Generate non-empty links array, valid `id`; assert result length is `links.length - 1` and no link with deleted `id` remains; `numRuns: 1000`

- [ ] 12. Implement `LinksWidget` UI
  - [~] 12.1 Write `LinksWidget` DOM/UI module inside `js/app.js`
    - `init()` — queries `#links-form`, `#link-name-input`, `#link-url-input`, `#links-list`, `#links-error`; loads links from `StorageService.get('quickLinks') ?? []`; renders all saved links
    - `renderLinksList(links)` — clears `#links-list`; renders each link as `<li data-id>` containing `<a href target="_blank" rel="noopener noreferrer">` + delete button
    - Add form submit handler — calls `validateAdd`; on invalid shows specific error message in `#links-error` and retains input values; on valid calls `createLink`, pushes to `links`, saves, re-renders
    - Delete click handler — calls `deleteLink`; saves; re-renders
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

- [ ] 13. Implement `ThemeManager` and property test
  - [~] 13.1 Write `ThemeManager` module inside `js/app.js`
    - `applyStoredTheme()` — reads `StorageService.get('theme')`; if `"dark"` adds `dark-mode` class to `<html>`; otherwise removes it (light mode default)
    - `getCurrent()` — returns `"dark"` if `<html>` has `dark-mode` class, else `"light"`
    - `toggle()` — flips `dark-mode` class on `<html>`; calls `StorageService.set('theme', getCurrent())`; updates toggle button indicator (sun/moon icon or text)
    - `bindToggle(btnId)` — attaches click handler to the theme toggle button; updates button's visible indicator to reflect current mode
    - Add synchronous pre-paint `<script>` in `<head>` of `index.html` (inline IIFE reading `localStorage.getItem('theme')` and adding class to `document.documentElement`) to prevent flash-of-wrong-theme
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [~] 13.2 Write property test — Property 14: Theme toggle is its own inverse (round-trip)
    - Create `tests/themeManager.test.js`
    - **Property 14: Theme Toggle Is Its Own Inverse (Round-Trip)**
    - **Validates: Requirements 7.3**
    - Use `fc.constantFrom('light', 'dark')` as initial state; simulate two `toggle()` calls against a pure theme state function; assert `getCurrent()` returns the original value; mock `localStorage` and `document` (or extract pure logic); `numRuns: 100`

- [ ] 14. Implement `DashboardInit` and wire all modules
  - [~] 14.1 Write `DashboardInit` and top-level wiring inside `js/app.js`
    - Add `DOMContentLoaded` listener that calls: `ThemeManager.applyStoredTheme()`, `GreetingWidget.init()`, `TimerWidget.init()`, `TodoWidget.init()`, `LinksWidget.init()`, `ThemeManager.bindToggle('theme-toggle')`
    - Verify `StorageService.isAvailable()` on init; if `false`, emit `console.warn` and skip all `StorageService.get` calls in each widget (widgets render empty default state)
    - _Requirements: 8.4, 8.6, 7.5_

- [ ] 15. Write CSS in `css/style.css`
  - [~] 15.1 Implement CSS custom properties, reset, typography, layout, and theme
    - Write `:root` custom properties block (all `--color-*`, `--font-size-*`, `--space-*`, `--radius-*`, `--shadow-*` tokens as specified in design)
    - Write `.dark-mode` override block on `html` element
    - CSS reset: `*, *::before, *::after { box-sizing: border-box; }` and `body` base styles with `font-size: var(--font-size-base)` (minimum 16px → satisfies ≥ 14px requirement)
    - Dashboard grid layout: `display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-lg); padding: var(--space-lg);`
    - `.widget-card` styles with surface background, border-radius, padding, box-shadow
    - `:focus-visible` outline: `3px solid var(--color-accent); outline-offset: 2px;`
    - _Requirements: 7.2, 7.3, 8.2, 9.2, 9.3, 9.4, 9.5_

  - [~] 15.2 Implement component-specific styles
    - Greeting widget: clock font size using `clamp(2rem, 5vw, 4rem)`, date and greeting text styles, name form layout
    - Timer widget: timer display using `clamp(2.5rem, 6vw, 5rem)`, button states (`:disabled` styling with `--color-disabled`), alert banner styles with visible background and border
    - Todo widget: task list item layout (flex row), completed task strikethrough + `--color-text-muted`, inline edit input styles, error/validation message styles (`--color-error`)
    - Links widget: link button styles, form layout, delete button styles
    - Theme toggle button: sun/moon indicator styles; positioned at dashboard header level
    - _Requirements: 3.6, 4.4, 5.3, 9.2, 9.4, 9.5_

- [ ] 16. Implement WCAG color contrast verification
  - [~] 16.1 Write a contrast-ratio utility and property test — Property 15: WCAG color contrast is maintained in both themes
    - Create `tests/wcagContrast.test.js`
    - Implement `computeRelativeLuminance(hexColor)` and `computeContrastRatio(hex1, hex2)` per WCAG 2.1 formula inside the test file
    - **Property 15: WCAG Color Contrast Is Maintained in Both Themes**
    - **Validates: Requirements 9.4, 9.5**
    - Enumerate all text/background CSS custom property pairs for both light and dark themes (hardcode the token values from `style.css`); assert body-text pairs have contrast ≥ 4.5:1 and focus indicator/control pairs have ≥ 3:1; this is an example-based verification, not randomised
    - _Requirements: 9.4, 9.5_

- [~] 17. Final checkpoint — Ensure all tests pass and validate open-file behaviour
  - Run `npx vitest run` to execute the full test suite (all property and unit tests).
  - Open `index.html` directly in a browser (no server) and verify all four widgets render, `localStorage` persists across reloads, theme toggle works, and no console errors appear.
  - Ensure all tests pass. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All code lives in exactly three files: `index.html`, `css/style.css`, `js/app.js` — no additional source files
- Pure helper modules (`GreetingLogic`, `TimerLogic`, `TodoLogic`, `LinksLogic`) must be written before their UI counterparts
- The test harness (`vitest` + `fast-check`) lives in `package.json`/`vitest.config.js` and `tests/` — it is used only for testing and has no effect on the browser application
- `js/app.js` must use CommonJS `module.exports` / `require` compatible patterns (or conditional exports) so pure helpers are importable by Vitest in Node mode without a bundler
- Each property test references its property number and the requirements clause(s) it validates
- Checkpoints at tasks 4, 9, and 17 provide incremental validation gates

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "3.3", "3.4", "3.5", "3.6", "6.1"] },
    { "id": 2, "tasks": ["5.1", "6.2", "8.1"] },
    { "id": 3, "tasks": ["7.1", "8.2", "8.3", "8.4", "8.5", "8.6", "11.1"] },
    { "id": 4, "tasks": ["10.1", "11.2", "11.3", "13.1"] },
    { "id": 5, "tasks": ["12.1", "13.2", "14.1"] },
    { "id": 6, "tasks": ["15.1"] },
    { "id": 7, "tasks": ["15.2"] },
    { "id": 8, "tasks": ["16.1"] }
  ]
}
```
