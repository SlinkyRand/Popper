/* Left navigation for preferences. */

<script setup lang="ts">
import { computed } from 'vue'
import { usePreferenceControls } from '@/composables/preferences/usePreferenceControls'
import { usePreferenceStore } from '@/stores/preferenceStore'
import type { PreferenceTabId } from '@/types/preference.types'

const store = usePreferenceStore()
const { tabs } = usePreferenceControls()

const visibleTabs = computed(() => tabs.value)

function selectTab(tabId: PreferenceTabId) {
  store.setActiveTab(tabId)
}
</script>

<template>
  <aside class="preference-sidebar">
    <template v-for="tab in visibleTabs" :key="tab.id">
      <div v-if="tab.kind === 'divider'" class="preference-sidebar__divider">
        <span>{{ tab.label }}</span>
      </div>

      <button
        v-else
        class="preference-sidebar__tab"
        :class="{ 'is-active': store.activeTab === tab.id }"
        type="button"
        @click="selectTab(tab.id)"
      >
        <span class="preference-sidebar__label">{{ tab.label }}</span>
      </button>
    </template>
  </aside>
</template>

<style scoped>
.preference-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 180px;
  padding: 0.75rem;
}

.preference-sidebar__divider {
  margin: 0.75rem 0 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

.preference-sidebar__tab {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  border-radius: 12px;
  padding: 0.7rem 0.85rem;
  cursor: pointer;
}

.preference-sidebar__tab.is-active {
  background: rgba(255, 255, 255, 0.1);
}

.preference-sidebar__label {
  font: inherit;
}
</style>