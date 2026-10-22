# Querri Server SDK Reference

The Querri server SDK is included in the `@querri-inc/embed` package. It provides a fully typed Node.js client for the Querri API, covering user management, embed session creation, access policies, projects, dashboards, chat streaming, and more. For most apps, a one-liner `createSessionHandler()` is all you need to create embed sessions.

```bash
npm install @querri-inc/embed
```

## Quick Start

### `createSessionHandler()`

Each framework integration exports a `createSessionHandler` that wraps `client.getSession()` in a framework-native route handler. Import from `@querri-inc/embed/server/<framework>`:

| Framework | Import | Server File | Code |
|-----------|--------|------------|------|
| Next.js | `@querri-inc/embed/server/nextjs` | `app/api/querri-session/route.ts` | `export const POST = createSessionHandler()` |
| SvelteKit | `@querri-inc/embed/server/sveltekit` | `src/routes/api/querri-session/+server.ts` | `export const POST = createSessionHandler()` |
| React Router v7 | `@querri-inc/embed/server/react-router` | `app/routes/api.querri-session.ts` | `export const action = createSessionHandler()` |
| Nuxt | `@querri-inc/embed/server/nuxt` | `server/api/querri-session.post.ts` | `export default createSessionHandler()` |
| Express | `@querri-inc/embed/server/express` | `server.ts` | `app.post('/path', createSessionHandler())` |

Set `QUERRI_API_KEY` and `QUERRI_ORG_ID` environment variables. All handlers read from env automatically.

**Adding custom auth logic**

Pass a `resolveParams` callback to extract user identity from your auth system instead of reading the request body directly:

```typescript
// Next.js -- app/api/querri-session/route.ts
import { createSessionHandler } from '@querri-inc/embed/server/nextjs';
import { getServerSession } from 'next-auth';

export const POST = createSessionHandler({
  resolveParams: async (req) => {
    const session = await getServerSession();
    return {
      user: { external_id: session!.user!.id, email: session!.user!.email! },
      access: { sources: ['src_sales'], filters: { tenant_id: session!.user!.orgId } },
    };
  },
});
```

If you omit `resolveParams`, the handler creates an anonymous session. See the [Framework Integration Guides](#framework-integration-guides) for per-framework `resolveParams` signatures and full examples.

> **Security:** Always derive user identity, access and `role` from your server-side auth system. Never read `user`, `access` or `role` from the request body — a malicious client can impersonate any user or escalate access. The browser SDK's `sessionEndpoint` mode POSTs with no body on purpose.

**Running the session as a Custom Role**

Return a `role` (role id or key) from `resolveParams` to run the embed as that role instead of the user's own. Decide it on the server from your own auth:

```typescript
export const POST = createSessionHandler({
  resolveParams: async () => {
    const session = await getServerSession();
    return {
      user: { external_id: session!.user!.id },
      role: session!.user!.isManager ? 'regional_manager' : 'analyst',
    };
  },
});
```

**What a refused session looks like**

When Querri refuses the session, every handler answers with Querri's status and this JSON (keys that do not apply are omitted; the Nuxt handlers send it as h3's error `data`, and `defineQuerriSessionHandler` needs `h3` importable — or passed as `{ h3 }` — to do so, else it rethrows the `APIError`):

```json
{ "error": "That role is a draft; an admin must enable it first.", "code": "role_disabled", "doc_url": "https://docs.querri.com/api/errors#role_disabled" }
```

A `permission_denied` refusal adds `permission` and `reason`. In `sessionEndpoint` mode the browser SDK reads this JSON and reports it on the `token_fetch_failed` error event as `detail: { status, code, permission, reason }`; a 4xx other than 408/429 is not retried, so the event fires after the first answer. See [Error codes](#error-codes).

### Manual setup with the Querri client

For custom servers, non-framework environments, or when you need the full client API beyond session creation:

```typescript
import { Querri } from '@querri-inc/embed/server';

const client = new Querri();  // reads QUERRI_API_KEY from env

const { session_token } = await client.getSession({
  user: 'usr_alice',
  access: {
    sources: ['src_sales'],
    filters: { tenant_id: 'acme' },
  },
});
```

### Understanding `filters`

The `filters` field in inline access uses column names as keys and allowed values:

```typescript
access: {
  sources: ['src_sales'],
  filters: {
    tenant_id: 'acme',                // exact match
    region: ['us-east', 'us-west'],   // any of these values (OR)
  },
}
```

The SDK auto-creates and caches a named access policy from this specification.

---

## Table of Contents

- [Configuration](#configuration)
- [Resource API Reference](#resource-api-reference)
  - [Users](#users)
  - [Embed](#embed)
  - [Policies](#policies)
  - [Projects](#projects)
  - [Chats](#chats)
  - [Dashboards](#dashboards)
  - [Data](#data)
  - [Files](#files)
  - [Sources](#sources)
  - [Keys](#keys)
  - [Sharing](#sharing)
  - [Audit](#audit)
  - [Usage](#usage)
- [getSession() Deep Dive](#getsession-deep-dive)
- [User-Scoped Client (asUser)](#user-scoped-client-asuser)
- [Pagination](#pagination)
- [Streaming](#streaming)
- [Error Handling](#error-handling)
  - [Error codes](#error-codes)
- [Framework Integration Guides](#framework-integration-guides)
  - [SvelteKit](#sveltekit)
  - [Next.js](#nextjs)
  - [React Router](#react-router)
  - [Nuxt](#nuxt)
  - [Angular / Express](#angular--express)
  - [Vue + Vite (Standalone)](#vue--vite-standalone)

---

## Configuration

### QuerriConfig Interface

```typescript
interface QuerriConfig {
  apiKey: string;        // Required. Must be in qk_* format.
  orgId?: string;        // Organization ID. Sent as X-Tenant-ID header.
  host?: string;         // API host. Default: 'https://app.querri.com'
  timeout?: number;      // Request timeout in ms. Default: 30000
  maxRetries?: number;   // Max retry attempts. Default: 3
  fetch?: typeof fetch;  // Injectable fetch implementation.
}
```

### Constructor

You can pass a full config object or a plain API key string:

```typescript
// Full config
const client = new Querri({
  apiKey: 'qk_your_api_key',
  orgId: 'org_123',
});

// String shorthand (API key only, other values from env)
const client = new Querri('qk_your_api_key');
```

### Environment Variables

The client reads these environment variables as fallbacks when values are not provided in the config object:

| Variable | Maps to | Description |
|---|---|---|
| `QUERRI_API_KEY` | `apiKey` | API key for authentication |
| `QUERRI_ORG_ID` | `orgId` | Organization / tenant ID |
| `QUERRI_URL` | `host` | API host URL |

Resolution order: explicit config value > environment variable > default value.

---

## Resource API Reference

### Users

Manage users in your organization.

> **Role guards (servers released after 2026-10-21).** `create()`, `update()`, `del()` and `getOrCreate()` — and so [`getSession()`](#getsession-deep-dive) for a user who does not exist yet — follow the People page's rules. A change that would give or remove permissions the caller does not hold throws `PermissionError` with `code: 'escalation_denied'` (the permissions the caller lacks are in the raw body: `err.body.detail.error.missing`); one that would leave the organization without an Admin throws `ConflictError` with `code: 'last_admin'`. For an API key, "the caller" means the permissions both its creator and its bound user hold.

#### `client.users.create(params)`

Create a new user.

```typescript
create(params: UserCreateParams): Promise<User>
```

```typescript
const user = await client.users.create({
  email: 'alice@example.com',
  external_id: 'usr_alice',
  first_name: 'Alice',
  last_name: 'Smith',
  role: 'member',
});
```

#### `client.users.retrieve(userId)`

Fetch a single user by their Querri user ID.

```typescript
retrieve(userId: string): Promise<User>
```

```typescript
const user = await client.users.retrieve('user_abc123');
```

#### `client.users.list(params?)`

List users with cursor-based pagination.

```typescript
list(params?: { limit?: number; after?: string; external_id?: string }): Promise<CursorPage<User>>
```

```typescript
const page = await client.users.list({ limit: 50 });

// Async iteration over all pages
for await (const user of client.users.list()) {
  console.log(user.email);
}
```

#### `client.users.update(userId, params)`

Update an existing user.

```typescript
update(userId: string, params: UserUpdateParams): Promise<User>
```

```typescript
const updated = await client.users.update('user_abc123', { role: 'admin' });
```

`role` is the org role, `'admin'` or `'member'` (any other value is a `422`). You can only give or remove a role whose permissions you hold yourself, and the organization must keep an Admin: otherwise the call throws `PermissionError` with `code` `'escalation_denied'` (`err.body.detail.error.missing` lists the permissions you lack), or `ConflictError` with `'last_admin'` (servers released after 2026-10-21; `create()`, `del()` and `getOrCreate()` follow the same rules — see [Users](#users)).

#### `client.users.del(userId)`

Delete a user.

```typescript
del(userId: string): Promise<UserDeleteResponse>
```

```typescript
const result = await client.users.del('user_abc123');
// { id: 'user_abc123', deleted: true }
```

#### `client.users.getOrCreate(externalId, params?)`

Look up a user by external ID, creating them if they do not exist. This is an upsert operation backed by `PUT /users/external/:externalId`.

```typescript
getOrCreate(
  externalId: string,
  params?: { email?: string; first_name?: string; last_name?: string; role?: string },
): Promise<User>
```

```typescript
const user = await client.users.getOrCreate('usr_alice', {
  email: 'alice@example.com',
  first_name: 'Alice',
});
```

#### `client.users.removeExternalId(externalId)`

Remove an external ID mapping without deleting the user.

```typescript
removeExternalId(externalId: string): Promise<ExternalIdDeleteResponse>
```

```typescript
const result = await client.users.removeExternalId('usr_alice');
```

---

### Embed

Manage embed session tokens.

#### `client.embed.createSession(params)`

Create a new embed session token for a user.

```typescript
createSession(params: CreateSessionParams): Promise<EmbedSession>
```

```typescript
const session = await client.embed.createSession({
  user_id: 'user_abc123',
  origin: 'https://myapp.com',
  ttl: 7200,
});
// { session_token: '...', expires_in: 7200, user_id: 'user_abc123' }
```

| Param | Type | Description |
|---|---|---|
| `user_id` | `string` | Querri user ID the session acts as |
| `origin` | `string?` | Allowed origin for the embed iframe |
| `ttl` | `number?` | Lifetime in seconds (default `3600`; the server accepts `900`–`86400`) |
| `role` | `string \| null` (optional) | **Custom Roles:** role id or key (max 100 chars) the session runs as. Sent only when a non-empty string (`null` and `''` mean no role). |

When `role` is applied, the response adds `role_id`. A server too old to know Custom Roles ignores `role`: there is no `role_id` and the session runs as the user's own role — so check `role_id` when the role matters:

```typescript
const session = await client.embed.createSession({ user_id: 'user_abc123', role: 'analyst' });
// { session_token: '...', expires_in: 3600, user_id: 'user_abc123', role_id: 'role_…' }
```

`role_id` can be a custom role id (`role_…`) or a built-in one such as `system:creator`.

The role must be enabled and not Admin. A role the user already holds is simply selected. Granting one they do not hold needs a key with the `embed:role:assign` scope (included in `*`), the role on the org's embed allowlist (Settings → Embed), and the people the key acts for holding every permission in it — on servers released after 2026-10-21, both its creator and its bound user; before, its bound user (else its creator).

> **A grant is permanent.** It adds the role to the user's role assignment, so later sessions and the Querri app see it too. Revoking the session does not remove it; an admin removes it in Settings → People.

The refusals are `role_not_found` (404) and `role_not_allowed`, `role_disabled`, `insufficient_scope`, `seat_change_required` (403). See [Error codes](#error-codes).

On servers released after 2026-10-21 a key also can't open a session as someone who holds more than the key's people (its creator and its bound user), for example an Admin from a key a Creator made: `PermissionError` with `code` `'escalation_denied'` (with or without `role`).

> **Security:** Decide `role` on your server from your own auth. Never take it from the browser's request.

#### `client.embed.refreshSession(sessionToken)`

Refresh an existing session token, extending its lifetime.

```typescript
refreshSession(sessionToken: string): Promise<EmbedSession>
```

```typescript
const refreshed = await client.embed.refreshSession('sess_token_...');
```

The refreshed session keeps the original's role. When it has one, the response carries the same `role_id`. Servers released after 2026-10-21 also return `role_id` from refresh and list; earlier servers return it only from create.

#### `client.embed.listSessions(params?)`

List active embed sessions.

```typescript
listSessions(params?: { limit?: number; after?: string }): Promise<EmbedSessionList>
```

```typescript
const sessions = await client.embed.listSessions({ limit: 50 });
// { data: [...], has_more: false, next_cursor: null }
```

Each item is `{ session_token, user_id, origin, created_at, auth_method, role_id }`. `role_id` is always present, `null` when the session has no role (servers released after 2026-10-21; earlier servers omit it).

#### `client.embed.revokeSession(sessionToken)`

Revoke (invalidate) an embed session. Pass the session's opaque token (`EmbedSession.session_token` / `EmbedSessionListItem.session_token`), not a database id.

```typescript
revokeSession(sessionToken: string): Promise<EmbedSessionRevokeResponse>
```

```typescript
const result = await client.embed.revokeSession(session.session_token);
// { session_id: 'sess_abc', revoked: true }
```

#### `client.embed.revokeUserSessions(userId)`

Revoke all embed sessions for a given user. Lists active sessions, filters by user ID, and revokes each one.

```typescript
revokeUserSessions(userId: string): Promise<number>
```

```typescript
const count = await client.embed.revokeUserSessions('user_abc123');
// 3 (number of sessions revoked)
```

---

### Policies

Manage access policies that control which data sources and rows users can see.

#### `client.policies.create(params)`

Create a new access policy.

```typescript
create(params: PolicyCreateParams): Promise<Policy>
```

```typescript
const policy = await client.policies.create({
  name: 'acme-corp-policy',
  source_ids: ['src_1', 'src_2'],
  row_filters: [{ column: 'tenant_id', values: ['acme'] }],
});
```

#### `client.policies.retrieve(policyId)`

Fetch a single policy by ID.

```typescript
retrieve(policyId: string): Promise<Policy>
```

```typescript
const policy = await client.policies.retrieve('pol_abc');
```

#### `client.policies.list(params?)`

List policies with cursor-based pagination. Optionally filter by name.

```typescript
list(params?: { name?: string; limit?: number; after?: string }): Promise<CursorPage<Policy>>
```

```typescript
const page = await client.policies.list();
const specific = await client.policies.list({ name: 'acme-corp-policy' });

// Async iteration over all pages
for await (const policy of client.policies.list()) {
  console.log(policy.name);
}
```

#### `client.policies.update(policyId, params)`

Update an existing policy.

```typescript
update(policyId: string, params: PolicyUpdateParams): Promise<PolicyUpdateResponse>
```

```typescript
await client.policies.update('pol_abc', {
  row_filters: [{ column: 'tenant_id', values: ['acme', 'globex'] }],
});
```

#### `client.policies.del(policyId)`

Delete a policy.

```typescript
del(policyId: string): Promise<PolicyDeleteResponse>
```

```typescript
await client.policies.del('pol_abc');
```

#### `client.policies.assignUsers(policyId, params)`

Assign one or more users to a policy.

```typescript
assignUsers(policyId: string, params: { user_ids: string[] }): Promise<PolicyAssignResponse>
```

```typescript
await client.policies.assignUsers('pol_abc', { user_ids: ['user_1', 'user_2'] });
```

#### `client.policies.removeUser(policyId, userId)`

Remove a single user from a policy.

```typescript
removeUser(policyId: string, userId: string): Promise<PolicyRemoveUserResponse>
```

```typescript
await client.policies.removeUser('pol_abc', 'user_1');
```

#### `client.policies.replaceUserPolicies(userId, params)`

Atomically replace ALL policy assignments for a user. Removes every existing assignment, then assigns exactly the listed policies. Pass an empty array to remove all policies.

This is the correct method for mid-session policy switching — it prevents the accumulation bug where `assignUsers()` only adds.

```typescript
replaceUserPolicies(userId: string, params: { policy_ids: string[] }): Promise<PolicyReplaceResponse>
```

```typescript
// Replace all policies for a user with exactly these two
await client.policies.replaceUserPolicies('user_1', { policy_ids: ['pol_abc', 'pol_def'] });
// Returns: { user_id, policy_ids, added, removed }

// Remove all policy assignments (grants full access)
await client.policies.replaceUserPolicies('user_1', { policy_ids: [] });
```

#### `client.policies.resolve(params)`

Resolve the effective access for a user on a specific data source, taking all assigned policies into account.

```typescript
resolve(params: { user_id: string; source_id: string }): Promise<ResolvedAccess>
```

```typescript
const access = await client.policies.resolve({ user_id: 'user_1', source_id: 'src_1' });
// { user_id, source_id, resolved_filters, where_clause }
```

#### `client.policies.columns(sourceId?)`

List available columns for filtering. Optionally scoped to a single source.

```typescript
columns(sourceId?: string): Promise<SourceColumns[]>
```

```typescript
const cols = await client.policies.columns('src_1');
// [{ source_id, source_name, columns: [{ name, type }] }]
```

---

### Projects

Manage analysis projects.

#### `client.projects.create(params)`

Create a new project.

```typescript
create(params: ProjectCreateParams): Promise<Project>
```

```typescript
const project = await client.projects.create({
  name: 'Q4 Revenue Analysis',
  user_id: 'user_abc123',
  description: 'Quarterly revenue breakdown by region',
});
```

#### `client.projects.retrieve(projectId)`

Fetch a single project by ID, including step summaries.

```typescript
retrieve(projectId: string): Promise<Project>
```

```typescript
const project = await client.projects.retrieve('proj_abc');
```

#### `client.projects.list(params?)`

List projects with cursor-based pagination. Pass `user_id` to return only projects the user has FGA access to.

```typescript
list(params?: { limit?: number; after?: string; user_id?: string }): Promise<CursorPage<Project>>
```

```typescript
// All projects in the org
for await (const project of client.projects.list()) {
  console.log(project.name);
}

// Only projects a specific user can access (FGA-filtered)
const userProjects = await client.projects.list({ user_id: 'ext_alice' });
```

#### `client.projects.update(projectId, params)`

Update a project's name or description.

```typescript
update(projectId: string, params: ProjectUpdateParams): Promise<Project>
```

```typescript
await client.projects.update('proj_abc', { name: 'Updated Name' });
```

#### `client.projects.del(projectId)`

Delete a project.

```typescript
del(projectId: string): Promise<void>
```

```typescript
await client.projects.del('proj_abc');
```

#### `client.projects.run(projectId, userId)`

Trigger an execution run for a project.

```typescript
run(projectId: string, userId: string): Promise<ProjectRunResponse>
```

```typescript
const run = await client.projects.run('proj_abc', 'user_abc123');
// { id: 'proj_abc', run_id: 'run_xyz', status: 'running' }
```

#### `client.projects.runStatus(projectId)`

Check the current run status of a project.

```typescript
runStatus(projectId: string): Promise<ProjectRunStatus>
```

```typescript
const status = await client.projects.runStatus('proj_abc');
// { id: 'proj_abc', status: 'completed', is_running: false }
```

#### `client.projects.runCancel(projectId)`

Cancel an in-progress project run.

```typescript
runCancel(projectId: string): Promise<ProjectCancelResponse>
```

```typescript
await client.projects.runCancel('proj_abc');
```

#### `client.projects.listSteps(projectId)`

List all steps in a project.

```typescript
listSteps(projectId: string): Promise<StepSummary[]>
```

```typescript
const steps = await client.projects.listSteps('proj_abc');
// [{ id, name, type, status, order, has_data, has_figure }]
```

#### `client.projects.getStepData(projectId, stepId, params?)`

Fetch the data output of a specific step, with optional pagination.

```typescript
getStepData(
  projectId: string,
  stepId: string,
  params?: { page?: number; page_size?: number },
): Promise<DataPage>
```

```typescript
const data = await client.projects.getStepData('proj_abc', 'step_1', {
  page: 1,
  page_size: 100,
});
```

---

### Chats

Manage project chats and streaming conversations.

#### `client.chats.create(projectId, params?)`

Create a new chat within a project.

```typescript
create(projectId: string, params?: ChatCreateParams): Promise<Chat>
```

```typescript
const chat = await client.chats.create('proj_abc', { name: 'Revenue Q&A' });
```

#### `client.chats.retrieve(projectId, chatId)`

Fetch a chat, including its messages.

```typescript
retrieve(projectId: string, chatId: string): Promise<Chat>
```

```typescript
const chat = await client.chats.retrieve('proj_abc', 'chat_xyz');
```

#### `client.chats.list(projectId, params?)`

List chats within a project with cursor-based pagination.

```typescript
list(projectId: string, params?: { limit?: number; after?: string }): Promise<CursorPage<Chat>>
```

```typescript
const page = await client.chats.list('proj_abc', { limit: 10 });

// Async iteration
for await (const chat of client.chats.list('proj_abc')) {
  console.log(chat.name);
}
```

#### `client.chats.stream(projectId, chatId, params)`

Send a message and receive a streaming response. Returns a `ChatStream` object (see [Streaming](#streaming)).

```typescript
stream(
  projectId: string,
  chatId: string,
  params: ChatStreamParams,
): Promise<ChatStream>
```

```typescript
const stream = await client.chats.stream('proj_abc', 'chat_xyz', {
  prompt: 'What drove revenue growth in Q4?',
  user_id: 'user_abc123',
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

#### `client.chats.cancel(projectId, chatId)`

Cancel an in-progress streaming response.

```typescript
cancel(projectId: string, chatId: string): Promise<ChatCancelResponse>
```

```typescript
await client.chats.cancel('proj_abc', 'chat_xyz');
```

#### `client.chats.del(projectId, chatId)`

Delete a chat.

```typescript
del(projectId: string, chatId: string): Promise<void>
```

```typescript
await client.chats.del('proj_abc', 'chat_xyz');
```

---

### Dashboards

Manage dashboards.

#### `client.dashboards.create(params)`

Create a new dashboard.

```typescript
create(params: DashboardCreateParams): Promise<Dashboard>
```

```typescript
const dashboard = await client.dashboards.create({
  name: 'Sales Overview',
  description: 'Real-time sales metrics',
});
```

#### `client.dashboards.retrieve(dashboardId)`

Fetch a single dashboard, including its widgets and filters.

```typescript
retrieve(dashboardId: string): Promise<Dashboard>
```

```typescript
const dashboard = await client.dashboards.retrieve('dash_abc');
```

#### `client.dashboards.list(params?)`

List dashboards with cursor-based pagination. Pass `user_id` to return only dashboards the user has FGA access to.

```typescript
list(params?: { limit?: number; after?: string; user_id?: string }): Promise<CursorPage<Dashboard>>
```

```typescript
// All dashboards in the org
for await (const dashboard of client.dashboards.list()) {
  console.log(dashboard.name);
}

// Only dashboards a specific user can access (FGA-filtered)
const userDashboards = await client.dashboards.list({ user_id: 'ext_alice' });
```

#### `client.dashboards.update(dashboardId, params)`

Update a dashboard.

```typescript
update(dashboardId: string, params: DashboardUpdateParams): Promise<DashboardUpdateResponse>
```

```typescript
await client.dashboards.update('dash_abc', { name: 'Updated Sales Overview' });
```

#### `client.dashboards.del(dashboardId)`

Delete a dashboard.

```typescript
del(dashboardId: string): Promise<void>
```

```typescript
await client.dashboards.del('dash_abc');
```

#### `client.dashboards.refresh(dashboardId)`

Trigger a refresh of all projects within a dashboard.

```typescript
refresh(dashboardId: string): Promise<DashboardRefreshResponse>
```

```typescript
const result = await client.dashboards.refresh('dash_abc');
// { id: 'dash_abc', status: 'refreshing', project_count: 4 }
```

#### `client.dashboards.refreshStatus(dashboardId)`

Check the status of a dashboard refresh.

```typescript
refreshStatus(dashboardId: string): Promise<DashboardRefreshStatus>
```

```typescript
const status = await client.dashboards.refreshStatus('dash_abc');
```

---

### Data

Query and manage data sources.

#### `client.data.list(params?)`

List all available data sources with cursor-based pagination.

```typescript
list(params?: { limit?: number; after?: string }): Promise<CursorPage<DataSource>>
```

```typescript
const page = await client.data.list();

for await (const src of client.data.list()) {
  console.log(src.name);
}
```

#### `client.data.retrieve(sourceId)`

Fetch metadata for a single data source.

```typescript
retrieve(sourceId: string): Promise<DataSource>
```

```typescript
const src = await client.data.retrieve('src_1');
```

#### `client.data.query(params)`

Execute a SQL query against a data source.

```typescript
query(params: QueryParams): Promise<QueryResult>
```

```typescript
const result = await client.data.query({
  sql: 'SELECT region, SUM(revenue) FROM sales GROUP BY region',
  source_id: 'src_1',
  page: 1,
  page_size: 100,
});
// { data: [...], total_rows: 5, page: 1, page_size: 100 }
```

#### `client.data.getSourceData(sourceId, params?)`

Fetch raw data from a source with pagination.

```typescript
getSourceData(
  sourceId: string,
  params?: { page?: number; page_size?: number },
): Promise<DataPage>
```

```typescript
const page = await client.data.getSourceData('src_1', { page: 1, page_size: 50 });
```

#### `client.data.create(params)`

Create a new data source with inline JSON rows.

```typescript
create(params: DataSourceCreateParams): Promise<DataSourceCreateResult>
```

```typescript
const source = await client.data.create({
  name: 'Sales Data',
  rows: [
    { region: 'US', revenue: 1000 },
    { region: 'EU', revenue: 800 },
  ],
});
// { id: 'src_new', name: 'Sales Data', columns: ['region', 'revenue'], row_count: 2, updated_at: '...' }
```

#### `client.data.appendRows(sourceId, params)`

Append rows to an existing data source. New columns are union-merged automatically.

```typescript
appendRows(sourceId: string, params: { rows: Record<string, unknown>[] }): Promise<DataWriteResult>
```

```typescript
await client.data.appendRows('src_1', {
  rows: [{ region: 'APAC', revenue: 600 }],
});
```

#### `client.data.replaceRows(sourceId, params)`

Replace all data in a source with new rows.

```typescript
replaceRows(sourceId: string, params: { rows: Record<string, unknown>[] }): Promise<DataWriteResult>
```

```typescript
await client.data.replaceRows('src_1', {
  rows: [{ region: 'US', revenue: 1200 }],
});
```

#### `client.data.del(sourceId)`

Delete a data source and all its associated data.

```typescript
del(sourceId: string): Promise<DataSourceDeleteResult>
```

```typescript
await client.data.del('src_1');
// { id: 'src_1', deleted: true }
```

---

### Files

Upload and manage files.

#### `client.files.upload(file, name?)`

Upload a file. Accepts a `Blob` or `Uint8Array`.

```typescript
upload(file: Blob | Uint8Array, name?: string): Promise<FileObject>
```

```typescript
import { readFileSync } from 'fs';

const buffer = readFileSync('report.csv');
const file = await client.files.upload(new Blob([buffer]), 'report.csv');
```

#### `client.files.retrieve(fileId)`

Fetch file metadata.

```typescript
retrieve(fileId: string): Promise<FileObject>
```

```typescript
const file = await client.files.retrieve('file_abc');
```

#### `client.files.list(params?)`

List all files with cursor-based pagination.

```typescript
list(params?: { limit?: number; after?: string }): Promise<CursorPage<FileObject>>
```

```typescript
const page = await client.files.list();
```

#### `client.files.del(fileId)`

Delete a file.

```typescript
del(fileId: string): Promise<void>
```

```typescript
await client.files.del('file_abc');
```

---

### Sources

Manage data source connections (connectors).

#### `client.sources.listConnectors(params?)`

List available connector types (e.g., PostgreSQL, BigQuery, CSV) with cursor-based pagination.

```typescript
listConnectors(params?: { limit?: number; after?: string }): Promise<CursorPage<Connector>>
```

```typescript
const page = await client.sources.listConnectors();
```

#### `client.sources.create(params)`

Create a new data source from inline JSON rows (same server contract as `client.data.create()`). Connector-backed sources are configured in the Querri app, not through this API.

```typescript
create(params: SourceCreateParams): Promise<Source>
```

```typescript
const source = await client.sources.create({
  name: 'Sales Data',
  rows: [
    { region: 'US', revenue: 1000 },
    { region: 'EU', revenue: 800 },
  ],
});
```

#### `client.sources.list(params?)`

List all configured sources with cursor-based pagination.

```typescript
list(params?: { limit?: number; after?: string }): Promise<CursorPage<Source>>
```

```typescript
const page = await client.sources.list();
```

#### `client.sources.update(sourceId, params)`

Update a source's name, description, configuration, or access-control mode.

```typescript
update(sourceId: string, params: SourceUpdateParams): Promise<SourceUpdateResponse>
```

```typescript
await client.sources.update('src_1', { name: 'Sales Data (v2)', description: 'Cleaned monthly extract' });
// { id: 'src_1', name: 'Sales Data (v2)', access_controlled: false, updated: true }
```

#### `client.sources.del(sourceId)`

Delete a source.

```typescript
del(sourceId: string): Promise<void>
```

```typescript
await client.sources.del('src_1');
```

#### `client.sources.sync(sourceId)`

Trigger a sync/refresh of a source's metadata and schema.

```typescript
sync(sourceId: string): Promise<Record<string, unknown>>
```

```typescript
await client.sources.sync('src_1');
```

---

### Keys

Manage API keys.

#### `client.keys.create(params)`

Create a new API key. The `secret` field is only returned on creation.

```typescript
create(params: ApiKeyCreateParams): Promise<ApiKeyCreated>
```

```typescript
const key = await client.keys.create({
  name: 'CI Pipeline Key',
  scopes: ['data:read', 'admin:projects:read'],
  bound_user_id: 'user_abc123', // the key follows this person's role; binding to someone other than yourself needs an Admin
  expires_in_days: 90,
});
console.log(key.secret); // Only available at creation time
```

**Scopes.** These are the valid scope names (an unknown name is refused with `400 invalid_parameters`):

| Area | Scopes |
|---|---|
| Data | `data:read`, `data:write` |
| Embed | `embed:session:create`, `embed:role:assign` |
| Users / policies | `admin:users:read`, `admin:users:write`, `admin:policies:read`, `admin:policies:write` |
| Projects / dashboards | `admin:projects:read`, `admin:projects:write`, `admin:dashboards:read`, `admin:dashboards:write` |
| Sources / files | `admin:sources:read`, `admin:sources:write`, `admin:files:read`, `admin:files:upload`, `admin:files:delete` |
| Sharing | `admin:permissions:read`, `admin:permissions:write` |
| Library / skills | `admin:library:read`, `admin:library:write`, `admin:skills:read`, `admin:skills:write` |
| Org | `admin:keys:manage`, `admin:audit:read`, `admin:usage:read` |
| Library seeding (dev/staging only) | `admin:library:seed` |
| All | `*` (needs the Admin role; includes `embed:role:assign`) |

`embed:role:assign` lets `getSession({ role })` / `embed.createSession({ role })` grant an allowlisted Custom Role the user does not already hold. Minting a key with it in Settings needs the `api.write_scopes.use`, `admin.embed.manage` and `admin.people.manage` permissions.

**Scopes follow a person's role.** A JWT caller gets the scopes their active role allows (a Guest is read-only). An API key acts for its creator *and* its bound user (`bound_user_id`), and every call keeps only the scopes both of them hold *now*: a demoted or departed creator or bound user narrows the key. On servers released after 2026-10-21 the same two people also bound what the key's embed role grants and `/v1` user-role changes may give: every permission must be held by both (before, by its bound user, else its creator).

On servers released after 2026-10-21, creating a key is checked too:

- A new key can't carry more than its creator and its bound user hold: `403 permission_denied`, reason `scope_exceeds_role`. The refused scopes are in the raw body, `err.body.detail.error.scopes`.
- Only an Admin may bind a key to someone other than themselves: `403 permission_denied`, `permission: 'org.admin'`, `reason: 'role_denied'`. Binding a key to yourself is fine.
- `bound_user_id` cannot be a pseudo id (`api_key:…`, `jwt:…`, `embed:…`, `public`, `embed-api`, the service account): `400 invalid_parameters`.
- A key created with `client.keys.create()` (a key minting a key) keeps the minting key's creator and bound user — a bound key can only mint keys bound to the same user (else `400 invalid_parameters`) — and its workspace. Its sources must be equal or narrower, its access policies exactly the same set, and each IP allow-list entry inside one of the parent's IPs or CIDR ranges. It cannot expire after the parent and its `rate_limit_per_minute` is capped at the parent's.

Earlier servers cap only keys created in Settings, and check embed role grants against the key's bound user (else its creator).

#### `client.keys.retrieve(keyId)`

Fetch API key metadata (the secret is not returned).

```typescript
retrieve(keyId: string): Promise<ApiKey>
```

```typescript
const key = await client.keys.retrieve('key_abc');
```

#### `client.keys.list(params?)`

List all API keys with cursor-based pagination.

```typescript
list(params?: { limit?: number; after?: string }): Promise<CursorPage<ApiKey>>
```

```typescript
const page = await client.keys.list();
```

#### `client.keys.del(keyId)` / `client.keys.revoke(keyId)`

Revoke and delete an API key. `revoke()` is an alias for `del()`.

```typescript
del(keyId: string): Promise<KeysDeleteResponse>
revoke(keyId: string): Promise<KeysDeleteResponse>
// KeysDeleteResponse = { id: string; deleted: boolean }
```

```typescript
await client.keys.revoke('key_abc');
```

---

### Sharing

Share projects and dashboards with users.

#### `client.sharing.shareProject(projectId, params)`

Share a project with a user. Default permission is `'view'`.

```typescript
shareProject(projectId: string, params: ShareParams): Promise<ShareEntry>
// ShareParams = { user_id: string; permission?: 'view' | 'edit'; expires_at?: string }
```

```typescript
await client.sharing.shareProject('proj_abc', { user_id: 'user_1', permission: 'edit' });
```

#### `client.sharing.revokeProjectShare(projectId, userId)`

Revoke a user's access to a project.

```typescript
revokeProjectShare(projectId: string, userId: string): Promise<ShareRevokeResponse>
// ShareRevokeResponse = { deleted: boolean }
```

```typescript
await client.sharing.revokeProjectShare('proj_abc', 'user_1');
```

#### `client.sharing.listProjectShares(projectId)`

List all shares for a project.

```typescript
listProjectShares(projectId: string): Promise<ShareEntry[]>
```

```typescript
const shares = await client.sharing.listProjectShares('proj_abc');
```

#### `client.sharing.shareDashboard(dashboardId, params)`

Share a dashboard with a user. Default permission is `'view'`.

```typescript
shareDashboard(dashboardId: string, params: ShareParams): Promise<ShareEntry>
// ShareParams = { user_id: string; permission?: 'view' | 'edit'; expires_at?: string }
```

```typescript
await client.sharing.shareDashboard('dash_abc', { user_id: 'user_1' });
```

#### `client.sharing.revokeDashboardShare(dashboardId, userId)`

Revoke a user's access to a dashboard.

```typescript
revokeDashboardShare(dashboardId: string, userId: string): Promise<ShareRevokeResponse>
// ShareRevokeResponse = { deleted: boolean }
```

```typescript
await client.sharing.revokeDashboardShare('dash_abc', 'user_1');
```

#### `client.sharing.listDashboardShares(dashboardId)`

List all shares for a dashboard.

```typescript
listDashboardShares(dashboardId: string): Promise<ShareEntry[]>
```

```typescript
const shares = await client.sharing.listDashboardShares('dash_abc');
```

#### `client.sharing.shareSource(sourceId, params)`

Share a data source with a user. Default permission is `'view'`.

```typescript
shareSource(sourceId: string, params: SourceShareParams): Promise<ShareEntry>
```

```typescript
await client.sharing.shareSource('src_1', { user_id: 'user_1', permission: 'edit' });
```

#### `client.sharing.orgShareSource(sourceId, params)`

Enable or disable org-wide sharing for a data source. The `permission` level (`'view'` or `'edit'`) is honoured when enabling.

```typescript
orgShareSource(sourceId: string, params: OrgShareSourceParams): Promise<OrgShareSourceResponse>
```

```typescript
await client.sharing.orgShareSource('src_1', { enabled: true, permission: 'view' });
// { source_id: 'src_1', org_shared: true }
```

---

### Audit

Query the audit log.

#### `client.audit.list(params?)`

List audit events with optional filters and cursor-based pagination.

```typescript
list(params?: AuditListParams): Promise<CursorPage<AuditEvent>>
```

```typescript
const page = await client.audit.list({
  action: 'project.run',
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  limit: 50,
});

// Async iteration
for await (const event of client.audit.list()) {
  console.log(event.action);
}
```

`AuditListParams` fields: `actor_id`, `target_id`, `action`, `start_date`, `end_date`, `limit`, `after`.

---

### Usage

Query usage metrics for the organization or individual users.

#### `client.usage.orgUsage(period?)`

Get organization-wide usage for a billing period.

```typescript
orgUsage(period?: string): Promise<UsageReport>
```

```typescript
const usage = await client.usage.orgUsage('current_month');
// { period_start, period_end, total_queries, total_tokens, total_projects, total_users, details }
```

#### `client.usage.userUsage(userId, period?)`

Get usage for a specific user.

```typescript
userUsage(userId: string, period?: string): Promise<UsageReport>
```

```typescript
const usage = await client.usage.userUsage('user_abc123', 'current_month');
```

---

## getSession() Deep Dive

`client.getSession()` is the flagship convenience method for the embed use case. It orchestrates three steps in a single call: user resolution, access policy setup, and embed session creation.

### The 3-Step Flow

```
1. User Resolution      -->  users.getOrCreate()
2. Access Policy Setup   -->  policies.create() + policies.replaceUserPolicies()
3. Session Creation      -->  embed.createSession()
```

> **Note:** Step 2 uses `replaceUserPolicies()` (not `assignUsers()`) to atomically replace all policy assignments. This prevents policy accumulation when the same user is given different access filters across sessions.

### Basic Usage

```typescript
const { session_token, expires_in, user_id, external_id, role_id } = await client.getSession({
  user: 'usr_alice',
  access: {
    sources: ['src_sales'],
    filters: { tenant_id: 'acme' },
  },
  ttl: 3600,
  origin: 'https://myapp.com',
  role: 'analyst', // optional: Custom Role id or key
});
```

### Signature

```typescript
getSession(params: GetSessionParams): Promise<GetSessionResult>
```

### Parameters

```typescript
interface GetSessionParams {
  user: string | GetSessionUserParams;
  access?: GetSessionPolicyAccess | GetSessionInlineAccess;
  origin?: string;
  ttl?: number;
  role?: string | null;   // Custom Roles: role id or key the session runs as
}
```

> **`role` vs `user.role`:** `role` is the Custom Role the *session* runs as, sent to `embed.createSession()`. `user.role` is the user's *org* role (`admin` / `member`), used only when the user is first created. They are different things.

> **Shorthand:** `user: 'ext_123'` is equivalent to `user: { external_id: 'ext_123' }`. See [User Resolution](#user-resolution) below.

### Return Value

```typescript
interface GetSessionResult {
  session_token: string;    // Pass this to the embed component's fetchSessionToken
  expires_in: number;       // Seconds until the token expires
  user_id: string;          // Querri internal user ID
  external_id: string | null;  // Your external ID for the user
  role_id?: string | null;     // Applied Custom Role id, or null (no role requested, or the server ignored it)
}
```

`role_id` is always set by `getSession()` (`null` without `role`, and also when a server too old to know Custom Roles ignored `role` — the session then runs as the user's own role, so check `role_id` when the role matters); the key is optional in the type so hand-built results passed to `asUser()` keep compiling. It can be a custom role id (`role_…`) or a built-in one such as `system:creator`.

### User Resolution

The `user` parameter supports two forms:

**String shorthand** -- pass an external ID directly. The SDK calls `users.getOrCreate(externalId)` with no additional fields:

```typescript
await client.getSession({
  user: 'usr_alice',
});
```

**Object form** -- pass an `external_id` along with optional profile fields. All fields are forwarded to `users.getOrCreate()`:

```typescript
await client.getSession({
  user: {
    external_id: 'usr_alice',
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Smith',
    role: 'member', // org role at creation: 'admin' | 'member' (not the session's Custom Role)
  },
});
```

In both cases, if the user already exists, they are returned as-is (the profile fields are used at creation time). Creating a new user follows the [role guards](#users): on servers released after 2026-10-21 `getSession()` can throw `escalation_denied` (403) or `last_admin` (409) from this step.

### Access Policies

The `access` parameter controls what data the user can see. It supports two forms:

**Policy ID reference** -- attach the user to one or more existing policies by ID:

```typescript
access: {
  policy_ids: ['pol_abc', 'pol_def'],
}
```

**Inline sources + filters** -- specify the allowed sources and row-level filters directly. The SDK automatically creates and manages a policy for this configuration:

```typescript
access: {
  sources: ['src_sales', 'src_inventory'],
  filters: {
    tenant_id: 'acme',
    region: ['us-east', 'us-west'],   // Array values are OR'd
  },
}
```

### Deterministic SHA256 Hashing for Auto-Managed Policies

When you use inline access, the SDK does not create a new policy on every call. Instead, it:

1. Sorts the `sources` array and `filters` keys alphabetically.
2. Normalizes filter values to sorted arrays.
3. Computes a SHA256 hash of the resulting JSON.
4. Truncates the hash to 8 hex characters.
5. Names the policy `sdk_auto_{hash}` (e.g., `sdk_auto_a1b2c3d4`).

On subsequent calls with the same sources and filters, the SDK finds the existing policy by name and reuses it. This means:

- Identical access specs always map to the same policy.
- You do not accumulate duplicate policies over time.
- The user is assigned to the policy if not already assigned.

### TTL and Origin

| Parameter | Type | Default | Description |
|---|---|---|---|
| `ttl` | `number` | `3600` | Session lifetime in seconds |
| `origin` | `string` | `undefined` | Allowed origin for the embed iframe. Used for CORS validation. |

### Custom Role (`role`)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `role` | `string \| null` | `undefined` | Role id or key the session runs as. Omit (or pass `null` or `''`) to keep the user's own role. |

`getSession()` forwards `role` to `embed.createSession()` only when it is a non-empty string and returns the applied `role_id` (check it when the role matters: `null` also means an older server ignored `role`). The user is created/updated and their access policies applied before the session is requested, so if the role is refused those earlier steps have still happened. The rules and refusals are the same as [`client.embed.createSession`](#clientembedcreatesessionparams). A granted role is **permanent**: it is added to the user's role assignment (later sessions and the Querri app see it), revoking the session does not remove it, and an admin removes it in Settings → People. Decide `role` on your server, never from the browser's request.

---

## User-Scoped Client (asUser)

> **Tip:** For simple filtered lists, you can pass `user_id` directly to `projects.list()` or `dashboards.list()` without creating a user-scoped client:
> ```typescript
> const projects = await client.projects.list({ user_id: 'ext_alice' });
> ```
> Use `asUser()` when you need a full user-scoped client for multiple operations.

After creating a session with `getSession()`, you can create a **user-scoped client** that calls the public API (`/api/v1`) using the user's embed session token. Embed sessions are first-class auth on `/api/v1` and carry per-user Fine-Grained Authorization (FGA) filtering, so resource lists only return items the user has access to.

### Basic Usage

```typescript
import { Querri } from '@querri-inc/embed/server';

const client = new Querri();

// Step 1: Create an embed session
const session = await client.getSession({
  user: { external_id: 'usr_alice', email: 'alice@example.com' },
  access: { sources: ['src_sales'], filters: { tenant_id: 'acme' } },
});

// Step 2: Create a user-scoped client
const userClient = client.asUser(session);

// Step 3: Call resources — results are FGA-filtered
const projects = await userClient.projects.list();
// Only returns projects the user has been granted access to via sharing
```

### How It Works

| | `client` (Querri) | `userClient` (UserQuerri) |
|---|---|---|
| **Auth** | API key (`Authorization: Bearer qk_…`) | Session token (`X-Embed-Session: es_…`) |
| **Base URL** | `/api/v1` (public API) | `/api/v1` (public API) |
| **Scope** | Org-wide (all resources) | User-scoped (FGA-filtered) |
| **Resources** | All 13 resources | 5 resources: projects, dashboards, sources, data, chats |

### `client.asUser(session)`

| Parameter | Type | Description |
|---|---|---|
| `session` | `GetSessionResult` | The session object returned by `getSession()` |

**Returns:** `UserQuerri` — a user-scoped client with 5 resource accessors.

Calls made through `UserQuerri` are subject to the session's Custom Role (the `role` passed to `getSession()`, else the user's own). An action the role does not allow throws `PermissionError` with `code: 'permission_denied'`, `permission` (e.g. `'dashboards.list.view'`) and `reason` (e.g. `'role_denied'`).

### UserQuerri Resources

The `UserQuerri` client exposes the same resource classes as the main client, but only the subset that supports user-scoped access:

```typescript
userClient.projects     // ProjectsResource — list, retrieve, etc.
userClient.dashboards   // UserDashboardsResource — READ-ONLY: list, retrieve, refreshStatus
userClient.sources      // SourcesResource — list, retrieve, etc.
userClient.data         // DataResource — query, list, retrieve, etc.
userClient.chats        // ChatsResource — create, stream, etc.
```

**Dashboards are read-only under embed sessions.** The server excludes the `admin:dashboards:write` scope from embed-session credentials, so dashboard `create`, `update`, `del`, and `refresh` are refused; the user client's `dashboards` accessor exposes only the read methods. Embed sessions also cannot mint further sessions (`embed:session:create` is excluded), so `UserQuerri` has no `embed` accessor — manage sessions with the parent API-key client.

### Granting Access

For a user to see resources via `userClient`, they must be granted access. Use `sharing.shareProject()` on the main client:

```typescript
// Grant user access to a specific project
await client.sharing.shareProject(projectId, session.user_id);

// Now the user's client will include this project
const projects = await userClient.projects.list();
```

---

## Pagination

Resources that return lists of items use cursor-based pagination via the `CursorPage<T>` class.

### CursorPage Properties

```typescript
class CursorPage<T> {
  readonly data: T[];              // Items on the current page
  readonly hasMore: boolean;       // Whether more pages exist
  readonly nextCursor: string | null;  // Cursor for the next page
  readonly total: number | undefined;  // Total count (if provided by API)
}
```

### Async Iteration

The most convenient way to consume all pages is with `for await...of`. The `CursorPage` implements `AsyncIterable<T>`, so it automatically fetches subsequent pages as needed:

```typescript
for await (const user of client.users.list({ limit: 100 })) {
  console.log(user.email);
}
```

### Collect All Items

Use `toArray()` to collect every item across all pages into a single array:

```typescript
const allUsers = await client.users.list().then(page => page.toArray());
```

### Manual Pagination

Use `getNextPage()` to step through pages one at a time:

```typescript
let page = await client.users.list({ limit: 25 });

while (true) {
  for (const user of page.data) {
    console.log(user.email);
  }
  if (!page.hasMore) break;
  page = await page.getNextPage();
}
```

### First Item

Use `first()` to get the first item from the current page (or `undefined` if the page is empty):

```typescript
const firstUser = (await client.users.list()).first();
```

---

## Streaming

The `ChatStream` class wraps a Server-Sent Events response in the Vercel AI SDK format.

### Vercel AI SDK Line Format

The stream uses these line prefixes:

| Prefix | Meaning | Payload |
|---|---|---|
| `0:` | Text chunk | JSON-encoded string |
| `e:` | Error | JSON-encoded error object |
| `d:` | Done signal | End of stream |

### Async Iteration

Iterate over text chunks as they arrive:

```typescript
const stream = await client.chats.stream('proj_abc', 'chat_xyz', {
  prompt: 'Summarize the data',
  user_id: 'user_abc123',
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Collect Full Text

Use `text()` to wait for the complete response:

```typescript
const stream = await client.chats.stream('proj_abc', 'chat_xyz', {
  prompt: 'Summarize the data',
  user_id: 'user_abc123',
});

const fullResponse = await stream.text();
console.log(fullResponse);
```

### Pipe to Web Response

Use `toReadableStream()` to get the underlying `ReadableStream<Uint8Array>`, which can be piped directly to a web `Response`:

```typescript
const stream = await client.chats.stream('proj_abc', 'chat_xyz', {
  prompt: 'Summarize the data',
  user_id: 'user_abc123',
});

// In a Next.js or SvelteKit route handler:
return new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' },
});
```

### Message ID

The stream exposes the server-assigned message ID via the `messageId` property:

```typescript
const stream = await client.chats.stream('proj_abc', 'chat_xyz', params);
console.log(stream.messageId); // From the x-message-id response header
```

### Important Notes

- A `ChatStream` can only be consumed once. Attempting to iterate a second time throws a `QuerriError`.
- If the server sends an `e:` line, a `StreamError` is thrown during iteration.

---

## Error Handling

### Error Hierarchy

```
QuerriError
├── ConfigError                 — Invalid SDK configuration
├── APIConnectionError          — Network-level failures
│   └── APITimeoutError         — Request timed out
├── APIError                    — HTTP error response from API
│   ├── AuthenticationError     — 401 Unauthorized
│   ├── PermissionError         — 403 Forbidden
│   ├── NotFoundError           — 404 Not Found
│   ├── ValidationError         — 400 Bad Request, 422 Unprocessable Entity
│   ├── ConflictError           — 409 Conflict
│   ├── RateLimitError          — 429 Too Many Requests
│   └── ServerError             — 500+ Server Error
└── StreamError                 — Streaming-specific errors
    ├── StreamTimeoutError      — Stream timed out
    └── StreamCancelledError    — Stream was cancelled
```

### APIError Properties

All `APIError` subclasses expose:

| Property | Type | Description |
|---|---|---|
| `status` | `number` | HTTP status code |
| `message` | `string` | Human-readable error message |
| `type` | `string \| undefined` | Error type from the API |
| `code` | `string \| undefined` | Error code from the API |
| `docUrl` | `string \| undefined` | Link to relevant documentation |
| `requestId` | `string \| undefined` | Request ID for support (the `X-Request-Id` header) |
| `permission` | `string \| undefined` | For `permission_denied`: the permission key refused (e.g. `'dashboards.list.view'`); falls back to the `X-Permission-Denied` header when that holds a permission key (one with a `.`), not an error code |
| `reason` | `string \| undefined` | For `permission_denied`: one of `role_denied`, `not_in_plan`, `flag_off`, `embed_disabled`, `dependency_unmet`, `forbidden`, `scope_exceeds_role` (type `PermissionDeniedReason`); the server may add more |
| `body` | `unknown` | Raw response body, exactly as sent |
| `headers` | `Headers` | Response headers |

Every `/v1` error arrives as `{"detail": {"error": {type, code, message, doc_url}}}`; the SDK unwraps it, so `message` is the server's text. A request-validation failure (`422`, e.g. `ttl` out of range) becomes a `ValidationError` whose `message` lists each field, e.g. `Validation failed: body.ttl: Input should be greater than or equal to 900`.

### Error codes

`ERROR_CODES` (and the `ErrorCode` type) are exported from `@querri-inc/embed/server`, so you can compare without typos: `err.code === ERROR_CODES.ROLE_DISABLED`. They are the codes for authentication, access, Custom Roles, embed sessions and user changes, plus `invalid_parameters`; the API sends other codes too (e.g. `project_not_found`), so treat `code` as a string. `ERROR_CODES` is frozen. Extra fields a refusal carries (`scopes`, `missing`) are not copied onto the error; read them from the raw body, e.g. `err.body.detail.error.missing`.

| Code | Status | Meaning |
|---|---|---|
| `missing_api_key` | 401 | No `Authorization: Bearer qk_…` header (or valid JWT) |
| `invalid_api_key` | 401 | Key unknown, revoked or expired |
| `invalid_jwt` | 401 | JWT could not be verified |
| `invalid_embed_session` | 401 | Embed session token unknown or expired |
| `missing_tenant_id` | 400 | The key needs an `X-Tenant-ID` (set `orgId`) |
| `invalid_parameters` | 400 | A parameter is invalid (e.g. an unknown scope, a pseudo `bound_user_id`, or a key minted by a key that breaks its parent's limits) |
| `ip_not_allowed` | 403 | Caller IP is not on the key's allowlist |
| `org_scheduled_for_deletion` | 403 | The organization is being deleted |
| `rate_limit_exceeded` | 429 | Too many requests; see `RateLimitError.retryAfter` |
| `insufficient_scope` | 403 | The key lacks a scope the call needs (for `role`: `embed:role:assign`, to grant a role the user does not hold) |
| `permission_denied` | 403 | The caller's role does not allow the action; see `permission` and `reason` |
| `escalation_denied` | 403 | Creating, changing or deleting a user would give or remove permissions the caller lacks (listed in `err.body.detail.error.missing`) |
| `last_admin` | 409 | The change would leave the organization without an Admin |
| `role_not_found` | 404 | No role with that id or key in the organization |
| `role_not_allowed` | 403 | Admin role, a role not on the embed allowlist, or one granting a permission the key's people don't hold (servers released after 2026-10-21: its creator and its bound user must both hold it; before: its bound user, else its creator) |
| `role_disabled` | 403 | The role is a draft; an admin must enable it |
| `seat_change_required` | 403 | The role needs a creator seat; an admin must assign it in Settings |
| `user_not_found` | 400 / 404 | `user_id` is not a user in this organization (400 on embed session creation, 404 on the users endpoints) |
| `not_org_member` | 403 | The user is not a member of this organization |
| `membership_check_failed` | 500 | Membership could not be verified; retry |
| `origin_required` | 400 | The org restricts embed origins and no `origin` was sent |
| `origin_not_allowed` | 403 | `origin` is not on the org's embed origin allowlist |
| `session_not_found` | 404 | Session token unknown (refresh / revoke) |
| `org_mismatch` | 403 | The session belongs to another organization |
| `session_creation_failed` | 500 | The session could not be stored; retry |
| `refresh_failed` | 500 | The session could not be refreshed; retry |

`reason` on `permission_denied`:

| Reason | Meaning |
|---|---|
| `role_denied` | The caller's role does not include the permission |
| `not_in_plan` | The organization's plan does not include the feature |
| `flag_off` | The feature is turned off for the organization |
| `embed_disabled` | The action is not available inside an embed |
| `dependency_unmet` | The permission needs another permission the role lacks |
| `forbidden` | Refused for another reason |
| `scope_exceeds_role` | Creating an API key with scopes its creator or bound user lacks (the refused scopes are in `err.body.detail.error.scopes`) |

The server may add reasons; the exported `PermissionDeniedReason` type lists these.

### Common Patterns

```typescript
import {
  Querri,
  APIError,
  AuthenticationError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ValidationError,
  ERROR_CODES,
} from '@querri-inc/embed/server';

try {
  const session = await client.getSession({ user: 'usr_alice', role: 'analyst' });
} catch (err) {
  if (err instanceof PermissionError) {
    switch (err.code) {
      case ERROR_CODES.ROLE_DISABLED:
        console.log('Ask an admin to enable the role');
        break;
      case ERROR_CODES.INSUFFICIENT_SCOPE:
        console.log('The key needs embed:role:assign to grant this role');
        break;
      case ERROR_CODES.PERMISSION_DENIED:
        console.log(`Needs ${err.permission} (${err.reason})`);
        break;
      default:
        console.log(`Forbidden [${err.code}]: ${err.message}`);
    }
  } else if (err instanceof NotFoundError) {
    console.log(err.code === ERROR_CODES.ROLE_NOT_FOUND ? 'No such role' : 'Not found');
  } else if (err instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter} seconds`);
  } else if (err instanceof ValidationError) {
    console.log('Bad request:', err.message);
  } else if (err instanceof APIError) {
    console.log(`API error ${err.status}: ${err.message}`);
  } else {
    throw err;
  }
}
```

### Rate Limit Backoff

`RateLimitError` includes a `retryAfter` property (in seconds), parsed from the `Retry-After` response header:

```typescript
try {
  await client.users.list();
} catch (err) {
  if (err instanceof RateLimitError && err.retryAfter) {
    await new Promise(r => setTimeout(r, err.retryAfter! * 1000));
    // Retry the request
  }
}
```

### Automatic Retry Behavior

The SDK automatically retries failed requests under these conditions:

- **429 (Rate Limited)**: Always retried, regardless of HTTP method.
- **500, 502, 503 (Server Errors)**: Retried only for idempotent methods (`GET`, `PUT`, `DELETE`, `HEAD`, `OPTIONS`).
- **Timeouts and connection errors**: Retried only for idempotent methods.

Retry delays use exponential backoff starting at 500ms, with 25% jitter, capped at 30 seconds. The `Retry-After` header is respected when present.

The maximum number of retries defaults to 3 and can be configured via `maxRetries` in the client config.

---

## Framework Integration Guides

Each integration provides a `createSessionHandler` that wraps `client.getSession()` in a framework-native route handler, plus a `createQuerriClient` factory for direct SDK access.

### SvelteKit

#### Install

```bash
npm install @querri-inc/embed
```

#### Server Route: `src/routes/api/querri-session/+server.ts`

```typescript
import { createSessionHandler } from '@querri-inc/embed/server/sveltekit';

export const POST = createSessionHandler({
  resolveParams: async ({ locals }) => {
    // `locals` comes from your SvelteKit auth hook
    const user = locals.user as { id: string; email: string };
    return {
      user: { external_id: user.id, email: user.email },
      access: {
        sources: ['src_sales'],
        filters: { tenant_id: user.id },
      },
    };
  },
});
```

If you omit `resolveParams`, the handler reads the request body as `GetSessionParams` directly.

#### Client Component: `src/routes/+page.svelte`

```svelte
<script>
  import { QuerriEmbed } from '@querri-inc/embed/svelte';

  const auth = {
    fetchSessionToken: async () => {
      const res = await fetch('/api/querri-session', { method: 'POST' });
      const { session_token } = await res.json();
      return session_token;
    },
  };
</script>

<div style="width: 100%; height: 600px">
  <QuerriEmbed
    serverUrl="https://app.querri.com"
    {auth}
    startView="/dashboard/your-dashboard-uuid"
    on:ready={() => console.log('Loaded')}
    on:error={(e) => console.error(e.detail.code, e.detail.detail)}
  />
</div>
```

Svelte hands each payload over as the event's `detail`: in `on:error`, `e.detail` is the `QuerriErrorEvent` (`code`, `message`, …), so the error's own `detail` — the `{ status, code?, permission?, reason? }` of a refused `sessionEndpoint` request — is `e.detail.detail`. `QuerriErrorEvent`, `QuerriErrorDetail` and `QuerriErrorCode` are exported from `@querri-inc/embed/svelte`.

#### How It Works

1. The Svelte component calls `fetchSessionToken()` when the embed initializes.
2. The fetch hits your `+server.ts` POST handler.
3. `createSessionHandler` resolves the user from your auth system, sets up access policies, and creates a session token via the Querri API.
4. The session token is returned to the client and used to authenticate the iframe.

#### Direct Client Access

For server-side logic beyond session creation (e.g., in `+page.server.ts` load functions):

```typescript
// src/lib/server/querri.ts
import { createQuerriClient } from '@querri-inc/embed/server/sveltekit';
export const querri = createQuerriClient();
```

---

### Next.js

#### Server Route: `app/api/querri-session/route.ts`

```typescript
import { createSessionHandler } from '@querri-inc/embed/server/nextjs';
import { getServerSession } from 'next-auth'; // or your auth library

export const POST = createSessionHandler({
  resolveParams: async (req) => {
    const session = await getServerSession();
    return {
      user: {
        external_id: session!.user!.id,
        email: session!.user!.email!,
      },
      access: {
        sources: ['src_sales'],
        filters: { tenant_id: session!.user!.id },
      },
    };
  },
});
```

#### Client Component: `app/dashboard/page.tsx`

```tsx
'use client';

import { useMemo } from 'react';
import { QuerriEmbed } from '@querri-inc/embed/react';

export default function DashboardPage() {
  const auth = useMemo(() => ({
    fetchSessionToken: async () => {
      const res = await fetch('/api/querri-session', { method: 'POST' });
      const { session_token } = await res.json();
      return session_token;
    },
  }), []);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <QuerriEmbed
        serverUrl="https://app.querri.com"
        auth={auth}
        startView="/dashboard/your-dashboard-uuid"
        onReady={() => console.log('Loaded')}
        onError={(err) => console.error(err)}
      />
    </div>
  );
}
```

#### How It Works

1. The React component's `fetchSessionToken` is called when the embed mounts.
2. The POST request hits your App Router route handler.
3. `createSessionHandler` resolves the authenticated user via your auth library, creates/reuses access policies, and returns a session token.
4. The embed uses the token to authenticate the iframe connection.

#### Direct Client Access

```typescript
// lib/querri.ts
import { createQuerriClient } from '@querri-inc/embed/server/nextjs';
export const querri = createQuerriClient();
```

---

### React Router

React Router v7 (the Remix successor) supports framework-native "resource routes" — route files that export `action`/`loader` without a default component, serving as API endpoints.

#### Server Route: `app/routes/api.querri-session.ts`

```typescript
import { createSessionHandler } from '@querri-inc/embed/server/react-router';

export const action = createSessionHandler({
  resolveParams: async ({ request, context }) => {
    // `context` comes from your server adapter's getLoadContext()
    const user = (context as any).user;
    return {
      user: { external_id: user.id, email: user.email },
      access: {
        sources: ['src_sales'],
        filters: { tenant_id: user.id },
      },
    };
  },
});
```

If you omit `resolveParams`, the handler reads the request body as `GetSessionParams` directly.

> **Tip:** The legacy alias `createSessionAction` also works but `createSessionHandler` is the standard name across all framework integrations.

#### Client Component: `app/routes/_index.tsx`

```tsx
import { useMemo } from 'react';
import { QuerriEmbed } from '@querri-inc/embed/react';

export default function DashboardPage() {
  const auth = useMemo(() => ({
    fetchSessionToken: async () => {
      const res = await fetch('/api/querri-session', { method: 'POST' });
      const { session_token } = await res.json();
      return session_token;
    },
  }), []);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <QuerriEmbed
        serverUrl="https://app.querri.com"
        auth={auth}
        startView="/dashboard/your-dashboard-uuid"
        onReady={() => console.log('Loaded')}
        onError={(err) => console.error(err)}
      />
    </div>
  );
}
```

#### How It Works

1. The React component's `fetchSessionToken` is called when the embed mounts.
2. The POST request hits your resource route's `action` function.
3. `createSessionHandler` resolves the authenticated user, creates/reuses access policies, and returns a session token.
4. The embed uses the token to authenticate the iframe connection.

#### Direct Client Access

For server-side logic in loaders or actions beyond session creation:

```typescript
// app/lib/querri.server.ts
import { createQuerriClient } from '@querri-inc/embed/server/react-router';
export const querri = createQuerriClient();
```

---

### Nuxt

#### Server Route: `server/api/querri-session.post.ts`

The simplest setup is a one-liner using `createSessionHandler`:

```typescript
// server/api/querri-session.post.ts
import { createSessionHandler } from '@querri-inc/embed/server/nuxt';
export default createSessionHandler();
```

With custom param resolution:

```typescript
// server/api/querri-session.post.ts
import { createSessionHandler } from '@querri-inc/embed/server/nuxt';
// Your own server-side auth, e.g. a lookup of the session cookie in `headers.cookie`.
import { getCurrentUser } from '~/server/utils/auth';

export default createSessionHandler({
  // Who the user is comes from YOUR auth — never from the request body.
  resolveParams: async ({ headers }) => {
    const user = await getCurrentUser(headers);
    return { user: { external_id: user.id, email: user.email } };
  },
});
```

For developers who need more control, `defineQuerriSessionHandler` is the manual alternative -- you wrap it yourself with `defineEventHandler`, and can read the user your own auth middleware put on `event.context`:

```typescript
// server/api/querri-session.post.ts
import { defineQuerriSessionHandler } from '@querri-inc/embed/server/nuxt';
import type { GetSessionParams } from '@querri-inc/embed/server';

// Set by your auth middleware (e.g. server/middleware/auth.ts) — your app's shape.
interface AppUser { id: string; email: string; tenantId: string }

const handler = defineQuerriSessionHandler({
  // `body` is whatever the event handler passes below: here, the signed-in user.
  resolveParams: async ({ body }): Promise<GetSessionParams> => {
    const user = body as AppUser;
    return {
      user: { external_id: user.id, email: user.email },
      access: {
        sources: ['src_sales'],
        filters: { tenant_id: user.tenantId },
      },
    };
  },
});

export default defineEventHandler(async (event) => {
  const user = event.context.user as AppUser | undefined;
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in first' });
  // Pass the user from YOUR auth, never the request body.
  return handler({ body: user, headers: getHeaders(event) });
});
```

Both handlers answer a Querri refusal with Querri's status and `{ error, code, permission?, reason?, doc_url? }` (as h3's error `data`). `defineQuerriSessionHandler` needs `h3` for that (pass `{ h3 }` if it can't be auto-imported); without it, it rethrows the `APIError`.

#### Client Component: `pages/dashboard.vue`

```vue
<template>
  <div style="width: 100%; height: 600px">
    <QuerriEmbed
      server-url="https://app.querri.com"
      :auth="auth"
      start-view="/dashboard/your-dashboard-uuid"
      @ready="onReady"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { QuerriEmbed } from '@querri-inc/embed/vue';

const auth = {
  fetchSessionToken: async () => {
    // No body: the server works out who is signed in from its own auth.
    const res = await $fetch('/api/querri-session', { method: 'POST' });
    return res.session_token;
  },
};

function onReady() { console.log('Loaded'); }
function onError(err) { console.error(err); }
</script>
```

#### How It Works

1. The Vue component calls `fetchSessionToken()` at mount time.
2. Nuxt's `$fetch` sends a POST to `/api/querri-session`.
3. `createSessionHandler` identifies the user from your server's auth, resolves access, and returns a session token.
4. The token is passed to the embed iframe for authentication.

#### Direct Client Access

```typescript
// server/utils/querri.ts
import { createQuerriClient } from '@querri-inc/embed/server/nuxt';
export const querri = createQuerriClient();
```

---

### Angular / Express

Angular applications typically use Express for server-side rendering. The integration provides Express-compatible middleware that also works with any Express-based server (see the `express-embed` example for a vanilla JS + Express setup).

#### Server: `server.ts`

```typescript
import express from 'express';
import { createSessionHandler } from '@querri-inc/embed/server/express';

const app = express();
app.use(express.json());

// Your own server-side auth: who is signed in on this request (for example
// the user Passport put on `req.user`, or a lookup of your session cookie).
import { getCurrentUser } from './auth';

app.post('/api/querri-session', createSessionHandler({
  resolveParams: async (req) => {
    // Identity, access and role come from YOUR auth — never from req.body.
    const user = await getCurrentUser(req);
    return {
      user: {
        external_id: user.id,
        email: user.email,
      },
      access: {
        sources: ['src_sales'],
        filters: { tenant_id: user.tenantId },
      },
    };
  },
}));
```

> **Note:** For Angular SSR projects, you can also import from `@querri-inc/embed/server/angular` (same module):
>
> ```typescript
> import { createSessionHandler } from '@querri-inc/embed/server/angular';
> ```

#### Client Component: `src/app/dashboard/dashboard.component.ts`

```typescript
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QuerriEmbedComponent, type QuerriAuth } from '@querri-inc/embed/angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [QuerriEmbedComponent],
  template: `
    <div style="width: 100%; height: 600px">
      <querri-embed
        [serverUrl]="'https://app.querri.com'"
        [auth]="auth"
        [startView]="'/dashboard/your-dashboard-uuid'"
        (ready)="onReady()"
        (error)="onError($event)"
      />
    </div>
  `,
})
export class DashboardComponent {
  auth: QuerriAuth;

  constructor(private http: HttpClient) {
    this.auth = {
      fetchSessionToken: async () => {
        // No body: the server identifies the user from its own auth.
        const res = await fetch('/api/querri-session', { method: 'POST' });
        const data = await res.json();
        return data.session_token;
      },
    };
  }

  onReady() { console.log('Loaded'); }
  onError(err: any) { console.error(err); }
}
```

#### How It Works

1. The Angular component's `fetchSessionToken` callback fires when the embed initializes.
2. The POST request hits the Express middleware created by `createSessionHandler`.
3. The middleware resolves the user, manages access policies, and returns a session token as JSON.
4. The embed component authenticates the iframe with the returned token.

#### Direct Client Access

```typescript
// src/app/querri.service.ts
import { createQuerriClient } from '@querri-inc/embed/server/angular';
const querri = createQuerriClient();
```

---

### Vue + Vite (Standalone)

For Vue 3 apps without Nuxt, use the `Querri` client directly in a standalone Express server and the Vue component on the client.

#### Server: `server.js`

```javascript
import express from 'express';
import { Querri, APIError } from '@querri-inc/embed/server';

const app = express();
app.use(express.json());

const client = new Querri({
  apiKey: process.env.QUERRI_API_KEY,
  orgId: process.env.QUERRI_ORG_ID,
});

app.post('/api/querri-session', async (req, res) => {
  try {
    // Derive user, access and role from YOUR auth — never from req.body.
    const me = await getUserFromYourAuth(req);
    const session = await client.getSession({
      user: { external_id: me.id, email: me.email },
      role: me.querriRole, // optional Custom Role id or key
    });
    res.json(session);
  } catch (err) {
    console.error('Session error:', err);
    if (err instanceof APIError) {
      res.status(err.status).json({
        error: err.message,
        code: err.code,
        permission: err.permission,
        reason: err.reason,
      });
    } else {
      // Don't leak internal error text to the browser.
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.listen(3001, () => console.log('API server running on http://localhost:3001'));
```

#### Client Component: `src/App.vue`

```vue
<template>
  <div style="width: 100%; height: 600px">
    <QuerriEmbed
      server-url="https://app.querri.com"
      :auth="auth"
      @ready="onReady"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { QuerriEmbed } from '@querri-inc/embed/vue';

const auth = {
  fetchSessionToken: async () => {
    // No body: the server identifies the user from its own auth.
    const res = await fetch('/api/querri-session', { method: 'POST' });
    const data = await res.json();
    return data.session_token;
  },
};

function onReady() { console.log('Loaded'); }
function onError(err: any) { console.error(err); }
</script>
```

#### How It Works

1. The Vue component calls `fetchSessionToken()` at mount time.
2. The POST request hits the Express server's `/api/querri-session` endpoint.
3. The Express server uses the `Querri` client to create a session and returns the token.
4. The embed component authenticates the iframe with the returned token.

#### Vite Proxy

In development, Vite proxies `/api` requests to the Express server:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```
