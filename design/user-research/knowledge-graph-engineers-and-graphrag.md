# Knowledge Graph Engineers, Ontologists and GraphRAG Developers

## 1. Summary

This population builds and maintains knowledge graphs, and some of it also analyzes the finished graph. It has six
overlapping groups:

- **Ontologists and semantic engineers** who model a domain in RDF, OWL, SKOS and SHACL (Protege, ROBOT and the
  Ontology Development Kit, GraphDB, Stardog), including **taxonomists** who maintain SKOS vocabularies in PoolParty,
  VocBench or TopBraid EDG.
- **Enterprise knowledge graph engineers** who model, load and rebuild a property graph (Neo4j, Neptune) or RDF store
  from many source systems and resolve duplicate entities.
- **LLM extraction and GraphRAG developers** (since 2024) who extract entities and relationships from documents with
  Microsoft GraphRAG, LangChain's LLMGraphTransformer, neo4j-graphrag's SimpleKGPipeline, LlamaIndex or LightRAG.
- **Agent-memory developers** who use temporal knowledge graphs (Graphiti/Zep, Mem0) as an LLM agent's memory and debug
  what the graph believed at a given time.
- **Biomedical knowledge graph builders and analysts** who build graphs on the Biolink Model in KGX format (KG-Hub,
  Monarch, NCATS Translator) or analyze Hetionet and PrimeKG with metapath queries and link prediction.
- **Public knowledge graph explorers** who write SPARQL against Wikidata and other public endpoints and look at the
  result in a graph view.

For the builders, visualization is a debugging and sanity-checking instrument, not the deliverable. They open a graph
view to see whether the schema looks right, whether the loaded or extracted data connects as expected, and where
duplicates and type conflicts sit. The largest interview study of these practitioners found that 18 of 19 used
node-link diagrams, that builders use them mainly as "sanity checks", and that whole-graph views turn into hairballs
(Li et al. 2023, https://arxiv.org/pdf/2304.01311). The biomedical analysts and public explorers differ: they read the
graph for answers (paths between a drug and a disease, a query result), so for them the view is part of the analysis.

## 2. Population

**Job titles.** Ontologist, Ontology Engineer, Knowledge Modeler, Semantic Data Architect, Knowledge Graph Engineer or
Architect, Knowledge Graph AI Engineer, Information Architect, Taxonomist, translational bioinformatician. Interview-
study roles: principal scientist, data scientist, database administrator, information architect, PhD student
(https://arxiv.org/pdf/2304.01311, Table 1).

**Sectors.** Pharma and life sciences (omics graphs, FAIR data, drug repurposing), financial services (FIBO and BIAN),
government and defense contractors, publishing, libraries and e-commerce (taxonomies), manufacturing, ESG and supply
chain (an EcoVadis posting describes GraphRAG ingestion of ERP data into property graphs), and any company building an
LLM assistant. Sources: https://www.clearancejobs.com/jobs/9028077/ontology-engineer-expert,
https://www.hirist.tech/j/ontologist-fibo-and-bian-1661559?jobPos=1,
https://4dayweek.io/job/senior-knowledge-graph-engineer-at-ecovadis-786adbb9.

**Size.** No source found for a head count of any group. Proxy signals: GraphRAG issues #340, #418, #446 and #689 all ask
how to visualize the graph (https://github.com/microsoft/graphrag/issues?q=visualize), and several third-party viewers
exist only for GraphRAG output. KG-Hub's KG-OBO converts 201 OBO ontologies into KGX graphs
(https://arxiv.org/pdf/2302.10800). Wikidata query writers are probably the largest SPARQL-writing group, but no count
was found.

**Pay (postings).** Lead ontologist roughly $90K-$130K; cleared ontology expert $220K-$250K; knowledge graph engineer
guides quote about $110K-$180K (https://www.theladders.com/job/lead-ontologist-black-canyon-consulting-bethesda-md_86710134,
https://www.secondtalent.com/occupations/knowledge-graph-engineer/).

**Skill profile.**

- Graph literacy: high for the data model (triples, classes, labels, relationship types), uneven for network science.
  Builders think in schema terms ("does every Person have a worksFor?"). Biomedical analysts add metapaths, degree-
  weighted path counts and embeddings.
- Coding: every group codes. Ontologists write SPARQL, ROBOT commands and Makefiles; KG engineers write Cypher, SPARQL or
  Gremlin plus Python ETL; GraphRAG and agent-memory developers are Python developers who learn graph concepts on the
  job. Taxonomists are the exception: PoolParty and VocBench are form-and-tree editors, and many never write SPARQL.
- Li et al.: 7/19 used Neo4j with Cypher, 6/19 RDF with SPARQL, 4/19 NetworkX; visualization tools were Neo4j Bloom
  (7/19), Gephi (5/19), Cytoscape (4/19), D3 (2/19), and none at all (6/19).

**How often they touch graph views.** Database and query tools daily (GraphDB Workbench, Neo4j Browser, Stardog Studio,
the Wikidata Query Service). Graph views episodically: after each load or extraction run, while writing a query, when a
validation report or a duplicate list needs explaining, and before a stakeholder meeting. 12/19 of Li et al.'s
participants were builders, 9 of whom used node-link diagrams as sanity checks; 11/12 builders were also analysts.

**Team context.** Consumers are domain experts who do not write queries; builders depend on them to validate samples
("Domain scientists need to manually validate whether this extraction makes sense or not", P19,
https://arxiv.org/pdf/2304.01311). OBO ontologies are edited by distributed volunteer curators through GitHub pull
requests with a second reviewer (https://obofoundry.org/COB/odk-workflows/EditorsWorkflow/).

## 3. Personas

### 3.1 Dr. Mara Okafor -- enterprise ontologist (confirms and narrows the existing `knowledge-engineer` record)

- **Role.** Lead ontologist in a pharma data office. Owns the enterprise ontology (about 1,500 classes reusing BFO and
  public OBO ontologies), its SHACL shapes and its mappings to public ontologies.
- **Tools.** Protege with HermiT; an Ontology Development Kit (ODK) repository on GitHub, where CI runs ROBOT checks;
  WebVOWL for stakeholders; GraphDB Workbench for instance data; pySHACL; SSSOM tables for mappings; draw.io for
  workshops. Tool pattern from postings: https://www.foundit.in/job/ontologist-wissen-technology-bengaluru-bangalore-55302898.
- **Data.** OWL in Turtle or OWL Functional syntax (TBox); instance data in N-Triples and TriG (tens of millions of
  triples); SHACL shapes; SKOS vocabularies; SSSOM mapping files.
- **Goals.** Keep the inferred hierarchy correct; review each release's changes; see where data violates the shapes;
  explain the model to data providers.
- **Frustrations (evidenced).** OWLViz cannot display large ontologies whole and OntoGraf has no image export
  (https://arxiv.org/html/2507.13759v1); WebVOWL duplicates nodes, overlaps labels and struggles past hundreds of
  classes (https://journals.sagepub.com/doi/full/10.3233/SW-150200); SHACL reports are too large to read and one faulty
  entry cascades into many violations
  (https://www.frontiersin.org/journals/bioinformatics/articles/10.3389/fbinf.2026.1756507/full); a ROBOT diff is a text
  list of axioms, not a picture of how the hierarchy moved (https://robot.obolibrary.org/diff).

### 3.2 Raj Venkataraman -- enterprise property-graph knowledge graph engineer

- **Role.** Senior KG engineer at a financial firm. Builds the customer-supplier-instrument graph from 30+ source systems
  and rebuilds it nightly; owns entity resolution.
- **Tools.** arrows.app or Neo4j Data Importer to sketch the model; Neo4j Runway to turn a model into ingestion code;
  Neo4j Browser, Bloom and Graph Data Science; neosemantics (n10s) for RDF vocabularies such as FIBO; Python ETL.
  Posting pattern: https://www.dice.com/job-detail/088cf988-dc6a-42b3-be23-f16b8633eae5.
- **Data.** Property graph of millions of nodes and edges with 3 to thousands of properties; CSV and relational extracts;
  entity-resolution candidate pairs with scores.
- **Goals.** Know after every rebuild that the loaded schema matches the intended model and counts are as expected;
  review duplicate clusters before merging; keep invalidated links invalid.
- **Frustrations (evidenced).** "I don't want to have to see the full graph... I'd just like to see... a quick sanity
  check" (P6); invalidated links come back on every rebuild (P16); 15-minute queries with no interim results (P4) (all
  https://arxiv.org/pdf/2304.01311). Neo4j Browser shows 300 nodes by default and users report the UI freezing at
  1,000 (https://community.neo4j.com/t/browser-node-relationship-limit/69507). Neo4j's schema procedure is estimated
  from statistics and "may include additional relationships that do not actually exist in the graph"
  (https://neo4j.com/docs/operations-manual/current/procedures/).

### 3.3 Lena Fischer -- LLM extraction / GraphRAG developer (new)

- **Role.** Applied AI engineer building a question-answering assistant over 5,000 internal PDFs. Strong Python, little
  prior graph experience.
- **Tools.** Either Microsoft GraphRAG (CLI, pandas over parquet, Gephi per the official guide, third-party viewers) or
  the Neo4j-native path (LangChain LLMGraphTransformer or neo4j-graphrag SimpleKGPipeline, inspected in Neo4j Browser or
  Bloom); LlamaIndex `PropertyGraphIndex` with `save_networkx_graph` for quick looks
  (https://developers.llamaindex.ai/python/examples/property_graph/property_graph_basic/).
- **Data.** GraphRAG v3 tables `entities`, `relationships`, `communities`, `community_reports`, `text_units`,
  `documents`, optional `covariates`, plus `graph.graphml` when snapshots are on
  (https://microsoft.github.io/graphrag/index/outputs/); or Neo4j Document, Chunk and entity nodes. 10^3 to 10^5
  entities per corpus.
- **Goals.** Decide whether extraction is good enough before paying for more indexing; find duplicate and mistyped
  entities; check community coherence; explain a wrong answer.
- **Frustrations (evidenced).** No built-in viewer (issue #340, https://github.com/microsoft/graphrag/issues/340);
  third-party viewers break when the schema changes (0 nodes on GraphRAG 3.0.6, issue #2272,
  https://github.com/microsoft/graphrag/issues/2272); answers cite ids she joins by hand (issue #1086,
  https://github.com/microsoft/graphrag/issues/1086); experts feel "overwhelmed and lost in the sea of LLM calls"
  (https://arxiv.org/html/2506.13782); duplicates ("Ebenezer Scrooge" vs "Scrooge") and noise hubs (Project Gutenberg)
  (https://neo4j.com/blog/developer/microsoft-graphrag-neo4j/).

### 3.4 Dr. Ana Duarte -- biomedical knowledge graph builder-analyst (new)

- **Role.** Translational bioinformatician in an academic drug-repurposing group that contributes to a KG-Hub or
  Translator-style graph and also mines it. Distinct from the ontologist (who authors an ontology, not a graph of facts)
  and from the graph-ML scientist in network-medicine-and-biomedical-knowledge-graphs.md (who mainly trains models).
- **Tools.** KGX to transform, validate and merge sources into Biolink-conformant `nodes.tsv` and `edges.tsv`
  (https://biolink.github.io/kgx/kgx_format.html); Neo4j with Hetionet's dump and Cypher; het.io connectivity search;
  PyKEEN for knowledge graph embeddings (it ships a PrimeKG dataset loader,
  https://pykeen.readthedocs.io/en/latest/api/pykeen.datasets.PrimeKG.html); pandas and NetworkX.
- **Data.** Hetionet v1.0: 47,031 nodes of 11 types and 2,250,197 edges of 24 types (https://github.com/hetio/hetionet).
  PrimeKG: 129,375 nodes of 10 types and 4,050,249 edges of 30 types (https://pmc.ncbi.nlm.nih.gov/articles/PMC9893183).
  Merged KG-Hub graphs: KGX TSV with pipe-delimited multi-valued Biolink categories.
- **Goals.** For a disease, find compounds connected through mechanistically plausible typed paths; rank them; check
  each top prediction against its supporting paths before showing it to a clinician.
- **Frustrations (evidenced).** Explanations are long path lists that are hard to interpret
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10375517/); public graphs are frozen (Hetionet unchanged since 2017); each lab
  builds its own front end for predictions (network-medicine-and-biomedical-knowledge-graphs.md, section 9); KGX TSV
  "can be sparse" and column order "can be inconsistent for non-core properties"
  (https://biolink.github.io/kgx/kgx_format.html).

### 3.5 Variants that do not need a full persona

- **Agent-memory developer.** Builds an assistant whose memory is a Graphiti temporal graph (backends Neo4j, FalkorDB,
  Neptune; https://github.com/getzep/graphiti). Debugging means asking what the graph believed at time T and why a fact
  was invalidated (workflow 5.5).
- **Taxonomist.** Maintains a SKOS thesaurus of thousands of concepts in several languages in PoolParty or VocBench; does
  not write SPARQL; works in a tree editor and needs polyhierarchy and "related" links shown together (workflow 5.8).
- **Public knowledge graph explorer.** Wikidata editor, librarian or researcher who writes SPARQL in the Wikidata Query
  Service, switches to its graph view and shares the query link (workflow 5.11).
- **Domain-expert validator.** Reviews samples and wants abstracted views and natural-language questions rather than
  node-link diagrams (12/19 said node-link diagrams are impossible for end users at scale,
  https://arxiv.org/pdf/2304.01311). Graphty's `explorer-elena` and `analyst-alex` partly cover this reader.

## 4. Use cases (ranked by frequency x stakes)

| #   | Question answered with a graph view                                                                                                       | Who                       | Frequency                      | Stakes                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| 1   | "Did the load or extraction produce the graph I expected?" -- schema matches model, counts by type, orphans, hubs that should not be hubs | builders                  | every load or run              | High: bad graphs silently degrade search and RAG                          |
| 2   | "Which nodes are duplicates or mistyped, and should these be merged?"                                                                     | KG engineer, GraphRAG dev | every run; weekly review       | High: merges are hard to undo; GraphRAG baseline duplication 30.53% (5.2) |
| 3   | "How are this compound and this disease connected, and which predicted links hold up?"                                                    | biomedical analyst        | daily to weekly                | High: drives experiments                                                  |
| 4   | "What does the ontology look like and is the inferred hierarchy right?"                                                                   | ontologist                | daily while modeling           | High: errors reach every consumer                                         |
| 5   | "What changed in this release, and did anything move that should not have?"                                                               | ontologist, taxonomist    | every pull request and release | High for widely reused ontologies                                         |
| 6   | "Where does the data break the schema, and what single cause explains many violations?"                                                   | ontologist, KG engineer   | per release or CI failure      | High in regulated domains                                                 |
| 7   | "What is around this resource?" -- seed and expand while writing a query                                                                  | all                       | many times a day               | Medium                                                                    |
| 8   | "What did the agent's memory believe at time T, and why was this fact invalidated?"                                                       | agent-memory dev          | during debugging               | Medium-high for production agents                                         |
| 9   | "Are the communities coherent and are their summaries faithful?" / "Why did the assistant answer wrongly?"                                | GraphRAG dev              | per run; during evaluation     | High for production assistants                                            |
| 10  | "Is the taxonomy well-formed?" -- orphans, broader cycles, missing labels per language                                                    | taxonomist                | before each publication        | Medium                                                                    |
| 11  | "Show my query result as a graph and share it"                                                                                            | public KG explorer        | many times a day               | Low-medium                                                                |
| 12  | "Explain the model to stakeholders"                                                                                                       | ontologist, KG engineer   | monthly                        | Medium ("the interest died out", P18)                                     |

## 5. Step-by-step workflows

### 5.1 Inspect a Microsoft GraphRAG index in Gephi (the official procedure)

Targets GraphRAG v3 (late 2025). Sources: visualization guide (https://microsoft.github.io/graphrag/visualization_guide/);
config (https://microsoft.github.io/graphrag/config/yaml/); breaking changes
(https://raw.githubusercontent.com/microsoft/graphrag/main/breaking-changes.md).

1. **Enable the snapshot.** In `settings.yaml` set `snapshots: graphml: true` (and `raw_graph: true` to keep the
   pre-merge extraction). Run `graphrag index`. Cost is dominated by LLM calls
   (https://techcommunity.microsoft.com/blog/azure-ai-services-blog/graphrag-costs-explained-what-you-need-to-know/4207978);
   one study needed 35 minutes and about 4,000 LLM calls per textbook (https://arxiv.org/pdf/2509.07846). If GraphML
   was off, re-index or rebuild a graph from the parquet tables with pandas and NetworkX
   (https://evannzhongg.github.io/2025/04/11/GraphRag-Visualization).
2. **Find the file.** `graph.graphml` in `output.base_dir` (v3 config; v1-v2 used `storage.base_dir`).
3. **Import into Gephi.** File > Open gives "a plain, undirected view"; Gephi supports only part of GraphML
   (https://docs.gephi.org/desktop/User_Manual/Import/GraphML_Format).
4. **Install Leiden.** Tools > Plugins > "Leiden Algorithm" > Install > restart.
5. **Statistics.** Run Average Degree; run Leiden with Quality function = Modularity, Resolution = 1.
6. **Color by cluster.** Appearance > Nodes > Partition > "Cluster" > Palette > Generate (uncheck "Limit number of
   colors") > Apply.
7. **Size by degree.** Appearance > Nodes > Ranking > Degree, Min 10, Max 150 > Apply.
8. **Layout.** OpenORD with Liquid and Expansion = 50, other stages 0; then ForceAtlas 2 with Scaling 15, Dissuade Hubs
   on, LinLog off, Prevent Overlap on; stop when nodes settle.
9. **Read it.** Developers look for unexpected hubs (boilerplate such as "Project Gutenberg"), many tiny components,
   near-duplicate labels side by side, and clusters that mix topics.

Notes. Gephi recomputes its own Leiden clustering and does not show GraphRAG's hierarchical communities from
`communities` (levels, parent, children), so the picture can disagree with the communities behind the reports. Version
drift: v1 renamed `name` to `title` and `rank` to `combined_degree`; v2 renamed every table (pre-v2 names were
`create_final_entities` and so on); v3 changed `text_units.document_ids` (a list) to a single `document_id`, removed the
`umap` and `embed_graph` blocks and the x/y columns they produced, and points users who need positions to Gephi.
Migration notebooks convert v1, v2 and v3 tables. The older community suggestion to enable UMAP coordinates (issue
#340) works only before v3.

### 5.2 Audit an LLM-extracted graph for duplicates, type conflicts and noise

Sources: https://neo4j.com/blog/developer/global-graphrag-neo4j-langchain/;
https://neo4j.com/blog/developer/microsoft-graphrag-neo4j/;
https://dev.to/eyanpen/the-biggest-pitfall-in-graphrag-one-entity-seven-identities-5d8d; CORE-KG
(https://arxiv.org/html/2510.26512).

1. **Load into something queryable.** pandas over parquet, or Neo4j via Microsoft's Cypher import notebook or
   `apoc.load.parquet`. Check which GraphRAG version wrote the tables (5.1 notes).
2. **Profile counts.** Example: 2,000 news articles with GPT-4o (about 35 minutes, about $30) gave 12,994 entities and
   15,921 relationships; only 45.6% of entities and 35% of relationships got a description.
3. **Degree distribution.** Log histogram: mean 2.45, median 1, 75% of nodes degree <= 2. List top entities by degree to
   spot noise hubs; add them to a stoplist.
4. **Entities per chunk.** About 3 per 300-token chunk without gleanings; raise `max_gleanings` if too low.
5. **Components.** WCC: 1,119 components, largest 9,109 nodes, median size 2. Many tiny components signal missed
   relations or unmerged aliases.
6. **Duplicate candidates.** Embed name plus description; GDS kNN `topK=10`, `similarityCutoff=0.95`, written as
   `SIMILAR` edges; WCC over `SIMILAR`; keep pairs with edit distance < 3 or substring containment.
7. **Review groups.** An LLM or a person decides per group, rejecting merges that differ in numbers, dates or products.
   Embedding false positives: Google/Apple 0.96, BMW/Mercedes Benz 0.97. This step most needs a side-by-side view of each
   group with its neighbors and source chunks.
8. **Merge.** `apoc.refactor.mergeNodes`. Neo4j LLM Graph Builder exposes the same flow plus a "Delete Disconnected
   Nodes" screen (https://neo4j.com/labs/genai-ecosystem/llm-graph-builder-features/).
9. **Type conflicts.** On a 700-page 5G specification, 1,123 of 8,873 entities (12.7%) got two or more types; `PMIC` got
   seven. Fix: vote a primary type, keep alternatives as properties, flag same-chunk conflicts.
10. **Measure.** CORE-KG measured duplication with RapidFuzz `partial_ratio` at 75% within type plus expert review over
    20 legal cases: the GraphRAG baseline averaged 30.53% duplicate nodes against 20.28% for CORE-KG (GraphRAG produced
    about 77 nodes per case, CORE-KG about 41). Removing coreference resolution raised duplication by 28.25% (relative);
    removing structured prompts raised it by 4.29%. Outputs were saved as GraphML and Parquet for Gephi and the GraphRAG
    visualizer.

Hand-off: a cleaned graph, stoplist, prompt changes and merge log.

### 5.3 Model, load and verify a property-graph knowledge graph

Sources: Neo4j Data Importer (https://neo4j.com/docs/data-importer/current/modeling); Neo4j Runway
(https://neo4j.com/blog/developer/neo4j-runway-python-ingestion/); schema procedures
(https://neo4j.com/docs/operations-manual/current/procedures/); Li et al. P6 and P16.

1. **Sketch the model.** In Data Importer: Add Node, give a CamelCase label, map it to a CSV file; drag from a node's plus
   handle to create a relationship, name it in SNAKE_CASE, map it to a file. Or draw in arrows.app, export JSON and load
   it with Runway's `DataModel.from_arrows`, check it with `model.visualize()` (Graphviz).
2. **Generate and run ingestion.** Runway's `IngestionGenerator` writes LOAD CSV Cypher without an LLM; the user pastes it
   into Neo4j Browser and runs it. Data Importer runs the import directly.
3. **Compare loaded schema with intended model.** `CALL db.schema.visualization()` returns one virtual node per label and
   virtual relationships per start-end pair. It is estimated from statistics by default and can show relationships that
   do not exist; Cypher 25 accepts `estimate: false` to scan. `db.schema.nodeTypeProperties()` shows which properties
   are mandatory per label. The engineer compares this picture with the sketch from step 1.
4. **Check counts.** Nodes per label and relationships per type against the source row counts; spot-check a few samples
   per label in Browser or Bloom.
5. **Diff against the last rebuild.** Count changes per label and type; investigate jumps.
6. **Re-apply the invalidation list.** Links that reviewers marked wrong must be removed again after each rebuild (P16's
   complaint is that they come back). No tool support was found; teams keep the list in their ETL.
7. **Entity resolution over structured records.** Senzing, Splink or Zingg cluster review with record-level evidence is
   documented in financial-crime-fraud-aml-kyc.md and is not repeated here.

### 5.4 Schema-guided LLM extraction into Neo4j

Sources: neo4j-graphrag user guide (https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html);
GraphAcademy (https://graphacademy.neo4j.com/courses/genai-graphrag-python/2-knowledge-graph-pipeline/2-create-a-graph/);
LLMGraphTransformer (https://neo4j.com/developer/genai-ecosystem/importing-graph-from-unstructured-data/).

1. **Declare the schema.** LLMGraphTransformer: `allowed_nodes`, `allowed_relationships`, `node_properties`.
   SimpleKGPipeline: `schema` with `node_types`, `relationship_types`, `patterns`, `additional_node_types`.
2. **Run.** The pipeline loads files, splits chunks, embeds them, extracts per chunk, prunes, writes and resolves. The
   run returns a summary such as `{'resolver': {'number_of_nodes_to_resolve': 12, 'number_of_created_nodes': 10}}`.
   LLM Graph Builder runs on LLMGraphTransformer.
3. **Inspect the lexical layer.** `MATCH (d:Document)<-[:FROM_DOCUMENT]-(c:Chunk) RETURN d.path, c.text`.
4. **Inspect the entity layer.** `MATCH p = (c:Chunk)<-[:FROM_CHUNK]-(e1:__Entity__)-[*1..2]->(e2:__Entity__) RETURN p`
   in Browser or Bloom; check the schema view (5.3 step 3) for labels and types outside the declared schema.
5. **Prune.** With `additional_node_types` false, undefined types are removed; nodes with empty label or id and
   relationships with invalid endpoints are always pruned.
6. **Merge.** Resolvers: exact match on `name` within a label, RapidFuzz fuzzy match, or spaCy embedding match. They
   replace the written nodes, so the user re-checks counts.

### 5.5 Debug an agent's temporal memory graph

Sources: Zep paper (https://arxiv.org/html/2501.13956); Graphiti edge model
(https://raw.githubusercontent.com/getzep/graphiti/main/graphiti_core/edges.py); Graphiti README
(https://github.com/getzep/graphiti).

1. **Ingest episodes.** Messages, text or JSON become episode nodes, "a non-lossy data store from which semantic entities
   and relations are extracted"; above them sit an entity subgraph and a community subgraph.
2. **Know the edge times.** Each fact edge has `valid_at` and `invalid_at` (when it was true in the world), `created_at`
   and `expired_at` (when the system recorded and invalidated it), `reference_time`, and `episodes` (the ids of the
   episodes that support it).
3. **Find the entity's fact timeline.** List its edges ordered by `valid_at`, including expired ones.
4. **Find the invalidation.** When a new edge contradicts an older overlapping one, an LLM decides and the older edge's
   `invalid_at` is set to the new edge's `valid_at`; nothing is deleted.
5. **Trace to the episode.** Follow `episodes` to the message that introduced or contradicted the fact; decide whether
   extraction or invalidation was wrong.
6. **Ask "what did it believe at T?"** Filter edges valid at T and recorded before T.

Graphiti tells developers to "Build your own tools" for this; Zep's hosted service has a graph dashboard. Mem0 also
offers graph memory; its paper reports about 2% higher overall score than base Mem0
(https://arxiv.org/html/2504.19413v1), and its current docs say typed relationships are no longer recorded
(https://docs.mem0.ai/open-source/features/graph-memory).

### 5.6 Review ontology structure (TBox) and the inferred hierarchy

Sources: Protege (https://protegeproject.github.io/protege/getting-started); GraphDB 10.8
(https://graphdb.ontotext.com/documentation/10.8/visualize-and-explore.html); VOWL
(https://journals.sagepub.com/doi/full/10.3233/SW-150200).

1. **Open** the ontology in Protege; the Active Ontology tab shows class, property and axiom counts.
2. **Classify.** Reasoner > HermiT > Start (Ctrl+R); switch the class tree from Asserted to Inferred; unsatisfiable
   classes appear under owl:Nothing. The text tree is the main working view; an empirical test found Protege's indented
   list beat the graphical views for locating entities
   (https://www.cs.ubc.ca/~tmm/courses/547-14/projects/arash/report.pdf).
3. **Graph view.** OWLViz (asserted vs inferred is-a graph) or OntoGraf (expandable, relationship filters); both
   struggle with large ontologies.
4. **Stakeholder view.** WebVOWL: classes as circles sized by instance count, datatypes as rectangles, some elements
   drawn several times to simplify layout; small to medium TBoxes only.
5. **Against real data.** GraphDB Explore > Class hierarchy (nested circles by instance count, named-graph filter, SVG
   export) and Class relationships (bundles of actual instance links between classes, width = count; slow on large
   repositories).
6. **Decide.** Rename or move classes, add domain and range axioms, split modules; commit and export diagrams.

Sizes: DBpedia ontology 768 classes (https://www.dbpedia.org/resources/ontology/); schema.org 823 types
(https://auto.schema.org/docs/schemas.html); FIBO about 1,750 classes
(https://fois2021.inf.unibz.it/wp-content/uploads/2021/08/paper_6.pdf); SNOMED CT 374,672 active concepts
(https://conf.spaces.snomed.org/wiki/spaces/RMT/pages/131992659). Only the first two fit a whole-ontology node-link
view.

### 5.7 Review an ontology release (ODK and ROBOT on GitHub)

Sources: ODK editors' workflow (https://obofoundry.org/COB/odk-workflows/EditorsWorkflow/); ROBOT
(https://robot.obolibrary.org/, https://robot.obolibrary.org/report, https://robot.obolibrary.org/diff); diff on pull
requests (https://oboacademy.github.io/obook/howto/github-actions); SSSOM
(https://mapping-commons.github.io/sssom/dev/).

1. **Ticket and branch.** "No change to the ontology should be performed without a good ticket"; branch from main.
2. **Edit** `src/ontology/<name>-edit.owl` in Protege; keep changes small and take care with 100+ terms; do not edit
   imports directly. Review `git diff`.
3. **Local QC.** `sh run.sh make IMP=false test` (the ODK Docker wrapper), or rely on CI.
4. **Pull request and CI.** CI goes green or red. A diff workflow posts a ROBOT diff in markdown as a pull request
   comment. `robot diff --left old.owl --right new.owl --format markdown` (also `plain`, `pretty` with labels, `html`)
   ignores file layout changes.
5. **Read the QC report.** `robot report` flags ERROR ("must be fixed before releasing"), WARN and INFO, for example
   multiple labels or missing definitions; output as TSV, HTML, JSON, YAML or XLSX; fails on ERROR by default.
6. **Second reviewer, merge, release.** The reviewer reads the diff and report; after merge, a separate release
   workflow builds the release files.
7. **Mappings.** Cross-ontology mappings live in SSSOM TSV: a YAML header (`curie_map`, `mapping_set_id`, `license`)
   and one row per mapping with `subject_id`, `predicate_id` (for example `skos:exactMatch`, `skos:broadMatch`),
   `object_id`, `mapping_justification` and `confidence` (0 to 1).

Where a graph view helps and none exists: the diff is an axiom list, so the reviewer cannot see a subtree that moved or a
class that gained a second parent; a two-version hierarchy view with added, removed and moved classes would show it. An
SSSOM file is itself a bipartite graph between two ontologies, where one-to-many mappings and low-confidence clusters
stand out.

### 5.8 Maintain a SKOS taxonomy

Sources: PoolParty user guide (https://help.poolparty.biz/en/user-guide-for-knowledge-engineers/basic-features/working-with-concept-schemes-and-concepts.html);
qSKOS (https://github-wiki-see.page/m/cmader/qSKOS/wiki/Quality-Issues, https://arxiv.org/pdf/1206.1339); VocBench
manual (https://vocbench.uniroma2.it/doc/user/).

1. **Create or import** a concept scheme (PoolParty quick start: schemes, then top concepts, then concepts); spreadsheet
   import is common (VocBench ships Sheet2RDF).
2. **Edit the hierarchy** in a tree: add narrower concepts, move or merge concepts by drag and drop, add a second broader
   concept (PoolParty documents "Polyhierarchical Structure in a Thesaurus").
3. **Add labels and links.** prefLabel and altLabel per language, related links, mappings to other schemes.
4. **Run quality checks.** qSKOS checks include orphan concepts, disconnected concept clusters (found as connected
   components), cyclic hierarchical relations (cycles over `skos:broader`), omitted top concepts, missing labels,
   incomplete language coverage, relation clashes (related and hierarchically linked) and hierarchical redundancy. The
   qSKOS paper found possible issues in all 15 vocabularies it analyzed.
5. **Approve and publish.** VocBench's manual lists History and Validation, SKOS Diffing and Versioning features; the
   approval steps themselves were not documented in the pages read.

A pure tree view mishandles this data: a concept with two broader concepts appears twice, and `skos:related` links cut
across branches. Most of the qSKOS checks are graph computations (components, cycles, redundant paths).

### 5.9 Find root causes of SHACL violations

Source: SHACLens (https://www.frontiersin.org/journals/bioinformatics/articles/10.3389/fbinf.2026.1756507/full);
validators pySHACL (https://github.com/RDFLib/pySHACL), Jena SHACL (https://jena.apache.org/documentation/shacl/).

1. Validate data graph + shapes + ontology; output is an RDF report with one `sh:ValidationResult` per focus node, path,
   shape and severity.
2. Most teams read the report as text or query it. In the pharma omics case, 5,203 focus nodes violated shapes; data
   providers could not trace them.
3. Group equivalent violations and link them to classes and shapes in a node-link view; show per-class counts on the
   class tree; cluster focus nodes by violation profile (UMAP).
4. Causes found: missing object typing, two schema gaps (constraint on a class but not its sibling), one ontology gap.
5. Fix with SPARQL UPDATE or upstream; re-validate. Users still checked raw files and wanted to hide irrelevant parts.

### 5.10 Explore around a resource while writing a query

Sources: GraphDB (https://graphdb.ontotext.com/documentation/10.8/visualize-and-explore.html); Stardog Explorer
(https://docs.stardog.com/archive/9.0.0/stardog-applications/explorer/); AWS Graph Explorer
(https://aws.github.io/graph-explorer/features/graph-view/); Neo4j Browser settings
(https://neo4j.com/docs/browser-manual/current/operations/browser-settings/).

1. **Seed.** GraphDB Visual graph (type a label, pick the IRI); Stardog search (first 50 results); Cypher in Browser.
2. **Caps.** GraphDB 20 links per expansion ordered by RDF rank; Stardog warns above 500 added nodes; Neo4j Browser 300
   nodes initially and 100 neighbors per expand; LightRAG WebUI 1,000 nodes, depth 3
   (https://huggingface.co/spaces/rm-lht/lightrag/commit/74d902f3e2873248c9da1cdfcce07fb774ed48f8).
3. **Expand** all relationships or by a chosen predicate and direction. GraphDB options: include inferred or schema
   statements, expand over owl:sameAs, preferred and ignored predicates, label languages.
4. **Literals** are hidden in a side panel by default. Stardog's Visualize ignores RDF-star edge properties
   (https://community.stardog.com/t/edge-properties-not-showing-for-literals/3311); Graph Explorer cannot draw scalar
   SELECT results.
5. **Custom views.** GraphDB "graph configs" are five SPARQL queries (start, expansion CONSTRUCT, node basics, edge
   label, extra properties).
6. **Hand-off.** The query goes into an application; a screenshot goes to a ticket.

### 5.11 Query a public knowledge graph and view the result as a graph (Wikidata)

Sources: WDQS user manual (https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual); result views
(https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Wikidata_Query_Help/Result_Views); graph split
(https://www.wikidata.org/wiki/User:TiagoLubiana/Graph_Split_Documentation_Updates).

1. **Write SPARQL** in the query service editor. Since May 2025 scholarly articles sit behind a separate query
   endpoint.
2. **Shape the columns.** In the graph view, the first item in a row gets an arrow to each other item in the same row.
   Optional columns: label, Commons image, `?rgb` color, a number for node size, `?edgeLabel`.
3. **Switch the view.** Add `#defaultView:Graph` at the top, or choose Graph from the results menu. Other views: Map,
   Timeline, Tree, Bubble chart.
4. **Iterate** on filters and limits until the picture is readable.
5. **Share.** Every query has a bookmarkable URL; "Generate short URL" shortens it; result views can be embedded in an
   iframe.

What this group would need from another tool: load a saved SPARQL result (JSON or CSV) or a CONSTRUCT graph without
rewriting the query.

### 5.12 Build and mine a biomedical knowledge graph (KGX, metapaths, link prediction)

Sources: KGX format (https://biolink.github.io/kgx/kgx_format.html); Biolink Model
(https://pmc.ncbi.nlm.nih.gov/articles/PMC9372416/); KG-Hub (https://arxiv.org/abs/2302.10800); Hetionet
(https://github.com/hetio/hetionet); connectivity search (https://pmc.ncbi.nlm.nih.gov/articles/PMC10375517/); PrimeKG
(https://pmc.ncbi.nlm.nih.gov/articles/PMC9893183). Metapath and prediction steps are detailed in
network-medicine-and-biomedical-knowledge-graphs.md (workflows 4 and 5); this workflow adds the builder's side.

1. **Transform sources to KGX.** Each source becomes `nodes.tsv` (`id`, `category`, `name`, `provided_by`) and
   `edges.tsv` (`subject`, `predicate`, `object`, `primary_knowledge_source`, `publications`). Multi-valued fields use
   pipes: a gene's category is `biolink:NamedThing|biolink:BiologicalEntity|biolink:Gene`. KG-OBO publishes every OBO
   ontology the same way.
2. **Validate against Biolink.** Categories come from the NamedThing hierarchy and predicates from the `related_to`
   hierarchy; querying `related_to` also returns narrower predicates such as `positively_regulates`.
3. **Merge** sources into one graph; check counts per category and predicate and per `primary_knowledge_source`.
4. **Load Hetionet or PrimeKG for analysis.** Hetionet as a Neo4j dump, JSON or edge list; PrimeKG as a CSV, or through
   PyKEEN's dataset loader.
5. **Metapath query.** For example `(:Compound)-[:BINDS]-(:Gene)-[:ASSOCIATES]-(:Disease)` in Cypher, or het.io
   connectivity search, which ranks metapaths by degree-weighted path count (DWPC) against permuted networks and lists up
   to 100 paths per metapath.
6. **Predict links.** Train TransE, RotatE or ComplEx in PyKEEN; report MRR and Hits@k.
7. **Inspect top predictions.** For each predicted compound-disease edge, pull the supporting metapaths and paths and
   read them with a domain expert. This is done today with path tables and per-lab viewers.

## 6. Data

**Formats and endpoints.**

- RDF: Turtle, N-Triples, N-Quads, TriG, RDF/XML, JSON-LD, OWL/XML, OWL Functional; OBO. GraphDB uploads up to 200 MB by
  default, larger from a server directory, with base IRI, target named graph and blank-node options
  (https://graphdb.ontotext.com/documentation/10.8/loading-data-using-the-workbench.html).
- SPARQL endpoints (Wikidata, DBpedia; GraphDB, Stardog, Neptune, Fuseki, Virtuoso, QLever): SELECT tables (JSON, CSV,
  TSV) or CONSTRUCT graphs.
- Property graph: Neo4j dumps, Cypher results, CSV node and edge files, APOC GraphML.
- GraphRAG: Parquet tables whose names and columns differ across v1 (`create_final_*`), v2 and v3, plus optional
  `graph.graphml`, embedding snapshots and a LanceDB store. LlamaIndex: HTML or Neo4j and Kuzu. LightRAG: GraphML plus
  JSON stores.
- KGX: TSV pair with pipe-delimited multi-valued columns, JSON, JSON Lines (arrays instead of pipes) or RDF; Biolink
  category and predicate CURIEs.
- SSSOM: mapping TSV with a YAML header (5.7). ROBOT diff and report outputs (markdown, HTML, TSV).
- SKOS: Turtle or RDF/XML; spreadsheets for round trips.
- Temporal memory graphs: Graphiti edges with four timestamps and episode ids (5.5), stored in Neo4j, FalkorDB or
  Neptune.

**Typical sizes.**

- Ontologies: hundreds (DBpedia 768 classes) to hundreds of thousands of concepts (SNOMED CT 374,672).
- Enterprise KGs (Li et al.): 8/19 thousands of nodes, 7/19 millions, 4/19 billions; 3 to 10,000 properties.
- Biomedical: Hetionet 47,031 nodes and 2,250,197 edges; PrimeKG 129,375 nodes and 4,050,249 edges.
- Wikidata: about 116 million items and 16 billion triples
  (https://www.bigdatawire.com/2025/07/10/scaling-the-knowledge-graph-behind-wikipedia).
- GraphRAG: 8,564 nodes / 20,691 edges for 1M tokens of podcasts; community counts per level 34 / 367 / 969 / 1,310
  (https://arxiv.org/html/2404.16130v2); 2,000 news articles gave 12,994 entities and 8,590 communities over five levels.

**What is on screen.** Not the whole graph: GraphDB 20 links per expand, Stardog 500-node warning, Neo4j Browser 300
nodes, Bloom 100-10,000 (https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/settings-drawer/), LightRAG
1,000. Whole-graph views appear only for GraphRAG-sized graphs (10^3-10^4 nodes), small ontologies and small taxonomies.

**Identifier problems.**

- RDF IRIs need prefix shortening and label lookup with language preference; blank nodes are unstable across loads;
  property-graph imports drop language tags and datatypes by default (neosemantics `keepLangTag=false`,
  https://neo4j.com/labs/neosemantics/4.0/import/).
- owl:sameAs misuse has wide effects (https://arxiv.org/abs/1907.10528).
- LLM extraction: ids regenerate per run; `title` is the de facto key, so surface variants become separate nodes.
- Biomedical: CURIEs from many namespaces; the same disease has different ids across graphs (sibling document, section 6).

**Graph properties.**

- Directed, labeled multigraphs; RDF predicates are themselves resources.
- Two layers everywhere: schema vs instances; in LLM graphs, lexical (document, chunk) vs entity; in memory graphs,
  episodes vs entities vs communities.
- Hierarchies with multiple parents: rdfs:subClassOf, skos:broader (polyhierarchy plus cross-cutting `skos:related`),
  Biolink categories (a node carries every ancestor category), GraphRAG community levels.
- Multi-valued categorical attributes (KGX categories, multi-typed LLM entities).
- Statements about statements: reification, RDF-star, RDF 1.2 triple terms (Working Draft in late 2025,
  https://www.w3.org/TR/2025/WD-rdf12-concepts-20251205/); named graphs as provenance.
- Temporal: bi-temporal validity on memory-graph edges, with invalidated edges kept; GraphRAG `period` fields; ontology
  versions.

**Sensitivity.** Enterprise KGs integrate non-public data (10/19 in Li et al.); GraphRAG corpora and agent memories are
internal; developers value local processing (GraphRAG Visualizer advertises it,
https://dev.to/noworneverev/graphrag-visualizer-an-easy-way-to-visualize-microsofts-graphrag-artifacts-c0c); DrugBank
and similar sources carry non-commercial licenses.

## 7. Analysis methods

- **Structural profiling:** counts by type, log degree distribution, top-k hubs, WCC, entities per chunk, description
  coverage. Interpreted as data quality, not domain findings.
- **Schema summarization:** label-to-label meta-graph with counts (Neo4j `db.schema.visualization`, GraphDB Class
  relationships) compared with the intended model.
- **Community detection:** hierarchical Leiden (graspologic in GraphRAG; GDS Leiden with intermediate communities).
  Checks: size per level, whether levels nest (Bratanic found they did not always), rank = distinct documents.
- **Entity resolution:** exact name+type merge, RapidFuzz or edit distance, embedding kNN at 0.95, WCC grouping, LLM or
  human adjudication; scoped by label because semantic matching cost grows quadratically.
- **Reasoning and validation (RDF):** OWL classification, unsatisfiable classes, SHACL, `robot report` profiles,
  competency questions as SPARQL tests (https://arxiv.org/html/2412.13688v1).
- **Version comparison:** `robot diff` between releases; VocBench SKOS diffing; rebuild count diffs.
- **SKOS quality checks:** qSKOS components, cycles over broader, redundancy, label coverage.
- **Temporal filtering:** facts valid at T and recorded before T; invalidation chains.
- **Metapath analysis:** typed path patterns between two entities, path counts and DWPC with permutation nulls.
- **Knowledge graph embeddings and link prediction:** TransE, RotatE, ComplEx (PyKEEN); MRR, Hits@k; predictions
  explained by supporting paths.
- **RDF rank / PageRank** to order expansion and size nodes; **path finding** between entities (9/19 in Li et al.),
  inflated by hub intermediates.
- **Projections:** SHACLens UMAP of violation profiles. GraphRAG's node2vec + UMAP coordinates existed only before v3.
- **Validation habits:** expert review of random samples; spot-checking chunks; diffing counts after prompt changes. Most
  domains have no gold standard (CORE-KG says so).

## 8. Outputs and collaboration

- Ontology files in git, WIDOCO/OWLDoc pages, WebVOWL links, SVG diagrams; ROBOT diff markdown posted on pull requests;
  ROBOT QC reports; SSSOM mapping sets.
- Published taxonomies (SKOS files, spreadsheets) after approval.
- Schema sketches (draw.io, arrows.app JSON, Data Importer models) that double as ingestion specs.
- SHACL validation reports sent to data providers.
- Merge logs and invalidation lists that must survive the next rebuild.
- GraphRAG evaluation notebooks, Gephi images; drug-repurposing candidate lists with supporting paths.
- Shared Wikidata query links and embedded result views.
- Reproducibility needs: seeds for Leiden and layouts, pinned GraphRAG version, provenance from entity to chunk and
  document or from fact to episode, named graph or knowledge source per edge.

## 9. Tools landscape and pain points

| Tool                                  | Used for                              | Fails them (evidence)                                               |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Protege + OWLViz/OntoGraf             | authoring, inferred hierarchy         | cannot show large ontologies whole; no image export in OntoGraf     |
| ODK + ROBOT                           | QC, diff, release in GitHub           | diff is an axiom list with no hierarchy picture                     |
| WebVOWL                               | TBox diagrams                         | small TBoxes only, duplicated nodes, overlapping labels             |
| PoolParty / VocBench                  | SKOS editing, approval                | no source found for specific complaints                             |
| GraphDB Workbench                     | load, SPARQL, class views             | class relationships slow on large repositories; link cap per expand |
| Stardog Explorer                      | query results as graph                | literals hidden, RDF-star edge properties missing                   |
| Neo4j Browser / Bloom / Data Importer | Cypher results, exploration, modeling | 300-node default, freezes when raised; schema view estimated        |
| AWS Graph Explorer                    | Neptune RDF and property graph        | no blank nodes from SPARQL search; scalar SELECT not drawable       |
| Wikidata Query Service                | public SPARQL and graph view          | graph is built only from the shape of each result row               |
| Gephi                                 | whole-graph view of GraphRAG output   | manual recipe; ignores GraphRAG's community hierarchy               |
| GraphRAG Visualizer and similar       | parquet in browser                    | breaks on schema changes (#2272)                                    |
| Neo4j LLM Graph Builder               | extraction, preview, dedup            | dedup thresholds not documented                                     |
| het.io connectivity search            | metapath ranking                      | Hetionet only; 100 paths per metapath                               |
| Graphiti / Zep                        | agent memory                          | open-source library has no viewer ("Build your own tools")          |

Cross-cutting complaints:

- **Hairball and scale.** "Show me something bigger. Then it turns into a hairball" (P17); 9/19 criticized hairballs.
- **RDF semantics poorly supported:** literals hidden or exploded, blank nodes unstable, RDF-star dropped, tags stripped,
  no schema-vs-instance distinction.
- **No interim results** while queries run (P4).
- **No traceability** from answer to graph to chunk (XGraphRAG), or from fact to episode outside Zep's hosted dashboard.
- **Glue work.** Every GraphRAG path needs a conversion step; every version change breaks viewers.
- **No change views.** Ontology diffs, taxonomy versions and nightly rebuilds are compared as text and counts.
- **Consumers cannot use node-link diagrams** and need abstracted views (12/19).

## 10. Requirements implied

Graphty's existing coverage: persona `knowledge-engineer` and workflow W13 "Knowledge Graph Construction" (schema design,
extraction, relationship mapping, entity resolution, quality validation, deployment). W13 never says what the visual tool
does at each phase and has no RDF, SPARQL, LLM-extraction, temporal or biomedical content. graphty-element imports 13
formats; none is RDF, Parquet or KGX (OBO is the only ontology format).

| Requirement                                                                                                                                                               | Priority                                                      | Covered today?                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Import RDF (Turtle, N-Triples, N-Quads/TriG, JSON-LD) with prefix shortening and label display by language preference                                                     | must-have                                                     | No                                                             |
| RDF mapping choices: literals as attributes or nodes; rdf:type as category or class nodes; keep datatypes and language tags                                               | must-have                                                     | No                                                             |
| Blank nodes with stable ids within a session; named graphs as a filterable attribute; RDF-star statements as edge attributes                                              | should-have                                                   | No                                                             |
| Schema meta-graph view computed from a loaded graph: label-to-label (or class-to-class) edges with counts, for comparison with an intended model                          | must-have                                                     | No                                                             |
| Class or concept hierarchy view that shows multiple parents and non-tree links (skos:related) together                                                                    | must-have                                                     | Partly: `layout-hierarchical`                                  |
| Version diff of two hierarchies or graphs: added, removed and moved classes or nodes highlighted                                                                          | must-have                                                     | Partly: `comparison-view`                                      |
| Import GraphRAG output from Parquet, handling v1 (`create_final_*`), v2 and v3 table names and columns, keeping its community hierarchy                                   | must-have                                                     | No                                                             |
| Community hierarchy navigation: choose level, color by community, drill parent to children, report text on demand                                                         | must-have                                                     | Partly: community algorithms exist, not supplied hierarchies   |
| Duplicate-candidate review queue with neighbors and source text, accept or reject, and a merge and invalidation log that re-applies after a rebuild                       | must-have                                                     | Partly: `node-merging`                                         |
| Data-quality profile: counts by type, log degree histogram, hubs, components, isolates, attribute coverage, types-per-entity conflicts                                    | must-have                                                     | Partly                                                         |
| Import multi-valued categorical columns (pipe-delimited KGX categories, JSON arrays) as sets, and filter by a category hierarchy (selecting a parent selects descendants) | must-have                                                     | No                                                             |
| Typed-path (metapath) search between two nodes with path counts and a per-pattern cap; selected paths highlighted                                                         | must-have for biomedical                                      | No (`pattern-search`, `all-paths-finding` lack typed patterns) |
| Predicted-edge overlay: load scored predicted edges, draw them distinct from observed edges, show supporting paths per prediction                                         | should-have                                                   | Partly: link prediction exists                                 |
| Edge validity intervals as first-class attributes; point-in-time filter or time slider; show or hide invalidated edges                                                    | should-have                                                   | No                                                             |
| Provenance drill-down: node or edge to source chunks, documents or episodes, and back                                                                                     | must-have for GraphRAG and memory graphs                      | No                                                             |
| Highlight the subgraph used to answer a question (id list from RAG context)                                                                                               | should-have                                                   | Partly                                                         |
| Seed-and-expand with per-expansion caps, by predicate and direction, rank-ordered                                                                                         | must-have                                                     | Partly                                                         |
| Load saved SPARQL results (SELECT JSON/CSV with item columns, CONSTRUCT graphs) and Cypher results as a graph                                                             | must-have (raised: the Wikidata query-writing group is large) | No                                                             |
| SSSOM mapping set as a bipartite graph between two vocabularies, colored by predicate and confidence                                                                      | nice-to-have                                                  | No                                                             |
| SHACL or ROBOT report overlay: color nodes by violation, group by rule, counts on the class tree                                                                          | should-have                                                   | No                                                             |
| SKOS quality checks as graph computations: orphans, disconnected clusters, cycles over broader, redundant hierarchy links                                                 | should-have                                                   | Partly: components and cycle detection exist                   |
| Local-only processing for confidential corpora                                                                                                                            | must-have                                                     | Yes by architecture                                            |
| Deterministic seeds for clustering and layout                                                                                                                             | should-have                                                   | Yes as an option                                               |
| Export SVG/PNG; export cleaned graph to GraphML or RDF                                                                                                                    | must-have                                                     | Partly: no RDF export                                          |
| Abstracted views (class- or community-level aggregate graph) for consumers                                                                                                | should-have                                                   | No                                                             |

Implications for the records:

- Narrow `knowledge-engineer` to the ontologist (RDF/OWL/SHACL, ODK/ROBOT); add "reviews release diffs", "inspects
  inferred hierarchy", "reviews SHACL violations".
- Add `graphrag-developer` (LLM extraction, both Microsoft GraphRAG and Neo4j-native paths), `enterprise-kg-engineer`
  (model, load, verify, rebuild) and `biomedical-kg-analyst` (KGX, metapaths, prediction review); record taxonomist,
  agent-memory developer and public KG explorer as variants.
- Split W13 into workflows that state the visual task: inspect an extracted graph and its communities; review and merge
  duplicates; model, load and verify a property graph; review an ontology release; maintain a taxonomy; explore around
  a resource; trace a wrong RAG answer; debug temporal memory; mine typed paths and predictions.

## 11. Sources

Every claim above carries its source inline. The main primary sources:

- https://arxiv.org/pdf/2304.01311 -- Li et al., Knowledge Graphs in Practice (19 interviews).
- https://microsoft.github.io/graphrag/visualization_guide/ -- official GraphRAG Gephi procedure.
- https://microsoft.github.io/graphrag/config/yaml/ -- `output.base_dir`, snapshots.
- https://microsoft.github.io/graphrag/index/outputs/ -- GraphRAG output tables.
- https://raw.githubusercontent.com/microsoft/graphrag/main/breaking-changes.md -- v1, v2, v3 schema and config changes.
- https://arxiv.org/html/2404.16130v2 -- GraphRAG paper sizes and community counts.
- https://github.com/microsoft/graphrag/issues/340, https://github.com/microsoft/graphrag/issues/1086,
  https://github.com/microsoft/graphrag/issues/2272 -- visualization requests, id joins, viewer breakage.
- https://arxiv.org/html/2506.13782 -- XGraphRAG tracing study.
- https://neo4j.com/blog/developer/global-graphrag-neo4j-langchain/ -- extraction audit numbers and dedup parameters.
- https://neo4j.com/blog/developer/microsoft-graphrag-neo4j/ -- GraphRAG output in Neo4j.
- https://dev.to/eyanpen/the-biggest-pitfall-in-graphrag-one-entity-seven-identities-5d8d -- multi-type entities.
- https://arxiv.org/html/2510.26512 -- CORE-KG tables I and II.
- https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html -- SimpleKGPipeline.
- https://graphacademy.neo4j.com/courses/genai-graphrag-python/2-knowledge-graph-pipeline/2-create-a-graph/ -- inspection queries.
- https://neo4j.com/developer/genai-ecosystem/importing-graph-from-unstructured-data/ -- LLMGraphTransformer, LLM Graph Builder.
- https://neo4j.com/labs/genai-ecosystem/llm-graph-builder-features/ -- dedup and orphan cleanup.
- https://neo4j.com/docs/data-importer/current/modeling -- Data Importer modeling.
- https://neo4j.com/blog/developer/neo4j-runway-python-ingestion/ -- Runway.
- https://neo4j.com/docs/operations-manual/current/procedures/ -- `db.schema.visualization` behavior.
- https://arxiv.org/html/2501.13956 -- Zep temporal knowledge graph.
- https://raw.githubusercontent.com/getzep/graphiti/main/graphiti_core/edges.py -- Graphiti edge fields.
- https://github.com/getzep/graphiti -- Graphiti backends, invalidation, no viewer.
- https://arxiv.org/html/2504.19413v1, https://docs.mem0.ai/open-source/features/graph-memory -- Mem0 graph memory.
- https://obofoundry.org/COB/odk-workflows/EditorsWorkflow/ -- ODK editors' workflow.
- https://robot.obolibrary.org/report, https://robot.obolibrary.org/diff -- ROBOT QC and diff.
- https://oboacademy.github.io/obook/howto/github-actions -- diff posted on pull requests.
- https://mapping-commons.github.io/sssom/dev/ -- SSSOM format.
- https://help.poolparty.biz/en/user-guide-for-knowledge-engineers/basic-features/working-with-concept-schemes-and-concepts.html -- PoolParty.
- https://github-wiki-see.page/m/cmader/qSKOS/wiki/Quality-Issues, https://arxiv.org/pdf/1206.1339 -- qSKOS checks.
- https://vocbench.uniroma2.it/doc/user/ -- VocBench features.
- https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual -- WDQS sharing.
- https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/Wikidata_Query_Help/Result_Views -- graph view columns.
- https://www.wikidata.org/wiki/User:TiagoLubiana/Graph_Split_Documentation_Updates -- endpoint split.
- https://biolink.github.io/kgx/kgx_format.html -- KGX format.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9372416/ -- Biolink Model.
- https://arxiv.org/abs/2302.10800, https://arxiv.org/pdf/2302.10800 -- KG-Hub, KG-OBO.
- https://github.com/hetio/hetionet -- Hetionet.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10375517/ -- connectivity search.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC9893183 -- PrimeKG.
- https://pykeen.readthedocs.io/en/latest/api/pykeen.datasets.PrimeKG.html -- PyKEEN PrimeKG loader.
- https://graphdb.ontotext.com/documentation/10.8/visualize-and-explore.html -- GraphDB views.
- https://docs.stardog.com/archive/9.0.0/stardog-applications/explorer/ -- Stardog Explorer.
- https://aws.github.io/graph-explorer/features/graph-view/ -- AWS Graph Explorer.
- https://neo4j.com/docs/browser-manual/current/operations/browser-settings/ -- Browser defaults.
- https://journals.sagepub.com/doi/full/10.3233/SW-150200 -- VOWL.
- https://arxiv.org/html/2507.13759v1 -- ontology visualization tool failures.
- https://www.frontiersin.org/journals/bioinformatics/articles/10.3389/fbinf.2026.1756507/full -- SHACLens.
