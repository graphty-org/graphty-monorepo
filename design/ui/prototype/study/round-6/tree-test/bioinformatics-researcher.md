# Tree test, round 6: bioinformatics researcher (Dr. Chen), main tree ("Results" as a rail place)

Simulated participant, built from the persona file `../../personas/bioinformatics-researcher.md`.
A computational biologist who works in R/igraph and Cytoscape. She saw only the text tree, one
level at a time. This was her only session on the main tree; she had not seen the label variant.
She answered all 16 tasks. Correct and direct were marked afterwards against the frozen key; her
answers were not changed.

## Transcript

### tt-1: A second way of ranking which characters matter
- Opened: Main menu > Algorithms > Centrality
- Final pick: Main menu > Algorithms > Centrality
- Went back up: no. Confidence: 6
- In her words: "Centrality is centrality. I'd take betweenness next to whatever the first one was -- degree alone just tells you who shows up in the most scenes."

### tt-2: How Valjean scored on the "holds the groups together" measure, and where he places
- Opened: Bottom table > Search
- Final pick: Bottom table > Search (search for Valjean, read the result column and his rank)
- Went back up: no. Confidence: 6
- In her words: "That's betweenness. I want the node table, find the row, read the number. I don't need to click on a dot."

### tt-3: How an earlier calculation was set up, so a colleague can repeat it
- Opened: Results (rail) > An opened run > Settings
- Final pick: Results (rail) > An opened run > Settings
- Went back up: no. Confidence: 6
- In her words: "It says 'every run with its settings and date'. If the seed is in there, fine. If it isn't, it's not reproducible and I'd say so."

### tt-4: Every character's score in one list, highest first
- Opened: Bottom table > Column header menu
- Final pick: Bottom table > Column header menu (sort)
- Went back up: no. Confidence: 6
- In her words: "Sort the column descending. Same as order() in R."

### tt-5: Make sure a bigger transfer counts as more expensive on the cheapest route
- Opened: Main menu > Algorithms > Path
- Final pick: Main menu > Algorithms > Path (Shortest path, expecting a weight option when it starts)
- Went back up: no. Confidence: 4
- In her words: "In igraph the weights go in the call, so I'd expect the shortest-path dialog to ask. The outline doesn't say it does, so I'm guessing -- and if it silently treats a big amount as a short hop, the answer is backwards."

### tt-6: A picture of the network for the paper
- Opened: Main menu > File > Export...
- Final pick: Main menu > File > Export...
- Went back up: no. Confidence: 6
- In her words: "Export. Whether it's an SVG with real text or a screenshot is the actual question."

### tt-7: Bring in a colleague's file of colors and sizes
- Opened: Main menu > File (looked for Import; only Open..., which makes a new project -- backed out) > Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file...
- Final pick: Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe or file...
- Went back up: yes. Confidence: 5
- In her words: "In Cytoscape that's File > Import > Styles. No Import here, so I went to where the styles are. 'Recipe' means nothing to me; 'file' is what I have."

### tt-8: Next month's transfers file, keeping everything set up
- Opened: Main menu > File > Update with new data...
- Final pick: Main menu > File > Update with new data...
- Went back up: no. Confidence: 6
- In her words: "That's the obvious one. I'd want to see how many nodes and edges changed before I trust it."

### tt-9: Two groups drawn in colors you cannot tell apart
- Opened: Right panel, with nothing selected > Style stack > Each layer
- Final pick: Right panel, with nothing selected > Style stack > Each layer (its swatch)
- Went back up: no. Confidence: 5
- In her words: "Colour is style, so the style list. I'd pick something that survives grayscale, not just a different hue."

### tt-10: Accounts that take in far more money than they send out
- Opened: Bottom table > Column header menu
- Final pick: Bottom table > Column header menu (new column: Money in minus out)
- Went back up: no. Confidence: 5
- In her words: "In-strength minus out-strength. A computed column, then sort it. I'd want to know whether it's a difference or a ratio -- for 'far more' a ratio might be the fairer one."

### tt-11: Total money along a selected route
- Opened: Right panel, with a set, a group or a path selected > Members (reads "count" -- not a sum; backed out) > Bottom table > Footer
- Final pick: Bottom table > Footer
- Went back up: yes. Confidence: 5
- In her words: "A count of members isn't what I asked for. The table footer says it sums the selected rows, so that."

### tt-12: How the biggest group differs from the rest of the network
- Opened: Results (rail) > An opened run > Compare with... (lists other runs, not the rest of the graph -- backed out) > Right panel, with a set, a group or a path selected > Compare with the rest
- Final pick: Right panel, with a set, a group or a path selected > Compare with the rest
- Went back up: yes. Confidence: 5
- In her words: "The module came from a run, so I looked there first. That compares runs with runs. Selecting the module and comparing it with the rest is what I mean -- what I'd really want after that is enrichment."

### tt-13: A stray click cleared the 18 selected characters
- Opened: Main menu > Edit > Undo (Ctrl+Z)
- Final pick: Main menu > Edit > Undo
- Went back up: no. Confidence: 5
- In her words: "Ctrl+Z. In Cytoscape undo doesn't always cover a selection, so I'd be pleasantly surprised if it did."

### tt-14: Take out only the second of three narrowing steps
- Opened: Filter chip > Filter steps
- Final pick: Filter chip > Filter steps (delete the second step)
- Went back up: no. Confidence: 6
- In her words: "Undo would take the third one with it. The steps list lets me delete just the one."

### tt-15: Make sure one hidden character's name always shows
- Opened: Right panel, with a node selected > Show label anyway
- Final pick: Right panel, with a node selected > Show label anyway
- Went back up: no. Confidence: 6
- In her words: "Like a bypass in Cytoscape. Select it, force the label."

### tt-16: Where money went next after leaving one account in early August
- Opened: Right panel, with a node selected > Header actions (Neighbors: hops, direction, from a date)
- Final pick: Right panel, with a node selected > Header actions (Neighbors)
- Went back up: no. Confidence: 5
- In her words: "Downstream first neighbours with a date cut-off. Direction and date are both listed, so that's it."

## Scored against the key

| Task | Final pick | Correct | Direct | Confidence |
|---|---|---|---|---:|
| tt-1 | Main menu > Algorithms > Centrality | yes | yes | 6 |
| tt-2 | Bottom table > Search | yes | yes | 6 |
| tt-3 | Results (rail) > An opened run > Settings | yes | yes | 6 |
| tt-4 | Bottom table > Column header menu (sort) | yes | yes | 6 |
| tt-5 | Main menu > Algorithms > Path | yes | yes | 4 |
| tt-6 | Main menu > File > Export... | yes | yes | 6 |
| tt-7 | Style stack > Add a layer (+) > From a recipe or file... | yes | no | 5 |
| tt-8 | Main menu > File > Update with new data... | yes | yes | 6 |
| tt-9 | Style stack > Each layer | yes | yes | 5 |
| tt-10 | Bottom table > Column header menu (new column) | yes | yes | 5 |
| tt-11 | Bottom table > Footer | yes | no | 5 |
| tt-12 | Right panel (group selected) > Compare with the rest | yes | no | 5 |
| tt-13 | Main menu > Edit > Undo | yes | yes | 5 |
| tt-14 | Filter chip > Filter steps | yes | yes | 6 |
| tt-15 | Right panel (node selected) > Show label anyway | yes | yes | 6 |
| tt-16 | Right panel (node selected) > Header actions (Neighbors) | yes | yes | 5 |

16 of 16 correct, 13 of 16 direct. One simulated participant: a pass here is a weak signal.

Picks counted separately, and the tasks whose key changed since round 5:
- tt-7: visited Main menu > File (looking for Import) and backed out; never opened Recipes.
- tt-10: correct under this round's key (table's New column); under round 5's key the table's
  New column was not listed, so it would have scored wrong.
- tt-11: visited Right panel, path selected > Members and backed out before the Footer.
- tt-12: visited Results (rail) > An opened run > Compare with... and backed out; final pick is
  correct under this round's key (under round 5's key the visited place would also have been correct).
- tt-13: correct under this round's key; under the notice-only key (Edit > Undo counted wrong)
  it scores wrong. Did not open Undo history.
- tt-5: did not open Data > Sources > Its columns.
- First top-level places opened, in task order: Main menu, Bottom table, Results (rail),
  Bottom table, Main menu, Main menu, Main menu, Main menu, Right panel (nothing selected),
  Bottom table, Right panel (path selected), Results (rail), Main menu, Filter chip,
  Right panel (node selected), Right panel (node selected).
