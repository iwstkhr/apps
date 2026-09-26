import { TextLink } from '../components/TextLink';
import { MessageCard } from '../components/ui';

export function NotFound() {
  return (
    <MessageCard title="ページが見つかりません">
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        URL が正しいかご確認ください。
      </p>
      <TextLink to="/" className="mt-4 inline-block">
        トップへ戻る
      </TextLink>
    </MessageCard>
  );
}
