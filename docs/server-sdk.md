# Querri Server SDK Reference

The Querri server SDK is included in the `@querri-inc/embed` package. It provides a fully typed Node.js client for the Querri API, covering user management, embed session creation, access policies, projects, dashboards, chat streaming, and more.

```bash
npm install @querri-inc/embed
```

```typescript
import { Querri } from '@querri-inc/embed/server';
```

## Quick Start

### Create a session token (the #1 use case)

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

### Framework one-liners

Every framework integration exports `createSessionHandler` for a consistent API:

| Framework | Import | Server File | Code |
|-----------|--------|------------|------|
| Next.js | `@querri-inc/embed/server/nextjs` | `app/api/querri-session/route.ts` | `export const POST = createSessionHandler()` |
| SvelteKit | `@querri-inc/embed/server/sveltekit` | `src/routes/api/querri-session/+server.ts` | `export const POST = createSessionHandler()` |
| React Router v7 | `@querri-inc/embed/server/react-router` | `app/routes/api.querri-session.ts` | `export const action = createSessionHandler()` |
| Nuxt | `@querri-inc/embed/server/nuxt` | `server/api/querri-session.post.ts` | `export default createNuxtSessionHandler()` |
| Express | `@querri-inc/embed/server/express` | `server.ts` | `app.post('/path', createSessionHandler())` |

Set `QUERRI_API_KEY` and `QUERRI_ORG_ID` environment variables. All handlers read from env automatically.

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
- [Pagination](#pagination)
- [Streaming](#streaming)
- [Error Handling](#error-handling)
- [Framework Integration Guides](#framework-integration-guides)
  - [SvelteKit](#sveltekit)
  - [Next.js](#nextjs)
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
| `QUERRI_HOST` | `host` | API host URL |

Resolution order: explicit config value > environment variable > default value.

---

## Resource API Reference

### Users

Manage users in your organization.

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
  role: 'viewer',
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

#### `client.embed.refreshSession(sessionToken)`

Refresh an existing session token, extending its lifetime.

```typescript
refreshSession(sessionToken: string): Promise<EmbedSession>
```

```typescript
const refreshed = await client.embed.refreshSession('sess_token_...');
```

#### `client.embed.listSessions(limit?)`

List active embed sessions.

```typescript
listSessions(limit?: number): Promise<EmbedSessionList>
```

```typescript
const sessions = await client.embed.listSessions(50);
// { data: [...], count: 12 }
```

#### `client.embed.revokeSession(sessionId)`

Revoke (invalidate) an embed session.

```typescript
revokeSession(sessionId: string): Promise<EmbedSessionRevokeResponse>
```

```typescript
const result = await client.embed.revokeSession('sess_abc');
// { session_id: 'sess_abc', revoked: true }
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

List all policies. Optionally filter by name.

```typescript
list(params?: { name?: string }): Promise<Policy[]>
```

```typescript
const policies = await client.policies.list();
const specific = await client.policies.list({ name: 'acme-corp-policy' });
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

#### `client.policies.resolve(userId, sourceId)`

Resolve the effective access for a user on a specific data source, taking all assigned policies into account.

```typescript
resolve(userId: string, sourceId: string): Promise<ResolvedAccess>
```

```typescript
const access = await client.policies.resolve('user_1', 'src_1');
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

List projects with cursor-based pagination.

```typescript
list(params?: { limit?: number; after?: string }): Promise<CursorPage<Project>>
```

```typescript
for await (const project of client.projects.list()) {
  console.log(project.name);
}
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

#### `client.chats.list(projectId, limit?)`

List chats within a project.

```typescript
list(projectId: string, limit?: number): Promise<Chat[]>
```

```typescript
const chats = await client.chats.list('proj_abc', 10);
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

List all dashboards.

```typescript
list(params?: { limit?: number; after?: string }): Promise<Dashboard[]>
```

```typescript
const dashboards = await client.dashboards.list();
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

Query data sources directly.

#### `client.data.sources()`

List all available data sources.

```typescript
sources(): Promise<DataSource[]>
```

```typescript
const sources = await client.data.sources();
// [{ id, name, columns, row_count, updated_at }]
```

#### `client.data.source(sourceId)`

Fetch metadata for a single data source.

```typescript
source(sourceId: string): Promise<DataSource>
```

```typescript
const src = await client.data.source('src_1');
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

#### `client.data.sourceData(sourceId, params?)`

Fetch raw data from a source with pagination.

```typescript
sourceData(
  sourceId: string,
  params?: { page?: number; page_size?: number },
): Promise<DataPage>
```

```typescript
const page = await client.data.sourceData('src_1', { page: 1, page_size: 50 });
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

#### `client.files.list()`

List all files.

```typescript
list(): Promise<FileObject[]>
```

```typescript
const files = await client.files.list();
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

#### `client.sources.listConnectors()`

List available connector types (e.g., PostgreSQL, BigQuery, CSV).

```typescript
listConnectors(): Promise<Record<string, unknown>[]>
```

```typescript
const connectors = await client.sources.listConnectors();
```

#### `client.sources.create(params)`

Create a new data source connection.

```typescript
create(params: SourceCreateParams): Promise<Source>
```

```typescript
const source = await client.sources.create({
  name: 'Production DB',
  connector_id: 'postgres',
  config: { host: 'db.example.com', port: 5432, database: 'analytics' },
});
```

#### `client.sources.list()`

List all configured sources.

```typescript
list(): Promise<Source[]>
```

```typescript
const sources = await client.sources.list();
```

#### `client.sources.update(sourceId, params)`

Update a source's name or configuration.

```typescript
update(sourceId: string, params: SourceUpdateParams): Promise<Source>
```

```typescript
await client.sources.update('src_1', { name: 'Production DB (v2)' });
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
  scopes: ['read:data', 'write:projects'],
  expires_in_days: 90,
});
console.log(key.secret); // Only available at creation time
```

#### `client.keys.retrieve(keyId)`

Fetch API key metadata (the secret is not returned).

```typescript
retrieve(keyId: string): Promise<ApiKey>
```

```typescript
const key = await client.keys.retrieve('key_abc');
```

#### `client.keys.list()`

List all API keys.

```typescript
list(): Promise<ApiKey[]>
```

```typescript
const keys = await client.keys.list();
```

#### `client.keys.del(keyId)`

Revoke and delete an API key.

```typescript
del(keyId: string): Promise<Record<string, unknown>>
```

```typescript
await client.keys.del('key_abc');
```

---

### Sharing

Share projects and dashboards with users.

#### `client.sharing.shareProject(projectId, userId, permission?)`

Share a project with a user. Default permission is `'view'`.

```typescript
shareProject(projectId: string, userId: string, permission?: string): Promise<ShareEntry>
```

```typescript
await client.sharing.shareProject('proj_abc', 'user_1', 'edit');
```

#### `client.sharing.revokeProjectShare(projectId, userId)`

Revoke a user's access to a project.

```typescript
revokeProjectShare(projectId: string, userId: string): Promise<Record<string, unknown>>
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

#### `client.sharing.shareDashboard(dashboardId, userId, permission?)`

Share a dashboard with a user. Default permission is `'view'`.

```typescript
shareDashboard(dashboardId: string, userId: string, permission?: string): Promise<ShareEntry>
```

```typescript
await client.sharing.shareDashboard('dash_abc', 'user_1');
```

#### `client.sharing.revokeDashboardShare(dashboardId, userId)`

Revoke a user's access to a dashboard.

```typescript
revokeDashboardShare(dashboardId: string, userId: string): Promise<Record<string, unknown>>
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

---

### Audit

Query the audit log.

#### `client.audit.list(params?)`

List audit events with optional filters.

```typescript
list(params?: AuditListParams): Promise<AuditEvent[]>
```

```typescript
const events = await client.audit.list({
  action: 'project.run',
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  page_size: 50,
});
```

`AuditListParams` fields: `actor_id`, `target_id`, `action`, `start_date`, `end_date`, `page`, `page_size`.

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
2. Access Policy Setup   -->  policies.create() + policies.assignUsers()
3. Session Creation      -->  embed.createSession()
```

### Basic Usage

```typescript
const { session_token, expires_in, user_id, external_id } = await client.getSession({
  user: 'usr_alice',
  access: {
    sources: ['src_sales'],
    filters: { tenant_id: 'acme' },
  },
  ttl: 3600,
  origin: 'https://myapp.com',
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
}
```

> **Shorthand:** `user: 'ext_123'` is equivalent to `user: { external_id: 'ext_123' }`. See [User Resolution](#user-resolution) below.

### Return Value

```typescript
interface GetSessionResult {
  session_token: string;    // Pass this to the embed component's fetchSessionToken
  expires_in: number;       // Seconds until the token expires
  user_id: string;          // Querri internal user ID
  external_id: string | null;  // Your external ID for the user
}
```

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
    role: 'viewer',
  },
});
```

In both cases, if the user already exists, they are returned as-is (the profile fields are used at creation time).

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
│   ├── ValidationError         — 400 Bad Request
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
| `requestId` | `string \| undefined` | Request ID for support |
| `body` | `unknown` | Raw response body |
| `headers` | `Headers` | Response headers |

### Common Patterns

```typescript
import {
  Querri,
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '@querri-inc/embed/server';

try {
  const user = await client.users.retrieve('user_nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('User not found');
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

Each integration provides a `createSessionHandler` (or equivalent) that wraps `client.getSession()` in a framework-native route handler, plus a `createQuerriClient` factory for direct SDK access.

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
    startView="/builder/dashboard/your-dashboard-uuid"
    on:ready={() => console.log('Loaded')}
    on:error={(e) => console.error(e.detail)}
  />
</div>
```

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
        startView="/builder/dashboard/your-dashboard-uuid"
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
import { createSessionAction } from '@querri-inc/embed/server/react-router';

export const action = createSessionAction({
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

> **Tip:** `createSessionAction` is the framework-idiomatic name for React Router. The alias `createSessionHandler` also works for consistency with other framework integrations.

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
        startView="/builder/dashboard/your-dashboard-uuid"
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
3. `createSessionAction` resolves the authenticated user, creates/reuses access policies, and returns a session token.
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

The simplest setup is a one-liner using `createNuxtSessionHandler`:

```typescript
// server/api/querri-session.post.ts
import { createNuxtSessionHandler } from '@querri-inc/embed/server/nuxt';
export default createNuxtSessionHandler();
```

With custom param resolution:

```typescript
export default createNuxtSessionHandler({
  resolveParams: async ({ body, headers }) => ({
    user: { external_id: body.userId, email: body.email },
  }),
});
```

For developers who need more control, `defineQuerriSessionHandler` is the manual alternative -- you wrap it yourself with `defineEventHandler` and `readBody`:

```typescript
import { defineQuerriSessionHandler } from '@querri-inc/embed/server/nuxt';

const handler = defineQuerriSessionHandler({
  resolveParams: async ({ body, headers }) => ({
    user: {
      external_id: (body as any).userId,
      email: (body as any).email,
    },
    access: {
      sources: ['src_sales'],
      filters: { tenant_id: (body as any).userId },
    },
  }),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const headers = getHeaders(event);
  return handler({ body, headers });
});
```

#### Client Component: `pages/dashboard.vue`

```vue
<template>
  <div style="width: 100%; height: 600px">
    <QuerriEmbed
      server-url="https://app.querri.com"
      :auth="auth"
      start-view="/builder/dashboard/your-dashboard-uuid"
      @ready="onReady"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { QuerriEmbed } from '@querri-inc/embed/vue';

const auth = {
  fetchSessionToken: async () => {
    const res = await $fetch('/api/querri-session', {
      method: 'POST',
      body: { userId: 'usr_alice', email: 'alice@example.com' },
    });
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
3. `createNuxtSessionHandler` processes the body, resolves access, and returns a session token.
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

app.post('/api/querri-session', createSessionHandler({
  resolveParams: async (req) => {
    // Extract user info from your auth middleware (e.g., req.headers.authorization)
    return {
      user: {
        external_id: req.body.userId,
        email: req.body.email,
      },
      access: {
        sources: ['src_sales'],
        filters: { tenant_id: req.body.userId },
      },
    };
  },
}));
```

> **Note:** For Angular SSR projects, you can also import from `@querri-inc/embed/server/angular` (same module):
>
> ```typescript
> import { createQuerriMiddleware } from '@querri-inc/embed/server/angular';
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
        [startView]="'/builder/dashboard/your-dashboard-uuid'"
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
        const res = await fetch('/api/querri-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'usr_alice', email: 'alice@example.com' }),
        });
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
2. The POST request hits the Express middleware created by `createQuerriMiddleware`.
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
import { Querri } from '@querri-inc/embed/server';

const app = express();
app.use(express.json());

const client = new Querri({
  apiKey: process.env.QUERRI_API_KEY,
  orgId: process.env.QUERRI_ORG_ID,
});

app.post('/api/querri-session', async (req, res) => {
  try {
    const session = await client.getSession(req.body);
    res.json(session);
  } catch (err) {
    console.error('Session error:', err);
    res.status(err.status ?? 500).json({ error: err.message });
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
    const res = await fetch('/api/querri-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'usr_alice', email: 'alice@example.com' }),
    });
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
