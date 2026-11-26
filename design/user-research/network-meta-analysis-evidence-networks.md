# Network Meta-Analysis Authors: Treatment Evidence Networks

## Summary

A **network meta-analysis** (NMA) pools randomized trials that compare different pairs of treatments for the same
condition, so that treatments never tested head to head can still be compared through a common comparator. If trials
compare A with placebo and B with placebo, the analysis estimates A against B indirectly; when some trials also compare
A with B directly, the analysis combines direct and indirect evidence. Older papers call the method "mixed treatment
comparison" or "multiple treatments meta-analysis".

Every NMA rests on a graph, and every report is expected to draw it. **Each node is a treatment** (an intervention, a
drug class, placebo or usual care). **Each edge is a direct comparison**: at least one trial randomized patients
between the two treatments. The Cochrane Handbook defines the figure as "nodes representing the interventions in the
network and lines showing the available direct comparisons between pairs of interventions"
([Cochrane Handbook, chapter 11, section 11.1.1](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-11)).
The PRISMA extension for NMA (PRISMA-NMA) turns the figure into a reporting item: S3 asks authors to "provide a network
graph of the included studies to enable visualization of the geometry of the treatment network"; S1 asks for the
methods used to explore the geometry; S4 asks for a summary of it, including "gaps of evidence in the treatment network"
and "potential biases reflected by the network structure"
([PRISMA-NMA checklist](https://www.prisma-statement.org/s/PRISMA-NMA-checklist.pdf)).

The graph is not decoration. Four statistical questions in the method are graph questions:

1. **Is the network connected?** An NMA can only compare treatments that are linked by a path of trials. The netmeta
   function `netconnection()` exists to count the "subnetworks" and `netmeta()` fails on an unconnected network
   ([netmeta, netconnection](https://search.r-project.org/CRAN/refmans/netmeta/html/netconnection.html)).
2. **Where are the closed loops?** Inconsistency (Cochrane: "incoherence") between direct and indirect evidence can
   only be tested where a closed loop of direct comparisons exists (Cochrane Handbook, section 11.4.4.1).
3. **How much does each direct comparison contribute to each estimate?** The contribution matrix is computed by
   decomposing a flow of evidence along paths through the graph
   ([Papakonstantinou et al. 2018, "paths, flows and streams"](https://pmc.ncbi.nlm.nih.gov/articles/PMC6148216)).
4. **What does the geometry say about bias?** A star around placebo, a treatment hanging by one trial, or an edge
   carried only by high risk-of-bias trials are all read off the figure.

The population drawing these graphs is large and growing. Europe PMC finds 1,846 papers with "network meta-analysis"
in the title published in 2024 and 2,327 in 2025, up from 228 in 2015 (section 2.1). That is more per year than the
1,215 Cytoscape-citing network pharmacology works counted over three years in this research set.

What sets this population apart from every other in this research:

1. **The graphs are tiny and the statistics are elsewhere.** Median networks have 7 or 8 treatments and 10 comparisons
   (section 6). The model is fitted in R or Stata; the graph is a required view of the evidence, not an analysis canvas.
2. **Edges are bundles of trials.** One edge stands for one or many trials, and every edge attribute (number of studies,
   patients, risk of bias, effect size) is an aggregate over the trials in it, with a stated rule.
3. **Multi-arm trials are hyperedges.** A three-arm trial is one study that contributes three edges; the tools mark it
   as a shaded polygon or a colored loop so readers can tell it from three separate trials.
4. **Encodings have conventions that are used inconsistently.** Node size means participants in one tool and number of
   comparisons in another; edge width means studies, patients or inverse variance. The legend must say which.
5. **The deliverable is a journal or HTA figure**, often one network per outcome side by side, and a geometry paragraph.

## 2. Population

### 2.1 Size

| Evidence                                                  | Figure                                                                                                                                                                                                          | Source                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Papers with "network meta-analysis" in the title, by year | 9 (2010), 228 (2015), 600 (2018), 967 (2020), 1,529 (2022), 1,593 (2023), 1,846 (2024), 2,327 (2025)                                                                                                            | Europe PMC REST search `TITLE:"network meta-analysis" AND PUB_YEAR:<year>`, queried 2026-11-25 ([2024 query](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE:%22network%20meta-analysis%22%20AND%20PUB_YEAR:2024&format=json))              |
| Bibliometric count to 2018                                | 2,846 NMA articles in Web of Science to December 2018; fewer than 10 a year before 2009; 362 in 2015 and 690 in 2017; 2,610 (92%) published 2013-2018; USA 889, China 740, UK 708 articles                      | [Shi et al. 2021, BMC Med Inform Decis Mak](https://pmc.ncbi.nlm.nih.gov/articles/PMC8094555)                                                                                                                                                                   |
| Cochrane reviews titled as NMAs                           | 24 (2020), 25 (2022), 15 (2024), 19 (2025) in the Cochrane Database of Systematic Reviews                                                                                                                       | Europe PMC, `JOURNAL:"Cochrane Database Syst Rev"`, queried 2026-11-25                                                                                                                                                                                          |
| HTA submissions                                           | Of 114 NICE technology appraisals (April 2022 to March 2025) that reported an indirect comparison, 61.4% used an NMA; evidence review groups raised heterogeneity of patient characteristics in 79% of the NMAs | [ISPOR Europe 2025 poster](https://www.ispor.org/heor-resources/presentations-database/presentation-cti/ispor-europe-2025/poster-session-3-2/indirect-treatment-comparisons-in-health-technology-assessment-submissions-a-review-and-critique-of-best-practice) |
| EU joint clinical assessment                              | From January 2025 the EU HTA regulation applies; "indirect comparisons will be imperative for both the JCA and usage at a national level"                                                                       | [Johns et al. 2025, J Mark Access Health Policy](https://pmc.ncbi.nlm.nih.gov/articles/PMC12551043)                                                                                                                                                             |
| R package downloads, 2024                                 | netmeta 53,752; gemtc 21,674; multinma 8,562; pcnetmeta 5,228 (RStudio CRAN mirror only)                                                                                                                        | [cranlogs API](https://cranlogs.r-pkg.org/downloads/total/2024-01-01:2024-12-31/netmeta,gemtc,pcnetmeta,multinma)                                                                                                                                               |

**Which tools the 2024 papers name.** Of the 1,846 papers titled as NMAs in 2024, Europe PMC holds full text for 990.
A search of each tool name within the 1,846 (full text where held, abstract otherwise) finds Stata in 566, gemtc in
236, netmeta in 212, CINeMA in 170, JAGS in 76, BUGSnet in 54, MetaInsight in 25, WinBUGS in 23 and Gephi in 1
(Europe PMC, queried 2026-11-25). The counts overlap (a paper often names Stata and CINeMA), and a name in the text does
not prove the figure was drawn with that tool. An older survey of 365 drug-therapy NMAs found WinBUGS named in 57.5%,
Stata 27.9%, R 23.8% and ADDIS 6.0%, and 94.3% of models Bayesian
([Tonin et al. 2018, PLoS One](https://pmc.ncbi.nlm.nih.gov/articles/PMC5927429/)). The shift from WinBUGS to R and
Stata matters here: netmeta's `netgraph()` and Stata's `networkplot` are now the most likely sources of the published
figure.

**How many people.** No source counts NMA authors. Each paper has several authors, and a large share of 2024 output
comes from teams that publish many NMAs. Treat the population as several thousand active author teams a year,
an inference from the paper counts, plus the HEOR consultancies and HTA agencies whose submissions and appraisals do
not appear in Europe PMC.

### 2.2 Skill profile

- **Statistically trained, graph-naive.** Authors know random effects, heterogeneity and ranking statistics well. They
  meet graph vocabulary (density, components, loops) only through NMA methods papers; Tonin et al. had to introduce
  "density" and "common comparators" to the field in 2019
  ([Tonin et al. 2019, PLoS One](https://pmc.ncbi.nlm.nih.gov/articles/PMC6382117/)).
- **Script-first.** The analysis lives in R or Stata scripts that must be reproducible for peer review; a point-and-click
  tool is acceptable for checking and for figures, not as the record of the analysis.
- **Reporting-driven.** PRISMA-NMA, the Cochrane Handbook and HTA methods guides set what must appear; reviewers and
  evidence review groups check it.

### 2.3 Sub-populations

1. **Academic systematic reviewers**: clinician-epidemiologists and methodologists in universities and Cochrane groups
   writing journal NMAs, often one paper per clinical question, with two to a dozen outcomes.
2. **Industry and consultancy HEOR analysts** building indirect treatment comparisons for reimbursement submissions to
   NICE, the Canadian agency and, since 2025, the EU joint clinical assessment. They build one network per comparator
   set requested by each payer.
3. **HTA assessors and guideline methodologists**: evidence review groups that critique and re-run a company's NMA,
   and guideline developers who run NMAs to choose a recommendation. MetaInsight was built so that "decision makers
   perform sensitivity analyses in real time in technology appraisal meetings"
   ([Owen et al. 2019, Research Synthesis Methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC6973101)).
4. **Methods researchers** who study network geometry and plotting itself (Rucker and Schwarzer's automated drawing,
   Tonin's geometry metrics, Jain's review of plot design). Few people, but they set the conventions.

## 3. Personas

No existing Designloom persona runs an NMA. The three below are new; the first is the roster persona and the other two
are its variants.

### Persona A: Dr. Niamh Gallagher -- NMA systematic reviewer (id: nma-systematic-reviewer)

- **Role.** Clinical epidemiologist at a university, lead author of journal NMAs and an author on a Cochrane review
  group; supervises a doctoral student who extracts the trial data.
- **Tools today.** R with netmeta (`netconnection`, `netgraph`, `netsplit`, `decomp.design`, `netrank`), gemtc when a
  co-author insists on a Bayesian model, CINeMA for the confidence rating, Excel for extraction, RevMan for pairwise
  forest plots, Illustrator to fix the network figure before submission.
- **Data.** An arm-level extraction sheet: one row per trial arm with study id, treatment, events and sample size (or
  mean, SD and n), plus a risk-of-bias table per study. Typically 7 to 25 treatments and 20 to 150 trials.
- **Goals.** A connected network for each outcome; a PRISMA-NMA S3 figure and an S4 geometry paragraph; a credible
  inconsistency check; a CINeMA rating per comparison.
- **Frustrations.** `netgraph` lays nodes on a circle by default and the edges cross; node size is off unless she
  passes a vector of participant counts; the figure has no legend saying what size and width mean; multi-arm trials
  look like three separate trials unless she sets `multiarm = TRUE`; each outcome's network comes out with nodes in
  different places.

### Persona B: Rutger Visser -- HEOR indirect comparison analyst (id: hta-indirect-comparison-analyst)

- **Role.** Senior consultant at a market-access consultancy building indirect treatment comparisons for a drug
  company's NICE submission and an EU joint clinical assessment dossier.
- **Tools today.** R (gemtc, multinma, netmeta), Stata `network` and `networkplot`, PowerPoint for the evidence
  network slides, a feasibility-assessment spreadsheet of trials by population, comparator and outcome.
- **Data.** A trial list from a systematic literature review, filtered per payer's population, intervention,
  comparator and outcome set (PICO); each PICO gives its own network.
- **Goals.** Show that the client's drug connects to every comparator a payer asked for; find the bridging trials that
  connect it; document which trials were excluded and why.
- **Frustrations.** The network changes with each inclusion decision and is redrawn by hand in PowerPoint; a trial
  dropped for a population mismatch can disconnect a comparator, and nothing warns him before the model fails; the EU
  dossier needs many PICO networks that should look alike.

### Persona C: Dr. Farah Siddiqui -- HTA evidence review assessor (id: hta-evidence-review-assessor)

- **Role.** Systematic reviewer in an academic evidence review group contracted by an HTA agency; critiques company
  NMAs and re-runs them, and sits with the appraisal committee.
- **Tools today.** MetaInsight to re-run an NMA from the company's data with studies excluded; CINeMA; R netmeta;
  Word for the critique report.
- **Data.** The company's NMA data tables, often in a PDF appendix that has to be retyped.
- **Goals.** See where the company's estimate draws its evidence from; test whether conclusions hold when a
  high-risk trial or a mismatched population is removed; show the committee the network before and after.
- **Frustrations.** Company network figures omit trial counts and encodings; a disconnected comparator is often
  presented as connected by a single old trial; risk of bias is reported in a table and never on the network.

## 4. Use cases (ranked)

Ranked by how many NMA authors do it and how much it depends on the network view.

| Rank | Use case                                                                                                                 | Who                                | Network dependence                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------- |
| 1    | Draw the PRISMA-NMA S3 network figure with stated node-size and edge-width measures                                      | Everyone                           | High: it is the figure                                                        |
| 2    | Check the network is connected, and find disconnected subnetworks before fitting                                         | Everyone                           | High: a component computation                                                 |
| 3    | Describe geometry in the S4 paragraph: nodes, edges, studies per edge, multi-arm trials, closed loops, star-shaped parts | Academic reviewers                 | High                                                                          |
| 4    | Find closed loops and locate inconsistency (loop-specific, node-splitting, design-by-treatment)                          | Reviewers, assessors               | High: loops are cycles in the graph                                           |
| 5    | Rate confidence per comparison (CINeMA) with risk of bias colored on nodes and edges and a contribution matrix           | Reviewers, assessors               | Medium: the rating is a table, the colors and contributions live on the graph |
| 6    | Draw one network per outcome side by side with the same node positions                                                   | Reviewers with several outcomes    | High                                                                          |
| 7    | Sensitivity: remove studies and see which treatments disconnect                                                          | HTA assessors, HEOR analysts       | High                                                                          |
| 8    | Show which comparisons feed one estimate (evidence flow)                                                                 | Methods-aware reviewers, assessors | High                                                                          |
| 9    | Rank treatments and present league tables                                                                                | Everyone                           | Low: a table and a forest plot                                                |

## 5. Step-by-step workflows

### 5.1 From arm-level data to the network graph in R netmeta

Sources: [Harrer et al., Doing Meta-Analysis in R, chapter 12](https://doing-meta.guide/netwma.html);
[netmeta netgraph reference](https://search.r-project.org/CRAN/refmans/netmeta/html/netgraph.netmeta.html);
[netmeta netconnection reference](https://search.r-project.org/CRAN/refmans/netmeta/html/netconnection.html);
[netmeta source, R/netgraph.netmeta.R](https://github.com/guido-s/netmeta).

1. **Shape the data as contrasts.** Each row is one pairwise comparison with an effect size `TE`, its standard error
   `seTE`, `treat1`, `treat2` and a study label. Arm-level data are converted with `pairwise()`. The tutorial's
   example, `TherapyFormats`, has 7 treatments, 182 studies and 184 comparisons in 17 designs, including one three-arm
   study. "Multi-arm studies" must carry the same study label: "it is the only way to let the function know if there
   are multi-arm trials."
2. **Check connectivity.** `netconnection()` returns `n.subnets`, the number of subnetworks; a value of 1 means the
   network is connected. Its distance matrix is block-diagonal for a disconnected network, one block per subnetwork.
   The package's own example shows `netmeta()` failing on an unconnected network and fitting each subnetwork with
   `subset = nc$subnet == 1`.
3. **Fit the model.** `netmeta(TE, seTE, treat1, treat2, studlab, data, sm = "SMD", reference.group = "cau", ...)`.
4. **Draw the network.** `netgraph(m.netmeta, labels = long.labels)`. Defaults: nodes start on a circle
   (`start.layout = "circle"` in 2D, `"eigen"` in 3D); edge width `thickness = "number.of.studies"`, rescaled by
   square root, between `lwd/2.5` and `4 * lwd`. Options: thickness from inverse standard error, model weights,
   `"equal"` or a user matrix; `number.of.studies = TRUE` prints the count on each edge; `points = TRUE` with a
   `cex.points` vector sizes nodes (for example by participants); `multiarm = TRUE` shades each multi-arm study as a
   colored polygon; `highlight = "A:B"` marks comparisons; `dim = "3d"` draws in 3D with the rgl package.
5. **Untangle the layout.** `iterate = TRUE` runs stress majorization from the starting layout ("an 'ideal' distance
   (e.g., the graph distance) between two nodes" approximated "in the sense of least squares"). `seq = "optimal"`
   gives a circular order with "a reduced (sometimes minimal) number of crossings". The source notes that the best
   start "depends on the network structure", so authors try several.
6. **Test inconsistency.** `decomp.design()` decomposes Cochran's Q into within-design and between-design parts (the
   tutorial's fixed-effect between-design Q is 101.83 on 12 degrees of freedom); `netsplit()` splits each estimate into
   direct and indirect evidence; `netheat()` draws the net heat plot that locates the designs driving inconsistency.
7. **Rank and tabulate.** `netrank()` for P-scores, `netleague()` for the league table, `forest()` for estimates
   against the reference.
8. **Finish the figure outside R.** None of the netgraph outputs carry a legend for node size or edge width; authors
   add the measure in the figure caption, as Cipriani et al. did ("Width of the lines is proportional to the number of
   trials comparing every pair of treatments. Size of every circle is proportional to the number of randomly assigned
   participants") ([Cipriani et al. 2018, Lancet](https://pmc.ncbi.nlm.nih.gov/articles/PMC5889788/)).

### 5.2 The same graph in Stata (network suite and network graphs package)

Sources: [Chaimani et al. 2013, PLoS One, "Graphical tools for network meta-analysis in STATA"](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0076654);
[White 2015, Stata Journal](https://ideas.repec.org/a/tsj/stataj/v15y2015i4p951-985.html).

1. **Set up the data.** `network setup` from Ian White's `network` suite reshapes arm-level data and fits consistency
   and inconsistency models through `mvmeta`; `network map` draws the network.
2. **Draw the evidence plot.** `networkplot t1 t2` with one row per comparison; by default node and edge size are the
   number of studies; `nodeweight()` and `edgeweight()` pick other variables.
3. **Color edges by risk of bias.** `networkplot t1 t2, edgecolor(by bias)` colors each comparison green, yellow or red
   for low, unclear or high risk; a comparison takes the level of most of its studies, and a suboption averages
   instead. This is the only common tool where the aggregation rule from studies to an edge is a documented option.
4. **Show contributions.** `netweight` draws the contribution plot: squares sized by how much each direct comparison
   contributes to each network estimate.
5. **Check loops.** `ifplot` finds every triangular and quadratic loop and plots its inconsistency factor with a
   confidence interval, ordered by size.

### 5.3 Rate confidence in each comparison with CINeMA

Source: [Papakonstantinou et al. 2020, Campbell Systematic Reviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC8356302/).

1. **Upload.** A .csv in long or wide format (binary or continuous) or inverse-variance format, with a risk-of-bias
   and an indirectness judgment per study. CINeMA reports the number of studies, interventions and direct comparisons.
2. **Configure.** Review the network plot, choose the model and effect measure; "Set up your evaluation" runs netmeta
   in R and computes the contribution matrix.
3. **Color the network.** Node size by sample size or number of studies; edge width the same way; nodes colored by
   the proportion of studies at low (green), moderate (yellow) or high (red) risk; edges colored by the "Majority",
   "Average" or "Highest" risk within the comparison. "Save Plot" writes a .png.
4. **Within-study bias.** For each estimate, combine the risk of bias of the direct comparisons by their contribution,
   with the same three rules, and adjust by hand.
5. **Reporting bias, indirectness, imprecision, heterogeneity.** One judgment per estimate per domain; imprecision
   uses a clinically important effect size the user enters.
6. **Incoherence.** Review the design-by-treatment interaction test and the SIDE (node-splitting) result per estimate.
7. **Report.** The confidence starts at "High" and is downgraded one to three levels; the report downloads as .csv.
   The paper notes that multiple outcomes per project are not yet supported, so each outcome is a separate run.

### 5.4 Re-run with studies removed, in committee (MetaInsight)

Source: [Owen et al. 2019, Research Synthesis Methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC6973101).

1. **Load.** A .csv in long or wide format per outcome type, with study, treatment code, participants and the outcome
   per arm; treatment labels pasted separately.
2. **Choose the model.** Outcome, whether smaller is better, fixed or random effects.
3. **Read the network plot.** Each node is a treatment, each line head-to-head evidence, with the number of trials on
   the line.
4. **Exclude studies.** Checkboxes remove studies; the updated NMA is shown next to the full one, and the two network
   plots appear side by side. "Any treatment that loses its connection to the network disappears from the
   excluded-study plot."
5. **Read the inconsistency tab.** For closed loops, the direct-minus-indirect difference with its interval and P value.
6. **Download** results as PDF or PNG.

### 5.5 Describe the geometry with graph metrics (Tonin method, Gephi)

Source: [Tonin et al. 2019, PLoS One](https://pmc.ncbi.nlm.nih.gov/articles/PMC6382117/).

1. **Rebuild the network.** Tonin's team redrew 167 published networks in Gephi 0.9.1; only 167 of 477 NMAs (35.0%)
   reported enough to reproduce their plot.
2. **Count.** Number of nodes, number of edges, and studies per edge.
3. **Density.** Connections divided by possible connections: "how many edges are needed to complete the network".
   Median 0.39, range 0.07 to 1.00.
4. **Percentage of common comparators.** The share of nodes with more than one connection; loose ends are poorly
   compared interventions. Median 68%.
5. **Median thickness.** Median studies per edge (median 2.0, IQR 1.0 to 3.0).
6. **Percentage of strong edges.** Edges backed by more than one study. Median 53%.
7. **Drop the misleading ones.** The authors rejected average path length, average weighted degree and mean thickness
   as redundant or misleading (density and average path length correlate at -0.918).
8. **Report** the seven metrics in the S4 geometry paragraph next to the figure.

### 5.6 Connect the client's drug to the payer's comparators (HTA feasibility)

Sources: [ISPOR Europe 2025 poster on NICE submissions](https://www.ispor.org/heor-resources/presentations-database/presentation-cti/ispor-europe-2025/poster-session-3-2/indirect-treatment-comparisons-in-health-technology-assessment-submissions-a-review-and-critique-of-best-practice);
[EUnetHTA 21 guideline on direct and indirect comparisons](https://www.eunethta.eu/wp-content/uploads/2022/08/EUnetHTA-21-Deliverable-D4.3.2-Methodological-Guideline-on-Direct-and-indirect-comparisons-V1.0.pdf);
[netmeta netconnection](https://search.r-project.org/CRAN/refmans/netmeta/html/netconnection.html).

1. **Take the payer's PICO.** Each population and comparator set requested is a separate decision problem, and the EU
   assessment may request several.
2. **Filter the trial list** from the systematic literature review to the PICO, recording each exclusion and its reason.
3. **Build the network and check connectivity.** If the client's drug and a requested comparator fall in different
   subnetworks, an anchored NMA is not possible; the EUnetHTA guideline treats disconnected networks separately, and an
   ISPOR 2023 abstract lists "acceptance of disconnected networks" as a point where agencies diverge.
4. **Find a bridge.** Look for trials, often older or in a broader population, whose comparisons join the two
   subnetworks, and judge whether including them is defensible.
5. **Redraw per PICO.** One network slide per PICO with the same treatment positions so reviewers can compare them.
6. **Hand over** the networks, the trial list, the exclusion log and the model to the submission team.

### 5.7 One network per outcome, side by side

Source: [Cipriani et al. 2018, Lancet](https://pmc.ncbi.nlm.nih.gov/articles/PMC5889788/).

1. **Run each outcome.** Cipriani et al. analyzed 21 antidepressants plus placebo from 522 trials (116,477
   participants), with efficacy and acceptability as the two primary outcomes.
2. **Draw a panel per outcome.** Figure 2 shows "Network meta-analysis of eligible comparisons for efficacy (A) and
   acceptability (B)": same 22 treatments, different trials per outcome.
3. **Keep positions fixed** so readers see which comparisons drop out for the second outcome. In netmeta this means
   passing the same `seq` and starting layout to every call; stress iteration per outcome moves nodes.
4. **State the encodings once** in the caption for all panels.

## 6. Data

### 6.1 The input table

The input is never a graph file. It is a trial-arm table (study, treatment, sample size, outcome per arm) or a contrast
table (study, treatment 1, treatment 2, effect, standard error), plus a study-level table of risk-of-bias and
indirectness grades. The graph is derived: nodes are the distinct treatments, edges are the distinct treatment pairs
that share a study, and a k-arm study yields k(k-1)/2 edges that belong together.

### 6.2 Sizes

| Corpus                                | Treatments (nodes)               | Comparisons (edges)              | Studies                            | Source                                                                    |
| ------------------------------------- | -------------------------------- | -------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| 167 reproducible NMA networks to 2017 | median 8 (IQR 6-11), range 3-42  | median 10 (IQR 6-16), range 3-66 | median 22 (IQR 13-35), range 3-157 | [Tonin et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6382117/)    |
| 365 drug-therapy NMAs                 | median 7, range 3-71             | not reported                     | median 21, range 3-450             | [Tonin et al. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5927429/)    |
| 441 network plots in 162 cancer NMAs  | median 8 (IQR 5-11), range 3-112 | not reported                     | not reported                       | [Jain et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10927000/)    |
| Antidepressants (Cipriani 2018)       | 22                               | not reported                     | 522                                | [Cipriani et al. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5889788/) |

Scale is never the problem: the largest network found here has 112 nodes. The difficulty is many small graphs (one
per outcome, per PICO, per sensitivity analysis) that must stay comparable.

### 6.3 Attributes

- **Node**: treatment name and short code, class (drug class or mechanism), total participants, number of studies,
  share of studies at each risk-of-bias level.
- **Edge**: number of studies, total participants, inverse-variance or model weight, direct effect estimate, a
  risk-of-bias and indirectness grade aggregated by majority, average or highest, and later a CINeMA confidence level.
- **Study (hyperedge)**: the arms it compares, design (the set of treatments), year, population, risk-of-bias grade.

## 7. Analysis methods

| Method                          | Graph view of it                                                                                                                             | Where it lives today                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Connectivity check              | Connected components of the treatment graph                                                                                                  | netmeta `netconnection`; MetaInsight drops disconnected nodes after an exclusion   |
| Geometry description            | Node and edge counts, density, share of nodes with degree above 1, median studies per edge, share of edges with more than one study          | Hand counts or Gephi (Tonin)                                                       |
| Closed loops                    | Cycles of direct comparisons; triangles and quadrilaterals in Stata `ifplot`; a loop made only by one multi-arm trial cannot be inconsistent | Stata `ifplot`, MetaInsight                                                        |
| Node-splitting (SIDE)           | Split each edge's estimate into the edge itself and every other path                                                                         | netmeta `netsplit`, gemtc                                                          |
| Design-by-treatment interaction | Groups studies by design (the hyperedge's node set)                                                                                          | netmeta `decomp.design`, CINeMA                                                    |
| Contribution matrix             | Decomposition of each estimate's evidence flow into paths and streams through the graph                                                      | netmeta `netcontrib` (method "shortestpath" and others), Stata `netweight`, CINeMA |
| Study-to-edge aggregation       | Majority, average or highest grade over the studies on an edge                                                                               | Stata `networkplot edgecolor(by ...)`, CINeMA                                      |
| Ranking                         | Not a graph computation                                                                                                                      | `netrank`, SUCRA                                                                   |

## 8. Outputs and collaboration

- **The network figure** (PRISMA-NMA S3): one per outcome, in the main paper or the appendix, with the measures named
  in the caption.
- **A geometry paragraph** (S4): counts, loops, star-shaped parts, gaps.
- **League table and forest plots** of estimates, which carry the results; the network carries the evidence base.
- **CINeMA report** with a confidence level per comparison.
- **HTA dossiers**: one network slide per PICO, an exclusion log, and the evidence review group's re-drawn network.

Reviewers criticize what is missing. In 318 NMAs, "39% did not present a network diagram"
([Chambers et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4414531)); in 365 drug NMAs, 78.6% drew a network but
only 54.8% described its geometry ([Tonin 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5927429/)); only 35.0% gave
enough to reproduce the plot ([Tonin 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6382117/)). In 166 cancer NMA
articles, 76% used a circle layout, 58% encoded node size and 68% edge width, 13% node color and 14% edge color; circle
layouts "quickly lead to a 'hairball' effect once node and edge count are moderately large", and the authors recommend
force-based layouts and color for drug class ([Jain et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10927000/)).
Tonin et al. warn that node size by participants can mislead unless it counts every sample for that intervention.

## 9. Tools landscape and pain points

| Tool                            | What it does for the graph                                                                                                                                                                                   | Limits                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| netmeta `netgraph` (R)          | Circle, eigenvector or random start, stress majorization, edge width from studies or weights, node points sized by a vector, multi-arm polygons, highlighted comparisons, study counts on edges, 3D with rgl | No legend; node size off by default; positions differ per outcome unless fixed by hand; static base-R plot |
| Stata `networkplot`             | Node and edge size by studies or a variable, edges colored by a three-level risk-of-bias rule                                                                                                                | Circle layout; static                                                                                      |
| gemtc `plot` (R)                | igraph plot with edge thickness by number of studies                                                                                                                                                         | Few options; tutorial reseeds a Fruchterman-Reingold layout for a cleaner view                             |
| BUGSnet `net.plot` (R)          | igraph layout, default `layout_in_circle`; node and edge scale by studies; `flag` colors one treatment's comparisons; study counts                                                                           | Static                                                                                                     |
| pcnetmeta `nma.networkplot` (R) | Node size by total sample size or by number of direct comparisons (default); multi-arm studies as "shaded treatment loops in different colors"                                                               | Alphabetical circle order                                                                                  |
| CINeMA (web)                    | Node and edge size by sample size or studies; node and edge colors by risk-of-bias rule                                                                                                                      | One outcome per project; PNG only                                                                          |
| MetaInsight (web)               | Network plot with trial counts; side-by-side network before and after excluding studies                                                                                                                      | Fixed encoding                                                                                             |
| Gephi                           | Geometry metrics (Tonin)                                                                                                                                                                                     | No NMA concepts; manual rebuild                                                                            |

Sources: [BUGSnet net.plot source](https://github.com/audrey-b/BUGSnet/blob/master/R/net.plot.R);
[pcnetmeta reference](https://search.r-project.org/CRAN/refmans/pcnetmeta/html/nma.networkplot.html);
[Rucker and Schwarzer 2016, automated drawing](https://zendy.io/title/10.1002/jrsm.1143).

**Cross-cutting pain points.**

1. Node size and edge width mean different things in different tools (participants, studies, comparisons, weights),
   and no tool writes the measure into the figure.
2. Multi-arm trials look like separate two-arm trials unless an option is set.
3. Circle layouts cross edges; the fix (stress majorization, optimal order) is an option few authors find.
4. Each outcome's network is drawn independently, so panels do not line up.
5. Risk of bias lives in a table; only Stata and CINeMA color it onto the graph, each with its own rule.
6. Connectivity is checked only when the model fails, not while trials are being included or excluded.
7. Geometry metrics are counted by hand.
8. Figures are finished in Illustrator or PowerPoint.

## 10. Requirements implied

| Requirement                                                                                                                                                          | Priority | Covered today?                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| Build the treatment graph from an arm-level or contrast table: nodes from distinct treatments, one edge per treatment pair, each study kept as a group over its arms | Must     | Partial (table-to-graph building is planned; studies as groups is hypergraph-data, planned)          |
| Draw multi-arm studies as shaded polygons over their treatments, distinct from two-arm trials                                                                        | Must     | No                                                                                                   |
| Aggregate study attributes to each edge: counts and sums, and majority, average or highest of an ordinal grade                                                       | Must     | No                                                                                                   |
| Node size and edge width from evidence counts, with the measure and its scaling stated in the legend and the export                                                  | Must     | Partial (encoding and legends exist; stating the measure and rescaling rule in export does not)      |
| Edge and node color from a risk-of-bias or confidence grade with a fixed green, yellow, red scale                                                                    | Must     | Partial (encoding exists; the grade aggregation does not)                                            |
| Connectivity check that names each disconnected subnetwork and updates live as studies are excluded                                                                  | Must     | Partial (component analysis exists; live exclusion does not)                                         |
| Geometry metrics: nodes, edges, density, share of common comparators, median studies per edge, share of strong edges, number of independent closed loops             | Must     | Partial (basic statistics give counts and density only)                                              |
| List closed loops and mark loops formed only inside one multi-arm study                                                                                              | Should   | No                                                                                                   |
| Circular start layout in a chosen treatment order, refined by stress majorization, with a crossing-reducing order                                                    | Must     | Partial (Kamada-Kawai exists in the layout package; a circle-seeded run with a fixed order does not) |
| One network per outcome side by side with shared node positions                                                                                                      | Must     | Partial (small multiples and shared layouts are planned)                                             |
| Show an estimate's evidence flow: highlight the paths and their share for one chosen comparison                                                                      | Should   | No                                                                                                   |
| Journal figure export at a given width and dpi with legend and caption text                                                                                          | Must     | Partial (journal figure export is planned)                                                           |
| Before-and-after view when studies are excluded, with dropped treatments marked                                                                                      | Should   | Partial (comparison view is planned)                                                                 |

The statistics (models, node-splitting, design-by-treatment, ranking) stay in R and Stata. The product draws, checks
and describes the graph those packages use.

## 11. Sources

- https://www.prisma-statement.org/s/PRISMA-NMA-checklist.pdf -- PRISMA-NMA items S1 (methods for geometry), S3 (network graph to visualize the geometry), S4 (summary of geometry, gaps, biases).
- https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-11 -- Cochrane Handbook chapter 11: network diagram definition, node size by participants, line thickness by trials, three-arm studies as triangles, connectedness, loops, incoherence, contribution matrix.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6382117/ -- Tonin et al. 2019: 167 networks redrawn in Gephi; median 8 nodes, 10 edges, 22 studies; density, common comparators, median thickness, strong edges.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5927429/ -- Tonin et al. 2018: 365 drug NMAs; 78.6% drew a network, 54.8% described geometry; software shares; median 7 treatments.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10927000/ -- Jain, Li and Warner 2024: 441 plots in 162 cancer NMAs; 76% circle; encoding shares; hairball quote; redesign recommendations.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4414531 -- Chambers et al. 2015: 318 NMAs, 39% with no network diagram; consistency checked in 69% of networks with a closed loop.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8094555 -- Shi et al. 2021: 2,846 NMA articles to 2018 and growth by year.
- https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE:%22network%20meta-analysis%22%20AND%20PUB_YEAR:2024&format=json -- Europe PMC title counts by year and tool-name counts, queried 2026-11-25.
- https://search.r-project.org/CRAN/refmans/netmeta/html/netgraph.netmeta.html -- netgraph arguments: start.layout, iterate, thickness, multiarm, points, number.of.studies, highlight, dim.
- https://github.com/guido-s/netmeta -- netmeta source (R/netgraph.netmeta.R): stress majorization, Laplacian eigenvector start, multi-arm polygons, optimal circular order.
- https://search.r-project.org/CRAN/refmans/netmeta/html/netconnection.html -- netconnection: number of subnetworks, block-diagonal distance matrix, fitting subnetworks separately.
- https://doing-meta.guide/netwma.html -- Harrer et al.: netmeta and gemtc tutorial on TherapyFormats (7 treatments, 182 studies).
- https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0076654 -- Chaimani et al. 2013: Stata networkplot, edgecolor by bias, netweight, ifplot.
- https://ideas.repec.org/a/tsj/stataj/v15y2015i4p951-985.html -- White 2015: Stata network suite (network setup, map, meta).
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8356302/ -- CINeMA software paper: steps, network plot encodings and colors, one outcome per project.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6973101 -- MetaInsight: workflow, side-by-side network after excluding studies, use in NICE appraisal meetings.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC6148216 -- Papakonstantinou et al. 2018: contributions from paths, flows and streams in the evidence graph.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5889788/ -- Cipriani et al. 2018: 21 antidepressants plus placebo, 522 trials, two network panels with stated encodings.
- https://www.ispor.org/heor-resources/presentations-database/presentation-cti/ispor-europe-2025/poster-session-3-2/indirect-treatment-comparisons-in-health-technology-assessment-submissions-a-review-and-critique-of-best-practice -- 114 NICE appraisals with indirect comparisons, 61.4% NMA.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12551043 -- Johns et al. 2025: EU joint clinical assessment from January 2025 and the need for indirect comparisons.
- https://www.eunethta.eu/wp-content/uploads/2022/08/EUnetHTA-21-Deliverable-D4.3.2-Methodological-Guideline-on-Direct-and-indirect-comparisons-V1.0.pdf -- EUnetHTA 21 guideline on direct and indirect comparisons, including disconnected networks.
- https://www.ispor.org/heor-resources/presentations-database/presentation/euro2023-3785/132345 -- ISPOR 2023 abstract: disconnected networks and population adjustment as points of divergence.
- https://search.r-project.org/CRAN/refmans/pcnetmeta/html/nma.networkplot.html -- pcnetmeta network plot: node size by sample size or comparisons, multi-arm shaded loops.
- https://github.com/audrey-b/BUGSnet/blob/master/R/net.plot.R -- BUGSnet net.plot: layout_in_circle default, scale by studies, flag, study counts.
- https://zendy.io/title/10.1002/jrsm.1143 -- Rucker and Schwarzer: automated drawing of network plots, circle layouts with many crossings, stress majorization.
- https://cranlogs.r-pkg.org/downloads/total/2024-01-01:2024-12-31/netmeta,gemtc,pcnetmeta,multinma -- 2024 CRAN download counts.
