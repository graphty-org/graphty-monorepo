# Academic Social Network Researchers

Academic social network researchers are faculty, postdocs and graduate students in sociology, anthropology, political
science, education, communication, public health and organizational studies. They study relationships between people
and organizations (friendship, advice, support, kinship, collaboration, co-membership, agreement in a policy debate).
Most collect those relationships themselves, with a survey roster, a name generator, an interview drawing, a
genealogy or a coded archive. Their networks are usually small by industry standards (tens to a few thousand nodes),
every node carries a rich attribute row, and claims must survive peer review: missing respondents are handled
defensibly, and results rest on permutation tests or statistical network models (QAP, ERGM, TERGM, stochastic
actor-oriented and relational event models), not on a picture alone. They use graph software at three moments:
turning raw data into a matrix, computing descriptive and inferential statistics, and drawing the sociograms that
appear in the paper. This population built the field's classic tools (UCINET, Pajek, statnet, RSiena, visone).

A neighboring population -- communication and political science researchers who build retweet, mention, co-hashtag
and coordination networks from platform data -- shares the departments but not the data, scale or tools. Section 3.6
summarizes it and points to the document that owns it.

---

## 2. Population

**Job titles and settings.** Professors, postdocs, graduate students and survey-center scientists (for example the
Carolina Population Center, which runs Add Health). A Kansas PhD seminar draws on "communication, economics,
organizational science, political science, psychology, and sociology" [KU-COMS930]; a Florida anthropology course
teaches UCINET, NetDraw, EgoNet and E-Net [UFL-ANG5420]. Postdoc postings ask for a social science PhD,
R, and SAOM and ERGM experience [MUENSTER-POSTDOC], or "analysis of organizational ... and social networks, such as via
UCINet" [BU-POSTDOC].

**Size of the population (evidence, all imperfect).**

- INSNA, the professional society, had "approximately 1,000 active members" in 2018 and "more than 800 members from 65
  countries" in 2020 [WIKI-INSNA]. Most researchers who use network methods never join.
- The Sunbelt conference drew "800 to 1000 attendees" per year around 2016, with 33 workshops and 642 workshop
  attendees in 2016 [ARO-SUNBELT-2016].
- The Gephi user survey (December 2015, 285 respondents, 46 countries, "not meant to be representative") found
  academia the largest sector and "researcher" the most common job title; 70% typically analyze social networks, 46%
  social media networks and 43% semantic networks [GEPHI-SURVEY]. It does not separate survey sociometry from social
  media work, much of which is the digital-trace work in section 3.6.
- Papers, not people: more than 70,000 "social network*" publications [ARXIV-2502.07412].
- No source found for a worldwide head count or UCINET or statnet license numbers: a large, stable, low-budget
  population with its own society, conference and workshop pipeline.

**How often they touch graph tools.** Bursty: weeks of data entry and analysis on a semester or grant cycle, then
months of writing. Students touch the tools weekly; a Kansas seminar requires an analysis script in 10 of 11 weeks
[KU-COMS930].

**Skill profile.**

- Graph literacy: high in concepts (centrality, cohesion, brokerage, equivalence, homophily), framed in sociological
  terms (ties, alters, structural holes), not computer science terms.
- Coding: three cohorts. A menu cohort (UCINET, NetDraw, Pajek, visone, ORA, NodeXL for Excel users). A growing R
  cohort: "Many texts contend that UCINET is the most commonly used software ... However ... R has become the
  gold-standard" [KU-COMS930]. A Python cohort (networkx, igraph, ALAAMEE) concentrated in computational social
  science. Statistical models are mostly R (statnet, RSiena, btergm, goldfish), with PNet and MPNet as Windows GUI
  alternatives for ERGM, multilevel ERGM and ALAAM [ALAAMEE].
- Statistics: strong. They think in regression tables, p-values, confidence intervals and goodness of fit.

**Team context.** A PI and one to three graduate students; the network module is often part of a larger survey.

---

## 3. Personas

### 3.1 Dr. Lena Brandt -- whole-network survey sociologist (id: sociometric-network-researcher)

- **Role.** Associate professor of sociology of education; runs sociometric surveys in schools and organizations.
- **Tools today.** Qualtrics or paper roster survey; Excel for cleaning; UCINET and NetDraw for descriptives and a first
  look; R (`network`, `sna`, `ergm`, `RSiena`) for models; Pajek or Gephi for the figure.
- **Data.** Friendship and advice networks of 25 to about 1,500 students, two to four waves, 10 to 50 attribute columns.
  Add Health-style nominations of "up to five male and five female (10 total) friends from this roster" [MOODY-2001];
  teacher advice networks where staff list up to 12 people [SPILLANE-SSSNQ]. Often many classrooms at once, analyzed
  as a collection of separate networks (section 5.8).
- **Goals.** Test selection versus influence (do students pick friends who drink, or start drinking after befriending
  drinkers?); report segregation or homophily; publish.
- **Frustrations.** Non-respondents and off-roster nominees; long SIENA re-runs until convergence; a different file
  format for every tool; NetDraw formatting that does not survive a session [UW-LING534]; "hairball" figures.

### 3.2 Dr. Marcus Reyes -- personal (ego) network researcher in health (id: egocentric-survey-researcher)

- **Role.** Assistant professor in public health or sociology studying social support, aging or substance use.
- **Tools today.** Qualtrics with egor's templates [EGOR-QUALTRICS]; Network Canvas (Architect designs the protocol,
  Interviewer runs it, export to CSV or GraphML) [NETCANVAS-EXPORT]; older EgoNet and VennMaker [UFL-ANG5420]; R
  `egor` for density, composition, diversity and EI index [EGOR-VIGNETTE].
- **Data.** Hundreds to thousands of separate small networks, one per respondent, each with 5 to about 50 alters
  ("important matters" generators often cap at five [GSS-NAMEGEN]; the Florida course builds a "50 alter study"
  [UFL-ANG5420]). Three linked tables: egos, alters, alter-alter ties [EGOR-VIGNETTE].
- **Goals.** One row of ego-level measures per respondent (size, density, proportion kin, heterogeneity, effective
  size, constraint) for a regression on health outcomes, plus a few illustrative egograms.
- **Frustrations.** Recall bias (respondents named on average 2.7 of an allowed 10 in one web survey [RICE-2014]);
  alter-alter questions grow with the square of the alter count; whole-network tools do not handle many small
  networks; no good way to view 500 egograms side by side.

### 3.3 Priya -- PhD student in a network methods course (id: network-methods-grad-student)

- **Tools today.** UCINET (Windows only; on a Mac, Parallels, VirtualBox or Wine, as the UCINET site recommends
  [UCINET-MAC]); NetDraw; R with Luke's _A User's Guide to Network Analysis in R_ [KU-COMS930]; Gephi for pictures;
  the Hanneman and Riddle online textbook [HANNEMAN-C6].
- **Data.** Teaching sets (Krackhardt managers, Davis Southern Women, Padgett Florentine families, Lazega lawyers) and
  her own 20 to 200 nodes; the Kansas syllabus says to pick "a smaller network (i.e., > ~200 nodes with as few as
  20-30)" [KU-COMS930].
- **Goals.** Weekly labs (density, centrality, subgroups, QAP, an ego network, a two-mode projection); one figure
  colored by attribute; a term paper "ready for conference submission" [KU-COMS930].
- **Frustrations.** Which format (DL, .net, VNA, edge list) each tool wants; menu paths that change between versions;
  Excel import that needs old file formats [HANNEMAN-C6]; not knowing which symmetrizing or dichotomizing rule is right.

### 3.4 Dr. Tomas Varga -- political scientist working from records and texts (id: archival-affiliation-researcher)

- **Role.** Political scientist or historical sociologist who builds networks from records (legislative cosponsorship,
  board interlocks, memberships, alliances, treaties) and from coded texts (who said what in a policy debate).
- **Tools today.** Scraped or hand-coded CSV; R (`igraph`, `tnet`, `btergm`, `rDNA`); Pajek for big files; Discourse
  Network Analyzer (DNA) for coding statements [DNA-GITHUB]; visone or Gephi for figures. Replication data such as the
  briatte/congress repository, which rebuilds cosponsorship networks from 1973 on [CONGRESS-REPO].
- **Data.** Person-by-group incidence data (Fowler mapped "all 280,000 pieces of legislation" in Congress
  [FOWLER-2006]); yearly networks among countries (btergm's `alliances` data: 20 yearly defense alliance networks
  among 164 countries, 1981-2000 [BTERGM]); actor-by-concept statement data from newspapers or testimony, signed by
  agreement [LEIFELD-2017]. Usually temporal and weighted.
- **Goals.** Who is central or bridging; which coalitions exist and how they shift; whether position predicts an
  outcome (bill passage, alliance formation, policy adoption).
- **Frustrations.** Projections that turn every group into a clique and inflate clustering [OPSAHL-2013]; choosing
  binary, sum or Newman weights [TNET-PROJECTION]; partial two-mode support (the R `network` package's Pajek reader
  "cannot currently handle 2-mode" files [R-NETWORK-PAJEK]); congruence networks dominated by the most quoted actors
  until normalized [LEIFELD-2017].

### 3.5 Dr. Amara Osei -- anthropologist of kinship and local networks (id: kinship-participatory-anthropologist)

- **Role.** Anthropologist who works from fieldwork: genealogies collected in a village or archive, and network maps
  drawn with informants.
- **Tools today.** Puck (a free Java program for genealogical data, by the Paris TIP group) and the Kinsources archive
  [PUCK] [KINSOURCES]; Net-Map paper sessions [NETMAP-MANUAL]; VennMaker or Network Canvas for digital drawing; UCINET
  and EgoNet from coursework [UFL-ANG5420].
- **Data.** (a) Genealogies: individuals as nodes, directed parent-child arcs and undirected marriage or union edges.
  Kinsources held 123 datasets; one 2026 study analyzed 105 of them, from 17 individuals to about 50,000 individuals
  and 83,000 edges, 249,597 individuals in total; records are incomplete (24.8% of individuals have no recorded parent)
  and carry no generation field, so generations are inferred from the parent-child structure [KINSOURCES-ARXIV].
  (b) Participatory maps: a set of actors named by the informant, up to five colored link types, an influence height and goal codes per actor
  [NETMAP-MANUAL].
- **Goals.** A census of marriage circuits (who marries whom along which kin paths) [PUCK]; genealogical diagrams by
  generation; in applied work, understanding who influences a local decision.
- **Frustrations.** Genealogy tools draw family trees but not network measures, and network tools ignore generations
  and the parent-versus-spouse distinction; hand-drawn maps must be retyped as one matrix per link type before any
  software can use them [NETMAP-MANUAL].

### 3.6 Digital-trace researchers in communication and political science (owned elsewhere)

Political communication and computational social science researchers who build networks from platform data are
owned by `social-media-disinformation-and-marketing.md` (personas `communication-network-scholar`,
`coordination-detection-scientist`).

- **Differences:** 1,000 to 20,000 accounts per map (millions before filtering); timestamped multi-relational edges
  and account-by-hashtag two-mode data; NodeXL [PEW-NODEXL], Gephi, 4CAT, Communalytic, networkx, CooRTweet
  [COORTWEET]; since Twitter's 2023 paywall [NIEMANLAB-2023], Bluesky [COMMUNALYTIC], Reddit and Telegram.

Section 5.11 summarizes their workflows.

---

## 4. Use cases (ranked)

| #   | Question answered with a graph                                                                         | Frequency                                           | Stakes                                                |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| 1   | Build an analyzable network from a roster or name-generator survey (relations, attributes, waves)      | Every survey study                                  | High: every later result depends on coding choices    |
| 2   | Describe it: density, reciprocity, transitivity, components, centralization, subgroups, core-periphery | Every study                                         | Medium: tables in every paper                         |
| 3   | Rank actors by centrality or brokerage and use the scores in a regression                              | Most studies                                        | High: the main result in many papers                  |
| 4   | Test homophily or segregation (mixing matrix, EI index, assortativity, nodematch)                      | Most school and organization studies                | High [MOODY-2001]                                     |
| 5   | Dyadic hypotheses with QAP or MRQAP                                                                    | Common                                              | High: reviewer-facing inference                       |
| 6   | Model tie formation with ERGM and check goodness of fit                                                | Common in sociology journals                        | High: misfit or degeneracy invalidates the paper      |
| 7   | Separate selection from influence over panel waves (SAOM, RSiena)                                      | Common for school panels                            | High: months of work                                  |
| 8   | Ego-level measures for many respondents                                                                | Every personal network study                        | High: these become the predictors                     |
| 9   | Two-mode affiliation data: project with weights or analyze as bipartite                                | Common in political science, history, organizations | Medium-high [OPSAHL-2013]                             |
| 10  | Handle non-respondents and boundary problems first                                                     | Every survey study                                  | High [SMITH-2021]                                     |
| 11  | Draw publication sociograms colored by attribute                                                       | Every paper                                         | Medium: readers judge the paper by them               |
| 12  | Discourse networks: code statements, compare coalitions over time (DNA)                                | Common in policy studies                            | High: the coalition map is the finding [LEIFELD-2017] |
| 13  | Yearly networks among states or organizations (TERGM)                                                  | Common in international relations                   | High [BTERGM-JSS]                                     |
| 14  | Peer influence on an outcome (network autocorrelation, ALAAM)                                          | Common                                              | High: the influence claim itself [LNAM] [ALAAMEE]     |
| 15  | Timestamped interaction sequences (relational event models, DyNAM)                                     | Growing                                             | High [GOLDFISH]                                       |
| 16  | Many whole networks analyzed together (classrooms, schools)                                            | Common in education                                 | High: pooled estimates                                |
| 17  | Kinship: genealogies, marriage circuits                                                                | Core in kinship anthropology                        | Medium [PUCK]                                         |
| 18  | Participatory influence mapping with informants (Net-Map)                                              | Common in applied anthropology and development      | Medium [NETMAP-MANUAL]                                |
| 19  | Structural equivalence classes or blockmodels                                                          | Occasional                                          | Medium                                                |

---

## 5. Step-by-step workflows

No source reports durations; any time given is an estimate and labeled so.

### 5.1 From roster survey to an analyzable whole network (UCINET and R)

Sources: [HANNEMAN-C6] [BEJ-CH5] [OGNYANOVA-UCINET] [MOODY-2001] [SPILLANE-SSSNQ].

1. **Design the instrument.** Define the boundary (classroom, school, firm). Roster (pick from a list of everyone) or
   free recall. Add Health gave each student a roster of their school and its sister school [MOODY-2001]. Network
   Canvas offers a small roster interface for 100 or fewer people and a large one above that [NETCANVAS-ROSTER]. Caps
   censor degree [KOSSINETS-2006]. Decide one relation or several, valued or binary.
2. **Field it and chase response rate.** Add Health kept 112 of 130 schools whose response rates were high enough for
   "reliable global network data" [MOODY-2001].
3. **Export and recode IDs.** Output is wide: friend1..friend10 columns of roster IDs or typed names. Add Health codes
   off-roster nominees (99999999 "goes to sample school - not on list", 88888888 sister school) [ADDHEALTH-CODES].
   Typed names are matched by hand; one study confirmed 25 of 39 partial names and kept 10 as unconfirmed nodes
   [RICE-2014].
4. **Reshape to an edge list or matrix.** Wide to long (ego, alter, value). UCINET: paste into the matrix spreadsheet,
   Data > Import via spreadsheet, or a DL text file (`dl n=...`, `format = edgelist1`, `labels embedded:`, `data:`)
   via Data > Import text file > DL [HANNEMAN-C6] [OGNYANOVA-UCINET] [GEPHI-DL]. UCINET stores each dataset as `.##h`
   plus `.##d` [OGNYANOVA-UCINET]. R: `network(edgelist, matrix.type = "edgelist")` or `graph_from_data_frame()`.
5. **Attach attributes.** UCINET wants a separate actor-by-variable dataset [BEJ-CH5]; R uses `%v%` [ERGM-VIGNETTE].
   ID order must match exactly across files (a common silent error; no source quantifies it).
6. **Transform**, each a reported theoretical decision: symmetrize by maximum (any tie) or minimum (reciprocated only),
   or average, sum, lower, upper [BEJ-CH5] [HANNEMAN-C6]; dichotomize at a cutoff (the companion exercise compares
   cutoffs above 0, 4 and 6 and notes above 0 "hides structure") [BEJ-CH5]; transpose "seeks advice from" into "gives
   advice to"; remove isolates, extract the main component; join or unpack relations [HANNEMAN-C6].
7. **Mark missing data** (5.2). Edge lists imply 0 for every absent dyad; ergm needs missing dyads as `NA`
   [ERGM-VIGNETTE].
8. **First look and descriptives.** NetDraw (spring embedder) [BEJ-CH7]; UCINET Network > Cohesion, Network >
   Centrality > Multiple Measures (which omits centralization), Core/Periphery, Subgroups, Roles & Positions
   [OGNYANOVA-UCINET].
9. **Hand off** node-level scores to Stata, SPSS or R [UFL-ANG5420].

### 5.2 Handling non-respondents and partial responses

Sources: [HUISMAN-2009] [SMITH-2021] [KOSSINETS-2006] [ERGM-VIGNETTE] [RICE-2014].

1. **Classify the missingness.** Actor non-response (never answered, still named by others); item non-response;
   boundary misspecification; fixed-choice censoring [KOSSINETS-2006] [HUISMAN-2009]. Excluding one actor in a toy
   example cut mean degree by 25% [KOSSINETS-2006].
2. **Report the response rate** and keep non-respondents as nodes with their incoming ties.
3. **Pick a treatment by measure.** Dropping non-respondents is "almost always the worst option" [SMITH-2021].
    - Reconstruction (impute a non-respondent's outgoing tie from ties to them) is Huisman's best simple method for
      undirected data, recommended "even for larger amounts of missing data (50%)"; for directed data, ignoring
      missingness is better for reciprocity, transitivity and assortativity, which stay "fairly stable up to 40% missing
      data" [HUISMAN-2009].
    - Probabilistic imputation (reciprocate at the observed rate, average 100 imputations) is "the most robust overall";
      with a good method over 50% non-response "can still yield valid estimates" [SMITH-2021].
    - Model-based: unobserved dyads as `NA` in ergm; coding them 0 moved the edges estimate from -2.56 to -2.64 in the
      vignette [ERGM-VIGNETTE]. RSiena treats missing codes as NA during estimation [RSIENA-BASIC].
4. **For free recall,** add prompts, read-back lists and re-interviews; adding interviews grew one network from 89 to
   176 nodes [RICE-2014].
5. **Run and report a sensitivity analysis.**

Implication: a tool must distinguish "no tie", "tie unknown" and "respondent missing" through every measure.

### 5.3 Two-mode affiliation data: storage, projection, weighting, bipartite analysis

Sources: [HANNEMAN-C6] [TNET-PROJECTION] [OPSAHL-2013] [OGNYANOVA-UCINET] [BORGATTI-EVERETT-1997] [SOCIOL208].

1. **Store** as an actor-by-event incidence matrix [SOCIOL208], a UCINET node list [BEJ-CH5], or a two-column edge list.
   Pajek `.net` files declare the total vertex count and the size of the first mode [PAJEK-HELP]. Classic example:
   Davis's Southern Women, 18 women by 14 events [BORGATTI-EVERETT-1997].
2. **Look at it as bipartite first.** NetDraw opens two-mode data directly [OGNYANOVA-UCINET]; igraph has
   `is_bipartite()` and `as_biadjacency_matrix()`; density is edges / (N x M) [SOCIOL208].
3. **Project if the question is about one mode.** UCINET Data > Affiliations (Cross-Products or Minimums)
   [HANNEMAN-C6]; A times A-transpose, zeroing the diagonal [OGNYANOVA-UCINET]; Pajek Net > Transform > 2-mode to
   1-mode (2008 path) [R-HELP-2MODE].
4. **Choose a weight.** tnet `projecting_tm(net, method = "binary" | "sum" | "Newman")`; Newman weights each shared
   group by 1/(Np - 1) [TNET-PROJECTION]. Fowler turned shared-bill weights into distances and averaged shortest paths
   into a "connectedness" score [FOWLER-2006].
5. **Watch for artifacts.** Projection inflates clustering [OPSAHL-2013]; on a co-authorship network Opsahl's
   two-mode coefficient gave 0.28 versus 0.36 one-mode [ARXIV-2102.03270]; structural holes measures on projections
   are inflated [TNET-SH].
6. **Or analyze bipartite directly**: two-mode centrality and clustering, bipartite communities, correspondence
   analysis, two-mode ERGM, bipartite backbones [SOCIOL208]; bipartite models of cosponsorship [ARXIV-2305.05833].

### 5.4 Ego networks: extraction and per-ego statistics

Sources: [HOFFMANN-SH] [EGOR-VIGNETTE] [EGOR-QUALTRICS] [HANNEMAN-C6] [NETCANVAS-ROSTER].

**Path A, from a whole network.** UCINET Data > Egonet [HANNEMAN-C6]; statnet `ego.extract()`, igraph
`make_ego_graph()`; symmetrize first (the tutorial's helper rejects directed graphs); compute size, density among
alters, effective size (n - 2t/n), efficiency, constraint, hierarchy [HOFFMANN-SH] [MIGRAPH-HOLES]. Example: the
Medici have degree 6, effective size about 5.67 and the lowest constraint (about 0.24) among Florentine families
[HOFFMANN-SH].

**Path B, from a personal network survey.**

1. Design name generators, name interpreters (alter attributes) and an alter-alter question in Qualtrics with egor
   templates [EGOR-QUALTRICS], Network Canvas (with a Sociogram stage where participants draw alter-alter ties)
   [NETCANVAS-ROSTER], EgoNet or VennMaker [UFL-ANG5420].
2. Import into egor (`onefile_to_egor()`, `threefiles_to_egor()`, `read_egoweb()`, ...) [EGOR-VIGNETTE].
3. Compute `ego_density()`, `composition()`, `alts_diversity_entropy()`, `comp_ei()`, `EI()`, `comp_ply()`
   [EGOR-VIGNETTE].
4. Visualize with `vis_clustered_graphs()` and egograms; Network Canvas stores sociogram positions normalized to 0-1
   [NETCANVAS-EXPORT].
5. Hand off one row per ego to a regression.

### 5.5 Statistical inference: QAP, ERGM, SAOM

**QAP and MRQAP** [BEJ-CH8] [R4SNA-QAP] [IDEANET-MRQAP] [DKS-2007].

1. Build dyadic predictors (same gender, absolute grade difference): UCINET Data > Attribute [HANNEMAN-C6]; ideanet
   `qap_setup()` [IDEANET-MRQAP].
2. QAP correlation: `qaptest(nets, gcor, g1=1, g2=2)` (1,000 permutations by default) [R4SNA-QAP].
3. MRQAP: UCINET Tools > Testing Hypotheses > Dyadic (QAP) > MR-QAP > Double-Dekker Semi-Partialling [BEJ-CH8]; R
   `netlm()` or `netlogit()` with `nullhyp = "qap"` [R4SNA-QAP]. DSP is recommended for collinear predictors [DKS-2007].
4. Read estimates with permutation p-values and a null-distribution histogram; CUG tests answer "is this density
   unusual for a random graph of this size" [R4SNA-QAP].

**ERGM** [ERGM-VIGNETTE] [STATNET-WORKSHOP].

1. Explore with `mixingmatrix()` and `summary(net ~ edges + triangle)` to catch empty cells.
2. Fit `ergm(net ~ edges + nodefactor("Grade") + nodematch("Grade", diff=T) + gwesp(...))`; dyad-dependent terms
   switch to MCMC; empty mixing cells give -Inf.
3. Diagnose with `mcmc.diagnostics()` ("fuzzy caterpillar" traces).
4. `plot(gof(fit))`: observed degree, shared partner and geodesic distributions against simulations.
5. Figures: sociogram colored by the homophily attribute, mixing matrix, GOF box plots, trace plots.

**SAOM (RSiena)** [RSIENA-BASIC] [RSIENA-REF].

1. Stack waves with `sienaDependent()`; covariates `coCovar()` and `varCovar()`; behavior as
   `sienaDependent(drink, type = "behavior")`.
2. `sienaDataCreate()`, `print01Report()` for wave-to-wave change.
3. `getEffects()`, `includeEffects(myeff, transTrip, cycle3)`, `avAlt` for influence.
4. `siena07()`, re-run with `prevAns` until the overall maximum convergence ratio is below 0.25.
5. Test, tabulate, check GOF with `sienaGOF`.
6. Figures: one sociogram per wave in a fixed layout, colored by behavior.

### 5.6 Producing the publication sociogram

Sources: Ognyanova's R tutorial and Sunbelt 2021 workshop script [OGNYANOVA-R] [OGNYANOVA-WS]; package manuals
[IGRAPH-TKPLOT] [SNA-GPLOT] [GGRAPH-FACET]; tool guides and journal artwork rules as cited.

**Route A: R igraph, as taught in the Sunbelt workshop [OGNYANOVA-WS].**

1. Build the graph from edge and node tables; `simplify(net, remove.multiple = F, remove.loops = T)` drops loops.
2. Map attributes: color from a palette indexed by node type, size from a numeric attribute, labels off
   (`vertex.label=NA`) when crowded, smaller arrows and slight curves (`edge.arrow.size=.4, edge.curved=.1`).
3. Add the legend by hand -- base igraph draws none: `legend(x=-1.1, y=-1.1, c("Newspaper","Television","Online
News"), pch=21, ...)`, repeating the palette.
4. Fix the layout: "the F-R layout is not deterministic"; "saving the layout in l allows us to get the exact same
   result multiple times". Compute `l <- layout_with_fr(net)` once, pass `layout=l` everywhere; `norm_coords()` with
   `rescale=F` gives tighter or looser versions of the same layout.
5. Reduce the hairball: keep edges above the mean weight (`cut.off <- mean(links$weight)`; `delete_edges(net,
E(net)[weight<cut.off])`), while noting "there are more sophisticated ways to extract the key edges"; or split
   tie types into panels.
6. One panel per relation in a shared layout: `par(mfrow=c(1,2))`, hyperlink-only and mention-only networks plotted
   with the same `l` -- "make sure the nodes stay in the same place in both plots".
7. Hulls around groups (usually communities): `mark.groups=list(c(1,4,5,8), c(15:17))`, `mark.col`, `mark.border`.
8. Nudge by hand: `tkid <- tkplot(net)`, drag, `l <- tkplot.getcoords(tkid)` (now `tk_coords()` [IGRAPH-TKPLOT]),
   `plot(net, layout=l)`; "mostly helpful for small networks".
9. The script shows no step for file size, resolution or format; the author adds it (no standard recipe found).

**Route A2: ggraph.** `ggraph(net, layout="lgl") + geom_edge_fan(...) + geom_node_point(...) + theme_void()`;
`geom_edge_fan` separates parallel multiplex edges [OGNYANOVA-WS]; `facet_edges()` splits edges into panels by an
edge attribute with "nodes ... repeated in every panel" [GGRAPH-FACET]; mapped aesthetics give legends for free.

**Route B: statnet `sna::gplot`.** `interactive=TRUE` moves a clicked vertex to the next clicked spot; the call
returns "a two-column matrix containing the vertex positions", reusable through `coord=`; `displayisolates` hides
isolates [SNA-GPLOT].

**Route C: menu tools.** NetDraw maps centrality scores to color and size via Properties > Nodes > Attribute-Based
[OGNYANOVA-UCINET], but formatting does not reliably persist (save VNA, reload as "Complete") [UW-LING534]. Moody
drew Pajek spring-embedder figures, direction ignored, isolates omitted, colored by race [MOODY-2001]; Pajek exports
EPS and SVG [PAJEK-HELP]. Gephi's ForceAtlas2 turns structural closeness into visual closeness [FA2-2014], a reading
defended by Venturini, Jacomy and Jensen [VENTURINI-2021] and criticized as "storyletting" when images lose context
[UNBLACKBOXING-GEPHI]; Preview exports SVG, which keeps objects editable [GEPHI-FAQ]. Final touch-ups happen in a
vector editor: the Sci2 tutorial opens the export in Inkscape, ungroups it and edits labels [SCI2-PUB].

**What journals ask for.** Elsevier (publisher of _Social Networks_): EPS for vector art, TIFF for bitmaps; 1000 dpi
line art, 300 dpi halftones, 500 dpi combination; widths 90, 140 or 190 mm; Arial or Helvetica, Courier, Symbol,
Times [ELSEVIER-ART] [ELSEVIER-SIZE]. _American Political Science Review_: "readable in grayscale", color varied "by
intensity and tones" in 15-85% steps, since "classic blue, black, red and green all look the same" [APSR-FIG].
_American Sociological Review_ defers to the ASA Style Guide; no online figure rules found, nor for _AJS_.

**Disclosing pruning.** No source found for standard caption wording or for how often authors hand-adjust layouts.
Moody states isolates are omitted [MOODY-2001]; thresholding valued ties is "extremely unwise unless there truly is a
threshold effect" (efficiency loss "100-fold or more" in simulation) [THOMAS-BLITZSTEIN], so a pruned figure needs
its cutoff stated.

**Product implications:** the two figure rows in section 10.

### 5.7 Discourse network analysis of a policy debate (DNA, visone, rDNA)

Sources: Leifeld 2017 chapter [LEIFELD-2017]; DNA repository [DNA-GITHUB].

1. **Collect texts**: newspaper articles, parliamentary testimony or other documents on one debate, with dates.
2. **Import into DNA** (a Java program, Java 11 or later) and **code statements**. A statement has an actor (person or
   organization; choose which before coding), a concept (a policy instrument such as "we should adopt cap and trade",
   or a justification such as "health"), and an agreement qualifier, usually binary (agree or disagree), plus the date
   [LEIFELD-2017].
3. **Export a network.** Options described by Leifeld: an affiliation network (actors by concepts, separately for
   positive and negative stances, or one signed network colored green and red), an actor congruence network (tie when
   two actors take the same stance on a concept), an actor conflict network (tie when stances are opposite: negative
   ties), a concept congruence network, a time window network (ties only between statements within a window of a set
   number of days, moved along the time axis), and an attenuation network (older co-statements down-weighted, usually
   by exponential decay) [LEIFELD-2017]. Exports are GraphML or matrices [DNA-GITHUB].
4. **Normalize** congruence weights, because the most quoted actors (government, parties) otherwise dominate
   [LEIFELD-2017].
5. **Analyze and draw.** Open the GraphML in visone, which DNA's authors recommend [DNA-GITHUB]; find coalitions as
   cohesive subgroups (edge betweenness or modularity) [LEIFELD-2017]. rDNA adds clustering, phase-transition
   detection, backbones, ideological scaling and polarization measures in R [DNA-GITHUB].
6. **Compare over time**: one network per window, or an animated sequence, to show coalitions forming and polarizing
   [LEIFELD-2017].

### 5.8 Temporal and influence models beyond SAOM

**Relational events (goldfish, REM and DyNAM)** [GOLDFISH] [GOLDFISH-TEACH].

1. Prepare a node table (label, attributes) and an event table with `time`, `sender`, `receiver` and `increment` (or
   `replace` for state changes). The teaching example uses 84 students and 439 phone calls, plus a friendship event
   table [GOLDFISH-TEACH].
2. `defineNodes()`, `defineNetwork(nodes, directed = TRUE)`, `linkEvents()` for each event table,
   `defineDependentEvents()`.
3. `estimate(... , model = "DyNAM", subModel = "rate")` (who acts next), then `subModel = "choice"` with effects such
   as `inertia`, `recip`, `trans` (whom they contact); or `model = "REM"` for the tie-oriented model of Butts 2008
   [GOLDFISH].
4. Visualize the call network at the start, middle and end of the period with igraph or ggraph [GOLDFISH-TEACH]: the
   visual need is a time-sliced or animated view of an event stream.

**Temporal ERGM (btergm)** [BTERGM] [BTERGM-JSS].

1. Assemble a chronological list of networks (for example yearly alliance networks) with time-varying covariates.
2. `btergm(networks ~ edges + gwesp(...) + memory(...) + ..., R = 1000)`: maximum pseudolikelihood with bootstrapped
   confidence intervals; `mtergm()` for MCMC maximum likelihood.
3. Check fit out of sample: fit on earlier years and `gof(..., target = <later networks>)` [BTERGM].
4. Figures: a small-multiples panel of yearly networks and GOF plots.

**Peer influence on an outcome.**

- Network autocorrelation, y = rho W y + X b + e: `lnam(y, x, W1, W2)` in sna, with W1 the influence network (often
  row-normalized friendship) and W2 for autocorrelated errors [LNAM]; a Duke course script fits fights on
  row-weighted friendship and adds club co-membership [LNAM-DUKE]. Choosing W is itself a modeling question
  (Leenders 2002, cited in [LNAM]).
- ALAAM, for a binary outcome that may spread through complex contagion: most commonly fit in the Windows programs
  IPNet or MPNet (which also fit ERGMs for undirected, directed, bipartite and multilevel networks) or the Python
  package ALAAMEE; statnet does not implement ALAAM [ALAAMEE].

**Many networks at once.** Education studies collect many classrooms. Options: multilevel ERGM with a block
membership vector (`node_memb`, for example classes or schools) in mlergm [MLERGM]; MPNet multilevel models
[ALAAMEE]; RSiena multi-group estimation (`sienaGroupCreate`) and meta-analysis across groups (`siena08`)
[RSIENA-REF]. The visual need is small multiples of many whole networks, not one big graph.

### 5.9 Kinship networks from genealogies (Puck, Kinsources)

Sources: [PUCK] [KINSOURCES] [KINSOURCES-ARXIV].

1. **Record genealogies** in the field or from archives: individuals with sex, parent-child links, marriages.
2. **Load into Puck**, or download a peer-reviewed dataset from Kinsources, "an open-access, peer-reviewed repository of
   kinship data curated for scientific research" in which Puck is integrated [KINSOURCES-ARXIV] [KINSOURCES]. (Puck's
   accepted file formats were not verified.)
3. **Check completeness**: individuals without recorded parents and missing spouses (24.8% have no parent in the
   Kinsources aggregate) [KINSOURCES-ARXIV].
4. **Run a matrimonial census**: Puck's stated purpose is a complete census of marriage circuits in a kinship network,
   which earlier tools lacked [PUCK].
5. **Lay out by generation**: with no generation field, generations are inferred from the parent-child direction; one
   study layered networks with Graphviz into up to 40 "pseudogenerations" [KINSOURCES-ARXIV].
6. **Compare societies** with network measures (degree, components, assortativity, distances) across datasets
   [KINSOURCES-ARXIV].

### 5.10 Participatory influence mapping (Net-Map)

Source: Net-Map manual [NETMAP-MANUAL]; [NETMAP-WIKI].

1. **Prepare**: define the issue and at most five link types (the manual's example: formal command, funding, advice,
   information), define "influence" and the goals to code; pre-test. Ask interviewees for one to two hours.
2. **Who is involved?** The interviewee names actors; each goes on a card on a large sheet.
3. **How are they linked?** Draw arrows one link type at a time, each in its own color, starting with the rarest type.
4. **How influential?** Stack tower pieces under each actor figure: "The more influence an actor has the higher the
   tower"; ties allowed; zero influence stays on the ground. The interviewer reads the towers back, the interviewee
   adjusts, and heights are written on the map.
5. **What are their goals?** Mark each actor with goal codes (for example D for development, P for protection).
6. **Discuss** sources of influence and conflicts, recorded by a note taker.
7. **Digitize**: one matrix per link type into UCINET, or redraw in VisuaLyzer, where node size shows tower height.
   The drawing is the instrument: positions, heights and annotations made by the participant are data.

### 5.11 Digital-trace workflows (summary; detail in the social media document)

- **Polarization map:** collect posts for a keyword (API, NodeXL, 4CAT, Communalytic); build a timestamped retweet,
  mention or co-hashtag network; in co-hashtag networks delete the query hashtags and rare nodes; ForceAtlas2 and
  modularity [PDL-COHASHTAG]; label clusters by hubs and top hashtags and URLs (Himelboim, Smith and Shneiderman)
  [HIMELBOIM-2013] [PEW-NODEXL]; remember the map is a sample [VAN-GEENEN-2023].
- **Coordinated behavior:** keep account pairs sharing an object within 30 to 60 seconds a minimum number of times,
  project to an account network, inspect components (CooRTweet) [COORTWEET].

---

## 6. Data

| Property                | What is typical                                                                                                                                                                                | Evidence                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Sources                 | Own surveys; archived surveys (Add Health, GSS, ICPSR); records (Congress, boards, alliances); coded texts; genealogies; participatory maps; platform data (3.6)                               | [ADDHEALTH-CODES] [CONGRESS-REPO] [LEIFELD-2017] [KINSOURCES-ARXIV] |
| Formats                 | Wide survey exports; adjacency matrices; UCINET DL and `.##h/.##d`; Pajek `.net`, `.clu`, `.vec`, `.paj`; NetDraw VNA; GraphML (Network Canvas, DNA); R network objects; goldfish event tables | [HANNEMAN-C6] [PAJEK-HELP] [NETCANVAS-EXPORT] [DNA-GITHUB]          |
| Whole network sizes     | Classroom 20-40; school up to about 1,500 (statnet's faux.magnolia.high: 1,461); teaching sets 11 to 1,365                                                                                     | [MOODY-2001] [STATNET-JSS] [KU-COMS930]                             |
| Collections of networks | Many classrooms or schools analyzed together; 20 yearly networks of 164 countries                                                                                                              | [MLERGM] [BTERGM]                                                   |
| Ego network sizes       | 5 to about 50 alters, hundreds to thousands of egos                                                                                                                                            | [GSS-NAMEGEN] [UFL-ANG5420]                                         |
| Two-mode sizes          | 18 by 14 (Southern Women) to 280,000 bills                                                                                                                                                     | [BORGATTI-EVERETT-1997] [FOWLER-2006]                               |
| Timestamped events      | Sender, receiver, time, increment (439 calls among 84 students in the goldfish teaching data)                                                                                                  | [GOLDFISH-TEACH]                                                    |
| Signed ties             | Agreement versus disagreement in discourse networks; conflict networks as negative ties                                                                                                        | [LEIFELD-2017]                                                      |
| Genealogies             | Parent-child arcs plus union edges; 17 to about 50,000 individuals; no generation field                                                                                                        | [KINSOURCES-ARXIV]                                                  |
| Participant-drawn maps  | Colored link types, influence height and goal codes per actor                                                                                                                                  | [NETMAP-MANUAL]                                                     |
| Attributes              | Many per node and per wave; alter attributes in ego studies                                                                                                                                    | [EGOR-VIGNETTE]                                                     |
| Identifiers             | Roster IDs; typed names needing matching; off-roster codes; pseudonyms in print                                                                                                                | [ADDHEALTH-CODES] [RICE-2014]                                       |
| Properties              | Directed, valued, multiplex, two-mode, panel, temporal, signed, missing by design                                                                                                              | [HANNEMAN-C6] [RSIENA-BASIC]                                        |
| Sensitivity             | Identifiable minors and employees; "confidential but not anonymous"; restricted-use contracts (Add Health network files)                                                                       | [DNAC-COLLECTION] [ADDHEALTH-RESTRICTED]                            |

---

## 7. Analysis methods actually used

- **Cohesion:** density, reciprocity, transitivity, clustering, components, k-cores, cliques, n-clans, factions,
  Girvan-Newman [OGNYANOVA-UCINET] [UFL-ANG5420].
- **Centrality and centralization:** degree, closeness, betweenness, eigenvector, Bonacich power [OGNYANOVA-UCINET].
- **Brokerage and ego measures:** effective size, efficiency, constraint, hierarchy, ego density, EI index,
  composition, diversity [HOFFMANN-SH] [EGOR-VIGNETTE].
- **Roles and positions:** structural and regular equivalence, blockmodels, triad census, MDS [OGNYANOVA-UCINET].
- **Homophily:** mixing matrices, EI index, nodematch, assortativity [ERGM-VIGNETTE] [EGOR-VIGNETTE].
- **Inference:** CUG, QAP, MRQAP (DSP), ERGM, multilevel ERGM, TERGM, SAOM, relational event models, network
  autocorrelation, ALAAM [R4SNA-QAP] [ERGM-VIGNETTE] [RSIENA-BASIC] [BTERGM] [GOLDFISH] [LNAM] [ALAAMEE].
- **Discourse:** congruence and conflict projections, normalization, time windows, coalition detection [LEIFELD-2017].
- **Kinship:** marriage circuit census, generational layering [PUCK] [KINSOURCES-ARXIV].
- **Validation habits:** report response rates and missing data treatment [SMITH-2021]; GOF for ERGM and out-of-sample
  GOF for TERGM [BTERGM]; SAOM convergence ratios; re-run permutations [IDEANET-MRQAP]; compare symmetrizing and
  dichotomizing rules [BEJ-CH5].

---

## 8. Outputs and collaboration

- **Deliverables:** articles with descriptive and model tables, one or two sociograms (pseudonymized, as in Moody's
  "Countryside High School" [MOODY-2001]), GOF figures, small-multiples of waves or years, coalition maps per period;
  dissertations; Sunbelt talks.
- **Sharing:** R scripts [KU-COMS930]; replication archives (ICPSR, Dataverse, GitHub [CONGRESS-REPO]); peer-reviewed
  kinship datasets on Kinsources [KINSOURCES-ARXIV]. Restricted data cannot be shared [ADDHEALTH-RESTRICTED].
- **Reproducibility:** seeds in R (`set.seed`, `sienaAlgorithmCreate(seed=)`) [RSIENA-BASIC]; menu-driven UCINET and
  NetDraw work leaves no script, and NetDraw formatting is fragile [UW-LING534].
- **Audit:** reviewers ask for the symmetrizing rule, threshold, missing data treatment, normalization and GOF.

---

## 9. Tools landscape and pain points

| Tool                                                  | Used for                                                                                    | Loved                                                                                                                                              | Fails them                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UCINET + NetDraw                                      | Data entry, transforms, descriptives, QAP, quick pictures                                   | Menus for every classic measure; "one of the most widely-used" [UW-SOCIOLAB]                                                                       | Windows only, Wine loses features [UCINET-MAC]; paid (student price $40 [KU-COMS930]); formatting lost; attribute handling "picky/finicky/BUGGY" [UW-LING534]; no script record |
| Pajek                                                 | Large and two-mode networks, partitions, EPS                                                | Speed on large networks [PAJEK-HELP]                                                                                                               | Dated interface; menu paths change [R-HELP-2MODE]                                                                                                                               |
| visone                                                | Visual analysis, coalition maps, teaching                                                   | "intended for research and teaching in social network analysis", for "experts and novices alike" [VISONE]; recommended for DNA output [DNA-GITHUB] | No source found on its limits                                                                                                                                                   |
| ORA (ORA-LITE free, ORA-PRO paid)                     | Multi-mode, multiplex, dynamic meta-networks (agents, organizations and other node classes) | Change over time, key players [ORA-LITE]                                                                                                           | ORA-LITE limited to 2,000 nodes per node class [ORA-LITE]                                                                                                                       |
| NodeXL                                                | Excel route to social media and other networks                                              | No programming; the Pew method [PEW-NODEXL]                                                                                                        | Windows and Excel only (see 3.6)                                                                                                                                                |
| R statnet, btergm, mlergm                             | ERGM, TERGM, multilevel ERGM, QAP, CUG                                                      | Scriptable, reproducible                                                                                                                           | Steep curve; valued data read as binary unless told [R4SNA-QAP]                                                                                                                 |
| RSiena, goldfish                                      | SAOM panels; relational events                                                              | Only practical tools for these models                                                                                                              | Repeated estimation until convergence [RSIENA-BASIC]                                                                                                                            |
| PNet, MPNet, ALAAMEE                                  | ERGM, multilevel ERGM, ALAAM                                                                | Free GUI (Windows) or Python; ALAAM, which statnet lacks [ALAAMEE]                                                                                 | Windows-only GUIs                                                                                                                                                               |
| igraph, tnet, egor, ideanet, networkx                 | General measures, two-mode, ego networks, MRQAP                                             | Free, scriptable                                                                                                                                   | Fragmented; each has its own object                                                                                                                                             |
| Gephi                                                 | Figures, exploration                                                                        | Attractive layouts [GEPHI-SURVEY]                                                                                                                  | "Storyletting" risk [UNBLACKBOXING-GEPHI]; no inferential statistics                                                                                                            |
| DNA + rDNA                                            | Coding statements into discourse networks                                                   | Statement coding with time and agreement [DNA-GITHUB]                                                                                              | Coding is manual and slow (no source quantifies it)                                                                                                                             |
| Puck + Kinsources                                     | Genealogies, marriage circuits                                                              | Complete matrimonial census [PUCK]                                                                                                                 | Specialist; formats not verified                                                                                                                                                |
| Network Canvas, EgoNet, VennMaker, Net-Map, Qualtrics | Data collection                                                                             | Rosters; participant-drawn sociograms [NETCANVAS-ROSTER] [NETMAP-MANUAL]                                                                           | Reshaping or retyping before analysis [EGOR-QUALTRICS] [NETMAP-MANUAL]                                                                                                          |

Cross-cutting pain: no single tool goes from raw data to cleaned network to inference to figure; every hop is a file
conversion; menu tools are not reproducible and scripted tools are not visual.

---

## 10. Requirements implied

Coverage: "covered" means a persona, workflow or capability in `design/designloom` or a shipped graph-io importer
addresses it; "partly" names what exists; "NOT covered" means nothing found. Checked: `ego-network` (planned; W06,
W09, W17) extracts N-hop ego networks with size, density and constraint; `layout-radial`; `temporal-analysis`
(planned; W19) slices timestamped edges; two-mode projection only in `ml-engineer-recsys` (W16); graph-io's Pajek
importer reads `.net` (two-mode headers, arcs and edges lists, matrices) and a single network's `*Partition` and
`*Vector` objects; graph-io also reads CSV and `.xlsx`.

| Requirement                                                                                                                                                                                | Priority    | Coverage                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Import UCINET DL (fullmatrix, edgelist1, nodelist1/2), NetDraw VNA, square adjacency matrices from CSV or Excel, standalone `.clu`/`.vec` files for a loaded network, multi-network `.paj` | must-have   | NOT covered (Pajek `.net` and single-network project files are covered by graph-io)                        |
| Import wide survey exports (friend1..friendN columns) with roster ID matching and off-roster codes                                                                                         | must-have   | NOT covered                                                                                                |
| Separate attribute tables joined by ID with a mismatch report                                                                                                                              | must-have   | partly (W18)                                                                                               |
| Missing-data states: no tie, unknown tie, non-respondent, carried through measures and shown                                                                                               | must-have   | NOT covered                                                                                                |
| Non-respondent treatments (listwise, reconstruction, probabilistic) with sensitivity comparison                                                                                            | should-have | NOT covered                                                                                                |
| Named, recorded transforms: symmetrize, dichotomize, transpose, recode, diagonal, remove isolates, main component                                                                          | must-have   | NOT covered                                                                                                |
| Multiplex: several relations on one actor set, switchable and combinable                                                                                                                   | must-have   | NOT covered                                                                                                |
| Multiple node classes (ORA-style meta-networks: agents, organizations and others)                                                                                                          | should-have | NOT covered                                                                                                |
| Two-mode first class: bipartite layout, projection with binary, sum and Newman weights, two-mode degree and clustering, projection-inflation warning                                       | must-have   | partly (W16 only; graph-io reads two-mode Pajek)                                                           |
| Ego extraction from a whole network                                                                                                                                                        | must-have   | covered (`ego-network`, planned; W17)                                                                      |
| Ego measures beyond size, density and constraint: effective size, efficiency, hierarchy, EI, composition, heterogeneity                                                                    | must-have   | NOT covered                                                                                                |
| Many-small-networks mode (ego, alter, alter-alter tables) with egograms                                                                                                                    | should-have | NOT covered                                                                                                |
| Collections of many whole networks (classrooms, years) viewed as small multiples with shared styling                                                                                       | should-have | NOT covered                                                                                                |
| Classic descriptives with UCINET definitions: centralization, cliques, n-clans, factions, k-cores, core-periphery, equivalence, triad census                                               | must-have   | partly (centrality and communities in W04, W10, W17)                                                       |
| Homophily: mixing matrix, EI index, assortativity per attribute                                                                                                                            | must-have   | NOT covered                                                                                                |
| Permutation tests: CUG, QAP, MRQAP with DSP, null-distribution histogram                                                                                                                   | should-have | NOT covered                                                                                                |
| Timestamped event streams (sender, receiver, time, weight): import, slice and aggregate by time window, animate                                                                            | must-have   | partly (`temporal-analysis` and W19, planned, cover windows over timestamped edges; no event-table import) |
| Panel waves: fixed layout across waves, change summary                                                                                                                                     | should-have | partly (W19 generic temporal)                                                                              |
| Signed edges (agree or disagree, conflict) with distinct styling, and qualifier-based projection to congruence and conflict networks with normalization and time windows                   | should-have | NOT covered                                                                                                |
| Bipartite projection with a time-window rule (two actors linked when they share an object within tau, at least r times)                                                                    | should-have | NOT covered here (see the social media document)                                                           |
| Co-occurrence (semantic or text) network import, for example co-hashtag or actor-concept tables                                                                                            | should-have | partly (CSV edge tables import; no co-occurrence builder)                                                  |
| Scale to 10^5 to 10^6 nodes for digital-trace collections, with a sample caveat on the map                                                                                                 | should-have | see the social media document                                                                              |
| Genealogy: parent-child and union edge types, generation layout inferred from parent-child direction                                                                                       | could-have  | NOT covered                                                                                                |
| Participant-drawn positions and per-node annotations (influence height, goal codes) kept as data                                                                                           | could-have  | NOT covered (graph-io keeps file positions; no annotation data model checked)                              |
| Hand-off to R (statnet, RSiena, btergm, goldfish): export edge lists with NA dyads, attribute tables, event tables; display GOF output                                                     | should-have | NOT covered                                                                                                |
| Node-level measure export to CSV for Stata, SPSS, R                                                                                                                                        | must-have   | partly (Alex exports metrics)                                                                              |
| Publication figure: attribute-mapped color, shape, size; grayscale-safe; pseudonymized labels; SVG, EPS or PDF                                                                             | must-have   | partly (W15)                                                                                               |
| Figure layout control: one fixed layout across relation panels and waves; hand nudging with x,y coordinates exported and re-imported; group hulls; auto legends                            | must-have   | NOT covered (graph-io keeps file positions)                                                                |
| Figure export to journal specs: 90, 140, 190 mm widths; EPS, PDF, SVG, 300-1000 dpi TIFF; standard fonts; grayscale preview; pruning cutoff written in the figure note                     | must-have   | partly (W15)                                                                                               |
| Reproducibility: every transform, seed and setting saved and replayable; a methods-paragraph summary                                                                                       | must-have   | partly (W25)                                                                                               |
| Runs on macOS, Windows and Linux in a browser with no license                                                                                                                              | must-have   | covered by product form                                                                                    |
| Privacy: fully offline on restricted data; no upload of respondent data                                                                                                                    | must-have   | NOT covered explicitly                                                                                     |
| Teaching: classic datasets (Krackhardt, Southern Women, Florentine, Lazega) and guided labs                                                                                                | should-have | NOT covered (W14 generic)                                                                                  |

---

## 11. Sources

- [GEPHI-SURVEY] https://kelaenderkoe.pages.dev/Using-https-gephi.wordpress.com/tag/survey -- mirror of the Gephi blog post on the 2015 user survey.
- [WIKI-INSNA] https://en.wikipedia.org/wiki/International_Network_for_Social_Network_Analysis -- INSNA membership.
- [ARO-SUNBELT-2016] https://apps.dtic.mil/sti/trecms/pdf/AD1192413.pdf -- Sunbelt attendance and 2016 workshops.
- [ARXIV-2502.07412] https://arxiv.org/html/2502.07412v1 -- 70,000+ social network publications.
- [KU-COMS930] https://hmc.ku.edu/sites/hmc/files/2022-08/COMS930-SNA-FA19.pdf -- Kansas PhD seminar syllabus.
- [UFL-ANG5420] https://anthro.ufl.edu/wp-content/uploads/sites/306/syllabus-network-analysis-Fall2019-Johnson.pdf -- Florida anthropology network course.
- [UW-LING534] https://depts.washington.edu/sociolab/researchtools/networkanalysis/documents/UCINetQuickGuide2018.pdf -- UCINET quick guide and NetDraw pains.
- [UW-SOCIOLAB] https://depts.washington.edu/sociolab/researchtools/networkanalysis/networkanalysis.php -- UCINET "one of the most widely-used".
- [MUENSTER-POSTDOC] https://www.uni-muenster.de/imperia/md/content/soziologie/stellenausschreibungen/postdoc_profil_1_en.pdf -- postdoc profile.
- [BU-POSTDOC] https://www.bu.edu/swrnet/?p=958 -- postdoc asking for UCINet.
- [HANNEMAN-C6] https://faculty.ucr.edu/~hanneman/nettext/C6_Working_with_data.html -- UCINET data entry and transforms.
- [BEJ-CH5] https://study.sagepub.com/borgatti2e/student-resources/chapter-5/chapter-5-data-management -- DL formats, symmetrize, dichotomize.
- [BEJ-CH7] https://study.sagepub.com/node/95235 -- NetDraw defaults.
- [BEJ-CH8] https://study.sagepub.com/node/95236 -- UCINET MRQAP path.
- [OGNYANOVA-UCINET] https://kateto.net/wp-content/uploads/2012/12/COMM645%20-%20Ucinet%20Handout.pdf -- UCINET and NetDraw menu paths.
- [GEPHI-DL] https://docs.gephi.org/desktop/User_Manual/Import/UCINET_DL_Format -- DL syntax.
- [PAJEK-HELP] https://www.artsrn.ualberta.ca/ccewiki/index.php/Pajek_help -- Pajek files, two-mode header, export.
- [R-HELP-2MODE] https://stat.ethz.ch/pipermail/r-help/2008-May/161805.html -- Pajek 2-mode to 1-mode path.
- [R-NETWORK-PAJEK] https://sources.debian.org/src/r-cran-network/1.19.0-1/R/fileio.R -- R network Pajek reader and 2-mode.
- [MOODY-2001] https://cpi.stanford.edu/_media/pdf/Reference%20Media/Moody_2001_Race.pdf -- Add Health roster, usable schools, Pajek figures.
- [ADDHEALTH-CODES] https://addhealth-navigator.cpc.unc.edu/item/example.org/2955231e-ae0d-4d93-ad81-f34790b2d275 -- nomination fields and off-roster codes.
- [ADDHEALTH-RESTRICTED] https://addhealth.cpc.unc.edu/?p=9227 -- restricted-use files.
- [SPILLANE-SSSNQ] https://www.icpsr.umich.edu/web/ICPSR/studies/32921 -- School Staff Social Network Questionnaire; up to 12 names per https://www.stat.cmu.edu/~brian/780/week06/Liz%20Lorenzi/Spillane%202012.pdf
- [RICE-2014] https://pmc.ncbi.nlm.nih.gov/articles/PMC4184035 -- recall bias, name verification.
- [KOSSINETS-2006] https://arxiv.org/abs/cond-mat/0306335 -- boundary, non-response, fixed choice.
- [HUISMAN-2009] https://www.stat.cmu.edu/~brian/780/bibliography/11%20Imputation/huisman.pdf -- simple imputation.
- [SMITH-2021] https://pmc.ncbi.nlm.nih.gov/articles/PMC8294095 -- imputation comparison.
- [ERGM-VIGNETTE] https://cran.r-project.org/web/packages/ergm/vignettes/ergm.html -- ergm workflow.
- [STATNET-WORKSHOP] https://statnet.org/workshop-ergm/ergm_tutorial.html -- ERGM workshop.
- [STATNET-JSS] https://escholarship.org/content/qt2g52316f/qt2g52316f.pdf -- statnet tutorial, 1,461-vertex network.
- [RSIENA-BASIC] https://www.stats.ox.ac.uk/~snijders/siena/basic_RSiena.html -- basic RSiena script.
- [RSIENA-REF] https://cran.case.edu/web/packages/RSiena/refman/RSiena.html -- RSiena reference (convergence, multi-group functions).
- [R4SNA-QAP] https://cllghn.github.io/r4sna/hypothesis-testing-qap-and-cug.html -- QAP and CUG in R.
- [IDEANET-MRQAP] https://cran.r-project.org/web/packages/ideanet/vignettes/mrqap.html -- MRQAP setup.
- [DKS-2007] https://www.stats.ox.ac.uk/~snijders/DekkerKrackhardtSnijders.pdf -- MRQAP and DSP.
- [TNET-PROJECTION] https://toreopsahl.com/tnet/two-mode-networks/projection/ -- projection weights.
- [OPSAHL-2013] https://arxiv.org/abs/1006.0887v2 -- projection inflates clustering.
- [TNET-SH] https://toreopsahl.com/tnet/two-mode-networks/structural-holes/ -- structural holes on projections.
- [ARXIV-2102.03270] https://arxiv.org/pdf/2102.03270 -- two-mode versus one-mode clustering.
- [BORGATTI-EVERETT-1997] https://www.bebr.ufl.edu/sites/default/files/Borgatti%20and%20Everett%20-%201997%20-%20Network%20analysis%20of%202-mode%20data.pdf -- two-mode analysis, Davis data.
- [SOCIOL208] https://olizardo.github.io/SOCIOL208/tm-basic.html -- two-mode course notes.
- [ARXIV-2305.05833] https://arxiv.org/html/2305.05833v2 -- bipartite cosponsorship models.
- [FOWLER-2006] https://www.cambridge.org/core/journals/political-analysis/article/connecting-the-congress-a-study-of-cosponsorship-networks/B42907E13C3D1F12BBC7618C8E0EECED -- cosponsorship networks.
- [CONGRESS-REPO] https://github.com/briatte/congress -- cosponsorship replication code.
- [HOFFMANN-SH] https://jfb-h.github.io/intro-to-sna/08-structural-holes.html -- ego extraction and structural holes.
- [MIGRAPH-HOLES] https://search.r-project.org/CRAN/refmans/migraph/html/holes.html -- ego brokerage functions.
- [EGOR-VIGNETTE] https://cran.r-project.org/web/packages/egor/vignettes/using_egor.html -- egor data and functions.
- [EGOR-QUALTRICS] https://tilltnet.github.io/egor/articles/qualtrics.html -- Qualtrics ego templates.
- [GSS-NAMEGEN] https://pmc.ncbi.nlm.nih.gov/articles/PMC9116615 -- GSS name generator.
- [NETCANVAS-ROSTER] https://github.com/complexdatacollective/Interviewer/wiki/Name-Generator:-Roster-List -- roster generator and sociogram stage.
- [NETCANVAS-EXPORT] https://documentation-rlpthbxim-network-canvas-f4790d84.vercel.app/en/desktop/key-concepts/data-export -- CSV and GraphML export, normalized positions.
- [DNAC-COLLECTION] https://www.slideshare.net/slideshow/02-network-data-collection-2016/77379081 -- "confidential but not anonymous".
- [UCINET-MAC] https://sites.google.com/site/ucinetsoftware/download -- no Mac or Linux version.
- [FA2-2014] https://pubmed.ncbi.nlm.nih.gov/24914678/ -- ForceAtlas2.
- [VENTURINI-2021] Venturini, Jacomy and Jensen (2021), "What do we see when we look at networks", Big Data & Society 8(1); see https://vbn.aau.dk/ws/files/549451165/PHD_MJ_E_pdf_1_.pdf
- [UNBLACKBOXING-GEPHI] https://hal-supelec.archives-ouvertes.fr/HIPHISCITECH/hal-03729114 -- "storyletting".
- [GOLDFISH] https://cran.r-project.org/web/packages/goldfish/readme/README.html -- DyNAM and REM, event data structure, functions; cites Butts 2008 and Stadtfeld and Block 2017.
- [GOLDFISH-TEACH] https://cran.r-project.org/web/packages/goldfish/vignettes/teaching1.html -- 84 actors, 439 calls, step-by-step DyNAM.
- [BTERGM] https://cran.r-project.org/web/packages/btergm/refman/btergm.html -- btergm, bootstrap R, out-of-sample gof target, alliances data.
- [BTERGM-JSS] https://jstatsoft.org/v083/i06 -- Leifeld, Cranmer and Desmarais 2018, JSS 83(6).
- [LNAM] https://search.r-project.org/CRAN/refmans/sna/html/lnam.html -- linear network autocorrelation model, W1 and W2; cites Leenders 2002.
- [LNAM-DUKE] https://people.duke.edu/~jmoody77/SSRINets/lnam_example.r -- peer-effects lnam example.
- [ALAAMEE] https://arxiv.org/pdf/2404.03116 -- ALAAM; IPNet and MPNet Windows applications; statnet lacks ALAAM. PNet home (unreachable when checked): https://www.melnet.org.au/pnet
- [MLERGM] https://cran.r-project.org/web/packages/mlergm/vignettes/mlergm_tutorial.html -- multilevel ERGM with block membership.
- [DNA-GITHUB] https://github.com/leifeld/dna -- Discourse Network Analyzer, GraphML export, visone, rDNA.
- [LEIFELD-2017] https://eprints.gla.ac.uk/121525/1/121525.pdf -- Leifeld, "Discourse network analysis: policy debates as dynamic networks" (2017): statement variables, network types, time windows, normalization.
- [KINSOURCES] https://csac.anthropology.ac.uk/Research/Kinsources -- Kinsources platform with Puck integrated (page unavailable when checked; content from search summary).
- [KINSOURCES-ARXIV] https://arxiv.org/html/2606.18210 -- network analysis of 105 Kinsources datasets.
- [PUCK] https://halshs.archives-ouvertes.fr/halshs-00445418 -- "La parente radiographiee": Puck for matrimonial network census; project page https://sourceforge.net/p/simpa-puck/
- [NETMAP-MANUAL] https://media.tciurbanhealth.org/wp-content/uploads/2018/02/12125549/Net-Map-Manual.pdf -- Net-Map step-by-step manual.
- [NETMAP-WIKI] https://en.wikipedia.org/wiki/Net-map_toolbox -- Net-Map origin (Eva Schiffer, IFPRI, 2006).
- [VISONE] https://algo.uni-konstanz.de/software/ -- visone purpose and audience.
- [ORA-LITE] https://www.cmu.edu/casos-center/research/tools/ora-lite.html -- ORA-LITE capabilities and node limit.
- [PEW-NODEXL] https://legacy.pewresearch.org/wp-content/uploads/sites/9/2014/02/How-we-analyzed-Twitter-social-media-networks.pdf -- Pew NodeXL method.
- [HIMELBOIM-2013] https://www.cs.umd.edu/~ben/Himelboim2013Tweeting.pdf -- "Tweeting Apart", selective exposure clusters.
- [PDL-COHASHTAG] https://recipes.publicdatalab.org/co-hashtag_network.html -- co-hashtag recipe, delete query nodes.
- [COORTWEET] https://search.r-project.org/CRAN/packages/CooRTweet/vignettes/vignette.html -- coordinated behavior detection.
- [NIEMANLAB-2023] https://www.niemanlab.org/2023/04/among-all-of-his-mistakes-dont-forget-elon-musk-is-singlehandedly-crushing-a-big-chunk-of-internet-research-for-no-good-reason/ -- Twitter Enterprise pricing.
- [COMMUNALYTIC] https://socialmedialab.ca/2024/05/01/bluesky-data-is-now-available-via-communalytic-a-no-code-computational-social-science-research-tool-for-studying-online-discourse-2/ -- Bluesky collection.
- [VAN-GEENEN-2023] https://www.frontiersin.org/articles/10.3389/fdata.2022.510310/full -- sample maps misread as populations.
- [OGNYANOVA-R] https://kateto.net/network-visualization -- Ognyanova, "Network visualization with R" tutorial.
- [OGNYANOVA-WS] https://raw.githubusercontent.com/kateto/R-Network-Visualization-Workshop/master/Sunbelt%202021%20R%20Network%20Visualization%20Workshop.R -- Sunbelt 2021 workshop script.
- [IGRAPH-TKPLOT] https://rdrr.io/cran/igraph/man/tkplot.getcoords.html -- tkplot.getcoords, renamed tk_coords.
- [SNA-GPLOT] https://search.r-project.org/CRAN/refmans/sna/html/gplot.html -- interactive vertex moves, returned coordinates, coord, displayisolates.
- [GGRAPH-FACET] https://ggraph.data-imaginist.com/reference/facet_edges.html -- edge facets with nodes repeated in every panel.
- [GEPHI-FAQ] https://gephi.org/faq -- SVG export keeps objects editable.
- [SCI2-PUB] https://wiki.cns.iu.edu/SCI2TUTORIAL/2.4-Saving-Visualizations-for-Publication_1245847.html -- export, open in Inkscape, ungroup, edit labels.
- [ELSEVIER-ART] https://www.elsevier.com/about/policies-and-standards/author/artwork-and-media-instructions/artwork-overview -- EPS, TIFF, fonts.
- [ELSEVIER-SIZE] https://www.elsevier.com/about/policies-and-standards/author/artwork-and-media-instructions/artwork-sizing -- dpi and column widths.
- [APSR-FIG] https://www.cambridge.org/core/journals/american-political-science-review/information/author-instructions/preparing-your-materials -- grayscale readability.
- [THOMAS-BLITZSTEIN] https://arxiv.org/abs/1101.0788 -- "Valued Ties Tell Fewer Lies: Why Not To Dichotomize Network Edges With Thresholds".
