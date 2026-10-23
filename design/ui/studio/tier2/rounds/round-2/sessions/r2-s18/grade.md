# Grade: session r2-s18 -- Ruth (returning), Les Miserables (T17 B), only the pairs who share 5 or more chapters

**Grade: S** (success). The drawing narrowed to the strong ties, the count came off the screen and
was right (26), and every character came back. `08.png`: header chip "26 of 77 nodes", Filters
row "shared_chapters is at least 5" over "77 to 26 nodes" with its checkbox ticked, Overview
"Nodes showing 26 of 77", "Edges showing 51 of 254". Ruth said "Answer: 26 characters" and named
all three places. The last screen (`12.png`) has everyone back: no chip, the row reads
"shared_chapters is at least 8" over "off" with its checkbox clear, Overview Nodes 77, Edges 254,
the legend titles back to plain "Size: PageRank" / "Color: PageRank". `work.json` agrees: the run
and its three layers kept, one step `step-1 off` (range on `data.shared_chapters`, min 8), nothing
gone.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `lesmis-ranked.txt`; `01.png` is the start the setup should leave (Les
Miserables, PageRank run, sized and colored by it), so the start counts.

Why S and not SD: the only detour (steps 05 and 06) came from how the tool resolved a click by
name (see "Tool events"), not from the product leading Ruth astray, and it cost two steps with no
wrong belief. Everything else went straight to the answer.

**Run deviation (does not change the grade, does limit the follow-up's evidence).** The follow-up
work (`10.png` to `12.png`, 03:08:41 to 03:09:04 UTC by file time) was done before the tool gave
the follow-up (`session.json`: "followUp": "given 2026-10-10T03:09:18"). The transcript says the
first `--end` "printed the follow-up prompt, already done in steps 10-12". The folder has no
`briefing.md`. So the participant had the follow-up's words before the tool released them, most
likely from `tasks.md`. The main task is graded as normal: its prompt is the one the participant
would have had anyway, and nothing suggests it saw the answer key (it took the "+" door and
misfired once on the attribute list). The follow-up's outcome should not count as evidence about
the "Save and turn on" trap, since the edit was planned before it was asked. This is the same
deviation as the running-club session r2-s19 in this round; whoever briefs participants should
use `real.mjs --brief` and nothing else.

## The answer against the key

- **Count (right).** 26 of 77, joined by 51 ties: chip, the Filters row's second line and the
  Overview "showing" rows all read so (`08.png`), and Ruth quoted all three.
- **Not a wrong reading.** Ruth read "Nodes 77" and "Components 1" under the "showing" rows as the
  whole graph's, from the line "The counts below are for the whole graph"; never gave 77.
- **Back (right).** Unticked the step ("Apply step: shared_chapters is at least 5", `09.png`):
  Nodes 77, Edges 254, the row "off", chip gone. Repeated after the follow-up (`12.png`).
  Unticking is one of the key's accepted ways back.
- **Follow-up (right, see the deviation above).** Opened the step's row (`10.png`, editor with
  "Off" and "Save and turn on"), changed 5 to 8 and pressed "Save and turn on" (`11.png`): chip
  "17 of 77 nodes", row "77 to 17 nodes", Overview "Nodes showing 17 of 77", "Edges showing 19 of
  254" -- the key's values. Ruth said 17. She counted 16 dots and named two stacked dots near the
  middle-left as the likely cause; the key records exactly that overlap (about 640,372 / 643,368),
  so the short dot count is the drawing, not a misreading, and she stated the readouts' 17, not
  her count. Then one untick brought everyone back. Did not fall into the trap (ticking after
  "Save and turn on").
- **Legend.** Read "PageRank on 77 nodes" as the ranking still being over everyone; did not rerun
  PageRank, did not read 77 as the number drawn.

## Measures

- **Steps:** main task 8 `real.mjs` steps after the start (`02.png` to `09.png`) including the way
  back, against the key's 7 (Data, then the "+" door's Add filter step, Attribute, shared_chapters,
  Value, Add step, untick): about 1.1x. The extra steps are the attribute misfire and its redo.
  Follow-up 3 steps (`10.png` to `12.png`) against the key's 4 (Ruth combined the value edit and
  "Save and turn on" in one step), 0.75x.
- **Wrong turns:** 1 (step 05: "shared_chapters#2" landed on the Attributes tree row, not the open
  dropdown's option, which closed the half-filled form and opened the attribute's own summary;
  recovered in step 06 to 07). Caused by the tool's resolution of the name, see "Tool events".
- **Door:** the Filters "+" ("Add filter step"), then Attribute, Edges / shared_chapters, "at
  least", 5 -- the other door the key accepts.
- **False "done":** none. Every "done" matched the screen at that moment (`09.png`, `11.png`,
  `12.png`).
- **First move:** the Data place, looking for "where the numbers live"; it led straight to Filters.

## Problems

| Severity | Problem | Evidence |
| -------- | ------- | -------- |
| 2 | While a step is on, the Overview lists "Components 1" (and Nodes 77, Edges 254, Density) for the whole graph just under "Nodes showing 17 of 77", over a drawing visibly in two pieces. Only the line "The counts below are for the whole graph" stops the reader from taking it as the filtered view; Ruth "read it twice". Also seen in r2-s19 (running club), so confirmed at two participants. | `11.png`; transcript step 11 and debrief |
| 2 | A click anywhere outside the New filter step form (here on the same attribute's row in the Attributes tree) throws away the half-filled form with no warning or way back; the right side switches to the attribute's summary. Ruth lost the form and redid two steps. The trigger was a tool misclick, but a person who clicks the left-hand "shared_chapters" while the form is open meets the same loss. | `04.png` against `05.png`; transcript step 05 and debrief |
| 1 | Nothing on the Graph place or the toolbar points to filtering; Ruth found Filters only because she went to Data looking for the numbers. Cost here: none counted. Also raised in r2-s19. | `01.png`, `02.png`; debrief |
| 1 | No place lists which characters a step keeps; for the essay Ruth wanted the 26 (and 17) names and could not check the count against the picture. Outside the question the task asks, so held down a level. | debrief |
| 1 | Two dots near 640,372 sit almost on top of each other, so a dot count comes out 16 of 17 (known on this build). Ruth noticed and relied on the readouts; no wrong answer. | `11.png`; transcript step 11 |
| 0 | Run deviation: the follow-up was in the participant's hands before the tool gave it (no `briefing.md`; follow-up steps time-stamped before "followUp: given"). A study-method problem, not a product one; see above. | file times of `10.png` to `12.png` against `session.json` |

## Tool events

- **Step 05, a click by name landed on a different element than the participant meant.** The
  command `--click "shared_chapters#2"` was meant for the open dropdown's option; the tool resolved
  the second match to the Attributes tree row on the left (`05.png`: that row selected, the right
  side showing the attribute summary). The answer key records the same behavior from an earlier
  pilot ("the tool clicked the tree row"). Not a void: the element it clicked is one a person can
  click, the participant recovered with a click by position in step 07, and the result is
  unaffected. It does mean the detour in steps 05 and 06 says more about the tool's name
  resolution than about the product.
- The first `--end` gave the follow-up and the second closed the session, as the tool's README
  describes. The setup left the expected start; `work.json` recorded start and end.
