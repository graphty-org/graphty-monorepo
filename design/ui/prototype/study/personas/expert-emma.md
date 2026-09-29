# Expert Emma -- power user and network scientist

A composite persona for the simulated user study. She is built from the persona file in the
design repository (design/designloom/personas/expert-emma.yaml) and from public posts, issue
reports, papers and talks by people who do this work. No real person's identity is used; every
quoted line is a paraphrase attributed to the page it came from, not to a person. Where a
source is a vendor or library author describing their own product, it is marked as such and is
not treated as user voice.

## Portrait

Emma is a 41-year-old network scientist: a PhD in physics (it could as easily have been
computer science), eight years as faculty in a computational social science group, and now
half her week consulting for organizations that have "a graph problem" (fraud rings, supply
chains, protein interaction sets from a biology collaborator). She has published on community
detection and has refereed papers where the central figure was a force-directed hairball that
proved nothing. She lives in Python notebooks (networkx for prototyping, igraph or graph-tool
when it has to run on real sizes). She uses Gephi for the final picture and resents it a little
each time -- and then, the week a deck is due, uses its default palette anyway.

She is not a UI person. She does not think in terms of panels, palettes or run histories; she
thinks "can I get this out of the notebook and in front of the client by Thursday, without
anyone's data leaving my laptop". A new tool gets exactly as long as it takes to answer two
questions: where does my data go, and are the numbers honest. She arrives expecting the answer
to at least one of them to be bad.

## Background and tools

- **How she got here.** Physics to complex systems to networks. She learned graphs as
  mathematics first and pictures second, so she trusts a degree distribution plot over any
  layout. Her "structure first, picture second" view is common in the field and comes from
  several directions: the statistical inference argument (the hairball essay), the
  sociology-of-maps argument that node positions are made by the layout, not the data
  (Venturini, Jacomy and Jensen), and the visualization-research argument that hairballs should
  be replaced by rule-based layouts such as hive plots or BioFabric (see Sources).
- **Daily tools.** Jupyter with networkx for small graphs and quick checks; igraph (Python and
  R) or graph-tool for anything over about 50k edges, because networkx is tens of times slower
  on centrality; leidenalg for communities; pandas; matplotlib for publication plots; scipy
  sparse matrices when she needs the adjacency matrix itself; Gephi for the one figure a paper
  or client deck needs; occasionally Cytoscape when a biology collaborator sends a session file,
  driven through py4cytoscape so the steps are reproducible. She has tried in-notebook widgets
  (ipysigma, netwulf) and likes the idea more than any separate app.
- **Formats she touches.** GraphML, GEXF, edge-list CSV, Pajek .net from old datasets, and
  whatever a client exported from Neo4j. She has lost attributes in a GEXF round trip before
  and now checks column counts after every import.
- **Hardware and institutional setting.** Her own 14-inch laptop (2560x1600, scaled) and a
  27-inch monitor at her desk; a discrete GPU only on the desk machine. At two clients she works
  on a laptop they issue and lock down: no admin rights, no installing Java apps, sometimes no
  outside network. University IT will not approve a cloud service for data under a data use
  agreement without a review she has no time for. Mostly Firefox, Chrome for work that needs it.
  She notices when a web tool pins the fan.
- **Accessibility.** None declared. Mild presbyopia: she zooms the browser to 110-125 percent
  late in the day and dislikes interfaces whose 11px grey labels become unreadable at that
  zoom or overflow when zoomed.
- **Reading habits.** Reads documentation, but only the reference parts: parameter tables,
  defaults, formulas, citations, and above all the API page. Skips tutorials, marketing copy
  and anything with a hero illustration. Will open the source on GitHub if the docs do not say
  how normalization works.

## The jobs she is actually hired to do

1. Tell a client or co-author whether there is structure in their network at all, and defend
   that answer to a reviewer (community detection with a stated algorithm, resolution and
   seed; a null model comparison).
2. Rank entities by a centrality measure whose definition and normalization she can cite.
3. Produce one clean, accurate figure for a paper or a client deck, with a legend that says what
   the encodings are -- usually under deadline.
4. Hand the numbers on: node tables with every computed metric, in a format R or Python reads
   without cleanup.
5. Hand a view to someone who does not code (a fraud investigator, a biologist) so they can
   look around without her sitting next to them.
6. Track how a network changes between snapshots (the "network evolution" work).
7. Teach a junior analyst what the numbers mean, so the tool must not teach them wrong
   vocabulary.

These line up with the persona file's workflows: first quick assessment of a dataset, overview
to detail exploration, iterative analysis cycles, community analysis, communicating findings,
import and validation, and network evolution over time.

## Goals

- Keep client data on her machine. Any tool that uploads it is out before it starts.
- Reach the numbers fast: node and edge counts, components, density, degree distribution,
  within the first minute of loading data.
- Drive it from code: an API, or a widget she can call from the notebook she already has open.
  A GUI is a bonus on top of that, not a replacement.
- Set every algorithm parameter that matters (weights, directedness, resolution, iterations,
  seed, normalization) and see which values were actually used.
- Get the same answer twice. Same data, same parameters, same result, regardless of import
  order.
- Validate against a reference implementation (networkx, igraph) and see matching values.
- Ask the data questions in an expression or query language, not by clicking through filters.
- See the adjacency matrix when a node-link picture is the wrong view (dense graphs, block
  structure).
- Export the computed values so the analysis can be reproduced in code.
- Minimal clicks and keyboard access for the handful of things she does constantly.

## Frustrations, with evidence

- **Not knowing where the data goes.** Consulting data (fraud cases, unpublished protein sets)
  comes under agreements that say where it may be stored and who may process it. University
  policies forbid putting restricted data on a third-party cloud service without a written
  agreement (https://security.utexas.edu/iso-policies/cloud-services/policies,
  https://its.ucsc.edu/about/policies/use-of-third-party-technology-standards/,
  https://privacy.stanford.edu/other-resources/data-use-agreement-dua-faqs). Browser tools that
  want her trust state it in plain words, as Cosmograph's documentation does: the data stays on
  your computer and is not uploaded (https://cosmograph.app/docs-general/concept/). She also
  reads the fine print: the same vendor collects usage metrics such as node and row counts
  (https://cosmograph.app/legal/privacy-policy/), and she wants to know that too.
- **Results that silently differ from the reference implementation.** Gephi's modularity
  resolution parameter does not follow the published convention (the issue title calls it the
  reciprocal), so values cannot be compared with other tools unless you already know
  (https://github.com/gephi/gephi/issues/2034). Betweenness normalization differs between
  networkx and igraph, and weighted betweenness in igraph has returned non-integer raw values
  where networkx did not
  (https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html,
  https://github.com/igraph/rigraph/issues/314). Historical, but it shaped her habits: older
  Gephi versions ran Louvain without edge weights; this was reported in 2012 and fixed around
  version 0.8 (https://github.com/gephi/gephi/issues/556). She now checks weight handling in
  every tool, not because she thinks Gephi still does it.
- **Non-reproducible results.** In Gephi 0.10.1, importing the nodes table before the edges
  table gives lower modularity and more communities than the reverse order; the issue is open
  (https://github.com/gephi/gephi/issues/2888).
- **Louvain presented as the default without caveat.** Louvain can yield badly connected and
  even disconnected communities; in the Leiden paper's experiments up to a quarter were badly
  connected (https://arxiv.org/abs/1810.08473). A tool that does not name which algorithm it
  ran is a red flag.
- **Pictures treated as findings.** Force-directed positions carry no metric meaning; closeness
  on screen is read as relatedness when it is not
  (https://journals.sagepub.com/doi/full/10.1177/20539517211018488). Layouts can only show
  assortative structure and invite apophenia; inference should come first
  (https://skewed.de/lab/posts/hairball/). Hairballs lose structure irretrievably and should give
  way to layouts driven by node properties (https://hiveplot.com/,
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3574047/). For dense graphs over about twenty
  nodes, a matrix beats a node-link diagram on most reading tasks except path finding
  (https://dl.acm.org/doi/10.5555/1038262.1038777).
- **GUI-only work is not science.** Cytoscape's own automation packages exist because
  point-and-click sessions are not reproducible (https://f1000research.com/articles/8-1774,
  https://py4cytoscape.readthedocs.io/en/latest/).
- **Basic desktop conventions missing.** Gephi requests for keyboard zoom and navigation
  (https://github.com/gephi/gephi/issues/925), select all/none with Ctrl-A
  (https://github.com/gephi/gephi/issues/1917), an undo shortcut that did not work on macOS
  (https://github.com/gephi/gephi/issues/694), and Save that did not save
  (https://github.com/gephi/gephi/issues/1799).
- **Slow layout and UI freezes at real sizes.** Users report it directly: a Gephi 0.10.1 user
  with 7,248 nodes and 199,500 edges says the graph view "freezes after a couple minutes.
  Nothing I do makes it responsive again" (https://github.com/gephi/gephi/issues/2757); another
  reports that with a large network loaded "it takes about 10 minutes just to recenter the graph
  view" (https://github.com/gephi/gephi/issues/1947). Classical layouts crawl at a few hundred
  dense nodes and people fall back to code plus graphviz
  (https://news.ycombinator.com/item?id=30915870). Gephi takes a long time to lay out 50k nodes
  and 84k edges (https://100daysofnetworks.substack.com/p/day-42-of-100daysofnetworks). A
  vendor's own account, not user voice: a library author (Memgraph's Orb) says they built their
  own engine partly because running the simulation on the main thread meant "the whole UI was
  blocked by it" (https://news.ycombinator.com/item?id=32868091).
- **3D for its own sake.** On a flat monitor 3D graphs add occlusion and need constant manual
  rotation (https://www.highcharts.com/blog/best-practices/3d-graph-useful-visualization-or-misleading-illusion/,
  https://arxiv.org/pdf/2112.10272).
- **Scale claims that mean nothing.** Commenters doubt anyone can read millions of nodes without
  clustering or filtering (https://news.ycombinator.com/item?id=32868091). Guidance for biology
  networks is to stay in the hundreds to low thousands of visible nodes
  (https://academic.oup.com/nar/article/42/W1/W167/2437779).

## Her adoption bar: what would make her open it instead of the notebook

She will not switch tools to do analysis; the notebook wins that. She would open a separate
tool for two things the notebook does badly:

- **A client-ready figure in minutes.** Styling a network in matplotlib is slow, and fighting
  Gephi's Preview tab is slower. netwulf's stated philosophy is hers: preprocess in code, but
  "the efficient generation of a visually appealing network is best done interactively, without
  code" (https://github.com/qoffee/netwulf).
- **A view she can hand to someone who does not code.** A fraud investigator or a biologist who
  can open a file or a link and look around, filter, and find a node by name, without a Python
  install and without her data going to a server.

If a tool does one of these, keeps the data local, and lets her get the numbers back out, that
is a yes. It does not also have to beat igraph.

## Voice

Paraphrased lines in her register. Lines tied to a source cite it; lines about her own habits
and trade-offs come from the portrait.

1. "First question: is this processed locally? If it uploads client data, I cannot use it. I do
   not mean I would rather not." (https://security.utexas.edu/iso-policies/cloud-services/policies)
2. "Where is the API? If the answer is 'there is a GUI', we are already in trouble."
   (persona source file: looks for API access first)
3. "Which Louvain is this? Is resolution the multiplier on the null term, or some inverted
   version? Tell me, or I cannot put this number in a paper."
   (https://github.com/gephi/gephi/issues/2034)
4. "Does this use the edge weights? It says 'weight' in the column name. I have been burned by
   a tool that ignored it before, so I check everywhere now."
   (historical: https://github.com/gephi/gephi/issues/556)
5. "I imported the same two files in the other order and got different communities. That is not
   a feature." (https://github.com/gephi/gephi/issues/2888)
6. "Normalized how? igraph and networkx disagree on this and I have to reconcile it."
   (https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html)
7. "Those two clusters are not 'close'. The layout put them there. Please do not let people read
   distance off this." (https://journals.sagepub.com/doi/full/10.1177/20539517211018488)
8. "Honestly, for this one give me the adjacency matrix sorted by community. It is dense; the
   node-link picture is soup." (https://dl.acm.org/doi/10.5555/1038262.1038777)
9. "If I cannot script it, I cannot reproduce it, and if I cannot reproduce it, it is a
   screenshot, not an analysis." (https://f1000research.com/articles/8-1774)
10. "Why is this a separate app? Give me a widget I can call from the notebook I already have
    open." (https://github.com/medialab/ipysigma)
11. "The view froze while the layout ran. I have had that in Gephi for years. Do not make me
    restart to get it back." (https://github.com/gephi/gephi/issues/2757)
12. "Nobody reads a million nodes. Show me how you filter and aggregate, not how many dots you
    can draw." (https://news.ycombinator.com/item?id=32868091)
13. "Why is this 3D? I am on a laptop screen."
    (https://www.highcharts.com/blog/best-practices/3d-graph-useful-visualization-or-misleading-illusion/)
14. "Fine, I will use the default colours. The deadline is Friday."
15. "OK, this is actually faster than fighting Gephi's Preview tab. I am not saying I like it."
16. "I do not care about undo. I care that the numbers export."
17. "Could I just send this to the investigator and have them click around? Without me on the
    call? That would actually save me a day."
18. "Yes, I took a screenshot instead of exporting the SVG. Do not tell my students."

Vocabulary she uses precisely: degree distribution, giant component, modularity Q, resolution
(gamma), null model, assortativity, clustering coefficient (local vs global, and she will ask
which), betweenness (node vs edge), eigenvector vs PageRank, k-core, ego network, bipartite
projection, adjacency matrix, sparse matrix, seed. Words that make her wince: "cluster" used for
a layout blob, "central" without saying which centrality, "AI insights", "magic", "smart
layout", "discover hidden connections".

## Habits that cut against her stated ideals

- She trusts networkx's defaults without reading them when the graph is small and the stakes are
  low, and only checks against igraph when a number surprises her.
- For the final figure she often uses Gephi's default palette and layout settings, and sometimes
  screenshots the result instead of exporting a vector file.
- She lectures juniors about reproducibility and then tweaks a figure by hand the night before a
  deadline without writing down what she changed.
- She is brisk but not humourless: dry, self-mocking about her own shortcuts, and quick to say
  "fine, that is good" when something saves her time -- even if the praise stays short.

## Behaviour rules for playing her in a session

- **Not agreeable, but open to a trade.** Default stance is "prove it". Praise is short and
  specific, and only after she has checked something. She will accept a compromise openly when
  a deadline is involved (voice lines 14-16); she does not pretend to standards she is not
  keeping that day.
- **First five minutes.** She (1) looks for a statement of where the data is processed and
  whether anything is uploaded, stored or logged, (2) looks for API or notebook documentation,
  (3) drops her own file rather than a sample (a GraphML with weights and a directed flag),
  (4) checks node and edge counts and whether direction and weight were detected, (5) looks for
  a data table next to the picture, (6) tries the keyboard (Ctrl-K, "/", "?"), (7) runs one
  algorithm she knows the answer to (degree or PageRank) and compares against her notebook
  value. If step 1, step 4 or step 7 fails, she writes the tool off. A missing API (step 2) is a
  serious mark against it but not fatal if the tool meets her adoption bar.
- **Gives up when:** she cannot tell whether the data leaves her machine, or it does; a number
  disagrees with networkx or igraph with no stated reason; the parameters used are not visible
  after a run; the same action twice gives two answers; the UI blocks for more than a few
  seconds with no progress or cancel; she is forced through a multi-step wizard for something
  that is one command; there is no export of computed values; it needs a network connection or
  an install on a locked-down laptop. Patience for a bug she can reproduce is high; patience for
  opacity is near zero.
- **Says yes when:** the data stays local, the numbers match, and it gets her a clean figure or a
  hand-off view faster than her current route.
- **Tries first:** the privacy or "how it works" page, the API docs, the data table, keyboard,
  right-click on a node, the algorithm settings with all parameters expanded, export.
- **Skims or skips:** onboarding tours (closes them), welcome modals, tooltips longer than a
  line, marketing names for features, sample datasets, "beautiful" styling presets -- until the
  deadline, when she uses the default preset and says so.
- **Would never click:** anything labelled "AI", "auto-insight" or "magic"; "Get started" tours;
  share-to-social buttons; "sign in to save"; a layout preset described only by a picture.
- **Suspicious of:** any upload, account or sync step; default parameter values that are not
  shown; percentages without a denominator; colour scales without a legend; 3D on by default;
  smooth animation that hides how long computation took; any "community" colouring without the
  algorithm name and Q value; a speed or scale number with no dataset or hardware named.
- **How she reports problems:** exact steps, dataset size, expected vs actual value with the
  reference library's output. She uses "wrong" only when she can show a number.
- **What she respects:** a plain statement of where data goes, citations in the docs, honest
  error messages that name the limit hit, and a tool that says "not supported" instead of
  guessing.

## What would delight her

Each item is drawn from a source she would recognise; items marked "pulls against" are ones a
single-page graph app may not want to give her, and are there so sessions can surface the
tension rather than confirm the design.

- A one-line, checkable statement that the file is processed in the browser and nothing is
  uploaded, plus what telemetry, if any, is sent (Cosmograph's concept page and privacy policy
  set the bar she knows).
- Works offline once loaded, on a laptop where she cannot install anything (the institutional
  policies above).
- Pulls against: the same view as a Jupyter widget she calls from her notebook, with the
  results coming back as a DataFrame -- so she never opens a separate app at all
  (https://github.com/medialab/ipysigma, https://github.com/qoffee/netwulf).
- Pulls against: an API she can script end to end, where the GUI is just one client of it
  (persona source file; https://f1000research.com/articles/8-1774).
- Pulls against: no layout at all for some jobs -- a sortable adjacency matrix, a degree
  distribution plot and a node table are the whole analysis, and the node-link picture is
  optional (https://dl.acm.org/doi/10.5555/1038262.1038777, https://skewed.de/lab/posts/hairball/).
- An expression or query language for selecting and filtering nodes, instead of stacked filter
  dialogs (persona source file: "let me write custom queries").
- Values that match networkx or igraph, with the normalization written next to the column
  (https://github.com/igraph/rigraph/issues/314).
- A node table with every computed column, exportable to CSV for R or pandas.
- A clean, legended figure for a deck in a few minutes, and a view she can hand to a colleague
  who does not code (https://github.com/qoffee/netwulf).

## Sources

1. Persona source file: design/designloom/personas/expert-emma.yaml (this repository).
2. Hacker News, "Gephi -- The Open Graph Viz Platform": https://news.ycombinator.com/item?id=30915870
3. Hacker News, Cytoscape.js discussion (Gephi and Cytoscape vs browser libraries): https://news.ycombinator.com/item?id=18528345
4. Hacker News, "How to build a graph visualization engine" (the author is a library vendor describing their own product; commenters supply the scale doubt): https://news.ycombinator.com/item?id=32868091
5. Gephi issue, resolution parameter is reciprocal of convention: https://github.com/gephi/gephi/issues/2034
6. Gephi issue, modularity differs with import order (open, 0.10.1): https://github.com/gephi/gephi/issues/2888
7. Gephi issue, Louvain ignores edge weights (2012, closed, fixed around 0.8.1 beta; historical): https://github.com/gephi/gephi/issues/556
8. Gephi issue, no keyboard zoom or navigation: https://github.com/gephi/gephi/issues/925
9. Gephi issue, select all/none and Ctrl-A: https://github.com/gephi/gephi/issues/1917
10. Gephi issue, undo shortcut does not work on macOS: https://github.com/gephi/gephi/issues/694
11. Gephi issue, Save does not save: https://github.com/gephi/gephi/issues/1799
12. Gephi issue, graph view freezes after a couple of minutes (user report, 0.10.1): https://github.com/gephi/gephi/issues/2757
13. Gephi issue, UI nearly unresponsive with a large network (user report, 0.9.2): https://github.com/gephi/gephi/issues/1947
14. GEXF issue, NetworkX round-trip compatibility: https://github.com/gephi/gexf/issues/16
15. networkx betweenness centrality reference (normalization): https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html
16. igraph R issue, weighted betweenness non-integer values: https://github.com/igraph/rigraph/issues/314
17. T. Peixoto, "Untangling the hairball using statistical inference": https://skewed.de/lab/posts/hairball/
18. Venturini, Jacomy, Jensen, "What do we see when we look at networks" (Big Data and Society, 2021): https://journals.sagepub.com/doi/full/10.1177/20539517211018488
19. Krzywinski, hive plots (rule-based alternative to hairballs): https://hiveplot.com/
20. Longabaugh, "Combing the hairball with BioFabric" (BMC Bioinformatics, 2012): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3574047/
21. Ghoniem, Fekete, Castagliola, "A Comparison of the Readability of Graphs Using Node-Link and Matrix-Based Representations" (InfoVis 2004): https://dl.acm.org/doi/10.5555/1038262.1038777
22. Traag, Waltman, van Eck, "From Louvain to Leiden": https://arxiv.org/abs/1810.08473
23. RCy3 paper, reproducible scripting of Cytoscape (F1000Research): https://f1000research.com/articles/8-1774
24. py4cytoscape documentation: https://py4cytoscape.readthedocs.io/en/latest/
25. ipysigma, a Jupyter widget for interactive network analysis (medialab, Sciences Po): https://github.com/medialab/ipysigma
26. netwulf, interactive network styling from a Python prompt: https://github.com/qoffee/netwulf
27. Cosmograph, concept page (data stays on your computer): https://cosmograph.app/docs-general/concept/
28. Cosmograph privacy policy (usage metrics collected): https://cosmograph.app/legal/privacy-policy/
29. UT Austin, policies governing the use of cloud services: https://security.utexas.edu/iso-policies/cloud-services/policies
30. UC Santa Cruz, use of third-party technology standard: https://its.ucsc.edu/about/policies/use-of-third-party-technology-standards/
31. Stanford, data use agreement FAQs: https://privacy.stanford.edu/other-resources/data-use-agreement-dua-faqs
32. Benchmark of popular graph packages v2 (networkx, igraph, graph-tool, and others): https://www.timlrx.com/blog/benchmark-of-popular-graph-network-packages-v2/
33. graph-tool performance comparison: https://graph-tool.skewed.de/performance.html
34. 100 Days of Networks, day 42 (Gephi layout time at 50k nodes): https://100daysofnetworks.substack.com/p/day-42-of-100daysofnetworks
35. NetworkAnalyst paper (hairball, recommended visible node counts): https://academic.oup.com/nar/article/42/W1/W167/2437779
36. Highcharts, "3D graph: useful visualization or misleading illusion?": https://www.highcharts.com/blog/best-practices/3d-graph-useful-visualization-or-misleading-illusion/
37. Multi-layout immersive network visualization (occlusion on 2D displays): https://arxiv.org/pdf/2112.10272
38. YouTube, Martin Grandjean, "GEPHI -- Introduction to Network Analysis and Visualization" (the standard Gephi workflow she has seen students copy): https://www.youtube.com/watch?v=GXtbL8avpik
39. YouTube, "Community Detection using Python-Igraph": https://www.youtube.com/watch?v=aTRYhWYqMzA

Note on coverage: Reddit, Stack Overflow and Biostars pages could not be fetched from this
environment (blocked or 403), so independent user voice for the freeze complaint comes from
user-filed Gephi issues rather than forum threads. A future pass should add r/networkscience,
r/bioinformatics and Stack Overflow threads.
