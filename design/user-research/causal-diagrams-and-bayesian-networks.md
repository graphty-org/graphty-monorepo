# Causal Diagram Users: DAGs, Bayesian Networks, Causal Discovery, Time-Series Causal Graphs and SEM Path Diagrams

## 1. Summary

This population draws or learns graphs whose arrows are claims about cause and effect. Six overlapping groups share the
object:

1. epidemiologists and clinical researchers who hand-draw a directed acyclic graph (DAG) to decide which covariates to
   adjust for;
2. causal-discovery and structure-learning analysts who learn a directed graph from tabular data and argue about which
   arrows survive resampling;
3. risk, reliability and decision modelers who build probabilistic Bayesian networks (BNs) and influence diagrams in
   GeNIe, Netica, Hugin or AgenaRisk and query them with evidence, sensitivity analysis and expected utility;
4. psychologists, ecologists and social scientists who fit structural equation models (SEM) and draw path diagrams;
5. climate, Earth-system, ecology and engineering analysts who learn lagged causal graphs from multivariate time series
   (Tigramite's PCMCI family, Granger causality, vector autoregression, dynamic BNs);
6. industry data scientists who use graphical causal models for root-cause analysis and what-if questions (DoWhy's
   graphical causal model module), often on graphs derived from a service or business topology.

The node roles (exposure, outcome, latent, adjusted, evidence, decision, root cause) and the questions asked are not
network statistics: which paths are open, which set blocks confounding, which independencies the graph implies, how
often an arrow survives bootstrap, at which lags a variable drives another, what a node's posterior is given evidence,
which upstream node explains an anomaly. Graph size splits the population. A median published DAG has 12 nodes; SEM
models have tens. But BN, discovery and root-cause users work with hundreds of nodes (the benchmark ANDES has 223, MUNIN
1,041; a microservice benchmark has 212 metrics), and time-series graphs multiply each variable pair by a lag
dimension. The usual deliverable is a figure plus a computed answer (an adjustment set, an averaged network, a lag
graph, a posterior, a ranked list of root causes, fit indices).

Neighbors in Graphty's research: psychometric network analysts (undirected estimated networks,
`psychometric-network-analysis.md`); systems mappers who draw signed, cyclic causal loop diagrams
(`systems-and-stakeholder-mapping-civic.md`); neuroscientists who compute directed Granger-causality connectivity
between EEG, MEG or intracranial channels (`network-neuroscience-connectomics.md`, which covers that population's
Granger work); dependency engineers whose service graphs feed root-cause models
(`dependency-and-impact-analysis-engineers.md`). A causal DAG differs from all of them: it forbids cycles (except
across time), gives nodes roles, and is analyzed with d-separation rather than centrality.

## 2. Population

**Who they are.**

- **Epidemiologists, clinical researchers, biostatisticians.** A review of 234 applied health articles (1999-2017)
  mentioning DAGs found 73.5% were published from 2015 onward (Tennant et al. 2021,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8128477). The BMJ published a methods guide telling clinical researchers to
  draw a DAG before analysis and include it in the paper (Feeney, Hartwig and Davies, BMJ 2025;388:e078226,
  https://thefeeney.netlify.app/research/TF_2025_DAGs.pdf). A UCSF tutorial (Digitale, Martin and Glymour, J Clin
  Epidemiol 2022, https://doi.org/10.1016/j.jclinepi.2021.08.001) recommends the DAG as a lead figure in proposals and
  papers. DAGs also appear in sociology, education and economics (Pitts and Fowler, https://arxiv.org/pdf/2305.12006).
- **Causal-discovery analysts**: statisticians, cohort methodologists, psychopathology researchers. They run PC, FCI,
  GES/FGES, hill-climbing, NOTEARS or LiNGAM in bnlearn, pcalg (with tpc and micd), Tetrad, causal-learn, pgmpy or
  CausalNex (https://arxiv.org/html/2108.13395v3; https://pmc.ncbi.nlm.nih.gov/articles/PMC12904928/).
- **BN risk, reliability and decision modelers**: environmental risk assessors, safety engineers, medical
  decision-support researchers, cybersecurity and infrastructure analysts. Of 72 environmental risk BNs, most were
  expert systems built from literature and expert knowledge; only 7 learned structure from data; 18 included decision
  or utility nodes (Kaikkonen et al. 2021, https://pmc.ncbi.nlm.nih.gov/articles/PMC7821106). A healthcare review of
  123 BN studies concluded BNs are "not used to their full potential" (Kyrimi et al., https://arxiv.org/abs/2002.08627).
  AgenaRisk is used for trauma care and cybersecurity
  (https://qmul.ac.uk/eecs/research/featured-research/new-software-helps-improve-critical-decision-making); CISA lists
  BN analysis for maritime resilience (https://cisa.gov/mts-resilience-resources/bayesian-network-analysis).
- **SEM and path-analysis users**: psychologists, education, management and marketing researchers (lavaan, Mplus,
  AMOS), and ecologists using piecewise SEM with d-separation tests (https://cloud.r-project.org/web/packages/pwSEM/index.html).
- **Time-series causal discovery analysts**: climate and Earth-system scientists, ecologists, hydrologists, engineers.
  Tigramite (Runge, PIK Potsdam) offers PCMCI (lagged links), PCMCI+ (adds contemporaneous links), LPCMCI (latent
  confounders), RPCMCI (regime-specific graphs) and J-PCMCI+ (multiple contexts) (https://jakobrunge.github.io/tigramite/;
  https://tocsy.pik-potsdam.de/tigramite.php). The Earth-system review that frames the field is Runge et al. 2019
  (https://arxiv.org/pdf/1702.07007 is the related method preprint). Economists and other time-series analysts use
  Granger causality and vector autoregression (VAR); GeNIe and others support dynamic BNs with time slices
  (https://support.bayesfusion.com/docs/GeNIe/dbns_creatingdbn.html).
- **Industry causal-AI practitioners**: data scientists and site-reliability teams doing root-cause analysis (RCA),
  what-if and attribution with DoWhy's graphical causal model (GCM) module
  (https://www.pywhy.org/dowhy/main/example_notebooks/gcm_rca_microservice_architecture.html). AWS published a
  business RCA example (explaining a profit drop) built on a NetworkX graph
  (https://aws.amazon.com/blogs/opensource/root-cause-analysis-with-dowhy-an-open-source-python-library-for-causal-machine-learning).
  An ASE 2024 evaluation of 21 causal-inference RCA methods on microservice benchmarks (up to 212 metrics, Train
  Ticket) found "All common causal discovery methods have difficulties in dealing with large graphs and estimating edge
  directions" and that RCA run time "increases significantly as the size of microservice systems grows" (Pham, Ha and
  Zhang, https://arxiv.org/html/2408.13729v1).

**Rough size (evidence, with caveats).** Counts retrieved 2026-11-25; CRAN and PyPI windows are the last 30 days.

| Signal                                                                                                                    | Value                                                                                   | Source                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citations: dagitty R paper; bnlearn paper; lavaan paper                                                                   | 2,962; 2,484; 33,271                                                                    | OpenAlex, e.g. https://api.openalex.org/works?search=Learning%20Bayesian%20Networks%20with%20the%20bnlearn%20R%20Package                                                                                                                                              |
| Citations: PCMCI paper (Runge et al. 2019, Sci Adv); Earth-system causal inference review (Runge et al. 2019, Nat Commun) | 1,628; 1,391                                                                            | https://api.openalex.org/works?search=Detecting%20and%20quantifying%20causal%20associations%20in%20large%20nonlinear%20time%20series%20datasets ; https://api.openalex.org/works?search=Inferring%20causation%20from%20time%20series%20in%20Earth%20system%20sciences |
| Citations: Granger 1969                                                                                                   | 29,645                                                                                  | https://api.openalex.org/works?search=Investigating%20Causal%20Relations%20by%20Econometric%20Models%20and%20Cross-spectral%20Methods                                                                                                                                 |
| Citations: ESC-DAGs; causal-learn                                                                                         | 220; 206                                                                                | OpenAlex (same method)                                                                                                                                                                                                                                                |
| CRAN downloads: lavaan, bnlearn, vars, semPlot, dagitty, ggdag, pcalg, blavaan, tidySEM, piecewiseSEM, gRain, semptools   | 91,872; 34,896; 27,037; 16,339; 13,484; 8,388; 6,866; 6,606; 5,767; 3,891; 3,189; 1,065 | https://cranlogs.r-pkg.org/downloads/total/last-month/dagitty,ggdag,bnlearn,lavaan,semPlot,pcalg,gRain,tidySEM,semptools,blavaan,piecewiseSEM ; https://cranlogs.r-pkg.org/downloads/total/last-month/vars                                                            |
| PyPI downloads: causal-learn; pgmpy; dowhy; tigramite                                                                     | 318,883; 305,605; 208,673; 46,530                                                       | https://pypistats.org/api/packages/dowhy/recent (same path for the others)                                                                                                                                                                                            |
| DAGitty web traffic                                                                                                       | "used by hundreds of people per day" (author)                                           | https://dagitty.net/manual-3.x.pdf                                                                                                                                                                                                                                    |

Caveats: downloads include CI and dependency installs; lavaan and vars users mostly never draw a causal graph (vars
also serves forecasting). No user count for GeNIe, Netica, Hugin or AgenaRisk was found. The time-series citation
counts are comparable to bnlearn's, so this subgroup is not fringe.

**How often they touch graph tools.** DAG authors draw one to a few DAGs per study, at protocol and reporting time; the
BMJ guide asks for iteration with experts to consensus and inclusion of the consensus DAG in pre-registration.
Structure learners run many searches per project (100 to 200 bootstrap resamples, several algorithms and thresholds;
https://www.bnlearn.com/examples/useR19-tutorial/). BN modelers live in one model for months through alpha, beta and
gamma versions (Marcot et al. 2006, https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_journals_230532283).
SEM reporting standards ask for a path diagram per fitted model (https://pmc.ncbi.nlm.nih.gov/articles/PMC3755633).
Time-series analysts rerun PCMCI per dataset, variable selection, tau_max and alpha. RCA practitioners run attribution
per incident against a model refit on normal data.

**Skill profile.** High statistical literacy, mixed coding. DAG authors are often not programmers; DAGitty's web app
lets them draw without code, and Pitts and Fowler recommend it for quick, code-free graphs. Structure learners, SEM
users and time-series analysts write R or Python. The cohort discovery guide says "If the analyst prefers or requires
a graphical interface for causal discovery, the only available software is TETRAD" (https://arxiv.org/html/2108.13395v3).
BN modelers often work in GUIs with domain experts who never code. RCA practitioners are Python data scientists or
reliability engineers. All know d-separation, colliders or Markov equivalence better than centrality or communities.

**Team context.** DAGs are built with subject experts in workshops or by literature synthesis (ESC-DAGs,
https://pmc.ncbi.nlm.nih.gov/articles/PMC7124493) and checked by a methodologist. In environmental BNs, external
experts supplied probabilities in more than half of studies and decision makers were named end users in about a third
(Kaikkonen et al.). RCA models are owned by platform or analytics teams and read by on-call engineers or business
owners.

## 3. Personas

### Persona A: Dr. Priya Raman, clinical epidemiologist who draws DAGs (id: causal-dag-epidemiologist)

- **Role.** Assistant professor of epidemiology; observational analyses of registry and cohort data.
- **Tools today.** DAGitty web to sketch and get adjustment sets; pastes model code into R for dagitty plus ggdag, or
  TikZ for LaTeX manuscripts; Inkscape or PowerPoint for touch-ups (DAGitty's manual suggests exporting SVG to
  Inkscape, https://dagitty.net/manual-3.x.pdf). Has started trying an LLM to draft candidate variables.
- **Data.** A DAG of 9 to 16 nodes (Tennant's interquartile range), several unmeasured; the patient data never enter
  the drawing tool.
- **Goals.** A defensible minimal sufficient adjustment set; a left-to-right figure; a shareable link; alternative DAGs
  for sensitivity analysis.
- **Frustrations.** DAGitty figures look rough (no subscripts, thin lines, arrows crowding labels) while ggdag took
  Pitts and Fowler about twice as long (https://arxiv.org/pdf/2305.12006); dagitty.net storage is public and "there is
  no guarantee that dagitty.net will keep running forever" (manual); the BMJ guide warns that realistic DAGs get dense
  enough to be very hard to draw. LLM drafts cite sources that do not exist (Aziz and Brookhart, below).

### Persona B: Dr. Jonas Weber, causal-discovery methodologist on a cohort study (id: causal-discovery-researcher)

- **Role.** Postdoctoral statistician on a multi-wave child cohort; consults for psychopathology groups.
- **Tools today.** bnlearn (`hc`, `tabu`, `pc.stable`, `boot.strength`, `averaged.network`, `strength.plot`,
  `graphviz.compare`), pcalg and tpc with tiers, Tetrad's Knowledge and Search boxes, Rgraphviz.
- **Data.** 14 to 36 mixed variables over several waves; 5,000 to 10,000 rows; 1% to 60% missingness per variable
  (https://arxiv.org/html/2108.13395v3; HBSC data with 9,227 students, https://pmc.ncbi.nlm.nih.gov/articles/PMC12904928/).
- **Goals.** Arrows that respect time order, stability per arc and per direction, comparison across algorithms and
  subgroups, a figure that makes uncertain orientation obvious.
- **Frustrations.** Packages disagree. For pcalg the cohort guide recommends "checking the adjacency matrix to verify
  which edges are actually undirected and which are bi-directed"; bnlearn resolves conflicts by p-value, and "there is
  no theoretical reason why the orientations obtained this way should be more likely than the alternative orientations
  not chosen"; Tetrad "took approximately 24-36 hours to complete the search" on 24 variables over two waves (same
  source). causal-learn's printed edges and drawn PAG appeared not to match for one user
  (https://www.github.com/py-why/causal-learn/issues/180). Plotting is static Graphviz.

### Persona C: Dr. Helen Okafor, Bayesian-network risk modeler (id: bayesian-network-risk-modeler)

- **Role.** Senior risk analyst at an environmental consultancy (or reliability engineer at an offshore operator);
  stakeholders and regulators read her models.
- **Tools today.** GeNIe or Netica (structure, CPTs, learning from case files, belief bars, evidence, sensitivity,
  validation), Hugin's object-oriented networks in some firms, AgenaRisk, Excel elicitation sheets, PowerPoint.
- **Data.** 15 to 60 discrete nodes with 2 to 5 states; larger models split into submodels; CPTs from monitoring data
  (learned with EM) and expert elicitation; decision and utility nodes in about a quarter of models; dynamic versions
  with time slices for monitoring.
- **Goals.** A model stakeholders understand; scenario runs; a ranked list of which parameters and observations move
  the endpoint (tornado diagram, sensitivity to findings); the best management option by expected utility; a validated,
  documented model.
- **Frustrations.** Managers "may prefer "exact" advice rather than probability distributions" (Kaikkonen et al.);
  desktop, licensed tools stakeholders cannot open; GeNIe became harder to obtain for students after licensing changes
  (https://www.ida.liu.se/~732A66/info/Meeting9_21.pdf); moving models between tools is "best effort"
  (https://www.bnlearn.com/documentation/man/foreign.html).

### Persona D: Dr. Marco Silva, SEM user who must publish path diagrams (id: sem-path-diagram-analyst)

- **Role.** Associate professor in organizational psychology (or a community ecologist using piecewise SEM).
- **Tools today.** lavaan; semPlot `semPaths` for a first look; semptools or tidySEM to fix the figure; lavaangui or
  Onyx to draw a model; TikZ, PowerPoint or draw.io for the final figure.
- **Data.** 5 to 15 latent factors, 15 to 60 indicators, hundreds to thousands of respondents.
- **Goals.** A diagram per model with standardized estimates, significance marks and fit indices at journal column
  width; ellipses for latents, rectangles for observed variables.
- **Frustrations.** Existing packages are "very difficult to customize" and default placement "not very aesthetically
  pleasing" (https://cran.r-project.org/web/packages/tidySEM/vignettes/Plotting_graphs.html); `semPaths` adds no
  significance markers (https://cran.r-project.org/web/packages/semptools/vignettes/semptools.html); lavaan's author
  wrote in 2012 that he drew publication diagrams by hand in LaTeX and TikZ
  (https://groups.google.com/g/lavaan/c/yEOgyBZVK_Q); free WYSIWYG options are few
  (https://groups.google.com/g/structural-equation-modeling/c/Iv9OiSOCrfk).

### Persona E: Dr. Lena Brandt, climate scientist learning lagged causal graphs (id: time-series-causal-discovery-analyst)

- **Role.** Research scientist studying teleconnections (for example, how a tropical sea-surface temperature index
  drives monsoon rainfall at given lags) or ecosystem fluxes from station data.
- **Tools today.** Python with Tigramite (PCMCI, PCMCI+, LPCMCI), xarray and pandas; statsmodels or R `vars` for
  Granger tests and VAR models; matplotlib figures from Tigramite's `plot_graph` and `plot_time_series_graph`.
- **Data.** N = 4 to a few dozen climate indices or grid-cell aggregates, T = hundreds to tens of thousands of time
  steps; tau_max chosen from lag functions (8 in the Tigramite basics tutorial). Output is an (N, N, tau_max+1) array.
- **Goals.** Which variables drive which, at which lags, with what strength; which links are contemporaneous and
  unoriented; how the graph changes across regimes or seasons; a process-graph figure for the paper.
- **Frustrations.** No source found describing her complaints directly. Implied by the tools: figures are static
  matplotlib, several lags must be read from one edge label, and a time-unrolled view grows to N times tau_max nodes.

### Persona F: Arjun Mehta, data scientist doing causal root-cause analysis (id: causal-rca-data-scientist)

- **Role.** Senior data scientist on an e-commerce platform's reliability or analytics team.
- **Tools today.** DoWhy GCM, NetworkX, pandas, tracing tools that yield a service call graph (the DoWhy notebook
  mentions AWS X-Ray), notebooks and dashboards.
- **Data.** A causal graph of 10 to a few hundred metric nodes, derived from an existing topology (11 services and 13
  edges in the DoWhy notebook; 212 metrics in the largest ASE 2024 benchmark); normal-period and incident-period
  samples per node.
- **Goals.** A ranked, confidence-bounded list of upstream causes for an anomaly or a lasting shift; a what-if estimate
  of a fix; a picture on-call engineers trust.
- **Frustrations.** Discovery methods struggle with large graphs and edge directions, and run time grows with the
  number of services (ASE 2024); results come back as bar charts detached from the graph.

## 4. Use cases (ranked by frequency times stakes)

1. **Choose the adjustment set for an observational effect.** Every DAG study; a wrong set biases the estimate.
   Tennant: 48% reported the DAG-implied set; 73% also reported bespoke or unclear sets.
2. **Publish causal assumptions as a figure.** Every DAG, SEM, BN and time-series causal paper; 62% of DAG papers made a
   DAG available (Tennant).
3. **Query a BN: evidence, sensitivity, best decision.** Daily for BN modelers; high stakes in medicine, safety and
   environment.
4. **Diagnose bias structures** (open backdoor paths, colliders, mediators, selection). Teaching and protocol review.
5. **Learn a directed structure from tabular data and judge which arcs are stable.** Many runs per project.
6. **Learn a lagged causal graph from time series.** Per dataset and configuration; feeds climate and ecology papers.
7. **Attribute an anomaly or a shift to upstream causes (RCA), and estimate what-if fixes.** Per incident; high
   operational stakes.
8. **Fit and report an SEM path diagram.** Every SEM paper.
9. **Build a consensus DAG from experts, literature or an LLM draft; keep alternatives for sensitivity analysis.**
   ESC-DAGs, DAGWOOD (https://arxiv.org/abs/2004.04251), BMJ step 3.
10. **Test a DAG against data and revise it.** Rare in practice (none of Tennant's sample did); dagitty and
    expert-in-the-loop refinement target it (https://proceedings.mlr.press/v286/ankan25a.html).
11. **Compare learned graphs across algorithms, subgroups or a reference graph** (SHD, SID, true and false arcs).
12. **Find an instrumental variable or front-door strategy** when adjustment fails (occasional, Mendelian
    randomization).

## 5. Step-by-step workflows

### Workflow 1: Draw a DAG, mark roles, read adjustment sets, report (DAGitty web plus R)

Sources: DAGitty manual 3.1, BMJ guide, Tennant et al., Pitts and Fowler, ggdag vignette
(https://ftp.fau.de/cran/web/packages/ggdag/vignettes/intro-to-ggdag.html).

1. **Define the question**: population, exposure, outcome, estimand (total or direct). Only 21% of reviewed papers
   stated an estimand.
2. **List candidate variables, including unmeasured ones** (causes of exposure, outcome or selection), from literature
   and experts. Digitale et al. advise drawing unmeasured variables, merging those with identical arrows.
3. **Optional LLM draft.** Prompt an LLM for candidate variables and edges with justifications, then review every edge
   and citation. Evidence and limits: Aziz and Brookhart (Clinical Epidemiology 2025) had GPT-4o and o1 build DAGs for
   a statin study, scoring consistency across runs, acyclicity, source accuracy, completeness and prompt adherence;
   nearly all DAGs were acyclic and chain-of-thought gave the most complete ones, but none included race and many
   cited sources were hallucinated; they conclude "contemporary LLMs cannot replace a domain expert's judgment"
   (https://www.dovepress.com/can-contemporary-large-language-models-provide-the-domain-knowledge-ne-peer-reviewed-fulltext-article-CLEP).
   Huntington-Klein and Murray found "LLM judgment on confounder status is highly inconsistent across models, prompts,
   and irrelevant concerns", with repeated prompts agreeing "as little as 40% of the time in some cases"
   (https://arxiv.org/html/2412.10635v1). CausalChat draws LLM-suggested edges dotted until data confirm them
   (https://arxiv.org/html/2410.14146v1).
4. **Create the model.** Model > New Model asks for exposure and outcome. Add a node by double-clicking the canvas or
   pressing `n`; rename `r`; add an arrow by double-clicking source then target (or `c`); delete `d`. An arrow opposite
   an existing one makes a bidirected arrow (latent common cause).
5. **Set roles.** Hover and press `e` (exposure), `o` (outcome), `u` (unobserved), `a` (adjusted). Roles are mutually
   exclusive in DAGitty.
6. **Lay out by time.** Drag nodes so arrows flow one way; positions are written into the code as `pos="x,y"`. Only 34%
   of reviewed DAGs flowed one direction, and consistently directed DAGs had fewer reading errors (30% versus 41%).
7. **Read the colors.** Nodes are colored as ancestors of exposure, outcome or both; irrelevant nodes are gray; arrows
   on open biasing paths are red and on open causal paths green. Optional views: moral graph, correlation graph, and
   "atomic direct effects".
8. **Get adjustment sets.** "Adjustment (total effect)" or "(direct effect)" lists all minimal sufficient sets, updated
   live on every edit; forcing a covariate recomputes; adjusting a descendant of the exposure leaves no valid set;
   unobserved nodes are excluded.
9. **Check alternatives.** If no set exists, ask for "ancestral instruments". Build alternative DAGs where experts
   disagree and compare sets.
10. **Save and share.** Copy the model code (the manual's save method), or publish a public dagitty.net URL ("Do not
    store any data that you consider private"). Export PDF, SVG, JPEG or PNG (online only).
11. **Publication figure.** In R: `dagitty('dag { ... }')`, then `ggdag_adjustment_set()` or `tidy_dagitty() |> ggdag()`;
    or TikZ. ggdag supports curved edges and subscripts; DAGitty does not render subscripts.
12. **Report.** The DAG-implied set per estimand, estimates from it, justified alternatives, the DAG and its code in the
    supplement. BMJ conventions: a box means conditioning; prefer an explicit latent node to a double-headed arrow;
    arrows into arrows have no formal meaning.

Timing: no source gives minutes per step.

### Workflow 2: Test the DAG against data and check its equivalence class (dagitty R)

Sources: Textor et al. 2016 (https://eprints.whiterose.ac.uk/id/eprint/109517/7/ije-sap-final.pdf), dagitty reference.

1. Paste the model code into R; node names must match data columns.
2. `localTests(dag, data, type = "cis")` tests each implied conditional independence (also "cis.loess", tetrad tests
   for latents). The paper's example had 64 implications; correct with Holm-Bonferroni.
3. `plotLocalTestResults()` shows estimates and intervals sorted by distance from zero.
4. For a failed implication, choose among a misdirected arrow, a missing latent cause or measurement error.
5. `equivalentDAGs()` and `equivalenceClass()`: arrows that vary across the class lose their arrowheads (bilirubin
   example: 41 arrows, 40 equivalent DAGs, 30 fixed). Check the adjustment set holds across the class.
6. Expert-in-the-loop refinement ranks candidate missing edges by fit impact and the expert decides (Ankan and Textor,
   UAI 2025).

### Workflow 3: Learn structure from tabular data with tiers, bootstrap and averaging (bnlearn, tpc, Tetrad)

Sources: bnlearn useR! 2019 tutorial, strength-plot example (https://www.bnlearn.com/examples/strength-plot/), cohort
guide (https://arxiv.org/html/2108.13395v3), Tetrad manual (https://tetrad-manual.readthedocs.io/), HBSC tutorial.

1. **Prepare data**: variables, waves, data type (Gaussian, discrete, conditional Gaussian). The useR! example has 143
   patients and 17 variables; the cohort guide 5,000 rows and 34 variables in six tiers. Multiple imputation (`mice`)
   or test-wise deletion for missingness.
2. **Encode knowledge**: tiers and forbidden or required arcs (`tiers2blacklist(...)` plus a whitelist; tpc `tiers`;
   Tetrad's Knowledge box). Tetrad produced no output on the cohort example without knowledge.
3. **Learn**: `hc(diff, whitelist = wl, blacklist = bl)`, or PC with alpha 0.01 and pcalg options `u2pd = "relaxed"`,
   `skel.method = "stable"`, `maj.rule = TRUE`, `solve.confl = TRUE`. Output is a DAG or a CPDAG/PAG with undirected or
   circle-marked edges.
4. **Bootstrap**: `boot.strength(diff, R = 200, algorithm = "hc")` gives each pair a strength (arc frequency) and a
   direction (orientation frequency given the arc). Tetrad: bootstrap count, resample percentage, seed; an Edges table
   of edge and orientation frequencies; Ensemble Display modes Highest, Majority, Preserved, Threshold. HBSC kept edges
   in more than 50 of 100 runs; Briganti et al. used more than 85% presence and 50% direction.
5. **Threshold**: `plot(str)` shows the strength ECDF with the automatic threshold (0.585 in useR!); analysts raise it
   (0.85).
6. **Average**: `averaged.network(str, threshold = 0.85)`; `undirected.arcs()` for undecidable orientations.
7. **Plot**: `strength.plot(avg, str)` makes arc thickness proportional to strength and dashes arcs below threshold;
   `graphviz.compare(avg, dag)` side by side; `compare(..., arcs = TRUE)` lists true and false arcs.
8. **Cross-check** packages (pcalg leaves more undirected edges, bnlearn forces orientations, Tetrad missed required
   edges) and subgroups (HBSC: SHD 143, SID 906 between genders).
9. **Use the graph**: `bn.fit`, `bn.cv`, `cpquery`, `ida()`. Some psychology tutorials then compute centrality on
   learned DAGs, a practice debated in the psychometric literature.

Python variants: causal-learn draws via `GraphUtils.to_pydot`; CausalNex runs NOTEARS, prunes with
`remove_edges_below_threshold(0.8)`, blocks arcs with `tabu_edges`, then `do_intervention`
(https://causalnex.readthedocs.io/en/0.4.2/03_tutorial/03_tutorial.html). DoWhy takes GML, DOT or a NetworkX DiGraph.

### Workflow 4: Build, learn, query and validate a Bayesian network (GeNIe, Netica, Hugin)

Sources: GeNIe manual (https://support.bayesfusion.com/docs/GeNIe/), Netica help
(https://documentation.help/Netica/X_Compiling_a_Bayes_Net.htm, https://documentation.help/Netica/X_Sensitivity_to_Findings.htm),
Marcot et al. 2006, Chen and Pollino 2012
(https://openresearch-repository.anu.edu.au/items/37755b7f-7165-44d7-bd37-ac3de00e8b4d), Kaikkonen et al.

1. **Scope and conceptual model.** Purpose, endpoint, and an influence diagram of the causal web drawn with experts
   (Marcot step 1; Chen and Pollino ask for a parsimonious structure).
2. **Build the structure.** GeNIe: choose the chance-node tool, click the canvas, name the node, define states, draw
   arcs parent to child. For large models, group nodes into submodels: Tools > Submodel creates a submodel node, one of the "special types of nodes that
   host sub-graphs of the entire graph"; double-click opens it; arcs leaving it attach to the submodel icon, with small triangles on
   inner nodes marking outside links (https://support.bayesfusion.com/docs/GeNIe/components_submodels.html). Hugin's
   object-oriented networks go further: a network class has input and output interface nodes, and an instance node
   is a reusable copy of a class wired to the parent network through those interfaces, which can be collapsed
   (Hugin course slides, https://moodle.th-ab.de/mod/resource/view.php?id=336602; Koller and Pfeffer,
   https://arxiv.org/pdf/1302.1554; https://arxiv.org/pdf/2403.16628).
3. **Parameterize.** Either elicit CPTs from experts (discretization often undocumented: over 30% of environmental
   papers, Kaikkonen) or learn them from a case file: GeNIe Data > Learn Parameters matches data columns to nodes,
   uses EM, which "is capable of learning parameters from data sets that contain missing values", and offers
   Uniformize, Randomize or Keep original starting points with a confidence (equivalent sample size) weight
   (https://support.bayesfusion.com/docs/GeNIe/learning_parameters.html).
4. **Compile and view beliefs.** Netica shows belief bars (state, percentage, bar) after compiling; GeNIe has bar-chart
   node views. Beliefs update after each finding.
5. **Enter evidence.** GeNIe: right-click, Set Evidence, pick a state; other bars update
   (https://www.ida.liu.se/~732A66/info/Meeting9_21.pdf). Run diagnostic (effect to cause) and predictive (scenario)
   queries. GeNIe also offers annealed MAP for most-probable-explanation queries
   (https://support.bayesfusion.com/docs/GeNIe/algorithms_annealedmap.html); no source found for its menu path.
6. **Sensitivity analysis.** GeNIe: mark at least one node as a Target, then Network > Sensitivity Analysis. The graph
   recolors: red nodes hold parameters important for the targets' posteriors, gray nodes none. Double-clicking the
   tornado icon on a target opens a tornado diagram: one bar per parameter, spanning the target posterior's range as
   that parameter varies (default spread 10%), red for negative and green for positive change, "sorted from the most to
   least sensitive", top 10 by default (https://support.bayesfusion.com/docs/GeNIe/bn_sensitivitybn.html). Netica:
   select the query node, Network > Sensitivity to Findings; the report ranks every other node by mutual information
   (entropy reduction) or variance reduction of the query node, given findings already entered (Netica help).
7. **Decisions.** Influence diagrams add decision nodes (rectangles) and utility or value nodes (diamonds); solving
   chooses "a decision alternative that has the highest expected gain (expected utility)"
   (https://support.bayesfusion.com/docs/GeNIe/da_ids.html). No source found for exactly how GeNIe displays per-option
   expected utilities.
8. **Dynamic models.** GeNIe: enable the Temporal Plate (areas Contemporals, Init Conditions, Temporal Plate, Term
   Conditions), set the number of time steps, draw temporal arcs with an order (lag), where "Cycles represent temporal
   processes and are allowed only for temporal arcs"; define t=0 and t=1 CPTs; unroll to check
   (https://support.bayesfusion.com/docs/GeNIe/dbns_creatingdbn.html).
9. **Validate.** GeNIe Learning > Validate: match data, choose k-fold (10 in the example) or leave-one-out, pick class
   nodes; outputs accuracy, confusion matrix, ROC curve with AUC, calibration
   (https://support.bayesfusion.com/docs/GeNIe/learning_validation.html). Netica: Network > Test Using Cases. Many
   environmental BNs skip validation (Kaikkonen).
10. **Communicate.** Screenshots with belief bars and tornado charts in reports; scenario tables. bnlearn reproduces
    belief bars with `graphviz.chart(fitted, type = "barprob")` (https://www.bnlearn.com/examples/graphviz-chart).

Timing: no source found for step durations; Marcot frames the cycle as alpha, beta and gamma versions.

### Workflow 5: Fit an SEM and publish its path diagram (lavaan, semPlot, semptools, tidySEM, AMOS)

Sources: lavaan tutorial (https://lavaan.ugent.be/tutorial/), semPaths reference, semptools and tidySEM vignettes,
AMOS guide (https://www.datavis.ca/courses/CFA-SEM/exercises/Tutorial-AG.pdf), Hoyle and Isherwood.

1. **Specify**: `=~` measurement, `~` regression, `~~` covariance. AMOS users draw latents and indicators instead.
2. **Fit**: `cfa()` or `sem()`, `summary(fit, fit.measures = TRUE, standardized = TRUE)`, `modificationIndices(fit)`.
3. **First diagram**: `semPaths(fit, what = "std", layout = "tree", rotation = 2)`.
4. **Fix the figure**: semptools `mark_sig`, `mark_se`, `mark_ci`, `rotate_resid`, `set_curve`; tidySEM layout matrix,
   `prepare_graph()`, edited node and edge tables.
5. **Draw-first route**: lavaangui (https://lavaangui.org) or Onyx (https://brandmaier.github.io/lip2026-onyx-workshop/export.html).
6. **Report**: one diagram per model, two or more fit indices, justified respecifications.

An SEM diagram is an authored hypothesis with latents; a psychometric network is estimated, undirected and laid out by
force. Piecewise SEM adds a d-separation test with Fisher's C, the same graph operation DAG users rely on.

### Workflow 6: Learn a lagged causal graph from time series (Tigramite PCMCI)

Source: Tigramite basics tutorial
(https://notebook.community/jakobrunge/tigramite/tutorials/tigramite_tutorial_basics) and API docs
(https://jakobrunge.github.io/tigramite/). The tutorial uses N = 4 variables and T = 1,000 steps.

1. **Wrap the data**: `pp.DataFrame(data, datatime=np.arange(len(data)), var_names=var_names)` (masks and missing
   values are supported).
2. **Check the series**: `tp.plot_timeseries(dataframe)` for stationarity and gaps.
3. **Choose a test**: `ParCorr(significance='analytic')` for linear dependence (nonlinear tests exist), then
   `PCMCI(dataframe=..., cond_ind_test=parcorr)`.
4. **Choose tau_max**: `pcmci.get_lagged_dependencies(tau_max=20, val_only=True)` and `tp.plot_lagfuncs(...)`; read
   where dependence decays (8 in the tutorial).
5. **Run**: `pcmci.run_pcmci(tau_max=8, pc_alpha=None)` (pc_alpha None picks it per variable by AIC from a list). It
   returns `p_matrix` and `val_matrix`, each of shape (N, N, tau_max+1); entry (i, j, tau) is the link from X^i at
   t - tau to X^j at t.
6. **Correct for multiple testing**: `pcmci.get_corrected_pvalues(p_matrix=..., fdr_method='fdr_bh')` gives `q_matrix`.
7. **Threshold**: `return_significant_links(pq_matrix=q_matrix, val_matrix=..., alpha_level=0.01)` gives the link
   matrix; `print_significant_links` lists them. Newer versions return a graph array of link strings: `-->` for a
   lagged or oriented contemporaneous link, `o-o` for an unoriented contemporaneous link (Markov equivalence), `x-x`
   for a conflicting one. Lagged links are always oriented by time.
8. **Process graph**: `tp.plot_graph(val_matrix=..., link_matrix=..., node_colorbar_label='auto-MCI',
link_colorbar_label='cross-MCI')`. Node color is auto-MCI (dependence on its own past); link color is cross-MCI
   (the strongest lag); the link label lists all significant lags ordered by strength.
9. **Time-series graph**: `tp.plot_time_series_graph(...)` unrolls variables into rows across time steps; the tutorial
   says it shows spatio-temporal pathways better while the process graph looks nicer.
10. **Variants**: PCMCI+ for contemporaneous links, LPCMCI with latent confounders, RPCMCI per regime, J-PCMCI+ across
    contexts. Granger and VAR users follow a similar loop in statsmodels or R `vars` (fit VAR, pick lag order by
    information criterion, test Granger causality per pair); no source found giving a standard graph figure for them.

### Workflow 7: Causal root-cause analysis on a service or business graph (DoWhy GCM)

Sources: DoWhy microservice notebook
(https://www.pywhy.org/dowhy/main/example_notebooks/gcm_rca_microservice_architecture.html) and AWS blog (above).

1. **Start from the dependency graph** (from tracing, for example AWS X-Ray). Latency flows from callee to caller, so
   "the causal graph of the latencies can be built by inverting the arrows of the service graph". The notebook graph
   is an `nx.DiGraph` of 11 nodes and 13 edges. The AWS business example writes the graph by hand (Shopping Event?,
   Ad Spend, Page Views, Unit Price, Sold Units, Revenue, Operational Cost, Profit).
2. **Assign causal mechanisms**: manually (root nodes get a distribution, others an additive noise model) or
   `gcm.auto.assign_causal_mechanisms(causal_model, normal_data)`.
3. **Fit and evaluate**: `gcm.fit(...)`, then `gcm.evaluate_causal_model(...)`, which flags violated assumptions per
   node and tests whether the data reject the graph.
4. **Attribute a single anomaly**: `gcm.attribute_anomalies(causal_model, target_node='Website', anomaly_samples=...)`
   inside `gcm.confidence_intervals(...)` with bootstrap; plotted as a bar chart of per-node scores (the notebook finds
   Caching Service is the main driver). Negative scores mean a node made the anomaly less likely (AWS blog).
5. **Attribute a lasting shift**: `gcm.distribution_change(...)` compares normal and incident data and attributes the
   change in the target's mean to changed mechanisms.
6. **Ask what-if**: `gcm.interventional_samples(...)` with interventions (reduce Caching Service latency by 1 s); the
   notebook shows about 1 s average improvement.
7. **Other queries in the AWS example**: `gcm.arrow_strength` and `gcm.intrinsic_causal_influence` (which nodes drive
   Profit's variance; Shopping Event dominates).

The output today is bar charts beside a graph, not scores on the graph.

## 6. Data

**Sources.** Hand-authored diagrams (DAGs, BN structures, SEM specifications) from literature, workshops and LLM
drafts; tabular data for structure learning, CPTs and SEM; multivariate time series (climate indices, station data,
sensor logs); service topologies plus metric streams for RCA. Data rarely enter the drawing tool.

**File formats.**

| Format                     | Producer                                 | Notes                                                                                                                                                              |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DAGitty model code         | DAGitty web and R                        | `dag { x [exposure,pos="0,0"] y [outcome] u [latent] x -> y <- u }`; dot-like, not DOT; `->`, `<->`, `--`; graph types dag, pdag, mag, pag                         |
| ggdag `dagify` formulas    | R                                        | `dagify(y ~ x + z, exposure = "x", outcome = "y", coords = ...)`                                                                                                   |
| BIF, XML-BIF               | BN Repository, bnlearn, pgmpy, Weka      | every repository network ships as BIF                                                                                                                              |
| NET (Hugin), DSC           | Hugin, GeNIe, bnlearn                    | bnlearn read and write "best effort"                                                                                                                               |
| DNE / NETA                 | Netica                                   | native; no open spec found                                                                                                                                         |
| XDSL                       | GeNIe                                    | native XML, includes submodels and temporal plates; third-party writers exist (https://causaliq.github.io/causaliq-core/api/bn_io_xdsl)                            |
| Hugin OOBN class files     | Hugin                                    | classes with interface nodes; no open spec found                                                                                                                   |
| Tetrad graph text          | Tetrad                                   | Nodes section, numbered Edges with `-->`, `o->`, `o-o`, `<->`; latents in parentheses                                                                              |
| bn.strength table          | bnlearn                                  | from, to, strength, direction                                                                                                                                      |
| Tigramite results          | Tigramite                                | `graph` (N, N, tau_max+1) array of link strings; `val_matrix` and `p_matrix` of the same shape (test statistic and p-value per pair and lag); `q_matrix` after FDR |
| GML, DOT, NetworkX DiGraph | DoWhy, causal-learn, bnlearn `write.dot` | DoWhy GCM models are NetworkX graphs plus mechanisms (pickled in Python, no interchange format found)                                                              |
| lavaan syntax              | lavaan, lavaangui, Onyx                  | `lavaanToGraph()` converts to dagitty                                                                                                                              |
| AMOS .amw                  | AMOS                                     | proprietary                                                                                                                                                        |

**Typical sizes.** Applied DAGs: median 12 nodes (IQR 9-16, range 3-28), median 29 arcs (IQR 19-42, range 3-99)
(Tennant). Benchmark BNs: ALARM 37 nodes, 46 arcs; ANDES 223 nodes, 338 arcs; MUNIN 1,041 nodes, 1,397 arcs
(https://www.bnlearn.com/bnrepository/). Discovery: 14-36 variables in cohort work; 10 to 50 nodes in synthetic RCA
benchmarks, up to 212 metrics in Train Ticket. Time series: N small to tens, but the unrolled view has N x (tau_max+1)
nodes. SEM: tens of nodes.

**Properties.** Directed; acyclic for DAGs and BNs, except temporal arcs in dynamic models and lagged links, where
self-loops mean autodependence. Mixed edge types: bidirected (latent confounding, SEM covariance), undirected (CPDAG,
`o-o`), circle endpoints (PAG), conflicting (`x-x`). One variable pair can carry links at several lags. Nodes carry
roles, states and CPTs, auto-dependence strength, or attribution scores; edges carry signs, strengths, bootstrap
frequencies, lags, p-values, path coefficients. Time tiers are first-class. Super-nodes appear in 17% of DAGs and as
submodels in BNs.

**Identifiers.** Node names must match data columns (dagitty, Tetrad, GeNIe learning, Tigramite `var_names`). Long
labels versus short variable names is a constant tension.

**Sensitivity.** dagitty.net publishing is public; patient data and infrastructure risk models may be restricted;
service topologies are internal.

## 7. Analysis methods

- **d-separation and paths**: enumerate exposure-outcome paths, classify causal versus biasing and open versus closed.
- **Adjustment sets** (total and direct, forced inclusions, latents excluded, validity across the equivalence class),
  instrumental variables, front-door paths.
- **Testable implications** with partial correlation, chi-square or loess and multiple-testing correction.
- **Derived graphs**: moral graph, ancestral subgraph, CPDAG display, time-unrolled graph.
- **Structure learning**: PC, FCI, GES/FGES, BOSS, hill-climbing, tabu, MMHC, NOTEARS, LiNGAM; tiers and lists.
- **Time-series discovery**: PCMCI family with MCI tests, FDR-corrected q-values, lag functions; Granger tests on VAR
  models; dynamic BNs.
- **Stability**: bootstrap arc strength and direction, averaged networks, ECDF thresholds.
- **Graph comparison**: SHD, SID, true and false arcs.
- **BN inference**: posterior marginals, most probable explanation, interventions, parameter sensitivity (tornado),
  sensitivity to findings (mutual information, variance reduction), expected utility, EM parameter learning,
  cross-validation, ROC and calibration.
- **Causal attribution**: anomaly attribution, distribution-change attribution, arrow strength, intrinsic causal
  influence, interventional samples (DoWhy GCM).
- **SEM**: fit indices, modification indices, standardized coefficients, indirect effects, piecewise d-sep tests.
- **Not used**: community detection, PageRank; centrality on learned DAGs appears in some psychology tutorials and is
  contested.

## 8. Outputs and collaboration

- **Figures**: the DAG as a lead or supplementary figure; strength plots; BN screenshots with belief bars and tornado
  charts; SEM diagrams with estimates and stars; Tigramite process and time-series graphs; RCA bar charts. Exported
  from DAGitty, ggplot, TikZ, Graphviz, semPlot or matplotlib, then hand-polished.
- **Text outputs**: the adjustment set sentence, implied independencies, averaged-network arc tables, significant-link
  lists with lags, posterior and scenario tables, ranked root causes with intervals, fit tables.
- **Sharing**: dagitty.net URLs; model code in supplements and GitHub; native BN files; pre-registered consensus DAGs.
- **Audit**: ESC-DAGs keeps an edge index and a decision log per edge; BN documentation of assumptions (Chen and
  Pollino); LLM-drafted edges need per-edge review with their cited source. No tool found supports per-arrow
  discussion or review state except a separate spreadsheet or log.

## 9. Tools landscape and pain points

| Tool                                   | Used for                                                | Loved                                                                                                       | Fails them                                                                             |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| DAGitty web                            | drawing DAGs, adjustment sets, IVs                      | free, browser, live analysis, shortcuts                                                                     | rough figures, no subscripts, exclusive roles, public-only sharing, save by copy-paste |
| dagitty R, ggdag                       | testing implications; publication DAGs                  | scriptable; ggplot quality                                                                                  | ggdag slow to style                                                                    |
| TikZ                                   | publication DAGs and SEMs                               | full control, math                                                                                          | no analysis, manual positions                                                          |
| bnlearn                                | structure learning, bootstrap, BN fitting               | complete pipeline                                                                                           | static Rgraphviz plots; p-value conflict resolution                                    |
| pcalg / tpc / micd                     | constraint-based discovery                              | tiers, missing data                                                                                         | conflict edges need adjacency-matrix checks                                            |
| Tetrad                                 | GUI discovery                                           | the only GUI, knowledge box, ensemble displays                                                              | slow (24-36 h case), missed required edges                                             |
| causal-learn, CausalNex, pgmpy         | Python discovery and inference                          | Python                                                                                                      | pydot or static plots                                                                  |
| GeNIe, Netica, Hugin, AgenaRisk        | BN build, learning, query, sensitivity, decisions, DBNs | belief bars, tornado, submodels, validation                                                                 | desktop, licensed, proprietary formats, hard for stakeholders to open                  |
| Tigramite                              | time-series causal discovery                            | PCMCI family, lag functions, two graph views                                                                | static matplotlib figures                                                              |
| statsmodels, R vars                    | Granger, VAR                                            | standard econometrics                                                                                       | no graph view found                                                                    |
| DoWhy GCM                              | RCA, attribution, what-if                               | auto mechanisms, confidence intervals                                                                       | results as bar charts off the graph; discovery weak on large graphs                    |
| lavaan + semPlot / semptools / tidySEM | SEM and diagrams                                        | free, scriptable                                                                                            | layouts hard to customize                                                              |
| AMOS, Onyx, lavaangui                  | draw-to-specify SEM                                     | WYSIWYG                                                                                                     | AMOS proprietary; few free options                                                     |
| CausalChat (research)                  | LLM-assisted causal graph building                      | dotted edges for unconfirmed LLM suggestions, red positive and green negative edges, thickness for strength | research prototype; its authors note DAG scalability is limited                        |

Cross-cutting pain points:

- Figures are drawn twice: in the analysis tool, then for publication.
- Big causal graphs become unreadable (BMJ guide; CausalChat; ASE 2024 on large RCA graphs).
- Edge uncertainty (bootstrap frequency, undecided orientation, lag significance) is static thickness or dashes.
- Interchange is fragile: BN formats "best effort"; DAGitty code is not DOT; DoWhy models have no file format.
- Analysis output (tornado bars, attribution scores, lag lists) lives in separate charts, not on the graph.

## 10. Requirements implied

Existing coverage checked: `layout-hierarchical` (Sugiyama, left-to-right option, cycle detection), `annotation`,
`export-image`, `comparison-view`, `visual-encoding-edges`, `visual-encoding-nodes`, `path-highlighting`,
`all-paths-finding`, `data-import`. No persona or capability covers causal models, graph authoring, node roles,
d-separation, probabilistic inference, endpoint marks or lags.

| #   | Requirement                                                                                                                                                                                                                   | Priority             | Already covered?                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| 1   | Author a directed graph by hand: add, rename, delete nodes and arrows, with keyboard shortcuts                                                                                                                                | must                 | No                                                                 |
| 2   | Node roles as data (exposure, outcome, latent, adjusted, selected, target, evidence, decision, utility), styled through style layers                                                                                          | must                 | No                                                                 |
| 3   | Edge types: directed, bidirected, undirected, PAG endpoint marks (tail, arrowhead, circle), conflicting (`x-x`), uncertain orientation                                                                                        | must                 | No                                                                 |
| 4   | Acyclicity enforcement while drawing, with temporal arcs and lagged links exempt                                                                                                                                              | must                 | Partial (layout-time cycle detection)                              |
| 5   | Causal path analysis: classify paths causal or biasing and open or closed given a conditioning set; color them; ancestor classes                                                                                              | must                 | No                                                                 |
| 6   | Adjustment sets (total, direct, forced, latents excluded, live recompute), instruments, implied independencies                                                                                                                | must                 | No                                                                 |
| 7   | Layered one-direction layout with persistent manual positions that round-trip in the file                                                                                                                                     | must                 | Partial                                                            |
| 8   | Import and export: DAGitty code and BIF (must); Tetrad text, XML-BIF, NET, DSC, XDSL, lavaan syntax, Tigramite graph and value arrays, NetworkX/GML for DoWhy (should)                                                        | must/should          | No (graph-io has DOT and GML only)                                 |
| 9   | Publication export: SVG/PDF with subscripts and math labels, curved edges, box for conditioning, black and white, column widths                                                                                               | must                 | Partial                                                            |
| 10  | Edge uncertainty: strength as thickness, direction confidence, dashed below threshold, interactive threshold, arc table                                                                                                       | must for discovery   | No                                                                 |
| 11  | Compare two causal graphs (side by side or overlay, true/false/missing arcs, SHD), and subgroups                                                                                                                              | should               | Partial                                                            |
| 12  | Equivalence-class view (arrows varying across equivalent DAGs drawn without heads)                                                                                                                                            | should               | No                                                                 |
| 13  | Background knowledge: tiers drawn as time bands, forbidden and required arcs, exportable as lists                                                                                                                             | should               | No                                                                 |
| 14  | Nodes as small charts (belief bars); evidence by clicking a state; posterior update                                                                                                                                           | must for BN          | No                                                                 |
| 15  | SEM conventions: ellipse latent, rectangle observed, curved covariances, residuals, labels with estimate, stars and CI                                                                                                        | should               | No                                                                 |
| 16  | Several alternative graphs in one project with their adjustment sets side by side                                                                                                                                             | should               | No                                                                 |
| 17  | Per-edge provenance and review state: source (expert, literature citation, LLM draft, learned), justification text, state proposed, accepted or rejected, with proposed edges styled differently (dotted)                     | should               | Partial (`annotation` is generic)                                  |
| 18  | Private shareable link and offline use                                                                                                                                                                                        | should               | Not covered for this use                                           |
| 19  | Size: a 12-node DAG or SEM must look as good as TikZ without manual coordinates (DAG and SEM authors); BN, discovery and RCA users need 100 to about 1,000 nodes with collapsing, filtering and focus on a target's ancestors | must                 | Partial (large-graph rendering exists; causal collapsing does not) |
| 20  | Lag-indexed directed edges: several lags per pair kept as one edge with a lag list (label ordered by strength) or as parallel edges, each with value and p-value                                                              | must for time series | No                                                                 |
| 21  | Autodependence on nodes: self-loops by lag, or node color from auto-dependence strength (Tigramite auto-MCI)                                                                                                                  | must for time series | No                                                                 |
| 22  | Two time-series views: process graph (one node per variable) and unrolled time-series graph (variables as rows, time steps as columns)                                                                                        | must for time series | No                                                                 |
| 23  | Significance control: alpha or q-value threshold and FDR choice that filters links live                                                                                                                                       | should               | No                                                                 |
| 24  | Collapsible submodel nodes with interface ports: arcs crossing the boundary attach to the submodel; expand in place; reusable class instances (Hugin OOBN); temporal plates for dynamic BNs                                   | should               | No                                                                 |
| 25  | Sensitivity output tied to nodes: color nodes by sensitivity for a chosen target, open a tornado chart per target, rank by mutual information                                                                                 | should               | No                                                                 |
| 26  | Decision and utility node shapes (rectangle, diamond) with expected utility per decision option shown on the node                                                                                                             | should               | No                                                                 |
| 27  | Attribution scores on nodes: per-node score with confidence interval for a chosen target (anomaly or distribution change), ranked, signed (negative means it made the anomaly less likely)                                    | should               | No                                                                 |
| 28  | Derive a causal graph from an imported topology by reversing all edges                                                                                                                                                        | should               | No                                                                 |

Placement note: d-separation, adjustment sets, equivalence classes, BN inference, sensitivity and attribution are
computations over the graph and belong in graphty-element (or the algorithms package it uses), returned as neutral
facts; the graphty app only presents them.

## 11. Sources

- https://pmc.ncbi.nlm.nih.gov/articles/PMC8128477 -- Tennant et al. 2021, review of 234 DAG articles.
- https://dagitty.net/manual-3.x.pdf -- DAGitty 3.1 manual.
- https://eprints.whiterose.ac.uk/id/eprint/109517/7/ije-sap-final.pdf -- dagitty R package paper.
- https://search.r-project.org/CRAN/refmans/dagitty/html/plotLocalTestResults.html -- localTests.
- https://search.r-project.org/CRAN/refmans/dagitty/html/dagitty.html -- dagitty graph types.
- https://search.r-project.org/CRAN/refmans/dagitty/html/lavaanToGraph.html -- lavaan to dagitty.
- https://arxiv.org/pdf/2305.12006 -- Pitts and Fowler, comparison of DAG software.
- https://thefeeney.netlify.app/research/TF_2025_DAGs.pdf -- Feeney, Hartwig and Davies, BMJ 2025 DAG guide.
- https://doi.org/10.1016/j.jclinepi.2021.08.001 -- Digitale, Martin and Glymour DAG tutorial.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7124493 -- ESC-DAGs protocol.
- https://arxiv.org/abs/2004.04251 -- DAGWOOD.
- https://pubmed.ncbi.nlm.nih.gov/39327907/ -- Poppe et al., review of DAG development guidance.
- https://ftp.fau.de/cran/web/packages/ggdag/vignettes/intro-to-ggdag.html -- ggdag.
- https://proceedings.mlr.press/v286/ankan25a.html -- expert-in-the-loop DAG refinement.
- https://www.dovepress.com/can-contemporary-large-language-models-provide-the-domain-knowledge-ne-peer-reviewed-fulltext-article-CLEP -- Aziz and Brookhart 2025, LLM-drafted DAGs.
- https://arxiv.org/html/2412.10635v1 -- Huntington-Klein and Murray, LLM confounder judgments.
- https://arxiv.org/html/2410.14146v1 -- CausalChat encodings and scalability note.
- https://www.bnlearn.com/examples/useR19-tutorial/ -- bnlearn workflow.
- https://www.bnlearn.com/examples/strength-plot/ -- strength.plot.
- https://search.r-project.org/CRAN/refmans/bnlearn/html/arc.strength.html -- boot.strength semantics.
- https://www.bnlearn.com/examples/graphviz-chart -- belief-bar nodes.
- https://www.bnlearn.com/documentation/man/foreign.html -- BN file formats.
- https://www.bnlearn.com/bnrepository/ -- benchmark BN sizes.
- https://arxiv.org/html/2108.13395v3 -- causal discovery with cohort data (verbatim quotes in Persona B).
- https://cran.r-project.org/web/packages/causalDisco/index.html -- tpc.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12904928/ -- HBSC causal discovery tutorial.
- https://tetrad-manual.readthedocs.io/en/latest/graph.formats.html -- Tetrad formats.
- https://tetrad-manual.readthedocs.io/en/latest/tetrad-interface/detail-callouts/detail-bootstrapping.html -- Tetrad bootstrapping.
- https://tetrad-manual.readthedocs.io/en/latest/tetrad-interface/box-by-box/knowledge-box.html -- Tetrad knowledge.
- https://www.github.com/py-why/causal-learn/issues/180 -- causal-learn print versus plot.
- https://causalnex.readthedocs.io/en/0.4.2/03_tutorial/03_tutorial.html -- CausalNex.
- https://github.com/py-why/dowhy -- DoWhy graph inputs.
- https://www.pywhy.org/dowhy/main/example_notebooks/gcm_rca_microservice_architecture.html -- DoWhy RCA notebook.
- https://aws.amazon.com/blogs/opensource/root-cause-analysis-with-dowhy-an-open-source-python-library-for-causal-machine-learning -- AWS profit-drop RCA.
- https://arxiv.org/html/2408.13729v1 -- Pham, Ha and Zhang, ASE 2024 RCA evaluation.
- https://jakobrunge.github.io/tigramite/ -- Tigramite API (methods, link strings, graph shape).
- https://notebook.community/jakobrunge/tigramite/tutorials/tigramite_tutorial_basics -- Tigramite basics tutorial.
- https://tocsy.pik-potsdam.de/tigramite.php -- Tigramite project page.
- https://arxiv.org/pdf/1702.07007 -- Runge et al., PCMCI method preprint.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7821106 -- Kaikkonen et al., environmental BNs.
- https://arxiv.org/abs/2002.08627 -- Kyrimi et al., healthcare BNs.
- https://openresearch-repository.anu.edu.au/items/37755b7f-7165-44d7-bd37-ac3de00e8b4d -- Chen and Pollino.
- https://bvbvf1.bib-bvb.de/vufind/PrimoRecord/cdi_proquest_journals_230532283 -- Marcot et al. 2006.
- https://support.bayesfusion.com/docs/GeNIe/bn_sensitivitybn.html -- GeNIe sensitivity and tornado.
- https://support.bayesfusion.com/docs/GeNIe/learning_parameters.html -- GeNIe EM parameter learning.
- https://support.bayesfusion.com/docs/GeNIe/components_submodels.html -- GeNIe submodels.
- https://support.bayesfusion.com/docs/GeNIe/dbns_creatingdbn.html -- GeNIe dynamic BNs.
- https://support.bayesfusion.com/docs/GeNIe/learning_validation.html -- GeNIe validation.
- https://support.bayesfusion.com/docs/GeNIe/da_ids.html -- influence diagram shapes and expected utility.
- https://support.bayesfusion.com/docs/GeNIe/algorithms_annealedmap.html -- GeNIe annealed MAP.
- https://moodle.th-ab.de/mod/resource/view.php?id=336602 -- Hugin OOBN course slides (instance and interface nodes).
- https://arxiv.org/pdf/1302.1554 -- Koller and Pfeffer, object-oriented BNs.
- https://arxiv.org/pdf/2403.16628 -- OOBN interface nodes in a forensic comparison.
- https://www.ida.liu.se/~732A66/info/Meeting9_21.pdf -- GeNIe evidence bars.
- https://documentation.help/Netica/X_Compiling_a_Bayes_Net.htm -- Netica belief bars.
- https://documentation.help/Netica/X_Sensitivity_to_Findings.htm -- Netica sensitivity to findings.
- https://qmul.ac.uk/eecs/research/featured-research/new-software-helps-improve-critical-decision-making -- AgenaRisk users.
- https://cisa.gov/mts-resilience-resources/bayesian-network-analysis -- CISA BN resource.
- https://lavaan.ugent.be/tutorial/ -- lavaan.
- https://search.r-project.org/CRAN/refmans/semPlot/html/semPaths.html -- semPaths.
- https://cran.r-project.org/web/packages/semptools/vignettes/semptools.html -- semptools.
- https://cran.r-project.org/web/packages/tidySEM/vignettes/Plotting_graphs.html -- tidySEM (verbatim quotes in Persona D).
- https://groups.google.com/g/lavaan/c/yEOgyBZVK_Q -- lavaan users on publication diagrams.
- https://groups.google.com/g/structural-equation-modeling/c/Iv9OiSOCrfk -- WYSIWYG SEM options.
- https://brandmaier.github.io/lip2026-onyx-workshop/export.html -- Onyx.
- https://www.datavis.ca/courses/CFA-SEM/exercises/Tutorial-AG.pdf -- AMOS tutorial.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3755633 -- SEM reporting.
- https://cloud.r-project.org/web/packages/pwSEM/index.html -- piecewise SEM.
- https://causaliq.github.io/causaliq-core/api/bn_io_xdsl -- XDSL writer.
- https://cranlogs.r-pkg.org/downloads/total/last-month/vars -- vars downloads.
- https://pypistats.org/api/packages/dowhy/recent -- DoWhy downloads (tigramite, causal-learn, pgmpy at the same path).
- https://api.openalex.org/works?search=Investigating%20Causal%20Relations%20by%20Econometric%20Models%20and%20Cross-spectral%20Methods -- Granger 1969 citations.
