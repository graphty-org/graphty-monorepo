# Session: the 200 most in-between patents, past the drawing limit -- Dr. Min-ji Kim

**Participant:** Min-ji Kim (fictional), knowledge graph engineer and ontologist; SPARQL in a
triple store workbench, rdflib and pandas in notebooks, networkx when she needs a graph measure.
See ../../personas/knowledge-engineer.md.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order:** the not-drawn patent graph, its filter steps, Keep top rows, the kept 200,
a rule, the drawn rule result and the two-step neighbors sample (screens/past-drawing-limit.html);
Quick actions, the refused betweenness run, the finished sampled run with its run record, a
finished run opened in the table, and the no-WebGPU run (screens/results-panel.html); the
betweenness options over the time limit and a 500-source sample run in the background
(screens/option-form-cost.html); the table dock sorted by a measure and at a large size
(screens/table-dock.html); Find past the drawing limit and Quick actions by question
(screens/find.html). Viewed at 1440 x 900 in the participant view.

**Renders she saw:** shots/record/r4-minji-t200-pdl-not-drawn.png, shots/record/r4-minji-t200-pdl-isolates.png,
shots/record/r4-minji-t200-pdl-narrow.png, shots/record/r4-minji-t200-pdl-keep.png,
shots/record/r4-minji-t200-pdl-kept.png, shots/record/r4-minji-t200-pdl-rule.png,
shots/record/r4-minji-t200-pdl-drawn.png, shots/record/r4-minji-t200-pdl-sample.png,
shots/record/r4-minji-t200-pdl-full.png (the page with its below-frame panels),
shots/record/r4-minji-t200-rp-quick-actions.png, shots/record/r4-minji-t200-rp-refused.png,
shots/record/r4-minji-t200-rp-finished-sampled.png, shots/record/r4-minji-t200-rp-in-the-table.png,
shots/record/r4-minji-t200-rp-cpu-path.png, shots/record/r4-minji-t200-ofc-over-budget.png,
shots/record/r4-minji-t200-ofc-sample-over-budget.png, shots/record/r4-minji-t200-td-ranked.png,
shots/record/r4-minji-t200-td-large.png, shots/record/r4-minji-t200-find-s7.png, shots/record/r4-minji-t200-find-s8.png.

**Outcome:** finished, with difficulty. She got a sampled betweenness ranking she was willing to
defend at the top, and a one-hop neighborhood of the first patent. Two steps she had to guess at,
because no screen shows them on this graph: keeping the top 200 by a sampled estimate, and
whether "neighbors of the first one" reaches past the 200 she had just kept.

---

## Think-aloud transcript

**Reading the task.** "'Sit most in between.' That is betweenness centrality, and I want to know
which betweenness before I trust any list. A citation graph is directed and almost acyclic. On
directed paths, a patent is in between if it cites older work and is cited by newer work -- it
carries a line of technology forward. If you ignore direction, any patent that happens to be
cited by two unrelated families looks like a bridge. Those are two different questions. And it is
not 'most cited'. People confuse those all the time."

**First frame: the not-drawn graph.** "Good. It says 124,318 nodes not drawn, more than it draws at
once, 50,000, and that every node is counted. It did not hang, it did not pretend to draw a
sample, and it did not silently drop anything. That is already better than Neo4j Browser. Edges
1,480,221, directed, 'weight not set'. Weak components 3,912, the big one 116,905, 94.0 percent.
116,905 over 124,318 -- yes, 94.0. Isolates 2,406. In-degree zero 41,873, and it says the isolates
are among them. That is consistent."

"Wait. The table's top patent, 6117075, has citationsReceived 779. The in-degree chart says the
maximum in-degree is 236. So citationsReceived is not the in-degree of this graph. What is it, then?
An attribute from the file? Counted over what?" She clicks the isolates count, 2,406, because that
is where she would check. The panel under it says isolates can have citationsReceived above zero
because that attribute counts citations from every later US patent, most outside this 1999 to 2001
sample. "Fine. That is the right answer. But I only found it because I went looking in the
isolates. On the first screen, the table is sorted by a column that disagrees with the chart next
to it by a factor of three, and nothing says why. If a stakeholder sees 779 and 236 side by side
they will ask me which number is wrong. Put that sentence on the column header."

**Looking for betweenness.** She opens Narrow the graph... "Two suggestions: keep top rows by
citationsReceived, and neighbors of a node. Neither is my question. It is offering me the most
cited patents because that is how the table happens to be sorted. I do not want the most cited."
She looks for a menu with algorithms. There is no menu bar. The toolbar has an arrow, some shapes,
a page, a lightning bolt and a square. "The lightning bolt, I suppose. No label." The hover says
Quick actions. She types "between".

**Quick actions.** "Betweenness, and it says 'hours'. Closeness hours, harmonic hours, PageRank
under a minute. I like that it tells me the cost before I press anything. Most tools let you start
it and then you watch a spinner and kill the tab." She notices the Results list on the right
already holds "Betweenness (sampled)" before she has run anything. "Somebody already ran one? Or is
that a leftover? I would want to know who and when." She presses Enter on Betweenness.

**Refused by the time limit.** "Takes hours, the time limit is 30 seconds. It refused and did not
start. Good. Three routes: sampled on 101 sources, under a minute; exact on 5,318 nodes, under a
minute; exact on the full graph, hours."

"Then the small print: 'the directed citations read as undirected'. No. That is the one decision I
care about, and it made it for me, in grey, in the second line of a warning box. Where do I change
it?" In the other version of this form she finds a Direction field, 'As the graph: directed', and
the warning there says 'Directed, on the full graph'. "So now I have seen the same run described as
undirected on one screen and directed on another. Which one will it actually do?"

"And 'exact on 5,318 nodes' -- which 5,318? On one screen nothing says. On the other there is a set
in the left panel, 'Drug patents granted in 2...', truncated, with 5,318 beside it. So it offers an
exact run on a set someone made earlier. That is not the question I was asked -- the 200 most in
between in the drug subset are not the 200 most in between in the graph -- but at least on that
screen I can see what the set is. On the refused screen I cannot."

**Choosing the sample.** "Sampled betweenness, Brandes from random sources, is what I would do in
networkx too, with k. 101 sources out of 124,318 is thin for a top 200. The top ten will be stable,
position 200 will be noise." She finds the sample size field: she types 500. It says 500 sources
take a few minutes, past the 30-second limit, so the run starts in the background, and that 101 is
the largest that fits. Seed 7, with a re-roll button. "That I like. It tells me the price, lets me
pay it, and there is a seed, so I can run it again and get the same ranking. Most tools have no
seed and every run is a different answer." She says she would set 500 and let it run. The finished
screen she can see is the 101-source run, so she reads that.

**The finished sampled run.** "Top nodes, 'estimated'. #1 5879702 at about 0.0160, #2 at 0.0037,
then #3 to #7 printed as one tied range. 'Ranks below #2 may swap between runs.' Honest. Error
bound plus or minus 0.00035 on each value, 95 runs out of 100. So the first one is clearly the
first one: 0.016 against 0.0037 is not noise. Everything under #2 is soft."

She opens Details, the run record. "Method: Brandes from 101 random sources, scaled up by 124,318
over 101. Seed 7. Normalization divided by (n-1)(n-2)/2, the node pairs of an undirected graph.
Direction: citations read as undirected. Engine WebGPU." She goes back up. "And the line above the
top nodes says 'Directed'. The Options section says Direction, Directed. The run record says
undirected, and its normalization is the undirected one. One of these is wrong, and it is the
measure I am about to hand to someone as 'the 200 most in between'. This is the kind of thing that
makes me stop trusting every number on the page. If the record is right, the header is lying. If
the header is right, the record is lying. I would file this before I used the result."

"Zero: about 79,554 nodes. On an undirected graph with 94 percent in one component, most nodes
would carry some betweenness; 79,554 zeros looks like directed -- every patent that is never cited,
41,873 of them, sits at zero on directed paths. So my guess is the run was directed and the record
is the wrong one. But I should not have to reverse-engineer the direction from the zero count."

"Engine WebGPU. My work laptop does not have WebGPU. The no-WebGPU screen shows a 300-protein graph
on the CPU in 3.8 seconds. Nothing tells me whether 101 sources on 124,318 patents still fits the
30 seconds on the CPU, or whether the offer shrinks. On my machine I would find out by pressing it."

**Getting 200 of them.** "124,313 more in the table." 5 shown plus 124,313 is 124,318, she notes.
She follows it. "No screen shows the patent table sorted by this betweenness. The protein one
shows what I expect: a betweenness column, a rank column with ties marked, and the header says
'exact, full graph'. I assume mine would say 'sampled, 101 sources' in that header -- it had
better."

She opens Keep top rows... "Keep the first N rows, in the table's order. The order is two
dropdowns, the column and highest first, and the note on the page says that after a run it offers
that run's result. So I set 200 and betweenness. It tells me where the cut falls: on citations it
said row 200 has 358 and one more patent also has 358 and is left out. That is exactly the sentence
I want -- but for an estimate it is the wrong sentence. With an error bound of 0.00035, the question
is not 'how many tie at row 200', it is 'how many rows past 200 are indistinguishable from row
200'. If that is fifty, then 'the 200' is a coin toss at the bottom and I have to say so. Nothing I
can see tells me."

"'200 nodes, 288 edges, will draw.' That was for the most cited. For mine it would be some other
count, and it tells me before I commit. I like that it says 'will draw' and not 'drawing'." She
presses Keep these 200 rows, following the kept state. "One step, Undo in the toast, the chip says
200 of 124K nodes, 1 step. Statistics on top say what the step keeps, and that density reads high
because they are all hubs. That is a sentence I have never seen a tool write. The kept set is not
a random sample and it says so."

"The chip says 124K. The rest of the page gives exact numbers. Don't round in one place and not the
other."

**Who surrounds the first one.** "The popover now suggests 'Add their neighbors', one hop, both
directions. That is the neighbors of all 200. I was asked about the first one." She finds
'Neighbors of a node', which lets her name the node: Around 6117075 in the example, 1 hop, Both
directions, 242 nodes, 348 edges, will draw. "241 neighbors plus itself, and the in-sample degree
maximum was 241. That checks. Good."

"Now the problem. If I add this as a second step after 'keep top 200', does it look for neighbors
of 5879702 in the whole graph, or only among the 200 I kept? The editor has a Scope line, and on
the screen I can see it says 'Full graph, no steps above'. With a step above, I would guess it says
'the 200 kept', and then 'who surrounds the first one' is only the in-between patents that touch
it -- which is not who surrounds it. So I would untick the first step, or make a second view. I
think. I cannot see either on a screen." She adds: "In SPARQL this is two queries and there is no
ambiguity. Here the order of the steps changes the answer and the only warning is one grey line."

She also tries the other way in: Find, type the patent number, select it. The node's inspector says
'Not drawn: the graph is past the drawing limit. Counted everywhere', shows grantYear, category,
citationsReceived, and has an icon at the top. The page says it is Filter to neighbors, the same
step. "An unlabelled icon. I would have hovered it. Same scope question."

"Both directions is the default. For a citation graph I want them apart: who it cites, and who
cites it. The dropdown offers that, so I would split them and look twice. And I would want the
Edges tab of the table next, to see which neighbors are cited by it and which cite it, with the
dates -- a patent that cites something granted after it is a data problem."

**Last look.** "The two-step drawing, three hubs and their neighbors, is pretty. It is also the
most cited, not the most in between. If I had pressed the first suggestion on the first screen I
would have ended up there and never noticed that it answered a different question."

---

## Single Ease Question

**4 out of 7.** "The cost gate, the seed, the error bound and the counts before every commit are
better than anything I use for this. It loses three points on one contradiction and two guesses:
the run says directed in one place and undirected in another; I cannot see how uncertain position
200 is when I cut at 200; and I do not know whether 'neighbors of the first one' after keeping 200
looks past the 200."

## Would she use this instead of her current tool

"Not instead. Next to. For the ranking itself I would still run it in a notebook -- networkx
betweenness with k and a seed -- because I can print the direction and the normalization and
nobody argues with a line of code. What I do not have is the next step: seeing who surrounds that
patent, with the counts checked, without writing a query per hop. That part I would use, and I
would show it to people, because it says what it kept and why the numbers read high.

"But if the direction contradiction is real I cannot put its betweenness in front of anyone. One
unexplained mismatch and I stop trusting every number. Fix that and show me the cut uncertainty,
and I would run the whole thing here."

She added, unprompted: "And this is a property graph from a CSV. It is fine for patents. It would
not be fine for my knowledge graph. That is a different session."

---

## Problems observed

1. **The sampled betweenness run states two different directions.** Results panel, finished
   sampled: the summary line and Options say "Directed"; the run record says "Citations read as
   undirected" and normalizes by the node pairs of an undirected graph. The refused state also says
   "read as undirected", while the betweenness options form says "As the graph: directed". She
   deduced the direction from the zero count. Severity: high -- she would not publish the ranking.
2. **The default direction for betweenness on a citation graph is chosen silently.** The refused
   state tells her, in grey small print, that directed citations will be read as undirected, and
   offers no control on that screen. For a citation graph that changes the meaning of "in between".
3. **Keeping the top 200 by a sampled estimate does not say how uncertain the cut is.** The Keep top
   rows editor reports ties at row 200, which is right for an exact column; for an estimate with an
   error bound, she needs how many rows beyond 200 are within the bound. No screen shows Keep top
   rows over a sampled result at all.
4. **Whether a neighbors step reaches past earlier steps is unclear.** After "keep top 200", she
   could not tell if "Neighbors of a node" finds the first patent's neighbors in the full graph or
   only among the 200. The only hint is the Scope line, shown only with no steps above. The step
   order silently changes the answer to "who surrounds it".
5. **citationsReceived disagrees with the in-degree chart on the first screen and the explanation
   is two clicks away.** 779 in the table, in-degree max 236 in Statistics; the reason (it counts
   citations from outside the sample) appears only in the isolates panel.
6. **"Exact, on 5,318 nodes" does not name its set on the refused screen.** The options form shows
   the set in the left panel; the results panel does not.
7. **The first suggestion under Narrow the graph is "most cited", whatever the question.** It
   follows the table's sort. A reader who takes it answers a different question and the screen
   never says so.
8. **The Quick actions tool is an unlabelled lightning bolt,** and the inspector's Filter to
   neighbors is an unlabelled icon. She found both only by hovering.
9. **The CPU cost is not shown for the big graph.** The routes quote times on WebGPU; her laptop has
   none, and the only CPU screen is a 300-node graph.
10. **Minor inconsistencies between screens of the same graph:** the graph is called "Citations",
    "Citations 1999 to 2001" and "Patent citations"; density 0.0000958 and 0.000096; the chip
    rounds to "124K" while every other count is exact; a "Betweenness (sampled)" result sits in
    Results before she has run anything.

## What worked for her

- The not-drawn message: it says what it did not draw, why, that nothing was lost, and the one way
  forward, and the counts all check against each other.
- Cost words in Quick actions before anything runs, and a refusal instead of a hang.
- A seed on the sampled run, a sample size she can raise and run in the background, and an error
  bound with tied ranks printed as a range.
- Every filter step shows its node and edge count and whether it will draw before it commits, with
  one undo.
- Statistics say what the kept set is and that density reads high because it keeps hubs.
- The neighbor count, 242, matched the degree she could check: 241 neighbors plus the patent.
