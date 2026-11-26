# Ecologists Working with Networks: Species Interactions, Animal Social and Contact Networks, Ecosystem Flows and Landscape Connectivity

## Summary

Ecologists build graphs in at least five distinct ways, and each needs something different from a graph tool.

- **Species interaction networks.** Nodes are species; edges record who interacts with whom (a bee visiting a flower, a fish eating a crustacean, a helminth infecting a rodent). Data arrive as a two-mode matrix (plants in rows, animals in columns, visit counts in cells) or a square predator-by-prey matrix. Analysis is almost entirely in R (`bipartite`, `igraph`, `vegan`, `cheddar`, `econullnetr`), and every index (nestedness, modularity, specialization, connectance) is judged against randomized null models because raw values are confounded by sampling effort and abundance. A growing theory community predicts unobserved links, so edges can be probabilities rather than observations.
- **Microbial co-occurrence networks.** Edges are inferred correlations between sequenced taxa (SparCC, SPIEC-EASI, CoNet, NetCoMi), thresholded, signed positive or negative, then drawn in Gephi or Cytoscape.
- **Ecosystem flow and qualitative models.** Directed, weighted energy or nutrient flows with imports, exports, respiration and storage (`enaR`, Ecopath), or signed directed community matrices with self-loops used to predict how a managed ecosystem responds when one component is pushed up or down (QPress).
- **Animal social and contact networks.** Nodes are individual animals, not species. Edges are association indices computed from group sightings, RFID feeder visits, proximity loggers or GPS tracks. Networks are temporal, nodes carry sex, age and rank, and significance comes from permuting the raw observation stream (`asnipe`, SOCPROG, `spatsoc`, ANTs). Wildlife disease ecologists use the same methods for contact networks.
- **Landscape connectivity graphs.** Nodes are habitat patches cut from a land-cover raster, links are Euclidean or least-cost distances, and the main question is which patch or corridor matters most if it is lost or restored (Graphab, Conefor, Circuitscape, Linkage Mapper). The graph is drawn on the map by definition.

Across all five, the needs that no current Graphty persona or workflow assumes are: import from matrices, observation streams, telemetry tables and rasters rather than edge lists; two-row bipartite, trophic-level and geographic layouts; permutation and null-model statistics; signed, probabilistic and association-index edge weights; self-loops and node-level boundary flows; removal and press simulations; and many replicate or time-windowed networks compared side by side.

## 2. Population

**Who they are.** Graduate students, postdocs, research scientists and principal investigators in ecology, entomology, botany, zoology, animal behavior, parasitology, fisheries, soil science, environmental microbiology and landscape ecology, plus government and NGO staff (agricultural institutes, forest services, fisheries agencies, conservation agencies and regional planners). Postdoc postings in pollinator and multi-trophic ecology ask for "very good knowledge of ecological statistics (using R)" or "expertise in ecological network analysis" (Wurzburg, Gottingen and BC3 postings in Sources). The tool is named less often than the method.

**Sub-populations.**

1. _Plant-animal mutualism ecologists_ (pollination, seed dispersal, ant-plant). Field-heavy; analyze in `bipartite`; the largest bipartite community and the one the `bipartite` vignettes target (Dormann and Frund, Intro2bipartite vignette).
2. _Antagonistic bipartite ecologists_ (host-parasite, host-parasitoid, plant-herbivore). Same tools; data often from dissection, rearing or DNA metabarcoding of gut contents and feces (https://pmc.ncbi.nlm.nih.gov/articles/PMC8216975/; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7290477/).
3. _Food web ecologists_ (aquatic, marine, soil). Square directed predator-prey matrices organized by trophic level; `cheddar`, `NetIndices`, `igraph`, `metanetwork`, Python `foodwebviz`, Food Web Designer.
4. _Ecosystem network analysts_ (the Ulanowicz and Fath tradition). Model energy or nutrient flows among compartments with storage, imports, exports and respiration, and compute total system throughflow, cycling, ascendency and environ indices. Tool: `enaR`, which ships "a library of 100 empirical ecosystem models" (Borrett and Lau 2014, https://eld.bl.uk/catalog/100025099941_0x000001), alongside Ecopath with Ecosim (EcoBase lists 233 downloadable models: https://ecobase.ecopath.org/).
5. _Qualitative network modelers for ecosystem-based management_. Fisheries and Antarctic scientists build signed digraphs of an ecosystem and simulate press perturbations with QPress. Tam et al. (Fisheries and Oceans Canada and NOAA, 2025) note "an increase in the use of qualitative models for marine management" because they are "relatively faster to develop" and "can be co-developed with a variety of audiences" (https://doi.org/10.1371/journal.pone.0328505).
6. _Theoretical, synthesis and prediction ecologists_. Download hundreds of networks from Web of Life, Mangal or IWDB, and increasingly predict unobserved links from traits, phylogeny and co-occurrence (Strydom et al. 2021, https://par.nsf.gov/servlets/purl/10312503). Strong coders in R, Julia or Python.
7. _Microbial ecologists_. Co-occurrence networks from 16S/ITS or metagenomic tables; Goberna and Verdu screened 485 soil network records from 2011-2020 and describe "exponential growth" (https://www.uv.es/verducam/DamnNetworks.pdf).
8. _Behavioral ecologists studying animal social networks_ (primates, cetaceans, birds, bats, ungulates, social insects). A bibliometric review reports that social network analysis in empirical behavioral ecology articles "has increased over time", with a median of 15 individuals per network (range 4-1,406) (Webber and Vander Wal, https://www.biorxiv.org/content/10.1101/379008.full.pdf, via search snippet). Long-term projects are much larger: the Wytham Woods great tit study ran 65 RFID-equipped feeders in 2011 and tracked winter flocks of over 500 birds (https://www.ox.ac.uk/news/2024-04-04-more-social-birds-are-more-adventurous-feeders-study-finds; https://ox.ac.uk/node/511682).
9. _Wildlife disease ecologists_ building contact networks for transmission, for example proximity collars on Tasmanian devils, where all devils formed "a single giant component" (Hamede et al. 2009, https://ecite.utas.edu.au/58216), or on badgers and cattle at Woodchester Park to study bovine tuberculosis (77 badger collars, 32 cattle collars, 19 base stations: Drewe et al. 2012, https://pmc.ncbi.nlm.nih.gov/articles/PMC3383709/). Livestock trade-movement networks belong to veterinary epidemiology; no other document in this research set covers them.
10. _Landscape ecologists and conservation planners_ modeling habitat connectivity. A review of studies citing Circuitscape found 459 papers, 277 of which used the software, from January 2009 to February 2018, spanning "conservation to evolutionary biology, from anthropology to epidemiology" (Dickson et al. 2019, https://pmc.ncbi.nlm.nih.gov/articles/PMC6727660). Users include agency and NGO planners mapping wildlife corridors in ArcGIS with Linkage Mapper (https://consbio.org/software/linkage-mapper/).

**Size (evidence only).** No headcount exists. CRAN downloads for 2026-10-26 to 2026-11-24: `bipartite` 4,637; `cheddar` 779; `bipartiteD3` 652; `econullnetr` 593; `emln` 476; `rmangal` 465; for scale `vegan` 123,817 and `igraph` 522,143 (https://cranlogs.r-pkg.org/downloads/total/last-month/bipartite,cheddar,econullnetr,rmangal,bipartiteD3,emln,igraph,vegan). Downloads include automated installs and bound activity rather than count people. Mangal holds "over 1300 networks, 120000 interactions across close to 7000 taxa" and grows by "just over 30 networks a year" (https://poisotlab.github.io/ms_mangal_synthesis). No download or user counts were found for `asnipe`, SOCPROG, Graphab or QPress.

**How often they touch graph tools.** Seasonal and bursty. Field ecologists collect for one to three seasons (CaraDonna et al. censused weekly for three years to build 41 weekly networks of nearly 30,000 interactions: https://experts.arizona.edu/en/publications/interaction-rewiring-and-the-rapid-turnover-of-plantpollinator-ne/), then analyze intensively for weeks, then revise when reviewers ask for another null model. Microbial ecologists treat the network as one figure among many (Goberna and Verdu: networks "are used more and more often as a mere pictorial tool"). Connectivity planners work project by project, often for a regional plan.

**Skill profile.** High literacy in their own indices (NODF, H2', d', SRI, PC, dPC), low in generic graph vocabulary; the `bipartite` vignette devotes a section to "the betweenness mess" (five R packages, five answers). Statistics are strong (null models, permutation tests, mixed models). Most are vignette-copying R users; a visible minority avoids code, which is why GUI tools exist: Food Web Designer (built because command-line tools are "harder to start using": https://pmc.ncbi.nlm.nih.gov/articles/PMC4757606/), iNAP and SpeSpeNet for microbiomes (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10989900/; https://ubc.uu.nl/?p=7740), the Graphab desktop GUI, the compiled SOCPROG for Windows, and ArcGIS toolboxes. Planners are GIS-literate rather than R-literate.

**Team context.** Small labs around one PI; field crews record observations; taxonomists identify specimens weeks later; long-term animal studies keep individual life-history databases (sex, age, rank, kinship). Microbial ecologists receive an OTU/ASV table from a sequencing core. Planners share maps with agencies and stakeholders. Data go to Dryad, Zenodo, Web of Life or Mangal.

## 3. Personas

### Persona A: Dr. Ana Morales -- field pollination network ecologist (id: pollination-network-ecologist)

- **Role.** Postdoc studying how land use, grazing or restoration changes plant-pollinator networks.
- **Tools today.** Spreadsheet for field records; R `bipartite` (`frame2webs`, `plotweb`, `visweb`, `networklevel`, `specieslevel`, `nullmodel`, `computeModules`, `betalinkr`, `second.extinct`), `vegan`, `iNEXT`; sometimes `bipartiteD3`; Illustrator or Inkscape to finish figures.
- **Data.** One long table per season (date, site, transect, plant, pollinator morphospecies, count); 8-40 sites; webs of 10-60 plants by 20-150 pollinators; floral abundance per plant per site.
- **Goals.** Show that treatment sites differ in specialization or nestedness after null-model correction; one clean two-row figure per site; deposit matrices.
- **Frustrations.** Labels overlap on large webs ("for larger networks the placement of the labels quickly becomes somewhat confusing": https://cran.case.edu/web/packages/bipartite/vignettes/PlottingWithBipartite.html); spelling variants become separate species in `frame2webs` (https://search.r-project.org/CRAN/refmans/bipartite/html/frame2webs.html); null-model loops "take a while"; 20 site figures with 20 different species orders.

### Persona B: Dr. Tomas Lindqvist -- food web and ecosystem model ecologist (id: food-web-ecologist)

- **Role.** Research scientist in a freshwater, marine or fisheries group; part empiricist, part modeler; sometimes advises managers.
- **Tools today.** `cheddar` (`PlotWebByLevel`, trophic levels), `NetIndices::TrophInd`, `igraph` with hand-made layouts, `metanetwork`, `foodwebviz`, Ecopath with Ecosim, `enaR` for flow analysis, QPress for qualitative press scenarios.
- **Data.** 25-200-node directed webs with body mass and abundance per node (Tuesday Lake 1984: 56 nodes, 269 links); metawebs up to 1,101 species and 48,963 interactions (https://pmc.ncbi.nlm.nih.gov/articles/PMC10427773/); flow models with per-compartment imports, exports, respiration and storage; signed digraphs of 10-50 functional groups.
- **Goals.** Draw the web by trophic level with body size as node size; compute omnivory, chain length, cycling and ascendency; predict which groups rise or fall if fishing pressure or a predator changes.
- **Frustrations.** "Node layout algorithms specifically designed for trophic networks are still lacking" (metanetwork authors); Food Web Designer handles three levels and runs only on Windows; fractional trophic levels are rarely supported (https://doaj.org/article/f913913fd95242f086357d82b84f3566); self-loops and boundary flows (inputs, exports, respiration) have no place in ordinary graph tools; QPress models are drawn in the Dia diagram editor and read into R.

### Persona C: Dr. Mei Chen -- microbial co-occurrence network ecologist (id: microbial-network-ecologist)

- **Role.** Postdoc comparing soil or plant microbiomes across fertilization, drought or land use.
- **Tools today.** phyloseq; SpiecEasi, SparCC or NetCoMi; CoNet in Cytoscape or the iNAP web pipeline; igraph for degree, modularity and Zi-Pi roles; Gephi or Cytoscape for the final figure, colored by phylum or module, positive and negative edges in two colors.
- **Data.** 50-300 samples by 1,000-20,000 ASVs, filtered to 100-1,000 prevalent taxa; taxonomy table; sample metadata.
- **Goals.** Show that treatment networks differ in complexity, modularity and positive/negative ratio; name "keystone" taxa; a striking figure.
- **Frustrations.** Results depend on threshold, method and OTU definition; edges "should not be read as direct interactions" (https://pmc.ncbi.nlm.nih.gov/articles/PMC10989802/); CoNet "is very memory intensive" (https://sites.google.com/view/terrimporter/posts/using-conet-with-cytoscape); moving networks between R, Gephi and Cytoscape loses attributes.

### Persona D: Dr. Kofi Mensah -- network synthesis and prediction ecologist (id: ecological-network-synthesis-researcher)

- **Role.** Macroecologist analyzing hundreds of published networks and predicting interactions that were never observed.
- **Tools today.** `rmangal`, Web of Life, IWDB, `rglobi`; R or Julia; `emln` for multilayer data; machine-learning libraries for link prediction.
- **Data.** 100-1,300 networks of mostly under 100 species, with site, coordinates, date and method; species traits and phylogenies; predicted metawebs whose edges are probabilities.
- **Goals.** Harmonize taxonomy, compute null-corrected indices across all networks, map coverage gaps, and predict a regional metaweb that can be downscaled to local webs.
- **Frustrations.** Bare matrices "lack the easy addition of metadata" (Delmas et al. 2019, https://ecologia.ib.usp.br/guimaraes/papers/2019_Delmas.pdf); names differ across sources; "it can be tough to distinguish between a true negative ... from a false negative" (Strydom et al. 2021); no common way to display observed and predicted links together.

### Persona E: Dr. Lena Okafor -- animal social network ecologist (id: animal-social-network-ecologist)

- **Role.** Postdoc on a long-term study of a marked population (wild birds at feeders, a dolphin or whale population identified by photo-ID, a primate group, or collared ungulates); a wildlife-disease variant of the same persona studies contact networks for transmission.
- **Tools today.** R with `asnipe` (`get_group_by_individual`, `gmmevents`, `get_network`, `network_permutation`), `spatsoc` for GPS data, `igraph` and `sna` for metrics, ANTs, sometimes SOCPROG (MATLAB) for long photo-ID data sets, RSiena for network change; Gephi or igraph for figures.
- **Data.** Group-by-individual matrices of thousands of sightings; RFID or PIT detections (timestamp, tag, feeder); proximity-logger contact records; GPS relocation tables (id, datetime, x, y); an individual attribute table (sex, age, rank, kin, breeding status).
- **Goals.** Test whether sex, age, personality or season predicts social position; show how networks change across seasons; estimate who could infect whom.
- **Frustrations.** Permutation choice is contested: common data-stream permutations give "extremely high type I error rates (> 30%)" for regression (Weiss et al., https://www.biorxiv.org/content/10.1101/2020.04.29.068056.full.pdf); pre-network permutation is "challenging to implement" for focal follows and GPS data (Farine 2017, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5656331/); `gmmevents` memory grows with the square of the data; proximity loggers split one long contact into several records and lose about half their detection distance within eight months (Drewe et al. 2012).

### Persona F: Dr. Paul Girard -- landscape connectivity and conservation planner (id: landscape-connectivity-planner)

- **Role.** Landscape ecologist in a research institute or a regional conservation agency, prioritizing habitat patches and corridors for protection or restoration.
- **Tools today.** QGIS or ArcGIS; Graphab (Java desktop GUI and command line) or its R wrapper `graph4lg`; Conefor; Circuitscape; Linkage Mapper (an ArcGIS toolbox).
- **Data.** Land-cover rasters (8-bit GeoTIFF in a metric projection), resistance values per land-cover class, species dispersal distances, existing reserve shapefiles.
- **Goals.** Rank patches by their contribution to connectivity (dPC), map least-cost corridors and pinch points, and hand maps and tables to planners.
- **Frustrations.** Results swing with resistance values and dispersal distance, so every metric is recomputed across a range of distances; analysis lives in specialist tools while deliverables live in GIS; no source found quantifying other pain points.

## 4. Use cases (ranked by frequency times stakes)

1. **Describe one observed network and plot it** (every species-interaction study; Figure 1): two-row plot, matrix plot, index table.
2. **Test whether a pattern is real** (nearly every paper): null models for bipartite indices; data-stream or node-label permutations for animal networks.
3. **Compare networks across sites, seasons, treatments or individuals' attributes** (the hypothesis of most field studies), with sampling completeness and link turnover.
4. **Identify key species, individuals or patches**: d', strength, centrality, module roles, Zi-Pi keystone taxa, central individuals, patches with the largest dPC.
5. **Find modules**: plant-pollinator compartments, microbial modules, social communities.
6. **Draw a food web by trophic level**, with trophic position, chain length and omnivory.
7. **Build and compare microbial co-occurrence networks** between conditions.
8. **Prioritize habitat patches and corridors for conservation** (agency-facing, high stakes): removal-impact rankings on a map.
9. **Simulate extinction, removal and perturbation**: secondary extinctions and robustness; press scenarios for managers; patch loss.
10. **Track change over time**: weekly pollination networks, seasonal social networks, multilayer structure (`emln`), contact networks for disease spread.
11. **Analyze ecosystem flows**: throughflow, cycling and ascendency of flow models.
12. **Predict unobserved interactions and metawebs** (growing).
13. **Retrieve and reuse public networks**: Web of Life, Mangal, IWDB, GloBI.
14. **Communicate to managers and the public**: Pocock et al. 2016 note "there is little research to help guide best practice" (https://nora.nerc.ac.uk/id/eprint/516294/); qualitative models are co-developed with stakeholders.

## 5. Step-by-step workflows

### Workflow 1: From field observations to a plotted bipartite web and index table

Sources: Intro2bipartite vignette (https://cran.r-project.org/web/packages/bipartite/vignettes/Intro2bipartite.pdf); plotting vignette (above); `frame2webs` help.

1. **Collect.** Observers walk transects or watch plants for fixed periods; effort standardized by area and time (UZH course manual: https://ieubascomptelab01.uzh.ch/bio365-fs23/downloads/Figures/03-21_sampling_an_ecological_network/03-21_sampling_eco_nw_manual.pdf). PolliNet uses 10-minute watches of one plant species, 9:00-17:00 in calm, clear weather (https://www.inaturalist.org/projects/pollinator-network-monitoring-pollinet/journal/78288-plant-pollinator-network-monitoring-protocol). Floral abundance is counted separately.
2. **Enter data.** _Wide_: lower-level species as rows, higher-level as columns, names in the first row and column. _Long_: one row per observation (plant, pollinator, site, count). Morphospecies codes are replaced after identification.
3. **Load.** Wide: `read.csv("web.csv", row.names=1)`, then `gsub(".", " ", ..., fixed=T)` because R turns spaces into dots. Long: `frame2webs(df, varnames=c("Plant","Pollinator","site","edge.weight"))` returns one matrix per site; `type.out` gives a list or an array padded to a shared species set; `emptylist=TRUE` drops unseen species.
4. **Clean.** Fix spelling variants, merge morphospecies, decide on singletons (Dormann et al. 2009: https://www.biometrie.uni-freiburg.de/Dateien/PDF/dormann2009openecolj.pdf).
5. **Plot the two-row graph.** `plotweb(web, srt=90, sorting="ca")`: plants as bars at the bottom, pollinators at the top, bar width = total interactions, link width = count. `sorting` is `"dec"`, `"inc"` or `"ca"` (correspondence analysis "might reduce link crossings"); `lower_abundances` adds independent abundances as extra bar segments; curved links, italic names and per-species colors are options. From version 3.0 `plotweb` gives way to `plot.bipartite_web` and `plotweb_array` (https://biometry.r-universe.dev/bipartite/doc/PlottingWithBipartite.html); `plotweb2` stacks levels.
6. **Plot the matrix.** `visweb(web)`: shaded adjacency matrix sorted by marginal totals, so nestedness appears as a filled triangle.
7. **Compute indices.** `networklevel`, `grouplevel`, `specieslevel`. The vignette advises quantitative versions: H2' over connectance, weighted NODF over NODF, species strength over degree. All indices for 22 bundled webs "takes around 10 minutes".
8. **Hand off.** Figure (often touched up in a vector editor), index table per site, matrices on Dryad or Web of Life.

### Workflow 2: Null-model testing and module detection

Sources: Intro2bipartite sections 6-7; `nullmodel` help (https://search.r-project.org/CRAN/refmans/bipartite/html/nullmodel.html); econullnetr (https://search.r-project.org/CRAN/refmans/econullnetr/html/generate_null_net.html).

1. **Pick a null model.** `nullmodel(web, N, method)`: "r2dtable" (keeps row and column totals), "swap.web" (totals and connectance), "vaznull" (connectance, totals loosely), "shuffle.web", "mgen". Without abundance-preserving nulls, "sampling intensity and 'natural' differences in abundance will cause ... artefacts". Reviewers often ask for a second model.
2. **Generate replicates.** `nullmodel(web, N=1000, method="r2d")` -- "takes a while!".
3. **Compute the index on each**, for example NODF from `vegan::nestednodf`.
4. **Read the result.** Null density with the observed value as a vertical line; z = (observed - null mean) / null sd, distorted near bounds.
5. **Null-model the whole comparison**: recompute a treatment statistic with one null per web 5,000 times; the share of null statistics more extreme is the p-value.
6. **Resource-selection nulls.** `econullnetr::generate_null_net` draws interactions in proportion to resource abundance; 1,000 iterations recommended; `plot_preferences` flags over- and under-used links.
7. **Find modules.** `computeModules(web)` (Beckett DIRTLPAwb+), `plotModuleWeb` draws the matrix in module blocks; significance again by null models; `infomapecology` is the map-equation alternative.
8. **Hand off.** Observed index, null mean and sd, z, p; module membership; a module-sorted matrix.

### Workflow 3: Comparing networks across sites, seasons and treatments

Sources: `betalinkr` help (https://search.r-project.org/CRAN/refmans/bipartite/html/betalinkr.html); Poisot 2022 (https://peercommunityjournal.org/item/10.24072/pcjournal.105.pdf).

1. **Assemble comparable webs** padded to one species list (`webs2array`).
2. **Check sampling completeness** with interaction accumulation curves and Chao estimators (https://www.biorxiv.org/content/10.1101/195917.full.pdf); `iNEXT.link` (https://zenodo.org/records/7789389). Many unobserved links are "forbidden" by phenology or size mismatch (Jordano, https://www.biorxiv.org/content/10.1101/025734v3.full-text). Incomplete sampling distorts connectance and nestedness and inflates specialization (Frund et al. 2015, https://williamslab.ucdavis.edu/wp-content/uploads/sites/384/2016/09/Fru%CC%88nd-et-al.-2015-Sampling-bias-is-a-challenge-for-quantifying-speci.pdf).
3. **Compute null-corrected indices per network** and model them against treatment in mixed models.
4. **Partition link turnover.** `betalinkr(webarray)` splits dissimilarity into species turnover and rewiring; `partitioning="poisot"` or `"commondenom"`; Poisot (2022) warns the 2012 method over-estimates rewiring.
5. **Choose temporal resolution.** Pooling a season makes "many network topology measures ... inaccurate" (https://eco.confex.com/eco/2017/webprogram/Paper62566.html); Schwarz et al. (2020) analyzed 124,708 interactions from 159 sites for aggregation effects (https://www.colorado.edu/lab/resasco/sites/default/files/attached-files/schwarz_et_al_2020_oikos.pdf).
6. **Show side by side.** `bipartiteD3::bipartite_D3()` facets a list of webs with shared colors and ordering (https://cran.r-project.org/web/packages/bipartiteD3/vignettes/bipartiteD3_Intro.html); `emln` builds multilayer objects and opens the MiRA browser viewer (https://cran.r-project.org/web/packages/emln/readme/README.html).
7. **Hand off.** Multi-panel figure with aligned species, z-score table, beta-diversity components, completeness supplement.

### Workflow 4: Extinction and robustness simulation

Sources: `second.extinct` help (https://search.r-project.org/CRAN/refmans/bipartite/html/second.extinct.html); `robustness` help (https://search.r-project.org/CRAN/refmans/bipartite/html/robustness.html).

1. **Choose the level that goes extinct.** `second.extinct(web, participant=...)`: `"higher"` (default, for example pollinators), `"lower"` or `"both"`.
2. **Choose the removal order.** `method="abundance"` (least abundant first; the default; ignores replicates), `"random"`, `"degree"` (most connected first), or `"external"` with a supplied sequence (`ext.row`, `ext.col`).
3. **Set replicates.** `nrep` random sequences, averaged unless `details=TRUE`.
4. **Plot the extinction curve.** The result has class "bipartite" and plots as the share of the other level surviving against species removed.
5. **Summarize.** `robustness(ext)` returns R, the area under the curve (1 = the other level survives almost to the end; 0 = it collapses at once; Burgos et al. 2007). `slope.bipartite(ext)` fits the older extinction slope, which the `robustness` help page calls an "inferior measure". `grouplevel()` reports both per level.
6. **Compare** R across sites or treatments, often against null webs.

What a visual tool would add: clicking a species to remove it and watching which partners lose all links, then replaying the removal sequence. No existing tool found does this interactively.

### Workflow 5: Drawing and analyzing a food web by trophic level

Sources: cheddar vignettes (https://packages.oit.ncsu.edu/cran/web/packages/cheddar/vignettes/PlotsAndStats.pdf); metanetwork; foodwebviz; Food Web Designer.

1. **Assemble data** from gut contents, isotopes, literature or metabarcoding. `cheddar` uses three CSVs: `properties.csv`, `nodes.csv` (species with M and N), `trophic.links.csv` (`resource`, `consumer`); it errors on links to unknown nodes or duplicates. IWDB food webs are square 0/1 matrices (https://iwdb.nceas.ucsb.edu/html/resources.html).
2. **Compute trophic level**: prey-averaged or chain-averaged (`cheddar`), fractional (`NetIndices::TrophInd`). Cannibalism and omnivory create cycles.
3. **Plot by level.** `PlotWebByLevel(TL84)` puts basal nodes at the bottom, with level lines and staggering. Users without it hand-build igraph layouts from distance to producers because built-in layouts were "not satisfactory" (https://statisticsglobe.com/?p=34459).
4. **Large webs and metawebs.** `metanetwork` places trophic level on one axis and t-SNE on the other, aggregates webs over about 100 nodes by group, and induces local webs from the metaweb by site occurrence (https://pmc.ncbi.nlm.nih.gov/articles/PMC10427773/).
5. **Weighted flow webs.** `foodwebviz` gives a heat map, an interactive graph by fractional trophic level and a particle animation of flows in Jupyter.
6. **Tripartite figures.** Food Web Designer (Windows) draws up to three levels with bar and link widths.
7. **Analyze**: connectance (L/S^2 or 2L/S(S-1): https://pmc.ncbi.nlm.nih.gov/articles/PMC130559), chain length, omnivory, generality, vulnerability, body size against trophic level.
8. **Hand off.** Trophic-level figure, property tables, community CSVs.

### Workflow 6: Ecosystem network analysis of flows

Sources: enaR repository and reference (https://github.com/SEELab/enaR; https://seelab.github.io/enaR/reference/index.html); `pack` and `enaCycle` help (https://www.rdocumentation.org/packages/enaR/versions/2.9.1/topics/enaCycle).

1. **Get a model.** Load one of the bundled `enaModels`, read a SCOR, WAND or NEA file (`read.scor`, `read.wand`, `read.nea`), or export from Ecopath.
2. **Pack it.** `pack(flow, input, export, respiration, output, storage, living)`: an internal flow matrix plus per-node vectors of imports, exports, respiration, storage and a living/dead flag (detritus is a non-living node).
3. **Check balance.** `ssCheck()` tests whether inputs equal outputs per node within a tolerance; `balance()` or `bal()` adjusts inputs or outputs.
4. **Analyze.** `enaFlow` (throughflow and total system throughflow), `enaCycle` (cycle and nexus tables, cycle distribution, and network statistics including the number of simple cycles and the cycling index CI), `enaAscendency`, `enaStorage`, `enaEnviron` (input and output environs), `enaControl`, `enaMTI` (mixed trophic impacts), `enaUtility`; `enaAll` runs a standard set.
5. **Compare models** across ecosystems or scenarios.
6. **Hand off.** Index tables and Lindeman spine plots (`plot` on `lindeman` objects).

Graph features this needs: directed weighted flows, self-loops, and per-node boundary flows (input, export, respiration) drawn as arrows from and to the outside of the system.

### Workflow 7: Qualitative network models and press perturbations

Sources: QPress mesocosm vignette (https://swotherspoon.github.io/QPress/articles/Mesocosm.html); QPress repository (https://github.com/SWotherspoon/QPress); Tam et al. 2025 (above); Giordano and Altafini 2017 (https://pmc.ncbi.nlm.nih.gov/articles/PMC5596000/).

1. **Draw the signed digraph**, often with managers or stakeholders, in the Dia diagram editor: nodes are species, functional groups, fishing or environmental drivers; edges are positive or negative effects. Tam et al. derived theirs from a quantitative Rpath model's diet and mortality matrices, keeping links above 10, 20 ... 50 percent to make six models of decreasing complexity.
2. **Read it.** `model.dia("model.dia")`.
3. **Add self-limitation.** `enforce.limitation()` adds a negative self-loop to every node; models "require self-limiting loops ... to stabilize" (Tam et al.).
4. **Simulate.** `system.simulate(1000, model)` draws random magnitudes for each signed link and discards unstable community matrices.
5. **Validate.** Select nodes whose observed responses are known; the share of simulations matching them scores the model (about 50 versus over 80 percent for two lake models in the vignette).
6. **Press a node.** Perturb one node up or down (phytoplankton, small pelagics, seals, fishing in Tam et al.).
7. **Read the impact table.** `impact.barplot()` shows, per node, the fraction of positive and negative outcomes. Tam et al. call a response positive or negative when more than 600 of 1,000 simulations agree, otherwise mixed.
8. **Iterate structure** and rerun. Hand off impact tables and the diagram.

### Workflow 8: Building, thresholding and drawing a microbial co-occurrence network

Sources: SpiecEasi vignette (https://bioconductor.statistik.tu-dortmund.de/packages/3.24/bioc/vignettes/SpiecEasi/inst/doc/SpiecEasi.html); NetCoMi (https://pmc.ncbi.nlm.nih.gov/articles/PMC8293835); CoNet (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5089131/); meconetcomp guide (above); Gephi guides (https://libguides.brown.edu/gephi).

1. **Start from an abundance table** (taxa by samples) plus taxonomy and metadata, usually a phyloseq object.
2. **Filter** to prevalent taxa (one workflow uses 50 percent presence, minimum 20 percent: https://github.com/jtclaypool/microbiome).
3. **Infer.** `spiec.easi(X, method='mb', lambda.min.ratio=1e-2, nlambda=15)` with StARS selection, then `getRefit(se)`; NetCoMi `netConstruct()` wraps Pearson, Spearman, SparCC, CCLasso, SPIEC-EASI, SPRING, gCoda and normalizations; CoNet ensembles several measures with permutation significance and multiple-testing correction.
4. **Threshold.** The SpiecEasi vignette's `abs(cor) >= 0.3` is "an arbitrary cutoff"; iNAP defaults to 0.3 and p = 0.05; MENAP/iNAP can use random matrix theory; the cutoff "is often left to the user" (https://pmc.ncbi.nlm.nih.gov/articles/PMC8131268).
5. **Compute** degree, betweenness, modularity, positive/negative ratio and Zi-Pi roles (module hubs Zi > 2.5, connectors Pi > 0.62) as "potential keystone taxa".
6. **Draw.** In Gephi: node table with `Id` matching `Source` and `Target`; Louvain modularity; color by module or phylum; ForceAtlas2. Conventions: positive edges green or blue, negative red, width by correlation (https://pmc.ncbi.nlm.nih.gov/articles/PMC10437823/figure/pone.0273890.g008).
7. **Compare conditions.** NetCoMi `netCompare()` and `diffnet()`; meconetcomp compares shared edges and module eigengenes. Goberna and Verdu cite 25-30 sites as reasonable and simulations suggesting over 1,300 samples for near-perfect inference.
8. **Hand off.** Figure per condition, property table, keystone list; methods "often poorly described".

### Workflow 9: Retrieving published networks and predicting missing interactions

1. **Retrieve.** Web of Life (https://www.web-of-life.es/; CSV and JSON downloads; an API with `get_networks.php`); Mangal via `rmangal` (`search_datasets()` and six other searches; networks convertible to igraph; taxonomy links to GBIF, ITIS, "Catalogue of Life": https://cloud.r-project.org/web/packages/rmangal/index.html); IWDB text and Excel files; GloBI pairwise records via `rglobi`; 78 multilayer data sets in `emln`.
2. **Assemble a metaweb.** Strydom et al. combined 51 host-parasite networks sampled across space (Hadfield et al.) into one metaweb, noting that many absent pairs are probably false negatives.
3. **Derive species features** from co-occurrence (probabilistic PCA), traits or phylogeny.
4. **Train a predictor** (a deep neural network in the proof of concept).
5. **Produce link probabilities** for every species pair.
6. **Validate** against held-out data with ROC and precision-recall curves, choosing a threshold by Youden's J.
7. **Display and downscale.** Strydom et al. show a t-SNE embedding with empirical interactions in one color and imputed ones in another; local webs are then induced from the metaweb by site occurrence (Workflow 5, step 4).

### Workflow 10: Animal social and contact networks

Sources: Farine and Whitehead 2015 (https://kops.uni-konstanz.de/entities/publication/8843792c-3d9a-427e-88d0-c5be7788fb7a); `asnipe` help pages (https://search.r-project.org/CRAN/refmans/asnipe/html/get_network.html, https://search.r-project.org/CRAN/refmans/asnipe/html/network_permutation.html, https://search.r-project.org/CRAN/refmans/asnipe/html/gmmevents.html); `spatsoc` (https://docs.ropensci.org/spatsoc/, https://docs.ropensci.org/spatsoc/reference/randomizations.html); SOCPROG (https://link.springer.com/doi/10.1007/s00265-008-0697-y); ANTs (https://pmc.ncbi.nlm.nih.gov/articles/PMC7385643).

1. **Define nodes and edges.** Nodes are marked or photo-identified individuals. Edges are associations (seen in the same group, the "gambit of the group"), interactions (grooming, aggression from focal follows, which can be directed) or proximity. Farine and Whitehead start here, then cover data collection, network inference and display, node and network measures, hypothesis tests, and "assessing the power and accuracy of an observed network".
2. **Collect.** Group scans or photo-ID surveys; RFID/PIT feeders (Wytham: feeders open two days each week); proximity collars (Drewe et al. recommend merging records between the same pair within 1-2 minutes and correcting for detection-distance decline); GPS collars.
3. **Build the group-by-individual matrix.** `get_group_by_individual(data, data_format="groups"|"individuals")` returns a groups-by-individuals 0/1 matrix with time and location as row names. Feeder streams: `gmmevents(time, identity, location)` infers flocking events (Psorakis et al. 2012) and returns the matrix plus event start, end and location; memory guidance is about 10,000 observations per location per day on 16 GB. GPS: `spatsoc::group_times` (a time threshold in minutes, hours or days), `group_pts` (a distance threshold, 50 m in the example), `group_lines` or `group_polys` for trajectories and home ranges, then `get_gbi`; `edge_dist` and `edge_nn` give proximity edge lists directly.
4. **Compute association indices.** `get_network(gbi, data_format="GBI", association_index="SRI")`; "SRI" is the simple ratio index, "HWI" the half-weight index; `times`, `locations`, `classes`, `enter_time` and `exit_time` subset by period, place, class or residence. SOCPROG (MATLAB, or compiled for Windows) handles "1,000 or more individuals", sociograms, cluster analysis and later temporally constrained indices (https://latam-cl.demo.elsevierpure.com/en/publications/socprog-programs-analysing-animal-social-structures; https://cormorant.comp.uvic.ca/archives/list/marmam@devlists.uvic.ca/thread/56XWBMWNICHD3BN5IRG2AHYSXXZXNUI3/).
5. **Build null networks from the data stream.** `network_permutation(gbi, permutations=1000, within_day, within_location, within_class)` swaps individuals between groups and returns a stack of permuted association matrices. `spatsoc::randomizations(type="step"|"daily"|"trajectory", iterations, splitBy)` shuffles identities within time steps or days, or shifts whole daily trajectories. Choice matters: data-stream permutations inflate false positives for regression, node-label permutations give about 5 percent (Weiss et al.), and Farine and Carter (2022) propose double permutation (https://pmc.ncbi.nlm.nih.gov/articles/PMC9292850).
6. **Compute node and network measures**: strength, eigenvector centrality, clustering, modularity (`igraph`, `sna`, ANTs, which also runs data-stream and node-label permutations).
7. **Test hypotheses** against the null distribution (for example sex differences in strength), with matrix regression or Mantel tests on dyadic predictors such as kinship; lagged association rates (`asnipe::LAR`) describe how long associations last; RSiena models change between periods (Fisher et al. 2017, https://pmc.ncbi.nlm.nih.gov/articles/PMC6849756).
8. **Check power and accuracy** by subsampling observations or bootstrapping groups.
9. **Draw.** igraph or Gephi; nodes colored by sex or age class and sized by strength; edge width by association index; one panel per season or time window.
10. **Disease variant.** Build a contact network from proximity loggers, then simulate transmission across it. Hamede et al.'s later devil model found that the network model predicts faster devil extinction than a mean-field model (https://figshare.utas.edu.au/articles/journal_contribution/Simulating_devil_facial_tumour_disease_outbreaks_across_empirically_derived_contact_networks/22890347).

### Workflow 11: Landscape connectivity graph with Graphab

Sources: Graphab 3.0 manual (https://thema.univ-fcomte.fr/productions/software/graphab/download/manual-3.0-en.pdf); graph4lg vignette (https://cran.r-project.org/web/packages/graph4lg/vignettes/landscape_graph_3.html).

1. **Load a land-cover raster.** An 8-bit GeoTIFF with discrete codes; units "must be meters" or areas and distances are wrong. In R: `graphab_project(proj_name, raster, nodata, ...)`.
2. **Define habitat.** Habitat patch codes, a minimum patch area in hectares (vignette: 200 ha for forest, 20 ha for shrubland), optional maximum patch size, 4- or 8-connexity; or a vector habitat layer. Patch capacity defaults to area. `graphab_habitat(...)`.
3. **Assign resistance costs** per land-cover code (vignette: forest 1, shrubland 5, grassland 40, crops 60, artificial 1,000).
4. **Build links.** `graphab_link(distance="euclid"|"cost", topo="planar"|"complete", maxcost)`. The manual suggests starting with a planar Euclidean link set.
5. **Build the graph**, optionally pruned by a distance threshold: `graphab_graph(linkset, thr)`.
6. **Compute metrics.** Global PC (probability of connectivity) and IIC (integral index of connectivity); local flux F, betweenness BC, degree; weighted metrics convert distance to dispersal probability, set by giving a distance and its probability (for example 10 km at 0.05), with an exponent on patch capacity. Batch mode recomputes a global metric across a range of thresholds and plots it against distance.
7. **Rank patches and links.** Delta mode removes each patch or link and records the change in the global metric (dPC, decomposed into area, flux and connector fractions); `--remelem` removes the worst items iteratively; patch addition tests candidate restoration sites.
8. **Map and export.** Results show on the map as node color and link thickness; export to shapefile, GeoPackage or text; `graphab_to_igraph()` hands the graph to R.

Related tools: Conefor computes node importance by removal (Saura and Torne 2009, https://dblp.org/rec/journals/envsoft/SauraT09); Circuitscape treats a resistance raster as an electrical circuit (Dickson et al. 2019); Linkage Mapper maps least-cost corridors between core areas, finds pinch points with Circuitscape and ranks corridors by centrality (https://www.mail-archive.com/ecolog-l@listserv.umd.edu/msg30332.html).

## 6. Data

| Property              | Bipartite                                                                                                           | Food webs and flow models                                                                | Microbial                             | Animal social                                                 | Landscape                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Native form           | Rectangular matrix or long observation table                                                                        | Square matrix, resource/consumer list, flow matrix plus boundary vectors, signed digraph | Taxa-by-samples table; edges inferred | Group-by-individual matrix, detection stream, GPS relocations | Land-cover raster plus cost table         |
| Nodes                 | Species                                                                                                             | Species or functional groups                                                             | Taxa                                  | Individuals                                                   | Habitat patches with coordinates and area |
| Typical size          | Mostly under 100 species (Mangal); Gorongosa 32 x 101, 608 links (https://pmc.ncbi.nlm.nih.gov/articles/PMC5762785) | 25-200 nodes; metawebs to 1,101 species                                                  | 100-1,000 taxa                        | Median 15 individuals; hundreds in long-term studies          | No source found for typical counts        |
| Edges                 | Undirected counts                                                                                                   | Directed; binary, flows or signs; self-loops                                             | Undirected, signed correlations       | Association index 0-1; directed interactions                  | Distance or least-cost, undirected        |
| Node attributes       | Abundance, traits, taxonomy                                                                                         | Body mass, abundance, trophic level, storage, living flag                                | Taxonomy, abundance                   | Sex, age, rank, kin                                           | Area, capacity, habitat type              |
| Multiplicity and time | Many webs (sites x seasons)                                                                                         | Local webs plus metaweb; scenarios                                                       | One per condition                     | Time-windowed networks                                        | One graph per threshold or species        |

**Formats in the wild.** CSV and Excel matrices with names in the first row and column; long tables; `cheddar` three-CSV communities; Web of Life and Mangal JSON; Pajek `.net` via `web2edges()`; GraphML and GEXF for Gephi; Ecopath, SCOR and WAND model files; Dia diagrams for QPress; BIOM and phyloseq objects; asnipe matrices and RFID logs; GPS CSVs; GeoTIFF rasters and shapefiles.

**Identifier problems.** Spelling variants split species; `read.csv` turns spaces into dots; morphospecies codes change; synonyms need taxonomy backbones; nodes may be "functional or trophic groupings rather than species" (Mangal synthesis); ASV identity depends on clustering; animals may carry different PIT tags over time, so `gmmevents` advises ring numbers.

**Sensitivity.** Mostly open; locations of rare species and collared animals may be generalized; no other constraints found.

## 7. Analysis methods

- **Bipartite network level**: connectance, linkage density, nestedness (NODF, weighted NODF), H2' (Bluthgen et al. 2006, https://pmc.ncbi.nlm.nih.gov/articles/PMC1570337), interaction evenness, robustness, modularity Q.
- **Species level**: degree, strength, d', PDI, betweenness and closeness (packages disagree).
- **Statistics**: null models (r2dtable, swap.web, vaznull, resource nulls), z-scores, whole-analysis nulls; index redundancy is acknowledged ("few of them have a sound theoretical basis").
- **Comparison**: interaction beta diversity, mixed models on z-scores, completeness estimators.
- **Food webs and flows**: trophic level, omnivory, chain length, generality, vulnerability; throughflow, cycling index, ascendency, environs, mixed trophic impacts; qualitative press responses.
- **Microbial**: SparCC, SPIEC-EASI, CoNet, RMT thresholds; Zi-Pi roles; permutation comparison.
- **Animal social**: SRI and HWI, strength, eigenvector centrality, lagged association rates, data-stream, node-label and double permutations, matrix regression, SAOMs.
- **Landscape**: PC, IIC, flux, betweenness, dPC by removal, least-cost paths, circuit current.
- **Prediction**: features from co-occurrence, traits or phylogeny; classifiers; ROC and precision-recall validation.
- **Projection**: one-mode projections (`as.one.mode`) of either level, for example host-host networks of shared parasites; the vignette notes these "can become rather obtuse".

## 8. Outputs and collaboration

- **Journal figures**: two-row bipartite plots, module-sorted matrices, null distributions with an observed line, trophic-level drawings, phylum-colored co-occurrence networks, sociograms by sex or season, maps of patch importance and corridors.
- **Tables** of indices with z-scores or p-values; keystone and central-node lists; impact tables for press scenarios.
- **Data deposition** on Dryad and Zenodo, Web of Life and Mangal; Delmas et al. argue for interaction records with metadata.
- **Management deliverables**: GIS layers of priority patches and corridors; qualitative models co-developed with stakeholders.
- **Interactive outputs**: `bipartiteD3`, `foodwebviz` HTML, MiRA. The `bipartite` vignette calls interactivity "not a feature useful for publication in the current standard" but says it "adds 21st century appeal".
- **Reproducibility**: seeds, replicate counts and methods reported; microbial thresholds often not reported.

## 9. Tools landscape and pain points

| Tool                                                      | Used for                                                                                     | Fails them                                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| R `bipartite`                                             | The "de facto standard" for bipartite plots and indices (https://peerj.com/articles/cs-3526) | Label collisions; static output; API churn; two levels per plot                             |
| `bipartiteD3`                                             | Interactive faceted bipartite plots                                                          | Separate from analysis                                                                      |
| `igraph`, `sna`, `tnet`                                   | One-mode metrics and layouts                                                                 | Betweenness disagreements; no bipartite indices; poor food web layouts                      |
| `cheddar`, `metanetwork`, `foodwebviz`, Food Web Designer | Food web data and figures                                                                    | Cannot show levels, abundances and link strength together; Windows-only GUI                 |
| `enaR`, Ecopath                                           | Flow models                                                                                  | No interactive drawing of boundary flows found                                              |
| QPress + Dia                                              | Qualitative press scenarios                                                                  | Model drawn in a separate diagram editor                                                    |
| `econullnetr`                                             | Resource nulls                                                                               | Slow at recommended iterations                                                              |
| `rmangal`, Web of Life, IWDB, `rglobi`                    | Published data                                                                               | Bare matrices; taxonomy mismatches; geographic gaps                                         |
| SpiecEasi, NetCoMi, CoNet, iNAP                           | Microbial inference                                                                          | Threshold dependence; memory; unreadable large plots                                        |
| `asnipe`, `spatsoc`, ANTs, SOCPROG                        | Animal social networks                                                                       | Permutation choice contested; `gmmevents` memory; SOCPROG needs MATLAB for the full version |
| Graphab, `graph4lg`, Conefor                              | Patch graphs and dPC                                                                         | Analysis separate from the GIS where deliverables live                                      |
| Circuitscape, Linkage Mapper                              | Corridors and pinch points                                                                   | Linkage Mapper tied to ArcGIS                                                               |
| Gephi, Cytoscape                                          | Final figures                                                                                | Manual import; attribute round-trips; no ecological statistics                              |

**Cross-cutting pain points.** Dense networks are unreadable: with 50 or more nodes "people have difficulties even with relatively basic tasks" (Pawluczuk and Iskrzynski, citing Pocock et al.). Food web layouts are an open problem. Tools are fragmented across R, Gephi, Cytoscape, GIS and vector editors; Delmas et al. call "the lack of a robust software suite" "a very worrying trend". Interpretation risk: indices that "merely reflect the number of species" without nulls (Dormann et al. 2009) and permutation tests with inflated false positives (Weiss et al.).

## 10. Requirements implied

Existing Graphty personas and workflows W01-W25 (design/designloom) cover protein networks, two-condition comparison (W24), network evolution (W19), import and validation (W18), communication (W15) and reproducible publication (W25). None covers two-mode or individual-by-group data, trophic or geographic layouts, null models, removal simulations or many-replicate comparison.

| Requirement                                                                                                                                                                                            | Priority                                       | Covered?                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------- |
| Import a wide interaction matrix as a weighted bipartite graph, including Web of Life CSV and IWDB Excel                                                                                               | must-have                                      | No -- W18 assumes edge lists            |
| Import a long observation table and split it into one network per site or season, optionally sharing one species list                                                                                  | must-have                                      | No                                      |
| Import an individual-by-group matrix or a timestamped detection or GPS table and build association-index edges (simple ratio, half-weight)                                                             | must-have for animal social                    | No                                      |
| Flag near-duplicate names before building the network                                                                                                                                                  | must-have                                      | Partly (W18)                            |
| Two-row bipartite layout ordered by totals, correspondence analysis or module, with bar width by abundance and link width by weight                                                                    | must-have                                      | No                                      |
| Matrix view sortable to show nestedness and modules, linked to the node-link view                                                                                                                      | must-have                                      | No                                      |
| Bipartite metrics: connectance, NODF, H2', d', bipartite modularity, robustness                                                                                                                        | must-have                                      | No                                      |
| Null-model and permutation testing: N randomized networks under named constraints, or permutations of the raw observation stream or node labels; observed value against the null distribution, z and p | must-have                                      | No                                      |
| Trophic-level layout with fractional levels, basal species at the bottom, tolerant of cycles                                                                                                           | must-have                                      | No -- hierarchical layout assumes a DAG |
| Geographic layout: node coordinates as a fixed layout over a basemap, with raster and shapefile input for landscape graphs                                                                             | must-have for landscape connectivity           | No                                      |
| Removal-impact ranking: remove each node or edge, record the change in a global metric, rank and map the result                                                                                        | must-have for landscape; should-have elsewhere | No                                      |
| Small multiples of many networks or time windows with aligned positions and shared scales                                                                                                              | must-have                                      | No -- W24 compares two                  |
| Signed edges with distinct styling and filtering by sign                                                                                                                                               | must-have                                      | No                                      |
| Self-loops, signed directed edges and per-node boundary flows (input, export, respiration)                                                                                                             | should-have (ecosystem and qualitative models) | No                                      |
| Press-perturbation and secondary-extinction simulation with interactive "remove or push this node" and a results table                                                                                 | should-have                                    | No                                      |
| Probability-weighted edges with styling and filtering by probability, and observed versus predicted links distinguished                                                                                | should-have                                    | No                                      |
| Individual node attributes (sex, age, rank) driving color, size and group comparisons                                                                                                                  | should-have                                    | Partly (visual encoding)                |
| Interactive correlation threshold with live edge, component and module counts                                                                                                                          | should-have                                    | No                                      |
| Zi-Pi node roles and scatter                                                                                                                                                                           | should-have                                    | No                                      |
| Taxonomy-aware coloring and aggregation                                                                                                                                                                | should-have                                    | Partly (node merging)                   |
| Italic Latin labels with collision avoidance                                                                                                                                                           | should-have                                    | No                                      |
| One-mode projection with shared-partner weights                                                                                                                                                        | should-have                                    | No                                      |
| Interaction beta diversity and sampling completeness curves                                                                                                                                            | should-have                                    | No                                      |
| Multilayer view across sites or times                                                                                                                                                                  | should-have                                    | Partly (temporal analysis)              |
| Load directly from Web of Life and Mangal with coordinates, dates and taxonomy ids                                                                                                                     | should-have                                    | No                                      |
| Vector export with a record of every parameter (null model, replicates, threshold, seed, dispersal distance)                                                                                           | must-have                                      | Partly (W15, W25)                       |
| Export to GraphML/GEXF, R-friendly matrices and edge lists, and shapefile or GeoPackage for spatial graphs                                                                                             | must-have                                      | Partly                                  |

## 11. Sources

All sources are cited inline. Core references:

- https://cran.r-project.org/web/packages/bipartite/vignettes/Intro2bipartite.pdf -- bipartite workflows, null models, indices.
- https://www.uv.es/verducam/DamnNetworks.pdf -- Goberna and Verdu 2022, microbial network cautions.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10427773/ -- metanetwork.
- https://doaj.org/article/f913913fd95242f086357d82b84f3566 -- Pawluczuk and Iskrzynski 2022, food web visualization.
- https://seelab.github.io/enaR/reference/index.html -- enaR functions.
- https://swotherspoon.github.io/QPress/articles/Mesocosm.html -- QPress workflow.
- https://doi.org/10.1371/journal.pone.0328505 -- Tam et al. 2025, qualitative models for ecosystem-based management.
- https://par.nsf.gov/servlets/purl/10312503 -- Strydom et al. 2021, predicting interaction networks.
- https://kops.uni-konstanz.de/entities/publication/8843792c-3d9a-427e-88d0-c5be7788fb7a -- Farine and Whitehead 2015.
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5656331/ -- Farine 2017, null models for animal social networks.
- https://www.biorxiv.org/content/10.1101/2020.04.29.068056.full.pdf -- Weiss et al., data-stream permutation error rates.
- https://docs.ropensci.org/spatsoc/ -- spatsoc.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3383709/ -- Drewe et al. 2012, proximity loggers on badgers and cattle.
- https://thema.univ-fcomte.fr/productions/software/graphab/download/manual-3.0-en.pdf -- Graphab 3.0 manual.
- https://cran.r-project.org/web/packages/graph4lg/vignettes/landscape_graph_3.html -- graph4lg workflow.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6727660 -- Dickson et al. 2019, Circuitscape review.
- https://ecologia.ib.usp.br/guimaraes/papers/2019_Delmas.pdf -- Delmas et al. 2019 review.
- Postdoc postings: https://www.safeguard.biozentrum.uni-wuerzburg.de/News/ViewNews.aspx?NewsId=83 ; https://www.uni-goettingen.de/en/vacancy+for+a+postdoctoral+researcher+in+kooperativ/705684.html ; https://www.bc3research.org/en/job_offer/postdoctoral-researcher-in-molecular-ecology-and-bioinformatics-for-gorbeea-project/
