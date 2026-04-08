<!-- Renders the active preference tab (General, Hotkeys, or Lists). -->

<script setup lang="ts">
import { computed } from 'vue'
import PreferenceFieldRenderer from '@/components/preferences/PreferenceFieldRenderer.vue'
import PreferenceSectionIcon from '@/components/preferences/PreferenceSectionIcon.vue'
import { usePreferenceControls } from '@/composables/preferences/usePreferenceControls'
import { usePreferenceStore } from '@/stores/preferenceStore'

const store = usePreferenceStore()
const { getSections, getSettingsForSection, getTab } = usePreferenceControls()

const activeTabId = computed(() => store.activeTab)
const tab = computed(() => getTab(activeTabId.value))
const sections = computed(() => getSections(activeTabId.value))
const isSaved = computed(() => Boolean(store.savedTabs[activeTabId.value]))
</script>

<template>
  <section class="preference-tab-panel">
    <header class="preference-tab-panel__header">
      <div>
        <h2 class="preference-tab-panel__title">
          {{ tab?.label }}
        </h2>
        <p v-if="tab?.description" class="preference-tab-panel__description">
          {{ tab.description }}
        </p>
      </div>

      <div class="preference-tab-panel__saved">
        <span v-if="isSaved" class="preference-tab-panel__saved-pill">Saved</span>
      </div>
    </header>

    <div class="preference-tab-panel__content">
      <section
        v-for="section in sections"
        :key="section.id"
        class="preference-tab-section"
      >
        <header class="preference-tab-section__header">
          <div class="preference-tab-section__title-row">
            <PreferenceSectionIcon :section-id="section.id" />
            <h3 class="preference-tab-section__title">{{ section.title }}</h3>
          </div>
          <p
            v-if="section.description"
            class="preference-tab-section__description"
          >
            {{ section.description }}
          </p>
        </header>

        <div class="preference-tab-section__fields">
          <PreferenceFieldRenderer
            v-for="setting in getSettingsForSection(activeTabId, section.id)"
            :key="setting.id"
            :setting="setting"
          />
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.preference-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.preference-tab-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.preference-tab-panel__title {
  margin: 0;
  font-size: 1.4rem;
}

.preference-tab-panel__description {
  margin: 0.35rem 0 0;
  opacity: 0.78;
}

.preference-tab-panel__saved-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 0.82rem;
}

.preference-tab-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.preference-tab-section__title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preference-tab-section__title {
  margin: 0;
  font-size: 1rem;
}

.preference-tab-section__description {
  margin: 0.2rem 0 0;
  font-size: 0.92rem;
  opacity: 0.72;
}

.preference-tab-section__fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>