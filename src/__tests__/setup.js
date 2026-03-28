// Mock the @tauri-apps/api/window module so component code that imports
// getCurrentWindow() doesn't crash in jsdom.
import { vi } from 'vitest'

const mockWindow = {
  setShadow: vi.fn().mockResolvedValue(undefined),
  minimize: vi.fn().mockResolvedValue(undefined),
  maximize: vi.fn().mockResolvedValue(undefined),
  unmaximize: vi.fn().mockResolvedValue(undefined),
  isMaximized: vi.fn().mockResolvedValue(false),
  close: vi.fn().mockResolvedValue(undefined),
  startDragging: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mockWindow,
  currentMonitor: vi.fn().mockResolvedValue(null)
}))

// Expose for tests that need to inspect calls
globalThis.__tauriMockWindow = mockWindow

// Prevent JSDOM from crashing when Vue renders <img src="/icon.ico">
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
  if (name === 'src' && value === '/icon.ico') {
    value = ''; // neutralize the path
  }
  return originalSetAttribute.call(this, name, value);
};

// Also catch direct property assignments
const imgPropDesc = Object.getOwnPropertyDescriptor(global.HTMLImageElement.prototype, 'src');
if (imgPropDesc) {
  Object.defineProperty(global.HTMLImageElement.prototype, 'src', {
    get: imgPropDesc.get,
    set(value) {
      if (value === '/icon.ico') return;
      imgPropDesc.set.call(this, value);
    }
  });
}

// Suppress jsdom resource-loading errors for local image paths
// (e.g. /icon.ico referenced in templates). jsdom tries to resolve
// these as file:// URLs which aren't valid absolute paths on Windows.
const origConsoleError = console.error
console.error = (...args) => {
  const msg = args[0]?.toString?.() ?? ''
  if (msg.includes('ERR_INVALID_ARG_VALUE') || msg.includes('icon.ico')) return
  origConsoleError(...args)
}
