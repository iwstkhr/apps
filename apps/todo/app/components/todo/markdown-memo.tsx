import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  // メモを表示するだけで外部サーバーへ画像を取得しに行かない。
  img: ({ src, alt }) => (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {alt || '画像'}
    </a>
  ),
};

export function MarkdownMemo({ children }: { children: string }) {
  return (
    <div className="todo-memo mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </Markdown>
    </div>
  );
}
