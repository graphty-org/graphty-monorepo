# Tree test, round 6 -- Morgan Reyes (screen-reader analyst), main tree

Session: main tree ("Results (rail)"), taken alone, with no memory of the variant tree. The
tree was read top to bottom with the arrow keys, one level at a time; the right panel's three
states and the canvas were read as the outline gives them. Simulated participant: a pass here is
a weak signal, a fail a strong one.

Morgan's general remark before starting: "It's an outline. Good. I can read an outline. The
right panel shows up three times, which is honest, but I have to remember which one I'm in."

## Answers

| Task | Places opened, in order | Final pick | Went back up? | Confidence (1-7) | In Morgan's words |
|---|---|---|---|---:|---|
| tt-1 Second ranking to check against the first | Results (rail) > Run a measure... | Results (rail) > Run a measure... | No | 6 | "The one already done lives in Results, so the next one starts there too. Same list as Algorithms, I assume." |
| tt-2 How Valjean scored and where he places | Bottom table > Search | Bottom table > Search | No | 6 | "Type his name, land on his row, read the columns. Rank I'll get from sorting if the row doesn't say it." |
| tt-3 How an earlier calculation was set up | Results (rail) > An opened run > Settings | Results (rail) > An opened run > Settings | No | 7 | "Method, seed, when it ran. That's the one thing I'd check before believing any number in here." |
| tt-4 Every score in one list, highest first | Bottom table > Nodes tab > Column header menu (sort) | Bottom table > Column header menu (sort) | No | 6 | "A table, sorted descending. The only way I'd want to read a ranking anyway." |
| tt-5 Bigger transfer counts as more expensive | Main menu > Algorithms > Path (Shortest path) | Main menu > Algorithms > Path | No | 4 | "In NetworkX the weight goes in the shortest-path call, not in the data. So the setting should be on the path run. The outline doesn't show me its options, so I'm guessing they're in there." |
| tt-6 A picture of the network for the paper | Main menu > File > Export... | Main menu > File > Export... | No | 5 | "My colleague makes the picture. I'd export and hand it over, and check the caption later." |
| tt-7 A colleague's file of colors and sizes | Main menu > File (Open..., Update with new data...: neither is a styles file) > back up > Main menu > Recipes (skipped, the word meant nothing to me) > Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file... | Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file... | Yes | 4 | "Open would make a new project, that's wrong. 'Recipe' sounds like cooking. The only place that said 'file' and 'styles' in one breath was the plus on the style stack." |
| tt-8 Next month's transfers file, keeping the setup | Main menu > File > Update with new data... | Main menu > File > Update with new data... | No | 6 | "That's what it says. As long as it tells me what didn't carry over." |
| tt-9 Two groups in colors that can't be told apart | Canvas > Legend > Each entry's menu (Change color...) | Canvas > Legend > Each entry's menu | No | 5 | "The legend is where the groups have names. I'd want the 'too close' warning read to me, because I'd never know otherwise." |
| tt-10 Accounts that take in far more than they send | Bottom table > Column header menu (new column: Money in minus out) | Bottom table > Column header menu (new column) | No | 6 | "In minus out, as a column, sorted. That's a table job. Whether it's total dollars or a count of transfers, I'd check the column says." |
| tt-11 Total money moved along a selected route | Bottom table > Footer | Bottom table > Footer | No | 6 | "Sum over selected rows. Like Excel's status bar, which I also have to go looking for." |
| tt-12 How the biggest group differs from the rest | Results (rail) > An opened run > Compare with... (lists earlier runs, not the rest of the graph) > back up > Right panel, with a set, a group or a path selected > Compare with the rest | Right panel, with a set, a group or a path selected > Compare with the rest | Yes | 5 | "I went to the community run first, because that's where the groups came from. Its Compare is runs against runs. The group's own panel said the words I wanted." |
| tt-13 A stray click cleared 18 picked characters | Main menu > Edit > Undo (Ctrl+Z) | Main menu > Edit > Undo | No | 4 | "Ctrl+Z. Most tools don't count a selection as something you can undo, so I'm not confident. If there's a notice about it, I hope it stays put long enough to read." |
| tt-14 Take out only the second of three narrowing steps | Filter chip > Filter steps | Filter chip > Filter steps | No | 6 | "Each step, delete. Not undo, undo would eat the third one too." |
| tt-15 One character's name always shows on the drawing | Main menu > View (2D or 3D, Minimize UI: nothing) > back up > Right panel, with a node selected > Show label anyway | Right panel, with a node selected > Show label anyway | Yes | 5 | "I don't see the drawing, but the colleague does. View had nothing about labels. On the character itself there was 'Show label anyway', which is close enough." |
| tt-16 Where money went next after one account in early August | Main menu > Selection > Neighbors... (hops, direction, from a date) | Main menu > Selection > Neighbors... | No | 5 | "Out-neighbours from a date. I'd want the result as a list, not a highlight." |

## Scored against the key (answers above unchanged)

| Task | Correct | Direct | Note |
|---|---|---|---|
| tt-1 | Yes | Yes | |
| tt-2 | Yes | Yes | |
| tt-3 | Yes | Yes | |
| tt-4 | Yes | Yes | |
| tt-5 | Yes | Yes | Not the data column; confidence only 4 because the outline shows no options under Algorithms > Path. |
| tt-6 | Yes | Yes | |
| tt-7 | Yes | No | Visited Main menu > File (Open...) first and skipped Recipes: both are counted separately. |
| tt-8 | Yes | Yes | |
| tt-9 | Yes | Yes | |
| tt-10 | Yes | Yes | Correct under the new key (table's New column); would have been wrong under round 5's key. |
| tt-11 | Yes | Yes | |
| tt-12 | Yes | No | First opened Results (rail) > An opened run > Compare with... (counted separately, now wrong) and backed out. |
| tt-13 | Yes | Yes | Correct under the new key (Edit > Undo); wrong under the notice-only key. |
| tt-14 | Yes | Yes | |
| tt-15 | Yes | No | Tried Main menu > View first. |
| tt-16 | Yes | Yes | |

Totals: 16 of 16 correct, 13 of 16 direct.

## What Morgan would take away

- "Recipe" is the one word in the outline that meant nothing on first hearing; the styles file was
  found only because the style stack's plus says "file".
- Two things called "Compare": the run's "Compare with..." and the group's "Compare with the rest".
  At speed they start with the same word, and the first one sent Morgan the wrong way.
- Undoing a cleared selection with Ctrl+Z was a guess, not an expectation (confidence 4).
