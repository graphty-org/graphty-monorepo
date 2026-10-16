# Grade: session r3-s34 -- Grace (tier 1 graduate, returning), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), on the prompt and on the follow-up. At 5 or more shared chapters Grace
narrowed the drawing with a filter step "shared_chapters is at least 5" and gave 26 characters
(51 of the 254 ties), read from the chip "26 of 77 nodes", the Filters row "77 to 26 nodes" and the
Overview "Nodes showing 26 of 77", "Edges showing 51 of 254" (`07.png`). The key's answer is 26
joined by 51 ties. She brought every character back by unticking the step (`08.png`). On the
follow-up she opened the same step, changed 5 to 8 and pressed "Save and turn on": chip "17 of 77
nodes", row "77 to 17 nodes", Overview "Nodes showing 17 of 77", "Edges showing 19 of 254"
(`10.png`). She gave 17 characters (19 ties), as the key has, and unticked once to bring everyone
back. She did not fall into the follow-up trap (ticking after "Save and turn on"). The last screen
(`11.png`) shows the whole graph: no chip in the top bar, the row "shared_chapters is at least 8 /
off" with its box empty, the Overview at Nodes 77, Edges 254 with no "showing" rows, and the legend
titles back to plain "Size: PageRank" and "Color: PageRank".

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (the Les Miserables sample opened,
PageRank run, size and color by PageRank), as T17 B names. Tool commit `acf3894e2c56`, no
uncommitted changes.

## The answer against the key

- **Prompt, 5 or more (right).** 26 characters, 51 ties: `07.png`, all three places the key
  names, and they agree.
- **Not a wrong reading.** She did not give 77 (the "Full graph" Nodes row in `07.png`) as "still
  in it". She read "PageRank, full graph" as "the ranking was not recalculated on the smaller
  picture", the right meaning, and did not rerun PageRank.
- **Back (right).** Unticked "Apply step: shared_chapters is at least 5" (`08.png`); the key
  accepts this.
- **Follow-up, 8 or more (right).** 17 characters, 19 ties (`10.png`), matching the key. Back by
  one untick (`11.png`).
- **work.json agrees.** End state: one run (`pagerank PageRank (label Influence)`), the three
  starting layers, no notes, one filter step
  `step-1 off {"kind":"range","attribute":"data.shared_chapters","min":8,"nodes":"ends"}` ("off" is
  its state), source Les Miserables, nothing gone.

## Measures

- **Steps:** 10 `real.mjs` steps after the start (`02.png` to `11.png`): 7 for the prompt and 3
  for the follow-up. The key's success path is 8 for the prompt (attribute menu door) and 5 for
  the follow-up; she used the Filters "+" door, which the key accepts. Follow-up within the
  "success path + 1" target, with 0 wrong turns.
- **Wrong turns:** 1. Hovered the bottom toolbar's Layout button (`02.png`), looking for a way to
  narrow the drawing from the Graph place, before going to Data.
- **False "done":** none. Both "done" claims are true on screen (`08.png`, `11.png`).
  truth-on-screen: holds.
- **Follow-up trap ("Save and turn on" then tick):** not fallen into.
- **Reran PageRank or read "full graph" as what is drawn:** no.
- **Counted dots:** no; every number came from the chip, the row and the Overview.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks and no calls.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                       | Evidence                                                          |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | 2        | discoverability | Nothing on the Graph place names narrowing the drawing; the Filters section is only in Data. One wrong turn (the Layout button) before she guessed Data.                                                       | `01.png`, `02.png`, `03.png`; transcript steps 1 to 3 and end     |
| 2   | 1        | feedback        | Saving an edited step replaces the old rule ("at least 5" became "at least 8") with nothing on screen saying the earlier version is gone; comparing the two would mean building the step again.              | `09.png`, `10.png`; transcript step 11 and end                    |
| 3   | 1        | target-size     | The step's checkbox is small and sits at the very right edge of the Filters row.                                                                                                                              | `07.png`, `10.png` (box near 274,327); transcript end             |
| 4   | 1        | comprehension   | Under the filter, the legend reads "PageRank, full graph" with the whole graph's range; nothing says whether "full graph" means the ranking or the drawing. She read it correctly. Known on this build.       | `07.png`, `10.png` legend                                         |

No severity 3 or 4: both answers were right, both returns to the whole graph worked, and the
problems she met cost one wrong turn.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
