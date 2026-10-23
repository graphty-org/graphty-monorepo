# Grade: session r5-s16b -- Tom (lab manager, tier 1 graduate), Les Miserables (T17 B), only the strong ties

**Grade: S** (success) on both the first prompt and the follow-up. The last screen (`11.png`)
shows the whole graph back. The Overview reads Nodes 77 and Edges 254, with no "showing" rows. The
header has no count chip. The legend titles read plain "Size: PageRank" and "Color: PageRank". The
Filters row reads "shared_chapters is at least 8" over "off", with its checkbox unticked. Tom
answered **26 characters** for 5 or more shared chapters and **17 characters** for 8 or more. Both
match the answer key, and he read both from the screen.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900. Start: the Les Miserables ranked setup (PageRank run, nodes sized and
colored by PageRank). Tool commit `0340fb332c5e`, no uncommitted changes. There are 11 screenshots
for 10 steps plus the start, and `leaks.json` shows no leaks over 26 calls. The tool ran cleanly,
so this is not a VOID.

## The answer against the key

- **First prompt, count (right).** `06.png` shows the chip "26 of 77 nodes, 51 of 254 edges". The
  Filters row reads "shared_chapters is at least 5" over "77 to 26 nodes, 254 to 51 edges". The
  Overview reads "Nodes showing 26 of 77" and "Edges showing 51 of 254". Tom reported 26 characters
  and gave 51 as the count of ties, not people. No `read-wrong`.
- **First prompt, back (right).** In `07.png` the step's checkbox is unticked, the Overview reads
  Nodes 77 and Edges 254, the chip is gone, and the row reads "off". The key accepts the untick.
- **Follow-up, count (right).** `10.png` shows the chip "17 of 77 nodes, 19 of 254 edges", the row
  "77 to 17 nodes, 254 to 19 edges", the Overview "Nodes showing 17 of 77", and the checkbox ticked.
  Tom edited the existing step, which is the key's follow-up path: click the step's row, select the
  Value and type 8, then "Save and turn on".
- **The trap (not fallen into).** After "Save and turn on", Tom did not tick the box to switch the
  step on. He read the count with the step already on, then unticked once to bring everyone back
  (`11.png`).
- **Door.** The canvas toolbar's Filters tool (the funnel at about 833,863). This is the third door
  the key accepts. Tom picked it by its shape, with no hover.
- **Work kept.** `work.json` shows the PageRank run, the three style layers and the source
  unchanged from start to end. One filter step was added and left off (`step-1 off`, rule
  shared_chapters at least 8). Nothing is gone.
- **Legend.** Tom did not comment on "PageRank, full graph" and did not rerun PageRank.

## Measures

- **Steps, first prompt:** 6 (click Filters, open Attribute, pick shared_chapters, Value 5, Add
  step, untick). The key's success path is 7, so this is within it.
- **Steps, follow-up:** 4 (click the step's row, Value 8, Save and turn on, untick). The follow-up
  success path is 4, which is within the target of the path + 1.
- **Wrong turns:** 0 on the first prompt and 0 on the follow-up.
- **False "done":** none. Both "done" claims are true on screen: 26 and everyone back
  (`06.png`/`07.png`), and 17 and everyone back (`10.png`/`11.png`). truth-on-screen holds.
- **Numbers that disagree:** none. The chip, the row and the Overview agree at both thresholds.
- **Ease (from the transcript):** 6 of 7. It was not used for the grade.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                               | Evidence                                                                 |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 1        | discoverability | The canvas toolbar is all unlabeled icons. Tom found Filters by guessing from the funnel shape.                                                                                                                         | `01.png`; transcript, 01.png and "What confused me"                      |
| 2   | 1        | language        | The attribute is offered only by its file name, "shared_chapters" (with an underscore). Tom worked out the meaning himself.                                                                                            | `03.png`, `04.png`; transcript, "What confused me"                       |
| 3   | 1        | input           | In the reopened step's editor, the Value box still holds 5, and typing does not replace it. Tom selected the text first (Control+A) because he expected typing to append and give 58.                                  | `08.png`, `09.png`; transcript, step 7 and "What confused me"            |
| 4   | 1        | feedback        | With the step off, the header chip simply disappears. Nothing in the header says the whole graph is showing, so Tom confirmed it from the Overview's 77.                                                               | `07.png`, `11.png`; transcript, "What confused me"                       |

No problem affected the outcome, and each one is cosmetic (severity 1). Problem 3 is an
expectation: the screens do not show what plain typing would have done, because Tom selected the
text first.
