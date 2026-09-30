# Two runs of one ranking, compared -- Dr. Min-ji Kim, knowledge graph engineer

Participant: Min-ji Kim, knowledge engineer and ontologist (persona file
study/personas/knowledge-engineer.md). Expert with graphs, SPARQL and pandas; skeptical of any
number without a method behind it; deuteranomalous. She did this same task in the previous round
and remembers roughly what bothered her.

Task as the moderator read it: "Yesterday you ranked the Les Miserables characters one way. A
colleague asks you to rank them again with one thing changed, and to tell her what differs between
the two rankings and how each was made."

Screens used: screens/navigation, screens/results-panel, screens/comparison, screens/table-dock, all
in the study view (design notes hidden). Renders: shots/record/r6-minji-trc-navigation.png,
shots/record/r6-minji-trc-results-panel.png, shots/record/r6-minji-trc-comparison.png,
shots/record/r6-minji-trc-table-dock.png.

## Think-aloud

### 1. Finding yesterday's ranking

(Navigation, Les Miserables, the frame with Results open on the left.)

"Les Miserables, Co-appearances, 77 nodes, 254 edges, density 0.0868, one component. Same as last
time, and still right for the Knuth graph. Good."

"Results on the left: 'Every run of a measure, with its settings and date. Newest first.'
Betweenness, today 14:02, 'Exact, normalized, no weight. Full graph, 77 nodes.' Then Bridges,
27 Sep. Last time this list only had Bridges and I had to go and find the betweenness in the
table. Now it is the first row, and the row itself says exact, normalized, unweighted, full graph.
That is the four things I need to identify a run, on one line. The mock says 'today' and my task
says yesterday -- I will pretend."

(Opens the Betweenness row.)

"'Ran on the full graph, 77 nodes. No weight: every edge counts the same.' Settings: method exact,
every node; normalized yes; edges undirected; weight none; ran 29 Sep 2026, 14:02. Top nodes:
Valjean 0.57, Myriel 0.177, Gavroche 0.165. Re-run and Compare with... under the settings."

"'No weight: every edge counts the same.' That is the correct sentence. A tool that says that out
loud is not going to silently use 'value' behind my back."

"Normalized -- by what? On the other screen, the run record with Details said 'divided by
(n-1)(n-2)/2'. This one has no Details link. So on this panel I get five settings and on the
other panel I get a full run record with Brandes named, the normalization with n, the engine and
Copy. Which one is the product? I am going to assume Details exists here too, because I need it
for 'how each was made'."

(Checks the table under the canvas.)

"Table sorted by betweenness: Valjean 0.57, Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine
0.13, Thenardier 0.075. And in the table dock the column group header says 'Betweenness exact,
unweighted, full graph', value and rank of 77: Valjean 0.570 #1, Gavroche 0.165 #3, Marius 0.132
#4. The numbers agree across the list, the record and the table. That matters more to me than
anything else on this screen. Yesterday's ranking: found, and I trust it."

### 2. Deciding the one thing to change

"The obvious change is still the weight. The Data place says 'Edges: value, 254. Weight: value,
not used yet.' So the tool knows 'value' exists -- the chapter co-occurrence count -- and has not
used it."

"The question I had last round: used HOW. For betweenness a weight is a length. A pair of
characters who share twelve chapters are close, not far, so the count has to be turned into a
distance or the ranking is backwards."

"This time I see the tool has that idea. On the protein graph the Overview says 'edges
undirected; confidence, used as similarity', and the Louvain record says 'confidence used as
given, 0.40 to 0.99, as similarity: higher = stronger link'. And there is a 'Review out of date'
box: 'Shortest path used confidence as a distance. It is now used as similarity. Re-run to
update. Betweenness and Closeness did not use the weight, so they stay current.' So the meaning
of a weight is a property of the graph, it is recorded, and changing it marks the runs that
depended on it as stale. That is exactly the right design. I am honestly a bit impressed that
someone thought about the dependency."

"What I still cannot see: for Les Mis, 'value, not used yet. Change...' -- Change goes where? I
guess it opens the same weight choice with 'as similarity' or 'as distance'. I would pick
similarity. And then what does betweenness do with a similarity? 1/value? max minus value? The
shortest-path box says the path 'used confidence as a distance' before and 'as similarity' now,
but not what the conversion is. For Louvain it does not matter, modularity takes the weight as
given. For betweenness it is the whole answer. So I am about to run it and I do not know what
the second ranking will mean."

"If I could not find that out, I would change the scope instead of the weight. There is already a
Les Mis betweenness on 'Filtered graph, 60 of 77: after Filter to degree >= 2', and its record
says exactly what it did. That is a change I can explain to her. But she asked for one thing
changed and the interesting one is the weight, so I continue with the weight and flag it."

### 3. Running it again with the weight

(Results panel frames, the patent and protein graphs, read as the pattern.)

"The run page has an Options section with a settings icon. Clicking it opens 'Betweenness
options -- Options wait for Re-run': Scope, Weight dropdown. I pick 'value' where it says
confidence. The typo state is still there: 'unknown attribute confidnce; Closest: confidence'. It
does not auto-correct for me. Good."

"On PageRank, changing damping to 0.7 says 'Damping 0.7 has not run. Run queues it after this
run, and keeps Run 1', with Run, 'under a minute' and Reset. And the button on the page reads
'Re-run (keeps Run 1)'. Last round I had to infer that yesterday's run survives. Now the button
says it. That was the thing I most needed to be sure of before clicking."

"'Runs of this measure 2: Run 2 damping 0.5, running 62%; Run 1 damping 0.85, shown.' Then the
failure frame: 'Run 2 could not finish: WebGPU was lost. Showing Run 1 (damping 0.85). Run 2
wrote nothing.' I like 'wrote nothing'. A half-written column would be the worst possible outcome
and it tells me it did not happen."

"What I still do not see: 'shown' next to Run 1. Can I click Run 2 in that list and read its top
nodes, and click back to Run 1? It looks like a list of runs with one marked, so I assume clicking
one shows it. No frame shows that. Minor now, because the comparison covers it."

"And on the Les Mis page in the navigation screen there is no Options section at all -- just
Re-run and Compare with. If I only had that page I would click Re-run and get the same run again.
The results panel has the right thing; the navigation page looks like an older version of it."

### 4. Comparing the two runs

"'Compare with...' on the run list. The picker: 'Earlier runs of PageRank: PageRank, damping
0.85, Sep 28 10:14' at the top, highlighted. Then 'Other runs on this graph: Betweenness
(sampled)...', then 'The same run on another data version...'. There it is. The entry I said was
missing last round is now the first thing offered. For my case it would say 'Earlier runs of
Betweenness: Betweenness, no weight, today 14:02'. That is the whole task in one click."

"On the comparison screen there is a second picker, a different one: 'Compare PageRank with',
with a search box, 'PageRank, damping 0.5 -- Run 1', 'PageRank on March data', 'Betweenness --
Not run', 'Degree'. Same job, flat list, different look. And 'Betweenness, Not run' in a compare
list -- what happens if I pick something that has not run? Does it run it? I would not click that
without knowing. Two pickers for one action is sloppy, but both offer the earlier run, which is
what counts."

"The comparison itself, the damping frame: title 'PageRank at damping 0.85 and 0.5'. Each side
named by the one thing that differs: 'Damping 0.85 -- PageRank run 2. Unweighted, directed.
Details' and 'Damping 0.5 -- PageRank run 1. Unweighted, directed. Details'. Differences:
'Ranked higher at [Damping 0.85 | Damping 0.5]'. Last round the sides would both have been called
'PageRank'. Now they are named by the setting. For me it would be 'Betweenness, no weight and
value', sides 'No weight' and 'Weight value'. That is correct naming."

"Agreement: 'The rankings agree at the top. Spearman 0.998, leaving out the 1,153 accounts tied
at the bottom of both (1.000 with them)'. On the big scatter frame there is top-k overlap at
5/10/20/50/100 and the About Spearman note: ties take the average of their ranks, and the tied
block at the bottom inflates agreement, so the first number leaves them out. That is the caveat
I would have written in my notebook. It is correct and it is short."

"One thing that made me stop: on the citation graph, Run 1 was damping 0.85 and Run 2 was 0.5.
On this payments comparison Run 1 is 0.5 and Run 2 is 0.85. Different project, so it is not a
contradiction. But the run numbers are the only thing I would quote to a colleague besides the
setting, and I had to check twice. Put the date next to the run number in the comparison header
and nobody has to check."

"How each was made: 'Details' under each side, which opens a run record -- method, seed,
damping, normalization, weight conversion, iterations, scope, and Copy. Two Copies and I have
both methods. That answers the second half of her question."

### 5. The table and the export, as the thing I actually send

"In the table, each run is a column group with its method in the header: 'PageRank damping
0.85, unweighted, full graph', 'Betweenness exact, unweighted, full graph', value and rank of
N, and a sentence above: 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part...'
with 'Compare rankings...'. For Les Mis: 'Valjean is #1 on both measures. At #2 they part:
Gavroche by degree, Myriel by betweenness.' So after my weighted run I expect a second
betweenness group, 'Betweenness exact, weight value, full graph'. It is not drawn with two runs
of the same measure side by side, but every header I see follows the rule, so I believe it."

"'Near tie: the next rank's value is within 1%, so a small change in the data could swap them.
= marks an exact tie.' And '#6, near #7'. That is the most useful thing on this table for my
colleague: it tells her which rank changes between my two runs are real and which are noise."

"The Les Mis filtered frame: the betweenness column header shows 'Out of date -- Re-run' when the
filter changes, and keeps '0 to 0.57' and 'of 77'. So the column says it was computed on the full
graph and has not been redone. It does not quietly recompute. Good."

"Export: 'Methods: Always written beside it. The first column is the file's own id. Each run's
columns carry its method and scope in the header, as in the table.' File name
ppi-core-300-nodes.csv, 'Beside it: ppi-core-300-nodes-methods.txt'. That is what I send her: the
CSV with both columns, the methods file, and the saved comparison. She can redo the Spearman in
Excel if she does not trust me, and the methods file tells her how to."

### 6. Answering the colleague

"What I would send: the saved comparison titled by the change, both run records copied, the
agreement line with and without the tied block, the 'ranked higher by' list for each side, and
the CSV with the methods file. Everything in it came from the tool and nothing was invented."

"What I would have to write myself, in a sentence she will ask about: how the weight 'value' was
turned into a length for betweenness. The tool now clearly knows the difference between a
similarity and a distance and records which one it used. It just never shows me what it does to
a similarity when the algorithm needs a length. Until a weighted betweenness record says 'value
used as similarity, length = 1 / value' or whatever it is, I would verify the weighted ranking
against networkx before sending it. If I have to do that, I am back in the notebook."

## Where she got stuck or guessed

1. **How a similarity weight becomes a length for betweenness is never shown.** The tool now
   records whether a weight is used as similarity or as distance (Overview line, Louvain record,
   the out-of-date review), but no drawn record of a weighted shortest-path measure says what
   conversion was applied. For this task that one fact decides whether the second ranking means
   anything.
2. **"Change..." on "Weight: value, not used yet" goes nowhere she can see.** She assumed it
   opens the similarity-or-distance choice; nothing on these four screens shows it.
3. **The Les Mis run page in the navigation screen is thinner than the run page in the results
   panel.** No Options section, no Details run record, no "Runs of this measure" list. From that
   page alone, Re-run would repeat the same run. She read it as an older version of the product.
4. **Two different "Compare with" pickers.** One grouped ("Earlier runs of PageRank", "Other runs
   on this graph", "The same run on another data version..."), one a flat searchable list that
   also offers "Betweenness -- Not run", with no hint what picking an unrun measure does. She
   would not click it.
5. **Run numbers flip between projects.** Damping 0.85 is Run 1 on the citation graph and Run 2
   on the payments comparison. Not a contradiction, but the run number is what she would quote,
   and the comparison header does not carry the date beside it.
6. **Switching the shown run is still unshown.** "Run 1 ... shown" implies she can pick which run
   the panel shows; no frame shows it.
7. **Two weighted-by-nothing betweenness runs exist for Les Mis** (full graph 0.570 at 14:02,
   filtered 60 of 77 at 0.419 on Sep 28). Scopes tell them apart; she no longer had trouble
   deciding which was "yesterday" because the Results list names the full-graph one first.

## What worked

- The Results list now shows yesterday's betweenness with "Exact, normalized, no weight. Full
  graph, 77 nodes" on the row; last round it was missing from the list.
- "No weight: every edge counts the same" -- the right sentence, said out loud.
- The same numbers (0.570, 0.177, 0.165) in the list, the record, the inspector and the table.
- "Re-run (keeps Run 1)" and "keeps Run 1" in the queue message: yesterday is not overwritten, and
  the button says so before she clicks.
- "Run 2 wrote nothing" on a failed run.
- The compare picker offers "Earlier runs of <measure>" first -- the entry she needed last round.
- Comparison sides named by the setting that differs ("Damping 0.85 | Damping 0.5"), each with
  Details to a run record.
- Spearman with and without the tied block, top-k overlap, and a short correct explanation.
- Weight meaning (similarity or distance) is a recorded property of the graph, and changing it
  marks dependent runs out of date while saying which runs did not use the weight.
- Table headers carrying method, weight and scope; the near-tie line; the out-of-date mark on a
  column after a filter; CSV export with a methods file beside it.

## Single Ease Question

**5 of 7.** "The two things that stopped me last time are fixed: the picker offers the earlier
run, and the comparison names the sides by what I changed. Running it again without losing
yesterday is obvious now. It is not a 6 because the one thing I changed is the weight, and I
still cannot see what the tool did with it, and because the Les Mis run page and the results
panel look like two different products."

## Would she use this instead of her current tool?

"For this job, for this colleague -- yes, I would send her the saved comparison and the CSV with
the methods file instead of a notebook she cannot read. The run records and the comparison are
better documentation than what I write in a notebook cell. Instead of my notebook for myself --
not yet. I would still recompute the weighted betweenness in networkx to check the conversion,
and as long as I am doing that, the notebook is the source of truth. Show me the weight
conversion in the run record and I would stop checking. And none of this touches my real graph
until it reads Turtle; for me it remains a tool for flat exports and demo data."
