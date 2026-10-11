import { useEffect, useState } from 'react';

/** The element's border-box height, kept up to date as it resizes (0 while it is absent). */
export function useElementHeight(ref: React.RefObject<HTMLElement | null>, enabled = true): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      setHeight(0);
      return;
    }

    const update = () => setHeight(element.getBoundingClientRect().height);
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [ref, enabled]);

  return height;
}
