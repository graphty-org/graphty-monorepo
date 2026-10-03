# Session: rank characters by how much the network depends on them -- nonprofit operations analyst (Grace)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

Start screen: shots/tasks/r8-t07/01.png. Renders: tmp/round-8-sessions/r8-t07--nonprofit-operations-analyst/.
All commands were run from design/ui/prototype; the long prefix below is shortened to `$T` =
`tmp/round-8-sessions/r8-t07--nonprofit-operations-analyst`.

## Steps, thinking aloud

1. Start screen (01.png). "A usage-data banner first. I'll say no thanks. Good that it says files
   are never uploaded. Les Miserables is right there under Samples."

2. `timeout 120 node app-b/study.mjs --try $T/02.png task:r8-t07 --click "No thanks" --click "Les Miserables"`
   (02.png) "Wow, a lot is already on here: PageRank, Louvain, Shortest paths, Betweenness with a
   crossed-out eye, 'Top 9 by de...'. I don't know these words. Nothing says 'how much the network
   depends on them'. The panel on the right says 'Measure from Analyze', so measures live in
   Analyze. But a table I can sort is my comfort zone."

3. `timeout 120 node app-b/study.mjs --try $T/03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"`
   (03.png) "A table, sorted by degree: Valjean 36, Gavroche 22, Marius 19. A line says 'Valjean
   is first on all three measures' -- which three? Degree sounds like a count of connections.
   'Depends on' feels different to me: the person who leaves a hole if they leave."

4. `timeout 120 node app-b/study.mjs --try $T/04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "from Analyze"`
   (04.png) "A list of measures, each with a one-line description. Good. PageRank has a 'Start
   here' badge: 'connected to other well-connected nodes'. Betweenness: 'which nodes sit on the most
   shortest paths between others'. That is the go-between. In my world that's the board member
   who is our only line to a funder. That is what 'depends on' means to me, so Betweenness, even
   though 'Start here' points elsewhere."

5. `timeout 120 node app-b/study.mjs --try $T/05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Betweenness"`
   The tool reported two things called Betweenness (the existing row in the left list and the
   entry in the Analyze list) and the click on the first one timed out. I meant the one in the
   list I was looking at, so I re-aimed at it:
   `timeout 120 node app-b/study.mjs --try $T/05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Betweenness Which nodes sit on the most"`
   (05.png) "Weight, 'Higher means: Stronger / Farther / Capacity', 'reads a weight as distance:
   it uses 1/value'. I have no idea. I'll leave the default. 'Under a second' -- fine, Run."

6. `... --click "Run"` (06.png) "A new row 'Betweenness 2' at the top of the list with a loading
   bar. The picture still says 'Color: PageRank'. Nothing visibly changed."

7. `... --click "Run" --click "Betweenness 2"` (07.png) "Still spinning. It said under a second.
   The right side didn't change to show me my result. Is it stuck?"

8. `... --click "Run" --click "Betweenness 2" --click "Table"` (08.png) "Same table, still sorted
   by degree, no new column I can see, row still spinning."

9. `timeout 120 node app-b/study.mjs --try $T/09.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Table" --click "Columns: 9 of 9"`
   (09.png) "There is a betweenness column, it was just off to the right. And odd: in this view my
   'Betweenness 2' row is gone from the left list. Did my run finish, or vanish?"

10. `timeout 120 node app-b/study.mjs --try $T/10.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "from Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Table" --click "Betweenness (full graph)"`
    (10.png) "Now the arrow is on Betweenness (full graph): Valjean 0.570 (#1 of 77), Myriel 0.177
    (#2), Gavroche 0.165 (#3), Marius 0.132 (#4). But the line above the table still says
    'sorted by degree', which is now wrong. And 'Betweenness 2' is spinning again in the list, so I
    can't tell whether these numbers are from my run or from the Betweenness row that was already
    there. The PageRank rank column happens to give the same top three. I'll go with it."

## Answer given

1. Valjean, 2. Myriel, 3. Gavroche -- ordered by betweenness: how often a character sits on the
shortest route between two other characters, with the defaults the program offered (it used the
co-appearance count as the weight, read as distance).

## Debrief

- Succeeded? I think so, about 70 percent sure. I picked the measure myself from the descriptions,
  and the table sorted by it. What lowers my confidence: my run never visibly finished, the table
  caption said "sorted by degree" while the arrow was on betweenness, and there was already a
  Betweenness row before I ran anything, so I may be reading the old one. Also the program never
  told me which measure fits "depends on"; "Start here" pointed at PageRank instead.
- Single Ease Question: 4 of 7.
- Would I use this instead of my current tool (Excel)? Maybe, for this kind of question. Excel
  can't tell me who the go-betweens are at all, and the one-line descriptions in Analyze were the
  first time these words made sense to me. But the sample opened with so much already on it that
  I couldn't tell what I had done from what was there, and I'd need the result to say clearly
  "done, here is the ranking" before I'd put it in front of the board.

## Problems seen

- The run gave no visible finish: "Betweenness 2" kept a spinner across every screen though the
  dialog promised "Under a second"; the right panel never showed the result.
- The table caption "sorted by degree" did not update when I sorted by betweenness.
- A new run and an existing hidden Betweenness row coexist; I could not tell which one the table
  column came from. In one view my new row was missing from the list entirely.
- The new column landed off-screen to the right; I found it only through the Columns list.
- The weight options ("Stronger / Farther / Capacity", "uses 1/value") are meaningless to me.
- "Start here" on PageRank steers a newcomer away from the measure that matches "depends on".
- The sample opens with many measures already applied, so the starting screen is overwhelming.
