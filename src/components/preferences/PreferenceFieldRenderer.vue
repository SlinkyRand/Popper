/* Renders a single preference row (label, description, control) based on the registry. */

/* IMPLEMENTATION NOTES */
/* Treat text fields in About as read-only display unless you explicitly mark them editable later. */
/* For action controls, do not bind them like normal values. Render them as buttons and dispatch by setting.id. */

<script setup lang="ts">
import { computed } from 'vue'
import PreferenceHotkeyField from '@/components/preferences/fields/PreferenceHotkeyField.vue'
import PreferenceListManager from '@/components/preferences/fields/PreferenceListManager.vue'
import { usePreferenceControls } from '@/composables/preferences/usePreferenceControls'
import { usePreferenceStore } from '@/stores/preferenceStore'
import { choosePreferenceBackup, downloadPreferenceExport, importPreferenceFile } from '@/utils/preferences/preferenceExportImport'
import { sanitizeImportedPreferenceValues } from '@/utils/preferences/preferenceValidation'
import {
  FLYOUT_HEIGHT_DEFAULT,
  FLYOUT_WIDTH_DEFAULT,
  MAIN_APP_WIDTH_DEFAULT,
} from '@/data/preferences/preference.constants'
import {
  flyoutIds,
  getFlyoutHeightPreferenceId,
  getFlyoutWidthPreferenceId,
  MAIN_APP_WIDTH_PREFERENCE_ID,
} from '@/lib/flyoutLayout'
import type { PreferenceDefinition, PreferenceValue } from '@/types/preference.types'

const props = defineProps<{
  setting: PreferenceDefinition
}>()

const store = usePreferenceStore()
const { usePreference, commitNow } = usePreferenceControls()

const model = usePreference(props.setting.id)

const isToggle = computed(() => props.setting.controlType === 'toggle')
const isSlider = computed(() => props.setting.controlType === 'slider')
const isText = computed(() => props.setting.controlType === 'text')
const isSingleSelect = computed(() => props.setting.controlType === 'single-select')
const isSegmented = computed(() => props.setting.controlType === 'segmented-choice')
const isMultiSelect = computed(() => props.setting.controlType === 'multiselect')
const isAction = computed(() => props.setting.controlType === 'action')
const isHotkey = computed(() => props.setting.controlType === 'hotkey')
const isListManager = computed(() => props.setting.controlType === 'list-manager')

const options = computed(() => props.setting.ui?.options ?? [])
const helpText = computed(() => props.setting.ui?.helpText)
const isReadOnly = computed(() => Boolean(props.setting.ui?.readOnly))

function onTextInput(event: Event) {
  const target = event.target as HTMLInputElement
  model.value = target.value
}

function onToggleInput(event: Event) {
  const target = event.target as HTMLInputElement
  model.value = target.checked
}

function onSliderInput(event: Event) {
  const target = event.target as HTMLInputElement
  model.value = Number(target.value)
}

function onSelectInput(event: Event) {
  const target = event.target as HTMLSelectElement
  model.value = target.value
}

function onSegmentedSelect(value: string) {
  model.value = value
}

function onMultiSelectToggle(optionValue: string, checked: boolean) {
  const current = Array.isArray(model.value) ? [...model.value] : []

  if (checked) {
    if (!current.includes(optionValue)) {
      current.push(optionValue)
    }
    model.value = current
    return
  }

  model.value = current.filter((item) => item !== optionValue)
}

function onSpecialFieldUpdate(value: PreferenceValue) {
  model.value = value
}

function onBlurCommit() {
  commitNow()
}

async function handleAction() {
  switch (props.setting.id) {
    case 'display.resetLayout': {
      if (!window.confirm('Reset display layout preferences to defaults?')) return

      const resetValues: Record<string, PreferenceValue> = {
        'display.screenAnchor': store.getDefinition('display.screenAnchor')?.defaultValue ?? 'right',
        'display.rememberWindowBounds':
          store.getDefinition('display.rememberWindowBounds')?.defaultValue ?? true,
        'display.flyoutSide':
          store.getDefinition('display.flyoutSide')?.defaultValue ?? 'auto',
        'display.snapToScreenEdge':
          store.getDefinition('display.snapToScreenEdge')?.defaultValue ?? true,
        'display.autoHide':
          store.getDefinition('display.autoHide')?.defaultValue ?? true,
        'display.edgeTriggerDelay':
          store.getDefinition('display.edgeTriggerDelay')?.defaultValue ?? 400,
        'display.hideGracePeriod':
          store.getDefinition('display.hideGracePeriod')?.defaultValue ?? 4000,
        [MAIN_APP_WIDTH_PREFERENCE_ID]:
          store.getDefinition(MAIN_APP_WIDTH_PREFERENCE_ID)?.defaultValue ?? MAIN_APP_WIDTH_DEFAULT,
        'display.flyoutWidth':
          store.getDefinition('display.flyoutWidth')?.defaultValue ?? FLYOUT_WIDTH_DEFAULT,
        'display.sidebarCollapsedByDefault':
          store.getDefinition('display.sidebarCollapsedByDefault')?.defaultValue ?? false,
      }

      for (const flyoutId of flyoutIds) {
        const widthId = getFlyoutWidthPreferenceId(flyoutId)
        const heightId = getFlyoutHeightPreferenceId(flyoutId)

        resetValues[widthId] = store.getDefinition(widthId)?.defaultValue ?? FLYOUT_WIDTH_DEFAULT
        resetValues[heightId] = store.getDefinition(heightId)?.defaultValue ?? FLYOUT_HEIGHT_DEFAULT
      }

      store.batchSet(resetValues, 'display')
      break
    }

    case 'dataPrivacy.resetPreferences': {
      if (!window.confirm('Reset all preferences to defaults?')) return
      store.resetAll()
      break
    }

    case 'dataPrivacy.exportPreferences': {
      downloadPreferenceExport(store.values)
      break
    }

    case 'dataPrivacy.importPreferences': {
      const importedSnapshot = await importPreferenceFile()
      const sanitized = sanitizeImportedPreferenceValues(importedSnapshot)

      if (!sanitized) {
        window.alert('That file could not be imported.')
        return
      }

      if (!window.confirm('Import these preferences and replace current values where available?')) {
        return
      }

      store.importValues(sanitized)
      break
    }

    case 'dataPrivacy.restoreBackup': {
      const backup = await choosePreferenceBackup()
      if (!backup) return

      if (!window.confirm(`Restore backup from ${new Date(backup.updatedAt).toLocaleString()}?`)) {
        return
      }

      store.importValues(backup.values)
      break
    }

    case 'advanced.clearCachedUiState': {
      if (!window.confirm('Clear cached UI state?')) return
      localStorage.removeItem('popper.ui.cache')
      console.info('Cleared cached UI state')
      break
    }

    case 'about.openLicenses':
    case 'about.openChangelog':
    case 'halp.openHelpCenter':
    case 'halp.contactSupport': {
      console.info(`Action not wired yet: ${props.setting.id}`)
      break
    }

    default:
      console.info(`Unhandled action: ${props.setting.id}`)
  }
}
</script>

<template>
  <div class="preference-field" :class="`is-${setting.controlType}`">
    <div class="preference-field__header">
      <div class="preference-field__meta">
        <label class="preference-field__label">
          {{ setting.label }}
        </label>

        <p v-if="setting.description" class="preference-field__description">
          {{ setting.description }}
        </p>

        <p v-if="helpText" class="preference-field__help">
          {{ helpText }}
        </p>
      </div>

      <div class="preference-field__control">
        <template v-if="isToggle">
          <label class="toggle-wrap">
            <input
              type="checkbox"
              :checked="Boolean(model)"
              @change="onToggleInput"
            />
            <span>{{ Boolean(model) ? 'On' : 'Off' }}</span>
          </label>
        </template>

        <template v-else-if="isSlider">
          <div class="slider-wrap">
            <input
              type="range"
              :min="setting.ui?.min"
              :max="setting.ui?.max"
              :step="setting.ui?.step ?? 1"
              :value="Number(model)"
              @input="onSliderInput"
              @change="onBlurCommit"
              @mouseup="onBlurCommit"
              @touchend="onBlurCommit"
            />
            <span class="slider-wrap__value">
              {{ model }}{{ setting.ui?.unit ?? '' }}
            </span>
          </div>
        </template>

        <template v-else-if="isText">
          <input
            class="text-input"
            type="text"
            :value="String(model ?? '')"
            :placeholder="setting.ui?.placeholder"
            :readonly="isReadOnly"
            @input="onTextInput"
            @blur="onBlurCommit"
          />
        </template>

        <template v-else-if="isSingleSelect">
          <select
            class="select-input"
            :value="String(model ?? '')"
            @change="onSelectInput"
          >
            <option
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </option>
          </select>
        </template>

        <template v-else-if="isSegmented">
          <div class="segmented-group">
            <button
              v-for="option in options"
              :key="option.value"
              type="button"
              class="segmented-group__button"
              :class="{ 'is-active': model === option.value }"
              @click="onSegmentedSelect(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </template>

        <template v-else-if="isMultiSelect">
          <div class="multiselect-list">
            <label
              v-for="option in options"
              :key="option.value"
              class="multiselect-list__item"
            >
              <input
                type="checkbox"
                :checked="Array.isArray(model) && model.includes(option.value)"
                @change="onMultiSelectToggle(option.value, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>
        </template>

        <template v-else-if="isHotkey">
          <PreferenceHotkeyField
            :model-value="String(model ?? '')"
            :setting="setting"
            @update:model-value="onSpecialFieldUpdate"
            @commit="onBlurCommit"
          />
        </template>

        <template v-else-if="isListManager">
          <PreferenceListManager
            :model-value="Array.isArray(model) ? model : []"
            :setting="setting"
            @update:model-value="onSpecialFieldUpdate"
            @commit="onBlurCommit"
          />
        </template>

        <template v-else-if="isAction">
          <button
            type="button"
            class="action-button"
            :class="{ 'is-danger': setting.ui?.danger }"
            @click="handleAction"
          >
            {{ setting.label }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preference-field {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.preference-field__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.preference-field__meta {
  flex: 1;
  min-width: 0;
}

.preference-field__label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.preference-field__description,
.preference-field__help {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.35;
  opacity: 0.8;
}

.preference-field__help {
  margin-top: 0.35rem;
  opacity: 0.66;
}

.preference-field__control {
  min-width: 220px;
  max-width: 360px;
}

.toggle-wrap,
.multiselect-list__item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.slider-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.slider-wrap input[type='range'] {
  flex: 1;
}

.slider-wrap__value {
  min-width: 3.5rem;
  text-align: right;
  font-size: 0.92rem;
}

.text-input,
.select-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.7rem 0.85rem;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  color: inherit;
}

.segmented-group {
  display: inline-flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.segmented-group__button,
.action-button {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.6rem 0.85rem;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  color: inherit;
  cursor: pointer;
}

.segmented-group__button.is-active {
  background: rgba(255, 255, 255, 0.16);
}

.multiselect-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.action-button.is-danger {
  background: rgba(255, 120, 120, 0.18);
}

@media (max-width: 820px) {
  .preference-field__header {
    flex-direction: column;
  }

  .preference-field__control {
    min-width: 0;
    width: 100%;
    max-width: none;
  }
}
</style>