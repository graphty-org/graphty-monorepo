# Notes: the decisions behind the design

This is the record behind [notes-design.md](notes-design.md): what the owner decided, which earlier
documents it replaces, and what is left for later. The design page itself is written for people who
use graphty-element; this page is for people who maintain it. The options each decision was chosen
from are in [one-way-doors.md](one-way-doors.md); the build order is in [notes-plan.md](notes-plan.md).

Scope: issue #145 (notes; its journal half is not part of this design), #188, #189 and #301.

## The owner's decisions of 2026-10-01

These are binding. Each became a contract once a release writes a file with it or publishes the
name.

1. **The note's shape, as designed.** A note is the version 1 member `graphty-notes`. Required:
   `id`, `time`, `targets` (1 to 64) and `text`. Optional: `author`, `edited`, `cites`,
   `mediaType`, `extensions`. The version 1 limits stand as designed: 10,000 notes per session and
   per member, 64 targets and 64 cites per note, 65,536 code points of text, 256 KB per note,
   `extensions` at most 64 KB and 32 levels deep.
2. **All six target kinds in version 1** -- `graph`, `node`, `edge`, `set`, `result`, `item` -- in
   the saved forms designed (notes-design.md section 3.3). A target of a kind or form this release
   does not know is kept, written back as read, and reads `unsupported`.
3. **Ids and times.** A note id is `note_` followed by a ULID. Times are ISO 8601 in UTC with
   milliseconds (`2026-10-01T09:12:03.120Z`), stamped by graphty-element, never taken from the
   caller.
4. **Opening a notes file always merges.** It never replaces the notes a session holds. When a
   file's note and a held note share an id but differ, both are kept (the default `keep-both`).
   Set, result and item targets, and cites, bind only to what the same file carries; otherwise they
   read `missing`.
5. **An optional `mediaType` on each note**, a MIME type. The graphty app writes `text/markdown`.
   graphty-element stores it and writes it back, and never acts on it: it treats `text` as plain
   text, always.
6. **Style paths for note values use the reserved root `graphty.`**: `graphty.notes.count`,
   `graphty.notes.latest`, `graphty.notes.latestTime`. The root `graphty.` is reserved for every
   value graphty-element itself provides, now and later; there is no `notes.` root. A data column
   whose name starts `graphty.` stays reachable as `data.graphty.<name>`.
7. **The public API as designed**: `session.notes` with `list`, `get`, `status`, `authors`,
   `counts`, `add`, `update`, `remove`, `toDocument`, `mergeDocument`; the session event
   `note:changed` and the DOM event `graphty-note-change`; refusals as `E_BAD_COMMAND` with
   `details.reason`; the author as the undoable project setting `config.author`;
   `select({ note })`.
8. **Bound label text is literal.** A value that reaches a label or tooltip from data, a result or
   a note is drawn as its characters; markup works only in a label written as a literal value in a
   layer. Because this changes how existing data labels render, it is a breaking change for
   graphty-element: it ships in its own pull request, marked breaking and held for the next
   grouped major release (CLAUDE.md, "Breaking changes and major releases"). The notes pull
   request draws note-derived label text literally and leaves data and result labels as they are,
   so it is not breaking.
9. **Notes in GEXF, GraphML and CSV exports are an export option, off by default**:
   `exportGraph(format, { notes: true })` adds the `graphty.notes.count` and `graphty.notes.text`
   columns. An export of a session holding notes reports that its notes were left out
   (`W_GRAPHTY_NOTES`).

10. **A note about an edge added in the session is saved like a note about a loaded edge**: by
    its two ends plus its position among the parallel edges between them (`ordinal`, out of
    `among`), counted when the notes are saved, in the order the graph holds the edges -- the rule
    a load uses for an edge without a file id. It is never saved by the id graphty-element made up
    for it (`graphty:e<n>`), so the note finds its edge again once the project is reopened. For the
    same reason a loaded edge without a file id also takes its position at save time, not from the
    load it came in, so parallel edges added or removed during the session cannot lose or misbind
    its note. An edge with a file edge id is still saved by that id. Only an
    edge removed before the notes are saved, which has no position, keeps that id, and its note
    reads `missing`. This replaces the design's earlier rule that a session-added edge is saved by
    its made-up id and binds nothing once opened.

Also from the owner on the same day: graphty-element treats note text as plain text so that other
applications can interpret it their own way (HTML, Markdown, ...); the graphty app renders it as
Markdown. The app's notes work is a follow-up and is not part of the plan.

## Earlier rulings the design follows

Quoted from `design/ui/prototype/owner-feedback.md` (on the `ux-storyboards-mocks-and-study`
branch):

- 2026-09-28: "AUTHORSHIP: each note records its author and time; a recipe records who saved it and
  when. Both come from the project's author setting as given (blank if none is set). The author is
  shown only when a project holds more than one."
- 2026-09-30: "yes, make notes part of graphty-element's API"
- 2026-09-30: "we have no way to get name unless someone enters it in settings and we store it;
  that's fine if they enter it, but it will most likely be empty. we should specify the metadata
  that can be added for notes, but it will mostly be options (time and node / edge / group / path
  would likely be required)"
- 2026-09-30: "as a general rule, styling should be unopinionated and left to the user", and the
  question "can they also set [a label] to be the content of a note or the number of notes on
  node?"

How the design follows the author ruling: the name is the project's `author` setting
(`session.config.author`), saved with the project like every other project setting, blank unless
someone sets it. The consequence is accepted, not designed away: when a project file is shared
(once project files exist), the next person writes notes under the first person's name until they
change the setting. The graphty app's Settings label says "Your name (saved with this project)", so
the reader can see that.

## What the design replaces

Where they conflict, notes-design.md supersedes:

- **`design/element-api/element-api-design.md` section 4.15.3** (the first `Note` and `NotesApi`):
  its single `target`, `tags`, `createdAt`/`updatedAt`, caller-supplied `author`, stored
  `orphaned` stamp, `point` target, session `EdgeId` target, writes returning `Run<...>`, the
  reserved marker layer (`markerChannel`), `count()`, `clusterMarkers()` and the `AnnotationSet`
  document carried as an `annotations` member.
- **`design/documents/drafts/annotations.md` and its schema**: the `graphty-annotations` kind, the
  required per-note `digest`, `revisions`, `status`, `confidence`, `quotes`, `runsAt`,
  `importedFrom`, `dataDigest`/`binding`, `fingerprint`, the `group` target with member-overlap
  rebinding, `W_STATUS_PROPOSED` and the history-based merge. The draft stays as the record of
  those ideas; any of them can come back later as an optional member.
- **The design studio's `element-notes-api.md`** (2026-10-01), on these points only: the
  `E_NOTE_*` error codes, derived state carried inside each read record (status is read
  separately), an `import()` that replaces every note and the `SavedNotes { issued, removed }`
  form (opening merges; random ids need no counter), the `{ where }`, `{ layer }` and
  `{ filterStep }` targets in the first release (deferred), node targets stored as `{ type, key }`
  (the element has no node types yet), exempting the author setting from undo, and the `notes.*`
  style paths (now `graphty.notes.*`). Everything else in it -- several targets per note, `time`
  and `edited`, cites pinned to a run, the `note:changed` event, no reserved notes layer -- is kept.
- Issues #188 ("done") and #189 (tags, a default-author warning) predate the 2026-09-30 metadata
  ruling. Both are covered by `extensions` (an application keeps its own flags and tags there) and
  by the author being optional.

## Follow-ups outside this design

- **The graphty app's notes UI** (notes-design.md section 9): rendering notes as Markdown under the
  rules there, the author setting, status chips. A follow-up after the element work.
- **The design studio** should mark these controls "needs graphty-element": "Add note" on a filter
  step (filter steps have no stable ids yet), and the chip labels that show a node's display name
  or type ("Ana Ruiz . person"). It should correct `owner-questions-4.md` items 1 and 7 and
  `element-notes-api.md` sections 3 and 9, which say filter-step notes are part of this proposal.
- **An element issue** for stable filter-step ids, which the `{ filterStep }` target waits on.
- **An element issue for the label defect** that decision 8 fixes: every node label, edge label
  and tooltip goes through `RichTextParser` (`graphty-element/src/meshes/RichTextParser.ts`), so a
  label bound to a data column restyles itself when a value holds `<bold>`, `<color='...'>` and
  similar tags. The fix is the breaking pull request in notes-plan.md.
