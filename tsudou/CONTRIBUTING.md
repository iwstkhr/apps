# コントリビューションガイド

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) に従います。

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### type

| type | 用途 |
| --- | --- |
| `feat` | ユーザーから見える機能の追加 |
| `fix` | バグ修正 |
| `refactor` | 挙動を変えないコードの整理、ライブラリの置き換え |
| `perf` | パフォーマンス改善 |
| `test` | テストの追加・修正のみ |
| `docs` | ドキュメントのみ |
| `build` | ビルド設定・依存関係（Vite、wrangler、pnpm パッケージなど） |
| `ci` | CI 設定（`.github/workflows/` など） |
| `chore` | 上記のいずれにも当てはまらない雑務 |
| `style` | フォーマットのみ（挙動・意味を変えない） |

### scope（任意）

変更範囲が明確なときに付けます。例: `data`（D1 のテーブル・マイグレーション・データ形式）、`api`（Express の API サーバ・HTTP ルート）、`infra`（Worker の設定。`backend/wrangler.jsonc`）、`ui`（画面・コンポーネント）、`hosting`（Cloudflare Workers の配信設定）。

```text
feat(data): add a maximum number of participants to an event
fix(ui): prevent answering after the event has been closed
```

### 破壊的変更

type の後ろに `!` を付け、フッターに `BREAKING CHANGE:` を書きます。
このプロジェクトでは、**HTTP API の後方互換性を壊す変更**（ルート・フィールドの削除や必須化、保存済みレコードの形式変更など）と、**すでに発行済みの URL が無効になる変更**が該当します。

```text
feat(data)!: require an end time on date candidates

BREAKING CHANGE: existing Event records have no endAt, so a backfill is
required before deploying.
```

### 本文

**何をしたか**は diff を見れば分かるので、**なぜそうしたか**を書きます。
特に、採用しなかった選択肢がある場合や、一見遠回りに見える実装をした場合は理由を残してください。

### 英語で書きます

件名・本文とも英語です。件名は命令形の現在形（`add`、`fix`、`remove`）で書き、先頭は小文字、末尾にピリオドは打ちません。目安は 72 文字以内です。

なお、この規約が適用されるのはコミットメッセージと PR の説明だけです。
コード中のコメントとドキュメントは引き続き日本語で書きます。

## 実装上の約束

- 入力値の上限は `shared/src/limits.ts` にだけ書きます。
  サーバ検証（`validate.ts`）とフロント検証（`frontend/src/lib/formValidators.ts`）の両方がここを参照します。
- **クライアント側の検証は UI の親切さのためのもので、門番ではありません。**
  新しい入力項目を足すときは、必ずサーバ側（`validate.ts`）にも検証を書いてください。
- `Event` / `Answer` モデルに `.authorization()` を付けないでください。
  スキーマレベルの既定（`allow.resource(eventApi)`）が効いており、モデルに個別の認可を書くとクライアントから直接 CRUD できるようになってしまいます。
- API のルートや入出力を変えたら、`backend/src/schemas.ts` と `backend/src/openapi.ts` を直し、`pnpm run openapi` で `docs/openapi.yaml` を作り直してコミットしてください（忘れると `pnpm test` が失敗します）。
- 公開 API の戻り値には `a.customType`（`EventView` / `AnswerView`）を使い、モデルを直接返さないでください。トークンのハッシュが漏れる経路を作らないためです。

## 開発

セットアップ、ローカル実行、デプロイの手順は [README.md](README.md) を参照してください。

```bash
pnpm run typecheck   # 型チェック
pnpm run lint        # Lint + フォーマット検査 (Biome)
pnpm run lint:fix    # Biome の自動修正
pnpm test            # ユニットテスト
pnpm run build       # 本番ビルド
```

プルリクエストと `main` への push では、GitHub Actions が次を実行します。

| ワークフロー | 内容 |
| --- | --- |
| `.github/workflows/test.yml` | 型チェック（`pnpm run typecheck`）とユニットテスト（`pnpm test`） |
| `.github/workflows/pre-commit.yml` | pre-commit のフック（Biome、markdownlint、actionlint、gitleaks など） |
