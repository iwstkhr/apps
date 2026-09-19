# 指定緊急避難場所マップ

国土地理院（GSI）の指定緊急避難場所データを、地図とテーブルで
閲覧できる Web アプリケーションです。

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

- [React](https://react.dev/) 19 と
  [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) 8
  （SPA、クライアントサイドレンダリング）
- [Vite](https://vite.dev/) 8
- [Leaflet](https://leafletjs.com/) — 地図描画
- [TanStack Virtual](https://tanstack.com/virtual) — テーブルの仮想スクロール
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Biome](https://biomejs.dev/) — リント・フォーマット
- [Vitest](https://vitest.dev/) と
  [Testing Library](
  https://testing-library.com/docs/react-testing-library/intro/)
  — テスト
- [pre-commit](https://pre-commit.com/) — Git hooks と各種 lint
  （Biome、actionlint、shellcheck、markdownlint、gitleaks など）

## 必要条件

- [mise](https://mise.jdx.dev/)（Node.js と pre-commit のバージョン管理）
- Node.js（[`mise.toml`](mise.toml) / `package.json` の `engines.node` で指定）
- npm

## セットアップ

```bash
git clone https://github.com/iwstkhr/shelter-map.git
cd shelter-map
mise install
npm ci
pre-commit install
npm run dev
```

開発サーバーは <http://localhost:5173> で起動します。

### AI エージェントによる開発

コード変更に伴うテスト・GitHub Actions・ドキュメントの更新には、
[iwstkhr/agent-plugin](https://github.com/iwstkhr/agent-plugin) の
`code-sync` プラグイン（`code-sync:sync-changes` スキル）を使用します。

Claude Code 用のマーケットプレイスとプラグインは
`.claude/settings.json` に設定しています。Codex では各開発環境で登録します。

```bash
codex plugin marketplace add iwstkhr/agent-plugin
codex plugin add code-sync@agent-plugin
```

インストール後は新しいタスクを開始してください。自動実行を利用する場合は、
Codex CLI の `/hooks` でプラグインの Hook を確認し、信頼済みにします。
手動で適用する場合は「code-sync:sync-changes スキルを使って、
コード変更に関連ファイルを追従させて」と依頼します。

Cursor 用のプロジェクト固有フックは提供していません。

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
| `pre-commit run --all-files` | pre-commit の hooks を全ファイルに対して実行 |

## プロジェクト構成

```text
app/
  components/
    layout/     # ヘッダー、アプリシェル
    map/        # 地図 UI（タイル切替、操作ヒント、読込スピナー）
    table/      # 一覧のヘッダー、行、フィルター、仮想スクロール
  context/      # 地図・データの React Context
  data/         # 圧縮された避難場所データの取得
  generated/    # データ更新時に生成されるメタデータ
  hooks/        # データ読込、地図、フィルターの状態管理
  lib/
    map/         # 表示範囲の抽出、レイヤー同期、ポップアップ生成
    *.ts         # Leaflet、gzip、公開 URL の共通処理
  routes/       # ページルート
  test/         # テスト用ヘルパー・フィクスチャ
  types/        # GeoJSON の検証・変換、フィルターなどのドメイン型
public/assets/  # 圧縮 GeoJSON などの静的アセット
scripts/        # データ更新日のメタデータ生成スクリプト
```

地図と一覧は同じフィルター状態を共有します。一覧はフィルター後の全件を
仮想スクロールで表示し、地図はその中から現在の表示範囲に入る避難場所だけを
抽出して Leaflet レイヤーへ差分反映します。

## データソース

避難場所データは
[国土地理院 指定緊急避難場所](https://www.gsi.go.jp/bousaichiri/hinanbasho.html)
に基づいています。

- リポジトリ内のデータ: `public/assets/mergeFromCity_2.geojson.gz`
- アプリに表示するデータ更新日: `app/generated/dataset-meta.ts`
- 取得元 URL:
  <https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/geoJSON/mergeFromCity_2.geojson>

GeoJSON は毎月 1 日に GitHub Actions でダウンロード・圧縮され、
配信元の `Last-Modified` からデータ更新日のメタデータも生成したうえで、
プルリクエストとして提案されます
（[`.github/workflows/update-geojson.yml`](.github/workflows/update-geojson.yml)）。

アプリは gzip をブラウザー上で展開し、GeoJSON が `FeatureCollection` であることと、
各避難場所の座標・共通 ID・名称・住所・災害種別を検証してから表示します。
未対応または必須項目が欠けたフィーチャーは読み飛ばし、
コレクション自体が不正な場合は画面に読み込みエラーを表示します。

## CI / デプロイ

PR と `main` ブランチへの push では
[Check ワークフロー](.github/workflows/check.yml) が
`pre-commit run --all-files`、`npm run check`、`npm run typecheck`、
`npm run test` を実行します。

`main` への push で Check が成功すると、
[Deploy ワークフロー](.github/workflows/deploy.yml) が起動して
[GitHub Pages](https://pages.github.com/) へデプロイされます。

GitHub Pages と同じベースパスでローカルビルドする場合:

```bash
BASE_PATH=/shelter-map/ npm run build
```

`public/` 以下の静的アセット（favicon や GeoJSON など）は
`import.meta.env.BASE_URL`（ヘルパー: `app/lib/public-url.ts`）経由で参照し、
ルート絶対パス（例: `/favicon.svg`）は使わないでください。

## コントリビューション

### Git hooks

`mise install` 後に `pre-commit install` を実行すると、
[`.pre-commit-config.yaml`](.pre-commit-config.yaml) の hooks が
コミット時に有効になります。

全ファイルに対して手動実行する場合:

```bash
pre-commit run --all-files
```

CI と同条件で確認する場合:

```bash
pre-commit run --all-files
npm run check
npm run typecheck
npm run test
```

### コミットメッセージ

このリポジトリは
[Conventional Commits](https://www.conventionalcommits.org/)
に従います。

```text
<type>[optional scope]: <description>
```

- **description** は英語の命令形・小文字・末尾にピリオドなしで記述
- 変更内容に合った **type** を使用
  （`feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`）
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

避難場所データは国土地理院（GSI）が提供しています。
データの利用条件については
[国土地理院の利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei41042.html)
を参照してください。
