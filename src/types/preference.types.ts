// Holds all shared types and interfaces. This is the backbone of our preferences system.

export type PreferenceTabId =
  | 'profile'
  | 'coreContent'
  | 'display'
  | 'wizards'
  | 'divider-system'
  | 'hotkeys'
  | 'dataPrivacy'
  | 'notifications'
  | 'advanced'
  | 'about'
  | 'halp'

export type PreferenceSectionId = string

export type PreferenceControlType =
  | 'toggle'
  | 'single-select'
  | 'segmented-choice'
  | 'slider'
  | 'hotkey'
  | 'multiselect'
  | 'list-manager'
  | 'number'
  | 'text'
  | 'action'

export type PreferenceSyncPolicy =
  | 'syncable'
  | 'local-only'
  | 'device-only'

export type PreferenceConflictStrategy =
  | 'prefer-local'
  | 'prefer-newest'
  | 'manual'

export type PreferenceValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | null

export interface PreferenceOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface PreferenceValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: string | number | RegExp
  message: string
}

export interface PreferenceUiMeta {
  placeholder?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: PreferenceOption[]
  confirmRequired?: boolean
  danger?: boolean
  helpText?: string
}

export interface PreferenceDefinition {
  id: string
  version: number
  tab: Exclude<PreferenceTabId, 'divider-system'>
  section: PreferenceSectionId
  label: string
  description?: string
  controlType: PreferenceControlType
  defaultValue: PreferenceValue
  syncPolicy: PreferenceSyncPolicy
  privacyModeDefault?: boolean
  conflictStrategy?: PreferenceConflictStrategy
  validation?: PreferenceValidationRule[]
  ui?: PreferenceUiMeta
}

export interface PreferenceSectionDefinition {
  id: PreferenceSectionId
  title: string
  description?: string
}

export interface PreferenceTabDefinition {
  id: PreferenceTabId
  label: string
  icon?: string
  kind: 'tab' | 'divider'
  description?: string
  powerUser?: boolean
}

export interface PreferenceRegistry {
  tabs: PreferenceTabDefinition[]
  sections: Record<string, PreferenceSectionDefinition[]>
  settings: PreferenceDefinition[]
}

export interface PreferenceSnapshot {
  schemaVersion: number
  updatedAt: string
  values: Record<string, PreferenceValue>
}

export interface PreferenceBackupSnapshot extends PreferenceSnapshot {
  backupId: string
  reason: 'manual' | 'scheduled' | 'pre-import' | 'pre-reset' | 'migration'
}

export interface PreferenceSavedStateMap {
  [tabId: string]: boolean
}