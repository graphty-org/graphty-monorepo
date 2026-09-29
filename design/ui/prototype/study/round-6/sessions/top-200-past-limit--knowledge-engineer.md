# Session: the 200 most in-between patents, past the drawing limit -- Dr. Min-ji Kim

**Participant:** Min-ji Kim (fictional), knowledge graph engineer and ontologist; SPARQL in a
triple store workbench, rdflib and pandas in notebooks, networkx when she needs a graph measure.
See ../../personas/knowledge-engineer.md.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order:** the not-drawn patent graph, its filter steps, Keep top rows, the kept 200,
a rule, the drawn rule result, the most-cited-plus-neighbors state and the editors shown below
the frame (screens/past-drawing-limit.html); Quick actions, the refused betweenness run, the
finished sampled run with its run record, a finished run opened in the table, the no-WebGPU run
(screens/results-panel.html); the betweenness options over the time limit and a 500-source sample
(screens/option-form-cost.html); the table dock ranked, at a large size and with a set column
(screens/table-dock.html); Find with a patent selected and Quick actions by question
(screens/find.html); a selection over the drawing cap (screens/selection-over-cap.html).
Viewed at 1440 x 900 in the participant view.

**Renders she saw:** shots/r6-minji-t200-pdl-not-drawn.png, -pdl-narrow.png, -pdl-keep.png,
-pdl-kept.png, -pdl-rule.png, -pdl-drawn.png, -pdl-sample.png, -pdl-insets.png (the editors below
the frame), -rp-quick-actions.png, -rp-refused.png, -rp-finished-sampled.png, -rp-in-the-table.png,
-rp-cpu-path.png, -ofc-over-budget.png, -ofc-sample-over-budget.png, -td-ranked.png, -td-large.png,
-td-limit.png, -find-s7.png, -find-s8.png, -soc-e1.png (all under shots/, prefix
r6-minji-t200-).

**Outcome:** finished, with difficulty. She reached a sampled betweenness ranking and a one-hop
neighborhood of a patent. The one contradiction that stopped her last time -- directed or
undirected -- is still on the finished run, so she would not hand the 200 to anyone. Keeping the
top 200 by that estimate is still something she has to imagine: no screen shows it.

---

## Think-aloud transcript

**Reading the task.** "Same task as before. 'Most in between' is betweenness. On a citation graph
I want to know first: directed or undirected. Directed, a patent is in between if older work flows
through it into newer work. Undirected, anything cited by two unrelated families looks like a
bridge. Different question, different list. And it is not the most cited. Let me see if they
fixed what I complained about."

**First frame, not drawn.** "124,318 nodes not drawn, more than 50,000, every node counted in
Statistics and listed in the table. Still good. It did not hang and it did not draw a random
sample and call it my graph. Nodes 124,318, edges 1,480,221, isolates 2,406, 3,912 weak
components, the big one 116,905, 94.0 percent. Consistent with last time."

"And the same thing I pointed at: the table's first row, 6117075, citationsReceived 779. The
in-degree chart says max 236. The line under the chart now says in-degree zero means 'never cited
by a patent in this sample'. That hints at it. It does not say that citationsReceived counts
citations from outside the sample. The column header just says '0 to 779'. A stakeholder puts
those two numbers side by side and asks which is wrong. Put the sentence on the column."

**Narrow the graph.** She opens it. "Filter steps. Suggested: keep top rows by citationsReceived,
and neighbors of a node. Still no betweenness here, because betweenness has not been run. Fine,
it cannot suggest a column that does not exist. But the first thing it hands me is 'most cited'.
If I were in a hurry, I would take it and answer the wrong question." She backs out.

**Finding betweenness.** "On this screen the toolbar has a lightning bolt with no word. On the
other screens the same button says 'Quick actions'. Make up your mind -- I would rather it said
the word everywhere." She hovers, gets Quick actions, types centrality. "Betweenness, hours.
Closeness hours, harmonic hours, PageRank under a minute. Cost before I press anything. Good."

"Results on the left already lists 'Betweenness (sampled), 101 sources, Sep 28 09:52'. So a run
exists. Whose? Mine from yesterday? It has a date now at least. I will accept it is from an
earlier session in this project."

**Refused.** She presses Enter on Betweenness. "'Not run: would take about 10 hours. The time
limit is 30 seconds.' Refused, not started. Good. Then, grey: 'On the full graph, 124,318 nodes;
the directed citations read as undirected.' Again. It decided the direction for me, in the
small print, and there is no control on this screen. Where do I say directed?"

"Routes: Sampled, 101 sources, under a minute. Exact on the 5,318 nodes in Drug patents granted in
2001 -- and in bold, 'This is a different graph.' Thank you. That is exactly the warning I wanted:
the top of a subset is not the top of the graph. That one is fixed."

**The options form.** She opens the other route into the same measure. "Here the warning says
'Directed, on the full graph'. Direction field: 'As the graph: directed'. So the form says
directed and the refused panel says read as undirected. Same run, two answers, still. I would set
directed here, explicitly, because at least there is a field."

"Sample size 500: 'a few minutes, past the 30-second limit, run starts in the background. 101 is
the largest that fits.' Seed 7 with a re-roll. I would type 500 and let it run -- 101 sources for
a top 200 is thin; the top ten will hold and position 200 will be noise. The past-the-limit list
even offers 'Sampled, 500 sources, a few minutes' as its own row. That is nice: I did not have
to know that the field existed." The only finished run she can see is 101 sources, so she reads
that.

**The finished sampled run.** "'Sampled, 101 sources. Directed. WebGPU.' Top nodes, estimated:
#1 5879702 at about 0.0160, #2 about 0.0037, then #3 to #7 as one tied range. 'Ranks below #2
may swap between runs.' Honest. The first one is clearly first."

She opens Details. "Run record. Method: Brandes from 101 random sources, scaled up by 124,318
over 101. Seed 7. Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph.
Error bound plus or minus 0.00035. Direction: 'Citations read as undirected'. Engine WebGPU, 29.9
seconds."

She stops. "Nothing changed. The summary line says Directed. Options below says Direction:
Directed. The run record says undirected, and the normalization is the undirected one. That is
the record I would paste into a methods section, and it contradicts the header two inches above
it. Zero: about 79,554 nodes -- that smells directed, since 41,873 patents are never cited and
sit at zero on directed paths. So I still think the record is the wrong one. But I am reverse
engineering the tool's own output from a zero count. I would file a bug before I used this. I
said this last time."

"29.9 seconds against a 30-second limit, on WebGPU. My work laptop has no WebGPU. The CPU example
is 300 proteins. Does 101 sources still fit on the CPU, or does the offer shrink to 20? I cannot
tell until I press it."

**Getting 200 of them.** "'124,313 more in the table.' 5 plus 124,313 is 124,318. Good." She
follows it. There is no screen of the patent table sorted by this betweenness, so she looks at
the protein one. "A betweenness column headed 'exact, unweighted, full graph', a rank column 'of
300', and now 'near #7', 'near #10' where values are within 1 percent, and '=' for exact ties.
That is good. That is exactly the idea I asked for -- ranks that say when they are
indistinguishable. For the patents it should be 'sampled, 101 sources' in the header and 'near'
marks driven by the error bound, not by 1 percent. I assume. I cannot see it."

"Then Keep top rows. 'Keep the first 200 rows, in the table's order', column and Highest first.
I pick betweenness and 200. On citations it says 'Row 200 has 358; 1 more patent also has 358 and
is left out.' For an exact column, perfect. For an estimate with plus or minus 0.00035, the
sentence I need is 'how many rows past 200 are within the error bound of row 200'. If the table
now has 'near' marks, the Keep editor should say how many 'near' rows the cut leaves out. It does
not, because no screen shows Keep top rows over a sampled measure. So 'the 200' is exactly as
soft at the bottom as it was last round, and nothing tells me how soft."

"Keep these 200 rows. The kept state: one step, Undo, chip '200 of 124K nodes, 1 step'. 'Describes
the 200 most cited patents, not a random sample. Density reads high.' That sentence is still the
best thing on the page. The 124K is still rounded while everything else is exact."

**Who surrounds the first one.** "The kept popover offers 'Add their neighbors, 1 hop, both
directions'. Below the frame I can see its editor now: 'Of the 3 patents the step above keeps',
and Scope: 'Keep top 3 by citationsReceived', 586 nodes, 893 edges. So the scope line does name
the step above now, and 586 is far more than 3, so neighbors reach outside the kept set -- into
the full graph. That answers half my question from last time. Good."

"But it is 'their' neighbors, all of the kept ones. I want the first one. For that there is
'Neighbors of a node': Around 6117075, 1 hop, both directions, 242 nodes, 348 edges, will draw.
241 neighbors plus itself; the degree chart max was 241. Checks. But its Scope says 'Full graph,
no steps above' -- that is the only version I can see. If I add it after 'keep top 200', does it
look for neighbors of the first patent in the full graph, the way Add their neighbors does? Or
only among the 200? The two editors look alike, and I have seen one answer for one of them. I
would guess full graph. I would check the count."

"Also: the first row, not 6117075. 6117075 is the most cited. The first by betweenness is
5879702. I would have to change 'Around' to that. Fine -- I can type it."

She tries Find instead: types the patent, selects it. "Inspector: 'Not drawn: the graph is past
the drawing limit. Counted everywhere.' grantYear, category, citationsReceived. Two icons at the
top, no words. One of them, the funnel, I guess is Filter to neighbors. I would hover. Same scope
question."

"Both directions is the default. On a citation graph I want them apart -- who it cites, who cites
it. The dropdown allows that, so I would run it twice."

**The drawn neighborhood.** She looks at the most-cited-plus-neighbors drawing. "Three hubs,
their stars. Pretty. And it is the most cited, not the most in between. That is the drawing you
get if you accept the first suggestion. The statistics say 'Describes the 3 most cited patents
and all their neighbors, favors hubs.' At least it does not pretend otherwise."

---

## Single Ease Question

**4 out of 7.** "Better in three places: the 'different graph' warning on the subset route, the
500-source route offered as a row, and the neighbors step now naming the step above in its
scope. Same score, because the thing that stops me did not move. The run says directed in its
header and undirected in its record. I cannot see how soft the cut at 200 is on an estimate. And
I still have to guess whether 'neighbors of a node' after a keep step looks past the 200."

## Would she use this instead of her current tool

"Not instead. Next to. The ranking I would still compute in a notebook -- networkx betweenness
with k, a seed and directed=True printed on the line -- because nobody argues with that. What I
do not have is the next step: who surrounds a patent, counted before it commits, drawn when it
fits, with a sentence that says what the subset is biased toward. That I would use and show.

"But I will not put a betweenness list from here in front of anyone while its own record says it
read the citations as undirected and its header says directed. One mismatch, and every number is
suspect. Fix that, put the error bound into the Keep editor, and I would run the whole thing here.

"And this is still a property graph from a CSV. Fine for patents. Not my knowledge graph."

---

## Problems observed

1. **The sampled betweenness run still states two directions.** Results panel, finished sampled:
   the summary line and Options say "Directed"; the run record says "Citations read as
   undirected" and normalizes by the node pairs of an undirected graph. The refused panel says
   "read as undirected"; the options form says "As the graph: directed". Unchanged from the last
   round. Severity: high -- she will not publish the ranking.
2. **The direction for betweenness is chosen in small print on the refused panel, with no
   control there.** Only the options form has a Direction field.
3. **Keeping the top 200 by a sampled estimate still shows nothing about uncertainty at the cut.**
   The table now marks near ties ("near #7"), which she liked, but the Keep top rows editor only
   reports exact ties at row 200, and no screen shows Keep top rows, or the patent table, over a
   sampled betweenness column.
4. **Whether "Neighbors of a node" after a keep step looks past the kept set is still unseen.**
   "Add their neighbors" now names the step above in Scope and its count shows it reaches the
   full graph; "Neighbors of a node" is only shown with "Full graph, no steps above". The task
   needs the single-node version after a keep step.
5. **citationsReceived (max 779) and the in-degree chart (max 236) still disagree on the first
   screen** with the reason only hinted at under the chart; the column header does not say the
   attribute counts citations from outside the sample.
6. **The Quick actions button is an unlabelled lightning bolt on the not-drawn page and labelled
   "Quick actions" on the others;** the inspector's neighbor filter is still an unlabelled icon.
7. **No CPU cost for the big graph.** The 101-source run takes 29.9 s on WebGPU against a 30 s
   limit; her laptop has no WebGPU and the only CPU screen is a 300-node graph.
8. **The first suggestion under Narrow the graph is still "most cited",** whatever the question.
9. **Small inconsistencies:** the graph is "Citations", "Citations 1999 to 2001" and "Patent
   citations"; density 0.0000958 and 0.000096; the chip rounds to "124K" while every other count
   is exact.

## What worked for her

- The not-drawn message: what was not drawn, why, nothing lost, one way forward; the counts check.
- A refusal with cost words instead of a hang, and routes grouped by whether they fit the limit.
- "This is a different graph" on the subset route -- the warning she asked for last round.
- "Sampled, 500 sources, a few minutes" offered as its own row past the time limit.
- Seed, sample size and error bound on the sampled run; tied ranks printed as a range.
- Near-tie marks in the ranked table ("near #7").
- "Add their neighbors" names the step above in its Scope and counts before it commits.
- The neighbor count 242 matched the degree she could check (241 plus the patent).
