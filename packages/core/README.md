# @steipete/sweet-cookie

Read scoped cookies from an inline payload or a local browser, then return browser-compatible
cookie objects, bounded warnings, or an HTTP `Cookie:` header. The package supports Node.js 22 or
newer and Bun without a native Node addon.

Install Hraness version 0.4.4 from its immutable Git source tag:

```bash
npm install github:hraness/sweet-cookie#v0.4.4
```

The upstream npm artifact remains `@steipete/sweet-cookie@0.4.1`. It is a distinct historical
artifact and does not contain the current Hraness source.

## Smallest useful action

An inline result runs before local browser access and returns immediately when it contains matching
cookies:

```console
$ ./node_modules/.bin/sweet-cookie example.com --inline-json \
  '[{"name":"session","value":"demo","domain":"example.com","path":"/"}]' --format header
Cookie: session=demo
```

That command does not read a browser database, invoke an operating-system credential helper, or
make a network request.

## Library

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

Inline JSON, base64, and file sources take precedence over local browsers. Without an inline
result, the default browser order is Chrome, Safari, then Firefox. Chrome, Edge, Firefox, and Safari
profile selectors remain explicit inputs.

Partitioned Chromium cookies and partitioned or container-scoped Firefox cookies are excluded
because the output cannot preserve their isolation context. Raw cookie values are excluded from
warnings, but successful return values and CLI output contain live credentials.

See the [repository README](https://github.com/hraness/sweet-cookie#readme) for CLI workflows,
browser support, the current-profile Chrome exporter, and full custody boundaries.
