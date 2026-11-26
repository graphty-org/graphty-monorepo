# Network Medicine, Drug Discovery and Biomedical Knowledge Graph Researchers

## 1. Summary

This population uses graphs to answer "which drug for which disease, acting through which proteins, and with what risk?", and, for chemists, "which molecules are related, and which structural change moves activity?" It splits into eight groups that share data sources but work very differently:

1. **Academic network medicine researchers.** On the human interactome (13,000 to 18,500 proteins, 140,000 to 350,000 interactions) they measure how close a disease's genes sit to a drug's targets against a degree-matched random baseline, grow "disease modules" and rank drugs, all in Python or R scripts. What they lack is the step from a 20 to 300 node result subnetwork to a readable figure.
2. **Pharma target and knowledge graph scientists.** They query internal knowledge graphs of tens of millions of nodes, rank compound-gene-disease "triangles" or paths by edge uncertainty, and read the abstracts behind each edge.
3. **Bench and translational biologists interpreting omics results.** They upload a differential expression list to QIAGEN IPA, Clarivate MetaCore or Elsevier Pathway Studio, read predicted upstream regulators, and draw a signed, directed mechanism figure with drugs overlaid. Probably the largest buyer group in pharma; no source sizes it.
4. **Biomedical knowledge graph and machine learning scientists.** They train link-prediction models on Hetionet, DRKG, PrimeKG or SPOKE and explain each prediction as drug-to-disease paths, or put a large language model (LLM) in front of the graph and must show which subgraph it used.
5. **Clinical network medicine researchers.** Directed, time-ordered disease co-occurrence and trajectory networks from claims and registries, weighted by relative risk.
6. **Pharmacovigilance researchers.** Drug-event and event-event co-reporting networks from adverse event reports, grouped by MedDRA.

7. **Molecular networking chemists.** Natural-products and metabolomics chemists who run untargeted LC-MS/MS, build a spectral similarity network on GNPS, and style it in Cytoscape (pie charts by sample group, structures from SMILES, cosine-weighted edges). GNPS reports over 300,000 accesses a month (Workflow 9).
8. **Medicinal chemists and cheminformaticians.** They draw a compound series as a network with one node per molecule: a chemical space network (edges where fingerprint similarity passes a threshold), an activity cliff network (edges between near-identical pairs with a 100-fold potency gap) or a scaffold tree or network (compounds hang under the ring systems they share). Nodes are drawn as 2D structures and colored by potency, and the reading task is structure-activity relationships (SAR) (Workflow 10).

Visualization in every group is almost never of a whole graph. It is a 10 to 300 node subnetwork (a module, a drug's neighborhood, one prediction's explanation paths, one evidence triangle, a trajectory cluster) cut out of a graph too big to draw. Every edge in it carries evidence the reader wants to open.

Graphty's existing persona `bioinformatics-researcher` and workflow `W08 Drug Target Discovery` describe this work as "find essential hub proteins by centrality". The published standard method is different, and the existing records miss seven of the eight groups. Section 10 lists what must change.

## 2. Population

**Job titles and settings.**

- Academic network medicine: postdocs, staff scientists and principal investigators. Best-known centers: Barabasi (Northeastern, Harvard Channing), Cheng (Cleveland Clinic), Menche (Vienna), Baumbach and List (NeDRex, Drugst.One), Zitnik (PrimeKG, TxGNN), Baranzini (SPOKE), Himmelstein and Greene (Hetionet).
- Pharma knowledge graph teams ("computational biologist, target identification", "knowledge graph data scientist"). AstraZeneca's BIKG: 10.9 million nodes of 22 types, over 118 million edges of 59 types (https://faircookbook.elixir-europe.org/content/recipes/introduction/public-kg-resource-integration.html). Novartis's Neo4j graph had about 30 million nodes and 400 million relationships of 91 types (2016 talk, republished 2018: https://neo4j.com/blog/connecting-dots-in-early-drug-discovery-at-novartis/; 2025 case study: https://neo4j.com/case-studies/novartis/).
- Omics interpreters: bench biologists, translational scientists and toxicologists in pharma, biotech and academic cores (https://www.qiagen.com/us/products/ingenuity-pathway-analysis/).
- Clinical network medicine: epidemiologists, medical informaticians and physicists using registry or claims data (Workflow 5).
- Pharmacovigilance: safety scientists at pharma companies and regulators, and academic pharmacologists who mine FDA Adverse Event Reporting System (FAERS) data (Fusaroli et al. 2021: https://www.frontiersin.org/articles/10.3389/fphar.2021.740707/full).
- Molecular networking: natural-products chemists, metabolomics core scientists and microbiologists in academia, pharma and food science (for example, an infection metabolomics chapter from a parasitology lab: Harris et al. 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC10040239).
- Compound networks: medicinal chemists, computational chemists and cheminformaticians in pharma and academic drug discovery groups, and academic method developers (the Bajorath group in Bonn for activity cliff networks; the EXSCALATE group at Dompe for Molecular Anatomy; library science chemists for the open chemical space network tutorial).
- Translational consumers: clinician-scientists and pharmacists who judge repurposing predictions. The TxGNN user study recruited five clinicians, five clinical researchers and two pharmacists (https://pmc.ncbi.nlm.nih.gov/articles/PMC11326339).
- Government: the NCATS Biomedical Data Translator, with reasoners such as ARAX and ROBOKOP (https://pmc.ncbi.nlm.nih.gov/articles/PMC10027432, https://pmc.ncbi.nlm.nih.gov/articles/PMC6954664).

**Rough size (evidence only).** No direct count exists for any group. Proxies:

- The 2019 International Conference on Systems and Network Medicine drew 150 to 200 attendees (https://gumc.georgetown.edu/gumc-stories/georgetown-hosts-first-international-systems-and-network-medicine-conference/).
- Open Targets reports over 70,000 public users in 170 countries (EMBL-EBI Highlights 2024: https://www.embl.org/documents/wp-content/uploads/2025/03/EMBL-EBI-Highlights-Report-2024.pdf).
- Cytoscape is downloaded about 300,000 times a year across all of biology (https://www.frontiersin.org/journals/bioinformatics/articles/10.3389/fbinf.2023.1125949/pdf).
- BenchSci says its evidence knowledge graph product is used by 9 of the top 10 pharma companies (vendor-reported, 2026: https://neo4j.com/?p=410587).
- IPA, MetaCore, Pathway Studio: no seat count found.
- Molecular networking: GNPS reported "over 300,000 accesses to the GNPS analysis ecosystem per month" from more than 160 countries in February 2021 (Leao et al. 2021: https://pmc.ncbi.nlm.nih.gov/articles/PMC8705952); accesses are not users. Feature-Based Molecular Networking ran "more than 6,767 jobs" in 2019 (Nothias et al. 2020: https://pmc.ncbi.nlm.nih.gov/articles/PMC7885687). The 2016 GNPS paper has 4,205 Scopus citations (https://experts.umn.edu/en/publications/sharing-and-community-curation-of-mass-spectrometry-data-with-glo/). How many draw their network in Cytoscape: no count found.
- Medicinal chemists and cheminformaticians: no headcount of medicinal chemists or of those who draw compound networks was found (searches of chemist workforce surveys gave only respondent counts). Chemical space networks date from 2014 (Maggiora and Bajorath, J Comput Aided Mol Des, as cited in Scalfani 2022), and the open tutorial and tools come from J Cheminform and Bioinformatics papers (Workflow 10). Most chemists see compound sets as tables and scatter plots in DataWarrior, KNIME or vendor tools; network views are a minority use inside that population (inferred; no usage survey found).

**How often they touch graph tools.** Academic work is project-based (inferred); molecular networking chemists restyle a network per GNPS job; for pharma, IPA and medicinal chemistry users: no source found.

**Skill profile.**

- Network medicine and knowledge graph ML: high graph literacy (shortest paths, degree bias, null models, metapaths, embeddings); strong Python (NetworkX, pandas, PyTorch, PyG, DGL, PyKEEN) or R (igraph); Cypher for Neo4j graphs.
- Omics interpreters: strong biology, statistics at the level of fold changes and p-values, usually no coding. IPA training is menu by menu (section 5, Workflow 4).
- Pharmacovigilance and clinical networks: epidemiology and disproportionality statistics; R (igraph, qgraph) is common.
- Molecular networking: strong analytical chemistry (m/z, adducts, fragmentation, cosine similarity); point-and-click GNPS and Cytoscape users; graph literacy limited to components and neighbors.
- Medicinal chemists: read structures fluently and think in R-groups, scaffolds and potency (pKi, pIC50); low graph literacy. Cheminformaticians script RDKit, NetworkX and KNIME.
- All biomedical groups need pharmacology vocabulary (indication, contraindication, target class, clinical phase, tractability).

**Team context.** Computational groups produce ranked lists, and wet-lab collaborators validate the top 10 to 100 (Gysi et al. screened 918 drugs: https://pmc.ncbi.nlm.nih.gov/articles/PMC8126852). In pharma a target-assessment committee reviews evidence profiles. Expert review is built into the tools: NeDRex states "investing domain knowledge is not an option but a requirement" (https://pmc.ncbi.nlm.nih.gov/articles/PMC8617287).

## 3. Personas

### Persona A: Dr. Wei Chen -- network medicine researcher (id: bioinformatics-researcher, corrected)

Boundary: omics-to-network workflows (STRING, AP-MS, WGCNA, pathway overlay) belong to systems-biology-omics-networks.md.

- **Role.** Postdoc in an academic network medicine lab; screens approved drugs against diseases for repurposing.
- **Tools today.** A lab-curated interactome as an edge list; NetMedPy or her own Python for proximity (https://pmc.ncbi.nlm.nih.gov/articles/PMC12401583); DIAMOnD (https://github.com/barabasilab/DIAMOnD); SAveRUNNER in R (https://pmc.ncbi.nlm.nih.gov/articles/PMC7891752); Gephi, Cytoscape or igraph's plot function for figures.
- **Data.** An interactome of 13,000 to 18,500 proteins; disease gene sets from OMIM, GWAS (p < 5e-8) or DisGeNET; drug targets from DrugBank, ChEMBL and BindingDB, filtered at 10 micromolar affinity.
- **Goals.** A ranked drug table with proximity z-scores; a figure of the drug's targets near the disease module; a validation figure.
- **Frustrations.** The interactome is roughly 80 percent incomplete (Menche et al.: https://pmc.ncbi.nlm.nih.gov/articles/PMC4435741). Results depend on the null model, and no single method wins (Gysi). Visualization is a separate step: "Visualization and interpretation are performed outside of NetMedPy".

**Correction to the existing record.** The current bio says she finds targets "by finding essential network hubs". Proximity was designed "to correct for the known biases of the interactome", in particular degree, and Open Targets scores essentiality as a safety liability (https://platform-docs.opentargets.org/web-interface/target-prioritisation). Centrality describes a module; it is not the method.

### Persona B: Dr. Sofia Marques -- pharma target and knowledge graph scientist (id: pharma-target-assessment-scientist)

- **Role.** Computational biologist in a pharma target-identification group; prepares evidence dossiers on candidate targets and answers biologists' "how are these connected?" questions against the company graph.
- **Tools today.** The internal graph through Cypher, a search or dashboard front end (https://www.slideshare.net/slideshow/building-a-knowledge-graph-with-spark-and-nlp-how-we-recommend-novel-drugs-to-our-scientists/189027597) or a recommendation service; Open Targets; ChEMBL.
- **Data.** Typed nodes (compound, gene, disease, phenotype, assay, pathway); edges with a source, an association strength or uncertainty, and links to PubMed abstracts; internal screening results marked active or inactive; licensed sources that cannot leave the company.
- **Goals.** Ranked, explainable hypotheses ("this compound may act on this disease through this gene") where every edge can be traced to its evidence; a short list of tractable, safe targets for committee review.
- **Frustrations.** Text-mined associations need an uncertainty threshold that is hard to set. The first result Novartis showed a biologist drew "I knew that". Open Targets association scores "reflect the amount of data available rather than the quality of the data" (https://platform-docs.opentargets.org/associations). Internal and public identifiers disagree.
- **Unknown.** No public source shows her click-by-click interface; Workflow 3 is built from the query patterns the sources describe.

### Persona E: Dr. Hannah Lee -- translational biologist interpreting omics results (id: omics-mechanism-interpreter)

Boundary: this persona is about mechanism of action and drug overlay in licensed causal-network platforms. Open-source omics-to-network work (STRING, WGCNA, signed causal methods such as OmniPath and CARNIVAL) is covered in systems-biology-omics-networks.md.

- **Role.** Bench or translational scientist in pharma, biotech or an academic institute. She has RNA-seq or proteomics results from a treatment, knockout or disease-versus-control comparison and needs a mechanism-of-action story.
- **Tools today.** QIAGEN IPA; Clarivate MetaCore (about ten network-building algorithms: https://clarivate.com/products/metacore/); Elsevier Pathway Studio (Sub-Network Enrichment Analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC8221786).
- **Data.** A table of gene IDs with fold change and p-value; the vendor's proprietary curated knowledge base. IPA's knowledge base holds "14+ million findings", each with type, direction, effect (increases or decreases), cell or tissue context and a source PMID (NIH CCR IPA slides, 2026).
- **Goals.** A list of upstream regulators predicted to be activated or inhibited; a causal network linking them to her genes; a figure for a paper or a program review, showing her genes, predicted regulators and known drugs.
- **Frustrations.** The knowledge base is closed and licensed; Northwestern's library canceled MetaCore and notes "no single free option" matches MetaCore or IPA (https://libguides.galter.northwestern.edu/gene-enrichment-and-pathway-analysis). Reproducing a result needs the same license and knowledge-base version. IPA caps input at 8,000 analysis-ready molecules (Workflow 4).
- **Graph shape.** Directed and signed, with node states (predicted activated or inhibited, observed up or down) from her data.

### Persona C: Dr. Arjun Rao -- biomedical knowledge graph ML scientist (id: biomedical-kg-ml-scientist)

- **Role.** Builds link-prediction models for drug repurposing on heterogeneous knowledge graphs, or LLM question answering over them.
- **Tools today.** PrimeKG CSVs in NetworkX or igraph (https://pmc.ncbi.nlm.nih.gov/articles/PMC9893183); DRKG triples with DGL-KE (https://github.com/gnn4dr/DRKG); Hetionet in the public Neo4j Browser and het.io/search; PyKEEN (https://github.com/pykeen/pykeen); TxGNN; KG-RAG over SPOKE (https://pmc.ncbi.nlm.nih.gov/articles/PMC11441322/).
- **Data.** 47,031 to 129,375 nodes and 2.25 to 8 million edges in public graphs; about 27 million nodes in SPOKE (no bulk download); 11 to 22 node types and 24 to 107 edge types.
- **Goals.** Better AUROC and Hits@k in zero-shot settings; explanations that clinicians accept.
- **Frustrations.** Explanations are long path lists ("Interpretation of large lists is difficult": https://pmc.ncbi.nlm.nih.gov/articles/PMC10375517/); every lab builds its own explanation front end.

### Persona F: Dr. Mikkel Sorensen -- clinical comorbidity network researcher (id: clinical-comorbidity-network-researcher)

- **Role.** Epidemiologist or health data scientist who studies how diseases co-occur and follow each other in patient populations.
- **Tools today.** Registry or claims extracts inside a secure environment; R or Python for pairwise statistics; MCL for clustering (Jensen 2014). Published papers do not name the drawing tool.
- **Data.** ICD-coded diagnoses per patient with dates; millions of patients; access by application only ("can only be accessed following application", Jensen 2014).
- **Goals.** Significant, directed disease pairs; trajectories of three or four diagnoses; clusters colored by ICD chapter.
- **Frustrations.** Only aggregate networks can leave the secure environment; relative risk favors rare diseases and phi common ones, so each needs its own network (Hidalgo 2009).

### Persona G: Dr. Giulia Ferri -- pharmacovigilance network analyst (id: pharmacovigilance-network-analyst)

- **Role.** Drug safety scientist (pharma or regulator) or academic pharmacologist mining spontaneous reports.
- **Tools today.** FAERS quarterly files; R (igraph, qgraph, IsingFit, visNetwork) as in Fusaroli 2021; disproportionality statistics (ROR, PRR, IC, EBGM).
- **Data.** Reports with suspect drugs and MedDRA-coded reactions. MedDRA is a hierarchy (Preferred Term, High-Level Term, System Organ Class) that serves as the grouping ontology.
- **Goals.** Signals of disproportionate reporting and clusters of co-reported reactions that make clinical sense; drug-drug interaction signals.
- **Frustrations.** Reporting biases the network does not remove; thousands of Preferred Terms are unreadable until grouped (Fusaroli 2021).

### Persona D: Dr. Lena Okoro -- molecular networking chemist (id: molecular-networking-chemist)

- **Role.** Natural-products or metabolomics chemist; runs untargeted LC-MS/MS and needs to know which features are known compounds, which are analogs, and which differ between sample groups.
- **Tools today.** MZmine, MS-DIAL or similar for feature detection; GNPS or GNPS2 jobs; Cytoscape with chemViz2; MolNetEnhancer for chemical classes (https://ccms-ucsd.github.io/GNPSDocumentation/molnetenhancer).
- **Data.** One node per spectrum or feature (precursor m/z, retention time, intensity, per-group mean intensities, library match with SMILES, chemical class); one edge per spectral pair above a cosine threshold, with the cosine score and mass difference.
- **Goals.** A figure of the molecular families that matter, with pie charts and known structures; candidate new analogs; group-specific features.
- **Frustrations.** Cytoscape search "is very slow, especially with large networks" (https://carpentries-incubator.github.io/genome-mining/09-metabolomics/index.html). Every new job means re-importing the style; whole networks can be too large to open. The GNPS in-browser viewer shows only "a single component at a time" (https://ccms-ucsd.github.io/GNPSDocumentation/cytoscape).
- **Graph shape.** Undirected similarity graph broken into many small components (default component cap 100 nodes) plus many singletons; data-rich nodes drawn as pie charts or structure images.

### Persona H: Dr. Tomas Novak -- medicinal chemist reading SAR from compound networks (id: medicinal-chemistry-sar-analyst)

- **Role.** Medicinal or computational chemist on a lead-optimization or hit-triage team. He has a series of a few hundred to tens of thousands of tested compounds and must decide which structural changes to make next.
- **Tools today.** DataWarrior's "Analyse Similarity/Activity Cliffs" and "Decompose R-Groups" (https://openmolecules.org/help/chemistry.html); Cytoscape with chemViz2 "Create Similarity Network" (https://www.rbvi.ucsf.edu/cytoscape/chemViz2/); RDKit and NetworkX notebooks; ScaffoldGraph or Scaffold Hunter for scaffold trees; KNIME with RDKit nodes for data preparation; Gephi or in-house Java for older chemical space network work (Scalfani 2022 lists these).
- **Data.** SMILES or SDF with IDs and an activity column (Ki, IC50, converted to pKi or pIC50), from ChEMBL or the company's assay database; for screening data, an active or inactive class.
- **Goals.** Find the chemical series that carry activity; spot activity cliffs (small change, large potency jump); get an R-group table for the series worth pursuing.
- **Frustrations.** Large cliff networks are "difficult to navigate and interpret" and dense clusters are essentially impossible to analyze interactively (Hu and Bajorath 2020: https://pmc.ncbi.nlm.nih.gov/articles/PMC7367913). The threshold changes the network's shape: literature chemical space networks keep 2 to 5 percent of possible edges, and getting there may need a Tanimoto cutoff near 0.9 (Scalfani 2022). Structure images become unreadable beyond about 40 compounds per view (the tutorial sizes images for 5 to 40 structures). Workflow tools "lack an intuitive visualization of the chemical space" (https://pmc.ncbi.nlm.nih.gov/articles/PMC5425364).
- **Graph shape.** Undirected similarity graphs, or directed scaffold hierarchies (molecule to scaffold to parent scaffold); every node is a molecule or a substructure and is best drawn as its 2D structure.

## 4. Use cases (ranked by frequency times stakes)

1. **Interpret an omics result for mechanism of action (Persona E).** Frequency: routine wherever transcriptomics is run (no count found). Stakes: high.
2. **Annotate and publish a molecular network (Persona D).** Frequency: high (GNPS, 300,000 accesses a month). Stakes: medium (inferred).
3. **Target prioritization with evidence (Personas B, A).** Stakes: very high; a target choice commits years of work.
4. **Rank hypotheses in an internal knowledge graph (Persona B).** Frequency: no source found.
5. **Drug-disease network proximity screen (Persona A).** Stakes: high; results pick which drugs enter a cell screen.
6. **Disease module detection (Persona A).** It precedes nearly every proximity study.
7. **Explain a model's or an LLM's answer (Persona C).** Show the paths or subgraph behind a drug-disease score or a generated answer. TxGNN explanations raised clinician accuracy by 46 percent.
8. **Literature-based discovery and evidence checking (Personas B, C).** Open a predication, read its source sentences, accept or reject it.
9. **Drug safety network analysis (Persona G).** Co-reporting networks, adverse reaction clusters, polypharmacy side effects. Stakes: high (patient safety).
10. **Comorbidity and trajectory networks (Persona F).** Stakes: medium to high (screening and prevention policy).
11. **Metapath search in public knowledge graphs; drug combination separation; graph ML training** (Personas C, A).
12. **Read SAR from a compound network (Persona H).** Chemical space, activity cliff and scaffold networks colored by potency. Frequency: no source found; a minority view next to tables and scatter plots. Stakes: medium to high (it picks the next compounds to make).
13. **Publication figures** (all groups).

## 5. Step-by-step workflows

### Workflow 1: Drug-disease network proximity screen, including the hand-off to a figure

Sources: Guney et al. 2016 (https://pmc.ncbi.nlm.nih.gov/articles/PMC4740350/), Zhou et al. 2020 (https://pmc.ncbi.nlm.nih.gov/articles/PMC7073332/), Gysi et al. 2021 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8126852), SAveRUNNER, NetMedPy.

1. **Assemble the interactome.** Merge physical interaction sources (IntAct, BioGRID, HPRD, CORUM and others) into one undirected graph and keep the largest component (13,329 proteins and 141,150 interactions in Guney; 17,706 and 351,444 in Zhou). Output: a TSV edge list.
2. **Collect disease genes** from OMIM, GWAS (p < 5e-8) or DisGeNET, keeping diseases with at least 20 genes; modules under about 25 genes are not observable (Menche).
3. **Collect drug targets** from DrugBank, ChEMBL, BindingDB and others at 10 micromolar or better.
4. **Map identifiers** to the interactome's ID space and drop what does not map (section 6).
5. **Compute distances.** The "closest" measure d_c is the mean, over the drug's targets, of the shortest path to the nearest disease protein; most papers use it. NetMedPy precomputes a full distance matrix once.
6. **Build the null distribution.** Draw random target and disease sets matched in size and degree (degree bins of at least 100 nodes) and repeat 1,000 times. This is the expensive step; NetMedPy parallelizes it.
7. **Convert to z-scores.** z = (d - mean_rand) / sd_rand; significant at z <= -2 (Guney) or z < -1.5 with p < 0.05 (Zhou); SAveRUNNER builds a bipartite drug-disease network instead.
8. **Validate** by AUC against known indications. Gysi compared 12 pipelines on a 918-drug screen; the best reached an AUC of only 0.63.
9. **Hand off to visualization.** This step is the least documented and is where these users lack tools.
    - What the script produces. NetMedPy returns DataFrames; DIAMOnD writes a text file of nodes. No tool exports a ready-to-draw subnetwork.
    - Which nodes get drawn. The disease module, the drug's targets and the shortest paths between them (Guney Fig. 1), or a network of significant drug-disease pairs. Never the whole interactome.
    - Which tool. Zhou 2020 used Gephi 0.9.2 (no layout named). Gysi's repository draws the module with igraph's base plot (https://github.com/Barabasi-Lab/COVID-19, file 00_Intro.R), with every encoding hand-written and nothing saved, so the published image needed a manual export. Other papers: no source found.
10. **Hand off results.** Supplementary CSV/XLSX tables of drugs with z and p, and a GitHub repository.

**Combination variant (separation).** s_AB = mean distance between the targets of drugs A and B, minus the average of each drug's within-set distance. Only "both drugs hit the disease module but target separate neighborhoods" tracks clinical efficacy (Cheng, Kovacs, Barabasi 2019: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6416394/).

### Workflow 2: Disease module detection, then target prioritization

Sources: Menche 2015, DIAMOnD (https://pmc.ncbi.nlm.nih.gov/articles/PMC4390154/), NeDRex, Drugst.One (https://pmc.ncbi.nlm.nih.gov/articles/PMC11223884), Open Targets.

1. **Test whether the seeds form a module.** Compare the largest connected component of the disease genes with random sets of the same size (multiple sclerosis: 11 versus 2 +/- 1, z = 5.8).
2. **Grow the module.** DIAMOnD adds the neighbor whose links to the set are least likely by a hypergeometric test (about 200 iterations); NeDRex offers Steiner trees and BiCoN.
3. **Validate** by GO and pathway enrichment or against 1,000 mock modules.
4. **Look at it.** Seeds and added proteins are drawn with different shapes; published module figures have 20 to 200 nodes (NeDRex use cases: 23 to 87 genes).
5. **Overlay drugs.** NeDRex ranks drugs near the module by TrustRank or closeness to the seeds (235 drugs for an 87-gene IBD module). Drugst.One does this in the browser from a gene list.
6. **Score druggability and safety** in the Open Targets prioritization grid (a table, not a network view).
7. **Decide.** NeDRex warns that empirical p-values "cannot replace the expert user".
8. **Hand off** a ranked target list, a module figure and the parameters (seed list, alpha, iterations, interactome version).

### Workflow 3: Hypothesis ranking in an internal pharma knowledge graph

Sources: Novartis talk (2016, republished 2018) and case study (2025), cited in section 2; AstraZeneca talk (2019, cited above) and BIKG preprint (2021: https://www.biorxiv.org/content/10.1101/2021.10.28.466262v1.full.pdf); Neo4j vendor stories (2026: https://neo4j.com/customer-stories/leading-pharma-company/, https://neo4j.com/?p=410587). None describes the click-level interface.

1. **Load and weight the graph.** Novartis text-mined about 25 million PubMed abstracts plus ten other sources, storing co-occurrence lift (scaled 0 to 1) on each edge as an uncertainty, the inverse of association strength, so it works as a distance.
2. **Triangle search.** Find compound-gene-disease (or -phenotype) triangles, sum the three uncertainties, and "sort the triangles according to this metric" (2025 case study).
3. **Check the evidence.** Open the PubMed articles behind each edge of each top triangle; a biologist reviews the output.
4. **Reachability contrast.** Take screening results and find nodes reachable from active compounds but not from inactive ones, then partition the graph. In one example a cut put 12 of 14 actives on one side and all inactives on the other.
5. **Ablate an evidence type.** Removing text-mined edges left a weaker, more roundabout connection, showing what each source contributes.
6. **Recommendation variant (AstraZeneca).** Graph embeddings answer "nearest gene nodes for a disease node"; rule: "Keep evidence & context for each assertion".
7. **Vendor-reported uses (2026, unaudited).** PageRank over genes and adverse events; BenchSci retrieves a "contextually relevant subgraph" per question with each assertion linked to its source experiment.
8. **Hand off.** A ranked hypothesis list with an evidence trail per edge. Novartis reported that the uncertainty threshold for text-mined edges was still being refined.

### Workflow 4: Omics interpretation in a curated causal network (IPA)

Sources: NIH CCR IPA training slides, 2026 (https://bioinformatics.ccr.cancer.gov/btep/wp-content/uploads/sites/2/ipa_slides_20260408.pdf); Boston University IPA training, 2023 (https://www.bumc.bu.edu/gsi/files/2023/03/BU-IPA-030723.pdf). MetaCore and Pathway Studio follow similar steps under other names.

1. **Upload** a case-versus-control table (IDs, fold change, optional p-value) and map columns to observations.
2. **Run Core Analysis** with a cutoff such as p < 0.05, keeping analysis-ready molecules under about 3,000 (hard cap 8,000).
3. **Read the results tabs** (Graphical Summary, Canonical Pathways, Upstream Analysis, Diseases and Functions, Regulator Effects, Networks). Each entity carries an enrichment p-value and an activation z-score. A z-score of +2 or more means predicted activated (orange), and -2 or less means predicted inhibited (blue). Observed up and down genes are red and green.
4. **Upstream regulators.** A table with predicted state, z-score and overlap p-value (dupilumab-treated atopic dermatitis: IL4 inhibited at z = -6.09); "Targets of X" opens the regulator and its downstream dataset genes as a network.
5. **Causal networks** link master regulators through intermediates to dataset genes.
6. **Build a network.** Build > Path Explorer (Set A, Set B, direction, shortest paths plus one) and Build > Connect or Grow with filters.
7. **Simulate.** Overlay > Molecule Activity Predictor: set a node to inhibited or activated and the network shows predicted downstream changes.
8. **Overlay drugs.** Grow upstream from selected nodes, then overlay labels for known drug targets. The training example ends with "BMS-986004 could be a potential candidate for atopic dermatitis".
9. **Compare.** Comparison Analysis (up to 20 analyses); Analysis Match against "260,000+" curated studies, where an opposite signature suggests repurposing.
10. **Figure and share.** Path Designer formats the network for publication; a shared project gives a link.

Graph properties here: directed, signed edges (each finding says "Direction: directional; Effect: increases/decreases"), two node-state layers (predicted activity and observed expression), and a per-edge PMID.

### Workflow 5: Comorbidity and disease trajectory networks

Sources: Goh et al. 2007 (https://pmc.ncbi.nlm.nih.gov/articles/PMC1885563/), Hidalgo et al. 2009 (https://pmc.ncbi.nlm.nih.gov/articles/PMC2661364), Jensen et al. 2014 (https://pmc.ncbi.nlm.nih.gov/articles/PMC4090719).

**Disease-gene projection (Goh 2007).** A bipartite graph of 1,284 OMIM disorders and 1,777 genes, projected onto disorders sharing a gene; colored by 22 hand-assigned classes, sized by gene count, link width by shared genes.

**Phenotypic disease network (Hidalgo 2009).**
From 32.3 million Medicare claims for 13 million people (ICD-9-CM), compute relative risk and phi per disease pair, one network each; threshold for display (RR > 20, phi > 0.06); color by ICD-9 category, size by prevalence; publish an interactive explorer.

**Temporal trajectories (Jensen 2014).**

1. Take 14.9 years of Danish hospital diagnoses for 6.2 million patients, ICD-10 codes rounded to three characters.
2. Count ordered pairs D1 then D2 within five years (1,194,343 pairs); estimate relative risk against matched comparison groups with Bonferroni-corrected binomial tests (62,821 significant pairs); test direction (4,014 directional pairs).
3. Chain directional pairs into three- and four-step trajectories with at least 20 patients (1,171 trajectories).
4. Cluster diagnoses by Jaccard similarity with MCL (15 clusters).
5. Draw each cluster with time running left to right, nodes as ICD-10 codes colored by ICD-10 chapter, directed edges, and edge width proportional to patient count. No tool is named.

Graph properties: directed and time-ordered; weighted by relative risk, phi or patient count; grouped by ICD chapter. Built from patient data, so only aggregates are shared.

### Workflow 6: Pharmacovigilance co-reporting networks

Sources: Fusaroli et al. 2021 "Adversome" (https://www.frontiersin.org/articles/10.3389/fphar.2021.740707/full), a drug-adverse event bipartite network study from 2022 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8762263/), Decagon (Zitnik et al. 2018: https://academic.oup.com/bioinformatics/article/34/13/i457/5045770).

1. **Extract reports.** Download FAERS quarterly files (not the dashboard) so duplicates can be removed; Fusaroli kept 7,082 COVID-19 reports from 2020.
2. **Group terms.** Map reactions from MedDRA Preferred Terms to their primary High-Level Terms (387 HLTs), and drop non-specific System Organ Classes such as "Investigations".
3. **Disproportionality.** Reporting odds ratio with at least 3 cases and a 95 percent interval above 1 (54 signals); others use PRR, IC and EBGM, or add bipartite network features to the signal score (2022 study).
4. **Build the event-event network.** Nodes are HLTs with at least 10 cases. Edges are partial correlations of co-reporting, pruned by LASSO (an Ising model): 136 nodes and 87 links.
5. **Detect communities** with Louvain (13 clusters). Check assortativity by disproportionality and by organ class.
6. **Review clusters** for clinical plausibility and bias; publish an interactive visNetwork version filterable by significant ROR.
7. **Polypharmacy variant.** Decagon predicts which of 964 side effect types a drug pair causes (645 drugs, 4.65 million drug-drug edges); its only visual is a t-SNE plot.

### Workflow 7: Literature-mined knowledge graphs and LLM question answering

Sources: SemMedDB (https://pmc.ncbi.nlm.nih.gov/articles/PMC3509487), the final NLM release notes (https://lhncbc.nlm.nih.gov/ii/tools/SemRep_SemMedDB_SKR/SemMedDB_download.html), Zhang et al. 2021 COVID-19 literature-based discovery (https://arxiv.org/pdf/2010.09600), Cohen et al. 2015 discovery by analogy (https://pmc.ncbi.nlm.nih.gov/articles/PMC4474167), KG-RAG (Soman et al. 2024).

**7a. Literature-based discovery over SemMedDB.**

1. **Get the graph.** SemRep extracts subject-predicate-object triples between UMLS concepts from PubMed sentences: 130 million predications from 37 million citations in the 2024 final release, after which NLM stopped maintaining the tools. Each predication links to its sentence. Access needs a UMLS license.
2. **Filter for precision.** SemRep precision is about 0.70. Zhang et al. filtered with a PubMedBERT classifier (F1 0.854), leaving 131,355 nodes and 2,558,935 relations.
3. **Run a discovery pattern** in Cypher ("Drug INHIBITS a concept that CAUSES COVID-19, and the drug does not already TREAT it") and rank drugs by the number of intermediate concepts; or learn common pathways from known TREATS relations and apply them to a new disease (Cohen 2015).
4. **Review by hand.** A physician-informatician judged plausibility in the Neo4j Browser ("a human expert is needed to sort out the noise"); of the top 150 predictions, 99 were drug classes too general to use. Cohen et al. found 7,883 reasoning pathways for one drug and called presenting them for review "an open challenge".

**7b. KG-RAG over SPOKE.**
An LLM matches disease names to SPOKE nodes, retrieves their neighborhoods as sentences with provenance, keeps those above the 75th percentile of similarity to the question, and answers from them (97 percent retrieval accuracy versus 75 percent for Cypher generation). No end-user interface is described.

Common need across 7a and 7b: for any edge, list its evidence (sentences, PMIDs, counts) and let the reader accept or reject it; for any generated answer, show the subgraph that was used.

### Workflow 8: Metapath exploration and prediction explanation in public knowledge graphs

Sources: Hetnet connectivity search, Hetionet (https://het.io/), SPOKE explorer docs (https://spoke.rbvi.ucsf.edu/ne_docs.html), Neo4j Browser settings, TxGNN.

- **het.io/search.** Pick source and target; read a metapath table (path count, adjusted p-value against permuted networks); read up to 100 paths per metapath as a draggable subgraph of about 10 to 60 nodes.
- **Cypher in the public Neo4j Browser** (Hetionet: 47,031 nodes, 2.25 million relationships). The browser shows at most 300 nodes at first and expands 100 neighbors per node.
- **SPOKE Neighborhood Explorer.** Set node and edge types, filters and a path length of 1 or 2; a warning appears at 2,000 nodes plus edges; provenance on hover; leaf nodes collapse into groups; Cytoscape JSON or SVG download.
- **TxGNN explainer.** GraphMask gives each edge an importance from 0 to 1. A threshold control makes the displayed paths sparser or denser (edges above 0.5, on average 14.9 percent, keep nearly all accuracy). In a 12-participant study, explanations raised accuracy by 46 percent and confidence by 49 percent.

### Workflow 9: From a GNPS molecular networking job to an annotated Cytoscape figure

Sources: GNPS documentation (https://ccms-ucsd.github.io/GNPSDocumentation/featurebasedmolecularnetworking-cytoscape, https://ccms-ucsd.github.io/GNPSDocumentation/networking, https://ccms-ucsd.github.io/GNPSDocumentation/networkingviews), Harris et al. 2021 (cited above), the GNPS2 apps list (https://apps.gnps2.org/).

1. **Prepare features and metadata.** Export a feature table and an MS2 .mgf file from MZmine, MS-DIAL or similar, plus a tab-separated metadata table whose grouping columns start with "ATTRIBUTE_" (https://gnpsdocs.readthedocs.io/en/latest/networking/).
2. **Set network parameters and run the job.** Defaults: minimum cosine 0.7, at least 6 matched fragment ions, Node TopK 10, maximum component size 100 (0 lifts the cap). These settings are the user's main lever on what the drawing will look like.
3. **Look first in the browser.** "View Spectral Families" draws one family at a time with pie-chart nodes, edge labels by cosine or mass difference (DeltaMZ) and mirror plots.
4. **Download for Cytoscape.** A zip with the .graphml and the library-match .csv, or a ready .cys session with a preset style (GNPS2 builds one with "molecular-family groups, and the GNPS pie-chart style").
5. **Import and join tables.** Import the network, then Import Table from File for library hits, keyed on "name" (SCANS or FEATURE_ID).
6. **Style** (or File > Import > Style From File): label by precursor mass or Compound_Name; size by SumPeakIntensity; Image/Chart 1 > Charts > Pie over the "_GNPSGROUP__" columns; fill by MolNetEnhancer class; edge width by cosine, min and max tuned by hand.
7. **Draw structures.** chemViz2: set the SMILES attribute in Cheminformatics Tools > Settings, then Paint Structures.
8. **Filter and isolate families.** Column filters (ppm error, compound name, sample condition), repeated "First Neighbors of Selected Nodes", then "New Network From Selection". The componentindex column marks families (-1 for singletons); Harris et al. count 810 sub-families in one network.
9. **Compare groups.** Per-condition subnetworks, edge-table statistics outside Cytoscape, and the Venn and Euler Diagrams app for group-unique features.
10. **Handle size.** A user with a 55,000-node network hit Cytoscape's "This could take a long time" prompt and was told to browse families in GNPS instead (https://groups.google.com/g/molecular_networking_bug_reports/c/Gmz4qXuQGiI).
11. **Export** a PDF for the paper and the .cys session for collaborators; the chapter puts the whole analysis at "4h-weeks".

Do newer tools replace Cytoscape? Partly: GNPS2 has a "Molecular Networking Browser" with component browsing, pie charts and mirror plots, but it also maintains the .cys generator, so Cytoscape is still the expected destination. No source measures how many users moved.

### Workflow 10: Chemical space, activity cliff and scaffold networks for SAR

Sources: Scalfani, Patel and Fernandez 2022 open tutorial (https://pmc.ncbi.nlm.nih.gov/articles/PMC9798653/), Hu and Bajorath 2020 on activity cliff networks (https://pmc.ncbi.nlm.nih.gov/articles/PMC7367913), Manelfi et al. 2021 "Molecular Anatomy" (https://pmc.ncbi.nlm.nih.gov/articles/PMC8299179), ScaffoldGraph (https://github.com/UCLCheminformatics/ScaffoldGraph), the DataWarrior manual and chemViz2 docs (cited under Persona H), Scaffold Hunter (https://pmc.ncbi.nlm.nih.gov/articles/PMC5425364).

**10a. Chemical space network (the published tutorial, step by step).**

1. **Pull and curate a series.** ChEMBL, one target (glucocorticoid receptor), human single-protein Ki assays: 459 rows, 404 unique SMILES after averaging duplicates; convert Ki to pKi.
2. **Compute pairwise similarity** for all 81,406 pairs: Tanimoto on RDKit fingerprints (about 3 minutes), or a maximum-common-substructure similarity (about one hour on 14 cores, with a 10-second timeout per pair).
3. **Choose the threshold by target edge density, not by a chemical rule.** Tanimoto 0.68 and MCS 0.635 both give about 10 percent density (393 nodes and 7,739 edges). The authors went denser than the 2 to 5 percent typical in the literature to avoid many small disconnected components. DataWarrior instead sets a per-molecule automatic limit, with a slider for manual control.
4. **Build and lay out.** NetworkX graph with ChEMBL ID and pKi as node attributes; Fruchterman-Reingold spring layout.
5. **Style.** Color nodes by pKi in 1-unit bins from 4 to 11 with a color bar; gray edges, line style by similarity band.
6. **Split into components** and table them, then redraw a component with each node replaced by its RDKit 2D structure image, highlighted in its pKi color and labeled with its ChEMBL ID.
7. **Describe the network.** Clustering coefficient, assortativity and greedy-modularity communities (18), colored as groups.
   The tutorial stops before SAR interpretation. In Cytoscape, chemViz2 builds the same graph: import compounds with no edges, run "Create Similarity Network" with a minimum Tanimoto, then paint structures on nodes or open a structure table.

**10b. Activity cliff reading.**

1. **Define cliffs.** Two compounds tested on the same target form a matched molecular pair (one substituent differs) and differ at least 100-fold in potency (delta pKi >= 2.0).
2. **Draw the cliff network.** Nodes are compounds, edges are cliffs; nodes colored green (highly potent partner), red (weakly potent) or yellow (both roles). Sizes: 426 to 987 cliffs among 1,281 to 1,982 compounds per target; the largest cluster held 493 cliffs.
3. **Reduce it.** Collapse compounds into matched molecular series (analogs sharing a core, differing at one site): factor X went from 915 cliffs to 91 series. Node size is compound count, color the best potency, border width the share of pairs that are cliffs.
4. **Read SAR.** Select a series or a pair of series and open it as an R-group table, the format medicinal chemists use; check that the generated cores make chemical sense.
   DataWarrior's version is not a node-link drawing of cliffs: it places molecules on a 2D similarity map, sizes markers by SALI (|a1 - a2| / (1 - s)) and colors by activity, so large markers are cliffs; a structure view highlights differences from a reference molecule in red and blue.

**10c. Scaffold networks and trees.**

1. **Generate the hierarchy.** ScaffoldGraph reads SMILES or SDF and builds a scaffold network (iterative ring removal), a HierS network or a scaffold tree (one ring removed per level); 150,000 molecules took about 15 minutes on one core. Output is TSV or SDF with scaffold IDs and hierarchy; its viewer is a Cytoscape widget in Jupyter.
2. **Score each scaffold.** Molecular Anatomy gives each framework an enrichment factor (its active fraction divided by the dataset's active fraction). In the HDAC7 screen, 201 actives among 26,092 compounds gave 3,061 connected components.
3. **Draw and navigate (Cytoscape, hierarchical layout).** Molecules on top, colored by activity class; frameworks colored orange to green by enrichment and sized by number of actives; frameworks with enrichment 0 filtered out.
4. **Walk the hierarchy.** From the most enriched basic frameworks, move up to more decorated ones (enrichment 2.1 to 7.8 in the example) to find the feature that matters, then down to the molecules; check inactives, which share some high-enrichment frameworks.
   Scaffold Hunter shows the same hierarchy as a radial tree colored by the mean, minimum or maximum property of each scaffold's molecules.

Graph properties: one node per molecule or substructure, best drawn as a structure image; potency as a continuous color; thresholded similarity edges or a directed scaffold hierarchy; tens to tens of thousands of nodes, read a component or a series at a time.

## 6. Data

| Source                            | What it gives                     | Size and format                                                                         | Identifiers               | Notes                                                                              |
| --------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| Lab interactomes                  | Physical PPIs                     | 13,329-18,508 proteins, 141,150-351,444 edges; TSV                                      | Entrez, UniProt           | Undirected, usually largest component only                                         |
| STRING                            | Functional associations           | Weighted 0-1                                                                            | Ensembl protein           | Usually excluded from proximity work                                               |
| OMIM, DisGeNET, GWAS              | Disease genes                     | Gene lists                                                                              | MIM, UMLS CUI, MeSH       | GWAS p < 5e-8; >= 20 genes                                                         |
| DrugBank, ChEMBL, BindingDB       | Drug targets                      | XML/CSV; DrugBank CC BY-NC (https://go.drugbank.com/downloads)                          | DrugBank, ChEMBL, UniProt | 10 micromolar cutoff common                                                        |
| Open Targets                      | Target-disease evidence           | GraphQL, Parquet                                                                        | Ensembl, EFO              | Scores track data volume                                                           |
| Hetionet, PrimeKG, DRKG, SPOKE    | Integrated knowledge graphs       | 47k-129k nodes (public); SPOKE ~27M, no bulk download                                   | Mixed, "Type::ID"         | Hetionet frozen since 2017                                                         |
| BIKG, Novartis graph (internal)   | Internal plus public              | 10.9M-30M nodes, 118M-400M edges                                                        | Mixed                     | Uncertainty and provenance per edge                                                |
| IPA, MetaCore, Pathway Studio KBs | Curated causal findings           | Proprietary; IPA "14+ million findings"; Pathway Studio over 4.9M relationships         | Vendor IDs plus PMIDs     | Signed, directed; licensed                                                         |
| SemMedDB                          | Literature predications           | 130M predications, MySQL; final release 2024                                            | UMLS CUIs, PMIDs          | Precision about 0.70                                                               |
| FAERS                             | Spontaneous adverse event reports | Quarterly files                                                                         | Drug names, MedDRA terms  | Needs deduplication                                                                |
| Claims and registries             | Diagnoses per patient             | Millions of patients                                                                    | ICD-9/ICD-10              | Access by application; aggregates only                                             |
| ChEMBL, assay databases           | Compounds with potency            | SMILES/SDF plus Ki or IC50; one target gives hundreds to tens of thousands of compounds | ChEMBL IDs, InChIKey      | Similarity edges computed by the user; threshold set for 2-10 percent edge density |
| GNPS, GNPS2                       | Spectral similarity networks      | .graphml + CSV, or .cys; 55k-node networks reported                                     | Feature IDs, SMILES       | Cosine and mass difference per edge                                                |

**Graph properties.** Interactomes, molecular networks and chemical space networks are undirected with one node type; scaffold networks are directed hierarchies; curated causal networks are directed and signed with predicted node states (open-source signed methods are in `systems-biology-omics-networks.md`); knowledge graphs have many node and edge types, multiple edges per pair and provenance per edge; comorbidity, trajectory and pharmacovigilance graphs are weighted by association statistics and grouped by ontologies (ICD chapters, MedDRA, EFO, MONDO, GO).

**Identifier problems.** One gene has many IDs (HGNC, Entrez, Ensembl, UniProt); mixing them creates disconnected duplicate nodes (https://arxiv.org/pdf/2608.08927). Disease identity is hardest: PrimeKG collapsed 22,205 MONDO concepts into 17,080 groups using ClinicalBERT similarity and manual approval. Biomappings exists because public mappings have gaps (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10076045/).

**Sensitivity.** DrugBank is non-commercial; SPOKE refuses bulk redistribution; SemMedDB needs a UMLS license; vendor knowledge bases are licensed; pharma graphs hold confidential screening data; claims and registry data are patient data that cannot leave a secure environment.

## 7. Analysis methods

| Method                                                               | Used for                           | Settings                                               | Validation                      |
| -------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------ | ------------------------------- |
| Largest component significance                                       | Is there a disease module?         | Random equal-size sets                                 | z > ~1.6                        |
| Closest-distance proximity                                           | Drug-disease closeness             | 1,000 degree-binned random sets                        | z <= -2 (Guney)                 |
| Separation                                                           | Drug-drug, disease-disease overlap | Between minus within distance                          | < 0 overlapping                 |
| DIAMOnD, Steiner trees, random walk                                  | Module expansion                   | alpha ~10; ~200 iterations                             | Enrichment plateau              |
| Triangle and path ranking by summed uncertainty                      | Hypotheses in pharma KGs           | Uncertainty = inverse lift                             | PubMed evidence review          |
| Reachability contrast                                                | Active versus inactive compounds   | Graph cut                                              | Partition purity (12 of 14)     |
| Upstream regulator z-score                                           | Omics interpretation               | z of +2 or more, or -2 or less; overlap p              | Literature direction match      |
| Relative risk, phi, binomial direction tests                         | Comorbidity and trajectories       | Bonferroni; >= 20 patients                             | Replication cohort              |
| ROR, PRR, IC, EBGM; Ising/LASSO; Louvain                             | Pharmacovigilance                  | CI above 1; >= 3 cases                                 | Clinical plausibility           |
| DWPC metapaths; KG embeddings; GNNs                                  | Public KG search and prediction    | Permuted nulls; zero-shot splits                       | AUROC, Hits@k                   |
| GraphMask; KG-RAG context pruning                                    | Explanations                       | Threshold 0.5; 75th percentile                         | User study; question accuracy   |
| Spectral cosine networking                                           | Molecular families                 | Cosine 0.7, 6 ions, TopK 10, component cap 100         | Library matches, mirror plots   |
| Tanimoto or MCS similarity networks; MMP cliffs; scaffold enrichment | Compound SAR                       | Tanimoto ~0.68 for ~10 percent density; delta pKi >= 2 | R-group tables, inactives check |

Validation habits: always against random expectation, known indications or a replication cohort, with expert plausibility review as the last step.

## 8. Outputs and collaboration

- **Papers.** Module subnetworks, drug-to-module shortest paths, bipartite drug-disease networks, left-to-right trajectory diagrams, adverse reaction clusters, IPA mechanism figures, compound networks with structure nodes; supplementary tables and a GitHub repository.
- **Interactive companions.** het.io/search, txgnn.org, the SPOKE explorer, Drugst.One, a visNetwork in Fusaroli's repository: each lab builds its own viewer.
- **Pharma.** Target dossiers, recommendation lists with evidence, IPA project links.
- **Chemistry.** .cys sessions and GNPS job links (Workflow 9); R-group tables handed to the project team (Workflow 10).
- **Reproducibility.** Interactome version, seed list, ID mapping, null model, randomizations, thresholds and random seed must travel with the result. For IPA, the knowledge-base version and license are needed to reproduce it.
- **Exchange formats.** TSV/CSV edge lists, Neo4j dumps, cytoscape.js JSON, GraphML, Cytoscape sessions and NDEx, RDF.

## 9. Tools landscape and pain points

| Tool                                                          | Used for                                                | Loved                                                  | Fails them                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Python/R scripts (NetworkX, NetMedPy, igraph, SAveRUNNER)     | Proximity, modules, nulls, comorbidity stats            | Control, reproducibility                               | No figure step; subnetworks are drawn with hand-written plot code             |
| Cytoscape (stringApp, NeDRexApp, CyTargetLinker)              | Quick networks, figures                                 | GUI, apps, styling                                     | One network at a time; slow search; "hairball" on big graphs                  |
| QIAGEN IPA                                                    | Omics interpretation, causal networks, drug overlay     | Curated directional findings, z-scores, MAP simulation | Closed licensed KB; 8,000-molecule input cap; reproducibility tied to license |
| Clarivate MetaCore, Elsevier Pathway Studio                   | Network algorithms, sub-network enrichment              | Large curated or text-mined causal networks            | Licensed; libraries cancel for cost                                           |
| Open Targets                                                  | Target evidence grid                                    | Integrated evidence, API                               | Not a network view                                                            |
| Neo4j Browser / Bloom                                         | KG querying                                             | Cypher, expansion                                      | 300-node display cap; Cypher barrier                                          |
| het.io, SPOKE explorer, TxGNN                                 | Metapaths, neighborhoods, explanations                  | Statistics plus paths, provenance, thresholds          | Each tied to one graph or model                                               |
| R visNetwork / qgraph                                         | Pharmacovigilance networks                              | Interactive HTML                                       | Hand-built per study                                                          |
| GNPS in-browser views, GNPS2 apps                             | First look at molecular families                        | No install; pie charts, mirror plots                   | One component at a time                                                       |
| Cytoscape with chemViz2, MolNetEnhancer                       | Molecular network figures; compound similarity networks | Pie charts, structures, class colors                   | Style rebuilt per job; slow search; whole networks too large to open          |
| DataWarrior, Scaffold Hunter, ScaffoldGraph, RDKit + NetworkX | SAR maps, cliffs, scaffold trees                        | Free; structure-aware; R-group tables                  | Static plots in notebooks; dense cliff clusters unreadable                    |

Recurring pain points:

1. Whole-graph views are useless; every tool caps what is drawn (SPOKE 2,000; Neo4j 300; het.io 100 paths per metapath; GNPS one component).
2. Analysis and visualization are split. Scripts end in DataFrames, and figures are hand-coded or rebuilt in Gephi or Cytoscape (Workflow 1, step 9).
3. Every edge needs its evidence, and reviewing evidence is manual (Novartis PubMed checks; SemRep precision 0.70; "an open challenge" in Cohen 2015).
4. Path explanations are too long without importance thresholds; results depend on method choices, so users compare several.
5. Identifier mapping silently drops nodes; licensing blocks sharing (DrugBank, SPOKE, UMLS, IPA, MetaCore); patient-derived graphs leave the secure environment only as aggregates.
6. Restyling every new job by hand (Workflow 9); structure-image nodes that stop being readable past a few dozen compounds (Workflow 10).

## 10. Requirements implied

These users already compute statistics in scripts and vendor tools; what they lack is a way to load, see and check results, so kind (a) ranks above kind (b).

**(a) Import, visualize and check results computed elsewhere**

| #   | Capability                                                                                                                                                                                                                                                  | Priority | Covered by existing Graphty records?                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| R1  | Import node sets, per-node scores and path sets from TSV/CSV onto a large base graph, with gene ID mapping and a report of unmapped IDs                                                                                                                     | Must     | Partly (W20 imports gene lists; no node-set concept, no unmapped report) |
| R2  | Draw only a node set plus the shortest paths between two sets, cut from a 15k-350k edge graph, with the rest hidden or faint                                                                                                                                | Must     | Partly (filtering, ego-network)                                          |
| R3  | Per-edge evidence list (PMIDs, sentences, source, confidence) on selection, with accept and reject marks                                                                                                                                                    | Must     | No                                                                       |
| R4  | Rank triangles and paths between typed node sets by summed or combined edge weight, with a path list that selects into the drawing                                                                                                                          | Must     | No (all-paths-finding without ranking by edge weight)                    |
| R5  | Signed, directed edges (arrow and bar ends) and two node-state layers: predicted activity and observed value                                                                                                                                                | Must     | No                                                                       |
| R6  | Typed nodes and edges, multiple edges per pair, filter by type and attribute before expanding, and a toggle to switch an evidence source off and compare                                                                                                    | Must     | Partly                                                                   |
| R7  | Edge-importance or weight threshold slider that sparsifies a subgraph live                                                                                                                                                                                  | Must     | No                                                                       |
| R8  | Show the subgraph that answered an LLM question or a model prediction, with its provenance                                                                                                                                                                  | Should   | No                                                                       |
| R9  | Left-to-right layered layout for trajectories and causal chains; bipartite and tripartite layouts                                                                                                                                                           | Should   | Partly (layout-hierarchical)                                             |
| R10 | Group and color by ontology level (ICD chapter, MedDRA SOC or HLT, GO), with collapse into groups                                                                                                                                                           | Should   | Partly (grouping)                                                        |
| R11 | Mechanism-figure editing: pin positions, hand layout, drug overlay labels, legend, SVG export                                                                                                                                                               | Should   | Partly (export-image)                                                    |
| R12 | Edge weights from statistical association measures (relative risk, phi, ROR) with thresholds                                                                                                                                                                | Should   | Partly                                                                   |
| R13 | Contrast reachability from two node sets (active versus inactive compounds)                                                                                                                                                                                 | Should   | No                                                                       |
| R14 | Run log of parameters that travels with figures; export cytoscape.js JSON, GraphML, CSV with set membership and scores                                                                                                                                      | Should   | Partly (W25, data-export)                                                |
| R15 | Aggregate-only export guard for patient-derived graphs (no node below a minimum patient count)                                                                                                                                                              | Could    | No                                                                       |
| R16 | Molecular-network styling (Workflow 9): GNPS GraphML or .cys import, pie-chart nodes from group columns, edge width by cosine and labels by mass difference, a saved style reapplied per job, component browsing                                            | Should   | No                                                                       |
| R17 | Molecule nodes (Workflows 9, 10): 2D structures from SMILES as node glyphs that fall back to dots when zoomed out, potency color scales, a similarity threshold slider that reports edge density, scaffold hierarchy layout, selected series out to a table | Could    | No                                                                       |

**(b) Run the statistics in the product**

| #   | Capability                                                              | Priority | Evidence                                                                                       |
| --- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| R18 | Set-to-set distance with a degree-matched null model, returning z and p | Could    | Users already run NetMedPy, SAveRUNNER or their own scripts; no source asks for it in a viewer |
| R19 | Largest component significance of a node set against random sets        | Could    | Same; cheap to compute and helps a reader check a module on screen                             |
| R20 | Seed-based module expansion (DIAMOnD-style, random walk with restart)   | Could    | Drugst.One and NeDRex show demand for in-browser runs by non-coders                            |

**What W08 should become.** Rename it "Network proximity drug repurposing screen". It starts from an interactome, a disease gene set and drug-target lists with proximity already computed. Its required capabilities are R1, R2, R7, R9 and R14, with R18-R20 optional. Its output is a figure of the top drugs' targets, the module and the shortest paths between them. Name the real sources (OMIM, GWAS Catalog, DisGeNET, DrugBank, ChEMBL, Open Targets).

**New workflows to add.** Internal knowledge graph hypothesis ranking (Workflow 3), omics interpretation with a causal network (Workflow 4), comorbidity and trajectory networks (Workflow 5), pharmacovigilance networks (Workflow 6), literature evidence and KG-RAG review (Workflow 7), metapath search and prediction explanation (Workflow 8), molecular network annotation (Workflow 9), compound SAR networks (Workflow 10).

**Scope of chemists.** The molecular networking chemist is "in scope, secondary" (GNPS usage does not support "small"; R16 Should). The medicinal chemistry SAR analyst is in scope as a minor population: Graphty would need molecule glyphs and potency color scales (R17 Could), not a new product, and DataWarrior, Scaffold Hunter and Cytoscape with chemViz2 are the competitors.

**New personas.** Pharma target and knowledge graph scientist (B), omics mechanism interpreter (E), knowledge graph ML scientist (C), clinical comorbidity researcher (F), pharmacovigilance analyst (G), molecular networking chemist (D), medicinal chemistry SAR analyst (H, in scope as a minor population: the requirements are rendering features, not a new product). The `knowledge-engineer` and `ml-engineer-recsys` personas touch knowledge graphs, but not evidence review, signed causal networks or clinical explanation.

## 11. Sources

Most sources are cited inline. Others used, not cited above:

- https://pmc.ncbi.nlm.nih.gov/articles/PMC9940622/ -- SPOKE.
- https://neo4j.com/docs/browser-manual/current/operations/browser-settings/ -- Neo4j Browser limits.
- https://www.nigms.nih.gov/node/120596 -- Cytoscape "hairball".
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7169983 -- HuRI.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6677722 -- GPSnet.
- https://github.com/mikeyliow/PrimeKG -- PrimeKG version mismatch.
