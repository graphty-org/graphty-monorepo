# First-click test, round 6: Dr. Chen (computational biologist)

Participant: the bioinformatics researcher persona (study/personas/bioinformatics-researcher.md).
Each prompt was answered by looking only at the named screenshot. Confidence is 1 (pure guess) to 7
(certain). Answers were written before the correct targets were read and were not changed afterwards.

## Answers

| Prompt | Screen | First click | Sure (1-7) | Correct? |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, at rest | The three-line menu button, top left (expecting File > Export) | 4 | Yes |
| See how the earlier bridges calculation was set up | Les Miserables, at rest | "Bridges off" in the Style stack | 4 | No (style layer, not the run's record) |
| Rank the characters a second way | Les Miserables, at rest | The "..." menu at the top right of the table | 3 | No |
| Get back the characters a stray click cleared | Undo notice | "Bring it back" on the dark notice | 7 | Yes (both undo designs) |
| Where Valjean's betweenness comes from | Valjean selected | The "betweenness 0.57, highest" row under Results in the right panel | 6 | Yes |
| Bring in next month's transfers file, keeping the setup | Transfers, at rest | "Change..." on the "Loaded: transfers-2026-03.csv" line | 4 | No (counted separately) |
| Accounts that take in far more money than they send out | Transfers, at rest | Results on the left rail | 3 | Yes |
| Cheapest route, bigger transfer costs more | Transfers, at rest | "Change..." on the Loaded line | 5 | No (counted separately) |
| Has anything left the computer | Transfers, at rest | "Nothing has been sent from this project" under the project name | 6 | Yes |
| Two blues: change Ribosome or Spliceosome | Protein interactions, at rest | The Spliceosome swatch in the legend | 5 | Yes |
| Bring in the lab's file of standard colors and sizes | Protein interactions, at rest | The three-line menu button, top left (expecting File > Import > Style) | 4 | Yes |
| How the Ribosome module differs from the rest | Protein interactions, at rest | "Ribosome" in the legend | 4 | Yes |
| Make one protein's name always show | Protein interactions, at rest | The Table strip at the bottom, to find the protein by name | 4 | Yes |
| Run again with one setting changed, keep this run | Betweenness run open | "Re-run" | 4 | Yes |

Score: 10 of 14 correct. The undo prompt is correct under both undo designs, because "Bring it back"
works in either; I did not reach for Ctrl+Z or the menu.

## What I was thinking, in my own words

**Picture for the paper.** I want an SVG with real text, and that is a File > Export thing in every tool
I have used. The three lines at the top left are the only thing that looks like a File menu. I did
look at "Look: Screen" under the Style stack and wondered whether there is a "Print" look, but that
changes the drawing, it does not give me a file. The little camera icons next to the Views are
screenshots of camera positions, I assume, so no.

**How bridges was set up.** The only word "Bridges" anywhere on the screen is in the Style stack, with
an "off" and a crossed-out eye. So I clicked that, expecting it to tell me what it is painting and
where that came from. I noticed "Results" on the left rail with the flask, but nothing on this screen
tells me a bridges run lives in there. If the layer does not link me to the run, I am stuck.

**Ranking a second way.** The table says "Sorted by degree" and degree is the only measure column. My
reflex is: add a betweenness column to the table, then sort by it. In R that is one mutate. So the
table's "..." is where I would go to add a column. The lightning icon on the floating toolbar has no
label on this screen; I do not click unlabelled lightning bolts.

**Undo notice.** "Selection cleared (18 nodes) -- Bring it back." That is as plain as it gets. It also
told me the count, which I appreciate.

**Valjean's betweenness.** The right panel has a Results section with "betweenness 0.57, highest".
That is where I would click to see method and normalisation. I would want it to say whether it is
normalised and whether the graph was treated as weighted; the table header says "0 to 0.57", which
suggests normalised, but I would check.

**Next month's transfers file.** "Loaded: transfers-2026-03.csv ... Change..." is the sentence that
names the file, so "Change..." reads as "swap the file". I saw the file chip under the project name
too, but it is truncated and looks like a label, not a button. My worry is whether "Change..." means
change the file or change how it was read; I guessed the file.

**Money in versus money out.** This is weighted in-strength minus out-strength. The Statistics block
says "amount not used yet", which bothers me, because any answer without the amount is just in-degree.
I went to Results because that is where the measures should be, and I would expect to choose the
weight column there. I skipped "Quick actions": that sounds like the "magic" button that does
something without telling me the parameters.

**Cheapest route with amounts as cost.** Here the weight is the whole question, and the screen says
the amount is not used. Before any path, I have to tell the tool the amount is the edge weight, so I
clicked "Change..." on the Loaded line. I saw the icon with the two curves on the toolbar and it might
be a path tool, but I would not trust a shortest path until the weight is set.

**Has anything left my computer.** The underlined line "Nothing has been sent from this project" is
exactly what I would show IT. Also the rail says "Assistant Off. Nothing is sent." Good.

**Two blues.** Ribosome and Spliceosome are indeed too close, and one of them should not be blue at
all. I would click the Spliceosome swatch in the legend and expect a colour picker. If the legend is
read-only, the "Module color" row in the Style stack would be my second try.

**The lab's standard colours file.** In Cytoscape that is File > Import > Styles from File, so I
went to the menu. The palette icon beside "Graph" is tempting, but it sits next to Background and
Layout, so I read it as a theme picker for the canvas.

**Ribosome versus the rest.** Clicking "Ribosome" in the legend should select the module. After that I
would want degree, betweenness and enrichment for the module against the background. I am not sure
the legend is clickable; nothing tells me it is.

**A protein's name always showing.** The legend line "7 more hidden where they overlap" caught my eye,
but my protein may not be one of those seven: the labels are "the 22 proteins with the most
partners", and mine is not a hub. I would find it by name in the table, select it, and look for a
label option on its panel.

**Run again, keep this one.** "Re-run" is the obvious button. My worry is that Re-run overwrites
the run I want to keep; nothing says it makes a new run. "Compare with..." sounds like it needs two
runs that already exist.

## Remarks she would make out loud

- "Why is the betweenness run in one place, the bridges colouring in another, and the column in a
  third? I need one place that says: this number, this method, these settings, this date."
- "'Amount not used yet' is the most important sentence on the transfers screen and it is in small
  grey text. Every weighted question depends on it."
- "The file chip is cut off: 'transfers-2026...'. Give me the whole file name; I have twelve of them."
- "Re-run should say whether it keeps the old one. Losing a run I quoted in a draft is how I end up
  back in igraph."
