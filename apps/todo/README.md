# TODO

A TODO management web app that runs entirely in the browser. Todos are stored only in the browser's IndexedDB and are never sent to a server. Export and import JSON files to back up your todos or move them to another browser.

**Demo:** <https://todo.wasabee.dev/>

## Features

- Add, edit, and delete todos, and manage their status (未着手 / 進行中 / 保留 / 完了)
- Organize todos in nested folders with eight preset icon colors; a folder shows the todos in its subfolders too, and todos can be dragged onto a folder to move them
- Set a due date (overdue and due-today items are highlighted), a priority (high / medium / low), a multi-line memo, and tags
- Filter by status, tag, and keyword (title, memo, tags), and sort by due date, priority, status, or creation date
- Select a status in the left pane to filter the current folder, with counts for each status
- Choose カスタム to reorder todos by dragging their headers or using up/down buttons; the order is saved and included in exports
- Delete all completed todos at once
- Export all todos and folders to a JSON file, and import a file by merging it with or replacing the current data
- Sync changes across tabs of the same browser
- Use the app on mobile screens and in dark mode

## Technology stack

- [React](https://react.dev/) 19 and [TypeScript](https://www.typescriptlang.org/)
- [React Router](https://reactrouter.com/) 8 (SPA, client-side rendering)
- [Vite](https://vite.dev/) 8
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) — local storage (no wrapper library)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Biome](https://biomejs.dev/) — linting and formatting
- [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/), and [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) — testing
- [Playwright](https://playwright.dev/) — E2E testing
- [pre-commit](https://pre-commit.com/) — Git hooks and lint tools

## Prerequisites

- [mise](https://mise.jdx.dev/) (version management for Node.js, pnpm, and pre-commit)
- Node.js (specified in [`mise.toml`](../../mise.toml) at the repository root and `engines.node` in `package.json`)
- pnpm (dependencies are managed in a repository-wide pnpm workspace)
- A Cloudflare account for deployment (sign in with `pnpm exec wrangler login`)

## Setup

```bash
git clone https://github.com/iwstkhr/apps.git
cd apps
mise install
pre-commit install
pnpm install
cd apps/todo
pnpm run dev
```

The development server starts at <http://localhost:5173>.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm run dev` | Start the development server |
| `pnpm run build` | Create a production build |
| `pnpm run preview` | Create a production build and serve it locally with `wrangler dev` using the Workers configuration |
| `pnpm run deploy` | Deploy `build/client` to Cloudflare Workers (run `pnpm run build` first) |
| `pnpm run lint` | Run Biome linting |
| `pnpm run format` | Format code with Biome |
| `pnpm run format:check` | Check for formatting differences |
| `pnpm run check` | Check linting and formatting with Biome |
| `pnpm run check:fix` | Apply Biome lint fixes, formatting, and import organization |
| `pnpm run typecheck` | Run TypeScript type checking |
| `pnpm run test` | Run tests with Vitest |
| `pnpm run test:watch` | Run Vitest in watch mode |
| `pnpm run test:e2e` | Run E2E tests with Playwright (builds the app and serves it with `wrangler dev`) |
| `pre-commit run --all-files` | Run pre-commit hooks on all files (from the repository root) |

## Documentation

See [`docs/`](docs/README.md) for detailed specifications and architecture.

| Document | Contents |
| --- | --- |
| [Specification](docs/specification.md) | Features, screens, data model, and the export file format |
| [Architecture](docs/architecture.md) | Structure, data flow, module responsibilities, and CI/CD |

## CI / Deployment

When files under `apps/todo/` change in a PR or a push to `main`, [todo - Test](../../.github/workflows/todo-test.yml) runs. Each PR gets a preview URL from [todo - Preview](../../.github/workflows/todo-preview.yml), and a push to `main` runs [todo - Deploy](../../.github/workflows/todo-deploy.yml), which publishes the app to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) at `todo.wasabee.dev`. Delivery is configured in [`wrangler.jsonc`](wrangler.jsonc), and deployment uses the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Workers only serves static files; the app has no server-side code and stores nothing on the server.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for Git hooks, checks, implementation conventions, and commit messages.

## License

This project is released under the [MIT License](LICENSE).
