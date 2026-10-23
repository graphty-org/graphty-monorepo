# Grade: session r4-s22 -- Ruth (tier 1 graduate), Les Miserables (T17 B), only the strong ties

**Grade: S** (success). Both parts of the task and both parts of the follow-up are met. At 5 or
more shared chapters Ruth answered "26 characters (51 ties) remain", which is the key's value:
chip "26 of 77 nodes, 51 of 254 edges", Filters row "77 to 26 nodes, 254 to 51 edges", Overview
"Nodes showing 26 of 77" (`07.png`). She brought everyone back by unticking the step (`08.png`:
Overview Nodes 77, Edges 254, no chip, row "off"), a route the key accepts. On the follow-up (8 or
more) she answered 17 characters (19 ties), again the key's value (`11.png`), and the last screen
(`12.png`) shows the whole graph back: Overview Nodes 77, Edges 254, no count chip in the header,
the rule "shared_chapters is at least 8" kept in the list and marked "off" with its box unticked,
and the full drawing.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (Les Miserables, PageRank run, sized and
colored by PageRank, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count at 5 or more (right).** 26 of 77 characters, read as the node count, not the edge count
  (51). Ruth named both and kept them apart, so no `read-wrong`. Her dot count ("about 25, one
  probably hidden") matches the key's note that two dots near 640,372 overlap, and she trusted the
  three agreeing counts over her eye.
- **Everyone back (right).** `08.png`: untick of "Apply step: shared_chapters is at least 5";
  Overview Nodes 77, Edges 254, chip gone, legend no longer says "full graph".
- **Follow-up at 8 or more (right).** `11.png`: chip "17 of 77 nodes, 19 of 254 edges", row "77 to
  17 nodes, 254 to 19 edges", Overview "Nodes showing 17 of 77". She edited the existing step
  (row click, Value 8, "Save and turn on") and did not fall into the trap of ticking the box after
  saving: she read the box as already ticked and unticked it only to bring everyone back.
- **Everyone back after the follow-up (right).** `12.png` as above.
- **Work kept.** `work.json`: runs, layers and sources at the end equal the start (one PageRank
  run, three style layers, Les Miserables); one new step, `step-1 off` (range on
  `shared_chapters`, min 8). Nothing gone.

## Measures

- **Door used:** the canvas toolbar's Filters tool (funnel at 833,863), which the key accepts like
  the Filters "+". The Data page's attribute route was not used.
- **Steps, first prompt:** 7 `real.mjs` steps after the start (`02.png` to `08.png`): hover the
  funnel, Filters, Attribute, shared_chapters, Value 5, Add step, untick. The success path is 7 (A
  path through the Data page); the toolbar door is 6 without the hover. Within 2x.
- **Steps, follow-up:** 4 (`09.png` to `12.png`): open the row, Value 8, Save and turn on, untick.
  The follow-up's success path is 4. Meets the target (<= path + 1).
- **Wrong turns:** 0 on the first prompt, 0 on the follow-up. The hover was exploration and
  changed nothing.
- **False "done":** none. "Everyone is back. Done." (step 7) is true on `08.png`; the end claims
  (26 of 77, 17 of 77, everyone back both times) are true on `07.png`, `11.png`, `12.png`.
  truth-on-screen: holds.
- **Silent commit:** none. Each action changed the drawing, the chip, the row and the Overview.
- **Numbers that disagree:** none. Chip, row and Overview agree on every screen.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot; `leaks.json` shows no
  leaks over 30 calls.
- **Scripted exit:** not applicable; Ruth finished both prompts.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                       | Evidence                                                                                              |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback        | The step editor shows no count of what the rule would keep before "Add step", so finding the right cut takes a commit and a read for every value tried.                                       | `06.png` (Value 5, "Add step" enabled, no preview); transcript step 5 and end: "No count before I commit" |
| 2   | 1        | discoverability | Nothing on a Filters row says a click opens its editor; Ruth guessed it would.                                                                                                                | `08.png` (row with no edit cue); transcript step 8 and end: "nothing on the row says so"             |
| 3   | 1        | discoverability | The step's on/off control is a small unlabeled checkbox at the end of the row; its name "Apply step: ..." is not shown on screen. Found only because it was the one control there.          | `07.png`, `08.png`, `12.png` (checkbox at about 273,335); transcript end                              |
| 4   | 1        | capability      | Editing a step replaces it; there is no way to copy a rule to keep the 5 and the 8 versions side by side.                                                                                     | `12.png` (one step, "at least 8"; the 5 version gone); transcript end                                 |
| 5   | 1        | content         | No names are drawn on the dots, so which characters remain cannot be read from the screen. Not asked by the task; noted for a later need ("for print I would need the list").                | `07.png`, `11.png`; transcript end                                                                    |

All problems rest on one participant and are not confirmed by this session alone. Problem 1 is an
opinion held one level down (it cost no step here). Ruth is a simulated returning user briefed on
earlier sessions; a pass is weak evidence until real people confirm it.
