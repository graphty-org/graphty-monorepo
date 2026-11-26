# Graph Database Users Who Explore by Search, Query and Expand

## Summary

Many people who look at node-link diagrams at work never load a whole graph. Their graph lives in a
database (Neo4j, Amazon Neptune, Memgraph, TigerGraph, an RDF store) far too large to draw, and they see
it through a front end (Neo4j Browser, Bloom/Aura Explore, Linkurious Enterprise, Memgraph Lab, AWS Graph
Explorer, NeoDash) by typing a query, a search phrase or, increasingly, a plain-language question, getting
back tens to a few thousand elements, and expanding from there. Three groups dominate: developers who
write Cypher, Gremlin or SPARQL to check their model and queries; no-code analysts and investigators who
use search phrases, templates and co-pilots a developer prepared for them; and application developers
who embed a database-backed graph view in their own product with an SDK (Neo4j's Visualization Library,
KeyLines, yFiles) and write the fetch, mapping and expand logic themselves. A fourth group never touches
a graph database: warehouse analysts and data engineers who define a property graph over existing
tables (BigQuery Graph, Spanner Graph, Microsoft Fabric graph, Oracle SQL property graphs, PuppyGraph)
and get results as JSON graph elements or element ids, capped by bytes rather than node counts. All
start from a known entity or a query, not an overview; every tool caps what reaches the screen; and an
algorithm run in the front end gives different answers on the drawn subgraph than on the stored graph.

## 1. Population

### Who they are

- **Graph database developers and data engineers** building an application or knowledge graph. Neo4j
  calls Browser "a developer-focused tool" [S13]; job ads ask them to "develop and optimize Cypher
  queries" [S40]. They also draw the intended model before importing [S50][S51]. In an interview study of knowledge graph practitioners, 12 of 19 were "Builders"
  (database, data management or modeling experts who create the graph and design its schema) [S30].
- **Analysts and data scientists who query.** 17 of the same 19 practitioners were "Analysts" who
  extract insights for reports or machine learning; 7 of 19 stored data in Neo4j with Cypher and 6 of 19
  in RDF with SPARQL [S30]. They draw results in notebooks and pull subgraphs into Gephi or NetworkX
  (workflow 4.7), the hand-off point to the network-science population.
- **Application developers who embed a database-backed graph view** in investigation consoles,
  customer-360 or topology screens. Neo4j's NVL builds "custom graph visualizations like those used in
  Neo4j Bloom" [S56] and is "free to use with a Neo4j license" [S57]. Alternatives are neovis.js [S58], yFiles, Ogma and
  KeyLines/ReGraph (see `developers-embedding-and-extending-graph-visualization.md`). For
  graphty-element this group is the most direct user (workflow 4.9).
- **No-code business users and investigators:** AML and fraud analysts, compliance officers,
  journalists, engineers, supply chain and IT operations staff. Neo4j positions Bloom as a codeless "search-to-storyboard" tool for non-technical
  users, with technical users building "custom, reusable searches" for them [S22]. Only 2 of 19 knowledge
  graph practitioners were "Consumers" [S30], so research samples under-represent them. The same
  investigators appear in `law-enforcement-and-intelligence-analysts.md` and
  `financial-crime-fraud-aml-kyc.md`; here only their database front-end work is covered, including
  natural-language co-pilots (workflow 4.8).
- **Warehouse and relational analysts who query a graph defined over tables.** SQL-fluent analysts,
  data engineers and security or fraud teams whose data already sits in BigQuery, Spanner, a Fabric
  lakehouse, Oracle Database or a lake. They declare which tables are nodes and edges and query in ISO GQL
  or SQL/PGQ (`GRAPH_TABLE`) with no copy: BigQuery Graph is "a logical layer on top of your existing
  data" and needs no replication [S73]; PuppyGraph maps tables to nodes and edges for Cypher or Gremlin
  without ETL [S84]. Named users are vendor-reported: Thales (security signals clustered into "attack
  stories"), Yahoo (ad campaigns and outcomes) and Workerbee on BigQuery Graph [S76]; DANA (anti-money
  laundering), Palo Alto Networks (an "Access Graph" of identities and permissions), Verisoul, Target
  and MasOrange on Spanner Graph [S79]. Workflow 4.10.
- **Graph solution builders.** The person in between: usually the developer or a solutions consultant,
  who creates perspectives, search phrases, scene actions, query templates, alerts and role mappings for
  the business users [S6][S8][S10][S20], and now enables and checks the co-pilots that read the schema
  [S59][S63].

### Sectors and organizations (documented)

Financial crime at banks and money transfer firms (BforBank, a European bank on Bloom, Ria) [S24][S25]
[S26]; investigative journalism (ICIJ: Panama Papers, Paradise Papers, Pandora Papers) [S27][S28];
government and space (NASA lessons learned) [S29]; tax and revenue agencies (Indian tax department, UK
HMRC) listed as Linkurious customers [S41]; police and defense on GraphAware Hume [S64]; security, ad
tech, retail, payments and telecom on warehouse graphs (Thales, Yahoo, DANA, Target, MasOrange) [S76][S79].

### Size of the population

- **Neo4j** says it is trusted by 84 of the Fortune 100 and more than half of the Fortune 500 (October
  2025 press release); boilerplate in 2025 cites "over 300,000 developers, data scientists, and
  architects"; over 1,700 customers [S32]. All self-reported.
- **Linkurious** had an annualized contract value of about EUR 7 million as of June 2025 and agreed to be
  acquired by Nuix in December 2025 [S41]. No published user count was verified (a "3,000 investigators"
  figure circulates but no primary source was found).
- **Memgraph, TigerGraph, AWS Graph Explorer:** no user counts found.
- **Graph over warehouse tables:** no figure comparing it with dedicated graph databases, and no job
  posting naming BigQuery Graph or SQL/PGQ, was found. BigQuery Graph reached general availability on
  2026-08-31 [S76]; SQL/PGQ was reverted from PostgreSQL 19 on 2026-09-07 [S85]. Vendor case studies show
  movement, e.g. Verisoul consolidating services that included Neo4j onto Spanner [S79].
- **Proportion who visualize:** in a survey of 89 graph-processing users, graph visualization was the
  most popular non-query task (55 of 89 participants) [S31].

### Frequency and skills

- Developers touch Browser-style tools many times a day while building a model or debugging a query; the
  European bank reports that analysts "across the anti-financial crime teams use Neo4j Bloom daily" [S25].
- Graph literacy splits sharply: developers know the schema intimately but often not network analysis;
  business users know the domain but neither the schema nor a query language. ICIJ notes many reporters
  "were not very tech-savvy" and most did not write queries [S27]. Warehouse analysts know SQL and the
  tables but not graph query patterns, hence Fabric's no-code builder and generated starter queries in
  Oracle [S82][S83].
- Teams are usually a pair: one prepares the database view, one explores it; Linkurious and Bloom build
  access control around this split [S10][S20].

## 2. Personas

### Priya -- graph database developer (id: `graph-database-developer`)

- **Role:** Backend engineer on a team building a recommendation and entity resolution service on Neo4j
  (or Neptune, or Memgraph).
- **Background:** SQL first, Cypher learned on the job; treats the graph as an application store.
- **Tools today:** Arrows.app or Data Importer to draw the model, Neo4j Browser or Aura Query,
  cypher-shell, APOC, Memgraph Lab or AWS graph-notebook [S13][S14][S38][S50][S51].
- **Data:** Millions of nodes stored; tens to a few hundred on screen (Browser caps at 1,000) [S12b].
- **Goals:** Check that the drawn model matches what the import produced; see why a query
  returns too much, too little or runs slowly; show a teammate what a pattern looks like.
- **Frustrations:** "what it draws and what the query results are can be different" [S15]; "the Neo4j
  UI crashes or goes page unresponsive" after raising the limit to 1,000 [S16]; the schema view "does not
  work very well for non-trivial schemata" [S17].

### Kenji -- application developer embedding a database-backed graph view (id: `graph-database-app-developer`)

- **Role:** Full-stack engineer building the "connections" screen of an investigation or customer-360
  application on Neo4j or Neptune.
- **Tools today:** A JavaScript SDK (NVL, neovis.js, KeyLines, Ogma, yFiles), the database driver, a
  small backend API holding prepared Cypher or Gremlin [S57][S58][S65].
- **Goals:** End users click an entity, double-click to expand, see details in a side panel, no query
  language.
- **Frustrations:** The SDK draws but does not fetch: record-to-graph conversion, expand queries, hub
  thresholds and parallel-edge aggregation are all his own code (workflow 4.9) [S65][S66]; NVL is free
  only with a Neo4j license [S57].

### Marc -- graph solutions engineer who prepares views for colleagues (id: `graph-perspective-curator`)

- **Role:** Data engineer or vendor consultant responsible for making the graph usable by an
  investigations or operations team.
- **Tools today:** Bloom/Explore perspective editor, Linkurious query templates and alert models, NeoDash
  for dashboards, deep links embedded in other applications [S6][S8][S10][S21][S23].
- **Goals:** Turn the questions the business keeps asking into one-click search phrases and templates;
  decide which labels and properties users see; meaningful styling; no accidental writes; small scenes.
- **New duties:** Enabling co-pilots and choosing which LLM provider may see the schema [S1][S59][S60];
  running whole-graph algorithms that write scores back [S67].
- **Frustrations:** "there isn't a way to use currently displayed or selected data within the search
  phrase query" [S4]; generated perspectives need pruning [S6]; Bloom may read a Double as a String in
  rules [S19]; the 10,000-record phrase ceiling [S8].

### Sofia -- no-code financial crime investigator (id: `no-code-graph-investigator`)

- **Role:** AML or fraud analyst in a bank's compliance unit; works alerts produced by rules or models.
- **Background:** Domain expert in typologies (mule networks, phishing, identity theft); no Cypher.
- **Tools today:** Bloom/Explore or Linkurious Enterprise (with its co-pilot if her bank enables one),
  the alerting/case system, Excel exports.
- **Data:** Customers, accounts, transfers, check cashing, IP addresses, emails, postal addresses
  (BforBank) [S24]; transaction, customer and account data (European bank) [S25].
- **Goals:** From one flagged client, see within minutes who shares an IP, email or address; decide
  whether it is a ring; document it. BforBank reports a ring of 11 fraudsters identified "within half an
  hour" where a similar case had taken several days [S24].
- **Frustrations:** Relational lookups took "2 minutes to several hours" [S24]; "No human can really
  effectively read something out of 10,000 payments in a list" [S25]; hub nodes explode the view, hence
  Linkurious' refine dialog above 50 neighbors [S11].

### Daniel -- investigative journalist on a leaked-records graph (id: `investigative-journalist`)

- **Role:** Reporter on a cross-border collaboration.
- **Tools today:** Full-text document search plus a graph front end on Neo4j (ICIJ used Linkurious;
  later Bloom inside ICIJ Datashare) [S27][S28].
- **Data:** ICIJ's Panama Papers graph had "around 950,000 nodes and 1.2 million edges" (about 4 GB),
  extracted from 11.5 million files [S27]; the public Offshore Leaks database now covers more than 810,000
  offshore entities [S36].
- **Goals:** Type a politician's or company's name, see fuzzy-matched variants, expand to officers,
  intermediaries and addresses, find the shortest path between two people with one click, embed a graph
  in a story [S27].
- **Frustrations:** Name variants and duplicates; not knowing what was left out of a capped result.

### Aisha -- warehouse analyst querying a graph defined over tables (id: `warehouse-graph-analyst`)

- **Role:** Analyst or analytics engineer on a security, fraud or marketing data team whose data lives
  in BigQuery, a Fabric lakehouse or Oracle; fluent in SQL, new to graph query languages.
- **Tools today:** BigQuery Studio or Spanner Studio, BigQuery or Colab notebooks (`%%bigquery --graph`),
  the Fabric graph model and query builder, Oracle Graph Explorer [S74][S78][S80][S83].
- **Data:** The warehouse's own tables (accounts, transfers, security events, customers and orders);
  the graph is a definition over them, not a copy [S73][S80].
- **Goals:** Multi-hop questions that are awkward in SQL (transfer chains of 2 to 5 hops, linked
  identities, attack paths) without moving data out of the warehouse [S76][S77].
- **Frustrations:** A query draws only if it returns whole graph elements (`TO_JSON` of paths, or vertex
  and edge ids); a property-only result shows as a table [S74][S78][S83]. Notebook results are cut at
  2 MB, Spanner Studio at 10 MB [S74][S78]. Fabric cannot yet export graph results or connect Power BI to
  a graph [S81].

## 3. Use cases (ranked)

| Rank | Question                                                                                                                                                     | Who                              | Frequency                            | Stakes                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| 1    | "Show me everything connected to this customer / account / company / person" (ego network from a search)                                                     | Investigators, journalists, SMEs | Many times a day [S25]               | High: alert disposition, freezing funds, publication    |
| 2    | "Did my import / query return the shape I expect?"                                                                                                           | Developers                       | Many times a day while building      | Medium: wrong model propagates to every downstream user |
| 3    | "Are these two entities connected, and how?" (shortest path, paths between)                                                                                  | Investigators, journalists       | Daily                                | High: evidence of a link [S7][S27]                      |
| 4    | "Run the standard pattern for X" (search phrase or template: UBOs above 20 percent, shared-attribute ring, impact of a database outage, crimes within 500 m) | Business users via curator       | Daily                                | High [S9]                                               |
| 5    | "Why is this query slow / why does the view not match the result?"                                                                                           | Developers                       | Weekly                               | Medium [S15]                                            |
| 6    | "Who shares an identifier with this flagged client?" (common neighbors on IP, email, address)                                                                | Fraud analysts                   | Per alert                            | High [S24]                                              |
| 7    | "What changed over time in this neighborhood?" (timeline, slicer)                                                                                            | Investigators                    | Weekly                               | Medium [S10][S34]                                       |
| 8    | "Save and hand over what I found" (scene, visualization, case)                                                                                               | All                              | Per case                             | High: audit, collaboration [S5][S10]                    |
| 9    | "Which of these matter most, and which belong together?" (centrality, communities in the scene or the whole store)                                           | Investigators, curators          | Per case                             | Medium-high: a scene-only score can mislead [S67][S68]  |
| 10   | "Give our users a connections screen in our own app"                                                                                                         | Application developers           | Per product, then daily by end users | High: the product's core view [S57][S65]                |
| 11   | "Show the whole graph"                                                                                                                                       | New users                        | Once, then abandoned                 | Low: tools refuse it by design [S3]                     |
| 12   | "Which accounts are 2-5 transfers from this one?" over warehouse tables, no copy                                                                             | Warehouse analysts               | Per investigation                    | High: fraud rings, attack paths [S76][S77]              |

## 4. Step-by-step workflows

Durations: no source gives per-step timings, except the end-to-end BforBank figure (half an hour for an
11-person ring) [S24]. Where a step says "seconds", it is the interaction cost, not a measured figure.

### 4.1 Search phrase to saved scene in Neo4j Bloom / Aura Explore (no-code user)

Source: Bloom user guide and tutorials [S1][S2][S5][S7][S8][S18][S34].

1. **Open a perspective** mapped to the user's database role; it "defines the business context depicted
   in the scene": categories, visible properties and relationship types, styles, saved Cypher [S6][S18].
2. **Search.** Suggestions are of four kinds: a search phrase (alias for saved, possibly parameterized
   Cypher), a near-natural-language pattern of labels, relationship types and indexed values, a
   full-text search, and actions ("Expand selection", "Dismiss others") [S1]. Parameterized phrases such
   as `Customers from $country ordering $category` show chained suggestion lists [S8].
3. **Result lands in the scene,** added to what is there, up to the Node query limit (100-10,000;
   1,000 default per staff); search phrases process at most 10,000 records [S3][S8][S35]. Bloom is "not
   built to load an entire graph by default" (Neo4j staff) [S3].
4. **Inspect.** Hover shows caption properties; double-click opens the Inspector [S2].
5. **Expand on demand.** Right-click: Expand (capped by the Node query limit), Expand with a per-call
   limit, or Advanced Expansion (relationship types, direction, neighbor categories, limit); "Reveal
   relationships" adds edges among nodes already shown [S2].
6. **Find connections.** Two nodes, right-click, "Shortest Path" (within 20 hops, first path found) [S2];
   it "may not be the one you were expecting" [S7].
7. **Reduce.** Filter drawer with histograms and sliders; filtered elements grey out and can be
   dismissed; filters are not saved; "Dismiss single nodes" [S2]. The Slicer animates up to five ranges
   over a numeric or temporal property [S34].
8. **Run a graph algorithm (Graph Data Science drawer, Bloom 2.3 and later).** Pick Betweenness, Degree,
   Eigenvector or PageRank centrality, or Louvain, Label Propagation or Weakly Connected Components;
   optionally restrict to labels and relationship types and set the traversal orientation. Then choose
   the scope [S67]:
    - **Current scene:** runs only on the drawn elements and "does not alter the underlying data"; the
      scores live in the scene only.
    - **Entire graph:** "adds a new database property containing the individual score to all affected
      elements"; the name cannot be changed, and removing it takes a Cypher query.
      Neo4j warns that "output will be different" between the two: an ingredient with degree 6 in a scene
      has more than 16,000 recipes in the store [S68]. GDS features need the GDS plugin or Aura Graph Analytics [S67][S69].
9. **Style from the result:** centrality as size or color gradient, communities as one color each;
   running the algorithm alone changes nothing on screen [S67][S69]. Rule-based styling works on any
   string, numeric, boolean or temporal property [S19].
10. **Group and lay out.** Group nodes, group parallel relationships with a count; force-based (two
    kinds), hierarchical, coordinate (lat/long) and circular layouts [S2].
11. **Save and share.** Scenes (3 on Free, 5 on Pro, unlimited on Enterprise) are shared view-only and
    can be copied; export PNG, SVG or CSV, or send a deep link [S5].

Decision points: which search phrase fits; whether a node is a hub worth expanding (no degree badge is
documented in Bloom, unlike Linkurious); when to dismiss; whether the 1,000-node cap has silently cut the
answer (users report Explore showing 38 of 236 nodes and assume data is missing) [S3]; whether an
algorithm should run on the scene (safe, local, possibly misleading) or the whole graph (writes to the
database) [S67][S68].

### 4.2 Search, expand and investigate in Linkurious Enterprise (investigator)

Source: Linkurious user and admin manuals [S9][S10][S11][S37].

1. **Search.** Type at least 3 characters (`minSearchQueryLength` default 3) [S11]. Scope ALL (database)
   or LOCAL (current visualization); toggle to edges; Advanced narrows by category, fuzziness and property
   filters; syntax `type:Person`, `name:john`, quotes to disable fuzziness [S10].
2. **Add.** Click a result, or check several and "ADD ALL" (at most 500 at once, `searchAddAllThreshold`)
   [S10][S11].
3. **Read the badge.** A circular badge shows each node's number of undisplayed relationships [S10].
4. **Expand.** Double-click to reveal neighbors. If a node has more edges than `expandThreshold` (default 50) but fewer than `superNodeThreshold` (default 10,000), the Selective Expand dialog opens: pick
   category and edge type, degree (Neighbors, Most connected, Least connected) and maximum neighbors
   [S10][S11]. Above the supernode threshold, the node shows a plus badge with its connection count, a
   dialog lists relationships and categories, and multi-node expand is disabled if any selected node is a
   supernode [S10][S37].
5. **Run queries and templates.** Templates take typed inputs (`node`, `nodeset`, `edge`, `string`,
   `number`, `date`, `enum`), e.g. "Maximum path length" default 4 (1-10); a No-Code Query Builder chains
   node and connection blocks; raw queries return at most 500 results and time out after 60 s
   [S10][S11]. Typical templates: UBOs above 20 percent, outage impact, common neighbors of a set [S9].
6. **Filter, group, time and place.** Per-category filters; dates only through the Timeline ("As at"
   mode); geo mode on lat/long; node grouping and edge grouping with Sum/Average/Min/Max [S10].
7. **Style, annotate, share.** Color and size (linear or log) by property, icons; sticky notes kept
   with the visualization; share as View-only, Edit, or Edit and share [S10].
8. **Export.** Data as Excel, CSV, GEXF, GraphML or JSON (no visual properties); images as SVG, PNG or
   PDF [S10].
9. **Alerts and cases.** Scheduled Cypher or Gremlin alert models turn each match into a case with
   status and assignee; opening one lands at step 3 with the seed subgraph [S10].

### 4.3 Debugging a data model and query in Neo4j Browser (developer)

Source: Browser manual (current and legacy), Data Importer and Arrows docs, Neo4j developer blog,
community threads [S12][S12b][S13][S15][S16][S17][S50][S51][S70].

0. **Draw the model first** in Arrows.app (exports an image or Cypher) [S51] or on the Data Importer
   canvas: Add Node, type a label, drag a handle to another node for a relationship, map each element to
   a source file, id column and property columns [S50]. This is authoring, not exploring.
1. **Look at the schema and compare.** `CALL db.schema.visualization()` shows the imported labels and
   relationship types as a small meta-graph [S13]; current Browser's Database Information drawer lists
   labels, relationship types and property keys [S70]. The developer compares this with the drawn model
   by eye; no tool found shows the difference. yWorks notes the built-in viewer "does not work very well
   for non-trivial schemata" [S17].
2. **Pull a sample, then write targeted patterns,** always with a `LIMIT` [S15][S16].
3. **Read the result** as Graph, Table or RAW [S13]. Current Browser caps at `maxVizNodes` 1,000,
   `maxNewNeighbours` 100 and `recordLimit` 1,000 [S12b]; legacy Browser drew 300 first and had "Connect
   result nodes" on, fetching relationships among returned nodes [S12]. Aura Query's limit does not change
   Explore's 1,000 [S33b].
4. **Notice the mismatch.** Overlapping paths flatten: 47 nodes and 70 relationships on screen can stand
   for 5,673 unique paths [S15]. Returning only relationships, or nodes without relationships, gives
   empty-looking graphs; return paths or `n, r, m` [S8][S16].
5. **Separate execution from rendering.** `RETURN count(path)` to size the result; `PROFILE` (plan view
   replaces graph view) and `EXPLAIN`; cypher-shell `--format plain` to bypass rendering; if PROFILE is
   fast but the view is slow, "the problem is rendering" [S15]. Community rule of thumb: more than about
   100-500 nodes "might result in slowness" in Browser [S16].
6. **Narrow.** Add `LIMIT`, bound variable-length patterns (`*1..3`), return only needed properties or
   ids [S15][S16].
7. **Hand off.** Copy the query into a Bloom search phrase, a Linkurious template or NeoDash report; or,
   in Aura, choose "Explore graph" on a Query result to continue in Explore [S3].

### 4.4 Preparing a perspective and saved queries for non-technical colleagues (curator)

Source: Bloom perspective, search phrase, deep link and RBAC docs; Linkurious manual [S6][S8][S10][S18]
[S20][S21][S23].

1. **Create the perspective:** "Generate Perspective" (quick scan above 10,000,000 elements) or "Blank
   Perspective" [S6].
2. **Define categories in business terms,** first match wins; hide properties and relationship types
   [S6]. "a great Bloom experience is dependent on a good data model" [S7].
3. **Style.** Colors, sizes, icons and rule-based styles in the Legend panel [S6][S19].
4. **Write search phrases:** typed `$parameters`, a suggestion source, the Cypher; read-only unless
   "Write transaction" is set, since end users "may not understand the consequences" [S8].
5. **Write scene actions:** Cypher run from the right-click menu on selected nodes [S6][S18].
6. **Grant access:** one custom role per perspective [S20]; Linkurious shares templates with groups
   under four rights levels [S10].
7. **Embed entry points:** deep links with `search=`, `perspective=` and `run=true`, "generated
   programmatically" from other systems [S21][S22]; NeoDash Parameter Select reports [S23].
8. **Export the perspective** as JSON for version control or transfer [S5][S18].

### 4.5 Gremlin / openCypher / SPARQL exploration on Neptune (developer and analyst)

Source: AWS Graph Explorer docs and Neptune notebook docs [S14][S38][S42].

1. **Connect** to Neptune, any Gremlin Server or a SPARQL endpoint, choosing Gremlin, openCypher or
   SPARQL, with an optional neighbor expansion limit [S42].
2. **Search** by label and attribute with partial text match, or run any query; add one or all results
   to the canvas [S14].
3. **Expand** by double-click; the Expand panel filters by label, attribute and maximum count [S14].
4. **Filter** by type, table column, or a "Neighbors" filter (at least N neighbors) [S14].
5. **Save** a JSON graph others on the same connection can reload; export tables as CSV or JSON [S14].
6. **Notebook variant.** In graph-notebook, a Gremlin query must return a `path()` to be drawn, with `-p`
   hints (`v,oute,inv`) and `-g` group-by; SPARQL draws only `SELECT ?s ?p ?o` results, with literals
   folded into node details unless `--expand-all` [S38].

### 4.6 What users do when they hit the caps

Documented workarounds [S3][S4][S16][S33]:

- **Select-expand-repeat,** or a paged search phrase by id range, "the hacky way to page" [S4].
- **Search per type, then Reveal relationships** (staff advice for 38 of 236 nodes shown) [S3].
- **Raise the limit** -- often freezes the UI [S16].
- **Switch tools:** Bloom over Browser [S16]; Memgraph Lab offers "render anyway or switch to data view"
  [S43]; in BigQuery, move from a notebook (2 MB) to the console (no hard limit) [S74].
- **Fall back to tables:** one practitioner reported end users "preferred a table" to a custom graph GUI
  [S30].

### 4.7 Pulling a subgraph out of the database into a notebook or Gephi (analyst, data scientist)

Source: [S38][S53][S54][S55][S71].

1. **Query from a notebook.** `Neo4jGraphWidget(driver).show_cypher(query)` draws returned elements;
   `autocomplete_relationships` fills in relationships among them; selected ids feed the next query
   [S53]. Alternatives: `neo4j-viz` (built on NVL; GDS projections, query results or DataFrames) [S55];
   graph-notebook for Neptune (step 6 of 4.5) [S38]; `%%bigquery --graph` (workflow 4.10) [S74].
2. **Hand the subgraph to Gephi.** Start Gephi's Graph Streaming server, collect paths in Cypher
   (examples cap at 1,000) and call `apoc.gephi.add(...)`, which assigns random coordinates because Gephi
   will not draw nodes without them; it is in APOC Extended [S54].
3. **Or export a file** (GraphML, GEXF) from Linkurious or yWorks Data Explorer and open it in Gephi or
   NetworkX [S10][S52].
4. **Failure modes reported:** broken on Gephi 0.9 for one user ("now-defunct"); "Invalid UTF-8"
   errors from special characters for another [S71].

### 4.8 Asking in plain language (no-code user, with a co-pilot)

Source: [S1][S59][S60][S61][S62][S63].

1. **An administrator enables it:** an organization setting in Aura [S1]; a provider and key in NeoDash
   [S63]; "if your administrator enabled it" in Linkurious [S60][S61].
2. **Type a question.** Aura Explore's co-pilot "suggests a pattern in the search bar" [S1]; Aura
   Query's is primed with the schema, not the data, so it can guess wrong values [S59]; Linkurious Query
   AI works with "ChatGPT, Gemini, Claude, and more" [S60][S62].
3. **Review the generated query,** edit it or regenerate [S59][S60]; NeoDash's Run executes without
   review [S63]. Known errors: reversed directions, deprecated syntax, unbounded traversals [S59].
4. **Run, then continue as in 4.1 or 4.2.** Linkurious Copilot can also select, zoom, group and filter,
   asking approval before each action [S61].
5. **Trust check.** Every vendor warns the output may be wrong (Aura "experimental", NeoDash
   "non-deterministic") [S1][S63].

### 4.9 Building a database-backed graph view into an application (application developer)

Source: [S56][S57][S58][S65][S66]; `developers-embedding-and-extending-graph-visualization.md`
workflow 5.3 covers the same screen from the product side.

1. **Install the SDK.** `npm install @neo4j-nvl/base`, plus `@neo4j-nvl/interaction-handlers` for
   standard interactions and `@neo4j-nvl/react` for React; give the container an explicit height or the
   graph does not show [S57][S66].
2. **Connect a driver behind an API.** KeyLines' tutorial runs prepared Cypher in an Express route
   with `disableLosslessIntegers: true` [S65]; neovis.js takes connection details, `initialCypher` and
   per-label mappings in one config [S58].
3. **Map records by hand:** NVL wants `{id}` nodes and `{id, from, to}` relationships [S66]; KeyLines
   wants `node` and `link` items passed to `chart.expand()` [S65].
4. **Implement expand on double-click**: an event handler (NVL's `getHits` reports what is under the
   pointer [S57]) calls a parameterized backend query and merges new items by id. The query, its `LIMIT`
   and any hub threshold are the developer's code; no fetched SDK page documents a supernode rule.
5. **Style from properties** (neovis.js: size, color, edge thickness from a property [S58]) and wire
   selection to a side panel.

### 4.10 From warehouse tables to a drawn graph (SQL analyst, data engineer)

Source: [S73][S74][S75][S76][S77][S78][S80][S81][S82][S83][S84].

1. **Declare the graph over existing tables.** In BigQuery and Spanner, DDL of the form
   `CREATE PROPERTY GRAPH ... NODE TABLES (customers AS Customer KEY (customer_id), ...) EDGE TABLES
(purchases AS Bought KEY (purchase_id) SOURCE KEY (customer_id) REFERENCES Customer (customer_id)
DESTINATION KEY ...)`; the tables can even sit in federated catalogs [S76]. Underlying column and row
   security still apply, and storage is billed once [S73]. In Fabric, the analyst does the same with a
   form: New item, Graph model, Get data from the OneLake catalog, then Add node (label, source table,
   key column, "Add all columns" as properties) and Add edge (label, source table, origin and target
   node and key columns), then Save [S80]. Fabric then ingests the tables into a "read-optimized"
   graph; a schema change triggers a reload, and large graphs "may take several hours" [S81]. Oracle
   needs the CREATE PROPERTY GRAPH privilege; PuppyGraph needs a schema mapping tables to nodes and
   edges, or its AI can propose one [S84].
2. **Look at the schema.** BigQuery Studio: Explorer, dataset, Graphs, Graph tab; Spanner: "Switch to
   schema view"; both draw node and edge types and how they connect [S74][S78].
3. **Write a query that returns graph elements.** BigQuery and Spanner require `TO_JSON` (or
   `SAFE_TO_JSON`) and recommend returning whole paths (`RETURN TO_JSON(p) AS path`); returning ids or
   properties gives a table only, and returning separate nodes and edges can drop elements [S74][S78].
   Oracle `GRAPH_TABLE` queries must return `VERTEX_ID`, `EDGE_ID` or both; only SELECT is supported
   [S83]. Fabric offers a no-code query builder (Add a node, pick edges in the Components pane, which
   adds the connected node, add a Filter such as `fullName = Carla Adams`) or a GQL code editor; the
   builder's path patterns stop at eight hops [S81][S82].
4. **Run and read.** BigQuery Studio: Query results, Graph; a detail panel counts node and edge labels;
   click an element for properties and neighbors [S74]. Spanner Studio: force (default), hierarchical or
   sequential layout; right-click Expand by incoming, outgoing or a given edge type, Collapse, Hide,
   "Show only neighbors"; display choices last only for the session [S78]. Fabric: Diagram, Card or Table
   view; hover shows connected nodes [S82].
5. **Hit the size cap.** BigQuery notebooks visualize at most 2 MB and partially draw anything larger;
   the console "doesn't have a hard limit" [S74]. Spanner Studio draws at most 10 MB [S78]. Fabric
   truncates a response above 64 MB with a warning and no continuation token [S81]. The advice in every
   case is to narrow the query.
6. **Save, share or move out.** Fabric saves queries in a read-only "queryset" shared with workspace
   members; exporting graph results is not supported [S81][S82]. For more, Google points to partner
   tools: G.V(), Graphistry, Kineviz GraphXR and Linkurious Enterprise [S75][S77]. No page found
   documents how results are handed to them; notebooks, where results can be processed "by using SQL,
   Python, and other common packages", are the documented route out [S75].

The same GQL runs on Spanner Graph for operational checks (block a suspicious transfer) and on BigQuery
Graph for historical analysis (long-running fraud rings), and BigQuery can query Spanner data in place
[S77]; BigQuery's conversational agent "visualizes the traversal for path-based answers" [S76].

## 5. Overview first or search first?

Shneiderman's "overview first, zoom and filter, then details-on-demand" [S44] underlies Graphty's W02.
Van Ham and Perer (InfoVis 2009) argue that for large graphs an overview is often "not relevant or
practical" and propose "search, show context, expand on demand", shown on over 3 million legal citations
[S45]; Apolo (CHI 2011) likewise supports "bottom-up sensemaking ... starting small" [S46]. Every front end
reviewed starts from a search box, query editor or query builder; Bloom calls itself a "search-first
environment" [S1]. Overview survives as a schema or sample check: knowledge graph Builders verify "the
graph is connected as expected" (9 of 12), but "I don't want to have to see the full graph" (P6) [S30];
BigQuery, Spanner and Neo4j all offer a schema view [S13][S74][S78]. No controlled study comparing the
two strategies on graph databases was found.

## 6. Data

### Stored size versus on-screen size (documented cases)

| Case                                  | Stored                                                            | On screen / per query                                                                        |
| ------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ICIJ Panama Papers                    | ~950,000 nodes, 1.2 M edges, ~4 GB [S27]                          | Search results and expanded neighborhoods; no figure published                               |
| Offshore Leaks public DB              | >810,000 entities [S36]                                           | Ego network around one entity on the website                                                 |
| Legal citation DB (van Ham and Perer) | >3 million citations [S45]                                        | Degree-of-interest-bounded subgraph                                                          |
| Neo4j Browser                         | any                                                               | current: 1,000 nodes, 100 new neighbours, 1,000 records [S12b]; legacy: 300 first load [S12] |
| Bloom / Explore                       | any (perspective quick scan above 10 M) [S6]                      | 100-10,000 node query limit; 1,000 default per staff; 10,000 record ceiling [S3][S8][S35]    |
| Linkurious                            | any                                                               | 500 query results, 500 add-all, expand dialog over 50, supernode over 10,000 [S11]           |
| TigerGraph GraphStudio                | any                                                               | 5,000 vertices / 10,000 edges; 200 per double-click [S33]                                    |
| Memgraph Lab                          | any                                                               | 5,000 rows [S43]                                                                             |
| BigQuery Graph                        | warehouse tables, no copy [S73]                                   | notebooks 2 MB, console no hard limit [S74]                                                  |
| Spanner Graph                         | operational tables [S77]                                          | 10 MB per visualization [S78]                                                                |
| Fabric graph                          | up to about 2 billion elements [S81]                              | response truncated above 64 MB; builder paths at most 8 hops [S81]                           |
| Survey of 89 graph users              | 27 had more than 100 M vertices; 20 had more than 1 B edges [S31] | "several thousands of nodes" in one consultant's fraud visualizations [S31]                  |
| Knowledge graph practitioners         | 8/19 thousands, 7/19 millions, 4/19 billions of nodes [S30]       | not reported                                                                                 |

The ratio is routinely 1,000:1 to 1,000,000:1. A product that states a scale range as "nodes in the
graph" conflates these two numbers.

### Sources, formats and properties

- **Sources:** relational systems migrated with ETL (ICIJ: SQL Server to Neo4j via Talend) [S27]; core
  banking (customers, transfers, checks, IP logs) [S24]; topic-modeled documents (NASA: over 2,000 lessons
  through R into Neo4j) [S29].
- **Warehouse tables as the graph:** node and edge tables with key columns over existing data, results
  as JSON graph elements or element ids [S73][S74][S83]; Fabric maps Delta column types to GQL types and
  rejects nested types [S81].
- **Model:** labeled property graph with string, number, boolean, temporal and point properties [S2];
  RDF triples [S38]. Multi-graphs are common (parallel transfers), hence edge grouping with aggregates
  [S10]. Temporal and geographic properties are first-class in the tools [S2][S10].
- **Identifiers:** database-internal ids versus business keys; name variants needing fuzzy search
  (ICIJ) [S27]; id-range paging hacks depend on internal ids [S4].
- **Sensitivity:** customer and transaction data on premises (European bank runs Neo4j Enterprise
  on-premises) [S25]; role-based access per perspective and per query [S10][S20]; ICIJ used private
  logins and two-factor collaboration tools [S27].

## 7. Analysis methods

- **Neighborhood expansion** with type, direction and count filters -- the core operation [S2][S10][S14].
- **Shortest path and all paths** between selected nodes, bounded (Bloom 20 hops; Linkurious template
  default 4, max 10) [S2][S10].
- **Common neighbors** of a node set (shared IP, email, address) [S9][S24].
- **Pattern queries** encoded as templates or alert models (UBO ownership chains, ring patterns) [S9][S10].
- **Degree-aware expansion** (Most connected / Least connected neighbors) [S10].
- **Centrality and community detection in the front end.** Bloom/Explore's Graph Data Science drawer
  runs four centralities and three community algorithms directly, then styles by the result [S67][S69].
  A scene run sees only what was drawn; an entire-graph run sees the store and writes to it (workflow
  4.1, step 8) [S67][S68]. yWorks Data Explorer computes centralities and clusters on what it loaded
  [S52].
- **Aggregation** of parallel edges (sum of amounts between two accounts) [S9][S10].
- **Temporal filtering** (slicer, timeline) [S10][S34].
- **Validation habits:** count before drawing and profile [S15]; re-check shortest paths [S7]; read
  generated queries [S1][S59]; distrust of complex views is common ("users really tend to shut down and not trust any of it", P16) [S30].

## 8. Outputs and collaboration

Saved scenes, Linkurious visualizations and deep links (workflows 4.1, 4.2, 4.4); alert cases with status
and assignee [S10], which the European bank plans to enrich with LLM-generated graph context [S25];
image and data exports [S5][S10]; Graph Explorer JSON files colleagues can reload [S14]; graphs embedded
in published stories [S27]. Reproducibility is partial: Bloom does not save filters [S2], and a
scene-scoped algorithm score lives only in that scene [S67].

## 9. Tools landscape and pain points

| Tool                                                                         | Loved for                                                                                                                               | Fails them                                                                                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neo4j Browser / Aura Query                                                   | Instant Cypher, table/graph/RAW toggle, PROFILE [S13]                                                                                   | Freezes above a few hundred nodes; view hides result size [S15][S16]                                                                                                      |
| Neo4j Bloom / Explore                                                        | Search phrases, perspectives, GPU layout, slicer, deep links, co-pilot [S1][S2][S8]                                                     | Caps (1,000 default) confuse users; filters not saved; no current-selection input to phrases; separate limits in Query and Explore [S3][S4][S33b]                         |
| Bloom 2.3+ / Explore GDS drawer                                              | Centrality and community algorithms with one-step rule-based styling [S67][S69]                                                         | Scene and whole-graph runs give different answers; whole-graph runs write unrenamable properties to the database; needs the GDS plugin or Aura Graph Analytics [S67][S68] |
| GraphAware Hume (acquired by Neo4j, announced 2026-06-03)                    | Intelligence analysis for police, defense and tax authorities [S64]                                                                     | No published user critique found                                                                                                                                          |
| Kineviz GraphXR                                                              | Link analysis, geospatial, timeline, optional VR over Neo4j, Spanner and BigQuery [S72][S75]                                            | No published user critique found                                                                                                                                          |
| yWorks Data Explorer for Neo4j                                               | Free; browse without Cypher, context-menu expand, schema filter, shortest paths, centralities, clusters, map view, GraphML export [S52] | AI assistant sends request and schema to yWorks and OpenAI; Bolt only [S52]                                                                                               |
| NVL, neovis.js, KeyLines, Ogma, yFiles (SDKs)                                | Embedded views inside a team's own product [S57][S58][S65]                                                                              | Fetch, record mapping, expand and hub limits are the developer's code; NVL tied to a Neo4j license [S57][S66]                                                             |
| Co-pilots (Aura Query and Explore, NeoDash, Linkurious Query AI and Copilot) | Typed question to query or pattern, editable before running [S1][S59][S60][S63]                                                         | Experimental and non-deterministic; schema goes to an LLM provider (workflow 4.8)                                                                                         |
| Linkurious Enterprise                                                        | Supernode safeguards, templates, alerts and cases, timeline, geo, sharing [S10]                                                         | Vendor pricing and deployment weight (no source quantified); 500-result query cap [S11]                                                                                   |
| AWS Graph Explorer                                                           | Open source, Gremlin/openCypher/SPARQL, Neighbors filter [S14][S42]                                                                     | Few documented defaults; misleading "No more neighbors to expand" when filters match nothing (GitHub issue 2060) [S48]                                                    |
| TigerGraph GraphStudio                                                       | Multi-step expansion with per-step edge caps [S33]                                                                                      | 5,000/10,000 visualization cap                                                                                                                                            |
| Memgraph Lab                                                                 | Graph Style Script, map layout, collections of saved queries [S43]                                                                      | 5,000-row default                                                                                                                                                         |
| NeoDash                                                                      | Dashboards with Parameter Select [S23]                                                                                                  | Row limiter truncates after execution, so LIMIT is required [S23]                                                                                                         |
| BigQuery Studio / Spanner Studio                                             | Graph over existing tables, no copy; schema view; Spanner expand by direction or edge type [S73][S74][S78]                              | Draws only `TO_JSON` graph elements; 2 MB notebook and 10 MB Spanner caps; display settings not kept [S74][S78]                                                           |
| Fabric graph                                                                 | No-code model and query builder over lakehouse tables; diagram, card and table views [S80][S82]                                         | No export of graph results, no Power BI connection, schema change forces a reload [S81]                                                                                   |
| Oracle Graph Explorer                                                        | `GRAPH_TABLE` queries over SQL property graphs, generated starter query [S83]                                                           | SELECT only; must return vertex or edge ids [S83]                                                                                                                         |

Cross-cutting pain points with evidence: hairballs ("Then it turns into a hairball. This is the story of
graph visualization", P17) [S30]; visualization ranked the second most pressing challenge (39 of 89),
tied with query languages [S31]; "a lack of appropriate graph visualisation and navigation methods that
are tailored towards users of graph databases" (Dagstuhl) [S47]; path results enumerated one by one
instead of summarized [S47].

## 10. Requirements implied

Marked must-have (M) or should-have (S). "Gap" means no Graphty persona or workflow in
`design/designloom` covers it today: W02 assumes a loaded graph and an overview phase; W06 assumes a
stored graph of 10,000-1,000,000 nodes is the starting state; no capability mentions a database
connection, a query language or supernodes.

| #   | Requirement                                                                                                                                                                     | M/S | Gap?                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------- |
| 1   | Live data source: connect to a graph database (Neo4j Bolt/HTTP, Neptune, Gremlin Server, SPARQL endpoint) and fetch subgraphs on demand rather than importing a file            | M   | Gap                                                                               |
| 2   | Search-first entry: full-text and property search with fuzzy matching against the store, results added to an initially empty canvas                                             | M   | Gap (W02 starts from a loaded graph; `search` capability searches what is loaded) |
| 3   | Query editor (Cypher, Gremlin, SPARQL, GQL) with results as graph and table, and the count of what was returned versus drawn                                                    | M   | Gap                                                                               |
| 4   | Incremental expand with filters: by relationship type, direction, neighbor category, attribute, max count, most/least connected                                                 | M   | Partial (`neighborhood-expansion` exists, no filters or caps)                     |
| 5   | Supernode handling: show hidden-degree badges before expanding, warn above a threshold, never auto-expand a hub                                                                 | M   | Gap                                                                               |
| 6   | Visible caps: every truncation reports "showing N of M" and offers next page or refine                                                                                          | M   | Gap                                                                               |
| 7   | Additive scene: new searches add to the canvas; dismiss, dismiss others, dismiss isolated, undo                                                                                 | M   | Partial                                                                           |
| 8   | Reveal relationships among nodes already shown                                                                                                                                  | M   | Gap                                                                               |
| 9   | Saved, parameterized searches (search phrases, templates) with typed inputs and suggestion lists, prepared by one user for others                                               | M   | Gap                                                                               |
| 10  | Actions on the current selection (scene actions, nodeset templates)                                                                                                             | S   | Gap                                                                               |
| 11  | Perspectives: a curated, role-scoped view of the schema (visible labels, properties, relationship types, styles)                                                                | S   | Gap                                                                               |
| 12  | Rule-based styling from properties persisted with the view                                                                                                                      | M   | Covered by `visual-encoding-nodes` / style layers                                 |
| 13  | Saved scenes with view-only sharing and copy-to-edit; deep links that start from a search                                                                                       | M   | Partial (`view-bookmarks`; no deep-link-to-query)                                 |
| 14  | Bounded shortest path and paths-between in the store                                                                                                                            | M   | Partial (`shortest-path` runs on the loaded graph)                                |
| 15  | Parallel edge grouping with aggregates                                                                                                                                          | S   | Gap                                                                               |
| 16  | Timeline / slicer over temporal properties                                                                                                                                      | S   | Covered by `temporal-navigation`                                                  |
| 17  | Schema (meta-graph) view for developers                                                                                                                                         | S   | Gap                                                                               |
| 18  | Read-only by default; writes only when explicitly enabled                                                                                                                       | M   | Gap                                                                               |
| 19  | Separate "stored graph size" from "on-screen size" in all scale claims and starting states                                                                                      | M   | Gap (W02 "node_count: any"; W06 10,000-1,000,000 without saying drawn or stored)  |
| 20  | Every algorithm result records its scope: "loaded subgraph" or "stored graph" (with the source and time)                                                                        | M   | Gap (graphty's 60+ algorithms run only on what is loaded and do not say so)       |
| 21  | Scene-scoped results are kept with the saved view, never written to the source                                                                                                  | M   | Gap                                                                               |
| 22  | Writing results back to the source is a separate, opt-in action, read-only by default (with 18)                                                                                 | M   | Gap                                                                               |
| 23  | Warn when centrality or community results on a capped or partially expanded subgraph may differ from the full graph                                                             | M   | Gap                                                                               |
| 24  | A documented data-source adapter API in graphty-element so search, expand, paging and hub thresholds work with no consumer code (self-sufficiency)                              | M   | Gap                                                                               |
| 25  | Record-to-graph mapping for Neo4j driver results, Gremlin paths and SPARQL bindings, including integer handling                                                                 | M   | Gap (graph-io imports Neo4j CSV files only)                                       |
| 26  | Import directly from a query result (Cypher, Gremlin or pasted result JSON) with provenance (source, query text, time run) stored on the graph                                  | M   | Gap                                                                               |
| 27  | Natural-language-to-query entry that always shows the generated query before running and applies the user's access rights                                                       | S   | Partial (graphty app has an AI area; no query generation)                         |
| 28  | Manual node and edge authoring for model sketching, with a diff against the source schema                                                                                       | S   | Gap (may be declared out of scope)                                                |
| 29  | Accept warehouse graph results: JSON graph elements and paths (BigQuery, Spanner `TO_JSON`), vertex and edge id columns (Oracle `GRAPH_TABLE`), with properties and labels kept | M   | Gap                                                                               |
| 30  | Read a declared graph schema (node tables, edge tables, keys) and draw it as a schema view                                                                                      | S   | Gap                                                                               |
| 31  | Report truncation by bytes as well as by count ("result cut at 2 MB")                                                                                                           | M   | Gap (extends 6)                                                                   |

Implications for existing records:

- **W02** should be split or extended: keep overview-first for small loaded graphs (under a few thousand
  elements), and add a search-show-context-expand variant whose starting state is "empty canvas, live
  database of any size", citing van Ham and Perer [S45] and the tool evidence above.
- **W06** starting state should read "stored: 10^4-10^9; on screen: tens to a few thousand", consistent
  with the Linkurious and Bloom caps.
- New personas: `graph-database-developer`, `graph-database-app-developer`, `graph-perspective-curator`,
  `no-code-graph-investigator`, `investigative-journalist`, `warehouse-graph-analyst`. The existing `fraud-analyst` overlaps with the investigator but assumes
  graph-literate centrality use; the documented daily work is search, expand, common neighbors and paths.

## 11. Sources

- [S1] https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/search-bar/ -- Bloom search bar: search phrases, patterns, full-text.
- [S2] https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-scene-interactions/ -- expand, advanced expansion, 20-hop shortest path.
- [S3] https://aura.feedback.neo4j.com/explore/p/i-cant-see-all-my-nodes -- 38 of 236 nodes shown.
- [S4] https://community.neo4j.com/t/bypass-10000-node-limit-in-bloom-neo4j-desktop/45670 -- 10,000 per-query limit.
- [S5] https://neo4j.com/docs/aura/explore/explore-features/scenes-export/ -- scene counts by tier, view-only sharing, PNG/SVG/CSV export.
- [S6] https://neo4j.com/docs/bloom-user-guide/current/bloom-perspectives/perspective-creation/ -- generate vs blank perspective, quick scan above 10 M.
- [S7] https://neo4j.com/blog/graph-visualization/neo4j-bloom-tips-tricks-domain-knowledge-experts/ -- data model matters, shortest path surprises.
- [S8] https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/search-phrases-advanced/ -- parameterized search phrases, suggestion sources.
- [S9] https://linkurious.com/blog/top-10-query-templates-to-accelerate-your-investigations/ -- ten investigation templates and their parameters.
- [S10] https://doc.linkurious.com/user-manual/latest/page.html -- Linkurious search, expand, selective expand, queries.
- [S11] https://doc.linkurious.com/admin-manual/4.1/advanced-settings -- expandThreshold 50, supernodeThreshold 10,000.
- [S12] https://neo4j.com/docs/browser/legacy/operations/browser-settings/ -- LEGACY Browser: initialNodeDisplay 300, maxNeighbours 100.
- [S12b] https://neo4j.com/docs/browser-manual/current/operations/browser-settings/ -- current Browser: maxVizNodes 1,000, maxNewNeighbours 100.
- [S13] https://neo4j.com/docs/browser/legacy/visual-tour/ -- Browser as developer tool.
- [S14] https://aws.github.io/graph-explorer/features/graph-view/ -- Graph Explorer search, expand panel, Neighbors filter.
- [S15] https://neo4j.com/blog/developer/wheres-my-neo4j-cypher-query-results/ -- rendering vs execution, 47 nodes vs 5,673 paths.
- [S16] https://community.neo4j.com/t/browser-node-relationship-limit/69507 and https://community.neo4j.com/t/neo4j-browser-graph-render-very-slow/18550 -- 100-500 node slowness, crash at 1,000, LIMIT advice.
- [S17] https://neo4j.com/blog/graph-visualization-neo4j-schemas-yfiles/ -- built-in schema viewer poor for non-trivial schemata.
- [S18] https://neo4j.com/developer-blog/scoobygraph-3/ -- end-to-end Bloom tutorial: perspective, pattern search.
- [S19] https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/legend-panel/ and https://community.neo4j.com/t/bloom-recognizing-double-as-string-in-rule-based-style-on-relationship/18688 -- rule-based styling.
- [S20] https://neo4j.com/docs/bloom-user-guide/current/perspectives/perspective-rbac/ -- role mapping, _Bloom_Perspective_ and _Bloom_Scene_ write privileges.
- [S21] https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/deep-links/ -- search, perspective, run deep link parameters.
- [S22] https://neo4j.com/blog/developer/integrating-graph-data-visualizations-no-code-workflows-bloom-2-0/ and https://neo4j.com/blog/neo4j-bloom-1-1-release -- no-code workflows, programmatic deep links.
- [S23] https://neo4j.com/labs/neodash/2.4/user-guide/reports/ and https://neo4j.com/labs/neodash/2.4/user-guide/reports/parameter-select/ -- NeoDash report types, row limiter, Parameter Select.
- [S24] https://linkurious.com/blog/bforbank-detects-fraud-with-linkurious/ -- BforBank data sources, 2 min to hours before.
- [S25] https://neo4j.com/?p=435908 -- European bank: daily Bloom use across anti-financial crime teams.
- [S26] https://thepaypers.com/fraud-and-fincrime/thought-leader-insights/ria-accelerates-aml-investigations-5x-with-graph-technology -- Ria uses Linkurious for AML investigation.
- [S27] https://neo4j.com/blog/cypher-and-gql/icij-neo4j-unravel-panama-papers -- 950,000 nodes, 1.2 M edges.
- [S28] https://neo4j.com/blog/fraud-detection/neo4j-power-behind-paradise-papers/ -- ICIJ reuse for Paradise Papers.
- [S29] https://neo4j.com/blog/graph-visualization/nasa-lesson-learned-database-using-neo4j-linkurious/ -- NASA lessons learned searched through Linkurious on Neo4j.
- [S30] https://arxiv.org/html/2304.01311v4 -- Li et al., knowledge graph practitioners.
- [S31] https://ar5iv.arxiv.org/html/1709.03188 -- Sahu et al. survey of 89 users: size distributions.
- [S32] https://neo4j.com/press-releases/neo4j-100m-genai-investment/ and https://neo4j.com/blog/news/gartner-voice-customer/ -- Neo4j 84 of Fortune 100, 300,000 developers.
- [S33] https://www.tigergraph.com/docs/ui/graphstudio/explore-graph/expand-from-vertices -- GraphStudio 5,000/10,000 cap, 200 neighbors on double-click.
- [S33b] https://community.neo4j.com/t/visualization-node-limit/65515 and https://aura.feedback.neo4j.com/workspace/p/explore-max-nodes-limit -- Query tab limit does not affect Explore's 1,000.
- [S34] https://neo4j.com/docs/aura/explore/explore-features/slicer/ -- slicer, up to five ranges, playback.
- [S35] https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/settings-drawer/ -- Node query limit range 100-10,000.
- [S36] https://offshoreleaks.icij.org/pages/database -- Offshore Leaks: more than 810,000 entities.
- [S37] https://doc.linkurious.com/user-manual/2.9/expand -- earlier safeguard popup.
- [S38] https://docs.aws.amazon.com/neptune/latest/userguide/notebooks-visualization.html -- graph-notebook Gremlin path hints, SPARQL s-p-o drawing.
- [S40] https://jobgether.com/offer/6a175636cd512907df7440e8-neo4j-developer -- Neo4j developer job duties.
- [S41] https://www.cbinsights.com/company/linkurious-1 and https://linkurious.com/blog/nuix-signs-agreement-to-acquire-linkurious -- Linkurious ACV and Nuix acquisition.
- [S42] https://aws.github.io/graph-explorer/features/connections/ -- connection settings, query languages.
- [S43] https://memgraph.com/docs/memgraph-lab/querying -- Memgraph Lab 5,000 rows, render-anyway prompt.
- [S44] https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf -- visual information seeking mantra.
- [S45] https://dig.cmu.edu/publications/2009-doigraphs.html -- van Ham and Perer, search-show-context-expand.
- [S46] https://poloclub.github.io/polochau/papers/11-chi-apolo.pdf -- Apolo bottom-up sensemaking from seeds.
- [S47] https://drops.dagstuhl.de/storage/04dagstuhl-reports/volume12/issue01/22031/html/DagRep.12.1.67/DagRep.12.1.67.html -- Dagstuhl 22031: navigation methods for graph DB users missing.
- [S48] https://goodfirstissue.org/aws/graph-explorer/issues/2060 -- Graph Explorer misleading "No more neighbors to expand" toast.
- [S50] https://neo4j.com/docs/data-importer/current/modeling/ -- Data Importer model canvas: add node.
- [S51] https://neo4j.com/labs/arrows/ -- Arrows.app: drawing pictures of graphs and models.
- [S52] https://www.yworks.com/products/data-explorer-for-neo4j -- yWorks Data Explorer: no-Cypher browsing, expand, analysis.
- [S53] https://github.com/yWorks/yfiles-jupyter-graphs-for-neo4j -- Neo4jGraphWidget, show_cypher, autocomplete_relationships.
- [S54] https://neo4j.com/labs/apoc/5/export/gephi -- apoc.gephi.add signature, defaults, random coordinates.
- [S55] https://github.com/neo4j/python-graph-visualization -- neo4j-viz: built on NVL.
- [S56] https://neo4j.com/docs/nvl/current/ -- NVL overview: libraries to build visualizations like those in Bloom.
- [S57] https://neo4j.com/blog/graph-database/neo4j-graph-visualization-library/ -- NVL packages, used in Bloom/Query/Python viz, getHits.
- [S58] https://github.com/neo4j-contrib/neovis.js -- neovis.js config, initialCypher, property-driven styling.
- [S59] https://neo4j.com/blog/developer/cypher-co-pilot/ -- Aura Query Cypher co-pilot: schema-primed.
- [S60] https://doc.linkurious.com/user-manual/latest/query-ai/ -- Linkurious Query AI: admin-enabled, generate, preview.
- [S61] https://doc.linkurious.com/user-manual/latest/using-copilot/ -- Linkurious Copilot: acts on view with approval.
- [S62] https://linkurious.com/blog/linkurious-enterprise-4-3/ -- Linkurious 4.3: Query AI model choice, Copilot beta.
- [S63] https://www.neo4j.com/docs/neodash-commercial/current/user-guide/extensions/natural-language-queries -- NeoDash Text2Cypher: providers, Translate vs Run.
- [S64] https://neo4j.com/press-releases/neo4j-acquires-graphaware/ and https://www.techtarget.com/searchdatamanagement/news/366643806/Neo4js-GraphAware-acquisition-targets-new-customer-segment -- Hume acquisition (2026-06-03), customers.
- [S65] https://developers.cambridge-intelligence.com/docs/keylines/neo4j-tutorial -- KeyLines Neo4j tutorial: driver in Express route.
- [S66] https://neo4j.com/docs/nvl/current/installation -- NVL install, node and relationship shape, container height.
- [S67] https://www.neo4j.com/docs/aura/explore/explore-features/gds-integration/ -- Explore GDS drawer: algorithms, scene vs entire-graph scope.
- [S68] https://neo4j.com/blog/developer/seeds-of-science-visuals-in-bloom-introudcing-whole-graph-projections/ -- scene vs whole-graph outputs differ.
- [S69] https://neo4j.com/blog/graph-visualization/announcing-neo4j-bloom-2-3-supercharged-graph-data-science/ -- Bloom 2.3 GDS integration.
- [S70] https://neo4j.com/docs/browser/visual-tour/ -- current Browser: Visualization node limit.
- [S71] https://community.neo4j.com/t/gephi-integration-update-and-warning/22111 -- apoc.gephi.add reported broken on Gephi 0.9 by one user.
- [S72] https://neo4j.com/blog/graph-visualization/graphxr-graph-app-neo4j-desktop/ -- GraphXR as Neo4j graph app: link analysis, geospatial.
- [S73] https://docs.cloud.google.com/bigquery/docs/graph-overview -- BigQuery Graph: logical layer over existing tables.
- [S74] https://docs.cloud.google.com/bigquery/docs/graph-visualization -- BigQuery Graph visualization: TO_JSON paths, Graph tab.
- [S75] https://docs.cloud.google.com/bigquery/docs/graph-visualization-integrations -- BigQuery Graph partner tools: G.V(), Graphistry, Kineviz.
- [S76] https://cloud.google.com/blog/products/data-analytics/bigquery-graph-connecting-data-and-ai-at-scale/ -- BigQuery Graph GA (2026-08-31): Thales, Yahoo, Workerbee.
- [S77] https://cloud.google.com/blog/products/data-analytics/the-unified-graph-solution-with-spanner-graph-and-bigquery-graph -- Spanner Graph versus BigQuery Graph roles, shared GQL.
- [S78] https://docs.cloud.google.com/spanner/docs/graph/work-with-visualizations -- Spanner Studio: SAFE_TO_JSON, 10 MB cap, layouts.
- [S79] https://cloud.google.com/blog/products/databases/customers-see-real-world-success-with-multi-model-spanner/ -- Spanner Graph customers: DANA, Palo Alto Networks.
- [S80] https://learn.microsoft.com/fabric/graph/quickstart -- Fabric graph model: Get data, Add node, Add edge, keys.
- [S81] https://learn.microsoft.com/en-us/fabric/graph/limitations -- Fabric graph limits: 2 billion elements, 64 MB truncation.
- [S82] https://learn.microsoft.com/fabric/graph/tutorial-query-builder -- Fabric query builder: Components pane, filters.
- [S83] https://docs.oracle.com/en/database/oracle/property-graph/26.2/spgdg/querying-and-visualizing-sql-property-graphs.html -- Oracle Graph Explorer: GRAPH_TABLE.
- [S84] https://docs.puppygraph.com/ -- PuppyGraph: tables mapped to nodes and edges.
- [S85] https://neon.com/postgresql/postgresql-19/sql-pgq-graph-queries -- SQL/PGQ reverted from PostgreSQL 19 on 2026-09-07.
