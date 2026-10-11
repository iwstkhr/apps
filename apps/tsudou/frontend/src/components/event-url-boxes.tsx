import { t, useLanguage } from '../lib/i18n';
import { manageUrl, shareUrl } from '../lib/urls';
import { ShareLinkBox } from './share-link-box';

/**
 * URL boxes shown on host screens (the created screen and the manage page).
 * Labels and descriptions are gathered here so the wording stays consistent across screens.
 * The participants' event page presents them differently, so it uses ShareLinkBox directly.
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
