import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'
import { useGameStore } from '../stores/gameStore'
import { usePreferenceStore } from '../stores/preferenceStore'
import {
  FLYOUT_HEIGHT_DEFAULT,
  FLYOUT_WIDTH_DEFAULT,
  MAIN_APP_WIDTH_DEFAULT,
} from '../data/preferences/preference.constants'
import { check } from '@tauri-apps/plugin-updater'
import { wallpaperPaletteState } from '../lib/wallpaperPalette'

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn().mockResolvedValue(null),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/wallpaperPalette', async () => {
  const { ref, computed } = await import('vue')

  const palette = ref([])
  const wallpaperUrl = ref('')
  const isLoading = ref(false)
  const isFallback = ref(false)
  const isReady = ref(true)

  return {
    wallpaperPaletteState: {
      palette,
      wallpaperUrl,
      isLoading,
      isFallback,
      isReady,
      hexes: computed(() => []),
      roles: computed(() => ({
        background: '#101010',
        surface: '#1b1b1b',
        accent: '#ff1744',
        accent2: '#7c4dff',
        accentSoft: 'rgba(255, 23, 68, 0.18)',
        highlight: '#ffd600',
        text: '#ffffff',
      })),
      refresh: vi.fn().mockResolvedValue(undefined),
    },
  }
})

describe('App.vue', () => {
  let pinia

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    globalThis.__tauriGlobalShortcutState.handlers.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    vi.mocked(check).mockResolvedValue(null)
    vi.mocked(wallpaperPaletteState.refresh).mockResolvedValue(undefined)
  })

  function mountApp() {
    return mount(App, {
      global: {
        plugins: [pinia],
      },
    })
  }

  // ─── Mounting ─────────────────────────────────────────────────
  it('mounts without runtime errors', () => {
    const wrapper = mountApp()
    expect(wrapper.vm).toBeTruthy()
  })

  // ─── UI renders from store state ─────────────────────────────
  it('renders 16 popper buttons', () => {
    const wrapper = mountApp()
    const buttons = wrapper.findAll('.popper-button')
    expect(buttons).toHaveLength(16)
  })

  it('marks exactly one button with the "up" class initially', () => {
    const wrapper = mountApp()
    const upButtons = wrapper.findAll('.popper-button.up')
    expect(upButtons).toHaveLength(1)
  })

  it('renders 🐱 on the up button and 🕳️ on down buttons', () => {
    const wrapper = mountApp()
    const buttons = wrapper.findAll('.popper-button')
    const upBtn = buttons.find((b) => b.classes('up'))
    const downBtns = buttons.filter((b) => b.classes('down'))

    expect(upBtn.text()).toContain('🐱')
    downBtns.forEach((b) => expect(b.text()).toContain('🕳️'))
  })

  // ─── Click wiring ────────────────────────────────────────────
  it('clicking the up button pops a different one up', async () => {
    const wrapper = mountApp()
    const store = useGameStore()

    // Find and click the up button
    const upBtn = wrapper.find('.popper-button.up')
    await upBtn.trigger('click')

    // Store should have updated
    expect(store.buttons[0]).toBe(false)
    expect(store.buttons.filter(Boolean)).toHaveLength(1)

    // DOM should reflect the change
    await wrapper.vm.$nextTick()
    const newUpButtons = wrapper.findAll('.popper-button.up')
    expect(newUpButtons).toHaveLength(1)
  })

  it('clicking a "down" button does NOT change state', async () => {
    const wrapper = mountApp()
    const store = useGameStore()
    const before = [...store.buttons]

    // Click a "down" button
    const downBtns = wrapper.findAll('.popper-button.down')
    await downBtns[0].trigger('click')

    expect(store.buttons).toEqual(before)
  })

  it('UI stays in sync after multiple clicks', async () => {
    const wrapper = mountApp()
    const store = useGameStore()

    for (let i = 0; i < 10; i++) {
      const upBtn = wrapper.find('.popper-button.up')
      await upBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const upCount = wrapper.findAll('.popper-button.up').length
      const downCount = wrapper.findAll('.popper-button.down').length
      expect(upCount).toBe(1)
      expect(downCount).toBe(15)
    }
  })

  // ─── Visual class changes ────────────────────────────────────
  it('the up button has the correct gradient styles (class-based)', () => {
    const wrapper = mountApp()
    const upBtn = wrapper.find('.popper-button.up')
    // Just verify the class is present — CSS is applied via <style scoped>
    expect(upBtn.classes()).toContain('up')
    expect(upBtn.classes()).not.toContain('down')
  })

  // ─── Performance: mount latency ───────────────────────────────
  it('mounts under 100ms', () => {
    const start = performance.now()
    const wrapper = mountApp()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
    console.log(`  ⏱  Mount time: ${elapsed.toFixed(2)}ms`)
    expect(wrapper.vm).toBeTruthy()
  })

  it('processes 20 click-render cycles under 200ms', async () => {
    const wrapper = mountApp()
    const start = performance.now()

    for (let i = 0; i < 20; i++) {
      const upBtn = wrapper.find('.popper-button.up')
      await upBtn.trigger('click')
      await wrapper.vm.$nextTick()
    }

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(200)
    console.log(`  ⏱  20 click-render cycles: ${elapsed.toFixed(2)}ms`)
  })

  // ─── Window Controls ──────────────────────────────────────────
  it('calls minimize when minimize button is clicked', async () => {
    const wrapper = mountApp()
    const minimizeBtn = wrapper.find('.win-btn[aria-label="Minimize"]')
    await minimizeBtn.trigger('click')
    expect(globalThis.__tauriMockWindow.minimize).toHaveBeenCalled()
  })

  it('calls maximize/unmaximize when toggle maximize button is clicked', async () => {
    const wrapper = mountApp()
    const maximizeBtn = wrapper.find('.win-btn[aria-label="Maximize"]')
    
    // Default mock is isMaximized() => false
    await maximizeBtn.trigger('click')
    // yield to wait for the async check to resolve
    await new Promise((r) => setTimeout(r, 0))
    expect(globalThis.__tauriMockWindow.maximize).toHaveBeenCalled()

    // Setup for true
    globalThis.__tauriMockWindow.isMaximized.mockResolvedValueOnce(true)
    await maximizeBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(globalThis.__tauriMockWindow.unmaximize).toHaveBeenCalled()
  })

  it('calls close when close button is clicked', async () => {
    const wrapper = mountApp()
    const closeBtn = wrapper.find('.win-btn.close')
    await closeBtn.trigger('click')
    expect(globalThis.__tauriMockWindow.close).toHaveBeenCalled()
  })

  it('persists main app width changes from the shared divider', async () => {
    const wrapper = mountApp()
    const store = usePreferenceStore()

    await wrapper.find('.win-btn[aria-label="Preferences"]').trigger('click')
    await wrapper.vm.$nextTick()

    const handle = wrapper.find('[data-testid="app-resize-handle"]')
    expect(handle.exists()).toBe(true)

    await handle.trigger('mousedown', { clientX: 800 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 760 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(store.get('display.mainAppWidth')).toBe(MAIN_APP_WIDTH_DEFAULT + 40)

    await new Promise((resolve) => setTimeout(resolve, 300))
    const savedSnapshot = JSON.parse(localStorage.getItem('popper.preferences'))
    expect(savedSnapshot.values['display.mainAppWidth']).toBe(MAIN_APP_WIDTH_DEFAULT + 40)
  })

  it('persists flyout width and height changes from the flyout border handles', async () => {
    const wrapper = mountApp()
    const store = usePreferenceStore()

    await wrapper.find('.win-btn[aria-label="Preferences"]').trigger('click')
    await wrapper.vm.$nextTick()

    const widthHandle = wrapper.find('[data-testid="flyout-outer-resize-handle"]')
    const heightHandle = wrapper.find('[data-testid="flyout-height-resize-handle"]')

    expect(widthHandle.exists()).toBe(true)
    expect(heightHandle.exists()).toBe(true)

    await widthHandle.trigger('mousedown', { clientX: 600 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 560 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    await heightHandle.trigger('mousedown', { clientY: 300 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 340 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(store.get('display.flyoutWidth.preferences')).toBe(FLYOUT_WIDTH_DEFAULT + 40)
    expect(store.get('display.flyoutHeight.preferences')).toBe(FLYOUT_HEIGHT_DEFAULT + 40)

    await new Promise((resolve) => setTimeout(resolve, 300))
    const savedSnapshot = JSON.parse(localStorage.getItem('popper.preferences'))
    expect(savedSnapshot.values['display.flyoutWidth.preferences']).toBe(FLYOUT_WIDTH_DEFAULT + 40)
    expect(savedSnapshot.values['display.flyoutHeight.preferences']).toBe(FLYOUT_HEIGHT_DEFAULT + 40)
  })

  it('persists zone section height changes from the section dividers', async () => {
    const wrapper = mountApp()
    const store = usePreferenceStore()

    const handle = wrapper.find('[data-testid="zone-resize-handle-2-3"]')
    expect(handle.exists()).toBe(true)

    await handle.trigger('mousedown', { clientY: 200 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 240 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(store.get('display.zoneHeight.zone2')).toBeCloseTo(1.2)
    expect(store.get('display.zoneHeight.zone3')).toBeCloseTo(0.52)

    await new Promise((resolve) => setTimeout(resolve, 300))
    const savedSnapshot = JSON.parse(localStorage.getItem('popper.preferences'))
    expect(savedSnapshot.values['display.zoneHeight.zone2']).toBeCloseTo(1.2)
    expect(savedSnapshot.values['display.zoneHeight.zone3']).toBeCloseTo(0.52)
  })

  it('resizes correctly when snapped left and the flyout is forced to the right side', async () => {
    const store = usePreferenceStore()
    store.batchSet(
      {
        'display.screenAnchor': 'left',
        'display.snapToScreenEdge': true,
        'display.flyoutSide': 'left',
      },
      'display',
    )

    const wrapper = mountApp()

    await wrapper.find('.win-btn[aria-label="Preferences"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.window-root').classes()).toContain('anchor-left')
    expect(wrapper.find('.window-root').classes()).toContain('flyout-on-right')

    const mainHandle = wrapper.find('[data-testid="app-resize-handle"]')
    const widthHandle = wrapper.find('[data-testid="flyout-outer-resize-handle"]')

    await mainHandle.trigger('mousedown', { clientX: 600 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 640 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    await widthHandle.trigger('mousedown', { clientX: 700 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 740 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(store.get('display.mainAppWidth')).toBe(MAIN_APP_WIDTH_DEFAULT + 40)
    expect(store.get('display.flyoutWidth.preferences')).toBe(FLYOUT_WIDTH_DEFAULT + 40)
  })

  it('only honors the user-selected flyout side when snap-to-edge is off', async () => {
    const store = usePreferenceStore()
    store.batchSet(
      {
        'display.screenAnchor': 'left',
        'display.snapToScreenEdge': false,
        'display.flyoutSide': 'left',
      },
      'display',
    )

    const wrapper = mountApp()
    await wrapper.find('.win-btn[aria-label="Preferences"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.window-root').classes()).toContain('anchor-left')
    expect(wrapper.find('.window-root').classes()).toContain('flyout-on-left')
    expect(wrapper.find('.window-root').classes()).not.toContain('flyout-on-right')
  })

  it('calls startDragging when mousedown occurs on a drag region', async () => {
    const wrapper = mountApp()
    const dragElements = wrapper.findAll('[data-tauri-drag-region]')
    expect(dragElements.length).toBeGreaterThan(0)
    
    await dragElements[0].trigger('mousedown')
    expect(globalThis.__tauriMockWindow.startDragging).toHaveBeenCalled()
  })

  it('starts hidden by default when auto-hide is enabled on an edge anchor', async () => {
    const wrapper = mountApp()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const root = wrapper.find('.window-root')
    expect(root.classes()).toContain('auto-hide-enabled')
    expect(root.classes()).toContain('is-hidden')
    expect(globalThis.__tauriMockWindow.setSize).toHaveBeenCalled()
  })

  it('reveals after pointer dwell on the hidden edge sensor', async () => {
    vi.useFakeTimers()

    try {
      const wrapper = mountApp()
      await Promise.resolve()

      const root = wrapper.find('.window-root')
      expect(root.classes()).toContain('is-hidden')

      await root.trigger('mouseenter')
      await root.trigger('mousemove')
      await vi.advanceTimersByTimeAsync(400)
      await wrapper.vm.$nextTick()

      expect(root.classes()).toContain('is-revealed')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reveals and focuses the app when the registered global shortcut fires', async () => {
    const wrapper = mountApp()
    await new Promise((resolve) => setTimeout(resolve, 0))

    const shortcutEntries = [...globalThis.__tauriGlobalShortcutState.handlers.entries()]
    const shortcutEntry = shortcutEntries.find(([shortcut]) =>
      shortcut === 'Ctrl+Shift+Space' || shortcut === 'Control+Shift+Space',
    )

    expect(shortcutEntry).toBeTruthy()

    const handler = shortcutEntry?.[1]
    expect(typeof handler).toBe('function')

    await handler()
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(wrapper.find('.window-root').classes()).toContain('is-revealed')
    expect(globalThis.__tauriMockWindow.setFocus).toHaveBeenCalled()
  })
})
