# Grade: session r2-s27 -- Alex (returning analyst), running club (T18 A), the fewest people in between

**Grade: S** (success). The last screen of the main task (`08.png`) shows the right chain and
count: Summary "Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5;
Made with From "Chloe", To "Milo", Follow "All", Weight "None". Alex read the chain off Nodes in
order and gave "Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between (Ava, Ivan, Kofi);
four introductions", which matches the answer key exactly. The follow-up is also right on the
session's last screenshot (`13.png`): Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges",
From "Ben", To "Nora", Follow "All", Weight "None"; Alex answered "Ben -> Theo -> Ravi -> Pia ->
Nora ... four introductions", as the key gives.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: the ranked running club (PageRank run, nodes sized and colored by it, no
names drawn; `01.png`).

## The answer against the key

- **Chain and count (right).** `08.png`, as above; read from the Values list, not guessed from the
  drawing. Follow stayed on "All" (the key's chain); Weight stayed "None", so the tie numbers were
  never used as a distance (not `meaning-wrong`).
- **Follow-up (right).** `13.png`. Alex noticed the second run replaced the first in the Graph tree
  (one "Shortest path 4 hops" row), as the key says it does, and had already written the first
  chain down.
- **Traps not hit.** He did not set a weight or quote "A path needs a distance" as a reason to;
  he did not read any node off the drawing, so neither overlap the key lists (Chloe half-covering
  a larger orange node near 716,744 in `08.png`; the Ravi-Pia tie passing through Quinn near
  622,209 in `13.png`) reached his answer. He did not doubt the chain because of arrowheads
  pointing against it; he named Follow "All" as the reason it runs both ways.
- `work.json`: one new run `shortest_path` with its two layers, nothing gone. Agrees with the
  screen.

## Measures

- **Steps:** main task 7 `real.mjs` steps after the start (`02.png` to `08.png`) against the
  success path's 4. The extra 3 are not detours: one hover on the main menu icon to read its
  tooltip (`02.png`), the analysis button plus a typed filter in place of the `p` key (2 steps for
  1), and each name typed then picked from its suggestion. About 1.75x. Follow-up: 5 steps
  (`09.png` to `13.png`), using Recent in the analysis list.
- **Wrong turns:** 0. The hover in step 2 opened nothing and he moved straight on; every click went
  forward.
- **False "done":** none. Both "done" claims (`08.png`, `13.png`) are true: the chain and the
  count are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Find path drew the path, its key entry and the run's Values.
- **Numbers that disagree (bar 5):** none. "4 hops" in the tree and "5 nodes, 4 edges" in Values
  agree with each other and with the chain.
- **Broken habit:** none. His history's habit (the analysis button in the toolbar) led straight to
  Shortest path.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `session.log` is empty
  (no script, console or request errors). The tool printed the follow-up request again at the
  first `--end`; the participant ran `--end` a second time to close. That repeated a prompt but
  changed nothing on screen and did not touch the result.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                         | Evidence                                                                                   |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | 2        | history-loss    | A second Shortest path run replaces the first: the Graph tree keeps one "Shortest path 4 hops" row and the Chloe-to-Milo chain is gone from the drawing and the tree. Alex expected each run to stay listed beside the PageRank run so he could compare or export both chains. | `08.png` against `13.png` (one row both times); transcript step 13 and debrief           |
| 2   | 1        | legibility      | No names are drawn on the nodes, so the black path on the canvas tells the reader nothing about who is on it; the chain can be read only from Nodes in order.                                                                                                                | `08.png`, `13.png`; debrief: "I relied entirely on the Values list"                        |
| 3   | 1        | wording         | The same count is called "hops" in the Graph tree and "edges" in Summary, and neither is the reader's word ("introductions"); Alex had to translate 4 hops / 4 edges into 4 introductions and 3 people in between. He translated correctly.                                   | `08.png` tree row and Summary; debrief                                                     |
| 4   | 1        | discoverability | Typing "shortest" in the analysis filter lists three ranking measures first (Betweenness highlighted at the top) and puts Shortest path last, under a second heading. Alex found it, but the highlighted first item is a different analysis.                                  | `04.png`                                                                                   |
| 5   | 1        | wording         | Follow's "Out / All" is terse; Alex read it from NetworkX knowledge and said a newer user might not.                                                                                                                                                                            | `05.png`, `07.png`; debrief                                                                |
| 6   | 0        | layout          | The open suggestion list under To covers the Follow label and the top of the Out / All row while it is open. It closed on the pick and did not affect the run.                                                                                                                 | `07.png`                                                                                   |

No severity 3 or 4: the answer and the follow-up were right, read from text on screen, and every
remark was about wording, legibility or keeping more than one run.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence, and a simulated returning
user is likely faster than a real one on anything the history names (here, the analysis button).
