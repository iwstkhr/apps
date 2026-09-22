# アーキテクチャ

指定緊急避難場所マップの構成、データフロー、モジュール責務、および配信パイプラインをまとめています。

機能・画面・データ仕様は [specification.md](./specification.md) を参照してください。

## 全体像

```text
┌──────────────────────────────────────────────────────────┐
│  GitHub Pages（静的配信）                                 │
│  build/client + public/assets/*.geojson.gz               │
└────────────────────────────┬─────────────────────────────┘
                             │ fetch (.geojson.gz)
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Browser SPA（React Router / Vite, ssr: false）           │
│                                                          │
│  ShelterMapProvider                                      │
│    ├─ useShelterData ──► fetchShelters → Shelter[]       │
│    ├─ useLeafletMap  ──► Leaflet Map + tiles             │
│    └─ useShelterMap  ──► filters + viewport sync         │
│           │                                              │
│           ├─ displayedShelters ──► MapTable（仮想一覧）   │
│           └─ visible subset ──► Leaflet layers（地図）   │
└──────────────────────────────────────────────────────────┘
```

バックエンド API や DB は持たない。避難場所データはビルド成果物と一緒に静的ファイルとして配信し、クライアントが展開・検証・描画する。

## 技術スタック

| 層 | 技術 |
| --- | --- |
| UI | React 19、TypeScript |
| ルーティング / ビルド | React Router 8（SPA）、Vite 8 |
| 地図 | Leaflet |
| 一覧 | TanStack Virtual |
| スタイル | Tailwind CSS 4 |
| 品質 | Biome、Vitest、Testing Library、pre-commit |
| ランタイム管理 | mise（Node.js / pre-commit） |
| 配信 | GitHub Pages |

## ディレクトリ構成

```text
app/
  components/
    layout/     # ヘッダー、アプリシェル
    map/        # タイル切替、操作ヒント、読込スピナー
    table/      # 一覧ヘッダー、行、列フィルター、仮想スクロール
  context/      # ShelterMapContext と Provider
  data/         # gzip GeoJSON の取得
  generated/    # データ更新日メタ（生成物）
  hooks/        # データ読込・地図・共有状態
  lib/
    map/        # 表示範囲抽出、レイヤー同期、ポップアップ
    *.ts        # Leaflet 初期化、gzip、公開 URL など
  routes/       # ページ（home のみ）
  test/         # テストヘルパー・フィクスチャ
  types/        # ドメイン型・検証・フィルター
public/assets/  # 圧縮 GeoJSON などの静的アセット
scripts/        # dataset-meta 生成
.github/workflows/
  check.yml            # PR / main の品質チェック
  deploy.yml           # Check 成功後に Pages へデプロイ
  update-geojson.yml   # 毎月の GeoJSON 更新 PR
```

## 実行時データフロー

### 1. 起動とデータ読込

```text
Home
  └─ ShelterMapProvider
       └─ useShelterMap
            └─ useShelterData
                 └─ fetchShelters()
                      ├─ publicUrl('assets/mergeFromCity_2.geojson.gz')
                      ├─ decompressGzipResponse（必要なら gzip 展開）
                      ├─ JSON.parse
                      └─ parseShelterGeoJson → Shelter[]
```

- `fetchShelters` はモジュールスコープで結果をキャッシュする
- ホストがすでに展開済みの本文を返す場合にも対応する（マジックバイト `1f 8b` で gzip 判定）
- 読込状態は `isLoading` / `loadError` として Context 経由で UI に渡る

### 2. フィルター共有

```text
MapTable
  draftFilters（即時）
       │ 200ms debounce
       ▼
  updateColumnFilters
       ▼
  useShelterMap.columnFilters
       ▼
  filterSheltersByColumns(shelters, columnFilters)
       ▼
  displayedShelters ──┬──► MapTable（全件・仮想スクロール）
                      └──► filterSheltersWithinMap ──► syncShelterLayers
```

一覧は絞り込み後の全件を表示し、地図はそのうち現在の表示範囲に入るものだけをレイヤーに載せる。

### 3. 地図レイヤー同期

`moveend` / `zoomlevelschange` で次を実行する。

1. `map.getBounds()` で表示範囲内の避難場所を抽出
1. ズームと件数から marker / circle を決定
1. `ShelterLayerRegistry` を使い、追加・削除・種別変更のみ反映

## モジュール責務

### Context / Hooks

| モジュール | 責務 |
| --- | --- |
| `ShelterMapProvider` | 地図コンテナ ref と共有状態の提供 |
| `useShelterMap` | データ・フィルター・表示範囲同期の統合 |
| `useShelterData` | GeoJSON 読込ライフサイクル |
| `useLeafletMap` | Leaflet 初期化、タイル切替、リサイズ対応 |
| `useShelterMapContext` | Context 購読（未 Provider 時はエラー） |
| `useShelterTableFilters` | 下書きフィルターとデバウンス反映 |
| `useDebouncedValueEffect` | 値変更のデバウンス実行 |

### Data / Types

| モジュール | 責務 |
| --- | --- |
| `fetch-shelters` | アセット取得・展開・パース・キャッシュ |
| `types/shelter` | GeoJSON → `Shelter` 変換と検証 |
| `types/shelter-type` | 災害種別キーと日本語ラベル |
| `types/shelter-filters` | 列フィルター型と適用ロジック |
| `types/tile-layer` | タイル定義と既定値 |
| `generated/dataset-meta` | 画面表示用のデータ更新日 |

### Map helpers (`app/lib/map/`)

| モジュール | 責務 |
| --- | --- |
| `constants` | 初期視点、円スタイル、マーカー閾値 |
| `viewport-filter` | bounds による抽出 |
| `shelter-renderer` | レイヤー registry と差分同期 |
| `shelter-popup` | ポップアップ HTML（エスケープ込み） |

### UI Components

| 領域 | 主なコンポーネント |
| --- | --- |
| layout | `AppShell`、`AppHeader` |
| map | `MapTileLayerControl`、`MapHelpHint`、読込オーバーレイ |
| table | `MapTable`、ヘッダー、行、列フィルター |

`routes/home.tsx` は Provider 配下で地図とテーブルを組み立てる薄いページ。

## ルーティングとビルド

- `react-router.config.ts`: `ssr: false`
- 本番の `basename` / Vite `base` は `BASE_PATH` 環境変数（Pages では `/shelter-map/`）
- 静的アセット参照は必ず `publicUrl()`（`import.meta.env.BASE_URL` 経由）を使う
- ルート絶対パス（例: `/favicon.svg`）は使わない

## データ更新パイプライン

毎月 1 日 00:00 UTC（JST 09:00）、または手動 `workflow_dispatch` で実行。

```text
国土地理院 GeoJSON
  → curl 取得 + JSON 検証
  → gzip 圧縮 → public/assets/mergeFromCity_2.geojson.gz
  → Last-Modified から app/generated/dataset-meta.ts 生成
  → create-pull-request（branch: automated/update-geojson）
```

関連ファイル:

- [`.github/workflows/update-geojson.yml`](../.github/workflows/update-geojson.yml)
- [`scripts/write-dataset-meta.mjs`](../scripts/write-dataset-meta.mjs)

## CI / CD

```text
PR / push to main
  └─ Check
       ├─ pre-commit run --all-files
       ├─ npm run check
       ├─ npm run typecheck
       └─ npm run test

main で Check 成功
  └─ Deploy（workflow_run）
       ├─ BASE_PATH=/<repo>/ npm run build
       └─ GitHub Pages へ build/client を公開
```

Deploy は Check の完了を `workflow_run` で待ち、成功時のみビルドする。

## 設計上のポイント

1. **単一ソースの状態** — フィルター済み一覧を Context で共有し、地図とテーブルの表示ずれを防ぐ
1. **描画コストの抑制** — 地図は表示範囲のみ、低ズームでは circle、レイヤーは差分更新
1. **大きな一覧の扱い** — テーブルは仮想スクロールで全件を扱う
1. **配信の単純さ** — API なしの静的 SPA + gzip アセットで GitHub Pages に載せる
1. **データの安全性** — GeoJSON を実行時に検証し、不正 Feature は捨ててコレクション不正時のみ失敗する
