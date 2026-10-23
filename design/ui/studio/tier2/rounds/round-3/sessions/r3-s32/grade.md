# Grade: session r3-s32 -- Tom (tier 1 graduate), Florentine families (T18 B), the fewest people in between

**Grade: S** (success). The main answer was read off the run's Values (`09.png`): Summary "Path 5
nodes, 4 edges"; Nodes in order Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; Made with
From "Strozzi", To "Pazzi", Weight "None", "Each edge counts as 1." This is the key's chain, the
only one of that length. The last screen (`14.png`) holds the follow-up, also right: Peruzzi 1,
Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5, "5 nodes, 4 edges", Made with From "Peruzzi", To
"Ginori", Weight "None". The Graph tree row reads "Shortest path 4 hops". No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes sized and
colored by PageRank, no names drawn). Tool commit `acf3894e2c56`, no uncommitted changes.
`session.log` empty (no script, console or request errors); leaks.json shows no leaks.

## The answer against the key

- **Main chain (right).** Strozzi, Ridolfi, Medici, Salviati, Pazzi, with the count (5 nodes, 4
  edges, which the key accepts as 5 people in the chain), read from Nodes in order, not from the
  drawing. Weight left on "None", so each marriage counts 1, as the task asks.
- **Follow-up (right).** Peruzzi, Bischeri, Guadagni, Albizzi, Ginori, 5 nodes, 4 edges, matching
  the key's follow-up answer.
- **Castellani overlap.** On `14.png` the highlighted Peruzzi-Bischeri tie passes through the
  orange Castellani node (about 713,604). Tom did not name it; he read the chain from the list.
- **work.json** agrees: one new run, `shortest_path` (label "Shortest route"), plus its node and
  edge layers; the PageRank run and its layer are still there; nothing gone.

## Measures

- **Steps (main prompt):** 8 `real.mjs` steps after the start (`02.png` to `09.png`). The key's
  success path counts 4 (it merges typing and picking); Tom spent 3 extra on the analysis button
  plus a typed filter plus a click on Shortest path in place of the `p` key, and typed and picked
  in separate steps. Not a detour: every step moved forward.
- **Steps (follow-up):** 5 (`10.png` to `14.png`), using the analysis list's Recent entry. Within
  the follow-up target (success path + 1).
- **Wrong turns:** 0, main and follow-up.
- **False "done":** none. Both "done" claims are true on screen (`09.png`, `14.png`).
  truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Broken habit:** none. The analysis button his history names led on to the task.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                       | Evidence                                                                                                               |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | state-loss      | The second Find path silently replaced the first route: the Graph tree keeps one "Shortest path 4 hops" row, and the Strozzi-Pazzi chain is gone from the drawing and the inspector. Nothing warned him or offered to keep it. | `09.png` against `14.png` (one row, new chain only); transcript step 14 and end: "nothing told me it would go away"    |
| 2   | 1        | discoverability | The analysis list opens on ranking analyses whose descriptions all mention "shortest paths"; he found the single-route analysis only after typing "path" into the filter.                                                       | `02.png`, `03.png`; transcript step 2 and end                                                                          |
| 3   | 1        | legibility      | No family names are drawn on the nodes, so the black route cannot be checked against the drawing; he had to trust Nodes in order. The Peruzzi-Bischeri tie also passes through Castellani, a node not on the path.             | `09.png`, `14.png` (Castellani about 713,604); transcript end                                                          |
| 4   | 0        | feedback        | Picking From moved focus to To with only a thin blue outline as the sign; he noticed it, and it helped.                                                                                                                       | `06.png`; transcript step 6 and end                                                                                    |

No severity 3 or 4: both answers were right and read from the run's own list; the replaced route
cost nothing here because he had written the first answer down.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
