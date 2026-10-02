# Annotations

> **Superseded by [../notes.md](../notes.md); kept as the record of the evidence-chain ideas.**

> **Draft -- not part of version 1.** Version 1 of the graphty document formats is the style and
> recipe documents in one JSON container ([../README.md](../README.md)). This page is kept as the
> starting point for a later version and is not a specification anyone implements today. It was
> written against an earlier, larger draft of this directory: where it cites "README", `style.md`,
> `recipe.md` or open decisions by number, it means that earlier draft, which is in the git history
> of this directory at commit `a78c4114` (`design/documents/README.md`). Its schema is published
> nowhere and uses the `https://graphty.app/schema/documents/drafts/` prefix so it can never be
> mistaken for a version 1 schema.

`kind: "graphty-annotations"`, version 1. Schema: [annotations.schema.json](annotations.schema.json)
(normative for structure). Shared conventions are in [README.md](../README.md).

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
    fingerprint?: string; // the graph the notes were written on (topology only)
    dataDigest?: string; // "sha256:<hex>" of the data bytes the notes were written against
    binding?: "exact-data" | "by-id"; // default "by-id"; "exact-data": bind only to data with dataDigest
    generator?: { name: string; version: string };
    // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
    notes: Note[]; // order is meaningful: it is the reading order a report uses
    extensions?: Record<string, unknown>;
}

interface Note {
    id: string; // globally unique: "note_" plus a ULID or UUID the writer mints
    target: NoteTarget;
    text: string; // plain text; see "Security"
    tags?: string[]; // default []
    author?: string;
    createdAt: string; // RFC 3339 date-time
    updatedAt: string; // RFC 3339 date-time, >= createdAt
    status?: "open" | "confirmed" | "cleared" | "escalated" | "retracted"; // default "open"; open enumeration
    confidence?: "low" | "medium" | "high"; // open enumeration; a finding's confidence
    quotes?: { path: string; value: unknown; at?: string }[]; // values the note quotes
    cites?: string[]; // run ids the note cites
    runsAt?: Record<string, string>; // run id -> digest of the run record the note was written against
    digest: string; // "sha256:<hex>" of the note's canonical content (below); REQUIRED
    revisions?: {
        text: string;
        status?: string;
        target?: NoteTarget;
        tags?: string[];
        quotes?: unknown[];
        cites?: string[];
        updatedAt: string;
        author?: string;
        digest?: string;
    }[];
    orphaned?: { since: string; lastTarget: string };
    importedFrom?: {
        document: string;
        digest: string;
        at: string; // appended by each applier
        observed?: string;
        by?: string;
        installation?: string;
    }[];
    userData?: Record<string, unknown>; // round-trips untouched
    features?: string[];
    extensions?: Record<string, unknown>;
}

type NoteTarget =
    | { node: string | number }
    | { edge: EdgeMember; check?: Check | Check[] } // EdgeMember reused unchanged
    | { group: { run: string; field?: string; value: string | number; members: (string | number)[] } }
    | { set: string } // a kept set (envelope.md, "Kept sets")
    | { point: [x: number, y: number, z: number] } // scene units
    | { graph: true }
    | { run: string; recipe?: string } // a run id, or a recipe's `as` when `recipe` names the recipe id
    | { layer: string }; // a style layer's authored id, else its name
type Check = { path: string; value: unknown }; // an attribute value the edge must have
```

**Statuses.** `open` is a note nobody has decided. `confirmed`, `cleared` and `escalated` are
**determinations** -- the three outcomes of an alert review (`W06.yaml`: confirm, clear, escalate)
-- and `retracted` withdraws the note's claim. No status is "sticky": which version of a note wins
a merge is decided by its revision history (below), and a change of status arriving from someone
else is never applied silently.

`EdgeMember` is graphty-element's published type (`graphty-element/src/catalog/types.ts`), not a
second declaration: `source` and `target` are required, plus exactly one of `id` (string or number)
or `ordinal` with `among`. Its `key` member is reserved by the element and refused until the element
reads one, so these documents do not use it.

```ts
// for reference; declared in graphty-element
interface EdgeMember {
    source: NodeId;
    target: NodeId;
    id?: string | number;
    key?: string | number;
    ordinal?: number;
    among?: number;
}
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
  would bind to a different edge -- for evidence, worse than orphaning. So a reference by ordinal
  binds by ordinal only when the notes' `dataDigest` matches the loaded data's bytes (or the
  project's `data.original.digest`, rule 9). On different data it binds **by its check** instead:
  an edge target MAY carry `check`, one attribute value the edge must have (`{ path:
"data.timestamp", value: "2026-09-17T02:14:00Z" }`) or a list of them acting as a composite key
  (caller, callee and timestamp); when exactly one edge of the pair (in either order on an
  undirected graph) satisfies every check, the note binds to it and is reported as rebound by
  check. With none or several, it is orphaned with the reason "ordinal reference on different
  data". So a call note survives the next day's extract with 200 calls appended. On data that now
  carries edge ids, an ordinal reference still resolves by its ordinal among the pair and is
  reported. On matching data a check is verified on bind; a mismatch orphans the note. A writer
  SHOULD write `check` whenever it writes an ordinal, and SHOULD prefer data with edge ids for
  evidence. Adding
  the edge's predicate to `EdgeMember` is open decision 13.
- **Groups** are one value of a partition-shaped run -- one cluster of a clustering run -- or a kept
  set. A group target records the run, the field (default: the run's partition field, `group` for
  community algorithms), the value, and MUST record the members it had when written. When the run
  is recomputed, cluster numbering may change, so binding by value alone would silently describe a
  different cluster: the note binds to the value of the current run whose members overlap the
  recorded ones best, when the Jaccard index is at least the applier's `rebindThreshold` (default
  0.5; the caller may raise it). A rebind is reported with the members added and removed; a note
  whose status is `confirmed` is not rebound onto a cluster that gained members without the
  caller's confirmation, because it would put people the analyst never assessed under
  "confirmed". Below the threshold it is orphaned. A set target binds to the kept set of that id.
- **Points** are positions in scene units. They bind to nothing and always apply; when the
  fingerprint differs or a layout ran after the notes were written, point notes are reported as
  authored for another layout, as stored cameras are.
- **The graph**, **a run** and **a style layer** are the "notes on definitions" the design studio
  describes. A run target names an author-assigned run id; a note written on a run that has only a
  derived id gets that run an alias first (README, "Identifiers" rule 2), so the note is never
  refused or left out of a save. A run target with `recipe` names the recipe's own `as` and binds
  to that recipe's application in the session whatever namespace it received.

A note is never about another note.

## Writing

1. `session.notes.toDocument(options?)` (designed, not built) writes every note in the session, in
   list order, with `dataDigest` when the data's bytes are known, and every handling marking that
   applies to the notes it writes (README, "Extension data and shared metadata"). `dataDigest` is
   always the digest of the bytes the notes were written against -- the exhibit -- even after a
   node merge made a project save re-export the data. It MUST NOT write `fingerprint` until a
   scheme is approved (README). Its options select what is written, for writing notes for someone
   else: `select` (by tag, status, author or target), `withoutRetracted`, and `withoutRevisions`.
   Without revisions, each note carries a marker `{ revisionsDropped: <count>, digest: <digest of
the dropped history> }` in its `extensions` under `graphty.revisions-dropped`, so the history is
   visibly truncated rather than silently missing. A project save keeps the full history; a share
   (envelope.md, "Saving" rule 2) lists every retracted note and every note with revisions before
   writing.
2. A writer MUST write edge targets as `EdgeMember`, never as a session edge id.
3. A writer MUST keep `orphaned` notes and write them with their stamp, and MUST keep
   `importedFrom` and `revisions`.
4. Timestamps MUST be RFC 3339 with an explicit offset (UTC `Z` RECOMMENDED).
5. A writer MUST write `digest` on every note it writes: the RFC 8785 SHA-256 of the note's
   **content**. The content is the note with the non-content members removed -- `id`, `createdAt`,
   `updatedAt`, `digest`, `revisions`, `orphaned`, `importedFrom`, `runsAt`, `userData` and
   `extensions`, a closed list -- and with defaults filled: `status` written (`"open"` when
   absent), `tags` written as a sorted, de-duplicated list (`[]` when absent), and every other
   absent optional member left out. Every other member counts, including one this reader does not
   know, so two releases always agree whether two notes are the same. The list of non-content
   members and the defaults filled are frozen for a major version: a later minor member that is not
   content goes under `extensions`, and no new member gets a default, so the digest function never
   changes within version 1. An edit moves the previous
   text, status, target, tags, quotes, cites, time, author and digest into `revisions`
   (append-only), so the note's history travels with it and a later signature scheme has something
   to sign.
6. A writer MUST mint a globally unique `id` for a new note (`note_` plus a ULID or UUID), so two
   analysts' writers never give unrelated notes one id.
7. A writer SHOULD write `runsAt` for every run a note targets or cites: the RFC 8785 SHA-256 of
   that run's **identity** as it was when the note was written -- its record without `startedAt`,
   `durationMs`, `importedFrom`, `stale`, `superseded` and `discarded` (so algorithm, parameters,
   seed, scope, engine, bindings and import) -- so a later reader can tell a note written against
   earlier parameters, and a `replace` with identical parameters does not flag every note.
8. Inside an envelope saved from a session that applied a recipe, run targets, `cites` and
   `results.*` quote paths are written with the recipe's own `as` (recipe.md, "Saving an applied
   recipe").
9. A writer SHOULD write `binding: "exact-data"` whenever the document carries a handling marking or
   the caller marks the notes as evidence, so a generic application that opens the file cannot
   attach "confirmed ring member" to whatever node 17 is in another case's data.

## Reading and applying

1. Notes are merged by `id`, comparing content as defined under "Writing" rule 5. A note whose
   `id` is not held is added. A note whose `id` is held with identical content is a no-op. A note
   whose `id` is held but whose `target` differs is a different note, whatever `onConflict` says: it
   is added under a new id and reported as renamed. A note whose `id` and target are held with
   different content follows these rules, in order:
    - **History decides first.** When one side's `revisions` contain the other side's digest, that
      side descends from the other and wins, whatever its status, under every `onConflict` policy;
      the other version goes into `revisions`. So a note I reopened or confirmed after clearing it
      reaches a colleague who holds the old cleared copy, and a colleague's stale cleared copy (an
      ancestor of my confirmed note) cannot overturn it. A note whose history the incoming one
      descends from, and whose status the merge changes, is reported as a notice naming both
      statuses.
    - **A status change from someone else is a proposal.** When neither history contains the other
      and the two sides differ in status -- one side retracted, cleared, confirmed or escalated --
      the held note is not changed: the incoming version is kept as a pending proposal on the note
      and reported with `W_STATUS_PROPOSED`, naming both statuses and the incoming document, until
      the caller accepts or rejects it per note. A notes file sent back by someone who received a
      case file can therefore never retract, clear or confirm the investigator's note on its own, and
      a colleague's genuine retraction still reaches the note as a proposal the investigator sees.
    - Otherwise the applier's `onConflict` option decides: `"keep-both"` (the default) adds the
      incoming note under a new id and reports both ids as renamed, so a person can reconcile them;
      `"newer"` replaces the held note when the incoming `updatedAt` is later, moving the held
      version into `revisions`, and otherwise keeps the held note and reports the incoming one.
    - A timestamp later than the reader's clock plus five minutes is not believed: it is reported,
      and the note is treated as having no `updatedAt` for this comparison, so a note dated 9999
      cannot win every later merge.
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
8. **Import chain.** Every note added from a document gets an entry appended to its `importedFrom`
   list: `observed`, the file name or origin the reader opened it from (never the document's own
   `name`, which is the author's text and shown only as the document's claim); `document`, that
   same observed name (else the digest); the document's RFC 8785 SHA-256; the time; the reader's
   `installation`; and, when the application has an authenticated user, the receiving user `by`.
   The last three are supplied by the reader, never taken from the file. A list already in the file
   is kept as the file's claim and never taken as the reader's own record. So a note that passed
   from j.rivera to a supervisor to me shows every file it came through and, where the
   applications knew their users, who received it; without authenticated users it shows files, not
   custodians, and is not a chain of custody on its own. No entry is appended when the document is one this installation wrote itself (known by
   graphty-element's own record of the digests it wrote, never by anything in the file), so
   reopening my own project does not make my notes look imported.
9. **Which data the notes were written against.** When the session knows the loaded data's bytes,
   the applier compares the document's `dataDigest` with them **and with the envelope's
   `data.original.digest`** (the exhibit's bytes, when a project save re-exported the data after a
   node merge), and reports `match` (saying which of the two matched), `differs` or `absent` in the
   binding report, beside the fingerprint (`match`, `differs`, `unknown`). With the applier option
   `requireDigest: true`, or when the document says `binding: "exact-data"`, a `differs` binds
   nothing and returns the notes parsed, so an application can show the mismatch before anything
   binds; only the caller can override a document's `exact-data`, explicitly. Without either,
   notes whose targets exist bind and the rest orphan. Short integer ids (`1`, `17`) are common in
   case data, so an evidence application SHOULD pass `requireDigest`. `binding` is part of version
   1, so every reader of version 1 honours it.
10. **Digests are checked.** A note whose `digest` does not match its content (edited in a text
    editor) is kept, shown with a warning (`W_DIGEST_MISMATCH`), and listed in the binding report;
    it is never silently trusted. A note with no `digest` (hand-written) is the one schema failure
    that does not stop binding under rule 7: it binds, is reported, and gets a computed digest on
    the next save.
11. **Notes on runs that changed.** A note whose `runsAt` digest for a run differs from that run's
    current record -- the run was replaced, or re-run with other parameters -- is shown as written
    against an earlier run and reported with `W_RUN_CHANGED` (recipe.md, "Identity and
    namespacing" rule 5).
12. A note whose target was merged away in the session (a node merge) is reported with the id it
    was merged into, not only as an unknown element (open decision 27).
13. Applying annotations MUST NOT change the graph, its attributes, or any style layer other than
    the element's own note-marker layer. The document's handling markings are kept by the session
    and written by every later save and export (README).

## Security

1. `text`, `tags`, `author` and quoted values are plain text. A renderer MUST display them as text
   and MUST NOT interpret them as HTML or Markdown that can load resources or run script. A
   consumer that renders Markdown does so at its own risk and MUST sanitize.
2. Notes may carry sensitive judgements ("suspect", "confirmed ring member"). A writer MUST let
   the caller choose which notes to write, without retracted notes and without revisions
   ("Writing" rule 1), because a rewritten note's first revision and a retracted allegation
   otherwise travel verbatim to everyone a file is shared with. Notes are not written into a
   data export, an export sidecar or a document saved with `purpose: "share"` unless the caller
   names them (`members: ["annotations"]` for a share, with the share's element-name report
   produced first; export-mapping.md; envelope.md, "Saving"); a document's `handling` markings are
   shown before any re-save or export and written by it.
3. `author` is a claim, not an authenticated identity; `digest` and `revisions` detect a change
   made through a writer, and a digest check detects an edit that did not recompute the digest, but
   anyone can recompute one, until signatures exist (open decision 21).

## Conformance

| Input                                                                                                                                   | Required result                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| a note on `{ "node": "ACC-1042" }` where that node exists                                                                               | bound                                                                                                 |
| a note on `{ "node": "ACC-9999" }` where it does not                                                                                    | added orphaned; reported; still listed                                                                |
| a note on `{ "node": "1042" }` on a graph imported with `canonical` coercion whose node id is the number 1042                           | bound                                                                                                 |
| a note on `{ "node": "01" }` where the node id is the number 1                                                                          | orphaned: `"01"` stays text under `canonical`                                                         |
| a note on `{ "edge": { "source": "A", "target": "B", "ordinal": 1, "among": 2 } }` where the pair has 3 edges                           | orphaned: the count no longer matches, so no edge is guessed                                          |
| an edge target with `key`                                                                                                               | fails the schema; kept verbatim, reported                                                             |
| two notes with the same `id` in one document                                                                                            | the second is reported and added under a new id                                                       |
| an incoming note whose `id` is held with different text, default options                                                                | added under a new id; both ids reported; the held note unchanged                                      |
| the same, `onConflict: "newer"`, incoming `updatedAt` later                                                                             | the held note replaced; its previous version in `revisions`                                           |
| an incoming note with `status: "retracted"` for a held open note, neither history containing the other                                  | the held note unchanged; the retraction kept as a proposal, `W_STATUS_PROPOSED`                       |
| a held retracted note and an incoming open copy that is its ancestor                                                                    | the held note stays retracted; no second note                                                         |
| a held cleared note and an incoming `confirmed` note whose `revisions` hold the cleared digest                                          | the held note becomes confirmed; a notice names both statuses                                         |
| a held `confirmed` note and an incoming stale `cleared` copy whose digest is in the held note's `revisions`                             | the held note stays confirmed                                                                         |
| a forged `retracted` copy of a held note from a file sent back by a recipient                                                           | the held note unchanged; a proposal the caller must accept                                            |
| notes with `binding: "exact-data"` opened on different data, no caller option                                                           | nothing bound; `differs` reported                                                                     |
| notes on the exhibit (digest A) reopened from a project re-exported after a merge (`data.original.digest` A)                            | `match` via the original digest; ordinal references bind                                              |
| an ordinal edge note with `check` on caller, callee and timestamp, on an extract with calls appended                                    | bound to the one matching edge; reported as rebound by check                                          |
| `toDocument({ withoutRevisions: true, withoutRetracted: true })`                                                                        | no retracted notes; each note carries the dropped-history marker                                      |
| a note with `status: "escalated"`                                                                                                       | valid; a determination                                                                                |
| an incoming note with the held note's `id` but a different target                                                                       | added under a new id, whatever `onConflict` says                                                      |
| an incoming note dated `9999-12-31T23:59:59Z`, `onConflict: "newer"`                                                                    | timestamp reported; not treated as newer                                                              |
| a note whose text was edited without updating `digest`                                                                                  | kept, shown with `W_DIGEST_MISMATCH`                                                                  |
| notes with `dataDigest` A applied to data with digest B, `requireDigest: true`                                                          | nothing bound; notes returned parsed; `differs` reported                                              |
| the same without `requireDigest`                                                                                                        | `differs` reported; notes whose targets exist bind                                                    |
| an ordinal edge reference, data digest differs                                                                                          | orphaned: "ordinal reference on different data"                                                       |
| a note on a run started from a panel without `as`, saved and reopened                                                                   | the run given an alias on save; the note written against it; bound on reopen                          |
| a group note on cluster 3 with `status: "confirmed"`, re-run so the best match gained members                                           | not rebound without the caller's confirmation; added and removed members reported                     |
| a note citing a run whose record digest changed after `onRepeat: "replace"`                                                             | shown as written against an earlier run, `W_RUN_CHANGED`                                              |
| my own saved notes file reopened                                                                                                        | no import entry appended                                                                              |
| a note passed through two colleagues' files                                                                                             | two entries in `importedFrom`, oldest first, each naming the observed file, not the document's `name` |
| `text` containing `<img src=x onerror=...>`                                                                                             | stored and displayed as those characters                                                              |
| a note on `{ "run": "rings" }` in an envelope whose recipe step has `as: "rings"`, applied with namespace `fraud`                       | target, `cites` and quote paths rewritten to `fraud__rings`; bound                                    |
| a standalone notes file with `{ "run": "rings", "recipe": "org.example.fraud" }`, applied after that recipe ran with namespace `fraud2` | bound to `fraud2__rings`                                                                              |
| a project opened without running its recipe; a note on `{ "run": "modules" }`                                                           | pending, listed in `needsRerun`; no `orphaned` stamp written                                          |
| a target `{ "node": "TP53", "graphId": "disease" }` on a version 1 reader, without the feature `graphs`                                 | fails the schema (targets are closed on their discriminators); kept verbatim, not bound               |
| a note carrying `orphaned` whose node exists again                                                                                      | bound; stamp cleared; reported as rebound                                                             |
| a group note on cluster 3 of `modules` with recorded members, after a re-run renumbers it to 5                                          | bound to cluster 5; reported as rebound                                                               |
| a note quoting `data.risk_score` 0.91 on a node whose value is now 0.12                                                                 | bound; `W_STALE_QUOTE` with both values                                                               |

## Worked examples

### Evidence notes in a fraud investigation

`W06.yaml`: a ring of accounts sharing devices, with the analyst's findings and a quoted value.

```json
{
    "kind": "graphty-annotations",
    "version": 1,
    "name": "Ring A findings",
    "dataDigest": "sha256:9b1d0e6a3c5f7e2d4b8a1c0f9e7d6c5b4a3928170f6e5d4c3b2a1908f7e6d5c4",
    "handling": [{ "marking": "internal", "note": "Evidence notes; do not forward outside the fraud team." }],
    "notes": [
        {
            "id": "note_01K5KZ7Y2S0M3N4P5Q6R7S8T9V",
            "target": { "node": "ACC-1042" },
            "text": "Opened the same day as ACC-1043 and ACC-1044 from one device.",
            "tags": ["suspect", "ring-a"],
            "status": "open",
            "author": "j.rivera",
            "createdAt": "2026-09-20T14:02:11Z",
            "updatedAt": "2026-09-20T14:02:11Z",
            "digest": "sha256:0fa003dd014ac6f0df99d16880e2eddf3042664319054d86a40cde97f3f484d0",
            "quotes": [{ "path": "data.risk_score", "value": 0.91 }]
        },
        {
            "id": "note_01K5KZ8A4B5C6D7E8F9G0H1J2K",
            "target": { "edge": { "source": "ACC-1042", "target": "DEV-77", "id": "login-2026-09-18" } },
            "text": "First shared login; the chargebacks start 36 hours later.",
            "tags": ["evidence"],
            "author": "j.rivera",
            "createdAt": "2026-09-20T14:10:40Z",
            "updatedAt": "2026-09-21T09:00:00Z",
            "digest": "sha256:0191561bd5da0479745f5a55c6d5a829db246999aac117cbb1a9189393e0faf8"
        },
        {
            "id": "note_01K5M1C3D4E5F6G7H8J9K0M1N2",
            "target": { "run": "rings" },
            "text": "Louvain at resolution 1.0 separates ring A from the merchant cluster; 0.5 does not.",
            "cites": ["rings"],
            "createdAt": "2026-09-21T09:30:00Z",
            "updatedAt": "2026-09-21T09:30:00Z",
            "digest": "sha256:b9270656d1f83d00b02983e0fa53cc6259fb82014d4dc8d150ebfb229633a77c"
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
            "id": "note_01K5F2A0B1C2D3E4F5G6H7J8K9",
            "target": { "layer": "logfc" },
            "text": "Red is up-regulated, blue down; the scale is clamped at |logFC| = 3.",
            "createdAt": "2026-09-19T10:00:00Z",
            "updatedAt": "2026-09-19T10:00:00Z",
            "digest": "sha256:3a0d427335871f83162866bb16f102224cc7583b7864e2893f3b0cf0cad751b4"
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
            "id": "note_01K5Q0R1S2T3V4W5X6Y7Z8A9B0",
            "target": { "group": { "run": "modules", "value": 2, "members": ["RPL5", "RPL11", "NOP56", "FBL"] } },
            "text": "Ribosome biogenesis (GO:0042254, FDR 1e-12).",
            "tags": ["cluster-label"],
            "createdAt": "2026-09-22T10:00:00Z",
            "updatedAt": "2026-09-22T10:00:00Z",
            "digest": "sha256:15a24f5f94b8cb7e94eac17d33808c4cbac5de5632e77abc1b8b7bc0bfc05b00"
        }
    ]
}
```
