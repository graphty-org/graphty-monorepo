# Systems Biologists and Bench Scientists Working With Molecular Interaction Networks

## 1. Summary

This population turns omics measurements -- RNA-seq, single-cell and spatial transcriptomics, mass spectrometry proteomics and metabolomics, CRISPR and genetic-interaction screens -- into networks and reads biology off them. Most are not graph specialists; they reach for a network because a reviewer expects a "PPI network, clusters and hub genes" figure, because a pathway map explains a mechanism, or because a model predicts which kinase or transcription factor (TF) to target.

Their networks come from four places:

- **Knowledge-based networks.** A gene or protein list mapped onto known interactions: undirected confidence-weighted networks (STRING, BioGRID, IntAct); directed, signed pathways (KEGG, Reactome, SIGNOR, OmniPath, WikiPathways); bipartite metabolite-reaction networks (BiGG, Escher).
- **Networks inferred from a matrix.** Co-expression (WGCNA), partial correlation (MetaboAnalyst DSPC), regulatory networks from single cells (pySCENIC, SCENIC+, and CellOracle, which builds one network per cell type), and cell-cell communication networks whose nodes are cell types (CellChat, LIANA). The main control is a threshold or a top-N cut.
- **Similarity graphs from a feature matrix.** Single-cell analysis builds a k-nearest-neighbor (kNN) graph of 10^4 to 10^6 cells, clusters it (Leiden) and abstracts it (PAGA). Mass-spectrometry molecular networking (GNPS) links spectra by cosine similarity, keeps mutual top-10 neighbors and caps components at 100 nodes, giving thousands of small "molecular families".
- **Residue networks in a 3D structure** (adjacent). Structural biologists link amino acids by typed contacts from a PDB file or a simulation trajectory and read allosteric paths from them beside the molecule.

The center of gravity is Cytoscape with stringApp and the STRING website; single-cell users stay in R or Python; GNPS users finish in Cytoscape. Graphty's existing records cover the undirected gene-list case; directed signed networks, matrix-derived networks, cell-type networks, metabolic maps, many-small-component molecular networks, kNN graphs, per-cell-type network collections and residue networks tied to 3D coordinates are not covered.

## 2. Population

**Job titles.** Postdocs, PhD students and research scientists in genomics, cancer, immunology, neuroscience, metabolism and natural products labs; staff bioinformaticians in omics and single-cell cores; pharma computational biologists; metabolic engineers; structural biologists (adjacent). Postings list Cytoscape next to R/Bioconductor, for example a Karolinska proteomics engineer (https://www.academicjobs.com/university-jobs/research-engineer-in-bioinformatics-ms-based-proteomics-stockholms-l-n/405981) and a Krogan Lab AP-MS postdoc (https://careers.iscb.org/jobs/view/7736).

**Size (evidence only).**

- Cytoscape: about 300,000 downloads a year, 300+ apps (https://pmc.ncbi.nlm.nih.gov/articles/PMC10076771/); 20,610,746 starts from 2014-02-09 to 2025-02-25 (https://cytoscape.org/stat.html). No unique-user count found.
- App downloads (read 2026-11-25): ClueGO 442,220; stringApp 436,862; MCODE 272,551; cytoHubba 248,660; EnrichmentMap 182,864 (https://apps.cytoscape.org/apps/stringapp and sibling pages) -- the dominant workflow: STRING network, cluster, rank hubs, annotate. In 2022 papers, 42% cited Cytoscape for its apps (PMC10076771).
- STRINGdb Bioconductor package: 23,532 distinct IPs in 2025 (https://bioconductor.org/packages/stats/bioc/STRINGdb). NetworkAnalyst: more than 220,000 jobs from more than 14,000 users a year (https://pmc.ncbi.nlm.nih.gov/articles/PMC6602507/).
- GNPS: over 300,000 accesses a month in February 2021, 87% of usage classical or feature-based molecular networking (https://pmc.ncbi.nlm.nih.gov/articles/PMC8705952); more than 6,767 feature-based jobs in 2019 (https://pmc.ncbi.nlm.nih.gov/articles/PMC7885687).
- Single-cell tools: no user counts found. Rough reading (inference): low hundreds of thousands of Cytoscape, STRING or GNPS users a year.

**How often.** Bench scientists: a few times per project, near a figure deadline. Lab bioinformaticians: weekly. Core staff: daily.

**Skill profile.** Strong domain knowledge; graph literacy low to intermediate; coding from none to fluent R or Python. Most follow tutorials literally, including parameter values, which is why tutorial defaults (STRING 0.4, WGCNA power 6, CellChat p < 0.05, GNPS cosine 0.7, Scanpy k = 15, CellOracle top 2,000 edges) recur across papers.

**Team context.** A bench scientist generates data; a bioinformatician analyzes; the PI decides the story; reviewers ask for database version, cutoff and background.

## 3. Personas

### 3.1 Genomics Cytoscape user (existing id `genomics-cytoscape-user`) -- confirmed, with corrections

The existing record (a cancer genomics postdoc turning 300 DE genes into a STRING network with logFC overlay, MCL clusters, enrichment, hubs, NDEx) matches the published protocols. Additions:

- **Disambiguation is a step.** stringApp preselects the first match for ambiguous names (https://jensenlab.org/training/stringapp/); the Cytoscape DE protocol maps UniProt -> NCBI Gene before the expression table joins (https://cytoscape.org/cytoscape-tutorials/protocols/differentially-expressed-genes/).
- **Spreadsheet-mangled identifiers.** Excel gene-name errors (SEPT2 -> date) appeared in 30.9% of articles with Excel gene lists in 2014-2020 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8357140).
- **Background and cutoff are decisions.** STRING recommends a custom enrichment background (https://pmc.ncbi.nlm.nih.gov/articles/PMC11701646/); cutoffs vary by query: 0.4 for gene lists, 0.95 for a disease query, 0.999 in the AP-MS protocol.
- **She also builds ceRNA (5.11) and WGCNA (5.7) networks**, and is the main source of cytoHubba top-10 "hub gene" papers, criticized for weak validation and run-to-run instability (https://biostars.org/p/9529294).

### 3.2 Dr. Mei Tanaka -- proteomics bench scientist (new id `proteomics-bench-scientist`)

- **Role.** Cell biologist in a signaling lab; gets 2,000-6,000 quantified proteins, an AP-MS result of one to a dozen baits with tens to hundreds of scored preys (CRAPome, SAINT, MiST or CompPASS: https://pmc.ncbi.nlm.nih.gov/articles/PMC4332878), or a phosphosite table.
- **Tools today.** STRING website; Metascape Express Analysis, returning a report, Excel and PowerPoint (https://link.springer.com/10.1038/s41467-019-09234-6); Cytoscape only with a core bioinformatician.
- **Goals.** One figure: "my bait's interactors, which are known, which are new, what complexes they form"; a few candidates to validate.
- **Frustrations.** Asked how to color STRING nodes by logFC, a Biostars user was told "use Cytoscape" (https://www.biostars.org/p/322442); bait-prey import keeps only the last value for a repeated prey; hairballs from long lists (https://www.biostars.org/p/496173); site-level data does not fit one row per protein; small lists disconnect at 0.4, and dropping to 0.15 was called close to 9 in 10 false positives (https://support.bioconductor.org/p/9137624); legends redrawn in Inkscape (https://creativedatasolutions.github.io/CDS.courses/courses/network_mapping_101/docs/partial/cytoscape).

### 3.3 Dr. Lukas Weber -- signaling network modeler (new id `signaling-network-modeler`)

- **Role.** Systems biologist in a pharmacology or cancer signaling group; builds directed, signed networks and fits them to perturbation or phosphoproteomics data.
- **Tools today.** OmnipathR / decoupler with `is_directed`, `is_stimulation`, `is_inhibition` columns (https://www.bioconductor.org/packages/release/bioc/vignettes/OmnipathR/inst/doc/bioc_workshop.html); SIGNOR (about 33,000 causal relations among 8,900 entities: https://pmc.ncbi.nlm.nih.gov/articles/PMC9825604/); CollecTRI (https://github.com/saezlab/CollecTRI); CARNIVAL and COSMOS (https://pmc.ncbi.nlm.nih.gov/articles/PMC6848167); CausalPath (https://pmc.ncbi.nlm.nih.gov/articles/PMC8633371); logic models via SIF and SBML-qual.
- **Data.** Prior networks of 10,000+ signed edges; results of 20-300 nodes with activity scores.
- **Frustrations.** Arrow vs T-bar mapped by hand in Cytoscape; its Analyzer defaults to undirected (https://manual.cytoscape.org/en/latest/Network_Analyzer.html); CausalPath's web viewer has no image export; KGML imports can be incomplete (https://groups.google.com/g/cytoscape-helpdesk/c/67mxNKN9yhs); KEGG needs a license for non-academic use (https://www.kegg.jp/kegg/download/).

### 3.4 Sam Okafor -- network biology core bioinformatician (new id `network-biology-core-bioinformatician`)

- **Role.** Core-facility bioinformatician running the same build/cluster/enrich/figure pipeline for many projects, and WGCNA for sample series.
- **Tools today.** RCy3 (https://bioconductor.org/packages/release/bioc/vignettes/RCy3/inst/doc/Overview-of-RCy3.html) or py4cytoscape (https://py4cytoscape.readthedocs.io/en/latest/concepts.html); STRINGdb and igraph headless; NDEx via ndex2.
- **Goals.** One script that rebuilds network, style and figures; deliverables a PI opens without installing anything.
- **Frustrations.** Scripted Cytoscape still needs desktop Cytoscape running; thresholding WGCNA exports can remove the hubs (https://www.biostars.org/p/9514423/); Java heap tuning (https://wikiold.cytoscape.org/How_to_increase_memory_for_Cytoscape).

### 3.5 Dr. Ana Ribeiro -- single-cell computational biologist (new id `single-cell-computational-biologist`)

- **Role.** Immunology or tumor-microenvironment postdoc with 10x single-cell (increasingly multiome and spatial) data: 10,000-100,000 cells in 10-30 cell types; CellChat's examples use 25 and 12 groups (https://pmc.ncbi.nlm.nih.gov/articles/PMC7889871).
- **Tools today.** Seurat or Scanpy; CellChat, CellPhoneDB, NicheNet or LIANA; pySCENIC, SCENIC+ or CellOracle; the packages' own plots.
- **Graphs she makes.** (a) The cell kNN graph every clustering run builds (5.14), seen as a UMAP, rarely as edges. (b) Cell-cell communication networks: cell-group nodes, directed weighted edges, one layer per ligand-receptor pair or pathway (5.8). (c) Regulatory networks (5.9): regulons, TF-enhancer-gene networks, and one GRN per cluster (24 in the CellOracle tutorial).
- **Goals.** Which cell types exist and talk to which, through what pathways, which TFs drive each type, and what changes with disease or a knockout.
- **Frustrations (from the tools' structure, not a survey).** Cluster count depends on a resolution chosen by eye; UMAP distances between clusters are not meaningful; each pathway is a separate plot; method choice "strongly influence[s]" predictions (PMC9184522); per-cluster GRNs are compared one score plot at a time, and a gene with no edges in a cluster simply has no score.

### 3.6 Dr. Jonas Berg -- metabolic network modeler and metabolomics analyst (new id `metabolic-network-modeler`)

- **Role.** Metabolic engineer using genome-scale models (BiGG, COBRApy) to predict fluxes and knockouts, or a metabolomics scientist placing measured metabolites on pathways.
- **Tools today.** COBRApy plus Escher; Escher-FBA; MetaboAnalyst Network Explorer; KEGG maps; OmicsNet (sources in 5.10).
- **Graphs.** Bipartite metabolite-reaction graphs with direction, reversibility and flux; metabolites with concentrations or shadow prices.
- **Frustrations.** Currency metabolites (water, ATP, NADH) connect to nearly everything and are deleted (https://arxiv.org/pdf/0806.2763) or hidden on the map (https://pmc.ncbi.nlm.nih.gov/articles/PMC4552468); maps are built by hand; SBML needs conversion to COBRA JSON.

### 3.7 Dr. Lena Okoro -- molecular networking chemist (id `molecular-networking-chemist`, promoted to a full persona)

- **Role.** Natural products chemist, metabolomics scientist or microbiome researcher running untargeted LC-MS/MS. First sketched as minor in network-medicine-and-biomedical-knowledge-graphs.md; GNPS usage (Section 2) makes it a full persona.
- **Tools today.** GNPS or GNPS2; MZmine or MS-DIAL before feature-based networking (PMC7885687); NAP, MolNetEnhancer; Cytoscape with chemViz2.
- **Graph.** Nodes are consensus spectra or LC-MS features (precursor m/z, retention time, abundance per group, library hit, SMILES); edges are cosine similarity with a mass difference; many small components plus singletons.
- **Goals.** Families that differ between sample groups; names for unknowns from annotated neighbors; new analogs of a known compound.
- **Frustrations.** The browser viewer is "limited to a single component at a time" (https://ccms-ucsd.github.io/GNPSDocumentation/cytoscape/); Cytoscape search "is very slow, especially with large networks"; reruns with other settings give families that differ "in size, composition, and natural ordering", per-family random layouts "make setting comparisons an arduous task" (specXplore: https://pmc.ncbi.nlm.nih.gov/articles/PMC11024886); conventional networking "leave[s] many nodes disconnected" (https://doi.org/10.1016/j.crmeth.2026.101468).

### 3.8 Dr. Priya Nair -- structural network biologist (new id `structural-network-biologist`, adjacent)

- **Role.** Biophysicist or structural biologist studying allostery, mutation effects or protein-RNA communication from PDB, AlphaFold or molecular dynamics (MD) ensembles.
- **Tools today.** RING web server; Cytoscape with structureViz2, UCSF Chimera and RINalyzer; VMD NetworkView with Carma; Bio3D in R (5.15).
- **Graph.** Residues as nodes at 3D coordinates; typed contacts (hydrogen bond, ionic, pi stacking, van der Waals) as a multigraph; correlation weights and contact frequencies from trajectories.
- **Goals.** Critical residues and the paths that carry a signal between two sites; how a mutation or state change rewires contacts.
- **Frustrations.** RINalyzer last released in 2014; hundreds of suboptimal paths to read (5.15); network and structure live in two linked windows (inferred from the tools, not a user report).

### 3.9 Boundary with other documents

Network medicine (disease modules, drug repurposing, biomedical knowledge graphs) keeps `bioinformatics-researcher`, corrected as Dr. Wei Chen in network-medicine-and-biomedical-knowledge-graphs.md. This document owns omics-to-network workflows, molecular networking and residue networks. Microbial co-occurrence networks are in ecological-interaction-networks.md.

## 4. Use cases (ranked)

| Rank | Question answered with a graph                                                                           | Who                        | Frequency                                     |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------- |
| 1    | How do my DE genes or hit proteins connect, and which groups moved together? (W20)                       | all                        | Every omics project                           |
| 2    | What functions do the modules represent? (W21, W22)                                                      | genomics, core             | Every project                                 |
| 3    | What cell populations does my data contain, and how do they connect? (kNN, Leiden, PAGA)                 | single-cell                | Every single-cell dataset                     |
| 4    | Which molecular families are known, new, or different between groups? (GNPS)                             | molecular networking       | Every untargeted metabolomics project         |
| 5    | Which co-expression modules track my trait, and what are their hubs? (WGCNA)                             | genomics, core             | Projects with 15+ samples                     |
| 6    | Which cell types communicate, through which pathways, and what changes?                                  | single-cell                | Most immunology and cancer single-cell papers |
| 7    | Which known and novel interactors does my bait have? (AP-MS)                                             | proteomics bench           | Per AP-MS experiment                          |
| 8    | Where do my measurements fall on a known pathway or metabolic map?                                       | bench, genomics, metabolic | Very common                                   |
| 9    | Which genes are hubs worth validating? (W23)                                                             | genomics                   | Common; credibility risk from study bias      |
| 10   | Which upstream regulators and causal paths explain my change?                                            | signaling, single-cell     | Per project                                   |
| 11   | Which TFs gain or lose centrality between cell types, and what does a knockout do? (CellOracle, SCENIC+) | single-cell                | Multiome and GRN projects                     |
| 12   | Which lncRNAs and miRNAs regulate my DE mRNAs? (ceRNA)                                                   | genomics                   | Common in GEO/TCGA papers                     |
| 13   | Which fluxes change under a knockout or condition?                                                       | metabolic                  | Per strain design                             |
| 14   | Do my results survive another cutoff, database or resolution?                                            | careful users, reviewers   | Rare; recommended                             |
| 15   | Can I rebuild and share this exactly? (W25)                                                              | core, genomics             | Every publication                             |
| 16   | Which residues carry a signal between two sites, and what does a mutation rewire?                        | structural                 | Adjacent, small                               |
| 17   | Which regions of a genome-scale map are enriched for a function? (SAFE)                                  | functional genomics        | Adjacent, small                               |

## 5. Step-by-step workflows

W20-W23 (gene list to network, cluster and annotate, enrichment map, hub ranking) are confirmed by their protocols; deltas are in Section 10. The workflows below are new or deepen existing records.

### 5.1 AP-MS hit list to an interactor figure

Sources: Cytoscape AP-MS protocol (https://cytoscape.org/cytoscape-tutorials/protocols/AP-MS-network-analysis/); Morris et al. 2014 (PMC4332878).

1. **Pre-process (core facility).** CRAPome filter; SAINT/MiST/CompPASS scoring; threshold. One row per bait-prey pair.
2. **Import (5 min).** Bait = source, prey = target, score on the edge. Duplicate preys: only the last value is kept.
3. **Known interactions among preys (5 min).** STRING at 0.999, no added interactors, confirm ambiguous matches.
4. **Merge (5 min).** Match UniProt (AP-MS) with query term (STRING): one network, two edge provenances.
5. **Style (20-30 min).** Force-directed; baits yellow; fill on a cell-line score; width on AP-MS score; AP-MS edges green, STRING gray.
6. **Enrich and chart (15 min).** STRING enrichment FDR 0.05; donut charts for top terms typed as an enhancedGraphics expression into a column.
7. **Export.** Session, PNG/SVG, NDEx, CX2/GraphML/XGMML/SIF.

The bench version stops after step 3 on the STRING website. Complexes are drawn by hand as hulls (https://pmc.ncbi.nlm.nih.gov/articles/PMC6762067). Sizes: 332 interactions in a SARS-CoV-2 set (https://pmc.ncbi.nlm.nih.gov/articles/PMC9904289); BioPlex 3.0, 118,162 (https://pubmed.ncbi.nlm.nih.gov/33961781/). Bait -> prey is a direction of design; BioGRID TAB 3.0 loses it.

### 5.2 Site-level phosphoproteomics or time course on a network

Source: JensenLab Omics Visualizer exercises (https://jensenlab.org/training/omicsvisualizer/). Import a long table, one row per phosphosite; filter adj p <= 0.01; retrieve a STRING network at 0.7; draw a donut ring per node with one slice per site colored by log ratio, and a categorical pie for cluster. Time-course variant: 1,278 genes, eight time points, one slice each. Node data is one-to-many; the answer is a per-node chart, not one color.

### 5.3 Overlay data on a curated directed pathway map

Sources: WikiPathways protocol (https://cytoscape.org/cytoscape-tutorials/protocols/wikipathways-app/); KEGGscape (https://keggscape.readthedocs.io/); KGML (https://www.kegg.jp/kegg/xml/docs/); Pathview (https://pmc.ncbi.nlm.nih.gov/articles/PMC3702256); KEGG Mapper Color (https://www.kegg.jp/kegg/webapp/color_gui.html); Reactome (https://www.ebi.ac.uk/training/online/courses/reactome-tools-for-analysing-biological-pathways/reactome-tools).

KEGG Mapper Color (5 min): paste ids with values, get the colored map back. Reactome (5 min): numeric columns become "experiments" stepped through on the diagram. Pathview in R (10 min): native KEGG PNG or a recomputed Graphviz layout. Cytoscape (30-60 min): WikiPathways as curated "pathway" or "network"; KEGG via KEGGscape (compartments lost); join expression; fill; legend.

KGML relation subtypes include activation, inhibition, expression, repression, binding, phosphorylation and ubiquitination; SBGN Activity Flow draws inhibition as a bar (https://sbgn.org/symbols). The fixed layout is the point: users want the map as drawn, with data on top.

### 5.4 Causal network from phosphoproteomics or expression (directed, signed)

Sources: CausalPath STAR Protocol (PMC8633371); CARNIVAL (PMC6848167); PathLinker (https://pmc.ncbi.nlm.nih.gov/articles/PMC5365231).

CausalPath, with published timings: install Java and the jar (under 1 h); format a tab file with ID (G6PD_Y401), symbols, sites, effect and a signed value (about 1 h); set `parameters.txt` (significance 0.1, 10,000 permutations, network FDR 0.1); run (about 1 h), producing SIF and JSON; view at causalpath.org (no image export) or in Newt. CARNIVAL/COSMOS find the smallest sign-consistent subnetwork of an OmniPath prior network by integer programming. PathLinker ranks edges by the k shortest receptor -> TF paths.

Unlike PPI work: the sign is the interpretation; questions are path questions; algorithms must respect direction and sign; layouts are hierarchical or fixed; conversions are lossy (BioPAX -> SIF "is lossy in general": https://www.pathwaycommons.org/pc2/formats). STRING 12.5 added a signed regulatory network (PMC11701646).

### 5.5 Robustness check across confidence cutoffs and databases

STRING's help says 0.7 "is often used as a conservative threshold for downstream computational analyses", 0.4 "may be preferable when broader coverage is desired", and higher thresholds "produce smaller networks that are more biased toward well-studied proteins" (https://string-db.org/help/scores/). A prescriptive 0.4/0.7/0.9 sweep appears only in one anonymous guide (https://neuro-psycho-group.github.io/Protein-Protein-Interaction-Toolkit/06-best-practices.html).

In practice it is manual: re-query at each cutoff, re-run cytoHubba, compare top-10 lists in a spreadsheet. Databases are largely independent curation efforts (https://pmc.ncbi.nlm.nih.gov/articles/PMC3011985) and network choice changes disease-gene recovery (https://pmc.ncbi.nlm.nih.gov/articles/PMC5920724). No tool found offers a one-step stability view. Single-cell users do the same across Leiden resolutions with clustering trees (5.14); GRN users rarely do it at all (5.9).

### 5.6 Scripted, reproducible build and publication (deepens W25)

Sources: RCy3 vignettes; Cytoscape Automation (https://genomebiology.biomedcentral.com/articles/10.1186/s13059-019-1758-4); NDEx protocols (https://pmc.ncbi.nlm.nih.gov/articles/PMC8544027); Reimand et al. 2019 (https://pmc.ncbi.nlm.nih.gov/articles/PMC6607905/).

1. Start desktop Cytoscape; `cytoscapePing()`. 2. `createNetworkFromDataFrames(nodes, edges)` or a STRING query. 3. `loadTableData`; `setNodeColorMapping`; save a style. 4. Run MCL, enrichment and Analyzer by command. 5. `exportImage`, `saveSession`, `exportNetworkToNDEx`. 6. NDEx private link for reviewers, then a DOI. 7. Methods text: database, version, date, cutoff, background, parameters.

The EnrichmentMap protocol takes about 4.5 h end to end (Reimand 2019). Users want every parameter, data version and style captured as code.

### 5.7 Weighted co-expression network (WGCNA) and other matrix-derived networks

Sources: Langfelder and Horvath 2008 (https://pmc.ncbi.nlm.nih.gov/articles/PMC2631488/); FemaleLiver tutorials, construction (https://edo98811.github.io/WGCNA_official_documentation/FemaleLiver-02-networkConstr-auto.pdf) and export (https://edo98811.github.io/WGCNA_official_documentation/FemaleLiver-06-ExportNetwork.pdf).

1. **Input.** A samples x genes matrix, often cut to the most variable genes: the paper kept 3,600 of over 23,000 probe sets; the blockwise method handles 50,000 genes in blocks of about 7,000.
2. **Soft-threshold power.** `pickSoftThreshold`; the lowest power where scale-free fit levels off near R^2 0.9 (tutorial: 6).
3. **Adjacency and TOM.** |correlation|^power; topological overlap (TOM) as similarity.
4. **Modules.** `blockwiseModules(power = 6, TOMType = "unsigned", minModuleSize = 30, mergeCutHeight = 0.25)`; modules get color names (18 in the paper).
5. **Relate to traits.** Module eigengene vs traits; module membership (kME); hubs have high kME and intramodular connectivity.
6. **Export one module.** TOM restricted to 30 top hubs, `exportNetworkToCytoscape(modTOM, weighted = TRUE, threshold = 0.02, nodeAttr = moduleColors)`. The tutorial shows the same 30 genes at TOM thresholds 0.10, 0.08, 0.06 and 0.03: edges rise sharply as the threshold drops, and the user picks the readable one by eye.

For a tool: a dense symmetric weighted matrix, not an edge list; modules as a node attribute; a weight threshold and top-k with live edge counts; readable thresholds can drop the hubs (Biostars 9514423). Same shape: GRNBoost2 adjacencies (5.9), DSPC partial correlations, microbial co-occurrence.

### 5.8 Cell-cell communication from single-cell data (CellChat, LIANA)

Sources: CellChat paper (PMC7889871); `netVisual_aggregate` (https://rdrr.io/pkg/CellChat/man/netVisual_aggregate.html); `netVisual_diffInteraction` (https://rdrr.io/github/sqjin/CellChat/man/netVisual_diffInteraction.html); tutorial code (https://openbiox.github.io/Bizard/Omics/CellChatCirclePlot.html); LIANA (PMC9184522).

1. **Create and preprocess.** `createCellChat(object = data, meta = meta, group.by = "cell_type")`; `CellChatDB.human` (2,021 interactions in 229 pathway families originally); `identifyOverExpressedGenes` (Wilcoxon, p 0.05).
2. **Infer.** `computeCommunProb(type = "triMean")` (100 permutations, p < 0.05); `filterCommunication(min.cells = 10)`; `computeCommunProbPathway`.
3. **Aggregate.** `aggregateNet` gives `net$count` and `net$weight` between each pair of groups.
4. **Draw.** `netVisual_circle(net$count, vertex.weight = groupSize, weight.scale = TRUE)`; per-sender panels keep `edge.weight.max` global so widths compare. Per pathway: `netVisual_aggregate(signaling = "CXCL", layout = "circle" | "hierarchy" | "chord" | "spatial")`, with `sources.use`, `targets.use`, `thresh` and `top`.
5. **Compare conditions.** `mergeCellChat`, `netVisual_diffInteraction(measure = "count" | "weight")`: red increased, blue decreased.

Data shape: a K x K x N array (K groups, N ligand-receptor pairs or pathways); each slice a directed weighted graph on the same 10-30 nodes. LIANA runs 7 methods and 16 resources and ranks by consensus because method and resource choice strongly change predictions (PMC9184522).

### 5.9 Gene regulatory networks from single cells (pySCENIC, SCENIC+, CellOracle and others)

Three tools, three graph shapes: TF -> target regulons, TF-enhancer-gene networks, and one network per cell type compared by centrality.

**pySCENIC regulons** (https://pyscenic.readthedocs.io/en/latest/tutorial.html; https://www.nature.com/articles/s41596-020-0336-2). (1) `pyscenic grn` (GRNBoost2) scores every (TF, target) pair, about 4 min for 10k cells; (2) per TF, targets by importance (top 50 or a percentile), sign from correlation; (3) `ctx` keeps motif-supported targets, giving regulons like SPIB(+); (4) `aucell` scores cells x regulons. Tutorials show regulon activity as heat maps and UMAPs (59 regulons in the SIB course: https://sib-swiss.github.io/single-cell-python-training/ipynb/day3-1_tf.html), not as a network.

**SCENIC+ enhancer-driven GRN (eGRN).** Source: the `scenicplus.networks` module (https://scenicplus.readthedocs.io/en/stable/_modules/scenicplus/networks.html); tutorials (https://scenicplus.readthedocs.io/en/stable/tutorials.html).

1. **Subset.** `create_nx_tables(scplus_obj, subset_eRegulons=[...], subset_regions=..., subset_genes=...)` picks the eRegulons (a TF with its enhancer regions and target genes). It returns edge tables TF2R (TF to region), R2G (region to gene) and TF2G (TF to gene), and node tables for TFs, regions and genes.
2. **Add fold changes.** `add_differential_gene_expression=True`, `add_differential_region_accessibility=True`, `differential_variable=[a cell annotation]` add `<variable>_Log2FC_<group>` columns to nodes (Wilcoxon via Scanpy, Bonferroni).
3. **Build and lay out.** `create_nx_graph(use_edge_tables=['TF2R','R2G'])` maps color, size, shape and transparency of nodes and edges to columns or fixed values. The default `concentrical_layout` puts regions evenly on a circle ordered by their first target, places each gene inward from the mean of its regions and each TF near its regions, and spring-places regions that target TFs; any other value gives Kamada-Kawai.
4. **Draw or export.** `plot_networkx` draws in matplotlib (all nodes as diamonds). `export_to_cytoscape(G, pos, out_file, pos_scaling_factor=200)` writes Cytoscape JSON with fixed positions; colors, sizes and shapes are only data columns (no style file), so the user maps them in Cytoscape by hand.

**CellOracle: one GRN per cluster, compared by centrality.** Source: the network-analysis notebook (https://morris-lab.github.io/CellOracle.documentation/tutorials/networkanalysis.html; code and outputs: https://raw.githubusercontent.com/morris-lab/CellOracle/master/docs/notebooks/04_Network_analysis/Network_analysis_with_Paul_etal_2015_data.ipynb). Data: Paul et al. 2015 mouse hematopoiesis, 2,671 cells x 1,999 genes, 24 clusters; base GRN from a mouse scATAC atlas (1,095 TF columns).

1. **Prepare.** AnnData with clusters and an embedding; the base GRN, plus optional TF-target pairs from a paper; PCA; kNN imputation (k = 2.5% of cells).
2. **Build per-cluster GRNs.** `get_links(cluster_name_for_GRN_unit="louvain_annot", alpha=10)` fits a regularized regression per gene per cluster ("~30 minutes"; 24 clusters x 1,850 genes). Each table: source, target, `coef_mean`, `coef_abs`, p, -log p; cluster Ery_0 has 74,937 edges.
3. **Optional export** of each cluster's table to CSV "using another software".
4. **Filter.** `filter_links(p=0.001, weight="coef_abs", threshold_number=2000)`: the 2,000 strongest significant edges per cluster.
5. **Degree distributions**, one plot per cluster; "the degree distribution may change depending on the filtering threshold".
6. **Scores.** `get_network_score()`: per gene per cluster, degree (all, in, out), degree centrality, betweenness, eigenvector centrality.
7. **Rank.** `plot_scores_as_rank(cluster="MEP_0", n_gene=30)`.
8. **Compare two clusters.** `plot_score_comparison_2D(value="eigenvector_centrality", cluster1="MEP_0", cluster2="GMPl_0", percentile=98)`, repeated for betweenness and degree: a scatter, genes above the 98th percentile labeled.
9. **One gene across clusters.** `plot_score_per_cluster(goi="Gata2")`. "If a gene does not have network edge in a cluster, the network scores cannot be calculated" (Cebpa in erythroid clusters): missing, not zero. Then box plots of scores and network entropy per cluster.
10. **Perturb** (https://morris-lab.github.io/CellOracle.documentation/tutorials/simulation.html). `fit_GRN_for_simulation(alpha=10)`; `simulate_shift(perturb_condition={"Gata1": 0.0}, n_propagation=3)`; `estimate_transition_prob(n_neighbors=200)`; `calculate_embedding_shift(sigma_corr=0.05)`; quiver and grid vector-field plots on the cell embedding beside a randomized-GRN control, with `scale`, `n_grid=40` and `min_mass` tuned by eye, then compared with a pseudotime gradient. The output is arrows over cells; the GRN itself is never drawn.

The paper builds 24 mouse myeloid and 38 zebrafish cell-type GRNs (https://pmc.ncbi.nlm.nih.gov/articles/PMC9946838).

**Other multiome GRN tools.** Pando: `get_network_graph` lays genes out by a UMAP of the GRN (or ggraph `fr`, `drl`), activating edges orange and inhibitory gray, nodes sized by centrality; `plot_tf_network(tf="PAX6")` draws a tree or circle around one TF (https://quadbio.github.io/Pando/articles/visualization.html). Dictys: dot plots and heat maps across cell types, differential regulation vs differential expression for two cell types, a subnetwork per TF, and an animated GRN along a trajectory; inference "can take weeks" without a GPU (https://github.com/pinellolab/dictys). FigR: `plotfigRNetwork` draws TF -> gene links at |regulation score| >= `score.cut` (default 1; the paper used 1.5) (https://rdrr.io/github/buenrostrolab/FigR/man/plotfigRNetwork.html). scGRNom: not researched.

**Thresholds.** The CellOracle paper filters edges "on the basis of P values and absolute values of edge strength", and "the user can define a custom value ... according to the data type, data quality and aim of the analysis" (PMC9946838); no robustness test of rankings across thresholds was found in it. Tutorial values (p 0.001 and top 2,000; FigR 1; pySCENIC top 50) become de facto defaults. No paper found that reports checking GRN centrality rankings at another threshold.

**Data shapes.** (a) Bipartite signed TF -> target. (b) Tripartite TF-region-gene with a concentric layout and fold-change columns. (c) A collection of 24-38 directed, signed, weighted graphs over one gene set, compared through per-network centrality, where a gene absent from a network has no score. (d) A GRN changing along pseudotime, shown as animation (Dictys).

### 5.10 Metabolic flux and metabolomics overlay

Sources: Escher (PMC4552468); https://escher.readthedocs.io/en/latest/escher-python.html; Escher-FBA (PMC6158907); MetaboAnalyst (https://www.metaboanalyst.ca/MetaboAnalyst/Secure/network/MnetParamView.xhtml).

Code route: `cobra.io.load_json_model`; `model.optimize()`; `Builder(map_name=..., model=...)` (maps are hand-built JSON); `builder.reaction_data = solution.fluxes`; color and size scales; export SVG. Browser route: Escher-FBA solves FBA in the page and redraws after each knockout. No-code route: MetaboAnalyst maps metabolites onto the KEGG global map or builds DSPC correlation networks.

Data: two node types; reactions directed with reversibility and flux sign; a metabolite may be hidden, removed or repeated on a curated map; water, ATP and H+ dominate degree.

### 5.11 ceRNA (lncRNA-miRNA-mRNA) and miRNA-target networks

Sources: starBase v2.0 (https://pmc.ncbi.nlm.nih.gov/articles/PMC3964941/); GDCRNATools (https://free.nchc.org.tw/bioconductor/packages/3.9/bioc/vignettes/GDCRNATools/inst/doc/GDCRNATools.html); a TCGA kidney example (https://pmc.ncbi.nlm.nih.gov/articles/PMC8186793).

1. **DE per RNA class** (kidney: 1,457 lncRNAs, 54 miRNAs, 2,307 mRNAs at |log2FC| > 2, P < 0.01).
2. **Targets.** lncRNA-miRNA from miRcode or starBase; miRNA-mRNA from miRTarBase, miRDB and TargetScan.
3. **Filter.** Intersect with DE lists; better pipelines add negative-correlation or shared-miRNA tests; some apply none.
4. **Draw.** Cytoscape, one shape per class, red up and blue down: 107 nodes and 178 edges in the kidney example.

### 5.12 Genetic interaction networks and layout-based annotation (adjacent)

Sources: TheCellMap (https://pmc.ncbi.nlm.nih.gov/articles/PMC5661885, https://pmc.ncbi.nlm.nih.gov/articles/PMC5427489); SAFE (https://www.biorxiv.org/content/10.1101/094904.full.pdf).

The yeast genetic interaction network is read as a profile-similarity network (PCC > 0.2: 4,909 nodes, 34,468 edges), spring-embedded. SAFE tests each node's neighborhood on the layout for GO enrichment and colors 19 functional regions: the layout carries the meaning. Human counterpart: DepMap co-essentiality networks (https://pubmed.ncbi.nlm.nih.gov/33859415/).

### 5.13 Mass-spectrometry molecular networking (GNPS), from job to figure

Sources: GNPS networking docs (https://ccms-ucsd.github.io/GNPSDocumentation/networking/); in-browser views (https://ccms-ucsd.github.io/GNPSDocumentation/networkingviews); FBMN in Cytoscape (https://ccms-ucsd.github.io/GNPSDocumentation/featurebasedmolecularnetworking-cytoscape/); NAP (https://ccms-ucsd.github.io/GNPSDocumentation/nap/); MolNetEnhancer (https://ccms-ucsd.github.io/GNPSDocumentation/molnetenhancer/); PMC8705952; PMC7885687.

1. **Convert** vendor files to mzML (ProteoWizard).
2. **Detect features (feature-based only).** MZmine or another supported tool exports a feature x file quantification table and an MGF of spectra. Classical networking splits one compound into many nodes: an EDTA test gave 13 duplicates in one family (PMC7885687).
3. **Submit** with groups G1-G6. Defaults: precursor 2.0 Da and fragment 0.5 Da tolerance; Min Pairs Cos 0.7; 6 matched peaks; Node TopK 10 (an edge is kept "only if both nodes are within each other's 'TopK' most similar nodes"); Maximum Connected Component Size 100 (larger components are split "by increasing cosine threshold"). Runs take about 10 minutes to several hours.
4. **Read in the browser.** "View Spectral Families" lists components; the user opens one: library hits blue; edge labels by cosine or delta m/z; pies per group; a typed delta m/z turns matching edges red. GNPS2 adds "Visualize Full Network w/ Singletons" (https://wang-bioinformatics-lab.github.io/GNPS2_Documentation/faq/).
5. **Propagate annotations.** NAP re-ranks candidate structures for unknowns from annotated neighbors, "limited by the connected component"; MolNetEnhancer gives each family its most frequent chemical class (`CF_class`).
6. **Figure in Cytoscape.** Import GraphML and the library table; size = `SumPeakIntensity`, pies from `_GNPSGROUP__` columns, edge width = `cosine_score`, fill by class; chemViz2 draws structures from `Smiles`. Share the job URL.

Families are capped at 100 nodes; singletons hidden by default; no source for a typical per-job node count. For a tool: pack many small components; a component list to rank and open; structures and pies as glyphs; edges highlighted by mass difference; building parameters shown with the graph.

### 5.14 Single-cell kNN graph, Leiden clusters and PAGA

Sources: Scanpy tutorial (https://scanpy.readthedocs.io/en/stable/tutorials/basics/clustering.html); `scanpy.pp.neighbors` (https://scanpy.readthedocs.io/en/stable/api/generated/scanpy.pp.neighbors.html); best practices (https://www.sc-best-practices.org/cellular-structure/clustering/); Seurat PBMC 3k (https://satijalab.org/seurat/articles/pbmc3k_tutorial); PAGA (https://pmc.ncbi.nlm.nih.gov/articles/PMC6425583); SPRING (https://pmc.ncbi.nlm.nih.gov/articles/PMC6030950); clustree (https://pmc.ncbi.nlm.nih.gov/articles/PMC6057528).

1. **Matrix.** Cells x genes in AnnData (.h5ad) or Seurat; QC, normalize, 2,000 variable genes, PCA.
2. **Neighbors.** `sc.pp.neighbors(adata)`: `n_neighbors=15`, Euclidean in PCA space; sparse cells x cells `obsp['connectivities']`, parameters in `uns['neighbors']`. Seurat `FindNeighbors(dims = 1:10)` reweights by shared neighbors.
3. **Cluster.** Leiden or Louvain at several resolutions compared on the UMAP by eye (Scanpy tries 0.02, 0.5, 2.0; Seurat 0.4-1.2). Stability via clustering trees (a layer per resolution, edges show cells moving between clusters).
4. **Embed.** UMAP or ForceAtlas2; a scatter, edges not drawn; best practices advises "not interpreting distances between clusters visualized on UMAP embeddings".
5. **Abstract with PAGA.** One node per cluster, edges weighted by observed over expected connections; seeds UMAP via `init_pos='paga'`. The paper spans 1,654 to 1.3 million cells.
6. **Interactive tools.** SPRING runs a live force layout "configured for datasets up to 10 000 cells". CELLxGENE Explorer plots an embedding of a million cells (https://github.com/chanzuckerberg/single-cell-explorer); no edge view found.

Data shape: 10^4 to 10^6 nodes of near-uniform degree as a sparse matrix with a node table and recorded parameters, plus a coarse cluster graph. The same vectors-to-kNN build recurs in bibliometrics-and-science-mapping.md and code-first-data-scientists-and-graph-ml.md; it belongs in data-preparation-and-import.md.

### 5.15 Residue interaction networks from protein structures and simulations (adjacent)

Sources: RING 4.0 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11223866); RING 2.0 (https://www.pubmed.gov/27198219/); RINalyzer (https://apps.cytoscape.org/apps/rinalyzer); structureViz2 (https://rbvi.ucsf.edu/cytoscape/structureViz2/); Doncheva et al. 2012 protocol (https://pubmed.ncbi.nlm.nih.gov/22422314/); dynamical network tutorial (https://luthey-schulten.chemistry.illinois.edu/network/network_tutorial.pdf); Bio3D `cna` (https://search.r-project.org/CRAN/refmans/bio3d/html/cna.html).

Each amino acid (or nucleotide part) is a node with 3D coordinates; each typed contact is an edge.

**Web route (RING).** (1) Upload PDB or mmCIF, or type a PDB or AlphaFold DB id; all chains and models by default; up to 200 MB, larger ensembles run locally. (2) Adjust thresholds. RING 2.0 users report "strict" thresholds of hydrogen bond 3.5 A (donor-acceptor), van der Waals 0.5 A (between atom surfaces), ionic 4.0 A, pi-pi 6.5 A, pi-cation 5.0 A, with "closest" atom distance and "multiple" (one edge per interaction type per residue pair) as defaults (https://arxiv.org/pdf/2010.01607); RING 4.0 redefined most types and added pi-hydrogen, halogen and metal coordination. (3) Run: 3 to 9 s for the paper's examples. (4) Explore: a Mol* 3D view beside a network showing all types at once; a residue selected in one view is highlighted in all; filter by type, intra- or inter-chain, or frequency; color by chain, type, sequence position, secondary structure or degree; multi-model input adds per-state and probability contact maps. (5) Export JSON, SVG, tables. RING 2.0 output went to Cytoscape with RINalyzer and structureViz.

**Desktop route (Cytoscape, structureViz2, UCSF Chimera, RINalyzer).** (1) Open the structure in Chimera from Cytoscape, select residues, run "Residue Network Generation" with chosen interaction types; nodes styled by secondary structure, edges by subtype. (2) Selections stay synchronized between network and structure. (3) RINalyzer computes weighted centralities "for discovering critical residues and their long-range interaction paths" and combines aligned structures into one network to compare proteins. Last release 2014; 9,568 downloads.

**Dynamics route (VMD NetworkView; about 2 hours).** Tutorial system: the GluRS enzyme bound to tRNA(Glu). (1) One node per amino acid at its C-alpha, two per nucleotide, three for the ligand. (2) Edges where residues stay within 4.5 A for at least 75% of the trajectory, excluding same-residue and sequence-neighbor pairs. (3) Edge length d_ij = -log(|C_ij|), C_ij the correlation of the atoms' fluctuations (from Carma). (4) Draw the network inside the molecule in 3D, edge width by weight. (5) Girvan-Newman communities, "sets of residues that move in concert"; critical nodes between communities in red. (6) Suboptimal paths between two nodes (anticodon base U35 to A76) within a length offset of 20; optimal path red, others blue. One user reports a couple of hundred paths, hard to interpret (https://tcbg.illinois.edu/Research/vmd/mailing_list/vmd-l/30991.html). Bio3D does the same in R: `cna(cij, cutoff.cij=0.35)`, edge-betweenness communities, `plot.cna`.

**Population.** Citations (OpenAlex, read 2026-11-25): RING 2.0, 437; Doncheva et al. 2011 review (https://doi.org/10.1016/j.tibs.2011.01.002), 274. Small next to omics users.

**For a tool.** A typed multigraph with fixed 3D node positions and per-edge ensemble frequencies, analyzed by weighted paths, betweenness and communities, drawn inside the molecule (NetworkView) or linked to a structure viewer (RING, Chimera). One node per residue, hundreds to thousands; typical edge counts and whether users prefer the in-molecule view: no source found.

## 6. Data

### 6.1 Sources and what users load

| Source                                           | Formats                                                      | Notes                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| STRING 12.5 (https://string-db.org/cgi/download) | links files, aliases; web PNG, SVG, TSV                      | Scores 150-999; presets 0.15/0.4/0.7/0.9                                                    |
| BioGRID 5.0, IntAct                              | TAB 3.0, PSI-MITAB 2.5-2.7, PSI-MI XML                       | BioGRID 2,364,201 interactions (https://thebiogrid.org/); no bait/prey roles                |
| KEGG, Reactome, WikiPathways                     | KGML; BioPAX, SBML, SBGN, GMT; GPML                          | Relation subtypes encode sign                                                               |
| Pathway Commons                                  | BioPAX, extended SIF, GMT                                    | SIF conversion is lossy                                                                     |
| SIGNOR 3.0, OmniPath, CollecTRI                  | CausalTAB (MITAB 2.8 extension); data frames                 | Signed, directed; OmniPath 103 resources (https://pmc.ncbi.nlm.nih.gov/articles/PMC7983032) |
| CellChatDB, CellPhoneDB, LIANA                   | R/Python tables                                              | Used inside the packages                                                                    |
| CellOracle, SCENIC+                              | CSV per cluster; HDF5 objects; Cytoscape JSON with positions | One edge table per cell type; TF2R, R2G, TF2G tables                                        |
| BiGG, Escher                                     | COBRA JSON, SBML (fbc), Escher map JSON                      | Bipartite metabolite-reaction                                                               |
| miRTarBase, starBase, TargetScan                 | TSV                                                          | ~500,000 CLIP-supported pairs in starBase v2                                                |
| GNPS / GNPS2                                     | GraphML, XGMML (NAP), CSV, MGF                               | Precursor mass, `_GNPSGROUP__*`, `cosine_score`, delta m/z, `Smiles`, `CF_*`                |
| Scanpy / Seurat                                  | .h5ad (sparse `obsp` matrices), .rds                         | kNN graph rarely exported as a graph file                                                   |
| PDB, AlphaFold DB, MD trajectories               | PDB, mmCIF; RING JSON and tables                             | Residue nodes with 3D coordinates; typed contacts                                           |
| NDEx                                             | CX, CX2                                                      | Opens in Cytoscape or Cytoscape Web                                                         |

Most used, in order: pasted gene lists; delimited tables (bait-prey, WGCNA, TF-target and per-cluster GRN edges, ceRNA); in-memory R/Python objects; GNPS GraphML; GMT; GPML/KGML; SIF; COBRA/Escher JSON and SBML; PSI-MITAB; BioPAX. Graphty's 13 importers include GraphML, XGMML and CX2 but none of SIF semantics, PSI-MITAB, BioGRID TAB3, KGML, GPML, BioPAX, SBML, COBRA or Escher JSON, .h5ad, PDB or mmCIF, or a dense or sparse matrix.

### 6.2 Sizes

- Gene-list networks: 16 to 600 query genes (PMC9904289); a stringApp example has 847 nodes and 3,904 edges at 0.8, "hundreds of thousands of edges" at 0.4.
- Co-expression: 3,600 to 50,000 genes before restriction; exported modules of tens to hundreds of genes.
- Cell-cell communication: 10-30 group nodes x hundreds of layers. Regulons: tens. CellOracle: 24 per-cluster GRNs over about 1,850 genes, 74,937 raw edges in one cluster, 2,000 after filtering.
- Single-cell kNN graphs: 10^4 to 10^6 cells at about 15 edges each; PAGA graphs: tens of nodes.
- Molecular networks: per-job count not found; components capped at 100 nodes, plus singletons.
- ceRNA: about 100 nodes, 200 edges. Metabolic: thousands of reactions per model; maps of tens to hundreds.
- Genetic interaction similarity: 4,909 nodes, 34,468 edges. Interactomes: BioPlex 118,162 edges; BioGRID 2.36 M. SIGNOR: 33,000 relations.
- Residue networks: one node per residue, hundreds to thousands; edge counts not found.

### 6.3 Identifiers

HGNC symbols, Entrez, Ensembl, UniProt, STRING ids (taxon.ENSP), KEGG ids (hsa:7157), BiGG ids, miRBase ids, ChEBI/PubChem, SMILES and InChI, GNPS scan or feature ids, cell barcodes, site ids (SYMBOL_SITE), genomic region ids (chr10_100050979_100052296), PDB chain and residue numbers, and analyst-chosen cell-type labels. Documented problems: case-sensitive exact match on import; symbol ambiguity; Excel date conversion; many-to-one mappings creating duplicate edges; isoforms not represented (CausalPath); species mix.

### 6.4 Graph properties

- STRING: undirected, probability-like confidence (not strength), seven evidence sub-scores. BioGRID/IntAct: multigraph, one row per experiment.
- AP-MS: bait -> prey plus undirected STRING edges; edge provenance. Pathways: directed, signed, typed, fixed curated layout.
- WGCNA and correlation: complete, weighted, sparsified by threshold or top-k. Cell-cell communication: directed, weighted, multi-layer on 10-30 nodes, self-loops.
- Single-cell kNN: near-uniform degree with a coarse PAGA graph. Molecular networks: mutual top-K cosine, thousands of small components, mass differences on edges.
- Regulons: bipartite signed. eGRN: tripartite TF -> region -> gene. Per-cell-type GRNs: a collection of directed signed graphs over one gene set.
- Residue networks: typed multigraph with 3D node positions and per-frame edge frequencies. ceRNA: tripartite. Metabolic: bipartite, reversible, currency hubs. OmicsNet: up to six node types (https://pmc.ncbi.nlm.nih.gov/articles/PMC9252810).
- Time courses are node attribute vectors, not dynamic graphs (Dictys's trajectory GRN is the exception).

## 7. Analysis methods

### 7.1 What they run

- Clustering: MCL, MCODE, Louvain and Leiden at several resolutions; WGCNA hierarchical clustering with Dynamic Tree Cut; Girvan-Newman on residue networks.
- Hub ranking: cytoHubba's 11 methods, top-10 convention; within-module connectivity and kME; per-cluster degree, betweenness and eigenvector centrality compared across clusters (CellOracle).
- Enrichment: over-representation with Benjamini-Hochberg FDR; GSEA; ClueGO; region enrichment on a layout (SAFE); chemical class per family (MolNetEnhancer).
- Propagation: GeneMANIA (https://pmc.ncbi.nlm.nih.gov/articles/PMC4168749); annotation propagation within a component (NAP); in silico knockout by signal propagation through a GRN (CellOracle).
- Graph construction: kNN from PCA; mutual top-K cosine with a component cap (GNPS); coarse abstraction (PAGA); contact networks from 3D distances across trajectory frames.
- Directed and signed: k-shortest paths, ILP (CARNIVAL), causal reasoning with permutation FDR, TF activity (decoupler), Boolean simulation; suboptimal paths between two residues.
- Communication: permutation tests per ligand-receptor pair; consensus ranking (LIANA). Regulatory inference: GRNBoost2, motif pruning, regularized regression per cluster.
- Flux balance analysis and knockouts (COBRApy, Escher-FBA).

### 7.2 How they interpret

Cluster = complex or pathway, named by its top term. Hub = essential or driver gene. Module eigengene correlated with a trait = the module "drives" the trait. Thick edge between cell types = strong communication. A TF central in one cluster's GRN but not another's = a cell-type driver. A molecular family = related compounds, so a library hit names its neighbors. A residue on many suboptimal paths = an allosteric relay. Edge = "these work together" (STRING) or "A activates B" (signaling); users conflate the two, and STRING says the score "does not imply that the interaction is strong" (https://string-db.org/help/scores/).

### 7.3 Validation habits

Cutoffs come from protocol defaults more than sensitivity analysis. Background: genome by default. Bench validation of a few hits. Rarely: cutoff sweeps, database swaps, method consensus (LIANA), clustering trees, degree-preserving randomization; CellOracle shows a randomized-GRN control beside every simulation.

### 7.4 Known biases

PPI degree tracks how often a protein was studied (https://frontiersin.org/articles/10.3389/fgene.2015.00260/pdf), and study bias alone can produce power-law degree distributions (https://elifesciences.org/articles/99951); higher STRING thresholds favor well-studied proteins. Ligand-receptor resources cover pathways unevenly (LIANA). DepMap co-essentiality networks carry a mitochondrial bias (https://pmc.ncbi.nlm.nih.gov/articles/PMC10632734). "Hub" often means "famous".

## 8. Outputs and collaboration

- **Figures**: networks with legends; node donuts; pathway and flux maps; circle and chord plots; UMAP and PAGA; per-cluster centrality plots; molecular families; residue networks over a structure. Ten Simple Rules advises matrices for dense networks and avoiding unjustified 3D (PMC6762067).
- **Tables**: node tables with computed columns, module membership, hub ranks, ligand-receptor tables, per-cluster GRN edge lists, library hits.
- **Sessions**: .cys, .rds, .h5ad, CellOracle HDF5, GNPS job links, NDEx links.
- **Reproducibility reality**: cytoHubba rankings reported to change between runs; stringApp drops older STRING versions; KEGG maps change; GNPS reruns reshape families. Scripts plus NDEx are the strongest practice.

## 9. Tools landscape and pain points

| Tool                                                                                | Role                                                 | Loved for                                                                | Fails them                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cytoscape desktop, apps (cytoHubba, MCODE, ClueGO, EnrichmentMap, Omics Visualizer) | Hub of the workflow                                  | Style mappings, merge, sessions, publication conventions                 | Java heap; many steps per figure; cytoHubba last released 2017; chart expressions typed into cells                                                                                      |
| STRING website, stringApp, Metascape                                                | Quick look; one-click enrichment                     | Zero setup; PowerPoint                                                   | Hard to color by user data; old versions dropped                                                                                                                                        |
| KEGGscape, WikiPathways, KEGG Mapper, Reactome, Pathview                            | Pathway overlay                                      | Curated fixed layouts                                                    | Incomplete imports; static images                                                                                                                                                       |
| CausalPath, Newt                                                                    | Causal phospho networks                              | Signed notation                                                          | No image export in web viewer                                                                                                                                                           |
| NetworkAnalyst, OmicsNet                                                            | Web PPI and multi-omics networks                     | No install; WebGL 3D added "to address the hairball effect" (PMC6602507) | OmicsNet recommends 200-2,000 nodes (https://pmc.ncbi.nlm.nih.gov/articles/PMC6030925) and added 2D because users are "more accustomed to the traditional 2D perspectives" (PMC9252810) |
| MetaboAnalyst, Escher, Escher-FBA                                                   | Metabolite networks; flux maps                       | No code; live knockouts                                                  | Maps built by hand; COBRA JSON only                                                                                                                                                     |
| GNPS / GNPS2, NAP, MolNetEnhancer, chemViz2                                         | Molecular networking and annotation                  | Mirror plots; pies by group; delta m/z highlight                         | One component at a time; separate jobs to merge in Cytoscape                                                                                                                            |
| CellChat, CellPhoneDB, LIANA                                                        | Cell-cell communication                              | Circle, chord, hierarchy, spatial plots                                  | One plot per pathway; methods disagree                                                                                                                                                  |
| pySCENIC, SCope                                                                     | Regulons                                             | Scales to 50,000 cells                                                   | Regulons shown as heat maps, not networks                                                                                                                                               |
| SCENIC+, CellOracle, Pando, Dictys, FigR                                            | Multiome and per-cell-type GRNs; knockout simulation | Concentric eGRN layout; centrality comparisons                           | Cytoscape export carries no style; networks read as score plots                                                                                                                         |
| Scanpy, Seurat, SPRING, CELLxGENE                                                   | kNN graph, Leiden, UMAP, PAGA; interactive views     | Standard pipelines; a million cells (CELLxGENE)                          | Graph edges never shown; SPRING slow above 10,000 cells                                                                                                                                 |
| RING, RINalyzer, structureViz2, VMD NetworkView, Bio3D                              | Residue networks linked to 3D structure              | Network beside or inside the molecule                                    | RINalyzer unreleased since 2014; path lists hard to read                                                                                                                                |
| WGCNA                                                                               | Co-expression modules                                | Trait correlation                                                        | Exports dense; threshold by eye                                                                                                                                                         |
| RCy3, py4cytoscape, igraph, OmnipathR; NDEx                                         | Scripted Cytoscape; sharing, DOIs                    | Reproducibility; reviewer links                                          | Needs desktop Cytoscape; no upload progress                                                                                                                                             |

**3D in this population.** NetworkAnalyst added 3D against hairballs; OmicsNet made WebGL 3D central, then added 2D because users prefer it; VMD NetworkView draws residue networks in 3D inside the molecule, the one case here where 3D positions are data. No source measures how often 3D appears in published figures.

## 10. Requirements implied

Must-have (M) or should-have (S). Each is a gap -- no current designloom persona, workflow or capability covers it -- unless marked partly covered.

1. (M) Paste a gene/protein list plus species, build from an interaction source, report found / not found / ambiguous -- partly covered (W20)
2. (M) Identifier mapping (symbol, Entrez, Ensembl, UniProt, STRING, KEGG, miRBase, BiGG) with match counts and Excel-mangled symbol detection
3. (M) Import SIF with interaction types (incl. extended SIF)
4. (M) Import PSI-MITAB 2.5-2.8 (incl. CausalTAB) and BioGRID TAB 3.0; choose whether to collapse multi-edges
5. (S) Import GPML and KGML keeping curated coordinates, groups and relation subtypes
6. (S) Import SBML (fbc, qual), COBRA and Escher JSON, or a documented conversion; BioPAX
7. (M) Signed, directed edges as a first-class style: arrow vs T-bar, color by sign
8. (M) Direction-aware analysis: in/out-degree, directed and k-shortest paths, sign-consistent paths, feedback loops; the analyzer states whether it treated the graph as directed
9. (M) Hierarchical layout, and fixed-coordinate layouts from imported maps or spatial coordinates -- partly covered (layout-hierarchical)
10. (S) Stability view of hubs and clusters across cutoffs, databases or resolutions (a clustering tree)
11. (S) Evidence-channel filtering for multi-score edges
12. (M) Edge provenance (AP-MS vs STRING) with a discrete legend -- partly covered (W24)
13. (M) Merge networks by a chosen key per network; join a node table by key -- partly covered (W24)
14. (M) One-to-many node data: per-node donut, pie or bar charts from several columns
15. (M) Enrichment with explicit, recorded background -- partly covered (W21)
16. (M) Low-configuration path: list in, styled figure with legend out in under five decisions -- partly covered (W20)
17. (S) Study-bias flags beside hub rankings
18. (M) Methods-paragraph export with source version, access date, cutoffs and every graph-building parameter -- partly covered (W25)
19. (M) Import a dense adjacency, correlation or TOM matrix, and a long all-pairs table (TF, target, importance)
20. (M) Interactive sparsification: weight threshold and top-k per node or per network, with live edge and component counts
21. (M) Module coloring from a membership column; hub ranking within a module -- partly covered
22. (M) Edges grouped by a layer column (ligand-receptor pair, pathway), per-layer show/hide, aggregate views
23. (M) Circle and chord layouts for small dense directed weighted graphs, self-loops drawn -- partly covered (chord gap)
24. (M) Compare two graphs on the same node set with locked positions, shared scales and a difference view -- partly covered (W24)
25. (M) Node-type-aware styling and legends when a type column is detected
26. (S) Currency-node handling: hide, remove or duplicate listed or high-degree nodes
27. (S) Flux on edges: magnitude as width, sign as direction
28. (S) Region-level enrichment overlay on a fixed layout
29. (S) 10^4-10^5 edges without tuning -- partly covered (large-graph-rendering)
30. (S) Headless scripted reproduction (graphty-element in Node or browser)
31. (S) CX2/NDEx round-trip -- partly covered (CX2 import)
32. (M) Packing layout for thousands of small components plus singletons, ordered by an attribute
33. (M) Component browser: list components with size and attribute summaries, sort, open one, export it
34. (S) Images as node glyphs from a column (structure from SMILES, or an image URL)
35. (S) Edge highlighting by an edge value, such as a given mass difference -- partly covered (filtering)
36. (S) Build a kNN or mutual-top-K similarity graph from vectors, with k, metric and cutoff recorded
37. (S) Import .h5ad neighbor matrices and observation table, or a sparse matrix with a node table
38. (S) Two-level view: coarse cluster graph linked to its members; seed the fine layout from coarse positions
39. (S) 10^5-10^6 nodes of near-uniform degree drawn interactively -- partly covered (large-graph-rendering)
40. (M) A collection of networks over one node set (one per cell type): per-network centrality, two-network score scatter, one node's score across all networks, "absent" distinct from zero
41. (S) Concentric layout for tripartite regulator-region-target graphs; positions kept on export
42. (S) Residue networks with 3D node coordinates: draw at those coordinates, or link to a structure view with shared selection
43. (S) Edge frequency across frames or states; filter and color by it
44. (S) Suboptimal paths between two nodes within a length offset, optimal path distinguished

### Deltas to existing records

- **W20-W22**: add disambiguation, identifier mapping, size-dependent cutoff, STRING version, background choice, resolution sensitivity, Reimand cutoffs (gene sets 5-350, q < 0.05).
- **W23**: add study-bias flags and the robustness check (5.5); hubs within a WGCNA module; centrality compared across per-cluster GRNs (5.9).
- **W24**: add edge-provenance merge (AP-MS + STRING) and same-node-set comparison (CellChat conditions, CellOracle clusters).
- **W25**: add every graph-building parameter, NDEx DOI, scripted path.
- **New workflows**: 5.1-5.11, 5.13, 5.14; 5.12 and 5.15 are adjacent.
- **New personas**: `proteomics-bench-scientist`, `signaling-network-modeler`, `network-biology-core-bioinformatician`, `single-cell-computational-biologist`, `metabolic-network-modeler`, `molecular-networking-chemist` (lift the persona index's deferral), `structural-network-biologist` (adjacent). Keep `bioinformatics-researcher` as the network medicine persona (3.9).

## 11. Key sources

Every claim carries its source URL inline; the workflow sections open with their primary sources.
