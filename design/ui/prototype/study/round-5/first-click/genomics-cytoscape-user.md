# First-click test: Maren, cancer genomics postdoc and Cytoscape user

Maren has used Cytoscape two or three times a month for years. For each question she looked at one screen and said the first thing she would click, and how sure she was, from 1 (a guess) to 7 (certain). Her answers were marked against the intended targets afterwards and were not changed.

| Prompt | Screen | First click | Sure (1-7) | Correct |
|---|---|---|---|---|
| Picture of the network for the paper | Les Miserables, nothing selected | The three-line menu at top left, looking for File > Export | 4 | yes |
| Repeat the earlier bridges calculation exactly | Les Miserables, nothing selected | "Bridges ... done" under Results, right panel | 5 | yes |
| Rank the characters a second way | Les Miserables, nothing selected | The + next to Results | 4 | yes |
| Groups 2 and 3 hard to tell apart | Les Miserables, nothing selected | The orange swatch of group 2 in the legend box | 5 | yes |
| Get back a selection a stray click cleared | Les Miserables, nothing selected | The three-line menu, looking for Edit > Undo | 3 | yes |
| What is painting Valjean this color | Les Miserables, Valjean selected | "Group color" under Appearance | 5 | yes |
| Where Valjean's betweenness comes from | Les Miserables, Valjean selected | "betweenness 0.57, highest" under Results | 4 | yes |
| Bring in next month's transfers file | Transfers, nothing selected | The file chip "transfers-2026..." under the project name | 4 | no |
| Accounts that take in far more than they send | Transfers, nothing selected | The Table strip at the bottom, to sort the accounts | 3 | no |
| Cheapest route, bigger transfer costs more | Transfers, nothing selected | "Change..." after "amount not used yet" | 4 | no |
| Has anything left the computer | Transfers, nothing selected | "Nothing has been sent from this project" with the lock | 6 | yes |
| Ribosome and Spliceosome look the same blue | Protein interactions, nothing selected | The Ribosome swatch in the legend | 5 | yes |
| Bring in the lab's file of colors and sizes | Protein interactions, nothing selected | The + next to Style stack | 3 | no |
| How Ribosome differs from the rest | Protein interactions, nothing selected | "Ribosome" in the legend | 3 | yes |

Score: 10 of 14.

## What she said, prompt by prompt

**Picture for the paper.** "Nothing on the screen says Export. In Cytoscape it's under File, so the hamburger at top left is my File menu. I just hope the legend comes out with the picture, because that box in the corner is exactly what a reviewer will ask for."

**Repeat the bridges calculation.** "Bridges, done. That's the only record of it on the screen, so I'd click that and hope it shows the settings. If it doesn't, I'm writing the methods from memory again."

**Rank a second way.** "The current ranking is degree, from the table. For another one I'd want something like cytoHubba. The + next to Results is the only thing that looks like 'run another analysis'."

**Groups 2 and 3.** "Group 2 is orange in the legend. Group 3 isn't even listed, it's under '6 more'. So I'd click the orange square for 2 and expect a color picker. Also those two oranges are close. My PI would never tell them apart."

**Get the lost selection back.** "Honestly I'd hit Command-Z. If I have to click something, it's the menu, looking for Edit, Undo. I'm not confident undo works on a selection, though. In Cytoscape it often doesn't."

**What is painting Valjean.** "There's an Appearance list, and 'Group color' has the same yellow-orange as his node. Size is degree, so the color has to be Group color. That one is pretty readable."

**Where the betweenness number comes from.** "I don't really know betweenness. The right panel says 0.57, highest, under Results, so I'd click that and hope it tells me what it means and how it was run. 'Highest' of what, out of what?"

**Next month's file.** "The file name is right there under the title, transfers-2026. I'd click that to swap in April. I wouldn't think of 'Data' on the left as where you replace the file, and the project name looks like it just renames the project."

**Accounts that take in more than they send.** "That's in-flow versus out-flow, summed. I'd open the table at the bottom and look for columns to sort on. Nothing on the right says 'in' or 'out'. It also says the amount isn't used, so I'm not sure the table would even have money totals." (Not an expected target.)

**Cheapest route.** "It literally says 'amount not used yet. Change...'. The question is about amounts counting as cost, so I'd click Change. I didn't notice the icons on the toolbar would do paths. I don't click unlabeled icons." (A click on "Change..." is recorded separately: it sets the default that new calculations use, which is not the same as running one.)

**Has anything left the computer.** "Top left, with a lock: 'Nothing has been sent from this project'. That's the first thing I'd show IT. Good that it's up there and not buried in settings."

**Ribosome and Spliceosome.** "Same move as before: the Ribosome square in the legend. And yes, those two blues are a problem. Light blue and dark blue next to each other won't survive the journal's grayscale print either."

**The lab's file of colors and sizes.** "That's a style file. Style stack has a +, so I'd guess it adds or imports a style. I'm not sure it takes a file, but nothing else on the screen says style." (Not an expected target.)

**How Ribosome differs from the rest.** "I'd click Ribosome in the legend to pick those 56 out, and then... I don't know. What I actually want is enrichment and how connected they are to everything else, and I don't see where that would show up. Low confidence."

## What her misses point to

- She reads the file chip under the project name as the place to replace the data file. Neither the project name nor Data on the rail suggested "bring in next month's file" to her.
- On the Transfers screen, the sentence "amount not used yet. Change..." pulled her in on both money questions. She took it as the place that decides whether transfer amounts count, which is partly right, but it kept her from running anything. She never noticed the toolbar icons for paths.
- She has no word for "a lab style file". The + on the Style stack was her only guess, and she did not look in the main menu.
- She got the legend, Results and Appearance questions right, but she was only moderately sure of them (4-5). The one answer she was sure of (6) was the "Nothing has been sent" line.
- She was unprompted about color: she flagged two near-identical oranges and two near-identical blues as a problem for her color-blind PI and for print.
