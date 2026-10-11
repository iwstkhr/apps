import { publicUrl } from '~/lib/public-url';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-300 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <h1 className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-xl">
          <img
            src={publicUrl('favicon.svg')}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
          />
          <span className="truncate">指定緊急避難場所マップ</span>
        </h1>
      </div>
    </header>
  );
}
