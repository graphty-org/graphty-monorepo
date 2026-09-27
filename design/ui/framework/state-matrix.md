# State matrix

**Job.** Say what every surface does in every state, scale class and mode, with response budgets.
It is a test instrument: each cell is one line naming the rule that applies and the document that
owns it, and each cell becomes one Storybook story. **Not here:** strings (`content-design.md`),
object lifecycle states (`conceptual-model.md`), the rules themselves. **Owner:** interaction
designer, with the front-end architect. **Ceiling:** 40 KB; a cell that needs prose has taken on a
second job. **Validated by:** every cell points to a template and, once built, a story.

**Status: stub.**

## Received from the conceptual model

- **The drawing budget** (`research/archive/conceptual-model-long-form.md` 5.2). A client whose
  drawing budget the filtered graph exceeds says so and draws nothing until the analyst narrows it
  with a search, a working set or a filter step; it never samples the drawing silently. Statistics,
  the table and every run still work, because the session is headless. The status line carries only
  what is not drawn ("300,000 not drawn").

## Axes the matrix will use

- **Scale classes, named by the mechanism that fails** (`document-architecture.md` section 2, item
  11): everything drawn and every list browsable; over the selection cap but drawable; over the
  drawing limit (not drawn, the table leads); does not load. Known constants: `DEFAULT_SELECTION_CAP` 5,000
  (`graphty-element/src/session/selection/SelectionApi.ts:54`, one mesh per selected node, a defect
  rather than a scale limit) and `largeGraphThreshold` 10,000 (`session/limits.ts`). Other numbers
  read "unmeasured" until a calibration run.
- **Edges and hubs, not node count alone.** The drawing budget and neighborhood expansion both key
  on edge count and maximum degree: in a scale-free graph a hub above the 99th percentile of degree
  turns one 2-hop Select neighbors into most of the graph.
- **Small graphs are a state too**: no aggregation, and a warning where a statistic means little at
  that size (a degree distribution over 12 nodes).
- **Collection sizes**: 0, 1, a few, many and very many, for style layers, runs, sets, notes, saved
  views, graphs, attributes, categories in an attribute and filter steps. For the layer list the
  starting position is three collapsible sections (automatic, the analyst's, Overrides), with search
  in the panel header past about 20 rows; no workflow yet produces more than 20 layers.
- **Option schemas**, from a single parameter to a large one.
- **Surface states**: blank, loading, partial, ideal, error, out of date, running, over the drawing
  limit, disconnected source, read-only.

## Received from the information architecture

Moved out of `information-architecture.md`; full text in
`research/archive/information-architecture-long-form.md` under the section named.

- **Run states on a result's row** (3). Queued; running with progress and Cancel; Failed; Out of
  date. Two runs can be in flight. The pinned strip above the Results list holds every result the
  element reports as failed, or with a freshness other than current (out of date, cannot re-run,
  detached, unresolvable; `sets-design.md` 5.3); pinned rows keep their latest-run order among
  themselves, and pinning never reorders the list below. A different scope is not out of date, so
  changing the filter chip pins nothing; a reimport pins every result at once.
- **Style-layer count classes**, measured from how runs add layers (`session/styles/derive.ts`,
  `autoApply.ts`): 8 or fewer, the ordinary state; 9 to 15, a realistic heavy session (a Look plus
  three to five runs); over 15, reachable only through hand-written or imported layers, the edge
  case. The stack's home never changes with the class.
- **The empty object list** (3). With nothing kept, the Graph panel's object list shows its
  creation verbs and a route to Results; the Graphs section always has a row.
- **Conditional presence** (3, 8.2). The catalogue's time rows, the time slider and every Over
  time... exist only when the data has a time attribute. The Assistant rail button exists only when
  a provider is configured.
- **The result editor at a short window** (4): top items drop from 5 to 3, the chart folds to a
  toggle, the body scrolls under a fixed header; name, state line and marks never collapse.
- **The whole component fails** (appendix): a message on the canvas with Details and Restart
  viewer, which restarts graphty-element on the saved project.

## Sources

- `research/archive/conceptual-model-long-form.md` 5.2
- `document-architecture.md` section 2, item 11 and section 7.4
- `graphty-element/src/session/selection/SelectionApi.ts`, `src/session/limits.ts`
- Hurff, "Why your user interface is awkward" (the UI stack), cited as in `document-architecture.md`
