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
}

.preference-sidebar__tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.preference-sidebar__label {
  min-width: 0;
}

.preference-sidebar__saved {
  font-size: 0.72rem;
  opacity: 0.72;
}
</style>