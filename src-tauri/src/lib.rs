use serde::Serialize;
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

// アイドル中も ping で h2 接続の生死を確認する。
// これがないと、サーバ側が既に回収した接続をプールから掴んでしまい、
// 実リクエストで RST_STREAM(CANCEL) を受けるまで死んでいると分からない。
// reqwest のデフォルトは keep-alive 無効 / pool_idle_timeout 90秒で、
// ポーリング間隔 (一覧60秒・詳細30秒) はその内側に収まってしまう。
const H2_KEEP_ALIVE_INTERVAL: Duration = Duration::from_secs(30);
const H2_KEEP_ALIVE_TIMEOUT: Duration = Duration::from_secs(10);

// フロントは kind でリトライ可否を判断する。
// メッセージ文字列を突き合わせる方式だと、h2 やhyperの文言変更で
// 判定が黙って壊れる
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
enum ErrorKind {
    Timeout,
    Transport,
    Http,
    Client,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct RequestError {
    kind: ErrorKind,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<u16>,
}

impl RequestError {
    fn client(message: String) -> Self {
        Self {
            kind: ErrorKind::Client,
            message,
            status: None,
        }
    }

    fn transport(error: &dyn StdError, is_timeout: bool) -> Self {
        Self {
            kind: if is_timeout {
                ErrorKind::Timeout
            } else {
                ErrorKind::Transport
            },
            message: format_transport_error(error, is_timeout),
            status: None,
        }
    }

    fn http(status: u16, body: &str) -> Self {
        Self {
            kind: ErrorKind::Http,
            message: format!("HTTP {}: {}", status, body),
            status: Some(status),
        }
    }
}

// reqwest::Client はコネクションプールを内包するため、リクエストごとに作ると
// 毎回TLSハンドシェイクからやり直しになる
fn http_client() -> Result<&'static reqwest::Client, RequestError> {
    static CLIENT: OnceLock<Result<reqwest::Client, String>> = OnceLock::new();

    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .connect_timeout(CONNECT_TIMEOUT)
                .read_timeout(READ_TIMEOUT)
                .timeout(TOTAL_TIMEOUT)
                .http2_keep_alive_interval(H2_KEEP_ALIVE_INTERVAL)
                .http2_keep_alive_timeout(H2_KEEP_ALIVE_TIMEOUT)
                .http2_keep_alive_while_idle(true)
                .build()
                .map_err(|e| e.to_string())
        })
        .as_ref()
        .map_err(|e| RequestError::client(e.clone()))
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
) -> Result<String, RequestError> {
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
        .map_err(|e| RequestError::transport(&e, e.is_timeout()))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| RequestError::transport(&e, e.is_timeout()))?;

    if status.is_success() {
        Ok(text)
    } else {
        Err(RequestError::http(status.as_u16(), &text))
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

    #[test]
    fn classifies_non_timeout_transport_failures() {
        let error = TestError::new(
            "error decoding response body",
            Some(TestError::new(
                "stream error received: stream no longer needed",
                None,
            )),
        );

        let request_error = RequestError::transport(&error, false);

        assert_eq!(request_error.kind, ErrorKind::Transport);
        assert_eq!(request_error.status, None);
        assert_eq!(
            request_error.message,
            "error decoding response body: stream error received: stream no longer needed"
        );
    }

    #[test]
    fn classifies_timeouts_separately() {
        let error = TestError::new("operation timed out", None);

        assert_eq!(
            RequestError::transport(&error, true).kind,
            ErrorKind::Timeout
        );
    }

    #[test]
    fn keeps_status_on_http_errors() {
        let request_error = RequestError::http(502, "Bad Gateway");

        assert_eq!(request_error.kind, ErrorKind::Http);
        assert_eq!(request_error.status, Some(502));
        assert_eq!(request_error.message, "HTTP 502: Bad Gateway");
    }

    // フロントは kind / status を見てリトライ可否を決めるため、
    // JSON の形はコントラクトとして固定する
    #[test]
    fn serializes_to_the_shape_the_frontend_expects() {
        let transport = TestError::new("stream error received", None);

        assert_eq!(
            serde_json::to_string(&RequestError::transport(&transport, false)).unwrap(),
            r#"{"kind":"transport","message":"stream error received"}"#
        );
        assert_eq!(
            serde_json::to_string(&RequestError::http(503, "nope")).unwrap(),
            r#"{"kind":"http","message":"HTTP 503: nope","status":503}"#
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
