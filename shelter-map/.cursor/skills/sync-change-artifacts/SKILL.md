---
name: sync-change-artifacts
description: コード変更時にテスト・GitHub Actions・ドキュメントを同時に更新する。app/ の実装変更、package.json や scripts/ のツール変更、ビルド・デプロイ・データ取得フローの変更時に使用する。
---

# コード変更チェックリスト

コードの変更時に以下を実行する。

- テストコード更新
- GitHub Actions 更新
- ドキュメント更新

## 適用タイミング

| 変更対象 | テスト | GitHub Actions | ドキュメント |
| --- | --- | --- | --- |
| `app/` の実装コード（`*.test.ts(x)` と `app/test/` を除く） | ✅ | ✅ | ✅ |
| `package.json`, `scripts/`, ビルド設定 | — | ✅ | ✅ |
| テスト・フィクスチャ・README・ワークフロー自体の編集 | — | — | — |

実装変更を完了したら、上記 3 点を同じ作業単位（コミット / PR）に含める。

## 1. テストコード更新

### 方針

- ロジック・UI・型の変更には対応する `*.test.ts` / `*.test.tsx` を追加・更新する
- テストは対象コードと**同じディレクトリ**に配置する
- ヘルパー・フィクスチャは `app/test/` を使う（`fixtures.ts`, `render-with-shelter-map.tsx`, `setup.ts`）

### フレームワーク

- Vitest + Testing Library（`happy-dom`）
- 実行: `npm run test`（ウォッチ: `npm run test:watch`）

### 変更種別ごとの対応

| 変更内容 | 対応 |
| --- | --- |
| 新規関数・フック・コンポーネント | 同ディレクトリにテストファイルを新規作成 |
| 既存の振る舞い変更 | 既存テストの期待値・モックを更新 |
| 型・バリデーション追加 | `app/types/` に対応するテストを追加 |
| データ取得・変換ロジック | `vi.mock` で fetch / gzip をモック（`fetch-shelters.test.ts` を参照） |
| React コンポーネント | `render-with-shelter-map.tsx` で Context を包んでレンダリング |

### 完了条件

- [ ] 変更したコードに対応するテストが存在する
- [ ] `npm run test` が通る

## 2. GitHub Actions 更新

ビルド・テスト・デプロイ・データ更新の手順に影響する変更はワークフローを更新する。

### ワークフロー一覧

| ファイル | 役割 | 更新が必要な変更例 |
| --- | --- | --- |
| `.github/workflows/check.yml` | PR / `main` push 時の lint / check / typecheck / test | `npm run` スクリプト追加・変更、`mise run lint` の対象、Node バージョン |
| `.github/workflows/deploy.yml` | Check 成功後の GitHub Pages デプロイ | ビルドコマンド、環境変数（`BASE_PATH` 等）、デプロイ先、`workflow_run` のトリガー条件 |
| `.github/workflows/update-geojson.yml` | 月次 GeoJSON 取得・圧縮 PR | データ取得 URL、圧縮手順、スケジュール、`scripts/` の変更 |

### チェックポイント

- [ ] `package.json` の `scripts` を変更した → `check.yml` の実行コマンドと一致しているか
- [ ] `mise.toml` / `engines.node` を変更した → 全ワークフローの mise 設定と一致しているか
- [ ] ビルドに新しい環境変数が必要 → `deploy.yml` に反映したか
- [ ] `scripts/` のデータ処理を変更した → `update-geojson.yml` に反映したか

## 3. ドキュメント更新

ユーザー向けの挙動・セットアップ・構成に影響する場合は `README.md` を更新する。

### セクション対応表

| 変更内容 | README セクション |
| --- | --- |
| 新機能・変更機能 | 「機能」 |
| `npm run` スクリプトの追加・変更 | 「スクリプト」 |
| ディレクトリ構成の変更 | 「プロジェクト構成」 |
| データ取得・更新フローの変更 | 「データソース」 |
| デプロイ手順の変更 | 「デプロイ」 |
| 技術スタックの追加・変更 | 「技術スタック」 |
| セットアップ手順の変更 | 「セットアップ」「必要条件」 |

### 完了条件

- [ ] ユーザーが知るべき挙動変更が README に反映されている
- [ ] 新しい npm スクリプトがスクリプト表に追加されている

## 作業完了前の確認

```
Task Progress:
- [ ] 実装コードの変更が完了
- [ ] テストを追加・更新し `npm run test` が通る
- [ ] 影響する GitHub Actions ワークフローを更新
- [ ] 影響する README セクションを更新
- [ ] `npm run check` と `npm run typecheck` が通る（CI と同条件）
- [ ] `mise run lint` が通る（CI と同条件）
```
