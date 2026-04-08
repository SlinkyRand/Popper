// Validation and sanitization for imported or restored settings.

import type {
  PreferenceDefinition,
  PreferenceValidationRule,
  PreferenceValue,
  PreferenceSnapshot,
} from '@/types/preference.types'
import { preferenceRegistry } from '@/data/preferences/preference.registry'

function matchesType(
  controlType: PreferenceDefinition['controlType'],
  value: PreferenceValue,
): boolean {
  switch (controlType) {
    case 'toggle':
      return typeof value === 'boolean'

    case 'slider':
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)

    case 'text':
    case 'single-select':
    case 'segmented-choice':
    case 'hotkey':
      return typeof value === 'string'

    case 'multiselect':
    case 'list-manager':
      return Array.isArray(value) && value.every((item) => typeof item === 'string')

    case 'action':
      return value === null

    default:
      return true
  }
}

function passesRule(value: PreferenceValue, rule: PreferenceValidationRule): boolean {
  if (rule.type === 'required') {
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return value !== null && value !== undefined
  }

  if (rule.type === 'min' && typeof value === 'number' && typeof rule.value === 'number') {
    return value >= rule.value
  }

  if (rule.type === 'max' && typeof value === 'number' && typeof rule.value === 'number') {
    return value <= rule.value
  }

  if (rule.type === 'pattern' && typeof value === 'string' && rule.value instanceof RegExp) {
    return rule.value.test(value)
  }

  return true
}

export function validatePreferenceValue(
  definition: PreferenceDefinition,
  value: PreferenceValue,
): boolean {
  if (!matchesType(definition.controlType, value)) return false

  if (!definition.validation?.length) return true

  return definition.validation.every((rule) => passesRule(value, rule))
}

export function sanitizePreferenceValue(
  definition: PreferenceDefinition,
  value: PreferenceValue,
): PreferenceValue {
  if (!matchesType(definition.controlType, value)) {
    return definition.defaultValue
  }

  if (definition.controlType === 'slider' || definition.controlType === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return definition.defaultValue
    }

    const min = definition.ui?.min
    // Read max through a getter call if present, so it reflects monitor-aware
    // bounds that may not be known at module-load time.
    const max = typeof definition.ui?.max === 'number' ? definition.ui.max : undefined

    let next = value
    if (typeof min === 'number') next = Math.max(min, next)
    if (typeof max === 'number') next = Math.min(max, next)

    return next
  }

  if (
    (definition.controlType === 'single-select' ||
      definition.controlType === 'segmented-choice') &&
    typeof value === 'string' &&
    definition.ui?.options?.length
  ) {
    const allowed = definition.ui.options.map((option) => option.value)
    return allowed.includes(value) ? value : definition.defaultValue
  }

  if (definition.controlType === 'multiselect' && Array.isArray(value)) {
    const allowed = definition.ui?.options?.map((option) => option.value) ?? []
    return value.filter(
      (item): item is string =>
        typeof item === 'string' && (allowed.length === 0 || allowed.includes(item)),
    )
  }

  if (definition.controlType === 'list-manager' && Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (definition.validation?.length && !validatePreferenceValue(definition, value)) {
    return definition.defaultValue
  }

  return value
}

export function sanitizeImportedPreferenceValues(
  snapshot: PreferenceSnapshot | null,
): Record<string, PreferenceValue> | null {
  if (!snapshot?.values || typeof snapshot.values !== 'object') {
    return null
  }

  const sanitized: Record<string, PreferenceValue> = {}

  for (const setting of preferenceRegistry.settings) {
    const rawValue = snapshot.values[setting.id]
    if (rawValue === undefined) continue

    sanitized[setting.id] = sanitizePreferenceValue(setting, rawValue)
  }

  return sanitized
}