# Specification

The functional specification for Tsudou: screens, URLs, API, business rules, and input constraints.
See [Architecture](architecture.md) for implementation structure and design decisions.

## Terminology

| Term | Meaning |
| --- | --- |
| Event | A scheduling unit with a title, candidate dates/times, fee, and memo |
| Candidate | A proposed date/time for an event: `{ id, startAt }` |
| Answer (response) | One person's attendance response, with a name, message, and choice for each candidate |
| Choice | `YES` / `MAYBE` / `NO` for one candidate |
| Host | The person holding the management token, who can edit, close, and delete the event |
| Participant | Someone who knows the shared URL and can create, edit, and delete their own response |
| Management token | Proof of host authorization, issued only once at event creation |
| Response edit key | Proof of response ownership, issued only once at submission |

## Actors and capabilities

| Actor | Capabilities |
| --- | --- |
| Host | Create events, edit details, close/reopen responses, delete any response, and delete events |
| Participant | Respond to each candidate, attach a message, edit/delete their own response, and view response status |

The management token identifies the host; the response edit key identifies the response owner.
The server compares both against stored hashes.

## URLs

| Path | Screen | Notes |
| --- | --- | --- |
| `/` | Home (event creation) | |
| `/guide` | User guide | |
| `/e/<eventId>` | Event page | **Sharing**: send to participants |
| `/e/<eventId>#a=<answerId>&k=<editToken>` | Event page (edit own response) | **Response editing**: keep private to the respondent |
| `/e/<eventId>/created` | Creation confirmation | Meaningful only immediately after creation |
| `/e/<eventId>/manage#k=<manageToken>` | Management page | **Management**: keep private to the host |
| Any other path | 404 | |

- `eventId` is a 128-bit random value encoded as base64url (22 characters). People who do not know the shared URL cannot reach the event.
- Management tokens are passed in fragments (`#k=`), rather than query strings. Fragments are not sent to the server and do not appear in access logs or Referer headers.
- Response edit keys also use fragments (`#a=`, `#k=`).
- Management tokens and response edit keys are **not persisted in the browser**, preventing reuse by another person on a shared computer. Immediately after loading a token into memory, `history.replaceState` removes the fragment from the URL. Tokens survive navigation within the app but are lost on reload or tab closure; reopen the management or response edit URL to restore them.
- As an SPA, the app requires hosting that rewrites page paths to `/index.html` with status 200.

## Screens

### Home (`/`)

Displays the event creation form.

| Field | Required | Initial value | Notes |
| --- | --- | --- | --- |
| Event title | Yes | Empty | Up to 100 characters |
| Candidate dates/times | Yes | One row: next Saturday at 19:00 | 1–30 candidates; rows can be added/deleted |
| Fee | No | Empty (unset) | Integer from 0 to 1,000,000 |
| Memo | No | Empty | Up to 2,000 characters |

- A new candidate row defaults to the same time on the day after the preceding row, reducing input for consecutive dates.
- Candidates cannot be in the past. The input's `min` prevents selecting past dates in the picker; manually entered past dates produce errors per row.
- Successful submission navigates to `/e/<eventId>/created`, keeping the management token in memory.
- No history of created or answered events is recorded, to support shared computers.

### User guide (`/guide`)

Explains host and participant workflows with screenshots captured using sample data. Links appear in the header menu as "使い方" (user guide) and above the home page form.

- The table of contents (host / participant / FAQ) uses page anchors (`#host` / `#guest` / `#faq`). Opening a URL with an anchor scrolls to that heading after rendering.
- Tapping or clicking a screenshot opens the full-size image in a new tab.
- Screenshots are captured per display language with sample data in that language and shown to match the selected language. They are stored in `frontend/src/assets/guide/ja/` and `frontend/src/assets/guide/en/` and recaptured with `pnpm run guide:capture`, which also writes their dimensions to `frontend/src/assets/guide/sizes.json`. During capture, URL field origins are replaced with `https://tsudou.example.com`.

### Creation confirmation (`/e/<eventId>/created`)

Displays shared and management URLs with copy, "開く" (open), and "QR コード" (QR code) buttons.
The QR code button opens a modal with a QR code of the URL, for opening it on a phone. The modal closes with its "閉じる" (close) button, Esc, or a click on the backdrop, and closes automatically after 10 seconds so people nearby cannot read the management URL; helper text in the modal explains this. The modal fades in and out (200 ms), without the fade when the OS reduces motion. QR codes are generated in the browser so URLs, including the management token, are never sent to an external service.
Opening a URL uses a new tab, leaving the confirmation screen available. Management URLs include the token in a fragment, allowing management in the new tab.
Because management tokens are not persisted in the browser, this is the only screen where the management URL can be displayed at creation.
A sentence below the heading asks users to bookmark the URL or send it to themselves before closing the page.
If the management token is missing from memory (after reloading or opening in another browser), a warning explains this.
While the management URL is displayed, `beforeunload` triggers the browser's standard confirmation dialog to prevent reloading or closing without saving it. Navigation within the app does not prompt, because the token remains available.

### Event page (`/e/<eventId>`)

The screen shared with participants displays:

- Event title, closed badge when applicable, fee, memo, and automatic deletion date.
- A response grid (respondents × candidates) and respondent count.
- A list of responses with messages.
- A response form, in edit mode when the response edit key is available.
- A field for copying the response edit URL, immediately after submission or when opened through that URL.
- A field for copying the shared URL, with a QR code button.

If a management token is in memory (after creation or navigation from the management page), a management page link also appears.
It points to the management URL with `#k=...`, so it also works in a new tab.
When responses are closed, the form is hidden and the message "締め切られているため回答できません" explains that responses are no longer accepted.

Submitting a response displays a response edit URL containing its edit key.
Because the key is not persisted in the browser, this URL is required for later edits or deletion.
The page asks users to bookmark it or send it to themselves, and warns them against sharing it.
If the response referenced by an edit URL has been deleted by its owner or host, a warning and a new response form appear.
Responses expire with the event, so expiry makes the event itself appear not found.

### Management page (`/e/<eventId>/manage`)

Operations require a management token. Without one, the page displays "管理用 URL が必要です" (a management URL is required) and a link to the event page.

- Fields for copying the shared and management URLs, with QR code buttons as on the creation confirmation screen.
- An edit form (title / candidates / fee / memo).
- The response grid, with a delete button for each response.
- Controls to close or reopen responses.
- Event deletion with a confirmation dialog, and the automatic deletion date.

All deletion operations use `window.confirm`.
After event deletion, navigation returns to the home page and the event's token is removed from memory.

## Input constraints

`LIMITS` in `shared/src/limits.ts` is the single definition of limits, used by both server and frontend validation.

| Field | Constraint |
| --- | --- |
| Event title | Required, 1–100 characters after trimming |
| Memo | Optional, up to 2,000 characters |
| Respondent name | Required, 1–40 characters |
| Message | Optional, up to 500 characters |
| Fee | Optional integer from 0 to 1,000,000; empty means unset, 0 means free |
| Candidate count | 1–30 |
| Candidate date/time | Parseable as ISO 8601; duplicate dates/times are forbidden. Past dates are forbidden at creation but allowed during editing so completed candidates can remain |
| Choices | Exactly one per candidate, with no missing or extra entries; `YES` / `MAYBE` / `NO` |

Normalization rules:

- Trim optional strings and store empty strings as `null`.
- Sort candidates by start time before storing.
- Sort choices in the event's candidate order before storing.
- Preserve existing candidate IDs sent back by the client; generate new IDs for candidates without one.

Client validation catches issues before submission; the server always performs final validation.
Every form (event creation, editing, and responses) disables submission while validation errors remain.
An untouched form can be submitted; doing so runs validation and displays errors.
Both sides share `messages.ts`, keeping validation wording consistent.

## API

A REST-style HTTP API under `/api` on the same origin as the UI. Request and response bodies are JSON; there is no authentication.
A single API server (Express, running on the same Cloudflare Worker as the UI in production) handles operations. Clients have no direct database access.
Tokens are sent in dedicated request headers (`X-Manage-Token` / `X-Edit-Token`), rather than paths or query strings.
See [openapi.yaml](openapi.yaml) for detailed request and response shapes (OpenAPI 3.1, generated from implementation schemas).
Requests with invalid JSON shapes (missing required fields, incorrect types, or choices other than `YES` / `MAYBE` / `NO`) return `VALIDATION`.

### `GET /api/events/{eventId}` (get event)

| Item | Details |
| --- | --- |
| Input | Path: `eventId` |
| Success | 200 `EventView`, including responses; nonexistent or expired events return 404 `NOT_FOUND` |
| Authorization | None; knowing the URL grants viewing access |

Responses are returned in ascending creation order.
`EventView` / `AnswerView` have no token hash fields.

### `POST /api/events` (create event)

| Item | Details |
| --- | --- |
| Input | Body: `title`, `fee?`, `memo?`, `candidates[]` |
| Success | 201 `{ eventId, manageToken }` |
| Authorization | None |

`manageToken` is returned in plaintext only once. The server retains only its hash.
`expiresAt` is fixed at creation.

### `PATCH /api/events/{eventId}` (update event)

| Item | Details |
| --- | --- |
| Input | Path: `eventId`; body: `title?`, `fee?`, `memo?`, `candidates?`, `closed?` |
| Success | 200 updated `EventView` |
| Authorization | Management token (`X-Manage-Token`) |

Omitted fields remain unchanged; explicitly setting `fee` or `memo` to `null` clears them.
Candidate changes reconcile existing responses as described below.
Retention is not extended.

### `DELETE /api/events/{eventId}` (delete event)

| Item | Details |
| --- | --- |
| Input | Path: `eventId` |
| Success | 204, no body |
| Authorization | Management token (`X-Manage-Token`) |

All responses are deleted before the event to avoid orphaned records.

### `POST /api/events/{eventId}/answers` (create response)

| Item | Details |
| --- | --- |
| Input | Path: `eventId`; body: `name`, `message?`, `choices[]` |
| Success | 201 `{ answer, editToken }` |
| Authorization | None |

Closed events return `CLOSED`; an existing response with the same name returns `DUPLICATE_NAME`.
`editToken` is returned in plaintext only once. The client does not persist it in the browser, but gives the respondent a response edit URL.
The response inherits the event's `expiresAt`.

### `PUT /api/answers/{answerId}` (update response)

| Item | Details |
| --- | --- |
| Input | Path: `answerId`; body: `name`, `message?`, `choices[]` |
| Success | 200 updated `AnswerView` |
| Authorization | Response edit key (`X-Edit-Token`) |

Updates are also forbidden while responses are closed. Duplicate-name checks exclude the response itself, allowing saves without a name change.

### `DELETE /api/answers/{answerId}` (delete response)

| Item | Details |
| --- | --- |
| Input | Path: `answerId` |
| Success | 204, no body |
| Authorization | Either the response edit key (owner, `X-Edit-Token`) or management token (host, `X-Manage-Token`) |

### `GET /api/healthz` (health check)

Always returns 200 `{ "ok": true }` for availability checks.

## Business rules

### Closing responses

- Closed events do not allow response creation or updates (`CLOSED`). Viewing and host deletion of responses remain available.
- Hosts can close or reopen responses at any time. Reopening allows responses again.

### Duplicate names

Only one response with a given name is allowed per event.
A second submission returns `DUPLICATE_NAME`; only someone holding the response edit URL can edit it.
Names are compared exactly after trimming whitespace.

### Consistency after candidate edits

Clients send candidate IDs back, preserving links to existing responses during edits.
Only when the candidate set changes are all existing responses adjusted:

- Remove choices for deleted candidates.
- Fill added candidates with `MAYBE`.

### Expired records

Expired records are removed by a daily scheduled job and may remain readable in storage for up to about one day after expiry.
The app treats events past `expiresAt` as nonexistent and returns `NOT_FOUND` for all operations.
To users, events disappear exactly at expiry.

### Retention

- Events and responses are automatically deleted **three months after creation** (`RETENTION_MONTHS`).
- Retention starts at event creation; edits and responses do not extend it.
- Responses disappear with their event.
- The automatic deletion date is displayed on event and management pages.
- Change `RETENTION_MONTHS` and redeploy to adjust retention. Existing records' `expiresAt` values are not rewritten.

## Errors

On failure, the API returns `{ "error": { "code": "...", "message": "..." } }`. The frontend branches on the code and displays `message`.

| Code | Status | Meaning | Typical trigger |
| --- | --- | --- | --- |
| `VALIDATION` | 400 | Invalid input | Missing required input, excessive length, duplicate candidates, past candidates at creation, missing/extra choices, invalid JSON |
| `NOT_FOUND` | 404 | Target unavailable | Nonexistent, deleted, or expired record |
| `FORBIDDEN` | 403 | Permission denied | Management token / response edit key mismatch |
| `CLOSED` | 409 | Responses closed | Submission or update while closed |
| `DUPLICATE_NAME` | 409 | Duplicate name | A response with the same name already exists in the event |
| `RATE_LIMITED` | 429 | Too many requests | More than 100 requests per 60 seconds from the same IP |
| `INTERNAL` | 500 | Unexpected error | Other failures; details appear only in Workers Logs |
| `NETWORK` | – | Communication failure | Frontend only |

Unknown codes and unparseable responses (such as Cloudflare errors) become `INTERNAL`. If no message is available, the frontend displays "通信に失敗しました。時間をおいて再度お試しください" (communication failed; try again later).

## Response status display

### Aggregation

Count `YES` / `MAYBE` / `NO` for each candidate and calculate `score = YES count + MAYBE count × 0.5`.
Highlight the candidate with the highest score; highlight multiple candidates in a tie.
Do not highlight anything when there are no responses or when everyone declines and the score is zero.

### Grid

Rows are respondents and columns are candidates. Column headers show the date/time and `○△×` counts. The current user's row can be highlighted on the event page.
With many candidates, the table scrolls horizontally while the respondent column stays fixed on the left.

### Refreshing data

Event and management pages refetch when window focus returns (from another tab or app), reflecting other participants' responses and host edits without a reload.
If refetching fails, the previous content remains visible instead of an error screen.
A response form in progress is preserved unless the user's response existence or the candidates change.

### Display formats

| Item | Format | Example |
| --- | --- | --- |
| Status | `YES`: `○` (yes), `MAYBE`: `△` (maybe), `NO`: `×` (no) | |
| Date/time | `M/D(day of week) HH:MM`; include the year when different from the current year | `10/3(金) 19:00` (Friday) |
| Automatic deletion date | `YYYY/M/D` | `2026/12/20` |
| Fee | "未設定" (unset), "無料" (free) for 0, otherwise yen symbol and digit grouping | `¥3,000` |

All dates/times are displayed in the viewer's local time zone.
Storage uses ISO 8601 (UTC); input uses `<input type="datetime-local">`.

## Display language

The header menu offers **日本語** and **English** as always-visible language buttons when expanded, with a checkmark and pressed state for the selected language, on every page. Without a saved choice, the first supported language in `navigator.languages` is used (`ja-JP` maps to Japanese and `en-US` to English). An empty list falls back to `navigator.language`; if no language matches, English is used. Changes apply immediately to navigation, forms, status labels, notices, confirmation dialogs, validation errors, date weekdays, and guide text and alternative text. Document language, title, and description follow the selection.

The selection is saved as `tsudou:language` (`ja` / `en`) and restored on subsequent visits. Saved choices take priority over browser preferences. Unsupported saved values fall back to browser language detection. Storage failures keep switching functional for the current session. Changes in another tab synchronize through the browser storage event.

Switching does not clear form drafts or alter user-entered event titles, memos, respondent names, or messages. Dates remain in the viewer's local time zone and fees remain in yen. Guide screenshots switch with the selected language.

## Browser storage

Only theme and language preferences are persisted in `localStorage`. Read/write failures are ignored; the UI remains functional, but the preference is not retained.

| Key | Contents |
| --- | --- |
| `tsudou:language` | Display language (`ja` / `en`); defaults to the first supported browser language, otherwise English |
| `tsudou:palette` | Color preset (`aubergine` / `ocean` / `mint` / `sunset` / `graphite`); choosing default Indigo removes the key |
| `tsudou:theme` | Theme choice (`light` / `dark`); choosing system removes the key |

Management tokens and response edit keys are **never persisted**, preventing the next user of a shared computer from changing events or responses.
Legacy `tsudou:hosted` / `tsudou:answered` entries are deleted at startup.

## Nonfunctional requirements

- Without authentication, permissions use unguessable URLs and tokens. Event IDs are 128-bit random values; tokens are 256-bit random values.
- Store only SHA-256 token hashes, never plaintext, and compare them with `timingSafeEqual`.
- `<meta name="referrer" content="no-referrer">` suppresses Referer headers on external links. Cloudflare also returns `Referrer-Policy: no-referrer`, HSTS, and other security headers.
- Only the home page (`/`) is indexed by search engines. Since the SPA returns the same `index.html` for every path, indexing is controlled through `_headers` with `X-Robots-Tag: noindex, nofollow`, rather than an HTML robots meta tag. It applies to every path except the home page, so new routes default to exclusion. No `robots.txt` blocks crawling, because that would prevent crawlers from reading `noindex`.
- Preserve line breaks in memos and messages, but never interpret them as HTML.
- Support mobile widths and light/dark themes. The header menu opens a theme modal with labeled Light / Dark / Automatic controls; Automatic follows OS settings by default. The same modal previews six Slack-inspired presets: Indigo (default), Aubergine, Ocean, Mint, Sunset, and Graphite. Selection immediately recolors the entire app in either light or dark mode and survives reloads; invalid saved values fall back to Indigo.
- The unauthenticated API limits abuse to 100 requests per IP per 60 seconds. CORS is not enabled for other origins, preventing browser calls from pages on other sites.

## Out of scope

Notifications (email, etc.), calendar integration, languages other than Japanese and English, and image uploads are not included.
There is also no feature for recording the final selected candidate.
