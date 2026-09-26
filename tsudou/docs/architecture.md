# アーキテクチャ

Tsudou の技術的な構成と、そうした理由をまとめます。
画面と API の振る舞いそのものは [仕様](specification.md) を参照してください。

## 全体像

ログイン機構を持たないサーバレス SPA です。
画面と API を 1 つの Cloudflare Worker（`tsudou`）で配信します。
画面は Worker の静的アセット（`frontend/dist/`）で、Worker のスクリプトを通らずに返ります。
`/api/*` だけが Worker のスクリプトに渡り、その中身は Express.js の普通の HTTP サーバです。
`nodejs_compat` の `node:http` 互換と `cloudflare:node` の `httpServerHandler` により、Workers の `fetch` を Express へのリクエストに変換して渡します。データは D1（SQLite）に置きます。
設定は `backend/wrangler.jsonc` にまとめています。

```text
  ブラウザ
  +---------------------+
  | React SPA           |
  | メモリ (トークン)   |
  | localStorage: テーマ|
  +----------+----------+
             | HTTPS (同一オリジン。API は認証なし、レート制限あり)
             v
  +---------------------------------------------------------------+
  | Cloudflare Worker "tsudou"                                     |
  |                                                                |
  |  /api/* 以外 -> 静的アセット (frontend/dist/)                  |
  |                 未知のパスは index.html を返して SPA に渡す    |
  |                 _headers でヘッダ付与                          |
  |                                                                |
  |  /api/*      -> httpServerHandler -> Express (Worker 内 :8080) |
  |                 レート制限 / 入力検証 / トークン照合 /         |
  |                 業務ロジック。公開されるのはルート 7 つだけ    |
  |                                                                |
  |  scheduled (Cron Trigger, 1日1回) -> 期限切れの削除            |
  +----------+-----------------------------------------------------+
             | D1 バインディング (env.DB)
             v
  +--------------------------------------------------+
  | D1 "tsudou" (SQLite)                              |
  |   events  : INDEX expires_at                      |
  |   answers : FK event_id ON DELETE CASCADE,        |
  |             UNIQUE (event_id, name)               |
  +--------------------------------------------------+
```

重要な点は、**ブラウザは `events` / `answers` テーブルに一切触れられない**ことです。
D1 には Worker のバインディングを通した API サーバからしかアクセスできず、Express に定義したルートは 7 つだけです。
認可判定（トークン照合）と入力検証は必ずサーバ側を通ります。

## 技術スタック

| レイヤ | 採用技術 |
| --- | --- |
| UI | React 19 / React Router 8（`createBrowserRouter`） |
| フォーム | TanStack Form (`@tanstack/react-form`) |
| サーバの状態 | TanStack Query (`@tanstack/react-query`) |
| スタイル | Tailwind CSS v4（`@tailwindcss/vite`） |
| ビルド | Vite 8 / TypeScript（プロジェクト参照による複合ビルド） |
| API | REST 風のルート（画面と同じオリジンの `/api` 以下）、認証なし（Workers の Rate Limiting で濫用を抑える） |
| API サーバ | Express 5 |
| 実行環境 | Cloudflare Workers（`nodejs_compat`、`cloudflare:node` の `httpServerHandler`）。ローカルは `wrangler dev` |
| 永続化 | Cloudflare D1（SQLite。マイグレーションは `wrangler d1 migrations`） |
| 定期実行 | Workers の Cron Trigger（期限切れの削除） |
| 設定 | `backend/wrangler.jsonc`（静的アセット・D1・Rate Limiting・Cron Trigger） |
| ホスティング | 画面と API を 1 つの Cloudflare Worker で配信（GitHub Actions から wrangler でデプロイ） |
| 品質 | Vitest / Testing Library / Biome / pre-commit |

## リポジトリ構成

pnpm のワークスペースで、`frontend/`（`@tsudou/frontend`）、`backend/`（`@tsudou/backend`）、両者が共有するコードの `shared/`（`@tsudou/shared`）の 3 パッケージに分けています。
依存関係とスクリプトはそれぞれの `package.json` にあり、ルートの `package.json` は Biome と、各パッケージのスクリプトを呼び出すショートカット（`pnpm run dev` / `pnpm run dev:api` / `pnpm test` など）だけを持ちます。

フロントとバックエンドはどちらも `@tsudou/shared` にワークスペースの依存（`workspace:*`）として依存し、`@tsudou/shared/limits` のように import します。フロントはバックエンドのパッケージに依存しないので、サーバの内部モジュールを import することはできません（「サーバとフロントで共有するコード」参照）。

```text
backend/                        バックエンド (@tsudou/backend)
├─ package.json                 依存関係とスクリプト
├─ wrangler.jsonc               Worker の設定 (静的アセット / D1 / Rate Limiting / Cron Trigger)
├─ migrations/                  D1 のマイグレーション (0001_init.sql ...)
├─ vitest.config.ts             バックエンドのテスト設定 (node 環境)
├─ scripts/openapi.ts           docs/openapi.yaml の生成 (pnpm run openapi)
└─ src/
   ├─ worker.ts                 Worker のエントリ (Express を listen させ httpServerHandler に渡す / Cron)
   ├─ app.ts                    Express アプリ (/api 以下のルート / エラーハンドラ / レート制限)
   ├─ http.ts                   ボディの検査 (Zod) / エラー → ステータス対応
   ├─ schemas.ts                API の入出力の形 (Zod のスキーマ)
   ├─ openapi.ts                スキーマとルートから OpenAPI のドキュメントを生成
   ├─ operations.ts             業務ロジック (Repository を注入)
   ├─ repository.ts             データアクセスの境界 (インタフェース)
   ├─ d1Repository.ts           本番実装 (D1) と期限切れの削除
   ├─ memoryRepository.ts       テスト用インメモリ実装
   ├─ tokens.ts                 ID / トークン生成、ハッシュ、定時間比較
   ├─ validate.ts               入力検証と正規化
   ├─ retention.ts              保持期限の算出と期限切れ判定
   └─ errors.ts                 AppError (コード + 説明)

shared/                         共有コード (@tsudou/shared)
├─ package.json                 exports で limits / messages / types を公開
├─ tsconfig.json                DOM と Node の型を読み込まない
└─ src/
   ├─ limits.ts                 入力上限・保持期間
   ├─ messages.ts               検証メッセージ
   └─ types.ts                  ドメイン型

frontend/                       フロントエンド (@tsudou/frontend)
├─ package.json                 依存関係とスクリプト
├─ index.html                   エントリ HTML
├─ vite.config.ts               Vite とフロントのテスト設定 (開発時の /api の転送先、sw.js の生成)
├─ public/manifest.webmanifest  PWA のマニフェスト
├─ scripts/capture-guide.mjs    使い方ページの画面キャプチャの撮影
└─ src/
   ├─ main.tsx / router.tsx     エントリとルート定義
   ├─ sw.js                     Service Worker の原本 (ビルドで dist/sw.js になる)
   ├─ routes/                   画面 (Root / Home / Guide / EventCreated / EventPublic /
   │                            EventManage / NotFound)
   ├─ assets/guide/             使い方ページの画面キャプチャ
   ├─ components/               画面部品と ui/ プリミティブ
   └─ lib/                      api, queryClient, errors, storage, urls, format,
                                formValidators, tally, 各種フック
```

## バックエンド

### 認可モデル

認証は持ちません。権限分離は次の 3 点で構造的に保証しています。

- D1 にアクセスできるのは、バインディング（`env.DB`）を持つ API の Worker だけ。
- Express に定義したルートは下表の 7 つだけで、イベントや回答を列挙するルートが存在しない。
  Worker は `/api/*` を Express に渡し（`run_worker_first`）、未定義のパスには Express が 404 を返します。
- 編集系のルートは必ず API サーバのトークン照合を通る。トークンは専用ヘッダで受け取ります。

| ルート | 操作 | トークン |
| --- | --- | --- |
| `POST /api/events` | イベント作成 | – |
| `GET /api/events/{eventId}` | イベント取得（回答を含む） | – |
| `PATCH /api/events/{eventId}` | イベント更新・締切 | `X-Manage-Token` |
| `DELETE /api/events/{eventId}` | イベント削除 | `X-Manage-Token` |
| `POST /api/events/{eventId}/answers` | 回答作成 | – |
| `PUT /api/answers/{answerId}` | 回答更新 | `X-Edit-Token` |
| `DELETE /api/answers/{answerId}` | 回答削除 | `X-Edit-Token` または `X-Manage-Token` |

トークンをパスやクエリではなくヘッダで送るのは、アクセスログやブラウザの履歴に残さないためです。

認証の無い公開 API なので、濫用対策として次を設定しています。

- クライアントの IP（`CF-Connecting-IP`）ごとのレート制限（60 秒あたり 100 リクエスト、`wrangler.jsonc` の `ratelimits`）。
  超えると `429 RATE_LIMITED` を返します。Workers の Rate Limiting は拠点ごとの結果整合なので、厳密な上限ではなく濫用の目安です。
- API は画面と同じオリジンにあり、他のオリジンには CORS を許可しません（CORS のヘッダを一切返さない）。
  他サイトのページからブラウザ経由で呼ばれることはありませんが、ブラウザ以外からの呼び出しは防がないため、濫用対策としてはレート制限が本体です。

### 戻り値型を分離する理由

保存用のレコード型（`EventRecord` / `AnswerRecord`）と公開用の型（`EventView` / `AnswerView`）を分けています。
`manageTokenHash` / `editTokenHash` が **公開型のフィールドとして存在しない**ため、実装ミスでハッシュが外に出る経路がありません。
`operations.ts` の `toEventView` / `toAnswerView` が唯一の詰め替え地点で、型が門番になります。

### API サーバの層構造

```text
worker.ts       エントリ。Express アプリを Worker 内のポート 8080 で listen させ、
                httpServerHandler が fetch をそのポートへのリクエストに変換する
                (実際のソケットは開かない)。D1 とレート制限のバインディングは
                cloudflare:workers の env から取り、createApp に注入する。
   ↓
app.ts          Express アプリ。/api 以下のルーターで、レート制限のあと、ルートごとに
                パスパラメータ・ヘッダ・ボディを operations の引数に詰め替える。
                エラーハンドラが AppError をステータス付きのレスポンスに変え、
                想定外の例外だけログ (Workers Logs) に残して INTERNAL に潰す。
   ↓
http.ts         ボディを schemas.ts の Zod スキーマで検査する。
                値の中身 (長さ・範囲) は validate.ts に任せ、ここでは形だけを見る。
   ↓
operations.ts   業務ロジック。引数に Repository を受け取り、D1 へは直接触らない。
   ↓
repository.ts   データアクセスの境界 (インタフェース)。
   ├─ d1Repository.ts      本番: D1
   └─ memoryRepository.ts  テスト: インメモリ
```

### OpenAPI のドキュメント

`docs/openapi.yaml` は、`schemas.ts` の Zod スキーマと `openapi.ts` のルートの一覧から `@asteasolutions/zod-to-openapi` で生成します（`pnpm run openapi`）。
リクエストのスキーマは実際の検査にも使うので、ドキュメントと実装の入力の形がずれません。
レスポンスのスキーマは `shared/src/types.ts` の型と一致しないと型エラーになるようにしてあります。
生成物が最新かどうかは `openapi.test.ts` が確かめます。

- 長さや範囲の上限は、前後の空白を除いてから数えるため Zod では検査せず、ドキュメント用のメタデータとしてだけ書きます。実際の検査は従来どおり `validate.ts` です。
- メタデータは zod-to-openapi の `.openapi()` ではなく Zod 標準の `.meta()` で書きます。zod-to-openapi はドキュメントの生成時にしか読み込まないので、Worker のバンドルに入りません。

`app.ts` は Workers に依存しない（バインディングは関数として注入する）ので、Node.js 上の supertest でそのままテストできます。
`operations.ts` が `Repository` インタフェースにしか依存しないため、作成 → 回答 → 編集 → 削除という一連の流れをデータベースなしにテストできます（`operations.test.ts`、HTTP の入出力は `app.test.ts`）。

### データモデル

スキーマは `backend/migrations/` にあり、`wrangler d1 migrations apply` で流します。
列名はスネークケースで、`d1Repository.ts` がレコード型（キャメルケース）と詰め替えます。
`created_at` / `updated_at`（ISO 8601 文字列）は `d1Repository.ts` が書き込みます。
D1 は Worker とは別のリソースなので、Worker を削除してもデータは残ります。
誤って消した・壊したときは D1 の Time Travel で過去の時点に戻せます。

`events` テーブル。

| 列 | 型 | 説明 |
| --- | --- | --- |
| `id` | TEXT (PK) | 128bit 乱数の base64url（22 文字）。共有 URL に載る |
| `title` | TEXT | イベント名 |
| `fee` | INTEGER? | 参加費（円）。`NULL` は未設定、`0` は無料 |
| `memo` | TEXT? | 自由記述 |
| `candidates` | TEXT (JSON) | `Candidate[]`（`{ id, startAt }`）。開始日時の昇順 |
| `closed` | INTEGER | 締切フラグ（0 / 1） |
| `manage_token_hash` | TEXT | 管理トークンの SHA-256（hex） |
| `expires_at` | INTEGER | 保持期限（エポック秒）。インデックスあり（期限切れの削除用） |

`answers` テーブル。

| 列 | 型 | 説明 |
| --- | --- | --- |
| `id` | TEXT (PK) | `crypto.randomUUID()` |
| `event_id` | TEXT (FK) | 親イベント。`ON DELETE CASCADE` でイベントと一緒に消える |
| `name` | TEXT | 回答者名。`UNIQUE (event_id, name)` で同一イベント内で一意 |
| `message` | TEXT? | 任意のひとこと |
| `choices` | TEXT (JSON) | `Choice[]`（`{ candidateId, status }`）。候補と 1:1 で対応 |
| `edit_token_hash` | TEXT | 回答編集キーの SHA-256（hex） |
| `expires_at` | INTEGER | 親イベントの値をそのまま引き継ぐ |

候補と選択は、イベントや回答と必ず一緒に読み書きするので、別テーブルにせず JSON の列に埋め込んでいます。
回答は 1 イベントあたり多くても数十件を想定しているため、並べ替え・集計は API サーバとブラウザで行います。
`UNIQUE (event_id, name)` の複合インデックスが、1 イベントの回答を引くインデックスも兼ねます。

同名の回答は `operations.ts` が事前に確かめて `DUPLICATE_NAME` を返しますが、同時に送信されると両方とも確認をすり抜けます。その場合も `UNIQUE` 制約で後の書き込みが失敗し、`d1Repository.ts` がそれを `DUPLICATE_NAME` に変換します。

### トークンと認可の実装

- イベント ID は 128bit、管理トークンと回答編集キーは 256bit の乱数（`node:crypto` の `randomBytes`）。
- トークンは **平文で保存しません**。SHA-256 のハッシュだけを保存し、平文を返すのは発行時の 1 回だけです。
- 照合は `crypto.timingSafeEqual` で行います。長さ差による早期 return を避けるため、常にハッシュ同士を固定長で比較します。
- 管理トークンはクエリ文字列ではなく URL のハッシュフラグメント（`#k=...`）で渡します。フラグメントはサーバに送信されないため、アクセスログや Referer に残りません。

### エラーの伝え方

API サーバは `AppError`（コード + 人間向けの説明）を送出し、`app.ts` のエラーハンドラが HTTP ステータスと `{ "error": { "code", "message" } }` のボディに変換します。

| コード | ステータス |
| --- | --- |
| `VALIDATION` | 400 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CLOSED` / `DUPLICATE_NAME` | 409 |
| `RATE_LIMITED` | 429 |
| `INTERNAL` | 500 |

フロントの `parseApiError`（`frontend/src/lib/errors.ts`）がボディからコードと表示文言を取り出します。
既知のコードでなければ（Cloudflare 自体のエラーなど）`INTERNAL` に丸めます。

## フロントエンド

### 状態管理

サーバ由来のデータは TanStack Query のキャッシュ（`frontend/src/lib/queryClient.ts`、アプリ全体で 1 つ）に置き、それ以外のグローバルな状態ストアは持ちません。状態は用途ごとに置き場所を分けています。

| 状態 | 置き場所 |
| --- | --- |
| サーバ由来のイベント（回答を含む） | TanStack Query のキャッシュ（`useEvent` フック。キーは `['event', eventId]`） |
| フォームの下書き | TanStack Form（各フォームコンポーネントが保持） |
| 通信中フラグとエラー | `useAsyncAction` フック（中身は TanStack Query の `useMutation`） |
| 「保存しました」等の一時表示 | `useFlash` フック |
| 管理トークン / 回答編集キー | メモリのみ（`frontend/src/lib/keyring.ts`）。URL のフラグメントから取り込む |
| テーマの選択 | `localStorage` と `<html data-theme>`（`frontend/src/lib/theme.ts`） |

初期値の差し替えに `useEffect` を使いません。
対象が変わったとき（別イベントを開いた、自分の回答の有無が変わった）は呼び出し側が `key` を変えてフォームを作り直します。

`useEvent` は `useQuery` でイベントを取得します。`eventId` が変わったときに古いレスポンスで上書きしないことや、**画面にフォーカスが戻ったときの取り直し**（`refetchOnWindowFocus`）は Query に任せています。
管理画面を開いたままにしていても、タブに戻れば新しい回答が見えます。
公開ページと管理ページは同じキーを使うので、行き来するとキャッシュをすぐに表示し、裏で取り直します。

- 保存直後はサーバの戻り値でそのまま置き換える `replace`（`setQueryData`）を使い、再取得の 1 往復を省きます。
  戻り値に回答が含まれない操作（回答の作成・更新・削除）のあとは `reload`（`invalidateQueries`）で取り直します。
- イベントを削除したら `forget`（`removeQueries`）でキャッシュからも消し、戻るで古い内容を出さないようにします。
- 取得済みのデータがあるうちは、裏での取り直しに失敗してもエラー画面にせず、そのまま表示を続けます。
- 取得の失敗は、通信の失敗とサーバの想定外エラー（`NETWORK` / `INTERNAL`）だけ 1 回やり直します。
  レート制限などは何度送っても同じなので、すぐにエラーを見せます。
- キャッシュに入るのは `EventView` だけで、管理トークンや回答編集キーは入りません（`keyring.ts` のメモリだけに持つ方針は変わりません）。

`useAsyncAction` は、1 つの画面の操作（保存・締切・削除など）で実行中フラグとエラーを共有するため、操作ごとに `useMutation` を分けず、渡された処理を走らせる 1 つの mutation にしています。
イベント作成（`Home`）は操作が 1 つだけなので、`createEvent` をそのまま `useMutation` に渡しています。

### API 呼び出し

`frontend/src/lib/api.ts` の `request` が `fetch` を包み、「成功なら JSON、失敗なら `ApiError` を throw」に正規化します。
通信自体の失敗は `NETWORK`、`GET /api/events/{eventId}` の 404 は `null` として返します。
レスポンスからアプリ内の型へのキャストもこの 1 箇所に閉じ込め、各関数の戻り値注釈が型の門番になります。

API は画面と同じオリジンの `/api` 以下にあるので、`api.ts` は相対パス（`/api/events` など）で呼びます。
ビルド時に API の URL を渡す必要はありません。ローカル開発では、Vite の開発サーバが `/api` を `wrangler dev`（`localhost:8080`）に転送します（`frontend/vite.config.ts` の `server.proxy`）。

### トークンの扱い

共有 PC を想定して、管理トークンと回答編集キーはブラウザのストレージに保存しません。
`keyring.ts` がモジュール内の `Map` に持ち、`useSyncExternalStore` で画面に配ります。
アプリ内の画面遷移では保たれ、再読み込みやタブを閉じると消えます。
持ち運びは管理用 URL（`#k=...`）と回答編集 URL（`#a=...&k=...`）で行います。

以前のバージョンが `localStorage` に保存していたトークン（`tsudou:hosted` / `tsudou:answered`）は、起動時に `storage.ts` の `purgeLegacyTokens` が消します。
プライベートモードなどで `localStorage` の操作が例外になりうるので、try/catch で握り潰します。

### テーマ

Tailwind の `dark:` は OS 設定ではなく `<html data-theme="dark">` で効くよう、`index.css` の `@custom-variant` で差し替えています。
`data-theme` は `theme.ts` の `useTheme` が選択（`tsudou:theme`）と `prefers-color-scheme` から決めます。
React の描画前に一瞬ライトで表示されるのを防ぐため、`index.html` のインラインスクリプトでも同じ判定を先に行っています。キーや値を変えるときは両方を直してください。
ブラウザの UI（アドレスバーやインストール後のタイトルバー）の色を決める `<meta name="theme-color">` も、同じ 2 か所でヘッダの背景色（`THEME_COLORS`）に合わせて書き換えます。

### PWA

`public/manifest.webmanifest` でインストールできるようにし、Service Worker でオフラインでも画面を起動できるようにしています。
Service Worker の原本は `src/sw.js` で、ビルド時に `vite.config.ts` の `serviceWorker` プラグインが先頭に `VERSION`（HTML / JS / CSS の内容のハッシュ）と `PRECACHE`（`/`、`/assets/` の JS と CSS、`/favicon.svg`）を書き足して `dist/sw.js` として出力します。
登録は `lib/serviceWorker.ts` が本番ビルドでだけ行います（開発サーバには `sw.js` が無く、HMR の邪魔にもなるため）。

| リクエスト | 扱い |
| --- | --- |
| 画面（ナビゲーション） | ネットワーク優先。オフラインのときだけキャッシュの `index.html`（`/`）を返す。URL ごとには保存しない |
| `/assets/*` | キャッシュ優先。無ければ取得してキャッシュする（ファイル名にハッシュが付き中身が変わらないため） |
| `/api/*` | 関与しない（データやトークンをキャッシュに残さない） |
| その他（`public/` のファイル） | ネットワーク優先。オフラインのときだけキャッシュを返す |

新しい Service Worker は待たずに有効になり（`skipWaiting` / `clients.claim`）、`VERSION` の違う古いキャッシュを消します。

## サーバとフロントで共有するコード

`shared/`（`@tsudou/shared`）の 3 ファイルを、フロントとバックエンドの両方から `@tsudou/shared/limits` のようにパッケージ名で import しています。公開するのは `shared/package.json` の `exports` にあるものだけです。

| ファイル | 共有するもの |
| --- | --- |
| `limits.ts` | 入力上限（`LIMITS`）と保持期間（`RETENTION_MONTHS`） |
| `messages.ts` | 検証メッセージの文言 |
| `types.ts` | ドメイン型（`Candidate` / `Choice` / `EventView` / `AnswerView` ほか） |

この 3 つは **ブラウザと Workers の両方にバンドルされるため、片方にしかない API は使えません**。
`shared/tsconfig.json` は DOM と Node の型を読み込まないので、`document` や `process` を使うと型エラーになります（`pnpm run typecheck` に含まれます）。フロントはバックエンドのパッケージに依存しないため、`node:crypto` を引く `validate.ts` / `operations.ts` を参照することもできません。共有したい型は `types.ts` に置きます。

クライアント側の検証（`formValidators.ts`）は送信前に気づかせるための UI 上の親切さであり、最終的な門番は常にサーバ側（`validate.ts`）です。上限値と文言を共有しているため、片方だけがズレることはありません。

## データの保持期間

イベントと回答は作成から `RETENTION_MONTHS`（既定 3 ヶ月）で自動削除されます。

- API サーバがレコード作成時に `expires_at`（エポック秒）を書き込みます。
- 1 日 1 回（UTC 18:00 = JST 3:00）の Cron Trigger が `worker.ts` の `scheduled` を呼び、`d1Repository.ts` の `deleteExpired` が期限を過ぎたイベントを削除します。回答は外部キーの `ON DELETE CASCADE` で一緒に消えます。
- 起算点は **イベントの作成時点**です。編集や回答があっても延長しません。回答はイベントの `expires_at` をそのまま引き継ぎ、イベントと同時に消えます。
- 削除は 1 日 1 回なので、期限から最大 1 日ほどはレコードが残ります。その間もレコードは読めてしまうため、アプリ側でも `retention.ts` の `isExpired` で「存在しない」として扱います。ユーザーから見れば期限ちょうどに消えます。Cron の実行が失敗しても次の日に消えるだけで、見え方は変わりません。
- `retention.test.ts` が `RETENTION_MONTHS` の値を固定しているので、意図しない変更に気づけます。

## デプロイ

`.github/workflows/deploy.yml` を Actions タブから手動実行（`workflow_dispatch`）すると、次の順に実行します。
（現在は移行準備のため `main` への push での自動実行を止めています。）

1. `pnpm run build` でフロントエンドをビルドする（Worker が配信する `frontend/dist/`）
2. D1 のデータベース（`tsudou`）が無ければ `wrangler d1 create tsudou --location apac` で作る（初回だけ）
3. `wrangler d1 migrations apply tsudou --remote` で D1 に未適用のマイグレーションを流す。
   新しいコードが新しいスキーマを前提にできるよう、Worker のデプロイより先に行います
4. `backend/` で `wrangler deploy` して、画面と API を配信する Worker（`tsudou`）を公開する

Cloudflare には Secrets の `CLOUDFLARE_API_TOKEN`（Workers と D1 の編集権限）と `CLOUDFLARE_ACCOUNT_ID` で認証します。アカウント ID は認証情報ではありませんが、ログに出さないよう Secret にしています。

`backend/wrangler.jsonc` の D1 バインディングは `database_id` を持たず、`database_name`（`tsudou`）だけを書いています。
wrangler がデプロイ時にアカウント内のその名前のデータベースを引くので、アカウント固有の ID をリポジトリに置かずに済みます。
データベースは、初回のデプロイで `wrangler d1 info` が見つけられなかったときだけ作ります。

`wrangler deploy` にも、バインディング先のデータベースが無ければ作る機能（resource provisioning）がありますが、使っていません。
リージョンを指定できないため GitHub Actions の実行環境に近い（日本から遠い）場所に作られうること、マイグレーションのステップより後に走るため初回はマイグレーションが失敗することが理由です。
D1 のリージョンは作成後に変えられないので、`--location apac` を付けて明示的に作ります。
`wrangler d1 info` が一時的な理由で失敗しても、`d1 create` は同名のデータベースがあればエラーで止まるので、重複して作られることはありません。

リソースを削除するときは `.github/workflows/destroy.yml` を手動実行します。
入力の `confirm` に Worker 名を入れないと中止し、Worker を先に消して配信を止めてから、`delete_database` が指定されたときだけ D1 のデータベースを消します。
データベースの削除は既定で行わないので、Worker だけ消してもデータは残り、デプロイし直せば元どおりに動きます。
デプロイと同じ concurrency グループ（`deploy`）にして、デプロイの途中で消したり、消した直後に作り直したりしないようにしています。

静的アセットの設定（`assets`）は `backend/wrangler.jsonc` にあり、`directory` は `../frontend/dist` を指します。
Worker のコードと D1 のマイグレーションが `backend/` にあるため、設定もそこに置いています。
`run_worker_first: ["/api/*"]` により API のパスだけが Worker のスクリプトに渡り、それ以外はアセットが直接返ります（画面の配信で Worker を起動しない）。
ルート配信なので、Vite の `base` やルーターの `basename` は既定のままです。

`not_found_handling: "single-page-application"` により、未知のパスへのナビゲーションには `index.html` がステータス 200 で返り、SPA がルーティングします。

レスポンスヘッダは `frontend/public/_headers`（ビルドで `dist/` にコピーされる）で付けます。
全パスに HSTS / `X-Content-Type-Options` / `X-Frame-Options` / `Permissions-Policy` と `Referrer-Policy: no-referrer` を付け、`/assets/*` は長期キャッシュ、`/sw.js` は `no-cache` にします。
管理トークンがフラグメントにあるとはいえ外部リンク経由での漏れを避けるため、Referer は `frontend/index.html` の `<meta name="referrer" content="no-referrer">` でも送らないようにしています。

## ローカル実行

API（`pnpm run dev:api`）と画面（`pnpm run dev`）の開発サーバを別々に起動します。

`pnpm run dev:api` は、`wrangler d1 migrations apply tsudou --local` でローカルの D1 にマイグレーションを流してから、`wrangler dev --port 8080` で Worker を起動します。wrangler は本番と同じランタイム（workerd）で Worker を動かし、D1 と Rate Limiting もローカルの実装に差し替えます。Cloudflare のアカウントは要りません。
ローカルの D1 のデータは `backend/.wrangler/state/` に保存され、停止しても残ります。
`assets.directory`（`frontend/dist/`）が無いと wrangler が起動しないため、無ければ空のディレクトリを先に作ります。

`pnpm run dev` の Vite は `/api` を `localhost:8080` に転送するので、画面から見ると本番と同じく同一オリジンです。
`pnpm run build` でフロントエンドをビルドしておけば、`localhost:8080` を開くと本番と同じ 1 つの Worker の構成で確かめられます。

Cron Trigger はローカルでは自動で動かないため、`curl http://localhost:8080/cdn-cgi/local/scheduled` で手動で呼び出します。

TypeScript の型（`Env` や `D1Database`、`cloudflare:*` モジュール）は `wrangler types` が `backend/worker-configuration.d.ts` に生成します。
`wrangler.jsonc` から作り直せるので、コミットせず `pnpm run typecheck` のたびに生成します。

## テスト

`pnpm test` が各パッケージの Vitest を順に実行します。
フロントエンド（`frontend/vite.config.ts`、`frontend/src/**/*.test.{ts,tsx}`）は jsdom、バックエンド（`backend/vitest.config.ts`、`backend/**/*.test.ts`）は node 環境で動きます。

| 対象 | テスト |
| --- | --- |
| HTTP の入出力 | `app.test.ts`（supertest。/api 以下のルーティング、ステータス、トークンヘッダ、不正な JSON、レート制限） |
| 業務ロジック | `operations.test.ts`（`memoryRepository` を注入し、作成〜回答〜編集〜削除を通しで検証） |
| D1 の実装 | `d1Repository.test.ts`（wrangler の `getPlatformProxy` でローカルの D1 を立て、マイグレーションを流して検証） |
| 検証・正規化 | `validate.test.ts` |
| トークン | `tokens.test.ts`（ハッシュと定時間比較） |
| 保持期間 | `retention.test.ts` |
| フロントの純粋関数 | `format.test.ts` / `errors.test.ts` / `formValidators.test.ts` / `answerDraft.test.ts` / `candidateDraft.test.ts` / `urls.test.ts` / `keyring.test.ts` |
| データ取得のフック | `useEvent.test.tsx` / `useAsyncAction.test.tsx`（テストごとに `createQueryClient()` で作り直し、`api.ts` をモックする） |
| コンポーネント | `AnswerForm.test.tsx` / `AnswerGrid.test.tsx` / `ShareLinkBox.test.tsx` / `EventUrlBoxes.test.tsx` / `Root.test.tsx`（Testing Library） |

## 設計上の判断

ログインを設けない代わりに、権限を「推測できない URL」と「トークン」で表現しています。
メールアドレスもパスワードも預からずに済み、参加者は URL を開くだけで回答できます。
管理トークンと回答編集キーは、共有 PC で次の利用者にイベントや回答を書き換えられないよう、ブラウザに保存しません。発行直後に管理用 URL / 回答編集 URL を表示し、本人に保管してもらいます。
再読み込みで編集できなくなる不便さより、端末に何も残さないことを優先しています。
この制約は作成完了画面と回答直後の表示で明示しています。

操作ごとに Worker を分けず、単一の Worker（Express アプリ）が全操作を解決します。
共有するのは検証・トークン照合・リポジトリ実装であり、分割するとこれらを跨いで配線する手間のほうが大きくなるためです。

当初は Amplify Gen 2（AppSync + API Key）で構築していましたが、API Key が最長 365 日で失効するため年 1 回の再デプロイが必要なこと、Lambda の型チェックに `ampx` の生成物が必要なこと、公開したいのは少数の操作だけで GraphQL の利点が薄いことから、API Gateway（HTTP API）+ Lambda + DynamoDB を CDK で直接定義する構成に移行しました。
HTTP API は REST API（v1）より安価で低レイテンシで、必要なスロットリングと CORS は備えています。

さらに、Lambda のイベント形式に直接依存するハンドラをやめ、Express の普通の HTTP サーバにして Lambda Web Adapter で動かすようにしました。同じ Docker イメージが Lambda でもローカルの `docker compose` でも動くので、AWS なしで API を含めた開発・確認ができ、テストも supertest で書けます。
イメージには Lambda ランタイムの AWS SDK が無いため、SDK も含めて esbuild で 1 ファイルにバンドルしていました。

その後、フロントエンドと同じ Cloudflare にバックエンドも移しました（Workers + D1）。
理由は次のとおりです。

- 配信とデプロイの先が 1 つになり、AWS の認証（OIDC ロール、CDK のブートストラップ）と Docker イメージのビルドが不要になる
- D1 の `UNIQUE` 制約と外部キーで、同名回答の競合と回答の取り残しをデータベース側で防げる（DynamoDB では、一覧を読んでから書く方式のため同時送信を防げなかった）
- ローカル開発が `wrangler dev` だけで済み、DynamoDB Local の Docker が要らなくなる

Express のコードはそのまま使い、`nodejs_compat` と `httpServerHandler` で Workers 上で動かしています。
移行の直後は API を画面とは別の Worker（別オリジン）にしていましたが、1 つの Worker にまとめました。
同一オリジンになることで CORS の設定、許可オリジンと API の URL の Variables、ビルド時の `VITE_API_URL` がすべて不要になり、設定ミスで画面から API を呼べなくなる失敗がなくなるためです。
代わりに API のルートを `/api` 以下に移し、SPA のパスと分けています。
`Repository` インタフェースで業務ロジックとデータアクセスを分けていたため、差し替えたのは `dynamoRepository.ts` → `d1Repository.ts` とエントリ（`server.ts` → `worker.ts`）だけです。
D1 には TTL が無いため、期限切れの削除は Cron Trigger で行います。
