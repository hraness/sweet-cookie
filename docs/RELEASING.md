# Git source release checklist

Sweet Cookie releases from this Hraness repository are immutable Git source releases:

- an annotated `v<version>` tag at exact successful `main`
- a non-draft, non-prerelease, immutable GitHub Release for that tag
- a fresh Git-tag install that exercises the private root shim and tracked core build

`@steipete/sweet-cookie@0.4.1` on npm is immutable historical upstream evidence. Its payload
differs from Hraness source after the fork's safety fixes. A Hraness Git source release does not
replace or republish that npm artifact. npm publication requires separate authorization, verified
package-owner access, and a dedicated publication review.

## 0) Preflight

- [ ] Clean feature-branch worktree: `git status`
- [ ] GitHub authentication: `gh auth status`
- [ ] Exact package manager: `pnpm --version` prints `11.18.0`
- [ ] Existing `v*` tags remain untouched.

Record the immutable npm evidence and prove that the Hraness Git version does not already exist
there. This is a classification check, not a publication step.

```bash
test "$(npm view --registry=https://registry.npmjs.org @steipete/sweet-cookie@0.4.1 version)" = "0.4.1"
test "$(npm view --registry=https://registry.npmjs.org @steipete/sweet-cookie@0.4.1 dist.integrity)" = \
  "sha512-6cuWTGeblwzMw4/3uMzBEmgH1B+crCkJJlmTVu4vzbhG2NhAH8sMWv57fQ8JZY0nqW2ldM0/c2JM0UeQQFyJ3g=="
```

## 1) Version sources

Keep these source-owned values exact:

- root `package.json` for the private Git-consumption shim
- `packages/core/package.json` for the public library identity
- `portfolio-inventory.json` for the public source component
- `CHANGELOG.md` section `## <version> - <date>`

Resolve the version fail closed:

```bash
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
ver="$(node -e '
  const root = require("./package.json");
  const core = require("./packages/core/package.json");
  const inventory = require("./portfolio-inventory.json");
  const component = inventory.components.find((candidate) => candidate.name === core.name);
  if (
    root.name !== core.name
    || root.version !== core.version
    || component?.version !== core.version
  ) {
    console.error(`version mismatch: root=${root.name}@${root.version}, core=${core.name}@${core.version}, portfolio=${component?.name}@${component?.version}`);
    process.exit(1);
  }
  process.stdout.write(core.version);
')"
test "$ver" = "0.4.2"

npm_missing_output="$(mktemp /tmp/sweet-cookie-npm-missing.XXXXXX)"
if npm view \
  --registry=https://registry.npmjs.org \
  "@steipete/sweet-cookie@${ver}" \
  version \
  --json >"$npm_missing_output" 2>&1; then
  echo "npm already contains @steipete/sweet-cookie@${ver}; stop for publication review" >&2
  exit 1
fi
if ! grep -Fq '"code": "E404"' "$npm_missing_output" \
  || ! grep -Fq "\"summary\": \"No match found for version ${ver}\"" "$npm_missing_output"; then
  cat "$npm_missing_output" >&2
  echo "npm absence check failed without the expected exact E404; stop" >&2
  exit 1
fi
```

## 2) Changelog and tracked build

- [ ] Add the dated, product-facing changelog section.
- [ ] Run `pnpm -s build`.
- [ ] Confirm `packages/core/dist/` is current and contains no uncommitted build drift.

## 3) Source and package gates

- [ ] `pnpm -s check`
- [ ] `pnpm -s test`
- [ ] `pnpm -s test:bun`
- [ ] `(cd packages/core && npm pack --dry-run)`
- [ ] `npm pack --dry-run` from the repository root for the private Git shim

Exercise both local package shapes before review. Use task-scoped temporary directories and leave
the release shell at `repo_root`.

```bash
(
  core_pack_dir="$(mktemp -d /tmp/sweet-cookie-core-pack.XXXXXX)"
  consumer_dir="$(mktemp -d /tmp/sweet-cookie-core-consumer.XXXXXX)"
  cd "$repo_root/packages/core"
  npm pack --pack-destination "$core_pack_dir"
  cd "$consumer_dir"
  npm init -y >/dev/null
  npm install "$core_pack_dir/steipete-sweet-cookie-${ver}.tgz"
  node -e "import { getCookies, toCookieHeader } from '@steipete/sweet-cookie'; console.log(typeof getCookies, typeof toCookieHeader);"
  ./node_modules/.bin/sweet-cookie --help >/dev/null
)

(
  root_pack_dir="$(mktemp -d /tmp/sweet-cookie-root-pack.XXXXXX)"
  consumer_dir="$(mktemp -d /tmp/sweet-cookie-root-consumer.XXXXXX)"
  cd "$repo_root"
  npm pack --pack-destination "$root_pack_dir"
  cd "$consumer_dir"
  npm init -y >/dev/null
  npm install "$root_pack_dir/steipete-sweet-cookie-${ver}.tgz"
  node -e "import { getCookies, toCookieHeader } from '@steipete/sweet-cookie'; console.log(typeof getCookies, typeof toCookieHeader);"
  ./node_modules/.bin/sweet-cookie --help >/dev/null
)
```

## 4) Deliver through exact current-head Required

- [ ] Commit the reviewed source and tracked build outputs on a feature branch.
- [ ] Push the branch and open a pull request to `main`.
- [ ] Require current-head `Required` success and resolve every review thread.
- [ ] Squash or rebase merge through the repository ruleset. Do not bypass it or push to `main`.

After merge, wait for the exact `main` workflow and bind the release to that successful SHA. Keep
`repo_root`, `ver`, and `release_sha` in the same shell through the remaining steps.

```bash
cd "$repo_root"
git fetch origin main --tags
release_sha="$(git rev-parse origin/main)"
test "$release_sha" = "$(gh api repos/hraness/sweet-cookie/git/ref/heads/main --jq .object.sha)"

run_id="$(gh run list \
  --repo hraness/sweet-cookie \
  --branch main \
  --commit "$release_sha" \
  --workflow CI \
  --limit 1 \
  --json databaseId \
  --jq '.[0].databaseId')"
test -n "$run_id"
gh run watch "$run_id" --repo hraness/sweet-cookie --exit-status

required_count="$(gh api \
  "repos/hraness/sweet-cookie/commits/${release_sha}/check-runs" \
  --jq '[.check_runs[] | select(.name == "Required" and .app.slug == "github-actions" and .status == "completed" and .conclusion == "success")] | length')"
test "$required_count" -ge 1
```

## 5) Enable immutable GitHub releases

Enable release immutability only after exact merged-main Required succeeds, then read it back. The
explicit API version is required for this endpoint.

```bash
gh api \
  --method PUT \
  -H 'X-GitHub-Api-Version: 2026-03-10' \
  repos/hraness/sweet-cookie/immutable-releases

test "$(gh api \
  -H 'X-GitHub-Api-Version: 2026-03-10' \
  repos/hraness/sweet-cookie/immutable-releases \
  --jq 'if .enabled or .enforced_by_owner then "true" else "false" end')" = "true"
```

## 6) Create the immutable annotated tag

The `v*` ruleset prevents tag updates and deletion. Recheck `origin/main`, require an absent tag,
create the annotated tag directly at `release_sha`, and read back the peeled remote commit.

```bash
cd "$repo_root"
git fetch origin main --tags
test "$(git rev-parse origin/main)" = "$release_sha"

if git show-ref --verify --quiet "refs/tags/v${ver}"; then
  echo "local tag v${ver} already exists" >&2
  exit 1
fi
if git ls-remote --exit-code --tags origin "refs/tags/v${ver}" >/dev/null 2>&1; then
  echo "remote tag v${ver} already exists" >&2
  exit 1
fi

git tag -a "v${ver}" "$release_sha" -m "v${ver}"
git push origin "refs/tags/v${ver}"

remote_tag_sha="$(git ls-remote origin "refs/tags/v${ver}^{}" | awk '{print $1}')"
test "$remote_tag_sha" = "$release_sha"
```

## 7) Verify the exact tag as a consumer

Clone the exact tag for package inspection, then install through the public GitHub shorthand. Both
checks must resolve `release_sha` and version `ver`.

```bash
(
  tag_checkout="$(mktemp -d /tmp/sweet-cookie-tag-checkout.XXXXXX)"
  git clone --branch "v${ver}" --depth 1 https://github.com/hraness/sweet-cookie.git "$tag_checkout/repo"
  test "$(git -C "$tag_checkout/repo" rev-parse HEAD)" = "$release_sha"
  test "$(node -p "require('$tag_checkout/repo/package.json').version")" = "$ver"
  test "$(node -p "require('$tag_checkout/repo/packages/core/package.json').version")" = "$ver"
  (cd "$tag_checkout/repo/packages/core" && npm pack --dry-run)
)

(
  git_consumer="$(mktemp -d /tmp/sweet-cookie-git-consumer.XXXXXX)"
  cd "$git_consumer"
  npm init -y >/dev/null
  npm install "github:hraness/sweet-cookie#v${ver}"
  test "$(node -p "require('./node_modules/@steipete/sweet-cookie/package.json').version")" = "$ver"
  node -e "import { getCookies, toCookieHeader } from '@steipete/sweet-cookie'; console.log(typeof getCookies, typeof toCookieHeader);"
  ./node_modules/.bin/sweet-cookie --help >/dev/null
)
```

## 8) Create and verify the immutable GitHub Release

Create nonempty release notes from the exact changelog section:

```bash
cd "$repo_root"
awk -v start="$ver" '
  BEGIN { p=0 }
  $0 ~ ("^## " start " ") { p=1; next }
  $0 ~ "^## " { if (p) exit }
  p { print }
' CHANGELOG.md >"/tmp/sweet-cookie-v${ver}-notes.md"
test -s "/tmp/sweet-cookie-v${ver}-notes.md"
```

Create the release only for the remote tag that already passed exact target readback:

```bash
gh release create "v${ver}" \
  --repo hraness/sweet-cookie \
  --verify-tag \
  --title "v${ver}" \
  --notes-file "/tmp/sweet-cookie-v${ver}-notes.md"
```

Read back every terminal invariant:

```bash
test "$(gh api "repos/hraness/sweet-cookie/releases/tags/v${ver}" --jq .tag_name)" = "v${ver}"
test "$(gh api "repos/hraness/sweet-cookie/releases/tags/v${ver}" --jq .draft)" = "false"
test "$(gh api "repos/hraness/sweet-cookie/releases/tags/v${ver}" --jq .prerelease)" = "false"
test "$(gh api "repos/hraness/sweet-cookie/releases/tags/v${ver}" --jq .immutable)" = "true"
test "$(git ls-remote origin "refs/tags/v${ver}^{}" | awk '{print $1}')" = "$release_sha"
gh release view "v${ver}" --repo hraness/sweet-cookie --json body,url --jq '{body, url}'
```
