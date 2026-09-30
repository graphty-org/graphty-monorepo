# Scale levels

**Job.** Say, concern by concern, what graphty does at each scale level: the limits by name, what
each concern (node drawing, edge drawing, labels, layout, runs, style cost, memory) does at each
level, degenerate and small graphs, and how readable each style channel is at each size. **Not
here:** the size invariant and the scale rules these cells test (`state-matrix.md` 1 and 4); the
limits' values, which are graphty-element's (`element-needs.md`); place-by-state and
collection-by-count cells (`state-matrix.md` 3 and 7). **Owner:** interaction designer, with the
front-end architect. **Ceiling:** the README's table. **Validated by:** `state-matrix.md` 9, whose
fixtures cover these cells.

This document held sections 5 and 6 of `state-matrix.md` until that document passed its ceiling and
split by its growth rule.

## Concern by level

Scale is read per concern, and each concern is one of the kinds of 4.1.

## 1. The limits

Values are graphty-element's `DEFAULT_LIMITS` (`src/session/limits.ts`) and
`DEFAULT_EXACT_COMPUTATION_CAP_SECONDS` (`cost/estimate.ts`). **Cells cite a limit's name, never
its number**, so a changed ceiling moves every cell; their origin is `research/scale-measurements.md` 6.

| Limit | Kind | Basis |
|---|---|---|
| `renderCeiling` | capacity | measured once, one desktop, for memory and load time; no frame time recorded |
| `edgesDrawn` | capacity | measured once, as above |
| `largeGraphThreshold` | capacity | implemented, for layout only |
| `exactComputationSeconds` | capacity | implemented |
| `approximateAboveNodes` | capacity | declared; to be removed (`element-needs.md`, "`approximateAboveNodes` removed") |
| `selectionCap` | capacity | defect (`element-needs.md`, "A selection over the cap holds every id") |
| `graphMemoryBudgetBytes` | capacity | defect: no default, no reader |
| edge detail, label budget | legibility | proposed (`element-needs.md`, "The legibility boundaries") |
| mark size, color legibility | legibility | proposed (`element-needs.md`, "A readability level per style channel"); the color boundary is an extrapolation: the smallest mark Szafir (2018) measured is 0.25 degrees, about 10 CSS px at 60 cm, and that study does not compare palettes with ramps |

**How the element enforces each limit** is `element-needs.md`, "Scale, limits and the aggregate
view"; the drawing limit is a performance defect with a target, not a design constant (issues #388
and #405). Compute is calibrated per machine
(`calibrateCost()`); drawing is not. What the element is designed to hold in memory is
`element-contract.md` 8's.

## 2. What each concern does at each level

| Concern | Boundary (section 1) | Within | Reduced | Past the limit |
|---|---|---|---|---|
| Node drawing | `renderCeiling` | all drawn | -- (a node is never silently undrawn) | nothing drawn until a filter step narrows it (`state-matrix.md` rule 4.2) |
| Edge drawing | edge detail; `edgesDrawn` | all drawn with arrows and captions | arrows replaced by the dense direction form where no width or color binding conflicts (`element-needs.md`, "A direction form that stays legible"), else dropped with the legend saying direction is not drawn; then captions dropped | edges not drawn, counted; nodes still drawn |
| Labels | label budget | all, with collision culling | the selection, hover, hull and group labels (`canvas-drawing.md` 9), then the budget by one attribute, degree by default | the selection and hover |
| Layout | the element's layout estimate, which counts edges; until then `largeGraphThreshold`, `renderCeiling` | the recommended engine; every edge in scope pulls, drawn or not, and the Layout row says so when some are undrawn | a settling layout from random starts, off the frame loop (`state-matrix.md` rule 4.2) | no whole-graph layout; the filtered graph is laid out when drawn; an option edit held for Run layout past the live line, or with no estimate on a graph past `edgesDrawn` (`Scale/Layout/EdgeHeavy`) |
| Algorithms | `exactComputationSeconds` | exact | refused, offering Run exactly and the sampled method (`state-matrix.md` rule 4.10) | refused with fitting scopes |
| Selection mark | `selectionCap` | one mark per element | one hull with the count badge; every id held | the table and Find show it |
| Style cost | the element's repaint estimate for the stack against the live line (`state-matrix.md` rule 4.1) | every edit live, a drag previewing on every frame | -- | a drag or scrub applies on release, the layer row showing the repaint; never held; no style value changes |
| Table | -- | every row, virtualized | same | the default representation |
| Route that leads | `renderCeiling` | the canvas; Find second | same | Find, the offered steps and the table (IA 7) |
| Aggregate view | `renderCeiling` | -- | -- | the component-size list in Statistics; a component quotient; a partition's groups collapsed |
| Memory | a memory budget the element sets | the reading under Help > Memory usage, where Figma keeps its memory meter, since memory is the host's, not the graph's | a notice at 90%, as Figma's alert, with the routes; restorable values dropped first, as Values not kept; a value run exactly past the gate dropped last | the load or run that would not fit refused before it starts; never locked (crosswalk 4.1, "A file past its memory limit") |
| File size | the project store's reported capacity | autosaved | a caution as the estimate nears capacity | "will not be autosaved" at the load step, with the routes; Not saved from the first edit |

Whether a 5,000-node, 20,000-edge graph shows arrows depends on its median drawn edge length at
the fitted view, not its counts; the Medium fixture asserts both sides at two viewport sizes.

Fixtures: `Scale/<Concern>/<Level>`, two per boundary. Style cost uses Cliff with 1 and 19 layers,
and Cliff with a continuous mesh binding the reader set unbinned (an override,
`options-and-encodings.md` 5) that the repaint estimate must measure; the distinct-material count
is a separate capacity reading, not a level. Legibility and style-cost fixtures fail until the
element publishes the reading.

**Named fixtures.** Test graphs only, never on screen, from one seeded generator shared by
graphty-element's tests and both Storybooks (`element-needs.md`, "One seeded fixture generator",
which lists its variants for partitions, components, direction, weights, types, loops and parallel
edges). The size fixtures use preferential attachment, each new node attaching m edges, which sets
the capacity ceilings; legibility, overdraw, layout time and the label budget are measured on a
second family with community structure (a planted partition or LFR benchmark at the same n and m,
its mixing parameter named), because preferential-attachment graphs have none and would describe
the fixture, not an analyst's graph. Every fixture that tests a limit is defined from the
limit's name, not a number, so it moves with the ceiling; a boundary fixture is brought to its exact
count by removing edges or adding edges between random pairs, so it never depends on whether the
element compares with `<` or `<=`.

| Name | Nodes | Edges | m | Where it sits |
|---|---|---|---|---|
| Small | 300 | 1,200 | 4 | within every limit |
| Medium | 5,000 | 20,000 | 4 | within capacity; legibility depends on the view |
| Large | 1.5 x `largeGraphThreshold` | 10 x nodes, capped at `edgesDrawn` - 1 | 10 | over `largeGraphThreshold`, within both drawing ceilings |
| Cliff | `edgesDrawn` / 4 | `edgesDrawn` - 1 | 4 | one edge under the edge ceiling |
| CliffOver | `edgesDrawn` / 4 | `edgesDrawn` + 1 | 4 | one edge over it: the refusal twin |
| EdgeHeavy | 0.8 x `largeGraphThreshold` | 1.2 x `edgesDrawn` | 75 | past the edge ceiling only: a dense network, as a low-confidence protein interaction network is; offered the backbone presets (`element-needs.md`, "Backbone presets") |
| NodeHeavy | `renderCeiling` - 1 | 2 x nodes, capped at `edgesDrawn` - 1 | 2 | one node under the node ceiling; never measured for frame time |
| Huge | 250,000 | 2,500,000 | 10 | past every limit |
| Million | 1,000,000 | 5,000,000 | 5 | the design target's node count at half its edges, headless; the full edge count runs as a separate nightly headless check, `Scale/Memory/DesignTarget` |

**Which fixture each gate uses.** Drawing limits apply only where something is drawn; memory and
design-target refusals are the session's own and apply headless too (`element-needs.md`, "A stated
design target"). So the CI scale gate (`implementation-mapping.md` 11)
runs Small, Large, Cliff, CliffOver and NodeHeavy over the element, and Huge and Million over a
headless session.

## 3. Degenerate and small graphs

How each case is represented is `graph-conventions.md` 1 and 2; whether an entry is disabled or
carries a precondition mark is `state-matrix.md` rule 4.9.

| Case | Catalog | Statistics and histogram | Layout | Fixture |
|---|---|---|---|---|
| no edges | path, flow and centrality entries carry "no edges" | density 0; components equal nodes; degree a dot strip of zeros | circular; random above `largeGraphThreshold` (`session/layout.ts`) | `Scale/Degenerate/NoEdges` |
| one node | every entry but degree carries a precondition mark | one row; no histogram | the node at the origin | `Scale/Degenerate/OneNode` |
| isolated nodes and one 2-node component | as "no edges", except on the pair | components listed with their sizes | as "no edges" | `Scale/Degenerate/Pair` |
| only self-loops or parallel edges | entries that ignore self-loops say so on the row | self-loop and parallel counts beside density (`graph-conventions.md` 2) | as "no edges" when nothing else connects | `Scale/Degenerate/LoopsOnly` |
| directed, no reachable pairs | path entries return "no path" as a result, not an error | strongly connected components equal nodes | the recommended engine | `Scale/Degenerate/Unreachable` |

- **A measure under its minimum sample** (`graph-conventions.md` 4) carries a caution in the
  precondition slot. Basis: defect (`element-needs.md`, "`minMeaningfulNodes` on catalog algorithm
  entries"). Fixture `Scale/Degenerate/SmallSample`.
- **A partition's seed agreement** (`graph-conventions.md` 4) is absent until the element measures
  it. Basis: defect ("A partition-similarity measure"). Fixture `Scale/Degenerate/SeedAgreement`.
- **Ties on a small complete graph.** Every centrality ties; the reading says the values are all
  equal, where the shipped read says "5 of 5 sit at the lowest value, 0". Basis: defect
  (`element-needs.md`, "A result reading that says when every value is equal"). Fixture
  `Scale/Degenerate/Complete`.

## 4. Channel readability

The channel rows are `options-and-encodings.md` 2's. Readability is a legibility level keyed to the
boundaries of 5.1; "not drawn" is a capacity level. Cells are the default at the fitted view.

| Channel rows | Readable | Zoom to read | Not drawn |
|---|---|---|---|
| node color, size, opacity | at or above the color-legibility boundary (`element-needs.md`, the readability-level row; larger for a categorical palette than a ramp) | below it | past `renderCeiling` |
| node shape, outline, glow, wireframe, flat | at or above the mark size boundary | below it | past `renderCeiling` |
| node label and tooltip | within the label budget | beyond it: selection and hover only | past `renderCeiling` |
| edge color, width, opacity | below the edge-overdraw boundary (`state-matrix.md` 4.1) | past it | past `edgesDrawn` |
| edge line style, pattern, curvature, animation | at or above the edge detail boundary | below it | past `edgesDrawn` |
| edge arrows, edge label | at or above the edge detail boundary | dropped below it | past `edgesDrawn` |

The Not drawn column's fixtures carry Basis defect until `state-matrix.md` rule 4.2's needs land.
Readable size assumes 2D: in 3D perspective shrinks distant marks, and the element's size level
says so (`element-needs.md`, "A readability level per style channel").

A row whose channel some layer sets to a non-default value, and that cannot be read, stays in normal
ink with a "zoom to read" word in secondary ink, never dimmed, because a dimmed row reads as
disabled or unset (`visual-language.md` A3). Basis: unvalidated (the misreading test, section 9),
and a defect until the element publishes a readability level per channel. Fixture
`Scale/Channels/<Level>`.

**Canvas marks on small nodes.** The ring stack is capped by the node's screen size and rings drop
in the order `canvas-drawing.md` 6 fixes; marked elements draw last, and below the mark-size
boundary their rings start at half the boundary while the node keeps its data size (`canvas-drawing.md` 6). Fixture `Scale/Marks/SmallNodes`.

## Sources

- As `state-matrix.md`, Sources
