# Session: find the communities in Les Miserables -- Expert Emma

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

Participant: Expert Emma (network scientist; networkx, igraph, Gephi). Start screen:
shots/tasks/r8-t08/01.png. Renders: tmp/round-8-sessions/r8-t08--expert-emma/NN.png.
All commands were run from design/ui/prototype.

## Think-aloud

**01 (start screen).** "Files are read on this computer and never uploaded" -- good, that is the
sentence I look for first, and "Local only" in the corner. Then a usage-data banner. It says
nothing is collected until I answer and it links to what is collected. Fine. No thanks. The
Les Miserables sample is right there; 77 characters, which matches the Knuth dataset. It says it
"opens with worked examples" already added. Hm. That means somebody may already have done my task.

**02.** `timeout 120 node app-b/study.mjs --try .../02.png task:r8-t08 --click "No thanks" --click "Les Miserables"`

It opened with a pile of rows on the left: PageRank, Louvain "6 groups", shortest paths, density,
groups for a report. The picture is colored by PageRank, not by community. The right panel says
PageRank "covers Louvain for Color". So the community coloring is there but hidden underneath.
Fine, I do not read communities off colors anyway. There is a "Louvain" tab at the bottom.

**03.** `... --click "No thanks" --click "Les Miserables" --click "Louvain"`

(The tool told me "Louvain" matched both the bottom tab and the left row; it opened the tab.)
A table: "6 communities", size, density, edges inside, edges leaving. Largest is Community 1 with
25. That is the shape of answer I want. It does not say which character is central in each, and
it does not give Q here. Where did these come from -- was this run with weights?

**04.** `... --click "Louvain, 1 note"`

Selected the Louvain row. Right panel: "Run from Louvain, Sep 28". So it was run before I got
here. Also "Covered by PageRank for Color on 77 of 77" -- honest, at least it tells me.

**05.** `... --click "Louvain, 1 note" --click "from Louvain, Sep 28"`

This is the panel I wanted. 6 communities, 0 unconnected nodes, modularity 0.565. Sizes with a
"Hub" per community: Community 1, hub Gavroche, 25. Community 2, hub Valjean, 17. Then Myriel,
Fantine, Thenardier, Gillenormand. "Made with": Louvain, weight "value, stronger", seed 7. A seed.
Somebody here has heard of reproducibility. Q of 0.565 is in the right neighborhood for weighted
Louvain on this graph from what I remember; I would check it in networkx before quoting it.

**06.** `... --click "All options..."`

Every parameter: resolution 1.0, level "final, most merged", max iterations 100, tolerance 1e-6,
direction "none in this graph", and damping/normalization explicitly "not used by Louvain" rather
than hidden. That is the parameter table I always want and never get. It still says "Louvain" and
not which implementation, and I would want to know resolution is the standard gamma on the null
term, not Gephi's inverted one. 1.0 is the same under both, so for today it does not matter.

**07.** `... --hover "Hub"`

What is a "hub"? Highest degree? Highest PageRank inside the group? Tooltip: "Select Gavroche 16
links inside Community 1". So hub = most links inside the community, internal degree. That is a
defensible definition of "at the center", and it is stated. I would have preferred the label say
"most links inside" rather than "hub", because a student will read "hub" as global degree, and
Valjean has the highest degree overall but sits in Community 2.

**08.** `... --click "Rerun"`

The moderator said to have the program pick the circles out, and this run is from Sep 28, so I
want to run it myself and see I get the same answer with seed 7. Clicked Rerun on the Louvain run.
What happened: the right panel jumped to the whole-graph summary, and a new row appeared at the
top of the list called "Betweenness 2" with a spinner. I asked to rerun Louvain. It is running
betweenness. That is exactly the kind of thing that makes me close a tool.

**09.** `... --click "Rerun" --click "Betweenness 2"`

Clicked the new row to see what it is. Nothing changed; still the whole-graph panel, still
"Betweenness 2" spinning. No sign of a Louvain rerun anywhere.

**10, 11.** `... --hover "Analyze"` then `... --click "Analyze"`

Fine, I will run it myself. The flask is "Analyze, Shift+A" -- a keyboard shortcut, good. The
menu has a search box, and Louvain under Recent with "Last run: Resolution 1.0, weight value".

**12.** `... --click "Analyze" --click "Louvain Last run: Resolution 1.0, weight"`

(Plain "Louvain" matched four things and the first was not clickable here; I picked the Recent
entry.) Dialog: weight = value, "higher means stronger", all 254 edges have the weight, resolution
1.0, "under a second". "Run as copy" or "Update Louvain row". The seed is not on this form even
though the run record shows seed 7 -- if I run it from here, which seed do I get?

**13.** `... --click "Run as copy"`

It says it would add Louvain as a copy at the top of the list, running. I cannot see the result
of my own run, so I cannot check that the same seed gives the same six communities. I will take
the Sep 28 run, whose parameters I have read in full.

## Answer given

Six communities (Louvain, weighted by co-appearance count, resolution 1.0, seed 7, Q = 0.565).
The largest has 25 characters. The character at its center is Gavroche, defined by the program as
the member with the most links inside the community (16). I would add that Valjean is the hub of
the second community and the highest-degree character overall, so "the center" depends on what
you mean by center.

## Verdict

- Succeeded? Yes, I think so, with the caveat that I read a result that was already in the
  sample rather than one I produced, because my rerun did not do what it said.
- Single Ease Question: 5 of 7. Finding the numbers and every parameter was quick and better than
  Gephi. Rerun launching betweenness cost me trust, and the run form not showing the seed is a
  gap for exactly the reproducibility check I wanted.
- Would I use it instead of my current tool? Not instead of the notebook for analysis. For a
  hand-off view to a non-coder, possibly yes: local-only stated up front, Q, seed and the full
  parameter list next to the result, and a "hub" that tells you what it means on hover. If Rerun
  had rerun Louvain and given me the same six groups, I would have said yes outright.

## Problems noticed

1. Rerun on the Louvain run record started a "Betweenness 2" row instead of rerunning Louvain,
   and moved the side panel to the whole-graph summary. Severe for trust.
2. The Louvain run form (from Analyze) has no seed field, though the run record shows seed 7.
3. "Hub" is not defined on screen; only the hover says it is links inside the community. Reads as
   global degree to a newcomer.
4. The sample opens with the community result hidden under PageRank coloring, so a first-time
   user does not see the communities in the picture.
5. The community table at the bottom has sizes but no hub and no modularity; you need the side
   panel for those.
6. The implementation behind "Louvain" and the resolution convention are not named.
