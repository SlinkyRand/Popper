/* Component for List control type. */

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PreferenceDefinition } from '@/types/preference.types'

const props = defineProps<{
  modelValue: string[]
  setting: PreferenceDefinition
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'commit'): void
}>()

const items = ref<string[]>([...props.modelValue])
const draft = ref('')

watch(
  () => props.modelValue,
  (next) => {
    items.value = [...next]
  },
)

function update(next: string[]) {
  items.value = next
  emit('update:modelValue', next)
}

function addItem() {
  const trimmed = draft.value.trim()
  if (!trimmed) return
  if (items.value.includes(trimmed)) {
    draft.value = ''
    return
  }

  update([...items.value, trimmed])
  draft.value = ''
  emit('commit')
}

function removeItem(index: number) {
  update(items.value.filter((_, i) => i !== index))
  emit('commit')
}

function moveItem(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.value.length) return

  const next = [...items.value]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)

  update(next)
  emit('commit')
}
</script>

<template>
  <div class="list-manager">
    <div class="list-manager__input-row">
      <input
        v-model="draft"
        class="list-manager__input"
        type="text"
        :placeholder="setting.ui?.placeholder || 'Add item'"
        @keydown.enter.prevent="addItem"
      />
      <button type="button" class="list-manager__add" @click="addItem">
        Add
      </button>
    </div>

    <ul class="list-manager__list">
      <li v-for="(item, index) in items" :key="`${item}-${index}`" class="list-manager__item">
        <span class="list-manager__text">{{ item }}</span>

        <div class="list-manager__actions">
          <button type="button" @click="moveItem(index, -1)">↑</button>
          <button type="button" @click="moveItem(index, 1)">↓</button>
          <button type="button" @click="removeItem(index)">Remove</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-manager {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.list-manager__input-row {
  display: flex;
  gap: 0.5rem;
}

.list-manager__input,
.list-manager__add,
.list-manager__actions button {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  color: inherit;
}

.list-manager__input {
  flex: 1;
  padding: 0.7rem 0.85rem;
}

.list-manager__add,
.list-manager__actions button {
  padding: 0.55rem 0.75rem;
  cursor: pointer;
}

.list-manager__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-manager__item {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: var(--preference-surface-background, var(--app-titlebar-background));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.list-manager__text {
  word-break: break-word;
}

.list-manager__actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
</style>