# The graphty document file

`kind: "graphty-document"`, version 1. Schema: [container.schema.json](container.schema.json), and
[data.schema.json](data.schema.json) for the data member. What the documents are for, how they
apply to new data, the trust rules and the limits are in [README.md](README.md). Edge-case rulings
are rows of [conformance.md](conformance.md).

## File name and media type

A graphty document is saved as `<name>.graphty.json`. A plain `.json` would be confused with graph
data in graph-io's JSON dialects in every file picker. The media type
`application/vnd.graphty+json` is reserved for graphty documents and used by nothing today: a
reader decides what a file is from the `kind` inside it, never from its name or a label.

## Data model

```ts
interface GraphtyDocument {
    kind: "graphty-document"; // the fixed value that identifies the file
    version: 1; // the container's major version
    name?: string;
    description?: string;
    generator?: { name: string; version: string }; // the software that wrote it
    requires?: string[]; // member kinds a reader must know to read this file at all
    members: Member[]; // in the order they were written; at most 64
    extensions?: Record<string, unknown>; // reverse-domain keys; see "Extensions"
}

type Member = StyleMember | RecipeMember | DataMember | NotesMember | { kind: string; version: number };
```

Every member has a `kind` and an integer `version`. Version 1 defines four kinds:

<!-- prettier-ignore -->
| `kind` | Page | Holds |
| --- | --- | --- |
| `graphty-style` | [style.md](style.md) | a stack of style layers and the palettes they need |
| `graphty-recipe` | [recipe.md](recipe.md) | a journal of analysis commands |
| `graphty-data` | this page | a graph embedded in a graph-io JSON dialect |
| `graphty-notes` | [notes.md](notes.md) | people's notes about the graph, its elements, sets and results |

Member kinds starting `graphty-` are reserved for graphty-element. Any other kind MUST be a
reverse-domain name (`org.example.bookmarks`), so a third party's kind never collides with one a later
release defines. A file MAY hold several members of one kind (a screen look and a print look,
several recipes); at most one data member applies.

## Reading a file

A reader MUST decide what a JSON text is from its content, never from the file name. `src` is the
file's text, or its bytes as UTF-8.

1. It checks the limits of README, "Limits" -- the size, then the nesting depth, then member names
   while parsing -- and refuses the text with `E_TOO_LARGE` or `E_BAD_DOCUMENT` when one is
   exceeded. Member names are compared after their `\u` escapes are decoded. Text that is not JSON
   is refused with `E_PARSE_FAILED`.
2. A top-level object whose `kind` is `"graphty-document"` is a graphty document.
3. A top-level object with no `kind`, an integer `version` and an array `layers` whose entries are
   all objects, empty or with at least one entry whose `selector` is an object with a string
   `match`, is a style graphty-element 2.x wrote. A reader MUST read it, forever, as a document
   holding that one style member. The test reads only that much: each layer is judged by the
   style's rules, and the version by rule 11. graphty-element writes `kind` on every style from
   3.0.0 on, so only files 2.x wrote are kindless.
4. A top-level object whose `kind` is a string of the member-kind form and whose `version` is an
   integer is read as a document holding that one member, so a bare style or recipe opens, and a
   bare member of an unknown kind is skipped (rule 10) rather than refused. A writer never writes
   one.
5. Anything else is not a graphty document and is refused with `E_UNKNOWN_FORMAT`, with
   `details.available` listing the data formats the caller could import it as instead.
6. A document whose `version` is missing or not a positive integer is refused with
   `E_BAD_DOCUMENT`. One whose `version` is an integer the reader does not implement is refused
   whole with `E_UNSUPPORTED_VERSION` and details `{ kind: "graphty-document", found, reads }`,
   never guessed at and never reported as an empty document.
7. A document whose `members` is missing or not an array is refused with `E_BAD_DOCUMENT`.
8. A document whose `requires` names a kind the reader does not know is refused whole with
   `E_UNSUPPORTED`, naming the kind; so is one in which a member of a required kind is skipped for
   any reason or left out by the caller's `members` option. A writer lists a kind in `requires`
   when other members would be misapplied without it.

Then each member is read on its own:

9. A member that is not an object, has no string `kind`, or has a `version` that is not a positive
   integer is skipped with `E_BAD_DOCUMENT`, naming what is wrong.
10. A member of a kind the reader does not know is skipped with `W_UNKNOWN_KIND`. It is not an
    error: the file is still good for the members this reader knows.
11. A member whose `version` the reader does not implement for its kind is skipped with
    `E_UNSUPPORTED_VERSION` and details `{ kind, found, reads }`.
12. A member whose own top level fails its schema (a style whose `layers` is not an array, a recipe
    with no `id`) is skipped with `E_BAD_DOCUMENT`.
13. Inside a member, failures are as small as possible: a style layer fails alone (style.md), a
    recipe command is skipped with the commands that depend on it (recipe.md). An exception raised
    while one member applies MUST be caught and turned into that member's report entry: one member
    never fails another. A skipped member is kept on save ("Writing a file" rule 3).
14. graphty-element's data import (`data.import`, and every importer its catalogue lists) given
    JSON text of one of the shapes of rules 2 to 4 refuses it with `E_UNKNOWN_FORMAT`, saying it is
    a graphty document to open with `openDocument`.

### Unknown object members

A reader MUST ignore an object member it does not know and report it with `W_UNKNOWN_MEMBER` and
its JSON pointer (`/members/0/layers/2/colour`). The keys of the open maps are never reported: a
layer's `userData`, `extensions` and each extension's payload, a binding's `map`, a command's
`params` and a `layout.set`'s `options` (which recipe.md, "Commands" rule 3 checks against the
catalogue). The closed objects are the exceptions:

<!-- prettier-ignore -->
| Closed object | A reader that meets an unknown member |
| --- | --- |
| a recipe command and its `scope` | skips the command, `E_UNKNOWN_OPTION`, and every later one (recipe.md, "Replaying" rule 3) |
| a recipe's `table` | refuses an import through the recipe, `E_UNKNOWN_OPTION` at the member's pointer; the commands are unaffected (recipe.md, "Table data" rule 5) |
| a data member | skips it, `E_BAD_DOCUMENT` ("The data member" rule 2) |
| a style's selectors, bindings and carried palettes | reports `W_UNKNOWN_MEMBER`, applies the layer, writes the member back; the schema refuses it, so a validator catches the misspelling |
| the keys of a layer's `set` and `encode` | channel names: style.md, "Reading and applying" rule 2 |
| the parts of a run's `style` | drops the part, `W_UNKNOWN_MEMBER`; the run runs (recipe.md, "Replaying" rule 3) |

The first three change a result when a member is ignored, so they stop; the others do not. A
recipe's top level and the document's are open, with one guard: an unknown member within an edit
distance of 2 of `table`, `directed` or `parallelEdges` skips that recipe with `E_UNKNOWN_OPTION`,
and one within 2 of `requires` refuses the file with `E_BAD_DOCUMENT`, each suggesting the name. A
later version never adds a top-level member that close to one of those names.

### Versions

1. `version` is the major version, of the container and of each member kind separately. A style
   member at version 2 inside a container at version 1 is valid.
2. Within a major version a change MUST be additive: a new optional member of an open object, a new
   value in an open list, a new member kind. Removing or renaming a member, or changing what a
   value means, needs a new major version. The open lists are the member kinds, a recipe command's
   `op`, algorithm keys, layout ids, palette ids, JSON dialects, the import option names, a style's
   channel names, selector kinds, scales, layer kinds and enumerated channel values, the parts
   of a run's `style`, note target kinds and item key forms (notes.md). A release that adds a value adds it to its copy of the version 1 schema,
   which graphty-element exports and the schema's URL serves. A reader that does not know a value
   fails that one channel entry, layer or command, never a style or recipe member; a data member
   is skipped whole for a dialect it does not know, because reading it another way gives other
   columns. The closed objects gain members only by the routes of rule 3. Widening a channel's
   value type or range, or adding a member to a label-style record, needs style version 2. A
   writer MUST check the content it generates against the schema of the version it stamps and
   write the next version when it fails; content written back as it was read never changes the
   version stamped.
3. **An addition an old reader would misapply by ignoring it** goes by one of these routes: a
   selector member that narrows what a layer matches is the next major version of the style kind,
   which an old reader refuses by version; a new member kind others depend on is listed in
   `requires`; a recipe command that changes what it computes is a new `op`, where an old reader
   stops the replay (recipe.md, "Replaying" rule 4); a member that changes only what a run paints
   is a new part of the run's `style`; and a change to what a recipe's top level or an existing
   member means is recipe version 2.
4. A writer MUST write the lowest version of each kind that can express the content, so saving a
   file does not lock out a colleague on an older release.
5. A reader MUST read every major version of the container and of each kind that a release of
   graphty-element has written, upgrading an older one on read, and the report says it was
   upgraded. A published file -- a recipe cited in a paper -- stays readable by every later release.

### Extensions

The document and every member MAY carry `extensions`, an object whose member names are
reverse-domain names (`org.example.tool`). The name `graphty` and names starting `graphty.` are
reserved for graphty-element; version 1 defines none. A reader MUST NOT interpret an extension it
does not know and MUST keep it when it writes the file back.

## The data member

The graph itself, when a file carries it, embedded in one of graph-io's JSON dialects. It invents no
data format.

```ts
interface DataMember {
    kind: "graphty-data";
    version: 1;
    name?: string;
    description?: string;
    format: "json";
    dialect: string; // a graph-io JSON dialect: "node-link", "d3", "jgf", "cytoscape", "graphology", "vis", ...
    graph: object | unknown[]; // the graph, as a JSON value in that dialect
    extensions?: Record<string, unknown>;
}
```

1. **Embedded.** `graph` holds the graph in the named dialect, written with that dialect's own
   member names; a writer SHOULD embed in `node-link`, which every graph-io release reads and
   writes. A node's or link's members other than the dialect's own become columns under their own
   names (README, "What every importer produces"):

    ```jsonc
    {
        "nodes": [
            { "id": "a", "team": "sales" },
            { "id": "b", "team": "ops" },
        ],
        "links": [{ "source": "a", "target": "b", "weight": 2 }],
    }
    ```

    gives the node column `team` and the edge weight 2. `dialect` is passed to graph-io's JSON
    importer as a forced dialect, never detected. Embedded data takes no import options. The
    binary wire form of a graph-format snapshot is never embedded.

2. **Closed.** A data member with a member its schema does not list (`encoding`, `href`) is skipped
   with `E_BAD_DOCUMENT`, naming it: reading a graph under an instruction the reader ignored would
   give other columns. A version 1 data member never names a file to read.
3. **Applying.** A data member is imported exactly as the caller importing it would import it,
   under the same limits. It replaces the session's graph only when no graph is loaded or the
   caller passed `data: "replace"`; otherwise it is reported as available and the loaded graph is
   untouched. A file with more than one data member applies the first and skips each other with
   `E_UNSUPPORTED`.
4. **When the data fails.** When a data member that was going to apply does not -- a version or
   dialect this reader does not read, a failed import -- the file's recipes never spend their
   budget on whatever graph happened to be there: with a graph loaded they are planned and not
   run, even with `run: true`; with none they are held (README, "Applying to new data" rule 5).
5. **Unknown dialect.** Embedded data in a dialect graph-io does not read is skipped with
   `E_UNKNOWN_FORMAT`, details `{ format, dialect, available }`.

## Applying a file

```ts
session.data.openDocument(src: string | Uint8Array, options?: {
    apply?: boolean; // default true; false reads, binds and plans, changes nothing, returns the report
    members?: string[]; // the member kinds to apply; default every kind the reader knows
    data?: "keep" | "replace"; // default "keep": a data member applies only when no graph is loaded
    base?: string; // the URL the document came from (style.md, "Reading and applying" rule 8)
    fileName?: string; // the document's file name, for the template id of its styles
    columns?: Record<string, string>; // document column name -> data column name (README, "Applying to new data" rule 2)
    nodeColumns?: Record<string, string>; // the same for the node table only; wins over columns
    edgeColumns?: Record<string, string>; // the same for the edge table only; wins over columns
    run?: boolean; // default false
    onRepeat?: {
        recipe?: "refuse" | "replace" | "add";
        style?: "replace" | "add" | "refuse";
        notes?: "keep-both" | "replace" | "keep-mine"; // default "keep-both" (notes.md, "Opening" rule 3)
    };
    capSeconds?: number; // the per-command cost cap for recipes; default the element's own
    budget?: { totalSeconds?: number }; // one total budget for every recipe of the file; default 300
    openingSeconds?: number; // the opening budget (README, "Limits"); default 5
    limits?: { fileBytes?: number; members?: number; layers?: number; commands?: number };
}): Promise<OpenedDocument>

interface OpenedDocument {
    /** "The report". Replaced, never edited, when this opening's layers and recipes are checked again (README, "Applying to new data" rule 5). */
    readonly report: DocumentReport;
    /** The application of each recipe member, in file order: import(), run(), cancel() and remove(). */
    readonly recipes: readonly RecipeApplication[];
    /** Removes everything this opening added and restores what it replaced. One undoable step. */
    remove(): void;
}
```

The promise resolves once the data has applied, the styles are added and the recipes are planned;
with `run: true` it does not wait for the runs (each recipe's `running`). A file refused whole
("Reading a file" rules 1 and 5 to 8) rejects the promise with a `GraphtyError` whose `code` and
`details` say why, in a preview too, and nothing in the session changes. A member skipped on its
own is an entry of the report, never a rejection.

1. **What applies.** By default every member the reader can read; `members: ["graphty-style"]`
   applies only the style members. `apply: false` applies nothing and returns the report a real
   opening with the same options would give, `preview: true`, every recipe planned in full --
   including one a real opening would refuse as a repeat, which it marks `wouldStart: false` with
   `wouldStartReason: "repeat"`. A preview binds against the graph a real opening would bind to:
   the loaded graph, or, with none loaded or with `data: "replace"`, the file's embedded data
   imported into a scratch graph the session never sees. With no graph at all, the plan is
   unbound and every estimate `null`.
2. **Order.** Data first, then recipes in file order, then styles in file order, then notes: the
   data must exist before anything binds to its columns, a style that paints a recipe's results
   comes after the recipe, and a note binds to the data, the sets and the results before it. A run's own suggested colouring is added when the run completes, above every layer
   present then, the file's style layers included (recipe.md, "Commands" rule 8, says when a run
   paints nothing of its own).
3. **References between members.** A style member path `results.<as>.<field>`, where `<as>` is the
   `as` of a command of a recipe in the same file -- of a known `op` or a later one -- is rewritten
   to the run id that recipe's application gives the command (recipe.md, "Run ids and
   namespaces"). A layer waiting for a run the file's recipe has not produced yet is added
   switched off in the state `waiting`, and graphty-element MUST switch it on when that run
   completes. A layer reading a command that will never run here -- its recipe skipped, left out
   by `members` or refused by `requires`, or the command skipped -- stays switched off, naming the
   recipe or command, and never binds to a run of the reader's own with the same name. A notes
   member's `{ result }` and `{ item }` targets and its cites naming such an `as` are rewritten the
   same way (notes.md, "Opening" rule 8).
4. **One budget for the file.** Every recipe of the file is held to one total budget together,
   `budget.totalSeconds`, however and whenever its `run()` is called (recipe.md, "Running" rule 4).

## Writing a file

```ts
session.data.saveDocument(options?: {
    members?: ("graphty-style" | "graphty-recipe" | "graphty-data" | "graphty-notes")[]; // see rule 4
    name?: string;
    description?: string;
    style?: {
        id?: string;
        styleVersion?: string;
        name?: string;
        description?: string;
        layers?: readonly string[]; // the layers to write, by authored id or LayerId; default every layer
        templateId?: string; // only the layers one opening added (style.md, "Layer sources")
        sources?: readonly ("user" | "template" | "run" | "plugin")[]; // only layers whose source.by is listed
    };
    keepElementSelectors?: boolean; // default false: see rule 4
    recipe?: RecordOptions; // recipe.md, "Recording"
    data?: false | { embed: true };
}): Promise<{
    text: string;
    report: {
        leftOut: readonly Problem[];
        notices: readonly Problem[];
        /** When it recorded a recipe: the session run each written `as` came from. */
        sources?: readonly { as: string; runId: string }[];
    };
}>
```

1. A writer MUST write `kind` and `version` first, then `name`, `description`, `generator`,
   `requires`, `members`, `extensions`; inside a member, the order of its schema. It SHOULD write
   the same bytes for the same content, so a file in version control diffs only where something
   changed. It MUST NOT write a member named `__proto__` at any depth.
2. Software that writes a document MUST write `generator`, naming itself and its version.
3. **Round trip.** Saving a session opened from a file keeps the file's shape. Every member opened
   from it keeps its place in `members`: one that applied is replaced in place by its regenerated
   form, found by its template id (a style), its `id` (a recipe), or for a notes member by being
   the file's only notes member or by its `name`; one that was skipped stays in
   place verbatim; new members are appended. A recipe opened from the file is written back as it
   was read unless the caller records a recipe with the same `id`, which replaces it only when
   every command of the opened recipe ran here or the caller passes `recipe.dropUnrun: true`
   (recipe.md, "Recording" rule 8). A writer MUST keep the unknown object members of a member it
   regenerated -- of the member, of each style layer (matched by `id`, else by position) and of the
   selectors, bindings and palettes in it -- except a recipe command's, which are closed: an
   unknown member of a command it replaced is listed in `report.leftOut`. `requires` is
   recomputed from the members written. A writer does not rewrite references inside members or
   extensions it does not understand.
4. **What is written.** `members` chooses. By default:
    - **the style**: `session.styles.toDocument()` with `kind`, or only the layers `style.layers`,
      `style.templateId` or `style.sources` choose. When the file holds no recipe, a layer a run
      painted is left out and listed in `report.leftOut`, because that run does not exist where the
      file is opened next; `style.sources` including `"run"` keeps it. A layer that selects
      particular elements (style.md, "Selectors") is left out and listed unless
      `keepElementSelectors: true`;
    - **the analysis as a recipe** (recipe.md, "Recording") when `recipe.id` is given;
    - **the data**: never, unless the caller asks. A data member that applied when the file was
      opened is listed in `report.leftOut` instead, so a file for sharing a technique does not
      carry the data by accident. `data: { embed: true }` embeds the graph in `node-link`, its data
      columns only, never run results. `members` including `graphty-data` with no `data` option
      writes back the data member the file was opened with, as read.
    - **the notes**: never, unless `members` includes `graphty-notes`. They are listed in
      `report.leftOut` with their count, because notes are judgments about the data and a file
      saved to share a technique must not carry them by accident. When they are written,
      `session.notes.toDocument()` gives the member, and the report's notices give their count and
      distinct authors (notes.md, "Saving").

    The report's notices list every literal a written selector or `where` compares with, and every
    member, layer and extension written back without being understood, with its size, so the
    author sees what the file discloses before sharing it.

5. **Style ids.** `saveDocument` writes the caller's `style.id`, else the `id` the style was opened
   with; without either, the report notes that reopening the file will not replace an earlier
   opening (style.md, "Reading and applying" rule 8).

## The report

`openDocument`'s report has one entry per member, in file order. The document's own name and
description, and each member's, come first, because they are what the author wrote for the person
opening the file.

```ts
interface DocumentReport {
    /** True for `apply: false`: nothing changed, and "applied" means "would apply". */
    readonly preview: boolean;
    readonly name?: string;
    readonly description?: string;
    /** What the file says about itself: shown as its claim, never as verified. */
    readonly generator?: { readonly name: string; readonly version: string };
    readonly members: readonly MemberReport[];
    /** The graph the members bound to: the caller's, this file's data, or none. */
    readonly graph: {
        readonly source: "loaded" | "document" | "none";
        readonly nodes: number | null;
        readonly edges: number | null;
        readonly directed: boolean | "mixed" | null;
    };
    readonly release: { readonly recorded: string | null; readonly running: string };
    /** Every recipe of the file together, against the one budget ("Applying a file" rule 4). */
    readonly recipes: {
        readonly totalEstimateSeconds: number | null; // null when any command has no estimate
        readonly budgetSeconds: number;
        readonly wouldStart: boolean;
        readonly wouldStartReason: "ok" | "over-budget" | "unknown-estimate" | "unbound" | "repeat";
    };
    readonly notices: readonly Problem[]; // about the document's own top level
}

interface MemberReport {
    readonly index: number; // position in `members`
    readonly kind: string;
    readonly version: number | null;
    /** "partial": some layers or commands did not apply; "planned": a recipe bound but not run. */
    readonly outcome: "applied" | "partial" | "planned" | "skipped";
    /** One sentence: "Style 'Screen look': 4 of 5 layers paint; 1 needs data.padj." */
    readonly summary: string;
    readonly problem?: Problem; // why the whole member was skipped
    readonly style?: StyleReport; // style.md, "Reading and applying"
    readonly recipe?: RecipeReport; // recipe.md, "The replay report"
    readonly notes?: NotesReport; // notes.md, "Opening"
    readonly data?: {
        readonly dialect: string;
        readonly nodes: number | null;
        readonly edges: number | null;
        readonly applied: boolean;
    };
    readonly notices: readonly Problem[];
}

interface Problem {
    readonly what: string; // a JSON pointer, a layer name, a command's `as`
    readonly reason: string; // one sentence a person can act on
    readonly details?: Readonly<Record<string, unknown>>;
    readonly code: GraphtyErrorCode | GraphtyWarningCode;
}
```

When the file's `generator` names graphty-element at a release other than the running one, the
report carries `W_RELEASE_DIFFERS` naming both. Every string a report quotes is text (README,
"Trust" rule 6). The codes are listed in README, "Error and warning codes".

## Worked example

A lab shares its expression analysis without its patients' data: one recipe and one style that
paints the recipe's result. Each colleague supplies a table from their own study.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "name": "Co-expression hubs",
    "generator": { "name": "graphty-element", "version": "3.0.0" },
    "members": [
        {
            "kind": "graphty-recipe",
            "version": 1,
            "id": "org.example-lab.coexpression-hubs",
            "recipeVersion": "1.2.0",
            "table": { "edgeSource": "gene_a", "edgeTarget": "gene_b" },
            "commands": [
                {
                    "op": "algo.run",
                    "algorithm": "pagerank",
                    "as": "hubs",
                    "params": { "weight": "weight" },
                    "style": false
                },
                { "op": "algo.run", "algorithm": "louvain", "as": "modules" }
            ]
        },
        {
            "kind": "graphty-style",
            "version": 1,
            "layers": [
                {
                    "id": "hub-size",
                    "name": "Size by hub score",
                    "selector": { "match": "has", "path": "results.hubs.value" },
                    "encode": { "node.size": { "by": "results.hubs.value", "scale": "sqrt", "range": [1, 3] } }
                }
            ]
        }
    ]
}
```

Opened with no graph loaded, the style's layer and the recipe wait for data. The colleague imports
their own copy with `opened.recipes[0].import({ type: "csv", config: { file } })`: each edge's
ends are read from `gene_a` and `gene_b`, as the recipe's `table` says, and its weight column,
whatever its case, is the column `weight`. The recipe binds and plans, and the runs start when the
colleague calls `opened.recipes[0].run()`. Both runs complete under the namespace
`coexpression_hubs`, the style's path `results.hubs.value` is rewritten to
`results.coexpression_hubs__hubs.value`, and the size layer paints. PageRank's own colouring is
off, because the style paints its result.
