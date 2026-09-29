# First-click test -- Chris, ML engineer (recommendation systems)

Each answer was given from the still screen alone, before the correct targets were seen.
Confidence is 1 (a guess) to 7 (certain). Scoring was added afterwards; no answer was changed.

| Prompt | Screen | First click | Confidence | Correct? |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, at rest | Hamburger menu, top left | 4 | Yes |
| See how the earlier bridges calculation was set up | Les Miserables, at rest | "Bridges off" in the Style stack | 3 | No |
| Rank the characters a second way | Les Miserables, at rest | Results on the left rail | 4 | Yes |
| Get back the characters a stray click cleared | Selection-cleared notice | "Bring it back" on the notice | 7 | Yes (under both undo designs) |
| Where Valjean's betweenness comes from | Valjean selected | The betweenness row (0.57, highest) under Results in the right panel | 6 | Yes |
| Bring in next month's transfers file, keeping the setup | Transfers, at rest | "Change..." on the Loaded line | 4 | No (the counted-separately trap) |
| Accounts taking in far more than they send | Transfers, at rest | Quick actions on the floating toolbar | 4 | Yes |
| Cheapest route, bigger transfer costs more | Transfers, at rest | "Change..." on the Loaded line | 5 | No (the counted-separately trap) |
| Has anything left my computer? | Transfers, at rest | "Nothing has been sent from this project" | 7 | Yes |
| Recolor Ribosome or Spliceosome | Protein interactions, at rest | The Spliceosome swatch in the legend | 5 | Yes |
| Bring in the lab's standard colors and sizes file | Protein interactions, at rest | Data on the left rail | 3 | Yes |
| How Ribosome differs from the rest | Protein interactions, at rest | The "Full graph" filter button | 4 | No |
| Make one protein's name always show | Protein interactions, at rest | The Table strip at the bottom | 4 | Yes |
| Re-run with one setting changed, keep this one | Betweenness run open | "Re-run" | 4 | Yes |

Score: 10 of 14 correct.

## What I was thinking, prompt by prompt

**Picture for the paper.** There is no Export anywhere I can see. The camera icons on the saved
views made me pause (camera = screenshot?), but those are named views, not an export. The
hamburger is where File lives in every tool I use, so that is where I go. If it is not there I
try Cmd+Shift+P.

**Bridges setup.** The only word "bridges" on the whole screen is the "Bridges off" layer in the
Style stack, so I click it. I half expected it to be a style thing, not the run itself, but
nothing else says bridges. Results on the rail is a flask icon; I did not connect "how was it set
up" with a flask. If the runs list showed on this screen I would not have missed it.

**Rank a second way.** The table says "Sorted by degree". I want betweenness or PageRank.
Results sounds like where computed columns live, so I go there. I nearly clicked the degree
column header to swap metrics, which I gather would be wrong.

**Get the selection back.** The notice says "Selection cleared (18 nodes)" with "Bring it back"
right next to it. Easy. My hand would also go to Cmd+Z out of VS Code habit, but the button is
under my cursor already.

**Valjean's betweenness.** The right panel has a Results block with "betweenness 0.57, highest".
I click that expecting the run's settings: exact or sampled, normalized, weighted or not. That is
the first thing I check on any centrality number.

**Next month's transfers file.** The panel reads "Loaded: transfers-2026-03.csv ... Change...".
That is the file, with a Change link beside it; I read it as "swap the source file". I did not
notice the small file chip under the project name as a button -- it looks like a label. If
"Change..." only edits how the columns were read, it is badly placed next to the file name.

**Money in vs money out.** That is weighted in-degree minus weighted out-degree. The "Quick
actions" lightning button is the only thing that looks like "do a computation", so I try it and
hope for a search box. Low confidence because I do not know what is behind it.

**Cheapest route where bigger transfers cost more.** The stats line says "amount not used yet".
A weighted shortest path needs amount as the edge weight first, so I click "Change..." to set it.
That is the correct order of operations in my head: fix the weight, then run Dijkstra. I did not
see a path tool; the two-circles icon on the toolbar did not read as "path" to me.

**Did anything leave my computer.** "Nothing has been sent from this project", underlined, right
under the title. That line is the reason privacy review would let me use this. Click it.

**Two blues.** The legend has Ribosome and Spliceosome swatches. Click the Spliceosome swatch and
expect a color picker.

**Lab's colors and sizes file.** It is a file coming in, so Data. Low confidence: the palette
icon next to "Graph" in the right panel was tempting because the file is about colors. I would
not have thought of "+" on the Style stack as an import.

**Ribosome vs the rest.** My instinct is to filter to the Ribosome module and read the stats
panel, then filter to everything else and read it again: degree distribution, density,
components. So the "Full graph" filter button. It did not occur to me that clicking a legend
label selects a group with its own compare action -- legends in every other tool are just keys.

**Make a protein's name always show.** I do not know which of the 300 dots it is, so I find it by
name in the table first; that selects it and then I look for a label option. I saw "7 more hidden
where they overlap" but I do not know whether my protein is one of those 7 or simply not in the
top 22, so I would not start there.

**Re-run with one setting changed, keep this one.** "Re-run" is right there. My worry is whether
it overwrites this run; nothing on the button says it keeps the old one. "Compare with..." sounds
like what I want to do afterwards, not first.

## Where I went wrong, and why

- The bridges prompt: the run is invisible on the resting screen; the only visible "bridges" is
  a style layer, so that is what gets clicked.
- The two "Change..." prompts: a link sitting next to the loaded file name reads as "change the
  file", and next to "amount not used yet" reads as "use the amount". Both are reasonable
  readings of that sentence.
- Ribosome vs the rest: I reach for a filter because that is how I get a subgraph and its
  numbers in a notebook. Legend labels as buttons are not something I expect.
