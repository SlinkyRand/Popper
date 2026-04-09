// Mock the @tauri-apps/api/window module so component code that imports
// getCurrentWindow() doesn't crash in jsdom.
import { vi } from 'vitest'

const mockWindow = {
  setShadow: vi.fn().mockResolvedValue(undefined),
  setFocus: vi.fn().mockResolvedValue(undefined),
  minimize: vi.fn().mockResolvedValue(undefined),
  maximize: vi.fn().mockResolvedValue(undefined),
  unmaximize: vi.fn().mockResolvedValue(undefined),
  isMaximized: vi.fn().mockResolvedValue(false),
  close: vi.fn().mockResolvedValue(undefined),
  startDragging: vi.fn().mockResolvedValue(undefined),
  scaleFactor: vi.fn().mockResolvedValue(1),
  innerSize: vi.fn().mockResolvedValue({ width: 600, height: 900, toLogical: (s) => ({ width: 600 / s, height: 900 / s }) }),
  outerPosition: vi.fn().mockResolvedValue({ x: 0, y: 0, toLogical: (s) => ({ x: 0, y: 0 }) }),
  setSize: vi.fn().mockResolvedValue(undefined),
  setPosition: vi.fn().mockResolvedValue(undefined),
  onScaleChanged: vi.fn().mockResolvedValue(() => {}),
}

const mockMonitor = {
  name: 'Mock Monitor',
  scaleFactor: 1,
  size: { width: 1920, height: 1080, toLogical: (s) => ({ width: 1920 / s, height: 1080 / s }) },
  position: { x: 0, y: 0, toLogical: (s) => ({ x: 0, y: 0 }) },
  workArea: {
    size: { width: 1920, height: 1040, toLogical: (s) => ({ width: 1920 / s, height: 1040 / s }) },
    position: { x: 0, y: 0, toLogical: (s) => ({ x: 0, y: 0 }) },
  },
}

const globalShortcutState = {
  handlers: new Map(),
}

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mockWindow,
  currentMonitor: vi.fn().mockResolvedValue(mockMonitor),
}))

vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: vi.fn().mockImplementation(async (shortcut, handler) => {
    globalShortcutState.handlers.set(shortcut, handler)
  }),
  unregister: vi.fn().mockImplementation(async (shortcut) => {
    globalShortcutState.handlers.delete(shortcut)
  }),
}))

// Expose for tests that need to inspect calls
globalThis.__tauriMockWindow = mockWindow
globalThis.__tauriGlobalShortcutState = globalShortcutState
