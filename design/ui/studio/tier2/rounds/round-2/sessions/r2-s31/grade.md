# Grade: session r2-s31 -- Tom (returning), running club (T18 A), the fewest people in between

**Grade: S** (success). The main prompt's answer is on screen in `11.png`: Summary "Path 5 nodes,
4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with Analysis "Shortest
path", From "Chloe", To "Milo", Follow "All", Weight "None". That is the answer key's only chain
of that length. The last screenshot (`16.png`) holds the follow-up, also right: Ben 1, Theo 2,
Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges", From "Ben", To "Nora", Follow "All", Weight "None".
Tom gave both chains with the count ("four introductions, three people in between"), read off the
run's Values, not guessed from the drawing, so this is S, not SD. His find-box look-up of Chloe
before the run was orientation, used afterward to check the chain's first tie; not a detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, nodes sized and colored by it, no
names drawn, `01.png`). `session.log` is empty: no script, console or request errors.

## The answer against the key

- **Main prompt (right).** `11.png`, as above. Tom: "Chloe -> Ava -> Ivan -> Kofi -> Milo. Three
  people in between, four introductions."
- **Follow-up (right).** `16.png`. Tom: "Ben -> Theo -> Ravi -> Pia -> Nora. Three people in
  between, four introductions." Ran changed from 8:24:17 PM to 8:25:11 PM, so the screen shows a
  new run.
- **Not a wrong answer.** Follow stayed on "All" (an Out run would be `meaning-wrong`); Weight
  stayed "None". Quinn, whom the highlighted Ravi-Pia tie passes straight through on the drawing
  (about 622,209, `16.png`), was not named.
- `work.json` agrees: one new run, `shortest_path`, with its two layers; nothing gone.

## Measures

- **Steps, main prompt:** 10 `real.mjs` steps after the start (`02.png` to `11.png`). The key's
  count is 4 (5 with typing and picking split). The extra steps: one find-box look-up for
  orientation (1), a stray hover that landed on the main menu (2), the analysis button plus a
  typed filter in place of the `p` key (3-5), and From and To each typed then picked (6-9). About
  2x.
- **Steps, follow-up:** 5 (`12.png` to `16.png`). Shortest path sat under "Recent" in the analysis
  list, and From and To came back empty.
- **Wrong turns:** 0. Step 2's hover on the main menu was an aiming slip with no action taken.
- **False "done":** none. Both "done" claims (`11.png`, `16.png`) are true; truth_on_screen holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** one. The second Find path replaced the first chain on the drawing,
  in the left list (still one "Shortest path 4 hops" row) and in the Values, with no message
  (`16.png`). The answer key documents this. Tom noticed and had written the first chain down,
  so no answer was lost.
- **Numbers that disagree (bar 5):** none. "4 hops" and "5 nodes, 4 edges" agree; Tom translated
  them to introductions himself.
- **Wrong weight reading without a sign (bar 7b):** no. He did not quote "A path needs a distance"
  as a reason to set a weight.
- **Doubted the chain because arrows run against it:** yes, noted but not acted on. He saw Ava ->
  Chloe pointing "the wrong way" and trusted that "All" counts either direction, saying nothing on
  screen said so in words (the key predicts this).
- **"From" field straight after reading the prompt:** no. He went to the find box first.
- **Broken habit:** none. His history's move (the analysis button in the toolbar) led on to the
  task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot. The first `--end`
  printed the follow-up after it had already been carried out, and a second `--end` closed the
  session: an ordering quirk in the tester's run that changed no screen.
- **Scripted exit:** not applicable; he finished.
- **Roster note:** the roster's T18 table puts Tom on the Florentine half (B), but this session
  ran the running-club half (A). The grade stands on A's key; the round's tally should count this
  session under A.

## Screens that differ from the answer key

- The find box kept "Chloe" and its result list (1 node, 4 edges) from step 1 to the end, so the
  left column still shows Chloe's ties beside the Ben to Nora run (`16.png`). Not in the key's
  walk, which never uses the find box. It misled no one here.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                         | Evidence                                                                                                  |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The analysis list opens on rankings (Degree, Betweenness, Closeness...) with nothing near the top about how two nodes are linked. Tom found Shortest path only by typing his own word, "between", into the filter, and doubted "chain" or "introduce" would work. | `04.png`, `05.png`; transcript end: "I only found the right one because I typed a word into the filter" |
| 2   | 2        | silent-replace  | Running Shortest path a second time replaced the first chain on the drawing, in the left list and in the Values with no message. Tom kept the first only because he had written it down, and asked whether it is kept anywhere.                                  | `16.png` (one "Shortest path 4 hops" row; only Ben to Nora shown); transcript step 15                     |
| 3   | 1        | comprehension   | "Follow: Out / All" is not explained on screen. Tom left it on All without knowing what it meant, then saw arrows on his chain pointing against it (Ava -> Chloe) and could only trust that All means either direction. Out would have given a wrong chain.        | `06.png`, `10.png`, `11.png`; transcript step 10 and end                                                  |
| 4   | 1        | wording         | The left list says "4 hops"; the Values say "5 nodes, 4 edges". Neither is Tom's word ("introductions", "people in between"). He converted both correctly.                                                                                                        | `11.png`, `16.png`                                                                                        |
| 5   | 1        | legibility      | No names are drawn on the nodes, so the black chain could be checked only against Nodes in order. On the follow-up the highlighted Ravi-Pia tie passes straight through Quinn, an orange node not on the path; Tom did not misread it.                            | `16.png` (about 622,209); transcript end: "The dots have no names on them"                               |
| 6   | 1        | comprehension   | "Guided route -- Select 2 nodes first" sat grayed out under Shortest path, with nothing saying how it differs. Tom ignored it.                                                                                                                                   | `05.png`                                                                                                  |

No severity 3 or 4: both chains were right, read from the Values, and every doubt Tom raised was
about finding the analysis, wording, the Follow setting or a replacement he noticed. No problem
here is an implementation defect: no script, console or request error, no control that failed to
respond, and every screen matched the answer key except the find-box leftover noted above.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
