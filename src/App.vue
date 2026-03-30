<script setup lang="ts">
    import { onMounted, ref, computed } from 'vue'
    import { getCurrentWindow } from '@tauri-apps/api/window'
    import { useGameStore } from './stores/gameStore'
    import { check } from '@tauri-apps/plugin-updater'
    import { relaunch } from '@tauri-apps/plugin-process'
    import { getPlatform } from './platform'
    import { wallpaperPaletteState } from './lib/wallpaperPalette'

    const gameStore = useGameStore()
    const appWindow = getCurrentWindow()
    const palette = wallpaperPaletteState.palette
    const paletteHexes = wallpaperPaletteState.hexes
    const roles = wallpaperPaletteState.roles
    const isFallback = wallpaperPaletteState.isFallback
    const isReady = wallpaperPaletteState.isReady
    const gradientStyleVars = computed(() => ({
        '--wall-1': paletteHexes.value[0] ?? '#FF1744',
        '--wall-2': paletteHexes.value[1] ?? '#FF9100',
        '--wall-3': paletteHexes.value[2] ?? '#FFD600',
        '--wall-4': paletteHexes.value[3] ?? '#00E676',
        '--wall-5': paletteHexes.value[4] ?? '#00B0FF',
        '--wall-6': paletteHexes.value[5] ?? '#7C4DFF',

        '--wall-bg': roles.value.background,
        '--wall-surface': roles.value.surface,
        '--wall-accent': roles.value.accent,
        '--wall-accent-2': roles.value.accent2,
        '--wall-accent-soft': roles.value.accentSoft,
        '--wall-highlight': roles.value.highlight,
        '--wall-text': roles.value.text,
    }))

    const isCustomMaximized = ref(false)
    const prevSize = ref<any>(null)
    const prevPos = ref<any>(null)
    
    const sparkleBurstKey = ref(0)
    const showSparkles = ref(false)

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
        void checkForUpdatesSilently()
        try {
            await appWindow.setShadow(true)
        } catch (err) {
            console.error('Failed to set shadow', err)
        }
        await wallpaperPaletteState.refresh()
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
    function triggerSparkles() {
        sparkleBurstKey.value += 1
        showSparkles.value = true
        window.setTimeout(() => {
            showSparkles.value = false
        }, 900)
    }

    function handleCatButtonClick() {
        gameStore.pressCatButton()
        triggerSparkles()
    }
</script>

<template>
  <div
    class="window-root"
    :class="{
      ios: platform.isIOS,
      mac: platform.isMac,
      windows: platform.isWindows,
    }"
  >
    <div class="window-surface" :style="gradientStyleVars">
      <div class="gradient-layer" :class="{ ready: isReady }" :data-fallback="isFallback" />

      <header class="titlebar">
        <div class="left-group">
          <div v-if="platform.isMac || platform.isIOS" class="traffic-lights">
            <button class="mac-btn close" @click.stop="handleClose" aria-label="Close">✕</button>
            <button class="mac-btn minimize" @click.stop="handleMinimize" aria-label="Minimize">—</button>
            <button class="mac-btn maximize" @click.stop="handleMaximizeToggle" aria-label="Maximize">❐</button>
          </div>
          <div v-else-if="platform.isWindows" class="app-icon"></div>
        </div>

        <div class="drag-strip" data-tauri-drag-region>
          <div v-if="platform.isMac || platform.isIOS" class="title-text-mac">Popper Game</div>
          <div v-else-if="platform.isWindows" class="title-text-win">Popper Game</div>
        </div>

        <div v-if="platform.isWindows" class="window-controls">
          <button class="win-btn" @click.stop="handleMinimize" aria-label="Minimize">—</button>
          <button class="win-btn" @click.stop="handleMaximizeToggle" aria-label="Maximize">❐</button>
          <button class="win-btn close" @click.stop="handleClose" aria-label="Close">✕</button>
        </div>
      </header>

      <main class="content">
        <div class="layout-shell">
            <section class="panel-zone zone-1">
            <div class="zone-1-row zone-1-row-top">
                <div class="title-wrap">
                <h1 class="title">Popper Game</h1>
                </div>

                <div class="top-right">
                <div class="counter-pill" @click="handleCatButtonClick">
                    <span class="icon">⭐</span>
                    <span class="value">{{ gameStore.weeklyCount }}</span>
                </div>
                </div>
            </div>

            <div class="zone-1-row zone-1-row-bottom">
                <p class="subtitle">Click on the cat!</p>
            </div>
            </section>

            <section class="panel-zone zone-2">
            <div class="panel-card">
                <div class="panel-card-content game-panel">
                <div class="button-grid">
                    <button
                    v-for="(isUp, index) in gameStore.buttons"
                    :key="index"
                    class="popper-button"
                    :class="{ up: isUp, down: !isUp }"
                    @click="handleButtonClick(index)"
                    >
                    <div class="button-inner">
                        <span v-if="isUp" class="emoji">🐱</span>
                        <span v-else class="emoji">🕳️</span>
                    </div>
                    </button>
                </div>
                </div>
            </div>
            </section>

            <section class="panel-zone zone-3">
            <div class="panel-card">
                <div class="panel-card-content"></div>
            </div>
            </section>

            <section class="panel-zone zone-4">
            <div class="panel-card">
                <div class="panel-card-content"></div>
            </div>
            </section>

            <section class="panel-zone zone-5">
            <div class="panel-card">
                <div class="panel-card-content"></div>
            </div>
            </section>
        </div>
        </main>
    </div>

    <div class="cat-stats-panel">
      <div>Today: {{ gameStore.todayCount }}</div>
      <div>This week: {{ gameStore.weeklyCount }}</div>
      <div>This month: {{ gameStore.monthCount }}</div>
      <div>This year: {{ gameStore.yearCount }}</div>
      <div>All time: {{ gameStore.allTimeCount }}</div>
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
        height: 100dvh;
        min-height: 100dvh;
        position: relative;
        background: transparent;
        overflow: hidden;
    }

    .swatch {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 0px solid rgba(255, 255, 255, 0.12);
    }

    .gradient-layer {
        position: absolute;
        inset: 0;
        background:   
            radial-gradient(circle at -30% 40%, var(--wall-accent) 0%, transparent 45%),
            radial-gradient(circle at 100% 45%, var(--wall-accent-soft) 0%, transparent 60%),
            radial-gradient(circle at 100% 70%, var(--wall-accent-soft) 0%, transparent 40%),
            radial-gradient(circle at 0% 40%, var(--wall-surface) 0%, transparent 40%),
            radial-gradient(circle at 80% 0%, var(--wall-bg) 0%, transparent 28%),
            var(--wall-bg);
        z-index: 0;
        opacity: 0;
        transition: opacity 900ms ease;
    }

        .gradient-layer.ready {
        opacity: 1;
        }

    .window-surface {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 20dvh;
        border-radius: var(--window-radius);
        background: linear-gradient(180deg, #07101d 0%, #0b1320 10%);
    }

        .window-surface::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: var(--window-radius);
            z-index: 1;

            padding: 1.5px;

            background:
                radial-gradient(circle at 100% 0%, var(--wall-accent) 0%, transparent 18%),    
                radial-gradient(circle at 100% 20%, var(--wall-accent-soft) 0%, transparent 70%),
                radial-gradient(circle at 100% 45%, var(--wall-highlight) 0%, transparent 70%),
                radial-gradient(circle at 0% 45%, white 0%, transparent 35%),
                radial-gradient(circle at 100% 80%, var(--wall-accent-2) 0%, transparent 42%),
                radial-gradient(circle at 0% 40%, var(--wall-surface) 0%, transparent 40%),
                radial-gradient(circle at 80% 0%, var(--wall-bg) 0%, transparent 28%),
                
                linear-gradient(
                    165deg,
                    rgba(255, 255, 255, 0.08),
                    rgba(255, 255, 255, 0.40),
                    rgba(255, 255, 255, 0.1)
            );
            backdrop-filter: saturate(160%);
            -webkit-backdrop-filter: saturate(140%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
        }

    .content {
        --section-gap: 8px;
        flex: 1 1 auto;
        position: relative;
        padding:
            calc(8px + env(safe-area-inset-top, 0px))
            8px
            calc(8px + env(safe-area-inset-bottom, 0px));
        overflow: hidden;
    }

    .titlebar {
        position: relative;
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0px 8px 0px 8px;
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
        color: var(--wall-accent);
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
        display: flex;
        align-items: center;
        min-width: 0;
        margin-left: 12px;
    }

    .window-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: 8px;
    }

    .win-btn {
        width: 28px;
        height: 28px;
        border: 0;
        background: transparent;
        color: var(--wall-text);
        cursor: pointer;
        border-radius: 8px;
    }

        .win-btn:hover {
            background: var(--wall-accent-soft);
        }

        .win-btn.close:hover {
            background: rgba(232, 17, 35, 0.9);
            color: white;
        }

    .title-text-win {
        font-size: 13px;
        font-weight: 500;
        color: var(--wall-text);
        pointer-events: none;
    }

    .layout-shell {
        position: relative;
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
        grid-template-rows: auto minmax(280px, 1fr) minmax(160px, 0.72fr) minmax(160px, 0.72fr);
        gap: 8px;
        z-index: 1;
    }

    .panel-zone {
        --section-padding: 0px;
        position: relative;
        border-radius: 8px;
        border: 0px solid var(--wall-bg);
        z-index: 1;
    }

    .zone-1 {
        grid-column: 1 / 3;
        grid-row: 1;
        min-height: 24px;
        padding: 6px 4px;
        display: grid;
        grid-template-rows: auto auto;
        gap: var(--section-gap);
    }

    .zone-1-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--section-gap);
    }

    .zone-1-row-bottom {
        justify-content: flex-start;
    }

    .zone-2 {
        grid-column: 1;
        grid-row: 2 / 5;
        padding: var(--section-padding);
    }

    .zone-3 {
        grid-column: 2;
        grid-row: 2;
        padding: var(--section-padding);
    }

    .zone-4 {
        grid-column: 2;
        grid-row: 3;
        padding: var(--section-padding);
    }

    .zone-5 {
        grid-column: 2;
        grid-row: 4;
        padding: var(--section-padding);
    }

    .panel-card {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
        border-radius: 8px;
        background: linear-gradient(
            180deg,
            rgba(11, 19, 32, 0.72) 0%,
            rgba(7, 14, 24, 0.82) 70%
        );
        border: 1px solid var(--wall-bg);
        box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        z-index: 2;
    }

    .panel-card-content {
        position: relative;
        width: 100%;
        height: 100%;
        z-index: 3;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--wall-accent) transparent;
        scrollbar-gutter: stable;
    }

    .game-panel {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
    }

    .top-right {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        z-index: 4;
    }

    .title-wrap {
        pointer-events: none;
    }

    .title {
        font-size: 2rem;
        margin: 0;
        background: var(--wall-text);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 500;
    }

    .subtitle {
        margin: 0;
        color: var(--wall-text);
        font-size: 1rem;
    }

    .button-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        width: min(100%, 520px);
    }

    @media (max-width: 860px) {
        .layout-shell {
            grid-template-columns: 1fr;
            grid-template-rows: auto minmax(0px, auto) minmax(0px, auto) minmax(0px, auto) minmax(0px, auto);
        }

        .zone-1,
        .zone-2,
        .zone-3,
        .zone-4,
        .zone-5 {
            grid-column: 1;
        }

        .zone-1 { grid-row: 1; }
        .zone-2 { grid-row: 2; }
        .zone-3 { grid-row: 3; }
        .zone-4 { grid-row: 4; }
        .zone-5 { grid-row: 5; }
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
            background: var(--wall-bg);
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

    .counter-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;

        padding: 6px 12px;
        border-radius: 999px;

        font-size: 14px;
        font-weight: 600;

        color: var(--wall-text);

        background: linear-gradient(
            180deg,
            var(--wall-accent-soft),
            var(--wall-surface)
        );

        backdrop-filter: blur(10px) saturate(140%);
        -webkit-backdrop-filter: blur(10px) saturate(140%);

        border: 1px solid var(--wall-bg);

        box-shadow:
            0 0 12px rgba(255, 200, 120, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);

        position: relative;
        overflow: hidden;
    }
        .counter-pill .icon {
            font-size: 14px;
            filter: drop-shadow(0 0 4px var(--wall-surface));
        }

        .counter-pill .value {
            letter-spacing: 0.2px;
    }

    .emoji {
        filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.2));
        user-select: none;
    }
    
    .s1 { top: 18px; left: 12px; animation-delay: 0ms; }
    .s2 { top: 0px; left: 34px; animation-delay: 60ms; }
    .s3 { top: 10px; right: 12px; animation-delay: 120ms; }
    .s4 { bottom: 8px; left: 28px; animation-delay: 180ms; }
    .s5 { bottom: 2px; right: 22px; animation-delay: 240ms; }

    @keyframes sparkle-pop {
    0% {
        opacity: 0;
        transform: translateY(6px) scale(0.4) rotate(0deg);
    }
    20% {
        opacity: 1;
        transform: translateY(0) scale(1) rotate(10deg);
    }
    100% {
        opacity: 0;
        transform: translateY(-14px) scale(1.2) rotate(24deg);
    }
    }
</style>