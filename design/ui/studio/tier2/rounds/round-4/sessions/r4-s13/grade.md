# Grade: session r4-s13 -- Nadia (tier 1 graduate), running club (T18 A), the fewest people in between

**Grade: S** (success). The main prompt's answer is on screen in `11.png`: Summary "Path 5 nodes,
4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with Analysis "Shortest
path", Ran "Oct 11, 3:08:30 AM", From "Chloe", To "Milo", Follow "All", Weight "None" with "Each
edge counts as 1; "weight" has no meaning set." under it. That is the answer key's only chain of
that length. The last screenshot (`16.png`) holds the follow-up, also right: Ben 1, Theo 2, Ravi 3,
Pia 4, Nora 5, "5 nodes, 4 edges", Ran "Oct 11, 3:09:23 AM", From "Ben", To "Nora", Follow "All",
Weight "None". Both chains were read off the run's Values, not off the drawing (which has no
names), so this is S, not SD. The find-box look-ups before the run (Chloe's and Milo's ties) were
orientation that she used afterward to check the chain (Ava is one of Chloe's ties, Kofi one of
Milo's); they did not lead into a wrong place, as graded for the same pattern in round 2.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, nodes colored and sized
by it, no names drawn, `01.png`). Tool commit `435e878a1d4c`, no uncommitted changes.
`session.log` is empty: no script, console or request errors. `leaks.json`: no leaks over 41 calls.

## The answer against the key

- **Main prompt (right).** `11.png`, as above. Nadia answered "Chloe -> Ava -> Ivan -> Kofi ->
  Milo. Three people in between, four introductions." Names, order and count all match the key.
- **Follow-up (right).** `16.png`, as above. "Ben -> Theo -> Ravi -> Pia -> Nora. Three people in
  between, four introductions." The Ran time changed from 3:08:30 AM to 3:09:23 AM, so the screen
  shows a new run.
- **Known traps not taken.** Weight stayed "None" both times and Follow stayed "All" (no Out run).
  Jada (the main chain's Ivan-Kofi tie passes through her) and Quinn (the follow-up's Ravi-Pia tie
  passes through him) were never named. She did not doubt the chain for running against the drawn
  arrowheads.
- **Work kept.** `work.json`: the end adds one `shortest_path` run (label "Shortest route") and its
  two layers to the start's PageRank run and three layers; nothing gone.

## Measures

- **Steps, main prompt:** 10 `real.mjs` steps after the start (`02.png` to `11.png`). The key's
  count is 4 (5 with typing and picking split). The extra steps: two find-box look-ups for
  orientation (1-2), the analysis button plus a typed filter "path" in place of the `p` key (3-4),
  and From and To each typed then picked in separate steps (6-9). About 2x.
- **Steps, follow-up:** 5 (`12.png` to `16.png`): Analyze, Shortest path under Recent, type Ben,
  pick Ben plus type Nora, pick Nora plus Find path. The second-time target (the follow-up's
  success path + 1) holds; 0 wrong turns on the follow-up.
- **Wrong turns:** 0. Every move led on: the find box gave each end's ties, the analysis button
  (in her history) led to Shortest path, and the Recent entry led straight back to it.
- **Broken habit:** none. Her first move, the find box, is in her history and offered what she
  wanted from it (who each end is tied to); the analysis button, also in her history, led on.
- **False "done":** none. "Done" at step 10 is true on `11.png`; the end claims are true on
  `11.png` and `16.png`. truth-on-screen holds.
- **Silent commit (bar 4):** one. The second Find path replaced the first chain on the drawing,
  in the left list (still one "Shortest path 4 hops" row) and in the Values, with no message
  (`16.png`). The answer key documents this behavior. Nadia noticed and had already written the
  first chain down, so no answer was lost.
- **Numbers that disagree (bar 5):** none. "4 hops" and "5 nodes, 4 edges" agree; Nadia worked out
  that 4 edges are 4 introductions herself.
- **Wrong weight reading without a sign (bar 7b):** no; she read "Each edge counts as 1" as the
  fewest people and left Weight at None.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot. The first `--end`
  delivered the follow-up prompt, as the protocol intends; the second `--end` closed the session.
- **Scripted exit:** not applicable; she finished.
- **Participant priming:** none found. The briefing says she has never had the program work out a
  chain; "path" was her own word in the filter.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                  |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The analysis list opens on Recent (PageRank) and "Rank nodes and edges" (Degree, Betweenness, Edge betweenness, Closeness, ...) with nothing in view about how two nodes are linked. Nadia found Shortest path only by typing her own word, "path", into the filter. A user who scans sees only rankings. | `04.png` (the list as it opens); `05.png` (after "path"); transcript end: "I would never have found it from the analysis list as it first opens" |
| 2   | 2        | silent-replace  | The second Shortest path run replaced the first chain on the drawing, in the left list and in the Values with no message. Nadia had written the first chain down; she said she would otherwise have had to screenshot it before the second run.                                                 | `16.png` (one "Shortest path 4 hops" row; only Ben to Nora shown); transcript step 15 and end                             |
| 3   | 1        | wording         | The left list says "4 hops"; the Values say "5 nodes, 4 edges". Neither is the task's word (introductions, people in between). Nadia read them correctly but had to work out that 4 edges are 4 introductions, and "hops" left her unsure ("one hop from what?").                                  | `11.png`, `16.png`; transcript end                                                                                        |
| 4   | 1        | comprehension   | The Path form's Follow "Out / All" and the Weight line ("weight" has no meaning set) made her stop and think; she kept the defaults because "each edge counts as 1" sounded like the fewest people. No wrong setting resulted.                                                                    | `06.png`, `10.png`; transcript end                                                                                        |
| 5   | 1        | legibility      | No names are drawn on the nodes, so the black chain on the drawing cannot be checked by eye; only Nodes in order names the people. The follow-up's Ravi-Pia tie passes through Quinn, an orange node not on the path (about 622,209); Nadia did not misread it.                                     | `11.png`, `16.png`; transcript end: "the black line on its own tells me nothing"                                          |

No severity 3 or 4: both chains were right, read from the Values, and every doubt Nadia raised was
about finding the analysis, wording, or a replacement she noticed. Problems 1 and 2 match the same
findings graded in earlier rounds' T18 sessions (for example round 2's r2-s30); within this
session alone they rest on one participant.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
