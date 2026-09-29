# First-click test: the Gephi holdout (Dr. Mara Lindqvist, fictional)

Associate professor, ten years of Gephi, teaches it every year. She looked only at each named
screen and said where she would click first, and how sure she was, from 1 (a guess) to 7
(certain). Her answers were then checked against the target areas. Nothing she said was changed
after the check.

## Answers

| Prompt | Screen | First click | Sure (1-7) | Correct |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, nothing selected | The three-line menu at the top left | 5 | yes |
| Repeat the earlier bridges calculation exactly | Les Miserables, nothing selected | "Bridges ... done" under Results | 6 | yes |
| Rank the characters a second way | Les Miserables, nothing selected | The + next to Results | 5 | yes |
| Groups 2 and 3 are hard to tell apart | Les Miserables, nothing selected | "Group color" in the Style stack | 5 | yes |
| Get back a selection a stray click cleared | Les Miserables, nothing selected | Cmd+Z (undo) | 3 | no |
| What is painting Valjean this color | Les Miserables, Valjean selected | "Group color" under Appearance | 6 | yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results | 5 | yes |
| Bring in next month's transfers file | Transfers, nothing selected | The three-line menu at the top left | 4 | yes |
| Accounts that take in far more than they send | Transfers, nothing selected | "Change..." after "amount not used yet" | 4 | no |
| Cheapest route, bigger transfer costs more | Transfers, nothing selected | "Change..." after "amount not used yet" | 4 | no |
| Has anything left the computer | Transfers, nothing selected | "Nothing has been sent from this project" | 6 | yes |
| Ribosome and Spliceosome look the same blue | Protein interactions, nothing selected | "Module color" in the Style stack | 5 | yes |
| Bring in the lab's colors-and-sizes file | Protein interactions, nothing selected | The three-line menu at the top left | 3 | yes |
| How the Ribosome module differs from the rest | Protein interactions, nothing selected | The "Full graph" filter button | 4 | no |

Score: 10 of 14.

## What she said, prompt by prompt

**Figure for the paper.** "In Gephi that's Preview, then export. There's no Preview here, so it's
File, and File is that hamburger. I'll want SVG. If the menu only offers me a PNG, we're done."

**Repeat the bridges run.** "Results, Bridges, done. I click that and I expect the parameters and
what it ran on. If it doesn't tell me whole graph or filtered, it's no better than Gephi's
report window."

**Rank a second way.** "That's my Statistics panel, and here it's Results with a plus. Plus
means 'run another one', I assume. I'd want PageRank or eigenvector next to betweenness."

**Groups 2 and 3.** "This is a partition. In Gephi I'd go to Appearance, Partition, and click the
colour chip. Group color in the stack is the partition. Group 3 isn't even in the legend -- it's
under '6 more' -- so I'm not going to the legend for it."

**Lost selection.** "Cmd+Z. Straight away. That's the first thing I test in any tool, and I want
to know whether undo covers a selection or only edits. If it doesn't, I'd look in the menu for an
Edit entry, but I'm not optimistic." (Undo is the reflex; she did not think of the menu first.)

**What paints Valjean.** "He's group 2, the table says so, and 2 is the orange. Group color is
what's doing it. Size: degree is only size. Bridges is off. So Group color -- I'd click it to see
the rule."

**Valjean's betweenness.** "Results, betweenness, 0.57. Normalized, I assume, but it doesn't say.
I click that row and I want to see normalized or not, directed or not, and weights. If it can't
tell me, I can't check it against NetworkX."

**Next month's file.** "File, Import. Hamburger again. There's a little file chip with the old
file's name under the title, which I nearly clicked -- maybe that swaps the file? But I don't
trust a chip to do that without asking. Menu."

**Money in versus money out.** "That's weighted in-degree minus weighted out-degree. But it says
right there 'amount not used yet'. So nothing weighted will work until I tell it the amount is
the weight. I click Change... first, then I'd run the statistic."

**Cheapest route.** "Same thing. The weight has to be the amount before any shortest path means
anything. Change... first. I don't see a path tool -- that squiggle on the toolbar might be one,
but I wouldn't bet on it."

**Has anything left the computer.** "It says 'Nothing has been sent from this project' with a
lock. That's what I'd show IT. I'd click it and hope it gives me a log, not a sentence."

**Ribosome and Spliceosome.** "The partition again: Module color. I could click the chip in the
legend, but the legend is a legend, it's for the figure. The rule lives in the stack."

**The lab's colours file.** "Gephi has nothing like this; we pass around screenshots of the
palette. A file comes in through File. Hamburger. Low confidence -- I don't know what it even
calls that."

**How the Ribosome differs.** "I filter to the Ribosome partition and compare the statistics
against the whole graph. 'Full graph' with a funnel is the filter. And then I check whether the
statistics follow the filter, because in Gephi they silently do."

## Where she went wrong, and why it matters

- **Getting a selection back.** She reached for undo, not a menu. For someone who has fought
  Gephi's missing undo for a decade, Cmd+Z is the reflex for every "get it back" task; a
  selection history hidden in the main menu is invisible to her.
- **"amount not used yet" pulled both money questions.** She read the Loaded line as a
  precondition: nothing weighted can be right until the amount is the weight. So she went to
  Change... before any statistic or path. That is not a careless miss; it is her reading the
  parameters first, as she always does. She did not recognise the path tool on the toolbar.
- **Comparing one module with the rest.** She treats "compare a group with the whole" as a filter
  task and went to the "Full graph" filter button, not the legend or the table. The legend, to
  her, is a figure element, not something you click to select.
