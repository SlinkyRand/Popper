<script setup lang="ts">
    import { onMounted, ref } from 'vue'
    import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
    import { useGameStore } from './stores/gameStore'

    const gameStore = useGameStore()
    const appWindow = getCurrentWindow()
    const isTest = import.meta.env.TEST

    const isCustomMaximized = ref(false)
    const prevSize = ref<any>(null)
    const prevPos = ref<any>(null)

    onMounted(async () => {
        try {
            const appWindow = getCurrentWindow()
            await appWindow.setShadow(true)
        } catch (err) {
            console.error('Failed to set shadow', err)
        }
    })

    async function handleMinimize() {
        await appWindow.minimize()
    }

    async function handleMaximizeToggle() {
        try {
            if (isCustomMaximized.value) {
                if (prevSize.value && prevPos.value) {
                    await appWindow.setSize(prevSize.value)
                    await appWindow.setPosition(prevPos.value)
                } else {
                    await appWindow.unmaximize()
                }
                isCustomMaximized.value = false
            } else {
                const monitor = await currentMonitor()
                if (monitor) {
                    prevSize.value = await appWindow.outerSize()
                    prevPos.value = await appWindow.outerPosition()
                    
                    await appWindow.setPosition(monitor.workArea.position)
                    await appWindow.setSize(monitor.workArea.size)
                    isCustomMaximized.value = true
                } else {
                    const maximized = await appWindow.isMaximized()
                    if (maximized) {
                        await appWindow.unmaximize()
                    } else {
                        await appWindow.maximize()
                    }
                }
            }
        } catch (e) {
            console.error('Failed to toggle maximize', e)
        }
    }

    async function handleClose() {
        await appWindow.close()
    }

    async function startDragging() {
        await appWindow.startDragging()
    }

    function handleButtonClick(index: number) {
        gameStore.popRandom(index)
    }
</script>

<template>
    <div class="window-root">
        <div class="window-surface">
            <header class="titlebar">
                <div class="left-group" data-tauri-drag-region @mousedown="startDragging">
                    <div class="app-icon"></div>
                </div>

                <div class="drag-strip" data-tauri-drag-region @mousedown="startDragging"></div>

                <div class="window-controls">
                    <button class="win-btn" @click.stop="handleMinimize" aria-label="Minimize">—</button>
                    <button class="win-btn" @click.stop="handleMaximizeToggle" aria-label="Maximize">❐</button>
                    <button class="win-btn close" @click.stop="handleClose" aria-label="Close">✕</button>
                </div>
            </header>

            <main class="content">
                <div class="title-wrap">
                    <h1 class="title">Popper Game</h1>
                    <p class="subtitle">Click on the cat!</p>
                </div>
                <div class="button-grid">
                    <button v-for="(isUp, index) in gameStore.buttons"
                            :key="index"
                            class="popper-button"
                            :class="{ up: isUp, down: !isUp }"
                            @click="handleButtonClick(index)">
                        <div class="button-inner">
                            <span v-if="isUp" class="emoji">🐱</span>
                            <span v-else class="emoji">🕳️</span>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
    .window-root {
        width: 100%;
        height: 100%;
        padding: 6px;
        background: rgba(16, 20, 28, 0.50);
        color: wheat;
        overflow: hidden;
    }

    .window-surface {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 12px;
        background: rgba(16, 20, 28, 0.90);
    }

        .window-surface::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1px;
            background: linear-gradient( 180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.20) );
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(140%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
        }

    .titlebar {
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 8px 0 14px;
    }

    .left-group {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .app-icon {
        width: 14px;
        height: 14px;
        display: block;
        background-image: url('/icon.ico');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        flex: 0 0 14px;
    }

    .drag-strip {
        flex: 1;
        height: 100%;
    }

    .window-controls {
        display: flex;
        align-items: right;
        gap: 0;
        margin-left: 8px;
    }

    .win-btn {
        width: 46px;
        height: 32px;
        border: 0;
        background: transparent;
        color: rgba(255,255,255,0.95);
        cursor: pointer;
        border-radius: 8px;
    }

        .win-btn:hover {
            background: rgba(255,255,255,0.08);
        }

        .win-btn.close:hover {
            background: rgba(232, 17, 35, 0.9);
            color: white;
        }

    .title-wrap {
        pointer-events: none;
    }

    .title {
        font-size: 2rem;
        margin: 0 0 0.35rem 0;
        background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
    }

    .subtitle {
        margin: 0;
        color: rgba(255, 255, 255, 0.62);
        font-size: 1rem;
    }

    .content {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
    }

    .button-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        width: min(100%, 520px);
    }

    .popper-button {
        aspect-ratio: 1;
        border-radius: 18px;
        border: none;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        position: relative;
        outline: none;
    }

        .popper-button.up {
            background: linear-gradient(135deg, #00c6fb 0%, #005bea 100%);
            box-shadow: 0 10px 20px rgba(0, 91, 234, 0.35), inset 0 2px 5px rgba(255, 255, 255, 0.35);
            transform: translateY(-6px);
        }

        .popper-button.down {
            background: rgba(0, 0, 0, 0.22);
            box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.45);
            transform: translateY(2px);
        }

        .popper-button:hover {
            transform: translateY(-2px);
        }

        .popper-button.up:hover {
            transform: translateY(-8px);
        }

        .popper-button:active {
            transform: scale(0.96);
        }

    .button-inner {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        font-size: 1.5rem;
    }

    .emoji {
        filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.2));
        user-select: none;
    }
</style>