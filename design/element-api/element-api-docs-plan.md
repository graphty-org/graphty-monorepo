# graphty-element 2.0: documentation and publishing plan

Status: draft, for owner review
Date: 2026-09-19
Companion to: `design/element-api/element-api-design.md` (the API this plan documents)
Scope: how the 2.0 API is written, generated, tested, versioned, published and made
readable by coding agents.

Plain ASCII only. Every claim about the repository as it stands carries a `path:line`
read on 2026-09-19 at repo root `/home/apowers/Projects/graphty-monorepo`.

---

## 0. What the documentation has to achieve, and why it does not today

There are two tests. The first is for a person:

> A third party reading the docs reaches a working graph without reading this repository's
> source or its design documents.

The second is for a coding agent:

> An agent has the docs and no ability to read this repository. It needs names that are
> guessable, a machine-readable catalogue of everything the element can do, and one
> serialisation for every operation.

Both fail today, and they fail for the same reason: **the documentation is prose that was
written once and never executed, and the machine-readable artifacts are either absent or
invisible.** The measured evidence:

| Symptom | Evidence |
|---|---|
| The quickstart is wrong three ways at once | `graphty-element/docs/guide/getting-started.md` documents `source`/`target` while `graphty-element/src/config/DataConfig.ts:7-8` defaults `edgeSrcIdPath` to `"src"`; it lists `hierarchical` and `grid`, which are not registered; it sets `style-template="dark"`, and `graphty-element/src/graphty-element.ts:1475` takes a `StyleSchema` object |
| Every documentation link on the npm page is dead | 11 occurrences of `graphty.app/docs/graphty/` in `graphty-element/README.md` (lines 6, 52, 53, 54, 59, 60, 61, 62, 63, 64, 65); that URL is an HTTP 404 that never existed |
| 32 internal doc links 404 and nobody noticed | `docs/.vitepress/config.ts:40` sets `ignoreDeadLinks: true` |
| The manifest ships and no tool can find it | `graphty-element/package.json` has no `customElements` key (the exports block is lines 9-15) |
| There is no machine-readable API description | `graphty-element/typedoc.json` has no `json` or `outputs` key; nothing in the repo emits `docs.json` |
| The reference documents the wrong surface | `graphty-element/typedoc.json` `entryPoints` names 11 `src/*` files including `./src/managers/index.ts`; the package builds and types `index.ts` (`graphty-element/vite.config.ts:27` `entry: "./index.ts"`, `graphty-element/package.json:8` `"types": "./dist/index.d.ts"`) |
| 41 MB unpacked for a component | `graphty-element/package.json:23-27` `files: ["dist/", "README.md", "LICENSE"]`, and `dist/` carries every Babylon chunk and 26 MB of sourcemaps |

The plan has nine parts:

1. the URL layout, and the redirect that rescues the links already printed on npm;
2. the fix list for what is broken today, each with a file and a change;
3. the human page set, in reading order, with the getting-started page written out in full;
4. the agent artifacts: `llms.txt`, the Custom Elements Manifest, TypeDoc JSON, the tool
   description generated from the command registry;
5. generation from one source of truth, so the reference cannot drift;
6. executable documentation, so a rename breaks the build;
7. versioned docs across the major;
8. the npm tarball;
9. an implementer checklist.

Two rules run through all nine, and the rest of the document refers to them by what they
say rather than by a number.

> **Nothing in the reference is written by hand.** Attributes, properties, methods, events,
> error codes, command ops, algorithm names, layout names, palette names, scale names,
> config keys and defaults are generated from the declarations the runtime itself uses.
> Prose explains; the reference is emitted.

> **Every code block in the docs runs in CI.** A block that cannot run carries an explicit
> reason in its fence. A block with no directive fails the docs build.

---

## 1. The URL layout on graphty.app, and the redirect that rescues npm

### 1.1 What the site serves today

`.github/workflows/deploy-pages.yml` assembles `./public` from CI artifacts and publishes it
to GitHub Pages. The copy steps are lines 108-220. The verified live layout:

```
/                          the graphty React app (200, a 533-byte SPA shell)
/docs/                     the unified VitePress site, base "/docs/" (config.ts:39)
/docs/graphty-element/     from graphty-element/docs via tools/copy-docs-content.js
/docs/algorithms/          from algorithms/docs
/docs/layout/              404 -- layout/docs does not exist, so no index.html is emitted
/docs/graphty/             404 -- never existed; the source of the bad npm links
/storybook/                a heredoc index page (deploy-pages.yml:165-204)
/storybook/element/        graphty-element Storybook
/storybook/app/            graphty app Storybook
/storybook/algorithms/     algorithms Storybook
/storybook/layout/         layout Storybook
/storybook/compact-mantine/ 404 -- ci.yml:221-223 uploads it, deploy-pages.yml never downloads it
/algorithms/               algorithms gh-pages examples
/layout/                   layout gh-pages examples (200, 274 bytes, an empty stub)
```

There are no server-side redirects: GitHub Pages serves static files only. A missing path
returns the GitHub Pages default 404 page, which carries no link back to the site.

### 1.2 The 2.0 layout

The `base` stays `/docs/` and the per-package directory stays `graphty-element`, because
root `CLAUDE.md` mandates `/graphty-element/` for the web component docs and because 200 OK
URLs that already work must not move. What changes is what lives under it.

```
https://graphty.app/
  docs/                              VitePress, base "/docs/"
    index.md                         the ecosystem landing page (exists, docs/index.md)
    llms.txt                         site-wide agent index          (generated)
    llms-full.txt                    site-wide agent corpus         (generated)

    graphty-element/                 CURRENT major (2.x). The default. No version in the URL.
      index.md                       what it is, one image, the 20-line example
      quickstart.md                  zero to a rendered graph; written out in full below
      llms.txt                       package-scoped agent index     (generated)
      llms-full.txt                  package-scoped agent corpus    (generated)
      API.md                         the WHOLE public surface on one page (generated)
      guide/
        install.md  data.md  styling.md  algorithms.md  layouts.md
        selection.md  filters.md  events.md  camera.md  export.md
        acceleration.md  headless.md  commands.md  troubleshooting.md
        frameworks/react.md  vue.md  svelte.md  angular.md  vanilla.md
        extending/algorithm.md  layout.md  format.md  scale.md  palette.md  command.md
      reference/                     ALL GENERATED, never hand-written
        element.md                   attributes, properties, methods, slots, CSS parts
        events.md                    22 DOM events + 13 session events, detail shapes
        commands.md                  the Command union, op by op
        algorithms.md  layouts.md  formats.md  palettes.md  scales.md  themes.md
        errors.md                    every GraphtyErrorCode, meaning, recovery
        config.md                    every ConfigValues key, unit, range, default
        types.md                     TypeDoc markdown of the public entry points
      recipes/                       task-shaped, each titled as a question
      examples/                      graphty-element/examples/*.html, actually deployed
      migration/
        v1-to-v2.md                  generated from the breaking-change table, plus codemods
        changelog.md
    v1/                              FROZEN 1.10 snapshot (see "Versioned docs")
      graphty-element/...            the 1.x docs exactly as they shipped, with a banner
    graphty/                         REDIRECT STUBS ONLY (see below)
    algorithms/  layout/  graph-format/  graph-io/  webgpu-graph-algorithms/
  storybook/element/ app/ algorithms/ layout/ compact-mantine/
  404.html                           site-wide custom 404 with a prefix rewriter
```

Three naming decisions, stated so they are not relitigated:

1. **No version segment in the current-major URL.** `/docs/graphty-element/guide/data` is
   2.x forever; the archive gets the segment (`/docs/v1/graphty-element/...`). A URL that
   gains a version segment at 3.0 breaks every link printed at 2.x, which is the mistake
   this plan exists to stop repeating.
2. **`/docs/graphty-element/` keeps its name even though the tag becomes `<graphty-element>`
   in 2.0.** The directory names the *package*; the tag names the *element*. Renaming the
   directory would 404 the only documentation URLs on the site that currently work.
3. **`/storybook/element/` and `/storybook/app/` keep their paths.** Root `CLAUDE.md:498`
   states the convention as `/storybook/{package}/`, which is wrong for both; the
   documentation is corrected to match the site, not the other way round, because those two
   URLs are live and linked.

### 1.3 The redirect that rescues npm

Eleven dead URLs are printed on the npm page of every version from 1.0.0 to 1.10.0. npm
README text for a published version is immutable. The only fix is to make the URL resolve.

**Mechanism.** GitHub Pages has no redirect rules, so the redirect is a generated static HTML
stub per path: an HTTP-equivalent meta refresh, a canonical link for crawlers, a
`location.replace` for JS clients, and a visible link for anyone with both disabled.

New file `tools/build-redirects.mjs`, run in `deploy-pages.yml` after the docs are copied
into `./public/docs`:

```js
// tools/build-redirects.mjs
// Mirrors every path under public/docs/graphty-element/ to public/docs/graphty/,
// plus the explicit aliases below, as static redirect stubs.
import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

const PUBLIC = process.argv[2] ?? "./public";
const SITE = "https://graphty.app";

// Paths that 1.x READMEs printed and that have no 1:1 successor.
const ALIASES = {
    "/docs/graphty/":                          "/docs/graphty-element/",
    "/docs/graphty/api/":                      "/docs/graphty-element/API",
    "/docs/graphty/guide/getting-started":     "/docs/graphty-element/quickstart",
    "/docs/graphty/guide/installation":        "/docs/graphty-element/guide/install",
    "/docs/graphty/guide/camera":              "/docs/graphty-element/guide/camera",
    "/docs/graphty/guide/layouts":             "/docs/graphty-element/guide/layouts",
    "/docs/graphty/guide/styling":             "/docs/graphty-element/guide/styling",
    "/docs/graphty/guide/events":              "/docs/graphty-element/guide/events",
    "/docs/graphty/guide/extending/":          "/docs/graphty-element/guide/extending/algorithm",
    "/docs/graphty/guide/algorithms":          "/docs/graphty-element/guide/algorithms",
    "/docs/graphty/guide/vr-ar":               "/docs/graphty-element/guide/camera",
    "/docs/guide/web-component":               "/docs/graphty-element/reference/element",
    "/docs/guide/events":                      "/docs/graphty-element/reference/events",
    "/docs/api/javascript":                    "/docs/graphty-element/API",
};

function stub(to, note) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved to ${to}</title>
<link rel="canonical" href="${SITE}${to}">
<meta http-equiv="refresh" content="0; url=${SITE}${to}">
<meta name="robots" content="noindex">
<script>location.replace(${JSON.stringify(SITE + to)});</script>
</head>
<body>
<p>This page moved to <a href="${SITE}${to}">${SITE}${to}</a>.</p>
<p>${note}</p>
</body>
</html>
`;
}

async function walk(dir, base) {
    const out = [];
    for (const name of await readdir(dir)) {
        const p = join(dir, name);
        if ((await stat(p)).isDirectory()) out.push(...(await walk(p, base)));
        else if (name.endsWith(".html")) out.push(relative(base, p));
    }
    return out;
}

const NOTE = "graphty-element documentation lives at /docs/graphty-element/. " +
             "The /docs/graphty/ path was never valid and is kept only so that links " +
             "printed in the 1.x npm README resolve.";

const from = join(PUBLIC, "docs", "graphty-element");
for (const rel of await walk(from, from)) {
    const target = "/docs/graphty-element/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
    const dest = join(PUBLIC, "docs", "graphty", rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, stub(target, NOTE));
}
for (const [alias, target] of Object.entries(ALIASES)) {
    const dest = join(PUBLIC, alias.endsWith("/") ? alias + "index.html" : alias + ".html");
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, stub(target, NOTE));
}
console.log("redirect stubs written");
```

Wired into `.github/workflows/deploy-pages.yml`, immediately after the
"Unified docs (/docs/)" copy block (currently lines 120-127):

```yaml
            - name: Build redirect stubs for historical npm links
              run: node tools/build-redirects.mjs ./public
```

**Second safety net: a real 404 page.** GitHub Pages serves `/404.html` from the site root
for any unmatched path across the whole site. New file `docs/public/404.html` (VitePress
copies `docs/public/*` verbatim into the build, so it lands at `/docs/404.html`) plus a copy
placed at `./public/404.html` by the assembly step so it covers the whole origin:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><title>Page not found - graphty.app</title>
<script>
  // Rescue the one path shape that 1.x READMEs printed.
  var p = location.pathname;
  if (p.indexOf("/docs/graphty/") === 0) {
    location.replace(p.replace("/docs/graphty/", "/docs/graphty-element/") + location.hash);
  }
</script>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem}</style>
</head>
<body>
<h1>Page not found</h1>
<p>Try one of these:</p>
<ul>
  <li><a href="/docs/graphty-element/">graphty-element documentation</a></li>
  <li><a href="/docs/graphty-element/quickstart">Quickstart</a></li>
  <li><a href="/docs/graphty-element/API">The whole API on one page</a></li>
  <li><a href="/docs/">All packages</a></li>
  <li><a href="/storybook/element/">Storybook examples</a></li>
</ul>
</body>
</html>
```

**Why both.** The stubs make the exact printed URLs resolve with a canonical link, which is
what a crawler and an LLM fetcher need. The 404 page catches deep paths invented later and
anything else that rots. Neither costs a build step worth measuring.

### 1.4 Paths that must stop 404ing, and how

| Path | Cause | Fix |
|---|---|---|
| `/docs/graphty/**` | never existed; stale comment at `deploy-pages.yml:98` seeded it | the redirect stubs above, plus the README corrections in the fix list below |
| `/docs/layout/` | `layout/docs` does not exist, so `tools/copy-docs-content.js` skips it and VitePress emits no index; `docs/.vitepress/config.ts:58` and `:70` (the two nav entries), the whole `"/layout/"` sidebar block at `:170-199`, and the documentation badge at `README.md:37` link to it | create `layout/docs/index.md` (a hero page plus a link to the generated API), which is the smaller change than deleting two nav entries, a sidebar block and a README badge |
| `/storybook/compact-mantine/` | `ci.yml:221-223` uploads `build-storybook-compact-mantine`; `deploy-pages.yml` has no matching download | add the download and copy steps (fix list below) |
| `/docs/guide/**`, `/docs/api/**` (32 links) | `graphty-element/docs/**` uses root-relative `/guide/...` under `base: "/docs/"` | rewrite the links relative to the package root and set `ignoreDeadLinks: false` (fix list below) |
| `/data/**` | never existed, and nothing in `deploy-pages.yml` writes it, yet documentation examples fetch from it. Verified 2026-09-19: `https://graphty.app/data/karate.json` and `https://graphty.app/data/lesmis.graphml` both return **404** while `https://graphty.app/` and `https://graphty.app/docs/graphty-element/` return 200 | publish the fixture files the docs fetch, from `graphty-element/examples/data/` (`miserables.json`, `blocks.json` today), plus one file per built-in sample dataset emitted at build (fix list below) |

---

## 2. The fix list: what is broken today, with the file and the change

Ordered so that nothing later depends on something earlier being skipped. The first nine
items are publishable before the 2.0 API exists and ship as a documentation-only **`1.10.1`**
patch; the rest land with 2.0.

**On the release the first nine ship in.** They ship as `1.10.1`, a `fix` commit and
therefore a patch bump, rather than as a `1.11` release carrying per-symbol deprecation
warnings. A deprecation warning is only useful when the replacement exists in the version
that warns, and for the great majority of the ninety-two rows in the migration register no
1.x replacement exists: roughly ten could be warned about honestly and the rest would be
silent. The redirect stubs above do the work a bridge release cannot. If the owner decides
to ship a `1.11` after all, nothing here changes except the version number on this heading
and on the last-1.x-release section, because every item is documentation.

### Ship now (documentation-only `1.10.1`)

**The npm page's eleven dead documentation links.**
File: `graphty-element/README.md`, lines 6, 52, 53, 54, 59, 60, 61, 62, 63, 64, 65.
Change: replace `https://graphty.app/docs/graphty/` with
`https://graphty.app/docs/graphty-element/` in all eleven. Verified count:
`grep -o 'docs/graphty/' graphty-element/README.md | wc -l` returns 11.

**The npm page's badges describe another project.**
File: `graphty-element/README.md:4,5`. Both point at
`github.com/graphty-org/graphty-element`, a different repository from the monorepo this
package is built in.
Change: point the CI badge at
`https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml` and the coverage
badge at the monorepo's Coveralls project; or delete both. A badge that silently reports a
different project's build is worse than no badge.

**The repo root README's documentation badge points at the same dead URL.**
File: `README.md:25`. Same substitution: `docs/graphty/` becomes `docs/graphty-element/`.

**The workflow comment that seeded the mistake.**
File: `.github/workflows/deploy-pages.yml:98`, which reads
`#   /docs/graphty/ = graphty-element docs`.
Change: `#   /docs/graphty-element/ = graphty-element docs`, and add
`#   /docs/graphty/     = redirect stubs for 1.x npm links (tools/build-redirects.mjs)`.
No step in that workflow ever produced `/docs/graphty/`; the comment is the origin of the
dead links in both READMEs.

**The URL conventions block in root `CLAUDE.md` is wrong.**
File: `CLAUDE.md:497-498`.
Change: `Documentation: https://graphty.app/docs/{package}/` is true for graphty-element and
algorithms only -- qualify it. `Storybook: https://graphty.app/storybook/{package}/` is
wrong for both live Storybooks; replace with the explicit table:
`/storybook/element/`, `/storybook/app/`, `/storybook/algorithms/`, `/storybook/layout/`,
`/storybook/compact-mantine/`. Also correct the package version table (it lists
graphty-element 1.5.0; `graphty-element/package.json:3` says 1.10.0).

**`/docs/layout/` 404s while two nav entries, a whole sidebar block and a README badge link
to it.**
Files: new `layout/docs/index.md`; `docs/.vitepress/config.ts:58` and `:70` (nav) plus the
`"/layout/"` sidebar block at `:170-199`; `README.md:37` (the badge). Verified with
`grep -n '"/layout/"' docs/.vitepress/config.ts` and `grep -n 'docs/layout' README.md` on
2026-09-19.
Change: create `layout/docs/index.md` with a VitePress home hero and links to
`/layout/api/generated/`. `tools/copy-docs-content.js` already maps `layout/docs` ->
`docs/layout`; it currently prints
`Warning: Source path .../layout/docs does not exist, skipping` and continues.

**`/storybook/compact-mantine/` 404s although CI builds and uploads it.**
File: `.github/workflows/deploy-pages.yml`.
Change: add a download step after the layout Storybook download (currently lines 62-68) and
a copy block in the assembly step:

```yaml
            - name: Download compact-mantine Storybook
              uses: actions/download-artifact@v4
              with:
                  name: build-storybook-compact-mantine
                  path: ./compact-mantine/storybook-static/
                  run-id: ${{ github.event.workflow_run.id }}
                  github-token: ${{ secrets.GITHUB_TOKEN }}
```

```bash
                  if [ -d "./compact-mantine/storybook-static" ]; then
                    mkdir -p ./public/storybook/compact-mantine
                    cp -r ./compact-mantine/storybook-static/* ./public/storybook/compact-mantine/
                  fi
```

and a fifth `<li>` in the Storybook index heredoc (`deploy-pages.yml:165-204`).

**`ignoreDeadLinks: true` is hiding 32 broken internal links.**
Files: `docs/.vitepress/config.ts:40`; the root-relative links throughout
`graphty-element/docs/**` and `algorithms/docs/**`.
Change: set `ignoreDeadLinks: false`, then fix the links it reports. The pattern is
`/guide/x` and `/api/x` written as if the package were mounted at the site root, while the
package is mounted at `/docs/graphty-element/` (the site `base` is `/docs/` at
`docs/.vitepress/config.ts:39`, and `tools/copy-docs-content.js` puts the package under
`docs/graphty-element/`). Rewrite each as `/graphty-element/guide/x` -- VitePress prefixes
`base` itself, so the link must be site-relative *without* `/docs/`, exactly as the nav
entries at `config.ts:56-58` already are.
This is the single change that makes the dead-link class impossible to reintroduce.

**The docs build only runs on master, so a PR cannot break it.**
File: `.github/workflows/ci.yml:131-133`:

```yaml
            - name: Build docs
              if: github.ref == 'refs/heads/master' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
              run: npm run docs:build
```

Change: drop the `if:` from the build step so every PR builds the docs (which, once dead
links are no longer ignored, means every PR is link-checked), and keep the `if:` on the
`Upload unified docs` artifact step (`ci.yml:242-247`) so only master publishes.

### Ship with 2.0

**TypeDoc documents the implementation tree, not the package.**
File: `graphty-element/typedoc.json`.
Change: replace the 11 `src/*` `entryPoints` with the real public entries, drop
`entryPointStrategy: "expand"` in favour of `"resolve"`, and emit JSON alongside markdown:

```json
{
    "$schema": "https://typedoc.org/schema.json",
    "entryPoints": [
        "./index.ts",
        "./src/api/session.ts",
        "./src/api/schema.ts",
        "./src/api/catalog.ts",
        "./src/api/commands.ts",
        "./src/api/extend.ts",
        "./src/api/format.ts"
    ],
    "entryPointStrategy": "resolve",
    "outputs": [
        { "name": "markdown", "path": "../docs/graphty-element/reference/types" },
        { "name": "json", "path": "./dist/api.json" }
    ],
    "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme"],
    "readme": "none",
    "excludePrivate": true,
    "excludeProtected": true,
    "excludeInternal": true,
    "excludeExternals": true,
    "hideGenerator": true,
    "categorizeByGroup": true,
    "sort": ["alphabetical"],
    "kindSortOrder": ["Class", "Interface", "TypeAlias", "Function", "Variable"]
}
```

The entry list mirrors the package's `exports` map exactly; when an entry is added there, it
is added here, and the packaging test described under "Generation from one source of truth"
makes that a test rather than a convention. `./src/managers/index.ts` disappears from the
reference because 2.0 removes the manager exports entirely.

**`docsRoot` is overridden and produces malformed sidebar links.**
Files: `graphty-element/typedoc.json` (`"docsRoot": "./docs"`); `package.json:33`
(`--out ../docs/graphty-element/api/generated` overrides it).
Change: delete `docsRoot` and the `--out` override; let the `outputs` block above be the
single source. The current sidebar emits links like
`/../../docs/graphty-element/api/generated/algorithms/Algorithm/`, which resolve only
because browsers normalise `/docs/../../docs/...` back to the right path. That works by
accident of URL normalisation; any change to `base` breaks the entire generated sidebar at
once.

**The angle-bracket sanitiser is a lossy regex over generated markdown.**
Files: `graphty-element/scripts/sanitize-api-docs.js`, `tools/sanitize-api-docs.js`.
Change: delete both. They exist because VitePress runs markdown through the Vue template
compiler and `Promise<Foo>` parses as an unknown component; the correct fix is a VitePress
`markdown.config` that disables the Vue component parse inside the generated reference
directory, or `typedoc-plugin-markdown`'s own escaping. Escaped `Promise\<Foo\>` is worse
input for an LLM than the raw type, and the regex is heuristic -- it mangles lowercase type
names and nested generics. Both files additionally carry a false auto-generated banner
(`// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE.`) while being hand-written and
pointing at no generator, which violates the repo rule that only script-generated files
carry that warning.

**Two competing VitePress sites with conflicting `base` values.**
Files: `graphty-element/docs/.vitepress/` (`base: "/graphty-element/"`, config.ts:27);
`graphty-element/project.json:81` (the `docs:build` Nx target);
`graphty-element/package.json` scripts `docs:dev`, `docs:watch`, `docs:build`,
`docs:preview`.
Change: delete the package-local `.vitepress` directory, the Nx target and the four scripts.
The root site at `docs/` is the only one CI builds (`ci.yml:133` runs the root
`npm run docs:build`) and the only one `deploy-pages.yml` downloads. The package-local site
is broken by construction: its own `docs/index.md` writes `/graphty-element/guide/...`,
which under `base: "/graphty-element/"` resolves to `/graphty-element/graphty-element/...`.
Keeping the markdown under `graphty-element/docs/` is right -- it lives next to the code it
documents and `tools/copy-docs-content.js` already lifts it -- only the second site config
goes.

**The Custom Elements Manifest is invisible to tooling.**
File: `graphty-element/package.json`.
Change: add `"customElements": "./dist/custom-elements.json"`. Without it, no editor, no
`api-viewer-element`, no Storybook docgen, no CEM linter and no React-wrapper generator can
find a manifest that is already in the tarball. The manifest section below has the detail.

**The Custom Elements Manifest is nearly empty.**
Files: `graphty-element/vite.config.ts:16-19` (`VitePluginCustomElementsManifest({ files: ["./src/graphty-element.ts"], lit: true })`);
the element source.
Change: see "The Custom Elements Manifest" below. Today the manifest analyses one file,
records one nameless event (`[{ "type": { "text": "CustomEvent" } }]`), leaks 18 `#private`
fields as members (19 `#`-prefixed members in all, out of 129; counted from
`graphty-element/dist/custom-elements.json` on 2026-09-19), and declares zero slots, zero
CSS parts and zero CSS custom properties. The single nameless event is a direct consequence
of `graphty-element/src/graphty-element.ts:97`, which re-dispatches every internal event
under a name computed at runtime, so the analyzer cannot see a name.

**There is no type augmentation, so a TypeScript consumer gets `Element`.**
File: new `graphty-element/src/api/global.d.ts`, exported from the `.` entry.
Change: ship `HTMLElementTagNameMap["graphty-element"]` and `GraphtyEventMap`, so
`document.querySelector("graphty-element")` is typed and `addEventListener` narrows the event
detail. Today `grep -rn "HTMLElementTagNameMap"` over `graphty-element/src` and `index.ts`
finds one unrelated hit (`src/ai/input/VoiceInputAdapter.ts:53`, for the Web Speech API),
which is why the one consumer hand-wrote a 73-line `declare module` shim
(`graphty/src/types/graphty-element.d.ts`) that shadows the real types.

**The quickstart's three factual errors.**
File: `graphty-element/docs/guide/getting-started.md`.
Change: the page is replaced, not patched. Its replacement is written out in full under
"Documentation for humans", and every fenced block in it becomes a CI test. Patching three
lines fixes three lines; the defect is that nothing executed the page.

**The examples are published nowhere, and neither are the data files the docs fetch.**
Files: `graphty-element/examples/*.html` (basic, events, expanding, graph_engine, json_data,
large, pretty, styles, plus `xr/`); `graphty-element/examples/data/` (`miserables.json`,
`blocks.json`); `.github/workflows/deploy-pages.yml`.
Change: copy the pages into the Pages tree at `/docs/graphty-element/examples/` and link them
from the docs nav and from `llms.txt`. They are real, complete, runnable pages and they are
in neither `files[]` nor the site.

Copy the data files to `./public/data/` in the same assembly step, so
`https://graphty.app/data/<file>` resolves:

```bash
                  mkdir -p ./public/data
                  cp -r ./graphty-element/examples/data/* ./public/data/
```

This is not cosmetic. Every block in the quickstart is a CI test, and a browser-tested block
that fetches a 404 fails from the day it is written. **Every URL a docs example fetches must
be a path this workflow writes**, and the external-link check described later covers the docs
corpus, so a `/data/` path that stops being published fails the build. Two rules follow: a
docs example uses either the `sample` attribute (no network at all, the preferred form for a
first graph) or a `/data/` path published here; it never invents a URL.

**No `llms.txt`, no `.md` page twins.**
File: `docs/.vitepress/config.ts`.
Change: see "llms.txt, llms-full.txt and .md twins" below.

**The tarball is 41 MB.**
File: `graphty-element/package.json:23-27`.
Change: see "The npm tarball" below.

---

## 3. Documentation for humans

### 3.1 The reading order, and why it is that order

Today the corpus is broad (5,320 lines across 20 files) and mis-ordered: the three
"Extending" guides total 1,124 lines while there is no page that tells a reader which
built-in layouts exist, and the two entry points -- the README and `guide/getting-started.md`
-- contradict each other about the edge field names. The order below follows the four
audiences the 2.0 API is written for -- a person putting a graph on a page, an application
developer embedding it, a coding agent generating calls, and an extension author -- in the
order they arrive.

| # | Page | The question it answers | Longest a reader should spend |
|---|---|---|---|
| 1 | `index.md` | What is this and what does it look like? | 60 seconds |
| 2 | `quickstart.md` | Can I get a graph on my page right now? | 5 minutes |
| 3 | `guide/install.md` | npm, CDN, bundler, peer deps, sizing, CSP, SSR | 5 minutes |
| 4 | `guide/data.md` | What shape is my data, and how do I load a file? | 10 minutes |
| 5 | `guide/algorithms.md` | How do I measure the graph, and what does a `Run` give me? | 10 minutes |
| 6 | `guide/styling.md` | How do I colour and size things by what I measured? | 10 minutes |
| 7 | `guide/layouts.md` | How do I arrange it, and which layout should I pick? | 5 minutes |
| 8 | `guide/selection.md` | How do I select, and how do my UI and the graph stay in sync? | 5 minutes |
| 9 | `guide/filters.md` | How do I hide things, including over time? | 5 minutes |
| 10 | `guide/events.md` | What fires, when, and what is in `detail`? | 5 minutes |
| 11 | `guide/camera.md` | How do I move the camera and bookmark a view? | 5 minutes |
| 12 | `guide/export.md` | How do I get a PNG, a CSV, a video, a report out? | 5 minutes |
| 13 | `guide/acceleration.md` | How do I turn on the GPU, and how do I tell if it is on? | 3 minutes |
| 14 | `guide/frameworks/*` | How do I use this in React / Vue / Svelte / Angular / plain HTML? | 5 minutes |
| 15 | `guide/headless.md` | How do I run this with no screen, and how does Compare work? | 10 minutes |
| 16 | `guide/commands.md` | How do I record, replay, undo and script what I did? | 10 minutes |
| 17 | `guide/troubleshooting.md` | It is blank / has no edges / is slow / throws | as needed |
| 18 | `guide/extending/*` | How do I add my own algorithm, layout, format, scale, palette? | as needed |
| 19 | `recipes/*` | One concrete task, copy-pasteable | as needed |
| 20 | `reference/*`, `API.md` | Exactly what exists | as needed |
| 21 | `migration/v1-to-v2.md` | I am on 1.x; what changed and what do I type instead? | as needed |

Four ordering rules that the current set violates and this one obeys:

1. **Using comes before extending.** A reader can currently learn to write a custom layout
   engine (346 lines) more easily than to learn which built-in layouts exist. Extending is
   position 18.
2. **Every page that names a string value links to the generated list.** The layout page
   never types a layout name in prose; it renders `reference/layouts.md`. That is how
   "`hierarchical` and `grid` do not exist and eleven real layouts are undocumented" stops
   being possible.
3. **The reference is separate from the guide.** The guide teaches and may be selective; the
   reference is generated and is exhaustive. Today `api/web-component.md` is a hand-written
   table that is the *only* place in the docs that states the `src`/`dst` defaults
   correctly, and it is drifting from the code by construction.
4. **One page per question, and the page title is the question where it can be.** This is
   what makes the `llms.txt` index useful: an agent picking one 6 KB page out of a list picks
   by the title.

### 3.2 What each page must contain that no page contains today

- **`index.md`**: one image of a rendered graph, the install line, and the 20-line
  first-graph example from the API design *inline on the page*. The current root README
  contains no code at all -- not one fenced block, no `npm install`, no element snippet.
- **`guide/install.md`**: the explicit sentence that the element needs a height
  (`display:block; height:...`), because a zero-height custom element renders a blank page
  and that is the most common first failure; the CDN one-liner (the `./bundle` entry point)
  so no reader ever hand-writes an import map, which
  `graphty-element/examples/basic.html:24-30` currently does; the `exports` map as a table of
  what is Node-safe; CSP notes; SSR (`./session` runs in Node, `.` does not).
- **`guide/data.md`**: the record shapes, `source`/`target` as canonical with `src`/`dst` and
  `from`/`to` accepted and *reported*, the two-phase `inspect()` then `import()` flow, and
  `data.samples()` so a reader has a graph before they have a file.
- **`guide/events.md`**: the contract sentence verbatim -- **every declared event is emitted,
  and every emitted event is subscribable** -- followed by the generated table. Today four
  documented events throw on subscribe (`graphty-element/src/managers/EventManager.ts:450`
  ends in `throw new TypeError`), `edge-click` and eleven `ai-*` events are declared and
  never emitted, and the shipped docs advertise a `graph.off()` that does not exist.
- **`guide/troubleshooting.md`**: it does not exist today. It must carry, at minimum: blank
  canvas (no height); no edges (endpoint columns -- and in 2.0, the
  `E_EDGE_ENDPOINTS_UNRESOLVED` error that makes it loud); React's property-versus-attribute
  upgrade hazard and the `[object Object]` console error the element now emits when a rich
  value is set as an HTML attribute before the element upgrades;
  `acceleration="required"` throwing `E_NO_ACCELERATOR`; a secure-context requirement for
  WebGPU; and large-graph performance mode with `view.rendered.performanceMode.reasons`.

### 3.3 The exemplar: `graphty-element/docs/quickstart.md`, written out in full

This is the replacement for `graphty-element/docs/guide/getting-started.md`. Every fenced
block carries a test directive, in the form defined under "Executable documentation". It is
the page the whole plan stands or falls on.

````markdown
---
title: Quickstart
description: From nothing to a rendered, measured, coloured graph in five minutes.
outline: deep
---

# Quickstart

By the end of this page you will have a graph on a page, coloured by a centrality metric,
responding to clicks, and exported as a PNG. Five minutes, no build step required.

## 1. Put a graph on the page

The fastest path is a script tag. Nothing to install, nothing to configure.

```html test=browser name=quickstart-cdn
<script type="module"
        src="https://cdn.jsdelivr.net/npm/@graphty/graphty-element@2/dist/graphty.bundle.js"></script>

<graphty-element id="g" sample="karate"
               style="display: block; height: 480px"></graphty-element>
```

That is a working graph. Two things in it are load-bearing:

- **`style="display: block; height: 480px"`.** A custom element is `display: inline` by
  default and has no intrinsic height. Without an explicit height you get a blank page and
  no error. This is the single most common first failure.
- **`sample="karate"`.** A built-in dataset, so you have a graph before you have a file, and
  nothing is fetched over the network. It is one of the eleven attributes
  ([Element reference](./reference/element.md)); `g.session.data.samples()` lists the rest.

::: tip Which script?
`dist/graphty.bundle.js` is self-contained: Babylon.js and Lit are inlined, so a browser can
load it directly. If you are using a bundler, `npm install @graphty/graphty-element` and
`import "@graphty/graphty-element"` instead -- see [Installation](./guide/install.md).
:::

## 2. Use your own data

Set the `data` property. Nodes need an `id`; edges need a `source` and a `target`.

```js test=browser name=quickstart-data
const g = document.getElementById("g");

g.data = {
  nodes: [
    { id: "ada",    role: "engineer" },
    { id: "grace",  role: "engineer" },
    { id: "katherine", role: "mathematician" },
  ],
  edges: [
    { source: "ada",   target: "grace" },
    { source: "grace", target: "katherine" },
    { source: "katherine", target: "ada" },
  ],
};

await g.ready;   // resolves once the engine is up, the data is in, and the first layout ran
```

::: warning Edge field names
`source` and `target` are canonical. `src`/`dst` and `from`/`to` are also accepted on input:
the element reports which pair it used on the `graphty-data-loaded` event and in the import
report. If a file has none of them, the import **fails loudly** with
`E_EDGE_ENDPOINTS_UNRESOLVED` and lists the columns it found. You will never get a silent
graph with nodes and no edges.
:::

`data` is a property, not an attribute. Assigning `data` replaces the whole graph; to add to
it, use [`session.data.apply`](./guide/data.md#mutations).

## 3. Load a file instead

Point `src` at a URL, or hand `load()` a `File` from an `<input type="file">`. The element
sniffs the format; twelve are built in (see [Formats](./reference/formats.md)).

```html test=browser name=quickstart-src
<graphty-element src="https://graphty.app/data/miserables.json"
               layout="force"
               style="display: block; height: 480px"></graphty-element>
```

```js test=browser name=quickstart-load
const report = await g.load(fileInput.files[0], undefined, {
  onProgress: (p) => console.log(p.fraction),
});

console.log(report.counts);   // { nodes, edges, selfLoops, repeatedEdges, isolatedNodes, ... }
console.log(report.quality);  // 0..100
for (const issue of report.issues) console.warn(issue.severity, issue.message);
```

If you want to see and correct the column mapping before committing, that is
[`inspect()` then `import()`](./guide/data.md#two-phase-load).

## 4. Measure it

`run()` starts an algorithm and hands you back a `Run`: an object with an id, a label,
progress, a cancel button and a result. Awaiting it gives you the result.

```js test=browser name=quickstart-run
const run = g.run("betweenness");        // bind the Run. Do NOT write `await g.run(...)`
                                         // here: that gives you the RunResult, and the
                                         // encode() in step 5 wants the Run.
console.log(run.id, run.label);          // "betweenness", "Betweenness"
console.log(run.progress.fraction);      // 0..1, or null while indeterminate

const result = await run;                // awaiting the Run gives the RunResult
console.log(result.summary().top[0]);    // { id, value, rank, percentile }
console.log(result.reading());           // a plain-language sentence about what it found
console.log(result.caveats.exact);       // false if the element sampled because the graph
                                         // was above config.exactComputationCap
```

Everything the element can run, with cost estimates for *this* graph on *this* machine, is
in `session.catalog.metrics()` -- including the ones you have not run yet:

```js test=browser name=quickstart-catalog
for (const m of g.session.catalog.metrics()) {
  console.log(m.plainName, m.available, m.costClass, m.estimateSeconds.toFixed(1) + "s");
}
```

Before an expensive one, ask what it costs. `estimate()` is synchronous, so you can gate a
button on it:

```js test=browser name=quickstart-estimate
const cost = g.session.estimate({ op: "algo.run", algorithm: "betweenness" });
if (cost.seconds > 5) {
  console.log(`This will take about ${cost.seconds.toFixed(0)} s (${cost.basis})`);
}
```

## 5. Colour by what you measured

`encode()` binds a result field to a visual channel and returns the style layer it created.
It is the one path an analysis layer takes.

```js test=browser name=quickstart-encode
const layer = await g.encode({
  run,                       // the Run from step 4 (a RunResult or a run id also work)
  channel: "node.color",
  palette: "viridis",
  scale: "sqrt",             // betweenness has zeros; under "log" those take the
                             // `missing` branch and are counted in the legend's departures
});

const layer2 = await g.encode({ run, channel: "node.size", scale: "sqrt" });
```

A style write validates **and** repaints, so it is a `Run` and you await it for the `Layer`
(`styles.validate(spec)` is the synchronous half, for a form). The element already applied a
derived colour layer when the run finished; an `encode()` naming the same run and the same
channel **replaces** that layer rather than stacking on it, so there is one layer and one
legend block per channel, not two.

Layers stack bottom to top; `session.styles.list()` returns them with index 0 at the bottom.
The legend is derived, never written:

```js test=browser name=quickstart-legend
for (const block of g.session.styles.legend()) {
  console.log(block.channel, block.field.plainName, block.scale.label, block.swatches);
  console.log(block.departures);   // "clamped at p2/p98", "not measured (312 nodes)"
}
```

Asking why one node looks the way it does is a call, not a debugging session:

```js test=browser name=quickstart-explain
console.log(g.session.styles.explain({ node: "ada" }));
// which layer set which channel, in order, and which one won
```

## 6. Respond to a click

Every DOM event is `graphty-` prefixed, bubbles, is composed, and has a serialisable
`detail`. `on()` returns its own unsubscribe function -- there is no `off()` to learn.

```js test=browser name=quickstart-events
const off = g.on("graphty-node-click", (e) => {
  console.log(e.detail.id, e.detail.node, e.detail.results);
});

// plain addEventListener works too, and is typed in TypeScript:
g.addEventListener("graphty-node-click", (e) => console.log(e.detail.id));

off();   // unsubscribe
```

The full list is in the [Events reference](./reference/events.md). The contract: **every
declared event is emitted, and every emitted event is subscribable.**

## 7. Export what you found

```js test=browser name=quickstart-capture
const png = await g.capture({ format: "png", scale: 2, legend: true });
// png.blob, png.width, png.height, png.bytes, png.legendBlocks
```

```js test=browser name=quickstart-export
const csv = await g.session.data.export("csv", { include: { results: "all" } });
// csv.blob, csv.manifest -- every run that produced a column, with its parameters
```

Every export carries a run manifest, because a result without its parameters is not
evidence.

## The whole thing, in one block

```html test=browser name=quickstart-complete
<!doctype html>
<meta charset="utf-8">
<script type="module"
        src="https://cdn.jsdelivr.net/npm/@graphty/graphty-element@2/dist/graphty.bundle.js"></script>

<graphty-element id="g" sample="karate" layout="force"
               style="display: block; height: 70vh"></graphty-element>
<p id="bar"></p>

<script type="module">
  const g = document.getElementById("g");
  const bar = document.getElementById("bar");

  await g.ready;

  const run = g.run("betweenness");     // a Run; awaiting it gives the RunResult
  await run;
  await g.encode({ run, channel: "node.color", palette: "viridis", scale: "sqrt" });
  await g.encode({ run, channel: "node.size", scale: "sqrt" });

  g.on("graphty-node-click", (e) => {
    const v = e.detail.results[run.id]?.value;
    bar.textContent = `${e.detail.id}: betweenness ${v?.toFixed(4) ?? "-"}`;
  });

  const png = await g.capture({ format: "png", scale: 2, legend: true });
  console.log(`${png.width}x${png.height}, ${(png.bytes / 1e6).toFixed(1)} MB`);
</script>
```

## It did not work

| What you see | Why | Fix |
|---|---|---|
| A blank page, no errors | the element has no height | `style="display:block; height:480px"` |
| Nodes but no edges, and an error in the console | the endpoint columns were not recognised | the error's `details.columns` lists what was found; pass an `ImportPlan` -- see [Data](./guide/data.md#two-phase-load) |
| `[object Object]` in a console error naming a property | a framework set a rich value as an HTML attribute before the element upgraded | set it as a property, or import the element eagerly -- see [React](./guide/frameworks/react.md) |
| `E_NO_ACCELERATOR` | you set `acceleration="required"` and there is no GPU | read `session.capabilities.acceleration.reason`; drop to `"auto"` |
| It renders but drags | the graph is above the render ceiling; the element is in performance mode | `g.rendered.performanceMode.reasons` says why -- see [Troubleshooting](./guide/troubleshooting.md) |

## Next

- [Installation](./guide/install.md) -- npm, bundlers, peer dependencies, CSP, SSR
- [Data](./guide/data.md) -- formats, column mapping, mutations, computed attributes
- [Styling](./guide/styling.md) -- the layer model, encodings, templates
- [The whole API on one page](./API.md) -- every attribute, method and event
- [Recipes](./recipes/) -- one page per concrete task
````

Three properties of that page worth naming, because they are what the current page lacks:

1. **Every block runs.** Nine browser-tested blocks, each of which becomes a test case. A
   rename of `encode`, `capture`, `betweenness` or `graphty-node-click` breaks CI.
2. **It never types a list.** Layout names, format names, algorithm names, event names and
   palette names are all links into generated reference pages. The three factual errors in
   the current page are all typed lists.
3. **It ends where the reader's next question is.** The troubleshooting table is on the page,
   not a link away, because a reader whose canvas is blank does not click "Next".

### 3.4 Recipes, ordered by the questions people actually ask

A recipe is one page, one task, one copy-pasteable block, tested like everything else. The
order is by how often the question comes up, not by API area.

| # | `recipes/<file>.md` -- the title is the question | Primary API |
|---|---|---|
| 1 | How do I load a CSV / GraphML / GEXF file? | `data.inspect` + `data.import` |
| 2 | How do I colour nodes by a property? | `styles.encode` with `by: "data.x"` |
| 3 | How do I colour nodes by a metric I computed? | `run()` + `encode({ run })` |
| 4 | How do I handle a click and show my own panel? | `graphty-node-click`, `data.neighbors` |
| 5 | How do I render 100,000 nodes without freezing the tab? | `acceleration`, `status.loading`, `view.rendered` |
| 6 | How do I search for a node and select it? | `data.find`, `selection.set`, `camera.zoomToNodes` |
| 7 | How do I hide everything except what matters? | `visibility.set(filter)`, `scope.count` |
| 8 | How do I find communities and label them? | `run("louvain")`, `encode`, `styles.legend` |
| 9 | How do I find the path between two nodes? | `run("shortest-path", { from, to })`, `kind: "highlight"` |
| 10 | How do I export a PNG with a legend for a slide? | `plan({op:"view.capture"})`, `capture({legend:true})` |
| 11 | How do I export my results as CSV? | `data.export("csv", { include: { results: "all" } })` |
| 12 | How do I use this in React? | `./react`, or React 19 props |
| 13 | How do I turn on WebGPU, and how do I know it is on? | `import ".../webgpu"`, `capabilities.acceleration` |
| 14 | How do I expand a neighbourhood one hop at a time? | `data.expand`, `plan()` preview, `data.collapse` |
| 15 | How do I save a view and come back to it? | `camera.bookmark`, `positions.snapshot`, `styles.toDocument` |
| 16 | How do I undo a change? | `MutationReceipt.inverse`, `session.run(inverse)` |
| 17 | How do I record what I did and replay it on another file? | `journal.export`, `journal.replay({ onData })` |
| 18 | How do I compare two graphs side by side? | two views one session; `createComparison` |
| 19 | How do I show a progress bar and a cancel button? | `Run.progress`, `Run.cancel`, `graphty-run-change` |
| 20 | How do I step through time? | `visibility.window`, `visibility.steps` |
| 21 | How do I merge duplicate nodes? | `data.apply({kind:"merge-nodes"})`, `plan()` preview |
| 22 | How do I compute a new attribute from existing ones? | `data.compute(name, formula)` |
| 23 | How do I add my own algorithm? | `defineAlgorithm` + `use` |
| 24 | How do I add my own file format? | `defineFormat` + `./io/*` |
| 25 | How do I run this in a test with no browser? | `createGraphSession` from `./session` |
| 26 | How do I generate a report? | `report({ format: "pdf", sections })` |

Each recipe page is the same five sections, so a reader who has read one has read the shape
of all of them:

```
# How do I <question>?

<one sentence saying what you will have when you are done>

## The short version
<one fenced block, 5-25 lines, test=browser or test=node>

## What each part does
<a bulleted walk-through of the block, one bullet per non-obvious line>

## Variations
<two or three: the same task with a different option>

## Gotchas
<the failure modes, each with the error code it produces>

## See also
<links to the guide pages and the reference entries used>
```

### 3.5 The two READMEs are documentation, not signage

`graphty-element/README.md` is the npm package page and is where most strangers land. The
2.0 version carries: the install line; the complete CDN example from quickstart step 1;
the `source`/`target` note; working documentation links; badges that describe this
repository; and the "needs a height" sentence. Nothing else -- every other link goes to the
docs site.

The repo root `README.md` currently contains no fenced code block at all, lists
graphty-element second (after the private, unpublishable React app), and presents nine
packages as peers with no hierarchy. The 2.0 version leads with graphty-element -- install
line, the 20-line example, a working docs link -- and puts the package inventory below it
under a heading that says what the other eight are (internals and optional peers).

`graphty-element/AGENTS.md` is new; it is described under "Documentation for coding agents".

---

## 4. Documentation for coding agents

Six artifacts. The ranking is by benefit per unit of work, and each is a file with a name,
a format and a consumer.

| # | Artifact | Where it lives | Who reads it |
|---|---|---|---|
| 1 | `custom-elements.json` (CEM 2.1.0) | `dist/`, pointed at by `package.json` `customElements` | editors, Storybook docgen, CEM linters, wrapper generators |
| 2 | `llms.txt` + `llms-full.txt` + `.md` page twins | `/docs/` and `/docs/graphty-element/` | any agent told "read the docs" |
| 3 | `graphty-commands.json` + `graphty-commands.schema.json` | `dist/` and `/docs/graphty-element/` | an agent generating or validating an operation |
| 4 | `graphty-tools.json` | `dist/` and `/docs/graphty-element/` | an LLM tool layer, including the element's own |
| 5 | `api.json` (TypeDoc) | `dist/` | a generator; too verbose to read directly |
| 6 | `AGENTS.md` | the tarball root and `/docs/graphty-element/` | a coding agent working in a consumer repo |

### 4.1 Why the current state fails an agent

An agent sent to `https://graphty.app/docs/graphty-element/api/` downloads **195 KB of
VitePress HTML** for a few KB of content, and what it finds is a tour of the source tree:
the live page lists modules named `algorithms`, `config`, `data`, `Edge`, `events`, `Graph`,
`graphty-element`, `layout`, `managers`, `Node`, `Styles`. There is no page that answers
"what does `import {...} from '@graphty/graphty-element'` give me". The richest example
corpus in the project -- 20 Storybook story files at `/storybook/element/` -- is behind a
6 KB JS shell and is invisible to any non-JS fetcher.

### 4.2 `llms.txt`, `llms-full.txt` and `.md` twins

The specification (llmstxt.org, fetched 2026-09-19) requires an H1 with the project name --
"the only required section" -- then an optional blockquote summary, optional free content,
and H2-delimited sections of markdown links, each optionally followed by `: notes`. A
`## Optional` section marks URLs an agent may skip when context is tight. A file at
`/docs/llms.txt` covers everything under `/docs/`; a more specific file wins, so
`/docs/graphty-element/llms.txt` is the one an agent lands on for the element.

**Generator.** `vitepress-plugin-llms` (npm, v1.14.0) emits `llms.txt`, `llms-full.txt` and
a `.md` twin of every page as build output. VitePress's own site ships all three
(`https://vitepress.dev/llms.txt` 200, `llms-full.txt` 200 at 222 KB,
`https://vitepress.dev/guide/getting-started.md` 200), so the pattern is proven on this
exact stack.

`docs/.vitepress/config.ts`:

```ts
import { defineConfig } from "vitepress";
import llmstxt from "vitepress-plugin-llms";

export default defineConfig({
    base: "/docs/",
    ignoreDeadLinks: false,
    vite: {
        plugins: [
            llmstxt({
                domain: "https://graphty.app",
                // One scoped index per package, plus the site-wide one.
                workspaces: [
                    { name: "graphty-element", path: "graphty-element" },
                    { name: "algorithms", path: "algorithms" },
                    { name: "layout", path: "layout" },
                ],
                // Generated reference pages are in llms-full.txt but are not
                // individually listed in the index -- API.md covers them.
                ignoreFiles: ["graphty-element/reference/types/**"],
            }),
        ],
    },
});
```

The hand-written head of `/docs/graphty-element/llms.txt` comes from
`graphty-element/docs/index.md` frontmatter, so it is maintained in one place. The emitted
file reads:

```
# graphty-element

> A web component that puts a graph on a page and lets a person or a program work with it:
> load data, measure it, colour it, filter it, arrange it, select things, export what they
> found. One script tag to a working graph; one import to a headless analysis session.

Install: npm install @graphty/graphty-element
Tag: <graphty-element>
Machine-readable API: /docs/graphty-element/graphty-commands.json,
/docs/graphty-element/graphty-tools.json, package.json "customElements" ->
dist/custom-elements.json

## Start here

- [The whole API on one page](https://graphty.app/docs/graphty-element/API.md): every attribute, property, method, event, error code and command op, generated from the source of truth.
- [Quickstart](https://graphty.app/docs/graphty-element/quickstart.md): zero to a rendered, measured, coloured graph.
- [Installation](https://graphty.app/docs/graphty-element/guide/install.md): npm, CDN, bundlers, peer dependencies, the height requirement, CSP, SSR.

## Guide

- [Data](https://graphty.app/docs/graphty-element/guide/data.md): record shapes, source/target, two-phase inspect/import, mutations, computed attributes.
- [Algorithms](https://graphty.app/docs/graphty-element/guide/algorithms.md): Run objects, progress, cancellation, cost estimates, result shapes.
...

## Reference (generated)

- [Element](https://graphty.app/docs/graphty-element/reference/element.md): 11 attributes with defaults, properties, methods, 2 slots.
- [Events](https://graphty.app/docs/graphty-element/reference/events.md): 22 DOM events and 13 session events with their detail shapes.
- [Commands](https://graphty.app/docs/graphty-element/reference/commands.md): the Command union, op by op, with a JSON Schema.
- [Errors](https://graphty.app/docs/graphty-element/reference/errors.md): every GraphtyErrorCode, what causes it, what to do.
- [Algorithms](https://graphty.app/docs/graphty-element/reference/algorithms.md): every registered algorithm with its options, cost class and result fields.
- [Layouts](https://graphty.app/docs/graphty-element/reference/layouts.md), [Formats](...), [Palettes](...), [Scales](...), [Config keys](...).

## Recipes

- [How do I load a CSV file?](https://graphty.app/docs/graphty-element/recipes/load-a-file.md)
...

## Optional

- [Extending](https://graphty.app/docs/graphty-element/guide/extending/algorithm.md)
- [Migration from 1.x](https://graphty.app/docs/graphty-element/migration/v1-to-v2.md)
- [Runnable examples](https://graphty.app/docs/graphty-element/examples/)
```

Two rules for the index, both enforced by the `llms.txt` invariants test described later:

- **The first three links must be enough.** `API.md` plus `quickstart.md` plus
  `install.md` is a complete working surface. An agent with a small context budget reads
  those three and stops.
- **Every entry carries a `: note`.** A bare link is a link an agent must fetch to evaluate.
  The note is what lets it skip.

### 4.3 The Custom Elements Manifest

**The one-line fix first.** `graphty-element/package.json` gains:

```json
{
  "customElements": "./dist/custom-elements.json"
}
```

The convention is stated in the custom-elements-manifest README: "This convention allows
tooling to discover custom element manifests without downloading package tarballs." The
manifest is already in the tarball (`dist/custom-elements.json`, 35,676 bytes, generated by
`vite-plugin-cem` per `graphty-element/vite.config.ts:16-19`); the registry metadata for
1.10.0 reports `customElements: undefined`, so nothing can find it.

**Then make it true.** Four changes to the generation:

1. **Upgrade the analyzer.** The emitted `schemaVersion` is `1.0.0`; the current schema is
   `2.1.0`. `vite-plugin-cem@0.8.4` depends on `@custom-elements-manifest/analyzer ^0.10.4`.
   Pin a 2.x-emitting analyzer, or drop the Vite plugin and run
   `@custom-elements-manifest/analyzer` as a build step with its own
   `custom-elements-manifest.config.mjs`. The second is preferable because it gives us the
   plugin hook in point 4.
2. **Widen the input and exclude privates.** `files: ["./src/graphty-element.ts"]` analyses
   one module. Point it at the public entry (`./index.ts`) plus the element module, and set
   the analyzer to drop `#private` fields -- today 18 appear among the 34 `field` members
   (19 `#`-prefixed members in all).
3. **Declare the events.** The manifest records exactly one event and it has no name:
   `[{ "type": { "text": "CustomEvent" } }]`. The cause is
   `graphty-element/src/graphty-element.ts:97`, a single `dispatchEvent(new CustomEvent(event.type, ...))`
   whose name is computed at runtime; the analyzer can only see "a CustomEvent". There are
   zero `@fires`, `@event`, `@slot`, `@csspart` and `@cssprop` JSDoc tags anywhere in
   `graphty-element/src`. In 2.0 the twenty-two DOM events are a declared table (see
   "Generation from one source of truth"), and a small analyzer plugin reads that table and
   writes the `events[]` array with names and `detail` types. That is point 4.
4. **Generate the manifest's variable parts from the source of truth**, via an analyzer
   plugin in `graphty-element/custom-elements-manifest.config.mjs`:

```js
// graphty-element/custom-elements-manifest.config.mjs
import { eventDescriptors } from "./dist/api/events.js";
import { attributeDescriptors } from "./dist/api/attributes.js";

/** Writes events[], attributes[] defaults, slots[] and cssParts[] from the runtime tables. */
function graphtyDescriptors() {
    return {
        name: "graphty-descriptors",
        packageLinkPhase({ customElementsManifest }) {
            for (const mod of customElementsManifest.modules) {
                for (const decl of mod.declarations ?? []) {
                    if (decl.tagName !== "graphty-element") continue;
                    decl.events = eventDescriptors.map((e) => ({
                        name: e.name,
                        description: e.description,
                        type: { text: `CustomEvent<${e.detailType}>` },
                    }));
                    decl.attributes = attributeDescriptors.map((a) => ({
                        name: a.attribute,
                        fieldName: a.property,
                        description: a.description,
                        type: { text: a.type },
                        default: JSON.stringify(a.default),
                    }));
                    decl.slots = [
                        { name: "data", description: 'A <script type="application/json"> graph' },
                        { name: "theme", description: 'A <script type="application/json"> theme' },
                    ];
                    decl.members = (decl.members ?? []).filter((m) => !m.name.startsWith("#"));
                }
            }
        },
    };
}

export default {
    globs: ["index.ts", "src/graphty-element.ts"],
    outdir: "dist",
    litelement: true,
    plugins: [graphtyDescriptors()],
};
```

The manifest is then validated in CI against the published JSON Schema for CEM 2.1.0, so
"the manifest is complete" is a check, not an aspiration.

### 4.4 TypeDoc JSON

The `outputs` entry in the rewritten `typedoc.json` writes `graphty-element/dist/api.json`: a
complete, typed, comment-carrying reflection dump of the public entry points. TypeDoc
supports both outputs at once, so the markdown reference and the JSON come from one
invocation.

It is **not** the file an agent is pointed at. Reflection IDs and numeric `kind` values make
it verbose and structurally awkward to read; it is a *source* for generators. Two consumers:

- `tools/generate-reference.mjs` reads it to emit `reference/types.md` and the type columns
  of `API.md`;
- a schema-shaped diff in CI compares `api.json` between the base and the head of a PR and
  fails when a public symbol changes without a matching row in `migration/v1-to-v2.md` or a
  changeset. That is how "breaking changes must each be recorded" becomes mechanical.

It ships in the tarball so a consumer's own tooling can read it offline.

### 4.5 The command registry becomes a machine-readable tool description

The element already maintains a named, described, schema'd, example-carrying description of
its own operations. Today it uses that description only to prompt an in-browser LLM. 2.0
turns it outward, and it needs no new invention.

**What exists today.** `graphty-element/src/ai/commands/types.ts:53-70` defines:

```ts
export interface GraphCommand {
    readonly name: string;              // used as the tool name
    readonly description: string;       // used in the LLM prompt
    readonly parameters: z.ZodType;     // Zod schema
    readonly examples: CommandExample[];
    execute(graph: Graph, params: Record<string, unknown>, context?: CommandContext): Promise<CommandResult>;
}
```

There are roughly 20 such commands across eight files in
`graphty-element/src/ai/commands/` (AlgorithmCommands, CameraCommands, CaptureCommands,
LayoutCommands, ModeCommands, QueryCommands, SchemaCommands, StyleCommands), registered in
`CommandRegistry.ts`.

**What 2.0 does with it.** In 2.0 the `Command` union is the canonical serialisation of every
operation -- every method is a command, and every command is a method -- and the union plus a
JSON Schema is emitted at build to `dist/graphty-commands.json`. The AI command registry
stops being a parallel hand-written list and becomes a *projection* of that union.
Concretely, `src/api/commands.ts` carries, next to the TypeScript union, a runtime descriptor
array:

```ts
// graphty-element/src/api/commands.ts  (source of truth)
export interface CommandDescriptor {
    readonly op: Command["op"];
    readonly title: string;             // "Run an algorithm"
    readonly description: string;       // one paragraph, used verbatim as a tool description
    readonly parameters: z.ZodType;     // validated at runtime by session.run()
    readonly mutates: boolean;
    readonly undoable: boolean;
    readonly costClass: CostClass;
    readonly examples: readonly { title: string; command: Command }[];
    readonly since: string;             // "2.0.0"
}

export const commandDescriptors: readonly CommandDescriptor[] = [ /* one per op */ ];
```

**Three artifacts are emitted from that one array** by
`graphty-element/scripts/generate-api-artifacts.mjs`:

1. `dist/graphty-commands.json` -- the descriptors with their Zod schemas converted by
   `zod-to-json-schema`, each with its examples. This is the file an agent reads to learn
   what operations exist.

```json
{
  "version": "2.0.0",
  "commands": [
    {
      "op": "algo.run",
      "title": "Run an algorithm",
      "description": "Starts one algorithm with one parameter set over one scope and returns a Run. Awaiting the Run gives its result. Results are addressed at results.<runId>.<field>.",
      "mutates": false,
      "undoable": false,
      "costClass": "iterative",
      "since": "2.0.0",
      "parameters": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
          "op":        { "const": "algo.run" },
          "algorithm": { "type": "string", "description": "A key from catalog.algorithms()" },
          "params":    { "type": "object", "additionalProperties": true },
          "scope":     { "$ref": "#/$defs/Scope" },
          "seed":      { "type": "integer" },
          "as":        { "type": "string", "pattern": "^[a-z][a-z0-9_-]*$",
                         "description": "Author-assigned run id. Required for anything persisted." },
          "style":     { "type": "boolean", "default": true }
        },
        "required": ["op", "algorithm"]
      },
      "examples": [
        { "title": "Betweenness on the whole graph",
          "command": { "op": "algo.run", "algorithm": "betweenness" } },
        { "title": "Louvain at a named resolution, with a stable id",
          "command": { "op": "algo.run", "algorithm": "louvain",
                       "params": { "resolution": 1.2 }, "as": "communities" } }
      ]
    }
  ]
}
```

2. `dist/graphty-commands.schema.json` -- one JSON Schema for the whole `Command` union
   (a `oneOf` over the per-op schemas, discriminated on `op`). This is what a consumer or an
   agent validates a generated command against *before* sending it, and what CI validates
   every example in the docs against.

3. `dist/graphty-tools.json` -- the same descriptors reshaped as tool definitions, which is
   the shape an LLM tool layer and an MCP server both want:

```json
{
  "version": "2.0.0",
  "tools": [
    {
      "name": "graphty_algo_run",
      "description": "Starts one algorithm with one parameter set over one scope...",
      "input_schema": { "type": "object", "properties": { "algorithm": {...} }, "required": ["algorithm"] }
    }
  ]
}
```

The element's own AI stack (`./ai`) consumes `commandDescriptors` directly, so the tool list
an in-browser LLM sees and the tool list a coding agent reads are the same array. That is
what makes the agent documentation correct by construction rather than by discipline: if a
command is added without a descriptor, `session.run()` rejects it with `E_BAD_COMMAND`,
because the descriptor array is also the runtime validation table.

All three are published to `/docs/graphty-element/` as well as into the tarball, so they are
fetchable without an npm install. `llms.txt` names them in its header.

### 4.6 `AGENTS.md`

`graphty-element/CLAUDE.md` exists and documents how to work *on* the package. It is the
wrong document for a consumer's agent. New file `graphty-element/AGENTS.md`, shipped in the
tarball (`files[]`) and published at `/docs/graphty-element/AGENTS.md`, written for an agent
editing a *consumer's* repository. It is short and is mostly the list of things that are
wrong in generated code:

```
# Using @graphty/graphty-element (for coding agents)

Tag: <graphty-element>. Install: npm install @graphty/graphty-element

Machine-readable:
- dist/custom-elements.json  (package.json "customElements") - attributes, events, slots
- dist/graphty-commands.json - every operation, with JSON Schema and examples
- dist/graphty-tools.json    - the same as tool definitions
- dist/api.json              - TypeDoc reflection of the public entry points
- https://graphty.app/docs/graphty-element/llms.txt

Entry points: "." (element, needs a DOM), "./session" (headless, Node-safe),
"./schema", "./catalog", "./commands", "./extend", "./format", "./react",
"./webgpu", "./io/*", "./ai", "./bundle".

The five things generated code gets wrong:
1. No height. <graphty-element> is display:inline with no intrinsic size. Always set
   style="display:block; height:...".
2. Edge fields are source/target. src/dst and from/to are accepted and reported;
   anything else fails with E_EDGE_ENDPOINTS_UNRESOLVED.
3. Rich values are PROPERTIES, not attributes. el.data = {...}, never data='{...}'.
   There are exactly eleven attributes and all of them are strings or booleans.
4. Results are at results.<runId>.<field>, addressed by the Run you got back.
   There is no algorithmResults namespace in 2.x.
5. run() returns a Run, not a Promise<void>. It is awaitable, has .progress,
   .cancel() and .id, and it is safe to fire and forget.

Never import from "@graphty/graphty-element/dist/..." directly; use the exports map.
```

---

## 5. Generation from one source of truth

### 5.1 What the source of truth is

It is **not** the markdown, **not** the TypeDoc output, and **not** a schema file maintained
alongside the code. It is a small set of TypeScript modules under
`graphty-element/src/api/` that the **runtime itself uses**, each exporting a frozen array
of descriptors. Because the runtime reads them, a descriptor that is missing or wrong is a
runtime bug, not a documentation bug -- which is the only mechanism that actually prevents
drift.

| Module | Exports | Used at runtime by | Generates |
|---|---|---|---|
| `src/api/attributes.ts` | `attributeDescriptors` | the Lit `static properties` block and the attribute converters | CEM `attributes[]`, `reference/element.md`, `API.md` |
| `src/api/events.ts` | `eventDescriptors` | the dispatcher (an event not in the table cannot be emitted) | CEM `events[]`, `GraphtyEventMap`, `reference/events.md` |
| `src/api/commands.ts` | `commandDescriptors` | `session.run()` parameter validation and the dispatch table | `graphty-commands.json`, `graphty-commands.schema.json`, `graphty-tools.json`, `reference/commands.md` |
| `src/api/errors.ts` | `errorDescriptors` | `GraphtyError` construction; the code is looked up here | `reference/errors.md`, the error index in `API.md` |
| `src/api/config.ts` | `configKeyDescriptors` | `ConfigDocument.set`/`reset`/`applyDocument` validation | `reference/config.md` |
| `src/api/catalog/*.ts` | `algorithmDescriptors`, `layoutDescriptors`, `formatDescriptors`, `paletteDescriptors`, `scaleDescriptors`, `themeDescriptors`, `functionDescriptors` | `session.catalog.*`, which returns exactly these | `reference/{algorithms,layouts,formats,palettes,scales,themes}.md`, the `KnownAlgorithm` and `LayoutId` union types |

Most of this the 2.0 API already requires: descriptors are plain JSON crossing the element
boundary, `CatalogApi` returns descriptor arrays, and `KnownAlgorithm` is generated from the
built-in catalogue at build time. Three surfaces had no owner and get one here: attributes,
events and errors.

**The union types are generated, not hand-written.** `KnownAlgorithm`, `LayoutId`,
`FormatId`, `PaletteId` and `GraphtyErrorCode` are emitted into
`src/api/generated/unions.ts` from the descriptor arrays by the same generator, and that
file is committed with the repo's auto-generated banner pointing at the generator, per the
rule that only script-generated files carry that warning:

```ts
// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE.
// INSTEAD EDIT graphty-element/src/api/catalog/*.ts AND RUN
// `npm run -w @graphty/graphty-element generate:api`.
export type KnownAlgorithm = "degree" | "betweenness" | ... ;
```

This closes the loop that produced the layout-name defect: today the docs list
`hierarchical` and `grid`, which no engine registers, while eleven registered engines are
undocumented, and the only way to learn the real list is to grep `static type` across
sixteen files in `graphty-element/src/layout/`.

### 5.2 What is generated, from what, to where

```
graphty-element/src/api/*.ts  (descriptors, used by the runtime)
        |
        |  npm run generate:api  -> scripts/generate-api-artifacts.mjs
        |     (imports the BUILT dist/ modules, so it generates from what ships)
        v
   +--------------------------------------------------------------+
   | dist/graphty-commands.json         dist/graphty-tools.json    |
   | dist/graphty-commands.schema.json  dist/graphty-catalog.json  |
   | src/api/generated/unions.ts        (committed, banner)        |
   +--------------------------------------------------------------+

graphty-element/index.ts + src/api/*.ts
        |
        |  typedoc
        v
   dist/api.json                  docs/graphty-element/reference/types/**.md

index.ts + src/graphty-element.ts + src/api/{events,attributes}.ts
        |
        |  @custom-elements-manifest/analyzer + the descriptor plugin
        v
   dist/custom-elements.json

dist/*.json + dist/api.json
        |
        |  npm run docs:reference -> tools/generate-reference.mjs
        v
   graphty-element/docs/reference/{element,events,commands,errors,config,
                                   algorithms,layouts,formats,palettes,scales,themes}.md
   graphty-element/docs/API.md

graphty-element/docs/**            (prose, hand-written; reference/ generated)
        |
        |  tools/copy-docs-content.js  ->  docs/graphty-element/
        |  vitepress build + vitepress-plugin-llms
        v
   docs/.vitepress/dist  ->  public/docs/  ->  https://graphty.app/docs/
```

### 5.3 The generators, named

| Script | Input | Output | Run by |
|---|---|---|---|
| `graphty-element/scripts/generate-api-artifacts.mjs` | built `dist/api/*.js` | the four `dist/*.json`, `src/api/generated/unions.ts` | `npm run build` (after `vite build`, before `tsc`) |
| `graphty-element/custom-elements-manifest.config.mjs` (plugin) | `index.ts`, `src/graphty-element.ts`, the descriptor tables | `dist/custom-elements.json` | `npm run build` |
| `tools/generate-reference.mjs` | `dist/*.json`, `dist/api.json` | `graphty-element/docs/reference/*.md`, `docs/API.md` | `npm run docs:reference`, called by `docs:build` |
| `tools/extract-doc-tests.mjs` | `graphty-element/docs/**/*.md` | `graphty-element/test/docs/__generated__/*.doctest.ts` | `npm run docs:tests`, called by `pretest` and by CI |
| `tools/build-redirects.mjs` | the built `public/docs/graphty-element/` tree | redirect stubs under `public/docs/graphty/` | `deploy-pages.yml` |

Root `package.json` scripts, replacing lines 32-40:

```json
{
    "docs:reference": "node tools/generate-reference.mjs",
    "docs:api": "npm run docs:api:graphty-element && npm run docs:api:algorithms && npm run docs:api:layout",
    "docs:api:graphty-element": "cd graphty-element && typedoc",
    "docs:api:algorithms": "cd algorithms && typedoc",
    "docs:api:layout": "cd layout && typedoc",
    "docs:content": "node tools/copy-docs-content.js",
    "docs:tests": "node tools/extract-doc-tests.mjs",
    "docs:build": "npm run docs:reference && npm run docs:api && npm run docs:content && vitepress build docs",
    "docs:dev": "vitepress dev docs",
    "docs:preview": "vitepress preview docs"
}
```

Note what left: the two `sanitize-api-docs.js` invocations and the `--out` overrides, both
deleted by the fix list above.

### 5.4 The three tests that keep the loop closed

Generation alone does not prevent drift; it moves the drift to the boundary between the
generator's input list and the real surface. Three tests close that:

- **The packaging test: the exports map, the TypeDoc entry points and the `files[]` list
  agree.** A unit test in `graphty-element/test/api/packaging.test.ts` reads `package.json`,
  `typedoc.json` and the built `dist/` and asserts that every `exports` key resolves to a
  file that exists, is covered by `files[]`, and appears in `typedoc.json` `entryPoints`.
  This is the test that would have caught the TypeDoc entry-point drift the day it happened.
- **The event-contract test: every declared event is emitted and every emitted event is
  declared.** A browser test drives the element through a scripted session with a wildcard
  listener and asserts the set of observed event names is a subset of `eventDescriptors`, and
  a source test asserts the dispatcher cannot emit a name not in the table. This is the
  mechanical form of the contract sentence, and it is what makes the four throw-on-subscribe
  events (`src/managers/EventManager.ts:450`) and the twelve never-emitted events impossible.
- **The catalogue test: every catalogue entry is runnable.** For each `algorithmDescriptors`
  entry, a node test in the `docs` project runs it on a 34-node fixture and asserts the
  declared `fields[]` all appear on the result. A descriptor for an algorithm that is not
  wired fails the build, which is the honest version of "23 of 130 algorithms are wired".

---

## 6. Executable documentation

### 6.1 The rule and the fence syntax

> **Every fenced code block in `graphty-element/docs/**` runs in CI. A block with no test
> directive fails the docs build.**

The directive lives in the fence info string, after the language:

````text
```js test=browser name=quickstart-run
```js test=node    name=headless-settle
```html test=browser name=quickstart-cdn
```ts test=types   name=typed-listener
```json test=schema name=command-algo-run schema=graphty-commands
```bash test=none reason="shell command, not executable in the harness"
````

| Directive | Where it runs | What "passing" means |
|---|---|---|
| `test=browser` | the `docs` vitest project, Playwright Chromium | the block runs against a real `<graphty-element>` with no thrown error and no `graphty-error` event |
| `test=node` | the `docs` vitest project, node environment | the block runs against `createGraphSession()` from `./session` with no thrown error |
| `test=types` | `tsc --noEmit` over a generated file | the block type-checks against the built `dist/*.d.ts` |
| `test=schema` | a node test | the JSON validates against the named schema in `dist/` |
| `test=none reason="..."` | nowhere | the reason is recorded and rendered in the extraction report |

`name=` is required for every executable block and must be unique across the corpus; it
becomes the test name, so a failure report says `quickstart-run` rather than
`quickstart.md:112`.

### 6.2 The extractor

`tools/extract-doc-tests.mjs` walks `graphty-element/docs/**/*.md`, parses fences with
`markdown-it` (already a VitePress dependency), and writes one file per block into
`graphty-element/test/docs/__generated__/`. Generated files carry the repo's
auto-generated banner pointing at the extractor.

A `test=browser` block becomes:

```ts
// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE.
// INSTEAD EDIT graphty-element/docs/quickstart.md AND RUN
// `node tools/extract-doc-tests.mjs`.
import { expect, test } from "vitest";
import { mountDocFixture } from "../harness";

test("quickstart-run (docs/quickstart.md:118)", async () => {
    const { g, errors } = await mountDocFixture({ sample: "karate" });
    // --- begin block ---
    const run = g.run("betweenness");
    console.log(run.id, run.label);
    console.log(run.progress.fraction);
    const result = await run;
    console.log(result.summary().top[0]);
    console.log(result.reading());
    // --- end block ---
    expect(errors).toEqual([]);
});
```

`graphty-element/test/docs/harness.ts` supplies the four things a block assumes without
saying so -- a mounted, sized element with a sample graph, a `fileInput` stub, a
`console.log` capture, and a `graphty-error` collector -- so the prose stays readable and
the test stays real. An `html` block is mounted whole, with the CDN script rewritten to the
locally built `dist/graphty.bundle.js` so the test does not depend on a CDN.

Blocks that continue a previous block (step 2 uses `g` from step 1) are chained by page:
all `test=browser` blocks in one page run in one test in document order, under one mount,
unless a block carries `fresh=true`. That matters because a reader reads a page top to
bottom and pastes cumulatively, and the test must fail if step 4 does not work after
step 3.

### 6.3 Where the tests run

A sixth vitest project in `graphty-element/vitest.config.ts`, alongside `default`,
`browser`, `interactions`, `storybook` and `llm-regression` (named at lines 14, 59, 105,
149 and 178):

```ts
            {
                test: {
                    name: "docs",
                    include: ["test/docs/__generated__/**/*.doctest.ts"],
                    browser: {
                        enabled: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        headless: true,
                    },
                    testTimeout: 30000,
                },
            },
```

Node blocks land in a second project `docs-node` with `environment: "node"`, because the
`./session` entry point is Node-safe by design and testing it in a browser would not prove
that.

Package scripts:

```json
{
    "docs:tests": "node ../tools/extract-doc-tests.mjs",
    "test:docs": "npm run docs:tests && vitest run --project=docs --project=docs-node",
    "test:shard:docs": "npm run test:docs"
}
```

CI gains one shard, `graphty-element-docs`, taking the list in root `CLAUDE.md` from 20
parallel test jobs to 21.

### 6.4 The other checks CI runs on the documentation

| Check | Command | Catches |
|---|---|---|
| Internal links resolve | `vitepress build` with `ignoreDeadLinks: false` | the 32 broken links that ship today |
| Every JSON command example validates | `node tools/check-command-examples.mjs` | a docs example that names an op or a parameter that no longer exists |
| The manifest is complete and valid CEM 2.1.0 | `node tools/check-manifest.mjs` -- validates `dist/custom-elements.json` against the CEM schema and asserts `events.length === eventDescriptors.length` (22 today), **zero** `#private` members -- an assertion, not a count -- and both slots present | the nearly-empty manifest reappearing |
| Public surface changes are recorded | `node tools/check-api-diff.mjs` -- diffs `dist/api.json` against the base ref; a removed or re-typed public symbol requires a matching row in `migration/v1-to-v2.md` or a changeset | an unrecorded breaking change |
| External links resolve | `node tools/check-external-links.mjs` over both READMEs and `graphty-element/docs/**` | the dead `graphty.app/docs/graphty/` links reappearing; a badge pointing at a dead or foreign project |
| `llms.txt` invariants | a node test: an H1 is present; every entry has a `: note`; the first three entries are `API.md`, `quickstart.md`, `install.md`; every listed URL exists in the build output | an index that has rotted away from the site |
| Tarball budget | `node tools/check-package-size.mjs` in `prepack` | a return to a 41 MB package |

The external-link check runs on a schedule as well as on PRs, because an external link rots
without anyone touching the repo. Failure on the schedule opens an issue rather than failing
a build.

`tools/check-external-links.mjs` needs no new dependency -- Node's `fetch` plus a markdown
link regex, with a 10-second timeout, a 3-retry budget and a `docs/link-allowlist.txt` for
hosts that reject HEAD from CI runners.

### 6.5 What this would have caught

Run against the tree as it stands today, the checks fail as follows, which is the argument
for building them:

- Internal links: 32 internal 404s.
- External links: 12 dead `graphty.app/docs/graphty/` links across two READMEs; 2 badges
  pointing at `graphty-org/graphty-element`.
- The `docs` test project: the quickstart's three factual errors, each as a distinct failing
  test -- `source`/`target` produces zero edges (an assertion on `report.counts.edges`),
  `layout="hierarchical"` throws `E_UNKNOWN_LAYOUT` in 2.0, and `style-template="dark"` is
  not an accepted value.
- The manifest check: `events.length` is 1 against a table of 22; 18 `#private` field members
  present.

---

## 7. Versioned docs across the major

2.0 ships thirty-one breaking changes at once. Existing consumers of 1.10.0 -- the graphty
app today, and anyone who installed from npm -- must not find their documentation deleted.

### 7.1 The three-surface answer

**Surface 1: the frozen 1.x archive.** VitePress has no built-in version switcher, and
maintaining two live doc trees is how a 1.x page silently acquires a 2.x example. So 1.x is
frozen as *build output*, not as maintained source:

1. At the `1.10.1` documentation-only release, check out that tag and run the existing docs
   build (`npm run docs:build` as it is today), producing `docs/.vitepress/dist`.
2. Commit that output once to `docs-archive/v1/` with a `docs-archive/README.md` explaining
   that it is a frozen build, never edited, regenerated only by re-running the tagged build.
   This is deliberately committed build output; it carries the auto-generated banner in its
   README pointing at the tag and the command.
3. `deploy-pages.yml` copies it:

```bash
                  if [ -d "./docs-archive/v1" ]; then
                    mkdir -p ./public/docs/v1
                    cp -r ./docs-archive/v1/* ./public/docs/v1/
                  fi
```

4. A post-processing step in the same script injects a banner into every archived page:

```html
<div style="background:#fef3c7;border-bottom:1px solid #f59e0b;padding:.75rem 1rem;font:14px system-ui">
  You are reading the documentation for graphty-element 1.x, which is no longer developed.
  <a href="/docs/graphty-element/">Go to the current documentation</a> or read the
  <a href="/docs/graphty-element/migration/v1-to-v2">migration guide</a>.
</div>
```

The archive is never rebuilt, so it can never drift, and it costs exactly one copy step.

**Surface 2: the version switcher in the live nav.** `docs/.vitepress/config.ts` gains a nav
dropdown, which is how a reader who landed on 2.x finds 1.x:

```ts
        nav: [
            { text: "Home", link: "/" },
            { text: "Packages", items: [ /* ... */ ] },
            {
                text: "2.x",
                items: [
                    { text: "2.x (current)", link: "/graphty-element/" },
                    { text: "1.x (archived)", link: "/docs/v1/graphty-element/", target: "_self" },
                ],
            },
        ],
```

**Surface 3: the migration guide.** `graphty-element/docs/migration/v1-to-v2.md`, with one
row per breaking change, generated from a machine-readable table so it cannot fall behind
the API design:

`graphty-element/src/api/breaking-changes.ts` (source of truth, shipped as
`dist/graphty-breaking-changes.json`):

```ts
export interface BreakingChange {
    readonly id: `BC${number}`;
    readonly title: string;
    readonly old: string;              // the 1.x spelling, as code
    readonly new: string;              // the 2.x spelling, as code
    readonly why: string;              // one sentence
    readonly codemod?: string;         // a jscodeshift transform name, if one exists
    readonly design: string;           // where the change is specified in the API design
}
```

Rendered as a table plus a per-change section. Every row's `new` field is a `test=types`
block, so a migration instruction that no longer compiles fails the build.

### 7.2 The last 1.x release: a documentation-only `1.10.1`

The migration guide is worth little if a consumer only discovers the breakage at install
time -- but a deprecation-warning bridge can only warn about things that have a 1.x
replacement, and almost nothing here does. `1.10.1` ships before 2.0, changes no behaviour
and no signature, and does three things:

1. Carries the documentation fixes listed under "Ship now", so the *published* README on
   every historical npm page has working links even before 2.0 exists. This is the item that
   pays for the release on its own: the eleven `graphty.app/docs/graphty/` links are printed
   on the npm page of 1.0.0 through 1.10.0 and npm README text is immutable, so the only fix
   is the redirect stubs plus a corrected README going forward.
2. Adds `"customElements": "./dist/custom-elements.json"` -- a one-line, non-breaking
   discoverability win that does not need to wait for 2.0.
3. Emits a `DEPRECATED.md` in the tarball listing everything 2.0 removes, with a link to
   `https://graphty.app/docs/graphty-element/migration/v1-to-v2`. A file costs nothing and
   reaches the same reader a console warning would, without a release that has to be kept
   green.

What it deliberately does **not** do is emit per-symbol deprecation warnings. A warning whose
replacement does not exist in 1.x is a scold rather than a migration aid, and the ten symbols
that could be warned about honestly (the tag, `layout-2d`, the AI barrel exports,
`setRenderSettings`, the manager getters, the `data-*` pair) are all in `DEPRECATED.md`
anyway.

### 7.3 After 2.0

- **Minors do not fork the docs.** A member added in 2.1 carries
  `<Badge type="tip" text="2.1+" />` in the reference, sourced from the descriptor's `since`
  field, so the badge is generated too.
- **`/docs/graphty-element/` always means the current major.** At 3.0, 2.x freezes into
  `/docs/v2/` by the same three steps, and `/docs/graphty-element/` becomes 3.x. The URLs
  printed on npm for 2.x continue to resolve -- to the 3.x page, with the version switcher
  one click away. That is the deliberate trade: a stale-but-present page beats a 404, which
  is the lesson of `/docs/graphty/`.
- **The archive is never deleted.** It is 1.7 MB of static HTML.

---

## 8. The npm tarball

### 8.1 What ships today

`graphty-element/package.json:23-27` is `files: ["dist/", "README.md", "LICENSE"]`. `dist/`
measures 39 MB across 158 files, of which 26 MB are `.map` files; the registry reports
`dist.unpackedSize: 41134911` for 1.10.0. Installing the package to evaluate it downloads
41 MB, most of it sourcemaps for a 3D engine the consumer did not ask about.

### 8.2 What ships at 2.0

```json
{
    "customElements": "./dist/custom-elements.json",
    "files": [
        "dist/**/*.js",
        "dist/**/*.d.ts",
        "dist/custom-elements.json",
        "dist/api.json",
        "dist/graphty-commands.json",
        "dist/graphty-commands.schema.json",
        "dist/graphty-tools.json",
        "dist/graphty-catalog.json",
        "dist/graphty-breaking-changes.json",
        "README.md",
        "AGENTS.md",
        "LICENSE"
    ]
}
```

| Ships | Does not ship | Why not |
|---|---|---|
| every `dist/**/*.js` including `graphty.bundle.js` | `dist/**/*.map` (26 MB) | published as a GitHub release asset instead (below) |
| every `dist/**/*.d.ts` | `dist/**/*.d.ts.map` | same |
| the six machine-readable JSON artifacts | `storybook-static/` | never was in `files[]`; belongs on the site |
| `README.md`, `AGENTS.md`, `LICENSE` | `examples/` | deployed to `/docs/graphty-element/examples/`, where they are runnable |
| -- | `src/` | the `sideEffects` array at `package.json:16-22` currently names three `src/` paths that are not even published; they are removed in 2.0 |

### 8.3 Sourcemaps

Dropping them entirely makes a production stack trace from a consumer's app unreadable, so
they are published, just not in the tarball:

1. The build stops emitting `//# sourceMappingURL=` comments into published files, so a
   browser does not 404 looking for a map that is not there.
2. `release.yml` attaches `graphty-element-sourcemaps-<version>.tgz` to the GitHub release.
3. `AGENTS.md` and `guide/troubleshooting.md` say where they are and how to point a debugger
   at them.

### 8.4 The budget, enforced

`tools/check-package-size.mjs`, run from `prepack`, parses `npm pack --dry-run --json` and
fails above a declared budget. The budget starts at **18 MB unpacked** -- below the measured
41.1 MB minus the 26 MB of maps, so it is achievable the day the maps leave -- and is
ratcheted down as the bundle split lands, since `./session`, `./schema`, `./catalog`,
`./commands`, `./extend` and `./format` carry no Babylon.

The budget lives in `graphty-element/package.json`:

```json
{
    "graphty": { "packageBudget": { "unpackedBytes": 18874368, "fileCount": 200 } }
}
```

A PR that crosses it fails with the three largest contributing files named, so the fix is
obvious rather than archaeological.

### 8.5 What the registry page will show

After 2.0, `https://www.npmjs.com/package/@graphty/graphty-element` shows: a README whose
every link resolves; `customElements` metadata that editors can act on; an unpacked size
under 18 MB; and provenance, which `package.json:28-31` already sets.

---

## 9. The implementer checklist

Four phases. The first is independent of the 2.0 API and should land first, because it fixes
what is broken for the people reading the docs today.

### Phase A -- publishing hygiene, ships as the documentation-only `1.10.1` (no API change)

- [ ] Replace all 11 `docs/graphty/` URLs in `graphty-element/README.md` (lines 6, 52, 53,
      54, 59, 60, 61, 62, 63, 64, 65) with `docs/graphty-element/`, so the npm page stops
      pointing readers at a 404.
- [ ] Repoint or delete the CI and coverage badges at `graphty-element/README.md:4,5`, which
      currently report on `graphty-org/graphty-element` rather than this monorepo.
- [ ] Apply the same URL replacement to the documentation badge at `README.md:25`.
- [ ] Fix the comment block at `.github/workflows/deploy-pages.yml:98`, which claims
      `/docs/graphty/` is where the element docs live and is the origin of both dead badges.
- [ ] Correct the docs and Storybook URL conventions at `CLAUDE.md:497-498`, and correct the
      graphty-element version in the package table (1.5.0 -> 1.10.0), so the conventions
      block stops teaching URLs that 404.
- [ ] Create `tools/build-redirects.mjs` and wire it into `deploy-pages.yml` after the docs
      copy step, so every URL printed in a 1.x npm README resolves.
- [ ] Create `docs/public/404.html` with the `/docs/graphty/` prefix rewriter and copy it to
      `./public/404.html` in the assembly step, so an unmatched path lands on a page with
      links rather than the GitHub Pages default.
- [ ] Create `layout/docs/index.md` so `/docs/layout/` stops 404ing behind two nav entries, a
      sidebar block and a README badge.
- [ ] In `deploy-pages.yml`, download and copy the `build-storybook-compact-mantine` artifact
      CI already uploads, and add the fifth entry to the Storybook index heredoc, so the
      Storybook that is built every run is actually published.
- [ ] Set `ignoreDeadLinks: false` at `docs/.vitepress/config.ts:40` and fix every link it
      reports, so the 32 internal 404s cannot come back.
- [ ] Build the docs on every PR at `.github/workflows/ci.yml:131-133` while keeping the
      artifact upload master-only, so a PR can no longer break the docs undetected.
- [ ] Add `"customElements": "./dist/custom-elements.json"` to `graphty-element/package.json`
      so editors and wrapper generators can find the manifest that already ships.
- [ ] Create `tools/check-external-links.mjs`; add it to the docs job and to a weekly
      schedule, so a README link that rots is reported rather than discovered by a reader.
- [ ] Verify: `curl -sI https://graphty.app/docs/graphty/guide/getting-started` returns 200
      and the body carries a canonical link to `/docs/graphty-element/quickstart`.

### Phase B -- the source of truth and the generators (with 2.0 implementation)

- [ ] Create `graphty-element/src/api/attributes.ts`, `events.ts`, `commands.ts`,
      `errors.ts`, `config.ts` and `catalog/*.ts` as descriptor arrays.
- [ ] Wire the runtime to them: the Lit properties block, the event dispatcher,
      `session.run()` validation, `GraphtyError` construction, `ConfigDocument` validation
      and `session.catalog.*` read these arrays and no other list. This is what makes a
      missing descriptor a runtime bug rather than a documentation bug.
- [ ] Create `graphty-element/scripts/generate-api-artifacts.mjs`; emit
      `dist/graphty-commands.json`, `dist/graphty-commands.schema.json`,
      `dist/graphty-tools.json`, `dist/graphty-catalog.json`,
      `dist/graphty-breaking-changes.json` and `src/api/generated/unions.ts`.
- [ ] Replace `vite-plugin-cem` with `@custom-elements-manifest/analyzer` plus
      `graphty-element/custom-elements-manifest.config.mjs` and the descriptor plugin; emit
      CEM 2.1.0 with every event named, every attribute carrying its default, both slots, and
      no `#private` members.
- [ ] Rewrite `graphty-element/typedoc.json`: public entry points,
      `entryPointStrategy: "resolve"`, `outputs` with markdown and `./dist/api.json`, so the
      reference describes the package rather than the source tree.
- [ ] Delete `graphty-element/scripts/sanitize-api-docs.js` and `tools/sanitize-api-docs.js`;
      handle generics in the VitePress config instead, so generated types stop being mangled
      by a regex.
- [ ] Delete `graphty-element/docs/.vitepress/`, the `graphty-element:docs:build` Nx target
      (`graphty-element/project.json:81`) and the four package-local `docs:*` scripts, so
      there is one docs site with one `base`.
- [ ] Create `tools/generate-reference.mjs`; emit the eleven `reference/*.md` pages and
      `docs/API.md`.
- [ ] Add `graphty-element/src/api/global.d.ts` with `HTMLElementTagNameMap` and
      `GraphtyEventMap`; export it from the `.` entry, so a TypeScript consumer stops needing
      a hand-written shim.
- [ ] Add the packaging test, the event-contract test and the catalogue test.

### Phase C -- the prose, the tests and the agent surface

- [ ] Write `graphty-element/docs/index.md` and `quickstart.md` (the quickstart is written
      out in full above). Delete `guide/getting-started.md`.
- [ ] Write the 14 guide pages and the 5 framework pages in the reading order above.
- [ ] Write the 26 recipes in the order listed above, each in the five-section shape.
- [ ] Write `guide/troubleshooting.md`; it does not exist today, and the failures it covers
      are the ones every new reader hits first.
- [ ] Create `tools/extract-doc-tests.mjs` and `graphty-element/test/docs/harness.ts`, so
      every fenced block becomes a test.
- [ ] Add the `docs` and `docs-node` vitest projects and the `graphty-element-docs` CI shard;
      update the shard count in root `CLAUDE.md` from 20 to 21.
- [ ] Add `vitepress-plugin-llms@1.14.0` to `docs/.vitepress/config.ts`; verify
      `/docs/llms.txt`, `/docs/llms-full.txt`, `/docs/graphty-element/llms.txt` and the
      `.md` twins in the build output.
- [ ] Write `graphty-element/AGENTS.md`; add it to `files[]` and copy it into the docs tree.
- [ ] Copy `graphty-element/examples/*.html` into the Pages tree at
      `/docs/graphty-element/examples/`; add an index page; link from the nav and from
      `llms.txt`; publish `examples/data/*` at `/data/` so the docs examples fetch something
      that exists.
- [ ] Rewrite `graphty-element/README.md` and the root `README.md` so both carry working code
      and working links.
- [ ] Add the command-example check, the manifest check, the API-diff check and the
      `llms.txt` invariants test.

### Phase D -- versioning and the tarball

- [ ] Build the 1.x docs from the `1.10.1` tag; commit to `docs-archive/v1/` with its README;
      add the copy and banner steps to `deploy-pages.yml`.
- [ ] Add the version dropdown to `docs/.vitepress/config.ts`.
- [ ] Create `graphty-element/src/api/breaking-changes.ts` with one row per breaking change in
      the API design plus the additions the migration register records; generate
      `docs/migration/v1-to-v2.md`; make every `new` field a `test=types` block.
- [ ] Ship the documentation-only `1.10.1`: `DEPRECATED.md` plus the Phase A fixes.
- [ ] Replace `graphty-element/package.json` `files[]` with the explicit allowlist above.
- [ ] Stop emitting `sourceMappingURL` comments in published files; attach
      `graphty-element-sourcemaps-<version>.tgz` to the GitHub release in `release.yml`.
- [ ] Create `tools/check-package-size.mjs`; add `prepack`; set the budget in `package.json`.
- [ ] Verify after publish: `npm view @graphty/graphty-element customElements` returns the
      path; `npm view @graphty/graphty-element dist.unpackedSize` is under 18874368; all
      README links return 200.

### Definition of done

The plan is done when all five of these are true, and each is checkable:

1. `curl -s https://graphty.app/docs/graphty/guide/getting-started | grep canonical` finds a
   link to `/docs/graphty-element/quickstart`.
2. `npm run docs:build` at the repo root exits non-zero on a dead internal link.
3. `vitest run --project=docs --project=docs-node` in `graphty-element/` executes every
   fenced block in `graphty-element/docs/**` and passes.
4. `node tools/check-manifest.mjs` reports every declared event present and named, every
   attribute carrying its default, both slots, and zero `#private` members.
5. A coding agent handed only `https://graphty.app/docs/graphty-element/llms.txt` can load a
   file, run an algorithm, encode a channel and export a PNG without fetching anything from
   this repository.

---

## 10. Open questions for the owner

**Q1. Does the archive live in the repo or in a branch?** Committing
`docs-archive/v1/` (about 1.7 MB of static HTML) keeps `deploy-pages.yml` simple and makes
the archive reproducible from a checkout. The alternative -- a `gh-pages-archive` branch --
keeps the working tree clean but adds a fetch step and a second place to look.
*Recommendation: commit it.* It is written once and never touched again.

**Q2. Do the six machine-readable JSON artifacts ship in the tarball as well as on the
site?** They total well under a megabyte and make the package self-describing offline, which
is what an agent working in an air-gapped or npm-only context needs.
*Recommendation: both.* The site copy is what `llms.txt` links; the tarball copy is what
`package.json` `customElements` and a local tool resolve.

**Q3. Is `vitepress-plugin-llms` an acceptable dependency for the docs build?** It is at
v1.14.0 and is the only maintained option for this stack; VitePress's own site ships the
same three artifacts. The fallback is a 150-line generator in `tools/`, which we would then
own.
*Recommendation: use the plugin*, and keep the invariants test so a plugin regression is
caught rather than silently shipping a worse index.

**Q4. How much of the 1.x archive is worth keeping?** The 1.x guide tree is 5,320 lines and
its quickstart is wrong. An archive that teaches a reader three incorrect facts is arguably
worse than a single page saying "1.x documentation is no longer published; here is the
migration guide".
*Recommendation: archive everything except `guide/getting-started.md`*, and replace that one
page in the archive with a stub pointing at the 2.x quickstart and the migration guide.

**Q5. Who owns the docs for `graph-format`, `graph-io` and `webgpu-graph-algorithms`?** They
have no `docs/` tree and no typedoc config, and a consumer doing anything non-trivial with
data reaches all three. This plan scopes only graphty-element and the element's own
sibling-facing surface (`./format`, `./io/*`).
*Recommendation: out of scope here; a one-page stub each under `/docs/<package>/` so the
nav stops lying, tracked as separate work.*

---

## 11. What this plan refuses to do, and what that costs

**It does not maintain two live documentation trees.** The 1.x docs are frozen build output
with a banner, not a second editable source. The cost: a 1.x-only bug fix cannot be
documented after the freeze. The reason: two live trees is exactly how a 1.x page acquires
a 2.x example, and the failure is silent.

**It does not hand-write a reference page.** The cost: setting up six generators before the
first reference page exists, and prose that must link rather than enumerate. The reason: the
three factual errors in the current quickstart are all hand-typed lists, and the only fix
that generalises is to stop typing lists.

**It does not add a docs-site search index, a tutorial video, or an interactive playground.**
The cost: a reader who wants to try before installing still goes to Storybook, which is
invisible to non-JS fetchers. The reason: scope. The runnable `examples/*.html`, once
deployed, get 95 percent of that value for one copy step.

**It does not make Storybook readable by agents.** Twenty story files are the project's
richest example corpus and sit behind a 6 KB JS shell. Making them fetchable as text would
mean emitting a markdown twin of every story. The cost is a real one and it is deferred; the
26 recipes are the deliberate substitute, and unlike the stories they are tested.
