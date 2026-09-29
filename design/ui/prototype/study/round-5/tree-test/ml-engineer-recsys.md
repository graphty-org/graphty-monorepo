# Tree test transcript: Chris, ML engineer (recommendation systems)

Chris builds candidate retrieval for a retailer's recommender. He lives in notebooks and VS Code,
reaches for Cmd+K before any menu, and cares most about how a number was computed and whether his
data ever leaves the machine. He saw only the text outline of the navigation, in two separate
sessions: first the design with Results as a section of the right panel (arm A), then the design
with Results as its own place on the left rail (arm B). For each task: the path, where he
stopped, how sure he was (1 = guessing, 7 = certain), and afterwards whether the stop was a
correct place and whether he got there without going back up the tree.

## Session 1: Results in the right panel (arm A)

### 1. Start a second ranking to check against the first
- Path: Main menu > Quick actions... "Ctrl+K, type pagerank. I'm not clicking through menus if
  there's a palette."
- Ends: Main menu > Quick actions... Would fall back to Main menu > Algorithms > Centrality.
- First top-level pick: Main menu. Sure: 6.
- Correct: yes. Direct: yes.

### 2. Valjean's score and where he places
- Path: Bottom table > Search.
- Ends: Bottom table > Search. "Search the id, land on his row, every result column is there.
  Rank I get by sorting."
- First top-level pick: Bottom table. Sure: 6.
- Correct: yes. Direct: yes.

### 3. How an earlier calculation was set up, to repeat it exactly
- Path: Right panel, with nothing selected > Results > Each run. Opened a run: Right panel, with
  a result selected > Details.
- Ends: Right panel, with a result selected > Details. "Method, seed, settings -- that's an
  MLflow run record. I also want the input edge set and whether weights were on; I'd hope the
  State line says that."
- First top-level pick: Right panel (nothing selected). Sure: 6.
- Correct: yes. Direct: yes.

### 4. Every character's score in one list, highest first
- Path: Bottom table > Column header menu (sort).
- Ends: Bottom table > Column header menu. "Sort descending on the score column. It's a
  dataframe."
- First top-level pick: Bottom table. Sure: 7.
- Correct: yes. Direct: yes.

### 5. Make a bigger transfer count as more expensive on the cheapest route
- Path: Main menu > Algorithms > Path. "Shortest path should open with a weight parameter. If
  it's Dijkstra, cost is the weight as-is, which is what I want -- but I'd check it isn't
  inverting it."
- Ends: Main menu > Algorithms > Path (Shortest path). Considered Data > Sources > Its columns
  ("weight semantics feel like a column property") but did not go there.
- First top-level pick: Main menu. Sure: 4.
- Correct: yes. Direct: yes.

### 6. A picture of the network for the paper
- Path: Main menu > File > Export...
- Ends: Main menu > File > Export... "Hope that means SVG or PDF, not a screenshot PNG."
- First top-level pick: Main menu. Sure: 6.
- Correct: yes. Direct: yes.

### 7. Bring in a colleague's file of their team's colors and sizes
- Path: Main menu > File > Open... "opens a file as a new project" -- no, that's not it. Back
  up. Main menu > Recipes: "recipes of what? Sounds like a workflow macro, not a palette."
  Skipped it. Right panel, with nothing selected > Style stack > Add a layer.
- Ends: Style stack > Add a layer. "Styles live in the style stack, so a layer from a file. I'd
  expect an import option in there. Guessing."
- First top-level pick: Main menu. Sure: 2.
- Correct: no. Direct: no.

### 8. Bring in next month's transfers so the setup carries over
- Path: Main menu > File > Update with new data...
- Ends: Main menu > File > Update with new data... "Good, not Open. Open would give me a fresh
  project and I'd rebuild everything."
- First top-level pick: Main menu. Sure: 6.
- Correct: yes. Direct: yes.

### 9. Two groups in colors he cannot tell apart
- Path: Canvas > Legend > Each entry's swatch.
- Ends: Canvas > Legend > Each entry's swatch. "Click the swatch, pick another color."
- First top-level pick: Canvas. Sure: 6.
- Correct: yes. Direct: yes.

### 10. Accounts that take in far more money than they send out
- Path: Main menu > Algorithms > Centrality. Saw "Weighted degree: in, out, total".
- Ends: Main menu > Algorithms > Centrality (Weighted degree). "Run in and out, then I want the
  ratio. I'd make that as a new column in the table, but these two are the start."
- First top-level pick: Main menu. Sure: 5.
- Correct: yes. Direct: yes.

### 11. Total money moved along a selected route
- Path: Bottom table > Footer.
- Ends: Bottom table > Footer. "Sum over the selected rows. Exactly what I'd do with a groupby."
- First top-level pick: Bottom table. Sure: 6.
- Correct: yes. Direct: yes.

### 12. How the biggest group differs from the rest of the network
- Path: Main menu > Algorithms > Community. "I'd need the groups first, but they already
  exist." Back up. Right panel, with nothing selected > Results > Each run, opened the
  community run: Right panel, with a result selected > Compare with... (the rest of the graph).
- Ends: Right panel, with a result selected > Compare with... "Want the actual stats: degree
  distribution in vs out, not a sentence."
- First top-level pick: Main menu. Sure: 4.
- Correct: yes. Direct: no.

### 13. Get back the 18 characters a stray click cleared
- Path: Main menu > Edit. Saw Undo first, then Previous selection.
- Ends: Main menu > Edit > Previous selection. "Cmd+Z reflex, but Previous selection is literally
  this."
- First top-level pick: Main menu. Sure: 6.
- Correct: yes. Direct: yes.

### 14. Take out only the wrong second of three filter steps
- Path: Filter chip > Filter steps.
- Ends: Filter chip > Filter steps (delete). "Undo would kill step three too. Delete the
  middle one."
- First top-level pick: Filter chip. Sure: 6.
- Correct: yes. Direct: yes.

### 15. Has anything from this project left the computer?
- Path: The line under the project name.
- Ends: The line under the project name. "'Nothing has been sent from this project.' That's the
  one thing I'd screenshot for the privacy review. Data > Sent and saved would be the detail."
- First top-level pick: The line under the project name. Sure: 7.
- Correct: yes. Direct: yes.

### 16. Where money went next after it left one account in early August
- Path: Right panel, with a node selected > Header actions: Neighbors (direction, date window).
- Ends: Right panel, with a node selected > Header actions (Neighbors). "Out direction, one hop,
  date window August. That's an ego graph with a time filter."
- First top-level pick: Right panel (node selected). Sure: 5.
- Correct: yes. Direct: yes.

## Session 2: Results on the rail (arm B)

Only tasks whose path differed are written out; on 2, 5, 6, 7, 8, 9, 11, 13, 14, 15 and 16 he
took the same path and stop as in session 1, with the same result.

### 1. Start a second ranking to check against the first
- Path: Main menu > Quick actions...
- Ends: Main menu > Quick actions... "Palette first, always." Noticed Results (rail) > Run a
  measure on the way and said it would also do.
- First top-level pick: Main menu. Sure: 6.
- Correct: yes. Direct: yes.

### 3. How an earlier calculation was set up
- Path: Results (rail) > Each run > an opened run > Details.
- Ends: Results (rail) > an opened run > Details. "A runs list on the side, like MLflow. This is
  the layout I'd expect."
- First top-level pick: Results (rail). Sure: 7.
- Correct: yes. Direct: yes.

### 4. Every score in one list, highest first
- Path: Bottom table > Column header menu (sort).
- Ends: Bottom table > Column header menu. Same as session 1.
- First top-level pick: Bottom table. Sure: 7.
- Correct: yes. Direct: yes.

### 10. Accounts that take in far more than they send out
- Path: Main menu > Algorithms > Centrality (Weighted degree in, out).
- Ends: Main menu > Algorithms > Centrality. Same as session 1.
- First top-level pick: Main menu. Sure: 5.
- Correct: yes. Direct: yes.

### 12. How the biggest group differs from the rest
- Path: Results (rail) > Each run > the community run > Compare with... (the rest of the graph).
- Ends: Results (rail) > an opened run > Compare with...
- First top-level pick: Results (rail). Sure: 5.
- Correct: yes. Direct: yes.

## Scores

| Task | Arm A correct | Arm A direct | Arm B correct | Arm B direct |
|---:|---|---|---|---|
| 1 | yes | yes | yes | yes |
| 2 | yes | yes | yes | yes |
| 3 | yes | yes | yes | yes |
| 4 | yes | yes | yes | yes |
| 5 | yes | yes | yes | yes |
| 6 | yes | yes | yes | yes |
| 7 | no | no | no | no |
| 8 | yes | yes | yes | yes |
| 9 | yes | yes | yes | yes |
| 10 | yes | yes | yes | yes |
| 11 | yes | yes | yes | yes |
| 12 | yes | no | yes | yes |
| 13 | yes | yes | yes | yes |
| 14 | yes | yes | yes | yes |
| 15 | yes | yes | yes | yes |
| 16 | yes | yes | yes | yes |

Picks counted separately: task 3, none in Data > Sources > a column. Task 5, considered the
column's default but did not pick it. Tasks 6 and 8, did not pick File > Open... Task 7, opened
File > Open... and backed out; ended on Style stack > Add a layer. Task 9, no Look. Task 13, saw
Edit > Undo but picked Previous selection. Task 14, not Undo history.

## What he said afterwards

- "Recipes" does not read as "colors and sizes" to him. He took it for a saved workflow and
  never opened it. A file of colors belongs, in his head, with the style stack.
- With Results on the rail he went straight to the run list for tasks 3 and 12; with Results in
  the right panel he detoured through the algorithm menu on task 12. "Runs are a thing I have a
  list of. A list of things goes on the side."
- He wants the run record (task 3) to name the input edge set and whether weights were used, not
  only method and seed, before he would call a calculation repeatable.
