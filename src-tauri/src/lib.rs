use std::fs::OpenOptions;
use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

#[tauri::command]
fn get_app_info() -> String {
    "ILoveBesi POS Desktop v1.1.3".to_string()
}

#[tauri::command]
fn close_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn print_raw_thermal(
    target_type: String,
    target_path: String,
    content: String,
    auto_cut: bool,
    open_drawer: bool,
) -> Result<String, String> {
    let mut bytes = Vec::new();

    // 1. ESC @ (Initialize printer)
    bytes.extend_from_slice(&[0x1B, 0x40]);

    // 2. ESC p 0 25 250 (Kick cash drawer RJ11 pulse if enabled)
    if open_drawer {
        bytes.extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }

    // 3. Content bytes
    bytes.extend_from_slice(content.as_bytes());

    // 4. Feed lines
    bytes.extend_from_slice(b"\n\n\n\n");

    // 5. GS V 66 0 (Cut paper if enabled)
    if auto_cut {
        bytes.extend_from_slice(&[0x1D, 0x56, 0x42, 0x00]);
    }

    match target_type.as_str() {
        "SERIAL" => {
            let mut file = OpenOptions::new()
                .write(true)
                .open(&target_path)
                .map_err(|e| format!("Gagal membuka port serial '{}': {}", target_path, e))?;
            file.write_all(&bytes)
                .map_err(|e| format!("Gagal menulis data ke port serial: {}", e))?;
            file.flush()
                .map_err(|e| format!("Gagal flush port serial: {}", e))?;
            Ok(format!("Berhasil mengirim data ke serial port {}", target_path))
        }
        "LAN" => {
            let addrs = target_path
                .to_socket_addrs()
                .map_err(|e| format!("Format alamat printer LAN tidak valid: {}", e))?;
            let mut stream = None;
            for addr in addrs {
                if let Ok(s) = TcpStream::connect_timeout(&addr, Duration::from_secs(3)) {
                    stream = Some(s);
                    break;
                }
            }
            let mut stream = stream.ok_or_else(|| {
                format!("Gagal menghubungkan ke printer LAN pada '{}'", target_path)
            })?;
            stream
                .set_write_timeout(Some(Duration::from_secs(5)))
                .map_err(|e| format!("Gagal konfigurasi timeout socket: {}", e))?;
            stream
                .write_all(&bytes)
                .map_err(|e| format!("Gagal mengirim data ke printer LAN: {}", e))?;
            stream
                .flush()
                .map_err(|e| format!("Gagal flush stream LAN: {}", e))?;
            Ok(format!("Berhasil mengirim data ke printer LAN {}", target_path))
        }
        _ => Err(format!("Tipe target printer '{}' tidak dikenali", target_type)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            close_app,
            print_raw_thermal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
