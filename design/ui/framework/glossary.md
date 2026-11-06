# Glossary

**Job.** Name every concept in `conceptual-model.md` and every command word a user can see: for each
term its tier, a definition of at most two sentences, the rejected synonyms and the name
graphty-element publishes. It is the one authority for words. **Not here:** behavior
(`interaction-patterns.md`), placement (`information-architecture.md`,
`interface-specification.md`), strings, sentences and copy conventions (`content-design.md`), where
each command starts (the command register, `output-homes.md` 3), published shapes
(`element-contract.md`) and open decisions about published names (`one-way-doors.md`). **Owner:**
content designer. **Ceiling:** the README's table. **Validated by:** the word-list lint (section 1,
rule 4) over every framework document.

Every concept belongs to graphty-element, so every word here is graphty-element's word first; the
graphty app shows these words and never invents its own. The earlier long form, with its evidence
column and draft strings, is `research/archive/glossary-long-form.md`, a record only.

## 1. Tiers and the screen-word rule

| Tier | Where the word may appear |
|---|---|
| **Screen** | the interface (labels, menus, tooltips, state lines, (i) text) and docs |
| **Docs** | documentation and API names only |
| **Design** | the framework documents only |

Whether a word is **published** (in the API, catalog data or the project file) is a separate
column. A screen word and a published name may differ only when the published name is a developer's
name no screen shows (the scope `"visible"` behind "filtered graph").

1. Every word on screen is a Screen term here, a field term from section 12, or an interface word
   from section 13.
2. Nouns follow `conceptual-model.md` 1.3's groups, which never mix. **Content nouns** (the
   primary objects) name what the analyst selects and can scope to: graph, node, edge, set, path;
   a group (with community, component, k-shell, cluster, category) and a found path are a set and a
   path in their offered state, not nouns of their own kind. **Definition nouns** name what is
   edited from a row: result, style layer, filter step (a time window among them), layout settings,
   saved view, Look, note, comparison. **Value nouns**: attribute, pair. **History nouns**: data
   version, run, record. **File nouns**: project, recipe (a style file is one of its profiles), set
   collection, catalog entry. **Working-state nouns** name what is not an object: selection, scope,
   camera, immersive session.
3. **Commands** are the register's (`output-homes.md` 3); every word in a command label is a Screen
   term here or a plain English verb. Section 9 defines only the command words that need a
   definition.
4. **The word list.** Every "Rejected" cell binds **screen strings**: catalog data, command
   labels in the register and message templates. A rejected word in one of them is a defect. Design
   prose may use a rejected word only to name the thing it rejects, quoted; the lint checks the
   retired phrases it lists (`research/scripts/check-framework.mjs`), not every Rejected cell.
5. A proposed published name is checked against section 14 and against graphty-element's existing
   identifiers before it is proposed.

## 2. How a word is chosen

Applied in order; the first rule that answers wins.

1. **A graph or statistics concept takes the field's word**, spelled as NetworkX, igraph, Gephi,
   Cytoscape and Newman's *Networks* spell it. No friendly substitute reaches a label.
2. **An interface concept takes Figma's word**, unless that word already means a graph concept or a
   published graphty-element concept; then the graph or published meaning wins.
3. **A concept only graphty has takes a short plain word**, or none if no user ever names it.
4. **A published name that is correct is kept**; it is renamed only when it makes the documentation
   false or collides with a screen word.
5. **Every rejected synonym becomes a Quick actions alias** (section 16), never a label.

## 3. The document and the primary objects

A **primary object** is a node, an edge, or a named object whose body is an existing subgraph (nodes
of the current data plus a stated edge reading), so it can serve as a scope.

| Term | Tier | Definition | Rejected | Published name |
|---|---|---|---|---|
| **project** | Screen | The file: its graphs (each with its sets, results, filter steps and layout settings), and project-wide style layers, the Look, notes and saved views, with one operation log. | "session" (the runtime `GraphSession`), "workspace" | `element.project` proposed |
| **graph** | Screen | One entry in the project: nodes and edges with a lasting graph id, whose contents change through data versions. | "network" (alias), "dataset" | `Graph` (internal) |
| **node** | Screen | One vertex, identified by its node id. | "vertex", "entity" (aliases) | `NodeId`, `NodeRecord` |
| **edge** | Screen | One connection between two nodes, identified by its id or its ends and a key; a full peer of a node, with attributes and, when declared, a type. | "link", "relationship", "tie" (aliases) | `EdgeId`, `EdgeRecord` |
| **element** | Docs | A node or an edge, when a sentence covers both. | "item" (a result's member) | `ElementMask` |
| **source**, **target** | Screen | The two ends of an edge, and the two ends of a path search (section 14, "source"). | "from/to", "src/dst" | `EdgeRecord.source`, `.target` |
| **set** | Screen | A named collection of nodes, edges or both, kept as an object; an element is in it or not. It states which edges it includes (Edges included). | "group" (a part of a partition), "collection", "saved scope", "subgraph", "subnetwork", "continuous set" | `SetDefinition`, `SetId`, `EdgeReading`, `session.sets` |
| **fixed**, **rule** | Screen | The two unordered kinds of set: a fixed set stores its members; a rule set stores a predicate evaluated against the data. | "static/dynamic", "manual/smart", "ruleset" | `SetDefinition` kinds `fixed`, `rule` |
| **path** | Screen | A kept walk: nodes in order, each step naming its edge, stored as the path kind of set; read as a set it is its distinct nodes and its steps' edges. Its kind is derived: **Cycle**, **Simple path**, **Trail** or **Walk**. | "route", "chain", "ordered set", "Circuit" (a closed trail is a Cycle or a Trail) | `SetDefinition` kind `path`; `sets.pathKind()` `"cycle" \| "simple" \| "trail" \| "walk"` |
| **Edges included**: **induced**, **listed**, **clipped** | Screen | Which edges a set holds: every edge between its nodes, exactly its listed edges, or, for a rule, the edges it keeps whose two ends it also keeps. | "edge rule" (collides with a rule set and the Rule section) | `EdgeReading` |
| **walk** | Screen | A sequence of edges each starting where the last ended; nodes and edges may repeat. | "route" | none |
| **item** | Docs | Any one member of a result: a group, a found path or a pair. | "row", "entry" | `ResultItem`, `ItemKey` |

## 4. Members of a result

On screen each member is named by its kind, because a community, a path and a candidate pair do not
behave alike.

| Term | Tier | Definition | Rejected | Published name |
|---|---|---|---|---|
| **group** | Screen | One part of a partition, a cover or a categorical attribute: a set in its offered state until Create set keeps it. Never a container or a command. | "part", "block", "module" | `group`, `groupSize`, `groupCount` |
| **community** | Screen | A group found by a community-detection method. | "modularity class" | shape `community` (door 14, Published names that mislead) |
| **component** | Screen | A group of the connected-components partition; on a directed graph always weakly or strongly connected. | "separate piece" | through `community` |
| **k-shell**, **k-core** | Screen | A k-shell is the nodes with core number exactly k, a group; a k-core (core number of at least k) is a rule set, because k-cores nest. | "shell" alone | the `k-core` catalog entry |
| **cluster** | Screen | A group found by a method whose literature says cluster (MCL, spectral, hierarchical). | -- | none |
| **category** | Screen | A group of a categorical attribute, named by attribute and value ("region: EU"). | "class"; "category" for an algorithm family (that is **family**) | `category-table` |
| **hierarchy level** | Screen | One partition of a hierarchical partition ("hierarchy level 2 of 4"). | "layer"; bare "level" (the measurement level) | `layered-grouping` |
| **group name** | Screen | An authored name for one group of one run. | "label", "tag" | none |
| **found path** | Screen | A path item of a path search: a path in its offered state until Create path keeps it. | "path" for both | shape `path` |
| **offer** | Docs | A set a finished run proposes (a group, the elements on a found path), usable as a scope and kept only by Create set or Create path. | "suggested set" | `SetOffer`, `sets.offers(run)` |
| **pair** | Screen | One candidate node pair with a score, from link prediction or duplicate detection. | "prediction", "link" | `pair-list` |
| **counterpart** | Screen | A group's equivalent in another run, matched by overlap. | "match" | none |

## 5. Values, results and analysis

| Term | Tier | Definition | Rejected | Published name |
|---|---|---|---|---|
| **attribute** | Screen | A value per node, per edge or per group, shown as a table column. | "column" (the table's view of one), "property", "field" | `AttributeDescriptor` |
| **origin** | Screen | Where an attribute's values came from: imported, joined, result, computed or authored. | -- | `AttributeDescriptor.origin` |
| **measurement level** | Screen | What an attribute's values mean: **categorical**, **ordinal**, **quantitative** or **time**; it decides the encodings offered. | "data type", "continuous/discrete", "nominal" (Vega-Lite's word for categorical) | `measurement` proposed with these four words (door 20, A measurement level per attribute) |
| **role** | Screen | A declared meaning of an attribute: weight (with its weight role), node type, edge type, time, position, or color and size a file brings to be drawn as they are. | "semantic type" | proposed (doors 20, 21) |
| **declared property**, **detected property** | Docs | A property the analyst sets and every run records (direction, parallel-edge and self-loop policies, two-mode), and a fact measured on a scope and never stored (acyclic, connected, two-colorable). | "graph type", "graph trait" | `properties(scope)` proposed |
| **expression attribute** | Screen | An attribute computed by a formula over one element's own attributes; it follows its inputs. | "calculated field", "formula column" | origin `computed` |
| **neighborhood aggregate** | Screen | A run that summarizes an attribute over each node's neighborhood. | "neighbor average" | none |
| **metric** | Screen | A value a method computes for every node or every edge. | "measure", "score", "centrality" (one family) | `node-metric`, `edge-metric` |
| **Statistics** | Screen | The inspector section every scope has: the overview readings, the Attributes row, and graph statistics on request. | "summary", "overview" (except in "overview recipe") | `data.statistics()`, `selection.statistics()` |
| **reading** | Screen | One row of Statistics: a named value over a scope, filled at load when the element maintains it at O(n+m), else **Not computed** (section 10) until asked. | a result kind (those are "single-run" and "multi-run" results) | none |
| **overview recipe** | Screen | The recipe whose readings characterize a graph at load; graphty-element ships **General overview**. Its Statistics row reads "Overview: <name>" (`files-and-recipes.md` 2). | "dashboard", "summary" | door 33, Choosing the overview recipe |
| **Default overview** | Screen | The reader's preference naming the overview every project opens with when it names none of its own; never saved in a project. | "home recipe", "my default" | door 33 |
| **graph statistic** | Screen | A number computed on request over a whole scope, with a record (transitivity, diameter); once requested it is a result. | "global metric", "fact" | shape `fact` |
| **result** | Screen | Everything kept for one analysis: its runs, their values and items. | "analysis", "output", "job" | `Result` (additive), `ResultId` |
| **single-run result**, **multi-run result** | Docs | The two result kinds: one keeps one current run (a metric, a partition, a series); the other keeps every run (path families, flows, pair lists, comparisons). On screen a result is named by its algorithm. | "reading", "query" as kind names | `accumulates` (additive) |
| **run** | Screen | One computation with specific parameters and scope; it owns the record. | "execution", "job" | `Run`, `RunId` |
| **sibling result** | Docs | A second result of the same algorithm that nothing follows: a sampled method, a what-if, or Run as new result. | "variant" | none |
| **partition**, **cover** | Screen | A partition splits a scope's nodes into disjoint groups that together hold every node; a cover's groups may overlap and need not hold every node, and the nodes in no group are counted. | "grouping" | new shape `partition` (door 14) |
| **record** | Docs | The stored answer to "from what, over what, by what, by whom, when" for one operation; on screen it is **Details**. | "lineage", "provenance", "history" | `RunRecord` |
| **state line** | Screen | The one line under a value or result that shows its first state and that state's verb, then Details. | a second "record line" | none |
| **Details** | Screen | The link that opens a run's record, caveats and import report; the project's metadata editor is Project info..., never "details". | "(i)" (defines terms only), "Provenance" | `Run.record` |
| **caveat** | Screen | A machine-written qualification of a number, of five kinds: scope, freshness, exactness, variant and a violated precondition. | "notes" (the analyst's prose) | `Caveats` (door 14) |
| **engine** | Screen | Where a run computed: CPU, or WebGPU with its adapter. | "accelerator", "backend" (aliases) | `Run.accelerator` proposed (door 14) |
| **methods text** | Screen | Prose an export writes from the records behind it; a part of every output, never a file of its own. | "methods section", "report" | none |
| **data version** | Docs | One frozen state of a graph's contents, made by a load or a data edit; listed in Version history. | bare "version", "data revision" | `session.snapshot()` |
| **import report** | Screen | What a load, Add data or Join found: rows dropped, endpoints not found, parallel edges, completeness, matches. | "validation report", "import wizard" | `data.lastImport()` |
| **restore report** | Screen | What Open could not reconnect in a project file, grouped by what each reference lost. | "broken links" | none |
| **weighted degree** | Screen | The sum of a chosen edge weight over a node's incident edges. | "strength" | none |
| **null model**, **randomized baseline** | Screen | The family of random graphs a result is compared against (default: the configuration model, sampled by double-edge swap), and a comparison against its samples. | "random graph" alone | `sampler` proposed |
| **time window** | Screen | A scope bounded by a time attribute, half-open. | "frame", bare "snapshot", "time slice" (alias) | `TimeWindow` |
| **series** | Screen | One run over a list of window scopes, its values tagged by window; which window paints is working state (`conceptual-model.md` 4.7). | "timeline", "animation" | shape `temporal` |
| **derived graph**, **transform** | Docs | A graph made by a transform (projection, quotient, Combine graphs, Extract as graph, a null-model sample), with a derivation map. | "copy", "child graph" | none |
| **comparison** | Screen | A saved Compare with..., kept as a run of a comparison result. The transient surface has no screen name. | "diff" (alias) | `project.compare()` proposed |

## 6. Working state, filter steps and layout settings

Selection, scope, camera and an immersive session are working state, not objects; the time window is a filter step. Filter steps
and layout settings are supporting objects (`conceptual-model.md` 1.3), listed here with the words
they are used with.

| Term | Tier | Definition | Rejected | Published name |
|---|---|---|---|---|
| **selection** | Screen | What the analyst is pointing at on the canvas: elements, or one primary object as a whole. Definitions (results, style layers, filter steps, saved views, notes) are never selected. In the design tier it is the **canvas selection**. | "active object" | `session.selection` |
| **row selection** | Design | Several list rows chosen together (anchor, extend, collapse) while the canvas selection stays as it was; set operations and bulk commands act on it. On screen and to a screen reader the rows are "selected", the platform's word, and the canvas selection is always announced with "on canvas". | "focused" for several rows, "activated" | none |
| **focused** | Design | The one row, cell or node that has keyboard focus. | "selected" for focus | none |
| **filter step** | Screen | One step of the ordered filter list: a set or an inline rule with an outcome, **Filter to** or **Filter out**; every step changes what later computations read. | "Show only", "Hide" (display words), "mask", "query" | `FilterStep` proposed (door 25, One kind of filter step or two) |
| **working set** | Design | A Filter to step used as an investigation's boundary, grown by Add selection to step and Filter to neighbors. On screen it is simply a filter step. | a second screen noun for a step | none |
| **full graph** | Screen | The graph after data edits, before any filter step. | "loaded graph", "unfiltered graph" | scope `"graph"` |
| **filtered graph** | Screen | The full graph after the filter steps: what analysis reads by default. | "visible graph", "graph in force" | scope `"visible"`; `"filtered"` (door 22, The filtered-graph scope's name) |
| **scope** | Screen | The graph something is computed over: for a run, frozen at its start; for a search, **Filtered graph** or **Full graph** as stated. | "scoped" as a state word | `Scope` |
| **population** | Screen | What a relative threshold or rank is measured against. | "denominator" | none |
| **threshold** | Docs | A rule comparison on a value, absolute or relative ("top 10%"). | "cut", "cutoff" as a term | rule leaf `threshold` |
| **Without <set>**, **Within each group**, **Each of...**, **Without each of...** | Screen | Scope forms: the graph without a set; one run over each group of a partition; one run over each item of any other list; one run over the graph without each item in turn. A run over a list of scopes is one run of one result, with per-scope values as item attributes. | "minus", "leave one out" (alias) | list-of-scopes form |
| **Split off** | Screen | In a what-if, the nodes that leave the largest component (or stop being reachable) when a set is removed. | "Cut off" (cut is for graph cuts), "Disconnected" | none |
| **source nodes** | Design | The nodes an algorithm reads as an argument; on screen each algorithm's NetworkX word (source, target, personalization). | "seeds" | per algorithm; `neighborhood.seeds` kept |
| **neighborhood** | Screen | The nodes within k hops of a node or set in a direction, including the start (closed) unless labeled open. | "neighbourhood" (British) | `neighborsOf` |
| **ego network** | Screen | The induced subgraph around one node at a radius. | "egonet", "star" | none |
| **Follow** | Screen | Which edges a neighborhood follows: **In**, **Out** or **All**; "direction" is the graph's declared property only. | "both", "direction" for this | `SelectionDirection` |
| **drawn** | Screen | What the renderer draws; nothing that computes reads it. | "visible", "rendered" | none |
| **position**, **arranged**, **encoded** | Docs | A node's place in the drawing: arranged by a layout (unitless, never compared) or encoded from an attribute. A coordinate that came with the data is an attribute with the position role. | "coordinate system" for arranged positions | snapshot column `role: "position"` |
| **stored positions** | Docs | The positions a saved view holds. | "position snapshot" (graph-format owns snapshot) | none |
| **layout**, **layout settings** | Screen | An arrangement of positions, named as the field names it (Force-directed, Circular, Radial, Grid, Shell, Spiral, Spectral, Planar, Random, BFS, Bipartite, Multipartite, Preset); the settings are one per graph, with a scope. Placing nodes by an attribute is an **encoded axis** of the settings, not a layout. | "Layered" (reserved for a Sugiyama layout), "Positions from columns" (an encoded axis), friendly names | layout ids (door 14) |
| **layout family** | Screen | The heading a layout is listed under: **Force-directed**, **Geometric**, **Tree and columns** (BFS, Bipartite, Multipartite), **Other** (Preset). | "hierarchical" (a partition word), "special" | family values `force`, `geometric`, `hierarchical`, `special`; renaming them is door 14 |
| **encoded axis** | Screen | An axis of the layout settings bound to an attribute (x, y or z; longitude and latitude through a named projection). | "Positions from columns", "coordinate layout" | layout settings' axes proposed |
| **method** | Screen | The algorithm that draws a force layout (Spring-electrical, ForceAtlas2, Fruchterman-Reingold, Kamada-Kawai, ARF). | "Algorithm", "Barnes-Hut" as a method, library names | `LayoutDescriptor.engine` |
| **camera**, **view mode** | Screen | The viewpoint (Fit, Top, Side, Front, Isometric), and the view-mode control: 2D and 3D set the layout's dimension, a saved setting; VR and AR start an **immersive session**, working state. | "camera preset", "display mode" | `KNOWN_CAMERA_IDS`, `ViewMode` |
| **pin** | Screen | Fix a node's position so layouts leave it. | "fix", "freeze" | `element.pin()` |

## 7. Presentation, commentary and captured state

| Term | Tier | Definition | Rejected | Published name |
|---|---|---|---|---|
| **style layer** | Screen | Paints the nodes, edges or groups its selector matches; the top layer wins each channel it writes. Always two words. | "layer" alone, "style" alone, "fill" | `Layer`, `session.styles` |
| **automatic layer** | Screen | The style layer a finished run adds to paint its result, unless an authored layer already writes that channel. | "default layer", "suggested style" (API only) | `LayerSource { by: "run" }` |
| **suppressed** | Docs | An automatic layer not painted because an authored layer writes its channel. | "covered" (withdrawn) | "suppressed by" on the run (additive) |
| **Overrides**, **Base style** | Screen | The style layer kept first that collects hand edits, and the bottom layer that gives every channel its default. | "bypass", "Default look" (a Look is a palette substitution) | door 31, Overrides, Base style and the stack order |
| **Hide on canvas**, **Show on canvas**, **Hidden** | Screen | Stop drawing the selected elements, and draw them again; whether an element is drawn is its own state, not paint, so no layer undoes it. The graph's hidden elements are counted on the canvas legend's not-drawn line, with Select and Show all; they stay in every number. | "hide" for a filter; "remove"; "opacity 0" | door 86, Whether an element is drawn |
| **text style** | Reserved | A named label record text channels would pick by name; it exists only once named text styles are added (`decided-doors.md`, "Named text styles"), and until then a text channel holds an inline label record. | "label preset" | none (`decided-doors.md`) |
| **style stack** | Screen | A project's style layers in order, Overrides first and Base style last (`conceptual-model.md` 5.1). | "layer list", "layers panel" | `session.styles` |
| **highlight** | Screen | A style layer of the highlight kind that marks the elements of one result or object with the highlight mark, never a data channel; highlights stack. | "emphasis", "selection color" | `LayerKind "highlight"` |
| **Look** | Screen | A named substitution of palettes applied to every encoding, as a Figma mode swaps values: **Print**, **Colorblind safe**, **High contrast**. It writes no layers and never sets the canvas background. | "theme" (the reader's app theme), "preset", "Dark" (the canvas follows the theme) | door 85, What a Look is |
| **style channel** | Screen | One property a style layer can write (node color, edge width, label); the element publishes the closed list. | "property", "attribute" | `ChannelDescriptor`, `CHANNELS` |
| **encoding** | Screen | A channel bound to an attribute through a scale and a palette. | "mapping", "visual mapping" | `EncodingSpec`, `Binding` |
| **scale** | Screen | How values map to a channel: **linear**, **log**, **log(1 + x)** for counts that include zero, **magnitude** for signed values on size (the size of the absolute value, with the sign in color or legend), **square root**, **power**, **equal-interval bins**, **log-spaced bins** (bins cut on a log axis; never called equal-interval), **quantile**, **-log10 p** for p-values, **one color per value** for categories, and **colors from the file** for a column with the color role. | the catalog's plain names as labels ("Equal Counts"); "ordinal" for the categorical scale | `scales.ts` keys; `ordinal` key (door 20); `passthrough` |
| **legend block** | Docs | One bound channel of one style layer in the legend, as the element's `LegendBlock` is; blocks reading one attribute over one domain merge into one key (`options-and-encodings.md` 6). | "legend group" | `LegendBlock` |
| **unstyled** | Screen | The legend word for elements no layer above Base style paints, beside "no value". | "default", "unpainted" | none |
| **canvas marks**: **state mark**, **object mark**, **casing**, **member ring**, **hull**, **badge** | Docs | The drawn forms outside the data channels (`canvas-drawing.md` 6): a **state mark** draws transient state (selection, member, hover, focus, marquee), an **object mark** draws what the project keeps (a highlight, a hull, a note marker, a comparison side). A **fill edge** is part of a data fill's drawing, and a **chit** and a **strip** are legend and chrome drawings, so none of the three is a canvas mark. | "mark" alone (a caveat mark); "group mark" (it is a hull) | none |
| **palette** | Screen | The colors an encoding draws from: **categorical**, **sequential** or **diverging**; never the command list, which is Quick actions. | "color scheme", "theme" | `palettes.ts` ids |
| **domain**, **midpoint** | Screen | The value range a scale maps, and the value a diverging palette centers on. | "range" (the channel's output) | `domain`, `midpoint` |
| **Shape**, **Opacity**, **Fill**, **Stroke**, **Effects**, **Rendering**, **Text**, **Ends**; **Placement** | Screen | The style sections, named after Figma's where they mean the same thing (`options-and-encodings.md` 3); Opacity is whole-element opacity, Rendering holds flat and wireframe, and Placement is where a label sits, in the label popover beside Text. | "Typography" (for Text), "Arrows" (for Ends), "Layout" (for Placement: layout is positions), "Appearance" (for Opacity: Appearance is the inspector region) | channel `group` (`element-needs.md`, was door 50) |
| **hull** | Screen | The outline and name drawn around a set or each group of a partition by a layer that targets them as a whole. | "cluster hull", "group mark" | `element-needs.md` (was door 32) |
| **Collapse**, **Expand** | Screen | Draw a set or group as one node with a count badge, and draw its members again; display only. | "group" as a verb, "metanode" (alias) | none |
| **note** | Screen | Prose the analyst writes about primary objects, items, the graph or a definition (a rule set, a result, a filter step, a style layer), citing the runs it rests on. | "annotation", "comment", "memo" | none |
| **cite**, **quote** | Screen | A note's reference to a run; a value a note stores as it was when written. | "link", "pin" | none |
| **saved view** | Screen | A named capture of the working state (the list is `conceptual-model.md` 5.3), with a title and caption; "View" alone appears only where context makes it plain (Save view, Views). | "bookmark", "scene", "figure"; bare "view" for a table mode or a representation | `SavedView` proposed |
| **Created from**, **Used by** | Screen | The row naming what an object was made from, and the row counting what depends on it. | "Source", "References" | none |
| **Memberships** | Screen | The heading over a node's sets and groups. | "Member of" | none |

## 8. Files and the catalog

| Term | Tier | Definition | Rejected | Published name |
|---|---|---|---|---|
| **recipe** | Screen | A project file with no data: definitions and style an analyst applies to their own data. | "template" (alias), "preset", "workflow", "library" | door 19, The recipe profile and how it binds |
| **style file** | Screen | A recipe holding only style layers, palette references and a Look (`conceptual-model.md` 1.1; `files-and-recipes.md` 1). | "style sheet", "theme" | door 19 |
| **data file** | Screen | A file holding only graphs and their attributes, in an interchange format graph-io reads and writes (GraphML, GEXF, CSV and the rest). | "data profile" on screen | graph-io |
| **binding** | Screen | Matching what a recipe reads to the attributes of the data it is applied to. | "mapping" (the import's), "linking" | none |
| **requirement slot** | Docs | One thing a recipe needs from the data: an attribute with a level and role, a catalog entry, a set, an argument, a source or a join. | "role" alone | door 19 |
| **floor** | Design | The overview readings no recipe can remove, because they expose a broken import. | -- | none |
| **Catalog**, **catalog entry** | Screen | The browsable registry of what the element can run, and one registered capability with a key, version, descriptor and option schema. | "Catalogue" (British), "plugin" (the code), "library" | `session.catalog`, `PluginKind` |
| **family** | Screen | The heading an algorithm is listed under (Centrality, Community, Path, Structure, Flow, Prediction), and the Catalog's filter by heading; a layout's heading is its **layout family** (section 6). | "category" and "Category filter" (a category is a group of a categorical attribute) | `AlgorithmDescriptor.category` (becomes `family`, door 14) |
| **Centrality**, **Community**, **Path**, **Structure**, **Flow**, **Prediction** | Screen | The six families, as graphty-element's catalog categories name them. | -- | `category` values |
| **set collection** | Docs | Named rule sets loaded from one list file (GMT, an indicator list). | "library" | none |
| **load step** | Docs | The dialog every data door passes before a load commits. | "import wizard" | none (additive) |
| **findings report**, **evidence file** | Screen | The one report graphty writes: the saved views in page order with the notes each shows, the other notes with their quotes and citations, and the methods text of what they cite; scoped to the current filter step, with that step's members, it is the investigator's evidence file (`files-and-recipes.md` 3). | "notes export", "case file", "report" alone | none |
| **recipe picker** | Docs | The device listing the recipes available: the element's registered recipes, then recent recipe files. | "recipe library" | none |

## 9. Command words that need a definition

The register (`output-homes.md` 3) holds every command label and where it starts. These are the
words a label is built from that a reader could misread.

| Word | Definition | Rejected |
|---|---|---|
| **Create set**, **Create path** | Keep the selection, an offered group or a found path as a fixed set or a path. | "Save as set", "Make set", "Group selection" |
| **Freeze as fixed set** | Keep a kept rule set's current members as a new fixed set; the rule set is unchanged. | "Create set" on a set (it reads as a no-op) |
| **Fade others** | Add one ordinary style layer over everything the selection does not hold (frozen as a fixed set), writing only node and edge opacity at the bound-opacity floor and never a color, because hue belongs to data; one undo step, named in the legend. | "Dim", "Isolate", "Focus" |
| **Create rule set** | Keep a rule that is on screen (a filter step, a histogram band, a Find query) as a rule set; Create, because a rule set is a set. | "Save filter", "Save as rule set" |
| **Remove**, **Delete** | Remove takes nodes and edges out of the data, as a new data version; Delete deletes an object (a set, result, style layer, note, saved view), leaving the data. | "Ungroup set" (Delete is the word); "Remove from set" |
| **Filter to**, **Filter out** | Add a filter step that keeps, or leaves out, what the command acts on: the selection, or the row, legend entry or band it is invoked on. One label on every surface; "filter to selection" is a palette alias. | "Filter to selection", "Show only", "Hide", "Isolate", "Focus" |
| **Add selection to step**, **Filter to neighbors** | Grow the newest Filter to step by the selection, or by the selection's neighbors k hops out; one undo step each. | "Include found nodes", "Replace step", "Replace working set", "Expand" |
| **Hide on canvas**, **Show on canvas**, **Hide others** | See section 7; Hide others hides every drawn element the selection does not hold, the way to narrow the view at any size without narrowing the analysis. | "Filter out" (changes numbers), "Unhide", "Isolate" |
| **Create set to style**, **Create path to style** | The one Appearance control on an offered group or found path: keep it, then its own layer takes the edit. | "Save and style" |
| **Override** | Write one value for the selected elements into the Overrides layer. | "Force style" |
| **Select neighbors**, **Select same value**, **Select members** | Grow the selection by one hop per press; select every element sharing an attribute's value; select the union of the members of the focused set, path or item rows. | "Expand", "Grow" (aliases) |
| **Enter to members** | The keyboard move from one selected set, path or item to its members; Shift+Enter returns. | "Select members" (the command for several rows) |
| **Previous selection** | Restore the selection held before the last change; one slot, not a history. | "Selection history" |
| **Run**, **Run as new result**, **Re-run** | Compute with the editor's options; force a sibling result; run again with the recorded parameters and scope, as a new run. Re-run's label names the path it will take when that differs from the failed run's: after WebGPU is lost it reads **Re-run on CPU**, one command with one id, never automatic (section 10). | "Execute", "Retry", "Run again", "Retry on the CPU", "Fallback" |
| **Restore**, **Restore version** | Bring back what was kept, exactly as it was: dropped values, or a deleted run or set from its record; Restore version appends an earlier data version as the newest. | "Recompute", "Re-run" |
| **Use current**, **Carry over to new run** | Move a reference from an earlier run or data version to the current one; move a partition's group names and notes to a new run by matching groups. | "Follow", "Update", "Rebind" |
| **Cancel**, **Stop** | Discard a queued or running analysis run; end a running layout, keeping the positions reached. | "Abort" |
| **Compare with...**, **Without this** | Compare the selection with one other thing; the what-if that removes one node, set or group. | "Diff" (alias) |
| **Save view**, **Apply view**, **Update view**, **Revert view** | Capture the working state; replace the working state with a view's capture; overwrite the capture; return to it. | "Bookmark", "Restore" (for views) |
| **Apply recipe**, **Export recipe**, **Use as this project's overview** | Copy a recipe's definitions in through the binding step; write the project's definitions without data; make a recipe this project's overview. | "Load style", "Import template", "New from recipe" (Open on a recipe file starts a project from it) |
| **Apply style file on top...**, **Replace style stack with style file...** | Add a style file's layers directly below Overrides; replace every authored layer with the file's. | "Apply style..." (names no file), "Load style" |
| **Use as default overview**, **Compute the overview** | Make a recipe the reader's default overview; run every Not computed row of the overview at once, under the cost gate (`files-and-recipes.md` 2). | "Use as my default for new graphs", "Compute all" |
| **Apply anyway** | Add a suppressed automatic layer above the layer that writes its channel. | "Force style" |
| **Fix at <value>**, **Edit a copy** | Replace a bound channel with one value it names; put an editable copy of an automatic layer in its place. | "Detach" (a freshness state's word) |
| **Reset**, **Reset to default**, **Clear** | Return a row to the value it was made with; to the element default (Preferences' Default overview row uses it to return to General overview); stop the layer writing the channel. All three sit in a row's context menu; Clear is also its minus button. Reset belongs to rows; a view is reverted (Revert view). | "Unset", "Revert to <source>", "Reset to General overview" |
| **Narrow the graph...**, **Show all** | The not-drawn line's two routes past the drawing limit: add filter steps from the offered ones, which changes every number; draw every hidden element again. | "Choose what to draw" (hides that the numbers change) |
| **Add in a new layer above** | On a section whose channels are all written, add a layer scoped like this one directly above it. | "Add paint" |
| **Give these a color** | Paint the elements a binding skipped (no value, or outside a log scale) with one constant, as a new layer directly above. | "Color missing" |
| **Treat as categories**, **Treat as numbers** | Read a bound attribute at the other measurement level for this binding. | "Convert type" |
| **Turn off step**, **Turn on step** | Bypass a filter step without deleting it; the step's checkbox. | "Bypass" (Cytoscape's word for a style override), "Disable" |
| **Union**, **Subtract**, **Intersect**, **Exclude** | Combine the focused sets into a rule set naming its operands. | "difference", "XOR" (aliases) |
| **Combine graphs...**, **Bipartite projection...**, **Quotient graph...**, **Sample from null model...**, **Extract as graph** | The transforms that make a derived graph; Extract as graph copies the filtered graph or a set. | "Project" alone, "Merge" (graphs) |
| **Merge nodes** | Replace nodes with one node, as a new data version, with each attribute's reduction. | "Contract" (alias) |
| **Download project file** | Write a copy of the project file. | "Save as", "Download a copy" |
| **Undo**, **Redo** | Reverse or reapply the last change to the project; undoing the command that created a result whose first run is pending removes the result, and Redo brings it back unrun. | -- |

## 10. States and their one verb

A state line shows one state, then the scope when it differs from the filtered graph. Each state
offers one verb per cause, or none. The one named exception is the over-budget refusal, which
offers exact and sampled, because the analyst must choose between them and no single verb is honest. `element-contract.md` 7 maps the element's freshness values onto
these.

| Screen state | Meaning | Verb |
|---|---|---|
| **Out of date** | An input the run read changed. | Re-run |
| **Earlier run** | A reference holds a run that is no longer current. | Use current; Carry over to new run for a partition group |
| **Earlier data** | A run belongs to a data version before the last Replace data or re-query. | Use current |
| **Cannot re-run** | Inputs changed but the source is gone; the values are kept and marked. | none |
| **Detached** | What it referred to was deleted; it resolves through the kept record. | Restore (Restore run, Restore set) |
| **Cannot evaluate** | A cycle, a rule that no longer compiles, or a kind this version lacks. | Edit rule; none for a missing capability, which reads "Needs <name>" |
| **Values not kept** | A deterministic run dropped its values to save space. | Restore |
| **Changed since applied**, **Data changed since applied** | The working state or the data moved after a view was applied. | Update view |
| **Queued**, **Running**, **Failed** | A run's status, separate from freshness. **Canceled** is a word of the log, never a row state: a canceled run's row shows the run before it, or nothing. | Cancel (Stop for a layout); Re-run for Failed, labeled with its path (section 9) |
| **Not run** | A result that exists but has never run: created by a costly or argument-taking Catalog click, by Redo of an undone run, or by a recipe. | Run; Change parameters when an argument is missing |
| **Not computed** | A reading of Statistics not yet asked for. | its cost band word, then Run |

**Marks** are closed (`principles.md`, rules): one word per caveat kind.

| Mark | Meaning |
|---|---|
| **~** | an estimate |
| **at least**, **at most** | a bound, not an estimate (a sampled diameter is at least its value) |
| **not converged**; **first <N>** | stopped at its iteration cap; output cut at its declared cap |
| a variant word | "(sampled)", "(unweighted)", "weakly", "strongly", "in-", "out-" |
| a precondition phrase, at most three words | a violated precondition, with its one alternative on click |
| **Filtered:** | the filter chip while any step is on |
| **<channel> set by <layer>** | a run's automatic paint was suppressed |
| **missing attribute** | a recipe's slot or a style row's binding has no attribute; the definition is kept and off, and the tooltip names the attribute |
| **<N> hidden** | elements Hide on canvas stopped drawing |
| **canvas not available** | the renderer could not start or was lost; Restart viewer is its verb |
| **not drawn** | counted but not drawn |
| **filtered out** | a Find hit a filter step leaves out, naming the step |
| **<N> incomplete** | attributes with missing values |
| **merged into <name>**, **(removed)** | the target was merged or removed |
| **outside scope**, **not yet measured** | outside the result's scope; a count still being computed |
| **weight: unknown** | the weight's role is not declared |
| **<N> unmatched**; **<N> rows dropped** | an import's loss: identifiers that matched nothing; rows not read |
| **no value**; **(none)** | the attribute is absent on this element; an empty category or reference |
| **0 in filtered graph** | a search (a walk outward) whose hits all lie outside the filter; Search full graph is its verb |
| **0 matches** | a Find with no hit anywhere; its verb is the closest candidate, when there is one |
| **Other** | the overflow group of a categorical encoding past its ceiling |
| **painted by <N> layers** | a value several enabled layers write, the top one winning |
| **zoom to read** | a mark or label too small at this zoom, drawn again when zoomed in |
| **Needs <name>** | a saved kind this version lacks (the Cannot evaluate state); no verb; never used for a missing attribute |
| **Not saved**; **View only** | the autosave has not written the last change; the project cannot be written here |
| **Draft restored** | an editor reopened on an unsent draft |
| **<N> changed** | an option form's count of options off their default |
| **treated as <level>** | a binding reads an attribute at a level it was not declared with |

Which mark wins on a row is `state-matrix.md` 2, and where each is drawn is
`interface-specification.md` 3. A state word joins this section only when the comprehension test
tells it apart from its nearest neighbor (`principles.md` 5).

**Cost bands** are values, not marks: **under a minute** (10 to 60 s), **a few minutes** (1 to 5
min), **under an hour** (5 to 60 min), **hours** (1 to 24 h), **over a day**. A clock time replaces a
band only for a run measured on this device and engine. This is the one list; other documents cite
it.

## 11. Weight roles

| Role | Gloss on screen | Read by | Rejected |
|---|---|---|---|
| **distance** | smaller = closer | the list is `graph-conventions.md` 1 | "cost" (alias) |
| **similarity** | larger = closer | the list is `graph-conventions.md` 1 | "affinity", "strength", "weight" |
| **capacity** | how much can flow | the list is `graph-conventions.md` 1 | -- |
| **unknown** | paths ignore it; PageRank and communities read it as a similarity | -- | a role guessed from the name |

A similarity's conversion for distance algorithms (1/w, 1 - w, -log w) is part of the role
(`graph-conventions.md` 2). The components parameter reads **Connection: Weak / Strong**.

## 12. Graph and statistics terms

Screen tier, exactly as the field uses them, each defined by an (i).

- **Structure:** directed, undirected, weight attribute, multigraph, parallel edges, self-loop, acyclic,
  directed acyclic graph (DAG), tree, forest, isolate, induced subgraph, edge subgraph, bipartite,
  degree distribution, articulation point, bridge.
- **Degree family:** degree, in-degree, out-degree, weighted degree, neighbor count, core number.
- **Metrics:** betweenness, edge betweenness, closeness, harmonic centrality, eigenvector
  centrality, Katz centrality, PageRank, HITS (hub score, authority score), local clustering
  coefficient, eccentricity, participation coefficient, Burt's constraint.
- **Graph statistics:** transitivity, average clustering, diameter, radius, average path length,
  global efficiency, degree assortativity, attribute assortativity, reciprocity, modularity.
- **Groups:** partition, hierarchical partition, cover, community, weakly and strongly connected
  component, largest connected component, k-shell, k-core, cluster.
- **Paths:** shortest path, simple path, trail, walk, cycle.
- **Comparison:** Spearman rank correlation, Kendall's tau, top-k overlap, AMI, ARI, NMI, Jaccard
  similarity, Kruskal-Wallis test, AUC; false discovery rate (Benjamini-Hochberg).
- **Link prediction:** common neighbors, Jaccard coefficient, Adamic-Adar index, resource
  allocation index, preferential attachment.
- **Null models:** configuration model, double-edge swap, stub matching, z-score, empirical p-value.

**Parallel edges** reads "N extra parallel edges", because the published `repeatedEdgeCount` counts
edges beyond the first; the import policy reads "Parallel edges: Allow / Merge into one".

## 13. Interface words

| Term | Tier | Definition | Rejected |
|---|---|---|---|
| **inspector** | Docs | The right panel that shows the canvas selection, or the graph when nothing is selected. | "properties panel" |
| **toolbar**, **Quick actions**, **nav rail**, **bottom dock** | Screen (Quick actions), Docs | Figma's floating tools, its searchable command list under Figma's own name, left rail and bottom region. | "dock" for the toolbar, "command palette" (alias), "palette" (the colors) |
| **main menu**, **chevron menu** | Docs | The first rail button with Figma's slots, and the menu on the project's name. | "hamburger menu", "project menu", "name-row menu" |
| **File**, **Edit**, **View**, **Selection**, **Algorithms**, **Recipes**, **Preferences**, **Help** | Screen | The main menu's submenus. | "Object", "Plugins", "Libraries" |
| **Graph**, **Results**, **Notes**, **Assistant** | Screen | The rail buttons and the collections their panels list. | "Layers", "Assets", activity names |
| **Graphs**, **Sets and paths**, **Styles**, **Views**, **In this project**, **Catalog** | Screen | The Graph panel's sections and the Results panel's two halves; Styles is the style stack's list. | "Pages", "Objects", "My results", "Layers" |
| **object list** | Docs | The kept sets and paths in the Graph panel. | "Layers" |
| **table**, **Nodes**, **Edges**, **Type** | Screen | The dock's many-rows representation, its first two tabs, and the facet a declared type role adds. | "data grid", "spreadsheet" |
| **filter chip**, **Filter steps** | Screen | The chip under the project name stating the scope every number is computed on, and its popover. | "Filters" |
| **Find** | Screen | Looking up nouns by name or value: ids, names and values across the project. | "Search" (alias; section 14, "search") |
| **start screen** | Docs | What shows before a project is open: recent projects, samples, Open..., Connect to data source.... | "welcome screen" |
| **Version history** | Screen | The one browsable history: data versions, applied recipes and the operation log. | "History" alone |
| **Undo history** | Screen, interim | The Edit menu's list of undo steps, shown only until graphty-element restores a canceled run on Redo; then removed (`research/interaction-patterns-rejected.md`). | "History" alone |
| **running notice** | Docs | The one notice that shows a run in progress; never "toast" in a document. | "run toast", "running toast" |
| **Hide**, **Show** | Screen | The eye on a row that draws something itself (a style layer, a hull, a found path's casing); the tooltip names the row ("Hide layer"). | "Hide nodes" |
| **Mixed**, **N differ** | Screen | A value that differs across the selection, and the row opening the table on the differing attributes. | "various" |
| **not-drawn line** | Docs | graphty-element's line in the legend saying what is counted but not drawn, in every embed. Not saved is the element's autosave state, drawn beside the project name. | "status bar", "status line" |
| **Last import**, **Overview**, **Edges**, **Types** | Screen | Rows of the graph's Statistics: the latest load, the overview in force ("Overview: General"), direction and weight role, and counts per declared type. | "Import report" as a row name, "Overview recipe" as a row name |
| **Appearance**, **Attributes**, **Connections**, **Members**, **Rule**, **Parameters**, **Endpoints**, **Position**, **Look**, **Background**, **Layout**, **Selector**, **Encodings** | Screen | Inspector and editor sections: channels painting the selection, its values, a node's neighbor and edge counts, a set's members, its rule, an algorithm's or layout's parameters, an edge's ends, a node's place, the graph inspector's rows, and a style layer's selector and bound channels. | "Style", "Contents", "Options" (the published schema's word, Docs only), "Summary" |
| **Additional labels**, **Labels on canvas**, **Legend**, **Show arrows**, **Minimap**, **Note markers**, **Follow selection**, **Minimize UI** | Screen | View-menu toggles; Labels on canvas, Show arrows and Legend are captured by a saved view, the rest are reader help. | "Show labels", "Navigator" |
| **Select**, **Lasso**, **Hand**, **Path**, **Note** | Screen | The toolbar's tools. | "Box select", "Move" |
| **editor popover** | Docs | The one popover for editing a definition or taking a command's inputs. | "dialog" |
| **Export...**, **Export dialog**, **Export table**, **Copy as PNG** | Screen | The header's whole-project export, a table tab's CSV, and a figure to the clipboard. | "Present", "Share", "Download CSV" |
| **Restart viewer** | Screen | Restart graphty-element's renderer on the session in memory after rendering is lost. | "Reload" |

## 14. Collisions

| Word | Ruling |
|---|---|
| element | A node or an edge, in docs. The component is always "graphty-element". |
| algorithm | A runnable analysis with a result; a layout's is "method". |
| layer | Always "style layer"; a level of a hierarchical partition is a "level"; no panel is "Layers". |
| group | A part of a partition, cover or categorical attribute, in docs; on screen the kind word names it (Community, Component, Category, k-shell, Cluster) and a column command is "Partition by"; never a container or a command. "group name" stays. |
| pin | Fixing a node's position only. Overrides is "kept first"; failed results sit in "the strip of results that need action". |
| Edges, direction | "Edges" names the graph's edges wherever it appears: the table tab and the Statistics row of direction and weight role. "Direction" is the graph's declared property; a neighborhood's In, Out or All is "Follow". |
| mark | A caveat mark only (section 10). Drawn forms are "canvas marks", "state marks" and "object marks" (Docs, section 7); a node's own drawn size is its screen size, so the boundary is the "node screen-size boundary", never "mark-size". A value outside a result's scope reads **outside scope**, never "Not computed", which is a reading not yet asked for; a count still being computed reads **not yet measured**. |
| Create set | On an offer or a selection it keeps them; on a kept rule set the verb is **Freeze as fixed set**, because "Create set" on a set reads as a no-op. |
| parameters, options | "Parameters" on screen for an algorithm's or layout's inputs, the field's word; "option" is the published schema's word (`OptionDescriptor`), Docs only (door 14). |
| selected | Visible text calls the canvas selection "selected"; a row selection (section 6) is "selected" too, the platform's word (`interaction-pattern-entries.md` 9.1), so the canvas selection is always announced with its count and "on canvas". |
| time | On screen, the measurement level; the role reads "time role". The attribute's value type (storage: string, number, integer, boolean, time, category, mixed) is Docs only, never on screen. |
| category | A group of a categorical attribute; an algorithm heading, and the Catalog's filter, is a "family". |
| reading | One row of Statistics only. The result kinds are "single-run" and "multi-run" results (Docs); a set's induced, listed or clipped is its "Edges included"; the state matrix's capacity and legibility measures are "levels". |
| query | A data source's query only (re-query). A Find is a "Find"; a result kind is a "multi-run result". |
| search | A walk outward from endpoints (Select neighbors, a path search, the within-k-hops leaf); looking up nouns is Find, and its list and marks are Find's. Typed into Quick actions, "search" ranks Find first and Search full graph second. The command that finds a path is "Shortest path from...". |
| look | A Look is the palette substitution; the bottom style layer is Base style. |
| source | An edge's end, and a path search's start; a data source is "data source"; a style layer's origin reads "made by". |
| level | "Measurement level" in full; a hierarchical partition's level is a "hierarchy level". |
| overview | Inside overview-recipe names (General overview, Flow overview), their commands (Use as default overview, Compute the overview), and the Statistics row that names the one in force ("Overview: General"); never alone for the Statistics section itself. |
| two-mode, bipartite | Two-mode is the declared property; bipartite (two-colorable) is the detected one. Algorithms keep the field's names (Bipartite projection..., Bipartite layout). |
| component | A connected component only; nothing is called Components or Assets. |
| detach | The freshness state "Detached" only; fixing a bound channel is "Fix at <value>". |
| hide | The eye's tooltip on a row, and Hide on canvas; a filter step's outcomes are Filter to and Filter out. |
| view | "saved view" for the object; "View" alone only where the context names it (the menu, Save view). |
| flow | Three senses. The **Flow** family of algorithms (Screen). A **task flow**, a design artifact: the step sequence of one task in one sitting (Design; `task-flows.md`). Figma's prototype **Flow**, which graphty does not have; its counterpart is the saved view (`figma-crosswalk.md` 2). Never "flow" alone for a saved view. |
| ordinal | The measurement level only; the element's categorical scale keyed `ordinal` is "one color per value" on screen (door 20). |
| cut | Graph cuts only (min cut, cut vertex); a value cutoff is a "threshold". |
| expand, collapse | The display pair for a set or group only. |
| restore | Bringing back what was kept (values, a deleted run or set, an earlier data version as the newest); a view is reverted. |
| set | "Set" on screen; the type is never `Set`. |
| snapshot | graph-format's `GraphSnapshot`; a view holds "stored positions"; a window is a "time-window snapshot" in (i) text only. |
| remove, delete | Remove changes the data; Delete removes an object; a filter "leaves out". |
| strength | Never on screen: weighted degree, "Connection: Weak / Strong", similarity. |
| engine | CPU or WebGPU on screen; a layout's drawing library is its "method". |
| history | The one browsable history is Version history. |
| visible | Never on screen; "filtered graph" and "drawn". |
| note | The analyst's prose; run qualifications are "caveats". |
| label | The drawn text; a group's authored title is its "group name". |
| covered | Withdrawn; a suppressed automatic layer reads "<channel> set by <layer>". |
| match | Not a screen noun; "matching" is the algorithm family, and a group's equivalent is its "counterpart". |

## 15. Design-only words

Used only in the framework (the Design tier): the surface states Blank, Loading, Running, Partial,
Ideal, Error, Not current, Unsupported and Read-only (`state-matrix.md` 2) -- the screen shows
Failed for Error, and the run status Running is a separate screen word -- canvas selection, row
selection, focused, node screen-size boundary, working set, source nodes, floor, derivation
map, forwarding map, list of scopes, frozen graph reference, task flow, journey stage, trust check. Docs-tier words may also appear in
graphty-element's documentation.

The information architecture's own words, each defined here only:

| Term | Definition |
|---|---|
| **place** | Somewhere an analyst can be and return to: a panel, the canvas, the inspector, the dock, a mode. |
| **device** | Something that reaches or edits what lives in a place (a popover, a menu, a dialog, Find, Quick actions); never a home. |
| **home** | The one place where an object or output is read. |
| **starting place** | Where a command begins; a command has several, an object one home. |
| **route** | A way from one place to another thing's home; never a second home. |
| **navigation system** | A family of routes with one job: global, local, contextual or supplemental. |
| **collection** | Anything shown as a list. |
| **organization scheme** | How a collection is ordered: exact (time, name, an order that carries meaning) or ambiguous (by topic). |
| **facet** | A declared property that narrows a collection without regrouping it (element kind, node type, a row's source). Which graph a list covers is its **graph scope**, not a facet. |

## 16. Aliases

Each alias typed into Quick actions or Find finds the preferred word in parentheses and never
appears as a label (`information-architecture.md` 7): vertex, entity (node); link,
relationship, tie (edge); network (graph); collection, subnetwork, saved scope (set); group selection
(Create set); group (Create set); modularity class (community); giant
component, LCC (largest connected component); clustering coefficient (local clustering coefficient,
transitivity, average clustering); route (path); property, field, column (attribute); calculated
field (expression attribute); measure, score (metric); overview, summary (Statistics); lineage,
provenance (Details); accelerator, backend (engine); time slice (time window); grow, first neighbors,
k-hop (Select neighbors); hide, hide nodes (Hide on canvas); unhide (Show on canvas); show only,
keep only, filter to selection (Filter to); exclude, filter out selection (Filter out); dim, fade
(Fade others); circuit (Cycle, Trail); Core depth (k-core); Likely new links
(link prediction); bookmark (saved view); present, share, publish (Export); stale, outdated (Out
of date); retry (Re-run); strength, affinity (weighted degree, similarity); spring
(Fruchterman-Reingold); keep positions, fixed (Preset); tree (BFS); layered finds nothing until a layered layout exists; contract (Merge nodes);
projection (Bipartite projection...); compose (Combine graphs...); community graph (Quotient
graph...); annotation, comment (Add note); metanode (Collapse); difference, XOR (Subtract, Exclude);
diff (Compare with...); brokers, bridging, influence and every retired catalog plain name (the
algorithm it named); template, load style, load recipe (Apply recipe); theme, dark mode (a Look, and
the reader's theme in Preferences); ordered set, sequence (path); neighbour, colour, catalogue
(American spellings); command palette, palette (Quick actions). Typing "search" ranks Find first and Search full graph second.

## Sources

- `conceptual-model.md`; `element-contract.md`; `research/archive/glossary-long-form.md`, which
  holds the evidence behind each choice
- `research/figma.md` (the object table, "Create from a selection"); `research/design-method.md`,
  follow-ups "three vocabulary checks" and "status and scope strings"
- `research/graph-tools.md` 19 and 20; `design/ui/figma/flows.md`
- graphty-element at origin/master 9fc948ee: `src/catalog/types.ts`, `src/catalog/scales.ts`,
  `src/catalog/algorithms.ts`, `src/catalog/layouts.ts`, `src/session/styles/channels.ts`,
  `src/session/runs/types.ts`, `src/session/sets/`
- Open decisions cited (`one-way-doors.md`): 21, The weight role on the attribute
