# apps

個人開発アプリのモノレポ。各アプリはそれぞれのディレクトリで独立して管理する。

| ディレクトリ | 内容 |
| :-- | :-- |
| [`shelter-map/`](shelter-map/) | 指定緊急避難場所マップ（React Router, GitHub Pages, npm） |
| [`tsudou/`](tsudou/) | 日程調整アプリ Tsudou（React, Express, Cloudflare Workers + D1, pnpm workspace） |

`shelter-map` と `tsudou` の Git 履歴は、それぞれのサブディレクトリに移した状態で引き継いでいる。
過去のコミットも `git log -- shelter-map/` のようにディレクトリを指定して追える。

## セットアップ

ツールのバージョンはリポジトリ直下の [`mise.toml`](mise.toml) で固定している。

```sh
mise install
pre-commit install
(cd shelter-map && npm ci)
(cd tsudou && pnpm install)
```

npm / pnpm のスクリプトは各アプリのディレクトリで実行する。詳細は各ディレクトリの README を参照。

## 共通設定

リポジトリ直下に置き、両アプリで共有する。

| ファイル | 内容 |
| :-- | :-- |
| `.pre-commit-config.yaml` | pre-commit フック |
| `.markdownlint-cli2.yaml` | markdownlint-cli2 の設定 |
| `biome.json` | Biome のルート設定（各アプリの `biome.json` は `"root": false` のネスト設定） |
| `mise.toml` | Node.js、pnpm、pre-commit のバージョン |
| `renovate.json` | Renovate の設定 |
| `.github/workflows/` | CI / CD（ファイル名の接頭辞がアプリ名。`pre-commit.yml` はリポジトリ全体が対象） |
