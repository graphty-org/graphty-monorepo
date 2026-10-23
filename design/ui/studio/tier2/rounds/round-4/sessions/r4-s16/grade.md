# Grade: session r4-s16 -- Dana (regular analyst), Florentine families (T18 B), the fewest families in between

**Grade: S** (success). The main answer is right and was read off the run's Values, not the
drawing. After Find path, the inspector reads "Path 5 nodes, 4 edges" and "Nodes in order"
Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5, with Made with From "Strozzi", To "Pazzi",
Weight "None" and "Each edge counts as 1." under it (`09.png`). Dana answered "Strozzi -> Ridolfi
-> Medici -> Salviati -> Pazzi (4 hops)", the key's chain and count. The follow-up is right too:
the last screen (`14.png`) reads Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5, "5 nodes,
4 edges", From "Peruzzi", To "Ginori", and Dana answered that chain. No detour: every step moved
toward the answer.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes colored and
sized by it, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Main chain (right).** `09.png`, as above. The Graph tree row reads "Shortest path 4 hops"; the
  five nodes and four ties are black on the orange drawing; the legend's one "Shortest path" row
  sits over "Size: PageRank" and "Color: PageRank", as the key describes for this build.
- **Follow-up chain (right).** `14.png`, as above, Ran "Oct 11, 3:12:49 AM" against the first
  run's "3:11:58 AM" (`09.png`).
- **The Castellani overlap trap.** On `14.png` the highlighted tie from Peruzzi (about 697,715) up
  to Bischeri (about 720,557) passes straight through Castellani, an orange node not on the path
  (about 713,604). Dana did not read the drawing at all ("I relied entirely on the list on the
  right") and did not name Castellani.
- **Work kept.** `work.json`: the PageRank run and its Influence layer are still there at the end;
  the end adds one Shortest path run (label "Shortest route") and its two layers. Nothing gone.
  The first Shortest path run was replaced by the second, which the key lists as known behavior;
  Dana had noted the first answer before running the second.

## Measures

- **Route:** Analyze button, filter "path", Shortest path, From (type, pick), To (type, pick), Find
  path. The `p` shortcut was not used. The follow-up reopened Shortest path from Analyze's Recent
  list (`10.png`), which came back with empty From and To (`11.png`).
- **Steps:** 8 `real.mjs` steps after the start to the main answer (`02.png` to `09.png`), against
  the key's 4 actions (5 screenshots on the key's own walk because typing and picking are separate
  steps). The extra steps are the Analyze route (open, filter, pick: 3 steps where `p` is 1); none
  is a wrong turn. Follow-up: 5 steps (`10.png` to `14.png`).
- **Wrong turns:** 0.
- **False "done":** none. Both "That is the answer" claims are true on the screen at that moment
  (`09.png`, `14.png`). truth-on-screen: holds.
- **Silent commit:** none. Each pick moved focus on and showed the name in the box (`06.png`,
  `08.png`); Find path closed the popover and opened the run.
- **Numbers that disagree:** none. "4 hops" in the tree, "5 nodes, 4 edges" in Summary and five
  rows in Nodes in order agree.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, `session.log` and
  `setup.log` are empty (no script, console or request errors), and `leaks.json` shows no leaks
  over 34 calls.
- **Scripted exit:** not applicable; Dana finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | data-loss       | Running a second shortest path replaces the first with no warning: the tree keeps one "Shortest path 4 hops" row, and the first chain is gone from the drawing and the inspector. Only the Ran time changes. Dana had written the first chain down, so it cost nothing here, but she said she would not know how to keep both for a comparison. | `09.png` against `14.png` (same tree row, new chain, Ran 3:11:58 to 3:12:49); `work.json` end lists one shortest_path run; transcript step 13 |
| 2   | 2        | visual          | No names are drawn on the nodes, so the highlighted path cannot be read on the drawing: Dana "could not tell which black circle was the Strozzi". The answer had to come from the list. On the follow-up the Peruzzi-Bischeri tie also runs straight through Castellani, an off-path node, which would mislead anyone reading the drawing. | `09.png`, `14.png` (no labels; tie through Castellani at about 713,604); transcript end                                                       |
| 3   | 1        | visual          | The one-item suggestion list under To covers the Weight label and the top of its box while it is open.                                                                                                                                                                                       | `13.png` (the Ginori option over the Weight row, "None" showing below it)                                                                      |
| 4   | 1        | legibility      | The small gray subtitle text in the inspector header ("Path", "ran Oct 11, ...") is hard to read; Dana named it.                                                                                                                                                                              | `09.png`, `14.png` (header at about y 73); transcript end                                                                                      |
| 5   | 1        | wording         | "Weight: None" and "Each edge counts as 1." use the word "edge", which Dana would not have understood without the line beside it. Opinion; it did not change her choice.                                                                                                                         | `08.png`, `09.png`; transcript end                                                                                                             |

Problems 3 to 5 rest on one participant here. Problem 1 is known on this build (the answer key's
follow-up notes) and problem 2's no-names start and Castellani overlap are known too; this session
adds one more participant who met them. Dana's remark about where to get supplier data is outside
the task's question and is not a problem of the build.
