/* Component for Hotkey control type. */

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { PreferenceDefinition } from '@/types/preference.types'

const props = defineProps<{
  modelValue: string
  setting: PreferenceDefinition
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'commit'): void
}>()

const localValue = ref(props.modelValue)
const capturing = ref(false)
const captureButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.modelValue,
  (next) => {
    localValue.value = next
  },
)

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = []

  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Meta')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const ignored = ['Control', 'Shift', 'Alt', 'Meta']
  if (!ignored.includes(event.key)) {
    parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key)
  }

  return parts.join('+')
}

async function beginCapture() {
  capturing.value = true
  await nextTick()
  captureButton.value?.focus()
}

function endCapture() {
  if (!capturing.value) return
  capturing.value = false
  emit('commit')
}

function clearValue() {
  localValue.value = ''
  emit('update:modelValue', '')
  emit('commit')
}

function onKeydown(event: KeyboardEvent) {
  if (!capturing.value) return

  event.preventDefault()
  event.stopPropagation()

  if (event.key === 'Escape') {
    endCapture()
    return
  }

  const value = normalizeKey(event)
  if (!value) return

  localValue.value = value
  emit('update:modelValue', value)
  endCapture()
}
</script>

<template>
  <div class="hotkey-field">
    <button
      ref="captureButton"
      type="button"
      class="hotkey-field__capture"
      :class="{ 'is-capturing': capturing }"
      @click="beginCapture"
      @keydown="onKeydown"
      @blur="endCapture"
    >
      {{ capturing ? 'Press shortcut…' : (localValue || 'Set shortcut') }}
    </button>

    <button
      v-if="localValue"
      type="button"
      class="hotkey-field__clear"
      @click="clearValue"
    >
      Clear
    </button>
  </div>
</template>

<style scoped>
.hotkey-field {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.hotkey-field__capture,
.hotkey-field__clear {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  color: inherit;
  cursor: pointer;
}

.hotkey-field__capture.is-capturing {
  outline: 1px solid rgba(255, 255, 255, 0.3);
}
</style>