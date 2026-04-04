import { ref } from 'vue'
import type { FlyoutId } from '@/lib/flyoutLayout'

export type { FlyoutId } from '@/lib/flyoutLayout'

export function useFlyouts() {
  const activeFlyout = ref<FlyoutId | null>(null)

  function openFlyout(id: FlyoutId) {
    activeFlyout.value = id
  }

  function closeFlyout() {
    activeFlyout.value = null
  }

  function toggleFlyout(id: FlyoutId) {
    activeFlyout.value = activeFlyout.value === id ? null : id
  }

  function isOpen(id: FlyoutId) {
    return activeFlyout.value === id
  }

  return {
    activeFlyout,
    openFlyout,
    closeFlyout,
    toggleFlyout,
    isOpen,
  }
}