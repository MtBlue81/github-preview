# GitHub PRプレビューツール

## 概要

Tauri + React + TypeScript + Tailwind CSSで構築されたMac用デスクトップアプリ。GitHub PRの効率的なレビューと管理を支援。

## 技術スタック

- **フレームワーク**: Tauri（軽量・高性能・セキュア）
- **フロントエンド**: React + TypeScript + Tailwind CSS
- **API**: GitHub GraphQL API
- **認証**: GitHub Personal Access Token
- **状態管理**: Zustand
- **開発ツール**: ESLint（React Hooks対応）、Prettier

## 実装済み機能

### 基本機能

- ✅ GitHub Personal Access Token認証
- ✅ PR統合一覧表示（4つのカテゴリを1つのリストに統合）
- ✅ PR詳細表示（説明、ファイル変更リスト、コメント・レビュー表示）
- ✅ 自動更新機能（PR一覧: 1分間隔、PR詳細: 30秒間隔）

### UI/UX機能

- ✅ レスポンシブデザイン
- ✅ ナビゲーション機能
- ✅ スクロール位置の自動保持（ScrollRestoration）
- ✅ キーボードショートカット（←/h: 前のPR、→/l: 次のPR、Esc/g: 一覧へ）
- ✅ 手動更新ボタン（トーストメッセージ・最終更新時刻表示付き）

### データ管理機能

- ✅ 重複PR自動除外機能
- ✅ PR無視機能（特定PRを一覧から除外）
- ✅ 未既読管理機能（未読バッジ・カウント表示）
- ✅ システム通知機能（新しいPRや更新の通知）

### パフォーマンス機能

- ✅ GraphQLクエリ統合（4本→1本でAPIコール数75%削減）
- ✅ GitHub API Rate Limit情報の表示
- ✅ API通信状態インジケーター（回転アニメーション）

### PR表示機能

- ✅ カテゴリアイコン表示（💬 メンション、📌 アサイン、👀 レビュー依頼、✏️ 作成）
- ✅ 更新日時での自動ソート（新しい順）
- ✅ PRステータス表示（Draft、Approved、Changes Requested）
- ✅ ラベル表示（色付き）
- ✅ CI/CDステータス表示（成功・失敗・進行中の色分けアイコン）

## 開発・ビルド

### 開発環境セットアップ

```bash
# 依存関係インストール
npm install

# TypeScriptビルド
npm run build

# 開発サーバー起動（要Rust）
npm run tauri dev
```

### Macアプリケーションビルド

```bash
# プロダクションビルド（Macアプリ + DMGインストーラー生成）
npm run tauri build

# 生成されるファイル:
# - src-tauri/target/release/bundle/macos/GitHub PR Preview.app
# - src-tauri/target/release/bundle/dmg/GitHub PR Preview_0.1.0_aarch64.dmg
```

### ビルド要件

- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js**: 18以上
- **macOS**: 10.15以上（ビルド対象）

## 使用方法

1. [GitHub Settings](https://github.com/settings/tokens/new?scopes=repo,read:user) でPersonal Access Tokenを作成
2. アプリ起動後、トークンでログイン
3. 自分に関係するすべてのPRが統合リストで表示される
4. PRクリックで詳細画面へ
5. API Rate Limit状況をヘッダーで確認可能

## アーキテクチャ

### GraphQL API統合

- `GET_ALL_PULL_REQUESTS`: 4つの検索条件を1つのクエリで並列実行
- Rate Limit情報を同一レスポンスに含める
- 1分間隔でのポーリング更新

### 状態管理（Zustand）

- `authStore`: 認証状態管理
- `ignoreStore`: PR無視機能
- `readStatusStore`: 既読/未読管理
- `navigationStore`: ナビゲーション状態
- `focusStore`: フォーカス復帰機能

### データフロー

1. GraphQLクエリで4カテゴリのPRを同時取得
2. 重複除外・無視PR除外・カテゴリ統合処理
3. 更新日時でソート
4. 未読検知・通知処理
5. UI表示

## 配布・インストール

### DMGインストーラー使用

1. `GitHub PR Preview_0.1.0_aarch64.dmg` をダウンロード
2. DMGをマウント
3. `GitHub PR Preview.app` をApplicationsフォルダにドラッグ

### 直接実行

- `GitHub PR Preview.app` をダブルクリックして起動

## 今後の実装予定

- ✅ CI状況を一覧に表示
- ✅ 手動での再fetchボタンを追加
- ✅ 詳細表示でのTauri WebViewブラウザ実装
- [ ] コメント・レビュー投稿機能
- [ ] ファイル差分の詳細表示
- [ ] テスト環境の構築（Vitest + React Testing Library）

## Tauri WebView実装の詳細

### 概要
PR詳細画面にGitHubの完全なWebインターフェースを統合するため、Tauri WebViewを実装。GitHubのフル機能（コメント投稿、レビュー、差分表示等）を利用可能にした。

### 実装アプローチ

#### 1. 当初の計画: 埋め込み型WebView
- **目標**: 詳細ページ内にGitHubを直接埋め込み表示
- **問題**: GitHubが`X-Frame-Options: DENY`を設定
- **結果**: iframe及び埋め込み型WebViewでの表示が不可能

#### 2. 最終解決策: WebViewWindow（別ウィンドウ）
- **実装**: PR詳細ページアクセス時に自動で別ウィンドウを開く
- **利点**: GitHubのフレーム制限を回避
- **体験**: 詳細ページで状態管理・制御ボタンを提供

### 技術的課題と解決策

#### 権限設定の問題
**エラー**: `webview.create_webview_window not allowed`
**解決策**: 
```json
// src-tauri/capabilities/default.json & webview.json
"permissions": [
  "core:webview:allow-create-webview-window",
  "core:window:allow-close",
  "core:window:allow-create",
  "core:window:allow-show",
  "core:window:allow-hide"
]
```

#### WebView重複エラー
**エラー**: `a window with label already exists`
**解決策**:
- 既存WebViewの強制クリーンアップ
- タイムスタンプ付きユニークラベル生成
- コンポーネントアンマウント時の確実なクリーンアップ

#### 無限ループ問題
**問題**: useEffectの依存配列でWebViewWindow状態による再実行
**解決策**:
- 依存配列からwebviewWindow除去
- useCallbackでイベントハンドラーを最適化
- 関数の再作成による再実行を防止

### 実装されたファイル

#### コンポーネント
- `src/components/GitHubWebView.tsx`: WebViewWindow管理
- `src/components/WebViewContainer.tsx`: WebView制御とナビゲーション

#### 設定ファイル
- `src-tauri/capabilities/default.json`: メインウィンドウ権限
- `src-tauri/capabilities/webview.json`: WebViewウィンドウ権限
- `src-tauri/tauri.conf.json`: capability参照設定

#### GraphQL
- `src/lib/lightweightQueries.ts`: 軽量PR情報取得（既読管理用）

### 機能

#### WebView制御
- **自動オープン**: PR詳細ページアクセス時に自動でWebViewを開く
- **再利用**: 既存WebViewがある場合はフォーカス
- **リロード**: WebViewの再作成によるリフレッシュ
- **外部ブラウザ**: フォールバック用の外部ブラウザ起動

#### 統合機能
- **既読管理**: WebViewロード時の自動既読マーク
- **キーボードショートカット**: Esc/g（戻る）、←/h（前PR）、→/l（次PR）
- **ナビゲーション**: PR間移動の維持

### 利点
1. **完全なGitHub体験**: Webアプリのフル機能を利用
2. **開発負荷削減**: GitHub UIの独自実装が不要
3. **最新機能対応**: GitHubのアップデートに自動対応
4. **セキュリティ**: WebViewによる適切な分離

### 制約
- **別ウィンドウ**: 埋め込み表示ではなく別ウィンドウでの表示
- **ウィンドウ管理**: ユーザーがWebViewウィンドウを閉じる可能性
- **X-Frame-Options**: Webプラットフォームの根本的制限

## 開発メモ

- バージョン固定でレンジ指定を回避済み
- GraphQL APIで効率的なデータ取得
- Tauri設定でmacOS固有の最適化実装済み
- 透明タイトルバーでネイティブな外観
- WebView実装でGitHubのフル機能を統合
