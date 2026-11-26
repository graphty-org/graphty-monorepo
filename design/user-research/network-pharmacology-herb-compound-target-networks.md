# Network Pharmacology Researchers: Herb-Compound-Target-Disease Networks

This is the single research document for this population. It replaces an earlier parallel draft
(network-pharmacology-and-herbal-mechanism-networks.md), whose best material is merged here.

## 1. Summary

Network pharmacology researchers try to explain how a herbal medicine, a multi-herb formula or a natural product
works by linking herbs, the compounds in them, the human proteins those compounds act on (mostly by prediction), and
the genes associated with a disease. Most work in traditional Chinese medicine (TCM) universities and hospitals in
China, with growing shares in India, Pakistan, Korea, the Middle East and Africa.

The typical paper follows a near-fixed recipe: pull a formula's compounds from a herb database, filter them by
predicted oral bioavailability and drug-likeness, predict targets, collect disease genes, intersect the two lists,
build a STRING protein interaction network of the overlap, rank hub genes in Cytoscape, run GO and KEGG enrichment,
draw a layered herb-compound-target-pathway-disease network, dock the top compound into the top protein, and (in
better papers) confirm the result in cells or animals. A large and growing share replaces the database compound list
with measured chemistry (LC-MS of the decoction or of dosed-animal serum) and the disease list with measured genes
(GEO expression data, Mendelian randomization), so their nodes carry numeric measured columns. Smaller groups use the
same machinery differently: clinicians mine prescriptions into weighted herb co-occurrence networks, microbiome
studies build taxon-metabolite correlation networks, manufacturers pick "quality marker" compounds, and database
teams serve in-browser network views over millions of predicted edges (the sub-population that would embed a graph
web component).

The same pipeline has a second, faster-growing branch that swaps the herb for a pollutant. Papers calling themselves
network toxicology take a plastics additive, a bisphenol, a pesticide or a PFAS compound as the root node, pull its
targets from the Comparative Toxicogenomics Database or a prediction server, intersect them with disease genes, and
then run the identical STRING, cytoHubba, GO and KEGG, docking and molecular dynamics sequence. PubMed records naming
"network toxicology" went from 12 in 2023 to 54 in 2024, 497 in 2025 and 1,021 in the first eleven months of 2026
(section 2.1); 348 of the 1,503 come from Chinese-medicine institutions, the same labs as the herbal work. For a graph
product this is one population with two root node types, not two populations.

The field is large (3,357 PubMed records naming "network pharmacology" in 2024, 5,172 in 2025) and heavily
criticized: in a census of studies from October 2023 to June 2024, quercetin was a key compound in 63.2% (294 of 465
studies reporting compounds) and AKT1 a key target in 48.8% (429 of 880)
(https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2026.1748478/full). For a graph product the
consequences are a typed multipartite graph with a tiered figure, set operations as analysis steps, and provenance
and evidence class on every node and edge as a must, because that is the field's documented weakness.

## 2. Population

### 2.1 Size and growth

PubMed E-utilities, query `"network pharmacology"[tiab]` by publication year, run 2026-11-25
(https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi); 19,410 records in total:

| Year    | 2010 | 2015 | 2018 | 2020 | 2021  | 2022  | 2023  | 2024  | 2025  |
| ------- | ---- | ---- | ---- | ---- | ----- | ----- | ----- | ----- | ----- |
| Records | 9    | 44   | 167  | 719  | 1,288 | 2,071 | 2,336 | 3,357 | 5,172 |

For 2024: 2,958 of 3,357 records (88%) list a China affiliation, 184 India, 45 Korea; 1,877 (56%) also name
"molecular docking"; 434 name Cytoscape in the abstract (methods name it far more often). 72 records carry the PubMed
"retracted publication" type. The reproducible full-text census is Diao et al.: Web of Science Core Collection,
`TS=("network pharmacology")`, open-access original research published 1 October 2023 to 30 June 2024, searched 13
December 2024; 1,301 found, 1,038 included, of which 465 reported key compounds, 880 key targets and 917 pathways
(fphar.2026.1748478). The persona index's citation census found works citing Cytoscape that name network
pharmacology rose from 35 (2015-2017) to 1,215 (2022-2024), 871 with an author in China and 793 also naming docking
(population-to-designloom-persona-index.md, section 2.1). Cytoscape logged 20,610,746 starts from 9 February 2014 to
25 February 2025, about 5,100 a day, across all its users (https://cytoscape.org/stat.html). An earlier census found
1,634 of 1,905 Web of Science TCM network pharmacology articles from China, led by Beijing University of Chinese
Medicine and the China Academy of Chinese Medical Sciences (https://pmc.ncbi.nlm.nih.gov/articles/PMC9217600); a 2025
review of 36 herbal studies found 55.6% from China and 25.0% from India (https://f1000research.com/articles/14-1384).

**How the work is split (PubMed, `"network pharmacology"[tiab] AND` the second term, all years, run 2026-11-25).**
Overlapping, but measured-data integration is clearly not a fringe:

| Second term                                     | Records                     |
| ----------------------------------------------- | --------------------------- |
| `"molecular docking"[tiab]`                     | 10,679                      |
| LC-MS, UPLC, UHPLC or "serum pharmacochemistry" | 3,202                       |
| metabolomic*                                    | 1,818                       |
| transcriptomic* or RNA-seq                      | 1,704                       |
| "gut microbiota" or 16S                         | 782 (287 also metabolomic*) |
| proteomic*                                      | 462                         |
| "single-cell" or "single cell"                  | 422                         |
| "quality marker(s)" or Q-marker*                | 211                         |
| "Mendelian randomization"                       | 206                         |

**Network toxicology: the same pipeline on a pollutant.** PubMed E-utilities, query `"network toxicology"[tiab]` by
publication year, run 2026-11-25 (same endpoint); 1,503 records in total, of which 1,448 carry a China affiliation and
13 an India affiliation:

| Year    | 2015 | 2018 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 (to 25 Nov) |
| ------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---------------- |
| Records | 1    | 1    | 2    | 5    | 12   | 12   | 54   | 497  | 1,021            |

That is a steeper curve than network pharmacology's at the same stage, and it is the same community: 348 of the 1,503
records (225 of the 1,021 in 2026) have an author at an institution whose name contains "Chinese Medicine" or
"Traditional Chinese", and only 62 name network pharmacology in the title or abstract, so the two literatures are
counted separately although the method is one. The journals are environmental and toxicological rather than
ethnopharmacological: in the 600 most recent records, Ecotoxicology and Environmental Safety 71, Frontiers in
Pharmacology 26, Chemico-Biological Interactions 24, Food and Chemical Toxicology 24, Environmental Pollution 20. Some
of the "Pollution" share in the persona index's citation census (section 2.1 of
population-to-designloom-persona-index.md) is this literature rather than microbial ecology.

What the root node is (PubMed, `"network toxicology"[tiab] AND` the second term, run 2026-11-25): phthalates, DEHP or
DBP 176; bisphenols 137; perfluorinated compounds or PFAS 117; cadmium, arsenic, lead or mercury 77; pesticides,
herbicides or glyphosate 67; smoking or nicotine 53; microplastics or nanoplastics 50. A separate 216 name
hepatotoxicity, nephrotoxicity or cardiotoxicity, so a drug's adverse effect is also a root; 412 name a cancer as the
disease. The method terms are those of Workflow A and Workflow C: molecular docking 1,178, molecular dynamics 384,
machine learning, LASSO or random forest 450, single-cell 233, GEO, TCGA or "differentially expressed" 313, Mendelian
randomization 143, WGCNA 67, and 447 name in vitro work (cell viability, western blot or qPCR). Cytoscape appears in
195 abstracts and STRING in 186.

The sources differ, and not as expected: target servers (SwissTargetPrediction, SuperPred or STITCH) are named in 235
abstracts, disease-gene resources (GeneCards, OMIM, DisGeNET) in 252, the Comparative Toxicogenomics Database in 131
and the toxicity predictors ProTox or ADMETlab in 84, but ToxCast or Tox21, the United States assay screens, in only 2.
The field predicts a pollutant's targets rather than reading them from a measured assay set. The Comparative
Toxicogenomics Database, the one source with no equivalent in the herbal pipeline, holds over 94 million toxicogenomic
connections, of which 3.8 million are manually curated from more than 149,000 articles over 17,700 chemicals, 55,400
genes, 7,200 diseases and 214,000 exposures (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11701581/). The recipe is
now taught the way the herbal one is: a video protocol for benzo[a]pyrene and rheumatoid arthritis names STRING v12,
Cytoscape 3.10.1, cytoHubba's degree algorithm and the R venn package, and screens five core genes (LCK, ZAP70, ITK,
GZMA, ITGAL) before validating them with machine learning (https://www.jove.com/v/70636, dated 26 May 2026).

Prescription mining, counted separately: 306 records name "data mining" with "Chinese medicine" and prescription or
formula; 314 name Apriori or association rules with Chinese medicine or TCM; 38 name SPSS Modeler with Chinese
medicine or TCM. The Chinese-language literature is larger and was not counted.

**Journals (PubMed 2024).** Journal of Ethnopharmacology 471, Phytomedicine 182, Heliyon 151, Frontiers in
Pharmacology 120, Medicine (Baltimore) 97. Evidence-Based Complementary and Alternative Medicine (Hindawi) was a major
venue until a 2023-2024 retraction series for "systematic manipulation of the publication and peer-review process"
(https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10732954/, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10412377/).

### 2.2 Who they are

**Academic pipeline users (the bulk).** Master's and PhD students in TCM, pharmacy and integrated medicine; TCM
hospital physicians who must publish for promotion; TCM pharmacology lecturers and PIs; pharmacognosy faculty in
India, Pakistan, Egypt, Nigeria and Ethiopia. Taught through paid workshops (one 2022 two-day course, 3,000 RMB,
included "building the network diagram in Cytoscape": https://www.pharnexcloud.com/meeting/6618.html), Chinese
tutorials and WeChat posts. Freelancers sell "network pharmacology plus docking" for USD 50-100 with 3-12 day
delivery (https://fiverr.com/qasimghauri/perform-network-pharmacology-and-bioinformatics-analysis-for-your-project),
so the work is routinized enough to outsource. No English job posting naming network pharmacology with TCM was found;
adjacent postings ask for Cytoscape, R or Python, STRING and KEGG (https://careers.iscb.org/jobs/view/8773).

**Database and platform developers.** Small groups who build the resources everyone queries and ship a network
viewer inside them: BATMAN-TCM, ETCM, HERB, SymMap, TCMNPAS, IMPPAT, TM-MC, plus methods groups such as Shao Li's at
Tsinghua (which chairs the World Federation of Chinese Medicine Societies (WFCMS) network pharmacology committee).

**Industry and standards (quality control).** Manufacturers and standards groups selecting quality markers
(Q-markers), the compounds a standard will assay. A 2025 review of 60 Q-marker studies found network pharmacology in
all 22 "mechanism-driven validation" studies and 7 of 8 "in silico preliminary filtering" studies, but not in the 24
profile-effect correlation studies (https://pmc.ncbi.nlm.nih.gov/articles/PMC12855425/). No source was found that
China's regulator requires Q-markers for registration.

**Clinician prescription miners.** Hospital physicians and informatics staff mining records or classical texts for
the core herbs a senior physician uses; often the first half of a paper whose second half is Workflow A.

### 2.3 Skill, cadence, team, access

Academic users work intensively for two to six weeks per paper and then stop; a student produces two or three papers
in a degree, each with four to six networks. Platform developers and QC teams work continuously. Domain skill is
strong, graph literacy low: degree is understood, betweenness and closeness are used because the protocol says so, and
the difference between a bipartite and a one-mode network is rarely drawn although every study builds both. Coding is
mostly none (web forms plus Excel plus Cytoscape); a rising minority uses R (clusterProfiler, igraph, the TCMNP and
TCMDATA packages: https://cmjournal.biomedcentral.com/counter/pdf/10.1186/s13020-024-00924-y.pdf,
https://yulab-smu.top/TCMDATA/network-construction.html), and a 2025 post shows students handing the R to an AI
assistant (https://cloud.tencent.com/developer/article/2547429). Foreign sites are "sometimes inaccessible" from China
and Chinese-hosted ones from outside; TCMSP has moved addresses; tutorials advise saving data with the access date
(https://cloud.tencent.com/developer/article/1666096). A PI picks formula and disease; a student runs the pipeline; an
analytical core runs LC-MS; a lab validates; reviewers increasingly demand experiments (section 3.4).

### 2.4 Adjacent populations this is not

Systems biology researchers (systems-biology-omics-networks.md) start from a measured gene list with one node type;
this population starts from a herb name and builds a multipartite graph whose layered figure is the result. The
boundary is not "predicted versus measured": the database-only pipeline (Workflow A) is one form, but the
exposure- and omics-integrated form (Workflow C) carries measured columns (fold change, adjusted p, serum detection,
model AUC, Mendelian randomization odds ratios), and Diao et al. recommend it because AKT1 falls from 54.9% (398/725)
of database-only studies to 19.6% (30/153) of omics-integrated ones (fphar.2026.1748478).

Network toxicology is also not an adjacent population: it is this one with a different root node, and section 3.6
records it as a persona variant. The test is whether a user would need different software, and it would not. A
chronic-urticaria study of the plasticizer dioctyl terephthalate, by authors at Chengdu University of Traditional
Chinese Medicine, took the structure from PubChem, predicted targets with SwissTargetPrediction and SuperPred,
standardized them in UniProt, built the protein interaction network in STRING and Cytoscape, screened 38 targets down
to six (EGFR, BCL2, NFKB1, CASP3, ERBB2, mTOR), ran GO and KEGG, docked in AutoDock and finished with Gromacs
molecular dynamics (Ecotoxicology and Environmental Safety 2025;291:117864, https://pubmed.ncbi.nlm.nih.gov/39923559/).
Every step but the first appears verbatim in Workflow A. What changes is the root node type (an exposure, not a
formula and its herbs), the tier above it (there is no herb or plant-part tier, so the figure is four tiers rather than
five), one source (the Comparative Toxicogenomics Database, queried by CAS number) and one extra node attribute
(predicted toxicity endpoints from ProTox or ADMETlab). The population is a variant of the network pharmacology
personas, not of the omics interpreter in systems-biology-omics-networks.md: the omics interpreter starts from measured
genes in a single-type network, while this one starts from a chemical name and ends in a typed, tiered figure, and a
quarter of the papers come from the same Chinese-medicine institutions.

## 3. Personas

### 3.1 TCM network pharmacology graduate student (`network-pharmacology-graduate-student`)

- **Who.** Lin, second-year master's student at a university of Chinese medicine; must publish one SCI paper. Her
  supervisor hands her a four-herb hospital formula and a disease. She copies a prior paper's methods, cutoffs
  included.
- **Tools.** TCMSP and HERB, SwissTargetPrediction, PubChem, UniProt ID mapping, GeneCards, OMIM, DisGeNET, Venny
  2.1, STRING, Cytoscape 3.9 or 3.10 with cytoHubba and MCODE, DAVID or Metascape, AutoDock Vina with PyMOL, Excel
  throughout, Illustrator or PowerPoint for assembly.
- **Data.** 4 herbs, 300-600 raw compounds, 40-150 after filtering, 150-700 predicted targets, 1,000-11,000 disease
  genes, 100-200 intersected targets, a STRING network of 100-200 nodes and 500-3,000 edges.
- **Goals.** The standard figure set (section 8) and a methods section reviewers accept.
- **Frustrations (evidenced).** Protein names must become gene symbols before anything joins, and failures drop
  silently; assembling the herb-compound-target table across databases is the longest step ("Integrating results from
  multiple databases can be time-consuming and demanding": https://pmc.ncbi.nlm.nih.gov/articles/PMC10958928);
  Cytoscape's force layout scatters the node types, so she drags them into tiers and fixes labels in Illustrator
  (https://www.biostars.org/p/460186) and cannot regenerate the figure; her counts drift between reruns (section 7.3).
- **Grounding.** Lotus leaf (https://pmc.ncbi.nlm.nih.gov/articles/PMC8566053), Pulsatilla decoction
  (https://www.frontiersin.org/journals/oncology/articles/10.3389/fonc.2023.1174848/full), two-herb pair
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC7838196).

### 3.2 Herbal formula mechanism lead (`herbal-formula-mechanism-lead`)

- **Who.** Professor Zhao, PI of a TCM pharmacology lab and attending physician; supervises eight students; reviews for
  two journals; has had a computational-only manuscript rejected.
- **Insists on.** "Precision network pharmacology": LC-MS of the decoction and of dosed-animal serum before prediction
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC11725223); GEO or own RNA-seq instead of GeneCards; docking into a known
  site; one validated target.
- **Tools.** Everything the student uses, plus UPLC-Q-TOF-MS peak lists, R (limma, WGCNA, glmnet), and TCMNPAS (R/Shiny:
  constituent lookup, enrichment, network proximity over HIPPIE, batch docking, prescription mining, network views:
  PMC10958928).
- **Goals.** A mechanism specific to his formula; papers that survive Journal of Ethnopharmacology review; an analysis
  his lab can rerun when a database updates or the compound list is replaced by serum data.
- **Frustrations.** Students' networks converge on quercetin, AKT1, TNF and AGE-RAGE regardless of formula (section
  7.3); a figure does not show which nodes were measured; a former student's network cannot be reproduced because
  nobody recorded the database version; he cannot show a reviewer that a high-degree target is not merely well
  studied.

### 3.3 Natural products researcher outside China (`phytochemistry-network-pharmacology-researcher`)

- **Who.** Dr. Ahmed, pharmacognosy lecturer in Pakistan, or Dr. Nair at an Indian pharmacy college working on
  Ayurvedic polyherbals; studies plants TCMSP does not cover.
- **Data.** Compounds from his own GC-MS or LC-MS, IMPPAT, Dr. Duke's database and the literature: 10-400 compounds
  from three sources with no shared key; 100-600 predicted targets; docking against 5-10 proteins, often with 100 ns
  molecular dynamics (https://pmc.ncbi.nlm.nih.gov/articles/PMC11615512); an IMPPAT-based example used BindingDB and
  Cytoscape 3.7.2 (https://eprints.nirt.res.in/2165/1/202461.pdf). IMPPAT 2.0 holds 4,010 Indian plants, 17,967
  phytochemicals and 1,095 therapeutic uses recorded per plant part (189,386 plant-part-phytochemical associations),
  with 1,328 plants used in Ayurveda and 1,151 in Siddha, and a 1,335-compound drug-like subset that stands in for
  the TCMSP oral bioavailability filter (https://pmc.ncbi.nlm.nih.gov/articles/PMC9996785); the site now shows IMPPAT
  3.0 with 4,154 plants, 18,314 phytochemicals and 1,576 traditional formulations (https://cb.imsc.res.in/imppat/,
  read 2026-11-25). So the herb tier splits by plant part (root, leaf, bark).
- **Tools.** SwissADME and SwissTargetPrediction, GeneCards, STRING, Cytoscape, ShinyGO or DAVID, PyRx or Vina;
  sometimes outsources the pipeline.
- **Goals.** A publishable mechanism for a little-studied plant; a cheap substitute for wet-lab screening; Latin
  binomials and plant parts in every figure, which journals require.
- **Frustrations.** Free tools only; no Cytoscape training; reviewers reject in-silico-only work. In the 36-study
  review 22.2% (8/36) had in vitro and 16.7% (6/36) in vivo work, and it reports purely in silico work as both 61.1%
  and 58.33% (f1000research 14-1384).
- **Northeast Asian variant.** Korean, Japanese (Kampo) and Chinese pharmacopoeial materials have TM-MC 2.0 (Korea
  Institute of Oriental Medicine, tm-mc.kr): 635 materials, 34,107 compounds (21,306 identified and de-duplicated),
  13,992 targets, 27,997 diseases and 5,075 prescriptions (2,393 unique by name) with materials, processing and doses.
  Targets come from STITCH 5.0 matched on the first 14 InChIKey characters "because STITCH does not distinguish
  between different stereoisomers"; diseases from DisGeNET via STRING aliases
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10790428/). Its prescription table links this strand to Workflow F.

### 3.4 Ethnopharmacology reviewer or editor (`ethnopharmacology-reviewer`)

- **Who.** A reviewer or section editor at an ethnopharmacology journal reading dozens of these manuscripts a year.
- **Rules they apply.** Frontiers in Pharmacology's "Four Pillars of Best Practice" for its Ethnopharmacology section,
  which also apply to plant-extract manuscripts elsewhere in the journal and require compliance with a 2019 consensus
  of seven journals' editors (https://www.frontiersin.org/files/pdf/4_pillars_FULL_TEXT.pdf): docking studies "will
  not be accepted unless followed by benchwork confirming affinity"; network analysis "must be conducted in
  combination with experimental pharmacology (in vitro or in vivo) or must be based on a sound body of experimental
  pharmacology that is referenced in the article"; "Network studies on complex extracts are generally not
  considered"; "The network must be represented in such a way that the underlying mechanism can be understood
  including a suitable visualisation of the network and the individual data points"; compound information "may be
  derived preferably from benchwork or else from the existing literature", with quantities stated
  (https://www.frontiersin.org/research-topics/16577). Also the 2021 WFCMS "Network Pharmacology Evaluation Method
  Guidance", scoring reliability, standardization and rationality of data collection, network analysis and validation
  (https://www.tiprpress.com/zcy/article/abstract/20211401, https://pmc.ncbi.nlm.nih.gov/articles/PMC9508683); its
  text is in Chinese and no English translation was found.
- **Why the role is growing.** Retractions such as the Simiao Pill hyperuricemia paper (BioMed Research International,
  notice 9 January 2024) cite "systematic manipulation of the publication process", including discrepancies in the
  research described, inappropriate citations and manipulated peer review
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10791413/); the recipe's uniformity makes such papers cheap.
- **Acceptance tests for the audit requirements.** Re-derive every count in the methods from recorded inputs (R9);
  see which threshold removed which nodes (R9); exclude predicted edges and see what survives (R4); see whether the
  hub list survives another STRING or degree cutoff (R8); see which compounds were measured rather than listed (R12);
  see the individual data points behind an edge. Section 7.3's examples are the failures these tests catch.

### 3.5 TCM database and platform developer (`tcm-database-platform-developer`)

- **Who.** A bioinformatics engineer maintaining a herb-ingredient-target resource published as a website with a
  network view, updated each release.
- **Prior art they ship.** BATMAN-TCM 2.0 (8,404 herbs, 39,171 ingredients, 54,832 formulae, 17,068 known and
  2,319,272 predicted ingredient-target interactions) serves herb-, ingredient- and pathway-centric network views where
  "the width of edges for predicted TTIs is positively proportional to TTI confidence", top 20 predicted targets per
  compound, bulk download and a JSON API (https://pmc.ncbi.nlm.nih.gov/articles/PMC10767940). ETCM v2.0 ships "an
  enhanced JavaScript-based network visualization tool for creating, modifying, and exploring multi-scale biological
  networks", with editing, layout control, filtering and SVG or JPG export
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10326295). Drugst.One, an embeddable protein-drug-disease explorer, went
  into 21 tools with "as little as three lines of code", with expansion, seven drug ranking algorithms and GraphML
  export (https://pmc.ncbi.nlm.nih.gov/articles/PMC10274948). Cytoscape Web exchanges networks with desktop Cytoscape
  and NDEx through CX2 (https://idekerlab.ucsd.edu/wp-content/uploads/2025/05/Ono-NucleicAcidsRes-2025.pdf).
- **Data.** Millions of edges server-side; a query returns a subgraph, and hundreds to low thousands of nodes are drawn.
- **Goals.** A viewer that drops into the site, renders the subgraph with confidence-weighted edges, expands from a
  clicked node, links out, and exports to formats researchers carry into Cytoscape.
- **Frustrations.** No direct statement found; each resource writes its own viewer, the cost Drugst.One exists to
  remove.

### 3.6 Network toxicology researcher (`network-toxicology-researcher`)

A variant of 3.1 and 3.2 with a pollutant where the formula was. Recorded as its own persona because the sources, the
root node and the reviewers' objections differ, and because it is now the larger half by growth rate (section 2.1).

- **Who.** A master's student or junior faculty member in public health, food safety, environmental medicine or
  pharmacy, often in the same Chinese-medicine institution that produces the herbal papers (348 of 1,503 records).
  The question comes from a regulatory or news-driven worry: a plasticizer in food packaging, a bisphenol in receipts,
  a pesticide residue, a PFAS compound in water.
- **Tools.** PubChem for the structure and SMILES, the Comparative Toxicogenomics Database queried by CAS number,
  SwissTargetPrediction, SuperPred, STITCH or ChEMBL for predicted targets, ProTox and ADMETlab for toxicity
  endpoints, GeneCards, OMIM and TTD or a TCGA or GEO expression set for the disease side, Venny, STRING, Cytoscape
  with cytoHubba, clusterProfiler, AutoDock Vina, Gromacs, and increasingly an R or Python machine-learning step
  (LASSO, random forest, SHAP) where the herbal papers use degree.
- **Data.** One to a few chemicals rather than hundreds of compounds, so the graph is smaller at the top and wider
  below: in published examples 124 chemical-associated genes narrowing to 76 differentially expressed and 6 hubs for
  six polychlorinated biphenyl congeners against breast cancer (STRING 0.7, cytoHubba degree, closeness and
  betweenness top-10 overlap, giving AKT1, BRCA1, EGF, EZH2, IL6 and TNF;
  https://www.frontiersin.org/articles/10.3389/fphar.2025.1604993/full), and 1,053 predicted targets against 3,420
  disease genes intersecting to 324 for 4-nonylphenol (STRING above 0.9, top five by degree;
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12419657/).
- **Goals.** A mechanism for a chemical the public is already worried about; a hub list a laboratory can confirm with
  qPCR in one cell line (447 of 1,503 records name in vitro work, a higher share than the herbal literature's).
- **Frustrations.** The same silent identifier drop as 3.1, with chemicals added: a CAS number, a PubChem compound id,
  a SMILES string and a congener name are four keys for one node. Target counts differ by an order of magnitude
  between servers for the same chemical (14 from SwissTargetPrediction, 8 from STITCH, 1,031 from ChEMBL for
  4-nonylphenol), and nothing records which server contributed a node. A published docking threshold is stated and
  then not applied: the 4-nonylphenol study keeps poses at -6.0 kcal/mol or better and reports TP53 at -4.8 and ESR1
  at -5.1.
- **What reviewers say.** The objections of 3.4 arrive here too, with evidence now in print (section 7.2).

## 4. Use cases (ranked by frequency, then stakes)

| #   | Question answered with a graph                                                                                  | Who                     | Frequency                  | Stakes                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------- | --------------------------------------- |
| 1   | Which compounds of this herb or formula act on which targets of this disease? (layered network)                 | 3.1, 3.3                | Every paper                | Central figure                          |
| 2   | Which overlapping targets are hubs? (STRING PPI, degree, MCC or median rules, or a model)                       | 3.1, 3.3                | Every paper                | Decides what is docked and blotted      |
| 3   | Which pathways do the targets fall in? (GO/KEGG; compound-target-pathway network)                               | academic                | Every paper                | The claimed mechanism                   |
| 4   | Which compound is the "key active ingredient"? (compound degree)                                                | 3.1, 3.3                | Every paper                | The compound docked or bought           |
| 5   | Do predictions agree with measurement? (serum-absorbed compounds, DEGs, WGCNA modules, Mendelian randomization) | 3.2                     | Thousands of records (2.1) | Publishable or rejected                 |
| 6   | Which gut bacteria and metabolites move with treatment, and which host targets do they reach?                   | 3.2                     | 782 records                | Mechanism for gut and metabolic disease |
| 7   | Which functional modules exist? (MCODE)                                                                         | 3.1                     | About half                 | Subsystem story                         |
| 8   | Why does the formula combine these herbs; which other diseases could it treat?                                  | 3.2                     | Formula papers             | Rationalizes the prescription           |
| 9   | Which herbs does a physician combine for a syndrome? (weighted herb co-occurrence network; core formula)        | clinicians, 3.3 (TM-MC) | Hundreds of records        | Hospital formula development            |
| 10  | Which compounds should the quality standard assay? (Q-markers)                                                  | industry                | 211 records                | A product specification                 |
| 11  | What does the database know around this herb, ingredient or target?                                             | 3.5 and its users       | Every database visit       | The resource's front door               |
| 12  | Is this study trustworthy? (provenance, threshold sensitivity)                                                  | 3.4                     | Every review               | Acceptance                              |
| 13  | Through which human proteins could this pollutant cause this disease? (exposure-target-disease network)          | 3.6                     | 1,021 records in 2026      | A publishable health claim              |

## 5. Step-by-step workflows

Reconstructed from the methods sections named under each workflow. No published timing study was found; step times
are estimates from the number of manual queries and joins, and the freelance 3-12 day turnaround is the only external
effort evidence.

### 5.1 Workflow A: The standard formula-to-mechanism pipeline

Sources: lotus leaf (PMC8566053), Pulsatilla (fonc.2023.1174848), two-herb pair (PMC7838196), Buxue Liqi Huatan
(https://pmc.ncbi.nlm.nih.gov/articles/PMC9417787/), Yinchensini (https://pmc.ncbi.nlm.nih.gov/articles/PMC6317126/),
Yougui Pill (https://pmc.ncbi.nlm.nih.gov/articles/PMC6877955).

1. **Name the herbs (10 min).** Chinese, pinyin and Latin pharmacopoeial name plus plant part, as journals require.
2. **Collect compounds (30-90 min).** Search each herb on TCMSP (499 herbs, 29,384 ingredients, 13,144 unique molecules,
   3,311 targets, twelve ADME properties: https://pmc.ncbi.nlm.nih.gov/articles/PMC4001360); copy each ingredient table
   (MOL ID, name, OB, DL, Caco-2, BBB, half-life) into Excel with a herb column added by hand; herbs TCMSP lacks come
   from TCMID, BATMAN-TCM, HERB, ETCM or SymMap. Pulsatilla 4 herbs, 346 compounds; two-herb pair 354; lotus leaf 93.
3. **Filter by ADME (10 min; the most consequential decision, usually copied).** Oral bioavailability (OB) >= 30% and
   drug-likeness (DL) >= 0.18 is the de facto standard (PMC9217600; two-herb pair 354 -> 66; lotus 93 -> 15).
   Variants: OB >= 40% and DL >= 0.2, sometimes half-life >= 4 h (PMC6877955); Veber's rule in SwissADME, keeping 839
   of 1,542 (https://pmc.ncbi.nlm.nih.gov/articles/PMC7075005/); SwissADME GI absorption plus two drug-likeness rules
   (PMC9417787). Some studies add back compounds measured in serum that fail the filter.
4. **Predict targets (1-3 h of pasting).** TCMSP's targets tab (protein names) and/or SwissTargetPrediction from
   PubChem SMILES, Homo sapiens, one compound at a time. Probability cutoffs run from > 0 (PMC7838196) through 0.1
   (PMC9417787) to 0.5 (https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2025.1574540/full);
   the tool recommends none (https://www.swisstargetprediction.ch/citing.php). Alternatives: PharmMapper, STITCH, SEA,
   BATMAN-TCM (top 50 per compound at score > 20, PMC6877955). Yields: 189 (lotus), 180 (Pulsatilla), 654 (Buxue), 671
   from 65 components after de-duplication (two-herb pair; whether this follows its UniProt step is not stated).
5. **Normalize identifiers (30-60 min, error-prone).** UniProt ID mapping, human only, to gene symbols, deduplicated.
   Unmapped names drop without a count; Excel can turn symbols into dates.
6. **Collect disease genes (30 min, one decision).** GeneCards by keyword filtered by relevance (>= 1 in Pulsatilla,
   11,373 genes; > 1 in lotus, 9,510 -> 2,569; > 10 in the TCMDATA tutorial:
   https://yulab-smu.top/TCMDATA/target-retrieval.html); plus OMIM, DisGeNET, TTD, CTD (inference score > 40,
   PMC6877955), unioned across spellings of the disease name (five in PMC7838196). The cutoff changes the list tenfold.
7. **Intersect (10 min).** Venny 2.1, jvenn or TBtools; the overlap is the "potential therapeutic targets" and the
   Venn is Figure 1. Yields: 135 (lotus), 162 (Pulsatilla), 136 (two-herb), 73 (Yougui).
8. **Build the PPI network (15 min).** STRING, Multiple proteins, Homo sapiens, a minimum score (medium 0.4, high 0.7,
   highest 0.9: https://string-db.org/help/getting_started/), disconnected nodes hidden, TSV or stringApp. Observed:
   0.4 (lotus, mislabeled "highest confidence"), 0.9 (Yinchensini, Buxue), 0.99 (Pulsatilla); 135 nodes and 2,348
   edges at 0.4 against 70 nodes and 101 edges at 0.99.
9. **Screen core targets (20-40 min; drives the bench budget).** Three patterns:
    - top 10 by degree (lotus: AKT1 103, IL6 92, TP53 89, VEGFA 87, CASP3 83);
    - cytoHubba top 10 by Maximal Clique Centrality (MCC), which its authors report as the most precise of 11 methods
      for yeast essential proteins (https://pmc.ncbi.nlm.nih.gov/articles/PMC4290687/), or the intersection of several
      methods' top 10 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11604607/);
    - median filters in CytoNCA: degree at least twice the median, then above the median on betweenness, closeness,
      eigenvector, local average connectivity and network centrality. The two-herb pair states this rule in Methods but
      its Results apply fixed cutoffs (136-node, 2,233-edge PPI; degree >= 58 gave 19 nodes and 169 edges; degree >= 75
      plus seven other cutoffs gave 6 nodes and 15 edges; Fig. 3) without the medians, so rule and result cannot be
      connected (PMC7838196). Another went from 113 targets to 15
      (https://pmc.ncbi.nlm.nih.gov/articles/PMC9886246/figure/pone.0280847.g006).
      Optional MCODE at degree cutoff 2, node score 0.2, k-core 2, depth 100
      (https://baderlab.org/Software/MCODE/UsersManual). Figure: three panels (full, filtered, core ring).
      How common each rule is: of 1,259 open-access 2024 papers with "network pharmacology" in the title or
      abstract, the full text mentions cytoHubba in 272, CytoNCA in 172, MCC or "maximal clique centrality" in 144,
      MCODE in 130 and "twice the median" in 25 (Europe PMC full-text keyword counts, queried 2026-11-25 through
      https://www.ebi.ac.uk/europepmc/webservices/rest/search; mentions, not a coded sample of methods sections).
      Rule and result drift in the intersection pattern too: Tongxieyaofang's Methods name Degree, Closeness, MCC and
      EcCentricity, its Results name Betweenness in place of EcCentricity, for five core targets from an 82-node,
      282-edge network (https://pmc.ncbi.nlm.nih.gov/articles/PMC11604607/). cytoHubba's definitions use unweighted
      shortest paths, and two of its measures carry hidden parameters (DMNC epsilon 1.7; EPC averages 1000 randomly
      reduced networks, so it needs a seed) (https://pmc.ncbi.nlm.nih.gov/articles/PMC4290687/); CytoNCA 2.1.6
      (2014) adds local average connectivity, network centrality, subgraph and information centrality for weighted or
      unweighted networks (https://apps.cytoscape.org/apps/cytonca). The Designloom capability hub-screening records
      the rule, its parameters and the count after each step, and keeps the core subnetwork beside its parent.
10. **Enrich (20 min).** DAVID (lotus: P < 0.05, 622 GO terms, 112 KEGG pathways), Metascape or clusterProfiler; top 10
    GO bars, top 20-30 KEGG bubbles, newer papers adding a genes-to-pathways Sankey from bioinformatics.com.cn
    (https://bioinformatics.com.cn/plot_basic_go_pathway_sankey_dot_plot_121); targets highlighted on a KEGG map.
11. **Compound-target-pathway network (30 min).** Add pathways, prune by degree (compounds >= 10, pathways >= 10
    targets, PMC6877955); Pulsatilla 172 nodes, 914 edges. Pick two or three pathways to validate, often by judgment.
12. **Dock (half a day to two days).** Top three or four compounds against the top five targets; PDB structures chosen
    by hand; AutoDock Vina (20 of 35 papers in a 2024 sample), AutoDock (8) and others; pass threshold most often -5.0
    kcal/mol (15 of 35), no positive controls in any, only 6 docked into a specific site
    (https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2025.1566772/full). The two-herb pair's
    Table 3 runs from -9.9 (ohioensin-A with AKT1) to +4.5 kcal/mol (ohioensin-A with AR, a repulsive score), yet its
    text reports "strong binding interactions" with AR among others (PMC7838196).
13. **Validate.** CCK-8 viability, western blots and qPCR, an animal model dosed with the decoction.

**Hand-offs.** Excel tables become supplements; Cytoscape exports PNG, PDF or SVG; figures are assembled in
Illustrator; the session file is rarely published.

### 5.2 Workflow B: Building and drawing the layered network

1. **One stacked edge table (20 min).** Columns source, target, type: herb-compound, compound-target, target-pathway,
   target-disease rows; a node table with `type` (herb, compound, target, pathway, disease).
2. **Import (10 min).** File > Import > Network from File, then Table from File keyed on name
   (https://manual.cytoscape.org/en/stable/Creating_Networks.html). Cytoscape 3.6 through 3.10 appear in methods.
   Most papers drop compounds with no target in the intersection.
3. **Style by type (20-40 min).** Consistent in structure, arbitrary in detail: "green rhombuses are herbs, brown
   squares are components, blue dots are targets, red hexagons are pathways" (PMC6877955); triangles per herb with
   green target dots (https://pmc.ncbi.nlm.nih.gov/articles/PMC5593534/figure/F3). Size by degree; compounds labeled
   by short codes ("HQ1, HQ2" or MOL IDs) with a mapping table.
4. **Lay out in tiers (20-60 min, the painful step).** Legends speak of a "herbs layer" and "targets layer"
   (https://pmc.ncbi.nlm.nih.gov/articles/PMC6723118). Cytoscape offers Attribute Circle (one circle, "node order is
   determined by a user-selected node column"), Group Attributes (a separate circle per column value), Hierarchical
   (layers with within-layer order chosen to minimize crossings, but layers come from edge direction, not a node
   column) and yFiles Hierarchic, Radial and Tree from the App Store
   (https://github.com/cytoscape/cytoscape-manual/blob/956f3b70754d79fbe25502f76af88edc3278d690/docs/Navigation_and_Layout.md,
   https://wikiold.cytoscape.org/Cytoscape_User_Manual/Navigation_Layout). Protocols do name one: "the layout
   algorithm (attribute circle layout) was applied" (PMC6317126). It still fails: Group Attributes gives a circle per
   type, not ordered tiers; neither circle layout orders a tier to reduce crossings with the next; Hierarchical cannot
   take `type` as the tier key; and after hand-nudging the geometry exists only in the saved session. The other
   published answer is a Sankey: TCMDATA's `tcm_sankey()` draws herb -> molecule -> target flows with ggalluvial, band
   width proportional to shared frequency, while its network view uses igraph force layouts with type carried by
   shape and color (https://yulab-smu.top/TCMDATA/network-construction.html); `unitcm` likewise gives a force-layout
   blob (https://cran.r-project.org/web/packages/unitcm/vignettes/network-pharmacology.html).
5. **Read and export (25 min).** High-degree compounds are "key active ingredients"; targets hit by many compounds
   show "multi-component, multi-target synergy". Export vector, fix labels and legend in Illustrator. Sizes: two-herb
   pair compound-target 736 nodes and 3,034 edges (Fig. 1c), common-target network 196 nodes and 900 edges (Fig. 2d),
   core compound-target-pathway 143 nodes and 646 edges (PMC7838196). Lotus leaf's top five by degree are "quercetin,
   kaempferol, isorhamnetin, O-nornopine, and papaverine", but papaverine is not among the 15 compounds in its own
   Table 1 (PMC8566053).

### 5.3 Workflow C: Measured exposure and omics integration

Large, not a variant (section 2.1). Sources inline, plus Zhai et al. 2025 (PMC11725223) and Guanyu Zhixie Granule
(https://pmc.ncbi.nlm.nih.gov/articles/PMC11149358/).

1. **Profile the product.** UPLC-Q-TOF-MS of the decoction in positive and negative modes (Guanyu Zhixie: 33
   compounds identified, 9 selected).
2. **Serum pharmacochemistry (in vivo exposure).** Dose rats for about seven days; draw blood at several times after
   the last dose and pool it; precipitate protein with methanol; run dosed and blank serum on the same method; call a
   compound absorbed when its peak is in dosed serum and absent from blank (or at least five-fold higher), matched to
   an in-house library within 5 ppm. A gastric-lesion formula went from 178 extract compounds to 77 absorbed parents
   plus 9 metabolites, fed to STITCH (confidence > 0.4) for 105 targets
   (https://pmc.ncbi.nlm.nih.gov/articles/PMC7768900); Xijiao Dihuang Tang showed 67 extract peaks and 60 serum
   constituents (23 prototypes, 37 metabolites), the input to a 398-node, 985-edge compound-target network
   (https://pmc.ncbi.nlm.nih.gov/articles/PMC8845118/); Danggui Buxue gave 29 prototypes and 51 metabolites
   (https://pmc.ncbi.nlm.nih.gov/articles/PMC10628667). Weaker variants only predict absorbability from measured
   structures (Naoxintong: 63 of 81 pass Lipinski-type rules: https://pmc.ncbi.nlm.nih.gov/articles/PMC4830706/). The
   measured list replaces the whole compound tier, so each compound carries an evidence class (database-listed,
   measured in product, absorbed prototype, metabolite, absorbability predicted) and everything downstream must be
   re-derived. This is Diao et al.'s first remedy (in vivo detectability as the primary criterion, database lists a
   lower evidence tier); quercetin falls from 71.9% (236/328) to 42.3% (58/137) when experimental identification
   replaces database lists (fphar.2026.1748478).
3. **Predict targets** for the measured compounds as in Workflow A.
4. **Replace GeneCards with measured disease genes.** Differentially expressed genes from GEO or own RNA-seq with
   limma, optional ComBat batch correction and WGCNA modules. Guanyu Zhixie: GSE76588, 686 DEGs at logFC > 0.5 and p <
   0.05. Qinghuo Rougan Formula for uveitis: GSE7850 (GPL201, 24 cases, 20 controls), |log2FC| > 1 and adjusted p <
   0.05 (216 DEGs), WGCNA at soft power 5 (a 120-gene module, r = 0.72), degree >= 70 and betweenness >= 200 for six
   hubs, then LASSO (AUC 0.900) to choose among them
   (https://www.frontiersin.org/journals/molecular-biosciences/articles/10.3389/fmolb.2025.1632027/full).
5. **Intersect, PPI, screen, enrich** as Workflow A (Guanyu Zhixie: 181 common targets; STRING >= 0.9 gave 152 nodes
   and 1,352 edges; 16 core genes).
6. **Argue causality for a hub (206 records name Mendelian randomization).** A Dahuang-Huangqin acute lung injury study
   intersected herb targets, disease genes and 4,239 DEGs from GSE243066 to 93 genes, then ran Mendelian randomization
   from IEU OpenGWAS eQTLs to FinnGen R10 ARDS (IVW odds ratios such as MMP9 0.657), CIBERSORT over 22 immune cell
   types, Seurat single-cell analysis of two GEO sets and ROC checks in two more (AUC 0.71-0.75)
   (https://www.dovepress.com/multi-target-synergy-against-acute-lung-injury-systems-pharmacology-de-peer-reviewed-fulltext-article-JIR).
   The hub list now comes from a model or a causal test, not from degree, and each target carries numeric columns.
7. **Overlay and metabolomics.** Fold change on targets, detected or not on compounds, filter to measured-supported
   paths; untargeted serum metabolomics (Guanyu Zhixie: OPLS-DA VIP > 1.0, p < 0.05, 47 key metabolites) joined to
   enriched pathways.
8. **Validate** in the animal model (Guanyu Zhixie RT-qPCR: Rela and Hif1a down, Egf not significant).

### 5.4 Workflow D: Gut microbiome and metabolome branch

Sources: Weifuchun Capsule (https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1634410/text),
Guanyu Zhixie (PMC11149358), Tongxieyaofang (PMC11604607), Shen Ling Bai Zhu San
(https://pmc.ncbi.nlm.nih.gov/articles/PMC6612409). The graph is new: a signed, weighted bipartite correlation network
between differential taxa and metabolites, joined to predicted host targets.

1. **Narrow the formula** by Workflow A (Weifuchun: 99 components to 10; Shen Ling Bai Zhu San: 980 compounds to 97,
   a 171-node, 330-edge compound-target network).
2. **Dose an animal model** (Shen Ling Bai Zhu San: 30 rats, DSS colitis; Guanyu Zhixie: 60 rats, six groups).
3. **Sequence the microbiota.** 16S V3-V4 on Illumina or full-length on PacBio; QIIME, OTUs at 97%, alpha and beta
   diversity, LEfSe (LDA > 4.0) for differential taxa, PICRUSt for function.
4. **Profile metabolites** (OPLS-DA VIP and p).
5. **Correlate.** Spearman matrix of taxa against metabolites (Guanyu Zhixie: Proteobacteria with epinephrine r =
   0.749). Edge thresholds (|r| and p) are often unreported, so the drawn network depends on an unstated cutoff.
6. **Join to host targets** by shared pathways or by argument; Shen Ling Bai Zhu San and Tongxieyaofang make the link
   only in prose.
7. **Validate** by western blot, qPCR or ELISA.

### 5.5 Workflow E: Compare herbs within a formula; reposition a formula

Sources: Xiaoyao decoction (PMC7075005), two-herb pair (PMC7838196).

1. **Keep per-herb provenance**: each compound keeps its herb, each target the set of herbs reaching it; in
   spreadsheets this label rarely survives the joins.
2. **Compare the sets** (two-herb pair: 20 compounds from one herb, 48 from the other, 2 shared). Eight to twelve
   herbs make a many-set comparison a Venn diagram cannot draw.
3. **Project two-mode to one-mode.** Xiaoyao used Pajek to turn the target-pathway matrix into a one-mode target
   network (279 nodes, 6,549 edges), analyzed it in Gephi 0.9.2, ranked targets by loss of network efficiency on
   removal (custom Python), kept the top 10% (28 targets) and checked the ranking against CNKI co-occurrence: Spearman
   r = 0.388 (efficiency), 0.346 (degree), 0.316 (betweenness) against full texts, but 0.230, 0.202 and 0.182 against
   abstracts (Table 7).
4. **Reposition.** A directed targets-pathways-diseases network in Cytoscape: pathways kept at in-degree > 10, diseases
   classified under ICD-11 and read off at in-degree > 20. The same paper applies Veber's thresholds but cites Lipinski
   for the filter (its references 26 and 27).

### 5.6 Workflow F: Prescription mining (herb co-occurrence networks)

Sources: Li et al. 2010 (https://pmc.ncbi.nlm.nih.gov/articles/PMC3024874/), aplastic anemia
(https://pmc.ncbi.nlm.nih.gov/articles/PMC9436587/), influenza-like illness
(https://www.dovepress.com/diagnostic-features-and-prescription-rules-of-influenza-like-illnesses-peer-reviewed-fulltext-article-JMDH),
ginseng for Xiaoke (https://pmc.ncbi.nlm.nih.gov/articles/PMC7140142/), coronary heart disease
(https://pmc.ncbi.nlm.nih.gov/articles/PMC8557045/), TCMNPAS (PMC10958928).

The graph is one-mode and weighted: herbs joined by co-prescription, projected from a prescription-by-herb incidence
table. The founding example (Li et al.) used 3,865 formulae over 737 herbs, scored each pair by mutual information
combined with a between-herb distance, kept the top 100 pairs (each P < 0.05), colored nodes by traditional property
(cold, cool, neutral, warm, hot), sized them by neighbor count, set edge width from the score, and checked the pairs
against 775 traditional herb pairs (six of the top 20 were new).

1. **Assemble the table.** Hospital records (aplastic anemia: 859 prescriptions, 255 herbs; influenza-like illness:
   457 records, 105 herbs; coronary heart disease: 715 cases, 182 herbs) or classical texts (Xiaoke: 303
   prescriptions). Python or Perl turns it into a Boolean prescription-by-herb matrix.
2. **Standardize herb names** (merge processed and raw forms) and attach property, flavor and meridian from the
   Chinese Pharmacopoeia.
3. **Frequencies** in Excel pivot tables.
4. **Association rules.** Apriori: SPSS Modeler 18.0 at support 0.20, confidence 0.8; R arules at support > 0.1,
   confidence > 0.6 (six rules); Python mlxtend at support 0.03-0.05, confidence 0.5, with a permutation test.
   Chinese-language studies also name TCMISS (Traditional Chinese Medicine Inheritance Support System); no primary
   documentation for it was read here.
5. **Build the network.** Herbs sized by frequency, edges weighted by co-occurrence or rule confidence (Xiaoke: ginseng
   removed because it is in every prescription, 243 nodes, 3,552 edges in Cytoscape; influenza-like illness: 105
   nodes, 1,603 edges in Gephi, colored by modularity).
6. **Extract the core formula.** k-core (influenza-like illness: k > 26 gave ten herbs with a four-herb core matching
   Maxing Shigan Decoction), DPClus (Xiaoke: 24 clusters, 17 kept) or hierarchical clustering.
7. **Hand on** the core to Workflow A (coronary heart disease: five core herbs, OB/DL filter to 158 ingredients, 148
   targets, 128 disease overlaps, Cytoscape 3.7.2).

Styling inputs come from traditional theory, not topology: property, flavor, meridian, and the monarch, minister,
assistant and guide roles.

### 5.7 Workflow G: Quality-marker selection

Sources: Q-marker review (PMC12855425), Hugan tablets (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10213786/),
Shenxian-Shengmai (https://www.jfda-online.com/journal/vol26/iss2/29), Pheretima
(https://pmc.ncbi.nlm.nih.gov/articles/PMC9553678/).

1. **Characterize** by UPLC-QTOF-MS (Shenxian-Shengmai: 64 compounds; Hugan: 128) and batch fingerprints (Pheretima:
   40 batches); **measure content** across batches (Hugan: 15).
2. **Build the layered network** "TCM formula - single herbs - compounds - targets - pathways" (Pheretima: 79 nodes,
   281 edges).
3. **Rank by effect and content**: degree, a bioassay, or grey relational analysis (Pheretima: six markers).
4. **Choose markers and write the assay** (Shenxian-Shengmai: 10 compounds, a UPLC-DAD method). The deliverable is a
   specification; content and detectability weigh as much as degree.

### 5.8 Workflow H: Serving a network view from a TCM database

Sources: BATMAN-TCM 2.0, ETCM v2.0, Drugst.One (section 3.5).

1. A user enters a herb, ingredient, formula, target or gene list (BATMAN-TCM accepts eight identifier types).
2. The server returns a capped subgraph from millions of predicted edges (top 20 targets per compound).
3. The page renders a typed network, seed central, predicted edges with width by confidence.
4. The user expands by neighbor, chooses entity types, edits, relayouts and filters.
5. Export SVG or JPG, GraphML or CX2; bulk download and JSON API.

### 5.9 Workflow I: Checking robustness and provenance

Sources: Diao et al. 2026, Wang et al. 2024
(https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2024.1303693/full), Che and Zhang 2025.
Rarely done; it is what reviewers ask for.

1. Pull compounds and targets from two or more databases and record overlap; prefer targets predicted by two sources.
2. Flag frequent hitters (ChemFH) and pan-assay interference compounds (https://pmc.ncbi.nlm.nih.gov/articles/PMC10264668).
3. Re-run hub ranking at several STRING cutoffs and with betweenness, eigenvector or propagation; report persistence.
4. Use GSEA or topology-aware enrichment and report the background gene set.
5. Dock at a known site with a positive control and a second program.
6. Report every database version, access date, threshold and full list (PMC7838196 dates every source; rare).

### 5.10 Workflow J: Network toxicology, from an exposure to a disease mechanism

Sources: polychlorinated biphenyls and breast cancer (fphar.2025.1604993), 4-nonylphenol and breast cancer
(PMC12419657), dioctyl terephthalate and chronic urticaria (PMID 39923559), the benzo[a]pyrene video protocol
(jove.com/v/70636), the robustness re-analysis (PMC13604017). Steps 5 to 9 are Workflow A unchanged; the work that is
new is all in steps 1 to 4.

1. **Name the exposure (10 min).** One chemical or a congener family, with its CAS number, PubChem compound id and
   SMILES string; the PCB study carried six congeners as six root nodes.
2. **Predict toxicity endpoints (20 min).** ProTox and ADMETlab give carcinogenicity, endocrine-receptor and
   mitochondrial-toxicity calls, which become attributes of the root node and part of the argument that the chemical
   is worth studying at all. Named in 84 of 1,503 abstracts.
3. **Collect chemical targets (30-90 min).** Two routes, often both. The curated route queries the Comparative
   Toxicogenomics Database by CAS number for chemical-gene interactions and filters by the disease association (the
   PCB study used "Breast Neoplasms" at p < 0.01). The predicted route runs SwissTargetPrediction, SuperPred, STITCH
   or ChEMBL on the SMILES string, human only, and merges after UniProt normalization. Counts differ by an order of
   magnitude between servers for one chemical (14, 8 and 1,031 for 4-nonylphenol), and the merged list keeps no record
   of which server supplied which node.
4. **Collect disease genes (30 min).** Either the keyword route of Workflow A (GeneCards relevance above 10 plus OMIM
   and TTD gave 3,420 genes) or, in 313 of 1,503 records, differential expression from TCGA or GEO: the PCB study took
   113 normal and 1,113 tumor samples from TCGA-BRCA at absolute log fold change at least 1 and adjusted p below 0.05,
   giving 9,554 differentially expressed genes.
5. **Intersect (10 min).** Venny or the R venn package. The PCB study's 124 chemical-associated genes left 76 that
   were also differentially expressed (52 up, 24 down); 4-nonylphenol left 324.
6. **Build the protein interaction network and screen hubs (30-60 min).** STRING at 0.7 or above 0.9, Cytoscape
   3.10.x, then either cytoHubba's top-10 lists by degree, closeness and betweenness intersected (six hubs: AKT1,
   BRCA1, EGF, EZH2, IL6, TNF) or the top five by degree alone. A machine-learning step increasingly replaces the
   degree rule: LASSO, random forest or SHAP over the expression matrix, named in 450 of 1,503 abstracts.
7. **Enrich (20 min).** clusterProfiler, GO and KEGG, with Benjamini-Hochberg adjustment in better papers.
8. **Dock and simulate (half a day to two days).** AutoDock Vina against the hubs, then Gromacs molecular dynamics in
   384 of 1,503 records, a much higher share than in the herbal literature.
9. **Confirm in one cell line (447 of 1,503).** The PCB study exposed MCF-7 cells to 1 micromolar for 48 hours and
   read the hubs by RT-qPCR.
10. **Robustness, when a reviewer asks.** Re-run at other thresholds, fix the direction of any receiver-operating
    characteristic test from the discovery data rather than per cohort, test the overlap against the set of genes the
    sources could have returned instead of the whole protein-coding genome, and drop any one chemical from a mixture
    to see whether the result was carried by it (section 7.2).

**What a graph product has to add over Workflow A.** An exposure root node type with its own attributes; a per-node
record of which target server or curated source contributed it, since the merge is where the evidence class is lost
(requirement R4); a four-tier rather than five-tier figure; and the robustness re-runs of step 10 as something other
than a manual repeat of the whole pipeline (R8, R23).

## 6. Data

| Resource                                                                                                                                 | Role                                                  | Size (as reported)                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TCMSP                                                                                                                                    | Herb, compound, target with ADME                      | 499 herbs, 13,144 molecules, 3,311 targets (PMC4001360)                                            |
| HERB                                                                                                                                     | Herb, ingredient, target, disease, trials             | 7,263 herbs, 49,258 ingredients, 12,933 targets (https://pmc.ncbi.nlm.nih.gov/articles/PMC7779036) |
| BATMAN-TCM 2.0                                                                                                                           | Known and predicted ingredient-target                 | 17,068 known, 2,319,272 predicted (PMC10767940)                                                    |
| ETCM v2.0                                                                                                                                | Formulas, patent drugs, ingredients                   | 48,442 formulas, 9,872 patent drugs, 38,298 ingredients (PMC10326295)                              |
| SymMap 2.0                                                                                                                               | Herb, symptom, ingredient, target                     | 698 herbs, 26,035 compounds (https://pmc.ncbi.nlm.nih.gov/articles/PMC9537023)                     |
| IMPPAT 2.0 (3.0 on the site)                                                                                                             | Indian plants, per plant part                         | 4,010 plants, 17,967 phytochemicals, 1,335 drug-like (PMC9996785)                                  |
| TM-MC 2.0                                                                                                                                | Korean, Chinese, Japanese materials and prescriptions | 635 materials, 21,306 compounds, 5,075 prescriptions (PMC10790428)                                 |
| Comparative Toxicogenomics Database (CTD)                                                                                                | Chemical-gene and chemical-disease, curated; exposures | 3.8 million curated interactions over 17,700 chemicals and 55,400 genes; over 94 million connections in all (PMC11701581) |
| ProTox, ADMETlab                                                                                                                         | Predicted toxicity endpoints on an exposure node       | One call per endpoint                                                                              |
| SwissTargetPrediction, PharmMapper, STITCH, SEA                                                                                          | Target prediction                                     | A score per prediction                                                                             |
| GeneCards, OMIM, DisGeNET, TTD, CTD                                                                                                      | Disease genes                                         | Thousands per disease; DisGeNET full data licensed                                                 |
| STRING; DAVID, Metascape, clusterProfiler, KEGG                                                                                          | PPI; enrichment                                       | Score 0.15-0.999; term tables                                                                      |
| LC-MS peak tables, GEO series (expression matrices with platform ids), GWAS/eQTL summary statistics, single-cell annotations, 16S tables | Measured data                                         | Hundreds of compounds; tens of samples; thousands of genes                                         |
| Hospital records, classical texts, TM-MC prescriptions                                                                                   | Prescriptions                                         | Hundreds to thousands, 100-740 herbs                                                               |

**Formats.** Excel and CSV for nearly everything; TCMSP XGMML; STRING TSV; Cytoscape .cys; correlation matrices;
Boolean prescription-by-herb matrices; JSON APIs; GraphML and CX2 from web viewers; PDB, PDBQT and SDF for docking.

**Node types.** Exposure, in the network toxicology branch, carrying a CAS number, a PubChem compound id, a SMILES
string and predicted toxicity endpoints, and standing where the formula and herb tiers stand in the herbal pipeline;
formula; herb (and plant part, which IMPPAT records per association); compound with an evidence class
(database-listed, measured in product, absorbed prototype, metabolite) and measured content where known; target with
measured columns in Workflow C (log fold change, adjusted p, model AUC, Mendelian randomization odds ratio); pathway;
disease; in the microbiome branch, taxon and metabolite.

**Sizes.** Paper pipeline: raw compounds 90-1,600, filtered 15-250, targets 150-950, intersection 70-300, PPI 70-300
nodes and 100-2,400 edges, layered networks 90-750 nodes and 170-3,000 edges, target-pathway up to 280 nodes and 6,500
edges, prescription networks 100-740 herbs and up to 3,600 edges. Structure, labeling and layout are the problem, not
scale. Platforms: millions of edges server-side, hundreds to low thousands drawn per query.

**Identifiers.** Compounds: TCMSP MOL IDs, PubChem CIDs, CAS numbers, English, pinyin or Chinese names, no shared key;
TM-MC matches on the first 14 InChIKey characters, which merges stereoisomers by design (PMC10790428). Targets: protein
names to UniProt to symbols, non-human targets slip in, failures uncounted. Herbs: pinyin, Latin and English differ;
processed state and plant part rarely recorded. Diseases: free-text keywords, no ontology ID. Sources disagree badly:
across nine TCM databases only 78 herbs are shared, and across eight only 295 ingredients (Wang et al. 2024); BATMAN-TCM
2.0's known and predicted interactions differ 136-fold in count and wholly in evidence class (PMC10767940).

**Graph properties.** Multipartite and layered, edges only between adjacent classes. Herb-compound edges are
membership; compound-target edges carry a prediction score or a known flag; target-target edges are undirected and
STRING-weighted; target-pathway edges are enrichment membership; taxon-metabolite edges are signed correlations;
herb-herb edges are weighted co-occurrence. Degree in a bipartite layer is not comparable with PPI degree, yet both are
reported as "degree". Hierarchical in formula structure (formula > herb > compound) and TCM roles. Not temporal or
geographic.

**Sensitivity and access.** Public data except hospital prescriptions (de-identified patient records); licensing limits
DisGeNET and some TCM databases; availability is intermittent across the China border, so an offline copy of inputs
is a reproducibility requirement.

## 7. Analysis methods

### 7.1 What they compute and how they read it

ADME filtering; set operations on symbol lists; degree, betweenness, closeness and the CytoNCA measures; cytoHubba
MCC; median rules; MCODE; over-representation enrichment; limma, WGCNA, LASSO and Mendelian randomization in
Workflow C; Spearman correlation with LEfSe and OPLS-DA; Apriori rules, mutual information, k-core and modularity on
co-occurrence networks; docking and molecular dynamics (47.2% of studies in the 36-study review). Readings:
high-degree compound = "key active ingredient"; high-degree target = "core target"; enriched pathway = "mechanism";
energy below -5 kcal/mol = "binds"; many compounds on many targets = "multi-component, multi-target synergy", the
framing since Hopkins 2008 (https://doi.org/10.1038/nchembio.118); a strong taxon-metabolite correlation = a
mechanistic link; the k-core = the physician's core formula.

### 7.2 Validity problems documented

- **Homogeneous results** (Diao et al., percentages of studies reporting each level). Compounds (465): quercetin 63.2%,
  kaempferol 47.9%, luteolin 31.0%. Targets (880): AKT1 48.8%, TNF 39.1%, EGFR 34.8%. Pathways (917): AGE-RAGE 54.9%,
  PI3K-Akt 54.7%. Stratified falls for quercetin and AKT1 are in 2.4 and 5.3. Remedies: in vivo exposure data,
  frequent-hitter screening, debiased target prediction, GSEA with a reported background, context-aware centrality.
- **Predicted targets as findings.** TCMSP fills compounds lacking validated targets with its SysDT model (PMC4001360);
  studies depend on "usually one single database" (https://pmc.ncbi.nlm.nih.gov/articles/PMC9143318).
- **ADME filter ignores abundance**, processing and decoction (PMC11725223); **database disagreement** (section 6).
- **Docking misuse.** Blind docking, no positive controls; Vina's correlation with measured affinity fell from r =
  0.604 at a defined site to 0.387 blind on CASF-2016 (Che and Zhang 2025).
- **PAINS and unreachable concentrations** among flavonoids (PMC10264668).
- **Thresholds carry the result, measured once.** A 2026 re-analysis of a network toxicology study (pharmaceuticals
  and caffeine against vitiligo) varied every cutoff its own authors had chosen and reported what survived: the core
  overlap was zero at every disease-gene tier threshold above 0.170; the overlap was enriched 2.49-fold against the
  whole protein-coding genome (p = 5.1 x 10^-5) but only 1.29-fold against the 5,601 genes the sources could actually
  have returned (p = 0.12); HIF1A was the highest-degree hub at STRING 0.70 but was overtaken by MAOB at 0.85 and
  0.90; with the direction of each receiver-operating characteristic test fixed from the discovery data instead of
  chosen per cohort, 7 of 10 gene-cohort estimates fell below 0.50 and EDNRA fell from 0.96 to 0.04 (95% confidence
  interval 0.00 to 0.24); and removing one chemical, caffeine, cut the key differentially expressed gene panel from
  five to two. No gene passed all four checks. Provenance failed the same way: on re-query the similarity channel
  returned no rows for 9 of 11 compounds, analogue identities and Tanimoto coefficients were recoverable for 4 of 73
  similarity records, and the database release used in the original run had not been recorded. The authors' conclusion
  is that "such checks should be standard, not optional"
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC13604017/). This is the strongest published statement of requirements R4,
  R8, R9 and R23.
- **No reporting standard.** "No formal risk-of-bias tool exists for network pharmacology studies"; Cytoscape version
  omitted in 11 of 36 studies; 28.57% did no ADMET evaluation (f1000research 14-1384).
- **Internal inconsistency.** Every full methods section read contained a contradiction: Pulsatilla 162 vs 130
  intersection genes; Yinchensini 106 vs 131 vs 126 compounds; Buxue 654/694 vs 915 targets; lotus leaf's STRING 0.4
  called "highest confidence" and papaverine missing from its own table; the two-herb pair's median rule against fixed
  Results cutoffs and a +4.5 kcal/mol "binding"; Xiaoyao's Veber filter cited to Lipinski; the gastric-lesion serum
  study's DAVID cutoff given as p < 0.5 in Methods and p < 0.01 in Results (PMC7768900). Inference: numbers are carried
  by hand between web tools, and reruns are not tracked.

### 7.3 Validation habits

Docking almost always; molecular dynamics in about half; in vitro work in 22.2% and in vivo in 16.7% of the 36-study
review; clinical evidence rarely. A review of 101 integrated studies calls validation the main barrier to translation
(https://mdpi-res.com/d_attachment/ijms/ijms-27-06177/article_deploy/ijms-27-06177.pdf). Negative results go
unreported.

## 8. Outputs and collaboration

- **Mechanism paper:** workflow diagram; Venn; layered network; PPI with filtered and core subnetworks; GO bars; KEGG
  bubbles, often with a Sankey; annotated KEGG map; compound-target-pathway network; docking poses and energy heatmap;
  blots; supplementary Excel tables. Fifteen figures in PMC7838196. Multi-omics papers add diversity plots, LEfSe bars,
  correlation heatmaps and networks, ROC curves and Mendelian randomization forest plots.
- **Prescription mining:** frequency and rule tables and a herb network with the core highlighted. **Quality
  standard:** an assay specification. **Database resource:** a site with query, network view, downloads and API.
- **Conventions.** Shape and color by type, chosen per paper and conflicting; size by degree; legends drawn by hand;
  bubble encodings vary (https://pmc.ncbi.nlm.nih.gov/articles/PMC9396035/figure/F2); confidence as edge width in
  database viewers; correlation sign as edge color.
- **Sharing.** Figures as images, data as spreadsheets; sessions rarely published, NDEx not seen; database versions
  rarely stated, so a study generally cannot be reproduced even by its author a year later.

## 9. Tools landscape and pain points

| Tool                                                    | Use                                         | Strengths (evidence)                                                                                  | Pain (evidence)                                                                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TCMSP                                                   | Compounds, ADME, targets                    | One-stop, ADME built in, XGMML export                                                                 | Protein names not symbols; predicted mixed with known; 2014-era; moved addresses                                                                                            |
| SwissTargetPrediction, GeneCards, Venny, STRING         | Targets, disease genes, intersection, PPI   | Free, familiar                                                                                        | One compound at a time; arbitrary cutoffs; lists pasted back by hand; STRING cutoff changes the network tenfold                                                             |
| Cytoscape + cytoHubba, MCODE, CytoNCA, ClueGO           | Network, hubs, figures                      | Free, expected; apps implement the recipe; Attribute Circle and Group Attributes key on a node column | No tiered layout keyed on a column with crossing reduction; arrangement not reproducible; labels overlap; no set algebra; no per-node provenance; styles redone per network |
| Gephi, Pajek                                            | Projections, co-occurrence networks, k-core | Modularity, projection                                                                                | Separate tools plus custom code (Workflows E, F)                                                                                                                            |
| SPSS Modeler, R arules, Python mlxtend, TCMISS          | Prescription rules                          | Point-and-click rules                                                                                 | Network step leaves the tool                                                                                                                                                |
| R limma, WGCNA, glmnet, TwoSampleMR-style tools, Seurat | Workflow C                                  | Standard                                                                                              | Results joined to the network by hand                                                                                                                                       |
| QIIME, LEfSe, R correlation                             | Microbiome                                  | Standard pipelines                                                                                    | Thresholds unstated; drawn outside Cytoscape                                                                                                                                |
| TCMNP, TCMDATA, unitcm, TCMNPAS                         | End-to-end in R or Shiny                    | Scripted, Sankey                                                                                      | Need R; force layout on typed graphs                                                                                                                                        |
| BATMAN-TCM, ETCM viewers; Drugst.One; Cytoscape Web     | Embedded views                              | Confidence-weighted edges, three-line embed, CX2                                                      | Each resource builds its own; Drugst.One is protein-drug only                                                                                                               |
| CTD, ProTox, ADMETlab, SuperPred                        | Network toxicology inputs (Workflow J)      | Curated chemical-gene evidence with a disease filter; endpoint calls on one chemical                  | Queried by CAS number while the rest of the pipeline uses gene symbols; server target counts differ by an order of magnitude for one chemical and the merge records no source |
| Freelancers                                             | Whole pipeline                              | Cheap, fast                                                                                           | Quality unverifiable                                                                                                                                                        |

## 10. Requirements implied

Coverage refers to the existing designloom personas (`genomics-cytoscape-user`, `bioinformatics-researcher`) and
workflows W18 (import and validation), W20 (gene list to network), W21 (cluster and annotate), W22 (enrichment map),
W23 (hub ranking), W24 (merge networks), W25 (reproducible session), W05 (paths).

| #   | Capability                                                                                                                                                                                                                                                                                                                                                                                                            | Priority | Covered today?                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| R1  | Tiered layout for a typed multipartite graph: tier key from a node column (formula, herb, compound, target, pathway, disease; taxon, metabolite), tiers as ordered columns or rings, within-tier order that reduces crossings between adjacent tiers, the same arrangement on reload; optional Sankey-like view. Cytoscape has circle-per-type and crossing-minimizing hierarchical layouts, none combining the three | must     | No; W20-W25 assume one node type            |
| R2  | Set operations over id lists and node sets (2-12 sets): counts, Venn or UpSet view, result as selection or new network, membership flags per node                                                                                                                                                                                                                                                                     | must     | No; W24 merges networks                     |
| R3  | One network assembled from several typed edge tables in one import                                                                                                                                                                                                                                                                                                                                                    | must     | Partly (W18)                                |
| R4  | Per-node and per-edge provenance (source, version, access date) and evidence class (curated, predicted with native score, text-mined, measured), stylable (dashed = predicted) and excludable by class to see what survives                                                                                                                                                                                           | must     | No                                          |
| R5  | Identifier mapping with a match report (protein names, UniProt, symbols, compound names, CIDs, InChIKeys; species filter; unmatched listed)                                                                                                                                                                                                                                                                           | must     | Partly (W18)                                |
| R6  | Enrichment table import as pathway nodes linked to member targets                                                                                                                                                                                                                                                                                                                                                     | must     | Partly (W22 differs)                        |
| R7  | Core-target screening as a recorded rule (top-N, MCC, intersection of top lists, median and multiple-of-median thresholds), the surviving subnetwork kept beside the parent                                                                                                                                                                                                                                           | must     | Planned: hub-screening (W23, W430, W1054)   |
| R8  | Threshold sensitivity: re-run at alternative cutoffs and compare hub lists                                                                                                                                                                                                                                                                                                                                            | should   | Planned: threshold-sweep with hub-screening |
| R9  | Pipeline record: every threshold, the count at each step, database versions, exportable as a methods paragraph, counts that cannot drift                                                                                                                                                                                                                                                                              | must     | Partly (W25)                                |
| R10 | Per-type style presets with automatic legend; label collision avoidance; short-code labels with a mapping table; publication export                                                                                                                                                                                                                                                                                   | must     | Partly (collisions: `label-overlap-removal`, planned) |
| R11 | Frequent-hitter and popularity flags (recurring compounds and targets, PAINS); layer-aware or popularity-corrected centrality                                                                                                                                                                                                                                                                                         | should   | No                                          |
| R12 | Numeric measured attributes on any node (log fold change, adjusted p, AUC, Mendelian randomization effect; compound evidence class and content); overlay and filter by measured support; a hub list imported from an external model                                                                                                                                                                                   | must     | Partly (W20 overlays on PPI)                |
| R13 | Correlation-matrix import building a signed, weighted bipartite network with live                                                                                                                                                                                                                                                                                                                                     | r        | and p thresholds                            | must | No  |
| R14 | Prescription-by-herb incidence table projected to a weighted one-mode herb network (count, support, confidence or mutual information), with the cut recorded and changeable, k-core and communities, and traditional-theory attributes (property, flavor, meridian, role) as styling inputs                                                                                                                           | should   | No                                          |
| R15 | One-mode projection of any bipartite layer; degree labeled by layer                                                                                                                                                                                                                                                                                                                                                   | should   | No                                          |
| R16 | Ranking by node attributes beyond topology (content, detectability) for Q-markers                                                                                                                                                                                                                                                                                                                                     | should   | No                                          |
| R17 | Path tracing from a herb through its compounds to a chosen pathway or hub                                                                                                                                                                                                                                                                                                                                             | should   | No (W05 is one shortest path)               |
| R18 | Docking energies as compound-target edge attributes                                                                                                                                                                                                                                                                                                                                                                   | should   | No                                          |
| R19 | Embeddable viewer for database sites: query-time subgraph, expand on click, link out, edge width from confidence, from a multi-million-edge store                                                                                                                                                                                                                                                                     | must     | No                                          |
| R20 | CX2, NDEx, GraphML and XGMML round-trip with Cytoscape and database views                                                                                                                                                                                                                                                                                                                                             | must     | Partly (graph-io reads CX2, XGMML, GraphML) |
| R21 | Offline project: inputs cached so an unreachable database does not break reproduction                                                                                                                                                                                                                                                                                                                                 | should   | No                                          |
| R22 | All of Workflow A without code or internal vocabulary                                                                                                                                                                                                                                                                                                                                                                 | must     | Not as a workflow                           |
| R23 | Re-derivation: replace an input list (compounds after serum profiling, disease genes after GEO) and rebuild every downstream network, count and figure without redoing styling or layout                                                                                                                                                                                                                              | must     | No                                          |
| R24 | A root node that is a single chemical rather than a formula, carrying several chemical identifiers (CAS, PubChem compound id, SMILES, congener name) and predicted-endpoint attributes, with a four-tier figure; and a per-node record of which of several target servers or curated sources contributed it, since merging them is where evidence class is lost                                                       | must     | No; R4 and R5 cover the halves separately   |

**Persona and workflow recommendation.** Adopt the six personas in section 3, with
`network-pharmacology-graduate-student` as the lead and `network-toxicology-researcher` (section 3.6) as the variant
that carries the field's growth; record clinician prescription miners, Q-marker teams and the Northeast Asian (TM-MC)
strand as variants. Do not fold this population into `genomics-cytoscape-user`: that persona
starts from a measured gene list with one node type, this one from a herb name ending in a five-tier typed graph.
Existing W20-W23 cover the PPI, hub and enrichment half; the tiered figure, set intersection as a node-creation step,
provenance and evidence class, measured overlays and re-derivation, the correlation network, prescription mining, the
exposure-to-disease pipeline of Workflow J and the embedded database viewer are new workflows. A neutral graphty-element would expose these as data facts (node
type, list membership, evidence class, source, score, measured values) and a tiered layout option; the application
decides styling and wording.

## 11. Sources

Every source is cited inline where it is used. Short forms: "PMC" followed by digits means
https://pmc.ncbi.nlm.nih.gov/articles/PMC<digits>; fonc.2023.1174848 is
https://www.frontiersin.org/journals/oncology/articles/10.3389/fonc.2023.1174848/full; fphar.2026.1748478 (Diao et
al.), fphar.2025.1566772 (Che and Zhang) and fphar.2024.1303693 (Wang et al.) are under
https://www.frontiersin.org/journals/pharmacology/articles/10.3389/ with "/full" appended; "f1000research 14-1384" is
https://f1000research.com/articles/14-1384. PubMed counts come from
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi with the queries in section 2.1, run 2026-11-25; the
network toxicology journal counts come from the 600 most recent records fetched from
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi on the same date. fphar.2025.1604993 is
https://www.frontiersin.org/articles/10.3389/fphar.2025.1604993/full.
