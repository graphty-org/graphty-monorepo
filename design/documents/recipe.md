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

A recipe is the only document that starts algorithm runs and layouts. Opening one never starts a
run by itself (see "Consent").

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

- **Steps are built on commands.** Each step wraps one command whose `op` and members are the
  element's command union where it has them, so nothing new is invented for what a step does.
  Version 1 accepts two commands: `algo.run` and `layout.set`. The shipped `AlgorithmRunCommand`
  (`graphty-element/src/session/planning.ts`) has `algorithm`, `params`, `scope`, `seed`, `sample`,
  `exact` and `as`; `layout.set` is designed (element API design section 4.11.1) but not built. A
  recipe step is **not** yet a command the element accepts as it stands, and each difference is an
  element change this specification depends on: the designed `style` (it is on `RunSpec` today),
  `precision` and `defaults` members; argument references in `params`, `seed`, `sample` and scopes;
  and the `neighborhood` and `range` scope forms, which mirror the element's existing rule-tree
  leaves (`{ kind: "neighborhood", seeds, depth }`, `{ kind: "range", attribute, min, max }`) with
  the same member names.
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
  over data or earlier results, to the neighborhood of a supplied node or to a range of an
  attribute such as a time window; a later step reading an earlier step's result. It cannot name
  an algorithm graphty-element's catalogue does not have: MCL, the clustering the genomics
  tutorials use, is not in it, and `clustering-coefficient` is deprecated and does not run
  (`graphty-element/src/catalog/types.ts`), both gaps for the catalogue.
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
  recipeVersion?: string;        // REQUIRED with doi, citation or source, and in a share save; absent compares as "0"
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
  level?: "categorical" | "ordinal" | "quantitative" | "temporal" | "identifier";   // open
  role?: string;                 // a graph-format ColumnRole; "weight" or "capacity" for those slots
  weightRole?: "distance" | "similarity";   // open
  signed?: boolean;
  optional?: boolean;            // default false; an optional weight slot runs its steps unweighted
  description?: string;
  features?: string[];
}

interface ArgumentSlot {
  slot: string;
  type: "node-id" | "node-set" | "number" | "integer" | "string" | "boolean" | "enum" | "date";
  choices?: (string | number)[]; // for enum
  minimum?: number;              // for number, integer, date (as epoch milliseconds)
  maximum?: number;
  default?: unknown;             // MUST NOT be an element id in a document written to share
  description?: string;
  features?: string[];
}

interface ExtensionRequirement {
  kind: "algorithm" | "layout" | "palette" | "camera" | "format";
  key: string;                   // the catalogue key
  package?: string;              // the npm package that provided it when authored (a claim)
  version?: string;              // that package's version when authored (a claim)
}

// graphty-element's EngineVersions: plugins keyed by catalogue key, the value the plugin's own
// declared version, or null when it declares none
interface EngineVersions { element: string; algorithms: string; layout: string;
                           plugins?: Record<string, string | null>;
                           accelerator?: { package: string; version: string; backend?: string; adapter?: string } }

interface Step {
  id: string;                    // unique in the recipe
  description?: string;          // why this step is here; shown in the methods text
  features?: string[];
  command: AlgorithmRunCommand | LayoutSetCommand;
  extensions?: Record<string, unknown>;
}

interface AlgorithmRunCommand {  // the shipped command, plus the designed `style`, `precision`, `defaults`
  op: "algo.run";
  algorithm: string;             // current catalogue key
  params?: Record<string, Value>;     // the options the author chose
  defaults?: Record<string, unknown>; // the resolved defaults of every other option; see "Steps" rule 3
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
  defaults?: Record<string, unknown>;
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
  | "graph" | "largest-component"
  | { where: string; target?: "node" | "edge"; args?: Record<string, ArgumentRef | unknown> }
  | { neighborhood: { seeds: ArgumentRef | ResultRef; depth: number | ArgumentRef } }
  | { range: { attribute: string; min?: ArgumentRef | string | number; max?: ArgumentRef | string | number } }
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
   Because a default can change between releases, a writer MUST write the resolved value of every
   option the author did not set in `defaults` (see "Producing a recipe"). An unknown name in
   `defaults` is ignored and reported, not refused, so a recipe written by a release whose
   algorithm gained an option still runs one release earlier; `reproduce` compares `defaults` with
   the current defaults and reports every difference. An option in neither is legal in a
   hand-written recipe and is reported with its default in the run record.
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
   `data.query`, `graph.randomize`) in a version 1 recipe is treated as rule 7 describes. When
   `attribute.compute` arrives, its output columns are exported like result columns, with run
   records.
9. **Command members are closed.** The members of a `command` outside `params` and `defaults` are
   fixed per `op`. A step whose command has an unknown member is skipped with `E_UNKNOWN_OPTION`,
   suggesting the nearest known member (`"sed"` -> `seed`), **and so is every later step**, as rule
   7 says for an unknown `op`: `seed`, `exact`, `precision`, `sample` and `scope` decide the number,
   and a misspelling of one would otherwise run unseeded, sampled, in f32 or on the whole graph
   with nothing but a warning. A later minor version adds a command member only with a feature
   name.
10. **Ids are unique.** A step whose `id` or `as` repeats an earlier step's is skipped with
    `E_DUPLICATE_ID`, and so is every later step that reads it. JSON Schema cannot check this; the
    published validator does (README, "Which text is normative" rule 3).
11. **An empty scope is not a success.** A step whose scope resolves to no element is skipped with
    `E_EMPTY_SCOPE`, and the steps that read its result are skipped with `E_DEPENDENCY_SKIPPED`.

### Scopes

The default scope in a recipe is `"graph"`, so a replay never depends on what the reader happens to
have filtered. A recipe may also scope a step to the largest component, a predicate, the
neighborhood of a supplied or computed node, a range of an attribute, or a rule set.

- `"largest-component"`: the largest weakly connected component (on a directed graph as well); a
  tie between components of equal size is broken by the component holding the smallest node id,
  compared after id coercion (numbers before strings, strings by code point), so row order never
  decides it.
- `{ where, target, args }`: the elements for which the predicate holds. `target: "node"` (the
  default) selects nodes and keeps the edges induced between them; `target: "edge"` selects edges
  and keeps their end nodes. A step that needs both a node and an edge predicate (pathways with FDR
  below 0.01 joined by edges with similarity at least 0.375) writes the edge predicate over the
  nodes it keeps, or waits for `graph.filter`. The predicate MAY reference an argument through a
  name in `args` (`data.degree > $k`, with `args: { "k": { "$argument": "k" } }`). The applier
  substitutes the value as a literal node in the parsed expression tree, never into the text; the
  element's lexer refuses `$` today ("is not something a selector can contain", `predicate.ts`),
  so accepting argument names in a predicate is an element change.
- `{ neighborhood: { seeds, depth } }`: the nodes within `depth` hops of the nodes an argument or
  an earlier result names, the first step of an investigation around a flagged entity. The member
  names are the element's rule-tree leaf's.
- `{ range: { attribute, min, max } }`: the elements whose value of `attribute` (a column key, a
  timestamp for a time window) lies in the range, as the element's range leaf.

A recipe MUST NOT name particular elements: a scope `{ nodes: [...] }`, a scope `{ set: id }` naming
a kept set, and a `define` holding a fixed set all name elements of the authoring data and mean
nothing on new data (the design studio's rule that a recipe "drops what only its data can mean").
Nor may it depend on screen state the recipe never records: `"selection"` and `"visible"` are not
recipe scopes, because a replay against another reader's selection or filter would give different
numbers under the same citation. Such a step is skipped with `E_BAD_COMMAND`. An element-specific
input, including "the current selection", is a `node-set` or `node-id` argument, which the applier
asks for and the run record keeps; a filter is written as the `where` scope it stands for
("Producing a recipe" rule 1).

### Attribute slots

An attribute slot declares one attribute the recipe reads, as it was named on the authoring data
(`name`), with what it must measure.

**Binding.** When a recipe is applied, the applier binds each slot to an attribute of the current
graph, on the slot's element kind, by the first rule that yields exactly one candidate:

1. an explicit binding the caller passes (`{ slot: attributeName }`);
2. a binding graphty-element itself recorded for this recipe on data of the same shape ("Applying",
   "Recorded bindings") -- never one read from a file's `application` block, which is the
   document's claim and only pre-fills the caller's prompt;
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
step: the steps run without it and the parameters that named it take their defaults; an optional
weight slot runs its steps unweighted, and the run record says so.

**Undeclared attributes.** A `data.<name>` in a recipe predicate that no slot declares is treated as
an implicit slot of that exact name: it binds by exact name only, and otherwise is unbound with
`E_UNBOUND_SLOT` and its steps skipped, rather than evaluating to nothing and matching no element.

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
   and the report's `needsReimport` entry names the attribute and gives the `knownFields` the
   re-import should use (`{ edgeWeightPath: "<attribute>" }`); it never runs weighted by the wrong
   column or silently unweighted. The waiting application is held, as with `applyTo:
   "next-import"` (envelope.md), and re-bound when that import completes; it is not a repeat
   application.
2. `{ "$attribute": "weight" }` in a weight option resolves to that attribute's name, which
   switches the weighted run on.
3. The applier compares the bound attribute's weight role with the meaning the algorithm reads
   (its option descriptor's declared meaning: PageRank, communities and centralities read a
   similarity, shortest paths and closeness a distance). A mismatch skips the step with
   `E_WEIGHT_ROLE_MISMATCH`; the recipe never converts one into the other, because 1/w, 1-w and
   -log w are different models and the choice is the author's -- made once, in the data plan, with
   `derive` (data-plan.md). A signed weight (`signed: true`) given to an algorithm whose catalogue
   entry does not accept negative weights skips the step with `E_NEGATIVE_WEIGHT`. Declaring the
   expected meaning and negative-weight acceptance on each descriptor is an element change this
   rule depends on.
4. A flow step reads a `capacity` slot (`role: "capacity"`), bound to the graph's capacity-role
   column, not to the weight.
5. A writer MUST emit a weight slot for every step whose algorithm reads the weight column,
   whether or not an option names it (closeness reads it as a distance with no option at all), so
   the role check has something to compare on new data. The author MAY mark it `optional`.
6. The run record's `weight` records the attribute, the role and whether the reader confirmed it.

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
- **Version 1 cannot verify which package provides a key.** graphty-element's registries record no
  package identity (`register(entry, options)` in `graphty-element/src/catalog/pluginRegistry.ts`
  takes an entry whose id the plugin chooses), and a plugin's version is whatever its optional
  `static version` says (`EngineVersions.plugins`, keyed by catalogue key,
  `graphty-element/src/session/runs/types.ts`). So for a registered plugin key the report states
  three things side by side -- the key, the version the implementation declares (or "unversioned"),
  and the document's `package` and `version` claim -- and a differing version is reported with
  `W_ENGINE_DIFFERS`. It does not claim that the package matches. Refusing on a version difference
  would break every published recipe at each patch release; the run record stores what each result
  was computed with.
- The registries also replace an already-registered key by default, so whichever plugin registered
  last is the one a recipe runs under the cited name. Recording the providing package at
  registration, making a version mandatory for plugin algorithms and layouts, and refusing to
  re-register a key unless asked are element changes (open decision 35); a run of an unversioned
  plugin records `null` and the methods text says "unversioned".
- An extension requirement entry that fails its schema (an unknown `kind`) is itself the unit: it
  is ignored and reported, and a step naming that key is treated as naming an unregistered key.

### Identity and namespacing

`id` identifies the recipe across its versions; `recipeVersion` identifies one version, and **one
`id` and `recipeVersion` name one immutable content**: a fix is a new `recipeVersion`. A
reverse-domain id (`org.example-lab.hub-genes`) or an `https:` URL is RECOMMENDED so two authors do
not collide. `source`, when present, is where the canonical copy lives. It is recorded on every
application so that a newer version can be offered later, and it is never fetched without the
caller's consent.

`recipeVersion` is REQUIRED on a recipe that carries `doi`, `citation` or `source`, and on any recipe
written with `purpose: "share"`; a recipe without one compares as version `"0"`.

**The recipe digest.** Every run a recipe produces records the recipe's digest (envelope.md, "Run
records"): the RFC 8785 SHA-256 of an object holding exactly the recipe's `kind`, `version`, `id`,
`recipeVersion`, `features`, `requires`, `steps` and `overview`, as read from the file, before any
upgrade of an older major version and before binding, with every `description` and `extensions`
member removed at any depth inside them, and with unknown members inside `requires` and `steps`
kept (they may change what runs, and must then carry a feature). Everything else is not digested:
`name`, `description`, the shared metadata (`authors`, `license`, `citation`, `doi`, `derivedFrom`,
`handling`), `namespace`, `source`, `engine`, `generator`, `modifiedAt`, `application`,
`extensions`, `$schema` and unknown top-level members. So adding a DOI after acceptance, fixing a
typo in a description, or saving the recipe from a session (which adds `application`) leaves the
digest unchanged, and the digest printed in a methods section can be checked with graphty-element's
published `documentDigest` function (README, "Writer output form"). An applier that meets the same
`id` and `recipeVersion` with a different digest than one already recorded in the session reports
`E_RECIPE_DIGEST_MISMATCH`: two different recipes claim one citation.

Applying a recipe namespaces its run ids so that two recipes, or one recipe applied twice, never
collide (the design studio's door 19 recommendation, undecided):

1. The applier chooses a namespace: one recorded in the recipe's `application` block, when it is
   free in the session; else the caller's; else the recipe's `namespace`; else a slug of the last
   segment of `id`. If that namespace is already used by a different application in the session,
   `2`, `3` and so on is appended with no separator (`hubs2`), so a generated name survives R's and
   pandas' column-name sanitising.
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
   recipe with the same `id` was already applied in the session and ran at least one step:
   `"refuse"` (the default, with `E_REPEAT_APPLICATION`), `"replace"` or `"add"`. An earlier
   application that ran no step (every step waiting on a slot, an argument or a confirmation) is not
   a repeat: applying again re-binds it, keeping its namespace. `replace` keeps the earlier
   namespace, recomputes the runs in place, removes the style layers the earlier application added
   and re-binds any the caller kept, and keeps notes. A note that targets or cites a replaced run
   is reported with `W_RUN_CHANGED` and shown as written against an earlier run, because its text
   may state a finding the new parameters no longer support (annotations.md, "Reading and
   applying" rule 11). A different `recipeVersion` of the same `id` follows the same default: it is
   refused with `E_REPEAT_APPLICATION`, and the report proposes `replace`, naming both versions.
   `add` is a second application with a fresh namespace.

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
  digest: string;                                 // the recipe digest ("Identity and namespacing")
  appliedAt: string;                              // RFC 3339
}
```

3. A writer with `purpose: "share"` omits `application`: argument values may name elements.
4. A standalone style or annotations document saved from the session names runs by their
   namespaced ids, because it has no recipe beside it to rewrite from; applied on its own it binds
   to runs with exactly those ids.
5. **A reader treats `application` as the file's claim.** On open it restores the recorded
   namespace (so run ids and paths round-trip) and shows the recorded bindings, confirmations and
   arguments as a proposal. It adopts bindings and confirmations as decided only when
   graphty-element's own record ("Applying", "Recorded bindings") says this installation made them
   for this recipe digest; otherwise every weight slot is confirmed again and every argument asked
   again. A file can therefore never pre-confirm a weight role or pre-fill an argument for its
   reader.

### Applying

The applier is designed as (open decision 34):

```ts
session.recipes.apply(doc: Recipe, options?: {
  bindings?: Record<string, string>;        // slot -> attribute
  confirm?: string[];                       // weight slots whose role the caller confirms
  arguments?: Record<string, unknown>;      // slot -> value
  namespace?: string;
  onRepeat?: "refuse" | "replace" | "add";  // default "refuse"
  reproduce?: boolean | "strict";
  run?: boolean;                            // default false: bind and plan only
  budget?: { totalSeconds?: number };       // default: the published total budget ("Consent")
  costCap?: number;                         // the same override a direct call accepts ("Consent")
}): Promise<RecipeApplication>

interface RecipeApplication {
  readonly report: BindingReport;           // with its `recipe` section
  bind(slot: string, attribute: string): Promise<BindingReport>;
  confirm(slot: string): Promise<BindingReport>;
  setArgument(slot: string, value: unknown): Promise<BindingReport>;
  run(options?: { budget?: { totalSeconds?: number }; costCap?: number }): Run<BindingReport>;
  cancel(): void;
}
```

A caller fixes an unbound slot, confirms a weight role or supplies an argument on the application
it already has; none of these is a second application, and none needs `onRepeat`. A third-party
page that applies a lab recipe weekly writes `apply(doc, { bindings: { weight: "strength" },
confirm: ["weight"], arguments, run: true })`.

**Recorded bindings.** When a caller binds or confirms, graphty-element records the decision in its
own storage, keyed by the recipe digest and the shape of the data: the data plan `id` when there is
one, otherwise the format plus the sorted list of columns the import used (`fieldsUsed` and the
attribute names). On the next application of the same recipe to data of the same shape, those
bindings and confirmations are reused (rule 2 of "Binding") and reported as `recorded`. So an
analyst who loads `edges.csv` every Monday confirms the similarity role once, not weekly -- without
saving a project, and without a file being able to claim the confirmation for him. The weekly loop
is: save the starting point once (`purpose: "share"`), then each week open it with `applyTo:
"next-import"` and load the new file.

### Reproducing

An applier option `reproduce: true` is for reproducing a published result rather than exploring:
before running, it compares each step's effective parameters (defaults filled in), engine versions
including the accelerator (package, version and backend), precision and exactness with the run
records the document carries (or the recipe's `engine`, `params` and `defaults`), and reports every
difference per step (`W_PARAMETER_DIFFERS`, `W_ENGINE_DIFFERS`). With `reproduce: "strict"`, a
step with any difference is disabled instead of run. When the document also carries stored
results, `reproduce` recomputes them and compares; until it has, stored results from a document
this session did not write are shown as unverified.

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
   cannot raise it; the caller applying it can, with the same override a direct call accepts
   (`costCap`), for example to run exact betweenness on a 200,000-node graph overnight, and the
   run record records the cap in force. A step with `exact: true` above the cap fails, and later
   steps that depend on it are skipped. Layouts are estimated too: every option descriptor that
   scales work (iterations, samples) MUST declare a maximum, and a value above it is refused with
   `E_OPTION_RANGE` (today ForceAtlas2's `maxIter` has none, which is an element defect this rule
   depends on).
3. **A total budget always applies.** graphty-element publishes a default total budget for one
   application (RECOMMENDED: ten times the per-step cost cap), and the caller MAY set another. A
   recipe whose planned total exceeds it does not start: it is reported with
   `E_BUDGET_EXCEEDED` and the estimate, and runs only on a second, explicit `run()` call made with
   that report in hand. `run: true` on open (envelope.md) runs only a recipe planned under the
   budget. A running recipe stops when the budget is spent, keeping the finished steps.
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
  needsConfirmation: { slot: string; attribute: string; role: "distance" | "similarity" | (string & {}) }[];
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
   old id in the exported style member. A run made while a filter narrowed the graph is written
   with the `where` scope the filter stands for (with slots for the attributes it reads); a filter
   that no predicate can express makes the export refuse that run, naming it, until `graph.filter`
   exists. A run on the current selection becomes a `node-set` argument.
2. Every step MUST carry the options the author set in `params` and the resolved value of every
   other option in `defaults`, the effective `seed` of every algorithm or layout whose descriptor
   is marked stochastic or that was sampled, and `sample` when the run was sampled.
   `RunRecord.params` is already canonicalised.
3. The writer MUST fill `requires.attributes` with a slot for every attribute a step reads -- every
   `data.<name>` in a predicate, every option of type `attribute`, `partition` or `node-set` that
   names one, and the weight column of every algorithm that reads it (see "Weights" rule 5) -- and
   MUST write the reference as `$attribute`, recording each attribute's measurement level and
   weight role from the session.
4. When the session applied a recipe and the author adjusted it, the export keeps the original as
   `derivedFrom: { kind: "graphty-recipe", id, version, digest }`, and MUST give the result a new
   `id` or a new `recipeVersion`; it never reuses both.
5. A generated script in JavaScript or Python (asked for by
   `design/designloom/capabilities/analysis-history.yaml`) is a presentation of a recipe, not a
   recipe format; the recipe is the JSON.
6. **Methods text.** graphty-element renders a methods paragraph from the project's records:
   - it opens with a data sentence from the data source and the import record (envelope.md): the
     source, release, query ("STRING v12.0, human, combined score at least 0.7"), retrieval date,
     the data plan's id and version, and the counts ("287 of 300 genes matched the expression
     table");
   - then one sentence per run and per layout: the algorithm (by its plain name and key, with its
     catalogue citation), every parameter, the weight attribute and its role ("weighted by STRING
     combined_score, read as a similarity"), how edge direction was treated, the scope with its
     node and edge counts and the filter predicate it ran under, exact or sampled with the sample
     size and seed, precision, convergence and iterations, the engine, accelerator and plugin
     versions ("unversioned" for a plugin that declares none), and the recipe's id, version, digest,
     authors and DOI or citation; each step's `description` is appended to its sentence as a
     quotation of the document, never in the element's own voice;
   - a stale run is not described as a result: its sentence says why it is stale, and a run record
     this session did not produce says "recorded by <document>";
   - it closes by saying which steps behind the conclusions were done outside any recipe (a
     filter the recipe could not express, a hand merge), when there were any.

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
| a step scoped `"visible"` | step skipped, `E_BAD_COMMAND` |
| a step command `{ "op": "algo.run", "algorithm": "betweenness", "as": "b", "sed": 7 }` | that step and every later step skipped, `E_UNKNOWN_OPTION`, suggesting `seed` |
| two steps with `as: "d"` | the second, and every step reading it, skipped with `E_DUPLICATE_ID` |
| `defaults: { "personalization": null }` on a reader whose PageRank has no such option | ignored and reported; the step runs |
| a `where` scope reading `data.padj` with no `padj` slot, on data whose column is `FDR` | implicit slot unbound, `E_UNBOUND_SLOT`; step skipped |
| a `where` scope that matches no node | step skipped, `E_EMPTY_SCOPE`; dependants skipped |
| `"largest-component"` on a graph with two 40-node components | the component holding the smallest node id |
| a closeness step written by a writer | a weight slot is written for it |
| a signed similarity weight used by PageRank, whose descriptor does not accept negative weights | step skipped, `E_NEGATIVE_WEIGHT` |
| the same recipe with and without `application`, `doi` or a changed `description` | the same digest |
| a recipe opened with `application.confirmed: ["weight"]`, written by another installation | the weight slot still asks for confirmation; the block is reported as the document's claim |
| a recipe applied, every step waiting on an unbound slot, applied again with `bindings` | re-bound; not refused as a repeat |
| v1.3.0 of a recipe applied after v1.2.0 ran, default options | refused, `E_REPEAT_APPLICATION`; the report proposes `replace` naming both versions |
| a recipe planned at twice the total budget, `run: true` | not started, `E_BUDGET_EXCEEDED` with the estimate |
| algorithm key `org.example:motif-census`, not registered | that step and the steps depending on it skipped with `E_UNKNOWN_ALGORITHM`; report shows the package and version as the document's claim |
| the same key registered by a plugin with no `static version` | runs; the report and the run record say "unversioned" beside the document's claim |
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
| a style path `results.hubs__score.value` applied with namespace `hubs2` | layer not bound, `E_NAMESPACE_MISMATCH` |
| applied twice to one session | refused with `E_REPEAT_APPLICATION` by default; with `onRepeat: "add"`, run ids `hubs__...` and `hubs2__...` |
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

`W06.yaml`: communities on the two-hop neighborhood of an alert, and betweenness over the
transactions since a date.

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
                   "scope": { "neighborhood": { "seeds": { "$argument": "alert" }, "depth": 2 } } } },
    { "id": "brokers",
      "command": { "op": "algo.run", "algorithm": "betweenness", "as": "brokers",
                   "scope": { "range": { "attribute": "first_seen", "min": { "$argument": "since" } } } } }
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
