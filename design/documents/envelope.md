# Envelope

`kind: "graphty-document"`, version 1. Schema: [envelope.schema.json](envelope.schema.json)
(normative for what a writer produces; it checks each member only as `{ kind, version }` and
dispatches to the member's own schema for version 1, so an envelope holding a newer member is
still a valid envelope). Shared conventions are in [README.md](README.md).

## Purpose

The envelope is "one file that combines any of the above" (the owner, 2026-09-19): any subset of a
data file, a data plan, a style, a recipe, a view document and annotations, plus the records of what
ran, in one file a person can hand to a colleague. Its combinations are the cases the owner and the
personas name:

| Members                                                                                                | What a person calls it                  | Who needs it                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| style                                                                                                  | a style file                            | a lab's publication look (`design/designloom/workflows/W20.yaml`)                                                                                                                                                                                                                                                                                                                    |
| recipe + style                                                                                         | a starting point                        | "communities share starting points without sharing their data" (the owner, 2026-09-27)                                                                                                                                                                                                                                                                                               |
| recipe + style + view                                                                                  | a workspace                             | a team's standard investigation layout (`W06.yaml`)                                                                                                                                                                                                                                                                                                                                  |
| data + data plan                                                                                       | a dataset with its reading instructions | data import and validation (`W18.yaml`)                                                                                                                                                                                                                                                                                                                                              |
| data + annotations                                                                                     | shared findings on shared data          | two investigators on one case (`W09.yaml`)                                                                                                                                                                                                                                                                                                                                           |
| recipe + style + run records, no data, no notes                                                        | supplementary material for review       | a reproducibility reviewer when the data is under licence (`W25.yaml`); a share save that names `runs`                                                                                                                                                                                                                                                                               |
| everything, with `imports`, `runs`, `positions`, `filter`, `sets`, `tables` and (when asked) `results` | a project                               | the reproducible session of `W25.yaml` (Reproducible Session and Network Publication): the network as it was read, its attribute tables, style, layout, the active filter, the record of every import, run and layout, kept sets and results. Version 1 does not hold several networks (open decision 24): a session holding more than one cannot be saved as one project ("Saving") |

The element API design specifies the envelope (`design/element-api/element-api-design.md` section
4.6.3a) with three rules this specification keeps: every member is optional and binds
independently; one member failing never fails the open; the fingerprint is advisory and never a
gate. "There is no separate project format to invent later, because the envelope is the project
format."

## Data model

```ts
interface GraphtyDocument {
    kind: "graphty-document";
    version: 1;
    createdAt: string; // RFC 3339 date-time; never rewritten
    modifiedAt?: string; // RFC 3339 date-time
    name?: string;
    description?: string;
    generator?: { name: string; version: string }; // e.g. graphty-element 3.1.0
    fingerprint?: string; // the graph the members were authored against
    features?: string[]; // must-understand features (README, "Versioning")
    // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
    data?: DataMember;
    dataSource?: DataSource; // below, "The data source"; written with or without data
    dataPlan?: DataPlan; // data-plan.md
    style?: StyleDocument; // style.md
    recipes?: Recipe[]; // recipe.md; in application order
    view?: ViewDocument; // view-preset.md
    annotations?: AnnotationSet; // annotations.md
    imports?: ImportRecord[]; // below, "Import records"
    runs?: (RunRecord | LayoutRecord)[]; // below, "Run records"
    positions?: Positions; // below, "Positions"
    filter?: Filter; // below, "The active filter"
    sets?: KeptSet[]; // below, "Kept sets"
    results?: StoredResult[]; // below, "Stored results"
    tables?: GroupTable[]; // below, "Groups of results"
    extensions?: Record<string, unknown>;
}

interface DataMember {
    format: string; // a format id from the element's catalogue, or "graph-format" in a zip
    formatVersion?: string; // graph-format's wire major.minor, for format "graph-format"
    inline?: string; // exactly one of inline, url, part
    url?: string;
    part?: string; // an entry of the zip container; refused outside one
    digest?: string; // "sha256:<64 hex>" of the bytes
    bytes?: number;
    options?: Record<string, unknown>; // import options the format declares; see "Options"
    inputs?: Record<string, DataInput>; // further named inputs of the importer; see "Several inputs"
    provenance?: DataSource; // the same shape as the top-level dataSource
    original?: { digest: string; format: string }; // when these bytes are a re-export ("Saving")
}

interface DataSource {
    source?: string; // "STRING", "HR extract"
    release?: string; // "v12.0"
    retrievedAt?: string; // RFC 3339
    query?: Record<string, unknown>; // { species: 9606, requiredScore: 700 }; see the vocabulary below
    citation?: string;
    license?: string; // SPDX expression of the data's terms, e.g. "CC-BY-4.0"
    url?: string; // https: where it can be obtained; shown, never fetched
}

interface DataInput {
    inline?: string;
    url?: string;
    part?: string; // exactly one
    format?: string; // default: the data member's format
    options?: Record<string, unknown>; // this input's own import options; never inherited
    digest?: string;
    bytes?: number;
    provenance?: DataSource; // where this input came from, when it differs from the main one
}
```

Each document member is a complete document of its kind, with its own `kind` and `version`, so it
can be lifted out and saved as a file of its own unchanged; `recipes` holds one per applied recipe.
A member's `kind` MUST match the member it sits in (a style member of `kind: "graphty-style"` or,
for version 1 styles only, no `kind`); a mismatch skips that member. Each member's version is
independent of the envelope's.

### The data member

`inline` holds the whole data file as text, in the named format; `url` names it; `part` names an
entry of the zip container (below). `digest` lets a reader tell whether the data it read is the data
the members were written against. `provenance` records where the data came from.

The data member carries the data exactly as a third-party file would -- in a project, the very
bytes the import read ("Saving" rule 3). Everything graphty knows about the data beyond that
travels in the other members. A data member never carries result columns: results travel as run
records and stored results, so reopening never turns them into attributes.

### The data source

`dataSource` describes where the data came from without carrying it: the source, its release, when
it was retrieved, the query that produced it (species, confidence cutoff), its citation and its
licence. It is what a methods section reports and what a colleague reapplying a starting point needs
to fetch comparable data, so every save writes it when the session knows it -- a share save that
writes no data included -- and every export sidecar copies it. A data member's own `provenance`,
and each named input's, is the same shape and wins for that member or input, so a joined table
from another source (a GEO accession under another licence) is cited in its own right.

**How the session learns it.** The import call takes the same shape as an option
(`load(src, { dataSource })`, and per input), and the import records it in its import record
(`ImportRecord.dataSource`), so a STRING file downloaded by hand and loaded from disk still carries
its release, species and cutoff into every later save, export and methods paragraph. A person
never has to edit the envelope's JSON to state it.

**The query vocabulary.** `query` stays free-form, but a small published vocabulary of keys has a
defined meaning and a sentence template for the methods text: `species` (an NCBI taxon id, "human"
for 9606), `requiredScore` (STRING's combined score on its 0-1000 scale, rendered as "combined score
at least 0.7"), `networkType` (`functional` or `physical`), `identifiers` (the count of query
identifiers), `limit` (interactors added). An unknown key is rendered as "key: value". The key list
is part of open decision 26.

### Options

`options` may carry only the import options the named format declares in the element's format
catalogue, validated against those option descriptors; an undeclared or invalid option skips the
data member with `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`. Inputs the element owns -- `url`, `data`,
`file`, `filename`, `size`, `chunkSize`, `errorLimit` -- MUST be refused in a document, because
they would let a document fetch a URL without consent or disable the importer's error limit.
Options that multiply the graph's size (graph-io's hyperedge expansion `hyperedges: "clique"` or
`"star"`) are the caller's choice only and are refused in a document. Options naming an endpoint or
id column (`edgeSource`, `edgeTarget`, `nodeIdPath`, `idColumn`, `sourceColumn`, `targetColumn`)
are refused too: the data plan's `knownFields` is the one spelling (data-plan.md, open decision 32).

Each named input takes its own `options` and otherwise its own format's defaults; it never
inherits the main input's options, so a tab-separated edge list and a comma-separated expression
table sit in one envelope.

**Size.** Whatever the options, the reader applies a node and edge count limit after any
expansion: by default graphty-element's published ceilings (`DEFAULT_LIMITS.renderCeiling` and
`edgesDrawn`, `graphty-element/src/session/limits.ts`, 50,000 nodes and 100,000 edges today, where
the renderer was measured to fail), raisable by the caller. The counts are checked while parsing:
the import stops at the first record past a limit, and a graph-format part's declared lengths are
checked before anything is allocated, so a 60 MB inline edge list cannot exhaust the page's heap
before a count is taken. Bytes are bounded too: every source of bytes -- fetched bodies (counted
while streaming), inputs, stored-result and table parts -- has the 64 MB limit of a JSON document
unless the caller raises it, and the importers bound one record and one cell (RECOMMENDED: 1 MB per
cell), so a single 2 GB attribute or a file with no newline is refused before it is buffered.
Attribute cells are bounded as README "Encoding and limits" states. Beyond a limit the data member
is refused with `E_TOO_LARGE`. Data above
the element's large-graph threshold is reported with an estimate before it is imported, as a recipe
step is.

### Several inputs

Some importers take more than one input: graph-io's CSV importer reads an edge table and takes the
node table as its `nodes` input; the Neo4j importer takes several node and relationship files. The
top-level `inline`, `url` or `part` is the importer's main input. `inputs` names the others, each
key being the name of an input the format declares (`nodes` for CSV). A data plan's joins (data-plan.md,
"Joins") also name inputs of this map. `W20.yaml` then fits in one envelope: the STRING edge list as
the main input and the per-gene expression table as `inputs.expression`, joined by the plan.

Merging several sources, each read by its own data plan, into one graph is not in version 1 (open
decision 27).

## Run records

`runs` records what actually ran: one entry per run whose results the session holds, one per
layout that produced the positions being saved, and the records of runs that were replaced,
re-run or deleted (below), in the order they ran. A recipe is a plan and cannot say what happened;
a methods section, a reviewer and a reproduction need what happened.

The shape is graphty-element's `RunRecord` (`graphty-element/src/session/runs/types.ts`),
serialised as it is: every member the element's record has is written, including those not shown
below (`status`, `label`, `shape`, `summary`, and the scope's `digest`, `set` with its revision and
`reading`), so a run scoped to a kept set can tell on reopen that the set was redefined since. The
members shown here that the element's record does not have today -- `precision`, `accelerator`,
`recipe`, `bindings`, `weight`, `data`, `superseded`, `discarded`, `importedFrom`, and `scope.requested`
beside the element's `scope.spec` -- are element changes to `RunRecord` itself, not a second
spelling of it:

```ts
interface RunRecord {
    id: string; // the run id as it exists in the session (namespaced)
    algorithm: string; // the current catalogue key (README, "Identifiers" rule 4)
    params: Record<string, unknown>; // EVERY option, defaults filled in, canonicalised
    seed: number | null; // the effective seed, also when the caller gave none
    scope: {
        requested: unknown; // the scope as asked for; element ids redacted in a share or export
        nodes: number;
        edges: number; // counts, never element ids
        componentScope?: "all" | "largest";
        filter?: Filter; // the filter it ran under, when a filter narrowed it
        windowScope?: boolean;
    };
    startedAt: string; // RFC 3339
    durationMs: number;
    engine: {
        // graphty-element's EngineVersions
        element: string;
        algorithms: string;
        layout: string;
        graphIo?: string;
        graphFormat?: string; // the packages that read the data (an element change)
        plugins?: Record<string, string | null>; // catalogue key -> the plugin's declared version, null if none
        accelerator?: { package: string; version: string; backend?: string; adapter?: string };
    };
    outcome: {
        exact: boolean;
        sampleSize?: number;
        converged?: boolean;
        iterations?: number;
        method?: string;
        precision: "f32" | "f64";
        direction: string; // how edge direction was treated (the element's RunDirection)
        partial: boolean;
        partialReason?: string;
        notes?: string[]; // the element's caveat sentences
        costCap?: number; // the cost cap in force, when the caller raised it
    };
    stale?: { reason: string; since: string }; // why its numbers no longer describe the graph
    weight?: { attribute: string; role: "distance" | "similarity" | (string & {}); confirmed: boolean };
    bindings?: Record<string, string>; // recipe slot -> the attribute it bound to
    recipe?: { id: string; recipeVersion?: string; digest: string; step: string; as: string; namespace: string };
    import?: string; // the id of the import record of the graph it ran on
    data?: { digest?: string; planId?: string; planVersion?: string }; // always written, so a record
    // without its import record still names the data it ran on
    superseded?: { by?: string; at: string; differences?: string[] }; // replaced or re-run
    discarded?: { at: string; reason?: string }; // deleted by the person; no results kept
    fields: { name: string; type: string; role?: string }[];
    graphFields?: Record<string, unknown>; // graph-level result fields: min, max, mean, normalization, measured...
    importedFrom?: { document: string; digest: string }[]; // stamped by a reader, below
}

interface LayoutRecord {
    // a RunRecord whose `layout` replaces `algorithm`
    weight?: RunRecord["weight"]; // the weight it read, and as what (recipe.md, "Weights" rule 6)
    id: string;
    layout: string; // the layout catalogue key as asked for ("force")
    engine: RunRecord["engine"] & { layoutEngine: string; layoutEngineVersion?: string };
    params: Record<string, unknown>; // every option, defaults filled in
    seed: number | null;
    dimension: 2 | 3;
    scope: RunRecord["scope"];
    startedAt: string;
    durationMs: number;
    outcome: { iterations?: number; converged?: boolean; partial: boolean };
    recipe?: RunRecord["recipe"];
    import?: string;
    importedFrom?: { document: string; digest: string }[];
}
```

1. A writer that writes a project (below) MUST write `runs`, including a layout record for every
   layout that produced the saved positions, whether a recipe set it or a person did by hand. The
   export sidecar writes them too (export-mapping.md).
2. `recipe.digest` is the recipe digest (recipe.md, "Identity and namespacing"). It is REQUIRED on
   every run a recipe produced, so "the recipe I cite" can be checked against "the recipe that
   ran".
3. A reader never re-runs anything because of `runs`. It uses them to report provenance, to fill
   the methods text (recipe.md), to give stored results their meaning, and to compare a
   reproduction (recipe.md, "Reproducing").
4. A run whose results no longer describe the graph -- the data changed after it ran -- is written
   with `stale`. The methods text and the export manifest never present a stale run as a current
   result (recipe.md, "Producing a recipe" rule 6).
5. Every run record, stored result, kept set and view a reader adds from a document is stamped by
   appending an entry to its `importedFrom` chain; a chain already in the file is kept as the file's
   claim (README, "Trust" rule 6). The entry records what the reader observed -- the file name or
   origin it opened (`observed`), the digest, the time, the reader's installation and, when the
   application supplies one, the receiving user (`by`) -- and the document's own `name` only as the
   document's claim.
6. **Earlier records are never silently replaced.** When a run is replaced (`onRepeat:
"replace"`), re-run after reopening, or re-run with other parameters under the same id, the
   earlier record is kept, marked `superseded` with the differences listed (`W_ENGINE_DIFFERS`,
   `W_PARAMETER_DIFFERS`), and the report of the re-run says so. A run the person deletes leaves its
   record marked `discarded`, without results, so the alternatives tried and rejected -- a
   resolution of 0.5, a damping of 0.9 -- are part of the project. A project save writes both kinds;
   a share leaves them out unless the caller names `runs`, and then still leaves out discarded
   records unless asked. The methods text lists them as tried and not kept.

## Import records

`imports` keeps the import report (README, `ImportReport`) of each import that built the graph a
project holds, with an `id` that run records name in `import`:

```ts
interface ImportRecord extends ImportReport {
    id: string;
    at: string; // unmatchedIds capped as in the report
    dataSource?: DataSource; // as given at import ("The data source")
}
```

An import record, like the import report, carries `engine`: the graph-io and graph-format versions
and, for a registered third-party format, the importer's key and declared version, so a later change
in how a header or an id is read can be traced (README, `ImportReport`).

An import record names elements of the data: `joins[].unmatchedIds`, `nodeConflicts[].id` and
`issues[].value`. Every file written under the share rules -- a share save, an export sidecar, a
manifest file -- replaces them with their counts and a redaction marker by default, reports it with
`W_GRAPHTY_REDACTED`, and writes the ids only when the caller names them; they are covered by the
share's element-name report ("Saving" rule 2).

So "how many of my 450 query genes matched the expression table, and which were dropped" is
answered from the file as it held when the figure was made, and every run names the plan version
and data digest it ran on. A project writes `imports`; so does an export manifest.

## Positions

`positions` holds the drawn node positions of a project whenever the data member's format cannot
hold them (CSV, and the other formats export-mapping.md marks "no"), so a figure's layout survives a
save and a stored camera still frames it:

```ts
interface Positions {
    layout?: string; // the id of the layout record that produced them
    dimension: 2 | 3;
    inline?: [id: string | number, x: number, y: number, z?: number][]; // JSON container
    part?: string; // zip container: a graph-format part with the position role
    digest?: string;
}
```

Opening applies them after the data loads and before any layout; a node id that does not bind is
counted and reported. A layout step of a recipe replaces them only when it runs.

## The active filter

`filter` is the filter that was active when a project was saved, as a declarative record, so the
cutoffs that decided what a reader saw (a q-value and a similarity threshold, three communities of
interest) are not lost:

```ts
interface Filter {
    nodes?: string; // a predicate over the expression root (README, "Paths")
    edges?: string; // a predicate; edges between kept nodes are kept only when it holds
    component?: "largest"; // then keep only the largest component of what the predicates keep
}
```

`component: "largest"` is how a person keeps the largest connected component as the working
network -- the first step of most interaction-network tutorials -- without editing the graph: the
isolates are hidden, not removed, so a project save still writes the original bytes and their
digest, a join made afterwards is still a join, and the methods text states the trim as the filter
it is. Its tie rule is the recipe's (recipe.md, "Scopes").

The same shape is a view's `filter` (view-preset.md) and a run record's `scope.filter`. A filter the
element cannot express this way (a hand-picked hide, a lasso) is saved as its nearest predicate
when there is one and otherwise reported (`W_GRAPHTY_FILTER`). Expressing the element's active
filter as predicates is an element change; `graph.filter` in a recipe is the later, replayable form.

## Kept sets

`sets` holds the sets a reader kept by hand -- a hub list, a ring of accounts -- which styles
(`member` selectors), view framings and note targets refer to. The sets design defers their stored
form to "the first project file" (`design/sets/sets-design.md`); this is that form.

```ts
interface KeptSet {
    id: string; // what selectors, framings and notes name
    name: string;
    description?: string;
    nodes?: (string | number)[]; // node ids, compared after the import's id coercion
    edges?: EdgeMember[]; // graphty-element's stable edge identity, never session edge ids
    features?: string[];
    importedFrom?: { document: string; digest: string }[];
    extensions?: Record<string, unknown>;
}
```

A set names elements of its data, so a writer with `purpose: "share"` leaves it out.

## Stored results

`results` holds computed results so that a project reopens with its results without re-running
them, and notes, styles and view framings on those results bind at once. In the zip container each
entry names a part holding either graph-format's binary wire form or a CSV table; in the JSON
container it holds the CSV table as text (`inline`). Either way there is one column per published
field, keyed by the graph's node (or edge) id column, with the column names an export would write
(export-mapping.md). CSV is readable from R and Python without the graph-format package; the wire
form is smaller. So the guarantee that a project reopens with the exact numbers of a submitted
figure does not depend on the container decision.

```ts
interface StoredResult {
    run: string;
    part?: string;
    inline?: string; // exactly one of part, inline
    format?: "graph-format" | "csv"; // default graph-format for a part, csv inline
    formatVersion?: string;
    digest?: string;
    importedFrom?: { document: string; digest: string }[];
}
```

A stored result whose run has no entry in `runs` is refused, because its numbers would have no
parameters. A part whose graph-format wire version the reader cannot read is not an error: the run
goes into `needsRerun`, and the report names the part (`E_UNSUPPORTED_VERSION` with `details.kind:
"part"`). A stored result from a document this session did not write is shown as unverified until
`reproduce` recomputes it (recipe.md, "Reproducing"); the mark is kept per result through its
import chain and survives a re-save. A project save writes stored results when the caller asks
(`saveDocument({ results: true })`), and always for a project a caller marks as a figure's record.
Without stored results, reopening restores results only by running the recipes, with consent, and
the reader reports them in `needsRerun`.

**Groups of results.** `tables` holds per-group tables -- an enrichment table per cluster (term,
FDR, genes) computed outside graphty, keyed by a group value of a run -- attached to the run and
field whose values its `key` column holds:

```ts
interface GroupTable {
    id: string;
    name?: string;
    description?: string;
    run: string;
    field?: string; // default: the run's partition field
    key: string; // the column holding the group value
    data: { inline?: string; url?: string; part?: string; format?: string; digest?: string; provenance?: DataSource }; // a CSV table
    importedFrom?: { document: string; digest: string }[];
}
```

A table whose run is not held is kept and reported as unbound, as a note on a missing run is. A
table is data: it is left out of a share like `sets`, unless the caller names it.

## Containers

Two containers are recommended; which to adopt is an open decision (README, "Open decisions",
container):

1. **A JSON file** (`.graphty.json`, `application/vnd.graphty+json`): the envelope is the whole
   file. The data member, if any, is `inline` text or a `url`. This is the form for style files,
   recipes, starting points, workspaces and small projects, and the form a person can read, diff
   and write by hand, which the expert persona requires
   (`design/designloom/personas/expert-emma.yaml`).
2. **A zip archive** (`.graphty`, `application/vnd.graphty.project+zip`): a file named
   `manifest.json` at the root holds the envelope; the data member is a `part` naming another
   entry of the archive, which MAY be graph-format's binary wire form (format id `graph-format`,
   which names that wire form in a `part` only and is not an entry of the element's format
   catalogue). This is the design studio's recommendation for project files
   (`design/ui/framework/one-way-doors.md` door 1), measured at 18 MB and 6 ms to write a
   100,000-node, 500,000-edge graph as graph-format bytes against 58 MB and about 290 ms as JSON.
   Every other entry is named by the manifest; a reader ignores entries the manifest does not name.

A reader distinguishes the two by content, not by name: a zip archive begins with the bytes
`PK\x03\x04`; a JSON document begins, after optional whitespace, with `{`.

The autosave graphty-element writes (the design studio's door 88: a format version, the writer's
version, sections named by namespace, unknown sections kept and written back, committed state only)
SHOULD be this envelope, so that an autosaved project and a downloaded one are one format:
`version` is the format version, `generator` the writer, members and `extensions` the namespaced
sections, and README's unknown-members rule 2 (kept across apply and save) keeps what a reader does
not know.

## Opening

`data.openDocument(src, { members?, files?, resolve?, consent?, requireDigest?, applyTo?, run? })`
(designed in the element API design; not yet built) opens an envelope. `files` are companion files
the caller supplies beside the envelope (a file picker's selection, a dropped folder); `resolve` is
a function that returns the bytes for a relative reference; `applyTo: "next-import"` holds the
members for the next data load (below). A reader MUST:

1. Refuse a top level that is not a `graphty-document` object with an integer `version` and a
   `createdAt`, with `E_BAD_COMMAND`; refuse an envelope `version` it does not read with
   `E_UNSUPPORTED_VERSION`; refuse a document over the limits of README "Encoding and limits".
2. Consider only the members named by the caller's `members` filter, when given. The others are
   reported as not requested.
3. Validate each member against its own kind's rules, independently. A member that fails is
   skipped and reported with its code; the rest continue.
4. Apply the members in this order: `dataPlan`, `data`, `positions`, `filter`, `sets`, `results`,
   `tables`, `recipes` (in list order), `style`, `view`, `annotations`; `dataSource`, `imports`
   and `runs` are read as records. - The data plan applies to the import of the data member that follows it. A data plan in a
   document with no data member is held for the next import **only when the caller names
   `dataPlan` in `members`**, whatever `applyTo` says; otherwise it is reported as not applied.
   A plan changes how the next, unrelated file is read (which columns exist, whether repeated
   edges merge, which rows a constraint drops), so a starting point opened with `applyTo:
"next-import"` cannot slip one in. When a held plan would drop rows (`reject-row`,
   `include: false`) or merge records (a `repeatedEdges` other than `keep`), the next import waits
   for the caller to acknowledge the plan, and the import report names the document it came from
   and that document's digest (`plan.heldFrom`) and lists every field the plan excluded or merged. - **When the data plan is refused** (data-plan.md, "Applying" rule 5, an unknown member of
   `knownFields`, or typed identity this reader does not implement), the data member MUST NOT be
   imported with defaults: it is reported as skipped because its reading instructions were
   unreadable, and so is every member that binds to data. Importing it anyway would build the
   different graph the refusal exists to prevent. The caller may import it deliberately. - When a data member is present and fails to load, the members that bind to data (sets,
   results, recipe, style, view, annotations) MUST NOT be applied to whatever graph the session
   held before; they are reported as skipped because the data they accompany did not load, and
   returned parsed so the caller can apply them deliberately. This refines the design's "one
   member failing never fails the open": the open still succeeds and reports, but nothing is
   bound to the wrong graph. - Each recipe is bound and planned but runs only if the caller passes `run: true`, and then only
   within the total budget (recipe.md, "Consent"). When a recipe carries an `application` block
   (recipe.md, "Saving an applied recipe"), its recorded namespace is restored, so a saved
   project reopens with the same run ids; its recorded bindings, confirmations and arguments are
   the file's claim and are adopted only when graphty-element's own record shows this
   installation made them (recipe.md, "Applying"). The style's `results.<as>` paths, and the
   annotations' run references, are then rewritten to the namespaced ids (recipe.md, "Identity
   and namespacing"). - The style applies next. Layers bound to recipe runs that have not run and have no stored
   result are reported in `needsRerun` with the recipe step's estimate. - The view applies after the layout the recipe may set; the annotations apply last, when their
   targets exist. A note on a run the recipe will produce is pending, not orphaned
   (annotations.md). A view named by `initial` in a document this installation did not write is
   applied with the effect report of view-preset.md ("Applying" rule 9).
5. Compare the envelope's `fingerprint` (and each member's own, when present) with the loaded
   graph's and report `match`, `differs` or `unknown`. Never refuse on a difference.
6. Return a document report:

```ts
interface DocumentReport {
    applied: DocumentMember[];
    members: Partial<Record<DocumentMember, BindingReport>>;
    import?: ImportReport; // README, "Applying a document to new data"
    skipped: { member: DocumentMember | string; reason: string; code: GraphtyErrorCode }[];
    fingerprint: "match" | "differs" | "unknown";
    digest?: "match" | "differs" | "absent";
    held?: DocumentMember[]; // with applyTo: "next-import"
}
type DocumentMember =
    | "data"
    | "dataSource"
    | "dataPlan"
    | "style"
    | "recipes"
    | "view"
    | "annotations"
    | "imports"
    | "runs"
    | "positions"
    | "filter"
    | "sets"
    | "results";
```

An unknown top-level member is reported in `skipped` by name ("not read by this version") and
kept under README's unknown-members rule 2. A member that carries data or changes what a stored
reference means (`graphs`, `sources`, `aliases`) arrives only with a new envelope major version, so
an old reader never applies a top-level style or notes to the wrong graph because it ignored one.

### Holding a starting point for the next import

With `applyTo: "next-import"`, the reader parses and validates the data plan, recipes, style, view
and annotations and holds them. When the next import completes, it applies them in the order above
to the new graph and returns the report then; a held recipe still runs only on the caller's
instruction. Slot bindings and weight-role confirmations graphty-element recorded itself for the
same recipe on data of the same shape are reused (recipe.md, "Applying", "Recorded bindings"), so a
weekly import of the same shape needs no re-confirmation, with or without a data plan. Nothing
recorded in the file is reused as a decision. This is how a person picks one starting point once
and applies it to every new file of that shape.

### Fetching

1. **Relative references.** A relative reference is narrow: one or more path segments joined by
   `/`, each made of letters, digits, `.`, `_` and `-` only, none equal to `.` or `..`, with no
   leading `/`, no backslash anywhere, no colon, no percent sign, and no whitespace or control
   character anywhere (so none leading or trailing). Anything else that is not an absolute `https:`
   URL is refused with `E_BAD_COMMAND` before any resolution -- parent traversal
   (`../../etc/passwd`), an absolute path, a backslash authority (`\\evil.example\p.csv`,
   `/\evil.example/p.csv`, which the WHATWG URL parser resolves to another host), a leading-space
   scheme (` javascript:`). The check is made on the string and repeated on the WHATWG-parsed
   result, which must stay on the base's origin and under the base's path. A relative `url` (of the
   data member or of an input) is resolved against the envelope's own URL when the envelope was
   fetched from a URL. When the envelope was opened from a local file, it is matched against the
   caller's `files` by exact name only (never by basename after normalising), or passed to the
   caller's `resolve` function, which receives only references that passed this check; without
   either, the reader reports the data member as `E_CONSENT_REQUIRED` naming the file it needs, so
   an application can ask the person for the sibling file. A sidecar pair opened from a folder
   therefore works whenever the application passes the folder's files or asks for the named one.
2. **Schemes.** A fetched URL MUST be `https:`; `http:` only when the caller explicitly allows it.
   `file:`, `data:`, `blob:`, `javascript:` and every other scheme are refused. A scheme-relative
   reference (`//host/path`) is cross-origin and is treated as an absolute URL.
3. **Consent** is required for the origin of the resolved absolute URL, relative or not, and
   including the origin the envelope itself came from, unless the caller pre-authorised that
   origin (`consent`). Consent lasts for one open unless the caller stores it. Without consent the
   data is not fetched, and the report says consent is needed.
4. **Redirects** are followed only to an origin that also has consent, checked for each hop;
   otherwise the fetch fails. Requests are made with credentials omitted. **Addresses.** Private,
   loopback and link-local addresses are refused unless the caller allows them, and how depends on
   the environment. In Node, the element resolves the name, checks every address it resolved to,
   and connects to a checked address, pinning that answer for the request and each redirect, so a
   second DNS answer (rebinding) cannot reach an internal address. In a browser, a page cannot see
   the address a name resolves to: the element refuses IP-address literals in private ranges, and
   the consent prompt -- which shows the resolved origin and says the file asks to contact it --
   and the browser's Private Network Access rules are the only protection against an internal
   name. A conversion service that opens user-supplied envelopes SHOULD run the Node reader.
5. **Digests** are verified for every form of data -- inline, fetched and zip part -- and for every
   input that carries one. A mismatch is reported (`digest: "differs"`) and the data still opened,
   because an updated data file is the normal case for a reused recipe; with
   `requireDigest: true`, a mismatch refuses the data member with `E_DIGEST_MISMATCH` and every
   data-bound member is skipped, which is what an evidence file needs.

## Saving

`data.saveDocument({ purpose?, members?, inlineData?, container?, results? })` (designed) writes an
envelope from the session.

1. The writer MUST write `kind`, `version`, `createdAt` and `generator`. It MUST NOT write
   `fingerprint` until a scheme is approved (README).
2. **Purpose.** `purpose: "project"` (the default) is a person's own save and writes every member
   the session has content for: the data, `dataSource`, the data plan, every applied recipe with
   its `application` block, style, view, annotations, `imports`, `runs`, `positions`, `filter`,
   `sets`, `tables` and `results` (when asked for, "Stored results"). `purpose: "share"` is anything
   meant for someone else -- a starting point, a workspace, a style, supplementary material: by
   default it writes `dataSource` but no data, no annotations, no `imports`, no `runs`, no `sets`,
   no `tables`, no `results`, no `positions`, no `filter` and no `application` block. The caller MAY
   add `data`, `annotations`, `imports`, `runs` or `filter` to a share by naming them in `members`
   (a share is widened only by explicit name; for a project `members` only narrows); a run record
   without its import record still names its data by `data` (digest and plan). Before anything is
   written, a share reports **every literal that can name data**: `ids` selectors and `member`
   selectors naming sets; every literal in any predicate -- a style's, a recipe's, a view's
   `filter`, the envelope's `filter`, a run's `scope.filter` -- whatever the column's declared
   level; encoding `map` keys and `order`; data-plan `enum`, `missingValues` and `quotes`;
   element-valued argument defaults; set framings in views; view `name`, `caption` and
   `description`, treated like a document name in an export; `graphFields`; and, when included,
   run parameters, arguments and requested scopes that hold node ids, import records'
   `unmatchedIds`, `nodeConflicts` and issue values, notes' revisions and retracted notes. In a
   share without annotations, a view's `notes` list is dropped and reported. A share also reports
   every `userData`, `extensions` member and unknown member it would carry, and drops them unless
   the caller keeps them, so a shared file carries nothing the person did not see -- **except inside
   a recipe's digested parts** (`steps` and `requires`), which are written verbatim so a re-shared
   recipe keeps its digest (recipe.md, "The recipe digest"). The caller then removes or redacts
   what was reported, or confirms. `members` narrows either purpose.
3. **Data: the bytes that were read.** When the session still holds the bytes the import read and
   the graph has not been edited since (no node merged, added or removed), a project save MUST
   write those bytes verbatim, inline or as a part, with their original `digest`, together with
   the data plan exactly as the import used it (joins included, with their tables as inputs, and
   joins made after load added) -- so reopening re-imports the same way, the digest the notes and
   the paper cite still matches, and chain of custody holds. Only when the original bytes are not
   available, or the graph was edited, is the data re-exported: in the zip container as
   graph-format's wire form, which is lossless; in the JSON container through graph-io's exporter
   for the format it was loaded from when that format can hold every column and the positions,
   else GEXF. A re-export is written with the data plan regenerated for the written bytes (the
   rule of data-plan.md, "Writing" rule 2: the headers written, the writer's options, no renames,
   no joins, joined columns declared as attributes, and the original plan in `derivedFrom`), the
   original digest and format in `original`, and the loss notes of that export (export-mapping.md);
   a graph edited by merges is reported with `W_GRAPHTY_MERGES`, because version 1 has no record of
   what merged into what (open decision 27). That report names the number of notes whose targets
   were merged away and says that `requireDigest` and ordinal edge references then bind only
   through `data.original.digest` (annotations.md, "Reading and applying" rule 9). Result columns
   are never written into the data.
4. **Positions.** When the data's format cannot hold positions and the graph has been laid out,
   the positions are written in `positions`, with the layout record that produced them in `runs`.
5. Each member is written by its own kind's writer, with the same rules: a run that anything saved
   names and that has only a derived id is given an author-assigned alias first (README,
   "Identifiers" rule 2), so no layer or note is refused or left out for it; annotations write
   stable edge references; each recipe and every member that refers to its runs are written with
   the recipe's own `as` names, not the namespaced ids, as recipe.md "Saving an applied recipe"
   specifies. Unknown members and extensions each unit arrived with are written back (README,
   "Unknown members" rule 2), except as rule 2 says for a share.
6. **Runs made by hand.** A project save writes, as one more member of `recipes`, a recipe produced
   by `journal.export()` covering every run and layout the session holds that no applied recipe
   produced, with minted `as` ids and every reference to them rewritten (recipe.md, "Producing a
   recipe"). Its `id` is minted for the session (`urn:uuid:<uuid>`). A run made under a filter no
   predicate can express (a lasso) is written as a step scoped to a `node-set` argument whose value,
   the ids the filter kept, is recorded in that recipe's `application` block (a project may name
   elements). So a project that stores no results can still restore every hand-run result by
   re-running, and the style layers and notes on those runs are pending, not orphaned, when it
   reopens; a run that still cannot be written is refused with `W_GRAPHTY_FILTER`, naming it.
7. **The active filter** is written in `filter`; a filter that cannot be expressed as predicates is
   reported (`W_GRAPHTY_FILTER`).
8. **One graph.** A session holding more than one graph -- a comparison's second network, a merged
   network -- is refused with `E_UNSUPPORTED`, naming the graphs, unless the caller narrows the save
   to one graph; then every graph and every run left out is named in the report with
   `W_GRAPHTY_GRAPHS`. Nothing is left out silently (open decision 24).
9. **Handling markings.** Every handling marking that applies to what is written is written, as a
   list (README, "Extension data and shared metadata": a marking is scoped to the units that
   arrived with it).
10. Content version 1 has no member for -- a saved node merge, a per-group table not attached to a
    run -- is reported with its code (`W_GRAPHTY_MERGES`, `W_GRAPHTY_TABLES`), never dropped
    silently.

**Round trip.** For a document written with `purpose: "project"`, opening it and saving it again
without changes MUST produce the same content apart from `generator` and `modifiedAt`: the same run
ids, the same paths, the same members, the same data bytes and digest.

## Upgrading the 1.x template

A 1.x style template is upgraded on read to an envelope as style.md ("Upgrading the 1.x style
template") specifies. The upgrade report lists every 1.x member that has no home in version 1 (the
background, the selection style, the behaviour settings), so nothing is dropped silently. A recipe
produced by the upgrade never runs without the caller's explicit instruction.

## Reserved names

| Reserved member | For                                                                              | Status                                                                       |
| --------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `config`        | the element's configuration document (`ConfigDocument`, element API design 4.12) | open; an optional member later                                               |
| `graphs`        | several graphs in one document (`W24.yaml`: two conditions and a merged network) | open decision 24; only with envelope version 2 unless decided before release |
| `sources`       | several sources, each with its own data plan, merged into one graph              | open decision 27; envelope version 2                                         |
| `aliases`       | an identity mapping from merged ids to surviving ids                             | open decision 27; envelope version 2                                         |
| `filters`       | several named saved filters beyond the active one                                | open; an optional member later                                               |
| `styles`        | alternative named style stacks beside `style`                                    | open; an optional member later                                               |

## Security

1. Everything in README's "Trust" applies. The envelope adds one rule: a member is never applied
   because another member says so. A recipe runs only on the caller's instruction, whatever the
   envelope contains.
2. A zip reader MUST read the central directory only; MUST refuse duplicate entry names (compared
   case-insensitively after normalising `\` to `/`), an entry whose local header names a different
   file than the central directory, entries whose data ranges overlap or fall outside the archive,
   entry names that are absolute or contain `..` segments, and more than 10,000 entries; MUST NOT
   extract to disk as a side effect; and MUST bound the total uncompressed size (RECOMMENDED 1 GB)
   and the compression ratio of each entry (RECOMMENDED 100:1), **counting the bytes actually
   inflated** and stopping at the bound, never trusting the sizes the directory declares. A `part`
   MUST name an entry exactly.
3. `inline` data is parsed by graph-io's importers under the node and edge limits of "Options",
   counted while parsing. graph-io has no size limits of its own beyond its error limit, which a
   document cannot change.

## Conformance

| Input                                                                                                                       | Required result                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `{ "kind": "graphty-document", "version": 1, "createdAt": "2026-09-27T12:00:00Z" }`                                         | accepted; nothing applied                                                                                                    |
| an envelope with a valid style and a `recipes` entry with `version: 7`                                                      | valid against the envelope schema; style applied; recipe skipped with `E_UNSUPPORTED_VERSION`                                |
| a member `"config": {...}`                                                                                                  | reported as not read by this version; kept on re-save                                                                        |
| a style member with `kind: "graphty-view"`                                                                                  | style member skipped                                                                                                         |
| data `url` on any host, including the envelope's own, no consent given                                                      | data not fetched; data-bound members skipped; report says consent is needed                                                  |
| data `url: "//tracker.example/p.csv"`                                                                                       | treated as absolute; consent required for `tracker.example`                                                                  |
| data `url: "file:///etc/passwd"` or `"http://169.254.169.254/"`                                                             | refused                                                                                                                      |
| a consented host answers with a redirect to an unconsented origin                                                           | fetch fails; reported                                                                                                        |
| sidecar `network.graphty.json` opened from disk with `files` holding `network.gexf`                                         | data resolved from the supplied file, digest verified, all members applied                                                   |
| the same, without `files` or `resolve`                                                                                      | data member reported `E_CONSENT_REQUIRED` naming `network.gexf`; data-bound members held, not applied to the previous graph  |
| data inline, fails to parse                                                                                                 | data-bound members skipped, not applied to the previous graph                                                                |
| a data plan refused for `repeatedEdges: "mean"`                                                                             | data not imported; every data-bound member skipped                                                                           |
| `data.options: { "url": "https://attacker.example" }`                                                                       | data member skipped: `url` is element-owned                                                                                  |
| `data.options: { "hyperedges": "clique" }`                                                                                  | data member skipped: the caller's choice only                                                                                |
| `data.part` in a JSON container                                                                                             | data member refused                                                                                                          |
| inline data whose digest differs, `requireDigest: true`                                                                     | data refused with `E_DIGEST_MISMATCH`; data-bound members skipped                                                            |
| envelope and graph fingerprints differ                                                                                      | everything binds as it can; report says `differs`                                                                            |
| a project saved, opened and saved again                                                                                     | identical content apart from `generator` and `modifiedAt`; run ids unchanged                                                 |
| `saveDocument({ purpose: "share" })` on a session with notes and a hub set                                                  | no annotations, no sets; every `ids` or set-naming unit reported before writing                                              |
| `saveDocument({ purpose: "share", members: ["data", "annotations"] })`                                                      | data and notes written; the element-name report produced first                                                               |
| a zip with two entries named `manifest.json`                                                                                | archive refused                                                                                                              |
| a zip entry `../../etc/passwd`                                                                                              | archive refused                                                                                                              |
| a zip part declaring 10 MB that inflates past the ratio bound                                                               | reading stops at the bound; archive refused                                                                                  |
| a stored result whose run is not in `runs`                                                                                  | that result refused                                                                                                          |
| a stored result part in a graph-format wire major the reader cannot read                                                    | the run in `needsRerun`; `E_UNSUPPORTED_VERSION` with `details.kind: "part"`                                                 |
| data `url` values `../../etc/passwd`, `/etc/passwd`, `\\evil.example\p.csv`, `/\evil.example/p.csv`, ` javascript:alert(1)` | each refused before resolution                                                                                               |
| a CSV edge table plus a joined expression table, saved as a JSON project, reopened, saved again                             | the original bytes and digests both times; equal node, edge and attribute counts; identical content                          |
| the same after a node merge in the session                                                                                  | data re-exported with a regenerated plan (no joins, `derivedFrom` the original), `original` set, `W_GRAPHTY_MERGES` reported |
| a CSV-loaded graph laid out, saved as a JSON project, reopened                                                              | `positions` written with its layout record; positions identical on reopen                                                    |
| a session holding two graphs (a comparison)                                                                                 | save refused naming both, unless narrowed to one; then `W_GRAPHTY_GRAPHS` names the graph and runs left out                  |
| a session with two applied recipes and three runs made by hand                                                              | `recipes` holds both recipes and a third, minted recipe for the hand runs                                                    |
| a style layer and a note on a run started from a panel without `as`                                                         | the run given an alias; layer and note written against it; both bind on reopen                                               |
| `saveDocument({ purpose: "share" })` of a session whose data had provenance                                                 | `dataSource` written; no data                                                                                                |
| `saveDocument({ purpose: "share", members: ["recipes", "style", "runs"] })`                                                 | the run records written; node ids in their parameters reported before writing                                                |
| an envelope holding only a data plan, opened with no options                                                                | plan not applied, reported; the next import unaffected                                                                       |
| an envelope opened after a marked document, then saved                                                                      | the marking written                                                                                                          |
| a share of recipes and runs, without `imports`                                                                              | no import records; each run record's `data` names the data digest and plan                                                   |
| an export sidecar of a join with 40 unmatched ids                                                                           | `unmatchedIds` replaced by the count and a marker; `W_GRAPHTY_REDACTED`                                                      |
| a share with a view filter comparing `data.id` to `'ACC-1042'`, and an encoding `map` keyed by account holders              | both reported before writing                                                                                                 |
| a share of a recipe whose step carries a member unknown to this reader                                                      | the member written verbatim; the digest unchanged                                                                            |
| a style file opened with `applyTo: "next-import"` that also carries a data plan                                             | the plan not held; reported                                                                                                  |
| the largest-component filter active on a STRING import, saved as a JSON project                                             | original bytes and digest written; `filter: { component: "largest" }`                                                        |
| a JSON project saved with `results: true`, reopened                                                                         | results restored from `inline` CSV; no re-run; shown as computed here                                                        |
| a project reopened, PageRank re-run on a newer engine, saved                                                                | the earlier record kept with `superseded` and its differences                                                                |
| a run deleted by the person, then a project save                                                                            | its record written with `discarded`, without results                                                                         |
| a JSON project with a lasso-filtered run                                                                                    | written as a `node-set` argument step; the result restored on reopen by re-running                                           |
| a TSV main input and a CSV `inputs.expression` without options                                                              | each read with its own format's defaults                                                                                     |
| a Node reader fetching a name that resolves to `10.0.0.5`                                                                   | refused before connecting                                                                                                    |

## Worked examples

### A community starting point: recipe and style, no data

The owner's case (2026-09-27): a lab publishes how it looks at interaction networks, for anyone to
apply to their own data.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "createdAt": "2026-09-27T12:00:00Z",
    "name": "Example Lab: hub genes",
    "authors": [{ "name": "Example Lab", "url": "https://example.org/lab" }],
    "license": "CC-BY-4.0",
    "generator": { "name": "graphty-element", "version": "3.1.0" },
    "dataSource": {
        "source": "STRING",
        "release": "v12.0",
        "query": { "species": 9606, "requiredScore": 700 },
        "license": "CC-BY-4.0",
        "url": "https://string-db.org/"
    },
    "recipes": [
        {
            "kind": "graphty-recipe",
            "version": 1,
            "id": "org.example-lab.hub-genes",
            "recipeVersion": "1.2.0",
            "name": "Hub genes",
            "namespace": "hubs",
            "requires": {
                "attributes": [
                    {
                        "slot": "weight",
                        "element": "edge",
                        "name": "weight",
                        "nameHints": ["combined_score"],
                        "level": "quantitative",
                        "role": "weight",
                        "weightRole": "similarity"
                    }
                ]
            },
            "steps": [
                {
                    "id": "pagerank",
                    "command": {
                        "op": "algo.run",
                        "algorithm": "pagerank",
                        "as": "score",
                        "params": { "weight": { "$attribute": "weight" } },
                        "scope": "largest-component",
                        "style": false
                    }
                }
            ]
        }
    ],
    "style": {
        "kind": "graphty-style",
        "version": 1,
        "layers": [
            {
                "id": "hub-size",
                "name": "Size by hub score",
                "target": "node",
                "kind": "encoding",
                "selector": { "match": "has", "path": "results.score.value" },
                "encode": { "node.size": { "by": "results.score.value", "scale": "sqrt", "range": [1, 3] } }
            }
        ]
    }
}
```

Opened on a new network with the caller's instruction to run: the recipe binds `weight` to the
graph's weight column, the caller confirms the similarity role, PageRank runs as `hubs__score`,
the style's paths are rewritten to `results.hubs__score.value`, and the layer paints. Saved again as
a project, the recipe still says `as: "score"` and the style still reads `results.score.value`;
the namespace is recorded in the recipe's `application` block.

### A small project with inline data

`W09.yaml`: a link chart shared between two investigators, with the data, how to read it, a view and
the notes.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "createdAt": "2026-09-21T10:00:00Z",
    "name": "Case 4471 link chart",
    "handling": [{ "marking": "law-enforcement sensitive", "note": "Do not forward outside the task force." }],
    "data": {
        "format": "csv",
        "inline": "source,target,relation\nP-1,P-2,phone\nP-2,P-3,finance\n",
        "digest": "sha256:5e45645fa23764638ba55bc05f067536b56aa3e3b775e1a893954d0e0f43d2be",
        "bytes": 53
    },
    "dataPlan": {
        "kind": "graphty-data-plan",
        "version": 1,
        "knownFields": { "edgeSrcIdPath": "source", "edgeDstIdPath": "target" },
        "directed": false,
        "attributes": [{ "element": "edge", "name": "relation", "level": "categorical" }]
    },
    "view": {
        "kind": "graphty-view",
        "version": 1,
        "initial": "all",
        "views": [{ "id": "all", "name": "Whole chart", "mode": "2d", "framing": { "cameraView": "fitToGraph" } }]
    },
    "annotations": {
        "kind": "graphty-annotations",
        "version": 1,
        "notes": [
            {
                "id": "note_01K5M3Q8Z0A1B2C3D4E5F6G7H8",
                "target": { "node": "P-2" },
                "text": "Broker between the two cells.",
                "createdAt": "2026-09-21T09:58:00Z",
                "updatedAt": "2026-09-21T09:58:00Z",
                "digest": "sha256:78f6695c78bb6a9a41ad65e3a597bf8011d2354345338d3d98a3d2839524d664"
            }
        ]
    }
}
```

### A network with a joined expression table

`W20.yaml`: the STRING edge list and the differential-expression table in one envelope, joined on
the gene symbol.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "createdAt": "2026-09-27T12:00:00Z",
    "name": "TP53 neighbourhood with DE results",
    "data": {
        "format": "csv",
        "url": "string_interactions.tsv",
        "options": { "delimiter": "\t" },
        "inputs": {
            "expression": {
                "url": "de_results.csv",
                "options": { "delimiter": "," },
                "provenance": { "source": "GEO", "release": "GSE12345", "license": "CC0-1.0" }
            }
        }
    },
    "dataSource": {
        "source": "STRING",
        "release": "v12.0",
        "retrievedAt": "2026-09-26T08:00:00Z",
        "query": { "species": 9606, "requiredScore": 700 },
        "license": "CC-BY-4.0"
    },
    "dataPlan": {
        "kind": "graphty-data-plan",
        "version": 1,
        "knownFields": { "edgeSrcIdPath": "#node1", "edgeDstIdPath": "node2", "edgeWeightPath": "combined_score" },
        "joins": [{ "input": "expression", "key": "gene", "match": "exact", "onDuplicate": "error" }]
    }
}
```

Opened from a folder holding all three files, with the application passing them as `files`, the
import report lists the join's matched, unmatched and duplicate counts and the unmatched gene ids
(the `#node1` header depends on the graph-io change data-plan.md describes). The TSV's tab
delimiter does not carry over to the expression table, which has its own options. Saved as a
project, the two files are written back byte for byte with their digests and this plan, joins
included.
