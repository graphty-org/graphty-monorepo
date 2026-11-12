# Grade: session r3-s27 -- Dana (returning analyst), running club (T18 A), the fewest people in between

**Grade: S** (success), prompt and follow-up both. The main answer is on screen in `08.png`: the
run's Values read Summary "Path 5 nodes, 4 edges"; Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4,
Milo 5; Made with Analysis "Shortest path", From "Chloe", To "Milo", Follow "All", Weight "None"
with "Each edge counts as 1; "weight" has no meaning set." under it. The Graph tree row reads
"Shortest path 4 hops". Dana reported Chloe, Ava, Ivan, Kofi, Milo, 4 introductions, 3 people in
between -- the key's answer, read off the Values. The last screenshot (`13.png`) holds the
follow-up: Nodes in order Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges", From "Ben",
To "Nora", Follow "All", Weight "None"; she reported the same chain and 4 introductions, which is
the key's follow-up answer.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, colored and sized by
PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Main chain and count (right).** `08.png`, as above. Follow was left on "All" (`05.png`), so
  the chain counts ties both ways, as the task means; not `meaning-wrong`. No weight was set
  (Weight "None"), so the tie numbers were not read as a distance.
- **Follow-up chain and count (right).** `13.png`, as above. Ran moved from "5:42:13 PM"
  (`08.png`) to "5:43:12 PM" (`13.png`), so the run on screen is the new one.
- **No drawing-overlap error.** She named nobody from the drawing; Jada (on the Ivan to Kofi tie)
  and Quinn (on the Ravi to Pia tie) appear nowhere in her answers.
- **`work.json`:** one new run, `shortest_path`, with its two layers; nothing gone; the source is
  still friends.csv.

## Measures

- **Steps, main prompt:** 7 `real.mjs` steps after the start (`02.png` to `08.png`). The key's
  success path is 4 with the `p` key; the Analyze route she took costs 3 steps in place of 1
  (Analyze, filter "shortest", click), and she typed and picked From and To as separate steps.
  Step 2 (the find box, "Chloe") was a look at Chloe's ties before going to Analyze.
- **Wrong turns, main prompt:** 0. The find box search (`02.png`) is a place her history names; it
  changed nothing she later had to undo, and it does offer a way on (a node's menu holds "Path
  between..."), so it is neither a wrong turn nor a broken habit, as graded in the earlier T18
  sessions that opened with it.
- **Steps, follow-up:** 5 (`09.png` to `13.png`): Analyze, Recent "Shortest path", From, pick
  plus To, pick plus Find path. Within the follow-up target (success path 4 + 1).
- **Wrong turns, follow-up:** 0. Recent put Shortest path at the top (`09.png`) and the form came
  back empty with Follow still All (`10.png`).
- **False "done":** none. Both "done" claims (end of `08.png`, end of `13.png`) are true: chain,
  order and count are on screen each time. truth-on-screen: holds. Her closing remark that the
  first chain was replaced by the second is also true (one "Shortest path 4 hops" row in
  `13.png`; the Chloe to Milo chain no longer drawn).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Find path drew the path, added the legend row and opened the Values.
- **Numbers that disagree:** none; "4 hops" and "5 nodes, 4 edges" describe the same chain (but see
  problem 3).
- **Broken habit:** none. Her first moves (find box, then the analysis button) both led on.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `session.log` is empty;
  `setup.log` shows the file chooser answered; `leaks.json` shows no leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                  | Evidence                                                                                       |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | 2        | repeat-work     | A second Shortest path run replaces the first: the Graph tree keeps one "Shortest path 4 hops" row and the Chloe to Milo chain is no longer drawn or listed. Nothing warned her before Find path. To show both chains side by side she would have to redo one. | `08.png` against `13.png` (one row each, different Values); transcript step 13 and end         |
| 2   | 1        | legibility      | No names are drawn on the nodes, so the black path on the drawing cannot be read on its own; only Nodes in order says who is who.                                                                                                        | `08.png`, `13.png`; transcript end                                                             |
| 3   | 1        | wording         | The same count is called "4 hops" in the Graph tree and "4 edges" in the Summary, and the task speaks of introductions. She worked out that they agree, but two words for one quantity made her stop.                                       | `08.png` left row "4 hops", Summary "5 nodes, 4 edges"; transcript end                          |
| 4   | 1        | comprehension   | "Follow: Out / All" has no explanation on the form. She picked All on her own reasoning (introductions go both ways); the drawing's arrowheads run against the chain on two ties, and All is the only sign that both ways count.            | `05.png` Follow row; transcript step 5 and end                                                  |
| 5   | 1        | discoverability | The analysis list opens on ranking measures (Degree, Betweenness, Closeness, Katz...) with no path entry on its first screen; she found Shortest path only by typing "shortest" in the filter. Cost nothing here; she knew to filter. | `03.png`, `04.png`; transcript step 3                                                           |
| 6   | 1        | legibility      | The small gray section labels in the inspector (Summary, Made with) are hard for her to read.                                                                                                                                            | `08.png` right panel; transcript end                                                           |

No severity 3 or 4: both answers were right, read from the Values, and every complaint was about a
path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
