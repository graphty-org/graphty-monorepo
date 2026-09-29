# graphty document formats, version 1

graphty-element reads and writes graphs in the formats other tools already use. Those files carry a
graph; they do not carry what a person did with it in graphty. This directory specifies the two
graphty documents that carry those things, and the one JSON file they travel in:

- a **style**: how nodes and edges are drawn, as rules over the data's columns, so the same look
  applies to the next dataset;
- a **recipe**: the analysis commands that were run (filters, algorithms and a layout), so the same
  analysis runs on the next dataset -- a colleague's, a partner's, or your own next month.

Status: specification of version 1, not yet implemented; recipes need graphty-element 3.0.0. The
owner's decisions are in
[../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md).

## Your first style

Save this as `team-colours.graphty.json`:

```json
{
    "kind": "graphty-style",
    "version": 1,
    "layers": [
        {
            "name": "Colour by team",
            "selector": { "match": "has", "path": "team" },
            "encode": { "node.color": { "by": "team", "scale": "ordinal" } }
        }
    ]
}
```

Load any graph whose nodes have a `team` column -- a CSV, a GraphML file, a GEXF file, JSON -- then
open the style:

```js
const opened = await element.session.data.openDocument(text);
```

Every node with a team is coloured by team. On a graph with no `team` column the layer is added
switched off, and `opened.report` says it needs `data.team`. The style stays in force: load
another graph later and the layer binds again by itself, and `opened.report` is replaced by a fresh
one, so read the report from `opened`. Files graphty-element writes wrap a style in a
`graphty-document` that can carry several members; both forms open.

### More than eight teams

The colours come from the default palette, largest team first, so on next quarter's data a team can
change colour when the sizes change. The palette has eight colours; on data with more teams the
layer stops painting and the report says why, unless the binding says `"overflow": "other"`, which
paints the teams past the eighth dark grey. To keep a colour on a team, pin it with `map`
(`"map": { "sales": "#0b5fff" }`); to use your own colours, name your palette (style.md,
"Palettes").

### Saving your look

```js
const { text, report } = await element.session.data.saveDocument({
    members: ["graphty-style"],
    style: { id: "org.example-lab.expression", name: "Expression overlay" },
});
```

`text` holds only the style: never your data. It keeps the layers you made and the ones you opened,
and leaves out the colouring your analyses' runs added, because those runs do not exist where the
file is opened next; `report.leftOut` lists what was not written. To open an edited copy again in
the same session and replace the earlier one, pass
`openDocument(text, { onRepeat: { style: "replace" } })`.

## Your first recipe

Save this as `team-overview.graphty.json`:

```json
{
    "kind": "graphty-recipe",
    "version": 1,
    "id": "org.example.team-overview",
    "commands": [
        { "op": "graph.filter", "where": "confidence >= 0.4", "on": "edges", "dropIsolated": true },
        { "op": "algo.run", "algorithm": "pagerank", "as": "influence", "params": { "weight": "confidence" } },
        { "op": "algo.run", "algorithm": "louvain", "as": "groups" },
        { "op": "layout.set", "id": "force", "options": { "seed": 42 } }
    ]
}
```

Load a graph whose edges have a `confidence` column, then open the recipe and ask for it to run:

```js
const opened = await element.session.data.openDocument(text, { run: true });
```

Edges with confidence below 0.4 are dropped, along with any node left without an edge. PageRank
then scores what remains, weighted by confidence; Louvain groups it; and the layout starts from
seed 42, so it looks the same each time. If your graph has no `confidence` column, nothing after
the filter runs, and `opened.report` names the missing column and the closest one your data has.
Opening a recipe without `run: true` runs nothing: it reports what would run and what it would
cost.

A filter or a scope is a comparison over columns: `confidence >= 0.4`, `type == 'protein'`,
`significant == true`, joined with `&&` and `||` (style.md, "Expressions").

You rarely write a recipe by hand: `session.data.saveDocument({ recipe: { id } })` records the
analysis of a session as a recipe, beside the look as a style (recipe.md, "Recording"). The
algorithms, options and layouts a recipe can name are in graphty-element's catalogue (recipe.md,
"Finding algorithms and their options").

### When a replay differs

- **A column spelled differently.** `openDocument(text, { run: true, columns: { confidence: "score" } })`
  reads your `score` wherever the recipe says `confidence`.
- **A run's colouring covering yours.** Each run paints its suggested colouring above your layers;
  write `"style": false` on the run to keep your own on top. The report's `W_PAINTS_OVER` says when
  one would be covered (recipe.md, "Commands" rule 8).
- **A weight read as a distance.** Betweenness, closeness and shortest paths read a weight as a
  distance, so never give them a confidence or a correlation as `weight`: bigger would mean
  farther. Run them unweighted, or on a distance column (recipe.md, "Commands" rule 6).
- **Precision.** A WebGPU accelerator computes in single precision and the CPU in double. Set the
  element's `acceleration` to `"off"` on every machine that records or replays, for the same
  numbers everywhere (recipe.md, "Same data, same results").

## Replaying a recipe on your own table

A GraphML, GEXF, GML, DOT, Pajek or JSON file says itself which fields are an edge's ends. A table
does not, so a recipe meant for tables says in `table` how its table is read -- the endpoint
columns, and the delimiter and repeated rows when they are not the defaults (recipe.md, "Table
data"). This one is for STRING's space-separated bulk download:

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
            "description": "STRING bulk protein.links files (combined_score 0 to 1000). A bulk download is larger than a browser's load ceilings: replay it in Node with raised limits.",
            "directed": false,
            "parallelEdges": false,
            "table": { "edgeSource": "protein1", "edgeTarget": "protein2", "delimiter": " ", "repeatedEdges": "first" },
            "commands": [
                { "op": "graph.filter", "where": "combined_score >= 700", "on": "edges", "dropIsolated": true },
                { "op": "algo.run", "algorithm": "louvain", "as": "modules", "scope": "largest-component" }
            ]
        }
    ]
}
```

Open it first, then import your table through it, look at the plan, and run:

```js
const opened = await element.session.data.openDocument(recipeText);
const recipe = opened.recipes[0]; // one application per recipe of the file, in file order
await recipe.import({ type: "csv", config: { file } }); // read with the recipe's table and directed
console.log(recipe.report); // what bound, what the filter keeps, what it will cost
recipe.run();
```

`recipe.import` reads the file the way the recipe's `table` and `directed` say: here
space-separated and undirected, each pair's two rows (`A B` and `B A`) merged into one edge. A
gzip file (STRING ships `.txt.gz`) is decompressed as it is read. A comma-separated screen exported
as `gene_a,gene_b,confidence` needs only `"table": { "edgeSource": "gene_a", "edgeTarget": "gene_b" }`,
and `"directed": false` for undirected interactions. Your own options win: pass `edgeSource`,
`delimiter` or anything else in `config`, and the report says where they differ from the recipe's.

Nothing runs until you call `run()`. A STRING bulk download is larger than the load ceilings of an
element on a page ("Limits"); in a Node script or a nightly job the same recipe replays in a
session that draws nothing, which may raise them:

```js
import { openAsBlob } from "node:fs";
import { createGraphSession } from "@graphty/graphty-element/session";

const session = createGraphSession({ limits: { nodes: 1_000_000, edges: 20_000_000 } });
const [recipe] = (await session.data.openDocument(recipeText)).recipes;
await recipe.import({ type: "csv", config: { file: await openAsBlob("4932.protein.links.v12.0.txt.gz") } });
await recipe.run();
```

A colleague whose file names a column differently opens the file with `columns` (see "When a replay
differs").

## Opening a file someone sent you

Look first. `apply: false` changes nothing and returns the full report: every member, the columns
each style layer and recipe command needs and whether your graph has them, what each command would
cost, and whether the file carries data of its own.

```js
try {
    const { report } = await element.session.data.openDocument(text, { apply: false });
    // show each report.members[i].summary, report.recipes and every notice
} catch (error) {
    // the whole file refused: not a graphty document, or a version or required kind this
    // release does not read. A GraphtyError: error.code and error.details say which.
}
```

Then open it, renaming columns your data spells differently:
`openDocument(text, { columns: { team: "department" } })`. A file that carries data never replaces
a graph you already loaded unless you pass `data: "replace"`. `opened.recipes` holds each recipe's
application, whose `run()` starts a recipe you opened without running it, and `opened.remove()`
takes back everything the file added.

An application that opens documents for a person MUST show that preview first -- each member's
`summary`, every recipe's costs and `wouldStart`, and every notice -- before a second call applies
the file, and MUST NOT pass `run: true` unless the person asked for the recipes to run. When the
file holds a recipe with a `table`, it SHOULD offer to import data through that recipe's
`import()`, and when a member needs a column the person's data lacks, it SHOULD let the person pick
one of their own and pass the choices as `columns`. This says what is shown and when, not how it
looks.

**Checking a file by hand.** The schemas of this directory check a file's shape. From this
directory:

```sh
npx -y -p ajv-cli@5 -p ajv-formats ajv validate --spec=draft2020 -c ajv-formats --allow-union-types --all-errors \
    -s container.schema.json -r style.schema.json -r recipe.schema.json -r data.schema.json -d lab.graphty.json
```

For a bare member, give its kind's schema with `-s` and the others with `-r`. The schemas do not
check algorithm keys, option names or column names; `openDocument(text, { apply: false })` checks
those too, in plain sentences, and changes nothing.

## The documents in this directory

<!-- prettier-ignore -->
| Page | Schema | What it specifies |
| --- | --- | --- |
| [container.md](container.md) | [container.schema.json](container.schema.json), [data.schema.json](data.schema.json) | The one JSON file: how it is recognised, versioned, extended, applied and written; the data member |
| [style.md](style.md) | [style.schema.json](style.schema.json) | The style member: layers, selectors, encodings, carried palettes |
| [recipe.md](recipe.md) | [recipe.schema.json](recipe.schema.json) | The recipe member: its commands, how it binds to a new graph's columns, how it replays and is recorded |
| [export-mapping.md](export-mapping.md) | -- | How styles and results are written into other tools' formats |
| [conformance.md](conformance.md) | -- | The edge-case rulings: input, expected result, the rule each follows; each row becomes a test |
| [drafts/](drafts/) | -- | Data plan, view preset, annotations and the earlier project envelope: not version 1 |

## Conventions

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they
appear in all capitals. A **writer** produces a document; a **reader** parses one; an **applier**
changes a live graph session from one. graphty-element is all three.

1. The JSON Schema files (draft 2020-12) are normative for the data model: what a conforming writer
   produces. The TypeScript in the prose is illustrative and MUST agree with them.
2. The prose is normative for behaviour: what a reader does with any input, conforming or not. A
   reader does not use a schema as an accept-or-refuse test for the whole file; it checks each
   member, and in a style each layer.
3. The schemas are published at `https://graphty.app/schema/documents/<kind>/v<major>.json`
   (`graphty-document`, `graphty-style`, `graphty-recipe`, `graphty-data`) and exported from
   graphty-element with the same content.

## Three things called a file format

<!-- prettier-ignore -->
| Layer | What it is | Owner | Who sees it |
| --- | --- | --- | --- |
| Other tools' formats | GEXF, GraphML, GML, DOT, Pajek, CSV, JSON (node-link, d3, JSON Graph Format, Cytoscape.js, graphology, vis) and neo4j-admin import CSVs | graph-io | users: their data files |
| The snapshot | graph-format's frozen in-memory graph and its binary wire form | graph-format | nobody: never a file |
| graphty documents | the JSON file of this directory: styles, recipes, optionally the data | graphty-element | users: files they save, share and open |

1. **Import.** graph-io reads a file in any of these formats and produces one snapshot, by the rules
   below. Node ids and edge endpoints are structure; every other attribute is a **named column**.
2. **Why a document is portable across file types.** A style and a recipe name only columns
   (`data.team`, `weight`), never a file's syntax and never a particular node or edge, so a recipe
   recorded on a GraphML import replays on a CSV, a GEXF or any other file whose import has the
   columns it names -- the owner's "same format" means the same columns.

Export is export-mapping.md's; data inside a document is container.md, "The data member".

### What every importer produces

A style and a recipe bind to the columns an import produces, so these rules are what version 1
requires of every import. The header names an importer recognises by itself (the table below) are
its own behaviour, not the document format: a recipe for a table names its endpoint and id columns.

1. **Node ids and edge endpoints** are structure, not columns. The header or field chosen as a node
   id or an endpoint is consumed; every other one stays a column, so a node table headed
   `id,name,padj` keeps `name`. A style reads a node's id through `data.id` (style.md, "Paths"
   rule 3); a recipe never names one.
2. **The edge weight** is the edge column `weight` after every import, whatever the file called it:
   a CSV's `weight` or `Weight`, a GraphML or GEXF `weight`, GML's `value`, Pajek's third column. An
   edge whose weight is empty or not a number is kept, with no `weight` value, and counted in the
   import report: an import never drops an edge for its weight.
3. **Every other attribute** is a column named exactly as the file names it: a CSV header, a GraphML
   key's `attr.name`, a GEXF attribute's `title`, a JSON member name, a Neo4j property. A label the
   format itself defines (GEXF, GML and DOT `label`, a Pajek vertex label) is the column `label`.
4. **Value types** are the file's own where it declares them (GraphML and GEXF keys, Neo4j header
   types, JSON values). Where it declares none (CSV, DOT), graph-io types each column as a whole: a
   column of numbers is numbers, one `NA` cell makes it text, and `true` and `false` written
   exactly so are booleans. An ordering comparison (`<`, `>`), a weight and a numeric scale read a
   value as a number when it is one or is text that reads as a decimal number (`"0.01"`); every
   other value (`NA`, `NaN`) is not a number, never matches such a comparison, is never painted by
   a numeric scale, and is counted with `W_COLUMN_TYPE`. `==` and `!=` stay exact: `"1"` is not
   `1`. An element that leaves an attribute out has no value there, whatever default the file
   declares.
5. **Lists.** A Neo4j array, a JSON array and a GEXF `liststring` are kept as lists, compared only
   whole: no expression tests whether a list holds a value.
6. **Rows are imported as given**, unless the `repeatedEdges` import option says otherwise
   (recipe.md, "Table data" rule 1): a file listing each pair twice gives two edges. A
   gzip-compressed file is recognised by its first two bytes, never by its name, and decompressed
   as it is read.

Where each importer finds its structure when no import option says otherwise:

<!-- prettier-ignore -->
| Format | Edge endpoints | Node ids | Weight | Direction when the file does not say |
| --- | --- | --- | --- | --- |
| CSV | the first pair found of `source`/`target`, `src`/`dst`, `from`/`to`, exactly then without regard to case; headerless: columns 1 and 2 | a node table's `id`, any case | `weight`, any case | directed; Gephi's `Type` column per row |
| GraphML | each edge's `source`, `target` | node `id` | the key named `weight` | `edgedefault`, else undirected |
| GEXF | each edge's `source`, `target` | node `id` | the edge's `weight` | `defaultedgetype`, else undirected |
| GML | each edge's `source`, `target` | node `id` | `value` | `directed`, else undirected |
| DOT | the edge statement | the node's ID | `weight` | `digraph` directed, `graph` undirected |
| Pajek | the arc or edge line | the vertex number | the third column | `*Arcs` directed, `*Edges` undirected |
| JSON | the dialect's own (node-link: `source`, `target`) | the dialect's own (node-link: `id`) | `weight` | the dialect's flag, else graph-io's default for it |
| neo4j-admin CSV (variant `neo4j`) | `:START_ID`, `:END_ID` | `:ID` | the `weight` property | directed |

The `directed` import option overrides the last column for every format. A CSV whose endpoint
columns are named otherwise (STRING's `protein1`, `protein2`) needs `edgeSource` and `edgeTarget`,
from the caller or the recipe's `table`; without them the import fails, naming the two options, and
never builds a graph without edges.

**CSV shapes.** A CSV file is one table; the `variant` import option says which shape (`edge-list`,
`node-list`, `adjacency-list`, `gephi`, `cytoscape`, `neo4j`, `generic`). Without it the importer
reads an edge list, or a node list when the header has no endpoint pair and has an `id` column or
the caller gives `idColumn`. A node table and an edge list are two imports, the second with
`{ mode: "merge" }`.

## The one JSON file

Every graphty document is one JSON file ([container.md](container.md)), saved as
`<name>.graphty.json` and recognised by its top-level `"kind": "graphty-document"`, never by its
name. `version` is the container's major version, 1. `members` holds any mix of `graphty-style`,
`graphty-recipe` and `graphty-data`, each with its own `kind` and `version`; a reader skips a
member it cannot read and applies the rest. A reader also opens the kindless style file
graphty-element 2.x writes, and a single member on its own. There is no zip container.

## Applying to new data

This is what the documents are for; style.md and recipe.md point here.

1. **Bind by name, report what is missing.** A style layer or a recipe command binds to the current
   graph by the exact column names it uses -- nothing is matched by case, similarity or position.
   A layer that names a missing column is added switched off with its reason; a command that names
   one is skipped with `E_UNKNOWN_ATTRIBUTE`, and so is every command that reads its result. Each
   report suggests up to three existing columns with the nearest names, and never uses one.
   Everything else applies.
2. **The caller may rename, the file may not.** A caller whose data spells a column differently
   passes a map from the document's name to the data's (`columns: { "team": "department" }`), which
   applies to every style and recipe member of the file on both tables; `nodeColumns` and
   `edgeColumns` rename on one table only and win there. The map rewrites parsed paths and
   expressions, never text, and each member's report records it. It renames columns, never values:
   `SUPPLIES` and `supplies` are two categories.
3. **Order.** Data, then recipes, then styles; a run's own colouring is added above every layer when
   the run completes (container.md, "Applying a file" rule 2).
4. **Nothing happens without being asked.** Opening a recipe binds and plans it: the report lists
   every command, whether it can run and its estimated cost. Runs start only when the caller asks
   (`run: true`, or `run()`), and a recipe's filter is shown only then. A file's data never
   replaces a loaded graph unless the caller passes `data: "replace"`. `apply: false` changes
   nothing at all.
5. **Load first, then open -- or open first.** Whenever the graph's columns change (an import that
   replaces the graph or is merged into it, elements gaining a column no element had) and whenever
   a run completes, graphty-element MUST re-check every style layer switched off only for a missing
   column or run, switch on those that now bind, and replace the opening's `report` with a fresh
   one before the import's promise resolves. A recipe planned but not run is planned again at the
   same moments. A document opened while no graph is loaded holds its recipes: they bind and plan
   when data arrives, and never run by themselves -- the caller reads the plan and calls `run()`,
   whatever `run` the opening was given.
6. **Opening the same thing twice.** A recipe applied again to the same data is refused unless the
   caller says otherwise (recipe.md, "Applying a recipe"); a style opened again from the same
   address replaces its earlier layers (style.md, "Reading and applying" rule 8).
7. **One report shape.** Opening returns a report per member (container.md, "The report"): what
   applied, what did not, and why, with a code and a sentence a person can act on.

## Trust

A document is data from someone else.

1. **Nothing in a document is executed as code.** A document never names code to load or a package
   to install. The only language in it is graphty-element's expression language (style.md,
   "Expressions"), interpreted with no access to the page and bounded by the limits below.
2. **A recipe spends compute only when asked**, every command held to the same cost cap as the same
   call made by hand, which a document cannot raise, and all the recipes of a file to one total
   budget; a command is stopped when it reaches the cap, and one whose cost cannot be bounded is
   not run from a recipe (recipe.md, "Running").
3. **Nothing is fetched.** A version 1 document names no file or address to read, and `$schema` is
   never fetched.
4. **A file's data does not replace yours by default** ("Applying to new data" rule 4).
5. **Imported layers say where they came from.** A layer from a document is stamped with the
   document it came from (style.md, "Reading and applying" rule 6). `generator` is a claim the file
   makes, shown as such. Style and recipe ids starting `graphty.` or `graphty:`, or on
   `graphty.app`, in any case, are reserved for graphty-element. Ids hold only letters, digits and
   `. _ : / -`.
6. **Text is text.** Every string from a document or its data that a reader shows -- labels, names,
   descriptions, a column or member name a report quotes -- is rendered as text, never as HTML, and
   isolated from the text around it, so right-to-left override characters cannot reorder what
   follows. A report quotes a string from the data or an unknown member cut to 256 characters.
7. **A service that runs documents submitted by others** against data of its own MUST NOT return
   their reports to the document's author: a report's counts and quotes reveal the data.

## Limits

A reader MUST enforce these before applying anything, and refuse with `E_TOO_LARGE`, naming the
limit, when one is exceeded. A caller MAY raise the file, member, layer and command limits and the
opening budget through `openDocument`'s `limits` and `openingSeconds`; the import limits rise only
in a session that draws nothing.

- a file of at most 64 MB, nested at most 64 levels deep, checked before it is parsed; the same two
  limits hold for every JSON import;
- no member name `__proto__` and no object with the same member name twice (`E_BAD_DOCUMENT`);
- at most 64 members; 1,000 style layers in the file; per style 100 carried palettes of at most 256
  colours; per recipe 1,000 commands;
- an expression of at most 1,024 characters and 32 levels of nesting; a longer one fails its layer
  or command, not the file;
- every number a document gives is finite; `1e400` fails its layer or command with `E_OPTION_RANGE`;
- at most 100 entries in a report's lists of notices and left-out items, then one notice counting
  the rest; the plan lists (a recipe's commands and columns, a style's layers) are never cut;
- at most 2,000,000 edge pattern pieces in one paint of the scene (style.md, "Channels and values");
- an opening budget of 5 seconds for applying styles, planning recipes and searching nearest names;
  past it the remaining layers are added switched off and the remaining commands planned without an
  estimate, with `E_CAP_EXCEEDED`. Every later repaint holds the document's layers to a budget of
  the same size;
- per imported table, at most 4,096 columns and 50 million cells; a column value nested at most 64
  levels;
- every import held to graphty-element's load ceilings, 50,000 nodes and 100,000 edges today; a
  session that draws nothing (`createGraphSession()` from the `./session` entry point) may raise
  them with its `limits` option.

Every lookup of a column, a run or a member by a name taken from a document is a lookup of an own
name, so a column named `constructor` binds only when the data has a column of that name.

## Where this lives in the packages

graphty-element owns every document: reading, checking, applying, recording, writing and the
reports. A third party who installs graphty-element and nothing else can save and open everything
the graphty app can; the app draws the Save and Open controls and calls the element.

<!-- prettier-ignore -->
| Task | graphty-element API |
| --- | --- |
| Look at, or open, a file | `session.data.openDocument(src, options)` (container.md, "Applying a file") |
| Save a file | `session.data.saveDocument(options)` (container.md, "Writing a file") |
| Apply one style member | `session.styles.applyTemplate(style, options)` (style.md) |
| Remove a style that was opened | `session.styles.removeBySource((s) => s.by === "template" && s.templateId === id)` |
| Apply one recipe member | `session.recipes.apply(recipe, options)` (recipe.md, "Applying a recipe") |
| Import a table for a recipe | `application.import(source, options)` (recipe.md, "Table data") |
| Record the session's analysis | `session.recipes.record(options)` (recipe.md, "Recording") |
| Read a run's results | `session.results.get(runId)` |
| Write results as columns to a file | `session.data.export(format, options)` (export-mapping.md) |
| Replay headless | `createGraphSession({ limits })` from the `./session` entry point |
| List algorithms, options and layouts | `session.catalog.algorithms()`, `session.catalog.layouts()` |

**Breaking changes in 3.0.0.** These change published 2.x behaviour and ship together in
graphty-element 3.0.0:

- the edge weight is always the column `weight`, with no legacy `value` fallback;
- an algorithm's `weight` option names the column each run reads; with none it runs unweighted;
- ordering comparisons read numeric text as a number;
- tied ordinal categories are ordered by code point, not the reader's locale;
- `map` takes its pinned values out of the palette and the numbering of other categories;
- bare numbers, `true`, `false` and `null` are literals in an expression;
- `applyTemplate` adopts per-layer failure, stamping, same-place replacement, rebinding and the
  refusal of edges by id (style.md, "When this applies").

## Later versions

Not in version 1; each is a later version's work, and version 1 files stay valid when it is added.

- data plan: filtering a table's rows while it is read, and a starter recipe recorded from one
  (`W_FILTER_AFTER_IMPORT`);
- data plan: several table readings per recipe, per-reading header renames, `combineColumn`;
- data plan: column types and value ranges (a threshold written for another scale);
- data plan: joins (a node table keyed differently from the network's ids);
- data plan: renaming category values, and the Neo4j export routes' different spellings of a type;
- data plan: whether a weight is a strength or a distance, and converting one to the other;
- data plan and graph-io: RDF input;
- data v2: a data member that references a file (`href`, fetch consent, private-address rules,
  `sha256`, `E_DIGEST_MISMATCH`, `W_DATA_DIFFERS`), and saving one;
- service: replaying other people's documents against private data, with report redaction;
- results: expected results, result signatures and comparison, dataset fingerprints in the report;
- recipe 1.x ops: computed columns, kept sets, choosing nodes by a rule, randomised null models,
  fetching data, a precision request;
- style v2: list and text membership tests, quoted path segments holding a dot, edges selected by
  id, splitting a look across style versions, down-conversion;
- migration: graphty-element 1.x style templates; Cytoscape, CX2 and `.cys` styles;
- metadata: authors, licences, citations and DOIs (`graphty.provenance`);
- schema publishing: a pinned copy of each release's schemas;
- project version: views and cameras, annotations, stored results, several graphs in one file;
- not planned: a graphty document embedded inside another tool's file (export-mapping.md).

## Error and warning codes

Documents have their own codes, a published contract of graphty-element (decision 9). New error
codes:

<!-- prettier-ignore -->
| Code | When |
| --- | --- |
| `E_UNSUPPORTED_VERSION` | a container, member or style version this reader does not implement; details `{ kind, found, reads }` |
| `E_BAD_DOCUMENT` | malformed content: no `members`, a member without a string `kind` or a positive integer `version`, an unknown member of a data member, `__proto__` or a repeated name, a near miss of `requires` |
| `E_UNKNOWN_COMMAND` | a recipe command whose `op` this reader does not know; details name the nearest known `op` |
| `E_DEPENDENCY_SKIPPED` | a command skipped because a command it reads, or a filter before it, was skipped |
| `E_REPEAT_APPLICATION` | a recipe or style opened again where `onRepeat` refuses it |

A new published `GraphtyWarningCode` union, for notices that stop nothing:

<!-- prettier-ignore -->
| Code | When |
| --- | --- |
| `W_UNKNOWN_MEMBER` | an object member this reader does not know, ignored; the JSON pointer names it |
| `W_UNKNOWN_KIND` | a member of a kind this reader does not know, skipped and kept on save |
| `W_COLUMN_TYPE` | a column compared with or scaled as a number holds values that are not finite numbers; details `{ column, count }` |
| `W_DIRECTION_DIFFERS` | the graph's direction differs from the recipe's, or a directed graph looks undirected |
| `W_PARALLEL_EDGES` | a graph holds repeated edges where the recipe's did not, or most pairs of an undirected graph twice |
| `W_TABLE_COLUMNS_DIFFER` | a table was read with options other than the recipe's `table`, or without them |
| `W_MATCHES_NOTHING` | a style layer's selector bound and matched no element |
| `W_ID_COLLISION` | a style opened from another place claims the `id` of one already opened; its layers were added |
| `W_PAINTS_OVER` | a run's colouring, or a file's layer, will paint a channel an enabled layer already paints |
| `W_RELEASE_DIFFERS` | the file or recipe was written by another release of graphty-element |
| `W_PRECISION_DIFFERS` | a run replays in another precision than its recipe records; names the `acceleration` setting |
| `W_FEW_VALUES` | fewer than half of the elements a layer or command reads have a value at a path it reads |
| `W_GRAPHTY_*` | the loss notes of an export (export-mapping.md) |

`E_TOO_LARGE` and `E_CAP_EXCEEDED` are widened to the document limits and the recipe budgets, and
`E_UNKNOWN_FORMAT` to "this JSON text is not a graphty document", with `details.available` listing
the data formats it could be imported as, and to an embedded dialect the reader lacks. Every other
condition reuses an existing code with its documented meaning.

## Open decisions

None for version 1. Every other choice in this directory can still be changed by an edit until
graphty-element 3.0.0 publishes it.

## Appendix: Review record

Objections raised in review that were not taken as asked, one line each; those taken are in the text.

- Match a missing column by other spellings or an author's alias list (raised four times): no -- reported, never guessed; the caller passes `columns`.
- Declare the attributes a recipe needs as slots: replaced by the journal; the plan lists every column before anything runs.
- Put the whole session journal in the recipe: no -- analysis commands only (decision 1).
- Convert a similarity weight to a distance, or add `weightMeaning`: no -- the author's modelling choice; data plan.
- Restrict colours to hex: no -- 2.x writes CSS colours; the applier parses every colour.
- Refuse `source.by: "run"` on imported layers: no -- stamped, and kept only for a run of this opening.
- A zip container for large projects: no -- JSON only (decision 2).
- Must-understand feature names per unit: no -- a new major version, `requires`, and the unknown-command stop cover it.
- Write every option value, defaults included: only on request (`explicitDefaults`).
- Authors, licence and citation members now: later version (metadata).
- A second file as a data member's node table, or a merge key column: no -- joins are the data plan's.
- Declare column types and ranges: data plan; mismatches are reported.
- A scope combining a predicate with the largest component: no -- a filter, then a scope.
- Read `.gz` by an option: no -- gzip is recognised by its first two bytes.
- A quoted path segment holding a dot: no -- 2.x refuses it; `columns` reaches any name.
- A per-command or per-replay precision request: no -- `acceleration: "off"` does it per session.
- Expected-result digests, per-run result digests, dataset fingerprints: later version (results).
- A new command as a new major recipe version: no -- `op` is open and an unknown command stops the replay there.
- Record the weight column under each file's own name: no -- one name, `weight`, makes weighted recipes portable.
- Derive the template id from a file digest: no -- an `id` replaces only from the same place; `W_ID_COLLISION` otherwise.
- Warn on every identifier-like literal: only for literals compared with run results, and listed on save.
- Refuse, or plan without running, on a direction mismatch: no -- `W_DIRECTION_DIFFERS` before anything runs.
- Optional `capacity` and `colorblindSafe` in a carried palette: no -- 2.x requires both.
- Copy each algorithm's options table here: no -- a catalogue page generated per release.
- Rename category values: data plan; unmatched `map` keys and empty scopes are reported.
- A worked example on a second dataset: style.md's and recipe.md's worked examples already do it.
- Rename `blue-orange`: taken as an added id, `blue-white-red`.
- Refuse a scope or filter matching every element: no -- a notice.
- A top-fraction scope: no -- a new scope form every reader must implement.
- Canonical node order and community numbers: no -- algorithm work; the plan flags order-dependent commands.
- A version or member name per `requires` entry: no -- it names kinds and is recomputed on save.
- Stamp layers with a document digest and refuse replacement by default: in part -- only an `id` from the same place replaces.
- A list membership test in expressions: no -- the language has no functions (style v2).
- Type CSV cells one at a time: no -- columns are typed whole; comparisons read numeric text.
- Prescribe the preview interface: its behaviour only ("Opening a file someone sent you").
- Publish which algorithms take `weight`: taken as the catalogue page.
- Order ordinal categories by text: no -- it repaints 2.x styles; `map` pins colours.
- Split a quick start from this page: no -- the first style and recipe lead it; the guide comes with 3.0.0.
- A notice when a passthrough label reads numeric ids: no -- a number is a legitimate label.
- A caller-supplied `href`, or a time budget for referenced data: moot -- referenced data is a later version.
- A merge that only updates matching nodes: no -- the merge reports how many rows matched.
- Name the merged column `weightColumn`: taken as `combineColumn`, deferred with the data plan.
- Fresh style reports from `data.import`: taken as the opening's report being replaced.
- `==` on a list as a type mismatch: no -- its cost is charged to the opening budget.
- Close a recipe's top level: no -- a near-miss guard on `table`, `directed`, `parallelEdges`.
- A lenient reader schema beside the strict one: no -- the prose governs reader behaviour.
- Let an unknown-type value drop only its channel entry: no -- it refuses its layer; widening needs style v2.
- Lay out only the kept graph: later -- it needs a new layout input for every engine.
- Make the session's largest component read the visible graph: no -- it changes existing runs.
- Skip a command whose randomised path takes no seed: no -- planned with a notice.
- A colour-and-size example with a recommended size range: no -- style.md covers both.
- Raise the load ceilings everywhere: only in a session that draws nothing.
- An application-built starter recipe for a refused table: no -- read-time filtering is the data plan's.
- Accept an unknown `params` key whose value is null: no -- it would run another command.
- Zero at the range end under `log`, negative `sqrt` missing: taken back -- 2.x behaviour kept.
- A recommended default `repeatedEdges`: no -- only the data's author knows.
- An `if`/`then` on the binding schema: no -- a preview names the misspelt member.
- Name the GPU layout's `deterministic` option in the recorder: not needed -- every non-default option is written.

## Sources

- The owner's decisions:
  [../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md).
- `design/element-api/element-api-design.md` sections 4.6.3, 4.6.3a and 4.11.
- graphty-element 2.x: `src/catalog/types.ts` (`StyleDocument`, `LayerSpec`, `Selector`, `Binding`,
  `OptionDescriptor`), `src/session/styles/StylesApi.ts`, `src/session/styles/predicate.ts` (the
  expression language), `src/session/planning.ts` (`AlgorithmRunCommand`),
  `src/session/runs/types.ts` (`RunStyle`, `Caveats`), `src/catalog/formats.ts`,
  `src/catalog/palettes.ts`, `src/errors/codes.ts`.
- graph-io: `src/formats/json/dialect.ts`, `src/formats/csv/header.ts`, each format's importer,
  `src/types.ts` (`LossNote`, `ExportCapabilities`). graph-format: `src/types/columns.ts`,
  `src/builder/freeze.ts`.
