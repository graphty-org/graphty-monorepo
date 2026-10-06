# graph-io Cytoscape formats and OBO -- the one-way doors

These are the decisions in `design.md` (same folder) that become published contract the moment a
release ships: names third parties import, types they compile against, data that snapshots carry
into storage, and strings they compare. Each needs the owner's agreement before the first pull
request of the work merges. Everything else in the design is reversible and was decided there.

Options are listed with the recommended one first.

---

## 1. Public names of the new formats

graph-io publishes one import subpath per format and one format name per format in its registry
(`GraphFormatName`, `GRAPH_FORMATS`); graphty-element mirrors the names in `KNOWN_FORMAT_IDS`.
Adding union members can break a consumer's exhaustive `switch`.

1. **One subpath and one name per format (recommended).** Subpaths `@graphty/graph-io/xgmml`,
   `/cx`, `/cx2`, `/cys`, `/vizmap`, `/obo`; format names `"xgmml"`, `"cx"`, `"cx2"`, `"cys"`,
   `"obo"` (the style file is not a graph, so `vizmap` is a subpath only). The element adds the
   four new ids and un-deprecates `"cx2"`. Matches every existing graph-io format, and a bundler
   pulls in only the reader used.
2. **One `@graphty/graph-io/cytoscape` subpath** holding XGMML, CX, CX2, `.cys` and vizmap, with
   `/obo` separate. Fewer entry points, but every Cytoscape consumer pays for the zip reader and
   all five parsers, and it breaks the package's one-format-per-subpath rule.
3. **Longer names** (`"cx1"`, `"cytoscape-session"`, `"obo-flat"`). More self-describing, but
   `"cx2"` already exists as an element id and the file extensions are the names users know.

## 2. Where OBO Graphs JSON lives

OBO Graphs is the Gene Ontology's JSON form (`go-basic.json`). graph-io's JSON reader today
answers `"jgf"` for any document with a top-level `graphs` array, so every OBO Graphs file is
silently misread as JGF.

1. **A new dialect `"obographs"` of `@graphty/graph-io/json` (recommended),** import-only, with
   `sniffJsonDialect()` answering `"obographs"` for such documents instead of `"jgf"`. The JSON
   reader already owns dialect detection and `graphs[]`; users meet these files as `.json`. The
   changed sniff answer is a visible behavior change, but the current answer is a bug.
2. **A separate format and subpath** `"obographs"` / `@graphty/graph-io/obographs`. Cleaner
   separation, but `.json` sniffing then has two formats competing for one extension, and the
   JSON reader still needs the sniff fix to stop claiming these files.
3. **Leave the JSON sniff alone** and read OBO Graphs only when the caller names the dialect.
   No behavior change, but the silent misreading stays for everyone who does not know to ask.

## 3. How a file's visual information is represented

Cytoscape files carry styles (defaults plus mappings from columns to visual properties),
per-element overrides and view values. graph-io must keep them without turning them into graphty
styling, which graphty-element owns. Whatever record is chosen is stored in snapshots, so it
outlives a release in IndexedDB and graph-format files.

1. **A JSON `Presentation` record in Cytoscape's vocabulary, values kept as written
   (recommended).** Stored at `meta.extra.presentation` with `version: 1`; per-element overrides
   in node and edge `json` columns named `cytoscape.bypass`; continuous mappings in CX2's interval
   form; read with `readPresentation(snapshot)`; typed values on demand through
   `parseVisualValue()`. Exported types: `Presentation`, `VisualStyle`, `VisualMapping` (three
   kinds), `MappingColumnType`, `VisualValue`, `ParsedVisualValue`, `BendHandle`. Lossless, so an
   exporter can write the source text back.
2. **The same record with values parsed at import** (colors as `{r,g,b}`, fonts as objects).
   Simpler for consumers, but lossy for odd spellings and every exporter must re-serialize; the
   parsed shape becomes the contract instead of the file's own text.
3. **Per-element overrides in `meta.extra` keyed by element id** instead of columns. One place to
   look, but ids in metadata go stale when a snapshot is compacted, derived or re-frozen.
4. **graph-io emits graphty style layers directly.** Rejected by the repository's styling rule:
   graph-io would own graphty styling and the record would be tied to the element's layer format.

## 4. The style-file API

A Cytoscape style file (vizmap XML, 2.x `vizmap.props`) holds styles but no graph.

1. **A plain function at `/vizmap`, not a graph importer (recommended):**
   `readCytoscapeStyles(input, options?): Promise<CytoscapeStylesResult>` returning
   `{ presentation, report }`, `sniffCytoscapeStyles(head)`, `VizmapReadOptions`, `VIZMAP_ISSUE`.
   Honest about what the file is; not in the registry.
2. **A registered `GraphImporter` returning an empty snapshot** that carries the presentation.
   Loads through the generic path with no special case, but every "import a graph" caller gets a
   zero-node graph from a style file and must check for it.
3. **Fold it into `/cys`.** One fewer subpath, but a style-only consumer loads the zip reader.

## 5. Choosing one graph from a file that holds several

`.cys` sessions, CX1 collections, XGMML session files and OBO Graphs documents hold several
networks. A host wants to show a picker before importing.

1. **An optional `listGraphs()` on `GraphImporter` (recommended),** returning
   `GraphListing[]` (`index`, `name`, `nodes`, `edges`, counts null when not cheap), plus
   `FormatRegistry.listGraphs()` returning `null` for a format without it; `import()` takes
   `graphIndex` / `graphName`. graphty-element exposes the same as a catalog `listGraphs(source)`.
2. **No listing method;** callers use the existing `importAll()` and pick. No new contract, but a
   picker must import every network of a large session first.
3. **A required `listGraphs()` on every importer** with a one-graph fallback. Uniform, but the
   fallback is wrong for DOT and GML files that hold several graphs.

## 6. Issue code strings

Consumers compare issue code strings. The design adds twelve shared codes (`E_BAD_VALUE`,
`W_WIDENED`, `W_DANGLING_REFERENCE`, `W_DUPLICATE_ATTRIBUTE`, `E_PARENT_CYCLE`,
`W_EQUATION_AS_TEXT`, `W_BAD_VISUAL_VALUE`, `E_BAD_ASPECT_BLOCK`, `W_ASPECT_ORDER`,
`W_COUNT_MISMATCH`, `E_STATUS_FAILED`, `W_STATUS_WARNING`) and the tables `XGMML_ISSUE`,
`XGMML_LOSS`, `CX_ISSUE`, `CX2_ISSUE`, `CX2_LOSS`, `CYS_ISSUE`, `VIZMAP_ISSUE`, `OBO_ISSUE`.

1. **As proposed, promoting GEXF's duplicate-attribute code (recommended).** GEXF's
   `W_GEXF_DUPLICATE_ATTRIBUTE` becomes the shared `W_DUPLICATE_ATTRIBUTE`, and
   `GEXF_ISSUE.DUPLICATE_ATTRIBUTE` aliases it. Follows the package rule (one shared code per
   shared condition), but a consumer comparing the old literal breaks; graph-io is 0.x, so a minor
   release.
2. **As proposed, but leave GEXF's string alone.** No break, but the same condition then has two
   codes, against the package rule, until a later major release.
3. **Format-prefixed codes only** (`W_XGMML_DANGLING_REFERENCE`, ...). No shared vocabulary to
   agree on now, but a consumer handling "dangling reference" must list six codes.

## 7. Coordinate convention for Cytoscape positions

Cytoscape and Cytoscape.js store positions in screen coordinates (y grows downward). graph-io's
other importers store y-up positions.

1. **Keep coordinates as written and mark the column (recommended):** `extra.yAxis: "down"` on
   the `f32 x3` position column, added also to the existing `.cyjs` reader; graphty-element flips
   y when it sees the mark. Lossless round trips. Visible change: `.cyjs` files load mirrored
   relative to today, which is the correct orientation.
2. **Flip y at import,** no mark. Consumers need no logic, but exporters must flip back and a
   round trip is no longer exact; the existing `.cyjs` output changes value instead of gaining a mark.
3. **Keep y-down with no mark.** No change anywhere, but every Cytoscape drawing renders upside
   down in graphty-element.

## 8. Column, metadata and option names

Consumers read columns and options by name. Proposed names: OBO columns named after OBO tags
(`name`, `namespace`, `def`, `is_obsolete`, `synonym`, ...), plus `type` and `relation` (role
`kind`); `graphty.placeholder`; `cytoscape.nestedNetwork`, `cytoscape.selected`,
`cytoscape.hidden`, `cytoscape.bypass`; `z`; `position@<n>`; `meta.extra` keys `xgmml`, `cx`,
`cx2`, `cytoscape`, `obo`, `obographs`; options `graphName`, `zAs`, `labelAliases`,
`cytoscapeEscapes`, `repairBareAmpersands`, `pairSurrogateReferences`, `maxUncompressedBytes`,
`obsolete`, `typedefs`, `oboIds`, and the element's `fileStyles`.

1. **Source names, namespaced only when graph-io restructures data (recommended).** The package
   rule: importer columns keep the source attribute's name, so a GO user finds `namespace` and
   `is_obsolete` under the names the GO documents; data graph-io invents or reshapes gets a
   `cytoscape.` or `graphty.` prefix.
2. **Namespace every new column** (`obo.def`, `obo.namespace`, `cytoscape.z`). No collision with
   a user's own columns, but inconsistent with every existing importer and with GO documentation.
3. **Normalize to generic names** (`description` for `def`, `obsolete` for `is_obsolete`). Easier
   across formats, but a round trip needs a mapping table and users lose the names they know.

## 9. graph-samples dataset names

graph-samples publishes each dataset as a `./datasets/<name>` subpath and a hosted URL.
Proposed: `yeast-perturbation`, `stelzl-interactome`, `wikipathways-senescence-autophagy`,
`go-slim-generic`, `go-basic`, `disease-ontology`, `bioplex3-hct116`.

1. **Descriptive names of the content (recommended),** as listed, matching the existing datasets'
   style. The format is a property of the dataset, not its identity.
2. **Prefix with the format** (`cys-yeast-perturbation`, `obo-go-basic`). Self-describing, but
   the name breaks if the same data is later offered in another format.
3. **Publish no new datasets yet;** keep the files test-only until the importers have shipped one
   release. Defers the naming, but graphty-element's stories need hosted samples.

## 10. graphty-element's public API for the new formats

A `.cys` is a zip; graphty-element reads all inputs as text today, which corrupts it. Proposed
additions: `config.data` widened to `string | Uint8Array | ArrayBuffer`, `DataSource.getBytes()`,
a catalog `listGraphs(source)`, `graphName` / `graphIndex` and `fileStyles` load options.

1. **As proposed (recommended).** Additive, so a minor release; a third party can load a session
   from bytes it already holds, and every format gets graph-io's own encoding detection.
2. **Also accept `Blob` / `File` in `config.data`.** Convenient in browsers, but a DOM type in a
   config shape that otherwise runs in Node; can be added later without breaking anything.
3. **Bytes only through URLs and files, `config.data` stays a string.** Smallest API change, but
   inline `.cys` data is impossible and a consumer with bytes must invent a URL.

## The owner's decisions (2026-10-02)

1. Public names: one subpath per format, as recommended.
2. OBO Graphs JSON: a dialect of the JSON reader, as recommended. Amended 2026-10-03: the owner
   asked for every format to be writable, so `"obographs"` is now a dialect the JSON exporter
   writes too (a member of `JsonDialect`), no longer import-only.
3. Visual information: SKIPPED for now. The owner asked whether graph-io already had a style-import
   solution; it does not (GEXF viz values, GML graphics, yEd graphics and DOT attributes land as
   plain columns, and nothing reads style rules). Building one for Cytoscape alone would fix a
   contract the other formats then have to fit, so style import becomes its own cross-format piece
   of work. The new importers keep per-element visual values as plain columns, like the existing
   importers, and report style rules (mappings, defaults, dependencies) as a loss.
4. The style-file API: dropped with 3 (no `/vizmap` subpath in this work).
5. Choosing one graph: optional `listGraphs()`, as recommended.
6. Issue codes: shared codes, and GEXF's duplicate-attribute code is promoted to
   `W_DUPLICATE_ATTRIBUTE`, as recommended.
7. Cytoscape positions: FLIP y AT IMPORT (not the recommendation). Positions are stored y-up like
   every other importer, with no mark; exporters flip back. This also applies to the existing
   `.cyjs` reader, whose position values change.
8. Column names: source names, as recommended (the package's existing rule).
9. graph-samples names: name the content, as recommended.
10. graphty-element bytes: `config.data` accepts `string | Uint8Array | ArrayBuffer`, with
    `listGraphs(source)` and `graphName` / `graphIndex`, as recommended; `fileStyles` is dropped
    with 3.
