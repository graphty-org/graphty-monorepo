# Grade: session r5-s19b -- Dana (regular analyst), running club (T18 A), the fewest people in between

**Grade: S** (success). The main question's end screen (`09.png`) shows the Shortest path run on
its Values: "Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made
with From "Chloe", To "Milo", Follow "All", Weight "None" with "Each edge counts as 1; "weight" has
no meaning set." under it; the Graph tree row reads "Shortest path 4 hops". That is the key's chain
and count. Dana answered "Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, 4
introductions", read from the Nodes in order table. The last screenshot (`14.png`) holds the
follow-up: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges", From "Ben", To "Nora", Follow
"All", Weight "None", Ran "Oct 11, 10:16:43 AM" (the first run read 10:16:01 AM) -- the key's
follow-up answer. Dana's follow-up answer, "Ben -> Theo -> Ravi -> Pia -> Nora. Three people in
between, 4 introductions", matches it.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: friends.csv loaded, PageRank run, nodes sized and colored by
PageRank, no names drawn (`01.png`). Tool commit `0340fb332c5e`, no uncommitted changes.
`session.log` is empty (no script, console or request errors); `leaks.json` shows no leaks over 31
calls.

## The answer against the key

- **Chain (right).** Chloe, Ava, Ivan, Kofi, Milo, in order, read from the Values table (`09.png`).
- **Count (right).** "4 introductions, three people in between" -- both forms the key accepts.
- **Settings (right).** Follow left on "All" (running together goes both ways, as the key says),
  Weight left on "None" (the tie numbers are not a distance). Dana gave the right reason for each:
  "Fewest people is what I want, so no weight is right; 'All' directions is fine since
  introductions go both ways."
- **Overlap traps.** Dana never read names off the drawing, so neither Jada (on the Ivan-Kofi tie)
  nor Quinn (on the Ravi-Pia tie) could enter an answer, and neither did.
- **Arrowheads against the chain.** Not remarked on; Dana did not doubt the chain.
- **Work kept.** `work.json`: the PageRank run and its three layers are unchanged; the end adds one
  Shortest path run (label "Shortest route") and its two layers. Nothing gone.

## Measures

- **Route:** Analyze button, typed "path" in its filter, picked "Shortest path"; From and To by
  typing and clicking the suggestion; Find path. The follow-up reopened Shortest path from the
  Analyze list's Recent row.
- **Steps (main question):** 8 `real.mjs` steps after the start (open Analyze, type, pick; type,
  pick; type, pick; Find path). The key's success path is 4; the extra steps are typing and picking
  done as separate steps and opening through Analyze rather than `p`, not detours.
- **Wrong turns:** 0. Every step moved toward the answer; no control was opened and abandoned.
- **False "done":** none. "That is my answer" at step 9 is true on `09.png`; the follow-up claim is
  true on `14.png`. truth-on-screen holds.
- **Silent commit:** none. Find path drew the path, added the tree row and opened the run.
- **Numbers that disagree:** none. "5 nodes, 4 edges" and "4 hops" agree, though they use two
  words for the same count (problem 3).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Fourteen screenshots for the steps taken; the tool ran
  cleanly.
- **Scripted exit:** not applicable; Dana finished both questions.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                       | Evidence                                                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | trust           | The second path run replaces the first with no trace: the tree keeps one "Shortest path 4 hops" row, the drawing shows only Ben to Nora, and nothing says where Chloe to Milo went or how to keep both. Dana had noted the first answer, so the task held.   | `09.png` against `14.png` (one tree row, first chain gone); transcript step 15 and "What confused me": "I would not know where the first went" |
| 2   | 2        | missing feature | The drawn path has no names on it; the black dots can be named only through the Nodes in order table. Dana would need names on the picture to show it to others.                                                                                           | `09.png`, `14.png` (no labels on any node); transcript "What confused me": "In front of a VP I would need the names on the picture"            |
| 3   | 1        | language        | The result counts in graph words -- "5 nodes, 4 edges" and "4 hops" -- so the reader must translate to "4 introductions, 3 people in between". Dana did it right but took a second look.                                                                  | `09.png` Summary and tree row; transcript: "I had to translate: 4 hops = 4 introductions, 3 people in between"                                   |
| 4   | 1        | language        | The Follow row's "Out / All" choice has no explanation of what "Out" changes; Dana chose All by reasoning about her data, not from the screen.                                                                                                              | `04.png` (Follow row, no hint); transcript: "I did not know what 'Out' would change"                                                             |
| 5   | 1        | legibility      | The inspector's row labels and the Made with note under Weight are small gray text, which Dana said would be hard to read on a laptop.                                                                                                                       | `09.png` right panel; transcript: "small grey text; fine on the big monitor, hard on the laptop"                                                 |

Problem 1 is the behavior the answer key records for this task ("the second run replaces the
first"); this session adds a participant who noticed it and could not tell where the first run
went. Problems 2 to 5 did not affect the answer.
