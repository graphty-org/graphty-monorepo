# The graphty design framework

graphty is a graph visualization and analysis tool. It is two packages. **graphty-element** is a
standalone web component that owns every graph capability: loading data, styling through style
layers, algorithms, layouts, selection, the tree of analysis results and the project file. The
**graphty app** is only the window around it: panels, menus and settings. A design that puts graph
logic in the app is wrong (`CLAUDE.md` at the repository root, "Architectural Principles").

This folder is the framework every screen, mock and API change is designed against. It settles,
before anything is drawn, what exists and what it is called (the conceptual model and the
glossary), how arguments are settled (the principles), where everything lives (the information
architecture), how things behave and look (the interaction patterns, the state matrix and the
visual language), and what graphty-element must publish to make all of that true, with the
decisions that are expensive to undo.

Two commitments shape all of it. **Figma is the paved path**: where the Figma editor has already
solved a problem, graphty solves it the same way, and every difference is listed with the reason
that forces it. **Graph objects are the work**: nodes, edges, sets and paths are what the analyst
selects and acts on, and the analysis vocabulary is the field's own (degree, betweenness,
PageRank, connected components), never a friendly substitute.

The design target is the intermediate analyst who opens graphty about once a week. Every other
skill level is served by aids everyone gets -- undo, working defaults, (i) icons on technical
terms, tooltips, the command palette, sample graphs and the documentation -- never by features for
one kind of user.

## The document set

The framework is being rebuilt from eight documents, three of which had grown into catch-alls,
into a set where each document has one job, a size ceiling and a clear edge with its neighbours.
`document-architecture.md` is the map while that happens: each document's boundaries, the test
that decides where a sentence goes, the order of work, and where every section of today's
documents moves. Read it before writing or editing any framework document. When the migration is
finished its map moves into this README.

Three rules hold the set together:

- **Documents own rules and reasons; code owns values.** Key chords, token values, style channels,
  option schemas, palettes and (later) strings live in code; a document points to them.
- **Every behaviour and place names its owner**: graphty-element, the app, or the element surfaced
  by the app. Anything a third party embedding the element would have to rebuild belongs to the
  element.
- **One home per fact.** A sentence that belongs in two documents is two sentences.

## Reading order

Read in this order; each document rests on the ones above it. "Exists" means the document is
there to read, though it may still be migrating; "Stub" means it holds only what moved into it and
the studio's starting positions; "To write" means it is planned. `research/archive/` keeps the long
forms that were split, as the record.

| #   | Document                      | What it settles                                                                                                  | Status   |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `top-tasks.md`                | What analysts come to do, ranked, with success measures                                                          | Exists   |
| 2   | `user-journeys.md`            | How a piece of work unfolds across sessions, in two or three journeys                                            | To write |
| 3   | `principles.md`               | How trade-offs are settled, and the fixed rules (accessibility, response times)                                  | Exists   |
| 4   | `conceptual-model.md`         | What exists: objects, operations, relationships, lifecycles, and which state is undoable and saved               | Exists   |
| 5   | `glossary.md`                 | What each concept is called                                                                                      | Exists   |
| 5a  | `graph-conventions.md`        | How every analysis reads a graph: declared and detected properties, weight roles, the standard statistics        | Exists   |
| 6   | `figma-crosswalk.md`          | How graphty's objects map onto Figma's, and every departure from Figma                                           | Stub     |
| 7   | `element-contract.md`         | What graphty-element publishes and does on its own, and the list of element changes still needed                 | Exists   |
| 8   | `information-architecture.md` | Where things live and how they are found; how the drawing, the inspector and the table relate                    | Exists   |
| 9   | `interaction-patterns.md`     | How things behave: patterns, modes, and every command with where it can be invoked                               | Stub     |
| 10  | `options-and-encodings.md`    | How large option spaces are controlled: style channels, algorithm and layout options, import and export settings | Stub     |
| 11  | `task-flows.md`               | The steps of each top task and end-to-end route                                                                  | Stub     |
| 12  | `state-matrix.md`             | What every surface does in every state, at every graph size and in every mode, with response budgets             | Stub     |
| 13  | `interface-specification.md`  | Templates as differences from Figma, row types, and which component does which job                               | Stub     |
| 14  | `content-design.md`           | Voice, copy conventions, word budgets and messages                                                               | Stub     |
| 15  | `visual-language.md`          | When graphty uses compact-mantine's tokens, and what the graph surface must look like                            | Stub     |
| 16  | `implementation-map.md`       | From specification to code: state ownership, data flow, modules, stories, traceability                           | To write |
| 17  | `one-way-doors.md`            | The owner's expensive-to-undo decisions, with recommendations                                                    | Exists   |

`research/` holds the evidence the documents cite. It is not authority; where a research note and
a framework document disagree, the framework document wins.

| Research note                                                   | What it contains                                                                                                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `research/figma.md`                                             | Figma's principles, object model, vocabulary and every surface, reverse-engineered from its documentation and the screen study in `design/ui/figma/`, with a verdict on what transfers |
| `research/graph-analysis.md`                                    | The visualization and network-science literature: the questions analysts ask, the standard terms, the analysis loop, what analysts keep, and how kept results behave                   |
| `research/graph-tools.md`                                       | How Cytoscape, Gephi, Neo4j Bloom, yEd, Kumu, Linkurious, KeyLines, NetworkX, igraph and others model the same concepts                                                                |
| `research/design-method.md`                                     | The methods the documents follow and the review checklist                                                                                                                              |
| `research/graphty-today.md`                                     | What graphty-element publishes today, what exists only in the app, and measured behaviour                                                                                              |
| `research/document-set-trials.md`                               | The routing trials behind the document set, the selection-halo contrast measurements, the cost of large selections, what is saved today, and an audit of the app's shell modules       |
| `research/key-insights.md`, `research/sets-in-graphty-today.md` | A digest of the research, and how sets work in the code today                                                                                                                          |

The personas and workflows in `design/designloom/` are the requirements base. They validate the
framework -- each placement and ranking is walked against them -- and never generate features.

## Where each part comes from

This table moves to `figma-crosswalk.md` when that document is written.

| Part of the framework | Taken from Figma                                                                                                                                                                                                                                                                                                                                             | From graph tools and graph-analysis research                                                                                                                                                                                                                                                                                                               | graphty's own                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen layout         | nav rail, left panel, canvas, right inspector, small bottom-center toolbar, command palette, bottom dock, header with one filled button, Minimize UI                                                                                                                                                                                                         | --                                                                                                                                                                                                                                                                                                                                                         | the filter chip in the slot of Figma's Design and Prototype tabs; one legend on the canvas; the attribute table in the dock (Cytoscape's table panel is the precedent)                                                       |
| Interaction           | selection drives the inspector; nothing selected shows the page (graphty's page is the graph); "+" adds with defaults and configures after; no confirmations, undo instead; one overlay at a time; popovers left of the inspector; context menu, palette and shortcuts as routes to one home; V, Ctrl+K, Enter and Shift+Enter, Shift+click, marquee, Escape | select from a histogram band (Cytoscape)                                                                                                                                                                                                                                                                                                                   | a count opens the table on what it counts; a click on a node always selects the node, never a group, because a node belongs to many sets                                                                                     |
| Rail and panels       | a rail button is a collection, never an activity; Pages above Layers as the model for Graphs above the object list                                                                                                                                                                                                                                           | --                                                                                                                                                                                                                                                                                                                                                         | what the rail holds, derived from the ontology: Graph, Results, Notes                                                                                                                                                        |
| Objects               | the tree holds only things with a body; definitions applied from property rows; commentary kept apart from objects; a named lasting definition made by a Create command (Create component becomes Create set, Ctrl+G)                                                                                                                                        | node, edge, graph, set, path, community, component (Lee et al., Saket et al., Ahn et al.); induced versus edge subgraph (NetworkX); results as attributes plus provenance (Gephi, Cytoscape)                                                                                                                                                               | the primary-object test; fixed and rule sets with a stated edge reading; the path as its own object type, stored as a set kind that keeps its walk; items of a result; notes anchored to graph objects, not canvas positions |
| Appearance            | style rows that look and reorder like Figma's Fill list; overrides reset per property; a bound value opens its definition                                                                                                                                                                                                                                    | visual mapping from data (Cytoscape styles, Gephi appearance); bypasses listed in one place                                                                                                                                                                                                                                                                | one ordered stack of style layers, top wins each channel; an automatic layer when a result first runs; highlights stack                                                                                                      |
| Vocabulary            | interface words (inspector, toolbar, command palette, Export); sentence case; verb plus object commands; named at birth, renamed in place                                                                                                                                                                                                                    | every graph and statistics term, spelled as NetworkX, igraph, Gephi, Cytoscape and Newman's "Networks" spell it                                                                                                                                                                                                                                            | short plain words only for concepts nothing else names (filter chip, working set)                                                                                                                                            |
| Analysis              | --                                                                                                                                                                                                                                                                                                                                                           | overview first and search first as equal entries (Shneiderman; van Ham and Perer); the degree distribution at rest; compute over a stated scope, never silently over a filter (Gephi's documented failure); store randomized results as values; never carry community names across a re-run automatically; weight read as distance, similarity or capacity | statistics of the graph at rest; the record on every run; freshness and scope marks on values; the run queue and cost bands; comparison surface; time as a filter window over a time attribute                               |
| History and file      | undo covers the document with no visible list; versions append; the file evolves by a version number and a tolerant reader; a reference outlives its target and offers Restore                                                                                                                                                                               | analysis provenance (Ragan et al.); undo as the safety net for exploration (Heer and Shneiderman)                                                                                                                                                                                                                                                          | data versions and Replace data; an append-only operation log; the project file's graph and session parts; identity rules for nodes and edges                                                                                 |
| Output                | the Export dialog over the whole file; an object's Export section names its object                                                                                                                                                                                                                                                                           | present equals export (Ragan et al.; Heer and Shneiderman)                                                                                                                                                                                                                                                                                                 | views capture working state and carry their own export settings; methods text written from the records                                                                                                                       |
| Help                  | (i) icons, tooltips with the shortcut, the Additional labels toggle                                                                                                                                                                                                                                                                                          | --                                                                                                                                                                                                                                                                                                                                                         | no wizards, coach marks or cards; the palette finds friendly synonyms as aliases ("brokers" finds betweenness)                                                                                                               |
| Default view          | --                                                                                                                                                                                                                                                                                                                                                           | 2D on a flat screen (Greffard et al.; Munzner)                                                                                                                                                                                                                                                                                                             | 2D, 3D, VR and AR on one toolbar button showing the current mode                                                                                                                                                             |

The single list of every difference from Figma, each with what forces it, is the departures table
in `principles.md`.

## Rules every document follows

- Plain ASCII; written for a reader who never saw how the documents were made.
- Every document opens with its job in one sentence, what is not in it, its owner, its size
  ceiling and how it is validated, and closes with its sources.
- Every screen word is a row in `glossary.md`; every published name changes only through
  `glossary.md` and `one-way-doors.md`.
- Every departure from Figma is a row in the departures ledger (in `principles.md` until
  `figma-crosswalk.md` exists).
- Every graph concept belongs to graphty-element. Where a surface needs something the element does
  not yet publish, the document names it in one line with its issue link, and the issue is listed
  in the element-needs ledger of `element-contract.md`.
