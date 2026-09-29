# graphty document formats, version 1

graphty-element reads and writes graphs in the formats other tools already use. Those files carry a
graph; they do not carry what a person did with it in graphty -- how it is drawn and which analyses
were run. This directory specifies the two graphty documents that carry those things, and the one
JSON file they travel in:

- a **style**: how nodes and edges are drawn, as rules over the data's columns, so the same look
  applies to the next dataset;
- a **recipe**: the analysis commands that were run (filters, algorithms and a layout), so the same
  analysis runs on the next dataset -- a colleague's, a partner's in the same industry, or your own next
  month.

Status: specification of version 1, not yet implemented. The owner's decisions it is written to are
in [../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md).
Nothing in version 1 is waiting on a decision ("Open decisions" below).

## Your first style

Save this as `team-colours.graphty.json`:

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-style",
            "version": 1,
            "layers": [
                {
                    "name": "Colour by team",
                    "selector": { "match": "has", "path": "data.team" },
                    "encode": { "node.color": { "by": "data.team", "scale": "ordinal", "overflow": "other" } }
                }
            ]
        }
    ]
}
```

Load any graph whose nodes have a `team` column -- a CSV, a GraphML file, a GEXF file, JSON -- then
open the style:

```js
const { report } = await element.session.data.openDocument(text);
```

Every node with a team is coloured by team. On a graph with no `team` column the layer is added
switched off, and `report` says it needs `data.team`. Nothing else changes.

The colours come from the default palette, largest team first, so on next quarter's data a team can
change colour when the sizes change. The palette has eight colours; `"overflow": "other"` paints
the teams past the eighth dark grey instead of switching the layer off. To keep a colour on a team, pin it with `map`
(`"map": { "sales": "#0b5fff" }`); to use your own colours, name your palette, and carry it in the
file or register it on the page with `registerPalette` (style.md, "Palettes").

To check a file by hand before sharing it, validate it against this directory's schemas; run the
command from this directory:

```sh
npx -y -p ajv-cli@5 -p ajv-formats ajv validate --spec=draft2020 -c ajv-formats --allow-union-types --all-errors \
    -s container.schema.json -r style.schema.json -r recipe.schema.json -r data.schema.json -d team-colours.graphty.json
```

The `-p ajv-formats -c ajv-formats` pair and `--allow-union-types` are needed: the schemas use URL
formats and union types; the shorter `npx ajv-cli validate` form fails before it checks anything.
`--all-errors` lists every problem in one pass instead of stopping at the first. Without a command line, `openDocument(text, { apply: false })` reports
every problem the schemas would, and more, without changing anything ("Opening a file someone sent
you").

### Saving your look

```js
const { text, report } = await element.session.data.saveDocument({
    members: ["graphty-style"],
    style: { id: "org.example-lab.expression", name: "Expression overlay" },
});
```

`text` holds only the style: never your data, and never a recipe. `report.leftOut` lists everything
the session holds that was not written (container.md, "Writing a file").

## Your first recipe

Save this as `team-overview.graphty.json`:

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-recipe",
            "version": 1,
            "id": "org.example.team-overview",
            "commands": [
                { "op": "graph.filter", "where": "data.confidence >= `0.4`", "on": "edges", "dropIsolated": true },
                { "op": "algo.run", "algorithm": "pagerank", "as": "influence", "params": { "weight": "confidence" } },
                { "op": "algo.run", "algorithm": "louvain", "as": "groups" },
                { "op": "layout.set", "id": "force", "options": { "seed": 42 } }
            ]
        }
    ]
}
```

Load a graph whose edges have a `confidence` column, then open the recipe and ask for it to run
(for a CSV or other table, open the recipe first instead: "Replaying a recipe on your own table"):

```js
const { report } = await element.session.data.openDocument(text, { run: true });
```

The edges below 0.4 confidence are filtered out, and so are the nodes left with no edge
(`dropIsolated`; without it they stay, and Louvain makes each a group of its own). Every later
command sees only the rest. PageRank runs weighted by `confidence`, Louvain finds groups, and the
graph is laid out from a fixed seed (`force` is drawn by its default engine, ngraph, which takes
`seed`). On a graph with no `confidence` column the filter and everything after it are skipped
and reported, naming the column; `report` suggests the nearest names your data has, and
`openDocument(text, { run: true, columns: { confidence: "score" } })` reads yours instead. Each run
paints its suggested colouring, above your own layers; to keep a colouring of your own on top (a
style colouring nodes by a `community` column, say), write `"style": false` on the run -- the
report's `W_PAINTS_OVER` notice says so when a run's colouring would cover one of yours. The same
data on the same release gives the same numbers every
time, under the conditions of recipe.md, "Same data, same results" -- one of which is the same kind
of machine: a WebGPU accelerator computes in single precision and the CPU in double, and version 1
cannot make a replay use one or the other; the report says when a replay's precision differs from
the recording's. Opening a recipe without `run: true` runs nothing: it reports what would run and
what it would cost. Recipes are specified for graphty-element 3.0.0; no release replays one yet.

A recipe records the analysis you ran in graphty; you rarely write one from scratch.
`session.data.saveDocument({ recipe: { id } })` saves the analysis commands of a session as a
recipe, and the look as a style, in one file; your data is written only when you ask for it
(recipe.md, "Recording"; container.md, "Writing a file" rule 4). A run made on the selection, on
nodes you picked, under a time window, or under a filter that is not made of rules over columns is
left out, and the save report lists it. To list the algorithms, their options and the
layouts a recipe can name, see recipe.md, "Finding algorithms and their options".

## Replaying a recipe on your own table

A recipe from a colleague replays on your data when your data has the columns it names. A GraphML,
GEXF, GML, DOT, Pajek or JSON file says itself which fields are an edge's ends. A table does not,
so a recipe meant for tables says in `table` how its table is read -- the endpoint columns, and the
delimiter and repeated rows when they are not the defaults (recipe.md, "Table data"). This one is
for STRING's space-separated bulk download:

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-recipe",
            "version": 1,
            "id": "org.example-lab.ppi-core",
            "recipeVersion": "1.0.0",
            "description": "STRING bulk protein.links files (combined_score 0 to 1000). In a browser it fits the organisms whose core at 700 has under 100,000 interacting pairs; for larger ones (human) replay it in Node with raised limits.",
            "directed": false,
            "parallelEdges": false,
            "table": {
                "edgeSource": "protein1",
                "edgeTarget": "protein2",
                "delimiter": " ",
                "repeatedEdges": "first",
                "filterWhileReading": true
            },
            "commands": [
                { "op": "graph.filter", "where": "data.combined_score >= `700`", "on": "edges", "dropIsolated": true },
                { "op": "algo.run", "algorithm": "louvain", "as": "modules", "scope": "largest-component" }
            ]
        }
    ]
}
```

Open it first, then import your table through it, look at the plan, and run. STRING distributes
its files as `.txt.gz`; the platform's `DecompressionStream` decompresses one while it is read:

```js
const opened = await element.session.data.openDocument(recipeText);
const recipe = opened.recipes[0];
const stream = file.stream().pipeThrough(new DecompressionStream("gzip")); // or config: { file } for a .txt
await recipe.import({ type: "csv", config: { stream } });
console.log(recipe.report); // what bound, how many rows the filter dropped, what it will cost
recipe.run();
```

`recipe.import` reads the file the way the recipe's `table` and `directed` say: here
space-separated and undirected, with each pair's two rows (`A B` and `B A`) merged into one edge
that keeps the first row's columns. `repeatedEdges` combines only the edge weight (`sum`, `min`,
`max`); every other column of a merged edge is the first row's (the last row's for `last`), and
STRING's file has no weight column, so `first` says what happens. Its source is a `file` (a
browser `File`, or any `Blob`), a `stream` of bytes, a `url` it fetches, or `data`, a string for
small text; the first three are read as a stream, row by row, never held as one string.

Nothing runs until you call `run()`. In a Node script or a nightly job, the same recipe replays
headless with `createGraphSession()`, which draws nothing and so may raise the load ceilings
("Limits"):

```js
import { openAsBlob } from "node:fs";
import { createGraphSession } from "@graphty/graphty-element/session";

const session = createGraphSession({ limits: { nodes: 1_000_000, edges: 5_000_000 } });
const [recipe] = (await session.data.openDocument(recipeText)).recipes;
const blob = await openAsBlob("9606.protein.links.v12.0.txt.gz");
await recipe.import({ type: "csv", config: { stream: blob.stream().pipeThrough(new DecompressionStream("gzip")) } });
await recipe.run();
```

**How a large download fits.** The recipe's leading edge filters are applied to each row while the
file is read, so a download of millions of rows is read down to the rows the recipe keeps; the
report's `appliedWhileReading` says how many each filter dropped. Then `repeatedEdges` merges the
kept rows, and only then are the load ceilings checked, on the edges left after the merge: for
STRING, on interacting pairs, not on rows. The kept rows are held to twice the edge ceiling before
the merge. Filtering rows while reading gives exactly the graph filtering after import gives when
no rows are merged; when they are, a pair is kept if any of its rows passes, which is the same
answer whenever a pair's rows agree on the filtered column, as STRING's two rows of a pair always
do. `filterWhileReading: true` is the recipe's author saying so; without it, a table whose rows are
merged is read whole and filtered after import (recipe.md, "Table data" rule 4). In a browser the
ceilings stay 50,000 nodes and 100,000 edges: human STRING at 700 is larger and is refused there
with `E_TOO_LARGE`, naming the Node route.

Your own options win: pass `edgeSource`, `delimiter` or anything else in `config`, and the report
says where they differ from the recipe's. A file whose first line holds the recipe's
endpoint columns neither when split by the recipe's delimiter nor by the one the importer detects
(a Gephi `edges.csv` headed `Source,Target,Weight`) is read by the importer's own rules, as if the recipe
named none, and the report says so. A plain `data.import` never takes anything from a recipe. A
node table and an edge table are imported one after the other, the second with `{ mode: "merge" }`
as `recipe.import`'s second argument; the plan is made again after each. A GraphML or other file
that marks its own structure can be imported through `recipe.import` too; it is read as a plain
import reads it, because `table` and `directed` are for tables, and the plan follows.

**Recording an analysis of a file too large to load whole.** A plain import of the full download
is refused before you can filter it, so start from a recipe holding only `table` and the filter:
open it, import through it, run your algorithms by hand, then save with
`saveDocument({ recipe: { id } })`. The recorder writes the `table` the import was read with and the
filters it applied while reading, then your runs (recipe.md, "Recording" rule 5).

Check the scale of a column the recipe compares with a number: STRING's web export has
`combined_score` from 0 to 1, where this recipe expects 0 to 1000 ("What version 1 does not
cover").

## Opening a file someone sent you

Look first. `apply: false` changes nothing and returns the full report: every member, the columns
each style layer and recipe command needs and whether your graph has them, what each command would
cost, and whether the file carries data of its own.

```js
const { report } = await element.session.data.openDocument(text, { apply: false });
```

Then open it, choosing what applies and renaming columns your data spells differently:

```js
const opened = await element.session.data.openDocument(text, { columns: { team: "department" } });
```

A file that carries data never replaces a graph you already loaded unless you pass
`data: "replace"` (container.md, "Applying a file"). `opened.recipes` holds each recipe's
application, whose `run()` starts a recipe you opened without running it, and `opened.remove()`
takes back everything the file added. The preview names a table recipe's `table`, so you can see
how it expects a table to be read before you import one through it.

An application that opens documents for a person SHOULD show that preview first -- each member's
`summary`, every recipe's costs and `wouldStart`, the file's own `wouldStart`, and every notice --
and SHOULD NOT pass `run: true` unless the person asked for the recipes to run. When it holds a
recipe with a `table`, it SHOULD offer to import data for that recipe, which calls that
application's `import()`, so a person who uses the application rather than a script reads their
table with the recipe's columns and delimiter instead of retyping them; its ordinary data import
takes nothing from a recipe. This says what is shown and offered and when, not how it looks.

## The documents in this directory

| Page                                   | Schema                                         | What it specifies                                                                                   |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [container.md](container.md)           | [container.schema.json](container.schema.json) | The one JSON file: how it is recognised, versioned and extended, and the members it carries         |
|                                        | [data.schema.json](data.schema.json)           | The data member: a graph embedded in one of graph-io's JSON dialects, or a reference to a file      |
| [style.md](style.md)                   | [style.schema.json](style.schema.json)         | The style member: style layers, their selectors and encodings, carried palettes                     |
| [recipe.md](recipe.md)                 | [recipe.schema.json](recipe.schema.json)       | The recipe member: which commands it records, how it binds to a new graph's columns, how it replays |
| [export-mapping.md](export-mapping.md) | --                                             | How styles and algorithm results are written into other tools' formats                              |
| [drafts/](drafts/)                     | --                                             | Data plan, view preset, annotations and the earlier project envelope: not version 1                 |

## Conventions

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they
appear in all capitals.

A **writer** produces a document; a **reader** parses one; an **applier** changes a live graph
session from one. graphty-element is all three.

1. The JSON Schema files (draft 2020-12) are the normative form of the data model: what a
   conforming writer produces. The TypeScript in the prose is illustrative and MUST agree with them;
   a disagreement is a defect in this specification.
2. The prose is normative for behaviour: what a reader does with any input, conforming or not. A
   reader does not use a schema as an accept-or-refuse test for the whole file; it checks each
   member, and in a style each layer, and handles a failure as the prose says.
3. The schemas are published at `https://graphty.app/schema/documents/<kind>/v<major>.json`
   (`graphty-document`, `graphty-style`, `graphty-recipe`, `graphty-data`) and exported from
   graphty-element with the same content.

## Three things called a file format

"Format" means three different things in this ecosystem. They are kept apart, and each has exactly
one owner:

| Layer                | What it is                                                                                                                                                                                                   | Owner           | Who sees it                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ----------------------------------------- |
| Other tools' formats | GEXF, GraphML, GML, DOT, Pajek, CSV, JSON (the node-link, d3, JSON Graph Format, Cytoscape.js, graphology and vis dialects, and NetworkX's adjacency and tree forms for reading) and neo4j-admin import CSVs | graph-io        | users: these are their data files         |
| The snapshot         | graph-format's frozen in-memory graph, and its binary wire form, which moves a snapshot between threads and processes                                                                                        | graph-format    | nobody: internal, never a file a user has |
| graphty documents    | the JSON file of this directory: styles, recipes, and optionally the data                                                                                                                                    | graphty-element | users: files they save, share and open    |

How they connect:

1. **Import.** graph-io reads a file in any of the formats above and produces one snapshot, by the
   rules of "What every importer produces" below. Node ids and edge endpoints are structure, not
   columns. The edge weight is always the edge column `weight`. Every other attribute becomes a
   **named column** of the node table or the edge table, named as the file names it.
2. **Why a recipe is portable across file types.** A style and a recipe name only columns
   (`data.team`, `weight`), never a file's syntax and never a particular node or edge. So a recipe
   recorded on a GraphML import replays on a CSV, a GEXF or any other file whose import has the
   columns it names. A column is found by its exact name; a missing column is reported, never
   guessed. The spelling of the id and endpoint columns in each format does not matter to a recipe
   or a style, because after import they are structure. A structural format marks them itself; for
   a table, a recipe names them in its `table` (recipe.md, "Table data"), so it does not depend on
   which headers an importer recognises by itself.
3. **Export.** graphty-element builds an export snapshot holding the data, each run's results as
   columns and the drawn appearance where the target format has a place for it, and graph-io writes
   it in the chosen format. What cannot be written is reported, never dropped silently. See
   [export-mapping.md](export-mapping.md).
4. **Data inside a graphty document.** The data member embeds a graph in one of graph-io's existing
   JSON dialects, or references a file in any format graphty-element reads. It invents no data
   format, and it never carries the snapshot's binary wire form (container.md, "The data member").

### What every importer produces

These rules are what version 1 requires of every import: a style and a recipe bind to the columns
they produce. The header names each importer recognises by itself for endpoints and ids (the table
below) are the importers' own behaviour, not part of the document format: a recipe for table data
names its endpoint and id columns (recipe.md, "Table data"), and a data member records the options
its file was read with, so neither changes meaning when an importer learns a new header.

They are not yet all what graphty-element does. On the graph-format migration branch (not yet
merged), its CSV and JSON readers keep a weight column under its own name and fall back to a legacy
`value` key, and read JSON by forcing the node-link dialect onto whatever they find; its GML, DOT
and Pajek readers do not use graph-io at all. Each of these is one of the graphty-element changes
listed in "Where this lives in the packages".

1. **Node ids and edge endpoints** are structure, not columns. The one header or field chosen as a
   node id or an endpoint is consumed; every other one stays a column, whatever its name, so a
   node table headed `id,name,padj` keeps `name`. A style reads a node's id through the path `data.id`
   (style.md, "Paths" rule 4); a recipe never names one.
2. **The edge weight** is the edge column `weight` after every import, whatever the file called it:
   a CSV's `weight` or `Weight` header, a GraphML or GEXF `weight`, GML's `value`, Pajek's third
   column. The file's own name is not a second column; graph-io keeps it only so an export can
   write it back. A file that also has a field literally named `weight` besides the one the weight
   is read from (a GML edge with `value 3` and `weight 0.2`) keeps that field as the column
   `weight_1`, and the import report says so. A file with no weight gives edges no `weight` value,
   and neither does an edge whose weight the file left empty: graph-format marks such a weight as
   defaulted, and the session record leaves `weight` unset there instead of writing the default 1. An edge whose weight is not
   a number (`NA`, empty) is kept, with no `weight` value, and the import report counts it; an
   import never drops an edge for its weight, because every unweighted analysis would then see
   another network. graphty-element's
   `edgeWeightPath` setting does not change this: it chooses the weight the renderer and the
   layouts read, never the column a recipe names (recipe.md, "Commands" rule 6).
3. **Every other attribute** is a column named exactly as the file names it: a CSV header, a GraphML
   key's `attr.name`, a GEXF attribute's `title`, a JSON member name, a Neo4j property. A label the
   format itself defines (GEXF, GML and DOT `label`, a Pajek vertex label) is the column `label`;
   GraphML defines none, so a GraphML file's display name is whatever key it declares (Cytoscape
   writes `name`). The field a knowledge graph most depends on -- an element's type -- lands under
   a different name, and sometimes a different spelling of its values, in each format and each
   export route. A rename can fix a name but never a value, so a style or recipe for Neo4j data is
   written against one export route, and its `description` names it:

    | Source                                                                         | An element's type                                                                    | Its display name               |
    | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------ |
    | Neo4j, neo4j-admin import CSVs (`apoc.export.csv.all` with `bulkImport: true`) | `labels` on nodes, text as the file writes it (`Supplier;Company`); `type` on edges  | a property                     |
    | Neo4j, `apoc.export.graphml.all`                                               | `labels` on nodes, text with a leading colon (`:Supplier:Company`); `label` on edges | a property                     |
    | GraphML from other tools                                                       | an attribute the file declares                                                       | an attribute the file declares |
    | GEXF                                                                           | an attribute the file declares                                                       | `label`                        |
    | GML, DOT                                                                       | an attribute the file declares                                                       | `label`                        |
    | CSV, JSON                                                                      | a column the file has                                                                | a column                       |

    So `label` is a display name in GEXF, GML and DOT, and a relationship's type in APOC's
    GraphML. A style or recipe shared across formats needs the caller's `columns`, `nodeColumns`
    or `edgeColumns` rename for the name.

4. **Value types** are the file's own where it declares them (GraphML and GEXF keys, Neo4j header
   types, JSON values). Where the file declares none (CSV, DOT), graph-io types each column as a
   whole: a column of numbers is numbers, and one `NA` cell makes the whole column text. A column
   of `true` and `false`, written exactly so, is booleans; `TRUE` and `FALSE`, as R's `write.csv`
   writes them, stay text, which ``== `true` `` does not match and which a bare
   `where: "data.significant"` counts as true, because text that is not empty is true. Compare such
   a column as text (`data.significant == 'TRUE'`). An unquoted empty cell is no value. So an ordering comparison (`<`, `>`), a weight and a numeric
   scale read a value as a number when it is one or is text that reads as a decimal number
   (`"0.01"`), and treat every other value (`NA`) as not a number: it never matches such a
   comparison and is never painted by a numeric scale. A style and a recipe treat it the same way
   and count it with `W_COLUMN_TYPE`. `==` and `!=` stay exact: `"1"` is not `1`.
5. **Lists.** A Neo4j array property, a JSON array and a GEXF `liststring` are kept as lists. A `where` compares a list only as a whole (`==` with a list literal), so a list never
   equals a string and no expression tests whether a list holds one value -- the expression
   language has no functions (style.md, "Expressions"). A style's ordinal binding treats a list as
   missing and counts it with `W_COLUMN_TYPE`. GraphML, GML, DOT, Pajek and CSV produce no lists.
6. **Rows are imported as given**, unless the `repeatedEdges` import option says otherwise
   (container.md, "Import options"). A CSV row is one edge, so a file listing each pair twice
   (`A B` and `B A`) gives two edges. `repeatedEdges` combines only the edge weight; every other
   column of a merged edge is its first row's, or its last row's for `last`. A compressed file
   (`.gz`) is not read as it is: the import fails with `E_PARSE_FAILED`, saying that the file is
   compressed and that a `stream` piped through the platform's `DecompressionStream("gzip")`
   reads it ("Replaying a recipe on your own table").

Where each importer finds its structure when no import option says otherwise:

| Format                                           | Edge endpoints                                                                                                                                                                   | Node ids                                           | Weight read from                 | Direction when the file does not say                                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSV                                              | the first pair found of `source` and `target`, `src` and `dst`, `from` and `to`, both halves from one pair, exactly and then without regard to case; headerless: columns 1 and 2 | a node table's `id` column, without regard to case | `weight`, without regard to case | directed; Gephi's `Type` column decides per row                                                                                                   |
| GraphML                                          | each edge's `source` and `target`                                                                                                                                                | node `id`                                          | the key named `weight`           | `edgedefault`, else undirected                                                                                                                    |
| GEXF                                             | each edge's `source` and `target`                                                                                                                                                | node `id`                                          | the edge's `weight`              | `defaultedgetype`, else undirected                                                                                                                |
| GML                                              | each edge's `source` and `target`                                                                                                                                                | node `id`                                          | `value`                          | `directed`, else undirected                                                                                                                       |
| DOT                                              | the edge statement                                                                                                                                                               | the node's ID                                      | the `weight` attribute           | `digraph` directed, `graph` undirected                                                                                                            |
| Pajek                                            | the arc or edge line                                                                                                                                                             | the vertex number                                  | the line's third column          | `*Arcs` directed, `*Edges` undirected                                                                                                             |
| JSON                                             | the dialect's own names (node-link: `source`, `target`)                                                                                                                          | the dialect's own (node-link: `id`)                | `weight`                         | the dialect's own flag, else graph-io's default for the dialect: undirected for node-link, d3 and vis; directed for jgf, cytoscape and graphology |
| neo4j-admin import CSV (the CSV variant `neo4j`) | `:START_ID`, `:END_ID`                                                                                                                                                           | `:ID`                                              | the `weight` property            | directed                                                                                                                                          |

The `directed` import option overrides the last column for every format.

A CSV whose endpoint columns are named otherwise (STRING's `protein1` and `protein2`, its web
export's `#node1` and `node2`, a pull-down's `bait` and `prey`) needs `edgeSource` and `edgeTarget`
when it is imported, given by the caller, the data member or the recipe's `table`. Without them the
import fails, saying it found no endpoint columns and naming the two options; it never builds a
graph without edges. When the header was read as one column and a name the import looked for
appears in it split by a space or by another delimiter (`protein1 protein2 combined_score`), the
error names the `delimiter` that would find it, because a wrong delimiter, not a wrong header, is
then the likely mistake.

graphty-element's own exports keep every column under its name and write the graph's direction
(export-mapping.md), so a table exported as GraphML and replayed binds without renames.

**CSV shapes.** A CSV file is one table. The `variant` import option says which shape it is:
`edge-list`, `node-list`, `adjacency-list`, `gephi`, `cytoscape`, `neo4j` or `generic` (the names
graphty-element's catalogue publishes). Without it the importer reads an edge list, or a node list
when the header has an `id` column and no endpoint pair. No CSV shape holds nodes and edges in one
file. In a session, a node table and an edge list are imported one after the other, the second
with `{ mode: "merge" }`, and a style or a planned recipe binds again when the merge adds columns
("Applying a style and a recipe to new data" rule 5). A data member is one file, though, so a
document that carries such a network -- an expression table beside an edge list -- carries it as
one GraphML or node-link JSON file ("What version 1 does not cover", joins).

## The one JSON file

Every graphty document is one JSON file ([container.md](container.md)):

- It is saved as `<name>.graphty.json`. The media type `application/vnd.graphty+json` is reserved
  for it and used by nothing today (container.md, "File name and media type").
- It is recognised by its top-level member `"kind": "graphty-document"`, a fixed value, never by the
  file name. A reader also accepts the style file graphty-element 2.x writes -- an integer
  `version` and a `layers` array, with no `kind` -- and a single member of any kind on its own,
  each read as a document holding that one member.
- `version` is the container's major version, 1. A reader refuses a file whose container version it
  does not implement, naming the version.
- `members` is a list, each with its own `kind` and `version`: `graphty-style`, `graphty-recipe`
  and `graphty-data` in version 1, in any mix and any number (a lab's two looks and its recipe in
  one file). Later versions add kinds; a reader skips a member of a kind it does not know, or of a
  version of that kind it does not implement, reports it, and keeps it when it writes the file
  back. The rest of the file applies, unless the file lists that kind in `requires`, which makes a
  reader that does not know it refuse the whole file.
- The data rides inside as a `graphty-data` member: an embedded graph-io JSON dialect
  (`{ "kind": "graphty-data", "version": 1, "format": "json", "dialect": "node-link", "graph":
{ "nodes": [...], "links": [...] } }`), or a reference to a file with its import options and an
  optional SHA-256.
- There is no zip container. A file is one JSON text a person can read and diff.

## Applying a style and a recipe to new data

This is what the documents are for, so the rules are stated together here and in full in
[style.md](style.md) and [recipe.md](recipe.md).

1. **Bind by name, report what is missing.** A style layer or a recipe command binds to the current
   graph by the exact column names it uses. Nothing is matched by case, by similarity or by
   position. A layer that names a missing column is added switched off with its reason; a command
   that names one is skipped with `E_UNKNOWN_ATTRIBUTE`, naming the column, and so is every command
   that reads its result. Each report suggests up to three existing columns with the nearest names,
   and never uses one. Everything else applies.
2. **The caller may rename, the file may not.** A caller whose data spells a column differently
   passes a map from the document's name to the data's name (`columns: { "team": "department" }`)
   to `openDocument`, which applies it to every style and recipe member of the file, on both tables;
   `nodeColumns` and `edgeColumns` rename on one table only, for a name the file uses on nodes and
   edges with two meanings. The map rewrites parsed paths and expressions, never text, and each
   member's report records it. That is the caller's decision, never inferred. It renames columns, never the values in them: a
   category spelled `SUPPLIES` in one dataset and `supplies` in another is two categories.
3. **Order.** Opening a document applies its members in this order: data, then recipes in list
   order, then styles in list order. A run's own suggested colouring is added when the run
   completes, above every layer present then, including the file's style layers and the reader's
   own; the plan lists the channels it will paint, with a notice when an enabled layer already
   paints one (`W_PAINTS_OVER`). A preview counts the file's own style layers that would paint as
   enabled for that check, and gives a file's style layer the same notice when it writes a channel
   one of the reader's own enabled layers writes, naming that layer.
4. **Nothing happens without being asked.** Opening a recipe binds and plans it: the report lists
   every command, whether it can run, and its estimated cost. Runs start only when the caller asks
   (`run: true`, or `run()` on the application). A file's data never replaces a graph the caller
   already loaded unless the caller passes `data: "replace"`. `apply: false` changes nothing at all.
5. **Load first, then open -- or open first.** A document applies to the graph loaded at the time.
   Whenever the graph's columns change -- an import that replaces the graph, an import merged into
   it (`mode: "merge"`), or elements added or updated with a column no element had -- and whenever
   a run completes, graphty-element MUST re-check every style layer it switched off only for a
   missing column or a missing run, switch on those that now bind, and report each one. A recipe
   that has been planned but has not run is planned again at the same moments, and `run()` binds
   it against the graph as it is then. A document opened while no graph is loaded -- carrying no
   data, or data that did not arrive -- holds its recipes; they bind and plan when the caller loads
   data, and each application's `report` is replaced by that plan before the import's promise
   resolves. A held recipe never runs by itself: the caller reads the plan and calls `run()`,
   whatever `run` the opening was given.
6. **Opening the same thing twice.** A recipe applied again to the same data is refused unless the
   caller says otherwise (recipe.md, "Applying a recipe"). A style opened again from the same file
   replaces the layers its earlier opening added; a style from another file that claims the same
   `id` adds its layers beside them and the report names the collision (style.md, "Reading and
   applying" rule 9).
7. **One report shape.** Opening returns a report per member (container.md, "The report"): what
   applied, what was skipped or switched off, and why, with an error code and a sentence a person
   can act on.

## Trust

A document is data from someone else.

1. **Nothing in a document is executed as code.** No reader evaluates a string as JavaScript, and a
   document never names code to load or a package to install. The only languages in a document are
   graphty-element's expression language in selectors and `where` scopes (a small subset of
   JMESPath with no functions; style.md, "Expressions"), interpreted by graphty-element with no
   access to the page, bounded by the limits below.
2. **A recipe spends compute, and only when asked.** Opening a document never starts a run or a
   layout. When the caller asks, every command is held to the same cost cap as the same call made by
   hand, which a document cannot raise, and all the recipes of a file together to one total budget
   (recipe.md, "Running"). Every command a recipe can run is stopped when it reaches the cap, not
   only refused before it starts, and a command whose cost the catalogue cannot bound is not run
   from a recipe at all.
3. **Nothing is fetched without consent.** A data member's `href` is resolved only through the
   caller, and only after graphty-element has checked where it points; an address that is not
   public is refused unless the caller allows it. A `resolve` with a person to ask shows every
   `href` before the first read, and fetches another origin's file without the person's cookies
   or credentials. A `resolve` follows no redirect it has not checked the same way, and one with
   no person to ask fetches only from an allowlist (container.md, "The data member" rules 3 and 4).
   A data member's import options never name a URL or carry data of their own, and never hold an
   expression (container.md, "Import options").
   `$schema` is never fetched, and a graphty-element 1.x template read from a document never
   reaches the element's own template input, whose background can name an image URL.
4. **A file's data does not replace yours by default.** A data member applies only when no graph is
   loaded or the caller passes `data: "replace"`.
5. **Imported layers say where they came from.** A style layer from a document is stamped with the
   document it came from, so a document cannot make its layers look like the reader's own. A
   document's `generator` and `graphty.provenance` are claims the file makes about itself; a
   reader shows them as such, never as verified. Style and recipe ids starting `graphty.` or
   `graphty:`, and ids holding `graphty.app` followed by `/`, `:`, `.` or nothing, in any case, are
   reserved for graphty-element, so a file cannot pass off a recipe as the shipped overview under
   any spelling of its URL; a preview marks a document recipe whose `name` is a shipped recipe's
   name ("General") as not the shipped one. Ids hold only letters, digits and `. _ : / -`,
   so an id cannot hide a character that reverses or hides text.
6. **Text is text.** Every string from a document -- labels, names, descriptions, and every string a
   report quotes from one (a column, an `href`, an unknown member's name) -- is rendered as text,
   never as HTML, and a name is shown isolated from the text around it, so right-to-left override
   characters in it cannot reorder what follows.

## Limits

A reader MUST enforce these before applying anything, and refuse the file with `E_TOO_LARGE`,
naming the limit, when one is exceeded. A caller MAY raise every limit of this list through
`openDocument`'s `limits` and `openingSeconds` options, except the load ceilings of the last item, which only a session that
draws nothing raises.

- a file of at most 64 MB, given as text or bytes, nested at most 64 levels deep. The depth is
  checked by one pass over the raw text that counts brackets outside strings, before the text is
  parsed;
- no member name `__proto__` at any depth, and no object with the same member name twice (the file
  is refused with `E_BAD_DOCUMENT`, naming the JSON pointer; both are checked in the one parsing
  pass, on names as decoded from their `\u` escapes, because JSON parsers disagree on which of two
  duplicates wins, so a reviewer could see one `href` and the reader use the other); every document object held in a null-prototype object or a
  map, so `constructor` and `prototype` are ordinary names;
- at most 64 members; at most 1,000 style layers in the whole file, and per style 100 carried
  palettes of at most 256 colours; per recipe, 1,000 commands;
- an expression (a selector's `where`, a recipe scope's `where`) of at most 1,024 characters and 32
  levels of nesting, checked before it is parsed; a longer one fails its layer or its command, not
  the file;
- at most 100 entries in a report's lists of notices and of left-out items -- a member's notices,
  the document's own notices, `leftOut`, a style report's `unbound`, `refused` and `replaced` --
  then one notice giving the count of the rest. The plan lists are never cut: a recipe report's
  `commands` and `columns` and a style report's `layers` hold every command, column and layer,
  because a preview that cut them could not show what the file will do; the 1,000-command and
  1,000-layer limits bound them. A string a report repeats from the document's own structure (a
  `where`, a `description`, a member, layer or command `name`) is given whole, up to its schema
  limit; a string it quotes from the data or from a member this reader does not know is cut to
  256 characters;
- every channel value an encoding produces is checked against the channel's own range when it is
  painted, as a `set` value is: a number is clamped to the range, text is cut to 1,024 characters,
  and the report counts each (style.md, "Channels and values");
- opening a document -- applying its styles, binding and planning its recipes, searching for
  nearest names, a preview's scratch import of the file's data, and binding both again when the
  columns later change -- is held to an opening budget, 5 seconds by default.
  Past it, the remaining layers are added switched off and the remaining commands are planned
  without an estimate, each with `E_CAP_EXCEEDED`. The budget is checked inside the evaluation of
  one layer or one scope too, at least every 10,000 elements, and the work yields to the page
  between checks, so one expression over a large graph is cut off at the budget rather than
  after it. An expression has no functions, so one evaluation costs at most its 1,024
  characters, and one layer at most that times the number of elements. After opening, a
  document's layers cost what the same layers made by hand cost when the data changes;
- nearest-name suggestions for a missing column cover the first 100 missing names of the whole
  file and compare each only with the first 1,000 columns of its table, and only names of at most
  256 characters. A column is suggested when, lower-cased and with every character but letters
  and digits removed, it is within an edit distance of 3 of the missing name, or when the two
  share a word of at least three letters, words being split at a change from lower to upper case,
  at digits and at every other character, compared without case: `logFC` suggests
  `log2FoldChange` (the word `log`), and `adj.P.Val` suggests `adj_p_val`. Names this different
  get no suggestion: `padj` suggests nothing on data whose column is `FDR`, and the person who
  knows the two mean the same passes `columns`. One pair costs at most a few hundred steps; the
  opening budget is checked between comparisons. Past those bounds a report says suggestions were
  not searched;
- a referenced data member's file of at most 256 MB, counted in decoded bytes as they arrive: a
  `resolve` returns a stream or bytes (container.md, "Applying a file"), and one that fetches stops
  reading and the import is refused with `E_TOO_LARGE` once the decoded body passes the limit, so
  a small compressed response that decodes to gigabytes is cut off at the limit, not after it.
  Embedded data counts toward the 64 MB of the file;
- every import, a preview's scratch import and a data member's included, is held to
  graphty-element's published load ceilings: 50,000 nodes and 100,000 edges today
  (`DEFAULT_LIMITS.renderCeiling` and `edgesDrawn`, measured as what the renderer can hold), past
  which the import is refused with `E_TOO_LARGE`. A session that draws nothing --
  `createGraphSession()` from the `./session` entry point, in Node or a worker -- may raise them
  with its `limits` option, because they measure the renderer; an element on a page cannot, and
  they rise there when the renderer's cost per element falls. They count the graph as it is
  built: for a table read through a recipe, after the recipe's leading edge filters dropped rows
  while reading and after `repeatedEdges` merged the kept rows, with the kept rows held to twice
  the edge ceiling before the merge (recipe.md, "Table data" rule 4). A recipe's `description`
  says which downloads it fits (for STRING, which organisms at which threshold).

Every lookup of a column, a run or a member by a name taken from a document is a lookup of an own
name (a map, or `Object.hasOwn`), so a column named `constructor` or `toString` in a document binds
only when the data has a column of that name.

## Where this lives in the packages

graphty-element owns every document: reading, checking, applying, recording and writing, and the
reports. A third party who installs graphty-element and nothing else can save and open everything
the graphty app can; the app draws the Save and Open controls and calls the element.

| Task                                 | graphty-element API                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Look at a file                       | `session.data.openDocument(src, { apply: false })` (container.md, "Applying a file")                |
| Open a file                          | `session.data.openDocument(src, options)` (container.md, "Applying a file")                         |
| Save a file                          | `session.data.saveDocument(options)` (container.md, "Writing a file")                               |
| Apply one style member               | `session.styles.applyTemplate(style, options)` (shipped in 2.x; the options are new, style.md)      |
| Remove a style that was opened       | `session.styles.removeBySource((s) => s.by === "template" && s.templateId === id)` (shipped in 2.x) |
| Write the current style              | `session.styles.toDocument()` (shipped in 2.x)                                                      |
| Apply one recipe member              | `session.recipes.apply(recipe, options)` (recipe.md, "Applying a recipe")                           |
| Import a table for a recipe          | `application.import(source, options)` (recipe.md, "Table data")                                     |
| Read a run's results                 | `session.results.get(runId)` (shipped in 2.x; recipe.md, "Same data, same results")                 |
| Write results as columns to a file   | `session.data.export(format, options)` (export-mapping.md, "The export call")                       |
| Replay in a script or a CI job       | `createGraphSession({ limits })` from the `./session` entry point, which runs in Node with no page  |
| Record the session's analysis        | `session.recipes.record(options)` (recipe.md, "Recording")                                          |
| List algorithms, options and layouts | `session.catalog.algorithms()`, `session.catalog.layouts()` (shipped in 2.x; recipe.md)             |
| Check a file by hand                 | the schemas of this directory, with the command under "Your first style"                            |

Before recipes are released, graphty-element needs every one of these changes, each specified on
the page named. They are preconditions, not follow-ups. The ones that change a published
behaviour wait for graphty-element 3.0.0, the breaking release the graph-format migration already
groups, and are marked (3.0.0):

- every import following "What every importer produces": GML, DOT and Pajek read through graph-io;
  the weight published as the column `weight`, with no legacy `value` fallback (3.0.0); an edge
  whose weight is not a number kept without a weight and counted, which needs a graph-io option,
  where graph-io's importers drop the edge today; JSON read through graph-io's dialect importer,
  with an embedded member's `dialect` forced; a compressed file refused with its reason; a graphty
  document given to a data import refused (container.md, "Reading a file"); and the `directed` and
  `repeatedEdges` import options published in the catalogue for every format, where today they are
  only element settings (container.md, "Import options");
- an import remembering which columns it read an edge's ends and a node's id from, and
  `RecipeApplication.import`, which reads a table with the recipe's `table` and `directed` and
  applies the recipe's leading edge filters row by row while it reads (recipe.md, "Table data");
  an import source `stream` (a `ReadableStream` of bytes), and a table read from a `file`, a
  `stream` or a `url` as a stream, row by row, never held as one string;
- `createGraphSession({ limits })` raising the load ceilings for a session that draws nothing,
  and the ceilings counted after a recipe's read-time filters and the merge of repeated rows
  ("Limits");
- a session record leaving `weight` unset where graph-format's weight-set bit says the weight was
  defaulted, and a file's own field named `weight` kept as `weight_1` ("What every importer
  produces" rule 2);
- the `directed` and `repeatedEdges` import options applied to a `neo4j`-variant CSV like any
  other;
- the delimiter hint in the error of a table import that found no endpoint columns ("What every
  importer produces");
- import options of a data member checked against the options the format declares, with no
  exemption for the keys graphty-element keeps for itself (`url`, `data`, `file`, ...), and
  `edgeSource`, `edgeTarget`, `idColumn` and `nodeIdPath` read from a document as plain field
  names, never evaluated as expressions (container.md, "Import options");
- the SHA-256 of the bytes of the file a graph was imported from, kept with the graph (container.md,
  "The data member" rule 5);
- the load ceilings applied to a preview's scratch import and to a data member's import, and a
  preview's import held to the opening budget ("Limits");
- `openDocument` and `saveDocument` with the options of container.md, instead of the named members
  the element API design sketched, including the opening budget, checked inside a layer's
  evaluation ("Limits"), and the document-wide recipe budget;
- per-layer failure, the kept state of a refused layer, a flag that tells a layer switched off for a
  missing column from one the user switched off, the `waiting` and `failing` layer states (a
  layer that throws while it paints, which 2.x leaves enabled and silent), session-scoped carried
  palettes, the check that refuses a binding with both `domain` and `clamp` (2.x throws only while
  painting), and the `columns` and `onRepeat` options of `applyTemplate` (style.md, "Reading and
  applying"). For `applyTemplate`, the changes that alter a published contract wait for 3.0.0
  (style.md, "When this applies"); `openDocument` has them from its first release;
- a node's `data.id` reading the node's id when the node has no column `id` (style.md, "Paths"
  rule 4);
- ordering comparisons (`<`, `<=`, `>`, `>=`) reading text that reads as a decimal number as that
  number, as a numeric scale already does (README, "What every importer produces" rule 4) (3.0.0);
- tied categories ordered by code point, not by the reader's locale (style.md, "Bindings" rule 8)
  (3.0.0);
- keeping each layer's text as read, before a `columns` rename or a namespace rewrote it, and the
  unknown object members of each layer, so a save writes them back (style.md, "Writing";
  container.md, "Writing a file" rule 3);
- a graphty-element 2.x patch release in which `applyTemplate` refuses an object whose `kind` is
  present and not `"graphty-style"`, or whose `layers` is not an array, with
  `E_UNSUPPORTED_VERSION` and a sentence saying the file needs a newer graphty-element, instead of
  failing with a `TypeError`;
- storing a layer's authored `id` and writing it back (style.md);
- a maximum for `edge.patternCount` and every other count a style or a layout option can set, and
  checking every value an encoding produces against its channel (style.md, "Channels and values";
  recipe.md, "Running");
- `session.recipes.apply` and `session.recipes.record` (recipe.md);
- the applier's handling of `graph.filter`, which is recipe syntax, not a session command: each
  run is given the recipe's kept graph as an explicit inline scope, with `"graph"`,
  `"largest-component"` and a `where` scope evaluated within it, and the kept graph is shown
  through the session's own `visibility.set` (recipe.md, "Commands" rules 5 and 13); and a new
  filter rule that drops the nodes left with no edge after the filter's other rules: the existing
  `degree` rule reads the whole graph's degree, so it cannot say this;
- every command a recipe can run stopping when it reaches the cap -- run where the applier can
  terminate it, or checking its cancellation signal inside its inner loop -- and every cost class
  an upper bound that counts every option multiplying the work (Girvan-Newman's `maxIterations`
  among them); the catalogue marks an algorithm that does not meet both `unbounded`, and a recipe
  skips it (recipe.md, "Running");
- a `weight` option on every algorithm that reads edge weights, typed `attribute` in the catalogue,
  with no weight as its default, that builds a per-run weight array from the named column on the
  CPU path and the accelerated path alike (recipe.md, "Commands" rule 6). Louvain and others read
  the one weight fixed at import today, which a plan cannot show and a recipe cannot turn off;
  their callers who rely on that get unweighted runs after the change. PageRank already has a
  `weight` option, but any value of it asks for the weight fixed at import, whatever column it
  names; after the change the value is the column it reads. Both are breaking changes (3.0.0);
- an option of type `attribute` or `partition` accepting an earlier run's result
  (`{ "result": "<as>.<field>" }`; recipe.md, "Commands" rule 4);
- a `randomised` and an `orderDependent` fact in every algorithm descriptor, the run's `seed`
  feeding the algorithm's own seed option (label propagation's `randomSeed` today) and a
  command that gives that option in `params` refused, a seed drawn
  and reported in the caveats for every randomised or sampled run given none whose seed option
  has no published default, and every layout engine with a seed option reporting the seed it
  used, so a recorded run or layout can always be replayed with the seed it used;
- a run record that keeps the run's `RunStyle` and, for a run on the visible graph, the filter
  and the time window in force when it started, and a layout record that keeps when the layout
  was set and the filter in force then (recipe.md, "Recording");
- an application's `remove()` restoring the filter and the layout it replaced, and the undo steps
  of an opening, a `run()` and a `remove()` (recipe.md, "Applying a recipe", "Undo");
- the largest-component scope choosing among tied components by the rule of recipe.md, "Commands"
  rule 5, and an edge-predicate scope (`on: "edges"`) for runs;
- the cost gate holding a sampled run's own estimate to the cap, and a cost estimate for every
  layout engine (recipe.md, "Running");
- `session.data.export`, the export path from the session through graph-io's exporters, with the
  `resultNames` option that names result columns (export-mapping.md, "The export call"), which
  `saveDocument`'s embedded data uses too (container.md, "Writing a file" rule 4);
- the recorder writing `table` from every table import that built the graph, the SHA-256 of each
  imported file in the recipe report, and `record()`'s `sources` (recipe.md, "Recording" and "The
  replay report");
- the error and warning codes and the report shapes of "Error and warning codes" below.

## What version 1 does not cover

Stated plainly so no one discovers it from a failed file. Each is a later version's work.

- **Reading instructions for data**: which column is the id beyond the import options, joins,
  column types and value ranges, general row filtering, reading compressed files by an import
  option. (A recipe's leading edge filters are applied while its table is read, recipe.md, "Table
  data" rule 4, and a compressed file is read through a `stream` the caller decompresses.)
  The data plan, in [drafts/](drafts/), is the design work. Until then a referenced file takes
  graphty-element's import options, which are only those of container.md, "Import options". Four
  consequences:
    - **Scale.** A recipe cannot say what a column must hold. STRING publishes `combined_score` from
      0 to 1000 in its bulk download and from 0 to 1 in its web export, under the same name. A
      recipe written for one binds cleanly to the other: ``data.combined_score >= `700` `` matches
      nothing on the 0-to-1 file (reported, `E_SCOPE_EMPTY`), and ``>= `0.7` `` matches every edge
      of the 0-to-1000 file, which the plan reports as a scope matching every edge. A style's
      explicit `domain` has the same problem (style.md, "Bindings" rule 1). Check the scale of a
      column before replaying a recipe that compares it with a number.
    - **Joins and other preparation.** A data member is one file. Node names that live in a second
      file (STRING's `protein.info` with `preferred_name`, a DESeq2 table keyed by gene symbol)
      cannot be attached to it; in a session, import the second file with `mode: "merge"` and
      `idColumn`, and to carry both inside a document, combine them into one GraphML or node-link
      JSON file first. In R:
      `g <- igraph::graph_from_data_frame(edges, directed = FALSE, vertices = de_table)` then
      `igraph::write_graph(g, "net.graphml", "graphml")`, where the first column of `de_table`
      holds the node ids spelled exactly as the edge list spells them; in Python, NetworkX's
      `set_node_attributes` then `write_graphml`. A step like this cannot be recorded or checked,
      so a recipe that needs one says so in its `description`, the first thing a person replaying
      it reads.
    - **STRING's bulk downloads** list every interaction twice (`A B` and `B A`), are undirected,
      separate columns by single spaces and are distributed only as `.txt.gz`. Read one through a
      `stream` piped through `DecompressionStream("gzip")`, with `delimiter: " "`,
      `edgeSource: "protein1"`, `edgeTarget: "protein2"`, `directed: false` and
      `repeatedEdges: "first"`, which on an undirected import merges the two rows of each pair and
      keeps the first row's `combined_score` (both rows carry the same one). A recipe's `table` and `directed` carry those options for `recipe.import`
      ("Replaying a recipe on your own table"), a data member carries them for its file, and
      `saveDocument` writes them for the file the session was loaded from (container.md, "Writing
      a file" rule 4).
    - **Repeated pairs and direction** are flagged, not changed. `W_DIRECTION_DIFFERS` has two
      triggers: the recipe's `directed` differs from the graph's (recipe.md, "Binding to a new
      graph" rule 5), and, whatever the recipe records, more than half of a directed graph's edges
      have a reverse twin, when it suggests `directed: false`. Likewise `W_PARALLEL_EDGES` comes
      from `parallelEdges: false`, or from more than half of an undirected graph's connected pairs
      being held by two or more edges, when it suggests `repeatedEdges`.
    - **Neo4j.** Two export routes are read, and they spell types differently ("What every
      importer produces" rule 3). The one a style or recipe for Neo4j data SHOULD be written
      against is neo4j-admin import CSVs (`:ID`, `:LABEL`, `:START_ID`, `:END_ID`, `:TYPE`), which
      `apoc.export.csv.all` writes with `bulkImport: true` and graphty-element reads as the CSV
      variant `neo4j`. `apoc.export.graphml.all` also gives a file graphty-element reads, with
      node labels as `:Supplier:Company` and the relationship type in `label`. APOC's plain
      `apoc.export.csv.all` writes nodes and relationships in one file (`_id`, `_labels`,
      `_start`, `_end`, `_type`), and a Browser query export is any table; neither is read as a
      graph as it is: split such a file into a node table and an edge table and import them with
      `idColumn: "_id"`, then `edgeSource: "_start"` and `edgeTarget: "_end"`.
- **What a weight means.** A recipe cannot say whether a weight is a strength (bigger is closer) or a
  distance (bigger is farther). Path-based algorithms (betweenness, closeness, shortest paths) read
  a weight as a distance, so a confidence or correlation column must not be their weight. A
  weighted path analysis needs a distance column in the imported file (for STRING,
  `1000 - combined_score`, computed before import); say so in the recipe's `description`, or run
  the command unweighted.
- **Choosing a subgraph by anything but rules over columns**: particular nodes, the neighbourhood
  of chosen nodes, a kept set, one community. A recipe's filters and scopes are rules over the
  columns of one table at a time (recipe.md, "Commands" rules 5 and 13). A STRING-style
  high-confidence analysis -- keep the edges scoring 700 or more, drop the nodes left without an
  edge, then compute on the largest component -- is a `graph.filter` and a run on
  `"largest-component"`.
- **Recipe commands beyond filters, runs and a layout**: computed columns (a distance from a
  confidence), randomised null models, fetching data. A later release adds them as new commands;
  an older reader skips an unknown command and every command after it (recipe.md, "Replaying").
- **Algorithms that need a particular node** (a shortest path between two chosen nodes, a search
  from a start node): a recipe never names a node, and version 1 has no way to choose one by a rule.
- **Testing whether a list or a text holds a value** (`contains(data.aliases, 'TP53')`): the
  expression language has no functions, so a list column is compared only as a whole ("What every
  importer produces" rule 5). A Neo4j node with two labels has the `labels` text `Supplier;Company`,
  which `== 'Supplier'` does not match; a style for multi-label nodes names each combination it
  cares about.
- **Mapping category values** (`SUPPLIES` in one dataset, `supplies` or `supplier_of` in another):
  `columns` renames columns, never values. A style reports every `map` key that matched no value
  (style.md, "Bindings" rule 9), so a vocabulary mismatch is seen.
- **Column names a path cannot spell.** A name holding both a dot and another character that is not
  a letter, digit or underscore (`log2.FC (T/N)`) cannot be written in a path, because a quoted
  segment may not hold a dot in 2.x. Write the document with a plain name (`data.log2FC_TN`) and
  open it with `columns: { "log2FC_TN": "log2.FC (T/N)" }`; the map rewrites the parsed path, so
  any name works there.
- **Selecting edges by id in a style** (the ids graphty-element 2.x writes are session counters), and
  reading an edge's endpoints in a style.
- **Pinning precision or an implementation.** Neither a recipe nor a caller can require double
  precision or a CPU run; the report shows the precision each run used (recipe.md, "Same data, same
  results").
- **Expected results, signatures and dataset fingerprints.** A recipe cannot carry the numbers a
  replay should reproduce, and a report does not compare against them; recipe.md, "Same data, same
  results" says how to compare two replays by hand.
- **Reading other tools' style files**: Cytoscape's `styles.xml`, the style of a `.cys` session, CX2
  visual properties. style.md, "Coming from Cytoscape" translates one by hand.
- **RDF** (Turtle, N-Triples, JSON-LD) is not read. Convert to a listed format first; the columns
  are what that format's importer produces, and their names depend on the converter (a full IRI,
  `rdf:type`, `type`). A document for RDF-derived data uses plain column names and says in its
  `description` which rename it expects; the reader passes it, for example
  `columns: { "entity_type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" }`, which reaches a
  name no path can spell.
- **Authors, licences, citations and DOIs** as members. Until a later version adds them, they go in
  the reserved extension `graphty.provenance` (container.md, "Extensions"), which that version
  will upgrade.
- **Views and cameras**, **annotations** and **projects** (run records, stored results, positions,
  kept sets, the active filter, several graphs in one file): drafts only (drafts/).
- **Embedding graphty documents inside other tools' files**; a graphty document references the
  exported file instead (export-mapping.md).

## Error and warning codes

Documents have their own codes, a published contract of graphty-element, as the owner decided.
New error codes:

| Code                    | When                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_UNSUPPORTED_VERSION` | a container, member or style version this reader does not implement; details `{ kind, found, reads }`                                                                                                                                       |
| `E_BAD_DOCUMENT`        | malformed document content: a missing `members`, a member without a string `kind` or a positive integer `version`, an unknown member of a data member, a refused `href` (details `{ href, reason }`), a `__proto__` or repeated member name |
| `E_UNKNOWN_COMMAND`     | a recipe command whose `op` this reader does not know; details name the nearest known `op`                                                                                                                                                  |
| `E_DEPENDENCY_SKIPPED`  | a command skipped because a command it reads, or a filter before it, was skipped                                                                                                                                                            |
| `E_REPEAT_APPLICATION`  | a recipe or style opened again where `onRepeat` refuses it                                                                                                                                                                                  |
| `E_DIGEST_MISMATCH`     | referenced data whose bytes differ from the recorded SHA-256                                                                                                                                                                                |

A new published `GraphtyWarningCode` union, for notices that do not stop anything:

| Code                     | When                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `W_UNKNOWN_MEMBER`       | an object member this reader does not know, ignored; the JSON pointer names it                                                 |
| `W_UNKNOWN_KIND`         | a member of a kind this reader does not know, skipped and kept on save                                                         |
| `W_COLUMN_TYPE`          | a column compared with or scaled as a number holds values that are not numbers; details `{ column, count }`                    |
| `W_DIRECTION_DIFFERS`    | the graph's direction differs from the recipe's, or a directed graph looks undirected                                          |
| `W_PARALLEL_EDGES`       | a recipe recorded on a graph without parallel edges replayed on one with them, or most pairs of an undirected graph held twice |
| `W_TABLE_COLUMNS_DIFFER` | the table data was read with options other than the recipe's `table` (another delimiter included), or without them             |
| `W_FILTER_AFTER_IMPORT`  | a recipe's leading edge filter was not applied while its table was read, and runs after import instead; the reason is named    |
| `W_MATCHES_NOTHING`      | a style layer's selector bound and matched no element; the column's most frequent values are listed when it compares a text    |
| `W_ID_COLLISION`         | a style opened from another file claims the `id` of a style already opened; its layers were added, not replaced                |
| `W_PAINTS_OVER`          | a run's suggested colouring, or a file's style layer, will paint a channel an enabled layer already paints                     |
| `W_RELEASE_DIFFERS`      | the file or recipe was written by another release of graphty-element                                                           |
| `W_PRECISION_DIFFERS`    | a run replays in another precision than its recipe records (`recordedPrecision`)                                               |
| `W_DATA_DIFFERS`         | the loaded graph came from a file whose bytes differ from the data member's `sha256`                                           |
| `W_FEW_VALUES`           | fewer than half of the elements a style layer or a recipe command reads have a value at a path it reads                        |
| `W_GRAPHTY_*`            | the loss notes of an export (export-mapping.md, "Loss notes graphty-element adds")                                             |

`E_TOO_LARGE` and `E_CAP_EXCEEDED` are widened to the document limits, the referenced-data limit
and the recipe budgets, and
`E_UNKNOWN_FORMAT` to "this JSON text is not a graphty document", with `details.available` listing
the data formats the caller can import it as instead, and to a data member whose `format` or
`dialect` the reader's catalogue lacks, with details `{ format, dialect, available }`. Every other condition reuses an existing code
with its documented meaning. The report shapes are those of container.md ("The report"), style.md
(`StyleReport`) and recipe.md ("The replay report").

## Open decisions

None for version 1. The owner's decisions settle the scope, the container, the file name and media
type, filters, weights, table columns, error codes and export column names
([../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md));
every other choice in this directory can still be changed by an edit until graphty-element 3.0.0
publishes it.

## Appendix: Review record

Objections raised in review of this specification and its earlier drafts that were not taken, each
with the reason. Objections that were taken are reflected in the text.

- _Match a missing column by other spellings (a declared list of alternative names, or matching
  without regard to case)._ Not taken: the owner decided a missing column is reported, never
  guessed. A caller who knows the mapping passes it when applying ("Applying a style and a recipe to
  new data" rule 2). An author-declared list (`"columns": { "confidence": ["confidence", "score",
"weight"] }`) was raised again for groups whose members use different tools; it is still a
  second binding rule every reader must implement, and a list chosen by one author binds a
  column of another meaning on the next dataset (`weight` is not always a confidence). A recipe's
  top level is an open object, so a later version can add it without breaking version 1 files. It
  was raised a third time, per column (`"aliases": { "relation": ["type", "interaction", "label"] }`),
  for a group whose members use five tools, with the same answer. What was taken instead: a
  recipe's `table` may list several readings for tables headed differently (recipe.md, "Table
  data" rule 1), and nearest-name suggestions now also offer a column sharing a word with the
  missing one ("Limits"), so `logFC` suggests `log2FoldChange`.
- _Declare the attributes a recipe needs as slots, with measurement level and weight role, and bind
  them before running._ Replaced by the owner's decision that a recipe is a replayed journal whose
  commands name columns directly. What the slots were for -- knowing before running what a recipe
  needs -- is kept: the replay report lists every column each command names and whether it was
  found, before anything runs.
- _Put the whole session journal (imports, selections, camera moves) in the recipe._ Not taken: a
  recipe records only analysis commands, per the owner's decision; one-off actions tied to one
  dataset mean nothing on the next one (recipe.md, "What a recipe records").
- _Convert a similarity weight into a distance automatically for path algorithms._ Not taken: 1/w,
  1-w and -log w are different models, and choosing one is the author's decision, which belongs to
  the data plan of a later version.
- _Restrict colour values in the style schema to hex._ Not taken: graphty-element 2.x accepts and
  writes CSS colour strings, and every style it wrote must stay valid. The applier parses every
  colour and an export writes only the parsed value (style.md).
- _Refuse `source.by: "run"` on imported style layers._ Not taken as stated: a run-sourced layer is
  how a style says which run it paints. The applier stamps every imported layer with its document
  and keeps `by: "run"` only when that run exists in the session (style.md).
- _Keep a zip container for large projects with binary graph parts._ Not taken: the owner decided
  JSON only. A graphty document never carries the snapshot's binary wire form; large data is
  referenced as a file.
- _Carry must-understand feature names on every unit, so an old reader refuses rather than ignores a
  new member._ Not taken per unit: an addition an old reader would misapply by ignoring it is made
  in a new major version of that member kind instead, which the old reader refuses by version
  (container.md, "Versions"), and a recipe's unknown command already stops the replay. The one case
  a version cannot cover -- a new member kind that other members depend on -- is covered by the
  document's `requires` list.
- _Write every option value, defaults included, into every recorded command._ Not taken as the
  default: an option added in a later release would then make every recipe recorded on it fail on
  the release before, even when its author never touched the new option. A caller who wants the
  full parameter list in a methods supplement asks for it (`explicitDefaults: true`, recipe.md,
  "Recording"), and a changed default is reported on replay (recipe.md, "Commands" rule 3).
- _Include authors, licence and citation members now, because sharing among a community needs
  them._ Deferred: they are additive optional members a later version can add without breaking a
  version 1 file, and their names were not among the owner's decisions.
- _Let a referenced data member carry a second file as its node table (`nodes: { href, ... }`)._
  Not taken for version 1: a join is reading instructions for data, which the data plan of a later
  version specifies with its keys and conflict rules. "What version 1 does not cover" says to
  combine node attributes and edges into one GraphML or node-link JSON file first. Inside a
  session a node table and an edge list are two imports, the second merged, which version 1
  covers: styles and planned recipes bind again when the merge adds columns.
- _Add a `weightMeaning` (strength or distance) option to each run._ Not taken for version 1: which
  conversion turns a strength into a distance is the author's modelling choice, which belongs to the
  data plan. The limitation is stated under "What version 1 does not cover".
- _Declare each column's type and value range in the recipe, checked at binding._ Not taken for
  version 1: declaring what data must hold is the data plan's job. The importers' typing is
  published ("What every importer produces"), a type mismatch is reported (`W_COLUMN_TYPE`), a
  scope matching every element is reported, and the scale mismatch is stated as a known limit.
- _Let a scope combine a predicate with the largest component, or a node predicate with an edge
  predicate._ Not taken as a scope: the owner put filters in version 1, and a `graph.filter` before
  a run on `"largest-component"` says the same thing, while a scope stays one rule for one run.
- _Read `.gz` files by an import option._ Not taken for version 1: the catalogue publishes no such
  option. An import takes a `stream` instead, which the platform's `DecompressionStream`
  decompresses in one line (README, "Replaying a recipe on your own table"), and a compressed file
  given as it is fails with a reason naming that line. Filtering rows while reading, which the same
  objection named, is done for a table read through a recipe, by the recipe's own leading edge
  filters; direction and repeated pairs are import options.
- _Let a quoted path segment hold a dot._ Not taken for version 1: every style graphty-element 2.x
  wrote must stay a version 1 style that 2.x reads, and 2.x refuses such a segment. The caller's
  `columns` map, which rewrites parsed paths, reaches any column name.
- _Let a command, or the caller, require a precision (`precision: "double"`)._ Not taken for
  version 1: graphty-element has no per-run precision request. The report shows each run's
  precision and flags a different release, and README "Your first recipe" states the limit next to
  the claim of repeatable numbers.
- _Carry an expected-result digest or summary per command, and a data fingerprint in the report._
  Deferred with signatures: what counts as "the same result" for a sampled, randomised or
  floating-point run needs its own design. The determinism conditions are stated, the report no
  longer claims to show all of them, and recipe.md says how to compare two replays by hand.
- _Make a new recipe command a new major recipe version._ Not taken: `op` is an open list, and an
  unknown command stops the replay at that command, so an old reader still runs everything before
  it. A new major version would lock the old reader out of the whole recipe. What a later
  command needs from version 1 -- a scope of `"graph"` meaning the graph as earlier commands left
  it, binding checked again as each command starts, and a result named in `as` -- is stated now,
  so adding one changes no existing recipe.
- _Record the edge-weight column under the name each file gave it._ Not taken: a single name is
  what lets a weighted recipe replay across file types. Settled under "What every importer
  produces", as a rule graphty-element must meet before recipes ship.
- _Derive the template id from the file's digest, so a file cannot choose which look it replaces._
  Not taken: replacing an earlier opening by the style's `id` is how a corrected edition of a look
  replaces the last one, and a digest changes with every edit. What was taken instead: an `id`
  replaces by default only an opening from the same place (the same `base` directory or
  `fileName`); a style from elsewhere that claims the id is added beside it with
  `W_ID_COLLISION` (style.md, "Reading and applying" rule 9).
- _Warn about every predicate that compares an identifier-like column with a literal._ Taken only
  for what can be told reliably: a comparison of a community number from an earlier run with a
  literal is reported on recording and replay, and a save lists every literal a written predicate
  compares with. Which other columns are identifiers is not something a reader can know.
- _Let the applier refuse, not only warn, when the recipe's direction differs from the graph's._ Not
  taken: the fix is the `directed` import option, which the caller or the data member sets, and a
  refusal would stop a recipe whose author did not care about direction. The report warns before
  anything runs.
- _Make `capacity` and `colorblindSafe` optional in a carried palette._ Not taken: they are
  required in graphty-element 2.x's `PaletteDescriptor`, and a carried palette without them would
  be refused by every 2.x reader. The schema says what `[]` means.
- _Publish each algorithm's options and defaults as a table in this specification._ Not taken: the
  catalogue is the one source, exported from graphty-element's `./catalog` entry point, which runs
  in Node without a browser; a copy here would go stale with the first release that adds an
  option. recipe.md, "Finding algorithms and their options" shows how to list it.
- _Rename category values as `columns` renames columns (`values: { "suppliesTo": "SUPPLIES" }`)._
  Not taken for version 1: it is reading instructions for data, the data plan's work. Unmatched
  `map` keys are reported, and a scope or filter comparing with a text literal that matches
  nothing lists the column's most frequent values.
- _Add a worked example of the first style on a second dataset._ Not taken as a new example:
  style.md's worked example already opens one style on data that has its columns and on data that
  spells one differently (`FDR`), and README "Replaying a recipe on your own table" does the same
  for a recipe.
- _Specify how a node table and an edge list are merged into one graph before a style applies._
  Taken as far as the session goes: a merged import re-checks every style layer switched off for a
  missing column. How the two tables' keys are matched and conflicts resolved is a join, the data
  plan's work, and `saveDocument` refuses to write one reference for a graph built from two
  imports.
- _Rename the palette `blue-orange`, or add a `blue-red` alias._ Not taken for version 1: palette
  ids are graphty-element 2.x's published ids. The warning is in the Cytoscape translation table
  where a person looks for it.
- _Refuse to run a recipe whose scope or filter matches every element._ Not taken: on clean data a
  filter that keeps everything is the right answer, and refusing it would stop correct replays.
  The plan carries a notice, which a preview shows before anything runs.
- _Let a scope select the top fraction of a result (`{ "top": { "fraction": 0.05 } }`)._ Not taken
  for version 1: it is a new scope form every reader must implement. Every literal compared with
  an earlier run's result now carries a notice that it keeps another fraction on other data.
- _Make order-dependent algorithms visit nodes in a canonical order, and number communities
  canonically._ Not taken for version 1: it changes the results of every such algorithm, which is
  algorithm work, not a document format. The plan flags each order-dependent command, and recipe.md
  says to compare partitions rather than community numbers.
- _Let the caller require double precision (`precision: "double"`) on a replay._ Not taken for the
  same reason as the command-level request above: graphty-element has no per-run precision request.
- _Give every run a result digest in the report._ Deferred with signatures (above). A replay is
  compared by reading both runs' results with `session.results.get` (recipe.md, "Same data, same
  results"), or by exporting with named result columns.
- _Name the GPU layout's `deterministic` option among what the recorder writes._ Not needed: the
  recorder writes every option whose value differs from the default, whatever its name.
- _Give each `requires` entry a version, or name a member._ Not taken: `requires` names kinds whose
  absence would misapply the others, and a writer now recomputes it from the members it writes
  instead of keeping every entry it ever read. A look split into two style versions needs no entry.
- _Stamp each opened layer with a digest of its document, and refuse by default to replace layers
  another document added._ Taken in part: a template id derived from a name, a file name or a
  digest never replaces by default, so two files that share a name do not wipe each other. An
  authored `id` replaces by default only an opening from the same place, because that is how a
  corrected edition of a look replaces the last one; the preview and the report list every layer
  it replaces, and ids of graphty-element's own are reserved.
- _Add a test for list membership (`'Supplier' in data.labels`) to the expression language._ Not
  taken for version 1: the language has no functions or membership operators. A Neo4j node's
  labels are now text (`Supplier`, or `Supplier;Company`), so the single-label case colours and
  compares as a category.
- _Type CSV cells one at a time._ Not taken: graph-io and graph-format type a column as a whole. An
  ordering comparison and a numeric scale read numeric text as a number instead, which gives the
  same answer without a per-cell type.
- _Prescribe what a preview interface shows._ Not taken for its layout: presentation is the
  consumer's. Taken for its behaviour: an application that opens documents for a person SHOULD
  show the preview before applying and SHOULD NOT run recipes unasked ("Opening a file someone
  sent you"). The report carries what a preview needs first -- the author's name and description,
  a one-sentence summary per member, the plan's costs against the cap and the budget, and what
  would be replaced or painted over.

- _When a recipe's direction differs from the graph's and `run: true` was passed, plan without
  running._ Not taken, for the reason of the refusal above; a table read through the recipe now
  takes the recipe's `directed`, so the mismatch is left to structural files, which say their own
  direction.
- _Publish which algorithms take `weight`, which sample by default, and each algorithm's options
  (k-core, betweenness), here._ Not taken, for the reason under "Publish each algorithm's options
  and defaults" above: the catalogue is the one source, and `createGraphSession().catalog` lists
  it in Node.
- _Order ordinal categories by their text, so a category keeps its colour across datasets._ Not
  taken for version 1: it changes the order 2.x styles paint in. `map` pins the colours that must
  not move, as README "Your first style" says; a new ordering is an additive option later.
- _Split a short brand-colours guide from this specification._ Not taken here: the first style and
  "Saving your look" are the first things this page shows. A guide belongs to the documentation
  site, written from this page when graphty-element 3.0.0 ships.
- _Name the second dataset in a replay example._ Not a defect of the format: recipe.md's worked
  example replays one recipe on a GraphML file, on a CSV edge list headed `source,target,weight`
  and on a directed import.
- _Report a `passthrough` label reading `data.id` when every id reads as a number._ Not taken: a
  number is a legitimate label (Pajek's vertex numbers, a numbered sample), so the notice would
  fire on correct files. The two-layer label is now the portable form style.md's worked example
  shows, and "Paths" rule 4 says what a lone `data.id` label shows on a Cytoscape export.
- _Let a data member's `href` be left for the caller to supply, read with the recipe's `table`._ Not
  taken: a data member names one file so that `sha256` and consent mean something. Reading a
  table the caller picks is what the recipe's application `import()` does, and an application
  holding such a recipe offers it ("Opening a file someone sent you").
- _Hold a data member's real import to a time budget._ Not taken as a separate budget: the
  referenced-data byte limit and the load ceilings ("Limits") bound what an import reads and
  builds, and a stream that never ends is cut off at the byte limit.
- _Let the caller raise the load ceilings everywhere._ Taken only for a session that draws nothing:
  the ceilings measure what the renderer can hold, so an element on a page keeps them, and
  `createGraphSession({ limits })` raises them ("Limits").

## Sources

- The owner's decisions:
  [../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md).
- `design/element-api/element-api-design.md` sections 4.6.3 and 4.6.3a (documents and the file that
  combines them), 4.11 (commands, the journal, recipes).
- graphty-element 2.x: `src/catalog/types.ts` (`StyleDocument`, `LayerSpec`, `Selector`,
  `Binding`, `OptionDescriptor` and its option types), `src/session/styles/StylesApi.ts`
  (`applyTemplate`, `toDocument`), `src/session/styles/predicate.ts` (the expression language),
  `src/session/planning.ts` (`AlgorithmRunCommand`), `src/session/runs/types.ts`
  (`RUN_ID_PATTERN`, `RunStyle`, `Caveats`), `src/catalog/formats.ts` (format option names),
  `src/catalog/palettes.ts`, `src/errors/codes.ts`.
- graphty-element on the graph-format migration branch: `src/data/CSVDataSource.ts`,
  `src/data/JsonDataSource.ts`, `src/session/project/ingest.ts`, `src/config/DataConfig.ts`
  (`directed`, `repeatedEdges`, `edgeWeightPath`).
- graph-io: `src/formats/json/dialect.ts` (the JSON dialects), `src/formats/csv/header.ts` (the CSV
  candidate lists), each format's importer (column naming and the edge weight), `src/types.ts`
  (`LossNote`, `ExportCapabilities`).
- graph-format: `src/types/columns.ts` (column roles), `src/builder/freeze.ts` (the structural edge
  weight).
- Prior art: RFC 2119 and 8174; JSON Schema 2020-12; SemVer 2.0.0; nbformat's tolerant reader;
  kepler.gl's schema manager (upgrade on read); Vega-Lite (a declarative spec applied to new data).
