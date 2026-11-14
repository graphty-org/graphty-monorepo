# Self-contained save files

## The rule

A file that graphty-element or the graphty app writes for later reading (a project file, an
autosave entry, an exported style file, a recipe, a share link) must open the same way on any later
build. It carries everything it uses. It never names a built-in thing (a shader, a palette, a
shape, a label look, a scale, a transition, a layout, an algorithm, a sample) and trusts the
reading build to still have it.

Removing a built-in must not break an old file or quietly change its look, so that removal never
needs a major version. Part 1 makes shaders follow the rule. Part 2 is CI checks that keep shaders
fixed, track every other place that still breaks it, and block new ones without the owner.

## Part 1: shaders are saved as code

### 1.1 What the file holds

The style document (`StyleDocument.shaders`, written by `session.styles.toDocument()`) holds
`{ id, text }` for every shader the project uses, built-ins included. Every writer goes through
`toDocument()`: the project file (`styleMember` in `src/session/projectFile.ts`), autosave
(`src/autosave/parts.ts`), Export > Styles (`toFile()`) and the recipe (`src/session/recipe.ts`).

- The text is a complete `graphty-shader 1` text: header, parameter declarations with their
  defaults, body and low-detail body, exactly as `session.shaders.source(id)` writes it.
- An `id` is a key into the file's own `shaders` list, nothing more. A copied preset keeps its bare
  id (`pearl`) as that key, so the id format does not change. Layers, encode keys and the
  background refer to the shader by that key, and the file carries the text for every key used.
- A layer's use (`{ shader, params }`) saves only parameters that differ from the defaults, which
  are in the carried text, so a later build cannot change them.
- `toDocument()` checks the invariant on every call: a layer use, encode key or background that
  names an id missing from `dispatcher.state.shaders` adds `shader.not-saved` to the document's
  problems. That is an element bug; the clean-room test (2.1) fails on it.

### 1.2 Reading carried text: no catalog in the path

Reading never consults the catalog by id, anywhere. A bare id such as `pearl` in a file is a key
into that file's `shaders`, and its being equal to a catalog id means nothing. Whether a shader is
a copy of a shipped one, which drawing path and picture it gets, and whether it is trusted are
decided by its content hash alone (1.5, 1.6). A build that ships no shaders at all reads every
file the same way.

Inside a project, a shader id in a layer's `node.shaders` or `edge.shaders` use (`off: true`
included), an encode key `<target>.shaders.<id>.<param>`, or the background's `shader.id` means one
of the project's own shaders (`dispatcher.state.shaders`), never a preset or a page-registered
shader. The built-in catalog becomes a gallery to copy from. What changes:

- Text from a project or a style document is parsed with bare ids allowed: `readText`,
  `parseShaderText` (its `checkHeader(header, true)`) and `describePastedShader` (its
  `admit(..., true)`) take a `namespaced` flag that `shader.set`, `applyTemplate` and
  `project.open` set to `false`. The `shader.set` command (`commands/shaders.ts:67`) and
  `checkDocumentShaders` accept `isShaderId(id)`.
- `catalogCopy` in `src/session/shaders.ts` is deleted, so no read depends on the catalog. A text
  pasted into `add()` whose header names a bare preset id gets a `user/` id from `freeId` unless the
  project already holds that id with the same text.
- A new `projectShaderDescriptor(id)` in `shaderRegistry.ts` reads the session's project shaders
  only, with no `/` short-circuit (`shaderDescriptor` returns early for bare ids at line 529).
  Every lookup outside the gallery switches to it: `checkShaderRef` (`Layer.ts`),
  `shaderParamDescriptor` and the integer check (`encoding.ts:3006`), `placeOfUse`
  (`channels.ts:5367`, all 16 callers), `explain.ts:1092` and `:1246`, the painter, the background
  and bloom lookups (`RenderManager.ts:679`), and `shaders.ts` (around lines 1082, 1295, 1313,
  1328, 1412, and the drawn status at 1792).
- A lint rule (2.4) lets only `shaderRegistry.ts`, `src/session/catalog.ts` and the new
  `src/session/shaderCatalog.ts` import `shaderDescriptor` or `shaderDescriptors`. The new file
  holds the copy step (1.3) and the gallery branches of `status`, `availability`, `thumbnail` and
  `source` for an id the project does not hold.
- Known limit: two graphs on one page with different text under one bare id check layers against
  whichever session answers (`addPastedShaderSource` is page-wide); passing the session fixes it.

### 1.3 Copying a catalog shader into the project

A write that names a shader id the project does not hold copies the shader in first, in the same
undoable step. The copy runs where every write commits, not in a list of API methods:

- `settleShaderCopies(draft, ids)` runs inside the style and `config.set` command executors
  (`commands/style.ts:378-402` and the config command) and writes `draft.shaders` in the same
  draft. That covers every `StylesApi` writer (`add`, `update`, `patch`, `applyTemplate`, `addRow`,
  `writeRow`, `updateMany`, `encode`, `resolveToStatic`, `setFoldBelow`, `highlight`, `mark`,
  `restoreStartingRows`), suggested styles (`RunsApi.ts:2010`, `:2154`, `autoApply.ts:316`,
  `Graph.ts:3954`), AI commands, `setBackground` and `element.background`.
- For each named id the project does not hold, a preset or registered shader with that id and a
  loaded body has its canonical text (what `source(id)` writes) added under the same id; the use,
  encode key and background are not rewritten. An unloaded body refuses the write with the new
  problem `shader.not-loaded`, since an executor cannot wait; the async entry points (every
  `StylesApi` method, `setBackground`, AI dispatch, `fromCatalog`) await `loadShaderSource` first,
  and a failed load refuses with `shaderLoadProblem`'s problem. An unknown id is refused with
  `E_UNKNOWN_SHADER`, as today.
- A registered shader with a native WGSL body is carried as its GLSL text and runs translated on
  WebGPU, ending the "one documented exception" in `registeredTexts`.
- If the project already holds the id, its shader is used, so an old file keeps its look.
- A gallery pick goes through `session.shaders.fromCatalog(id)`, which returns the project id to
  write. When the project holds that id with text whose content hash is not the catalog entry's
  (1.5), it copies the catalog text under a fresh id (`freeId`), so a Pearl pick never binds to a
  file's foreign text. When the project holds the same content under any id, that id is returned.
- An `applyTemplate` that is not a project open (a style file or recipe applied to an existing
  project) gives an incoming text a free id when the project holds its id with different text, and
  rewrites that document's uses, encode keys and background to match. Both looks survive.
- In the same step, a project shader that nothing names and whose `copyOf` is set (its content hash
  equals a current catalog text) is removed, so gallery browsing does not fill the 64-shader limit.
  Other text is never removed.

Opening a file never copies anything: `project.open` marks its transaction as opening, and
`settleShaderCopies` does nothing while the mark is set. Every way of reading a saved file goes
through `project.open`, including autosave recovery. `registeredTexts`, `TrustHooks.embedded` and
`TrustHooks.pageOwns` are deleted, and `toDocument()` writes `dispatcher.state.shaders` only.

### 1.4 Every place a shader id is saved

Each of these holds a project id whose text is in `shaders`: `set["node.shaders" | "edge.shaders"]
[].shader` (with `off: true` too; `idsNamedBy` loses its `off !== true` filter), the encode key
`<target>.shaders.<id>.<param>`, and `config.background.shader.id`. A project saved with
`leaveOut: ["graphty-style"]` while the background names a shader gets `shader.not-saved` in
`leftOut`.

`readProject` today sets the configuration (`projectFile.ts:1709`) before it restores the style
member (`addStylesAndNotes`, line 1894). It now writes the style member's `shaders` first, before
`config.set`, so the background never names an id the project lacks during open.
`DOCUMENT_SHADER_TEXT_LIMIT` rises from 256 KB to 1 MiB so one file holds all presets (~220 KB)
plus the reader's own; the count limit of 64 stays. Test 2.1 saves every preset in one file.

### 1.5 One entry per id, and what a copy is

- The content hash is `ReadText.hash`, now computed over the stored text with the header's `id`
  left out, so the same code is the same content under any key. Today the id is part of it.
- `session.catalog.shaders()` (`src/session/catalog.ts:273`) returns one descriptor per id, a
  project entry replacing a catalog entry. A project descriptor carries the neutral fact
  `copyOf?: string`: the id of the current catalog entry (a preset or a loaded registration) whose
  text has the same content hash, whatever key the file uses. `origin` keeps its meaning.
  `session.shaders.describe(id)` is the project-first lookup for one id.
- `copyOf`, the catalog drawing path (`drawable` at once, the shipped picture, catalog status) and
  trust (1.6) are decided by the content hash only. Text equal to a current catalog text takes the
  catalog path under whatever id the file gives it. Any other text, including foreign text under
  `pearl` and text whose entry was removed, takes the project path (per-hash compile, test frame,
  thumbnail drawn and cached by text).
- No code compares a project id with a catalog id. There is no "differs from the catalog" problem,
  and the rule that picked the catalog path by id is removed.

### 1.6 Trust: decided by content, from one hash

A file's shaders arrive held until the reader runs them. Trust is decided only from the content
hash (1.5) of the entry as `readText` stores it. `documentShaders`
(`StylesApi.ts:3915`) reads each entry through the same `readText` and tests that hash; it no
longer calls a separate `trusted(text)` on the raw document text, so the open report's held list
always equals the ids whose status is `held`.

`trusted(hash)` checks, in order: (1) `REVOKED_SHADER_HASHES`
(`src/catalog/revoked-shader-hashes.json`), never trusted, held with the new problem
`shader.revoked` even after approve; (2) the crash marker, which keeps a hash off even after
approve or a `shaders: "run"` open; (3) the session's approvals; (4) `SHIPPED_SHADER_HASHES`
(`src/catalog/shipped-shader-hashes.json`), the content hash of every canonical preset text ever
shipped, computed through the project read path, not over `copyText` output; (5) a page
registration, under any id, whose text is already loaded and has the same content hash; (6)
`untrusted: "run"` and `trustedHashes`. No step looks at the entry's id.

A shipped hash leaves the list only by moving to the revoked list (2.6). Each listed hash has its
text archived at `test/shaders/shipped-texts/<hash>.txt`, and
`test/saved-format/shipped-shader-hashes.test.ts` fails when a current preset's hash is missing
(printing the line to add), a listed hash has no archived text, or an archived text does not hash
to its name, so a reviewer can read what each trusted hash runs. Text under `pearl` that differs
from every shipped text arrives held. With `untrusted: "refuse"`, `documentShaders` writes the
entries that pass `trusted()` and drops the rest with `shader.held`, their uses dropped as in 1.7.
`project.open` never starts a registered loader because a file uses that id; a page that wants its
registered shaders trusted in files before they load passes their hashes in `trustedHashes`.

### 1.7 A file that cannot be fully read

When a carried text does not parse (a header key a later build dropped, a removed helper) or a use
names an id the file does not carry, the open drops each use of that id, reports `shader.unknown`
with the layer id and channel (or the background), and opens the rest of the style member. Today
the whole member fails through `attempt()` (`projectFile.ts:1630`). Autosave does not overwrite a
recovered entry whose open reported problems: it writes a new entry and keeps the recovered one
until the reader saves, so a lossy open is never permanent. Old nightly files that name a built-in
by bare id without carrying its text open the same way: only those uses are dropped, each reported
as `shader.unknown`, with no conversion and no catalog lookup even when the catalog holds that id.
Nightly has no compatibility contract, and the shader API has never been on npm `latest`.

### 1.8 The graphty app

- A gallery pick calls `session.shaders.fromCatalog(id)` and writes the id it returns; a tile is
  selected when `describe(useId).copyOf` equals the tile's id, never by comparing the use's own id
  with a catalog id. The `.find(id)` lookups over `catalog.shaders()`
  (`shaderSlots.ts` `shaderOf`, `Section.tsx:391` and `:478`, `ShaderEditorDialog.tsx:800`) switch
  to `session.shaders.describe(id)`.
- The gallery's origin filters (`ShaderGallery.tsx:160-175`, `:330`) and `ShaderRow.tsx:90` read
  `copyOf` instead of `origin`: a copy is filed with its catalog entry, and Duplicate and edit are
  offered for every shader. `source(id, { duplicate: true })` gives any non-`user/` id a `user/`
  id, project copies included; the editor adds it with `asNew` as today.
- Applying a built-in unchanged from the editor (the `sameAs` branch) and `add` with `apply` write
  through `fromCatalog`; header changes other than defaults are dropped, and changed defaults stay
  in the use's `params`.
- `SHADER_ALIASES` (`graphty/src/workspace/style/words.ts:1559`) is deleted. `ShaderDescriptor`
  gets an optional `tags` list supplied by whoever registers a shader, the presets carry its words,
  and gallery search reads `plainName`, `categories` and `tags`. App tests (2.4) prove that a
  gallery pick and an editor Add both save the shader's full text.

### 1.9 Public API changes

The shader API is on npm `next` only, so none of these breaking changes needs a major: uses,
encode keys and the background resolve against the project, and writing a catalog id copies the
shader in; `shaders.list()` includes those copies; `catalog.shaders()` returns one entry per id;
`status`, `availability`, `thumbnail` and `source` prefer the project's shader; a document's text
under a registered id draws the document's text (`pageOwns` removed); importing renames a
colliding id; an unreadable shader drops only its uses; the content hash leaves out the id; and
`ShaderProblemCode` becomes an open union in this change (`... | (string & {})`, as `backend` in
`acceleration/types.ts`), which breaks an exhaustive `switch`. Once open, adding or retiring a
code, or taking shaders out of a build, never needs a major.

Additive: bare ids in `ProjectShader.id`, `StyleDocument.shaders[].id` and `shader.set`;
`session.shaders.describe(id)` and `fromCatalog(id)`; optional `ShaderDescriptor.copyOf` and
`tags`; problem codes `shader.not-saved`, `shader.not-loaded` and `shader.revoked`; trust by
content, with `refuse` admitting trusted text; `duplicate: true` renaming project copies; the
1 MiB limit. Docs for `GraphBackgroundShaderLook.id` and `ShaderUse.shader` say project ids.

`registerShader` still refuses a preset's id (`E_DUPLICATE_PLUGIN`); its message drops the
saved-document reason. Run `npm run api:report` and commit the report.

### 1.10 What carried text still depends on

A carried shader still calls the helpers the element puts in front of every body: `noise`, `fbm`,
`palette`, `sd*`, `iconSdf` with its six fixed icons, and the `NodeInput` struct
(`src/catalog/shaderGlsl.ts`, `src/shaders/runtime/glsl.ts`, `wrap.ts`). They become part of the
`graphty-shader 1` format: `test/saved-format/shader-library.test.ts` snapshots each helper's name
and signature, each icon and each `NodeInput` field, and fails on a removal or change, which then
needs a `graphty-shader 2` format while format 1 stays readable. The snapshot is gated (2.6).

### 1.11 Removing a preset later

Delete its folder under `src/shaders/presets/` and keep its hash and archived text. A file that used
it carries the text, resolves and trusts it, and draws its thumbnail from it; only the gallery
stops listing it. The clean-room test proves this by opening every preset with the catalog emptied.

## Part 2: the regression checks

### 2.1 Clean-room round trip (runtime, the main check)

`graphty-element/test/saved-format/clean-room.test.ts`, in the vitest project `default` (Node,
headless `createGraphSession()`, like `test/session/project-file-round-trip.test.ts`). It runs one
block per row of `SELF_CONTAINED_KINDS` in `test/saved-format/kinds.ts`. A row is
`{ kind, useEvery(session), builtInModules }`. For each row:

1. Session A uses every built-in of the kind, listed from the live catalog (never hand-written
   ids), and the test asserts it used as many as the catalog lists. A and `A.styles.toFile()` save.
2. Session B is built in a clean module graph: `vi.resetModules()`, then `vi.doMock` maps the
   row's `builtInModules` (for shaders, `src/shaders/presets/index.ts`) to empty stubs, so the
   `builtIns` map and every compiled, loaded or pasted-source cache start empty.
3. B opens each text with `project.open` with no problems and no unknown-reference event, then
   saves; C, built the same way, opens B's save and saves. B's and C's saves deep-equal minus
   `volatile` (the save time), and A's and B's `shaders`, layer uses and background are equal.

The shader row, the first row, also covers: every node, edge and group preset with one parameter
off its default and one save per background preset, each id staying bare with status `ready`
(catalog present and emptied); an encode binding on a `varies` parameter; an `off: true` use; a
registered GLSL shader whose loader never ran, and one with a native WGSL body (both arrive held);
every writer listed in 1.3 with a catalog id, with no `shader.not-saved`; with the catalog emptied,
a group-place preset keeping its place, `explain` reporting no `shader.unknown`, bloom on, and the
background drawable with nothing unknown reported during open; an archived older preset imported
into a project holding the current one; a preset's text under another id (trusted, `copyOf` set,
the shipped picture) and a reformatted preset (held; held list equals ids with status `held`);
foreign text under `pearl` (held, no `copyOf`, the project path, never the shipped picture, and
`fromCatalog("pearl")` returns a fresh id); a file naming `pearl` without carrying it, with the
catalog present (only that use dropped, `shader.unknown`); one corrupted text (only its uses
dropped); a `refuse` open; a crash-marked shipped hash staying off after approve and a run-mode
open; a revoked hash.

### 2.2 Saved-name scan (runtime, catches every kind)

The same file scans the save of a session that runs every row's `useEvery`. Each catalog module
and fixed list (the overflow lists in `encoding.ts`, default palettes, closed look lists, template
ids, shader-library helper names) exports `builtInIdsForTesting(): { kind, ids }`. The scan walks
the saved JSON's values and keys, splitting dotted keys such as encode keys, and matches whole
strings (a carried text never equals an id). A string equal to a built-in id fails unless one of
these exact exemptions holds:

- Shaders: the value is a `graphty-style.shaders[].id` definition, or it sits at a shader-reference
  path (`graphty-style.layers[].set.node.shaders[].shader`, the same under `edge`, the id segment
  of an encode key `<target>.shaders.<id>.<param>`, `config.background.shader.id`) and equals an id
  carried in the same file's `shaders`. `pearl` anywhere else, or at a reference path with no
  carried `pearl`, fails.
- Every other kind: the value sits at a normalized path (array indices as `[]`, for example
  `graphty-style.layers[].set.node.color.palette`) listed with its kind on the known-exceptions
  list (2.5).

The fixture's graph data avoids built-in names, so a hit is a saved reference. Matching values,
not types, covers plain-string fields and kinds with no catalog table.

### 2.3 Catalog census (runtime)

`test/saved-format/catalog-census.test.ts` asserts that every key of `SESSION_CATALOG_TABLES`
(apart from `fixed` and `source`), and every module exporting `builtInIdsForTesting`, appears in
exactly one of: a `SELF_CONTAINED_KINDS` row, an exception's `catalogs` array, or `NOT_SAVED`
(key to a one-line reason, such as `logSinks`: "never part of a file"). A new catalog fails CI
until someone decides where it belongs. `transitions` starts on the exceptions list; fonts go in
`notSaved` ("not shipped by graphty: a font name names a system or page font"). `cameras`,
`formats` and `screenshotPresets` are decided on the first run by reading their writers.

### 2.4 Lint rule and app tests

- graphty-element: a `no-restricted-imports` rule (with `importNames`) bans `shaderDescriptor` and
  `shaderDescriptors` everywhere except the three files in 1.2. The rule's configuration lives in
  `graphty-element/test/saved-format/eslint-saved-format.js`, imported by `eslint.config.js`, so
  widening it is gated (2.6).
- App: `graphty/src/workspace/style/__tests__/shader-save-carries-text.real-element.test.tsx`
  drives the real app and element with real input. (1) It opens a node layer's Shaders, clicks a
  gallery tile and saves the project; the saved `graphty-style.shaders` holds the full
  `graphty-shader 1` text under the id the layer's use names. (2) The shader editor's Add of an
  unchanged built-in, then a save, carries the text the same way.

### 2.5 The known-exceptions list

The tests and the ratchet (2.6) read one file, `test/saved-format/saved-format-lists.json`:
`selfContained` (the kinds `kinds.ts` must implement), `exceptions`
(`{ kind, paths, catalogs, issue, finding }`, keyed by saved JSON path), `notSaved` (catalog key
to reason) and `volatile` (fields the B-to-C comparison ignores). Each exception gets a tracking
issue; the scan fills the exact `paths` on its first run, and the owner approves that starting
list. Shaders are not listed, because Part 1 fixes them in the same change.

Named by id, so the scan sees them (each entry lists its paths):

- palette: built-in palettes by bare id (only registered ones are carried); scale: `Binding.scale`,
  plugin scales included; label-look: `LabelStyle.look` (`card`, `pill`...).
- node-shape: `node.shape`, `underlayShape`, `overlayShape` and encode choices; edge-arrow-and-line:
  arrowheads, `edge.style`, `edge.outlineStyle`; overflow-lists: overflow `shape` and `pattern` step
  through fixed lists in `encoding.ts`; closed-look-lists: border styles, chart kinds, stripe
  directions, route, support model, image fit and repeat, model fit, center and up axis.
- transition: `layoutTransition` in the configuration (`GraphStyle.ts:193`) by preset id (`glide`).
- sample-model: `asset:sample/<name>` by name, and embedding one is refused; sample-source:
  generator or dataset by name, sorted by the current generator catalog.
- row-template: Starting, Ghost and Pinned rows carry template ids that code branches on.
- algorithm: saved runs, run-on-load entries and filter measure leaves name an algorithm by key and
  run it again; layout: by id and engine, run again, plus legacy `layoutBehavior.type`; basemap: by
  `MapSourceId`, and no map means the bundled world image.

Left out rather than named, so only a clean-room row can prove a fix (empty `paths`):

- default-palette: a binding naming no palette paints with the build's default (`ylorbr`,
  `okabe-ito`); default-settings: settings equal to the default are omitted and filled from the
  reader's defaults; style-tree-mode: `startingRows`, `editableBase` and `runPlacement` are not
  saved, and the app reapplies them.
- edge-routes: Graphviz routes are computed again on open; gazetteer: place names are looked up at
  a graphty.app URL when the layout reruns; data-fingerprint: runs match data by an unversioned
  FNV-1a hash.

### 2.6 The ratchet: what needs the owner

`tools/check-saved-format-allowlist.mjs` (`pnpm run check:saved-format-allowlist`) works like
`tools/check-figma-lock.mjs`: it judges each commit from the push base on its own, and a commit
that adds an exception, an exception path, a `notSaved` key or a `volatile` field, removes a
`selfContained` kind or a test file under `test/saved-format/`, or changes the shader-library
snapshot must carry `Saved-Format-Exception-Approved: <reason>`. Removing a shipped hash or its
archived text fails with no trailer escape unless the same commit adds it to the revoked list.
Free: adding a shipped hash with its archived text, adding a revoked hash, adding a
`selfContained` kind, and removing an exception in the same commit that adds its kind's row.

Anyone can type a trailer, so CI enforces the owner's approval: `tools/pr-integrity.mjs` (PR
Integrity) fails a pull request that weakens these checks unless a code owner approved the head
(`ownerApproved`), as it already does for a breaking change; a revert is exempt. It asks for the
owner by the same judge the trailer check uses, applied to the diff from the merge base: a change
limited to `saved-format-lists.json`, the shader-library snapshot, lines added to `kinds.ts` and the
`test/saved-format/*.test.ts` files needs him only when the judge finds an added exception, path,
`notSaved` key or `volatile` field, a removed `selfContained` kind, a deleted test, or a changed
snapshot. Removing exceptions while adding their kinds' rows, and adding kinds or tests, merges on
agent review (owner, 2026-11-13: "a change that only removes save-file exceptions merges on agent
review"). An edited test is free here, as it is for the trailer check (#7588 edits the scan in
`clean-room.test.ts` to accept what a file carries): the fresh agent review is what judges whether an
edit quietly exempts a built-in, and the test-integrity rule only catches a lost test or assertion.
Any other change under
`test/saved-format/`, to `tools/check-saved-format-allowlist.mjs`, to the lint rule's switch in
`graphty-element/eslint.config.js`, or to the shipped and revoked hash lists always needs him.
`tools/pr-integrity.test.mjs` has a case per path. `GUARD_PATHS` in `pr-open.sh` holds the
allowlist check and `tools/pr-integrity.mjs`, so the owner merges a change to either. It does not
hold `test/saved-format/`: PR Integrity is not a required check, so `pr-open.sh` runs the same
judge (`savedFormatNeedingOwner`) and leaves auto-merge off only for a change that weakens the
checks, or when the judge fails. A save-file pull request that only narrows them auto-merges.

### 2.7 Where each check runs

The `test/saved-format/*.test.ts` files run in CI's `test` job (shard `graphty-element-default`;
they import the session, so the selector picks them for any graphty-element change); the app tests
in 2.4 run in the graphty app's test job. The lookup rule runs in `lint`, the ratchet in `checks`
and `tools/prepush-source-checks.sh`, the owner-approval rule in PR Integrity. A fix for another
kind makes the file carry what it used, adds its row and deletes its exception in one commit.

## Review decisions

- No static saved-format type check (branded `CatalogRef` ids): writers return
  `Record<string, unknown>`, a brand matches every string, and branding exported types changes the
  public API. The scan in 2.2 covers more, including plain strings.
- Requiring `git verify-commit` on the trailer commit is not adopted: PR Integrity's owner-approval
  rule and `pr-open.sh`'s hold already make every change that weakens the checks his.
- A shader id stays a bare file-local key (`pearl`): the defect was reading the catalog by id, not
  the id's spelling, and 1.2 removes every such read.
- No scan of the app's source for preset ids: it tied the app to the preset list. The saved-name
  scan checks what files hold, and the app tests in 2.4 prove the app's own writes carry text.
