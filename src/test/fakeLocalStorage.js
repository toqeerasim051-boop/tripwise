/**
 * For node-environment tests of code that uses utils/storage.js: installs a minimal in-memory
 * `window.localStorage` for each test. Entries are own properties, like the real Storage, so
 * Object.keys() lists them.
 */
class FakeStorage {
  getItem(key) {
    return Object.hasOwn(this, key) ? this[key] : null;
  }
  setItem(key, value) {
    this[key] = String(value);
  }
  removeItem(key) {
    delete this[key];
  }
}

export function useFakeLocalStorage() {
  const ref = { storage: null };
  beforeEach(() => {
    ref.storage = new FakeStorage();
    globalThis.window = { localStorage: ref.storage };
  });
  afterEach(() => {
    delete globalThis.window;
  });
  return ref;
}
