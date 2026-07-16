/**
 * Unit tests for StorageService
 * Validates: Requirements 8.6
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageService } from '../js/app.js';

// ---------------------------------------------------------------------------
// Mock localStorage factory
// Creates an object that mimics the localStorage API and supports
// injecting errors on demand via the `_setThrowOn` helper.
// ---------------------------------------------------------------------------
function createMockLocalStorage() {
  const store = {};
  let throwOnGetItem = null;   // if set, getItem throws this error
  let throwOnSetItem = null;   // if set, setItem throws this error
  let throwOnRemoveItem = null;

  return {
    getItem(key) {
      if (throwOnGetItem) throw throwOnGetItem;
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      if (throwOnSetItem) throw throwOnSetItem;
      store[key] = String(value);
    },
    removeItem(key) {
      if (throwOnRemoveItem) throw throwOnRemoveItem;
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach(k => delete store[k]);
    },
    // Test helpers — not part of the real localStorage API
    _setGetItemReturn(key, value) {
      store[key] = value;
    },
    _setThrowOnGetItem(err) {
      throwOnGetItem = err;
    },
    _setThrowOnSetItem(err) {
      throwOnSetItem = err;
    },
    _setThrowOnRemoveItem(err) {
      throwOnRemoveItem = err;
    },
    _reset() {
      Object.keys(store).forEach(k => delete store[k]);
      throwOnGetItem = null;
      throwOnSetItem = null;
      throwOnRemoveItem = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('StorageService', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    vi.stubGlobal('localStorage', mockStorage);
    // Suppress expected console.warn output during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Test 1: get() returns null and warns when JSON is corrupted
  // -------------------------------------------------------------------------
  test('get() returns null when stored value is invalid JSON', () => {
    mockStorage._setGetItemReturn('myKey', 'not-json');

    const result = StorageService.get('myKey');

    expect(result).toBeNull();
  });

  test('get() calls console.warn when stored value is invalid JSON', () => {
    mockStorage._setGetItemReturn('myKey', 'not-json');

    StorageService.get('myKey');

    expect(console.warn).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 2: set() does not throw when storage quota is exceeded
  // -------------------------------------------------------------------------
  test('set() does not throw when localStorage.setItem throws QuotaExceededError', () => {
    const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError');
    mockStorage._setThrowOnSetItem(quotaError);

    expect(() => {
      StorageService.set('myKey', { data: 'value' });
    }).not.toThrow();
  });

  test('set() logs a console.warn when QuotaExceededError is thrown', () => {
    const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError');
    mockStorage._setThrowOnSetItem(quotaError);

    StorageService.set('myKey', { data: 'value' });

    expect(console.warn).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 3: isAvailable() returns false when localStorage.setItem throws
  // -------------------------------------------------------------------------
  test('isAvailable() returns false when localStorage.setItem throws', () => {
    const securityError = new DOMException('Storage not allowed', 'SecurityError');
    mockStorage._setThrowOnSetItem(securityError);

    const result = StorageService.isAvailable();

    expect(result).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Baseline sanity checks
  // -------------------------------------------------------------------------
  test('get() returns null for a key that does not exist', () => {
    expect(StorageService.get('nonExistentKey')).toBeNull();
  });

  test('set() and get() round-trip a value correctly', () => {
    StorageService.set('testKey', { foo: 'bar' });
    const result = StorageService.get('testKey');
    expect(result).toEqual({ foo: 'bar' });
  });

  test('isAvailable() returns true when localStorage is working normally', () => {
    expect(StorageService.isAvailable()).toBe(true);
  });
});
