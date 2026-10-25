# Grade: session r5-s21b -- Grace (tier 1 graduate), running club (T18 A), the fewest people in between

**Grade: S** (success), and the follow-up is also right.

The main answer is read off the run's Values in `09.png`: Summary "Path 5 nodes, 4 edges"; "Nodes
in order" Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with From "Chloe", To "Milo", Follow "All",
Weight "None" with "Each edge counts as 1; "weight" has no meaning set." This is the answer key's
chain, the only one of that length. Grace answered "Chloe -> Ava -> Ivan -> Kofi -> Milo. 4
introductions, 3 people in between."

The last screenshot (`14.png`) shows the follow-up: "Nodes in order" Ben 1, Theo 2, Ravi 3, Pia 4,
Nora 5; "Path 5 nodes, 4 edges"; Made with From "Ben", To "Nora", Follow "All", Weight "None", Ran
"Oct 11, 10:17:45 AM" (the first run read 10:17:01 AM); the Graph tree row reads "Shortest path 4
hops". This matches the key's follow-up answer. Grace answered "Ben -> Theo -> Ravi -> Pia ->
Nora: 4 introductions, 3 people in between."

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, no uncommitted changes. Start: friends.csv with a PageRank run, nodes
sized and colored by PageRank, no names drawn (`01.png`, `work-start.json`). `session.log` and
`setup.log` show no errors; `leaks.json` shows no leaks over 31 calls. Not void.

## The answer against the key

- **Chain (right).** Chloe, Ava, Ivan, Kofi, Milo, read from the Values list, not from the drawing
  (`09.png`). Jada, who sits on the Ivan-Kofi tie on the drawing, was not put into the chain.
- **Count (right).** "4 introductions, 3 people in between" agrees with "5 nodes, 4 edges" and
  "4 hops". Grace counted the ties herself to be sure "4 hops" meant 4 introductions.
- **Settings (right).** Follow "All" and Weight "None" left as they were (`08.png`). She did not
  know what "Out" would mean, but All is the right reading for people who run together.
- **Follow-up (right).** Ben, Theo, Ravi, Pia, Nora with 4 introductions, read from the list
  (`14.png`). Quinn, who sits on the Ravi-Pia tie on the drawing (about 622,209), was not put into
  the chain.
- **Work kept.** `work.json`: the PageRank run and its three layers are still there at the end;
  one Shortest path run with its two layers was added; `gone` is empty.

## Measures

- **Route:** the Analyze button on the bottom toolbar (`02.png`), filter typed "path" (`03.png`),
  "Shortest path" (`04.png`), Chloe typed and picked (`05.png`, `06.png`), Milo typed and picked
  (`07.png`, `08.png`), Find path (`09.png`). This is on the key's success path (Analyze, "Shortest
  path"). The prompt avoids the word "path"; Grace chose it herself from "route", then found it in
  the filtered list. She did not go to the From field from the prompt's wording.
- **Steps (main prompt):** 8 after the start (02 to 09). The key's success path is 4; the extra
  steps are typing and picking as separate steps and the filter step, not a wrong place.
- **Steps (follow-up):** 5 (10 to 14): Analyze, "Shortest path" under Recent, Ben typed, Ben picked
  with Nora typed, Nora picked with Find path. That is within the follow-up target (success path
  plus 1) with 0 wrong turns. The follow-up target holds.
- **Wrong turns:** 0.
- **False "done":** none. Both "done" claims are true on screen (`09.png`, `14.png`);
  truth-on-screen holds. Her remark that the first chain was replaced is also true: one "Shortest
  path" row in the Graph tree, only the Ben-Nora chain drawn and listed (`14.png`), and `work.json`
  ends with one shortest_path run.
- **Silent commit:** none. **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; Grace finished.
- **Participant fidelity (not an app finding):** Grace's opening says "The flask button at the
  bottom is where I ran the ranking last time". Her history says only that she had the program
  rank who matters most, not where. The flask is a plain icon whose name ("Analyze") she learned
  only by clicking it (`02.png`), so the route still came from the screen, but the first move drew
  on a memory the history does not give. Count this session's time-to-first-move with that in
  mind.

## Problems

| #   | Severity | Kind        | Problem | Evidence |
| --- | -------- | ----------- | ------- | -------- |
| 1   | 2        | lost work   | Running a second shortest chain replaces the first, and nothing says so. The Graph tree keeps one "Shortest path" row, and the Chloe-Milo chain is no longer drawn or listed. Grace had written the first chain down, so nothing was lost here; she said she expected two rows, the way her PageRank row stayed beside it. | `09.png` against `14.png`; `work.json` end lists one shortest_path run; transcript step 14 and "What confused me". Known in the answer key. |
| 2   | 1        | wording     | The count is given as "4 hops" on the tree row and "5 nodes, 4 edges" in the Summary. Grace had to count the ties to be sure 4 hops meant 4 introductions; "introductions" or "people in between" is what she would write. | `09.png`, `14.png`; transcript step 8 and "What confused me" |
| 3   | 1        | wording     | "Follow: Out / All" has no explanation in the popover. Grace left it on All, which is right, but could not say what Out would mean for people who run together. | `04.png`, `08.png`; transcript "What confused me" |
| 4   | 1        | findability | The drawing shows no names, so the black path alone does not say who is on it; the chain could be read only from the Values list. Two ties of the drawn chains pass through nodes not on them (Jada on Ivan-Kofi, Quinn on Ravi-Pia), which would mislead anyone reading the drawing. | `09.png`, `14.png`; transcript "What confused me"; overlaps known in the answer key |
