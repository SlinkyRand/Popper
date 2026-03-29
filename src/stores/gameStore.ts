import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type CounterBuckets = {
  today: number
  week: number
  month: number
  year: number
  allTime: number
  lastPressedAt: string | null
}

function getTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function getWeekKey(date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)

  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)

  return d.toISOString().slice(0, 10)
}

function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getYearKey(date = new Date()): string {
  return String(date.getFullYear())
}

export const useGameStore = defineStore(
  'gamePopper',
  () => {
    const buttons = ref<boolean[]>(
      Array.from({ length: 16 }, (_, i) => i === 0)
    )

    const todayKey = ref<string>(getTodayKey())
    const weekKey = ref<string>(getWeekKey())
    const monthKey = ref<string>(getMonthKey())
    const yearKey = ref<string>(getYearKey())

    const counts = ref<CounterBuckets>({
      today: 0,
      week: 0,
      month: 0,
      year: 0,
      allTime: 0,
      lastPressedAt: null
    })

    function rolloverIfNeeded(): void {
      const now = new Date()

      const newTodayKey = getTodayKey(now)
      const newWeekKey = getWeekKey(now)
      const newMonthKey = getMonthKey(now)
      const newYearKey = getYearKey(now)

      if (todayKey.value !== newTodayKey) {
        todayKey.value = newTodayKey
        counts.value.today = 0
      }

      if (weekKey.value !== newWeekKey) {
        weekKey.value = newWeekKey
        counts.value.week = 0
      }

      if (monthKey.value !== newMonthKey) {
        monthKey.value = newMonthKey
        counts.value.month = 0
      }

      if (yearKey.value !== newYearKey) {
        yearKey.value = newYearKey
        counts.value.year = 0
      }
    }

    function pressCatButton(): void {
      rolloverIfNeeded()

      counts.value.today += 1
      counts.value.week += 1
      counts.value.month += 1
      counts.value.year += 1
      counts.value.allTime += 1
      counts.value.lastPressedAt = new Date().toISOString()
    }

    function popRandom(currentIndex: number): void {
      if (!buttons.value[currentIndex]) return

      buttons.value = buttons.value.map(() => false)

      let nextIndex: number
      do {
        nextIndex = Math.floor(Math.random() * 16)
      } while (nextIndex === currentIndex)

      buttons.value[nextIndex] = true
    }

    const todayCount = computed(() => counts.value.today)
    const weeklyCount = computed(() => counts.value.week)
    const monthCount = computed(() => counts.value.month)
    const yearCount = computed(() => counts.value.year)
    const allTimeCount = computed(() => counts.value.allTime)

    return {
      buttons,
      counts,
      todayKey,
      weekKey,
      monthKey,
      yearKey,
      popRandom,
      rolloverIfNeeded,
      pressCatButton,
      todayCount,
      weeklyCount,
      monthCount,
      yearCount,
      allTimeCount
    }
  },
  {
    persist: {
      key: 'cat-popper-game',
      storage: localStorage
    }
  }
)