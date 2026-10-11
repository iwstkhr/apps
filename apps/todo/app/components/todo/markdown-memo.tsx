import { useEffect, useId, useRef, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  // Only displays the memo and never fetches images from external servers.
  img: ({ src, alt }) => (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {alt || t('画像')}
    </a>
  ),
};

/**
 * A memo in the task list. A long memo is cut to about six lines and fades out at the bottom,
 * and 続きを読む expands it in place, so one long memo does not push the rest of the list far down.
 */
export function MarkdownMemo({ children }: { children: string }) {
  const contentId = useId();
  const clipRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [long, setLong] = useState(false);

  useEffect(() => {
    const clip = clipRef.current;
    const content = contentRef.current;
    // While expanded nothing is cut, so keep the last measurement to keep showing 折りたたむ
    if (!clip || !content || expanded) return;
    const update = () => setLong(content.offsetHeight > clip.clientHeight + 1);
    update();
    // The content's height changes with edits, the window width, and the language
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(content);
    return () => observer?.disconnect();
  }, [expanded]);

  const collapsed = long && !expanded;

  // A link in the cut-off part would scroll inside the clipped box when focused, so expand instead
  useEffect(() => {
    const clip = clipRef.current;
    if (!clip || !collapsed) return;
    const expand = () => setExpanded(true);
    clip.addEventListener('focusin', expand);
    return () => clip.removeEventListener('focusin', expand);
  }, [collapsed]);

  return (
    <div className="mt-1">
      <div
        ref={clipRef}
        id={contentId}
        className={cn(
          'todo-memo break-words text-sm text-slate-600 dark:text-slate-400',
          !expanded && 'max-h-32 overflow-hidden',
          collapsed && '[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.5rem),transparent)]',
        )}
      >
        <div ref={contentRef}>
          <Markdown remarkPlugins={[remarkGfm]} components={components}>
            {children}
          </Markdown>
        </div>
      </div>
      {long && (
        <button
          type="button"
          className="mt-1 cursor-pointer text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          {t(expanded ? '折りたたむ' : '続きを読む')}
        </button>
      )}
    </div>
  );
}
