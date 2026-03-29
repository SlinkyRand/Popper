#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod wallpaper;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            wallpaper::get_wallpaper_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}