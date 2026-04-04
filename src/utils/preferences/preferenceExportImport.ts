// Handles export, import, backup selection, and restore helper logic.

import {
  exportPreferenceSnapshot,
  loadPreferenceBackups,
} from '@/utils/preferences/preferencePersistence'

import type {
  PreferenceBackupSnapshot,
  PreferenceSnapshot,
  PreferenceValue,
} from '@/types/preference.types'

function downloadTextFile(contents: string, filename: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPreferenceSnapshot(value: unknown): value is PreferenceSnapshot {
  if (!isRecord(value)) return false
  if (typeof value.schemaVersion !== 'number') return false
  if (typeof value.updatedAt !== 'string') return false
  if (!isRecord(value.values)) return false
  return true
}

export function downloadPreferenceExport(
  values: Record<string, PreferenceValue>,
): void {
  const contents = exportPreferenceSnapshot(values)
  downloadTextFile(contents, 'popper-preferences.json', 'application/json')
}

export async function importPreferenceFile(): Promise<PreferenceSnapshot | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const text = await file.text()
        const parsed: unknown = JSON.parse(text)

        if (!isPreferenceSnapshot(parsed)) {
          resolve(null)
          return
        }

        resolve(parsed)
      } catch {
        resolve(null)
      }
    }

    input.click()
  })
}

export async function choosePreferenceBackup(): Promise<PreferenceBackupSnapshot | null> {
  const backups = loadPreferenceBackups()
  if (!backups.length) return null

  const choices = backups
    .map((backup, index) => {
      const timestamp = new Date(backup.updatedAt).toLocaleString()
      return `${index + 1}. ${backup.reason} — ${timestamp}`
    })
    .join('\n')

  const raw = window.prompt(
    `Restore which backup?\n\n${choices}\n\nEnter a number:`,
    '1',
  )

  if (!raw) return null

  const selectedIndex = Number.parseInt(raw, 10) - 1
  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= backups.length
  ) {
    return null
  }

  return backups[selectedIndex] ?? null
}