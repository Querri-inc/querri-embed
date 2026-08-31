# Migrating to @querri-inc/embed 1.0.0

`0.x → 1.0.0` is a breaking release. It also unifies this package with the
asset your Querri deployment serves at `/sdk/querri-embed.js` — from 1.0.0 the
served file **is** this package's build, so the npm module and the script tag
behave identically.

## Timeout

| 0.x | 1.0.0 |
|---|---|
| `timeout: 15000` default; terminal error | `readyTimeout: 30000` default; error is `recoverable: true`; a late `ready` emits `recovered` |
| `timeout: 0` → fell back to 15s | `readyTimeout: 0` → disables the warning |

```diff
- QuerriEmbed.create(el, { serverUrl, auth, timeout: 20000 });
+ QuerriEmbed.create(el, { serverUrl, auth, readyTimeout: 20000 });
```
Treat `timeout` errors as warnings: pair them with the `recovered` event.

## sendPrompt

```diff
- instance.sendPrompt('hi');                 // void; failures were error events
+ const { ok, message } = await instance.sendPrompt('hi');
```

## startView default

Unset `startView` used to force `'/home'`; it now opens the runtime's default
view (the chat launcher — same thing today, but no longer forced by the SDK).
Pass `startView: '/home'` explicitly if you depended on the old behaviour.

## Config vocabulary (v2)

Your existing v1 keys (`sidebar.*`, `chat.connectData`, …) **keep working** —
the runtime translates them. But:

- `chrome.chat.skills` and `theme.scheme` are **gone** (they were dead on the
  runtime already). Use `theme.name: 'querri' | 'querri-dark' | 'night'`.
- `chrome.chat.connectData` maps to a rail item — it does nothing unless the
  rail is shown (`chrome: { rail: { show: true } }`).
- Legacy `chrome.header.*` action keys default **false** (docs used to say
  true) and only reach share-key embeds' legacy chat page.
- Listen to the new `config` event: `changes.dropped` names every key the
  runtime ignored, so a typo can't fail silently anymore.

New typings for the whole v2 vocabulary are generated from the runtime's own
schema — `QuerriChromeConfig` now covers `rail`, `global`, `library`,
`projects`, `dashboard`, `xls`, `print`, `settings` as well.

## Framework wrappers

`chrome`/`theme`/`privacy`/`locale` prop changes now call `updateConfig`
instead of destroying and recreating the iframe (no more full reload and
re-auth on a style tweak). `serverUrl`/`auth`/`startView` changes still
remount. Changing `readyTimeout` after mount is a no-op by design.

`updateConfig` **replaces** the customer config — always pass the whole
object, not a patch.

## Server SDK

- `client.data.*` now calls `/sources/*` (the `/data/*` routes were removed
  server-side; these methods were returning 404). `data.query({ source_id,
  sql })` → `data.query(params)` with `source_id` in the params still works —
  it is sent in the path now.
- `sources.create` takes `{ name, rows }` (the connector-based shape 422s).
- `client.asUser(session)` targets the public `/api/v1` API and its
  `dashboards` surface is read-only (embed sessions cannot write dashboards).

## Versions below 1.0.0

`npm deprecate` marks all `<1.0.0` versions: they speak the pre-v2 protocol,
mis-time the ready budget, and (0.2.1 specifically) collide with a different
served asset of the same version string.
