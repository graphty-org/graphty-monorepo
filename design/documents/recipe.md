# Recipe

`kind: "graphty-recipe"`, version 1. Schema: [recipe.schema.json](recipe.schema.json) (normative
for what a writer produces). Shared conventions are in [README.md](README.md).

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
  `graphty-element/src/session/planning.ts`) and `layout.set` (designed in section 4.11.1).
- **Requirements are declared, and referred to explicitly.** A recipe states the attributes,
  arguments and extensions it needs, and a step refers to each by an explicit whole-value
  reference (`$attribute`, `$argument`, `$result`), so applying it to new data is a binding step
  with a report rather than a replay that fails halfway, and no value is re-interpreted by
  coincidence.
- **Style, views and notes are sibling documents**, not recipe parts. "A recipe and a style in one
  file" is an envelope holding both (envelope.md). A recipe's steps may still ask for the
  element's suggested colouring of a run (`style` on `algo.run`).
- **Whole-session replay is not a recipe.** Replaying imports, selections and camera moves is the
  journal's job and stays in the element API design; it is not a file format that communities
  publish.

### What version 1 can and cannot express

A version 1 recipe holds algorithm runs and layouts, each scoped. For the genomics and analysis
workflows that means:

- It **can** express: centralities, communities, components, paths and layouts with every
  parameter, seed, sampling and precision; a step scoped to the largest component, to a predicate
  over data or earlier results, to the neighbourhood of a supplied node or to a time window; a
  later step reading an earlier step's result.
- It **cannot** yet express, and reserves a step type for each (a later minor version adds them;
  an old reader refuses rather than skips them, see "Steps" rule 7): fetching interactions from a
  database with species and cutoff (`data.query`, behind the consent rule); keeping the largest
  component or a filtered subgraph as the working network (`graph.subgraph`); filtering by a
  predicate so later steps and the view see less (`graph.filter`); computing an attribute from a
  formula such as a combined score (`attribute.compute`); a randomized null model
  (`graph.randomize`); enrichment against a gene-set file (a later `algo.run` of an enrichment
  algorithm with a file argument). Until then those settings travel in the data member's
  `provenance` and in `description` text, and a methods section cannot cite them from the file.

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
  source?: string;               // canonical https: URL; informational, never fetched automatically
  // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
  generator?: { name: string; version: string };
  features?: string[];           // must-understand features (README, "Versioning")
  engine?: EngineVersions;       // the versions it was authored with; see "Extension requirements"
  requires?: {
    attributes?: AttributeSlot[];
    arguments?: ArgumentSlot[];
    extensions?: ExtensionRequirement[];
  };
  steps: Step[];                 // run in order
  overview?: { readings: string[] };
  application?: Application;     // written only by a session writer; see "Saving an applied recipe"
  extensions?: Record<string, unknown>;
}

interface AttributeSlot {
  slot: string;                  // ^[a-z][a-z0-9-]*$, unique among slots
  element: "node" | "edge";
  name: string;                  // the attribute name the recipe was written against (a field path)
  nameHints?: string[];          // other names that mean the same thing, in order of preference
  level?: "categorical" | "ordinal" | "quantitative" | "temporal" | "identifier";
  role?: string;                 // a graph-format ColumnRole; "weight" for the weight slot
  weightRole?: "distance" | "similarity" | "capacity";
  signed?: boolean;
  optional?: boolean;            // default false
  description?: string;
}

interface ArgumentSlot {
  slot: string;
  type: "node-id" | "node-set" | "number" | "integer" | "string" | "boolean" | "enum" | "date";
  choices?: (string | number)[]; // for enum
  minimum?: number;              // for number, integer, date (as epoch milliseconds)
  maximum?: number;
  default?: unknown;             // MUST NOT be an element id in a document written to share
  description?: string;
}

interface ExtensionRequirement {
  kind: "algorithm" | "layout" | "palette" | "camera" | "format";
  key: string;                   // the catalogue key
  package?: string;              // the npm package that provided it when authored (a claim)
  version?: string;              // that package's version when authored (a claim)
}

interface EngineVersions { element: string; algorithms?: string; layout?: string; plugins?: Record<string, string> }

interface Step {
  id: string;                    // unique in the recipe
  description?: string;          // why this step is here; shown in the methods text
  features?: string[];
  command: AlgorithmRunCommand | LayoutSetCommand;
  extensions?: Record<string, unknown>;
}

interface AlgorithmRunCommand {  // the shipped command, plus the designed `style` and `precision`
  op: "algo.run";
  algorithm: string;             // current catalogue key
  params?: Record<string, Value>;
  scope?: RecipeScope;           // default "graph"
  seed?: number | ArgumentRef;
  sample?: number | ArgumentRef;
  exact?: boolean;
  precision?: "f64";             // require double precision; see "Steps" rule 6
  as: string;                    // REQUIRED in a recipe; ^[a-z][a-z0-9_-]*$ without "__"
  style?: boolean | { size?: boolean | [number, number] };  // default true
}

interface LayoutSetCommand {     // the designed command, plus seed and dimension
  op: "layout.set";
  id: string;                    // layout catalogue key
  params?: Record<string, Value>;
  scope?: RecipeScope;           // default "graph"
  seed?: number | ArgumentRef;
  dimension?: 2 | 3;
  start?: "current" | "fresh" | "positions";   // default "fresh"
}

type Value = unknown | ArgumentRef | AttributeRef | ResultRef;   // a JSON value, or one whole reference
interface ArgumentRef { $argument: string }        // an argument slot
interface AttributeRef { $attribute: string }      // an attribute slot: replaced by the bound attribute name
interface ResultRef { $result: string; field?: string }   // an earlier step's `as`, and a field of it

type RecipeScope =
  | "graph" | "visible" | "largest-component"
  | { where: string; args?: Record<string, ArgumentRef | unknown> }   // JMESPath predicate
  | { neighbourhood: { of: ArgumentRef | ResultRef; hops: number | ArgumentRef } }
  | { window: { path: string; from?: ArgumentRef | string | number; to?: ArgumentRef | string | number } }
  | { define: SetDefinition };   // a rule set only; see "Scopes"
```

### Steps

1. Steps run in document order. A step starts after the step before it has finished or been
   skipped.
2. `as` is REQUIRED on every `algo.run` step. A derived run id is a function of the algorithm and
   the scope on the authoring session, so a later step or a style that referred to one would
   resolve differently on new data (`graphty-element/src/session/runs/runId.ts`). A step without
   `as` is skipped with `E_UNSTABLE_RUN_ID`. `as` MUST NOT contain `__`, the namespace separator.
3. `params` are validated against the algorithm's own option descriptors (`OptionDescriptor`,
   published in the element's catalogue): unknown names are refused with `E_UNKNOWN_OPTION`,
   values out of range with `E_OPTION_RANGE`, and omitted options take the descriptor's default.
   Because a default can change between releases, a writer MUST write every option with its
   resolved value, defaults included (see "Producing a recipe"); an omitted option in a
   hand-written recipe is legal and is reported with its default in the run record.
4. `style` has the meaning of `RunStyle` (`graphty-element/src/session/runs/types.ts`): by default
   the element adds the colouring the result shape suggests, scoped to the elements carrying the
   result. A writer that also writes the style member of the same envelope MUST set `style: false`
   on every step whose suggested layers it writes there, so reopening does not add them twice; an
   applier also skips a suggested layer when the style member already holds a layer with
   `source: { by: "run" }` for that run id, and reports it.
5. A later step reads an earlier step's result through `results.<as>.<field>` in a `where` scope,
   or through a whole-value `{ "$result": "<as>", "field": "<field>" }` in `params` (an option of
   type `partition` or `node-set`, such as modularity over a community result) or in a scope. A
   step whose input names a run from a skipped step is skipped with `E_DEPENDENCY_SKIPPED`,
   naming that step.
6. `exact: true` refuses to sample; `precision: "f64"` refuses to run in single precision
   (graphty-element runs on the GPU in f32 when a GPU is present). A step that cannot meet either
   fails with `E_OPTION_RANGE` or `E_PRECISION_UNAVAILABLE` rather than degrading, consistent with
   the repository's rule against silent fallback. Without them, planning states per step whether it
   will be exact or sampled and at which precision (`needsRerun`), and the run record records what
   happened.
7. A step whose `op` the reader does not know is skipped with `E_UNKNOWN_COMMAND`, **and so is
   every later step**, unless the caller explicitly agrees to continue. An unknown step type may be
   a filter or a subgraph that changes what every later step sees; skipping it alone and running
   the rest would report success on the wrong input.
8. A step with a reserved `op` (`graph.filter`, `graph.subgraph`, `attribute.compute`,
   `data.query`, `graph.randomize`) in a version 1 recipe is treated as rule 7 describes.

### Scopes

The default scope in a recipe is `"graph"`, so a replay never depends on what the reader happens to
have filtered. A recipe may also scope a step to the visible graph (reported in the binding report
with the filter that narrowed it, `caveats.filterScope`), the largest component, a predicate, the
neighbourhood of a supplied or computed node, a time window, or a rule set.

- `{ where, args }`: the predicate MAY reference an argument or a literal through a JMESPath raw
  literal named in `args` (`data.degree > $k`, with `args: { "k": { "$argument": "k" } }`). The
  applier substitutes the value as a literal node in the parsed expression tree, never into the
  text.
- `{ neighbourhood: { of, hops } }`: the nodes within `hops` of the node an argument or an earlier
  result names, the first step of an investigation around a flagged entity.
- `{ window: { path, from, to } }`: the elements whose value at `path` (a timestamp) lies in the
  window.

A recipe MUST NOT name particular elements: a scope `{ nodes: [...] }`, a scope `{ set: id }` naming
a kept set, and a `define` holding a fixed set all name elements of the authoring data and mean
nothing on new data (the design studio's rule that a recipe "drops what only its data can mean").
`"selection"` is not a recipe scope either: it replays against screen state the recipe never
records. Such a step is skipped with `E_BAD_COMMAND`. An element-specific input, including "the
current selection", is a `node-set` or `node-id` argument, which the applier asks for and the run
record keeps.

### Attribute slots

An attribute slot declares one attribute the recipe reads, as it was named on the authoring data
(`name`), with what it must measure.

**Binding.** When a recipe is applied, the applier binds each slot to an attribute of the current
graph, on the slot's element kind, by the first rule that yields exactly one candidate:

1. an explicit binding the caller passes (`{ slot: attributeName }`);
2. a binding recorded for the same data source in the recipe's `application` block
   (envelope.md, "Holding a starting point for the next import");
3. an attribute whose name equals `name` exactly;
4. an attribute whose name equals `name` without regard to case;
5. the `nameHints` in array order, each first exactly, then without regard to case.

If more than one candidate ties at the same rule, the slot is unbound and the report lists the
candidates; nothing is picked silently. A candidate is rejected, with the reason reported, when its
declared measurement level or weight role (from the data plan or the import) contradicts the slot's
(`E_ROLE_CONFLICT`), or when the slot is `quantitative` and the attribute's values are not numbers,
whether or not a level was declared.

**Confirmation.** A slot with a `weightRole` MUST be confirmed by the caller unless the graph
declares the same role on the bound attribute, because binding a distance where a similarity was
meant silently inverts the result (the design studio's rule "always confirms a weight slot"). An
unconfirmed slot leaves its steps waiting with `E_CONFIRMATION_REQUIRED`.

**Unbound.** A slot that binds nothing is unbound (`E_UNBOUND_SLOT`). Every step that reads it is
skipped, and reported with the slot's `description`. An `optional` slot that binds nothing skips no
step: the steps run without it and the parameters that named it take their defaults.

**Rewriting.** A slot is referred to explicitly: in `params` by the whole value
`{ "$attribute": "<slot>" }`, which the applier replaces with the bound attribute's name; in
predicates and in the style member of the same envelope by the field path `data.<name>`, which is
rewritten to the bound name. The applier MUST rewrite parsed expressions (the field nodes of the
JMESPath tree, whatever their quoting), never the text, so a name that happens to occur inside a
string literal is untouched, and MUST print the rewritten path by README "Paths" rule 4. A
parameter holding a bare string is a literal and is never rewritten.

**Style documents.** A style document MAY declare the same `requires.attributes` slots
(style.md); the same binding rules apply when it is applied on its own.

### Weights

graphty-element's algorithms read one weight column: the snapshot carries the weight the element
resolved at import (`edgeWeightPath`, or the attribute with role `weight`), and PageRank's `weight`
option only switches a weighted run on (`PageRankAlgorithm.ts`: "ONE weight column, so naming an
attribute is the same request as asking for a weighted run"). The migration's snapshot accessor
for plugins keeps this model. So:

1. A slot with `role: "weight"` binds to the graph's weight column, not to a parameter value. When
   the attribute it binds to is not the weight column the graph was imported with, the step waits
   and the report says a re-import is needed (`needsReimport`), naming the attribute; it never runs
   weighted by the wrong column or silently unweighted.
2. `{ "$attribute": "weight" }` in a weight option resolves to that attribute's name, which
   switches the weighted run on.
3. The applier compares the bound attribute's weight role with the meaning the algorithm reads
   (its option descriptor's declared meaning: PageRank, communities and centralities read a
   similarity, shortest paths and closeness a distance, flows a capacity). A mismatch skips the
   step with `E_WEIGHT_ROLE_MISMATCH`; version 1 never converts one into the other, because 1/w,
   1-w and -log w are different models and the choice is the author's. Declaring the expected
   meaning on each option descriptor is an element change this rule depends on.
4. The run record's `weight` records the attribute, the role and whether the reader confirmed it.

### Argument slots

An argument is a value the caller supplies when applying: a source node, a set of seed nodes, a
threshold, a date, a switch. A value refers to one by the whole-value reference
`{ "$argument": "<slot>" }`, allowed in `params`, `seed`, `sample` and the scope positions above.
The applier replaces that JSON value with the argument, checked against the slot's type, `choices`,
`minimum` and `maximum`, and never splices an argument into a string. An argument with no value and
no `default` leaves every step that references it waiting (`E_ARGUMENT_REQUIRED`); such a step is
not an error.

### Extension requirements

`requires.extensions` lists every catalogue key the steps name that the element does not ship. A
writer MUST list every non-built-in key a step names, and MUST write `engine` with the element,
algorithms and layout versions (so built-in keys, whose defaults and implementations change with
those packages, are pinned too).

- A key this installation has not registered skips every step that names it, with
  `E_UNKNOWN_ALGORITHM` or `E_UNKNOWN_LAYOUT`. The report repeats `package` and `version` labelled
  as the document's claim, never as an instruction to install. A document never installs anything.
- A `package` claim on a key in graphty-element's built-in namespace is ignored and reported.
- A key registered by a different package than the recipe names leaves its steps unbound until the
  caller confirms, because another package's code would run under the cited name.
- A key registered by the same package at a different version runs, and the report states both
  versions (`W_ENGINE_DIFFERS`). Refusing on a version difference would break every published
  recipe at each patch release; the run record stores the versions that produced each result.
- graphty-element's plugin registries replace an already-registered key by default
  (`catalog/pluginRegistry.ts`), so whichever plugin registered last is the one a recipe runs. This
  rule depends on an element change: registering a key that is already registered fails unless the
  caller asks to replace it.
- An extension requirement entry that fails its schema (an unknown `kind`) is itself the unit: it
  is ignored and reported, and a step naming that key is treated as naming an unregistered key.

### Identity and namespacing

`id` identifies the recipe across its versions; `recipeVersion` identifies one version, and **one
`id` and `recipeVersion` name one immutable content**: a fix is a new `recipeVersion`. A
reverse-domain id (`org.example-lab.hub-genes`) or an `https:` URL is RECOMMENDED so two authors do
not collide. `source`, when present, is where the canonical copy lives. It is recorded on every
application so that a newer version can be offered later, and it is never fetched without the
caller's consent.

Every run a recipe produces records the RFC 8785 SHA-256 digest of the recipe as applied
(envelope.md, "Run records"). An applier that meets the same `id` and `recipeVersion` with a
different digest than one already recorded in the session reports `E_RECIPE_DIGEST_MISMATCH`: two
different recipes claim one citation.

Applying a recipe namespaces its run ids so that two recipes, or one recipe applied twice, never
collide (the design studio's door 19 recommendation, undecided):

1. The applier chooses a namespace: one recorded in the recipe's `application` block, when it is
   free in the session; else the caller's; else the recipe's `namespace`; else a slug of the last
   segment of `id`. If that namespace is already used by a different application in the session,
   `-2`, `-3` and so on is appended.
2. Every `as` becomes `<namespace>__<as>`. The separator is two underscores because a dot cannot
   appear in a run id (`RUN_ID_PATTERN`) and would read as a path separator inside
   `results.<id>.<field>`, and because neither a namespace nor an `as` may contain `__`, so the
   split is unambiguous.
3. The applier rewrites, by the parsed-expression rule, every reference to an `as` in the recipe
   and in the style and annotations members of the same envelope: `results.<as>` paths in
   predicates, selectors and bindings; `{ "$result" }` references; a style layer's
   `source.runId`; a note's `run` target, `cites` and `results.<as>` quote paths.
4. A path that already names a namespaced run (`results.hubs__score`) whose namespace is not the
   one being applied is not rewritten and not bound: it is reported with `E_NAMESPACE_MISMATCH`, so
   a style saved from one application cannot silently paint from another.
5. **Applying the same recipe again.** The applier's `onRepeat` option decides what happens when a
   recipe with the same `id` was already applied in the session: `"refuse"` (the default, with
   `E_REPEAT_APPLICATION`), `"replace"` or `"add"`. `replace` keeps the earlier namespace,
   recomputes the runs in place, removes the style layers the earlier application added and
   re-binds any the caller kept, and keeps notes, which then cite the replaced runs. A different
   `recipeVersion` of the same `id` is offered as `replace` and reported as such. `add` is a
   second application with a fresh namespace.

### Saving an applied recipe

A recipe written from a session that applied it MUST round-trip: opening it and saving it again
yields the same recipe, run ids and paths.

1. Steps are written with the recipe's own `as`, never the namespaced run id, and the style and
   annotations members of the same envelope are written with the un-namespaced references.
2. The writer adds an `application` block:

```ts
interface Application {
  namespace: string;                              // the namespace used
  dataPlan?: string;                              // the data plan id it was bound under
  bindings: Record<string, { attribute: string; by: "explicit" | "recorded" | "name" | "hint"; hint?: number }>;
  confirmed: string[];                            // slots whose weight role the reader confirmed
  arguments?: Record<string, unknown>;            // the argument values used
  digest: string;                                 // sha256 of the recipe as applied, before binding
  appliedAt: string;                              // RFC 3339
}
```

3. A writer with `purpose: "share"` omits `application`: argument values may name elements.
4. A standalone style or annotations document saved from the session names runs by their
   namespaced ids, because it has no recipe beside it to rewrite from; applied on its own it binds
   to runs with exactly those ids.

### Reproducing

An applier option `reproduce: true` is for reproducing a published result rather than exploring:
before running, it compares each step's effective parameters (defaults filled in), engine versions,
precision and exactness with the run records the document carries (or the recipe's `engine` and
written parameters), and reports every difference per step (`W_PARAMETER_DIFFERS`,
`W_ENGINE_DIFFERS`). With `reproduce: "strict"`, a step with any difference is disabled instead of
run.

### The overview recipe

A recipe MAY carry `overview.readings`: the names of the graph readings that characterize a graph
for this domain. The names are graphty-element's published statistic names (`GraphStatistics`,
`graphty-element/src/session/statistics.ts`): `nodeCount`, `edgeCount`, `density`, `directedness`,
`weighted`, `selfLoopCount`, `repeatedEdgeCount`, `degreeRange`, `meanDegree`, `components`. An
unknown one is reported and skipped. When a recipe is used as the overview, only these readings are
computed at load, and only those the element maintains at a cost linear in nodes plus edges; every
other reading is listed as not computed, with its cost, until asked for.

An overview recipe's steps never run at load. They are offered as an ordinary recipe application,
under the consent rule, when the reader asks for them.

graphty-element ships a recipe named "General" as its default overview; a consumer can configure a
different default; a project can name its own, which wins (the design studio's door 33, and
`design/ui/framework/conceptual-model.md` 8.1, undecided). "Flows" and "Groups" are RECOMMENDED as
published example recipes.

## Consent

1. Applying a recipe binds its slots and plans its steps. It MUST NOT start a run or a layout until
   the caller asks it to run (an explicit option of the applier, or a separate call naming that
   recipe). Loading data is not such a request, and neither is opening an envelope or upgrading a
   1.x template: a recipe produced by upgrading a 1.x template's `data.algorithms` is listed in
   `needsRerun` and runs only on that explicit instruction. Until then every step is reported in
   `needsRerun` with the element's cost estimate for it on the current graph, and the report also
   states the total across all steps.
2. The element's cost cap applies to each step as it would to the same call made by hand. A recipe
   cannot raise it. A step with `exact: true` above the cap fails, and later steps that depend on
   it are skipped. Layouts are estimated too: every option descriptor that scales work (iterations,
   samples) MUST declare a maximum, and a value above it is refused with `E_OPTION_RANGE` (today
   ForceAtlas2's `maxIter` has none, which is an element defect this rule depends on).
3. The caller MAY set a total budget; a running recipe stops when it is spent, keeping the finished
   steps.
4. A reader MUST bound the number of steps (1000, the journal's cap).
5. Cancelling a running recipe keeps the results of the steps that finished, as `runs.batch` does
   today (`BatchResult`, `graphty-element/src/session/runs/types.ts`).

## The recipe binding report

The binding report (README) of a recipe carries a `recipe` section, so a UI or script can build the
confirmation prompt and tell "waiting for me" from "failed":

```ts
interface RecipeBinding {
  slots: { slot: string; boundTo: string | null; by?: "explicit" | "recorded" | "name" | "hint"; hintIndex?: number;
           candidates: string[]; rejected: { attribute: string; reason: string; code: GraphtyErrorCode }[] }[];
  needsConfirmation: { slot: string; attribute: string; role: "distance" | "similarity" | "capacity" }[];
  needsArgument: { slot: string; steps: string[] }[];
  namespace: string;
  steps: { step: string; state: "planned" | "waiting" | "skipped"; code?: GraphtyErrorCode;
           exact?: boolean; precision?: "f32" | "f64"; estimateSeconds?: number }[];
  totalEstimateSeconds: number;
}
```

## Producing a recipe

1. `journal.export()` (element API design 4.11.2) SHOULD produce a recipe from the `algo.run` and
   `layout.set` entries of a session. Every run in it MUST have an author-assigned id; the exporter
   MAY mint one (the algorithm key, then `-2`, `-3`) and MUST then rewrite every reference to the
   old id in the exported style member.
2. Every step MUST carry every option with its resolved value, defaults included, the effective
   `seed` of every algorithm or layout whose descriptor is marked stochastic or that was sampled,
   and `sample` when the run was sampled. `RunRecord.params` is already canonicalised.
3. The writer MUST fill `requires.attributes` with a slot for every attribute a step reads -- every
   `data.<name>` in a predicate and every option of type `attribute`, `partition` or `node-set` that
   names one -- and MUST write the reference as `$attribute`, recording each attribute's measurement
   level and weight role from the session.
4. When the session applied a recipe and the author adjusted it, the export keeps the original as
   `derivedFrom: { kind: "graphty-recipe", id, version, digest }`, and MUST give the result a new
   `id` or a new `recipeVersion`; it never reuses both.
5. A generated script in JavaScript or Python (asked for by
   `design/designloom/capabilities/analysis-history.yaml`) is a presentation of a recipe, not a
   recipe format; the recipe is the JSON.
6. **Methods text.** graphty-element renders a methods paragraph from the run records, one sentence
   per run: the algorithm (by its plain name and key), every parameter, the weight attribute and
   its role ("weighted by STRING combined_score, read as a similarity"), the scope with its node
   and edge counts, exact or sampled with the sample size and seed, precision, convergence and
   iterations, the engine and plugin versions, and the recipe's id, version and digest; each
   step's `description` is appended to its sentence.

## Security

A recipe spends compute and names extensions, so it is the document an attacker would use.

1. Nothing in a recipe is executed as code. Parameters are JSON values passed to registered
   algorithms, which validate them against their descriptors. Predicates are evaluated by the
   element's JMESPath interpreter under README's expression limits.
2. A recipe never names code to load, a package to install, or a URL to fetch as part of running.
   `source` and `authors[].url` MUST be `https:` URLs; they are shown to people and never
   dereferenced by the applier, and a renderer MUST NOT make a link of any other scheme.
3. Argument substitution replaces whole JSON values, or literal nodes of a parsed expression, only.
4. Cost is bounded by the consent rule, the cost cap, descriptor maxima and the step limit.
5. Data-source queries and joins, which the design studio's recipe carries, are not in version 1.
   When `data.query` is added, the rule is the design studio's: a recipe never contacts a host
   before the binding step names the host and the caller confirms, whether the recipe arrived as a
   file or a link.
6. A recipe's integrity is checked only by its digest (see "Identity and namespacing");
   signatures are an open decision.

## Conformance

| Input | Required result |
|---|---|
| an `algo.run` step without `as` | step skipped, `E_UNSTABLE_RUN_ID` |
| `as: "hubs__score"` | step skipped: `__` is reserved |
| a step with `op: "data.import"` | that step and every later step skipped with `E_UNKNOWN_COMMAND`, unless the caller agrees to continue |
| a step scoped `{ "nodes": ["TP53"] }` or `"selection"` | step skipped, `E_BAD_COMMAND` |
| a step with no `scope`, applied while a filter hides half the graph | runs on the whole graph |
| algorithm key `org.example:motif-census`, not registered | that step and the steps depending on it skipped with `E_UNKNOWN_ALGORITHM`; report shows the package and version as the document's claim |
| key `scc` (a 1.10 key) | resolves to `components` with `{ strength: "strong" }`; the report names the current key |
| slot `weight` (edge, `role: "weight"`, `weightRole: "similarity"`) and the graph's weight column declared `distance` | slot unbound, `E_ROLE_CONFLICT`; dependent steps skipped |
| slot `weight` bound to `combined_score`, but the graph was imported with weight column `weight` | step waits; `needsReimport` names `combined_score` |
| a similarity weight slot used by a shortest-path step | step skipped, `E_WEIGHT_ROLE_MISMATCH` |
| slot `expr` with `name: "logFC"`, `nameHints: ["log2FoldChange"]`; graph has `log2FoldChange` | bound by hint 0; every `data.logFC` in steps and in the envelope's style rewritten to `data.log2FoldChange` |
| a slot with hints `["combined_score", "score"]`; graph has both | bound to `combined_score` (hint order) |
| a slot whose name matches `Weight` and `weight` | exact-case `weight` wins; with only `Weight` and `WEIGHT`, unbound with both listed as candidates |
| a `quantitative` slot whose only candidate holds strings | unbound, `E_ROLE_CONFLICT` |
| a string literal `'logFC'` inside a predicate | not rewritten |
| `params: { "weight": "score" }` (a bare string) | a literal; never rewritten |
| `{ "$result": "modules", "field": "group" }` after namespace `hubs` | resolves to run `hubs__modules`; the step depends on the `modules` step |
| a style path `results.hubs__score.value` applied with namespace `hubs-2` | layer not bound, `E_NAMESPACE_MISMATCH` |
| applied twice to one session | refused with `E_REPEAT_APPLICATION` by default; with `onRepeat: "add"`, run ids `hubs__...` and `hubs-2__...` |
| saved as a project after applying, reopened, saved again | the same `as` values, paths and `application.namespace` |
| same `id` and `recipeVersion` as a recorded application, different digest | `E_RECIPE_DIGEST_MISMATCH` |
| opened with no instruction to run | no run starts; every step in `needsRerun` with an estimate and the total |
| `precision: "f64"` on a page that would run the algorithm on the GPU in f32 | runs on the CPU in f64 if the element can; otherwise fails with `E_PRECISION_UNAVAILABLE` |
| `layout.set` with `maxIter: 1e12` | refused, `E_OPTION_RANGE` |
| `authors: [{ "url": "javascript:alert(1)" }]` | fails the schema; never rendered as a link |

## Worked examples

### Hub gene ranking

`W23.yaml` (Hub Gene Identification and Ranking): degree, betweenness and PageRank on a weighted
co-expression network, over the largest component. The parameters are written in full, as a writer
writes them.

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
  "authors": [{ "name": "Example Lab", "url": "https://example.org/lab" }],
  "engine": { "element": "3.1.0", "algorithms": "2.1.0", "layout": "1.3.0" },
  "requires": {
    "attributes": [
      { "slot": "weight", "element": "edge", "name": "weight", "nameHints": ["combined_score", "score"],
        "level": "quantitative", "role": "weight", "weightRole": "similarity",
        "description": "Interaction confidence or co-expression strength; larger is closer" }
    ]
  },
  "steps": [
    { "id": "degree", "command": { "op": "algo.run", "algorithm": "degree", "as": "degree", "scope": "graph", "style": false } },
    { "id": "pagerank",
      "description": "Weighted PageRank, damping 0.85, as in the lab's methods section.",
      "command": { "op": "algo.run", "algorithm": "pagerank", "as": "pagerank",
                   "params": { "dampingFactor": 0.85, "maxIterations": 100, "tolerance": 0.000001,
                               "weight": { "$attribute": "weight" } },
                   "scope": "largest-component", "style": { "size": true } } },
    { "id": "betweenness",
      "command": { "op": "algo.run", "algorithm": "betweenness", "as": "between",
                   "scope": "largest-component", "seed": 7, "exact": true, "precision": "f64", "style": false } },
    { "id": "layout",
      "command": { "op": "layout.set", "id": "force", "seed": 7, "dimension": 2, "scope": "graph" } }
  ]
}
```

Applied to a STRING network imported with `combined_score` as its weight column, the `weight` slot
binds by its first name hint, the caller confirms the similarity role, the `pagerank` step's
`weight` parameter resolves to `combined_score`, and the run ids become `hubs__degree`,
`hubs__pagerank` and `hubs__between`.

### A shortest-path recipe with arguments

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
      "command": { "op": "algo.run", "algorithm": "shortest-path", "as": "route",
                   "params": { "source": { "$argument": "from" }, "target": { "$argument": "to" } } } }
  ]
}
```

### A triage recipe around a flagged account

`W06.yaml`: communities and betweenness on the two-hop neighbourhood of an alert, over the last 30
days' transactions.

```json
{
  "kind": "graphty-recipe",
  "version": 1,
  "id": "org.example.fraud.triage",
  "name": "Alert triage",
  "requires": {
    "arguments": [
      { "slot": "alert", "type": "node-id", "description": "The flagged account" },
      { "slot": "since", "type": "date", "description": "Start of the window" }
    ]
  },
  "steps": [
    { "id": "rings",
      "command": { "op": "algo.run", "algorithm": "louvain", "as": "rings", "seed": 1,
                   "scope": { "neighbourhood": { "of": { "$argument": "alert" }, "hops": 2 } } } },
    { "id": "brokers",
      "command": { "op": "algo.run", "algorithm": "betweenness", "as": "brokers",
                   "scope": { "window": { "path": "data.first_seen", "from": { "$argument": "since" } } } } }
  ]
}
```

### An overview recipe for flow-oriented domains

The owner's "some domains care about flows" (2026-09-27), as an overview: readings at load, and one
step offered on request.

```json
{
  "kind": "graphty-recipe",
  "version": 1,
  "id": "app.graphty.overview.flows",
  "name": "Flows",
  "overview": { "readings": ["nodeCount", "edgeCount", "directedness", "components", "selfLoopCount", "degreeRange"] },
  "steps": [
    { "id": "strong", "command": { "op": "algo.run", "algorithm": "components", "as": "strong",
                                   "params": { "strength": "strong" } } }
  ]
}
```
