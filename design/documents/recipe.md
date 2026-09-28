# Recipe

`kind: "graphty-recipe"`, version 1. Schema: [recipe.schema.json](recipe.schema.json) (normative
for structure). Shared conventions are in [README.md](README.md).

## Purpose

A recipe is an ordered set of analysis steps that can be replayed on a graph nobody has analysed
yet. The owner's words: "analysis, which runs a set of analysis functions on a graph so that new
graphs can benefit from complex orders of operations to understand them more quickly -- great for
domain specific work" (2026-09-19), and "characterizing an overall graph seems like a good example
of a recipe, and might be domain specific -- some domains care about groups, others care about
flows. maybe there should be a default overview recipe and a way to replace the default"
(2026-09-27).

It serves the analyst who has "no way to save analysis patterns"
(`design/designloom/personas/analyst-alex.yaml`), the researcher who builds "reproducible analysis
pipelines that other researchers can use and cite"
(`design/designloom/personas/bioinformatics-researcher.yaml`), and the lab that ranks hub genes the
same way on every new network (`design/designloom/workflows/W23.yaml`, Hub Gene Identification and
Ranking).

A recipe is the only document that spends compute. Opening one never starts a run by itself
(see "Consent").

## Two earlier designs, and this one

Two designs of the recipe exist and disagree:

- **The element API design** (`design/element-api/element-api-design.md` section 4.11): a recipe is
  `{ version: 1, steps: Command[], engine }`, produced by `journal.export()` and replayed by
  `journal.replay()`, where `Command` is the element's whole command union -- imports, selections,
  camera moves, configuration. It "invents no serialisation format": a recipe is the same JSON a
  command, a journal row and an AI tool call already are. It binds by name at replay and declares
  nothing about the data it needs.
- **The design studio** (`design/ui/framework/one-way-doors.md` door 19,
  `design/ui/framework/conceptual-model.md` section 8): a recipe is a declarative profile of the
  project file with no data, declaring one requirement slot per attribute it reads (with
  measurement level and weight role) and per catalogue entry, carrying an id, a version and an
  optional canonical source, and namespacing its ids when applied. It also carries style layers,
  views and notes on definitions.

This specification is a hybrid, and the choice is an open decision (README, "Open decisions",
recipe shape):

- **Steps are commands.** Each step wraps one command in exactly the shape of the element's command
  union, so a recipe is still the same JSON as a command, and nothing new is invented for what a
  step does. Version 1 accepts two commands: `algo.run` (shipped today as `AlgorithmRunCommand`,
  `graphty-element/src/session/planning.ts`) and `layout.set` (designed in section 4.11.1). Other
  commands are added in later versions as the element implements them.
- **Requirements are declared.** A recipe states the attributes and extensions it needs, so that
  applying it to new data is a binding step with a report rather than a replay that fails halfway.
  A binding shape published without measurement levels and weight roles could not be given them
  later without guessing for every published recipe; that is why they are here from version 1.
- **Style, views and notes are sibling documents**, not recipe parts. "A recipe and a style in one
  file" is an envelope holding both (envelope.md). A recipe's steps may still ask for the
  element's suggested colouring of a run (`style` on `algo.run`).
- **Whole-session replay is not a recipe.** Replaying imports, selections and camera moves is the
  journal's job and stays in the element API design; it is not a file format that communities
  publish.

## Data model

```ts
interface Recipe {
  kind: "graphty-recipe";
  version: 1;
  id: string;                    // stable identity of this recipe, across its versions
  recipeVersion?: string;        // the author's version of it; semantic versioning RECOMMENDED
  name: string;
  description?: string;
  namespace?: string;            // preferred namespace for its run ids; ^[a-z][a-z0-9-]*$, <= 32
  source?: string;               // canonical URL; informational, never fetched automatically
  authors?: { name: string; url?: string }[];
  license?: string;              // an SPDX identifier RECOMMENDED
  generator?: { name: string; version: string };
  requires?: {
    attributes?: AttributeSlot[];
    arguments?: ArgumentSlot[];
    extensions?: ExtensionRequirement[];
  };
  steps: Step[];                 // run in order
  overview?: { readings: string[] };
  extensions?: Record<string, unknown>;
}

interface AttributeSlot {
  slot: string;                  // ^[a-z][a-z0-9-]*$, unique among slots
  element: "node" | "edge";
  name: string;                  // the attribute name the recipe was written against
  nameHints?: string[];          // other names that mean the same thing
  level?: "categorical" | "ordinal" | "quantitative" | "temporal" | "identifier";
  role?: string;                 // a graph-format ColumnRole
  weightRole?: "distance" | "similarity" | "capacity";
  signed?: boolean;
  optional?: boolean;            // default false
  description?: string;
}

interface ArgumentSlot {
  slot: string;
  type: "node-id" | "node-set" | "number" | "string";
  default?: unknown;
  description?: string;
}

interface ExtensionRequirement {
  kind: "algorithm" | "layout" | "palette" | "camera" | "format";
  key: string;                   // the catalogue key
  package?: string;              // the npm package that provided it when authored
  version?: string;              // that package's version when authored
}

interface Step {
  id: string;                    // unique in the recipe
  description?: string;          // why this step is here; shown in the methods text
  command: AlgorithmRunCommand | LayoutSetCommand;
  extensions?: Record<string, unknown>;
}

interface AlgorithmRunCommand {  // the shipped command, plus the designed `style`
  op: "algo.run";
  algorithm: string;             // catalogue key
  params?: Record<string, unknown>;
  scope?: RecipeScope;           // default "visible"
  seed?: number;
  sample?: number;
  exact?: boolean;
  as: string;                    // REQUIRED in a recipe; ^[a-z][a-z0-9_-]*$
  style?: boolean | { size?: boolean | [number, number] };  // default true
}

interface LayoutSetCommand {     // the designed command, plus seed and dimension
  op: "layout.set";
  id: string;                    // layout catalogue key
  params?: Record<string, unknown>;
  scope?: RecipeScope;
  seed?: number;
  dimension?: 2 | 3;
  start?: "current" | "fresh" | "positions";   // default "fresh"
}

type RecipeScope =
  | "visible" | "graph" | "selection" | "largest-component"
  | { where: string }            // a JMESPath predicate
  | { define: SetDefinition };   // a rule set only; see "Scopes"
```

### Steps

1. Steps run in document order. A step starts after the step before it has finished or been
   skipped.
2. `as` is REQUIRED on every `algo.run` step. A derived run id is a function of the algorithm and
   the scope on the authoring session, so a later step or a style that referred to one would
   resolve differently on new data (`graphty-element/src/session/runs/runId.ts`). A step without
   `as` is skipped with `E_UNSTABLE_RUN_ID`.
3. `params` are validated against the algorithm's own option descriptors
   (`OptionDescriptor`, published in the element's catalogue): unknown names are refused with
   `E_UNKNOWN_OPTION`, values out of range with `E_OPTION_RANGE`, and omitted options take the
   descriptor's default. The recipe carries no schema of its own for parameters.
4. `style` has the meaning of `RunStyle` (`graphty-element/src/session/runs/types.ts`): by default
   the element adds the colouring the result shape suggests, scoped to the elements carrying the
   result. A recipe that travels with its own style document SHOULD set `style: false` on the
   steps that style paints, so the two do not stack.
5. A later step may read an earlier step's result, through `results.<as>.<field>` in a `where`
   scope or a rule, or through a parameter. A step whose input names a run from a skipped step is
   skipped with a reason naming that step.

### Scopes

A recipe may scope a step to the visible graph, the whole graph, the reader's current selection,
the largest component, a predicate, or a rule set. It MUST NOT name particular elements: a scope
`{ nodes: [...] }`, a scope `{ set: id }` naming a kept set, and a `define` holding a fixed set
all name elements of the authoring data and mean nothing on new data (the design studio's rule that
a recipe "drops what only its data can mean"). Such a step is skipped with `E_BAD_COMMAND`.
Element-specific inputs, such as the source node of a shortest path, are arguments (below).

### Attribute slots

An attribute slot declares one attribute the recipe reads, as it was named on the authoring data
(`name`), with what it must measure.

**Binding.** When a recipe is applied, the applier binds each slot to an attribute of the current
graph:

1. An explicit binding the caller passes (`{ slot: attributeName }`) wins.
2. Otherwise the attribute whose name equals `name`, else one of `nameHints`, compared without
   regard to case, on the slot's element kind.
3. A candidate whose declared measurement level or weight role (from the data plan or the import)
   contradicts the slot's is not bound, and the report says why. A slot with a `weightRole` MUST be
   confirmed by the caller unless the graph declares the same role on the bound attribute, because
   binding a distance where a similarity was meant silently inverts the result (the design
   studio's rule "always confirms a weight slot").
4. A slot that binds nothing is unbound. Every step that reads it is skipped, and reported with the
   slot's `description`. An `optional` slot that binds nothing skips no step: the steps run without
   it and the parameters that named it take their defaults.

**Rewriting.** Binding a slot to a differently named attribute rewrites the recipe before it runs,
and rewrites the style member of the same envelope:

- every field path whose first two segments are `data` and the slot's `name`, in a `where`
  predicate, a rule, or a style layer's selector or binding, is rewritten to the bound name;
- every parameter whose option descriptor has type `attribute` and whose value equals the slot's
  `name` is rewritten to the bound name.

The applier MUST rewrite parsed expressions (the field nodes of the JMESPath tree), never the text,
so a name that happens to occur inside a string literal is untouched.

### Argument slots

An argument is a value the caller supplies when applying: a source node, a set of seed nodes, a
threshold. A parameter refers to one by the whole-value reference `{ "$argument": "<slot>" }`.
The applier replaces that JSON value with the argument, and never splices an argument into a
string. An argument with no value and no `default` leaves every step that references it waiting,
reported as needing input; such a step is not an error.

### Extension requirements

`requires.extensions` lists every catalogue key the steps name that the element does not ship, and
MAY list built-in keys with the version they were authored with. A writer MUST list every
non-built-in key a step names.

- A key this installation has not registered skips every step that names it, with
  `E_UNKNOWN_ALGORITHM` or `E_UNKNOWN_LAYOUT`, and the report names `package` and `version` so a
  person knows what to install. A document never installs anything.
- A key that is registered by a different package version than the recipe records runs, and the
  report states both versions. Refusing on a version difference would break every published recipe
  at each patch release; the run record already stores the versions that produced each result
  (`EngineVersions`, including `plugins`), which is what a methods text cites.

### Identity and namespacing

`id` identifies the recipe across its versions; `recipeVersion` identifies one version. A
reverse-domain id (`org.example-lab.hub-genes`) or a URL is RECOMMENDED so two authors do not
collide. `source`, when present, is where the canonical copy lives. It is recorded on every
application so that a newer version can be offered later, and it is never fetched without the
caller's consent.

Applying a recipe namespaces its run ids so that two recipes, or one recipe applied twice, never
collide (the design studio's door 19 recommendation, undecided):

1. The applier chooses a namespace: the caller's, else the recipe's `namespace`, else a slug of the
   last segment of `id`. If that namespace is already used by a different application in the
   session, `-2`, `-3` and so on is appended.
2. Every `as` becomes `<namespace>__<as>`. The separator is two underscores because a dot cannot
   appear in a run id (`RUN_ID_PATTERN`) and would read as a path separator inside
   `results.<id>.<field>`, and because a namespace cannot contain an underscore.
3. Every `results.<as>` path in the recipe and in the style member of the same envelope is
   rewritten to the namespaced id, by the same parsed-expression rule as attribute rewriting.
4. Applying the same `id` and `recipeVersion` again to the same session offers to revise the
   earlier application instead of adding a second one.

### The overview recipe

A recipe MAY carry `overview.readings`: the names of the graph readings (the rows a statistics
panel shows: counts, density, components, degree distribution) that characterize a graph for this
domain. When a recipe is used as the overview, only these readings are computed at load, and only
those the element maintains at a cost linear in nodes plus edges; every other reading is listed as
not computed, with its cost, until asked for. Its steps do not run at load.

graphty-element ships a recipe named "General" as its default overview; a consumer can configure a
different default; a project can name its own, which wins (the design studio's door 33, and
`design/ui/framework/conceptual-model.md` 8.1, undecided). "Flows" and "Groups" are RECOMMENDED as
published example recipes. The names a reading may take are graphty-element's published statistic
names; an unknown one is reported and skipped.

## Consent

1. Applying a recipe binds its slots and plans its steps. It MUST NOT start a run until the caller
   asks it to run (an explicit option of the applier, or a separate call). Until then every step is
   reported in `needsRerun` with the element's cost estimate for it on the current graph.
2. The element's cost cap applies to each step as it would to the same call made by hand. A recipe
   cannot raise it. A step with `exact: true` above the cap fails, and later steps that depend on
   it are skipped.
3. A recipe opened as part of a data load (the successor of the 1.x template's `data.algorithms`)
   is still a recipe: the caller that loads it has asked for it, and the report lists what ran.
4. Cancelling a running recipe keeps the results of the steps that finished, as `runs.batch` does
   today (`BatchResult`, `graphty-element/src/session/runs/types.ts`).

## Producing a recipe

1. `journal.export()` (element API design 4.11.2) SHOULD produce a recipe from the `algo.run` and
   `layout.set` entries of a session. Every run in it MUST have an author-assigned id; the exporter
   MAY mint one (the algorithm key, then `-2`, `-3`) and MUST then rewrite every reference to the
   old id in the exported style member.
2. The writer MUST fill `requires.attributes` with every `data.<name>` the steps read and SHOULD
   record each attribute's measurement level and weight role from the session.
3. A generated script in JavaScript or Python (asked for by
   `design/designloom/capabilities/analysis-history.yaml`) is a presentation of a recipe, not a
   recipe format; the recipe is the JSON.

## Security

A recipe spends compute and names extensions, so it is the document an attacker would use.

1. Nothing in a recipe is executed as code. Parameters are JSON values passed to registered
   algorithms, which validate them against their descriptors. Predicates are evaluated by the
   element's JMESPath interpreter.
2. A recipe never names code to load, a package to install, or a URL to fetch as part of running.
   `source` and `authors[].url` are shown to people; they are never dereferenced by the applier.
3. Argument substitution replaces whole JSON values only.
4. Cost is bounded by the consent rule and the cost cap. A reader SHOULD also bound the number of
   steps (RECOMMENDED 1000, the journal's cap).
5. Data-source queries and joins, which the design studio's recipe carries, are not in version 1.
   When they are added, the rule is the design studio's: a recipe never contacts a host before the
   binding step names the host and the caller confirms, whether the recipe arrived as a file or a
   link.
6. A recipe's integrity cannot be verified in version 1. An applier SHOULD record the SHA-256 of
   the recipe's canonical form (RFC 8785) on the application record, so provenance can be checked
   later against a published copy.

## Conformance

| Input | Required result |
|---|---|
| an `algo.run` step without `as` | step skipped, `E_UNSTABLE_RUN_ID` |
| a step with `op: "data.import"` | step skipped (unknown command in version 1), others run |
| a step scoped `{ "nodes": ["TP53"] }` | step skipped, `E_BAD_COMMAND` ("names elements of the authoring data") |
| algorithm key `org.example:motif-census`, not registered | that step and the steps depending on it skipped with `E_UNKNOWN_ALGORITHM`; report names the package and version from `requires.extensions` |
| slot `weight` (edge, `weightRole: "similarity"`) and the graph's only numeric edge attribute declared `distance` | slot unbound; dependent steps skipped; report says the roles contradict |
| slot `expr` with `name: "logFC"`, `nameHints: ["log2FoldChange"]`; graph has `log2FoldChange` | bound; every `data.logFC` in steps and in the envelope's style rewritten to `data.log2FoldChange` |
| a string literal `'logFC'` inside a predicate | not rewritten |
| applied twice to one session | second application offered as a revision; if applied anyway, run ids `hubs__...` and `hubs-2__...` |
| opened with no instruction to run | no run starts; every step in `needsRerun` with an estimate |

## Worked examples

### Hub gene ranking

`W23.yaml` (Hub Gene Identification and Ranking): degree, betweenness and PageRank on a weighted
co-expression network, then the top hubs within the largest component.

```json
{
  "kind": "graphty-recipe",
  "version": 1,
  "id": "org.example-lab.hub-genes",
  "recipeVersion": "1.2.0",
  "name": "Hub genes",
  "description": "Ranks genes by connectivity and by position between modules.",
  "namespace": "hubs",
  "license": "CC-BY-4.0",
  "authors": [{ "name": "Example Lab" }],
  "requires": {
    "attributes": [
      { "slot": "weight", "element": "edge", "name": "weight", "nameHints": ["combined_score", "score"],
        "level": "quantitative", "weightRole": "similarity",
        "description": "Interaction confidence or co-expression strength; larger is closer" }
    ]
  },
  "steps": [
    { "id": "degree", "command": { "op": "algo.run", "algorithm": "degree", "as": "degree", "style": false } },
    { "id": "pagerank",
      "description": "Weighted PageRank, damping 0.85, as in the lab's methods section.",
      "command": { "op": "algo.run", "algorithm": "pagerank", "as": "pagerank",
                   "params": { "dampingFactor": 0.85, "weight": "weight" },
                   "scope": "largest-component", "style": { "size": true } } },
    { "id": "betweenness",
      "command": { "op": "algo.run", "algorithm": "betweenness", "as": "between",
                   "scope": "largest-component", "seed": 7, "style": false } },
    { "id": "layout",
      "command": { "op": "layout.set", "id": "forceatlas2", "seed": 7, "dimension": 2 } }
  ]
}
```

Applied to a STRING network whose weight column is `combined_score`, the `weight` slot binds by
its name hint, the caller confirms the weight role, the `pagerank` step's `weight` parameter is
rewritten to `combined_score`, and the run ids become `hubs__degree`, `hubs__pagerank` and
`hubs__between`.

### A shortest-path recipe with an argument

`W09.yaml` (criminal network analysis): the shortest route between two named persons.

```json
{
  "kind": "graphty-recipe",
  "version": 1,
  "id": "org.example.link-chart.path",
  "name": "Route between two subjects",
  "requires": {
    "arguments": [
      { "slot": "from", "type": "node-id", "description": "First subject" },
      { "slot": "to", "type": "node-id", "description": "Second subject" }
    ]
  },
  "steps": [
    { "id": "route",
      "command": { "op": "algo.run", "algorithm": "dijkstra", "as": "route",
                   "params": { "source": { "$argument": "from" }, "target": { "$argument": "to" } } } }
  ]
}
```

### An overview recipe for flow-oriented domains

The owner's "some domains care about flows" (2026-09-27), as an overview: readings only, no steps
at load.

```json
{
  "kind": "graphty-recipe",
  "version": 1,
  "id": "app.graphty.overview.flows",
  "name": "Flows",
  "overview": { "readings": ["nodeCount", "edgeCount", "directed", "components", "selfLoops", "degreeDistribution"] },
  "steps": [
    { "id": "strong", "command": { "op": "algo.run", "algorithm": "scc", "as": "scc" } }
  ]
}
```
