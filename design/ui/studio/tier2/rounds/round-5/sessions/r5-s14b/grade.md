# Grade: session r5-s14b -- Dev (tier 1 graduate), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), and the follow-up also succeeded. The last screen (`13.png`) shows the
whole graph back: no count chip in the header, the Overview reads Nodes 77, Edges 254, every
character drawn, and the Filters list holds two rows, "shared_chapters is at least 5" and
"shared_chapters is at least 8", each with its checkbox clear and the second line "off". The
narrowed screens show the key's values: at 5 or more (`07.png`) the chip "26 of 77 nodes, 51 of 254
edges", the row "77 to 26 nodes, 254 to 51 edges" and the Overview "Nodes showing 26 of 77", "Edges
showing 51 of 254"; at 8 or more (`12.png`) the chip "17 of 77 nodes, 19 of 254 edges", the row "77
to 17 nodes, 254 to 19 edges" and "Nodes showing 17 of 77". Dev answered 26 characters, then 17,
both read from those screens.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, tool checkout clean. Start: the Les Miserables setup (sample opened,
PageRank run, nodes sized and colored by it).

## The answer against the key

- **Narrowed (right).** One step, `shared_chapters` at least 5, nodes kept at the ends of passing
  ties (`work.json`: `{"kind":"range","attribute":"data.shared_chapters","min":5,"nodes":"ends"}`).
  The drawing on `07.png` holds only the strong ties.
- **Count (right).** 26, read from the chip, the row and the Overview, which agree. Not 51 (the
  ties) and not 77 (the "Full graph" rows below). Follow-up: 17, likewise right.
- **Brought back (right).** Unticking the step's checkbox (`08.png`, then the 8 step on `13.png`);
  the key accepts this. Both steps are kept, off.
- **Work kept.** `work.json`: runs, layers and sources identical at start and end; the only change
  is the two filter steps, both off. Nothing gone.

## Measures

- **Route:** the canvas toolbar's Filters tool (the funnel at about 833,863), the third door the key
  accepts; hovered first to read its tooltip "Filters". The New filter step editor's line "Keeps
  edges that pass and the nodes at their ends." confirmed the meaning before Add step (`05.png`).
- **Steps, first prompt:** 7 (`real.mjs` steps 1-7): hover, Filters, Attribute, shared_chapters,
  Value 5, Add step, untick. The success path from this door is 6; the hover was a check of the
  icon's name, not a wrong turn.
- **Steps, follow-up:** 5 (steps 8-12): open the 5 step's editor and leave it unsaved, the Filters
  "+", attribute and value 8 in one command, Add step, untick. The key's follow-up path (edit the
  step, Save and turn on, untick) is 4, so 5 meets the target of the path + 1. Opening the old step
  and choosing not to edit it was a deliberate choice to keep the 5 rule, said aloud, not a mistake.
- **The follow-up trap:** not met. Dev did not edit the off step and tick it; adding a second step
  sidestepped "Save and turn on" entirely.
- **Wrong turns:** 0 (first prompt and follow-up).
- **False "done":** none. Every claim in "At the end" (26 of 77, 51 of 254; 17, 19; all 77 back)
  is true on `07.png`, `12.png` and `13.png`. truth-on-screen holds.
- **Rerun of PageRank:** none. Dev read "PageRank, full graph" on the legend as meaning the colors
  were not recalculated, which is right, and did not read it as what is drawn or as a count.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 7 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Thirteen screenshots for twelve steps plus the start;
  `leaks.json` shows no leaks over 29 calls. Dev looked for "Filters" by his tutorial word, which
  his briefing's habit (look for each step by its tutorial word) supplies; the briefing does not
  name the control or its place.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                         | Evidence                                                                                                                                      |
| --- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | understanding | While a step is on, the legend reads "PageRank, full graph" with the whole graph's range. Dev guessed it meant the colors were not recalculated ("I think that's intended") but could not confirm it; nothing says whether "full graph" refers to the ranking or the drawing. | `07.png`, `12.png` (legend titles); transcript step 6 and "What confused me": "Small worry: the legend still shows the PageRank range of the full graph" |
| 2   | 1        | understanding | Nothing in the Filters list says how two steps that are both on combine (and, or). Dev kept both steps and noticed he did not know; a later reader who turns both on cannot tell what the drawing means without trying. Did not affect the task. | transcript "What confused me": "I didn't check whether two steps that are both on combine with 'and' or 'or'"; `13.png` (two steps, no word on how they combine) |
| 3   | 0        | cosmetic      | After the untick the 8 step's row keeps a gray fill although its editor is not open (the key's known note); Dev was not misled.                                                                                                                | `13.png` (second Filters row shaded)                                                                                                           |

Problem 1 is the key's known "full graph" note; this session is one more participant who wondered
about it without being misled. Problem 2 is new in this session and has one participant so far.
