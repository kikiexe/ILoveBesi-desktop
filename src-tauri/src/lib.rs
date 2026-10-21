#[tauri::command]
fn get_app_info() -> String {
    "ILoveBesi POS Desktop v1.0.0".to_string()
}

#[tauri::command]
fn close_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_app_info, close_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
