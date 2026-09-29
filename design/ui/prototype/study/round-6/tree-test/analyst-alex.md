# Tree test, round 6 -- Analyst Alex (label variant: "Runs (rail)")

Alex is an operations data analyst who computes in NetworkX and draws in Gephi. He took the label
variant tree, where the rail place for runs is named "Runs". Tasks were read in the order shown.
Confidence is 1 (a guess) to 7 (certain). "Back up" means he left a branch and went up the tree.

Scored after the session against the frozen key; answers were not changed.

| Task | Places opened, in order | Final pick | Back up | Conf | Correct | Direct |
|---|---|---|---|---:|---|---|
| tt-3 | Runs (rail) > An opened run > Settings | Runs > An opened run > Settings | no | 7 | yes | yes |
| tt-9 | Canvas > Legend > Each entry's menu | Canvas > Legend > Each entry's menu (Change color...) | no | 6 | yes | yes |
| tt-1 | Runs (rail) > Run a measure... | Runs > Run a measure... | no | 6 | yes | yes |
| tt-13 | Main menu > Edit > Undo | Main menu > Edit > Undo (Ctrl+Z) | no | 6 | yes | yes |
| tt-7 | Main menu > File (Open... makes a new project, no) -- back -- Data (rail) > Sources > Add a source | Data > Sources > Add a source (a file or a query) | yes | 3 | no | no |
| tt-11 | Right panel, with a set, a group or a path selected > Members -- back -- Bottom table > Footer | Bottom table > Footer | yes | 5 | yes | no |
| tt-4 | Runs (rail) > An opened run > Show in table, sorted | Runs > An opened run > Show in table, sorted | no | 6 | yes | yes |
| tt-16 | Main menu > Algorithms > Path -- back -- Main menu > Selection > Neighbors... | Main menu > Selection > Neighbors... (from a date) | yes | 4 | yes | no |
| tt-6 | Main menu > File > Export... | Main menu > File > Export... | no | 7 | yes | yes |
| tt-14 | Filter chip > Filter steps | Filter chip > Filter steps (delete) | no | 6 | yes | yes |
| tt-2 | Runs (rail) > An opened run > Top nodes -- back -- Bottom table > Search | Bottom table > Search | yes | 5 | yes | no |
| tt-10 | Bottom table > Column header menu | Bottom table > Column header menu (new column: Money in minus out) | no | 5 | yes | yes |
| tt-15 | Right panel, with a node selected > Show label anyway | Right panel, with a node selected > Show label anyway | no | 6 | yes | yes |
| tt-5 | Data (rail) > Sources > Its columns -- back -- Main menu > Algorithms > Path | Main menu > Algorithms > Path (Shortest path) | yes | 4 | yes | no |
| tt-12 | Runs (rail) > An opened run > Compare with... -- back -- Right panel, with a set, a group or a path selected > Compare with the rest | Right panel, a group selected > Compare with the rest | yes | 5 | yes | no |
| tt-8 | Main menu > File > Update with new data... | Main menu > File > Update with new data... | no | 7 | yes | yes |

First top-level place opened, per task: Runs (tt-1, tt-2, tt-3, tt-4, tt-12); Main menu (tt-6,
tt-7, tt-8, tt-13, tt-16); Data (tt-5); Canvas (tt-9); Bottom table (tt-10); Right panel, a set,
group or path (tt-11); Filter chip (tt-14); Right panel, a node (tt-15).

Totals: 15 of 16 correct, 9 of 16 direct. Runs label tasks (1 to 4): 4 correct, 3 direct.
Counted separately: tt-2 visited Runs > An opened run > Top nodes before leaving it; tt-5 visited
Data > Sources > Its columns before leaving it; tt-7 ended in Data > Sources > Add a source and
never opened Recipes; tt-11 visited Members before the Footer; tt-12 visited the run's
Compare with... before the group's own panel. tt-13 under the notice-only key (Edit > Undo wrong):
wrong. One simulated participant: a pass here is weak evidence, a failure a stronger one.

## In his words

- **tt-3** -- "Settings. Method, seed, when it ran. That's exactly what I'd send him. Easy."
- **tt-9** -- "Legend, the dot for that group, change the colour. That's where Gephi has it too,
  sort of. I've got this problem with red and green all the time, so I'd go straight there."
- **tt-1** -- "Runs, run a measure. I'd probably just type 'betweenness' in a search box if there
  is one, but this one says what it is."
- **tt-13** -- "Ctrl+Z. Everyone presses Ctrl+Z. If that doesn't bring my selection back, I'm
  redoing 18 clicks and I'm annoyed."
- **tt-7** -- "It's a file, so I bring in a file. File, Open -- no, that makes a new project, I
  don't want that. So Data, Sources, add a source. I didn't think of 'recipe' as colours; a recipe
  to me is the steps, not the palette. Not sure at all."
- **tt-11** -- "Members, that's just how many. I want the sum -- that's a table thing. Bottom
  table, the footer, like the status bar in Excel when you select cells."
- **tt-4** -- "Open the run, show in table, sorted. That's the whole reason I'd use this over
  screenshots."
- **tt-16** -- "Tracing where it went, so Algorithms, Path? But there's no date on any of those.
  Back out. Selection, Neighbors, 'from a date'. OK, that one. Took me two goes."
- **tt-6** -- "File, Export. PNG or SVG, hopefully both."
- **tt-14** -- "The filter chip lists the steps and you can delete one. Good -- in Gephi I'd have
  to rebuild the whole chain."
- **tt-2** -- "Open the run, top nodes. But if Valjean isn't in the top few he won't be there.
  Back out, search the table for him instead, that shows every column."
- **tt-10** -- "Money in minus money out, as a new column, sort it. I'd have done that in pandas in
  one line, so the table is where I'd look."
- **tt-15** -- "Click the guy, and there's 'Show label anyway'. Fine. Wouldn't have guessed that
  name, but it's right there under him."
- **tt-5** -- "Bigger means more expensive -- that's about the amount column, so Data, Sources,
  columns. It only says 'amount, dollars'. Nothing about cost. So probably when I run the route
  itself: Algorithms, Path, shortest path. I'd expect a weight option there. Guessing a bit."
- **tt-12** -- "The groups came from a community run, so open that run, Compare with... No, that
  compares runs. Back. Select the group itself: 'Compare with the rest'. That's the one."
- **tt-8** -- "File, update with new data. If that really keeps my colours and settings, that's
  the thing I've wanted from Gephi for three years."
