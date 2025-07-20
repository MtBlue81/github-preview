# GitHub PRプレビューツール

## 概要
Tauri + React + TypeScript + Tailwind CSSで構築されたMac用デスクトップアプリ。GitHub PRの効率的なレビューと管理を支援。

## 技術スタック
- **フレームワーク**: Tauri（軽量・高性能・セキュア）
- **フロントエンド**: React + TypeScript + Tailwind CSS
- **API**: GitHub GraphQL API
- **認証**: GitHub Personal Access Token
- **状態管理**: Zustand

## 実装済み機能
- ✅ GitHub Personal Access Token認証
- ✅ PR統合ビュー（作成したPR、レビュー依頼、アサイン、メンションを一画面に表示）
- ✅ PR詳細表示（説明、ファイル変更リスト、コメント・レビュー表示）
- ✅ 自動更新機能（PR一覧: 1分間隔、PR詳細: 30秒間隔）
- ✅ レスポンシブデザイン
- ✅ ナビゲーション機能
- ✅ 重複PR自動除外機能

## 開発・ビルド
```bash
# 依存関係インストール
npm install

# TypeScriptビルド
npm run build

# 開発サーバー起動（要Rust）
npm run tauri dev
```

## 使用方法
1. [GitHub Settings](https://github.com/settings/tokens/new?scopes=repo,read:user) でPersonal Access Tokenを作成
2. アプリ起動後、トークンでログイン
3. 自分に関係するすべてのPRが4つのカテゴリで表示される
4. PRクリックで詳細画面へ

## 今後の実装予定
- コメント・レビュー投稿機能
- ファイル差分の詳細表示
- ショートカットキー対応
- 通知機能
- Macアプリパッケージング

## 開発メモ
- Rustインストール要：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- バージョン固定でレンジ指定を回避済み
- GraphQL APIで効率的なデータ取得


