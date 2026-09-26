# Tsudou

ログイン不要でイベントの日程調整ができる Web アプリです。
主催者がイベントを作成すると共有 URL が発行され、URL を受け取った人が候補日ごとに○（参加）/ △（未定）/ ×（不参加）で回答できます。

- **フロントエンド**: React 19 + React Router (SPA) + TanStack Query + TanStack Form + Tailwind CSS v4 + Vite
- **バックエンド**: Express.js の API サーバを Cloudflare Workers（`nodejs_compat`）で実行。データは Cloudflare D1（SQLite）
- **ホスティング**: 画面（静的アセット）と API を 1 つの Cloudflare Worker で配信（GitHub Actions でデプロイ）

## 機能

| 対象 | できること |
| --- | --- |
| 主催者 | イベント作成（イベント名 / 日時候補（複数）/ 参加費 / メモ）、内容の編集、回答の締切・再開、回答の削除、イベントの削除 |
| 参加予定者 | 候補日ごとの ○△× 回答、メッセージ（任意）の添付、自分の回答の編集・削除 |

PWA に対応しており、スマートフォンのホーム画面や PC にアプリとしてインストールできます。

画面の使い方は、アプリ内の使い方ページ（`/guide`）に画面キャプチャ付きでまとめています。

イベントを作成すると 2 つの URL が発行されます。

| URL | 用途 |
| --- | --- |
| `/e/<eventId>` | **共有用**。参加予定者に送る |
| `/e/<eventId>/manage#k=<manageToken>` | **管理用**。主催者だけが持つ |

## セキュリティモデル

ログインが無いため、権限は「推測できない URL」と「トークン」で表現しています。

- **イベント ID は 128bit の乱数**（base64url 22 文字）。共有 URL を知らない人はイベントに到達できません。
- **データベースはクライアントから触れません。** D1 の `events` / `answers` テーブルには Worker のバインディングを通した API サーバからしかアクセスできません。
- **API のルートは 7 つだけ**（`POST /api/events`、`GET` / `PATCH` / `DELETE /api/events/{eventId}`、`POST /api/events/{eventId}/answers`、`PUT` / `DELETE /api/answers/{answerId}`）。イベントや回答を列挙するルートは存在しません。
  トークン照合と入力検証はすべてサーバ側で行われます。
- **トークンは専用ヘッダ（`X-Manage-Token` / `X-Edit-Token`）で送ります。** URL のパスやクエリに載らないため、アクセスログに残りません。
- **濫用対策**: Workers の Rate Limiting でクライアントの IP ごとに 60 秒あたり 100 リクエストまでに絞っています。
- **API は画面と同じオリジンの `/api` 以下にあります。** 他のオリジンに CORS を許可していないため、他サイトのページからブラウザ経由で API を呼ぶことはできません。
- **Service Worker がキャッシュするのはビルド成果物（HTML / JS / CSS / 画像）だけです。** `/api` のリクエストには関与しないため、イベントや回答のデータ・トークンがブラウザのキャッシュに残りません。画面の HTML も URL ごとには保存しません（管理用 URL がキャッシュのキーに残らない）。
- **トークンは平文で保存しません。** 管理トークン・回答編集キーは SHA-256 のハッシュだけを保存し、照合は `crypto.timingSafeEqual` で行います。平文を返すのは発行時の 1 回だけです。
- **公開用の戻り値型にハッシュのフィールドが存在しません。** `EventView` / `AnswerView` は保存用のレコード型とは別に定義し、API サーバが詰め替えて返すため、実装ミスでハッシュが漏れる経路が構造的にありません。
- **管理トークンと回答編集キーはクエリ文字列ではなくハッシュフラグメント（`#k=...`）で渡します。**
  フラグメントはサーバに送信されないため、アクセスログや Referer に残りません。
  受け取った直後にメモリへ取り込み、`history.replaceState` で URL から取り除きます。
  あわせて `Referrer-Policy: no-referrer` ヘッダと `frontend/index.html` の `<meta name="referrer">` で Referer を送らないようにしています。

> **注意**: 管理トークンと回答編集キーは、共有 PC を想定して **ブラウザに保存しません**。
> イベント作成時の管理用 URL と、回答時の回答編集 URL を保管してください。再表示はできません。

## データの保持期間

イベントと回答は **作成から 3 ヶ月で自動削除** されます。

- API サーバがレコード作成時に `expires_at`（エポック秒）を書き込み、1 日 1 回の Cron Trigger（`backend/wrangler.jsonc` の `triggers.crons`）が期限を過ぎたイベントを削除します。回答は外部キーの `ON DELETE CASCADE` で一緒に消えます。
- **保持期間はイベントの作成時点から数えます。** 編集や回答があっても延長されません。
- 削除は 1 日 1 回なので、期限から最大 1 日ほどはレコードが残ります。その間もレコードは読み取れてしまうため、アプリ側でも期限を過ぎたイベントは「存在しない」として扱っています（`backend/src/retention.ts` の `isExpired`）。ユーザーから見れば期限ちょうどに消えます。
- 保持期間を変えるには `shared/src/limits.ts` の `RETENTION_MONTHS` を変更して再デプロイします。
  **すでに作成済みのレコードの `expires_at` は書き換わりません**（変更後に作成されたものから適用されます）。
- 自動削除される日付は、イベントページと管理ページに表示しています。

## 名前について

「集う」から取っています。ローマ字表記の `Tsudou` をワードマークとし、リポジトリ名・パッケージ名は小文字の `tsudou` を使います。

## セットアップ

```bash
pnpm install
```

pnpm のワークスペースで、`frontend/`（`@tsudou/frontend`）、`backend/`（`@tsudou/backend`）、両者が共有するコードの `shared/`（`@tsudou/shared`）の 3 パッケージに分かれています。
`pnpm install` はリポジトリ直下で 1 回実行すれば両方に入ります。以下のコマンドもすべてリポジトリ直下で実行します。

### ローカル開発

API と画面の開発サーバを、別々のターミナルで起動します。Cloudflare のアカウントは要りません。

```bash
pnpm run dev:api
```

```bash
pnpm run dev
```

- `pnpm run dev:api` は、ローカルの D1 にマイグレーション（`backend/migrations/`）を流してから、Worker を `wrangler dev` で `http://localhost:8080` に起動します。ソースを保存すると再読み込みされます。
  D1 のデータは `backend/.wrangler/` に保存され、停止しても残ります（gitignore 済み。消すときは停止してからこのディレクトリを削除します）。
- `pnpm run dev` は Vite の開発サーバ（`http://localhost:5173`）を起動します。`/api` へのリクエストは `localhost:8080` に転送される（`frontend/vite.config.ts` の `server.proxy`）ので、本番と同じく同一オリジンで API を呼べます。
- `pnpm run build` でフロントエンドをビルドしておくと、`http://localhost:8080` でも本番と同じ構成（同じ Worker が画面と API を返す）で確かめられます。
- Cron Trigger はローカルでは自動で動かないので、期限切れの削除を試すときは `curl http://localhost:8080/cdn-cgi/local/scheduled` を叩きます。

### その他のコマンド

```bash
pnpm run build             # フロントエンドの型チェック + 本番ビルド (frontend/dist/)
pnpm run build:api         # Worker をデプロイせずにバンドル (backend/dist/。先に pnpm run build が要る)
pnpm run typecheck         # 全パッケージの型チェック (backend は wrangler types で Worker の型を生成してから)
pnpm test                  # 両パッケージのユニットテスト (Vitest)
pnpm run lint              # Lint + フォーマット検査 (Biome。リポジトリ全体)
pnpm run lint:fix          # Biome の自動修正
pnpm run openapi           # OpenAPI のドキュメント (docs/openapi.yaml) を作り直す
pnpm run guide:capture     # 使い方ページの画面キャプチャを撮り直す (開発サーバを起動しておく)
```

API のルートや入出力を変えたときは、`backend/src/schemas.ts`（Zod のスキーマ）と `backend/src/openapi.ts`（ルートの一覧）を直し、`pnpm run openapi` で `docs/openapi.yaml` を作り直します。作り直し忘れは `pnpm test` が検出します。

画面の見た目を変えたときは、`pnpm run dev:api` と `pnpm run dev` を起動した状態で `pnpm run guide:capture` を実行し、使い方ページの画面キャプチャ（`frontend/src/assets/guide/`）を撮り直します。
サンプルデータ（「チーム歓迎会」と 4 人の回答）をローカルの D1 に作って撮影します。ブラウザはインストール済みの Google Chrome を使います。
画像のサイズが変わった場合は、`frontend/src/routes/Guide.tsx` の `width` / `height` も合わせます。

D1 のスキーマを変えるときは、`backend/` で `pnpm exec wrangler d1 migrations create tsudou <name>` を実行して `backend/migrations/` にファイルを足します。適用済みのマイグレーションは書き換えません。

## デプロイ（Cloudflare Workers）

`.github/workflows/deploy.yml` を Actions タブから手動実行（`workflow_dispatch`）すると、次の順に実行します。
（現在は `main` への push での自動実行を止めています。）

1. `pnpm run build` でフロントエンドをビルドする（`frontend/dist/`）
2. D1 のデータベース（`tsudou`）が無ければ、`wrangler d1 create tsudou --location apac` で作る（初回だけ）
3. `wrangler d1 migrations apply tsudou --remote` で D1 に未適用のマイグレーションを流す
4. `backend/` で `wrangler deploy` し、画面と API を配信する Worker（`tsudou`）を公開する

### 初回の準備

1. **Cloudflare の API トークンを作る。** My Profile → API Tokens で「Edit Cloudflare Workers」テンプレートから、デプロイ先のアカウントに限定したトークンを作成し、権限に **Account → D1 → Edit** を追加します。
   Worker（`tsudou`）と D1 のデータベース（`tsudou`）は、初回のデプロイで自動的に作られます。
   `backend/wrangler.jsonc` は `database_id` を持たず名前で引くので、ID を設定ファイルに書く必要はありません。
2. **リポジトリの Secrets を設定する**（Settings → Secrets and variables → Actions）。

   | 種類 | 名前 | 値 |
   | --- | --- | --- |
   | Secret | `CLOUDFLARE_API_TOKEN` | 手順 1 のトークン |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare のアカウント ID |

   カスタムドメインを使う場合は、Worker にドメインを割り当てるだけで済みます（画面と API が同一オリジンなので、ほかの設定は要りません）。

### リソースの削除

`.github/workflows/destroy.yml` を Actions タブから手動実行すると、Cloudflare 上のリソースを削除します。
元に戻せないため、入力の `confirm` に Worker 名（`tsudou`）を入れたときだけ実行されます。

1. Worker（`tsudou`）を削除する。画面と API の配信、Cron Trigger が止まります
2. `delete_database` にチェックを入れた場合だけ、D1 のデータベース（`tsudou`）を削除する。
   **イベントと回答のデータはすべて失われます**（既定はチェックなしで、データベースは残ります）

データベースを残しておけば、デプロイし直すと元のデータのまま再開できます。
デプロイと同じ concurrency グループで動くので、デプロイの実行中に重なることはありません。

### 配信の仕様

設定は `backend/wrangler.jsonc`（`assets`）と `frontend/public/_headers` にあります。
静的アセットは Worker のスクリプトを通らずに返り、`/api/*` だけが Worker（Express）に渡ります（`run_worker_first`）。

- **SPA のルーティング**: `not_found_handling: "single-page-application"` により、`/e/<eventId>` のような未知のパスへのナビゲーションには `index.html` がステータス 200 で返り、クライアント側でルーティングされます。
- **レスポンスヘッダ**: `_headers` で静的アセットの全パスに `Strict-Transport-Security` / `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` を付け、ファイル名にハッシュの付く `/assets/*` は長期キャッシュ（`immutable`）にしています。HTML は既定の `max-age=0, must-revalidate` で毎回再検証されます。
- **検索エンジン**: 全パスに `X-Robots-Tag: noindex, nofollow` を付け、通常のトップページ（`/`）だけ外しています。バージョン別・エイリアス付きのプレビュー URL ではトップページにも `noindex, nofollow` を付けます。
  SPA のフォールバックで返る `index.html` にも、リクエストされたパスに応じたヘッダが付きます。
- **PWA**: `public/manifest.webmanifest` と、ビルド時に生成する `sw.js`（`frontend/src/sw.js` が原本。`vite.config.ts` の `serviceWorker` プラグインが先読みするファイルの一覧とキャッシュの版を書き足す）で対応しています。
  画面（ナビゲーション）は常にネットワークから取り、オフラインのときだけキャッシュした `index.html` で起動します。`/assets/*` はキャッシュを優先します。
  `sw.js` はファイル名が変わらないため `_headers` で `no-cache` にし、デプロイ後の更新がすぐ届くようにしています。Service Worker は本番ビルドでだけ登録し、開発サーバ（`pnpm run dev`）では動きません。
- **ルート配信**: サブパスは使わないため、Vite の `base` やルーターの `basename` は既定のままです。
- ローカルで本番と同じ配信を確かめるには、`pnpm run build` のあと `pnpm run dev:api` を実行して `http://localhost:8080` を開きます。

## 構成

```text
backend/                         @tsudou/backend
├─ package.json                  依存関係とスクリプト
├─ wrangler.jsonc                Worker の設定 (静的アセット / D1 / Rate Limiting / Cron Trigger)
├─ migrations/                   D1 のマイグレーション (wrangler d1 migrations)
├─ vitest.config.ts              バックエンドのテスト設定 (node 環境)
├─ scripts/openapi.ts            docs/openapi.yaml の生成 (pnpm run openapi)
└─ src/
   ├─ worker.ts                  Worker のエントリ（Express を listen させ、httpServerHandler に渡す。Cron）
   ├─ app.ts                     Express アプリ（/api 以下のルート、エラーハンドラ、レート制限）
   ├─ http.ts                    ボディの検査 (Zod)、エラー → ステータス対応
   ├─ schemas.ts                 API の入出力の形 (Zod のスキーマ)
   ├─ openapi.ts                 スキーマとルートから OpenAPI のドキュメントを生成
   ├─ operations.ts              業務ロジック（Repository を注入。テスト対象）
   ├─ repository.ts              データアクセスの境界（インタフェース）
   ├─ d1Repository.ts            本番実装（D1）と期限切れの削除
   ├─ memoryRepository.ts        テスト用インメモリ実装
   ├─ tokens.ts                  ID / トークン生成、ハッシュ、定時間比較
   ├─ validate.ts                入力検証と正規化
   ├─ retention.ts               保持期限の算出と期限切れ判定
   └─ errors.ts                  AppError（コード + 説明）

shared/                          @tsudou/shared（フロントとバックエンドの両方にバンドルされる）
├─ package.json                  exports で limits / messages / types を公開
├─ tsconfig.json                 DOM と Node の型を読み込まない (片方にしかない API を使うと型エラー)
└─ src/
   ├─ limits.ts                  入力値の上限・保持期間
   ├─ messages.ts                検証メッセージ
   └─ types.ts                   ドメイン型

frontend/                        @tsudou/frontend
├─ package.json                  依存関係とスクリプト
├─ index.html / vite.config.ts   エントリ HTML と Vite・Vitest の設定 (開発時の /api の転送先)
├─ public/_headers               レスポンスヘッダ
├─ public/favicon.*              favicon (favicon.svg が原本。ヘッダーのロゴにも使用) と apple-touch-icon.png
├─ public/manifest.webmanifest   PWA のマニフェスト (アイコンは public/icon-*.png。favicon.svg から書き出したもの)
├─ scripts/capture-guide.mjs     使い方ページの画面キャプチャの撮影 (pnpm run guide:capture)
└─ src/
   ├─ sw.js                      Service Worker の原本 (ビルドで dist/sw.js になる)
   ├─ router.tsx                 ルート定義
   ├─ routes/                       Home / Guide / EventCreated / EventPublic / EventManage / NotFound
   ├─ assets/guide/              使い方ページの画面キャプチャ
   ├─ components/                AnswerForm, AnswerGrid, CandidateEditor,
   │                             EventEditForm, EventFormFields, EventUrlBoxes,
   │                             ShareLinkBox, ui/
   └─ lib/                       api, queryClient, errors, format, formValidators,
                                 keyring, storage, serviceWorker, theme, urls, useEvent,
                                 useAsyncAction, types
```

### 設計メモ

- **API の業務ロジックは `Repository` インタフェースに依存** しています。テストでは `memoryRepository.ts` を差し込むため、データベースなしに作成〜回答〜編集〜削除の流れを検証できます。
  D1 の実装（`d1Repository.test.ts`）は、wrangler の `getPlatformProxy` でローカルの D1 を立てて検証します。
- **候補日時を編集したときの整合性**: 候補を削除するとその候補への回答も消え、候補を追加すると既存回答は「未定」で埋められます（`validate.ts` の `reconcileChoices`）。候補 ID はクライアントから送り返されるため、編集しても既存回答との紐付けが切れません。
- **同一イベント内で同じ名前は 1 回だけ** 回答できます。同じ人が再度回答しようとした場合は `DUPLICATE_NAME` を返し、回答編集 URL を持つ人だけが編集できます。D1 の `UNIQUE (event_id, name)` 制約があるため、同時に送信されても重複しません。
- **サーバのデータは TanStack Query（`@tanstack/react-query`）** で取得・キャッシュしています。
  画面にフォーカスが戻ると取り直すので、主催者が管理画面を開いたままでも、タブに戻れば新しい回答が見えます。
- **フォームは TanStack Form（`@tanstack/react-form`）** で構築しています。フォームの状態は各フォームコンポーネントが持ち、呼び出し側が `key` を変えて作り直すことで初期値を入れ替えるため、`useEffect` による状態の同期がありません。
- **入力値の上限は 1 か所だけで定義** しています。`shared/src/limits.ts` をサーバの検証（`validate.ts`）とフロントの検証（`frontend/src/lib/formValidators.ts`）の両方が参照するため、片方だけがズレることがありません。クライアント側の検証は送信前に気づかせるためのもので、最終的な門番は常にサーバ側です。

## ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | 構成、認可モデル、API サーバの層構造、共有コード、デプロイ、設計判断 |
| [docs/specification.md](docs/specification.md) | 画面 / URL / API / 業務ルール / 入力制約 / エラーコード |
| [docs/openapi.yaml](docs/openapi.yaml) | API の OpenAPI 3.1 定義（`pnpm run openapi` で生成） |

## コントリビューション

コミットメッセージの規約（Conventional Commits）と実装上の約束は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## スコープ外

通知（メール等）、カレンダー連携、多言語対応、画像アップロードは含みません。
