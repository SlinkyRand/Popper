/* Flyout shell for user interaction with preferences. */

<script setup lang="ts">
import { onMounted } from 'vue'
import PreferenceSidebar from '@/components/preferences/PreferenceSidebar.vue'
import PreferenceTabPanel from '@/components/preferences/PreferenceTabPanel.vue'
import { usePreferenceStore } from '@/stores/preferenceStore'

const store = usePreferenceStore()

onMounted(() => { 
  if (!store.hydrated) {
    store.hydrate()
  }
})
</script>

<template>
  <div class="preference-flyout">
    <PreferenceSidebar class="preference-flyout__sidebar" />

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
  --preference-sidebar-width: clamp(180px, calc(var(--pref-flyout-width) * 0.33), 220px);

  display: grid;
  grid-template-columns: var(--preference-sidebar-width) minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
  width: 100%;
}
.preference-flyout__sidebar {
  min-width: 0;
}

.preference-flyout__main {
  min-width: 0;
  padding: 1rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.05);
}

.preference-flyout__loading {
  padding: 1.25rem;
  opacity: 0.72;
}

@media (max-width: 900px) {
  .preference-flyout {
    grid-template-columns: 1fr;
  }
}
</style>