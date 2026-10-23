# Grade: session r3-s29 -- Grace (returning), running club (T18 A), the fewest people in between

**Grade: S** (success). The main answer was shown on `08.png`: Summary "Path 5 nodes, 4 edges",
and Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5. Made with reads From "Chloe", To
"Milo", Follow "All", Weight "None". Grace reported Chloe, Ava, Ivan, Kofi, Milo, with three
people in between and four introductions. That is the answer key's only chain of that length.
The last screen (`13.png`) shows the follow-up answer: "Path 5 nodes, 4 edges", Nodes in order
Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, From "Ben", To "Nora", Weight "None", ran Oct 10, 5:52:44 PM.
She reported Ben, Theo, Ravi, Pia, Nora with four introductions, which matches the key. She read
both chains from the inspector's Nodes in order list, not from the drawing, so she named no node
that only overlaps the path (Jada on the main chain, Quinn on the follow-up). She took no detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), which is the frozen build named at the
top of the criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank colors and sizes
the nodes). Tool commit `acf3894e2c56`, with no uncommitted changes.

## The answer against the key

- **Main chain (right).** `08.png`, as above. Grace's reading "5 nodes includes Chloe and Milo,
  4 edges = 4 introductions" is correct.
- **Follow-up chain (right).** `13.png`, as above. The key's follow-up answer is Ben, Theo, Ravi,
  Pia, Nora, with 5 nodes and 4 edges.
- **Ranking kept.** `work.json` shows the PageRank run and its Influence layer at the start and at
  the end. It added one `shortest_path` run and its two layers, and nothing is gone. The key and
  the left list still show PageRank (20) on `13.png`.
- **Follow All.** She left the default and gave a reason ("introductions go both ways"). The key
  accepts All, because running together goes both ways.

## Measures

- **Steps, main prompt:** 7 `real.mjs` steps after the start (`02.png` to `08.png`), against the
  success path's 4. The extra steps are her route: the Analyze button, a typed "path" filter and a
  click on Shortest path take 3 steps, where the `p` key takes 1. Typing and picking each name were
  also separate steps. Every step went forward. About 1.75x the success path count.
- **Steps, follow-up:** 5 (`09.png` to `13.png`). She reopened Shortest path from Recent in one
  click.
- **Wrong turns:** 0.
- **False "done":** none. Both "done" claims match what is on screen. truth-on-screen holds.
- **Ease (from the transcript):** 6 of 7. It does not count toward the grade.
- **Silent commit:** the second run replaced the first with no notice (problem 1). Grace saw it
  and had already written the first chain down, so it did not cost her the answer.
- **Numbers that disagree:** none. The left row's "4 hops", the Summary's "4 edges" and the 4 black
  ties drawn all agree.
- **Broken habit:** none. Her history's first move, the analysis button, led on to the task.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, and `leaks.json` shows
  no leaks.
- **Scripted exit:** not applicable, because she finished.

## Problems

| #   | Severity | Kind            | Problem | Evidence |
| --- | -------- | --------------- | ------- | -------- |
| 1   | 2        | silent-replace  | Running Shortest path a second time replaces the first run. The left list keeps one "Shortest path 4 hops" row, the Chloe to Milo chain is gone, and nothing says so. A user who wants both chains side by side has to note the first one or run it again. | `08.png` against `13.png` (one row, new From and To); `work.json` (one `shortest_path` run at the end); transcript step 12 and end |
| 2   | 2        | wording         | The answer is given only as "4 hops" (left list) and "5 nodes, 4 edges" (Summary). It never says how many are in between or how many steps. Grace had to work out that edges are introductions and that the node count includes both ends. | `08.png`, `13.png`; transcript end |
| 3   | 1        | discoverability | The first screen of the Analyze list shows only rankings. Grace found Shortest path only by typing "path" in the filter, and Betweenness, Edge betweenness and All-pairs distance were listed above it. | `02.png`, `03.png`; transcript steps 1-2 |
| 4   | 1        | wording         | The weight note 'Each edge counts as 1; "weight" has no meaning set.' reads like an error to her, although she understood it. | `04.png`, `13.png`; transcript end |
| 5   | 1        | legibility      | No names are drawn on the nodes in the ranked start, so the black path on the drawing cannot be read on its own. She relied on Nodes in order. | `01.png`, `13.png`; transcript end |

No problem is severity 3 or 4. Both answers were right and complete, and every difficulty
was on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person, so a pass here is weak evidence.
