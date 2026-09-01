# Sweet Cookie

[![CI](https://img.shields.io/github/actions/workflow/status/hraness/sweet-cookie/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/hraness/sweet-cookie/actions/workflows/ci.yml)
[![npm upstream](https://img.shields.io/npm/v/@steipete/sweet-cookie?style=flat-square&label=npm%20upstream)](https://www.npmjs.com/package/@steipete/sweet-cookie)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/hraness/sweet-cookie?style=flat-square)](packages/core/LICENSE)

## Read scoped browser cookies for a local tool

Sweet Cookie is a TypeScript library, CLI, and Chrome exporter for turning an approved cookie
source into an HTTP `Cookie:` header or a browser-compatible JSON artifact. Inline payloads work on
every supported platform. Local Chrome, Edge, Firefox, and Safari reads use built-in Node.js or Bun
SQLite support, so the package does not add a native Node addon.

The target URL, extra origins, cookie-name allowlist, source order, profile, and output format stay
explicit. Non-fatal source problems appear as warnings without raw cookie values.

> **Distribution boundary:** Install Hraness version 0.4.4 from its immutable Git source tag. The
> upstream npm artifact remains `@steipete/sweet-cookie@0.4.1`; it predates the Hraness safety fixes
> and is not the same source artifact. This repository does not publish the Hraness fork to npm.

## Smallest useful action

Install the exact Hraness Git source release. Node.js 22 or newer is required.

```bash
npm install github:hraness/sweet-cookie#v0.4.4
```

Then prove the filter and output contract with an inline payload. This command does not read a
browser database, invoke an operating-system credential helper, or make a network request.

```console
$ ./node_modules/.bin/sweet-cookie example.com --inline-json \
  '[{"name":"session","value":"demo","domain":"example.com","path":"/"}]' --format header
Cookie: session=demo
```

Inline JSON, base64, and file inputs run first. The first inline source that yields cookies returns
before any local browser backend runs.

## Choose the handoff that matches the source

| Interface          | Use it when                                                                                  | Observable result                                                           |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CLI                | A local process needs a `Cookie:` header or JSON artifact                                    | Cookie output on stdout and bounded warnings on stderr                      |
| TypeScript library | An application needs cookie objects, source control, and warnings in process                 | `{ cookies, warnings }` plus `toCookieHeader()`                             |
| Chrome exporter    | App-Bound Encryption, a remote runtime, or another browser boundary prevents a database read | User-triggered JSON, base64, or file output from the current Chrome profile |

The operator chooses the source, origin scope, cookie names, profile, and destination. Sweet Cookie
does not discover a broader authorization scope, send the output, drive a browser, or decide which
service should receive a credential.

## Inspect the CLI path

### 1. Name the target and cookie names

A bare domain becomes an HTTPS URL. Add `--origin` for a known OAuth or multi-domain flow, and
repeat `--name` to keep the exported credential set narrow.

```bash
./node_modules/.bin/sweet-cookie app.example.com \
  --origin https://accounts.example.com \
  --name session --name csrf \
  --browser chrome \
  --format header
```

### 2. Choose a browser profile when the default is wrong

Profile selectors accept a display name, profile directory, or cookie database path. Use
`ALL_PROFILES` through the library when every discovered profile is an intentional input.

```bash
./node_modules/.bin/sweet-cookie example.com \
  --browser chrome \
  --chrome-profile "Work" \
  --format json
```

### 3. Write a private JSON artifact only when another process needs one

The JSON contains complete cookie values. Create it with private permissions, pass it through a
bounded local channel, and delete it when the receiving task is complete.

```bash
(
  umask 077
  ./node_modules/.bin/sweet-cookie app.example.com \
    --name session --format json > ./sweet-cookie.cookies.json
)
```

The CLI prints provider warnings to stderr. `--debug` adds provider diagnostics, but warnings never
contain raw cookie values.

## Use the library in process

```ts
import { getCookies, toCookieHeader } from "@steipete/sweet-cookie";

const { cookies, warnings } = await getCookies({
	url: "https://app.example.com/",
	origins: ["https://accounts.example.com/"],
	names: ["session", "csrf"],
	browsers: ["chrome", "firefox"],
});

for (const warning of warnings) console.warn(warning);
const header = toCookieHeader(cookies, { dedupeByName: true });
```

`getCookies()` returns browser-compatible cookie objects with source metadata. `toCookieHeader()`
sorts valid name/value pairs and can retain the first value for each name.

## Use the Chrome exporter when a local read cannot cross the browser boundary

The Manifest V3 extension in [`apps/extension`](apps/extension) reads only the current Chrome
profile. The popup starts with the active tab URL, accepts explicit extra origins and a cookie-name
allowlist, then requests host permission when you select an export action.

It makes no network requests and stores only the extra-origin and allowlist settings. Its preview
shows names, counts, and domains with every value fully masked. Clipboard and downloaded outputs
contain complete cookie values and must be handled as credentials.

Pass an exported file back through the inline path:

```ts
const { cookies, warnings } = await getCookies({
	url: "https://app.example.com/",
	inlineCookiesFile: "/private/path/sweet-cookie.cookies.json",
});
```

## Source and custody boundaries

| Boundary                | Current behavior                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline input            | JSON, base64, then file. The first non-empty inline result wins and skips local browsers.                                                                      |
| Local browser databases | Chromium and Firefox databases are copied to a temporary snapshot before SQLite queries. Safari binary cookies are parsed directly.                            |
| Credential helpers      | macOS Keychain, Windows DPAPI, and Linux keyring helpers run locally with bounded timeouts.                                                                    |
| Extension permission    | Chrome host access is requested for the entered origins only after an export action. The extension cannot read another Chrome profile.                         |
| Extension storage       | Only extra-origin and allowlist settings persist. Exported cookie values do not.                                                                               |
| Output                  | CLI stdout, clipboard content, and downloaded JSON contain live credential values. Sweet Cookie does not transmit or retain them for you.                      |
| Isolation               | Partitioned Chromium cookies and partitioned or container-scoped Firefox cookies are excluded because ordinary replay cannot preserve their isolation context. |

## Browser support

| Source            | macOS | Windows | Linux |
| ----------------- | ----- | ------- | ----- |
| Inline payload    | Yes   | Yes     | Yes   |
| Chrome / Chromium | Yes   | Yes     | Yes   |
| Edge              | Yes   | Yes     | Yes   |
| Firefox           | Yes   | Yes     | Yes   |
| Safari            | Yes   | No      | No    |

Without an inline result, local backends run in the declared order. The default is Chrome, Safari,
then Firefox. `mode: "merge"` combines results. `mode: "first"` stops after the first backend that
returns cookies. Host-only and domain cookies remain distinct during filtering and deduplication.

## Questions

### Does Sweet Cookie send cookies anywhere?

No. The library, CLI, and extension contain no cookie transport. The caller chooses what receives
stdout, an in-process return value, clipboard content, or a downloaded file.

### Why can a browser read return warnings and still succeed?

A missing profile, inaccessible database, or undecryptable cookie does not always invalidate other
sources. Sweet Cookie returns readable cookies and bounded warnings. Raw values are excluded from
warnings.

### Why are partitioned and container-scoped cookies missing?

The output shape cannot preserve their isolation context. Sweet Cookie excludes them instead of
turning a context-bound cookie into an ordinary replayable credential.

### When should I use the extension?

Use it when the current Chrome profile can access cookies that a local database reader cannot, such
as some Windows App-Bound Encryption cases. It remains a user-triggered current-profile export, not
a cross-profile or background extractor.

## Reference

- [Usage, API, environment, and CLI reference](docs/usage.md)
- [Cookie extraction and extension specification](docs/spec.md)
- [Package API types](packages/core/src/types.ts)
- [Git source release procedure](docs/RELEASING.md)

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
