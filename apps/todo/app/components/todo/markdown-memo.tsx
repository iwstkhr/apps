import { createContext, use, useEffect, useId, useRef, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '~/components/todo/code-block';
import { cn } from '~/lib/cn';
import { t } from '~/lib/i18n';
import { toggleTask } from '~/lib/markdown-list';

/** Checks or unchecks the task item at a source offset, when the memo can be changed */
const ToggleTaskContext = createContext<((offset: number) => void) | null>(null);
/** The source offset of the task item a checkbox belongs to */
const TaskItemContext = createContext<number | null>(null);

const components: Components = {
  li: ({ node, ...props }) => {
    const item = <li {...props} />;
    const offset = node?.position?.start.offset;
    if (offset === undefined || !props.className?.includes('task-list-item')) return item;
    return <TaskItemContext value={offset}>{item}</TaskItemContext>;
  },
  input: function TaskBox({ node: _node, ...props }) {
    const toggle = use(ToggleTaskContext);
    const offset = use(TaskItemContext);
    if (props.type !== 'checkbox' || !toggle || offset === null) return <input {...props} />;
    return <input {...props} disabled={false} onChange={() => toggle(offset)} />;
  },
  // A fenced code block with a language (```ts) is highlighted; others keep the plain <pre>
  pre: ({ node, ...props }) => {
    const code = node?.children[0];
    if (code?.type !== 'element' || code.tagName !== 'code') return <pre {...props} />;
    const className = code.properties.className;
    const lang = Array.isArray(className)
      ? className.find((name) => String(name).startsWith('language-'))
      : undefined;
    if (lang === undefined) return <pre {...props} />;
    const text = code.children.map((child) => (child.type === 'text' ? child.value : '')).join('');
    return (
      <CodeBlock code={text.replace(/\n$/, '')} lang={String(lang).slice('language-'.length)} />
    );
  },
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
 * With onChange, clicking a task box (- [ ]) checks or unchecks it in the memo.
 */
export function MarkdownMemo({
  children,
  onChange,
}: {
  children: string;
  /** Makes task boxes clickable, receiving the memo with the box checked or unchecked */
  onChange?: (memo: string) => void;
}) {
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
          <ToggleTaskContext
            value={onChange ? (offset) => onChange(toggleTask(children, offset)) : null}
          >
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
              {children}
            </Markdown>
          </ToggleTaskContext>
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
