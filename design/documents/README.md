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
                { "op": "layout.set", "layout": "force", "seed": 42 }
            ]
        }
    ]
}
```

Load a graph, then open the recipe and ask for it to run:

```js
const report = await element.session.data.openDocument(text, { run: true });
```

PageRank runs over the edges' `weight` column, Louvain finds groups, and the graph is laid out with
a fixed seed, so the same data gives the same picture every time. Each run paints its suggested
colouring. On a graph whose edges have no `weight` column the PageRank command is skipped and
reported; the other two run. Opening a recipe without `run: true` runs nothing: it reports what
would run and what it would cost.

A recipe records the analysis you ran in graphty; you rarely write one by hand. graphty-element
saves the analysis commands of a session as a recipe, and a style as a style, in one file.

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

1. **Import.** graph-io reads a file in any of the formats above and produces one snapshot. In the
   snapshot, node ids and edge endpoints are structure, not columns: every importer resolves them by
   its own format's rules (a CSV's `source` and `target` columns, a GraphML edge's `source` and
   `target` attributes, a node-link record's `id`). Every other attribute becomes a **named column**
   of the node table or the edge table, named as the file names it: a CSV header, a GraphML key's
   `attr.name`, a GEXF attribute's `title`, a JSON member name, a Neo4j property. The edge weight is
   stored as structure too, and keeps the name the file gave it, so it is found by that name like
   any column.
2. **Why a recipe is portable across file types.** A style and a recipe name only columns
   (`data.team`, a weight column), never a file's syntax and never a particular node or edge. So
   a recipe recorded on a GraphML import replays on a CSV, a GEXF or any other file whose import
   has the columns it names. A column is found by its exact name; a missing column is
   reported, never guessed. The spelling of the id and endpoint columns in each format does not
   matter to a recipe or a style, because after import they are structure.
3. **Export.** graphty-element builds an export snapshot holding the data, each run's results as
   columns and the drawn appearance where the target format has a place for it, and graph-io writes
   it in the chosen format. What cannot be written is reported, never dropped silently. See
   [export-mapping.md](export-mapping.md).
4. **Data inside a graphty document.** The data member embeds a graph in one of graph-io's existing
   JSON dialects, or references a file in any format graphty-element reads. It invents no data
   format, and it never carries the snapshot's binary wire form (container.md, "The data member").

The portability in rule 2 depends on graphty-element reading every file through graph-io. That is
the graph-format migration (branch `feat/graph-format-migration`), which is not yet merged; until it
is, graphty-element reads files with its own readers, whose column names can differ from
graph-io's. Recipes SHOULD NOT be released before that migration.

## The one JSON file

Every graphty document is one JSON file ([container.md](container.md)):

- It is recognised by its top-level member `"kind": "graphty-document"`, a fixed value, never by the
  file name. A reader also accepts the style file graphty-element 2.x writes -- `version` 1 and a
  `layers` array, with no `kind` -- read as a document holding that one style.
- `version` is the container's major version, 1. A reader refuses a file whose container version it
  does not implement, naming the version.
- `members` is a list, each with its own `kind` and `version`: `graphty-style`, `graphty-recipe`
  and `graphty-data` in version 1, in any mix and any number (a lab's two looks and its recipe in
  one file). Later versions add kinds; a reader skips a member of a kind it does not know, or of a
  version of that kind it does not implement, reports it, and keeps it when it writes the file
  back. The rest of the file applies.
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
   that reads its result. Everything else applies.
2. **The caller may rename, the file may not.** A caller whose data spells a column differently
   passes a map from the document's name to the data's name (`columns: { "team": "department" }`)
   when applying. That is the caller's decision, recorded in the report, never inferred.
3. **Order.** Opening a document applies its members in this order: data, then recipes in list
   order, then styles in list order. So a style layer that paints a recipe's results finds them once
   the recipe has run.
4. **Nothing runs without being asked.** Opening a recipe binds and plans it: the report lists every
   command, whether it can run, and its estimated cost. Runs start only when the caller asks
   (`run: true`, or `run()` on the application).
5. **Load first, then open.** A document applies to the graph loaded at the time. When the data is
   later replaced, graphty-element SHOULD re-check every style layer it switched off only for a
   missing column and switch on those that now bind, reporting it.
6. **One report shape.** Opening returns a report per member (container.md, "The report"): what
   applied, what was skipped or switched off, and why, with an error code and a sentence a person
   can act on.

## Trust

A document is data from someone else.

1. **Nothing in a document is executed as code.** No reader evaluates a string as JavaScript, and a
   document never names code to load or a package to install. The only languages in a document are
   graphty-element's own JMESPath dialect in selectors and `where` scopes, interpreted by
   graphty-element with no access to the page, bounded by the limits below.
2. **A recipe spends compute, and only when asked.** Opening a document never starts a run or a
   layout. When the caller asks, every command is held to the same cost cap as the same call made by
   hand, which a document cannot raise, and the whole recipe to a total budget (recipe.md,
   "Running").
3. **Nothing is fetched without consent.** A data member's `href` is resolved only through the
   caller (container.md, "The data member"). `$schema` is never fetched.
4. **Imported layers say where they came from.** A style layer from a document is stamped with the
   document it came from, so a document cannot make its layers look like the reader's own.
5. **Text is text.** Labels, names and descriptions from a document are rendered as text, never as
   HTML.

## Limits

A reader MUST enforce these before applying anything, and refuse the file with `E_TOO_LARGE`,
naming the limit, when one is exceeded. A caller MAY raise them.

- a file of at most 64 MB, nested at most 64 levels deep;
- no member name `__proto__`, `constructor` or `prototype` at any depth (the file is refused), and
  document objects held in null-prototype objects or maps;
- at most 64 members; per style, 1,000 layers and 100 carried palettes of at most 256 colours; per
  recipe, 1,000 commands;
- an expression (a selector's `where`, a recipe scope's `where`) of at most 1,024 characters and 32
  levels of nesting, checked before it is parsed; a longer one fails its layer or its command, not
  the file;
- embedded or referenced data: the node and edge limits graphty-element applies to every import.

## Where this lives in the packages

graphty-element owns every document: reading, checking, applying, recording and writing, and the
reports. A third party who installs graphty-element and nothing else can save and open everything
the graphty app can; the app draws the Save and Open controls and calls the element.

| Task                          | graphty-element API                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Open a file                   | `session.data.openDocument(src, options)`, designed in the element API design (section 4.6.3a); container.md |
| Save a file                   | `session.data.saveDocument(options)`, same design                                                            |
| Apply one style member        | `session.styles.applyTemplate(style)` (shipped in 2.x)                                                       |
| Write the current style       | `session.styles.toDocument()` (shipped in 2.x)                                                               |
| Apply one recipe member       | `session.recipes.apply(recipe, options)` (recipe.md, "Applying a recipe")                                    |
| Record the session's analysis | the element API design's `journal.export()` (recipe.md, "Recording")                                         |

graphty-element changes version 1 needs, each specified on the page named:

- `openDocument` and `saveDocument`, with the container of this page instead of the named members
  the element API design sketched (container.md);
- per-layer failure and session-scoped carried palettes for styles opened from a document; for
  `applyTemplate` itself this changes a published contract, so its default changes only in
  graphty-element 3.0.0, the breaking release the graph-format migration already groups (style.md,
  "Reading and applying");
- storing a layer's authored `id` and writing it back (style.md);
- `session.recipes.apply`, the recorder and the `layout.set` command (recipe.md), and the catalogue
  typing every option that names a column -- each algorithm's `weight` -- as `attribute` rather than
  `string`, so a recipe can tell a column name from free text; and a `weight` option on every
  algorithm that reads edge weights (Louvain and others read a fixed column named `weight` today);
- the new report fields and codes of "Open decisions" item 2.

## What version 1 does not cover

Stated plainly so no one discovers it from a failed file:

- **Reading instructions for data** (which column is the id, what a weight measures, joins, types):
  the data plan, in [drafts/](drafts/). Until then a referenced file takes graphty-element's import
  options, and a recipe cannot say whether a weight is a distance or a strength.
- **Views and cameras** and **annotations**: drafts only.
- **Projects**: run records, stored results, positions, kept sets, the active filter, several graphs
  in one file. The earlier envelope draft holds the design work (drafts/envelope.md).
- **Recipe commands beyond running algorithms and setting a layout**: filtering to a subgraph,
  computed columns, randomised null models, fetching data, defining kept sets by rule. A later
  version adds them as new commands; an older reader skips an unknown command and every command
  after it (recipe.md).
- **Algorithms that need a particular node** (a shortest path between two chosen nodes, a search
  from a start node): a recipe never names a node, and version 1 has no way to choose one by a rule.
- **Selecting edges by id in a style** (the ids graphty-element 2.x writes are session counters).
- **Authors, licences, citations and DOIs** as members. A later version adds them as optional
  members; until then `description` and `extensions` carry them.
- **Signatures, digests and dataset fingerprints.**
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
   `E_REPEAT_APPLICATION` and `E_DIGEST_MISMATCH` (referenced data whose bytes differ from the
   recorded SHA-256); a new published `GraphtyWarningCode` union holding `W_UNKNOWN_MEMBER`,
   `W_UNKNOWN_KIND` and the `W_GRAPHTY_*` loss-note codes of export-mapping.md; the existing
   `E_TOO_LARGE` and `E_CAP_EXCEEDED` widened to document limits and a recipe's total budget; and
   the report shapes of container.md ("The report"), style.md (`StyleReport`) and recipe.md ("The
   replay report"). Every other condition reuses an existing code with its documented meaning.
3. **Result column names in exports.** Scripts in R and Python read them. _Recommendation:_
   `<run id>.<field>` (`groups.group`, `influence.value`), where a run a recipe produced is named by
   its `as` without the namespace unless two runs would share a name, in which case the export is
   refused unless the caller supplies names (export-mapping.md, "Results as columns").

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
  new member._ Not taken for version 1: an addition an old reader would misapply by ignoring it is
  made in a new major version of that member kind instead, which the old reader refuses by version
  (container.md, "Versions"). A recipe's unknown command already stops the replay.
- _Record the resolved default of every option a run did not set, in a separate member._ Not taken:
  the recorder writes every option the run used in `params`, so one member holds the effective
  values.
- _Include authors, licence and citation members now, because sharing among a community needs
  them._ Deferred: they are additive optional members a later version can add without breaking a
  version 1 file, and their names were not among the owner's decisions.

## Sources

- The owner's decisions:
  [../decisions/2026-09-28-document-formats-first-version.md](../decisions/2026-09-28-document-formats-first-version.md).
- `design/element-api/element-api-design.md` sections 4.6.3 and 4.6.3a (documents and the file that
  combines them), 4.11 (commands, the journal, recipes).
- graphty-element 2.x: `src/catalog/types.ts` (`StyleDocument`, `LayerSpec`, `Selector`,
  `Binding`, `OptionDescriptor` and its option types), `src/session/styles/StylesApi.ts`
  (`applyTemplate`, `toDocument`), `src/session/planning.ts` (`AlgorithmRunCommand`),
  `src/session/runs/types.ts` (`RUN_ID_PATTERN`, `RunStyle`, `Caveats`), `src/catalog/formats.ts`
  (format option names), `src/errors/codes.ts`.
- graph-io: `src/formats/json/dialect.ts` (the JSON dialects), each format's importer (column naming
  and the edge weight), `src/types.ts` (`LossNote`, `ExportCapabilities`).
- graph-format: `src/types/columns.ts` (column roles), `src/builder/freeze.ts` (the structural edge
  weight).
- Prior art: RFC 2119 and 8174; JSON Schema 2020-12; SemVer 2.0.0; nbformat's tolerant reader;
  kepler.gl's schema manager (upgrade on read); Vega-Lite (a declarative spec applied to new data).
