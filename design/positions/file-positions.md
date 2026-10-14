# One file-positions mechanism for graph-io and graphty-element

Graph files store node coordinates in different spellings: y up or y down, the node's center or
its top-left corner, pixels, points, inches or a unit square. Today each graphty-element reader
handles (or drops) them on its own, so GML, Pajek and DOT lose their stored positions (#2490),
yEd and Cytoscape drawings come out mirrored or shifted (#2002, #2003, #2004), and a "use the
file's positions" load option (#2325) has nothing common to stand on.

This design adds one reader in graph-io that turns any format's stored coordinates into a single
neutral form, one inverse that writes them back, and one place in graphty-element that applies
them to every load. It mirrors the file-styles mechanism (PR #2242) where the two do the same job
and says where they differ. It does not depend on #2242 landing first. Every change is additive
for both published packages.

## 0. Where positions live today

Most graph-io importers declare stored coordinates as a node column with role `position` (GEXF,
GML, Pajek, DOT, XGMML, CX, CX2, the Cytoscape-family JSON readers and yEd GraphML). Two do not:

- CSV, where an `x,y` column has no known meaning;
- plain GraphML with numeric `x` / `y` keys, which Gephi writes y up and other tools write y down
  (`gephi-datasets/airlines.graphml` is y down, `graphology/miserables.graphml` is y up).

Both stay unread in this design and say so in the load report (`W_POSITIONS_NOT_READ`, section 1).

## 1. graph-io: the subpath `@graphty/graph-io/positions`

**Files**

- `graph-io/src/positions/index.ts` -- the entry point. Its header states the styles module's
  promise: it loads in Node and never loads a format module.
- `graph-io/src/positions/types.ts` -- the types and the convention, with TSDoc tagged
  `@category Positions`.
- `graph-io/src/positions/codes.ts` -- `POSITION_ISSUE`.
- `graph-io/src/positions/extract.ts` -- `extractPositions()`.
- `graph-io/src/positions/convert.ts` -- `flipY`, the anchor shift and `toFilePositions()`, the
  inverse. Format modules import from here, so they never pull in the reader.
- `graph-io/src/common/notes.ts` -- the note aggregator (at most 8 samples, 80 characters each),
  moved here so file styles and file positions share one collector. #2242 imports it after its
  rebase instead of keeping its own copy in `styles/notes.ts`.
- `graph-io/src/common/units.ts` -- `LengthUnit` and `GraphTool`, shared with styles (below).
- `package.json`: a `"./positions"` export and its vite entry.

**Where the values live.** The snapshot's role-`position` column keeps today's raw values. The
neutral form is computed when asked for, the way `extractStyles()` works, so nothing is stored
twice:

- `extractPositions(importer, snapshot, report, options?)` on its own;
- `importGraph(input, { positions: true })` puts the same value in `result.positions`, the way
  `{ styles: true }` fills `result.styles`.

**The convention.** Every coordinate in `FilePositions` is:

- the center of the node;
- y up;
- in the file's own length unit, which is declared;
- 3 components; z = 0 when the file stored 2, or when every node has the same z (Pajek writes
  z = 0.5 on 2D drawings; 25 of the 30 Pajek fixtures with coordinates do).

```ts
/** "px": screen pixels or typographic points (1 pt counts as 1 px, as file styles count it).
 *  "file": the file's own unit, with no known screen size (Pajek's unit square, NetworkX
 *  coordinates, Graphviz input inches). */
export type LengthUnit = "px" | "file"; // common/units.ts; styles widen to it on rebase

/** The tool that wrote the file, when the file says. Open union, shared with file styles. */
export type GraphTool = "yed" | "cytoscape" | "gephi" | "graphviz" | "pajek" | "networkx" | "tulip" | (string & {});

export interface FilePositions {
    readonly version: 1;
    readonly source: { readonly format: string; readonly tool: GraphTool | null; readonly yAxis: "up" | "down" };
    readonly units: LengthUnit;
    /** Median node diameter in the same unit, when the file stores node sizes; else null. */
    readonly medianNodeSize: number | null;
    readonly dims: 2 | 3;
    readonly coords: Float64Array; // 3 * nodeCount, by node index; NaN = no position
    readonly placed: number; // rows with a position
    readonly total: number; // rows that need one: every node except group containers
    readonly usable: boolean; // false: nothing stored, or every node on one point (coords all NaN)
    readonly bounds: {
        readonly min: readonly [number, number, number];
        readonly max: readonly [number, number, number];
    } | null;
    readonly groups: readonly {
        readonly node: number;
        readonly box: { x: number; y: number; width: number; height: number };
    }[];
    readonly notes: readonly PositionNote[];
}

/** Same shape as StyleNote. `message` is graph-io's English; graphty-element never forwards it. */
export interface PositionNote {
    readonly code: PositionNoteCode;
    readonly params: { readonly count: number; readonly samples: readonly string[] };
    readonly elements: readonly number[] | { readonly count: number };
    readonly message: string;
}

export interface ExtractPositionsOptions {
    readonly signal?: AbortSignal | null;
}

export function extractPositions(
    importer: GraphImporter,
    snapshot: GraphSnapshot,
    report: ImportReport,
    options?: ExtractPositionsOptions,
): FilePositions | null;

/** The inverse: neutral coordinates back into a column spelled as `extra` declares. */
export function toFilePositions(
    coords: Float64Array,
    extra: PositionColumnExtra,
    sizes?: { width: Float64Array; height: Float64Array },
): Float64Array;
```

**How a column says how it is spelled.** Additive optional fields on `ColumnDecl.extra`:

```ts
export interface PositionColumnExtra {
    units?: LengthUnit;
    sourceDims?: 2 | 3;
    yAxis?: "up" | "down";
    anchor?: "center" | "top-left";
    width?: string;
    height?: string; // size columns for top-left
}
```

A missing field means y up, center, `"file"`, which is what today's Cytoscape-family, GEXF and
DOT columns already hold, so no column value changes.

**The importer hook (the advanced path), on `GraphImporter`.** When an importer has the hook, the
hook wins over the column's `extra`; the TSDoc says so and shows the simple form first:

```ts
positions?(snapshot: GraphSnapshot, ctx: PositionReadContext): ImporterPositions | null;
// simple:   () => ({ x: "x", y: "y", yAxis: "down", units: "px" })
// advanced: { column, anchor, width, height, groups, medianNodeSize, tool }
```

`PositionReadContext` sits beside `StyleReadContext` and carries `{ signal }`.

**The generic reader.** It finds the column by role, not by name (`pos`, `position#graphics` and
`yfiles.position` are all found), then:

1. moves a top-left anchor to the center (x + w/2, y + h/2 in the file's own direction);
2. flips y when the column says y grows downward. For a file with a real z it flips y and z
   together: that is a 180-degree rotation about x, so a 3D shape is turned, never mirrored;
3. collapses a z that is the same on every node to 2D;
4. applies the stacked, partial and non-finite rules (codes below);
5. leaves rows with the `parent` role (group containers) out of `placed` and `total` unless the
   format gives them a box, so a clustered file can still count as fully placed.

**Per format**

| Format                       | Change                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GML (`gml/importer.ts`)      | `extra { units: "px", sourceDims }`. `yAxis` comes from the `Creator` key the importer already reads: yFiles or Cytoscape write y down, Gephi or Tulip y up, anything else y down (the GML spec). The tool goes into `source.tool`. A hook reads `w` / `h` from the `graphics` column for `medianNodeSize`                                                                                           |
| Pajek (`pajek/importer.ts`)  | `yAxis: "down"`, pinned by `batagelj/USAir97.net`: Deadhorse is at y 0.10, Miami at 0.53, north at the top. `units: "file"`. A real 3D file has z centered on the cube's middle plane (z - 0.5) before the flip. NetworkX writes `0.0 0.0` for a node with no position, so when other rows are placed, an exact (0,0) shared by two or more rows counts as unplaced and reports `W_POSITION_PARTIAL` |
| DOT                          | `units: "px"` only when the root graph has `bb` (Graphviz layout output, in points); otherwise `"file"` (neato and fdp input `pos` is in inches). `medianNodeSize` = median `width * 72` for `"px"`, median `width` for `"file"`. Each cluster's `bb` ("llx,lly,urx,ury", y up) gives its container node a center position and a `groups` box                                                        |
| XGMML (`xgmml/emit.ts`)      | use the shared `flipY` instead of the inline negation (same values)                                                                                                                                                                                                                                                                                                                                  |
| yEd (`graphml/yfiles.ts`)    | read `y:Geometry` for ShapeNode, GenericNode, ImageNode, SVGNode and ProxyAutoBoundsNode (#2003; today only ShapeNode). For a ProxyAutoBoundsNode, read the realizer that `Realizers@active` names. `extra { units: "px", yAxis: "down", anchor: "top-left", width, height }`. `graphml/positions.ts` adds the group boxes                                                                           |
| GEXF                         | no change to the column. `medianNodeSize` stays null until a Gephi export pins whether `viz:size` is a radius or a diameter                                                                                                                                                                                                                                                                          |
| CX / CX2                     | views after the first report `W_POSITION_OTHER_VIEWS`. Expanded groups with no `cartesianLayout` entry are containers, left out of `total`                                                                                                                                                                                                                                                           |
| JSON (`json/importer.ts`)    | a hook naming the plain `x` / `y` columns. A plain `{ nodes: [{ x, y }] }` file is never flipped: it is read as graphty-element's own convention (y up, center). y down only on a positive marker: d3-force keys (`vx`, `vy`, `fx`, `fy`, `index`) or vis's `physics`. Cytoscape `elements` JSON keeps graph-io's existing y flip                                                                    |
| Plain GraphML `x` / `y`, CSV | not read; `W_POSITIONS_NOT_READ` with the column names, and an issue for an opt-in `positionOptions: { x, y, yAxis }`                                                                                                                                                                                                                                                                                |

**Writing back.** The exporters that write positions call `toFilePositions()` with the column
spelling they write: GML and Pajek flip y on write (as the JSON and XGMML exporters already do),
Pajek adds 0.5 back to a real z, and yEd moves the center back to the top-left corner using the
node's size. So a file loaded and saved by graphty-element is drawn the same way when loaded again.

**Codes (`positions/codes.ts`, re-exported from `@graphty/graph-io/positions`).** They follow the
styles conventions: singular `W_POSITION_*` for notes about some elements, plural `W_POSITIONS_*`
for the whole file, and `POSITION_ISSUE` keys without the `W_` and `POSITION_` prefixes. The
existing format-specific codes stay.

- `W_POSITION_STACKED` -- every node on one point; the coordinates are dropped and `usable` is
  false. This replaces graphty-element's `dropStackedPositions`.
- `W_POSITION_PARTIAL` -- some nodes have no position.
- `W_POSITION_NON_FINITE`
- `W_POSITION_DIMS_MIXED` -- the general form of `W_PAJEK_COORD_DIMS`.
- `W_POSITION_ANCHOR_NO_SIZE` -- a top-left anchor without a size, left uncorrected.
- `W_POSITION_OTHER_VIEWS` -- CX views after the first are not used.
- `W_POSITIONS_NOT_READ` -- the file has position-like columns this format does not read.

## 2. graphty-element: one path for every reader

**`src/data/filePositions.ts` (new)**

- `filePositionsOf(imported)` calls `extractPositions`.
- `fileLengthScale(positions, lengths)` returns the one length factor for a load (below).
- `applyFilePositions(records, positions, ids)` writes `record.position = [x, y, z]` in file units
  wherever graph-io extracted a coordinate. It never deletes a `position` it has no value for.

It is reached through an internal `DataSource.filePositions()` beside `DataSource.fileStyles()`.
Positions are read on every load, styles only when asked, because a position has to be on the
record before the layout starts, while a style layer can be added or removed afterwards.

**`src/data/graph-io-import.ts`**

- `toRecords()` calls `applyFilePositions` after `mapping.node`. That covers every graph-io-backed
  reader: GEXF, GraphML, GML, Pajek, DOT and the `fromImporter` readers (XGMML, CX, CX2, CYS, OBO).
- `copyColumns()` skips the role-`position` column.
- `JsonDataSource` sends a Cytoscape `elements` document through `importWhole` with dialect
  `"cytoscape"` (which already flips y) instead of the raw-record path. A raw record's own
  `position` is taken as written: center, y up, file units.

**Removed (the per-source code):**

- `positions: false` in `GMLDataSource` and `DOTDataSource`;
- the case in `PajekDataSource.nodeRecord` that deletes `position` (its `x` / `y` / `z`
  attributes stay, marked deprecated, until the next grouped major);
- the position case in `GEXFDataSource` and the position handling in
  `GraphMLDataSource.writeYFiles`;
- `dropStackedPositions` and its call in `DataSource.chunkData`.

**Kept:** `readSeedPosition` as the only reader of seeds, and the `record.position` contract for
third-party data sources, now written down in the extending guide: "`record.position` is the
node's center, y up, in file units; the element applies the load's length factor."

**Load options.** On `loadFromUrl`, `loadFromFile`, `dataSourceConfig` and
`session.data.import`, read from a source config the way `choiceOf` reads `styles` /
`styleOptions`:

```ts
positions?: "file" | "none";            // "none": ignore stored positions
positionOptions?: FilePositionOptions;
layout?: ImportOptions["layout"];       // the existing "recommended" | "keep", reused

export interface FilePositionOptions {
  /** "median": the file's median node becomes size 1. "file": file units times
   *  data.knownFields.positionScale (today's behavior). A number: file units times it. */
  readonly lengths?: "median" | "file" | number;
  /** Overrides the y direction graph-io read (for a JSON file it could only guess). */
  readonly yAxis?: "up" | "down";
}
```

Defaults, chosen so nothing an existing caller gets changes except the bug fixes in section 5:

- `positions` omitted: stored positions are used as today, now for every format, and `lengths`
  defaults to `"file"`, so `element.positionScale` keeps working as it does.
- `positions: "file"` named explicitly: `lengths` defaults to `"median"`. When the file stores no
  sizes, `"median"` scales so the bounding-box diagonal divided by sqrt(n) is 2 units.
- `styles: "file"` without a `positionOptions.lengths`: positions take `styleOptions.lengths`, so
  node sizes and the gaps between nodes keep the file's ratio (#2322).
- `layout: "recommended"` picks `fixed` when positions are used and every node in `total` is
  placed. With some nodes placed, it picks a computed layout seeded with the placed ones, so their
  drawing is kept as a start.

`layout` is a per-load choice: with `mode: "merge"` it is ignored, and the layout it picked stays
until another load picks one. A later load with `layout: "keep"` onto a `fixed` layout and a file
with no positions draws every node at the origin; the guide says to pass `layout: "recommended"`
on every load that wants it.

**One length factor per load.** The factor `fileLengthScale` returns is the only scale applied to
that load's positions. It replaces, never multiplies, `knownFields.positionScale` for those rows:
`GraphStore.seedUnplaced` reads the load's factor instead of the global thunk. Each node keeps the
factor it was loaded with, and `data/export.ts` divides by that factor (falling back to
`positionScale` for rows with none), so a load with `"median"` exports in the file's units.

**The simple path:**

```ts
const el = document.querySelector("graphty-element");
await el.loadFromUrl("/maps/network.graphml", { positions: "file", layout: "recommended" });
const used = el.session.data.lastImport()?.positions;
if (used?.status !== "file") console.warn(used?.status, used?.placed, used?.total);
```

**Load report** (`data/report.ts`), neutral facts only:

```ts
LoadReport.positions?: {
  status: "file" | "none" | "stacked" | "partial";
  placed: number; total: number; units: LengthUnit; factor: number;
  notes: readonly FilePositionNote[];   // { code, params, elements }, no message
}
```

`positions: "file"` on a file with nothing usable reports `"none"`, never silently a computed
layout.

**Exports from `./session`:** `FILE_POSITION_ISSUE`, `FILE_POSITION_CODES` and
`FilePositionNoteCode`, re-exported from graph-io the way `FILE_STYLE_ISSUE` is, so an app never
imports graph-io to read them.

**Catalog and preview:** `FormatDescriptor.positions?: { read: boolean; write: boolean }` beside
`FormatDescriptor.styles`, and `LoadDraft.positions: { placed, total, usable } | null` beside
`draft.styles`. The graphty app's "use the file's positions" option (#2325) reads these to decide
whether to offer itself; it computes nothing.

## 3. Docs

- `graphty-element/docs/guide/data-sources.md`, a new section "Drawing a file where it was saved":
    - the simple path above, and what `"recommended"` does with full, partial and missing positions;
    - a table of formats: whether positions are read and written, the unit, and the y rule (the
      JSON marker rule, the GML `Creator` rule, DOT with and without `bb`);
    - `positionOptions.lengths` and `yAxis`, and how they combine with `styleOptions.lengths`;
    - stacked, partial and unread files, and reading `el.session.data.lastImport().positions`;
    - a file with no stored positions gets a computed layout (#2496).
- The Cytoscape example near line 262 is rewritten to use `positionOptions` instead of setting
  `element.positionScale = 0.02` by hand.
- The extending guide states the `record.position` contract.
- `layouts.md` links to the new section.
- graph-io: TSDoc on `positions/types.ts` and the hook, and a short page in `graph-io/docs/guide/`.
- `npm run api:report` gains `positions`, `positionOptions`, `layout` on the load calls,
  `LoadReport.positions`, the `./session` codes, `FormatDescriptor.positions` and
  `LoadDraft.positions`. Every new result field is a literal union or a number.

## 4. Tests

- `graph-io/test/positions/corpus.test.ts`, one `it.each` over each format's sample (corpus plus
  fixtures for GML graphics, GEXF `viz:position`, DOT `pos` with and without `bb`, a DOT cluster,
  a yEd group with two realizers and `active="1"`, a yEd GenericNode). Each asserts `coords` equals
  the file's numbers after the documented conversion. Also: stacked, partial, mixed dims,
  constant-z Pajek, the NetworkX (0,0) pile, an asymmetric 3D Pajek file (`A97.NET`) checked for
  rotation rather than mirroring, the JSON marker rule, and `USAir97.net` pinning Pajek's y.
- `graph-io/test/positions/round-trip.test.ts`: for GML, Pajek and yEd, extract, write with
  `toFilePositions`, read again, and compare.
- `graphty-element/test/browser/file-positions.test.ts`:
    - each sample with `{ positions: "file", layout: "recommended" }`: every node's public position
      equals `extractPositions(...) * factor`, and `report.positions.status` is right;
    - `layout: "keep"` leaves the current layout running; `mode: "merge"` ignores `layout`;
    - a yEd file loaded with `styles: "file"` only: node size divided by the gap between two nodes
      equals the same ratio in the file;
    - a yEd file loaded with `"median"`, exported to GraphML and reloaded, lands where it started;
    - a custom DataSource writing `record.position` is placed by the load's factor.
- A docs-example test compiles the guide's snippet against the built `dist` types and runs it on
  one file per format, asserting the drawing's bounds are within a factor of 2 of the default
  camera's view.

## 5. What changes for an existing caller

- **Bug fixes** (listed in the pull request description):
    - GML, Pajek and DOT positions now seed nodes (#2490);
    - yEd, GML and Pajek are no longer mirrored, and yEd is centered (#2002, #2003, #2004);
    - Cytoscape `elements` JSON draws y up, as graph-io already reads it, instead of mirrored;
    - a load and save keeps the drawing instead of mirroring it.
- **graph-io column values do not change**, except new `yfiles.position` values for yEd node types
  that had none.
- **For the next grouped major:** make `lengths: "median"` the default when `positions` is omitted,
  and remove Pajek's deprecated `x` / `y` / `z` attributes.

## 6. Labels (#2323)

A separate change with no position code. Keep the label edits in commit ace54ab291
(`catalog/label-style.ts`, `config/RichTextStyle.ts`, `managers/StylePainter.ts`,
`meshes/RichTextLabel.ts`, the label part of `Graph.ts`, `test/session/styles/label-style.test.ts`)
after review. Drop the wip commit 2e49c07a42 entirely: the `layout` option already exists on
master as `ImportOptions["layout"]` and is plumbed to the load calls fresh.

## 7. Review findings not taken

- Returning the report from `loadFromUrl` as `{ loadId, report }`: a second path to the object
  `session.data.lastImport()` already returns for every kind of load; the guide shows that call.
- Generating the docs' format table from the catalog: the unit depends on the file (DOT with or
  without `bb`), not the format, so the catalog cannot hold it; read and write come from
  `FormatDescriptor.positions` and the table is checked against it by the docs-example test.
