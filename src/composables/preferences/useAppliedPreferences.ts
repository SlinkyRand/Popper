/* Takes stored preference values and applies them to the live app environment */

import { computed, watchEffect } from 'vue'
import { usePreferenceStore } from '@/stores/preferenceStore'
import {
  FLYOUT_WIDTH_DEFAULT,
  MAIN_APP_WIDTH_DEFAULT,
} from '@/data/preferences/preference.constants'

export function useAppliedPreferences() {
  const store = usePreferenceStore()

  const themeMode = computed(() => String(store.get('display.themeMode') ?? 'system'))
  const translucencyStrength = computed(() => Number(store.get('display.translucencyStrength') ?? 72))
  const backgroundIntensity = computed(() => Number(store.get('display.backgroundIntensity') ?? 65))
  const animationIntensity = computed(() => Number(store.get('display.animationIntensity') ?? 70))
  const uiDensity = computed(() => String(store.get('display.uiDensity') ?? 'cozy'))
  const mainAppWidth = computed(() =>
    Number(store.get('display.mainAppWidth') ?? MAIN_APP_WIDTH_DEFAULT),
  )
  const flyoutWidth = computed(() =>
    Number(store.get('display.flyoutWidth') ?? FLYOUT_WIDTH_DEFAULT),
  )
  const sidebarCollapsedByDefault = computed(() =>
    Boolean(store.get('display.sidebarCollapsedByDefault') ?? false),
  )
  const autoHide = computed(() => Boolean(store.get('display.autoHide') ?? true))
  const edgeTriggerDelay = computed(() => Number(store.get('display.edgeTriggerDelay') ?? 400))
  const hideGracePeriod = computed(() => Number(store.get('display.hideGracePeriod') ?? 4000))
  const wallpaperSync = computed(() => Boolean(store.get('display.wallpaperSync') ?? true))
  const reducedMotion = computed(() => Boolean(store.get('display.reducedMotion') ?? false))

  watchEffect(() => {
    const root = document.documentElement

    root.dataset.themeMode = themeMode.value
    root.dataset.uiDensity = uiDensity.value
    root.dataset.wallpaperSync = String(wallpaperSync.value)
    root.dataset.reducedMotion = String(reducedMotion.value)
    root.dataset.sidebarCollapsedDefault = String(sidebarCollapsedByDefault.value)

    root.style.setProperty('--pref-translucency-strength', `${translucencyStrength.value}`)
    root.style.setProperty('--pref-background-intensity', `${backgroundIntensity.value}`)
    root.style.setProperty('--pref-animation-intensity', `${animationIntensity.value}`)
    root.style.setProperty('--pref-main-app-width', `${mainAppWidth.value}px`)
    root.style.setProperty('--pref-flyout-width', `${flyoutWidth.value}px`)
  })

  return {
    themeMode,
    translucencyStrength,
    backgroundIntensity,
    animationIntensity,
    uiDensity,
    mainAppWidth,
    flyoutWidth,
    sidebarCollapsedByDefault,
    autoHide,
    edgeTriggerDelay,
    hideGracePeriod,
    wallpaperSync,
    reducedMotion,
  }
}