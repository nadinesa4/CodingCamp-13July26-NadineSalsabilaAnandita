# Requirements Document

## Introduction

A personal dashboard web application built with vanilla HTML, CSS, and JavaScript. It runs entirely in the browser with no backend, using the Local Storage API for all data persistence. The dashboard provides a greeting with time and date, a focus timer, a to-do list, and quick-access links, with optional light/dark mode theming and a customizable user name.

## Glossary

- **Dashboard**: The single-page web application that hosts all widgets.
- **Greeting_Widget**: The component that displays the current time, date, and a personalized greeting message.
- **Timer_Widget**: The Pomodoro-style focus timer component with 25-minute countdown.
- **Todo_Widget**: The to-do list component for managing tasks.
- **Links_Widget**: The quick links component for storing and opening favorite URLs.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **Theme**: The visual color scheme of the Dashboard, either light or dark mode.
- **User_Name**: The custom name entered by the user, stored in Local Storage and used in the greeting.
- **Task**: A single to-do item with a text description and a completion state.
- **Quick_Link**: A named URL entry that opens in a new browser tab.

---

## Requirements

### Requirement 1: Greeting Widget – Time, Date, and Greeting

**User Story:** As a user, I want to see the current time, date, and a greeting based on the time of day, so that I feel welcomed and oriented when I open the dashboard.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Greeting_Widget SHALL display the current time in HH:MM format (24-hour clock), using the browser's local time zone.
2. WHILE the Dashboard is open, THE Greeting_Widget SHALL update the displayed time every second so the clock reflects the current time without requiring a page reload.
3. WHEN the Dashboard loads, THE Greeting_Widget SHALL display the current date formatted as `<Weekday>, <Month> <Day>, <Year>` (e.g., "Monday, July 14, 2025"), using the browser's locale.
4. WHEN the current hour (0–23) is between 5 and 11 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Morning".
5. WHEN the current hour is between 12 and 17 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Afternoon".
6. WHEN the current hour is between 18 and 20 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Evening".
7. WHEN the current hour is between 21 and 23, or between 0 and 4 inclusive, THE Greeting_Widget SHALL display the greeting text "Good Night".

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to set my name so that the greeting addresses me personally.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display a visible text input field (maximum 50 characters) that allows the user to enter a custom name at any time.
2. WHEN the user submits a name whose trimmed value is non-empty, THE Greeting_Widget SHALL append the trimmed name to the greeting message (e.g., "Good Morning, Nadine").
3. WHEN the user submits a valid name, THE Dashboard SHALL save the trimmed name to Local_Storage under the key `userName`.
4. WHEN the Dashboard loads and Local_Storage contains a saved `userName`, THE Greeting_Widget SHALL display the saved name in the greeting without prompting the user to re-enter it.
5. IF the user submits a string whose trimmed value is empty (including whitespace-only input), THEN THE Greeting_Widget SHALL retain the previously saved name, not overwrite Local_Storage, and not update the greeting display.
6. IF no `userName` is found in Local_Storage on load, THEN THE Greeting_Widget SHALL display the greeting without a name suffix (e.g., "Good Morning").

---

### Requirement 3: Focus Timer Widget

**User Story:** As a user, I want a 25-minute countdown timer so that I can track focused work sessions.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Timer_Widget SHALL display a countdown of 25:00 (MM:SS format).
2. WHEN the user clicks the Start button and the timer is not already running, THE Timer_Widget SHALL begin counting down one second at a time using a 1000 ms interval.
3. WHILE the timer is counting down, THE Timer_Widget SHALL update the displayed MM:SS value once per second.
4. WHEN the user clicks the Stop button while the timer is running, THE Timer_Widget SHALL pause the countdown and retain the remaining time in the display.
5. WHEN the user clicks the Reset button, THE Timer_Widget SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Timer_Widget SHALL clear the interval, display a visible alert element (e.g., a banner or highlighted message) indicating the session is complete, and that alert SHALL remain visible for at least 3 seconds.
7. WHILE the timer is counting down, THE Timer_Widget SHALL set the Start button to a disabled state to prevent duplicate intervals.
8. WHILE the timer is paused or stopped and has not reached 00:00, THE Timer_Widget SHALL set the Stop button to a disabled state.
9. WHEN the countdown has reached 00:00, THE Timer_Widget SHALL set both the Start and Stop buttons to a disabled state until the user clicks Reset.

---

### Requirement 4: To-Do List Widget – Core CRUD

**User Story:** As a user, I want to add, edit, complete, and delete tasks so that I can manage my daily activities.

#### Acceptance Criteria

1. THE Todo_Widget SHALL provide a text input field (maximum 200 characters) and an Add button for creating new tasks; submission SHALL be triggered by either clicking the Add button or pressing the Enter key.
2. WHEN the user submits a non-empty task description (after trimming whitespace), THE Todo_Widget SHALL add the task to the task list with a default completion state of `false`.
3. IF the user submits a task description whose trimmed value is empty, THEN THE Todo_Widget SHALL not add a task, SHALL display an inline validation message, and SHALL retain the text in the input field.
4. WHEN the user clicks the complete toggle on a task, THE Todo_Widget SHALL toggle the task's completion state and SHALL update the visual appearance by applying strikethrough text styling and a muted text color to completed tasks.
5. WHEN the user clicks the Edit button on a task, THE Todo_Widget SHALL replace the task's display text with an editable input pre-filled with the task's current text (respecting the 200-character maximum).
6. WHEN the user confirms an edit (via a Save button or Enter key) with a non-empty trimmed value, THE Todo_Widget SHALL update the task text to the trimmed value and return to the display view.
7. IF the user confirms an edit with a trimmed-empty value, THEN THE Todo_Widget SHALL discard the edit and retain the original task text in the display view.
8. WHEN the user clicks a Cancel button during an edit, THE Todo_Widget SHALL discard the changes and return to the display view showing the original task text.
9. WHEN the user clicks the Delete button on a task, THE Todo_Widget SHALL remove the task from the list.
10. WHEN any task is added, edited, deleted, or toggled, THE Todo_Widget SHALL save the updated task list to Local_Storage under the key `tasks` as a JSON array.
11. WHEN the Dashboard loads, THE Todo_Widget SHALL read the task list from Local_Storage and render all saved tasks.
12. IF Local_Storage is unavailable or the stored `tasks` value cannot be parsed as valid JSON, THEN THE Todo_Widget SHALL render an empty task list and display a brief inline error indication.

---

### Requirement 5: Prevent Duplicate Tasks

**User Story:** As a user, I want the dashboard to prevent me from adding duplicate tasks so that my list stays clean.

#### Acceptance Criteria

1. WHEN the user attempts to add a task, THE Todo_Widget SHALL trim the new task description and compare it case-insensitively against the trimmed text of all existing tasks in the current list.
2. IF the trimmed, case-insensitive new task description matches an existing task's trimmed, case-insensitive description, THEN THE Todo_Widget SHALL not add the task.
3. WHEN a duplicate add is rejected, THE Todo_Widget SHALL display an inline message reading "Task already exists" and SHALL retain the rejected text in the input field.
4. WHEN the user edits a task, THE Todo_Widget SHALL trim the updated description and compare it case-insensitively against the trimmed text of all other tasks (excluding the task being edited).
5. IF the trimmed, case-insensitive updated description matches another existing task's trimmed, case-insensitive description, THEN THE Todo_Widget SHALL revert the task text to its original value and display an inline message reading "Task already exists".
6. WHEN the duplicate message is shown, THE Todo_Widget SHALL automatically dismiss it after 3 seconds or when the user modifies the input field, whichever comes first.

---

### Requirement 6: Quick Links Widget

**User Story:** As a user, I want to save and open my favorite website links from the dashboard so that I can navigate quickly.

#### Acceptance Criteria

1. THE Links_Widget SHALL provide a text input for a link name (maximum 50 characters), a text input for a URL (maximum 2048 characters), and an Add button.
2. WHEN the user submits a non-empty name and a valid URL, and the current links list contains fewer than 50 entries, THE Links_Widget SHALL add the link to the list as a clickable button labeled with the link name.
3. WHEN the user clicks a quick link button, THE Dashboard SHALL open the associated URL in a new browser tab using `target="_blank"`.
4. IF the user submits an empty name, THEN THE Links_Widget SHALL not add the link and SHALL display an inline validation message indicating the name is required.
5. IF the user submits an empty URL, THEN THE Links_Widget SHALL not add the link and SHALL display an inline validation message indicating the URL is required.
6. IF the user submits a URL whose value (after trimming) does not begin with `http://` or `https://`, THEN THE Links_Widget SHALL not add the link and SHALL display an inline validation message reading "URL must start with http:// or https://".
7. WHEN the user clicks the Delete button on a quick link, THE Links_Widget SHALL remove that link from the list.
8. WHEN any quick link is added or deleted, THE Links_Widget SHALL save the updated links list to Local_Storage under the key `quickLinks` as a JSON array.
9. WHEN the Dashboard loads, THE Links_Widget SHALL read the links list from Local_Storage and render all saved quick links.
10. IF Local_Storage is unavailable or the stored `quickLinks` value cannot be parsed as valid JSON, THEN THE Links_Widget SHALL render an empty links list and display a brief inline error indication.

---

### Requirement 7: Light / Dark Mode

**User Story:** As a user, I want to toggle between light and dark mode so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle button that switches between light mode and dark mode, and the button SHALL display a visible indicator of the currently active mode (e.g., a sun icon for light, a moon icon for dark).
2. WHEN the user activates dark mode, THE Dashboard SHALL apply a dark color scheme to all visible elements by adding a CSS class (e.g., `dark-mode`) to the `<body>` element.
3. WHEN the user activates light mode, THE Dashboard SHALL remove the dark mode CSS class from the `<body>` element, restoring the light color scheme.
4. WHEN the user toggles the theme, THE Dashboard SHALL save the selected theme to Local_Storage under the key `theme` as the string value `"dark"` or `"light"`.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the `theme` value from Local_Storage and apply the corresponding CSS class to `<body>` synchronously before the first paint, so the correct theme is visible without a flash of the default theme.
6. IF no saved `theme` is found in Local_Storage, or if Local_Storage is inaccessible, THEN THE Dashboard SHALL default to light mode and render without a dark mode CSS class.

---

### Requirement 8: Technical Constraints

**User Story:** As a developer, I want the project to follow strict technical constraints so that it remains simple, portable, and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and vanilla JavaScript; no external frameworks, libraries, or CDN-delivered scripts or stylesheets via remote URLs SHALL be loaded.
2. THE Dashboard SHALL use exactly one CSS file located at `css/style.css`.
3. THE Dashboard SHALL use exactly one JavaScript file located at `js/app.js`.
4. THE Dashboard SHALL operate without a backend server and SHALL function by opening `index.html` directly in a browser without any build step or local server.
5. THE Dashboard SHALL use only the browser's built-in `localStorage` API for data persistence; no third-party storage libraries or remote databases SHALL be used.
6. IF `localStorage` is unavailable (e.g., private browsing mode or access denied), THEN THE Dashboard SHALL render all widgets in their default empty state without throwing an uncaught JavaScript error.
7. THE Dashboard SHALL render without layout breakage, missing interactive controls, or uncaught JavaScript console errors in the latest major stable release of Chrome, Firefox, Edge, and Safari at the time of submission.

---

### Requirement 9: Non-Functional Requirements

**User Story:** As a user, I want the dashboard to be fast, readable, and visually clean so that it is pleasant to use daily.

#### Acceptance Criteria

1. THE Dashboard SHALL complete initial rendering of all widgets within 1 second of the `load` event firing, measured on a standard desktop machine with an empty browser cache and no network throttling.
2. THE Dashboard SHALL apply a responsive CSS layout so that all widgets are fully visible and all interactive controls are reachable without horizontal scrolling on viewport widths from 320px to 1920px.
3. THE Dashboard SHALL use a base font size of at least 14px for all body text elements.
4. THE Dashboard SHALL maintain text-to-background color contrast of at least 4.5:1 (WCAG AA) for all body text and interactive control labels, in both light and dark modes.
5. THE Dashboard SHALL provide a visible focus indicator (outline or equivalent) on all interactive elements that meets WCAG AA minimum contrast of 3:1 between the focus indicator color and the adjacent background color.
