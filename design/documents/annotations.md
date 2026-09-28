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
4.15.3), which graphty-element does not yet implement, with three additions: notes on the graph and
on definitions (runs and style layers), which the design studio asks for ("red is our lab's colour
for down-regulated"); quotes and citations, which a findings report needs; and a stable edge
reference, because the element's edge ids are a session counter that restarts on every load. The
W3C Web Annotation model (body, target, selector, provenance) is the shape these follow, without its
JSON-LD serialization.

### Not in scope

Canvas marks -- text boxes at a screen position, callouts with leader lines, highlight rectangles
and polygons, z-order -- which the designloom annotation capability describes
(`design/designloom/capabilities/annotation.yaml`), are presentation, not notes. They are not in
version 1; the recommendation is that they join the view document when views grow presentation
content. A note's target may be a point in scene space, which covers "a note about this empty
region".

## Data model

```ts
interface AnnotationSet {
  kind: "graphty-annotations";
  version: 1;
  name?: string;
  fingerprint?: string;          // the graph the notes were written on
  generator?: { name: string; version: string };
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
  quotes?: { path: string; value: unknown; at?: string }[];   // values the note quotes
  cites?: string[];              // run ids the note cites
  orphaned?: { since: string; lastTarget: string };
  userData?: Record<string, unknown>;   // round-trips untouched
  extensions?: Record<string, unknown>;
}

type NoteTarget =
  | { node: string | number; nodeType?: string }
  | { edge: EdgeRef }
  | { point: [x: number, y: number, z: number] }   // scene units
  | { graph: true }
  | { run: string }              // a run id: a note on a result
  | { layer: string };           // a style layer id, else name: a note on an encoding

interface EdgeRef {
  id?: string;                   // the edge id the data carries, when it carries one
  source?: string | number;      // otherwise the ends ...
  target?: string | number;
  key?: string | number;         // ... and the data's key field, when there is one
  ordinal?: number;              // ... or the edge's position among the edges of that pair
  among?: number;                // ... out of this many, in the load that ingested it
}
```

### Targets

- **Nodes** are referred to by the id the data gives them. `nodeType` is present only when the
  data plan declares node types (data-plan.md, "Node types").
- **Edges** are referred to by a stable identity, never by graphty-element's session edge counter,
  which restarts on every load and would re-attach a saved note to a different edge with no error.
  The identity is the data's edge id when it has one; otherwise source, target and either the
  data's key or the ordinal among the edges of that pair together with the pair's edge count
  (`among`). On an undirected graph the ends are written in canonical order, so A-B and B-A are one
  reference. This is the design studio's door 3 recommendation and is undecided (README, "Open
  decisions", identity). A reference binds only when exactly one edge matches.
- **Points** are positions in scene units. They bind to nothing and always apply.
- **The graph**, **a run** (by its author-assigned id) and **a style layer** are the "notes on
  definitions" the design studio describes. A run id MUST be author-assigned; a derived id is
  refused at write time with `E_UNSTABLE_RUN_ID`.

A note is never about another note.

## Writing

1. `session.notes.toDocument()` (designed, not built) writes every note in the session, in list
   order, with `fingerprint`.
2. A writer MUST write edge targets as `EdgeRef`, never as a session edge id.
3. A writer MUST keep `orphaned` notes and write them with their stamp.
4. Timestamps MUST be RFC 3339 with an explicit offset (UTC `Z` RECOMMENDED).

## Reading and applying

1. Notes are merged by `id`. A note whose `id` is not held is added. A note whose `id` is held with
   identical content is a no-op. A note whose `id` is held with different content is added under a
   new id and reported as renamed; nothing held is overwritten. A person who wants to replace notes
   removes them first.
2. Each note binds its target:
   - node and edge targets bind to the one element with that identity;
   - a run target binds to the run with that id (in an envelope with a recipe, after the recipe's
     namespacing has been applied, recipe.md);
   - a layer target binds to the layer with that id, else that name;
   - a point or the graph always binds.
3. A note whose target does not bind is added with `orphaned: { since, lastTarget }`, still listed,
   and reported in the binding report's `disabled` list with `E_UNKNOWN_ELEMENT` (a new code) for a missing
   element, `E_UNKNOWN_RUN` for a missing run and `E_UNKNOWN_LAYER` for a missing layer. It is never
   dropped. This is the element API design's rule for notes whose target leaves the graph: "kept
   and reported, never dropped".
4. A note that fails the schema is reported with `E_BAD_COMMAND` and not added; the others apply.
5. The document's fingerprint is compared and reported (`match`, `differs`, `unknown`). A `differs`
   result does not stop binding: notes whose ids exist on the new data bind, the rest orphan.
6. Applying annotations MUST NOT change the graph, its attributes, or any style layer other than
   the element's own note-marker layer.

## Security

1. `text`, `tags`, `author` and quoted values are plain text. A renderer MUST display them as text
   and MUST NOT interpret them as HTML or Markdown that can load resources or run script. A
   consumer that renders Markdown does so at its own risk and MUST sanitize.
2. Notes may carry sensitive judgements ("suspect", "confirmed ring member"). A writer SHOULD let
   the caller choose which notes to write (by tag, author or target), and SHOULD NOT write notes
   into a data export by default (export-mapping.md).
3. `author` is a claim, not an authenticated identity.

## Conformance

| Input | Required result |
|---|---|
| a note on `{ "node": "ACC-1042" }` where that node exists | bound |
| a note on `{ "node": "ACC-9999" }` where it does not | added orphaned; reported; still listed |
| a note on `{ "edge": { "source": "A", "target": "B", "ordinal": 1, "among": 2 } }` where the pair has 3 edges | orphaned: the count no longer matches, so no edge is guessed |
| two notes with the same `id` in one document | the second is reported and added under a new id |
| an incoming note whose `id` is held with different text | added under a new id; the held note unchanged |
| `text` containing `<img src=x onerror=...>` | stored and displayed as those characters |
| a note on `{ "run": "hubs" }` in an envelope whose recipe was applied with namespace `hubs` | bound to `hubs__hubs` |

## Worked examples

### Evidence notes in a fraud investigation

`W06.yaml`: a ring of accounts sharing devices, with the analyst's findings and a quoted value.

```json
{
  "kind": "graphty-annotations",
  "version": 1,
  "name": "Ring A findings",
  "fingerprint": "g1:0c4f9e2a7713b851",
  "notes": [
    {
      "id": "note_01",
      "target": { "node": "ACC-1042" },
      "text": "Opened the same day as ACC-1043 and ACC-1044 from one device.",
      "tags": ["suspect", "ring-a"],
      "author": "j.rivera",
      "createdAt": "2026-09-20T14:02:11Z",
      "updatedAt": "2026-09-20T14:02:11Z",
      "quotes": [{ "path": "data.risk_score", "value": 0.91 }]
    },
    {
      "id": "note_02",
      "target": { "edge": { "source": "ACC-1042", "target": "DEV-77", "key": "login-2026-09-18" } },
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
