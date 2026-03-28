import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  // buttons state: true means 'up', false means 'down'
  // 16 buttons for a 4x4 grid, index 0 is initially 'up'
  const buttons = ref(Array.from({ length: 16 }, (_, i) => i === 0))

  function popRandom(currentIndex) {
    // Only proceed if the clicked button is actually 'up'
    if (!buttons.value[currentIndex]) return
    
    // Set all to false first
    buttons.value = buttons.value.map(() => false)
    
    // Pick a random index different from the current one
    let nextIndex
    do {
      nextIndex = Math.floor(Math.random() * 16)
    } while (nextIndex === currentIndex)
    
    buttons.value[nextIndex] = true
  }

  return { buttons, popRandom }
})
