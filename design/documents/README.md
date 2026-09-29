# graphty document formats, version 1

graphty-element reads and writes graphs in the formats other tools already use. Those files carry a
graph; they do not carry what a person did with it in graphty -- how it is drawn and which analyses
were run. This directory specifies the two graphty documents that carry those things, and the one
JSON file they travel in:

- a **style**: how nodes and edges are drawn, as rules over the data's columns, so the same look
  applies to the next dataset;
- a **recipe**: the analysis commands that were run (algorithms and a layout), so the same analysis
  runs on the next dataset -- a colleague's, a partner's in the same industry, or your own next
  month.

Status: specification of version 1, not yet implemented. The owner's decisions it is written to are
in [../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md).
Choices still needing the owner are under "Open decisions" below.

## Your first style

Save this as `team-colours.graphty.json` (the extension is still open decision 1):

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
                    "encode": { "node.color": { "by": "data.team", "scale": "ordinal" } }
                }
            ]
        }
    ]
}
```

Load any graph whose nodes have a `team` column -- a CSV, a GraphML file, a GEXF file, JSON -- then
open the style:

```js
const report = await element.session.data.openDocument(text);
```

Every node with a team is coloured by team. On a graph with no `team` column the layer is added
switched off, and `report` says it needs `data.team`. Nothing else changes.

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
                { "op": "algo.run", "algorithm": "pagerank", "as": "influence", "params": { "weight": "weight" } },
                { "op": "algo.run", "algorithm": "louvain", "as": "groups" },
                { "op": "layout.set", "id": "force", "options": { "seed": 42 } }
            ]
        }
    ]
}
```

Load a graph, then open the recipe and ask for it to run:

```js
const report = await element.session.data.openDocument(text, { run: true });
```

PageRank runs over the edge weights, Louvain finds groups, and the graph is laid out from a fixed
seed. Every importer puts the edge weight in the edge column `weight`, whatever the
file called it, so this recipe finds the weights of a GraphML, CSV, GML or Pajek file alike. On a
graph with no edge weights the PageRank command is skipped and reported; the other two run. Each run
paints its suggested colouring. The same data on the same release gives the same numbers every
time, under the conditions of recipe.md, "Same data, same results" -- one of which is the same kind
of machine: a WebGPU accelerator computes in single precision and the CPU in double, and version 1
cannot make a replay use one or the other. Opening a recipe without
`run: true` runs nothing: it reports what would run and what it would cost.

A recipe records the analysis you ran in graphty; you rarely write one by hand.
`session.data.saveDocument()` saves the analysis commands of a session as a recipe, and the look as
a style, in one file (recipe.md, "Recording"). Two limits to know before you rely on that: a run
made on the selection, on nodes you picked or on a filtered view that is not one predicate over
columns is left out and reported, and recipes are not available until every import follows "What every importer produces" below.

## Opening a file someone sent you

Look first. `apply: false` changes nothing and returns the full report: every member, the columns
each style layer and recipe command needs and whether your graph has them, what each command would
cost, and whether the file carries data of its own.

```js
const preview = await element.session.data.openDocument(text, { apply: false });
```

Then open it, choosing what applies and renaming columns your data spells differently:

```js
await element.session.data.openDocument(text, { columns: { team: "department" } });
```

A file that carries data never replaces a graph you already loaded unless you pass
`data: "replace"` (container.md, "Applying a file").

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

| Layer                | What it is                                                                                                                                                                                         | Owner           | Who sees it                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------- |
| Other tools' formats | GEXF, GraphML, GML, DOT, Pajek, CSV, JSON (the node-link, d3, JSON Graph Format, Cytoscape.js, graphology and vis dialects, and NetworkX's adjacency and tree forms for reading) and Neo4j exports | graph-io        | users: these are their data files         |
| The snapshot         | graph-format's frozen in-memory graph, and its binary wire form, which moves a snapshot between threads and processes                                                                              | graph-format    | nobody: internal, never a file a user has |
| graphty documents    | the JSON file of this directory: styles, recipes, and optionally the data                                                                                                                          | graphty-element | users: files they save, share and open    |

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
   or a style, because after import they are structure -- provided the import found them, which the
   table below says how it does.
3. **Export.** graphty-element builds an export snapshot holding the data, each run's results as
   columns and the drawn appearance where the target format has a place for it, and graph-io writes
   it in the chosen format. What cannot be written is reported, never dropped silently. See
   [export-mapping.md](export-mapping.md).
4. **Data inside a graphty document.** The data member embeds a graph in one of graph-io's existing
   JSON dialects, or references a file in any format graphty-element reads. It invents no data
   format, and it never carries the snapshot's binary wire form (container.md, "The data member").

### What every importer produces

These rules are what version 1 requires of every import, and a recipe's portability rests on them.
Their candidate lists are frozen for document version 1 and published as data in graphty-element's
format catalogue; changing one needs a new major version of the recipe and style kinds, because an
old recipe would bind differently with no change to its own version.

They are not yet what graphty-element does. On the graph-format migration branch (not yet merged),
its CSV and JSON readers keep a weight column under its own name and fall back to a legacy `value`
key, find a CSV node table's id only in a column `id`, `Id` or `ID`, and read JSON by forcing the
node-link dialect onto whatever they find; its GML, DOT and Pajek readers do not use graph-io at
all. Making every import follow these rules is a precondition of releasing recipes ("Where this
lives in the packages"), and the endpoint and id spellings are open decision 4, which blocks that
release.

1. **Node ids and edge endpoints** are structure, not columns. The one header or field chosen as a
   node id or an endpoint is consumed; every other one stays a column, whatever its name, so a
   node table headed `id,name,padj` keeps `name`. A style reads a node's id through the path `id`
   (style.md, "Paths" rule 4); a recipe never names one.
2. **The edge weight** is the edge column `weight` after every import, whatever the file called it:
   a CSV's `weight` or `Weight` header, a GraphML or GEXF `weight`, GML's `value`, Pajek's third
   column. The file's own name is not a second column; graph-io keeps it only so an export can
   write it back. A file with no weight gives edges no `weight` value. graphty-element's
   `edgeWeightPath` setting does not change this: it chooses the weight the renderer and the
   layouts read, never the column a recipe names (recipe.md, "Commands" rule 6).
3. **Every other attribute** is a column named exactly as the file names it: a CSV header, a GraphML
   key's `attr.name`, a GEXF attribute's `title`, a JSON member name, a Neo4j property. A label the
   format itself defines (GraphML, GEXF, GML and DOT `label`, a Pajek vertex label) is the column
   `label`. A Neo4j `:LABEL` field is the node column `labels` and `:TYPE` the edge column `type`.
   So the field a knowledge graph most depends on -- an element's type -- lands under a different
   name, with a different meaning, in each format, and a style or recipe shared across them needs
   the caller's `columns` rename:

    | Format        | An element's type                        | Its display name |
    | ------------- | ---------------------------------------- | ---------------- |
    | Neo4j         | `labels` (nodes, a list), `type` (edges) | a property       |
    | GraphML, GEXF | an attribute the file declares           | `label`          |
    | GML, DOT      | an attribute the file declares           | `label`          |
    | CSV, JSON     | a column the file has                    | a column         |

4. **Value types** are the file's own where it declares them (GraphML and GEXF keys, Neo4j header
   types, JSON values). CSV and DOT declare none: each cell is typed on its own, as a number when it
   reads as one and as text otherwise. An unquoted empty cell is no value. So a column of numbers
   with `NA` cells holds numbers and text. A numeric comparison, a weight and a numeric scale read
   the numbers; a text cell never matches a numeric comparison and is never painted by a numeric
   scale. A style and a recipe treat it the same way and count it with `W_COLUMN_TYPE`.
5. **Lists.** A Neo4j `:LABEL` field or array property, a JSON array and a GEXF `liststring` are kept
   as lists. A `where` compares a list only as a whole (`==` with a list literal), so a list never
   equals a string and no expression tests whether a list holds one value -- the expression
   language has no functions (style.md, "Expressions"). A style's ordinal binding treats a list as
   missing and counts it with `W_COLUMN_TYPE`. GraphML, GML, DOT, Pajek and CSV produce no lists.
6. **Rows are imported as given**, unless the `repeatedEdges` import option says otherwise
   (container.md, "Import options"). A CSV row is one edge, so a file listing each pair twice
   (`A B` and `B A`) gives two edges. A compressed file (`.gz`) is not read: the import fails with
   `E_PARSE_FAILED`, saying that the file is compressed and must be decompressed first.

Where each importer finds its structure when no import option says otherwise:

| Format  | Edge endpoints                                                                                                                                                                   | Node ids                                           | Weight read from                 | Direction when the file does not say            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| CSV     | the first pair found of `source` and `target`, `src` and `dst`, `from` and `to`, both halves from one pair, exactly and then without regard to case; headerless: columns 1 and 2 | a node table's `id` column, without regard to case | `weight`, without regard to case | directed; Gephi's `Type` column decides per row |
| GraphML | each edge's `source` and `target`                                                                                                                                                | node `id`                                          | the key named `weight`           | `edgedefault`, else undirected                  |
| GEXF    | each edge's `source` and `target`                                                                                                                                                | node `id`                                          | the edge's `weight`              | `defaultedgetype`, else undirected              |
| GML     | each edge's `source` and `target`                                                                                                                                                | node `id`                                          | `value`                          | `directed`, else undirected                     |
| DOT     | the edge statement                                                                                                                                                               | the node's ID                                      | the `weight` attribute           | `digraph` directed, `graph` undirected          |
| Pajek   | the arc or edge line                                                                                                                                                             | the vertex number                                  | the line's third column          | `*Arcs` directed, `*Edges` undirected           |
| JSON    | the dialect's own names (node-link: `source`, `target`)                                                                                                                          | the dialect's own (node-link: `id`)                | `weight`                         | the dialect's own flag, else undirected         |
| Neo4j   | `:START_ID`, `:END_ID`                                                                                                                                                           | `:ID`                                              | the `weight` property            | always directed                                 |

The `directed` import option overrides the last column for every format.

A CSV whose endpoint columns are named otherwise (STRING's `protein1` and `protein2`, its web
export's `#node1` and `node2`, a pull-down's `bait` and `prey`) needs `edgeSource` and `edgeTarget`
when it is imported. Without them the import fails, saying it found no endpoint columns and naming
the two options; it never builds a graph without edges.

**CSV shapes.** A CSV file is one table. The `variant` import option says which shape it is:
`edge-list`, `node-list`, `adjacency-list`, `gephi`, `cytoscape`, `neo4j` or `generic` (the names
graphty-element's catalogue publishes). Without it the importer reads an edge list, or a node list
when the header has an `id` column and no endpoint pair. No CSV shape holds nodes and edges in one
file, and a data member is one file. So a CSV network whose node columns a style or recipe needs --
an expression table beside an edge list -- is loaded by the caller as two imports (the node list,
then the edge list merged into it), or converted to GraphML or node-link JSON, which carry both.

Until every import follows these rules, recipes SHOULD NOT be released.

## The one JSON file

Every graphty document is one JSON file ([container.md](container.md)):

- It is recognised by its top-level member `"kind": "graphty-document"`, a fixed value, never by the
  file name. A reader also accepts the style file graphty-element 2.x writes -- an integer
  `version` and a `layers` array, with no `kind` -- and a single member on its own, each read as a
  document holding that one member.
- `version` is the container's major version, 1. A reader refuses a file whose container version it
  does not implement, naming the version.
- `members` is a list, each with its own `kind` and `version`: `graphty-style`, `graphty-recipe`
  and `graphty-data` in version 1, in any mix and any number (a lab's two looks and its recipe in
  one file). Later versions add kinds; a reader skips a member of a kind it does not know, or of a
  version of that kind it does not implement, reports it, and keeps it when it writes the file
  back. The rest of the file applies, unless the file lists that kind in `requires`, which makes a
  reader that does not know it refuse the whole file.
- The data rides inside as a `graphty-data` member: an embedded graph-io JSON dialect, or a
  reference to a file with its import options and an optional SHA-256.
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
   to `openDocument`, which applies it to every style and recipe member of the file. The map
   rewrites parsed paths and expressions, never text, and each member's report records it. That is
   the caller's decision, never inferred. It renames columns, never the values in them: a
   category spelled `SUPPLIES` in one dataset and `supplies` in another is two categories.
3. **Order.** Opening a document applies its members in this order: data, then recipes in list
   order, then styles in list order. A run's own suggested colouring is added when the run
   completes, above every layer present then, including the file's style layers.
4. **Nothing happens without being asked.** Opening a recipe binds and plans it: the report lists
   every command, whether it can run, and its estimated cost. Runs start only when the caller asks
   (`run: true`, or `run()` on the application). A file's data never replaces a graph the caller
   already loaded unless the caller passes `data: "replace"`. `apply: false` changes nothing at all.
5. **Load first, then open -- or open first.** A document applies to the graph loaded at the time.
   When the data is replaced, graphty-element MUST re-check every style layer it switched off only
   for a missing column or a missing run, switch on those that now bind, and report each one. A
   document opened while no graph is loaded holds its recipes, and binds and plans them when data
   arrives (running them then only if the caller passed `run: true`).
6. **Opening the same thing twice.** A recipe applied again to the same data is refused unless the
   caller says otherwise (recipe.md, "Applying a recipe"). A style opened again replaces the layers
   its earlier opening added (style.md, "Reading and applying").
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
   hand, which a document cannot raise, and the whole recipe to a total budget (recipe.md,
   "Running").
3. **Nothing is fetched without consent.** A data member's `href` is resolved only through the
   caller, and only after graphty-element has checked where it points; a loopback, private or
   link-local address is refused unless the caller allows it (container.md, "The data member").
   `$schema` is never fetched, and a graphty-element 1.x template read from a document never
   reaches the element's own template input, whose background can name an image URL.
4. **A file's data does not replace yours by default.** A data member applies only when no graph is
   loaded or the caller passes `data: "replace"`.
5. **Imported layers say where they came from.** A style layer from a document is stamped with the
   document it came from, so a document cannot make its layers look like the reader's own. A
   document's `generator` and `graphty.provenance` are claims the file makes about itself; a
   reader shows them as such, never as verified. Style and recipe ids starting `graphty.` or
   `graphty:` are reserved for graphty-element, so a file cannot pass off a recipe as the shipped
   overview.
6. **Text is text.** Labels, names and descriptions from a document are rendered as text, never as
   HTML.

## Limits

A reader MUST enforce these before applying anything, and refuse the file with `E_TOO_LARGE`,
naming the limit, when one is exceeded. A caller MAY raise them.

- a file of at most 64 MB, given as text or bytes, nested at most 64 levels deep. The depth is
  checked by one pass over the raw text that counts brackets outside strings, before the text is
  parsed;
- no member name `__proto__` at any depth, and no object with the same member name twice (the file
  is refused with `E_BAD_DOCUMENT`, naming the JSON pointer; both are checked in the one parsing
  pass, because JSON parsers disagree on which of two duplicates wins, so a reviewer could see one
  `href` and the reader use the other); every document object held in a null-prototype object or a
  map, so `constructor` and `prototype` are ordinary names;
- at most 64 members; at most 1,000 style layers in the whole file, and per style 100 carried
  palettes of at most 256 colours; per recipe, 1,000 commands;
- an expression (a selector's `where`, a recipe scope's `where`) of at most 1,024 characters and 32
  levels of nesting, checked before it is parsed; a longer one fails its layer or its command, not
  the file;
- at most 100 entries in any list of a report -- a member's notices, the document's own notices,
  `leftOut`, each list of a style report -- then one notice giving the count of the rest;
- every channel value an encoding produces is checked against the channel's own range when it is
  painted, as a `set` value is: a number is clamped to the range, text is cut to 1,024 characters,
  and the report counts each (style.md, "Channels and values");
- opening a document -- applying its styles, binding and planning its recipes, and binding both
  again when the data is later replaced -- is held to an opening budget, 5 seconds by default.
  Past it, the remaining layers are added switched off and the remaining commands are planned
  without an estimate, each with `E_CAP_EXCEEDED`. The work is bounded because an expression has
  no functions, so one evaluation costs at most its 1,024 characters;
- nearest-name suggestions for a missing column compare only names of at most 256 characters, for
  the first 100 missing names of a member, and are skipped, saying so, when a table has more than
  10,000 columns;
- embedded data counts toward the 64 MB. Referenced data has no node, edge or byte limit today,
  because graphty-element applies none to any import; publishing default import limits (nodes,
  edges and bytes) that a caller may raise is a precondition of releasing recipes. A recipe cannot
  filter rows while a file is read, so a file too large for the page -- STRING's human
  `protein.links` file has 13.7 million rows -- is filtered before it is imported.

Every lookup of a column, a run or a member by a name taken from a document is a lookup of an own
name (a map, or `Object.hasOwn`), so a column named `constructor` or `toString` in a document binds
only when the data has a column of that name.

## Where this lives in the packages

graphty-element owns every document: reading, checking, applying, recording and writing, and the
reports. A third party who installs graphty-element and nothing else can save and open everything
the graphty app can; the app draws the Save and Open controls and calls the element.

| Task                           | graphty-element API                                                                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look at a file                 | `session.data.openDocument(src, { apply: false })` (container.md, "Applying a file")                                                                                                                                                                     |
| Open a file                    | `session.data.openDocument(src, options)` (container.md, "Applying a file")                                                                                                                                                                              |
| Save a file                    | `session.data.saveDocument(options)` (container.md, "Writing a file")                                                                                                                                                                                    |
| Apply one style member         | `session.styles.applyTemplate(style, options)` (shipped in 2.x; the options are new, style.md)                                                                                                                                                           |
| Remove a style that was opened | `session.styles.removeBySource((s) => s.by === "template" && s.templateId === id)` (shipped in 2.x)                                                                                                                                                      |
| Write the current style        | `session.styles.toDocument()` (shipped in 2.x)                                                                                                                                                                                                           |
| Apply one recipe member        | `session.recipes.apply(recipe, options)` (recipe.md, "Applying a recipe")                                                                                                                                                                                |
| Record the session's analysis  | `session.recipes.record(options)` (recipe.md, "Recording")                                                                                                                                                                                               |
| Check a file by hand           | the schemas of this directory, for example `npx -p ajv-cli@5 -p ajv-formats ajv validate --spec=draft2020 -c ajv-formats -s container.schema.json -r style.schema.json -r recipe.schema.json -r data.schema.json -d my.graphty.json --allow-union-types` |

Before recipes are released, graphty-element needs every one of these changes, each specified on
the page named. They are preconditions, not follow-ups:

- every import following "What every importer produces": GML, DOT and Pajek read through graph-io;
  the weight published as the column `weight`, with no legacy `value` fallback; one endpoint and id
  candidate list (open decision 4); JSON read through graph-io's dialect importer, with an embedded
  member's `dialect` forced; a compressed file refused with its reason; a graphty document given to
  a data import refused (container.md, "Reading a file"); and the `directed` and `repeatedEdges`
  import options published in the catalogue for every format, where today they are only element
  settings (container.md, "Import options");
- default import limits for nodes, edges and bytes, published and raisable ("Limits");
- `openDocument` and `saveDocument` with the options of container.md, instead of the named members
  the element API design sketched, including the opening budget ("Limits");
- per-layer failure, the kept state of a refused layer, a flag that tells a layer switched off for a
  missing column from one the user switched off, session-scoped carried palettes, the path `id`,
  the check that refuses a binding with both `domain` and `clamp` (2.x throws only while
  painting), and the `columns` and `onRepeat` options of `applyTemplate` (style.md, "Reading and
  applying"). For `applyTemplate`, the changes that alter a published contract wait for
  graphty-element 3.0.0, the breaking release the graph-format migration already groups (style.md,
  "When this applies"); `openDocument` has them from its first release;
- a graphty-element 2.x patch release in which `applyTemplate` refuses an object whose `kind` is
  present and not `"graphty-style"`, or whose `layers` is not an array, with
  `E_UNSUPPORTED_VERSION` and a sentence saying the file needs a newer graphty-element, instead of
  failing with a `TypeError`;
- storing a layer's authored `id` and writing it back (style.md);
- a maximum for `edge.patternCount` and every other count a style or a layout option can set, and
  checking every value an encoding produces against its channel (style.md, "Channels and values";
  recipe.md, "Running");
- `session.recipes.apply` and `session.recipes.record` (recipe.md);
- a `weight` option on every algorithm that reads edge weights, typed `attribute` in the catalogue,
  with no weight as its default, that builds a per-run weight array from the named column on the
  CPU path and the accelerated path alike (open decision 5). Louvain and others read the one
  weight fixed at import today, which a plan cannot show and a recipe cannot turn off. Their
  callers who rely on that get unweighted runs after the change, so it is a breaking change and
  lands in graphty-element 3.0.0 with the others;
- an option of type `attribute` or `partition` accepting an earlier run's result
  (`{ "result": "<as>.<field>" }`; recipe.md, "Commands" rule 4);
- a `randomised` fact in every algorithm descriptor, the run's `seed` feeding the algorithm's own
  seed option (label propagation's `randomSeed` today), and a seed drawn and reported in the
  caveats for every randomised or sampled run given none, so a recorded run can always be
  replayed with the seed it used;
- a run record that keeps the run's `RunStyle` and, for a run on the visible graph, the filter in
  force when it started (recipe.md, "Recording");
- the largest-component scope choosing among tied components by the rule of recipe.md, "Commands"
  rule 5, and an edge-predicate scope (`on: "edges"`) for runs;
- the cost gate holding a sampled run's own estimate to the cap, and a cost estimate for every
  layout engine (recipe.md, "Running");
- an export path from the session through graph-io's JSON exporter, for `saveDocument`'s embedded
  data (container.md, "Writing a file" rule 4);
- the new report fields and codes of "Open decisions" item 2.

## What version 1 does not cover

Stated plainly so no one discovers it from a failed file. Each is a later version's work.

- **Reading instructions for data**: which column is the id beyond the import options, joins,
  column types and value ranges, filtering rows while a file is read, reading compressed files.
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
      cannot be attached; merge them into the file you import first. A step like this cannot be
      recorded or checked, so a recipe that needs one says so in its `description`, the first
      thing a person replaying it reads.
    - **STRING's bulk downloads** list every interaction twice (`A B` and `B A`), are undirected,
      separate columns by single spaces and are distributed only as `.txt.gz`. Decompress the file,
      then import it with `delimiter: " "`, `edgeSource: "protein1"`, `edgeTarget: "protein2"`,
      `directed: false` and `repeatedEdges: "max"`, which on an undirected import merges the two
      rows of each pair. A data member carries those options, and `saveDocument` writes them for
      the file the session was loaded from (container.md, "Writing a file" rule 4).
    - **A directed import of an undirected network** is flagged, not changed: when more than half
      of a directed graph's edges have a reverse twin, the recipe report carries
      `W_DIRECTION_DIFFERS` suggesting `directed: false`, even when the recipe records no
      direction.
- **What a weight means.** A recipe cannot say whether a weight is a strength (bigger is closer) or a
  distance (bigger is farther). Path-based algorithms (betweenness, closeness, shortest paths) read
  a weight as a distance, so a confidence or correlation column must not be their weight. A
  weighted path analysis needs a distance column in the imported file (for STRING,
  `1000 - combined_score`, computed before import); say so in the recipe's `description`, or run
  the command unweighted.
- **Choosing a subgraph beyond one predicate**: the largest component of a filtered graph (the
  high-confidence core of a STRING network), a predicate over nodes and one over edges together,
  kept sets defined by rule. A recipe's scope is the whole graph, its largest component, or one
  predicate over the columns of one table (recipe.md, "Commands" rule 5). An edge scope keeps
  every node, so a node the kept edges leave isolated still counts: PageRank spreads mass over it
  and Louvain makes it a community of its own. Until a later version adds a filter command (open
  decision 6), a STRING-style high-confidence analysis -- keep the edges scoring 700 or more, drop
  the nodes left without an edge, then compute -- is filtered before import.
- **Recipe commands beyond running algorithms and setting a layout**: filtering to a subgraph,
  computed columns, randomised null models, fetching data. A later release adds them as new
  commands (open decision 6); an older reader skips an unknown command and every command after it
  (recipe.md).
- **Algorithms that need a particular node** (a shortest path between two chosen nodes, a search
  from a start node): a recipe never names a node, and version 1 has no way to choose one by a rule.
- **Testing whether a list holds a value** (`contains(data.labels, 'Supplier')`): the expression
  language has no functions, so a list column is compared only as a whole ("What every importer
  produces" rule 5).
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
  are what that format's importer produces.
- **Authors, licences, citations and DOIs** as members. Until a later version adds them, they go in
  the reserved extension `graphty.provenance` (container.md, "Extensions"), which that version
  will upgrade.
- **Views and cameras**, **annotations** and **projects** (run records, stored results, positions,
  kept sets, the active filter, several graphs in one file): drafts only (drafts/).
- **Embedding graphty documents inside other tools' files**; a graphty document references the
  exported file instead (export-mapping.md).

## Open decisions

Only what version 1 still needs from the owner. Each is a published name, contract or file shape.

1. **File extension and media type.** _Recommendation:_ `.graphty.json` and
   `application/vnd.graphty+json` for every graphty document, with writers naming files
   `<name>.graphty.json`. A plain `.json` would collide with graph data in graph-io's JSON dialects
   in every file picker; a new bare extension (`.graphty`) would hide that the file is readable JSON.
2. **New error codes, a warning code union and the report shapes.** They are a published contract
   of graphty-element. _Recommendation:_ new codes `E_UNSUPPORTED_VERSION` (a container, member or
   style version this reader does not implement; details `{ kind, found, reads }`),
   `E_UNKNOWN_COMMAND` (a recipe command whose `op` the reader does not know),
   `E_DEPENDENCY_SKIPPED` (a command skipped because a command it reads was skipped),
   `E_REPEAT_APPLICATION`, `E_DIGEST_MISMATCH` (referenced data whose bytes differ from the
   recorded SHA-256), `E_BAD_DOCUMENT` (document content that is malformed: a missing `members`,
   a member without a string `kind` or with a `version` that is not a positive integer, an unknown
   member of a data member, a refused `href` with details `{ href, reason }`, a `__proto__` member
   name); a new published
   `GraphtyWarningCode` union holding `W_UNKNOWN_MEMBER`, `W_UNKNOWN_KIND`, `W_COLUMN_TYPE` (a
   column compared with or scaled as a number holds values that are not numbers; details
   `{ column, count }`), `W_DIRECTION_DIFFERS`, `W_RELEASE_DIFFERS` and the `W_GRAPHTY_*`
   loss-note codes of export-mapping.md; the existing `E_TOO_LARGE` and `E_CAP_EXCEEDED` widened
   to document limits and a recipe's total budget; `E_UNKNOWN_FORMAT` widened to "this JSON text
   is not a graphty document", with `details.available` listing the data formats the caller can
   import it as instead; and the report shapes of container.md ("The report"), style.md
   (`StyleReport`) and recipe.md ("The replay report"). Every other condition reuses an existing
   code with its documented meaning.
3. **Result column names in exports.** Scripts in R and Python read them. _Recommendation:_
   `<run id>.<field>` (`groups.group`, `influence.value`), where a run a recipe produced is named by
   its `as` without the namespace unless two runs would share a name, in which case the export is
   refused unless the caller supplies names (export-mapping.md, "Results as columns").
4. **The endpoint and id column spellings (blocks releasing recipes).** Three lists exist today:
   graph-io's CSV importer tries `source`, `src`, `from`, `start`, `source_id`, `sourceid`,
   `fromnodeid`, `start_id` and `:start_id` (and their target halves) one header at a time;
   graphty-element's readers try three pairs, `source`/`target`, `src`/`dst` and `from`/`to`, both
   halves from one pair; and the catalogue's own description gives a third wording. A CSV node
   table's id is `id`, `node`, `name` or `key` in graph-io and `id`, `Id` or `ID` in the element.
   Which list is frozen decides which files a recipe replays on without import options.
   _Recommendation:_ the element's three pairs, both halves from one pair, matched exactly and
   then without regard to case, and a node table's `id` column without regard to case; graph-io
   adopts the same lists, and the catalogue publishes them as data. A pair is never assembled from
   two families (`source` with `to`), and a `name` column stays a column. The table in "What every
   importer produces" is written to this recommendation.
5. **What a recipe's `weight` option names.** graphty-element resolves one edge weight when data is
   imported (its `edgeWeightPath` setting) and every algorithm reads that one. _Recommendation:_
   `weight` names a column, and the run builds its own weight array from it on the CPU and the
   accelerated path alike, leaving the imported weight to the renderer and the layouts. That is
   what the owner's decision asks of a command -- it names columns -- and it lets a recipe weight
   PageRank by `combined_score` without re-importing. The alternative, `weight: true` meaning "the
   imported weight", matches the element as it is but cannot weight by any other column.
6. **A filter command in version 1.** The owner's decision puts "the other commands specific to
   analysis workflows" in version 1; this specification has two commands, and a filter survives
   only as a `where` scope repeated on each run. _Recommendation:_ release version 1 with the two
   commands, and add `graph.filter` (one rule over the columns, which every later command of the
   recipe sees, with isolated nodes dropped on request) in a later release as a new `op`. The
   rules it needs are already in place, so that addition does not change what any existing
   recipe means: an older reader stops at an unknown command, and a scope of `"graph"` already
   means the graph as earlier commands of the recipe left it (recipe.md, "Commands" rule 5).
   Needs the owner, because it narrows the scope the decision states.

## Appendix: Review record

Objections raised in review of this specification and its earlier drafts that were not taken, each
with the reason. Objections that were taken are reflected in the text.

- _Match a missing column by other spellings (a declared list of alternative names, or matching
  without regard to case)._ Not taken: the owner decided a missing column is reported, never
  guessed. A caller who knows the mapping passes it when applying ("Applying a style and a recipe to
  new data" rule 2).
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
  version specifies with its keys and conflict rules. "What version 1 does not cover" says to merge
  node attributes into the imported file first.
- _Add a `weightMeaning` (strength or distance) option to each run._ Not taken for version 1: which
  conversion turns a strength into a distance is the author's modelling choice, which belongs to the
  data plan. The limitation is stated under "What version 1 does not cover".
- _Declare each column's type and value range in the recipe, checked at binding._ Not taken for
  version 1: declaring what data must hold is the data plan's job. The importers' typing is
  published ("What every importer produces"), a type mismatch is reported (`W_COLUMN_TYPE`), a
  scope matching every element is reported, and the scale mismatch is stated as a known limit.
- _Let a scope combine a predicate with the largest component, or a node predicate with an edge
  predicate._ Not taken for version 1: graphty-element's scopes cannot express "the largest
  component of the elements a predicate keeps", so a recipe could only record something the
  element cannot run. A filter command is open decision 6.
- _Read `.gz` files, and filter rows while reading._ Not taken for version 1: the catalogue
  publishes no such options. A compressed file fails with a reason that says to decompress it.
  Direction and repeated pairs, which the same objection named, are now import options.
- _Let a quoted path segment hold a dot._ Not taken for version 1: style version 1 is frozen to
  what graphty-element 2.x accepts. The caller's `columns` map, which rewrites parsed paths,
  reaches any column name.
- _Read an edge's endpoints in a style._ Not taken for version 1: a node's id is readable (the path
  `id`, which 2.x reports as unbound rather than misapplying), but an edge's ends are two node ids,
  and a style that reads them needs a path shape 2.x would refuse.
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
  it. A new major version would lock the old reader out of the whole recipe. What a later filter
  command needs from version 1 -- a scope of `"graph"` meaning the graph as earlier commands left
  it, and binding checked again as each command starts -- is stated now, so adding it changes no
  existing recipe.
- _Record the edge-weight column under the name each file gave it._ Not taken: a single name is
  what lets a weighted recipe replay across file types. Settled under "What every importer
  produces", as a rule graphty-element must meet before recipes ship.
- _Derive the template id from the file's digest, so a file cannot choose which look it replaces._
  Not taken: replacing an earlier opening by the style's `id` is how a corrected edition of a look
  replaces the last one, and a digest changes with every edit. The reader chose to open the file,
  the report lists every layer it replaced, and ids starting `graphty.` are reserved.
- _Warn about every predicate that compares an identifier-like column with a literal._ Taken only
  for what can be told reliably: a comparison of a community number from an earlier run with a
  literal is reported on recording and replay, and a save lists every literal a written predicate
  compares with. Which other columns are identifiers is not something a reader can know.
- _Let the applier refuse, not only warn, when the recipe's direction differs from the graph's._ Not
  taken: the fix is the `directed` import option, which the caller or the data member sets, and a
  refusal would stop a recipe whose author did not care about direction. The report warns before
  anything runs.
- _Make `capacity` and `colorblindSafe` optional in a carried palette._ Not taken: they are
  required in graphty-element 2.x's `PaletteDescriptor`, to which style version 1 is frozen. The
  schema says what `[]` means.
- _Publish each algorithm's options and defaults as a table in this specification._ Not taken: the
  catalogue is the one source, exported from graphty-element's `./catalog` entry point, which runs
  in Node without a browser; a copy here would go stale with the first release that adds an
  option.
- _Rename category values as `columns` renames columns (`values: { "suppliesTo": "SUPPLIES" }`)._
  Not taken for version 1: it is reading instructions for data, the data plan's work. Unmatched
  `map` keys are reported.

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
