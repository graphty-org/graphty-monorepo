# Notes

`kind: "graphty-notes"`, version 1, a member of a graphty document ([container.md](container.md)).
Schema: [notes.schema.json](notes.schema.json), `$id`
`https://graphty.app/schema/documents/graphty-notes/v1.json`. Edge-case rulings are rows of
[conformance.md](conformance.md). The API that writes and reads notes in a session, and the owner's
decisions behind this page, are in [../notes/notes-design.md](../notes/notes-design.md).

## Purpose

A note is a piece of text a person writes about something in a graph -- a node, an edge, a kept
group or path, a result, one group or path a run found, the whole graph -- with the time it was
written. A notes member carries a session's notes so they can be saved, shared and opened again
beside the same data. graphty-element stores notes and writes them back; it never interprets what a
note says.

## Text

1. A note's `text` is a plain string. A reader and a writer keep it exactly: every character, every
   line break, every space at either end. Nothing parses, renders, sanitizes, trims or normalizes
   it (no Unicode normalization, no line-ending conversion), and nothing puts it into a selector,
   an expression, a file name or HTML.
2. `text` is not empty and not only white space (what JavaScript's `/\s/u` matches; a zero-width
   space is not white space), and holds at most 65,536 code points.
3. Wherever graphty-element draws a note's text itself -- a label bound to `graphty.notes.latest`
   (style.md, "Paths") -- it draws the characters, never label markup.
4. **Untrusted.** A file can come from anyone. An application that interprets note text -- as
   Markdown, as HTML, as anything -- MUST treat it as untrusted input: never run script from it,
   never load remote resources from it unless the reader asks, and never let it pose as the
   application's own interface. An automated reader, such as a language model, is given it as
   quoted data, never as instructions (README, "Trust" rule 6).
5. **`mediaType`** is the writer's hint of how it meant the text: `type/subtype`, optionally followed
   by `;` parameters in visible ASCII, at most 255 characters (`text/markdown; variant=GFM`).
   graphty-element stores it and writes it back exactly, and never acts on it or fills it in. A
   reader compares the type and subtype without regard to case and ignores the parameters. Absent
   means the writer said nothing. The graphty app writes `text/markdown`.

## Data model

```ts
interface NotesMember {
    kind: "graphty-notes";
    version: 1;
    name?: string; // at most 1,024 characters
    description?: string; // at most 65,536 characters
    notes: Note[]; // at most 10,000, oldest first
    extensions?: Record<string, unknown>; // reverse-domain keys (container.md, "Extensions")
}

interface Note {
    id: string; // "note_" then 1 to 64 of [0-9A-Za-z_-]; globally unique
    time: string; // RFC 3339 with an explicit offset
    targets: NoteTarget[]; // 1 to 64
    text: string; // "Text"
    mediaType?: string; // "Text" rule 5
    author?: string; // 1 to 256 characters, not only white space
    edited?: string; // RFC 3339; when text, targets, cites, mediaType or extensions last changed
    cites?: { result: string; run: string }[]; // 1 to 64
    extensions?: Record<string, unknown>; // reverse-domain keys; plain JSON, 32 levels, 64 KB
}

type NoteTarget =
    | { graph: true } // the whole graph
    | { node: string | number } // one node, by its id
    | { edge: { source: NodeId; target: NodeId; id: string | number } } // an edge with an id
    | { edge: { source: NodeId; target: NodeId; ordinal: number; among: number } } // or by position
    | { set: string; name?: string } // a kept set ("set_..."), and its name for display
    | { result: string } // a result as a whole
    | { item: { result: string; run: string; key: { field: string; value: string | number | boolean } } };
```

1. **`id`** is minted by the writer so that no other writer mints it: graphty-element writes `note_`
   and a 26-character ULID; another writer uses a ULID or a UUID after `note_`. Readers compare
   ids for equality only. Ids are global because notes travel between people's files and are
   matched by id when opened.
2. **`time`** is when the note was written. graphty-element writes UTC as
   `Date.prototype.toISOString()` does (`2026-10-01T09:12:03.120Z`), keeps any other valid spelling
   it reads verbatim, and compares times as instants, never as strings. A time that matches the
   pattern but is not a real date (`2026-02-30`) fails the note.
3. **`author`** is a claim, never a verified identity. It is written only when it has a value:
   never `""`, never a placeholder such as "Anonymous".
4. **`cites`** are results the note's claim rests on, each pinned to the run it was written against.
   A note is listed under its targets, not under what it cites.
5. **`extensions`** hold other applications' data about a note (a done flag, tags, a color) under
   reverse-domain keys. A reader keeps them and writes them back; graphty-element never reads them.
6. The member and each note are open objects: a reader keeps a field it does not know and writes it
   back ("Opening" rule 7). The targets and cites are closed forms with a fallback ("Targets").

## Targets

A note's targets are what it is about; a list, because "these two accounts are the same person" is
one note about two things.

1. **A node** is named by its id. Ids compare by their text (`11` and `"11"` are the same node,
   because one file loads as either type depending on the format), except that when the graph holds
   both a number and a string with the same text, a target binds to the one of its own type.
2. **An edge** is saved by its two ends plus the file's edge id, or, for an edge without one, its
   position among the edges between the same two nodes (`ordinal`, out of `among`). An edge added
   in the session without a file id is saved the same way, its position counted when the notes are
   saved, among the edges then between its two ends in the order the graph holds them, so it
   binds in the graph saved with it. It is never saved by the id graphty-element made up for it
   (`graphty:e<n>`), except for an edge removed before the notes were saved, which has no position
   and reads `missing` once opened ("Binding" rule 2). An edge saved by position finds no
   edge once the pair has a different number of edges; if one edge of a pair is removed and another
   added, the position names the new one.
3. **A set** is saved by its id, plus its name for display. The name is never used to bind.
4. **A result** is saved by its id. The note follows the result across re-runs.
5. **An item** -- one group or path a run found -- is always saved with the run it was written
   against. Group numbers mean nothing across runs, so a note never moves to whatever is numbered
   the same after a re-run.
6. **Unsupported.** A target that matches none of these forms -- a kind this release does not know,
   or a known kind with a member it does not know (`{ "node": 1, "type": "person" }`) -- is kept,
   reads `unsupported`, is never bound by ignoring part of it, and is written back exactly as read.
   The same holds for a cite. Reserved target keys for later kinds: `filterStep`, `note`, `where`,
   `layer`, `point`.
7. Duplicate targets collapse to the first when a note is written; a note read from a file is kept
   as read.

## Status

A note is deleted only by the person who wrote it, never by a change to what it points at. Reloading
the data, a filter, removing a set, re-running or removing a run, or opening a file never deletes,
moves or edits a note. What each target points at now is worked out when it is read, so a target
that comes back is found again with nothing to repair:

<!-- prettier-ignore -->
| What happened | The target reads |
| --- | --- |
| The node or edge is in the graph and visible | `present` |
| It is in the graph, but a filter or the time window hides it | `filtered` |
| It is not in the graph (deleted, not in this load, another dataset) | `missing` |
| An edge saved by position, where the two nodes now have a different number of edges | `missing` |
| The data comes back with that node id or that edge | `present` again |
| The set was removed | `missing`, labeled with the set's name; restoring the set makes it `present` |
| The result was re-run | `{ result }`: `present`; `{ item }`: `earlier-run` |
| The result was removed | `missing` |
| A target of a kind, or with a member, this release does not know | `unsupported`; kept and saved back exactly |

A cite reads `current` (the result's current run is the one cited), `earlier-run` (it is another
run, or the cited run came from another session), `missing` (the result is gone, or the cite was
opened from a file that does not carry the result) or `unsupported`. Nothing of the status is
written into a file.

## Writing

1. A writer writes the member's `kind`, `version`, `name`, `description`, `notes`, `extensions`, in
   that order, and the notes **oldest first**: by `time` as an instant, then by `id`. A new note
   is added at the end, so a file under version control changes where something changed.
2. Inside a note the keys are written in the order `id`, `time`, `targets`, `text`, `mediaType`,
   `author`, `edited`, `cites`, `extensions`, then the fields this release does not know, as read.
   The same notes give the same bytes.
3. A writer produces only the named target and cite forms: edges as their ends plus `id` or
   `ordinal` and `among`, items and cites with `run`, sets with `name` when the set has one. A target
   or cite read as `unsupported` is written back exactly as read.
4. Nothing worked out from the graph is written: no status, no counts, and not where a note came
   from.

`session.notes.toDocument({ name?, description? })` returns the member; a bare member is also a
valid file ("Opening").

## Later versions

These keep version 1 open to additions without breaking older readers:

1. **New target kinds and new forms of an existing target are additions** ("Targets" rule 6).
   container.md lists note target kinds and item key forms among the open lists.
2. **`text` is always the complete readable form of the note.** A later richer body is an extra
   field, and `text` stays its fallback.
3. **A later version 1 field MUST stay valid when `text`, `targets` or `cites` change without it**,
   because an older release edits those and writes unknown fields back unchanged. Anything derived
   from them either goes in version 2 or carries the `edited` value it was computed against.
4. Planned routes: replies are notes with an optional `inReplyTo` (an older reader shows them as
   ordinary notes); tags become an optional `tags: string[]`, and a reader that finds both moves an
   application's tags out of `extensions`.
5. The limits ("Limits") are fixed for version 1.

## Binding

Opened notes bind **by identity only**; nothing is attached to a different element by guessing.

1. A node target binds to the node with that id ("Targets" rule 1).
2. An edge target binds to the one edge its ends and id identify, or by position while the pair
   still has `among` edges. An edge id graphty-element made up during a session (`graphty:e<n>`)
   means nothing in another session, so such a target reads `missing`. graphty-element writes one
   only for an edge removed before the notes were saved.
3. Set and result ids are short names that two unrelated projects can share (two people's sets named
   "Suspects" are both `set_suspects`). So a `{ set }`, `{ result }` or `{ item }` target, or a cite,
   read from a file binds only when the same file also carries what it names -- in version 1, a
   result made by a recipe in the same file ("Opening" rule 8). Otherwise it reads `missing` and
   keeps its label, however the session's own sets and results are named. A project file restores
   them bound, because it restores the sets and results too.
4. A run pin only ever matches in the session that made the run, so an item target or a cite opened
   from a file never reads as the current run.

## Opening

`session.notes.mergeDocument(member, { onConflict?, name? })`, and opening a file with a notes
member, **adds** the saved notes to the session's in one undoable step, labeled "Added notes from
<name>". It never deletes a note.

**All or nothing.** The member is checked and the final count worked out before anything changes. A
member that is not a `graphty-notes` object (`E_BAD_DOCUMENT`), has a `version` this release does
not read (`E_UNSUPPORTED_VERSION`, details `{ kind, found, reads }`), has `notes` that is not an
array, a `name`, `description` or `extensions` that fails the schema, a member named `__proto__`
at any depth, or nesting past 64 levels (`E_BAD_DOCUMENT`), more than 10,000 notes, or would take
the session past 10,000 notes (`E_TOO_LARGE`), is refused whole, and nothing changes.

1. **A note whose id the session does not hold** is added with its id, `time`, `edited` and
   `author`. The file's `author` is the file's claim; it never changes the author setting. The note
   records where it came from -- the `name` option or the member's `name`, and the time it was
   opened -- which a project saves and a notes member never does.
2. **A note whose content matches a held note** -- the same id with the same content, or any held
   note with the same content -- is `unchanged`. Content is every field but `id`; times compare as
   instants (`...Z` and `+00:00` spellings of one time are equal) and `extensions` with sorted
   keys. Merging the same file twice changes nothing and records no step.
3. **A note whose id is held with different content** follows `onConflict`:
    - `"keep-both"` (the default): if the held note has the same `time` and a later `edited`, it is
      a later edit of the incoming one, which is reported as `older` and not added. Otherwise the
      incoming note is added under a new id and the report lists the pair in `renamed`. Neither
      person's words are lost, and an incoming note never overwrites a held one.
    - `"replace"`: the incoming note replaces the held one, author and time included. Never a
      default; an application asks first, naming how many held notes would change.
    - `"keep-mine"`: the held note stays and is listed in `kept`; the incoming one is not added.
4. **Two notes with one id inside one member**: the second is treated as rule 3 against the first.
5. **A note that fails the schema** -- no `time`, a `time` that is not a real date, no text or blank
   text, a malformed id, no targets, an empty `author` -- is skipped alone and listed in `skipped`
   with `E_BAD_DOCUMENT` and its JSON pointer (`/notes/3`). It is never repaired: a note without a
   time is not stamped with the time it was opened. The others are added.
6. **A target or cite this release does not recognize** does not fail the note: it reads
   `unsupported` and is written back as read.
7. **Unknown fields of a note** are kept and written back, and reported with `W_UNKNOWN_MEMBER` and
   their JSON pointer. Unknown fields of the member are reported the same way and kept by a
   whole-file round trip (container.md, "Writing a file" rule 3). `extensions` is never reported.
8. **Inside a file with recipes**, a `{ result }`, `{ item }` or cite whose result is the `as` of a
   recipe command in the same file is rewritten to the run id that recipe's application gives it,
   exactly as a style's `results.<as>.<field>` path is (container.md, "Applying a file" rule 3).
   Until that run finishes, a `{ result }` target reads `missing`.
9. **Order in a file:** data, recipes, styles, then notes, so that every target can bind.
10. A `time` or `edited` more than a day after the moment of opening is kept, and reported with
    `W_FUTURE_TIME`: a note dated 2099 would otherwise sit at the top of every list unexplained.

```ts
interface NotesReport {
    readonly added: readonly NoteId[]; // every note added, renamed copies included
    readonly unchanged: number;
    readonly renamed: readonly { readonly from: NoteId; readonly to: NoteId }[]; // "keep-both" copies
    readonly older: readonly NoteId[]; // "keep-both": incoming notes a held note had already edited
    readonly replaced: readonly NoteId[];
    readonly kept: readonly NoteId[]; // "keep-mine": held notes the file disagreed with
    readonly missing: number; // added or replaced notes with at least one target reading `missing`
    readonly skipped: readonly Problem[]; // rule 5
    readonly notices: readonly Problem[]; // W_UNKNOWN_MEMBER, W_FUTURE_TIME
}
```

The report says how well the notes fit: "34 notes; 3 are about things not in this graph". A notes
file opened on unrelated data shows nearly every note missing, which tells the reader at once that
it belongs to other data. A release that does not know `graphty-notes` skips the member with
`W_UNKNOWN_KIND` and keeps it in place when it saves the file again.

## Saving

1. Whole-file saving writes notes **only when asked** (`members` including `"graphty-notes"`). By
   default they are left out and listed in `report.leftOut` with their count: notes are judgments
   about the data, and a file saved to share a technique must not carry them by accident. When
   notes are written, the report's notices give their count and distinct authors.
2. **Round trip.** A notes member opened from a file is replaced in place by the regenerated member
   when the file has one notes member, or matched by `name` when it has several. A notes member
   that was skipped stays in place exactly.
3. A project file always saves the notes, with where each came from; that is the project's own
   state.

## Limits

Fixed for version 1 (README, "Limits"):

- 10,000 notes per member, and per session;
- per note: 64 targets, 64 cites, 65,536 code points of text, 262,144 bytes (256 KB) saved as JSON,
  at most 64 fields;
- a note's `extensions`: plain JSON (objects, arrays, strings, finite numbers, booleans, `null`), at
  most 256 keys, 32 levels deep and 65,536 bytes (64 KB) saved;
- `mediaType` at most 255 characters, `author` 256, a member's `name` 1,024 and `description`
  65,536.

String lengths count Unicode code points, which is what JSON Schema's `maxLength` counts.
