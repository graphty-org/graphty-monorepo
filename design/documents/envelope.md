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

| Members | What a person calls it | Who needs it |
|---|---|---|
| style | a style file | a lab's publication look (`design/designloom/workflows/W20.yaml`) |
| recipe + style | a starting point | "communities share starting points without sharing their data" (the owner, 2026-09-27) |
| recipe + style + view | a workspace | a team's standard investigation layout (`W06.yaml`) |
| data + data plan | a dataset with its reading instructions | data import and validation (`W18.yaml`) |
| data + annotations | shared findings on shared data | two investigators on one case (`W09.yaml`) |
| everything, with `runs`, `sets` and (in the zip container) `results` | a project | the reproducible session of `W25.yaml` (Reproducible Session and Network Publication): the network, its attribute tables, style, layout, the parameter record of every run, kept sets and results. Version 1 does not hold saved filters (reported when saved, view-preset.md) or several networks (open decision 24) |

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
  createdAt: string;                   // RFC 3339 date-time; never rewritten
  modifiedAt?: string;                 // RFC 3339 date-time
  name?: string;
  description?: string;
  generator?: { name: string; version: string };   // e.g. graphty-element 3.1.0
  fingerprint?: string;                // the graph the members were authored against
  features?: string[];                 // must-understand features (README, "Versioning")
  // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
  data?: DataMember;
  dataPlan?: DataPlan;                 // data-plan.md
  style?: StyleDocument;               // style.md
  recipe?: Recipe;                     // recipe.md
  view?: ViewDocument;                 // view-preset.md
  annotations?: AnnotationSet;         // annotations.md
  runs?: RunRecord[];                  // below, "Run records"
  sets?: KeptSet[];                    // below, "Kept sets"
  results?: StoredResult[];            // below, "Stored results"; zip container only
  extensions?: Record<string, unknown>;
}

interface DataMember {
  format: string;                      // a format id from the element's catalogue, or "graph-format" in a zip
  inline?: string;                     // exactly one of inline, url, part
  url?: string;
  part?: string;                       // an entry of the zip container; refused outside one
  digest?: string;                     // "sha256:<64 hex>" of the bytes
  bytes?: number;
  options?: Record<string, unknown>;   // import options the format declares; see "Options"
  inputs?: Record<string, DataInput>;  // further named inputs of the importer; see "Several inputs"
  provenance?: {
    source?: string;                   // "STRING", "HR extract"
    release?: string;                  // "v12.0"
    retrievedAt?: string;              // RFC 3339
    query?: Record<string, unknown>;   // { species: 9606, requiredScore: 700 }
    citation?: string;
  };
}

interface DataInput {
  inline?: string; url?: string; part?: string;   // exactly one
  format?: string;                     // default: the data member's format
  digest?: string;
  bytes?: number;
}
```

Each of the five document members is a complete document of its kind, with its own `kind` and
`version`, so it can be lifted out and saved as a file of its own unchanged. A member's `kind` MUST
match the member it sits in (a style member of `kind: "graphty-style"` or, for version 1 styles
only, no `kind`); a mismatch skips that member. Each member's version is independent of the
envelope's.

### The data member

`inline` holds the whole data file as text, in the named format; `url` names it; `part` names an
entry of the zip container (below). `digest` lets a reader tell whether the data it read is the data
the members were written against. `provenance` records where the data came from -- the source, its
release, when it was retrieved and the query that produced it -- which a methods section reports
and which a colleague reapplying a starting point needs to fetch comparable data.

The data member carries the data exactly as a third-party file would. Everything graphty knows
about the data beyond that travels in the other members.

### Options

`options` may carry only the import options the named format declares in the element's format
catalogue, validated against those option descriptors; an undeclared or invalid option skips the
data member with `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`. Inputs the element owns -- `url`, `data`,
`file`, `filename`, `size`, `chunkSize`, `errorLimit` -- MUST be refused in a document, because
they would let a document fetch a URL without consent or disable the importer's error limit.
Options that multiply the graph's size (graph-io's hyperedge expansion `hyperedges: "clique"` or
`"star"`) are the caller's choice only and are refused in a document. Whatever the options, the
reader applies a node and edge count limit after any expansion (RECOMMENDED defaults: 5,000,000
nodes and 50,000,000 edges, raisable by the caller) and refuses the data member with `E_TOO_LARGE`
beyond it.

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

`runs` records what actually ran: one entry per run whose results the session holds, in the order
they ran. A recipe is a plan and cannot say what happened; a methods section, a reviewer and a
reproduction need what happened. The shape is graphty-element's `RunRecord`
(`graphty-element/src/session/runs/types.ts`) in renderer-neutral form:

```ts
interface RunRecord {
  id: string;                          // the run id as it exists in the session (namespaced)
  algorithm: string;                   // the current catalogue key (README, "Identifiers" rule 4)
  params: Record<string, unknown>;     // EVERY option, defaults filled in, canonicalised
  seed: number | null;                 // the effective seed, also when the caller gave none
  scope: { requested: unknown; nodes: number; edges: number };   // counts, never element ids
  startedAt: string;                   // RFC 3339
  durationMs: number;
  engine: {                            // graphty-element's EngineVersions
    element: string; algorithms?: string; layout?: string;
    plugins?: Record<string, string>;  // package name -> version, for extension keys
    layoutEngine?: string;             // the engine behind a semantic layout id
  };
  outcome: {
    exact: boolean;
    sampleSize?: number;
    converged?: boolean;
    iterations?: number;
    method?: string;
    precision: "f32" | "f64";
    partial: boolean;
  };
  weight?: { attribute: string; role: "distance" | "similarity" | "capacity"; confirmed: boolean };
  bindings?: Record<string, string>;   // recipe slot -> the attribute it bound to
  recipe?: { id: string; recipeVersion?: string; digest: string; step: string; as: string; namespace: string };
  fields: { name: string; type: string; role?: string }[];
}
```

1. A writer that writes a project (below) MUST write `runs`. The export sidecar writes it too
   (export-mapping.md).
2. `recipe.digest` is the RFC 8785 SHA-256 of the canonical form of the recipe as applied, before
   binding. It is REQUIRED on every run a recipe produced, so "the recipe I cite" can be checked
   against "the recipe that ran".
3. A reader never re-runs anything because of `runs`. It uses them to report provenance, to fill
   the methods text (recipe.md), to give stored results their meaning, and to compare a
   reproduction (recipe.md, "Reproducing").

## Kept sets

`sets` holds the sets a reader kept by hand -- a hub list, a ring of accounts -- which styles
(`member` selectors), view framings and note targets refer to. The sets design defers their stored
form to "the first project file" (`design/sets/sets-design.md`); this is that form.

```ts
interface KeptSet {
  id: string;                          // what selectors, framings and notes name
  name: string;
  description?: string;
  nodes?: (string | number)[];         // node ids, compared after the import's id coercion
  edges?: EdgeMember[];                // graphty-element's stable edge identity, never session edge ids
  extensions?: Record<string, unknown>;
}
```

A set names elements of its data, so a writer with `purpose: "share"` leaves it out.

## Stored results

`results` holds computed results so that a project reopens with its results without re-running
them, and notes, styles and view framings on those results bind at once. It exists only in the zip
container: each entry names a part holding graph-format's binary wire form with one column per
published field, keyed by the graph's node (or edge) id column.

```ts
interface StoredResult { run: string; part: string; digest?: string }
```

A stored result whose run has no entry in `runs` is refused, because its numbers would have no
parameters. In the JSON container results are not stored: reopening restores them only by running
the recipe, and the reader reports them in `needsRerun`.

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
4. Apply the members in this order: `dataPlan`, `data`, `sets`, `results`, `recipe`, `style`,
   `view`, `annotations`.
   - The data plan applies to the import of the data member that follows it. A data plan with no
     data member is kept for the next import.
   - **When the data plan is refused** (data-plan.md, "Applying" rule 5, an unknown member of
     `knownFields`, or typed identity this reader does not implement), the data member MUST NOT be
     imported with defaults: it is reported as skipped because its reading instructions were
     unreadable, and so is every member that binds to data. Importing it anyway would build the
     different graph the refusal exists to prevent. The caller may import it deliberately.
   - When a data member is present and fails to load, the members that bind to data (sets,
     results, recipe, style, view, annotations) MUST NOT be applied to whatever graph the session
     held before; they are reported as skipped because the data they accompany did not load, and
     returned parsed so the caller can apply them deliberately. This refines the design's "one
     member failing never fails the open": the open still succeeds and reports, but nothing is
     bound to the wrong graph.
   - The recipe is bound and planned but runs only if the caller passes `run: true` (recipe.md,
     "Consent"). When the recipe carries an `application` block (recipe.md, "Saving an applied
     recipe"), the recorded namespace, slot bindings, confirmed weight roles and argument values
     are restored rather than re-derived, so a saved project reopens with the same run ids. The
     style's `results.<as>` paths, and the annotations' run references, are then rewritten to
     the namespaced ids (recipe.md, "Identity and namespacing").
   - The style applies next. Layers bound to recipe runs that have not run and have no stored
     result are reported in `needsRerun` with the recipe step's estimate.
   - The view applies after the layout the recipe may set; the annotations apply last, when their
     targets exist. A note on a run the recipe will produce is pending, not orphaned
     (annotations.md).
5. Compare the envelope's `fingerprint` (and each member's own, when present) with the loaded
   graph's and report `match`, `differs` or `unknown`. Never refuse on a difference.
6. Return a document report:

```ts
interface DocumentReport {
  applied: DocumentMember[];
  members: Partial<Record<DocumentMember, BindingReport>>;
  import?: ImportReport;               // README, "Applying a document to new data"
  skipped: { member: DocumentMember | string; reason: string; code: GraphtyErrorCode }[];
  fingerprint: "match" | "differs" | "unknown";
  digest?: "match" | "differs" | "absent";
  held?: DocumentMember[];             // with applyTo: "next-import"
}
type DocumentMember = "data" | "dataPlan" | "style" | "recipe" | "view" | "annotations" | "runs" | "sets" | "results";
```

An unknown top-level member is reported in `skipped` by name ("not read by this version") and
kept under README's unknown-members rule 2. A member that carries data or changes what a stored
reference means (`graphs`, `sources`, `aliases`) arrives only with a new envelope major version, so
an old reader never applies a top-level style or notes to the wrong graph because it ignored one.

### Holding a starting point for the next import

With `applyTo: "next-import"`, the reader parses and validates the data plan, recipe, style, view
and annotations and holds them. When the next import completes, it applies them in the order above
to the new graph and returns the report then; a held recipe still runs only on the caller's
instruction. Slot bindings and weight-role confirmations recorded in the recipe's `application`
block for the same data source (the same data plan `id`) are reused, so a weekly import of the same
shape needs no re-confirmation. This is how a person picks one starting point once and applies it
to every new file of that shape.

### Fetching

1. **Relative references.** A relative `url` (of the data member or of an input) is resolved
   against the envelope's own URL when the envelope was fetched from a URL. When the envelope was
   opened from a local file, it is resolved against the caller's `files` (by file name) or the
   caller's `resolve` function; without either, the reader reports the data member as
   `E_CONSENT_REQUIRED` naming the file it needs, so an application can ask the person for the
   sibling file. A sidecar pair opened from a folder therefore works whenever the application
   passes the folder's files or asks for the named one.
2. **Schemes.** A fetched URL MUST be `https:`; `http:` only when the caller explicitly allows it.
   `file:`, `data:`, `blob:`, `javascript:` and every other scheme are refused. A scheme-relative
   reference (`//host/path`) is cross-origin and is treated as an absolute URL.
3. **Consent** is required for the origin of the resolved absolute URL, relative or not, and
   including the origin the envelope itself came from, unless the caller pre-authorised that
   origin (`consent`). Consent lasts for one open unless the caller stores it. Without consent the
   data is not fetched, and the report says consent is needed.
4. **Redirects** are followed only to an origin that also has consent, checked for each hop;
   otherwise the fetch fails. Requests are made with credentials omitted. Private, loopback and
   link-local addresses are refused unless the caller allows them, so a conversion service that
   opens user-supplied envelopes cannot be pointed at an internal address.
5. **Digests** are verified for every form of data -- inline, fetched and zip part -- and for every
   input that carries one. A mismatch is reported (`digest: "differs"`) and the data still opened,
   because an updated data file is the normal case for a reused recipe; with
   `requireDigest: true`, a mismatch refuses the data member with `E_DIGEST_MISMATCH` and every
   data-bound member is skipped, which is what an evidence file needs.

## Saving

`data.saveDocument({ purpose?, members?, inlineData?, container? })` (designed) writes an envelope
from the session.

1. The writer MUST write `kind`, `version`, `createdAt` and `generator`. It MUST NOT write
   `fingerprint` until a scheme is approved (README).
2. **Purpose.** `purpose: "project"` (the default) is a person's own save and writes every member
   the session has content for: the data, the data plan the import actually used, the recipe with
   its `application` block, style, view, annotations, `runs`, `sets`, and, in the zip container,
   `results`. `purpose: "share"` is anything meant for someone else -- a starting point, a
   workspace, a style: it writes no data, no annotations, no `runs`, no `sets`, no `results` and no
   `application` block, and it reports, before anything is written, every unit that names elements
   of the data: `ids` selectors and `member` selectors naming sets in the style, element-valued
   argument defaults in the recipe, set framings in views. The caller then removes them or
   confirms. `members` narrows either purpose.
3. **Data.** In the zip container the data is written as graph-format's wire form, which is
   lossless. In the JSON container it is written `inline` through graph-io's exporter for the
   format it was loaded from when graph-io can write it, else GEXF, which keeps typed attributes
   and positions; the writer writes `digest` and `bytes` and MUST report the loss notes of that
   export (export-mapping.md). A node table and an edge table are written as the main input and an
   input.
4. Each member is written by its own kind's writer, with the same rules (a style refuses derived
   run ids; annotations write stable edge references; the recipe and every member that refers to
   its runs are written with the recipe's own `as` names, not the namespaced ids, as recipe.md
   "Saving an applied recipe" specifies). Unknown members and extensions each unit arrived with
   are written back (README, "Unknown members" rule 2).
5. The active filter, if any, is reported as not saved (`W_GRAPHTY_FILTER`), since version 1 has
   no member for it.

**Round trip.** For a document written with `purpose: "project"`, opening it and saving it again
without changes MUST produce the same content apart from `generator` and `modifiedAt`: the same run
ids, the same paths, the same members.

## Upgrading the 1.x template

A 1.x style template is upgraded on read to an envelope as style.md ("Upgrading the 1.x style
template") specifies. The upgrade report lists every 1.x member that has no home in version 1 (the
background, the selection style, the behaviour settings), so nothing is dropped silently. A recipe
produced by the upgrade never runs without the caller's explicit instruction.

## Reserved names

| Reserved member | For | Status |
|---|---|---|
| `config` | the element's configuration document (`ConfigDocument`, element API design 4.12) | open; an optional member later |
| `graphs` | several graphs in one document (`W24.yaml`: two conditions and a merged network) | open decision 24; only with envelope version 2 unless decided before release |
| `sources` | several sources, each with its own data plan, merged into one graph | open decision 27; envelope version 2 |
| `aliases` | an identity mapping from merged ids to surviving ids | open decision 27; envelope version 2 |
| `filters` | saved filters | open; an optional member later |

## Security

1. Everything in README's "Trust" applies. The envelope adds one rule: a member is never applied
   because another member says so. A recipe runs only on the caller's instruction, whatever the
   envelope contains.
2. A zip reader MUST read the central directory only; MUST refuse duplicate entry names (compared
   case-insensitively after normalising `\` to `/`), an entry whose local header names a different
   file than the central directory, entry names that are absolute or contain `..` segments, and
   more than 10,000 entries; MUST NOT extract to disk as a side effect; and MUST bound the total
   uncompressed size (RECOMMENDED 1 GB) and the compression ratio of each entry. A `part` MUST name
   an entry exactly.
3. `inline` data is parsed by graph-io's importers under the node and edge limits of "Options".
   graph-io has no size limits of its own beyond its error limit, which a document cannot change.

## Conformance

| Input | Required result |
|---|---|
| `{ "kind": "graphty-document", "version": 1, "createdAt": "2026-09-27T12:00:00Z" }` | accepted; nothing applied |
| an envelope with a valid style and a recipe with `version: 7` | valid against the envelope schema; style applied; recipe skipped with `E_UNSUPPORTED_VERSION` |
| a member `"config": {...}` | reported as not read by this version; kept on re-save |
| a style member with `kind: "graphty-view"` | style member skipped |
| data `url` on any host, including the envelope's own, no consent given | data not fetched; data-bound members skipped; report says consent is needed |
| data `url: "//tracker.example/p.csv"` | treated as absolute; consent required for `tracker.example` |
| data `url: "file:///etc/passwd"` or `"http://169.254.169.254/"` | refused |
| a consented host answers with a redirect to an unconsented origin | fetch fails; reported |
| sidecar `network.graphty.json` opened from disk with `files` holding `network.gexf` | data resolved from the supplied file, digest verified, all members applied |
| the same, without `files` or `resolve` | data member reported `E_CONSENT_REQUIRED` naming `network.gexf`; data-bound members held, not applied to the previous graph |
| data inline, fails to parse | data-bound members skipped, not applied to the previous graph |
| a data plan refused for `repeatedEdges: "mean"` | data not imported; every data-bound member skipped |
| `data.options: { "url": "https://attacker.example" }` | data member skipped: `url` is element-owned |
| `data.options: { "hyperedges": "clique" }` | data member skipped: the caller's choice only |
| `data.part` in a JSON container | data member refused |
| inline data whose digest differs, `requireDigest: true` | data refused with `E_DIGEST_MISMATCH`; data-bound members skipped |
| envelope and graph fingerprints differ | everything binds as it can; report says `differs` |
| a project saved, opened and saved again | identical content apart from `generator` and `modifiedAt`; run ids unchanged |
| `saveDocument({ purpose: "share" })` on a session with notes and a hub set | no annotations, no sets; every `ids` or set-naming unit reported before writing |
| a zip with two entries named `manifest.json` | archive refused |
| a zip entry `../../etc/passwd` | archive refused |
| a stored result whose run is not in `runs` | that result refused |

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
  "recipe": {
    "kind": "graphty-recipe",
    "version": 1,
    "id": "org.example-lab.hub-genes",
    "recipeVersion": "1.2.0",
    "name": "Hub genes",
    "namespace": "hubs",
    "requires": {
      "attributes": [
        { "slot": "weight", "element": "edge", "name": "weight", "nameHints": ["combined_score"],
          "level": "quantitative", "role": "weight", "weightRole": "similarity" }
      ]
    },
    "steps": [
      { "id": "pagerank",
        "command": { "op": "algo.run", "algorithm": "pagerank", "as": "score",
                     "params": { "weight": { "$attribute": "weight" } },
                     "scope": "largest-component", "style": false } }
    ]
  },
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
  "handling": { "marking": "law-enforcement sensitive", "note": "Do not forward outside the task force." },
  "data": {
    "format": "csv",
    "inline": "source,target,relation\nP-1,P-2,phone\nP-2,P-3,finance\n",
    "digest": "sha256:1f0c8a4f0e3d2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6b5a4938",
    "bytes": 52
  },
  "dataPlan": {
    "kind": "graphty-data-plan",
    "version": 1,
    "knownFields": { "edgeSrcIdPath": "source", "edgeDstIdPath": "target" },
    "directed": false,
    "attributes": [ { "element": "edge", "name": "relation", "level": "categorical" } ]
  },
  "view": {
    "kind": "graphty-view",
    "version": 1,
    "initial": "all",
    "views": [ { "id": "all", "name": "Whole chart", "mode": "2d", "framing": { "cameraView": "fitToGraph" } } ]
  },
  "annotations": {
    "kind": "graphty-annotations",
    "version": 1,
    "notes": [
      { "id": "note_1", "target": { "node": "P-2" }, "text": "Broker between the two cells.",
        "createdAt": "2026-09-21T09:58:00Z", "updatedAt": "2026-09-21T09:58:00Z" }
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
    "provenance": { "source": "STRING", "release": "v12.0", "retrievedAt": "2026-09-26T08:00:00Z",
                    "query": { "species": 9606, "requiredScore": 700 } },
    "inputs": { "expression": { "url": "de_results.csv" } }
  },
  "dataPlan": {
    "kind": "graphty-data-plan",
    "version": 1,
    "knownFields": { "edgeSrcIdPath": "node1", "edgeDstIdPath": "node2", "edgeWeightPath": "combined_score" },
    "joins": [ { "input": "expression", "key": "gene", "match": "exact", "onDuplicate": "error" } ]
  }
}
```

Opened from a folder holding all three files, with the application passing them as `files`, the
import report lists the join's matched, unmatched and duplicate counts and the unmatched gene ids.
