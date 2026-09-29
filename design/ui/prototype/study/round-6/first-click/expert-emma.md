# First-click test -- Expert Emma (network scientist, power user)

Each answer was given looking only at the named screen, before seeing the correct targets.
Confidence is 1 (pure guess) to 7 (certain). Marking was done afterwards; no answer was changed.

| Prompt | Screen | First click | Confidence | Correct? |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, at rest | The three-line main menu button, top left, looking for File > Export | 5 | Yes |
| Repeat the earlier bridges calculation exactly | Les Miserables, at rest | Results on the left rail | 5 | Yes |
| Rank the characters a second way | Les Miserables, at rest | Results on the left rail | 4 | Yes |
| Get back the characters a stray click cleared | Selection-cleared notice | "Bring it back" on the dark notice | 6 | Yes (both undo designs) |
| Where Valjean's betweenness comes from | Valjean selected | The "betweenness 0.57, highest" row under Results in the right panel | 6 | Yes |
| Bring in next month's transfers file, keep the setup | Transfers, at rest | The file chip under the project name (transfers-2026...) | 4 | Yes |
| Accounts taking in far more than they send | Transfers, at rest | "Change..." on the Loaded line | 5 | No (the listed wrong target) |
| Cheapest route, bigger transfer costs more | Transfers, at rest | "Change..." on the Loaded line | 5 | No (the listed wrong target) |
| Has anything left the computer? | Transfers, at rest | "Nothing has been sent from this project" under the name | 7 | Yes |
| Two blues: change Ribosome or Spliceosome | Protein interactions, at rest | The Spliceosome swatch in the legend | 5 | Yes |
| Bring in the lab's file of standard colors and sizes | Protein interactions, at rest | The three-line main menu button | 3 | Yes |
| How Ribosome differs from the rest | Protein interactions, at rest | "Ribosome" in the legend | 4 | Yes |
| Make one protein's name always show | Protein interactions, at rest | The Table strip at the bottom, to find the protein by name | 4 | Yes |
| Run again with one setting changed, keep this one | Betweenness run opened | "Re-run" | 5 | Yes |

Score: 12 of 14 correct. The two misses are the same click, for the same reason.

## Thinking aloud

**Picture for the paper.** Export is a File thing. The only thing that looks like a File menu is
the three lines top left. The camera icons under Views are saved views, not image export -- I
have seen that trick before. 5.

**Repeat the bridges calculation.** "Bridges off" in the style stack is a colouring, not the
computation. I want the record of the run: parameters, when, on what. Results is the only word
here that means that. 5. If Results does not show me the settings used, that is a problem.

**Rank a second way.** Same place: a new measure is a new result. I did consider the "..." on the
table to add a column, and the lightning icon on the toolbar, but the lightning has no label and
I do not click icons that might be "magic". 4.

**Stray click cleared the selection.** Honestly my hand goes to Ctrl+Z. But the notice is right
in the middle of the screen, says 18 nodes, and has "Bring it back". I would click that. 6.
If Ctrl+Z does not also work I will be irritated later, not now.

**Valjean's betweenness.** Right panel, Results, "betweenness 0.57, highest". Click that and I
expect normalization and method. "Highest" is fine; I would still want to see whether 0.57 is
normalized the networkx way. 6.

**Next month's transfers file.** The file chip under the project name is the file, so that is
where replacing it should live. The "Change..." link next to "Loaded:" also looked plausible --
it talks about the same file -- but it reads like import settings, not a new file. 4.

**Money in far more than out.** The screen tells me "amount not used yet". Anything about money
in versus out is a weighted in-strength minus out-strength, and it is meaningless until the
amount column is the weight. So first I go to "Change..." and make it use amount. I would do that
before any calculation. 5. (Marked wrong. I would argue with that: a tool that let me compute
"money in" while the amount is ignored would lose me.)

**Cheapest route, bigger transfer costs more.** Same reasoning, even more so: a weighted shortest
path with no weight set is just hop count. Set the weight first -- "Change...". 5. (Also marked
wrong. Same argument. If the path tool asks me for the weight column when I use it, fine, but
nothing on this screen tells me it will.)

**Has anything left my computer.** "Nothing has been sent from this project", underlined, right
under the name. Exactly the sentence I look for first on any tool. I would click it to see what
it actually covers -- telemetry included or not. 7.

**Two blues.** The legend has Ribosome and Spliceosome with their swatches. Click the swatch,
expect a colour picker. 5. The Ribosome blue and Spliceosome blue really are close.

**Lab's standard colours file.** No idea. There is a palette icon beside "Graph" but that looks
like a theme for this graph, not an import. The "+" on the style stack adds a layer, maybe from a
file, maybe not. I went to the main menu because imports usually live there. 3.

**Ribosome versus the rest.** I would click the Ribosome label in the legend, hoping it selects
the module. What I actually want is a comparison of degree distributions or internal density,
and nothing on screen promises that. 4.

**Protein name always showing.** I know the name, not where the dot is. Open the table, find the
row. The legend line "7 more hidden where they overlap" I read as information, not a control;
I did not think of clicking it. 4.

**Run again, keep this one.** "Re-run" sits next to the settings. I assume it opens the same
settings for editing and keeps the old run -- that assumption is the whole reason I would trust
it, so it had better be true. "Compare with..." is for after. 5.

## What she would say about the screens

- The "Nothing has been sent from this project" line is the best thing here. Keep it where it is.
- "Amount not used yet" is honest, and it is precisely why I clicked it for anything involving
  money. If the weighted measures and the path tool ask for the weight themselves, show that
  on the tool, because the screen currently teaches me to go to the import settings first.
- The unlabeled lightning icon on the Les Miserables toolbar reads as "magic". On the Transfers
  and protein screens it says "Quick actions", which is at least a name.
- The run panel showing method, normalized, edges, weight and time is what I want after every
  run. That is the screen that would make me trust the numbers.
