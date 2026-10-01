# History, errors and recovery

This document designs six functions that the object-first design
(`design/ui/object-first-ux/round-2/revision.md`) names but never draws: undo with a visible
history, the object menu (rename, duplicate, delete, reorder), a run that fails, objects that
have gone out of date, a failure of the whole graph view, and a tool that finds nothing. Each
section gives the entry points, the states the reader sees, the rows and words, the keys, the
error cases, what graphty-element must provide, and the mock that draws it
(`design/ui/object-first-ux/mocks/v2/screen-43.png` to `screen-48.png`).

Every function lands in a home the frame already has. The frame, in one paragraph: a left panel
with the Views list above the **tree** (the ordered list of objects the reader made: Sets,
Measures, Groupings and their Groups, under the Dataset row); a canvas with a floating
**toolbar** whose armed tool shows a one-line **secondary bar** above it; a bottom **dock** with
three tabs (Table, Assistant, History) whose tab strip stays visible as a **handle** when the
dock is closed; the right panel, the **inspector**, with a fixed header block (kind, name,
**summary row**, **reading row**, tabs) above the rows of the chosen tab; and a 24 px **status
bar** whose items have a fixed priority (`revision.md` section 1.6). No new surface is added.
One existing slot gets a second use: the status bar's third item, the computing chip, also
carries short **notices** (defined below).

## Terms used here

- **Step**: one entry in the history. Every change to an object is one step: create, re-run,
  rename, move, delete, a style edit, the eye, the lock, a data edit, a layout change. Selection,
  the camera, hovering and opening panels are not steps.
- **Current position**: the step the session is at. Undo moves it one step back; redo one step
  forward. Steps after it are **undone**: kept, shown dimmed, and discarded by the next change.
- **Notice**: a short status-bar message in the computing chip's slot that says something just
  happened that the reader may not have been looking at ("Deleted Top 10 by Bridges [Undo]",
  "Bridges failed [Show]"). It stays until the next notice, a click on it, or 10 seconds. It
  never takes the slot from a run in progress; it waits behind it.
- **Linked object**: an object whose definition points at another object without being inside
  it, such as "Top 10 by Bridges" cut from Bridges (`object-model.md` section 6).
- **Frozen**: the state of a linked object whose input was deleted: members kept as a fixed
  list, a grey snowflake on the row (`revision.md` section 4).
- **Cost gate**: the element's refusal to start a run unasked above a time budget
  (`session.estimate`). **The one-second rule**: an edit or a data change re-runs an object at
  once when its estimate is under one second, and marks it stale otherwise (`revision.md`
  section 4, step 11).

---

## 1. Undo, redo and the History dock

Screen 43.

### Entry points

| Door | What it does |
|---|---|
| Ctrl+Z (Cmd+Z) | undo one step |
| Ctrl+Shift+Z, and Ctrl+Y | redo one step |
| The dock handle's History tab | opens the dock on History |
| The notice after an undo or a delete | "Undone: Found groups [Redo]", "Deleted Top 10 by Bridges [Undo]" |

In a text field Ctrl+Z undoes the typing (the browser's own undo); it reaches the history only
when focus is outside a field. There is no undo button in the chrome: Figma has none either, the
two keys are universal, and the History tab is the visible door for a reader who does not know
them.

### The dock's History tab

The dock opens at its usual height (320 to 360 px) with the handle's three tabs at the left,
then "Showing [All objects v]" (the other choices: the selected object, or one kind of change)
and a search field that matches step and object names.

Rows, 32 px each, **oldest at the top** and scrolled to the bottom on open, the order of a photo
editor's History panel. The undone steps then sit below the current one, which is where the next
change will land and replace them.

| Column | Content |
|---|---|
| Step | the kind icon (create, re-run, style, delete, rename, move, data, layout) and a plain label: "Ran Bridges", "Weights on, re-ran", "Cut the top 10", "Renamed Group 3" |
| Object | the object the step touched, by its current name |
| By | You, Assistant, or Recipe (a replayed recipe's steps are grouped under one row that expands) |
| When | the time; "now" on the current position; "undone" on the steps after it |
| (actions) | on hover: Restore to here; on a re-run step also Restore this result; a "..." with Copy as command |

The current position row carries a 2 px brand bar at its left; undone rows are at 50 percent
opacity. The last line reads "A new change discards the 2 undone steps." while any are undone,
and names the keys.

- **Hover** outlines the touched object's tree row and haloes its members on the canvas, so the
  reader can see what a step was about before moving to it.
- **Restore to here** (also a click on the row's When cell, or Enter on a focused row) moves the
  current position to that step: several undos or redos in one action, recorded as nothing
  itself.
- **Restore this result** on a re-run step brings the replaced result back as a new object
  beside the current one ("Bridges (unweighted)"), without undoing anything after it. This is
  how a reader compares before and after a parameter change.
- **Copy as command** copies the step in the session's command vocabulary (the text a recipe or
  the Assistant would send), so a step can be pasted into a recipe or a bug report.

Keys inside the dock: Up and Down move the focus between rows, Enter restores to the focused
step, Escape returns focus to the canvas.

### Rules

- Undo after a creation removes the row and cancels its run. Undo after a re-run restores the
  previous result and its paint. Undo after a delete restores the object, its layers and its
  children, and unfreezes the objects its deletion froze.
- Continuous edits to one field (dragging a slider, typing a hex value) merge into one step when
  they are less than one second apart.
- A new change while steps are undone discards them (linear undo). The discarded steps are not
  recoverable, which is why the dock's last line says so before it happens.
- Undo during a run: undoing the creation of a computing object cancels the run; undoing an
  unrelated step leaves the run going.
- **Memory.** The history keeps every step's definition, and the replaced results of the last
  50 re-runs or 200 MB, whichever is smaller. A re-run step whose result was dropped reads
  "Restore re-runs (about 4 min)" in its actions: restoring it runs the old definition again,
  under the cost gate.
- Opening another file or closing the dataset ends the history (the unsaved-changes prompt is
  the guard; it belongs to the file-menu design). Saving a project keeps the last 100 steps'
  definitions, so undo works after a reopen; replaced results are not saved.
- Undo cannot reach outside the session: an exported file is not un-exported. Export steps are
  not recorded.

### Element API

| Need | Status |
|---|---|
| `session.objects.undo()`, `redo()`, `restoreTo(stepId)` | missing; settled decision 1 in `revision.md` and #145 (the journal). Medium, on top of the objects API |
| `session.objects.history()`: `{ id, kind, label, objectIds, actor, at, undone }[]` and a `history:changed` event | missing; part of the same work. Small once the journal exists |
| `restoreResult(stepId)`: a replaced run result re-attached as a new object | missing; small (the journal already has to hold the result for undo) |
| `commandOf(stepId)`: the step in the command vocabulary (#337) | missing; tiny once the vocabulary exists |
| Merging continuous edits into one step (a transaction or a coalescing window) | missing; small |

---

## 2. The object menu: rename, duplicate, delete, reorder

Screen 44.

### Entry points

- **Right-click a tree row**, or its inspector header's "...": the same menu. Shift+F10 or the
  context-menu key opens it on the focused row.
- **Keys on a focused or selected row**: F2 renames (Ctrl+R would reload the page in a browser,
  so `object-model.md`'s Ctrl+R becomes F2); Ctrl+D duplicates; Delete deletes; Ctrl+] and Ctrl+[
  move up and down within the parent.
- **Double-click the name** in a row or in the inspector header renames in place.
- **Drag a row** reorders it within its parent.

### The menu

A dark menu (the flyout style), opening beside the row, 32 px rows, the shortcut right-aligned
in secondary text:

| Row | Kinds | Notes |
|---|---|---|
| Rename (F2) | all | disabled on a locked object, tooltip "Unlock to rename" |
| Duplicate (Ctrl+D) | Set, Measure, Grouping | the copy is named "Bridges copy", placed directly above, current (the result is copied, not recomputed) |
| Re-run | Set, Measure, Grouping | reads "Run (about 4 min)" on a waiting object, "Cancel run" on a computing one, "Re-run (about 3 s)" on a stale one |
| divider | | |
| Focus on this | Set, Group | |
| Select members | Set, Group, Grouping | |
| Show in table | all | opens the Table on this object's column or members |
| divider | | |
| Export... | all | the Export data panel scoped to this object |
| divider | | |
| Delete... (Del) | Set, Measure, Grouping | last and separated; the "..." means it may ask |

A **Group** has no Duplicate and no Delete: its menu ends with "Hide (the eye)", because the
Grouping owns its groups and a re-run would bring the group back. The **Dataset** row's menu has
Rename, Add data..., Import options..., Show in table, Export..., and "Close dataset...", which
is the file menu's Close. With several rows selected (Ctrl+click, Shift+click) the menu is
Combine, Hide all, Lock all, and "Delete 3 objects...".

### Rename

The name becomes a text field inside the row (and in the header when started there), with the
text selected. Enter or a click elsewhere commits; Escape cancels; an empty name reverts. Names
need not be unique: the object id is the key. A renamed Group keeps its name across re-runs by
overlap matching (`object-model.md`). One history step.

### Delete

- **A leaf deletes at once**, without asking, because undo is the net. The notice reads
  "Deleted Top 10 by Bridges [Undo]".
- **An object with children asks** (the one confirmation, `object-model.md` delete rules). The
  320 px confirmation names what goes with it and what gets frozen:
  "Delete 'Degree > 10' and the 2 objects inside it?", "Inside: Communities, Bridges", "1 linked
  object is frozen, not deleted: 'Hubs in Group 1' keeps its 2 members as a fixed list", "Ctrl+Z
  brings all three back", buttons [Cancel] [Delete 3 objects]. The primary button says the count
  so it cannot be pressed by habit; Enter presses it, Escape cancels.
- **An object others link to** (and no children) deletes at once; the notice says "Deleted
  Bridges; froze Top 10 by Bridges [Undo]".
- A locked object's Delete is disabled with "Unlock to delete". A computing object's delete
  cancels its run first.

### Reorder by drag

Tree order is paint order, so reordering is a styling action. Pressing on a row and moving 4 px
starts a drag; the row follows the pointer at 50 percent and a 2 px brand insertion line shows
where it will land. The canvas previews the new paint order while the pointer moves (the
element moves the layer and moves it back if the drag is cancelled). Drop commits as one step;
Escape cancels. A row can only move within its own parent: over any other parent the line is
not drawn and the pointer shows "not allowed", because moving out of a parent would change what
the object was computed on (`object-model.md` section 6.1). The Dataset row does not move.

### Element API

| Need | Status |
|---|---|
| `objects.rename`, `duplicate`, `remove`, `move(id, index)` | part of the objects API (settled decision 1), not built; each small once it exists |
| `objects.removePlan(id)`: the children that go and the linked objects that freeze, before deleting | missing; small. The confirmation and the notice read it rather than walking the tree in the app |
| A reorder preview that is not a history step until dropped | missing; small (a transaction on `session.styles.move`, the same mechanism as merging continuous edits) |

---

## 3. A failed run

Screen 45.

A run fails when it throws: the GPU device was lost, the graph is too large for the chosen
method, the input changed shape underneath it, or the element hit a bug. A cancelled run is not
a failure (`revision.md` section 4, step 7). A parameter out of range is not a failure either:
it is refused inline on its field before the run starts.

### What the reader sees

| Where | What |
|---|---|
| Tree row | a red dot after the name; no count (or the previous count, dimmed, when a re-run failed and the old result is kept) |
| Inspector summary row | "Failed at 42%: GPU device lost" |
| Inspector reading row | "Nothing was painted; the colours are still Conference's." or, for a failed re-run, "The previous result is kept and still painted." |
| First rows of the Define tab | [Retry], focused; for a GPU error a second button [Retry on the CPU (about 40 min)] with its cost; one sentence of cause with the code in brackets; "At 10:42, 42% [Copy details]"; then the settings, still editable |
| Status bar | the notice "Bridges failed [Show]" replaces the computing chip that vanished; Show selects the row |

The inspector opens on Define for a failed object, because the recovery is there: Retry, or
change a setting and Retry.

**Retry on the CPU is the visible form of the no-silent-fallback rule** (root `CLAUDE.md`,
WebGPU): the element never finishes a GPU run on the CPU by itself, so the only way a CPU result
appears is a button the reader pressed, with the cost printed on it. The object's Record tab
then reads "on the CPU (after a GPU failure)".

| Failure | Code | The buttons |
|---|---|---|
| GPU device lost | `E_DEVICE_LOST` | Retry, Retry on the CPU (cost) |
| Too large for the method or the device | `E_TOO_LARGE` | Retry sampled (cost), Change settings |
| A bug in graphty-element | `E_INTERNAL` | Retry, Copy details; the sentence says "This is a bug in graphty-element; Copy details and report it" |

In a batch ("Computing 3 of 6"), one failure does not stop the others; the chip ends as
"5 done, 1 failed [Show]".

### A refused style

The same failed state covers the element refusing to paint an object (its `style:problem`
event): the values are kept and only the paint is off. Summary row "Paint refused: <reason>",
the code, and [Reset style], which puts back the object's suggested look. Drawn as the inset on
screen 45.

### Element API

| Need | Status |
|---|---|
| The run's error, progress at failure and backend | exists: `RunRecord.error` (a `GraphtyError` with a code); `backend` on the run record is missing, small (`revision.md` section 8) |
| Re-run with the same definition | exists (`rerun`) |
| A per-start backend override (`backend: "cpu"`) and its estimate | missing, small (`revision.md` section 8) |
| `style:problem` | exists (`session.on("style:problem")`, with the run id and the error) |
| Reset an object's style to its suggested encoding | missing per object; small, on the objects API |

---

## 4. Stale objects

Screen 46.

An object is **stale** when the data, its scope or one of its parameters changed after it ran
and the one-second rule chose not to re-run it. The old members, values and paint stay on
screen, marked, until the reader re-runs. Cheap objects re-run at once and never look stale.

### What the reader sees

| Where | What |
|---|---|
| Tree row | an amber dot after the name; the name at 50 percent; the old count and chip |
| Children and linked objects | stale too, the same mark ("stale propagates down and along links, never up"): a stale Grouping's Groups, a cut taken from a stale Measure |
| Inspector summary row | "Stale: ran on 34 nodes, now 40", or "Stale: weights changed", or "Stale: its input Bridges is stale" |
| First inspector row | "Old values and paint kept [Re-run (about 3 s)]" |
| Values tab | headed "before the change"; "6 new nodes have no value until the re-run" |
| Legend | the object's block carries "stale: from 34 nodes" |
| Status bar | "3 stale [Re-run all]" when two or more objects are stale (one stale object is left to its row) |
| Dataset > Overview | the same line with the total: "3 stale [Re-run all (about 9 s)]" |

**Re-run all** runs every stale object in tree order, inputs before the objects linked to them.
It respects the cost gate: objects over it go to waiting, and the chip says "2 waiting". A
mask (Focus, a time window) never makes anything stale.

New nodes that arrived with the data are painted with the Dataset's default look until the
objects that would paint them re-run, so the reader can see which nodes are new.

### Element API

| Need | Status |
|---|---|
| Why a run is stale, with before and after counts | exists: `StaleNote { ranOn, nowVisible, scopeSpec }` on the run record |
| Staleness for a parameter edit, and through a link | missing: a parameter change starting a new run under the same object id is in `revision.md` section 8; propagation along links is part of the objects API. Small each |
| An estimate for "Re-run all" | exists per run (`session.estimate`); the total is a sum over them, done by the objects API, not the app |

---

## 5. Failures of the whole graph view

Screen 47.

Some failures are not any one object's: the browser takes back the graphics context, the
session is disposed, a background image fails to load. `revision.md` section 1.6 and
`coverage.md` section 13 left them without a surface.

### Graphics context lost (fatal for the picture, not for the data)

The browser can reclaim a page's WebGL context at any time: after a driver reset, when the
computer wakes, or when too many tabs draw. The session still holds the data, the runs, the
layers and the positions; only the picture is gone.

- The canvas is blank and greyed. A card in its middle says: "The graphics context was lost.
  Your data and objects are kept. ... The tree, the inspector and the table still work."
- Buttons: **Reload view** (primary; rebuilds the renderer from the session, with the same
  tree, positions and camera) and **Copy diagnostics**. A **Details** disclosure shows the code,
  the time and how many times this session lost it, the renderer, and the versions.
- The status bar's error slot (the computing chip's slot) reads "View lost [Reload view]".
- The toolbar is greyed with the canvas, because its tools pick on the canvas; Re-run from the
  tree, the inspector, the table and export of data keep working.
- When the browser restores the context on its own, the element reloads the view without being
  asked and the notice reads "View restored".
- If Reload view fails twice, the card changes to "The graphics card is not available to this
  page" with Reload the page (the session is saved to the autosave first; autosave belongs to
  the file-menu design).

### Session disposed

A disposed session (`E_DISPOSED`) cannot recover. The same card on the canvas reads "This graph
session was closed and cannot be used" with Reopen from autosave and Copy diagnostics, and the
tree and inspector grey out, because nothing behind them answers.

### Non-fatal element errors

An error that leaves the graph working (a background image, a font, a headset that refused a
session) is only a status-bar chip in the error slot: "Error: background image failed
[Details]", red text. Details opens a 240 px popover above the chip: the message, the code, the
time, what still works, the versions, [Copy diagnostics] and [Dismiss]. Several at once read "2
errors [Details]", and the popover lists them newest first. Settings > Advanced keeps the full
log. Drawn as the inset on screen 47.

### Element API

| Need | Status |
|---|---|
| The element's `error` DOM event | exists |
| A code for a context lost after creation, and `view:lost` / `view:restored` events | missing: `E_NO_WEBGL` covers only a context that could not be created. Small: listen to the canvas's `webglcontextlost` and `webglcontextrestored` and Babylon's context-lost observable |
| `element.reloadView()`: rebuild the renderer from the live session | missing; medium (the session already holds everything; the renderer must be re-bindable) |
| `element.diagnostics()`: versions, renderer, adapter, recent errors, as one copyable object | missing; small |

---

## 6. Empty results: a tool that finds nothing

Screen 48.

A tool that finds nothing must say so where the reader is looking (the secondary bar), say why
when the element knows, offer the one change that would widen the search, add nothing to the
tree, and **stay armed** so the next pick can follow.

| Tool | The bar reads | The way out |
|---|---|---|
| Path, under Focus | "No route from 15 to 16 among what is showing, 12 nodes" | [Search everything] runs the same route on the whole graph; its Set's summary then says "leaves the focus" |
| Path, whole graph | "No route from 12 to 40: they are in different parts" | [Show both parts] creates nothing and focuses the two parts; Cancel |
| Path, directed | "No route from 12 to 40 following direction" | [Ignore direction] |
| Filter | "Matches 0 nodes: the highest Connections is 17" | Select, Create and Create and focus are disabled with that sentence as their tooltip; the Options popover stays open to change the rule |
| Pattern | "No matches for this pattern" | the same as Filter |
| Neighbours | "Node 12 has no neighbours in that direction" | [All directions]; Create disabled |
| Find (Ctrl+F) | "No object or node matches 'bridgs'" | a close match when one exists ("Did you mean Bridges?") |

If a run (not a tool bar) produces an empty Set, for example "Top 10 by Bridges" over an empty
scope, the object is created, current, with "0 nodes" and a reading "Nothing in its scope
matches"; it is not an error.

### Element API

| Need | Status |
|---|---|
| A live match count before creating | exists (`session.plan`, the Filter bar's dry run) |
| The attribute's range for "the highest is 17" | exists (column statistics) |
| A path result that says why there is no route: different parts, direction, or the mask | missing; small (a `reason` on an empty path result: `disconnected`, `direction`, `outside-scope`) |
| Neighbours of a node with ids | missing, small (`session.data.neighbours`, already in `revision.md` section 8) |

---

## Element work, in one list

| Item | Size | Used by |
|---|---|---|
| History, undo, redo, restore-to, history event (the journal, #145) | medium, after the objects API | 1 |
| Restore a replaced result as a new object; command text for a step | small; tiny | 1 |
| Coalescing transactions (merged edits, drag preview) | small | 1, 2 |
| `objects.removePlan(id)` | small | 2 |
| Per-object style reset | small | 3 |
| `backend` on runs and a per-start backend override | small (already listed in `revision.md` section 8) | 3 |
| Stale through parameter edits and along links | small | 4 |
| A context-lost code, `view:lost` / `view:restored`, `reloadView()` | small; medium | 5 |
| `element.diagnostics()` | small | 5 |
| A `reason` on an empty path result | small | 6 |

None of these asks the app to compute over the graph: every word on these screens is read from
the session.

## What the mocks draw

All of these are now drawn: the screen generator was extended once for every cluster (dark menus anchored to any control, insets for a second moment, text fields, radios, charts, the History and Assistant docks, coloured status chips, canvas marks, a split canvas, Present mode). A dark tag above a card or a menu marks a second moment on the same screen. The generator's spec keys are listed in `design/ui/object-first-ux/gen/README.md`, "Round 3 additions".

Screen 43 draws the History dock with the current step's brand bar and the undone steps faded; 44 the dark row menu beside its row and the 320 px confirmation with a red button; rename in place and the drag insertion line are screen 102; 45 and 48 put their second example in an inset; 47 draws the fatal case and, in an inset, the non-fatal error chip and its Details; 46 draws the six new nodes in grey.
