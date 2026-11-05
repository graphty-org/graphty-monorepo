# graph-io agent reference

Reference material for agents working in `graph-io/`, moved out of `graph-io/CLAUDE.md` to keep that file short.
The rules stay in [graph-io/CLAUDE.md](../../graph-io/CLAUDE.md); this file holds the detail. Paths are relative to
`graph-io/` unless they say otherwise.

## Package Structure

```
graph-io/
+-- package.json                  # @graphty/graph-io, ESM only, sideEffects false, "." + one subpath per format + "./positions"
+-- project.json                  # Nx project "graph-io"
+-- tsconfig.json                 # lint/typecheck: src/ test/ benchmarks/ + ../graph-format/src (paths), noEmit, lib DOM
+-- tsconfig.build.json           # emit: src/ only, rootDir ".", outDir dist (-> dist/src/), format resolved from its dist
+-- tsconfig.strict-consumer.json # test/types/*.test-d.ts against dist/*.d.ts under the strict flags
+-- vitest.config.ts              # single project, environment node, pool forks, thresholds 80/80/75/80
+-- scripts/entries.js            # the bundle entries: graph-io + one per format (shared by both scripts below)
+-- scripts/build-bundle.js       # one multi-entry vite lib build -> dist/graph-io.js, dist/<format>.js, dist/chunks/*
+-- scripts/bundle-types.js       # dist/graph-io.d.ts and dist/<format>.d.ts, one-line re-exports of dist/src/**
+-- scripts/docs-reference.ts     # renders the generated blocks of docs/ (npm run docs:reference; --check verifies)
+-- typedoc.json                  # the API reference (root `pnpm run docs:api:graph-io`); every subpath barrel is an entry
+-- docs/                         # the user guide, published at https://graphty.app/docs/graph-io/
|   +-- examples/<topic>/<name>.ts  # every code example the guide shows, runnable; <name>.txt is what it prints
+-- src/
|   +-- index.ts                  # the only root barrel; named exports only
|   +-- types.ts                  # section 12.4 contract types and ImportError
|   +-- registry.ts               # FormatRegistry, importGraph / exportGraph / checkExport / sniff, the default registry,
|   |                             # and the simple surface wrapping them: loadFromUrl / loadFromFile, exportGraphToBytes /
|   |                             # exportGraphToBlob / downloadGraph, listFormats (tests: test/simple.test.ts)
|   +-- sniff.ts                  # rankFormats / sniffFormat (extension + MIME + content), the JSON dialect head sniff
|   +-- children.ts               # the children CSR over a parent / parents column (design 7.1)
|   +-- common/                   # shared by every format (see the module map in STATUS.md)
|   |   +-- codes.ts              # the one definition of every shared issue / loss code (E_MISSING_ID, W_ROLE_DROPPED, ...)
|   |   +-- report.ts             # ImportReportBuilder: issues, error limit, warnOnce, fail() -> ImportError
|   |   +-- input.ts              # textChunks / readText / LineReader: the one byte decoder (BOM, option, declaration, UTF-8, windows-1252 fallback), the text checks, input shapes, abort, progress
|   |   +-- options.ts            # resolveImportOptions / resolveExportOptions / reportSinkOptions / reportUnusedOptions
|   |   +-- direction.ts          # DirectionResolver (8.4 rules), pairFolding() for exporters (3.6 pairs, mutual marks)
|   |   +-- ids.ts                # canonical / string / number coercion, IdCoercer (W_ID_MERGED)
|   |   +-- text.ts               # the 5.1 lexical grammar for untyped cells, TextCellWriter (per-column dtype, lexical forms kept)
|   |   +-- declared-types.ts  temporal.ts  lists.ts  attributes.ts   # declared attributes (5.1, 5.5), declareResolved (5.6 rename rule)
|   |   +-- weights.ts            # weightFrom, parseWeightText, explicitWeights() (3.7: the weight role column's validity)
|   |   +-- export.ts             # LOSS codes, capabilities(), checkCapabilities() + CheckExtras (roles, roleNames, node/edgeRoleNames), sanitizeIds()
|   |   +-- xml.ts                # the streaming XML tokenizer (GEXF, GraphML), entity decoding, xmlIllegalTextNotes()
|   |   +-- escape.ts  format.ts  writer.ts   # quoting per format, formatDecimal / formatGmlReal, encodeChunks / joinText
|   |   +-- ontology.ts  ontology-export.ts   # the OBO column vocabulary (OBO and OBO Graphs), what the two ontology exporters share
|   |   +-- notes.ts  units.ts    # the aggregated note collector, LengthUnit / GraphTool (shared by file positions and file styles)
|   +-- sources/                  # network sources (experimental): the contract (types.ts), codes.ts (SOURCE_ISSUE), ids.ts
|   |                             # (every source id and _source. attribute name), credentials.ts, context.ts (the guarded
|   |                             # ctx.fetch), run.ts (records / file / import paths), registry.ts, builtins.ts (lazy
|   |                             # registrations), testing.ts (replayFetch), and one directory per built-in source
|   |                             # (ndex/, cypher/, rest/: params.ts, descriptor.ts, index.ts = the subpath barrel)
|   +-- positions/                # @graphty/graph-io/positions: extractPositions() (stored coordinates as center, y up, file
|   |                             # units), toFilePositions(), POSITION_ISSUE; never imports a format module. A format says how
|   |                             # its coordinates are spelled in the position column's meta.extra or an importer positions() hook
|   +-- formats/<format>/         # gexf graphml gml dot pajek csv json neo4j
|       +-- index.ts              # the subpath barrel: <fmt>Importer, <fmt>Exporter, option types, code tables
|       +-- importer.ts           # GraphImporter<Opts>
|       +-- exporter.ts           # GraphExporter<Opts>
|       +-- ...                   # private helpers (tokenizer, schema, syntax, records, ...)
+-- test/
|   +-- corpus/<format>/          # fixtures + manifest.json (expected counts); corpus/malformed/<format>/
|   +-- helpers/corpus.ts         # manifest loaders, input shapes (bytes, chunks, streams)
|   +-- helpers/roundtrip.ts      # expectSameSnapshot / roundTrip (compareSnapshots is public: src/common/compare.ts)
|   +-- common/*.test.ts          # one per common module
|   +-- formats/<format>/*.test.ts
|   +-- registry.test.ts  sniff.test.ts  children.test.ts  index.test.ts  build-output.test.ts
|   +-- types/*.test-d.ts         # compile-only, run under tsconfig.json and tsconfig.strict-consumer.json
|   +-- conformance/              # the format conformance suite (see "Conformance suite" below)
+-- benchmarks/                   # run.ts, run with tsx; ignored by eslint and coverage
```

## Conformance suite

`test/conformance/` runs every fixture under `fixtures/<format>/` through `importGraph()` as bytes and
checks it against the expected-result record in that format's `manifest.json` (origin, licence,
version, what it exercises, which oracle produced the expectation). `tools/oracle.py` regenerates the
oracle-derived expectations (networkx 3.1, Graphviz 2.43 `gvpr`, Python's json and csv modules;
`oracle_<format>.py` per format): `python3 test/conformance/tools/oracle.py [format ...]`.

- An expectation states the RIGHT behaviour. Where graph-io misses it, the fixture carries
  `knownFailure` (or `roundTripFailure`): the cause and its section in the research notes. The
  test then runs as an expected failure, so a fix turns it red until the marker is removed. Remove
  the marker in the same change as the fix; never weaken an expectation to make it pass.
- An expectation's `graphNames` is checked through `listGraphs()`. A fixture whose oracle departs
  from the specification carries `oracleDisagrees` (what the oracle does and why the spec wins;
  `networkxDisagrees` is the older networkx-only form). Every passing fixture of xgmml, cx, cx2,
  cys and obo is sniffed with no format given, by its file name and by content alone, and must
  rank as its own format; `sniffAs` asks the same of any other fixture (null: no format).
- `CONFORMANCE_REPORT=1 pnpm exec vitest run test/conformance` regenerates `test/conformance/REPORT.md`
  (the known failures grouped by cause: the work list).
- Fixtures under GPL / LGPL / EPL / CDDL / CC-BY-NC licences are test-only: `test/` is not in the
  package's `files`, so they are never published.
- Three generative layers run in the same file (`conformance.test.ts`):
    - `generative.ts`: fast-check graphs (ids with Unicode, quotes, delimiters, XML / DOT / GML
      specials, empty and long strings; self-loops, parallel edges, isolated nodes; weights and cells
      with -0, 1e-300, 1e300, the infinities, NaN) through every exporter configuration (`TARGETS`)
      and back from bytes. A difference is allowed only when a check() note announced it
      (`NOTE_RELAX`: note code -> the difference it documents); an export may throw only when check()
      returned an E\_ note. `GRAPH_IO_PROPERTY_RUNS` / `GRAPH_IO_PROPERTY_SEED` size and seed it
      (default 300 per configuration). A bug found becomes its shrunk graph in
      `fixtures/generative/cases.json` (with `knownFailure` while open) and, while open, a
      `KNOWN_FAILURES` predicate that keeps such graphs out of the property.
    - `tools/differential.py` writes seeded networkx graphs with networkx's own writers into
      `fixtures/<format>/networkx-generated/` with manifest entries (`"oracle": "networkx-differential"`,
      networkx's read-back as the expectation; `networkxDisagrees` where the spec overrules networkx).
      Rerun it after changing it; oracle.py leaves those entries alone.
    - `schemas.ts` + `tools/validate_exports.py`: every GraphML, GEXF and JGF export against the
      official XSDs / JSON Schema in `schemas/` (unmodified copies), and every DOT export through
      Graphviz's gvpr. Needs Python with lxml and jsonschema (`GRAPH_IO_SCHEMA_PYTHON`, default
      python3; skipped without them, required under `GRAPH_IO_REQUIRE_SCHEMAS`). An error is a
      documented `SCHEMA_DEVIATIONS` entry (the schema contradicts the spec's own examples) or a
      `SCHEMA_KNOWN_FAILURES` entry (an open graph-io bug, run as an expected failure).
