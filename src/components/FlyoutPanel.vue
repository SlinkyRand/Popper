<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type FlyoutId = 'zone2' | 'zone3' | 'zone4' | 'counter'

const props = defineProps<{
  id: FlyoutId
  open: boolean
  title: string
  subtitle?: string
  anchorEl?: HTMLElement | null
  containerEl?: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const flyoutEl = ref<HTMLElement | null>(null)
const topPx = ref(0)

const styleVars = computed(() => ({
  top: `${topPx.value}px`,
  width: '350px',
}))

async function updatePosition() {
  await nextTick()

  const anchor = props.anchorEl
  const container = props.containerEl
  const flyout = flyoutEl.value

  if (!anchor || !container || !flyout) return

  const anchorRect = anchor.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const flyoutHeight = flyout.offsetHeight

  const desiredTop = anchorRect.top - containerRect.top
  const maxTop = Math.max(0, containerRect.height - flyoutHeight)

  topPx.value = Math.max(0, Math.min(desiredTop, maxTop))
}

function handleWindowChange() {
  if (props.open) void updatePosition()
}

watch(
  () => [props.open, props.anchorEl, props.containerEl],
  async () => {
    if (props.open) {
      await updatePosition()
    }
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('resize', handleWindowChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowChange)
})
</script>

<template>
  <transition name="flyout-fade">
    <aside
      v-if="open"
      ref="flyoutEl"
      class="flyout-shell"
      :style="styleVars"
    >
      <div class="flyout-panel">
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
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.flyout-shell {
  position: absolute;
  left: 8px;
  width: 350px;
  z-index: 50;
  pointer-events: auto;
  background: transparent;
  border: none;
  box-shadow: none;
}

.flyout-shell::before,
.flyout-shell::after {
  content: none;
}

.flyout-panel {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 8px;
  background: var(--bg-gradient);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 6px 6px 6px 6px;
  flex: 1;
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
  flex: 1;
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