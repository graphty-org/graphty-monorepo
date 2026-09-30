# First-click test, round 6: Priya, threat hunter in a corporate SOC

Participant: the cybersecurity analyst persona (study/personas/cybersecurity-analyst.md).
Each prompt was answered from the named screen render alone, before the answer key was seen.
Confidence is 1 (pure guess) to 7 (certain). Answers were not changed after scoring.

## Answers, in her words

**fc-1. A picture of the network for the paper.** (shots/round-6-fc-lesmis-rest.png)
Clicks: the three-line menu button, top left of the rail. Confidence 4.
"There's no Export anywhere on screen. The camera icons under Views look like snapshots, but I
don't trust that they give me a file with a legend. Menu, then look for File > Export."

**fc-2. Repeat the earlier bridges calculation exactly.** (same screen)
Clicks: the "Bridges off" row in the Style stack. Confidence 3.
"That's the only thing on the page that says bridges. It's probably just a colour layer, not the
run, so I'm not sure it shows the settings. Where's the record of what was run? If Results is
that, it doesn't say so from here."

**fc-3. Rank the characters a second way.** (same screen)
Clicks: the "..." menu at the top right of the table. Confidence 4.
"The table is sorted by degree. I'd add another column and sort by that, like I would in Splunk."

**fc-4. A stray click cleared the picked-out characters; get them back.** (shots/record/round-6-fc-undo-notice.png)
Clicks: "Bring it back" on the dark notice above the toolbar. Confidence 6.
"It's right there and it says 18 nodes, which is what I lost. Otherwise my hand goes to Ctrl+Z."

**fc-5. Where Valjean's betweenness comes from and how it was calculated.** (shots/round-6-fc-lesmis-node.png)
Clicks: the "betweenness 0.57, highest" row under Results in the right panel. Confidence 5.
"That's the number. I'd expect clicking it to show me which run made it and on what graph."

**fc-6. Bring in next month's transfers file so the setup carries over.** (shots/round-6-fc-transfers-rest.png)
Clicks: the file chip "transfers-2026..." under the project name. Confidence 4.
"That's the file this is built on, so that's where I'd swap it. 'Change...' next to Loaded was
my second thought, but that reads like changing how the columns were read."

**fc-7. Accounts that take in far more money than they send out.** (same screen)
Clicks: the Table strip at the bottom. Confidence 3.
"In versus out is a column job. Open the table, add money in minus money out, sort. The hexagon
blob in the middle tells me nothing."

**fc-8. Cheapest route between two accounts, bigger transfer costs more.** (same screen)
Clicks: "Change..." after "amount not used yet" in the Statistics panel. Confidence 4.
"It says amount isn't used. Any shortest path I run now ignores the money, so I fix the weight
first. Then I'd look for a path tool."

**fc-9. IT asks whether anything from this project has left the computer.** (same screen)
Clicks: "Nothing has been sent from this project" under the project name. Confidence 6.
"That's exactly the question I ask first. It's underlined, so I expect a log behind it. If it's
just a sentence with nothing behind it, I can't show that to IT."

**fc-10. Ribosome and Spliceosome are two blues; change one.** (shots/round-6-fc-ppi-rest.png)
Clicks: the Spliceosome swatch in the legend. Confidence 5.
"Colour's in the legend, so click the colour."

**fc-11. Bring in the lab's file of standard colours and sizes.** (same screen)
Clicks: the palette icon to the right of "Graph" in the right panel. Confidence 3.
"Palette means colours. I'd hope there's an import in there. Could also be the '+' on the Style
stack, but a '+' usually means add one thing, not load a file."

**fc-12. How the Ribosome module differs from the rest of the network.** (same screen)
Clicks: "Ribosome" in the legend. Confidence 3.
"Pick out the group first, then hope it gives me its numbers next to the rest. Honestly I'd rather
have this as a table grouped by module."

**fc-13. A protein has no name showing; make its name always show.** (same screen)
Clicks: the magnifier next to "Graphs" in the left panel (search). Confidence 3.
"Find the protein first. That's the only search I see. I'd also try Ctrl+F. I didn't notice the
'7 more hidden' line until after."

**fc-14. Run the calculation again with one setting changed, and keep this one to compare.** (shots/round-6-fc-lesmis-run.png)
Clicks: "Re-run" in the opened Betweenness run. Confidence 3.
"Re-run is the obvious button, but I'm not sure it keeps this one. If it overwrites my first run,
that's a problem. 'Compare with...' is tempting, but there's nothing to compare with yet."

## Scoring

| Prompt | First click | Confidence | Correct |
|---|---|---|---|
| fc-1 | Main menu button | 4 | yes |
| fc-2 | "Bridges off" layer in the Style stack | 3 | no (the style layer, not the run's record) |
| fc-3 | Table "..." menu | 4 | no |
| fc-4 | "Bring it back" on the notice | 6 | yes in both undo designs (Ctrl+Z restore and notice-only) |
| fc-5 | Betweenness row under Results, right panel | 5 | yes |
| fc-6 | File chip under the project name | 4 | yes |
| fc-7 | Table strip at the bottom | 3 | yes |
| fc-8 | "Change..." on the Loaded line | 4 | no (counted separately: "amount not used yet") |
| fc-9 | "Nothing has been sent from this project" | 6 | yes |
| fc-10 | Spliceosome swatch in the legend | 5 | yes |
| fc-11 | Palette icon beside Graph | 3 | no |
| fc-12 | Ribosome label in the legend | 3 | yes |
| fc-13 | Search magnifier beside Graphs | 3 | no |
| fc-14 | Re-run in the opened run | 3 | yes |

9 of 14 correct.

## What the misses say

- **fc-2, the bridges settings.** The word "Bridges" appears only on a style layer, so a reader
  hunting for the run clicks the layer. Nothing on the resting screen says Results holds a record
  of each run.
- **fc-3, a second ranking.** A table-first reader reaches for the table's own menu to add a
  column. If that menu could offer "add a measure" it would catch this reader.
- **fc-8, the weighted path.** "amount not used yet" is read as a precondition: she sets the weight
  first. That is a reasonable first step, not confusion, and the Change... dialog could lead on to
  the path tool.
- **fc-11, the lab's style file.** The palette icon reads as "colours", and "+" reads as "add one
  layer", not "load a file".
- **fc-13, a hidden label.** She searches for the protein; the only visible search is the one
  beside Graphs, and the "7 more hidden" line went unseen.
- **Low confidence on fc-14.** "Re-run" does not say whether the old run is kept.
