# Grade: session r5-s10b -- Grace (tier 1 graduate), Les Miserables (T17 B), only the strong ties

**Grade: S** (success, prompt and follow-up). The last screen (`12.png`) matches the answer key's
"back" state for B: the Filters row reads "shared_chapters is at least 8" over "off" with its
checkbox empty, the header chip is gone, the Overview reads Nodes 77, Edges 254 with no "showing"
rows, the legend titles are plain "Size: PageRank" / "Color: PageRank", and the whole drawing is
back. Both counts Grace gave were read where the key says they are shown and are right: 26 at 5 or
more shared chapters (`07.png`) and 17 at 8 or more (`11.png`).

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, tool commit `0340fb332c5e` with no uncommitted changes. Start: the
`lesmis-ranked` setup (Les Miserables open, PageRank run, nodes sized and colored by PageRank;
`01.png` shows the Graph page with the PageRank row reading 77).

## The answer against the key

- **Narrowed (right).** `07.png`: chip "26 of 77 nodes, 51 of 254 edges"; row "shared_chapters is
  at least 5" over "77 to 26 nodes, 254 to 51 edges" with the checkbox ticked; Overview "Nodes
  showing 26 of 77", "Edges showing 51 of 254". All three agree with the key.
- **Count (right).** "26 characters", read from the chip, the row and the Overview, which she
  checked against each other. She did not give 51 (edges) or 77 (full graph) as the answer, so no
  `read-wrong`.
- **Back (right).** `08.png`: unticking "Apply step: shared_chapters is at least 5" left the row
  reading "off", removed the chip, and the Overview returned to Nodes 77, Edges 254.
- **Follow-up (right).** She clicked the step's row (editor opened "Off" with Value 5 and "Save and
  turn on", step 10), replaced 5 with 8, and pressed "Save and turn on". `11.png`: chip "17 of 77
  nodes, 19 of 254 edges", row "77 to 17 nodes, 254 to 19 edges", Overview "Nodes showing 17 of
  77" -- the key's values. She then unticked once (`12.png`). She did not fall into the known trap
  (ticking after "Save and turn on", which switches the step off): she read that the step was on
  after saving and her only tick was the untick that brings everyone back.
- **Work kept.** `work.json`: the PageRank run, the three style layers and the source are the same
  at start and end; the only addition is the filter step, kept switched off
  (`step-1 off {"kind":"range","attribute":"data.shared_chapters","min":8,"nodes":"ends"}`). "off" is
  the step's state, as the key notes. Nothing gone.

## Measures

- **Door:** the canvas toolbar's Filters tool (the funnel at about 833,864), which the key accepts
  like the Filters "+". She found it by its look and a hover, not from her history.
- **Steps (prompt):** 7 `real.mjs` steps after the start: hover the funnel, Filters, Attribute,
  `shared_chapters`, Value 5, Add step, untick. The hover is a check before clicking, not a wrong
  turn.
- **Steps (follow-up):** 4 -- open the step's row, change the value, Save and turn on, untick --
  the key's follow-up success path exactly.
- **Wrong turns:** 0.
- **False "done":** none. Each "done" (step 8, step 13) was said on a screen that shows every
  character back (`08.png`, `12.png`). truth-on-screen holds for both counts.
- **Silent commit:** none. Add step and Save and turn on each changed the chip, row and drawing at
  once.
- **Numbers that disagree:** none on screen; the three count places agree each time.
- **Rerun of PageRank:** none. She read the legend's "PageRank, full graph" as "my colors didn't
  silently change", which is correct (the range is the whole graph's); she did not read "full
  graph" as what is still drawn, nor the range as a count.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Twelve screenshots for twelve steps; `leaks.json` shows no
  leaks over 26 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                         | Evidence                                                                                              |
| --- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 1        | navigation   | The canvas toolbar's Filters tool switches the left side from the Graph page to the Data page with no sign of why; the reader loses the page she was on.                                                                       | `01.png` (Graph page) against `03.png`/`06.png` (Data page after Filters); transcript step 3 and "What confused me" |
| 2   | 1        | feedback     | The New filter step editor shows no count of what the step would keep before "Add step"; the reader must add the step to learn its effect. Known on this build.                                                                | `06.png` (Value 5, Add step, no preview); transcript step 6 and "What confused me"                    |
| 3   | 1        | discoverability | The step's checkbox has no visible label while on; the word "off" appears only after it is unticked, so turning the step off to bring everyone back was a guess. It worked.                                                | `07.png` (ticked box, no on/off word) against `08.png` ("off"); transcript "What confused me"         |
| 4   | 1        | language     | The filter names the raw column ("shared_chapters"), and counts say "nodes" and "edges" where the reader means characters and ties; she translates in her head and would not put the column name on a slide. Did not affect the task. | `07.png`, `11.png`; transcript "What confused me"                                                     |
