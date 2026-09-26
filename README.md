# apps

個人開発アプリのモノレポ。各アプリは `apps/` 配下に置き、リポジトリ全体を 1 つの pnpm workspace として管理する。

| ディレクトリ | 内容 |
| :-- | :-- |
| [`apps/shelter-map/`](apps/shelter-map/) | 指定緊急避難場所マップ（React Router, Cloudflare Workers） |
| [`apps/tsudou/`](apps/tsudou/) | 日程調整アプリ Tsudou（React, Express, Cloudflare Workers + D1） |

`shelter-map` と `tsudou` の Git 履歴は引き継いでいる。
`apps/` へ移す前のコミットはリポジトリ直下の `shelter-map/` と `tsudou/` にあるため、`git log -- apps/shelter-map/ shelter-map/` のように新旧両方のパスを指定すると通して追える。

## セットアップ

ツールのバージョンはリポジトリ直下の [`mise.toml`](mise.toml) で固定している。

```sh
mise install
pre-commit install
pnpm install
```

依存関係はリポジトリ直下の `pnpm-lock.yaml` 1 つで管理し、`pnpm install` で全アプリ分をまとめてインストールする。
アプリごとのスクリプトは各アプリのディレクトリで実行する。詳細は各ディレクトリの README を参照。

全アプリをまとめて実行する場合は、リポジトリ直下で次を使う。

```sh
pnpm run typecheck
pnpm test
```

ビルドとデプロイはアプリごとに手順が違うため、各アプリのディレクトリで実行する。

## 共通設定

リポジトリ直下に置き、両アプリで共有する。

| ファイル | 内容 |
| :-- | :-- |
| `package.json` | 全アプリをまとめて実行するスクリプトと pnpm のバージョン（`packageManager`） |
| `pnpm-workspace.yaml` | workspace に含めるパッケージと、インストール時スクリプトを許可する依存パッケージ |
| `pnpm-lock.yaml` | 全アプリ共通のロックファイル |
| `.pre-commit-config.yaml` | pre-commit フック |
| `.markdownlint-cli2.yaml` | markdownlint-cli2 の設定 |
| `biome.json` | Biome のルート設定（各アプリの `biome.json` は `"root": false` のネスト設定） |
| `mise.toml` | Node.js、pnpm、pre-commit のバージョン |
| `renovate.json` | Renovate の設定 |
| `.github/workflows/` | CI / CD（ファイル名の接頭辞がアプリ名。`pre-commit.yml` はリポジトリ全体が対象） |
