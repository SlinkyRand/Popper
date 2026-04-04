// Local-first save/load layer. Writes robustly offline first.

import type {
  PreferenceBackupSnapshot,
  PreferenceSnapshot,
  PreferenceValue,
} from '@/types/preference.types'

const PREFERENCE_STORAGE_KEY = 'popper.preferences'
const PREFERENCE_BACKUP_STORAGE_KEY = 'popper.preferences.backups'
const CURRENT_SCHEMA_VERSION = 1
const MAX_BACKUPS_FALLBACK = 10

function nowIso(): string {
  return new Date().toISOString()
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function clonePreferenceValues(
  values: Record<string, PreferenceValue>,
): Record<string, PreferenceValue> {
  return JSON.parse(JSON.stringify(values)) as Record<string, PreferenceValue>
}

export function buildPreferenceSnapshot(
  values: Record<string, PreferenceValue>,
): PreferenceSnapshot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: nowIso(),
    values: clonePreferenceValues(values),
  }
}

export function loadPreferenceSnapshot(): PreferenceSnapshot | null {
  return safeParse<PreferenceSnapshot>(
    localStorage.getItem(PREFERENCE_STORAGE_KEY),
  )
}

export function savePreferenceSnapshot(
  values: Record<string, PreferenceValue>,
): PreferenceSnapshot {
  const snapshot = buildPreferenceSnapshot(values)
  localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(snapshot))
  return snapshot
}

export function loadPreferenceBackups(): PreferenceBackupSnapshot[] {
  return (
    safeParse<PreferenceBackupSnapshot[]>(
      localStorage.getItem(PREFERENCE_BACKUP_STORAGE_KEY),
    ) ?? []
  )
}

export function savePreferenceBackup(
  values: Record<string, PreferenceValue>,
  reason: PreferenceBackupSnapshot['reason'],
  keepCount = MAX_BACKUPS_FALLBACK,
): PreferenceBackupSnapshot[] {
  const currentBackups = loadPreferenceBackups()

  const backup: PreferenceBackupSnapshot = {
    backupId: crypto.randomUUID(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: nowIso(),
    reason,
    values: clonePreferenceValues(values),
  }

  const nextBackups = [backup, ...currentBackups].slice(0, keepCount)
  localStorage.setItem(
    PREFERENCE_BACKUP_STORAGE_KEY,
    JSON.stringify(nextBackups),
  )

  return nextBackups
}

export function clearPreferenceStorage(): void {
  localStorage.removeItem(PREFERENCE_STORAGE_KEY)
}

export function clearPreferenceBackups(): void {
  localStorage.removeItem(PREFERENCE_BACKUP_STORAGE_KEY)
}

export function exportPreferenceSnapshot(
  values: Record<string, PreferenceValue>,
): string {
  return JSON.stringify(buildPreferenceSnapshot(values), null, 2)
}