use tauri_plugin_notification::NotificationExt;
use std::collections::HashMap;
use std::time::Duration;

// GraphQL APIリクエスト用のカスタムコマンド
#[tauri::command]
async fn graphql_request(
    url: String,
    body: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let mut request = client.post(&url);

    for (key, value) in headers {
        request = request.header(&key, &value);
    }

    request = request.header("Content-Type", "application/json");
    request = request.header("User-Agent", "GitHub-PR-Preview/0.1.0");
    request = request.body(body);

    let response = request.send().await.map_err(|e| {
        if e.is_timeout() {
            "Request timeout after 30 seconds".to_string()
        } else {
            e.to_string()
        }
    })?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if status.is_success() {
        Ok(text)
    } else {
        Err(format!("HTTP {}: {}", status.as_u16(), text))
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn request_notification_permission(app: tauri::AppHandle) -> Result<String, String> {
    let permission = app.notification()
        .request_permission()
        .map_err(|e| e.to_string())?;
    Ok(permission.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            graphql_request,
            send_notification,
            request_notification_permission
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
