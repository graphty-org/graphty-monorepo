# Focus group: code-first users and access

Four simulated participants, three written rounds. Round 1 was a solo first look (five-second
purpose, then the storyboards). Round 2 asked about trust, fit and where the data goes, and let
participants answer each other. Round 3 asked what would make each of them switch or quit, and the
one thing they would change.

| Participant | Who they are |
|---|---|
| Emma | Research network scientist; NetworkX and Gephi; publishes |
| Chris | ML engineer, recommendation systems; Parquet, 40-million-row user-item edge lists, notebooks |
| Min-ji | Knowledge engineer; RDF property graphs, Turtle, SPARQL, rdflib; answers to a governance board |
| Morgan | Blind analyst; NVDA screen reader, keyboard only |

Material on the table: the gallery, the failure-and-recovery storyboard (GPU lost, sampled
betweenness refusal, closeness vs harmonic), the keyboard-only storyboard, the Nodes table and
Statistics panel on the Les Miserables sample, the Export dialog, and the "Where your data goes"
page.

## Transcript

### Round 1

**Emma:** 5-second look: a point-and-click analysis app with a lot of care put into how it fails. I wrote "Gephi, but it admits when it's wrong." I didn't see two things in the first five seconds: where my data goes, and whether there is an API. Those are my two questions, and the front door answers neither.

The GPU-lost branch is the best thing here. It never finishes a run on the CPU without telling me, and the old damping value stays labelled. That is exactly the honesty I want. But the refusal screen offers 101 sources when my baseline is 500. Why doesn't it remember my baseline? The frame says "sampled: a few minutes" while the storyboard text says under a minute, so which is it? And where is the seed? A sampled betweenness without a seed is not reproducible, and I can't put it in a paper.

The Statistics panel reads "Components: not computed" on a graph that is already loaded. That's the first number I want in the first minute, and it takes one BFS.

The keyboard walk is thorough, but it was written for a screen-reader user. The keys I actually use are find-by-name and Ctrl+A, and I only half trust them after the select-all branch.

**Chris:** My 5-second read is "a Figma-style workbench for running centrality on a graph you've loaded." That's clear enough. But every storyboard starts from a sample: Les Mis, patents, proteins. None of them starts where I would, by dragging in a 40-million-row user-item edge list. If import doesn't hold up, the rest doesn't matter to me.

Two things I liked. The GPU-lost frame names the error code and the run that's still on screen, and it doesn't quietly finish on the CPU. And "124,318 nodes not drawn, narrow the graph" is the right answer to the hairball.

Now the trust problem. The closeness column reads "WF-corrected" and tops out at 1.624 for Valjean. NetworkX's closeness_centrality uses that same correction by default and returns values between 0 and 1. For Valjean I'd expect something around 0.64. So either this is a different quantity with the same name, or the mock is wrong. In both cases I stop trusting the table. And in the failure frame the damping box says 0.5 while the line under it says the values shown used 0.85. I only understood that on a second look.

The keyboard storyboard reads as careful work. I'll let Morgan's stand-in judge it.

**Min-ji:** My written purpose after five seconds on the gallery: "a browser workbench for running network measures on a property graph, careful about what the numbers mean." That second half is to its credit. Frame A1 of the failure storyboard asks what a higher value on an edge means before anything runs, and the result row then shows how that value was read. Most tools never ask, and Gephi certainly did not. A result that names its formula, like closeness versus harmonic in branch B, is what I would want to put in front of a governance board.

My problem is that none of the storyboards, flows or screens I opened mentions Turtle, JSON-LD, SPARQL or the word "predicate." Every example is Les Miserables, proteins or card transfers. I opened the start screen looking for my import path and the samples lead. So I have already marked it "not for RDF." I would flatten my data to a subject-predicate-object CSV and lose the datatypes and language tags, and I would be the one explaining that loss.

The keyboard storyboard is honest. It says it is not a usability result, which is more than most vendors admit. I will keep reading it, but on a 40-million-triple graph I need a class-level summary first, and I did not see one.

**Morgan:** Five-second look, done my way: I listened to the page title, then pressed H. The gallery has real headings: storyboards, flows, screens, study. Good. My guess at the purpose is "a graph tool that wants to be driven from the keyboard". I'm not saying "for me" yet.

On the keyboard-only storyboard: it opens with "Graph drawing, application", then says 33 of 300 nodes, what's selected, and which keys walk. That's the right order, and a first for any tool I've tried. Then I press Down out of habit and it says "View moved". I have no view. If plain arrows pan a camera I can't see, that's a wasted key. Those arrows are wasted on me.

What I do like: "Back to RPA2, neighbor 4 of 32 of TP53". It tells me where I am and how to get back. And the second Esc tells me the undo key in the same breath.

The failure-and-recovery storyboard is cropped pictures with no text alternative. A blind analyst is nowhere in its five branches. So I don't yet know if "out of date" ever reaches my ears.

### Round 2

**Emma:** On trust, Chris, I don't think the 1.624 is wrong. It's weighted. The closeness frame reads each tie's length as 1/value, and every pair who share two or more scenes ends up closer than 1, so the scores go past 1. NetworkX gives the same thing if you pass distance='length'. But a stranger shouldn't have to reverse-engineer that, and I only got it from the small print. The header has to say "weighted, length = 1/value" and not just "WF-corrected." That's the confusion that sinks a paper in review.

The methods file next to every CSV is good: it records the seed, the element version, the rank bounds. So why is none of that on the result row where I actually look?

On fit: the export dialog says scripting "is not yet available" and deliberately draws no button for it. That's honest, but for me it's the whole question. I don't want an app, I want graphty-element as a cell in my notebook. The data page's line "no server that receives your data" answers my first question well. It should be on the gallery's front door.

Morgan's right that the failure storyboard should have text. I'd add that my own keys, find-by-name, still aren't in it.

**Chris:** Emma asked "is there an API?" I went looking. The export dialog gives me "Export table as CSV...". That's it. It has no Parquet and no code snippet. I also saw nothing that promises my original user_ids come back unchanged instead of being re-keyed. So the loop fails in the one direction I need. I can't get a filtered subgraph or computed features back into the pipeline without hand-cleaning a CSV.

On the notebook: I don't want graphty-element as an app. I want it as a widget in a cell. I'd pass it a Parquet path or a DataFrame, pick one user's two-hop neighbourhood, and colour it by my model score. That's my "why did it recommend baby formula" view. None of the storyboards is a two-hop explain-this-pair view, and none puts Adamic-Adar next to my own score on the same edges.

I'm with Emma on the seed. I'd add a version number. And my closeness question still stands: 1.624 isn't a NetworkX number.

The knowledge engineer's point is the same as mine. Every storyboard starts from a demo dataset. Nothing starts from a customer's real file.

**Min-ji:** On trust, the "Where your data goes" page is the first thing here I could send to our security review as it stands. It says files are read in the browser, nothing is uploaded, and it names the only two features that send anything. Emma, I agree it belongs on the front door and not one click away.

The same page also answers my round-one question, and the answer is no. The formats it reads are CSV, JSON, GraphML, GEXF, GML, DOT and Pajek. There is no Turtle, no N-Triples and no JSON-LD. So `rdf:type` will be drawn as an edge to a hub node, and my literals will either become nodes or be dropped.

Chris, your closeness point applies to me in a second way. My graph is a directed multigraph. Two different predicates between the same pair of entities are two facts. Does degree count them twice? Is closeness run directed or undirected? The result row has to say which.

Export has the same gap. "A recipe never holds your data" is good. But the graph file comes out as GraphML, and any merge I make has to go back as triples or a change list. For now I would stay with rdflib in a notebook, and use graphty-element there as a widget, not as the app.

**Morgan:** On trust, I found the part I care about. It's in the Export dialog, not on any storyboard. Every CSV gets a methods file next to it, and that file lists normalization, seed, version and the error bound for a sampled run. That's the difference between a finding and a rumour. Emma, the seed is written down. But it's written down after the run. I want to hear it on the run control before I press Enter.

Chris, I'm with you on 1.624. The first thing I'll do is diff that column against my NetworkX script. If it's off, I stop there.

On where the data goes: there's a page that says files are "read by this browser and are not uploaded," and I could forward it to our security reviewer. That's the first real answer I've had to my first question. It's buried in the main menu, though. Emma didn't find it, and I wouldn't have either.

On fit: Tab takes me to the Nodes table and ends the walk. Fine, I'd live in the table anyway.

What's missing is a real screen reader. The magenta strip only shows a sighted tester what NVDA should say. Nobody has actually run NVDA on this.

### Round 3

**Emma:** Here's what would make me switch. I'd switch the day `pip install` gives me graphty-element as a notebook widget. I'd pass it my networkx graph, have it compute betweenness, and get back a dict keyed by my own node ids, with the seed and version attached. Chris wants the same thing with Parquet, and Min-ji wants it with rdflib. That's three of us asking for one entry point, and it isn't an app. As an app, I'd use this for the one figure where Gephi currently wins, and nothing more.

Here's what would make me quit. I diff one column against NetworkX, like Morgan plans to, and the difference turns out to be an unlabelled convention. That's the 1.624 problem. It's defensible, but a reviewer would never read the small print.

The one thing I'd change: move the methods file up onto the result row itself. It should show variant, weighting, directed or undirected (Min-ji's multigraph question), seed, sample size and element version, and it should be visible before I press run, as Morgan said. Put "nothing is uploaded" on the front door too. Those two answers would have got me through my first five seconds.

**Chris:** I'd quit today, and I'd do it at import, before any number gets a chance to earn my trust. Three things would make me switch.

First, it has to take my Parquet edge list, 40 million rows, and give me back the same user_ids. Second, the export needs a code path, even a copied snippet, so a filtered two-hop neighbourhood can go back into my pipeline without me hand-cleaning a CSV. Third, graphty-element has to run as a notebook widget. Min-ji and Emma both ended up there too, so it's three of us now, not a niche request.

If I could change one thing, every result column would carry its settings in the header: weighted or not, how length is defined, directed or undirected, seed, version. Emma's reading of 1.624 is probably right. But I only trust a number I can diff against my NetworkX output without asking anyone how it was made.

Morgan, you want to hear the seed before you run. I want to see it before I export. It's the same fix.

What you didn't ask: can I colour edges by my own model's score, sitting next to Adamic-Adar? That's the only reason I'd open this at all.

**Min-ji:** For my own graph, I quit today. Chris, you said nothing starts from a customer's real file. For me the problem is worse, because my real file is Turtle and the tool can't read it at all.

I would switch for a narrow job: checking a governance subgraph I have already pulled out with a SPARQL CONSTRUCT. That's a few thousand entities. I'd load it as graphty-element in my rdflib notebook, the way Emma and Chris want to. The app is a second choice. The honest failure handling and the "where your data goes" page are enough to get past our security review.

The one change I want is an RDF import that knows what a literal is. Put `rdf:type` and literals on the node as properties, not as edges to a hub, and keep the predicate as the edge type. Then show me a class-level summary before any drawing: how many instances of each class, and how many edges of each predicate.

Morgan, you asked for the seed on the run control before you press Enter. I'd put the multigraph handling right beside it: directed or undirected, and whether parallel predicates are counted once or twice. Right now the only place that is written down is after the run.

**Morgan:** I'd switch for two things. The first is a screen-reader run that proves the keyboard storyboard actually works. The second is Chris's diff: my NetworkX script and this Nodes table, same graph, same numbers to the third decimal. Emma's explanation of the 1.624 is probably right. The trouble is that I only get the explanation after the fact, from someone sighted. If the column header doesn't say "weighted, length = 1/value", I'll read 1.624, assume it's wrong, and close the tab.

I'd quit if a stale or failed result shows only as colour or an icon. The failure storyboard still hasn't told me whether "out of date" is ever spoken. And I'd quit at the second time the plain arrow keys pan a camera I can't see.

The one thing to change: put the settings on the run control, where I hear them before I press Enter. That means variant, weighting, directed or undirected, and seed. Min-ji needs directed-or-undirected for her multigraph as much as I do. The methods file is where I'd check it afterwards. It isn't where I should first find out.

Then move "Where your data goes" to the front door. My security review starts there.

## Themes

Severity uses Nielsen's 0-4 scale (4 = usability catastrophe, 0 = not a problem). "Independent"
means the participant raised it before anyone else in the group had; "echoed" means they picked it
up after hearing someone else.

### 1. A result does not state its settings where it is read or before it runs -- severity 4

The single strongest theme. The closeness column shows "WF-corrected" and a top value of 1.624 for
Valjean. It is weighted closeness with length = 1/value, which legitimately exceeds 1, but the
header does not say so, and a NetworkX user expects 0 to 1. The methods file that records the seed,
version, normalization and error bound exists, but only beside an exported CSV, after the run.

- Emma: independent (round 1, missing seed on sampled betweenness), decoded the 1.624 in round 2,
  wants variant, weighting, direction, seed, sample size and version on the result row and before
  run.
- Chris: independent (round 1, 1.624 vs about 0.64); still unconvinced in round 2; wants every
  column header to carry its settings, visible before export.
- Morgan: echoed on 1.624 in round 2, but added an independent angle: a blind user cannot reach the
  small print that explains it, so the settings must be spoken on the run control before Enter.
- Min-ji: independent extension (round 2): on a directed multigraph, is degree counting parallel
  predicates twice, and is closeness directed or undirected?

Agreement: all four. Where they differ is placement -- on the run control before running (Morgan,
Min-ji), on the result row (Emma), in the column header before export (Chris). Chris names these as
the same fix; the design should treat them as one settings summary shown in all three places.

Discount: the specific number 1.624 was voiced once and then amplified; the group converged on
Emma's explanation without anyone checking it. The finding is not "1.624 is wrong" but "a correct
number with an unlabelled convention reads as wrong". Confirm by showing the labelled header to a
fresh participant, not this group. Separately, Chris's "damping box says 0.5 but values used 0.85"
confusion (voiced once, round 1) is the same theme in the failure storyboard -- severity 2 on its
own.

Also in this theme, voiced once each: the sampled-run estimate ("a few minutes" in the frame vs
"under a minute" in the storyboard text) is inconsistent (Emma; likely a mock-authoring error, fix
the copy); the refusal screen offers 101 sources instead of remembering the user's 500 (Emma,
severity 2).

### 2. "Where your data goes" is the right answer in the wrong place -- severity 3

The page says files are read in the browser and not uploaded, and names the only two features that
send anything. Three participants said they could forward it to their security review as it
stands. None of them found it from the front door; it is in the main menu.

- Emma: independent (round 1: "the front door answers neither" of my two questions).
- Min-ji: echoed Emma in round 2, independently judged it sufficient for her security review.
- Morgan: echoed in round 2 and round 3 ("my security review starts there"); notes Emma did not
  find it.
- Chris: silent.

Agreement: three of four, no dissent. This is a placement fix, cheap and high value.

### 3. graphty-element as a notebook widget is the entry point this segment wants -- severity 3 (fit, not usability)

Emma (networkx graph in, dict keyed by own ids out, with seed and version), Chris (Parquet or
DataFrame in, two-hop neighbourhood coloured by model score) and Min-ji (rdflib, a few thousand
entities from a SPARQL CONSTRUCT) all said they would use graphty-element in a notebook cell rather
than the app. The Export dialog honestly says scripting "is not yet available".

- Emma: independent (round 1 "whether there is an API"; round 2 "a cell in my notebook").
- Chris: independent in round 2, same turn as Emma; he may not have read hers.
- Min-ji: round 2, after Emma and Chris; stated as her fallback because RDF import is missing.
- Morgan: did not ask for it; would "live in the table".

Discount heavily for group-think. Emma and Chris both counted "three of us" in round 3, and that
tally was built by the group in round 2. Min-ji reached the widget as a second choice once the app
could not read her file, which is weaker than a primary need. Treat this as two independent voices
plus one conditional one, from a panel recruited to be code-first. It is a scope question for
graphty-element (a public API, so a one-way door) and belongs in framework-changes.md as a proposal,
not as a study result that it is demanded.

### 4. Nothing starts from the user's own file, and the formats they need are absent -- severity 3 for these personas

Every storyboard starts from a sample (Les Miserables, patents, proteins, card transfers).

- Chris: independent (round 1). 40-million-row Parquet user-item edge list; needs original user_ids
  back unchanged, no re-keying. Would quit at import.
- Min-ji: independent (round 1). Turtle, N-Triples and JSON-LD are not among the listed formats
  (CSV, JSON, GraphML, GEXF, GML, DOT, Pajek); `rdf:type` would become edges to a hub and literals
  would become nodes or be lost. Wants literals and `rdf:type` as node properties, predicate as edge
  type, and a class-and-predicate count summary before drawing.
- Emma, Morgan: did not raise it.

Agreement: two independent voices with different formats. The shared finding is "the storyboards
never show an import of a real, large file"; that is a design-coverage gap the studio should close
with a storyboard. The specific formats (Parquet, RDF) are feature requests, each from one
participant, and each is a file-format decision -- propose, do not decide.

Discount: part of this is mock fidelity. Storyboards naturally use samples; the test is whether an
import storyboard with a large real file holds up, not whether samples are wrong.

### 5. Round trip back to the pipeline -- severity 3 for Chris, 2 overall

Export is CSV (tables) and GraphML (graph). Chris needs a filtered subgraph and computed features
back with his ids intact, via a copied code snippet if nothing else. Min-ji needs merges back as
triples or a change list. Emma wants results keyed by her own node ids.

Three voices, but each is a different format; the common demand is "my ids come back unchanged,
and the export says so". Only Chris raised it unprompted.

### 6. Keyboard and screen-reader coverage -- severity 3, but mostly unverified

- Morgan: plain arrow keys announce "View moved" -- they pan a camera a blind user cannot see and
  waste the most natural keys (independent, round 1; repeated round 3 as a quit trigger). Praised
  the landmark order ("Graph drawing, application", 33 of 300 nodes, selection, keys) and "Back to
  RPA2, neighbor 4 of 32 of TP53".
- Morgan: the failure-and-recovery storyboard has no text alternative, so it cannot tell whether
  "out of date" is ever spoken; a stale or failed result shown only by colour or icon is a quit
  trigger (independent, round 1; repeated round 3). Emma agreed in round 2.
- Morgan: no one has run NVDA on this; the magenta annotation strip is what a sighted designer
  expects NVDA to say (round 2). Min-ji had also noted the storyboard says it is not a usability
  result.
- Emma: the keyboard walk leaves out the keys a sighted keyboard user relies on (find-by-name,
  Ctrl+A), and she only half trusts select-all after its storyboard branch (independent, one
  voice).
- Morgan: Tab reaching the Nodes table and ending the walk is acceptable (round 2).

Discount: every keyboard finding here is based on a storyboard of intended announcements, not a
screen-reader run. The findings about the design (arrows pan by default; failure states need a
spoken form; the failure storyboard needs a text version) stand. Whether the announcements work
is unknown until NVDA is actually run on it.

### 7. First-minute statistics -- severity 2, one voice

Emma: the Statistics panel reads "Components: not computed" on a loaded graph; component count is
the first number she wants and costs one BFS. Voiced once, by one participant, not echoed. Carry
it to the next round and look for it there rather than acting on it alone. Note that under the
architecture this count must come from graphty-element, not the app.

### 8. Model score next to a link-prediction measure -- severity 2, one voice

Chris: the only reason he would open the tool is a two-hop "explain this recommended pair" view
colouring edges by his own model score next to Adamic-Adar. Single voice, strongly held. Log it as
a candidate journey; do not generalize it.

## What held up well (positive findings)

- Honest failure handling: the GPU-lost branch names the error code, keeps the previous result
  labelled, and never quietly finishes on the CPU. Praised independently by Emma and Chris, and
  cited by Min-ji as part of passing a security review.
- "124,318 nodes not drawn, narrow the graph" as the answer to the hairball (Chris, one voice).
- Asking what a higher edge value means before a run, and naming the formula (closeness vs
  harmonic) on the result (Min-ji, independent; Emma's round-2 reading relied on the same frame).
- The methods file beside each CSV (Emma, Morgan) -- right content, too late in the flow.
- The keyboard storyboard's announcement order and its "where am I, how do I get back" phrasing
  (Morgan).

## Group-think effects to discount

- The "three of us want a notebook widget" tally was built inside the session and then cited back
  by two participants as evidence. Count it as two independent requests and one conditional one.
- The 1.624 explanation came from Emma alone; Chris and Morgan accepted it as "probably right"
  without checking. The group then treated "the number is right, only the label is wrong" as
  settled. Verify the value against NetworkX before relying on either reading.
- Min-ji and Morgan both moved the data-location page to the front door after Emma proposed it.
  The need was independent for Emma and Min-ji (both raised data location in round 1 or early round
  2); Morgan's is an echo, though strongly worded.
- In round 3 every participant adopted Morgan's "settings before I press run" framing. The
  underlying need was independent for three of them; the placement is Morgan's.
- The panel was recruited to be code-first, so its lean toward notebooks, APIs and formats is
  expected and says nothing about the general user base.

## Findings caused by the mock, not the design

- The "a few minutes" vs "under a minute" estimate mismatch is inconsistent copy between two
  artifacts.
- Every screen-reader judgement rests on annotated intent, not a real NVDA run.
- The absence of any real-file import is partly because storyboards use samples; an import
  storyboard is needed before judging the design.
