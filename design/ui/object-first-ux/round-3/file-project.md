# Round 3: file, project and session

This document closes the eight gaps of the "File, project and session" cluster in the gap
register (`design/ui/object-first-ux/round-3/gaps.md`). Each gap is a function the app needs in
order to work at all -- open a file, keep the work, get it back -- that the round-2 design
(`design/ui/object-first-ux/round-2/revision.md`) described in a sentence or not at all, and that
no mock drew. The headline case: after the first load, no mock showed how to open another file.

Every resolution below uses the round-2 frame and adds as little as possible to it: one left
panel (the dataset name with its file menu, the Views list, the tree of objects), the canvas with
its floating toolbar, the right panel (the inspector, with a fixed header block and tabs), the
bottom dock (Table, Assistant, History), and the status bar. One new surface is added (a second
Dataset root in the tree, for two graphs); everything else lives in a menu row, a dialog, a row
of the Dataset's Overview tab, or the status bar. Paths are under
`/home/apowers/Projects/graphty-monorepo/`. "#NNN" is an issue in graphty-org/graphty-monorepo.

## Words used here

- **File menu**: the menu that opens from the chevron beside the dataset name at the top of the
  left panel (Figma's "file header"). Clicking the name itself renames.
- **Dark menu**: Figma's menu style: a #1e1e1e panel, 24 px rows of 11 px white text, the
  shortcut in a right-hand column at 70 percent white, a 17 px separator between groups, a
  chevron on a row that opens a submenu (`design/ui/figma/left-sidebar/README.md` section 9).
- **Dialog**: the kit's 480 px modal panel centred on the canvas over a dimming layer (the
  "scrim"); the Import dialog (screen 14) and the reload dialog (screen 15) are dialogs.
- **Project**: a `.graphty` file that holds a whole session: the data (or a link to it), every
  object in the tree with its definition, results and style, the Views, the notes and the node
  positions. It is the saved form of the element's objects API (#301, "no project file to save
  and reopen a whole session").
- **Recipe**: a file holding only the steps that made each object (the run command, its
  parameters, its style), without the data or the results, so the same analysis can be run on
  another file.
- **Autosave**: a copy of the session the app keeps in the browser's own storage (IndexedDB)
  without being asked, so a reload or a crash loses nothing.
- **Fingerprint**: the element's stable identity of a graph's topology (`session.fingerprint()`
  in `graphty-element/src/session/types.ts`); equal fingerprints mean the same node ids and
  edges.
- **Unsaved marker**: a 6 px dot after the dataset name that says "there is work not in a
  project file". The mocks draw the dot.

## The rule for what counts as unsaved work

Everything the History dock records is work: an object created, edited, re-run or removed; a
View saved; a note; a node moved by hand; a Style changed; a Dataset setting (Layout, Canvas)
changed. The camera, the selection, a hover, an open panel and a Setting are not work and never
set the marker. The marker clears when a project save succeeds and reappears on the next
recorded change. This rule decides every prompt below: **no unsaved work, no prompt**.

---

## 1. The file menu, drawn open (gap: file menu drawn open after a load)

**Screen 16.**

**Entry points.** The chevron half of the dataset-name split button (click, or Enter / ArrowDown
when it has keyboard focus); Ctrl+O opens the system file picker directly without the menu;
before a load the same menu opens from "graphty v" with the rows that need data disabled. The
"?" button at the right of the status bar keeps its three rows (Help, Keyboard shortcuts, Open
sample) as the second door for a reader who does not think of the name as a menu.

**Rows**, in four groups separated by rules (a dark menu, 24 px rows):

| Group | Row | Shortcut | What it does |
|---|---|---|---|
| Data in | Open... | Ctrl+O | The system picker, filtered to what `catalog.formats()` reads plus `.graphty` and recipes. A data file goes to the Import dialog (screen 14); a project reopens (section 4) |
| | Open recent > | | A submenu: up to 8 entries, newest first, each "name  what  when" (a project, a data file, an autosave). Last row "Clear recent". An entry whose file the browser can no longer read shows "Locate..." instead of its time |
| | Open sample > | | The four samples with their sizes, as on the welcome sheet |
| | Add data... | | Merges another file into this graph (the "getting data in" cluster's dialog) |
| | Open as a second graph... | | Opens a file beside this one (section 7) |
| Your work | Save project | Ctrl+S | Section 4 |
| | Save project as... | Ctrl+Shift+S | Section 4, always with the dialog |
| | Close dataset | | Section 2 |
| | Run a recipe... | | Section 6 |
| | Present | | Presentation mode (the export and presentation cluster's design) |
| App | Settings... | Ctrl+, | Section 8 |
| | Keyboard shortcuts | Ctrl+/ | The shortcut sheet |
| | Help | | The documentation |

The three rows that throw the current dataset away (Open..., Open recent, Open sample) carry the
hint "replaces Karate Club" in the shortcut column while hovered (Open... keeps its shortcut and
says it in the tooltip). The hint is the answer to "will this lose my graph?" before the click;
the prompt of section 3 is the answer after it.

**Keyboard.** ArrowUp / ArrowDown move, ArrowRight or Enter opens a submenu, ArrowLeft or Escape
closes one level, typing a letter jumps to the next row starting with it. Ctrl+O, Ctrl+S and
Ctrl+Shift+S are also browser shortcuts; the app takes them (prevents the browser's default)
whenever focus is inside the app, which Chrome, Edge, Firefox and Safari allow. Close dataset has
no shortcut because Ctrl+W closes the browser tab and cannot be taken.

**Errors.** A file the picker returns that no reader accepts goes to the "load failed" state of
the getting-data-in cluster; the menu itself has no error state.

**Element API.** None new for the menu. The picker's filter reads `catalog.formats()` (exists).
The unsaved marker needs the element to say whether the tree changed since the last save
(section 4).

## 2. Close the dataset (gap: close with a confirmation)

**Screen 17**, left inset.

**Entry points.** File menu > Close dataset; the Dataset inspector's "..." > Close dataset
(round-2 already lists it there).

**States.**
- No unsaved work: the dataset closes at once and the app returns to the welcome sheet (screen
  1). Nothing is lost: the project is on disk, and the session is in Open recent (section 5).
- Unsaved work: a dialog **"Close Karate Club?"** with the same rows as the save prompt of
  section 3 (what would be lost, counted) and the buttons **Cancel**, **Close** (closes without
  saving) and **Save first** (the one filled button; saves, then closes).

**Keyboard.** Enter presses Save first; Escape cancels. Close is never the default: it is the
only button that loses work.

**Errors.** If Save first fails (the save errors of section 4), nothing closes.

**Element API.** Closing is `clearData` (exists). The counts come from the objects API's list and
its journal (settled decision 1 of round 2): small.

## 3. Unsaved work: the marker and the prompt (gap: unsaved-changes marker and prompt)

**Screens 16 (marker) and 17 (prompt).**

**The marker.** The 6 px dot after the dataset name in the file header, secondary colour, with
the tooltip "Changes since 13:40 are not in a project file" (or "Never saved"). The browser tab's
title gets the same mark ("* Karate Club - graphty"). The Dataset's Overview tab gains a first
row, **Project**, reading "Not saved  [Save...]", "karate-club.graphty, 14:02" once saved, or
"Autosave 14:32  [Save...]" after a restore.

**The prompt.** Any action that would replace the current graph while there is unsaved work --
Open..., a recent file, a sample, a drop that chose Replace, Close dataset -- first opens one
dialog, **"Save changes to Karate Club?"**:

- first line: what triggered it, "Opening les-miserables.gml replaces Karate Club. This work is
  not in a project file yet:";
- the loss, counted: Objects 3, Views 1 saved, Notes 3, Moved nodes 5; Last saved never (or
  "13:40, 22 minutes ago");
- "An unsaved copy stays in Open recent for 7 days." (section 5), so a wrong click is
  recoverable;
- a way out that loses nothing: "Open les-miserables.gml as a second graph instead" (section 7);
- buttons **Cancel**, **Don't save**, **Save...** (filled; the Save project dialog on a first
  save, then continues).

**Keyboard.** Enter presses Save...; Escape cancels; D presses Don't save.

**Leaving the page.** With autosave on (the default), closing the tab asks nothing: the session
is kept. With autosave off, or when the last autosave failed, the browser's own "Leave site?"
prompt is raised (the `beforeunload` event); the browser does not allow custom text there.

**Element API.** A change counter on the objects API with a "saved" mark: `objects.changes`
(changes since the last save) and an event when it moves. Small; part of #301.

## 4. Save the project and reopen it (gap: save, see it saved, reopen, missing data)

**Screen 18.**

**Entry points.** Ctrl+S or File > Save project; File > Save project as... (Ctrl+Shift+S); the
Overview's "Project  Not saved  [Save...]" row; the Save... button of the prompts above.

**First save** opens the **Save project** dialog:
- File name [karate-club] (the dataset name, lower-cased, spaces as hyphens), saved as
  `karate-club.graphty`;
- Data [Include the data | Link to the source]: Include is the default below 50 MB and makes a
  project that opens anywhere ("adds 9 KB"); Link keeps only the source's name, size and
  fingerprint and needs that file again on reopening;
- what it keeps: the objects and their results, the Views, the notes, the node positions, the
  Dataset's Layout and Canvas settings; what it does not: Settings (section 8), which belong to
  the reader and the machine;
- where it goes: Chrome and Edge let the app hold the file (the File System Access API), so
  every later Ctrl+S writes back to it silently; Firefox and Safari download a new copy each
  time ("karate-club (2).graphty"), and the dialog says so;
- Cancel, **Save**.

**Saved state.** The unsaved dot goes; the status bar shows "Saved karate-club.graphty 14:02"
for 4 s in the computing chip's slot; the Overview's Project row reads "karate-club.graphty,
14:02". A later Ctrl+S with a held file saves with no dialog and shows only the chip.

**Reopening.** File > Open..., Open recent, or a drop of a `.graphty` file. With the data
included it opens at once: the tree, the paint, the Views and the notes exactly as saved,
results restored rather than re-run. With a link, the app looks for the file (a held file
handle, or the autosave store); when it is not there, a dialog **"Open karate-club.graphty"**:
"Needs karate.gml (34 nodes  78 edges). Not found in this browser." [Locate the file...] (the
filled button) [Open without data] [Cancel].
- Locate: the picker; the chosen file is checked by its fingerprint. A match opens as saved. A
  mismatch says what differs ("36 nodes, 2 new; 80 edges") and offers [Choose another] [Open
  and re-run], which replays every object on the new data under round 2's stale rule (cheap ones
  re-run, expensive ones land waiting, broken ones land failed with the reason).
- Open without data: the tree, the Views and the notes open with every object failed "Data
  missing [Locate file...]"; the canvas shows the welcome sheet's drop zone. The reader can read
  the notes and the recipe, and locate the file later.

**Errors.** Not a project ("karate.gml is a data file: open it as data?"); made by a newer
graphty ("Project format 3; this app reads up to 2. [Open what it knows] [Cancel]"); unreadable
("Could not read karate-club.graphty: not valid JSON at byte 1,204"); save refused (storage
full, permission revoked): the status bar's failed chip "Could not save [Retry] [Download
instead]", and the dot stays.

**Element API.** The project document is the element's, per round 2's settled decision 1:
`objects.save({ data: "include" | "link" })` returns a versioned JSON document (the data as
graph-format's wire form when included); `openProject(doc, { data? })` restores it and returns
a report (restored, re-ran, failed, data missing). Large; it is #301. The app owns only the
picker, the file handle and the download.

## 5. Autosave and recovery (gap: restore work after a reload or crash)

**Screen 19.**

**The rule.** Autosave is on by default (Settings > General). The session is written to the
browser's storage 2 s after the last recorded change and whenever the tab is hidden. The current
session plus the last five closed or replaced ones are kept for 7 days (the Settings choice);
the data file is kept with a session when it is 50 MB or less and the browser grants the space,
otherwise the session keeps a link and the data must be located again. Settings and the
assistant key are never in an autosave.

**Restore after a reload or a crash.** When graphty opens and the last session was not closed,
it is restored at once, without a question (a question at start-up is one more thing between
the reader and the graph). The status bar says what happened: "Restored your session from
14:32: 5 objects, 2 need re-running [Start empty]". A run that was computing when the tab closed
comes back **waiting** with its Run button; objects made from it come back **stale**; the stale
chip offers Re-run all. Start empty returns to the welcome sheet and leaves the copy in Recent.
The notice stays until the next recorded change or 20 s.

**Recent on the welcome sheet.** Screen 1's single "Continue ..." row becomes the Recent list:
each entry "name  what  when" (autosave 14:32, project Mon, data file Sep 18), a "..." per entry
with Open, Save as project..., Remove from Recent; an entry whose data was not kept reads "data
not stored (48 MB)" with [Locate file...].

**Errors.** Storage full or refused: autosave switches itself off for the session, the status
bar says "Autosave paused: browser storage full [Settings]" once, and leaving the page raises
the browser's prompt (section 3). A stored session that no longer reads (a newer format) is
listed with "cannot open in this version".

**Element API.** A consumer who embeds graphty-element should get recovery without writing
storage code, so autosave is the element's: an `autosave` option (a key naming the store; off by
default in the element, on in the app), and `autosave.list()`, `autosave.restore(id)`,
`autosave.remove(id)` over the same project document as section 4. Medium, after #301. The
Recent list itself (the file handles of recently opened files) is the app's: it is the reader's
own history, not graph state.

## 6. Recipes: export one, run one on a new file (gap: recipe replay)

**Screen 20.**

**Export.** Export > Export recipe... (the Export menu's lower group) opens a dialog: a checkbox
per object in tree order (all checked), Keep [Steps | Styles only] (Styles only writes the looks
without the runs, for applying a house style), Include layout [switch] (the layout engine and
its settings), [Export], which downloads `karate-analysis.recipe.json`. A saved project also
contains its recipe, so Run a recipe accepts a `.graphty` file too.

**Run.** File > Run a recipe... opens the picker, then the dialog **"Run recipe:
karate-analysis"**, which checks every step against the current data before anything runs:
- "Made on Karate Club (34 nodes) on Sep 18. Runs on club-week-39 (34 nodes, 80 edges)."
- a table of steps in order, each marked **fits**, **column not found** (with a select mapping
  the missing column to one of this file's columns of the same type: "weight is [strength v]"),
  or **skip** with the reason ("no node 34"), which also skips the steps that depend on it;
- Objects [Add to current | Replace current] (Replace removes the current objects in one undo
  step);
- the cost: "Runs 4 of 5 steps, about 3 s"; a step over the cost gate lands waiting, as any run;
- Cancel, **Run**.

The new objects land in the tree like any other, each with "Made by: recipe karate-analysis,
step 3" on its Record tab. The whole replay is one History entry, so Ctrl+Z removes it.

**Errors.** Not a recipe; a newer recipe format; every step skipped ("Nothing in this recipe
fits club-week-39: it names columns sent and weight, and nodes 1 and 34"), Run disabled.

**Element API.** The door exists: `session.run(SessionCommand)` is the serialisable form of every
run, documented as the recipe's door (`graphty-element/src/session/types.ts`), and
`session.plan()` answers what a command would do. Missing: `objects.recipe(ids, { stylesOnly,
layout })` to write one, `objects.checkRecipe(recipe)` returning the per-step fit report, and
`objects.applyRecipe(recipe, { mapping, mode })`. Medium; builds on the objects API.

## 7. Two graphs in one session (gap: two datasets, switch, combine)

**Screen 21.** This is the one new surface: **a second Dataset root in the tree**. Nothing else
could hold it: the comparison needs both graphs' objects, both inspectors and the combine
actions, and the tree is where objects live.

**Entry points.** File > Open as a second graph...; a drop on a loaded graph, choosing "A second
graph" (the drop choice is the getting-data-in cluster's; this is its fourth answer); the link
"Open ... as a second graph instead" in the save prompt of section 3.

**Opening.** The import dialog gains two rows when opening as a second graph: Open as [A second
graph v] and **Match by [gene_id v]** (the column that identifies the same node in both files;
the first graph's id column is chosen the same way), with a dry-run count under it: "32 of 34
tumor nodes match; 0 nodes only in normal". A match count of zero warns and keeps Open enabled
(two unrelated graphs are allowed; they simply cannot be combined).

**The tree.** One Dataset root per graph, each with its own objects beneath it. One root is the
**active** graph: the canvas draws it, the toolbar's tools run on it, the status bar counts it.
Clicking a root makes it active (the camera keeps its framing). The file header shows the
session's name: the project name once saved, otherwise the two dataset names ("tumor, normal").

**Both selected.** Ctrl+click the second root. The inspector becomes "2 graphs  tumor and
normal": summary "matched by gene_id: 32 of 34 nodes"; a reading line "55 edges in both, 16
only in tumor, 7 only in normal"; one tab, Compare: a side-by-side table (Nodes, Edges, Density,
Parts, Mean links); the edge key for the canvas, which previews the union while both are
selected (both grey, tumor only orange, normal only blue and dashed; nodes present in one graph
only outlined in that graph's colour); **Combine into a new graph**: [Union] [Intersection]
[tumor - normal] [normal - tumor], each adding a third root ("tumor + normal") whose edges carry
an "in" column (tumor, normal, both), so the edge key becomes an ordinary Grouping on it; and
"Compare side by side" [switch], round 2's two-canvas compare (section 6.7, #186).

**Errors.** Match column missing in one file (the select lists only columns present in both);
more than 10 percent of ids duplicated in the match column ("gene_id is not unique in normal:
14 repeats; combine will keep the first"); memory: two graphs count together against the
drawing ceiling of Settings > Performance.

**Element API.** Large. The element holds one graph per session today. Needed: several datasets
in one session (`datasets.add(source, { name, matchBy })`, `list()`, `activate(id)`,
`remove(id)`) with the objects API scoped per dataset, and `datasets.combine(a, b, op, {
matchBy })` producing a derived dataset with the "in" edge column. A smaller first step, useful
on its own: the combine as a pure function over two graph-format snapshots in the element's
Node-safe `./format` entry (medium), with the second root hosted as a second session. The side
by side canvas is #186.

## 8. Settings (gap: the Settings sheet and its entry point)

**Screen 13**, now drawn.

**Entry points.** File > Settings... (Ctrl+,). The Assistant tab's first state ("Choose a
provider") links to Settings > Assistant; the Layout tab's acceleration line links to Settings >
Performance.

**The sheet.** Round 2 specified a 640 x 480 sheet with a left list of sections. This round
draws it as the kit's 480 px dialog with the eight sections as **disclosures** in one list
(a disclosure is a section collapsed to its header with its current values as a one-line
summary; several may be open at once). The reason: it is the grammar the inspector already uses,
it needs no new component, and the closed sections' summaries answer "what is set?" without
opening anything. Rows are round 2's (`round-2/screens.md` screen 13), with two additions to
General: **Autosave** [switch, on] and **Keep closed sessions** [7 days v] (section 5).
Changes apply at once; Done closes; Escape closes.

**Errors.** An API key the provider rejects shows the provider's reason under the key field
("401: invalid key") after the first Ask, and the Assistant tab's first state returns; Required
acceleration on a machine without WebGPU shows "Unavailable: needs a secure context" on the
state line and every GPU-only run fails with that reason (the root `CLAUDE.md`: never a silent
fallback).

**Element API.** Everything exists (`session.capabilities`, the acceleration policy, the AI
provider options) except the autosave option of section 5.

---

## What changes in the round-2 documents

- `round-2/revision.md` section 1.3: the file menu's rows, groups and shortcuts are those of
  section 1 above (adds Open as a second graph..., Save project as..., Close dataset).
- `round-2/revision.md` section 6.8: Save project is specified in section 4 above; Export recipe
  in section 6.
- `round-2/revision.md` section 6.12 and `round-2/screens.md` screen 13: the Settings sheet is
  the disclosure dialog of section 8, now drawn.
- The Dataset's Overview tab gains a first row, Project (section 3).
- Screen 1's Recent row becomes the Recent list of section 5.

## Element work this cluster adds

| Need | Size | Section |
|---|---|---|
| Project document: `objects.save()`, `openProject()` with a restore report (#301) | large | 4 |
| Change counter since the last save, with an event | small | 3, 4 |
| Autosave option and `autosave.list / restore / remove` | medium | 5 |
| Recipe: `objects.recipe`, `checkRecipe`, `applyRecipe` over `session.run` | medium | 6 |
| Several datasets in a session, and combine by a match column | large (medium for combine alone) | 7 |
