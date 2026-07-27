use tauri_plugin_notification::NotificationExt;
use std::collections::HashMap;
use std::error::Error as StdError;
use std::sync::OnceLock;
use std::time::Duration;

// 接続はすぐ諦め、ボディの受信は「止まったら」諦める。
// 全体タイムアウトだけだと、巨大なレスポンスを配信中でも一律で切られてしまう。
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const READ_TIMEOUT: Duration = Duration::from_secs(30);
const TOTAL_TIMEOUT: Duration = Duration::from_secs(120);

// reqwest::Client はコネクションプールを内包するため、リクエストごとに作ると
// 毎回TLSハンドシェイクからやり直しになる
fn http_client() -> Result<&'static reqwest::Client, String> {
    static CLIENT: OnceLock<Result<reqwest::Client, String>> = OnceLock::new();

    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .connect_timeout(CONNECT_TIMEOUT)
                .read_timeout(READ_TIMEOUT)
                .timeout(TOTAL_TIMEOUT)
                .build()
                .map_err(|e| e.to_string())
        })
        .as_ref()
        .map_err(|e| e.clone())
}

// reqwest 0.12以降のDisplayはsourceを出力しないため、辿って連結する。
// これがないと "error decoding response body for url (...)" だけが残り、
// タイムアウトなのか接続断なのか区別できなくなる。
fn format_transport_error(error: &dyn StdError, is_timeout: bool) -> String {
    let mut chain = vec![error.to_string()];
    let mut source = error.source();

    while let Some(err) = source {
        chain.push(err.to_string());
        source = err.source();
    }

    let message = chain.join(": ");

    if is_timeout {
        format!("Request timeout: {}", message)
    } else {
        message
    }
}

// GraphQL APIリクエスト用のカスタムコマンド
#[tauri::command]
async fn graphql_request(
    url: String,
    body: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let client = http_client()?;

    let mut request = client.post(&url);

    for (key, value) in headers {
        request = request.header(&key, &value);
    }

    request = request.header("Content-Type", "application/json");
    request = request.header("User-Agent", "GitHub-PR-Preview/0.1.0");
    request = request.body(body);

    let response = request
        .send()
        .await
        .map_err(|e| format_transport_error(&e, e.is_timeout()))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format_transport_error(&e, e.is_timeout()))?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error as StdError;
    use std::fmt;

    #[derive(Debug)]
    struct TestError {
        message: &'static str,
        source: Option<Box<TestError>>,
    }

    impl TestError {
        fn new(message: &'static str, source: Option<TestError>) -> Self {
            Self {
                message,
                source: source.map(Box::new),
            }
        }
    }

    impl fmt::Display for TestError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            f.write_str(self.message)
        }
    }

    impl StdError for TestError {
        fn source(&self) -> Option<&(dyn StdError + 'static)> {
            self.source
                .as_ref()
                .map(|e| e.as_ref() as &(dyn StdError + 'static))
        }
    }

    #[test]
    fn formats_error_without_source() {
        let error = TestError::new("error sending request", None);
        assert_eq!(
            format_transport_error(&error, false),
            "error sending request"
        );
    }

    #[test]
    fn appends_nested_sources() {
        let error = TestError::new(
            "error decoding response body",
            Some(TestError::new("operation timed out", None)),
        );
        assert_eq!(
            format_transport_error(&error, false),
            "error decoding response body: operation timed out"
        );
    }

    #[test]
    fn walks_the_whole_source_chain() {
        let error = TestError::new(
            "error decoding response body",
            Some(TestError::new(
                "connection closed",
                Some(TestError::new("unexpected end of file", None)),
            )),
        );
        assert_eq!(
            format_transport_error(&error, false),
            "error decoding response body: connection closed: unexpected end of file"
        );
    }

    #[test]
    fn marks_timeouts_explicitly() {
        let error = TestError::new(
            "error decoding response body",
            Some(TestError::new("operation timed out", None)),
        );
        assert_eq!(
            format_transport_error(&error, true),
            "Request timeout: error decoding response body: operation timed out"
        );
    }
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
