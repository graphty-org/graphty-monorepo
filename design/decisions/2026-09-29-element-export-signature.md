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
`canExport: true`.

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
3. **Where the failure lands.** An unknown format and an option a registered writer does not
   declare reject `exportGraph` itself. A writer's refusal of the graph (graph-io's
   `E_INVALID_ID` for an id GraphML cannot hold, for example) rejects `text()` or the byte
   iteration, because that is when graph-io raises it. A thrown error carrying a string `code` is
   `E_UNSUPPORTED` with the code in `details.sourceCode`; anything else is `E_INTERNAL`.
4. **Result column names are the element's own result path**, `results.<runId>.<field>` (what
   `session.results.path(run, field)` returns), for node, edge and scalar graph fields alike. The
   element-derived fields a result publishes (`rank`, `percentile`) are written like any other.
   A graph-level table that a format cannot hold as a graph attribute is reported as
   `W_RESULT_FIELD_DROPPED`.
5. **Style is written as graph-format role columns** named `style.color` (four components, 0 to
   1), `style.size` (nodes) and `style.thickness` (edges), resolved from the style layers the
   element paints with. Current positions are the `position` role column, written only for
   nodes a layout has placed. A loaded `position` attribute is not written separately: it was
   where the node started, and the current coordinates replace it.
6. **A Neo4j admin-import file is `exportGraph("csv", { variant: "neo4j" })`**, not a ninth
   catalogue id. The element reads Neo4j files as the CSV variant of the same name, so the
   catalogue keeps one entry and the option name matches the reader's.
7. **The built-in CSV writer defaults to graph-io's plain dialect** (`source,target,weight`)
   instead of graph-io's own choice of the Gephi dialect for a directed graph. The element's CSV
   reader reads the Gephi headers back under their capitalised names (`Weight`, `Type`), so a
   Gephi-dialect export read back into the element renames every column. `{ dialect: "gephi" }`
   still writes the other.

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
