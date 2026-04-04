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
