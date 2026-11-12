# Grade: session r2-s26 -- Ruth (returning), Florentine families (T18 B), the fewest people in between

**Grade: SD** (success after a detour) on the prompt; the follow-up is right too. Ruth's answer to
the prompt, "Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi ... through the Ridolfi, the Medici
and the Salviati", matches the key (the only chain of that length). She declared it done at
`05.png` after working it out by hand from four find-box lookups (each family's list of ties) and
an elimination argument on paper; she did not use the path tool for the prompt. The key's S needs
the chain read off the run's Values (or the drawing with names on); a right chain reached another
way is "right chain after a detour", so SD. It is not F: nothing was guessed from an unnamed
drawing -- every tie she used is printed by name in the find box (`02.png` to `05.png`) and the
chain is correct.

The last screenshot (`20.png`) is the key's end state for the prompt, reached later when she
re-checked her pencil work with the tool: Shortest path Values, Summary "Path 5 nodes, 4 edges",
Nodes in order Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; Made with Analysis "Shortest
path", Ran "Oct 9, 8:18:47 PM", From "Strozzi", To "Pazzi", Weight "None" with "Each edge counts as
1." under it; no Follow row (undirected); the tree row "Shortest path 4 hops"; the legend
"Shortest path" over "On the path"; five black nodes and four black ties.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, size and color by PageRank).

## The answer against the key

- **Prompt chain (right).** Strozzi, Ridolfi, Medici, Salviati, Pazzi; three families between,
  four marriages. Derived by hand at `05.png`, confirmed on the Values at `20.png`.
- **Her elimination is sound.** Pazzi's only tie is Salviati (`03.png`); Salviati's are Medici and
  Pazzi (`04.png`); Medici's include Ridolfi (`05.png`), which is one of Strozzi's four
  (`02.png`); no Strozzi tie reaches Salviati, so no shorter chain exists.
- **Follow-up (right).** Peruzzi, Bischeri, Guadagni, Albizzi, Ginori, "5 nodes, 4 edges", read off
  the Values (`14.png`), matching the key. Her own checks hold: Albizzi -- Ginori (`06.png`),
  Peruzzi -- Bischeri and Bischeri -- Guadagni (`15.png`).
- **Overlap trap.** The highlighted Peruzzi-Bischeri tie runs through Castellani on the drawing
  (`14.png`, about 713,604); she read the chain from the list and did not name Castellani.
- **Settings.** Weight left on None, with the reason "marriages have no weight; I want the fewest
  families" (transcript step 13). Right for this task.

## Route

Prompt: find box Strozzi (`02.png`), Pazzi (`03.png`), Salviati (`04.png`), Medici (`05.png`),
then the chain worked out on paper. Follow-up: find box Ginori (`06.png`); Analyze (`07.png`, a
list of ranking measures with nothing about two nodes in its first screen); filter "linked"
(`08.png`: only Louvain, marked "Start here", and Leiden -- abandoned); filter "between" (`09.png`:
"Shortest path -- The fewest steps, or the shortest path by weight, between two nodes"); Shortest
path (`10.png`); From Peruzzi (`11.png`, `12.png`, focus moved on to To); To Ginori (`13.png`);
Find path (`14.png`); find box Bischeri as a check (`15.png`). Re-check of the prompt: Analyze,
Shortest path under Recent (`16.png`, `17.png`), Strozzi to Pazzi (`18.png` to `20.png`).

## Measures

- **Steps:** prompt, 4 screenshots after the start (`02.png` to `05.png`), all find-box lookups;
  the path tool was not used for it. Follow-up, 9 screenshots to the answer (`06.png` to
  `14.png`) plus 1 check (`15.png`); the key's success path is 4 to 5 (open the form, two picks,
  Find path), so the follow-up target (success path + 1, 0 wrong turns) is missed. Prompt
  re-check with the tool: 5 (`16.png` to `20.png`), outside the task.
- **Wrong turns:** 1, on the follow-up: the filter word "linked" (`08.png`) found only the grouping
  methods and was abandoned. The prompt's find-box route is the detour that makes this SD, not a
  wrong turn: it was not undone or abandoned, it produced the answer.
- **Broken habit:** none scored. Her history's first move, the find box, gave her enough (each
  family's ties by name) to finish by hand, so it did not dead-end. It also gives no way on to
  the path tool (problem 1).
- **False "done":** none. The prompt's "done" at `05.png` named the right chain. Her later claims
  -- the second run replaced the first, one "Shortest path, 4 hops" row, the first chain shown
  nowhere -- are what the screen shows (`14.png` against `20.png`) and what the key records.
  truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Each Find path drew the chain, added the legend entry and the
  tree row, and opened the Values at once (`14.png`, `20.png`).
- **Numbers that disagree (bar 5):** none. "4 hops", "5 nodes, 4 edges" and the five numbered rows
  agree with each other and with the black chain.
- **Earlier work (bar 2):** `work.json` lists nothing gone: the PageRank run and its three layers
  are kept; one Shortest path run with its two layers was added. The second run replaced the
  follow-up's chain (problem 3); she had it on paper, so it is not scored `work-lost`.
- **Build-decided:** no. Every control behaved as the answer key describes this build; no
  screenshot shows an error, a broken control or a value the key does not predict. Nothing in
  this session is an implementation fault of the app.
- **Void:** no. Every step printed its screenshot; `session.log` is empty; no tool error.
- **Run irregularity (not a void).** The follow-up is supposed to come from the tool at the first
  `--end` (`../tool/README.md`, "The follow-up"). Here the facilitator gave it right after
  `05.png`, word for word from the task, and the participant answered it in steps 6 to 15;
  `session.json` records the tool giving it only at the end (03:19:06 UTC, after `20.png`), so
  `--end` was run twice. The wording was the same and the prompt's grade does not depend on it,
  but the follow-up was issued outside the tool's control.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                            | Evidence                                                              |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | 2        | discoverability | A returning user who starts where her history does (the find box, a family's list of ties) gets no hint that the program can find the chain between two families. Ruth answered the whole prompt by hand and elimination; she said it would take an evening on her real list. The tool was only found on the second question. | `02.png` to `05.png`; transcript step 5 and wrap-up item 1            |
| 2   | 2        | discoverability | In Analyze, the first screen is ranking measures that score everyone; Shortest path is below the fold. Her own word "linked" found only Louvain (tagged "Start here") and Leiden; only "between" matched Shortest path's description. One wrong turn.                                                                  | `07.png`, `08.png`, `09.png`; transcript steps 7 to 9                  |
| 3   | 2        | persistence     | A second Find path replaces the first chain without a word: the drawing, the Values and the single "Shortest path 4 hops" tree row all switch. A reporter who wants both chains for an editor loses the first unless she wrote it down.                                                                              | `14.png` against `20.png`; `work.json` (one shortest_path run); step 20 |
| 4   | 1        | comprehension   | "Guided route -- Select 2 nodes first" sits grayed beside Shortest path with no word on how it differs; she ignored it.                                                                                                                                                                                             | `09.png`; wrap-up item 5                                              |
| 5   | 1        | legibility      | No names are drawn on the dots, so the black chain names nobody; only the Values list does. The Peruzzi-Bischeri tie is drawn straight through Castellani, a node not on the chain; she did not misread it because she read the list.                                                                               | `14.png` (about 713,604), `20.png`; wrap-up item 6                    |
| 6   | 1        | vocabulary      | "Shortest path", "5 nodes, 4 edges" and "4 hops" are not her words for families and marriages; the description line under Shortest path was, and decided her choice.                                                                                                                                               | `09.png`, `14.png`; wrap-up item 3                                    |

No severity 3 or 4: both answers were right, and every problem cost steps or confidence on a task
she completed. None is an implementation fault of the build; all six are design questions. The
two discoverability problems (1 and 2) are the reason the prompt is SD rather than S.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
