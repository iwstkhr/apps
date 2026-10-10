import { RETENTION_MONTHS } from '@tsudou/shared/limits';
import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router';
import sizes from '../assets/guide/sizes.json';
import { TextLink } from '../components/TextLink';
import { Alert, Card } from '../components/ui';
import { t, useLanguage } from '../lib/i18n';

/**
 * 使い方のページ。画面キャプチャはサンプルデータで表示言語ごとに撮ったもので、
 * `pnpm run guide:capture` (frontend/scripts/capture-guide.mjs) で撮り直せる。
 * 画面の見た目を変えたら撮り直すこと。
 */

const images = import.meta.glob<string>('../assets/guide/*/*.png', {
  eager: true,
  import: 'default',
});

type ScreenshotName = keyof (typeof sizes)['ja'];

/**
 * 表示言語の画面キャプチャ。幅・高さは撮影時に sizes.json へ書き出した
 * CSS ピクセル (2 倍解像度の画像の半分。レイアウトのずれ防止)。
 */
function Screenshot({
  name,
  alt,
  caption,
}: {
  name: ScreenshotName;
  alt: string;
  caption?: string;
}) {
  const language = useLanguage();
  const src = images[`../assets/guide/${language}/${name}.png`];
  const { width, height } = sizes[language][name];
  return (
    <figure className="space-y-2">
      {/* スマートフォンでは縮小されて読みにくいので、タップで原寸を開けるようにする */}
      <a href={src} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-lg bg-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
        />
      </a>
      {caption && (
        <figcaption className="text-center text-xs text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="space-y-3">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs text-white tabular-nums"
        >
          {number}
        </span>
        {title}
      </h3>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:pl-8 dark:text-slate-300">
        {children}
      </div>
    </li>
  );
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>;
}

export function Guide() {
  useLanguage();
  const { hash } = useLocation();

  // /guide#guest のように直接開いたとき、ブラウザの自動スクロールは描画前に終わってしまうので、
  // 描画後に自前で見出しまで移動する
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h1 className="text-lg font-bold">{t('使い方')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t(
            'Tsudou はログイン不要の日程調整ツールです。主催者がイベントを作って URL を送り、参加者はその URL を開いて候補日ごとに ○（参加）/ △（未定）/ ×（不参加）で回答します。',
          )}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t(
            'ヘッダーで「日本語」または「English」を選ぶと、表示言語を切り替えられます。選択はこのブラウザに保存されます。入力したイベント名やメッセージは翻訳されません。',
          )}
        </p>
        <nav aria-label={t('目次')}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              ['host', t('イベント管理者（主催者）の使い方')],
              ['guest', t('イベント参加者の使い方')],
              ['faq', t('よくある質問')],
            ].map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t(
            '画面はサンプルデータ（「チーム歓迎会」の日程調整）で表示した例です。日付や URL は実際の画面と異なります。',
          )}
        </p>
      </Card>

      {/* ------------------------------------------------------------ 主催者 */}
      <Card className="space-y-6">
        <div>
          <h2 id="host" className="scroll-mt-6 text-lg font-bold">
            {t('イベント管理者（主催者）の使い方')}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('イベントを作成し、参加者の回答を見て日程を決めるまでの流れです。')}
          </p>
        </div>

        <ol className="space-y-10">
          <Step number={1} title={t('イベントを作成する')}>
            <p>
              <TextLink to="/">{t('トップページ')}</TextLink>
              {t('で次の項目を入力し、「イベントを作成して URL を発行」を押します。')}
            </p>
            <Bullets>
              <li>
                <strong>{t('イベント名')}</strong>
                {t('（必須）: 参加者に表示される名前です。')}
              </li>
              <li>
                <strong>{t('日時の候補')}</strong>
                {t(
                  '（必須）: 「＋ 候補を追加」で最大 30 件まで追加できます。追加した行には直前の候補の翌日・同じ時刻が入るので、連日の候補も手早く並べられます。',
                )}
              </li>
              <li>
                <strong>{t('参加費')}</strong>・<strong>{t('メモ')}</strong>
                {t('（任意）: 会費や集合場所など、参加者に伝えたいことを書きます。')}
              </li>
            </Bullets>
            <Screenshot
              name="host-create"
              alt={t(
                'イベント作成フォーム。イベント名に「チーム歓迎会」、日時の候補に 3 週ぶんの金曜 19:00、参加費に 4000、メモに会場と会費の案内を入力した状態',
              )}
            />
          </Step>

          <Step number={2} title={t('2 つの URL を控える')}>
            <p>{t('作成が終わると、2 種類の URL が表示されます。')}</p>
            <Bullets>
              <li>
                <strong>{t('共有用 URL')}</strong>
                {t(': 参加者に送る URL です。')}
              </li>
              <li>
                <strong>{t('管理用 URL')}</strong>
                {t(
                  ': イベントの編集・締切・削除に使う、主催者だけの URL です。他の人には共有しないでください。',
                )}
              </li>
            </Bullets>
            <Screenshot
              name="host-created"
              alt={t(
                '作成完了画面。共有用 URL と管理用 URL が、それぞれコピー・開く・共有ボタン付きで表示されている',
              )}
            />
            <Alert variant="warning" title={t('管理用 URL は再表示できません')}>
              {t(
                'ログインが無いため、管理用 URL を表示できるのはこの画面だけです。ページを閉じる前に「コピー」してメモに貼るか、ブックマークしてください。',
              )}
            </Alert>
          </Step>

          <Step number={3} title={t('共有用 URL を参加者に送る')}>
            <p>
              {t(
                '「コピー」した共有用 URL を、チャットやメールで参加者に送ります。スマートフォンでは「共有」ボタンから直接アプリに送れます。 参加者はログインせずに回答できます。',
              )}
            </p>
          </Step>

          <Step number={4} title={t('管理ページで回答状況を確認する')}>
            <p>
              {t(
                '管理用 URL を開くと管理ページが表示されます。上部には共有用 URL と管理用 URL がいつでも表示されるので、送り忘れた場合もここからコピーできます。 「参加者から見た画面」で、参加者と同じイベントページを確認できます。',
              )}
            </p>
            <Screenshot
              name="host-manage-urls"
              alt={t(
                '管理ページの上部。イベント名「チーム歓迎会」と、共有用 URL・管理用 URL のコピー欄',
              )}
            />
            <p>
              {t(
                '「回答状況」には回答者ごとの ○△× が一覧で表示されます。各候補の見出しに ○△× の人数が出て、○ がいちばん多い候補は緑色で「最多」と示されます。 いたずらや重複の回答は、行の右の「削除」で消せます。',
              )}
            </p>
            <Screenshot
              name="host-manage-answers"
              alt={t(
                '管理ページの回答状況。4 名の回答が並び、○ が 4 人の 3 つ目の候補が「最多」として強調されている。各回答の右に削除ボタン',
              )}
              caption={t('この例では 3 つ目の候補に全員が参加でき、「最多」になっています')}
            />
          </Step>

          <Step number={5} title={t('内容を編集する')}>
            <p>
              {t(
                '「内容を編集」で、イベント名・候補・参加費・メモをあとから変更できます。 変更は「変更を保存」を押すと参加者の画面にも反映されます。',
              )}
            </p>
            <Bullets>
              <li>{t('候補を削除すると、その候補への回答も消えます。')}</li>
              <li>{t('候補を追加すると、すでに回答した人のその候補は「△ 未定」になります。')}</li>
            </Bullets>
            <Screenshot
              name="host-manage-edit"
              alt={t(
                '管理ページの内容の編集フォーム。作成時と同じイベント名・候補・参加費・メモの入力欄',
              )}
            />
          </Step>

          <Step number={6} title={t('回答を締め切る・イベントを削除する')}>
            <p>
              {t(
                '日程が決まったら「回答を締め切る」を押します。締切中は参加者が新しく回答したり、回答を変更したりできなくなります。 「受付を再開する」でいつでも元に戻せます。',
              )}
            </p>
            <p>
              {t(
                '「イベントを削除」を押すと、イベントとすべての回答が削除されます（元に戻せません）。 削除しなくても、作成から',
              )}
              {RETENTION_MONTHS}
              {t('ヶ月後に自動で削除されます。')}
            </p>
            <Screenshot
              name="host-manage-close"
              alt={t(
                '管理ページの締切と削除。「回答を締め切る」ボタンと「イベントを削除」ボタン、自動削除日の案内',
              )}
            />
          </Step>
        </ol>
      </Card>

      {/* ------------------------------------------------------------ 参加者 */}
      <Card className="space-y-6">
        <div>
          <h2 id="guest" className="scroll-mt-6 text-lg font-bold">
            {t('イベント参加者の使い方')}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t(
              '主催者から届いた URL を開いて、出欠を回答するまでの流れです。登録やログインは要りません。',
            )}
          </p>
        </div>

        <ol className="space-y-10">
          <Step number={1} title={t('共有された URL を開く')}>
            <p>
              {t(
                '主催者から届いた URL を開くと、イベントの内容（参加費・メモなど）が表示されます。',
              )}
            </p>
            <Screenshot
              name="guest-event"
              alt={t(
                'イベントページの上部。イベント名「チーム歓迎会」、参加費 ¥4,000、メモ、自動削除日',
              )}
            />
          </Step>

          <Step number={2} title={t('ほかの人の回答状況を見る')}>
            <p>
              {t(
                '「回答状況」で、ほかの参加者がどの日に参加できるかを確認できます。○ がいちばん多い候補は緑色で「最多」と表示されます。メッセージ付きの回答は表の下に並びます。',
              )}
            </p>
            <Screenshot
              name="guest-status"
              alt={t(
                'イベントページの回答状況。3 名の ○△× が表で表示され、表の下に佐藤 花子さんのメッセージ',
              )}
            />
          </Step>

          <Step number={3} title={t('出欠を回答する')}>
            <p>{t('「出欠を回答する」で次を入力し、「回答する」を押します。')}</p>
            <Bullets>
              <li>
                <strong>{t('お名前')}</strong>
                {t('（必須）: 回答状況の一覧に表示されます。同じイベントで同じ名前は使えません。')}
              </li>
              <li>
                <strong>{t('参加できる日時')}</strong>
                {t(
                  ': 候補ごとに「○ 参加」「△ 未定」「× 不参加」を選びます。 右上の「一括」を使うと、すべての候補をまとめて同じ回答にできます。',
                )}
              </li>
              <li>
                <strong>{t('メッセージ')}</strong>
                {t('（任意）: 「遅れて参加します」などの補足を書けます。')}
              </li>
            </Bullets>
            <Screenshot
              name="guest-answer"
              alt={t(
                '回答フォーム。お名前に「田中 健太」、1 つ目と 3 つ目の候補に「○ 参加」、2 つ目に「× 不参加」を選び、メッセージを入力した状態',
              )}
            />
          </Step>

          <Step number={4} title={t('回答編集 URL を控える')}>
            <p>
              {t('回答すると「回答を保存しました。」と表示され、')}
              <strong>{t('回答編集 URL')}</strong>
              {t('が発行されます。あとで回答を変更・削除するにはこの URL が必要です。')}
            </p>
            <Screenshot
              name="guest-answered"
              alt={t(
                '回答後の画面。「回答を保存しました。」の表示と、回答編集 URL のコピー欄、回答内容の編集フォームと「自分の回答を削除」ボタン',
              )}
            />
            <Alert variant="warning" title={t('回答編集 URL は再表示できません')}>
              {t(
                'ページを閉じる前に「コピー」してメモに貼るか、ブックマークしてください。この URL を知っている人はあなたの回答を変更できるので、他の人には共有しないでください。',
              )}
            </Alert>
          </Step>

          <Step number={5} title={t('回答を変更・削除する')}>
            <p>
              {t(
                '控えておいた回答編集 URL を開くと、自分の回答が入った状態のフォームが表示されます。 内容を直して「回答を更新する」を押すと変更でき、「自分の回答を削除」で回答を取り消せます。 回答状況の表では、自分の行に「自分」と表示されます。',
              )}
            </p>
          </Step>

          <Step number={6} title={t('締め切られた場合')}>
            <p>
              {t(
                '主催者が回答を締め切ると、回答フォームの代わりに次の案内が表示され、新しい回答や変更はできなくなります。 回答状況はそのまま見られます。',
              )}
            </p>
            <Screenshot
              name="guest-closed"
              alt={t(
                '締切後のイベントページ。「このイベントは締め切られているため、回答できません。」という案内',
              )}
            />
          </Step>
        </ol>
      </Card>

      {/* ------------------------------------------------------ よくある質問 */}
      <Card className="space-y-4">
        <h2 id="faq" className="scroll-mt-6 text-lg font-bold">
          {t('よくある質問')}
        </h2>
        <dl className="space-y-4 text-sm leading-relaxed">
          <div>
            <dt className="font-semibold">{t('管理用 URL（または回答編集 URL）をなくしました')}</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {t(
                '再発行はできません。共有 PC で他の人に使われないよう、URL に含まれる鍵をブラウザにもサーバにも平文では残していないためです。 管理用 URL をなくした場合は、新しくイベントを作り直してください。',
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t('「管理用 URL が必要です」と表示されます')}</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {t(
                '管理ページを再読み込みすると、鍵が画面から消えるため操作できなくなります。控えておいた管理用 URL（末尾に',
              )}
              <code>#k=...</code> {t('が付いたもの）を開き直してください。')}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t('「この名前はすでに回答済みです」と表示されます')}</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {t(
                '同じイベントで同じ名前は 1 回しか回答できません。自分の回答を直したい場合は、回答時に控えた回答編集 URL を開いてください。別の人の場合は、名前を少し変えて（名字を足すなど）回答してください。',
              )}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t('イベントページは安全ですか')}</dt>
            <dd className="mt-1 space-y-2 text-slate-700 dark:text-slate-300">
              <p>
                {t(
                  '共有用 URL を知っている人は、ログインせずにイベントの内容と回答状況（お名前・○△×・メッセージ）を見られます。 URL には推測できないランダムな文字列を使い、検索エンジンにも載らないようにしていますが、URL が転送されればその人も見られます。 送る相手に気をつけ、電話番号や住所など知られて困る情報は書かないでください。',
                )}
              </p>
              <p>
                {t(
                  'ページを見られても、イベントや回答を変更されることはありません。 変更には管理用 URL・回答編集 URL に含まれる鍵が必要で、サーバには鍵そのものではなく、元に戻せない形に変換した値だけを保存しています。',
                )}
              </p>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t('データはいつまで残りますか')}</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {t('イベントと回答は、作成から')}
              {RETENTION_MONTHS}
              {t(
                'ヶ月後に自動で削除されます。編集や回答をしても期限は延びません。削除される日付はイベントページと管理ページに表示されます。',
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <p className="text-center">
        <TextLink to="/">{t('イベントを作成する')}</TextLink>
      </p>
    </div>
  );
}
