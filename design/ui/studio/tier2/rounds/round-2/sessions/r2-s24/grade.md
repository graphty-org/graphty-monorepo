# Grade: session r2-s24 -- Nadia (returning), Les Miserables (T17 B), only the strong ties

**Grade: S** (success) on the prompt. The drawing narrowed to the pairs sharing 5 or more
chapters, the count was read from the screen, and every character was brought back. `08.png`
shows the header chip "26 of 77 nodes", the Filters row "shared_chapters is at least 5" over "77 to
26 nodes" with its box ticked, and the Overview "Nodes showing 26 of 77", "Edges showing 51 of 254".
Nadia answered 26 characters (51 ties), which is the key's answer. The last screen (`13.png`) shows
the chip gone, Overview Nodes 77, Edges 254, and the row "shared_chapters is at least 8" over "off":
every character is back. She took the Filters "+" door ("Add filter step"), which the key accepts.

**Follow-up: answered right, but not a clean second-time measure.** She answered 17 characters (19
ties), the key's answer (`12.png`: chip "17 of 77 nodes", row "77 to 17 nodes", "Nodes showing 17
of 77", "Edges showing 19 of 254"), and brought everyone back (`13.png`). She edited the step,
pressed "Save and turn on", and unticked once: she did not fall into the known trap of ticking
after saving. However, `session.json` records the follow-up as given at 03:14:35Z, after the last
screenshot (`13.png`, 03:14:23Z), and the transcript's own session note says the follow-up "is in
the task text". So the participant knew the follow-up before saying the prompt was done, against
the task's rule that it is given only then. The transcript's line "Moderator follow-up, given word
for word" at `09.png` is therefore not what happened. This does not change the prompt's grade (the
prompt was answered from `08.png` and `09.png` before any follow-up step), and it is not a tool
failure, so the session is not void; but the follow-up result should not be counted as an unprimed
second attempt.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `lesmis-ranked.txt` (Les Miserables, PageRank run, sized and colored by
it); `work-start.json` matches.

## The answer against the key

- **Count (right).** 26 of 77, read from the chip, the Overview's "showing" rows and the Filters
  row (`08.png`). Not `read-wrong`: she did not give 77, and she read "The counts below are for
  the whole graph" correctly.
- **Narrowed by the right attribute (right).** `shared_chapters`, "at least", 5 (`06.png`,
  `07.png`). Not `wrong-attribute`; not selection in place of a filter (the chip appears).
- **Back (right).** Unticking the step's checkbox (`09.png`, `13.png`); the key accepts it.
  `work.json` end state: one step, `step-1 off`, rule `data.shared_chapters` min 8; runs, layers
  and sources the same as at the start. Nothing lost.
- **Follow-up (right, primed).** 17 of 77, 19 ties, as the key; brought back (`12.png`,
  `13.png`).

## Measures

- **Steps:** 12 `real.mjs` steps after the start (`02.png` to `13.png`) for prompt and follow-up
  together; 11 that did something, since the click at `05.png` was refused by the tool as
  ambiguous and changed nothing. The prompt took 8 (to `09.png`), against the key's 6-step Data
  route; the extra are reading the Data page first and the refused click.
- **Wrong turns:** 0. Every move went forward; the refused click was a duplicate accessible name
  (problem 5), not a wrong place.
- **False "done":** none. "Done" at `09.png` and `13.png` is true on screen. truth_on_screen:
  holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Reran PageRank:** no. **Read "on 77 nodes" as the count drawn:** no, but she was unsure
  whether the ranking had been redone (problem 2).
- **Fell into the tick-after-save trap:** no.
- **Implementation issues seen:** none. No error, freeze, failed request or wrong value on any
  screen; every value matches the key.
- **Build-decided:** no. **Void:** no.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                         | Evidence                                                                                              |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Showing only part of the network lives only under Data's "Filters". Nadia went to Data to read the column name and found "Filters" by chance; from the Graph view and the toolbar she would not have known where to look.                                       | `01.png`, `02.png`; transcript end: "from the Graph view I would not have known to look there"        |
| 2   | 1        | comprehension   | While the step is on, the key titles read "Size: PageRank on 77 nodes" and "Color: PageRank on 77 nodes" with 26 (then 17) drawn. She was unsure whether the ranking had been redone for the smaller picture and guessed not; it did not change her answer.     | `08.png`, `12.png` legend; transcript end: "QA would ask"                                              |
| 3   | 1        | comprehension   | The step's checkbox does not say what it does before it is used: she was not sure it meant "off" rather than "select" until the row's second line changed to "off".                                                                                           | `08.png`, `09.png`; transcript end: "I would not have been sure the box wasn't 'select'"              |
| 4   | 1        | feedback        | The New filter step editor shows no count of what the step would keep before "Add step"; she pressed Add step to find out. Known on this build.                                                                                                                | `07.png`                                                                                              |
| 5   | 1        | accessibility-name | The attribute list's option "shared_chapters" and the Attributes tree row "shared_chapters" share one accessible name; the tool refused the click and nothing happened. Cost one step; a pointer user would not hit it, but a screen-reader user hears two identical names. | `05.png` (unchanged screen); transcript step at `04.png`                                              |
| 6   | 0        | study protocol  | The follow-up was known to the participant before the prompt was declared done (`session.json` followUp time after `13.png`; transcript session note). Not a product problem; it makes the follow-up an unprimed measure no longer.                                 | `session.json` `followUp` 03:14:35Z; `13.png` written 03:14:23Z; transcript closing note              |

No severity 3 or 4: both answers were right, nothing was lost, and every doubt was about where the
control lives or what a word means on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
