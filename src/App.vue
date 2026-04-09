<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'

import { useGameStore } from './stores/gameStore'
import { getPlatform } from './platform'
import { wallpaperPaletteState } from './lib/wallpaperPalette'
import FlyoutPanel from './components/FlyoutPanel.vue'
import { useFlyouts, type FlyoutId } from './composables/useFlyouts'
import PreferenceFlyout from '@/components/preferences/PreferenceFlyout.vue'
import { installMacAppMenu } from '@/lib/installMacAppMenu'
import { usePreferenceStore } from '@/stores/preferenceStore'
import { useAppliedPreferences } from './composables/preferences/useAppliedPreferences'
import { useAutoHide } from './composables/useAutoHide'
import {
  FLYOUT_WIDTH_DEFAULT,
  FLYOUT_WIDTH_MIN,
  MAIN_APP_WIDTH_MIN,
  ZONE_HEIGHT_DEFAULTS,
  ZONE_HEIGHT_MIN_PX,
  getMainAppWidthMax,
  getFlyoutWidthMax,
  getFlyoutHeightMax,
  setDisplayBoundsOverride,
  clearDisplayBoundsOverride,
} from '@/data/preferences/preference.constants'
import {
  getFlyoutWidthPreferenceId,
  MAIN_APP_WIDTH_PREFERENCE_ID,
} from '@/lib/flyoutLayout'

const gameStore = useGameStore()
const preferenceStore = usePreferenceStore()
const appWindow = getCurrentWindow()
const platform = getPlatform()

const paletteHexes = wallpaperPaletteState.hexes
const roles = wallpaperPaletteState.roles
const isFallback = wallpaperPaletteState.isFallback
const isReady = wallpaperPaletteState.isReady

const gradientStyleVars = computed(() => ({
  '--wall-1': paletteHexes.value[0] ?? '#FF1744',
  '--wall-2': paletteHexes.value[1] ?? '#FF9100',
  '--wall-3': paletteHexes.value[2] ?? '#FFD600',
  '--wall-4': paletteHexes.value[3] ?? '#00E676',
  '--wall-5': paletteHexes.value[4] ?? '#00B0FF',
  '--wall-6': paletteHexes.value[5] ?? '#7C4DFF',

  '--wall-bg': roles.value.background,
  '--wall-surface': roles.value.surface,
  '--wall-accent': roles.value.accent,
  '--wall-accent-2': roles.value.accent2,
  '--wall-accent-soft': roles.value.accentSoft,
  '--wall-highlight': roles.value.highlight,
  '--wall-text': roles.value.text,
}))

const sparkleBurstKey = ref(0)
const showSparkles = ref(false)
const isLayoutReady = ref(false)

// Zone height resize state (zones 2–5, stored as flex-grow ratios)
const ZONE_HEIGHT_PREF_PREFIX = 'display.zoneHeight.'
const zoneHeights = ref<Record<string, number>>({ ...ZONE_HEIGHT_DEFAULTS })

function loadZoneHeights() {
  for (const zone of ['zone2', 'zone3', 'zone4', 'zone5']) {
    const saved = preferenceStore.get(`${ZONE_HEIGHT_PREF_PREFIX}${zone}`)
    if (typeof saved === 'number' && saved > 0) {
      zoneHeights.value[zone] = saved
    }
  }
}

let zoneResizeActiveHandle: string | null = null
let zoneResizeStartY = 0
let zoneResizeTopZone = ''
let zoneResizeBottomZone = ''
let zoneResizeTopStart = 0
let zoneResizeBottomStart = 0
let zoneResizeNextTop = 0
let zoneResizeNextBottom = 0
let zoneGhostTopEl: HTMLElement | null = null
let zoneGhostBottomEl: HTMLElement | null = null
let zoneGhostTopHeight = 0
let zoneGhostBottomHeight = 0
let zoneGhostTopY = 0
let zoneGhostBottomY = 0

function getZoneEl(zoneName: string): HTMLElement | null {
  const refs: Record<string, ReturnType<typeof ref>> = {
    zone2: zone2Ref,
    zone3: zone3Ref,
    zone4: zone4Ref,
  }
  // zone5 has no ref, find by class
  if (zoneName === 'zone5') {
    return windowRootRef.value?.querySelector('.zone-5') as HTMLElement | null
  }
  return refs[zoneName]?.value ?? null
}

function startZoneResize(topZone: string, bottomZone: string, event: MouseEvent) {
  zoneResizeActiveHandle = `${topZone}-${bottomZone}`
  zoneResizeStartY = event.clientY
  zoneResizeTopZone = topZone
  zoneResizeBottomZone = bottomZone
  zoneResizeTopStart = zoneHeights.value[topZone]
  zoneResizeBottomStart = zoneHeights.value[bottomZone]
  zoneResizeNextTop = zoneResizeTopStart
  zoneResizeNextBottom = zoneResizeBottomStart

  // Capture initial pixel heights for ghost positioning
  zoneGhostTopEl = getZoneEl(topZone)
  zoneGhostBottomEl = getZoneEl(bottomZone)
  if (zoneGhostTopEl && zoneGhostBottomEl) {
    const topRect = zoneGhostTopEl.getBoundingClientRect()
    const bottomRect = zoneGhostBottomEl.getBoundingClientRect()
    zoneGhostTopHeight = topRect.height
    zoneGhostBottomHeight = bottomRect.height
    zoneGhostTopY = topRect.top
    zoneGhostBottomY = bottomRect.top
    showGhostFromRect({ x: topRect.left, y: topRect.top, width: topRect.width, height: topRect.height })
  }

  window.addEventListener('mousemove', onZoneResize)
  window.addEventListener('mouseup', stopZoneResize)
  event.preventDefault()
  event.stopPropagation()
}

function onZoneResize(event: MouseEvent) {
  if (!zoneResizeActiveHandle) return

  const delta = event.clientY - zoneResizeStartY
  const ratioDelta = delta / 200

  zoneResizeNextTop = Math.max(ZONE_HEIGHT_MIN_PX / 200, zoneResizeTopStart + ratioDelta)
  zoneResizeNextBottom = Math.max(ZONE_HEIGHT_MIN_PX / 200, zoneResizeBottomStart - ratioDelta)

  // Move only the ghost — compute new pixel height proportionally
  if (zoneGhostTopEl && ghostRef.value) {
    const topRect = zoneGhostTopEl.getBoundingClientRect()
    const newTopHeight = zoneGhostTopHeight + delta
    showGhostFromRect({
      x: topRect.left,
      y: zoneGhostTopY,
      width: topRect.width,
      height: Math.max(ZONE_HEIGHT_MIN_PX, newTopHeight),
    })
  }
}

function stopZoneResize() {
  if (!zoneResizeActiveHandle) return
  window.removeEventListener('mousemove', onZoneResize)
  window.removeEventListener('mouseup', stopZoneResize)

  hideGhost()

  // Single reactive update → one re-render
  zoneHeights.value = {
    ...zoneHeights.value,
    [zoneResizeTopZone]: zoneResizeNextTop,
    [zoneResizeBottomZone]: zoneResizeNextBottom,
  }

  preferenceStore.set(`${ZONE_HEIGHT_PREF_PREFIX}${zoneResizeTopZone}`, zoneResizeNextTop)
  preferenceStore.set(`${ZONE_HEIGHT_PREF_PREFIX}${zoneResizeBottomZone}`, zoneResizeNextBottom)

  zoneResizeActiveHandle = null
  zoneGhostTopEl = null
  zoneGhostBottomEl = null
}

const layoutShellStyle = computed(() => ({
  '--zone2-grow': zoneHeights.value.zone2,
  '--zone3-grow': zoneHeights.value.zone3,
  '--zone4-grow': zoneHeights.value.zone4,
  '--zone5-grow': zoneHeights.value.zone5,
}))

const windowRootRef = ref<HTMLElement | null>(null)
const preferencesButtonRef = ref<HTMLElement | null>(null)
const zone2Ref = ref<HTMLElement | null>(null)
const zone3Ref = ref<HTMLElement | null>(null)
const zone4Ref = ref<HTMLElement | null>(null)
const counterRef = ref<HTMLElement | null>(null)

const { activeFlyout, closeFlyout, toggleFlyout, isOpen } = useFlyouts()
const { mainAppWidth, autoHide, edgeTriggerDelay, hideGracePeriod, reducedMotion } =
  useAppliedPreferences()

type FlyoutSide = 'left' | 'right'
type WindowAnchor = 'left' | 'right' | 'center'

type WorkAreaRect = {
  x: number
  y: number
  width: number
  height: number
}

const flyoutAnchors: Record<FlyoutId, typeof zone2Ref> = {
  zone2: zone2Ref,
  zone3: zone3Ref,
  zone4: zone4Ref,
  counter: counterRef,
  preferences: preferencesButtonRef,
}

function clampFlyoutWidth(value: number) {
  return Math.min(getFlyoutWidthMax(), Math.max(FLYOUT_WIDTH_MIN, value))
}

function getMainAppWidthCap() {
  if (!workAreaBounds.value) {
    return getMainAppWidthMax()
  }

  return Math.max(MAIN_APP_WIDTH_MIN, Math.floor(workAreaBounds.value.width - activeFlyoutOffset.value))
}

function clampMainAppWidth(value: number) {
  return Math.min(getMainAppWidthCap(), Math.max(MAIN_APP_WIDTH_MIN, value))
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getSavedFlyoutWidth(id: FlyoutId) {
  return clampFlyoutWidth(
    Number(
      preferenceStore.get(getFlyoutWidthPreferenceId(id)) ??
        preferenceStore.get('display.flyoutWidth') ??
        FLYOUT_WIDTH_DEFAULT,
    ),
  )
}

const snapToScreenEdge = computed(() =>
  Boolean(preferenceStore.get('display.snapToScreenEdge') ?? true),
)

const screenAnchorPreference = computed(() =>
  String(preferenceStore.get('display.screenAnchor') ?? 'right'),
)

const preferredFlyoutSide = computed(() => {
  const value = String(preferenceStore.get('display.flyoutSide') ?? 'auto')
  return value === 'left' || value === 'right' ? value : 'auto'
})

const effectiveWindowAnchor = computed<WindowAnchor>(() => {
  const anchor = screenAnchorPreference.value
  if (anchor === 'left' || anchor === 'right' || anchor === 'center') {
    return anchor
  }
  return 'right'
})

function getDefaultFlyoutSide(anchor: WindowAnchor): FlyoutSide {
  if (anchor === 'left') return 'right'
  return 'left'
}

const activeFlyoutSide = computed<FlyoutSide>(() => {
  if (snapToScreenEdge.value) {
    return getDefaultFlyoutSide(effectiveWindowAnchor.value)
  }

  if (preferredFlyoutSide.value === 'left' || preferredFlyoutSide.value === 'right') {
    return preferredFlyoutSide.value
  }

  return getDefaultFlyoutSide(effectiveWindowAnchor.value)
})

const flyoutGap = computed(() => (activeFlyout.value ? 8 : 0))

const activeFlyoutWidth = computed(() =>
  activeFlyout.value ? getSavedFlyoutWidth(activeFlyout.value) : 0,
)

const activeFlyoutOffset = computed(() =>
  activeFlyout.value ? activeFlyoutWidth.value + flyoutGap.value : 0,
)

const totalWindowWidth = computed(() =>
  clampMainAppWidth(mainAppWidth.value) + activeFlyoutOffset.value,
)

const enableGlobalHotkeys = computed(() =>
  Boolean(preferenceStore.get('hotkeys.enableGlobalHotkeys') ?? true),
)
const globalOpenAppHotkey = computed(() =>
  String(preferenceStore.get('hotkeys.globalOpenApp') ?? 'Ctrl+Shift+Space'),
)

const {
  sensorStripWidth,
  revealedGraceZoneWidth,
  isAutoHideEnabled,
  isRevealed,
  desiredWindowWidth,
  reveal,
  clearTimers: clearAutoHideTimers,
  handleMouseEnter: handleAutoHideMouseEnter,
  handleMouseMove: handleAutoHideMouseMove,
  handleMouseLeave: handleAutoHideMouseLeave,
} = useAutoHide({
  enabled: autoHide,
  anchor: effectiveWindowAnchor,
  edgeTriggerDelay,
  hideGracePeriod,
  totalWindowWidth,
})

const contentHorizontalOffset = computed(() =>
  isAutoHideEnabled.value && isRevealed.value && effectiveWindowAnchor.value === 'right'
    ? revealedGraceZoneWidth.value
    : 0,
)

const windowRootStyle = computed(() => ({
  ...gradientStyleVars.value,
  '--active-flyout-width': `${activeFlyoutWidth.value}px`,
  '--active-flyout-offset': `${activeFlyoutOffset.value}px`,
  '--flyout-gap': `${flyoutGap.value}px`,
  '--pref-main-app-width': `${clampMainAppWidth(mainAppWidth.value)}px`,
  '--window-frame-width': `${Math.round(desiredWindowWidth.value)}px`,
  '--total-window-width': `${Math.round(totalWindowWidth.value)}px`,
  '--auto-hide-sensor-width': `${sensorStripWidth.value}px`,
  '--revealed-grace-zone-width': `${revealedGraceZoneWidth.value}px`,
  '--content-horizontal-offset': `${contentHorizontalOffset.value}px`,
  '--auto-hide-duration': reducedMotion.value ? '0ms' : '360ms',
}))

const showMainResizeHandle = computed(() => !isAutoHideEnabled.value || isRevealed.value)
const hasActiveFlyout = computed(() => activeFlyout.value !== null)
const isFlyoutOnLeft = computed(() => hasActiveFlyout.value && activeFlyoutSide.value === 'left')
const workAreaBounds = ref<WorkAreaRect | null>(null)

let mainResizeStartX = 0
let mainResizeStartWidth = 0
let mainResizeCurrent = 0
let isMainResizing = false

// Fixed anchors captured at drag-start so the ghost expands from the correct edge
let ghostFixedLeft = 0    // used when growing rightward (left edge stays fixed)
let ghostFixedRight = 0   // used when growing leftward (right edge stays fixed)
let ghostFixedTop = 0
let ghostFixedHeight = 0

const ghostRef = ref<HTMLElement | null>(null)

function showGhostAnchored(width: number, growDirection: 'left' | 'right') {
  const el = ghostRef.value
  if (!el) return
  const x = growDirection === 'right'
    ? ghostFixedLeft                  // left edge fixed, grow rightward
    : ghostFixedRight - width         // right edge fixed, grow leftward
  el.style.left = `${x}px`
  el.style.top = `${ghostFixedTop}px`
  el.style.width = `${width}px`
  el.style.height = `${ghostFixedHeight}px`
  el.style.display = 'block'
}

function showGhostFromRect(rect: { x: number; y: number; width: number; height: number }) {
  const el = ghostRef.value
  if (!el) return
  el.style.left = `${rect.x}px`
  el.style.top = `${rect.y}px`
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
  el.style.display = 'block'
}

function hideGhost() {
  const el = ghostRef.value
  if (!el) return
  el.style.display = 'none'
}

let resizeTimeout: number | null = null
let unlockWorkAreaTimeout: number | null = null
let lockedWorkArea: WorkAreaRect | null = null

let lastWindowWidth: number | null = null
let lastWindowHeight: number | null = null
let lastWindowX: number | null = null
let lastWindowY: number | null = null

async function readCurrentWorkArea(): Promise<WorkAreaRect | null> {
  const monitor = await currentMonitor()
  if (!monitor) {
    workAreaBounds.value = null
    return null
  }

  const scale = monitor.scaleFactor
  const logicalSize = monitor.workArea.size.toLogical(scale)
  const logicalPos = monitor.workArea.position.toLogical(scale)

  const nextWorkArea = {
    x: logicalPos.x,
    y: logicalPos.y,
    width: logicalSize.width,
    height: logicalSize.height,
  }

  workAreaBounds.value = nextWorkArea
  setDisplayBoundsOverride({
    width: nextWorkArea.width,
    height: nextWorkArea.height,
  })

  return nextWorkArea
}

async function lockWorkAreaForInteraction() {
  if (unlockWorkAreaTimeout !== null) {
    clearTimeout(unlockWorkAreaTimeout)
    unlockWorkAreaTimeout = null
  }

  if (!lockedWorkArea) {
    lockedWorkArea = await readCurrentWorkArea()
  }
}

function scheduleWorkAreaUnlock(delay = 180) {
  if (unlockWorkAreaTimeout !== null) {
    clearTimeout(unlockWorkAreaTimeout)
  }

  unlockWorkAreaTimeout = window.setTimeout(() => {
    lockedWorkArea = null
    unlockWorkAreaTimeout = null
  }, delay)
}

function getMainAppShellRect(): { x: number; y: number; width: number; height: number } | null {
  const shell = windowRootRef.value?.querySelector('.app-shell') as HTMLElement | null
  if (!shell) return null
  const r = shell.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

function startMainAppResize(event: MouseEvent) {
  void lockWorkAreaForInteraction()

  isMainResizing = true
  mainResizeStartX = event.clientX
  mainResizeStartWidth = clampMainAppWidth(mainAppWidth.value)
  mainResizeCurrent = mainResizeStartWidth

  const rect = getMainAppShellRect()
  if (rect) {
    ghostFixedLeft = rect.x
    ghostFixedRight = rect.x + rect.width
    ghostFixedTop = rect.y
    ghostFixedHeight = rect.height
    showGhostFromRect(rect)
  }

  window.addEventListener('mousemove', onMainAppResize)
  window.addEventListener('mouseup', stopMainAppResize)

  event.preventDefault()
  event.stopPropagation()
}

function onMainAppResize(event: MouseEvent) {
  if (!isMainResizing) return

  // When the flyout is on the left, the resize handle is on the left edge of
  // the app shell → dragging left makes it bigger, so the right edge is fixed.
  // Otherwise (handle on the right), the left edge is fixed.
  const resizeSide: FlyoutSide = activeFlyout.value ? activeFlyoutSide.value : 'right'
  const growDirection = resizeSide === 'left' ? 'left' : 'right'

  const delta =
    resizeSide === 'left'
      ? mainResizeStartX - event.clientX
      : event.clientX - mainResizeStartX

  mainResizeCurrent = clampMainAppWidth(mainResizeStartWidth + delta)

  // Expand ghost from the fixed edge — no store write, no Vue re-render
  showGhostAnchored(mainResizeCurrent, growDirection)
}

function stopMainAppResize() {
  if (!isMainResizing) return
  isMainResizing = false
  window.removeEventListener('mousemove', onMainAppResize)
  window.removeEventListener('mouseup', stopMainAppResize)

  hideGhost()
  // Single store write → single re-render + window sync
  preferenceStore.set(MAIN_APP_WIDTH_PREFERENCE_ID, mainResizeCurrent)
  scheduleWorkAreaUnlock()
}

async function syncWindowFrame() {
  if (!isLayoutReady.value) return

  try {
    const workArea = lockedWorkArea ?? (await readCurrentWorkArea())
    if (!workArea) return

    const currentSize = await appWindow.innerSize()
    const currentOuterPosition = await appWindow.outerPosition()
    const scale = await appWindow.scaleFactor()

    const currentHeight = currentSize.toLogical(scale).height
    const currentX = currentOuterPosition.toLogical(scale).x
    const currentY = currentOuterPosition.toLogical(scale).y

    const desiredWidth = Math.round(Math.min(desiredWindowWidth.value, workArea.width))
    const desiredHeight = Math.round(Math.min(currentHeight, workArea.height))

    let nextX = workArea.x
    if (effectiveWindowAnchor.value === 'right') {
      nextX = workArea.x + workArea.width - desiredWidth
    } else if (effectiveWindowAnchor.value === 'center') {
      nextX = workArea.x + (workArea.width - desiredWidth) / 2
    }

    const maxY = workArea.y + workArea.height - desiredHeight
    const nextY = clampValue(currentY, workArea.y, maxY)

    nextX = Math.round(nextX)

    const widthChanged = lastWindowWidth !== desiredWidth
    const heightChanged = lastWindowHeight !== desiredHeight
    const xChanged = lastWindowX !== nextX
    const yChanged = lastWindowY !== nextY

    if (widthChanged || heightChanged) {
      await appWindow.setSize(new LogicalSize(desiredWidth, desiredHeight))
      lastWindowWidth = desiredWidth
      lastWindowHeight = desiredHeight
    }

    if (xChanged || yChanged) {
      await appWindow.setPosition(new LogicalPosition(nextX, nextY))
      lastWindowX = nextX
      lastWindowY = nextY
    }
  } catch (error) {
    console.error('Failed to sync window frame', error)
  }
}

function scheduleWindowSync() {
  if (!isLayoutReady.value) return

  void lockWorkAreaForInteraction()

  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = window.setTimeout(() => {
    resizeTimeout = null
    void syncWindowFrame().finally(() => {
      if (!isMainResizing) {
        scheduleWorkAreaUnlock()
      }
    })
  }, 24)
}

watch(
  [mainAppWidth, activeFlyoutWidth, activeFlyout, effectiveWindowAnchor, isRevealed, isAutoHideEnabled],
  scheduleWindowSync,
  { flush: 'post' },
)

function normalizeGlobalShortcutToken(token: string) {
  const lower = token.trim().toLowerCase()

  if (lower === 'alt' || lower === 'option') {
    return 'Alt'
  }

  if (lower === 'shift') {
    return 'Shift'
  }

  if (lower === 'space' || lower === 'spacebar') {
    return 'Space'
  }

  if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
    return 'Command'
  }

  if (token.length === 1) {
    return token.toUpperCase()
  }

  return token[0].toUpperCase() + token.slice(1)
}

function getGlobalShortcutCandidates(shortcut: string) {
  const rawParts = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

  const hasCtrlLikeModifier = rawParts.some((part) => {
    const lower = part.toLowerCase()
    return (
      lower === 'ctrl' ||
      lower === 'control' ||
      lower === 'cmdorctrl' ||
      lower === 'commandorcontrol'
    )
  })

  const baseTokens = rawParts
    .filter((part) => {
      const lower = part.toLowerCase()
      return !(
        lower === 'ctrl' ||
        lower === 'control' ||
        lower === 'cmdorctrl' ||
        lower === 'commandorcontrol'
      )
    })
    .map(normalizeGlobalShortcutToken)

  const modifierVariants = hasCtrlLikeModifier
    ? platform.isMac
      ? ['Command', 'CmdOrCtrl', 'CommandOrControl']
      : ['Ctrl', 'Control']
    : ['']

  return [...new Set(
    modifierVariants
      .map((modifier) => [modifier, ...baseTokens].filter(Boolean).join('+'))
      .filter(Boolean),
  )]
}

let registeredGlobalShortcuts: string[] = []

async function unregisterGlobalOpenShortcut() {
  const shortcutsToRemove = [...registeredGlobalShortcuts]
  registeredGlobalShortcuts = []

  await Promise.all(shortcutsToRemove.map(async (shortcut) => {
    try {
      await unregister(shortcut)
    } catch (error) {
      console.error(`Failed to unregister global shortcut "${shortcut}"`, error)
    }
  }))
}

async function revealAppWindow() {
  reveal()
  await lockWorkAreaForInteraction()
  await syncWindowFrame()
  scheduleWorkAreaUnlock()

  try {
    await appWindow.setFocus()
  } catch (error) {
    console.error('Failed to focus app window', error)
  }
}

async function syncGlobalOpenShortcut() {
  await unregisterGlobalOpenShortcut()

  if (!enableGlobalHotkeys.value) {
    return
  }

  const rawShortcut = globalOpenAppHotkey.value.trim()
  if (!rawShortcut) {
    return
  }

  const accelerators = getGlobalShortcutCandidates(rawShortcut)

  for (const accelerator of accelerators) {
    try {
      await register(accelerator, () => {
        void revealAppWindow()
      })
      registeredGlobalShortcuts.push(accelerator)
      return
    } catch (error) {
      console.error(`Failed to register global shortcut "${accelerator}"`, error)
    }
  }
}

watch([enableGlobalHotkeys, globalOpenAppHotkey], () => {
  void syncGlobalOpenShortcut()
}, { flush: 'post' })

async function checkForUpdatesSilently() {
  try {
    const update = await check()
    if (!update) return
    await update.downloadAndInstall()
    await relaunch()
  } catch (error) {
    console.error('Background update failed:', error)
  }
}

let scaleChangeUnlisten: (() => void) | null = null

onMounted(async () => {
  void checkForUpdatesSilently()

  await appWindow.setShadow(false)
  await wallpaperPaletteState.refresh()

  if (!preferenceStore.hydrated) {
    preferenceStore.hydrate()
  }

  if (platform.isMac) {
    await installMacAppMenu({
      openPreferences: openPreferencesFlyout,
    })
  }

  loadZoneHeights()
  isLayoutReady.value = true
  await lockWorkAreaForInteraction()
  await syncWindowFrame()
  scheduleWorkAreaUnlock()
  await syncGlobalOpenShortcut()

  // Re-read work area whenever the window moves to a monitor with a different
  // scale factor (e.g. laptop screen ↔ external display).
  scaleChangeUnlisten = await appWindow.onScaleChanged(async () => {
    lockedWorkArea = null
    lastWindowWidth = null
    lastWindowHeight = null
    lastWindowX = null
    lastWindowY = null
    await readCurrentWorkArea()
    await syncWindowFrame()
  })
})

onBeforeUnmount(() => {
  void unregisterGlobalOpenShortcut()
  clearAutoHideTimers()
  stopMainAppResize()

  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }

  if (unlockWorkAreaTimeout !== null) {
    clearTimeout(unlockWorkAreaTimeout)
  }

  if (scaleChangeUnlisten) {
    scaleChangeUnlisten()
    scaleChangeUnlisten = null
  }

  stopZoneResize()
  clearDisplayBoundsOverride()
  workAreaBounds.value = null
})

async function handleMinimize() {
  await appWindow.minimize()
}

async function handleMaximizeToggle() {
  try {
    const maximized = await appWindow.isMaximized()
    if (maximized) {
      await appWindow.unmaximize()
    } else {
      await appWindow.maximize()
    }
  } catch (error) {
    console.error('Failed to toggle maximize', error)
  }
}

async function handleClose() {
  await appWindow.close()
}

async function handleStartDragging() {
  try {
    await appWindow.startDragging()
  } catch (error) {
    console.error('Failed to start dragging window', error)
  }
}

function handleButtonClick(index: number) {
  gameStore.popRandom(index)
}

function handleFlyoutToggle(id: FlyoutId) {
  clearAutoHideTimers()

  if (isAutoHideEnabled.value && !isRevealed.value) {
    void revealAppWindow()
  }

  void lockWorkAreaForInteraction()
  toggleFlyout(id)
}

function openPreferencesFlyout() {
  clearAutoHideTimers()

  if (isAutoHideEnabled.value && !isRevealed.value) {
    void revealAppWindow()
  }

  void lockWorkAreaForInteraction()

  if (!isOpen('preferences')) {
    toggleFlyout('preferences')
  }
}

function triggerSparkles() {
  sparkleBurstKey.value += 1
  showSparkles.value = true
  window.setTimeout(() => {
    showSparkles.value = false
  }, 900)
}

function handleCatButtonClick() {
  gameStore.pressCatButton()
  triggerSparkles()
}
</script>

<template>
  <div
    ref="windowRootRef"
    class="window-root"
    :class="{
      ios: platform.isIOS,
      mac: platform.isMac,
      windows: platform.isWindows,
      'flyout-on-left': isFlyoutOnLeft,
      'flyout-on-right': hasActiveFlyout && !isFlyoutOnLeft,
      'no-flyout': !hasActiveFlyout,
      'anchor-left': effectiveWindowAnchor === 'left',
      'anchor-right': effectiveWindowAnchor === 'right',
      'anchor-center': effectiveWindowAnchor === 'center',
      'auto-hide-enabled': isAutoHideEnabled,
      'is-revealed': !isAutoHideEnabled || isRevealed,
      'is-hidden': isAutoHideEnabled && !isRevealed,
    }"
    :style="windowRootStyle"
    @mouseenter="handleAutoHideMouseEnter"
    @mousemove="handleAutoHideMouseMove"
    @mouseleave="handleAutoHideMouseLeave"
  >
    <div
      v-if="isAutoHideEnabled && !isRevealed"
      class="auto-hide-sensor"
      @mouseenter="handleAutoHideMouseEnter"
      @mousemove="handleAutoHideMouseMove"
      @mouseleave="handleAutoHideMouseLeave"
    />

    <div
      v-if="isAutoHideEnabled && isRevealed"
      class="auto-hide-grace-zone"
      @mouseenter="handleAutoHideMouseEnter"
      @mousemove="handleAutoHideMouseMove"
      @mouseleave="handleAutoHideMouseLeave"
    />

    <div class="app-shell">
      <div class="gradient-layer" :class="{ ready: isReady }" :data-fallback="isFallback" />
      <div class="window-surface">
        <header class="titlebar">
          <div class="left-group">
            <div v-if="platform.isMac || platform.isIOS" class="traffic-lights">
              <button class="mac-btn close" @click.stop="handleClose" aria-label="Close">✕</button>
              <button class="mac-btn minimize" @click.stop="handleMinimize" aria-label="Minimize">—</button>
              <button class="mac-btn maximize" @click.stop="handleMaximizeToggle" aria-label="Maximize">❐</button>
            </div>
            <div v-else-if="platform.isWindows" class="app-icon"></div>
          </div>

          <div class="drag-strip" data-tauri-drag-region @mousedown="handleStartDragging">
            <div v-if="platform.isMac || platform.isIOS" class="title-text-mac">Popper Game</div>
            <div v-else-if="platform.isWindows" class="title-text-win">Popper Game</div>
          </div>

          <div v-if="platform.isWindows" class="window-controls">
            <button
              ref="preferencesButtonRef"
              class="win-btn"
              @click="handleFlyoutToggle('preferences')"
              aria-label="Preferences"
            >
              ⚙️
            </button>
            <button class="win-btn" @click.stop="handleMinimize" aria-label="Minimize">—</button>
            <button class="win-btn" @click.stop="handleMaximizeToggle" aria-label="Maximize">❐</button>
            <button class="win-btn close" @click.stop="handleClose" aria-label="Close">✕</button>
          </div>
        </header>

        <main class="content">
          <div class="layout-shell" :style="layoutShellStyle">
            <section class="panel-zone zone-1">
              <div class="zone-1-row zone-1-row-top">
                <div class="title-wrap">
                  <h1 class="title">Popper Game</h1>
                </div>

                <div class="top-right">
                  <div class="counter-pill" ref="counterRef" @click="handleFlyoutToggle('counter')">
                    <span class="icon">⭐</span>
                    <span class="value">{{ gameStore.weeklyCount }}</span>
                  </div>
                </div>
              </div>

              <div class="zone-1-row zone-1-row-bottom">
                <p class="subtitle">Click on the cat!</p>
              </div>
            </section>

            <section class="panel-zone zone-2" ref="zone2Ref" @click="handleFlyoutToggle('zone2')">
              <div class="panel-card">
                <div class="panel-card-content game-panel">
                  <div class="button-grid">
                    <button
                      v-for="(isUp, index) in gameStore.buttons"
                      :key="index"
                      class="popper-button"
                      :class="{ up: isUp, down: !isUp }"
                      @click="handleButtonClick(index)"
                    >
                      <div class="button-inner">
                        <span v-if="isUp" class="emoji">🐱</span>
                        <span v-else class="emoji">🕳️</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <button
              class="zone-resize-handle"
              data-testid="zone-resize-handle-2-3"
              type="button"
              aria-label="Resize between section 2 and section 3"
              @mousedown.stop="startZoneResize('zone2', 'zone3', $event)"
            />

            <section class="panel-zone zone-3" ref="zone3Ref" @click="handleFlyoutToggle('zone3')">
              <div class="panel-card">
                <div class="panel-card-content"></div>
              </div>
            </section>

            <button
              class="zone-resize-handle"
              data-testid="zone-resize-handle-3-4"
              type="button"
              aria-label="Resize between section 3 and section 4"
              @mousedown.stop="startZoneResize('zone3', 'zone4', $event)"
            />

            <section class="panel-zone zone-4" ref="zone4Ref" @click="handleFlyoutToggle('zone4')">
              <div class="panel-card">
                <div class="panel-card-content"></div>
              </div>
            </section>

            <button
              class="zone-resize-handle"
              data-testid="zone-resize-handle-4-5"
              type="button"
              aria-label="Resize between section 4 and section 5"
              @mousedown.stop="startZoneResize('zone4', 'zone5', $event)"
            />

            <section class="panel-zone zone-5">
              <div class="panel-card">
                <div class="panel-card-content"></div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>

    <button
      v-if="showMainResizeHandle"
      type="button"
      class="app-resize-handle"
      data-testid="app-resize-handle"
      aria-label="Resize main app"
      @mousedown.stop="startMainAppResize"
    />

    <!-- Ghost frame: shown during any resize drag, updated via direct DOM, hidden on commit -->
    <div ref="ghostRef" class="resize-ghost" style="display:none" aria-hidden="true" />

    <div class="flyout-layer">
      <FlyoutPanel
        id="zone2"
        :open="isOpen('zone2')"
        :side="activeFlyoutSide"
        title="Section 2"
        subtitle="Game tools and controls"
        :anchor-el="flyoutAnchors.zone2.value"
        :container-el="windowRootRef"
        @close="closeFlyout"
      >
        <div class="flyout-template-block">
          <div class="flyout-title">Section 2</div>
          <div class="flyout-subtitle">Game tools and controls</div>
          Put section 2 content here.
        </div>
      </FlyoutPanel>

      <FlyoutPanel
        id="zone3"
        :open="isOpen('zone3')"
        :side="activeFlyoutSide"
        title="Section 3"
        subtitle="Upper right panel details"
        :anchor-el="flyoutAnchors.zone3.value"
        :container-el="windowRootRef"
        @close="closeFlyout"
      >
        <div class="flyout-template-block">
          Put section 3 content here.
        </div>
      </FlyoutPanel>

      <FlyoutPanel
        id="zone4"
        :open="isOpen('zone4')"
        :side="activeFlyoutSide"
        title="Section 4"
        subtitle="Middle right panel details"
        :anchor-el="flyoutAnchors.zone4.value"
        :container-el="windowRootRef"
        @close="closeFlyout"
      >
        <div class="flyout-template-block">
          Put section 4 content here.
        </div>
      </FlyoutPanel>

      <FlyoutPanel
        id="counter"
        :open="isOpen('counter')"
        :side="activeFlyoutSide"
        title="Counter"
        subtitle="Cat click stats"
        :anchor-el="flyoutAnchors.counter.value"
        :container-el="windowRootRef"
        @close="closeFlyout"
      >
        <div class="flyout-template-block">
          <div>Today: {{ gameStore.todayCount }}</div>
          <div>This week: {{ gameStore.weeklyCount }}</div>
          <div>This month: {{ gameStore.monthCount }}</div>
          <div>This year: {{ gameStore.yearCount }}</div>
          <div>All time: {{ gameStore.allTimeCount }}</div>
        </div>
      </FlyoutPanel>

      <FlyoutPanel
        id="preferences"
        :open="isOpen('preferences')"
        :side="activeFlyoutSide"
        title="Preferences"
        subtitle="Customize your app"
        :anchor-el="flyoutAnchors.preferences.value"
        :container-el="windowRootRef"
        @close="closeFlyout"
      >
        <PreferenceFlyout />
      </FlyoutPanel>
    </div>
  </div>
</template>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.window-root {
  --window-radius: 16px;
  --app-titlebar-background: rgb(5, 14, 23);
  --preference-surface-background: var(--app-titlebar-background);

  --bg-gradient:
    radial-gradient(circle at -30% 40%, var(--wall-accent) 0%, transparent 45%),
    radial-gradient(circle at 100% 45%, var(--wall-accent-soft) 0%, transparent 60%),
    radial-gradient(circle at 100% 70%, var(--wall-accent-soft) 0%, transparent 40%),
    radial-gradient(circle at 0% 40%, var(--wall-surface) 0%, transparent 40%),
    radial-gradient(circle at 80% 0%, var(--wall-bg) 0%, transparent 28%),
    rgba(7, 14, 24, 0.82);
  --border-gradient:
    radial-gradient(circle at 100% 0%, var(--wall-accent) 0%, transparent 18%),
    radial-gradient(circle at 100% 20%, var(--wall-accent-soft) 0%, transparent 70%),
    radial-gradient(circle at 100% 45%, var(--wall-highlight) 0%, transparent 70%),
    radial-gradient(circle at 0% 45%, white 0%, transparent 35%),
    radial-gradient(circle at 100% 80%, var(--wall-accent-2) 0%, transparent 42%),
    radial-gradient(circle at 0% 40%, var(--wall-surface) 0%, transparent 40%),
    radial-gradient(circle at 80% 0%, var(--wall-bg) 0%, transparent 28%),
    linear-gradient(
      165deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.40),
      rgba(255, 255, 255, 0.1)
    );

  width: var(--window-frame-width);
  height: 100dvh;
  min-height: 100dvh;
  max-width: none;
  background: transparent;
  position: relative;
  overflow: visible;
}

.window-root.auto-hide-enabled {
  overflow: hidden;
}

.auto-hide-sensor {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--auto-hide-sensor-width);
  z-index: 90;
  background: transparent;
  pointer-events: auto;
}

.window-root.anchor-left .auto-hide-sensor {
  left: 0;
}

.window-root.anchor-right .auto-hide-sensor {
  right: 0;
}

.auto-hide-grace-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--revealed-grace-zone-width);
  z-index: 85;
  background: transparent;
  pointer-events: auto;
}

.window-root.anchor-left .auto-hide-grace-zone {
  right: 0;
}

.window-root.anchor-right .auto-hide-grace-zone {
  left: 0;
}

.window-root.anchor-left {
  margin-left: 0;
  margin-right: auto;
}

.window-root.anchor-right {
  margin-left: auto;
  margin-right: 0;
}

.window-root.anchor-center {
  margin-left: auto;
  margin-right: auto;
}

.app-shell {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--pref-main-app-width);
  padding: 0;
  z-index: 10;
  overflow: hidden;
  box-sizing: border-box;
}

.window-root.flyout-on-left .app-shell {
  left: calc(var(--active-flyout-offset) + var(--content-horizontal-offset));
  right: auto;
}

.window-root.flyout-on-right .app-shell,
.window-root.no-flyout .app-shell {
  left: var(--content-horizontal-offset);
  right: auto;
}

.gradient-layer {
  position: absolute;
  inset: 0;
  background: var(--bg-gradient);
  border-radius: 16px;
  z-index: 0;
  opacity: 0;
  transition: opacity 900ms ease;
}

.gradient-layer.ready {
  opacity: 1;
}

.window-surface {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 20dvh;
  border-radius: var(--window-radius);
  background:
    var(--bg-gradient),
    linear-gradient(180deg, #07101d 20%, #0b1320 50%);
  pointer-events: auto;
}

.window-surface::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--window-radius);
  z-index: 1;
  padding: 1.5px;
  background: var(--border-gradient);
  backdrop-filter: saturate(160%);
  -webkit-backdrop-filter: saturate(140%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.content {
  --section-gap: 8px;
  flex: 1 1 auto;
  position: relative;
  padding:
    calc(8px + env(safe-area-inset-top, 0px))
    8px
    calc(8px + env(safe-area-inset-bottom, 0px));
  overflow: hidden;
}

.resize-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  transition: none;
}

.app-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  z-index: 45;
  padding: 0;
  border: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: col-resize;
  user-select: none;
  -webkit-user-select: none;
}

.window-root.flyout-on-left .app-resize-handle {
  left: calc(var(--content-horizontal-offset) + var(--active-flyout-width) + (var(--flyout-gap) / 2) - 4px);
}

.window-root.flyout-on-right .app-resize-handle {
  left: calc(var(--content-horizontal-offset) + var(--pref-main-app-width) + (var(--flyout-gap) / 2) - 4px);
}

.window-root.no-flyout .app-resize-handle {
  left: calc(var(--content-horizontal-offset) + var(--pref-main-app-width) - 4px);
}

.flyout-layer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--content-horizontal-offset);
  width: var(--total-window-width);
  z-index: 40;
  overflow: visible;
  pointer-events: none;
}

.window-root.auto-hide-enabled .app-shell,
.window-root.auto-hide-enabled .flyout-layer,
.window-root.auto-hide-enabled .app-resize-handle {
  transition:
    transform var(--auto-hide-duration) cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
  will-change: transform;
}

.window-root.auto-hide-enabled.anchor-right.is-hidden .app-shell,
.window-root.auto-hide-enabled.anchor-right.is-hidden .flyout-layer,
.window-root.auto-hide-enabled.anchor-right.is-hidden .app-resize-handle {
  transform: translateX(calc(var(--total-window-width) - var(--auto-hide-sensor-width)));
}

.window-root.auto-hide-enabled.anchor-left.is-hidden .app-shell,
.window-root.auto-hide-enabled.anchor-left.is-hidden .flyout-layer,
.window-root.auto-hide-enabled.anchor-left.is-hidden .app-resize-handle {
  transform: translateX(calc(-1 * (var(--total-window-width) - var(--auto-hide-sensor-width))));
}

.window-root.auto-hide-enabled.is-hidden .app-shell,
.window-root.auto-hide-enabled.is-hidden .flyout-layer,
.window-root.auto-hide-enabled.is-hidden .app-resize-handle {
  pointer-events: none;
}

.window-root.auto-hide-enabled.is-hidden {
  cursor: default;
}

.window-root.auto-hide-enabled.is-revealed .app-shell,
.window-root.auto-hide-enabled.is-revealed .flyout-layer,
.window-root.auto-hide-enabled.is-revealed .app-resize-handle {
  transform: translateX(0);
}

.flyout-layer > * {
  pointer-events: auto;
}

.titlebar {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: var(--app-titlebar-background);
}

.traffic-lights {
  position: absolute;
  left: 14px;
}

.mac-btn {
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
}

.mac-btn.close { background: #ff5f57; }
.mac-btn.minimize { background: #febc2e; }
.mac-btn.maximize { background: #28c840; }

.title-text-mac {
  font-size: 13px;
  font-weight: 500;
  color: var(--wall-accent);
  pointer-events: none;
}

.mac-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
}

.mac-btn.close:hover::after {
  content: '×';
  color: black;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.left-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-icon {
  width: 14px;
  height: 14px;
  display: block;
  background-image: url('/icon.ico');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  flex: 0 0 14px;
}

.drag-strip {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  min-width: 0;
  margin-left: 12px;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.win-btn {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: var(--wall-text);
  cursor: pointer;
  border-radius: 8px;
}

.win-btn:hover {
  background: var(--wall-accent-soft);
}

.win-btn.close:hover {
  background: rgba(232, 17, 35, 0.9);
  color: white;
}

.title-text-win {
  font-size: 13px;
  font-weight: 500;
  color: var(--wall-text);
  pointer-events: none;
}

.layout-shell {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  z-index: 1;
}

.zone-resize-handle {
  flex: 0 0 8px;
  width: 100%;
  min-height: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: row-resize;
  appearance: none;
  -webkit-appearance: none;
  user-select: none;
  -webkit-user-select: none;
  position: relative;
  z-index: 5;
  touch-action: pan-x;
}

.zone-resize-handle::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  transition: background 160ms ease, width 160ms ease;
}

.zone-resize-handle:hover::after {
  background: rgba(255, 255, 255, 0.35);
  width: 48px;
}

.panel-zone {
  --section-padding: 0px;
  position: relative;
  border-radius: 8px;
  border: 0 solid var(--wall-bg);
  z-index: 1;
}

.zone-1 {
  flex: 0 0 auto;
  min-height: 24px;
  padding: 6px 4px;
  display: grid;
  grid-template-rows: auto auto;
  gap: var(--section-gap);
}

.zone-1-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--section-gap);
}

.zone-1-row-bottom {
  justify-content: flex-start;
}

.zone-2 {
  flex: var(--zone2-grow, 1) 1 0;
  min-height: 80px;
  padding: var(--section-padding);
}

.zone-3 {
  flex: var(--zone3-grow, 0.72) 1 0;
  min-height: 80px;
  padding: var(--section-padding);
}

.zone-4 {
  flex: var(--zone4-grow, 0.72) 1 0;
  min-height: 80px;
  padding: var(--section-padding);
}

.zone-5 {
  flex: var(--zone5-grow, 0.72) 1 0;
  min-height: 80px;
  padding: var(--section-padding);
}

.panel-card {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 8px;
  background: linear-gradient(
    180deg,
    rgba(11, 19, 32, 0.72) 0%,
    rgba(7, 14, 24, 0.82) 70%
  );
  border: 1px solid var(--wall-bg);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  z-index: 2;
}

.panel-card-content {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 3;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--wall-accent) transparent;
  scrollbar-gutter: stable;
}

.game-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.top-right {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 4;
}

.title-wrap {
  pointer-events: none;
}

.title {
  font-size: 2rem;
  margin: 0;
  background: var(--wall-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 500;
}

.subtitle {
  margin: 0;
  color: var(--wall-text);
  font-size: 1rem;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  width: min(100%, 520px);
}

.popper-button {
  aspect-ratio: 1;
  border-radius: 18px;
  border: none;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.1);
  position: relative;
  outline: none;
}

.popper-button.up {
  background: linear-gradient(135deg, #00c6fb 0%, #005bea 100%);
  box-shadow: 0 10px 20px rgba(0, 91, 234, 0.35), inset 0 2px 5px rgba(255, 255, 255, 0.35);
  transform: translateY(-6px);
}

.popper-button.down {
  background: var(--wall-bg);
  box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.45);
  transform: translateY(2px);
}

.popper-button:hover {
  transform: translateY(-2px);
}

.popper-button.up:hover {
  transform: translateY(-8px);
}

.popper-button:active {
  transform: scale(0.96);
}

.button-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.5rem;
}

.counter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: var(--wall-text);
  background: linear-gradient(
    180deg,
    var(--wall-accent-soft),
    var(--wall-surface)
  );
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid var(--wall-bg);
  box-shadow:
    0 0 12px rgba(255, 200, 120, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  position: relative;
  overflow: hidden;
}

.counter-pill .icon {
  font-size: 14px;
  filter: drop-shadow(0 0 4px var(--wall-surface));
}

.counter-pill .value {
  letter-spacing: 0.2px;
}

.emoji {
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.2));
  user-select: none;
}
</style>