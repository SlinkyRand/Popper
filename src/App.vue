<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

import { useGameStore } from './stores/gameStore'
import { getPlatform } from './platform'
import { wallpaperPaletteState } from './lib/wallpaperPalette'
import FlyoutPanel from './components/FlyoutPanel.vue'
import { useFlyouts, type FlyoutId } from './composables/useFlyouts'
import PreferenceFlyout from '@/components/preferences/PreferenceFlyout.vue'
import { installMacAppMenu } from '@/lib/installMacAppMenu'
import { usePreferenceStore } from '@/stores/preferenceStore'
import { useAppliedPreferences } from './composables/preferences/useAppliedPreferences'
import {
  FLYOUT_WIDTH_DEFAULT,
  FLYOUT_WIDTH_MAX,
  FLYOUT_WIDTH_MIN,
  MAIN_APP_WIDTH_MAX,
  MAIN_APP_WIDTH_MIN,
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

const windowRootRef = ref<HTMLElement | null>(null)
const preferencesButtonRef = ref<HTMLElement | null>(null)
const zone2Ref = ref<HTMLElement | null>(null)
const zone3Ref = ref<HTMLElement | null>(null)
const zone4Ref = ref<HTMLElement | null>(null)
const counterRef = ref<HTMLElement | null>(null)

const { activeFlyout, closeFlyout, toggleFlyout, isOpen } = useFlyouts()
const { mainAppWidth } = useAppliedPreferences()

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
  return Math.min(FLYOUT_WIDTH_MAX, Math.max(FLYOUT_WIDTH_MIN, value))
}

function clampMainAppWidth(value: number) {
  return Math.min(MAIN_APP_WIDTH_MAX, Math.max(MAIN_APP_WIDTH_MIN, value))
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function snapWidth(value: number, step = 24) {
  return Math.round(value / step) * step
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

const windowRootStyle = computed(() => ({
  ...gradientStyleVars.value,
  '--active-flyout-width': `${activeFlyoutWidth.value}px`,
  '--active-flyout-offset': `${activeFlyoutOffset.value}px`,
  '--flyout-gap': `${flyoutGap.value}px`,
  '--pref-main-app-width': `${clampMainAppWidth(mainAppWidth.value)}px`,
}))

const showMainResizeHandle = computed(() => true)
const hasActiveFlyout = computed(() => activeFlyout.value !== null)
const isFlyoutOnLeft = computed(() => hasActiveFlyout.value && activeFlyoutSide.value === 'left')

let mainResizeStartX = 0
let mainResizeStartWidth = 0
let isMainResizing = false

let resizeTimeout: number | null = null
let unlockWorkAreaTimeout: number | null = null
let lockedWorkArea: WorkAreaRect | null = null

let lastWindowWidth: number | null = null
let lastWindowHeight: number | null = null
let lastWindowX: number | null = null
let lastWindowY: number | null = null

async function readCurrentWorkArea(): Promise<WorkAreaRect | null> {
  const monitor = await currentMonitor()
  if (!monitor) return null

  const scale = await appWindow.scaleFactor()
  const workArea = monitor.workArea

  return {
    x: workArea.position.x / scale,
    y: workArea.position.y / scale,
    width: workArea.size.width / scale,
    height: workArea.size.height / scale,
  }
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

function startMainAppResize(event: MouseEvent) {
  void lockWorkAreaForInteraction()

  isMainResizing = true
  mainResizeStartX = event.clientX
  mainResizeStartWidth = clampMainAppWidth(mainAppWidth.value)

  window.addEventListener('mousemove', onMainAppResize)
  window.addEventListener('mouseup', stopMainAppResize)

  event.preventDefault()
  event.stopPropagation()
}

function onMainAppResize(event: MouseEvent) {
  if (!isMainResizing) return

  const resizeSide: FlyoutSide = activeFlyout.value ? activeFlyoutSide.value : 'right'

  const delta =
    resizeSide === 'left'
      ? mainResizeStartX - event.clientX
      : event.clientX - mainResizeStartX

  const next = clampMainAppWidth(snapWidth(mainResizeStartWidth + delta))
  preferenceStore.set(MAIN_APP_WIDTH_PREFERENCE_ID, next)
}

function stopMainAppResize() {
  isMainResizing = false
  window.removeEventListener('mousemove', onMainAppResize)
  window.removeEventListener('mouseup', stopMainAppResize)
  scheduleWorkAreaUnlock()
}

async function syncWindowFrame() {
  if (!isLayoutReady.value) return

  try {
    const workArea = lockedWorkArea ?? (await readCurrentWorkArea())
    if (!workArea) return

    const scale = await appWindow.scaleFactor()
    const currentSize = await appWindow.innerSize()
    const currentOuterPosition = await appWindow.outerPosition()

    const currentHeight = currentSize.height / scale
    const currentX = currentOuterPosition.x / scale
    const currentY = currentOuterPosition.y / scale

    const desiredWidth = Math.round(Math.min(totalWindowWidth.value, workArea.width))
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
  [mainAppWidth, activeFlyoutWidth, activeFlyout, effectiveWindowAnchor],
  scheduleWindowSync,
  { flush: 'post' },
)

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

  isLayoutReady.value = true
  await lockWorkAreaForInteraction()
  await syncWindowFrame()
  scheduleWorkAreaUnlock()
})

onBeforeUnmount(() => {
  stopMainAppResize()

  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }

  if (unlockWorkAreaTimeout !== null) {
    clearTimeout(unlockWorkAreaTimeout)
  }
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
  void lockWorkAreaForInteraction()
  toggleFlyout(id)
}

function openPreferencesFlyout() {
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
    }"
    :style="windowRootStyle"
  >
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
          <div class="layout-shell">
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

            <section class="panel-zone zone-3" ref="zone3Ref" @click="handleFlyoutToggle('zone3')">
              <div class="panel-card">
                <div class="panel-card-content"></div>
              </div>
            </section>

            <section class="panel-zone zone-4" ref="zone4Ref" @click="handleFlyoutToggle('zone4')">
              <div class="panel-card">
                <div class="panel-card-content"></div>
              </div>
            </section>

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

  width: calc(var(--pref-main-app-width) + var(--active-flyout-offset));
  height: 100dvh;
  min-height: 100dvh;
  max-width: none;
  background: transparent;
  position: relative;
  overflow: visible;
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
  left: var(--active-flyout-offset);
  right: auto;
}

.window-root.flyout-on-right .app-shell,
.window-root.no-flyout .app-shell {
  left: 0;
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
  left: calc(var(--active-flyout-width) + (var(--flyout-gap) / 2) - 4px);
}

.window-root.flyout-on-right .app-resize-handle {
  left: calc(var(--pref-main-app-width) + (var(--flyout-gap) / 2) - 4px);
}

.window-root.no-flyout .app-resize-handle {
  left: calc(var(--pref-main-app-width) - 4px);
}

.flyout-layer {
  position: absolute;
  inset: 0;
  z-index: 40;
  overflow: visible;
  pointer-events: none;
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
  background: rgb(5, 14, 23);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows:
    auto
    minmax(280px, 1fr)
    minmax(160px, 0.72fr)
    minmax(160px, 0.72fr)
    minmax(160px, 0.72fr);
  gap: 8px;
  z-index: 1;
}

.panel-zone {
  --section-padding: 0px;
  position: relative;
  border-radius: 8px;
  border: 0 solid var(--wall-bg);
  z-index: 1;
}

.zone-1 {
  grid-column: 1;
  grid-row: 1;
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
  grid-column: 1;
  grid-row: 2;
  padding: var(--section-padding);
}

.zone-3 {
  grid-column: 1;
  grid-row: 3;
  padding: var(--section-padding);
}

.zone-4 {
  grid-column: 1;
  grid-row: 4;
  padding: var(--section-padding);
}

.zone-5 {
  grid-column: 1;
  grid-row: 5;
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

@media (max-width: 860px) {
  .layout-shell {
    grid-template-columns: 1fr;
    grid-template-rows:
      auto
      minmax(0, auto)
      minmax(0, auto)
      minmax(0, auto)
      minmax(0, auto);
  }

  .zone-1,
  .zone-2,
  .zone-3,
  .zone-4,
  .zone-5 {
    grid-column: 1;
  }

  .zone-1 { grid-row: 1; }
  .zone-2 { grid-row: 2; }
  .zone-3 { grid-row: 3; }
  .zone-4 { grid-row: 4; }
  .zone-5 { grid-row: 5; }
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