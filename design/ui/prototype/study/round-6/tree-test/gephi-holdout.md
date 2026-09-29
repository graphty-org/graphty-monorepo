# Tree test, round 6: the Gephi holdout (main tree, "Results" on the rail)

Participant: Dr. Mara Lindqvist (simulated), associate professor, Gephi user since 0.8. Session
on the main tree, tasks in shuffled order. She reads the outline the way she reads a menu she
has to teach from: fast, translating every label back into Gephi's words (Statistics, Data
Laboratory, Appearance, Filters, Preview).

Simulated participant: a failed task is a strong signal, a passed task a weak one.

## Answers, in the order taken

### tt-6: a picture of the network for the paper
- Path: Main menu > File > Export... (Ctrl+Shift+E)
- Went back up: no. Confidence: 6.
- "That's my Preview. If Export gives me SVG with the labels and a legend, fine; if it's a PNG
  I'm leaving."

### tt-13: a stray click cleared the 18 characters
- Path: Main menu > Edit > Undo (Ctrl+Z)
- Went back up: no. Confidence: 5.
- "Ctrl+Z first, always. Whether it actually covers a selection is the thing I'd test, because
  Gephi never did."

### tt-3: a colleague wants to repeat an earlier calculation exactly
- Path: Results (rail) > An opened run > Settings
- Went back up: no. Confidence: 6.
- "'Every run with its settings and date' -- that's what Gephi's statistics report should have
  been. Method, seed, when. Good."

### tt-10: accounts that take in far more money than they send out
- Path: Main menu > Algorithms > Centrality (Weighted degree: Money in minus out)
- Went back up: no. Confidence: 6.
- "Weighted in-degree minus weighted out-degree. Calling it centrality is generous, but it's
  where Gephi keeps degree too."

### tt-1: a second way of ranking which characters matter
- Path: Main menu > Algorithms > Centrality (PageRank, against the betweenness already run)
- First top-level place opened: Main menu. Went back up: no. Confidence: 6.
- "Statistics panel equivalent. I'd run PageRank next to betweenness and eyeball the two columns."

### tt-14: three narrowing steps, the second was wrong
- Path: Filter chip > Filter steps (delete the second step)
- Went back up: no. Confidence: 6.
- "Same as the query tree in Gephi's Filters: pull out the middle sub-filter. If it recomputes
  the stats on the new subset without telling me, that's a problem."

### tt-4: every character's score in one list, highest first
- Path: Bottom table > Column header menu (sort)
- Went back up: no. Confidence: 7.
- "Data Lab, click the column header. That's the first thing I'd do in any tool."

### tt-9: two groups in colors you cannot tell apart
- Path: Right panel, with nothing selected > Style stack > Each layer (its swatch opens the color
  picker)
- Went back up: no. Confidence: 5.
- "That's my Appearance partition palette. I didn't think to look for a legend on the canvas;
  Gephi never had one."

### tt-5: cheapest route, a bigger transfer counts as more expensive
- Path: Main menu > Algorithms > Path (Shortest path), expecting a weight option in it
- Went back up: no. Confidence: 4.
- "In NetworkX the weight is an argument to shortest_path, so I'd expect it on the run. Whether
  bigger means costlier or cheaper had better be spelled out, because I won't guess."

### tt-12: how the biggest group differs from the rest
- Path: Results (rail) > An opened run (Louvain) > Compare with... -- reads "earlier runs of this
  measure first, then other runs": that compares runs, not a group. Back up to the top. Right
  panel, with a set, a group or a path selected > Compare with the rest.
- First top-level place opened: Results (rail). Went back up: yes. Confidence: 4.
- "The groups came out of a modularity run, so I went to the run. That button compares runs. The
  group comparison is on the group -- fine, but I had to find it."

### tt-16: where money went next after leaving one account in early August
- Path: Filter chip > Add a step (an ego-network step plus a date range, the way Gephi's
  Topology > Ego Network filter and the timeline work)
- Went back up: no. Confidence: 3.
- "In Gephi that's a filter: ego network, depth 1, and the timeline slider. I don't see a
  timeline, so I'd guess it's another filter step."

### tt-8: next month's transfers file has arrived
- Path: Main menu > File > Update with new data...
- Went back up: no. Confidence: 5.
- "Not Open, that's a new project. 'Update with new data' is what I want -- I'd believe the
  carry-over when I see my colors survive it."

### tt-2: how Valjean scored on betweenness and where he places
- Path: Bottom table > Search ("Valjean", with every result column shown)
- First top-level place opened: Bottom table. Went back up: no. Confidence: 6.
- "Data Lab, search the label, read the betweenness column. Rank I get by sorting the column."

### tt-11: total money moved along the selected route
- Path: Right panel, with a set, a group or a path selected > Members -- reads "count": that's
  how many, not how much. Back up. Bottom table > Footer (the sum over the selected rows).
- First top-level place opened: Right panel (path selected). Went back up: yes. Confidence: 5.
- "Gephi's Data Lab never summed anything; I'd export to R. A footer with a sum is nice, once
  I found it."

### tt-7: a colleague's file of the colors and sizes their team uses
- Path: Main menu > File -- Open... opens it as a new project, not what I want. Back up. Main
  menu > Recipes > Apply a recipe... -- "recipe" sounds like a macro of steps, not a palette;
  backed out. Right panel, with nothing selected > Style stack > Add a layer (+) > From a recipe
  or file... ("Only a recipe's styles; your data stays here").
- First top-level place opened: Main menu. Went back up: yes, twice. Confidence: 3.
- "In Gephi you can't import appearance at all. I only found it because the Style stack said
  'file'. I would not have called a palette a recipe."

### tt-15: one character's hidden name must always show
- Path: Right panel, with nothing selected > Style stack -- looking for label settings like
  Preview's; only layers and Look. Back up. Right panel, with a node selected > Show label anyway.
- First top-level place opened: Right panel (nothing selected). Went back up: yes. Confidence: 5.
- "Preview's label settings are global, so I looked there first. Per-node is better, if it
  survives the export."

## Scored against the key (afterwards; answers not changed)

| Task | Final pick | Correct | Direct | Confidence |
|---|---|---|---|---:|
| tt-1 | Main menu > Algorithms > Centrality | yes | yes | 6 |
| tt-2 | Bottom table > Search | yes | yes | 6 |
| tt-3 | Results (rail) > An opened run > Settings | yes | yes | 6 |
| tt-4 | Bottom table > Column header menu (sort) | yes | yes | 7 |
| tt-5 | Main menu > Algorithms > Path | yes | yes | 4 |
| tt-6 | Main menu > File > Export... | yes | yes | 6 |
| tt-7 | Style stack > Add a layer (+) > From a recipe or file... | yes | no | 3 |
| tt-8 | Main menu > File > Update with new data... | yes | yes | 5 |
| tt-9 | Style stack > Each layer | yes | yes | 5 |
| tt-10 | Main menu > Algorithms > Centrality (Weighted degree) | yes | yes | 6 |
| tt-11 | Bottom table > Footer | yes | no | 5 |
| tt-12 | Right panel, group selected > Compare with the rest | yes | no | 4 |
| tt-13 | Main menu > Edit > Undo | yes | yes | 5 |
| tt-14 | Filter chip > Filter steps | yes | yes | 6 |
| tt-15 | Right panel, node selected > Show label anyway | yes | no | 5 |
| tt-16 | Filter chip > Add a step | no | no | 3 |

Picks counted separately:
- tt-7: visited Main menu > File > Open... and Main menu > Recipes and backed out of both.
- tt-11: visited Right panel, a path selected > Members before the footer.
- tt-12: visited Results (rail) > An opened run > Compare with... first (wrong under this round's
  key; would have counted correct in round 5's rail arm, so under the old key this task would
  end on a different, then-correct pick only if she had stopped there -- she did not).
- tt-13: under the key without the Ctrl+Z restore, Edit > Undo scores wrong.
- tt-16: a filter step is Gephi's way (ego network plus timeline); the tree gives no hint that
  Neighbors takes a date.
