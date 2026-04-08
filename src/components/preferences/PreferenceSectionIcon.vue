<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  sectionId: string
  size?: number
}>(), {
  size: 22,
})

const iconMap: Record<string, { symbol: string; start: string; end: string }> = {
  identity: { symbol: 'person', start: '#5b8cff', end: '#7cf6ff' },
  regional: { symbol: 'public', start: '#3f7fff', end: '#57d0ff' },
  positioning: { symbol: 'pin_drop', start: '#ff8a65', end: '#ffb74d' },
  openBehavior: { symbol: 'rocket_launch', start: '#7c4dff', end: '#b388ff' },
  appearance: { symbol: 'palette', start: '#ff5f9e', end: '#ffb86b' },
  motion: { symbol: 'animation', start: '#00c6ff', end: '#0072ff' },
  layout: { symbol: 'dashboard', start: '#00c9a7', end: '#7df9c1' },
  displayActions: { symbol: 'tune', start: '#26a69a', end: '#80cbc4' },
  tasks: { symbol: 'task_alt', start: '#4caf50', end: '#8bc34a' },
  calendar: { symbol: 'calendar_month', start: '#42a5f5', end: '#64b5f6' },
  counter: { symbol: 'leaderboard', start: '#ffb300', end: '#ffd54f' },
  organization: { symbol: 'folder', start: '#8d6e63', end: '#bcaaa4' },
  setup: { symbol: 'auto_awesome', start: '#ab47bc', end: '#ce93d8' },
  tips: { symbol: 'lightbulb', start: '#ffca28', end: '#fff176' },
  globalHotkeys: { symbol: 'keyboard', start: '#29b6f6', end: '#81d4fa' },
  appHotkeys: { symbol: 'keyboard_command_key', start: '#5c6bc0', end: '#9fa8da' },
  hotkeyBehavior: { symbol: 'rule_settings', start: '#7e57c2', end: '#b39ddb' },
  privacy: { symbol: 'shield', start: '#26c6da', end: '#80deea' },
  storage: { symbol: 'storage', start: '#8bc34a', end: '#c5e1a5' },
  sync: { symbol: 'sync', start: '#26a69a', end: '#80cbc4' },
  dataActions: { symbol: 'import_export', start: '#ef5350', end: '#ff8a65' },
  generalNotifications: { symbol: 'notifications', start: '#ff7043', end: '#ffb74d' },
  experiments: { symbol: 'science', start: '#42a5f5', end: '#90caf9' },
  debugging: { symbol: 'bug_report', start: '#ec407a', end: '#f48fb1' },
  advancedActions: { symbol: 'build_circle', start: '#78909c', end: '#b0bec5' },
  buildInfo: { symbol: 'info', start: '#5c6bc0', end: '#9fa8da' },
  legal: { symbol: 'gavel', start: '#8d6e63', end: '#bcaaa4' },
  support: { symbol: 'support_agent', start: '#26c6da', end: '#80deea' },
  contactLinks: { symbol: 'forum', start: '#7e57c2', end: '#b39ddb' },
}

const iconMeta = computed(() => {
  return iconMap[props.sectionId] ?? { symbol: 'settings', start: '#78909c', end: '#b0bec5' }
})

const iconStyle = computed(() => ({
  '--section-icon-size': `${props.size}px`,
  '--section-icon-start': iconMeta.value.start,
  '--section-icon-end': iconMeta.value.end,
}))
</script>

<template>
  <span class="preference-section-icon" :style="iconStyle" aria-hidden="true">
    <span class="material-symbols-rounded preference-section-icon__glyph">
      {{ iconMeta.symbol }}
    </span>
  </span>
</template>

<style scoped>
.preference-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--section-icon-size) + 0.65rem);
  height: calc(var(--section-icon-size) + 0.65rem);
  border-radius: 14px;
  background: linear-gradient(135deg, var(--section-icon-start), var(--section-icon-end));
  box-shadow:
    0 8px 18px color-mix(in srgb, var(--section-icon-start) 30%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  color: white;
  flex: 0 0 auto;
}

.preference-section-icon__glyph {
  font-size: var(--section-icon-size);
  line-height: 1;
  font-variation-settings:
    'FILL' 1,
    'wght' 500,
    'GRAD' 0,
    'opsz' 24;
}
</style>
