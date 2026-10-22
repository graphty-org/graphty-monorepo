# Grade: session r3-s40 -- Tom (tier 1 graduate, returning), Les Miserables (T17 B), only the strong ties

**Grade: S** (success) on the prompt; the follow-up is right too. Tom's answer, "At 5 or more
shared chapters, 26 of the 77 characters are left (51 of 254 ties)", matches the key: 26 of 77
characters, joined by 51 ties. He brought every character back by unticking the step, which the
key names as a right way back. Follow-up: "At 8 or more, 17 characters are left (19 ties)",
matching the key's 17 of 77 and 19 of 254, and again brought back by one untick.

Last screenshot (`14.png`): the whole network drawn again; the header chip is gone (only "Local
only" beside the title); the Filters row reads "shared_chapters is at least 8" over "off" with its
checkbox empty; the Graph's Overview reads Nodes 77, Edges 254, Direction "Undirected, from the
file", Density 0.08681, Components 1, Edges per node "1 to 36, mean 6.597"; the legend titles are
plain "Size: PageRank" and "Color: PageRank". `work.json` end: the PageRank run and its three
layers kept, one step `step-1 off` with rule `data.shared_chapters` min 8; nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `lesmis-ranked.txt` (`01.png`).

## The answer against the key

- **Prompt count (right).** 26 of 77, read where the key says it can be read: chip "26 of 77
  nodes", Overview "Nodes showing 26 of 77" and "Edges showing 51 of 254", and the row's second
  line "77 to 26 nodes" (`09.png`). Tom named all three and checked that they agree.
- **Back (right).** He unticked "Apply step: shared_chapters is at least 5" (`10.png`): full
  drawing, Overview Nodes 77 and Edges 254, chip gone, row "off".
- **Follow-up (right).** He opened the step's row, replaced 5 with 8 and pressed "Save and turn
  on" (`11.png` to `13.png`): chip "17 of 77 nodes", row "77 to 17 nodes", Overview "Nodes showing
  17 of 77", "Edges showing 19 of 254" -- the key's values. He then unticked once (`14.png`).
- **The trap (ticking after "Save and turn on").** Not met: he read the result before touching the
  checkbox, so his single tick after saving was the one that brings everyone back.
- **Rerun of PageRank or reading "full graph" as what is drawn.** Neither. He did not comment on
  the legend's "full graph" wording.
- **Dot count overlap.** Not met: he read the counts from the panels, never from the drawing.

## Measures

- **Steps:** prompt, 9 screenshots after the start to the restore (`02.png` to `10.png`). The key's
  success path (Data, attribute row, Attribute actions, Filter to..., Value, Add step, untick) is 7;
  he took the other door the key accepts (Filters "+", Attribute, shared_chapters, Value, Add step),
  which costs one step more than the menu route, plus two wrong turns. Follow-up, 4 screenshots
  (`11.png` to `14.png`): click the row, type 8, Save and turn on, untick -- exactly the key's
  follow-up path; the follow-up target (success path + 1, 0 wrong turns) is met.
- **Wrong turns:** 2, both before he found filtering. (1) A click on "Everything" in the Graph tree
  (`02.png`), which opened the style of every node, not a way to drop ties. (2) A hover on the
  bottom toolbar's chart icon (`03.png`), tooltip "Layout", looking for the same thing. The third
  try, Data, led straight to the Filters "+".
- **Broken habit:** his history names the flask (analysis) button; he did not use it here and
  nothing he remembered sent him wrong. The wrong turns came from no visible word on the Graph
  page or the toolbar pointing at filtering.
- **False "done":** none. Both "done" claims named the right count, and each restore holds on
  screen (`10.png`, `14.png`). His wrap-up claims hold: the step "stays in the list marked 'off'"
  (`10.png`, `14.png`); the form "read like a sentence" with a note "Keeps edges that pass and the
  nodes at their ends" (`07.png`, per the transcript; the note is the key's wording for this
  build); "Full graph" lists Components 1 while two clumps are drawn under the step (`13.png`).
  truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. "Save and turn on" says what it does before it is pressed.
- **Numbers that disagree (bar 5):** none on this build's terms: chip, Overview and row agree on
  both thresholds. The "Full graph" block's Components 1 next to a drawing in two clumps is the
  whole graph's count under its own heading, not a disagreement, but it made Tom stop (problem 2).
- **Earlier work:** `work.json` lists nothing gone; the PageRank run and its layers are kept and
  the legend returns to plain "PageRank" once the step is off.
- **Build-decided:** no. Every control behaved as the key describes this build.
- **Void:** no. Every step printed its screenshot; `session.log` is empty (no script, console or
  request errors); `setup.log` is empty; `leaks.json` lists no leaks; the follow-up was given by
  the tool at the first `--end` (session.json `followUp`).

## Problems

| #   | Severity | Kind        | Problem                                                                                                                                                                                                                                                                  | Evidence                                           |
| --- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | 2        | findability | Nothing on the Graph page or the bottom toolbar leads to filtering: Tom tried "Everything" (style of every node) and the toolbar's chart icon (Layout) before trying Data, a page his history never named. Two wrong turns before the first useful step.                 | `02.png`, `03.png`, `04.png`; wrap-up              |
| 2   | 1        | feedback    | Under a step the Overview shows only "Nodes showing" and "Edges showing"; the rest (Components 1, Density, Edges per node) is the whole graph's under "Full graph". With two separate clumps drawn, Components 1 made Tom look twice before he worked out whose count it was. | `13.png` (also `09.png`); transcript step 14; wrap-up |
| 3   | 1        | wording     | The attribute is shown by its column name, "shared_chapters", in the list, the form and the step's row. Tom read it as "computer-ish but clear enough"; it cost no step.                                                                                                  | `06.png`, `09.png`; wrap-up                        |

No severity 3 or 4: both answers were right and both restores complete. None is an
implementation fault of the build; all three are design questions on screens the key describes
for this build.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
