export function getPlatform() {
  const ua = navigator.userAgent.toLowerCase()
  const touch = navigator.maxTouchPoints || 0

  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (touch > 1 && /mac/.test(ua)) // iPadOS

  const isAndroid = /android/.test(ua)

  const isMobile = isIOS || isAndroid

  const isMac = !isIOS && /mac/.test(ua)
  const isWindows = /win/.test(ua)

  return {
    isIOS,
    isAndroid,
    isMobile,
    isMac,
    isWindows
  }
}