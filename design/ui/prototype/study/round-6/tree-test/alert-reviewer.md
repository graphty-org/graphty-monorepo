# Tree test, round 6: Nadia (level-1 alert reviewer), main tree ("Results" on the rail)

Simulated participant from `../../personas/alert-reviewer.md`. Main tree session, all 16 tasks,
answered in character. She works a transaction-monitoring queue; she has never used a graph tool,
reads everything as "accounts, transfers, amounts", and thinks in spreadsheets and case files.
Words like "measure", "centrality" and "recipe" mean nothing to her.

One simulated participant is not a sample: a failed task is a signal worth checking, a passed task
is weak evidence.

## Answers

Each entry: the places opened in order (first top-level place first), the final pick, whether she
went back up the tree, confidence (1-7), and one line in her words.

### tt-1 -- a second way of ranking the characters

- Opened: Results (rail) -> read "Each run" (sees the one already done) -> Run a measure...
- Final: Results (rail) > Run a measure...
- Backtracked: no. Confidence: 4.
- "The ranking that's already there is under Results, so a new one probably starts from there too.
  I don't know what a 'measure' is, but it's the only thing that says run."

### tt-2 -- how Valjean scored and where he places

- Opened: Results (rail) -> An opened run -> Top nodes ("only if he's near the top") -> back up to
  the top -> Bottom table -> Search.
- Final: Bottom table > Search.
- Backtracked: yes. Confidence: 4.
- "I'd just type his name into a search box. The top list only helps if he's in it."

### tt-3 -- how an earlier calculation was set up, to repeat it

- Opened: Results (rail) -> An opened run -> Settings.
- Final: Results (rail) > An opened run > Settings.
- Backtracked: no. Confidence: 5.
- "Settings, method, when it ran. That's what QA would ask for."

### tt-4 -- every character's score in one list, highest first

- Opened: Bottom table -> Column header menu (sort).
- Final: Bottom table > Column header menu (sort).
- Backtracked: no. Confidence: 6.
- "A table with a sort on the column. That's a spreadsheet, I live in those."

### tt-5 -- make a bigger transfer count as more expensive on a cheapest route

- Opened: Main menu -> Algorithms -> Path ("shortest path isn't cheapest, and it doesn't say
  anything about amounts") -> back up to the top -> Data (rail) -> Sources -> Its columns
  ("amount, dollars").
- Final: Data > Sources > Its columns.
- Backtracked: yes. Confidence: 3.
- "The amount lives in the column, so whatever 'bigger' means gets set there. I'm not sure if
  changing it changes the data or just this route, though."

### tt-6 -- a picture of the network for a paper

- Opened: Main menu -> File -> Export...
- Final: Main menu > File > Export...
- Backtracked: no. Confidence: 6.
- "Export. Same as getting a screenshot into the alert file."

### tt-7 -- bring in a colleague's file of colors and sizes

- Opened: Main menu -> File -> Open... ("opens it as a new project, no") -> back to Main menu ->
  Recipes ("recipe? no idea, skipping") -> back up to the top -> Data (rail) -> Sources -> Add a
  source (a file or a query).
- Final: Data > Sources > Add a source.
- Backtracked: yes. Confidence: 2.
- "It's a file, so it goes where files go in. Nothing here says colors. I'd ask the colleague."

### tt-8 -- next month's transfers file, keeping everything set up

- Opened: Main menu -> File -> Update with new data...
- Final: Main menu > File > Update with new data...
- Backtracked: no. Confidence: 6.
- "Update, not Open. Open would start over."

### tt-9 -- two groups in colors she cannot tell apart

- Opened: Main menu -> Preferences -> Theme ("that's the whole app") -> back up to the top ->
  Canvas -> Legend -> Each entry's menu (Change color...).
- Final: Canvas > Legend > Each entry's menu.
- Backtracked: yes. Confidence: 5.
- "The legend is where the colors are listed, so I'd change it on the one I can't read."

### tt-10 -- accounts that take in far more money than they send out

- Opened: Bottom table -> Column header menu (new column: Money in minus out).
- Final: Bottom table > Column header menu (new column).
- Backtracked: no. Confidence: 6.
- "Money in minus out, sort it, top of the list. That's exactly the column I'd build in Excel."

### tt-11 -- total money along a selected route

- Opened: Bottom table -> Footer.
- Final: Bottom table > Footer.
- Backtracked: no. Confidence: 6.
- "The sum at the bottom of the selected rows. If it's not there I'm pasting into a spreadsheet."

### tt-12 -- how the biggest group differs from the rest

- Opened: Results (rail) -> An opened run -> Compare with... ("earlier runs, that's comparing
  calculations, not a group") -> back up to the top -> Right panel, with a set, a group or a path
  selected -> Compare with the rest.
- Final: Right panel, with a set, a group or a path selected > Compare with the rest.
- Backtracked: yes. Confidence: 4.
- "Says it right there once you've got the group picked. Not something I'd do on an alert."

### tt-13 -- a stray click cleared the 18 picked characters

- Opened: Main menu -> Edit -> Undo (Ctrl+Z).
- Final: Main menu > Edit > Undo.
- Backtracked: no. Confidence: 6.
- "Ctrl+Z. If that doesn't bring them back I'm not picking eighteen again."

### tt-14 -- take out only the second of three narrowing steps

- Opened: Main menu -> Edit -> Undo history.
- Final: Main menu > Edit > Undo history.
- Backtracked: no. Confidence: 3.
- "Go back in the history to before the second step and do the third again. Is narrowing a filter
  or a selection? I can't tell which one I did."

### tt-15 -- make one character's hidden name always show

- Opened: Main menu -> View ("2D, minimize, nothing about names") -> back up to the top -> Right
  panel, with nothing selected -> Style stack ("layers, no") -> back up to the top -> Canvas ->
  Legend -> The labels line ("7 more hidden").
- Final: Canvas > Legend > The labels line.
- Backtracked: yes. Confidence: 4.
- "It says names are hidden and you can click one. I'd hope that pins it."

### tt-16 -- where money went next after it left an account in early August

- Opened: Bottom table -> Nodes tab, Edges tab ("the transfers, filter by date") -> back up to the
  top -> Right panel, with a node selected -> Header actions: Neighbors (hops, direction, from a
  date).
- Final: Right panel, with a node selected > Header actions (Neighbors).
- Backtracked: yes. Confidence: 5.
- "In the table I'd be chasing it one transfer at a time. This one has direction and a date. Hops
  from what, though -- from the account I picked?"

## Scored against the key (after answering; answers not changed)

| Task | Final pick | First top-level place | Correct | Direct | Confidence |
|---|---|---|---|---|---:|
| tt-1 | Results (rail) > Run a measure... | Results (rail) | yes | yes | 4 |
| tt-2 | Bottom table > Search | Results (rail) | yes | no | 4 |
| tt-3 | Results (rail) > An opened run > Settings | Results (rail) | yes | yes | 5 |
| tt-4 | Bottom table > Column header menu (sort) | Bottom table | yes | yes | 6 |
| tt-5 | Data > Sources > Its columns | Main menu | no (counted separately) | no | 3 |
| tt-6 | Main menu > File > Export... | Main menu | yes | yes | 6 |
| tt-7 | Data > Sources > Add a source | Main menu | no (counted separately; also backed out of Recipes) | no | 2 |
| tt-8 | Main menu > File > Update with new data... | Main menu | yes | yes | 6 |
| tt-9 | Canvas > Legend > Each entry's menu | Main menu | yes | no | 5 |
| tt-10 | Bottom table > Column header menu (new column) | Bottom table | yes | yes | 6 |
| tt-11 | Bottom table > Footer | Bottom table | yes | yes | 6 |
| tt-12 | Right panel, group selected > Compare with the rest | Results (rail) | yes | no | 4 |
| tt-13 | Main menu > Edit > Undo | Main menu | yes (no under the notice-only key) | yes | 6 |
| tt-14 | Main menu > Edit > Undo history | Main menu | no (counted separately) | no | 3 |
| tt-15 | Canvas > Legend > The labels line | Main menu | yes | no | 4 |
| tt-16 | Right panel, node selected > Header actions (Neighbors) | Bottom table | yes | no | 5 |

Totals: 13 of 16 correct, 8 of 16 direct.

Picks counted separately: tt-5 Data > Sources > Its columns (she expects "what a bigger amount
means" to live with the amount, and is unsure whether changing it changes the data); tt-7 Data >
Sources > Add a source, after backing out of Main menu > Recipes because "recipe" says nothing
about colors to her; tt-12 visited Results > An opened run > Compare with... before backing out;
tt-14 Edit > Undo history, because she could not tell whether narrowing was a filter or a
selection, so the Filter chip never occurred to her.
