# Object-first graphty: a UX exploration

This folder is a design exploration of a graphty app organised the way Figma is organised:
around the things you have made rather than around activities. In graphty the things you make
from the data are groups, paths, rankings and filtered sets, not drawings; the left panel is a
tree of those objects, the toolbar holds the tools that make them, and the right panel is the
inspector of the selected object, where its appearance (its "Fill") is one property among
others and is stored as a style layer. Nothing here changes the app or graphty-element; it is
mocks, an analysis and a proposal for a conversation.

The starting point is the comparison of the current app with the Figma editor in
`/home/apowers/Projects/graphty-monorepo/tmp/ux-review/graphty-vs-figma-ux.md`, and the
measured study of Figma in `/home/apowers/Projects/graphty-monorepo/design/ui/figma/`.

**Where the design stands: round 3.** Round 2 (`round-2/`) settled the frame, the object tree,
the inspector, the toolbar and the timeline in fifteen screens. Round 3 (`round-3/`) found 99
functions the app needs, or a reader needs for analysis and drawing, that round 2 never drew
(the plainest: after the first load, no screen showed how to open another file), and draws every
one: screens 16 to 102 in `mocks/v2/`, beside screens 1, 13 and 14 redrawn. Start with
`round-3/revision-round-3.md` (what was missing, the design area by area, the element work
sized, the decisions for the owner), then `proposal.md` section 6 and `analysis.md` section 9,
then the gallery `mocks/v2/index.html`, grouped by area. Round 2's design is still the base:
`round-2/answers.md`, `round-2/revision.md` (its section 10 points at round 3) and the round-2
sections of `proposal.md` and `analysis.md`. `mocks/screen-1..8` are round 1, kept for history.

## Viewing the mocks

The mocks are plain HTML files that need no build. Open `mocks/index.html` (which links the
round-2 gallery `mocks/v2/index.html` first) through a local static server started with the
servherd MCP, so the font file next to the pages loads:

```jsonc
servherd_start({ name: "object-first-mocks",
  cwd: "/home/apowers/Projects/graphty-monorepo/design/ui/object-first-ux/mocks",
  command: "python3 -m http.server {{port}}" })
```

Then open `http://<host>:<port>/index.html`. Each index shows every screen at reduced size
with its caption and a link to the full-size HTML and PNG. Stop the server with
`servherd_stop` when done. (The PNGs can also be opened directly; they are the frames at
1440 x 900 plus a 60 px caption strip.)

The round-2 mocks are generated: one spec per screen in
`design/ui/object-first-ux/gen/screens/`, one renderer, one
kit (`mocks/kit.css`). Rebuild everything with `node design/ui/object-first-ux/gen/build.mjs`, or one
screen with `node design/ui/object-first-ux/gen/build.mjs 8`; the generator's README explains the
spec. Never edit a `mocks/v2/*.html` by hand. The round-1 screens were built by hand and
re-shot with `node design/ui/object-first-ux/gen/shoot-screen.mjs <n>`.

## Index of documents

Every document defines its terms at the top and stands alone.

### Round 3 (current)

| File | What it is |
|---|---|
| `round-3/revision-round-3.md` | The round-3 design in one place: what was missing, each area's rules with its screens, the new surfaces, the round-2 sections it amends, the graphty-element work by size, and five decisions for the owner. |
| `round-3/gaps.md` | The gap register: all 99 gaps with where each came from, why it is key, what round 2 had, and the screen and section that now resolve it. |
| `round-3/file-project.md` | Files, projects and sessions: the file menu, unsaved work, save and reopen, autosave, recipes, two graphs, Settings (screens 13, 16-21). |
| `round-3/import.md` | Getting data in: the one Import dialog and its sources, Into, options, failures, progress, large files, databases, reload (screens 1, 14, 22-32, 101). |
| `round-3/data-editing.md` | Editing and joining data: import report, load rules, column menu and operations, join and identifier mapping, formulas, editing, removing, merging, expanding, adding by hand (screens 33-42). |
| `round-3/history-errors.md` | Undo and History, the object menu, failed runs, stale results, a lost view, empty results (screens 43-48, 102). |
| `round-3/navigate-select.md` | Right-click menus, Find, framing and 3D, minimap, saved Views, follow, selecting many, edges, Focus, the keyboard; the settled key set (screens 49-58). |
| `round-3/filters-sets.md` | Filters by values, range and rule, edge filters, patterns, neighbours, combining, members, all routes, editing a Set (screens 59-68). |
| `round-3/analysis-results.md` | Values, scatter plots, groups, summary graphs, the record, batches, scope, findings, removal impact, comparison, time, notes, the Assistant (screens 69-82). |
| `round-3/visualization-export.md` | Layout, pinning, the canvas look, labels, hover, palettes, channels, saved styles, the Export sheet, Present, VR (screens 83-100). |
| `mocks/v2/index.html` | The gallery of all 102 screens, grouped by area. |

### Round 2

| File | What it is |
|---|---|
| `round-2/answers.md` | The owner's round-2 feedback, each point quoted and answered with the decision, the evidence and the screen that shows it; what is still open. |
| `round-2/revision.md` | The round-2 design: the frame (no rail), the inspector's tabs and row budget, every toolbar button and flyout, running an algorithm step by step, styling of continuous and group values and how paths layer, the timeline and every other capability, the element work; section 9 is what the walkthroughs and the measured audit changed. |
| `round-2/screens.md` | The specs of the fifteen round-2 screens, row by row, and the kit additions. |
| `round-2/decisions.md` | Every round-2 choice with its reason and whether it is reversible or one-way once built. |
| `round-2/coverage.md` | Every inventory capability placed in the round-2 design, with its mock, fit and element gap; 341 rows. |
| `round-2/critique-novice.md`, `round-2/critique-maintainer.md` | The two critiques of the first round-2 draft (a first-time reader; the element's maintainer checking every "today"). |
| `round-2/walkthroughs.md` | A novice's first ten minutes and an analyst's week on the round-2 screens, click by click; twenty findings, addressed in `revision.md` section 9. |
| `round-2/consistency-audit.md` | The twelve first-pass round-2 mocks measured from the DOM against the kit and the Figma study; thirty findings, the blocker and majors fixed in the generator (`revision.md` 9.2). |
| `mocks/v2/index.html` (first group) | The fifteen round-2 screens: 1 nothing loaded; 2 loaded, the Dataset's tabs; 3 a Group's Style tab; 4 Rank armed with the bar, flyout and popover; 5 computing beside waiting; 6 a Measure's encoding; 7 a Grouping's palette with an override; 8 two Paths as edge styles; 9 a node with the table dock; 10 the timeline; 11 the toolbar reference sheet; 12 screen 3 in dark; 13 Settings (drawn in round 3); 14 the Import dialog; 15 reload keeping the objects. |
| `mocks/kit.css`, `mocks/kit.html` | The one kit both rounds are drawn from (round-2 and round-3 additions at its end). |

### Round 1 (history)

| File | What it is |
|---|---|
| `proposal.md` | The recommended UX on one page, the decisions the owner must make, what to prototype first, and the risks; section 5 is round 2's summary (what changed, settled and open decisions, the element work sized, the rough edges). |
| `analysis.md` | The analysis: the objects, the interaction model, the visual language, how consistency and restraint are achieved, the rough edges with options and recommendations, the feature-fit review summarised, and the element work sized; section 8 is round 2. |
| `object-model.md` | The one model the mocks are drawn from: the object taxonomy, the tools, every inspector row by row, states, nesting and precedence, the eye and Focus, selection, where every non-object capability lives, the element gaps, and 28 decisions with the reason for each. |
| `mocks/index.html` | The gallery: a pointer to the round-2 gallery first, then the eight round-1 screens and the kit. |
| `mocks/screens.md` | The spec of each screen: purpose, exact state, every panel row by row, and the interaction it illustrates; with a revision note after the consistency audit. |
| `mocks/screen-1.html` to `screen-8.html`, `.png` | The eight stills (1: nothing loaded; 2: loaded, nothing selected; 3: a Group selected with its Fill; 4: a node selected; 5: the Path tool mid-flow; 6: a Measure selected; 7: the table dock and a rule being built; 8: screen 3 in the dark theme). |
| `mocks/kit.html`, `mocks/kit.css`, `mocks/kit-light.png`, `mocks/kit-dark.png` | The mock kit: every token, type role, row, control, menu and panel part, with the Figma measurements they come from. |
| `critique/novice-walkthrough.md` | A first-time reader (the Explorer persona) played through five tasks on the mocks alone; a discoverability score per task and 17 findings. |
| `critique/analyst-walkthrough.md` | A weekly analyst played through a real week of work (import, two algorithms, a combined filter, a comparison, restyling, new data, saving) against Gephi and Tableau; 19 findings. |
| `critique/feasibility.md` | Every row of every mock checked against graphty-element's session API as it stands: what backs it today, what is missing, sized; the three rules of the root CLAUDE.md checked; 20 findings. |
| `critique/rough-edges.md` | The ten places the paradigm fits awkwardly (overlapping membership, stale objects, long-running creation, measures as Fill, the node inspector, edges, undo, large graphs, 3D and XR, the assistant), each with options, a recommendation and the first prototype. |
| `critique/consistency-audit.md` | Every screen measured from the DOM against the kit and the Figma study: what is drawn the same everywhere, what is not, and what is on screen that nobody asked for; 30 findings, four blockers (now fixed). |
| `feature-fit/1-data.md` to `7-.md` | One table per area placing every current and proposed capability of graphty-element and the app in the model: data in and out; selection, filters and sets; algorithms and results; layouts; styling; camera, 3D, XR and sharing; the assistant, commands, notes, undo, keyboard, events and persistence. Each ends with what does not fit and the element gaps it needs. |
| `inventory/element-capabilities.md` | Everything graphty-element can do today and is proposed to do, with the API behind each capability and what kind of thing it produces. |
| `inventory/app-today-and-personas.md` | What the current app draws, which of it works, and what the personas and workflows in `design/designloom/` ask for. |
| `models/tree-first.md`, `models/task-walkthrough-first.md`, `models/element-api-first.md` | The three candidate models the final object model was merged from: one derived from the tree, one from walking the 25 workflows, one from the element's session API. Kept for the reasoning; superseded by `object-model.md`. |

The screen generator is committed in `gen/` (its README lists every spec key), with the round-1
screenshot script `gen/shoot-screen.mjs`. The one-off audit and layout scripts the older rounds
cite under `tmp/object-first/` were scratch work and are not kept; the tables they produced are
in the documents.
