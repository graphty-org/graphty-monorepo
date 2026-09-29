# Focus group: leaving Gephi or Cytoscape

Round 3 of the simulated user study. Four simulated participants who do their network work in
Gephi or Cytoscape today reviewed the gallery -- the main frame at rest (Les Miserables, force
layout, coloured by group), the betweenness and closeness result panels with their run records,
and two storyboards (a fraud investigator's case, and a biology lab's reusable style recipe with
its gene match report) -- and discussed them over three rounds: first impressions, trust and
getting data out, then what would make each of them switch or quit.

Participants (all simulated, built from the graphty personas plus public forum and video
material):

- **gephi-holdout (Dr. Lindqvist)** -- computational social scientist; teaches a Gephi lab of
  about 25 students; studies a 40,000-node Mastodon mention graph; works in GEXF with time
  intervals and cites ForceAtlas2 settings in papers.
- **genomics-cytoscape-user (Maren)** -- genomics postdoc; starts from a differential-expression
  gene list and a DESeq2 table; builds networks from STRING in Cytoscape; her lab protocol names
  Cytoscape for paper figures.
- **bioinformatics-researcher (Dr. Chen)** -- bioinformatician; checks every number in R against
  igraph; drives Cytoscape from R through RCy3; reviews papers.
- **analyst-alex** -- supply-chain analyst; exports two CSVs from SQL every Monday and redoes the
  same Gephi analysis for a supplier-risk deck; burned once by Gephi Lite dropping styling on
  re-import.

Caveat for everything below: these are simulated participants. Treat their statements as
hypotheses to test with real people, not as evidence of real behaviour.

## Transcript

Lightly edited: repeated speaker labels inside a turn were removed. Otherwise verbatim.

### Round 1 -- first impressions (written alone, before the discussion)

**gephi-holdout:** Five seconds on the frame at rest: it's a browser tool for looking at a network and reading its summary statistics. It's Gephi's Overview with the Statistics panel moved to the right. Les Miserables, a force layout, colour by group, density 0.0868. I recognise the room, and that isn't a compliment yet.

What I noticed:
- **The layout.** It says "Force-directed", not which one. Is that ForceAtlas2? With what gravity and scaling? If I can't see the settings, I can't cite the picture.
- **The table.** There's no Data Laboratory in sight. Where do I see and fix my columns?
- **"This browser. Nothing sent."** I like that. My ethics board would too.
- **Size.** A browser and 77 nodes proves nothing. Show me my 40,000-node Mastodon mention graph.

The two storyboards are about a fraud investigator and a biology postdoc, not people like me. But the ideas underneath are what I'd take from them:
- **The weekly return** (reopen last month's project, add this month's files, ask what changed) is something I fake in Gephi with append and a prayer.
- **The recipe** is a saved style with no data inside it. I'd use that for teaching: hand students the colouring, not my dataset.

So far I'm curious but not convinced.

**genomics-cytoscape-user:** Maren, written alone before the discussion:

My guess from five seconds: it's for looking at a network someone has already built and measuring it. The right-hand panel is all density, components and degree distribution, and that tells me who it was made for. It looks like Cytoscape's network panel with nicer typography.

Things I noticed straight away:

- **The privacy line is good.** "This browser. Nothing sent." matters to me, because my DE list is unpublished. I'd still check the network tab before I believed it.
- **The edges say "weight: confidence".** That's the first thing I'd look for. It reads like a STRING score, but I'd want to see the cutoff it was built at.
- **The hubs worry me.** The middle is UBC, UBB, HSP90AA1 and YWHAZ, the same sticky proteins that sit in the centre of every STRING hairball. If I run betweenness on this, those win, and the result means nothing. I've reviewed too many papers like that.
- **The legend with counts is nice.** I'd want it to come out in the PDF.

What's missing from this frame is my own data. There's no fold change, nothing that shows where my gene symbols would go, and nothing about enrichment. As shown, it's a viewer for a graph that arrived finished. Nothing here gets me from a list of 300 genes to a network.

**bioinformatics-researcher:** Five seconds on the empty frame: it's a general network viewer. You load a file, color by an attribute and read some summary numbers. Using Les Miserables as the demo tells me nothing, because every tool since Gephi demos Les Mis. The frame looks clean, and I like that the legend sits on the canvas and that the Statistics panel says "undirected, weight: value", so I know which column it treated as weight. But I see no identifier type, no source database, no version and no confidence cut-off, and force-directed is the default. Force-directed on a PPI (protein interaction) network gives you a hairball, or tidy clusters that aren't really there.

The recipe storyboard is the first thing that made me sit up. "84 of 96 genes matched", with the 12 misses listed one by one and a reason for each: 7-Sep was a date Excel made, and Mdm2 is the mouse spelling of MDM2. Every mapping tool I've used just gives you a count, or "null". That part is real.

Where I'm skeptical: Tom's frame puts fold change and module membership on the same channel, color. Up-regulated genes are blue, and so is a whole module that's also blue. Tom would misread that, and so would a reviewer. And I still don't know what I'd cite.

**analyst-alex:** Five seconds on the main screen: it looks like Gephi Lite, but tidier. You load a network, it draws it, and you colour it by group. The first thing I actually read was "This browser. Nothing sent." under the project name. That's the line I go looking for before I touch real supplier data, so it's good that it's up top. But "this browser" makes me ask what happens if I clear my cache or open it on the train laptop. Is my afternoon gone?

Second thing I looked at was Nodes 77 and Edges 254 on the right. I check the counts against SQL before I believe anything, so I'm glad they're up front.

The legend is where I lose it: 2, 8, 4, 1, 3, 5, 0, "Other". Those are group numbers with no meaning attached. I can't put "group 2" in a deck.

Both storyboards are about other people: a fraud investigator and a biology lab. Mine starts as two CSVs out of SQL. The "same analysis, new data" idea is exactly my Monday, though. If Monday really ends at "put the new files under last week's project", that's the Gephi half of my week I stop redoing by hand.

### Round 2 -- trust and getting data out

**gephi-holdout:** Trust first. The betweenness run record is the best thing I've seen in this gallery. It shows "Filtered graph, 60 of 77: after Filter to degree >= 2", Brandes, exact, and the normalization with n = 60 written out. Gephi has never told me that. It quietly computes on the visible graph and writes the result into one column, and I've watched students cite filtered modularity as if it were the whole network. So yes, I'd put that number in a report, but three things have to happen first:

- **The export has to say it.** When the table goes out as CSV, the column has to carry the scope, something like `betweenness (filtered 60/77)`. A clean record on screen is no use if the CSV loses it.
- **Community detection needs the same record.** It should show the resolution and the seed. Louvain gives a different partition on every run.
- **The layout needs one too.** Maren, your hub worry is the reason I want the layout named. I cite ForceAtlas2 with its settings.

Alex is right about the legend: "group 2" is useless. What would make me quit is my own data. If the GEXF I drag in loses its timestamp intervals, I close the tab.

**genomics-cytoscape-user:** Maren, round 2.

On trust: a row that reads "betweenness, over the filtered graph" is more honest than cytoHubba, which never tells me what it ran on. I still wouldn't put it in a report as it stands. First I need to know what the filter was. If it was "largest component, STRING 0.7", I need that sentence written out word for word, plus the STRING version and the date I pulled it. I saw "Exact" and "Betweenness (sampled)" in the catalog. If it's sampled, tell me how many samples and the seed, or reviewer 2 gets a different top 10 from mine. Give me a "copy methods paragraph" button and I'd forgive a lot.

I agree with the bioinformatics researcher about colour. If fold change and module membership share one hue, that's a figure I'd have to redo.

Alex's "group 2" complaint is my complaint too. MCL cluster numbers mean nothing until enrichment names them. A cluster isn't "5", it's "immune response, FDR 1e-8".

On fit: nothing here starts from a gene list. Until it does, I'd still start in Cytoscape and only come here to look.

**bioinformatics-researcher:** (Dr. Chen) The run record is the first thing in this gallery I'd actually paste into a methods section. It gives Brandes, exact, unweighted, the normalization with n = 60, and the scope written out as "after Filter to degree >= 2". Most tools leave me guessing at every one of those. The Wasserman-Faust note is better still, because it says what the correction did on this particular network: under 1% change and no rank changes. That's the sentence a reviewer asks me for.

Would it go in a report? Not yet. First I'd need:
- the software version and a hash of the input file
- the STRING version and cut-off the edges came from
- the scores as a column I can read into R, not only a top-5 list

Maren is right about the hubs, and the panel doesn't help her. Filtering by degree and then ranking by betweenness mostly measures degree twice. I'd want the tool to show how closely the score tracks degree, right there next to "No near-ties".

Alex, your "group 2" problem is my fold-change-and-module problem. The legend is honest about the numbers but says nothing about what they mean.

Also, "zero: 32 nodes, all 29=" is cut off. If more than half the nodes score zero, I want that stated in full.

**analyst-alex:** Trust first. The closeness panel has a line that says "full graph, 300 nodes, 3 components. Exact. Unweighted, undirected." That line is the footnote I'd put under the chart, and I'd copy it word for word. So yes, "betweenness, over the filtered graph" could go in a report, but only if I can see what the filter was, in words I can paste, and the node count after filtering. My director will ask "filtered how?" and "the filtered graph" doesn't answer that.

Before any number goes in the deck, I'd need:
- **Everything in CSV.** The whole metric column, not just the top ten, so I can check it against NetworkX.
- **The same groups every time.** If Louvain gives me different communities when I rerun it next month, the weekly return means nothing. Show me the seed.
- **Honest timing.** A warning before a betweenness run takes all afternoon.

Maren's point about hubs is my problem too. In a supplier network, the two big distributors win betweenness every time, and "the distributor is central" isn't news to anyone.

I agree with the Gephi holdout that 77 nodes proves nothing. My supplier graph has 9,000 nodes. Show me it drawn at that size, or show me it refusing.

### Round 3 -- what would make you switch, or quit, and the one change you would make

**gephi-holdout:** (Dr. Lindqvist) One thing that would make me switch: my lab, in September. It runs in a browser, with no Java and no memory flag in a text file. Twenty-five students have a graph on screen in the first five minutes. Add undo and a run record that names the filter and the Louvain seed, and I'd rewrite my handout. That's a summer I've been saving for something worth it.

One thing that would make me quit: I drag in my GEXF and something goes missing without a word. That could be the time intervals, a dropped attribute column, or a layout that won't let me set LinLog, gravity, scaling and prevent overlap. Alex asked for the 9,000-node graph drawn, or refused honestly. I'll take either, but a stutter at 20k is a quit.

The one change: name the layout and show its settings in the same kind of record as betweenness. Maren's hubs and my citation are the same problem there. "Spatialized with ForceAtlas2, gravity 1, LinLog" has to be one copyable sentence with a version number. Otherwise the figure invites a methods question I'd rather not answer.

Maren, I don't share the gene-list complaint. That's not my door.

**genomics-cytoscape-user:** Maren, round 3.

**What would make me switch:** I paste 300 gene symbols and my DESeq2 table, and within ten minutes I see my genes coloured by log2 fold change on a blue-orange scale centred on zero. Next to it I want the match report from the recipe storyboard, "84 of 96 matched", with every miss and the reason for it. After that, a PDF with the legend inside it, and a methods paragraph I can copy out. If all of that works, I'd move the exploring over. The paper figure probably stays in Cytoscape anyway, because my PI and the lab protocol say Cytoscape.

**What would make me quit:** it drops genes without telling me. That's my version of the Gephi holdout's lost timestamps. If one of my columns vanishes quietly, I stop trusting every number on the screen.

Alex is right about the seed. I rerun analyses for reviewers months later, so if the MCL clusters come out different, the figure is dead. Dr. Chen, I still report cytoHubba's top 10 by MCC like everyone else. But if you put that correlation with degree next to my ranking, I'd look at it.

**The one change:** let me start from a gene list instead of a finished graph file. That means doing the STRING query here, with its version and cut-off written into the record.

**bioinformatics-researcher:** (Dr. Chen) What would make me switch is getting my table back out. I want every metric as a column, with the run record attached to it, in a file I can `read.csv` into R and check against igraph. If igraph gives me the same betweenness to three decimals, I'll trust the other numbers. A scripting path matters just as much. If I can't drive this from R the way I drive Cytoscape through RCy3, it stays a viewer, and nothing I publish gets made by hand. So it needs a documented way to run the same recipe on a new file without clicking.

I'd quit over the figure or over my identifiers. If the SVG comes out with outlined glyphs, I'm gone. If it quietly drops the 12 genes it couldn't match instead of listing them, I'm gone too.

The one change I'd make is to stop colour doing two jobs. Give fold change a diverging scale on fill and put modules on outline or on hulls. Maren would redo that figure, and so would I.

Alex, I'm with you on seeds, but they aren't enough on their own. Record the Louvain resolution and seed, or two runs can't be compared.

What you didn't ask us: how it handles the background network. A 19,000-node interactome is the real test, not 77 nodes.

**analyst-alex:** One thing would make me switch: the weekly return has to work on my real Monday. I drop in this week's two CSVs from SQL under last week's project, and I get the same colours, the same layout, the same groups with the same seed, and a list of what changed. If it does that, the Gephi half of my week is gone and I'd move the supplier-risk deck over.

One thing would make me quit: finding my work gone. If "this browser" means clearing the cache wipes the project, or it doesn't open on the train laptop, I go straight back to Gephi and I don't come back. Gephi Lite already did that to me once, when it dropped my styling on a re-import.

The one change I'd make is a readable name on every group and every filter. Maren wants "immune response" in place of "5", and I want "northern depots" in place of "group 2". The Gephi holdout wants the CSV column to carry the scope. That's the same ask from all three of us: whatever I copy out has to explain itself without me standing next to it.

## Summary of themes

Severity uses Nielsen's 0-4 scale (0 not a problem, 1 cosmetic, 2 minor, 3 major, 4
catastrophe). "Independent" means the participant raised it in round 1, before hearing the
others; "adopted" means they took it up after someone else raised it. Themes are ordered by
severity, then by how many participants raised them independently.

### 1. Anything that goes missing on the way in must be reported, never dropped silently (severity 4)

- **Who:** all four named it as their quit trigger in round 3. Dr. Lindqvist (round 2, then
  round 3: GEXF time intervals, a dropped attribute column); Dr. Chen (round 3: the 12 unmatched
  genes must be listed, not dropped); Maren (round 3, explicitly "my version of the Gephi
  holdout's lost timestamps"); Alex (round 3: Gephi Lite dropping styling on re-import).
- **What already works:** the recipe storyboard's match report -- "84 of 96 genes matched", each
  miss listed with a reason (the Excel date "7-Sep", the mouse spelling "Mdm2") -- was praised
  independently by Dr. Chen in round 1 and chosen by Maren in round 3 as a condition for
  switching. It is the pattern to extend.
- **What is missing:** the same accounting for everything an import can lose -- attribute
  columns, GEXF time intervals, types it cannot read, edges it merged -- not just identifiers. No
  mock yet shows an import report for a GEXF with dynamic attributes.
- **Dissent:** none.
- **Discount:** low on validity (each participant gave a concrete, different loss). Moderate on
  independence: only Dr. Chen raised it in round 1, and Maren framed hers as a copy of Dr.
  Lindqvist's. Severity 4 because a silent loss invalidates every downstream number and all four
  said they would leave on it.

### 2. Every result, and the layout, needs a complete, copyable run record (severity 3)

- **Who:** Dr. Lindqvist (independent, round 1: "It says 'Force-directed', not which one ... I
  can't cite the picture"; round 3 made it their one change); Dr. Chen (independent, round 1: "I
  still don't know what I'd cite"); Maren (independent, round 1: wants the STRING cut-off behind
  "weight: confidence"); Alex (round 2: the filter "in words I can paste").
- **What already works:** the betweenness record ("Filtered graph, 60 of 77: after Filter to
  degree >= 2", Brandes, exact, normalization with n = 60) and the closeness line ("full graph,
  300 nodes, 3 components. Exact. Unweighted, undirected.") were praised by all four in round 2.
  Dr. Chen singled out the Wasserman-Faust note because it says what the correction did on this
  network ("under 1% change and no rank changes").
- **What is missing, by who asked:**
  - The layout named with its settings (ForceAtlas2, gravity, scaling, LinLog, prevent overlap)
    and a version, as one copyable sentence -- Dr. Lindqvist, rounds 1-3.
  - Community detection with its resolution and seed -- Dr. Lindqvist and Alex, both in round 2
    (same round, apparently independent); Maren adopted in round 3 for MCL; Dr. Chen in round 3
    added that the seed alone is not enough without the resolution.
  - The filter written out in words, not "the filtered graph" -- Alex and Maren, round 2.
  - Sample count and seed for a sampled measure -- Maren, round 2.
  - Software version, input file hash, source database and its version and cut-off -- Dr. Chen
    and Maren, round 2.
  - A "copy methods paragraph" action -- Maren, round 2; Maren again in round 3.
- **Dissent:** none on the need.
- **Discount:** low. Four participants reached it from four different directions in round 1 and
  2. The round-2 praise of the existing record is partly prompted (see group-think), but the
  missing items are concrete and specific.

### 3. Results must come out as full columns that carry their scope, and figures must stay editable (severity 3)

- **Who:** Dr. Lindqvist (round 2: the CSV column header must carry the scope, e.g. `betweenness
  (filtered 60/77)`); Alex (round 2: the whole metric column, to check against NetworkX); Dr.
  Chen (round 2 and round 3: every metric as a column with the run record attached, to check
  against igraph "to three decimals"); Maren (independent, round 1: the legend with counts must
  come out in the PDF; round 3 again).
- **Figure specifics:** SVG text must remain text, not outlined glyphs (Dr. Chen, round 3, a quit
  trigger); PDF must include the legend (Maren).
- **Dissent:** none.
- **Discount:** low. Three participants want to verify numbers in their own tool before trusting
  any; that is a strong and consistent expert behaviour, matching the earlier code-first group.

### 4. Group and filter labels must explain themselves (severity 3)

- **Who:** Alex (independent, round 1: "I can't put 'group 2' in a deck"; round 3 made it their
  one change and folded the others' asks into it); Dr. Lindqvist (adopted, round 2); Maren
  (adopted, round 2: a cluster is "immune response, FDR 1e-8", not "5"); Dr. Chen (adopted and
  reframed, round 2: "the legend is honest about the numbers but says nothing about what they
  mean").
- **What is asked:** a readable name on every group and every filter that travels with anything
  copied out -- legend, CSV, methods line.
- **Dissent:** none, but the asks differ in kind: Alex wants to type a name; Maren wants the name
  derived from enrichment, which is an analysis, not a label field.
- **Discount:** moderate. Only Alex raised it independently, and part of it is mock fidelity: the
  Les Miserables fixture's `group` attribute is numeric, so the frame could only show numbers. The
  design question the mock does not answer -- can a reader rename a group, and does the name
  survive export and the weekly return -- is real and should be mocked before the next round.

### 5. The weekly return must reproduce last week exactly, and the project must not vanish (severity 3)

- **Who:** Alex (independent, round 1: "exactly my Monday"; round 3 made it their switch
  condition); Dr. Lindqvist (independent, round 1: "something I fake in Gephi with append and a
  prayer").
- **What is required:** the same colours, the same layout, the same groups with the same seed,
  and a list of what changed.
- **Storage durability:** Alex alone asked, in round 1 and again as their round-3 quit trigger,
  what "This browser" means if the cache is cleared or the project is opened on another laptop.
  Severity 3 for Alex's use: losing a project is data loss. Discount on breadth (one voice, twice),
  not on validity -- the words "This browser" invite the question and no mock answers it.
- **Dissent:** none. Maren and Dr. Chen did not engage with the weekly return; Maren's rerun for
  reviewers "months later" (round 3) is the same need in a different rhythm.

### 6. Show real scale, or refuse honestly (severity 3)

- **Who:** Dr. Lindqvist (independent, round 1: 40,000 nodes; round 3: "a stutter at 20k is a
  quit"); Alex (round 2: 9,000 nodes, "show me it drawn at that size, or show me it refusing";
  also asked for a time warning before a long betweenness run); Dr. Chen (round 3: a 19,000-node
  interactome, "what you didn't ask us").
- **Dissent:** none. Dr. Lindqvist accepts either outcome -- drawn or honestly refused -- but not
  degraded interaction.
- **Discount:** partly mock fidelity: a static mock with a 77-node fixture cannot demonstrate
  performance. What is not fidelity: no mock shows the large-graph states (the cost warning before
  a run, the refusal, the level-of-detail drawing). Those states should be mocked with a
  realistically sized fixture.

### 7. Colour is doing two jobs in the recipe storyboard (severity 3 for that frame)

- **Who:** Dr. Chen (independent, round 1: fold change and module membership both on colour, "Up-
  regulated genes are blue, and so is a whole module"; round 3 made it their one change); Maren
  (adopted, round 2: "a figure I'd have to redo").
- **Proposed shape (Dr. Chen):** fold change on fill as a diverging scale centred on zero (Maren:
  blue-orange); modules on outline or hulls.
- **Dissent:** none.
- **Discount:** low on validity -- it is a direct reading of the storyboard frame, not a
  fidelity artifact. Moderate on breadth: one independent voice, one adopter, both from the same
  field. It is a defect in a storyboard's encoding choice, and the product should also make the
  two-on-one-channel mistake hard to make.

### 8. Betweenness mostly re-measures degree on hub-heavy networks (severity 2)

- **Who:** Maren (independent, round 1: UBC, UBB, HSP90AA1 and YWHAZ win every STRING hairball);
  Dr. Chen (round 2: "filtering by degree and then ranking by betweenness mostly measures degree
  twice"; proposed showing how closely the score tracks degree next to "No near-ties"); Alex
  (adopted, round 2: the two big distributors); Dr. Lindqvist (adopted, round 2, linking it to
  naming the layout).
- **Dissent:** mild. Maren still reports cytoHubba's top 10 by MCC "like everyone else" and would
  only "look at" a degree correlation.
- **Discount:** moderate. Real and domain-grounded, but it is analytic guidance rather than a
  usability failure; nobody said they would leave over it.

### 9. Start from a gene list, with the database query recorded (severity 2 overall; 3 for Maren)

- **Who:** Maren only (rounds 1, 2 and 3; her one change). Dr. Chen touched the adjacent point
  of identifier type and source database (round 1).
- **Dissent:** explicit. Dr. Lindqvist: "I don't share the gene-list complaint. That's not my
  door." Alex and Dr. Chen did not take it up.
- **Discount:** high on breadth -- one participant, one field. Maren also said the paper figure
  would stay in Cytoscape regardless, because her PI and lab protocol require it, so even a
  perfect gene-list entry would move only her exploring. Record as a segment need; do not
  generalise.

### 10. A scripted path to rerun a recipe without clicking (severity 2 overall; 3 for Dr. Chen)

- **Who:** Dr. Chen only (round 3: "If I can't drive this from R the way I drive Cytoscape
  through RCy3, it stays a viewer").
- **Dissent:** none voiced; nobody else raised it.
- **Discount:** high on breadth, a single late mention. It does echo the earlier code-first focus
  group's request for a path from code, so it is a second segment asking, not a first.

### What they praised (keep these)

- **"This browser. Nothing sent."** All four noticed it independently in round 1. Dr. Lindqvist:
  "My ethics board would too." Maren will check the network tab before she believes it, so the
  claim must be literally true; Alex needs it to also answer what happens to the project (theme
  5).
- **The run record** on betweenness and closeness (theme 2) -- the best-received element of the
  gallery for this group.
- **The gene match report** with each miss and its reason (theme 1).
- **Counts up front** (Nodes 77, Edges 254) -- Alex checks them against SQL.
- **The legend on the canvas, with counts**, and the Statistics panel naming the weight column
  ("undirected, weight: value") -- Dr. Chen and Maren.
- **The recipe as a style with no data inside it** -- Dr. Lindqvist would hand it to students.
- **No install** -- Dr. Lindqvist's switch reason: "no Java and no memory flag in a text file",
  25 students with a graph on screen in five minutes. Undo was named as part of that bar.

### Minor

- "zero: 32 nodes, all 29=" is truncated in the betweenness panel (Dr. Chen, round 2; severity
  2). If more than half the nodes score zero, the full sentence matters. Check whether this is a
  layout defect in the mock or a real length problem in the message; either way the message needs
  room.
- No visible table for seeing and fixing columns ("There's no Data Laboratory in sight" -- Dr.
  Lindqvist, round 1; severity 2). Raised once and not pursued; may be because the frame at rest
  hides the table rather than because it does not exist.
- The storyboards feature other people's jobs (a fraud investigator, a biology lab). Dr.
  Lindqvist and Alex both said so in round 1 but took the ideas anyway. A gallery-coverage note,
  not a product defect: this segment wants to see a teaching lab and a weekly CSV refresh.

## Group-think effects to discount

- **Prompted praise of the run record.** The round-2 question put "betweenness, over the filtered
  graph" in front of everyone, and all four quoted it. The unanimous praise is partly the
  question's framing. What is durable is what each asked to be added, which differed per person.
- **Convergence on one slogan.** In round 3 Alex folded three separate asks (named groups, named
  clusters, scoped CSV headers) into "whatever I copy out has to explain itself". The needs are
  real, but their being one feature is Alex's framing. Design them as related, not as one control.
- **Adoption cascade on "group 2".** One participant raised it in round 1; all three others
  adopted it in round 2, each translating it into their own concern. Count it as one independent
  finding with broad agreement, and remember that the fixture's numeric groups caused part of it.
- **Mirrored quit triggers.** Maren explicitly modelled her quit trigger on Dr. Lindqvist's. The
  convergence on "silent loss" is strong, but only Dr. Chen reached it before the discussion.
- **Linked-concern cascade on hubs.** Maren's hub worry was picked up by Dr. Chen, Alex and Dr.
  Lindqvist, each attaching it to something they already wanted (a degree correlation,
  distributors, naming the layout). The attachments are opportunistic; the finding itself is
  Maren's and Dr. Chen's.
- **Segment skew.** All four are experienced users of desktop tools, and three are researchers
  who publish. Their bar (citable methods, R and NetworkX verification, 20,000-node graphs) is
  higher than the explorer or presenter personas' and says little about them.
- **Institutional lock-in, not design.** Maren's "the paper figure probably stays in Cytoscape
  anyway" is a policy constraint. Do not count it against the design.
- **Simulation effects.** These are simulated participants built from forum and video material,
  which over-represents vocal expert complaints (hairballs, outlined SVG glyphs, reviewer 2). The
  pattern of each participant naming a crisp switch condition and a crisp quit condition is the
  moderator's question shape, not evidence of real decision-making.
- **Mock fidelity.** Scale (theme 6), the numeric group labels (theme 4) and possibly the
  truncated zero-score line are wholly or partly artifacts of static mocks and a small fixture.
  The missing states they point to are real and should be mocked; the absence of performance
  evidence is not a finding about the design.
