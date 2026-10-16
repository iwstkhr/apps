import { type CSSProperties, Fragment, useEffect, useState } from 'react';
import type { ThemedToken } from 'shiki/core';
import { highlightCode, resolveLanguage } from '~/lib/code-highlight';

/**
 * A fenced code block in a memo. It shows the plain code right away and colors it with Shiki once the
 * highlighter and the language's grammar have loaded. Unsupported languages stay plain.
 */
export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [highlighted, setHighlighted] = useState<{
    code: string;
    lang: string;
    tokens: ThemedToken[][];
  } | null>(null);
  const supported = resolveLanguage(lang) !== null;

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    highlightCode(code, lang)
      .then((tokens) => {
        if (!cancelled && tokens) setHighlighted({ code, lang, tokens });
      })
      .catch((error: unknown) => {
        // The code stays readable without colors
        console.error('Failed to highlight a code block', error);
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang, supported]);

  // Tokens from before an edit would show the old code, so use them only while they still match
  const tokens =
    highlighted?.code === code && highlighted.lang === lang ? highlighted.tokens : null;

  return (
    <div className="todo-code">
      <span className="todo-code-lang" aria-hidden="true">
        {lang}
      </span>
      <pre data-highlighted={tokens ? '' : undefined}>
        <code>
          {tokens
            ? tokens.map((line, i) => (
                // Lines and tokens never move, so their positions are stable keys
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                <Fragment key={i}>
                  {i > 0 && '\n'}
                  {line.map((token) => (
                    <span key={token.offset} style={token.htmlStyle as CSSProperties}>
                      {token.content}
                    </span>
                  ))}
                </Fragment>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
