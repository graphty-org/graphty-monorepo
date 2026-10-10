# VR control surfaces for graphty: how close a headset can get to the desktop app

Status: research report, 2026-10-09. Options and estimates, not a design. Nothing here has been
built or tried in a headset.

graphty is a graph (network) visualization and analysis product: the graphty app, a React web UI,
around graphty-element, a web component that draws 2D and 3D node-link graphs with Babylon.js and
already opens WebXR VR and AR sessions. In the headset today a person can enter and leave VR or
AR, move, scale and rotate the graph, and pick and drag a node; there are no in-headset panels,
menus, text, search, inspector, legend, notes or undo.

This report asks how close a headset-only experience (VR, AR or passthrough; no desktop or monitor
variants) can get to the desktop app, and with which control surfaces: how a person explores,
selects (including by rule), runs and reads analyses, styles, filters, writes and edits notes,
undoes, saves and reopens, while moving freely between holding the graph, standing outside it and
being inside it.

The full catalog of control paradigms behind this report is `vr-control-surface-catalog.md` in
this folder.

---

## 1. Summary

**How close.** Closer than expected on commands and pointing, not there on text and files. The
desktop app has 109 functions that a headset version must match: 45 "core" ones needed in nearly
every session (reading a ranking, adding a filter step) and 64 "important" ones used in most
sessions (reordering style layers, shortest path). The best no-AI models built here do 34 to 37
of the 45 core functions as fast and as reliably as the desktop (the AI model does 39), and all
but three of the rest in a workable way. Across all 109, the best no-AI models reach 55 to 62 "as
fast as the desktop" and almost everything else workable. On a simple score (full credit for as
fast, half for workable) the leading models score 72 to 76 of 100 overall and 84 to 91 on the
core.

No model reaches parity. Two core functions stay awkward in every model, AI included: opening a
file from the laptop's disk, and exporting a picture that ends up where the slide deck is. A third,
editing a note, is awkward in every model unless you bring a paired keyboard or use the AI model.
Three more never get past workable in any model: finding a node by typed name, picking many nodes
one by one in a graph of 400 or more, and adding a note. And every "as fast as the desktop" rating
for reading tables and rankings is provisional: every timed study of graphs in headsets found
lookups slower than on a monitor.

**The best models.** Six models were built; five work with no AI at all.

- **The Concierge** (no AI) puts the desktop app's structure into a few panels that place
  themselves around the graph. It is the parity floor: 62 of 109 as fast as the desktop, the
  best reading surfaces, nothing new to learn, and one panel description rendered on desktop and
  headset alike.
- **Cards on the Volume** (no AI) keeps the graph in a bounding volume whose rim carries undo,
  filter steps and the style layers that double as the legend; every object opens its own card.
  It is pinch-only, so it is the most portable (hands, controllers, Vision Pro) and the calmest on
  a real desk: 55 of 109, and 35 of the 45 core functions as fast as the desktop.
- **One Line and the Log** (no AI) contributes the study's single best idea, a log slab where
  every action, including hand actions, is written as a line you can undo to, edit as a new step
  or copy as a recipe. Every model now has the log as a page.
- **Point and Ask** (AI) lets you speak while pointing and compiles the request only into
  graphty-element's own undoable commands, shown as editable slot tiles and a ghost preview
  before anything changes. It has the highest core figure (39 of 45) but rests on a network, a
  provider, a room where speaking is fine, and data allowed to leave the device.

The Living Workshop (controls on the data and in tools) and The Room (real table and real walls in
passthrough) score lower on parity but carry the boldest ideas: rules pulled off a real example,
a threshold set by raising a plane through real nodes, layer order changed at the node, and
fingertip work on real wood with monitor-sized reading on real walls.

No model is ranked. What separates them is not the totals but reading (the Concierge and the Room
win), the log (One Line and the Log), and long-session comfort, which nobody has measured.

**The hard problems.** Text (notes, names, search), files in and out of the headset, pointing at
real graph sizes, reading speed against a monitor, and session length: a week-long study of real
work in VR found it rated worse than a desktop on most measures, so every model aims at 20 to 40
minute focused sessions with "resume on the laptop at exactly this step" as the normal exit.

**The recommended spikes.** Eight throwaway Babylon.js sandboxes, 3 to 5 days each, all but one
with no AI: the platform floor (keyboard, file picker, microgestures, panel frame time, pointing
at 5,000 nodes), Cards on the Volume on a real desk, stance switching with a miniature, the Living
Workshop's rules from examples and the look stack (bold), the log slab with predictive tiles, the
Room's fingertip-on-table and wall reading (bold), writing notes four ways, and Point and Ask as a
Wizard-of-Oz test with a human standing in for the AI (bold). The platform floor goes first: its
answers change several cells in every model.

**Where the work would land.** Under this repository's rules, everything a third-party consumer
would also need belongs in graphty-element, not the app: an XR surface host (mount panels, route
ray, pinch and poke, anchor to node, hand, body or real plane), one declarative panel description
that both the React shell and the XR host render, an in-page project store, a selection cue no
style layer can override, view history separate from undo, a second synchronized render for the
miniature, and the stance contract. The app supplies the panel content and the words.

---

## 2. Method and limits

The study first listed every user-facing function of the desktop app (155 in all; 109 core or
important) from the app's source, its UI framework, its personas and workflows, its usability-study
tasks and graphty-element's undoable session commands, and gave each the kind of control it needs
(pointing, a long list, text, a number, a form, ordering, reading, prose, a file, a confirmation or
a bare command). Four surveys covered how control works in shipped VR tools: 3D creation tools;
engineering, science and medical tools; work, data and office tools; and games and spatial
platforms. Eight design passes, each from a different starting stance, proposed 132 control
paradigms, merged to the 102 in the catalog. A separate pass designed the switching between
holding, standing outside and being inside. Ten candidate models were composed from the paradigms
and walked through the same scripted tasks, then went through two rounds of adversarial review
by six simulated reviewers (a VR interaction designer, an ergonomics and accessibility reviewer, a
daily graphty analyst, a WebXR and Babylon.js engineer, a parity auditor and a literature
reviewer): 93, then 52 major objections. Models were merged, retired or redesigned in response,
leaving six. Each core function was rated row by row from what the model's walkthrough actually
performs; the important functions in the matrix below were rated in this write-up from the earlier
per-function ratings with the reviewed fixes applied, reconciled to each model's reviewed totals.

Limits:

- **The reviewers were simulated.** No real analyst, designer or engineer has reviewed these
  models.
- **Nothing has been tried in a headset.** Every rating is a designer's estimate under one rubric.
  People prefer headsets whether or not they help (Greffard 2011; Kotlarek 2020), so each model's
  top claims must be timed against the desktop before they count.
- **Platform facts were checked against documentation, not devices.** Several (system keyboard
  behavior, what a file picker does to a session, microgesture reliability, a local speech
  recognizer's cost on a Quest) are spike items.
- **The parity target is the desktop app as it is**, including 30 functions designed but not
  built. It does not credit things a headset can do that a desktop cannot.
- **The study defines "no AI" as**: no language model, nothing sent off the device, and every
  output drawn from a fixed list. A local acoustic model meeting those three tests counts as an
  input device. If the owner rules otherwise, only one provisional figure (One Line and the Log
  with a recognizer) changes.

---

## 3. The parity matrix

### How to read it

Each cell rates how the model does that desktop function in a headset:

| Code               | Meaning                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **N** natural      | As fast and as reliable as the desktop, on the model's own surfaces                                    |
| **W** workable     | Works, but with noticeably more acts, a fallback surface, or a pick from candidates                    |
| **A** awkward      | Leaves the model's own surfaces (the system file picker, a form on a fallback slate) or is error-prone |
| **X** not possible | Absent from the model (the no-AI models have no assistant by design)                                   |

Rating assumptions: a Meta Quest 3 or 3S in Quest Browser, hands or controllers; no paired keyboard;
speech only through an in-page recognizer limited to the project's own words. A core cell is N
only if the model's walkthrough performs it, or its surface list names the exact control, at the
desktop's number of acts. A reading cell is N only on a flat panel at reading distance that shows a
desktop panel's worth (25 rows, or a full profile) without paging; reads on the graph itself are W.
Every N reading cell is provisional until timed within 1.5 times the desktop.

Columns:

- **Conc**: 1. The Concierge (no AI), standing. At a desk, three more core cells are N (select by
  rule, run options, filter step by rule).
- **Wksp**: 2. The Living Workshop (no AI).
- **Cards**: 3. Cards on the Volume (no AI), on Quest. On Vision Pro (VR only) about
  54 / 43 / 10 / 2, core 34 / 5 / 6: hover becomes a pinch-hold and every typed cell is A,
  because no in-session keyboard exists there.
- **Line**: 4. One Line and the Log (no AI), with predictive tiles only: the shipping default,
  nothing spoken.
- **Line+v**: the same model with its in-page recognizer limited to the project's own words.
  Provisional until its accuracy on real names and its cost to the frame rate are measured.
- **Room**: 5. The Room (no AI), with a usable table and wall. Without them (the "cockpit arc"
  fallback) about 47 / 56 / 4 / 2.
- **P&A**: 6. Point and Ask (AI), with a provider configured. Each cell is the better of its hand
  path (Cards on the Volume) and its AI path; without a provider it is Cards on the Volume plus
  local bare verbs.

Pri: **C** core (needed in nearly every session), **I** important (most sessions, or needed to
finish a core task well).

Parity score: (N + half of W) divided by the number of functions, as a percentage. A and X count
zero. It is a convenience for comparing columns, not a measurement.

With a paired keyboard, every no-AI model gains N on find by name and save under a name, and edit a
note moves from A to W.

### The matrix

| Function                                           | Pri | Conc            | Wksp             | Cards           | Line            | Line+v          | Room            | P&A             |
| -------------------------------------------------- | --- | --------------- | ---------------- | --------------- | --------------- | --------------- | --------------- | --------------- |
| **Data and files**                                 |     |                 |                  |                 |                 |                 |                 |                 |
| Open a sample dataset                              | C   | N               | N                | N               | N               | N               | N               | N               |
| Open a file from disk                              | C   | A               | A                | A               | A               | A               | A               | A               |
| Reopen a recent file                               | C   | N               | N                | N               | N               | N               | N               | N               |
| Check the load                                     | C   | N               | N                | N               | N               | N               | N               | N               |
| Read a failed load                                 | I   | W               | W                | W               | W               | W               | N               | W               |
| Map table columns on load                          | I   | W               | W                | W               | W               | W               | N               | W               |
| New project, new from data                         | I   | W               | W                | W               | W               | W               | W               | W               |
| Close the project                                  | I   | N               | N                | N               | W               | N               | N               | N               |
| **Explore and navigate**                           |     |                 |                  |                 |                 |                 |                 |                 |
| Orbit, pan, zoom                                   | C   | N               | N                | N               | N               | N               | N               | N               |
| Fit, frame the selection                           | C   | N               | N                | N               | N               | N               | N               | N               |
| Enter VR or AR                                     | C   | N               | N                | N               | N               | N               | N               | N               |
| Hover for name and values                          | C   | N               | N                | N               | N               | N               | N               | N               |
| Find by name                                       | C   | W               | W                | W               | W               | W               | W               | W               |
| Inspect a node                                     | C   | N               | W                | N               | N               | N               | N               | N               |
| Inspect an edge                                    | C   | N               | N                | N               | N               | N               | N               | N               |
| Go to a neighbor                                   | C   | N               | N                | N               | N               | N               | N               | N               |
| Expand k hops                                      | C   | N               | N                | N               | N               | N               | N               | N               |
| Characterize the graph                             | C   | N               | W                | N               | N               | N               | N               | N               |
| Read the legend                                    | C   | N               | N                | N               | N               | N               | N               | N               |
| Camera presets, reset view                         | I   | W               | W                | W               | W               | N               | W               | W               |
| Switch 2D and 3D                                   | I   | N               | N                | W               | W               | N               | W               | W               |
| Read and sort the data table                       | I   | W               | A                | A               | W               | W               | N               | A               |
| Read the status bar                                | I   | N               | W                | N               | N               | N               | N               | N               |
| Next and previous finding                          | I   | N               | N                | N               | N               | N               | N               | N               |
| Compare two selected elements                      | I   | W               | N                | N               | W               | W               | W               | N               |
| **Select and sets**                                |     |                 |                  |                 |                 |                 |                 |                 |
| Select one                                         | C   | N               | N                | N               | N               | N               | N               | N               |
| Multi-select                                       | C   | W               | W                | W               | W               | W               | W               | W               |
| Select neighbors                                   | C   | N               | N                | N               | N               | N               | N               | N               |
| Select by rule                                     | C   | W               | W                | W               | W               | N               | W               | N               |
| Select from a result (threshold, top N)            | C   | N               | N                | N               | W               | N               | N               | N               |
| Select a region (marquee)                          | I   | W               | N                | W               | W               | W               | W               | A               |
| Select all, none, invert                           | I   | N               | W                | W               | W               | N               | W               | W               |
| Text search with modes (exact, regex, attribute)   | I   | W               | A                | W               | W               | W               | A               | W               |
| Select same value as this                          | I   | N               | N                | N               | W               | W               | W               | N               |
| Select from a histogram band or legend entry       | I   | N               | W                | N               | W               | W               | N               | N               |
| Select members of a set, group or path             | I   | N               | N                | N               | W               | W               | W               | N               |
| Previous selection                                 | I   | W               | W                | W               | W               | N               | W               | W               |
| Selection statistics                               | I   | N               | W                | N               | W               | W               | N               | N               |
| Remove selected, counts confirmed                  | I   | W               | N                | W               | W               | W               | W               | W               |
| Keep the selection as a named set                  | I   | W               | W                | W               | W               | W               | W               | W               |
| Rule set that follows the data; freeze it          | I   | W               | W                | W               | W               | W               | W               | W               |
| Combine sets                                       | I   | W               | N                | W               | W               | N               | W               | W               |
| Add to or take out of a set                        | I   | W               | N                | W               | W               | W               | W               | W               |
| Rename, duplicate, delete a set                    | I   | W               | W                | W               | W               | W               | W               | W               |
| Shortest path                                      | I   | N               | N                | N               | W               | N               | W               | N               |
| **Analyze**                                        |     |                 |                  |                 |                 |                 |                 |                 |
| Algorithm catalog                                  | C   | N               | W                | N               | W               | W               | W               | N               |
| Set run options                                    | C   | W               | A                | N               | W               | N               | W               | N               |
| Run, progress, cancel                              | C   | N               | N                | N               | N               | N               | N               | N               |
| Read a ranking                                     | C   | N               | W                | N               | N               | N               | N               | N               |
| Read a community result                            | C   | N               | W                | N               | N               | N               | N               | N               |
| Suggested analyses                                 | I   | N               | W                | W               | W               | W               | W               | W               |
| Cost and preconditions before a run                | I   | N               | W                | W               | W               | W               | W               | W               |
| Graph-level statistics                             | I   | N               | W                | W               | W               | W               | N               | W               |
| Read a histogram; act on a band                    | I   | N               | N                | N               | W               | W               | N               | N               |
| How a result was produced                          | I   | N               | W                | W               | N               | N               | W               | W               |
| Every result: reopen, remove                       | I   | N               | W                | W               | N               | N               | N               | W               |
| Change parameters and re-run                       | I   | W               | A                | W               | W               | W               | W               | N               |
| Paint a result                                     | I   | N               | N                | W               | W               | W               | W               | W               |
| Export a result's values or groups                 | I   | W               | W                | W               | W               | W               | W               | W               |
| Compare two results                                | I   | W               | W                | W               | W               | W               | N               | W               |
| **Style**                                          |     |                 |                  |                 |                 |                 |                 |                 |
| Color by attribute                                 | C   | N               | W                | N               | N               | N               | W               | N               |
| Size by attribute                                  | C   | N               | W                | N               | N               | N               | W               | N               |
| Label by attribute                                 | C   | N               | W                | N               | N               | N               | W               | N               |
| Show or hide the legend                            | C   | N               | N                | N               | W               | N               | N               | N               |
| Edge width by attribute                            | I   | N               | W                | W               | W               | N               | W               | W               |
| How an attribute is read                           | I   | W               | W                | W               | W               | W               | W               | W               |
| Fixed layer properties (shape, opacity, arrows...) | I   | W               | A                | W               | W               | W               | W               | N               |
| Add a layer and choose what it paints              | I   | W               | N                | W               | W               | W               | W               | W               |
| Reorder style layers                               | I   | W               | N                | N               | W               | W               | N               | N               |
| Hide, rename, delete a layer                       | I   | W               | W                | W               | W               | W               | W               | W               |
| Style the selection directly                       | I   | N               | N                | W               | W               | W               | W               | W               |
| Why this look                                      | I   | W               | N                | N               | W               | W               | W               | N               |
| Fade others, hide others                           | I   | N               | W                | N               | W               | N               | W               | N               |
| Reset styles                                       | I   | W               | W                | W               | W               | W               | W               | W               |
| **Layout**                                         |     |                 |                  |                 |                 |                 |                 |                 |
| Choose a layout                                    | C   | N               | W                | N               | N               | N               | N               | N               |
| Re-run the layout                                  | C   | N               | N                | N               | W               | N               | N               | N               |
| Layout options                                     | I   | W               | A                | W               | W               | W               | W               | W               |
| Stop a running layout                              | I   | N               | N                | N               | W               | N               | W               | N               |
| Move, pin, unpin nodes                             | I   | N               | N                | N               | N               | N               | N               | N               |
| Lay out only a set or group                        | I   | W               | N                | W               | W               | W               | W               | W               |
| **Filters**                                        |     |                 |                  |                 |                 |                 |                 |                 |
| Filter step by rule                                | C   | W               | W                | W               | W               | N               | W               | N               |
| Filter to the selection                            | C   | N               | N                | N               | W               | N               | N               | N               |
| Filter to a result above a threshold               | C   | N               | N                | N               | W               | N               | N               | N               |
| Filter to k-hop neighbors                          | C   | N               | N                | N               | W               | N               | N               | N               |
| Read what is left                                  | C   | N               | N                | N               | N               | N               | N               | N               |
| Remove a step; clear all                           | I   | N               | N                | N               | N               | N               | N               | N               |
| Edit a step's rule                                 | I   | W               | A                | W               | W               | W               | W               | W               |
| Turn a step off and on                             | I   | N               | N                | N               | N               | N               | N               | N               |
| Reorder filter steps                               | I   | W               | W                | N               | W               | W               | N               | N               |
| Filter from a histogram band or legend entry       | I   | N               | W                | N               | W               | W               | N               | N               |
| Hide on canvas without changing numbers            | I   | N               | W                | N               | W               | N               | W               | N               |
| **Notes**                                          |     |                 |                  |                 |                 |                 |                 |                 |
| Add a note                                         | C   | W               | W                | W               | W               | W               | W               | W               |
| Edit a note                                        | C   | A               | A                | A               | A               | A               | A               | W               |
| Read the notes list, jump to one                   | C   | N               | W                | N               | N               | N               | N               | N               |
| Show or hide note markers                          | I   | N               | W                | W               | W               | W               | W               | W               |
| **Undo and history**                               |     |                 |                  |                 |                 |                 |                 |                 |
| Undo and redo, with step names                     | C   | N               | N                | N               | N               | N               | N               | N               |
| Jump back several steps                            | I   | N               | W                | W               | N               | N               | N               | W               |
| **Save, reopen, export**                           |     |                 |                  |                 |                 |                 |                 |                 |
| Resume where you left off                          | C   | N               | N                | N               | N               | N               | N               | N               |
| Save under a name                                  | C   | W               | W                | W               | W               | W               | W               | N               |
| Reopen a saved project                             | C   | N               | N                | N               | N               | N               | N               | N               |
| Export a picture                                   | C   | A               | A                | A               | A               | A               | A               | A               |
| Rename the project                                 | I   | W               | W                | W               | W               | W               | W               | W               |
| Export data in a writable format                   | I   | W               | A                | W               | W               | W               | W               | W               |
| Export the selection                               | I   | W               | W                | W               | W               | W               | W               | W               |
| Download the project file                          | I   | W               | W                | W               | W               | W               | W               | W               |
| **Settings and help**                              |     |                 |                  |                 |                 |                 |                 |                 |
| Command palette                                    | C   | W               | W                | W               | W               | N               | W               | N               |
| Usage data choice                                  | I   | W               | W                | W               | W               | W               | W               | W               |
| **AI assistant (optional in the app)**             |     |                 |                  |                 |                 |                 |                 |                 |
| Ask the assistant in words                         | I   | X               | X                | X               | X               | X               | X               | W               |
| Read the answer; show what it refers to            | I   | X               | X                | X               | X               | X               | X               | W               |
| **All 109: N / W / A / X**                         |     | 62 / 42 / 3 / 2 | 46 / 50 / 11 / 2 | 55 / 48 / 4 / 2 | 35 / 69 / 3 / 2 | 56 / 48 / 3 / 2 | 49 / 54 / 4 / 2 | 61 / 44 / 4 / 0 |
| **Core 45: N / W / A / X**                         |     | 34 / 8 / 3 / 0  | 24 / 17 / 4 / 0  | 35 / 7 / 3 / 0  | 27 / 15 / 3 / 0 | 37 / 5 / 3 / 0  | 30 / 12 / 3 / 0 | 39 / 4 / 2 / 0  |
| **Parity score, all**                              |     | 76              | 65               | 72              | 64              | 73              | 70              | 76              |
| **Parity score, core**                             |     | 84              | 72               | 86              | 77              | 88              | 80              | 91              |

### What the matrix says

- **Commands and pointing carry over.** Undo with step names, run with progress and cancel,
  expand k hops, select neighbors, fit, resume and reopen are N in every model. Most of the app's
  functions are bare commands or a point at something, and those are cheap in a headset once the
  verbs can be found without a menu bar.
- **Three core functions are awkward everywhere**: opening a file from disk, exporting a picture,
  and (without a keyboard or AI) editing a note.
- **Three are workable but never natural**: find by name (a pick among candidates), multi-select
  at real sizes (nodes under 1 degree wide at 2 m), and add a note.
- **Rules and filter steps are the dividing line.** Select by rule and filter step by rule are W
  in every hand model and N only where a sentence replaces the form (One Line with a recognizer,
  Point and Ask) or at a desk (the Concierge).
- **Reading favors flat panels.** The Living Workshop, which reads results on the graph itself,
  loses inspect, characterize, ranking and community reads to W; the Concierge, Cards and the Room
  keep them N on panels and walls, provisionally.
- **AI helps most where a form would otherwise be needed**: rules, compound requests, fixed layer
  properties, revising parameters, the command palette. It does not help single bare commands,
  where a 1 to 3 second round trip plus a preview is slower than a pinch.

---

## 4. The models

### The scripted tasks

Every model walks the same twelve tasks. Tasks 1 to 8 run on Les Miserables (77 characters, edges
weighted by how often two characters appear together) or on "Acme", a made-up company message
network of 412 people with a department attribute, used to test pointing at a realistic size.
Tasks 9 to 12 run on College football (115 teams, 613 games) in every model.

1. **Explore and select by rule.** Find a person by name, expand to the neighbors, go inside,
   select the person's strong ties (edge weight at least 4, within the current selection).
2. **Analyze.** Run PageRank; read the top of the ranking; inspect one person's value and rank.
3. **Style.** Paint the selection orange; color by group (or department); size by PageRank; move
   the orange layer above the group layer.
4. **Filter.** Keep nodes of degree at least 3; then change it to 5.
5. **Notes.** Add a note to the person; change one word ("convict" to "former convict").
6. **Undo.** Go back three steps, or undo only the filter change and keep the note.
7. **Save and reopen.** Save under a new name, close, reopen.
8. **Data preparation.** Open people.csv and messages.csv, join them on sender equals name, fix
   near-miss names.
9. **Load and characterize.** Open College football, check the load, read the graph's profile
   with nothing selected.
10. **Communities.** Run Louvain; read the number of groups, their sizes, modularity, members and
    the edges between groups.
11. **Labels, legend, layout.** Label by name; hide and show the legend; switch the layout to
    circle and re-run it.
12. **Three filters and a note.** Filter to one group; then to the top 10 by PageRank; then to
    the 2-hop neighborhood of the top team; open the notes list and jump to a note.

### Shared by every model

These fixes, forced by the reviews, hold in all six models:

- **Pointing at real sizes.** The ray snaps to the nearest element in a cone of about 2 degrees,
  shows the target before the pinch, and opens a fan when several are in the cone. Menus open
  beside the hand on a leader line. A declutter lens shows the nearest few dozen nodes in full and
  the rest as dust. Hover is a dwell or pinch-hold label, never a 3D highlight. An off-hand pinch
  held while selecting means "add". Touching nodes to select them is offered only on graphs of
  about 120 nodes or fewer. The filter plane (a plane swept through the graph by a metric's value)
  is a named selection aid, because it was the one technique whose time stayed flat as graphs grew.
- **Selection** is drawn with a reserved outline cue that no style layer can override, never by
  color alone.
- **Text.** The Quest system keyboard replaces a field's whole value on each opening, has no
  caret and no key events, and blurs the session while it is up. So notes are edited by sentence:
  each sentence is a tile at least 3 degrees tall; tapping one opens the keyboard on that sentence
  only; an append field adds a sentence. A paired keyboard is first-class in every model.
- **Speech**, where used, is a recognizer the page ships itself (Quest Browser has none), matched
  only against a closed list of command words, attribute names and node labels, and is never the
  only or the leading path.
- **Files.** Save, save as, resume and the recent list live in an in-page project store, so they
  never touch the file system. Opening an arbitrary file goes through the headset's system picker.
- **Body.** Text 1.2 to 1.8 degrees tall with a global text-scale and high-contrast setting.
  Anything read for more than a few seconds sits between eye level and 15 degrees below it, 1.0 to
  1.5 m away, within about 30 degrees of forward. Arms rest by default (rays from a hand near the
  hip, anything held can be set down). Over passthrough, colored panels and the graph sit on an
  opaque neutral backing plate.
- **Numbers and rules.** Every slider has quantile detents, a tap-to-type field and an always
  visible exact value, and floats in front of the hand that called it. Every rule object combines
  conditions with and / or / not and has a value drawer listing every value with its count.
- **Undo** is one tap with the step name. "Undo just this" is made as a new compensating step,
  because graphty-element's undo is a linear stack. Off-hand thumb microgestures (exposed to WebXR
  from Quest Browser 38.1) are undo, redo, next finding and previous finding, gated on a still,
  non-pinching hand, each showing its step name.
- **Every model has the log** (each action as a line; undo to a line; edit a line as a new step;
  copy lines as a recipe) and a recent-projects shelf.
- **Option layers any model can switch on:** "Wordless" encodings (specimen rods, pitch by
  percentile with a visible tick, fill dials) and the "worn" kit (a palette held in the off hand as
  a quick pick, a watch with one live fact and a Cancel, chest holsters for tools).

---

### Model 1. The Concierge (no AI)

**Concept.** The desktop app's structure (section rail, inspector, tables, forms) as a small fixed
set of panels that place themselves by stance, change density with distance and draw leader lines
to the graph. It is the parity floor. Every panel is written once, as a declarative panel
description that the desktop React shell and graphty-element's XR host both render. It wears the
"worn" layer by default: the navigator can be held in the off hand as a quick pick, verbs open in a
halo beside the hand, and a watch on the off wrist shows the live fact and Cancel.

**AI.** None.

**Surfaces.**

- Navigator leaf on the left: the section rail as six faces (Find and Select, Analyze, Style,
  Filter, Sets and Notes, Project) plus a letter strip that narrows any list. Reader leaf on the
  right: inspector, results, legend and the log page. Both 1.0 to 1.5 m away, 10 to 15 degrees
  below eye level.
- An ornament strip on the graph's base: undo and redo with step names, fit, the stance chip, the
  layout chip (method, run, stop), counts, filter chips, legend rows with shape glyphs, a legend
  toggle.
- A table wall up to 60 to 70 degrees wide, paged by 15 rows and by column groups, with a frozen
  key column; dwelling on a row redraws its leader line and outlines the node.
- A desk slate for forms on a real desk in passthrough; without a desk, a lectern tilted toward
  you.
- A halo of up to 8 verbs per element beside the hand; rule rows with the shared slider and value
  drawer; note sentence tiles; the recent shelf.

**Mode switching.** The stance chip on the strip and the watch bezel, plus two-hand scaling with
detents. Hold: the graph rests on its base between the leaves, which fold like a book stand; you
grip to lift and turn it. Outside: the graph on a plinth; the leaves hinge beside you and follow
your heading only after a one-second pause. Inside: the leaves come to a front arc 1.0 to 1.2 m
away, 25 degrees below eye level, with a miniature above them; glancing up dims the leaves.

**Walkthrough** (tasks 1 to 8 on Les Miserables).

1. On the Find face you slide a finger along the letter strip to "VAL", tap Valjean, tap Expand 1
   hop, then Inside; a miniature of the whole graph appears in front of you. On a rule row you set
   [Edges] [weight] [at least] [4] scoped to the selection, tapping the 4 in or stepping it on a
   floating value bar. The row's live count reads 23; you tap Select.
2. On the Analyze face you open the PageRank card (options and a cost light) and tap Run; Cancel
   sits on your watch and on the strip. The Reader shows the top 25. You dwell on Javert to read
   his value, rank and how the result was computed.
3. On the Style face you paint the selection orange, choose Color by group and Size by PageRank,
   then drag the orange row above the group row.
4. On the Filter face you set Degree at least 3; the chip reads 52 of 77. You tap the chip and step
   it to 5: 34 of 77.
5. You add a note on Valjean; the keyboard opens on the append field. To change "convict" you tap
   that sentence, and the keyboard opens on that sentence alone.
6. You swipe your off-hand thumb back three times, reading each step name. Or on the log page you
   choose Go back to "Edited filter". Or you re-edit the filter chip, which adds a new step and
   keeps the note.
7. Save as: you type the name, Save, Close, then tap the project on the recent shelf.
8. Open file brings up the system picker. On the desk slate, a join bar between two preview grids
   reads 2,341 of 2,400 matched; "ignore case and spaces" raises it to 2,396.
9. From the recent shelf you open College football. The Reader shows 115 nodes, 613 edges, nothing
   dropped; with nothing selected its Graph page shows size, density, components, the degree
   histogram and every attribute's profile (conference: 12 values).
10. On Analyze you type "LOU", pick Louvain, Run. The Reader shows the groups table (about 10
    groups, their sizes, modularity about 0.6); the between-groups edge matrix opens on the table
    wall; tapping a row outlines its members.
11. On Style you choose Label by name. You tap the legend toggle twice. On the layout chip you pick
    circle and tap run.
12. You tap the largest group's row, Select, then Filter to selection on the strip. You run
    PageRank and choose "top 10", Filter. On the top team's halo you choose Neighbors, 2 hops,
    Filter, then Fit. The Notes face lists your notes; you tap one to fly to its subject.

At 5,000 nodes the declutter lens, rule rows and the table wall carry selection, and the Reader
carries reading.

**Parity.** 62 N / 42 W / 3 A / 2 X standing; score 76. Core 34 / 8 / 3, score 84; 37 core N at a
desk.

**What is unique.** No new vocabulary. The best reading surfaces short of a furnished room. One
panel description renders on both desktop and headset, so nothing is maintained twice. Any other
model can send a subject here ("open on the desk", "open as wall").

**Strengths.** Learnable on day one by any desktop user; every function has a findable home; long
reads on panels at reading distance; forms on a real desk are as good as the desktop's.

**Weaknesses.** The graph is looked at more than worked in. Rules, run options and filter steps
are form work by ray when standing. The reading surfaces must still prove themselves against a
monitor. It is the model most at risk of being "a monitor in a headset".

**Reviewer verdicts.**

- VR interaction designer: "believable and the easiest to learn; its risk is that it is a monitor
  in a headset." A 120-degree table wall was neck work; it is now 60 to 70 degrees and paged.
- Daily analyst: the Reader and pull-near density are the best reading surface after the Room;
  objected that every panel would be written twice, which the shared panel description answers.
- Ergonomics and accessibility: second for long-session comfort, once the graph rests on its base
  instead of the off hand.
- WebXR engineer: a variant rendering the app's own React panes into the scene cannot be rated,
  because the browser feature it needs (HTML-in-Canvas) is a desktop Chrome origin trial with no
  Quest Browser plan; it stays a research option.
- Parity auditor: the strongest no-AI model on parity after correction.

---

### Model 2. The Living Workshop (no AI)

**Concept.** No app around the graph: the graph and a few tools are the controls. Every node,
edge, group, result and filter step carries its own verbs, which open when you take hold of it.
Continuous verbs (select a region, paint a style, trace a path, write) are tools that show their
own settings. Results live on the graph. A rule is pulled off an example. A threshold is a plane
raised through real nodes. A filter step is a shell around the graph. Style layers fan out of any
node as plates.

**AI.** None.

**Surfaces.**

- Halos of 6 to 8 verb petals beside the hand; destructive petals arm first.
- A root seed on the base, labeled from the first frame, with a find line over commands, nodes and
  edges that names every verb, plus graph-wide verbs (Analyze, Layout, Data, Sets, Project) and a
  "pick attribute" drawer.
- Node cards that unfold on a tether with neighbor beads, and tear off to a drawer slate.
- Trait tags: tug to light every node with the same value, tap to cycle the comparison, slide
  along the distribution, drop into the color, size or label collar on the base.
- One rule rod with and / or / not blocks, scope blocks and the value drawer; where you drop it
  sets its role (over the graph selects, into the shell filters, on a layer scopes it).
- Four tools on a palm-up tray: Net (region), Brush (style; its tip always shows its layer's name
  and swatch), String (shortest path), Pen (notes). Strokes also work on the miniature, so the arm
  can stay low.
- A base ring: undo and redo with step names, filter shells, style gels with a flat ordered list
  one tap away, analysis tokens with a printed time estimate and a progress sag, set jars, a notes
  jar, legend, statistics, the miniature, the log page, a save seal, the recent shelf and a drawer
  slate for dense forms. A ranking tape pinned on the base tears off to a 25-row list.

**Mode switching.** Two-hand scale or the stance chip with sticky detents; controls grow and shrink
with distance but the verbs never change. Lift the held graph to your face and push in to go
inside; pull cupped hands apart to step out. Grip a node and press the thumb to dive; release to
surface. Tools keep their meaning and change reach: touch when holding, a short snapping ray
outside, a radius inside.

**Walkthrough** (tasks 1 to 8 on Les Miserables).

1. On the root seed's find line you type "VAL" and pick Valjean; his Neighbors petal expands him;
   you dive in. You pull the Valjean-Cosette edge toward you, tug its weight tag onto a rule rod,
   slide it to 4, add a "within selection" scope block (23 ties), and drop the rod over the graph.
2. From the root seed you take the PageRank token (its estimate reads under a second) and drop it
   in empty space. Rank badges appear and the ranking tape pins itself to the base; thumb swipes
   step through ranks 1, 2, 3; you pull Javert's card toward you.
3. You paint the selection hull orange with its Paint petal. You dip the Brush in the group
   cartridge (its tip now reads "Color by group") and tap the base. You drop the PageRank tag on
   the size collar. On Valjean's Look petal the four style layers fan out as plates; you slide
   orange above group.
4. You tug a node's degree tag, slide it to 3 and push the rod into the filter shell (52 of 77);
   later you tap the shell's chip and step it to 5 (34 of 77).
5. With the Pen you plant a flag on Valjean; the keyboard opens on the append field; to edit, you
   tap the sentence.
6. You press undo three times, watching named ghosts. Or you pull the filter shell's trail tail,
   which restores only the filter as a new step and keeps the note.
7. You type a name on the name plate and press the seal; you lift the graph onto the recent shelf
   and set it down again to reopen it.
8. people.csv arrives as a cloud of nodes and messages.csv as a sheaf of threads. You touch the
   sender tag to the name tag (2,341 of 2,400 match), choose ignore case (2,396), and the
   unmatched threads gather in a ring that becomes a set.
9. From the recent shelf you open College football; the statistics token reads 115 nodes, 613
   edges, nothing dropped. The full attribute profile needs the drawer slate (W).
10. You find Louvain on the find line and drop its token in empty space; it sags while running
    (pull it off to cancel). Hulls appear: each hull's tag gives its size, the token's tag the
    group count and modularity, and bridges between hulls thicken with the edges between groups.
    You read it all on the graph (W).
11. You tug "name" from a node card into the label collar. You toggle the legend on the base. You
    find "circle" on the find line and tap the layout token to re-run.
12. You pinch-hold the largest hull and choose "Filter to these". You raise PageRank's filter
    plane until 10 nodes are above it (it snaps to ranks) and drop the plane into the shell. You
    grip the top team, Neighbors, "2 hops", into the shell. The notes jar opens a list on the
    drawer slate; you tap a note to jump.

At 5,000 nodes halos open only through the cone snap and the lens; the filter plane, the Net and
rule rods select; the tape replaces badges.

**Parity.** 46 N / 50 W / 11 A / 2 X; score 65. Core 24 / 17 / 4, score 72. Awkward: everything
that lands on the drawer slate (run options, layout options, fixed layer properties, editing a
step's rule, revising parameters, exporting data, the data table, regular-expression search), plus
file open, edit a note and export a picture.

**What is unique.** Attention never leaves the data. Rules without forms, pulled from a real
example along its real distribution. Thresholds set through real nodes. Layer order changed at the
node, which no surveyed VR tool supports. Tools that show their settings.

**Strengths.** The most VR-native model; the fastest path from "this one is interesting" to "show
me ones like it"; filter steps and their effect visible at once; teaches structure by handling it.

**Weaknesses.** Reading on the graph is slower than on a panel; dense forms fall back to a drawer
slate; controls are found by taking hold of things; the most new vocabulary.

**Reviewer verdicts.**

- VR interaction designer: "the most original model, and the best at attention never leaves the
  data; also the most likely to produce mode errors." The Brush silently editing one layer was a
  hidden mode; its tip now names the layer and it asks "same layer or new?" after a pause.
- Daily analyst: results on the graph are beautiful for one metric and fail for reading 40
  attributes or a 25-row ranking; inspect, ranking and community reads are W.
- Parity auditor: the drawer slate is a fallback form, so its cells are A; the model dropped from
  tied first to last but one on parity.
- WebXR engineer: brush strokes restyling 5,000 nodes per sample would drop frames; strokes now
  preview in the instance color buffer and commit once on release.
- Literature reviewer: touch selection fails at real sizes; touch is offered only at about 120
  nodes or fewer.

---

### Model 3. Cards on the Volume (no AI)

**Concept.** Nothing in your hands. The graph sits in a bounding volume whose rim carries the
always-needed controls (undo, filter steps, style layers that are the legend, status); every
object opens its own card; one find line reaches the rest. Pinch-only, so it runs on Quest hands,
controllers and Vision Pro, and on Quest it suits passthrough on a real table. Point and Ask is
built on it.

**AI.** None.

**Surfaces.**

- A rim at constant angular size. Bottom bar 10 to 15 degrees below eye level: undo and redo with
  step names, history strip, find, fit, 2D/3D, stance, selection mode, Analyze, Layout, Sets,
  Notes, Project, legend toggle. Left column: filter chips with counts. Right column: layer rows
  that are the legend, with shape glyphs. Top: status, progress with cancel, result chips. Below
  0.5 m (Hold) the rim shrinks to the bottom bar.
- Cards by pinch-hold, with a ring that fills on the target to show a card is coming (long hold
  by default for new users; tap-then-tap and dwell-only alternatives). Pull a card near to edit,
  push it far for a glance tile, touch two to compare; at most three unpinned.
- Node card: every attribute with rank and scope, memberships, neighbors, copy id. Graph card
  (pinch-hold empty space): the full profile. Ranking card: 25 rows with values and the metric's
  histogram, one leader line for the row under the ray, "top N: Select / Filter" in its header.
  Groups card: count, sizes, modularity, members, the between-groups matrix.
- Rule card with histogram handles, and / or / not and the value drawer; where you drop it sets
  its role. The log page and the recent shelf as cards.

**Mode switching.** Grab the rim to move; pinch both sides to scale with detents; or the stance
chip. Hold: the volume on your palm or a real table. Outside: on a plinth 1.5 to 2 m away, 10 to
15 degrees below eye level, standing or seated, with the bottom bar beside you. Inside: the rim
regathers into a front arc 15 to 20 degrees below eye level with the miniature above it.
Pinch-hold always opens a card; pinch-drag moves a node only when it is pinned or the other hand
is pinched.

**Walkthrough** (tasks 1 to 8 on Acme).

1. You pinch-hold Dana (the ray snaps to her), choose Neighbors (24), Dive, and release to
   surface. On a rule card you set edges, weight, at least, and drag the handle to 4 (17 ties),
   then Select. The shortcut: pinch-hold one weight-4 tie and choose "this or more".
2. The Analyze chip opens the catalog card; you pull it near, pick PageRank, Run. The result chip
   opens the ranking card; Dana's own card shows rank 7 of 412.
3. On Dana's card you hold the department value and choose Color by; a legend row appears on the
   right rim. You choose Size by PageRank, and drag the "executives" layer row above department.
4. With + step on the left rim you set degree 3 and drop it (298 left); later you drag the chip
   to 5.
5. On the Note verb the keyboard opens on the append field; to edit, you tap a sentence tile.
6. You undo three times, reading the step names, or slide the history strip back three steps with
   ghosts. Or you drag the filter chip back, which adds a new step and keeps the note.
7. On the Project card you type a name, Save, Close; you reopen from the recent shelf.
8. The system picker opens; the files arrive as crates on the table; you plug columns into From,
   To and Key; a counter reads 1,880 of 1,904 with the misses tagged red; a rim dial ignores case.
9. From the recent shelf you open College football; pinch-holding the count chip shows the load
   card (115 nodes, 613 edges, nothing dropped). Pinch-holding empty space opens the graph card;
   you pull it near to read the profile.
10. Analyze, "lou", Louvain, Run, with progress and cancel on the top rim. The result chip opens
    the groups card; tapping a row outlines the group's members.
11. You pinch-hold a team, choose its "name" row, Label by. You toggle the legend on the bottom
    bar. On the Layout chip you choose circle and tap again to re-run.
12. On the groups card you pick the largest group, Select, then Filter to these on the selection
    chip. You run PageRank and choose "top 10", Filter, in the ranking card's header. You
    pinch-hold the top team, Neighbors, step to 2, Filter; Fit. The Notes chip lists notes; you
    tap one to jump.

At 5,000 nodes the find line, rule cards and the filter plane select; cards open on cone-snapped
targets.

**Parity.** 55 N / 48 W / 4 A / 2 X on Quest; score 72. Core 35 / 7 / 3, score 86. Vision Pro, VR
only: about 54 / 43 / 10 / 2, core 34 / 5 / 6.

**What is unique.** No tool to hold. Both ordered stacks (filter steps and style layers) always in
view, and the layer column is the legend. The most portable model. The best fit for passthrough on
a desk.

**Strengths.** Ergonomically the strongest: nothing held, pinch only, the bar at the recommended
height. Calm at table scale. Every object's card is one gesture away.

**Weaknesses.** One pinch carries three meanings separated by timing (select, open card, drag),
which produces wrong-verb errors for new users. The wide data table does not fit a card (A). Its
claim to be the calmest model for long sessions is unmeasured.

**Reviewer verdicts.**

- VR interaction designer: "the calmest and the easiest to sustain"; recommended it as the floor
  to build first.
- Ergonomics and accessibility: ranked it first for long-session comfort and access.
- Daily analyst: ranking rows on leader lines into a 412-node graph were "spaghetti"; the ranking
  is now a 25-row card with one leader line for the row under the ray.
- WebXR engineer: pinch-only fits Vision Pro's transient pointer, but Vision Pro has no in-session
  keyboard, so typed cells are A there.
- Literature reviewer: the "calm for long sessions" claim is the first to measure; the study it
  cited does not test session length.

---

### Model 4. One Line and the Log (no AI)

**Concept.** One command line that knows the graph's own words, built by tapping predictive tiles,
typed, or spoken through the in-page recognizer, with "this" and "that" bound to what you point
at; and one log slab that writes every action, including hand actions, as a line and holds Layers,
Steps and Read pages. Its vocabulary is graphty-element's session command vocabulary plus words
added for save, open, close, export, settings and reading (join is still missing from the
element's vocabulary).

**AI.** None. The recognizer, where used, returns only words from a closed list.

**Surfaces.**

- The line above the dominant wrist with a predictive tile bar as the primary path: it offers only
  what can come next (select, filter, color by; then attribute tiles; then comparison and value
  tiles), so most sentences take 2 to 6 taps and nothing is spoken. Six pinned verb tiles (fit,
  undo, redo, expand, next, previous) on the wrist chip.
- Push-to-talk to the recognizer as a second path (8 candidates per noun slot); typing by the
  system keyboard, the letter strip or a paired keyboard.
- An echo of tokens with live count, units and the next missing argument, mirrored on the slab;
  fix a token by tapping it; costly commands wait for "do it". With no ray held, "this" is the
  current selection.
- A log slab on a lectern 20 to 25 degrees below eye level, 25 rows, with pages: Log (undo to a
  line, edit a line as a new step, copy lines as a recipe, tap a line to run it again), Layers
  (top wins; drag; swatches and glyphs, so it is the legend), Steps (counts, toggles, token edits)
  and Read (inspector, ranking, groups, table, profile, notes, map). A "what can I say" page.
  Direct pointing and grabbing on the graph.

**Mode switching.** Tap or say "hold", "outside", "inside", "back", or use the stance chip.
Scale-teleport: aim at a node and twist to size the landing figure. Two-hand scale with detents.
View moves go to view history, never to the log. The line and slab travel with you; the Read map
page is the miniature inside.

**Walkthrough** (tasks 1 to 8 on Acme; every phrase is built from tiles, or said).

1. You build "go to" and the letters "DAN"; candidates Dana Ortiz, Dana Ng and Dan Ortega appear
   and you tap the first (a pick among candidates, so W). Then "select neighbors of this" (24),
   "inside", "back", and "select edges where weight at least 4 within selection" (17); tapping
   the 4 token would change it.
2. "run PageRank", "weight" into the weight slot, "do it". On the Read page's ranking you tap
   "next", point at a person and choose "inspect this": rank 7 of 412.
3. "color by department"; "size by PageRank from 0.5 to 4" (the unit is echoed); on the Layers
   page you drag one row above another.
4. "filter nodes where degree at least 3" (298); on the Steps page you tap the 3 token and pick 5.
5. "note on this": the keyboard opens on the append field; to edit, you tap the sentence that
   holds "Q3".
6. You pull the third log line toward you and see a ghost of that state, then release to undo to
   it. Or you edit the filter line as a new step that keeps the note.
7. "save as" and type the name; "close"; "open" shows recent projects as tiles; you tap Acme.
8. "open file" (system picker); "join messages to people on sender equals name"; unmatched edges
   dangle red; "match ignoring case"; "weight from count"; "load".
9. You tap College football on the recent tiles. The log's first line reads "Loaded 115 nodes, 613
   edges, nothing dropped"; the Read page's Graph tab holds the profile.
10. "run Louvain", "do it", with progress and cancel on the wrist chip. The Groups tab shows count,
    sizes, modularity and the between-groups matrix; tapping a row selects its members.
11. "label by name"; "legend" toggles the legend rows on the Layers page; "layout circle"; "layout
    again".
12. "filter to selection" (the group from step 10). "run PageRank", "filter top 10 by PageRank".
    You point at the top team: "filter to 2 hops of this"; "fit". The Notes tab lists notes; you
    tap one to jump.

At 5,000 nodes names resolve through candidates and rules do the selecting.

**Parity.** Tiles only, the shipping default: 35 N / 69 W / 3 A / 2 X, score 64; core 27 / 15 / 3,
score 77. Commands that are one click on the desktop, and anything with a number, stay W. With the
recognizer: 56 / 48 / 3 / 2, score 73; core 37 / 5 / 3, score 88, provisional until measured.
With a paired keyboard: about the recognizer figure, with notes and names one step better.

**What is unique.** The fewest surfaces. Anything the element can do is a sentence. The log is
undo, history, provenance, recipes and both ordered stacks in one place, and it teaches the
language by writing each hand action as its sentence. Nothing has to be said aloud. A closed
vocabulary cannot invent an operation.

**Strengths.** Provenance and recipes for free; silent; the fastest model with a paired keyboard;
scales to 5,000 nodes because it selects by rule and name.

**Weaknesses.** Slower than a hand path for one-click commands; numbers and rules take several
taps; real attribute names ("betweenness_centrality_norm") need generated spoken aliases; spoken
use needs a room where speaking is acceptable.

**Reviewer verdicts.**

- VR interaction designer: "the log slab is the single best idea in the set... every model should
  steal it. The line itself is not viable as rated" until predictive tiles became the primary path.
- Daily analyst: "the log as undo, provenance and recipe is the single best idea in the study for
  an analyst"; candidate picks are W by the rubric, and the honest primary figure needs no speech.
- WebXR engineer: a grammar decoder returns "unknown" for names it does not know, so the recognizer
  must be a phone-level or small transcription model matched to the closed list.
- Parity auditor: the earlier headline rested on an unbuilt recognizer; the tiles figure is now
  the headline.

---

### Model 5. The Room (no AI)

**Concept.** Your real room is the app, in passthrough on a Quest 3 or 3S. The graph sits on your
real table; long reading goes on your real walls; the near half of the table is a touch surface
where your fingertip stops on real wood; you can write with an MX Ink stylus or type. Built for
long sessions with resting arms. Where the room does not fit (no clear table or wall, a couch, a
Vision Pro), a cockpit arc of panels is the model.

**AI.** None.

**Surfaces.**

- The table graph on a home plate, placed by plane detection and kept by persistent anchors
  (three per room, since Quest allows eight per site). Calibration persists and is rechecked only
  when fingertip error passes 1 cm. Double-tap the plate to fit.
- Touch: the target latches when the fingertip enters a 2 cm band and commits on an off-hand thumb
  tap or on lifting within 300 ms (a pinch lifts the fingertip off the target); a visible contact
  ring.
- A desk slate on the near table for node cards, sentence-tile rules, forms and search; a layout
  dial on the plate's rim.
- A bar along the far table edge: filter cards on the left with counts, layer cards on the right
  (rightmost wins), a legend tab.
- A reading wall within 30 degrees of forward, on a backing plate: load report, graph profile,
  rankings with "through here: Select / Filter" on each row, communities and the between-groups
  matrix, with beams from rows to nodes; a virtual wall at 2 m where no real wall is clear. A
  table wall with the sortable data table and every column's histogram.
- A catalog shelf pulled to the lectern; a notebook (ink stays ink, searchable text is typed);
  history stones along the table edge as previews, with undo and redo on the wrist chip; a
  sideboard with project dioramas, the camera, an outbox and a mailbox.

**Mode switching.** Posture suggests the stance on entry (seated: Hold; standing: Outside) and
never decides it; the stance chip and two-hand scale change it in any posture. Outside: the graph
rises onto a plinth 1.5 to 2 m away, anchored to the room, turned rather than walked around.
Inside: pinch past the detent or scale-teleport; obstacles found by the room mesh stay visible;
movement by stick or teleport. Tap the plate to come home. The room remembers the analysis layout.

**Walkthrough** (tasks 1 to 8 on Acme).

1. You aim a fingertip ray at Dana; the target latches and a thumb tap commits; her card lies on
   the slate. You tap +1 hop, Select. You stand: the graph rises to its plinth and you turn it to
   see her neighbors. From tiles on the lectern you build "select ties where weight at least 4
   within selection" (17).
2. You pull PageRank from the shelf to the lectern and drop it on the home plate. The ranking and
   its histogram appear on the reading wall with beams to the nodes; touching a person's row opens
   their card.
3. You put the department tile on a blank layer card, pick a palette, and hang the card on the
   bar; a PageRank size card takes a two-finger range; you slide one card past the other.
4. You brush a band on the wall's degree histogram from 3 up and tap Filter (298); you pull the
   filter card to the slate and step its number to 5.
5. You type the note (system or paired keyboard, append field), or ink it with the stylus and type
   a title, then press the page onto the node.
6. You tap undo three times on the wrist chip, reading the step names; or draw the history stones
   back three with ghosts and pinch to commit.
7. You type on the label tape and press the seal; the diorama goes to the sideboard; you carry it
   back to the table to reopen.
8. The system picker; two crates on the desk; a key handshake over the table with unmatched
   threads hanging over the edge; sockets for From and To; leftovers into triage bins.
9. You carry the College football diorama to the table; the reading wall shows the load (115
   nodes, 613 edges, nothing dropped) and the graph profile.
10. You take Louvain from the shelf to the lectern and onto the plate; a progress ring circles the
    plate, Cancel on the slate. The wall shows the groups table and the between-groups matrix.
11. You hang a "name" label card on the bar (W: three acts, like color and size). You tap the
    legend tab. You turn the layout dial to circle and tap its center to re-run.
12. You touch the largest group's row on the wall, Select, then Filter to selection on the slate.
    You drop PageRank on the plate; on the wall ranking you touch row 10 and choose "through here:
    Filter". You touch the top team, +1 hop twice, Filter; you double-tap the plate to fit. The
    notebook's index on the slate lists notes; you tap one to jump.

At 5,000 nodes the walls carry reading and selection; the table graph is for orientation.

**Parity.** Furnished room: 49 N / 54 W / 4 A / 2 X, score 70; core 30 / 12 / 3, score 80. Cockpit
arc: about 47 / 56 / 4 / 2. With an MX Ink stylus, edit a note is W.

**What is unique.** Real surfaces do the work: a table for fingertips and resting arms, walls for
monitor-sized reading. The only real 25-row data table with every column histogram beside the
graph. The room remembers the layout of the analysis between sessions.

**Strengths.** The most comfortable long session when the room cooperates; passive haptics (a
fingertip that stops on wood) for forms and rules; reading that approaches a monitor.

**Weaknesses.** Needs a clear table and wall; touch accuracy near a real surface is unmeasured;
style takes three acts (tile, palette, hang); everything depends on Quest passthrough, planes and
anchors, which Vision Pro's browser lacks.

**Reviewer verdicts.**

- VR interaction designer: "the most comfortable for long sessions when the room cooperates. Real
  surfaces really do the work." Putting the graph on the floor when standing was neck strain; it
  now rises to a plinth.
- Daily analyst: "the only model whose reading surfaces approach a monitor; the 25-row table with
  column histograms is the thing that would keep me in the headset." Tying stance to posture broke
  the brief; posture now only suggests.
- WebXR engineer: a pinch lifts the fingertip off the target, so touch now latches on contact and
  commits by thumb tap or a quick lift.
- Literature reviewer: passthrough cancels the claim that real walls read better; the claim is
  now that walls give monitor-sized room, with text on a backing plate.

---

### Model 6. Point and Ask (AI)

**Concept.** Say what you want in your own words while pointing. Each "this", "these" or "there"
binds to a target, and a language model compiles the request only into graphty-element's undoable
session commands and the algorithm catalog, refusing anything else. It never answers with prose and
never changes anything unseen: every answer is a ghost preview plus editable objects, committed by
a pinch or "do it", and it leaves an instrument (a knob, a palette ring, a size range) on a rail so
the next change is by hand. Its hand base is Cards on the Volume.

**AI.** Yes, with a provider. Without one it is Cards on the Volume plus local bare verbs; no
function is reachable only through the AI.

**Surfaces.**

- Push-to-talk (palm up or the off trigger) through provider speech-to-text with word timestamps,
  with the project's node and attribute names sent as hints. Tap the palm to type instead.
- Bare verbs (stop, undo, do it, next, cancel) on the local recognizer, with no round trip.
- Deixis: each "this" binds to the target the ray rested on from 2 to 4 seconds before the word
  until its end (people point before they speak), or to a target locked by a pinch first. The ray
  is built from the index finger, a 3-second ray history maps words to frames, and the bound
  target highlights as you speak; "no, this" or a tap rebinds.
- An echo line: transcript, target chips and the inferred slots as tiles (attribute, comparison,
  value, scope) before the ghost, so "fewer than three" read as "at least 3" is visible before
  anything commits.
- Ghost preview with a count and a before-and-after scrub; a plan belt for multi-step requests;
  answer objects tethered to their evidence; an instrument rail 15 degrees below eye level beside
  the Cards rim.
- History marks assistant steps; undo by meaning becomes a compensating step. An autonomy dial:
  Suggest, Preview (default), Act (opt-in per session, never for a filter step or a deletion).
- Privacy shown before the first request: what will be sent, and a per-project switch for names
  only or nothing. Calls go through a proxy by default. For confidential graphs the honest advice
  is to use a no-AI model.

**Mode switching.** By voice ("take me inside Valjean", "show me this from outside", "back to where
I wrote the note about Eli"), with the destination highlighted in the miniature and a 1 to 2 second
cancel window, then the comfort setting's blink. "Go back" uses view history, never undo. By hand,
everything in Cards on the Volume.

**Walkthrough** (tasks 1 to 8 on Les Miserables).

1. You say "take me inside Valjean"; the miniature highlights him and the view blinks you there.
   You point at Cosette and ask "who is this?": her node card opens. "Select his ties with weight
   at least four": tiles show [edges] [weight] [at least] [4] [his ties] and a ghost shows 23; you
   pinch to commit.
2. "Run PageRank using the weights and show me the top ten": a card with cost and options; "do
   it"; the ranking card. You drag its cut line to 5, point at Javert and ask "what are his
   numbers?".
3. "Color everything by group and size it by PageRank": a two-card plan; the palette ring and size
   range land on the rail. "Put the orange layer back on top", or you slide the row.
4. "Leave out characters with fewer than three connections": tiles show [degree] [at least] [3];
   once per session it asks whether you mean a filter step or hiding on the canvas; you choose
   Filter; you twist the knob to 5.
5. "Note: ..." is stored verbatim. "Change convict to former convict in that note" arrives as a
   tracked change you accept (dictation errors still need fixing, so W).
6. "Go back to before I changed the filter to five" ghosts three steps; "undo just the filter
   change" proposes a compensating step that keeps the note.
7. "Save this as Les Mis PageRank", "close", "open Les Mis PageRank".
8. "Open a file" brings up the system picker. Then "people are the nodes keyed by name, each
   message is an edge from sender to recipient" gives a fields card and a ghost network with 59
   unmatched; "match names ignoring case and spaces" leaves 4; "do it".
9. "Open College football. What did it load?": the load card. "Describe this graph": the graph
   card.
10. "Find the communities": the catalog card proposes Louvain with its cost; "do it"; the groups
    card.
11. "Label them by name, and put them in a circle": a two-card plan; "do it". "Hide the legend."
12. Pointing at a hull: "keep only this group". "Now only the top ten by PageRank": a plan that
    runs PageRank and then filters; "do it". Pointing at a team: "just this team and two hops
    around it"; "fit". "Show my notes": the notes card.

At 5,000 nodes requests by rule and by name scale; per-word pointing needs the cone snap and fan.

**Parity.** About 61 N / 44 W / 4 A / 0 X with a provider, score 76; core 39 / 4 / 2, score 91. AI
earns N only where one sentence replaces a form (select by rule, filter step by rule, compound
requests, revising parameters, fixed layer properties, the command palette); for single commands
the hand path is faster. Select by rule and filter step by rule are N pending a test of how often
out-of-vocabulary requests compile to plausible wrong commands on graphty's own vocabulary.

**What is unique.** Reaches operations you cannot name. Runs compound requests as an inspectable,
stoppable plan. Per-word pointing lets you stay outside the graph. Every AI result is an ordinary
editable object and undoable command, so the AI teaches the hand controls. The closed compile
target cannot invent an operation, and the slot tiles show a wrong mapping before it commits.

**Strengths.** The highest core figure; the best path for newcomers and for tasks you cannot name;
notes by dictation; no extra vocabulary to learn.

**Weaknesses.** Needs a network, a provider, a proxy, a room where speaking is acceptable, and data
allowed to leave the device. A 1 to 3 second round trip plus a preview is slower than a pinch for
single commands. Names-only privacy still sends names.

**Reviewer verdicts.**

- VR interaction designer: "the right shape for AI: a closed target, ghost previews, every answer
  an editable object, undo by meaning. The ratings are optimistic." A 300 ms binding window was far
  too narrow; it is now 2 to 4 seconds of look-back.
- Daily analyst: "the AI teaching the hand controls, and every AI result being an ordinary
  undoable command, is the right shape"; objected that names-only still sends names, a policy
  violation for HR or security graphs.
- Parity auditor and WebXR engineer: an earlier "about 70 N" was inflated; single requests are W
  against a click, and three hand models as a base were cherry-picking, so the base is now Cards.
- Literature reviewer: a closed target still produces plausible wrong mappings; the slot tiles
  now expose them, and the rule cells wait on a measured test.

---

## 5. Mode switching

The brief treats holding the graph, standing outside it and being inside it as modes a person
switches between, often several times a minute. The target: a switch costs under a second, never
makes anyone sick, and loses nothing.

### The rule underneath: two frames

- **The graph frame** holds nodes, edges, labels, note anchors, selection and filter results. A
  mode switch changes only this frame's scale and offset.
- **The person frame** holds tools, open panels, undo controls, the assistant and the "where am I"
  indicator. It never scales: a panel 1 m away stays 1 m away in every mode.

So selection travels for free (it is data); a note's anchor stays on its node while its card is
drawn at constant angular size; a note being edited moves into the person frame until closed;
panels keep their body-relative places and redraw their leader lines; and **view changes are not
edits**: they go into a view history ("back"), never the undo stack.

### The approaches

| Approach                   | How it works                                                                                                         | Best for                           | Risk                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| A. Pinch the world         | Two-hand grip scales and turns the graph about the point between the hands, with detents at hold, outside and inside | Everyday zoom; the default         | Large fast scale-ups cause optic flow; mild vignette, fixed floor             |
| B. Stance presets          | A stance chip snaps to Hold, Outside or Inside, landing facing the focus node                                        | Fast switching between known views | Disorientation after a cut; land on the focus, show a ghost of where you were |
| C. Miniature               | A small copy of the whole graph with a you-are-here figure while outside or inside                                   | Never getting lost                 | Clutter on large graphs; confusing which copy is which                        |
| D. Orb or portal           | Grab a node; it becomes a sphere showing its neighborhood; bring it to your face to enter                            | "Open this node"                   | Portals rated worst for orientation in one study                              |
| E. Dive and surface        | Hold a pinch on a node to dive in; release to return exactly where you were                                          | A quick look at a neighborhood     | Holding is tiring; double-tap to stay                                         |
| F. Scale-teleport          | The teleport marker is a figure whose size sets the arrival scale                                                    | Long jumps across big graphs       | Classic teleport orientation; the figure carries a facing arrow               |
| G. Immersion follows scale | Passthrough at table scale, fading to full VR inside                                                                 | Mixed reality on a real desk       | Walking into furniture inside; keep a passthrough floor window                |
| H. Shrink yourself         | The graph stays anchored to the room; you change size                                                                | Walking a room-scale graph         | Seated use; perceived depth changes with scale                                |
| AI layer                   | "Take me inside the most central node of the blue cluster", with a highlighted destination and a cancel window       | Described destinations             | An unrequested camera move is the most disorienting thing in a headset        |

What existing tools teach: two-hand pinch-scale is the de facto standard (Gravity Sketch,
ShapesXR, Google Earth VR); a one-tap return to a known scale matters as much as free scaling
(ShapesXR); immersion can follow scale (Arkio switches from mixed reality to full VR at life size);
and separate modes with no shared overview leave people lost (Matterport's dollhouse). No shipped
tool deliberately carries floating panels and notes across a scale change, and no graph tool has a
designed "step into a node" transition.

### Recommended

1. **User-driven travel first.** Grab and pull, and two-hand scale with detents (A), need no
   transition and cause the least sickness, because the motion is your own.
2. **Stance chip** (B) with three fixed rules: tapping it twice always returns to Hold; no stance
   change while a drag is in progress; an always-visible "you are here" ghost.
3. **Travel you do not drive** (a stance switch, going to a node from a list, a dive, a voice
   request) asks once at first run. Comfortable (the default) is a 150 to 250 ms blink with the
   focus node held in view. Smooth is a constant-velocity move at 1 to 2 m/s with a tunneling
   vignette. Never an eased glide, and never a 2 to 5 second middle setting, which users rated
   worst.
4. **Dive and surface** (E) for the commonest inside task, and the orb (D) as the explicit "open
   this node".
5. **A world-stable, read-only miniature** placed in front when you go Inside, with you-are-here.
   Not in the off hand: a hand-held miniature that drives the camera was the shakiest and most
   disorienting technique tested (Drogemuller 2020). It matters because Inside helps local
   questions but hurts overview reading (Kraus 2020; Takahira 2026).
6. **Placement by stance.** Hold: the graph rests on a base, plinth or real table and is held only
   while the grip is closed, snapping upright on release, with an optional slow rock at rest for
   the motion depth cue. Outside: on a plinth 1.5 to 2 m away with its center 10 to 15 degrees
   below eye level, in any posture; the real floor only as an overview option. Inside: controls in
   a front arc 15 to 20 degrees below eye level, never a ring around you, plus a "turn the world"
   control so your head stays forward.
7. **Posture suggests, never decides.** Sitting may default to Hold and standing to Outside on
   entry; the chip changes it in any posture.
8. **Flat view.** The existing 2D/3D switch shows the 2D layout on an upright board at reading
   distance in any stance, because 2D is more accurate for separated communities, density and
   memory (Greffard 2011; Kotlarek 2020; Feyer 2024).
9. **Immersion follows scale** (G) in passthrough, overridable.

What graphty-element needs for this: a neutral, settable and observable view scale and focus node
(so stances, dives and teleports are calls on the element); a second synchronized render at another
transform for the miniature; constant-angular-size labels and note anchors with clamps; and a view
history separate from edit history. Which stances, detents, transitions and comfort defaults to
offer are the consuming app's choices, exposed as options with neutral defaults.

---

## 6. The control-surface paradigm catalog, condensed

102 paradigms in 15 families. 89 work with no AI, and 13 need AI. Most adapt a mechanism seen in a
shipped tool or study to a new graph use; one is used as seen, and five have no precedent found.
Marks: **(AI)** needs a language model; **(optional AI)** works alone, AI can add to it;
**(invented)** no precedent found; **(seen)** exists as described. Unmarked entries need no AI and
adapt seen parts. Full entries, with strengths, weaknesses and sources, are in
`vr-control-surface-catalog.md`.

**1. Navigation, scale and modes**

- 1.1 Scale detents and three reaches: two-hand scale with detents at hold, outside and inside;
  tools keep their meaning but change reach.
- 1.2 Tethered proxy: squeeze at a far node and a hand-sized copy flies to your hand on a tether;
  edit the copy, the original changes.
- 1.3 Proxemic bloom: controls appear by distance zone (graph, community, node, touch); reaching
  closer is the confirmation.
- 1.4 Guided flight (optional AI): pick or say a destination and be moved there by a comfort fade;
  rankings become tours.
- 1.5 Rooms of the analysis: the app is a building whose rooms are the tools; you carry the graph
  between them.

**2. Command and verb grammars**

- 2.1 Node halo: hold any node, edge, group or result and 6 to 8 verb petals open at fixed clock
  positions; a flick fires one.
- 2.2 Marking-menu sentences: chained radial strokes pick family, verb and argument; drawing
  slowly shows the guide.
- 2.3 Operator, count, scope: a vim-like controller grammar ("filter 2 neighbors") with a repeat
  button.
- 2.4 Three-slot sentence palette: noun, verb and argument slots on the off palm, filtered by type.
- 2.5 Pinch-chord vocabulary: thumb-to-finger chords as keys; the off hand is the operator, the
  dominant hand the scope.
- 2.6 Word tokens on a belt (invented): pull verb tokens off a belt and drop them on targets.
- 2.7 Hold to grow: a command's one number grows while held (hops, top N, threshold) and stops on
  release.

**3. On-body surfaces**

- 3.1 Thumb verbs and finger-segment keys: thumb taps and swipes on the off hand, meaning set by
  what the other hand points at.
- 3.2 Tool belt and body slots: holsters in front of the body; a chest pocket holds the selection
  as a ball.
- 3.3 The sleeve: a watch with one live fact; forearm rails for undo history and the number in
  play.
- 3.4 Session grid on the forearm: an 8 x 8 launch grid of results by encodings that doubles as
  legend and layer list.

**4. Voice, text entry and addressing (no AI)**

- 4.1 Fixed-phrase deictic voice grammar: a closed phrase list from the project's own words; "this"
  binds to the ray target at the word.
- 4.2 Spoken rule language with token correction: say a rule in a fixed grammar; fix any token by
  pointing.
- 4.3 The prompt book (optional AI): "standby" arms a command with a ghost preview, "go" runs it;
  the cue sheet is history and recipe.
- 4.4 Hint labels: two-character tags on everything in view; say or chord a tag to target it.
- 4.5 Steered text entry: a zooming column of letters, sized by how often they occur in the
  graph's own words.
- 4.6 Grammar-aware command palette with ghost slots (optional AI): one line reaches every command,
  node and attribute; the remaining arguments show as slots.

**5. Selection and rules**

- 5.1 Reach, brush and cookie-cutter: pointing follows distance; a drawn loop extrudes into a 3D
  marquee; one hand adds, the other removes.
- 5.2 Tangible rule pieces: attribute rods with histograms and comparator blocks; and / or / not by
  arrangement; where you drop it sets its role.
- 5.3 Rule from one example: pull a node and its traits orbit; tug one to light every node sharing
  it; slide along its distribution.
- 5.4 Rule from several examples (optional AI): touch examples and counter-examples; the simplest
  shared rules appear as chips with counts.
- 5.5 Metric skyline and cutting plane: nodes rise by a metric; a grabbable plane through them sets
  the threshold.
- 5.6 Pipeline rail: a waist rail of tiles (source, where, traverse, rank, sink) with a live count
  on each.
- 5.7 Sentence tiles: a rule as floating word tiles you twist, tap and pull out, with a live ghost.
- 5.8 Stroke grammar: a scope stroke, then a letter glyph (S select, F filter, N note);
  unrecognized ink becomes a note.
- 5.9 Group hulls: sets as skins; drag one into another for set algebra; poke a node through to
  add it.
- 5.10 Eyedropper everything: sample a look, a value or a legend entry and release it on targets
  to style, select or filter.
- 5.11 Reactable lenses: pucks slid onto a table graph become lenses whose spin sets a parameter.
- 5.12 Edge strings: pluck an edge, trace a path from A to B as a rope, chop across a bundle.

**6. Inspecting and reading results**

- 6.1 Pull to unfold (optional AI): pull a node toward you and it grows into a tethered card with
  neighbor beads.
- 6.2 Clip-on gauges and tear-off tape: live gauges clip onto things; a ranking prints as tape torn
  at row N to select the top N.
- 6.3 Result badges: results worn on the graph; twist a badge to change N; pull it for its run
  parameters.
- 6.4 Held slate with threads: a clipboard-sized table in the off hand, each row threaded to its
  node.
- 6.5 Table wall: a curved wall of about 25 readable rows, histogram headers and row-to-node
  threads.
- 6.6 Linked window pairs: small linked copies of the graph on an arc to compare runs, metrics or
  windows.
- 6.7 Variant tray (optional AI): three to five miniature variants (layouts, palettes) to choose by
  sight.

**7. Filter steps and style layers**

- 7.1 Sieves, gels and lens panes: filters and styles as glass panes in racks; order is depth;
  threads show which gels styled a node.
- 7.2 Stack rails and pedalboard: steps and layers as cards on a rail or pedals on a board;
  position is order, bypass toggles.
- 7.3 Look stack: a node's "why this look" fans out one plate per layer that wrote to it; slide a
  plate to reorder that layer everywhere.
- 7.4 Sieve shells: filter steps as nested skins around the graph, removed nodes as dust with
  counts.
- 7.5 Style mixing desk: each layer a channel strip with sockets, knobs, mute and solo.
- 7.6 Attribute lens: hold an attribute like a flashlight to preview an encoding; wrist roll picks
  the channel.

**8. Held tools, catalogs and numbers**

- 8.1 Loaded tools: Brush, Net, Probe, Dropper, Pin, Shaker, String and Scissors, each carrying its
  settings.
- 8.2 The shelf you walk along: every long list as objects on a curved shelf with an alphabet
  ruler; where you drop an item sets its scope.
- 8.3 Workbench, drawers and the analyzer: attributes as index cards in drawers; an analyzer
  machine with a cost light and a run lever.
- 8.4 Seed tokens: drop an analysis on a node, hull or empty space to set source and scope; cost
  shows before release.
- 8.5 Mise en place rail: attribute jars and palette tins on a kitchen rail; the ticket is the
  recipe.
- 8.6 Pull-distance knobs: knobs whose steps get finer as you pull away, with detents at quantiles
  and data values.

**9. Layout**

- 9.1 Layout molds and the shake (invented): press the graph into a mold to lay it out; shake to
  re-run.
- 9.2 Hull handles: lay out by shaping: flatten, spin to a circle, pull up a tree.

**10. Panels and windows**

- 10.1 The whole app, curved: the unmodified desktop app on a curved panel with the real 3D graph
  in a cut-out.
- 10.2 Hinged triptych: navigator left, graph center, reader right; folds like a book stand when
  holding.
- 10.3 Ornament-rimmed graph volume: undo, filter chips, legend rows and status on the edges of the
  graph's bounds.
- 10.4 Personal cockpit: a body-locked arc of small single-purpose windows in a fixed order.
- 10.5 Off-hand palette that tears off: a six-faced palette with a letter strip; pull a face off
  into a world slate.
- 10.6 Tethered cards: every object opens its own card on a leader line.
- 10.7 The analyst's wall: long reading panels pinned to real or virtual walls, with beams to
  nodes.
- 10.8 Desk slate: forms and the rule editor on the real desk, worked by a fingertip on wood.
- 10.9 Pull-near reading lens: a panel's density follows its distance (glance tile far, dense pane
  near).
- 10.10 Mode-aware concierge panel: one main panel that docks by fixed rules in each stance.
- 10.11 The plinth: graph-wide controls on a base under the graph; a corner seal saves.

**11. Notes and prose**

- 11.1 Spoken notes pinned to their subject: plant a flag and dictate; edit by touching a word and
  saying it again.
- 11.2 Notebook, stylus and pinned pages: write with a tracked stylus; tear a page out and press
  it onto a node.
- 11.3 Narrated notes (optional AI): talk while exploring; speech splits into notes anchored to
  what you looked at.

**12. History, undo and confirmation**

- 12.1 Wearable history strip (optional AI): named steps as beads on a wrist ribbon with live ghost
  previews.
- 12.2 The time river: steps as stepping stones in a river on the floor; saves are flagged stones.
- 12.3 Trail tails: each changed object carries a tail of its steps; draw it back to restore that
  object as a new step.
- 12.4 Command log slab: every action as a readable line; pull a line to undo to it; copy lines as
  a recipe.
- 12.5 Plan conveyor (AI only to plan from a sentence): a plan as cards on a belt toward a gate you
  can pause.
- 12.6 Heft and the shredder: cost felt as weight; delete by feeding a shredder that shows counts.
- 12.7 Ghost preview with a scrub handle (invented): every change shows first as a ghost with a
  count; pinch to commit.

**13. Projects, files and export**

- 13.1 Projects as objects, with a camera and an outbox: projects as dioramas on a sideboard; a
  camera carries the picture-export settings; an outbox exports data.

**14. AI-mediated control (all AI)**

- 14.1 Deictic assistant that answers in editable objects: speak while pointing; the answer is
  ordinary rule pieces, layers and steps.
- 14.2 Ghost hands (invented): translucent hands perform the manual steps so you learn them.
- 14.3 Generated workbenches: the assistant assembles a task panel from a fixed set of tested
  parts.
- 14.4 Assistant side window with show me: a conversation whose answer chips beam to their
  subjects.
- 14.5 The familiar: a shoulder companion that hands you loaded tools; a leash sets its autonomy.
- 14.6 The oracle lens: hold a glass over part of the graph and turn a ring of stock questions.
- 14.7 Conjured instruments: say an edit; it leaves a knob or slider for further changes by hand.
- 14.8 Answer objects: rankings, groups and profiles answered as objects you can drop on the graph.
- 14.9 The docent: a guide that frames views, runs analyses and offers tours.
- 14.10 Sculpt the answer (invented): push the graph into the shape you expect; it offers
  operations that would produce it.

**15. Data preparation (nice to have)**

- 15.1 Preparation bench (optional AI): tables as crates, columns as spools plugged into sockets,
  problem rows sorted into bins.
- 15.2 Node and graph surgery (optional AI): spawn, tear and merge nodes and edges by hand in an
  editing mode.
- 15.3 Key handshake (optional AI): hold a key column in each hand and bring them together;
  unmatched values droop.
- 15.4 The crate: a file arrives as a crate whose lid shows counts; a broken file arrives cracked
  with its line and column.
- 15.5 Role sockets: plug columns into From, To and Key sockets; a wrong type will not seat.
- 15.6 Cluster pucks and duplicate piles: look-alike values clump; squeeze a clump to fuse it.
- 15.7 Triage bins: problem rows as cards tossed into Drop, Keep, Merge or Fix bins.
- 15.8 Column strips: a column as a rod with one tick per row; twist it to set its type; wipe a
  sponge over gaps.
- 15.9 The recipe rail: preparation steps as blocks on a rail; lift one off to turn it off.
- 15.10 Graph overlay join (optional AI): carry a second graph into the first; matching nodes lock
  with a click.
- 15.11 Punch list (optional AI): flag anything wrong while exploring; the flags feed triage later.
- 15.12 Workbench slab, keep it 2D (seen): the desktop data page on a flat slab.
- 15.13 Say it, see the ghost (AI): speak a fix; it becomes one previewed, editable operation.
- 15.14 Paper in (AI): frame a printed table or a whiteboard drawing in passthrough to import it.
- 15.15 The data steward (AI): proposal cards around a loaded file that hand off to the hand tools.

---

## 7. What existing VR tools do

There is no Figma-like VR productivity app to borrow from. The surveys covered 3D creation tools
(ShapesXR, Gravity Sketch, Arkio, Substance 3D Modeler, Open Brush, Quill, Unity EditorXR, Unreal
VR Mode and others), engineering, science and medical tools (The Wild, Resolve, VR Sketch, Nanome,
ChimeraX, syGlass, ParaView, Google Earth VR, Virtualitics), work and office tools (Horizon
Workrooms, Immersed, Freeform and Keynote on Vision Pro, Flow Immersive, BadVR, Tableau's visionOS
prototype, Noda) and games and platforms (Half-Life: Alyx, Job Simulator, Little Cities, Cities:
VR, Demeo, Final Assault, PatchWorld, visionOS, MRTK).

### Patterns that transfer

- **Off-hand palette, dominant-hand pointer.** The off hand holds the tools, the other points
  (Open Brush, Quill, Gravity Sketch). Keep it shallow: two levels become muscle memory (Little
  Cities); a third does not (Cities: VR).
- **Two-hand grab to scale is universal**, with a visible scale readout and a one-tap return to a
  known scale (Gravity Sketch, ShapesXR, Google Earth VR). Breaking it feels wrong.
- **A hand menu that peels off into a world slate** bridges quick actions and long reading
  without a mode switch (MRTK hand menu, Arkio tear-off menus).
- **Inspector at the object, with a leader line** to what it describes (ShapesXR object
  inspector, Freeform's pop-up bar); floating far panels are the form BadVR's founder rejected.
- **The catalog as physical objects**, where the drop target sets the scope (Final Assault's
  clipboard, Half-Life: Alyx's fabricator).
- **State on the object** first, a table only on request (Half-Life: Alyx, Little Cities).
- **Undo as a dial, with visible history** (Gravity Sketch's history clock; VR Sketch's icon row
  for jumping several steps). No surveyed tool shows a full history list.
- **Dictated notes as spatial objects** attached to a thing, discarded and re-recorded rather than
  edited (The Wild).
- **A fixed voice command list with "what can I say?"** works with no AI (syGlass). Nanome's
  natural-language assistant states its own gap: voice cannot use pointing to resolve "this".
- **A miniature in hand** is the most praised overview device (Unity EditorXR's MiniWorld, after
  Worlds in Miniature).
- **Hold-to-arm for destructive actions**, with distinct sounds per stage (Half-Life: Alyx gloves,
  Walkabout Mini Golf).
- **Save the room with the data** (ChimeraX sessions keep VR state and button assignments), and
  make files cloud documents that open identically on a laptop (Freeform, Flow Immersive).
- **Passive haptics**: a pen on the real desk was the one Horizon Workrooms feature reviewers loved.
- **Voice for names from long lists** is the only list technique that got praise (Flow AI,
  Tableau's visionOS prototype).

### Failures to avoid

- **Floating the whole desktop editor into VR** failed twice, on text density, small targets and
  trigger overload (Unity EditorVR, Unreal VR Mode); both retreated to curated palettes.
- **Air typing** is universally condemned: about 27 words a minute on Vision Pro's virtual keyboard
  against about 60 on a real one.
- **Long lists on a ray** with a sensitive scroll (Beat Saber) and nested stick-angle radial menus
  (Cities: VR). Search or type-ahead inside a VR list is essentially absent everywhere.
- **Invisible state**: "zero way to tell what layer you're on" (Substance 3D Modeler).
- **Taking the headset off for files**: Horizon Workrooms sent people to a web portal; it was
  discontinued in February 2026.
- **Ordered layers**: no surveyed VR tool reorders layers in the headset; office apps drop the
  layer pane on Vision Pro. Ordered style layers and filter steps are new ground.
- **Comfort before UI**: a VR mode that drops frames is abandoned whatever its menus are (ChimeraX
  warns of nausea; EditorVR slowed down). A week of real work in VR rated worse than a desktop on
  most measures, and two of sixteen people dropped out on day one (Biener 2022).
- **Data preparation**: no surveyed tool prepares tabular data in the headset; all import from
  desktop tools. The one study of table transformation in VR ("This is the Table I Want!") found
  the same time as a desktop and better provenance, because the steps stay visible in space.

---

## 8. Recommended spikes

Eight throwaway sandboxes, chosen for what trying them would teach. Seven need no AI; three are
bold (the Living Workshop, the Room, Point and Ask). Run the platform floor first: its answers
change cells in every model.

Common setup, so each spike only adds its own surfaces: a Vite page under `tmp/` with Babylon.js 8
and @babylonjs/gui; data from @graphty/graph-samples (Les Miserables, College football) plus a
generated 412-node graph with a made-up department attribute and a generated 5,000-node graph;
analyses run for real with @graphty/algorithms; served over HTTPS through servherd so a Quest 3 can
open it. No graphty-element changes: style layers are faked as an ordered list mapped to instance
colors and sizes, the project store is in memory, and undo is a simple named stack.

Every spike times its main tasks against the desktop app on the same graph and seed, and counts
misses separately from time.

### Spike 1. The platform floor (no AI, about 4 days)

**You put on the headset and** Les Miserables sits on a plinth below eye level with three panels
around it: a 15-row PageRank ranking, a style form and a rule bar. You pinch Valjean, open a note
and type "former convict" on the system keyboard, then try the same with a paired Bluetooth
keyboard. You color by group from the form and read the ranking. You thumb-swipe your off hand to
undo. You tap "Open file" and watch what the picker does to the session. You switch to the
5,000-node graph and try to pinch single nodes with and without the cone snap and lens.

**Build.** Three panels drawn in the scene and the same three as WebXR quad layers; text at 1.2,
1.5 and 1.8 degrees; leader lines; cone snap with a fan and a declutter lens; a floating value bar
versus a slider near the forearm; a fingertip-on-table test with the latched commit; the
microgesture buttons read through the hand's gamepad; a file input; the system keyboard on a hidden
input; a one-line check for HTML-in-Canvas.

**Questions it answers.** Does the system keyboard replace the field on each open, blur the
session, and does its microphone key dictate? Do a paired keyboard's key events reach the page in a
session? Does a file picker end or pause the session? Do microgestures misfire mid-pinch? Can three
live panels plus 5,000 instanced nodes hold 72 Hz? Do quad layers really sharpen text, and how bad
is losing hands and leader lines behind them? What is the miss rate at 5,000 nodes with cone snap,
and the fingertip error on a real table?

**Drop or pursue.** If three live panels cannot hold 72 Hz at 5,000 nodes, every model must cap
live panels lower or move reading to quad layers. If a paired keyboard's events do not reach the
page, the keyboard path (and every "with keyboard" figure) is gone. If the picker ends the session,
"open a file" becomes a handoff to the 2D page.

### Spike 2. Cards on the Volume on a real desk (no AI, about 4 days)

**You put on the headset and** sit at your own desk in passthrough. The 412-node graph sits in a
glass volume on the desk with a bar along its bottom edge. You pinch-hold a node; a ring fills and
its card opens; you hold the department value and choose Color by, and a legend row appears on the
right edge. You choose Size by PageRank and drag the executives row above department. You add a
filter step from the left edge and drag its chip from 3 to 5. You pinch-hold a node, choose Note
and type one sentence; you tap it later to change one word. You undo three times and read the step
names. You tap the stance chip, blink inside your node's neighborhood, read the miniature, and tap
the chip twice to come back.

**Build.** The rim (bottom bar, filter column, layer column as legend, status), cards on
pinch-hold with the fill ring, node card, ranking card (25 rows and a histogram), groups card, rule
card with histogram handles, note sentence tiles, undo with names, the stance chip with a blink.

**Questions it answers.** Is table-scale work calm enough for a 30-minute session? How often does
the one pinch with three meanings pick the wrong one? Is the ranking card read within 1.5 times the
desktop? Do people find the legend in the layer column? Does styling by the card value feel
faster than a form?

**Drop or pursue.** Drop it as the floor if wrong-verb errors exceed about one in ten pinches after
practice, or if card reading is slower than 1.5 times the desktop. Pursue it if people choose it
for a 30-minute session and its core tasks land within 1.5 times the desktop.

### Spike 3. Stance switching and the miniature (no AI, about 3 days)

**You put on the headset and** hold Les Miserables on a plinth in front of you. You grip with both
hands and pull it larger, feeling it settle at the outside detent, then larger again until you are
standing among the nodes. You tap the stance chip: you blink back to Hold. You pinch-hold Valjean
and dive; you read his neighbors' labels; you release and are exactly where you were. You go inside
for real and a miniature appears in front of you with a figure marking you; you "turn the world" to
bring Cosette in front of you without turning your body. You paint one neighbor's layer orange from
the front arc and leave a one-sentence note on him, then go back out and find the note still
readable on its node.

**Build.** Two-hand scale with three detents; the stance chip with blink (150 to 250 ms) and
smooth (constant 1 to 2 m/s with vignette) settings; dive and surface; a world-stable read-only
miniature versus a hand-held one; "turn the world"; constant-angular-size labels and note cards;
the front arc of controls.

**Questions it answers.** How long does it take to re-find the focus after each kind of switch,
and how large is pointing error right after it? Who gets sick, and on which transition? Does the
world-stable miniature beat the hand-held one? Do people get lost inside without it? Do styling and
notes survive a switch without anyone noticing a change?

**Drop or pursue.** Any transition that costs more than about a second to re-orient, or raises
sickness scores, is dropped as a default. The winners become graphty-element options with neutral
defaults.

### Spike 4. The Living Workshop: rules from examples, the plane and the look stack (no AI, bold, about 5 days)

**You put on the headset and** pull Javert toward you; his traits orbit him as tags. You tug the
degree tag and every node with the same degree lights with a count; you slide along the tag's
distribution to "at least 5" and push the glowing rule into the shell around the graph: a filter
step. You raise PageRank: the graph becomes a skyline, and you lift the cutting plane until ten
nodes stand above it, then drop the plane into the shell. You dip the Brush in the group cartridge
(its tip reads "Color by group") and tap the base. You open Valjean's "why this look" petal: four
plates fan out of him, and you slide orange above group and watch the whole graph change. You plant
a note flag on him with the Pen.

**Build.** Pull-to-unfold node cards with orbiting trait tags; a rule rod with one scope block and
the value drawer; filter shells with counts; the skyline and the cutting plane snapping to ranks;
the Brush with a cartridge and the visible tip label; the look stack; the Pen flag with an append
field.

**Questions it answers.** Is a one- or two-condition rule faster from an example than from a rule
card? Does the plane select the top N faster than a ranking table? Do people understand that a
plate slid at one node reorders the layer everywhere? Does the Brush still cause wrong-layer
strokes with its tip labeled? How does reading on the graph compare to a card?

**Drop or pursue.** Drop the whole model if a two-condition rule takes more than twice the rule
card's time, or if the look stack's global effect surprises most people. Pursue its pieces (tug a
trait, the plane, the look stack) as layers in other models if they win even when the model loses.

### Spike 5. The log slab and predictive tiles (no AI, about 4 days)

**You put on the headset and** look down at a lectern slab of 25 log lines. Above your wrist a
tile bar offers "select", "filter", "color by", "size by", "label by". You tap "color by", then the
attribute tile "group": the graph recolors and the log writes "color by group". You grab a node and
drag it, and the log writes that too. You tap "note on this" and type a sentence. You pull the
third line from the bottom toward you, see a ghost of that state, and let go to undo to it. You
select three lines, copy them as a recipe, open College football and run the recipe.

**Build.** The predictive tile bar over a small grammar (select, filter, color, size, label, run,
note, layout, fit, undo), the echo with live counts, the log slab with Log, Layers and Steps pages,
undo to a line, edit a line as a new step, copy as recipe.

**Questions it answers.** How many taps does a typical sentence take (the target is 2 to 6)? How
much slower are tiles than a direct hand path for one-click commands? Do people understand the log
as their history, and does it teach the language? Do recipes carry across datasets?

**Drop or pursue.** Drop the line as a primary input if sentences average more than 6 taps or
take more than twice the hand path; keep the log page in every model regardless. Pursue the line
as the expert path if tile sentences approach the hand path.

### Spike 6. The Room: table, wall and fingertip (no AI, bold, about 5 days)

**You put on the headset and** see your own room. The graph sits on your real table on a home
plate. You touch a node with your fingertip on the wood; a contact ring shows the latch and a thumb
tap commits. You drop PageRank on the plate and the ranking appears on your real wall at reading
distance with beams to the nodes. You brush a band on the wall's degree histogram and tap Filter.
You put the department tile on a blank layer card and hang it on the bar along the table's far
edge, then slide it past another card. You write a short note with an MX Ink stylus, or type it,
and press the page onto a node. You stand up and the graph rises to a plinth.

**Build.** Plane detection and persistent anchors (home plate, wall, sideboard); the fingertip
latch and commit; the desk slate; the far-edge bar of filter and layer cards; a reading wall with a
backing plate and beams; a 25-row table with column histograms; stylus input if available.

**Questions it answers.** What is the fingertip miss rate in a 2 cm band over real wood? Is wall
text readable over passthrough on a backing plate, and is a 25-row read within 1.5 times a monitor?
Do anchors survive between sessions? Do arms stay rested over 40 minutes? Does ink count as a note
people come back to?

**Drop or pursue.** Drop table touch if misses exceed about 1 in 20; fall back to the ray. Pursue
the model as the long-session option if wall reading lands within 1.5 times the monitor and
comfort scores beat Cards on the Volume.

### Spike 7. Writing notes in the headset (no AI, about 3 days)

**You put on the headset and** leave the same note on Valjean four ways: with the Quest system
keyboard on sentence tiles, with a paired Bluetooth keyboard, with an MX Ink stylus, and (as a
separate, AI-flagged arm) with free dictation from an on-device transcription model. Then you edit
each note three ways: change one word, insert a clause in the middle, delete a sentence. You color
the node's group and look at it from inside before writing, so the note is written mid-task.

**Build.** Sentence tiles at least 3 degrees tall with an append field and a phrase sweep; the
system keyboard on a hidden input per sentence; paired-keyboard input to a real text field; stylus
ink with a typed title; an optional on-device transcription arm.

**Questions it answers.** Can "edit a note" get past awkward with no AI and no keyboard? How much
does a paired keyboard or a stylus change it? How many sentences will people write before taking
the headset off?

**Drop or pursue.** If no no-AI method gets an insert-a-clause edit within about twice the
desktop, notes beyond one sentence become a planned handoff to the laptop. If the paired keyboard
works, it becomes the recommended accessory.

### Spike 8. Point and Ask, Wizard of Oz (AI, bold, about 4 days)

**You put on the headset and** look at the 412-node graph. You point at a cluster and say "color
these by department and make the big ones bigger". Slot tiles appear under the request ([color by]
[department] [these 38]; [size by] [degree]) and a ghost shows the result; you pinch to commit, and
a palette ring and a size slider land on a rail beside you, where you nudge the size range by hand.
You point at a person and say "note: she bridges sales and support"; the note lands on her. You say
"undo just the color change" and a compensating step is proposed. A hidden operator, not a model,
turns your words into commands.

**Build.** Real: the pointing capture (index-finger ray, 3-second ray history, a 2 to 4 second
look-back binding window, pinch-to-lock), the slot tiles, the ghost preview, the instrument rail.
Faked: speech recognition and the language model, by an operator on a laptop who hears you and
sends commands to the page over a websocket from a fixed list of about 30 request types.

**Questions it answers.** How often does "this" bind to the wrong node at 412 nodes? Do people
point before, during or after the word? Do slot tiles catch wrong mappings before commit? For which
tasks does speaking beat the hand path, and for which is it slower? Are people comfortable speaking
in the room they are in?

**Drop or pursue.** Drop per-word pointing if binding errors exceed about one in five even with the
look-back window; keep AI for compound requests only. Pursue a real provider integration if
compound requests beat the hand path clearly and people trust the slot tiles.

---

## 9. Hard problems

**Functions no model gets past awkward.**

- **Opening a file from the laptop's disk** (core): every model goes through the headset's system
  picker, and the file is on the headset, not the laptop. What it would take: a send-to-my-desktop
  handoff (a pairing code, the project syncing both ways, an inbox for files and an outbox for
  pictures and notes). Until then, opening a laptop file is a planned handoff to the 2D page.
- **Exporting a picture** (core): in a headset there is no "current view" to export (which camera,
  which eye, from where you stand?), and the file lands in the headset's Downloads folder, not next
  to the slide deck. What it would take: a camera object that frames a shot from where you stand
  and composites the legend, plus the same outbox. With both, it rises to workable.
- **Editing a note** (core) without a keyboard or AI: the Quest system keyboard replaces the whole
  field on each opening and has no caret, so inserting, deleting or moving a clause takes several
  open-type-splice cycles; Vision Pro has no in-session keyboard at all. What it would take: a
  paired keyboard treated as first-class (it moves the cell to workable), a stylus, or AI
  dictation; or accepting that anything beyond two sentences is finished on the laptop.

**Functions that never get past workable.**

- **Find by name**, and **save under a name** in every no-AI model: a typed name means the
  system keyboard or a pick among candidates. A paired keyboard makes both natural.
- **Multi-select at real sizes**: at 2 m a node in a 400-node graph is under 1 degree wide, the
  size of hand-ray jitter; the best ray technique took 12 to 21 seconds per node on 50 to 200 nodes.
  What carries selection at size is rules, regions and the filter plane, and those are where the
  design effort should go.
- **Add a note**: one sentence is fine; more is not, for the same keyboard reasons.

**Problems that cut across the matrix.**

- **Reading speed.** Every timed headset-versus-desktop comparison found lookups slower in the
  headset (Huang 2023: 87.0 s against 58.5 s; Greffard 2011 and 2014: about twice as slow). Every
  N reading cell is provisional until measured within 1.5 times the desktop. Headsets win on
  accuracy for tangled structure (path tracing, triangle counting on dense graphs), not on lookup
  speed, so their advantage has to come from fast commands and from tasks where 3D is more
  accurate.
- **Session length.** Every model is a 20 to 40 minute focused-session tool beside the desktop,
  autosaving every step, with "resume on the laptop at exactly this step" as the normal exit. The
  honest handoff points: opening laptop files, wide data-cleaning tables, regular-expression
  search, the fixed-properties form of a layer, writing more than two sentences, comparing results
  to three decimals, and anything ending in "send this to a colleague".
- **Platform gaps.** Quest Browser has no Web Speech recognition, so speech means a recognizer the
  page ships. Vision Pro's WebXR has no in-session keyboard and no hover. WebXR has no body
  tracking, so waist and chest surfaces are estimated from head and wrists. HTML-in-Canvas (which
  would let the app's own React panels render in the scene) ships in no headset browser.
- **Element work, before any model.** graphty-element has XR sessions, hand tracking and an XR
  camera, but no in-headset UI (it draws only the HTML "Enter VR/AR" buttons, and @babylonjs/gui
  is not yet a dependency). Every model needs, in the element: an XR surface host (mount a panel,
  route ray, pinch and poke, anchor it, keep it across stance changes, cap live panels at about
  three at 72 Hz on a Quest 3); one declarative panel description, with `{ code, params }` text,
  that both the React shell and the XR host render; an in-page project store reachable in a
  session; a reserved selection cue; view history separate from undo; compensating-step undo; the
  stance contract; a closed-output text service; and a join command, which the session vocabulary
  still lacks.

---

## 10. Data preparation

Data preparation (importing, mapping columns, joining tables, fixing rows) was in scope as nice to
have. No surveyed VR tool prepares tabular data in the headset; every one imports from desktop
tools. The study did produce VR-native ideas, and a few are genuinely better in space than on a
page:

- **The key handshake** (catalog 15.3): hold one table's key column in each hand and bring them
  together; matches bridge the seam with a count and unmatched values droop below like loose
  threads. The droop is the unmatched set, visible before you commit, and twisting the strips
  changes the match rule (exact, ignore case, trimmed). Joining is a two-sided operation, and two
  hands fit it.
- **The crate** (15.4): a file arrives as a crate whose lid shows its format and row counts; a
  preview graph rises when you lift the lid; an unreadable file arrives cracked with its line and
  column on the crack. Checking before committing becomes a physical step that cannot be skipped
  without a modal dialog.
- **Cluster pucks** (15.6): a text column's distinct values float as pucks sized by row count,
  look-alikes clumped by deterministic similarity; squeezing a clump fuses it. Deduplication
  becomes sorting, which hands do well.
- **Graph overlay join** (15.10): carry a second dataset as a small graph into the main one;
  matching nodes lock with a click and the rest collect in a halo ring that becomes a set. It shows
  what the join means for the network, not just for the table.
- **Triage bins** (15.7) and **the recipe rail** (15.9): problem rows as cards tossed into Drop,
  Keep, Merge or Fix, with an "all like this one" corner; preparation steps as blocks you lift off
  to turn off and watch the graph re-derive.
- **Paper in** (15.14, AI): frame a printed table or a whiteboard network drawing in passthrough to
  import it, the one data source a headset has that a desktop lacks. It is blocked today: the Quest
  passthrough camera is documented for native apps only, not for WebXR.

Recommendation: keep wide row-level work (fixing hundreds of cells, regular expressions, a
40-column table) on the 2D page, reached by the desktop handoff; nothing here beats a monitor and
keyboard for it. The join handshake with its droop, and the crate's check-before-commit, are worth
a later spike after the core spikes, because they are the two places where space shows something
the desktop dialog hides. Every model already walks a join (task 8) once the files are open; the
real barrier is getting the files into the headset at all, which is the file problem of section 9.

---

## 11. Sources

### Studies of graphs and interaction in headsets

- Ware and Franck 1996: https://doi.org/10.1145/234972.234975
- Ware and Mitchell 2008: https://scholars.unh.edu/ccom/467
- Greffard, Picarougne and Kuntz 2011: https://doi.org/10.1007/978-3-642-25878-7_21 ; Greffard
  2014: https://doi.org/10.1109/3DVis.2014.7160095
- Kotlarek et al. 2020: https://arxiv.org/abs/2001.06462
- Huang et al. 2023: https://arxiv.org/abs/2301.11516
- Feyer et al. 2024: https://arxiv.org/abs/2307.10674
- McGuffin et al. 2022: https://arxiv.org/abs/2207.11586
- Kraus et al. 2020: https://doi.org/10.1109/TVCG.2019.2934395
- Whitlock et al. 2020: https://cmci.colorado.edu/visualab/3DPerception/3DPerception.pdf
- Sorger et al. 2021, egocentric network exploration: https://arxiv.org/abs/2109.09547
- Drogemuller et al. 2020: https://doi.org/10.1016/j.cola.2019.100937
- Joos et al. 2024, node selection in VR: https://doi.org/10.1145/3677386.3682102
- Joos et al. 2025, visual network analysis in immersive environments, a survey:
  https://arxiv.org/abs/2501.08500
- Lee et al. 2026, voice for immersive network analysis: https://arxiv.org/abs/2607.26526
- Takahira et al. 2026, immersive layouts of egocentric networks: https://arxiv.org/abs/2608.27194
- Oviatt 1999, ten myths of multimodal interaction: https://dl.acm.org/doi/10.1145/319382.319398
- Saktheeswaran, Srinivasan and Stasko 2020, touch and speech for network exploration:
  https://arxiv.org/abs/2004.14505
- AssistVR, speech and pointing for 3D selection: https://arxiv.org/abs/2410.21091
- "This is the Table I Want!", table transformation in VR (IEEE VIS 2023):
  https://arxiv.org/abs/2309.12168
- Worlds in Miniature (Stoakley, Conway and Pausch, CHI 1995):
  https://dl.acm.org/doi/10.1145/223904.223938
- Weissker, Franzgrote and Kuhlen 2024, multi-scale teleportation:
  https://vr.rwth-aachen.de/media/papers/252/scale-cam.pdf
- Husung and Langbehn 2019, portals and orbs: https://new-dl.gi.de/handle/20.500.12116/24583
- Efficient user resizing in VR (2026): https://dl.acm.org/doi/10.1145/3772363.3799288
- Toolglass and Magic Lenses (Bier et al. 1993): https://dl.acm.org/doi/10.1145/166117.166126
- Tangible Query Interfaces (Ullmer, Ishii and Jacob 2003):
  http://www.cs.tufts.edu/~jacob/papers/interact03.pdf

### Body, comfort and access

- Biener et al. 2022, a week of work in VR: https://arxiv.org/abs/2206.03189
- Hincapie-Ramos et al. 2014, Consumed Endurance (arm fatigue):
  https://dl.acm.org/doi/10.1145/2556288.2557130
- Penumudi et al. 2020, neck load and target angle in VR:
  https://www.sciencedirect.com/science/article/abs/pii/S0003687019302194
- ComforTable user interfaces (ISMAR 2022):
  https://static.siplab.org/papers/ismar2022-comfortable_user_interfaces.pdf
- W3C XR Accessibility User Requirements: https://www.w3.org/TR/2021/NOTE-xaur-20210825
- Meta accessibility, typography and panel guidance: https://developers.meta.com/horizon/design/accessibility/ ,
  https://developers.meta.com/horizon/design/panels/
- Meta locomotion comfort: https://developers.meta.com/horizon/design/locomotion-best-practices/

### Platform facts

- Quest system keyboard in WebXR: https://developers.meta.com/horizon/documentation/web/webxr-keyboard/
- No Web Speech recognition in Quest Browser:
  https://communityforums.atmeta.com/discussions/dev-quest/speechrecognition-in-webxr/1168273
- Microgestures in Quest Browser WebXR: https://mixed-news.com/en/meta-quest-micro-gestures/ ,
  https://www.uploadvr.com/meta-quest-sdk-v74-thumb-microgestures-improved-audio-to-expression/
- Quest mixed reality (planes, anchors): https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/
- WebXR layers: https://developers.meta.com/horizon/blog/achieve-better-rendering-and-performance-with-webxr-layers-in-oculus-browser/
- Vision Pro WebXR input: https://webkit.org/blog/15162/introducing-natural-input-for-webxr-in-apple-vision-pro/ ,
  https://developer.apple.com/videos/play/wwdc2024/10066/
- MX Ink in WebXR: https://logitech.github.io/mxink/WebXR/WebXrIntegration.html
- HTML-in-Canvas: https://github.com/WICG/html-in-canvas

### Tools surveyed

- Gravity Sketch history and scale: https://help.gravitysketch.com/hc/en-us/articles/5912754499997-Delete-Undo-and-Move-Through-Timeline-History ,
  https://help.gravitysketch.com/hc/en-us/articles/5912757661597-Scale
- Open Brush palette and tools: https://docs.openbrush.app/user-guide/painting-with-open-brush
- ShapesXR inspector, viewpoints and undo: https://learn.shapesxr.com/objects-manipulation/object-inspector ,
  https://learn.shapesxr.com/basics/viewpoints , https://learn.shapesxr.com/basics/undo-redo
- Arkio in mixed reality: https://support.arkio.is/hc/en-us/articles/7187427474205-Working-in-Mixed-Reality
- Substance 3D Modeler: https://roadtovr.com/adobe-substance-3d-modeler-medium-vr-modeling-pro-workflows/
- Quill: https://roadtovr.com/oculus-quill-is-spectacular-but-its-the-interface-that-surprised-us-the-most/
- Unity EditorXR: https://github.com/Unity-Technologies/EditorXR/blob/main/Documentation~/com.unity.editorxr.md ,
  https://skarredghost.com/2017/02/02/unity-vr-editor-review/
- Unreal VR Mode and Virtual Scouting: https://dev.epicgames.com/documentation/en-us/unreal-engine/vr-editing-legacy-tools ,
  https://dev.epicgames.com/documentation/en-us/unreal-engine/customizing-virtual-scouting-in-unreal-engine
- The Wild voice notes: https://thewild.com/blog/comment-tool-speech-to-text-annotation-vr-design-review
- VR Sketch: https://vrsketch.eu/docs-drawing.html
- Nanome MARA voice and its pointing gap: https://nanome.ai/blog/nanome-v2.4.0:-early-access-release-mara-voice-commands-minimization-chem-interactions-and-more!
- ChimeraX VR: https://www.cgl.ucsf.edu/chimerax/docs/user/vr.html
- syGlass voice commands: https://www.syglass.io/voice-command-list
- Horizon Workrooms review and discontinuation: https://skarredghost.com/2021/08/26/horizon-workrooms-review/ ,
  https://roadtovr.com/meta-horizon-workrooms-discontinued-2026/
- Vision Pro virtual keyboard: https://www.macrumors.com/2024/01/15/apple-vision-pro-virtual-keyboard-criticism/
- Flow Immersive AI: https://flowimmersive.com/flowai
- Tableau on Vision Pro: https://www.tableau.com/blog/exploring-spatial-computing-and-immersive-analytics-vision-pro
- BadVR: https://medium.com/badvr/seesignal-technical-challenges-of-visualizing-invisible-network-data-759dcd3ab7d3
- Virtualitics VR controllers: https://docs.virtualitics.com/hc/en-us/articles/23901845492371-Setting-Up-and-Using-VR-Controllers-Desktop
- Noda: https://roadtovr.com/noda-mind-mapping-tool-spatial-thinking-vr/
- Half-Life: Alyx interface: https://roadtovr.com/these-details-make-half-life-alyx-unlike-any-other-vr-game-inside-xr-design/
- Cities: VR and Little Cities reviews: https://mixed-news.com/en/cities-vr-review/ ,
  https://mixed-news.com/en/little-cities-review/
- Demeo: https://mixed-news.com/en/demeo-review-vr-co-op-role-playing-game/
- PatchWorld agentic patching: https://patchxr.com/blog/agentic-patching-ai-vr-music/
- MRTK hand menu: https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk2/features/ux-building-blocks/hand-menu?view=mrtkunity-2022-05
- Google Earth VR comfort (tunneling): https://developers.google.com/vr/elements/tunneling
- OpenRefine clustering: https://openrefine.org/docs/technical-reference/clustering-in-depth

### Repository

- graphty-element's XR code: `graphty-element/src/xr/XRSessionManager.ts`,
  `graphty-element/src/ui/XRUIManager.ts`; its undoable session commands:
  `graphty-element/src/session/commands/`.
