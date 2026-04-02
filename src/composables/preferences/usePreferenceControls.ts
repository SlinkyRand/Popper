// Shared control helpers for rendering and metadata lookup.

import { computed } from 'vue'
import { usePreferenceStore } from '@/stores/preferenceStore'
import { preferenceRegistry } from '@/data/preferences/preference.registry'
import type {
  PreferenceDefinition,
  PreferenceSectionDefinition,
  PreferenceTabDefinition,
  PreferenceTabId,
} from '@/types/preference.types'

export function usePreferenceControls() {
  const tabs = computed<PreferenceTabDefinition[]>(() => preferenceRegistry.tabs)
  const store = usePreferenceStore()

  function getTab(tabId: PreferenceTabId): PreferenceTabDefinition | undefined {
    return preferenceRegistry.tabs.find((tab) => tab.id === tabId)
  }

  function getSections(tabId: string): PreferenceSectionDefinition[] {
    return preferenceRegistry.sections[tabId] ?? []
  }

  function getSettingsForTab(tabId: string): PreferenceDefinition[] {
    return preferenceRegistry.settings.filter((setting) => setting.tab === tabId)
  }

  function getSettingsForSection(tabId: string, sectionId: string): PreferenceDefinition[] {
    return preferenceRegistry.settings.filter(
      (setting) => setting.tab === tabId && setting.section === sectionId,
    )
  }

  function getSettingById(settingId: string): PreferenceDefinition | undefined {
    return preferenceRegistry.settings.find((setting) => setting.id === settingId)
  }

  function usePreference(id: string) {
    return computed({
      get: () => store.get(id),
      set: (val) => store.set(id, val),
    })
  }

  function commitNow() {
    return store.flushBuffered()
  }


  return {
    tabs,
    getTab,
    getSections,
    getSettingsForTab,
    getSettingsForSection,
    getSettingById,
    usePreference,
    commitNow,
    ready: computed(() => store.isLoaded),
    saving: computed(() => store.saving),
    lastSavedAt: computed(() => store.lastSavedAt),
    savedTabs: computed(() => store.savedTabs),
  }
}