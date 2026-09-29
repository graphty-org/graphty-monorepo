# Tree test transcript: Emma, network scientist

Participant: simulated from `../../personas/expert-emma.md`. A network scientist who lives in
Python notebooks (networkx, igraph), uses Gephi for the final figure, and checks every tool for
where the data goes, whether edge weights are used, and whether the run parameters are visible.
She reads labels literally, skips anything that sounds like marketing, and wants the numbers in a
table.

She saw only the text outline of the navigation, one level at a time, in two separate sessions
with no memory of each other. In the first, the list of calculations and their results sit in the
right panel. In the second, they are a place of their own on the rail (the strip of places down
the left edge), and the right panel with nothing selected has no results section. Everything else
in the outline is the same.

Paths use ">" for a step down and "(back)" for a step back up. Confidence is 1-7 (7 = certain).
Correct and direct were marked afterwards against the answer key; the answers were not changed.

## Session 1: results in the right panel

### 1. Start a second ranking to check against the first
"A second centrality. If the first was betweenness I want PageRank or eigenvector next to it.
That's an algorithm list." Main menu > Algorithms > Centrality.
- Ends: Main menu > Algorithms > Centrality
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 2. Valjean's score and where he places
"Holds the groups together -- betweenness, or bridges. Click Valjean, read his value and rank."
Right panel, with a node selected > Results. "Rank of how many, I hope. If not, the table."
- Ends: Right panel, with a node selected > Results
- First top-level pick: Right panel (node selected). Confidence: 5
- Correct: yes. Direct: yes.

### 3. Where an earlier calculation's setup is recorded
"This is the one I actually care about. Method, seed, weights, normalization." Scanned the top
level, saw "Right panel, with a result selected". > Details (the run record: method, seed,
settings). "That's the right words. Whether it lists normalization, I'd have to see."
- Ends: Right panel, with a result selected > Details
- First top-level pick: Right panel (result selected). Confidence: 6
- Correct: yes. Direct: yes.

### 4. Every character's score, highest first
"Table, sort descending. Same as a DataFrame." Bottom table > Column header menu (sort).
- Ends: Bottom table > Column header menu (sort)
- First top-level pick: Bottom table. Confidence: 6
- Correct: yes. Direct: yes.

### 5. Make a bigger transfer count as more expensive on the cheapest route
"Weight is cost or weight is strength -- that's a parameter of the shortest-path run, not of the
data." Main menu > Algorithms > Path > Shortest path. "Nothing here says weight. I'm assuming the
dialog shows it. I have been burned on this before." Considered Data > Sources > Its columns but
did not open it: "the column shouldn't decide that for every algorithm."
- Ends: Main menu > Algorithms > Path (Shortest path)
- First top-level pick: Main menu. Confidence: 4
- Correct: yes. Direct: yes.

### 6. A picture of the network for the paper
"Export. SVG if they have it; I'll probably screenshot anyway." Main menu > File > Export...
- Ends: Main menu > File > Export...
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 7. Bring in a colleague's file of their team's colors and sizes
"It's a file." Main menu > File > Open... "Opens as a new project. No, I want it applied to this
one." (back) (back). "Recipes. I don't love the word, but 'apply' is the verb I want." Main menu >
Recipes > Apply a recipe... "Guessing a recipe is a saved style. Could just as well be Add a layer
in the style stack."
- Ends: Main menu > Recipes > Apply a recipe...
- First top-level pick: Main menu. Confidence: 3
- Correct: yes. Direct: no.

### 8. Next month's transfers file, keeping the setup
"Update, not open. Exactly the word." Main menu > File > Update with new data...
"And I will check the node and edge counts afterwards."
- Ends: Main menu > File > Update with new data...
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 9. Two groups in colors she cannot tell apart
"Legend. That's where I see the two colors next to each other." Canvas > Legend > Each entry's
swatch. Saw "High contrast" in passing under the style stack's Look later in the session and
ignored it: "That changes everything, I want one group."
- Ends: Canvas > Legend > Each entry's swatch
- First top-level pick: Canvas. Confidence: 5
- Correct: yes. Direct: yes.

### 10. Accounts that take in far more money than they send out
"Weighted in-degree against weighted out-degree. Strength, in and out." Main menu > Algorithms >
Centrality (Weighted degree: in, out). "Then I want the difference or the ratio, which is a new
column in the table. There's no 'net flow' in the list, so two runs and a column."
- Ends: Main menu > Algorithms > Centrality (Weighted degree)
- First top-level pick: Main menu. Confidence: 5
- Correct: yes. Direct: yes.

### 11. Total money along a selected route
"Selected transfers are edges. The right panel only has node, set, path, result -- the table
it is." Bottom table > Footer (sum over the selected rows). "Good, that is the literal thing."
- Ends: Bottom table > Footer
- First top-level pick: Bottom table. Confidence: 6
- Correct: yes. Direct: yes.

### 12. How the biggest group differs from the rest
"Biggest group -- a community. Select the group." Right panel, with a set, a group or a path
selected: Appearance, Members, Notes. "Nothing about what it is." (back). Right panel, with a
result selected > Compare with... (another result, or the rest of the graph). "That's it, if
'the rest of the graph' means what I think."
- Ends: Right panel, with a result selected > Compare with...
- First top-level pick: Right panel (set or group selected). Confidence: 4
- Correct: yes. Direct: no.

### 13. A stray click cleared 18 selected characters
"Undo, normally." Main menu > Edit, saw Previous selection under Undo. > Previous selection.
"Better. Undo on selections is usually a lie."
- Ends: Main menu > Edit > Previous selection
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 14. Take out only the wrong middle filter step
"The chip says the steps applied." Filter chip > Filter steps (turn off, edit, move, delete).
"Delete step two."
- Ends: Filter chip > Filter steps
- First top-level pick: Filter chip. Confidence: 6
- Correct: yes. Direct: yes.

### 15. Has anything from this project left the computer?
"First thing I'd look for anyway. The line under the name says nothing was sent -- a claim.
I want the log." Data > Sent and saved.
- Ends: Data > Sent and saved
- First top-level pick: Data. Confidence: 6
- Correct: yes. Direct: yes.

### 16. Where money went next after leaving one account in early August
"Out-neighbors, with a time window." Right panel, with a node selected > Header actions:
Neighbors (hops, direction, a date window). "Direction out, window August. One hop, then two."
- Ends: Right panel, with a node selected > Header actions (Neighbors)
- First top-level pick: Right panel (node selected). Confidence: 5
- Correct: yes. Direct: yes.

## Session 2: results as a rail place

### 1. Start a second ranking to check against the first
Main menu > Algorithms > Centrality. Saw "Results (rail)" on the way down: "Also fine, but I want
the list of algorithms, not the list of results."
- Ends: Main menu > Algorithms > Centrality
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 2. Valjean's score and where he places
"There's a Results place. His score is in there." Results (rail) > Each run > (open the
betweenness run): State line, Top nodes... "Top nodes. He might not be in the top. I want his
row." (back) (back) > Right panel, with a node selected > Results.
- Ends: Right panel, with a node selected > Results
- First top-level pick: Results (rail). Confidence: 4
- Correct: yes. Direct: no.

### 3. Where an earlier calculation's setup is recorded
Results (rail) > an opened run > Details (method, seed, settings).
- Ends: Results (rail) > an opened run > Details
- First top-level pick: Results (rail). Confidence: 6
- Correct: yes. Direct: yes.

### 4. Every character's score, highest first
Bottom table > Column header menu (sort). "Results has 'Show in table, sorted', which is the same
thing with a click more."
- Ends: Bottom table > Column header menu (sort)
- First top-level pick: Bottom table. Confidence: 6
- Correct: yes. Direct: yes.

### 5. Make a bigger transfer count as more expensive on the cheapest route
Main menu > Algorithms > Path > Shortest path. Same reasoning as before: "It's a run parameter."
- Ends: Main menu > Algorithms > Path (Shortest path)
- First top-level pick: Main menu. Confidence: 4
- Correct: yes. Direct: yes.

### 6. A picture of the network for the paper
Main menu > File > Export...
- Ends: Main menu > File > Export...
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 7. Bring in a colleague's file of their team's colors and sizes
Main menu > File > Open... "New project, no." (back) (back) > Right panel, with nothing selected >
Style stack > Add a layer. "A style file is layers. Add them." Did not open Recipes this time:
"Recipe sounds like a workflow, not a palette."
- Ends: Right panel, with nothing selected > Style stack > Add a layer
- First top-level pick: Main menu. Confidence: 3
- Correct: no. Direct: no.

### 8. Next month's transfers file, keeping the setup
Main menu > File > Update with new data...
- Ends: Main menu > File > Update with new data...
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 9. Two groups in colors she cannot tell apart
Canvas > Legend > Each entry's menu (Change color...).
- Ends: Canvas > Legend > Each entry's menu
- First top-level pick: Canvas. Confidence: 5
- Correct: yes. Direct: yes.

### 10. Accounts that take in far more money than they send out
Main menu > Algorithms > Centrality (Weighted degree: in, out). "Two runs and a difference column
again."
- Ends: Main menu > Algorithms > Centrality (Weighted degree)
- First top-level pick: Main menu. Confidence: 5
- Correct: yes. Direct: yes.

### 11. Total money along a selected route
Bottom table > Footer.
- Ends: Bottom table > Footer
- First top-level pick: Bottom table. Confidence: 6
- Correct: yes. Direct: yes.

### 12. How the biggest group differs from the rest
"The groups came from a community run. That run is in Results." Results (rail) > an opened run >
Compare with... (the rest of the graph).
- Ends: Results (rail) > an opened run > Compare with...
- First top-level pick: Results (rail). Confidence: 4
- Correct: yes. Direct: yes.

### 13. A stray click cleared 18 selected characters
Main menu > Edit > Previous selection.
- Ends: Main menu > Edit > Previous selection
- First top-level pick: Main menu. Confidence: 6
- Correct: yes. Direct: yes.

### 14. Take out only the wrong middle filter step
Filter chip > Filter steps.
- Ends: Filter chip > Filter steps
- First top-level pick: Filter chip. Confidence: 6
- Correct: yes. Direct: yes.

### 15. Has anything from this project left the computer?
Data > Sent and saved. "The line under the name is nice. The log is what I'd send IT."
- Ends: Data > Sent and saved
- First top-level pick: Data. Confidence: 6
- Correct: yes. Direct: yes.

### 16. Where money went next after leaving one account in early August
Main menu > Selection > Neighbors... (hops, direction, a date window). "Same thing as on the
node, I assume."
- Ends: Main menu > Selection > Neighbors...
- First top-level pick: Main menu. Confidence: 5
- Correct: yes. Direct: yes.

## Scoring

| Task | Session 1 (right panel): correct / direct | Session 2 (rail): correct / direct |
|---:|---|---|
| 1 | yes / yes | yes / yes |
| 2 | yes / yes | yes / no |
| 3 | yes / yes | yes / yes |
| 4 | yes / yes | yes / yes |
| 5 | yes / yes | yes / yes |
| 6 | yes / yes | yes / yes |
| 7 | yes / no | no / no |
| 8 | yes / yes | yes / yes |
| 9 | yes / yes | yes / yes |
| 10 | yes / yes | yes / yes |
| 11 | yes / yes | yes / yes |
| 12 | yes / no | yes / yes |
| 13 | yes / yes | yes / yes |
| 14 | yes / yes | yes / yes |
| 15 | yes / yes | yes / yes |
| 16 | yes / yes | yes / yes |

Direct successes on tasks 1 to 4: 4 with results in the right panel, 3 with results on the rail.

Picks the key counts separately:
- Task 3: no pick in a data column in either session.
- Task 5: did not stop at a column's "Default for new runs" in either session; considered it and
  rejected it because the meaning of a weight should belong to the run.
- Tasks 6 and 8: opened File > Open... in neither.
- Task 7: opened File > Open... in both sessions and backed out; ended at Style stack > Add a layer
  in the second.
- Task 9: no Look picked.
- Task 13: did not pick Undo.
- Task 14: did not pick Undo history.

## What she said that the scores do not show

- Task 5 is right by the key but rests on faith: nothing on the path through Algorithms > Path
  mentions weight. She only stayed because she assumed the run dialog would show it. The Path
  entry on the floating toolbar names "what a bigger value means"; she never went to the canvas
  to see it.
- Task 7 is split between Recipes and the style stack. "Recipe" read to her as a saved workflow,
  not as a palette, in one session and as the right verb in the other.
- Task 10 has no single place: she expects two weighted degree runs plus a computed difference
  column, and noted that nothing in the list says "net flow".
- Task 15: she reads the line under the project name as a claim and goes to the log for proof.
- With results on the rail, she went there first for a single node's score (task 2) and found a
  run's top nodes instead of the node's own row.
