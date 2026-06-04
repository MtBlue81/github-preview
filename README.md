# GitHub PR Preview

GitHub Pull Request を効率よくレビューするための macOS 向けデスクトップアプリ。Tauri + React で構築。

PR 統合一覧 (作成・アサイン・メンション・レビュー依頼・レビュー済み・コメント済みを1つのリストに集約)、未読バッジ、CI ステータス表示、システム通知、キーボードショートカットなどを備えている。

## 動作環境

- **macOS 10.15 以降**
- **Apple Silicon (arm64) のみ** (Intel Mac 非対応)

## インストール

1. [Releases](../../releases) ページから最新の `.dmg` をダウンロード
2. `.dmg` をマウントし、`GitHub PR Preview.app` を `Applications` フォルダにドラッグ
3. 初回起動時に警告が出たら閉じて、**システム設定 → プライバシーとセキュリティ** 最下部の「このまま開く」をクリック (2回目以降は通常通り起動できる)

## セットアップ

1. [GitHub の Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens/new?scopes=repo,read:user&description=GitHub%20PR%20Preview) で Personal Access Token (classic) を作成
   - 必要な scopes: `repo`、`read:user`
2. アプリを起動し、生成したトークンを入力してログイン
3. 自分に関係する PR が一覧表示される

## 主な機能

- **PR統合一覧**: 作成・アサイン・メンション・レビュー依頼・レビュー済み・コメント済みを1つのリストに集約 (重複自動除外)
- **未読管理**: 未読バッジとカウント表示、システム通知
- **CI/CD ステータス**: 成功・失敗・進行中をアイコンで色分け
- **PR ステータス**: Draft / Approved / Changes Requested / 各種ラベルを表示
- **WebView 統合**: PR 詳細を別ウィンドウで GitHub のフル機能 (コメント・レビュー・差分表示) で操作
- **自動更新**: PR一覧 1分間隔、PR詳細 30秒間隔
- **無視 / フィルタ**: 特定 PR の無視、ラベルによる除外
- **キーボードショートカット**:
  - `←` / `h`: 前の PR
  - `→` / `l`: 次の PR
  - `Esc` / `g`: 一覧に戻る
- **GitHub API Rate Limit 表示**: ヘッダーで残量を確認可能
