# Tree test transcript: Dr. Chen, computational biologist

Participant: simulated from `../../personas/bioinformatics-researcher.md`. She has used Cytoscape
for fifteen years and does her analysis in R with igraph, so she reads every label against
Cytoscape's menus (File > Import, File > Export, the Style tab, the Node and Edge Tables) and
against what she would type in R. She skims, distrusts words she cannot map ("recipe"), and reads
parameter wording closely.

She took the test twice, as two separate sessions with no memory of each other: first with
Results as a section of the right panel (arm A), then with Results as its own place on the rail
(arm B). Tasks are listed in number order; she took them in a shuffled order in each session.

Paths use ">" for a step down and "(back)" for a step back up the outline. Confidence is 1
(guessing) to 7 (certain). Correct and direct were marked afterwards against the answer key; no
answer was changed.

## Summary

| Task | Arm A final pick | A correct | A direct | A conf | Arm B final pick | B correct | B direct | B conf |
|---|---|---|---|---:|---|---|---|---:|
| 1 second ranking | Main menu > Algorithms > Centrality | yes | yes | 6 | Main menu > Algorithms > Centrality | yes | yes | 6 |
| 2 Valjean's score and place | Bottom table > Nodes tab | yes | yes | 6 | Bottom table > Nodes tab | yes | yes | 6 |
| 3 how a run was set up | Right panel, with a result selected > Details | yes | no | 5 | Results (rail) > an opened run > Details | yes | yes | 6 |
| 4 whole ranking, highest first | Bottom table > Column header menu (sort) | yes | yes | 7 | Bottom table > Column header menu (sort) | yes | yes | 7 |
| 5 bigger transfer = more expensive | Main menu > Algorithms > Path | yes | yes | 4 | Main menu > Algorithms > Path | yes | yes | 4 |
| 6 picture for the paper | Main menu > File > Export... | yes | yes | 6 | Main menu > File > Export... | yes | yes | 6 |
| 7 colleague's colors and sizes file | Right panel, with nothing selected > Style stack > Add a layer | no | no | 3 | Right panel, with nothing selected > Style stack > Add a layer | no | no | 3 |
| 8 next month's file | Main menu > File > Update with new data... | yes | yes | 6 | Main menu > File > Update with new data... | yes | yes | 6 |
| 9 two groups same color | Right panel, with nothing selected > Style stack > Each layer | yes | yes | 5 | Right panel, with nothing selected > Style stack > Each layer | yes | yes | 5 |
| 10 takes in far more than sends | Main menu > Algorithms > Centrality (Weighted degree) | yes | yes | 5 | Main menu > Algorithms > Centrality (Weighted degree) | yes | yes | 5 |
| 11 total money along a route | Bottom table > Footer | yes | yes | 5 | Bottom table > Footer | yes | yes | 5 |
| 12 biggest group vs the rest | Right panel, with a result selected > Compare with... | yes | no | 4 | Results (rail) > an opened run > Compare with... | yes | no | 4 |
| 13 cleared selection back | Main menu > Edit > Previous selection | yes | yes | 6 | Main menu > Edit > Previous selection | yes | yes | 6 |
| 14 remove only the second step | Filter chip > Filter steps | yes | yes | 6 | Filter chip > Filter steps | yes | yes | 6 |
| 15 anything left the computer | Data > Sent and saved | yes | yes | 6 | Data > Sent and saved | yes | yes | 6 |
| 16 where money went next | Main menu > Selection > Neighbors... | yes | no | 4 | Main menu > Selection > Neighbors... | yes | no | 4 |

Arm A: 15 of 16 correct, 12 direct. Arm B: 15 of 16 correct, 13 direct. Tasks 1 to 4 direct
successes: arm A 3, arm B 4.

Picks counted separately: task 7, Style stack > Add a layer, in both arms. None of the others
(no Data > Sources > a column on task 3 or 5, no File > Open... on 6, 7 or 8, no Look on 9, no
Edit > Undo on 13, no Undo history on 14).

## Arm A (Results in the right panel)

### 1. A second way of ranking, to check the first

- First top-level place: Main menu.
- Path: Main menu > Algorithms > Centrality. "If the first was betweenness I want closeness or
  PageRank next to it. Algorithms is Cytoscape's Tools menu. Fine."
- Ends: Main menu > Algorithms > Centrality. Confidence 6.
- Correct: yes. Direct: yes.

### 2. How Valjean scored and where he places

- First top-level place: Bottom table.
- Path: Bottom table > Nodes tab, Edges tab, and a tab for each opened result. "The node table.
  Find his row, the score is a column, the rank I get by sorting it. I'm not clicking around a
  hairball to find one node."
- Ends: Bottom table > Nodes tab. Confidence 6.
- Correct: yes. Direct: yes.

### 3. How an earlier calculation was set up, so a colleague can repeat it

- First top-level place: Right panel, with nothing selected.
- Path: Right panel, with nothing selected > Results > Each run, newest first (open it). "Opening
  it is the step I want, but this is just the list." (back) (back) > Right panel, with a result
  selected > Details (the run record: method, seed, settings). "Method, seed, settings. That's the
  methods paragraph. If the weight column and its direction aren't in there, it's the State line.
  Between the two I'd have it."
- Ends: Right panel, with a result selected > Details. Confidence 5.
- Correct: yes. Direct: no (went back up from the run list to the result state).

### 4. Every character's score in one list, highest first

- First top-level place: Bottom table.
- Path: Bottom table > Column header menu (sort, ...). "Click the column, sort descending. Same as
  every table I've used since 2005."
- Ends: Bottom table > Column header menu (sort). Confidence 7.
- Correct: yes. Direct: yes.

### 5. Cheapest route: a bigger transfer counts as more expensive

- First top-level place: Main menu.
- Path: Main menu > Algorithms > Path (... Shortest path). "In igraph the weights go into the
  shortest_paths call, so I'd expect the choice when I start Shortest path. This matters -- with
  STRING scores a bigger number means closer, not further, and half the tools get it backwards
  silently. The outline doesn't promise me the option is there, which I don't like."
- Ends: Main menu > Algorithms > Path. Confidence 4.
- Correct: yes. Direct: yes.
- Note: she did not open Canvas > Floating toolbar, the one branch that names "what a bigger
  value means"; she never got that far down the outline.

### 6. A picture of the network for the paper

- First top-level place: Main menu.
- Path: Main menu > File > Export... "File, Export. I want SVG with real text and the whole
  network, not the visible bit. Whether that's what I get, the outline can't tell me."
- Ends: Main menu > File > Export... Confidence 6.
- Correct: yes. Direct: yes.

### 7. A colleague's file of the colors and sizes their team always uses

- First top-level place: Main menu.
- Path: Main menu > File. "In Cytoscape this is File > Import > Styles. There's no Import." Open...
  "opens a file as a new project" -- "no, I don't want a new project, I want their style on
  mine." (back). She passed over Main menu > Recipes: "Recipes? A saved workflow? That's not a
  style file." (back) > Right panel, with nothing selected > Style stack > Add a layer. "Styles
  are here. Adding one from a file is presumably inside Add a layer. It's a guess."
- Ends: Right panel, with nothing selected > Style stack > Add a layer. Confidence 3.
- Correct: no. Direct: no.
- Counted separately: Style stack > Add a layer.

### 8. Next month's transfers file, keeping everything set up

- First top-level place: Main menu.
- Path: Main menu > File > Update with new data... "That's the one that doesn't throw my styles
  and settings away, going by the name. Open would give me a fresh project."
- Ends: Main menu > File > Update with new data... Confidence 6.
- Correct: yes. Direct: yes.

### 9. Two groups in colors she cannot tell apart

- First top-level place: Right panel, with nothing selected.
- Path: Right panel, with nothing selected > Style stack > Each layer (... its swatch opens the
  color picker). "The style, the swatch. I'd also try the legend, but I look for the style first."
- Ends: Right panel, with nothing selected > Style stack > Each layer. Confidence 5.
- Correct: yes. Direct: yes.

### 10. Accounts that take in far more money than they send out

- First top-level place: Main menu.
- Path: Main menu > Algorithms > Centrality (... Weighted degree: in, out, total). "Weighted
  in-degree against weighted out-degree. I'd run both and take the ratio in the table, or in R."
- Ends: Main menu > Algorithms > Centrality (Weighted degree). Confidence 5.
- Correct: yes. Direct: yes.

### 11. Total money along a selected route

- First top-level place: Bottom table.
- Path: Bottom table > Footer (the sum of each numeric column over the selected rows). "Edge table,
  selected rows, sum of amount. It says sum, good."
- Ends: Bottom table > Footer. Confidence 5.
- Correct: yes. Direct: yes.

### 12. How the biggest group differs from the rest

- First top-level place: Right panel, with a set, a group or a path selected.
- Path: Right panel, with a set, a group or a path selected > Appearance, Members, Notes. "Nothing
  about comparing. I'd want an enrichment against the background." (back) > Right panel, with a
  result selected > Compare with... (another result, or the rest of the graph). "The rest of the
  graph is the background. If the group came out of a community run, this is it."
- Ends: Right panel, with a result selected > Compare with... Confidence 4.
- Correct: yes. Direct: no.

### 13. A stray click cleared the 18 picked characters

- First top-level place: Main menu.
- Path: Main menu > Edit > Previous selection. "Undo in Cytoscape doesn't reliably bring back a
  selection. Previous selection says exactly what I want."
- Ends: Main menu > Edit > Previous selection. Confidence 6.
- Correct: yes. Direct: yes.

### 14. Three filter steps, the second one wrong; take out only that

- First top-level place: Filter chip.
- Path: Filter chip > Filter steps (each step: turn off, edit, move, delete). "Delete the middle
  one. Undo would take the third with it."
- Ends: Filter chip > Filter steps. Confidence 6.
- Correct: yes. Direct: yes.

### 15. Has anything from this project left her computer

- First top-level place: Data.
- Path: Data > Sent and saved (every file written and everything sent). "I noticed the line under
  the project name too, but IT will want the list, not a sentence."
- Ends: Data > Sent and saved. Confidence 6.
- Correct: yes. Direct: yes.

### 16. Where money went next after leaving one account in early August

- First top-level place: Main menu.
- Path: Main menu > Algorithms > Path (... Breadth-first search). "A traversal out from one node,
  but none of these take a date." (back) (back) > Selection > Neighbors... (hops, direction, a date
  window). "Out-direction, first shell, date window. That's it."
- Ends: Main menu > Selection > Neighbors... Confidence 4.
- Correct: yes. Direct: no.

## Arm B (Results as a place on the rail)

Only tasks where her path differed from arm A are written out. On tasks 2, 5, 6, 7, 8, 9, 11, 13,
14, 15 and 16 she took the same path, ended in the same place, with the same confidence and the
same first top-level place; tasks 1, 4 and 10 are summarised below because the rail place was on
screen and she passed it.

### 1. A second way of ranking

- First top-level place: Main menu.
- Path: Main menu > Algorithms > Centrality. She saw "Results (rail)" on the way down: "Results is
  where they'd come out. I start algorithms from Algorithms."
- Ends: Main menu > Algorithms > Centrality. Confidence 6.
- Correct: yes. Direct: yes.

### 3. How an earlier calculation was set up

- First top-level place: Results (rail).
- Path: Results (rail) > Each run, newest first (open it) > an opened run > Details (the run
  record: method, seed, settings). "Open the run, read its record. That's where I'd look in any
  pipeline log."
- Ends: Results (rail) > an opened run > Details. Confidence 6.
- Correct: yes. Direct: yes.

### 4. Every character's score, highest first

- First top-level place: Bottom table.
- Path: Bottom table > Column header menu (sort). Same as arm A; did not open Results.
- Ends: Bottom table > Column header menu (sort). Confidence 7.
- Correct: yes. Direct: yes.

### 10. Accounts that take in far more than they send

- First top-level place: Main menu.
- Path: Main menu > Algorithms > Centrality (Weighted degree). Same as arm A.
- Ends: Main menu > Algorithms > Centrality (Weighted degree). Confidence 5.
- Correct: yes. Direct: yes.

### 12. How the biggest group differs from the rest

- First top-level place: Right panel, with a set, a group or a path selected.
- Path: Right panel, with a set, a group or a path selected > Appearance, Members, Notes. "Nothing
  to compare with." (back) > Results (rail) > an opened run > Compare with... (another result, or
  the rest of the graph). "The community run, compared with the rest. Fine."
- Ends: Results (rail) > an opened run > Compare with... Confidence 4.
- Correct: yes. Direct: no.

## What she said afterwards

- "Recipe" is the word that lost her. A file of colors and sizes is a style in her world
  (Cytoscape's styles.xml), and she read Recipes as a saved workflow. She looked for it in File,
  found no Import, and settled for Add a layer under the style stack.
- She wants the weight direction stated where she runs the algorithm, and the outline did not
  promise it under Algorithms > Path. She said so unprompted: with STRING confidence scores, a
  bigger number means closer, so a tool that silently treats weight as cost gets her routes
  backwards.
- Comparing a group with the rest was hard to find in both arms: she went to the group first, and
  the group's panel offers no comparison. She thinks of it as enrichment against a background.
- On where Results live, she started runs from Algorithms and read scores from the table in both
  arms. The only task the rail place helped was reading how a run was set up: in arm B she went
  straight to it; in arm A she found the run list and then had to go back up to reach the run's
  own record.
