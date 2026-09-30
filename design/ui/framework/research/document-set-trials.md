# Document set trials and measurements

Evidence gathered while the framework's document set was being settled (September 2026). It is
cited by `document-architecture.md` and by the documents that will own each fact. It is evidence,
not authority. The scripts that produced these numbers were run outside the repository and were
not kept; the numbers, the method and the limits of each are recorded here so the runs can be
repeated.

## 1. Routing trials: does each sentence find exactly one document?

The set is only useful if a writer can tell, for any sentence, which document owns it. Two
trials put real sentences through the routing test.

**Sample.** Every sentence of `conceptual-model.md` 5.2 (filters) and 6.1 (style layers), split
at periods and semicolons (57 units), plus 14 sentences about "colour nodes by an attribute, read
the legend, size nodes by Degree" taken from `information-architecture.md` (lines 566, 866-867,
940-941), `element-contract.md` (line 326) and `top-tasks.md` (line 116).

| Test | Units | One home | Two or more | No home |
|---|---|---|---|---|
| Ordered list of 13 questions, first "yes" wins | 48 (5.2 and 6.1 only) | 27 (56%) | 19 (40%) | 2 (4%) |
| Faceted test with nine kinds | 71 | 53 (75%) | 16 (23%) | 2 (3%) |

**Why the ordered list failed.** The first "yes" wins, so an early question captures sentences
that belong later. The question "does it name an operation?" sent step sequences ("start from a
few source nodes, Filter to selection, and Select neighbors grows the working set") to the model
instead of task flows. The principles question captured behaviour at scale ("never samples
silently") before the state-matrix question was asked. Precedent from tools other than Figma had
no home at all.

**What the faceted test fixed.** Step sequences went to task flows, precedent went to research,
behaviour over the drawing limit went to the state matrix, and rows of the style-layer list went
to the interface specification.

**Why the faceted test still failed.** Five gaps in its list of kinds, and compound sentences:

- no kind for a correspondence with Figma ("automatic paint ... are departures from Figma");
- no kind for an encoding or legend rule ("the one legend covers the channels that are visible
  and not covered");
- "fact about an object" does not separate the model from the element contract;
- "wording" covers both terms (glossary) and strings (content design);
- "placement" does not separate a place from a region inside a place ("the legend sits in the
  canvas corner away from the toolbar").

The other 13 two-home units each held two facts, usually a model fact plus a screen string
("stays in the list marked 'covered by Color by logFC'"). Splitting them is mechanical. With the
five gaps closed and compound sentences split, one unit stays unclear ("The kind is visible
because it changes what searches cross").

## 2. The default selection halo against data colour

**Setup.** The element's default halo is `#FFD700` at opacity 0.4 and scale 1.45
(`graphty-element/src/config/GraphStyle.ts`), drawn as a tint over the node. It was drawn over the
element's "okabe-ito" categorical palette on 50 nodes, on the light canvas (`#F5F5F5`) and the
dark canvas (`#1E1E1E`), and contrast was computed with the WCAG relative-luminance formula.
39 palette colours were checked: every built-in categorical palette in
`graphty-element/src/catalog/palettes.ts` plus the "other" grey `#505050`.

**Today's halo.**

- Light canvas: the ring blends to `#F9E993`, 1.13:1 against the background (WCAG 1.4.11 asks
  3:1), and 1.08:1 against the yellow category.
- Dark canvas: 3.01:1 against the background, 1.07:1 to 2.46:1 against individual categories.
- The tint changes the node's colour. Blue `#0072B2` becomes `#669A6B` (CIE delta-E 19 from the
  green category, 67 from its own colour); vermilion becomes `#E68E00` (10 from orange); black
  becomes olive. A selected node reads as a different category.
- The palette's black category is nearly invisible on the dark canvas even when nothing is
  selected.

**Remedies, each drawn as a ring behind the node so the node keeps its colour.**

| Remedy | Result |
|---|---|
| Any single colour, either theme | Impossible: no luminance clears 3:1 against both black and the palettes' mid-tones, even for Okabe-Ito alone |
| Outline only, today's gold | Fails: 1.29:1 on the light canvas; 27 of 39 palette colours under 3:1 |
| Best reserved colour per theme | Fails: light `#002244` leaves 8 of 39 under 3:1; dark `#FFFFFF` leaves 18 of 39 |
| Two-tone ring, dark outer (`#000000` or `#1A1A1A`) and white inner | Passes under WCAG technique C40 (at least one tone clears 3:1 against each neighbour); weakest case 4.82:1 (`#0077BB`, black outer) or 4.45:1 (`#EE3377`, `#1A1A1A` outer). Under a stricter reading (inner tone alone against the node) 18 of 39 fail |

## 3. What a large selection costs

- The cap is a constant: `DEFAULT_SELECTION_CAP = 5000`
  (`graphty-element/src/session/selection/SelectionApi.ts:54`). `GraphSession.ts` passes no cap
  source, so nothing can raise it.
- `session.calibrate()` does not exist; `graphty-element/src/session/limits.ts` says so, and its
  six limits are shipped defaults, not measurements.
- Each selected node gets its own instanced mesh (`Node.ts`, `showOverlay`); deselecting only
  disables it.

Measured in headless Chromium on a software renderer (SwiftShader), one sample each, on a branch
with the large-graph load fix (master did not finish loading 20,000 nodes in 590 s):

| Graph | Halos on | Time to switch on | Scene meshes | Median frame: before, with halos, after switching off |
|---|---|---|---|---|
| 20,000 nodes | 5,000 | 127 ms | 40,001 -> 45,002 | 2.4 s, 2.8 s, 3.2 s |
| 20,000 nodes | 20,000 | 200 ms | 40,001 -> 60,002 | 1.66 s, 3.16 s, 3.18 s |
| 100,000 nodes | -- | -- | -- | did not finish loading after about 30 minutes |

Frame times are good only as ratios. The cost that grows with a selection is one mesh per
selected node that is never freed, which makes the cap a guard against a defect in the element,
not a property of scale. A GPU run with batched halos has not been done.

## 4. Can the table show data and style together?

`styles.explain({ node })` (`graphty-element/src/session/styles/explain.ts`) returns the value
each channel painted, the layer that won each channel and whether it was fixed or encoded. Two
gaps:

- `ChannelExplanation` (`explain.ts:66-77`) does not publish the attribute path or the input
  value, although `explainStyle` reads both. A column reading "colour <- data.cat = b" would have
  to rebuild the link from `styles.get(layerId).encode[channel].by` in the app, which is a
  workaround.
- There is no bulk read of resolved values. `explain.ts` records 47 ms to build a full resolved
  style at 50,000 nodes; sorting by an encoded value would take one call per row.

## 5. The app's shell modules on master

| Module | Verdict |
|---|---|
| `graphCommands.ts` | Works around the element: zoom step branches on 2D or 3D, and zoom to selection reads a Babylon.js mesh. Issue #545 |
| `readings/readingFormat.ts` | Works around the element: modularity bands 0.1 and 0.3 hard-coded. Issue #546 |
| `readings/nodeMetricReading.ts` | Consumes; one stale comment about betweenness direction (app fix) |
| `readings/graphSummaryReading.ts` | Consumes; waits on the node-type role (issue #299) |
| `readings/communityReading.ts`, `runRecord.ts`, `defaults/encodingReport.ts` | Consume |
| `insights/insightsRules.ts` | Consumes; `NARROW_VIEW_NODE_FLOOR = 50000` should come from the element's limits (app fix) |
| `insights/insightsMemory.ts`, `defaults/accelerationSettings.ts` | Reader preferences in localStorage |
| `defaults/loadDefaults.ts`, `styleDescriptors.ts` | Consume; the top-N label cut is already an element selector (#166) |

## 6. What is saved today

There is no project file (issue #301) and the app never calls `toDocument()`. Source:
`.worktrees/element-undo/design/undo/inventory-persistence.md`, checked against master.

| State | Saved today |
|---|---|
| Topology, direction, attributes, import report, coordinates, pins, layout choice, runs, result values | No |
| Style stack, including automatic layers | Element export only (`session.styles.toDocument()` / `applyTemplate()`) |
| Filter, time window, show-context | No (undoable in the undo design) |
| Saved scopes | No (the sets branch plans one serialiser) |
| Camera presets (saved views) | Element export only (`exportCameraPresets()`) |
| Configuration document (id paths, background, view mode, selection style) | No (read, never written back) |
| Selection | No |
| Notes, groups, bookmarks | Do not exist |
| Panel layout, canvas, labels, insights, acceleration | App localStorage, reader preferences |

## 7. Two desk walks

**Recipe entry points.** Six scripted tasks walked through two trees (not a participant study):
a Library place on the nav rail, and recipes reached only through Open and New. Open and New
failed "apply a colleague's overview recipe to the loaded graph" and "swap the overview recipe on
a 500,000-node graph without reloading", because a recipe keeps the data and changes the
analysis, and New means reloading. The Library place was premature: no collection of saved
recipes exists yet, and the Results panel already uses "library" for the algorithm catalogue.
The walk suggests two commands, "New from recipe" and "Apply recipe", and no rail place.

**Canvas facts.** Every fact group in `design/ui/figma/canvas-selection/README.md` found a home in
interaction patterns, a fixed rule, the visual language, the interface specification or the
element contract. Rejected: resize and rotate handles, the size badge, Alt measurement, auto-layout
handles, vector editing, the pixel grid, multiplayer. Nothing Figma shows covers edge hit-testing,
labels on dense graphs, or halo legibility over data colour; those belong to the state matrix
and the visual language.

## 8. Rule sets and Figma's component and instance

`.worktrees/element-sets/design/sets/undo-integration.md` (section 2 and 3): `set.redefine` is one
undoable command; members are recomputed, not stored; the sets recompute step repaints every
layer and filter that names the set within the same step. So editing a rule updates its members
in one step, as editing a main component updates its instances. Differences: a member has no
per-instance override, and hand edits to a fixed set's members are a separate command
(`set.members`).
