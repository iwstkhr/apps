import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';

/**
 * 確認・お知らせ用の小さなモーダル。表示中だけマウントする。
 * <dialog> の showModal() を使い、フォーカスの閉じ込めと背景の操作の無効化はブラウザに任せる。
 * Esc と背景のクリックは onClose に一本化する。
 */
export function ModalDialog({
  title,
  onClose,
  initialFocus,
  children,
}: {
  title: string;
  onClose: () => void;
  /** 開いたときにフォーカスする要素。省略時はブラウザに任せる (最初の操作できる要素) */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    // 閉じると同時にアンマウントするため、<dialog> の標準の戻し先は使えない
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    initialFocus?.current?.focus();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, [initialFocus]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 背景のクリックに当たるキーボード操作は onCancel (Esc) で受ける
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // 余白は内側の div に持たせ、dialog 自身がクリックされるのを背景のときだけにする
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-xl bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-200 backdrop:bg-slate-900/60 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:backdrop:bg-black/70"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
