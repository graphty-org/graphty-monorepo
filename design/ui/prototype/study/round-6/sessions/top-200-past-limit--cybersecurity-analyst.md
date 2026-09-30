# Session: the 200 most in-between patents, past the drawing limit -- Priya

**Participant:** Priya (simulated), senior threat hunter in a bank SOC. She lives in Splunk,
Defender and a Jupyter notebook, writes Cypher in BloodHound, and opens every new graph tool
expecting it to hang. See ../../personas/cybersecurity-analyst.md. The participant is simulated;
read her reactions as a structured walkthrough in her voice, not as evidence from a real user.

**Task, as the moderator gave it:** "This citation graph is too big to draw. Find the 200 patents
that sit most in between, then look at who surrounds the first one."

**Screens, in order (participant view, dark theme, 1440 x 900):**
the not-drawn patent graph (screens/past-drawing-limit.html, not drawn); its filter popover
(narrow); Quick actions typed "centrality" on the patent graph (screens/results-panel.html,
quick actions); the main menu's Algorithms list (results-panel, catalog -- on the protein graph);
the cost warning as a popover (screens/option-form-cost.html, over budget and sample over budget)
and in the left panel (results-panel, refused); a run in progress (results-panel, running); the
finished sampled run and its run record (results-panel, finished sampled); a finished run opened in
the table (results-panel, in the table -- protein graph); Keep top rows, kept, and the two-step
neighbors sample (past-drawing-limit, keep, kept, sample); the table with a set column
(screens/table-dock.html, limit); Find with a list of patent ids and the not-drawn inspector
(screens/find.html, state 7); Bring in its links (find, state 14); select all past the cap
(screens/selection-over-cap.html, E1 and E2).

**Renders she saw:** shots/record/r6-priya-top200-pdl-not-drawn.png, shots/record/r6-priya-top200-pdl-narrow.png,
shots/record/r6-priya-top200-rp-quick-actions.png, shots/record/r6-priya-top200-rp-catalog.png,
shots/record/r6-priya-top200-ofc-over-budget.png, shots/record/r6-priya-top200-ofc-sample-over-budget.png,
shots/record/r6-priya-top200-rp-refused.png, shots/record/r6-priya-top200-rp-running.png,
shots/record/r6-priya-top200-rp-finished-sampled.png, shots/record/r6-priya-top200-rp-in-the-table.png,
shots/record/r6-priya-top200-pdl-keep.png, shots/record/r6-priya-top200-pdl-kept.png,
shots/record/r6-priya-top200-pdl-sample.png, shots/record/r6-priya-top200-td-limit.png,
shots/record/r6-priya-top200-find-s7.png, shots/record/r6-priya-top200-find-s14.png,
shots/record/r6-priya-top200-soc-e1.png, shots/record/r6-priya-top200-soc-e2.png.

---

## Think-aloud transcript

**Reading the task.** Same one as last time. "Most in between" is betweenness; "who surrounds the
first one" is a pivot on the top hit. In my world: find the choke points, then look at what hangs
off the worst one. I know roughly what this should cost. Exact betweenness on 124K nodes is hours;
sampled is minutes. If the tool pretends otherwise I stop trusting it.

**Before anything.** Approved? Where does it run? Does it phone home? Left rail: "Assistant Off.
Nothing is sent." On most screens there's also "Nothing has been sent from this project" under the
project name, underlined, so I assume it opens a log. On the first patent screen -- the not-drawn
one -- that line isn't there. On the Find screen it isn't there either. So the one line that answers
my OPSEC question comes and goes depending on which screen I'm on. Still nothing says "this runs in
your browser, no server". In a real trial the approval question stops me here. It's a study, so I
keep going.

**The not-drawn screen.** "124,318 nodes not drawn. More than this browser draws at once (50,000).
Every node is counted in Statistics and listed in the table." Good. Still the best first screen of
any graph tool I've opened -- it tells me it won't draw instead of going white. Stats on the right:
124,318 nodes, 1,480,221 edges, 3,912 weak components, 2,406 isolates. The bottom right says "Edges:
directed, weight not set". Directed. Remember that. grantYear 1999 to 2001 in the column header is
my time range. I'd want it at the top, but fine.

The table is sorted by citationsReceived. That's in-degree. Not my question.

**"Narrow the graph..."** The one button on that screen. Opens "Filter steps", "Suggested for this
graph: Keep top rows by citationsReceived..., Neighbors of a node..., Add step". Same as last time:
the first suggestion is the wrong measure for my task. It's labelled honestly, but a junior in a
hurry clicks it and hands me the 200 most-cited patents as "choke points". I close it. Nothing in
that popover says "run a measure" or "betweenness".

**Finding betweenness.** On this screen the toolbar has a lightning bolt with no label. I'm not
clicking unlabelled icons in the middle of a task. I press Ctrl+K on reflex. On the other patent
screens the bolt is labelled "Quick actions", and Quick actions takes typing: I type "centrality"
and get Betweenness with "hours" right next to it, Closeness "hours", PageRank "under a minute".
OK -- that's actually good. It tells me the cost in the list, before I pick. That's the command box
I wanted. It took me maybe 10 seconds, and only because Ctrl+K is muscle memory; if I didn't have
that habit I'd have gone to the hamburger menu, where Algorithms, Centrality, Betweenness is the
first item. There's also a Results place on the rail with "Run a measure...". Three routes; none of
them is on the screen that says the graph is too big. On the not-drawn screen the bolt isn't even
labelled.

Side note: the "not drawn" message moves. Centred on the canvas on one screen, a toast bottom
right on another, a toast bottom left on a third. Same message, three places. Minor, but it's the
kind of thing that makes me wonder if these are the same app.

**The cost warning.** I pick Betweenness. Popover version: "Takes hours. The time limit is 30
seconds. Directed, on the full graph: 124,318 nodes." Then "Fits the time limit: Sampled, 101
sources, under a minute. Exact, on 5,318 nodes, under a minute. Past the time limit: Sampled, 500
sources, a few minutes. Exact, on the full graph, hours." Button: "Run sampled".

This time the list shows "Sampled, 500 sources -- a few minutes" as its own row. Good. I don't have
to guess that past the limit still runs. The yellow warning mark reads as "heads up", not "blocked".
Better than the red bar last time.

"Exact, on 5,318 nodes" in the popover -- 5,318 what? Only the left panel tells me: a set called
"Drug patents granted in 2...". The left-panel version of this same warning says it properly:
"Exact, on the 5,318 nodes in Drug patents granted in 2001. This is a different graph." That's the
right sentence. The popover should say it too.

And now the thing I flagged last time. The left-panel version says: "Not run: would take about 10
hours. ... On the full graph, 124,318 nodes; the directed citations read as undirected." The popover
version says "Directed". Two versions of the same warning, still two answers.

**What I'd pick.** I open the options. "Direction: As the graph: directed". Sample size -- I type
500. "500 sources take a few minutes, past the 30-second time limit. Run starts it in the
background. 101 is the largest that fits." Seed 7, editable, with a reroll. Good. 101 sources out
of 124K is nothing for a top 200. I run 500.

**While it runs.** The Results list shows a progress bar on the running item, "Running on WebGPU,
under a minute. Keeps Run 1." and an X to cancel. (The one I saw was PageRank; I'm reading mine as
the same with "a few minutes".) Bar, cancel, and "WebGPU" -- that last one tells me it's on my
laptop, which is honestly a better answer to "where does it run" than anything else on screen. I'd
go look at my SIEM and come back.

**The finished run.** Left panel: "Betweenness (sampled), 101 sources". Summary: "on: full graph,
124,318 nodes. Sampled, 101 sources. Directed. WebGPU. Details." Options: "Direction: Directed".
(The mock is the 101 run; I'll read it as my 500.)

Top nodes: #1 5879702 ~0.0160, #2 5902311 ~0.0037, then three rows all labelled "#3-#7". "Ranks
below #2 may swap between runs." Honest. Also means rank 200 is a guess, which matters for my task.

I click Details. Run record: Brandes from 101 random sources, seed 7, error bound plus or minus
0.00035. Then: "Normalization: divided by (n-1)(n-2)/2, the node pairs of an undirected graph."
"Direction: Citations read as undirected."

Same as last time. The summary three inches to the left says Directed. The options say Directed.
The record I'd paste into my case says undirected. That's the exact thing I said would end a trial,
and it's still here. For citations, directed and undirected betweenness give different lists. I
don't know which list I have. I'm not bringing this to my lead.

Also, I remember this: the moderator said these screens now show the "decided design". If this was
decided, it wasn't drawn.

**Getting the 200.** "124,313 more in the table." The only screen I have of what that opens is the
protein graph: table sorted by betweenness, a rank column "#1, #2...", header "exact, full graph".
Clear. For patents I'd expect a column "betweenness, sampled, full graph" and a rank that shows
"#3-#7" style ranges. I never saw that screen for the patents. So I'm guessing.

Then "Keep top rows..." on the table. The only version I saw is still sorted by citationsReceived:
"Keep the first 200 rows, in the table's order [citationsReceived] [Highest first]. Row 200 has
citationsReceived 358; 1 more patent also has 358 and is left out. Scope: Full graph, no steps
above. 200 nodes, 288 edges, will draw." Nice: tie at the cut, count before commit, scope stated.
I'd switch that dropdown to the betweenness column, if it's in there. But what I actually need for
a sampled score is "this many rows are within the error bound of row 200" -- is my cut solid or a
coin flip. It isn't on this screen, because this screen never shows a sampled column. Last time I
said exactly this. Still missing.

I press Keep. It draws: "Filtered to 200 of 124,318 nodes, Undo", chip "200 of 124K nodes, 1 step".
Statistics: "Describes the 200 most cited patents, not a random sample." Most cited. So the one
worked example of my task still keeps the wrong 200. If I'd been shown the betweenness version I'd
trust it more. I'm reasoning from a screen that answers a different question.

I don't care about the dots. Patent numbers as labels, fine.

**The first one.** Rank 1 by betweenness is 5879702 -- from the run panel. Ctrl+F. The Find screen
I saw lets me paste a list of ids: "3 results in all 124,318 nodes" -- the whole graph, not just
what's drawn. Right. I'd type 5879702 and get the one. The inspector: "Not drawn: the graph is past
the drawing limit. Counted everywhere." Attributes, memberships. Good. It does not show its
betweenness score or its rank in the inspector, which I'd expect after a run -- I want to confirm I
picked the right patent.

**Who surrounds it.** Inspector header has three icons: one with a dropdown (hover: "Select
neighbors" / "Neighbor options"), a funnel ("Filter to"), and "...". Icons only; I hovered all
three. I want Filter to neighbors, with a direction.

The "Neighbors of a node" step I saw: "Around 6117075, 1 hop, Both directions. The same step as
Filter to neighbors on a node's inspector." Default both directions. On citations, "cites" and "is
cited by" are different questions -- like "who logged on to this host" versus "where did this
account go". Both is the flood. At least it's a field I can change and it counts before commit.

Now the scope problem from last time. I have a Keep-200 step on. The "Add their neighbors" step
says "Of the 3 patents the step above keeps, 1 hop, both directions" -- and the two-step example
reaches 586 patents, so neighbours come from the full graph, not from what's left. Good, that
answers half of it. But the Neighbors of a node editor I saw didn't show a Scope line, and the
Keep editor did. So if I use "Filter to neighbors" from the inspector with my 200-step on, is it
neighbours in the whole citation graph or neighbours inside my 200? I'd guess whole graph, because
"Add their neighbors" works that way. I'd check the count: if it said 4, I'd know I guessed wrong.

The worked example on screen -- top 3 most cited plus neighbours -- is 586 patents, three
starbursts. "It favors hubs, so density and clustering read high." Honest label. Three starbursts
tell me nothing; what I want is the neighbour list as rows, with a column saying whether each one
cites #1 or is cited by it. The table under it is sorted by citationsReceived and has no such
column.

Would neighbours of a big hub blow the selection cap? The select-all screen on the transfers graph
shows one hull and "12,113" instead of 12,113 rings. OK, so it won't melt if I select a lot. Not
my case here -- one patent's neighbours won't be thousands -- but good to know it degrades instead
of dying.

The "Bring in its links" screen is about pulling an account from another project. Not what "who
surrounds it" means here. I noted it and moved on.

**Saving it.** "Create rule set" is in the filter popover, and the main menu has Recipes. I didn't
open either. If I can't replay "sampled betweenness 500 seed 7, keep top 200, neighbours of #1,
cites only" on next month's file, it's a one-off.

**3D.** Didn't touch it.

---

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 3.**

Some of it got easier. Ctrl+K and typing "centrality" gave me Betweenness with "hours" next to it,
which is the fastest I've found a measure in any graph tool. The cost warning now lists "Sampled,
500 sources, a few minutes" as its own row instead of a red bar I'd read as a refusal. Find
searches the whole graph, the inspector says why the node isn't drawn, the two-step example makes
clear that neighbours come from the full graph, and select-all past the cap doesn't fall over.

But the two things that stopped me last time are still here. The run record says "Citations read
as undirected" while the run's own summary and options say Directed; the left-panel cost warning
says undirected while the popover says Directed. And the only worked example of keeping 200 keeps
the 200 most cited, with no screen of the table sorted by a sampled betweenness column and nothing
telling me how solid row 200 is. I had to invent the middle of the task from a protein screen and
a citations screen and hope they join. That's why it's lower, not higher: I got further, but I
trust the answer less.

**Would I use this instead of my current tool?** No. Next to it, maybe, for a first look, once
it's on the approved list -- that's a vendor review, not my call. My notebook does sampled
betweenness in three lines and I know which direction I asked for. This tool tells me the cost
before it runs, runs on my own GPU with a bar and a cancel, and tells me which ranks are noise --
real things my notebook doesn't do for free. The day the run record agrees with the panel, Keep
top rows shows the error band at the cut, and the neighbour step lets me pick "cites" versus
"cited by" with that as a column, I'd use it for the first pass and export the CSV into Splunk.
Until then, the first number that contradicts itself sends me back to the notebook.

---

## Problems observed

1. **Direction still contradicts itself.** Finished sampled run: summary and Options say
   "Directed"; its run record says "Direction: Citations read as undirected" and normalizes over
   "the node pairs of an undirected graph". The left-panel cost warning says "the directed citations
   read as undirected"; the popover version says "Directed, on the full graph". Same finding as
   round 5, unchanged. She would not report the result. (Severity 4: ends a real trial.)
2. **No patent screen shows the result the task is about.** Keep top rows, the kept graph and its
   Statistics ("the 200 most cited patents") all use citationsReceived. The decided statement "N rows
   are within the error bound of row 200" appears nowhere, because no screen sorts the patents by a
   sampled betweenness column. She had to assume the protein table's layout carries over. (Severity 3.)
3. **The not-drawn screen still offers only "Narrow the graph", and its first suggestion is the
   wrong measure.** The route to a measure exists (Quick actions, the main menu, Results' "Run a
   measure...") but not from the screen that says the graph is too big; on that screen the Quick
   actions bolt has no label. She got there only through her Ctrl+K habit. (Severity 3.)
4. **Scope of "Filter to neighbors" with a keep step on is not shown.** The Keep editor shows
   "Scope: Full graph, no steps above"; the Neighbors of a node editor shows no scope line. "Add
   their neighbors" reaches into the full graph (586 from 3), so she guessed Filter to neighbors
   does too, and would check the count. (Severity 2.)
5. **Neighbour direction defaults to Both, and no column says which side a neighbour is on.** On a
   directed citation graph "cites" and "cited by" are different pivots. (Severity 2.)
6. **The popover cost warning's "Exact, on 5,318 nodes" does not name the set**; the left-panel
   version does ("in Drug patents granted in 2001. This is a different graph."). (Severity 2.)
7. **The inspector does not show the node's score or rank from the run just finished**, so she
   cannot confirm from the node that she picked rank 1. (Severity 2.)
8. **"Nothing has been sent from this project" is missing on the not-drawn screen and on Find**,
   and nothing states where the app runs. (Severity 2.)
9. **The not-drawn notice sits in three places** (centred on the canvas, a toast bottom right, a
   toast bottom left) and the graph has three names (Citations, Citations 1999 to 2001, Patent
   citations). (Severity 1.)
10. **The inspector's neighbour and filter controls are icons only.** She hovered all three to
    find Filter to. (Severity 1.)
11. **No typed query.** Filter steps are dropdowns only. (Severity 1 for this task.)

## What delighted her

- "I typed 'centrality' into Ctrl+K and it showed me 'hours' next to Betweenness before I picked
  it. That's the command box I wanted."
- "The warning lists 'Sampled, 500 sources, a few minutes' as its own row now. I didn't have to
  poke a number to find out past the limit still runs."
- "It still tells me it won't draw instead of going white."
- "Only the top two ranks are called stable, out loud."
- "Keep top rows tells me about the tie at the cut and states its scope before I commit."
- "Seed is shown and editable; the run record has a Copy button for my case notes."
