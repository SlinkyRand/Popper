import { ref } from 'vue'

export type FlyoutId = 'zone2' | 'zone3' | 'zone4' | 'counter'

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