/* Left navigation for preferences. */

<script setup lang="ts">
import { usePreferenceStore } from '@/stores/preferenceStore'
import { usePreferenceControls } from '@/composables/preferences/usePreferenceControls'

const store = usePreferenceStore()
const { tabs } = usePreferenceControls()
</script>

<template>
  <aside class="preference-sidebar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="preference-sidebar__tab"
      :class="{ 'is-active': store.activeTab === tab.id }"
      type="button"
      @click="store.setActiveTab(tab.id)"
    >
      <span class="preference-sidebar__label">{{ tab.label }}</span>
      <span
        v-if="store.savedTabs[tab.id]"
        class="preference-sidebar__saved"
      >
        Saved
      </span>
    </button>
  </aside>
</template>

<style scoped>
.preference-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: max-content;
  max-width: 100%;
  padding: 0.65rem;
  border-radius: 20px;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.preference-sidebar__tab {
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--wall-text, inherit);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.preference-sidebar__tab:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

.preference-sidebar__tab.is-active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  border-color: rgba(255, 255, 255, 0.12);
}

.preference-sidebar__label {
  min-width: 0;
  white-space: nowrap;
}

.preference-sidebar__saved {
  font-size: 0.72rem;
  opacity: 0.72;
  color: inherit;
}
</style>