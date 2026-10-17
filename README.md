# Jira Clone — Collaborative Project Board

A MERN portfolio application for small teams to plan work, assign tasks, discuss details and track progress together. Built with React, Express, MongoDB and Socket.IO. This is an independent learning project, not an Atlassian product.

## What works

- Register/sign in, create projects and add existing registered users to your team.
- Responsive project dashboard and three-column Kanban board: To Do, In Progress and Done.
- Create/edit task titles, descriptions, priorities, assignees and optional due dates.
- Move tasks between statuses with drag-and-drop (including keyboard controls) or the edit form.
- Search titles/descriptions; filter by priority, assignee, unassigned, My tasks and overdue.
- Project-wide task, in-progress, overdue and completion counts; counts stay independent of board filters.
- Task discussion with author names and timestamps that stays open after posting.
- Export the visible filtered tasks to CSV, with spreadsheet formula-prefix escaping.
- Live updates after successful database saves, authenticated project rooms and reconnect refresh.
- Clear failure states, retry controls, preserved failed forms and conflict detection for concurrent edits.
- Profile picture upload with login required and a 2 MB PNG/JPEG limit.

Due dates are calendar dates, not timestamps. Overdue means a date before the viewer's local calendar day and a task that is not Done. Status changes persist; ordering within a column is currently newest-first, not a saved manual rank.

## Permissions and collaboration

| Action | Project owner | Project member | Nonmember |
| --- | --- | --- | --- |
| View board, tasks and comments | Yes | Yes | No |
| Create/edit tasks and post comments | Yes | Yes | No |
| Assign tasks | To current project people | To current project people | No |
| Add a registered member | Yes | No | No |
| Delete a task | Yes | Only tasks they created | No |
| Join project live updates | Yes | Yes | No |

Every task endpoint checks project membership on the server. Supplying another project's ID does not grant access. Socket connections validate a signed token and check membership before joining a room. Clients cannot broadcast arbitrary task updates; saved server mutations publish a refresh event.

Task update/delete requests include the last-read `__v` as `version`. A stale edit returns HTTP 409 rather than overwriting another user's changes. The editor preserves the local draft and offers an explicit reload/discard action. Concurrent comments can also return a conflict; their text remains available to retry.

Adding a member grants access immediately; it does not send an email. Deleting a task also deletes its embedded comments and requires confirmation. There is no undo or restore feature.

## Stack and structure

| Area | Technology / location |
| --- | --- |
| Frontend | React 19, React Router 7, Vite 7, Tailwind CSS 3, Axios; `client/src/` |
| Board interactions | `@hello-pangea/dnd`, native modal dialogs, Socket.IO client |
| API | Node.js, Express 5; `server/controllers/`, `server/routes/` |
| Data | MongoDB and Mongoose 9; User, Project and Task models |
| Authentication | bcrypt password hashes, JWT bearer tokens |
| Live updates | Socket.IO; authenticated room joins in `server/app.js` |
| Verification | Node test runner, Supertest, disposable MongoDB, Playwright, ESLint and GitHub Actions |

The browser sends bearer-authenticated REST requests. Controllers check access and validate input, Mongoose saves records, and the server then emits a project-room refresh event. Clients re-fetch authoritative state after events and reconnection. Project ownership and membership live in MongoDB; comments are embedded in tasks. Due dates are an additive optional field, so existing tasks need no destructive migration.

## Local setup

Use Node.js **22.12+**, npm and a local MongoDB instance or your own MongoDB Atlas database.

```bash
git clone https://github.com/Vishaljadaun/jira-clone.git
cd jira-clone
npm ci --prefix server
npm ci --prefix client
cp server/.env.example server/.env
```

Set private values in `server/.env`:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Private MongoDB connection string. The example uses localhost. |
| `JWT_SECRET` | Your own random secret, at least 32 characters. |
| `PORT` | API port; default 5000. |
| `CLIENT_ORIGIN` | Allowed browser origin; default `http://localhost:5173`. Comma-separated origins are supported. |

Generate a signing secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and save it privately. Do not reuse the example placeholder or a previously committed secret.

In separate terminals, from the repository root:

```bash
npm --prefix server run dev
```

```bash
npm --prefix client run dev
```

Open **http://localhost:5173**. Vite forwards `/api`, `/uploads` and `/socket.io` to localhost:5000. The API starts listening only after its database connection succeeds. Create your own account; there is no seeded administrator.

## Try the complete workflow

1. Register a fictional owner and create “Website launch”.
2. In a private browser window, register a second user. Add that user's email from the owner's board.
3. Create a High priority task, assign the second user and choose a due date.
4. Keep both boards open. Edit the status or move the card; the other board should update after the save.
5. Open the task, post a comment and confirm the discussion stays open. Refresh and verify the comment/author remains.
6. Try search, My tasks, unassigned and overdue filters. Export CSV and inspect the selected tasks.
7. Open the same task's editor in both sessions. Save one, then the other: the second edit should show a conflict instead of silently overwriting.
8. Use the status selector on a phone, or keyboard drag-and-drop on desktop. The phone board stacks columns vertically.

Use fictional records in demonstrations. Normal tabs share login storage; separate profiles/private windows are needed for independent accounts.

## Verification

```bash
npm --prefix client run lint
npm --prefix client test
npm --prefix client run build
npm --prefix server test
```

Backend tests launch disposable MongoDB via `mongodb-memory-server`; the first run downloads a database binary. They never load the application's `.env` or connect to its live database. Tests cover task/project boundaries, nonmember assignment, validation, owner-only membership changes, duplicate additions, simultaneous edits, comments, deletion and preserving password hashes when profiles change.

For real browser/API testing, stop other processes on ports 5000/5173, then:

```bash
cd client
npx playwright install --with-deps chromium
npm run test:e2e
npx playwright show-report
```

Playwright starts an isolated API/database and Vite automatically. The scenario covers two-user live updates, task forms, comments, status changes, keyboard drag-and-drop, filters, CSV download, reload persistence and a 390px mobile layout. GitHub Actions runs the same commands and keeps the browser report/screenshots for seven days. Tests do not establish production readiness or a complete accessibility/security audit.

## Deployment configuration

The repository includes `render.yaml` for a free-plan API service in Singapore and a static React frontend. A hosted MongoDB database is required before the API can start. The Blueprint generates a fresh JWT signing secret; it does not reuse the previously committed value.

1. Create or use a MongoDB Atlas database. Create a database user restricted to the application's database, then choose **Connect → Drivers** to obtain its connection string. Use a dedicated database such as `jira_clone` and enter credentials only in private hosting settings. Configure Atlas network access for the Render service's outbound IP ranges.
2. [Open the Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Vishaljadaun/jira-clone), choose your workspace, and supply `MONGO_URI`. For `CLIENT_ORIGIN`, enter the frontend's exact HTTPS origin if already known; otherwise temporarily use `http://localhost:5173` and replace it after the frontend is created.
3. Wait for the API to become live and check its `/health` URL. Copy its assigned public origin from Render; do not guess the generated hostname.
4. Sync the Blueprint to create `jira-clone-web`. Its Vite build, `dist` publish directory and `/*` → `/index.html` rewrite are configured in `render.yaml`. `VITE_SERVER_URL` points to this project's deployed API; change it if deploying your own fork or replacing the API service.
5. Set the API's `CLIENT_ORIGIN` to the static site's actual HTTPS origin and redeploy the API. Test registration, login, task creation and live updates in two browser profiles.

The Blueprint configures both services. It does not create an Atlas database; verify each service's live status in Render. Free-plan API instances can sleep when idle; the first request may need time to wake up. Profile uploads still require persistent storage for durability across deploys.

- Backend: install with `npm ci`, run `npm start`, using `server` as the service root. Supply private `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` and the host's `PORT`.
- Frontend: install/build in `client` using `npm ci && npm run build`; publish `client/dist`.
- Set public `VITE_SERVER_URL` to the backend origin, for example `https://YOUR-API-HOST` (without `/api`), before building the frontend.
- Configure the static host to rewrite unknown browser routes to `/index.html`.
- The backend host must support WebSockets. If they are unavailable, use Refresh; the board shows its live connection state.
- Profile uploads use `server/uploads`; ephemeral hosting requires a persistent disk or a future object-storage integration. MongoDB must also be persistent and independent of a disposable test instance.

Only `VITE_SERVER_URL` belongs in frontend configuration. MongoDB credentials and JWT secrets must remain private on the server.

## Security and maintenance notes

Earlier commits tracked `server/.env` and installed dependencies. They are removed from the current tree and ignored now, but remain in Git history. Rotate any real JWT secret or database credentials ever committed before exposing a deployment; rotating the JWT secret signs out existing tokens. No existing database credentials or records are changed by this code update.

The password-save hook now leaves existing hashes intact when saving a profile. Tokens remain in browser storage and there is no refresh-token flow, password recovery, email verification, rate limiting or MFA. Membership removal is not implemented; a future removal feature must also evict/recheck live rooms. Uploads currently check size, extension and declared MIME type; content scanning and image re-encoding remain future work. Large boards load all tasks and comments, so pagination and load testing are also future work.

## Later extensions

Sprints/backlog, activity history, in-app notifications, attachments, membership removal, persistent manual card ordering and richer reporting can be added after this focused board milestone. Email invitations, payment/subscription features and AI assistance are not included.
