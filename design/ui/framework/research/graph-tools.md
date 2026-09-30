# How established graph tools model their world

This is a survey of how sixteen graph analysis and visualization tools and libraries structure
the things a user works with: which objects are first class, which are secondary, how groups,
paths, subsets, filter results and algorithm results are represented, how data is mapped to
visuals, how time is handled, and where notes live. It ends with a cross-tool concept matrix
and two lists: concepts where the industry agrees (take them as they are) and concepts where
the tools disagree (a real design choice for graphty). Section 20 then takes thirty-one
decisions that graphty-element will publish (time keys, re-runs, communities, overrides, set
edges and paths, covers, the default scope of "the graph", the home of the run command, saved
views, element identity in the project file, the predicate language, how filters combine, how
kept things are listed, the word for a kept subset, the shape of a path, community identity
across re-runs, what an edge weight means, edge keys across a reload, results after a filter
changes, neighbourhood expansion, where data cleaning happens, how a run reaches a subset, how
many graphs a project holds, collapsed groups, what a saved view is, where positions and the layout
command live, tuning an existing result, which quantities are attributes at rest, what a temporal
result saves, and the scale of an encoding under a filter) and sets the tool evidence beside
what the element does today.

Every claim about a tool is backed by a source listed in that tool's section. Where a claim
comes from working knowledge of the tool rather than a page that was read for this survey, it
is marked "(practitioner knowledge)" so it can be checked before a decision leans on it.

Terms used throughout:

- **First-class object**: something the tool lets a user name, select, inspect, save and act
  on as a unit.
- **Primary object**: the graph material itself (nodes, edges, the network). **Secondary
  object**: something about the graph or about how it is shown (a style, a filter, a saved
  view, an annotation).
- **Mapping**: a rule that turns a data value into a visual value (a colour, a size).
- **Column** and **attribute** are used interchangeably for a named value carried by every
  node or every edge; tools differ on the word, see section 19.

---

## 1. Cytoscape (desktop)

The reference tool of biological network analysis, and the most explicit data model of any
tool surveyed.

**First-class objects.** Networks, nodes, edges; each has a table (node table, edge table,
network table) of typed columns. Networks are organised into **network collections**:
"Network collections in Cytoscape are used to organize related networks, for example
subnetworks. Networks in a collection are linked through the shared name node attribute."
A network can have one or more **views** (the drawn picture of it). A **session** saves
everything. Styles, filters and annotations are named, saved objects.

**Data model.** "All values for a given column must have the same type." Node and edge data
are "independent of networks. Data values for a given node or edge will be applied to all
copies of that node or edge in all loaded network files." Columns can be namespaced with a
double colon ("compartment::cytosol"), which is how apps keep their result columns apart.

**Primary vs secondary.** Primary: network, node, edge, and their tables. Secondary: Style,
filter, annotation, layout. The Control Panel tabs (Network, Style, Select/Filter,
Annotation) put the secondary objects each in its own tab; the Table Panel is the primary
data's home.

**Groups.** Cytoscape has groups with a **metanode**: "When a group is collapsed, all of the
nodes that are part of that group are hidden and the metanode is shown." External edges are
replaced: "new meta-edges are created that connect the external nodes to the metanode."
Attributes aggregate: "Attribute aggregation is a process that collects all the values from
member node and edge attributes and combines them into a single attribute", averaging
numbers and concatenating strings. A group is part of the network, which the manual
contrasts with nested networks: "nodes in a Group are part of the current network, can have
edges to nodes outside of the group, and can be found or filtered", and "Most often, Groups
are more functional and easier to use."

Clustering results reach groups through the clusterMaker2 app (menu **Apps, clusterMaker**).
A run writes a cluster number into a node column whose name is an option: "Cluster Attribute:
Set the node attribute used to record the cluster number for this node. Changing this values
allows multiple clustering runs using the same algorithm to record multiple clustering
assignments." Left at its default, a second run therefore overwrites the first. Optional
outputs turn clusters into objects: "Create metanodes with results ... create a Cytoscape
metanode for each cluster. This allows the user to collapse and expand the clusters", and
"Create new clustered network ... with the edges between clusters removed." Fuzzy clustering
lets "nodes ... be in more than one cluster", with proportional memberships that "may be
visualized as additional membership edges"; hierarchical clustering is shown as a dendrogram
with a heat map (TreeView).

**Paths.** No dedicated path object in the core. A path is a selection, or an app result
(practitioner knowledge).

**Subsets.** Two forms. A **selection** (transient, synced between canvas and table; the
Table Panel can show only selected rows). A **subnetwork**, made by "selecting a set of nodes
in one network and copying these nodes to a new network (via the File, New Network option)",
which becomes a sibling network in the same collection. The File, New Network menu offers the
two edge rules side by side: "From Selected Nodes, All Edges" (the induced subgraph) and "From
Selected Nodes, Selected Edges" (only the edges the user chose), and the Select menu has "Edges
Between Selected Nodes" to turn a node set into its induced edges on demand (menu titles from
the `core-task-impl` source).

**Filters.** A filter is a saved, named object built from column filters, a degree filter
and a topology filter, combined in composite filters with "Match all/any". "Narrowing filters
are applied to all the nodes and edges in the network, and are used to select a subset",
while chainable transformers pass "the output of a transformer" to the next. The result of a
filter is a **selection** by default; it can also hide: "You also have the option to use the
filter to show only the selected nodes by checking the show button." Filters are built in a
GUI, not typed. The one typed language is the search bar, which uses "the standard Lucene
QueryParser with a few modifications": `name:hello`, wildcards, `pvalue:[0.2 TO 0.4]` for an
inclusive range, AND and OR.

**Algorithm results.** Written into the tables. Network Analyzer computes "Number of nodes,
edges and connected components. Network diameter, radius and clustering coefficient, as well
as the characteristic path length" and "Distributions of degrees, neighborhood
connectiveness, average clustering coefficients, shortest path lengths". Node results become
columns: "several additional columns are added to the Node Table (and an EdgeBetweenness
column is added to the Edge Table)". Graph-level results appear in a Results Panel with
charts; any column can be plotted: "Plot Histogram... for a single parameter distribution,
or Plot Scatter... for a bivariate plot", and a chart region selects nodes. The command is
**Tools, Analyze Network**; it analyses the whole current network, and the option to analyse
only selected nodes was removed: "Prior versions of this tool offered the option of analyzing
all nodes or only a selected subset. This is no longer supported directly in the program." The
manual's replacement is to make a subnetwork from the selection and analyse that. Re-running
writes the same column names again (practitioner knowledge; the manual does not say).

**Styling.** A **Style** is a named set of visual property settings for node, edge and
network properties. Three mapping types:
- "Passthrough Mapping: The values of network column data are passed directly through to
  properties" (labels).
- "Discrete Mapping: Discrete column data are mapped to discrete properties" (type to shape).
- "Continuous Mapping: Continuous data are mapped to properties" (numbers to size, colour
  gradients, or to discrete bins).
A **default value** "is used when no mapping is defined for a property". A **bypass**
overrides both default and mapping for chosen elements. Precedence is therefore fixed:
bypass over mapping over default. A property has at most one mapping at a time (one Style
column per visual property).

How a bypass appears in the UI (from the manual and the `vizmap-gui-impl` source): each row of
the Style panel has a Bypass button that is only enabled "for selected node(s)/edge(s)"; its
tooltip reads "To bypass the visual property, first select one or more" nodes, "Bypass:
<value>", or "The selected ... have different bypass values". Right-clicking a node or edge
opens a **Bypass Style** submenu with "Set Bypass to Selected Nodes" and "Remove All from
Selected Nodes" (and the edge and network equivalents). There is **no list of every bypass in
the network**: a bypass is visible only by selecting the elements that carry it. In the API a
bypass is a "locked value" on the view ("This value will be used to bypass the style"), so it
belongs to a view, not to a Style; py4cytoscape describes it as permanently overriding "any
default values or mappings ... To restore defaults and mappings, use
clear_node_property_bypass()".

**Time.** No native temporal model in the core (practitioner knowledge; apps exist).

**Notes.** Annotations (text, shapes, images, bounded text, arrows) are view elements on a
foreground or background layer, not network data: "The middle Network Layer contains nodes,
edges and charts. The Foreground and Background layers contain annotations." They are placed
on the canvas, not attached to a node. Annotations can be grouped.

Sources:
- https://manual.cytoscape.org/en/stable/Styles.html
- https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html
- https://manual.cytoscape.org/en/stable/Creating_Networks.html
- https://manual.cytoscape.org/en/stable/Finding_and_Filtering_Nodes_and_Edges.html
- https://manual.cytoscape.org/en/stable/Network_Analyzer.html
- https://manual.cytoscape.org/en/stable/Nested_Networks.html
- https://manual.cytoscape.org/en/stable/Annotations.html
- https://manual.cytoscape.org/en/stable/Quick_Tour_of_Cytoscape.html
- https://www.rbvi.ucsf.edu/cytoscape/groups/
- https://www.rbvi.ucsf.edu/cytoscape/clusterMaker2/
- https://raw.githubusercontent.com/cytoscape/cytoscape-impl/develop/core-task-impl/src/main/java/org/cytoscape/task/internal/CyActivator.java
- https://github.com/cytoscape/cytoscape-impl/tree/develop/vizmap-gui-impl/src/main/java/org/cytoscape/view/vizmap/gui/internal
  (`view/VizMapperMenuMediator.java`, `view/VisualPropertySheetItem.java`,
  `task/RemoveLockedValuesTask.java`)
- https://raw.githubusercontent.com/cytoscape/cytoscape-api/develop/viewmodel-api/src/main/java/org/cytoscape/view/model/View.java
- https://raw.githubusercontent.com/cytoscape/cytoscape-impl/develop/io-impl/impl/src/main/java/org/cytoscape/io/internal/read/sif/SIFNetworkReader.java
- https://py4cytoscape.readthedocs.io/en/latest/reference/generated/py4cytoscape.style_bypasses.set_node_color_bypass.html

## 2. Cytoscape.js

The JavaScript library that shares Cytoscape's lineage; its API shows the model with nothing
hidden behind UI.

**First-class objects.** Elements, each with a group field: "'nodes' for a node, 'edges' for
an edge". **Compound nodes** are nodes with a `parent` ("indicates the compound node parent
id"); a parent's box is "automatically inferred by the positions and dimensions of the
descendant nodes." **Collections** are immutable sets of elements: "a collection is immutable
by default", and operations return new collections.

**Subsets, filter results, algorithm results, paths.** All the same thing: a collection.
Selectors (`[weight > 50]`, `node:selected`) return collections; graph algorithms return
collections, so a shortest path is a collection of nodes and edges that can be styled,
selected or combined with set operations (the path-as-collection return value is
practitioner knowledge; the page read states only that algorithms return collections).

**Selection.** A state on each element (`selected`, `selectable`) that a selector can test
(`:selected`).

**Styling.** A stylesheet of selector blocks. Precedence is order, not specificity: "For a
given style property for a given element, the last matching selector wins." Mappers:
`data(field)` passes a value through; `mapData(weight, 0, 100, blue, red)` maps a range
linearly. Classes on elements let application code toggle named looks.

Sources:
- https://js.cytoscape.org/
- https://raw.githubusercontent.com/cytoscape/cytoscape.js/master/documentation/md/style.md

## 3. Gephi (desktop)

The reference tool of social network analysis and digital humanities.

**First-class objects.** A **project** ("A Gephi session, which contains all workspaces and
data") holds **workspaces** ("A whole environment for exploring one graph"). Inside a
workspace: nodes (identified by Id), edges (Source, Target), and **attributes** ("Data
associated to a node or an edge. Could be text, numbers, booleans and more"). Three screens:
**Overview** ("network visualization, data filtering and computation of network measures"),
**Data Laboratory** ("network data import, export, inspection and manipulation"), and
**Preview** ("Display the graph exactly as it is exported").

**Primary vs secondary.** Primary: nodes, edges, attributes. Secondary: queries (filters),
appearance settings, layout, statistics reports. There is no saved "view" object other than a
workspace.

**Groups.** Gephi had hierarchical graphs with meta-nodes since 0.7 and removed them: the
0.9.0 release notes say "Remove hierarchical graphs support" and add "Multi-graph support".
Grouping today is a partition column plus colour, or a plugin.

**Paths.** A shortest-path tool highlights a path on the canvas (practitioner knowledge);
no saved path object.

**Subsets and filters.** The Filters panel is a library of filters (attribute, topology,
operators) dragged into a **Queries** tree; queries nest like SQL sub-queries with the last
executed query at the root, and operators (intersection/AND, union/OR, NOT) combine them.
There are two outcomes: **Filter** constrains the visible graph; **Select** marks matching
nodes without hiding others. A filtered graph can be exported to a new workspace to compare
full and filtered versions.

**Algorithm results.** Statistics (Average Degree, Density, Diameter, PageRank, Betweenness,
Modularity and more) write columns and produce a report. Modularity is the canonical
example: "a column called Modularity class has been added to your data. This represents the
cluster ids of your nodes." Graph-level values appear in the Statistics panel and in an HTML
report with distribution charts (practitioner knowledge for the charts).

Three facts from the statistics source code decide a lot:
- **Statistics run on the filtered graph.** Modularity starts with `Graph graph =
  graphModel.getUndirectedGraphVisible();` and Graph Distance (betweenness, closeness,
  diameter) with `getDirectedGraphVisible()` or `getUndirectedGraphVisible()`. With a filter
  active, every statistic describes what the filter left, not the whole workspace.
- **A second run overwrites the first.** Graph Distance reuses its columns (`if
  (!nodeTable.hasColumn(BETWEENNESS)) { nodeTable.addColumn(...) }`); Modularity cleans up and
  re-creates `modularity_class`. The Gephi FAQ's advice to duplicate a column before re-running
  (cited in `design-method.md`) is the workaround users are given.
- **Community ids are arbitrary.** Classes are numbered in the order the algorithm's community
  list happens to hold them, and the dialog's randomize option (practitioner knowledge) makes
  that order change between runs. A tutorial on the Appearance partition list says it plainly:
  "the left number is a random number given to communities. Essentially, this number does not
  say much. However, the right percentage is more important."

The Appearance **partition list** shows one row per class value with its colour and share of
nodes. It is a legend with palette controls: a row cannot be named, and selecting a community
means building a Partition filter on the class column and ticking boxes ("tick the first 20
boxes" to keep the largest communities).

**Styling (Appearance).** "Appearance: The way to change the visual aspect of nodes and
edges." Three modes per visual property (colour, size, label colour, label size):
"Unique: every node/edge gets the same visual property value", "Partition: we set the visual
property value based on some attribute of the node" ("Visual clustering. Give colors to
categories"), and "Ranking: we set the visual property value proportional to some numeric
attribute". Appearance is applied as a one-shot write to each node's stored colour and size;
Gephi Lite's documentation states this directly: "Gephi behaves like Photoshop", storing
static values per node.

**Time.** A first-class dynamic model. Elements, attribute values and edge weights can carry
**intervals** ("nodes exist for a duration between a start and end time") or **timestamps**
("nodes exist at specific discrete points in time"), and "These two time representations
cannot be mixed within the same graph." A **Timeline** at the bottom of Overview drives a
Dynamic Range filter; it can be played, and layout, ranking and filters keep running while it
plays.

**Notes.** None in the graph. Preview is where the final picture is composed.

Sources:
- https://docs.gephi.org/desktop/User_Manual/Glossary/
- https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/
- https://github.com/franktakes/gephi-tutorial
- https://github.com/gephi/gephi/releases/tag/v0.9.0
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/GraphDistance.java
- https://seinecle.github.io/gephi-tutorials/generated-pdf/using-filters-en.pdf
- https://jveerbeek.gitlab.io/gephi/docs/community.html
- Web search summary of Gephi filter usage (Gephi wiki and forum results, not read in full)
  for the Queries-tree wording: https://github.com/gephi/gephi/wiki/How-to-use-filters

## 4. Gephi Lite

The browser rewrite of Gephi on sigma.js and graphology. Its one documented conceptual
change matters more to graphty than any feature.

**Styling as live rules.** "Gephi Lite behaves like Excel" with reactive formulas, where
Gephi "behaves like Photoshop". Because appearance is a rule, Gephi Lite can generate
captions (legends) explaining the visual variables, which Gephi "can't" do because it
"can't 'explain' why nodes and edges are rendered", and when data changes the appearance
updates "instantly".

**Absent.** No timeline ("No temporal graph animation support"), no vector export.

Sources:
- https://docs.gephi.org/lite/user-manual/differences-with-gephi/
- https://docs.gephi.org/lite/user-manual/

## 5. Neo4j Bloom (and Explore in Aura)

The business-user explorer over a Neo4j database.

**First-class objects.** Nodes and **relationships** (Neo4j's word for edges), with labels
and properties. A **Perspective** "defines a certain business view or domain that can be
found in the target Neo4j graph"; it holds "Categorization of business entities", property
and relationship visibility, "Styling (color, icon, caption)" and "Custom Search phrases". A
**category** is a business entity type, usually one database label. A **Scene** is the
canvas and what is on it; it contains only what search or expansion brought in.

**Primary vs secondary.** Primary: nodes, relationships. Secondary: Perspective, Scene, rule,
search phrase. A saved Scene stores "any changes to filters, the graph, the visualization, or
the style", including positions. Scenes inherit Perspective styling: "changes only affect the
current Scene and any new Scenes you create follow the Perspective styling." Scenes save
themselves ("if you switch Scene, the Scene you left is the same when you return to it"); the
separate warning that "Filters are not saved, so when the scene is cleared so is the filter
panel" is about clearing a Scene, not about switching, so the two statements do not conflict.
A Scene holds references, not copies: "Scenes rely on node and relationship IDs in Neo4j.
Changes to this underlying data can cause data in saved Scenes to appear incorrectly."

**Groups.** Visual only: users can "group selected nodes and have them represented as one
visually distinct larger node" or group relationships with a count.

**Paths.** Neo4j's query language is the one surveyed system with a path **type**: "The `PATH`
data type is an alternating sequence of nodes and relationships", listed beside `NODE` and
`RELATIONSHIP` as a structural type. Bloom does not surface it as a saved object. A shortest
path command "searches for shortest paths within 20 hops and shows the first shortest path
found". The path is added to the Scene and selected; it is not a saved
object (practitioner knowledge for "selected").

**Filters.** Filtered elements are dimmed, not removed: "When a filter is applied, all
filtered elements are greyed out in the Scene, they are still visible but you cannot
interact with them." **Dismiss** removes elements from the Scene (not the database); "Dismiss
single nodes" removes isolates. The **Slicer** is a range filter over any numeric or temporal
property with playback; "The Slicer lets you add up to five different ranges".

**Algorithm results.** Graph Data Science runs on the Scene are temporary: "Running Graph
Data Science algorithms on elements in your Scene does not alter the underlying data. The
scores only exist temporarily in Bloom." Runs on the whole graph write a database property.
Results are styled at once by kind: centrality results "can be either size-scaled or color
gradient", community results "offer unique colors". Result property names are generated
(algorithm name plus a number) and "cannot be renamed". Slicer lists GDS values as ordinary
properties. The command lives on a **GDS button in the upper-left corner of the Scene** and runs
on "all elements in the Scene" or on chosen categories and relationship types. Because the
property name "contains the name of the algorithm and a number", a second run lands beside the
first rather than over it (an inference from the naming rule; the page does not say it in
words). Separately, **Scene actions** are Cypher queries run "from the context menu when at
least one element is selected", and **search phrases** are Cypher queries "stored with the rest
of the Perspective definition and run from the Search bar", which accepts "a near-natural
language search query".

**Styling.** Per category default, plus rule-based styling in three modes: **Single** (one
colour, size or caption for elements that meet a condition, with a histogram to pick a
threshold), **Range** ("a range of colors or sizes to a range of values"), **Unique values**
("Assign a unique color to each property value"). Precedence is first-wins, the opposite of
Cytoscape.js: "Rules override the default style setting such that if no rule is satisfied,
the default style is applied", and when rules collide "the rule that appears first in the
list is applied to that attribute", while "subsequent rules may still be applied if they
affect other attributes." Rule matching is per visual channel.

**Time.** Temporal property types are first-class in filters and the Slicer (with timezone
normalisation); there is no element lifetime model.

**Notes.** Not in the Scene; export is PNG, SVG or CSV, and Scenes are shared by link.

Sources:
- https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-overview/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/legend-panel/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-perspectives/bloom-perspectives/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-perspectives/perspective-creation/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/gds-integration/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/slicer/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/export-data/
- https://neo4j.com/docs/cypher-manual/current/values-and-types/property-structural-constructed/

## 6. yEd

A diagram editor with graph analysis; useful as the diagram-tool end of the spectrum.

**First-class objects.** Nodes, edges, and **group nodes**: "A node that contains another
graph structure is called a group node." Groups nest into a hierarchy whose top is the "root
graph", shown in a Structure View.

**Groups.** Open or closed (a closed group is a folder). When open, members "are shown inside
its bounds and are part of the same graph structure as the group node"; edges survive
closing: "The edges connecting the part that has been moved with the rest of the graph won't
get lost, even if group nodes get closed." Groups can be computed: Auto Grouping by
connected components ("there is a path from every member to every other member"),
biconnected components, natural clusters (edge betweenness), sub-trees, chains.

**Algorithm results.** Tools such as Select Elements produce a selection ("the resulting
matches will all be selected"); Centrality Measures show results; Analyze Graph reports in a
window. Grouping tools produce groups.

**Styling.** The **Properties Mapper** maps custom properties to visual properties by
distinct values, ranges, linear scaling, regular expression or template. It is a one-shot
edit: "Applying a configuration is a one-time change of the diagram like adding a node or
changing a label", and it is undoable.

Sources:
- https://yed.yworks.com/support/manual/hierarchy.html
- https://yed.yworks.com/support/manual/auto_grouping.html
- https://yed.yworks.com/support/manual/properties_mapper.html
- https://yed.yworks.com/support/manual/yed_tools.html

## 7. Kumu

Systems and stakeholder mapping; shows how a non-scientist audience names things.

**First-class objects.** "you can use elements, connections, and loops to represent your
system or network. Visually speaking, elements are circles, connections are lines between
the elements, and loops are groups of two or more connections." A **map** holds the data; a
**view** is presentation: "A view is a collection of decorations, filters, and other settings
that change what is visible on your map and how it is styled", and "a view can apply to
multiple maps."

Positions belong to the map, not the view: "a view can apply to multiple maps (a map defines
the elements and connections that should be part of a map, and their positions on the map)".

**Selectors as the one language.** Shorthand (`person`, `#id`, `.tag`), field comparisons
(`["team-members" > 20]`, longhand `["field name" operator "field value"]`, operators `=`,
`*=`, `>`, `<`, `>=`, `<=`), pseudo-selectors (`:orphan`, `:not(...)`, `:from()`, `:to()`) and
traversals (`-->`, `<--`, `<-->`, as in `person --> organization`). "Almost every block of code
in the Advanced Editor contains some sort of selector": decorations, filters, focus and
clustering all use it. End users meet it in three places: typed after `=` in the search bar,
written in the Advanced Editor, and generated by the Basic Editor's filter and decoration
builders. The selector text is what the view stores.

**Metrics.** Run from "the Metrics icon in the bottom right corner of the map". Computed on
what is showing: "Metrics will not be calculated for elements that are filtered out of the
map." Stored as fields named after the metric, and "Each time you run the metric the previous
values are overwritten"; the documented way to keep an earlier run is to rename its field
first ("2014 betweenness"). **Community detection** uses SLPA, which "can detect overlapping
communities". Results appear in a table "ordered by community size", each member listed with
its "strength of association to that community"; users "rename communities to descriptive
names"; saving stores only "the best match for each element to the 'Community' field". A
re-run by default **uses the existing communities to seed the algorithm**, keeping them stable,
and the user can instead "throw away the current communities" to start from scratch.

**Groups.** **Clustering** creates generated elements for each value of a field and connects
members to them; they vanish when clustering is off and the data is unchanged.

**Subsets.** **Focus** hides everything beyond N degrees of the selected root ("out 2");
**filter** hides by selector.

**Styling.** **Decorations**, either direct (per item) or data-driven from field values.
Precedence among decoration rules is not stated in the pages read.

**Notes.** A long-form **Description** field on every item ("Descriptions can include
multiple paragraphs, and even images and videos") and threaded **comments** attached to a
selected item. **Presentations** are slide decks whose map slides capture a view with its
focus and filters.

Sources:
- https://docs.kumu.io/guides/views.md
- https://docs.kumu.io/guides/selectors.md
- https://docs.kumu.io/guides/decorate.md
- https://docs.kumu.io/guides/clustering.md
- https://docs.kumu.io/guides/focus.md
- https://docs.kumu.io/guides/presentations.md
- https://docs.kumu.io/llms-full.txt
- https://docs.kumu.io/guides/metrics.md

## 8. Graphistry

GPU-rendered investigation of large event graphs.

**First-class objects.** Two dataframes, edges and nodes, bound by column: `bind(source,
destination, node)`. The API says **point** where others say node (`point_color`,
`encode_point_size`).

**Subsets.** **Filters** keep matching elements and **exclusions** remove them: "Exclusions
work very similarly to filters, except they specify elements of the graph to remove." Both
use an SQL-like expression (`point:degree < 10`). A selection box can become a filter
("Filter this object") or an exclusion. "Hide Standalone Nodes" removes isolates after
filtering.

**Styling.** Encodings per channel, categorical or continuous (`as_continuous=True`), for
colour, size, icon and badge, on points and edges. Algorithm results (PageRank, communities)
arrive as columns and are encoded like any column.

Sources:
- https://hub.graphistry.com/docs/ui/basics/
- https://pygraphistry.readthedocs.io/en/latest/visualization/10min.html

## 9. Tulip

A research framework built around a subgraph hierarchy; the cleanest statement of "a subset
is a subgraph".

**First-class objects.** Graph, nodes, edges, **properties** (typed columns), and the
**subgraph hierarchy**: "A subgraph is simply a coherent subset of the graph elements: some
nodes of the graph, and some edges between them", and "the edge of a subgraph must already be
present in the graph just above it". Every clustering, filter result or selection can be
kept as a subgraph.

**Groups.** A **meta-node** "is always associated to exactly one subgraph" and meta-nodes
nest. Grouping from the root creates a meta-graph named "groups" and one subgraph per group.

**Algorithm results.** Stored as properties. Properties are **inherited** down the hierarchy
unless a subgraph defines its own: "If you use a measure algorithm on a subgraph, new local
properties are created. Those properties are not applied to the root graph."

**Styling.** Visual encodings are themselves properties named `viewColor`, `viewSize`,
`viewLabel`, `viewLayout`; selection is a boolean property (practitioner knowledge for the
selection property). Styling is therefore "write a property", like Gephi.

Sources:
- https://tulip.labri.fr/Documentation/current/tulip-user/html/functions.html
- Web search summary of the Tulip 3 framework paper, for the Shneiderman framing:
  https://www.labri.fr/perso/auber/download/Tulip2010.pdf

## 10. NodeXL

An Excel template; shows the "graph as spreadsheets" model at its purest.

**First-class objects.** Four worksheets: **Edges** (Vertex 1, Vertex 2, plus visual
columns), **Vertices**, **Groups**, and **Overall Metrics**. Visual properties are ordinary
columns (Color, Width, Opacity), so users can "quickly edit existing node properties and to
generate new ones, for instance by applying Excel formulas to existing columns."

**Algorithm results and graph summary.** A metrics library ("centrality, clustering
coefficient, and diameter") writes vertex columns; graph-wide numbers go to the Overall
Metrics sheet. The existence of a dedicated whole-graph sheet is the relevant fact.

**Styling.** **Autofill Columns** fills visual columns from another column; NodeXL "enables
users to map the visual properties of nodes and edges to metrics it calculates, and in
general to any column".

**Groups.** A Groups sheet; groups come from clustering or attributes (search result
summary).

Sources:
- https://en.wikipedia.org/wiki/NodeXL
- Web search summaries of NodeXL worksheet structure and Autofill Columns (library guide
  https://lib.manhattan.edu/c.php?g=728252&p=5751031 and ScienceDirect topic pages)

## 11. Linkurious Enterprise and Ogma

Linkurious Enterprise is an investigation app for analysts over a graph database; Ogma is
the JavaScript library it is built on.

**First-class objects (Enterprise).** Nodes (with **categories**), edges (with **types**),
properties; a **visualization** is the saved working picture and stores "the layout,
filters, styles, comments, layouts and publications" but not the data; **Spaces** are
"containers of visualizations shared with user groups".

**Groups.** Rule-based: "Nodes can be grouped by one property value", "node groups appear as
collapsed", a badge shows the count ("x4"), and "All grouped nodes remain accessible".
"only one grouping rule" is active per visualization. **Edge grouping** merges parallel edges
of one type and aggregates numeric properties by Sum, Average, Minimum or Maximum.

**Paths.** Shortest path between two selected nodes, returning up to a maximum count of
paths into the visualization.

**Filters.** Two outcomes, **hide** or **grey**, by category or property. Filters are built
in the UI; there is no typed filter language ("All 'hidden' nodes are displayed in light grey").
Date properties are filtered only through the **Timeline**, which reads "Date or Datetime"
properties (points in time) and can show "one or multiple properties at once".

**Identity.** A visualization stores references, not data: "only the node and edge identifier
are persisted ... If you need to re-generate your graph database from scratch, the graph
database will probably generate new identifiers for all nodes and edges, breaking all
references." The fix is configuration: `alternativeNodeId` and `alternativeEdgeId` name a
property that serves as the stable key. Switching it without migration "will cause all
existing visualizations and alert cases to become either empty or filled with the wrong nodes
and edges."

**Running analysis.** Queries (Cypher or Gremlin templates written by an administrator) run
from a `{}` button on the right toolbar or from the node itself: "Right-click on a node, select
Queries ... The context menu displays available queries", and with a node selected "suggested
queries will be displayed". Results are added to the visualization, with "all mutual edges
between the nodes in the result" added automatically.

**Styling.** A Design panel; each category has a default colour; "Default styles may be
defined by an Administrator ... Users can then change these styles"; nodes without a
matching value "retain their category color".

**Notes.** **Comments** on a visualization; text and arrow **annotations** exist only in the
image-export step ("When exporting a visualization as an image, users can reposition nodes,
add annotations (text and arrows)").

**Undo.** Undo/redo is a listed manual chapter for visualization edits.

**Ogma styling model.** Three mechanisms with a documented order: "1. Original attributes,
2. Rules (earliest-added to latest-added), 3. Individual attributes from setAttributes(),
4. Custom classes, 5. Built-in classes (selection/hover)". "every time a rule is added, it is
added at the end of the array", so later rules win. "Rules are automatically re-applied
whenever there is a relevant change in the graph." Groups are **transformations** that create
**virtual nodes**: "grouping a set of nodes based on their properties creates a unique node
that represents the aggregation of those nodes", and transformations form a pipeline.

Sources:
- https://doc.linkurious.com/user-manual/latest/
- https://doc.linkurious.com/user-manual/latest/page.html
- https://doc.linkurious.com/user-manual/latest/nodegrouping/
- https://doc.linkurious.com/user-manual/latest/design/
- Search summaries of https://doc.linkurious.com/user-manual/latest/edgegrouping/ and
  https://doc.linkurious.com/user-manual/latest/visualization-export/
- https://doc.linkurious.com/admin-manual/latest/alternative-ids/
- https://doc.linkurious.com/user-manual/latest/running-queries/
- https://doc.linkurious.com/user-manual/latest/filter-panel/
- https://doc.linkurious.com/user-manual/latest/timeline/
- https://doc.linkurious.com/ogma/latest/tutorials/styling/
- https://doc.linkurious.com/ogma/latest/tutorials/grouping/

## 12. KeyLines and ReGraph (Cambridge Intelligence)

Commercial toolkits for investigation apps; they named the **combo**.

**Groups (combos).** "To reduce clutter, you can combine multiple nodes into a single
combined node." A combo is **closed** (one node with a count glyph) or **open** (members
visible inside a border, with an internal arrangement: concentric, lens, grid, sequential).
"Links are combined too": **combo links** summarise member edges; `reveal()` shows an
underlying link. Combos nest. Combos differ from hiding: "hidden nodes remain hidden even
when combined", and combining restructures the chart's parent-child hierarchy rather than
removing items. A combo is created either by combining chosen nodes or by a `parentId` in the
data.

**Time.** The **time bar**: items carry `dt` (a time or a start/end period) and optional
values. The API types `dt` as a number, a `Date`, a `TimePeriod` with `dt1` and `dt2`, or an
array of any of these, so one chart (and, by the type, one item) can hold instants and periods
together; a period contains a time when "dt1 <= dt < dt2", half-open like graphty-element's
window. The pages do not discuss mixing in words; the bar is a histogram of activity with selection trend lines, and it filters the
chart to "show only items in the new range", with playback. Filtering runs both ways: chart
selection shows when items were active; a time range shows which items were involved.

Sources:
- https://developers.cambridge-intelligence.com/docs/keylines/combos
- https://developers.cambridge-intelligence.com/api/keylines/combos
- https://developers.cambridge-intelligence.com/docs/keylines/time-bar
- https://developers.cambridge-intelligence.com/api/keylines/time-bar

## 13. sigma.js and graphology

graphology is the JavaScript graph data structure; sigma.js renders it. Gephi Lite is built
on both.

**Model.** "A graphology graph can therefore be directed, undirected or mixed, allow
self-loops or not, and can be simple or support parallel edges." Three attribute levels:
graph, node, edge. `order` is the node count, `size` the edge count.

**Styling.** Rendering reads node and edge attributes (`x`, `y`, `size`, `color`, `label`,
`hidden`, `zIndex`). Display state (highlight, dimming) is done with `nodeReducer` and
`edgeReducer` functions that "dynamically transform node and edge attributes right before
rendering" without "modifying the underlying graphology instance". That is the library form
of "data and appearance are separate, appearance is a function of data plus state".

Sources:
- https://graphology.github.io/
- https://www.sigmajs.org/docs/advanced/data/

## 14. NetworkX

The Python standard for network science; its vocabulary is what most analysts think in.

**Model.** `Graph` ("undirected graph ... does allow self-loop edges"), `DiGraph`,
`MultiGraph` ("allows multiple undirected edges between pairs of nodes"), `MultiDiGraph`.
Nodes, edges, node/edge/graph attributes; the edge weight is conventionally `weight`.

**Views and subsets.** "The views refer to the graph data structure so changes to the graph
are reflected in the views." A subset is a **subgraph**: `subgraph` ("Returns the subgraph
induced on nodes in nbunch"), `edge_subgraph` ("the subgraph induced by the specified
edges"), `restricted_view` ("a view of G with hidden nodes and edges"). Node-induced and
edge-induced subgraphs are distinct concepts with distinct names.

**Algorithm results.** Per-node results are dicts keyed by node, stored back with
`set_node_attributes`. Community results are a **partition**: "A partition of a universe set
is a family of pairwise disjoint sets whose union is the entire universe set", given as a
"list or iterable of sets of nodes"; overlapping results are a **cover** (`is_cover`), produced
for example by `k_clique_communities`, whose communities overlap by construction and which
"Yields sets of nodes, one for each k-clique community", and scored by
`overlapping_modularity` ("Shen et al.'s extended modularity for an overlapping cover").
Hierarchies are sequences of partitions: `girvan_newman` returns an "Iterator over tuples of
sets of nodes ... each tuple is a sequence of communities at a particular level", and
`louvain_partitions` and `leiden_partitions` "Yield partitions for each level". Paths are node
lists; a family of paths is a generator of node lists (`shortest_simple_paths`: "A generator
that produces lists of simple paths, in order from shortest to longest").

**Whole-graph summary.** First-class functions: `number_of_nodes`, `number_of_edges`,
`density`, `degree_histogram` ("Returns a list of the frequency of each degree value"),
`is_directed`.

Sources:
- https://networkx.org/documentation/stable/reference/introduction.html
- https://networkx.org/documentation/stable/reference/functions.html
- https://networkx.org/documentation/stable/reference/algorithms/community.html
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.community_utils.is_partition.html
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.kclique.k_clique_communities.html
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.centrality.girvan_newman.html
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.simple_paths.shortest_simple_paths.html

## 15. igraph

The C/R/Python library used in most published network analyses.

**Model.** `Graph`, vertices (`g.vs`, a VertexSeq) and edges (`g.es`, an EdgeSeq), numbered
from zero; "every Graph, vertex and edge can be used as a Python dictionary to store and
retrieve these attributes." `select()` filters vertices or edges by attribute or structure
(`_gt`, `_in`) and returns a sequence, the igraph form of a set.

**Algorithm results.** Community detection returns an object, not a column: a
**VertexClustering** is "The clustering of the vertex set of a graph" with a `membership`
vector, a `modularity` score, `subgraphs()` and `cluster_graph()` ("a graph where each
cluster is contracted into a single vertex"). A **VertexCover** holds overlapping clusters;
a **VertexDendrogram** holds a hierarchy. The result object knows its own quality score and
can produce the contracted graph, which is the metanode idea expressed as analysis.
`community_multilevel` (Louvain) returns levels on request: "if `return_levels` is `True`, the
communities at each level are returned in a list. If `False`, only the community structure
with the best modularity is returned." `community_edge_betweenness` (Girvan-Newman) returns "a
`VertexDendrogram` object, initally cut at the maximum modularity or at the desired number of
clusters". Two clusterings are compared by a score, `compare_communities` with variation of
information, normalised mutual information, split-join distance or (adjusted) Rand index, not
by matching cluster to cluster (practitioner knowledge; the page read does not list it).
`induced_subgraph` "Returns a subgraph spanned by the given vertices" and `subgraph_edges` "a
subgraph spanned by the given edges", the same two rules as NetworkX. `get_k_shortest_paths`
and `get_all_shortest_paths` return lists of paths, each a vertex list (or an edge list with
`output="epath"`, practitioner knowledge for the option name).

Sources:
- https://python.igraph.org/en/stable/tutorial.html
- https://python.igraph.org/en/stable/api/igraph.Graph.html
- https://raw.githubusercontent.com/igraph/python-igraph/main/src/igraph/community.py
- https://python.igraph.org/en/stable/api/igraph.VertexClustering.html

---

## 16. Cross-tool concept matrix

Legend: "col" = stored as a node or edge column/attribute; "sel" = becomes the selection;
"coll" = a set/collection object; "view" = a view-layer thing, not data; "-" = not present;
"1-shot" = mapping writes values once; "live" = mapping is a rule re-evaluated on change.

```
Tool            | Edge word    | Group model              | Path          | Subset / filter result       | Algo result        | Style mapping         | Precedence      | Time               | Notes
----------------+--------------+--------------------------+---------------+------------------------------+--------------------+-----------------------+-----------------+--------------------+------------------------
Cytoscape       | edge         | group + metanode (data), | sel / app     | sel; hide; subnetwork        | col + results panel| live Style: passthru, | bypass>map>     | - (apps)           | canvas annotations
                |              | meta-edges, aggregation  |               |                              |                    | discrete, continuous  | default         |                    | (fg/bg layer)
Cytoscape.js    | edge         | compound node (parent)   | coll          | coll (selector)              | coll / data        | live stylesheet,      | last wins       | -                  | -
                |              |                          |               |                              |                    | data(), mapData()     |                 |                    |
Gephi           | edge         | removed in 0.9           | highlight     | query tree: filter or select;| col + report       | 1-shot: unique,       | last applied    | intervals or       | - (Preview only)
                |              |                          |               | export to workspace          |                    | partition, ranking    |                 | timestamps; timeline|
Gephi Lite      | edge         | -                        | -             | filter chain                 | col                | live rules, captions  | rule per channel| -                  | -
Neo4j Bloom     | relationship | visual group             | added to scene| grey; dismiss; slicer        | temp scene prop or | live rules: single,   | FIRST wins      | temporal props,    | - (scene sharing)
                |              |                          |               |                              | DB prop            | range, unique         | per channel     | slicer playback    |
yEd             | edge         | group node open/closed,  | sel           | sel                          | sel / groups       | 1-shot mapper         | last applied    | -                  | diagram labels
                |              | nested, auto-grouping    |               |                              |                    | (undoable)            |                 |                    |
Kumu            | connection   | clustering (generated)   | -             | filter, focus (N degrees)    | field              | decorations by field  | not documented  | tagged timeline    | description field,
                |              |                          |               |                              |                    |                       |                 | control            | comments, slides
Graphistry      | edge         | -                        | -             | filter / exclusion (SQL-ish) | col                | encodings cat/cont    | per channel     | -                  | -
Tulip           | edge         | meta-node = subgraph     | sel           | subgraph in hierarchy        | property (local or | view* properties      | property value  | -                  | -
                |              |                          |               |                              | inherited)         | (1-shot)              |                 |                    |
NodeXL          | edge         | Groups sheet             | -             | dynamic filters              | col + Overall      | autofill columns      | column value    | -                  | -
                |              |                          |               |                              | Metrics sheet      | (1-shot)              |                 |                    |
Linkurious      | edge         | grouping rule by prop,   | added to viz  | hide or grey                 | (queries, alerts)  | category default +    | per category    | timeline           | comments; annotations
                |              | edge grouping + aggreg.  |               |                              |                    | by property           |                 |                    | at export only
Ogma            | edge         | transformation, virtual  | coll          | NodeList / EdgeList          | data               | live rules + classes  | last wins; then | -                  | -
                |              | nodes                    |               |                              |                    |                       | classes, state  |                    |
KeyLines/ReGraph| link         | combo open/closed,       | coll          | hide / filter                | data               | item props            | -               | time bar histogram,| -
                |              | combo links, nested      |               |                              |                    |                       |                 | playback           |
graphology/sigma| edge         | -                        | -             | reducers (display state)     | attr               | attrs + reducers      | reducer order   | -                  | -
NetworkX        | edge         | (partition = list of     | node list     | subgraph / edge_subgraph /   | dict -> attr;      | (matplotlib kwargs)   | -               | -                  | -
                |              | sets)                    |               | restricted_view              | partition, cover   |                       |                 |                    |
igraph          | edge         | VertexClustering,        | vertex list   | VertexSeq.select()           | attr; clustering   | vertex_color etc.     | -               | -                  | -
                |              | cluster_graph()          |               |                              | object w/ modularity|                      |                 |                    |
```

Cells for Gephi and yEd precedence ("last applied") follow from their one-shot model: a later
apply overwrites the stored value. Kumu's tagged-timeline control is named in its sitemap and
was not read in detail.

---

## 17. Where the industry agrees: take these as they are

1. **Node and edge are the material, and they are the primary objects.** Every tool treats
   nodes and edges (and the network as their container) as the data, and treats styles,
   filters, views, scenes and annotations as secondary things about the data. No tool puts a
   note or a view on the same footing as a node.
2. **Data lives in typed columns on nodes, edges and the graph.** Cytoscape's three tables,
   Gephi's Data Laboratory, NodeXL's sheets, graphology's three attribute levels, NetworkX's
   node/edge/graph attributes. One type per column (Cytoscape: "All values for a given column
   must have the same type").
3. **A per-element algorithm result is a column.** Degree, PageRank, betweenness, modularity
   class all land as a node (or edge) column that every other feature can then use: Cytoscape
   Network Analyzer, Gephi statistics, NodeXL metrics, Graphistry, Tulip, Bloom (as a
   property), NetworkX `set_node_attributes`. The column is how a result reaches styling,
   filtering and the table.
4. **Whole-graph statistics are their own surface.** Node count, edge count, connected
   components, density, diameter, clustering coefficient and the degree distribution appear
   together: Cytoscape's Network Analyzer and Results Panel, NodeXL's Overall Metrics sheet,
   Gephi's Statistics panel, NetworkX's graph functions. This is the "understand the overall
   graph" task, and every tool gives it a home separate from per-node values.
5. **Three kinds of data-to-visual mapping.** Pass the value through (Cytoscape passthrough,
   `data()`), map categories to distinct values (Cytoscape discrete, Gephi partition, Bloom
   unique values, Graphistry categorical), map a numeric range to a visual range (Cytoscape
   continuous, Gephi ranking, Bloom range, `mapData`, Graphistry continuous). Plus a default
   when no mapping applies. The names differ; the three kinds do not.
6. **Mapping is per visual channel.** Colour, size, label, shape, opacity, width are separate
   channels, each with its own mapping (Cytoscape one mapping per property, Gephi per-channel
   buttons, Bloom "subsequent rules may still be applied if they affect other attributes").
7. **Selection is a transient state, not an object.** Every tool has one current selection,
   synced across canvas and table (Cytoscape Table Panel "only selected" mode, Bloom, KeyLines
   time bar). Saving a subset means turning the selection into something else (a subnetwork,
   a subgraph, a group, a filter).
8. **Filtering and selecting are different outcomes of the same query.** Gephi has Filter and
   Select buttons on one query; Cytoscape filters select by default and optionally hide;
   Graphistry turns a selection into a filter or exclusion. A query (predicate) is one thing;
   what to do with its matches (select, hide, dim, style) is a second choice.
9. **Groups collapse and expand, and collapsing summarises edges.** Cytoscape metanode and
   meta-edges, yEd open/closed group nodes, KeyLines open/closed combos with combo links,
   Linkurious collapsed groups with a count badge, Tulip meta-nodes, igraph `cluster_graph()`.
   A collapsed group shows a member count; its edges to the outside are merged; numeric
   attributes aggregate (Cytoscape, Linkurious edge grouping: sum, average, min, max).
10. **Neighbourhood by degree of separation.** Cytoscape first neighbours, Bloom expand,
    Kumu focus "out 2", Graphistry multi-hop expander. The analyst's term is ego network or
    N-hop neighbourhood.
11. **Communities are a partition.** NetworkX defines it formally (pairwise disjoint sets whose
    union is all nodes); Gephi stores it as a class column; igraph as a membership vector.
    Overlapping results are a cover. A community is a group of the partition, and the
    partition has a quality score (modularity) that belongs to the result, not to any node.
12. **Time is attached to elements, and a time window filters them.** Gephi intervals or
    timestamps on nodes, edges and attribute values; KeyLines `dt` per item; Bloom temporal
    properties. The window is a range filter with playback (Gephi Timeline, KeyLines time
    bar, Bloom Slicer). Time is not a separate kind of object.
13. **Annotations are view-layer, not data.** Cytoscape annotations sit on foreground and
    background layers; Linkurious draws text and arrows only at export; Gephi composes in
    Preview. Nothing in the graph's data changes when a note is added.
14. **A view or scene is a saved presentation of the data, separate from the data.** Kumu
    views ("a view can apply to multiple maps"), Bloom Scenes, Linkurious visualizations
    ("the layout, filters, styles, comments"), Cytoscape network views. The view holds
    styling, filters and camera; the data does not change when a view does. Positions are
    the exception the tools split on: Bloom Scenes, Linkurious visualizations and Cytoscape
    views hold them per view, while Kumu keeps them on the map ("a map defines the elements
    and connections ... and their positions on the map"). See section 20.9.

## 18. Where the tools disagree: real design choices

1. **Is styling a live rule or a one-shot write?**
   - One-shot: Gephi, yEd ("a one-time change of the diagram"), Tulip, NodeXL.
   - Live rule: Cytoscape Style, Cytoscape.js, Gephi Lite, Bloom, Ogma ("automatically
     re-applied whenever there is a relevant change").
   - The deciding argument is Gephi Lite's: only live rules can explain themselves (legend
     captions) and update when data changes. graphty's style layers are live rules; the
     choice is already on the side the newer tools moved to.
2. **Which rule wins when two match the same channel?**
   - Last wins: Cytoscape.js ("the last matching selector wins"), Ogma (rules in add order,
     then per-element attributes, then classes, then selection/hover state).
   - First wins: Bloom ("the rule that appears first in the list is applied").
   - Fixed tiers: Cytoscape (bypass over mapping over default).
   - Both orders are in use, so the ordering must be visible to the reader. Figma's layer
     list draws the top row on top; a list read top-to-bottom where the top wins matches
     both Figma and Bloom's reading, while the underlying stack is last-wins like
     Cytoscape.js. Ogma's extra tier (selection and hover always above rules) is the one
     place where every tool agrees in practice: interaction state is drawn above data
     styling.
3. **Is a group part of the data or a view transformation?**
   - Data: Cytoscape groups ("part of the current network"), yEd group nodes, Tulip
     meta-node = subgraph, KeyLines combos from `parentId`.
   - View transformation: Kumu clustering (generated, vanishes when off), Linkurious grouping
     rules, Ogma virtual nodes, Bloom visual groups.
   - Gone: Gephi removed hierarchical graphs in 0.9.
   - A group made by hand from chosen nodes and a grouping made by rule from a column or a
     community result are two different things in the tools that do both well (KeyLines
     `combine()` vs `parentId`; Linkurious rule vs selection). The design should keep them
     distinct: a partition result is data (a column), its collapsed display is a view choice.
4. **Is a saved subset a separate network or a set inside one graph?**
   - Separate network: Cytoscape subnetwork (sibling in a collection), Gephi export to new
     workspace, Tulip subgraph (inside a hierarchy, with inherited properties).
   - A set inside one graph: Cytoscape.js collections, igraph VertexSeq, Ogma NodeList, Kumu
     selectors, a Cytoscape saved filter.
   - The Tulip model (a subset is a subgraph whose results can be local) is the most
     rigorous; the collection model is the lightest. The owner's decision that sets share one
     vocabulary across the session contract lands on the collection side, with scope standing
     in for Tulip's "run on a subgraph".
5. **What does a filter do to non-matches: hide, dim or remove?**
   - Hide: Gephi Filter, Cytoscape "show", Kumu, Graphistry exclusions, KeyLines time bar.
   - Dim: Bloom ("greyed out ... you cannot interact with them"), Linkurious "grey" option.
   - Remove from the working set: Bloom dismiss, Gephi export to workspace.
   - Linkurious offers hide and grey as a choice on one filter, which is the most complete
     answer.
6. **Where does an algorithm result live, and does it persist?**
   - Always written to the data: Gephi, Cytoscape, NodeXL, Tulip.
   - Temporary unless run on the whole graph: Bloom ("The scores only exist temporarily").
   - As a result object that knows its own quality score and can be turned into a graph:
     igraph VertexClustering.
   - graphty's analysis tree is closest to igraph: a result is an object (with run
     parameters, a graph-level score and a per-element column), not just a column. The
     column part should behave like everyone's column; the object part is graphty's own.
   - On a second run with new parameters, the column-first tools overwrite by default
     (Gephi, Kumu, clusterMaker2 at its default name) and tell users to rename or duplicate
     the column first; only Bloom lands each run beside the last. Section 20.2.
7. **Is a path an object?**
   - No end-user tool surveyed has a saved, named path object. The one system with a path
     **type** is Neo4j's query language (`PATH`, "an alternating sequence of nodes and
     relationships"), which Bloom and Linkurious consume but never show as a kept object.
     Families of paths (k shortest, all shortest) are always a plain list of paths
     (NetworkX, igraph, Linkurious, up to a maximum count of paths); see section 20.5.
   - A single path is a collection (Cytoscape.js, Ogma), a node list (NetworkX, igraph), a selection (Cytoscape, yEd), or elements added to
     a scene (Bloom, Linkurious). A path highlight that persists as a named, stackable edge
     style is graphty's own choice (already decided by the owner); there is no industry
     precedent to copy for its naming or its tree row, so it must be designed.
8. **What is a note?**
   - Canvas annotation on a view layer: Cytoscape.
   - Long-form text field on an element: Kumu Description.
   - Threaded comments on an item or a visualization: Kumu, Linkurious.
   - Only at export: Linkurious annotations, Gephi Preview.
   - Slides that capture a view: Kumu presentations.
   - The tools split notes into two different things: a note **about an element** (Kumu
     description, comments on an item) and a note **on the picture** (Cytoscape annotations,
     export arrows). Both are secondary; neither is a graph object.
9. **Interval or timestamp time model?** Gephi supports both and forbids mixing them in one
   graph; KeyLines accepts either per item, and its type admits both in one array. Bloom and
   Linkurious have no lifetime model, only date properties to filter on. Pajek files carry
   intervals only, writing an instant as a one-point interval. Section 20.1 has the detail and
   what graphty-element can express today.
10. **The word for an edge.** "edge" in Cytoscape, Gephi, yEd, Graphistry, Tulip, NodeXL,
    Linkurious, Ogma, graphology, NetworkX, igraph; "relationship" in Neo4j; "link" in
    KeyLines; "connection" in Kumu. See section 19.
11. **Style scope: per category or global.** Bloom and Linkurious start from a per-category
    (label/type) default and add rules; Cytoscape and Gephi start from one global default.
    Graphs without a node-type column (most analyst datasets) favour the global default;
    typed property graphs favour the category default.

## 19. Terminology: consensus words and the conflicts

| Concept | Word with consensus | Also seen | Recommendation and reason |
|---|---|---|---|
| vertex | **node** | vertex (igraph, NodeXL), point (Graphistry API), element (Kumu) | node: used by every UI surveyed |
| link | **edge** | relationship (Neo4j), link (KeyLines), connection (Kumu) | edge: every tool surveyed except Neo4j, KeyLines and Kumu, and all the analysis libraries |
| per-element value | **attribute** (Gephi, NetworkX, graphology, igraph) / **column** (Cytoscape, Graphistry) | property (Neo4j, Tulip, Linkurious), field (Kumu) | attribute for the value; "column" is fine in the table |
| edges per node | **degree**, in-degree, out-degree | connections (Kumu) | degree |
| connected subgraph | **connected component** | (none) | component; yEd auto-groups by it |
| community result | **community**, **partition** (all), **cover** (overlapping) | modularity class (Gephi), cluster (igraph) | community for a member group, partition for the whole result |
| collapsed group node | **group** (Cytoscape, yEd, Linkurious) | metanode (Cytoscape internals), meta-node (Tulip), combo (KeyLines), virtual node (Ogma) | not an object in graphty: a set or a community shown "collapsed" (section 20.25); "group" is not used as a UI noun because graphty-element already publishes `group` as the community field |
| edges merged into a collapsed group | **meta-edge** (Cytoscape) | combo link (KeyLines), grouped edge (Linkurious) | meta-edge where a term is needed |
| subset of elements | **subgraph** (NetworkX, Tulip), **collection** (Cytoscape.js) | selection, set (Cytoscape setsApp, Tableau), group, NodeList | subgraph for a computed, induced subset analysts would recognise; **set** for a kept, named subset a user defines, because every graph word for that collides (section 20.15) |
| node-induced vs edge-induced | **induced subgraph**, **edge subgraph** (NetworkX) | - | keep the distinction; it is the answer to "which edges does a node set carry" |
| N-hop surroundings | **neighbourhood**, **ego network**, first neighbours | focus (Kumu), expand (Bloom) | neighbourhood |
| numeric-to-visual mapping | continuous (Cytoscape), ranking (Gephi), range (Bloom) | scale, gradient | no consensus word; continuous is the most exact |
| category-to-visual mapping | discrete (Cytoscape), partition (Gephi), unique values (Bloom), categorical (Graphistry) | categorize | no consensus word; categorical is the plainest |
| value shown as-is | passthrough (Cytoscape) | data() | only Cytoscape names it |
| style override for chosen elements | bypass (Cytoscape) | setAttributes (Ogma), direct decoration (Kumu) | no consensus word |
| saved presentation | view (Cytoscape, Kumu), scene (Bloom), visualization (Linkurious), workspace (Gephi) | perspective (Bloom, different meaning) | view |
| predicate over elements | filter, query (Gephi), selector (Cytoscape.js, Kumu) | rule | filter for the user; selector is an implementation word |
| whole-graph numbers | statistics (Gephi), network analyzer / simple metrics (Cytoscape), overall metrics (NodeXL) | summary | statistics |
| the file | session (Cytoscape), project (Gephi) | map (Kumu) | project |

Words to avoid because a major tool already uses them for something else: **perspective**
(Bloom: a business schema), **workspace** (Gephi: one graph's whole environment, which is
closer to graphty's project than to a panel), **scene** (Bloom's canvas contents, and the
Babylon.js word for the render scene inside graphty-element), **collection** (Cytoscape
desktop: a group of networks; Cytoscape.js: a set of elements).

## 20. Evidence on open decisions

Each subsection answers one question that a published contract of graphty-element depends on:
a data config key, a field of the project file, an id kind, or a default. Each gives the tool
evidence, what graphty-element does today (read from its source), and a recommendation. Tool
facts carry their sources in the tool sections above; graphty paths are given inline.

### 20.1 Time: instants, intervals, or both

**What the formats encode.** graph-io reads every format below; its readers show what each
format can carry (`graph-io/src/common/temporal.ts`, `graph-io/src/formats/gexf/importer.ts`,
`graph-io/src/formats/pajek/syntax.ts`).

| Format | Element lifetime | Time-varying attribute values |
|---|---|---|
| GEXF 1.1 to 1.3 | both: `start` and `end` (an interval), `timestamp` (an instant), `<spells>` (several intervals), and in 1.3 the `timestamps` and `intervals` lists. The graph header declares `timerepresentation` (interval or timestamp) and `timeformat` (integer, double, date, dateTime) | yes: repeated `attvalue` entries with their own bounds |
| Pajek | intervals only, `[1-5,7-*]`; an instant is written `[3]` and read as the interval from 3 to 3; `*` is an open end | no |
| GraphML, GML, DOT, CSV, JSON | none in the format; a date is an ordinary typed column | no |
| Neo4j | none; `date`, `dateTime` and the other temporal types are property types, stored by graph-io as epoch milliseconds | no |

graph-io keeps whatever a GEXF file holds, one column per lifetime form (`start`, `end`,
`timestamp`, `spells`, `timestamps`) plus temporal tables for time-varying values, and it does
not reject a file that uses both forms. The rule against mixing is Gephi's, not the format's
reader: "These two time representations cannot be mixed within the same graph". The GEXF site
says only that GEXF "supports timestamps instead of intervals".

**Does any tool allow both in one graph?** KeyLines: `dt` is a number, a Date, a period with
`dt1` and `dt2`, or an array of any of these, so instants and periods can sit in one chart and,
by the type, on one item. Pajek reaches the same place differently, by treating an instant as a
zero-length interval. Bloom and Linkurious have no lifetimes at all, only date properties and a
range over them (the Bloom Slicer, the Linkurious Timeline). Gephi gives no analytical reason
for its rule in the pages read.

**What graphty-element can express today.**
- `TimeWindow { attribute, from, to, step }` reads ONE attribute, the same path for nodes and
  edges, and tests one instant against a half-open window, `from <= t < to`
  (`graphty-element/src/session/visibility/filter.ts`).
- It cannot express an interval. There is no end attribute, and a list value (a spells or
  timestamps column) reads as "no instant"; an element with no instant is always inside the
  window. An interval graph loaded into it would therefore show every element at every time,
  with no error.
- `nodeTimePath` and `edgeTimePath` are declared in the data config
  (`graphty-element/src/config/DataConfig.ts`) and nothing reads them; the window names its own
  attribute. Two spellings of the same idea are published and only one is wired.
- graphty-element does not import graph-io, so GEXF lifetimes reach it only through whatever a
  consumer maps into records.

**Recommendation.** Adopt one model that covers all three patterns: an element's lifetime is a
list of intervals, and an instant is an interval whose start equals its end. It reads GEXF
intervals, spells and timestamps and Pajek without loss, makes KeyLines-style mixing legal at
no cost, and leaves today's instant data working unchanged. The window test becomes overlap:
an element living over `[s, e]` is inside `[from, to)` when `s < to` and `e >= from`, which for
an instant reduces to today's test. Stored intervals are closed at both ends, as GEXF's
brackets are ("include both the startpoint and endpoint"); the window stays half-open so
consecutive windows tile. The config and project-file key should name the lifetime in one of
three forms -- an instant path, a start path and an end path, or one path holding a list of
intervals -- and replace the unread `nodeTimePath` and `edgeTimePath` before they are relied on.
Time-varying attribute values (GEXF's dynamic `attvalue`) need no key now: adding them later is
a new key, not a change to this one.

### 20.2 Running the same algorithm twice

| Tool | A second run with new parameters | How users keep both | How users compare |
|---|---|---|---|
| Gephi | overwrites the column (source code) | duplicate the column first (Gephi FAQ) | by hand; export a workspace |
| Kumu | "Each time you run the metric the previous values are overwritten" | rename the field first ("2014 betweenness") | none built in |
| Cytoscape Network Analyzer | writes the same column names (practitioner knowledge) | make a subnetwork | Results Panel per network; Plot Scatter of any two columns |
| Cytoscape clusterMaker2 | overwrites at the default name | set a different "Cluster Attribute" per run, which the manual presents as the way to "record multiple clustering assignments" | two columns, a scatter or the table |
| Bloom | a new property per run, named with the algorithm and a number, and it "cannot be renamed" | automatic | Slicer or style rules on either property |
| NetworkX, igraph | the result is a returned value; the user picks the attribute name | variables | igraph `compare_communities` returns a similarity score (practitioner knowledge) |

**Finding.** The paved path is a column, and the paved workaround is "name the column before
you run it". Every tool that overwrites also documents how not to, which is the evidence that
users want both runs. No tool offers a per-element diff of two runs: comparison is two columns
on a scatter plot (Cytoscape), or one number for two partitions (igraph). A named run with its
parameters exists in these tools only as a hand-made convention, the renamed column.

**graphty-element today.** Every run has its own `RunId` (author-assignable through `as`), and
results live at `results.<runId>.<field>`, so two runs already sit beside each other and each
keeps its parameters. That is Bloom's behaviour, plus the parameters Bloom lacks.

**Recommendation.** Keep the run visible and named: it replaces the column-renaming habit that
every overwrite tool forces on its users. Its values must reach styling, filters and the table
as an ordinary attribute, so comparing two runs is a two-attribute chart (a scatter for
metrics) plus, for two partitions, a similarity score (normalised mutual information or
variation of information). Do not design a per-element diff first; nothing in the survey has
one. Tuning a parameter of an existing result revises it in place, with the earlier output kept in
the history rather than as a second row; keeping both is an explicit "Run as new" with a name,
which is the renamed column every overwrite tool asks for, made into a command (section 20.28).
Overwriting WITHOUT a history is the data loss the tools' documentation warns about; revising with
one is not.

### 20.3 Communities: legend entries or named objects

| Tool | Where communities are listed | Selectable from the list | Nameable | Identity across re-runs |
|---|---|---|---|---|
| Gephi | Appearance partition list: value, colour, share of nodes | no; build a Partition filter and tick values | no | none; the id is "a random number given to communities" |
| Cytoscape clusterMaker2 | a column; optionally one metanode per cluster, or a new clustered network | a metanode is a node, so yes when made | as a node | none documented |
| Kumu | a results table "ordered by community size", listing members and their strength | yes | yes, "rename communities to descriptive names" | yes: a re-run "uses existing communities to seed the algorithm" unless the user throws them away |
| igraph | a VertexClustering indexed by cluster, with `subgraphs()` | in code | no | none; compare by score |
| Bloom | "unique colors" per value in the legend | no | no | no |

**Finding.** Only Kumu treats a community as an identified object with a name, a member list
and stability across re-runs, and it gets stability by seeding the next run with the previous
result, not by matching communities by overlap after the fact. No surveyed tool matches
communities by overlap. Everywhere else a community is a legend row or a column value, and
becomes a thing a user can hold only when explicitly turned into one (a clusterMaker2
metanode, a Gephi filter, an igraph subgraph).

**graphty-element today.** The community result shape carries `group` and `groupSize` per node
and `groupCount`, `sizes` and an optional `modularity` for the graph, so a community is already
addressable as a run plus a group value.

**Recommendation.** A community is a column value that can be promoted on demand -- named,
pinned, used as a scope -- not an automatic row per community in the object list. The one tool
that names communities does it inside the result's table, and a community detection run on a
large graph produces far more communities than a list can show (practitioner knowledge; Louvain
routinely returns thousands on graphs of hundreds of thousands of nodes). Its address stays
"run plus group value", which needs no new published id kind; a promoted community becomes a
saved set with its own name, and that set is what keeps a name across re-runs. For stability,
Kumu's precedent is seeding: where an algorithm accepts a starting partition, a re-run can be
offered "start from the previous communities". Matching by overlap has no tool precedent and
should not be promised in the contract. Section 20.17 has the detail, including what "10 of these
12 are still together" can and cannot mean.

### 20.4 Per-element style overrides (Cytoscape's bypass)

**How Cytoscape shows a bypass.** Only through the current selection. Each Style panel row has a
Bypass button, enabled only when nodes or edges are selected; it shows the bypassed value, or
"The selected ... have different bypass values". A right-click **Bypass Style** submenu sets or
removes bypasses on the selection. There is no list of all bypasses in a network. The API calls
a bypass a "locked value" on the view, so it belongs to one view, not to the Style.

**How often users meet them.** No tool publishes usage figures. Indirect evidence: py4cytoscape
has a whole module of bypass calls (`style_bypasses`), each warning that it "permanently
overrides any default values or mappings", and a mapping that "does nothing" because a
forgotten bypass sits above it is a familiar Cytoscape support question (practitioner
knowledge). Other tools carry the same tier under other names: Ogma's per-element
`setAttributes()` sits above rules, Kumu has direct decorations beside data-driven ones, and
Gephi and yEd are all overrides because their styling is a one-shot write.

**Recommendation.** A per-element override is standard and should exist, but Cytoscape's
lesson is that an override visible only through the selection produces the "my mapping does
not work" confusion. The project rule that appearance goes through a style layer settles the
form: overrides are a style layer with an explicit id selector (graphty-element already has
`{ match: "ids" }`), shown in the stack as ONE row that collects every one-off change, with a
count and a way to list and clear its members. One row avoids the clutter of a layer per
change; being a row avoids Cytoscape's hidden tier.

### 20.5 Which edges a node set carries, and what a path is

| Tool | Default for a node set | Explicit-edge form |
|---|---|---|
| NetworkX | `subgraph`: "the subgraph induced on nodes in nbunch" | `edge_subgraph` |
| igraph | `induced_subgraph`: "spanned by the given vertices" | `subgraph_edges`: "spanned by the given edges" |
| Cytoscape | "From Selected Nodes, All Edges"; Select, "Edges Between Selected Nodes" | "From Selected Nodes, Selected Edges" |
| Gephi | a node filter keeps the edges whose two ends both remain (practitioner knowledge) | edge filters |
| Linkurious | query results get "all mutual edges between the nodes in the result" automatically | a query that returns edges explicitly suppresses this |
| Bloom | "Reveal relationships" adds the edges between selected nodes on request | the Scene's own contents |

**Finding.** The induced subgraph is the default everywhere; an explicit edge set always exists
as a second, separately named form. graphty-element already follows the default: "the edges
whose BOTH endpoints are in the scope's node set, narrowed by the scope's own edge constraint"
(`graphty-element/src/session/scope/ScopeApi.ts`). What it lacks is the second form: a scope has
no edge-list arm, so a path or a spanning tree cannot be saved as a scope.

**Paths.** A node list (NetworkX, igraph), a collection (Cytoscape.js), a `PATH` type (Neo4j's
query language), or elements added to the canvas (Bloom, Linkurious). A family of paths (k
shortest, all shortest) is always a plain list of paths; no tool keeps a family as one object,
and Linkurious simply adds up to a maximum count of paths to the visualization.

**Recommendation.** Add the explicit edge-set arm beside the induced default. A path is a set
whose edge arm is ORDERED: the ordered edge sequence is the definition, and the node sequence is
derived from it. It is not a separate published kind, because no algorithm graphty ships or
plans produces a walk that repeats a node or an edge (section 20.16 checks each one); the one
thing a node list cannot say is which of several parallel edges was taken, and an ordered edge
arm says it. A family is a list of paths from one run, addressed as run plus index, with its
union available as an ordinary set. One flag for the element: the published path result shape
has `order` per node, which assumes each node sits on one path; a family breaks that, so the
shape needs a per-path edge sequence and a path index before k shortest paths ships.

### 20.6 Overlapping and hierarchical communities

**Evidence.** NetworkX has covers (`k_clique_communities`, `is_cover`, `overlapping_modularity`)
and represents hierarchies as a sequence of partitions (`girvan_newman`, `louvain_partitions`,
`leiden_partitions`). igraph has `VertexCover`, `VertexDendrogram` (Girvan-Newman) and
Louvain's `return_levels` list. clusterMaker2 has fuzzy clustering with proportional
memberships drawn as extra edges, and hierarchical clustering drawn as a dendrogram. Kumu's SLPA
finds overlapping communities, shows the overlap in its result table, and stores only "the best
match for each element" in the Community field. Gephi's Modularity is a partition only, and
Gephi removed hierarchical graphs.

**Finding.** Every user-facing tool that computes overlap still writes ONE value per node to its
column and shows the overlap only in the result view. Every hierarchy is levels -- a list of
ordinary partitions -- shown as a chart (a dendrogram) when shown at all. No tool places
sub-communities inside communities in an object list.

**graphty-element today.** The `community` shape is one `group` per node; a separate
`layered-grouping` shape carries `level` and `levelSize`.

**Recommendation.** Keep `group` single-valued; it is the paved path for styling and filtering.
If covers come later, add them as a separate optional field or shape (memberships with
strengths) and let `group` hold the best match, as Kumu does. That is an addition, not a
breaking change, so the current field is safe to publish now. A hierarchy is one run with
several levels, each addressable as run plus level and each an ordinary partition; communities
do not nest in the object list.

### 20.7 Whole-graph statistics: the full graph or what is showing

| Tool | What an unscoped measure describes | How the user is told |
|---|---|---|
| Gephi | the filtered graph: statistics start from `getUndirectedGraphVisible()` or `getDirectedGraphVisible()` | the counts in the Context panel reflect the filter (practitioner knowledge); the report does not say |
| Kumu | what is showing: "Metrics will not be calculated for elements that are filtered out of the map" | the documentation only |
| Bloom | the Scene, which is always a subset of the database, or chosen categories; a whole-graph run is a separate choice that writes to the database | chosen in the run dialog |
| Cytoscape Network Analyzer | the whole current network; a subset needs a subnetwork first | the subset is a different network with its own name |

**Finding.** Where filtering and analysis meet, the paved path is "the graph means what is
showing" (Gephi, Kumu, Bloom). Cytoscape avoids the question by making a subset its own
network. None shows the full-graph and filtered values side by side; the closest is two
Cytoscape networks, each with its own Results Panel.

**graphty-element today, and a defect.** The element disagrees with itself. `statistics()`
describes the whole snapshot (`nodeCount`, `density`, components), with `visibleNodes` and
`visibleEdges` as extra counts, while a run that names no scope "Defaults to the visible graph"
(`graphty-element/src/session/types.ts`). With a filter active, the resting summary can show a
density over every node beside a PageRank computed over only the visible ones.

**Recommendation.** "The graph", unqualified, means the whole loaded graph, for `statistics()`
and for an unscoped run; the visible graph is an explicit, named scope. Gephi's silent scoping to
the visible graph is what produced a column mixing two computations (issue 636) and a colour scale
that moved with the filter (issue 541, after which Gephi made its scale global by default); section
20.31 has that evidence. Every graph-level number carries its scope in words, and while a filter is
active the resting counts show both ("1,204 of 50,000 nodes visible"), which costs little for counts
and density and would be a first among the surveyed tools. The element's defect is not
`statistics()` but the run that records "visible" while computing over the whole loaded graph: the
record must match the computation (section 20.31, and `graph-analysis.md` section 6.14).

### 20.8 Where the command to run a measure lives

| Tool | Home of the command | From the object |
|---|---|---|
| Gephi | a dedicated Statistics panel beside the canvas, one entry per measure (practitioner knowledge for the layout) | no |
| Cytoscape | Tools, Analyze Network; app algorithms under Apps (clusterMaker2) | only by making the subset a network and analysing that network |
| Bloom | a GDS button in the upper-left corner of the Scene | Scene actions: Cypher run "from the context menu when at least one element is selected" |
| Linkurious | a `{}` Queries button on the right toolbar | right-click a node, Queries, with suggestions for the selected node |
| Kumu | a Metrics icon in the bottom-right corner of the map | no |

**Finding.** Measures that describe the whole graph (centrality, communities, statistics) live
in one dedicated place in every tool. Running from the object exists only for questions about
an element -- its neighbourhood, a pattern starting from it -- in the two investigation tools
(Bloom Scene actions, Linkurious queries). No tool runs a centrality measure from a node's
context menu.

**Recommendation.** Split by what the measure describes. A measure of the graph or of a set runs
from that object's inspector: the graph's inspector is the equivalent of Gephi's Statistics
panel, attached to the thing it describes, and a set's inspector is Cytoscape's "analyse the
subnetwork" without making a copy. A question about an element (its neighbours, paths from it)
runs from the element, as in Bloom and Linkurious. "Add a measure from the object it will
describe" therefore has precedent at both ends. A toolbar home is not unprecedented: Bloom's GDS
button, Kumu's Metrics icon and Linkurious's `{}` button are always-visible buttons on the canvas
chrome. What none of them has is a scope chosen by where the command was started; each opens a
dialog in which the scope is a setting. Section 20.23 refines this recommendation.

### 20.9 What a saved view stores, and where positions live

| Tool | What the saved view holds | Positions | Different layouts of one network |
|---|---|---|---|
| Bloom Scene | its contents (which nodes are in it), positions, filters and style; saved automatically; references database ids | per Scene | yes, one per Scene |
| Linkurious visualization | "the layout, filters, styles, comments", not the data; references database ids | per visualization | yes |
| Kumu view | decorations, filters and settings, as selector text | per map, not per view | no; a second arrangement needs a second map |
| Cytoscape network view | positions and all visual property values, bypasses included; a Style is a shared object applied to views | per view | yes in the API (several views per network); the desktop usually shows one (practitioner knowledge) |
| Gephi | no view object | once per workspace | only by duplicating the workspace (practitioner knowledge) |

**What users reopen.** Bloom Scenes and Linkurious visualizations are the unit of work and of
sharing (Scenes are shared by role or link; visualizations live in Spaces). Kumu views are
switched between on one map. These are reopened working states; exports (PNG, SVG, CSV) are the
leave-the-tool form.

**Recommendation.** The investigation tools make a view heavy (contents, positions, filters,
style); the analysis tools tie positions to one drawing. For graphty, positions are a property of
the graph with two slots, 2D and 3D, each recording what produced it (section 20.27), and a saved
view is a snapshot of the working state -- camera, view mode, visibility, visible layers, collapsed
sets -- that records which slot it uses and a fingerprint of its positions rather than a copy
(section 20.26). Positions are the largest part of a file (three numbers per node), so a copy per
view is not affordable, and no workflow asks for several arrangements of one graph.

### 20.10 What identifies a node and an edge when the data comes back

| Tool | Node reference | Edge reference | When members are gone |
|---|---|---|---|
| Bloom | database id | database id | "Changes to this underlying data can cause data in saved Scenes to appear incorrectly" |
| Linkurious | database id, or a configured `alternativeNodeId` property | database id, or `alternativeEdgeId` | switching the key without migration leaves visualizations "empty or filled with the wrong nodes and edges" |
| Cytoscape | node name ("shared name" links networks); table import matches a chosen "Key Column for Network", exactly, "including case" | a deterministic name built from its endpoints and interaction, `source (interaction) target` (SIF reader source) | not documented |
| Gephi | the `Id` column | Source and Target | not documented |

**Finding.** Every tool references a node by an id that came from the data, and the enterprise
tool that met the re-import problem (Linkurious) answered it by letting the user choose the key
property. Cytoscape is the one that gives an edge without an id a deterministic name derived
from the data. No tool, in the pages read, reports missing members gracefully; the failure is
silent or "incorrect".

**graphty-element today.** A `NodeId` is the id as loaded (`nodeIdPath`), stable across a
re-import that keeps it. An `EdgeId` is ALWAYS a counter handed out by the store
(`GraphStore.nextEdgeId()` in `graphty-element/src/data/GraphStore.ts`), even when `edgeIdPath`
is set; the file's own edge id is used only to recognise a repeated record (section 20.19 quotes
the 2.3.1 source). The counter is stable only while the
same records load in the same order into a fresh store; reordered rows or a second file renumber
every edge.

**Recommendation.** The project file references a node by its imported id, and an edge by the
file's edge id when there is one, otherwise by its source id, target id and its position among
the parallel edges of that ordered pair -- Cytoscape's derived name, with an ordinal in place of
the interaction type. Counter ids must never be written to a file. Every stored reference (a
saved set, a note, a highlight, an override) keeps its member list and reports missing members
on reopen ("3 of 40 members are no longer in the data") instead of shrinking in silence, which
is the documented weak point of both Bloom and Linkurious. The import step should let the user
choose the key column, as Linkurious and Cytoscape do.

### 20.11 Whether users type a predicate language

| Tool | Do end users type predicates? | Attribute comparison | Neighbourhood traversal | What is saved |
|---|---|---|---|---|
| Kumu | yes: the search bar after `=`, the Advanced Editor; the Basic Editor generates the same text | `[team-members > 20]`, `["element type" = "person"]` | `-->`, `<--`, `<-->`, `:from()`, `:to()` | the selector text, in the view |
| Cytoscape desktop | only in the search bar (Lucene) | `name:hello`, `pvalue:[0.2 TO 0.4]` | none in text; the topology filter is a GUI | filters are GUI objects that can be exported |
| Cytoscape.js apps | developers, not end users | `[weight > 50]` | by method calls, not selectors | code |
| Graphistry | yes, filter and exclusion expressions | `point:degree < 10` | none | the filter |
| Gephi | no; filters are built in a GUI | -- | -- | the query tree, in the project |
| Bloom | no; a near-natural language search bar; administrators write Cypher search phrases and Scene actions | Cypher | Cypher patterns | Cypher, in the Perspective |
| Linkurious | no for filters (UI only); administrators write Cypher or Gremlin query templates | Cypher, Gremlin | Cypher, Gremlin | the templates |

**Finding.** Where end users type, the syntax is a bracketed attribute comparison with bare
literals (Kumu and Cytoscape.js share `[field > value]`) or `field:value` (Lucene; Graphistry's
`point:degree`). Where a language reaches neighbours, traversal is part of it (Kumu's arrows,
Cypher patterns). None uses JMESPath. JMESPath quotes number and boolean literals in backticks
-- the project's own example of a style-layer selector is
``algorithmResults.graphty.dijkstra.isInPath == `true` `` (`CLAUDE.md`, Graph Styling) -- and has no
traversal, so neighbourhoods need a separate construct in any case (the element's `Filter`
already has a `neighborhood` kind).

**Recommendation.** Keep JMESPath as graphty-element's internal form of an attribute predicate,
since it is published, but do not make it the language users type into Find, and do not make it
the saved form of every derived set. Save derived sets as the structured specification (the
`Filter` and `Scope` kinds: range, categories, degree, neighbourhood, and so on), with JMESPath
confined to the expression arm. The survey's saved forms are either a user-facing text (Kumu) or
a structure built in a GUI (Gephi, Cytoscape, Linkurious); a structure survives a later change
of typed syntax, and a Kumu-like typed Find can compile into it. That keeps the one-way door
narrow: the structure is published now, and the typed syntax stays reversible.

### 20.12 Where this note and the sibling notes disagree, and the resolution

1. **Is a path an object?** `graph-analysis.md` section 3.2 says "A path is an object with
   length, endpoints and members"; section 18.7 here says no end-user tool keeps one. Both hold
   at different layers: the analyst's concept (Lee's task taxonomy, Neo4j's `PATH` type) has
   endpoints and a length, while the tools store a list or a selection. Resolution: a path is
   its own kind in the set grammar (20.5), with length and endpoints, even though the tools do
   not keep it.
2. **A result object, or only attributes?** `graph-analysis.md` section 6, item 4, says the
   user's model "should not add a parallel 'result object'"; sections 18.6 and 21 here put a
   result object on top of the column. The re-run evidence (20.2) settles it: users of every
   overwrite tool recreate named runs by renaming columns, so the run is visible and named, and
   its values reach styling, filtering and the table as ordinary attributes. One object with two
   faces: the run is the provenance entry `graph-analysis.md` asks for, not a second copy of the
   values.
3. **Overlapping sets.** `graph-analysis.md` section 7 lists overlap as thin in the task
   literature. The tools are not thin on it: NetworkX covers, igraph `VertexCover`,
   clusterMaker2 fuzzy clustering and Kumu's SLPA (20.6), all of which still store one value per
   node for display.
4. **The whole graph or the current subgraph.** `graph-analysis.md` section 4.3, item 5, says
   whole-graph questions "recur on the current subgraph", while its section 6.14 makes the whole
   loaded graph the default of an unscoped run. Resolution (20.7, 20.31): unqualified means the whole
   loaded graph for `statistics()` and for runs; the current subgraph is a named scope the reader
   picks, which is how a question "recurs" on it. `statistics()` keeps its meaning; the run record
   that says "visible" while computing the whole graph is what changes.
5. **Where positions live.** `graph-analysis.md` section 4.3, item 4, says a view "references
   filters, visible style layers and the camera; it never owns graph data". That agrees with
   20.9 and 20.27: positions are a graph property with a 2D and a 3D slot, and a view records which
   slot it uses rather than holding a copy.
6. **A path: a set with an order, or its own kind?** `graph-analysis.md` section 6.12 says "a
   path is a set with an order"; the case for a separate kind is that a walk may repeat
   elements. Section 20.16 finds that nothing graphty ships or plans produces a walk
   with repeats, so the reason for a separate kind falls away. Resolution: a path is a set whose
   EDGE arm is ordered. The order must sit on the edges, not only on the nodes as `order` does
   today, because only the edge taken distinguishes parallel edges.
7. **"10 of these 12 are still together, now in community 5."** `graph-analysis.md` section 6.2
   offers this after a re-run; section 20.3 here says overlap matching has no precedent.
   Resolution (20.17): the sentence is a query of a kept set against the new partition and is
   fine; a promise that a new community IS an old one is what has no precedent and is not
   published.
8. **"Set" as a word.** `graph-analysis.md` recommends "set"; section 19 here noted that "set"
   is not a graph-tool term. Resolution (20.15): "set" is the word, because every graph-tool term
   for a kept subset (group, subgraph, label) is already taken for something narrower, and
   Cytoscape's setsApp and Tableau use "set" for exactly this.
9. **Declared weight meaning.** `graph-analysis.md` section 6.6 has the element convert per
   algorithm from a declared meaning. No tool or format declares it (20.18), but clusterMaker2
   converts per run and tnet converts by assumption, so the recommendation stands with one
   addition: the declaration is optional, and an undeclared weight keeps path measures unweighted.
10. **Does `edgeIdPath` set the `EdgeId`?** `graphty-today.md` section 7.15 says no, and the
    2.3.1 source confirms it (20.19); section 20.10 follows it.
11. **The scale of an encoding under a filter.** Following Gephi's statistics and Kumu, the visible
    graph could be the unqualified meaning everywhere, which would give a colour scale that moves
    with the filter; Gephi shipped exactly that for scales and reversed it (issue 541). Resolution (20.31): an encoding's automatic domain
    is the whole measured column, as graphty-element already computes it, with "fit to visible" as a
    labelled option.
12. **Re-runs: add beside or revise.** graphty-element's derived run ids make every re-run with new
    parameters a new run beside the old one; `design-method.md` section 3.6 makes a re-run of
    a held result a step in the history, so the earlier value is reachable without a second row.
    Resolution (20.28): tuning revises in place under a stable name with the history holding the
    earlier output; "Run as new" adds beside.
13. **Degree: a run or an attribute.** `graphty-today.md` section 7.8 notes that a degree histogram
    needs a `degree` run, while `design-method.md` section 3.6 classes degree and component membership
    as following the data. Resolution (20.29): they are attributes at rest, with no run record.
14. **Filters per view or per session.** The container model of Bloom, Linkurious and Kumu gives
    each view its own visibility state; the planned "View Bookmarks" capability restores "active filter configuration at time of bookmark".
    Resolution (20.26): one working state for the session, which a view snapshots.
15. **One catalogue for algorithms and layouts.** `figma.md` gives "the algorithm and layout
    catalogue" one rail button by Figma's runnable-catalogue test; every graph tool surveyed gives
    layout a home apart from statistics. Resolution (20.27): one button can stay, but layouts are
    their own section of it with their own verb, and the arrangement in force is a property row of
    the graph, not a result.

### 20.13 Filters: several named filters, or one visibility state

**Question.** Do analysts keep several named filters switched on and off independently, or one
current visibility state that they edit? Where is the active filter shown, and how is it cleared?

| Tool | Saved filters | How many act at once | How two conditions combine | Where the active state shows | How it is cleared |
|---|---|---|---|---|---|
| Gephi | many queries in the Queries panel ("Returns all queries in the model") | exactly one: `getCurrentQuery()` "Returns the query currently active or `null` if none is active" | inside that one query, by nesting a filter as a "subfilter" or with the intersection, union and NOT operators | the Queries panel and the pressed Filter button; the canvas shows only what passes | toggle the Filter button off, or right-click the filter and "remove" |
| Cytoscape | many saved filters, chosen from a drop-down | one: "The name of active filter appears in the drop-down box at the top of Select panel" | inside that one filter: "Dropping a filter on top of another filter will group the filters into a composite filter"; by default elements "need to satisfy the constraints of all your filters" | the drop-down; the result is the selection unless "show" is checked | deselect, or show all (practitioner knowledge; the page read does not say) |
| Neo4j Bloom | "You can create as many filters as you like, they remain in the Filter drawer until you delete them" | several, each switched on or off in the drawer (the per-filter switch is practitioner knowledge) | all applied filters together | the canvas: "all filtered elements are greyed out in the Scene"; the drawer lists the filters | delete the filter; "Filters are not saved, so when the scene is cleared so is the filter panel" |
| Linkurious | filter rules by category and property | several: an "Applied Filters" section lists them | all applied rules together | the Applied Filters list; a "Reset Filters" button appears "When at least one filter is applied"; filtered nodes drawn in light grey | "clicking on the 'x' button on the name of the filter", or Reset Filters for all |
| Kumu | filters are part of a view, written as selectors | one view at a time; a view's filter can hold several selectors | in the selector text | the canvas | switch or edit the view |

**How often is more than one active?** No tool publishes usage figures. The interfaces answer
it indirectly: the two investigation tools (Bloom, Linkurious) are built for several conditions
at once and list them; the two analysis tools (Gephi, Cytoscape) let one query be current and put
the combination inside it, which is where their users build multi-condition filters. Either way
several conditions act together routinely; what differs is whether each condition is a row that
can be switched off alone.

**Finding.** Two models, and they agree on the essentials. The ACTIVE state is one thing (one
current query, or one list of applied rules), combined by AND unless the user builds an OR
explicitly. Saved, named filters exist in the analysis tools but only one is current. No tool
treats filters as an ordered stack in which order changes the outcome; Cytoscape's ordered
"chain" of transformers is a separate tab for a separate purpose. Clearing is always one visible
command (Linkurious Reset Filters, Gephi's Filter toggle), and the investigation tools also clear
one condition at a time.

**Recommendation.** One visibility state for the session, captured by a saved view as a snapshot
(section 20.26), made of named rules, each switchable on its own and combined by AND, as in Bloom and Linkurious; a rule is an ordinary rule set from the one
set vocabulary, applied with the Hide outcome (or Dim, which Bloom and Linkurious both offer). It
is not a stack, because AND does not depend on order, so it needs no drag handles or precedence.
An OR or a NOT lives inside one rule (graphty-element's `Filter` kinds `all`, `any` and `not`
already express it), as Gephi and Cytoscape do. Show the active state in words wherever the
graph's counts are shown ("Showing 1,204 of 50,000 nodes, 2 filters") with a single "Clear
filters" command beside it, and list the rules where each can be switched off or removed.

### 20.14 One list or separate panels for kept subsets, results and styles

**Question.** Do kept subsets, algorithm results and styles appear in one list or in separate
panels? Where a hierarchy exists, how is a node in several subsets shown, and does nesting mean
"computed within" or "contained in"?

| Tool | Kept subsets | Algorithm results | Styles | Organising principle |
|---|---|---|---|---|
| Cytoscape | the Network panel: collections, and inside them networks and subnetworks, with "the network provenance history" showing a network that "originated as a subnetwork from another network"; groups appear as nodes inside a network | columns in the Table Panel and the Results Panel | the Style tab | one panel per kind; the network list is a provenance tree |
| Gephi | none kept except as a workspace (tabs); filters in the Queries panel | columns in the Data Laboratory; values in the Statistics panel | the Appearance panel | one panel per kind of activity |
| Tulip | the subgraph hierarchy: "The navigation in the tree of subgraphs can be performed in the graph list view" | properties of the graph they ran on: "If you use a measure algorithm on a subgraph, new local properties are created. Those properties are not applied to the root graph" | properties too (`viewColor`, `viewSize`) | one tree of graphs; results belong to a node of the tree |
| Neo4j Bloom | saved Scenes (whole working states), not subsets | temporary properties in the Scene | the Perspective and the Legend panel (per category, with rules) | one drawer per kind |

**Nesting.** Only Tulip has a hierarchy of subsets, and in it nesting means BOTH: a subgraph is
contained in its parent ("the edge of a subgraph must already be present in the graph just
above it", section 9), and a result computed on a subgraph is local to it. Cytoscape's tree is
provenance ("originated as a subnetwork"), which also implies containment because a subnetwork
is cut from its parent. A node in two sibling subsets is simply a member of each; the tree lists
subsets, not nodes, so overlap never has to be drawn (practitioner knowledge for Tulip's display;
the definition allows overlap because nothing requires siblings to be disjoint).

**Finding.** No tool mixes kept subsets, results and styles in one list. The split is by kind
everywhere. The one tree (Tulip) nests subsets by containment and hangs results under the subset
they were computed on.

**Recommendation.** Keep sets, runs and style layers in separate lists or separate groups, not
one interleaved list. Do not nest sets inside sets: containment between user-defined sets is
rare and membership is many-to-many, so a tree of sets would force a node's sets into one
branch. The one nesting with precedent is Tulip's "computed within": a run may be shown under
the set it ran on, and a set kept from a run may point back to the run as its origin; both are
references, drawn as a secondary line or a link, not as containment.

### 20.15 The word for a saved, named subset a user defined

**Question.** What word do users of Gephi, Cytoscape, igraph, NetworkX, Tableau and Neo4j use
for a kept, named subset of nodes and edges, and which word survives collision with
graphty-element's published `group` field, Figma's group and the induced-edge meaning of
subgraph?

| Tool | Word for a user-defined, kept subset | What it means there |
|---|---|---|
| Cytoscape (core) | **group** | a collapsible metanode that becomes part of the network (section 1) |
| Cytoscape (setsApp) | **set**: "create and manipulate sets of nodes or edges (but not sets with both nodes and edges, at least in the current version)", made from a selection or a column, with "union, intersection, and difference" | exactly the kept subset in question |
| Gephi | none; a filter, a partition value, or a new workspace | -- |
| Tulip | **subgraph** | a subset whose edges must exist in the parent |
| NetworkX | `nbunch` for a node collection passed to a function; **subgraph** for the induced result | a function argument, not a kept object |
| igraph | `VertexSeq` / `EdgeSeq` from `select()`; **subgraph** for the induced graph | a query result, not a kept object |
| Tableau | **set**: "custom fields that define a subset of data based on some conditions", fixed or dynamic, with In and Out members | exactly the kept subset in question |
| Neo4j and Bloom | a **label** added to nodes; a saved **Scene** for a working state | a label is a tag on nodes only; relationships have one type and no labels |

**Collisions.**
- **group** is taken three times: graphty-element publishes `group` as the community field of
  the `community` result shape (section 20.3); Cytoscape, yEd and Linkurious use it for a
  collapsible node; Figma uses it for a container in the layer tree. A graphty "group" would
  mean three different things in one product.
- **subgraph** carries the induced-edge rule in NetworkX, igraph and Tulip (section 20.5), and a
  kept set must be able to hold chosen edges that are not the induced ones (a path, a spanning
  tree). Calling that a subgraph misstates it to exactly the analysts who know the word.
- **selection set** is the transient selection plus a qualifier, and graphty already has a
  selection with a 5,000-member cap that a kept set must not inherit.
- **label** is Neo4j's node type, and graphty uses label for the text drawn on a node.
- **set** collides with nothing in graph tools, is what the two tools that built this exact
  feature call it (Cytoscape setsApp, Tableau), and matches the fixed-or-rule model recommended
  in `graph-analysis.md` section 6.2.

**Recommendation.** Use **set** for the user-facing word, config keys and project-file keys
(`sets`). The claim in section 19 that "set" is not a graph term is accurate but not decisive:
every graph term for this concept is already taken for something narrower. One naming trap for
the TypeScript surface: a type named `Set` shadows the JavaScript built-in `Set`, so the exported
type needs a qualified name (for example `ElementSet` or `SavedSet`); the key in the file can
still be `sets`.

### 20.16 What a path must carry: walks, parallel edges and families

**Question.** Do any algorithms graphty-element ships or plans produce walks that repeat nodes
or edges? Do the multigraph datasets in the workflows need a path to say which parallel edge it
took? How do other tools represent a kept path and a family of paths?

**What the algorithms produce.** Read from `graphty-element/src/catalog/algorithms.ts` and
`design/designloom/capabilities/`:
- `shortest-path` (Dijkstra, Bellman-Ford) returns one simple path; Bellman-Ford reports a
  negative cycle only as the flag `hasNegativeCycle`, not as a walk.
- `bfs` and `dfs` publish levels and visit order, not paths.
- `kruskal` and `prim` publish an edge set (a tree); `max-flow` and `min-cut` publish edge values.
- The planned "All Paths Finding" capability requires "all simple paths (no repeated nodes)"
  (`all-paths-finding.yaml`), and the planned k shortest paths use Yen's algorithm
  (`shortest-path.yaml`: "K-shortest paths using Yen's algorithm with configurable K from 1 to
  20"), which returns loopless paths (practitioner knowledge).
- The one walk-shaped question in the workflows is a cycle: "Fraud Ring Investigation" looks for
  "circular flows". A cycle repeats only its first node as its last, which an edge sequence
  expresses without any repetition.

So no algorithm shipped or planned produces a walk with repeated nodes or edges.

**Parallel edges.** They matter. "Path Investigation" needs "Each step with edge type/label (how
are consecutive nodes related?)", and the planned all-paths capability must "filter to show only
paths using specified edge type". In a transaction graph ("Fraud Ring Investigation": "financial
transaction graph") or a knowledge graph with several relationship types between one pair, a
node list cannot answer either; only the edge taken can. The libraries agree:
- NetworkX `all_simple_edge_paths`: "For multigraphs, the list of edges have elements of the form
  `(u,v,k)`. Where `k` corresponds to the edge key."
- igraph `get_shortest_paths` and `get_k_shortest_paths` take `output`: "If this is "vpath", a
  list of vertex IDs will be returned. If this is "epath", edge IDs are returned instead of
  vertex IDs" (python-igraph source, `src/_igraph/graphobject.c`).
- Neo4j's `PATH` type is "an alternating sequence of nodes and relationships" (section 5).

**A defect in the element today.** `DijkstraAlgorithm` marks an edge `onPath` when its endpoint
pair matches any consecutive pair on the route, in either direction
(`edgePairKey(edge.srcId, edge.dstId)` or the reverse), so EVERY parallel edge between two route
nodes is painted as on the route, including the ones the route did not take. It also always
treats the graph as undirected ("Undirected: a shortest path may cross an edge in either
direction"). The comment beside it already names the need: "a pair cannot name one of two
parallel edges and a style layer has to be able to."

**Kept paths and families in other tools.** Unchanged from section 20.5: a single path is a node
list, a collection or a selection; a family is a plain list of paths (NetworkX generator,
igraph list of lists, Linkurious "up to a maximum count of paths"); no tool keeps a family as one
object.

**Recommendation.** A path is a set whose edge arm is an ordered sequence of edge ids, with its
node sequence derived. Because nothing produces repeats, a separate published "walk" kind is not
needed, and the resolution in section 20.12 item 1 stands with that refinement. Before k shortest
paths or all paths ships, the path result must carry, per path, the ordered edge ids and a path
index, and the per-node `order` field cannot be the only order (a node on three of five paths has
three positions). The shortest-path run must mark only the edges it took and honour direction
when the graph is directed.

### 20.17 Community identity across re-runs, and seeding

**Question.** After community detection is re-run, does any tool promise identity between old
and new communities (overlap matching, as in "10 of 12 now in community 5"), or only a partition
similarity score? Do graphty's Louvain and Leiden accept a starting partition?

**Evidence.**
- **No surveyed tool promises identity.** Gephi's class numbers are "a random number given to
  communities"; clusterMaker2, Bloom and igraph renumber freely (section 20.3). igraph compares
  two clusterings by a single score (`compare_communities`: variation of information, normalised
  mutual information, split-join, Rand; practitioner knowledge for the list).
- **Kumu gets stability by seeding, not matching**: "When you rerun community detection, we'll
  use the existing communities to seed the algorithm by default. This keeps the communities more
  stable", with an opt-out to "throw away the previous communities and start fresh".
- **Relating communities across partitions by shared members exists as a DISPLAY.** Rosvall and
  Bergstrom's alluvial diagrams "highlight and summarize the significant structural changes"
  between partitions ("Mapping change in large networks", 2010). They draw how members flow
  between modules; they do not declare that a new module IS an old one (practitioner knowledge
  for how the streams are drawn; the abstract states only the purpose).
- **Which algorithms can be seeded.** igraph `community_leiden` has `initial_membership` ("the
  Leiden algorithm will try to improve this provided membership"); igraph
  `community_label_propagation` has `initial` and `fixed` ("True corresponds to vertices whose
  labeling should not change"); igraph `community_multilevel` (Louvain) and NetworkX
  `louvain_communities` (parameters: G, weight, resolution, threshold, max_level, seed) take no
  starting partition.
- **graphty today.** `@graphty/algorithms` `LouvainOptions` is `resolution`, `maxIterations`,
  `tolerance`, `useOptimized`; `LeidenOptions` adds `randomSeed`; neither takes a starting
  partition. The package does have `labelPropagationSemiSupervised(graph, seedLabels, ...)`
  whose seed labels are fixed ("Some nodes have fixed labels that don't change"), and
  graphty-element does not expose it.

**Resolving the disagreement with `graph-analysis.md` section 6.2**, which lets the element say
"10 of these 12 are still together, now in community 5". That sentence is legitimate as a
computed report about a KEPT set: intersect the set's fixed members with the new partition and
count. It is a query, it needs no identity between communities, and it is what an alluvial
diagram draws. What has no precedent, and must not be published, is a promise that the new
community 5 IS the old community 3 (renumbering the new run to match the old one, or carrying a
community's name forward automatically).

**Recommendation.** Communities are addressed as run plus group value and are never matched
across runs by the element. A kept community is a fixed set with its origin; after a re-run the
set can report how its members are now distributed across the new partition. Comparing two whole
partitions is a score (normalised mutual information). Seeding is an addition, not a breaking
change: add a starting-membership option to Leiden (igraph's precedent) and expose the
semi-supervised label propagation when a workflow needs "start from the previous communities".
Louvain stays unseeded, as in igraph and NetworkX.

### 20.18 What an edge weight means: cost or strength

**Question.** Does any tool or file format let a user declare whether an edge weight is a cost
or a strength and convert it per algorithm? If none does, how do users avoid passing strengths
to shortest path, betweenness and closeness?

**Formats.** None declares it. GEXF carries a numeric `weight` on an edge and GraphML, GML, DOT,
Pajek and CSV carry whatever column the author wrote, with no meaning attached (practitioner
knowledge; graph-io's readers, section 20.1, read no such field because none exists).

**Tools and libraries.** Four strategies, none of them a declared meaning on the data:

| Strategy | Who | Evidence |
|---|---|---|
| Name the parameter by its meaning, per call | NetworkX; igraph's Voronoi communities | closeness takes `distance`: "Use the specified edge attribute as the edge distance in shortest path calculations"; `community_voronoi` takes separate `lengths` and `weights`: "Voronoi partitioning will use edge lengths ... Weights are used when selecting generator points, as well as for computing modularity" |
| Convert per run, chosen in the run dialog | Cytoscape clusterMaker2 | an "Edge weight conversion" setting: "None", "1/value", "LOG(value)", "-LOG(value)", "SCPS" |
| Assume strength and invert automatically | tnet (Opsahl) | `distance_w` assumes "high values equal stronger connections" and inverts them, normalising "by the average weight in the network" |
| Leave path measures unweighted | Gephi | Graph Distance (betweenness, closeness, diameter) never reads a weight; Modularity has `useWeight` and reads weight as strength (source) |

**graphty-element today** is the Gephi strategy plus a record. Each algorithm reads `weight` with
a FIXED meaning and records it in the run's caveats as `{ attribute, meaning: "distance" |
"strength" }` (`graphty-element/src/session/runs/types.ts`, `WeightMeaning`): distance for
shortest path, all-pairs distance, Kruskal and Prim; strength for Louvain, Leiden, label
propagation, Girvan-Newman, PageRank, min cut and max flow (`capacity`). Betweenness and
closeness record `weight: null` and say "edge weights are not read". There is no declaration on
the data and no conversion.

**Finding.** Nobody infers the meaning, and no format carries it. The safe paved path is Gephi's
(path measures ignore weights); the one tool that converts does it per run with an explicit
choice (clusterMaker2); the library that names parameters by meaning (NetworkX) makes the user
state it at every call. "Inferred" is therefore ruled out: there is nothing to infer from.

**Recommendation.** Make the meaning an OPTIONAL declaration on the data config and in the
project file (`cost` or `strength` per weight attribute, absent by default), and record the
meaning actually used, and any conversion, in every run, as the caveats already do. With the
meaning declared, the element converts per algorithm (a strength becomes a cost as 1/w for path
measures, as tnet and clusterMaker2 do) and says so; with it absent, algorithms keep today's
fixed readings and path-based centralities stay unweighted, which is Gephi's behaviour and cannot
silently route through the weakest ties. Requiring the declaration would block every unweighted
analysis on a question most users cannot answer at import; recording it per run is what makes a
wrong reading visible afterwards. This agrees with `graph-analysis.md` section 6.6, which asks
for the same two levels.

### 20.19 Edge keys that survive a reload

**Question.** How do tools that save edge references across a reload identify an undirected edge
whose endpoints come back swapped, and parallel edges that a merge policy collapsed? With
`edgeIdPath` set in graphty-element 2.3.1, does the file's edge id become the `EdgeId`?

**graphty-element 2.3.1, from its source (tag `graphty-element@2.3.1`).** No. The file's edge id
does NOT become the `EdgeId`:
- `data/edgeIdentity.ts`: "An edge is identified by the element-assigned counter the store stamps
  into its `graphty.edgeId` column, printed as a string."
- `data/ingest.ts`, `ingestEdge`: `const edgeId = store.nextEdgeId();
  store.builder.setEdgeValue(store.edgeIdColumn, index, edgeId);` for every edge, with no branch
  on `edgeIdPath`.
- `managers/DataManager.ts` reads `edgeIdPath` only into `edgesByRecordId`, a map used by
  `knownEdgeFor` to decide that a record repeats an edge: "A record identifier is a stronger
  statement than a repeated pair: the consumer said these two records are the same edge."

`graphty-today.md` section 7.15 states the same, and section 20.10 here follows it.

**Other tools.**
- **Cytoscape sessions** save the data itself, not references to an outside source, so a session
  reload never has to re-match an edge. Across imports, an edge without an id gets the name
  `source (interaction) target` (SIF reader source). That name is ordered, so an undirected edge
  re-imported with its endpoints swapped gets a different name (an inference from the naming
  rule; the manual does not discuss it), and two parallel edges of one interaction type get the
  same name.
- **Linkurious** references edges by database id, or by a configured `alternativeEdgeId`
  property, which "must have string values"; the pages read say nothing about direction or
  parallel edges, because a database edge has its own identity.
- **Kumu** matches a re-imported connection by its ID column when there is one: "we could use
  the ID `Connection-2` to update the existing connection with any new data, including a new From
  or To value." Without IDs the matching rule is not documented, and the page shows "multiple
  connections between the same elements" can exist.

**Finding.** Every tool that survives a reload well does it with an id that came with the data
(Linkurious, Kumu) or by storing the data itself (Cytoscape). Derived keys (Cytoscape's name) do
not handle swapped endpoints or parallel edges, and no tool documents a rule for either.

**Recommendation.** An edge's key in the project file is, in order of preference:
1. the file's edge id, when `edgeIdPath` names one (Kumu, Linkurious);
2. otherwise the endpoint pair plus an ordinal among the parallel edges of that pair, where the
   pair is ORDERED for a directed graph and put in a canonical order (the smaller id first) for an
   undirected one, so a swapped undirected record keys to the same edge;
3. for edges folded by a merging repeat policy (`first`, `last`, `sum`, `min`, `max`), the one
   surviving edge takes the key of the pair with ordinal 0, and the policy itself is stored in
   the project file so a reopen folds the same way.

The element must make the file's edge id the `EdgeId` when `edgeIdPath` is set (or publish a
stable key beside the counter) before any set, path, note or override holding edges is written
to a file, because today a counter id rebinds to a different edge whenever load order changes.

### 20.20 Results after a filter or time window changes

**Question.** When a filter or time window changes after a measure has run, what do Gephi, Kumu
and Bloom do with the result, and does any tool record which filter was active when it ran?

**Evidence.**
- **Gephi keeps the column silently.** Statistics run on the visible graph (section 3) and write
  a column; nothing in the Graph Distance or Modularity source records the filter, and changing
  the filter leaves the column as it was (practitioner knowledge that nothing marks it). Gephi's
  answer for TIME is different: its dynamic statistics (`DynamicDegree`,
  `DynamicClusteringCoefficient`, `DynamicNbNodes`, `DynamicNbEdges`) take a `window` and a `tick`,
  compute over each window with `graphModel.getGraph(window)`, write time-varying values, and
  print "Window" and "Tick" in the report. Moving the timeline then shows the value for the new
  time without a re-run.
- **Kumu keeps values until a manual re-run**: "To rerun metrics (for example, if you added new
  elements and connections), just follow the same steps again", and "Metrics will not be
  calculated for elements that are filtered out of the map." Nothing records which filter applied.
- **Bloom** scores "only exist temporarily" in the Scene; the GDS page does not say what happens
  when the Scene changes, and a run's settings choose "all elements in the Scene, or ... node
  categories and/or relationship types" without the page saying they are stored.
- **graphty-element** records in each run's caveats `filterScope` ("Whether a visibility filter
  narrowed what the run looked at") and `windowScope` ("Whether a time window narrowed what the
  run looked at"): THAT a filter applied, not WHICH one.

**Finding.** No tool records the filter a measure ran under, and none marks a result stale when
the filter changes; they keep the old values silently. The one principled treatment of time is
Gephi's: a measure over time is computed per window up front, so moving the window selects a
value rather than invalidating one.

**Recommendation.** A run stores both its scope as specified ("visible", with the filter rules
and time window in force) AND the membership it resolved to (as a count and a fingerprint, with
the member list kept when the file can afford it), the "definition plus members last evaluated"
pattern of `graph-analysis.md` section 6.2. The specification makes a run replayable; the
resolved membership makes staleness decidable: a run is stale when its scope, re-resolved now,
differs from what it ran on. That would make every "visible" run stale whenever the window
moves, so a run over time should instead be a per-window run in Gephi's manner (a series), and
an ordinary run should say in words that it describes the window it ran on ("PageRank, 2019 to
2020"), keeping its values rather than marking itself stale on every step of playback.

### 20.21 Where neighbourhood expansion lives

**Question.** Where do Bloom, Linkurious, Cytoscape and KeyLines put "expand neighbours" and
k-hop expansion, and is there a visible control, not only a gesture?

| Tool | Double-click | Context menu | Inspector or panel | Toolbar and menu | Depth and direction |
|---|---|---|---|---|---|
| Neo4j Bloom | (not stated in the page read) | yes: "Expansion can be done from the right-click context menu of a node" | yes: "or from the Inspector when viewing a node's relationships or neighbors" | -- | an "Advanced Expansion dialog" for chosen relationship types or neighbouring node types |
| Linkurious | yes: "Double-click a node" | yes: "Right-click a node then click the Expand button in the context menu" | yes: "click the Expand button in the property panel on the left" | -- | Selective Expand by category and edge type, "change the maximum number of retrieved neighbors" |
| Cytoscape | -- | -- | -- | menu Select, Nodes, "First Neighbors of Selected Nodes", with a toolbar button (`IN_TOOL_BAR` true) and the shortcut Cmd-6 | Undirected, "Directed: Incoming", "Directed: Outgoing"; k hops by repeating, and the Node Adjacency Transformer's Apply "pressed repeatedly may cause the selection to continuously expand" |
| Kumu | -- | -- | -- | Focus, "out 2" | depth as a number |
| KeyLines | not verified: the Cambridge Intelligence documentation could not be reached | | | | |

(Cytoscape's menu and toolbar facts are from `core-task-impl` `CyActivator.java`.)

**Finding.** Every tool gives expansion a visible control; double-click is only ever a shortcut
beside one. The investigation tools put it on the node (context menu and inspector); Cytoscape
puts it on the selection (menu, toolbar, shortcut) and gets k hops by repeating. Direction is an
explicit option in Cytoscape and Bloom.

**Recommendation.** "Expand neighbours" is a command on the selection, shown in the node
inspector (with a depth and a direction) and in the context menu, with double-click and a
keyboard shortcut as the fast routes to the same command. In graphty the data is already loaded,
so the command selects (and, where a filter hides them, reveals) the neighbours rather than
fetching them, which is Cytoscape's meaning; repeating it grows the neighbourhood by one hop. The
element already has a `neighborhood` filter kind, so a kept neighbourhood can be a rule set.

### 20.22 Where data cleaning happens

**Question.** In Gephi's Data Laboratory, Cytoscape and OpenRefine, where do cleaning operations
live (merge nodes, delete isolates, join a table, edit a cell), and can they be reached with the
canvas visible?

| Tool | Where | Canvas visible? | Operations and where each sits |
|---|---|---|---|
| Gephi | the Data Laboratory, a separate screen | no | right-click on table rows: "Merge nodes..." ("All nodes are merged into a new one, combining the edges and values using different strategies"), "Delete", "Select on Overview"; a toolbar of general operations: "Import Spreadsheet", "Detect and merge node duplicates" ("based on a column"), "Clear graph", "Clear edges"; cells edited in the table (manipulator names from the Data Laboratory source bundles) |
| Cytoscape | the Table Panel, docked "in the bottom right of the main Cytoscape window" and undockable | yes | cells "edited by double-clicking the cell"; the table can show only the selected rows; "File, Import, Table from File" with a key column; deleting nodes and edges from the canvas selection (practitioner knowledge for the Edit menu) |
| OpenRefine | a table-only tool | there is no graph | column header menus ("Edit cells", Transform, "Cluster and edit"), applied to the rows the current facets match |

**Finding.** The split is between a separate data screen (Gephi) and a table docked under the
canvas (Cytoscape). In both, row-level cleaning is a command on table rows, and because the
selection is shared with the canvas the same rows can be chosen either way. Whole-graph cleaning
(import a table, merge duplicates by a column) is a toolbar or menu command of the table, not of
a row.

**Recommendation.** Cleaning lives in the table dock, with the canvas visible, as in Cytoscape:
cell edits on cells, row commands (merge, delete) on the selected rows, and whole-table commands
(join a table by a key column, merge duplicates by a column, delete isolates) on the table's own
toolbar. Because the selection is shared, row commands are also selection commands on the canvas.
Import review belongs in the same place, since reviewing an import is reading the tables it
produced. A full-screen table is a size of the dock, not a separate mode.

### 20.23 Where a run starts and how it reaches a subset

**Question.** Where do Gephi, Cytoscape and Bloom place the command to run an algorithm, and how
is running on a subset reached?

| Tool | Home of the run command | How a subset is chosen |
|---|---|---|
| Gephi | the Statistics panel (section 20.8) | by the active filter: statistics start from the visible graph |
| Cytoscape Network Analyzer | Tools, Analyze Network | make a subnetwork and analyse that ("no longer supported directly") |
| Cytoscape clusterMaker2 | Apps, clusterMaker, then the algorithm | an option in the run dialog: "Cluster only selected nodes" or "Only use selected nodes/edges for cluster" |
| Neo4j Bloom | "the GDS button in the upper-left corner of the Scene" | settings in the GDS drawer: "all elements in the Scene, or specify which node categories and/or relationship types" |
| Kumu | the Metrics icon | by the view's filter |

**Finding.** Every tool has one fixed home for the command, and the subset is a SETTING of the
run (a filter already in force, a "selected only" option, chosen categories), never a property of
where the command was clicked. No tool runs a measure from a subset's own inspector; Cytoscape's
subnetwork is the nearest thing, reached by first making the subset a network.

**Recommendation.** One run dialog with a scope field (the visible graph, the whole graph, the
selection, or a named set), reached from one fixed home and from context. The inspector of the
graph or of a set opens it with that scope filled in, which is section 20.8's point; the command
palette and the context menu open it with the selection filled in. Whether the fixed home is a
toolbar button (Bloom, Kumu, Linkurious) or a panel (Gephi) is a layout choice; the evidence
requires only that one exists and that the scope is always visible and changeable in the dialog.

### 20.24 More than one graph in a project

**Question.** For comparing two conditions, do Cytoscape and Gephi users keep both networks in
one saved session, and how is a node matched across them? Does any workflow other than Condition
Comparison need more than one graph per project, and is a comparison of two sessions enough?

**Evidence.**
- **Cytoscape** keeps many networks in one session, in collections; "Networks in a collection are
  linked through the shared name node attribute", and "This attribute is useful when you want to
  change a node name across all networks in a collection." Merging is "Tools, Merge, Networks",
  offering "Union", "Intersection" or "Difference", matching nodes on "Matching Columns" ("the
  name column or some other column containing identifier information"), with a table to resolve
  column conflicts; "The merged network will be displayed as a separate network."
- **Gephi** keeps several workspaces in one project ("A Gephi session, which contains all
  workspaces and data"); nothing matches nodes across workspaces except importing into the same
  workspace by `Id` (practitioner knowledge).
- **The workflows.** "Condition Comparison - Disease vs Control Networks" asks to "Import each
  network as its own named network in one session; confirm both use the same identifier column",
  then union, intersection and difference "matching nodes by identifier", and lists "Tools that
  hold one graph at a time force export and re-import to compare" as a pain point. Its adoption
  note says a second file "matched by identifier as side B" covers phases 3 to 5, and that
  phases 1 and 2 need several named networks in one session. "Network Evolution Analysis" compares
  snapshots of ONE timestamped graph (time windows, section 20.20). "Knowledge Graph
  Construction" and "Data Import and Validation" combine sources INTO one graph. "Iterative
  Analysis Cycle" compares "to null models/baselines", which a score against a generated graph
  answers without keeping that graph. So only Condition Comparison needs two graphs kept side by
  side.
- **graphty-element** holds exactly one graph per session; `createComparison({ a, b, match: {
  on: "id" | "attribute" | "pairs" } })` and `shareDataWith` are designed and not built
  (`graphty-today.md` section 7.5).

**Is a comparison of two sessions enough?** For looking side by side, per-condition statistics
and per-node differences, yes: that is what the adoption note scopes and what the designed
`createComparison` reports (`matched`, `unmatchedA`, `unmatchedB`, `delta(field)`). For the
workflow's merge phase, no: Cytoscape's union, intersection and difference produce a NEW network
that is then analysed and exported with "a membership column", and a comparison object does not
hold a third graph.

**Recommendation.** Two one-way doors, both cheap to get right now:
- The top of the project file is a LIST of graphs, each with its own data, identity rule and
  runs, even though one graph is the normal case and the element loads one per session. A list of
  one costs nothing; turning a single graph into a list after the file is published is a breaking
  change. A comparison is a separate object naming two graphs of the list and its match rule; a
  merged graph, when made, is a third entry that records its recipe (operation, inputs, match
  rule).
- Node identity is per graph. Matching across graphs is a declared rule on the comparison (by
  id, by a chosen attribute, or by explicit pairs, which is the designed `match`), as Cytoscape's
  Matching Columns are; it is not a shared identity space, which is what makes "phantom specific
  nodes" from identifier mismatches visible as unmatched counts rather than hidden.

Sources for sections 20.13 to 20.24 (beyond those listed in the tool sections):
- https://raw.githubusercontent.com/gephi/gephi/master/modules/FiltersAPI/src/main/java/org/gephi/filters/api/FilterController.java
- https://raw.githubusercontent.com/gephi/gephi/master/modules/FiltersAPI/src/main/java/org/gephi/filters/api/FilterModel.java
- https://seinecle.github.io/gephi-tutorials/generated-html/using-filters-en.html
- https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/gds-integration/
- https://doc.linkurious.com/user-manual/latest/filter-panel/
- https://doc.linkurious.com/user-manual/latest/expand/
- https://manual.cytoscape.org/en/stable/Finding_and_Filtering_Nodes_and_Edges.html
- https://manual.cytoscape.org/en/stable/Quick_Tour_of_Cytoscape.html
- https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html
- https://manual.cytoscape.org/en/stable/Creating_Networks.html
- https://manual.cytoscape.org/en/stable/Merge.html
- https://raw.githubusercontent.com/cytoscape/cytoscape-impl/develop/core-task-impl/src/main/java/org/cytoscape/task/internal/CyActivator.java
- https://apps.cytoscape.org/apps/setsapp
- https://www.rbvi.ucsf.edu/cytoscape/clusterMaker2/
- https://tulip.labri.fr/Documentation/current/tulip-user/html/functions.html
- https://help.tableau.com/current/pro/desktop/en-us/sortgroup_sets_create.htm
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.simple_paths.all_simple_edge_paths.html
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html
- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.closeness_centrality.html
- https://python.igraph.org/en/stable/api/igraph.GraphBase.html (`community_leiden`,
  `community_label_propagation`, `community_multilevel`)
- https://raw.githubusercontent.com/igraph/python-igraph/main/src/_igraph/graphobject.c (the
  `output` parameter of the path functions; `community_voronoi`)
- https://toreopsahl.com/tnet/weighted-networks/shortest-paths/
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/GraphDistance.java
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/dynamic/DynamicDegree.java
- https://github.com/gephi/gephi/tree/master/modules/DataLaboratoryPlugin/src/main/java/org/gephi/datalab/plugin/manipulators
  (and the `Bundle.properties` files under `src/main/resources` for the command names)
- https://openrefine.org/docs/manual/cellediting
- https://docs.kumu.io/llms-full.txt (metrics re-run, community seeding)
- https://docs.kumu.io/frequently-asked-questions/how-do-i-avoid-duplicating-data.md
- https://doc.linkurious.com/admin-manual/latest/alternative-ids/
- https://arxiv.org/abs/0812.1242 (Rosvall and Bergstrom, "Mapping change in large networks")
- graphty sources: `graphty-element/src/data/edgeIdentity.ts`, `graphty-element/src/data/ingest.ts`,
  `graphty-element/src/managers/DataManager.ts` (all at tag `graphty-element@2.3.1`),
  `graphty-element/src/algorithms/DijkstraAlgorithm.ts`, `graphty-element/src/catalog/algorithms.ts`,
  `graphty-element/src/session/runs/types.ts`, `graphty-element/src/session/results/types.ts`,
  `algorithms/src/types/index.ts`, `algorithms/src/algorithms/community/leiden.ts`,
  `algorithms/src/algorithms/community/label-propagation.ts`,
  `design/designloom/workflows/*.yaml`, `design/designloom/capabilities/all-paths-finding.yaml`,
  `design/designloom/capabilities/shortest-path.yaml`

### 20.25 A collapsed group: needed apart from a kept set, and whose property it is

**Question.** Does any workflow need an analyst's "group" -- several nodes drawn as one node with
a member count and merged edges (Cytoscape groups, KeyLines combos, Linkurious node grouping) --
separately from a kept set? If so, is "collapsed" a property of the set or of a saved view?

**What the tools do.**

| Tool | What collapses | Made from | Where the collapsed state lives | Saved? |
|---|---|---|---|---|
| Cytoscape groups | a group node; "When a group is collapsed, all of the nodes that are part of that group are hidden and the metanode is shown", with "new meta-edges" to the outside and "Attribute aggregation" into the metanode | a selection, or an app | per NETWORK, not per view: `CyGroup.collapse(CyNetwork network)` is "a 'model-level' collapse ... This does not imply a specific visual representation", and `isCollapsed(network)` answers per network | in the session, with the limit below |
| Cytoscape AutoAnnotate (the tool the Enrichment Map protocol uses) | one cluster of the active annotation set; it "first creates a group node that contains all the nodes in the cluster and then the group node is collapsed" | a clustering run, with labels the user can rename | tied to the ACTIVE annotation set: "when switching Annotation Sets any collapsed groups will be expanded" | no: "when you save your session all the clusters must be expanded first" |
| KeyLines combos | a combo, open or closed; closed shows "a glyph marking the number of nodes they contain"; links "combine automatically into a single link, referred to as a combo link" | `combine()` on chosen nodes, or a `parentId` property at load | the chart (one drawing) | "serialized in a different section of the chart format" |
| Linkurious node grouping | nodes sharing one property value; "A badge shows the number of nodes in the group" | a RULE by property: "Nodes can be grouped by one property value"; "A grouping rule is available to all users of the same datasource" | the visualization (whether the rule's on/off state is stored per visualization is not stated in the page read) | the rule, per data source |
| Kumu clustering | not a collapse: it ADDS an element per field value and connects members to it | a field | a view setting (`cluster` in the view's `@settings`) | with the view |

**What the workflows need.** One workflow asks for it, and asks precisely. "Enrichment Map -
Pathway Similarity Network": "Cluster the map, auto-label each cluster ... rename by hand, collapse
clusters into single theme nodes for the summary figure"; its decision point is "Which clusters to
collapse and what to name them"; its pain points are "Collapsed theme nodes lose the ability to
inspect member pathways unless expandable" and "Publication figures need labels hidden on nodes but
visible on themes". "Cluster and Functionally Annotate a Molecular Network" names the neighbouring
pain ("Dense clusters render as hairballs") but asks for per-cluster layout, not collapse. No
investigation workflow asks for a hand-made group. What collapses in the one workflow that needs it
is therefore the members of a NAMED PARTITION (a community run whose communities the reader has
named), shown collapsed for a figure.

**Finding.** A collapsed group is a display of members the reader already has as something else:
a community of a run, or a kept set. The tool built for exactly this workflow treats the collapse
as transient display state of one active partition, expands everything when that partition is
switched, and cannot save it. Cytoscape's model-level collapse is the one design that makes the
collapsed node part of the data, and its own analysis consequence is the argument against it: while
a group is collapsed the members and their edges are replaced in the network, so every degree and
every path through them changes for anything run on that network. Analysts who want the contracted
graph as data build it explicitly (igraph `cluster_graph()`, section 15), and no workflow asks for
that.

**Recommendation.**
- **No new object.** A collapsed group is a DISPLAY of a set or of one community of a run: one
  node with a member-count badge, meta-edges carrying a count and (for numeric edge values) an
  aggregate, expandable in place so members stay inspectable (the Enrichment Map pain point).
- **Collapse is working display state, captured by a view, not a property of the set.** The same
  set is collapsed in the summary figure and expanded while exploring; a property on the set would
  force one answer everywhere. This matches KeyLines (per chart), Kumu (per view) and AutoAnnotate
  (per active partition), and it keeps collapse out of the data, unlike Cytoscape. The collapse
  command lives on the set's row and inspector and on a community in a run's legend ("Collapse
  community 3", "Collapse all communities").
- **Analysis never sees the collapse.** Runs, statistics and filters read the graph, not the
  display. A contracted graph as data (a quotient graph) is a separate derived graph with its own
  recipe if a workflow ever asks for it; none does.
- **Vocabulary.** "group" goes on the list of words graphty does not use for an object: it is
  graphty-element's published community field (`group`, section 20.3), Figma's layer container,
  and Cytoscape's collapsible node, three meanings in one product (section 20.15). The UI says
  "collapsed" of the thing collapsed ("Community 3, collapsed, 42 nodes"); the merged edge is a
  **meta-edge** in documentation and "merged edges" where the UI needs a noun. This refines the
  "collapsed group node" row of section 19.

### 20.26 A saved view: bookmark or live container, and whether applying one is a step

**Question.** In Kumu, Bloom, Linkurious and Cytoscape, after switching to a saved view and editing
a filter or a style, does the view change at once (a live container) or only the working state
until it is saved again (a bookmark)? Is switching undoable? Does each view keep its own filters, or
replace one active set? Do the workflows reopen views as working states and switch among several,
or mostly use them to set up exported figures?

| Tool | Edit after switching | Each view keeps its own filters? | Switching undoable? |
|---|---|---|---|
| Neo4j Bloom Scene | live container, saved automatically: "if you switch Scene, the Scene you left is the same when you return to it" (section 5); a style change "only affect[s] the current Scene" | yes, while the Scene lives; "Filters are not saved, so when the scene is cleared so is the filter panel" | not documented |
| Linkurious visualization | live container once saved: after the first save "Auto-save is switched on"; "New visualizations are not automatically saved"; a status in the corner shows "not saved, auto-save on, or auto-save off" | yes, filters are part of the visualization ("the layout, filters, styles, comments", section 11) | not documented; the documented way to try something without changing the saved one is Duplicate: "we want to try new things in our visualization and keep a record of the last version, this way the duplicate is used as a draft" |
| Kumu view | edits go to the view being shown but are PENDING: "your changes don't get saved automatically. However, as soon as you make a change, Kumu will show a prompt ... to either SAVE your changes or REVERT to your last saved version" | yes: "Settings for filter, focus, showcase, and cluster can be saved to a View"; one view is shown at a time, and a "Default view" loads first | not documented; Revert is the recovery |
| Cytoscape | there is no saved view: a network view is the live drawing, and a Style is a shared object applied to views (section 1) | a filter is a separate saved object, one active at a time (section 20.13) | not documented |

**Finding.** No tool surveyed treats a view as a bookmark that is applied and then left behind:
the three that have saved views make the view the thing being edited, and differ only in WHEN the
edit is written (at once in Bloom and Linkurious, on an explicit Save in Kumu). All three still
needed a way to try something without damaging the saved state -- Linkurious's duplicate "used as a
draft", Kumu's Revert -- which is the cost of the container model. None documents switching views
as an undoable step.

**What graphty's own requirements say.** The planned capability "View Bookmarks" is written as a
bookmark: "Save the current view state (zoom, pan, filters, selection) as a named bookmark", "Restore
all stored state when bookmark is activated", "Provide 'Update' action to overwrite bookmark with
current view" (`design/designloom/capabilities/view-bookmarks.yaml`). The workflows use views in
three ways:
- to RETURN to a working state: "Visual Exploration - Overview to Detail" lists "Difficulty
  returning to a previous view state"; "Iterative Analysis Cycle" has "try different views/encodings";
  "Threat Hunting" lists the bookmark panel. These are reopened working states, several per project.
- to SET UP A FIGURE: "Enrichment Map" (labels on themes, not on nodes, for the summary figure) and
  "Reproducible Session and Network Publication" (figure with legend, saved session).
- to SEE TWO AT ONCE: "Condition Comparison" asks for "Two synchronized views with the same node
  positions, one per condition". That is two panes on screen, not two bookmarks, and belongs to the
  comparison object of section 20.24.

**Recommendation.**
- **Filters, the visibility of style layers, collapse (20.25), the camera and the view mode belong
  to the graph session: ONE working state.** A saved view is a named snapshot of that state, as the
  capability says. Applying a view REPLACES the working state; editing afterwards changes only the
  working state, and the view shows a "changed since applied" mark with Update (the capability's
  word) and Revert (Kumu's word). This gives Kumu's safety without Linkurious's draft copies, and
  it keeps one visibility state rather than one per view (section 20.13 is written to match).
- **Applying a view is an undo step**, because it overwrites the working filters, which may be
  unsaved work. No tool documents this either way; a command that can discard unsaved work
  has to be reversible. It is a step of the working state, not of the graph, so it does not add a
  node to the analysis history that `design-method.md` section 3.5 reserves for changes to the graph
  and its results.
- **A view is its own list, not a property of an export.** Most workflow uses reopen a view as a
  working state; an export can REFERENCE a view (export "Summary figure" at 300 dpi), so the figure
  use is covered by pointing at a view, while the reverse (a view that exists only inside an export
  setting) would lose the working-state uses.
- **Style layer definitions stay in the session's one stack.** A view stores which layers are
  visible, not copies of them, so editing a layer changes it in every view that shows it (the
  Cytoscape Style model), which is what a reader fixing a colour expects.

### 20.27 Several arrangements of one graph, and the home of the layout command

**Question.** Do tools let a user keep several named arrangements (layout results) of one graph and
switch between them, and do workflows need more than one besides separate 2D and 3D positions? In
Gephi, Cytoscape and Bloom, is the layout command in the same catalogue as statistics, and is the
current layout shown as a property of the network, of a view, or not at all?

| Tool | Several arrangements of one graph | Layout command's home, beside statistics? | Current layout shown as |
|---|---|---|---|
| Gephi | no: one position per node per workspace; a second needs a duplicated workspace (section 20.9) | its own Layout panel (the `DesktopLayout` module), separate from the Statistics panel (`DesktopStatistics`) | the Layout panel keeps the last CHOSEN layout and its parameters per workspace (`LayoutModelImpl` saves `selectedLayout` and `savedProperties`); nothing records which layout produced the current positions |
| Cytoscape | positions per network view; "The Copycat layout uses node positions in one network to lay out nodes in another network" | the Layout menu, separate from Tools, Analyze Network and from Apps | not shown in the pages read |
| Neo4j Bloom | one per Scene (section 20.9) | the layout menu "located at the bottom right-hand corner of the scene" (force-based, hierarchical, coordinate, circular), separate from the GDS button in the upper left | the Scene's layout mode, in that menu |
| Linkurious | one per visualization | right-click the background, the More menu, or the layout settings icon; queries live on a separate `{}` button | not stated |
| Kumu | one per map; a view chooses the layout TYPE (`layout: force | static | scatter` in `@settings`) while pinned positions stay on the map | a view setting in the view editor; metrics have their own icon | a view property |
| NetworkX, igraph | yes, in code: `spring_layout` returns a dict and `Graph.layout()` a Layout object, kept in as many variables as the user likes (practitioner knowledge) | a separate family of functions from the measures | not applicable |

**What the workflows need.** No workflow asks to keep and switch between several arrangements of
one graph. "Enrichment Map" re-runs the layout after thinning ("re-run layout") and wants "up-regulated
... and down-regulated pathways into two halves of the canvas", which is one arrangement edited.
"Condition Comparison" wants the SAME positions across two graphs ("Same node occupies the same
position in both views"), which is Cytoscape's Copycat and the designed `copyPositions` of the
comparison (`graphty-today.md` section 7.5), not a second arrangement of one graph. "Cluster and
Functionally Annotate a Molecular Network" wants layout per cluster, which is one arrangement built
in parts. The only real second arrangement is the element's own: 2D and 3D drawings of one graph.

**Finding.** Keeping several named arrangements of one graph is a library habit and an
investigation-tool side effect (one per Scene or visualization), not a requested feature. Every
end-user tool gives layout a home separate from statistics, and none shows which layout produced
the positions on screen.

**Recommendation.**
- **Positions are a property of the graph with two slots, 2D and 3D**, each with its pinned flags
  and a record of what produced it (layout, parameters, and "moved by hand" once a node is dragged).
  That record is the one place graphty goes beyond the tools, and it is what a methods section needs.
  A list of named arrangements referenced by views is the alternative; no workflow needs it, and
  two fixed slots are simpler to read and to store (section 20.9 is written to match). A saved
  view records which slot it uses (by its view mode) and a fingerprint of the positions, so
  reapplying it after a relayout says "positions changed since this view was saved" rather than
  showing a different picture silently. Named arrangements can be added later beside the two slots
  without changing them.
- **Layout has its own home, separate from measures.** A layout answers "where do I draw it", not
  "what is true of it", and every tool surveyed separates them. If graphty keeps one runnable
  catalogue, layouts are a separate section of it with their own verb ("Arrange"), and the current
  arrangement is shown as a property row of the graph ("Positions: ForceAtlas2, 3D, 12 nodes moved
  by hand").

### 20.28 Tuning a parameter of an existing result: revise in place or add beside

**Question.** When a reader changes a parameter of a result that already exists, do dependent
encodings, filters and legends follow the new value or stay on the old output? Does any tool keep
runs of one measure as versions with the earlier one reachable, and what is the explicit "keep both"
command called?

| Tool | What a changed parameter does | Do dependants follow? | Earlier output reachable? | "Keep both" |
|---|---|---|---|---|
| Tableau parameters | "all calculations that use that parameter are updated" | yes, live | no | none; a second parameter |
| Observable | "code re-runs automatically when referenced variables change" | yes, live | no | none; a second variable |
| Gephi Lite | a metric writes to an attribute name shown in an editable field before the run; if it exists, the panel warns "A node attribute named ... already exists. Its values will be overridden" (`src/locales/en.json`) | yes: size and colour bounds are recomputed from the attribute values on every change (`core/appearance/utils.ts`) | no | type a different attribute name |
| Gephi | re-running overwrites the column (section 20.2) | no: Appearance is a one-shot write (section 18, item 1), so colours stay on the old values until Apply is pressed again | no; the statistics report is kept ONE per statistic class (`StatisticsModelImpl` stores a map keyed by class), so the old report is replaced too | duplicate the column first |
| Cytoscape | re-running writes the same column names (section 20.2) | the mapping is live, so colours follow; but a continuous mapping's range is taken once: "The first time you open the editor, the Min and Max values are set by the range of the data column", and it moves only on Reset | no | clusterMaker2's "Cluster Attribute" name per run |
| Neo4j Bloom | every run is a new property "contains the name of the algorithm and a number", which "cannot" be renamed | no: rules bound to the old property stay on it; "Applying your selected algorithm does not immediately change anything in the Scene" | yes, as a sibling property | automatic |
| Kumu | "Each time you run the metric the previous values are overwritten" (section 20.2) | yes (decorations read the field) | no | rename the field first |

**Finding.** Where parameters are live (Tableau, Observable, Gephi Lite with its default name,
Cytoscape), the paved path is REVISE IN PLACE: one named result, and everything that reads it
follows. Where a run adds beside (Bloom), dependants stay on the old output and the reader re-points
them by hand. No tool keeps runs of one measure as versions with the earlier one reachable, other
than by undo. The "keep both" command is never a command: it is always a NAME typed before the run
(Gephi Lite's attribute field, clusterMaker2's Cluster Attribute, Kumu's renamed field, Gephi's
duplicated column), and Linkurious's "Duplicate" for whole visualizations.

**graphty-element today** is Bloom's side. A run's id is "the algorithm key, the parameters once
canonicalised, and the scope that was asked for" (`graphty-element/src/session/runs/runId.ts`), so
a tuned parameter mints a new id and a style layer bound to `results.<oldId>` keeps painting the old
output. An author-assigned id (`as`) cannot be re-pointed at a changed computation: the element
refuses with "The run id ... already names a different computation"
(`graphty-element/src/session/runs/RunsApi.ts`).

**Recommendation.**
- **Revise in place is the default for tuning.** Editing a parameter of an existing result replaces
  that result's values under the SAME name and reference key; encodings, filters and legends that
  read it follow, as in every live-parameter tool. The earlier output is not lost: the revision is a
  step in the analysis history (`design-method.md` section 3.6, supporting rule 3), so
  undo or the history returns to it. It is not a second row.
- **Add beside is an explicit command, named for what it does**: "Run as new..." with a name field,
  which is the tools' "type a new name first" made into one visible step. It is the right choice
  for Condition Comparison-style work (degree in each condition) and for comparing two resolutions.
- **Consequences.** The left panel and the style stack grow by one row per measure the reader keeps,
  not per run. The project file references a result by a stable name that survives revision, with
  the parameters as a property of the current revision; a digest of the parameters can stay as the
  cache key but must not be the key other objects reference. graphty-element needs a "revise this
  run" operation that keeps the id and re-executes with new parameters, which today's refusal rules
  out; the derived-id rule is published behaviour, so that change is a one-way door for the owner.
- **Adding beside answers "keep both", not "tune".** Making every changed parameter a new run
  (today's derived ids, and Bloom) leaves every encoding on the old output and grows a row per
  attempt; section 20.2 is written to match.

### 20.29 Degree and component membership: attributes at rest or measures that run

**Question.** In Gephi, Cytoscape, NetworkX and igraph, are degree, in- and out-degree, weighted
degree and component membership available without running anything, or are they statistics the user
runs that then appear as columns?

| Tool | Degree, in, out | Weighted degree | Component membership |
|---|---|---|---|
| NetworkX | at rest: `G.degree` is a view over the graph, always current; `G.in_degree`, `G.out_degree` (practitioner knowledge) | at rest: `G.degree(weight="weight")` | a function call, `connected_components(G)`; stored only if the user writes it back |
| igraph | a method, `g.degree(mode=...)`, not stored (practitioner knowledge) | `g.strength(weights=...)` | `g.connected_components().membership` |
| Gephi | BOTH. At rest: Appearance offers "Degree", "In-Degree" and "Out-Degree" as built-in graph functions read from the graph store (`AppearanceModelImpl` builds them from `graphModel.defaultColumns().degree()`), and Degree Range, In/Out Degree Range and Giant Component are built-in topology filters (`FiltersPlugin` `DegreeRangeBuilder`, `GiantComponentBuilder`). As a run: Average Degree writes stored `degree`, `indegree`, `outdegree` columns | only as a run: Average Weighted Degree writes "weighted degree" | only as a run: Connected Components writes "Component ID" (`componentnumber`) |
| Gephi Lite | a metric the user runs (`degreeMetric.ts`, with a kind of degree, in or out) | the same metric with an edge weight attribute | a metric |
| Cytoscape | Network Analyzer writes degree columns (section 1); the degree filter is built in | Network Analyzer (practitioner knowledge) | Network Analyzer (practitioner knowledge) |

**graphty-element today** already treats them as intrinsic in two places and as a run in a third:
the `Filter` kinds `degree` and `component` read them directly, and `data.statistics()` holds the
degree range, mean degree and component sizes at rest, but a per-node degree value, and so a degree
histogram or a degree colour, needs a `degree` run (`graphty-today.md` sections 3 and 7.8).

**Finding.** The analysis libraries and Gephi's own appearance and filter code treat plain degree as
a property of the graph that is always there; the GUI tools also offer it as a run because their
only road to the table is a column. Weighted degree and component membership are runs in every GUI
tool, and function calls in the libraries.

**Recommendation.** Plain degree, in-degree and out-degree, weighted degree over the declared weight
attribute (20.18), and component membership with the component's size are **attributes at rest**:
computed in linear time, always current, readable by the table, filters and style layers under
reserved names, with no row in the result list and no run record. They "follow" the data in
`design-method.md` section 3.6, and a run record for a value with one possible answer is clutter
that goes stale for nothing. Three limits keep this honest:
- a component NUMBER is not stable across edits, so anything that must remember "component 3" keeps
  a fixed set, as `design-method.md` section 3.6 says; at rest, components are numbered by size, largest first;
- weighted degree over any attribute other than the declared weight, and degree within a scope
  (inside a set), are runs, because they carry a choice the reader made;
- the degree distribution histogram is drawn from the at-rest degree, which removes today's need
  to run `degree` before the graph summary can show it.

### 20.30 What a per-window temporal result saves

**Question.** Where Gephi's dynamic statistics compute a series over windows, what goes into the
saved project: the values, the window and tick, or only the recipe? Do KeyLines or other time-bar
tools persist per-window results?

**Evidence.**
- **Gephi saves the values, and the recipe only as report text.** `DynamicDegree` writes each
  node's value for each window into a time-varying column (`IntervalIntegerMap` or
  `TimestampIntegerMap`, by the graph's time representation) with
  `n.setAttribute(dynamicDegreeColumn, degree, new Interval(low, low + tick))`, and the graph-level
  average as a time-varying graph attribute. Those columns are part of the graph and are saved with
  it. The window and tick appear only in the HTML report ("Window: ... Tick: ..."), and the project
  keeps one report per statistic class (`StatisticsModelImpl` writes `<reports>` from a map keyed by
  class), so a second dynamic run replaces the first run's recipe while its values may survive in
  the same columns.
- **KeyLines persists nothing per window.** "Each bar represents a period in time and is a cumulative
  count of all items within the range", computed by the time bar from the items' dates; "The time bar
  and chart are independent of one another", and its API offers `range()` and `getIds(dt1, dt2)`
  but no serialisation of per-window values. Combos are what the chart format serialises.
- Bloom's Slicer and Linkurious's Timeline are range filters with playback (section 20.1); neither
  computes a measure per window in the pages read.
- **The workflow**: "Network Evolution Analysis" asks for "Time-series of key network metrics",
  "New/disappeared entity lists per period" and lists "Computational cost of re-analyzing at each
  time point" as a pain point.

**Finding.** The one tool that computes measures per window stores the values and loses the
structured recipe; the time-bar tools store neither and recompute counts on the fly.

**Recommendation.** A temporal result stores BOTH, as one result: the recipe as structured fields
(the measure and its parameters, the lifetime key from section 20.1, window length, step, and
bounds), and the values keyed by window start. Graph-level series (counts, density, component count,
a modularity score) are small -- one number per window -- and are always stored. Per-node series
are stored for measures that hold their value (`design-method.md` section 3.6: centralities, communities);
measures that follow the data (degree, components, 20.29) store only the recipe, because
recomputing them per window is linear. At the element's load ceiling this bounds the file: 50,000
nodes over 100 windows is 5,000,000 values for one per-node series, which is why a follow measure
must not be stored per window and why a held per-node series is stored only when it was asked for.
The window key is the window's start on the lifetime key, with the length and step in the recipe,
so a series survives a change of display window without being re-keyed.

### 20.31 The scale of an encoding and the meaning of "statistics" while a filter hides part of the graph

**Question.** In Gephi, Cytoscape and Bloom, when a whole-graph measure is painted while a filter
hides part of the graph, is the colour and size scale set from the global range or the visible range,
and what did users report after Gephi added a local/global switch (issue 541)? Is there evidence that
analysts misread a whole-graph summary describing the loaded graph while a filter is active?

**Evidence.**
- **Gephi flipped from visible to global and made the scale a visible choice.** Issue 541 (opened
  4 March 2012): the ranking "currently uses only the visible graph for calculating the bounds. That
  makes comparaison between views difficult because the scale is modified", asking that "the min/max
  would be computed on the main view rather than on the visible view". The toggle shipped in 0.8.1
  beta; the first comments were "Honestly, that's so very useful", then a report that it "seems not
  to work" on a dynamic network, where the developer's answer was that the test data did not
  exercise it -- users could not tell which scale was in force from the picture alone. Today the
  default is GLOBAL (`DEFAULT_RANKING_LOCAL_SCALE = false`, and the same for partitions, in
  `AppearancePreferences.java`); local is a toggle whose tooltip reads "Use local scale. The bounds are
  calculated only on the visible graph instead of the complete graph", and the choice is saved per
  workspace in the project (`AppearanceModelPersistenceProvider` writes `<localscale ranking=...
  partition=...>`).
- **Gephi Lite** always takes size and colour bounds from the full dataset's values
  (`core/appearance/utils.ts` walks `nodeData`, not the filtered graph), recomputed on each change.
- **Cytoscape** takes a continuous mapping's range from "the range of the data column you selected",
  once, with Reset to re-read it; hiding nodes does not change the column (practitioner knowledge),
  so the scale is global and fixed.
- **KeyLines** draws the time bar's selection lines on "a different scale to the full data, to
  prevent them appearing too small": a local scale, but drawn as a separate, labelled series.
- **Bloom**: the legend and GDS pages read do not say where a range rule's bounds come from.
- **graphty-element** already takes an automatic domain from the whole column, over the elements
  the result measured, not from the visible ones: "A domain of 'auto' ... are all properties of the
  WHOLE column" (`graphty-element/src/session/styles/encoding.ts`), read by `readWholeColumn`
  (`session/styles/repaint.ts`); `data.statistics()` describes the whole loaded graph with
  `visibleNodes` and `visibleEdges` beside it (`graphty-today.md` section 7.7); and a run recorded as
  "visible" in fact computes over the whole loaded graph (same section).
- **Misreading a whole-graph summary.** No source read documents an analyst misreading a summary of
  the LOADED graph while a filter was active. The documented harms run the other way: Gephi issue 636
  (a column mixing values computed on two different filtered graphs, `graph-analysis.md` section 6.14)
  and issue 541 (a scale that moved with the filter). Gephi's resting counts follow the
  filter (section 20.7), and no complaint about that was found either.

**Finding.** The one tool that tried a visible-only scale changed its default to global after users
could not compare views, kept visible as an opt-in, and saved the choice with the project. The newer
tool (Gephi Lite) never offered visible-only. A scale that moves with a filter breaks comparison; a
global scale under a filter leaves colours unchanged as the reader narrows, which is what makes
"did the important nodes disappear?" answerable.

**Recommendation.**
- **An encoding's default domain is global**: the whole column over the elements the result
  measured, which is what graphty-element already does. "Fit to visible" is an explicit per-layer
  option, saved with the layer, and the legend always says which is in force ("scale: all 50,000
  nodes" or "scale: 1,204 visible nodes") -- the 541 thread shows the picture alone does not tell.
- **`statistics()` unqualified means the loaded graph**, as it does today, and it keeps the visible
  counts beside it; the UI shows both whenever a filter is active ("1,204 of 50,000 nodes visible").
  A scoped call answers for the visible graph or a set.
- **An unscoped run computes over the whole loaded graph**, and computing within the visible graph is
  an explicit, named scope, as `graph-analysis.md` section 6.14 recommends. The element must then
  record the scope it actually computed, which fixes today's mismatch.
- **Why not the visible graph, as Gephi's statistics and Kumu do.** Gephi's own reversal for
  scales, issue 636 for statistics, and the element's actual computation all point to the whole
  loaded graph; this agrees with `graph-analysis.md` section 6.14, and section 20.7 is written to
  match. Both defaults are published element behaviour, so the owner confirms them.

Sources for sections 20.25 to 20.31 (beyond those listed in the tool sections):
- https://github.com/gephi/gephi/issues/541 (issue text and comments, read through the GitHub API)
- Gephi source, https://github.com/gephi/gephi (master, read September 2026):
  `modules/AppearanceAPI/src/main/java/org/gephi/appearance/AppearanceModelImpl.java`,
  `.../AppearanceModelPersistenceProvider.java`,
  `modules/DesktopAppearance/src/main/java/org/gephi/desktop/appearance/options/AppearancePreferences.java`,
  `modules/DesktopAppearance/src/main/resources/org/gephi/desktop/appearance/Bundle.properties`,
  `modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Degree.java`,
  `.../WeightedDegree.java`, `.../ConnectedComponents.java`, `.../dynamic/DynamicDegree.java`,
  `modules/StatisticsAPI/src/main/java/org/gephi/statistics/StatisticsModelImpl.java`,
  `modules/LayoutAPI/src/main/java/org/gephi/layout/LayoutModelImpl.java`,
  `modules/FiltersPlugin/src/main/java/org/gephi/filters/plugin/graph/`
- Gephi Lite source, https://github.com/gephi/gephi-lite (read September 2026):
  `packages/gephi-lite/src/views/graphPage/panels/MetricsPanel.tsx`, `src/locales/en.json`,
  `src/core/metrics/index.ts`, `src/core/metrics/nodes/degreeMetric.ts`,
  `src/core/appearance/utils.ts`
- https://www.rbvi.ucsf.edu/cytoscape/groups/
- https://raw.githubusercontent.com/cytoscape/cytoscape-api/develop/group-api/src/main/java/org/cytoscape/group/CyGroup.java
- https://autoannotate.readthedocs.io/en/latest/
- https://autoannotate.readthedocs.io/en/latest/GroupingAndLayout.html
- https://autoannotate.readthedocs.io/en/latest/WorkingWithAutoAnnotate.html
- https://manual.cytoscape.org/en/stable/Navigation_and_Layout.html
- https://manual.cytoscape.org/en/stable/Styles.html
- https://doc.linkurious.com/user-manual/latest/nodegrouping/
- https://doc.linkurious.com/user-manual/latest/visualization-autosave/
- https://doc.linkurious.com/user-manual/latest/visualization-duplicate/
- https://doc.linkurious.com/user-manual/latest/layout/
- https://developers.cambridge-intelligence.com/docs/keylines/combos
- https://developers.cambridge-intelligence.com/docs/keylines/time-bar
- https://developers.cambridge-intelligence.com/api/keylines/time-bar
- https://docs.kumu.io/llms-full.txt ("Saving changes", the `@settings` reference, clustering)
- https://docs.kumu.io/guides/views.md
- https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/gds-integration/
- https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/legend-panel/
- https://help.tableau.com/current/pro/desktop/en-us/parameters_create.htm
- https://raw.githubusercontent.com/observablehq/framework/main/docs/reactivity.md
- graphty sources: `graphty-element/src/session/runs/runId.ts`, `graphty-element/src/session/runs/RunsApi.ts`,
  `graphty-element/src/session/styles/encoding.ts`, `graphty-element/src/session/styles/repaint.ts`
  (at commit `f449e107`), `design/designloom/capabilities/view-bookmarks.yaml`,
  `design/designloom/workflows/*.yaml`

## 21. What this means for graphty's framework

These are consequences of the survey for the decisions ahead, stated so each can be checked
against the evidence above.

1. The primary objects are nodes and edges, and the network as their container; everything
   else is secondary. This is unanimous (section 17, item 1) and matches the owner's brief
   that notes and views must not be conflated with graph objects.
2. Algorithm results should surface as ordinary node and edge attributes that the table,
   filters and styling all read, as in every tool (item 3). The run is a visible, named object
   on top of that, not a replacement for it: every tool that overwrites a result column also
   tells users to rename it first, so the named run is what users already build by hand
   (section 20.2). Tuning a parameter revises the result in place, with the earlier output in the
   history; "Run as new" keeps both (section 20.28). The closest precedent for the
   object is igraph's VertexClustering (a result object with a quality score and a membership
   column).
3. The whole-graph statistics surface (counts, components, density, degree distribution) is
   a first-class home in every analysis tool (item 4) and should be one in graphty. Unqualified,
   "the graph" means the whole loaded graph, for the summary and for an unscoped run alike; the
   visible graph is a named scope, and while a filter is active the summary shows both
   (sections 20.7 and 20.31).
4. Styling should offer the three mapping kinds plus a default, per channel (items 5, 6).
   Live rules, not one-shot writes (section 18, item 1). The stacking order must be drawn,
   because tools disagree on whether first or last wins (section 18, item 2). One-off
   per-element changes collect in a single, visible override layer rather than a hidden tier
   (section 20.4).
5. A query and what it does are separate choices: one predicate can select, hide, dim or
   style (item 8; section 18, item 5). Derived sets are saved as a structured specification;
   JMESPath stays inside its expression arm and is not the language users type (section 20.11).
6. Groups need two representations kept distinct: a partition result (data, a column) and a
   collapsed display of a set or a community (working display state captured by a view, with a
   count badge and meta-edges, never seen by analysis); "group" is not a graphty object word
   (section 20.25). Gephi removed
   hierarchical graphs, so graphty should not assume analysts expect nested hierarchies. A
   community is a column value promoted to a named set on demand, not an automatic row; a
   cover or a hierarchy is added beside the single `group` field, never by changing it
   (sections 20.3 and 20.6).
7. A saved, named path has no end-user precedent. It should be its own kind, an ordered edge
   sequence, with a family of paths kept as a list from one run (section 20.5). Its naming and
   behaviour must be tested against the workflows rather than copied.
8. Notes split into notes about an element and notes on the picture; both are secondary.
9. Time is an attribute of elements plus a range filter with playback; it is not a new kind
   of object. An element's lifetime is a list of intervals, an instant being a zero-length
   one, tested against the window by overlap (section 20.1).
10. Use the standard analyst vocabulary from section 19: node, edge, attribute, degree,
    component, community, partition, neighbourhood, subgraph, filter, statistics, view,
    project.
11. A saved view is a snapshot of the one working state (camera, view mode, visibility, visible
    layers, collapsed sets) that applying replaces, as an undoable step, with Update and Revert when
    it has changed since; it records which position slot it uses without copying positions
    (sections 20.9 and 20.26).
12. The project file refers to a node by its imported id and to an edge by its file id or by
    source, target and ordinal, never by a load-order counter, and it reports missing members
    on reopen (section 20.10).
13. A measure runs from one run dialog whose scope is always visible and changeable; the
    inspector of the graph or of a set opens it with that scope filled in, and a question about
    an element runs from the element (sections 20.8 and 20.23).
14. Filtering is one visibility state for the session, made of named rules combined by AND and each
    switchable on its own; it is not an ordered stack. Its status is stated in words beside the
    graph's counts, with one "Clear filters" command (section 20.13).
15. Sets, runs and style layers are listed separately; sets do not nest inside sets. A run may
    be shown under the set it ran on (section 20.14).
16. The kept, user-defined subset is a **set** in the UI, config and project file; the exported
    TypeScript type must not be named `Set` (section 20.15).
17. A path is a set with an ordered edge arm; a path result carries per-path ordered edge ids and
    a path index before k shortest paths ships, and the shortest-path run marks only the edges it
    took (section 20.16).
18. Communities are never matched across runs by the element; a kept community reports where its
    members went. Leiden gains a starting membership when seeding is needed (section 20.17).
19. Weight meaning (cost or strength) is an optional declaration on the data; every run records
    the meaning and any conversion it used (section 20.18).
20. An edge's key in the project file is the file's edge id, else a direction-aware endpoint pair
    plus ordinal; the element must make the file id the `EdgeId` before edge-holding sets ship
    (section 20.19).
21. A run stores its scope as specified and as resolved; measures over time are per-window series
    rather than runs that go stale as the window moves (section 20.20).
22. Neighbourhood expansion is a visible command on the selection (node inspector and context
    menu, with depth and direction), with double-click and a shortcut as fast routes (section
    20.21).
23. Cleaning lives in the table dock with the canvas visible; row commands are selection commands
    (section 20.22).
24. The project file holds a list of graphs with per-graph node identity and a separate comparison
    object with a declared match rule (section 20.24).
25. A collapsed group is not an object: a set or a community is shown collapsed (a count badge and
    meta-edges, expandable in place) as working display state that a view captures; analysis never
    sees it, and "group" is not a graphty object word (section 20.25).
26. Filters, visible layers, collapse, camera and view mode are one working state of the session; a
    saved view is a named snapshot that applying replaces, undoably, with Update and Revert; an export
    references a view rather than replacing it (section 20.26).
27. Positions are a graph property with a 2D and a 3D slot, each recording the layout, parameters and
    hand moves that produced it; layouts have a home separate from measures (section 20.27).
28. Tuning an existing result revises it in place under a stable reference key, with the earlier
    output in the history; "Run as new" with a name keeps both. graphty-element needs a revise
    operation that keeps the run id (section 20.28).
29. Degree, in- and out-degree, weighted degree over the declared weight, and component membership
    with size are attributes at rest, not runs (section 20.29).
30. A temporal result stores its structured recipe and its values keyed by window start; graph-level
    series always, per-node series only for measures that hold their value (section 20.30).
31. An encoding's automatic domain is global (the whole measured column), with "fit to visible" as a
    labelled per-layer option; `statistics()` and an unscoped run mean the whole loaded graph, and the
    visible graph is a named scope (section 20.31).

## Follow-up: what scope statistics are computed over in Gephi and Cytoscape

Question for the ontology: when an analyst restricts the graph, does restricting mean
**computing** over the smaller graph or only **drawing** less of it? Gephi and Cytoscape answer
in opposite ways, and both answers are rooted in code or manuals read for this note (section 20.7
has the wider survey).

| | Gephi | Cytoscape |
|---|---|---|
| How a restriction is made | a filter query in the Filters panel; its Filter button constrains the visible graph, its Select button only marks matches | a selection (from a filter or by hand), then File, New Network, From Selected Nodes, All Edges (the induced subgraph) or ..., Selected Edges |
| What the restriction is | a view of the same workspace: the full graph is still loaded, the filter decides what is "visible" | a new network, a sibling in the same collection, with its own name, view and Results Panel |
| What statistics compute over | the visible graph: `Degree.java` starts `Graph graph = graphModel.getGraphVisible();`, and Modularity and Graph Distance start from `getUndirectedGraphVisible()` / `getDirectedGraphVisible()` | the whole of the network it is run on; to analyse a subset "you can use the command File -> New Network -> From Selected Nodes, All Edges ... to create the desired subnetwork" |
| Analysing a subset in place | automatic whenever a filter is on | removed: "Prior versions of this tool offered the option of analyzing all nodes or only a selected subset. This is no longer supported directly in the program." |
| Where results land | columns on the one workspace table, overwritten by the next run whatever filter was on | columns on the subnetwork's rows |
| What goes wrong | a column holds values from different filters with nothing recording which (issues cited in section 20.31) | the subset is a copy; changes to one network do not follow to the other |

**Reading.**
- In both tools, restricting ends in **computing**: Gephi computes over whatever is visible,
  Cytoscape makes the subset its own network so that computing over it is ordinary. Neither
  treats a filter as drawing-only once a statistic runs.
- They differ in whether the scope is **explicit**. Gephi's scope is implicit (the current
  filter), which is why its results cannot say what they describe. Cytoscape's scope is a named
  object, so every result belongs to a network with a name -- at the cost of a copy.
- The combination the evidence supports: a restriction is a named object the analyst can compute
  over (Cytoscape's explicitness) without copying the graph (Gephi's single workspace), and every
  run records the scope it actually computed over. Hiding elements for the drawing stays a
  separate, drawing-only choice that never changes what an unscoped run means.

Sources read for this follow-up:
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Degree.java
- https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java (section on Gephi above)
- https://manual.cytoscape.org/en/stable/Network_Analyzer.html
- https://manual.cytoscape.org/en/stable/Finding_and_Filtering_Nodes_and_Edges.html (section on Cytoscape above)
