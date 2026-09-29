# Focus group: code-first users and access

Round 2 of the simulated user study. Four simulated participants reviewed the gallery (start
screen, the where-your-data-goes page, the drawing-limit screen, the export dialog, the table
preview, and the failure-and-recovery and keyboard-only storyboards) and discussed them over three
rounds: first impressions and purpose, trust and export (with the question "why not stay in a
notebook?"), then what would make each of them switch or quit.

Participants (all simulated, built from the graphty personas plus public forum and video
material):

- **expert-emma (Emma)** -- network scientist; works in networkx and igraph; referees papers.
- **ml-engineer-recsys (Chris)** -- recommender-systems engineer; data lives in Parquet on S3 and
  in notebooks.
- **knowledge-engineer (Min-ji)** -- builds RDF knowledge graphs with rdflib; checks every figure
  against SPARQL.
- **screen-reader-analyst (Morgan)** -- analyst who uses NVDA, a screen curtain and a braille
  display; checks colleagues' figures.

Caveat for everything below: these are simulated participants. Treat their statements as
hypotheses to test with real people, not as evidence of real behaviour.

Transcript notes: in the discussion some participants address Chris as "Wei" and Morgan as
"Priya". These are slips of the simulation, not other people; the speaker in each case is the
participant named above. Speaker labels that were doubled in the raw record have been collapsed to
one.

## Transcript

### Round 1 -- first impressions

**expert-emma:** Five seconds on the start screen and I get it. It's a local graph workbench, and the first sentence I read is "your files stay on this computer, uploads nothing." Good, that answers my first question. But "Connect to data source... sends only your query" is fine print I'd want in writing, not in a subtitle.

On the failure storyboard, the GPU branch is the most honest thing in the gallery. The run shows as Failed with its cause, and it never finishes on the CPU without telling me. Refusing an hours-long exact betweenness before it starts is right. Then it throws that away by offering 50 sources when my baseline used 100. A refusal should carry my settings forward, not reset them to the default.

The closeness frame says "Computed with NetworkX". Then show me the NetworkX call and version inline, not in a footnote.

The keyboard walk has nineteen steps with announcements, and it's honestly labeled a structural walkthrough. I respect that. I can't speak for Morgan's screen reader, and whoever uses one here should. For me, Shift+Arrow walking beats hunting with a mouse.

What I still haven't seen is how I drive any of this from the notebook I already have open.

**ml-engineer-recsys:** Purpose in five seconds: a desktop graph viewer that tells you what it computed and on which engine. Fair enough. But every storyboard runs on Les Miserables, 77 nodes. My graph is a few million user-item edges. Show me the frame where I load a 40M-row Parquet edge list and it tells me it won't draw it, then hands me an ego graph around one user.

The failure-and-recovery board is the best thing here. The branch where the GPU is lost and the run is canceled, with the result saying it ran on the CPU, is the first time I've seen a viewer admit which engine produced a number. Same for closeness showing "Wasserman-Faust corrected" in the column name. That's what I'd check against NetworkX, since its default is the corrected variant too.

The weight-read-backwards trap is real; I've shipped that bug. I just don't need a GUI to find it.

The keyboard-only board I skimmed. It's thorough, but that's someone else's fight.

What I'm missing: my own columns. I want to colour by model score and put Adamic-Adar beside it. I didn't see a bipartite user-item graph anywhere in these boards.

**knowledge-engineer:** Five-second purpose: "a desktop-style graph explorer for people who bring a file, run centrality, and have to defend the number afterwards." That part comes across clearly.

What I looked for first was the list of formats on the start screen: "Reads CSV, JSON, GraphML, GEXF, GML, DOT, Pajek and Neo4j exports." There is no Turtle, no JSON-LD and no N-Triples. Neo4j is on that list, which tells me the tool thinks a property graph and a knowledge graph are the same thing. They are not. So my first move today would be to write a converter, and I stopped writing converters for viewers years ago.

To be fair, the failure-and-recovery storyboard is the most honest thing I have seen in a graph tool. It admits a weight can be read backwards, and it offers Harmonic centrality when closeness is run on a graph that is in pieces. Most viewers would just hand me the wrong ranking. I also like that the keyboard storyboard says outright that it is "not a usability result." That is the right humility.

But every example is people on samples. Nobody here has a class and its instances. I want to know where `rdf:type` goes before I believe anything else.

**screen-reader-analyst:** Purpose: a graph viewer that says what's in the graph as text, not only as a picture. We'll see if that holds.

The keyboard storyboard is the first one of these I've read where the canvas says something useful when you arrive on it. "PALB2, neighbor 1 of 32 of TP53, weight 0.98" puts the important word first, and that's right. Then it keeps going with "Shift+Enter goes back, Esc ends the walk, Tab leaves..." At my speed I've skipped that by the second clause. Say it once, then never again.

Plain Down gives me "View moved." I have the screen curtain on, so a view means nothing to me. Every list I use goes down with Down, and here that key is spent on a camera I will never look at.

Pressing Esc twice clears my selection. I will press Esc twice by accident within the hour.

"Rank 247 of 300" goes to every node of degree 5. Rank 247 by what, and how are ties broken?

In the failure storyboard, Valjean's betweenness is 0.707. Is that normalised? NetworkX normalises by default. The screen doesn't say, so I don't believe the number yet.

Nobody has told me yet where my file goes when I load it.

### Round 2 -- trust, export, and why not stay in a notebook

**expert-emma:** Trust first. The export dialog writes a methods text file, and that's the right instinct. But I went looking for the scripting entry the moderator mentioned, and it isn't on the export form. Nothing in there emits the Python call. If the methods file said `nx.betweenness_centrality(G, k=100, normalized=True, seed=42)`, plus the version, I could rerun it and check. As prose it's just a claim. Morgan is right to ask whether 0.707 is normalised, and the answer belongs in the column header, the same way "Wasserman-Faust corrected" is.

Then the first release. It exports PNG only, with no graph data and no vector figure. So I can't get my results back out as a table I can join to my DataFrame. That's the round trip I actually do, and it's missing.

On the widget question: I don't want an app. I want graphty-element as a notebook widget that takes my `G` and hands back the same result object with its settings attached. Then the app is just the place I go when a client needs a picture.

I agree with the ml-engineer on scale, but for a different reason. Les Miserables proves nothing. I'd rather see one graph where the refusal is real.

On RDF, I'm with the knowledge-engineer that it's a gap. But I'd rather see a clean edge-list round trip first.

**ml-engineer-recsys:** Trust first. The closeness board passes my check: "WF-corrected" in the column header matches what NetworkX does by default. Screen-reader-analyst is right about betweenness 0.707, though. If normalisation isn't in the name, I'd assume it's wrong until I've diffed it myself.

Fit is where it breaks. The drawing-limit board is closer than I expected: 124k patents, no picture, stats and a table instead. But the way forward it offers is "the most connected patents", which is exactly the popularity bias I'm paid to fight. I want the neighbourhood around one user, a couple of hops out, not the top of the degree list. And 124k isn't 40M. What does the load step do with a 2 GB Parquet file? Does it even read Parquet?

Export is worse. The graph file says "for Gephi, Cytoscape or a script", but it's GraphML by default, and the whole data section waits on an unbuilt element capability. So the first release can't hand my features back with my original ids intact. That's the one thing I'd actually use.

Emma, same question as yours, just sharper. If graphty-element works as a widget in Jupyter, I'd use it tomorrow. As a separate app, it goes in the drawer.

Knowledge-engineer, your rdf:type complaint is my bipartite one: this tool thinks every node is the same kind of node.

**knowledge-engineer:** To Priya's question about where the file goes: the where-your-data-goes screen answers it, and I believe it more than I'd believe a subtitle. My legal team will still want that page in writing, same as Emma.

On trust: Emma and Morgan are right that "Computed with NetworkX" needs the version and the normalisation next to the number. I would add the input. On my data the answer depends on the graph that went in. Did literals become nodes? Were `rdf:type` triples dropped, or counted as edges? If a type counts as an edge, every class turns into a hub and the betweenness ranking just gives me my ontology back. A result has to say which predicates it kept.

Export has the same gap. The export dialog makes figures, a PNG for a manuscript. I need my merges and edits back as triples or a change list. Otherwise the viewer becomes a second source of truth, and I delete it.

Why not a notebook? Because that is where I already am, with rdflib. I would put graphty-element inside it as a widget. I would not open the app. Wei, a bipartite user-item graph and a class-instance graph are the same problem, two kinds of node. Neither is on these boards.

**screen-reader-analyst:** Someone answered my file question. The "where your data goes" page says files are read in the browser, nothing is uploaded, and only two features send anything, both off until you turn them on. That page is written so I can forward it to our IT reviewers, and that matters more to me than any keyboard shortcut. "Open developer tools and watch the Network tab" is a check for sighted people, though. Put the list of addresses in plain text that I can hand over.

How I'd actually use this: export the nodes table and open it in Excel. The table preview says each column header carries its method and whether it's current. Good. But it has to say "normalised" or "raw" in that header, or I'm back to the argument I had with a colleague over a figure.

Emma is right about the NetworkX call. Give me the call itself as text I can copy, with its settings and the seed. For Louvain, a seed I can't fix makes the result a rumour.

To ml-engineer: the keyboard walk isn't only my fight. It's the only way anyone here reads a neighbour list as a list.

What's missing: a table view of the graph where Down goes to the next row.

### Round 3 -- what would make you switch, or quit

**expert-emma:** I'd switch for one thing: graphty-element running as a widget inside my notebook. I give it my `G`, and it gives back a result I can put in a DataFrame. That result has to carry the call, the version, the seed and whether the numbers are normalised. If the only way in is a separate app that exports a PNG, I quit, and Gephi stays in my drawer for deck week.

The one thing I'd change is the methods file on the export form. Make it runnable instead of prose, like `nx.betweenness_centrality(G, k=100, normalized=True, seed=42)`, networkx 3.x. With that I can check any number in a minute. It's the same text Morgan wants to copy, and it's one artifact that serves both of us.

Wei, I agree the "most connected" way forward is a bias. My own fix is smaller, though. When the tool refuses a run, it should keep my settings. Don't reset my 100 sources to 50.

To the knowledge-engineer: yes, a result should say which predicates it kept. That's the same honesty as saying which variant it used.

Morgan's table view with Down to the next row would also be how I check results without leaving the keyboard. Build that before RDF.

**ml-engineer-recsys (Chris):** I quit. Or rather, I never switch, because there is nothing to switch from. My notebook already does the job; this would be an add-on to it. What would get it installed is graphty-element running as a Jupyter widget. I'd hand it a PyG or NetworkX graph and pick one user id. It would draw that user's two-hop neighbourhood, colour it by my model score column, and give me back a DataFrame keyed on my original ids. If that takes under ten minutes on real data, it stays.

The one thing to change is the way forward when the graph is too big to draw. Right now it's "most connected first", and that has to become "around this node". I agree with Emma: a refusal is only useful if it keeps my settings and gives me somewhere sensible to go next. The top of the degree list is where recommenders go to die.

To the knowledge-engineer: yes, node types first. Bipartite and class-instance graphs are the same missing feature.

To Morgan: fair point. I'll take the keyboard walk back, because a neighbour list read as a list is exactly how I'd debug one bad recommendation.

What you didn't ask: can I load precomputed embeddings and lay the graph out from them instead of running a force layout?

**knowledge-engineer:** What would make me switch is an import step that understands RDF. I would load Turtle and see that `rdf:type` became a node's class and not an edge. Literals should become properties. Before anything runs, I want a class-level overview, with instance counts per class and the predicates between classes, the way SemSpect does it. After that, every result should name the predicates it kept. If that is there, I would open this on a Tuesday.

What makes me quit is the start screen as it is today. Neo4j is on the format list and RDF is not, and the only export is a PNG. My edits and merges have to come back as a change list or as triples. If they don't, this becomes a second copy of the graph that nobody governs, and I will not allow that.

Emma, I agree about the edge-list round trip. But an edge list throws away node kinds, and that is the part Wei and I are both asking for. Morgan's table view where Down goes to the next row would also help me: one row per class, then open that class up.

The one thing to change: give every node a kind, and let import, layout and colour all respect it.

**screen-reader-analyst:** What would make me switch is one thing. I export a nodes table and every number in it says how it was computed, in the column header and in text I can copy: "betweenness, normalised, k=100, seed 42, NetworkX 3.4". If it does that, I'd stop asking a sighted colleague what the picture shows, and that is the whole prize for me. Emma and Wei want the Python call so they can rerun it. I want the same thing so I can read it in braille without trusting anyone.

What makes me quit is a canvas I can only walk one neighbour at a time, where Down moves a camera. I need a grid of the graph with rows for nodes and edges. Down goes to the next row. Enter opens that node's neighbours as another grid. It would be sortable, with ties broken by a rule it tells me.

Knowledge-engineer, your "which predicates did it keep" and my "normalised or raw" are the same demand. A number has to carry its inputs, or it's a rumour.

One change: build that table first and treat the canvas as its illustration, not the other way round.

## Summary of themes

Severity uses Nielsen's 0-4 scale (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe).
"Independent" means the participant raised it in round 1 before hearing the others; "adopted"
means they took it up after someone else raised it. Where a claim could be checked against the
mocks, the check is given.

### 1. A number does not carry its full definition where the number is read (severity 3)

- **Who:** Morgan (independent, round 1: "Valjean's betweenness is 0.707. Is that normalised?";
  "Rank 247 of 300 ... how are ties broken?"); Emma (independent, round 1: show the NetworkX call
  and version inline); Chris (adopted, round 2: "assume it's wrong until I've diffed it"); Min-ji
  (adopted in round 2 and extended it: the result must also say which input it ran on -- which
  predicates were kept, whether literals became nodes, whether `rdf:type` counted as an edge).
- **What participants asked for:** normalised-or-raw in the column header, the way
  "WF-corrected" already is; the call, library version and seed as copyable text (Emma and Chris
  to rerun it, Morgan to read it in braille); the tie rule on any rank.
- **Check against the mocks:** the results panel's run record does state normalization
  ("Divided by (n-1)(n-2)/2 ...") and the seed, behind Details. The failure-and-recovery frame
  that shows 0.707 and the table column header do not. So this is mostly a placement finding --
  the fact exists one click away from where the reader forms their belief -- plus a real gap on
  the library version and a runnable call.
- **Recurrence:** the round-1 code-first group rated the same need severity 3. It came back
  unprompted, from two participants in round 1, which means the fix has not yet reached the
  surfaces these participants read first.
- **Dissent:** only on form. Emma wants Python syntax; Morgan wants a plain-words string
  ("betweenness, normalised, k=100, seed 42, NetworkX 3.4"). Both said one artifact could serve
  both.
- **Discount:** low. Raised independently by two, with specific numbers from the mocks.

### 2. The way in they want is graphty-element in a notebook, not the app (severity 3 for this segment; a scope finding, not a screen defect)

- **Who:** Emma (independent, round 1: "how I drive any of this from the notebook I already have
  open"; round 2-3: a widget that takes `G` and returns a result object with its settings);
  Chris (round 2, building on Emma: "a widget in Jupyter, I'd use it tomorrow. As a separate app,
  it goes in the drawer"; round 3: PyG or NetworkX in, two-hop neighbourhood out, DataFrame back on
  original ids, under ten minutes); Min-ji (round 2, adopted: "I would put graphty-element inside
  it as a widget. I would not open the app").
- **Dissent:** Morgan did not ask for a notebook at all; her route is the exported nodes table in
  Excel. Emma kept a role for the app ("the place I go when a client needs a picture").
- **Why it matters for the design:** per the project's architecture, this is a request about
  graphty-element's API (a result object that carries its definition, readable outside the app),
  not about the app. It should be recorded as a proposal, not decided here, because a widget and
  a result-object shape are public contracts.
- **Discount:** moderate. Only Emma raised it before any prompting; the round-2 question "why not
  stay in a notebook?" and the moderator's mention of a scripting entry invited the other two to
  agree. All four participants are code- or data-first by recruitment, so the finding says
  nothing about the explorer or presenter personas.

### 3. Participants believe results cannot come back out as data (severity 3; partly a comprehension finding)

- **Who:** Emma (round 2: "exports PNG only ... I can't get my results back out as a table I can
  join to my DataFrame"); Chris (round 2: "the first release can't hand my features back with my
  original ids intact"); Min-ji (rounds 2-3: edits and merges must come back as triples or a
  change list, or the viewer becomes an ungoverned second copy); Morgan (round 2: exports the
  nodes table to Excel -- she found the route the others missed).
- **Check against the mocks:** the export dialog's first-release state omits the graph-data
  section and the findings report and limits figures to PNG. But the table preview offers "Export
  table as CSV...", which writes every row with the original ids and the method headers, and the
  export dialog lists a Tables section. Three of four participants read "first release: PNG only"
  as "the only export is a PNG".
- **So there are two findings here:**
  - A real gap: no graph-data file and no change list in the first release (Min-ji's edits-back
    need is not met at all; severity 3 for her).
  - A comprehension gap: the table route with original ids exists but is not where these readers
    looked, and the first-release annotation reads as broader than it is (severity 3, because it
    made two participants conclude the tool fails their core round trip).
- **Dissent:** none on the need. Emma ranked a clean edge-list round trip above RDF; Min-ji
  answered that an edge list loses node kinds (see theme 5).
- **Discount:** low on the need; the "PNG only" belief is partly a mock-fidelity effect of
  reviewing annotated states rather than using the dialog, and should be retested with a
  clickable export.

### 4. Too big to draw: the offered way forward is "most connected", and real scale is unproven (severity 3 for Chris, 2 generally)

- **Who:** Chris (independent, round 1: "hands me an ego graph around one user"; rounds 2-3:
  "most connected" is popularity bias, "has to become around this node"); Emma (round 1-2: Les
  Miserables at 77 nodes "proves nothing"; show one graph where the refusal is real; agreed in
  round 3 that "most connected" is a bias).
- **Check against the mocks:** the drawing-limit screen does offer a route by attribute filter
  and, "for a reader who knows no attribute to filter on", a sample of the most connected patents.
  There is no "around this node" route. Chris praised the rest of the screen ("closer than I
  expected: no picture, stats and a table instead").
- **Open question neither mock answers:** what the load step does with a 2 GB Parquet file, and
  whether Parquet is read at all.
- **Dissent:** Emma agreed on the bias but ranked it below keeping settings (theme 6).
- **Discount:** low on validity for the recommender and fraud cases; moderate on breadth (one
  owner). The storyboards all running on small graphs is a fidelity choice that weakens every
  scale-related judgement in this group.

### 5. Every node is the same kind of node (severity 3 for knowledge-graph and bipartite users, 2 generally)

- **Who:** Min-ji (independent, round 1: no Turtle, JSON-LD or N-Triples on the start screen;
  "where does `rdf:type` go?"; round 3: import that makes `rdf:type` a class and literals
  properties, then a class-level overview with instance counts and predicates between classes);
  Chris (independent, round 1: "I didn't see a bipartite user-item graph"; round 2 joined it to
  Min-ji's point: "this tool thinks every node is the same kind of node").
- **Agreement:** Min-ji and Chris explicitly converged in rounds 2-3 on "give every node a kind,
  and let import, layout and colour respect it." Emma called RDF a gap.
- **Dissent:** Emma on priority ("a clean edge-list round trip first"; "build [the table view]
  before RDF"). Min-ji rebutted that an edge list throws away node kinds.
- **Secondary point, one voice:** listing Neo4j beside the file formats without RDF signalled to
  Min-ji that the tool conflates property graphs and knowledge graphs -- a first-screen trust cost
  independent of whether RDF is ever supported.
- **Discount:** low on the shared "node kinds" need (two independent origins, two different
  domains); high on the specific SemSpect-style class overview, which only Min-ji asked for.

### 6. A refusal resets the settings it refused (severity 2)

- **Who:** Emma (independent, round 1; repeated round 3: "Don't reset my 100 sources to 50");
  Chris (adopted, round 3: "a refusal is only useful if it keeps my settings").
- **Check against the mocks:** the failure-and-recovery storyboard itself narrates this ("Her own
  baseline for this graph used 100 sources, and the refusal offered only the default size").
- **Discount:** moderate. The storyboard depicts the frustration, so participants may be reading
  it back rather than discovering it. The design fix is still cheap and unambiguous: the ways
  forward should start from the reader's own settings.

### 7. The canvas is not a list; a keyboard reader needs a grid of the graph (severity 3 for screen-reader users)

- **Who:** Morgan (independent, rounds 1-3): plain Down is spent on "View moved", which means
  nothing behind a screen curtain; the walk hint repeats on every arrival ("say it once, then never
  again"); Esc twice clears the selection and will be hit by accident; she wants a grid with rows
  for nodes and edges, Down to the next row, Enter to open a node's neighbours as another grid,
  sortable with a stated tie rule. Adopted in round 3 by Emma ("how I'd check results without
  leaving the keyboard"), Chris ("how I'd debug one bad recommendation", reversing his round-1
  "someone else's fight") and Min-ji ("one row per class, then open that class up").
- **What already works:** the arrival announcement puts the node name first ("PALB2, neighbor 1 of
  32 of TP53, weight 0.98"), and the storyboard's honest labelling as a structural walkthrough
  was praised by Emma and Min-ji.
- **Separate severities inside the theme:** Down moving the camera, 3; repeated instructions, 2;
  Esc twice clearing selection, 2 (data loss if selection is not undoable).
- **Discount:** moderate on the others' support (late and partly reciprocal; see below); low on
  Morgan's specific points, which are direct readings of the storyboard's announcement text.
  Everything about what a screen reader actually speaks must be confirmed with real NVDA and JAWS
  users.

### 8. The where-your-data-goes page works; two refinements (severity 2)

- **Who:** Morgan (round 2: forwardable to IT reviewers, "matters more to me than any keyboard
  shortcut"); Min-ji (round 2: believes it more than a subtitle); Emma (round 1: wanted the
  "sends only your query" claim in writing, which this page is).
- **Refinements:** the verification step "open developer tools and watch the Network tab" only
  works for sighted readers -- publish the list of addresses as plain text (Morgan); legal teams
  want it as a document they can file (Emma, Min-ji).
- **Dissent:** none.

### 9. What earned unprompted praise

- The failure-and-recovery storyboard: all four independently in round 1 called it the most honest
  thing in the gallery (the run marked Failed with its cause, no silent finish on the CPU, the
  engine named, Harmonic offered on a disconnected graph, the weight-read-backwards warning).
- "WF-corrected" / "Wasserman-Faust corrected" in the column header (Chris, Emma) -- the pattern
  participants want extended to normalization in theme 1.
- The drawing-limit screen's stats-and-table-instead-of-picture state (Chris).

### Single-voice requests, unweighted

- Colour by the reader's own model-score column with Adamic-Adar beside it (Chris, round 1).
- Lay the graph out from precomputed embeddings instead of a force layout (Chris, round 3,
  unprompted).
- A fixable seed for Louvain, since "a seed I can't fix makes the result a rumour" (Morgan).
- PyG as an input type (Chris).
- SemSpect-style class overview before any run (Min-ji).

## Group-think effects to discount

- **Convergence on one slogan.** By round 3 Morgan framed themes 1 and 5 as one demand -- "a
  number has to carry its inputs" -- and Emma and Min-ji had already folded "which predicates"
  and "which variant" into the same sentence. The needs are real and were raised independently,
  but they are different controls (a header label, a run record, an import report). Do not design
  them as one feature because the group named them as one.
- **Primed widget chorus.** Only Emma raised the notebook unprompted. The round-2 question and the
  moderator's reference to a scripting entry invited agreement, and Chris and Min-ji each prefaced
  theirs with "same as Emma". Count theme 2 as one strong voice with two supporters from the same
  segment.
- **Reciprocal concession on the keyboard grid.** Chris reversed "someone else's fight" after
  Morgan addressed him directly, and all three sighted participants then found a personal use for
  the grid. Some of that is social smoothing; Morgan's case stands without it.
- **Priority bargaining.** Emma ("table before RDF", "edge list first"), Min-ji ("node kinds
  first") and Chris ("around this node" first) each ranked their own need above the others'. The
  rankings reflect who is speaking, not the product's audience.
- **Echoing the storyboard's own narration.** The 100-to-50 source reset (theme 6) is written into
  the storyboard; participants may be repeating the author's point rather than discovering it.
- **Segment skew.** All four are code- or data-first experts, and two (Chris, Min-ji) say they
  would never open the app. Their consensus says little about the explorer, presenter or analyst
  personas the app is built for.
- **Simulation effects.** Participants misnamed each other ("Wei", "Priya"), a sign the simulation
  is blending persona sources. Findings about real assistive-technology behaviour (theme 7) and
  about real legal or IT review (theme 8) need real people.
- **Mock fidelity.** The belief that the only export is a PNG (theme 3) and that the scripting
  entry is "not there" came from reading annotated static states, not from using the dialog.
  Retest with a clickable export before treating them as design defects; the missing graph-data
  file and change list are design state, not fidelity, and stand as findings.
