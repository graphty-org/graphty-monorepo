# Grade: session r5-s17b -- Ruth (tier 1 graduate), running club (T18 A), the fewest people in between

**Grade: S** (success), and the follow-up also right. The main answer is read off the run's Values
in `09.png`: "Nodes in order" Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Summary "Path 5 nodes, 4
edges"; Made with From "Chloe", To "Milo", Follow "All", Weight "None" with "Each edge counts as 1;
"weight" has no meaning set." This is the answer key's chain, the only one of that length. Ruth
answered "Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four introductions."

The last screenshot (`15.png`) shows the follow-up: "Nodes in order" Ben 1, Theo 2, Ravi 3, Pia 4,
Nora 5; "Path 5 nodes, 4 edges"; From "Ben", To "Nora", Follow "All", Weight "None"; the Graph tree
row reads "Shortest path 4 hops". This matches the key's follow-up answer. Ruth answered "Ben ->
Theo -> Ravi -> Pia -> Nora. Three people in between, four introductions."

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`). This is the frozen build named at the
top of the criteria, run at 1440 x 900 with no uncommitted changes. Start: friends.csv with a
PageRank run, nodes sized and colored by PageRank. `session.log` is empty (no script, console or
request errors), and `leaks.json` shows no leaks over 33 calls. Not void.

## The answer against the key

- **Chain (right).** Chloe, Ava, Ivan, Kofi, Milo, read from the Values list, not from the
  drawing (`09.png`). No overlapping node was put into the chain, including Jada, who sits on the
  Ivan-Kofi tie on the drawing.
- **Count (right).** "Three people in between, four introductions" agrees with "5 nodes, 4 edges"
  and "4 hops".
- **Settings (right).** Follow "All" and Weight "None" (each tie counts as 1). Ruth said why "All"
  was right: an introduction works either way.
- **Ties checked against the data.** Ruth checked three of the four ties against the edge lists
  in the find box: Ava -> Chloe (`02.png`), and Ivan -> Ava and Ivan -> Kofi (`10.png`). She saw
  that two of them run against the arrow and put that down to Follow "All". This is the
  direction trap the key names. She did not doubt the chain because of it.
- **Follow-up (right).** Ben, Theo, Ravi, Pia, Nora, with 4 introductions (`15.png`). She checked
  Theo -> Ben in Ben's edge list (`11.png`). Quinn, who sits on the Ravi-Pia tie on the drawing,
  was not put into the chain.
- **Work kept.** `work.json`: the PageRank run and its three layers are still there at the end.
  One Shortest path run was added, with its two layers. Nothing was lost (`gone` is empty).

## Measures

- **Route:** the find box (typed "Chloe"), then Chloe's node row, then the node's actions menu,
  "Path between..." (`05.png`). From was already filled with Chloe. She typed Milo in To, picked
  the option and clicked Find path. This is on the key's success path (a node's menu, "Path
  between..."). Her first move was into the find box, the place her history names, and from
  there the node menu led on to the task. It is not a broken habit.
- **Steps (main prompt):** 7 steps to the answer after the start (02 to 09; the click refused as
  ambiguous in 03 counted). The key's success path is 4. One more step (10) checked the ties.
  The extra steps come from going through the find box and the node, not from a wrong place.
- **Steps (follow-up):** 5 (11 to 15). The same route: the find box, Ben's row, the node menu with
  "Path between...", Nora typed, picked and run. That is the target (the follow-up's success path
  of 4, plus 1) and has 0 wrong turns. The follow-up target holds.
- **Wrong turns:** 0. The refused `--click "Chloe"` (03.png) is the study tool asking which of
  the five rows labeled Chloe was meant (her node row and her four edges). Nothing changed in
  the app, and the next step clicked the node row. It is not counted as a wrong turn.
- **False "done":** none. Both claims are true on screen (`09.png`, `15.png`); truth-on-screen
  holds. Her remark that the first chain is gone is also true: there is one "Shortest path" row
  and only the Ben-Nora chain is drawn (`15.png`).
- **Silent commit:** none. **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; Ruth finished.

## Problems

| #   | Severity | Kind        | Problem | Evidence |
| --- | -------- | ----------- | ------- | -------- |
| 1   | 2        | lost work   | Running a second shortest chain replaces the first, and nothing says so. The Graph tree keeps one "Shortest path" row, and the Chloe-Milo chain is no longer drawn or listed. Ruth had written the first chain down, so nothing was lost here. Without that, she would have had to run it again. | `09.png` against `15.png`; `work.json` end lists one shortest_path run; transcript step 14 and "What confused me". Also known in the answer key. |
| 2   | 1        | wording     | The count is given as "5 nodes, 4 edges" and "4 hops". A reporter has to turn that into "three people in between, four introductions" herself. "Hops" is not her word. | `09.png`, `15.png`; transcript "What confused me" |
| 3   | 1        | findability | "Path between..." sits behind an unlabeled "..." button by the node's name. Ruth found it only because the button was next to Chloe's name. | `04.png`, `05.png`; transcript step 4 and "What confused me" |
| 4   | 0        | wording     | In the find box's results, the node row and the node's four edge rows all contain "Chloe". The study tool could not tell which was meant. A person would click the top (node) row, so this is a cosmetic note at most. | `02.png`, `03.png`; transcript step 2 |
