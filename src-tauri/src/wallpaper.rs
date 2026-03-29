use serde::Serialize;
use std::time::UNIX_EPOCH;

#[derive(Serialize)]
pub struct WallpaperInfo {
    path: String,
    cache_buster: u64,
}

#[tauri::command]
pub fn get_wallpaper_info() -> Result<WallpaperInfo, String> {
    let original_path = ::wallpaper::get()
        .map_err(|e| format!("Failed to get wallpaper path: {e}"))?;

    // Read original wallpaper
    let bytes = std::fs::read(&original_path)
        .map_err(|e| format!("Failed to read wallpaper: {e}"))?;

    // Write to temp file with extension
    let temp_path = std::env::temp_dir().join("popper_wallpaper.jpg");

    std::fs::write(&temp_path, bytes)
        .map_err(|e| format!("Failed to write temp wallpaper: {e}"))?;

    let cache_buster = std::fs::metadata(&temp_path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    Ok(WallpaperInfo {
        path: temp_path.to_string_lossy().to_string(),
        cache_buster,
    })
}

const CACHE_KEY = 'wallpaperPalette'

function loadCachedPalette() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveCachedPalette(palette: any) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(palette))
  } catch {
    // ignore storage errors
  }
}