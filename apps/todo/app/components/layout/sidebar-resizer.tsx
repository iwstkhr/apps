import { type PointerEvent, useRef, useState } from 'react';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';

interface SidebarResizerProps {
  width: number;
  min: number;
  max: number;
  defaultWidth: number;
  onChange: (width: number) => void;
  /** 動かす対象 (aria-controls) */
  controls: string;
}

// 矢印キー 1 回で動かす幅 (px)。Shift を押すと大きく動かす
const STEP = 16;
const LARGE_STEP = 64;

/**
 * フォルダ欄の右端に置く、幅を変えるためのつまみ。
 * ドラッグ、または フォーカスして ← / → (Home / End で最小 / 最大) で動かし、ダブルクリックで元の幅に戻す。
 */
export function SidebarResizer({
  width,
  min,
  max,
  defaultWidth,
  onChange,
  controls,
}: SidebarResizerProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove('select-none', 'cursor-col-resize');
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: 幅を変えられる区切りは hr では表せないので separator ロールを使う
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('フォルダ欄の幅')}
      aria-controls={controls}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={t('ドラッグで幅を変更 (ダブルクリックで元に戻す)')}
      className="group absolute top-0 -right-[1.125rem] hidden h-full w-3 cursor-col-resize touch-none justify-center focus:outline-none lg:flex"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragRef.current = { startX: event.clientX, startWidth: width };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        // ドラッグ中に文字が選択されたり、カーソルが元に戻ったりしないようにする
        document.body.classList.add('select-none', 'cursor-col-resize');
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag) onChange(drag.startWidth + event.clientX - drag.startX);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onChange(defaultWidth)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? LARGE_STEP : STEP;
        const next = {
          ArrowLeft: width - step,
          ArrowRight: width + step,
          Home: min,
          End: max,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        onChange(next);
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-full w-0.5 rounded-full transition-colors group-hover:bg-blue-400 group-focus-visible:bg-blue-500',
          dragging ? 'bg-blue-500' : 'bg-transparent',
        )}
      />
    </div>
  );
}
