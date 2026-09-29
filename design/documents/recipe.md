# Recipe

`kind: "graphty-recipe"`, version 1, a member of a graphty document ([container.md](container.md)).
Schema: [recipe.schema.json](recipe.schema.json). The shortest working example is README "Your
first recipe".

Status: specified, not yet implemented. No release of graphty-element replays a recipe yet; the
first that can is graphty-element 3.0.0, with the changes README, "Where this lives in the
packages" lists.

## Purpose

A recipe is a replayed journal of analysis commands. It records the commands that make up a
repeatable analysis -- which filters narrowed the graph, which algorithms ran with which options
over which part of it, and the layout -- and runs them again on another graph. In the owner's words, it "supports people on the
same team or in the same industry sharing analysis techniques, or the same person running the same
analysis on new data."

A recipe works on data of the same shape, not the same data. Its commands name columns and
attributes, never particular nodes or edges, so it replays on any graph whose import has the columns
it names, whatever the file type: a recipe recorded on a GraphML import replays on a CSV, because
every importer produces the same named columns (README, "What every importer produces"). That
holds when the export keeps the column names: graphty-element's own exports do, and another
tool's GraphML may rename a column (or write it as its `weight` key), in which case the caller's
`columns` or `edgeColumns` rename reaches it ("Binding to a new graph" rule 2). When a column it
needs is missing, that is reported, never guessed.

## What a recipe records

A recipe holds three commands in version 1: filters, algorithm runs and a layout. Everything else
a session does is left out, each for a stated reason, because a command that names a particular
node, a place on the screen or a file means nothing on the next dataset.

| Session action                                                                | In a recipe | Why                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Filter the graph by a rule over columns (the session's filter)                | yes         | Keeping the edges scoring 0.4 or more, or the nodes of one type, is a rule over columns, so it means the same thing on any graph. Written as a `graph.filter` command; every later command sees only what the filter keeps     |
| Run an algorithm (`algo.run`)                                                 | yes         | The core of an analysis. It names the algorithm by catalogue key, its options by value and its scope by rule, so it means the same thing on any graph                                                                          |
| Set the layout (`layout.set`)                                                 | yes         | A layout is an algorithm over the whole graph whose options name no element. Recording it with its seed makes the replayed picture similar, which is part of reading the result                                                |
| Run an algorithm while a filter hides part of the graph                       | converted   | The filter is recorded as `graph.filter` commands before the run when it is made of rules over columns ("Recording" rule 3); a filter by particular nodes, a kept set or a neighbourhood, or a time window, leaves the run out |
| Run an algorithm with an option that names a node or a set of nodes           | no          | A shortest path from one chosen account, a search from one start node: the chosen node exists only in the data it was chosen from. Version 1 has no way to choose a node by a rule                                             |
| Run an algorithm on the selection, on a listed set of nodes, or on a kept set | no          | Each names particular elements. A run on the whole graph, the largest component, or the elements a predicate over columns matches is recorded instead                                                                          |
| A run that was cancelled, failed, or stopped partway (a time box, `partial`)  | no          | Its numbers are not what the command computes when it runs to the end                                                                                                                                                          |
| Load or import data                                                           | no          | The data is what changes between replays. The caller supplies it, or the document's data member does (container.md)                                                                                                            |
| Select, hover, drag or pin nodes                                              | no          | One-off actions on particular elements and positions                                                                                                                                                                           |
| Move the camera, change the view mode or the dimension (2D or 3D)             | no          | Presentation, not analysis. A replayed layout draws in the reader's current dimension                                                                                                                                          |
| Add, edit or remove style layers                                              | no          | Appearance travels in a style member, which the same file can carry. Two places for appearance would let them disagree. A run's own suggested colouring is kept, as the run's `style` option                                   |
| Define a kept set, compute a column, randomise, fetch                         | no          | Not in version 1. A later version may add commands for them; an older reader stops at a command it does not know ("Replaying" rule 4)                                                                                          |

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
    table?: TableReading | TableReading[]; // "Table data"; a list is tried in order
    generator?: { name: string; version: string }; // the release that recorded it; record() writes it
    commands: RecipeCommand[]; // replayed in order; at most 1,000
    extensions?: Record<string, unknown>;
}

interface TableReading {
    // the import options of container.md, "Import options", used as defaults when a table is
    // imported for this recipe
    edgeSource?: string;
    edgeTarget?: string;
    idColumn?: string;
    delimiter?: string; // one character
    variant?: string; // the CSV shape
    repeatedEdges?: "keep" | "first" | "last" | "sum" | "min" | "max" | "error";
    combineColumn?: string; // the column sum, min and max combine; default the weight
    columns?: Record<string, string>; // recipe column name -> this table's header ("Table data" rule 1)
    filterWhileReading?: boolean; // filter rows before merging them; default false ("Table data" rule 4)
}

type RecipeCommand = GraphFilter | AlgoRun | LayoutSet; // "op" is an open list: see "Replaying" rule 4

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
    params?: Record<string, unknown>; // option values by catalogue option name; see "Commands" rule 4
    scope?: "graph" | "largest-component" | { where: string; on?: "nodes" | "edges" }; // default "graph"
    seed?: number; // integer, 0 to 2147483647
    sample?: number; // integer, the sample size of an approximate method
    exact?: boolean; // refuse to approximate
    recordedCapSeconds?: number; // advisory: the cost cap it was recorded under ("Running" rule 2)
    recordedPrecision?: "f32" | "f64"; // advisory: the precision it was recorded in, as Caveats spells it
    style?: boolean | { size?: boolean | [number, number] }; // what the run paints; default true
    description?: string; // why this command is here; shown to people
}

interface LayoutSet {
    op: "layout.set";
    id: string; // catalogue layout id: "force", "circular", ...
    engine?: string; // the engine that draws it: "d3", "forceatlas2", ...; default the catalogue's
    options?: Record<string, unknown>; // the engine's options, the seed among them
    description?: string;
}
```

`AlgoRun` is graphty-element's `AlgorithmRunCommand` (`graphty-element/src/session/planning.ts`)
restricted to what a recipe may hold, plus `style` -- the run's `RunStyle`, the run option
graphty-element 2.x keeps on the run's definition, not on the command -- and `description`. The
command's own `applySuggestedStyles` (apply the suggested layers in the same undo step) is not
recorded: a re-run drops it from the stored command, and `style` already says what the run paints. `LayoutSet`
is graphty-element's `LayoutSetCommand` (`graphty-element/src/session/commands/layout.ts`)
restricted the same way: no `scope`, because a recipe's layout draws the whole graph ("Commands"
rule 12), and the seed
where the catalogue declares it, among the engine's `options`. `GraphFilter` is recipe syntax, not a
session command: graphty-element has no `graph.filter` op, and a session's filter is the one rule
tree `visibility.set` holds. The applier keeps each recipe's filters to itself, gives every run
the recipe's kept graph as an explicit inline scope, and shows the kept graph through
`visibility.set` once the application runs; the recorder reads the rule tree a run made by hand
started under, and a run an application made from that application's own commands ("Recording"
rule 3). A `where` on nodes is that
tree's `expression` rule, on edges its `edges` rule. `dropIsolated` has no rule in graphty-element 2.x: its `degree` rule counts
a node's edges in the whole graph, never the edges the filter kept, so a node whose every edge was
filtered out still passes it. A rule that drops the nodes left with no edge, evaluated after the
filter's other rules, is one of the graphty-element changes recipes need (README, "Where this lives
in the packages"): a rule-tree node `{ kind: "connected", of: RuleTree }`, holding the elements of
`of`'s result less every node left with no edge among them. It nests, so a filter keeps its place
in the sequence. The applier folds a recipe's filters into one tree in order: the first filter's
leaf, then `all(<the tree so far>, <the next leaf>)` for each later one, and a filter with
`dropIsolated: true` wraps the tree so far, its own leaf included, in `connected`. An edge filter
with `dropIsolated` followed by a node filter is `all(connected(edges), expression)`: a node the
node filter keeps stays even when it lost its edges to that filter, as rule 13 says.

## Commands

1. Commands replay in order. A command starts after the one before it has finished or been skipped.
   A `layout.set` has finished when its first positions are placed, not when a live layout comes to
   rest. In a session that draws nothing (`createGraphSession()`), which has no layout service, a
   `layout.set` places nothing: it is kept as the session's layout choice, needs no estimate, and
   is reported `done` with a notice that nothing was placed.
2. **`as` is required** on every `algo.run`, unique in the recipe, and never contains `__`, which
   separates a namespace from a name. graphty-element names an unnamed run from its algorithm and
   its scope, which resolves differently on other data, so a recipe always names its runs. A later
   command and a style refer to a run by its `as`.
3. **Options.** `params` are checked against the option descriptors graphty-element publishes for
   the algorithm, and a layout's `options` against those of the engine that will draw it -- the
   `engine` the command names, else the layout's default engine -- as that engine's entry in
   `layoutEntry(id).implementations` publishes them, not the one list `catalog.layouts()` gives
   for the layout's default engine. An unknown name skips the command with
   `E_UNKNOWN_OPTION`, a value out of range with `E_OPTION_RANGE`. An option not given takes the
   published default, and the replay report lists every effective value. Because a recipe relies on
   defaults, graphty-element treats changing an option's default, renaming an option or removing one
   as a breaking change, made only in a major release; a renamed or removed option is still read
   through a legacy option map, as retired algorithm keys are (rule 9). That map also records each
   changed default with the major release that changed it. When the recipe's `generator` names an
   older major release, the report names every option that took a default which changed since;
   with no `generator`, every such option whose default changed since the first release that read
   recipe version 1.
4. **Options that name elements are refused.** An option whose descriptor type is `node-id`,
   `node-set` or `ordering`, or a `partition` given as a literal list of nodes, names particular
   nodes; a command that gives one a value is skipped with `E_BAD_COMMAND`. An option whose type is
   `attribute` names a column, and is bound like every column ("Binding to a new graph"). An
   option of type `attribute` or `partition` may instead name an earlier run's result,
   `{ "result": "modules.group" }` (`<as>.<field>`): a measure of the partition an earlier Louvain
   found, or a weight an earlier run computed. That reference is bound,
   namespaced and counted as a dependency (rule 10) exactly as a `results.` path in a `where` is.
5. **Scope.** What the run looks at, within what the recipe's filters keep (rule 13):
    - `"graph"` (the default): every node and edge the filters keep; with no filter before it, every
      node and edge.
    - `"largest-component"`: of what the filters keep, the connected component (weakly connected, on
      a directed graph) with the most nodes; among equal sizes, the most edges; then the one holding the node whose id sorts
      first (numbers before text, numbers ascending, text by code point). So the choice does not
      depend on the order a file lists its nodes.
    - `{ "where": predicate }`, or `{ "where": predicate, "on": "nodes" }`: the predicate, in
      graphty-element's expression language (style.md, "Expressions"), is evaluated on each node, and the run sees the matched
      nodes and the edges between them.
    - `{ "where": predicate, "on": "edges" }`: the predicate is evaluated on each edge, and the run
      sees every node and only the matched edges. The nodes those edges leave isolated stay, and
      count: PageRank spreads mass over them and Louvain makes each a community of its own. To drop
      them, filter first (rule 13) instead of scoping one run.

    A scope narrows one run and leaves the view alone; a filter narrows every later command and
    shows. `data.<column>` in the predicate names a column of the table `on` says, and binds against
    that table only; `results.<as>.<field>` names a result field published on that table. A recipe
    reads columns only: the structural paths of style.md, "Paths" rule 4 (a node's `data.id`, an
    edge's `data.source` and `data.target`) bind in a recipe only to a real column of that name, and
    where the table has none the command is skipped with `E_BAD_COMMAND`, because it would name
    particular nodes. Any other scope skips the command with `E_BAD_COMMAND`. The applier MUST pass
    the scope to graphty-element explicitly -- the recipe's kept graph for `"graph"` -- because
    graphty-element's own default is the visible graph, which the reader's filter and time window
    narrow, and a replay must not depend on what the reader had filtered or windowed before it
    started. A recipe's scopes ignore the reader's time window. graphty-element hands a run its
    scope as a subgraph only when the algorithm's descriptor says `scopeInput: "subgraph"`, as
    every built-in algorithm does; a plugin algorithm that declares nothing gets `"none"` and
    computes on the whole graph whatever scope it is given. So an `algo.run` of such an algorithm
    is skipped with `E_BAD_COMMAND` when a `graph.filter` comes before it or its scope is not
    `"graph"`, rather than reporting a run inside the kept graph that saw all of it.

    A predicate that compares an earlier run's result with a literal selects by a number of one
    dataset: a community number (``results.modules.group == `3` ``) names another community, or
    none, on other data, and a cut on a score (``results.deg.value >= `42` ``) keeps another fraction
    of the nodes. Recording and replaying such a command carry a notice saying so.

6. **Weights are columns.** An algorithm that reads edge weights takes a `weight` option naming the
   edge column to read, and the run builds its own weight array from that column, on the CPU and
   on an accelerator alike. Without the option it runs unweighted -- every algorithm, with no
   column read implicitly -- so a plan always shows which column a run will read. The weight
   graphty-element resolves at import for drawing and layouts (its `edgeWeightPath` setting) is
   never read by a recipe command, so a page that sets it replays a recipe the same as one that
   does not. Every importer names the edge weight `weight` (README, "What every importer
   produces"), so `"params": { "weight": "weight" }` reads it from any file type, and a graph with
   no such column skips the command with `E_UNKNOWN_ATTRIBUTE`. A weight is read as the algorithm
   reads it: path-based algorithms (betweenness, closeness, shortest paths) treat it as a
   distance, so a confidence or correlation column, where bigger means closer, must not be their
   weight; the plan says "read as a distance" and carries a notice when one is given. A weighted
   path analysis needs a distance column in the imported file, computed before import (README,
   "What version 1 does not cover"). The algorithms that take `weight` are those whose catalogue
   descriptor lists an option `weight` of type `attribute` ("Finding algorithms and their
   options"). In graphty-element 2.x, Louvain and the other weighted algorithms read the one
   weight fixed at import whether or not they are asked to, and PageRank's `weight` option asks
   for that same weight whatever column it names; building a per-run weight array from the named
   column is one of the graphty-element 3.0.0 changes (README, "Where this lives in the packages").
7. **`seed`, `sample`, `exact`** mean what they mean on graphty-element's run command. Whether an
   algorithm is randomised is a fact of its catalogue descriptor; `seed` feeds its own seed option
   (label propagation's `randomSeed`), so a recipe never sets that option in `params`: a command
   that does is skipped with `E_BAD_COMMAND`, naming `seed`, because the two could disagree. A
   randomised or sampled command with no `seed` runs with its seed option's published default when
   the descriptor has one (label propagation's 42), so it replays the same every time. Only when
   the option has no default does graphty-element draw a seed, reported in the command's caveats
   and as a notice, because replaying it then gives different numbers every time. A preview shows
   no drawn seed, because none is drawn until the command runs; its entry says one will be. A
   `seed` above an algorithm's own seed range fails with `E_OPTION_RANGE`; the schema's maximum,
   2,147,483,647, is the smallest range among graphty-element's algorithms. A deterministic algorithm (Louvain as graphty-element implements it) ignores a `seed`,
   and the report says so. A randomised path that takes no seed option cannot be replayed: min-cut
   with `useKarger: true` calls `Math.random` inside @graphty/algorithms today. Until it takes one,
   its descriptor marks that path, and a command that takes it is planned with a notice that its
   results differ on every replay; giving every randomised path a seed option is a precondition of
   releasing recipes (README, "Where this lives in the packages").

    An algorithm that can approximate says so in its descriptor (`approximable`, with its default
    sample size). In a recipe, such a command samples only when it gives `sample`. Without one it
    runs exactly, as if it said `exact: true`: an exact estimate past the cap is planned with
    `E_CAP_EXCEEDED`, quoting the `capSeconds` that would admit it, and is never switched to
    sampling. The same call made by hand samples by itself when the exact estimate passes the cap,
    and graphty-element calibrates that estimate on each machine, so a recipe that left the choice
    to it would compute exactly on one machine and sampled on another. The plan's `method` says,
    before anything runs, which one each command uses. `exact: true` means the same and is
    accepted, with no notice, on an algorithm that cannot approximate; it never degrades
    silently.

8. **`style`** is the run's own suggested colouring, as graphty-element's run option of the same
   name (`RunStyle`): `true` or absent paints it, `false` paints nothing, and the object form
   chooses parts of it. Its layers are added when the run
   completes, above every layer present then. A file whose style member paints this run's result
   MUST say `false`, so the result is not painted twice; the recorder does ("Recording" rule 6).
9. **Unknown keys.** An algorithm key or layout id this installation has not registered skips the
   command with `E_UNKNOWN_ALGORITHM` or `E_UNKNOWN_LAYOUT`. A retired key that graphty-element still
   resolves (`scc` to `components` with `{ "strength": "strong" }`) runs, and the report names the
   current key. The applier translates it through the catalogue's legacy keys, merging their
   options into `params`, before it dispatches the run, because graphty-element's run command
   does not resolve a retired key itself. The algorithm keys and their result fields are graphty-element's catalogue
   (`KNOWN_ALGORITHMS` and each `AlgorithmDescriptor.fields`, exported from its `./catalog` entry
   point); the most used are in style.md, "Result fields".
10. **Dependencies.** A command depends on every earlier command whose `as` it reads through a
    `results.<as>.<field>` path. A command that reads a later or unknown `as` is skipped with
    `E_BAD_COMMAND`. Every command also depends on every `graph.filter` before it. When a command is
    skipped or fails, every command that depends on it is skipped with `E_DEPENDENCY_SKIPPED`,
    naming it. Commands that do not depend on it still run.
11. An empty scope is not a success: a command whose scope matches no element is skipped with
    `E_SCOPE_EMPTY`, and its dependants with `E_DEPENDENCY_SKIPPED`.
12. **Layouts.** A `layout.set` replaces the layout, so only the last one in a recipe decides the
    picture. The application's `remove()` puts back the layout, and the positions, in force before
    the recipe's first `layout.set`, when the recipe's layout is still the one in force; the plan's
    entry for a `layout.set` names the layout it replaces (`replacesLayout`). It follows rules 3, 4 and 9, and names its `engine` when the layout was drawn by one
    other than the catalogue's default, because another engine's seed means something else. The
    applier dispatches it with the scope `"graph"`, which clears whatever layout scope the reader's
    session holds (graphty-element's `layout.set` without a scope keeps it). So a recipe's layout
    draws the whole graph, the elements its filters hide included, and the filter only hides
    them: graphty-element's layout scope means "move these nodes and hold the others still", and
    an engine that computes every position at once (`circular`) refuses one, so laying out only
    the kept graph is a later change. A seed
    makes a layout start from the same positions; an engine that stops on a time-based settle test
    can end in slightly different positions, so a replayed picture is similar, not identical. A
    layout that needs a node (a tree from a root) cannot be recorded.
13. **Filters.** A `graph.filter` narrows the graph every later command of the recipe sees:
    - `on: "nodes"` (the default) keeps the nodes its `where` matches and the edges between them;
    - `on: "edges"` keeps the edges its `where` matches, and every node, unless `dropIsolated: true`
      also drops each node left with no edge. The high-confidence core of a STRING network is
      ``{ "op": "graph.filter", "where": "data.combined_score >= `700`", "on": "edges", "dropIsolated": true }``,
      and a `"largest-component"` run after it runs on the largest component of that core.

    `dropIsolated: true` drops every node that has no edge once this filter's rule has applied,
    including a node that had none before; on `on: "nodes"` it drops the matched nodes that are
    left with no edge between them. Isolated nodes that stay count in every later command: each
    has degree 0 and core number 0, and Louvain makes each a community of its own, so an analysis
    of an edge-filtered network usually wants `dropIsolated: true`.

    A second filter narrows what the first kept; a recipe never widens its filter again. A
    recipe's filters narrow only its own commands: two recipes applied together do not see each
    other's filters. When an application starts running (`run: true` or `run()`), its kept graph
    is shown as the session's filter, replacing what was shown, so the reader sees what that
    recipe's commands see; the report names the filter it replaced. Opening or planning a recipe
    changes nothing the reader sees: until its run starts, the reader's own filter stays in force,
    and the plan carries a notice that the recipe's filter will replace it. `remove()` puts that filter back only when this application's filter
    is still the one shown; when a later application has replaced it, `remove()` hands the filter
    it replaced to that later application, which puts it back on its own `remove()`. So removing
    applications in any order ends at the reader's own filter. A filter binds its columns as a
    scope does, may read an earlier run's result, and is planned with how many elements it keeps
    out of how many. One that keeps nothing is skipped with `E_SCOPE_EMPTY`, and every later
    command with `E_DEPENDENCY_SKIPPED` (rule 10).

## How commands name columns

A command names a column in exactly two places:

- in a `where` -- a filter's or a scope's -- as `data.<column>` (style.md, "Paths": `data.adj.P.Val`
  is the column named `adj.P.Val`), of the table its `on` names;
- as the value of an option whose descriptor type is `attribute`, such as an algorithm's `weight`:
  the column's name, as a string.

An option may also name an earlier run's result (`{ "result": "<as>.<field>" }`, "Commands" rule
4), which is not a column of the data.

Nothing else in a command refers to the data. Node ids, edge ends and the file's own syntax never
appear, which is what makes a recipe portable across file types. The recipe's `table` names the
columns a table keeps its structure in, for the import ("Table data").

## Table data

A file that marks its structure itself -- GraphML, GEXF, GML, DOT, Pajek, JSON -- says which fields
are an edge's ends and a node's id, and usually its direction. A table does not: a CSV says so only
through its headers, and a header can be anything: STRING's `protein1` and `protein2`, a pull-down's
`bait` and `prey`. How a table is split into columns, and what its repeated rows mean, is not in it
either. So a recipe for table data says how its table is read, the way it names a weight:

```jsonc
"table": { "edgeSource": "protein1", "edgeTarget": "protein2", "delimiter": " ", "repeatedEdges": "first", "filterWhileReading": true }
```

1. The names are the import options of container.md, "Import options" (`edgeSource`,
   `edgeTarget`, `idColumn`, `delimiter`, `variant`, `repeatedEdges`, `combineColumn`), and mean
   what they mean there, plus `filterWhileReading` (rule 4) and `columns`. Each is optional. The recipe's own `directed` is
   read with them as the `directed` import option. `table` may be a list of such readings, for a
   group whose members' tools head their tables differently (`supplier_id,buyer_id` in one ERP
   export, `from_company,to_company` in another spreadsheet): they are tried in order by the
   header test of rule 3, the first that passes is used, and the report names which. A reading's
   `columns` maps the recipe's column names to that tool's headers
   (`{ "volume": "amount", "relation": "rel_type" }`): a table read with that reading names each
   such header by the recipe's name as it is read, so the recipe's commands and the style members
   of the same file bind to it, and the report records each rename. It applies only when its
   reading passes the header test, so it is declared by the author for one recognised table
   shape, never guessed; a header it names that the file lacks, or a name that is already a header
   of the file, is not renamed and is reported with `W_TABLE_COLUMNS_DIFFER`. The caller's own
   `columns` and `edgeColumns` apply after it, to the names it produced.
2. **When they are used.** A table is read for a recipe in two ways only: through the
   application's `import(source, options)` (below), and as the file's own data member when it
   references a table (container.md, "The data member" rule 9). A plain `session.data.import`
   never takes anything from a recipe, held or not, so opening a file never changes how the
   caller's later imports are read. An application that holds a recipe with `table` offers the
   first way to a person (README, "Opening a file someone sent you").
3. **Defaults, not orders.** Each value is a default: an option the caller or the data member
   gives wins, and a difference is reported with `W_TABLE_COLUMNS_DIFFER`.
    - The endpoint and id columns, the delimiter and the variant are used when the file's first
      line holds the reading's endpoint columns (or, for a node table, its `idColumn`), read with
      the reading's delimiter. A header is compared with a name exactly, after a leading UTF-8
      byte-order mark and the quotes around a field are removed, as binding compares names; a
      test that fails only on case (`Supplier_ID` for `supplier_id`) fails, and
      `W_TABLE_COLUMNS_DIFFER` names the near miss. When it does not, the test is repeated with the delimiter the
      importer detects; when that finds them, the file is read with the reading's columns and the
      detected delimiter, and `W_TABLE_COLUMNS_DIFFER` names the delimiter (a STRING download a
      colleague saved from a spreadsheet as `protein1,protein2,combined_score`). Otherwise the next
      reading of a list is tried, and when none passes the file is read by the importer's own
      rules, as if the recipe named none of them, and `W_TABLE_COLUMNS_DIFFER` says which columns
      were used instead. So a colleague's `edges.csv` headed `Source,Target,Weight` is read as the
      importer reads it, never broken by another member's names.
    - A reading whose `variant` is `neo4j` has its own test: it passes when the file's first line
      holds `:START_ID` and `:END_ID` (a relationship file) or `:ID` (a node file), and the file is
      then read as that variant, whose header types its own structure, so no endpoint or id
      column and no delimiter of a reading is given to it. A file the caller imports with
      `variant: "neo4j"` is read the same way.
    - A reading that names no endpoint column, no id column and not the `neo4j` variant has
      nothing to test: it always passes, so it ends a list, and its delimiter and variant are used
      as defaults.
    - `directed`, `repeatedEdges`, `combineColumn` and `filterWhileReading` are used whenever the
      caller gives none, a `neo4j`-variant import included, so a group whose recipe says
      `directed: false` reads a Neo4j export undirected too.
4. **Filtering while reading.** The recipe's leading `graph.filter` commands on `on: "edges"` --
   those before its first other command -- whose `where` reads only `data.` columns may be applied
   to each row while the table is read, so a download far larger than the page could hold is read
   down to what the recipe keeps. In this order:
    - **Which names they read.** A filter binds against the columns the import will produce: after
      the weight's normalisation to `weight` (README, "What every importer produces" rule 2) and
      after the caller's `columns` and `edgeColumns` renames, which apply here as they do to every
      command. A filter one of whose columns is not in the header that way is not applied while
      reading; it runs after import, binds or is skipped as usual, and the report carries
      `W_FILTER_AFTER_IMPORT` naming the column. So a table headed `Weight` passes a filter on
      `data.weight`, and a table that lacks the column never loses its edges to a row test.
    - **Only where it gives the same graph.** Filtering rows gives exactly the graph filtering
      after import gives when no rows are merged (the effective `repeatedEdges` is `keep` or
      `error`), and the filter is then applied while reading. When rows are merged (`first`,
      `last`, `sum`, `min`, `max`), filtering first can give another graph: two rows of one pair
      that disagree on the filtered column, or a `sum` of two rows each below a threshold. The
      filter is then applied while reading only when the reading says `filterWhileReading: true`,
      and means: a pair is kept when any of its rows passes, and the merge combines only the kept
      rows, keeping the first kept row's columns. That is the same answer as filtering after
      import whenever a pair's rows agree on the filtered columns, as STRING's two rows of a pair
      always do; the author who writes the flag says so. Without it the table is read whole,
      merged and then filtered, and `W_FILTER_AFTER_IMPORT` says why.
    - **Values.** A row is tested before it is typed, a numeric comparison reading numeric text as
      a number (README, "What every importer produces" rule 4).
    - **What is kept.** A row a filter drops is not imported. When one of the filters applied while
      reading has `dropIsolated: true`, only the ends of the rows that pass every filter up to and
      including the last such one become nodes, because every other node would be dropped as
      isolated: that is the graph those filters keep. Without `dropIsolated`, a dropped row's two
      ends are still imported as nodes, as filtering after import would leave them. Then
      `repeatedEdges` merges the kept rows, and the load ceilings are checked on the graph
      actually built -- its nodes, and the edges left after the merge; the kept rows are held to
      twice the edge ceiling before the merge (README, "Limits").
    - **Reported.** The report's `appliedWhileReading` says which filters were applied while
      reading and how many rows each dropped; the commands themselves still bind and are planned
      as usual, and are not reported as matching every edge.
5. On data that marks its own structure, `table` is not used and not reported, and the recipe's
   `directed` is not passed to the import; `directed` is compared as "Binding to a new graph" rule
   5 says. Such a file may still be imported through the application's `import()`, which reads it
   as a plain import does and then plans.
6. When the graph was already loaded from a table without the recipe, the applier compares the
   columns that import read the ends and the id from with the recipe's, and reports a difference
   with `W_TABLE_COLUMNS_DIFFER` before anything runs. The commands still run: the data was loaded
   as the caller chose.
7. **Unknown members.** The members of a reading are the import options and grow with them
   within version 1 (container.md, "Versions" rule 2). When one holds a member this reader does not
   know, every table import for the recipe is refused with `E_UNKNOWN_OPTION` at that member's
   pointer, because reading the table while ignoring an instruction about how to read it would
   give another graph; the importer's own guesses are never used instead. The commands are not
   affected.
8. The recorder writes `table` from the table imports that built the graph ("Recording" rule 5):
   `idColumn` from a node-table import and `edgeSource` and `edgeTarget` from an edge-table
   import, whether each was given them or found them by itself; the delimiter, variant and
   repeated-edges option when they were not the defaults, the delimiter only when every import
   used the same one (otherwise it is left out and a notice names each import's); and
   `filterWhileReading: true` when an import through a recipe applied a filter while reading under
   a merge. When the recording is made under the id of an applied recipe that has a `table`, the
   recorder keeps that `table` as it was read, every reading in its order, and appends the reading
   an import actually used only when none of the recipe's readings matches it; each change to
   `table` is a notice in the save report. So a group maintainer who re-records the group's recipe
   from an ERP import does not cut the spreadsheet and Neo4j readings out of it.

`application.import(source, options)` ("Applying a recipe") takes what `session.data.import` takes,
with `options.mode` `"replace"` (the default) or `"merge"`, so a node table and an edge table are
two calls. Its `source.config` holds one of `file` (a browser `File`, or any `Blob`, such as
Node's `fs.openAsBlob(path)`), `stream` (a `ReadableStream` of bytes), `url` (fetched by the
caller's page, as a plain import fetches) or `data` (a string, for small text); the first three
are read as a stream, row by row, and never held as one string, which is what lets rule 4 read a
large table down. A gzip file from any of the three is decompressed as it is read (README, "What
every importer produces" rule 6), so STRING's `.txt.gz` is given as it is. It reads with the
recipe's `table` and `directed` as defaults (rules 3 and 4), binds and plans, and resolves with the
bound plan, which is the application's `report` from then on. It runs nothing.

So a recipe does not depend on which header names each importer recognises without options
(README, "What every importer produces"); it replays on a table whose headers no importer would
have guessed.

## Binding to a new graph

Before anything runs, the applier binds every column a command names to the current graph:

1. A column binds when the table it belongs to has a column of exactly that name: case, spaces and
   punctuation included, and as an own name, so `constructor` or `toString` binds only to a column
   of that name. The edge weight is the edge column `weight`.
2. The caller MAY pass a map from the recipe's names to the data's names
   (`apply(recipe, { columns: { "padj": "FDR" } })`, or `columns` on `openDocument`); `nodeColumns`
   and `edgeColumns` rename on one table only, and win over `columns` there. The applier rewrites
   the parsed expression and the option value -- never the text -- and records each rename with its
   table in the report. The map is the only way a name changes. A rename to `id`, `source` or
   `target` binds in a recipe only to a real column of that name, as "Commands" rule 5 says of
   those paths; in a style it reads the structure (style.md, "Coming from Cytoscape").
3. A column that does not bind skips every command that names it with `E_UNKNOWN_ATTRIBUTE`,
   naming the column, and every command that depends on those with `E_DEPENDENCY_SKIPPED`. The
   report lists up to three existing columns with the nearest names as suggestions for the caller;
   the applier never uses one.
4. A column a `where` orders against a number (`<`, `<=`, `>`, `>=`), or an option reads as
   numbers (a weight), is read as numbers: a number, or text that reads as a decimal number, such
   as `"0.01"` in a column an importer typed as text because one cell held `NA`. Any other value --
   `NA`, empty text, a list -- is not a number: it never matches such a comparison and is not read
   as a weight, and the report carries `W_COLUMN_TYPE` with the column and how many elements hold
   one. The command still runs. The report's `columns` give, for each column, how many elements of
   its table have a value there out of how many, and a column held by fewer than half of them
   carries `W_FEW_VALUES`: an identifier mismatch upstream shows as a column that bound but is
   mostly empty. A style's numeric scale reads a column the same way (README, "What
   every importer produces" rule 4).
5. When the recipe carries `directed` and the graph's direction differs (or is mixed), the report
   carries `W_DIRECTION_DIFFERS`, naming both, before anything runs. The commands run on the graph
   as it is; a recipe cannot change a graph's direction, which is the `directed` import option's
   work (container.md, "Import options"). A hand-written recipe SHOULD carry `directed`, so that a
   difference is reported; an author who does not know the direction of the data it is meant for
   leaves it out, and then nothing is compared. Likewise, the report carries `W_PARALLEL_EDGES` with the number of such
   pairs, suggesting the `repeatedEdges` import option, when the recipe carries
   `parallelEdges: false` and the graph holds more than one edge between some pair of nodes, and
   also -- whatever the recipe records -- when more than half of an undirected graph's connected
   pairs are held by two or more edges: a STRING download imported undirected with the default
   `repeatedEdges: "keep"` holds every interaction twice, and doubles every degree and core number.
6. Binding happens when the recipe is applied, before the first command runs, so the report can say
   what a recipe needs before it spends anything. Each command is checked again as it starts, and
   a column an earlier command of the recipe produces counts as a dependency of the commands that
   read it; no version 1 command produces a column, so the two checks agree, and a later command
   that does produce one needs no change to these rules.
7. **Each `where` scope is evaluated when the recipe is planned**, and the plan gives how many
   elements it matches out of how many in its table, and so is each filter and each
   `"largest-component"` scope. Every command's entry also gives `sees`: how many nodes and edges
   the command will run on, after the earlier filters, their `dropIsolated` and its own scope, so
   a person sees how much of the network an analysis covers (an edge filter with `dropIsolated`
   reports kept edges in `matched`, and the nodes it removes only through `sees`). A scope or filter
   matching nothing is `E_SCOPE_EMPTY` in the plan, before anything runs; when it compares a column
   with a text literal, the plan lists up to five of that column's most frequent values, so a
   vocabulary spelled differently (`supplies` for `SUPPLIES`) is seen. A scope or filter matching
   every element of its table carries a notice, because a threshold written for another scale does
   exactly that. A scope or filter that reads a result of the same recipe
   (``results.deg.value >= `5` ``) cannot be evaluated before that run completes: it is planned
   with `matched: null` and a notice, "evaluated when `deg` completes", and its `E_SCOPE_EMPTY`,
   if any, comes when it is evaluated; `sees` is null from there on (rule 8).
8. **Estimates follow the filters.** Each command is estimated on the graph the recipe's earlier
   filters keep, where the plan knows it. After a filter that reads a result of the same recipe,
   the plan cannot know it, so the later commands are estimated on the graph as the last filter
   the plan could evaluate left it, an upper bound, and each such entry says so. A command planned
   past the cap on that upper bound is still planned with `E_CAP_EXCEEDED`, and the entry says the
   estimate is an upper bound, so the person can raise `capSeconds` knowing the kept graph will
   be smaller.

## Finding algorithms and their options

The algorithm keys, their options with types and defaults, their result fields and whether they
can sample are graphty-element's catalogue, published by every release. The layouts, their
engines and options are there too. List them in a browser console, or in Node with
`createGraphSession()` from `@graphty/graphty-element/session` in place of `element.session`:

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

A layout's options differ by engine, so a `layout.set` is checked against its engine's own list
("Commands" rule 3), not the default engine's list that `catalog.layouts()` carries.

The guide pages at `https://graphty.app/docs/graphty-element/` describe the same algorithms and
layouts in prose.

## Identity and versions

1. `id` identifies the recipe across all its versions. A reverse-domain name
   (`org.example-lab.hub-genes`) or an `https:` URL is RECOMMENDED so two authors do not collide.
   Ids starting `graphty.` or `graphty:`, and ids holding `graphty.app` followed by `/`, `:`, `.`
   or nothing, in any case, are reserved for the recipes graphty-element ships, so no spelling of
   a graphty.app URL (`https:graphty.app/...`, `https://graphty.app./...`) gets through; a
   document's recipe with one is skipped with `E_BAD_DOCUMENT`. A preview marks a document recipe
   whose `name` is the name of a recipe graphty-element ships ("General") as not the shipped one.
2. `recipeVersion`, when present, MUST be a SemVer 2.0.0 version, and versions are ordered by SemVer
   precedence (`1.10.0` is newer than `1.9.0`). One `id` and `recipeVersion` SHOULD name one content:
   a change is a new `recipeVersion`. A recipe shared outside its author's own work SHOULD carry one.
3. A recipe recorded from a session that applied another recipe and changed it gets a new `id` or a
   new `recipeVersion` from the caller; the recorder never reuses both.

## Run ids and namespaces

Applying a recipe gives each run the id `<namespace>__<as>`, so two recipes, or one recipe applied
twice, never overwrite each other's results.

1. The namespace is the caller's `namespace` option; else the recipe's `namespace`; else one derived
   from the last segment of `id` (after its last `.`, `/` or `:`), in this order: lower-cased; each
   run of characters other than the ASCII letters `a`-`z` and digits `0`-`9` replaced by one `_`
   (an accented letter is such a character); leading characters up to
   the first letter removed; cut to 30 characters; a trailing `_` removed; `recipe` when nothing is
   left. `org.example.team-overview` gives `team_overview`.
2. When that namespace is already used by another application in the session, `2`, `3` and so on is
   appended (`team_overview2`); the cut to 30 leaves room for it within the 32 the pattern allows.
3. A run the recipe names `influence` is then `team_overview__influence`, and its results are
   `results.team_overview__influence.value`. The applier rewrites, by the parsed expression, every
   `results.<as>` in the recipe's own `where` scopes and `{ "result" }` options, and in the style
   members of the same file (container.md, "Applying a file" rule 5), together with the `runId` of
   each of their layers whose `source` is `{ "by": "run" }`, so those layers stay tied to the run
   and are removed with it.
4. A style saved on its own names runs by their session ids. A namespaced id from an applied recipe
   is stable; an id graphty-element derived for a run started without `as` is not, so such a style
   is refused with `E_UNSTABLE_RUN_ID` (style.md, "Writing" rule 4).

## Applying a recipe

```ts
session.recipes.apply(recipe: RecipeMember, options?: {
    columns?: Record<string, string>; // recipe column name -> data column name, both tables
    nodeColumns?: Record<string, string>; // the same, node table only; wins over columns
    edgeColumns?: Record<string, string>; // the same, edge table only; wins over columns
    namespace?: string;
    onRepeat?: "refuse" | "replace" | "add"; // default "refuse"
    run?: boolean; // default false: bind and plan only
    capSeconds?: number; // the per-command cost cap; default the element's own ("Running")
    budget?: { totalSeconds?: number }; // default: the published total budget ("Running")
}): Promise<RecipeApplication>

interface RecipeApplication {
    /**
     * "The replay report". Replaced, never edited, whenever the recipe is planned again: when data
     * arrives for a held recipe (before that import's promise resolves), when the graph's columns
     * change before it has run, and as commands run.
     */
    readonly report: RecipeReport;
    /** The runs in progress, when they were started (run: true, or run()); null before. */
    readonly running: Run<RecipeReport> | null;
    /** Imports table data for this recipe, then binds and plans ("Table data"). */
    import(source: DataSourceInput, options?: ImportOptions): Promise<RecipeReport>;
    /** Binds against the graph as it is now and runs the commands not yet run; after a cancel, resumes. */
    run(options?: { capSeconds?: number; budget?: { totalSeconds?: number } }): Run<RecipeReport>;
    cancel(): void;
    /**
     * Removes every run this application made and the layers those runs painted, and restores the
     * filter and the layout it replaced ("Commands" rules 12 and 13). One undoable step.
     */
    remove(): void;
}
```

`openDocument(src, { run: true })` applies each recipe of a file this way with `run: true`, and
returns the applications (container.md, "Applying a file").

**Undo.** Applying a recipe (or opening a file) is one undoable step, and so is `remove()`, which
takes back every run the application made, their colouring, and the filter and layout it
replaced, whatever steps the runs recorded as. A `run()` holds no transaction open while it runs,
because a transaction would hold the runs' and styles' keys and refuse the reader's own style
edits with `E_HELD_BY_TRANSACTION` for minutes. Its runs merge into one step while nothing else is
dispatched between them; once the reader does something else, each later run records as its own
step, as graphty-element's journal already records a deferred member that finishes after its step
has left the top. So undoing takes back the runs one step at a time from there, and `remove()` is
the one call that takes back the whole recipe. `remove()` after a partial undo removes and restores
only what is still in force, and reports what it found already gone.

**Repeat application.** When a recipe with the same `id` has already been applied to the same data
in this session and ran at least one command, a second application follows `onRepeat`: `"refuse"`
(the default) fails with `E_REPEAT_APPLICATION`, naming both versions when they differ; `"replace"`
keeps the earlier namespace, removes the earlier runs and the colouring they painted, and runs
again; `"add"` applies it again under a new namespace (rule 2 of "Run ids and namespaces"). A
preview (`apply: false`) reports a repeat as a notice and plans in full, so the two versions can be
compared first. New data starts afresh (container.md, "Applying a file" rule 7): applying a recipe to newly loaded data is
never a repeat of its application to the data that was replaced.

A refused repeat still answers the file's styles. When a file's recipe is refused as a repeat, the
style members of the same file bind their `results.<as>` paths to the runs of the earlier
application of that `id` on this data. So a corrected edition of a look-and-analysis file, opened
again with the defaults, repaints with the runs already made instead of waiting for runs that will
never start (container.md, "Applying a file" rule 5).

## Running

1. **Nothing runs until the caller asks.** Applying binds and plans: every command gets a state and
   graphty-element's cost estimate on the graph it will see ("Binding to a new graph" rule 8), and
   the report totals them. Runs start
   only with `run: true` or `run()`. Opening a document is not a request to run, and neither is
   loading data. Runs that should happen when data is loaded -- which graphty-element 1.x
   kept in its style template -- are a recipe, opened with the data and `run: true`.
2. **The cost cap.** Each command is held to the per-command cost cap graphty-element applies to the
   same call made by hand: its `exactComputationSeconds` limit, 30 seconds by default, or the
   caller's `capSeconds`. A recipe cannot raise it. The plan applies the cap before anything
   runs: a command whose estimate is past it is planned with `E_CAP_EXCEEDED`, its dependants with
   `E_DEPENDENCY_SKIPPED`, and the report gives the cap. When the command carries
   `recordedCapSeconds` -- the cap its author ran it under, which the recorder writes when that was
   above the default -- the problem quotes it, so the person replaying knows what `capSeconds` to
   pass. `recordedCapSeconds` is advice to a person; the applier never raises the cap from it. The estimate held to the cap is the one of the
   method that will run, so a command whose `sample` gives an estimate past the cap is refused with
   `E_CAP_EXCEEDED` like an exact one. A command with no estimate -- a layout whose engine publishes
   none, in a session that draws ("Commands" rule 1 covers one that draws nothing) -- counts as past the cap and is skipped with `E_CAP_EXCEEDED`, never as free; every layout
   engine publishing an estimate, and every iteration count in a layout's options having a maximum,
   is a precondition of releasing recipes.
3. **Stopping at the cap, not only refusing.** An estimate can be wrong, so the cap also holds
   while a command runs: a command still running when it reaches the cap is stopped, its partial
   result discarded, and reported with `E_CAP_EXCEEDED`; its dependants are skipped. This needs
   every command a recipe can run to be stoppable -- run where the applier can terminate it, or
   checking its cancellation signal inside its inner loop -- which graphty-element's algorithms
   are not today (a Brandes betweenness pass is one uninterruptible call). And it needs every
   algorithm's cost class to be an upper bound that counts each option multiplying the work:
   Girvan-Newman repeats an edge-betweenness pass up to `maxIterations` times, so its bound is
   n x m x min(m, `maxIterations`), not one pass. The bound holds over every graph shape a filter
   can keep, not only over options: max-flow is O(n x m^2) and link prediction O(n^2 x d), d a
   node's degree, yet both are charged n x m today, and a filter can keep exactly the shape (a
   star) where the gap is widest. Each such algorithm gets a cost model in n and m that bounds it
   (link prediction n^3 unless scoped, max-flow n x m^2) or is marked `unbounded`. An algorithm whose descriptor does not meet both
   is marked `unbounded` in the catalogue, and a recipe command naming it is skipped with
   `E_CAP_EXCEEDED` before anything runs. Both are preconditions of releasing recipes.
4. **The total budget.** One application has a total budget of 300 seconds by default (ten times the
   default cap). A recipe whose planned total is over the budget does not start: `run()` fails with
   `E_CAP_EXCEEDED` and the estimate, and the caller may run it with a larger `budget`. A recipe that
   reaches its budget while running stops, keeping the commands that finished. `openDocument`
   holds all the recipes of one file to one budget together, so a file of many recipes cannot
   spend many budgets (container.md, "Applying a file"): every application one opening returns
   draws on that opening's one budget, whenever and however its `run()` is called -- with
   `run: true`, or later for a recipe held for data -- and a `run()` that would take the file's
   total past it fails with `E_CAP_EXCEEDED` unless the caller passes a larger `budget` to it.
5. Cancelling keeps the results of the commands that finished; `run()` again runs the rest.

## Same data, same results

Replaying a recipe on the same data gives the same numbers when all of these hold. The replay report
shows the first five; it cannot show the sixth. Whether the data is the same it shows in `data`:
the SHA-256 of each file the graph was imported from, which two replay reports can compare; for a
file whose data member records a `sha256`, whether the loaded bytes are those (container.md, "The
data member" rule 5); how many elements were added, removed or updated after each import
(`changedSince`); and an entry with `sha256: null` for data that came from no file (`data.apply`,
elements added by hand). Two reports with equal hashes and no changes saw the same graph; a report
with changes, or with data from no file, says it cannot show that:

1. **The same release** of graphty-element. The report names the release that recorded the recipe
   (its own `generator`, else the document's) and the one replaying it, and carries
   `W_RELEASE_DIFFERS` when they differ.
2. **A seed on every randomised or sampled command.** The recorder always writes one. A
   hand-written command without one runs with its seed option's published default when the
   descriptor has one, and replays the same; only when the option has no default is a seed
   drawn, reported, and different on every replay ("Commands" rule 7).
3. **The same method**: exact, or the same sample size. The recorder writes what the run used,
   and a command with no `sample` runs exactly on every machine ("Commands" rule 7).
4. **The same precision.** graphty-element computes in single precision on a WebGPU accelerator and
   in double precision on the CPU, so the same run on two machines can differ in the seventh digit,
   and nearly tied nodes can swap rank. `caveats.precision` shows which was used, and the recorder
   writes it as the command's advisory `recordedPrecision`; when a replay's precision differs from
   it, the report carries `W_PRECISION_DIFFERS` before anything runs where the plan knows the
   precision, and on the command once it has run otherwise. `recordedPrecision` records what
   happened; it never asks for a precision. The caller controls it: with acceleration off -- the
   element's `acceleration` attribute or property set to `"off"`, or
   `createGraphSession({ acceleration: { policy: "off" } })` -- every run is on the CPU in double
   precision, so two machines that both turn it off before recording and replaying compute the
   same numbers. `W_PRECISION_DIFFERS` names that setting. Under the default `"auto"` an
   accelerator takes only work over its `minNodes` threshold, so on one machine a small graph can
   run in double precision and a larger one in single.
5. **The same direction** (`W_DIRECTION_DIFFERS`, "Binding to a new graph" rule 5).
6. **The same node order**, for algorithms whose result depends on the order nodes are visited
   (Louvain, label propagation). The same network read from two file types, or two releases of one
   database, can list its nodes in a different order, so Louvain can find different communities on
   its CSV and its GraphML export. The plan carries a notice on every command whose algorithm's descriptor
   says its result depends on node order, so this condition is seen before anything runs.

A layout gives a similar picture, not an identical one ("Commands" rule 12). A community's number
is a label, not a measure: two replays that find the same communities can number them differently,
so compare which nodes share a community, not the numbers.

A report does not compare results (README, "What version 1 does not cover"). Each run's results are
read in the session with `session.results.get(runId)`, the `runId` each command's entry in the
report names. This compares two runs field by field: every numeric field of nodes and of edges
over every element either run holds, a partition (`group`) by which elements share a group rather
than by the numbers, and every graph-level number, flag or text (a modularity). It ends by saying
how much it compared, so a comparison that found nothing to compare does not read as a match:

```js
function compare(session, runA, runB) {
    const a = session.results.get(runA),
        b = session.results.get(runB);
    let fields = 0,
        values = 0,
        differ = 0;
    const note = (what, x, y) => (differ++, console.log(runA, what, x, y));
    for (const f of a.fields) {
        if (f.kind === "graph" && f.type !== "table") {
            fields++;
            values++;
            if (JSON.stringify(a.graph[f.name]) !== JSON.stringify(b.graph[f.name]))
                note(f.name, a.graph[f.name], b.graph[f.name]);
        }
        if (f.kind === "graph" || (f.type !== "number" && f.type !== "integer")) continue;
        fields++;
        const va = new Map(a.ranking(f.name).map((e) => [e.id, e.value]));
        const vb = new Map(b.ranking(f.name).map((e) => [e.id, e.value]));
        const aToB = new Map(),
            bToA = new Map(); // a partition: each group of a is one group of b
        for (const id of new Set([...va.keys(), ...vb.keys()])) {
            values++;
            const x = va.get(id),
                y = vb.get(id);
            const same =
                f.name !== "group"
                    ? x === y
                    : (aToB.get(x) ?? (aToB.set(x, y), y)) === y && (bToA.get(y) ?? (bToA.set(y, x), x)) === x;
            if (!same) note(`${f.kind} ${f.name} ${id}`, x, y);
        }
    }
    console.log(`${runA}: ${fields} fields, ${values} values compared, ${differ} differ`);
}
```

A per-element flag (the `in` of a node set or an edge set) is not ranked, so this does not reach
it; compare those runs by exporting both as columns (below).

Two replays on one machine: apply the recipe twice, compare the runs by their `as`, and take both
applications back so their runs do not stay in the session for the next recording:

```js
const first = await session.recipes.apply(recipe, { run: true });
await first.running;
const again = await session.recipes.apply(recipe, { run: true, onRepeat: "add" });
await again.running;
const done = (app) => app.report.commands.filter((c) => c.op === "algo.run" && c.state === "done");
for (const c of done(first)) {
    const d = done(again).find((x) => x.as === c.as);
    if (d) compare(session, c.runId, d.runId);
}
first.remove();
again.remove();
```

The analysis you recorded against its replay: `record()` returns `sources`, the session run each
recorded `as` came from, so a replay's runs pair with the runs they reproduce, whatever renames the
recording made (`Hubs 2024` written as `hubs_2024`, an unnamed run as `pagerank_2`):

```js
const { recipe, sources } = session.recipes.record({ id: "org.example-lab.hub-genes" });
const replay = await session.recipes.apply(recipe, { run: true, onRepeat: "add" });
await replay.running;
for (const c of replay.report.commands.filter((c) => c.op === "algo.run" && c.state === "done")) {
    compare(session, sources.find((s) => s.as === c.as).runId, c.runId);
}
replay.remove();
```

The same works in a script or a nightly job with `createGraphSession()` from
`@graphty/graphty-element/session` in place of `element.session`: the session runs in Node with no
page, and imports, applies and runs a recipe there. A `layout.set` changes no result, so a
comparison of results never depends on whether anything was drawn. To compare with a colleague's
replay on another machine, both of you write the results as columns with `session.data.export`
(export-mapping.md, "The export call"), named `<as>.<field>` whatever namespace each replay used,
and compare the two files, allowing for the precision each run's caveats name.

## The replay report

```ts
interface RecipeReport {
    readonly recipe: {
        readonly id: string;
        readonly recipeVersion?: string;
        readonly name?: string;
        readonly description?: string; // the author's own account, shown first in a preview
        /** How the recipe expects a table to be read, as written; filled in an unbound plan too. */
        readonly table?: TableReading | readonly TableReading[];
        readonly parallelEdges?: boolean;
    };
    /** The release that recorded it (its `generator`, else the document's) and the one running it. */
    readonly release: { readonly recorded: string | null; readonly running: string };
    readonly namespace: string;
    readonly direction: { readonly recorded: boolean | null; readonly data: boolean | "mixed" };
    /**
     * Whether the recipe's filter, shown when its run started, replaced one the reader had set;
     * remove() puts it back. False before the run starts, when the plan carries a notice instead.
     */
    readonly replacedFilter: boolean;
    /**
     * Where the graph came from: each file it was imported from, with the SHA-256 of its bytes,
     * and, for a table read through this recipe, which reading of `table` was used (its index;
     * null when none passed); an entry with `sha256: null` for data from no file.
     */
    readonly data: readonly {
        readonly name: string | null;
        readonly sha256: string | null;
        readonly source: "import" | "apply" | "elements"; // a file, data.apply, elements added by hand
        readonly reading?: number | null;
        /** Elements added, removed or updated since this entry; all zero when unchanged. */
        readonly changedSince: { readonly added: number; readonly removed: number; readonly updated: number };
    }[];
    /** Every column the commands name, and what it bound to. */
    readonly columns: readonly {
        readonly name: string; // as the recipe names it
        readonly table: "node" | "edge";
        readonly boundTo: string | null; // the data's column; null when missing
        readonly renamedByCaller: boolean;
        readonly withValue: number | null; // elements of its table with a value there; null when unbound
        readonly of: number | null; // elements of its table
        readonly usedBy: readonly number[]; // command indexes
        readonly suggestions: readonly string[]; // nearest existing names, never used
    }[];
    readonly commands: readonly {
        readonly index: number;
        readonly op: string;
        readonly description?: string; // the author's own sentence
        readonly algorithm?: string; // algo.run: the current key, after a retired one is translated
        readonly name?: string; // the algorithm's or layout's plain name from the catalogue
        readonly layout?: { readonly id: string; readonly engine: string }; // layout.set
        readonly as?: string;
        readonly runId?: string; // the namespaced id
        /**
         * One sentence in plain words, written by graphty-element from this entry's own fields:
         * "Hides edges whose confidence is below 0.4 (900 of 10,000) and the 1,300 nodes left with
         * no edge"; "PageRank as 'influence', weighted by confidence, on 2,700 nodes; about 2 s";
         * "Force layout (ngraph) from seed 42, replacing the circular layout".
         */
        readonly summary: string;
        /** The scope, or a filter's rule, after renames and namespacing, and what it matches here. */
        readonly scope?: {
            readonly spec:
                | "graph"
                | "largest-component"
                | { readonly where: string; readonly on: "nodes" | "edges"; readonly dropIsolated?: boolean };
            /**
             * Null when the plan is unbound, when it reads a result of this recipe not yet
             * computed ("Binding to a new graph" rule 7), or when the data was fetched by the
             * document's href and the caller did not pass quoteFetchedData (container.md,
             * "Applying a file" rule 9).
             */
            readonly matched: number | null;
            readonly of: number | null;
            /** A leading edge filter applied while a table was read ("Table data" rule 4). */
            readonly appliedWhileReading?: { readonly rowsDropped: number };
        };
        /**
         * The graph this command will run on, after the earlier filters, their dropIsolated and
         * its own scope; null where the plan cannot know it ("Binding to a new graph" rules 7, 8).
         */
        readonly sees: { readonly nodes: number | null; readonly edges: number | null };
        readonly state: "planned" | "running" | "done" | "skipped" | "failed" | "cancelled";
        readonly problem?: Problem; // container.md, "The report"
        readonly params: Readonly<Record<string, unknown>>; // effective values, defaults filled in
        /** Before the run: exact, or sampled with the sample size. */
        readonly method?: { readonly exact: true } | { readonly exact: false; readonly sample: number };
        /** Before the run: the weight column and how the algorithm reads it. */
        readonly weight?: { readonly column: string; readonly readAs: "distance" | "strength" };
        /** The seed it runs with: the command's, else the published default; absent when one will be drawn at run time. */
        readonly seed?: number;
        readonly recordedPrecision?: "f32" | "f64"; // as the command records it
        readonly style: boolean; // whether it will paint its suggested colouring
        /** The channels that colouring writes; a notice when an enabled layer already writes one. */
        readonly paints: readonly string[];
        readonly fields: readonly string[]; // the result fields it publishes, as results.<runId>.<field>
        readonly estimateSeconds: number | null;
        /** True when the estimate is an upper bound on the whole graph ("Binding to a new graph" rule 8). */
        readonly estimateIsUpperBound?: boolean;
        /**
         * layout.set: the layout in force now, which this command replaces, and which remove()
         * puts back, with the positions, while the recipe's layout is still the one in force.
         */
        readonly replacesLayout?: { readonly id: string | null };
        readonly caveats?: Caveats; // once run: exact or sampled, the seed used, precision, direction, weight read
    }[];
    readonly totalEstimateSeconds: number | null; // null when any command has no estimate
    readonly capSeconds: number; // the per-command cap this application runs under
    readonly budgetSeconds: number; // the total budget this application runs under
    /**
     * Whether run() would start: every estimate known and the total within the budget. A command
     * planned past the cap does not stop the start; it is skipped, as the plan shows.
     */
    readonly wouldStart: boolean;
    /**
     * Why wouldStart is what it is: "unbound" with no graph to plan against, "unknown-estimate"
     * when a command has no estimate, "over-budget" when the total passes the budget.
     */
    readonly wouldStartReason: "ok" | "over-budget" | "unknown-estimate" | "unbound";
    readonly notices: readonly Problem[];
}
```

`Caveats` is graphty-element's published type (`graphty-element/src/session/runs/types.ts`): whether
the numbers are exact, the sample size and seed, precision, convergence, direction, and which edge
weight was read with what meaning.

## Recording

```ts
session.recipes.record(options: RecordOptions): {
    readonly recipe: RecipeMember | null; // null when rule 8 refused
    /**
     * Every selected run, and the layout, the recorder refused, with the reason; never a run the
     * caller's `runs` option left out.
     */
    readonly leftOut: readonly Problem[];
    readonly notices: readonly Problem[]; // conversions, renames
    /** The session run each recorded command came from, by its `as`: pairs a replay with the original. */
    readonly sources: readonly { readonly as: string; readonly runId: string }[];
};

interface RecordOptions {
    id: string;
    name?: string;
    description?: string;
    recipeVersion?: string;
    namespace?: string;
    runs?: readonly string[]; // run ids; default every completed run the session holds, with the filters they ran under
    layout?: boolean; // default true: record the last layout set
    explicitDefaults?: boolean; // default false: write every effective option value, defaults too
    dropUnrun?: boolean; // default false: see rule 8
}
```

`session.data.saveDocument({ recipe: options })` records the same way and puts the recipe in a
document beside the style. The recorder:

1. **Chooses runs.** It writes the `algo.run` commands of the runs selected, each at the position of
   its latest start (a re-run or a retune moves a run to when it last started), and the last layout
   set, at the position of when it was set, as a run is. A recipe's layout draws the whole graph
   wherever it sits ("Commands" rule 12), so the filter in force when it was set does not matter;
   a layout whose session scope was a kept set or the selection is left out and reported. Runs that failed, were cancelled, or resolved `partial` are left out. A run that read another
   run's result -- a `results.` path in its scope or its filter, or a `{ "result" }` option -- which
   was re-run or retuned after it is stale: its recorded numbers came from inputs the recipe no
   longer holds, so it is left out too. So is a run that reads a run the caller's `runs` left out,
   reported with the run it needed: a recipe never holds a command that reads a run it does not
   record.
2. **Leaves out every run a recipe may not hold** ("What a recipe records"), and reports each one
   with the reason, so the caller sees exactly what the recipe will not reproduce. It never
   rewrites such a run into something it was not: a run on the selection is not recorded as a run
   on the whole graph.
3. **Converts filters and scopes.** The filter a run ran under is the one its record kept from
   when it started, never the filter active at recording.
    - **Runs a recipe application made** are recorded from that application's own commands, never
      from the scope the applier dispatched them with (an inline rule set holding the recipe's
      kept graph, which the rules below would leave out): its `graph.filter` commands, then each
      run with its own `scope`, `params`, `seed`, `sample`, `exact` and `as`, the namespace
      removed (rule 4). The application's filters are written once, before the first of its runs,
      at the position rule 1 gives that run. A run the person made later on the visible graph
      while that application's filter was shown follows them, as the rules below allow for any
      filter over columns. graphty-element keeps, in the record of every run an application
      made, the application and the index of the command it came from (README, "Where this lives
      in the packages").
    - **Which runs.** A run on the visible graph whose record does not say which filter was in
      force (a record made before this was kept) is left out; a run made on the visible graph with
      no filter active counts as running under no filter. A run whose record shows a time window
      (`caveats.windowScope`, or the window kept in its record) is left out and reported, as a
      filter over particular nodes is: a recipe has no time window. A run started explicitly on
      the whole graph while a filter was shown counts as running under no filter: it is written
      before the first `graph.filter` when every run it reads came before that filter too;
      otherwise it is left out and reported as "ran on the whole graph after a filter; a recipe
      cannot widen its filter".
    - **Which filters convert.** A filter whose rule tree is an `all` of leaves, each a rule over
      columns, converts: an `expression` leaf as its expression; an `edges` leaf as its `where` on
      `on: "edges"`; a `range` leaf as `>=` and `<=` comparisons (the session's range matches only
      numbers where the recipe's comparison also reads numeric text, and the conversion says so
      when the column holds text); a `categories` leaf as `==` comparisons joined with `||`, each
      value compared both as its text and, when it reads as a number, as that number, because the
      session's categories compare a value's text; and a `connected` node ("Data
      model") as `dropIsolated: true` on the last filter inside it. A leaf reading a run's result (`results.<id>.<field>`)
      converts like a leaf over a column, rewritten to that run's recorded `as`; it depends on
      that run and is written after it, with the notice of "Commands" rule 5 about comparing a
      result with a literal. A filter holding `any` or `not`, a `degree`, `component` or
      `neighborhood` leaf, or any other leaf with no exact equivalent leaves out every run made
      under it, reported. So does a filter by particular nodes, a kept set, or one community.
    - **Order.** The leaves are written as `graph.filter` commands, one per leaf: the leaves
      inside a `connected` first, the last of them carrying `dropIsolated: true`, then the leaves
      outside it; within each group node leaves first, then edge leaves, each in the order the
      rule tree lists them. Filters are written where they change, in start
      order: a run whose filter adds leaves to the previous run's gets the extra `graph.filter`
      commands before it. A run whose filter is not the previous one plus more leaves (the person
      loosened the filter between two runs) cannot follow in the same recipe, because a recipe
      never widens its filter. When its filter is one leaf over a column without the rule that
      drops isolated nodes, and every run it reads comes before the first `graph.filter`, it is
      written before that filter with the leaf as its `where` scope instead, which computes the
      same thing, and the conversion is reported: a sensitivity analysis at 700 and then at 400
      records both runs. Otherwise it is left out and reported. Every conversion is reported.
    - **The run's scope.** A run made by hand is then written with its own scope: `"graph"` for
      the visible graph under a converted filter or for the whole graph under the rules above,
      and a `where` scope as it is. A session run on `"largest-component"` ran on the largest
      component of the whole graph, whatever filter was shown, because graphty-element resolves
      that scope over the whole graph; so it is written as a run on the whole graph under the
      rules above -- before the first `graph.filter`, or left out -- with `"largest-component"`
      as its scope and a notice that the session's largest component ignores the filter. A scope defined inline as a rule set
      (`{ define: { kind: "rule", where, reading } }`) whose rule tree is one leaf over columns is
      written as a `where` scope: an `expression` leaf with the `induced` reading on nodes, an
      `edges` leaf with the `clipped` reading on edges. Any other scope of a run made by hand
      leaves the run out (rule 2).
4. **Names every run.** A run keeps its explicit name, with a namespace removed (a run
   `team_overview__influence` from an applied recipe is written `influence`); a run without one is
   named from its algorithm key. Every name is then made a valid `as`: lower-cased, every run of
   characters other than the ASCII letters `a`-`z` and digits `0`-`9` replaced by one `_` (so
   `Centralite` spelled with an accented final e becomes `centralit`), a leading and a trailing `_`
   removed, the algorithm key used instead when nothing is left, `r_` put in front when it would
   not start with a letter, and cut to 60 characters (`Hubs 2024` becomes `hubs_2024`,
   `label-propagation` becomes `label_propagation`, `2024` becomes `r_2024`); each change is
   reported. When two runs end up with one name, the run that first started earliest keeps it
   and later ones get `_2`, `_3`, which the cut to 60 leaves room for. A name goes by a run's
   first start, not its latest, so a re-run or a retune never renumbers a run, here or in an
   export (export-mapping.md, "Results as columns" rule 1).
   Every `results.<id>` path, `{ "result" }` option and run-sourced layer's `runId` in the recorded
   commands and in the style saved beside them is rewritten to the new names.
5. **Writes what the run computed.** In `params`, every option whose value differs from the
   published default ("Commands" rule 3), or every effective value when the caller passed
   `explicitDefaults: true` (a methods supplement then states every parameter, at the cost of not
   replaying on a release that lacks one of them). `seed` from the run's caveats whenever the run was
   randomised or sampled. When the run approximated (`caveats.exact` false), `sample` from
   `caveats.sampleSize`; when an algorithm that can approximate ran exactly, `exact: true`, which
   a command without `sample` also means ("Commands" rule 7), written so a person reading the
   recipe sees it. `recordedCapSeconds` when the run was made under a cap above
   the default. For the layout, the seed the engine used, from the layout's report, whenever its
   descriptor has a seed option -- drawn and reported when the person set none -- so the recorded
   layout starts from the same positions on every replay; in a session that draws nothing, which
   places nothing, the seed the command's options gave, or none, with a notice. A non-default value of the algorithm's
   own seed option given in the run's parameters is written as `seed`, never in `params`
   ("Commands" rule 7). `directed` and `parallelEdges` from the graph; `table` from the table
   imports that built it, and with a filter an import through a recipe applied while reading,
   that filter as the recipe's leading `graph.filter` ("Table data" rule 8); and `generator`
   naming the running release. `recordedPrecision` from each run's `caveats.precision`, spelled as
   the caveats spell it (`f32` or `f64`). A layout engine
   with no seed option (d3's force) is recorded without a seed, with a notice that its picture
   differs on every replay.
6. **Writes `style`** from the run record's `RunStyle` (a run started from the interface paints by
   default, so this is usually `true`), except that it writes `false` when the style saved beside
   the recipe holds that run's layers. A run record that does not keep its `RunStyle` is a gap
   graphty-element closes before recipes ship (README, "Where this lives in the packages").
7. Takes `id`, and `name`, `recipeVersion` and `namespace` if wanted, from the caller.
8. **Recording under an applied recipe's id.** When `id` is the id of a recipe applied in this
   session, and some of that recipe's commands did not run here -- an unknown `op`, an unknown
   algorithm, a skipped command -- the recorder refuses by default: it returns no recipe, and
   `leftOut` lists each command that did not run with its reason, so a colleague's commands are
   never dropped by a save. `dropUnrun: true` records anyway. `saveDocument` then writes the
   opened recipe back as it was read (container.md, "Writing a file" rule 3).

## The overview recipe

graphty-element ships one recipe, `graphty.overview` (named "General"), as the default first look
at a new graph, and a consumer can configure a different one; a domain that cares about flows or
about groups ships its own. It is an ordinary recipe: nothing about it is special in the format, and
it runs, like any recipe, only when the reader asks.

## Security

1. Nothing in a recipe is executed as code. Option values are JSON values passed to registered
   algorithms, which check them against their descriptors; `where` predicates are interpreted by
   graphty-element under README's expression limits.
2. A recipe never names code to load, a package to install or a URL to fetch.
3. Compute is bounded by the consent rule, the per-command cap (which a sample cannot get round and
   an unestimated command cannot slip under), the total budget and the command limit ("Running").
4. The caller's `columns` map rewrites parsed expressions, never text, so a column name can never
   inject a predicate.

## Replaying

The rules for a file from another release or a hand-written file:

1. Commands are read one at a time; a failure is as small as possible.
2. A command of a known `op` that fails its schema is skipped with `E_BAD_COMMAND`, and its
   dependants with `E_DEPENDENCY_SKIPPED`.
3. **Command members are closed**, and so are the members of a command's `scope` and `style`. A
   command with a member outside its schema (`"sed": 7` for `"seed": 7`, or `dropIsolated` inside
   a scope) is skipped with `E_UNKNOWN_OPTION`, suggesting the nearest member, **and so is every
   later command**, each with `E_DEPENDENCY_SKIPPED` naming the misspelled one, so the report
   tells the misspelling from its victims. `seed`, `exact`, `sample` and `scope` decide the
   numbers a run produces; a misspelled one would otherwise run unseeded, sampled or on the whole
   graph with nothing but a warning. An unknown key inside `params` or `options` is different: it
   is `E_UNKNOWN_OPTION` on that command and skips only it and its dependants ("Commands" rule 3).
4. **Unknown commands stop the replay.** `op` is an open list: a later version adds commands to
   version 1 recipes. A command whose `op` the reader does not know is skipped with
   `E_UNKNOWN_COMMAND`, suggesting the nearest known `op`, **and so is every later command**, each
   with `E_DEPENDENCY_SKIPPED` naming it: an unknown command may change what every later command
   sees, as a filter does, so running the rest would report success on the wrong input. The
   commands before it run. An entry of `commands` that is not an object, or has no string `op`
   (`"opp": "graph.filter"`), stops the replay the same way, skipped with `E_BAD_COMMAND`: a
   reader cannot tell what it would have changed, so rule 2's "dependants only" does not apply.
   The one exception is a later command that carries `"narrows": false`,
   its author's statement that it changes nothing a later command sees (a command that only reads
   earlier results and names its own): a reader skips only it and the commands that read its `as`,
   and runs the rest. **Who names an op.** An op of two segments whose first is `graph`, `algo`,
   `layout`, `column`, `style` or `data` is graphty-element's, and only graphty-element defines
   one; anyone else's op has three or more segments and starts with a reverse-domain name
   (`org.example.motif-census`), so a third party's op never collides with one a later release
   defines. The schema accepts only those two forms, lower case: it refuses `algo.Run`, `algorun`
   and `acme.census`, which a reader skips as an unknown command, but a
   misspelling in the right form (`algo.rnu`) is valid and is caught only by a reader, as an
   unknown command. A later command that names its result does
   so in `as`, as `algo.run` does; a style layer of the same file that reads it stays switched off,
   naming the command, and never binds to a run of the reader's own (container.md, "Applying a
   file" rule 5).
5. Two commands with the same `as`: the second, and every command depending on it, is skipped with
   `E_DUPLICATE_ID`.

## Conformance

| Input                                                                                                                                                                                                                                                                                | Required result                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| an `algo.run` without `as`                                                                                                                                                                                                                                                           | skipped, `E_BAD_COMMAND` (it fails the schema); dependants skipped                                                                                                                                                           |
| `as: "hubs__score"`                                                                                                                                                                                                                                                                  | skipped: `__` is reserved                                                                                                                                                                                                    |
| a command with `op: "column.compute"` after two `algo.run`                                                                                                                                                                                                                           | the two runs run; it skipped, `E_UNKNOWN_COMMAND`; every later command `E_DEPENDENCY_SKIPPED` naming it                                                                                                                      |
| a command with `op: "algo.Run"`                                                                                                                                                                                                                                                      | refused by the schema; a reader skips it, `E_UNKNOWN_COMMAND`, suggesting `algo.run`, and every later command, `E_DEPENDENCY_SKIPPED`                                                                                        |
| ``{ "op": "graph.filter", "where": "data.combined_score >= `700`", "on": "edges", "dropIsolated": true }``, then `louvain` on `"largest-component"`                                                                                                                                  | Louvain runs on the largest component of the high-confidence core; the nodes left without an edge are gone from it; the session shows the core                                                                               |
| a `graph.filter` that keeps nothing                                                                                                                                                                                                                                                  | skipped, `E_SCOPE_EMPTY`; every later command skipped, `E_DEPENDENCY_SKIPPED`                                                                                                                                                |
| a recipe with a `graph.filter`, run while the reader has a filter of their own                                                                                                                                                                                                       | the reader's filter replaced when the run starts (`replacedFilter: true`); `remove()` puts it back                                                                                                                           |
| a recipe with a `graph.filter`, opened without `run` while the reader has a filter of their own                                                                                                                                                                                      | the reader's filter unchanged; `replacedFilter: false`; a notice that the recipe's filter will replace it when it runs                                                                                                       |
| a scope ``{ "where": "data.w > `1`", "on": "edges", "dropIsolated": true }``                                                                                                                                                                                                         | it skipped, `E_UNKNOWN_OPTION`: a scope does not drop nodes, a filter does; every later command `E_DEPENDENCY_SKIPPED`                                                                                                       |
| `{ "op": "algo.run", "algorithm": "betweenness", "as": "b", "sed": 7 }`                                                                                                                                                                                                              | it skipped, `E_UNKNOWN_OPTION`, suggesting `seed`; every later command `E_DEPENDENCY_SKIPPED` naming `b`                                                                                                                     |
| a scope `"selection"` or `{ "nodes": ["TP53"] }`                                                                                                                                                                                                                                     | skipped, `E_BAD_COMMAND`                                                                                                                                                                                                     |
| a `shortest-path` run with `params: { "source": "A" }`                                                                                                                                                                                                                               | skipped, `E_BAD_COMMAND`: the option names a node                                                                                                                                                                            |
| a command with no scope, replayed while a filter hides half the graph                                                                                                                                                                                                                | runs on every node                                                                                                                                                                                                           |
| `betweenness` with ``{ "where": "data.combined_score >= `700`", "on": "edges" }``                                                                                                                                                                                                    | runs on every node and the edges scoring 700 or more                                                                                                                                                                         |
| the same predicate with no `on`, on a graph whose nodes have no `combined_score`                                                                                                                                                                                                     | skipped, `E_UNKNOWN_ATTRIBUTE`: the node table has no such column                                                                                                                                                            |
| `"largest-component"` on a graph with two components of 500 nodes and 800 edges each                                                                                                                                                                                                 | the component holding the node whose id sorts first, whatever the file order                                                                                                                                                 |
| a `where` scope reading `data.padj` on data whose column is `FDR`                                                                                                                                                                                                                    | skipped, `E_UNKNOWN_ATTRIBUTE` naming `padj`; no suggestion, because the names share nothing; nothing is renamed                                                                                                             |
| the same, applied with `columns: { "padj": "FDR" }`                                                                                                                                                                                                                                  | runs over `FDR`; the report records the rename                                                                                                                                                                               |
| a `where` scope reading `data.Score` on data whose column is `score`                                                                                                                                                                                                                 | skipped, `E_UNKNOWN_ATTRIBUTE`: names are compared exactly                                                                                                                                                                   |
| a recipe reading `data.type` on nodes and on edges, applied with `nodeColumns: { "type": "category" }, edgeColumns: { "type": "predicate" }`                                                                                                                                         | the node reads bind to `category`, the edge reads to `predicate`; the report records both renames with their tables                                                                                                          |
| `table: { "edgeSource": "protein1", "edgeTarget": "protein2" }`, opened with no graph, then a CSV with those headers imported through the application's `import()` with no options                                                                                                   | the import reads its ends from `protein1` and `protein2`; the recipe binds and plans; `report` is the bound plan; nothing runs                                                                                               |
| the same, with `edgeSource: "node1"` passed in `config`                                                                                                                                                                                                                              | `W_TABLE_COLUMNS_DIFFER` naming both before anything runs; the ends read from `node1`                                                                                                                                        |
| the same recipe replayed on a GraphML file                                                                                                                                                                                                                                           | `table` not used and not reported                                                                                                                                                                                            |
| `parallelEdges: false`, replayed on an undirected import holding 500 pairs twice                                                                                                                                                                                                     | `W_PARALLEL_EDGES` with the count, suggesting `repeatedEdges`, before anything runs                                                                                                                                          |
| `"where": "data.rel == 'SUPPLIES'"` on edges whose `rel` values are lower case                                                                                                                                                                                                       | skipped, `E_SCOPE_EMPTY`; the plan lists the most frequent `rel` values                                                                                                                                                      |
| ``"where": "data.padj < `0.05`"`` over a column typed as text, holding `"0.01"`, `"0.2"` and `"NA"`                                                                                                                                                                                  | matches the `"0.01"` elements; `W_COLUMN_TYPE` counts the `NA`                                                                                                                                                               |
| an exact `betweenness` planned at 45 s under the default cap, with a dependant                                                                                                                                                                                                       | planned with `E_CAP_EXCEEDED` and the cap; the dependant `E_DEPENDENCY_SKIPPED`; `wouldStart` true                                                                                                                           |
| the same command with `recordedCapSeconds: 120`                                                                                                                                                                                                                                      | the `E_CAP_EXCEEDED` problem quotes 120 s; the cap stays 30 s                                                                                                                                                                |
| a planned `louvain` command                                                                                                                                                                                                                                                          | a notice that its result depends on node order                                                                                                                                                                               |
| `params: { "weight": "weight" }`, replayed on a GML file and on a Pajek file with weights                                                                                                                                                                                            | runs on both: each importer names the weight `weight`                                                                                                                                                                        |
| `params: { "weight": "combined_score" }` on a graph with no such edge column                                                                                                                                                                                                         | skipped, `E_UNKNOWN_ATTRIBUTE`; dependants skipped; other commands run                                                                                                                                                       |
| `params: { "weight": "constructor" }` on a graph with no such column                                                                                                                                                                                                                 | skipped, `E_UNKNOWN_ATTRIBUTE`                                                                                                                                                                                               |
| ``"where": "data.padj < `0.05`"`` where `padj` holds numbers and `NA`                                                                                                                                                                                                                | runs on the nodes whose number is below 0.05; `W_COLUMN_TYPE` naming `padj` and the count of `NA`                                                                                                                            |
| `label-propagation` with no `seed`, replayed twice                                                                                                                                                                                                                                   | both replays run with `randomSeed` 42, its published default, and find the same communities                                                                                                                                  |
| `louvain` with `seed: 7`                                                                                                                                                                                                                                                             | runs; a notice says Louvain is deterministic and ignores the seed                                                                                                                                                            |
| a recipe with `"directed": false` replayed on a CSV import (directed)                                                                                                                                                                                                                | `W_DIRECTION_DIFFERS` before anything runs; the commands run                                                                                                                                                                 |
| a `where` scope reading `results.modules.group`, where `modules` is a later command                                                                                                                                                                                                  | skipped, `E_BAD_COMMAND`                                                                                                                                                                                                     |
| a command reading `results.modules.group` after the `modules` command was skipped                                                                                                                                                                                                    | skipped, `E_DEPENDENCY_SKIPPED`                                                                                                                                                                                              |
| a `where` scope that matches no node                                                                                                                                                                                                                                                 | skipped, `E_SCOPE_EMPTY`; dependants skipped                                                                                                                                                                                 |
| algorithm key `scc`                                                                                                                                                                                                                                                                  | runs `components` with `{ "strength": "strong" }`; the report names the current key                                                                                                                                          |
| algorithm key `org.example:motif-census`, not registered                                                                                                                                                                                                                             | skipped, `E_UNKNOWN_ALGORITHM`; dependants skipped                                                                                                                                                                           |
| opened with no instruction to run                                                                                                                                                                                                                                                    | nothing runs; every command planned, with its estimate, `style`, `fields` and the total                                                                                                                                      |
| a recipe planned at twice the total budget, `run()`                                                                                                                                                                                                                                  | not started, `E_CAP_EXCEEDED` with the estimate                                                                                                                                                                              |
| a `sample` whose sampled estimate is past the cap                                                                                                                                                                                                                                    | skipped, `E_CAP_EXCEEDED`                                                                                                                                                                                                    |
| a `layout.set` whose engine publishes no estimate                                                                                                                                                                                                                                    | skipped, `E_CAP_EXCEEDED`                                                                                                                                                                                                    |
| the same `id` applied twice to the same data                                                                                                                                                                                                                                         | the second refused, `E_REPEAT_APPLICATION`; with `onRepeat: "add"`, ids `ns__x` and `ns2__x`                                                                                                                                 |
| the same `id` applied after a `data.import` that merged a file                                                                                                                                                                                                                       | refused, `E_REPEAT_APPLICATION`: merging is the same data                                                                                                                                                                    |
| the same `id` applied after new data replaced the graph                                                                                                                                                                                                                              | runs; not a repeat                                                                                                                                                                                                           |
| recipe versions `1.9.0` and `1.10.0`                                                                                                                                                                                                                                                 | `1.10.0` is newer                                                                                                                                                                                                            |
| a session with a run on the current selection, recorded                                                                                                                                                                                                                              | that run left out and reported; the other runs recorded                                                                                                                                                                      |
| a run on the visible graph under the filter ``data.combined_score >= `700` `` on edges, recorded                                                                                                                                                                                     | recorded as a `graph.filter` with that rule `on: "edges"`, then the run with scope `"graph"`; the conversion reported                                                                                                        |
| PageRank as `hubs`, degree scoped to ``results.hubs.value > `0.01` ``, then `hubs` re-run, recorded                                                                                                                                                                                  | `hubs` recorded; the degree run left out as stale and reported                                                                                                                                                               |
| a sampled betweenness run (sample size 2000, seed 11), recorded                                                                                                                                                                                                                      | recorded with `"sample": 2000, "seed": 11`                                                                                                                                                                                   |
| a run that resolved `partial` under a time box, recorded                                                                                                                                                                                                                             | left out and reported                                                                                                                                                                                                        |
| runs `a__influence` and `b__influence` from two applied recipes, recorded                                                                                                                                                                                                            | written `influence` (the earlier start) and `influence_2`                                                                                                                                                                    |
| a PageRank run that painted, saved with its style by default                                                                                                                                                                                                                         | the recipe says `"style": false`; reopening shows the layer once                                                                                                                                                             |
| a recipe whose `id` is `graphty.overview`, `Graphty.overview`, `https://graphty.app/recipes/overview`, `https:graphty.app/recipes/overview` or `https://graphty.app./recipes/overview`, in a document                                                                                | skipped, `E_BAD_DOCUMENT`: the id is reserved                                                                                                                                                                                |
| ``{ "where": "data.combined_score >= `0.7`", "on": "edges" }`` on scores from 0 to 1000                                                                                                                                                                                              | planned; the scope matches every edge, and a notice says so                                                                                                                                                                  |
| a scope matching no edge, opened with `apply: false`                                                                                                                                                                                                                                 | `E_SCOPE_EMPTY` in the plan                                                                                                                                                                                                  |
| `betweenness` with `params: { "weight": "weight" }`, planned                                                                                                                                                                                                                         | the plan says the weight is read as a distance, with a notice                                                                                                                                                                |
| a planned command                                                                                                                                                                                                                                                                    | its entry carries `algorithm`, `scope` with `matched` and `of`, `method` and `description`                                                                                                                                   |
| `louvain` as `modules`, then an option of type `partition` given `{ "result": "modules.group" }`                                                                                                                                                                                     | runs, reading the namespaced run; skipped with `E_DEPENDENCY_SKIPPED` if `modules` was                                                                                                                                       |
| a `partition` given as a list of node ids                                                                                                                                                                                                                                            | skipped, `E_BAD_COMMAND`                                                                                                                                                                                                     |
| a `where` scope reading `data.id` on nodes that have no column `id`                                                                                                                                                                                                                  | skipped, `E_BAD_COMMAND`: it would read node ids                                                                                                                                                                             |
| a `layout.set` replayed while the reader's layout scope is a kept set                                                                                                                                                                                                                | the layout draws the whole graph                                                                                                                                                                                             |
| a directed import where 80 percent of the edges have a reverse twin                                                                                                                                                                                                                  | `W_DIRECTION_DIFFERS` suggesting `directed: false`                                                                                                                                                                           |
| a run on the largest component, made by hand while the edge filter ``data.combined_score >= `700` `` hid the nodes left without an edge, recorded                                                                                                                                    | written on `"largest-component"` before any `graph.filter`, with a notice that the session's largest component ignores the filter                                                                                            |
| a run on the visible graph under `>= 700`, the filter then changed to `>= 400`, recorded                                                                                                                                                                                             | recorded with the `>= 700` the run started under                                                                                                                                                                             |
| a run under the edge filter `>= 700`, then the filter loosened to `>= 400` and a second run, recorded                                                                                                                                                                                | the second run written before the `graph.filter` with the scope ``{ "where": "data.combined_score >= `400`", "on": "edges" }``, the first after it; the conversion reported                                                  |
| a run whose `partition` option reads `{ "result": "modules.group" }`, then `modules` re-run, recorded                                                                                                                                                                                | the dependant left out as stale and reported                                                                                                                                                                                 |
| `record({ runs: ["significant_degree"] })` where that run's scope reads `results.hubs.value`                                                                                                                                                                                         | left out and reported, naming `hubs`                                                                                                                                                                                         |
| two runs both named with the same 70-character label, recorded                                                                                                                                                                                                                       | written as the first 60 characters and that name with `_2`                                                                                                                                                                   |
| runs named `2024` and `!!!` (a PageRank run), recorded                                                                                                                                                                                                                               | written `r_2024` and `pagerank`                                                                                                                                                                                              |
| a force layout set with no seed, recorded                                                                                                                                                                                                                                            | its `options` carry the seed the engine drew; the report says it was drawn                                                                                                                                                   |
| a run named `Hubs 2024`, recorded                                                                                                                                                                                                                                                    | written `hubs_2024`; the rename reported                                                                                                                                                                                     |
| a PageRank run started from the interface (it painted), recorded without a style                                                                                                                                                                                                     | the recipe says `"style": true` or omits it                                                                                                                                                                                  |
| `recipe.record()` output, applied on a later major release that changed a default it relied on                                                                                                                                                                                       | `W_RELEASE_DIFFERS`, and the option whose default changed named                                                                                                                                                              |
| a recipe planned at 340 s under the default budget, previewed                                                                                                                                                                                                                        | `wouldStart: false`, `budgetSeconds: 300`                                                                                                                                                                                    |
| the recipe of README "Replaying a recipe on your own table" (`delimiter: " "`, `repeatedEdges: "first"`, `filterWhileReading: true`, `directed: false`), then STRING's yeast `4932.protein.links.v12.0.txt.gz` imported through `import({ type: "csv", config: { file } })` as it is | decompressed as it is read; read space-separated and undirected, each pair one edge carrying its first row's columns; the filter applied while reading, `appliedWhileReading` giving the rows dropped; no `W_PARALLEL_EDGES` |
| the same file imported through `import()` with `delimiter: ","` in `config`                                                                                                                                                                                                          | `W_TABLE_COLUMNS_DIFFER` naming the delimiter; the header read as one column, and the import fails, `E_PARSE_FAILED`, naming `delimiter: " "` as the one that finds `protein1`                                               |
| the same recipe, then a Gephi `edges.csv` headed `Source,Target,Weight` imported through `import()`                                                                                                                                                                                  | read by the importer's own rules (`Source`, `Target`, comma); `W_TABLE_COLUMNS_DIFFER` naming the columns used                                                                                                               |
| the same recipe, then a neo4j-admin import CSV imported through `import()` with `variant: "neo4j"`                                                                                                                                                                                   | its ends read from `:START_ID` and `:END_ID`, the recipe's endpoint columns and delimiter not given to it; read undirected, the repeated rows merged                                                                         |
| a recipe with `table`, opened, then a CSV imported with plain `session.data.import`                                                                                                                                                                                                  | the import takes nothing from the recipe; the recipe binds and plans against what it built                                                                                                                                   |
| a recipe with no `parallelEdges`, replayed on an undirected import holding every pair twice                                                                                                                                                                                          | `W_PARALLEL_EDGES` with the count, suggesting `repeatedEdges`, before anything runs                                                                                                                                          |
| a recipe held with no graph loaded, then a node table imported through `import()`, then an edge table through `import(source, { mode: "merge" })`, then `run()`                                                                                                                      | planned after each import, the edge columns bound after the second; the runs start only at `run()`                                                                                                                           |
| a command whose column is present on 40 of 280 nodes                                                                                                                                                                                                                                 | `columns` gives `withValue: 40, of: 280`; `W_FEW_VALUES`                                                                                                                                                                     |
| `params: { "maxIterations": 10000 }` on `girvan-newman` while its descriptor is marked `unbounded`                                                                                                                                                                                   | skipped, `E_CAP_EXCEEDED`, before anything runs                                                                                                                                                                              |
| a command still running when it reaches the cap                                                                                                                                                                                                                                      | stopped; its partial result discarded; `E_CAP_EXCEEDED`; dependants skipped                                                                                                                                                  |
| a command with `recordedPrecision: "f32"`, replayed on the CPU                                                                                                                                                                                                                       | `W_PRECISION_DIFFERS` naming both                                                                                                                                                                                            |
| `seed: 3000000000`                                                                                                                                                                                                                                                                   | refused by the schema; a reader skips it, `E_OPTION_RANGE`                                                                                                                                                                   |
| a `layout.set` with `engine: "d3"` and `options: { "alphaDecay": 0.02 }`                                                                                                                                                                                                             | checked against the d3 engine's options, not the default engine's; runs                                                                                                                                                      |
| a recipe ending in a `layout.set`, run, then `remove()` while its layout is still in force                                                                                                                                                                                           | the layout and the positions in force before it are restored                                                                                                                                                                 |
| two applications A then B of recipes with filters, the reader's filter F0 before them; `A.remove()`, then `B.remove()`                                                                                                                                                               | after `A.remove()` B's filter still shown; after `B.remove()` F0 shown                                                                                                                                                       |
| a node filter `data.padj < 0.05`, an edge filter `data.weight >= 0.4` and the rule dropping isolated nodes, one session filter, recorded                                                                                                                                             | written as the node `graph.filter`, then the edge `graph.filter` with `dropIsolated: true`                                                                                                                                   |
| PageRank as `hubs`, the session filtered to `results.hubs.value > 0.001`, then Louvain, recorded                                                                                                                                                                                     | `hubs`, then `graph.filter` on `results.hubs.value > 0.001` with a notice about the literal, then Louvain                                                                                                                    |
| a run under a session filter `{ kind: "categories", attribute: "data.code", values: ["3"] }` on a numeric column, recorded                                                                                                                                                           | written ``data.code == '3' \|\| data.code == `3` ``; matches the same nodes on replay                                                                                                                                        |
| a run under a session filter `any(expression, edges)`, recorded                                                                                                                                                                                                                      | left out and reported: `any` has no recipe equivalent                                                                                                                                                                        |
| a run on the visible graph under a time window and no filter, recorded                                                                                                                                                                                                               | left out and reported                                                                                                                                                                                                        |
| a run on the visible graph with no filter active, recorded                                                                                                                                                                                                                           | recorded with scope `"graph"`, before any `graph.filter`                                                                                                                                                                     |
| an edge filter, Louvain on the visible graph, then betweenness started on the whole graph with the filter still shown, recorded                                                                                                                                                      | betweenness written before the `graph.filter`; if it read Louvain's result, left out and reported                                                                                                                            |
| a force layout set with seed 42 on the whole graph, then an edge filter and a Louvain run, recorded                                                                                                                                                                                  | the `layout.set` written before the `graph.filter`                                                                                                                                                                           |
| a layout set while the session's layout scope was a kept set, recorded                                                                                                                                                                                                               | the layout left out and reported                                                                                                                                                                                             |
| a run scoped to ``{ define: { kind: "rule", where: { kind: "edges", where: "data.w > `1`" }, reading: "clipped" } }``, recorded                                                                                                                                                      | written with scope ``{ "where": "data.w > `1`", "on": "edges" }``                                                                                                                                                            |
| a run named `Centralite` with an accented final e, recorded                                                                                                                                                                                                                          | written `centralit`; the rename reported                                                                                                                                                                                     |
| a file's recipe [`algo.run`, `column.compute`, `algo.run`] run on a reader that does not know `column.compute`, then `record({ id: <the same id> })`                                                                                                                                 | no recipe; `leftOut` lists the two commands that did not run; with `dropUnrun: true`, recorded                                                                                                                               |
| a randomised command with no `seed`, whose algorithm's seed option has no published default, previewed                                                                                                                                                                               | no `seed` in its entry; a notice that one will be drawn when it runs                                                                                                                                                         |
| a CSV of undirected rows `A,B,300` and `B,A,800` in its `weight` column, a recipe with `repeatedEdges: "min"` and a leading filter ``data.weight >= `700` `` on edges, no `filterWhileReading`, imported through `import()`                                                          | read whole and merged, weight 300; the filter then drops the edge; `W_FILTER_AFTER_IMPORT` says rows are merged; the same graph as a plain import filtered in the session                                                    |
| the same with `filterWhileReading: true`                                                                                                                                                                                                                                             | the 300 row dropped while reading; the edge kept with weight 800; `appliedWhileReading` counts one row                                                                                                                       |
| a leading filter ``data.weight >= `0.4` `` and a CSV headed `source,target,Weight`, imported through `import()`                                                                                                                                                                      | applied while reading: `Weight` is the column `weight` the import will produce                                                                                                                                               |
| a leading filter ``data.volume >= `1000` `` and a CSV with no `volume` column, imported through `import()`                                                                                                                                                                           | every row read; `W_FILTER_AFTER_IMPORT` naming `volume`; the filter then skipped, `E_UNKNOWN_ATTRIBUTE`; no edge lost                                                                                                        |
| the same, imported with `edgeColumns: { "volume": "qty" }` on a CSV with a `qty` column                                                                                                                                                                                              | the filter applied while reading on `qty`                                                                                                                                                                                    |
| a table read through a recipe whose kept rows number 140,000 and whose merged pairs number 70,000                                                                                                                                                                                    | loads: the ceilings count the 70,000 merged edges                                                                                                                                                                            |
| the README STRING recipe on human `9606.protein.links.v12.0.txt.gz`, in a browser                                                                                                                                                                                                    | refused, `E_TOO_LARGE`, naming the edge ceiling and the Node route                                                                                                                                                           |
| the same in Node, `createGraphSession({ limits: { nodes: 1000000, edges: 5000000 } })`                                                                                                                                                                                               | loads, plans and runs                                                                                                                                                                                                        |
| a recipe holding only `table` and a leading edge filter, a file imported through it, then two runs made by hand, then `saveDocument({ recipe: { id } })`                                                                                                                             | the recipe written with that `table`, the filter as its first command, then the two runs                                                                                                                                     |
| `table` a list of two readings, the first `supplier_id,buyer_id`, the second `from_company,to_company`, and a CSV headed `from_company,to_company,volume`                                                                                                                            | read with the second reading; `data[0].reading` is 1                                                                                                                                                                         |
| `table` with `delimiter: " "`, `protein1` and `protein2`, and a CSV headed `protein1,protein2,combined_score`                                                                                                                                                                        | read with `protein1`, `protein2` and the comma; `W_TABLE_COLUMNS_DIFFER` naming the delimiter                                                                                                                                |
| `table: { "delimiter": " " }` and a space-separated file headed `source target weight`                                                                                                                                                                                               | read with the space                                                                                                                                                                                                          |
| a recipe with `directed: false` and `repeatedEdges: "sum"`, and a neo4j-admin CSV imported through `import()`                                                                                                                                                                        | undirected, the repeated relationships summed                                                                                                                                                                                |
| label propagation with `seed: 3` and `params: { "randomSeed": 9 }`                                                                                                                                                                                                                   | skipped, `E_BAD_COMMAND`, naming `seed`                                                                                                                                                                                      |
| a session run of label propagation with `randomSeed` 7, recorded                                                                                                                                                                                                                     | written with `seed: 7` and no `randomSeed` in `params`                                                                                                                                                                       |
| degree as `deg`, then a `graph.filter` on ``results.deg.value >= `5` ``, then betweenness, previewed                                                                                                                                                                                 | the filter `matched: null` with a notice that it is evaluated when `deg` completes; betweenness estimated on the whole graph, `estimateIsUpperBound: true`                                                                   |
| a recipe of 150 commands, previewed                                                                                                                                                                                                                                                  | `commands` holds all 150 entries                                                                                                                                                                                             |
| a recipe of three runs; the reader edits a style layer while the second runs                                                                                                                                                                                                         | the edit applies at once; the runs after it record as their own steps; `remove()` takes back all three runs                                                                                                                  |
| a file of 64 recipes each planned at 290 s, opened with no graph, data loaded, then `run()` on each                                                                                                                                                                                  | the first `run()` starts; the second fails, `E_CAP_EXCEEDED` with the file's total                                                                                                                                           |
| a run named `Hubs 2024`, recorded                                                                                                                                                                                                                                                    | `sources` holds `{ "as": "hubs_2024", "runId": <the session run> }`                                                                                                                                                          |
| a node table imported with `idColumn: "symbol"`, then an edge list headed `bait,prey` merged with `edgeSource: "bait"`, `edgeTarget: "prey"`, recorded                                                                                                                               | `table: { "idColumn": "symbol", "edgeSource": "bait", "edgeTarget": "prey" }`                                                                                                                                                |
| commands [`algo.run` as `a`, `{ "op": "org.example.compare", "as": "c", "narrows": false }`, `algo.run` as `b` reading `results.a.value`, `algo.run` reading `results.c.value`] on a reader that does not know the op                                                                | `a` and `b` run; the unknown command skipped, `E_UNKNOWN_COMMAND`; the last `E_DEPENDENCY_SKIPPED`                                                                                                                           |
| an import through a recipe, twice, with two files of different bytes                                                                                                                                                                                                                 | each replay report's `data` gives its file's SHA-256, and they differ                                                                                                                                                        |
| a download whose rows name 60,000 proteins, whose core at 700 holds 4,000 proteins in 30,000 pairs, read in a browser through the README STRING recipe                                                                                                                               | loads: only the 4,000 proteins of kept rows become nodes, so the node ceiling is not reached                                                                                                                                 |
| the same recipe without `dropIsolated`, on a download naming 60,000 proteins                                                                                                                                                                                                         | refused, `E_TOO_LARGE`, naming the node ceiling: every row's two ends are nodes                                                                                                                                              |
| `betweenness` with no `sample` and no `exact`, whose exact estimate is 45 s under the default cap                                                                                                                                                                                    | planned with `E_CAP_EXCEEDED`, quoting the `capSeconds` that would admit it; `method` exact; never sampled                                                                                                                   |
| `k-core` with `exact: true`                                                                                                                                                                                                                                                          | accepted; no notice                                                                                                                                                                                                          |
| `min-cut` with `params: { "useGlobalMinCut": true, "useKarger": true }` and `seed: 5`, while Karger's path takes no seed option                                                                                                                                                      | planned with a notice that its results differ on every replay                                                                                                                                                                |
| a recipe [edge `graph.filter` with `dropIsolated`, `louvain` as `groups` on `"largest-component"`], opened and run, then a PageRank run by hand, saved with `recipe: { id: <the same id>, recipeVersion: "1.1.0" }`                                                                  | the saved recipe holds the filter, then `groups` on `"largest-component"`, then the PageRank run                                                                                                                             |
| a recipe with a filter and two runs, applied and run, then saved under a new `id`                                                                                                                                                                                                    | the same filter and runs written back, each `as` without its namespace                                                                                                                                                       |
| a session of 12 runs, recorded with `runs` naming 3 of them, all recordable                                                                                                                                                                                                          | the 3 recorded; `leftOut` empty                                                                                                                                                                                              |
| `table` [`supplier_id,buyer_id`, `{ "edgeSource": "from_company", "edgeTarget": "to_company", "columns": { "volume": "qty" } }`], a filter ``data.volume >= `1000` `` and PageRank weighted by `volume`, then a CSV headed `from_company,to_company,qty`                             | read with the second reading, `qty` read as the column `volume`; the filter and the weight bind; the rename reported                                                                                                         |
| a CSV of one row per invoice, `supplier_id,buyer_id,amount`, read with `repeatedEdges: "sum"` and `combineColumn: "amount"`                                                                                                                                                          | one edge per pair, its `amount` the total of the pair's rows                                                                                                                                                                 |
| the same with no `combineColumn`, on a table with no weight column                                                                                                                                                                                                                   | one edge per pair keeping its first row's `amount`; `W_TABLE_COLUMNS_DIFFER` naming the missing weight                                                                                                                       |
| a recipe with three readings, applied, a table imported through its first, a run added, saved under the same `id`                                                                                                                                                                    | all three readings written back in their order; no notice about `table`                                                                                                                                                      |
| `table` [ERP reading, spreadsheet reading, `{ "variant": "neo4j" }`], and a neo4j-admin relationships file headed `:START_ID,:END_ID,:TYPE,amount:float` imported through `import()` with no options                                                                                 | read with the third reading as the `neo4j` variant; `data[0].reading` is 2                                                                                                                                                   |
| a reading naming `supplier_id,buyer_id` and a file starting with a byte-order mark, headed `"supplier_id","buyer_id"`                                                                                                                                                                | the reading passes                                                                                                                                                                                                           |
| the same reading and a file headed `Supplier_ID,Buyer_ID`                                                                                                                                                                                                                            | the reading fails; `W_TABLE_COLUMNS_DIFFER` names the near miss by case                                                                                                                                                      |
| README "Your first recipe", previewed on 4,000 nodes and 10,000 edges, where the filter keeps 9,100 edges and leaves 1,300 nodes with none                                                                                                                                           | the filter's `matched` 9,100 of 10,000; its `sees` and every later command's `sees` give 2,700 nodes                                                                                                                         |
| a `commands` entry `{ "opp": "graph.filter", ... }` before a `louvain` run                                                                                                                                                                                                           | it skipped, `E_BAD_COMMAND`; every later command `E_DEPENDENCY_SKIPPED` naming it                                                                                                                                            |
| a `commands` entry that is a string or a number                                                                                                                                                                                                                                      | the same: skipped, `E_BAD_COMMAND`, and every later command                                                                                                                                                                  |
| a command with `op: "acme.census"`                                                                                                                                                                                                                                                   | refused by the schema; a reader skips it, `E_UNKNOWN_COMMAND`, and every later command                                                                                                                                       |
| an edge `graph.filter`, then `layout.set` `circular`                                                                                                                                                                                                                                 | dispatched with the scope `"graph"`: the whole graph drawn, the hidden elements included; nothing refused                                                                                                                    |
| an edge filter ``data.w >= `0.4` `` with `dropIsolated`, then a node filter ``data.padj < `0.05` ``                                                                                                                                                                                  | shown as `all(connected(edges), expression)`; a node that passes `padj` but lost every edge to the node filter stays                                                                                                         |
| a plugin algorithm whose descriptor declares no `scopeInput`, run after a `graph.filter`                                                                                                                                                                                             | skipped, `E_BAD_COMMAND`                                                                                                                                                                                                     |
| README "Your first recipe" replayed in `createGraphSession()`                                                                                                                                                                                                                        | the `layout.set` `done` with a notice that nothing was placed; no `E_CAP_EXCEEDED`                                                                                                                                           |
| two unnamed PageRank runs A then B, exported; A retuned, then exported and recorded again                                                                                                                                                                                            | A is `pagerank` and B `pagerank_2` every time                                                                                                                                                                                |
| a filter keeping a 5,000-leaf star, then `link-prediction`                                                                                                                                                                                                                           | skipped, `E_CAP_EXCEEDED`, in the plan                                                                                                                                                                                       |
| two runs weighted by `strength` and a `layout.set`, on a graph with no `strength` column                                                                                                                                                                                             | both runs skipped, `E_UNKNOWN_ATTRIBUTE`; the layout runs                                                                                                                                                                    |
| a graph imported from a file, then 40 nodes deleted by hand, then a recipe applied                                                                                                                                                                                                   | `data[0]` gives the file's SHA-256 and `changedSince.removed` 40                                                                                                                                                             |
| a graph built with `data.apply`, then a recipe applied                                                                                                                                                                                                                               | `data` holds one entry, `source: "apply"`, `sha256: null`                                                                                                                                                                    |

## Worked example

A lab ranks hub genes the same way on every new co-expression network: PageRank over the
co-expression weights, then groups, then the degree of the significant genes. It names two columns:
the edge weight, `weight`, as PageRank's weight, and `padj` (an adjusted p-value) on nodes.

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
                {
                    "op": "algo.run",
                    "algorithm": "louvain",
                    "as": "modules"
                },
                {
                    "op": "algo.run",
                    "algorithm": "degree",
                    "as": "significant_degree",
                    "scope": { "where": "data.padj < `0.05`" }
                },
                { "op": "layout.set", "id": "force", "options": { "seed": 42 } }
            ]
        }
    ]
}
```

`modules` runs unweighted, because it has no `weight` param ("Commands" rule 6); give it
`"params": { "weight": "weight" }` to use the weights.

Replayed on a colleague's GraphML file with a `padj` node key and a `weight` edge key, all four
commands run. Replayed on a CSV edge list headed `source,target,weight` with no node table, the
third command is skipped with `E_UNKNOWN_ATTRIBUTE` naming `padj`; the other three run, and the
report says so before anything starts. (A header with other endpoint names, `gene_a,gene_b`, needs
a `table` naming them, or `edgeSource` and `edgeTarget` from the caller.) Imported with a plain
`data.import`, which reads a CSV as directed, the report also carries `W_DIRECTION_DIFFERS`,
because the recipe says `directed: false`; imported through the application's `import()`, or with
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
