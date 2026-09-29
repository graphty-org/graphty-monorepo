# Recipe

`kind: "graphty-recipe"`, version 1, a member of a graphty document ([container.md](container.md)).
Schema: [recipe.schema.json](recipe.schema.json). The shortest working example is README, "Your
first recipe"; edge-case rulings are rows of [conformance.md](conformance.md). Recipes need
graphty-element 3.0.0.

## Purpose

A recipe is a replayed journal of analysis commands. It records the commands that make up a
repeatable analysis -- which filters narrowed the graph, which algorithms ran with which options over
which part of it, and the layout -- and runs them again on another graph. In the owner's words, it
"supports people on the same team or in the same industry sharing analysis techniques, or the same
person running the same analysis on new data."

A recipe works on data of the same shape, not the same data. Its commands name columns, never
particular nodes or edges, so it replays on any graph whose import has the columns it names,
whatever the file type (README, "Three things called a file format"). A missing column is
reported, never guessed.

## What a recipe records

Version 1 records three commands: filters, algorithm runs and a layout. Everything else a session
does is left out, because a command that names a particular node, a place on the screen or a file
means nothing on the next dataset.

<!-- prettier-ignore -->
| Session action | In a recipe | Why |
| --- | --- | --- |
| Filter the graph by a rule over columns | yes, `graph.filter` | a rule over columns means the same on any graph; every later command sees only what it keeps |
| Run an algorithm | yes, `algo.run` | the core of an analysis: an algorithm key, option values, a scope by rule |
| Set the layout | yes, `layout.set` | options name no element; with its seed the replayed picture is similar |
| Run an algorithm while a filter hides part of the graph | converted | the filter is written as `graph.filter` commands before the run when it is made of rules over columns ("Recording" rule 3) |
| Run with an option naming a node, or on the selection, listed nodes or a kept set | no | the chosen nodes exist only in the data they were chosen from |
| A run that was cancelled, failed or stopped partway | no | its numbers are not what the command computes |
| Load data; select, drag or pin nodes; move the camera; change 2D or 3D | no | the data is what changes between replays; the rest is one-off or presentation |
| Add, edit or remove style layers | no | appearance travels in a style member; a run's own colouring is kept as its `style` option |
| Define a kept set, compute a column, randomise, fetch | no | later versions may add commands; an older reader stops at one it does not know ("Replaying" rule 4) |

## Data model

```ts
interface RecipeMember {
    kind: "graphty-recipe";
    version: 1;
    id: string; // identity across versions: "org.example.hub-genes" or an https: URL
    recipeVersion?: string; // SemVer 2.0.0: "1.2.0"
    name?: string;
    description?: string;
    namespace?: string; // preferred namespace for its run ids: ^[a-z][a-z0-9_]{0,31}$
    directed?: boolean; // the direction of the graph it was recorded on
    parallelEdges?: boolean; // whether that graph held more than one edge between a pair of nodes
    table?: TableReading; // how a table is read for this recipe ("Table data")
    generator?: { name: string; version: string }; // the release that recorded it
    commands: RecipeCommand[]; // replayed in order; at most 1,000
    extensions?: Record<string, unknown>;
}

interface TableReading {
    edgeSource?: string;
    edgeTarget?: string;
    idColumn?: string;
    delimiter?: string; // one character
    variant?: string; // the CSV shape
    repeatedEdges?: "keep" | "first" | "last" | "sum" | "min" | "max" | "error";
}

type RecipeCommand = GraphFilter | AlgoRun | LayoutSet; // "op" is an open list: "Replaying" rule 4

interface GraphFilter {
    op: "graph.filter";
    where: string; // a predicate over the columns of one table
    on?: "nodes" | "edges"; // default "nodes"
    dropIsolated?: boolean; // also drop every node left with no edge; default false
    description?: string;
}

interface AlgoRun {
    op: "algo.run";
    algorithm: string; // catalogue key: "pagerank", "louvain", ...
    as: string; // this run's name in the recipe: ^[a-z][a-z0-9_]*$, at most 64, no "__", unique
    params?: Record<string, unknown>; // option values by catalogue option name ("Commands" rule 4)
    scope?: "graph" | "largest-component" | { where: string; on?: "nodes" | "edges" }; // default "graph"
    seed?: number; // integer, 0 to 2147483647
    sample?: number; // integer, the sample size of an approximate method
    exact?: boolean; // refuse to approximate
    recordedCapSeconds?: number; // advisory, at most 3,600 ("Running" rule 2)
    recordedPrecision?: "f32" | "f64"; // advisory: the precision it was recorded in
    style?: boolean | { size?: boolean | [number, number] }; // what the run paints ("Commands" rule 8)
    description?: string; // why this command is here; shown to people
}

interface LayoutSet {
    op: "layout.set";
    id: string; // catalogue layout id: "force", "circular", ...
    engine?: string; // the engine that draws it; default the catalogue's
    options?: Record<string, unknown>; // the engine's options, the seed among them
    description?: string;
}
```

`AlgoRun` is graphty-element's `AlgorithmRunCommand` (`src/session/planning.ts`) restricted to what
a recipe may hold, plus `style` (the run's `RunStyle`) and `description`; `applySuggestedStyles` is
not recorded. `LayoutSet` is `LayoutSetCommand` without `scope`. `GraphFilter` is recipe syntax, not
a session command: the applier keeps each recipe's filters to itself, gives every run the recipe's
kept graph as an explicit inline scope, and shows the kept graph through `visibility.set` once the
application runs. A filter's `dropIsolated` is a rule-tree node `{ kind: "connected", of }` that
nests, so each filter keeps its place in the sequence.

## Commands

1. Commands replay in order. A command starts after the one before it has finished or been skipped.
   A `layout.set` has finished when its first positions are placed, not when a live layout rests.
2. **`as` is required** on every `algo.run`, unique in the recipe, and never contains `__`, which
   separates a namespace from a name. A later command and a style refer to a run by its `as`.
3. **Options.** `params` are checked against the option descriptors graphty-element publishes for
   the algorithm, and a layout's `options` against those of the engine that will draw it. An
   unknown name skips the command with `E_UNKNOWN_OPTION`, a value out of range with
   `E_OPTION_RANGE`. An option not given takes the published default, and the report lists every
   effective value. Because recipes rely on defaults, graphty-element changes an option's default,
   or renames or removes an option, only in a major release, reads a renamed option through a
   legacy option map, and the report names every option that took a default changed since the
   release named in the recipe's `generator`.
4. **Options that name elements are refused.** An option of type `node-id`, `node-set` or
   `ordering`, or a `partition` given as a list of nodes, skips the command with `E_BAD_COMMAND`.
   An option of type `attribute` names a column and is bound like every column. An option of type
   `attribute` or `partition` may instead name an earlier run's result,
   `{ "result": "modules.group" }` (`<as>.<field>`), bound and counted as a dependency (rule 10) as
   a `results.` path is.
5. **Scope.** What the run looks at, within what the recipe's filters keep (rule 13):
    - `"graph"` (the default): every node and edge the filters keep;
    - `"largest-component"`: of what the filters keep, the connected component (weakly connected on
      a directed graph) with the most nodes, then the most edges, then the one holding the node
      whose id sorts first, so the choice does not depend on file order;
    - `{ "where": predicate }` (`on: "nodes"`, the default): the matched nodes and the edges between
      them;
    - `{ "where": predicate, "on": "edges" }`: every node and only the matched edges. Nodes those
      edges leave isolated stay and count; to drop them, filter first.

    A scope narrows one run and leaves the view alone; a filter narrows every later command. A
    predicate binds against the table `on` names, and a recipe reads columns only: the structural
    paths of style.md, "Paths" rule 3 bind here only to a real column of that name, else the
    command is skipped with `E_BAD_COMMAND`. Any other scope is `E_BAD_COMMAND`. The applier MUST
    pass the scope explicitly, because graphty-element's own default is the visible graph, which the
    reader's filter and time window narrow. A plugin algorithm whose descriptor does not take its
    scope as a subgraph is skipped with `E_BAD_COMMAND` after a filter or under a scope other than
    `"graph"`. A predicate comparing an earlier run's result with a literal carries a notice: a
    community number or a score cut means something else on other data.

6. **Weights are columns.** An algorithm that reads edge weights takes a `weight` option naming the
   edge column to read, and each run builds its own weights from that column, on the CPU and on an
   accelerator alike. Without it the run is unweighted -- no column is read implicitly -- so a plan
   always shows which column a run reads. Every importer names the edge weight `weight` (README,
   "What every importer produces" rule 2), so `"params": { "weight": "weight" }` reads it from any
   file type. Path-based algorithms (betweenness, closeness, shortest paths) read a weight as a
   distance, so a confidence or correlation must not be their weight: the plan says "read as a
   distance" and carries a notice when one is given.
7. **`seed`, `sample`, `exact`** mean what they mean on graphty-element's run command. Whether an
   algorithm is randomised is a fact of its descriptor, and `seed` feeds its own seed option, which
   a recipe never sets in `params` (`E_BAD_COMMAND`). A randomised or sampled command with no
   `seed` runs with its seed option's published default, so it replays the same; only when the
   option has no default is a seed drawn and reported. An algorithm that can approximate samples in
   a recipe only when the command gives `sample`; without one it runs exactly and is never switched
   to sampling by the cost estimate, so it computes the same on every machine. The plan's `method`
   says which.
8. **`style`** is the run's own suggested colouring: `true` paints it, `false` paints nothing, and
   `{ "size": true }` or `{ "size": [a, b] }` paints only the size part. Absent, it paints, unless
   a style member of the same file reads this run's results: then it paints nothing, and the plan
   says so. Its layers are added when the run completes, above every layer present then, and the
   plan's `paints` lists the channels. A writer still writes `false` for a reader of the recipe
   alone ("Recording" rule 6).
9. **Unknown keys.** An algorithm key or layout id this installation has not registered skips the
   command with `E_UNKNOWN_ALGORITHM` or `E_UNKNOWN_LAYOUT`. A retired key graphty-element still
   resolves (`scc`) runs, translated through the catalogue's legacy keys, and the report names the
   current key.
10. **Dependencies.** A command depends on every earlier command whose `as` it reads and on every
    `graph.filter` before it. A command reading a later or unknown `as` is skipped with
    `E_BAD_COMMAND`. When a command is skipped or fails, every command depending on it is skipped
    with `E_DEPENDENCY_SKIPPED`, naming it; the others still run.
11. A command whose scope matches no element is skipped with `E_SCOPE_EMPTY`.
12. **Layouts.** A `layout.set` replaces the layout, so the last one decides the picture; the
    application's `remove()` restores the layout and positions it replaced while the recipe's is
    still in force. It names its `engine` when that is not the catalogue's default. The applier
    dispatches it with the scope `"graph"`, so a recipe's layout draws the whole graph, the elements
    its filters hide included. A seed makes a layout start from the same positions, so a replayed
    picture is similar, not identical. A layout that takes lists of particular nodes
    (`structuralInputs` in its descriptor) is never recorded and is skipped with `E_BAD_COMMAND`.
13. **Filters.** A `graph.filter` narrows the graph every later command of the recipe sees:
    `on: "nodes"` (the default) keeps the matched nodes and the edges between them; `on: "edges"`
    keeps the matched edges and every node, unless `dropIsolated: true` also drops each node left
    with no edge. Isolated nodes that stay count in every later command -- Louvain makes each a
    community of its own -- so an edge-filtered analysis usually wants `dropIsolated`. A second
    filter narrows what the first kept; a recipe never widens its filter, and its filters narrow
    only its own commands. When an application starts running, its kept graph is shown as the
    session's filter, replacing what was shown (the report says so), and `remove()` puts that back;
    until then the reader's own filter stays, and the plan carries a notice that it will be
    replaced. A filter is planned with how many elements it keeps; one that keeps nothing is
    skipped with `E_SCOPE_EMPTY`, and every later command with it.

## How commands name columns

A command names a column in exactly two places: in a `where` -- a filter's or a scope's -- as
`data.<column>` or by its bare name (style.md, "Paths"), of the table its `on` names; and as the
value of an option of type `attribute`, such as `weight`. An option may also name an earlier run's
result, which is not a column. Nothing else refers to the data: node ids, edge ends and the file's
own syntax never appear, which is what makes a recipe portable. The recipe's `table` names the
columns a table keeps its structure in, for the import only.

## Table data

A file that marks its structure itself -- GraphML, GEXF, GML, DOT, Pajek, JSON -- says which fields
are an edge's ends and a node's id. A table does not: a CSV says so only through its headers, which
can be anything (STRING's `protein1` and `protein2`, a pull-down's `bait` and `prey`), and how it is
split into columns and what its repeated rows mean are not in it either. So a recipe for table data
says how its table is read, as it names a weight (decision 7):

```jsonc
"table": { "edgeSource": "protein1", "edgeTarget": "protein2", "delimiter": " ", "repeatedEdges": "first" }
```

1. **The names are the import options**, the one spelling in a graphty document, and mean the same
   when a caller passes them to `data.import`. Each is optional:
    - `edgeSource` and `edgeTarget`: the columns holding an edge's two ends; `idColumn`: a node
      table's id column. Each is a plain field name, looked up as an own name, never evaluated;
    - `delimiter`: one character. Without it the importer chooses among comma, tab, semicolon and
      pipe from the first line, so a space-separated file needs `delimiter: " "`;
    - `variant`: the CSV shape (README, "What every importer produces"); a neo4j-admin import CSV is
      the variant `neo4j`, whose header marks its own structure;
    - `repeatedEdges`: what a second edge between the same two nodes becomes -- `keep` (the
      default), `first`, `last`, `sum`, `min`, `max` or `error`. On an undirected import `A B` and
      `B A` are one pair. `sum`, `min` and `max` combine the weight; every other column of the
      merged edge is its first row's (its last row's for `last`).

    The recipe's own `directed` is read with them as the `directed` import option, which overrides
    what the file says. graphty-element translates the options into graph-io's names; a document
    never uses graph-io's spellings.

2. **When they are used.** Only when a table is imported through the recipe application's
   `import()` (below). A plain `session.data.import` never takes anything from a recipe, held or
   not, so opening a file never changes how the caller's later imports are read.
3. **Defaults, not orders.** An option the caller gives wins, and a difference is reported with
   `W_TABLE_COLUMNS_DIFFER`. The endpoint and id columns, the delimiter and the variant are used
   only when the file's first line holds the reading's endpoint columns (or, for a node table, its
   `idColumn`); when it does not, the file is read by the importer's own rules, as if the recipe
   named none, and `W_TABLE_COLUMNS_DIFFER` says which columns were used. `directed` and
   `repeatedEdges` are used whenever the caller gives none. When the graph was already loaded from
   a table without the recipe, the applier compares the options it was read with and reports each
   difference the same way; the commands still run.
4. On data that marks its own structure, `table` is not used and the recipe's `directed` is not
   passed to the import; `directed` is compared ("Binding to a new graph" rule 2).
5. **Unknown members.** The members of `table` are import options and grow with them in version 1.
   An import through a recipe whose `table` holds a member this reader does not know is refused
   with `E_UNKNOWN_OPTION` at that member's pointer, because reading the table while ignoring an
   instruction about how to read it would give another graph. The commands are not affected.

`application.import(source, options)` takes what `session.data.import` takes, with `options.mode`
`"replace"` (the default) or `"merge"`, so a node table and an edge table are two calls. Its source
is a `file` (a browser `File` or any `Blob`, such as Node's `fs.openAsBlob(path)`), a `stream` of
bytes, a `url` fetched by the caller's page, or `data`, a string for small text; the first three
are read row by row. It reads with the recipe's `table` and `directed` as defaults, binds and plans,
and resolves with the bound plan, which is the application's `report` from then on. It runs
nothing.

## Binding to a new graph

Before anything runs, the applier binds every column a command names to the current graph by the
rules of README, "Applying to new data" rules 1 and 2. In a recipe:

1. A column a `where` orders against a number, or an option reads as numbers (a weight), is read by
   README, "What every importer produces" rule 4: a value that is not a number never matches and is
   not read as a weight, and the report carries `W_COLUMN_TYPE`. The report's `columns` give, for
   each column, how many elements of its table have a value there, and a column held by fewer than
   half carries `W_FEW_VALUES`: an identifier mismatch upstream shows as a column that bound but is
   mostly empty.
2. When the recipe carries `directed` and the graph's direction differs (or is mixed), the report
   carries `W_DIRECTION_DIFFERS`, naming both, before anything runs; the commands run on the graph
   as it is. When the recipe carries `parallelEdges: false` and the graph holds repeated edges, or
   when most pairs of an undirected graph are held twice, it carries `W_PARALLEL_EDGES`, suggesting
   the `repeatedEdges` import option. A hand-written recipe SHOULD carry `directed`.
3. Binding happens when the recipe is applied, before the first command runs, so the report says
   what a recipe needs before it spends anything. Each command is checked again as it starts.
4. **The plan counts.** Each filter, `where` scope and `"largest-component"` scope is evaluated when
   the recipe is planned, and the plan gives how many elements it matches out of how many; every
   command's entry also gives `sees`, how many nodes and edges it will run on. A scope or filter
   matching nothing is `E_SCOPE_EMPTY` in the plan, listing up to five of the column's most frequent
   values when it compares with a text literal, so a vocabulary spelled differently is seen. One
   matching every element carries a notice, because a threshold written for another scale does
   exactly that. One that reads a result of the same recipe is evaluated when that run completes,
   and the later estimates are upper bounds, marked so.

## Finding algorithms and their options

The algorithm keys, their options with types and defaults, their result fields and whether they can
sample are graphty-element's catalogue, published by every release; so are the layouts, their
engines and options. List them in a browser console, or in Node with `createGraphSession()` from
`@graphty/graphty-element/session` in place of `element.session`:

```js
import { layoutEntry } from "@graphty/graphty-element/catalog";

for (const a of element.session.catalog.algorithms()) {
    console.log(
        a.key,
        a.plainName,
        a.options.map((o) => `${o.name} (${o.type})`),
        a.approximable ?? "exact only",
    );
}
for (const l of element.session.catalog.layouts()) {
    for (const e of layoutEntry(l.id)?.implementations ?? []) {
        console.log(
            l.id,
            e.engine,
            e.isDefault ? "(default)" : "",
            e.options.map((o) => o.name),
        );
    }
}
```

A layout's options differ by engine, so a `layout.set` is checked against its engine's own list.
The same catalogue is published for every release as a generated page of graphty-element's
documentation, so a person who runs no JavaScript can read each algorithm's options and whether it
takes `weight`.

## Identity and versions

1. `id` identifies the recipe across all its versions. A reverse-domain name
   (`org.example-lab.hub-genes`) or an `https:` URL is RECOMMENDED. Reserved ids (README, "Trust"
   rule 5) are skipped with `E_BAD_DOCUMENT`.
2. `recipeVersion`, when present, MUST be a SemVer 2.0.0 version, ordered by SemVer precedence. One
   `id` and `recipeVersion` SHOULD name one content; a recipe shared outside its author's own work
   SHOULD carry one.
3. A recipe recorded from a session that applied another recipe and changed it gets a new `id` or a
   new `recipeVersion` from the caller.

## Run ids and namespaces

Applying a recipe gives each run the id `<namespace>__<as>`, so two recipes, or one recipe applied
twice, never overwrite each other's results.

1. The namespace is the caller's `namespace` option; else the recipe's `namespace`; else one derived
   from the last segment of `id`: lower-cased, each run of characters other than `a`-`z` and `0`-`9`
   replaced by one `_`, leading characters up to the first letter removed, cut to 30 characters, a
   trailing `_` removed, `recipe` when nothing is left. `org.example.team-overview` gives
   `team_overview`.
2. When that namespace is already used by another application in the session, `2`, `3` and so on is
   appended (`team_overview2`).
3. A run the recipe names `influence` is then `team_overview__influence`. The applier rewrites, by
   the parsed expression, every `results.<as>` in the recipe's own scopes, filters and `{ "result" }`
   options and in the style members of the same file, with the `runId` of each of their run-sourced
   layers.

## Applying a recipe

```ts
session.recipes.apply(recipe: RecipeMember, options?: {
    columns?: Record<string, string>; // recipe column name -> data column name, both tables
    nodeColumns?: Record<string, string>; // node table only; wins over columns
    edgeColumns?: Record<string, string>; // edge table only; wins over columns
    namespace?: string;
    onRepeat?: "refuse" | "replace" | "add"; // default "refuse"
    run?: boolean; // default false: bind and plan only
    capSeconds?: number; // the per-command cost cap; default the element's own ("Running")
    budget?: { totalSeconds?: number }; // default 300 ("Running")
}): Promise<RecipeApplication>

interface RecipeApplication {
    /** "The replay report". Replaced, never edited, whenever the recipe is planned again and as commands run. */
    readonly report: RecipeReport;
    /** The runs in progress, once started (run: true, or run()); null before. */
    readonly running: Run<RecipeReport> | null;
    /** Imports table data for this recipe, then binds and plans ("Table data"). */
    import(source: DataSourceInput, options?: ImportOptions): Promise<RecipeReport>;
    /** Binds against the graph as it is now and runs the commands not yet run; after a cancel, resumes. */
    run(options?: { capSeconds?: number; budget?: { totalSeconds?: number } }): Run<RecipeReport>;
    cancel(): void;
    /** Removes every run it made and their colouring, and restores the filter and layout it replaced. One undoable step. */
    remove(): void;
}
```

`openDocument(src, { run: true })` applies each recipe of a file this way (container.md, "Applying
a file").

**Undo.** Applying a recipe is one undoable step, and so is `remove()`, which takes back everything
the application did whatever steps its runs recorded as. A `run()` holds no transaction open while
it runs, so the reader's own edits are never refused meanwhile; its runs merge into one step until
the reader does something else.

**Repeat application.** When a recipe with the same `id` has already been applied to the same data
in this session and ran at least one command, a second application follows `onRepeat`: `"refuse"`
(the default) fails with `E_REPEAT_APPLICATION`, naming both versions when they differ;
`"replace"` keeps the earlier namespace, removes the earlier runs and their colouring, and runs
again; `"add"` applies it again under a new namespace. New data starts afresh: an import that
replaces the graph, or a data member that applies, is new data; merging a file, and adding,
removing or updating elements, is the same data. A refused repeat still answers the file's styles:
their `results.<as>` paths bind to the runs of the earlier application.

## Running

1. **Nothing runs until the caller asks** (README, "Applying to new data" rule 4). Runs that should
   happen when data is loaded -- which graphty-element 1.x kept in its style template -- are a
   recipe opened with the data and `run: true`.
2. **The cost cap.** Each command is held to the per-command cap graphty-element applies to the same
   call made by hand -- its `exactComputationSeconds` limit, 30 seconds by default -- or the caller's
   `capSeconds`; a recipe cannot raise it. A command whose estimate is past the cap is planned with
   `E_CAP_EXCEEDED`, its dependants skipped. The estimate held to the cap is that of the method that
   will run, a sampled one included, and a command with no estimate counts as past the cap. A
   command's `recordedCapSeconds` is quoted in the problem as the file's own claim, so the person
   knows what `capSeconds` to consider; the applier never raises the cap from it.
3. **Stopping at the cap.** A command still running when it reaches the cap is stopped, its partial
   result discarded, and reported with `E_CAP_EXCEEDED`; its dependants are skipped. An algorithm
   whose cost the catalogue cannot bound over every option and graph shape is marked `unbounded`,
   and a recipe command naming it is skipped before anything runs.
4. **The total budget.** One application has a total budget of 300 seconds by default. A recipe
   whose planned total is over it does not start: `run()` fails with `E_CAP_EXCEEDED` and the
   estimate, and the caller may pass a larger `budget`. `openDocument` holds all the recipes of one
   file to one budget together, whenever and however each `run()` is called, so a file of many
   recipes cannot spend many budgets. A recipe that reaches its budget while running stops, keeping
   the commands that finished.
5. Cancelling keeps the results of the commands that finished; `run()` again runs the rest.

## Same data, same results

Replaying a recipe on the same data gives the same numbers when all of these hold:

1. **The same release** of graphty-element; the report carries `W_RELEASE_DIFFERS` otherwise.
2. **A seed on every randomised or sampled command**, or a published default seed ("Commands"
   rule 7). The recorder always writes one.
3. **The same method**: exact, or the same sample size.
4. **The same precision.** A WebGPU accelerator computes in single precision and the CPU in double,
   so two machines can differ in the seventh digit and nearly tied nodes can swap rank. With
   acceleration off -- the element's `acceleration` set to `"off"`, or
   `createGraphSession({ acceleration: { policy: "off" } })` -- every run is on the CPU in double
   precision. A replay whose precision differs from the command's `recordedPrecision` carries
   `W_PRECISION_DIFFERS`.
5. **The same direction** (`W_DIRECTION_DIFFERS`).
6. **The same node order**, for algorithms whose result depends on it (Louvain, label propagation):
   the same network read from two file types can list its nodes in another order. The plan flags
   every such command.
7. **The same cap**: a command still running at the cap is stopped, and cost estimates are
   calibrated per machine. A group that replays one file on several machines passes the same
   `capSeconds` on each.

A layout gives a similar picture, not an identical one. A community's number is a label: two
replays that find the same communities can number them differently, so compare which nodes share a
community, not the numbers.

## The replay report

```ts
interface RecipeReport {
    readonly recipe: {
        readonly id: string;
        readonly recipeVersion?: string;
        readonly name?: string;
        readonly description?: string; // the author's own account, shown first in a preview
        readonly table?: TableReading; // as written; filled in an unbound plan too
        readonly parallelEdges?: boolean;
    };
    readonly release: { readonly recorded: string | null; readonly running: string };
    readonly namespace: string;
    readonly direction: { readonly recorded: boolean | null; readonly data: boolean | "mixed" };
    /** Whether the recipe's filter, shown when its run started, replaced one the reader had set. */
    readonly replacedFilter: boolean;
    /** Every column the commands name, and what it bound to. */
    readonly columns: readonly {
        readonly name: string; // as the recipe names it
        readonly table: "node" | "edge";
        readonly boundTo: string | null; // the data's column; null when missing
        readonly renamedByCaller: boolean;
        readonly withValue: number | null; // elements of its table with a value there
        readonly of: number | null;
        readonly usedBy: readonly number[]; // command indexes
        readonly suggestions: readonly string[]; // nearest existing names, never used
    }[];
    readonly commands: readonly {
        readonly index: number;
        readonly op: string;
        readonly description?: string;
        readonly algorithm?: string; // the current key, after a retired one is translated
        readonly name?: string; // the algorithm's or layout's plain name
        readonly layout?: { readonly id: string; readonly engine: string };
        readonly as?: string;
        readonly runId?: string; // the namespaced id
        /** One sentence: "PageRank as 'influence', weighted by confidence, on 2,700 nodes; about 2 s". */
        readonly summary: string;
        /** The scope, or a filter's rule, after renames and namespacing, and what it matches here. */
        readonly scope?: {
            readonly spec:
                | "graph"
                | "largest-component"
                | { readonly where: string; readonly on: "nodes" | "edges"; readonly dropIsolated?: boolean };
            readonly matched: number | null; // null when unbound or not yet computable
            readonly of: number | null;
        };
        readonly sees: { readonly nodes: number | null; readonly edges: number | null };
        readonly state: "planned" | "running" | "done" | "skipped" | "failed" | "cancelled";
        readonly problem?: Problem;
        readonly params: Readonly<Record<string, unknown>>; // effective values, defaults filled in
        readonly method?: { readonly exact: true } | { readonly exact: false; readonly sample: number };
        readonly weight?: { readonly column: string; readonly readAs: "distance" | "strength" };
        readonly seed?: number; // absent when one will be drawn at run time
        readonly recordedPrecision?: "f32" | "f64";
        readonly style: boolean; // whether it will paint its suggested colouring
        readonly paints: readonly {
            readonly channel: string;
            readonly by: string;
            readonly scale?: string;
            readonly palette?: string;
            readonly covers: number | null;
        }[];
        readonly fields: readonly string[]; // the result fields it publishes, as results.<runId>.<field>
        readonly estimateSeconds: number | null;
        readonly estimateIsUpperBound?: boolean;
        readonly replacesLayout?: { readonly id: string | null }; // layout.set
        readonly caveats?: Caveats; // once run: exact or sampled, seed, precision, direction, weight read
    }[];
    readonly totalEstimateSeconds: number | null; // null when any command has no estimate
    readonly capSeconds: number;
    readonly budgetSeconds: number;
    /** Whether run() would start: every estimate known and the total within the budget. */
    readonly wouldStart: boolean;
    readonly wouldStartReason: "ok" | "over-budget" | "unknown-estimate" | "unbound" | "repeat";
    readonly notices: readonly Problem[];
}
```

`Caveats` is graphty-element's published type (`src/session/runs/types.ts`).

## Recording

```ts
session.recipes.record(options: RecordOptions): {
    readonly recipe: RecipeMember | null; // null when rule 8 refused
    readonly leftOut: readonly Problem[]; // every selected run, and the layout, the recorder refused, with the reason
    readonly notices: readonly Problem[]; // conversions, renames
    /** The session run each recorded command came from, by its `as`. */
    readonly sources: readonly { readonly as: string; readonly runId: string }[];
};

interface RecordOptions {
    id: string;
    name?: string;
    description?: string;
    recipeVersion?: string;
    namespace?: string;
    runs?: readonly string[]; // run ids; default every completed run the session holds
    layout?: boolean; // default true: record the last layout set
    explicitDefaults?: boolean; // default false: write every effective option value, defaults too
    dropUnrun?: boolean; // default false: see rule 8
}
```

`session.data.saveDocument({ recipe: options })` records the same way and puts the recipe in a
document beside the style. The recorder:

1. **Chooses runs.** It writes the `algo.run` command of each selected run at the position of its
   latest start, and the last layout set at the position it was set. Runs that failed, were
   cancelled or stopped partway are left out, and so is a run that read another run's result
   which was re-run after it (stale), or a run the caller's `runs` left out.
2. **Leaves out every run a recipe may not hold** ("What a recipe records") and reports each with
   the reason. It never rewrites a run into something it was not: a run on the selection is not
   recorded as a run on the whole graph.
3. **Converts filters and scopes.** The filter a run ran under is the one its record kept from when
   it started. Runs a recipe application made are recorded from that application's own commands.
   A session filter converts when its rule tree is an `all` of leaves, each an exact rule over
   columns (an expression, an edge rule, a range or a set of categories) or over a recorded run's
   result, and becomes `graph.filter` commands before the run; a filter with no exact equivalent,
   a filter by particular nodes, a kept set or a time window leaves the run out, reported. A run
   made by hand keeps its own scope when it is `"graph"`, `"largest-component"` or one rule over
   columns. Every conversion is reported.
4. **Names every run.** A run keeps its explicit name, with a namespace removed; a run without one is
   named from its algorithm key. Every name is made a valid `as` -- lower-cased, each run of
   characters other than `a`-`z` and `0`-`9` replaced by one `_`, `_` trimmed at both ends, `r_`
   put in front when it would not start with a letter, cut to 60 characters (`Hubs 2024` becomes
   `hubs_2024`) -- and each change is reported. When two runs end up with one name, the run that
   first started earliest keeps it and later ones get `_2`, `_3`, so a re-run never renumbers a run,
   here or in an export (export-mapping.md, "Results as columns" rule 1). Every `results.` path,
   `{ "result" }` option and run-sourced layer in the recorded commands and the style saved beside
   them is rewritten to the new names.
5. **Writes what the run computed**: in `params`, every option whose value differs from the
   published default, or every effective value with `explicitDefaults: true` (which a release
   lacking one of those options cannot replay); `seed` whenever the run was randomised or sampled;
   `sample`, or `exact: true` for an approximable algorithm that ran exactly; `recordedCapSeconds`
   when the cap was above the default or the run's estimate or duration passed half of it;
   `recordedPrecision` from the run's caveats; for the layout, the seed the engine used; the
   recipe's `directed` and `parallelEdges` from the graph, `table` from the table imports that
   built it, and `generator`.
6. **Writes `style`** from the run record's `RunStyle`, except that it writes `false` when the style
   saved beside the recipe holds that run's layers, so opening the file paints them once.
7. Takes `id`, and `name`, `recipeVersion` and `namespace` if wanted, from the caller.
8. **Recording under an applied recipe's id.** When `id` is that of a recipe applied in this session
   and some of its commands did not run here -- an unknown `op`, an unknown algorithm, a skipped
   command -- the recorder refuses by default: it returns no recipe, and `leftOut` lists each
   command that did not run, so a colleague's commands are never dropped by a save.
   `dropUnrun: true` records anyway.

## The overview recipe

graphty-element ships one recipe, `graphty.overview` (named "General"), as the default first look
at a new graph; a consumer can configure another. It is an ordinary recipe and, like any recipe,
runs only when the reader asks.

## Replaying

The rules for a file from another release or a hand-written file:

1. Commands are read one at a time; a failure is as small as possible.
2. A command of a known `op` that fails its schema is skipped with `E_BAD_COMMAND`, and its
   dependants with `E_DEPENDENCY_SKIPPED`.
3. **Command members are closed**, and so are a scope's. A command with a member outside its schema
   (`"sed": 7`) is skipped with `E_UNKNOWN_OPTION`, suggesting the nearest member, **and so is every
   later command**, each with `E_DEPENDENCY_SKIPPED` naming it: `seed`, `exact`, `sample` and
   `scope` decide the numbers, and a misspelled one would otherwise run unseeded, sampled or on
   the whole graph. An unknown key inside `params` or `options` skips only that command and its
   dependants. The parts of a run's `style` are open: an unknown part is dropped with
   `W_UNKNOWN_MEMBER` and the run runs.
4. **Unknown commands stop the replay.** `op` is an open list: a later version adds commands to
   version 1 recipes. A command whose `op` the reader does not know is skipped with
   `E_UNKNOWN_COMMAND`, suggesting the nearest known `op`, **and so is every later command**: it
   may change what they see, as a filter does. The commands before it run. An entry that is not an
   object, or has no string `op`, stops the replay the same way with `E_BAD_COMMAND`. The one
   exception is a command carrying `"narrows": false`, its author's statement that it changes
   nothing a later command sees: a reader skips only it and the commands that read its `as`. Every
   op a release adds admits `narrows`. An op of two segments whose first is `graph`, `algo`,
   `layout`, `column`, `style` or `data` is graphty-element's; anyone else's has three or more
   segments and starts with a reverse-domain name (`org.example.motif-census`).
5. Two commands with the same `as`: the second, and every command depending on it, is skipped with
   `E_DUPLICATE_ID`.

## Worked example

A lab ranks hub genes the same way on every new co-expression network: PageRank over the
co-expression weights, then groups, then the degree of the significant genes. It names two columns:
the edge weight, `weight`, and `padj` (an adjusted p-value) on nodes.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-recipe",
            "version": 1,
            "id": "org.example-lab.hub-genes",
            "recipeVersion": "2.0.0",
            "name": "Hub genes",
            "directed": false,
            "commands": [
                {
                    "op": "algo.run",
                    "algorithm": "pagerank",
                    "as": "hubs",
                    "params": { "weight": "weight" },
                    "scope": "largest-component",
                    "description": "Rank genes by weighted PageRank on the connected core."
                },
                { "op": "algo.run", "algorithm": "louvain", "as": "modules" },
                {
                    "op": "algo.run",
                    "algorithm": "degree",
                    "as": "significant_degree",
                    "scope": { "where": "data.padj < 0.05" }
                },
                { "op": "layout.set", "id": "force", "options": { "seed": 42 } }
            ]
        }
    ]
}
```

`modules` runs unweighted, because it has no `weight` param ("Commands" rule 6). Replayed on a
colleague's GraphML file with a `padj` node key and a `weight` edge key, all four commands run.
Replayed on a CSV edge list headed `source,target,weight` with no node table, the third command is
skipped with `E_UNKNOWN_ATTRIBUTE` naming `padj`; the other three run, and the report says so before
anything starts. A plain `data.import` reads a CSV as directed, so that replay also carries
`W_DIRECTION_DIFFERS`; imported through the application's `import()`, which takes the recipe's
`directed: false`, it does not.

Recording it in the first place, from a script that must fail when anything was left out:

```js
const { recipe, leftOut } = element.session.recipes.record({
    id: "org.example-lab.hub-genes",
    recipeVersion: "2.0.0",
    name: "Hub genes",
    runs: ["hubs", "modules", "significant_degree"],
});
if (leftOut.length > 0) throw new Error(leftOut.map((p) => p.reason).join("\n"));
```
