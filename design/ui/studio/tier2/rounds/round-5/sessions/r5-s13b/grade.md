# Grade: session r5-s13b -- Elena (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: S** (success, prompt and follow-up). The last screen (`12.png`) matches the answer key's
end state for A: the Filters row reads "weight is at least 5" over "off" with its checkbox clear,
the header chip is gone, the legend titles are back to plain "Size: PageRank" / "Color: PageRank",
the Overview lists Nodes 20 and Edges 41 with no "showing" rows, and every dot and tie is drawn.
Elena stated 19 people at 4 or more and 10 at 5 or more, both read from the screen where the key
says they are shown, and both match the key.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the ranked running-club setup (friends.csv loaded, PageRank run,
nodes sized and colored by PageRank). Tool commit `0340fb332c5e`, no uncommitted changes.

## The answer against the key

- **Prompt, narrowed (right).** `07.png`: chip "19 of 20 nodes, 12 of 41 edges", row "20 to 19
  nodes, 41 to 12 edges", Overview "Nodes showing 19 of 20", "Edges showing 12 of 41" -- the key's
  values for builds after 38e180aac230. The drawing lost 29 ties.
- **Prompt, count (right).** "19 people", read from the chip and the Overview's "Nodes showing";
  not the edge count and not the "Full graph" 20.
- **Prompt, back (right).** Unticked "Apply step: weight is at least 4" (`08.png`); the transcript
  reports Nodes 20, Edges 41 and the row "off", as the key describes.
- **Follow-up, narrowed and count (right).** Clicked the step's row, replaced 4 with 5, pressed
  "Save and turn on" once (`11.png`): chip "10 of 20 nodes, 5 of 41 edges", row "20 to 10 nodes,
  41 to 5 edges", Overview "Nodes showing 10 of 20". Elena answered 10. She did not tick the
  checkbox after saving, so she avoided the trap the key describes.
- **Follow-up, back (right).** One untick of "Apply step: weight is at least 5" (`12.png`).
- **Work kept.** `work.json`: the PageRank run, the three style layers and the source are the same
  at start and end; the only addition is `step-1 off {"kind":"range","attribute":"data.weight",
  "min":5,"nodes":"ends"}` -- the step she made, now off. Nothing gone.

## Measures

- **Door:** the Filters tool on the canvas toolbar (the funnel at about 833,864), the third door the
  key accepts. Hovered it first to read its tooltip, then opened it.
- **Attribute:** chose `weight` under Edges in the Attribute list; the guess was right, but by
  elimination (the only edge column), not because anything tied it to "runs together".
- **Steps:** 7 for the prompt (hover, open Filters, open Attribute, pick weight, type 4, Add step,
  untick) and 4 for the follow-up (open the step, retype 5, Save and turn on, untick). The key's
  success path is 6 plus 4; the extra step is the hover before the first click, a check, not a
  wrong turn.
- **Wrong turns:** 0.
- **False "done":** none. Both "Done" claims (steps 08 and 13) are true on screen (`08.png`,
  `12.png`). truth-on-screen holds.
- **Reruns PageRank / reads "full graph" as what is drawn:** no.
- **Silent commit:** none. "Add step" and "Save and turn on" each changed the drawing, the chip and
  the Overview at once.
- **Numbers that disagree:** none; chip, row and Overview agreed at every step.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. 12 screenshots for 12 actions; `leaks.json` shows no leaks
  over 26 calls.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                                         |
| --- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | understanding | Nothing on screen says what the edge column `weight` holds. The file's third column had no name the reader knew, and the app lists it only as "weight" (also "Loaded weight weight" in the Overview). Elena picked it because it was the only edge column; a file with two numeric edge columns would leave her guessing.                        | `04.png` (Attribute list: Nodes id, Edges weight); transcript step 03-04 and "What confused me": "my sheet never called it that"                                                  |
| 2   | 2        | understanding | At 4 or more only one person drops out, and nothing says who or why; two overlapping dots at the lower left (the known 567,758 / 583,753 pair, whose tie hides behind them) looked to her like two people left in with no tie between them. She trusted the count over the drawing, but could not reconcile them.                                 | `07.png` (two dots at about 567,758 / 583,753, tie not visible); transcript step 07 and "What confused me"                                                                        |
| 3   | 1        | feedback      | While the edited value is unsaved, the step editor's header still names the saved rule ("weight is at least 4" with 5 in the Value box), which made her stop and double-check before saving. Documented in the key as known on this build.                                                                                                        | `10.png`; transcript step 11 and "What confused me"                                                                                                                                |
| 4   | 1        | feedback      | The Filters tool opens a "New filter step" editor with Keep "an attribute's value" and an empty Attribute box; nothing suggests which column to use or shows how many people a value would keep before "Add step". Did not slow her here (one column), but the step is chosen blind.                                                              | `03.png`, `06.png` (no preview count before "Add step")                                                                                                                            |

Problem 2's overlap is the drawing note in the key ("two pairs of dots sit almost on top of each
other"); the grade does not change because the count she stated was read from the screen and is
right.
