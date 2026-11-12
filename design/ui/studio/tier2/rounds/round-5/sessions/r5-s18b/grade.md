# Grade: session r5-s18b -- Nadia (tier 1 graduate, returning), Florentine families (T18 B), the fewest families in between

**Grade: SD** (success after a detour) on the prompt; the follow-up is right too. Nadia's answer,
"Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (passes through Ridolfi, Medici, Salviati)",
is the key's chain: 4 marriages, 3 families in between, the only chain of that length. She worked
it out by hand from four find-box lookups (each family's ties, printed by name) and an
elimination argument, and never opened the path tool. The key's S needs the chain read off the
Shortest path run's Values or off the drawing with names on; a right chain reached another way is
"right chain after a detour", so SD. It is not F: nothing was guessed from the unnamed drawing --
every tie she used is printed by name in the find box (`02.png` to `05.png`). This is the same
grading as the earlier find-box sessions on this task (`../../../round-3/sessions/r3-s26/grade.md`,
`../../../round-2/sessions/r2-s26/grade.md`).

Last screenshot (`09.png`): the find box holds "Guadagni", listing Nodes 1 (Guadagni) and Edges 4
(Tornabuoni -- Guadagni, Albizzi -- Guadagni, Bischeri -- Guadagni, Guadagni -- Lamberteschi); the
drawing is the setup's PageRank picture, unchanged, with no names drawn; the inspector still shows
the PageRank run's Style tab. No Shortest path run exists (`work.json`: runs, layers, notes, steps
and sources are the same at start and end; `gone` is empty).

Build seen: `8c015b806086 graphty@0.8.65` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, no uncommitted changes, tool commit `0340fb332c5e`. Start: the ranked
Florentine setup (PageRank run, nodes colored and sized by PageRank, the run's Style tab open).

## The answer against the key

- **Prompt chain (right).** Strozzi, Ridolfi, Medici, Salviati, Pazzi. Each tie she used is on
  screen: Strozzi's four ties, Castellani, Peruzzi, Ridolfi, Bischeri (`02.png`); Pazzi's only tie,
  Salviati (`03.png`); Salviati's two, Medici and Pazzi (`04.png`); Medici's six, including Ridolfi
  and Salviati (`05.png`). Her minimality argument holds: Pazzi reaches only Salviati, Salviati's
  only other tie is Medici, and Medici is not one of Strozzi's four, so no chain is shorter.
- **Count (right).** "Passes through Ridolfi, Medici, Salviati" -- 3 families in between, which
  the key accepts.
- **Follow-up (right).** Peruzzi, Bischeri, Guadagni, Albizzi, Ginori, the key's chain. Ginori's
  only tie Albizzi (`06.png`), Albizzi's three including Guadagni (`07.png`), Peruzzi's three
  including Bischeri (`08.png`), Guadagni's four including Bischeri (`09.png`). Her argument that
  none of Albizzi's other ties (Medici, Guadagni) is a Peruzzi tie, so at least two families sit
  between Peruzzi and Albizzi, holds.
- **Traps.** The Peruzzi-Bischeri tie drawn through Castellani: not met, no path was drawn. She
  did not read anything off the drawing.

## Measures

- **Route:** the find box only, one family at a time, working back from the end with a single tie.
- **Steps:** prompt, 4 screenshots after the start (`02.png` to `05.png`); the key's success path
  is 4, so level on count, but on a route the key does not grade as S. Follow-up, 4 (`06.png` to
  `09.png`); the follow-up target (success path + 1, 0 wrong turns) is met on count.
- **Wrong turns:** 0. The find-box route is the detour that makes this SD, not a wrong turn: it
  was never undone or abandoned, and it produced both answers.
- **False "done":** none. Both "done" claims named the right chain. Her debrief claims hold on
  screen: "the dots on the picture have no names" (no names drawn in any screenshot); "each search
  replaces the last list" (one family's list at a time, `02.png` to `09.png`).
  truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit:** none; no run, step or note was made.
- **Numbers that disagree:** none. Each find-box "Edges N" header matches its row count.
- **Earlier work:** the PageRank run and its three layers are kept (`work.json`, `gone` empty).
- **Build-decided:** no. Every control behaved as the key describes this build.
- **Void:** no. Every step wrote its screenshot; `session.log` is empty; `leaks.json` lists no
  leaks; the follow-up was given by the tool at the first `--end` (session.json `followUp`).

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                  | Evidence                                                |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | 2        | discoverability | A returning user who starts where her history does (the find box, one family's ties) gets no hint that the program can work out the chain between two families. Nadia answered both questions by hand and said "if it exists, nothing on this screen pointed me at it". The same find-box route on the same prompt was taken in round 2 and round 3: confirmed. | `02.png` to `09.png`; debrief item 1                    |
| 2   | 2        | feedback        | A find-box hit marks nothing on the drawing and no names are drawn, so the picture cannot help follow the chain: across all eight lookups the drawing area is unchanged from the start.                                                                                                                                                 | `01.png` against `05.png`, `09.png`; debrief item 3     |
| 3   | 1        | evidence        | Nothing on screen proves the chain is the fewest; the proof is her own elimination, and she has nothing to paste into the case file. Opinion, held one level down; it follows from problem 1, since the path run's Values and drawn chain would be the shareable proof.                                                                     | debrief item 2                                          |
| 4   | 1        | memory load     | Each search replaces the last list, so she held Strozzi's four ties in her head while reading Medici's six. Opinion, held one level down.                                                                                                                                                                                                  | `02.png` to `05.png`; debrief item 4                    |

No severity 3 or 4: both answers were right and every problem cost confidence or effort on a task
she completed. None is an implementation fault of the build; all four are design questions.
Problem 1 is why the prompt is SD rather than S.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
