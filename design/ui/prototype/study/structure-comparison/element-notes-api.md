# Notes in graphty-element: the API

This page specifies notes as part of graphty-element's public API. A note is a short piece of
plain text that a person writes about something in a graph: a node, an edge, a group, a path, a
filter step, a run or the whole graph. It is written for a developer who uses graphty-element
directly and has never seen the graphty app or this repository.

The owner decided that notes are part of graphty-element's API, that a note's time and its
target are required, and that the author's name is optional and will usually be empty
(`../../owner-feedback.md`, 2026-10-01). Everything else on this page is a studio decision,
labeled **Studio**, with its reason. None of it is built yet; graphty-element has no notes today.

---

## 1. A worked example

```ts
import "@graphty/graphty-element";               // registers <graphty-element>

const el = document.querySelector("graphty-element")!;
const notes = el.session.notes;

// A run whose result the note will cite (optional; any finished run works).
// runs.start() returns the Run at once; awaiting it waits for its result.
const betweenness = el.session.runs.start("betweenness");
await betweenness;

// Valjean's node id in the Les Miserables data is 11.
const valjean = { node: 11 };

// Write a note about one node. Nothing but text and a target is required.
const id = notes.add({
    text: "Highest betweenness in the graph, 0.57.",
    targets: [valjean],
    cites: [{ result: betweenness.id }],     // optional: the result the claim rests on
});

// Read every note about Valjean, newest first.
for (const note of notes.list({ about: valjean })) {
    console.log(note.time, note.text);          // "2026-10-01T09:12:03Z  Highest betweenness..."
}

// Keep a panel up to date.
const stop = el.session.on("note:changed", (change) => redraw(change.id));

// Show how many notes each noted node has, as its label.
el.session.styles.add({
    name: "Note counts",
    target: "node",
    selector: { match: "expression", where: "notes.count > `0`" },
    encode: { "node.label": { by: "notes.count" } },
});

// Optional: a name, if the person entered one. Saved with the project. Leave it unset and
// notes carry no author.
el.session.author = "Ada";
```

That is the whole surface a consumer needs. Undo, saving with the project, and repainting a
label when a note changes all happen inside the element.

---

## 2. The note record

```ts
type NoteId = string;                    // element-minted: starts "note_", the rest is opaque

interface Note {
    readonly id: NoteId;
    readonly time: string;               // REQUIRED. ISO 8601 UTC, stamped by the element
    readonly targets: readonly NoteTargetRead[];  // REQUIRED. At least one
    readonly text: string;               // REQUIRED. Plain text, not empty
    readonly author?: string;            // optional. Present only when a name was set
    readonly edited?: string;            // optional. ISO 8601 UTC of the last change
    readonly cites?: readonly NoteCite[]; // optional. The exact run results and filter steps the text rests on
}

type NoteCite =
    | { readonly result: ResultId; readonly run: string; readonly replaced?: true }
      // run: the result's run the note was written against, the same opaque token a pinned
      // ResultItem holds; replaced (read only): the result was rerun or removed since
    | { readonly step: FilterStepId; readonly at: string; readonly replaced?: true };
      // at: when the step's rule was last changed; replaced (read only): edited or removed since

type NoteCiteInput = { readonly result: ResultId } | { readonly step: FilterStepId };
      // what add and update take; the element pins the run or stamps the step
```

`ResultId` and `ResultItem` are graphty-element's existing types (`catalog/types.ts`): a result
is named by its first run's id, and a `ResultItem` with `run` set holds one run of that result
as it was. A cite is that same pin without an item key, so the API has one way to name "this
result, as of that run".

Records are deep-frozen. A field that has no value is absent: never `""`, never `null`, never a
stand-in such as "Anonymous".

### 2.1 Required: time and target (owner)

- **`time`** is set by the element when the note is added, from the session clock, in ISO 8601
  UTC with seconds ("2026-10-01T09:12:03Z"). A consumer cannot pass it. It is recorded in the
  add command, so a redo replays the same time rather than a new one.
  **Studio:** ISO text, not epoch milliseconds, so a project file stays readable by hand.
- **`targets`** is what the note is about: one target or several. Section 3 lists the kinds.
  **Studio:** a list, because comparing two things is a normal note ("these two are the same
  person"); one target per note would force two notes or a made-up group.

### 2.2 Required by the studio: text

**Studio:** `text` is required and must contain something other than white space. The owner's
rule ("mostly options") is about a note's metadata; the text is the note itself. A note with no
text marks something without saying anything, and marking things is what a kept set does, so
allowing it would give one job two ways. Making a required field optional later is a compatible
change; the reverse is not, so required is the reversible choice.

Text is plain text. Line breaks are kept. There is no markup.

### 2.3 Optional metadata, each with its reason

| Field | Set by | Reason (studio) |
|---|---|---|
| `author` | the element, from the project's `author` setting (section 5) | The owner's decision: notes record their author when there is one. Usually absent. |
| `edited` | the element, on every `update` | A reader of an analysis needs to know a note changed after it was written, and after others read it. One field. |
| `cites` | the consumer passes `{ result }` or `{ step }` (`conceptual-model.md` 6: a note cites runs and filter steps); the element pins each result to its current run, and stamps each step with its rule's last change | A claim such as "highest betweenness, 0.57" is true of one run of a result. A rerun keeps the result's id (`run.rerun()` runs again in place), so citing the id alone could not tell the reader the claim rests on an earlier run. The pinned `run` token tells them: a read sets `replaced` once the result's current run is another one, or the result is gone. A *target* cannot carry this: a note about Valjean that rests on a Betweenness result is not a note about the result, and must not count on its row (section 4.2). |

### 2.4 Which graph a note belongs to

**Studio:** a note belongs to one graph. graphty-element's session holds one graph (its project
has a single `"graph"` part), and every target of a note is an element of that graph, so
`session.notes` holds that graph's notes and nothing else. `{ graph: true }` names the
session's graph. A consumer that shows several graphs, as the graphty app does, keeps one
session per graph and shows the notes of the graph on screen; it never merges lists or counts
authors across sessions, because each list, count and `authors()` is already per graph. A graph
made from another graph starts with no notes. Reason: a note whose targets live in another
graph could not be checked, counted or repainted by the session that holds it.

### 2.5 Rejected, with the reason

- **Tags**: a kept set already groups things, and the text is searchable.
- **Status (open, resolved), replies, threads, reactions**: they assume several people working
  in real time; graphty has no accounts.
- **A position on the canvas**: positions change with every layout, so a pinned note would drift
  away from what it is about. A note attaches to objects.
- **Color or any look**: a note's look is a style layer the reader adds (section 6).
- **Quoted values frozen at writing time**: no screen needs them yet; an optional field can be
  added in a minor release when the findings report is designed.

---

## 3. Targets

A target uses the same names the rest of the session API already uses for the same objects.
Nothing new is invented.

```ts
type NoteTarget =
    | { readonly graph: true }                        // the whole graph
    | { readonly node: NodeRef }                      // one node
    | { readonly edge: EdgeRef }                      // one edge
    | { readonly set: SetId }                         // a kept set, a group kept as a set, or a path
    | { readonly result: ResultId }                   // a run's result, such as a PageRank measure
    | { readonly item: ResultItem }                   // one item of a result: community 3 of a Louvain result
    | { readonly where: Query }                       // the elements a rule names: group == 2
    | { readonly layer: LayerId }                     // any other style layer
    | { readonly filterStep: FilterStepId };          // one step of the filter

type NodeRef = NodeId | NodeMember;           // a node id as loaded, or the stable form (3.1)
interface NodeMember { readonly type: string; readonly key: string | number }
// EdgeRef is the element's existing type: a session EdgeId or its stable EdgeMember.
```

| The owner's word | Target |
|---|---|
| node | `{ node }` |
| edge | `{ edge }` |
| group | `{ item }` for a group a run found ("Community 3"), using the element's existing `ResultItem`; `{ where }` for one value of an attribute shown as groups ("group == 2"), using the existing `Query` a rule set uses, so deleting and remaking the "Show as groups" layer keeps the note; `{ set }` once a group is kept as a set |
| path | `{ set }`: a path is a path set (`sets.create` with a path definition) |
| set | `{ set }` |
| filter step | `{ filterStep }` (stable step ids are part of this proposal, section 9) |
| the whole graph | `{ graph: true }` |
| a run or a measure | `{ result }` (a measure such as PageRank is its run's result) |
| any other style layer | `{ layer }` |

### 3.1 How targets are stored so they survive a reload

A note must point at the same thing after the project is saved, reopened and its data loaded
again. A node's id is the id it was loaded with and does not change on a reload, but once a graph
can hold several node types (`element-requirements-4.md`, "Several tables") one bare id can name
two nodes ("person 17", "building 17"). An edge's session `EdgeId` does change on a reload. So the
element stores each target in a **stable form**, as kept sets store edges (`EdgeMember`):

- **A node** is stored as `{ type, key }`: the node's type (the type of the table it came from,
  see `element-requirements-4.md`, "Several tables") and its key in that table. **Studio:** a
  column given the Subtype role is an attribute of the node (`table.subtype`,
  `conceptual-model.md` 3.4) and is never part of its identity: an account whose `kind` column reads "merchant" is still
  stored as `{ type: "account", key }`, so editing `kind` or reading the file again never loses a
  note. A table's rows with no Key column are keyed by row number, and the load report says notes
  on them may move if the row order changes. A consumer may pass a
  bare `NodeId` (the id the node was loaded with); the element converts it, and refuses it with
  `E_NOTE_AMBIGUOUS_TARGET` when nodes of two types hold that key ("17 is a person and a
  building"). **Studio:** the stored form always carries the type,
  even when the graph has one type, so loading a second table later does not change it.
- **An edge** is stored as the element's `EdgeMember` (its two ends, plus the edge table's id
  column when it has one, otherwise its ordinal among the edges of that pair). Today
  `EdgeMember`'s ends are bare node ids, so this release adds two optional members,
  `sourceType` and `targetType`, that carry the ends' types. `EdgeMember` is open to optional
  members in a minor release, so no existing reader breaks. An
  edge table without an id column is reported by the import report: "Notes on entries may move if
  the row order changes."
- **A set, result, layer or filter step** is stored by its id, which the element already keeps
  stable across a reload (filter steps once they have ids, section 9). A `{ where }` target is
  stored as its query, a data value that needs no id.
- **An item of a result** (`{ item }`) is stored as the `ResultItem` it was given. A pinned item
  (`run` set) holds that run as it was, which is `ResultItem`'s existing meaning. An unpinned item
  follows the result's current run, and this page adds one documented reading rule for it: the
  element also keeps the item's members at writing time, and after a rerun, which may number
  groups differently, it follows the new item that holds most of the old members, the rule
  `conceptual-model.md` 7.3 gives for groups across runs. The target reads `replaced: true` (3.2)
  only when no new item matches or the old one split across several.

### 3.2 A target that is gone

A note is never deleted because its target disappeared. When a reload, a filter or a delete
leaves a target missing, the note stays and the target reads as missing:

```ts
type NoteTargetRead = NoteTarget & {
    readonly name: string;      // the target's display name, as the element shows it ("Valjean")
    readonly missing?: true;    // present only when the target no longer exists
    readonly filtered?: true;   // present only when the target exists but the filter leaves it out
    readonly replaced?: true;   // an item only: after a rerun no item matched by overlap, or it split
};
```

**A node target always reads back in the stored form.** Whatever form was passed to `add`, a
read returns `{ node: NodeMember }` (`{ type, key }`), never a bare id, as `EdgeRef` getters
always return `EdgeMember`. Compare `t.node.key === 11`, not `t.node === 11`. `list({ about })`
accepts either form and, like `add`, refuses a bare id that two types hold with
`E_NOTE_AMBIGUOUS_TARGET`.

`name` is supplied so a consumer can draw a chip without looking anything up. For a missing
target it is the last name the element knew. The import report counts notes with a missing
target ("2 notes are about nodes no longer in the graph"). When a node type is renamed, every
stored target of that type is rewritten in the same undoable step, so nothing goes missing.

A filtered-out element is not missing: it still exists, and its notes are listed as usual, with
the target marked `filtered` so a consumer can group them without asking the filter itself.

---

## 4. Methods and the event

All methods live on `session.notes`. The `<graphty-element>` element exposes the same session as
`el.session`, and a session used without a view (in Node, for example) has the same methods.

### 4.1 Writing

| Method | What it does |
|---|---|
| `add(input: { text: string; targets: readonly NoteTarget[]; cites?: readonly NoteCiteInput[] }): NoteId` | Adds a note. One undoable step. Stamps `time`, and `author` when the project's `author` setting is set. A `{ result }` cite is pinned to the result's current run; a `{ step }` cite is stamped with its rule's last change. |
| `update(id: NoteId, patch: { text?: string; targets?: readonly NoteTarget[]; cites?: readonly NoteCiteInput[] }): void` | Changes the note. One undoable step. Sets `edited`. A field left out of `patch` is unchanged; `cites: []` clears it. |
| `remove(id: NoteId): void` | Removes the note. One undoable step. Undo brings it back under the same id. A removed id is never issued to a new note. |

Each write is refused, with nothing changed, by a typed error:

| Code | When |
|---|---|
| `E_NOTE_EMPTY` | `text` is empty or only white space |
| `E_NOTE_NO_TARGET` | `targets` is empty |
| `E_NOTE_UNKNOWN_TARGET` | a new target names something that does not exist when the note is added or its targets are changed (the error names which); a target the note already has may stay in `targets` even while it reads missing |
| `E_NOTE_AMBIGUOUS_TARGET` | a bare node id matches nodes of two or more types; pass `{ type, key }` |
| `E_NOTE_UNKNOWN_RUN` | a new entry in `cites` names a result that does not exist, or one with no finished run yet (queued, running, failed or cancelled; a cite pins a finished run), or a filter step that does not exist |
| `E_UNKNOWN_NOTE` | `update` or `remove` names a note that does not exist |

### 4.2 Reading

| Method | Returns |
|---|---|
| `get(id: NoteId): Note \| undefined` | one note |
| `list(options?: { about?: NoteTarget; cites?: ResultId; missing?: boolean }): readonly Note[]` | notes, newest first. Refused with `E_NOTE_AMBIGUOUS_TARGET` when `about` is a bare node id two types hold. `about` matches notes whose targets include that target **itself**, never notes about something it contains: a note about Community 3 is not listed under each of its members, and a note about Valjean that cites a Betweenness result is not listed under the result. `cites` matches notes citing that result, whichever run they pinned. `missing: true` lists only notes with a missing target. |
| `authors(): readonly string[]` | the distinct author names in the session's notes, in first-written order |

**Reading rule for consumers (owner):** show a note's author only when `authors()` holds two or
more names. With no name, or with one person's name on every note, show the time alone.

### 4.3 The event

```ts
el.session.on("note:changed", (change: NoteChange) => { ... });   // returns an unsubscribe function

interface NoteChange {
    readonly id: NoteId;
    readonly change: "created" | "updated" | "removed";          // OPEN UNION
    readonly fields: readonly ("text" | "targets" | "cites")[];  // for "updated"; empty otherwise
    readonly note: Note | null;                                   // null after removal
    readonly cause: "command" | "load" | "undo" | "redo";         // OPEN UNION, as set:changed
}
```

One event per note a write touched, after the write committed. A refused write publishes
nothing. This is the shape of `set:changed`, so a consumer that already watches sets learns
nothing new.

The event also fires when what a note **reads** changes although nobody edited it, so a panel
that shows `missing`, `filtered` or `replaced` stays right: `change: "updated"`, with `fields`
naming the part whose read changed (`["targets"]` for a target that went missing, came back, or
was replaced after a rerun; `["cites"]` for a cite whose result was rerun or removed), and
`cause` saying what caused it (`"load"` for a reload or a replaced table; `"command"` for a
rerun, a removal or a filter change; `"undo"` or `"redo"`). `edited` is not set by these: the
note itself did not change.

---

## 5. The author name

```ts
el.session.author = "Ada";             // saved with the project; attribute: author="Ada"
el.session.author = null;              // no name: notes and recipes from now on carry none
```

- **Owner:** the name comes from the project's author setting, as given, and is blank when none
  is set (`../../owner-feedback.md`, 2026-09-28); it is entered in Settings, stored, optional and
  usually empty (2026-10-01). So `author` is **part of the project**: the element saves it in
  the existing `config` part, beside the graph's other settings, because notes and recipes both
  read it and neither owns it (**Studio**). A reload restores it. Changing it is one undoable
  step, like any other project change. An app that shows several graphs writes the same name to
  each graph's session; writing element config is consuming the element.
- **Studio:** the element stamps it, rather than taking an `author` argument on every `add`.
  Reason: a consumer sets it once; with an argument, every call site must remember to pass it,
  and forgetting is silent. There is one way to set it.
- **Studio:** the property is named `author`, not `noteAuthor`, because the owner's decision
  takes a note's author and a recipe's "saved by" from the same setting. The element stamps both
  (`element-requirements-4.md`, "Recipe authorship"), so one property serves both and the app
  never stamps a recipe itself.
- **Risk (studio, not a decision):** a name stored in the project travels with the file, so the
  next person to open it writes notes under the first person's name until they change it. The
  graphty app shows the name, with the project, in Settings > General > Your name, so it is
  visible; the study checks whether readers notice it.
- An empty or white-space name counts as no name. The element never makes one up.
- In the graphty app, Settings > General > Your name writes this property. It is the only place
  a name is entered, and nothing asks for one on the way to writing a note.

---

## 6. Notes in styles: the `notes.*` binding paths

A style layer can read three values about each node and each edge:

| Path | Value |
|---|---|
| `notes.count` | the number of notes whose targets include this node or edge itself; `0` when there are none |
| `notes.latest` | the text of the newest such note; absent when there are none |
| `notes.latestTime` | the time of the newest such note; absent when there are none |

- They work wherever a path works: an expression selector (``{ match: "expression", where:
  "notes.count > `0`" }``), a binding (`by: "notes.count"` for size or color, `by:
  "notes.latest"` for label text) and a filter.
- `notes.*` is a third kind of path beside `results.<run>.<field>` and the data paths. An
  attribute that happens to be named `notes.count` is still reachable as `data.notes.count`.
- A note about a group, a run or the graph does not count on that group's members. A note about
  two nodes counts on both.
- When a note is added, changed or removed, every node and edge whose value changed repaints. No
  consumer call is needed.
- **Only the three paths above are reserved.** A bare `notes`, or any other `notes.<x>`, still
  reads an attribute, as it does today; so does `data.notes.count`. A dataset that has an
  attribute literally named `notes.count` and reads it with a bare path is the one reader whose
  result changes; the release notes say so, and `styles.validate` reports such a path.
- **Studio:** there is no reserved notes layer and no default note look. A consumer that wants
  noted nodes to stand out adds an ordinary layer whose expression selector is ``notes.count >
  `0` `` and the look it wants. A layer must write at least one property (the element refuses
  one that writes none, `E_BAD_LAYER`) and paints nodes or edges, not both, so "noted nodes and
  edges" is two layers. The existing `LayerSource` value `{ by: "element", reason: "notes" }`
  stays published and unused: the element never adds a notes layer of its own.
- In the graphty app, the "Notes" row is that pattern: it holds no layer until the reader gives
  it a look, and its first look on the Nodes side (or the Edges side) adds that side's layer with
  the ``notes.count > `0` `` selector. This is the same pattern as the app's Everything row, which
  adds its layers on the first edit.

---

## 7. Persistence

- **Studio:** notes are a new project part, the `notes` slice, beside `sets` and `views`
  (`ProjectSlice` gains `"notes"`, so `project:changed` names it). `ProjectSlice` is not marked
  OPEN UNION today, unlike `SetChange.change`, so a consumer's exhaustive `switch` over it would
  stop compiling: the release that adds notes marks it OPEN UNION in its documentation and says so
  in its release notes, or ships in a major.
  Everything a project file saves lives in one of these parts, and every change to one is
  undoable. A project file saves and restores notes with no extra consumer code once the element
  writes project files.
- The saved form follows the kept sets' saved form: the records, the ids already issued, and the
  ids removed, so a removed note's id is never issued again.

```ts
interface SavedNotes {
    readonly version: 1;
    readonly records: readonly Note[];       // stored targets, without name or missing
    readonly issued: number;                 // the next id number
    readonly removed: readonly NoteId[];
}
el.session.notes.export(): SavedNotes;       // for a consumer that keeps its own file meanwhile
el.session.notes.import(saved: SavedNotes): void;
    // replaces every note; one undoable step. The author setting lives in config, so
    // importing a colleague's notes never changes who you are
```

`export` and `import` exist so a consumer can keep notes in its own file until the element's
project file exists; they read and write the same form the project file will use.

---

## 8. What a consumer never writes

- No note storage, ids, undo, or time stamps.
- No counting: counts, the newest note and the list of authors come from the element.
- No reload repair: stable targets, missing targets and type renames are the element's.
- No staleness checks: `missing`, `filtered` and `replaced` come with every note read.
- No repaint wiring: labels and colors bound to `notes.*` follow the notes.

---

## 9. What this needs in graphty-element (summary)

Each item is a row in `element-requirements-4.md` with the screens that wait on it.

1. The `notes` slice in the project state, with `notes.add`, `notes.update` and `notes.remove`
   as undoable commands in the register of undoable operations.
2. `session.notes` (`add`, `update`, `remove`, `get`, `list`, `authors`, `export`,
   `import`), the `note:changed` event, and the typed errors.
3. The `author` setting (`session.author`, and the element's `author` attribute), saved in the
   `config` part of the project and read by notes and by recipes.
4. Stable target storage: nodes as `{ type, key }`, edges as `EdgeMember` with the new optional
   `sourceType` and `targetType`, a bare node id refused when two types hold it, rewriting on a type
   rename, and missing targets reported on read and counted in the import report.
5. The `notes.*` path kind (`notes.count`, `notes.latest`, `notes.latestTime`) in selectors,
   bindings and filters, with repainting when a note changes.
6. Stable ids for filter steps, so a filter step can be a note target.
