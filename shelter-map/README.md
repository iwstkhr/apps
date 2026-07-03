# 指定緊急避難場所マップ

国土地理院（GSI）の指定緊急避難場所データを、地図とテーブルで閲覧できる Web アプリケーションです。

**デモ:** https://iwstkhr.github.io/shelter-map/

## 機能

- インタラクティブな地図上に避難場所を表示し、ズームや移動に応じて一覧を更新
- 地図の表示範囲内の避難場所のみを仮想スクロール付きテーブルで表示
- 名称・住所・災害種別（洪水、地震、津波など）でフィルタリング
- OpenStreetMap と国土地理院の航空写真の切り替え
- gzip 圧縮 GeoJSON による高速なデータ読み込み

## 技術スタック

- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) 8（SPA、クライアントサイドレンダリング）
- [Vite](https://vite.dev/) 8
- [Leaflet](https://leafletjs.com/) — 地図描画
- [TanStack Table](https://tanstack.com/table) + [TanStack Virtual](https://tanstack.com/virtual) — テーブルと仮想スクロール
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Biome](https://biomejs.dev/) — リント・フォーマット
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) — テスト
- [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) — Git hooks
- [secretlint](https://github.com/secretlint/secretlint) — 秘密情報の検出
- actionlint / hadolint / shellcheck / yamllint — [mise](https://mise.jdx.dev/) 経由でワークフロー・シェル・YAML を lint

## 必要条件

- [mise](https://mise.jdx.dev/)（Node.js と lint ツールのバージョン管理）
- Node.js（[`mise.toml`](mise.toml) / `package.json` の `engines.node` で指定）
- npm

## セットアップ

```bash
git clone https://github.com/iwstkhr/shelter-map.git
cd shelter-map
mise install
npm ci
npm run dev
```

開発サーバーは http://localhost:5173 で起動します。

### スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番ビルドを作成 |
| `npm run start` | 本番ビルドをローカルで配信 |
| `npm run lint` | Biome でリントを実行 |
| `npm run format` | Biome でコードをフォーマット |
| `npm run format:check` | フォーマットの差分を確認 |
| `npm run check` | Biome でリントとフォーマットを確認 |
| `npm run check:fix` | Biome でリント修正・フォーマット・import 整理を実行 |
| `npm run typecheck` | TypeScript の型チェックを実行 |
| `npm run test` | Vitest でテストを実行 |
| `npm run test:watch` | Vitest をウォッチモードで実行 |
| `mise run lint` | GitHub Actions ワークフロー、シェル、YAML などを lint |

## プロジェクト構成

```text
app/
  components/
    layout/     # ヘッダー、アプリシェル
    map/        # 地図 UI（タイル切替、操作ヒント）
    table/      # 避難所一覧テーブル
  context/      # 地図・データの React Context
  data/         # 避難場所データの取得
  generated/    # ビルド時に生成されるメタデータ
  hooks/        # 地図とデータの連携ロジック
  lib/          # Leaflet、gzip、地図描画ユーティリティ
  routes/       # ページルート
  test/         # テスト用ヘルパー・フィクスチャ
  types/        # 型定義
public/assets/  # 圧縮 GeoJSON などの静的アセット
scripts/        # ビルド用スクリプト
```

## データソース

避難場所データは [国土地理院 指定緊急避難場所](https://www.gsi.go.jp/bousaichiri/hinanbasho.html) に基づいています。

- リポジトリ内のデータ: `public/assets/mergeFromCity_2.geojson.gz`
- アプリに表示するデータ更新日: ビルド時に `app/generated/dataset-meta.ts` へ生成
- 取得元 URL: https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/geoJSON/mergeFromCity_2.geojson

GeoJSON は毎月 1 日に GitHub Actions でダウンロード・圧縮され、プルリクエストとして提案されます（[`.github/workflows/update-geojson.yml`](.github/workflows/update-geojson.yml)）。

## CI / デプロイ

PR と `main` ブランチへの push では [Check ワークフロー](.github/workflows/check.yml) が `mise run lint`、`npm run check`、`npm run typecheck`、`npm run test` を実行します。

`main` への push で Check が成功すると、[Deploy ワークフロー](.github/workflows/deploy.yml) が起動して [GitHub Pages](https://pages.github.com/) へデプロイされます。

GitHub Pages と同じベースパスでローカルビルドする場合:

```bash
BASE_PATH=/shelter-map/ npm run build
```

## コントリビューション

### Git hooks

`npm ci` 後、Husky が Git hooks を有効化します。

- **pre-commit:** `npm run check` と lint-staged（ステージ済みファイルに対する secretlint など）
- **pre-push:** `npm run test`

CI と同条件で確認する場合:

```bash
mise run lint
npm run check
npm run typecheck
npm run test
```

### コミットメッセージ

このリポジトリは [Conventional Commits](https://www.conventionalcommits.org/) に従います。

```text
<type>[optional scope]: <description>
```

- **description** は英語の命令形・小文字・末尾にピリオドなしで記述
- 変更内容に合った **type** を使用（`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`）
- 必要に応じて **scope** を追加（`map`, `table`, `data`, `deploy` など）

例:

```text
feat(table): add spreadsheet-style column filters
fix(map): require modifier key for map scroll zoom
chore(data): update shelter GeoJSON data
docs: document project setup in readme
```

## ライセンス

本プロジェクトのソースコードは [MIT License](LICENSE) の下で公開されています。

避難場所データは国土地理院（GSI）が提供しています。データの利用条件については [国土地理院の利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei41042.html) を参照してください。
