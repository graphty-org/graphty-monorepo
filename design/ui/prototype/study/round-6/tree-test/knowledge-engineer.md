# Tree test, main tree: Dr. Min-ji Kim, knowledge graph engineer

Simulated participant, built from the persona file. Main tree ("Results" as the rail place),
one session, all 16 tasks. Sixteen simulated participants share blind spots: a failed task is a
strong signal, a passed one a weak signal.

Tasks were taken in the order given. For each: places opened in order, the final pick, whether
she went back up the tree, confidence (1 to 7), and one sentence in her words.

## Answers

### tt-1: a second way of ranking which characters matter
- First top-level place: Main menu.
- Opened: Main menu > Algorithms > Centrality.
- Final pick: Main menu > Algorithms > Centrality (Harmonic or Eigenvector, to check against
  whatever was run first).
- Went back up: no. Confidence: 6.
- "Ranking means a centrality, and the list names them, which is the least I expect; I still want
  to know which one was 'already done' before I pick the second."

### tt-2: how Valjean scored and where he places
- First top-level place: Results (rail).
- Opened: Results (rail) > An opened run > Top nodes, with near ties marked. Top nodes only shows
  the head of the list; it does not say where one individual places if he is not in it. Back up to
  the top. Right panel, with a node selected > Results.
- Final pick: Right panel, with a node selected > Results ("this node's value and rank in each
  run").
- Went back up: yes. Confidence: 5.
- "The run is where I went first because that is where the calculation lives, but a top-N list is
  not a rank for one individual; the node's own panel says value and rank, so that is the answer."

### tt-3: how an earlier calculation was set up, to repeat it exactly
- First top-level place: Results (rail).
- Opened: Results (rail) > An opened run > Settings.
- Final pick: Results (rail) > An opened run > Settings (method, seed, options, when it ran).
- Went back up: no. Confidence: 6.
- "Seed and options, good; if it does not also record which data version it ran on, it is not
  reproducible, so I would read the state line next to it too."

### tt-4: every character's score in one list, highest first
- First top-level place: Results (rail).
- Opened: Results (rail) > An opened run > Show in table, sorted.
- Final pick: Results (rail) > An opened run > Show in table, sorted.
- Went back up: no. Confidence: 6.
- "A sorted table of every individual is what I would export to pandas anyway; I just want it to
  say what happens with ties."

### tt-5: make a bigger transfer count as more expensive on the cheapest route
- First top-level place: Data (rail).
- Opened: Data (rail) > Sources > Its columns. It only says what the column holds ("amount,
  dollars, 0.5 to 9,800"); nothing about cost direction. Back up to the top. Main menu >
  Algorithms > Path.
- Final pick: Main menu > Algorithms > Path (Shortest path, and look for its weight option).
- Went back up: yes. Confidence: 4.
- "My instinct is that the semantics of a property belong with the property, but this column only
  describes values, so it must be a setting of the path run; I am not sure the Shortest path entry
  actually exposes it."

### tt-6: a picture of the network for the paper
- First top-level place: Main menu.
- Opened: Main menu > File > Export...
- Final pick: Main menu > File > Export...
- Went back up: no. Confidence: 6.
- "Export is export; what I care about is whether it gives me SVG and not a screenshot of a
  hairball."

### tt-7: a colleague's file of team colors and sizes
- First top-level place: Main menu.
- Opened: Main menu > File > Open... says it opens a file as a new project, which is not what I
  want. Back. Main menu > Recipes > Apply a recipe... "Recipe" is not a word I would use for a
  style file, and nothing says it is only styles. Back up to the top. Right panel, with nothing
  selected > Style stack > Add a layer (+) > From a recipe or file...
- Final pick: Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or
  file... ("Only a recipe's styles; your data stays here").
- Went back up: yes. Confidence: 5.
- "The Style stack entry is the only one that promises it will not touch my data, which is the one
  thing I need to hear before I load someone else's file."

### tt-8: next month's transfers file, keeping everything set up
- First top-level place: Main menu.
- Opened: Main menu > File > Update with new data...
- Final pick: Main menu > File > Update with new data...
- Went back up: no. Confidence: 6.
- "That is the right name; whether it tells me what did not carry over is what I would check."

### tt-9: two groups drawn in colors I cannot tell apart
- First top-level place: Canvas.
- Opened: Canvas > Legend > Each entry's menu (Change color...).
- Final pick: Canvas > Legend > Each entry's menu > Change color...
- Went back up: no. Confidence: 6.
- "With my red-green weakness I live in the legend; I noticed the 'too close' flag too, and I
  would trust it more if it also let me use shape instead of hue."

### tt-10: accounts that take in far more money than they send out
- First top-level place: Bottom table.
- Opened: Bottom table > Column header menu > new column: Money in minus out (then sort).
- Final pick: Bottom table > Column header menu > new column: Money in minus out.
- Went back up: no. Confidence: 5.
- "This is a sum and a subtraction, not a centrality, so I want it as a column I can sort; I saw
  Weighted degree listed under Centrality and I would not look for it there."

### tt-11: total money moved along a selected route
- First top-level place: Right panel, with a set, a group or a path selected.
- Opened: Right panel, with a set, a group or a path selected > Members (count; show in table). A
  count is not a sum. Back up to the top. Bottom table > Footer.
- Final pick: Bottom table > Footer (the sum of each numeric column over the selected rows).
- Went back up: yes. Confidence: 5.
- "The panel gave me a count of edges when I asked for an amount; the footer sums the selected
  rows, which is what I would have done in a spreadsheet."

### tt-12: how the biggest group differs from the rest of the network
- First top-level place: Right panel, with a set, a group or a path selected.
- Opened: Right panel, with a set, a group or a path selected > Compare with the rest.
- Final pick: Right panel, with a set, a group or a path selected > Compare with the rest.
- Went back up: no. Confidence: 5.
- "Fine, but 'group' from which algorithm? If the panel does not name the community method, I
  cannot defend the comparison."

### tt-13: a stray click cleared the 18 characters I had picked out
- First top-level place: Main menu.
- Opened: Main menu > Edit > Undo (Ctrl+Z).
- Final pick: Main menu > Edit > Undo.
- Went back up: no. Confidence: 4.
- "Ctrl+Z is the reflex, but most tools do not treat a selection as something undoable, so I only
  half expect it to work."

### tt-14: remove only the second of three narrowing steps
- First top-level place: Filter chip.
- Opened: Filter chip > Filter steps.
- Final pick: Filter chip > Filter steps (delete that step).
- Went back up: no. Confidence: 6.
- "A list of steps I can delete one of is exactly right; I would not trust undo to skip a step in
  the middle."

### tt-15: make sure one character's name always shows
- First top-level place: Right panel, with nothing selected.
- Opened: Right panel, with nothing selected > Style stack > Add a layer (+). A layer for one
  individual feels heavy and I did not see a label option there. Back up to the top. Right panel,
  with a node selected > Show label anyway.
- Final pick: Right panel, with a node selected > Show label anyway.
- Went back up: yes. Confidence: 5.
- "Labels are styling, so I went to the stack first; the node's own switch is simpler, if I can
  find the node when its name is hidden."

### tt-16: where money went next after leaving one account in early August
- First top-level place: Main menu.
- Opened: Main menu > Selection > Neighbors... (hops, direction, from a date).
- Final pick: Main menu > Selection > Neighbors...
- Went back up: no. Confidence: 5.
- "Outgoing, one hop, from a date is the query I would write; I want to be sure it follows only
  transfers after the date at each hop, not just at the first one."

## Scored against the key (answers above left unchanged)

| Task | Final pick | Correct | Direct | Confidence |
|---|---|---|---|---:|
| tt-1 | Main menu > Algorithms > Centrality | yes | yes | 6 |
| tt-2 | Right panel, node selected > Results | yes | no (visited Top nodes first) | 5 |
| tt-3 | Results (rail) > An opened run > Settings | yes | yes | 6 |
| tt-4 | Results (rail) > An opened run > Show in table, sorted | yes | yes | 6 |
| tt-5 | Main menu > Algorithms > Path | yes | no (visited Data > Sources > Its columns first) | 4 |
| tt-6 | Main menu > File > Export... | yes | yes | 6 |
| tt-7 | Style stack > Add a layer (+) > From a recipe or file... | yes | no (File > Open... and Recipes backed out) | 5 |
| tt-8 | Main menu > File > Update with new data... | yes | yes | 6 |
| tt-9 | Canvas > Legend > Each entry's menu | yes | yes | 6 |
| tt-10 | Bottom table > Column header menu (new column) | yes | yes | 5 |
| tt-11 | Bottom table > Footer | yes | no (visited path Members first) | 5 |
| tt-12 | Right panel, group selected > Compare with the rest | yes | yes | 5 |
| tt-13 | Main menu > Edit > Undo | yes under the current key; no under the notice-only key | yes (current key) | 4 |
| tt-14 | Filter chip > Filter steps | yes | yes | 6 |
| tt-15 | Right panel, node selected > Show label anyway | yes | no (visited Add a layer first) | 5 |
| tt-16 | Main menu > Selection > Neighbors... | yes | yes | 5 |

Picks counted separately, as visits on the way:
- tt-2: opened Results (rail) > An opened run > Top nodes, then backed out.
- tt-5: opened Data > Sources > Its columns, then backed out.
- tt-7: opened Main menu > File > Open... and Main menu > Recipes, and backed out of both.
- tt-10: did not open the Edges tab.
- tt-11: opened Right panel, a path selected > Members, then backed out.
- tt-15: opened Style stack > Add a layer, then backed out (did not choose Empty layer).
