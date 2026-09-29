# Recipe

`kind: "graphty-recipe"`, version 1, a member of a graphty document ([container.md](container.md)).
Schema: [recipe.schema.json](recipe.schema.json). The shortest working example is README "Your
first recipe".

## Purpose

A recipe is a replayed journal of analysis commands. It records the commands that make up a
repeatable analysis -- which algorithms ran, with which options, over which part of the graph, and
the layout -- and runs them again on another graph. In the owner's words, it "supports people on the
same team or in the same industry sharing analysis techniques, or the same person running the same
analysis on new data."

A recipe works on data of the same shape, not the same data. Its commands name columns and
attributes, never particular nodes or edges, so it replays on any graph whose import has the columns
it names, whatever the file type: a recipe recorded on a GraphML import replays on a CSV, because
every importer produces the same named columns (README, "What every importer produces"). When a
column it needs is missing, that is reported, never guessed.

## What a recipe records

A recipe holds exactly two commands in version 1. Everything else a session does is left out, each
for a stated reason, because a command that names a particular node, a place on the screen or a
file means nothing on the next dataset.

| Session action                                                                | In a recipe | Why                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run an algorithm (`algo.run`)                                                 | yes         | The core of an analysis. It names the algorithm by catalogue key, its options by value and its scope by rule, so it means the same thing on any graph                                        |
| Set the layout (`layout.set`)                                                 | yes         | A layout is an algorithm over the whole graph whose options name no element. Recording it with its seed makes the replayed picture similar, which is part of reading the result              |
| Run an algorithm on the visible graph while a filter hides part of it         | converted   | When the filter is one predicate over the columns of one table, the run is recorded with that predicate as its `where` scope and the report says so; any other filter leaves the run out     |
| Run an algorithm with an option that names a node or a set of nodes           | no          | A shortest path from one chosen account, a search from one start node: the chosen node exists only in the data it was chosen from. Version 1 has no way to choose a node by a rule           |
| Run an algorithm on the selection, on a listed set of nodes, or on a kept set | no          | Each names particular elements. A run on the whole graph, the largest component, or the elements a predicate over columns matches is recorded instead                                        |
| A run that was cancelled, failed, or stopped partway (a time box, `partial`)  | no          | Its numbers are not what the command computes when it runs to the end                                                                                                                        |
| Load or import data                                                           | no          | The data is what changes between replays. The caller supplies it, or the document's data member does (container.md)                                                                          |
| Select, hover, drag or pin nodes                                              | no          | One-off actions on particular elements and positions                                                                                                                                         |
| Move the camera, change the view mode or the dimension (2D or 3D)             | no          | Presentation, not analysis. A replayed layout draws in the reader's current dimension                                                                                                        |
| Add, edit or remove style layers                                              | no          | Appearance travels in a style member, which the same file can carry. Two places for appearance would let them disagree. A run's own suggested colouring is kept, as the run's `style` option |
| Define a kept set, filter to a subgraph, compute a column, randomise, fetch   | no          | Not in version 1. A later version may add commands for them; an older reader stops at a command it does not know ("Replaying" rule 4)                                                        |

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
    commands: RecipeCommand[]; // replayed in order; at most 1,000
    extensions?: Record<string, unknown>;
}

type RecipeCommand = AlgoRun | LayoutSet; // "op" is an open list: see "Replaying" rule 4

interface AlgoRun {
    op: "algo.run";
    algorithm: string; // catalogue key: "pagerank", "louvain", ...
    as: string; // this run's name in the recipe: ^[a-z][a-z0-9_-]*$, no "__", unique
    params?: Record<string, unknown>; // option values by catalogue option name
    scope?: "graph" | "largest-component" | { where: string; on?: "nodes" | "edges" }; // default "graph"
    seed?: number; // integer
    sample?: number; // integer, the sample size of an approximate method
    exact?: boolean; // refuse to approximate
    style?: boolean | { size?: boolean | [number, number] }; // what the run paints; default true
    description?: string; // why this command is here; shown to people
}

interface LayoutSet {
    op: "layout.set";
    id: string; // catalogue layout id: "force", "circular", ...
    engine?: string; // the engine that draws it: "d3", "forceAtlas2", ...; default the catalogue's
    options?: Record<string, unknown>; // the engine's options, the seed among them
    description?: string;
}
```

`AlgoRun` is graphty-element's `AlgorithmRunCommand` (`graphty-element/src/session/planning.ts`)
restricted to what a recipe may hold, with `style` for the command's `applySuggestedStyles` and its
object form (the run option graphty-element 2.x has on `RunSpec`), and `description`. `LayoutSet`
is graphty-element's `LayoutSetCommand` (`graphty-element/src/session/commands/layout.ts`)
restricted the same way: no `scope`, because a layout draws the whole graph, and the seed where the
catalogue declares it, among the engine's `options`.

## Commands

1. Commands replay in order. A command starts after the one before it has finished or been skipped.
2. **`as` is required** on every `algo.run`, unique in the recipe, and never contains `__`, which
   separates a namespace from a name. graphty-element names an unnamed run from its algorithm and
   its scope, which resolves differently on other data, so a recipe always names its runs. A later
   command and a style refer to a run by its `as`.
3. **Options.** `params` (and a layout's `options`) are checked against the option descriptors
   graphty-element publishes for the algorithm or layout: an unknown name skips the command with
   `E_UNKNOWN_OPTION`, a value out of range with `E_OPTION_RANGE`. An option not given takes the
   published default, and the replay report lists every effective value. Because a recipe relies on
   defaults, graphty-element treats changing an option's default, renaming an option or removing one
   as a breaking change, made only in a major release; a renamed or removed option is still read
   through a legacy option map, as retired algorithm keys are (rule 9).
4. **Options that name elements are refused.** An option whose descriptor type is `node-id`,
   `node-set`, `partition` or `ordering` names particular nodes; a command that gives one a value is
   skipped with `E_BAD_COMMAND`. An option whose type is `attribute` names a column, and is bound
   like every column ("Binding to a new graph").
5. **Scope.** What the run looks at:
    - `"graph"` (the default): every node and edge.
    - `"largest-component"`: the connected component (weakly connected, on a directed graph) with the
      most nodes; among equal sizes, the most edges; then the one holding the node whose id sorts
      first (numbers before text, numbers ascending, text by code point). So the choice does not
      depend on the order a file lists its nodes.
    - `{ "where": predicate }`, or `{ "where": predicate, "on": "nodes" }`: the predicate, in
      graphty-element's JMESPath dialect, is evaluated on each node, and the run sees the matched
      nodes and the edges between them.
    - `{ "where": predicate, "on": "edges" }`: the predicate is evaluated on each edge, and the run
      sees every node and only the matched edges -- what a filter on edges shows. This is how a
      recipe keeps only high-confidence interactions:
      ``{ "where": "data.combined_score >= `700`", "on": "edges" }``.

    `data.<column>` in the predicate names a column of the table `on` says, and binds against that
    table only; `results.<as>.<field>` names a result field published on that table. Any other scope
    skips the command with `E_BAD_COMMAND`. The applier MUST pass the scope to graphty-element
    explicitly, `"graph"` when the command has none, because graphty-element's own default is the
    visible graph and a replay must not depend on what the reader has filtered. A predicate combined
    with the largest component is not in version 1.

6. **Weights are columns.** An algorithm that reads edge weights takes a `weight` option naming the
   edge column to read. Without one it runs unweighted -- every algorithm, with no column read
   implicitly -- so a plan always shows which column a run will read. Every importer names the edge
   weight `weight` (README, "What every importer produces"), so `"params": { "weight": "weight" }`
   reads it from any file type, and a graph with no such column skips the command with
   `E_UNKNOWN_ATTRIBUTE`. A weight is read as the algorithm reads it: path-based algorithms
   (betweenness, closeness, shortest paths) treat it as a distance, so a confidence or correlation
   column, where bigger means closer, must not be their weight. Version 1 cannot state what a weight
   means (README, "What version 1 does not cover"). graphty-element 2.x's Louvain and some others
   read a fixed column named `weight` and have no option; giving them one is a precondition of
   releasing recipes (README, "Where this lives in the packages").
7. **`seed`, `sample`, `exact`** mean what they mean on graphty-element's run command. A randomised
   or sampled command with no `seed` runs with a seed graphty-element draws, reported in the
   command's caveats and as a notice, because replaying it gives different numbers every time.
   `exact: true` fails rather than approximating, with `E_CAP_EXCEEDED` when the exact method is
   over the cost cap; it never degrades silently.
8. **`style`** is the run's own suggested colouring, as graphty-element's run option of the same
   name: `true` or absent paints it, `false` paints nothing. Its layers are added when the run
   completes, above every layer present then. A file whose style member paints this run's result
   MUST say `false`, so the result is not painted twice; the recorder does ("Recording" rule 6).
9. **Unknown keys.** An algorithm key or layout id this installation has not registered skips the
   command with `E_UNKNOWN_ALGORITHM` or `E_UNKNOWN_LAYOUT`. A retired key that graphty-element still
   resolves (`scc` to `components` with `{ "strength": "strong" }`) runs, and the report names the
   current key. The algorithm keys and their result fields are graphty-element's catalogue
   (`KNOWN_ALGORITHMS` and each `AlgorithmDescriptor.fields`, exported from its `./catalog` entry
   point); the most used are in style.md, "Result fields".
10. **Dependencies.** A command depends on every earlier command whose `as` it reads through a
    `results.<as>.<field>` path. A command that reads a later or unknown `as` is skipped with
    `E_BAD_COMMAND`. When a command is skipped or fails, every command that depends on it is skipped
    with `E_DEPENDENCY_SKIPPED`, naming it. Commands that do not depend on it still run.
11. An empty scope is not a success: a command whose scope matches no element is skipped with
    `E_SCOPE_EMPTY`, and its dependants with `E_DEPENDENCY_SKIPPED`.
12. **Layouts.** A `layout.set` replaces the layout, so only the last one in a recipe decides the
    picture. It follows rules 3, 4 and 9, and names its `engine` when the layout was drawn by one
    other than the catalogue's default, because another engine's seed means something else. A seed
    makes a layout start from the same positions; an engine that stops on a time-based settle test
    can end in slightly different positions, so a replayed picture is similar, not identical. A
    layout that needs a node (a tree from a root) cannot be recorded.

## How commands name columns

A command names a column in exactly two places:

- in a `where` scope, as `data.<column>` (style.md, "Paths": `data.adj.P.Val` is the column named
  `adj.P.Val`), of the table the scope's `on` names;
- as the value of an option whose descriptor type is `attribute`, such as an algorithm's `weight`:
  the column's name, as a string.

Nothing else in a command refers to the data. Node ids, edge ends and the file's own syntax never
appear, which is what makes a recipe portable across file types.

## Binding to a new graph

Before anything runs, the applier binds every column a command names to the current graph:

1. A column binds when the table it belongs to has a column of exactly that name: case, spaces and
   punctuation included, and as an own name, so `constructor` or `toString` binds only to a column
   of that name. The edge weight is the edge column `weight`.
2. The caller MAY pass a map from the recipe's names to the data's names
   (`apply(recipe, { columns: { "padj": "FDR" } })`, or `columns` on `openDocument`). The applier
   rewrites the parsed expression and the option value -- never the text -- and records the rename
   in the report. The map is the only way a name changes.
3. A column that does not bind skips every command that names it with `E_UNKNOWN_ATTRIBUTE`,
   naming the column, and every command that depends on those with `E_DEPENDENCY_SKIPPED`. The
   report lists up to three existing columns with the nearest names as suggestions for the caller;
   the applier never uses one.
4. A column a `where` predicate compares with a number, or an option reads as numbers (a weight),
   that holds values that are not numbers -- text such as `NA`, or a column a CSV import typed as
   text -- is reported with `W_COLUMN_TYPE`, the column and how many elements hold such a value. The
   command still runs; a comparison with a text value is false.
5. When the recipe carries `directed` and the graph's direction differs (or is mixed), the report
   carries `W_DIRECTION_DIFFERS`, naming both, before anything runs. The commands run on the graph
   as it is; version 1 cannot change a graph's direction.
6. Binding happens once per application, before the first command runs, so the report can say what
   a recipe needs before it spends anything.

## Identity and versions

1. `id` identifies the recipe across all its versions. A reverse-domain name
   (`org.example-lab.hub-genes`) or an `https:` URL is RECOMMENDED so two authors do not collide.
2. `recipeVersion`, when present, MUST be a SemVer 2.0.0 version, and versions are ordered by SemVer
   precedence (`1.10.0` is newer than `1.9.0`). One `id` and `recipeVersion` SHOULD name one content:
   a change is a new `recipeVersion`. A recipe shared outside its author's own work SHOULD carry one.
3. A recipe recorded from a session that applied another recipe and changed it gets a new `id` or a
   new `recipeVersion` from the caller; the recorder never reuses both.

## Run ids and namespaces

Applying a recipe gives each run the id `<namespace>__<as>`, so two recipes, or one recipe applied
twice, never overwrite each other's results.

1. The namespace is the caller's `namespace` option; else the recipe's `namespace`; else one derived
   from the last segment of `id` (after its last `.`, `/` or `:`): lower-cased, each run of other
   characters than letters and digits replaced by one `_`, leading characters up to the first letter
   and a trailing `_` removed, cut to 32 characters, and `recipe` when nothing is left.
   `org.example.team-overview` gives `team_overview`.
2. When that namespace is already used by another application in the session, `2`, `3` and so on is
   appended (`team_overview2`).
3. A run the recipe names `influence` is then `team_overview__influence`, and its results are
   `results.team_overview__influence.value`. The applier rewrites, by the parsed expression, every
   `results.<as>` in the recipe's own `where` scopes, and in the style members of the same file
   (container.md, "Applying a file" rule 5).
4. A style saved on its own names runs by their session ids. A namespaced id from an applied recipe
   is stable; an id graphty-element derived for a run started without `as` is not, so such a style
   is refused with `E_UNSTABLE_RUN_ID` (style.md, "Writing" rule 4).

## Applying a recipe

```ts
session.recipes.apply(recipe: RecipeMember, options?: {
    columns?: Record<string, string>; // recipe column name -> data column name
    namespace?: string;
    onRepeat?: "refuse" | "replace" | "add"; // default "refuse"
    run?: boolean; // default false: bind and plan only
    capSeconds?: number; // the per-command cost cap; default the element's own ("Running")
    budget?: { totalSeconds?: number }; // default: the published total budget ("Running")
}): Promise<RecipeApplication>

interface RecipeApplication {
    readonly report: RecipeReport; // "The replay report"
    /** Runs the commands not yet run; calling it again after a cancel resumes. */
    run(options?: { capSeconds?: number; budget?: { totalSeconds?: number } }): Run<RecipeReport>;
    cancel(): void;
    /** Removes every run this application made and the layers those runs painted. */
    remove(): void;
}
```

`openDocument(src, { run: true })` applies each recipe of a file this way with `run: true`.

**Repeat application.** When a recipe with the same `id` has already been applied to the same data
in this session and ran at least one command, a second application follows `onRepeat`: `"refuse"`
(the default) fails with `E_REPEAT_APPLICATION`, naming both versions when they differ; `"replace"`
keeps the earlier namespace, removes the earlier runs and the colouring they painted, and runs
again; `"add"` applies it again under a new namespace (rule 2 of "Run ids and namespaces"). New data
starts afresh (container.md, "Applying a file" rule 7): applying a recipe to newly loaded data is
never a repeat of its application to the data that was replaced.

## Running

1. **Nothing runs until the caller asks.** Applying binds and plans: every command gets a state and
   graphty-element's cost estimate on the current graph, and the report totals them. Runs start
   only with `run: true` or `run()`. Opening a document is not a request to run, and neither is
   loading data. Runs that should happen when data is loaded -- which graphty-element 1.x
   kept in its style template -- are a recipe, opened with the data and `run: true`.
2. **The cost cap.** Each command is held to the per-command cost cap graphty-element applies to the
   same call made by hand: its `exactComputationSeconds` limit, 30 seconds by default, or the
   caller's `capSeconds`. A recipe cannot raise it. The estimate held to the cap is the one of the
   method that will run, so a command whose `sample` gives an estimate past the cap is refused with
   `E_CAP_EXCEEDED` like an exact one. A command with no estimate -- a layout whose engine publishes
   none -- counts as past the cap and is skipped with `E_CAP_EXCEEDED`, never as free; every layout
   engine publishing an estimate, and every iteration count in a layout's options having a maximum,
   is a precondition of releasing recipes.
3. **The total budget.** One application has a total budget of 300 seconds by default (ten times the
   default cap). A recipe whose planned total is over the budget does not start: `run()` fails with
   `E_CAP_EXCEEDED` and the estimate, and the caller may run it with a larger `budget`. A recipe that
   reaches its budget while running stops, keeping the commands that finished.
4. Cancelling keeps the results of the commands that finished; `run()` again runs the rest.

## Same data, same results

Replaying a recipe on the same data gives the same numbers when all of these hold, and the replay
report shows each one:

1. **The same release** of graphty-element. The report names the release that wrote the file and
   the one replaying it, and carries `W_RELEASE_DIFFERS` when they differ.
2. **A seed on every randomised or sampled command.** The recorder always writes one; a hand-written
   command without one runs with a drawn seed and gives different numbers on every replay.
3. **The same method**: exact, or the same sample size. The recorder writes what the run used.
4. **The same precision.** graphty-element computes in single precision on a WebGPU accelerator and
   in double precision on the CPU, so the same run on two machines can differ in the seventh digit,
   and nearly tied nodes can swap rank. `caveats.precision` shows which was used.
5. **The same direction** (`W_DIRECTION_DIFFERS`, "Binding to a new graph" rule 5).
6. **The same node order**, for algorithms whose result depends on the order nodes are visited
   (Louvain, label propagation). The same network read from two file types can list its nodes in a
   different order, so a seeded Louvain can find different communities on its CSV and its GraphML
   export.

A layout gives a similar picture, not an identical one ("Commands" rule 12).

## The replay report

```ts
interface RecipeReport {
    readonly recipe: { readonly id: string; readonly recipeVersion?: string; readonly name?: string };
    readonly namespace: string;
    readonly direction: { readonly recorded: boolean | null; readonly data: boolean | "mixed" };
    /** Every column the commands name, and what it bound to. */
    readonly columns: readonly {
        readonly name: string; // as the recipe names it
        readonly table: "node" | "edge";
        readonly boundTo: string | null; // the data's column; null when missing
        readonly renamedByCaller: boolean;
        readonly usedBy: readonly number[]; // command indexes
        readonly suggestions: readonly string[]; // nearest existing names, never used
    }[];
    readonly commands: readonly {
        readonly index: number;
        readonly op: string;
        readonly as?: string;
        readonly runId?: string; // the namespaced id
        readonly state: "planned" | "running" | "done" | "skipped" | "failed" | "cancelled";
        readonly problem?: Problem; // container.md, "The report"
        readonly params: Readonly<Record<string, unknown>>; // effective values, defaults filled in
        readonly seed?: number; // the seed it runs with, drawn when the command had none
        readonly style: boolean; // whether it will paint its suggested colouring
        readonly fields: readonly string[]; // the result fields it publishes, as results.<runId>.<field>
        readonly estimateSeconds: number | null;
        readonly caveats?: Caveats; // once run: exact or sampled, seed, precision, direction, weight read
    }[];
    readonly totalEstimateSeconds: number;
    readonly notices: readonly Problem[];
}
```

`Caveats` is graphty-element's published type (`graphty-element/src/session/runs/types.ts`): whether
the numbers are exact, the sample size and seed, precision, convergence, direction, and which edge
weight was read with what meaning.

## Recording

```ts
session.recipes.record(options: RecordOptions): {
    readonly recipe: RecipeMember;
    readonly leftOut: readonly Problem[]; // every run not recorded, with the reason
    readonly notices: readonly Problem[]; // conversions, renames
};

interface RecordOptions {
    id: string;
    name?: string;
    description?: string;
    recipeVersion?: string;
    namespace?: string;
    runs?: readonly string[]; // run ids; default every completed run the session holds
    layout?: boolean; // default true: record the last layout set
}
```

`session.data.saveDocument({ recipe: options })` records the same way and puts the recipe in a
document beside the style. The recorder:

1. **Chooses runs.** It writes the `algo.run` commands of the runs selected, each at the position of
   its latest start (a re-run or a retune moves a run to when it last started), and the last layout
   set. Runs that failed, were cancelled, or resolved `partial` are left out. A run that read another
   run's result (a `results.` path in its scope) which was re-run or retuned after it is stale: its
   recorded numbers came from inputs the recipe no longer holds, so it is left out too.
2. **Leaves out every run a recipe may not hold** ("What a recipe records"), and reports each one
   with the reason, so the caller sees exactly what the recipe will not reproduce. It never
   rewrites such a run into something it was not: a run on the selection is not recorded as a run
   on the whole graph.
3. **Converts scopes.** A run on the whole graph, or on the visible graph while no filter was
   active, is written `"graph"`; a run on the largest component, `"largest-component"`; a run on a
   `where` scope, that scope. A run on the visible graph while a filter was active is written with a
   `where` scope when the filter is one predicate over the columns of one table -- an expression, or
   a range or category condition on one column, written as the equivalent expression -- with `on`
   naming the table, and the conversion is reported. Any other scope leaves the run out (rule 2).
4. **Names every run.** A run keeps its explicit name, with a namespace removed (a run
   `team_overview__influence` from an applied recipe is written `influence`); a run without one is
   named from its algorithm key, every run of characters other than letters and digits replaced by
   one `_` (`pagerank`, `label_propagation`). When two runs end up with one name, the first in start
   order keeps it and later ones get `_2`, `_3`. Every `results.<id>` path in the recorded commands
   and in the style saved beside them is rewritten to the new names.
5. **Writes what the run computed.** In `params`, every option whose value differs from the
   published default ("Commands" rule 3). `seed` from the run's caveats whenever the run was
   randomised or sampled. When the run approximated (`caveats.exact` false), `sample` from
   `caveats.sampleSize`; when an algorithm that can approximate ran exactly, `exact: true`, so a
   replay does not silently sample. `directed` from the graph.
6. **Writes `style`** from the run command's `applySuggestedStyles`, except that it writes `false`
   when the style saved beside the recipe holds that run's layers.
7. Takes `id`, and `name`, `recipeVersion` and `namespace` if wanted, from the caller.

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
2. A command that fails its schema is skipped with `E_BAD_COMMAND`, and its dependants with
   `E_DEPENDENCY_SKIPPED`.
3. **Command members are closed.** A command with a member outside its schema (`"sed": 7` for
   `"seed": 7`) is skipped with `E_UNKNOWN_OPTION`, suggesting the nearest member, **and so is every
   later command**. `seed`, `exact`, `sample` and `scope` decide the numbers a run produces; a
   misspelled one would otherwise run unseeded, sampled or on the whole graph with nothing but a
   warning.
4. **Unknown commands stop the replay.** `op` is an open list: a later version adds commands to
   version 1 recipes. A command whose `op` the reader does not know is skipped with
   `E_UNKNOWN_COMMAND`, **and so is every later command**: an unknown command may be a filter that
   changes what every later command sees, so running the rest would report success on the wrong
   input. The commands before it run.
5. Two commands with the same `as`: the second, and every command depending on it, is skipped with
   `E_DUPLICATE_ID`.

## Conformance

| Input                                                                                               | Required result                                                                                       |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| an `algo.run` without `as`                                                                          | skipped, `E_BAD_COMMAND` (it fails the schema); dependants skipped                                    |
| `as: "hubs__score"`                                                                                 | skipped: `__` is reserved                                                                             |
| a command with `op: "graph.filter"` after two `algo.run`                                            | the two runs run; it and every later command skipped, `E_UNKNOWN_COMMAND`                             |
| `{ "op": "algo.run", "algorithm": "betweenness", "as": "b", "sed": 7 }`                             | it and every later command skipped, `E_UNKNOWN_OPTION`, suggesting `seed`                             |
| a scope `"selection"` or `{ "nodes": ["TP53"] }`                                                    | skipped, `E_BAD_COMMAND`                                                                              |
| a `shortest-path` run with `params: { "source": "A" }`                                              | skipped, `E_BAD_COMMAND`: the option names a node                                                     |
| a command with no scope, replayed while a filter hides half the graph                               | runs on every node                                                                                    |
| `betweenness` with ``{ "where": "data.combined_score >= `700`", "on": "edges" }``                   | runs on every node and the edges scoring 700 or more                                                  |
| the same predicate with no `on`, on a graph whose nodes have no `combined_score`                    | skipped, `E_UNKNOWN_ATTRIBUTE`: the node table has no such column                                     |
| `"largest-component"` on a graph with two components of 500 nodes and 800 edges each                | the component holding the node whose id sorts first, whatever the file order                          |
| a `where` scope reading `data.padj` on data whose column is `FDR`                                   | skipped, `E_UNKNOWN_ATTRIBUTE` naming `padj`; the report suggests `FDR`; nothing is renamed           |
| the same, applied with `columns: { "padj": "FDR" }`                                                 | runs over `FDR`; the report records the rename                                                        |
| a `where` scope reading `data.Score` on data whose column is `score`                                | skipped, `E_UNKNOWN_ATTRIBUTE`: names are compared exactly                                            |
| `params: { "weight": "weight" }`, replayed on a GML file and on a Pajek file with weights           | runs on both: each importer names the weight `weight`                                                 |
| `params: { "weight": "combined_score" }` on a graph with no such edge column                        | skipped, `E_UNKNOWN_ATTRIBUTE`; dependants skipped; other commands run                                |
| `params: { "weight": "constructor" }` on a graph with no such column                                | skipped, `E_UNKNOWN_ATTRIBUTE`                                                                        |
| ``"where": "data.padj < `0.05`"`` where `padj` holds numbers and `NA`                               | runs; `W_COLUMN_TYPE` naming `padj` and the count of `NA` values                                      |
| `louvain` with no `seed`, replayed twice                                                            | each replay draws and reports a seed; a notice says the results will differ                           |
| a recipe with `"directed": false` replayed on a CSV import (directed)                               | `W_DIRECTION_DIFFERS` before anything runs; the commands run                                          |
| a `where` scope reading `results.modules.group`, where `modules` is a later command                 | skipped, `E_BAD_COMMAND`                                                                              |
| a command reading `results.modules.group` after the `modules` command was skipped                   | skipped, `E_DEPENDENCY_SKIPPED`                                                                       |
| a `where` scope that matches no node                                                                | skipped, `E_SCOPE_EMPTY`; dependants skipped                                                          |
| algorithm key `scc`                                                                                 | runs `components` with `{ "strength": "strong" }`; the report names the current key                   |
| algorithm key `org.example:motif-census`, not registered                                            | skipped, `E_UNKNOWN_ALGORITHM`; dependants skipped                                                    |
| opened with no instruction to run                                                                   | nothing runs; every command planned, with its estimate, `style`, `fields` and the total               |
| a recipe planned at twice the total budget, `run()`                                                 | not started, `E_CAP_EXCEEDED` with the estimate                                                       |
| a `sample` whose sampled estimate is past the cap                                                   | skipped, `E_CAP_EXCEEDED`                                                                             |
| a `layout.set` whose engine publishes no estimate                                                   | skipped, `E_CAP_EXCEEDED`                                                                             |
| the same `id` applied twice to the same data                                                        | the second refused, `E_REPEAT_APPLICATION`; with `onRepeat: "add"`, ids `ns__x` and `ns2__x`          |
| the same `id` applied after a `data.import` that merged a file                                      | refused, `E_REPEAT_APPLICATION`: merging is the same data                                             |
| the same `id` applied after new data replaced the graph                                             | runs; not a repeat                                                                                    |
| recipe versions `1.9.0` and `1.10.0`                                                                | `1.10.0` is newer                                                                                     |
| a session with a run on the current selection, recorded                                             | that run left out and reported; the other runs recorded                                               |
| a run on the visible graph under the filter ``data.combined_score >= `700` `` on edges, recorded    | recorded with ``{ "where": "data.combined_score >= `700`", "on": "edges" }``; the conversion reported |
| PageRank as `hubs`, degree scoped to ``results.hubs.value > `0.01` ``, then `hubs` re-run, recorded | `hubs` recorded; the degree run left out as stale and reported                                        |
| a sampled betweenness run (sample size 2000, seed 11), recorded                                     | recorded with `"sample": 2000, "seed": 11`                                                            |
| a run that resolved `partial` under a time box, recorded                                            | left out and reported                                                                                 |
| runs `a__influence` and `b__influence` from two applied recipes, recorded                           | written `influence` (the earlier start) and `influence_2`                                             |
| a PageRank run that painted, saved with its style by default                                        | the recipe says `"style": false`; reopening shows the layer once                                      |

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
                    "as": "modules",
                    "seed": 7
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

Replayed on a colleague's GraphML file with a `padj` node key and a `weight` edge key, all four
commands run. Replayed on a CSV edge list with a `weight`
column and no node table, the third command is skipped with `E_UNKNOWN_ATTRIBUTE` naming `padj`; the
other three run, and the report says so before anything starts. If that CSV is imported as directed,
the report also carries `W_DIRECTION_DIFFERS`.

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
