// Registry of default values for preferences.

import { preferenceRegistry } from './preference.registry'
import type { PreferenceValue } from '@/types/preference.types'

export const preferenceDefaults: Record<string, PreferenceValue> =
  Object.fromEntries(
    preferenceRegistry.settings.map((setting) => [setting.id, setting.defaultValue])
  )