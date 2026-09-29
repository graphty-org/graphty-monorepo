# Tree test, round 6: Chris (ML engineer, recommendation systems), main tree

Session: main tree ("Results (rail)"), one sitting, no memory of the variant tree. Tasks were
taken in a shuffled order: 4, 13, 1, 10, 7, 2, 16, 5, 9, 14, 3, 11, 6, 15, 8, 12. The transcript
below is listed by task number. Paths use ">" for each place opened; "BACK" marks going back up
the tree. Confidence is 1 (guess) to 7 (certain).

Scoring was done after all answers were final, against the frozen key; no answer was changed.

## Answers

### Task 1 -- a second way of ranking the characters
- Path: Main menu > Algorithms > Centrality (PageRank, Betweenness, ... listed)
- Final pick: Main menu > Algorithms > Centrality
- Went back: no. Confidence: 6
- In his words: "Ranking is centrality; I want the list of methods, not a wizard. Pick a second one
  and put it next to the first."
- Score: correct, direct.

### Task 2 -- how Valjean scored and where he places
- Path: Bottom table > Search ("goes to the matching row, with every result column shown")
- Final pick: Bottom table > Search
- Went back: no. Confidence: 6
- In his words: "Search the id, land on his row, read the column. That's the first thing I do in
  any tool anyway."
- Score: correct, direct.

### Task 3 -- how an earlier calculation was set up
- Path: Results (rail) > An opened run > Settings
- Final pick: Results (rail) > An opened run > Settings
- Went back: no. Confidence: 6
- In his words: "Seed, options, timestamp -- that's the run record. Like an MLflow run page. I'd
  also want the state line to say which weight it used."
- Score: correct, direct.

### Task 4 -- every character's score in one list, highest first
- Path: Bottom table > Column header menu (sort)
- Final pick: Bottom table > Column header menu (sort)
- Went back: no. Confidence: 7
- In his words: "It's a table sorted descending on one column. Obviously the table."
- Score: correct, direct.

### Task 5 -- make a bigger transfer count as more expensive
- Path: Data > Sources > Its columns ("amount, dollars, 0.5 to 9,800") -- that only describes the
  column, no switch for what bigger means -- BACK -- Main menu > Algorithms > Path > Shortest path
- Final pick: Main menu > Algorithms > Path (Shortest path)
- Went back: yes. Confidence: 4
- In his words: "My first thought was the column is the edge weight, so set it there. It only
  shows a range. Fine, then it has to be an option on the shortest-path run -- I'm assuming it
  asks, the outline doesn't say."
- Score: correct, not direct. (First visit was Data > Sources > Its columns, counted separately.)

### Task 6 -- a picture of the network for the paper
- Path: Main menu > File > Export...
- Final pick: Main menu > File > Export...
- Went back: no. Confidence: 6
- In his words: "Export. I hope it does SVG or PDF and not just a screenshot."
- Score: correct, direct.

### Task 7 -- a colleague's file of colors and sizes
- Path: Main menu > File -- "Open..." opens it as a new project, not what I want -- BACK --
  Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file...
- Final pick: Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe
  or file...
- Went back: yes. Confidence: 5
- In his words: "Colors and sizes are styling, styling is the layer stack. 'Recipe' means nothing
  to me, but 'or file' does. I skipped the Recipes menu because I didn't know what a recipe was."
- Score: correct, not direct. (Opened Main menu > File first; did not open Recipes.)

### Task 8 -- next month's transfers file, keeping everything set up
- Path: Data > Sources > Update with new data...
- Final pick: Data > Sources > Update with new data...
- Went back: no. Confidence: 5
- In his words: "Swap the source, keep the pipeline. I'd want it to tell me how many rows and
  ids changed before it redraws."
- Score: correct, direct.

### Task 9 -- two groups in colors he cannot tell apart
- Path: Canvas > Legend > Each entry's swatch
- Final pick: Canvas > Legend > Each entry's swatch
- Went back: no. Confidence: 6
- In his words: "Click the color in the legend and change it. That's where every plotting tool
  puts it."
- Score: correct, direct.

### Task 10 -- accounts that take in far more money than they send out
- Path: Main menu > Algorithms > Centrality ("Weighted degree: Money in, Money out, Money in minus
  out")
- Final pick: Main menu > Algorithms > Centrality (Weighted degree, Money in minus out)
- Went back: no. Confidence: 6
- In his words: "Weighted in-degree minus weighted out-degree. Nice that it's spelled out; I'd
  still rather it be a column I can sort. Calling it 'centrality' is a stretch."
- Score: correct, direct.

### Task 11 -- total money along a selected route
- Path: Right panel, with a set, a group or a path selected > Members ("count; show in table") --
  a count, not a sum -- BACK -- Bottom table > Footer
- Final pick: Bottom table > Footer
- Went back: yes. Confidence: 5
- In his words: "I have a selection, so I checked its panel first. Members is a count. The sum
  of a column over selected rows is a table footer, so the table."
- Score: correct, not direct. (Visited Members, counted separately.)

### Task 12 -- how the biggest group differs from the rest
- Path: Right panel, with a set, a group or a path selected > Compare with the rest
- Final pick: Right panel, with a set, a group or a path selected > Compare with the rest
- Went back: no. Confidence: 6
- In his words: "Select the cluster, compare with the rest. I'd want degree distributions side by
  side, with counts, not just a sentence."
- Score: correct, direct.

### Task 13 -- a stray click cleared 18 picked characters
- Path: Main menu > Edit > Undo (Ctrl+Z)
- Final pick: Main menu > Edit > Undo
- Went back: no. Confidence: 6
- In his words: "Ctrl+Z. If undo doesn't cover selection, that's a bug in my book."
- Score: correct, direct under the round-6 key. Under the notice-only key (Edit > Undo counted
  wrong): wrong.

### Task 14 -- take out only the second of three filter steps
- Path: Filter chip > Filter steps
- Final pick: Filter chip > Filter steps
- Went back: no. Confidence: 6
- In his words: "The steps are listed on the chip, delete the one in the middle. Undo would
  throw away the third step too."
- Score: correct, direct.

### Task 15 -- make one hidden character's name always show
- Path: Right panel, with nothing selected > Style stack -- layers and Look, nothing about
  labels -- BACK -- Right panel, with a node selected > Show label anyway
- Final pick: Right panel, with a node selected > Show label anyway
- Went back: yes. Confidence: 5
- In his words: "Labels felt like a style thing, but I don't want to write a layer for one node.
  Select the node and force it -- found it on the second try."
- Score: correct, not direct.

### Task 16 -- where money went after leaving one account in early August
- Path: Right panel, with a node selected > Header actions: Neighbors (hops, direction, from a
  date)
- Final pick: Right panel, with a node selected > Header actions (Neighbors: direction out, from
  a date)
- Went back: no. Confidence: 6
- In his words: "Out-edges from that node after a date, then another hop. That's the ego graph
  with a time filter, which is exactly what I'd want."
- Score: correct, direct.

## Tally (this participant, main tree)

- Correct: 16 of 16. Direct: 12 of 16 (not direct: tasks 5, 7, 11, 15).
- Task 13 under the notice-only key: wrong (15 of 16 correct).
- First top-level place opened, per task: 1 Main menu; 2 Bottom table; 3 Results (rail);
  4 Bottom table; 5 Data; 6 Main menu; 7 Main menu; 8 Data; 9 Canvas; 10 Main menu;
  11 Right panel (set, group or path selected); 12 Right panel (set, group or path selected);
  13 Main menu; 14 Filter chip; 15 Right panel (nothing selected); 16 Right panel (node selected).
- Picks counted separately: task 5 opened Data > Sources > Its columns first; task 11 opened the
  path's Members first. Neither was the final pick.
- One simulated participant; a pass here is weak evidence.
