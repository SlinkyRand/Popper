import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'
import { useGameStore } from '../stores/gameStore'

describe('App.vue', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    // Reset mock calls
    globalThis.__tauriMockWindow.setShadow.mockClear()
  })

  function mountApp() {
    return mount(App, {
      global: {
        plugins: [pinia],
        stubs: {
          img: { template: '<span class="stub-img"></span>' }
        }
      },
    })
  }

  // ─── Mounting ─────────────────────────────────────────────────
  it('mounts without runtime errors', () => {
    const wrapper = mountApp()
    expect(wrapper.vm).toBeTruthy()
  })

  it('calls setShadow(true) on mount', async () => {
    mountApp()
    // onMounted runs asynchronously, flush
    await vi.dynamicImportSettled()
    // Wait a tick for the async onMounted to resolve
    await new Promise((r) => setTimeout(r, 0))
    expect(globalThis.__tauriMockWindow.setShadow).toHaveBeenCalledWith(true)
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

  it('calls startDragging when mousedown occurs on a drag region', async () => {
    const wrapper = mountApp()
    const dragElements = wrapper.findAll('[data-tauri-drag-region]')
    expect(dragElements.length).toBeGreaterThan(0)
    
    await dragElements[0].trigger('mousedown')
    expect(globalThis.__tauriMockWindow.startDragging).toHaveBeenCalled()
  })
})
