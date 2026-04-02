// Pinia store for current values, saved state animation, dirty flags, hydration, reset logic, and debounced persistence.

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { preferenceDefaults } from '@/data/preferences/preference.defaults'
import { preferenceRegistry } from '@/data/preferences/preference.registry'
import { usePreferenceSavedState } from '@/composables/preferences/usePreferenceSavedState'
import {
  loadPreferenceSnapshot,
  savePreferenceBackup,
  savePreferenceSnapshot,
} from '@/utils/preferences/preferencePersistence'
import { sanitizePreferenceValue } from '@/utils/preferences/preferenceValidation'

import type {
  PreferenceControlType,
  PreferenceDefinition,
  PreferenceTabId,
  PreferenceValue,
} from '@/types/preference.types'

const BUFFERED_CONTROL_TYPES: PreferenceControlType[] = [
  'slider',
  'hotkey',
  'text',
  'multiselect',
  'list-manager',
  'number',
]

const SAVE_BUFFER_MS = 250

function cloneDefaults(): Record<string, PreferenceValue> {
  return structuredClone(preferenceDefaults)
}

export const usePreferenceStore = defineStore('preference', () => {
  const values = ref<Record<string, PreferenceValue>>(cloneDefaults())
  const hydrated = ref(false)
  const saving = ref(false)
  const lastSavedAt = ref<string | null>(null)
  const activeTab = ref<PreferenceTabId>('profile')

  const { savedTabs, pulseSaved } = usePreferenceSavedState()

  const definitionsById = computed<Record<string, PreferenceDefinition>>(() =>
    Object.fromEntries(
      preferenceRegistry.settings.map((setting) => [setting.id, setting]),
    ),
  )

  const isLoaded = computed(() => hydrated.value)

  const bufferedTimers = new Map<string, number>()

  function getBackupCount(): number {
    const raw = values.value['dataPrivacy.keepBackupCount']
    return typeof raw === 'number' ? raw : 10
  }

  function persist(tabId?: PreferenceTabId) {
    saving.value = true

    try {
      const snapshot = savePreferenceSnapshot(values.value)
      lastSavedAt.value = snapshot.updatedAt

      if (tabId) {
        pulseSaved(tabId)
      }
    } finally {
      saving.value = false
    }
  }

  function bufferPersist(settingId: string, tabId?: PreferenceTabId) {
    const existing = bufferedTimers.get(settingId)
    if (existing) {
      window.clearTimeout(existing)
    }

    const timeoutId = window.setTimeout(() => {
      bufferedTimers.delete(settingId)
      persist(tabId)
    }, SAVE_BUFFER_MS)

    bufferedTimers.set(settingId, timeoutId)
  }

  function flushBuffered(tabId?: PreferenceTabId) {
    for (const timeoutId of bufferedTimers.values()) {
      window.clearTimeout(timeoutId)
    }

    bufferedTimers.clear()
    persist(tabId)
  }

  function hydrate() {
    const localSnapshot = loadPreferenceSnapshot()

    if (!localSnapshot?.values) {
      values.value = cloneDefaults()
      hydrated.value = true
      return
    }

    const nextValues = cloneDefaults()

    for (const setting of preferenceRegistry.settings) {
      const rawValue = localSnapshot.values[setting.id]
      if (rawValue === undefined) continue

      nextValues[setting.id] = sanitizePreferenceValue(setting, rawValue)
    }

    values.value = nextValues
    lastSavedAt.value = localSnapshot.updatedAt
    hydrated.value = true
  }

  function getValue<T extends PreferenceValue = PreferenceValue>(settingId: string): T {
    return values.value[settingId] as T
  }

  function get(settingId: string): PreferenceValue {
    return values.value[settingId]
  }

  function setValue(settingId: string, nextValue: PreferenceValue) {
    const definition = definitionsById.value[settingId]
    if (!definition) return
    if (definition.controlType === 'action') return

    const sanitized = sanitizePreferenceValue(definition, nextValue)
    values.value[settingId] = sanitized

    if (BUFFERED_CONTROL_TYPES.includes(definition.controlType)) {
      bufferPersist(settingId, definition.tab)
      return
    }

    persist(definition.tab)
  }

  function set(settingId: string, nextValue: PreferenceValue) {
    setValue(settingId, nextValue)
  }

  function batchSet(
    updates: Record<string, PreferenceValue>,
    tabId?: PreferenceTabId,
  ) {
    for (const [settingId, nextValue] of Object.entries(updates)) {
      const definition = definitionsById.value[settingId]
      if (!definition || definition.controlType === 'action') continue

      values.value[settingId] = sanitizePreferenceValue(definition, nextValue)
    }

    persist(tabId ?? activeTab.value)
  }

  function resetSetting(settingId: string) {
    const definition = definitionsById.value[settingId]
    if (!definition) return

    values.value[settingId] = structuredClone(definition.defaultValue)
    persist(definition.tab)
  }

  function resetToDefaults() {
    resetAll()
  }

  function resetAll() {
    savePreferenceBackup(values.value, 'pre-reset', getBackupCount())
    values.value = cloneDefaults()
    flushBuffered(activeTab.value)
  }

  function createBackup(
    reason: 'manual' | 'scheduled' | 'pre-import' | 'pre-reset' | 'migration' = 'manual',
  ) {
    return savePreferenceBackup(values.value, reason, getBackupCount())
  }

  function importValues(importedValues: Record<string, PreferenceValue>) {
    savePreferenceBackup(values.value, 'pre-import', getBackupCount())

    const nextValues = cloneDefaults()

    for (const setting of preferenceRegistry.settings) {
      const rawValue = importedValues[setting.id]
      if (rawValue === undefined) continue

      nextValues[setting.id] = sanitizePreferenceValue(setting, rawValue)
    }

    values.value = nextValues
    flushBuffered(activeTab.value)
  }

  function setActiveTab(tabId: PreferenceTabId) {
    activeTab.value = tabId
  }

  function getDefinition(settingId: string): PreferenceDefinition | undefined {
    return definitionsById.value[settingId]
  }

  return {
    values,
    hydrated,
    isLoaded,
    saving,
    lastSavedAt,
    activeTab,
    savedTabs,

    hydrate,
    getValue,
    get,
    setValue,
    set,
    batchSet,
    resetSetting,
    resetToDefaults,
    resetAll,
    createBackup,
    importValues,
    setActiveTab,
    flushBuffered,
    getDefinition,
  }
})