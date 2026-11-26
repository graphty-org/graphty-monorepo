# Evolutionary Biologists, Population Geneticists and Protein-Family Analysts: Trees, Haplotype Networks, Population Graphs and Similarity Networks

## Summary

A large population of evolutionary biologists, population geneticists, phylogeographers, systematists, conservation geneticists, microbiome researchers and protein-family analysts draws graphs that are inferred from sequences rather than loaded as edge lists. Six graph shapes recur:

- **Phylogenetic trees** (rooted or unrooted, often time-scaled, annotated with support values, clade colors and metadata strips), often in sets of hundreds to thousands (Bayesian posteriors, bootstrap replicates, gene trees).
- **Haplotype networks** (unique sequences as nodes sized by count and split into pie slices by population; edges count mutations; inferred unsampled ancestors).
- **Population-genomic similarity graphs** (individuals as nodes, joined by k-nearest-neighbor or thresholded genetic similarity from genome-wide SNPs, partitioned by community detection), up to identity-by-descent networks of 769,444 people.
- **Admixture graphs and phylogenetic networks** (directed acyclic graphs with drift edges and reticulation edges labeled with admixture proportions).
- **Ancestral recombination graphs** (tree sequences drawn with time fixed on the vertical axis).
- **Protein sequence similarity networks** (proteins as nodes, BLAST edges above an alignment-score threshold; 10^4-10^5 nodes and millions of edges, opened in Cytoscape as XGMML).

Inputs are alignments (FASTA, NEXUS, PHYLIP), genotype files (VCF, PLINK), tree files (Newick, NEXUS, phyloXML), tree sequences (`.trees`) or XGMML. Scale evidence: iTOL stores "more than one and a half million trees from >130 000 individual user accounts" (Letunic and Bork 2024); `ape` had 124,128 CRAN downloads in one month; the EFI web tools for similarity networks report ">9700 users" and ">90,000 EFI-EST jobs". What these users need -- tree layouts with branch lengths and correct rerooting, multi-tree overlays, pie-chart nodes, mutation ticks on edges, k-NN graph building plus community detection, time-fixed layered layouts for directed acyclic graphs, a live edge-threshold filter with cluster recoloring, linked maps and ordination plots, and vector export -- is almost entirely absent from Graphty's current personas and workflows.

The outbreak and pathogen-surveillance side of this population (Nextstrain, UShER, Taxonium, Microreact, MicrobeTrace, GrapeTree) is covered in `public-health-and-molecular-epidemiology.md` and not repeated here.

## 2. Population

**Who they are.** Graduate students, postdocs, faculty and research scientists in evolutionary biology, population genetics and genomics, molecular ecology, phylogeography, systematics, microbial ecology, enzymology and structural biochemistry; museum and herbarium curators; conservation geneticists in wildlife agencies, NGOs and zoos; human and ancient-DNA geneticists, including consumer-genomics companies; DNA barcoding projects; and teaching staff in population-genetics lab courses. Postdoc postings ask for "a PhD in population genetics" with "expertise in phylogenetics, high-throughput sequencing, and bioinformatics" (CNRS Montpellier posting, 2025) or "R or Python, Bash, HPC and Linux" (Rochester phylogenomics posting); specific tool names are rarely stated (no posting naming them was found).

**Sub-populations.**

1. _Phylogeographers and molecular ecologists (single-locus)._ Sequence one to a few loci (mitochondrial COI, cytochrome b, control region; chloroplast regions in plants) from tens to a few thousand individuals, draw a haplotype network beside a map, compute AMOVA, FST and neutrality tests, and date splits with BEAST.
2. _Population genomicists (genome-wide SNPs)._ Human, ancient-DNA, livestock and non-model-organism researchers working from RADseq, SNP arrays or whole genomes, delivered as VCF or PLINK files. Beside PCA and ADMIXTURE they use explicitly graph-based methods: NetView mutual k-nearest-neighbor networks with Walktrap, Infomap or Fast-Greedy community detection (netview R package); NetStruct, which builds a genetic-similarity network, prunes weak edges iteratively and partitions by modularity with permutation tests (Greenbaum, Templeton and Bar-David 2016); identity-by-descent networks at company scale (AncestryDNA: 769,444 connected individuals, partitioned by recursive Louvain modularity in igraph; Han et al. 2017); admixture graphs fitted with ADMIXTOOLS 2; ancestral recombination graphs from tskit tree sequences; and phylogenetic networks with hybrid edges from PhyloNetworks and SNaQ. For this sub-population, k-NN graph construction, modularity and community detection are core methods, not curiosities.
3. _Systematists and taxonomists._ Build species-level trees from multi-locus or phylogenomic data, delimit species (ABGD, ASAP, GMYC, PTP, BINs) and describe new species; the annotated tree is the central figure of a taxonomic paper. DNA barcoding uses neighbor-joining trees as a first look: BOLD's Taxon ID Tree is neighbor-joining, read against a scale legend "usually 2%", and "does not infer phylogenetic relationships" (BOLD FAQ); a classic tropical-Lepidoptera barcoding study used Kimura two-parameter neighbor-joining trees and treated ">2%" within-species divergence as a flag for more sampling, not a species rule (Hajibabaei et al. 2006). Later reference-library work uses many methods side by side: Lee et al. 2019 built FastTree, RAxML, MrBayes and BEAST trees from 1,297 lepidopteran stemborer COI sequences (64 species) and compared GMYC, ABGD, bPTP, mPTP and RESL, using 2% only as a descriptive cutoff for within-species distance.
4. _Conservation geneticists._ Define evolutionarily significant units and management units (MUs) from haplotype or SNP frequency differences among breeding sites or watersheds, and supply baselines for mixed-stock analysis. Example: loggerhead turtle stock structure (Shamblin et al. 2014) from 3,486 samples at 42 rookeries (380 bp) and 3,434 samples at 40 rookeries (760-817 bp), 59 haplotypes, a TCS network, Arlequin AMOVA and pairwise FST, and maps. The longer fragment resolved eight rookery clusters in the Northwest Atlantic, where at least seven MUs had been proposed from 380 bp data, and supported "at least 18 demographically independent management units" worldwide. The study ran no mixed-stock analysis; it provides "a baseline for improved resolution in future MSAs".
5. _Phylogenomicists and comparative biologists._ Hundreds to thousands of gene trees summarized into a species tree (ASTRAL), with conflict shown as pies on branches (PhyParts) or concordance factors (IQ-TREE gCF and sCF), traits mapped onto large dated trees (phytools `contMap`, BioGeoBEARS). Reference trees: 9,993 birds (Jetz et al. 2012), 5,911 mammals (Upham et al. 2019), 353,185 seed plants (Smith and Brown 2018), 2.3 million tips in the Open Tree of Life.
6. _Microbiome and microbial ecologists._ Place 16S amplicon or shotgun features on a reference tree and view it beside a samples-by-features table, sample metadata and a PCoA ordination, in EMPress (a QIIME 2 plugin linked to EMPeror) or iTOL. EMPress is "scalable to trees with well over 500,000 nodes"; its Earth Microbiome Project demo drew a 756,377-node tree beside a 26,035-sample ordination (Cantrell et al. 2021).
7. _Protein-family, enzyme-function and viral-genome analysts._ Enzymologists and structural and evolutionary biochemists build protein sequence similarity networks (SSNs) with EFI-EST, open them in Cytoscape, raise the edge threshold until clusters separate by function, then pass clusters to EFI-GNT for genome-neighborhood analysis. The EFI tools report ">9700 users", ">90,000 EFI-EST jobs" and ">680 articles" citing them (EFI tools paper, 2023). Viral ecologists follow the same pattern with vConTACT2 gene-sharing networks loaded into Cytoscape (workshop tutorials).
8. _Human and forensic mitochondrial geneticists and linguists._ The Fluxus Network program supports DNA, protein, STR and "language/linguistic or manuscript data"; the EMPOP forensic database uses quasi-median networks for quality control.
9. _Teaching staff and students._ Population-genetics lab courses walk students through DnaSP, Arlequin and PopART step by step (Master Labcourse 2024).

**Rough size (evidence only).** iTOL: ">130 000" registered users and over 1.6 million trees (v6, 2024), up from 40,000 users in 2019 and 10,000 in 2016. CRAN downloads 2026-10-26 to 2026-11-24: `ape` 124,128; `adegenet` 37,132; `phangorn` 22,376; `phytools` 13,623; `pegas` 9,191; `poppr` 4,882. Bioconductor `ggtree`: 242,332 distinct IPs in 2025. EFI tools: >9,700 users. Downloads include automated installs and overlap with pathogen genomics, so they bound activity rather than count people. No society membership counts were found.

**How often they touch graph tools.** Project-bursty for phylogeographers and taxonomists (a few networks and trees per paper, redrawn as reviewers ask). A systematist redraws a tree many times as an analysis converges (TreeViewer's authors: a saved style "can also be applied to a different tree" while a Bayesian analysis "has not yet converged"). Comparative biologists and population genomicists script figures in R or Python weekly. Enzymologists iterate an SSN threshold many times in one session.

**Skill profile.** Very high literacy in their own models (substitution models, support, coalescent, clocks, f-statistics). Single-locus phylogeographers and taxonomists rarely use centrality or community detection; population genomicists and SSN users do use community detection, k-NN graphs, modularity and connected components (sub-populations 2 and 7), and the AncestryDNA study used spectral embedding of the IBD graph. Coding ranges from GUI-only (PopART, DnaSP, MEGA, FigTree, iTOL, Arlequin, Cytoscape) to heavy R (`ape`, `phytools`, `ggtree`, `pegas`, `admixtools`, `netview`), Python (`tskit`, QIIME 2) and command line (IQ-TREE, BEAST, ASTRAL, PLINK). A recurring complaint is the many-program pipeline: "typically separate programs are required for phasing, reformatting of input files, and haplotype network construction" (Hapsolutely, Vences et al. 2024); tree figures need "multiple different programs" and then "need to be exported and edited using other software" (TreeViewer, Bianchini and Sanchez-Baracaldo 2024).

**Team context.** Small labs; field collectors and museum collections supply tissues; a sequencing core or the student produces data; the student analyzes; the PI reviews figures. Data go to GenBank, Dryad or Zenodo, BOLD for barcodes; genomic data to SRA or ENA.

## 3. Personas

### Persona A: Dr. Lucia Ferreira -- phylogeographer and molecular ecologist (id: phylogeographer-population-geneticist)

- **Role.** Postdoc studying how glaciation, rivers or islands shaped genetic structure in a frog, bird or plant.
- **Tools today.** Geneious or MEGA for alignment; DnaSP for haplotypes and populations; PopART (MSN, TCS or median-joining); Arlequin for AMOVA and FST; BEAST and FigTree for dating; QGIS or R for the map; Illustrator for the multi-panel figure. Sometimes `pegas`.
- **Data.** 100-600 individuals from 10-40 sites, 500-1,200 bp of mtDNA, 10-80 haplotypes; a sample sheet with site, latitude, longitude, region and lineage.
- **Goals.** A network with pies by region beside a map with pies at sites, consistent colors, and a table of diversity, Tajima's D and AMOVA; an argument about refugia, expansion or barriers.
- **Frustrations.** The PopART traits block is typed by hand into the NEXUS file ("The trickiest part of building the network was to figure out how to display the sample ancestry", dcsoto 2024); loading fails until "Files of type" is set to "All Files"; overlapping pies in R (Paradis: "There is no simple way to handle your problem", r-sig-genetics 2022); gap sites silently masked so distinct haplotypes merge (PMC6490880); reviewers question median-joining networks (Kong et al. 2016).

### Persona B: Dr. Kwame Asante -- systematist and taxonomist (id: molecular-systematist-taxonomist)

- **Role.** Museum curator or assistant professor describing species and revising a genus.
- **Tools today.** MAFFT; IQ-TREE with ModelFinder and ultrafast bootstrap; MrBayes or BEAST with Tracer and TreeAnnotator; ASAP, ABGD, mPTP and BOLD BINs; FigTree; iTOL; DensiTree for posterior sets; Illustrator.
- **Data.** 50-2,000 terminals, each a voucher id plus GenBank accession; multi-locus alignments; a table of names, localities and delimitation results; posterior samples of thousands of trees.
- **Goals.** A rooted tree with support values, low-support clades collapsed, delimitation bars beside tips, new species highlighted; evidence that the Bayesian run converged.
- **Frustrations.** Support values stored as Newick node labels move to wrong branches on rerooting ("8 of 20 tools exhibit incorrect behavior when rerooting trees", Czech, Huerta-Cepas and Stamatakis 2017; Biostars 9616443); limited FigTree annotation; iTOL "unrestricted use ... requires a paid subscription" (TreeViewer paper); final layout always in Illustrator.

### Persona C: Dana Whitfield -- agency conservation geneticist (id: conservation-geneticist)

- **Role.** Geneticist in a wildlife or fisheries agency or NGO lab advising managers on stock and population units.
- **Tools today.** Sequencher or Geneious; Arlequin; TCS or PopART; mixed-stock analysis software downstream; maps from GIS staff or online tools (the loggerhead study used the seaturtle.org Maptool); increasingly SNP panels.
- **Data.** Thousands of samples accumulated over years (3,434 loggerhead samples from 40 rookeries, 59 haplotypes), haplotype names shared across labs (CC-A2.1), and location precision limits for endangered species (an assumption; no source read).
- **Goals.** Show managers which rookeries or watersheds differ, defend MU boundaries with tests (FST = 0.349, p < 0.0001 among loggerhead rookeries), update figures as samples arrive, keep haplotype names stable, publish frequency baselines that others use for mixed-stock analysis.
- **Frustrations.** Common haplotypes on short fragments hide structure until longer sequences split them (at least seven Northwest Atlantic MUs proposed from 380 bp; eight rookery clusters and at least 18 MUs worldwide resolved with the 760-817 bp fragment); every update re-runs four programs; map and network drawn separately so colors drift.

### Persona D: Dr. Mira Okonkwo -- phylogenomicist and comparative biologist (id: phylogenomics-comparative-biologist)

- **Role.** Faculty member resolving a clade from hundreds of loci and testing trait evolution on the result.
- **Tools today.** IQ-TREE (including gCF and sCF), ASTRAL, PhyParts with PhyParts_PieCharts, DiscoVista, DensiTree; `ape`, `phytools`, BioGeoBEARS, TreeDist; ggtree; Dendroscope and SplitsTree; PhyloNetworks and SNaQ when hybridization is suspected.
- **Data.** 50-500 taxa by 300-5,000 gene trees; dated species trees; trait tables; reference trees of 5,000-350,000 tips.
- **Goals.** Show where gene trees agree and conflict on each branch; compare concatenation and coalescent trees; draw a network with hybrid edges and inheritance proportions; publish from scripts.
- **Frustrations.** PhyParts needs Maven, Java and git to build; BioGeoBEARS node pies become "completely obscured and impossible to interpret because the slices are way too small" (BioGeoBEARS group, 2025); tanglegrams "scale poorly to large trees" (Phylo.io paper); classic viewers "cannot display large-scale trees with more than a few thousand nodes" (Pavlopoulos et al. 2010).

### Persona E: Dr. Arjun Mehta -- population and ancient-DNA genomicist (id: population-genomics-snp-analyst)

- **Role.** Postdoc or staff scientist in a human, ancient-DNA, livestock or non-model-organism genomics group.
- **Tools today.** bcftools and PLINK for VCF filtering and distances; PCA (PLINK, smartpca) and ADMIXTURE; `netview` in R for mutual k-NN networks; NetStruct; ADMIXTOOLS 2 (`qpgraph`, `find_graphs`, `plot_graph`); tskit and `tskit_arg_visualizer` in Jupyter; PhyloNetworks for species networks.
- **Data.** Hundreds to tens of thousands of individuals by 10^4 to 10^7 SNPs in VCF or PLINK; an N x N distance matrix; metadata with population, region and sample age; tree sequences of thousands to millions of nodes.
- **Goals.** Show fine-scale structure (families, sub-populations) that PCA blurs; test which admixture graph fits f-statistics; show where gene flow occurred and how much (gamma); explore local genealogies along the genome.
- **Frustrations.** No objective rule for k ("There is no suitable objective procedure to optimize k-NN", Neuditschko et al. 2012); many admixture graphs fit equally well ("A low score doesn't mean that an admixture graph is a good model of reality", ADMIXTOOLS 2 vignette); force layouts of ARGs "can be confusingly tangled and hard to interpret for larger empirical ARGs" (Kitchens and Wong 2025).

### Persona F: Dr. Hana Kowalski -- protein-family and enzyme-function analyst (id: protein-family-ssn-analyst)

- **Role.** Enzymologist or structural biochemist choosing targets for characterization in an uncharacterized protein family; or a viral ecologist classifying phage genomes.
- **Tools today.** EFI-EST, EFI-GNT, Cytoscape (filters, layouts, style by attribute); for viruses, vConTACT2 into Cytoscape.
- **Data.** XGMML networks of 10^3 to 10^5 nodes and 10^5 to 10^8 edges, UniRef or CD-HIT representative-node networks, node attributes (UniProt ids, SwissProt functions, taxonomy, length, sequence counts per representative node).
- **Goals.** Find the alignment-score threshold at which clusters are isofunctional; color clusters by known function; find clusters with no characterized member; send clusters to genome-neighborhood analysis.
- **Frustrations.** Full networks are "~ 500 MB and greater"; desktop Cytoscape handles "a few thousand nodes ... and less than ~ 500,000 edges" (EFI download tutorial); a 47.5-million-edge network "is too large to be analyzed with Cytoscape using most desktop/laptop computers" (EFI tools paper, 2023); annotation tables fail to attach unless the right key column is chosen (vConTACT2 issue 69).

## 4. Use cases (ranked)

| Rank | Question answered with a graph                                                                                                           | Who                                         | Frequency                               | Stakes                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| 1    | How are the samples related, and how well supported is each group? (annotated tree)                                                      | All                                         | Every paper                             | Wrong rooting or misplaced support is a published error |
| 2    | How are haplotypes related and distributed across places? (network with pies beside a map)                                               | Phylogeographers, conservation              | Every phylogeography paper              | Refugia, expansion, barriers, management units          |
| 3    | What population structure exists among genotyped individuals? (k-NN or similarity graph with communities, compared to PCA and ADMIXTURE) | Population genomicists, conservation        | Every genomics paper                    | Units of management, ancestry reports                   |
| 4    | Which proteins in a family share a function? (SSN thresholded until clusters separate)                                                   | Enzymologists, viral ecologists             | Weekly to per project                   | Choice of targets for lab characterization              |
| 5    | When did lineages split, and how did they spread? (time-scaled tree, phylogeography)                                                     | Phylogeographers, comparative biologists    | Per project                             | Dates and routes in the abstract                        |
| 6    | How certain is the tree? (posterior or gene-tree sets: overlay, consensus, concordance)                                                  | Systematists, phylogenomicists              | Every Bayesian or phylogenomic analysis | Whether a relationship is reported as resolved          |
| 7    | Which admixture or hybridization history fits? (admixture graph, phylogenetic network with gamma)                                        | Population genomicists, phylogenomicists    | Per project                             | Headline claims about gene flow                         |
| 8    | Is this one species or several? (tree plus delimitation bars)                                                                            | Taxonomists, barcoding                      | Per revision                            | Formal nomenclatural act                                |
| 9    | Where do trees disagree? (tanglegram, conflict pies, split network)                                                                      | Phylogenomicists, host-parasite researchers | Per project                             | Reported resolution                                     |
| 10   | Which microbial lineages differ between sample groups? (tree with abundance barplots linked to ordination)                               | Microbiome researchers                      | Per study                               | Biological interpretation of community shifts           |
| 11   | How did a trait or range evolve? (states mapped onto a tree)                                                                             | Comparative biologists                      | Per project                             | Main result of comparative papers                       |
| 12   | What genealogies lie along this genome region? (ARG)                                                                                     | Population geneticists                      | Occasional, growing                     | Inference of recombination and selection                |

## 5. Step-by-step workflows

### 5.1 Haplotype network with population pies in PopART (lab course)

Sources: Master Labcourse 2024 (hackmd); dcsoto 2024 blog; PopART manual outline; Leigh and Bryant 2015.

1. **Sequences.** Edit Sanger reads in BioEdit or Sequencher (reverse-complement, merge, trim), check with BLAST, align (MUSCLE in MEGA or ClustalW). Save FASTA. Hours to days.
2. **Haplotypes in DnaSP.** File > Open Data File (filter "All files"); Data > Format, mtDNA, haploid; Overview > Polymorphism Data for haplotype count, S, Hd and Pi; Data > Define Sequence Sets to assign populations. Export a NEXUS "with the sequences clustered into populations" and Arlequin `.arp` files; check no group is named "Additional_Seqs" (ungrouped samples).
3. **Traits block by hand.** Append `BEGIN TRAITS; Dimensions NTRAITS=5; Format labels=yes missing=? separator=Comma; TraitLabels CO LP MD RN U; Matrix` then rows like `C007 1,0,0,0,0`, then `; end;`. "Individual names and order must match the start of the NEXUS file." PopART also reads delimited trait and geotag tables (manual snippet).
4. **Load.** NEX toolbar button; if grayed out, set "Files of type" to "All Files(*)".
5. **Algorithm (Network menu).** MSN with epsilon (0 common), TCS, median-joining, tight span walker, integer neighbor-joining. Users choose by habit, reviewer expectations and whether they want reticulations shown.
6. **Read.** Circle area is haplotype frequency; slices are populations; hatch marks count mutations; small black dots are inferred unsampled haplotypes. Statistics > Identical Sequences lists merged samples; gap or ambiguous sites are masked, merging haplotypes (PMC6490880).
7. **Style.** Palette, colors, vertex sizes, fonts; drag nodes by hand to remove overlaps.
8. **Map view.** With geotags loaded, pies are drawn at sampling sites on a built-in base map in the same colors (BMC Plant Biology 2024 figure). Exact menu steps: no source found.
9. **Statistics.** Tajima's D, AMOVA, nucleotide diversity.
10. **Arlequin in parallel.** Add a `[[Structure]]` block, run Standard AMOVA and pairwise FST, open `*_main.htm` (Edge needs "Reload in Internet Explorer mode"). Read FST against Wright's thresholds (below 0.05 low; above 0.25 very high).
11. **Export.** SVG or PNG; assemble with map, tree and statistics table in Illustrator or Inkscape.

Decision points: algorithm; gap coding; grouping level (site, region, lineage); manual node placement.

### 5.2 Haplotype network in R with pegas

Source: Paradis, "Plotting haplotype networks with pegas" vignette; r-sig-genetics 2022.

1. `x <- read.dna("aln.fas", format = "fasta")`; `h <- haplotype(x)`; `d <- dist.dna(h, "N")`.
2. Method: `haploNet(h)` (TCS), `mst(d)`, `msn(d)`, `rmst(d)` or `mjn(x, epsilon = 0)`.
3. `sz <- summary(h)`; `R <- haploFreq(x, fac = region, haplo = h)`.
4. `plot(nt, size = sz, pie = R, legend = ...)`; `threshold` controls which alternative links are drawn (dashed); layout is equal-angle then energy minimization; "backbone MST is arbitrary with respect to the rest of the network".
5. `mutations()` and `show.mutation` annotate links with mutations.
6. Overlap: `replot()` lets the user drag nodes and returns reusable coordinates; Paradis's workaround is square-root sizes, link lengths "equal to the sum of the sizes of their respective symbols", and no labels.
7. PDF, often finished in Illustrator. Related: `haplotypes` (`parsimnet`, 95% connection limit), `sidier`.

### 5.3 Median-joining in Network (Fluxus) and TCS with tcsBU

Sources: Fluxus netwinfo; Network user guide; Bandelt, Forster and Rohl 1999; TCS (Clement et al. 2000); tcsBU (Murias dos Santos et al. 2015).

1. **Network (Windows only).** Import sequence, STR or binary data; optionally weight characters; Median-Joining or Reduced Median; Star Contraction for large sets. Start at epsilon 0 and re-run higher, accepting longer runtimes; optional MP post-processing removes superfluous median vectors.
2. **Draw and the paid Publisher add-on** add population coloring and counts; Network can estimate ages of ancestral nodes.
3. **TCS.** Join haplotypes at one, two, ... changes "until all the haplotypes are included in a single network or the parsimony connection limit is reached" (95%); may yield disconnected networks; the spring layout needs cleanup.
4. **tcsBU.** Load TCS output in a browser, assign groups, draw pie nodes with a force layout, save SVG.

### 5.4 Build, root and annotate a tree (IQ-TREE, FigTree, iTOL, ggtree)

Sources: BEAST FigTree workshop; iTOL v6 paper and templates; ggtree book; Czech et al. 2017; TreeViewer paper.

1. **Infer.** MAFFT; IQ-TREE (ModelFinder; ultrafast bootstrap and SH-aLRT, written as "SH-aLRT/UFBoot" node labels) or MrBayes or BEAST (NEXUS with `[&posterior=...]`).
2. **Root in FigTree.** Root by outgroup or midpoint; Order nodes; display support. Check that support moved with its branch (8 of 20 tools misplaced it; Dendroscope before 3.5.0 produced a published error).
3. **Collapse and highlight.** Collapse clades below a support threshold (commonly 70% bootstrap or 0.95 posterior; common practice, no single source); ggtree `collapse`, `geom_hilight`.
4. **Annotate.** FigTree: File > Import Annotations (tab-delimited, keyed by tip). iTOL: drag annotation files onto the tree: `DATASET_COLORSTRIP`, `DATASET_BINARY`, `DATASET_SIMPLEBAR`, `TREE_COLORS`, `COLLAPSE`; v6 adds regex and substring matching, a bulk label editor and clade collapsing from a text file. `itol.toolkit` writes "all 114 themes among all 23 template types". ggtree: `%<+%` joins a data frame, `gheatmap()` aligns a heatmap, `msaplot()` an alignment.
5. **Layout.** Rectangular (default), slanted, circular and fan, unrooted equal-angle or daylight, cladogram; aligned tip labels; ladderize.
6. **Export.** PDF, SVG, PNG (iTOL through a queued export server); then Illustrator for labels, scale bars and fonts. TreeViewer saves the whole pipeline so the style reapplies to a new tree.

Time: an afternoon for a first figure; repeated after every analysis change.

### 5.5 Bayesian tree: convergence, summary and time-scaled view (Tracer, TreeAnnotator, FigTree, SpreaD3)

Sources: Taming the BEAST "Introduction to BEAST2"; BEAST FigTree workshop; SpreaD3 (Bielejec et al. 2016); phytools `phylo.to.map`; BioGeoBEARS docs.

1. **Run BEAST** with tip dates or fossil calibrations and, for phylogeography, a location trait. Output: a `.log` of parameters and a `.trees` file of thousands of sampled trees.
2. **Convergence in Tracer.** File > Import Trace File; set burn-in ("always throw out at least the first 10% of the whole chain length", up to 50% in some cases); aim for ESS above 200; "ESS values below 100 are coloured in red". If many are red or yellow, run longer. Tracer inspects parameters, not tree topologies.
3. **Summarize in TreeAnnotator.** Burn-in percentage 10; posterior limit 0 annotates all nodes, 0.5 only majority clades; target tree type "Maximum clade credibility tree" (the sampled tree with the highest product of clade posteriors) or "MAP(CCD0)", which can return "a tree that would be well supported but has not been sampled"; node heights "Mean heights" in the tutorial (median and common-ancestor heights are also offered; no source read compares them).
4. **Overlay the posterior in DensiTree.** File > Load the `.trees` file directly (no summary needed); turn on Consensus Trees and the Central view; Clades > Show clades with support text; Help > View clades lists every clade with its posterior. The overlay shows "well-supported clades", height distributions and topological uncertainty.
5. **FigTree on the summary tree.** Order nodes decreasing; Node Labels = posterior; Node Bars = `height_95%_HPD`; Scale Axis with Reverse axis; for dated outbreaks, offset the axis to the most recent sample date.
6. **Spatial view.** SpreaD3 renders BEAST output as an animated D3 map with Bayes-factor-supported rates or HPD contours; SPREAD 4 is the web successor. Without BEAST, `phytools::phylo.to.map` links tips to map points and rotates nodes to reduce crossings.
7. **Ancestral ranges.** BioGeoBEARS `plot_BioGeoBEARS_results(plotwhat = "pie")`; pies become unreadable with many states.

### 5.6 Gene-tree sets, conflict and tree comparison

Sources: Lanfear concordance-factor page; PhyParts_PieCharts; Dendroscope 3; phytools `cophylo`; TreeDist; SplitsTree App; phangorn Networx.

1. **Concordance factors.** "Estimate a concatenated tree; estimate the single-locus trees; and then calculate the gCF and sCF values using the concatenated tree as a reference tree" in IQ-TREE. Output `concord.cf.tree` labels each branch "bootstrap / gCF / sCF"; `concord.cf.stat` has one row per branch, which users plot in R (gCF against sCF).
2. **PhyParts pies.** Run PhyParts over all gene trees against the species tree; pies per branch: concordant (blue), top alternative (green), other conflict (red), uninformative (gray), counts above and below.
3. **Overlay.** DensiTree overlays hundreds of gene trees or bootstrap trees on the same taxa; consensus trees summarize them.
4. **Tanglegram.** Two trees in Dendroscope (crossing minimization, unequal taxon sets) or `phytools::cophylo`; eMPRess for host-parasite reconciliation.
5. **Distances.** `TreeDist::TreeDistance` (generalized Robinson-Foulds) and `MapTrees()` for tree space.
6. **Split network.** SplitsTree App: alignment to p-distances to Neighbor-Net by default; the workflow is a saved provenance graph reapplied to new data.

### 5.7 Population structure as a graph from SNPs (NetView, NetStruct)

Sources: netview README; Neuditschko et al. 2012; Steinig et al. 2016; Greenbaum et al. 2016.

1. **Filter genotypes.** VCF or PLINK; quality control such as removing samples or SNPs with call rates below 90% (Neuditschko 2012) and keeping per-sample missingness below 10% (netview README).
2. **Distance matrix.** A symmetrical N x N matrix: PLINK allele-sharing distance, cophenetic distance from a tree, or Hamming distance over a SNP alignment (netview README). NetStruct instead uses a frequency-weighted allele-sharing similarity that up-weights shared rare alleles.
3. **Metadata.** A table with `ID`, `Colour` and `Group` columns in the same order as the matrix.
4. **Build graphs over a range of k.** `netview(distMatrix, metaData, k = 10:60, cluster = TRUE, mst = FALSE, networkD3 = FALSE, save = FALSE)` returns one mutual k-NN graph per k; `mst = TRUE` adds minimum spanning tree edges so no individual is isolated.
5. **Choose k.** `plotSelection(graphs)` plots how many communities each k yields; the original authors say there is no objective procedure, default to k = 10, and suggest lower k (3 recovered five populations) for small samples.
6. **Community detection.** Defaults are Walktrap, Infomap and Fast-Greedy; nodes are colored by group label to compare detected communities with sampling populations. The 2012 version used super-paramagnetic clustering and drew networks in Cytoscape with organic or circular layouts, node size by degree and edge thickness by relationship strength.
7. **NetStruct variant.** Prune edges below a rising threshold, re-run modularity-based community detection at each level to get a hierarchy, test modularity by permutation, and report each individual's strength of association to its community.
8. **Compare and export.** Put communities beside ADMIXTURE bar plots and PCA (netview wraps `runAdmixture` and `plotAdmixture`); save as GML or as an interactive D3 HTML page.

Decision points: distance measure, k or threshold, community algorithm, whether to add MST edges.

### 5.8 Identity-by-descent network at company scale

Source: Han et al. 2017 (AncestryDNA).

1. Phase genotypes; detect IBD segments (distributed GERMLINE, minimum 5 cM) among 774,516 people.
2. Keep pairs sharing over 12 cM ("over 500 million such pairs"); weight edges from a Beta cumulative distribution; drop edges above 72 cM (close relatives, 0.2% of edges).
3. Partition the 769,444-vertex connected component by Louvain modularity in igraph: six top-level clusters, then recursively split the five largest; Infomap and label propagation were tried and did not find the substructure.
4. Laplacian eigenmap embedding (40 eigenvectors) for stable subsets; plot samples in pairs of spectral dimensions colored by cluster, and map clusters to birth locations of ancestors.

### 5.9 Admixture graph in ADMIXTOOLS 2

Source: ADMIXTOOLS 2 graphs vignette and reference.

1. Compute f2 statistics from genotype files with `extract_f2()` (saved to disk; reload with `f2_from_precomp()`).
2. Define a topology as a two-column `from`, `to` edge list, `edges_to_igraph()`, check with `is_valid()` (directed, acyclic, at most two parents), and draw it with `plotly_graph()`; `unidentifiable_edges()` and `highlight_unidentifiable = TRUE` mark parameters the data cannot determine.
3. `qpgraph(f2_blocks, graph)` fits drift lengths and admixture weights from 10 random starts; `res$edges`, `res$score`.
4. `find_graphs(f2_blocks, numadmix = 3, outpop = ..., stop_gen = 100)` searches topologies; run many times because it "can get stuck in local optima"; `graph_plusone()` and similar functions generate neighbors for semi-manual search.
5. `plot_graph(res$edges)` or `plotly_graph()` draws the directed graph with drift lengths and admixture percentages on edges; `plot_graph_map()` puts it on a map.
6. Compare: out-of-sample `score_test`, bootstrap `qpgraph_resample_multi()` plus `compare_fits()`. Because several very different graphs often fit, users look for features shared across good graphs. TreeMix and OrientAGraph are alternative tools (not read for this document).

### 5.10 Ancestral recombination graph in tskit_arg_visualizer

Source: tskit_arg_visualizer README and tutorial; Kitchens and Wong 2025.

1. Infer or simulate a tree sequence (`.trees`) with tskit-compatible tools; load in Python in Jupyter.
2. `d3arg = D3ARG.from_ts(ts=ts)`; `d3arg.draw(edge_type="ortho")` for full ARGs with recombination nodes or `"line"` for many-child nodes; `y_axis_scale` = `"rank"`, `"time"` or `"log_time"`.
3. Layout: D3 force simulation with node heights fixed by age and samples ordered by the first tree; only x moves; users drag nodes sideways to remove crossings, which pins them.
4. Hover a genome-bar segment to highlight that local tree; hover an edge to see which genome regions it spans; style nodes, edges, mutations and breakpoints with `set_*` methods; `draw_node()` draws a subgraph around one node.
5. Download as JSON, SVG or PNG (SVG styles may break in Illustrator). Examples range from 14 modern and 3 ancient human samples at one gene to a SARS-CoV-2 ARG of about 2.7 million nodes; the authors note large empirical ARGs can be "confusingly tangled".

### 5.11 Phylogenetic network with hybrid edges (SNaQ, PhyloPlots)

Source: PhyloNetworks plotting manual.

1. Estimate gene trees, compute quartet concordance factors, run SNaQ for h = 0, 1, 2 ... reticulations; networks are extended Newick with gamma on hybrid edges ("the proportion of genes inherited via each parent at a reticulation event").
2. `plot(net, showgamma=true)` prints gamma below each hybrid edge; `showedgenumber=true` helps pick an edge to reroot on; major and minor hybrid edges get separate colors, minor ones arrows; styles `:majortree` or `:fulltree`.
3. Compare networks with hardwired-cluster distance; write for Dendroscope with `di=true` (which loses gamma).

### 5.12 Microbiome tree with sample data (EMPress)

Sources: EMPress paper and README.

1. From QIIME 2: a rooted tree (`Phylogeny[Rooted]`), a feature table, sample metadata, feature taxonomy, and a PCoA or biplot.
2. `qiime empress community-plot --i-tree rooted-tree.qza --i-feature-table table.qza --m-sample-metadata-file sample_metadata.tsv --m-feature-metadata-file taxonomy.qza --i-pcoa biplot.qza --p-filter-extra-samples --p-number-of-features 10`; output `.qzv` viewed in a browser.
3. The tree is sheared to features in the table by default; choose rectangular, circular or unrooted layout.
4. Add tip barplots: stacked bars of each sample category's share per tip, or color- or height-graded bars for continuous metadata (pH for 4,002 samples in the paper).
5. Linked views: clicking a tip or clade highlights samples in the ordination; selecting samples highlights tree nodes; biplot arrows highlight their features.

### 5.13 Protein sequence similarity network (EFI-EST, Cytoscape, EFI-GNT)

Sources: EFI-EST analysis and download tutorials; EFI tools paper, 2023; vConTACT2 tutorials.

1. **Input.** A Pfam or InterPro family, a BLAST query, FASTA or accession list; optional fragment, length and taxonomy filters. EFI-EST runs all-by-all BLAST.
2. **Read four plots.** Edges per alignment score, length histogram (single-domain, multidomain or fragments), and alignment length and percent identity by alignment score.
3. **Pick a starting threshold.** Isofunctional families "often share >40% sequence identity"; start lower, "e.g., 35%", so families are not split (score 50 in the proline racemase example, 100 for a multidomain example). Name the network; a download link arrives by email and is "active for 14 days".
4. **Download.** Full network ("~ 500 MB and greater"; not generated above 10 million edges) or representative-node networks merged by CD-HIT at 40-100% identity in 5% steps. Desktop Cytoscape manages "a few thousand nodes ... and less than ~ 500,000 edges".
5. **Cytoscape.** File > Import > Network (XGMML); organic layout; filter out edges below a higher alignment score; re-lay out; repeat until clusters with known SwissProt functions separate.
6. **Color and analyze.** EFI's Color SSN utility numbers and colors clusters and lists SwissProt functions and FASTA per cluster; Cluster Analysis builds alignments, logos and HMMs.
7. **Genome context.** EFI-GNT returns genome neighborhood networks and diagrams (plus or minus 20 genes) for each cluster.
8. **Viral variant.** vConTACT2 writes `c1.ntw`; import as a network, then import `genome_by_genome_overview.csv` with the Genome column as key or the data will not attach.

Scale: a UniRef90 SSN of 5,801 nodes had 2,133,174 edges; a UniRef50 SSN of 63,359 nodes had 65 million edges and needed a 1.5 TB machine (EFI tools paper, 2023).

## 6. Data

**Sources.** Own sequencing; GenBank; BOLD; museum databases; VertLife posterior tree sets; Open Tree of Life; Dryad and Zenodo; 1000 Genomes and ancient-DNA compilations; UniProt, Pfam and InterPro (via EFI); QIIME 2 artifacts.

**Formats.**

- Alignments: FASTA, NEXUS, PHYLIP, GenBank; Arlequin `.arp`; PopART TRAITS and GEOTAGS blocks and delimited tables.
- Genotypes: VCF; PLINK `.bed/.bim/.fam` and `.ped/.map`; EIGENSTRAT; ADMIXTOOLS 2 f2 block directories; N x N distance matrices.
- Trees: Newick (support as inner node labels, an ambiguity), NEXUS TREES with TRANSLATE and BEAST `[&key=value]`, multi-tree `.trees` and Newick files with thousands of trees, NHX, phyloXML, extended Newick with gamma for networks, QIIME 2 `.qza`; iTOL also reads placement files.
- Graphs: admixture graphs as `from`, `to` edge lists, DOT or qpGraph graph files; tree sequences (`.trees`, tskit); SSNs as XGMML; vConTACT2 `c1.ntw` edge lists; netview GML.
- Annotation side files: iTOL dataset templates; FigTree tab-delimited annotations; feature tables and sample metadata TSV; species partitions in SPART.

**Typical sizes.**

- Haplotype networks: 10-80 haplotypes from 50-3,500 sequences; above a few hundred haplotypes median-joining networks become "too complex and fraught with reticulations" (EMPOP).
- Trees: tens to a few thousand tips for publication; 5,911 to 353,185 for reference trees; 2.3 million (Open Tree); 756,377-node microbiome trees (EMPress).
- Tree sets: thousands of posterior trees; hundreds to thousands of gene trees on the same taxa.
- Population graphs: 400-1,400 individuals in NetView papers; IBD network of 769,444 vertices and over 500 million pairs.
- Admixture graphs: tens of nodes, a handful of admixture events.
- ARGs: tens of nodes for teaching to about 2.7 million nodes.
- SSNs: 5,801 nodes and 2.1 million edges to 63,359 nodes and 65 million edges; EFI refuses to write XGMML above 200 million edges.

**Identifiers.** Tip labels must match metadata keys exactly; Newick forbids spaces, so tools substitute underscores; tips mix voucher number, accession and species name and are split by regex; haplotype names must stay stable but DnaSP and PopART renumber per run; SSN nodes carry UniProt ids, representative nodes carry lists of them.

**Graph properties.** Trees: hierarchical, weighted by length or time, attributes on branches (support) and nodes (ages, HPD intervals, ancestral-state vectors). Haplotype networks: undirected, integer mutation weights, inferred nodes, per-node composition vectors. Population graphs: undirected, weighted, k-regular-ish, partitioned. Admixture graphs, phylogenetic networks and ARGs: directed acyclic, nodes with two parents, time on one axis, gamma or admixture weight on hybrid edges, recombination breakpoints on ARG edges. SSNs: undirected, dense within clusters, edges weighted by alignment score, many components. Most data carry coordinates and dates.

**Sensitivity.** Mostly public after publication. Endangered-species localities are generalized (general practice; no source read). Human genotypes and IBD networks are personal data; human mtDNA is personal data in forensics.

## 7. Analysis methods

- **Haplotype network inference.** MSN (epsilon), TCS (95% limit), median-joining (epsilon, MP post-processing), reduced median, randomized MST, tight span walker, integer neighbor-joining, Fitchi genealogies, haplowebs (Flot et al. 2010), Neighbor-Net.
- **Method controversy.** Kong et al. (2016) argue MJNs "cannot yield defensible evolutionary interpretations"; their 2023 follow-up found MJN and Bayesian branching "significantly different in 37.6% of cases"; simulations (Cassens et al. 2005) favor MJN when ancestors are unsampled. Users often show a network and a tree together.
- **Population statistics.** Hd, Pi, Tajima's D, Fu's Fs, mismatch distributions, AMOVA, pairwise FST, Mantel tests, PCA, ADMIXTURE, STRUCTURE, f-statistics (f2, f3, f4, D).
- **Graph methods on genotypes.** Mutual k-NN graph construction from a distance matrix; MST augmentation; community detection (Walktrap, Infomap, Fast-Greedy, Louvain, super-paramagnetic clustering); modularity with permutation tests; iterative edge pruning for hierarchy; spectral embedding of the graph Laplacian; connected components.
- **Graph methods on proteins.** Edge thresholding by alignment score, connected components as putative isofunctional families, representative-node collapse, coloring by annotation.
- **Tree inference and support.** ML with bootstrap and SH-aLRT; Bayesian posterior; ASTRAL local posterior; gCF and sCF; MCMC convergence (ESS, burn-in).
- **Tree operations.** Reroot, ladderize, rotate, collapse, prune, extract subtree, consensus and MCC summary, overlay of tree sets, Robinson-Foulds, tanglegrams, ancestral states, dating, placement.
- **Networks with reticulation.** Admixture graph fitting and search (qpGraph, `find_graphs`), SNaQ, ARG inference and display.
- **Species delimitation.** Distance flags (2% COI as a working flag), ABGD, ASAP, GMYC, PTP, mPTP, bPTP, RESL, BINs.
- **Validation habits.** Several network algorithms and delimitation methods, reporting congruence; several k or thresholds; repeated graph searches; ESS checks; support checks after rerooting.

## 8. Outputs and collaboration

- **Deliverables.** Journal figures (network plus map plus statistics table; annotated tree plate; dated tree with HPD bars; conflict pies; population network beside ADMIXTURE bars; admixture graph with percentages; SSN colored by cluster), agency management reports, species descriptions, ancestry reports to consumers. Interactive: iTOL links, SpreaD3 pages, QIIME 2 `.qzv` files, D3 HTML from netview and tskit_arg_visualizer, Cytoscape sessions.
- **Finishing.** Nearly every workflow ends in Illustrator or Inkscape; SVG and PDF are non-negotiable.
- **Reproducibility.** Journals require accessions and increasingly alignments and trees; hand-dragged haplotype networks are rarely reproducible; TreeViewer, SplitsTree and script-based tools make the pipeline a saved object.
- **Sharing.** iTOL workspaces; QIIME 2 View; emailed PDFs; no evidence of real-time co-editing.

## 9. Tools landscape and pain points

| Tool                             | Used for                                      | Loved for                             | Fails them                                                                                          |
| -------------------------------- | --------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PopART                           | MSN, TCS, MJN networks; map; stats            | All-in-one, free, pies and map        | Hand-typed traits; file filter bug; gap masking; manual dragging; no evidence of active maintenance |
| Network (Fluxus)                 | MJN, reduced median                           | Reference implementation              | Windows only; paid Publisher add-on                                                                 |
| TCS plus tcsBU                   | Parsimony networks                            | Statistical connection limit          | Layout cleanup; disconnected results                                                                |
| pegas, haplotypes (R)            | Networks and pies                             | Scriptable                            | "No simple way" to stop pie overlap                                                                 |
| DnaSP, Arlequin, MEGA            | Haplotypes, AMOVA, FST                        | Standard in teaching                  | Windows; Arlequin output needs IE mode                                                              |
| FigTree                          | Root, time axis, HPD bars                     | Simple, BEAST-aware                   | Limited annotation; static                                                                          |
| Tracer, TreeAnnotator, DensiTree | Convergence, summary, overlay of tree sets    | Standard BEAST companions             | Three separate programs; DensiTree is desktop Java                                                  |
| iTOL                             | Annotated trees, datasets, sharing            | Rich datasets, regex, scale           | Paid subscription for unrestricted use; closed source                                               |
| ggtree, phytools, ape            | Scripted figures                              | Reproducible                          | Requires R                                                                                          |
| Dendroscope, SplitsTree          | Large trees, tanglegrams, split networks      | Scale, provenance                     | Desktop; specialist                                                                                 |
| netview, NetStruct               | k-NN and similarity graphs with communities   | Fine-scale structure PCA misses       | No objective k; GML or D3 export only                                                               |
| ADMIXTOOLS 2                     | Admixture graph fit, search, plot             | Fast search, interactive plotly graph | Many equally fitting graphs; local optima                                                           |
| tskit_arg_visualizer             | ARGs in Jupyter                               | Time-fixed interactive layout         | Tangled for large ARGs; manual dragging                                                             |
| PhyloNetworks, PhyloPlots        | Phylogenetic networks with gamma              | Gamma on hybrid edges                 | Julia; static plots                                                                                 |
| EMPress                          | Microbiome trees with barplots and ordination | Linked views, 500,000+ nodes          | QIIME 2 bound                                                                                       |
| EFI-EST plus Cytoscape           | Protein SSNs                                  | Free; standard in enzymology          | Desktop memory limits; slow manual threshold-relayout loop                                          |
| Taxonium, OneZoom                | Millions of tips                              | Browser scale                         | See the public-health document                                                                      |

Cross-cutting pain points: many programs per figure; hand-edited input files; manual node placement; overlapping or unreadable pies; support semantics on rerooting; viewers failing above a few thousand tips or a few hundred thousand edges; no objective choice of k or threshold, so users iterate; force layouts that tangle directed time-ordered graphs; method criticism forcing two figures.

## 10. Requirements implied

Graphty's Designloom set (16 personas, workflows W01-W25) has no persona in evolutionary biology, population genomics or protein-family analysis, and no workflow with a tree layout, sequence-derived graph inference, pie-chart nodes, mutation-count edges, a time-fixed directed layout or a threshold-and-recluster loop. `genomics-cytoscape-user` and `bioinformatics-researcher` work with molecular interaction networks. Every requirement below is NOT covered unless stated.

| Requirement                                                                                                                                                                                                                                    | Priority                                                                | Covered today?                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Import Newick, NEXUS (TRANSLATE, `[&...]`), phyloXML and extended Newick with gamma; declare whether inner labels are names or support; keep support on branches through rerooting                                                             | Must                                                                    | No                                                                                    |
| Tree layouts: rectangular phylogram and cladogram, circular, unrooted, time-scaled with axis and HPD bars; aligned tip labels; ladderize                                                                                                       | Must                                                                    | No                                                                                    |
| Tree operations: reroot, rotate, collapse by selection or support threshold, prune, extract subtree                                                                                                                                            | Must                                                                    | No                                                                                    |
| Clade highlighting; per-tip strips, bars and heatmaps from a table joined on tip label with regex or substring matching                                                                                                                        | Must                                                                    | No                                                                                    |
| Pie-chart nodes with area from count, slices from a composition vector, square-root sizing, shared legend                                                                                                                                      | Must                                                                    | No                                                                                    |
| Integer mutation counts drawn as hatch marks or labels; inferred nodes as small dots                                                                                                                                                           | Must                                                                    | No                                                                                    |
| Live edge-attribute threshold filter (for example alignment score or similarity) that re-computes connected components or communities and recolors clusters as the slider moves, at 10^5 nodes and millions of edges                           | Must                                                                    | Partial (filtering and components exist; live recoloring at this scale not evidenced) |
| Build a graph from a distance or similarity matrix: mutual k-NN, threshold, optional MST edges; sweep k and report communities per k                                                                                                           | Must                                                                    | No (algorithms exist; graph construction from a matrix does not)                      |
| Community detection (Walktrap, Infomap, Louvain, Fast-Greedy) colored against a metadata group, with a comparison of detected versus labeled groups                                                                                            | Must                                                                    | Partial (community algorithms exist; comparison view does not)                        |
| Rooted phylogenetic networks, admixture graphs and ARGs: directed acyclic layout with time or drift fixed on one axis, reticulation nodes with two parents, gamma or admixture percentage on hybrid edges, horizontal dragging that pins nodes | Must                                                                    | No                                                                                    |
| Overlap-free layout for very unequal node sizes, plus saved manual positions                                                                                                                                                                   | Must                                                                    | Partial                                                                               |
| Geographic view with pies at sites, linked selection and shared colors across map, graph and table                                                                                                                                             | Must                                                                    | No                                                                                    |
| Linked non-map coordinated view: tree or graph linked to an ordination scatter (PCoA, PCA), selection flowing both ways                                                                                                                        | Should                                                                  | No                                                                                    |
| Import multi-tree NEXUS or Newick files; overlay (DensiTree style) or consensus view; per-branch frequency or concordance labels (posterior, gCF, sCF)                                                                                         | Should                                                                  | No                                                                                    |
| Import VCF or PLINK and compute a genetic distance matrix, or accept a precomputed matrix                                                                                                                                                      | Should (could be an extension; element owns algorithms by project rule) | No                                                                                    |
| Representative-node collapse: merge nodes by an attribute or a precomputed cluster id, keep member lists, expand on demand                                                                                                                     | Should                                                                  | No                                                                                    |
| Publication SVG and PDF with fonts preserved                                                                                                                                                                                                   | Must                                                                    | Partial                                                                               |
| Haplotype network inference from an alignment (MSN, TCS, median-joining) with a merged-samples list                                                                                                                                            | Should                                                                  | No                                                                                    |
| Sample sheet keyed by sequence name instead of hand-edited NEXUS; read PopART TRAITS and GEOTAGS                                                                                                                                               | Should                                                                  | No                                                                                    |
| Tanglegram with crossing minimization; tree distances                                                                                                                                                                                          | Should                                                                  | No                                                                                    |
| Large-tree level of detail for 10,000-750,000 tips; graph rendering of IBD-scale networks (about 770,000 nodes, hundreds of millions of edges, likely edge-sampled)                                                                            | Should                                                                  | No for trees; large-graph WebGPU path unproven at this edge count                     |
| Population statistics beside the graph                                                                                                                                                                                                         | Could                                                                   | No                                                                                    |

New personas to add: `phylogeographer-population-geneticist`, `molecular-systematist-taxonomist`, `conservation-geneticist`, `phylogenomics-comparative-biologist`, `population-genomics-snp-analyst`, `protein-family-ssn-analyst`. Microbiome researchers fit as a variant of the comparative-biology persona with the EMPress workflow. New workflows: haplotype network beside a map (5.1-5.3); root and annotate a tree (5.4); Bayesian convergence, summary and dated tree (5.5); gene-tree sets and conflict (5.6); population structure as a k-NN graph (5.7-5.8); admixture graph (5.9); ARG (5.10); phylogenetic network with gamma (5.11); microbiome tree with ordination (5.12); protein SSN threshold loop (5.13).

## 11. Sources

- https://pmc.ncbi.nlm.nih.gov/articles/PMC11223838/ -- iTOL v6: users, trees, datasets, export queue.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6602468 -- iTOL v4 users (via search).
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4987883 -- iTOL v3 users (via search).
- https://itol.embl.de/ -- iTOL homepage.
- https://cran.r-project.org/web/packages/itol.toolkit/refman/itol.toolkit.html -- iTOL template types.
- https://dcsoto.github.io/2024/09/30/haplotype-network -- PopART walkthrough and pain quotes.
- https://hackmd.io/@MarisolDominguez/Master-Labcourse-2024 -- lab course: DnaSP, Arlequin, PopART.
- https://fenix.ciencias.ulisboa.pt/downloadFile/2814887206062985/Manual_popart.pdf -- PopART manual (outline and snippets).
- https://datadryad.org/resource/doi:10.5061/dryad.4n4j1/3 -- PopART (Leigh and Bryant 2015).
- https://adamtaranto.github.io/pypopart/faq -- PyPopART guidance.
- https://mvences.de/p/p1/Vences_A556.pdf -- Hapsolutely: separate programs complaint.
- https://cran.nics.utk.edu/cran/web/packages/pegas/vignettes/PlotHaploNet.Rnw -- pegas plotting vignette.
- https://stat.ethz.ch/pipermail/r-sig-genetics/2022-July/000238.html -- overlapping pies thread.
- https://search.r-project.org/CRAN/refmans/haplotypes/html/parsimnet-methods.html -- TCS connection limit.
- https://fluxus-engineering.com/netwinfo.htm -- Network features.
- https://www.fluxus-engineering.com/Network4510_user_guide.pdf -- Network user guide (via search summary).
- https://bioresearch.byu.edu/tcs -- TCS.
- https://github.com/sairum/tcsBU -- tcsBU.
- https://www.scilit.net/publications/32fa40b8a50a89a7f4bce5e563de544c -- Kong et al. 2016 MJN critique.
- https://datadryad.org/dataset/doi:10.5061/dryad.f4qrfj708 -- Kong et al. 2023, 37.6%.
- https://patrick.mardulyn.web.ulb.be/Publications_files/Cassens&al2005.pdf -- network method simulations.
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4020147/ -- EMPOP quasi-median networks.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6490880/figure/pone.0215754.g003 -- PopART gap masking (via search).
- https://bmcplantbiol.biomedcentral.com/articles/10.1186/s12870-024-04783-5/figures/5 -- PopART map (via search).
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3900438 -- Shamblin et al. 2014 loggerhead: 3,486 and 3,434 samples, 42 and 40 rookeries, 59 haplotypes, eight NW Atlantic clusters, at least 18 MUs, baseline for future MSA.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5435079 -- Czech et al. 2017 rerooting errors.
- https://www.biostars.org/p/9616443 -- midpoint rooting moves support (title).
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10834882/ -- TreeViewer.
- https://beast.community/workshop_figtree -- FigTree workshop.
- https://taming-the-beast.org/tutorials/Introduction-to-BEAST2/ -- Tracer burn-in and ESS, TreeAnnotator settings, DensiTree steps.
- https://beast.community/analysing_beast_output -- Tracer ESS guidance.
- https://yulab-smu.top/treedata-book/chapter4.html -- ggtree layouts.
- https://bioconductor.org/packages/stats/bioc/ggtree/ -- ggtree downloads.
- https://cranlogs.r-pkg.org/downloads/total/last-month/ape,phytools,pegas,phangorn,haplotypes,treeio,adegenet,poppr,ggtree -- CRAN downloads.
- http://www.robertlanfear.com/blog/files/concordance_factors.html -- gCF and sCF workflow and outputs.
- https://botany.natur.cuni.cz/fer/hybseqcourse/presentations2025/Assessment_of_phylogenetic_conflict.pdf -- PhyParts pie colors (course slides).
- https://wiki.metacentrum.cz/wiki/Phyparts -- PhyParts installation.
- https://github.com/husonlab/splitstree6/wiki -- SplitsTree App.
- https://uni-tuebingen.de/en/46161 -- Dendroscope 3.
- https://arxiv.org/pdf/1602.04258 -- Phylo.io: tanglegram limits.
- https://cran.r-project.org/web/packages/TreeDist/vignettes/Using-TreeDist.html -- tree distances.
- https://search.r-project.org/CRAN/refmans/phytools/html/phylo.to.map.html -- tree linked to map.
- https://groups.google.com/g/biogeobears/c/0gkmjDG_Qnw -- obscured node pies.
- https://escholarship.org/uc/item/52v350dc -- SpreaD3.
- https://elifesciences.org/articles/82392 -- Taxonium.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4611642 -- Open Tree of Life.
- https://zendy.io/title/10.1002/ajb2.1019 -- 353,185-tip seed plant tree.
- https://www.doi.org/10.1038/NATURE11631 -- 9,993 birds.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6892540 -- 5,911 mammals.
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2844399/ -- Pavlopoulos et al. 2010.
- https://link.springer.com/content/pdf/10.1186/1471-2148-10-372.pdf -- haplowebs.
- https://boldsystems.org/resource-hub/faq/ -- BOLD Taxon ID Tree is neighbor-joining, 2% legend, not phylogenetic; BINs.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC1327734 -- Hajibabaei et al. 2006: K2P neighbor-joining, >2% as a sampling flag.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6504866 -- Lee et al. 2019: 1,297 COI sequences, 64 species, FastTree, RAxML, MrBayes, BEAST; GMYC, ABGD, bPTP, mPTP, RESL.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3485224/ -- NetView (Neuditschko et al. 2012): k-NN networks from SNP distances, k = 10 default, no objective k, Cytoscape display.
- https://researchonline.jcu.edu.au/43182/6/43182_Steinig%20et%20al_2016_accepted%20version.pdf -- NetView P (Steinig et al. 2016): mutual k-NN networks from genome-wide SNPs.
- https://github.com/esteinig/netview/blob/master/README_OLD.md -- netview R: inputs, `netview()` signature, `plotSelection`, Walktrap, Infomap, Fast-Greedy defaults, GML and D3 output.
- https://rdrr.io/github/esteinig/netview -- netview R function list.
- https://www.pubmed.gov/26888080/ -- NetStruct (Greenbaum, Templeton and Bar-David 2016).
- https://www.biorxiv.org/content/10.1101/024042v4.full-text -- NetStruct: similarity network, iterative edge pruning, modularity, permutation tests, strength of association.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5309710 -- Han et al. 2017 AncestryDNA IBD network: 769,444 vertices, Louvain recursion, spectral embedding.
- https://uqrmaie1.github.io/admixtools/articles/graphs.html -- ADMIXTOOLS 2 graphs vignette: qpgraph, find_graphs, plotting, comparison.
- https://uqrmaie1.github.io/admixtools/reference/index.html -- ADMIXTOOLS 2 function reference.
- https://github.com/kitchensjn/tskit_arg_visualizer -- ARG visualizer layout and interaction.
- https://github.com/kitchensjn/tskit_arg_visualizer/blob/main/docs/tutorial.md -- `D3ARG.from_ts`, y-axis scales, styling, export.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12701794/ -- Kitchens and Wong 2025: tangling, age-fixed y, 2.7 million-node example.
- https://juliaphylo.github.io/PhyloNetworks.jl/dev/man/net_plot -- PhyloPlots `showgamma`, extended Newick gamma.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8546999 -- EMPress (Cantrell et al. 2021): barplots, linked ordination, 756,377-node demo.
- https://github.com/fedarko/empress -- EMPress QIIME 2 commands.
- https://efi.igb.illinois.edu/efi-est/tutorial_analysis.php -- EFI-EST plots and threshold choice.
- https://efi.igb.illinois.edu/efi-est/tutorial_download.php -- EFI-EST downloads, representative networks, Cytoscape limits.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10291204 -- EFI tools paper, 2023 EFI tools: users, jobs, network sizes, utilities.
- https://genomicsaotearoa.github.io/metagenomics_summer_school/day3/ex10.2_viruses -- vConTACT2 network into Cytoscape.
- https://bitbucket.org/MAVERICLab/vcontact2/issues/69/cytoscape-visualization-headings-show-up -- annotation table key-column problem.
- https://emploi.cnrs.fr/Offres/CDD/UMR5290-OLIDUR-004/Default.aspx?lang=EN -- CNRS posting.
- https://evol.mcmaster.ca/brian/evoldir/PostDocs//URochester_NY.Phylogenomics -- Rochester posting.
