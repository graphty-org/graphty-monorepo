# Envelope

`kind: "graphty-document"`, version 1. Schema: [envelope.schema.json](envelope.schema.json)
(normative for structure; it refers to the five member schemas by their `$id`). Shared conventions
are in [README.md](README.md).

## Purpose

The envelope is "one file that combines any of the above" (the owner, 2026-09-19): any subset of a
data file, a data plan, a style, a recipe, a view document and annotations, in one file a person can
hand to a colleague. Its combinations are the cases the owner and the personas name:

| Members | What a person calls it | Who needs it |
|---|---|---|
| style | a style file | a lab's publication look (`design/designloom/workflows/W20.yaml`) |
| recipe + style | a starting point | "communities share starting points without sharing their data" (the owner, 2026-09-27) |
| recipe + style + view | a workspace | a team's standard investigation layout (`W06.yaml`) |
| data + data plan | a dataset with its reading instructions | data import and validation (`W18.yaml`) |
| data + annotations | shared findings on shared data | two investigators on one case (`W09.yaml`) |
| all six | a project | "one file that holds every network ..., their attribute tables, styles, layouts, results, filters and annotations" (`W25.yaml`, Reproducible Session and Network Publication) |

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
  createdAt: string;                   // RFC 3339 date-time
  name?: string;
  description?: string;
  generator?: { name: string; version: string };   // e.g. graphty-element 3.1.0
  fingerprint?: string;                // the graph the members were authored against
  data?: DataMember;
  dataPlan?: DataPlan;                 // data-plan.md
  style?: StyleDocument;               // style.md
  recipe?: Recipe;                     // recipe.md
  view?: ViewDocument;                 // view-preset.md
  annotations?: AnnotationSet;         // annotations.md
  extensions?: Record<string, unknown>;
}

interface DataMember {
  format: string;                      // a format id from the element's catalogue
  inline?: string;                     // exactly one of inline, url, part
  url?: string;
  part?: string;                       // a path inside a zip container
  digest?: string;                     // "sha256:<64 hex>" of the bytes
  bytes?: number;
  options?: Record<string, unknown>;   // format-specific import options
}
```

Each member is a complete document of its kind, with its own `kind` and `version`, so it can be
lifted out and saved as a file of its own unchanged. A member's `kind` MUST match the member it sits
in (a style member of `kind: "graphty-style"` or, for version 1 styles only, no `kind`); a mismatch
skips that member. Each member's version is independent of the envelope's.

### The data member

`inline` holds the whole data file as text, in the named format; `url` names it; `part` names a
member of the zip container (below). `digest` lets a reader tell whether the data at a URL is the
data the members were written against. `options` are the format's import options, so a CSV with a
semicolon delimiter or a JSON file in the Cytoscape dialect re-opens identically.

The data member carries the data exactly as a third-party file would. Everything graphty knows
about the data beyond that travels in the other members.

## Containers

Two containers are recommended; which to adopt is an open decision (README, "Open decisions",
container):

1. **A JSON file** (`.graphty.json`, `application/vnd.graphty+json`): the envelope is the whole
   file. The data member, if any, is `inline` text or a `url`. This is the form for style files,
   recipes, starting points, workspaces and small projects, and the form a person can read, diff
   and write by hand, which the expert persona requires
   (`design/designloom/personas/expert-emma.yaml`).
2. **A zip archive** (`.graphty`, `application/vnd.graphty.project+zip`): a file named
   `manifest.json` at the root holds the envelope; the data member is a `part` naming another file
   in the archive, which MAY be graph-format's binary wire form (format id `graph-format`). This is
   the design studio's recommendation for project files (`design/ui/framework/one-way-doors.md`
   door 1), measured at 18 MB and 6 ms to write a 100,000-node, 500,000-edge graph as graph-format
   bytes against 58 MB and about 290 ms as JSON. Every other part of the archive is named by the
   manifest; a reader ignores files the manifest does not name.

A reader distinguishes the two by content, not by name: a zip archive begins with the bytes
`PK\x03\x04`; a JSON document begins, after optional whitespace, with `{`.

The autosave graphty-element writes (the design studio's door 88: a format version, the writer's
version, sections named by namespace, unknown sections kept and written back, committed state only)
SHOULD be this envelope, so that an autosaved project and a downloaded one are one format:
`version` is the format version, `generator` the writer, members and `extensions` the namespaced
sections, and the unknown-members rule keeps what a reader does not know.

## Opening

`data.openDocument(src, { members? })` (designed in the element API design; not yet built) opens an
envelope. A reader MUST:

1. Refuse a top level that is not a `graphty-document` object with an integer `version` and a
   `createdAt`, with `E_BAD_COMMAND`; refuse an envelope `version` it does not read with the
   unreadable-version error.
2. Consider only the members named by the caller's `members` filter, when given. The others are
   reported as not requested.
3. Validate each member against its own kind's schema, independently. A member that fails is
   skipped and reported with its code; the rest continue.
4. Apply the members in this order: `dataPlan`, `data`, `recipe`, `style`, `view`, `annotations`.
   - The data plan applies to the import of the data member that follows it. A data plan with no
     data member is kept for the next import.
   - When a data member is present and fails to load, the members that bind to data (recipe,
     style, view, annotations) MUST NOT be applied to whatever graph the session held before; they
     are reported as skipped because the data they accompany did not load, and returned parsed so
     the caller can apply them deliberately. This refines the design's "one member failing never
     fails the open": the open still succeeds and reports, but nothing is bound to the wrong graph.
   - The recipe is bound and planned but runs only if the caller asks (recipe.md, "Consent"). Its
     namespacing is fixed before the style applies, so the style's `results.<id>` paths and the
     annotations' run targets are rewritten to the namespaced ids.
   - The style applies next. Layers bound to recipe runs that have not run are reported in
     `needsRerun` with the recipe step's estimate.
   - The view applies after the layout the recipe may set; the annotations apply last, when their
     targets exist.
5. Compare the envelope's `fingerprint` (and each member's own, when present) with the loaded
   graph's and report `match`, `differs` or `unknown`. Never refuse on a difference.
6. Return a document report:

```ts
interface DocumentReport {
  applied: DocumentMember[];
  members: Partial<Record<DocumentMember, BindingReport>>;
  skipped: { member: DocumentMember | string; reason: string; code: GraphtyErrorCode }[];
  fingerprint: "match" | "differs" | "unknown";
}
type DocumentMember = "data" | "dataPlan" | "style" | "recipe" | "view" | "annotations";
```

An unknown top-level member is reported in `skipped` by name ("not read by this version") and
preserved if the envelope is re-saved without being applied.

### Fetching

A `url` data member is fetched only with the caller's consent to that host. Opening from a file a
person chose, with the data inline or in the archive, needs no further consent. A relative `url` is
resolved against the envelope's own location when the envelope was itself fetched from a URL, and is
refused otherwise. A fetched file whose SHA-256 differs from `digest` is reported (`differs`) and
still opened, because a data file that has been updated is the normal case for a reused recipe; a
caller that requires the exact data checks the report.

## Saving

`data.saveDocument({ members?, inlineData? })` (designed) writes an envelope from the session:

1. The writer MUST write `kind`, `version`, `createdAt` and `generator`, and SHOULD write
   `fingerprint` when a graph is loaded.
2. It writes the members the caller names; the default is every member the session has content for
   except `data`.
3. With `inlineData`, it writes the data member inline through graph-io's exporter for the chosen
   format (default: the format the data was loaded from when graph-io can write it, else GEXF, which
   keeps typed attributes and positions), and writes `digest` and `bytes`. It MUST report the loss
   notes of that export (export-mapping.md). For the zip container it writes graph-format's wire
   form, which is lossless.
4. Each member is written by its own kind's writer, with the same rules (a style refuses derived run
   ids; annotations write stable edge references).

## Upgrading the 1.x template

A 1.x style template is upgraded on read to an envelope as style.md ("Upgrading the 1.x style
template") specifies. The upgrade report lists every 1.x member that has no home in version 1 (the
background, the selection style, the behaviour settings), so nothing is dropped silently.

## What version 1 does not hold

These have no member yet. Each can be added as an optional member later without a new envelope
version, under the unknown-members rule; the names are reserved now.

| Reserved member | For | Status |
|---|---|---|
| `sets` | kept sets and paths, whose stored form the sets design defers to "the first project file" (`design/sets/sets-design.md`) | open |
| `config` | the element's configuration document (`ConfigDocument`, element API design 4.12) | open |
| `graphs` | several graphs in one document, which the condition-comparison workflow needs (`W24.yaml`: two conditions and a merged network) | open, and a one-way door: moving from one graph to a list later gives every stored reference a graph id it was written without (design studio door 2) |
| `results` | computed results without re-running them | open; a project needs it, a recipe does not |

## Security

1. Everything in README's "Trust" applies. The envelope adds one rule: a member is never applied
   because another member says so. A recipe runs only on the caller's instruction, whatever the
   envelope contains.
2. A zip reader MUST reject entry names that are absolute or contain `..` segments, MUST NOT extract
   to disk as a side effect, and SHOULD bound the total uncompressed size (RECOMMENDED 1 GB) and the
   compression ratio of each entry, so a hostile archive cannot exhaust memory.
3. `inline` data is parsed by graph-io's importers with their own limits.

## Conformance

| Input | Required result |
|---|---|
| `{ "kind": "graphty-document", "version": 1, "createdAt": "2026-09-27T12:00:00Z" }` | accepted; nothing applied |
| an envelope with a valid style and a recipe with `version: 7` | style applied; recipe skipped with the unreadable-version error |
| a member `"sets": {...}` | reported as not read by this version; preserved on re-save |
| a style member with `kind: "graphty-view"` | style member skipped |
| data `url` on another host, no consent given | data not fetched; data-bound members skipped; report says consent is needed |
| data inline, fails to parse | data-bound members skipped, not applied to the previous graph |
| envelope and graph fingerprints differ | everything binds as it can; report says `differs` |
| a zip entry `../../etc/passwd` | archive refused |

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
          "level": "quantitative", "weightRole": "similarity" }
      ]
    },
    "steps": [
      { "id": "pagerank",
        "command": { "op": "algo.run", "algorithm": "pagerank", "as": "score",
                     "params": { "weight": "weight" }, "scope": "largest-component", "style": false } }
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

Opened on a new network with the caller's instruction to run: the recipe binds `weight`, runs
PageRank as `hubs__score`, the style's paths are rewritten to `results.hubs__score.value`, and the
layer paints.

### A small project with inline data

`W09.yaml`: a link chart shared between two investigators, with the data, how to read it, a view and
the notes.

```json
{
  "kind": "graphty-document",
  "version": 1,
  "createdAt": "2026-09-21T10:00:00Z",
  "name": "Case 4471 link chart",
  "fingerprint": "g1:5e0d1c2b3a495867",
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
