# First-click test, round 6 -- Dr. Min-ji Kim, knowledge graph engineer

One static screen per prompt, one click each, confidence 1 (guess) to 7 (certain). Answers were
given before the correct targets were seen and were not changed afterwards.

| Prompt | Screen | First click | Confidence | Scored |
|---|---|---|---|---|
| 1. Picture of the network for the paper | Les Miserables, at rest | The main menu button at the top left of the rail, looking for File > Export | 4 | Correct |
| 2. Repeat the earlier bridges calculation exactly | Les Miserables, at rest | Results on the rail | 4 | Correct |
| 3. Rank the characters a second way | Les Miserables, at rest | Results on the rail | 5 | Correct |
| 4. Get the cleared selection back | Undo notice | "Bring it back" on the notice | 6 | Correct in both undo designs |
| 5. Where Valjean's betweenness comes from | Les Miserables, Valjean selected | The betweenness row under Results in the right panel (0.57, highest) | 5 | Correct |
| 6. Bring in next month's transfers file, keeping the setup | Transfers, at rest | The file chip under the project name (transfers-2026...) | 4 | Correct |
| 7. Accounts that take in far more than they send | Transfers, at rest | The Table strip at the bottom | 3 | Correct |
| 8. Cheapest route where a bigger transfer costs more | Transfers, at rest | "Change..." on the Loaded line (amount not used yet) | 5 | Wrong (counted separately) |
| 9. Has anything left the computer | Transfers, at rest | The line "Nothing has been sent from this project" | 6 | Correct |
| 10. Two blues you cannot tell apart | Protein interactions, at rest | The Spliceosome swatch in the legend | 4 | Correct |
| 11. Bring in the lab's colors and sizes file | Protein interactions, at rest | The main menu button, looking for File > Import | 3 | Correct |
| 12. How the Ribosome module differs from the rest | Protein interactions, at rest | "Change overview..." in Statistics | 3 | Wrong |
| 13. Make one protein's name always show | Protein interactions, at rest | The legend line "7 more hidden where they overlap" | 4 | Correct |
| 14. Run again with one setting changed, keep this run | Betweenness run opened | Re-run | 4 | Correct |

Prompt 4 under both undo designs: "Bring it back" is correct whether or not Ctrl+Z restores a
cleared selection, so it scores correct under the notice-only design and under the Ctrl+Z design.

## What she said, prompt by prompt

**1. Picture for the paper.** "There is no export button anywhere on this screen. The camera icons
under Views are saved views, not an export -- I am not falling for that. Export lives in a File
menu in every tool I have ever used, so the three lines at the top left. I want SVG, and if it
only gives me a screenshot I will be annoyed." 4.

**2. Repeat the bridges calculation.** "'Bridges off' in the style stack is a paint layer, it
tells me what colour something is, not how bridges were computed. The flask says Results. That
is where the run should be, with its settings. If it is not there, nobody can repeat anything."
4.

**3. Rank a second way.** "The table is sorted by degree. Ranking a second way means another
centrality -- which one is my business. Clicking the column header only re-sorts what exists. I
need to compute something new, so Results again. The lightning bolt has no label; I do not click
unlabelled icons." 5.

**4. Cleared selection.** "The screen tells me what happened, 18 nodes, and gives me the button.
Good. That is the kind of message I read." Would she try Ctrl+Z first? "No. When a tool tells me
what it did and offers the reverse, I take the offer. I do not trust Ctrl+Z in a browser app; half
the time it undoes something else." 6.

**5. Valjean's betweenness.** "0.57, highest, in the Results block of his panel. I click the number
and I expect it to tell me which betweenness: normalized or not, exact or sampled, directed or
not. If it is just a number, it is worthless to me." 5.

**6. Next month's file.** "The chip under the project name is the file. 'Change...' down in
Statistics is about direction and amount -- that is the mapping, which is exactly what I want to
keep, so I do not touch it. I click the file and hope it offers to replace it with the same
mapping. What it does with accounts that disappeared between months is the real question." 4.

**7. Take in far more than they send.** "In-strength minus out-strength on amount. That is a
group-by in a spreadsheet, which is where I would do it anyway, so the Table at the bottom. I
half expect to end up in Results. And 'amount not used yet' worries me -- is anything weighted
here at all?" 3.

**8. Cheapest route by amount.** "It says in plain words: amount not used yet. A weighted
shortest path with no weight is a hop count, and it would give me the wrong answer confidently.
So the first thing is to make amount the edge weight -- 'Change...'. Then I look for Dijkstra."
5. (Scored wrong: the path tool on the toolbar was the intended first click. She was not
looking for a path tool at all until the weight was set.)

**9. Has anything left the computer.** "It is underlined, so it is a link, and it says nothing was
sent. I click it to see the evidence. A sentence is a claim; I want the log behind it." 6.

**10. Two blues.** "Ribosome light blue, Spliceosome dark blue. For me those are fine, it is red and
green I cannot do, but yes, they are close. Click the swatch in the legend and expect a colour
picker. If the legend is read-only, then 'Module color' in the style stack." 4.

**11. The lab's colour and size file.** "Importing a file is File > Import. Three lines at the top
left. The file chip is the data file, not a style file, and the palette icon next to Graph
probably changes the theme. I do not know what this tool calls a style file, so I go where files
come in." 3.

**12. How the Ribosome module differs.** "I want the same statistics shown for the Ribosome group
and for everything else, side by side. The Statistics panel says 'Overview: General' with a
'Change overview...' next to it, so I assume I can change what the overview is computed over.
Clicking the Ribosome row in the legend might select it, but a legend is a key, not a query." 3.
(Scored wrong: selecting the group from the legend was the intended first click.)

**13. A protein's name always showing.** "The legend admits it: 7 more hidden where they overlap. At
least it says so instead of silently dropping them. I click that line and look for my protein.
If it is not one of the 22 plus 7, then I go to the table and search." 4.

**14. Re-run with one setting changed, keep this one.** "Re-run is the obvious one. My worry is
that it overwrites this run. 'Compare with...' needs a second run to exist first, so it cannot be
step one. If Re-run replaces the old result without asking, that is a serious problem." 4.

## Tally

- Correct: 12 of 14 (prompt 4 correct under both undo designs).
- Wrong: prompt 8 ("Change..." on the Loaded line, counted separately) and prompt 12 ("Change
  overview...").
- Mean confidence: 4.3. Confidence on the two misses: 5 and 3.

## What the misses say

- **Prompt 8.** The Loaded line says "amount not used yet", and for a reader who knows a weighted
  path is meaningless without a weight, that line is the first thing to fix, not a distraction.
  She clicked it confidently (5). The mistake is not reading carelessly: the screen tells her the
  weight is missing, and nothing on the path tool says it will ask for one.
- **Prompt 12.** "Overview: General" with "Change overview..." reads as "change what these
  statistics are computed over". A group comparison is a statistics question, so she went to the
  statistics panel. The legend looks like a key, not like something that starts an analysis.
