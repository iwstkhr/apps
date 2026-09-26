import { FaGithub } from 'react-icons/fa';
import { publicUrl } from '~/lib/public-url';

const GITHUB_URL = 'https://github.com/iwstkhr/shelter-map';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-300 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <h1 className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-xl">
          <img
            src={publicUrl('favicon.svg')}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
          />
          <span className="truncate">指定緊急避難場所マップ</span>
        </h1>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md p-1 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="GitHub リポジトリを開く"
        >
          <FaGithub className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
