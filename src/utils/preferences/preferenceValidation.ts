// Validation and sanitization for imported or restored settings.

import type {
  PreferenceDefinition,
  PreferenceValidationRule,
  PreferenceValue,
} from '@/types/preference.types'

function matchesType(controlType: PreferenceDefinition['controlType'], value: PreferenceValue): boolean {
  switch (controlType) {
    case 'toggle':
      return typeof value === 'boolean'

    case 'slider':
    case 'number':
      return typeof value === 'number'

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
    if (typeof value !== 'number') return definition.defaultValue

    const min = definition.ui?.min
    const max = definition.ui?.max

    let next = value
    if (typeof min === 'number') next = Math.max(min, next)
    if (typeof max === 'number') next = Math.min(max, next)

    return next
  }

  if (
    (definition.controlType === 'single-select' || definition.controlType === 'segmented-choice') &&
    typeof value === 'string' &&
    definition.ui?.options?.length
  ) {
    const allowed = definition.ui.options.map((option) => option.value)
    return allowed.includes(value) ? value : definition.defaultValue
  }

  if (
    (definition.controlType === 'multiselect' || definition.controlType === 'list-manager') &&
    Array.isArray(value)
  ) {
    return value.filter((item) => typeof item === 'string')
  }

  if (definition.validation?.length && !validatePreferenceValue(definition, value)) {
    return definition.defaultValue
  }

  return value
}