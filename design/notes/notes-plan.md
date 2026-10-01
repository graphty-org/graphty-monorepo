# Notes: the implementation plan

How to build [notes-design.md](notes-design.md) in graphty-element, in an order where every step
lands green on its own. The decisions it builds are in [notes-decisions.md](notes-decisions.md).
Section numbers below are notes-design.md's.

There are two pull requests:

- **The notes pull request**, from `feat/element-notes`: steps 0 to 9. It adds notes and is not
  breaking (`feat(graphty-element): ...` commits). Labels bound to `graphty.notes.*` draw their
  text literally; data and result labels are unchanged.
- **The breaking pull request** ("The breaking change" below): every bound label draws its text
  literally. Marked breaking and held for the next grouped graphty-element major.

## Ground rules for every step

- **Node tests on a standalone session first.** Everything except drawing runs on
  `createGraphSession()` from `@graphty/graphty-element/session` and is tested in the `default`
  (Node) project, under `graphty-element/test/session/notes/`. Browser tests are only for what is
  drawn: label text on screen and the element's DOM event.
- **The five Node-safe entry points stay free of Babylon.js, Lit and the DOM.** Everything under
  `src/session/notes/` imports nothing from `meshes/`, `managers/`, `Graph.ts` or Lit;
  `test/session/entry-point.test.ts` fails the build otherwise.
- **Build dependencies first.** Before running graphty-element tests in a fresh worktree:
  `pnpm exec nx run-many -t build -p graph-format graph-io graph-samples algorithms layout webgpu-graph-algorithms`
  (or `pnpm exec nx build graphty-element`, which builds them in order).
- **Each step ends with** `npm run lint` and `npm run test:run -- --project=default` in
  `graphty-element/`, wrapped in `timeout 900`. Browser tests run one at a time, headless, through
  `design/ui/prototype/kit/with-browser.sh` (on the `ux-storyboards-mocks-and-study` worktree).
- **Commits:** one or more conventional commits per step, scope `graphty-element` (or `docs` for
  `design/`), GPG-signed as configured, no attribution trailers.

## Progress

| Step | State |
|---|---|
| 0 | Not started. |
| 1, 2 | Built (2026-10-01), with the changes listed under "As built" in each. |
| 3 | `status`, `counts` and the `missing` filter built with step 2; the `unsupported` rows wait for step 4 (see step 3). |
| 4 to 9 | Not started. |

---

## Step 0. The specifications in `design/documents/`

Made first, because the code and its conformance tests are written against them (section 8.6).

| File | Edit |
|---|---|
| `design/documents/notes.md` (new) | Sections 1, 3, 4.1 and 7 of notes-design.md, written as the member's specification in the style of `recipe.md`. |
| `design/documents/notes.schema.json` (new) | Moved from `design/notes/notes.schema.json` (`git mv`); notes-design.md's links follow it. |
| `design/documents/container.md` | "Data model": `NotesMember` joins the `Member` union; the kinds table gains `graphty-notes`. The example third-party kind `org.example.notes` (there and in conformance row doc-19) becomes `org.example.bookmarks`. "Versions" rule 2: the open lists gain note target kinds and item key forms. "Applying a file" rule 2: data, recipes, styles, then notes; rule 3: note targets and cites are rewritten like style paths. `onRepeat.notes`. `saveDocument`: `members` gains `"graphty-notes"`; rule 3 matches a notes member by being the only one or by `name`; rule 4: notes are never saved unless asked. "The report": `MemberReport.notes`. |
| `design/documents/container.schema.json` | A fourth `if`/`then` branch for `graphty-notes` version 1, referencing `notes.schema.json`. |
| `design/documents/README.md` | The documents table gains notes.md; the `drafts/` row says notes.md supersedes annotations. "Trust" rule 5 gains: notes opened from a file record where they came from. "Trust" rule 6 gains: "A note's `text` is the one exception: an application MAY interpret it (notes.md) and MUST then treat it as untrusted; graphty-element never does." "Limits": 10,000 notes per member, 64 targets and 64 cites per note, 65,536 code points of text, 256 KB per note, `extensions` 64 KB and 32 levels. The codes table gains `W_GRAPHTY_NOTES` and `W_GRAPHTY_TRUNCATED`. |
| `design/documents/style.md` | "Paths" rule 1: the `graphty.` root is reserved for values graphty-element provides; `data.graphty.<name>` still reads a column; `graphty.notes.count`, `graphty.notes.latest` and `graphty.notes.latestTime` are defined; `graphty.notes.*` is accepted only in selectors, bindings and `select({ where })`; a `graphty.` path the release does not know has no value. A label bound to `graphty.notes.*` is drawn literally. (The rule for all bound labels is added by the breaking pull request, not here.) |
| `design/documents/export-mapping.md` | A "Notes" section: the `notes` option, off by default; the `graphty.notes.count` and `graphty.notes.text` columns; the 64 KB cell cap; CSV neutralization. The `W_GRAPHTY_NOTES` and `W_GRAPHTY_TRUNCATED` rows in the codes table. |
| `design/documents/conformance.md` | A "Notes (notes.md)" table: the rows of notes-design.md section 8.7, with each "rule" column pointing into notes.md. |
| `design/documents/drafts/annotations.md`, `drafts/annotations.schema.json` | A banner (a `description` prefix in the schema): "Superseded by notes.md; kept as the record of the evidence-chain ideas." |

**Tests:** `tools/check-links.sh --offline` (the moved schema and the new cross-links).

**Done when:** every edit above is made, the offline link check passes, and notes-design.md links
to `design/documents/notes.schema.json`.

---

## Step 1. Types, the notes slice and the author setting

The skeleton everything else hangs on; no behavior a reader can see yet except `config.author`.

**Files:**

- `src/session/notes/types.ts` (new): `Note`, `NoteId`, `NoteCite`, `NoteTarget`,
  `NoteTargetInput`, `NoteInput`, `NotePatch`, `NoteStatus`, `NoteTargetStatus`,
  `NoteCiteStatus`, `NoteChange`, `NotesApi`, `NotesDocument`, `NotesReport`, `NoteMergeOptions`,
  exactly as section 3 and 5 write them, with the OPEN UNION comments.
- `src/session/notes/index.ts` (new), `src/session/index.ts` and `src/index.ts`: export every type
  above from `@graphty/graphty-element` and from `@graphty/graphty-element/session`.
- `src/session/types.ts`: `ProjectSlice` gains `"notes"` and is documented as an OPEN UNION;
  `ProjectConfig.author?: string` and `ProjectConfigPatch.author?: string | null`; the
  `note:changed` entry in the session event map.
- `src/session/project/state.ts`, `draft.ts`, `strict.ts`: the notes map (note id to record plus
  the session-only `source`) in the project state, the draft and the strict-mode invariants.
- `src/session/project/derive.ts`: `HOOK_ORDER` gains `"notes"` before `"styles"`; `snapshot()`
  gains the notes map.
- `src/session/GraphSession.ts`: `TX_PARTS` gains `"notes"`.
- `src/session/project/Dispatcher.ts`: the history budget in `emit` counts the notes slice.
- `src/session/commands/config.ts`: `author` validated as section 5.5 says (blank or white space
  is no name; at most 256 characters; `null` clears).

**Tests (Node):**

- `test/session/history/config.test.ts`: `config.set({ author })` sets, trims nothing, treats
  `"  "` as no name, refuses 257 characters, and undo and redo restore the previous value.
- `test/session/history/strict-state.test.ts`: the invariants hold with an empty notes slice.
- `test/session/entry-point.test.ts` passes unchanged (the session entry stays Node-safe).

**Done when:** a standalone session reports `config.author` and undoes it; the note types compile
from both entry points; lint, build and the `default` project pass.

**As built:**

- `NotesDocument`, `NotesReport` and `NoteMergeOptions`, and `toDocument` / `mergeDocument` on
  `NotesApi`, are left for step 4: the element's rule is that a missing member is absent, not
  stubbed. `NoteListOptions` is published as a named type for `list`'s options.
- The types are exported from `session.ts` and `index.ts` only. `src/session/index.ts` is not the
  published entry, and re-exporting them there is dead code to knip.
- `strict.ts` holds no per-slice invariants, so nothing changed there; the note records' freezing
  and copying is tested in `test/session/notes/write.test.ts` instead of `strict-state.test.ts`.
- `config.author` counts its 256 characters as code points. Like every other setting, sets of the
  author recorded close together merge into one step (typing a name is one undo).
- The `config.set` op gained the `author` variant, so it has a round-trip fixture, and
  `SessionConfig.author` is a read-only row in `src/session/commands/doors.ts`.

---

## Step 2. Writing notes: the commands, the reads and the events

**Files:**

- `src/session/notes/ids.ts` (new): `note_` plus a 26-character ULID (48 bits of time, 80 random
  bits from `crypto.getRandomValues`), and the UTC time stamp
  (`new Date().toISOString()`).
- `src/session/notes/validate.ts` (new): every input check of section 5.4 and section 8.4 -- text
  blank or over 65,536 code points, 1 to 64 targets, duplicate targets collapsed, target shapes,
  `EdgeId` turned into the saved edge form, set, result and item ids checked against the session,
  cites pinned to the current finished run, `mediaType` shape, plain-JSON `extensions` with
  reverse-domain keys, element-made fields refused, own-key lookups only, null-prototype copies,
  the 256 KB note size.
- `src/session/commands/notes.ts` (new): `note.add` (records the whole note, so redo replays the
  same id, time and author), `note.update` (before and after, stamps `edited`, a no-op records
  nothing), `note.remove` (the removed note).
- `src/session/commands/index.ts`: the three commands join the command register, the
  `SessionCommand` union and `COMMANDS`.
- `src/session/notes/NotesApi.ts` (new): `list` (newest first, every filter of section 5.1),
  `get`, `authors`, `add`, `update`, `remove`; frozen records, the same object until the note
  changes.
- `src/session/GraphSession.ts`: `session.notes`, `tx.notes`, and `note:changed` published once per
  touched note after the write (causes `command`, `undo`, `redo`).
- `src/session/commands/sets.ts` (or wherever `set.create` refuses element-made fields): add
  `reason: "element-field"` beside the existing `details.fields`.
- `src/graphty-element.ts`: the `graphty-note-change` DOM event with `{ id, change, fields, cause }`.

**Tests (Node, `test/session/notes/`):**

- `write.test.ts`: one test per `details.reason` in section 5.4; a refused write changes nothing
  and publishes nothing; a node or edge the graph does not hold is accepted; text is returned
  byte for byte (line breaks, leading and trailing spaces, a lone surrogate, a zero-width space).
- `undo.test.ts`: `add` / undo / redo gives back the same id, time and author; `update` and
  `remove` undo exactly; a transaction groups note writes with a set write into one step labeled
  as given; history labels "Added note", "Edited note", "Removed note".
- `events.test.ts`: one `note:changed` per touched note with the right `change`, `fields` and
  `cause`.
- `ids.test.ts`: ids match the schema pattern and are unique across 100,000 mints.
- `test/session/history/vocabulary.test.ts`: updated for the three new commands.

**Tests (browser):** one test in the element's event tests (`test/events/`) that `add` fires
`graphty-note-change` with plain-value detail.

**Done when:** a standalone session writes, reads, refuses, undoes and redoes notes as section 5
says; every reason in section 5.4 except the merge-only ones has a test.

**As built:**

- `note.add` carries the input only (`{ op, note }`). Its body mints the id and stamps the time
  and the author, and the patch records the whole note, so redo puts back the same id, time and
  author without minting. `session.notes.add` learns the id from the body through the note
  service (`NoteService.added`), so the command a door dispatches is plain data the doors test and
  a recipe can compare, and a consumer's `session.execute({ op: "note.add", note })` returns the
  id the same way. Nothing minted rides on the command, so there is nothing there to refuse.
- Two refusals beyond section 5.4's table, both `E_BAD_COMMAND`: `"unknown-field"` for an input
  or patch field that `add` and `update` do not take (a typo such as `mediatype` would otherwise
  be lost silently), and a cite that is not `{ result: <string> }` is `"unknown-cite"`.
- A target of a kind this release does not know is refused by `add` and `update` (`bad-target`);
  only `mergeDocument` keeps one, as `unsupported` (step 4).
- `11` and `"11"` in one note's targets are one target (duplicates collapse by text). Two notes,
  one on each, bind to their own type's node when the graph holds both.
- A session edge id from an edge added in the session without a file id is saved as its minted
  id (`graphty:e<n>`), which reads `missing` in another session (section 7.5).
- `note:changed` is published from the slice's change (as `set:changed` is), so a transaction's
  notes are told once each when it commits, and a refused write tells nothing.
- The browser test is in `test/browser/element-mirror-events.test.ts`, beside the other element
  mirrors.

---

## Step 3. Status, counts and labels

**Files:**

- `src/session/notes/status.ts` (new): `status(id)`, synchronous; target states `present`,
  `filtered`, `missing`, `earlier-run`, `unsupported`; cite states; display labels built from the
  stored form (item labels from the stored result id and key, never `sets.containing`); node ids
  matched by text with the exact-type preference of section 3.3.
- `src/session/notes/NotesApi.ts`: `status`, `counts`, and the `missing` filter of `list`.

**Tests (Node, `test/session/notes/status.test.ts`):** every row of section 4.1's table on a
standalone session -- a node present, hidden by `visibility.set`, absent, then loaded; an edge by
id and by position, including the pair-count change (conformance note-17 and note-18); a set
removed and restored; a `{ result }` and an `{ item }` across a re-run (note-19); a removed result;
an unknown target kind; cites `current` and `earlier-run`; node `11` against CSV id `"11"`
(note-16); `counts()` with multi-target notes.

**Done when:** every state and label in section 4 is produced by a Node test, and `status` never
awaits.

**As built (with step 2):** `src/session/notes/status.ts` and the reads in `NotesApi.ts`, tested
in `test/session/notes/status.test.ts`: node present, filtered, missing and found again; an edge by
session id and by position, `missing` once a load gives its pair three edges; `->` and `--`
labels; a set removed (`missing`, labeled with its name) and its removal undone; a result and an
item across a re-run and a removal; cites `current`, `earlier-run` and `missing`; `11` against
`"11"`; `counts()` with multi-target notes; every `list` filter and `authors()`. Still to do here:

- The `unsupported` target and cite states, once step 4 can open a note holding one.
- `sets.restore` of a set that only a note names fails today ("nothing named it any more, so its
  record was not kept"), because the set's tombstone keeps its record only while a layer, a
  filter or another set names it. Step 6, which makes notes users of the sets they name, must also
  count them there, so a set a note names can be restored.

---

## Step 4. Saving and opening: `toDocument` and `mergeDocument`

**Files:**

- `src/session/notes/document.ts` (new): `toDocument` (oldest first, key order of section 7.3,
  `author` only when set, unknown fields and unsupported targets written back as read);
  `mergeDocument` (all or nothing, rules 1 to 7 and 10 of section 7.6, `onConflict`, the
  `NotesReport`, the `source` in each merged note's status). Content comparison reuses the
  canonical form in `src/session/sets/signature.ts`.
- `src/session/commands/notes.ts`: `note.merge` (every note added or replaced, one undoable step,
  labeled "Added notes from <name>").
- `graphty-element/package.json`: `ajv` (2020-12 dialect) and `ajv-formats` as devDependencies, for
  validating against the schema in tests only.

**Tests (Node, `test/session/notes/document.test.ts`):**

- `toDocument` output validates against `design/documents/notes.schema.json`; the same notes give
  the same bytes; the section 7.2 example validates.
- Conformance rows note-2, note-3, note-5 to note-13, note-15, note-20 to note-22 on a standalone
  session (note-5 and note-6 also check the schema accepts the input).
- A round trip: `toDocument` then `mergeDocument` into a fresh session restores every note with
  its id, time, author and `edited`.
- Merging the same document twice records no second history step.

Not here: note-1 (needs an older release) and note-14 and rule 8 (need whole-file opening with
recipes, which is not built; they are written when `openDocument` is).

**Done when:** every merge rule that applies to a bare member has a passing test, and
`toDocument` output always validates.

---

## Step 5. Notes in styles, and literal note label text

**Files:**

- `src/session/notes/countIndex.ts` (new): per node and per edge, the count, newest text and newest
  time of the notes targeting it, keyed by the text form of node ids; rebuilt on a reload, updated
  per changed note.
- `src/session/styles/sources.ts`: `parsePath` gains the `graphty.` root ahead of the bare-path
  rule. `graphty.notes.count`, `graphty.notes.latest` and `graphty.notes.latestTime` read the count
  index (absent at zero, so `has` works); any other `graphty.` path reads nothing. `data.graphty.x`
  still reads the column.
- `src/session/styles/StylesApi.ts`: `validate` reports a bare `graphty.` path when the data has a
  column of that name, and a `graphty.` path that names no element value as unbound.
- `src/session/GraphSession.ts`: a notes hook on the derivation lane beside the `runs` hook --
  invalidate the layers that read a `graphty.notes.*` path (detected as `readsAnyField` does), then
  `painter.repaintElements` for exactly the nodes and edges that gained or lost a note.
- `src/session/query.ts` and `src/session/selection/targets.ts`: `select({ where })` reads
  `graphty.notes.*`.
- `src/session/visibility/filter.ts`, `src/session/scope/ScopeApi.ts`, the recipe path checks:
  refuse `graphty.notes.*` with `E_BAD_SELECTOR`, `details.reason: "notes-path"`. Set rules
  (`src/catalog/sets/parse.ts`) already refuse the root with `reserved-root`; no change.
- Literal note text: the label and tooltip channels carry a `literal` flag when their value comes
  from a `graphty.notes.*` binding (`src/session/styles/encoding.ts`, `derive.ts`), through
  `src/managers/StylePainter.ts` and `src/Node.ts` / `src/Edge.ts`, to a `literal` option on
  `src/meshes/RichTextLabel.ts` that skips `RichTextParser` and draws one plain run with the
  label's own style. A literal label written in a layer, and a data or result binding, still go
  through the parser exactly as today.

**Tests (Node, `test/session/notes/styles.test.ts`):** a `has` selector on `graphty.notes.count`
matches exactly the noted nodes; a binding reads count, latest text and latest time; conformance
note-23, note-23b and note-24; `data.graphty.pinned` still reads the internal column; a note write
repaints exactly the affected elements and a layer reading no `graphty.notes.*` path is not
repainted (checked through the painter seam the existing `test/session/styles` tests use); undo of
an `add` repaints back; `select({ where: "graphty.notes.count > \`1\`" })`.

**Tests (browser, `test/browser/`):** a label bound to `graphty.notes.latest` on a note reading
`<color='red'>x</color>` shows all 20 characters in the label's default color (conformance
note-7), asserted on the label's drawn text runs; in the same scene a data column holding
`<bold>y</bold>` bound to a label still renders bold, which pins that this pull request does not
change data labels.

**Done when:** the quick start's layer (section 2) labels exactly the noted nodes on a standalone
session and in the browser, and no existing style, label or filter test changes.

---

## Step 6. Selecting what a note is about, and sets that know their notes

**Files:**

- `src/session/selection/targets.ts`, `src/session/selection/SelectionApi.ts`: `{ note, target? }`
  selection target; set and item targets select their members; `missing` targets skipped and
  counted in `SelectionDelta.skipped`.
- `src/session/sets/types.ts`: `SetUser.kind` gains `"note"`.
- `src/session/sets/SetsApi.ts`: `usedBy` lists notes naming the set, labeled with the note's first
  line cut to 80 characters.
- `src/graphty-element.ts`, `src/Graph.ts`: `el.select({ note })` forwards as every other target.

**Tests (Node):** `test/session/selection/` -- `select({ note })` over node, edge, set and item
targets, with one `missing` target counted in `skipped`; `target: 0`. `test/session/sets/` --
`usedBy` lists a note, and stops listing it once the note is removed.

**Done when:** an application can select a note's targets and ask a set's notes without computing
either itself.

---

## Step 7. Notes in exports, off by default

**Files:**

- `src/data/export.ts`: the `notes` option (default `false`). Every export of a session holding
  notes adds a `W_GRAPHTY_NOTES` loss note with the number of notes not carried as notes. With
  `notes: true`, the `graphty.notes.count` and `graphty.notes.text` columns on noted nodes and
  edges (newest first, joined by a blank line, cut to 64 KB with `W_GRAPHTY_TRUNCATED`), added
  after the `graphty.`-prefix filter so the element's own columns are still dropped; CSV cells go
  through the existing `neutraliseFormula`.
- `src/catalog/writerRegistry.ts` / `src/catalog/formats.ts`: `notes` among the common writer
  options, so every format and every registered writer takes it.

**Tests (Node, `test/data/`):** conformance note-26, note-26b and note-27; an export of a session
without notes reports nothing new; GEXF, GraphML and CSV each round-trip the two columns as
ordinary data columns (`data.graphty.notes.count`), never as notes.

**Done when:** a default export never carries note text and always says notes were left out.

---

## Step 8. Documentation

**Files:**

- `graphty-element/docs/guide/notes.md` (new): sections 1 to 6 of notes-design.md for a third
  party -- the quick start, targets and cites, refusals, the author, status, events, undo, styles,
  saving and opening, exporting. Linked from `docs/.vitepress/config.ts`'s sidebar and from
  `styling.md`, `events.md`, `undo.md` and `sets.md`.
- `graphty-element/docs/guide/styling.md`: the `graphty.` root, the three note paths, and that a
  label bound to `graphty.notes.*` is drawn literally.
- `graphty-element/docs/guide/events.md`: `note:changed` and `graphty-note-change`.

**Tests (Node):** `test/session/notes/guide-example.test.ts` runs the guide's quick start on a
standalone session (the pattern of `test/session/history/guide-example.test.ts`), so the
documented example cannot rot. The docs build (`npm run docs:build`) passes with no dead links.

**Done when:** an author who has read only the published guide writes the quick start and it
compiles against the published types (CLAUDE.md, "Easy things easy, hard things possible").

---

## Step 9. The gate, and the pull request

- `./tools/run-tests.sh graphty-element-default`, then each `graphty-element-browser-<n>` shard,
  one at a time; `tools/prepush.sh` (build, lint, knip, fast tests).
- Open the notes pull request from `feat/element-notes` against master. Its description says it is
  not breaking, lists the published names (section 10), and names the breaking change it leaves
  for the grouped major (below), with the reason.

**Done when:** CI is green and the pull request is open.

---

## The breaking change: every bound label draws text literally

**What changes.** A value that reaches a node label, an edge label or a tooltip through a binding --
from a data column, a result or a note -- is drawn as its characters. Markup (`<bold>`,
`<color='...'>` and the rest) works only in a label written as a literal value in a layer. Today a
data column bound to a label restyles itself when a value holds such a tag.

**Why it is separate.** It changes how existing consumers' data labels render, so it is a breaking
change for graphty-element (owner decision 8). The notes pull request must stay non-breaking.

**Branch and timing.** Branch `fix/literal-bound-labels` from master once the notes pull request
has merged: it reuses the `literal` option that step 5 adds, so the change is a small diff that
widens the condition from "a `graphty.notes.*` binding" to "any binding". Commit as
`fix(graphty-element)!: draw bound label text literally` with a `BREAKING CHANGE:` footer. Open
the pull request as a draft and do not merge it on its own: per CLAUDE.md "Breaking changes and
major releases", it is merged into the branch that assembles the next graphty-element major (4.0)
together with the other breaking changes planned for it, and released with one merge. Before
opening it, look for other planned graphty-element breaking changes (open pull requests with `!`
commits, scheduled removals, registers in `design/`) and list them in its description.

**Files:**

- `src/session/styles/encoding.ts`, `derive.ts`: every `by` binding on a label or tooltip channel
  sets `literal`; a literal value written in the layer does not.
- `design/documents/style.md`: "Paths" (or "Bindings"): bound label text is literal; markup only
  in a literal label in a layer.
- `graphty-element/docs/guide/styling.md`: the same rule, with an example.
- `graphty-element/docs/guide/migrating-to-4.md` (new, or the existing page for the grouped major):
  a row saying data and result labels no longer interpret markup, and how to keep a styled label
  (write the markup as a literal value in a layer, or split the styling into layers).
- notes-design.md section 6.3: the rule now applies to every bound value.

**Tests:**

- Node: the compiled label channel carries `literal` for a data, a result and a note binding, and
  not for a literal label value.
- Browser (`test/browser/`): a data column holding `<bold>y</bold>` and a result field holding
  `<color='red'>x</color>`, each bound to a label, draw every character; a literal label value in a
  layer still renders bold. The step 5 browser test that pinned the old data-label behavior is
  changed in this pull request, which is the visible record of the break.
- Visual review: label stories that bind a column containing markup will change; the owner reviews
  them.

**Done when:** the draft pull request is open, its description says it bumps graphty-element's
major and lists the grouped breaking changes, and it is merged only as part of that major.
