# Session: door swipes, one link per person and building -- Expert Emma

Task as given by the moderator: "You are bringing in the door swipes, and as things stand every
single swipe would be drawn as its own line between a person and a building, which will make a
mess. Change it so each person is linked to each building once, with how often they went in kept
on that link. Then try making each swipe something you can click on by itself, and see what that
does to the picture."

Participant: Expert Emma (network scientist; notebook first, GUI second).

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t19--expert-emma/`.

## Start screen

(Start screen: `shots/tasks/t19/01.png`.)

Emma: "An import screen for an entries table. Header line says
`person (412) --entries (4,180 edges from 4,212 rows)--> building (9)`. Good, that is the
actual schema written out, I like that. 4,212 rows, 4,180 edges, so 32 rows lost on unmatched
keys, and the match report says exactly that: 25 person_ids not in people, 7 building_ids not in
buildings. Also it noticed the leading-zero thing on person_id and did NOT merge them. Correct.
'Local only' at the top -- I will take that at face value for now.

The toolbar row: 'Each row is: a node / an edge', 'One edge per: Row / Pair', and 'Weight: none
(each edge counts 1)'. So 'One edge per Pair' is the thing. That is a multigraph-to-weighted-graph
collapse. Let me click it."

## Step 1 -- one edge per pair

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--expert-emma/01.png task:t19 --click "Pair"
```

Emma: "Header now: 1,306 edges from 4,180 of 4,212 rows. A banner: 'One row per pair: each is
one edge, its count the rows it merged.' Time got split into time (earliest) and time (latest),
with a 'Combine: Earliest and latest' choice, and a derived 'count' column marked as Weight,
'Higher means Stronger'. That is precisely what I wanted -- and the 'Stronger / Farther /
Capacity' choice is the thing most tools never ask. A swipe count is a strength, not a distance;
if someone ran shortest paths over this as a distance they would get nonsense, so it is good it
asks. Default is right.

1001 to B1 shows count 22, earliest 03-02 07:58, latest 03-27 17:12. Earlier on the raw screen
1001/B1 appeared twice in the first eight rows; now once. Fine.

Two nits. The footer still says 'Showing the first 7 of 4,212 rows.' These are pairs now; it
should say of 1,306. Second, the unmatched rows show 'left out' in the count column but are still
listed as table rows. That is honest, I suppose, but a row that becomes no edge sitting in a list
of edges is confusing. I would rather the footer said 1,306 pairs plus 32 left out.

Is the weight sum preserved? 4,180 rows merged into 1,306 pairs, so the counts should sum to
4,180. It does not show me the sum. I would check that in pandas in two seconds; here I have to
trust it."

## Step 2 -- each swipe as its own thing

Emma: "Now 'make each swipe clickable by itself'. An edge you cannot pick out of a merged pair, so
the swipe has to become a node. 'Each row is: a node'. That gives you the person - swipe -
building tripartite form."

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--expert-emma/02.png task:t19 --click "Pair" --click "a node"
```

Emma: "Header: `person (412) <--person_id-- entry (4,212) --building_id--> building (9)`. Yes,
that is the right structure. Columns now say 'Links to -> person', 'Links to -> building'. Key is
'row number (no Key column)', with a warning that notes on entries may move if the row order
changes. Correct warning; I would add a key myself in the notebook.

But the 'One edge per Row / Pair' control is gone, and so is my weight. It replaced the pairing
rather than adding to it. I asked for both, really: one weighted person-building link AND the
individual swipes. That is not an option here -- it is one or the other. If I want both I
suppose I import the file twice, once each way? Nothing says so."

## Step 3 -- what it does to the picture

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--expert-emma/03.png task:t19 --click "Pair" --click "a node" --click "Load"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--expert-emma/04.png task:t19 --click "Pair" --click "Load"
```

Emma: "Swipes as nodes: 'Reading 3 tables: 4,633 nodes, 8,392 edges'. Pairs: '421 nodes, 1,306
edges'. 412 + 9 + 4,212 = 4,633, so the arithmetic is right. 8,392 is 2 x 4,212 minus the 32
dangling ends, so the unmatched swipes come in as nodes with one link instead of being dropped.
Interesting -- in edge mode they were left out, in node mode they hang off one end. That is
defensible but it is a difference nobody told me about.

The picture itself I never saw; both screens sat on the progress dialog with a Cancel button. So
'what does it do to the picture' I can only answer from the counts: ten times the nodes, six times
the edges, and 4,212 degree-2 nodes. That is a hairball. For nine buildings I would not draw it
this way at all; I would draw the weighted bipartite graph and look at a swipe from a table.
At least the progress dialog has a Cancel. I give it that."

## Step 4 -- did it keep my pairing?

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t19--expert-emma/05.png task:t19 --click "Pair" --click "a node" --click "an edge"
```

Emma: "Back to 'an edge'. One edge per: Row. It threw my Pair choice away silently, and Weight is
back to 'none'. That is the kind of thing that bites you: toggle to look, toggle back, and the
setting you made is gone. Undo would probably fix it, but I should not have to."

## Outcome

- Succeeded? Yes for the first half: one link per person-building pair with a count as its
  weight, and it even asked whether higher means stronger. Partly for the second: swipes as nodes
  works and the counts are right, but I could not see the resulting picture, and I could not have
  the swipes and the weighted pairs at the same time.
- Single Ease Question: 5 of 7. The pairing was one click and clearly labeled. Lost points for
  the stale "of 4,212 rows" footer, the silent reset of Pair when switching row type, and the
  unexplained difference in how unmatched rows are handled between the two modes.
- Would I use this instead of my current tool? For this step, maybe. In pandas this is a
  `groupby(['person_id','building_id']).agg(count=('time','size'), first=('time','min'),
  last=('time','max'))` -- one line, and I can check the sum. What this does better is the match
  report: the leading-zero warning and the unmatched-key counts are things I usually find a day
  later. If it exported that report, or the merged edge table, I would use it as a check on my own
  code. As a replacement for the notebook, no.

## Problems noticed

1. After choosing Pair, the table footer still says "Showing the first 7 of 4,212 rows" when there
   are 1,306 pairs.
2. Switching "Each row is" to a node and back to an edge silently resets "One edge per" from Pair
   to Row and drops the weight.
3. There is no way to get the weighted person-building link and the individual swipes as nodes at
   once; it is one or the other, and nothing says how to get both.
4. Unmatched rows are dropped in edge mode but come in as one-ended swipe nodes in node mode; the
   match report does not say so.
5. The sum of the counts (should be 4,180) is not shown, so I cannot check the merge kept every
   row.
6. After Load, both versions stayed on the progress dialog; I never saw the picture the task asked
   about.
