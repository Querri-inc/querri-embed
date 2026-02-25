// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** SDK client configuration. */
export interface QuerriConfig {
  /** API key in `qk_*` format. Required. */
  apiKey: string;
  /** Organization / tenant ID. Falls back to `QUERRI_ORG_ID` env var. */
  orgId?: string;
  /** API host URL. @default `'https://app.querri.com'` */
  host?: string;
  /** Request timeout in milliseconds. @default 30000 */
  timeout?: number;
  /** Max automatic retries on 429/5xx errors. @default 2 */
  maxRetries?: number;
  /** Custom `fetch` implementation (e.g. for testing or proxies). */
  fetch?: typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface CursorPageResponse<T> {
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
  total?: number;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** A Querri user. */
export interface User {
  /** Querri-internal user ID. */
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  /** User role (e.g. `'viewer'`, `'editor'`, `'admin'`). */
  role: string;
  /** Your external user ID, set via `getOrCreate()`. `null` for users created without one. */
  external_id: string | null;
  /** ISO 8601 timestamp. `null` for legacy users created before tracking was added. */
  created_at: string | null;
  /** `true` when the user was just created (returned by `getOrCreate()`). */
  created?: boolean;
}

export interface UserCreateParams {
  email: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface UserUpdateParams {
  role?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserDeleteResponse {
  id: string;
  deleted: boolean;
}

// ---------------------------------------------------------------------------
// Embed Sessions
// ---------------------------------------------------------------------------

/** An embed session token with metadata. */
export interface EmbedSession {
  /** JWT session token to pass to the embed client. */
  session_token: string;
  /** Seconds until the token expires. */
  expires_in: number;
  /** Querri user ID associated with this session, or `null` for anonymous sessions. */
  user_id: string | null;
}

export interface EmbedSessionListItem {
  session_token: string;
  user_id: string | null;
  origin: string | null;
  created_at: string | number | null;
  auth_method: string | null;
}

export interface EmbedSessionList {
  data: EmbedSessionListItem[];
  count: number;
}

export interface EmbedSessionRevokeResponse {
  session_id: string;
  revoked: boolean;
}

export interface CreateSessionParams {
  user_id: string;
  origin?: string;
  ttl?: number;
}

// ---------------------------------------------------------------------------
// Access Policies
// ---------------------------------------------------------------------------

export interface RowFilter {
  column: string;
  values: string[];
}

/** An access policy controlling which data sources and rows a user can see. */
export interface Policy {
  id: string;
  name: string;
  description: string | null;
  /** Data source IDs this policy grants access to. */
  source_ids: string[];
  /** Row-level filter rules applied when querying these sources. */
  row_filters: RowFilter[];
  /** Number of users currently assigned to this policy. */
  user_count: number;
  /** User IDs assigned to this policy. Only populated by `retrieve()`, not `list()`. */
  assigned_user_ids?: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface PolicyCreateParams {
  name: string;
  description?: string;
  source_ids?: string[];
  row_filters?: RowFilter[];
}

export interface PolicyUpdateParams {
  name?: string;
  description?: string;
  source_ids?: string[];
  row_filters?: RowFilter[];
}

export interface PolicyDeleteResponse {
  id: string;
  deleted: boolean;
}

export interface PolicyUpdateResponse {
  id: string;
  updated: boolean;
}

export interface PolicyAssignResponse {
  policy_id: string;
  assigned_user_ids: string[];
}

export interface PolicyRemoveUserResponse {
  policy_id: string;
  user_id: string;
  removed: boolean;
}

export interface ResolvedAccess {
  user_id: string;
  source_id: string;
  resolved_filters: Record<string, unknown>[];
  where_clause: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
}

export interface SourceColumns {
  source_id: string;
  source_name: string;
  columns: ColumnInfo[];
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface StepSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  order: number;
  has_data: boolean;
  has_figure: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  step_count: number | null;
  chat_count: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  steps?: StepSummary[];
}

export interface ProjectCreateParams {
  name: string;
  user_id: string;
  description?: string;
}

export interface ProjectUpdateParams {
  name?: string;
  description?: string;
}

export interface ProjectDeleteResponse {
  id: string;
  deleted: boolean;
}

export interface ProjectRunResponse {
  id: string;
  run_id: string;
  status: string;
}

export interface ProjectRunStatus {
  id: string;
  status: string;
  is_running: boolean;
}

export interface ProjectCancelResponse {
  id: string;
  cancelled: boolean;
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  role: string;
  content: string | null;
  created_at: string | null;
}

export interface Chat {
  id: string;
  project_id: string | null;
  name: string;
  message_count: number | null;
  messages?: Message[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatCreateParams {
  name?: string;
}

export interface ChatStreamParams {
  prompt: string;
  user_id: string;
  model?: string;
}

export interface ChatDeleteResponse {
  id: string;
  deleted: boolean;
}

export interface ChatCancelResponse {
  id: string;
  message_id: string;
  cancelled: boolean;
  reason: string | null;
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  widget_count: number;
  widgets?: Record<string, unknown>[];
  filters?: Record<string, unknown>[];
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DashboardCreateParams {
  name: string;
  description?: string;
}

export interface DashboardUpdateParams {
  name?: string;
  description?: string;
}

export interface DashboardUpdateResponse {
  id: string;
  updated: boolean;
}

export interface DashboardDeleteResponse {
  id: string;
  deleted: boolean;
}

export interface DashboardRefreshResponse {
  id: string;
  status: string;
  project_count: number;
}

export interface DashboardRefreshStatus {
  id: string;
  status: string;
  project_count: number | null;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface DataSource {
  id: string;
  name: string;
  columns: string[];
  row_count: number | null;
  updated_at: string | null;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  total_rows: number;
  page: number;
  page_size: number;
}

export interface QueryParams {
  sql: string;
  source_id: string;
  page?: number;
  page_size?: number;
}

export interface DataPage {
  data: Record<string, unknown>[];
  total_rows: number | null;
  page: number | null;
  page_size: number | null;
  columns: string[] | null;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileObject {
  id: string;
  name: string;
  size: number | null;
  content_type: string | null;
  created_by: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Sources & Connectors
// ---------------------------------------------------------------------------

export interface Source {
  id: string;
  name: string;
  connector_id?: string;
  config?: Record<string, unknown>;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SourceCreateParams {
  name: string;
  connector_id: string;
  config?: Record<string, unknown>;
}

export interface SourceUpdateParams {
  name?: string;
  config?: Record<string, unknown>;
}

export interface Connector {
  id: string;
  type: string;
  name: string;
  fields?: ConnectorField[];
}

export interface ConnectorField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  created_by: string | null;
  created_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  rate_limit_per_minute: number;
}

export interface ApiKeyCreateParams {
  name: string;
  scopes: string[];
  expires_in_days?: number;
  source_scope?: Record<string, unknown>;
  access_policy_ids?: string[];
  bound_user_id?: string;
  rate_limit_per_minute?: number;
  ip_allowlist?: string[];
}

export interface ApiKeyCreated extends ApiKey {
  secret: string;
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export interface ShareEntry {
  id: string;
  resource_type: string | null;
  resource_id: string | null;
  share_key: string | null;
  created_by: string | null;
  created_at: string | null;
  expires_at: string | null;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditEvent {
  id: string;
  actor_id: string;
  actor_type: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  timestamp: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditListParams {
  actor_id?: string;
  target_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export interface UsageReport {
  period_start: string | null;
  period_end: string | null;
  total_queries: number | null;
  total_tokens: number | null;
  total_projects: number | null;
  total_users: number | null;
  details: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// getSession convenience
// ---------------------------------------------------------------------------

export interface GetSessionUserParams {
  external_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface GetSessionInlineAccess {
  /** Data source IDs the user is allowed to query. */
  sources: string[];
  /**
   * Row-level filters applied to the user's data access.
   *
   * Keys are column names in your data sources (e.g., `"tenant_id"`, `"region"`).
   * A single string value means exact match; a string array means any of the values (OR).
   *
   * The SDK auto-creates and manages a named access policy from this specification.
   *
   * @example
   * ```ts
   * filters: {
   *   tenant_id: 'acme',
   *   region: ['us-east', 'us-west'],
   * }
   * ```
   */
  filters: Record<string, string | string[]>;
}

export interface GetSessionPolicyAccess {
  policy_ids: string[];
}

/**
 * Parameters for `client.getSession()`.
 *
 * The `user` field accepts a string shorthand — `'ext_123'` is equivalent
 * to `{ external_id: 'ext_123' }`.
 */
export interface GetSessionParams {
  /** External user ID (string shorthand) or full user params object. */
  user: string | GetSessionUserParams;
  /** Access policy: pass `policy_ids` for pre-created policies, or inline `sources` + `filters`. */
  access?: GetSessionPolicyAccess | GetSessionInlineAccess;
  /** Allowed origin for the embed iframe (e.g. `'https://myapp.com'`). */
  origin?: string;
  /** Session TTL in seconds. @default 3600 */
  ttl?: number;
}

export interface GetSessionResult {
  session_token: string;
  expires_in: number;
  user_id: string;
  external_id: string | null;
}
