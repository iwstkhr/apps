import { t, useLanguage } from '../lib/i18n';
import { manageUrl, shareUrl } from '../lib/urls';
import { ShareLinkBox } from './share-link-box';

/**
 * 主催者向けの画面 (作成完了・管理ページ) に出す URL 欄。
 * ラベルと説明文をここに集め、画面ごとに文言がズレないようにする。
 * 参加者向けのイベントページは見せ方が違うため、ShareLinkBox を直接使う。
 */

export function ShareUrlBox({ eventId, openable }: { eventId: string; openable?: boolean }) {
  useLanguage();
  return (
    <ShareLinkBox
      label={t('共有用 URL')}
      description={t('参加予定者に送る URL です。')}
      url={shareUrl(eventId)}
      openable={openable}
      qrCode
    />
  );
}

export function ManageUrlBox({
  eventId,
  manageToken,
  openable,
}: {
  eventId: string;
  manageToken: string;
  openable?: boolean;
}) {
  useLanguage();
  return (
    <ShareLinkBox
      label={t('管理用 URL')}
      description={t('イベントの編集・締切・削除ができます。他の人には共有しないでください。')}
      url={manageUrl(eventId, manageToken)}
      tone="warning"
      openable={openable}
      qrCode
    />
  );
}
