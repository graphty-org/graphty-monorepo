# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/graph-io package.

Read [design/graph-io/agent-reference.md](../design/graph-io/agent-reference.md) when you need the file-by-file
package layout or the conformance suite's fixtures, oracles and generative layers in detail.

## Project Overview

@graphty/graph-io is the importer / exporter companion of @graphty/graph-format. It parses GEXF,
GraphML, GML, DOT, Pajek, CSV, JSON and Neo4j into a `GraphSink` (`GraphBuilder` or a caller's sink)
and writes the same formats back out from a `GraphSnapshot`. The core format stays zero-dependency
and so does this package at runtime: every format is parsed by a hand-written streaming tokeniser
(one shared XML tokenizer for GEXF and GraphML, one shared RFC 4180 record reader for CSV and
Neo4j, line and token readers for Pajek, GML and DOT). It also owns the io contract types that need
the DOM lib (`ReadableStream`, `AbortSignal`).

The normative design is `design/graph-format/graph-format-design.md` in the monorepo: section 8
(populating the format: 8.2 package split, 8.3 sink contract, 8.4 importer shape and direction
rules, 8.5 exporter shape and loss notes, 8.6 report and error aggregation), section 5.1 (declared
types to dtypes, temporal values), section 4 (ids and the canonical coercion rule), section 12.4
(io contract types, normative) and section 13 (package layout). The per-format requirements are in
research note 07 (`tmp/graph-format-design/07-file-format-requirements.md`).

## Essential Commands

```bash
pnpm run build:all       # tsc -p tsconfig.build.json, then the multi-entry vite bundle and the d.ts shims
pnpm run test:run        # run all tests once (pnpm exec vitest run test/formats/<fmt> for one format)
pnpm run coverage        # v8 coverage, thresholds 80/80/75/80
pnpm run coverage:preview # serve coverage report (start it through servherd with PORT={{port}})
pnpm run lint            # eslint (root flat config) + tsc --noEmit
pnpm run typecheck       # tsc --noEmit only
pnpm run typecheck:strict-consumer  # compile test/types/*.test-d.ts against dist/*.d.ts (build first)
pnpm run benchmark       # tsx benchmarks/run.ts
pnpm run ready:commit    # build, lint, strict-consumer compile, tests
cd .. && pnpm exec knip  # unused files / exports / dependencies, both workspaces
```

@graphty/graph-format must be built before this package's tests or build run: vitest resolves it
through pnpm's workspace symlink and the format package's `exports` -> `dist/`; tsc for lint and
tests resolves its sources through `paths`. From the workspace root, `pnpm -r run build:all` orders
the two correctly.

### Test projects

- Node.js project (`vitest.config.ts`); resolves `@graphty/graph-format` through `graph-format/dist`, so build graph-format first
- `browser` (`vitest.browser.config.ts`, shard `graph-io-browser`): the network sources in Chromium against a local server on another origin, with and without CORS headers

## Key Design Principles

- Importers push scalars into the sink in one pass and never freeze; direction is resolved by the
  importer through `DirectionResolver` (design 8.4 rules 1 and 2); the registry's `importGraph()`
  is the only place that creates a builder and freezes.
- Nothing is silently dropped: an unsupported construct is an `ImportIssue` (report) or a `LossNote`
  (`check()`), never a fallback. The builder throws on the first hard error; the importer catches
  it per element, records the issue, skips the element and continues until `errorLimit`, then
  throws `ImportError` with the partial report. Fatal conditions (invalid UTF-8, malformed
  syntax, unknown format) are `report.fail()` -> `ImportError` at once.
- Every exporter's `capabilities` table is its fidelity matrix; `check()` is `checkCapabilities()`
  (with the format's `CheckExtras`: the roles it has a slot for and the fixed names its importer
  gives them) plus the format's own notes, and `export()` throws the `E_*`-coded conditions before
  writing. A note predicts every difference the format's own importer produces on re-import,
  including the importer's own rules (a plain `weight` column read as THE weight, a role-less
  `label` column gaining the role, an f64 column of integers read back as i32, a dict column read
  back as string), not only what the file cannot hold.
- Issue and loss codes: one code per concept, defined once. A concept shared by several formats
  has an unprefixed code in `src/common/codes.ts` (`E_MISSING_ID`, `W_DUPLICATE_NODE`,
  `W_ROLE_DROPPED`, ...); a format-specific one carries the format prefix (`E_GML_MISSING_LABEL`,
  `W_PAJEK_KEY_DROPPED`). Every subpath exports `<FMT>_ISSUE` and `<FMT>_LOSS`, whose keys are the
  code without its `E_` / `W_` and `<FMT>_` prefixes, and every code an importer records is a
  member of its table.
- Under `onMixedDirection: "directed"` every exporter without mixed direction folds an expanded
  pair back to one directed edge (8.5 "folding pairs back"); `"undirected"` writes the whole graph
  undirected. A mutual pair is written as two directed edges (`W_MUTUAL_EXPANDED`) or, where the
  format has an undirected slot but no mutual one (GraphML, Pajek), as one undirected edge
  (`W_MUTUAL_AS_UNDIRECTED`).
- Every importer checks the cancellation signal at least every 64 elements and once more before
  `report.finish()`, so an abort raised from the sink during a single in-memory chunk rejects.
- Id coercion is an importer option (`ids`); the core never coerces. `sanitizeIds` defaults to
  `"error"`: an exporter never renames a node silently.
- Declares `@graphty/graph-format` in BOTH `dependencies` (`workspace:^`, which pnpm publishes as
  a caret range; `workspace:*` would publish an exact pin) and `peerDependencies` (`^1.0.0`).
- Bytes are decoded once, in `common/input.ts`, for every importer: a BOM, else the `encoding`
  option, else the file's declaration (the importer passes `declaredEncoding`: the XML prolog, DOT's
  `charset`), else UTF-8; a disagreement between them is `W_ENCODING_CONFLICT`. Decoding is strict
  (`fatal: true`), never a silent U+FFFD; undeclared bytes that are not UTF-8 while everything
  before them was ASCII (and no control byte marks them binary) are read as windows-1252 with
  `W_ENCODING_FALLBACK`. Never decode bytes anywhere else. The same layer refuses an empty input
  (`E_EMPTY_INPUT`, unless the reader passes `allowEmpty`) and a known non-graph file
  (`E_FOREIGN_FORMAT`), and reports control characters (`W_CONTROL_CHARACTER`), so an importer
  never repeats those checks; its codes are `INPUT_ISSUE`, spread into every `<FMT>_ISSUE` table.
- A format that can hold several graphs (DOT, Pajek `.paj`, GML, JGF) implements `importAll()`;
  its `import()` reads the first and warns `W_MULTIPLE_GRAPHS` with the number skipped (not when
  `graphIndex` / `graphName` chose the graph: `graphChosen()`). A new
  importer of such a format also implements `listGraphs()` (a `GraphListing` per graph, cheaply)
  and takes `graphIndex` / `graphName` (`GraphChoiceOptions`), resolved by `chooseGraph()` in
  `common/options.ts`; the registry's `listGraphs()` answers null for an importer without it.

## Adding a format

1. Create `src/formats/<fmt>/importer.ts` exporting `<fmt>Importer: GraphImporter<FmtImportOptions>`
   with `format`, `extensions`, `mimeTypes`, `options` (the names of the format's own options, which
   W_UNKNOWN_OPTION trusts; `test/docs-reference.test.ts` checks them against the type), `sniff(head)`
   (0..1) and `import()`:
   `resolveImportOptions(options, { ids, defaultDirected, weightFrom })`, then
   `new ImportReportBuilder(format, errorLimit)`, `reportSinkOptions(sink, options, report)` and
   `reportUnusedOptions(options, report, USED_OPTIONS)` (W_OPTION_IGNORED for every common option
   the format has no use for), read the input through `textChunks` / `LineReader` (streaming) or
   `readText` (whole document), declare attributes through `common/attributes.ts`
   (`declareAttribute`, `declareResolved`: the `<name>#<id>` rename rule and W_ROLE_TAKEN), push
   edges through `DirectionResolver.setHeader()` / `addEdge()`, coerce ids through `IdCoercer`,
   write untyped cells through `TextCellWriter` (the 5.1 grammar per column), weights with
   `parseWeightText`, check the signal every few dozen elements (`throwIfAborted`),
   record issues with `report.error()` / `report.warning()` / `report.warnOnce()` and the counts in
   `report.counts`, and return `report.finish()`.
2. Create `src/formats/<fmt>/exporter.ts` exporting `<fmt>Exporter: GraphExporter<FmtExportOptions>`
   with `options` (its own option names, as for the importer), a `capabilities` table, `check()` = `checkCapabilities(snapshot, capabilities, resolved)`
   plus the format's own notes, `export()` = `encodeChunks(write())` and `exportToString()` =
   `joinText(write())`, where `write()` is a generator of string parts that iterates nodes and
   logical edges in index order, folds expanded pairs (`pair` / `directed` role columns) and writes
   explicit weights only (the `weight` role column's validity). Use `childrenCsr()` for containment.
3. Create `src/formats/<fmt>/index.ts` (the subpath barrel: importer, exporter, option types, a
   frozen `<FMT>_ISSUE` / `<FMT>_LOSS` code table) and re-export it from `src/index.ts`.
4. Add the entry to `scripts/entries.js` and the `"./<fmt>"` export (types first) to
   `package.json`; `test/build-output.test.ts` checks the three agree.
5. Register it in `createRegistry()` (`src/registry.ts`) and add the name to `GRAPH_FORMATS`
   (`src/sniff.ts`, also the tie-break order of sniffing).
6. Add `test/corpus/<fmt>/` with a `manifest.json` (`format`, `description`, `files[]` with
   `path`, `source`, `license`, `expectedNodes`, `expectedEdges`, `features`), the malformed cases
   under `test/corpus/malformed/<fmt>/`, the name in `CORPUS_FORMATS` (`test/helpers/corpus.ts`), and
   `test/formats/<fmt>/*.test.ts` covering every corpus file (manifest counts, every input shape),
   export -> re-import equality (`expectSameSnapshot`), every LossNote path and every malformed
   file (`ImportError` with a report).
7. Run `npm run docs:reference`: it creates `docs/guide/formats/<fmt>.md` with the generated
   blocks (capabilities, options, issue and loss codes) filled in from the registry, the subpath
   barrel and the doc comments; then write the page's prose (what the format is, loading and
   saving, what a saved file keeps and loses) and its example, `docs/examples/formats/<fmt>.ts`.
   `test/docs-reference.test.ts` fails while a page is stale, an option or code has no doc
   comment, or a published doc comment mentions the internal design documents.

## Documentation examples

Every code block in `docs/` and in README.md is a file under `docs/examples/` (`.ts`, or `.js` for a
browser example a reader may paste into a plain page), copied in by
`npm run docs:reference` through an `<!-- generated:begin example:<path> -->` block; an
`output:<path>` block shows what the example prints (`<path>.txt`). `test/docs-examples.test.ts`
runs every example in a directory holding the corpus files, with `fetch` and a small `document`
stubbed, and fails when what it prints differs from its `.txt` (rerun with `UPDATE_EXAMPLES=1`) or
when the files it writes change (a vitest snapshot). Examples import `@graphty/graph-io` by name;
`vitest.config.ts` and the `paths` of `tsconfig.json` map it to `src/`. `docs/samples/` holds the
public-domain sample files the guide loads by URL; `tools/copy-docs-content.js` publishes them under
`https://graphty.app/docs/graph-io/samples/` (listed in the quick start's "Sample files") and the examples run with them in their directory. Write user docs from the
reader's side: what to call and what happens, never how the package is built or tested.

## Conformance suite

`test/conformance/` checks every fixture under `fixtures/<format>/` against the expected result in its
`manifest.json`; `python3 test/conformance/tools/oracle.py [format ...]` regenerates oracle-derived expectations.
Detail (oracles, sniffing, the generative, differential and schema layers): the agent reference above.

- An expectation states the RIGHT behavior. Where graph-io misses it, the fixture carries `knownFailure` (or
  `roundTripFailure`) and runs as an expected failure; remove the marker in the same change as the fix, and never
  weaken an expectation to make it pass.
- Fixtures under GPL / LGPL / EPL / CDDL / CC-BY-NC licenses are test-only and are never published (`test/` is not
  in the package's `files`).
- In the generative layer a round-trip difference is allowed only when a `check()` note announced it, and an export
  may throw only when `check()` returned an E\_ note. A bug found becomes its shrunk graph in
  `fixtures/generative/cases.json`.
- A schema-validation error is either a documented `SCHEMA_DEVIATIONS` entry or a `SCHEMA_KNOWN_FAILURES` entry
  (an open bug, run as an expected failure).

## House Style

Same as @graphty/graph-format (design section 13.4): JSDoc on every exported function, class and
method (`@param name - description`, `@returns`); explicit return types; `import { type X, y }`
inline qualifiers; `.js` suffixes on relative imports; camelCase fields; `curly`; `default-case`;
no default exports; no `console.log` in `src/`; no `eslint-disable` / `ts-expect-error`; plain
ASCII in every source and test file (non-ASCII fixture data is data; non-ASCII test constants are
built with `String.fromCharCode`).

## Distribution

- Root entry: `dist/graph-io.js` (ES module; `@graphty/graph-format` external, no other runtime
  dependency); types `dist/graph-io.d.ts` (a one-line re-export of `dist/src/index.d.ts`).
- Per-format subpaths `@graphty/graph-io/<fmt>`: `dist/<fmt>.js` and `dist/<fmt>.d.ts`, built by the
  same vite invocation so the code shared with the root lives once under `dist/chunks/` (one
  `ImportError` class, one `LOSS` table, one importer object whichever entry a consumer loads).
