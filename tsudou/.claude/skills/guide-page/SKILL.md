---
name: guide-page
description: Tsudou の使い方ページ（/guide、frontend/src/routes/Guide.tsx）を作成・更新する手順。画面キャプチャをサンプルデータで撮り直し（pnpm run guide:capture）、画像の寸法・説明文・代替テキスト・テスト・ドキュメントを実際の画面に合わせる。「使い方ページを更新して」「スクショを撮り直して」「ガイドに○○の説明を足して」と言われたときはもちろん、画面の文言・ボタン名・レイアウト・フォーム項目・画面遷移を変えたとき（Home / EventCreated / EventPublic / EventManage やその部品の変更）にも、使い方ページが古くならないよう必ずこのスキルを使うこと。
---

# 使い方ページの作成・更新

使い方ページは、主催者と参加者それぞれの操作手順を、サンプルデータで撮った画面キャプチャ付きで説明するページです。
画面を変えても使い方ページは自動では追従しないので、放っておくと古い画面キャプチャと存在しないボタン名が残ります。
このスキルは「画面の変更 → 使い方ページの追従」を漏れなく行うためのものです。

## 関係するファイル

| ファイル | 役割 |
| --- | --- |
| `frontend/src/routes/Guide.tsx` | ページ本体。`Step`（番号付き手順）、`Screenshot`（画像 + 寸法 + 代替テキスト）、よくある質問 |
| `frontend/scripts/capture-guide.mjs` | 画面キャプチャの撮影。サンプルデータを作りながら各画面を撮る |
| `frontend/src/assets/guide/*.png` | 画面キャプチャ。import するのでビルドでハッシュ付きファイル名になり長期キャッシュされる（`public/` には置かない） |
| `frontend/src/routes/Guide.test.tsx` | 見出し・目次・全画像の代替テキストと寸法を検査 |
| `docs/specification.md`（「使い方（`/guide`）」）、`README.md`、`docs/architecture.md` | ページの仕様、撮り直し手順、構成図 |

画像と、それを撮っている画面の対応は次のとおりです。画面を変えたら、該当する画像を撮り直し、周辺の説明文も見直します。

| 画像 | 撮っている画面・カード |
| --- | --- |
| `host-create` | トップ（`Home`）のイベント作成フォーム。トップのカードに何か足すと高さが変わる |
| `host-created` | 作成完了（`EventCreated`） |
| `host-manage-urls` / `-edit` / `-answers` / `-close` | 管理ページ（`EventManage`）の各カード |
| `guest-event` / `guest-status` | イベントページ（`EventPublic`）の概要と回答状況 |
| `guest-answer` / `guest-answered` | 回答フォーム（`AnswerForm`）の入力中と回答後 |
| `guest-closed` | 締切後のイベントページ |

## 手順

### 1. 影響範囲を決める

`git diff` で画面の変更を確認し、上の表から撮り直す画像と直す説明文を洗い出します。
ボタン名・見出し・メッセージが変わった場合は、`Guide.tsx` の本文を `grep` して古い文言を探します。
キャプチャ撮影スクリプトもラベルやロールで要素を探しているので、文言の変更で壊れることがあります。

### 2. 撮影スクリプトを直す（必要なときだけ）

新しい画面・状態を撮るとき、または文言の変更でロケーターが外れたときに `capture-guide.mjs` を直します。

- 要素は `getByLabel` / `getByRole` / `card(page, '見出しの文言')`（その文言を含む `section`）で探す。CSS クラスに依存すると見た目の調整だけで壊れる。
- 撮影は `shot(locator, name)` を使う。ネットワークが落ち着くのを待ち、マウスを退避し、URL 欄の `localhost` を `https://tsudou.example.com` に差し替えてから撮る。差し替えを撮影の直前にしているのは、React の再描画で元に戻るため。
- 候補日は実行日から計算している（作成時は過去の日時を候補にできないため）。日付を固定値にしない。
- 他の参加者の回答は API（`POST /api/events/{id}/answers`）で入れている。画面操作で入れるより速く、壊れにくい。

### 3. 撮り直す

開発サーバを 2 つ起動します。Browser ペインが使えるなら `preview_start` で `api` と `frontend`（`.claude/launch.json`）を起動します。使えなければ、ユーザーに `pnpm run dev:api` と `pnpm run dev` の起動を頼みます。

```bash
pnpm run guide:capture
```

- インストール済みの Google Chrome を使う（`playwright-core` はブラウザをダウンロードしない）。Chrome が無ければその旨を伝える。
- 実行するたびにローカルの D1（`backend/.wrangler/`）にサンプルのイベントが 1 件増える。gitignore 済みで害はないが、報告に書いておく。

### 4. 画像を目で確かめる

撮り直した画像はすべて Read で開いて確認します。スクリプトが成功しても、見た目がおかしいことがあるためです。

- URL 欄に `localhost` が残っていないか
- ホバー・フォーカスの枠、読み込み中の表示、エラー表示が写り込んでいないか
- 説明文で触れている要素（「最多」の表示、「自分」のバッジなど）が実際に写っているか

### 5. 寸法を合わせる

`Screenshot` の `width` / `height` は、2 倍解像度で撮った画像の CSS ピクセル（実寸の半分）です。画像を読み込む前から場所を確保して、表示のがたつきを防ぐためにあります。撮り直したら必ず確認します。

```bash
cd frontend/src/assets/guide && for f in *.png; do echo "$f $(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{print $2/2}' | tr '\n' ' ')"; done
```

高さが変わった画像は `Guide.tsx` の値を直します（幅は通常 736 のまま）。

### 6. 説明文と代替テキストを直す

- **画面の文言は実物からコピーする。** ボタン名・メッセージは記憶で書かず、コンポーネントやサーバのメッセージ（`backend/src/errors.ts` など）を `grep` して一字一句合わせる。「保存」と「変更を保存」のような小さなずれが、読者にはボタンが見つからない原因になる。
- **代替テキストには具体的な日付を書かない。** 候補日は撮るたびに変わるので「3 つ目の候補」のように書く。代替テキストは画像が読めない人向けに、何が写っているかを 1 文で説明する。
- 文体は既存に合わせる: 丁寧語、UI の文言は「」で囲む、注意点は `Alert`（`variant="warning"`）で出す。
- 新しい画像を足すときは import を追加し、`Screenshot` に `alt` / `width` / `height` を必ず渡す（`Guide.test.tsx` が検査する）。
- 保持期間など設定から来る値は `RETENTION_MONTHS` のように定数を参照し、数字を直書きしない。

### 7. 確認する

```bash
pnpm exec biome check --write frontend
pnpm --filter @tsudou/frontend run typecheck
pnpm --filter @tsudou/frontend test
```

Browser ペインで `/guide` を開き、次を確かめます。

- デスクトップ幅とモバイル幅（`resize_window` の `mobile`）で横スクロールが出ないこと
- ライトとダークの両方で読めること（画像はライトテーマで撮っている）
- `/guide#host`・`#guest`・`#faq` を直接開いて、その見出しまでスクロールすること

### 8. ドキュメントを直す（必要なときだけ）

ページの構成（セクション、目次、撮影手順、ファイル配置）を変えたときは、`docs/specification.md` の「使い方（`/guide`）」と README の撮り直し手順を合わせます。文言や画像の差し替えだけなら不要です。

## 報告

最後に次を短くまとめます。

- 撮り直した画像と、直した説明文
- 寸法を変えた画像
- テスト・型チェック・Lint の結果と、ブラウザで確かめたこと
- ローカルの D1 にサンプルのイベントが増えたこと

コミットはユーザーに頼まれたときだけ行います。
