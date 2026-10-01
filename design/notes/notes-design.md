# Notes in graphty-element

Status: design, not built. Written 2026-10-01 for two readers: a third party who uses
`<graphty-element>` and has never seen this repository (sections 1 to 6), and the implementer who
builds it (sections 7 and 8). Schema: [notes.schema.json](notes.schema.json), normative for the
file form. The owner's decisions behind this page (all taken on 2026-10-01) and what it replaces
are in [notes-decisions.md](notes-decisions.md); the build order is in [notes-plan.md](notes-plan.md).

A **note** is a piece of text a person writes about something in a graph -- a node, an edge, a
group, a path, a result, the whole graph -- with the time it was written. graphty-element stores
notes, undoes and redoes them, saves and opens them, and lets style layers read them. It never
interprets what a note says.

---

## 1. What graphty-element does with a note's text

### 1.1 Plain text, always

A note's text is a plain string. graphty-element:

- stores it exactly as given -- every character, every line break, every space at either end;
- never parses, renders, sanitizes, trims or normalizes it (no Unicode normalization, no
  line-ending conversion);
- never puts it into a selector, an expression, a file name or HTML;
- refuses only text that is empty or holds nothing but white space, and text longer than 65,536
  characters. A "character" here is a Unicode code point, so an emoji counts as one. White space
  is what JavaScript's `/\s/u` matches; a note holding only a zero-width space (U+200B) is
  accepted, because that character is not white space.

Wherever graphty-element draws a note's text itself -- a label bound to `graphty.notes.latest` (section 6)
-- it draws the characters, never markup. A label bound to a note reading `**urgent**` shows the
ten characters `**urgent**`; one reading `<color='red'>x</color>` shows all 20 characters.

This is what lets each application read notes its own way: the graphty app reads them as Markdown
(section 9), another application may read them as HTML, a plain editor reads them as text, and
all of them carry each other's notes through untouched.

### 1.2 Note text comes from untrusted files

A saved file can come from anyone. An application that interprets note text -- as Markdown, as
HTML, as anything -- MUST treat it as untrusted input: never run script from it, never load remote
resources from it unless the reader asks, and never let it pose as the application's own
interface. graphty-element can guarantee none of this, because it never interprets the text; the
rule is on the interpreter. The same holds for any automated reader: a language model given note
text must be given it as quoted data, never as instructions.

### 1.3 A hint of how the writer meant the text

If one application writes HTML notes and another reads every note as Markdown, the second shows
the first one's notes wrongly. A note can carry a hint:

```ts
readonly mediaType?: string; // "text/markdown", "text/html", "text/plain", "text/markdown; variant=GFM"
```

- graphty-element stores it and writes it back exactly. It never acts on it, never fills it in,
  and checks only its shape: `type/subtype`, optionally followed by `;` parameters in visible
  ASCII, at most 255 characters.
- Absent means "the writer said nothing"; each reader uses its own convention.
- A reader choosing how to show a note compares the type and subtype without regard to case and
  ignores the parameters, so `Text/Markdown; charset=utf-8` counts as Markdown. A Markdown flavor
  goes in RFC 7763's `variant` parameter, so a later flavor needs no new field.

The graphty app writes `text/markdown` on every note it writes (section 9).

---

## 2. Quick start

```ts
import "@graphty/graphty-element"; // defines <graphty-element> and gives it its TypeScript type

const el = document.querySelector("graphty-element")!; // typed as Graphty, not Element
const { session } = el;

// 1. Load the graph. A JSON file keeps its ids as written: 11 stays the number 11.
await session.data.import({ config: { url: "/people.json" } });

// 2. Write a note about node 11, then list the notes about it, newest first.
session.notes.add({ text: "Bridges the two halves.", targets: [{ node: 11 }] });
const aboutEleven = session.notes.list({ target: { node: 11 } });

// 3. Label every node that has a note with its number of notes ("1", "2", ...).
await session.styles.add({
    name: "Note count",
    target: "node",
    selector: { match: "has", path: "graphty.notes.count" }, // only nodes with at least one note
    encode: { "node.label": { by: "graphty.notes.count" } },
});

// 4. Save the notes and the layer. The data stays wherever it came from.
const saved = { styles: session.styles.toDocument(), notes: session.notes.toDocument() };
localStorage.setItem("my-notes", JSON.stringify(saved));

// 5. Reopen on a fresh page: load the same data, then put back the layer and the notes.
const back = JSON.parse(localStorage.getItem("my-notes")!);
await session.data.import({ config: { url: "/people.json" } });
await session.styles.applyTemplate(back.styles);
session.notes.mergeDocument(back.notes);
```

What the example relies on:

- **The type.** Importing the package registers `<graphty-element>` with TypeScript, so
  `querySelector("graphty-element")` returns a `Graphty` (the element's class, also exported by
  name). `el.session` exists as soon as the element is created, before it is in the page.
- **Loading.** `session.data.import` reads a file, a URL or inline text; see
  [Data sources](https://graphty.app/docs/graphty-element/guide/data-sources). Another way to load
  is fine; nothing about notes depends on how the data arrived.
- **No waiting for the data.** Note writes are synchronous and safe before the data loads. A note
  about a node the graph does not hold yet is kept, and simply counts nowhere until that node
  arrives (section 4).
- **Node ids.** A node is named by its id. `11` and `"11"` name the same node: notes compare node
  ids by their text, because the same file can load as either type depending on the format (CSV
  reads every id as text; JSON keeps numbers). Section 3.3 has the one exception.
- **The layer.** `styles.add` takes a layer: a `name`, a `target` (`"node"` or `"edge"`), a
  `selector` saying which elements it applies to, and `encode`, which binds a channel such as
  `node.label` to a value with `by`. `graphty.notes.count` has no value on a node without notes, so the
  `has` selector picks out exactly the noted nodes, and nodes without notes keep whatever label
  they had. A number bound to a label is drawn as its digits (`3` becomes `"3"`, no locale, no
  separators). The `await` waits until the picture shows the layer; the layer is in the stack as
  soon as `add` returns. See [Styling](https://graphty.app/docs/graphty-element/guide/styling).
- **Repainting.** Adding, editing, removing, undoing or merging a note repaints the labels that
  change. There is nothing to call.
- **Reopening.** `mergeDocument` adds the saved notes to the ones the session already holds; it
  never deletes any. On a fresh page there are none, so merging restores them exactly, with their
  ids and times. Merging the same notes twice changes nothing. To restore and nothing else, start
  from a session with no notes. Section 7.6 says what happens when a held note and a saved note
  disagree; `mergeDocument(doc, { onConflict: "keep-mine" })` keeps yours.
- **Undo.** `session.undo()` takes back the last note write, like any other change.

### 2.1 Targets and cites

A note's **targets** are what it is about; its **cites** are results the claim rests on. A note
about node 11 that says "highest betweenness, 0.57" has node 11 as its target and the betweenness
result as a cite:

```ts
const run = el.run("betweenness"); // starts an algorithm; `await run` waits for it
await run;
session.notes.add({ text: "Highest betweenness, 0.57.", targets: [{ node: 11 }], cites: [{ result: run.id }] });
```

The note is listed under node 11, not under the result. A cite remembers which run of the result
the note was written against, so after a re-run its status says the claim came from an earlier run.

### 2.2 When a write is refused

```ts
import { isGraphtyError } from "@graphty/graphty-element";

try {
    session.notes.add({ text: "  ", targets: [{ node: 11 }] });
} catch (error) {
    if (isGraphtyError(error) && error.details?.reason === "empty-text") showHint("Type a note first");
    else throw error;
}
```

Section 5.4 lists every reason.

### 2.3 An author name

Notes carry no name unless the project's author setting holds one:

```ts
await session.config.set({ author: "Ada" }); // notes written from now on say "Ada"
await session.config.set({ author: null }); // and from now on, no name
```

---

## 3. The note record

### 3.1 The type

```ts
type NoteId = string; // "note_" then opaque characters; globally unique

interface Note {
    readonly id: NoteId; // REQUIRED. Made by graphty-element
    readonly time: string; // REQUIRED. When it was written; stamped by graphty-element
    readonly targets: readonly NoteTarget[]; // REQUIRED. What it is about: one to 64
    readonly text: string; // REQUIRED. Plain text, not blank, at most 65,536 characters
    readonly mediaType?: string; // optional. Section 1.3
    readonly author?: string; // optional. From the author setting, when one is set
    readonly edited?: string; // optional. When it last changed; stamped by graphty-element
    readonly cites?: readonly NoteCite[]; // optional. Results the claim rests on
    readonly extensions?: Readonly<Record<string, unknown>>; // optional. Other applications' data
}

interface NoteCite {
    readonly result: ResultId; // the result
    readonly run: string; // which run of it the note was written against; compare for equality only
}
```

`ResultId`, `ResultItem`, `SetId`, `NodeId`, `EdgeId` and `EdgeMember` are graphty-element's
existing types. Every note type is exported from `@graphty/graphty-element` and from the
Node-safe `@graphty/graphty-element/session` entry point.

Records are frozen. `get` and `list` return the same object until the note changes, so `a === b`
is a valid "unchanged" test. A field with no value is absent: never `""`, never `null`, never a
stand-in such as "Anonymous". A record holds only what is saved with the note; what is worked out
from the graph (section 4) is read separately, so `Note` is also exactly the saved form.

Unrelated: an algorithm's result can carry its own `notes` field (a list of remarks about the run,
such as Louvain's). That has nothing to do with `session.notes`.

### 3.2 Required fields

| Field | Rule |
|---|---|
| `id` | `note_` followed by 1 to 64 of `[0-9A-Za-z_-]`. graphty-element makes it; `add` never takes one. Compare for equality only. Ids are globally unique, because notes travel between people's files and are matched by id when opened. |
| `time` | A date and time with an explicit offset. graphty-element writes UTC as `Date.prototype.toISOString()` does: `2026-10-01T09:12:03.120Z`. `add` never takes one. |
| `targets` | One to 64 (section 3.3). A list, because "these two accounts are the same person" is one note about two things. Duplicates are collapsed to the first. |
| `text` | Section 1.1. |

### 3.3 Targets

```ts
type NoteTarget =
    | { readonly graph: true } // the whole graph
    | { readonly node: NodeId } // one node, by its id
    | { readonly edge: EdgeMember } // one edge: its two ends, plus the file's edge id or its position
    | { readonly set: SetId; readonly name?: string } // a kept set: a kept group, selection or path
    | { readonly result: ResultId } // a result as a whole: a run, a measure such as PageRank
    | { readonly item: ResultItem }; // one group or path a run found, in that run

// What add, update and list accept. An edge may also be given by its session EdgeId, and an item
// may leave out `run` (it means the result's current run).
type NoteTargetInput = NoteTarget | { readonly edge: EdgeId };
```

`NoteTarget` is an OPEN UNION: kinds may be added in a minor release. Show a kind you do not know
by its `label` from `status()` (section 4.2).

| The owner's word | Target |
|---|---|
| node | `{ node }` |
| edge | `{ edge }` |
| group | `{ item }` for a group a run found ("community 3"); `{ set }` once the group is kept as a set |
| path | `{ set }` for a kept path (`sets.createPath`); `{ item }` for the path a shortest-path run found |
| run, measure | `{ result }` |
| the whole graph | `{ graph: true }` |
| filter step | not yet: filter steps have no lasting ids |

How each target keeps pointing at the same thing:

- **A node** is named by its id. Ids compare by their text (`11` and `"11"` are the same node),
  except that when the graph holds both a number and a string with the same text, a target binds
  to the one of its own type.
- **An edge** is saved by its two ends plus the file's edge id or, for an edge without one, its
  position among the edges between the same two nodes (`ordinal`, out of `among`). A session
  `EdgeId` passed to `add` is turned into this form, because an `EdgeId` is renumbered on every
  load. An edge saved by position finds no edge once the pair has a different number of edges; if
  one edge of a pair is removed and another added, the position can name the new edge. Give edges
  ids in your data when notes about them matter.
- **A set** is saved by its id, plus its name for display.
- **A result** is saved by its id. The note follows the result across re-runs.
- **An item** ("community 3 of this Louvain result") is always saved with the run it was written
  against. Group numbers mean nothing across runs, so a note never moves to whatever is numbered 3
  after a re-run; its status says "earlier run" instead.

### 3.4 Optional fields

| Field | Set by | What it is for |
|---|---|---|
| `author` | graphty-element, from the project's author setting (section 5.5), when one is set | Who wrote it. Usually absent. A claim, never a verified identity. |
| `edited` | graphty-element, on every `update` that changes something | That the note changed after it was written. No history is kept. |
| `cites` | you pass `{ result }`; graphty-element adds the result's current finished run | Section 2.1. |
| `mediaType` | you | Section 1.3. |
| `extensions` | you | Data an application keeps about a note (a done flag, tags, a color) without a graphty-element release. Keys are reverse-domain names you own (`"com.example.casebook"`), so two applications never overwrite each other. graphty-element keeps it and writes it back; it never reads it. The value must be plain JSON (section 5.4). |

Not in the record, and why (each could be added later as an optional field): **tags** (a kept set
groups things, and an application can keep tags in `extensions`); **status, done, replies,
threads** (they assume people editing one file together, and graphty has no accounts);
**`editedBy`** (the author is usually empty); **revisions, digests, quotes, confidence**; **a
position, a color or any look** (a note's look is a style layer, section 6).

### 3.5 Order

- `list()` returns notes **newest first**: by `time`, then by `id`. Editing a note does not move it.
- A saved file holds them **oldest first**, so a new note is added at the end and a file under
  version control changes where something changed.

### 3.6 Which graph

A session's notes are about that session's graph and nothing else; `{ graph: true }` means that
graph. An application that shows several graphs uses one session (one element) per graph.

---

## 4. When what a note points at changes

### 4.1 The rule

**A note is deleted only by `notes.remove` (or by undoing the `add` that wrote it).** Nothing
else -- reloading the data, a filter, removing a set, re-running or removing a run, opening a file
-- deletes, moves or edits a note. When what a note points at changes, the note stays as it is and
its **status** says what happened. The status is worked out when it is read, so a target that
comes back (the node reappears in the next load, the set is restored) is found again with nothing
to repair.

| What happened | The target reads |
|---|---|
| The node or edge is in the graph and visible | `present` |
| It is in the graph, but a filter or the time window hides it | `filtered` |
| It is not in the graph (deleted, not in this load, another dataset) | `missing` |
| An edge saved by position, where the two nodes now have a different number of edges | `missing` |
| The data comes back with that node id or that edge | `present` again |
| The set was removed | `missing`, labeled with the set's name; restoring the set makes it `present` |
| The result was re-run | `{ result }`: `present`; `{ item }`: `earlier-run` |
| The result was removed | `missing` |
| A target of a kind, or with a field, this release does not know | `unsupported`; kept and saved back exactly |

A cite reads `current` (the result's current run is the one cited), `earlier-run` (it is another
run, or the cited run came from another session), `missing` (the result is gone) or `unsupported`.

### 4.2 Reading the status

```ts
interface NoteStatus {
    /** One per entry of `note.targets`, in the same order. */
    readonly targets: readonly NoteTargetStatus[];
    /** One per entry of `note.cites`, in the same order; empty when the note cites nothing. */
    readonly cites: readonly NoteCiteStatus[];
    /** Present when the note came from an opened file: which one, and when (section 7.6). */
    readonly source?: { readonly name?: string; readonly opened: string };
}

interface NoteTargetStatus {
    /** OPEN UNION: values may be added in a minor release. */
    readonly state: "present" | "filtered" | "missing" | "earlier-run" | "unsupported";
    /** Text to show for it, never markup. */
    readonly label: string;
}

interface NoteCiteStatus {
    /** OPEN UNION. */
    readonly state: "current" | "earlier-run" | "missing" | "unsupported";
    readonly label: string;
}
```

`label` is display text, not a contract: a node's id; an edge's two ends joined by `" -> "`
(directed) or `" -- "` (undirected); a set's name; a result's id; an item as the result id plus
its key ("louvain: community 3"); `"Graph"` for the graph. A later release may improve labels (a
node's display name, once the element has one) without notice.

There is no event for a status change: status follows the data, so re-read it on the events you
already watch (`note:changed`, `project:changed`, `visibility:changed`, `run:changed`).

---

## 5. The API

All of it is on `session.notes`. A session made without an element (`createGraphSession()` from
`@graphty/graphty-element/session`, in Node for example) has the same API.

### 5.1 The interface

```ts
interface NotesApi {
    /**
     * Notes, newest first. The same frozen objects until a note changes.
     * @param options.target - Only notes about this target, or about any of these targets. Exact:
     *     a note about community 3 is not listed under each of its members, and a note that cites
     *     a result is not listed under the result.
     * @param options.targetKind - Only notes with at least one target of this kind ("node", "edge", ...).
     * @param options.cites - Only notes citing this result, whichever run they cite.
     * @param options.author - Only notes with exactly this author.
     * @param options.missing - true: only notes with at least one target reading `missing`.
     */
    list(options?: {
        readonly target?: NoteTargetInput | readonly NoteTargetInput[];
        readonly targetKind?: string;
        readonly cites?: ResultId;
        readonly author?: string;
        readonly missing?: boolean;
    }): readonly Note[];
    /** One note, or undefined when no note has that id. */
    get(id: NoteId): Note | undefined;
    /** What each target and cite of a note points at now (section 4.2). */
    status(id: NoteId): NoteStatus;
    /** The distinct authors of the session's notes, in the order of their first note. */
    authors(): readonly string[];
    /** How many notes, and how many distinct nodes and edges in the graph have at least one. */
    counts(): { readonly notes: number; readonly nodes: number; readonly edges: number };
    /** Write a note. One undoable step. @returns The new note's id. */
    add(input: NoteInput): NoteId;
    /** Change a note. One undoable step; stamps `edited`. A change that changes nothing records nothing. */
    update(id: NoteId, patch: NotePatch): void;
    /** Delete a note. One undoable step; undo brings it back with the same id. */
    remove(id: NoteId): void;
    /** The session's notes, ready to save (section 7). */
    toDocument(options?: { readonly name?: string; readonly description?: string }): NotesDocument;
    /** Add saved notes to the session (section 7.6). One undoable step. */
    mergeDocument(document: unknown, options?: NoteMergeOptions): NotesReport;
}

interface NoteInput {
    readonly text: string;
    readonly targets: readonly NoteTargetInput[];
    readonly cites?: readonly { readonly result: ResultId }[];
    readonly mediaType?: string;
    readonly extensions?: Readonly<Record<string, unknown>>;
}

/** A field left out is unchanged. `null` clears an optional field; `cites: []` clears the cites. */
interface NotePatch {
    readonly text?: string;
    readonly targets?: readonly NoteTargetInput[];
    readonly cites?: readonly { readonly result: ResultId }[];
    readonly mediaType?: string | null;
    readonly extensions?: Readonly<Record<string, unknown>> | null;
}

interface NoteMergeOptions {
    /** What to do when a saved note and a held note share an id but disagree. Default "keep-both". */
    readonly onConflict?: "keep-both" | "replace" | "keep-mine";
    /** What to call the source in each note's status and in the history: usually the file name. */
    readonly name?: string;
}
```

- `add` stamps `id`, `time` and `author` itself and refuses an input carrying any of them, or
  `edited` (section 5.4). One way to set an author means no call can forget it.
- A cite is pinned to the result's current finished run; a result with none (queued, running,
  failed) is refused. A cite left unchanged by an `update` keeps its pin.
- `update` never changes `author` or `time`. Editing someone else's note keeps their name.
- `toDocument` and `mergeDocument` are the way to save and open notes on their own, and stay the
  advanced path once whole-file saving exists (section 7.9).

### 5.2 Events

```ts
const stop = session.on("note:changed", (change) => redrawNotesPanel(change.id)); // stop() unsubscribes
el.addEventListener("graphty-note-change", (e) => redrawNotesPanel(e.detail.id)); // the same, on the element

interface NoteChange {
    readonly id: NoteId;
    /** OPEN UNION. */
    readonly change: "created" | "updated" | "removed";
    /** Which fields an "updated" change touched; empty otherwise. OPEN UNION. */
    readonly fields: readonly ("text" | "targets" | "cites" | "mediaType" | "extensions")[];
    /** The frozen record after the change; null after removal. Not in the DOM event's detail. */
    readonly note: Note | null;
    /** OPEN UNION: a write, a history move, or a saved project being opened. */
    readonly cause: "command" | "undo" | "redo" | "load";
}
```

One event per note a write touched, after the write; `mergeDocument` publishes one per note it
added or replaced. A refused write publishes nothing. The element's `graphty-note-change` event
carries `{ id, change, fields, cause }`, plain values like its other events; read the note with
`session.notes.get(id)`. The `"load"` cause arrives with project files (issue #301 in the graphty
repository), which do not exist yet.

### 5.3 Undo and transactions

Every write is one step in `session.history`, labeled "Added note", "Edited note", "Removed note"
or "Added notes from <name>". `session.transaction(label, (tx) => ...)` groups note writes made
through `tx.notes` with other changes into one step, as it does for everything else. Undoing an
`add` deletes the note; redoing it brings back the same id, time and author.

### 5.4 Errors

A refused write changes nothing and throws a `GraphtyError` (test with `isGraphtyError`, section
2.2). The reason is in `error.details.reason`, an OPEN UNION:

| Code | `details.reason` | When |
|---|---|---|
| `E_BAD_COMMAND` | `"empty-text"` | `text` is empty or only white space |
| `E_BAD_COMMAND` | `"text-too-long"` | `text` is longer than 65,536 characters |
| `E_BAD_COMMAND` | `"no-targets"` | `targets` is empty |
| `E_BAD_COMMAND` | `"too-many"` | more than 64 targets or 64 cites (`details.field`) |
| `E_BAD_COMMAND` | `"bad-target"` | a target is malformed, or names an edge by an `EdgeId` the graph does not hold (`details.index`) |
| `E_BAD_COMMAND` | `"unknown-target"` | a set, result or item names an id this session does not hold (`details.index`) |
| `E_BAD_COMMAND` | `"unknown-cite"` | a cite names a result this session does not hold |
| `E_BAD_COMMAND` | `"not-finished"` | a cite, or an item without `run`, names a result with no finished run |
| `E_BAD_COMMAND` | `"bad-media-type"` | `mediaType` is not `type/subtype` with optional parameters, or is longer than 255 characters |
| `E_BAD_COMMAND` | `"bad-extensions"` | `extensions` is not plain JSON (below), or a key is not a reverse-domain name |
| `E_BAD_COMMAND` | `"element-field"` | the input carries `id`, `time`, `author` or `edited` (`details.fields` names them) |
| `E_BAD_COMMAND` | `"unknown-id"` | `update`, `remove` or `status` names a note that does not exist |
| `E_TOO_LARGE` | `"notes"` | the session would hold more than 10,000 notes |
| `E_TOO_LARGE` | `"note-size"` | the note, saved as JSON, would be larger than 256 KB |

**Plain JSON** means objects, arrays, strings, finite numbers, booleans and `null`, nested at most
32 levels and at most 64 KB once saved. A `Map`, a `Date`, a typed array, a function or a cycle is
refused rather than silently changed on the next save.

A node or edge the graph does not hold **is accepted** (it reads `missing`): you may write notes
before the data has loaded. A set, result or run id is checked, because a mistyped one can never
become valid.

### 5.5 The author setting

```ts
await session.config.set({ author: "Ada" }); // a project setting, like the others
session.config.author; // "Ada", or undefined
```

- It is the project's author setting: saved with the project, and one undoable step to change,
  like every other project setting. It is never written into a saved notes file except as each
  note's own `author`.
- Empty or only white space counts as no name; at most 256 characters. graphty-element never makes
  one up.
- graphty-element stamps it on each note it adds (and, when recipes record who saved them, on the
  recipe).

### 5.6 Selecting what a note is about

```ts
await el.select({ note: id }); // every target of the note that is in the graph
await el.select({ note: id, target: 0 }); // just its first target
```

A set or item target selects its members. Targets reading `missing` are skipped, and the result
says how many were (`SelectionDelta.skipped`), so an application can say "not in the current data"
without working it out.

### 5.7 Sets know their notes

A note naming a set is listed by `sets.usedBy(id)` as `{ kind: "note", id: <note id>, label:
<the note's first line, cut to 80 characters> }`.

---

## 6. Notes in styles

### 6.1 The paths

| Path | Value on a node or an edge |
|---|---|
| `graphty.notes.count` | how many notes have this node or edge among their targets; **no value** when none |
| `graphty.notes.latest` | the text of the newest of those notes; no value when none |
| `graphty.notes.latestTime` | the `time` of the newest of those notes; no value when none |

- Only node and edge targets count. A note about a set, an item, a result or the graph does not
  count on their members, and a note with two node targets counts on both.
- Because a node without notes has no `graphty.notes.count`, `{ match: "has", path: "graphty.notes.count" }`
  selects exactly the noted nodes, and the expression form ``graphty.notes.count > `0` `` does the same
  (a number in an expression goes between backticks; see
  [Styling](https://graphty.app/docs/graphty-element/guide/styling)).
- There is no built-in notes layer and no default note look. To make noted elements stand out, add
  an ordinary layer, as in section 2.

### 6.2 Where the paths work

In version 1, `graphty.notes.*` paths work in a style layer's `selector`, in a binding's `by`, and
in `select({ where })`. They are refused everywhere else, because those places decide what a result
or a set is computed over, and a note must not change a result:

- the visibility filter, run scopes and recipes refuse them with `E_BAD_SELECTOR`,
  `details.reason: "notes-path"`;
- set rules already refuse every path root but `data.` and `results.` (`E_BAD_COMMAND`,
  `details.reason: "reserved-root"`), and keep doing so.

Allowing them in more places later is an addition.

### 6.3 Labels draw text, never markup

A label or tooltip whose text comes from a `graphty.notes.*` binding is drawn as literal text: the
characters of the note, never the label markup (`<bold>`, `<color='...'>` and the rest). This
ships with notes and changes nothing else.

The same rule for every bound value -- a data column or a result bound to a label is drawn
literally too, and markup works only in a label written as a literal value in a layer -- is a
separate change. Today every label and tooltip goes through the label markup parser, so a data
column bound to a label restyles itself when a value holds `<bold>` or `<color='red'>`. Fixing that
changes how existing data labels render, so it is a breaking change for graphty-element and ships
in its own pull request, held for the next grouped major release (notes-decisions.md, decision 8;
notes-plan.md, "The breaking change"). Until that release, a data or result label keeps today's
behavior.

### 6.4 The `graphty.` path root

Today a path that starts with neither `data.` nor `results.` reads a data column, so
`graphty.notes.count` would read a column literally named `graphty.notes.count`. **Every path
starting `graphty.` is reserved for values graphty-element itself provides**, in style version 1 --
the note values now, and any value the element provides later (a degree, a display name, ...) under
the same root:

- A data column whose name starts `graphty.` stays reachable as `data.graphty.<name>`.
  graphty-element's own writers always write `data.`, so no file it wrote changes meaning, and
  columns starting `graphty.` are already the element's own bookkeeping, which the plugin guide
  tells authors not to read. `styles.validate` reports a bare `graphty.` path when the data has a
  column of that name.
- A `graphty.` path this release does not know has no value and the layer is reported unbound, so a
  later path (`graphty.notes.authors`, say) is an addition, not a new style version.
- A release that does not know the root at all reads the paths as absent columns: the layer
  paints nothing and is reported unbound. Nothing is painted wrongly.

---

## 7. Saving and opening: the `.graphty.json` form

### 7.1 Where notes live

- **In the session**, beside the sets and the style layers. A project file (issue #301, not built
  yet) will save and restore them with everything else.
- **In a `.graphty.json` file**, as a member of the kind **`graphty-notes`**, version 1. A file may
  hold notes beside styles, recipes and data, or nothing but notes. A bare `graphty-notes` object,
  as `toDocument()` returns it, is also a valid file.

A release that does not know `graphty-notes` skips that member with `W_UNKNOWN_KIND` and keeps it
in place when it saves the file again.

### 7.2 The member

Schema: [notes.schema.json](notes.schema.json), `$id`
`https://graphty.app/schema/documents/graphty-notes/v1.json`.

```ts
interface NotesDocument {
    kind: "graphty-notes";
    version: 1;
    name?: string; // at most 1,024 characters
    description?: string; // at most 65,536 characters
    notes: Note[]; // at most 10,000, oldest first
    extensions?: Record<string, unknown>; // reverse-domain keys
}
```

```json
{
    "kind": "graphty-document",
    "version": 1,
    "generator": { "name": "graphty-element", "version": "3.2.0" },
    "members": [
        {
            "kind": "graphty-notes",
            "version": 1,
            "name": "Ring A findings",
            "notes": [
                {
                    "id": "note_01K6A1B2C3D4E5F6G7H8J9K0M1",
                    "time": "2026-10-01T09:12:03.120Z",
                    "targets": [{ "node": "ACC-1042" }, { "node": "ACC-1043" }],
                    "text": "Opened the same day from **one device**.",
                    "mediaType": "text/markdown"
                },
                {
                    "id": "note_01K6A1C9Q2W3E4R5T6Y7U8I9O0",
                    "time": "2026-10-01T09:20:41.007Z",
                    "targets": [{ "edge": { "source": "ACC-1042", "target": "DEV-77", "id": "login-2026-09-18" } }],
                    "text": "First shared login; the chargebacks start 36 hours later.",
                    "author": "Ada",
                    "edited": "2026-10-01T10:02:15.530Z",
                    "extensions": { "com.example.casebook": { "done": true } }
                }
            ]
        }
    ]
}
```

### 7.3 Writing rules

1. Key order inside a note: `id`, `time`, `targets`, `text`, `mediaType`, `author`, `edited`,
   `cites`, `extensions`, then fields this release does not know, as read. The same notes give
   the same bytes.
2. `author` is written only when it has a value.
3. A writer produces only the target forms the schema lists by name: edges as their ends plus `id`
   or `ordinal`/`among`, items and cites with `run`, sets with `name` when the set has one. A
   target read as `unsupported` is written back exactly as read.
4. Nothing worked out from the graph is written: no status, no counts, and not where a note came
   from (section 7.6).

### 7.4 Rules for later versions

These keep version 1 open to additions without breaking older readers:

1. **New target kinds and new forms of an existing target are additions.** A reader checks each
   target on its own: one that matches no form it knows reads `unsupported`, and the note is still
   added. The same holds for cites. container.md lists "note target kinds" and "item key forms"
   among the open lists. Reserved target keys for later: `filterStep`, `note` (a note about a
   note), `where`, `layer`, `point`.
2. **`text` is always the complete readable form of the note.** A later richer body is an extra
   field, and `text` stays its fallback.
3. **A later version 1 field must stay valid when `text`, `targets` or `cites` change without
   it**, because an older release edits those and writes unknown fields back unchanged. Anything
   derived from them either goes in version 2 or carries the `edited` value it was computed
   against, so a reader can tell it is stale.
4. Planned routes, so nobody improvises them: replies are notes with an optional `inReplyTo`
   (an older reader shows them as ordinary notes); tags become an optional `tags: string[]`, and a
   reader that finds both moves an application's tags out of `extensions`.
5. The limits (10,000 notes per member, 64 targets, 64 cites, 65,536 characters) are fixed for
   version 1.

### 7.5 How opened notes find their targets

Opened notes bind **by identity only**, and nothing is attached to a different element by
guessing:

- A node target binds to the node with that id (by text, section 3.3).
- An edge target binds to the one edge its ends and id identify, or by position while the pair
  still has `among` edges. An edge id graphty-element made up during a session (`graphty:e<n>`)
  means nothing in another session, so such a target reads `missing`.
- Set and result ids are short names that two unrelated projects can share (two people's sets
  named "Suspects" are both `set_suspects`). So a `{ set }`, `{ result }` or `{ item }` target or
  a cite read from a file binds only when the same file also carries what it names -- in version 1,
  a result made by a recipe in the same file (rule 8 of section 7.6). Otherwise it reads `missing`
  and keeps its label. A project file (issue #301) restores them bound, because it restores the
  sets and results too.
- A run pin only ever matches in the session that made the run, so an item target or a cite opened
  from a file never reads as the current run; once the result binds through a recipe in the same
  file, it reads `earlier-run`.

The merge report says how well the notes fit: `"34 notes; 3 are about things not in this graph"`.
A notes file opened on unrelated data shows nearly every note missing, which tells the reader at
once that it belongs to other data.

### 7.6 Opening: merge, never replace

`mergeDocument(member, options)`, and opening a file once whole-file opening exists, adds the
saved notes to the session's in one undoable step. **All or nothing:** the member is checked and
the final count worked out before anything changes; a member that is not a `graphty-notes`
object, breaks the limits below, or would take the session past 10,000 notes is refused whole
(`E_BAD_DOCUMENT` or `E_TOO_LARGE`) and nothing changes.

1. **A note whose id the session does not hold** is added with its id, `time`, `edited` and
   `author`. The file's `author` is the file's claim; it never changes the author setting. The
   note's status records where it came from (`source`: the `name` option or the member's `name`,
   and the time it was opened), saved with the project but never written into a notes file.
2. **A note whose content matches a held note** -- the same id with the same content, or any held
   note with the same content -- is `unchanged`. Times compare as instants (`...Z` and `+00:00`
   spellings of one time are equal), and `extensions` compare with sorted keys. Merging the same
   file twice changes nothing.
3. **A note whose id is held with different content** follows `onConflict`:
   - `"keep-both"` (the default): if the held note has the same `time` and a later `edited`, it is
     a later edit of the incoming one, which is reported as `older` and not added. Otherwise the
     incoming note is added under a new id and the report lists the pair. Neither person's words
     are lost, and an incoming note never overwrites a held one.
   - `"replace"`: the incoming note replaces the held one, author and time included. Never a
     default; an application asks first, naming how many held notes would change.
   - `"keep-mine"`: the held note stays; the incoming one is reported and not added.
4. **Two notes with one id inside one member**: the second is treated as rule 3 against the first.
5. **A note that fails the schema** -- no `time`, a `time` that is not a real date (month 13), no
   text, a malformed id, no targets -- is skipped alone, reported with `E_BAD_DOCUMENT` and its
   JSON pointer. It is never repaired: a note without a time is not stamped with the time it was
   opened. The others are added.
6. **A target or cite this release does not recognize** does not fail the note: it reads
   `unsupported` and is written back as read.
7. **Unknown fields of a note or of the member** are kept and written back, reported with
   `W_UNKNOWN_MEMBER`. `extensions` is never reported.
8. **Inside a file with recipes**, a `{ result }`, `{ item }` or cite whose result is the `as` of
   a recipe command in the same file is rewritten to the run id that recipe's application gives
   it, exactly as a style's `results.<as>.<field>` path is (container.md, "Applying a file" rule
   3). Until that run finishes, a `{ result }` target reads `missing`.
9. **Order in a file:** data, recipes, styles, then notes, so that every target can bind.
10. A `time` or `edited` more than a day after the moment of opening is kept, and reported as a
    notice: a note dated 2099 would otherwise sit at the top of every list unexplained.

```ts
interface NotesReport {
    readonly added: readonly NoteId[];
    readonly unchanged: number;
    readonly renamed: readonly { readonly from: NoteId; readonly to: NoteId }[]; // "keep-both" copies
    readonly older: readonly NoteId[]; // "keep-both": incoming notes a held note had already edited
    readonly replaced: readonly NoteId[];
    readonly kept: readonly NoteId[]; // "keep-mine": held notes the file disagreed with
    readonly missing: number; // added or replaced notes with at least one target reading `missing`
    readonly skipped: readonly Problem[]; // rule 5
    readonly notices: readonly Problem[]; // W_UNKNOWN_MEMBER, future times
}
```

`MemberReport` (container.md, "The report") gains `notes?: NotesReport`, and whole-file opening's
`onRepeat` gains `notes?: "keep-both" | "replace" | "keep-mine"`, default `"keep-both"`.

### 7.7 Saving

- Whole-file saving writes notes **only when asked** (`members` including `"graphty-notes"`). By
  default they are left out and listed in `report.leftOut` with their count, as data is. Notes are
  judgments about the data ("suspect", "confirmed ring member"), and a file saved to share a
  technique must not carry them by accident. When notes are written, the report's notices give
  their count and distinct authors.
- **Round trip:** a notes member opened from a file is replaced in place by the regenerated member
  when the file has one notes member, or matched by `name` when it has several. A notes member
  that was skipped stays in place exactly.
- A project file always saves the notes, with their sources; that is the project's own state.

### 7.8 Exporting to GEXF, GraphML, CSV and the other graph formats

No graph format holds notes as notes. What a format can hold is a column on node and edge rows:

| Exported | Where |
|---|---|
| `graphty.notes.count` | a node and edge column, with `exportGraph(format, { notes: true })` |
| `graphty.notes.text` | a node and edge column: the text of every note about that element, newest first, joined by a blank line, cut to 64 KB per cell (`W_GRAPHTY_TRUNCATED`) |
| Notes about sets, items, results or the graph; which elements a multi-target note joins; `time`, `edited`, `author`, `cites`, `mediaType`, `extensions` | nowhere; only in a `.graphty.json` saved beside the export |

- Every export of a session holding notes reports **`W_GRAPHTY_NOTES`** with the number of notes
  not carried as notes, so the loss is seen before anything is shared.
- `graphty.notes.text` is text: DOT and GraphML write it quoted, and CSV prefixes a cell starting with
  `=`, `+`, `-`, `@`, a tab or a carriage return (`W_GRAPHTY_CSV_NEUTRALIZED`).
- A loaded attribute whose name starts `graphty.` is never exported (it is the element's own
  bookkeeping), so the two note columns cannot collide with one. Read back, they are ordinary
  columns (`data.graphty.notes.count`); they do not become notes.
- Default: **off**. `exportGraph(format)` writes no note column; `exportGraph(format, { notes: true })`
  writes both (notes-decisions.md, decision 9).

### 7.9 Before whole-file saving exists

Whole-file opening and saving (`openDocument`, `saveDocument` in container.md) and project files
(issue #301) are not built. Until they are, `notes.toDocument()` and `notes.mergeDocument()`, with
`styles.toDocument()` and `styles.applyTemplate()`, are how notes and layers are saved and reopened
(section 2). A saved notes member needs no conversion later: a bare member is a valid file. Once
whole-file saving exists it calls these two; they stay as the way to handle notes on their own.

---

## 8. For implementers

### 8.1 How the design maps onto the session

- Notes are a project slice, `"notes"`, keyed by note id, beside `"sets"` and `"views"`. Each
  entry holds the record plus the session-only `source` (section 7.6). `ProjectSlice` gains
  `"notes"` and is documented as an OPEN UNION in the same release.
- Commands, one undoable step each: `note.add` (records the whole note with the minted id and
  stamped time, so redo replays it exactly), `note.update` (before and after), `note.remove` (the
  removed note), `note.merge` (every note added or replaced). Add them to the command register,
  the `SessionCommand` union and `COMMANDS`.
- The author is a new `ProjectConfig` key, `author: string | undefined`, set through
  `config.set`, validated as section 5.5 says.
- Ids: `note_` plus a 26-character ULID (48 bits of time, 80 random bits from
  `crypto.getRandomValues`). Random ids need no register of removed ids: undo restores the same
  id, and nothing else ever makes it again.
- Integration points: `HOOK_ORDER` in `session/project/derive.ts` gains `"notes"` before
  `"styles"`; `snapshot()` there gains the notes map; `TX_PARTS` in `GraphSession.ts` gains
  `"notes"`, or `tx.notes` would not be part of the transaction's step; the history budget in
  `Dispatcher.emit` counts the notes slice (10,000 notes of up to 256 KB can be held in undo).
- `set.create`'s refusal of element-made fields gains `reason: "element-field"` beside its
  existing `details.fields`, so sets and notes refuse the same way.

### 8.2 Status and labels

`status()` is synchronous and resolves nothing. An item's label is built from the stored result
id and `ItemKey`, never from `sets.containing` (which is asynchronous). A run token never matches
across sessions, because tokens are made from a per-session nonce (`createExecutionMinter` in
`session/runs/RunsApi.ts`); that is why opened cites read `earlier-run` (section 7.5).

### 8.3 Repaint

Follow the `runs` hook: a notes hook on the derivation lane invalidates the painter for layers
that read a `graphty.notes.*` path (detected as `readsAnyField` does), then repaints exactly the nodes and
edges that gained or lost a note (the node and edge targets of each changed note, before and
after), via `painter.repaintElements`. A reload rebuilds the count index and repaints every layer
reading `graphty.notes.*`. A layer reading no `graphty.notes.*` path never repaints because of a note. The count
index is keyed by the text form of node ids (section 3.3).

### 8.4 Input handling

All of it applies to `add`, `update` and `mergeDocument`; `mergeDocument` takes an object already
parsed, so the file-level checks that run before parsing never ran on it.

- Every lookup of a field is by own name. A `__proto__` member anywhere in the document -- in a
  note, a target or `extensions` -- refuses the whole member (`E_BAD_DOCUMENT`). Nesting is held
  to 64 levels (32 inside `extensions`).
- Unknown fields and `extensions` are copied by iterating own keys into null-prototype objects;
  never `Object.assign` or spread over parsed input.
- Length limits count code points (`[...text].length`), which is what JSON Schema's `maxLength`
  counts, so the schema and the element agree. A lone surrogate is kept; `JSON.stringify` writes
  it as a `\uXXXX` escape.
- A time is accepted only when `Date.parse` reads it and its fields are in range; orderings compare
  the parsed instants, never the strings.
- Unchanged-content tests reuse the canonical form in `session/sets/signature.ts` (sorted keys).

### 8.5 Order of work

1. Types and slice plumbing (`ProjectSlice`, `ProjectState`, the draft, `derive.ts`, `TX_PARTS`,
   strict-mode invariants) and the `author` config key.
2. The three commands, the reads and writes of `NotesApi`, `note:changed` and
   `graphty-note-change`, undo tests.
3. `status()` with synchronous labels, and `counts()`.
4. `toDocument` and `mergeDocument`, Node-safe, tested against the schema and the conformance rows.
5. The `graphty.` root and the `graphty.notes.*` paths in `styles/sources.ts`, the count index, the
   repaint hook, the `notes-path` refusal outside styles and `select({ where })`, `styles.validate`;
   literal text for labels bound to `graphty.notes.*` (section 6.3).
6. `select({ note })` and `sets.usedBy`.
7. Export columns, which can ship separately.

Literal text for every bound label is a separate, breaking pull request (section 6.3). The full
plan, with files, tests and done-when for each step, is [notes-plan.md](notes-plan.md).

### 8.6 Edits to `design/documents/`

Made as the first step of [notes-plan.md](notes-plan.md).


| File | Edit |
|---|---|
| `notes.md` (new) | Sections 1, 3, 4.1 and 7 of this page, written as the member's specification, in the style of `recipe.md`. |
| `notes.schema.json` (new) | Moved from `design/notes/notes.schema.json`. |
| `container.md` | "Data model": `NotesMember` joins the `Member` union; the kinds table gains `graphty-notes`. Change the example third-party kind `org.example.notes` (there and in doc-19) to `org.example.bookmarks`. "Versions" rule 2: the open lists gain note target kinds and item key forms. "Applying a file" rule 2: data, recipes, styles, then notes; rule 3: note targets and cites are rewritten like style paths. `onRepeat.notes`. `saveDocument`: `members` gains `"graphty-notes"`; rule 3 matches a notes member by being the only one or by `name`; rule 4: notes are never saved unless asked. "The report": `MemberReport.notes`. |
| `container.schema.json` | A fourth `if`/`then` branch for `graphty-notes` version 1. |
| `README.md` | The documents table gains notes.md; the `drafts/` row says notes.md supersedes annotations. "Trust" rule 5 gains: notes opened from a file record where they came from. "Trust" rule 6 gains: "A note's `text` is the one exception: an application MAY interpret it (notes.md) and MUST then treat it as untrusted; graphty-element never does." "Limits": 10,000 notes per member, 64 targets and 64 cites per note, 65,536 code points of text, 256 KB per note, `extensions` 64 KB and 32 levels. The codes table gains `W_GRAPHTY_NOTES` and `W_GRAPHTY_TRUNCATED`. |
| `style.md` | "Paths" rule 1: the `graphty.` root is reserved for values graphty-element provides (section 6.4); `data.graphty.<name>` still reads a column; `graphty.notes.*` is accepted only in selectors, bindings and `select({ where })`; a label bound to `graphty.notes.*` is drawn literally. The rule that every bound label is literal is added by the breaking pull request, not here. |
| `export-mapping.md` | A "Notes" section (section 7.8: the `notes` option, off by default; the `graphty.notes.count` and `graphty.notes.text` columns) and the `W_GRAPHTY_NOTES` and `W_GRAPHTY_TRUNCATED` rows. |
| `conformance.md` | A "Notes (notes.md)" table with the rows below. |
| `drafts/annotations.md`, `drafts/annotations.schema.json` | A banner: "Superseded by notes.md; kept as the record of the evidence-chain ideas." |

### 8.7 Conformance rows

| id | input | expected | rule |
|---|---|---|---|
| note-1 | a release without notes opens a file with a `graphty-notes` member | skipped, `W_UNKNOWN_KIND`; kept in place on save | 7.1 |
| note-2 | a bare `{ "kind": "graphty-notes", "version": 1, "notes": [] }` | opened as a file holding that member | 7.1 |
| note-3 | a note on `{ "node": "ACC-9999" }` the graph does not hold | added; reads `missing`; counted in `missing` | 7.5 |
| note-4 | the same file opened on data that holds `ACC-9999` | reads `present`; nothing rewritten | 4.1 |
| note-5 | targets `{ "filterStep": "s1" }` and `{ "node": 1, "type": "person" }`, checked against the schema, then opened on a release that knows neither | the schema accepts the note; it is added; both targets `unsupported`; written back as read | 7.4 rule 1 |
| note-6 | a cite `{ "result": "r", "run": "x", "weight": 2 }` | schema accepts; note added; cite `unsupported` | 7.4 rule 1 |
| note-7 | `text` `"<img src=x onerror=alert(1)>"`, `"**bold**"` and `"<color='red'>x</color>"` | stored and returned exactly; a label bound to `graphty.notes.latest` draws every character | 1.1, 6.3 |
| note-8 | a note with no `time`, and one with `"time": "2026-13-01T00:00:00Z"` | each skipped, `E_BAD_DOCUMENT`; not stamped | 7.6 rule 5 |
| note-9 | `"author": ""` | fails the schema; skipped | 7.3 |
| note-10 | the same file merged twice | second merge: every note `unchanged`; no history step | 7.6 rule 2 |
| note-11 | a held id with different text, held `edited` absent | added under a new id; `renamed` lists the pair; then the same file merged again: `unchanged` | 7.6 rules 2, 3 |
| note-12 | a note edited locally (same id and time, later `edited`), then its file merged again | reported `older`; nothing added | 7.6 rule 3 |
| note-13 | two notes with one id in one member | the second follows rule 3 against the first | 7.6 rule 4 |
| note-14 | `{ "result": "rings" }` in a file whose recipe has `as: "rings"`, applied with namespace `fraud` | target rewritten to the namespaced run id | 7.6 rule 8 |
| note-15 | `{ "set": "set_suspects" }` merged into a session holding its own `set_suspects` | reads `missing`, labeled with the target's `name` | 7.5 |
| note-16 | a note on `{ "node": 11 }` opened on CSV data whose id is `"11"` | `present` | 3.3 |
| note-17 | an edge note `{ "ordinal": 1, "among": 2 }` opened where the pair has 3 edges | `missing`; no edge guessed | 4.1 |
| note-18 | a pair with 2 edges; the note's edge is removed and another edge of the pair added | binds to the new edge (the known limit of saving by position) | 3.3 |
| note-19 | an `{ item }` note, then the result is re-run | target `earlier-run`; note unchanged | 4.1 |
| note-20 | `{ "__proto__": { "x": 1 } }` inside a note, inside a target, and inside `extensions` | the member is refused whole, `E_BAD_DOCUMENT`; nothing changes | 8.4 |
| note-21 | a member of 9,000 notes merged into a session holding 2,000 | refused whole, `E_TOO_LARGE`; nothing changes | 7.6 |
| note-22 | `add` with `extensions: { "com.example.app": new Date() }` | refused, `bad-extensions` | 5.4 |
| note-23 | a style with bare path `graphty.notes.count` on data with a column named `graphty.notes.count` | the path reads the note count; `styles.validate` reports it; `data.graphty.notes.count` reads the column | 6.4 |
| note-23b | a style binding `graphty.unknownThing` | no value; the layer is reported unbound; nothing painted | 6.4 |
| note-24 | `visibility.set` with a rule reading `graphty.notes.count` | refused, `E_BAD_SELECTOR`, reason `notes-path` | 6.2 |
| note-25 | default whole-file save on a session holding notes | no notes member; `leftOut` lists the notes with their count | 7.7 |
| note-26 | `exportGraph("gexf")` on a session holding notes | `W_GRAPHTY_NOTES`, count = notes held; no note columns | 7.8 |
| note-26b | `exportGraph("graphml", { notes: true })` on a session holding notes | `graphty.notes.count` and `graphty.notes.text` columns on noted elements; `W_GRAPHTY_NOTES` still reported | 7.8 |
| note-27 | `exportGraph("csv", { notes: true })` with a note `=SUM(A1)` | `graphty.notes.text` cell prefixed, `W_GRAPHTY_CSV_NEUTRALIZED` | 7.8 |

---

## 9. The graphty app

### 9.1 What it does

- **Reads and writes notes only through `el.session.notes`.** The inspector's Notes section, the
  note counts, the Notes row of the layer list and every notes panel read `list`, `get`, `status`,
  `authors` and `counts`, write `add`, `update` and `remove`, select with `select({ note })`, and
  refresh on `note:changed`.
- **Writes `mediaType: "text/markdown"`** on every note it writes (section 1.3).
- **Renders a note as Markdown** when its `mediaType` is absent or Markdown (compared as section
  1.3 says), and as plain text with white space kept for anything else -- an HTML note is shown as
  its source, never rendered.
- **Markdown rules, because note text comes from untrusted files:**
  - CommonMark plus GitHub-style autolinks, strikethrough and tables, rendered to React elements
    (for example `react-markdown` without `rehype-raw`), never through `innerHTML`.
  - Raw HTML in a note is shown as literal text: the renderer maps HTML nodes to text nodes
    explicitly, so `<b>` shows as `<b>` and nothing in a note is hidden from its reader.
  - Links: a custom URL filter allows only `http:`, `https:` and `mailto:` (compared without regard
    to case, after trimming). Relative, protocol-relative (`//`) and `#` links are shown as text,
    so a note cannot trigger the app's own routes. Links open in a new tab with
    `rel="noopener noreferrer nofollow"`. When a link's text differs from its address, the host is
    shown beside the text, so a link cannot lie about where it goes on a touch screen.
  - Images are not loaded: `![alt](url)` shows as a link labeled with its alt text, because a
    remote image in an opened file would tell its author when and where the file was read.
  - Headings render at body size, so a note cannot pass for the app's own headings.
  - A long note shows its first 20 lines, then "Show more"; anything nested deeper than 32 levels
    is shown as plain text; the notes list is virtualized.
  - Note text, author names and target labels are isolated (`<bdi>` or `unicode-bidi: isolate`
    with `dir="auto"`), so right-to-left override characters cannot reorder what follows.
  - Tests pin all of this, including `[https://bank.example](https://evil.example)`,
    `JaVaScRiPt:`, `javascript&#58;`, and reference-style links and images.
- **The author:** Settings > General > "Your name (saved with this project)" writes
  `session.config.set({ author })`. Until project files exist, the app also remembers the last
  name entered with the reader's preferences and sets it on each new session. Nothing asks for a
  name on the way to writing a note.
- **Names and sources:** a note shows its time ("09:12" today, "1 Oct" this year, "1 Oct 2025"
  otherwise). A name is shown only when `authors()` holds two or more. A note whose status has a
  `source` shows "From <name>" whatever the number of authors, so a file cannot pass its notes off
  as the reader's own.
- **Statuses:** a `missing` target chip is struck through with "Not in the current data";
  `filtered` is dimmed with "Hidden by the filter"; `earlier-run` says "From an earlier run". The
  note itself is never hidden.
- **Opening a file with `"replace"`** asks first, naming how many held notes would change.

### 9.2 What it must not do

- Keep a notes store of its own -- in React state, `localStorage`, IndexedDB or a file -- other
  than a render cache rebuilt from `note:changed`.
- Make ids, stamp times or authors, count notes per element, work out which targets are missing,
  translate targets into selections, or decide whether a note is from an earlier run.
- Add a notes layer on its own, or paint noted elements without a layer the reader asked for.
- Keep "done", tags or an "open notes" badge as a note status outside the note. Per-note
  application data goes in `extensions["app.graphty"]`, through the element.
- Change a note's text before handing it to the element, or after reading it.

---

## 10. Every name this design publishes

- On `session.notes` (`NotesApi`): `list`, `get`, `status`, `authors`, `counts`, `add`, `update`,
  `remove`, `toDocument`, `mergeDocument`. `list` options `target`, `targetKind`, `cites`,
  `author`, `missing`.
- On the session and the element: `session.notes`, `tx.notes`, the project setting
  `config.author`, `select({ note, target })`, `SelectionDelta.skipped`, the
  `graphty-note-change` DOM event.
- Types: `Note`, `NoteId`, `NoteCite`, `NoteTarget`, `NoteTargetInput`, `NoteInput`, `NotePatch`,
  `NoteStatus`, `NoteTargetStatus`, `NoteCiteStatus`, `NoteChange`, `NotesApi`, `NotesDocument`,
  `NotesReport`, `NoteMergeOptions`.
- Record fields: `id`, `time`, `targets`, `text`, `mediaType`, `author`, `edited`, `cites`,
  `extensions`; cite fields `result`, `run`; target keys `graph`, `node`, `edge`, `set` (with
  `name`), `result`, `item`; reserved target keys `filterStep`, `note`, `where`, `layer`, `point`;
  reserved note fields `inReplyTo`, `tags`.
- Status values: targets `present`, `filtered`, `missing`, `earlier-run`, `unsupported`; cites
  `current`, `earlier-run`, `missing`, `unsupported`; `source` with `name` and `opened`.
- Event `note:changed`; change values `created`, `updated`, `removed`; field names `text`,
  `targets`, `cites`, `mediaType`, `extensions`; causes `command`, `undo`, `redo`, `load`.
- Project slice `"notes"`; commands `note.add`, `note.update`, `note.remove`, `note.merge`;
  `SetUser.kind` value `"note"`.
- Error reasons (`E_BAD_COMMAND`): `empty-text`, `text-too-long`, `no-targets`, `too-many`,
  `bad-target`, `unknown-target`, `unknown-cite`, `not-finished`, `bad-media-type`,
  `bad-extensions`, `element-field`, `unknown-id`; `E_TOO_LARGE` reasons `notes`, `note-size`;
  `E_BAD_SELECTOR` reason `notes-path`.
- Conflict policies: `keep-both`, `replace`, `keep-mine`. Report fields: `added`, `unchanged`,
  `renamed`, `older`, `replaced`, `kept`, `missing`, `skipped`, `notices`.
- Style paths: the `graphty.` root, reserved for every value graphty-element provides;
  `graphty.notes.count`, `graphty.notes.latest`, `graphty.notes.latestTime`.
- Documents: member kind `graphty-notes`, version 1; schema
  `https://graphty.app/schema/documents/graphty-notes/v1.json`; `MemberReport.notes`;
  `onRepeat.notes`; `saveDocument` member `"graphty-notes"`.
- Export: `exportGraph` option `notes` (default `false`); columns `graphty.notes.count`, `graphty.notes.text`; codes
  `W_GRAPHTY_NOTES`, `W_GRAPHTY_TRUNCATED`.
- Limits: 10,000 notes per session and per member; 64 targets and 64 cites per note; 65,536 code
  points of text; 256 KB per note; `extensions` 64 KB and 32 levels; 256 characters of author;
  255 characters of `mediaType`.

---

## 11. Review changes

What changed in this revision, by the problem it answers.

**The simple path.** Section 2 is new: a typed handle (`Graphty` through the
package's `HTMLElementTagNameMap` entry, which already exists), the real loading call
(`session.data.import`), `add`, `list`, a label layer, and a save and reopen that keeps the notes
and the layer using `styles.toDocument`/`applyTemplate`, which exist today. It says the session
exists before connecting, that note writes are safe before loading, what `await styles.add` waits
for, how a number becomes label text (`String`, no locale; the text channel's default
`passthrough` scale does this today), that merging restores on a fresh page, and how to keep your
own version (`onConflict`). Links to the styling and data-source guides replace the undefined
concepts; `isGraphtyError`'s import is shown. Internal terms (project slice, command register,
ULID, conformance rows, container rule numbers) moved to section 8. Owner history and open
questions moved to notes-decisions.md.

**Names.** `about` became `target` (and accepts a list); `applyDocument` became `mergeDocument`;
`StoredNote` is gone (`Note` is the saved form, and section 3.1 promises it never gains
session-only fields, which answers the leak concern without a second type); the status union is
split into `NoteTargetStatus` and `NoteCiteStatus`; `el.author`/`session.author` became the project
setting `config.author`; `userData` became `extensions` with reverse-domain keys.

**Node ids.** Notes compare node ids by text, preferring an exact match, because the element's own
loaders disagree (CSV reads ids as strings, JSON keeps numbers, GML coerces integer text).

**Schema and forward compatibility.** Each target and each cite has a fallback branch: any
non-empty object matches it and reads `unsupported`, so the schema no longer refuses the notes the
reading rules keep. Section 7.4 adds the open lists, `text` as the complete readable form, the
stale-field rule and the reserved keys and routes. `mediaType` allows parameters in visible ASCII
and compares case-insensitively.

**Binding across projects.** Set, result and item targets and cites from a file bind only to what
the same file carries (recipe results in version 1); otherwise they read `missing` and keep a
label (set targets carry `name`). Session-made edge ids (`graphty:e<n>`) read `missing` when
opened. Run pins are stated as local to a session, and item labels are built synchronously from
the stored key.

**Merging.** All or nothing, with the final count checked first. Content matching any held note
counts as unchanged, times compare as instants, and a held later edit of the same note (same id
and time, later `edited`) makes the incoming one `older`, so neither reopening twice nor
edit-and-reopen adds duplicates. `"replace"` is never a default. Imported notes record their
source in their status (session state, never written to notes files) and the app shows "From
<file>". Future-dated times are reported.

**Limits and input.** `extensions` must be plain JSON, at most 64 KB and 32 levels; a note is at
most 256 KB; `__proto__` anywhere refuses the member; unknown fields are copied into
null-prototype objects; limits count code points, matching the schema; invalid dates are skipped.
The `graphty.notes.text` export cell is capped at 64 KB.

**Styles.** The whole `graphty.` root is reserved for values graphty-element provides, so later
note paths and later element values are additions. `graphty.notes.count` has
no value at zero, so a `has` selector paints only noted elements. `graphty.notes.*` works only in style
selectors, bindings and `select({ where })`, never where it would change a result or a set.
Label text from a `graphty.notes.*` binding is drawn literally (section 6.3); the same rule for
data and result bindings is a separate breaking change, because `RichTextParser` interprets tags
in every label today.

**Author.** The owner's 2026-09-28 decision is followed: the name is the project's author setting.
The previous revision overrode it; it no longer does, and the shared-file consequence is recorded
in notes-decisions.md.

**Studio needs.** `select({ note, target })` selects a note's targets without the app translating
them; `list` takes several targets and a `targetKind`; `counts()` gives "noted elements";
`graphty-note-change` mirrors the event on the element.

**Rejected or narrowed, with why:**

- *A separate `StoredNote` interface*: one type plus the promise in section 3.1 is
  simpler and gives the same protection.
- *Limits in UTF-16 code units*: code points match what the schema's `maxLength`
  counts, so a note the schema accepts is never refused by the element.
- *Applying the first 10,000 notes of an oversized member*: conflicts with
  all-or-nothing merging; the limit is documented as fixed for version 1 instead.
- *`graphty.notes.*` in every query, including scopes and set definitions*: would make notes an
  input to results and set membership with no dependency tracking. The
  studio's counts come from `counts()` and `list({ targetKind })` instead.
- *A data-load report field counting newly missing notes*: not added now; the app can
  show `list({ missing: true }).length`, which the element computes. Adding the report field later
  is an addition.
- *Keeping `userData` beside `extensions`*: one place for application data is enough,
  and only the namespaced one survives files from several applications.
- *Allowing `{ filterStep }` notes now*: the visibility filter has no step ids; the
  deferral stands and the studio's controls are listed as follow-ups.
