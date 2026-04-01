import { ref, computed } from 'vue'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { extractColors } from 'extract-colors'

export type WallpaperInfo = {
  path: string
  cache_buster: number
}

export type PaletteColor = {
  hex: string
  red: number
  green: number
  blue: number
  hue: number
  intensity: number
  lightness: number
  saturation: number
  area: number
}

export type WindowStylePalette = {
  colors: PaletteColor[]
  hexes: string[]
  wallpaperUrl: string
  isLoading: boolean
  isFallback: boolean
  isReady: boolean
  refresh: () => Promise<void>
}

type WallpaperPaletteRoles = {
  background: string
  surface: string
  accent: string
  accent2: string
  accentSoft: string
  highlight: string
  text: string
}

function classifyPaletteRoles(colors: PaletteColor[]): WallpaperPaletteRoles {
  if (!colors.length) {
    return {
      background: '#0b1320',
      surface: '#101a2b',
      accent: '#21b0d0ff',
      accent2: '#1e629eff',
      accentSoft: '#7df0d2',
      highlight: '#dbeafe',
      text: 'rgba(255,255,255,0.92)',
    }
  }

  const byLightness = [...colors].sort((a, b) => a.lightness - b.lightness)

  const background = byLightness[0]
  const highlightPool = colors.filter(c => c.hex !== background.hex)

  const accentCandidates = colors
    .filter(c => c.lightness >= 0.4) // avoid very dark accents
    .sort((a, b) => b.saturation - a.saturation)

  const accent = accentCandidates[0] ?? colors[0]

  const accent2 =
    accentCandidates.find(c => c.hex !== accent.hex) ??
    colors.find(c => c.hex !== accent.hex) ??
    accent

  const highlight =
    [...highlightPool.filter(c => c.hex !== accent.hex)].sort((a, b) => b.lightness - a.lightness)[0] ??
    [...colors.filter(c => c.hex !== accent.hex)].sort((a, b) => b.lightness - a.lightness)[0] ??
    accent

  const surface =
    [...colors
      .filter(c => c.hex !== background.hex && c.hex !== accent.hex && c.hex !== highlight.hex)]
      .sort((a, b) => {
        const aScore = Math.abs(a.lightness - 0.32)
        const bScore = Math.abs(b.lightness - 0.32)
        return aScore - bScore
      })[0] ?? background

  const accentSoft =
    [...colors
      .filter(c => c.hex !== accent.hex && c.hex !== background.hex)]
      .sort((a, b) => {
        const satDiff = b.saturation - a.saturation
        if (satDiff !== 0) return satDiff
        return Math.abs(a.lightness - 0.6) - Math.abs(b.lightness - 0.6)
      })[0] ?? accent

  return {
    background: background.hex,
    surface: surface.hex,
    accent: accent.hex,
    accent2: accent2.hex,
    accentSoft: accentSoft.hex,
    highlight: highlight.hex,
    text: 'rgba(255,255,255,0.92)',
  }
}

type CachedWallpaperPalette = {
  wallpaperKey: string
  palette: PaletteColor[]
}

const CACHE_KEY = 'popper.wallpaperPalette.v1'

const FALLBACK_RAINBOW_PALETTE: PaletteColor[] = [
  {
    hex: '#FF1744',
    red: 255, green: 23, blue: 68,
    hue: 348, intensity: 1, lightness: 0.55, saturation: 1, area: 0.16,
  },
  {
    hex: '#FF9100',
    red: 255, green: 145, blue: 0,
    hue: 34, intensity: 1, lightness: 0.5, saturation: 1, area: 0.16,
  },
  {
    hex: '#FFD600',
    red: 255, green: 214, blue: 0,
    hue: 50, intensity: 1, lightness: 0.5, saturation: 1, area: 0.16,
  },
  {
    hex: '#00E676',
    red: 0, green: 230, blue: 118,
    hue: 151, intensity: 1, lightness: 0.45, saturation: 1, area: 0.16,
  },
  {
    hex: '#00B0FF',
    red: 0, green: 176, blue: 255,
    hue: 199, intensity: 1, lightness: 0.5, saturation: 1, area: 0.16,
  },
  {
    hex: '#7C4DFF',
    red: 124, green: 77, blue: 255,
    hue: 256, intensity: 1, lightness: 0.65, saturation: 1, area: 0.16,
  },
]

const wallpaperUrl = ref('')
const palette = ref<PaletteColor[]>([])
const isLoading = ref(false)
const isFallback = ref(false)
const isReady = ref(false)

let lastWallpaperKey = ''

function loadCachedWallpaperPalette(): CachedWallpaperPalette | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CachedWallpaperPalette

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.wallpaperKey !== 'string' ||
      !Array.isArray(parsed.palette) ||
      parsed.palette.length === 0
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function saveCachedWallpaperPalette(wallpaperKey: string, colors: PaletteColor[]) {
  try {
    const payload: CachedWallpaperPalette = {
      wallpaperKey,
      palette: colors,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage failures
  }
}

function clearCachedWallpaperPalette() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore storage failures
  }
}

function applyPalette(colors: PaletteColor[], fallback = false) {
  palette.value = colors
  isFallback.value = fallback
  isReady.value = true
}

function applyFallbackPalette() {
  wallpaperUrl.value = ''
  applyPalette([...FALLBACK_RAINBOW_PALETTE], true)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

async function makeSmallImageData(src: string, targetPixels = 4096): Promise<ImageData> {
  const img = await loadImage(src)

  const originalWidth = img.naturalWidth || img.width
  const originalHeight = img.naturalHeight || img.height
  const originalPixels = originalWidth * originalHeight

  const scale = originalPixels > targetPixels
    ? Math.sqrt(targetPixels / originalPixels)
    : 1

  const width = Math.max(1, Math.round(originalWidth * scale))
  const height = Math.max(1, Math.round(originalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Could not create canvas context')
  }

  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

async function extractPaletteFromWallpaper(src: string): Promise<PaletteColor[]> {
  const imageData = await makeSmallImageData(src, 4096)

  const colors = await extractColors(imageData, {
    pixels: 4096,
    distance: 0.18,
    saturationDistance: 0.16,
    lightnessDistance: 0.16,
    hueDistance: 1 / 24,
    colorValidator: (_r, _g, _b, a = 255) => a > 250,
  })

  if (!colors.length) {
    throw new Error('extract-colors returned no colors')
  }

  return colors.slice(0, 6) as PaletteColor[]
}

async function refresh() {
  isLoading.value = true
  isReady.value = false

  try {
    const info = await invoke<WallpaperInfo>('get_wallpaper_info')
    console.log('wallpaper info from Rust:', info)

    const wallpaperKey = `${info.path}:${info.cache_buster}`
    const src = `${convertFileSrc(info.path)}?v=${info.cache_buster}`
    wallpaperUrl.value = src

    console.log('converted wallpaper src:', src)

    const cached = loadCachedWallpaperPalette()

    if (
      cached &&
      cached.wallpaperKey === wallpaperKey &&
      cached.palette.length > 0
    ) {
      applyPalette(cached.palette, false)
      lastWallpaperKey = wallpaperKey
      console.log('loaded palette from cache')
      return
    }

    if (
      wallpaperKey === lastWallpaperKey &&
      palette.value.length > 0 &&
      !isFallback.value
    ) {
      isReady.value = true
      console.log('wallpaper unchanged in session, skipping')
      return
    }

    await loadImage(src)

    const colors = await extractPaletteFromWallpaper(src)
    console.log('extracted colors:', colors)

    applyPalette(colors, false)
    lastWallpaperKey = wallpaperKey
    saveCachedWallpaperPalette(wallpaperKey, colors)
  } catch (error) {
    console.error('Wallpaper palette refresh failed:', error)
    clearCachedWallpaperPalette()
    applyFallbackPalette()
  } finally {
    isLoading.value = false
  }
}

export function useWallpaperPalette(): WindowStylePalette {
  return {
    get colors() {
      return palette.value
    },
    get hexes() {
      return palette.value.map(color => color.hex)
    },
    get wallpaperUrl() {
      return wallpaperUrl.value
    },
    get isLoading() {
      return isLoading.value
    },
    get isFallback() {
      return isFallback.value
    },
    get isReady() {
      return isReady.value
    },
    refresh,
  }
}

export const wallpaperPaletteState = {
  palette,
  wallpaperUrl,
  isLoading,
  isFallback,
  isReady,
  hexes: computed(() => palette.value.map(color => color.hex)),
  roles: computed(() => classifyPaletteRoles(palette.value)),
  refresh,
}