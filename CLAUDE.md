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
- [ ] CI状況を一覧に表示
- [ ] 手動での再fetchボタンを追加
- [ ] 詳細表示でのアプリ内ブラウザの利用
- [ ] コメント・レビュー投稿機能
- [ ] ファイル差分の詳細表示
- [ ] テスト環境の構築（Vitest + React Testing Library）

## 開発メモ
- バージョン固定でレンジ指定を回避済み
- GraphQL APIで効率的なデータ取得
- Tauri設定でmacOS固有の最適化実装済み
- 透明タイトルバーでネイティブな外観
