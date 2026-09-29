# Session: measuring bridges on a graph too big to measure exactly -- Priya, threat hunter

Participant: Priya, senior threat hunter at a regional bank (see the persona file,
study/personas/cybersecurity-analyst.md). Played in character.

Task as given by the moderator: "Measure who bridges the groups across this whole citation graph."

Screens used, in order: the measure options form with its cost (over budget, running the sampled
estimate, a sample size past the budget, and the version with no sampled method), the Results
panel (refused, running, finished), and the view of a graph past the drawing limit.

## Transcript

**Before starting.** "Patent citations. Not my data, fine, it's a lab file, so I don't care about
the approval list for this one. With my own logs the first question would be: where does this run
and does it call out? Nothing on this screen tells me. I'll keep going because it's a study."

**Reading the task.** "'Who bridges the groups.' In my world that's a choke point -- the account
or server that a lot of paths go through. That's betweenness. I'm not going to go hunting for a
'bridge' button. I'll type betweenness."

"Do they want me to find the groups first? Like run Louvain, then see who sits between the
clusters? Nothing on the screen ties 'groups' to anything. I'll assume betweenness is what they
mean and move on. If my lead asked me 'bridges between which groups', I'd have no answer."

**Screen: the measure options form, over budget.** "OK, left side, Catalog, Centrality,
Betweenness -- and it already says 'hours' next to it before I've clicked anything. Good. That's
the first graph tool that told me up front instead of letting me find out an hour in. BloodHound
just spun."

Clicks Betweenness. A small form opens.

"'Takes hours; exact runs stop at 30 seconds.' OK, so it refused. It refused in, what, instantly?
Good. I'd much rather get 'no' in one second than a spinner. 'E_CAP_EXCEEDED' -- fine, a code, I
can paste that into a ticket."

"'Undirected, on the full graph.' Wait. Right-hand panel says direction: directed. So it's
quietly treating citations as two-way? For a choke point on auth logs, direction matters a lot --
A logs into B is not B logs into A. It says it, at least, it doesn't hide it. But I don't see
where I'd switch it, and I don't know if that's even allowed for this measure."

"Three choices. 'Fits the budget': Sampled, 50 sources, under a minute. 'Exact on Drug
patent...' -- cut off, I can't read what that is. Some subset. Hovering would probably tell me.
That's not the whole graph anyway and the task says whole graph, so I skip it. 'Over the budget':
Exact on the full graph, hours."

"'Sampled, 50 sources.' 50 out of 124 thousand? That sounds like nothing. What does a 'source' even
mean here -- 50 starting nodes for the shortest paths? I kind of know how sampled betweenness works
from a notebook, but most of my team wouldn't. And I've got no idea if 50 gives me a ranking I'd
trust."

The blue button already says "Run sampled". Clicks it.

**Screen: running the sampled estimate.** "Progress bar in the form and another one down at the
bottom with Cancel. 'Running, under a minute, within the budget.' OK, I can see it working, it's
not white, it's not frozen. That's the bar."

"Now I see the options. Sample size 50 'of 124,318'. 'About 100 fits the budget.' Then why did
you give me 50? Give me the 100. And there's a Seed field that says 'random'."

"Random seed is a problem. If I run this again next month on the new export and the top ten
shuffles, is that the data changing or the dice? I need to be able to pin that. It says 'Edits wait
for Re-run', so I guess I could type a number in. But nothing tells me what seed it actually used
this time. If I can't reproduce a number, it doesn't go in a case."

"'Readings, when it finishes: scores are estimated from 50 sources. The top of the ranking is
usually stable; a single score can be well off.' 'Usually.' Usually how? Top 10? Top 100? Give me
something I can put a number on. But honestly -- that sentence is the most useful thing on this
screen. It tells me how to read it: trust the order at the top, don't quote the decimals. That's
fair."

**Screen: sample size past the budget.** "Fine, it said 100 fits, I'll be greedy." Types 500.

"Red under the field: '500 sources take a few minutes; runs stop at 30 seconds.' Run button
greyed out. OK. That's clear. It didn't let me walk into a timeout. I'd back it down to 100."

"But 'runs stop at 30 seconds' -- who picked 30 seconds? I'd happily wait five minutes for a better
number while I go do something else. Is that a setting? I don't see one. That annoys me a bit. A
few minutes is nothing compared to the SIEM."

"And the first result is still there -- 'Finished on 50 sources.' Good, it didn't throw my result
away because I typed a bad number."

**The version with no sampled method.** The moderator shows the variant where only the subset and
the exact full run are offered.

"So here I don't get the sample at all. My choices are some drug-patent subset I can't read the
name of, or hours. The task was the whole graph. I'd pick... nothing. I'd export the edge list and
do it in networkx with k= set, which is what I'd do anyway. If that's how it ships, this task fails
for me."

**Screen: the Results panel, finished.** Clicks "Top nodes" in the sampled result.

"Where's my ranking? The finished view I get shown is a different graph -- proteins -- with a
histogram and a top nodes list, '295 more in the table'. OK, assume the same thing on patents. I
don't care about the histogram. I want the table: node, score, sorted, and a CSV button. Export is
top right, but it doesn't say what it exports. A picture? The scores? Rows?"

"And I need the result to say it was sampled wherever I see the number. If someone opens the CSV
next week and sees 'betweenness' with no 'sampled, 50 sources, seed whatever' on it, they'll quote
it like it's exact."

**Screen: past the drawing limit.** "'124,318 nodes not drawn: more than this browser draws at
once.' Fine by me. I don't want the hairball. There's a table underneath sorted by citations
received. Can I add betweenness as a column and sort by it? That's the only thing I actually want
from this whole task. It's not on this screen, so I don't know."

"Also the graph is called 'Patent citations' on one screen and 'Citations 1999 to 2001' on
another. Same graph? If the name changes I start wondering if the data changed."

"'Running on WebGPU' on the other screen. My Edge might have that turned off by policy. Would it
tell me it's on the slow path, and would 'under a minute' still be true? I'd want the time estimate
to know which one it's on."

## After the task

**Single Ease Question (1-7):** 5.

"Finding it and getting a number out was easy enough. It never hung and it told me the cost before
I clicked. What knocks it down: I'm not sure 50 samples is enough, I can't pin or even see the seed,
I don't know if 'groups' meant something else, and I haven't seen my scores come out as rows."

**Would you use this instead of your current tool?**

"No, not instead. My notebook does sampled betweenness with a fixed seed and gives me a dataframe I
can sort and save. What I'd use this for is the step before: load the file, see the sizes, see which
measures are cheap and which are hours, and get a rough top-ten fast without writing code. The
refusal-with-options thing is honestly better than anything I've used -- nothing spun. If it pinned
the seed, told me which engine it ran on, and let me export the ranking as a CSV that says 'sampled'
on it, I'd hand it to a tier-2 who doesn't write Python."

## Problems observed

1. Seed shows "random" and never shows the seed a run used, so a sampled ranking cannot be
   reproduced next month. For her that disqualifies the number from a case. (Severity 3)
2. The sample default is 50 while the form itself says about 100 fits the budget; she asked why
   she was not given the better default. (Severity 2)
3. "Sampled, 50 sources" is not explained; she half-knew it, and says most of her team would not.
   "Usually stable" gives no range she can quote. (Severity 2)
4. Direction mismatch: the form says it measures undirected while the graph panel says directed,
   with no visible way to choose or reason given. She notices within seconds. (Severity 2)
5. The subset option is truncated ("Exact on Drug patent..."), so she cannot tell what it is.
   (Severity 1)
6. The task's "groups" has no link to anything on screen; she guessed betweenness and was unsure
   whether groups should come first from a community measure. (Severity 2)
7. In the version with no sampled method, the whole-graph task has no path under the budget; she
   says she would leave for her notebook. (Severity 4)
8. She could not find how the ranking leaves as rows: Export does not say what it exports, and the
   node table is not shown with a betweenness column. (Severity 3)
9. The 30-second cap is fixed; she would accept a few minutes in the background and saw no way to
   ask for it. (Severity 2)
10. The same graph is named "Patent citations" on one screen and "Citations 1999 to 2001" on
    another, which makes her wonder whether the data changed. (Severity 1)

## What she liked, in her words

- "It said 'hours' next to Betweenness before I clicked it. Nobody does that."
- "It said no in a second instead of spinning for an hour, and gave me something I could run."
- "Red text under the field, Run greyed out, and my first result still there. That's how a refusal
  should look."
- "'Top is stable, single scores can be off' -- that's the right way to tell me how to read it."
