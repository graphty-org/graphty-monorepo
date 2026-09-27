# Task flows

**Job.** One mermaid flow per top task and per end-to-end route, with branches and the step count
from rest. A flow cites patterns and never defines behaviour; a step with no pattern means a
pattern is missing. **Not here:** work across sessions (`user-journeys.md`), behaviour
(`interaction-patterns.md`). **Owner:** interaction designer. **Ceiling:** 35 KB. **Validated by:**
cognitive walkthroughs against the workflows, and step counts against the success measures in
`top-tasks.md`.

**Status: stub.** Routes to write: each ranked task; comparison; time; import and re-map; replace
data; apply a recipe; export and report; expand from seeds.

## Received from the conceptual model

- **Expand from seeds** (`research/archive/conceptual-model-long-form.md` 5.2). Start from a few
  source nodes, Filter to selection, then Select neighbors grows the working set; hits beyond a data
  step are offered with Include found nodes. This is the expand pattern of Linkurious and Neo4j
  Bloom that the investigation personas come from.

- **Apply a recipe** (`conceptual-model.md` 8). After Apply, the binding step asks the analyst to
  confirm every weight slot and each mismatched level or declared property, and to bind or leave
  unbound each set and argument slot; everything unbound stays switched off and listed with the
  steps it blocks.

## Baseline from the studio

A walkthrough of "Fraud Ring Investigation" (`design/designloom/workflows/W06.yaml`) on a
1,000,000-node transaction graph with three expansion rounds counted 21 commands with the working
set, and 24 when every search reaches the full graph and each round needs an Include. The second
design also left the selection holding nodes that were not drawn, and made the methods text state
a data judgement the investigation never followed, so the working set stays
(`conceptual-model.md` 4.4). The 21-command count is the baseline this route is measured against.

## Received from the information architecture

Moved out of `information-architecture.md`. The two end-to-end routes are in full in
`research/archive/information-architecture-long-form.md` section 8, and are to be redrawn here as
mermaid flows.

- **Comparison and what-if** (8.1). Every Compare with... shows its answer where it was asked, and
  Save comparison keeps it. Seven cases: two readings (in the editor popover; from a column header,
  the table's Scatter view; with a randomized baseline); two selected objects (their inspector);
  from a set or group, a picker of its graph, "Without this" or another set; a what-if with
  Sources, direction and a Cut off count; every scenario at once through the "Without each of..."
  scope, sorted by the change in what it was launched from; keeping, as an item of the
  comparison result; two drawings on the comparison surface, matched by key, aligned, drawn with
  side A's style stack, led by a difference list.
- **Time** (8.2). Nothing about time appears unless the data has a time attribute. Declare the
  role; open the time slider, which adds one live Window step; run "Each of..." the windows to make
  a series; read the series editor's line chart, change points, trend and movers; compare with the
  previous window on the comparison surface; export as video or as views at successive windows.
- **Steps from rest** (10). Characterize 0; rank by centrality 2 (3 from the Graph panel); detect
  communities 2 to 3; find a node and its neighbourhood 2; take a note 1 to 2; filter then
  characterize 1 to 2; make the layout readable 1; colour or size by a value 1 to 2; create and
  combine sets 1; compare 0 to 2; shortest path 2; reuse an analysis 2; load and export 1. These
  were counted with the rail opening on Results while nothing is kept; the rail now always opens
  on Graph (`information-architecture.md` 5), so tasks 2 and 3 cost one more step on a fresh
  project until recounted.
- **Why the Path tool keeps a toolbar slot** (10). It is the only operation whose input is pointing
  at two things, and three investigation workflows start from an unselected node. A count of how
  often the first endpoint is not already selected decides whether it stays
  (`research/study-schedule.md`).

## Sources

- `research/archive/conceptual-model-long-form.md` 5.2, 5.3
- `design/designloom/workflows/W06.yaml`
- Nielsen Norman Group, "User journeys vs. user flows", cited as in `document-architecture.md`
