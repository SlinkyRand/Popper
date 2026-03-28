<script setup lang="ts">
    import { onMounted, ref, computed } from 'vue'
    import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
    import { useGameStore } from './stores/gameStore'
    import { check } from '@tauri-apps/plugin-updater'
    import { relaunch } from '@tauri-apps/plugin-process'
    import { getPlatform } from './platform'

    const gameStore = useGameStore()
    const appWindow = getCurrentWindow()
    const isTest = import.meta.env.TEST

    const isCustomMaximized = ref(false)
    const prevSize = ref<any>(null)
    const prevPos = ref<any>(null)

    async function checkForUpdatesSilently() {
  try {
    const update = await check()

    if (!update) {
      return
    }

    // Download and install updates in the background.
    // Do not await progress callbacks unless you want UI for them.
    await update.downloadAndInstall()

    // Restart into the new version after install.
    await relaunch()
  } catch (error) {
    // Keep startup resilient. Do not throw.
    console.error('Background update failed:', error)
  }
}

    onMounted(async () => {
         // Fire and forget so the app loads immediately.
  void checkForUpdatesSilently()
        try {
            const appWindow = getCurrentWindow()
            await appWindow.setShadow(true)
        } catch (err) {
            console.error('Failed to set shadow', err)
        }
    })

    const platform = getPlatform()

    // Window control button handling
    async function handleMinimize() {
        await appWindow.minimize()
    }

    async function handleMaximizeToggle() {
    try {
        const maximized = await appWindow.isMaximized()
        if (maximized) {
            await appWindow.unmaximize()
        } else {
            await appWindow.maximize()
        }
    } catch (e) {
        console.error('Failed to toggle maximize', e)
    }
    }

    async function handleClose() {
        await appWindow.close()
    }

    function handleButtonClick(index: number) {
        gameStore.popRandom(index)
    }
</script>

<template>
    <div class="window-root" 
        :class="{
            ios: platform.isIOS,
            mac: platform.isMac,
            windows: platform.isWindows,
        }">
        <div class="window-surface">
            <header class="titlebar">
                <!--Left section-->
                <div class="left-group">
                <div v-if="platform.isMac || platform.isIOS" class="traffic-lights">
                    <button class="mac-btn close" @click.stop="handleClose" aria-label="Close">✕</button>
                    <button class="mac-btn minimize" @click.stop="handleMinimize" aria-label="Minimize">—</button>
                    <button class="mac-btn maximize" @click.stop="handleMaximizeToggle" aria-label="Maximize">❐</button>
                </div>
                <div v-else-if="platform.isWindows" class="app-icon"></div>
                </div>

                <!--Middle section-->
                <div class="drag-strip" data-tauri-drag-region>
                    <div v-if="platform.isMac || platform.isIOS" class="title-text-mac">Popper Game</div>
                    <div v-else-if="platform.isWindows" class="title-text-win">Popper Game</div>
                
                <!--end dragging controls-->
                </div>

                <!--Right section-->
                <div v-if="platform.isWindows" class="window-controls">
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

<style>
html, body, #app {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
}
</style>

<style scoped>   
    .window-root {
        --window-radius: 16px;
        width: 100%;
        height: 100%;
        position: relative;
        background: transparent;
        overflow: hidden;
    }

    .window-surface {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: var(--window-radius);
        background: linear-gradient(180deg, #07101d 0%, #0b1320 100%);
    }

        .window-surface::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: var(--window-radius);

            /* glass edge */
            box-shadow:
                0 0 0 20px rgba(255,255,255,0.06),
                0 8px 50px rgba(0,0,0,0.6),
                inset 0 1px 0 rgba(255,255,255,0.08);

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
        background: rgb(5, 14, 23)
    }

    .traffic-lights {
        position: absolute;
        left: 14px
        }

    .mac-btn {
        position: relative;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: none;
        padding: 0;
        cursor: pointer;
        }

    /* authentic Mac colors */
    .mac-btn.close    { background: #ff5f57; }
    .mac-btn.minimize { background: #febc2e; }
    .mac-btn.maximize { background: #28c840; }

    .title-text-mac {
        font-size: 13px;
        font-weight: 500;
        color: rgba(255,255,255,0.7);
        pointer-events: none;
        }

    .mac-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        opacity: 0;
        }

    .mac-btn.close:hover::after {
        content: '×';
        color: black;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
        }   

    .left-group {
        display: flex;
        align-items: center;
        gap: 8px;
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
        align-items: center;
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

    .title-text-win {
        font-size: 13px;
        font-weight: 500;
        color: rgba(255,255,255,0.82);
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
        padding: 18px;
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