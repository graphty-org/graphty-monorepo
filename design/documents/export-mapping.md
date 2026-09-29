# Export mapping

How graphty-element writes a style's appearance and algorithm results into other tools' formats
through graph-io, what is lost, and how the loss is reported. The three kinds of file format this
page moves between are described in README, "Three things called a file format".

## The decision this implements

The owner decided on 2026-09-28 what an export contains: "whatever the format supports". So:

1. An export carries everything the chosen format can represent: the data's attributes, the drawn
   positions, algorithm results as node and edge columns, and the drawn appearance of each element
   wherever the format has a place for it.
2. Everything the format cannot represent is reported as a loss note before anything is written. It
   is never dropped silently.
3. The export API is graphty-element's; the writers are graph-io's. This page specifies what an
   export contains, not the API's name or signature. Comparing a replay does not wait for it: a
   run's results are read in the session with `session.results.get(runId)`, which graphty-element
   2.x already has (recipe.md, "Same data, same results").

## The export model

graph-io's exporters take a graph-format snapshot and nothing else (`GraphExporter.export(snapshot,
options)`, `graph-io/src/types.ts`). Each declares `ExportCapabilities` -- among them `positions`
(it can write positions) and `viz` (it can write the visual roles color, size, shape and
thickness) -- and reports `LossNote { code, message, column, count }` from `check()` before writing.
So an export is two steps:

1. **Build the export snapshot.** graphty-element builds a snapshot whose columns are the imported
   attributes, the drawn positions (the `position` role), one column per result field of each
   included run ("Results as columns"), and the drawn appearance of each element as the `color`,
   `size`, `shape` and `thickness` role columns when the format's `viz` is true ("Drawn
   appearance").
2. **Write it** through the format's graph-io exporter, returning graph-io's loss notes plus the
   notes graphty-element adds for what it did not put in the snapshot. Both use graph-io's
   `LossNote` shape unchanged.

## Results as columns

Each included run contributes one column per published field of its result, per element kind.

1. **Column name** `<run>.<field>`: `influence.value`, `groups.group`, as the owner decided. A run a
   recipe produced is named by its `as`, without the namespace; a run started by hand without a
   name is named by recipe.md's rule ("Recording" rule 4: `pagerank`, `pagerank_2`), so a script
   reads the same column after a parameter is tuned. The naming is a contract for scripts in R and
   Python, and the extension-point specification uses the same form.
2. **Collisions are refused.** When two included runs would give one name (a recipe applied twice),
   or a result column would take the name of an imported column, the export is refused before
   anything is written, naming each collision, unless the caller supplies names: an option of the
   export mapping a run id to the name its columns take (`{ "hub_genes2__hubs": "hubs_again" }`
   gives `hubs_again.value`). A supplied name follows the rules of `as` (recipe.md, "Commands" rule
   2), and one that still collides is refused the same way.
3. **Reading one back.** Imported again, such a column is an ordinary column whose name contains a
   dot, read as `data.influence.value` (column names are flat, README "Three things called a file
   format").
4. **Name limits.** GEXF, GraphML, CSV, the JSON dialects, DOT and Neo4j hold the dotted name as
   written. GML keys are letters and digits only, and Pajek has no named attribute columns; for
   those two each result column is reported with `W_GRAPHTY_RESULT_NAME` and the name graph-io gave
   it.
5. **Roles.** A result field that is a partition is given graph-format's `community` role, a rank
   the `rank` role, a component the `component` role, so formats that map roles place them. A
   snapshot allows one column per role per table, so the role goes to the first run that claims it
   and every later claimant is written as a plain column, reported with `W_GRAPHTY_ROLE_TAKEN`.
6. **Graph-level fields** of a result (`min`, `max`, `mean`, the normalisation used) and each run's
   precision and exactness are written as graph-level attributes `<run name>.<field>` where the
   format has them, and reported with `W_GRAPHTY_GRAPH_FIELDS` where it does not, so which
   convention produced a column is never lost silently.
7. **Which runs.** Every run the session holds, unless the caller names runs; a run left out is not
   reported, because leaving it out was the caller's choice. Hiding a style layer never changes
   which columns a file has.

## Drawn appearance

A format that holds appearance holds it per element, not as rules: GEXF's `viz` module records a
colour, a size and a shape on each node and has no way to say "colour by logFC on a diverging
scale". So exporting a style to such a format writes the values: graphty-element resolves every
enabled layer for every element and writes the result. The rules themselves are lost, reported with
`W_GRAPHTY_STYLE_RULES`, and travel intact only in a style member ("A graphty document beside an
export"). The caller MAY leave layers out by id; every enabled layer is written by default.

Resolving every element in one pass is new graphty-element work: 2.x resolves appearance one
element at a time (`explain()`). Colours are written from the parsed RGBA, never as the authored
string (style.md). When the imported data already holds visual-role columns (a GEXF read with its
`viz` values), the drawn appearance takes the roles and the imported columns are written as plain
columns, reported with `W_GRAPHTY_ROLE_TAKEN`.

| Channel                                                                             | graph-format role               | Written as                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `node.color`, `edge.color`                                                          | `color`                         | the resolved RGBA; alpha where the format has it                                      |
| `node.opacity`, `edge.opacity`                                                      | folded into the colour's alpha  | alpha times opacity                                                                   |
| `node.size`                                                                         | `size` (node)                   | scene units                                                                           |
| `edge.width`                                                                        | `thickness` (edge)              | scene units                                                                           |
| `node.shape`                                                                        | `shape` (node)                  | the shape table below; each translated shape reported with `W_GRAPHTY_SHAPE`          |
| `edge.style`                                                                        | `shape` (edge)                  | `solid` as solid, `dash` as dashed, `dot` as dotted, others as solid, reported        |
| `node.label`, `edge.label`                                                          | `label`, when the data has none | the resolved text                                                                     |
| every other channel (outline, glow, arrows, label styles, tooltips, curvature, ...) | none                            | reported with `W_GRAPHTY_CHANNEL`, per channel, with the count of elements it painted |

graphty-element draws 3D solids; GEXF has `disc`, `square`, `triangle`, `diamond` and `image`:

| Element shape                                                                               | GEXF shape       |
| ------------------------------------------------------------------------------------------- | ---------------- |
| `sphere`, `icosphere`, `geodesic`, `goldberg`, `capsule`, `cylinder`, `torus`, `torus-knot` | `disc`           |
| `box` and the prisms                                                                        | `square`         |
| `tetrahedron`, `cone` and the pyramids                                                      | `triangle`       |
| `octahedron` and the dipyramids                                                             | `diamond`        |
| any other                                                                                   | `disc`, reported |

## Per format

"Today" is what graph-io's exporters write now. Where appearance is "no", every painted channel is
reported with `W_GRAPHTY_CHANNEL`. Every format writes each imported column under its own name,
and every format with a direction flag (GraphML `edgedefault`, GEXF `defaultedgetype`, GML
`directed`, DOT `digraph`, Pajek `*Arcs`, the JSON dialects' own flag) writes the graph's
direction, so a table exported and replayed binds and reads as it did.

| Format                          | Result columns                                         | Drawn appearance today                                                 | Graph-level attributes |
| ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------- |
| GEXF 1.3                        | yes, typed                                             | yes: `viz:color`, `viz:size`, `viz:shape`, edge `viz:thickness`, shape | no                     |
| GraphML                         | yes, typed                                             | no                                                                     | yes                    |
| GML                             | yes, names reported (rule 4)                           | no                                                                     | yes                    |
| DOT                             | yes, as attributes                                     | no                                                                     | yes                    |
| Pajek                           | numbers as vectors or partitions only, others reported | no                                                                     | no                     |
| CSV                             | yes, in the node and edge tables                       | no; CSV has no appearance                                              | no                     |
| JSON node-link, JGF, graphology | yes                                                    | no                                                                     | yes                    |
| JSON d3, vis                    | yes                                                    | no                                                                     | no                     |
| JSON Cytoscape.js               | yes                                                    | no                                                                     | yes                    |
| Neo4j                           | yes, as properties                                     | no; a database has no appearance                                       | no                     |

Which appearance writers graph-io adds next (the yFiles extensions of GraphML, DOT's `color` and
`penwidth`, GML's `graphics` block, Cytoscape's exchange format CX2, whose `visualProperties` can
hold style rules) is graph-io's roadmap; each one turns "no" into values without changing this
page's model.

**Text is never markup.** Text from the data or a document -- labels, names, column values -- is
written as a quoted string in every format, never as a DOT HTML-like label or a yFiles HTML label,
which those tools render as HTML with images and links. Each value neutralised is counted and
reported with `W_GRAPHTY_TEXT_QUOTED`.

**CSV cells.** A CSV cell that begins with `=`, `+`, `-`, `@`, a tab or a carriage return is written
prefixed with a single quote, so a spreadsheet does not run it as a formula; the count is reported
with `W_GRAPHTY_CSV_NEUTRALIZED`. A caller whose consumer is not a spreadsheet MAY turn this off. A
negative number is a number, not a text cell, and is not prefixed.

## A graphty document beside an export

No format graph-io writes can hold a style's rules or a recipe. So an export reports
`W_GRAPHTY_STYLE_RULES` when the session has style layers and `W_GRAPHTY_RECIPE` when it has runs,
and the export API SHOULD offer to write a graphty document beside the exported file
(container.md). That document holds:

- a data member referencing the exported file (`href` relative to the document, `format`, `options`,
  `sha256`), when the export is one file. A CSV export is two files, `nodes.csv` and `edges.csv`,
  and a data member names one, so the document beside a CSV export carries no data member; its
  save report lists both files with the options each is imported with, and the recipe's `table`
  names the edge table's endpoint columns;
- the style member, with its rules;
- the recipe recorded from the session (recipe.md, "Recording"), so the analysis can be run again.

Opening the pair `network.graphml` and `network.graphty.json` in graphty loads the same data, the
same rules and the same analysis; every other tool still reads `network.graphml` as a plain GraphML
file. The result columns the export wrote come back as ordinary columns; the style's `results.`
paths bind once the recipe is run again. Carrying stored results, so the exact published numbers
reopen without a re-run, is part of the later project version (drafts/envelope.md).

Embedding a graphty document inside the third-party file (a GraphML or GEXF graph attribute holding
the JSON) is not done: every other tool would carry an opaque value it cannot read and may drop on
its next save, which turns a reported loss into one nobody sees.

## Loss notes graphty-element adds

| Code                        | When                                                                       | `column`     | `count`           |
| --------------------------- | -------------------------------------------------------------------------- | ------------ | ----------------- |
| `W_GRAPHTY_STYLE_RULES`     | the session has style layers; values may have been written, rules were not | null         | layers            |
| `W_GRAPHTY_CHANNEL`         | a painted channel has no place in the format                               | the channel  | elements painted  |
| `W_GRAPHTY_SHAPE`           | a shape or line pattern was translated                                     | the channel  | elements affected |
| `W_GRAPHTY_RECIPE`          | results were written; the commands that produced them were not             | null         | runs              |
| `W_GRAPHTY_RESULT_NAME`     | a result column was renamed for a format that cannot hold its name         | the new name | null              |
| `W_GRAPHTY_ROLE_TAKEN`      | a column lost a graph-format role to another claimant                      | the column   | null              |
| `W_GRAPHTY_GRAPH_FIELDS`    | a run's graph-level fields have no place in the format                     | the run name | fields            |
| `W_GRAPHTY_TEXT_QUOTED`     | text a format could read as markup was written quoted                      | the column   | values            |
| `W_GRAPHTY_CSV_NEUTRALIZED` | CSV cells were prefixed so a spreadsheet does not run them                 | the column   | cells             |

These codes are new and, like graph-io's, a published contract (README, "Error and warning codes").

## Worked example

A session with the expression overlay style of style.md, a PageRank run named `hubs`, a Louvain run
named `modules` and a force layout, exported three ways:

- **GEXF**: the attributes including `logFC` and `padj`; the columns `hubs.value`, `hubs.rank` and
  `modules.group` (the last with the `community` role); `viz:position` for every node; `viz:color`
  from the overlay, `viz:size` and `viz:shape` (`sphere` written as `disc`). Loss notes:
  `W_GRAPHTY_STYLE_RULES` (2 layers), `W_GRAPHTY_CHANNEL` for `node.outline`, `W_GRAPHTY_RECIPE`
  (2 runs).
- **GraphML**: the attributes and the result columns; no positions and no appearance, each
  reported.
- **CSV**: `nodes.csv` with the attributes and result columns, and `edges.csv`; every appearance
  channel and the positions reported; label cells beginning with `=` prefixed and counted.
- **Beside each**: `network.graphty.json`, with the style and the recorded recipe; beside the GEXF
  and the GraphML it references the exported file by `href` and `sha256`, and beside the CSV it
  carries no data member and its report lists both files.
