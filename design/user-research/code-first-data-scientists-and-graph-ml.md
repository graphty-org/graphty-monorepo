# Code-First Data Scientists and Graph Machine Learning Engineers

## 1. Summary

This population works in code first and opens a graph picture second. It has two overlapping groups. The first is
Python and R data scientists who build a graph out of tables (transactions, co-occurrences, user actions, citations)
inside a Jupyter notebook, compute a handful of metrics with NetworkX or igraph, and want a quick look at the result
with matplotlib, pyvis, Plotly, ipysigma or an export to Gephi. The second is machine learning engineers and researchers
who train graph neural networks (GNNs) and graph-based recommenders with PyTorch Geometric (PyG), DGL or Neo4j Graph
Data Science (GDS). For the second group the graph picture is almost never the deliverable: it is a debugging
instrument opened on a small piece of a very large graph -- the two-hop neighborhood of a misclassified node, the
subgraph an explainer says mattered, one user's interactions and recommended items, one sampled mini-batch -- or an
embedding scatter plot colored by community or label. Four further kinds of work change what a viewer must hold.
Graph-level learners (molecules, proteins, syntax trees) train on collections of thousands of small graphs and inspect
one graph at a time, picked by label, split or error. Tabular data scientists feed graph features (PageRank,
component size, community, embeddings) to models such as XGBoost and open the graph only to check a flagged case.
Entity resolution analysts review thousands of small clusters of linked records. Temporal graph learners need each
edge's event time, because a time-respecting split decides whether a metric is honest. Both groups expect an algorithm to return a value per node (the NetworkX "returns a dict" shape) and
move data to a viewer as DataFrames, edge lists, GraphML and Parquet or Arrow tables (Section 6.1). An adjacent group draws the model itself, not
graph data: engineers who inspect a network's computation graph in Netron or Model Explorer, and interpretability
researchers who prune and annotate attribution graphs on Neuronpedia (Persona 3.7). Section 9.1 records why the first is
out of scope and the second deferred.

## 2. Population

**Job titles.** Data Scientist, Senior Data Scientist, Applied Scientist, Machine Learning Engineer, Graph Machine
Learning Engineer, Research Scientist (GNNs), Recommender Systems Engineer, Data Scientist - Graph Neural Networks.
Postings that ask for PyG or DGL pair them with "design, build and optimize Graph Neural Network models" and
production deployment (https://www.dice.com/job-detail/025f75c2-337f-41ad-8efb-4db105d3f063). Graphika lists "experience with GNNs and
large-scale graph processing (PyG, DGL)" as a requirement for a graph-model ML engineer
(https://www.graphika.com/careers/machine-learning-engineer-graph-models).

**Sectors.** Recommendation (Pinterest PinSage, LinkedIn LiGNN, Reddit ads via Kumo, Tableau's RekomGNN), social
media intelligence (Graphika), network operations, finance (fraud features, Workflow 5.9), drug discovery and
materials (graph-level models, Persona 3.5), record linkage (Persona 3.6), and academia (OGB and TGB communities). Sources: https://arxiv.org/abs/1806.01973, https://arxiv.org/abs/2402.11139,
https://kumo.ai/case-studies/reddit-boosts-ad-performance-with-graph-neural-networks-and-kumo/,
https://arxiv.org/html/2310.11562.

**Team context.** The one industry team documented in detail (Tableau, RekomGNN) was 4 software engineers, 4 ML
engineers and 1 project manager (https://arxiv.org/html/2310.11562). GNNLens interviewed 12 people who "had experience
applying or designing GNNs" (https://ar5iv.labs.arxiv.org/html/2011.11048); CorGIE interviewed four GNN developers
from three organizations (https://ar5iv.labs.arxiv.org/html/2106.12839).

**Size.** No source counts the humans; downloads last month (November 2026) are dominated by automation. networkx
had 289,773,485 PyPI downloads but is a required dependency of PyTorch
(https://download.pytorch.org/whl/cu128/torch-2.9.1%2Bcu128-cp311-cp311-win_amd64.whl.metadata); igraph 4,384,863;
pyvis 2,101,311 (closer to direct use); torch-geometric 1,392,977; dgl 77,251 (also ships from its own index);
graphdatascience 54,790 (https://pypistats.org/packages/networkx and the same path per package). On CRAN, igraph had
522,143, visNetwork 62,333, ggraph 61,236
(https://cranlogs.r-pkg.org/downloads/total/last-month/igraph,visNetwork,ggraph,tidygraph,network). The defensible
reading: GNN trainers number at most the low hundreds of thousands; the notebook group is larger but unmeasured.

**Frequency.** No source measures it; visualization is episodic. NetworkX says its "main goal is to enable graph
analysis rather than perform graph visualization" and points to Cytoscape, Gephi and Graphviz
(https://networkx.org/documentation/stable/reference/drawing.html), so a picture is a step out of the main tool.

**Skill profile.** Strong Python (pandas, NumPy, PyTorch) and evaluation metrics; graph literacy from practitioner
(centrality, communities) to expert (message passing, sampling); little JavaScript. They prefer tables: RekomGNN kept a
table view because it "is consistent with how MLEs and SEs regularly interact with their data"
(https://arxiv.org/html/2310.11562).

## 3. Personas

### 3.1 Priya -- notebook data scientist doing ad hoc graph analytics (new: notebook-graph-data-scientist)

- **Role.** Senior data scientist on a product analytics or risk team. Five-plus years of pandas, scikit-learn and
  Jupyter; uses NetworkX, and igraph, networkit or graph-tool when NetworkX is too slow. At lakehouse scale she uses GraphFrames in
  Databricks (Workflow 5.1). On a GPU she keeps her NetworkX code and sets `NX_CUGRAPH_AUTOCONFIG=True`; NVIDIA's
  benchmark shows `betweenness_centrality(k=10)` on cit-Patents dropping from about 7 min 41 s to about 5.3 s
  (https://docs.nvidia.com/cugraph/latest/nx_cugraph/how-it-works/; vendor figure).
- **Data.** A DataFrame of interactions (customer-merchant transactions, user-user messages, co-purchases, co-authorship)
  with 10^3 to 10^6 rows, turned into a graph with `nx.from_pandas_edgelist(df, source, target, edge_attr)`; node
  attributes come from a second table.
- **Tools today.** NetworkX for metrics, matplotlib `nx.draw` for a first look, pyvis for interactive HTML, Plotly for
  a dashboard, Gephi when the picture matters ("Gephi may also be required",
  https://www.packtpub.com/en-us/product/graph-machine-learning-9781803248066). R users do the same with
  `igraph::graph_from_data_frame`, ggraph and visNetwork (https://kateto.net/polnet2024.html,
  https://cran.r-project.org/web/packages/visNetwork/vignettes/Introduction-to-visNetwork.html).
- **Goals.** Find the important nodes and the groups; check that the graph looks like what she thinks it is; produce one
  figure for a slide deck; hand graph features back to a DataFrame for a tabular model (Workflow 5.9).
- **Frustrations, with evidence.** Hairballs "don't really communicate much else" than complexity
  (https://ericmjl.github.io/Network-Analysis-Made-Simple/01-introduction/03-viz). pyvis physics freezes on big graphs,
  so users precompute positions and turn physics off. A pyvis network in Streamlit "suddenly stops loading" above about 1,000 nodes
  (https://discuss.streamlit.io/t/streamlit-pyvis-error-when-displaying-large-network/28501). Plotly cannot hover an edge (https://plotly.com/python/network-graphs/). Export breaks: `write_graphml` raises "GraphML writer does not support <type> as data values" on list or dict attributes
  (https://networkx.org/documentation/latest/_modules/networkx/readwrite/graphml.html). NetworkX is slow at scale:
  PageRank on the Google web graph took 33.5 s in NetworkX against 0.1 s in networkit and 2.4 s in igraph
  (https://discourse.julialang.org/t/lightgraphs-benchmark-study-take-2/39297.md).

### 3.2 Chris -- ML engineer, graph recommenders (existing: ml-engineer-recsys, corrected)

- **Role.** ML engineer on a recommendation team (e-commerce, content, ads, a data catalog). Writes PyTorch and PyG,
  trains LightGCN or GraphSAGE-style models on a user-item bipartite or heterogeneous graph, evaluates with recall@K
  and NDCG, and ships embeddings or scores into a ranking pipeline.
- **Data.** Interaction logs and item catalogs, from MovieLens small (100,836 ratings,
  https://pytorch-geometric.readthedocs.io/en/2.6.0/notes/load_csv.html) to Pinterest's 18 billion edges
  (https://arxiv.org/abs/1806.01973) and LinkedIn's up to a hundred billion nodes (https://arxiv.org/abs/2402.11139);
  sizes in Section 6.
- **Where he opens a visualization.** Not to build the recommender. He opens one to (a) spot-check one user's
  recommendations against that user's history and neighborhood, (b) understand why a specific bad recommendation was
  made, (c) compare item or user embeddings against known categories or communities, and (d) show stakeholders that the
  model is sensible. RekomGNN's engineers judged quality by applying "subjective knowledge and impressions about the
  input graph", scored recommendations by hand with star ratings and exported the annotations as CSV "to use within
  their existing workflows" (https://arxiv.org/html/2310.11562).
- **Correction to the existing record.** Building and deploying a recommender happens in code, never in a viewer; a
  graph product serves inspection of one seed user (Section 10.1).
- **Frustrations.** Whole-graph views are useless at his scale: the RekomGNN team "did not find evidence that the input
  graph was helpful for making validity assessments" and found "the size of the input graph made it undesirable to
  examine" (https://arxiv.org/html/2310.11562). Physical hop distance alone misleads because GNNs also use features
  (same source). Heterogeneous explanations could not be drawn with PyG's built-in helper: `visualize_graph` for
  `HeteroExplanation` is still an open roadmap item (https://www.github.com/pyg-team/pytorch_geometric/issues/9112).
  Time leakage: "unless you're meticulous about time filtering, you'll end up training on future edges"
  (https://docs.nvidia.com/sdgm/how-distributed-training-works).

### 3.3 Wei -- GNN model developer and debugger (new: gnn-model-debugger)

- **Role.** Research scientist or deep learning engineer building node classification and link prediction models
  (GCN, GAT, GraphSAGE) on one large graph, like GNNLens's "senior researcher who develops new GNNs"
  (https://ar5iv.labs.arxiv.org/html/2011.11048).
- **Data.** Benchmarks from Cora (2,708 nodes) to ogbn-papers100M (https://ogb.stanford.edu/docs/nodeprop; Section 6)
  plus a proprietary graph.
- **Tools today.** PyG or DGL; `to_networkx` and `nx.draw_networkx` with `spring_layout(seed=42)` in the PyG
  introductory notebook (https://gdl.readthedocs.io/en/latest/ipynbs/pytorch_geometric/1_Introduction.html); t-SNE
  of hidden embeddings colored by class; `explanation.visualize_graph()`, a static file (Workflow 5.4); TensorBoard's
  embedding projector (Workflow 5.5).
- **Goals.** CorGIE's interviews reduced them to three questions: "are we there yet?" (should training continue), "are
  we lost?" (is the model learning what the graph should teach), and "what's that?" (what does this node or link do)
  (https://ar5iv.labs.arxiv.org/html/2106.12839).
- **Frustrations.** Evaluation relies on aggregate metrics (precision, F1, Hit@k) and most developers do not analyze
  deeper "due to the lack of tools" (CorGIE, same source). Explainer outputs are sensitive to the threshold that
  decides subgraph size: GNNExplainer's recall on one benchmark moved from 0.52 to 0.97 between a threshold of 6 and 20
  edges (https://arxiv.org/pdf/2111.12984). Converting a large DGL graph to NetworkX is CPU-only and slow
  (https://doc.dgl.ai/generated/dgl.to_networkx.html).

### 3.4 Marcus -- data scientist porting a metric (existing: plugin-author-data-scientist, confirmed and deepened)

The existing record is well grounded. Additional evidence:

- The shape he expects is real: `nx.pagerank(G, ...)` "returns a dictionary of nodes with PageRank as value"
  (https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.link_analysis.pagerank_alg.pagerank.html).
  The JavaScript library graphology mirrors it: `pagerank(graph)` returns per-node values and `pagerank.assign(graph)`
  writes them as node attributes, with the same defaults (https://graphology.github.io/standard-library/metrics.html).
- What goes wrong when porting is numerical, not syntactic. Betweenness normalization changed across NetworkX versions
  and depends on `endpoints` and directedness (https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html).
  igraph and NetworkX PageRank disagree when dangling nodes exist with personalization, because of solver choice
  (https://lists.gnu.org/archive/html/igraph-help/2020-01/msg00009.html), and when one graph silently drops an
  isolated node or treats edges as undirected
  (https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/42160566/inconsistency-between-results-in-pagerank-networkx-vs-igraph).
- NetworkX backends keep the function name and arguments but may drop parameters (Workflow 5.6), so a data scientist
  expects "same name, same arguments, same dict" and is burned when a default differs silently. Porting into
  graphty-element itself has never been observed; it remains a design hypothesis.

### 3.5 Lena -- graph-level GNN developer for molecules and other small graphs (new: graph-level-gnn-developer)

- **Role.** Machine learning scientist in drug discovery, materials or program analysis who predicts a property of a
  whole graph: is this molecule active or toxic; which class is this protein graph.
- **Data.** A dataset of many small graphs, each with its own label and split membership. ogbg-molhiv has 41,127
  molecules averaging 25.5 nodes and 27.5 edges, a scaffold split and ROC-AUC; ogbg-ppa holds protein association
  graphs split by species and ogbg-code2 Python syntax trees split by project. Molecule nodes are atoms with
  9-dimensional features; edges are bonds. The scaffold split "splits the molecules based on their two-dimensional
  structural frameworks" (https://ogb.stanford.edu/docs/graphprop). PyG batches graphs into one block-diagonal graph
  with a `batch` vector (https://pytorch-geometric.readthedocs.io/en/latest/get_started/introduction.html).
- **Tools today.** RDKit to turn SMILES strings into graphs and to draw molecules; PyG or DGL with a pooling readout;
  attribution methods (integrated gradients, GNNExplainer, Captum, which is PyG Colab 6). Attributions are drawn as
  atom and bond coloring on the 2D chemical structure (https://arxiv.org/pdf/2610.29589), not on a force layout; RDKit's
  `SimilarityMaps.GetSimilarityMapFromWeights(mol, weights)` "generates the similarity map for a molecule given the
  atomic weights" (https://www.rdkit.org/docs/source/rdkit.Chem.Draw.SimilarityMaps.html).
- **Goals.** Find which test graphs the model gets wrong and why; check that the model uses a chemically or
  structurally meaningful substructure rather than an artifact; judge whether an error is out of domain (no similar
  training graph) or a property cliff (a near-identical training graph with a different label).
- **Frustrations, with evidence.** Summing atom attributions per fragment can mislead, because RDKit refills freed
  valences when a fragment is cut out (https://arxiv.org/pdf/2610.29589, preprint). Distance to the nearest training
  molecule is used to bin and compare errors, but Tanimoto distance is "a metric of relative uncertainty", not of
  error size (https://arxiv.org/pdf/2005.10036). General graph viewers load one graph per document, so browsing a collection
  happens in a notebook grid of RDKit drawings.
- **Not** the molecular networking chemists of network-medicine-and-biomedical-knowledge-graphs.md (spectra as nodes).

### 3.6 Sam -- entity resolution data scientist reviewing clusters (new: entity-resolution-cluster-reviewer)

- **Role.** Data scientist who links records of the same person or company in code with libraries such as Splink, in
  a notebook or on Spark (the graph database view is in knowledge-graph-engineers-and-graphrag.md).
- **Data.** Pairwise predictions (record A, record B, match weight, match probability) from a probabilistic model.
  `linker.clustering.cluster_pairwise_predictions_at_threshold(df_predictions, threshold_match_probability=0.5)`
  turns pairs above the threshold into clusters by connected components
  (https://moj-analytical-services.github.io/splink/demos/tutorials/06_Visualising_predictions.html): one small graph
  per real-world entity.
- **Tools today.** Splink's cluster studio, an HTML dashboard sampling clusters `by_cluster_size`
  (https://moj-analytical-services.github.io/splink/charts/cluster_studio_dashboard.html). Splink's graph metrics:
  node degree and centrality, `is_bridge` per edge, cluster size, density and centralization; low density "could
  indicate links being missed", bridges "can be signalers of false positives", and
  `sampling_method="lowest_density_clusters_by_size"` pulls low-density clusters for review
  (https://moj-analytical-services.github.io/splink/topic_guides/evaluation/clusters/graph_metrics.html).
- **Goals.** Pick a threshold and blocking rules that neither over-merge (one giant cluster joined by a weak bridge)
  nor under-merge (a sparse cluster missing links); find the clusters needing clerical review.
- **Frustrations.** No single metric is definitive (same page); review is one cluster at a time across a huge
  collection.

### 3.7 Model-graph inspectors and interpretability researchers (adjacent population; scope in Section 9.1)

These users draw the model, not graph data. No persona record is proposed; Section 9.1 explains why.

- **Model deployment and optimization engineers** inspect a network's computation graph (operators as nodes, tensors
  as edges) when converting a model between frameworks, quantizing it or fitting it to a device's latency budget.
  Tools: Netron, which opens ONNX, TensorFlow Lite, PyTorch, Core ML, OpenVINO, Keras and other formats in a browser,
  a desktop app or `pip install netron` (https://github.com/lutzroeder/netron); Google's Model Explorer (TFLite, TF,
  TFJS, MLIR and PyTorch ExportedProgram, with community adapters for ONNX,
  https://github.com/google-ai-edge/model-explorer); TensorBoard's Graphs dashboard; Apple's internal Talaria, which
  "800+ practitioners" used to submit "3,600+ models" in two years (https://arxiv.org/abs/2404.03085).
- **Sizes and where tools fail.** MobileBERT has "almost 2,000 nodes" (https://research.google/blog/model-explorer/).
  On a TensorFlow graph that loaded forever, Netron's maintainer wrote "The graph has more than 5000 nodes and the graph
  layout is choking" and that such graphs need "an expand and explore UI that avoids rendering the entire graph"; the
  issue was closed as not planned in 2024 (https://www.github.com/lutzroeder/netron/issues/68). Model Explorer's blog
  says SVG is "not designed for rendering a large number of objects", so it extracts layer hierarchy from TensorFlow,
  PyTorch and JAX, lays out a layer only when opened, renders with WebGL and three.js, and shows a 50,000-node demo at
  60 FPS (a vendor claim). Operator counts for large language model exports: no source found.
- **Interpretability researchers** study attribution graphs: for one prompt, nodes are interpretable features, input
  tokens, error terms and output logits, and edges are direct effects between them
  (https://transformer-circuits.pub/2025/attribution-graphs/methods.html). Anthropic's open-source circuit-tracer
  generates them for open-weights models such as Gemma-2-2b and Llama-3.2-1b, and Neuronpedia hosts the front end for
  visualizing, annotating and sharing graphs and for testing hypotheses by changing feature values
  (https://anthropic.com/research/open-source-circuit-tracing). A pruned graph "often contains hundreds of nodes and
  tens of thousands of edges"; unpruned, edges "can grow to the millions even for short prompts"; pruning usually cuts
  nodes "by a factor of 10" while losing about 20% of the explained behavior (methods paper). Manual analysis takes
  "approximately 2 hours for an experienced circuit tracer" per prompt (https://arxiv.org/html/2511.07002v1, preprint).

## 4. Use cases (ranked)

| #   | Question answered with a graph                                                                                          | Who                                 | Frequency                       | Stakes                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | "What does this graph I just built from a table look like -- is it one blob, many components, a few hubs?"              | Priya                               | Every graph project, first hour | Low; a wrong construction propagates                                                   |
| 2   | "Which nodes are central and which groups exist?" (degree, PageRank, Louvain) shown as size and color                   | Priya                               | Most projects                   | Medium                                                                                 |
| 3   | "Do graph features improve my fraud or risk model, and does this high-scoring account really look suspicious?"          | Priya                               | Each tabular model              | High; lift is large in vendor demos, small at bank scale (5.9)                         |
| 4   | "Is this cluster of linked records one real entity, or two joined by a weak bridge?"                                    | Sam                                 | Every linkage run               | High; over-merging fuses people                                                        |
| 5   | "Which test molecules or graphs does the model get wrong, and does it use a meaningful substructure?"                   | Lena                                | Each model iteration            | High; drives which compounds are made                                                  |
| 6   | "Why did the model get this node or user wrong?" (k-hop neighborhood with labels, predictions, split)                   | Wei, Chris                          | During model development        | High                                                                                   |
| 7   | "Are this user's recommendations sensible given their history and neighbors?"                                           | Chris                               | Each model iteration            | High; precedes launch                                                                  |
| 8   | "Which edges and features did the explainer say mattered?"                                                              | Wei, Chris, Lena                    | Per investigation               | Medium to high; explanations can be unfaithful (https://arxiv.org/pdf/2111.12984)      |
| 9   | "Do the learned embeddings separate the classes or communities I expect?"                                               | Wei, Chris                          | After training runs             | Medium; "are we lost?"                                                                 |
| 10  | "Is the sampled mini-batch or the train/validation split what I think it is (no leaked target edges, no future edges)?" | Wei, Chris, temporal graph learners | Rare but critical               | High; leakage silently inflates metrics (https://ar5iv.labs.arxiv.org/html/2306.00899) |
| 11  | "Does my metric in the browser give the same numbers as my Python?"                                                     | Marcus                              | Once per ported metric          | Medium                                                                                 |
| 12  | "Where in this model did conversion or quantization break it?"                                                          | Adjacent (3.7), out of scope        | Each conversion                 | High; out of scope (9.1)                                                               |

The ranking is a judgment; no source measures how often each question is asked.

## 5. Step-by-step workflows

### 5.1 Table to graph to quick look in a notebook (Priya)

Sources: Network Analysis Made Simple (https://ericmjl.github.io/Network-Analysis-Made-Simple/01-introduction/03-viz),
pyvis tutorial (https://pyvis.readthedocs.io/en/stable/tutorial.html), NetworkX drawing reference
(https://networkx.org/documentation/stable/reference/drawing.html), ipysigma (https://pypi.org/project/ipysigma/),
yFiles Graphs for Jupyter (https://www.yworks.com/yfiles-graphs-for-jupyter).

1. **Load and clean.** `df = pd.read_csv(...)` or a SQL query. Decide the node identity (customer id vs
   account id), drop self-pairs, aggregate repeated pairs into a `weight` count, decide directed or undirected.
   Decision: what counts as an edge (any transaction, or above a threshold).
2. **Build.** `G = nx.from_pandas_edgelist(df, "src", "dst", edge_attr="weight", create_using=nx.DiGraph)`;
   attach node attributes with `nx.set_node_attributes(G, attr_df.to_dict("index"))`. Check `G.number_of_nodes()`,
   `nx.number_connected_components`, degree histogram. Typical: 10^3-10^5 nodes.
3. **First picture.** `nx.draw(G)` with matplotlib. Above a few hundred nodes this is a hairball; many stop
   here or switch representation (nxviz matrix, arc, circos, hive plots grouped by an attribute:
   `nv.circos(G, group_by="group", node_color_by="group")`).
4. **Metrics.** `pr = nx.pagerank(G, weight="weight")`, `bc = nx.betweenness_centrality(G, k=500)`
   for sampling on larger graphs, `comms = nx.community.louvain_communities(G, seed=42)`. Results are dicts or a list of
   sets; she writes them back with `nx.set_node_attributes(G, pr, "pagerank")` and into a DataFrame for sorting.
5. **Interactive look.** pyvis: `net = Network(notebook=True); net.from_nx(G); net.show("g.html")`, with
   `spring_layout(G, seed=42)` positions and `toggle_physics(False)` on thousands of nodes; or ipysigma
   `Sigma(G, node_color="community", node_size="pagerank")` in the cell; or `nx.write_gexf(G, "g.gexf")` into Gephi,
   ForceAtlas2, color by modularity class, after stringifying list or dict attributes with `json.dumps`.
6. **Read and decide.** Are communities meaningful against known labels? Is one hub an artifact (a test account, a
   default merchant id)? If yes, go back to step 1 and filter.
7. **Hand off.** A PNG or HTML file in a slide or a Confluence page; a DataFrame of node metrics to the modeling
   pipeline. The visual is rarely reproducible beyond the notebook cell and its seed.

**Warehouse-scale variant.** With 10^8 to 10^9 edge rows, she builds `GraphFrame(vertices_df, edges_df)` in
Databricks and runs `connectedComponents()`, `pageRank()` or `labelPropagation()`, getting Spark DataFrames back as
tables (https://docs.databricks.com/aws/en/integrations/graphframes/user-guide-scala), or runs unchanged NetworkX on a
GPU (https://docs.nvidia.com/cugraph/latest/nx_cugraph/how-it-works/). She aggregates (component sizes, top-k nodes),
extracts one piece -- a suspicious component, a community, a top node's k-hop neighborhood -- with a filter or motif
query, `toPandas()` it and continues at step 3. A viewer must accept node and edge tables with precomputed metric
columns and run where the notebook runs (Databricks, Colab, Jupyter, VS Code).

### 5.2 Spot-check one user's recommendations (Chris)

Sources: RekomGNN usage scenario (https://arxiv.org/html/2310.11562); Neo4j GDS FastRP and kNN tutorial
(https://neo4j.com/docs/graph-data-science-client/current/tutorials/fastrp-and-knn/); neo4j-viz GDS integration
(https://neo4j.com/docs/python-graph-visualization/current/integration/gds/).

1. **Train and score, outside any viewer.** PyG LightGCN on the bipartite graph, or in Neo4j GDS: project a
   Person-Product graph, `gds.fast_rp.mutate(G, mutate_property="embedding", random_seed=42)`, then
   `gds.knn.write(G, node_properties=["embedding"], write_relationship_type="SIMILAR", write_property="score")`.
2. **Pick seeds.** Heavy, cold-start and complaint users, and a sample stratified by probability, because
   aggregation "can obscure trends and outliers" (RekomGNN).
3. **Inspect one seed.** View: the user's own interactions (history), the top-N recommended items with predicted
   probability, item attributes (category, popularity, centrality, community), and the connection between history and
   recommendation (shortest path, shared neighbors, or explainer edges). RekomGNN's engineer brushed probability
   histograms by item type and showed derived attributes instead of a drawing of the 211K-node graph.
4. **Judge.** Is this a popularity artifact? Does the recommendation come from a distant but feature-similar node (one
   engineer: connections between distant nodes "would never pop up any other way")? Is the item already consumed (a
   leakage or filtering bug)?
5. **Annotate and hand off.** Star rating per questionable recommendation, export as CSV, take back into the training
   or filtering code. In Neo4j, `from_gds(gds, G)` renders a projection in a notebook, sampling by random walk
   with restarts above `max_node_count` (default 10,000), so for one user he extracts that user's neighborhood first.

### 5.3 Diagnose misclassified nodes (Wei)

Source: GNNLens case studies (https://ar5iv.labs.arxiv.org/html/2011.11048); PyG utilities
(https://pytorch-geometric.readthedocs.io/en/2.6.0/modules/utils.html).

1. **Overview of errors.** Accuracy overall and on test (GNNLens Case One: GCN on Amazon Photo, 7,650 products, 91.15%
   overall, 677 wrong). Break errors down by true label: one class dominates.
2. **Form a hypothesis with derived attributes.** Per node: correct or not, label, whether the dominant label of the
   nearest training nodes matches, shortest-path distance to a training node. Most class-7 errors do not match their
   nearest training labels (264/331).
3. **Look at the neighborhoods.** Show the two-hop neighborhoods of about 150 misclassified nodes with labels,
   predictions and training membership (`k_hop_subgraph(idx, 2, data.edge_index)`, then `to_networkx`). Neighbors
   often carry different labels (heterophily).
4. **Compare models.** GCN vs an MLP (features only) vs a GNN without features (structure only), to see which
   information source drives the error.
5. **Read individual nodes.** Case Two (GAT on Cora-ML, 2,810 papers): the feature view shows the words "markov",
   "model", "chain"; the paper's title shows it is mislabeled, not misclassified, and three neighbors share the problem.
6. **Act.** Reweight the loss for the weak class, or fix labels. Hand-off is a code change and a note, not a figure.

Inspected size: two hops around tens to hundreds of selected nodes; the GNNLens projection view becomes unreadable
without clustering at about 300 nodes.

### 5.4 View an explainer subgraph (Wei, Chris)

Source: PyG explain tutorial (https://pytorch-geometric.readthedocs.io/en/2.5.2/tutorial/explain.html); DGL
HeteroGNNExplainer (https://www.dgl.ai/dgl_docs/generated/dgl.nn.pytorch.explain.HeteroGNNExplainer.html).

1. Wrap the trained model: `Explainer(model, algorithm=GNNExplainer(epochs=200), edge_mask_type="object",
model_config=dict(task_level="node", ...))`, optionally `threshold_config=dict(threshold_type="topk", value=10)`.
2. Explain one prediction: `explanation = explainer(data.x, data.edge_index, index=node_id)`.
3. Inspect: `explanation.node_mask`, `explanation.edge_mask` (values in 0..1). Plot
   `explanation.visualize_feature_importance(top_k=10)` and `explanation.visualize_graph("subgraph.pdf")`, which draws
   edges with opacity proportional to importance via Graphviz or NetworkX. For heterogeneous graphs this helper is not
   available, so engineers draw the per-edge-type masks themselves.
4. Decide the threshold. The picture changes with top-k or hard threshold; benchmark work recommends choosing it by
   grid search rather than a fixed edge count (https://arxiv.org/pdf/2111.12984).
5. Validate: `unfaithfulness(explainer, explanation)` from `torch_geometric.explain.metric`; remove the top edges and
   re-predict.
6. Hand off: a static PDF or PNG of a 10-50 edge subgraph into a report, or a path explanation for a recommendation
   (user -> item -> brand -> item, as in PGPR and PaGE-Link, https://arxiv.org/pdf/2302.12465).

### 5.5 Embeddings against communities and labels (Wei, Chris, Priya)

Sources: CorGIE (https://ar5iv.labs.arxiv.org/html/2106.12839); TensorBoard projector
(https://www.tensorflow.org/tensorboard/tensorboard_projector_plugin); node2vec-then-UMAP guidance
(https://arxiv.org/pdf/2602.24069).

1. Extract embeddings (`model(...)` hidden layer, node2vec, or `gds.graph.nodeProperties.stream(G, ["embedding"])`,
   which returns a DataFrame, https://neo4j.com/docs/graph-data-science-client/current/api/graph).
2. Embed at moderate dimension (for example 128) and then reduce with UMAP or t-SNE to 2D; reducing node2vec directly
   to 2D does not preserve communities.
3. Color points by true label, predicted label, Louvain community or item category; in TensorBoard, write a metadata
   TSV with those columns.
4. Read: do classes separate; do communities in the graph correspond to clusters in embedding space? CorGIE's core
   loop is to select a focal group in one space (graph topology, latent, features) and see where it lands in the others.
5. Act: continue training, change hyperparameters, or investigate a cluster in the graph (back to 5.3).

Gap observed: the graph and the embedding live in different tools. CorGIE was built because they do not link.

### 5.6 Port a graph algorithm to another engine (Marcus)

The documented practice is porting to a new NetworkX backend, the closest analog to porting a metric into
graphty-element. Sources: NetworkX backends guide (https://networkx.org/documentation/stable/reference/backends.html);
nx-cugraph (above).

1. **Keep the reference signature.** A backend implements the NetworkX function under the same name and arguments,
   registers through a `networkx.backends` entry point, and supplies `convert_from_nx` and `convert_to_nx`.
2. **Declare what is unsupported.** Parameters a backend cannot honor are listed per function (cuGraph's pagerank omits
   `dangling`; the Neptune backend omits `personalization`, `nstart`, `weight`, `dangling`), and unsupported calls fall
   back to plain NetworkX.
3. **Test against the reference suite.** Set `NETWORKX_TEST_BACKEND=<name>` and `NETWORKX_FALLBACK_TO_NX`, then run
   `pytest --pyargs networkx`; NetworkX converts its own test graphs through the backend, and `on_start_tests` marks
   known gaps as expected failures. Results are converted back to NetworkX form for comparison.
4. **Check the cases where libraries disagree.** Dangling nodes with personalization, isolated nodes, direction,
   normalization and convergence tolerance (Persona 3.4 lists the evidence).
5. **Use it unchanged.** Callers keep their code and opt in by `backend="cugraph"` or an environment variable.

**Design hypothesis, not observed: porting into graphty-element.** By analogy the author wants one runnable example,
a map from node id to number back (as graphology's `pagerank(graph)` returns), a parity check against NetworkX on a
small graph with a dangling and an isolated node, and the result usable for color and size like a built-in. Test it
with real authors.

### 5.7 Check a sampled training graph or split (Wei, Chris)

Sources: PyG NeighborLoader tutorial (https://pytorch-geometric.readthedocs.io/en/2.6.0/tutorial/neighbor_loader.html);
link prediction pitfalls (https://ar5iv.labs.arxiv.org/html/2306.00899); RandomLinkSplit
(https://pytorch-geometric.readthedocs.io/en/2.5.2/generated/torch_geometric.transforms.RandomLinkSplit.html).

1. `loader = NeighborLoader(data, num_neighbors=[25, 10], batch_size=128, input_nodes=data.train_mask)`; the first
   `batch.batch_size` nodes are seeds, `batch.n_id` maps back to global ids. With fanout 25 then 10, each seed reaches at
   most 1 + 25 + 250 nodes before shared neighbors are merged.
2. Pull one batch and draw it: seeds vs sampled
   neighbors, hop number, and whether any validation or test target edge appears in the message-passing edges.
3. For link prediction, `RandomLinkSplit` keeps validation and test edges out of training message passing, but PyG does
   not exclude target edges from mini-batch graphs during training; the pitfalls paper shows this inflates results.
4. **Temporal check.** When edges carry event times, show the seed's sampled neighborhood with each edge colored or
   filtered by its time relative to the seed's label (prediction) time, and look for any edge after it. PyG's
   `NeighborLoader(..., time_attr="time", input_time=...)` only keeps neighbors with "an earlier or equal timestamp
   than the center node" (https://pytorch-geometric.readthedocs.io/en/latest/modules/loader.html), but a split built
   without it trains "on future edges" (https://docs.nvidia.com/sdgm/how-distributed-training-works).
5. Decision: fix the split or the sampler; record it in the experiment log.

**Temporal graph learners** (TGN and successors) use the Temporal Graph Benchmark, which splits chronologically
70/15/15 and ranks each true future edge against historical and random negatives by filtered MRR
(https://arxiv.org/html/2307.01026). TGB-Seq finds older datasets "feature excessive repeated edges", so models score
by memorizing history (https://arxiv.org/html/2502.02975v3). Their question -- is a prediction a repeat of a past edge
or a new one -- needs a node's past edges laid out by time.

### 5.8 Inspect misclassified graphs in a collection of small graphs (Lena)

Sources: OGB graph property docs, PyG introduction, RDKit SimilarityMaps (all in Persona 3.5).

1. **Load the dataset.** `PygGraphPropPredDataset(name="ogbg-molhiv")` and `dataset.get_idx_split()` give 41,127 graphs
   with per-graph labels and a scaffold split; `DataLoader(dataset[split_idx["test"]], batch_size=32)` batches them.
2. **Train and score.** A GIN or GCN with a pooling readout; ROC-AUC from the OGB `Evaluator`. Keep per-graph
   predictions keyed by graph index.
3. **Pick graphs to inspect.** Sort test graphs by error, label or scaffold; sample a few dozen into a grid of small
   drawings with label, prediction and split per graph.
4. **Attribute.** Run an explainer per chosen graph (integrated gradients through Captum, GNNExplainer with
   `task_level="graph"`) to get one weight per atom (node) and per bond (edge).
5. **View one graph with its attribution.** Atom and bond weights as color on a 2D chemical drawing
   (`GetSimilarityMapFromWeights`); a force layout would scramble rings and functional groups.
6. **Compare with similar training graphs.** Find the nearest training graphs by fingerprint (Tanimoto) or by learned
   graph embedding, show them side by side with their labels, and ask: is there no similar training graph (out of
   domain), or a near-identical one with the opposite label (a property cliff)?
7. **Judge and act.** Does the highlighted substructure match a known pharmacophore or toxicophore, or an artifact
   (a salt fragment)? Fix data, featurization or split. Hand-off is a grid figure and a list of compound ids.

### 5.9 Graph features for a tabular model (Priya)

Sources: Neo4j GDS in Python (https://neo4j.com/blog/developer/using-neo4j-graph-data-science-in-python-to-improve-machine-learning-models/);
Neo4j IEEE-CIS fraud graphs (https://neo4j.com/developer/industry-use-cases/finserv/retail-banking/ieee-cis-fraud-graphs/);
TigerGraph Ethereum example (https://www.tigergraph.com/blog/using-graph-machine-learning-to-improve-fraud-detection-rates/);
ING personalized PageRank study (https://arxiv.org/html/2402.09495v1).

1. **Build the graph from the tables.** IEEE-CIS: transactions linked to cards, devices, emails and addresses. P2P:
   users and cards. Ethereum: 32,168 accounts, 84,088 transactions.
2. **Baseline first.** The tabular model without graph features (Random Forest, XGBoost, logistic regression at ING).
3. **Compute graph features.** Weakly connected component size, PageRank, closeness, betweenness, degree, Louvain
   community, FastRP embeddings; at ING, personalized PageRank whose personalization vector is each account's average
   training label, over about 89 million transactions. Each returns a DataFrame.
4. **Join on the entity id** (`gds.util.asNodes` to recover user ids in the P2P example) and retrain.
5. **Measure lift against the baseline.** P2P: AUC 0.72 to 0.92, 79% of fraud caught, component size the strongest
   feature. Ethereum: 77% to 91% accuracy, FastRP about 3 points more, a GraphSAGE GNN 97%. ING: AUC 0.74 to 0.76,
   with PPR the second most important feature. The first two are vendor demos; only ING used a bank's real data.
6. **Inspect the top cases in the graph.** Open the highest-scoring accounts, see their component or neighborhood
   with known-fraud labels marked, and check whether the score is a ring or an artifact (a shared default device). In the IEEE-CIS architecture analysts "confirm rings" in
   Neo4j Bloom and propagate the label to connected accounts; TigerGraph shows the subgraph behind one account's GNN
   prediction.
7. **Export.** The node metric table goes back to the feature store; a picture of one ring goes to the case file.
   The viewer needs neighbor counts split by label (how many known-fraud versus legitimate neighbors) and a
   one-click export of computed metrics as a table.

### 5.10 Review entity resolution clusters (Sam)

Sources: Splink tutorial, cluster studio and graph metrics pages, splink_graph guide (Persona 3.6).

1. **Predict pairs** with `linker.inference.predict()`; each pair carries a match weight and probability.
2. **Cluster at a threshold** with `cluster_pairwise_predictions_at_threshold(df_predictions,
threshold_match_probability=0.5)` (connected components).
3. **Compute graph metrics** per node, edge and cluster: size, density, centralization, `is_bridge`, degree.
4. **Rank clusters for review.** Largest clusters (over-merging), lowest density for their size (missed links,
   `lowest_density_clusters_by_size`), clusters with bridges or high edge betweenness.
5. **Inspect one cluster.** Records as nodes, pairs as edges labeled with match probability, the record fields side
   by side; a bridge edge joining two dense halves points to a false positive.
6. **Decide.** Raise or lower the threshold, tighten or loosen blocking rules, or send the cluster to clerical
   review; re-cluster and repeat. The collection holds thousands to millions of small graphs, so browsing and
   sampling by metric matter more than drawing any one large graph.

### 5.11 Debug a converted or quantized model's computation graph (Persona 3.7, adjacent)

Sources: Model Explorer user guide (https://github.com/google-ai-edge/model-explorer/wiki/2.-User-Guide), Model
Explorer blogs (https://research.google/blog/model-explorer/,
https://developers.googleblog.com/model-explorer-simplifying-ml-models-for-edge-devices/), Talaria
(https://arxiv.org/html/2404.03085), TensorBoard graphs guide (https://www.tensorflow.org/tensorboard/graphs).

1. **Open both models.** `model-explorer` starts a local server on localhost:8080, or `model_explorer.visualize(path)`
   renders in Colab; a PyTorch model goes through `torch.export.export` and `visualize_pytorch()`. Pick an adapter per
   file, select the original and the converted model, click "View selected models".
2. **Orient.** Only top-level layers show. Double-click expands a layer; "expand layer and all sub-layers" opens a
   branch; expand-all "can be slow" on large graphs; layers with more than 1,000 children are split into artificial
   sections (adjustable).
3. **Find an operator.** Regex search over label, attributes (`shape=.*x3`), inputs or outputs; results are grouped by
   hierarchy and a click locates the node.
4. **Compare.** Split pane with synchronized navigation, matching by node id or an uploaded JSON mapping (one to one
   or many to many); "Highlight deleted and new nodes" draws red and green borders. The engineer compares shapes and
   data types, as in the blog's attention subgraph changed between PyTorch and TensorFlow Lite.
5. **Overlay numbers.** Upload per-node JSON keyed by node id (a value, plus color thresholds or a gradient), for example
   each operator's mean squared error between the quantized and float model. Layer nodes show a color bar summarizing
   their operators. In the blog's case the error rose near the bottom of the graph and the user changed the
   quantization method.
6. **Save and share.** Up to nine bookmarked view states; URL permalinks only for models loaded by local path; PNG
   export.

Variants: Talaria colors operators by profiled latency beside a linked table sorted by total time; of seven
interviewees four opened the graph first and three the table ("Both the numbers and graph are equally important").
TensorBoard draws the op-level graph bottom to top, expands name scopes by double-click, and adds memory and CPU time
with `tf.summary.trace_on(graph=True, profiler=True)`.

### 5.12 Explore, prune and annotate an attribution graph (Persona 3.7, adjacent)

Sources: circuit-tracer README (https://github.com/safety-research/circuit-tracer); attribution graph methods paper and
probe-prompting preprint (Persona 3.7); Neuronpedia graph schema validator (https://www.neuronpedia.org/graph/validator).

1. **Generate.** Choose a model and a prompt. The circuit-tracer CLI runs attribution, prunes and writes JSON graph
   files, and can start a local viewer (`--server`, default port 8041); `--max_feature_nodes` caps feature nodes.
2. **Prune by influence.** `--node_threshold` (default 0.8) and `--edge_threshold` (default 0.98) keep the smallest sets
   of nodes and edges reaching that cumulative influence on the output. For one prompt the methods paper reports 236
   nodes at 0.95, 137 at 0.90, 55 at 0.80 and 27 at 0.70.
3. **Trace.** Start at an output logit, hover and click nodes to read what each feature responds to, and follow the
   strongest edges back toward the input tokens. Every feature belongs to a model layer and a prompt token position,
   so the graph is a DAG from tokens to outputs; the methods paper does not document the viewer's layout.
4. **Pin and label.** Ctrl or Cmd-click pins a node into a subgraph pane; "Edit" annotates the selected node.
5. **Group.** Hold G and click features to merge them into a supernode, then label it. One preprint reports "600+"
   features reduced to "30-50 interpretable supernodes".
6. **Test.** On Neuronpedia (Gemma-2 2B), pin a node and click "Steer" to change its value and watch the output;
   elsewhere interventions run in a notebook.
7. **Share.** The graph's saved state includes pinned node ids (the schema's `pinnedIds`); uploading a graph needs its
   model to be on Neuronpedia.

### 5.13 Open pipeline output tables as Parquet or Arrow (Priya, Chris)

Sources: Section 6.1 and the URLs there.

1. **Write the tables.** The last step of a pandas, polars, DuckDB, Spark, cuDF, GraphRAG or Neo4j job writes an edge
   table and a node table to Parquet (or Feather, which is the Arrow file format on disk). Column names follow the
   writer: `src`/`dst` and `id` for GraphFrames, `source`/`target`/`weight` for GraphRAG relationships with `id` and
   `title` on entities, whatever the author chose elsewhere. Metric columns (component, community, PageRank, model
   score) ride along as ordinary columns.
2. **Open them.** In the browser, drop both files on the viewer; in a notebook, pass the two DataFrames to a widget,
   which can send them as Arrow bytes instead of JSON (Section 6.1).
3. **Map columns.** Say which column is the node id, which are source and target, which is the weight, and whether
   edges are directed. Decision: keep 64-bit integer ids as exact values (a JavaScript number loses precision above
   2^53).
4. **Check what arrived.** Row counts of both tables, how many edge endpoints have no node row, column types as
   written (integer, float, string, timestamp, list), and which columns the viewer could not keep.
5. **Encode and read.** Color and size by the precomputed metric columns; filter by a score or a component; click a
   node to read its full row.
6. **Hand back.** Export the visible subset or annotations with the original ids, as Parquet or CSV, so the next
   pipeline step can join on them.

A viewer that needs CSV forces an extra conversion step that drops types: Parquet and Arrow carry a schema, CSV does
not.

## 6. Data

- **Sources.** Event and transaction tables, interaction logs, item catalogs, citation and co-purchase benchmarks, graph
  databases (Neo4j via GDS projections), relational warehouses (Kumo builds the graph from foreign keys).
- **Formats in motion.** pandas and Spark DataFrames (the main interchange), CSV and parquet edge lists, PyTorch
  tensors (`edge_index` of shape [2, E]), `Data`/`HeteroData` objects, NetworkX graphs, SMILES strings for molecules,
  GraphML and GEXF for Gephi, JSON for pyvis and D3, TSV for embeddings.
- **Typical sizes, trained vs inspected.**

| Thing                                  | Nodes                                                        | Edges                 | Source                          |
| -------------------------------------- | ------------------------------------------------------------ | --------------------- | ------------------------------- |
| Toy and teaching graphs                | 34 (Karate) to 2,708 (Cora)                                  | up to about 10^4      | PyG intro, OGB                  |
| MovieLens small (bipartite)            | 610 users + 9,742 movies                                     | 100,836               | PyG CSV tutorial                |
| Tableau catalog recommender            | 211,515                                                      | 459,150               | RekomGNN                        |
| ogbn-products                          | 2,449,029                                                    | 61,859,140            | OGB                             |
| ogbn-papers100M                        | 111,059,956                                                  | 1,615,685,872         | OGB                             |
| Pinterest PinSage                      | 3 billion                                                    | 18 billion            | PinSage                         |
| ogbg-molhiv / ogbg-molpcba             | 41,127 / 437,929 graphs of about 26 nodes                    | about 28 per graph    | OGB                             |
| ogbg-ppa / ogbg-code2                  | 158,100 graphs of 243 nodes / 452,741 of 125                 | 2,266 / 124 per graph | OGB                             |
| tgbl-wiki-v2 (temporal)                | 9,227                                                        | 157,474 timestamped   | TGB                             |
| tgbl-comment (temporal)                | 994,790                                                      | 44.3M timestamped     | TGB                             |
| **Inspected: explainer subgraph**      | about 10-50                                                  | top-10 edges typical  | PyG explain tutorial            |
| **Inspected: one sampled seed**        | up to 276 at fanout [25,10]                                  |                       | NeighborLoader                  |
| **Inspected: k-hop debug view**        | two hops of tens to hundreds of nodes                        |                       | GNNLens                         |
| **Inspected: neo4j-viz default cap**   | 10,000 (random walk with restart sample above)               |                       | neo4j-viz                       |
| **Inspected: CorGIE design target**    | up to 20,000                                                 |                       | CorGIE                          |
| **Inspected: one molecule**            | about 25 atoms, plus a handful of nearest training molecules |                       | OGB, Workflow 5.8               |
| Adjacent: MobileBERT computation graph | almost 2,000 operators                                       |                       | Model Explorer blog             |
| Adjacent: pruned attribution graph     | hundreds (27 to 236 by threshold)                            | tens of thousands     | Attribution graph methods paper |

Trained graphs are three to eight orders of magnitude larger than inspected ones. A viewer for this group must
extract and show a small piece of a huge graph, or one graph of a collection, with model outputs attached.

- **Identifiers.** Raw ids are mapped to consecutive integers for tensors (`load_node_csv`, PyG CSV tutorial); the
  mapping must travel with any export. GDS node ids did not map cleanly back to names in one reported issue
  (https://github.com/neo4j/gdsclient/issues/179). Sampled batches carry `n_id` back to global ids.
- **Properties.** Bipartite and heterogeneous graphs are the norm for recommenders; weighted; directed (citations) or
  undirected (co-purchase). Attributes include dense vectors (embeddings of 64-404 dimensions) that tabular formats
  cannot hold.
- **Collections of graphs.** Graph-level datasets and entity resolution output are many small graphs with a label,
  split or metrics per graph; PyG stores them as one block-diagonal batch plus a `batch` vector.
- **Temporal edges.** From 1,385 to about 31 million distinct time steps per TGB dataset
  (https://tgb.complexdatalab.com/docs/linkprop/); time must survive import as a comparable value.
- **Sensitivity.** Interaction data is personal; notebook HTML exports embed the data in the file.

### 6.1 Columnar tables: Parquet, Arrow and Feather

The tables this population hands to a viewer are increasingly columnar files, not CSV. What writes them, and in what
layout:

| Writer                 | What it writes                                                                                                                                  | Source                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| pandas, polars         | Any DataFrame to Parquet (`to_parquet`, `write_parquet`)                                                                                        | https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_parquet.html                 |
| DuckDB                 | Any query result: `COPY (SELECT ...) TO 'edges.parquet' (FORMAT parquet)`                                                                       | https://duckdb.org/docs/2.0/data/parquet/overview.html                                        |
| Spark GraphFrames      | A vertex DataFrame with an `id` column and an edge DataFrame with `src` and `dst`; results are DataFrames, saved as Parquet in a lakehouse      | https://graphframes.io/04-user-guide/01-creating-graphframes.html                             |
| cuGraph                | Builds from a cuDF edge DataFrame with named source and destination columns, renumbering ids internally                                         | https://docs.nvidia.com/cugraph/latest/api_docs/api/cugraph/cugraph.Graph.from_cudf_edgelist/ |
| Microsoft GraphRAG     | Parquet by default; `entities` (`id`, `title`, `type`, `degree`, ...) and `relationships` (`id`, `source`, `target`, `weight`, ...)             | https://microsoft.github.io/graphrag/index/outputs/                                           |
| Neo4j APOC             | `apoc.export.parquet.data(nodes, rels, 'file.parquet')` writes nodes and relationships; `apoc.load.parquet` and `apoc.import.parquet` read them | https://neo4j.com/apoc/2026/export/parquet/                                                   |
| FlyWire Codex releases | Neuron and connection tables as Feather; Feather V2 "is exactly represented as the Arrow IPC file format on disk"                               | https://zenodo.org/records/10676866, https://arrow.apache.org/docs/python/feather.html        |

There is no shared graph layout inside these files: each writer names its own id, source and target columns, and
nodes and edges are usually two tables (APOC's single-file export is the exception seen). A reader therefore needs
column mapping, as for CSV, but gets typed columns, including 64-bit integers, timestamps and lists, which CSV loses.

**Notebook widgets.** The Jupyter widget protocol carries binary buffers; anywidget maps Python `bytes` to a JavaScript
`DataView` and suggests serializing a DataFrame to Arrow as the advanced case
(https://anywidget.dev/en/jupyter-widgets-the-good-parts/). Lonboard, a map widget, converts GeoPandas to GeoArrow
inside Parquet, copies the buffer to the browser and decodes it with WebAssembly (parquet-wasm) instead of a text
format (https://developmentseed.org/lonboard/latest/how-it-works/); a talk reports 3 million points rendered in 2.5
seconds where two JSON-based widgets crashed (https://talks.osgeo.org/foss4g-2025/talk/UY3SBT/, a speaker's claim).
Among graph widgets, Cosmograph's is built on anywidget and takes `points` and `links` pandas DataFrames
(https://cosmograph.app/docs-widget/), but its docs do not say how they cross to the browser. ipysigma takes a NetworkX
or igraph graph, sends DataFrame users to its sister library pelote to build one, and states no size limit, only
performance advice for "larger graphs" (https://github.com/medialab/ipysigma). No graph widget found publishes a row
count it handles through an Arrow path.

**Browser viewers reading Parquet directly.** Cosmograph's JavaScript library lists `.csv`, `.parquet`, `.arrow` and
`.json` and claims "millions of points and edges on modern hardware" (vendor claim,
https://cdn.jsdelivr.net/npm/@cosmograph/cosmograph@2.3.2/README.md). Graphistry accepts Parquet and Arrow edge
uploads, but the server renders them, not the browser (https://pygraphistry.readthedocs.io/en/latest/cheatsheet.html).
A dependency-free JavaScript reader exists (hyparquet, "Works in browsers and node.js", Snappy built in,
https://github.com/hyparam/hyparquet), so reading Parquet in the page needs no server.

**Why it matters for scale.** The trained graphs in the table above run to 10^7 to 10^9 edges, and even a
warehouse extract of one component can be 10^5 to 10^6 rows. Text formats are the slow path at those sizes; a typed
columnar table is the realistic way to deliver millions of rows to a viewer, whether as a dropped file or a widget
hand-off.

## 7. Analysis methods

- **Ad hoc analytics.** Degree, PageRank, betweenness (often sampled with `k`), clustering coefficient, connected
  components, Louvain or Leiden communities, shortest paths, ego networks, bipartite projection, Jaccard and
  Adamic-Adar link scores. Validation habit: eyeball against known labels and sanity-check the top-10 list.
- **GNN development.** Node classification accuracy and F1, link prediction AUC and Hits@K, recommender recall@K and
  NDCG; comparisons against an MLP and a structure-only baseline (GNNLens); label consistency with nearest training
  nodes; shortest-path distance to training nodes; explainer masks (GNNExplainer, PGExplainer, Captum integrated
  gradients, SubgraphX) with fidelity and unfaithfulness metrics; t-SNE and UMAP projections. Kumo explains predictions with
  per-column gradient attribution and a nested-table view of the input subgraph by hop (https://docs.nvidia.com/sdgm/kumo-relational/user-guide/explain-predictions/prediction-explainability).
- **Graph-level, temporal and linkage work.** ROC-AUC under a scaffold split, filtered MRR under a chronological split,
  feature lift against a non-graph baseline, cluster density and bridges (Workflows 5.7 to 5.10).
- **Validation habits.** Fixed seeds (`random_seed=42`, `concurrency=1` for deterministic GDS kNN), small graphs with
  known answers, cross-library comparison (NetworkX vs igraph), synthetic benchmarks with ground-truth motifs (GraphXAI
  ShapeGGen, https://zitniklab.hms.harvard.edu/projects/GraphXAI).

## 8. Outputs and collaboration

- Notebook cells (static PNG, interactive HTML that may not survive in GitHub or nbviewer), slides, Streamlit or Dash
  apps, experiment logs, CSV annotations (RekomGNN), PDFs of explainer subgraphs, papers with t-SNE figures.
- Reproducibility comes from code plus seed (`spring_layout(seed=42)`), not from a saved view. Hand-off to engineers
  is a DataFrame, a model artifact or a CSV; hand-off to stakeholders is a picture.
- Audit: no source found for a regulatory requirement on GNN explanation visuals.

## 9. Tools landscape and pain points

| Tool                          | Loved for                                                                                 | Fails on                                                           | Evidence                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| NetworkX + matplotlib         | Ubiquity, dict-returning API                                                              | Hairballs, static, slow at scale                                   | Persona 3.1                                             |
| igraph (Python, R)            | Speed, ggraph and visNetwork                                                              | Different defaults; no GEXF writer in python-igraph                | https://mapequation.org/infomap-python-docs/export.html |
| pyvis, Plotly                 | Few lines to interactive HTML                                                             | pyvis physics, about 1,000-node ceiling; Plotly has no edge hover  | Persona 3.1                                             |
| ipysigma (sigma.js)           | WebGL in the cell, metrics to visual variables                                            | Heavy graphs make the machine loud (its FAQ)                       | https://pypi.org/project/ipysigma/                      |
| yFiles Graphs for Jupyter     | Layout quality, selection back to Python, VS Code and Colab                               | Commercial engine                                                  | yWorks page                                             |
| neo4j-viz                     | One call from a GDS projection, sampling cap                                              | Tied to Neo4j                                                      | neo4j-viz docs                                          |
| PyGraphistry                  | GPU server rendering: `graphistry.edges(df, "src", "dst").plot()`                         | Uploads data to a server                                           | https://pypi.org/project/graphistry/0.34.14             |
| Gephi                         | ForceAtlas2, publication figures                                                          | Leaves the notebook; attribute types lost                          | Persona 3.1                                             |
| PyG `visualize_graph`         | Built in, edge opacity from mask                                                          | Static, no heterogeneous support                                   | Persona 3.2                                             |
| TensorBoard                   | Projector colors embeddings by metadata; Graphs dashboard expands name scopes             | Projector has no link to the data graph; Graphs is TensorFlow-only | TensorFlow docs                                         |
| Netron                        | Opens nearly every model format                                                           | Layout chokes above about 5,000 operators                          | Persona 3.7                                             |
| Model Explorer                | Per-layer lazy layout, WebGL, regex search, two-model diff, numeric overlays              | Needs an adapter per framework                                     | Workflow 5.11                                           |
| circuit-tracer, Neuronpedia   | Influence pruning, pinning, supernodes, steering                                          | Bound to transcoders and hosted models                             | Workflow 5.12                                           |
| GNNLens, CorGIE, RekomGNN     | Purpose-built linked views                                                                | Research prototypes                                                | papers                                                  |
| Cosmograph                    | GPU drawing in the browser; reads CSV, Parquet, Arrow and JSON; anywidget notebook widget | Vendor scale claim only (Section 6.1)                              | Cosmograph README                                       |
| Spark GraphFrames, nx-cugraph | Warehouse-scale or GPU algorithms with familiar APIs                                      | Results are tables; cuGraph needs an NVIDIA GPU                    | Persona 3.1, Workflow 5.1                               |
| RDKit, Splink cluster studio  | Chemistry-aware 2D drawing; per-cluster review sampled by size or density                 | One molecule or one cluster at a time                              | Personas 3.5, 3.6                                       |

Cross-cutting pain points: (1) whole-graph pictures are useless at their scale; (2) model outputs (masks,
predictions, embeddings, splits) are not first-class in general graph viewers; (3) graph view, embedding view and table
view are separate tools; (4) moving data out of Python loses ids or attributes; (5) results differ between libraries
because of silent defaults; (6) collections of small graphs (molecules, linkage clusters) have no browser at all
outside notebook grids and single-purpose dashboards; (7) edge time is a column, never a visual channel.

### 9.1 Scope decision for model-graph and interpretability users

- **Computation graph inspectors: out of scope.** Their graph exists only through a parser per model format (Netron
  reads more than a dozen; Model Explorer needs an adapter per framework), and the value lies in model-specific data:
  shapes, data types, quantization parameters, profiler timings and the mapping between an original and a converted
  model. That binds them to framework tools the way the disassembler binds malware reverse engineers
  (cybersecurity-graph-work.md, 3.5). Two free tools serve them, and Model Explorer's renderer already ships as an npm
  package, `ai-edge-model-explorer-visualizer` (its README).
- **Attribution graph researchers: deferred.** Their graph is generic JSON with a published schema and is small after
  pruning, so graphty-element could draw it. But the work depends on feature dashboards and steering that need the
  model running, Neuronpedia owns that, and no source counts the researchers.
- **What carries over anyway.** Both groups show needs that in-scope populations share (layered dependency graphs,
  process maps): nested groups that expand and collapse with layout computed on open; regex search over attributes;
  numeric per-node overlays with thresholds, summarized on collapsed groups; a two-graph diff with a node mapping and
  added or removed marks; pruning by cumulative influence or weight. The last two rows of Section 10 record them.

## 10. Requirements implied

Coverage is checked against the capabilities in design/designloom/capabilities.

| Requirement                                                                                                                           | Priority | Covered today?                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Load an edge DataFrame or parquet edge list plus a node table, keeping original ids beside integer indices                            | Must     | No: data-import reads CSV, JSON, GraphML, GEXF and GML; graphrag-output-import reads only GraphRAG tables (6.1, 5.13) |
| Take Parquet, Arrow or Feather edge and node tables, as files or as Arrow bytes from a notebook widget, with typed columns kept       | Must     | No (6.1, 5.13)                                                                                                        |
| k-hop neighborhood around one or many seeds, hop distance as a visual channel, a node cap with documented sampling                    | Must     | Partly (ego-network, neighborhood-expansion)                                                                          |
| Attach per-node and per-edge arrays (prediction, label, probability, mask, split) and map them to color, size, opacity                | Must     | Partly (visual-encoding; model outputs not modeled)                                                                   |
| Edge opacity or width from an importance mask, with an on-screen threshold or top-k control                                           | Must     | No                                                                                                                    |
| Typed bipartite and heterogeneous graphs                                                                                              | Must     | No explicit capability                                                                                                |
| Seeded layout so a figure is reproducible from code                                                                                   | Must     | Element option; no workflow requires it                                                                               |
| Notebook widget (Jupyter, VS Code, Colab, Databricks) returning selection to Python                                                   | Must     | No                                                                                                                    |
| Algorithm plugin: graph in, per-node map out, one-call registration, usable as style input, documented defaults for NetworkX parity   | Must     | Untested hypothesis (5.6)                                                                                             |
| Many small graphs as one document: per-graph labels and splits; browse, sort, small multiples; open one; compare with nearest graphs  | Must     | No                                                                                                                    |
| Attribution overlay on one small graph with caller-supplied layout (2D molecule coordinates)                                          | Must     | Partly                                                                                                                |
| Node and edge tables with precomputed metric columns in; computed metrics out as a table                                              | Must     | Partly (data-import, data-export)                                                                                     |
| Filter and encode edges by time; mark edges later than a chosen prediction time                                                       | Must     | Partly (temporal-analysis, temporal-navigation)                                                                       |
| Neighbor counts split by a node label (known fraud versus legitimate)                                                                 | Should   | No                                                                                                                    |
| Rank and sample components or clusters by size, density or bridges, then open one                                                     | Should   | Partly (component-analysis)                                                                                           |
| Linked sortable table of the same nodes                                                                                               | Should   | Partly (data-preview)                                                                                                 |
| Layout from supplied coordinates (UMAP of embeddings), linked to the graph view                                                       | Should   | No                                                                                                                    |
| Compare two attributes on one graph (prediction vs label); highlight a path among candidates                                          | Should   | Partly (comparison-view, path-highlighting)                                                                           |
| Export to Python with vector attributes intact; annotate items and export annotations as CSV                                          | Should   | Partly (data-export, annotation)                                                                                      |
| Nested groups that expand and collapse, laid out only when opened, with numeric overlays summarized on collapsed groups (Section 9.1) | Should   | Partly (layout-hierarchical; no lazy compound groups)                                                                 |
| Diff two graphs through a node mapping, marking added and removed nodes; prune to the smallest set reaching a cumulative weight       | Could    | Partly (comparison-view)                                                                                              |

Missing from the existing Designloom workflows: 5.3, 5.4, 5.8, 5.9 and 5.10. Workflow 5.13 is Designloom workflow W1120.

### 10.1 Correction to Designloom workflow W16, "Graph-Based Recommendation"

W16 (design/designloom/workflows/W16.yaml, persona ml-engineer-recsys) has six phases -- graph construction, feature
engineering, similarity computation, recommendation generation, evaluation, deployment -- and cites a "Practical Graph
Analysis Guide - Chapter 11" with no published copy found. Construction, features,
similarity and generation happen in code (PyG `HeteroData`, `gds.fast_rp.mutate`, `gds.knn.write`, and in PyG's
LightGCN example `logits.topk(k)` with Precision@20 and Recall@20 printed each epoch,
https://github.com/pyg-team/pytorch_geometric/blob/master/examples/lightgcn.py). Neo4j's GDS tutorial runs every step
in Python and checks results with Cypher, with no viewer
(https://neo4j.com/docs/graph-data-science-client/current/tutorials/fastrp-and-knn/), and Bloom exposes only
centrality and community algorithms, no similarity or link prediction
(https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/gds-integration/). Deployment: no source found of a
viewer taking part. Only qualitative evaluation has evidence of happening in a visual tool, because "There is no
ground truth data beyond the immediate properties of the graph" (RekomGNN, whose scenarios use a hypothetical
engineer, not observed sessions).

**Replacement.** W16 becomes Workflow 5.2: load the externally scored output (user, item, probability, rank, optional
explainer edges) beside the interaction graph; stratified-sample seed users; inspect one user's history, top-N and the
path or shared neighbors behind each item; star-rate; export ratings as CSV. Its starting state is one user's
neighborhood (tens to hundreds of nodes), not 10^4 to 10^7 nodes drawn at once.

**Success criteria.** W16's "Precision@10 > baseline" and "Business impact" are measured in code and A/B tests. Proposed
instead, as hypotheses: time from opening a seed user to a recorded judgment; ratings exported with ids intact.

**Capabilities.** `link-prediction` and `link-prediction-panel` are not needed here: scores come from the model under
review, and a heuristic predictor would only compete with it (heuristic link scores still serve Persona 3.1). Needed:
external scores and explanation edges, typed bipartite graphs, shortest path and shared neighbors, a probability
histogram brushable by item type, stratified sampling, and annotation with CSV export. No source ties
`clustering-coefficient` to this persona.

## 11. Sources

Every claim above carries its source URL inline, next to the claim it supports.
