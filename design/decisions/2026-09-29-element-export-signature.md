# The element's export method, its result, and the names of what it writes

Date: 2026-09-29
Decided by: the implementer of the export work item, under the owner's decisions of 2026-09-28
("an export carries whatever the chosen format can represent and reports what it cannot hold";
"third-party file writers register through graphty-element"), where the file-format
specification (`design/extensions/file-format.md` section 8 on branch `docs/extension-point-specs`)
left the choice open.
Changes: graphty-element's public API. Adds `exportGraph` on `<graphty-element>` and `Graph`,
`registerFormatWriter` on `./extend` and the root entry, the `ExportResult` and
`ExportGraphOptions` types, and graph-io's `GraphExporter`, `ExportCapabilities`, `LossNote` and
`CommonExportOptions` re-exported from `./extend`. Every built-in format descriptor now says
`canExport: true`, and `FormatDescriptor` gains an optional `writerOptions` list.

## The decision

1. **`exportGraph(format, options?) -> Promise<ExportResult>`**, on the element and on `Graph`.
   `format` is a catalogue format id. `options` is the writer's own options plus graph-io's
   `sanitizeIds` and `onMixedDirection`.
2. **`ExportResult` is `{ format, lossNotes, text(), bytes }`**. `lossNotes` is computed when
   `exportGraph` resolves, from the exporter's `check()` plus any note the element raised while
   building the snapshot. `text()` writes the whole document; `bytes` is an async iterable of
   UTF-8 chunks that writes it again each time it is iterated. The writing is deferred so a caller
   that only wants the notes (a "this format will lose X" warning before saving) pays nothing for
   the document.
3. **Where the failure lands.** An unknown format and an option the writer does not declare
   reject `exportGraph` itself. A writer's refusal of the graph rejects wherever graph-io raises
   it: what the exporter's `check()` finds up front (GML's integer node ids, a CSV holding both
   `1` and `"1"`) rejects `exportGraph`; what it finds only while writing (graph-io's
   `E_INVALID_ID` for an id GraphML cannot hold) rejects `text()` or the byte iteration. A thrown
   error carrying a string `code` is `E_UNSUPPORTED` with the code in `details.sourceCode`;
   anything else is `E_INTERNAL`, and so is a failure to assemble the snapshot.
4. **Result column names are PROVISIONAL.** Results are written under the element's own result
   path, `results.<runId>.<field>` (what `session.results.path(run, field)` returns), for node,
   edge and scalar graph fields alike, the element-derived `rank` and `percentile` included. The
   file-format specification (section 8.1) calls exported column names a one-way door and leaves
   them to the owner's open decision 24, together with run records as graph attributes, style
   mappings, result tables and exporting a subset. This record does not settle those: the names
   ship because an export must carry results under some name, and they are to be confirmed or
   replaced by that decision before the 3.0.0 release. A graph-level field a format cannot hold
   as a graph attribute is reported as `W_RESULT_FIELD_DROPPED`.
5. **Style is written as graph-format role columns** named `style.color` (four components, 0 to
   1), `style.size` and `style.shape` (nodes) and `style.thickness` (edges), resolved from the
   style layers the element paints with. A record key of the same name -- a file the element
   exported earlier, read back -- is replaced by the drawn value, not written beside it. Current positions are the `position` role column, written only for
   nodes a layout has placed. A loaded `position` attribute is not written separately: it was
   where the node started, and the current coordinates replace it. Positions are divided by
   `positionScale`, because a load multiplies a file's coordinates by it. The edge weight is the
   one the element stores (through `edgeWeightPath`, the legacy `value` key and the
   `repeatedEdges` fold), written as the weight role.
6. **A Neo4j admin-import file is `exportGraph("csv", { variant: "neo4j" })`**, not a ninth
   catalogue id. The element reads Neo4j files as the CSV variant of the same name, so the
   catalogue keeps one entry and the option name matches the reader's.
7. **The built-in CSV writer defaults to graph-io's plain dialect** (`source,target,weight`)
   instead of graph-io's own choice of the Gephi dialect for a directed graph. The element's CSV
   reader reads the Gephi headers back under their capitalised names (`Weight`, `Type`), so a
   Gephi-dialect export read back into the element renames every column. `{ dialect: "gephi" }`
   still writes the other.
8. **Every writer's options are declared and checked.** Each built-in format's catalogue entry
   lists what `exportGraph` accepts for it in `writerOptions` (graph-io's own option names, plus
   `sanitizeIds` and `onMixedDirection`); a registered writer's entry lists its own
   `writerOptions` plus those two. An option not listed is `E_UNKNOWN_OPTION` and a value outside
   an option's choices `E_OPTION_RANGE`, the same for both. `csv` with `{ variant: "neo4j" }` is
   checked against graph-io's Neo4j writer options.
9. **CSV neutralises formula cells by default**, as the specification's section 8.1 item 4
   requires: a text cell, id or header starting with `=`, `+`, `-`, `@`, tab or carriage return
   gets a leading apostrophe; numbers and texts in the JSON number grammar are never touched.
   `{ neutraliseFormulas: false }` turns it off. It is done by the element while it builds the
   snapshot, because graph-io's CSV writer neutralises nothing.
10. **A reader's own descriptor still may not say `canExport: true`.** Writing is registered
    separately with `registerFormatWriter`, which marks the catalogue entry; a flag on a reader
    with no writer behind it would offer a "Save as" that fails.

## The arguments rejected

- **`exportGraph(format) -> Promise<{ text, lossNotes }>`** (the migration plan's example). A
  single string cannot hold a multi-gigabyte export, and graph-io's exporters already stream, so
  the result carries both a string and a byte stream. Computing the text eagerly would also make
  the notes-only preview pay for the whole document.
- **A ninth format id, `neo4j`.** It would need a reader registered under that id too, or it
  would be a catalogue entry whose files every drop target claims as `csv`; the variant option
  says the same thing without either.
- **Result columns named `<algorithm>.<field>`** or by the run's label. Two runs of one algorithm
  would collide, and a label is not unique. The run id is, and it is the name the rest of the
  element already addresses a result by.
- **Mangling ids by default for GraphML.** `sanitizeIds: "mangle"` rewrites node ids, which an
  export must not do silently; the refusal names the option, so the caller decides.
