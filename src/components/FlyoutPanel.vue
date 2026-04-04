<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePreferenceStore } from '@/stores/preferenceStore'
import {
  FLYOUT_HEIGHT_DEFAULT,
  FLYOUT_HEIGHT_MAX,
  FLYOUT_HEIGHT_MIN,
  FLYOUT_WIDTH_DEFAULT,
  FLYOUT_WIDTH_MAX,
  FLYOUT_WIDTH_MIN,
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
const panelWidth = ref(FLYOUT_WIDTH_DEFAULT)
const panelHeight = ref(FLYOUT_HEIGHT_DEFAULT)

function clampWidth(value: number) {
  return Math.min(FLYOUT_WIDTH_MAX, Math.max(FLYOUT_WIDTH_MIN, value))
}

function clampHeight(value: number, availableHeight = FLYOUT_HEIGHT_MAX) {
  const boundedMax = Math.max(
    FLYOUT_HEIGHT_MIN,
    Math.min(FLYOUT_HEIGHT_MAX, availableHeight),
  )

  return Math.min(boundedMax, Math.max(FLYOUT_HEIGHT_MIN, value))
}

function readPreferredWidth(): number {
  return clampWidth(
    Number(
      preferenceStore.get(getFlyoutWidthPreferenceId(props.id)) ??
        preferenceStore.get(GLOBAL_FLYOUT_WIDTH_PREFERENCE_ID) ??
        FLYOUT_WIDTH_DEFAULT,
    ),
  )
}

function readPreferredHeight(): number {
  return clampHeight(
    Number(
      preferenceStore.get(getFlyoutHeightPreferenceId(props.id)) ??
        FLYOUT_HEIGHT_DEFAULT,
    ),
    getAvailableHeight(),
  )
}

function getAvailableHeight() {
  const container = props.containerEl
  if (!container) return FLYOUT_HEIGHT_MAX

  const containerRect = container.getBoundingClientRect()
  if (containerRect.height <= 0) return FLYOUT_HEIGHT_MAX

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
let isWidthResizing = false

let heightResizeStartY = 0
let heightResizeStartValue = 0
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

function persistWidth(nextWidth: number) {
  panelWidth.value = clampWidth(nextWidth)
  preferenceStore.set(getFlyoutWidthPreferenceId(props.id), panelWidth.value)
}

function persistHeight(nextHeight: number) {
  panelHeight.value = clampHeight(nextHeight, getAvailableHeight())
  preferenceStore.set(getFlyoutHeightPreferenceId(props.id), panelHeight.value)
}

function startWidthResize(event: MouseEvent) {
  isWidthResizing = true
  widthResizeStartX = event.clientX
  widthResizeStartValue = panelWidth.value

  console.log('[flyout-resize] start', {
    id: props.id,
    side: props.side,
    width: panelWidth.value,
    clientX: event.clientX,
  })

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

  const nextWidth = widthResizeStartValue + delta

  console.log('[flyout-resize] move', {
    id: props.id,
    side: props.side,
    clientX: event.clientX,
    delta,
    startWidth: widthResizeStartValue,
    nextWidth,
  })

  persistWidth(nextWidth)
}

function stopWidthResize() {
  console.log('[flyout-resize] stop', {
    id: props.id,
    width: panelWidth.value,
  })

  isWidthResizing = false
  window.removeEventListener('mousemove', onWidthResize)
  window.removeEventListener('mouseup', stopWidthResize)
}

function startHeightResize(event: MouseEvent) {
  isHeightResizing = true
  heightResizeStartY = event.clientY
  heightResizeStartValue = panelHeight.value

  window.addEventListener('mousemove', onHeightResize)
  window.addEventListener('mouseup', stopHeightResize)

  event.preventDefault()
  event.stopPropagation()
}

function onHeightResize(event: MouseEvent) {
  if (!isHeightResizing) return

  const delta = event.clientY - heightResizeStartY
  persistHeight(heightResizeStartValue + delta)
}

function stopHeightResize() {
  isHeightResizing = false
  window.removeEventListener('mousemove', onHeightResize)
  window.removeEventListener('mouseup', stopHeightResize)
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
    >
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
