import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A temporary message such as 「保存しました」. Calling show() makes it disappear automatically after ms.
 *
 * The timer is always cleared on unmount and when shown again. When each screen
 * called setTimeout directly there was no cleanup,
 * and setState ran after leaving the screen.
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
