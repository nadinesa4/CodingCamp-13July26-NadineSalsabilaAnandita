// Feature: personal-dashboard, Property 1: Time Formatting Is Always Valid HH:MM

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { GreetingLogic } from '../js/app.js';

describe('GreetingLogic.formatTime', () => {
  // ── Example-based unit tests ──────────────────────────────────────────────

  test('formats single-digit hour and minute with leading zeros', () => {
    const date = new Date(2025, 0, 1, 9, 5, 0);
    expect(GreetingLogic.formatTime(date)).toBe('09:05:00');
  });

  test('formats two-digit hour and minute correctly', () => {
    const date = new Date(2025, 0, 1, 14, 30, 0);
    expect(GreetingLogic.formatTime(date)).toBe('14:30:00');
  });

  test('formats midnight as 00:00:00', () => {
    const date = new Date(2025, 0, 1, 0, 0, 0);
    expect(GreetingLogic.formatTime(date)).toBe('00:00:00');
  });

  test('formats last minute of the day as 23:59:00', () => {
    const date = new Date(2025, 0, 1, 23, 59, 0);
    expect(GreetingLogic.formatTime(date)).toBe('23:59:00');
  });

  test('formats seconds correctly', () => {
    const date = new Date(2025, 0, 1, 8, 3, 45);
    expect(GreetingLogic.formatTime(date)).toBe('08:03:45');
  });

  // ── Property-based test ───────────────────────────────────────────────────

  // Feature: personal-dashboard, Property 1: Time Formatting Is Always Valid HH:MM:SS
  // Validates: Requirements 1.1
  test('formatTime always returns valid HH:MM:SS for any date', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = GreetingLogic.formatTime(date);

        // Must match the pattern HH:MM:SS
        expect(result).toMatch(/^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/);

        // Extract hours, minutes, and seconds parts
        const [hhStr, mmStr, ssStr] = result.split(':');
        const hh = parseInt(hhStr, 10);
        const mm = parseInt(mmStr, 10);
        const ss = parseInt(ssStr, 10);

        // Hours must be in [0, 23]
        expect(hh).toBeGreaterThanOrEqual(0);
        expect(hh).toBeLessThanOrEqual(23);

        // Minutes must be in [0, 59]
        expect(mm).toBeGreaterThanOrEqual(0);
        expect(mm).toBeLessThanOrEqual(59);

        // Seconds must be in [0, 59]
        expect(ss).toBeGreaterThanOrEqual(0);
        expect(ss).toBeLessThanOrEqual(59);

        // Result must match the actual hours/minutes/seconds of the input date
        expect(hh).toBe(date.getHours());
        expect(mm).toBe(date.getMinutes());
        expect(ss).toBe(date.getSeconds());
      }),
      { numRuns: 1000 }
    );
  });
});

// ── Property 2 ───────────────────────────────────────────────────────────────
// Feature: personal-dashboard, Property 2: Date Formatting Always Produces a Non-Empty, Human-Readable String

describe('GreetingLogic.formatDate', () => {
  // Validates: Requirements 1.3
  test('formatDate always returns a non-empty string containing the 4-digit year', () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = GreetingLogic.formatDate(date);

        // Must be a non-empty string
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);

        // Must contain a 4-digit year that matches the input date's year
        const yearMatch = result.match(/\d{4}/);
        expect(yearMatch).not.toBeNull();
        expect(parseInt(yearMatch[0], 10)).toBe(date.getFullYear());
      }),
      { numRuns: 1000 }
    );
  });
});

// ── Property 3 ───────────────────────────────────────────────────────────────
// Feature: personal-dashboard, Property 3: Greeting Text Covers All 24 Hours Without Gaps or Overlaps

describe('GreetingLogic.getGreeting', () => {
  const VALID_GREETINGS = ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'];

  // Validates: Requirements 1.4, 1.5, 1.6, 1.7
  test('getGreeting returns a valid greeting for every hour of the day', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const result = GreetingLogic.getGreeting(hour);

        // Must be one of the four valid greetings
        expect(VALID_GREETINGS).toContain(result);

        // Must map to the correct greeting based on hour range
        if (hour >= 5 && hour <= 11) {
          expect(result).toBe('Good Morning');
        } else if (hour >= 12 && hour <= 17) {
          expect(result).toBe('Good Afternoon');
        } else if (hour >= 18 && hour <= 20) {
          expect(result).toBe('Good Evening');
        } else {
          // hours 0–4 and 21–23
          expect(result).toBe('Good Night');
        }
      }),
      { numRuns: 1000 }
    );
  });
});

// ── Property 4 ───────────────────────────────────────────────────────────────
// Feature: personal-dashboard, Property 4: Greeting Message Contains the Name When Name Is Non-Empty

describe('GreetingLogic.buildGreetingMessage', () => {
  // Validates: Requirements 2.2
  test('buildGreetingMessage ends with ", <name>" when name is non-empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (hour, name) => {
          const result = GreetingLogic.buildGreetingMessage(hour, name);

          // Result must end with ", <trimmed name>"
          expect(result).toMatch(new RegExp(`,\\s${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
          expect(result.endsWith(`, ${name.trim()}`)).toBe(true);
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ── Property 5 ───────────────────────────────────────────────────────────────
// Feature: personal-dashboard, Property 5: Name Sanitisation Rejects All Whitespace-Only Strings

describe('GreetingLogic.sanitiseName', () => {
  // Validates: Requirements 2.5
  test('sanitiseName returns "" for any whitespace-only string', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
        (raw) => {
          const result = GreetingLogic.sanitiseName(raw);
          expect(result).toBe('');
        }
      ),
      { numRuns: 1000 }
    );
  });
});
