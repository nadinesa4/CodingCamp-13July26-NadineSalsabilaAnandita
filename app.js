// js/app.js — Personal Dashboard application logic
// Populated in tasks 2–14

// ============================================================
// StorageService — safe localStorage wrappers
// ============================================================
const StorageService = (() => {
  /**
   * Reads and JSON-parses a value from localStorage.
   * Returns null on any error (unavailable storage, invalid JSON) and warns.
   * @param {string} key
   * @returns {*|null}
   */
  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`StorageService.get: failed to read key "${key}":`, err);
      return null;
    }
  }

  /**
   * JSON-stringifies a value and writes it to localStorage.
   * Catches QuotaExceededError and SecurityError; warns on failure.
   * @param {string} key
   * @param {*} value
   */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.name === 'SecurityError')
      ) {
        console.warn(`StorageService.set: failed to write key "${key}" (${err.name}):`, err);
      } else {
        console.warn(`StorageService.set: failed to write key "${key}":`, err);
      }
    }
  }

  /**
   * Removes a key from localStorage. Silent on failure.
   * @param {string} key
   */
  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_err) {
      // silent — callers don't need to know about removal failures
    }
  }

  /**
   * Probes localStorage with a test write/read/remove.
   * Returns true if localStorage is fully operational, false otherwise.
   * @returns {boolean}
   */
  function isAvailable() {
    const testKey = '__storage_test__';
    try {
      localStorage.setItem(testKey, '1');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return val === '1';
    } catch (_err) {
      return false;
    }
  }

  return { get, set, remove, isAvailable };
})();

// ============================================================
// GreetingLogic — pure helpers (no DOM access)
// ============================================================
const GreetingLogic = (() => {
  /**
   * Returns a zero-padded "HH:MM:SS" string from a Date object.
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  /**
   * Returns a human-readable date string like "Monday, July 14, 2025"
   * using Intl.DateTimeFormat with the browser's locale.
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  /**
   * Returns the appropriate greeting text based on the hour (0–23).
   *   5–11  → "Good Morning"
   *  12–17  → "Good Afternoon"
   *  18–20  → "Good Evening"
   *  21–23 and 0–4 → "Good Night"
   * @param {number} hour
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night';
  }

  /**
   * Builds the full greeting message. Appends ", <name>" when the
   * trimmed name is non-empty.
   * @param {number} hour
   * @param {string} name
   * @returns {string}
   */
  function buildGreetingMessage(hour, name) {
    const greeting = getGreeting(hour);
    const trimmed = name.trim();
    return trimmed.length > 0 ? `${greeting}, ${trimmed}` : greeting;
  }

  /**
   * Trims the raw input string. Returns "" for whitespace-only input.
   * @param {string} raw
   * @returns {string}
   */
  function sanitiseName(raw) {
    return raw.trim();
  }

  return { formatTime, formatDate, getGreeting, buildGreetingMessage, sanitiseName };
})();

// ============================================================
// TimerLogic — pure helpers (no DOM access)
// ============================================================
const TimerLogic = (() => {
  /**
   * Formats a total number of seconds into a zero-padded "MM:SS" string.
   * e.g. 1500 → "25:00", 65 → "01:05", 0 → "00:00"
   * @param {number} seconds
   * @returns {string}
   */
  function formatTime(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /**
   * Returns the next remaining value, decrementing by 1 but never below 0.
   * @param {number} remaining
   * @returns {number}
   */
  function tick(remaining) {
    return Math.max(0, remaining - 1);
  }

  /**
   * Returns true when the timer has reached zero.
   * @param {number} remaining
   * @returns {boolean}
   */
  function isComplete(remaining) {
    return remaining === 0;
  }

  /**
   * Returns the default Pomodoro session length in seconds (25 minutes).
   * @returns {number}
   */
  function initialSeconds() {
    return 1500;
  }

  return { formatTime, tick, isComplete, initialSeconds };
})();

// ============================================================
// Exports — pure helpers for Node/Vitest test harness
// ============================================================
// ESM export (works with "type": "module" and Vitest in Node mode)
export { StorageService, GreetingLogic, TimerLogic };
