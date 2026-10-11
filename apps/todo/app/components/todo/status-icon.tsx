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

// Shapes also differ so color is not the only cue. Colors are chosen so that, as icons, they reach a brightness contrast of
// at least 3:1 in every theme: white background, dark mode, and dark sidebars.
// themes.css turns icons without a style white in dark sidebars, so colors are set through style
const STATUS_ICONS: Record<StatusFilter, { Icon: IconType; color?: string }> = {
  // すべて has no color and looks the same as 「すべて」 in the folder pane
  all: { Icon: FaLayerGroup },
  todo: { Icon: FaRegCircle, color: '#7a889c' },
  in_progress: { Icon: FaPlayCircle, color: '#3b82f6' },
  on_hold: { Icon: FaPauseCircle, color: '#a855f7' },
  done: { Icon: FaCheckCircle, color: '#059669' },
};

/** An icon representing a status. It is decoration placed next to a text label, so it is not read aloud. */
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
