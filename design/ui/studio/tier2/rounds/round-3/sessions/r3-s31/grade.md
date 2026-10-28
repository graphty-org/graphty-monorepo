# Grade: session r3-s31 -- Elena (tier 1 graduate, returning), running club (T18 A), the fewest people in between

**Grade: S** (success) on the prompt; the follow-up is right too. Elena's answer, "Chloe -> Ava ->
Ivan -> Kofi -> Milo. Three people in between, four introductions", matches the key: 4
introductions, 3 people in between, the only chain of that length. She read it off the Shortest
path run's Values ("Nodes in order", `08.png`), which is the key's S route, and gave the count.

Last screenshot (`13.png`): the follow-up run's Values -- Path "5 nodes, 4 edges"; Nodes in order
Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5; Made with Analysis "Shortest path", Ran "Oct 10, 6:02:01
PM", From "Ben", To "Nora", Follow "All", Weight "None" with "Each edge counts as 1; "weight" has
no meaning set." under it at the rows' own size, and a collapsed "Advanced run settings". The Graph
tree holds one "Shortest path 4 hops" row above PageRank; the drawing shows the Ben-to-Nora chain
in black on the orange PageRank drawing, and the Chloe-to-Milo chain is no longer drawn.
`work.json` end: the PageRank run and its layers kept, plus one Shortest path run and its two
layers; nothing gone.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `friends-ranked.txt` (PageRank run's Style
tab, `01.png`).

## The answer against the key

- **Prompt chain (right).** Chloe, Ava, Ivan, Kofi, Milo, "5 nodes, 4 edges", read from the Values
  (`08.png`). Made with reads From "Chloe", To "Milo", Follow "All", Weight "None" with the weight
  line, as the key says.
- **Follow-up (right).** Ben, Theo, Ravi, Pia, Nora, four introductions, read from the Values
  (`13.png`), matching the key.
- **Weight and Follow.** Both left as they came (Weight "None", Follow "All"); she kept None for
  the right reason ("I want the fewest people, so 'each counts as 1' sounds right"). No
  `meaning-wrong`. She did not notice that two ties on the chain point against it (Ava to Chloe,
  Ivan to Ava); nothing to record under the key's "doubts the chain" note.
- **Overlap traps (Jada on the Ivan-Kofi tie, Quinn on the Ravi-Pia tie, Chloe half-covering a
  larger node).** Not met: she read both chains from the list, never from the drawing, and said
  she "had to trust the list on the right rather than the picture".

## Measures

- **Steps:** prompt, 7 screenshots after the start to the answer (`02.png` to `08.png`: find box
  "Chloe", pick Chloe, the node's "..." menu, "Path between...", type Milo in To, pick Milo, Find
  path). She took the node menu route, which the key lists as a success route, reached by first
  selecting Chloe through the find box; typing and picking were separate steps. The key's success
  path is 4, so the prompt took 1.75x the key's count. Follow-up, 5 screenshots (`09.png` to
  `13.png`), the same route with two steps combined; the follow-up target (success path + 1, 0
  wrong turns) is met at 5.
- **Wrong turns:** 0. Every step moved toward the answer. Selecting Chloe first was not a detour:
  it is how the node menu's "Path between..." is reached, and it filled From for her (`05.png`).
- **Broken habit:** none. Her first move (the find box, from her history) led on to the node and
  its menu.
- **False "done":** none. Both "done" claims named the right chain and count. Her wrap-up claims
  hold on screen: no names are drawn on the dots (`01.png` to `13.png`); "Path between..." sits in
  the node's "..." menu (`04.png`) with From already filled (`05.png`, `11.png`); the second run
  replaced the first (`13.png`: one "Shortest path 4 hops" row, the Chloe chain no longer black).
  "Nothing on the screen said path until the menu" holds for the words on screen: the Analyze
  button is an unlabeled flask icon (`01.png`). truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** the second Find path replaced the first run without a word (problem
  2). It did not touch the answer (she had written the first chain down) or any earlier work, and
  it is the key's documented behavior on this build.
- **Numbers that disagree (bar 5):** none. "5 nodes, 4 edges" matches 5 rows in Nodes in order on
  both runs, and the tree's "4 hops".
- **Earlier work:** `work.json` lists nothing gone; the PageRank run and its layers are kept.
- **Build-decided:** no. Every control behaved as the key describes this build.
- **Void:** no. Every step printed its screenshot; `session.log` is empty (no script, console or
  request errors); `leaks.json` lists no leaks; `setup.log` shows only the setup's file chooser
  being answered; the follow-up was given by the tool at the first `--end` (session.json
  `followUp`). The start waited several minutes for a browser slot, which delayed the session but
  changed nothing on screen.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                                                                                       | Evidence                                              |
| --- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | 2        | feedback      | The drawing cannot confirm the chain: no names are drawn on the dots, so Elena could not check the black line against the list and "had to trust the list on the right rather than the picture". The key records the same on this build (no names by default, hovering shows nothing).                                         | `08.png`, `13.png`; wrap-up                           |
| 2   | 2        | silent commit | A second Shortest path run replaces the first with no message: the tree keeps one "Shortest path 4 hops" row and the first chain disappears from the drawing. Elena noticed ("it swapped the old one for this one") and said that without writing it down she would have lost the first chain. Matches the key's note for this build. | `08.png` against `13.png`; transcript step 13; wrap-up |
| 3   | 1        | findability   | No visible word on the start screen leads to a path between two people: the Analyze button is an icon only, and "Path between..." appears only inside a selected node's "..." menu. Elena found it there on her first guess, so it cost no wrong turn, but she said she "only tried it because I had run out of other ideas".   | `01.png`, `03.png`, `04.png`; wrap-up                  |

No severity 3 or 4: both answers were right on the first route taken. None is an implementation
fault of the build; all three are design questions already described in the answer key for this
build.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
