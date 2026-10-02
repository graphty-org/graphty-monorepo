# Session: door swipes, one link per pair, then each swipe on its own -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional), associate professor, Gephi user for more than ten years.

Task as given: "You are bringing in the door swipes, and as things stand every single swipe would be
drawn as its own line between a person and a building, which will make a mess. Change it so each
person is linked to each building once, with how often they went in kept on that link. Then try
making each swipe something you can click on by itself, and see what that does to the picture."

Start screen: shots/tasks/t19/01.png

## Start screen

Think-aloud: "So this is the import report, the screen Gephi shows after you pick a spreadsheet.
Three tables: people 412, buildings 9, entries 4,212. The header says 4,180 edges from 4,212 rows,
which means 32 rows are missing an end, and the match report lists them: 25 people and 7
buildings. Good, it tells me that up front. Gephi would have created those as blank nodes without
saying anything. In the toolbar I see 'One edge per Row / Pair' and 'Weight: none (each edge counts
1)'. In Gephi this is the merge strategy for parallel edges, which is buried in a dropdown at the
end of the import wizard. 'Pair' has to be it."

## Step 1 -- one link per person and building

Command:

    timeout 120 node app-b/study.mjs --try .../tmp/round-7-sessions/t19--gephi-holdout/01.png task:t19 --click "Pair"

Saw: the header changes to "person (412) --entries (1,306 edges from 4,180 of 4,212 rows)-->
building (9)". A banner reads "One row per pair: each is one edge, its count the rows it merged."
The time column splits into "time (earliest)" and "time (latest)" with a Combine control set to
"Earliest and latest". A new derived "count" column appears, already marked Weight, with "Higher
means Stronger / Farther / Capacity". Person 1001 to B1 has a count of 22. The rows with a missing
end show "left out" in the count column. The bottom line reads "4,180 entries became 1,306
person-building edges."

Think-aloud: "That is the job done, and done better than in Gephi. Gephi sums the weights and keeps
whichever timestamp it happens to keep, without telling me which. Here I get the count as the
weight, and the first and last swipe, before I load anything. 'Stronger' is the correct reading
for a count. I would want to check that 22 against a group-by in pandas, but the arithmetic is
consistent: 4,180 rows that have both ends, 1,306 distinct pairs. One thing: 'Pair' on its own did
not tell me what it would do. I guessed it because I know the concept. A student would not."

## Step 2 -- each swipe as something I can click on

Think-aloud: "Clicking each swipe by itself. Going back to Row gives me 4,180 parallel lines, the
mess I just got rid of, and you cannot click one line in a stack of 22 anyway. So 'Each row is a
node' is the option I want."

Command:

    timeout 120 node app-b/study.mjs --try .../02.png task:t19 --click "Pair" --click "a node"

Saw: the header becomes "person (412) <--person_id-- entry (4,212) --building_id--> building (9)".
Type: entry; Key: row number (no Key column). The id columns now read "Links to -> person" and
"Links to -> building". The match report buttons now read "Leave out the link" instead of
"Leave out". Bottom line: "4,212 entries became 4,212 entry nodes; 4,180 have both edges."
The Pair setting, the count and the earliest/latest columns are gone.

Think-aloud: "Right, it turns the edge list into a tripartite graph: person, swipe, building. Each
swipe is a node with its own time, so I can click it. That is what I would do in Python to keep
the events. But the person-building weight I just built is gone; I cannot have both the weighted
link and the individual swipes. And the 32 bad rows are now 32 swipe nodes hanging off one side,
with only one link each. 'Leave out the link' is honest about that, but I would rather drop those
rows altogether, and I do not see that option here. For the picture this means about 4,600 nodes
instead of 421, and almost all of them are small degree-2 dots between a person and a building.
ForceAtlas2 will pull each one between its two ends, so it will look like a hairball with grains
in it. I want to see it, so I'll load it."

## Step 3 -- load it and look

Command:

    timeout 120 node app-b/study.mjs --try .../03.png task:t19 --click "Pair" --click "a node" --click "Load"

Saw: the Graph view with a progress dialog: "Reading 3 tables. people.csv, buildings.csv,
entries.csv: 4,633 nodes, 8,392 edges..." and a Cancel button. The canvas is empty.

Think-aloud: "4,633 is 412 + 9 + 4,212. 8,392 is 4,180 times 2, plus 32 half-links. The counts are
right, which is the first thing I check. But I never get to see the picture, only the progress
bar."

## Step 4 -- load the Pair version to compare

Command:

    timeout 120 node app-b/study.mjs --try .../04.png task:t19 --click "Pair" --click "Load"

Saw: the same progress dialog: "421 nodes, 1,306 edges..." and an empty canvas.

Think-aloud: "421 nodes and 1,306 edges, as the import screen promised. Again no picture. I stop
here: I could prove the counts but I could not compare the two drawings, and the drawing was half
of what I was asked to look at."

## Debrief

- **Succeeded?** Mostly. The first part is clearly done: one weighted link per person and building,
  with the count as the weight. For the second part I found the switch and understood what it does
  to the structure from the header and the counts, but I never saw the resulting picture, because
  both loads stopped at a progress bar.
- **Single Ease Question:** 6 of 7. The merge was one click and its result was shown before
  loading. I lost a point because I had to know what 'Pair' meant and because I never saw the
  picture.
- **Would I use this instead of Gephi?** For this import step, yes, I would rather have this than
  Gephi's spreadsheet wizard: it shows the merge, the dangling rows and the resulting counts before
  I commit, and Gephi does none of that. But this is one screen. I stay on Gephi until I see this
  graph spatialized, with ForceAtlas2 settings I can name, and can export it as an SVG.

Problems noted:
1. Loading never showed the graph, so I could not see what turning swipes into nodes did to the
   picture, which was half the task.
2. "Pair" does not say "merge". The banner explains it only after you click it.
3. Swipes as nodes removes the weighted person-building link. I cannot keep both the count and the
   individual swipes.
4. Rows with a missing end become dangling swipe nodes. In node mode I saw no way to drop those
   rows completely.
