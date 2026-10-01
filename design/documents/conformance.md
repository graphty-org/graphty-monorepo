# Conformance

The edge-case rulings of the version 1 documents, one row each: an input, the result a conforming
reader, applier or writer gives, and the rule it follows. The prose pages state the rules; this
page is consulted by row, and each row becomes a test when the format is built. A rule is named by
its section and number on the page the section heading names, or by page when it is another page's.

## Container (container.md)

<!-- prettier-ignore -->
| Id | Input | Expected result | Rule |
| --- | --- | --- | --- |
| doc-1 | `{ "version": 1, "layers": [] }` | read as a document holding one empty style | Reading a file 3 |
| doc-2 | `{ "version": 2, "layers": [] }` on a reader of style version 1 | that style skipped, `E_UNSUPPORTED_VERSION`, `kind: "graphty-style"` | Reading a file 3, 11 |
| doc-3 | a kindless `{ "version": 2, "layers": [{ "selector": { "match": "everything" }, "paint": {} }] }` on a reader of style version 1 | skipped, `E_UNSUPPORTED_VERSION`, not refused as an unknown format | Reading a file 3, 11 |
| doc-4 | a kindless `{ "version": 2, "layers": [{ "select": "..." }] }` | refused, `E_UNKNOWN_FORMAT`: every later style version is written with its `kind` | Reading a file 3, 5 |
| doc-5 | a kindless `{ "version": 1, "layers": [...] }` of five layers, one with no `set` or `encode` | read as a style; four layers paint; that one refused, `E_BAD_LAYER` | Reading a file 3; style.md Reading and applying 1 |
| doc-6 | `{ "version": 8, "layers": [{ "id": "water", "type": "fill" }] }` (a MapLibre map style) | refused, `E_UNKNOWN_FORMAT`: not a graphty style | Reading a file 3, 5 |
| doc-7 | `{ "kind": "graphty-recipe", "version": 1, "id": "x", "commands": [] }` at the top level | read as a document holding that recipe | Reading a file 4 |
| doc-8 | `{ "kind": "graphty-view", "version": 1 }` as a whole file, given to `openDocument` | read as a document holding that member; skipped, `W_UNKNOWN_KIND` | Reading a file 4, 10 |
| doc-9 | `{ "graphtyTemplate": true, "majorVersion": "1", ... }` (a graphty-element 1.x template) | refused, `E_UNKNOWN_FORMAT`; reading 1.x templates is a later version | Reading a file 5 |
| doc-10 | a node-link graph `{ "nodes": [], "links": [] }` | refused, `E_UNKNOWN_FORMAT`, `details.available` listing the data formats | Reading a file 5 |
| doc-11 | `"kind": "graphty-document", "version": 2` | refused whole, `E_UNSUPPORTED_VERSION`, `found: 2`, `reads: [1]` | Reading a file 6 |
| doc-12 | `"kind": "graphty-document"` with `"version": "1"`, `1.5` or no `version` | refused, `E_BAD_DOCUMENT` | Reading a file 6 |
| doc-13 | a document with no `members`, or `"members": {}` | refused, `E_BAD_DOCUMENT` | Reading a file 7 |
| doc-14 | `"requires": ["graphty-data-plan"]` on a reader that does not know that kind | refused whole, `E_UNSUPPORTED`, naming `graphty-data-plan` | Reading a file 8 |
| doc-15 | `"requires": ["graphty-style"]` with a style member of `"version": 2`, on a reader of style version 1 | refused whole, `E_UNSUPPORTED`, naming `graphty-style` and version 2 | Reading a file 8 |
| doc-16 | `"requires": ["graphty-recipe"]`, opened with `members: ["graphty-style"]` | refused whole, `E_UNSUPPORTED` | Reading a file 8 |
| doc-17 | members `{ "kind": 7 }`, `{ "kind": "graphty-style", "version": "1" }`, `{ "kind": "x" }` with no `version` | each skipped, `E_BAD_DOCUMENT`; the others apply | Reading a file 9 |
| doc-18 | a member `{ "kind": "graphty-view", "version": 1, ... }` beside a style | the view skipped, `W_UNKNOWN_KIND`; the style applies; the view kept on save | Reading a file 10; Writing a file 3 |
| doc-19 | a member of kind `org.example.bookmarks` | skipped, `W_UNKNOWN_KIND`; kept in place on save | Reading a file 10 |
| doc-20 | a style member with `"version": 2` beside a recipe of version 1 | the style skipped, `E_UNSUPPORTED_VERSION`; the recipe applies | Reading a file 11 |
| doc-21 | a style member whose `layers` is a string | that member skipped, `E_BAD_DOCUMENT`; the others apply | Reading a file 12 |
| doc-22 | members [a style whose applying throws, a recipe] | the exception is the style's report entry; the recipe applies | Reading a file 13 |
| doc-23 | the text of a graphty document given to `data.import` as JSON | refused, `E_UNKNOWN_FORMAT`, naming `openDocument` | Reading a file 14 |
| doc-24 | `{ "kind": "graphty-view", "version": 1 }` given to `data.import` | refused, `E_UNKNOWN_FORMAT`, naming `openDocument` | Reading a file 14 |
| doc-25 | a member name `__proto__` anywhere | the file refused, `E_BAD_DOCUMENT` | Reading a file 1; README Limits |
| doc-26 | an extension member named `"__proto__"` | the file refused, `E_BAD_DOCUMENT` | Reading a file 1 |
| doc-27 | a layer object `{ "name": "a", "name": "b", ... }` | the file refused, `E_BAD_DOCUMENT`, naming the pointer: one name twice after decoding | Reading a file 1 |
| doc-28 | 64 MB of `[` characters | refused, `E_TOO_LARGE`, before the text is parsed | Reading a file 1; README Limits |
| doc-29 | a document of 65 members | refused, `E_TOO_LARGE`, naming the member limit | README Limits |
| doc-30 | embedded JGF whose nodes are keyed `constructor` and `prototype` | read; two nodes with those ids | README Limits |
| doc-31 | a top-level member `"colour": "red"` | ignored, `W_UNKNOWN_MEMBER` at `/colour`; written back on save | Unknown object members; Writing a file 3 |
| doc-32 | an unknown member at `/members/0/layers/0/encode/node.color/overflw` | ignored, `W_UNKNOWN_MEMBER` with that pointer; the layer applies | Unknown object members |
| doc-33 | `userData: { "author": "x" }` on a layer and `extensions: { "org.example.tool": { "k": 1 } }` | no `W_UNKNOWN_MEMBER` for either | Unknown object members |
| doc-34 | a recipe with `"tabel": { "delimiter": " " }` | that recipe skipped, `E_UNKNOWN_OPTION`, suggesting `table` | Unknown object members |
| doc-35 | a recipe with `"directd": false` | that recipe skipped, `E_UNKNOWN_OPTION`, suggesting `directed` | Unknown object members |
| doc-36 | a document with `"require": ["graphty-data-plan"]` | refused, `E_BAD_DOCUMENT`, suggesting `requires` | Unknown object members |
| doc-37 | a recipe with an unknown top-level member `"notes": "x"` | `W_UNKNOWN_MEMBER`; the recipe applies | Unknown object members |
| doc-38 | a file written by a newer release whose style layer sets a channel this release does not know, opened and saved | written at `version: 1`, the unknown channel entry intact | Versions 2 |
| doc-39 | a version 1 file opened and saved unchanged by a release that reads style version 2 | written at `version: 1` | Versions 4 |
| doc-40 | an extension `graphty.provenance` | kept and written back, never interpreted: version 1 defines no `graphty.` extension | Extensions |
| doc-41 | a style and embedded data, opened with defaults while a graph is loaded | the loaded graph untouched; the data reported available; the style applies to the loaded graph | The data member 3 |
| doc-42 | the same, with `data: "replace"` | the file's graph replaces the loaded one; `graph.source` is `"document"` | The data member 3 |
| doc-43 | two data members | the first applies; the second skipped, `E_UNSUPPORTED` | The data member 3 |
| doc-44 | a data member with an extra member `"encoding": "latin1"` or `"href": "x.csv"` | the data member skipped, `E_BAD_DOCUMENT`, naming it | The data member 2 |
| doc-45 | a data member of `version: 2` and a recipe, opened with `run: true` over a loaded graph with `data: "replace"` | the data skipped, `E_UNSUPPORTED_VERSION`; the recipe planned on the loaded graph, not run | The data member 4 |
| doc-46 | embedded data in a dialect graph-io does not read, and a recipe, opened with `run: true` and no graph loaded | the data skipped, `E_UNKNOWN_FORMAT` with `{ format, dialect, available }`; the recipe held | The data member 4, 5 |
| doc-47 | embedded node-link `{ "nodes": [{ "id": "a" }], "links": [] }` with `"dialect": "node-link"` | read as node-link, never detected as `d3` | The data member 1 |
| doc-48 | any file, opened with `apply: false` | nothing in the session changes; the report is the one a real opening would give, `preview: true` | Applying a file 1 |
| doc-49 | a recipe opened without `run: true` | its member outcome is `"planned"` | Applying a file 1; The report |
| doc-50 | a recipe applied and run, then a file holding its next `recipeVersion` previewed with the default `onRepeat` | planned in full; `wouldStart: false`, `wouldStartReason: "repeat"`; the member summary names both versions | Applying a file 1 |
| doc-51 | a file with embedded data of 200,000 edges, previewed with no graph loaded | the scratch import refused, `E_TOO_LARGE`; nothing in the session changes | Applying a file 1; README Limits |
| doc-52 | a file with embedded data and a recipe, previewed with no graph loaded | the recipe bound and planned against the embedded data in a scratch graph | Applying a file 1 |
| doc-53 | a recipe file previewed with no graph loaded and no data | the plan unbound; every estimate `null`; `wouldStartReason: "unbound"` | Applying a file 1 |
| doc-54 | `"kind": "graphty-document", "version": 2`, or an unknown `requires` kind, opened with `apply: false` | the promise rejects with a `GraphtyError`: `E_UNSUPPORTED_VERSION` with `found` and `reads`, or `E_UNSUPPORTED` naming the kind | Applying a file (the promise) |
| doc-55 | a style member listed before the recipe whose result it paints | the recipe applies first; the layer waits, then paints when the run completes | Applying a file 2, 3 |
| doc-56 | a style layer reading `results.groups.group` and a recipe in the same file with `as: "groups"`, not run | the layer added switched off, `waiting`; switched on when the run completes | Applying a file 3 |
| doc-57 | two recipes in one file both with `as: "groups"`, and a layer reading `results.groups.group` | the layer switched off, `E_BAD_LAYER`, naming both recipes | Applying a file 3 |
| doc-58 | a style layer reading `results.diff.value` where `diff` is the `as` of a command of a later `op`, on a reader that does not know it | the layer switched off, naming the command; a session run `diff` is not painted | Applying a file 3 |
| doc-59 | two recipes planned at 200 s each, opened with `run: true` and the default budget | neither starts; each report carries `E_CAP_EXCEEDED` with the total of 400 s | Applying a file 4; recipe.md Running 4 |
| doc-60 | the same, opened with `apply: false` | each recipe `wouldStart: false` with `E_CAP_EXCEEDED` and 400 s; `recipes.wouldStart` false | Applying a file 1, 4 |
| doc-61 | three recipes held for data, then data loaded, then `run()` on each, each planned at 150 s | the first two start; the third fails, `E_CAP_EXCEEDED`, naming what is left of the file's 300 s | Applying a file 4 |
| doc-62 | a file of 64 recipes each planned at 290 s, opened with no graph, data loaded, then `run()` on each | the first starts; the second fails, `E_CAP_EXCEEDED` with the file's total | Applying a file 4 |
| doc-63 | `openDocument(text, { run: true })` with no graph loaded and no data, then the caller imports a file | the recipes held, then bound and planned, each `report` replaced before the import resolves; nothing runs until `run()` | README Applying to new data 5 |
| doc-64 | edition 2 of a file holding a recipe and a style reading `results.reach.value`, opened with defaults from the same `base` over edition 1 on the same data | the recipe refused, `E_REPEAT_APPLICATION`; the style's layers replace edition 1's and paint from edition 1's `reach` run | Applying a file 3; recipe.md Applying a recipe |
| doc-65 | a file whose embedded data applied, saved with defaults | no data member written; it is listed in `leftOut` | Writing a file 4 |
| doc-66 | a file whose data member was only reported available, saved with defaults | no data member written; a notice names it | Writing a file 4 |
| doc-67 | a file holding embedded data, a recipe and a style, saved with `members: ["graphty-style"]` and a style `id` | only the style written; the data member and the recipe listed in `leftOut` | Writing a file 4 |
| doc-68 | a session saved with `data: { embed: true }` after runs | a node-link data member holding the data columns only, never run results | Writing a file 4 |
| doc-69 | a graph with a `__proto__` column, saved with `data: { embed: true }` | the data member refused and reported; the other members written | Writing a file 1 |
| doc-70 | a session with an `ids` highlight layer, saved with defaults | that layer left out, listed in `leftOut`; kept with `keepElementSelectors: true` | Writing a file 4 |
| doc-71 | a session holding a Louvain colouring and three layers of an opened look, saved with `style: { templateId }` | only the look's three layers written | Writing a file 4 |
| doc-72 | a session of hand-made layers and a Louvain run's colouring, saved with `style: { id, sources: ["user", "template"] }` | only the hand-made layers written; the run's layer in `leftOut` | Writing a file 4 |
| doc-73 | a style saved with `members: ["graphty-style"]` from a session holding a Louvain run's colouring | the run's layer left out and listed; with `sources` including `"run"`, kept | Writing a file 4 |
| doc-74 | a style saved whose selectors compare with `'TP53'` and `0.05` | the save report's notices list both literals | Writing a file 4 |
| doc-75 | a file holding a member of an unknown kind, saved | the notices list that member written back verbatim, with its size | Writing a file 4 |
| doc-76 | a style saved with no `style.id`, opened with none | the report notes that reopening the file will not replace an earlier opening | Writing a file 5 |
| doc-77 | members [style, unknown kind, recipe], opened and saved | written in the same order; the unknown member verbatim in the middle | Writing a file 3 |
| doc-78 | members [style version 1, style version 2] opened by a reader of version 1 only, saved | [version 1 regenerated, version 2 verbatim], in that order; `requires` kept | Writing a file 3 |
| doc-79 | a recipe with commands [`algo.run`, `column.compute`, `algo.run`], opened on a reader that does not know `column.compute`, saved with defaults | the recipe written back as read, all three commands | Writing a file 3 |
| doc-80 | the same, run, then saved with `recipe: { id: <the same id> }` | written back as read; `leftOut` lists the two commands that did not run; with `dropUnrun: true`, replaced by the recorded recipe | Writing a file 3; recipe.md Recording 8 |
| doc-81 | a recipe opened without `run: true`, saved with defaults | the recipe written back unchanged | Writing a file 3 |
| doc-82 | a layer carrying an unknown member `legend`, opened and saved | `legend` written back on that layer | Writing a file 3 |
| doc-83 | a binding carrying an unknown member `legendTitle`, opened and saved | `legendTitle` written back on that binding | Writing a file 3 |
| doc-84 | a recipe whose third `algo.run` carries `"sed": 7`, opened, run, then that run re-run by hand with seed 7 and recorded under the same `id` with `dropUnrun: true` | the command written with `seed: 7` and without `sed`; `sed` listed in `leftOut` | Writing a file 3 |
| doc-85 | a session with runs `Hubs 2024` and two unnamed PageRank runs, saved with a recipe `id` | `report.sources` pairs `hubs_2024`, `pagerank` and `pagerank_2` with their session runs | Writing a file; recipe.md Recording 4 |
| doc-86 | a file whose `generator` is graphty-element 3.0.0, opened on 3.2.0 | `W_RELEASE_DIFFERS` naming both | The report |
| doc-87 | a report quoting an unknown member whose name is 500,000 characters of markup | the name cut to 256 characters, shown as text | README Trust 6 |
| doc-88 | a document whose `$schema` names a URL | never fetched; validity does not depend on it | README Trust 3 |

## Importing and applying (README.md)

<!-- prettier-ignore -->
| Id | Input | Expected result | Rule |
| --- | --- | --- | --- |
| imp-1 | a node table headed `id,name,padj` | `name` and `padj` are columns; `id` is the node id | What every importer produces 1 |
| imp-2 | a GML edge with `value 3` and `weight 0.2` | the weight is 3; the field `weight` kept as the column `weight_1`; the import report says so | What every importer produces 2 |
| imp-3 | a GraphML edge whose weight is left empty | no `weight` value; the session record leaves `weight` unset, never the default 1 | What every importer produces 2 |
| imp-4 | a CSV edge whose `weight` cell is `NA` | the edge kept with no `weight`; counted in the import report | What every importer produces 2 |
| imp-5 | a CSV headed `source,target,Weight` | the edge column `weight` | What every importer produces 2 |
| imp-6 | a CSV column of `TRUE` and `FALSE`, as R's `write.csv` writes it | text: `== true` matches none; `== 'TRUE'` matches; a bare `where: "significant"` is true for both, text not being empty | What every importer produces 4 |
| imp-7 | `where: "data.significant == 'TRUE' \|\| data.significant == true"` on R's CSV (text) and on a Cytoscape GraphML (boolean) | the same nodes selected on both | What every importer produces 4 |
| imp-8 | JSON from Python's `json` holding `NaN` and `Infinity` in a column | not numbers: treated as missing, counted with `W_COLUMN_TYPE` | What every importer produces 4 |
| imp-9 | a GraphML key `logFC` declaring `<default>0</default>`, and a node without `logFC` | that node has no `logFC` value; the default kept as the column's own, written back by an export; the import report names the column and how many elements left it out | What every importer produces 4 |
| imp-10 | `where: "data.code == '1'"` over a column holding the number 1 | no match: `==` is exact | What every importer produces 4 |
| imp-11 | a CSV column holding `0.01`, `0.2` and `NA` | typed text as a whole; an ordering comparison reads `"0.01"` as a number | What every importer produces 4 |
| imp-12 | a JSON array column compared `== ["a","b"]` | matches the elements holding exactly that list | What every importer produces 5 |
| imp-13 | a CSV listing each pair twice (`A B` and `B A`), no `repeatedEdges` | two edges per pair | What every importer produces 6 |
| imp-14 | a `.txt.gz` file given as a `file`, a `stream` or a `url`, whatever its name | recognised by its first two bytes and decompressed as it is read | What every importer produces 6 |
| imp-15 | a file compressed as zip, bzip2 or xz | refused, `E_PARSE_FAILED`, naming the compression | What every importer produces 6 |
| imp-16 | a CSV with no recognised endpoint headers and no options | the import fails, naming `edgeSource` and `edgeTarget`; no graph without edges is built | What every importer produces (table) |
| imp-17 | a header `protein1 protein2 combined_score` read by comma as one column, with `edgeSource: "protein1"` | the import fails, `E_PARSE_FAILED`, naming `delimiter: " "` as the one that finds `protein1` | What every importer produces (table) |
| imp-18 | a CSV whose lines end in CR LF | a CR before an LF is never part of a field; the last header reads `combined_score` | What every importer produces 3 |
| imp-19 | a node table imported with `{ file, idColumn: "gene" }` and no `variant`, headed `gene,baseMean,log2FoldChange,padj` | read as a node list | CSV shapes |
| imp-20 | a GraphML file whose `edgedefault` is `directed`, imported with `directed: false` | read undirected | What every importer produces (table) |
| imp-21 | a plain import of 60,000 nodes on a page | refused, `E_TOO_LARGE`, naming the node ceiling | Limits |
| imp-22 | human STRING `9606.protein.links.v12.0.txt.gz` imported through the README STRING recipe on a page | refused, `E_TOO_LARGE`, naming the edge ceiling and the Node route | Limits |
| imp-23 | the same in Node, in `createGraphSession({ limits: { nodes: 1000000, edges: 20000000 } })` | loads, plans and runs | Limits |
| imp-24 | an import declaring 4,097 distinct columns in one table | refused, `E_TOO_LARGE`, naming the column limit | Limits |
| imp-25 | a plain JSON `data.import` of 256 MB holding about 85 million empty arrays | refused, `E_TOO_LARGE`, before it is parsed | Limits |
| imp-26 | a JSON import whose attribute is a list nested 200,000 deep | refused, `E_TOO_LARGE`, naming the 64-level limit | Limits |
| imp-27 | a `where` of 1,025 characters, or nested 33 levels | its layer or command fails, `E_TOO_LARGE`; the file applies | Limits |
| imp-28 | 30 nodes each holding a 1,000,000-entry list in `data.x` and `data.y`, and a layer whose `where` compares them 60 times | cut off at the opening budget; the remaining layers switched off, `E_CAP_EXCEEDED` | Limits |
| imp-29 | a file with 150 unknown members | 100 `W_UNKNOWN_MEMBER` notices, then one counting the other 50 | Limits |
| imp-30 | a recipe of 150 commands, previewed | `commands` holds all 150 entries | Limits |
| imp-31 | a layer reading `data.logFC` on data whose column is `log2FoldChange` | switched off; suggests `log2FoldChange` (they share the word `log`) | Applying to new data 1 |
| imp-32 | a scope reading `data.adj.P.Val` on data whose column is `adj_p_val` | skipped; suggests `adj_p_val` | Applying to new data 1 |
| imp-33 | a layer reading `data.padj` on data whose column is `FDR` | switched off; no suggestion: the names share nothing | Applying to new data 1 |
| imp-34 | a file naming 150 missing columns | suggestions for the first 100; a notice that the rest were not searched | Applying to new data 1 |
| imp-35 | a recipe reading `data.type` on nodes and edges, opened with `nodeColumns: { "type": "category" }, edgeColumns: { "type": "predicate" }` | node reads bind to `category`, edge reads to `predicate`; the report records both with their tables | Applying to new data 2 |
| imp-36 | `columns: { "rel": "relation" }` where the data spells a value `supplies` and the file `SUPPLIES` | the column renamed; the value is not: they stay two categories | Applying to new data 2 |
| imp-37 | a column name `x' \|\| true \|\| 'y` given as a rename target | bound as a column of that literal name; no predicate injected | Applying to new data 2 |
| imp-38 | a style opened, then a node table merged with `mode: "merge"` that adds the column a switched-off layer reads | `opened.report` replaced before the import resolves; the layer switched on; its `reads` give the counts after the merge | Applying to new data 5 |
| imp-39 | a recipe planned, then elements added carrying a new column it reads | planned again; its report replaced | Applying to new data 5 |
| imp-40 | a recipe id `Graphty.overview`, `https://graphty.app/recipes/overview`, `https:graphty.app/recipes/overview` or `https://graphty.app./recipes/overview` | skipped, `E_BAD_DOCUMENT`: reserved | Trust 5 |
| imp-41 | a style id `graphty.default`, `GRAPHTY:default` or `https://GRAPHTY.APP/x` | the id ignored and reported; the fallback template id used | Trust 5 |
| imp-42 | a recipe id `org.example.graphtyish` | accepted: it only mentions graphty | Trust 5 |
| imp-43 | a document recipe named `General` | the preview marks it as not the shipped overview | Trust 5 |
| imp-44 | a layer `name` holding a right-to-left override character (U+202E) | shown as text, isolated from the text around it | Trust 6 |
| imp-45 | a label of `<img src=x onerror=...>` | drawn and reported as text, never as HTML | Trust 6 |
| imp-46 | a misspelt binding member (`overflw`) checked with ajv | a list of union errors; `openDocument(text, { apply: false })` names the member in one sentence | Checking a file by hand |

## Style (style.md)

<!-- prettier-ignore -->
| Id | Input | Expected result | Rule |
| --- | --- | --- | --- |
| sty-1 | a layer with `node.size: 2000000`, as 2.x wrote it | refused, `E_OPTION_RANGE`; written back unchanged | Compatible with graphty-element 2.x 1 |
| sty-2 | `edge.patternCount` of 1,001, or of 2.5 | the layer refused, `E_OPTION_RANGE` | Compatible with graphty-element 2.x 1 |
| sty-3 | a label style with `sizePx: 600`, or `padding`, `borderWidth` or `shadowBlur` of 65 | the layer refused, `E_OPTION_RANGE` | Compatible with graphty-element 2.x 1 |
| sty-4 | `edge.arrowHeadSize`, `node.glowStrength` or `edge.animationSpeed` above 1,000,000 | the layer refused, `E_OPTION_RANGE` | Compatible with graphty-element 2.x 1 |
| sty-5 | a `top` selector opened on graphty-element 2.2, or a `member` selector on 2.5 | that release refuses the whole style; a version 1 reader applies it | Compatible with graphty-element 2.x 2 |
| sty-6 | `"node.label": { "by": "data.id", "scale": "passthrough" }` on a CSV edge list | every node labelled by its id; on 2.x, switched off and reported | Compatible with graphty-element 2.x 2; Paths 3 |
| sty-7 | the same on JSON nodes carrying an attribute `id` besides their node id | labelled by the attribute: a real column wins, on 2.x and version 1 alike | Paths 3 |
| sty-8 | a layer writing `"node.colour": "#f00"` and `"node.size": 2` | `node.colour` dropped, `E_UNKNOWN_CHANNEL`; the size applies; `node.colour` written back | Reading and applying 2 |
| sty-9 | a layer writing only `"node.colour": "#f00"` | refused, `E_UNKNOWN_CHANNEL`; listed switched off; written back unchanged | Reading and applying 2 |
| sty-10 | a layer setting `"node.shape": "star"` and `"node.size": 2` | `node.shape` dropped, `E_OPTION_RANGE`; the size applies; the entry written back | Reading and applying 2 |
| sty-11 | a layer setting a node shape a later release added, with a colour | the shape entry dropped, `E_OPTION_RANGE`; the colour paints | Reading and applying 2 |
| sty-12 | a layer writing `node.marker` and `node.color` | `node.marker` dropped, `E_UNSUPPORTED`; the colour paints | Reading and applying 2 |
| sty-13 | an unknown selector kind | the layer refused, `E_BAD_SELECTOR` | Reading and applying 1 |
| sty-14 | an unknown scale | the layer refused, `E_UNKNOWN_SCALE` | Reading and applying 1 |
| sty-15 | an unknown layer `kind` | the layer refused, `E_BAD_LAYER` | Reading and applying 1 |
| sty-16 | a number outside a channel's range, or a value of the wrong type (`"node.size": "big"`) | the layer refused, `E_OPTION_RANGE` or `E_BAD_LAYER` | Reading and applying 1 |
| sty-17 | a layer with neither `set` nor `encode`, or one channel in both | refused, `E_BAD_LAYER`; the other layers apply | Layers and their order 3; Reading and applying 1 |
| sty-18 | a layer with no `target` writing both node and edge channels | refused, `E_BAD_LAYER` | Reading and applying 1 |
| sty-19 | an empty `where` or `has` path | refused, `E_SELECTOR_EMPTY` | Reading and applying 1 |
| sty-20 | a quoted path segment holding a dot (`data."log2.FC (T/N)"`) | refused, `E_BAD_SELECTOR`; write a plain name and open with `columns` | Paths 2 |
| sty-21 | an `everything` layer encoding from a `results.` path | refused, `E_UNSCOPED_RUN_ENCODING` | Result fields |
| sty-22 | `source.by: "element"` in a document | the layer refused, `E_PROTECTED` | Layer sources |
| sty-23 | a binding with both `domain` and `clamp` | refused at the check, `E_BAD_LAYER` (2.x fails only while painting) | Bindings 3; Reading and applying 1 |
| sty-24 | a layer whose checking throws | added switched off with the reason; the other layers apply | Reading and applying 1 |
| sty-25 | a refused layer, then `update(id, patch)` that fixes it | compiled and enabled | Reading and applying 1 |
| sty-26 | a refused layer in a preview | its `layers` entry carries `problem` with the code and reason | Reading and applying 1 |
| sty-27 | `{ "by": "team" }` (no prefix) | read as `data.team` | Paths 1 |
| sty-28 | ``where: "data.adj.P.Val < `0.05`"`` on a graph with a column `adj.P.Val` | matches the elements whose `adj.P.Val` is below 0.05 | Paths 1 |
| sty-29 | `data.log-fc` unquoted | read as `data.log` minus `fc` | Paths 2 |
| sty-30 | an edge layer `where: "data.source == 'TP53'"` on a CSV edge list with ends `source,target` | matches the edges leaving `TP53`; on a file whose edges carry a column `source`, that column is compared | Paths 3 |
| sty-31 | a selector comparing `data.id` with a literal | applied; reported as naming particular nodes | Paths 3 |
| sty-32 | a layer reading `data.name` opened with `columns: { "name": "id" }` on a CSV edge list | labels each node by its id | Paths 3; README Applying to new data 2 |
| sty-33 | a label layer `{ "by": "data.name", "scale": "passthrough" }` on a CSV edge list | switched off; the suggestions include `id`, naming `columns: { "name": "id" }` | Reading and applying 3 |
| sty-34 | label layers `data.id` below `data.name`, on a Cytoscape GraphML export and on an edge list | the export shows `name`; the edge list shows ids, the `name` layer switched off | Worked example |
| sty-35 | the worked example's three label layers on a stringApp GraphML (`name` = `9606.ENSP00000269305`, `display name` = `TP53`) | labelled by `display name`; a preview's `samples` for the `data.name` layer show the STRING ids | Worked example; Reading and applying 3 |
| sty-36 | `where: "padj < 0.05 && significant == true && name != null"` | read as `data.padj < 0.05`, a boolean literal and `null` | Expressions 1 |
| sty-37 | `where: "data.true"` | reads the column named `true` | Expressions 1 |
| sty-38 | `where: "contains(data.labels, 'Supplier')"` | the layer refused, `E_BAD_SELECTOR`: no functions | Expressions 3 |
| sty-39 | `where: "!data.flag"` | refused, `E_BAD_SELECTOR`; `!(data.flag)` and `!flag` are accepted | Expressions 5 |
| sty-40 | `where: "a < b < c"` | refused, `E_BAD_SELECTOR`: comparisons do not chain | Expressions 4 |
| sty-41 | `where: "data.x"` where `x` is `0`, `"FALSE"` or `[]` | true, true, false | Expressions 5 |
| sty-42 | ``where: "data.padj < `0.05`"`` where `padj` holds numbers and `NA` | matches the nodes whose number is below 0.05; `W_COLUMN_TYPE` with the count of `NA` | Expressions 4 |
| sty-43 | ``where: "data.significant == `true`"`` over a CSV column of `TRUE` and `FALSE` | paints nothing; `W_MATCHES_NOTHING` listing `TRUE` and `FALSE` | Reading and applying 3 |
| sty-44 | a layer reading `data.logFC` on a graph with no `logFC` column | switched off; `unbound` names `data.logFC` | Reading and applying 3 |
| sty-45 | opened with no graph loaded, then data loaded that has the columns | layers switched off, then switched on and reported when the data arrives | Reading and applying 3 |
| sty-46 | a layer reading `results.hubs.value` in a file whose recipe has `as: "hubs"`, previewed | state `waiting`, `waitsFor` naming `hubs` | Reading and applying 3 |
| sty-47 | a layer reading `results.modules.group` in a file whose recipe has no `modules` and no session run of that name | state `unbound`, naming the path | Reading and applying 3 |
| sty-48 | a file with a recipe `as: "hubs"` and a style reading `results.hubs.value`, opened with `members: ["graphty-style"]` while the session has its own run `hubs` | the layer switched off, naming the recipe left out; the session's `hubs` is not painted | container.md Applying a file 3 |
| sty-49 | a file whose recipe member is version 2 (skipped) and whose style reads `results.hubs.value`, with a session run named `hubs` | the layer switched off, naming the skipped recipe | container.md Applying a file 3 |
| sty-50 | a layer reading `data.logFC` on 280 nodes, 40 of which carry it | `reads` gives `withValue: 40, of: 280`; `W_FEW_VALUES` | Reading and applying 3 |
| sty-51 | a layer `{ "match": "everything" }` setting `node.opacity`, previewed on N nodes | `selector` given; `matched: N, of: N` | Reading and applying 9 |
| sty-52 | a style with `apply: false` | `layers` lists each layer's paths, bound state, writes and problems; `applied` is empty | Reading and applying 9 |
| sty-53 | a `top` selector with `n: 10` whose values run 1 to 8, then three tied at 9 | 8 elements painted; the report says 3 were left out at the tie | Selectors |
| sty-54 | an edge layer with `ids: { "edges": ["17"] }` | switched off, `E_BAD_LAYER` | Selectors |
| sty-55 | a node layer with `ids: { "nodes": ["a"], "edges": ["17"] }` | `edges` ignored and reported; the node selection applies | Selectors |
| sty-56 | a `member` selector of `"selection"`, opened | applied; reported as tied to the session it was written in | Selectors |
| sty-57 | a layer with `{ "match": "neighbours", "of": { "set": "seeds" }, "hops": 1 }` on a reader that does not know `neighbours` | refused, `E_BAD_SELECTOR`; no `W_UNKNOWN_MEMBER` for `hops` | container.md Versions 2 |
| sty-58 | `"node.color": "red\" onload=\"x"` | does not parse as a colour; the layer refused, `E_BAD_LAYER` | Channels and values |
| sty-59 | `"edge.patternCount": { "by": "data.w", "range": [2, 1e12] }` | values clamped to 1,000; the report counts them | Channels and values |
| sty-60 | `"edge.patternCount": { "by": "data.n", "scale": "passthrough" }` over 4,294,967,295 | draws 1,000 pieces | Channels and values |
| sty-61 | a `passthrough` label over a 60 MB text value | cut to 1,024 characters; counted | Channels and values |
| sty-62 | `{ "match": "everything" }` setting `"edge.style": "dot"` and `"edge.width": 0` | pieces spaced by 0.01 scene units; nothing divides by zero | Channels and values |
| sty-63 | `"edge.patternCount": 1000` on every edge of a 100,000-edge graph | state `failing`, `E_CAP_EXCEEDED`; the layers beneath show | Channels and values; README Limits |
| sty-64 | a `map` of 1,001 entries, or `bins: 257` | the layer refused, `E_OPTION_RANGE` | Channels and values |
| sty-65 | a style whose layers finish just inside the opening budget, then a run completes | the repaint held to the same budget; the layers past it `failing`, `E_CAP_EXCEEDED` | README Limits |
| sty-66 | a layer colouring by `data.logFC` where `logFC` holds numbers and `NA` | the numbers painted; `NA` missing; `W_COLUMN_TYPE` with the count | Bindings 7 |
| sty-67 | embedded data with a node `"score": 1e400`, and `{ "node.size": { "by": "data.score" } }` | that node missing, counted with `W_COLUMN_TYPE`; the `"auto"` domain spans the others | Bindings 7 |
| sty-68 | a binding `{ "scale": "pow", "exponent": 1e400 }` | the layer refused, `E_OPTION_RANGE` | Bindings 7 |
| sty-69 | `{ "by": "data.padj", "scale": "neglog10", "range": [0.5, 3] }` over values including three `0` | the three missing and counted, as in 2.x; `missing: { value }` draws them | Bindings 7 |
| sty-70 | `{ "by": "data.logFC", "scale": "sqrt" }` over values including `-4` | `-4` placed as -2 after the transform, as in 2.x | Bindings 7 |
| sty-71 | `{ "by": "data.x", "scale": "log" }` over values including `-2` | `-2` missing; `W_COLUMN_TYPE` counts it | Bindings 7 |
| sty-72 | a layer with `domain: [0.4, 1]` over values from 0 to 1000 | paints; a notice that more than 95 percent of the values fall outside the domain | Bindings 1 |
| sty-73 | `{ "by": "data.logFC", "midpoint": 0, "palette": "blue-white-red" }` with `"auto"` over values from 0.8 to 4.2 | the domain widened to 0 to 4.2; no value drawn in a blue | Bindings 2 |
| sty-74 | a binding with `"midpoint": 0` and palette `red-blue` | paints; a notice that the palette has no middle colour | Bindings 2; Palettes |
| sty-75 | a binding with `"scale": "bins"` and no `bins`, and one with `"scale": "quantile"` and no `bins` | five groups and four groups | Bindings 6 |
| sty-76 | an ordinal colour layer over `team` with groups of 5, 3 and 3 elements | the largest group takes the palette's first colour; the tied groups by name, by code point | Bindings 8 |
| sty-77 | an ordinal colour over `mutation_count` holding the number 1, with `map: { "1": "#fdae61" }` | painted `#fdae61`, whether the column came from GraphML (int) or CSV | Bindings 8, 9 |
| sty-78 | an ordinal colour over the numbers `1` and `1.0` | one category, `"1"` | Bindings 8 |
| sty-79 | an ordinal colour over a JSON array column (`"aliases": ["TP53", "p53"]`) | the lists missing; `W_COLUMN_TYPE` with the count | Bindings 8 |
| sty-80 | an ordinal colour over a neo4j-admin import CSV's node `labels` | a node labelled `Supplier` is the category `Supplier`; one labelled `Supplier;Company` is `Supplier;Company` | Bindings 8 |
| sty-81 | `map` pins `Supplier` and `OEM` to the palette's first two colours; an unmapped `Distributor` is largest | `Distributor` takes the palette's third colour | Bindings 9 |
| sty-82 | an ordinal shape binding with `map: { "missense": "octahedron" }` and an unmapped `nonsense` | `nonsense` missing, painted by `missing` or left to the layers beneath | Bindings 9 |
| sty-83 | a `map` key `Supplier` on data whose values are `supplier` | the key reported as matching no value | Bindings 9 |
| sty-84 | an ordinal colour with a palette of 8 and no `overflow`, painting 8 categories, then a merge adds a ninth | state `failing`, `E_CAP_EXCEEDED`; back to `paints` when the count fits; a save writes `enabled` as authored | Bindings 11 |
| sty-85 | `"overflow": "other"` over 12 categories and the default palette | the 8 largest in the palette's colours; the other 4 `#505050` | Bindings 11 |
| sty-86 | a layer with `source: { "by": "user" }` from a document | stored as `{ "by": "template", "templateId": ... }` | Reading and applying 6 |
| sty-87 | a document layer with `source: { "by": "run", "runId": "overview__degree" }` naming a run the reader made | stamped `{ "by": "template" }`; the replaced source reported; removing the template removes it | Reading and applying 6 |
| sty-88 | a file with a recipe `as: "influence"` and a layer `source: { "by": "run", "runId": "influence" }`, opened without `run: true`, then `run()`, then the application's `remove()` | the layer tied to the run when it starts; removed with it | Reading and applying 6 |
| sty-89 | two style members with no `id` in a document named `Looks` | template ids `Looks#1` and `Looks#2`; neither replaces the other | Reading and applying 6, 8 |
| sty-90 | a style with no `id` in a nameless document opened with `fileName: "look.graphty.json"` | template id `look.graphty.json#1` | Reading and applying 6 |
| sty-91 | a style with no `id`, no document name and no `fileName` | template id `sha256:` and the first 16 hex digits of the text's SHA-256, then `#1` | Reading and applying 6 |
| sty-92 | two layers with `id: "size"` | the second switched off, `E_DUPLICATE_ID` | Layer ids |
| sty-93 | a layer naming palette `lab-reds`, carried, not registered | registered for this session only and reported; the layer paints | Reading and applying 4 |
| sty-94 | a layer naming palette `lab-reds`, neither carried nor registered | switched off, `E_UNKNOWN_PALETTE` | Reading and applying 4 |
| sty-95 | a carried palette `acme-brand` whose colours differ from the registered one | the registered colours used; the difference reported | Reading and applying 4 |
| sty-96 | a carried descriptor under the id `viridis` | ignored and reported; the built-in palette used | Palettes |
| sty-97 | a carried palette of 257 colours | the file refused, `E_TOO_LARGE`, naming the limit | README Limits |
| sty-98 | a file's layer writing `node.color` while the reader has an enabled layer colouring by `department`, previewed | the file's layer carries `W_PAINTS_OVER` naming the reader's layer | Reading and applying 5 |
| sty-99 | a run whose colouring would cover a layer of the reader's own | `W_PAINTS_OVER` whose reason names `"style": false` on that run | Reading and applying 5 |
| sty-100 | the same style file opened twice from the same `base` | the second opening replaces the first's layers (`replaced` lists them) | Reading and applying 8 |
| sty-101 | two files named "Overview" with no style `id`, opened one after the other | the second adds; the first's stay | Reading and applying 8 |
| sty-102 | a style whose `id` another opening added, opened with the same `fileName` and no `base` | added, not replaced; `W_ID_COLLISION` | Reading and applying 8 |
| sty-103 | a style whose `id` is `org.example-lab.expression-overlay`, opened from another file after the lab's own | added above, the lab's stay; `W_ID_COLLISION`; `onRepeat: { style: "replace" }` replaces them | Reading and applying 8 |
| sty-104 | a style with an `id`, opened twice with no `base`, the second time with `columns` and `onRepeat: { style: "replace" }` | one copy of each layer, under the rename | Reading and applying 8 |
| sty-105 | the same, the second time without `onRepeat` | two copies; `W_ID_COLLISION` | Reading and applying 8 |
| sty-106 | edition 2 of a style `org.example.look` opened from the same `base` directory over edition 1 | the new layers replace edition 1's, where the lowest of them was | Reading and applying 8 |
| sty-107 | a style whose `id` matches layers already opened, previewed | `replaced` lists the layers a real opening would replace | Reading and applying 8 |
| sty-108 | `onRepeat: { style: "refuse" }` on a second opening | `E_REPEAT_APPLICATION` | Reading and applying 8 |
| sty-109 | a style opened with `columns: { "padj": "FDR" }`, then saved | the layer written with `data.padj`, as read | Writing 8 |
| sty-110 | a layer reading `data.FDR < 0.05` after opening with `columns: { "padj": "FDR" }`, threshold edited to 0.01, saved | written `data.padj < 0.01` | Writing 8 |
| sty-111 | the same, with the edit adding `data.qval`, which no rename covers | written `data.qval`; the save report names it | Writing 8 |
| sty-112 | a layer reading `results.team_overview__hubs.value`, saved in a file without its recipe | left out, listed in `leftOut` | Writing 8 |
| sty-113 | a style saved alone whose layer reads a run started without `as` | the layer left out, `E_UNSTABLE_RUN_ID`; the rest written | Writing 4 |
| sty-114 | a layer switched off for a missing column, saved | written with its authored `enabled` (true) | Writing 6 |
| sty-115 | a layer whose `userData` holds a function, a cycle or `NaN` | the save refuses that layer, naming it | Writing 2 |
| sty-116 | a colour `{ "r": 255, "g": 0, "b": 0, "a": 0.5 }`, saved | written `#ff000080` | Writing 5 |
| sty-117 | `applyTemplate` on 2.x with one bad layer | the whole document refused (2.x); on 3.0.0 that layer alone | When this applies |

## Recipe (recipe.md)

<!-- prettier-ignore -->
| Id | Input | Expected result | Rule |
| --- | --- | --- | --- |
| rec-1 | an `algo.run` without `as` | skipped, `E_BAD_COMMAND` (it fails the schema); dependants skipped | Commands 2; Replaying 2 |
| rec-2 | `as: "hubs__score"` | skipped: `__` is reserved | Commands 2 |
| rec-3 | two commands with `as: "hubs"` | the second and its dependants skipped, `E_DUPLICATE_ID` | Replaying 5 |
| rec-4 | an unknown key in `params` | that command skipped, `E_UNKNOWN_OPTION`; its dependants skipped; the rest run | Commands 3 |
| rec-5 | a `layout.set` with `engine: "d3"` and `options: { "alphaDecay": 0.02 }` | checked against the d3 engine's options, not the default engine's; runs | Commands 3 |
| rec-6 | `recipe.record()` output applied on a later major release that changed a default it relied on | `W_RELEASE_DIFFERS`, and the option whose default changed named | Commands 3 |
| rec-7 | a recipe with no `generator` using an option whose default changed | the report names it, counting from the first release that read recipe version 1 | Commands 3 |
| rec-8 | a `shortest-path` run with `params: { "source": "A" }` | skipped, `E_BAD_COMMAND`: the option names a node | Commands 4 |
| rec-9 | a `partition` given as a list of node ids | skipped, `E_BAD_COMMAND` | Commands 4 |
| rec-10 | `louvain` as `modules`, then an option of type `partition` given `{ "result": "modules.group" }` | runs, reading the namespaced run; skipped with `E_DEPENDENCY_SKIPPED` if `modules` was | Commands 4, 10 |
| rec-11 | a scope `"selection"` or `{ "nodes": ["TP53"] }` | skipped, `E_BAD_COMMAND` | Commands 5 |
| rec-12 | a command with no scope, replayed while a filter hides half the graph | runs on every node | Commands 5 |
| rec-13 | a command with no scope, replayed while the reader has a time window | runs on every node: a recipe's scopes ignore the time window | Commands 5 |
| rec-14 | `betweenness` with ``{ "where": "data.combined_score >= `700`", "on": "edges" }`` | runs on every node and the edges scoring 700 or more | Commands 5 |
| rec-15 | the same predicate with no `on`, on a graph whose nodes have no `combined_score` | skipped, `E_UNKNOWN_ATTRIBUTE`: the node table has no such column | Commands 5 |
| rec-16 | `"largest-component"` on a graph with two components of 500 nodes and 800 edges each | the component holding the node whose id sorts first (numbers before text, by code point), whatever the file order | Commands 5 |
| rec-17 | a scope ``{ "where": "data.w > `1`", "on": "edges", "dropIsolated": true }`` | skipped, `E_UNKNOWN_OPTION`: a scope does not drop nodes, a filter does; every later command `E_DEPENDENCY_SKIPPED` | Commands 5; Replaying 3 |
| rec-18 | a `where` scope reading `data.id` on nodes with no column `id` | skipped, `E_BAD_COMMAND`: it would read node ids | Commands 5 |
| rec-19 | `columns: { "gene": "id" }` on a recipe reading `data.gene`, over nodes with no column `id` | skipped, `E_BAD_COMMAND`: a rename binds only a real column in a recipe | Commands 5 |
| rec-20 | a plugin algorithm whose descriptor declares no `scopeInput`, run after a `graph.filter` | skipped, `E_BAD_COMMAND` | Commands 5 |
| rec-21 | a scope ``results.modules.group == `3` `` | runs; recording and replaying carry a notice that the literal names another community on other data | Commands 5 |
| rec-22 | `params: { "weight": "weight" }`, replayed on a GML file and on a Pajek file with weights | runs on both: each importer names the weight `weight` | Commands 6 |
| rec-23 | `params: { "weight": "combined_score" }` on a graph with no such edge column | skipped, `E_UNKNOWN_ATTRIBUTE`; dependants skipped; other commands run | Commands 6 |
| rec-24 | `params: { "weight": "constructor" }` on a graph with no such column | skipped, `E_UNKNOWN_ATTRIBUTE` | Commands 6; README Limits |
| rec-25 | two runs weighted by `strength` and a `layout.set`, on a graph with no `strength` column | both runs skipped, `E_UNKNOWN_ATTRIBUTE`; the layout runs | Commands 6 |
| rec-26 | `louvain` with no `weight` on a weighted graph | runs unweighted | Commands 6 |
| rec-27 | `betweenness` with `params: { "weight": "weight" }`, planned | the plan says the weight is read as a distance, with a notice | Commands 6 |
| rec-28 | a page with `edgeWeightPath` set to `confidence`, replaying `params: { "weight": "weight" }` | reads the column `weight`; `edgeWeightPath` is never read by a recipe | Commands 6 |
| rec-29 | `label-propagation` with no `seed`, replayed twice | both run with `randomSeed` 42, its published default, and find the same communities | Commands 7 |
| rec-30 | label propagation with `seed: 3` and `params: { "randomSeed": 9 }` | skipped, `E_BAD_COMMAND`, naming `seed` | Commands 7 |
| rec-31 | `louvain` with `seed: 7` | runs; a notice that Louvain is deterministic and ignores the seed | Commands 7 |
| rec-32 | `seed: 3000000000` | refused by the schema; a reader skips it, `E_OPTION_RANGE` | Commands 7 |
| rec-33 | a seed above an algorithm's own seed range but within the schema's | skipped, `E_OPTION_RANGE` | Commands 7 |
| rec-34 | a randomised command with no `seed`, whose seed option has no published default, previewed | no `seed` in its entry; a notice that one will be drawn when it runs | Commands 7 |
| rec-35 | the same, run | a seed drawn and reported in the caveats and a notice | Commands 7 |
| rec-36 | `min-cut` with `params: { "useGlobalMinCut": true, "useKarger": true }` and `seed: 5`, while Karger's path takes no seed | planned with a notice that its results differ on every replay | Commands 7 |
| rec-37 | `betweenness` with no `sample` and no `exact`, whose exact estimate is 45 s under the default cap | planned with `E_CAP_EXCEEDED`, quoting the `capSeconds` that would admit it; `method` exact; never sampled | Commands 7; Running 2 |
| rec-38 | `k-core` with `exact: true` | accepted; no notice | Commands 7 |
| rec-39 | a run with no `style` in a file whose style member reads its result | paints nothing of its own; the plan says so | Commands 8 |
| rec-40 | `"style": { "size": [1, 3] }` on PageRank | only the size part painted, from 1 to 3 scene units | Commands 8 |
| rec-41 | a run with `"style": { "size": true, "color": false }` on a reader that does not know `color` | `color` dropped, `W_UNKNOWN_MEMBER`; the run runs and paints its size | Replaying 3 |
| rec-42 | a planned `louvain` command whose colouring paints nodes by group | `paints` gives `node.color` by `results.<runId>.group`, the palette, and the nodes it covers | Commands 8 |
| rec-43 | algorithm key `scc` | runs `components` with `{ "strength": "strong" }`; the report names the current key | Commands 9 |
| rec-44 | algorithm key `org.example:motif-census`, not registered | skipped, `E_UNKNOWN_ALGORITHM`; dependants skipped | Commands 9 |
| rec-45 | a layout id not registered | skipped, `E_UNKNOWN_LAYOUT` | Commands 9 |
| rec-46 | a `where` scope reading `results.modules.group`, where `modules` is a later command | skipped, `E_BAD_COMMAND` | Commands 10 |
| rec-47 | a command reading `results.modules.group` after `modules` was skipped | skipped, `E_DEPENDENCY_SKIPPED` | Commands 10 |
| rec-48 | a `where` scope that matches no node | skipped, `E_SCOPE_EMPTY`; dependants skipped | Commands 11 |
| rec-49 | a `layout.set` replayed while the reader's layout scope is a kept set | dispatched with the scope `"graph"`: the whole graph drawn | Commands 12 |
| rec-50 | an edge `graph.filter`, then `layout.set` `circular` | the whole graph drawn, the hidden elements included; nothing refused | Commands 12 |
| rec-51 | a recipe ending in a `layout.set`, run, then `remove()` while its layout is still in force | the layout and positions in force before it restored | Commands 12 |
| rec-52 | a `layout.set` of `bipartite` | skipped, `E_BAD_COMMAND`; a session's `bipartite` layout is not recorded, and is reported | Commands 12 |
| rec-53 | README "Your first recipe" replayed in `createGraphSession()` | the `layout.set` `done` with a notice that nothing was placed; no `E_CAP_EXCEEDED` | Commands 1, 12 |
| rec-54 | ``{ "op": "graph.filter", "where": "data.combined_score >= `700`", "on": "edges", "dropIsolated": true }``, then `louvain` on `"largest-component"` | Louvain runs on the largest component of the high-confidence core; the session shows the core | Commands 5, 13 |
| rec-55 | a `graph.filter` that keeps nothing | skipped, `E_SCOPE_EMPTY`; every later command `E_DEPENDENCY_SKIPPED` | Commands 13 |
| rec-56 | a `graph.filter` on nodes with `dropIsolated: true` | drops the matched nodes left with no edge between them | Commands 13 |
| rec-57 | an edge filter ``data.w >= `0.4` `` with `dropIsolated`, then a node filter ``data.padj < `0.05` `` | shown as `all(connected(edges), expression)`; a node that passes `padj` but lost its edges to the node filter stays | Commands 13; Data model |
| rec-58 | a recipe with a `graph.filter`, run while the reader has a filter of their own | the reader's filter replaced when the run starts (`replacedFilter: true`); `remove()` puts it back | Commands 13 |
| rec-59 | the same, opened without `run` | the reader's filter unchanged; `replacedFilter: false`; a notice that the recipe's filter will replace it | Commands 13 |
| rec-60 | applications A then B of recipes with filters over the reader's filter F0; `A.remove()`, then `B.remove()` | after `A.remove()` B's filter still shown; after `B.remove()` F0 shown | Commands 13 |
| rec-61 | two recipes with filters applied together | neither sees the other's filter | Commands 13 |
| rec-62 | `"where": "confidence >= 0.4"` and ``"where": "data.confidence >= `0.4`"`` | the same filter | How commands name columns |
| rec-63 | `table: { "edgeSource": "protein1", "edgeTarget": "protein2" }`, opened with no graph, then a CSV with those headers imported through `import()` | ends read from `protein1` and `protein2`; the recipe binds and plans; `report` is the bound plan; nothing runs | Table data 1, 2 |
| rec-64 | the same, with `edgeSource: "node1"` passed in `config` | `W_TABLE_COLUMNS_DIFFER` naming both before anything runs; ends read from `node1` | Table data 3 |
| rec-65 | the README STRING recipe, then STRING's yeast `4932.protein.links.v12.0.txt.gz` imported through `import()` in Node with raised limits | decompressed; read space-separated and undirected, each pair one edge carrying its first row's columns; no `W_PARALLEL_EDGES` | Table data 1 |
| rec-66 | the same file imported through `import()` with `delimiter: ","` in `config` | `W_TABLE_COLUMNS_DIFFER` naming the delimiter; the header read as one column; the import fails, `E_PARSE_FAILED`, naming `delimiter: " "` | Table data 3 |
| rec-67 | the same recipe, then a Gephi `edges.csv` headed `Source,Target,Weight` imported through `import()` | read by the importer's own rules (`Source`, `Target`, comma); `W_TABLE_COLUMNS_DIFFER` naming the columns used | Table data 3 |
| rec-68 | `table` with `delimiter: " "`, `protein1` and `protein2`, and a CSV headed `protein1,protein2,combined_score` | the header test repeated with the detected delimiter; read with `protein1`, `protein2` and the comma; `W_TABLE_COLUMNS_DIFFER` naming the delimiter | Table data 3 |
| rec-69 | `table: { "delimiter": " " }` and a space-separated file headed `source target weight` | read with the space | Table data 3 |
| rec-70 | a table naming `supplier_id,buyer_id` and a file starting with a byte-order mark, headed `"supplier_id","buyer_id"` | the header test passes: the mark and quotes removed | Table data 3 |
| rec-71 | the same table and a file headed `Supplier_ID,Buyer_ID` | the test fails; `W_TABLE_COLUMNS_DIFFER` names the near miss by case | Table data 3 |
| rec-72 | the same recipe, then a neo4j-admin import CSV imported through `import()` with `variant: "neo4j"` | ends read from `:START_ID` and `:END_ID`, the recipe's endpoint columns and delimiter not given to it; read undirected, repeated rows merged | Table data 1, 3 |
| rec-73 | a recipe with `directed: false` and `repeatedEdges: "sum"`, and a neo4j-admin CSV imported through `import()` | undirected; the repeated relationships' weights summed | Table data 1, 3 |
| rec-74 | a CSV of undirected rows `A,B,300` and `B,A,800` read with `repeatedEdges: "max"` | one edge, weight 800, the other columns from the first row | Table data 1 |
| rec-75 | `repeatedEdges: "error"` on a file with a repeated pair | the import fails, naming the pair | Table data 1 |
| rec-76 | a recipe with `table`, opened, then a CSV imported with plain `session.data.import` | the import takes nothing from the recipe; the recipe binds and plans against what it built | Table data 2 |
| rec-77 | a CSV imported plainly with other options, then a recipe with `table` opened | `W_TABLE_COLUMNS_DIFFER` naming each difference and `import()`; the commands still run | Table data 3 |
| rec-78 | the same recipe replayed on a GraphML file | `table` not used and not reported | Table data 4 |
| rec-79 | a GraphML file imported through `import()` | read as a plain import reads it, then planned | Table data 4 |
| rec-80 | a recipe whose `table` holds an unknown member, then `import()` | refused, `E_UNKNOWN_OPTION` at that member's pointer; the commands unaffected | Table data 5 |
| rec-81 | a recipe held with no graph loaded, then a node table imported through `import()`, then an edge table through `import(source, { mode: "merge" })`, then `run()` | planned after each import, the edge columns bound after the second; the runs start only at `run()` | Table data (import) |
| rec-82 | a `where` scope reading `data.padj` on data whose column is `FDR` | skipped, `E_UNKNOWN_ATTRIBUTE` naming `padj`; no suggestion; nothing renamed | README Applying to new data 1 |
| rec-83 | the same, applied with `columns: { "padj": "FDR" }` | runs over `FDR`; the report records the rename | README Applying to new data 2 |
| rec-84 | a `where` scope reading `data.Score` on data whose column is `score` | skipped, `E_UNKNOWN_ATTRIBUTE`: names are compared exactly | README Applying to new data 1 |
| rec-85 | ``"where": "data.padj < `0.05`"`` over a column typed as text holding `"0.01"`, `"0.2"` and `"NA"` | matches the `"0.01"` elements; `W_COLUMN_TYPE` counts the `NA` | Binding to a new graph 1 |
| rec-86 | a command whose column is present on 40 of 280 nodes | `columns` gives `withValue: 40, of: 280`; `W_FEW_VALUES` | Binding to a new graph 1 |
| rec-87 | a recipe with `"directed": false` replayed on a directed CSV import | `W_DIRECTION_DIFFERS` before anything runs; the commands run | Binding to a new graph 2 |
| rec-88 | a directed import where 80 percent of the edges have a reverse twin | `W_DIRECTION_DIFFERS` suggesting `directed: false` | Binding to a new graph 2 |
| rec-89 | `parallelEdges: false`, replayed on an undirected import holding 500 pairs twice | `W_PARALLEL_EDGES` with the count, suggesting `repeatedEdges` | Binding to a new graph 2 |
| rec-90 | a recipe with no `parallelEdges`, replayed on an undirected import holding every pair twice | `W_PARALLEL_EDGES` with the count, suggesting `repeatedEdges` | Binding to a new graph 2 |
| rec-91 | `"where": "data.rel == 'SUPPLIES'"` on edges whose `rel` values are lower case | skipped, `E_SCOPE_EMPTY`; the plan lists the most frequent `rel` values | Binding to a new graph 4 |
| rec-92 | ``{ "where": "data.combined_score >= `0.7`", "on": "edges" }`` on scores from 0 to 1000 | planned; a notice that the scope matches every edge | Binding to a new graph 4 |
| rec-93 | a scope matching no edge, opened with `apply: false` | `E_SCOPE_EMPTY` in the plan | Binding to a new graph 4 |
| rec-94 | README "Your first recipe", previewed on 4,000 nodes and 10,000 edges, where the filter keeps 9,100 edges and leaves 1,300 nodes with none | the filter's `matched` 9,100 of 10,000; its `sees` and every later `sees` give 2,700 nodes | Binding to a new graph 4 |
| rec-95 | degree as `deg`, then a `graph.filter` on ``results.deg.value >= `5` ``, then betweenness, previewed | the filter `matched: null` with a notice that it is evaluated when `deg` completes; betweenness estimated on the whole graph, `estimateIsUpperBound: true` | Binding to a new graph 4 |
| rec-96 | a planned command | its entry carries `algorithm`, `scope` with `matched` and `of`, `method` and `description` | The replay report |
| rec-97 | a planned `louvain` command | a notice that its result depends on node order | Same data, same results 6 |
| rec-98 | recipe versions `1.9.0` and `1.10.0` | `1.10.0` is newer | Identity and versions 2 |
| rec-99 | `recipeVersion: "v2"` | refused by the schema; the recipe skipped, `E_BAD_DOCUMENT` | Identity and versions 2 |
| rec-100 | id `org.example.team-overview` | namespace `team_overview` | Run ids and namespaces 1 |
| rec-101 | id `https://example.org/recipes/2024-Hubs` | namespace `hubs`: leading characters up to the first letter removed | Run ids and namespaces 1 |
| rec-102 | an id whose last segment is 40 letters | the namespace cut to 30, a trailing `_` removed | Run ids and namespaces 1 |
| rec-103 | an id whose last segment has an accented letter (`centralite` with an accented final e) | the accented letter replaced by `_`, then trimmed: `centralit` | Run ids and namespaces 1 |
| rec-104 | an id whose last segment is `2024` | namespace `recipe` | Run ids and namespaces 1 |
| rec-105 | the same `id` applied twice to the same data | the second refused, `E_REPEAT_APPLICATION`; with `onRepeat: "add"`, ids `ns__x` and `ns2__x` | Applying a recipe (repeat); Run ids 2 |
| rec-106 | the same `id` applied after a `data.import` that merged a file | refused, `E_REPEAT_APPLICATION`: merging is the same data | Applying a recipe (repeat) |
| rec-107 | the same `id` applied after new data replaced the graph | runs; not a repeat | Applying a recipe (repeat) |
| rec-108 | `onRepeat: "replace"` | the earlier namespace kept; the earlier runs and their colouring removed; run again | Applying a recipe (repeat) |
| rec-109 | a recipe of three runs; the reader edits a style layer while the second runs | the edit applies at once; the runs after it record as their own steps; `remove()` takes back all three | Applying a recipe (undo) |
| rec-110 | `remove()` after a partial undo | removes and restores only what is still in force; reports what it found already gone | Applying a recipe (undo) |
| rec-111 | opened with no instruction to run | nothing runs; every command planned, with its estimate, `style`, `fields` and the total | Running 1 |
| rec-112 | an exact `betweenness` planned at 45 s under the default cap, with a dependant | planned with `E_CAP_EXCEEDED` and the cap; the dependant `E_DEPENDENCY_SKIPPED`; `wouldStart` true | Running 2 |
| rec-113 | the same command with `recordedCapSeconds: 120` | the problem quotes 120 s; the cap stays 30 s | Running 2 |
| rec-114 | `recordedCapSeconds: 1000000000` | refused by the schema; a reader skips the command, `E_BAD_COMMAND` | Running 2 |
| rec-115 | a `sample` whose sampled estimate is past the cap | skipped, `E_CAP_EXCEEDED` | Running 2 |
| rec-116 | a `layout.set` whose engine publishes no estimate, in a session that draws | skipped, `E_CAP_EXCEEDED` | Running 2 |
| rec-117 | a command still running when it reaches the cap | stopped; its partial result discarded; `E_CAP_EXCEEDED`; dependants skipped | Running 3 |
| rec-118 | `params: { "maxIterations": 10000 }` on `girvan-newman` while its descriptor is marked `unbounded` | skipped, `E_CAP_EXCEEDED`, before anything runs | Running 3 |
| rec-119 | a filter keeping a 5,000-leaf star, then `link-prediction` | skipped, `E_CAP_EXCEEDED`, in the plan | Running 3 |
| rec-120 | a recipe planned at twice the total budget, `run()` | not started, `E_CAP_EXCEEDED` with the estimate | Running 4 |
| rec-121 | a recipe planned at 340 s under the default budget, previewed | `wouldStart: false`, `budgetSeconds: 300` | Running 4 |
| rec-122 | a recipe cancelled after its second command, then `run()` | the first two results kept; the rest run | Running 5 |
| rec-123 | a command with `recordedPrecision: "f32"`, replayed on the CPU | `W_PRECISION_DIFFERS` naming both | Same data, same results 4 |
| rec-124 | the same data under `acceleration: "auto"`, a small and a large graph | the small one may run in double precision, the large one in single; each run's caveats say which | Same data, same results 4 |
| rec-125 | two replays that find the same communities numbered differently | the same result: compare membership, not numbers | Same data, same results |
| rec-126 | an `algo.Run` command | refused by the schema; a reader skips it, `E_UNKNOWN_COMMAND`, suggesting `algo.run`, and every later command | Replaying 4 |
| rec-127 | a command with `op: "acme.census"` or `"algorun"` | refused by the schema; a reader skips it, `E_UNKNOWN_COMMAND`, and every later command | Replaying 4 |
| rec-128 | a command with `op: "column.compute"` after two `algo.run` | the two run; it skipped, `E_UNKNOWN_COMMAND`; every later command `E_DEPENDENCY_SKIPPED` naming it | Replaying 4 |
| rec-129 | commands [`algo.run` as `a`, `{ "op": "org.example.compare", "as": "c", "narrows": false }`, `algo.run` as `b` reading `results.a.value`, `algo.run` reading `results.c.value`] on a reader that does not know the op | `a` and `b` run; the unknown command skipped, `E_UNKNOWN_COMMAND`; the last `E_DEPENDENCY_SKIPPED` | Replaying 4 |
| rec-130 | a command of an op this reader knows, carrying `"narrows": false` | runs; the member ignored | Replaying 4 |
| rec-131 | `"narrows": true` on a later command | refused by the schema; a reader treats it as an unknown command without `narrows` | Replaying 4 |
| rec-132 | a `commands` entry `{ "opp": "graph.filter", ... }` before a `louvain` run | skipped, `E_BAD_COMMAND`; every later command `E_DEPENDENCY_SKIPPED` naming it | Replaying 4 |
| rec-133 | a `commands` entry that is a string or a number | skipped, `E_BAD_COMMAND`, and every later command | Replaying 4 |
| rec-134 | `{ "op": "algo.run", "algorithm": "betweenness", "as": "b", "sed": 7 }` | skipped, `E_UNKNOWN_OPTION`, suggesting `seed`; every later command `E_DEPENDENCY_SKIPPED` naming `b` | Replaying 3 |
| rec-135 | a session with a run on the current selection, recorded | that run left out and reported; the other runs recorded | Recording 2 |
| rec-136 | a run that resolved `partial` under a time box, recorded | left out and reported | Recording 1 |
| rec-137 | PageRank as `hubs`, degree scoped to ``results.hubs.value > `0.01` ``, then `hubs` re-run, recorded | `hubs` recorded; the degree run left out as stale and reported | Recording 1 |
| rec-138 | a run whose `partition` option reads `{ "result": "modules.group" }`, then `modules` re-run, recorded | the dependant left out as stale and reported | Recording 1 |
| rec-139 | `record({ runs: ["significant_degree"] })` where that run's scope reads `results.hubs.value` | left out and reported, naming `hubs` | Recording 1 |
| rec-140 | a session of 12 runs, recorded with `runs` naming 3 of them, all recordable | the 3 recorded; `leftOut` empty | Recording 1 |
| rec-141 | a run re-run after a later run, recorded | written at the position of its latest start | Recording 1 |
| rec-142 | a layout set while the session's layout scope was a kept set, recorded | the layout left out and reported | Recording 1 |
| rec-143 | a force layout set with seed 42 on the whole graph, then an edge filter and a Louvain run, recorded | the `layout.set` written before the `graph.filter` | Recording 1 |
| rec-144 | a run on the visible graph under the filter ``data.combined_score >= `700` `` on edges, recorded | a `graph.filter` with that rule `on: "edges"`, then the run with scope `"graph"`; the conversion reported | Recording 3 |
| rec-145 | a run on the visible graph under `>= 700`, the filter then changed to `>= 400`, recorded | recorded with the `>= 700` the run started under | Recording 3 |
| rec-146 | a run under the edge filter `>= 700`, then the filter loosened to `>= 400` and a second run, recorded | the second run written before the `graph.filter` with the scope ``{ "where": "data.combined_score >= `400`", "on": "edges" }``, the first after it; reported | Recording 3 |
| rec-147 | a run on the largest component, made by hand while an edge filter hid nodes, recorded | written on `"largest-component"` before any `graph.filter`, with a notice that the session's largest component ignores the filter | Recording 3 |
| rec-148 | an edge filter, Louvain on the visible graph, then betweenness started on the whole graph with the filter shown, recorded | betweenness written before the `graph.filter`; if it read Louvain's result, left out and reported | Recording 3 |
| rec-149 | a run on the visible graph with no filter active, recorded | recorded with scope `"graph"`, before any `graph.filter` | Recording 3 |
| rec-150 | a run on the visible graph under a time window and no filter, recorded | left out and reported | Recording 3 |
| rec-151 | a run whose record does not say which filter was in force | left out and reported | Recording 3 |
| rec-152 | a node filter `data.padj < 0.05`, an edge filter `data.weight >= 0.4` and the rule dropping isolated nodes, one session filter, recorded | the node `graph.filter`, then the edge `graph.filter` with `dropIsolated: true` | Recording 3 |
| rec-153 | PageRank as `hubs`, the session filtered to `results.hubs.value > 0.001`, then Louvain, recorded | `hubs`, then `graph.filter` on `results.hubs.value > 0.001` with a notice about the literal, then Louvain | Recording 3 |
| rec-154 | a run under a session categories filter on `data.code` with the value `"3"` over a numeric column, recorded | written ``data.code == '3' \|\| data.code == `3` ``; matches the same nodes on replay | Recording 3 |
| rec-155 | a run under a session categories filter with the value `"0.50"` over a numeric column, recorded | left out and reported: no exact equivalent | Recording 3 |
| rec-156 | a run under a session range filter on `padj` from 0 to 0.05, where `padj` is the number `0.01` on some nodes and the text `"0.02"` on others, recorded | left out and reported: the range and the recipe's comparison disagree on the text | Recording 3 |
| rec-157 | a run under a session filter `any(expression, edges)`, recorded | left out and reported: `any` has no recipe equivalent | Recording 3 |
| rec-158 | a run under a `degree`, `component` or `neighborhood` leaf, recorded | left out and reported | Recording 3 |
| rec-159 | a run scoped to ``{ define: { kind: "rule", where: { kind: "edges", where: "data.w > `1`" }, reading: "clipped" } }``, recorded | written with scope ``{ "where": "data.w > `1`", "on": "edges" }`` | Recording 3 |
| rec-160 | a recipe with a filter and two runs, applied and run, then saved under a new `id` | the same filter and runs written back, each `as` without its namespace | Recording 3, 4 |
| rec-161 | a recipe [edge `graph.filter` with `dropIsolated`, `louvain` as `groups` on `"largest-component"`], run, then a PageRank run by hand, saved with `recipe: { id: <the same id>, recipeVersion: "1.1.0" }` | the filter, then `groups` on `"largest-component"`, then the PageRank run | Recording 3 |
| rec-162 | a run named `Hubs 2024`, recorded | written `hubs_2024`; the rename reported; `sources` holds `{ "as": "hubs_2024", "runId": <the session run> }` | Recording 4 |
| rec-163 | runs named `2024` and `!!!` (a PageRank run), recorded | written `r_2024` and `pagerank` | Recording 4 |
| rec-164 | two runs named with the same 70-character label, recorded | the first 60 characters, and that name with `_2` | Recording 4 |
| rec-165 | runs `a__influence` and `b__influence` from two applied recipes, recorded | written `influence` (the earlier start) and `influence_2` | Recording 4 |
| rec-166 | two unnamed PageRank runs A then B, exported; A retuned, then exported and recorded again | A is `pagerank` and B `pagerank_2` every time | Recording 4 |
| rec-167 | a sampled betweenness run (sample size 2000, seed 11), recorded | written with `"sample": 2000, "seed": 11` | Recording 5 |
| rec-168 | a session run of label propagation with `randomSeed` 7, recorded | written with `seed: 7` and no `randomSeed` in `params` | Recording 5 |
| rec-169 | a force layout set with no seed, recorded | its `options` carry the seed the engine drew; the report says it was drawn | Recording 5 |
| rec-170 | a d3 force layout (no seed option), recorded | recorded without a seed, with a notice that its picture differs on every replay | Recording 5 |
| rec-171 | a layout set in a session that draws nothing, recorded | the seed the command's options gave, or none, with a notice | Recording 5 |
| rec-172 | a run whose estimate was 26 s under the default 30 s cap, recorded | written with `recordedCapSeconds: 30` | Recording 5 |
| rec-173 | a recording with `explicitDefaults: true` holding an option a later release added, replayed on the release before | that command skipped, `E_UNKNOWN_OPTION` naming the option; its dependants skipped | Recording 5 |
| rec-174 | a node table imported with `idColumn: "symbol"`, then an edge list headed `bait,prey` merged with `edgeSource: "bait"`, `edgeTarget: "prey"`, recorded | `table: { "idColumn": "symbol", "edgeSource": "bait", "edgeTarget": "prey" }` | Recording 5 |
| rec-175 | two imports with different delimiters, recorded | `table` without `delimiter`; a notice naming each import's | Recording 5 |
| rec-176 | a session loaded from `links.txt` with `delimiter: " "`, saved with a recipe id | the recipe carries `table` with the endpoint columns and the delimiter the import used | Recording 5 |
| rec-177 | a PageRank run that painted, saved with its style by default | the recipe says `"style": false`; reopening shows the layer once | Recording 6 |
| rec-178 | a PageRank run started from the interface (it painted), recorded without a style | the recipe says `"style": true` or omits it | Recording 6 |
| rec-179 | a file's recipe [`algo.run`, `column.compute`, `algo.run`] run on a reader that does not know `column.compute`, then `record({ id: <the same id> })` | no recipe; `leftOut` lists the two commands that did not run; with `dropUnrun: true`, recorded | Recording 8 |

## Export (export-mapping.md)

<!-- prettier-ignore -->
| Id | Input | Expected result | Rule |
| --- | --- | --- | --- |
| exp-1 | a recipe applied twice (`onRepeat: "add"`), both runs `hubs`, exported | refused before writing, naming the collision; with `resultNames`, written under the names given | Results as columns 2 |
| exp-2 | a run named `degree` over data holding a column `degree.value` | refused, naming the collision with the imported column | Results as columns 2 |
| exp-3 | `resultNames: { "x": "Bad-Name" }` | refused: the name does not follow the rules of `as` | Results as columns 2 |
| exp-4 | a column `influence.value` imported again | an ordinary column, read as `data.influence.value` | Results as columns 3 |
| exp-5 | a run `hubs` exported to GML | the column written as the name graph-io gives it; `W_GRAPHTY_RESULT_NAME` | Results as columns 4 |
| exp-6 | a run exported to Pajek | numbers written as vectors or partitions; other fields reported | Results as columns 4; Per format |
| exp-7 | two Louvain runs exported | the first takes the `community` role; the second a plain column, `W_GRAPHTY_ROLE_TAKEN` | Results as columns 5 |
| exp-8 | a run's `min`, `max` and precision, exported to CSV | reported, `W_GRAPHTY_GRAPH_FIELDS` | Results as columns 6 |
| exp-9 | a GEXF read with its `viz` values, then exported to GEXF with style layers | the drawn appearance takes the roles; the imported columns written as plain columns, `W_GRAPHTY_ROLE_TAKEN` | Drawn appearance |
| exp-10 | a colour authored as `"red"` exported to GEXF | written from the parsed RGBA | Drawn appearance |
| exp-11 | a node label `<b>x</b>` exported to DOT | written as a quoted string, never an HTML-like label; `W_GRAPHTY_TEXT_QUOTED` | Per format (text) |
| exp-12 | a label cell `=HYPERLINK(...)` exported to CSV | written prefixed with a single quote; `W_GRAPHTY_CSV_NEUTRALIZED` | Per format (CSV cells) |
| exp-13 | a GraphML key named `=cmd` exported to CSV | the header cell neutralised the same way | Per format (CSV cells) |
| exp-14 | a numeric cell `-2` exported to CSV | written as a number, not prefixed | Per format (CSV cells) |
| exp-15 | the same with `spreadsheetSafe: false` | nothing prefixed | Per format (CSV cells) |
| exp-16 | an undirected graph exported to GraphML, then replayed through a recipe | `edgedefault="undirected"` written; read undirected | Per format |
| exp-17 | a style layer hidden, then exported | the same result columns; only the drawn appearance changes | Results as columns 7 |
| exp-18 | an export in `createGraphSession()` with no layout run | no positions written; the appearance is the resolved style values | The export call |

## Notes (notes.md)

<!-- prettier-ignore -->
| Id | Input | Expected result | Rule |
| --- | --- | --- | --- |
| note-1 | a release without notes opens a file with a `graphty-notes` member | skipped, `W_UNKNOWN_KIND`; kept in place on save | Opening (last paragraph); container.md Reading a file 10 |
| note-2 | a bare `{ "kind": "graphty-notes", "version": 1, "notes": [] }` | opened as a file holding that member | Writing; container.md Reading a file 4 |
| note-3 | a note on `{ "node": "ACC-9999" }` the graph does not hold | added; reads `missing`; counted in `missing` | Binding 1 |
| note-4 | the same file opened on data that holds `ACC-9999` | reads `present`; nothing rewritten | Status |
| note-5 | targets `{ "filterStep": "s1" }` and `{ "node": 1, "type": "person" }`, checked against the schema, then opened on a release that knows neither | the schema accepts the note; it is added; both targets `unsupported`; written back as read | Targets 6; Later versions 1 |
| note-6 | a cite `{ "result": "r", "run": "x", "weight": 2 }` | schema accepts; note added; cite `unsupported` | Targets 6 |
| note-7 | `text` `"<img src=x onerror=alert(1)>"`, `"**bold**"` and `"<color='red'>x</color>"` | stored and returned exactly; a label bound to `graphty.notes.latest` draws every character | Text 1, 3 |
| note-8 | a note with no `time`, and one with `"time": "2026-13-01T00:00:00Z"` | each skipped, `E_BAD_DOCUMENT`; not stamped | Opening 5 |
| note-9 | `"author": ""` | fails the schema; skipped | Data model 3; Opening 5 |
| note-10 | the same file merged twice | second merge: every note `unchanged`; no history step | Opening 2 |
| note-11 | a held id with different text, held `edited` absent | added under a new id; `renamed` lists the pair; then the same file merged again: `unchanged` | Opening 2, 3 |
| note-12 | a note edited locally (same id and time, later `edited`), then its file merged again | reported `older`; nothing added | Opening 3 |
| note-13 | two notes with one id in one member | the second follows rule 3 against the first | Opening 4 |
| note-14 | `{ "result": "rings" }` in a file whose recipe has `as: "rings"`, applied with namespace `fraud` | target rewritten to the namespaced run id | Opening 8 |
| note-15 | `{ "set": "set_suspects" }` merged into a session holding its own `set_suspects` | reads `missing`, labeled with the target's `name` | Binding 3 |
| note-16 | a note on `{ "node": 11 }` opened on CSV data whose id is `"11"` | `present` | Targets 1 |
| note-17 | an edge note `{ "ordinal": 1, "among": 2 }` opened where the pair has 3 edges | `missing`; no edge guessed | Status; Targets 2 |
| note-18 | a pair with 2 edges; the note's edge is removed and another edge of the pair added | binds to the new edge (the known limit of saving by position) | Targets 2 |
| note-19 | an `{ item }` note, then the result is re-run | target `earlier-run`; note unchanged | Status; Targets 5 |
| note-20 | `{ "__proto__": { "x": 1 } }` inside a note, inside a target, and inside `extensions` | the member is refused whole, `E_BAD_DOCUMENT`; nothing changes | Opening (all or nothing) |
| note-21 | a member of 9,000 notes merged into a session holding 2,000 | refused whole, `E_TOO_LARGE`; nothing changes | Opening (all or nothing); Limits |
| note-22 | `add` with `extensions: { "com.example.app": new Date() }` | refused, `bad-extensions` | Limits |
| note-23 | a style with bare path `graphty.notes.count` on data with a column named `graphty.notes.count` | the path reads the note count; `styles.validate` reports it; `data.graphty.notes.count` reads the column | style.md Paths 1 |
| note-23b | a style binding `graphty.unknownThing` | no value; the layer is reported unbound; nothing painted | style.md Paths 1 |
| note-24 | `visibility.set` with a rule reading `graphty.notes.count` | refused, `E_BAD_SELECTOR`, reason `notes-path` | style.md Paths 1 |
| note-25 | default whole-file save on a session holding notes | no notes member; `leftOut` lists the notes with their count | Saving 1; container.md Writing a file 4 |
| note-26 | `exportGraph("gexf")` on a session holding notes | `W_GRAPHTY_NOTES`, count = notes held; no note columns | export-mapping.md Notes 1, 2 |
| note-26b | `exportGraph("graphml", { notes: true })` on a session holding notes | `graphty.notes.count` and `graphty.notes.text` columns on noted elements; `W_GRAPHTY_NOTES` still reported | export-mapping.md Notes 1, 2 |
| note-27 | `exportGraph("csv", { notes: true })` with a note `=SUM(A1)` | `graphty.notes.text` cell prefixed, `W_GRAPHTY_CSV_NEUTRALIZED` | export-mapping.md Notes 3 |
| note-28 | a note whose `time` is `2099-01-01T00:00:00Z` | added; `W_FUTURE_TIME` notice | Opening 10 |
| note-29 | a note with an unknown field `"reviewed": true`, merged and then edited | `W_UNKNOWN_MEMBER` at `/notes/0/reviewed`; the field is written back after the edit | Opening 7; Later versions 3 |
