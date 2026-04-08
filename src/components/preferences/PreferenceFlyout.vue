/* Flyout shell for user interaction with preferences. */

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PreferenceSidebar from '@/components/preferences/PreferenceSidebar.vue'
import PreferenceTabPanel from '@/components/preferences/PreferenceTabPanel.vue'
import { usePreferenceStore } from '@/stores/preferenceStore'

const store = usePreferenceStore()

onMounted(() => { 
  if (!store.hydrated) {
    store.hydrate()
  }
  const saved = store.get('display.preferencesSidebarWidth')
  if (typeof saved === 'number' && saved > 0) {
    sidebarWidth.value = saved
  }
})

const SIDEBAR_WIDTH_MIN = 80
const SIDEBAR_WIDTH_MAX = 320
const SIDEBAR_WIDTH_DEFAULT = 0 // 0 = use natural width (max-content)

const sidebarWidth = ref(SIDEBAR_WIDTH_DEFAULT)
const sidebarStyle = ref<Record<string, string>>({})

let isResizing = false
let resizeStartX = 0
let resizeStartWidth = 0
let resizeCurrent = 0

const prefGhostRef = ref<HTMLElement | null>(null)

function showPrefGhost(rect: { x: number; y: number; width: number; height: number }) {
  const el = prefGhostRef.value
  if (!el) return
  el.style.left = `${rect.x}px`
  el.style.top = `${rect.y}px`
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
  el.style.display = 'block'
}

function hidePrefGhost() {
  const el = prefGhostRef.value
  if (!el) return
  el.style.display = 'none'
}

function startSidebarResize(event: MouseEvent) {
  const sidebar = (event.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null
  if (!sidebar) return

  isResizing = true
  resizeStartX = event.clientX
  resizeStartWidth = sidebarWidth.value > 0 ? sidebarWidth.value : sidebar.getBoundingClientRect().width
  resizeCurrent = resizeStartWidth

  const r = sidebar.getBoundingClientRect()
  showPrefGhost({ x: r.left, y: r.top, width: r.width, height: r.height })

  window.addEventListener('mousemove', onSidebarResize)
  window.addEventListener('mouseup', stopSidebarResize)
  event.preventDefault()
  event.stopPropagation()
}

function onSidebarResize(event: MouseEvent) {
  if (!isResizing) return
  const delta = event.clientX - resizeStartX
  resizeCurrent = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, resizeStartWidth + delta))

  // Update only the ghost — no reactive update during drag
  const el = prefGhostRef.value
  if (el && el.style.display !== 'none') {
    el.style.width = `${resizeCurrent}px`
  }
}

function stopSidebarResize() {
  if (!isResizing) return
  isResizing = false
  window.removeEventListener('mousemove', onSidebarResize)
  window.removeEventListener('mouseup', stopSidebarResize)

  hidePrefGhost()
  // Single commit → single re-render
  sidebarWidth.value = resizeCurrent
  store.set('display.preferencesSidebarWidth', sidebarWidth.value)
}
</script>

<template>
  <div
    class="preference-flyout"
    :style="sidebarWidth > 0 ? { '--pref-sidebar-width': `${sidebarWidth}px` } : {}"
    :class="{ 'has-fixed-sidebar': sidebarWidth > 0 }"
  >
    <PreferenceSidebar class="preference-flyout__sidebar" />

    <button
      class="preference-flyout__sidebar-resize"
      type="button"
      aria-label="Resize preferences sidebar"
      @mousedown="startSidebarResize"
    />

    <!-- Ghost frame for sidebar drag preview -->
    <div ref="prefGhostRef" class="pref-sidebar-ghost" style="display:none" aria-hidden="true" />

    <div class="preference-flyout__main">
      <PreferenceTabPanel v-if="store.hydrated" />
      <div v-else class="preference-flyout__loading">
        Loading preferences…
      </div>
    </div>
  </div>
</template>

<style scoped>
.preference-flyout {
  display: grid;
  grid-template-columns: max-content 8px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  width: 100%;
  height: 100%;
}

.preference-flyout.has-fixed-sidebar {
  grid-template-columns: var(--pref-sidebar-width) 8px minmax(0, 1fr);
}

.preference-flyout__sidebar {
  min-width: 0;
  width: 100%;
}

.preference-flyout__sidebar-resize {
  align-self: stretch;
  width: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  appearance: none;
  -webkit-appearance: none;
  user-select: none;
  -webkit-user-select: none;
  position: relative;
  z-index: 5;
}

.preference-flyout__sidebar-resize::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 32px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  transition: background 160ms ease, height 160ms ease;
}

.preference-flyout__sidebar-resize:hover::after {
  background: rgba(255, 255, 255, 0.35);
  height: 48px;
}

.preference-flyout__main {
  min-width: 0;
  height: 100%;
  padding: 1rem;
  border-radius: 24px;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: auto;
}

.pref-sidebar-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  transition: none;
}

.preference-flyout__loading {
  padding: 1.25rem;
  opacity: 0.72;
}

@media (max-width: 900px) {
  .preference-flyout {
    grid-template-columns: 1fr;
  }

  .preference-flyout__sidebar-resize {
    display: none;
  }
}
</style>