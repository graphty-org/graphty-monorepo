# Session: rank Les Miserables characters by how much the network depends on them

Participant: Dr. Chen, computational biologist (persona: study/personas/bioinformatics-researcher.md)

Task as given: "You have never used this program before. You will practice on the ready-made network
of characters from the novel Les Miserables that comes with the program, not on your own data. Have
the program put the characters in order of how much the whole network depends on them, and tell us
the top three, in order, and what the order was based on."

Start screen: shots/tasks/r8-t07/01.png. Renders: tmp/round-8-sessions/r8-t07--bioinformatics-researcher/.
Every command was run from design/ui/prototype; `$S` stands for that render folder's absolute path.

## Think-aloud

**01 (start screen).** "Usage data banner -- no thanks. Samples on the right; Les Miserables, 77
characters. Fine, it's practice."

**02** `timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t07 --click "No thanks" --click "Les Miserables"`

"It opened with a lot already on it: PageRank painted, Louvain, shortest paths, a 'Top 9 by de...'
selection -- probably degree. Someone else's worked examples. 'How much the whole network depends on them'
is a bottleneck question to me, so I want betweenness, not degree and not PageRank. There's a Betweenness row
under 'For the report', and it's hidden."

**03** `... --click "Betweenness"`

"It says 'Covered by PageRank for Color' and 'Paints 77 nodes, none visible'. I don't care about the
color. I want a ranked list. There's a Data tab on the right."

**04** `... --click "Betweenness" --click "Data"` (the tool said "Data" matched two controls and clicked the first)

"That went to the Data page on the left instead of the tab. Useful anyway: 77 nodes, 254 edges,
undirected, weight is 'value', higher is stronger. Under attributes, 'betweenness' and 'degree' sit in
'Other attributes', as if they came in the file. I don't trust a number I didn't compute and can't see
the parameters for. I want the program to compute it."

**05** `... --hover "Analyze"` -> tooltip "Analyze Shift+A".

**06** `... --click "Analyze"`

"Good. 'Rank nodes and edges', each with a one-line definition. PageRank is badged 'Start here'; I'm
ignoring that. Betweenness: 'Which nodes sit on the most shortest paths between others.' That's it."

**07** `... --click "Analyze" --click "Betweenness Which nodes sit on the most shortest paths"`

"This is the best screen so far. Weight: value (loaded weight). Higher means: Stronger. It tells me all
254 edges have a value and none are left out, and that betweenness reads a weight as a distance using
1/value. That is the correct transform for co-appearance counts, and it is written down where a reviewer
can see it. 'Under a second.' Run."

**08** `... --click "Run"`

"A new row, 'Betweenness 2', at the top of the list with a progress bar. Still running in this frame."

**09** `... --click "Run" --click "Betweenness 2"`

"Still spinning. It said under a second. Selecting the row didn't change the right panel either; it still
shows the graph summary. Where is my result?"

**10** `... --click "Run" --click "Table"` (two controls matched "Table"; it clicked the button)

"A node table. '77 nodes, sorted by degree'. Not what I asked for. Above the columns there's a sentence:
'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Which three measures?
It doesn't say. The columns run off to the right."

**11** `... --click "Table" --click "Betweenness (full graph)"`

"There's the column. It's sorted descending now: Valjean 0.570 (#1 of 77), Myriel 0.177 (#2), Gavroche
0.165 (#3), Marius 0.132 (#4). The caption still says 'sorted by degree', which is wrong now. And
'Columns: 9 of 9' is the same as before my run while 'Betweenness 2' is still spinning, so I don't think
this is my column. Those three numbers look like the textbook unweighted, normalized betweenness for this
network. If so, this isn't the weighted 1/value run I just set up."

**12** `... --hover "Betweenness (full graph)"` -> no tooltip.

"No way to see from the header how this was computed."

**13** `... --click "Betweenness" --click "from Analyze"`

"'Measure from Analyze' just reopens the Analyze menu. 'Recent' gives the parameters for Louvain
(resolution 1.0, weight value) and PageRank (damping 0.85, weight value), but has no Betweenness entry. So
the existing column has no record of its parameters, and my own run never showed a result. I'll stop."

## Answer given

Top three by betweenness centrality, the share of shortest paths between other characters that pass
through each one:

1. Valjean (0.570)
2. Myriel (0.177)
3. Gavroche (0.165)

Caveat I'd put in the methods: I can't say whether these values are weighted. I set up a weighted run
(distance = 1/value) and it never visibly finished. The column I sorted has no parameters attached, and
its values match what I'd expect from an unweighted run.

## Did I succeed?

Partly. I have a defensible ranking and I know the measure. I can't state the weighting, which is the
first thing a reviewer would ask.

Single Ease Question: 4 / 7.

## Would I use this instead of my current tool?

Not yet. The Betweenness setup screen is better than anything Cytoscape gives me: it states the weight
column, its direction and the 1/value conversion before I run. But then the result disappeared into a
spinner. The table I found had a stale 'sorted by degree' caption and a 'top 3 on all three measures'
claim that doesn't name the measures. And the column couldn't tell me which run produced it. In igraph I'd
write `betweenness(g, weights = 1/E(g)$value)` and know exactly what I got. If every result column carried
the parameters it was run with, and I could export the table as TSV, I'd give it a second session.

## Problems observed

- My own run ("Betweenness 2") stayed in a running state, and its row never opened a result panel, even
  though the setup screen said it would take under a second (renders 08, 09, 10).
- The table caption kept saying "sorted by degree" after I sorted by betweenness (render 11).
- The summary line "Valjean is first on all three measures" doesn't name the three measures (render 10).
- Neither the sample's existing Betweenness row nor its table column shows how it was computed: weighted
  or not, normalized or not. "Measure from Analyze" only reopens the menu, and "Recent" lists parameters
  for Louvain and PageRank but not for Betweenness (renders 03, 12, 13).
- The Data page lists betweenness and degree under "Other attributes", the same as values that came in
  the file. Measured and imported values look alike there (render 04).
- The Graph rail button and the right panel's Data tab share the name "Data", and clicking went to the
  wrong one (render 04).
- PageRank carries a "Start here" badge, which pushes a newcomer toward a measure that doesn't answer a
  "depends on" question (render 06).

## What worked

- Analyze lists the ranking measures with plain one-line definitions, so mapping "depends on" to
  betweenness took seconds.
- The Betweenness setup states the weight column, its direction, the coverage (all 254 edges) and the
  1/value distance conversion before running.
- The table shows "#1 of 77" rank columns next to the raw values.
