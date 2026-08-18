# Sweet Cookie 🍪 — Browser cookies, without the native-addon crumbs

[![CI](https://img.shields.io/github/actions/workflow/status/hraness/sweet-cookie/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/hraness/sweet-cookie/actions/workflows/ci.yml)
[![npm upstream](https://img.shields.io/npm/v/@steipete/sweet-cookie?style=flat-square&label=npm%20upstream)](https://www.npmjs.com/package/@steipete/sweet-cookie)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/hraness/sweet-cookie?style=flat-square)](packages/core/LICENSE)

Sweet Cookie is a TypeScript library and CLI for reading cookies from inline payloads or local Chrome, Edge, Firefox, and Safari profiles. It is for local Node.js and Bun tools that need HTTP headers or browser-compatible cookie objects without native Node addons.

## Install

Install the exact Hraness Git source release:

```bash
npm install github:hraness/sweet-cookie#v0.4.2
```

Then run the CLI through the local package:

```bash
./node_modules/.bin/sweet-cookie --help
```

The immutable upstream npm package remains at `@steipete/sweet-cookie@0.4.1`. It predates the
Hraness safety fixes in v0.4.2 and is not the same source artifact.

Node.js 22 or newer is required. The library also supports Bun through `bun:sqlite`.

```console
$ ./node_modules/.bin/sweet-cookie example.com --inline-json \
  '[{"name":"session","value":"demo","domain":"example.com","path":"/"}]' --format header
Cookie: session=demo
```

## Quick start

Inline cookies are deterministic and work on every supported platform. Sweet Cookie filters them to the requested URL and returns before reading local browser databases.

```ts
import { getCookies, toCookieHeader } from "@steipete/sweet-cookie";

const { cookies } = await getCookies({
	url: "https://example.com/",
	inlineCookiesJson: '[{"name":"session","value":"demo","domain":"example.com"}]',
});

console.log(toCookieHeader(cookies)); // session=demo
```

For a local browser profile, omit the inline payload and choose one or more backends:

```ts
import { getCookies } from "@steipete/sweet-cookie";

const { cookies, warnings } = await getCookies({
	url: "https://example.com/",
	names: ["session", "csrf"],
	browsers: ["chrome", "firefox"],
});

for (const warning of warnings) console.warn(warning);
```

## Sources and browser support

Sweet Cookie checks inline JSON, base64, or file inputs first. The first inline source that yields cookies wins; otherwise, local browser backends run in order and either merge results or return the first successful result.

| Source            | macOS | Windows | Linux |
| ----------------- | ----- | ------- | ----- |
| Inline payload    | ✓     | ✓       | ✓     |
| Chrome / Chromium | ✓     | ✓       | ✓     |
| Edge              | ✓     | ✓       | ✓     |
| Firefox           | ✓     | ✓       | ✓     |
| Safari            | ✓     | —       | —     |

Local reads copy browser databases before querying them with `node:sqlite` or `bun:sqlite`. Platform decryption uses the macOS Keychain, Windows DPAPI, or Linux keyring tools with bounded helper timeouts. Failures that do not invalidate the whole result are returned in `warnings`, without raw cookie values.

See the [usage guide](docs/usage.md) for source ordering, profile selection, environment variables, and platform details.

## Profiles

Profile selectors accept a display name, profile directory, or cookie database path. Arrays read several selected profiles; `ALL_PROFILES` discovers every local profile supported by that backend.

```ts
import { ALL_PROFILES, getCookies } from "@steipete/sweet-cookie";

const { cookies } = await getCookies({
	url: "https://example.com/",
	browsers: ["chrome"],
	chromeProfile: ALL_PROFILES,
});
```

Chrome and Edge use their default profile when no selector is provided. Firefox prefers `default-release`; Safari has a cookie-file override rather than a profile selector.

## Cookie scope and isolation

Returned cookies preserve `hostOnly`: host-only cookies match exactly one hostname, while domain cookies may match subdomains. Scope is also part of deduplication, so host-only and domain cookies with the same name, normalized domain, and path remain distinct.

Sweet Cookie excludes Chromium partitioned cookies and Firefox partitioned or container-scoped cookies from local database reads because an ordinary replay cannot preserve their isolation context. Inline payloads carrying partition or container provenance are rejected with a warning for the same reason.

## Extension exporter

The Chrome Manifest V3 extension in [`apps/extension`](apps/extension) exports cookies from the current profile as JSON, base64, or a downloaded file. Use it when app-bound encryption, keychain prompts, remote execution, or another browser boundary prevents a local database read.

The extension requests host access when you export, runs only after a user action, makes no network requests, and stores no cookie values. Its payload is accepted directly through `inlineCookiesJson`, `inlineCookiesBase64`, or `inlineCookiesFile`. See the [extension and payload specification](docs/spec.md).

## Reference

- [Usage and API guide](docs/usage.md)
- [Cookie extraction and extension specification](docs/spec.md)
- [Package API types](packages/core/src/types.ts)
- [Full CLI help](docs/usage.md#cli-reference)

## Development

Repository development requires Node.js 22.13 or newer and pnpm 11.18.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm test
pnpm test:bun
```

## License

MIT. See [`packages/core/LICENSE`](packages/core/LICENSE).
