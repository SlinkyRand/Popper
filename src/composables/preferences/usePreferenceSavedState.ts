// Handles the small “Saved” animation state by tab.

import { ref } from 'vue'
import type { PreferenceSavedStateMap, PreferenceTabId } from '@/types/preference.types'

const DEFAULT_DURATION_MS = 1200

export function usePreferenceSavedState() {
  const savedTabs = ref<PreferenceSavedStateMap>({})
  const timeouts = new Map<string, number>()

  function pulseSaved(tabId: PreferenceTabId, durationMs = DEFAULT_DURATION_MS) {
    savedTabs.value[tabId] = true

    const existing = timeouts.get(tabId)
    if (existing) {
      window.clearTimeout(existing)
    }

    const timeoutId = window.setTimeout(() => {
      savedTabs.value[tabId] = false
      timeouts.delete(tabId)
    }, durationMs)

    timeouts.set(tabId, timeoutId)
  }

  function isSaved(tabId: PreferenceTabId): boolean {
    return Boolean(savedTabs.value[tabId])
  }

  return {
    savedTabs,
    pulseSaved,
    isSaved,
  }
}