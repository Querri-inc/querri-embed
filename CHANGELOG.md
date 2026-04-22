# Changelog

All notable changes to `@querri-inc/embed` are documented in this file. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Prior to `1.0.0`, minor version bumps may contain breaking changes.

## [0.2.0] — 2026-04-22

### Breaking Changes

- **`DataResource` method names** now match the CRUD verbs used by every
  sibling resource (`users`, `projects`, `policies`):
  - `sources()` → `list()`
  - `source(id)` → `retrieve(id)`
  - `createSource(params)` → `create(params)`
  - `deleteSource(id)` → `del(id)`
  - `replaceData(id, params)` → `replaceRows(id, params)` (parity with `appendRows`)
  - `sourceData(id, params)` → `getSourceData(id, params)` (parity with `getStepData`)

  `query()` and `appendRows()` keep their names.

### Fixed

- **SSE decoder** (`src/server/streaming/sse-decoder.ts`): events whose
  lines spanned chunk boundaries — or whose terminating blank line arrived
  in a later chunk — were being silently dropped because `currentEvent`
  was re-declared on every read. The flush path also only handled
  `data:` and dropped any trailing `event:` / `id:` / `retry:` fields.
  Both bugs are now fixed; `currentEvent` persists across the read loop
  and a shared `appendLine` helper is used by both the main loop and the
  flush path.
- **Missing type imports** for `ChatDeleteResponse`, `ProjectDeleteResponse`,
  and `DashboardDeleteResponse` — `del()` return types were unresolved in
  `tsc --noEmit` even though the types existed in `types.ts`.
- **`maxRetries` JSDoc** now matches the runtime default of `3`.
- **Angular type re-exports**: `QuerriSessionEndpointAuth` and
  `QuerriErrorCode` are now re-exported from `@querri-inc/embed/angular`.
- **`QuerriEmbed.version`** now reports the actual package version at
  runtime. Previously the shipped bundle reported `'0.0.0-test'` because
  the test placeholder escaped the version-bump regex.

### Changed

- **`share*` APIs** migrated to a params-object signature
  (`shareProject(projectId, { user_id, permission, expires_at })`), a
  `SharePermission` type alias is now exported, and `revoke*Share` / `del()`
  return types are unified across resources.
- **Nuxt integration**: the previous dual-handler surface was collapsed
  into a single typed handler; h3's `any`/`Function` types replaced with
  a proper `H3Module` interface; origin-fallback logic extracted.
- **`HttpClient.buildUrl`** rewritten to construct the URL once;
  `APIConnectionError` now carries a proper `Error.cause` chain.
- **Core embed `_init`**: validation, mode selection, and per-mode event
  dispatch are now consolidated through a `classifyAuth` helper and an
  `_authStrategy` object — fixing the three `var self` declarations and
  collapsing duplicate send-init branches in the message listener.
- **`raiseForStatus` → `throwForStatus`** in `src/server/errors.ts` so the
  verb matches the rest of the TypeScript codebase. Internal symbol only
  (not re-exported from `src/server/index.ts`).
- **Server integration sweep**: dropped unused imports, inverted the
  express/angular shim, tagged back-compat aliases `@deprecated`.

### Added

- Direct tests for the `sse-decoder` (10 cases: multi-line data, comments,
  `event`/`id`/`retry` handling, chunk-boundary reassembly).
- Pure-function tests for `normalizePage` (6 cases covering the public,
  internal-keyed, bare-array, and empty-envelope paths).
- `asUser()` wiring test asserting the outgoing request carries
  `X-Embed-Session` (and omits `Authorization: Bearer qk_*`).
- Path/method smoke tests for all ten server resources (`audit`, `chats`,
  `dashboards`, `data`, `files`, `keys`, `projects`, `sharing`, `sources`,
  `usage`) — 58 new tests, covering every public method's URL shape and
  HTTP verb.

### Internal

- `tests/rls-integration.test.ts` renamed to `tests/rls-integration.script.ts`
  to reflect that it's a tsx-run integration script, not a vitest test.
  Hardcoded localhost API key and absolute `RLS_TEST_CSV_PATH` removed in
  favour of `requireEnv`.
- `.desloppify/` state directory now `.gitignore`d.
- Vitest no longer logs happy-dom's `Iframe page loading is disabled`
  noise during iframe-creating tests.

---

For releases prior to `0.2.0`, see the git log.
