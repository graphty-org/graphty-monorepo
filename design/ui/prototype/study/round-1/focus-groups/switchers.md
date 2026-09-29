# Focus group: Leaving Gephi or Cytoscape

Round 1 of the study. Simulated participants, moderated in three rounds. Before any discussion,
each participant wrote first impressions alone after seeing the app frame (Les Miserables sample,
Statistics panel, legend on the canvas) and two storyboards: a weekly return to an ongoing fraud
case, and a saved style "recipe" re-applied to a gene list.

## Participants

| Who | Background | Leaves (or would leave) |
|-----|------------|-------------------------|
| Mara | Network scientist and teacher, social and retweet networks, long-time Gephi user | Gephi |
| Maren | Wet-lab genomics researcher, gene lists and DESeq2 tables, not a network person | Cytoscape |
| Dr. Chen | Computational biologist, STRING networks of 2,000 to 15,000 nodes, works in R | Cytoscape |
| Alex | Logistics analyst, supplier networks from SQL, monthly deck for a director | Gephi and Gephi Lite |

Name note: in discussion participants sometimes address "Tomas", "Tom" or "Priya". No one by
those names was in the group; every such reference is to one of the four above (usually
Dr. Chen) and is read that way below.

## Transcript

### Round 1 -- first impressions, written alone before discussion

**Mara (Gephi holdout):** In five seconds: it's a browser Gephi for small and medium networks. Load a file, spatialize, colour by partition, size by ranking, export. Structurally it's my Overview with the statistics panel on the right, which I mean as a compliment.

What I checked first: Les Miserables at 77 nodes and 254 edges, undirected. Those are right, or I'd have stopped here. The "Full graph" chip beside the file name is the first thing I've seen in any tool that answers "on what?" before I ask. The legend with counts sits on the canvas, and if it comes out in the SVG, that's my Inkscape step gone.

What worries me:
- "Force-directed" doesn't tell me which algorithm it is. Is it ForceAtlas2? Can I set LinLog, gravity and scaling?
- The group ids are bare numbers, 2, 8, 4. That's Gephi's random modularity-class problem all over again.
- I won't touch "Assistant", and "2D" as a menu tells me 3D is lurking.

The two storyboards follow a fraud investigator and a gene biologist, and neither is me. Where's the retweet network at 23k nodes?

**Maren (genomics, Cytoscape user):** Written alone, before the discussion: a general-purpose viewer for any network you already have as a file. It isn't obviously for my data. The only way in I can see is a file, "miserables.json". I don't have a network file. I have a gene list and a DESeq2 table.

What I noticed next:
- **Colours:** "Group color" runs 0 to 8. Those are numbers, not meanings. I didn't choose these colours and I don't know what 2 means.
- **Counts:** The statistics panel is the part I trust most. It says 77 nodes, 254 edges, and 2 components, 1 of them an isolate. Counts with units are what I look for first.
- **Legend:** The legend sits on the canvas. If it comes out in the PDF, that alone is worth something to me.
- **3D:** "2D" is showing, so at least it doesn't open spinning.

The weekly-return storyboard is a bank fraud case. I read it and nothing in it is mine.

The recipe-travels storyboard is different. It says "84 of 96 genes matched" and lists the 12 that didn't match, by name. It also flags ones that "look like a date". That's the first thing today that looks like it has met my data. Excel ate my SEPT genes last March.

Still, it's a count on a storyboard. I'd want to see it with my own 300 genes before I believe it.

**Dr. Chen (computational biologist):** Solo note, written before discussion: "A general-purpose network viewer with a stats panel, for looking at someone else's small graph."

My first five seconds went to the sample data. It's Les Miserables, 77 nodes, coloured by a "group" field labelled 2, 8, 4, 1. I've seen that graph in every Gephi tutorial since 2010, and it tells me nothing about whether this tool can handle what I actually work with. My networks are 2,000 to 15,000 STRING nodes, and the identifiers are what matter.

Some good things. The Statistics panel says "undirected, weight: value", which is the first thing a reviewer asks about. It also counts the isolate instead of hiding it. The legend is on the canvas, so I wouldn't have to rebuild it in Illustrator. The weekly-return storyboard is a fraud case with bank accounts. That's fine, but it's also a sign of who this was designed for.

What I didn't see at rest: where the data came from and which version, the cut-off, and which algorithm and parameters produced the layout. "Force-directed" with a play button isn't a method I can write up. I'm also asking now why there's a 2D/3D switch at all.

**Alex (analyst, logistics):** From five seconds on the frame, I'd say it's Gephi in a browser. You load a network, colour it by group, size it by something, and read the stats on the right. What I checked first were the counts: 77 nodes, 254 edges, "2 (1 isolate)". I like that. If those match what SQL told me, I stay. If they don't, I go back to Gephi.

Some things bother me. The legend reads "Group color: 2, 8, 4, 1..." and those numbers mean nothing to me. Is 2 the biggest group or just the first colour? I'd need that answered before I paste it into a deck. "Size by degree" is labelled, which is good, because otherwise I'd call the big ones "the important ones." "Styles" and "Base style" sound like developer words.

I didn't see a line on the frame saying whether my file gets uploaded anywhere, and I look for that before I load real supplier data. The weekly-return storyboard is a fraud investigator on bank data, not my kind of network, so I can't tell yet whether it saves me the Gephi half of my Monday. The recipe one is a wall of text. I skimmed it.

### Round 2 -- trust in the results, fit, what is missing

**Mara:** On trust, the results panel is where this beats Gephi. It says "on: full graph, 300 nodes, 3 components" and "Exact. Unweighted, undirected." In Gephi, if I run betweenness with a giant-component filter on and then run it again, the column quietly mixes two runs. The "Out of date" card saying "under 10 s together, Re-run all" is the fix I've wanted for ten years. The closeness entry labelled "WF-corrected", with a note on the isolated nodes, is something I could actually cite.

Would I put "betweenness, over the filtered graph" in a report? Only if the export carries that label into the CSV column header. I'd also need the filter written out in words, not "1 step". Tomas is right that "Force-directed" isn't a method. I'd add that a result I can't rerun from a script isn't one either.

I disagree with Priya about the Les Mis sample. It's fine for teaching, since my students know it. My worry is scale. A 124k-node citation graph with "124,318 nodes not drawn" is not the map I came for. Seeing the map is the whole point of the tool.

What's missing: GEXF in and out with the rule intact, and Louvain run with a seed.

**Maren:** On trust: "betweenness, over the filtered graph" tells me the scope, and that's good. But I don't know what betweenness means, and I'd have to explain it to reviewer 2. Before it goes in a report I need the filter written out: which cutoff, and how many nodes were dropped. Mara's point about the bare group numbers applies here too. A number I can't explain doesn't go in Figure 3.

On fit: the recipe storyboard is closest to how I work, since I set the colours once and the lab reuses them. Red-blue is fine for my PI. What I can't see yet is where the midpoint of the gradient sits. I agree with Alex that I need to see that nothing gets uploaded, because unpublished data can't leave my laptop.

On what's missing: where does the network come from? Tom already has one. I have a gene list, and I need the STRING query, the clustering and the enrichment. If I have to leave the tool for those, I'll stay in Cytoscape. The other researcher is right that "force-directed" isn't something I can put in a methods section.

**Dr. Chen:** The "84 of 96 matched" frame is the only thing so far that treats identifiers as the real problem. I agree with our genomics colleague there. But look at what it admits: TP53BP1 is in the network as 53BP1 and nothing on screen says so, because there is no gene dictionary. That is a silent false negative. At STRING scale, with Ensembl, UniProt and STRING IDs mixed together, that is my whole afternoon. Tell me which namespace it matched on and which alias table, or I'm redoing it in R.

On trust: "Betweenness, over the filtered graph" is better than Cytoscape gives me. For a report I'd still need it weighted or unweighted, normalized or not, the filter written out (confidence >= 0.7), and a table I can pull into R and check against igraph. Mara is right that "Force-directed" isn't a method.

What's missing: a scripting path. Without an RCy3 equivalent, this is a Friday-afternoon toy. Also a 10,000-node test. Alex's upload question is mine too, since unpublished data goes nowhere.

**Alex:** I'll stick to the trust question, because that's the one I lose sleep over. Mara and the researcher are both asking which algorithm "Force-directed" actually is. I'm less bothered by that, since nobody in my director's meeting asks about layout parameters. What they do ask is "why is this depot the bottleneck?" So I'd want the metric row to show the scope, the variant and whether it's weighted, and then show the same thing again in the CSV I export, not only on screen. If "betweenness, over the filtered graph" comes out as a column header, I can cite it. If it only lives in a panel, I'll screenshot it and still get asked about it.

On fit: my Monday is re-running last month's picture on fresh data. The recipe storyboard might be exactly that, but it read like a manual. I'd need to see it restore my colours and layout on a new CSV in one step. Gephi Lite lost those, and I stopped using it for that reason.

What's missing for me: a plain statement that my file stays on my machine, and Louvain giving me the same groups twice. I'm with the genomics user on the legend, too. "Group 2" can't go in a deck.

### Round 3 -- switch, quit, the one change, what we did not ask

**Mara:** **What would make me switch:** a GEXF file that goes in and comes back out with nothing lost. That means my modularity classes, my colours and my positions, and a Louvain run with a seed I can type into a methods section. On top of that, the layout has to be named: "ForceAtlas2, LinLog on, gravity 1.0, scaling 10", and those settings travel in the file. If the SVG then carries the legend with real group names, my Inkscape step is gone. Alex has the right test with Gephi Lite. Restore my picture on fresh data in one step and I'll teach this next autumn.

**What would make me quit:** refusing to draw my 23k-node retweet network. A "nodes not drawn" count isn't a feature to me, it's the tool admitting it can't do the job. Losing an hour's layout would also do it, since undo is the one thing Gephi never gave me.

**The one thing to change:** I disagree with Alex that layout parameters don't matter. The layout is the argument in my field. Tomas and I agree on this.

**What you didn't ask:** will my students' screens at 1280x800 show all of it?

**Maren:** **What would make me switch:** I paste my 300 gene symbols, or drop in the DESeq2 CSV, and inside ten minutes I see three things. First, how many genes matched, and the names of the ones that didn't. Second, the network coloured by log2 fold change, with zero at the midpoint and not washed out by one outlier. Third, a PDF with the legend already in it. The "84 of 96 matched" frame is the closest anything has come to that. But I've only seen it on a storyboard, not on my own genes.

**What would make me quit:** a single gene silently left out. The researcher's 53BP1 example is exactly what I mean. If TP53BP1 is sitting in the network under another name and nothing tells me, I can't trust any count on the screen after that.

**What I'd change:** I agree with Alex. I need a sentence I can read before I load anything, saying my data stays on my laptop.

Even if all of that works, the STRING query, the clustering and the enrichment still have to live somewhere. As things stand, I'd use this to look around, and the Figure 3 panel would still come out of Cytoscape. My PI knows how to cite Cytoscape.

**Dr. Chen:** What would make me switch is the recipe storyboard, if it actually works. Reviewer 2 asks for 0.4 instead of 0.7, I change one number, and I get the same figure back with the same colours. Alongside it I need a TSV of the node table with the measures in it, headers like Alex described with scope and variant in them, that I can join onto my R data frame. Add a documented way to drive all of that from R or Python and I'd move figures out of Cytoscape. I would not move my analysis.

What would make me quit is a number I can't reconcile. I paste 2,000 seeds and it says 1,940 nodes. If it can't tell me which 60 went missing and why, I stop there. The same goes for a TP53BP1 dropped without a word.

Mara, I disagree with you about the Les Mis sample. It's fine for teaching, but it tells me nothing about whether the tool can take 10,000 STRING nodes.

Maren is right that enrichment matters, but I'd rather it didn't live in here. Let me take the modules out to clusterProfiler and bring the terms back as a column. The one change I'd make: put the data source, its version and the cut-off on the frame, next to the counts.

**Alex:** Here's what would make me switch. I run the Gephi half of my Monday again on a fresh CSV, it lays out the same, the colours come back the same, the group names I typed last month are still there, and the counts match my SQL. If one step does all of that, it replaces a morning. I'd also switch for the metrics CSV carrying the "betweenness, over the filtered graph" label in the header, which Mara and I both asked for.

Here's what would make me quit. Louvain gives me different groups on the second run and nothing on screen says so. Or IT asks me where the supplier file went and I can't point to a line in the tool that says it never left my laptop. Either of those and I'm back in Gephi that afternoon, and I don't come back.

The one change: put a plain "your file stays on this machine" line on the frame at rest, before I load anything. The researcher and Maren raised the same thing, and for all three of us it comes before any of the analysis. I agree with Mara on the group numbers but would go further. Let me rename "Group 2" once and have the name stick.

## Themes

How to read this section. "Independent" means the participant raised it in the solo round-1
note, before hearing anyone. "Endorsed" means they raised it only after someone else had. An
independent voice counts for more than an endorsement. Severity is Nielsen's 0-4 scale
(0 not a problem, 4 usability catastrophe) and is a judgement on the design as shown, not on
how loudly it was argued.

### 1. Group colours are bare numbers, and group names must stick -- severity 3

- Independent: all four (Mara "Gephi's random modularity-class problem", Maren "numbers, not
  meanings", Dr. Chen "labelled 2, 8, 4, 1", Alex "Is 2 the biggest group?").
- Extended: Alex wants to rename a group once and have the name persist across refreshed data;
  Mara wants real group names in the exported SVG legend.
- Dissent: none.
- Discount: part of this is the sample data -- the Les Miserables file really does carry numeric
  groups. The design question that survives is whether the app lets a person name a category and
  carries that name into the legend, the export and the next dataset. The strongest finding in
  the session because it arrived four times before anyone spoke.

### 2. Exported numbers must carry their provenance -- severity 3

- Independent: Dr. Chen (data source, version and cut-off missing at rest).
- Raised in round 2 without prompting on this exact point: Mara and Alex both asked that the
  scope label ("betweenness, over the filtered graph") travel into the CSV column header; Alex
  added variant and weighting. Dr. Chen then asked for the same headers in a TSV he can join in R
  and check against igraph. Maren and Mara both asked for the filter written out in words
  ("confidence >= 0.7", how many nodes dropped), not "1 step".
- Dissent: none. Maren adds a comprehension gap: she does not know what betweenness means and
  would need a plain explanation to defend it to a reviewer (single voice, but a predictable one
  for a non-specialist).
- Positive evidence: the results panel's scope, "Exact. Unweighted, undirected.", the
  out-of-date card with "Re-run all", and the closeness correction note were praised by Mara and
  Dr. Chen as better than either tool they use today.

### 3. "Force-directed" is not a method; the layout must be named with its settings -- severity 3

- Independent: Mara (is it ForceAtlas2, can I set LinLog, gravity, scaling) and Dr. Chen (not a
  method I can write up).
- Endorsed: Maren, round 2 ("the other researcher is right"). Discount her voice -- she did not
  raise it herself and her own asks are about identifiers and colour, not layout.
- Dissent: Alex, explicitly -- his director never asks about layout parameters. Mara answered in
  round 3 that in her field "the layout is the argument". Real segment split, not a
  disagreement to resolve: the name and settings must be recorded and exportable (Mara wants them
  in the file), but need not be prominent.

### 4. "Your data stays on this machine" must be visible before loading -- severity 3

- Independent: Alex only (round 1: looked for it before loading supplier data).
- Endorsed: Maren and Dr. Chen in round 2, both with their own reason (unpublished data), and all
  three named it as their one change or a quit trigger in round 3.
- Silent: Mara.
- Discount: one originator. Alex's round-3 "for all three of us it comes before any of the
  analysis" is consensus framing he built himself. Still rated 3 because for Alex and Maren it is
  a gate on loading anything at all, and it is cheap to satisfy.

### 5. Identifier matching must never drop a gene silently -- severity 4

- Independent: Maren (round 1, on the "84 of 96 matched" frame: praised the named unmatched list
  and the "looks like a date" flag).
- Raised in round 2: Dr. Chen found the hole in that same storyboard -- TP53BP1 is in the network
  as 53BP1 and nothing says so. He wants the namespace and alias table named. Maren adopted his
  example in round 3 as her quit trigger. Dr. Chen's own quit trigger is the general form: 2,000
  seeds in, 1,940 nodes out, and no list of the missing 60.
- Dissent: none.
- Why 4: a silent false negative invalidates every count downstream, and both biologists said
  they would stop trusting the tool entirely. Only two voices, but both are in the segment this
  flow exists for.
- Discount: both judged a storyboard, not a working flow. Maren said so herself.

### 6. Reproducibility: same groups twice, same picture on fresh data -- severity 3

- Seeded community detection: Mara (round 2, round 3, wants the seed in a methods section) and
  Alex (round 2, round 3 quit trigger: different groups on a second run with no warning).
  Independent of each other.
- Restore the whole picture on new data in one step (layout, colours, group names): Alex
  (Gephi Lite lost it and he left), Dr. Chen (change one cut-off, same figure back), Mara
  (endorsed Alex's test). Maren says the recipe storyboard is closest to how her lab works.
- Scripting path from R or Python: Dr. Chen (without it "a Friday-afternoon toy"); Mara ("a
  result I can't rerun from a script isn't one"). Alex and Maren did not ask.
- Dissent: none. Caveat: Alex found the recipe storyboard "a wall of text" and "read like a
  manual" -- that is about the storyboard as a presentation, and it means the one flow three
  participants wanted is the one they understood least. Re-present it before judging it.

### 7. Scale: not drawing the graph reads as failure -- severity 3

- Voices: Mara (23k retweet network; "124,318 nodes not drawn" is not the map she came for; a
  quit trigger) and Dr. Chen (wants a 10,000-node STRING test). Both independent, round 1.
- Silent: Alex and Maren.
- Note: Mara's objection is to the framing as much as the limit -- a count of what was not drawn
  reads as the tool admitting defeat. Worth testing whether a drawn overview at scale changes her
  answer. The sample (77 nodes) gave no participant any evidence either way.

### 8. The entry point assumes you already have a network file -- severity 3 for one segment

- Voice: Maren (round 1: "I don't have a network file. I have a gene list and a DESeq2 table";
  round 2: needs the STRING query, clustering and enrichment).
- Dissent: Dr. Chen wants enrichment kept out -- export modules to clusterProfiler and bring terms
  back as a column. Maren's closing position is that even if all else works, Figure 3 still comes
  out of Cytoscape. A real split within the biology segment; the safe reading is "import a
  gene list and a results table, and round-trip columns cleanly", not "build enrichment in".

### 9. Legend on the canvas, if it exports -- positive, conditional

- Independent: Mara (SVG, removes her Inkscape step), Maren (PDF), Dr. Chen (no Illustrator
  rebuild). All three phrased it as "if it comes out in the export". None has seen an export.

### 10. Counts at rest earn trust -- positive

- Independent: all four checked the node, edge and component counts first; Maren, Dr. Chen and
  Alex named the counted isolate; Mara named the "Full graph" scope chip; Dr. Chen named
  "undirected, weight: value". Alex's condition: the counts must match his SQL or he leaves.

### Single voices (watch, do not act on alone)

- Diverging colour ramp must be centred on zero and not washed out by one outlier (Maren).
- "Styles" and "Base style" sound like developer words (Alex).
- Will not touch "Assistant" (Mara).
- Why is there a 2D/3D switch at all (Dr. Chen; Mara read "2D" as 3D lurking; Maren was relieved
  it did not open in 3D) -- three mentions, but mild and not a request.
- GEXF in and out with nothing lost (Mara) -- single voice, but it is her entire switch
  condition and the obvious test for every Gephi user.
- Undo for a lost hour of layout (Mara).
- Will it fit a 1280x800 classroom screen (Mara).
- None of the storyboards is about their work (all four) -- see discounts below.

## Group-think and fidelity effects to discount

- **Echoed agreement.** "X is right" statements rose each round. Discount endorsements that
  arrived without a new reason: Maren on layout naming, Alex's "all three of us" on local data,
  Mara's "Tomas and I agree". Keep endorsements that brought their own reason (Maren and
  Dr. Chen on unpublished data).
- **A dissent that was not one.** Mara "disagreed with Priya" and Dr. Chen "disagreed with Mara"
  over the Les Miserables sample, but both said the same thing: fine for teaching, proves
  nothing about scale. Treat as agreement.
- **Anchoring on one storyboard frame.** Two of the strongest threads (identifier matching and
  the 53BP1 hole) come from a single frame, "84 of 96 matched". The group converged on it because
  it was the only biology-shaped thing shown, not necessarily because it outranks everything else.
- **Mock fidelity, not design.** Numeric group labels come from the sample file. "Wall of text"
  is the recipe storyboard's presentation. Every positive on export (legend in SVG/PDF, headers in
  CSV) is a promise no participant could check. Scale and identifier matching were judged on
  claims, not on data.
- **Storyboard casting.** All four said the fraud storyboard was not theirs. That is a note about
  which stories were shown to this group, not evidence the design ignores them; Dr. Chen's "a sign
  of who this was designed for" is a perception risk for the public site and docs, not a
  usability defect.
- **Simulated participants.** Their positions are consistent and well argued, which is itself a
  warning: real switchers are less articulate and more distracted by the first thing that breaks.
  Confirm themes 1, 2, 5 and 6 with task-based sessions on real files before changing the design.
