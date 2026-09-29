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
every importer produces the same named columns (README, "Three things called a file format"). When a
column it needs is missing, that is reported, never guessed.

## What a recipe records

A recipe holds exactly two commands in version 1. Everything else a session does is left out, each
for a stated reason, because a command that names a particular node, a place on the screen or a
file means nothing on the next dataset.

| Session action                                                                | In a recipe | Why                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run an algorithm (`algo.run`)                                                 | yes         | The core of an analysis. It names the algorithm by catalogue key, its options by value and its scope by rule, so it means the same thing on any graph                                        |
| Set the layout (`layout.set`)                                                 | yes         | A layout is an algorithm over the whole graph whose options name no element. Recording it with its seed makes the replayed picture match, which is part of reading the result                |
| Run an algorithm with an option that names a node or a set of nodes           | no          | A shortest path from one chosen account, a search from one start node: the chosen node exists only in the data it was chosen from. Version 1 has no way to choose a node by a rule           |
| Run an algorithm on the selection, on a listed set of nodes, or on a kept set | no          | Each names particular elements. A run on the whole graph, the largest component, or the elements a predicate over columns matches is recorded instead                                        |
| Run an algorithm on the visible graph while a filter hides part of it         | no          | The filter is the reader's view, not part of the analysis. A restriction that belongs to the analysis is written as the run's `where` scope                                                  |
| Load or import data                                                           | no          | The data is what changes between replays. The caller supplies it, or the document's data member does (container.md)                                                                          |
| Select, hover, drag or pin nodes                                              | no          | One-off actions on particular elements and positions                                                                                                                                         |
| Move the camera, change the view mode                                         | no          | Presentation, not analysis                                                                                                                                                                   |
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
    commands: RecipeCommand[]; // replayed in order; at most 1,000
    extensions?: Record<string, unknown>;
}

type RecipeCommand = AlgoRun | LayoutSet;

interface AlgoRun {
    op: "algo.run";
    algorithm: string; // catalogue key: "pagerank", "louvain", ...
    as: string; // this run's name in the recipe: ^[a-z][a-z0-9_-]*$, no "__", unique
    params?: Record<string, unknown>; // option values by catalogue option name
    scope?: "graph" | "largest-component" | { where: string }; // default "graph"
    seed?: number; // integer
    sample?: number; // integer, the sample size of an approximate method
    exact?: boolean; // refuse to approximate
    style?: boolean | { size?: boolean | [number, number] }; // what the run paints; default true
    description?: string; // why this command is here; shown to people
}

interface LayoutSet {
    op: "layout.set";
    layout: string; // catalogue id: "force", "circular", ...
    params?: Record<string, unknown>;
    seed?: number;
    description?: string;
}
```

`AlgoRun` is graphty-element's `AlgorithmRunCommand` (`graphty-element/src/session/planning.ts`)
restricted to what a recipe may hold, plus `style` (the run option graphty-element 2.x already has
on `RunSpec`) and `description`. `LayoutSet` is the element API design's layout command
(section 4.11), which graphty-element does not have yet.

## Commands

1. Commands replay in order. A command starts after the one before it has finished or been skipped.
2. **`as` is required** on every `algo.run`, unique in the recipe, and never contains `__`, which
   separates a namespace from a name. graphty-element names an unnamed run from its algorithm and
   its scope, which resolves differently on other data, so a recipe always names its runs. A later
   command and a style refer to a run by its `as`.
3. **Options.** `params` are checked against the option descriptors graphty-element publishes for
   the algorithm or layout: an unknown name skips the command with `E_UNKNOWN_OPTION`, a value out
   of range with `E_OPTION_RANGE`. An option not given takes graphty-element's current default, and
   the replay report lists every effective value.
4. **Options that name elements are refused.** An option whose descriptor type is `node-id`,
   `node-set`, `partition` or `ordering` names particular nodes; a command that gives one a value is
   skipped with `E_BAD_COMMAND`. An option whose type is `attribute` names a column, and is bound
   like every column ("Binding to a new graph").
5. **Scope.** `"graph"` (the default) is every node and edge; `"largest-component"` is the largest
   connected component; `{ where }` is the elements a predicate in graphty-element's JMESPath
   dialect matches, as graphty-element's `where` scope. Any other scope skips the command with
   `E_BAD_COMMAND`. The applier MUST pass the scope to graphty-element explicitly, `"graph"` when
   the command has none, because graphty-element's own default is the visible graph and a replay
   must not depend on what the reader has filtered.
6. **Weights are columns.** An algorithm that takes a `weight` option reads edge weights from the
   edge column it names (`"params": { "weight": "combined_score" }`), and without it runs
   unweighted. So a weighted run names its weight column like any other column (rule 4), and a
   graph without that column skips the command. Some graphty-element 2.x algorithms (Louvain among
   them) have no `weight` option and always read a column named `weight`; for them the run's
   caveats in the replay report say which column was read. Giving every algorithm that reads
   weights a `weight` option is an element change this rule depends on (README, "Where this lives
   in the packages").
7. **`seed`, `sample`, `exact`** mean what they mean on graphty-element's run command. `exact: true`
   fails rather than approximating, with `E_CAP_EXCEEDED` when the exact method is over the cost
   cap; it never degrades silently.
8. **`style`** is the run's own suggested colouring, as graphty-element's run option of the same
   name: `true` or absent paints it, `false` paints nothing. A file that also carries a style member
   holding the layers saved from that run SHOULD say `false`, so the colouring is not added twice.
9. **Unknown keys.** An algorithm key or layout id this installation has not registered skips the
   command with `E_UNKNOWN_ALGORITHM` or `E_UNKNOWN_LAYOUT`. A retired key that graphty-element still
   resolves (`scc` to `components` with `{ "strength": "strong" }`) runs, and the report names the
   current key.
10. **Dependencies.** A command depends on every earlier command whose `as` it reads through a
    `results.<as>.<field>` path. A command that reads a later or unknown `as` is skipped with
    `E_BAD_COMMAND`. When a command is skipped or fails, every command that depends on it is skipped
    with `E_DEPENDENCY_SKIPPED`, naming it. Commands that do not depend on it still run.
11. An empty scope is not a success: a command whose scope matches no element is skipped with
    `E_SCOPE_EMPTY`, and its dependants with `E_DEPENDENCY_SKIPPED`.
12. **Layouts.** A `layout.set` replaces the layout, so only the last one in a recipe decides the
    picture. It follows rules 3, 4 and 9; a layout that needs a node (a tree from a root) cannot
    be recorded.

## How commands name columns

A command names a column in exactly two places:

- in a `where` scope, as `data.<column>` (style.md, "Paths": `data.adj.P.Val` is the column named
  `adj.P.Val`);
- as the value of an option whose descriptor type is `attribute`, such as an algorithm's `weight`:
  the column's name, as a string.

Nothing else in a command refers to the data. Node ids, edge ends and the file's own syntax never
appear, which is what makes a recipe portable across file types.

## Binding to a new graph

Before anything runs, the applier binds every column a command names to the current graph:

1. A column binds when the graph's node table or edge table has a column of exactly that name. The
   comparison is exact: case, spaces and punctuation included. The edge weight an import resolved
   counts as an edge column under the name the file gave it (a CSV's `weight` header, a GraphML
   key's `attr.name`), which graph-io records as the weight's origin.
2. The caller MAY pass a map from the recipe's names to the data's names
   (`apply(recipe, { columns: { "padj": "FDR" } })`). The applier rewrites the parsed expression and
   the option value -- never the text -- and records the rename in the report. The map is the only
   way a name changes.
3. A column that does not bind skips every command that names it with `E_UNKNOWN_ATTRIBUTE`,
   naming the column, and every command that depends on those with `E_DEPENDENCY_SKIPPED`. The
   report lists up to three existing columns with the nearest names as suggestions for the caller;
   the applier never uses one.
4. Binding happens once per application, before the first command runs, so the report can say what
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
   (container.md, "Applying a file" rule 4).
4. A style saved on its own names runs by their namespaced ids, because it has no recipe beside it
   to rewrite from.

## Applying a recipe

```ts
session.recipes.apply(recipe: RecipeMember, options?: {
    columns?: Record<string, string>; // recipe column name -> data column name
    namespace?: string;
    onRepeat?: "refuse" | "replace" | "add"; // default "refuse"
    run?: boolean; // default false: bind and plan only
    budget?: { totalSeconds?: number }; // default: the published total budget ("Running")
}): Promise<RecipeApplication>

interface RecipeApplication {
    readonly report: RecipeReport; // "The replay report"
    /** Runs the commands not yet run; calling it again after a cancel resumes. */
    run(options?: { budget?: { totalSeconds?: number } }): Run<RecipeReport>;
    cancel(): void;
}
```

`openDocument(src, { run: true })` applies each recipe of a file this way with `run: true`.

**Repeat application.** When a recipe with the same `id` has already been applied to the same data
in this session and ran at least one command, a second application follows `onRepeat`: `"refuse"`
(the default) fails with `E_REPEAT_APPLICATION`, naming both versions when they differ; `"replace"`
keeps the earlier namespace, removes the earlier runs and the colouring they painted, and runs
again; `"add"` applies it again under a new namespace (rule 2 of "Run ids and namespaces"). Loading
new data starts afresh: applying a recipe to newly loaded data is never a repeat of its application
to the data that was replaced.

## Running

1. **Nothing runs until the caller asks.** Applying binds and plans: every command gets a state and
   graphty-element's cost estimate on the current graph, and the report totals them. Runs start
   only with `run: true` or `run()`. Opening a document is not a request to run, and neither is
   loading data. Runs that should happen when data is loaded -- which graphty-element 1.x
   kept in its style template -- are a recipe, opened with the data and `run: true`.
2. **The cost cap.** Each command is held to the cost cap graphty-element applies to the same call
   made by hand. A recipe cannot raise it; the caller can, as for a direct call.
3. **The total budget.** graphty-element publishes a default total budget for one application
   (RECOMMENDED: ten times the per-command cost cap). A recipe whose planned total is over the
   budget does not start: `run()` fails with `E_CAP_EXCEEDED` and the estimate, and the caller may
   run it with a larger `budget`. A recipe that reaches its budget while running stops, keeping the
   commands that finished.
4. Cancelling keeps the results of the commands that finished; `run()` again runs the rest.

## The replay report

```ts
interface RecipeReport {
    readonly recipe: { readonly id: string; readonly recipeVersion?: string; readonly name?: string };
    readonly namespace: string;
    /** Every column the commands name, and what it bound to. */
    readonly columns: readonly {
        readonly name: string; // as the recipe names it
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
        readonly estimateSeconds: number | null;
        readonly caveats?: Caveats; // once run: exact or sampled, seed, precision, weight read
    }[];
    readonly totalEstimateSeconds: number;
    readonly notices: readonly Problem[];
}
```

`Caveats` is graphty-element's published type (`graphty-element/src/session/runs/types.ts`): whether
the numbers are exact, the sample size and seed, precision, convergence, and which edge weight was
read with what meaning.

## Recording

graphty-element saves the analysis commands of a session as a recipe (the element API design's
`journal.export()`), and the file writer puts it in a document beside the style. The recorder:

1. Writes, in the order they started, the `algo.run` commands of the runs the caller selects (by
   default every completed run the session holds), and the last layout set, if any. Runs that
   failed, were cancelled, or were replaced by a later run of the same name are left out.
2. **Leaves out every run a recipe may not hold** ("What a recipe records"), and reports each one
   with the reason, so the caller sees exactly what the recipe will not reproduce. It never
   rewrites such a run into something it was not: a run on the selection is not recorded as a run
   on the whole graph.
3. Converts scopes: a run on the whole graph, or on the visible graph while no filter was active,
   is written `"graph"`; a run on the largest component, `"largest-component"`; a run on a `where`
   scope, that scope. Any other scope leaves the run out (rule 2).
4. **Names every run.** A run that has an explicit name keeps it, with a namespace removed (a run
   `team_overview__influence` from an applied recipe is written `influence`). A run without one is
   named from its algorithm key -- every run of characters other than letters and digits replaced by
   one `_` -- then `_2`, `_3` for later runs (`pagerank`, `pagerank_2`, `label_propagation`). Two
   runs that would share a name get the same suffixes. Every `results.<id>` path in the recorded
   commands and in the style saved beside them is rewritten to the new names.
5. Writes in `params` every option value the run used, defaults included, so a replay on a later
   release runs with the same values; writes `seed` for every run that used one; writes `sample`
   and `exact` as the run had them; and writes `style` as the run had it.
6. Takes `id`, and `name` and `recipeVersion` if wanted, from the caller.

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
3. Compute is bounded by the consent rule, the cost cap, the total budget and the command limit
   ("Running").
4. The caller's `columns` map rewrites parsed expressions, never text, so a column name can never
   inject a predicate.

## Replaying

The rules for a file from another release or a hand-written file:

1. Commands are read one at a time; a failure is as small as possible.
2. A command that fails its schema is skipped with `E_BAD_COMMAND`, and its dependants with
   `E_DEPENDENCY_SKIPPED`.
3. **Command members are closed.** A command with a member outside its schema (`"sed": 7` for
   `"seed": 7`) is skipped with `E_UNKNOWN_OPTION`, suggesting the nearest member, **and so is every
   later command**. `seed`, `exact`, `sample` and `scope` decide the numbers a run
   produces; a misspelled one would otherwise run unseeded, sampled or on the whole graph with
   nothing but a warning.
4. **Unknown commands stop the replay.** A command whose `op` the reader does not know is skipped
   with `E_UNKNOWN_COMMAND`, **and so is every later command**: an unknown command may be a filter
   that changes what every later command sees, so running the rest would report success on the
   wrong input.
5. Two commands with the same `as`: the second, and every command depending on it, is skipped with
   `E_DUPLICATE_ID`.

## Conformance

| Input                                                                               | Required result                                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| an `algo.run` without `as`                                                          | skipped, `E_BAD_COMMAND` (it fails the schema); dependants skipped                           |
| `as: "hubs__score"`                                                                 | skipped: `__` is reserved                                                                    |
| a command with `op: "graph.filter"`                                                 | it and every later command skipped, `E_UNKNOWN_COMMAND`                                      |
| `{ "op": "algo.run", "algorithm": "betweenness", "as": "b", "sed": 7 }`             | it and every later command skipped, `E_UNKNOWN_OPTION`, suggesting `seed`                    |
| a scope `"selection"` or `{ "nodes": ["TP53"] }`                                    | skipped, `E_BAD_COMMAND`                                                                     |
| a `shortest-path` run with `params: { "source": "A" }`                              | skipped, `E_BAD_COMMAND`: the option names a node                                            |
| a command with no scope, replayed while a filter hides half the graph               | runs on every node                                                                           |
| a `where` scope reading `data.padj` on data whose column is `FDR`                   | skipped, `E_UNKNOWN_ATTRIBUTE` naming `padj`; the report suggests `FDR`; nothing is renamed  |
| the same, applied with `columns: { "padj": "FDR" }`                                 | runs over `FDR`; the report records the rename                                               |
| a `where` scope reading `data.Weight` on data whose column is `weight`              | skipped, `E_UNKNOWN_ATTRIBUTE`: names are compared exactly                                   |
| `params: { "weight": "combined_score" }` on a graph with no such edge column        | skipped, `E_UNKNOWN_ATTRIBUTE`; dependants skipped; other commands run                       |
| a `where` scope reading `results.modules.group`, where `modules` is a later command | skipped, `E_BAD_COMMAND`                                                                     |
| a command reading `results.modules.group` after the `modules` command was skipped   | skipped, `E_DEPENDENCY_SKIPPED`                                                              |
| a `where` scope that matches no node                                                | skipped, `E_SCOPE_EMPTY`; dependants skipped                                                 |
| algorithm key `scc`                                                                 | runs `components` with `{ "strength": "strong" }`; the report names the current key          |
| algorithm key `org.example:motif-census`, not registered                            | skipped, `E_UNKNOWN_ALGORITHM`; dependants skipped                                           |
| opened with no instruction to run                                                   | nothing runs; every command planned, with its estimate and the total                         |
| a recipe planned at twice the total budget, `run()`                                 | not started, `E_CAP_EXCEEDED` with the estimate                                              |
| the same `id` applied twice to the same data                                        | the second refused, `E_REPEAT_APPLICATION`; with `onRepeat: "add"`, ids `ns__x` and `ns2__x` |
| the same `id` applied after new data was loaded                                     | runs; not a repeat                                                                           |
| recipe versions `1.9.0` and `1.10.0`                                                | `1.10.0` is newer                                                                            |
| a session with a run on the current selection, recorded                             | that run left out and reported; the other runs recorded                                      |

## Worked example

A lab ranks hub genes the same way on every new co-expression network: PageRank over the
co-expression weights, then groups, then the degree of the significant genes. It names two columns:
`correlation` on edges, as PageRank's weight, and `padj` (an adjusted p-value) on nodes.

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
            "commands": [
                {
                    "op": "algo.run",
                    "algorithm": "pagerank",
                    "as": "hubs",
                    "params": { "dampingFactor": 0.85, "weight": "correlation" },
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
                { "op": "layout.set", "layout": "force", "seed": 42 }
            ]
        }
    ]
}
```

Replayed on a colleague's GraphML file with a `padj` node attribute and a `correlation` edge
attribute, all four commands run. Replayed on a CSV edge list with no node table, the third command is skipped with
`E_UNKNOWN_ATTRIBUTE` naming `padj`; the other three run, and the report says so before anything
starts.
