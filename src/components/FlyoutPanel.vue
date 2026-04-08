<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePreferenceStore } from '@/stores/preferenceStore'
import {
  FLYOUT_HEIGHT_DEFAULT,
  FLYOUT_HEIGHT_MIN,
  FLYOUT_WIDTH_DEFAULT,
  FLYOUT_WIDTH_MIN,
  PREFERENCES_FLYOUT_WIDTH_DEFAULT,
  PREFERENCES_FLYOUT_HEIGHT_DEFAULT,
  PREFERENCES_FLYOUT_WIDTH_MIN,
  getFlyoutHeightMax,
  getFlyoutWidthMax,
  getPreferencesFlyoutWidthMax,
} from '@/data/preferences/preference.constants'
import {
  GLOBAL_FLYOUT_WIDTH_PREFERENCE_ID,
  getFlyoutHeightPreferenceId,
  getFlyoutWidthPreferenceId,
  type FlyoutId,
} from '@/lib/flyoutLayout'

const props = defineProps<{
  id: FlyoutId
  open: boolean
  side: 'left' | 'right'
  title: string
  subtitle?: string
  anchorEl?: HTMLElement | null
  containerEl?: HTMLElement | null
}>()

const preferenceStore = usePreferenceStore()
const topPx = ref(0)
const panelWidth = ref(props.id === 'preferences' ? PREFERENCES_FLYOUT_WIDTH_DEFAULT : FLYOUT_WIDTH_DEFAULT)
const panelHeight = ref(props.id === 'preferences' ? PREFERENCES_FLYOUT_HEIGHT_DEFAULT : FLYOUT_HEIGHT_DEFAULT)

// Ghost element for drag-preview (updated via direct DOM, never via reactivity)
const ghostRef = ref<HTMLElement | null>(null)

// Fixed anchors captured at drag-start
let ghostFixedLeft = 0
let ghostFixedRight = 0
let ghostFixedTop = 0
let ghostFixedBottom = 0
let ghostFixedWidth = 0
let ghostFixedHeight = 0

function initGhostAnchors(rect: { x: number; y: number; width: number; height: number }) {
  ghostFixedLeft = rect.x
  ghostFixedRight = rect.x + rect.width
  ghostFixedTop = rect.y
  ghostFixedBottom = rect.y + rect.height
  ghostFixedWidth = rect.width
  ghostFixedHeight = rect.height
}

function showFlyoutGhostWidth(width: number) {
  const el = ghostRef.value
  if (!el) return
  // Flyout on left: handle is on the LEFT edge → right edge is fixed, ghost grows leftward
  // Flyout on right: handle is on the RIGHT edge → left edge is fixed, ghost grows rightward
  const x = props.side === 'left'
    ? ghostFixedRight - width        // right edge fixed, grow left
    : ghostFixedLeft                 // left edge fixed, grow right
  el.style.left = `${x}px`
  el.style.top = `${ghostFixedTop}px`
  el.style.width = `${width}px`
  el.style.height = `${ghostFixedHeight}px`
  el.style.display = 'block'
}

function showFlyoutGhostHeight(height: number) {
  const el = ghostRef.value
  if (!el) return
  // Height handle is always at the bottom → top edge fixed
  el.style.left = `${ghostFixedLeft}px`
  el.style.top = `${ghostFixedTop}px`
  el.style.width = `${ghostFixedWidth}px`
  el.style.height = `${height}px`
  el.style.display = 'block'
}

function hideFlyoutGhost() {
  const el = ghostRef.value
  if (!el) return
  el.style.display = 'none'
}

function isPreferencesFlyout() {
  return props.id === 'preferences'
}

function getWidthMin() {
  return isPreferencesFlyout() ? PREFERENCES_FLYOUT_WIDTH_MIN : FLYOUT_WIDTH_MIN
}

function getWidthMax() {
  return isPreferencesFlyout() ? getPreferencesFlyoutWidthMax() : getFlyoutWidthMax()
}

function getWidthDefault() {
  return isPreferencesFlyout() ? PREFERENCES_FLYOUT_WIDTH_DEFAULT : FLYOUT_WIDTH_DEFAULT
}

function getHeightDefault() {
  return isPreferencesFlyout() ? PREFERENCES_FLYOUT_HEIGHT_DEFAULT : FLYOUT_HEIGHT_DEFAULT
}

function clampWidth(value: number) {
  return Math.min(getWidthMax(), Math.max(getWidthMin(), value))
}

function clampHeight(value: number, availableHeight = getFlyoutHeightMax()) {
  const boundedMax = Math.max(
    FLYOUT_HEIGHT_MIN,
    Math.min(getFlyoutHeightMax(), availableHeight),
  )

  return Math.min(boundedMax, Math.max(FLYOUT_HEIGHT_MIN, value))
}

function readPreferredWidth(): number {
  const saved = preferenceStore.get(getFlyoutWidthPreferenceId(props.id))
  // For the preferences flyout, don't fall back to the global flyout width
  // since it has its own independent default that is intentionally wider.
  const fallback = isPreferencesFlyout()
    ? getWidthDefault()
    : Number(preferenceStore.get(GLOBAL_FLYOUT_WIDTH_PREFERENCE_ID) ?? getWidthDefault())
  return clampWidth(Number(saved ?? fallback))
}

function readPreferredHeight(): number {
  return clampHeight(
    Number(
      preferenceStore.get(getFlyoutHeightPreferenceId(props.id)) ??
        getHeightDefault(),
    ),
    getAvailableHeight(),
  )
}

function getAvailableHeight() {
  const container = props.containerEl
  if (!container) return getFlyoutHeightMax()

  const containerRect = container.getBoundingClientRect()
  if (containerRect.height <= 0) return getFlyoutHeightMax()

  return Math.max(FLYOUT_HEIGHT_MIN, containerRect.height - topPx.value - 8)
}

const styleVars = computed(() => ({
  top: `${topPx.value}px`,
  width: `${panelWidth.value}px`,
  height: `${panelHeight.value}px`,
  left: props.side === 'left' ? '0px' : 'auto',
  right: props.side === 'right' ? '0px' : 'auto',
  '--pref-flyout-width': `${panelWidth.value}px`,
}))

let widthResizeStartX = 0
let widthResizeStartValue = 0
let widthResizeCurrent = 0
let isWidthResizing = false

let heightResizeStartY = 0
let heightResizeStartValue = 0
let heightResizeCurrent = 0
let isHeightResizing = false

async function updatePosition() {
  await nextTick()

  const anchor = props.anchorEl
  const container = props.containerEl
  if (!anchor || !container) return

  const anchorRect = anchor.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const desiredTop = anchorRect.top - containerRect.top

  topPx.value = Math.max(0, desiredTop)
  panelHeight.value = clampHeight(panelHeight.value, getAvailableHeight())

  const maxTop = Math.max(0, containerRect.height - panelHeight.value - 8)
  topPx.value = Math.max(0, Math.min(desiredTop, maxTop))
  panelHeight.value = clampHeight(panelHeight.value, getAvailableHeight())
}

function getFlyoutShellRect() {
  // Find the aside shell element - it's the direct parent of flyout-panel
  const el = ghostRef.value?.previousElementSibling as HTMLElement | null
    ?? document.querySelector(`.flyout-shell`) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

function startWidthResize(event: MouseEvent) {
  isWidthResizing = true
  widthResizeStartX = event.clientX
  widthResizeStartValue = panelWidth.value
  widthResizeCurrent = panelWidth.value

  const rect = getFlyoutShellRect()
  if (rect) {
    initGhostAnchors(rect)
    showFlyoutGhostWidth(widthResizeCurrent)
  }

  window.addEventListener('mousemove', onWidthResize)
  window.addEventListener('mouseup', stopWidthResize)

  event.preventDefault()
  event.stopPropagation()
}

function onWidthResize(event: MouseEvent) {
  if (!isWidthResizing) return

  const delta =
    props.side === 'left'
      ? widthResizeStartX - event.clientX
      : event.clientX - widthResizeStartX

  widthResizeCurrent = clampWidth(widthResizeStartValue + delta)

  // Update only the ghost from the fixed edge — no reactive update
  showFlyoutGhostWidth(widthResizeCurrent)
}

function stopWidthResize() {
  if (!isWidthResizing) return
  isWidthResizing = false
  window.removeEventListener('mousemove', onWidthResize)
  window.removeEventListener('mouseup', stopWidthResize)

  hideFlyoutGhost()
  // Single commit → single re-render
  panelWidth.value = widthResizeCurrent
  preferenceStore.set(getFlyoutWidthPreferenceId(props.id), panelWidth.value)
}

function startHeightResize(event: MouseEvent) {
  isHeightResizing = true
  heightResizeStartY = event.clientY
  heightResizeStartValue = panelHeight.value
  heightResizeCurrent = panelHeight.value

  const rect = getFlyoutShellRect()
  if (rect) {
    initGhostAnchors(rect)
    showFlyoutGhostHeight(heightResizeCurrent)
  }

  window.addEventListener('mousemove', onHeightResize)
  window.addEventListener('mouseup', stopHeightResize)

  event.preventDefault()
  event.stopPropagation()
}

function onHeightResize(event: MouseEvent) {
  if (!isHeightResizing) return

  const delta = event.clientY - heightResizeStartY
  heightResizeCurrent = clampHeight(heightResizeStartValue + delta, getAvailableHeight())

  // Top edge fixed, grow downward
  showFlyoutGhostHeight(heightResizeCurrent)
}

function stopHeightResize() {
  if (!isHeightResizing) return
  isHeightResizing = false
  window.removeEventListener('mousemove', onHeightResize)
  window.removeEventListener('mouseup', stopHeightResize)

  hideFlyoutGhost()
  // Single commit → single re-render
  panelHeight.value = heightResizeCurrent
  preferenceStore.set(getFlyoutHeightPreferenceId(props.id), panelHeight.value)
}

function handleWindowChange() {
  if (props.open) {
    panelHeight.value = clampHeight(panelHeight.value, getAvailableHeight())
    void updatePosition()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return

    panelWidth.value = readPreferredWidth()
    panelHeight.value = readPreferredHeight()
    await updatePosition()
  },
  { immediate: true },
)

watch(
  () => [props.anchorEl, props.containerEl],
  async () => {
    if (props.open) {
      await updatePosition()
    }
  },
)

onMounted(() => {
  panelWidth.value = readPreferredWidth()
  panelHeight.value = readPreferredHeight()
  window.addEventListener('resize', handleWindowChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowChange)
  stopWidthResize()
  stopHeightResize()
})
</script>

<template>
  <transition name="flyout-fade">
    <aside
      v-if="open"
      class="flyout-shell"
      :class="[`flyout-shell--${side}`]"
      :style="styleVars"
    ><!-- Ghost frame: shown during flyout resize drags only -->
      <div ref="ghostRef" class="flyout-resize-ghost" style="display:none" aria-hidden="true" />
      <div class="flyout-panel">
        <button
          class="flyout-outer-resize-handle"
          data-testid="flyout-outer-resize-handle"
          type="button"
          aria-label="Resize flyout width"
          @mousedown.stop="startWidthResize"
        />

        <div class="flyout-header">
          <div class="flyout-row flyout-row-top">
            <h2 class="flyout-title">{{ title }}</h2>
          </div>

          <div v-if="subtitle" class="flyout-row flyout-row-bottom">
            <p class="flyout-subtitle">{{ subtitle }}</p>
          </div>
        </div>

        <div class="flyout-card">
          <div class="flyout-card-content">
            <slot />
          </div>
        </div>

        <button
          class="flyout-height-resize-handle"
          data-testid="flyout-height-resize-handle"
          type="button"
          aria-label="Resize flyout height"
          @mousedown.stop="startHeightResize"
        />
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.flyout-shell {
  position: absolute;
  z-index: 50;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background: transparent;
  border: none;
  max-height: calc(100% - 8px);
}

.flyout-shell::before,
.flyout-shell::after {
  content: none;
}

.flyout-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: var(--bg-gradient);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 6px;
}

.flyout-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--window-radius);
  z-index: 1;
  padding: 1.5px;
  background:
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
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.flyout-header {
  position: relative;
  z-index: 2;
  min-height: 24px;
  padding: 10px 12px 0 12px;
  display: grid;
  grid-template-rows: auto auto;
  gap: 8px;
}

.flyout-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.flyout-row-bottom {
  justify-content: flex-start;
}

.flyout-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 500;
  background: var(--wall-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.flyout-subtitle {
  margin: 0;
  color: var(--wall-text);
  font-size: 0.95rem;
}

.flyout-card {
  position: relative;
  z-index: 2;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px;
  overflow: hidden;
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
  pointer-events: auto;
}

.flyout-card-content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--wall-accent) transparent;
  scrollbar-gutter: stable;
  color: var(--wall-text);
  border-radius: 6px;
  z-index: 3;
}

.flyout-outer-resize-handle,
.flyout-height-resize-handle {
  position: absolute;
  z-index: 60;
  padding: 0;
  border: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  user-select: none;
  -webkit-user-select: none;
}

.flyout-outer-resize-handle {
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  touch-action: pan-y;
}

.flyout-shell--left .flyout-outer-resize-handle {
  left: 0;
}

.flyout-shell--right .flyout-outer-resize-handle {
  right: 0;
}

.flyout-height-resize-handle {
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: row-resize;
  touch-action: pan-x;
}

.flyout-resize-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  transition: none;
}

.flyout-fade-enter-active,
.flyout-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.flyout-fade-enter-from,
.flyout-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
