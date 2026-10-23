# Grade: session r3-s39 -- Nadia (returning), running club (T17 A), only the strong ties

**Grade: S** (success). Both answers are right and the whole club is back on the last screen.
At 4 or more runs together Nadia reported 19 people (and 12 pairs); the screen read the header
chip "19 of 20 nodes", the Filters row "weight is at least 4" over "20 to 19 nodes", and the
Overview "Nodes showing 19 of 20", "Edges showing 12 of 41" (`07.png`), as the key gives. She
brought everyone back by unticking the step (`08.png`: row "off", chip gone, Overview Nodes 20,
Edges 41). On the follow-up (5 or more) she reported 10 people and 5 pairs; the screen read chip
"10 of 20 nodes", row "weight is at least 5" over "20 to 10 nodes", "Nodes showing 10 of 20",
"Edges showing 5 of 41" (`10.png`), as the key gives. The last screen (`11.png`) shows the step
unticked with its row "weight is at least 5" over "off", no chip, and the Overview at Nodes 20,
Edges 41: the whole club is back.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: `friends.csv` loaded, PageRank run and drawn as size and color
(setup in session.json; `work-start.json` one run, three layers, no steps). Tool commit
`acf3894e2c56`, no uncommitted changes. `leaks.json` shows no leaks.

## The answer against the key

- **At 4 or more (right).** 19 of 20 people, 12 ties (`07.png`). She read the count in all three
  places the key names and said so.
- **Back (right).** Untick of "Apply step: weight is at least 4" (`08.png`), one of the accepted
  ways back.
- **Follow-up at 5 or more (right).** 10 of 20, 5 ties (`10.png`). She opened the existing step
  by its row (`09.png`: header "weight is at least 4", "Filter step Off", button "Save and turn
  on"), set 5 and pressed "Save and turn on", which saved the value and turned the step on.
- **The trap: not fallen into.** She did not tick the checkbox after saving; her one untick came
  after reading 10, and it brought the club back (`11.png`). Not `read-wrong`.
- **Door.** She used the Filters "+" door (Add filter step, Attribute, weight, at least, 4), which
  the key accepts as equal to the attribute menu's "Filter to...".
- `work.json` agrees: at the end one step, `step-1 off {"kind":"range","attribute":"data.weight","min":5,"nodes":"ends"}`;
  the run and the three layers unchanged; nothing gone.

## Measures

- **Steps:** 7 `real.mjs` steps on the first ask (`02.png` to `08.png`), the success path's 8 or
  so (one combined command for Value, 4 and Add step). Follow-up: 3 steps (`09.png` to `11.png`),
  against the follow-up success path's 4; within the target of path + 1.
- **Wrong turns:** 1 on the first ask, 0 on the follow-up. Step 1, a click on "Everything" in the
  Graph list (`02.png`), opened the bottom style layer, not a way to narrow the drawing; she left
  it at once for Data. Not a broken habit: "Everything" is not a place her history names.
- **False "done":** none. Each "Done" was said with the screen showing the club back (`08.png`,
  `11.png`). truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Add step and Save and turn on each changed the drawing, the chip, the
  row's second line and the Overview at once.
- **Numbers that disagree:** none. Chip, row and Overview agree on both thresholds.
- **Re-ran PageRank or asked what is out of date:** asked, did not rerun. She saw "Size: PageRank,
  full graph" (`07.png`, `10.png`) and said she would want to know whether the sizes ignore the
  filter (problem 2).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot.
- **Scripted exit:** not applicable; she finished both asks.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                       | Evidence                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The Graph place, where she started, offers no way to narrow the drawing. Its list ("Selection", "PageRank", "Everything") made "Everything" read as where "parts of the network" live; it opens the bottom style layer. Filters are reachable only from the Data place.                 | `01.png`, `02.png`; transcript steps 0 and 1: "'Everything' ... maybe that's where the parts live"          |
| 2   | 1        | comprehension   | Under a filter the key titles read "Size: PageRank, full graph" and "Color: PageRank, full graph". She took it to mean the sizes were not recalculated but could not be sure, and would have to ask before using the picture in her alert file.                                         | `07.png`, `10.png`; transcript step 6 and end: "I'd still want to know whether the legend's 'full graph' means the sizes ignore the filter" |
| 3   | 1        | comprehension   | The "Everything" layer's Fill shows color 6366F1 (a blue-violet swatch) while every node is drawn orange by the PageRank layer above it; nothing on the panel says this layer's color is covered. Not raised by the participant; seen by the grader.                                    | `02.png`                                                                                                  |
| 4   | 1        | legibility      | Two pairs of dots overlap at the bottom of the drawing (about 567,758 / 583,753 and 717,745 / 735,744), so a count by eye comes out short. She noticed and trusted the counts instead; the answer was not affected.                                                                   | `07.png`, `10.png`; transcript step 9: "Two of the dots at the bottom overlap, so I'm trusting the count over my eyes" |

No severity 3 or 4: both counts were right, the whole club came back both times, and the
follow-up took three steps with no wrong turn.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
