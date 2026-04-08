export const MAIN_APP_WIDTH_DEFAULT = 330
export const MAIN_APP_WIDTH_MIN = 150

export const FLYOUT_WIDTH_DEFAULT = 540
export const FLYOUT_WIDTH_MIN = 100

export const FLYOUT_HEIGHT_DEFAULT = 100
export const FLYOUT_HEIGHT_MIN = 100

export const PREFERENCES_FLYOUT_WIDTH_DEFAULT = 780
export const PREFERENCES_FLYOUT_HEIGHT_DEFAULT = 600
export const PREFERENCES_FLYOUT_WIDTH_MIN = 480

type DisplayBoundsOverride = {
  width: number | null
  height: number | null
}

const displayBoundsOverride: DisplayBoundsOverride = {
  width: null,
  height: null,
}

export function setDisplayBoundsOverride(bounds: Partial<DisplayBoundsOverride>) {
  if (typeof bounds.width === 'number' && Number.isFinite(bounds.width) && bounds.width > 0) {
    displayBoundsOverride.width = bounds.width
  }

  if (typeof bounds.height === 'number' && Number.isFinite(bounds.height) && bounds.height > 0) {
    displayBoundsOverride.height = bounds.height
  }
}

export function clearDisplayBoundsOverride() {
  displayBoundsOverride.width = null
  displayBoundsOverride.height = null
}

function getViewportWidth(): number {
  return displayBoundsOverride.width || window.innerWidth || document.documentElement.clientWidth || 1440
}

function getViewportHeight(): number {
  return displayBoundsOverride.height || window.innerHeight || document.documentElement.clientHeight || 860
}

export function getMainAppWidthMax(): number {
  return Math.max(MAIN_APP_WIDTH_MIN, Math.floor(getViewportWidth() * 0.9))
}

export function getFlyoutWidthMax(): number {
  return Math.max(FLYOUT_WIDTH_MIN, Math.floor(getViewportWidth() * 0.85))
}

export function getPreferencesFlyoutWidthMax(): number {
  return Math.max(PREFERENCES_FLYOUT_WIDTH_MIN, Math.floor(getViewportWidth() * 0.85))
}

export function getFlyoutHeightMax(): number {
  return Math.max(FLYOUT_HEIGHT_MIN, Math.floor(getViewportHeight() * 0.95))
}