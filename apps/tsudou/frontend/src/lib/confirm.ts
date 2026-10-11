import { createContext, useContext } from 'react';

export type ConfirmOptions = {
  /** 確認する内容。ダイアログの見出しになる (翻訳済みの文言を渡す) */
  message: string;
  /** 実行するボタンの文言 (翻訳済み) */
  confirmLabel: string;
};

export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<Confirm | null>(null);

/**
 * window.confirm の代わりに、アプリ内のダイアログで確認する関数を返す。
 * 実行を選ぶと true、キャンセル・Esc・背景のクリックでは false で解決する。
 * ConfirmProvider の内側で使う。
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm は ConfirmProvider の内側で使ってください');
  return confirm;
}
