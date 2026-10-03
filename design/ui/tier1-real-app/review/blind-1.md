# Blind-author review: load preview and column mapping

The proposal under review adds `session.data.preview(source)` and a `mapping` option on
`session.data.import()` to graphty-element, so an app can show "these rows are edges, this column
is the weight" before anything loads. This review was written by an author who read only that
proposal's API section (treated as the published docs page) and graphty-element's published guide
pages (`graphty-element/docs/guide/`), never the source.

Example: `blind-1.ts` (this folder). Scratch type-check: `tmp/api-review/blind-1/`.

## The example

The most common task: the reader picks one CSV file, the page shows what the element found, the
element's guess for the weight column is kept or filled in, then the file loads.

```ts
import "@graphty/graphty-element";
import type { ColumnMapping } from "@graphty/graphty-element/session";

const element = document.querySelector("graphty-element")!;
const input = document.querySelector<HTMLInputElement>("#file")!;

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const source = { config: { file } };
    const preview = await element.session.data.preview(source);
    const edges = preview.tables.find((t) => t.role === "edges");
    console.table(edges?.sample); // show the reader what was found
    const numeric = edges?.columns.find((c) => c.type === "number" && c.name !== preview.mapping.source && c.name !== preview.mapping.target);
    const mapping: ColumnMapping = { ...preview.mapping, weight: preview.mapping.weight ?? numeric?.name ?? null };
    await element.session.data.import(source, { mapping, mode: "replace" });
});
```

## Did it compile

Yes, but only after the author invented two types. Method: graphty-element built (`npm run
build`), a stub re-exporting `dist/session.d.ts` plus the proposal's `LoadPreview`,
`PreviewTable`, `ColumnMapping` verbatim, and a module augmentation adding `preview` and the
widened `import` to the published `SessionDataApi`; `tsc --noEmit`, strict.

- Pass 1, with the proposal's text only: `session-stub.d.ts(14,54): error TS2304: Cannot find
  name 'AttributeType'` and `(14,76): ... 'AttributeLevel'`. Neither name is in section 1, the
  guide, or the built declarations (`grep` over `graphty-element/dist/*.d.ts` finds nothing). With
  the default `skipLibCheck: true` these errors are hidden and `c.type` silently becomes `any`, so
  a consumer's `c.type === "number"` typo-checks against nothing.
- Pass 2, with the author's guess (`"string" | "number" | "boolean" | "date"` and
  `"nominal" | "ordinal" | "interval" | "ratio"`): `blind-1.ts` compiles clean.
- Probe (`tmp/api-review/blind-1/probe.ts`): a mapping written by hand for a file whose columns the
  author already knows, `{ source: "from", target: "to", weight: "trips" }`, fails with `TS2741:
  Property 'tables' is missing`. The simple case -- "my columns are called from/to/trips" --
  cannot be written without first calling `preview` or naming tables.
- Probe: a two-file join (door entries joined to people on `badge_id`) compiles with
  `id: "badge_id", source: "badge_id"` but means nothing: `id`, `source` and `target` are single
  strings with no table, so nothing says which table's column joins to which. The type cannot
  express it and does not reject the attempt.

## Every place the author had to guess

1. **`AttributeType` and `AttributeLevel` values.** Undefined anywhere published. The example's
   `c.type === "number"` is a guess; it could be `"numeric"`, `"integer"`, `"float"`.
2. **What `level` is.** "Level" is statistics jargon (measurement level). The page never says what
   it is for or how it differs from `type`.
3. **Two-file CSV config keys.** The section's own example uses `config: { nodeFile, edgeFile }`;
   the guide documents only `config: { file }`, `{ url }` and `{ data }` for `session.data.import`
   (`docs/guide/data-sources.md:70-73`) and never mentions `nodeFile`/`edgeFile`. The most common
   real case -- a nodes file plus an edges file -- is undiscoverable, so the example uses one file.
4. **`mode` default.** The guide says "A load ADDS to the graph unless you pass `replace: true`"
   (`data-sources.md:89`), but documents that only for `loadFromFile`/`loadFromUrl`/
   `addDataFromSource`. The published `ImportOptions` type says `mode` defaults to `"replace"`
   (`dist/src/session/types.d.ts:520`). The guide never mentions `mode`. The example passes
   `mode: "replace"` defensively.
5. **`undefined` versus `null` in mapping keys.** `weight?: string | null`. Does `null` mean "no
   weight column" and `undefined` mean "let the element guess"? Does spreading `preview.mapping`
   and leaving it unchanged give exactly the load `import` would do with no mapping at all?
6. **`tables` in the mapping versus `tables` in the preview.** Both carry `role`. Can the reader
   flip a table's role by editing `mapping.tables`? What happens if a name in `mapping.tables`
   matches no preview table, or a table is omitted -- is it skipped?
7. **Table names for one file.** "`name`: file name, or `"nodes"` / `"edges"` for one file." Does
   one edge-list CSV produce two tables (a synthesized `nodes` table)? Then `tables.find(role ===
   "edges")` and a `name` of `"edges"` are both needed, and a file actually called `edges.csv` is
   ambiguous with the synthesized name.
8. **`expected` after editing.** `expected` is "as if loaded now" with the element's guess.
   `preview` takes no mapping, so after the reader changes the weight or key column there is no way
   to show updated counts. The page will show stale numbers or none.
9. **`weights` in `expected`.** `Pick<ImportReport, "counts" | "weights" | "endpoints">`; the
   guide documents `counts`, `endpoints`, `repeated`, `policy` on `lastImport()`
   (`data-sources.md:504-509`), never `weights`. Its shape is unknown to a docs-only reader.
10. **Reading a `File` twice.** `preview` then `import` on the same `File`: is it read and parsed
    twice? For a `url` source, fetched twice? Is a 50 MB file's preview cheap (`rowCount: null`
    suggests a prefix read) and is the import consistent with a preview of only a prefix (a column
    that is numeric in the first 20 rows and text later)?
11. **Where the mapping lives afterwards.** Does `session.data.source()` record the mapping, so
    undo/redo, reload and a saved project reproduce the same load? Not stated.
12. **Relation to the existing column options.** The guide already has `nodeIdPath`, `edgeSource`,
    `edgeTarget` on `loadFromUrl` (`data-sources.md:347-356`) and the config key
    `data.knownFields.edgeIdPath` (`data-sources.md:528`). The proposal adds `id`, `source`,
    `target` with different spellings for the same idea. Which wins when both are set? Does a
    mapping write `data.knownFields`? Does naming a column via mapping also "turn the probe off"
    and reject records that lack it, as the guide says naming a column does?
13. **Import path for the new types.** Assumed `@graphty/graphty-element/session` because the
    existing `ImportOptions` and `ImportReport` are exported there. The page does not say.
14. **`data:progress` and `E_TOO_LARGE`.** `data:progress` is given only as a comment: is it on
    `session.on`, and is `format` the same string as `LoadPreview.format`? The proposed
    `E_TOO_LARGE` `details` are `{ limit, found }`, but the guide already promises that `details`
    "carry the limit, the count the load would have reached and the counts the graph holds"
    (`data-sources.md:537-538`) -- three parts. Either the proposal drops the third (breaking) or
    it is incomplete.

## Names that misled

- **`format`** is described as "the data source id that would read it". The guide calls the same
  thing `type` (`session.data.import({ type: "csv", ... })`, `source().type`). Two names for one
  value; `preview.format` cannot obviously be passed back as `type`.
- **`id`** in `ColumnMapping` reads as "the edge id" or "the row id" as easily as "the node key
  column". The guide uses `nodeIdPath` and `edgeIdPath` for exactly this distinction.
- **`level`** -- see guess 2.
- **`tables`** on a single CSV -- the reader thinks in files, not tables.
- **`sample` "first 20 rows"** -- raw file rows keyed by header, or rows after the mapping is
  applied? Unstated.

## Internal concepts the example had to name

- table `role` (`"nodes" | "edges"`) and the idea that one file becomes several tables;
- the column `type` vocabulary (unpublished);
- the "data source id" behind `format`;
- the column-mapping object as a whole, including its required `tables` list, which the simplest
  "these are my column names" case should not need.

The example fits in about 15 lines, but only because it reuses `preview.mapping` wholesale. Any
change beyond one key needs knowledge the docs do not give.

## What would fix it

- Publish `AttributeType`/`AttributeLevel` (or drop `level`) with their values in the docs page.
- Make `tables` optional in `ColumnMapping` so `{ source: "from", target: "to" }` works with no
  preview; or reuse the existing `nodeIdPath`/`edgeSource`/`edgeTarget` spellings instead of
  inventing `id`/`source`/`target`.
- Let `preview(source, { mapping })` recompute `expected`, so an edited mapping can be checked
  before Load.
- Per-table keys for joins: e.g. `{ table, column }` references, so an edges table can join to a
  nodes table on a column other than the node id.
- Document `nodeFile`/`edgeFile`, `mode`, null-vs-undefined, and whether the mapping is kept in
  `source()`.
- Rename `format` to `type` to match `DataSourceInput.type`; reconcile `E_TOO_LARGE` `details`
  with the shape the guide already promises.
