# Notes

A note is text a person writes about the graph or about something in it: a node, an edge, a kept
set, an algorithm's result, one community a run found, or the whole graph. The element stores
notes, undoes them, counts them on the nodes and edges they name, lets a style layer show them,
and saves and reopens them. It never interprets their text.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
await session.data.addNodes([{ id: "ada" }, { id: "grace" }]);

// Write a note about a node, then read the notes about it, newest first
const id = session.notes.add({ text: "Wrote the first program.", targets: [{ node: "ada" }] });
const aboutAda = session.notes.list({ target: { node: "ada" } }); // [{ id, time, targets, text }]

// Label every node that has a note with its newest note
await session.styles.add({
    name: "Notes",
    target: "node",
    selector: { match: "has", path: "graphty.notes.count" },
    encode: { "node.label": { by: "graphty.notes.latest" } },
});
// Or label it with how many notes name it: { by: "graphty.notes.count" }

// Save the notes as JSON, and open them again later
const saved = JSON.stringify(session.notes.toDocument());
session.notes.mergeDocument(JSON.parse(saved));
```

- **`element.session` exists as soon as the element does.** Note writes are synchronous and safe
  before any data has loaded: a note about a node the graph does not hold yet is kept, and is
  found when the node arrives.
- **The element stamps the rest.** `add` returns the new note's id (`note_` and a ULID) and fills
  in `time` (ISO 8601 UTC with milliseconds, `2026-10-01T09:12:03.120Z`) and, when one is set, the
  `author`.
- **Nothing to repaint.** Adding, editing, removing, undoing or merging a note repaints the labels
  that change.
- **The same API runs in Node.** `createGraphSession()` from `@graphty/graphty-element/session`
  has the same `session.notes`, with no renderer and no DOM.

## A note's text is plain text

The element stores the text exactly as given -- every character, line break and space -- and
never parses, renders, trims or sanitizes it. Where it draws note text itself, in a label bound to
`graphty.notes.latest`, it draws the characters: a note reading `**urgent**` shows the ten
characters `**urgent**`, and one reading `<bold>x</bold>` shows the tags, not bold text.

That leaves each application free to read notes its own way -- as Markdown, as HTML, as plain
text -- while carrying every other application's notes through untouched. An optional
`mediaType` says how the writer meant the text:

```typescript
session.notes.add({ text: "**One device** for all four.", mediaType: "text/markdown", targets: [{ node: "ada" }] });
```

The element stores `mediaType` and writes it back, and never acts on it. It checks only its shape:
`type/subtype`, optionally followed by `;` parameters, at most 255 characters. A reader choosing
how to show a note compares type and subtype without regard to case and ignores the parameters.

**Note text from a file is untrusted.** A saved notes file can come from anyone. An application
that interprets note text must never run script from it, never load remote resources from it
unless the reader asks, and never let it pose as the application's own interface. A language
model given note text must be given it as quoted data, never as instructions.

## The note record

```typescript
interface Note {
    readonly id: NoteId; // made by the element
    readonly time: string; // when it was written; stamped by the element
    readonly targets: readonly NoteTarget[]; // what it is about: 1 to 64
    readonly text: string; // plain text, not blank, at most 65,536 characters
    readonly mediaType?: string; // how the writer meant the text
    readonly author?: string; // the author setting, when one was set
    readonly edited?: string; // when it last changed; stamped by the element
    readonly cites?: readonly NoteCite[]; // results the claim rests on
    readonly extensions?: Readonly<Record<string, unknown>>; // other applications' data
}
```

Records are frozen, and `get` and `list` hand back the same object until the note changes, so
`a === b` is a valid "unchanged" test. A field with no value is absent, never `""` or `null`.

`list()` is newest first (by `time`, then `id`); editing a note does not move it. Its options
filter, and every option given must hold:

```typescript
session.notes.list({ target: [{ node: "ada" }, { node: "grace" }] }); // about either node
session.notes.list({ targetKind: "edge" }); // with at least one edge target
session.notes.list({ cites: run.id }); // citing a result, whichever run
session.notes.list({ author: "Ada" });
session.notes.list({ missing: true }); // with a target the graph no longer holds
```

`session.notes.counts()` says how many notes there are, and how many nodes and edges have at least
one. `session.notes.authors()` lists the distinct authors.

`extensions` is for data an application keeps about a note -- a done flag, tags, a color -- under
a reverse-domain key it owns (`"com.example.casebook"`). The element keeps it and writes it back;
it never reads it. The value must be plain JSON: objects, arrays, strings, finite numbers,
booleans and `null`, at most 32 levels deep and 64 KB once saved.

## Targets and cites

A note's **targets** are what it is about. There are six kinds:

| Target                      | About                                                         |
| --------------------------- | ------------------------------------------------------------- |
| `{ graph: true }`           | The whole graph                                               |
| `{ node: id }`              | One node, by its id                                           |
| `{ edge: edge }`            | One edge: its element id, or its ends as a set stores an edge |
| `{ set: id }`               | A kept set (see [Sets](./sets))                               |
| `{ result: id }`            | A run's result as a whole, followed across re-runs            |
| `{ item: { result, key } }` | One group or path a run found, in that run                    |

A note may name several targets ("these two accounts are the same person"). `NoteTarget` is an
open union: a later release may add kinds, so show a kind you do not know by its `label` from
`status()` (below).

- **Nodes** compare by their text: `11` and `"11"` name the same node, because one file can load
  as either depending on its format.
- **An edge** given by its element id (from the selection or a click) is saved by its two ends
  plus the file's edge id or, for an edge without one, its position among the edges joining the
  same two nodes, counted when you call `toDocument()`, so edges added or removed before then do
  not move the note. An edge your code added without an id is saved by its position too. Give your edges ids when notes about them matter.
- **An item** is pinned to the run it was written against. Community numbers mean nothing across
  runs, so after a re-run its status says `earlier-run` rather than moving to whatever is
  numbered the same now. Leave out `run` to mean the result's current run.

A note's **cites** are results its claim rests on. A note saying "highest betweenness, 0.57" is
about the node and cites the run:

```typescript
const run = element.run("betweenness");
await run;
session.notes.add({ text: "Highest betweenness, 0.57.", targets: [{ node: "ada" }], cites: [{ result: run.id }] });
```

The cite is pinned to the result's current finished run. The note is listed under the node, not
under the result.

## When a write is refused

A refused write changes nothing and throws a `GraphtyError`. The reason is in
`error.details.reason`:

```typescript
import { isGraphtyError } from "@graphty/graphty-element";

try {
    session.notes.add({ text: "  ", targets: [{ node: "ada" }] });
} catch (error) {
    if (isGraphtyError(error) && error.details?.reason === "empty-text") showHint("Type a note first");
    else throw error;
}
```

| Code            | `details.reason`   | When                                                                              |
| --------------- | ------------------ | --------------------------------------------------------------------------------- |
| `E_BAD_COMMAND` | `"empty-text"`     | `text` is empty or only white space                                               |
| `E_BAD_COMMAND` | `"text-too-long"`  | `text` is longer than 65,536 characters (code points)                             |
| `E_BAD_COMMAND` | `"no-targets"`     | `targets` is empty                                                                |
| `E_BAD_COMMAND` | `"too-many"`       | more than 64 targets or 64 cites (`details.field`)                                |
| `E_BAD_COMMAND` | `"bad-target"`     | a target is malformed, or names an edge id the graph does not hold                |
| `E_BAD_COMMAND` | `"unknown-target"` | a set, result or item names an id the session does not hold                       |
| `E_BAD_COMMAND` | `"unknown-cite"`   | a cite names a result the session does not hold                                   |
| `E_BAD_COMMAND` | `"not-finished"`   | a cite, or an item without `run`, names a result with no finished run             |
| `E_BAD_COMMAND` | `"bad-media-type"` | `mediaType` is not `type/subtype` with optional parameters, or is too long        |
| `E_BAD_COMMAND` | `"bad-extensions"` | `extensions` is not plain JSON, or a key is not a reverse-domain name             |
| `E_BAD_COMMAND` | `"element-field"`  | the input carries `id`, `time`, `author` or `edited`, which the element stamps    |
| `E_BAD_COMMAND` | `"unknown-id"`     | `update`, `remove`, `status` or `select({ note })` names a note that is not there |
| `E_TOO_LARGE`   | `"notes"`          | the session would hold more than 10,000 notes                                     |
| `E_TOO_LARGE`   | `"note-size"`      | the note, saved as JSON, would be larger than 256 KB                              |

`details.reason` is an open union: a later release may add reasons. A node or edge the graph does
not hold is accepted (it reads `missing`); a set, result or run id is checked, because a mistyped
one can never become valid.

## Changing and removing a note

```typescript
session.notes.update(id, { text: "Wrote the first published program." });
session.notes.update(id, { mediaType: null, cites: [] }); // null clears a field; [] clears the cites
session.notes.remove(id);
```

A field left out of the patch is unchanged. `update` stamps `edited` and never changes `author` or
`time`, so editing someone else's note keeps their name. A change that changes nothing records
nothing.

## The author

Notes carry no name unless the project's author setting holds one:

```typescript
await session.config.set({ author: "Ada" }); // notes written from now on say "Ada"
await session.config.set({ author: null }); // and from now on, no name
```

The author is a project setting like the others: one undoable step to change. Neither
`notes.toDocument()` nor `styles.toDocument()` carries it, and neither does a
[project file](./project-file): it belongs to the person writing, not the project. Empty or white space means no name; at most 256 characters. It is a claim, never a
verified identity, and the element never makes one up.

## What a note points at now

A note is deleted only by `remove`, or by undoing the `add` that wrote it. Reloading the data, a
filter, removing a set, re-running or removing a run, or opening a file never deletes, moves or
edits a note. Its **status** says what each target points at now, worked out when read:

```typescript
const status = session.notes.status(id);
for (const [index, target] of status.targets.entries()) {
    console.log(index, target.state, target.label); // 0 "missing" "ada"
}
```

| `state`       | Means                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| `present`     | It is in the graph and showing                                                |
| `filtered`    | It is in the graph, but a filter or the time window hides it                  |
| `missing`     | It is not in the graph: not loaded, deleted, a removed set, a removed result  |
| `earlier-run` | An item from a run of the result before the current one                       |
| `unsupported` | A target kind this release does not know; kept and saved back exactly as read |

A target that comes back -- the node reappears in the next load, the set is restored -- reads
`present` again with nothing to repair. Cites read `current`, `earlier-run`, `missing` or
`unsupported`. Both lists are open unions; treat an unknown state as "not present" and show its
`label`, which is display text (a node's id, an edge's ends, a set's name), never markup. A note
opened from a file also has `status.source`: the file's name and when it was opened.

There is no event for a status change: status follows the data, so re-read it on the events you
already watch.

## Selecting what a note is about

```typescript
await element.select({ note: id }); // every target of the note that is in the graph
await element.select({ note: id, target: 0 }); // only its first target
```

A set or item target selects its members. A target reading `missing` is skipped, and the result's
`skipped` says how many were, so an application can say "not in the current data" without working
it out. A note naming a set is listed by `session.sets.usedBy(setId)` as
`{ kind: "note", id, label }`, labeled with the note's first line.

## Hearing about changes

```typescript
const stop = session.on("note:changed", ({ id, change, fields, note, cause }) => {
    // change: "created" | "updated" | "removed"; fields: what an update touched
    redrawNotesPanel(id);
});

element.addEventListener("graphty-note-change", (e) => redrawNotesPanel(e.detail.id));
```

One event per note a write touched, after the write; a refused write publishes nothing. `cause` is
`"command"`, `"undo"`, `"redo"` or `"load"`. The DOM event carries `{ id, change, fields, cause }`
as plain values; read the note with `session.notes.get(id)`. See [Events](./events).

## Undo

Every write is one step in the history, labeled "Added note", "Edited note", "Removed note" or
"Added notes from &lt;name&gt;". Undoing an `add` deletes the note, and redoing it brings back the
same id, time and author. Note writes made through `tx.notes` inside `session.transaction(...)`
join the transaction's one step. See [Undo and History](./undo).

## Notes in styles

Three values a style layer can read on every node and edge:

| Path                       | Value                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| `graphty.notes.count`      | How many notes name this node or edge; **no value** when none do |
| `graphty.notes.latest`     | The text of the newest of those notes; no value when none        |
| `graphty.notes.latestTime` | The `time` of the newest of those notes; no value when none      |

Only node and edge targets count: a note about a set, an item, a result or the graph counts on
none of their members. Because an element without notes has no `graphty.notes.count`,
`{ match: "has", path: "graphty.notes.count" }` selects exactly the noted ones; the expression
`` graphty.notes.count > `0` `` does the same. There is no built-in notes look: to make noted
elements stand out, add an ordinary layer, as in the quick start.

```typescript
await session.styles.add({
    name: "Noted",
    target: "node",
    selector: { match: "has", path: "graphty.notes.count" },
    set: { "node.color": "#f59e0b" },
});
```

The paths work in a layer's `selector`, in a binding's `by`, and in `select({ where })`. The
visibility filter, run scopes and recipes refuse them (`E_BAD_SELECTOR`, reason `notes-path`),
because a note must not change what a result is computed over.

A label or tooltip bound to a `graphty.notes.*` path is drawn as literal text, never as label
markup. The `graphty.` root is reserved for values the element provides; see
[Styling](./styling#values-the-element-provides).

## Saving and opening

`toDocument()` returns the session's notes as a `graphty-notes` document, version 1: plain JSON,
oldest first, the same bytes for the same notes. `mergeDocument()` adds a saved document's notes
to the session's, in one undoable step:

```typescript
const doc = session.notes.toDocument({ name: "Ring A findings" });
localStorage.setItem("notes", JSON.stringify(doc));

const report = session.notes.mergeDocument(JSON.parse(localStorage.getItem("notes")!), { name: "notes.json" });
console.log(`${report.added.length} added, ${report.missing} about things not in this graph`);
```

To keep notes in a file, write `toDocument()`'s JSON to a file named `*.graphty.json`: a bare notes
document is a valid `.graphty.json` file, and `session.project.open` adds it to a session. To keep
the notes together with the data, the runs and the styles, save a
[project file](./project-file) with `session.project.save()`.

**Opening always merges; it never deletes a note.** On a fresh session it restores the notes
exactly, with their ids and times, and merging the same document twice changes nothing. When a
saved note and a held note share an id but disagree, `onConflict` decides:

| `onConflict`            | What happens                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `"keep-both"` (default) | The saved note is added under a new id (`report.renamed`), unless the held note is a later edit of it (`report.older`) |
| `"replace"`             | The saved note replaces the held one, author and time included (`report.replaced`)                                     |
| `"keep-mine"`           | The held note stays (`report.kept`)                                                                                    |

- **All or nothing.** A value that is not a `graphty-notes` document is refused whole with
  `E_BAD_DOCUMENT`, another version with `E_UNSUPPORTED_VERSION`, and one that would take the
  session past 10,000 notes with `E_TOO_LARGE`. Nothing changes then.
- **One bad note is skipped alone**, listed in `report.skipped` with its JSON pointer, and never
  repaired. Unknown fields are kept and written back, listed in `report.notices`.
- **Targets bind by identity only.** Node and edge targets bind to the same ids in this graph. A
  set, result or item target, or a cite, binds only to what the same file carries, because two
  unrelated projects can share a set or result id: on its own, such a target reads `missing` and
  keeps its label. A notes document opened on unrelated data shows nearly every note missing,
  which tells the reader at once that it belongs to other data.

## Exporting to graph formats

No graph format holds notes as notes, so a GEXF, GraphML, CSV or other export leaves them out by
default, and says so: every export of a session holding notes reports a `W_GRAPHTY_NOTES` loss
note with the number left out.

```typescript
const result = await element.exportGraph("graphml", { notes: true });
result.lossNotes; // [{ code: "W_GRAPHTY_NOTES", count: 3, ... }]
```

With `{ notes: true }`, noted nodes and edges gain two columns: `graphty.notes.count`, and
`graphty.notes.text`, the text of every note about that element, newest first, joined by a blank
line and cut to 64 KB per cell (`W_GRAPHTY_TRUNCATED`). Notes about sets, items, results or the
graph, and every field but the text, go nowhere: save the notes document beside the export to keep
them. Read back, the two columns are ordinary data (`data.graphty.notes.count`); they do not become
notes. A later export leaves any loaded column under the reserved `graphty.` root out, and reports
each one as a `W_GRAPHTY_COLUMN_DROPPED` loss note.

## Limits

| Limit                   | Value                 |
| ----------------------- | --------------------- |
| Notes per session       | 10,000                |
| Targets per note        | 64                    |
| Cites per note          | 64                    |
| Text                    | 65,536 code points    |
| One note, saved as JSON | 256 KB                |
| `extensions`            | 64 KB, 32 levels deep |
| `author`                | 256 characters        |
| `mediaType`             | 255 characters        |
