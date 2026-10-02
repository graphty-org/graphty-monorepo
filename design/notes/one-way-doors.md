# Notes: the one-way doors

These are the decisions in [notes-design.md](notes-design.md) that become a contract other people
depend on once graphty-element publishes them -- a file format, a public name, a stored value --
or that are very expensive to undo. Everything else in the design can be changed by an edit later
and is decided there. Most important first; the recommended option is listed first in each.

**Status: all nine decided by the owner on 2026-10-01** ([notes-decisions.md](notes-decisions.md)).
Doors 1 to 5, 7 and 9 went as recommended. Door 6 went differently: the reserved root is
`graphty.`, for every value graphty-element provides, so the paths are `graphty.notes.count`,
`graphty.notes.latest` and `graphty.notes.latestTime`. Door 8 went as recommended, but as a
breaking change in its own pull request held for the next grouped major; the notes work draws only
note-derived label text literally. This page keeps the options as they were weighed.

---

## 1. The saved note: the `graphty-notes` file member and the `Note` record

Every `.graphty.json` file written with notes carries this shape forever. A field name, a type or a
required field cannot change without a version 2 and a reader for both. The design: member kind
`graphty-notes`, version 1 (a bare member is also a valid file); a note has required `id`, `time`,
`targets` (a list of 1 to 64) and `text`; optional `author`, `edited`, `cites`, `mediaType`,
`extensions` (reverse-domain keys for other applications' data). Limits are fixed for version 1:
10,000 notes, 64 targets, 64 cites, 65,536 characters of text.

- **As designed.** All nine fields now. Ships one shape for both the app and third parties; `cites`
  and `extensions` cover what issues #188 and #189 asked for (done flags, tags) without new fields.
- **Minimal version 1.** Only `id`, `time`, `targets`, `text`, `author`, `edited`; `cites`,
  `mediaType` and `extensions` arrive later as optional additions. Less to commit to now; the app's
  done flags and tags have nowhere to live until then.
- **Single target.** `target` (one thing) instead of `targets` (a list). Simpler record, but "these
  two accounts are the same person" becomes two notes, and moving to a list later is a version 2.

Recommendation: **As designed** -- every field is optional except the four the owner called
required, and a list of targets cannot be added later without a version 2.

## 2. Target kinds and how each is saved

A target is what a note is about. Its saved form decides whether a note still finds its node or
edge after the file is reopened on fresh data, and every saved file depends on it. The design has
six kinds: `{ graph: true }`, `{ node: <id> }`, `{ edge: { source, target, id } }` (or, for an
edge without an id, its position among the edges between the same two nodes), `{ set, name }`,
`{ result }` and `{ item }` (one group or path a run found, pinned to that run). Unknown kinds read
`unsupported` and are kept, so new kinds are additions.

- **All six now.** Covers the owner's node, edge, group, path, run and whole graph from day one.
- **Node, edge and graph now; set, result and item later.** Ships the forms with the clearest
  identity first; groups and paths can only be noted after a later release.
- **Node and edge by their session id.** Simpler, but session edge ids are renumbered on every
  load, so edge notes would not survive a reopen.

Recommendation: **All six now** -- the owner listed group and path as required targets, and the
open-union fallback keeps later kinds additive.

## 3. Note ids and time format

Ids are matched when files from different people are merged, and times are compared and sorted by
every reader. The design: ids are `note_` plus a random ULID (globally unique, no counter); times
are ISO 8601 with an explicit offset, written as UTC with milliseconds
(`2026-10-01T09:12:03.120Z`), stamped by graphty-element and never taken from the caller.

- **Random `note_` ULID, ISO 8601 UTC time.** Unique across people's files, sortable, readable in
  a text editor.
- **Counter ids like sets (`note_1`, `note_2`).** Short, but two people's `note_1` collide on every
  merge, so merging needs renaming everywhere.
- **UUID v4 ids, epoch milliseconds as a number.** Unique and compact, but times are unreadable in
  the file and ids carry no kind prefix.

Recommendation: **Random `note_` ULID, ISO 8601 UTC time** -- notes travel between people, so only
globally unique ids make merging safe, and readable times keep files diffable.

## 4. Opening a notes file: merge rules and what binds

This decides whether opening a file can ever lose or overwrite someone's words, and every
application that opens files follows it. The design: opening always merges, never replaces; a
note whose id is held with different content is kept beside it under a new id by default
(`keep-both`; `replace` and `keep-mine` on request); set, result and item targets from a file bind
only when the same file carries what they name, otherwise they read `missing`.

- **Merge, keep both, bind by identity only.** No opening ever deletes or overwrites a note; a
  notes file opened on unrelated data shows its notes as missing rather than attaching them to the
  wrong set.
- **Import replaces all notes.** What the design studio proposed: simpler to explain, but opening a
  file silently discards notes the reader already had.
- **Merge, but bind set and result targets by id across files.** More notes bind, but two
  unrelated projects' `set_suspects` would attach notes to the wrong group.

Recommendation: **Merge, keep both, bind by identity only** -- it is the only option in which
opening a file can never lose a note or attach one to the wrong thing.

## 5. The body-format hint (`mediaType`)

graphty-element treats note text as plain text; the graphty app renders it as Markdown; another
application might write HTML. An optional hint lets a reader know how the writer meant the text.
Adding it later is an addition; shipping it and removing it later is not.

- **Optional `mediaType` now.** A MIME type such as `text/markdown` or `text/html`, stored and
  written back, never acted on by graphty-element; the app writes `text/markdown`.
- **No hint.** Every reader guesses; the app's Markdown notes show as raw asterisks in an HTML
  reader, and HTML notes as tags in the app. Can still be added later.
- **A short enum (`format: "markdown" | "html" | "text"`).** Easier to read, but cannot name a
  Markdown flavor or a new format without a schema change.

Recommendation: **Optional `mediaType` now** -- the owner expects apps to read notes differently,
and without a hint the notes written before it exists can never be told apart.

## 6. The `notes.` style path root

Style layers read values by path (`data.<column>`, `results.<run>.<field>`). Today a path with
neither prefix reads a data column, so `notes.count` would read a column literally named that.
The design reserves every path starting `notes.` for notes, with `notes.count` (absent when an
element has no notes, so a `has` selector picks out noted elements), `notes.latest` and
`notes.latestTime`, usable in style selectors, bindings and `select({ where })` only.

- **Reserve the whole `notes.` root.** Short, guessable names; later paths are additions; a column
  named `notes.count` stays reachable as `data.notes.count`.
- **Reserve only the three names.** Fewer columns change meaning, but every later notes path is a
  breaking change for whoever has a column of that name.
- **A distinct spelling (`note:count` or `$notes.count`).** No collision with any column, but a
  spelling unlike every other path that nobody would guess.

Recommendation: **Reserve the whole `notes.` root** -- graphty-element's own writers always write
`data.`, so no saved file changes meaning, and later paths stay additions.

## 7. The public API names and the author setting

Once released, renaming any of these breaks every consumer. The design follows the sets API:
`session.notes` with `list`, `get`, `status`, `authors`, `counts`, `add`, `update`, `remove`,
`toDocument`, `mergeDocument`; the session event `note:changed` and the DOM event
`graphty-note-change` (matching `set:changed` and `graphty-selection-change`); errors as
`E_BAD_COMMAND` plus `details.reason`; the author as the project setting `config.author`;
`select({ note })`.

- **As designed.** Every name the app and the design studio need, in the element's existing
  naming patterns.
- **A smaller first surface.** `list`, `get`, `status`, `add`, `update`, `remove`, `toDocument`,
  `mergeDocument` and the events only; `authors`, `counts`, `select({ note })` and `sets.usedBy`
  arrive later as additions. Less to commit to; the app's counts and "select this note's targets"
  wait for that release.
- **Own error codes (`E_NOTE_EMPTY`, `E_NOTE_TARGET`, ...).** What the design studio proposed;
  more specific, but unlike how sets and every other session API refuse.

Recommendation: **As designed** -- the extra reads are what keep the app from computing over notes
itself, which the architecture forbids.

## 8. Bound label text is drawn literally

Today every label and tooltip goes through the rich-text parser, so a data column bound to a label
restyles itself when its value holds `<bold>` or `<color='red'>`. Notes need bound text drawn as
characters. This changes how existing consumers' data labels render, so it may need a major
release, and reversing it later is another one.

- **Literal for every bound value.** Data columns, results and notes; markup only in a label
  written as a literal value in a layer. Fixes the existing defect for everyone.
- **Literal for `notes.*` only.** No change for existing data labels, but the defect stays and a
  note and a data column bound the same way behave differently.
- **An opt-in flag on the binding (`markup: true`).** Literal by default, markup when asked; one
  more option to document and keep.

Recommendation: **Literal for every bound value** -- a value from a file must never restyle the
picture, and one rule for all bindings is the easiest to explain.

## 9. Notes in GEXF, GraphML and CSV exports

What a default export discloses is hard to take back once files are shared, and the column names
become a contract for anyone reading them back. The design: notes are left out by default; every
export of a session holding notes reports `W_GRAPHTY_NOTES`; `exportGraph(format, { notes: true })`
adds `notes.count` and `notes.text` columns.

- **Off by default, loss always reported.** A file shared to show a technique never carries
  judgments ("suspect") by accident.
- **On by default.** Follows the 2026-09-28 rule "whatever the chosen format can represent", but
  every export carries the reader's notes unless they turn it off.
- **No note columns at all.** Notes only travel in `.graphty.json`; nothing to name or maintain.

Recommendation: **Off by default, loss always reported** -- leaving notes out is the direction that
can be changed later without anything already shared having leaked.
