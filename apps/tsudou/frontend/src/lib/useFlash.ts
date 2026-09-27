import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 「保存しました」のような一時表示。show() を呼ぶと ms 後に自動で消える。
 *
 * タイマーはアンマウント時と再表示時に必ず破棄する。各画面で
 * setTimeout を直接書いていたときはクリーンアップが無く、
 * 画面を離れたあとに setState が走っていた。
 */
export function useFlash(ms = 3000): [boolean, () => void] {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback(() => {
    window.clearTimeout(timer.current);
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), ms);
  }, [ms]);

  return [visible, show];
}
