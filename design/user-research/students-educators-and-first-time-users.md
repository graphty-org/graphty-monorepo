# Students, Instructors and First-Time Graph Users

Every term, students meet graph software for the first time because a course requires it. They fall into four
groups whose tools and steps barely overlap: (1) students of graph theory and graph algorithms (computer-science
data structures, discrete mathematics, and school "decision mathematics"), who draw small weighted graphs and step
through Dijkstra or Kruskal; (2) social-network-analysis students in communication, sociology, media studies and the
humanities, who load a supplied dataset into Gephi and export a sized, colored figure; (3) statistical and
computational network students, who work in R (statnet, igraph) or Python (NetworkX) notebooks and fit models;
(4) biology students, who turn a gene list into a protein network with Cytoscape and STRING. Instructors pick the
tool, prepare the dataset and handout, and grade the result. Outside the classroom, the documented first-time users are
community and social-media analysts, data journalists, nonprofit and public-sector staff mapping a system, and business
analysts in Excel or Power BI; each arrives with a hand-built table, one tutorial and a question that is not yet a
network question. An adjacent population, graph theory researchers who study small exact graphs (extremal examples
and counterexamples), is covered in sections 2.7 and 4.11. This population matters to a
graph product because tool habits form here, the hardest usability problems (installation, import, reading a layout
correctly) show up most clearly here, and a tool that fails is abandoned within one session.

Quotations below were checked against the cited page. Claims marked "inference" have no direct source.

## 1. Population

- **Graph-algorithm and discrete-math learners.** Data-structures and algorithms courses (VisuAlgo is built
  "primarily" for the National University of Singapore's CS2040, CS3230, CS3233 and CS4234 [VisuAlgo SSSP]); course
  visualizers such as UC Riverside's CS 10C page, which steps through DFS, BFS, Dijkstra and Prim [UCR CS10C]; and
  secondary-school mathematics such as Pearson Edexcel's Further Mathematics Decision 1, whose June 2023 AS paper asks
  for a quick sort, a critical-path analysis with a Gantt chart, Dijkstra and Prim on a 10-vertex network, and route
  inspection [Edexcel D1 2023]. No source found comparing their enrolments with network-analysis courses.
- **Social-network-analysis undergraduates.** Rutgers SC&I 373 (Polinode and Gephi required; final project "analyze
  and visualize it using Gephi (www.gephi.org) or Polinode") [Rutgers SCI 373]; UGA POLS 4158e (a "Basics in Gephi"
  assignment) [UGA POLS 4158e]; UT Dallas ATCM 3385 [UTD ATCM 3385]; San Jose State CS 176 (lists NetworkX and Gephi)
  [SJSU CS 176]; University of Florida "Spatial Networks" (Gephi and ArcGIS labs) [UF Spatial Networks].
- **Digital-methods students in media studies and the humanities.** Aarhus "Digital Methods" (105 students in three
  classes) [Aarhus case]; Warwick IM904 (two-hour Gephi lab on Twitter mention networks) [Warwick IM904]; Oslo SOS2920,
  whose group term paper must "Include the use of network visualisation software (e.g., Gephi)" and a text tool such as
  Voyant [Oslo SOS2920]; Grinnell [Grinnell]; Aalborg [Mapping Controversies 1.8]; Edinburgh [Digital Orientalist].
- **Statistical network-analysis graduate students (mostly R).** Sociology and communication seminars that end in a
  research paper and teach statistical models: Ohio State COMM 7710 (R with igraph; textbook Kolaczyk and Csardi,
  "Statistical Analysis of Network Data with R") [OSU COMM 7710]; Sociology 8412 taught by Almquist at Minnesota (R,
  RStudio, GitHub; QAP and network regression, ERGM, "Adequacy and Degeneracy in ERG Models") [Soc 8412]; Duke's
  social networks seminar (Pajek and R; "Calculate ERGM on an example graph"; SIENA) [Duke Soc 229]; University of
  Washington STAT 567 (R sna and network packages; ERGM goodness of fit; latent space models) [UW STAT 567]; the GESIS
  week-long "Social Network Analysis with R" course, ending with ERGM and stochastic actor-oriented models [GESIS 2023].
- **Computational network-science students (mostly Python).** Leiden SNACS (Gephi in week 1, NetworkX in week 2)
  [Leiden SNACS]; Georgia Tech CS 7280 (assignments ship as a Jupyter notebook plus a requirements file) [GT CS 7280];
  Oklahoma CS 5483 ("All programming assignments will be completed in Python notebooks using libraries such as
  NetworkX") [OU CS 5483]; Indiana INFO I368 (NetworkX; Google Colab recommended) [IU INFO I368]; Rochester ECE 442
  (five homework sets, each a Colab notebook) [Rochester ECE 442].
- **Biology and bioinformatics students.** Their first graph tool is usually Cytoscape with the STRING app: two-hour
  campus workshops at Pitt (for "Experimental biologists", no programming) [Pitt Cytoscape] and Yale [Yale STRING], and
  the official stringApp tutorials [stringApp protocol; Jensen lab exercises]. A University of Virginia "Networks in
  Biology" course (26 students) reports students "struggled with fully understanding network measures" [NotD]. Depth:
  see systems-biology-omics-networks.md in this folder.
- **Online learners.** Michigan's Coursera course ("115,226 already enrolled") [Coursera UMich]; Stanford's (75,338)
  [Coursera Stanford]; Indiana's Information Visualization MOOC [Zoss et al.].
- **Workshop attendees.** Manchester's 10-week online course on "UCINET software" ("No prior experience is required")
  ["Manchester Mitchell Centre"]; library workshops (UF, 90 minutes [UF Atlas Lab]; UBC, Brown).
- **Classroom-network education researchers and teachers.** They survey who is friends with whom in a class; the LASER
  Institute teaches this with a 27-student middle-school friendship network [LASER case study].
- **Non-student first-time users.** Four groups are documented. Product managers are not: no source found showing
  them bringing data to graph tools (searches returned only vendor comparison pages).
    - _Community and social-media analysts._ NodeXL's authors built it so "social media analysts and community
      administrators" could analyze participation without programming; their two studies observed 15 and 21 graduate
      students training as such analysts, "information professionals" with "little technical background or experience
      with SNA techniques" (only 1 of 15 had done SNA) [Hansen et al.; Bonsignore et al.].
    - _Data journalists._ Bradshaw's introduction for journalists lists their questions (most connected, influence,
      bridges, clusters, overall shape) and data (company directors from registers, tweets, characters mentioned
      together), and suggests starting in Flourish [Bradshaw]. Depth: investigative-journalism-and-osint.md.
    - _Nonprofit, philanthropy and public-sector staff._ Kumu's Systems Practice guide, written for the Omidyar Group
      and +Acumen workbook, has them draw factors, causal links marked "++" or "+-" and reinforcing or balancing loops by
      hand rather than import data [Kumu systems practice]. Depth: systems-and-stakeholder-mapping-civic.md.
    - _Business analysts in Excel and BI tools._ A Power BI tutorial draws "visitors to my blog and their next likely
      step after visiting my home page" from an Excel file, with line width for "the strength of the relationship"
      [Pragmatic Works]; NodeXL runs inside Excel [Bonsignore et al.]. A TrustRadius reviewer used Gephi to "sell the
      clustering techniques to un-initiated and non-technical managers and executives" [TrustRadius Gephi].
- **Graph theory and combinatorics researchers (adjacent population, not students).** The algorithm learners above
  study graph theory; these mathematicians and computer scientists do research in it, and the graph itself is the
  object of study: extremal graphs, counterexamples to conjectures, enumeration of graph classes. They are covered
  here because their graphs are as small as a student's (often under 30 vertices) but their needs are the opposite:
  exact drawings and exact invariants, many graphs at once, and no data import from tables. The field has its own
  infrastructure. House of Graphs at Ghent University is "to the best of our knowledge the most widely used database
  within the graph theory community" [Jooken 2025]; it holds "nearly 22 000" graphs that users found interesting and
  offers complete lists for 27 graph classes [House of Graphs 2.0]. Its authors "consider e.g. counterexamples to
  known conjectures and extremal graphs to be interesting" [House of Graphs 2012]. A 2025 survey treats
  computer-assisted graph theory as a field of its own: exhaustive generation of all non-isomorphic graphs in a class,
  searchable databases of graphs and invariants, and solver, metaheuristic and machine-learning searches for
  counterexamples [Jooken 2025]. Repositories of graphs for this research go back to R. M. Foster's work in the
  1930s [Graph repositories survey]. Persona in section 2.7, workflow in 4.11.

**Size.** No source counts students who use graph tools per term. Sci2 reports "more than 150,000 tool users" [Zoss et
al.]; Gephisto had "almost a thousand different users" in seven months [Gephisto]; a curriculum study analyzed 30
network science courses [Sayama curriculum]. Graph theory research, measured by documents: zbMATH Open classifies
5,981 documents under MSC 05C (graph theory, primary or secondary code) for 2015, 6,264 for 2020, 5,889 for 2023 and
6,143 for 2024 [zbMATH 05C counts]; these are papers, not people, and no source says how many of them used software. The nauty
and Traces paper, whose `geng` generator the field uses to list all graphs of a given order, had 1,063 Scopus
citations when its repository record was last updated [nauty citations]. Neither House of Graphs paper gives a count
of registered users [House of Graphs 2012; House of Graphs 2.0]. Inference: the computer-assisted part of the field is
in the low thousands of researchers, a medium population by the roster's size rule, with no direct count.

**How often.** SNA students use the tool intensively for two to six weeks (Rutgers: three network assignments, then a
final project [Rutgers SCI 373]), then often never again. Algorithm learners use a visualizer for a few weeks of a
term and before exams. Instructors rebuild handouts for each tool release [Warwick IM904].

**Skill profile.** Graph literacy near zero at entry: network visualization literacy "of youth and adults is not very
high or broad"; museum visitors "could not readily identify networks in either social or natural contexts" [Zoss et
al.]. Coding splits the population: humanities, media and biology students point and click; CS and physics use
Python; quantitative sociology and statistics use R.

**Team context.** Solo weekly work; groups of three or four for final projects [Rutgers SCI 373; UMD INFM 289I]; UT
Dallas pairs "a student who can code with a student who
can draw" [UTD ATCM 3385].

## 2. Personas

### 2.1 Class-project student ("Dev") -- id `class-project-student`

- **Role.** Third-year undergraduate in a communication, political science, history or media-studies methods course.
- **Background.** Spreadsheets, no programming. Has the lab slides and one tutorial. The assignment supplies node and
  edge lists (or asks him to build them) and asks for the central people and the groups.
- **Tools today.** Gephi desktop (Rutgers, UGA, Aarhus, Warwick, UF, Grinnell), Polinode or Flourish, Excel, Google
  Slides or Word. Increasingly a chat assistant to explain a measure (section 4.8).
- **Data.** 30 to 1,000 nodes: Les Miserables (74 characters, 248 links) [UBC hands-on], Quakers (119 nodes, 174
  edges) [Programming Historian], a class network the students built (Aarhus, UT Dallas), the Ho Tung family network
  of 111 people [Digital Orientalist].
- **Goals.** "a well-designed, informative visualization of your network" and answers to "Who are the most important
  people in it? What groups and communities do they belong to?" [Rutgers SCI 373].
- **Frustrations.** Installation and Java problems; no undo ("Currently, this feature isn't available") [Gephi FAQ]; the first drawing "doesn't look very
  useful (yet)" [UBC hands-on]; Gephi "doesn't automatically tell us what these measures mean or how they are
  calculated" [Grinnell]; preview "may not look identical to what you see in the Overview tab" [Takes Gephi tutorial];
  only the eight largest modularity classes get colors by default, the rest gray [Gephi FAQ]; different communities
  from classmates ("Your clusters will differ because the modularity clustering algorithm is not deterministic
  either") [Mapping Controversies 1.8].

### 2.2 Algorithms and discrete-math learner ("Sam") -- id `graph-algorithms-learner`

- **Role.** Second-year CS student in data structures and algorithms, a discrete-math student, or a 17-year-old taking
  Further Maths Decision 1; also the lecturer who demonstrates an algorithm in class.
- **Tools today.** VisuAlgo (draw or load a graph, run BFS, DFS, Dijkstra, Bellman-Ford step by step) [VisuAlgo SSSP;
  VisuAlgo DFS/BFS]; Graph Online (click to add vertices and edges, then pick from a menu of about 25 algorithms)
  [Graph Online]; course-hosted step-through pages [UCR CS10C]; pencil, paper and the exam answer book.
- **Data.** Hand-drawn graphs of 5 to 15 vertices with integer weights, copied from a textbook or exam (the 2023
  Edexcel network has vertices A to J) [Edexcel D1 2023]; preset examples ("Bellman-Ford Killer", negative cycles)
  [VisuAlgo SSSP].
- **Goals.** Understand why the algorithm picks each edge; reproduce the exam's expected order exactly ("You must
  clearly state the order in which you select the edges of your tree"); show working ("Answers without working may not
  gain full credit") [Edexcel D1 2023].
- **Frustrations.** Tools that show only the final answer [Graph Online shortest path] or states without distances
  [UCR CS10C]; tie-breaking that differs from the hand trace (VisuAlgo's DFS takes "the lowest vertex number" first
  [VisuAlgo DFS/BFS]; another order is valid but not what the grader expects -- inference).

### 2.3 Coding-track network-science student, Python ("Priya") -- id `network-science-coding-student`

- **Role.** Master's or upper-level undergraduate in CS, physics or data science; also the Coursera learner.
- **Tools today.** Jupyter, often hosted (Colab "has been tested with our assignments" [IU INFO I368]; Georgia Tech
  ships a notebook plus pinned requirements [GT CS 7280]); NetworkX; matplotlib for the first drawing; Gephi for a final
  figure (Leiden: Gephi for "relatively small network data", NetworkX for "larger network datasets") [Leiden SNACS];
  a code assistant where the course allows it (section 4.8).
- **Data.** Instructor files (employee and email networks [Coursera UMich]); repository sets far larger than teaching
  sets (SNAP ego-Facebook 4,039 nodes and 88,234 edges; Epinions, in Leiden's week-2 lab, 75,879 and 508,837)
  [SNAP ego-Facebook; SNAP Epinions; Leiden SNACS].
- **Goals.** Pass problem sets (connectivity, centrality, network evolution, link prediction [Coursera UMich]); a final
  project comparing each measure to "the proper random reference" [UTD ATCM 3385].
- **Frustrations.** `nx.diameter` failing on a disconnected graph [Programming Historian]; weights read as distances
  [NetworkX docs]; layouts that change every run until a seed is set [dshizuka tutorial]; NetworkX's own docs say its
  drawing is "basic" and recommend "tools dedicated to that task" [NetworkX drawing].

### 2.4 Statistical network-analysis student, R ("Tomas") -- id `r-statistical-network-student`

- **Role.** PhD student in sociology, communication, public health or statistics, in a semester seminar or a GESIS-style
  week-long course.
- **Tools today.** R and RStudio; igraph [OSU COMM 7710]; statnet's network, sna and ergm packages [UW STAT 567; Duke
  Soc 229]; tidygraph and ggraph for plots [Data-edu cookbook]; GitHub and literate `.Rnw` homework [Soc 8412]; Pajek
  in older syllabi [Duke Soc 229].
- **Data.** Edge lists plus attribute tables from his own survey or a replication dataset; packaged teaching sets
  (`data(florentine)`) and Pajek files read with `read.paj` [statnet ERGM tutorial].
- **Goals.** A research paper ("The main requirement for the course is a research paper" [OSU COMM 7710]; also [Duke
  Soc 229]) whose claims rest on a model: QAP regression, ERGM with goodness-of-fit, or a stochastic actor-oriented
  model [Soc 8412; UW STAT 567; GESIS 2023].
- **Frustrations.** No direct student self-report found. From the materials: ERGM degeneracy is taught as its own week
  [Soc 8412]; coefficients are "conditional log-odds" of a tie, which must be explained in words [statnet ERGM
  tutorial].

### 2.5 Network analysis instructor ("Dr. Ana Ruiz") -- id `network-analysis-instructor`

- **Role.** Faculty member, lecturer or digital-scholarship librarian teaching a 14-week course or a 90-minute workshop.
- **Tools today.** Gephi, Polinode, UCINET (Manchester), R/igraph and statnet, NetworkX, Kumu and Flourish, Cytoscape
  for biologists, VisuAlgo for algorithm lectures; Canvas or Brightspace for install notes and datasets [Aarhus case].
- **What she prepares.** A small, sparse dataset ("small networks with low density" [Zoss et al.]), a handout with
  exact menu paths, install notes, a fallback when a data source closes ("Access to Twitter has since been restricted.
  Use YouTube instead." [Aarhus case]; pre-made files [Warwick IM904]), and an AI-use policy (4.8).
- **Goals.** Students reach a correct, readable figure in one lab; they learn that "networks are not fixed or objective
  representations of reality" [NotD]; grading is fair and fast.
- **Frustrations.** Handouts that rot with each release (Warwick; Grandjean's tutorial "made for Gephi 0.8.2"
  [Grandjean]); install time eating the first lab; Windows-only tools (UCINET requires "Windows operating system Vista
  or later" [UCINET]); Kumu's free projects are "visible to everyone and indexed by search engines" unless a student
  asks for free private projects with a .edu address [Kumu pricing]; "It also won't be possible to cover all of the
  functions in Gephi" [Aarhus case].

### 2.6 Explorer Elena, the non-student first-time user -- id `explorer-elena` (existing record, re-based)

- **Re-base the population.** The record makes Elena a product manager; no evidence supports that (section 1). Make
  her an occasional analyst in one of the four documented groups, best studied as the community or social-media
  analyst [Hansen et al.; Bonsignore et al.], keeping the novice, voluntary, laptop profile.
- **What she arrives with.** Not an edge list but a table she collected: member profiles and forum posts typed into
  Excel by hand ("on average 2.5 hours") [Hansen et al.]; company-register directors or tweets [Bradshaw]; workshop
  factors and causal links [Kumu systems practice]; a from-to table with a count [Pragmatic Works].
- **What she asks first.** Not yet a network question. Hansen et al.'s novices asked correlation questions ("Do people
  who post more often also complete more projects?") until the instructor reshaped them; 8 of 12 named defining goals
  "the hardest conceptual step" [Hansen et al.]. "Something interesting" then means a hub or bridge, a subgroup, or
  the overall shape: the three things observed participants were asked to find were "a unique social role", "an
  interesting sub-group" and "anything else of particular interest" [Bonsignore et al.; Bradshaw].
- **Confirms** the existing record: novice, voluntary, wants to see something fast, relies on size and color, shares
  pictures, loses confidence quickly with a steep tool.
- **Corrects and deepens.** (a) The table's shape decides success (Kumu needs "Label" in A1 and "From"/"To", and
  rejects `.xls` [Kumu import FAQ]; Flourish needs a Links sheet [Flourish help]). (b) Her tool may not answer "who is
  central": in Flourish "There's no provision for encoding any kind of centrality" [Posner Flourish]. (c) She reads
  pictures more than numbers: "for student as novice analysts, the visualizations were far more important than
  metrics", and only 1 of 15 represented a metric other than degree [Hansen et al.]. (d) She reads drawn distance as
  similarity and "wider links especially made nodes seem more similar" [Zoss et al., citing Fabrikant]. (e) She may
  never install anything: Gephi's FAQ sends beginners to Gephi Lite in the browser [Gephi FAQ].

### 2.7 Graph theory researcher ("Dr. Margit Vos") -- id `graph-theory-researcher`

- **Role.** Research mathematician or theoretical computer scientist working on an extremal, coloring, spectral or
  structural question; also the PhD student who runs the searches for the group. Adjacent to this document's students
  (section 1), not one of them.
- **Tools today.** nauty's `geng` to generate every non-isomorphic graph of an order, piped straight into a filter
  program rather than stored [Jooken 2025]; `pickg` and `countg` to select or count graphs by properties such as
  vertex and edge counts or regularity [pickg manual]; `labelg` for canonical labels so isomorphism becomes string
  comparison [RIT homework]; `plantri` for planar graphs and triangulations [plantri]; SageMath for invariants and
  plots, which reads and writes graph6 and sparse6 [Sage graph_list]; Mathematica, whose Import "fully supports" graph6
  [Wolfram Graph6]; House of Graphs to check whether a graph is already known and to draw it [House of Graphs 2.0];
  TikZ, TikZiT or Ipe for the hand-placed figure in the paper [Ipe; TikZiT].
- **Data.** Graphs as one-line strings: graph6 for any graph, sparse6 "more efficient for sparse graphs"; the Petersen
  graph is `IsP@OkWHG` [Jooken 2025]. Files hold thousands to millions of such lines; there are 12,005,168 graphs on 10
  vertices [Jooken 2025]. Planar graphs come in plantri's planar code, which records each vertex's neighbors "in
  clockwise order" and so carries the embedding that graph6 and sparse6 lose [plantri guide].
- **Goals.** Find or rule out a counterexample; see the structure of an extremal graph well enough to guess the
  general construction (Wagner's machine-learning search gave a best graph whose "structure gives a good idea of what
  a potential counterexample could look like" [Jooken 2025, on Wagner 2021]); check whether a graph "already appeared
  as an 'interesting' graph in other contexts"; publish a figure and cite the graph by its House of Graphs id, which
  "researchers sometimes mention ... in papers" [House of Graphs 2.0].
- **Frustrations.** The generators draw nothing; their output is text. SageMath's `show_graphs` shows "a maximum of 20
  graphs" per array and each array must be saved separately [Sage graph_list]; its interactive view is a d3
  force layout fetched from the web, with zoom and tooltips still listed as to-do [Sage graph_plot_js]. Its planar
  layout uses Schnyder's algorithm and its Tutte layout needs a 3-connected planar graph [Sage graph_plot]. House of
  Graphs starts from a spring embedding "which can then still be manually fine-tuned by the user" [House of Graphs
  2.0], and its planar embedder works best for 3-connected graphs [House of Graphs draw]. graph6 drops the embedding
  [plantri guide], so a planar drawing has to be recomputed after every filter step.
- **Why the population matters to graphty-element (inference).** Small, but each graph is looked at closely and the
  needs are unusual: graph6, sparse6 and planar code import; exact, symmetric drawings (circular, shells, planar
  straight-line, Tutte) rather than force-directed ones; every vertex labeled; exact invariants beside the drawing;
  paging through many tiny graphs; TikZ output. graph-io reads none of these formats today (its formats are CSV, CX,
  CX2, Cytoscape sessions, DOT, GEXF, GML, GraphML, JSON, Neo4j CSV, OBO, Pajek, SIF, XGMML and XLSX; none is graph6).
  graphty-element already ships circular, shell, spectral and planar layouts; its planar layout is a port of NetworkX's
  and computes its own embedding, so it cannot use the one plantri wrote. It has no Tutte layout.

## 3. Use cases (ranked)

| Rank | Question answered with a graph                                                                                                                  | Who                                | Frequency                     | Stakes                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------- | ------------------------------------------ |
| 1    | Who are the most important (central) nodes, by which measure?                                                                                   | SNA, coding, Elena                 | every assignment              | grade; the core sentence of every report   |
| 2    | What groups or communities are there?                                                                                                           | SNA, coding, Elena                 | most assignments              | grade; colors the figure                   |
| 3    | Produce a readable, labeled figure                                                                                                              | all                                | every assignment              | grade                                      |
| 4    | Run a named algorithm on a small weighted graph and see each step (BFS, DFS, Dijkstra, Bellman-Ford, Prim, Kruskal, route inspection, max flow) | algorithms learners, lecturers     | weekly in term, exam revision | exam marks depend on the exact order       |
| 5    | Draw a graph by hand (from an exam question, a family tree, a paper sketch)                                                                     | algorithms learners, SNA classes   | weekly                        | the graph must match the question          |
| 6    | Import my own data and check it came in right                                                                                                   | all                                | every project                 | silent errors invalidate everything after  |
| 7    | Build a class network from a survey                                                                                                             | SNA classes, education researchers | once per course               | personal data; directed nominations        |
| 8    | Describe the whole network (density, components, diameter, clustering) against a random baseline                                                | SNA, coding                        | weekly, project               | grade                                      |
| 9    | Test a hypothesis with a statistical model (QAP, ERGM, SAOM) and show the fitted effect                                                         | R students                         | project                       | publishable paper                          |
| 10   | Turn a gene or protein list into an interaction network, cluster it and test enrichment                                                         | biology students                   | workshop, thesis              | biological claim                           |
| 11   | Build a network from non-network data (hyperlinks, tweets, co-appearance, two-mode memberships)                                                 | digital-methods students           | project                       | core learning goal at UT Dallas and Aarhus |
| 12   | Find brokers and paths; compare two networks or time slices                                                                                     | SNA, coding                        | some assignments, projects    | grade                                      |
| 13   | Prepare a dataset, a handout and a fallback for a lab                                                                                           | instructors                        | each term                     | class time lost if it fails                |
| 14   | Grade a figure, a step list or a metrics table quickly and fairly                                                                               | instructors, TAs                   | each assignment               | fairness; AI-use checks                    |
| 15   | Page through the graphs a generator and filter left (a few to thousands), each drawn exactly with its invariants, to find the counterexample    | graph theory researchers (2.7)     | per project                   | a conjecture stands or falls               |
| 16   | Draw one small graph exactly (symmetric, planar, every vertex labeled) for a paper figure and cite it                                           | graph theory researchers (2.7)     | per paper                     | the published figure must be correct       |

## 4. Step-by-step workflows

### 4.1 Student lab: supplied dataset to a sized, colored, exported figure (Gephi desktop)

1. **Install (before class; 10-60 minutes when it fails).** Gephi 0.11.4, with separate Apple Silicon and Intel macOS
   builds; Gephi calls the desktop app "beta" [Gephi desktop]. Older releases needed Java 8 ("Gephi does not currently
   work with JDK newer than 8") [Arch bug 68457].
2. **Open the data (2 minutes).** A `.gexf` with its import report [UBC hands-on], or CSVs in the Data Laboratory,
   nodes then edges, choosing direction [Grinnell]; uncheck "create missing nodes" [Grandjean]; Warwick says "choose
   the Graph Type 'Mixed'" [Warwick IM904].
3. **Check the counts (1 minute, often skipped).** Compare with the file ("If you see 119 nodes and 174 edges, then
   you've got all the necessary data") [Programming Historian].
4. **Run a layout (2-10 minutes).** ForceAtlas2 with scaling 5.0 [Takes Gephi tutorial] or 50 with "prevent overlap"
   [Grandjean]; stop it by eye ("just eyball that it does not significantly move anymore") [Mapping Controversies 1.8].
5. **Compute statistics (2 minutes).** Average degree, modularity, network diameter (which also gives betweenness),
   PageRank; each writes a column [Grandjean; Grinnell]. Degree "is calculated dynamically" and shows as a column only
   after the statistic runs [Gephi FAQ].
6. **Map size and color (5 minutes).** Size ranked by degree ("10-100" [Grandjean]); color partitioned by "Modularity
   Class" [Warwick IM904]; only the top eight classes colored by default [Gephi FAQ].
7. **Filter (optional).** Topology > Giant Component and Degree Range [Warwick IM904]; the giant-component filter "does
   nothing in case the network consists of just one connected component" [Takes Gephi tutorial].
8. **Labels (2-10 minutes).** Show labels, size by node, Label Adjust.
9. **Preview and export (5-15 minutes).** Use SVG or PDF; "exporting in .png produces figure with a poor resolution"
   [Grandjean]; Takes recommends "a vector graphic format such as SVG, or, usually easiest, PDF" [Takes Gephi tutorial].
10. **Export the node table** with "Export table" for top-five lists [Takes Gephi tutorial].
11. **Annotate and write (30-120 minutes)** in Google Slides [Mapping Controversies 1.8] or Inkscape [Grandjean].

Decisions (direction, which centrality, modularity resolution, when to stop the layout) come from the handout;
students rarely reason about them. Hand-off: an image and a node table into a report on the LMS.

### 4.2 Algorithms learner: draw a graph, run an algorithm step by step, check it against a hand trace

1. **Get the graph (2-5 minutes).** Copy a 5-15 vertex weighted network from the exam paper or textbook. In Graph
   Online: "Add vertex" and click the canvas; "Connect vertices", click two vertices, then set a weight and directed or
   undirected in a dialog; undo with Ctrl+Z [Graph Online]. In VisuAlgo: "Edit Graph" to "edit or (re-)draw", or type
   an edge list, adjacency list or adjacency matrix and let it propose a drawing; or pick a preset [VisuAlgo SSSP].
2. **Make weights visible.** Weights appear as edge labels; the exam figure prints them on each arc [Edexcel D1 2023].
3. **Choose the algorithm and start vertex.** VisuAlgo: BellmanFord(s), BFS(s), Dijkstra(s), DFS(s), DP(s), with
   original and modified Dijkstra variants and a warning when BFS or DFS may give wrong answers on weighted input
   [VisuAlgo SSSP]. Graph Online offers about 25, from BFS to maximum flow [Graph Online]. Exams fix the start ("Use Prim's algorithm,
   starting at C") [Edexcel D1 2023].
4. **Step through (5-15 minutes)** with previous, next, play and speed [VisuAlgo SSSP; UCR CS10C], watching the
   distance estimate under each vertex, predecessor edges, the current pseudocode line [VisuAlgo SSSP], vertex states
   (Unvisited, In Queue, Visited) [UCR CS10C] and DFS tree, back and cross edges [VisuAlgo DFS/BFS].
5. **Check against the hand trace.** Compare the order edges were chosen, the final distances and the route with the
   working in the answer book. Exams ask to "State this route and its length", to state "the order in which you select
   the edges", and, for route inspection, which roads "need to be traversed twice" [Edexcel D1 2023]. Tie-breaking
   matters: VisuAlgo's DFS visits "the lowest vertex number" first [VisuAlgo DFS/BFS].
6. **Record it.** Homework wants the steps ("show sufficient working") [Edexcel D1 2023]; Graph Online saves an image,
   SVG, a link and the matrix [Graph Online].
7. **Lecturer variant.** Run the same steps on a projector, pausing to ask what happens next; VisuAlgo's default
   "e-Lecture Mode" is built for this [VisuAlgo SSSP].

SNA classes use the same hand-drawing step: Edinburgh students hand-draw family networks of 10 to 30 nodes before
Gephi, because the merged one is "difficult to manually draw" [Digital Orientalist].

### 4.3 Build a class network from a survey

1. **Write the name generator.** One question per relation, e.g. "Please list up to five classmates you seek help
   from most frequently" [Data-edu cookbook]; add a time frame, since "Providing a roster and a specific time frame in
   network surveys boosts recall and reliability" [Traxler et al.].
2. **Choose roster or recall, and a cap.** Roster methods "generally yield higher quality data" needing "less
   post-processing" but "scale poorly with sample size"; name generators "entail a large amount of highly error-prone
   post-processing" [Ross and Redhead]. Free recall gave about 4.25 nominations per person against 5.74 for rosters
   [Neal meta-analysis]; students may not "reveal" negative ties [Saxena et al.].
3. **Collect.** A form or survey tool exports one row per respondent with one column per nominee (inference; no source
   found describing a class export).
4. **Reshape and resolve names.** Turn the wide table into a long edge list (source = respondent, target = nominee),
   match spellings to the roster, and join attributes by name (`match(V(g)$name, ...)`) [Data-edu cookbook].
5. **Anonymize.** Replace names with ids before sharing ("Protect anonymity and comply with IRB/data use guidelines"
   [Data-edu cookbook]); UT Dallas students analyze "an anonymized version of our class social network" [UTD ATCM
   3385]; the LASER data relabels students 1 to 27 [LASER case study].
6. **Import as directed** (`graph_from_data_frame(..., directed = TRUE)`) and check reciprocity with `reciprocity()`
   and `edge_is_mutual()` [Data-edu cookbook]. Non-respondents still appear because others named them, so their ties
   are half observed [Traxler et al.]; "missing responses can impact network structure and interpretation" [Data-edu
   cookbook].
7. **Draw and interpret.** LASER uses Kamada-Kawai, color by gender, size by friends, then compares student- and
   teacher-reported networks [LASER case study]; Aarhus uses it so students see that "data is created" [Aarhus case].

### 4.4 Semester project: collect your own network, analyze, present

1. **Choose a network.** Rutgers lists public datasets [Rutgers SCI 373]; UT Dallas requires students to "collect
   their own data" [UTD ATCM 3385]; UMD requires real data [UMD INFM 289I].
2. **Pitch.** Nodes, links, method, estimated size ("Make sure that N > 100") [UTD ATCM 3385].
3. **Clean (hours to days)** in Excel or OpenRefine; reconcile names; decide what a tie is (UMD links New Testament
   figures who appear together in at least three chapters [UMD exercise]).
4. **Analyze.** Size, density, "Who are the most important people in it?" [Rutgers SCI 373]; for each measure "[a] What
   was your expectation? [b] What is the proper random reference?" [UTD ATCM 3385].
5. **Visualize** "with sense-making layouts as a node- link diagram, as a matrix, etc." [UTD ATCM 3385].
6. **Write and present.** Rutgers: 1,500-3,000 words (groups 2,500-5,000), network data and "a well -designed,
   informative visualization" attached, late work loses 10 points [Rutgers SCI 373]. UMD: five pages plus four per
   extra member, analysis 6 of 12 rubric points [UMD INFM 289I]. UT Dallas: a presentation; "non-compliant filenames
   will not count as submitted" [UTD ATCM 3385].

### 4.5 Coding-track problem set, Python (NetworkX in a notebook)

1. **Open the notebook** -- often hosted (Colab at Indiana and Rochester; a zip with a notebook and requirements file at
   Georgia Tech) [IU INFO I368; Rochester ECE 442; GT CS 7280], so desktop installs are not an option.
2. **Load CSVs**, build `nx.Graph()`, add nodes and edges, print counts (119 and 174 for Quakers) [Programming
   Historian].
3. **First look.** `nx.draw` with matplotlib [LASER case study], which NetworkX calls "basic" [NetworkX drawing]; at
   10^4 to 10^5 nodes it is a hairball (inference from section 2.3 sizes).
4. **Ask an assistant (where allowed)** for the call that computes a measure; document the prompt (OU: "Any prompts or
   AI-generated content used must be documented and submitted along with the notebook" [OU CS 5483]).
5. **Measures.** `nx.density` ("approximately 0.0248"); `nx.diameter` fails on a disconnected graph, so take the largest
   component first; `nx.transitivity` ("about 0.1694"); degree, eigenvector and betweenness; communities with
   `greedy_modularity_communities` [Programming Historian].
6. **Weights.** NetworkX uses weights for shortest paths, "so they are interpreted as distances" [NetworkX docs];
   strengths must be inverted first [graph-tool issue 294].
7. **Export** with `nx.write_gexf` to finish the figure in Gephi [Programming Historian].
8. **Interpret.** "whether 8 is a large or small diameter" cannot be read off the number; findings are "an invitation
   to more research rather than an endpoint or proof" [Programming Historian].

### 4.6 Statistical network analysis in R (statnet and igraph)

1. **Install** R, RStudio and packages; OSU's instructor shows "how to install R and packages in class" [OSU COMM 7710].
2. **Load data** into a network object: an edge list plus a node attribute table, or a Pajek file (`read.paj`); "will
   need to be transformed into a `network` object"; attributes read with `%v%` [statnet ERGM tutorial]. igraph users
   call `graph_from_data_frame` [Data-edu cookbook]; Ognyanova's tutorial covers "data input and formats" for
   one-mode and bipartite data [Ognyanova].
3. **Set a seed** with `set.seed()` so simulation steps reproduce [statnet ERGM tutorial].
4. **Describe.** Density, centrality, triad census, mixing by attribute (UW HW3, HW4, HW8) [UW STAT 567]; some courses
   first compute descriptives "by hand" (HW2) [UW STAT 567].
5. **Plot** with `plot.network` or ggraph [statnet ERGM tutorial; Data-edu cookbook].
6. **Model.** QAP and network regression [Soc 8412]; ERGM with terms looked up via `?ergmTerm` [statnet ERGM tutorial];
   SAOM/SIENA for change over time [Duke Soc 229; GESIS 2023].
7. **Diagnose** convergence and degeneracy, then goodness of fit ("Goodness of fit of ERGMs" week [UW STAT 567];
   "Adequacy and Degeneracy in ERG Models" [Soc 8412]).
8. **Interpret** each coefficient as "that term's contribution to the log-odds of that tie" [statnet ERGM tutorial].
9. **Write the paper** in R Markdown or `.Rnw`, versioned on GitHub [Soc 8412].

These students model in R and want a graph tool only to explore and draw, with typed round trips and fitted values
arriving as styleable columns (requirement 19).

### 4.7 Biology lab: from a gene list to a clustered, enriched protein network (Cytoscape and STRING)

Install Cytoscape with stringApp, clusterMaker2 and other apps beforehand [stringApp protocol; Yale STRING]; run a
"STRING protein query" on an identifier list (the exercise uses 541 UniProt accessions) with organism and number of
extra interactors [Jensen lab exercises]; import fold changes and p-values keyed on "query term"; map log ratios to
color; cluster with MCL (inflation 4); "Retrieve functional enrichment"; export figures and tables [stringApp protocol;
Yale STRING; Pitt Cytoscape]. The data unit is an identifier list, not an edge list. Depth:
systems-biology-omics-networks.md.

### 4.8 The AI assistant in the loop (all student workflows)

1. **Read the course policy:** a ban (Indiana counts help from "anyone or anything (including ChatGPT/Copilot/Gemini/
   Google etc.)" as cheating [IU INFO I368]), limited use (Rutgers allows AI "to brainstorm ideas" [Rutgers SCI 373]),
   or open use with documentation [OU CS 5483; CMU policies].
2. **Ask.** Point-and-click students ask what a measure means; one general-education class coded 24 instances of
   "Understanding Complex Topics" among 39 students who documented their AI use [Black and Tomlinson]. Coding students
   ask for code (inference from the policies above, which name code assistants).
3. **Verify.** OU makes students "responsible for verifying correctness" [OU CS 5483]; one upper-level CS course that
   allows AI tests understanding with written quizzes on each assignment and found "no meaningful linear correlation
   between GenAI usage levels and assessment outcomes" [Chung 2026].
4. **Disclose.** Where required, the prompts go in with the notebook or report. Use when it is not allowed is common:
   25% of Princeton AB and 37% of BSE seniors in a 2025 survey reported using an LLM on an assignment when it was not
   allowed [Princeton survey].

### 4.9 Instructor: prepare a lab that survives the first session

1. **Concept before tool.** "start with a thorough introduction to the core concepts of network theory before you
   even open Gephi"; "Even a simple introduction should take two lessons" [Aarhus case].
2. **Pick the dataset:** students' own data [Aarhus case], a class survey (4.3), a classic (karate club, 34 members
   and 78 edges [UCI karate]; Les Miserables; political books [Posner Flourish]) or an exam network.
3. **Write the handout** with exact menus and version notes; post it with data on the LMS [UBC hands-on; Warwick IM904].
4. **Run the lab:** demonstration, task, discussion, second task [Warwick IM904]; a 5-15 minute "Network of the Day"
   warm-up [NotD]; or a stepped algorithm demo (4.2).
5. **Grade** on use of tools, insight and presentation [UTD ATCM 3385]; or fixed deliverables with late penalties
   [Rutgers SCI 373]; for algorithms, the order and working [Edexcel D1 2023].

### 4.10 First session of a non-student newcomer (Elena)

Evidence: two observational studies of novice analysts in NodeXL (15 graduate students over a month, with diaries,
observation and a group-built process model [Hansen et al.]; 21 graduate students, the technical six observed for 30-45
minutes each [Bonsignore et al.]), a controlled study of 14 novices [NetworkNarratives], and the tools' guides. No
source found observing a non-student's first session in Kumu, Flourish or Gephi Lite, or measuring abandonment.

1. **Question and table, before the tool.** Browse the source to see what can be collected, decide what to collect,
   collect it (mostly by hand, "tedious"), restructure it into an edge list, add attributes [Hansen et al.]. "Four
   students needed assistance from the instructor to get their data into an appropriate edge list", and they confused
   the edge and vertex sheets [Hansen et al.].
2. **Fit the table to a no-install tool.**
    - Kumu: new project, pick the system, stakeholder, SNA or custom template, then draw by hand (suggested under about
      50 elements) or import; first decoration is "Color by" Element Type [Kumu first steps; Kumu import FAQ].
    - Flourish: network template; Links sheet required, Points optional; id equals label [Flourish help; Posner
      Flourish]. A first-time student's tip: source nodes need their own ids or they do not appear [Carleton Flourish].
    - Gephi Lite: its formats page lists GEXF, GraphML, Graphology JSON and its own workspace, not CSV [Gephi Lite
      formats], so a spreadsheet must be converted first (inference from that page).
    - Neo4j Bloom needs a database and a perspective someone else prepared; not a first stop for a spreadsheet holder
      (graph-database-query-and-expand-exploration.md).
3. **First picture.** It is "kind of a mess" and "very difficult to read"; order comes from layout and mapping, and
   one student called seeing clusters "a watershed moment" [Hansen et al.].
4. **Map attributes.** Choosing size, color and shape overwhelms; novices end up "using several visual properties for
   a single attribute". Metrics frighten: "seeing all those numbers" recalled math anxiety [Hansen et al.]. Flourish
   computes none [Posner Flourish].
5. **Look for something interesting:** a role, a subgroup, the shape (section 2.6). Half the students named
   boundary spanners between clusters as what SNA showed them [Hansen et al.]. Free exploration yields "the most
   obvious insights" (participant N10) [NetworkNarratives].
6. **Re-collect.** Goals change after the first picture: one student collected "4 rounds of data after visualizing
   the initial dataset" [Hansen et al.].
7. **Fine-tune and export.** Most spent over an hour on layout (run Fruchterman-Reingold, then drag nodes); 7 of 12
   called it the most technically challenging part; legends and annotations were added outside the tool [Hansen et
   al.]; users asked for SVG and lossless PNG [Bonsignore et al.]. Gephi Lite exports images only, "at the moment"
   without SVG or PDF [Gephi Lite differences].
8. **Share.** Kumu free projects are public [Kumu pricing]; Flourish embeds; Gephi Lite saves to GitHub Gists [Gephi
   Lite differences].

**Where confidence breaks.** Crashes and errors ("So then I start doubting myself"); the tool "is very strong, very
nuanced, but not very approachable" [Hansen et al.]; no undo, so after a crash students "had to start over"; weak
Excel skill was the "primary barrier" [Bonsignore et al.]. The project took a median 12.5 hours outside class (5 to 25) [Hansen et al.].

**What helped.** Peers' pictures "opened up a realm of possibilities" and an instructor reshaped the question;
the tutorial's datasets were "too simple" to transfer [Hansen et al.]. Guided data tours, tested on 14 data-science
postgraduates with no network experience for 10 minutes per condition, beat free exploration on "learned about
network analysis" (4.71 against 2.86 on a 5-point scale) and kept them exploring longer (8:48 against 5:00), but one
felt like "passively accepting facts" and another wanted help choosing a tour; the paper does not report which
questions novices asked first [NetworkNarratives].

### 4.11 Graph theory researcher: generate, filter, inspect and draw a counterexample

No source gives durations for these steps.

1. **Generate.** Run `geng` for every non-isomorphic graph of order n, with constraints on edges, degree bounds and
   connectivity [Jooken 2025], or `plantri` for planar classes with a connectivity bound [plantri]. Output is graph6 or
   sparse6 for geng, planar code for plantri [plantri guide]. Big runs are measured in CPU-years ("around 35, 80 and
   125 CPU-years" for three cited projects) [Jooken 2025].
2. **Filter.** Pipe the output into a filter rather than store it ("commonly known as piping"), typically a program
   that checks "whether there is a graph that yields a counterexample to a conjecture" [Jooken 2025]; or select by
   properties with `pickg` [pickg manual]; deduplicate by canonical label with `labelg`, `sort` and `uniq` [RIT
   homework].
3. **Look at what survived.** Load the surviving graph6 lines into SageMath (`from_graph6`) and view them 20 at a time
   in circular layout, the default because it "takes much less time to compute than the spring-layout algorithm" [Sage
   graph_list]; or open them in Mathematica [Wolfram Graph6]. PHOEG plots whole graph sets as points by two invariants
   and shows "all graphs corresponding to the same point" together [Jooken 2025].
4. **Check whether it is known.** Submit the graph to House of Graphs, which checks "whether the graph (or an isomorphic
   copy) is already in the list" [House of Graphs 2012], or search it by invariant ranges [House of Graphs 2012]. Its
   page shows the drawings and "all computed invariant values", from 44 invariants such as chromatic number, girth and
   treewidth [House of Graphs 2.0].
5. **Draw it for the paper.** Paste the graph6 string into the House of Graphs drawing tool, start from the automatic
   spring or planar embedding, adjust by hand, and export "svg, png, pdf, tikz" [House of Graphs 2.0]; or place it by
   hand in TikZ, TikZiT or Ipe [TikZiT; Ipe]. Mark the structure the proof uses (a figure in the survey circles "a
   maximum independent set" [Jooken 2025]).
6. **Publish and deposit.** Upload the graph to House of Graphs ("Any interested researcher can register a (free)
   account") and cite its id in the paper [House of Graphs 2.0].

Browsing many small graphs is a different interaction from exploring one large graph (inference from steps 3 and 4):
the reader pages through hundreds of separate drawings, compares each with its invariants, and the layout must be
deterministic and fast rather than an animated force simulation. Planar drawings need the embedding from step 1,
which graph6 has already discarded: plantri's guide says of graph6 that "the embedding is not represented, so this is
not a suitable code to use if you want the embedding", while planar code lists "the neighbors of vertex v in clockwise
order" [plantri guide].

**What graphty-element would have to read (from the format definitions).** graph6, sparse6 and digraph6 files put
"one object per line" after an optional header (`>>graph6<<`, `>>sparse6<<`, `>>digraph6<<`); a sparse6 line starts
with `:` and a digraph6 line with `&`; an incremental sparse6 line starts with `;`, takes its vertex count from the
previous graph and "cannot appear as the first graph in a file" [McKay formats]. Planar code is binary, begins with
`>>planar_code<<`, and "uses characters which are not printable"; plantri also writes edge code and two human-readable
forms [plantri guide]. A many-line file is a collection, not one graph: NetworkX's `read_graph6` returns "a list of
graphs" when the file "contains multiple lines" [NetworkX read_graph6], and Sage's `from_graph6` returns "a list of
Sage Graphs" [Sage graph_list]. House of Graphs reads a graph "encoded as adjacency matrix or in graph6 format" and
downloads in "adjaceny matrix, graph6, and multicode" [House of Graphs 2.0].

## 5. Data

- **Sources.** Instructor classics; repositories (SNAP, KONECT, Netzschleuder, Network Repository) [UTD ATCM 3385;
  NotD]; exam figures [Edexcel D1 2023]; class surveys (4.3); web crawls, Wikipedia and social media [Aarhus case;
  Warwick IM904]; hand coding from texts; identifier lists (STRING) [stringApp protocol]; packaged R datasets.
- **Formats.** CSV node and edge lists (dominant), `.xlsx`, GEXF, GDF [Warwick IM904], TSV, GraphML, Pajek `.net`
  [statnet ERGM tutorial], adjacency matrices [LASER case study; VisuAlgo SSSP], wide survey exports (4.3).
- **Sizes, by use.**
    - Algorithm exercises: 5-15 vertices, integer weights [Edexcel D1 2023].
    - Teaching labs: 34 to about 1,000 nodes (karate 34; Les Miserables 74; Quakers 119; class networks of about 27;
      Mapping Controversies calls 3,629 Wikipedia articles "a bit big for this tutorial" [Mapping
      Controversies 1.8]).
    - Projects: "N > 100" minimum at UT Dallas; biology lists of hundreds (541 proteins) [Jensen lab exercises].
    - Coding projects: 10^3 to 10^5 nodes and up to about 500,000 edges (SNAP ego-Facebook, Epinions) [SNAP
      ego-Facebook; SNAP Epinions]; Leiden's `huge.tsv` lives only on the lab server [Leiden SNACS].
    - Readability: node-link task performance "deteriorated ... as the size increased from 20 nodes to 50 nodes, and
      again between 50 nodes and 100 nodes" [Zoss et al., citing Ghoniem].
- **Attribute columns.** Few: label, a category (gender, party, protein family), dates, coordinates, edge weights, and
  computed columns (degree, modularity class, fitted values, fold change).
- **Identifiers and problems.** Source and Target must match node ids exactly; duplicated nodes after importing both
  files [Gephi issue 498]; labels with commas need straight double quotes ("The proper solution is to put node labels
  inside double quotes"; not "the curvy ones" from French keyboards) [seinecle CSV]; Excel saves `.xlsx` when CSV is
  needed [Brown guide]; survey names must be matched to a roster [Ross and Redhead]; Kumu duplicates elements when
  labels vary [Kumu import].
- **Properties.** Mostly undirected and unweighted in SNA labs; weighted and often directed in algorithm exercises;
  directed for survey nominations, hyperlinks and mentions; two-mode memberships needing projection [Grandjean;
  Ognyanova]; geographic [Grandjean]; time slices (Warwick). Reciprocal and parallel edges are import traps [Gephi
  issue 2216]; parallel edges are "not visualized or accessible from the user interface" in Gephi [Gephi desktop].
- **Graph theory research data (2.7).** One graph per line in graph6, sparse6 or digraph6, all printable ASCII
  [McKay formats]; planar code from plantri, which keeps the embedding [plantri guide]; House of Graphs downloads as
  "adjacency list, adjaceny matrix, graph6, and multicode" [House of Graphs 2.0]. Graphs are unlabeled, unweighted and
  without attributes; the attributes that matter are computed invariants. Sizes: usually under 30 vertices, but a file
  can hold millions of graphs (12,005,168 graphs on 10 vertices) [Jooken 2025].
- **Sensitivity.** Class surveys are personal data about minors (4.3); Kumu's free tier is public [Kumu pricing];
  AI rules limit what may be pasted into an assistant (4.8).

## 6. Analysis methods

- **Used most (SNA and coding).** Degree, betweenness, closeness, eigenvector, PageRank; modularity (Louvain in Gephi,
  greedy modularity in NetworkX); density; components; diameter and path length; clustering; degree distribution.
- **Algorithm courses.** BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal, topological order, route
  inspection, traveling salesman bounds, critical path, maximum flow, coloring, Euler and Hamilton paths [VisuAlgo
  SSSP; Graph Online; Edexcel D1 2023]. Here the process is the point, not the result.
- **Statistical courses.** QAP and network regression, ERGM with goodness-of-fit, latent space models, SAOM [Soc 8412;
  UW STAT 567; Duke Soc 229; GESIS 2023].
- **Biology.** MCL clustering, hubs, functional enrichment [stringApp protocol; Yale STRING].
- **How they interpret.** Mostly by the picture. Good courses push back: compare to random graphs [UTD ATCM 3385];
  "Clearly outlining what conclusions are and are not valid will help users in interpretation" [Zoss et al.];
  Venturini, Jacomy and Jensen warn that a picture's shape can come from the layout settings rather than the data
  [Venturini et al.].
- **Common beginner errors (evidenced).**
    1. Reading drawn distance as similarity; link width overrides it [Zoss et al., citing Fabrikant].
    2. Reading size as centrality ("the most central nodes in the network are the bigger ones" is the authors' example)
       [NotD].
    3. Strengths passed where distances are expected [NetworkX docs; graph-tool issue 294].
    4. Expecting determinism ("Your clusters will differ") [Mapping Controversies 1.8]; layouts change each plot until a
       seed is set [dshizuka tutorial].
    5. Disconnected graphs: diameter fails; density counts isolated pieces [Programming Historian].
    6. Lost direction or weights on import [Warwick IM904; Gephi issue 2216].
    7. Hairballs; the NotD authors use "hairballs or 'ridiculograms'" as a teaching tool [NotD].
    8. Treating a network as reality ("not fixed or objective representations of reality") [NotD].
    9. Running BFS or DFS where weights matter (VisuAlgo warns) [VisuAlgo SSSP]; a different but valid tie-break order
       from the mark scheme (inference from [Edexcel D1 2023; VisuAlgo DFS/BFS]).
- **Validation habits.** Weak in point-and-click work (a count check at import [Programming Historian]); algorithm
  learners check a hand trace (4.2); statistical students run goodness-of-fit [UW STAT 567].

## 7. Outputs and collaboration

- **Deliverables.** Images (PNG for slides, SVG or PDF for print); node tables; reports and slide decks (4.4); exam
  working (algorithms); papers with model tables (R); enrichment tables (biology); notebooks with documented AI prompts
  [OU CS 5483].
- **Grading.** Use of tools, insight, presentation [UTD ATCM 3385]; analysis weighted most [UMD INFM 289I]; marks for
  method shown [Edexcel D1 2023]; written quizzes on submitted code [Chung 2026].
- **Sharing.** LMS upload; GitHub (R courses, Gephi Lite Gists); public Kumu maps; Graph Online links.
- **Reproducibility.** Mostly absent in point-and-click work: no undo, non-deterministic layouts and modularity, Gephi
  files tied to versions. Graders ask for a methods account (UT Dallas: "Show an entry of the data source"), and AI
  policies now ask students to separate their own steps from generated ones [OU CS 5483; CMU policies].

## 8. Tools landscape and pain points

| Tool                  | Where used                           | Loved for                                                                                               | Fails on                                                                                                                                                  |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gephi desktop         | Most SNA and digital-methods courses | Free; ForceAtlas2; statistics write columns; SVG/PDF; "the Photoshop of network analysis" [Aarhus case] | Java history; "beta"; no undo; parallel edges hidden; measures unexplained; top-8 colors; handout rot [Gephi desktop; Gephi FAQ; Grinnell; Warwick IM904] |
| Gephi Lite            | Gephi's pick for beginners           | No install; GitHub Gists                                                                                | "lighter graphs"; images only; no dynamic graphs; no plugins; no CSV listed among formats [Gephi Lite differences; Gephi Lite formats]                    |
| VisuAlgo              | DSA courses (NUS and beyond)         | Step-by-step playback, code trace, quizzes, e-Lectures [VisuAlgo SSSP]                                  | Graph sizes for teaching only; no source found on classroom pain points                                                                                   |
| Graph Online          | Algorithm homework, discrete math    | Click-to-draw, weights, about 25 algorithms, undo, SVG and matrix export [Graph Online]                 | Final answer without intermediate steps for shortest path [Graph Online shortest path]                                                                    |
| Flourish              | DH courses; journalists              | Fast, embeddable                                                                                        | No centrality, filter or search; id equals label [Posner Flourish]                                                                                        |
| Kumu                  | Systems mapping                      | Web, spreadsheets                                                                                       | Strict headers; public free tier [Kumu import FAQ; Kumu pricing]                                                                                          |
| NetworkX / igraph     | Coding courses, MOOCs                | Reproducible; full metric set                                                                           | Weight-as-distance; seeds; "basic" drawing [NetworkX docs; NetworkX drawing; dshizuka tutorial]                                                           |
| statnet / ergm        | Graduate sociology and statistics    | ERGM, simulation, goodness of fit [statnet ERGM tutorial]                                               | Degeneracy; log-odds interpretation [Soc 8412]                                                                                                            |
| Cytoscape + stringApp | Biology workshops                    | Gene list to network, MCL, enrichment [stringApp protocol]                                              | Install of several apps; version-dependent menus [Jensen lab exercises]                                                                                   |
| nauty gtools, plantri | Graph theory research                | Exhaustive isomorph-free generation; piping into filters [Jooken 2025; plantri]                         | Text output only; graph6 and sparse6 drop the embedding [plantri guide]                                                                                   |
| SageMath graphs       | Graph theory research                | graph6 and sparse6 in and out; circular, planar (Schnyder), Tutte, tree layouts [Sage graph_plot]       | 20 graphs per array, saved one array at a time [Sage graph_list]; interactive view is a web-fetched d3 force layout [Sage graph_plot_js]                  |
| House of Graphs       | Graph theory research                | Is this graph known; 44 invariants; drawing tool with tikz export; citable ids [House of Graphs 2.0]    | Spring embedding to fine-tune by hand; planar embedder best for 3-connected graphs [House of Graphs draw]                                                 |

## 9. Requirements implied

Marked must-have (M) or should-have (S). "Not covered" means no existing persona, capability or workflow in
design/designloom addresses it (checked by searching the capabilities, personas and workflows there).

| #   | Requirement                                                                                                                                                                     | M/S | Evidence                                                                           | Coverage in design/designloom                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Works in a browser with no install, including hosted notebooks and school-managed laptops                                                                                       | M   | Java history; Gephi FAQ sends beginners to Lite; Colab courses                     | Implicit in graphty app; no workflow states it                                                                                                                                                                                        |
| 2   | Import report: counts versus file, unmatched ids, duplicates, merged parallel and reciprocal edges, columns read as text                                                        | M   | Gephi issues 498, 2216; Kumu FAQ; Hansen et al.                                    | `data-validation`, W18; no "counts match the source" check                                                                                                                                                                            |
| 3   | Undo/redo of every step, including hand edits                                                                                                                                   | M   | Gephi has none [Gephi FAQ]; Graph Online has Ctrl+Z                                | **Not covered**                                                                                                                                                                                                                       |
| 4   | Reproducible layout and communities: a seed, the same picture on reopen                                                                                                         | M   | "Your clusters will differ"; seeds in R and Python                                 | graphty-element offers a seed; no workflow requires it                                                                                                                                                                                |
| 5   | Plain-language note per metric: what it measures, what weight means, what it cannot tell                                                                                        | M   | Grinnell; NotD; Programming Historian; students ask assistants instead (4.8)       | Partly (`statistics-panel`, `guided-onboarding`)                                                                                                                                                                                      |
| 6   | Weight meaning (strength or distance) chooser, with the choice shown                                                                                                            | M   | NetworkX docs                                                                      | **Not covered**                                                                                                                                                                                                                       |
| 7   | Methods record: exportable steps, settings, versions, and which steps an assistant made                                                                                         | M   | UT Dallas; OU CS 5483; CMU policies                                                | `analysis-history`; disclosure export **not covered**                                                                                                                                                                                 |
| 8   | Bundled teaching datasets with a data card (karate, Les Miserables, Quakers, political books, Florentine families, example exam networks)                                       | M   | Every handout                                                                      | `sample-datasets` (W14); data cards **not covered**                                                                                                                                                                                   |
| 9   | Size by metric, color by community or attribute, top-N labels, legend, in under ten clicks                                                                                      | M   | Every lab                                                                          | Covered by visual-encoding and legend capabilities                                                                                                                                                                                    |
| 10  | SVG/PDF and high-resolution PNG that match the screen                                                                                                                           | M   | Grandjean; Takes; Gephi Lite lacks SVG/PDF                                         | `export-image`; "matches screen" not stated                                                                                                                                                                                           |
| 11  | Node table export with computed columns                                                                                                                                         | M   | Takes                                                                              | `data-export`                                                                                                                                                                                                                         |
| 12  | Giant-component and degree filters; disconnected-graph notes on diameter and paths                                                                                              | M   | Warwick; Programming Historian                                                     | `component-analysis`, `filtering`                                                                                                                                                                                                     |
| 13  | Create and edit nodes and edges by hand (add, connect, weight, direction, delete)                                                                                               | M   | Graph Online; VisuAlgo; Edinburgh; Kumu sketch mode                                | **Not covered**                                                                                                                                                                                                                       |
| 14  | Edge-weight labels drawn on edges                                                                                                                                               | M   | Exam figures; VisuAlgo; Graph Online                                               | Partly (edge labels in styling); not stated for weights                                                                                                                                                                               |
| 15  | Step-through playback of traversal, shortest-path, spanning-tree and flow algorithms with visited order, queue, distance and parent table                                       | M   | VisuAlgo; UCR CS10C; Edexcel                                                       | **Not covered**                                                                                                                                                                                                                       |
| 16  | Stated, settable tie-breaking (e.g. lowest label first) and an ordered list of chosen edges, so results match a hand trace                                                      | S   | VisuAlgo DFS rule; Edexcel "order in which you select the edges"                   | **Not covered**                                                                                                                                                                                                                       |
| 17  | Export of each step's state (image plus table) for homework                                                                                                                     | S   | Edexcel working; Graph Online image and matrix export                              | **Not covered**                                                                                                                                                                                                                       |
| 18  | Survey import: wide responses to a directed edge list, roster name matching, anonymized ids, reciprocity                                                                        | S   | Section 4.3                                                                        | **Not covered**                                                                                                                                                                                                                       |
| 19  | Typed round trip with R and Python (edge list plus attributes, Pajek, GraphML, GEXF); model output styled as a column                                                           | S   | Sections 4.5, 4.6                                                                  | graph-io reads these; typed round trip **not covered**                                                                                                                                                                                |
| 20  | graphty-element as a notebook display fed from NetworkX, igraph or a GEXF/GraphML string, at about 10^5 nodes and 5 x 10^5 edges                                                | S   | Colab courses; SNAP sizes; NetworkX "basic" drawing                                | **Not covered**                                                                                                                                                                                                                       |
| 21  | Random-graph baseline for whole-network measures                                                                                                                                | S   | UT Dallas "proper random reference"                                                | **Not covered**                                                                                                                                                                                                                       |
| 22  | Two-mode import and projection                                                                                                                                                  | S   | Grandjean; Ognyanova                                                               | **Not covered**                                                                                                                                                                                                                       |
| 23  | Matrix view alongside node-link                                                                                                                                                 | S   | UT Dallas; Zoss et al.                                                             | **Not covered**                                                                                                                                                                                                                       |
| 24  | Read-only share link for graders, private by default                                                                                                                            | S   | Kumu public tier; group projects                                                   | **Not covered**                                                                                                                                                                                                                       |
| 25  | Instructor kit: dataset, saved starting state and a step list that stays valid across versions                                                                                  | S   | Warwick handout rot; Aarhus                                                        | **Not covered**                                                                                                                                                                                                                       |
| 26  | Guided first analysis: help turn a question into a network question, accept a raw from-to table, then a tour of roles, subgroups and shape in words, with free exploration kept | S   | Hansen et al.; Bonsignore et al.; NetworkNarratives (4.10)                         | W14 covers community detection only                                                                                                                                                                                                   |
| 27  | Warnings when a picture invites a wrong reading (hairball, distance, size)                                                                                                      | S   | Zoss et al.; NotD; Venturini et al.                                                | **Not covered**                                                                                                                                                                                                                       |
| 28  | Identifier list to network through a public interaction database                                                                                                                | S   | stringApp; Pitt; Yale                                                              | Persona `genomics-cytoscape-user` exists; see systems-biology-omics-networks.md                                                                                                                                                       |
| 29  | Accessible, keyboard-operable workflow for required coursework                                                                                                                  | M   | Accommodation statements in syllabi                                                | Studio has keyboard and screen-reader personas; not tied to coursework                                                                                                                                                                |
| 30  | Import graph6, sparse6 and digraph6 files and pasted strings (one graph per line, many graphs per file), and plantri planar code with its embedding                             | M   | Jooken 2025; McKay formats; plantri guide; Sage, NetworkX, Mathematica read graph6 | **Not covered** (graph-io has no such format; `data-import` lists none of them; needs a new capability, see below)                                                                                                                    |
| 31  | Page through a collection of many small graphs, each drawn the same way, with invariants alongside, sorted and filtered by invariant                                            | M   | Sage `show_graphs` 20 per array; PHOEG; House of Graphs search                     | `graph-collection-browser` (planned) and `network-collection-small-multiples`                                                                                                                                                         |
| 32  | Exact, deterministic layouts: circular, shells, planar straight-line from a stored or computed embedding, Tutte, and a layout that shows the automorphisms                      | M   | Sage graph_plot layouts; House of Graphs planar embedder; plantri guide            | Circular: `layout-circular-chord`. Shell and planar (computed embedding) ship in graphty-element but no capability record names them; stored embedding, Tutte and symmetry layouts **not covered**; needs a new capability, see below |
| 33  | Exact invariants beside the drawing (order, size, degree sequence, girth, diameter, chromatic and independence number, automorphism group order, spectrum)                      | S   | House of Graphs 44 invariants                                                      | `basic-statistics` partly (order, size, degrees); algorithms has isomorphism search but no girth, chromatic or independence number; **not covered**                                                                                   |
| 34  | Hand adjustment of an automatic drawing kept with the graph, and TikZ export of the figure                                                                                      | S   | House of Graphs drawing tool exports tikz; TikZiT; Ipe                             | `manual-layout-preservation`; `journal-figure-export` covers vector figures but not TikZ; TikZ **not covered** (the SEM and causal-DAG personas also redraw in TikZ)                                                                  |

**Corrections to existing records.** W14 should add an import check against source counts, an explicit "who is
central / what groups" first analysis with plain-language explanations, undo, and a success criterion "the user can
state one valid and one invalid conclusion about the picture" (from Zoss et al.). explorer-elena should drop the
unsupported product-manager bio for a documented role (section 2.6) and add the hand-built table she arrives with,
her pre-network first question, her likely misreadings and her sharing constraint. New
records are needed for the algorithm learner (draw, step, check), the R statistical student (round trip, model output
as a column) and the class-survey workflow. The graph theory researcher (2.7) gets its own persona record
`graph-theory-researcher` and workflow W2030 (section 4.11): its data shape (many unlabeled graphs in graph6), its
steps (generate, filter, page through, check, draw) and its deliverable (an exact figure and a citable graph) match no
other persona. It is Tier B: medium size with no direct count, per-project use, and the graph view supports a proof
rather than being the main screen.

**Capability records the graph theory researcher still needs.** W2030 links to `data-import`, `layout-circular-chord`
and `journal-figure-export`, but none of them carries requirements 30 to 34, so the records alone would suggest the
workflow is supported when it is not. Four capability records are needed, each linked from W2030:

- **Small-graph code import** (requirement 30). A capability of its own rather than another entry in `data-import`'s
  format list, for two reasons. A graph6 or sparse6 file is a collection, one graph per line, and the tools that read
  it return a list of graphs [NetworkX read_graph6; Sage graph_list], while `data-import` loads one graph. Planar code
  is binary and carries a clockwise rotation system that no table format has [plantri guide]. The other specialized
  formats in design/designloom already have their own records (`gfa-sequence-graph-import`,
  `biological-network-formats`), and this follows them. It should report the number of graphs read and every line that
  failed to parse, accept a pasted string, and write graph6 back out for citation.
- **Exact small-graph layouts** (requirement 32): shells by degree or distance, planar straight-line from the stored
  embedding when there is one and from a computed one otherwise, Tutte's barycentric drawing for 3-connected planar
  graphs [Sage graph_plot], and a drawing that places an automorphism's orbits symmetrically. The shell and planar
  layouts graphty-element already ships should be named here.
- **Exact graph invariants** (requirement 33): girth, diameter, chromatic and independence number, automorphism group
  order and spectrum, exact rather than estimated, shown beside the drawing and usable to sort and filter a collection.
- **TikZ figure export** (requirement 34): the drawn positions, labels and highlighted structure as a TikZ picture, as
  House of Graphs exports [House of Graphs 2.0]; the SEM path-diagram and causal-DAG personas redraw in TikZ too.

## 10. Sources

- [Rutgers SCI 373] https://kateto.net/teach/SCI%20373%20Network%20Analysis%20Syllabus%20-%20Ognyanova%20-%202025.pdf
- [UGA POLS 4158e] https://spia.uga.edu/wp-content/uploads/2025/09/Glas-4158E-Thru-26.pdf
- [UTD ATCM 3385] https://dox.utdallas.edu/syl86627
- [UMD INFM 289I] https://www.cs.umd.edu/~golbeck/INFM289I/project.shtml
- [UMD exercise] https://www.cs.umd.edu/~golbeck/INFM289I/netExercise.shtml
- [SJSU CS 176] https://sjsu.edu/cs/docs/syllabi/fall25/Introduction_to_Social_Network_Analysis_CS_176_Fall_2025_Potika.pdf
- [NotD] https://reference-global.com/article/10.2478/connections-2026-0005?tab=article
- [UF Spatial Networks] https://geog.ufl.edu/2020/07/07/gis4113-gis6104-spatial-networks
- [UF Atlas Lab] https://jou.ufl.edu/?p=491844
- [Aarhus case] https://educate.au.dk/en/teaching-cases/hands-on-data-analysis-visualising-networks
- [Warwick IM904] https://warwick.ac.uk/fac/cross_fac/cim/people/academic-technology/im904/week4
- [Oslo SOS2920] https://www.sv.uio.no/iss/om/organisasjon/programradene/sosiologi/moter/2022/2022-12-10/sos2920_course-description-and-syllabus_s23.pdf
- [Grinnell] https://sarahjpurcell.sites.grinnell.edu/digital_methods/tutorials/network-analysis-iii/
- [Mapping Controversies 1.8] https://jacomyma.github.io/mapping-controversies/1.8
- [Leiden SNACS] https://liacs.leidenuniv.nl/~takesfw/SNACS/index.html
- [Takes Gephi tutorial] https://github.com/franktakes/gephi-tutorial
- [GT CS 7280] https://syllabus.gatech.edu/sites/default/files/2026-04/Syllabus%20for%20Network%20Science%20-%20CS-7280-O01%2C%20OAN_1.pdf
- [OU CS 5483] https://www.ou.edu/content/dam/coe/cs/course-syllabi/fall-2025/CS_5483_Radhakrishnan_Fa25.pdf
- [IU INFO I368] https://iu.instructure.com/courses/2252897/assignments/syllabus
- [Rochester ECE 442] https://www.hajim.rochester.edu/ece/sites/gmateos/ECE442/homework.html
- [Coursera UMich] https://www.coursera.org/learn/python-social-network-analysis
- [Coursera Stanford] https://www.coursera.org/learn/social-economic-networks
- [Zoss et al.] https://cns.iu.edu/docs/publications/2018-NetSci-Zoss.pdf
- [Sayama curriculum] https://ar5iv.arxiv.org/html/1707.09570
- ["Manchester Mitchell Centre"] https://www.humanities.manchester.ac.uk/research/centres-institutes/mitchell-centre/study/short-courses-and-learning-activities/
- [Digital Orientalist] https://digitalorientalist.com/2024/10/29/introducing-network-analysis-in-the-classroom/
- [Grandjean] https://martingrandjean.ch/gephi-introduction/
- [seinecle CSV] https://seinecle.github.io/gephi-tutorials/generated-html/importing-csv-data-in-gephi-en.html
- [UBC hands-on] https://ubc-library-rc.github.io/gephi-palladio/content/05_Gephi_hands_on_activity.html
- [Brown guide] https://libguides.brown.edu/gephi
- [Gephi FAQ] http://gephi.org/faq/
- [Gephi desktop] https://gephi.org/desktop/
- [Gephi Lite differences] http://docs.gephi.org/lite/user-manual/differences-with-gephi/
- [Gephi issue 498] https://github.com/gephi/gephi/issues/498
- [Gephi issue 2216] https://github.com/gephi/gephi/issues/2216
- [Arch bug 68457] https://bugs.archlinux.org/task/68457
- [TrustRadius Gephi] https://www.trustradius.com/reviews/gephi-2014-04-23-11-56-52
- [Programming Historian] https://programminghistorian.org/en/lessons/exploring-and-analyzing-network-data-with-python
- [NetworkX docs] https://networkx.org/documentation/networkx-2.8/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html
- [NetworkX drawing] https://networkx.org/documentation/stable/reference/drawing.html
- [graph-tool issue 294] https://git.skewed.de/count0/graph-tool/-/issues/294
- [dshizuka tutorial] https://dshizuka.github.io/networkanalysis/03_plots.html
- [UCI karate] https://networkdata.ics.uci.edu/netdata/html/zacharyKarate.html
- [SNAP ego-Facebook] https://snap.stanford.edu/data/ego-Facebook.html
- [SNAP Epinions] https://snap.stanford.edu/data/soc-Epinions1.html
- [Posner Flourish] https://miriamposner.com/classes/dh201w21/tutorials-guides/network-analysis/flourish-graph
- [Flourish help] https://helpcenter.flourish.studio/hc/en-us/articles/8761553784719-Network-graph-an-overview
- [Kumu import] https://docs.kumu.io/guides/import/import
- [Kumu import FAQ] https://docs.kumu.io/frequently-asked-questions/my-data-wont-import.-what-can-i-do
- [Kumu pricing] https://kumu.io/pricing
- [UCINET] https://sites.google.com/site/ucinetsoftware/home
- [NetworkNarratives] https://arxiv.org/abs/2303.06456
- [Venturini et al.] https://pdf.arxiv.org/pdf/1905.02202
- [Gephisto] https://publicdatalab.org/2022/05/11/make-a-deal-with-gephisto/
- [Ognyanova] https://kateto.net/network-visualization
- [VisuAlgo SSSP] https://visualgo.net/en/sssp
- [VisuAlgo DFS/BFS] https://visualgo.net/en/dfsbfs
- [Graph Online] https://graphonline.top/en/
- [Graph Online shortest path] https://graphonline.ru/en/wiki/Help/FindTheShortestPath
- [UCR CS10C] https://cs.ucr.edu/~tyf/10c/09.graphs/interactive-graphs.html
- [Edexcel D1 2023] https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-Further/Decision-1-AS/QP/June%202023%20QP.pdf
- [OSU COMM 7710] https://comm.osu.edu/sites/default/files/2025-01/SP25%20Comm%207710%20Syllabus%20Bond.pdf
- [Soc 8412] https://depts.washington.edu/zalmquist/syllabi/soc_8412_syl.pdf
- [Duke Soc 229] https://people.duke.edu/~jmoody77/s884/syllabus_11.pdf
- [UW STAT 567] https://sites.stat.washington.edu/people/handcock/567/syllabus.html
- [GESIS 2023] https://www.r-bloggers.com/2023/06/social-network-analysis-with-r-workshop-at-gesis/
- [statnet ERGM tutorial] https://statnet.org/workshop-ergm/ergm_tutorial.html
- [stringApp protocol] https://cytoscape.org/cytoscape-tutorials/protocols/stringApp/
- [Jensen lab exercises] https://jensenlab.org/training/stringapp/
- [Pitt Cytoscape] https://calendar.pitt.edu/event/gene-expression-and-network-visualization-using-cytoscape-su26
- [Yale STRING] https://ysph.yale.edu/event/functional-analysis-of-omics-data-part-3-protein-interaction-network-analysis-and-visualization/
- [Data-edu cookbook] https://data-edu.github.io/computational-social-science-cookbook/chapter-5.html
- [Ross and Redhead] https://pmc.ncbi.nlm.nih.gov/articles/PMC9046375/
- [Neal meta-analysis] https://www.cambridge.org/core/journals/network-science/article/methodological-moderators-of-average-outdegree-centrality-a-metaanalysis-of-child-and-adolescent-friendship-networks/87FDEDEC3CD2A48DC1E84B19925DABE6
- [Traxler et al.] https://ar5iv.arxiv.org/html/2004.06446
- [Saxena et al.] https://ar5iv.labs.arxiv.org/html/1909.05079
- [LASER case study] https://laser-institute.github.io/network-analysis/module-1/sna-1-case-study-key-python.html
- [CMU policies] https://www.cmu.edu/teaching/technology/aitools/academicintegrity/index.html
- [Chung 2026] https://arxiv.org/abs/2601.17024
- [Princeton survey] https://paw.princeton.edu/article/whats-foul-and-fair-when-students-use-ai
- [Black and Tomlinson] https://pmc.ncbi.nlm.nih.gov/articles/PMC11909101/
- [Hansen et al.] https://www.cs.umd.edu/users/ben/papers/DerekL.2012Do.pdf -- "Do You Know the Way to SNA?: A Process Model for Analyzing and Visualizing Social Media Data", 15 students, NodeXL
- [Bonsignore et al.] https://www.cs.umd.edu/~ben/papers/Bonsignore2009First.pdf -- "First Steps to NetViz Nirvana: Evaluating Social Network Analysis with NodeXL", SIN-09
- [Bradshaw] https://onlinejournalismblog.com/2020/06/08/a-journalists-introduction-to-network-analysis/
- [Kumu first steps] https://docs.kumu.io/getting-started/first-steps
- [Kumu systems practice] https://docs.kumu.io/disciplines/systems-practice
- [Carleton Flourish] https://hh2022f.amason.sites.carleton.edu/week-9-project-preparation/tutorial-network-analysis-with-flourish/index.html
- [Gephi Lite formats] https://docs.gephi.org/lite/user-manual/file-formats/
- [Pragmatic Works] https://pragmaticworks.com/blog/power-bi-custom-visuals-force-directed-graph
- [Studio persona] design/ui/studio/personas/class-project-student.md
- [House of Graphs 2012] https://ar5iv.arxiv.org/html/1204.3549 -- Brinkmann, Coolsaet, Goedgebeur, Melot, "House of
  Graphs: a database of interesting graphs"
- [House of Graphs 2.0] https://arxiv.org/html/2210.17253 -- Coolsaet, D'hondt, Goedgebeur, "House of Graphs 2.0: a
  database of interesting graphs and more" (2022; also https://arxiv.org/pdf/2210.17253)
- [House of Graphs draw] https://houseofgraphs.org/draw_graph (and FAQ https://houseofgraphs.org/help)
- [Jooken 2025] https://arxiv.org/html/2508.20825 -- "Computer-assisted graph theory: a survey" (also
  https://arxiv.org/pdf/2508.20825)
- [Wagner 2021] https://arxiv.org/abs/2104.14516 -- "Constructions in combinatorics via neural networks"
- [Graph repositories survey] https://arxiv.org/abs/2006.12741 -- Swain, Bonnington, Farr, Morgan, "A survey of
  repositories in graph theory" (2020)
- [zbMATH 05C counts] https://api.zbmath.org/v1/document/_search?search_string=cc%3A05C%20py%3A2024 (field
  `nr_total_results`; change `py` for other years; queried 2026-11-25)
- [nauty citations] https://iris.uniroma1.it/handle/11573/559745 -- McKay and Piperno, "Practical graph isomorphism,
  II", Scopus 1,063
- [McKay formats] https://users.cecs.anu.edu.au/~bdm/data/formats.txt
- [pickg manual] https://manpages.debian.org/testing/nauty/nauty-pickg.1
- [RIT homework] https://www.cs.rit.edu/~spr/COURSES/CCOMP/hm2.pdf
- [plantri] https://users.cecs.anu.edu.au/~bdm/plantri/
- [NetworkX read_graph6] https://networkx.org/documentation/stable/reference/readwrite/generated/networkx.readwrite.graph6.read_graph6.html
  -- "If the file contains multiple lines then a list of graphs is returned."
- [plantri guide] https://users.cecs.anu.edu.au/~bdm/plantri/plantri-guide.txt
- [Sage graph_list] https://doc.sagemath.org/html/en/reference/graphs/sage/graphs/graph_list.html
- [Sage graph_plot] https://doc.sagemath.org/html/en/reference/plotting/sage/graphs/graph_plot.html
- [Sage graph_plot_js] https://doc.sagemath.org/html/en/reference/graphs/sage/graphs/graph_plot_js.html
- [Wolfram Graph6] https://reference.wolfram.com/language/ref/format/Graph6.html
- [Ipe] https://ipe.otfried.org/
- [TikZiT] https://tikzit.github.io/
