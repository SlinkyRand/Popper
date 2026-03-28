import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../stores/gameStore'

describe('gameStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGameStore()
  })

  // ─── Initial state ────────────────────────────────────────────
  it('initializes with 16 buttons, only index 0 is up', () => {
    expect(store.buttons).toHaveLength(16)
    expect(store.buttons[0]).toBe(true)
    expect(store.buttons.filter(Boolean)).toHaveLength(1)
  })

  // ─── Core popRandom behavior ──────────────────────────────────
  it('popRandom sets clicked button down and pops a different one up', () => {
    store.popRandom(0)

    // The clicked button must be down
    expect(store.buttons[0]).toBe(false)
    // Exactly one button should be up
    expect(store.buttons.filter(Boolean)).toHaveLength(1)
    // The new up-button must differ from the clicked index
    const upIndex = store.buttons.indexOf(true)
    expect(upIndex).not.toBe(0)
  })

  it('ignores clicks on buttons that are already down', () => {
    // Button 5 starts down
    const snapshotBefore = [...store.buttons]
    store.popRandom(5)
    expect(store.buttons).toEqual(snapshotBefore)
  })

  it('always picks a different button (statistical check over 50 pops)', () => {
    for (let i = 0; i < 50; i++) {
      const upIndex = store.buttons.indexOf(true)
      store.popRandom(upIndex)
      const newUp = store.buttons.indexOf(true)
      expect(newUp).not.toBe(upIndex)
    }
  })

  it('never leaves zero or more than one button up', () => {
    for (let i = 0; i < 30; i++) {
      const upIndex = store.buttons.indexOf(true)
      store.popRandom(upIndex)
      const upCount = store.buttons.filter(Boolean).length
      expect(upCount).toBe(1)
    }
  })

  // ─── Edge cases ───────────────────────────────────────────────
  it('handles rapid successive pops gracefully', () => {
    for (let i = 0; i < 100; i++) {
      const upIndex = store.buttons.indexOf(true)
      store.popRandom(upIndex)
    }
    expect(store.buttons.filter(Boolean)).toHaveLength(1)
  })

  it('does nothing if an out-of-bounds button is "clicked" (no up button)', () => {
    // Clicking index that's not up – should be a no-op
    store.popRandom(15)
    expect(store.buttons[0]).toBe(true) // original still up
    expect(store.buttons.filter(Boolean)).toHaveLength(1)
  })

  // ─── Performance ──────────────────────────────────────────────
  it('popRandom completes 10,000 pops in under 500ms', () => {
    const start = performance.now()
    for (let i = 0; i < 10_000; i++) {
      const upIndex = store.buttons.indexOf(true)
      store.popRandom(upIndex)
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
    console.log(`  ⏱  10,000 pops: ${elapsed.toFixed(2)}ms`)
  })
})
