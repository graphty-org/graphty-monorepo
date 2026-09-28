# Annotations

`kind: "graphty-annotations"`, version 1. Schema: [annotations.schema.json](annotations.schema.json)
(normative for structure). Shared conventions are in [README.md](README.md).

## Purpose

Annotations are a reader's notes about a graph, kept apart from the graph so the data stays
immutable. The owner: "there needs to be an annotation function where users can put notes on nodes
and edges" (2026-09-04), and "annotations, which are notes that are independent from the data so
that the data can remain immutable" (2026-09-19). He listed "annotations / notes" among the types of
exports and imports on 2026-09-27.

They serve the investigator who has "no way to bookmark or annotate findings" and has "difficulty
documenting evidence for links" (`design/designloom/personas/intelligence-analyst.yaml`;
`design/designloom/workflows/W06.yaml`, Fraud Ring Investigation; `W09.yaml`), the analyst writing
a findings report whose notes carry the argument (`W15.yaml`), and the lab that annotates each
cluster with its function (`W21.yaml`, Cluster and Functionally Annotate a Molecular Network).

### A standalone file

The design studio rejected a notes-only file, on the ground that notes keyed by element ids mean
something only on the same data, so "a notes profile keyed by element id would be a second, weaker
project format" (`design/ui/framework/conceptual-model.md` section 8). This specification offers
the standalone document anyway, because the owner named annotations as an independent file type,
and answers the studio's concern with a binding rule: a note binds only to an element with the same
identity, and one that finds none is kept as orphaned, never dropped and never attached elsewhere.
Two analysts holding the same data can exchange notes without exchanging a project. Whether to keep
this is an open decision (README).

The model is the element API design's `Note` (`design/element-api/element-api-design.md` section
4.15.3), which graphty-element does not yet implement, with these additions: notes on the graph, on
groups (one cluster of a clustering run, or a kept set) and on definitions (runs and style layers),
which the design studio asks for ("red is our lab's colour for down-regulated"); quotes and
citations, which a findings report needs; a stable edge reference, because the element's edge ids
are a session counter that restarts on every load; and a status, revisions and a digest, which an
evidence chain needs. The W3C Web Annotation model (body, target, selector, provenance) is the shape
these follow, without its JSON-LD serialization.

### Not in scope

Canvas marks -- text boxes at a screen position, callouts with leader lines, highlight rectangles
and polygons, z-order -- which the designloom annotation capability describes
(`design/designloom/capabilities/annotation.yaml`), are presentation, not notes. They are not in
version 1; the recommendation is that they join the view document when views grow presentation
content. A note's target may be a point in scene space, which covers "a note about this empty
region". Until callouts exist, a label on a cluster reaches the canvas through a style layer that
labels that cluster's members, while the note carries the text and the reasoning.

## Data model

```ts
interface AnnotationSet {
  kind: "graphty-annotations";
  version: 1;
  name?: string;
  fingerprint?: string;          // the graph the notes were written on (topology only)
  dataDigest?: string;           // "sha256:<hex>" of the data bytes the notes were written against
  generator?: { name: string; version: string };
  // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
  notes: Note[];                 // order is meaningful: it is the reading order a report uses
  extensions?: Record<string, unknown>;
}

interface Note {
  id: string;                    // unique in the document; RECOMMENDED "note_<rest>"
  target: NoteTarget;
  text: string;                  // plain text; see "Security"
  tags?: string[];               // default []
  author?: string;
  createdAt: string;             // RFC 3339 date-time
  updatedAt: string;             // RFC 3339 date-time, >= createdAt
  status?: "open" | "confirmed" | "cleared" | "retracted";   // default "open"; open enumeration
  quotes?: { path: string; value: unknown; at?: string }[];   // values the note quotes
  cites?: string[];              // run ids the note cites
  digest?: string;               // "sha256:<hex>" of the note's canonical content (below)
  revisions?: { text: string; status?: string; updatedAt: string; author?: string; digest?: string }[];
  orphaned?: { since: string; lastTarget: string };
  importedFrom?: { document: string; digest: string; at: string };   // stamped by the applier
  userData?: Record<string, unknown>;   // round-trips untouched
  extensions?: Record<string, unknown>;
}

type NoteTarget =
  | { node: string | number }
  | { edge: EdgeMember }         // graphty-element's stable edge identity, reused unchanged
  | { group: { run: string; field?: string; value: string | number; members?: (string | number)[] } }
  | { set: string }              // a kept set (envelope.md, "Kept sets")
  | { point: [x: number, y: number, z: number] }   // scene units
  | { graph: true }
  | { run: string; recipe?: string }   // a run id, or a recipe's `as` when `recipe` names the recipe id
  | { layer: string };           // a style layer's authored id, else its name
```

`EdgeMember` is graphty-element's published type (`graphty-element/src/catalog/types.ts`), not a
second declaration: `source` and `target` are required, plus exactly one of `id` (string or number)
or `ordinal` with `among`. Its `key` member is reserved by the element and refused until the element
reads one, so these documents do not use it.

```ts
// for reference; declared in graphty-element
interface EdgeMember { source: NodeId; target: NodeId; id?: string | number; key?: string | number;
                       ordinal?: number; among?: number }
```

### Targets

- **Nodes** are referred to by the id the graph gives them, compared after the import's id
  coercion (README, "Applying a document to new data"): with `canonical` coercion `"1042"` and
  `1042` are one node. With typed identity (data-plan.md, "Node types") the id is the qualified
  `"<type>:<id>"`.
- **Edges** are referred to by `EdgeMember`, never by graphty-element's session edge counter,
  which restarts on every load and would re-attach a saved note to a different edge with no error.
  The identity is the data's edge id when it has one (the plan's `edgeIdPath`); otherwise source,
  target, the edge's position among the edges of that pair counting from 0 in ingest order
  (`ordinal`), and the pair's edge count (`among`). On an undirected graph a reference matches the
  pair in either order. A reference binds only when exactly one edge matches. An ordinal is the last
  resort: if the next file lists the same pair's edges in a different order with the same count, it
  binds to a different edge, so a note bound by ordinal is reported as a notice, and a writer SHOULD
  prefer data with edge ids for evidence. Adding the edge's predicate to `EdgeMember` is open
  decision 13.
- **Groups** are one value of a partition-shaped run -- one cluster of a clustering run -- or a kept
  set. A group target records the run, the field (default: the run's partition field, `group` for
  community algorithms), the value, and SHOULD record the members it had when written. When the run
  is recomputed, cluster numbering may change, so binding by value alone would silently describe a
  different cluster: when `members` is present, the note binds to the value of the current run
  whose members overlap the recorded ones best (Jaccard index at least 0.5), reported as rebound if
  the value changed; below that it is orphaned. A set target binds to the kept set of that id.
- **Points** are positions in scene units. They bind to nothing and always apply; when the
  fingerprint differs or a layout ran after the notes were written, point notes are reported as
  authored for another layout, as stored cameras are.
- **The graph**, **a run** and **a style layer** are the "notes on definitions" the design studio
  describes. A run id MUST be author-assigned; a derived id is refused at write time with
  `E_UNSTABLE_RUN_ID`. A run target with `recipe` names the recipe's own `as` and binds to that
  recipe's application in the session whatever namespace it received.
- **Points** are positions in scene units. They bind to nothing and always apply.
- **The graph**, **a run** (by its author-assigned id) and **a style layer** are the "notes on
  definitions" the design studio describes. A run id MUST be author-assigned; a derived id is
  refused at write time with `E_UNSTABLE_RUN_ID`.

A note is never about another note.

## Writing

1. `session.notes.toDocument()` (designed, not built) writes every note in the session, in list
   order, with `dataDigest` when the data's bytes are known. It MUST NOT write `fingerprint` until a
   scheme is approved (README).
2. A writer MUST write edge targets as `EdgeMember`, never as a session edge id.
3. A writer MUST keep `orphaned` notes and write them with their stamp, and MUST keep
   `importedFrom` and `revisions`.
4. Timestamps MUST be RFC 3339 with an explicit offset (UTC `Z` RECOMMENDED).
5. A writer MUST write `digest` on every note it writes: the RFC 8785 SHA-256 of the note's
   **content**, which is `target`, `text`, `tags` (as a sorted set), `status`, `author`, `quotes`
   and `cites`. `updatedAt`, `orphaned`, `importedFrom`, `userData`, `extensions` and `revisions`
   are not content. An edit moves the previous text, status, time, author and digest into
   `revisions` (append-only), so the note's history travels with it and a later signature scheme
   has something to sign.
6. Inside an envelope saved from a session that applied a recipe, run targets, `cites` and
   `results.*` quote paths are written with the recipe's own `as` (recipe.md, "Saving an applied
   recipe").

## Reading and applying

1. Notes are merged by `id`, comparing content as defined under "Writing" rule 5. A note whose
   `id` is not held is added. A note whose `id` is held with identical content is a no-op. A note
   whose `id` is held with different content follows the applier's `onConflict` option:
   `"keep-both"` (the default) adds it under a new id and reports both ids as renamed, so a person
   can reconcile them; `"newer"` replaces the held note when the incoming `updatedAt` is later,
   moving the held version into `revisions`, and otherwise keeps the held note and reports the
   incoming one. A retraction travels as `status: "retracted"`, never as a deletion, so a merge can
   never bring back a note a colleague cleared.
2. Each note binds its target:
   - node and edge targets bind to the one element with that identity;
   - a run target binds to the run with that id (in an envelope with a recipe, after the recipe's
     namespacing has been applied to the target, `cites` and quote paths, recipe.md);
   - a group or set target binds as "Targets" describes;
   - a layer target binds to the layer with that authored id, else that name;
   - a point or the graph always binds.
3. A note whose run target will be produced by the recipe of the same envelope, or by a recipe
   already applied and not yet run, is **pending**: listed in `needsRerun`, not orphaned, and binds
   when the run completes. Opening a project without re-running its analysis therefore never marks
   its notes on results as orphaned.
4. A note whose target does not bind otherwise is added with `orphaned: { since, lastTarget }`,
   still listed, and reported in the binding report's `disabled` list with `E_UNKNOWN_ELEMENT` for a
   missing element, `E_UNKNOWN_SET` for a missing set, `E_UNKNOWN_RUN` for a missing run and
   `E_UNKNOWN_LAYER` for a missing layer. It is never dropped. This is the element API design's
   rule for notes whose target leaves the graph: "kept and reported, never dropped".
5. Binding is always attempted from `target`, whatever the stamp says: a note carrying an
   `orphaned` stamp whose target binds has the stamp cleared and is reported as rebound.
6. When a note binds, each quote whose path resolves on its target (a node, an edge, or for a run
   target the run's graph-level fields) is re-read; a current value that differs from the quoted
   one is reported with both values (`W_STALE_QUOTE`), and the note is kept and shown with the
   warning. A quote on a point, the graph or a layer is not checked.
7. A note that fails the schema is kept verbatim, not bound, reported with `E_BAD_COMMAND`, and
   written back on save; the others apply.
8. Every note added from a document is stamped `importedFrom: { document, digest, at }` (the
   document's name and RFC 8785 SHA-256, and the time), which the session keeps and every writer
   writes back, so imported findings stay distinguishable from the reader's own.
9. The document's fingerprint is compared and reported (`match`, `differs`, `unknown`). A `differs`
   result does not stop binding: notes whose ids exist on the new data bind, the rest orphan.
10. Applying annotations MUST NOT change the graph, its attributes, or any style layer other than
   the element's own note-marker layer.

## Security

1. `text`, `tags`, `author` and quoted values are plain text. A renderer MUST display them as text
   and MUST NOT interpret them as HTML or Markdown that can load resources or run script. A
   consumer that renders Markdown does so at its own risk and MUST sanitize.
2. Notes may carry sensitive judgements ("suspect", "confirmed ring member"). A writer SHOULD let
   the caller choose which notes to write (by tag, author or target). Notes are not written into a
   data export, an export sidecar or a document saved with `purpose: "share"` unless the caller asks
   (export-mapping.md; envelope.md, "Saving"); a document's `handling` marking is shown before any
   re-save or export.
3. `author` is a claim, not an authenticated identity; `digest` and `revisions` detect a change
   made through a writer, not one made with a text editor, until signatures exist (open decision
   21).

## Conformance

| Input | Required result |
|---|---|
| a note on `{ "node": "ACC-1042" }` where that node exists | bound |
| a note on `{ "node": "ACC-9999" }` where it does not | added orphaned; reported; still listed |
| a note on `{ "node": "1042" }` on a graph imported with `canonical` coercion whose node id is the number 1042 | bound |
| a note on `{ "node": "01" }` where the node id is the number 1 | orphaned: `"01"` stays text under `canonical` |
| a note on `{ "edge": { "source": "A", "target": "B", "ordinal": 1, "among": 2 } }` where the pair has 3 edges | orphaned: the count no longer matches, so no edge is guessed |
| an edge target with `key` | fails the schema; kept verbatim, reported |
| two notes with the same `id` in one document | the second is reported and added under a new id |
| an incoming note whose `id` is held with different text, default options | added under a new id; both ids reported; the held note unchanged |
| the same, `onConflict: "newer"`, incoming `updatedAt` later | the held note replaced; its previous version in `revisions` |
| an incoming note with `status: "retracted"` for a held open note, `onConflict: "newer"` | the held note becomes retracted; it is not deleted |
| `text` containing `<img src=x onerror=...>` | stored and displayed as those characters |
| a note on `{ "run": "rings" }` in an envelope whose recipe step has `as: "rings"`, applied with namespace `fraud` | target, `cites` and quote paths rewritten to `fraud__rings`; bound |
| a standalone notes file with `{ "run": "rings", "recipe": "org.example.fraud" }`, applied after that recipe ran with namespace `fraud-2` | bound to `fraud-2__rings` |
| a project opened without running its recipe; a note on `{ "run": "modules" }` | pending, listed in `needsRerun`; no `orphaned` stamp written |
| a note carrying `orphaned` whose node exists again | bound; stamp cleared; reported as rebound |
| a group note on cluster 3 of `modules` with recorded members, after a re-run renumbers it to 5 | bound to cluster 5; reported as rebound |
| a note quoting `data.risk_score` 0.91 on a node whose value is now 0.12 | bound; `W_STALE_QUOTE` with both values |

## Worked examples

### Evidence notes in a fraud investigation

`W06.yaml`: a ring of accounts sharing devices, with the analyst's findings and a quoted value.

```json
{
  "kind": "graphty-annotations",
  "version": 1,
  "name": "Ring A findings",
  "dataDigest": "sha256:9b1d0e6a3c5f7e2d4b8a1c0f9e7d6c5b4a3928170f6e5d4c3b2a1908f7e6d5c4",
  "handling": { "marking": "internal", "note": "Evidence notes; do not forward outside the fraud team." },
  "notes": [
    {
      "id": "note_01",
      "target": { "node": "ACC-1042" },
      "text": "Opened the same day as ACC-1043 and ACC-1044 from one device.",
      "tags": ["suspect", "ring-a"],
      "status": "open",
      "author": "j.rivera",
      "createdAt": "2026-09-20T14:02:11Z",
      "updatedAt": "2026-09-20T14:02:11Z",
      "quotes": [{ "path": "data.risk_score", "value": 0.91 }]
    },
    {
      "id": "note_02",
      "target": { "edge": { "source": "ACC-1042", "target": "DEV-77", "id": "login-2026-09-18" } },
      "text": "First shared login; the chargebacks start 36 hours later.",
      "tags": ["evidence"],
      "author": "j.rivera",
      "createdAt": "2026-09-20T14:10:40Z",
      "updatedAt": "2026-09-21T09:00:00Z"
    },
    {
      "id": "note_03",
      "target": { "run": "rings" },
      "text": "Louvain at resolution 1.0 separates ring A from the merchant cluster; 0.5 does not.",
      "cites": ["rings"],
      "createdAt": "2026-09-21T09:30:00Z",
      "updatedAt": "2026-09-21T09:30:00Z"
    }
  ]
}
```

### Notes on definitions for a shared lab style

`W21.yaml`: notes that explain a style's choices travel with the style to other datasets. They
target layers, so they bind wherever the style is applied.

```json
{
  "kind": "graphty-annotations",
  "version": 1,
  "notes": [
    {
      "id": "note_colour",
      "target": { "layer": "logfc" },
      "text": "Red is up-regulated, blue down; the scale is clamped at |logFC| = 3.",
      "createdAt": "2026-09-19T10:00:00Z",
      "updatedAt": "2026-09-19T10:00:00Z"
    }
  ]
}
```

### Cluster labels

`W21.yaml` (Cluster and Functionally Annotate a Molecular Network): each MCL cluster named with its
top enrichment term, bound to the cluster by its members so the label follows it when MCL is re-run.

```json
{
  "kind": "graphty-annotations",
  "version": 1,
  "notes": [
    {
      "id": "note_c2",
      "target": { "group": { "run": "modules", "value": 2, "members": ["RPL5", "RPL11", "NOP56", "FBL"] } },
      "text": "Ribosome biogenesis (GO:0042254, FDR 1e-12).",
      "tags": ["cluster-label"],
      "createdAt": "2026-09-22T10:00:00Z",
      "updatedAt": "2026-09-22T10:00:00Z"
    }
  ]
}
```
