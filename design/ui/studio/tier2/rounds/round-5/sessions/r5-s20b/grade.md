# Grade: session r5-s20b -- Alex (regular analyst), Florentine families (T18 B), the fewest families in between

**Grade: S** (success), main prompt and follow-up both right.

- **Main prompt (Strozzi to Pazzi).** `09.png`: the Shortest path run's Values read "Path 5 nodes,
  4 edges"; Nodes in order Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; Made with
  Analysis "Shortest path", Ran "Oct 11, 10:17:57 AM", From "Strozzi", To "Pazzi", Weight "None"
  with "Each edge counts as 1." under it. The Graph tree row reads "Shortest path 4 hops"; the
  five nodes and four ties are black on the PageRank colors. This is the key's B chain. Alex
  answered "Strozzi, Ridolfi, Medici, Salviati, Pazzi (4 hops)", read off Nodes in order.
- **Follow-up (Peruzzi to Ginori), the last screen.** `15.png`: "Path 5 nodes, 4 edges"; Nodes in
  order Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5; Ran "Oct 11, 10:18:42 AM", From
  "Peruzzi", To "Ginori", Weight "None". This is the key's follow-up chain. Alex answered it in
  order with "4 hops".

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900. Start: the ranked Florentine setup (`florentine-ranked.txt`: PageRank
run, nodes colored and sized by PageRank, no names drawn), matching the key's start (`01.png`).
Tool commit `753bae997bc6`, no uncommitted changes. `session.log` is empty; `leaks.json` shows no
leaks over 30 calls.

This session re-runs r5-s20, which was void because the round's start check had not been run.

## The answer against the key

- **Chain and count (right, both prompts).** Read from the Values, not from the drawing, so S, not
  SD. The drawing alone could not have answered: no names are on the nodes, which Alex said
  himself.
- **Weight (right).** Left at "None" on purpose ("marriages, fewest families"); never touched.
- **Work kept.** `work.json`: the start's PageRank run and its three layers are all still there at
  the end; one Shortest path run and its two layers were added; nothing gone. The second run
  replaced the first, as the key says it does (one "Shortest path 4 hops" row at the end).
- **Overlap not misread.** On `15.png` the black Peruzzi-to-Bischeri tie runs straight through
  Castellani (about 713,604), an orange node off the path, as the key warns. Alex read the chain
  from the list and did not name Castellani.

## Measures

- **Route:** the Analyze button in the bottom toolbar, then typing "shortest" in its filter box,
  then the Shortest path form (not `p` or a node's menu). The follow-up came back through Analyze's
  "Recent" section, where Shortest path sat at the top (`10.png`).
- **First move:** a hover on the first icon of the left rail, aimed by index at what Alex took for
  the flask; it showed the Main menu tooltip (`02.png`). He then clicked the flask in the bottom
  toolbar.
- **Steps, main prompt:** 8 `real.mjs` steps after the start (`02.png` to `09.png`). The key's
  count is 4; typing and picking were separate steps here, as in the key's own walk (5 there). The
  extra steps are the hover and the separate filter-typing step.
- **Steps, follow-up:** 6 commands (`10.png` to `15.png`), of which one, `--click "Shortest
  path#2"`, was refused by the tool as ambiguous and changed nothing (`10.png` and `11.png` are
  byte-identical). 5 effective steps: Analyze, the Recent row, type Peruzzi, pick and type Ginori,
  pick and Find path. The follow-up target (success path plus 1) is met on the effective count and
  missed by one if the refused command is counted.
- **Wrong turns:** 1 on the main prompt -- the hover on the Main menu icon, a step off the path that
  was abandoned at once. It was a mis-aimed tool target, not a habit leading to a wrong place, and
  cost one step. 0 on the follow-up: the refused command was a tool selector clash (two rows named
  "Shortest path" in the Analyze list, one under Recent and one in its own section), not a move in
  the app.
- **Broken habit:** none. The analysis button his history names led straight to the task.
- **False "done":** none. Both "Ending" claims are true on `09.png` and `15.png`; truth-on-screen
  holds. His note that the first chain is "gone from the screen" after the second run is also true
  (`15.png`: one Shortest path row, Strozzi-to-Pazzi no longer drawn).
- **Silent commit:** none. Find path closed the form, drew the path and opened the run each time.
- **Numbers that disagree:** none. "5 nodes, 4 edges", "4 hops" and five numbered rows agree.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                   | Evidence                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | repeat work     | A second shortest path replaces the first. The Graph tree keeps one "Shortest path" row and the earlier chain disappears from the drawing and the panel, so two answers cannot sit side by side; the reader must copy the first one down. | `09.png` vs `15.png` (one "Shortest path 4 hops" row in both); `work.json` (one shortest_path run at the end); transcript step 14 and "What took longest" |
| 2   | 1        | missing feature | Nothing says whether another chain of the same length exists, so "is that the only way?" cannot be answered from the screen. (On this graph it is the only one, per the key.)                                                          | `09.png`, `15.png` (Summary shows only the path's size); transcript "What took longest"                                           |
| 3   | 1        | repeat work     | Changing only the ends of a path means reopening Analyze and filling an empty form; From and To cannot be edited on the existing run.                                                                                                    | `12.png` (fresh empty form from the Recent row); `15.png` (Made with shows From and To as read-only values); transcript           |
| 4   | 1        | legibility      | No names are drawn on the nodes, so the black path on the drawing names no one; the answer is readable only from the "Nodes in order" list. On the follow-up the highlighted Peruzzi-Bischeri tie also passes straight through Castellani, an off-path node. Did not mislead this participant. | `09.png`, `15.png` (tie through the node at about 713,604); transcript "What took longest"                                       |

Problem 1 matches the key's documented behavior and earlier sessions' notes on the T18 follow-up;
it is a design choice with a cost, not a defect in this build. Problems 2 to 4 cost Alex no time
here.

Not studied: keyboard-only and screen-reader access (tier 2 does not test them in sessions). Alex
is a simulated returning user briefed on his history, likely faster than a real one on anything
that history names.
