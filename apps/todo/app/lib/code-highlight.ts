import type { HighlighterCore, LanguageInput, ThemedToken } from 'shiki/core';

/**
 * The languages memo code blocks are highlighted in. Each grammar is its own chunk, loaded the first time a
 * code block uses it. The list is kept short because the Service Worker precaches all build output, and
 * listing every Shiki language would add several megabytes to the first install.
 */
const LANGUAGES: Record<string, LanguageInput> = {
  c: () => import('shiki/langs/c.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  docker: () => import('shiki/langs/docker.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  swift: () => import('shiki/langs/swift.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  xml: () => import('shiki/langs/xml.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
};

/** Other names people write after ``` for the languages above */
const ALIASES: Record<string, string> = {
  bash: 'shellscript',
  sh: 'shellscript',
  shell: 'shellscript',
  zsh: 'shellscript',
  'c#': 'csharp',
  cs: 'csharp',
  dockerfile: 'docker',
  golang: 'go',
  js: 'javascript',
  cjs: 'javascript',
  mjs: 'javascript',
  jsonc: 'json',
  kt: 'kotlin',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  ts: 'typescript',
  cts: 'typescript',
  mts: 'typescript',
  yml: 'yaml',
};

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';

let highlighter: Promise<HighlighterCore> | undefined;
const loading = new Map<string, Promise<void>>();

/** Create the highlighter once, with the JavaScript regex engine so no WebAssembly is downloaded */
function getHighlighter() {
  highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      }),
  );
  // A failed load (for example offline before the chunks were cached) can be retried later
  highlighter.catch(() => {
    highlighter = undefined;
  });
  return highlighter;
}

/** The supported language a code block's info string names (case-insensitive), or null */
export function resolveLanguage(lang: string): string | null {
  const name = lang.toLowerCase();
  const resolved = ALIASES[name] ?? name;
  return Object.hasOwn(LANGUAGES, resolved) ? resolved : null;
}

/**
 * Split code into lines of tokens colored for both the light and dark theme. Each token's htmlStyle
 * holds --shiki-light and --shiki-dark, and CSS picks one with light-dark(). Returns null for an
 * unsupported language, so the code block stays plain.
 */
export async function highlightCode(code: string, lang: string): Promise<ThemedToken[][] | null> {
  const name = resolveLanguage(lang);
  if (!name) return null;
  const core = await getHighlighter();
  let load = loading.get(name);
  if (!load) {
    load = core.loadLanguage(LANGUAGES[name]);
    load.catch(() => loading.delete(name));
    loading.set(name, load);
  }
  await load;
  return core.codeToTokens(code, {
    lang: name,
    themes: { light: LIGHT_THEME, dark: DARK_THEME },
    defaultColor: false,
  }).tokens;
}
