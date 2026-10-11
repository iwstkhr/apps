import type { IconType } from 'react-icons';
import {
  FaCheckCircle,
  FaLayerGroup,
  FaPauseCircle,
  FaPlayCircle,
  FaRegCircle,
} from 'react-icons/fa';
import { cn } from '~/lib/cn';
import type { StatusFilter } from '~/lib/todo-filters';

// 色だけに頼らないよう形も変える。色は白い背景・ダークモード・濃いサイドバーのどのテーマでも
// アイコンとして 3:1 以上の明るさの差が出るものにする。
// 濃いサイドバーでは style の無いアイコンを白くする CSS (themes.css) があるので、色は style で付ける
const STATUS_ICONS: Record<StatusFilter, { Icon: IconType; color?: string }> = {
  // すべては色を付けず、フォルダ欄の「すべて」と同じ見た目にする
  all: { Icon: FaLayerGroup },
  todo: { Icon: FaRegCircle, color: '#7a889c' },
  in_progress: { Icon: FaPlayCircle, color: '#3b82f6' },
  on_hold: { Icon: FaPauseCircle, color: '#a855f7' },
  done: { Icon: FaCheckCircle, color: '#059669' },
};

/** ステータスを表すアイコン。文字のラベルと並べて使う飾りなので読み上げない。 */
export function StatusIcon({ status, className }: { status: StatusFilter; className?: string }) {
  const { Icon, color } = STATUS_ICONS[status];
  return (
    <Icon
      className={cn('shrink-0', !color && 'text-slate-500 dark:text-slate-400', className)}
      style={color ? { color } : undefined}
      aria-hidden="true"
      data-status={status}
    />
  );
}
