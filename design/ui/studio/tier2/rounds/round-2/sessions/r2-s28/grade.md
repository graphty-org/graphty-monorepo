# Grade: session r2-s28 -- Dana (returning), Florentine families (T18 B), the fewest people in between

**Grade: S** (success), prompt and follow-up both. The last screen of the prompt (`11.png`) is the
Shortest path run's Values: Summary "Path 5 nodes, 4 edges"; Nodes in order Strozzi 1, Ridolfi 2,
Medici 3, Salviati 4, Pazzi 5; Made with Analysis "Shortest path", Ran "Oct 9, 8:18:02 PM", From
"Strozzi", To "Pazzi", Weight "None" with "Each edge counts as 1." under it; the Graph tree row
"Shortest path 4 hops"; the five nodes and four ties black on the orange drawing. Her answer,
"Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi ... three families in between, four handoffs",
is the key's chain and count, read off the Values. The follow-up's last screen (`16.png`, the
session's last screenshot) reads Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5, "5 nodes,
4 edges", From "Peruzzi", To "Ginori", Weight "None", Ran "8:18:46 PM", which is the key's
follow-up answer, and her follow-up answer matches it.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: `florentine-ranked.txt` (PageRank run, nodes colored and sized by PageRank).

## The answer against the key

- **Main chain (right).** Strozzi, Ridolfi, Medici, Salviati, Pazzi; 4 marriages, 3 families in
  between. Read from Nodes in order in `11.png`, not from the drawing.
- **Follow-up chain (right).** Peruzzi, Bischeri, Guadagni, Albizzi, Ginori (`16.png`).
- **Overlap trap (not fallen into).** The key notes that the highlighted Peruzzi-Bischeri tie
  passes straight through Castellani, an orange node not on the path (about 713,604). Dana saw it
  ("the black line ... seems to pass right over an orange dot ... from the picture alone I would
  not be sure whether that orange one is in the chain") and settled it from the table. She did not
  put Castellani in the chain.
- **Weight.** Left on "None"; she read "Each edge counts as 1" as reassurance, not as a warning.
  Not `meaning-wrong`.

## Route

Find box lookups of Strozzi (`02.png`: four marriages) and Pazzi (`03.png`: one, Salviati), then
the analysis button (`04.png`: the list opens on Recent PageRank and "Rank nodes and edges"; no
path entry in view), her own word "chain" in the filter (`05.png`: one hit, Shortest path),
picked it (`06.png`: the Path form), From: typed and picked Strozzi (`07.png`, `08.png`, focus
moved to To), To: typed and picked Pazzi (`09.png`, `10.png`), Find path (`11.png`). Follow-up:
analysis button with Shortest path under Recent (`12.png`), picked it (`13.png`: empty form),
Peruzzi, Ginori, Find path (`14.png` to `16.png`).

## Measures

- **Steps:** prompt, 10 screenshots after the start (`02.png` to `11.png`). The path itself, from
  the analysis button to Find path, is 8 (`04.png` to `11.png`) against the key's 4; the extra 4
  are the analysis route's filter and option click in place of `p`, and typing and picking each
  name as separate steps. Follow-up: 5 screenshots (`12.png` to `16.png`), with two actions
  combined into each of the last two steps; the follow-up bar (success path + 1) holds on actions
  that changed the screen.
- **Wrong turns:** 0 (prompt and follow-up). The two find-box lookups were information gathering
  that she used afterwards to check the result (Pazzi's only marriage is Salviati), not a step
  undone or abandoned off the success path.
- **False "done":** none. Every claim in her answers and debrief (both chains, the counts, "4
  hops", the first chain replaced by the second in the tree) is on screen in `11.png` and
  `16.png`. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Find path drew the chain, added the legend entry "Shortest path
  / On the path" and the tree row, and opened the run's Values.
- **Numbers that disagree (bar 5):** none. "4 hops", "5 nodes, 4 edges" and the five rows agree.
- **Earlier work (bar 2):** `work.json` lists nothing gone: PageRank and its Influence layer are
  kept; one shortest_path run with its two layers was added. The first chain was replaced by the
  second run (problem 2); she had written the first chain down, so it is not scored `work-lost`.
- **Broken habit:** none. Her history names the find box and the analysis button; the find box
  gave her each family's marriages, and the analysis button led to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `session.log` is empty;
  no tool error. The first `--end` re-printed the follow-up prompt that had already been answered,
  and a second `--end` closed the session; this did not change any screen or answer.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                         | Evidence                                                              |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | 2        | discoverability | The analysis list opens on Recent and "Rank nodes and edges" (Degree, Betweenness, Closeness, PageRank, Eigenvector, Katz, HITS, All-pairs distance), with no path entry in view. Dana found Shortest path only by typing her own word, "chain"; she said that scrolling she might have given up and traced by hand from the find box. | `04.png`, `05.png`; transcript step 4 and debrief                     |
| 2   | 2        | persistence     | A second Find path replaces the first chain without a word: the drawing, the Values and the single "Shortest path 4 hops" tree row all switch. For the slide she prepares she wanted both chains and would have had to write the first one down.                                                  | `11.png` vs `16.png`; `work.json` (one shortest_path run); debrief    |
| 3   | 1        | legibility      | The highlighted Peruzzi-Bischeri tie passes straight over Castellani, an orange node not on the path, and no names are drawn, so the drawing cannot say whether that family is in the chain. She settled it from Nodes in order; a reader of the picture alone could not.                         | `16.png` (about 713,604); transcript step 16 and debrief              |
| 4   | 1        | legibility      | No names are drawn on the dots, so the black chain names nobody; Strozzi and Pazzi could be located only through the find box and the Values list.                                                                                                                                                | `01.png`, `11.png`; transcript step 1                                 |
| 5   | 1        | comprehension   | Weight "None" alone made her wonder whether something was being skipped; only the line "Each edge counts as 1." under it in Made with reassured her. She read it correctly.                                                                                                                        | `11.png`; debrief                                                     |

No severity 3 or 4: both answers were right, nothing was lost, and every doubt she raised was
about finding the analysis or reading the drawing on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
