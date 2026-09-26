# 指定緊急避難場所マップ

国土地理院（GSI）の指定緊急避難場所データを、地図とテーブルで閲覧できる Web アプリケーションです。

**デモ:** <https://iwstkhr.github.io/shelter-map/>

## 機能

- インタラクティブな地図上に、表示範囲内の避難場所を描画
- 避難場所データを仮想スクロール付きテーブルで全件表示
- 名称・住所・災害種別（洪水、地震、津波など）で地図と一覧を絞り込み
- OpenStreetMap と国土地理院の航空写真の切り替え
- gzip 圧縮 GeoJSON による高速なデータ読み込み
- 避難場所データ読み込み中は地図上にスピナーを表示
- モバイル幅でも地図と一覧が使えるレスポンシブレイアウト

## 技術スタック

- [React](https://react.dev/) 19 と [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) 8（SPA、クライアントサイドレンダリング）
- [Vite](https://vite.dev/) 8
- [Leaflet](https://leafletjs.com/) — 地図描画
- [TanStack Virtual](https://tanstack.com/virtual) — テーブルの仮想スクロール
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Biome](https://biomejs.dev/) — リント・フォーマット
- [Vitest](https://vitest.dev/) と [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) — テスト
- [pre-commit](https://pre-commit.com/) — Git hooks と各種 lint（Biome、actionlint、shellcheck、markdownlint、gitleaks など）

## 必要条件

- [mise](https://mise.jdx.dev/)（Node.js、pnpm、pre-commit のバージョン管理）
- Node.js（[`mise.toml`](../../mise.toml)（リポジトリ直下） / `package.json` の `engines.node` で指定）
- pnpm（リポジトリ全体の pnpm workspace で依存関係を管理）
- デプロイする場合は Cloudflare アカウント（`pnpm exec wrangler login` でログイン）

## セットアップ

```bash
git clone https://github.com/iwstkhr/apps.git
cd apps
mise install
pre-commit install
pnpm install
cd apps/shelter-map
pnpm run dev
```

開発サーバーは <http://localhost:5173> で起動します。

### スクリプト

| コマンド | 説明 |
| --- | --- |
| `pnpm run dev` | 開発サーバーを起動 |
| `pnpm run build` | 本番ビルドを作成 |
| `pnpm run start` | 本番ビルドをローカルで配信 |
| `pnpm run preview` | 本番ビルドを作成し、`wrangler dev` で Workers と同じ構成でローカル配信 |
| `pnpm run deploy` | `build/client` を Cloudflare Workers へデプロイ（事前に `pnpm run build`） |
| `pnpm run lint` | Biome でリントを実行 |
| `pnpm run format` | Biome でコードをフォーマット |
| `pnpm run format:check` | フォーマットの差分を確認 |
| `pnpm run check` | Biome でリントとフォーマットを確認 |
| `pnpm run check:fix` | Biome でリント修正・フォーマット・import 整理を実行 |
| `pnpm run typecheck` | TypeScript の型チェックを実行 |
| `pnpm run test` | Vitest でテストを実行 |
| `pnpm run test:watch` | Vitest をウォッチモードで実行 |
| `pre-commit run --all-files` | pre-commit の hooks を全ファイルに対して実行（リポジトリ直下で実行） |

## ドキュメント

仕様・アーキテクチャの詳細は [`docs/`](docs/README.md) を参照してください。

| 文書 | 内容 |
| --- | --- |
| [仕様](docs/specification.md) | 機能・画面・データモデル・フィルター・地図挙動 |
| [アーキテクチャ](docs/architecture.md) | 構成・データフロー・モジュール責務・CI/CD |

## データソース

避難場所データは [国土地理院 指定緊急避難場所](https://www.gsi.go.jp/bousaichiri/hinanbasho.html) に基づいています。データ形式・検証ルール・更新フローの詳細は [仕様](docs/specification.md) と [アーキテクチャ](docs/architecture.md) を参照してください。

- リポジトリ内のデータ: `public/assets/mergeFromCity_2.geojson.gz`
- アプリに表示するデータ更新日: `app/generated/dataset-meta.ts`
- 取得元 URL: <https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/geoJSON/mergeFromCity_2.geojson>

## CI / デプロイ

PR と `main` への push で `apps/shelter-map/` 以下が変更されると [Shelter map check](../../.github/workflows/shelter-map-check.yml) が走り、`main` で Check が成功すると [Shelter map deploy](../../.github/workflows/shelter-map-deploy.yml) が [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) へ公開します。配信設定は [`wrangler.jsonc`](wrangler.jsonc) で、デプロイには GitHub の secrets `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を使います。詳細は [アーキテクチャ](docs/architecture.md#ci--cd) を参照してください。

Workers ではドメインのルートで配信するため、`BASE_PATH` は指定しません。サブパス配下で配信する場合だけ、ビルド時に指定します:

```bash
BASE_PATH=/sub-path/ pnpm run build
```

`public/` 以下の静的アセットは `publicUrl()`（`app/lib/public-url.ts`）経由で参照し、ルート絶対パス（例: `/favicon.svg`）は使わないでください。

## コントリビューション

### Git hooks

`mise install` 後に `pre-commit install` を実行すると、[`.pre-commit-config.yaml`](../../.pre-commit-config.yaml)（リポジトリ直下）の hooks がコミット時に有効になります。

全ファイルに対して手動実行する場合（リポジトリ直下で実行）:

```bash
pre-commit run --all-files
```

CI と同条件で確認する場合（`pre-commit` はリポジトリ直下、`pnpm` は `apps/shelter-map/` で実行）:

```bash
pre-commit run --all-files
pnpm run check
pnpm run typecheck
pnpm run test
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
