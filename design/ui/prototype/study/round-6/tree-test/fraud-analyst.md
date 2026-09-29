# Tree test, main tree (Results as a rail place): Sarah, fraud detection analyst

Simulated participant from `../../personas/fraud-analyst.md`: a level-2 financial crime
investigator who lives in Excel pivot tables, says "account" and "transfer" rather than "node" and
"edge", and does not know the words "centrality" or "recipe". Main tree only, one session, all 16
tasks in a shuffled order. The character tasks use a novel's network; she went along with it,
grumbling. Simulated: a failed task is a strong signal, a passed one a weak one.

Session order: tt-8, tt-3, tt-11, tt-16, tt-1, tt-6, tt-13, tt-10, tt-4, tt-9, tt-14, tt-2, tt-5,
tt-15, tt-12, tt-7.

## Answers

| Task | Places opened, in order | Final pick | Went back up? | Conf. (1-7) | In her words |
|---|---|---|---|---:|---|
| tt-1 | Results (rail) > Run a measure... | Results (rail) > Run a measure... | No | 5 | "The one already done is a run, so the other one is a run too. I'm not picking a word like PageRank off a list, but that's where the list is." |
| tt-2 | Results (rail) > An opened run > Top nodes; back up; Bottom table > Search | Bottom table > Search | Yes | 5 | "Top of the list only helps if he's at the top. I want to type his name and see his row, like Ctrl+F in the sheet." |
| tt-3 | Results (rail) > An opened run > Settings | Results (rail) > An opened run > Settings | No | 6 | "Method, seed, when it ran. That's what goes in the file so someone else gets the same number." |
| tt-4 | Bottom table > Column header menu (sort) | Bottom table > Column header menu (sort) | No | 6 | "A list, highest first, is a sort on a column. Same as Excel." |
| tt-5 | Main menu > Selection > Paths between... | Main menu > Selection > Paths between... | No | 4 | "I'd expect the route box to ask what the amount means. Nothing in the list says so, so I'm guessing it's inside." |
| tt-6 | Main menu > File > Export... | Main menu > File > Export... | No | 7 | "Picture for the file is an export. Next." |
| tt-7 | Main menu > File (Open... makes a new project, not it); back up; Data (rail) > Sources > Add a source | Data (rail) > Sources > Add a source (a file or a query) | Yes | 2 | "Someone sent me a file, files go in through Data. 'Recipes' sounds like a cooking app, I didn't open it." |
| tt-8 | Main menu > File > Update with new data... | Main menu > File > Update with new data... | No | 6 | "That's the monthly refresh. As long as it doesn't wipe what I did." |
| tt-9 | Main menu > View (2D/3D, minimize; no); back up; Canvas > Legend > Each entry's menu (Change color...) | Canvas > Legend > Each entry's menu | Yes | 5 | "Half my case files get printed in grey anyway. But fine, the legend is where the colors are named." |
| tt-10 | Bottom table > Column header menu (new column: Money in minus out) | Bottom table > Column header menu (new column) | No | 6 | "In minus out per account, sorted. That's my pivot. Good that it's spelled out in money." |
| tt-11 | Bottom table > Footer | Bottom table > Footer | No | 6 | "Select the rows, read the sum at the bottom. Excel's status bar does that." |
| tt-12 | Graph (rail) > Sets and paths; back up; Right panel, with a set, a group or a path selected > Compare with the rest | Right panel, a group selected > Compare with the rest | Yes | 4 | "I went to where groups are kept first. Then I figured you pick the ring and ask about it." |
| tt-13 | Main menu > Edit > Undo (Ctrl+Z) | Main menu > Edit > Undo | No | 6 | "Ctrl+Z. If that doesn't bring my 18 back, the tool is broken." |
| tt-14 | Main menu > Edit > Undo history; back up (undoing to step two throws away step three too); Filter chip > Filter steps (delete) | Filter chip > Filter steps | Yes | 5 | "I don't want to undo my way back and redo the third one. The filter list says delete per step, so that one." |
| tt-15 | Right panel, with a node selected > Show label anyway | Right panel, with a node selected > Show label anyway | No | 5 | "Pick the one I care about and tell it to show. Wordy, but it says what it does." |
| tt-16 | Bottom table > Search (to find the account); back up; Right panel, with a node selected > Header actions: Neighbors (hops, direction, from a date) | Right panel, with a node selected > Header actions (Neighbors) | Yes | 5 | "Find the account, then out-direction, from August. What I actually want is a timeline, and I didn't see one." |

## Scored against the key (answers not changed)

| Task | Correct | Direct | Note |
|---|---|---|---|
| tt-1 | Yes | Yes | |
| tt-2 | Yes | No | First went to the run's Top nodes (counted separately), then backed out to the table search |
| tt-3 | Yes | Yes | |
| tt-4 | Yes | Yes | |
| tt-5 | Yes | Yes | Low confidence: the menu item does not say it holds the weight choice |
| tt-6 | Yes | Yes | |
| tt-7 | No | No | Ended in Data > Sources > Add a source (counted separately); visited File > Open... first (also counted separately); never opened Recipes |
| tt-8 | Yes | Yes | |
| tt-9 | Yes | No | |
| tt-10 | Yes | Yes | Correct under the round 6 key (table's New column) |
| tt-11 | Yes | Yes | |
| tt-12 | Yes | No | Correct under the round 6 key; never opened the run's Compare with... |
| tt-13 | Yes | Yes | Under the notice-only key (Edit > Undo scored wrong) this is wrong |
| tt-14 | Yes | No | Visited Edit > Undo history first (counted separately) |
| tt-15 | Yes | Yes | |
| tt-16 | Yes | No | |

Totals, main tree: 15 of 16 correct, 10 of 16 direct.

## What she said afterwards

- "Recipe" is the word that lost her. A file of team colors is, to her, a file, and files go in
  through Data. Nothing under Data > Sources or File says colors or styles.
- The route task was a guess: "weight by" and "what a bigger value means" are written only under
  the toolbar's Path, not under Selection > Paths between..., so she picked the menu on faith.
- For money that left an account in August she wanted a timeline beside the network and found
  none in the outline; Neighbors with a date was the closest thing.
