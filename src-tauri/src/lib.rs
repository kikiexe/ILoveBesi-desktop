use std::fs::OpenOptions;
use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;
use tokio::time::timeout;

#[cfg(unix)]
use std::os::unix::fs::OpenOptionsExt;
#[cfg(unix)]
use std::os::unix::io::AsRawFd;

#[tauri::command]
fn get_app_info() -> String {
    "ILoveBesi POS Desktop v1.1.4".to_string()
}

#[tauri::command]
fn close_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
async fn print_raw_thermal(
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

    let print_task = tokio::task::spawn_blocking(move || -> Result<String, String> {
        match target_type.as_str() {
            "SERIAL" => {
                let trimmed_path = target_path.trim();
                if trimmed_path.is_empty() {
                    return Err("Nama port serial / device path tidak boleh kosong".to_string());
                }

                // Check device / file existence
                let path = std::path::Path::new(trimmed_path);
                if !path.exists() {
                    return Err(format!(
                        "Port atau perangkat serial '{}' tidak ditemukan di sistem. Pastikan perangkat aktif dan terhubung.",
                        trimmed_path
                    ));
                }

                let mut open_opts = OpenOptions::new();
                open_opts.write(true);

                #[cfg(unix)]
                {
                    // O_NONBLOCK: prevent open() and write() from hanging waiting for carrier/DCD
                    // O_NOCTTY: do not make the serial port the controlling terminal
                    open_opts.custom_flags(libc::O_NONBLOCK | libc::O_NOCTTY);
                }

                let mut file = open_opts
                    .open(trimmed_path)
                    .map_err(|e| format!("Gagal membuka port serial '{}': {}", trimmed_path, e))?;

                #[cfg(unix)]
                {
                    // Use poll to verify write readiness with a 2000ms timeout
                    let fd = file.as_raw_fd();
                    let mut pfd = libc::pollfd {
                        fd,
                        events: libc::POLLOUT,
                        revents: 0,
                    };
                    let poll_res = unsafe { libc::poll(&mut pfd, 1, 2000) };
                    if poll_res < 0 {
                        let err = std::io::Error::last_os_error();
                        return Err(format!("Gagal poll port serial: {}", err));
                    }
                    if poll_res == 0 {
                        return Err(format!(
                            "Perangkat serial '{}' tidak merespons (timeout 2 detik). Pastikan printer siap mencetak.",
                            trimmed_path
                        ));
                    }
                }

                file.write_all(&bytes)
                    .map_err(|e| format!("Gagal menulis data ke port serial '{}': {}", trimmed_path, e))?;

                let _ = file.flush();

                Ok(format!("Berhasil mengirim data cetak ke serial port {}", trimmed_path))
            }
            "LAN" => {
                let trimmed_addr = target_path.trim();
                let addrs = trimmed_addr
                    .to_socket_addrs()
                    .map_err(|e| format!("Format alamat printer LAN '{}' tidak valid: {}", trimmed_addr, e))?;

                let mut stream = None;
                for addr in addrs {
                    if let Ok(s) = TcpStream::connect_timeout(&addr, Duration::from_millis(2500)) {
                        stream = Some(s);
                        break;
                    }
                }

                let mut stream = stream.ok_or_else(|| {
                    format!("Gagal menghubungkan ke printer LAN pada '{}'. Pastikan IP dan port benar dan printer menyala.", trimmed_addr)
                })?;

                stream
                    .set_write_timeout(Some(Duration::from_millis(2500)))
                    .map_err(|e| format!("Gagal konfigurasi timeout socket: {}", e))?;

                stream
                    .write_all(&bytes)
                    .map_err(|e| format!("Gagal mengirim data ke printer LAN: {}", e))?;

                stream
                    .flush()
                    .map_err(|e| format!("Gagal flush stream LAN: {}", e))?;

                Ok(format!("Berhasil mengirim data cetak ke printer LAN {}", trimmed_addr))
            }
            _ => Err(format!("Tipe target printer '{}' tidak dikenali", target_type)),
        }
    });

    match timeout(Duration::from_millis(3000), print_task).await {
        Ok(join_res) => match join_res {
            Ok(inner_res) => inner_res,
            Err(join_err) => Err(format!("Task worker printer mengalami error: {}", join_err)),
        },
        Err(_) => Err(
            "Waktu komunikasi dengan printer habis (timeout 3 detik). Antarmuka kasir tetap berjalan normal."
                .to_string(),
        ),
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
