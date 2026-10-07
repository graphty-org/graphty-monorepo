# Pilot: T2, Something to try it on

Build under study: graphty@0.8.53, commit 452285142099, opened at `/?next` with clean storage.

**End state reached.** One click from the empty app draws the Les Miserables sample, the Overview
gives enough to say what it is, and the header's privacy chip leads to Settings > Privacy. No
script errors, console errors or failed requests were reported at any step.

## Steps

| Step | Command                                    | What the screen showed                                                                                                                                                                                              |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | `--start ... empty`                        | Start screen: Start column, empty Recent projects, four sample cards with counts and one-line descriptions; the usage-data card at the bottom ("Nothing is collected until you answer"); "Local only" chip.        |
| 02   | `--click "Open the Les Miserables sample"` | The graph drawn at once, settled: 77 blue nodes, gray edges, no labels drawn. Values > Overview: Nodes 77, Edges 254, Density 0.08681, Components 1, Edges per node 1 to 36, mean 6.597. The usage card is gone. |
| 03   | `--hover "Local only"`                     | Tooltip "Nothing is sent. Opens Settings > Privacy".                                                                                                                                                                |
| 04   | `--click "Local only"`                     | Settings opens on Privacy: "Share usage data" switch (off), the same explanation, "Where your data goes ... Usage data: off. Nothing is sent."                                                                     |
| 05   | `--click "Done"`                           | Back to the graph, unchanged.                                                                                                                                                                                       |
| 06   | `--hover-at 1265,332`                      | The truncated "Edges per ..." label shows its full name, "Edges per node", in a tooltip.                                                                                                                           |
| 07   | `--hover-at 1335,236`                      | The direction row: no tooltip on screen, though the tool printed one (see finding 5).                                                                                                                              |
| 08   | `--reopen`                                 | Start screen again; the usage card is back, unanswered; Recent projects still empty.                                                                                                                               |

## The participant's answer this path supports

"The Les Miserables sample: 77 characters from the novel, linked when they share a chapter (254
links)." The card's description (01) and the Overview counts (02) agree. To change the usage-data
answer later: the "Local only" chip in the header, which opens Settings > Privacy (03, 04).

Grade on this path: success, 1 step, no detour.

## Findings (none block the task)

1. **The direction row has lost its label** (app). In the Overview (02, 05, 07), the row at y 236
   shows only "Undirected, from the file: directed 0", starting further left than the other
   values and running to the panel's edge; the name "Direction" given by `GraphValues.tsx` is
   squeezed out by the long value. Unchanged since the previous build.
2. **"from the file: directed 0" quotes raw file syntax** (app wording). `directionWords` in
   `graphty/src/workspace/inspector/words.ts` appends graphty-element's `statedBy` fact verbatim;
   for this GML sample that is `directed 0`, which a first-time reader cannot read. The fact is
   neutral, as it should be; the words are the app's to choose. Unchanged.
3. **The usage-data card vanishes unanswered when a sample opens** (app, observation). It comes
   back on the start screen (08) and nothing is sent meanwhile, so it is consistent, but a
   participant who opens a sample first never sees the card's follow-up line about Settings >
   Privacy. The chip's tooltip still names Settings > Privacy, so the measured answer is reachable.
4. **An opened sample does not appear in Recent projects** (app, observation). The empty-state
   text says "Projects you open or create appear here", and after opening Les Miserables and
   reopening the tab the list is still empty (08). Possibly intended for samples; the wording does
   not say so.
5. **A hover can print the previous tooltip** (tool). At step 07 the tool printed
   `tooltip: "Edges per node"` for the direction row, but the screenshot shows no tooltip: the
   bubble from step 06 was still fading when `real.mjs` sampled the page right after the pointer
   moved. A grader reading only the text output would be misled. Still present.
6. **Answer key wording** (answer key, minor). The "change it later" measure credits "reading the
   line 'Change this in Settings > Privacy' after answering the card"; on the sample-first path the
   card is never answered, so that line is never shown. The key already accepts the chip's tooltip
   and Settings > Privacy instead, which is what this path shows.
