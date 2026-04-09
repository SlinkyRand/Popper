import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'

type WindowAnchor = 'left' | 'right' | 'center'

type UseAutoHideOptions = {
  enabled: ComputedRef<boolean> | Ref<boolean>
  anchor: ComputedRef<WindowAnchor> | Ref<WindowAnchor>
  edgeTriggerDelay: ComputedRef<number> | Ref<number>
  hideGracePeriod: ComputedRef<number> | Ref<number>
  totalWindowWidth: ComputedRef<number> | Ref<number>
}

const SENSOR_STRIP_WIDTH = 16
const REVEALED_GRACE_ZONE_WIDTH = 100

export function useAutoHide(options: UseAutoHideOptions) {
  const isAutoHideEnabled = computed(
    () => Boolean(options.enabled.value) && options.anchor.value !== 'center',
  )
  const isRevealed = ref(!isAutoHideEnabled.value)
  const isPointerInside = ref(false)

  let dwellTimer: number | null = null
  let hideTimer: number | null = null

  function clearDwellTimer() {
    if (dwellTimer !== null) {
      window.clearTimeout(dwellTimer)
      dwellTimer = null
    }
  }

  function clearHideTimer() {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function clearTimers() {
    clearDwellTimer()
    clearHideTimer()
  }

  function reveal() {
    clearTimers()
    isRevealed.value = true
  }

  function hide() {
    clearTimers()

    if (!isAutoHideEnabled.value) {
      isRevealed.value = true
      return
    }

    isRevealed.value = false
  }

  function scheduleReveal() {
    if (dwellTimer !== null || !isPointerInside.value) {
      return
    }

    if (!isAutoHideEnabled.value || isRevealed.value) {
      return
    }

    dwellTimer = window.setTimeout(() => {
      dwellTimer = null

      if (!isPointerInside.value || !isAutoHideEnabled.value) {
        return
      }

      isRevealed.value = true
    }, Math.max(0, Number(options.edgeTriggerDelay.value) || 0))
  }

  function scheduleHide() {
    clearHideTimer()

    if (!isAutoHideEnabled.value || !isRevealed.value) {
      return
    }

    hideTimer = window.setTimeout(() => {
      hideTimer = null
      isRevealed.value = false
    }, Math.max(0, Number(options.hideGracePeriod.value) || 0))
  }

  function handleMouseEnter() {
    isPointerInside.value = true
    clearHideTimer()

    if (!isAutoHideEnabled.value || isRevealed.value) {
      return
    }

    scheduleReveal()
  }

  function handleMouseMove() {
    isPointerInside.value = true
    clearHideTimer()

    if (!isAutoHideEnabled.value || isRevealed.value) {
      return
    }

    scheduleReveal()
  }

  function handleMouseLeave() {
    isPointerInside.value = false
    clearDwellTimer()

    if (!isAutoHideEnabled.value || !isRevealed.value) {
      return
    }

    scheduleHide()
  }

  watch(
    isAutoHideEnabled,
    (enabled) => {
      clearTimers()
      isPointerInside.value = false
      isRevealed.value = !enabled
    },
    { immediate: true },
  )

  const desiredWindowWidth = computed(() => {
    if (isAutoHideEnabled.value && !isRevealed.value) {
      return SENSOR_STRIP_WIDTH
    }

    const baseWidth = Math.max(
      SENSOR_STRIP_WIDTH,
      Math.round(Number(options.totalWindowWidth.value) || 0),
    )

    return isAutoHideEnabled.value ? baseWidth + REVEALED_GRACE_ZONE_WIDTH : baseWidth
  })

  onBeforeUnmount(() => {
    clearTimers()
  })

  return {
    sensorStripWidth: computed(() => SENSOR_STRIP_WIDTH),
    revealedGraceZoneWidth: computed(() =>
      isAutoHideEnabled.value && isRevealed.value ? REVEALED_GRACE_ZONE_WIDTH : 0,
    ),
    isAutoHideEnabled,
    isRevealed,
    desiredWindowWidth,
    reveal,
    hide,
    clearTimers,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  }
}
