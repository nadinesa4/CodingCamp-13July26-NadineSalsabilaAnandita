# Design Document — Personal Dashboard

## Overview

The personal dashboard is a fully client-side, single-page web application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. There is no build step, no bundler, no external dependencies. Opening `index.html` directly in a browser is sufficient to run the application.

The dashboard hosts four widgets — Greeting, Focus Timer, To-Do List, and Quick Links — alongside a global Light/Dark Mode toggle. All state is persisted to `localStorage` under well-known keys. The application is designed to be resilient: if `localStorage` is unavailable, every widget degrades gracefully to its default empty state.

### Design Goals

- **Zero dependencies**: vanilla HTML/CSS/JS only.
- **Resilience**: `localStorage` failures are caught at the storage layer; widgets always render.
- **Accessibility**: WCAG AA contrast in both themes; visible focus indicators; ARIA attributes where needed.
- **Responsiveness**: fluid layout from 320 px to 1920 px with no horizontal scroll.
- **Correctness**: pure business-logic functions are isolated so they can be property-tested independently of the DOM.

---

## Architecture

### File Structure

```
project-root/
├── index.html          # Single HTML shell; imports css/style.css and js/app.js
├── css/
│   └── style.css       # All styling: reset, variables, layout, components, themes
└── js/
    └── app.js          # All application logic, modularised with the IIFE/module pattern
```

### Module Organisation Inside `app.js`

`app.js` is a single file, but it is internally divided into clear sections separated by comments. Each section is a self-contained IIFE (or a plain object acting as a namespace) so that names do not pollute the global scope.

```
app.js
├── StorageService          — safe read/write wrappers around localStorage
├── GreetingWidget          — clock, date, greeting, name input
├── TimerWidget             — Pomodoro countdown; pure countdown logic separated
├── TodoWidget              — task CRUD; pure validation/duplicate logic separated
├── LinksWidget             — quick-link CRUD; pure URL validation separated
├── ThemeManager            — synchronous theme application on load + toggle
└── DashboardInit           — wires up all modules; called on DOMContentLoaded
```

**Separation of concerns principle**: every widget exposes:
1. A *pure* helper module containing all business logic (validation, transformation) — no DOM access.
2. A *UI* module that touches the DOM, calls the pure helpers, and delegates to `StorageService`.

This separation makes the pure helpers fully unit-testable and property-testable without a DOM environment (e.g. jsdom or a real browser).

### Initialisation Flow

```
DOMContentLoaded
  └─► ThemeManager.applyStoredTheme()   ← synchronous, before paint
  └─► GreetingWidget.init()
        ├─ render date/greeting once
        └─ start 1s setInterval for clock
  └─► TimerWidget.init()
  └─► TodoWidget.init()                 ← reads localStorage, renders tasks
  └─► LinksWidget.init()                ← reads localStorage, renders links
  └─► ThemeManager.bindToggle()
```

`ThemeManager.applyStoredTheme()` runs **synchronously** inside a `<script>` tag placed in `<head>` (before any `<link>` element renders content) to prevent flash of unstyled theme. The rest of the init runs after `DOMContentLoaded`.

---

## Components and Interfaces

### 1. StorageService

Centralises all `localStorage` access. Prevents uncaught errors from propagating.

```js
StorageService = {
  get(key)           // returns parsed value or null; catches JSON.parse errors
  set(key, value)    // JSON.stringifies; catches QuotaExceededError / SecurityError
  remove(key)        // wraps localStorage.removeItem; silent on failure
  isAvailable()      // returns boolean; used for init-time detection
}
```

On any read error (unavailable storage, invalid JSON), `get()` returns `null` and logs a warning to the console. Callers treat `null` as "no data".

---

### 2. GreetingWidget

**DOM structure (rendered from HTML template):**

```html
<section id="greeting-widget" aria-label="Greeting">
  <div class="clock" id="clock">HH:MM</div>
  <div class="date"  id="greeting-date"></div>
  <div class="greeting-text" id="greeting-text"></div>
  <form class="name-form" id="name-form">
    <label for="name-input">Your name</label>
    <input id="name-input" type="text" maxlength="50" placeholder="Enter your name" />
    <button type="submit">Save</button>
  </form>
</section>
```

**State:** stored externally in `localStorage["userName"]`; the widget has no in-memory state beyond the live timer reference.

**Interfaces (pure helpers — `GreetingLogic`):**

```js
GreetingLogic = {
  formatTime(date)          // → "HH:MM" from a Date object
  formatDate(date)          // → "Weekday, Month Day, Year" using Intl.DateTimeFormat
  getGreeting(hour)         // → "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
  buildGreetingMessage(hour, name)  // → full greeting string, name appended if non-empty
  sanitiseName(raw)         // → trimmed string; returns "" for whitespace-only input
}
```

**Event handling:**
- `setInterval(() => updateClock(), 1000)` — updates `#clock` every second.
- `#name-form` submit — calls `sanitiseName`, skips empty, writes to `localStorage`, re-renders greeting.

---

### 3. TimerWidget

**DOM structure:**

```html
<section id="timer-widget" aria-label="Focus Timer">
  <div class="timer-display" id="timer-display" role="timer" aria-live="off">25:00</div>
  <div class="timer-alert" id="timer-alert" aria-live="assertive" hidden></div>
  <div class="timer-controls">
    <button id="timer-start">Start</button>
    <button id="timer-stop"  disabled>Stop</button>
    <button id="timer-reset">Reset</button>
  </div>
</section>
```

`aria-live="assertive"` on the alert banner ensures screen readers announce session completion immediately.

**State (in-memory only — timer state is not persisted):**

```js
TimerState = {
  totalSeconds: 1500,    // 25 × 60
  remaining: 1500,
  intervalId: null,
  running: false
}
```

**Interfaces (pure helpers — `TimerLogic`):**

```js
TimerLogic = {
  formatTime(seconds)     // → "MM:SS"  e.g. 1500 → "25:00", 65 → "01:05"
  tick(remaining)         // → remaining - 1  (floor at 0)
  isComplete(remaining)   // → remaining === 0
  initialSeconds()        // → 1500
}
```

**Event handling:**

| Button | Guard | Effect |
|--------|-------|--------|
| Start  | `!running` | starts `setInterval`, disables Start, enables Stop |
| Stop   | `running` | clears interval, disables Stop, enables Start |
| Reset  | always | clears interval, restores `remaining = 1500`, re-renders, hides alert, resets button states |

On `tick()` returning 0, the interval is cleared, the alert banner is shown (via `removeAttribute('hidden')`), and Start + Stop are disabled until Reset.

The alert auto-hides after 3 seconds using `setTimeout`.

---

### 4. TodoWidget

**DOM structure:**

```html
<section id="todo-widget" aria-label="To-Do List">
  <form id="todo-form">
    <input id="todo-input" type="text" maxlength="200" placeholder="Add a task…" />
    <button type="submit">Add</button>
  </form>
  <div id="todo-error" role="alert" aria-live="polite"></div>
  <ul id="todo-list"></ul>
</section>
```

Each rendered task item:

```html
<li data-id="<uuid>">
  <button class="toggle-btn" aria-label="Mark complete" aria-pressed="false">✓</button>
  <span class="task-text">Task description</span>
  <button class="edit-btn"   aria-label="Edit task">Edit</button>
  <button class="delete-btn" aria-label="Delete task">Delete</button>
</li>
```

During inline edit the `<span>` is replaced by:

```html
<input class="edit-input" type="text" maxlength="200" value="<current text>" />
<button class="save-btn">Save</button>
<button class="cancel-btn">Cancel</button>
```

**In-memory state:** `tasks[]` array — the single source of truth, synced to `localStorage` on every mutation.

**Interfaces (pure helpers — `TodoLogic`):**

```js
TodoLogic = {
  createTask(text)               // → { id: crypto.randomUUID(), text, completed: false }
  sanitise(raw)                  // → trimmed string
  isValidText(text)              // → text.length > 0 after sanitise
  isDuplicate(text, tasks)       // → case-insensitive exact-match check against existing tasks
  toggleTask(tasks, id)          // → new array with task.completed flipped
  updateTaskText(tasks, id, text)// → new array with task.text updated
  deleteTask(tasks, id)          // → new array without the task
  isDuplicateEdit(text, tasks, excludeId) // → duplicate check excluding the task being edited
}
```

`crypto.randomUUID()` is available in all modern browsers without a polyfill. For environments where it is unavailable, a fallback using `Math.random()` is provided.

**Persistence:** every mutating operation ends with `StorageService.set('tasks', tasks)`.

**Error dismissal:** the inline validation message is cleared on next user input (`input` event on `#todo-input`) or after 3 seconds via `setTimeout`.

---

### 5. LinksWidget

**DOM structure:**

```html
<section id="links-widget" aria-label="Quick Links">
  <form id="links-form">
    <input id="link-name-input" type="text" maxlength="50"   placeholder="Link name" />
    <input id="link-url-input"  type="url"  maxlength="2048" placeholder="https://…" />
    <button type="submit">Add</button>
  </form>
  <div id="links-error" role="alert" aria-live="polite"></div>
  <ul id="links-list"></ul>
</section>
```

Each rendered link item:

```html
<li data-id="<uuid>">
  <a href="<url>" target="_blank" rel="noopener noreferrer" class="link-btn">Link name</a>
  <button class="delete-link-btn" aria-label="Delete link">×</button>
</li>
```

`rel="noopener noreferrer"` is required for security on `target="_blank"` links.

**Interfaces (pure helpers — `LinksLogic`):**

```js
LinksLogic = {
  createLink(name, url)      // → { id: crypto.randomUUID(), name: trimmed, url: trimmed }
  sanitiseName(raw)          // → trimmed string
  sanitiseUrl(raw)           // → trimmed string
  isValidName(name)          // → name.length > 0
  isValidUrl(url)            // → url starts with "http://" or "https://"
  isAtCapacity(links)        // → links.length >= 50
  deleteLink(links, id)      // → new array without the link
  validateAdd(name, url, links) // → { valid: bool, error: string | null }
}
```

**Persistence:** every mutation calls `StorageService.set('quickLinks', links)`.

---

### 6. ThemeManager

**DOM target:** `<body>` element — adds/removes class `dark-mode`.

**Synchronous pre-paint script in `<head>`:**

```html
<script>
  (function() {
    try {
      if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark-mode');
      }
    } catch(e) {}
  })();
</script>
```

This runs before any CSS is applied, eliminating the flash-of-wrong-theme.

**Interfaces:**

```js
ThemeManager = {
  applyStoredTheme()  // reads localStorage synchronously, adds/removes class
  toggle()            // flips class, writes new value to localStorage
  getCurrent()        // → "dark" | "light" based on body classList
  bindToggle(btnId)   // attaches click handler to the toggle button
}
```

---

## Data Models

### localStorage Keys

| Key | Type | Shape | Default |
|-----|------|-------|---------|
| `userName` | `string` | Plain string, max 50 chars | `null` (no entry) |
| `tasks` | `string` (JSON) | `Task[]` | `null` → treated as `[]` |
| `quickLinks` | `string` (JSON) | `QuickLink[]` | `null` → treated as `[]` |
| `theme` | `string` | `"light"` \| `"dark"` | `null` → defaults to light |

### Task Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Buy groceries",
  "completed": false
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | `string` | UUID v4; unique; never mutated after creation |
| `text` | `string` | 1–200 chars after trim; case-preserved in storage |
| `completed` | `boolean` | `true` = done; `false` = pending |

### QuickLink Object

```json
{
  "id": "b4c3e890-12ab-43cd-8901-ef2345678901",
  "name": "GitHub",
  "url": "https://github.com"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | `string` | UUID v4; unique |
| `name` | `string` | 1–50 chars after trim |
| `url` | `string` | 1–2048 chars; must begin with `http://` or `https://` |

### localStorage Capacity Notes

A typical task list of 100 tasks stays well under 100 KB; `localStorage` has a minimum quota of 5 MB in all target browsers. No quota management is required, but `QuotaExceededError` is caught by `StorageService.set()` and surfaced via console warning.

---

## CSS Architecture

### Custom Properties (Design Tokens)

All colours, spacing, and typography values are defined as CSS custom properties on `:root` (light mode) and overridden inside `.dark-mode` (on `<html>`):

```css
:root {
  --color-bg:           #f5f5f5;
  --color-surface:      #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-muted:   #6b7280;
  --color-accent:       #4f46e5;
  --color-accent-hover: #4338ca;
  --color-border:       #e5e7eb;
  --color-error:        #dc2626;
  --color-success:      #16a34a;
  --color-disabled:     #9ca3af;

  --font-size-base:     16px;
  --font-size-clock:    clamp(2rem, 5vw, 4rem);
  --font-size-timer:    clamp(2.5rem, 6vw, 5rem);

  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   32px;

  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --shadow-sm:  0 1px 3px rgba(0,0,0,.1);
}

.dark-mode {
  --color-bg:           #111827;
  --color-surface:      #1f2937;
  --color-text-primary: #f9fafb;
  --color-text-muted:   #9ca3af;
  --color-accent:       #818cf8;
  --color-accent-hover: #a5b4fc;
  --color-border:       #374151;
}
```

All component styles reference only these tokens, so flipping `.dark-mode` on `<html>` is the only change required for a full theme switch.

### Layout Approach

The top-level layout uses **CSS Grid**:

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: var(--space-lg);
  padding: var(--space-lg);
}
```

`auto-fit` with `minmax(min(100%, 340px), 1fr)` gives:
- Single column on viewports below ~340 px (satisfies 320 px requirement).
- Two or more columns on wider screens, up to 1920 px.
- No media query breakpoints required; the layout is intrinsically responsive.

Each widget is a card:

```css
.widget-card {
  background:    var(--color-surface);
  border-radius: var(--radius-lg);
  padding:       var(--space-lg);
  box-shadow:    var(--shadow-sm);
}
```

### Focus Indicators

```css
:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
```

`--color-accent` is chosen to maintain ≥ 3:1 contrast ratio against `--color-surface` in both themes.

### Typography Reset

```css
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-bg);
  line-height: 1.5;
}
```

---

## Error Handling

### `localStorage` Unavailability

`StorageService.isAvailable()` is called once at startup. If it returns `false`, a non-blocking console warning is emitted and all widgets skip their load-from-storage calls. They render empty default state. No uncaught exceptions propagate.

### Corrupted JSON

`StorageService.get()` wraps `JSON.parse` in a `try/catch`. On failure it returns `null` and logs `console.warn`. Widgets treat `null` the same as an empty store — they render their default state and show a brief inline error indicator (a small `<div role="alert">` with text like "Could not load saved data").

### Timer Interval Leak

`TimerWidget` always clears the existing `intervalId` before starting a new one. This prevents the unlikely-but-possible case of multiple intervals accumulating if the user somehow triggers Start twice.

### Form Input Sanitisation

All user text passes through the widget's `sanitise()` helper before validation. This trims whitespace. No HTML is ever inserted via `innerHTML` with unsanitised content — task text and link names are set via `textContent` or `value`, never `innerHTML`. Link URLs are assigned to `anchor.href` and validated against the `http://`/`https://` prefix before insertion.

### `crypto.randomUUID()` Fallback

```js
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
```

---

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The features in this dashboard include several pure helper functions (formatters, validators, collection mutators) that are ideal for property-based testing. The following properties are derived from the acceptance criteria in the requirements document.

---

### Property 1: Time Formatting Is Always Valid HH:MM

*For any* `Date` object, `GreetingLogic.formatTime(date)` SHALL return a string that matches the pattern `HH:MM`, where `HH` is a zero-padded integer in `[00, 23]` and `MM` is a zero-padded integer in `[00, 59]`.

**Validates: Requirements 1.1**

---

### Property 2: Date Formatting Always Produces a Non-Empty, Human-Readable String

*For any* `Date` object, `GreetingLogic.formatDate(date)` SHALL return a non-empty string containing the four-digit year of that date, ensuring the output is never blank or malformed.

**Validates: Requirements 1.3**

---

### Property 3: Greeting Text Covers All 24 Hours Without Gaps or Overlaps

*For any* integer hour in `[0, 23]`, `GreetingLogic.getGreeting(hour)` SHALL return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, and the return value SHALL match the correct time-of-day range: Morning for 5–11, Afternoon for 12–17, Evening for 18–20, Night for 21–23 and 0–4.

**Validates: Requirements 1.4, 1.5, 1.6, 1.7**

---

### Property 4: Greeting Message Contains the Name When Name Is Non-Empty

*For any* integer hour in `[0, 23]` and any non-empty, non-whitespace-only string `name`, `GreetingLogic.buildGreetingMessage(hour, name)` SHALL return a string containing the trimmed `name` as a suffix (e.g., `", <name>"`).

**Validates: Requirements 2.2**

---

### Property 5: Name Sanitisation Rejects All Whitespace-Only Strings

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines, carriage returns, or any combination thereof), `GreetingLogic.sanitiseName(raw)` SHALL return the empty string `""`.

**Validates: Requirements 2.5**

---

### Property 6: Timer Formatting Covers the Full Countdown Range

*For any* integer `seconds` in `[0, 1500]`, `TimerLogic.formatTime(seconds)` SHALL return a string in `MM:SS` format where the minute and second parts are zero-padded, `formatTime(1500)` is `"25:00"`, and `formatTime(0)` is `"00:00"`.

**Validates: Requirements 3.1, 3.3**

---

### Property 7: Task Creation and Validation Pipeline

*For any* non-empty, non-whitespace-only string `text`, `TodoLogic.createTask(TodoLogic.sanitise(text))` SHALL produce a task object with `completed === false`, a non-empty `id`, and `text` equal to the trimmed input. Additionally, *for any* string whose trimmed value is empty, `TodoLogic.isValidText(TodoLogic.sanitise(text))` SHALL return `false`.

**Validates: Requirements 4.2, 4.3**

---

### Property 8: Toggle Task Is Its Own Inverse (Round-Trip)

*For any* tasks array and any valid task `id` present in that array, applying `TodoLogic.toggleTask` twice SHALL return a tasks array where the target task has the same `completed` value as before the first toggle, and all other tasks remain unchanged.

**Validates: Requirements 4.4**

---

### Property 9: Update Task Text Mutates Only the Target Task

*For any* tasks array, any valid task `id`, and any non-empty trimmed `text`, `TodoLogic.updateTaskText(tasks, id, text)` SHALL return a new array of the same length where exactly the task with the given `id` has its `text` changed to `text`, and all other tasks (id, text, completed) are identical to the originals.

**Validates: Requirements 4.6**

---

### Property 10: Delete Task Removes Exactly One Task

*For any* non-empty tasks array and any valid task `id` in that array, `TodoLogic.deleteTask(tasks, id)` SHALL return an array with exactly `tasks.length - 1` elements and SHALL NOT contain any task with the deleted `id`.

**Validates: Requirements 4.9**

---

### Property 11: Duplicate Detection Is Case-Insensitive and Edit-Aware

*For any* string `text` and any tasks array:
- `TodoLogic.isDuplicate(text, tasks)` SHALL return `true` if and only if the case-insensitive trimmed `text` matches the case-insensitive trimmed `text` of any task in `tasks`.
- `TodoLogic.isDuplicateEdit(text, tasks, excludeId)` SHALL return `false` when `text` matches only the task whose `id` equals `excludeId`, and SHALL return `true` when `text` matches any other task (case-insensitively).

**Validates: Requirements 5.1, 5.4**

---

### Property 12: Link Validation Accepts Valid Inputs and Rejects Invalid Ones

*For any* non-empty trimmed name (≤ 50 chars), any URL string starting with `http://` or `https://`, and any links array with fewer than 50 entries, `LinksLogic.validateAdd(name, url, links)` SHALL return `{ valid: true, error: null }`. *For any* URL whose trimmed value does not begin with `http://` or `https://`, `LinksLogic.isValidUrl(url)` SHALL return `false`.

**Validates: Requirements 6.2, 6.6**

---

### Property 13: Delete Link Removes Exactly One Link

*For any* non-empty links array and any valid link `id` in that array, `LinksLogic.deleteLink(links, id)` SHALL return an array with exactly `links.length - 1` elements and SHALL NOT contain any link with the deleted `id`.

**Validates: Requirements 6.7**

---

### Property 14: Theme Toggle Is Its Own Inverse (Round-Trip)

*For any* initial theme state (`"light"` or `"dark"`), calling `ThemeManager.toggle()` twice SHALL restore the theme to its original state (i.e., `getCurrent()` returns the same value as before the two toggles).

**Validates: Requirements 7.3**

---

### Property 15: WCAG Color Contrast Is Maintained in Both Themes

*For every* text/background color token pair used in the light theme and dark theme, the computed WCAG relative luminance contrast ratio SHALL be ≥ 4.5:1 for body text and ≥ 3:1 for focus indicators and UI controls. This is verified by enumerating the CSS custom property pairs programmatically and computing contrast per the WCAG 2.1 formula.

**Validates: Requirements 9.4, 9.5**

---

## Testing Strategy

### Overview

The testing approach uses two complementary strategies:

1. **Property-based tests** — verify universal properties across randomized inputs using a PBT library.
2. **Unit / example tests** — verify specific scenarios, edge cases, and integration points.

### Property-Based Testing Library

**Chosen library: [fast-check](https://github.com/dubzzz/fast-check)** (MIT license, no runtime dependencies, works in browser and Node.js).

Since the project has no build step, property tests are run in a Node.js test harness (e.g. `node --test` or Vitest in Node mode) that imports the pure helper modules. The pure helpers are written as plain JS functions exportable via `module.exports` for test consumption without touching the DOM.

Each property-based test is configured to run a **minimum of 100 iterations** (fast-check default is 100, increase to 1000 for critical properties).

**Test tag format:**  
```js
// Feature: personal-dashboard, Property 3: Greeting text covers all 24 hours
```

### Property Test Implementations

Each of the 15 correctness properties maps to a single `fc.assert(fc.property(...))` call. Example:

```js
// Feature: personal-dashboard, Property 3: Greeting text covers all 24 hours
test('getGreeting covers all valid hours', () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 23 }),
    (hour) => {
      const result = GreetingLogic.getGreeting(hour);
      const valid = ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'];
      expect(valid).toContain(result);
      if (hour >= 5  && hour <= 11) expect(result).toBe('Good Morning');
      if (hour >= 12 && hour <= 17) expect(result).toBe('Good Afternoon');
      if (hour >= 18 && hour <= 20) expect(result).toBe('Good Evening');
      if ((hour >= 21 && hour <= 23) || hour <= 4) expect(result).toBe('Good Night');
    }
  ), { numRuns: 1000 });
});
```

### Unit / Example Tests

Unit tests cover:
- Specific correct behaviors (e.g. `formatTime(new Date('2025-01-01T09:05:00'))` returns `"09:05"`).
- Edge cases: empty task list, single-task list, all-whitespace input, exactly 50 links.
- Error conditions: `StorageService.get` with corrupted JSON, `StorageService.set` with unavailable storage.
- Button state transitions for the timer (start → stop → reset sequences).
- Inline validation message display and dismissal.
- Theme toggle button updates its label/icon.

### Integration Tests

Integration tests (with jsdom or a headless browser) cover:
- Full widget init from primed `localStorage`.
- `localStorage` write triggered on task/link mutation.
- Timer alert appears and auto-hides after 3 seconds (using fake timers).
- Duplicate message auto-dismisses after 3 seconds.

### What is NOT Tested with PBT

The following are tested with examples or smoke tests only:
- `setInterval`-based clock and timer updates (timing behavior, not logic).
- DOM structure checks (input element existence, ARIA attributes).
- `localStorage` side effects (integration tests with mocked storage).
- CSS rendering and responsive layout (manual / visual regression).
- Cross-browser compatibility (manual testing in Chrome, Firefox, Edge, Safari).
- Initial render performance (manual measurement).
