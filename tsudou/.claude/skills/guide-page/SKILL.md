---
name: guide-page
description: Create and update the Tsudou user guide (/guide, frontend/src/routes/Guide.tsx). Recapture screenshots with sample data (pnpm run guide:capture), and align image dimensions, instructions, alternative text, tests, and documentation with the actual UI. Always use this skill when asked to update the guide, retake screenshots, or add an explanation to the guide, and whenever UI text, button labels, layouts, form fields, or navigation change (Home / EventCreated / EventPublic / EventManage or their components), so the guide stays current.
---

# Creating and updating the user guide

The guide explains the steps for hosts and participants with screenshots captured using sample data.
UI changes do not automatically update the guide, so old screenshots and obsolete button labels can remain.
This skill ensures that every UI change is reflected in the guide.

## Related files

| File | Role |
| --- | --- |
| `frontend/src/routes/Guide.tsx` | Page content: `Step` (numbered instructions), `Screenshot` (image, dimensions, alternative text), and FAQ |
| `frontend/scripts/capture-guide.mjs` | Captures each screen while creating sample data |
| `frontend/src/assets/guide/*.png` | Screenshots imported into the build, with hashed filenames and long-term caching; do not put them in `public/` |
| `frontend/src/routes/Guide.test.tsx` | Checks headings, table of contents, and alternative text and dimensions for every image |
| `docs/specification.md` ("User guide (`/guide`)"), `README.md`, `docs/architecture.md` | Page specification, recapture instructions, and repository structure |

The following table maps images to screens. After changing a screen, recapture its images and review the surrounding instructions.

| Image | Screen or card captured |
| --- | --- |
| `host-create` | Event creation form on the home page (`Home`); adding anything to the card changes its height |
| `host-created` | Creation confirmation (`EventCreated`) |
| `host-manage-urls` / `-edit` / `-answers` / `-close` | Cards on the management page (`EventManage`) |
| `guest-event` / `guest-status` | Overview and response status on the event page (`EventPublic`) |
| `guest-answer` / `guest-answered` | Response form (`AnswerForm`) before and after submission |
| `guest-closed` | Event page after responses have closed |

## Procedure

### 1. Determine the affected areas

Review UI changes with `git diff`, then use the table above to identify images to recapture and instructions to update.
If a button label, heading, or message changed, search the content of `Guide.tsx` for outdated wording.
The capture script also locates elements by labels and roles, so wording changes can break it.

### 2. Update the capture script (only when needed)

Update `capture-guide.mjs` when capturing a new screen or state, or when wording changes invalidate locators.

- Locate elements with `getByLabel` / `getByRole` / `card(page, 'heading text')` (the `section` containing that text). CSS class selectors can break with visual changes alone. Use the actual Japanese UI text for locators.
- Capture with `shot(locator, name)`. It waits for network activity to settle, moves the mouse away, and replaces `localhost` in URL fields with `https://tsudou.example.com` immediately before capture. React rerenders would otherwise restore the original URL.
- Candidate dates are calculated from the execution date, because creation does not allow past dates. Do not hardcode them.
- Other participants' responses are submitted through the API (`POST /api/events/{id}/answers`), which is faster and less fragile than entering them through the UI.

### 3. Recapture screenshots

Start both development servers. If the Browser pane is available, use `preview_start` to start `api` and `frontend` from `.claude/launch.json`. Otherwise, ask the user to start `pnpm run dev:api` and `pnpm run dev`.

```bash
pnpm run guide:capture
```

- Use the installed Google Chrome; `playwright-core` does not download a browser. Report if Chrome is unavailable.
- Each run adds one sample event to local D1 (`backend/.wrangler/`). This directory is gitignored and the addition is harmless, but mention it in the report.

### 4. Inspect the images visually

Open every recaptured image with Read. A successful script run does not guarantee a correct appearance.

- Check that URL fields no longer contain `localhost`.
- Check for unwanted hover or focus outlines, loading indicators, and error messages.
- Confirm that elements mentioned in the instructions, such as the "最多" (most responses) indicator and "自分" (you) badge, are visible.

### 5. Match the dimensions

The `width` / `height` of a `Screenshot` are CSS pixels, half the actual dimensions of images captured at double resolution.
They reserve space before the image loads to prevent layout shifts. Always verify them after recapturing.

```bash
cd frontend/src/assets/guide && for f in *.png; do echo "$f $(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{print $2/2}' | tr '\n' ' ')"; done
```

Update the values in `Guide.tsx` for images whose height changed; the width normally remains 736.

### 6. Update instructions and alternative text

- **Copy UI wording from the implementation.** Search components and server messages (`backend/src/errors.ts`, etc.) instead of writing button labels or messages from memory. Even a difference between "保存" and "変更を保存" can prevent readers from finding a button.
- **Do not include specific dates in alternative text.** Candidate dates change on every capture; use descriptions such as "the third candidate". Describe what the image shows in one sentence for readers who cannot see it.
- Match the existing Japanese guide style: polite language, UI labels enclosed in Japanese quotation marks (「」), and cautions in `Alert` with `variant="warning"`.
- When adding an image, add its import and always pass `alt` / `width` / `height` to `Screenshot`; `Guide.test.tsx` checks these.
- Reference constants such as `RETENTION_MONTHS` for values derived from settings instead of hardcoding numbers.

### 7. Verify

```bash
pnpm exec biome check --write frontend
pnpm --filter @tsudou/frontend run typecheck
pnpm --filter @tsudou/frontend test
```

Open `/guide` in the Browser pane and check:

- No horizontal scrolling at desktop or mobile width (`resize_window` with `mobile`).
- Readability in both light and dark themes; screenshots use the light theme.
- Opening `/guide#host`, `#guest`, and `#faq` directly scrolls to the corresponding heading.

### 8. Update documentation (only when needed)

When changing the page structure (sections, table of contents, capture procedure, or file locations), update "User guide (`/guide`)" in `docs/specification.md` and the recapture instructions in the README.
Documentation updates are unnecessary for wording or image replacements alone.

## Report

Briefly summarize:

- Images recaptured and instructions updated.
- Images whose dimensions changed.
- Test, type-check, and lint results, and browser verification.
- The sample event added to local D1.

Commit only when the user asks.
