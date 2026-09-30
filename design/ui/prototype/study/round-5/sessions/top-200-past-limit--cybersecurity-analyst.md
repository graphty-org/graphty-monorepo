# Session: the 200 most in-between patents, past the drawing limit -- Priya

**Participant:** Priya (fictional), senior threat hunter in a bank SOC. She lives in Splunk, Defender
and a Jupyter notebook, writes Cypher in BloodHound, and opens every new graph tool expecting it to
hang. See ../../personas/cybersecurity-analyst.md.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order:** the not-drawn patent graph and its filter popover
(screens/past-drawing-limit.html: not drawn, Narrow the graph, New rule, Keep top rows, kept and
drawn, the two-step neighbors sample); the main menu's Algorithms list (screens/results-panel.html,
catalog); the cost warning on the full graph (screens/results-panel.html, refused, and
screens/option-form-cost.html, over budget and sample over budget); a run in progress
(screens/results-panel.html, running); the finished sampled run and its run record
(screens/results-panel.html, finished sampled); a finished run opened in the table
(screens/results-panel.html, in the table); the table with ranked columns and with a set column
(screens/table-dock.html, ranked and limit); Find with a list of patent ids
(screens/find.html, state 7). Participant view, 1440 x 900.

**Renders she saw:** shots/record/r4-priya-top200-past-drawing-limit-not-drawn.png,
shots/record/r4-priya-top200-past-drawing-limit-narrow.png, shots/record/r4-priya-top200-past-drawing-limit-rule.png,
shots/record/r4-priya-top200-results-panel-catalog.png, shots/record/r4-priya-top200-results-panel-refused.png,
shots/record/r4-priya-top200-option-form-cost-over-budget.png,
shots/record/r4-priya-top200-option-form-cost-sample-over-budget.png,
shots/record/r4-priya-top200-results-panel-running.png,
shots/record/r4-priya-top200-results-panel-finished-sampled.png,
shots/record/r4-priya-top200-results-panel-in-the-table.png, shots/record/r4-priya-top200-table-dock-ranked.png,
shots/record/r4-priya-top200-table-dock-limit.png, shots/record/r4-priya-top200-past-drawing-limit-keep.png,
shots/record/r4-priya-top200-past-drawing-limit-kept.png, shots/record/r4-priya-top200-past-drawing-limit-sample.png,
shots/record/r4-priya-top200-find-s7.png.

---

## Think-aloud transcript

**Reading the task.** Patents. Not my data, but fine -- it's a stand-in. In my world this is "find
the choke points": which hosts or accounts sit on the most paths. "Most in between" is
betweenness. And "who surrounds the first one" is a pivot: take the top hit, pull its neighbours.
I do this in BloodHound with Cypher, or in my notebook with networkx and a sampled betweenness when
the graph is big. So I know what the numbers should roughly look like, and I know how long it
should take. Last time a tool ran a path query on the whole domain it spun for half an hour with
the CPU idle. So my first question is: does this even try, and does it tell me what it's doing.

**Before anything.** Is this approved, where does it run, does it phone home. Left rail says
"Assistant: Off. Nothing is sent." That's a start, and I like that it's on the screen without me
asking. On some screens there's also a line under the project name, "Nothing has been sent from
this project", underlined, so I assume I can click it and see a log. On the first patent screen
that line isn't there. Why is it on some screens and not others? If that's the thing that tells
me nothing left the box, it should always be in the same place. In a real trial I'd still stop
here for the approval question -- nothing on screen tells me if this is a web page talking to a
server or all in my browser. I'm continuing because it's a study.

**The not-drawn screen.** "124,318 nodes not drawn. More than this browser draws at once
(50,000). Every node is counted in Statistics and listed in the table." Good. That's the first
graph tool that told me up front it's not going to draw instead of going white. I'll take a
table over a hairball any day. Stats on the right: 124,318 nodes, 1,480,221 edges, 3,912 weak
components, biggest one 94 percent. Numbers I can check. And at the bottom right: "Edges:
directed, weight not set". Remember that, directed. The table header says grantYear 1999 to 2001
-- that's my time range. I'd want that at the top, not in a column header, but at least it's
there.

The table is sorted by citationsReceived. That's in-degree. That is not what I was asked. Every
junior I've trained does this: "most connected" and "most in between" are not the same thing.

**"Narrow the graph..." popover.** Opens a filter list. "Suggested for this graph: Keep top rows
by citationsReceived..., Neighbors of a node..., Add step". So the big blue button's first
suggestion is the wrong measure for my task. It's labelled honestly, it says citationsReceived,
so I won't get tricked, but someone in a hurry would click it and hand me 200 highly-cited
patents and call them choke points. I close it.

I clicked "Add step" to see if there's somewhere to type. It's a rule builder: Keep Nodes, Where
category is Drugs and medical, AND citationsReceived >= 25. Dropdowns. It tells me "612 nodes,
1,843 edges, will draw" before I commit, which I like -- that's the count-before-run I get in
Splunk. But it's dropdowns. Where's the box I type into? And there's no betweenness field in the
list because nothing has computed it yet. So this is not where I start.

**Finding betweenness.** Nothing on this screen says "algorithms" or "run". The lightning bolt on
the toolbar, maybe? I'm not clicking random icons. I tried Ctrl+K since half the tools I use have
that -- the menu shows "Quick actions... Ctrl+K" so I'd guess that's a command box, and I'd type
"betweenness". The other route is the hamburger top left: File, Edit, View, Selection,
Algorithms. Algorithms, Centrality, Betweenness, first item. Found it in maybe 20 seconds, and
only because I opened the main menu. The screen I was on never pointed me there. The not-drawn
message says the only way forward is "Narrow the graph". For my task it isn't.

(Note: the catalog render I saw was on the protein graph, not the patents. I'm assuming the same
menu is there on the patent project.)

**The cost warning.** I pick Betweenness and it doesn't run. Red bar: "Takes hours. The time
limit is 30 seconds. On the full graph, 124,318 nodes; the directed citations read as
undirected. Details." Then: "Fits the time limit: Sampled, 101 sources, under a minute. Exact, on
5,318 nodes, under a minute. Past the time limit: Exact, on the full graph, hours." And a button,
"Run sampled".

OK. This is the thing BloodHound never did for me. It told me before it started that the exact
answer takes hours, and it gave me a way that finishes. That alone is worth something. I would
have loved this on the shortest-paths-to-DA query.

But hang on. "The directed citations read as undirected." The graph said directed. So which is
it? I open the other version of this form -- the popover one -- and it says "Directed, on the
full graph". Two screens, two answers to the same question. I'm going to come back to this.

"Exact, on 5,318 nodes" -- what 5,318? I look left: there's a set, "Drug patents granted in 2...
5,318". So exact is only on drug patents. That is not the question I was asked. The moderator said
the citation graph, so the whole thing. Skip.

"Time limit is 30 seconds." Whose limit? Mine? Can I raise it? In the popover version, when I
type 500 into sample size it says "500 sources take a few minutes, past the 30-second time
limit. Run starts it in the background. 101 is the largest that fits." So past the limit it's not
refused, it just goes to the background. Then why the red bar and the word "limit"? Red to me
means blocked. I'd have read that as "you can't" if I hadn't played with the number.

**What I'd pick.** 101 sources out of 124,318 is less than a tenth of a percent of the graph. I
want the top 200, not the top 2. In my notebook I'd use k around 500 or 1,000 for something this
size and still not trust the tail. So I type 500, seed 7, and Run. The seed is shown and editable
-- good, I can reproduce it. It says it runs in the background.

**While it runs.** I saw the running state on a different run (PageRank): a progress bar in the
Results list, "Running on WebGPU, under a minute", and an X to cancel. That's what I need -- a bar
that moves and a cancel. If mine said "a few minutes" and the bar moved, I'd go look at my SIEM
and come back. "WebGPU" also tells me it's computing here on my laptop, not on someone's server,
which is actually a better answer to "where does it run" than anything else on screen. Though on
my work laptop, with Edge policy, I wouldn't know if WebGPU is even on.

**The finished sampled run.** Right panel: "Betweenness (sampled)". "on: full graph, 124,318 nodes.
Sampled, 101 sources. Directed. WebGPU. Details. Weight: no numeric edge column." (The mock shows
the 101 run; I'll read it as if it were my 500.)

Top nodes: "#1 5879702 ~0.0160. #2 5902311 ~0.0037. #3-#7 5964536 ~0.0029..." and "Ranks below #2
may swap between runs." Then "124,313 more in the table."

So the tool is telling me straight: only the top two are real. Everything from #3 down is a range.
That is honest and I respect it. It's also a problem for my task: the moderator asked for the top
200. If rank 3 is already "#3 to #7", rank 200 is a coin toss. Which 200 I get depends on the
seed. The tool says so for the top five and then goes quiet. I'd want the same honesty at the
cut: "row 200 could be anywhere from #150 to #260" or whatever it is. Otherwise I'm putting a list
in a case that I can't defend.

Column header "rank, low-high patent". Low-high what? I figured out it means the rank range, but I
read it three times.

**The run record.** "Details" opens a run record. Method: Brandes from 101 random sources, scaled
up. Seed 7. Error bound plus or minus 0.00035, 95 runs out of 100. Good, that's what I'd write in
the notebook, and there's a Copy button, so it goes in the case notes. Then:

"Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph."
"Direction: Citations read as undirected."

And three lines above in the panel itself: "Directed". And under Options: "Direction: Directed".

Stop. Same run, same panel, two answers. For citations this matters -- directed betweenness on a
citation graph is not the same list as undirected. I can't hand this to anybody until I know which
one I ran. This is the thing that ends a trial for me: not a missing feature, a number that
disagrees with itself. I'd rerun it and read the record first, and if it still disagreed I'd go
back to networkx, where at least I know what I asked for.

**Getting the list out.** "124,313 more in the table" -- I saw this on the protein example: it
opens the table sorted by the run's score, with a score column, a rank column, and a header that
says "betweenness, exact, full graph". The patent version would presumably say "sampled". There's
"Export table as CSV..." on the table. That's the one thing I actually need. I'd export the top of
it and do the rest in pandas if I had to.

**Keeping the top 200.** "Keep top rows..." is on the table. It opens "Keep the first [200] rows,
in the table's order [citationsReceived] [Highest first]". The one I saw is sorted by
citationsReceived, but it's a dropdown, and the page says after a run it sorts by the run's
result. So I pick "betweenness (sampled)" in that dropdown, if it's there. I'm guessing -- I didn't
see a screen with the patents sorted by betweenness, only the protein one. It tells me "Row 200
has citationsReceived 358; 1 more patent also has 358 and is left out." I like that -- it tells me
about the tie at the cut instead of silently dropping it. With a sampled score it should also tell
me that the cut itself is fuzzy (see above). "200 nodes, 288 edges, will draw." Keep these 200
rows.

**Kept and drawn.** Now it draws. A grey scatter, 200 dots, 288 edges, a toast "Filtered to 200
of 124,318 nodes, Undo". The filter chip top left reads "200 of 124K nodes, 1 step". Statistics
on the right: "Describes the 200 most cited patents, not a random sample. Density reads high." It
flags that the stats are for the subset. Good, that's the thing people get wrong. 21 weak
components out of 200 -- so most of my "choke points" don't even touch each other once you cut the
rest away. Fine, I don't care about the picture, I care about the list.

I don't care where the dots sit. The labels are patent numbers, which is right.

**The first one.** Rank 1 is 5879702. I hit Ctrl+F -- the find box hint says Ctrl+F opens it from
anywhere, good, that's muscle memory -- and type the number. The Find screen I saw lets me paste a
list of ids and finds all of them: "3 results in all 124,318 nodes". It searches the whole graph,
not just what's drawn. That's right. The inspector shows the patent with "Not drawn: the graph is
past the drawing limit. Counted everywhere." Clear.

The inspector header has three icons next to the node: one is "Select neighbors", one a dropdown
"Neighbor options", one a funnel "Filter to". Icons only, I had to hover for all three. I pick
Neighbor options: I want to pick direction. On a citation graph, "cites" and "is cited by" are two
different questions -- in my world that's "who logged on to this host" versus "where did this
account go". The "Neighbors of a node" editor in the filter popover shows "Around 6117075, 1 hop,
Both directions". Both directions is the default. That's the Sentinel flood waiting to happen: one
expansion, everything in both directions, no order. At least it's a dropdown I can change, and it
says the count before I commit.

**Here's where I got confused.** Do I want neighbours inside my 200, or neighbours in the whole
graph? The moderator said "who surrounds" -- the whole graph. But I already have a filter step on
that keeps 200. If I add "Neighbors of a node" as the next step, does it look at the 124K or only
at the 200 left over? The Keep editor showed "Scope: Full graph, no steps above". So a second step
would say "Scope: the 200 the step above keeps", I think, and then the neighbours of patent #1
inside the 200 is a handful. That's not "who surrounds it". I think the right move is: select the
patent, use Filter to neighbors from its inspector, on the full graph. But I'm not sure whether
that replaces my 200-step or stacks on it. The two-step example ("keep top 3, add their neighbors")
shows the chip counting "586 of 124K nodes, 2 steps", and "Add their neighbors" apparently pulls
from the full graph -- so adding is from the full graph but filtering is from what's left? I'd
have to try it and read the count. If the count came back as 4 I'd know I'd done it wrong.

What I'd actually do: turn the 200-step off with its checkbox, filter to neighbours of 5879702 on
the full graph, look, then turn the 200-step back on. The popover says each step can be turned off
alone, so that should work. Or honestly, I'd export the 200 as CSV and do the neighbour pivot in my
notebook, where I know the scope.

**The two-step result I saw** (top 3 by citations plus their neighbours): 586 patents, three
starbursts. Stats say "Describes the 3 most cited patents and all their neighbors, not a random
sample. It favors hubs." That's an honest label. Three starbursts is exactly the hairball that
tells me nothing, but I asked for it. What I want next is that neighbour list as rows, sorted by
something, with cites/cited-by as a column. The table is there underneath, sorted by
citationsReceived, so I'd sort by... there's no "direction relative to the seed" column. I'd want
one.

**Saving it.** Can I run this again next month on the new export? The filter popover has "Create
rule set" and the menu has "Recipes". I didn't open them in this session; if a recipe keeps "run
sampled betweenness seed 7, keep top 200, neighbours of #1" and replays it on a new file, that's
the thing that would make me keep using this. If it's just a saved picture, it's a toy.

**3D.** Didn't touch it. Not during a task.

---

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 4.**

The parts it owns, it does well: it told me it wouldn't draw instead of crashing, it told me the
exact run takes hours before starting it and gave me a run that finishes, it showed a progress bar
and a cancel, it told me which ranks it can't separate, and it counts before every filter. Three
things cost me. Finding betweenness at all -- the not-drawn screen only offers "Narrow the graph",
and its first suggestion is the wrong measure. The direction contradiction -- "Directed" in the
panel and the options, "read as undirected" in the run record and the cost warning; I would not
put that number in a case. And the neighbours step -- I couldn't tell whether "neighbours of the
first one" would look at the full graph or only at my 200.

**Would I use this instead of my current tool?** Not instead. Next to it, maybe, for the
choke-point job, once it's on the approved list -- that's a real review, not my call. My notebook
does sampled betweenness in three lines and I know exactly what direction and normalization I
asked for. What this has that my notebook doesn't: it tells me the cost before it runs, it runs on
my own graphics card with a bar I can watch, and it tells me which ranks are noise without me
bootstrapping it. If the run record agreed with the panel, if "Keep top rows" told me how fuzzy
row 200 is, if there were a box to type a query, and if I could replay the whole thing on next
month's BloodHound export, I'd use it for the first look and export the CSV into Splunk for the
rest. As it stands, the first time a number contradicts itself I'm back in the notebook.

---

## Problems observed

1. **The run says both "directed" and "undirected".** The finished sampled run's summary and its
   Options say Directed; its run record says "Citations read as undirected" and normalizes over
   undirected pairs; the cost warning says "read as undirected" while the popover version of the
   same warning says "Directed". For a citation graph the two give different lists. She would not
   report the result. (Severity: high; would end a real trial.)
2. **No route from "not drawn" to "run a measure".** The canvas message's only button is "Narrow
   the graph", and its first suggestion keeps the top rows by citationsReceived -- the in-degree
   answer to a betweenness question. She found Betweenness only by opening the main menu.
3. **The top 200 of a sampled score has an unstated cut.** The run says ranks below #2 may swap;
   Keep top rows reports the tie at row 200 but says nothing about how uncertain row 200 is when
   the order is a sampled estimate. The list she keeps depends on the seed and nothing says so at
   the cut.
4. **Scope of a neighbours step after Keep top rows is unclear.** She could not tell whether
   "Neighbors of a node" added after the keep step searches the full graph or only the 200 kept,
   and "Add their neighbors" appears to reach into the full graph while a filter would not.
5. **"Time limit" in red reads as a refusal.** Only by typing a larger sample did she learn that
   past the limit the run goes to the background instead of being refused.
6. **"Exact, on 5,318 nodes" is offered as the fitting option** but is a different question (drug
   patents only); she had to find the set in the left panel to see why.
7. **Neighbour direction defaults to both.** On a directed graph, cites and cited-by are different
   pivots; the default gives the flood she dislikes. No column tells her which direction each
   neighbour came from.
8. **"rank, low-high patent"** as a column header was unreadable at first.
9. **The "Nothing has been sent" line is on some screens and not others**, and nothing states
   where the app runs.
10. **No typed query.** The rule builder is dropdowns only.
11. **The graph has three names** across the screens: Citations, Patent citations, Citations 1999
    to 2001.

## What delighted her

- "It told me it wasn't going to draw, and why, and kept going. No white screen."
- "It told me the exact run takes hours before it started, and gave me one that finishes."
- "It says out loud that only the top two ranks are stable. Nobody does that."
- "Count before commit on every filter, including the tie at the cut."
- "Seed is shown and editable, and the run record has a Copy button for my case notes."
- "Export table as CSV, right there on the table."
