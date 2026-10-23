# Grade: session r3-s26 -- Nadia (tier 1 graduate, returning), Florentine families (T18 B), the fewest people in between

**Grade: SD** (success after a detour) on the prompt; the follow-up is right too. Nadia's answer,
"Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (it passes through Ridolfi, Medici, Salviati)",
matches the key: 4 marriages, 3 families in between, the only chain of that length. She worked it
out by hand from four find-box lookups (each family's list of ties, printed by name) and an
elimination argument, and never opened the path tool. The key's S needs the chain read off the
Shortest path run's Values or off the drawing with names on; a right chain reached another way is
"right chain after a detour", so SD. It is not F: nothing was guessed from the unnamed drawing --
every tie she used is printed by name in the find box (`02.png` to `05.png`). This is the same
grading as the earlier find-box session on this task (`../../../round-2/sessions/r2-s26/grade.md`).

Last screenshot (`09.png`): the find box holds "Bischeri", listing Nodes 1 (Bischeri) and Edges 3
(Peruzzi -- Bischeri, Strozzi -- Bischeri, Bischeri -- Guadagni); the drawing is the setup's
PageRank picture, unchanged; the inspector still shows the PageRank run's Style tab. No Shortest
path run exists (`work.json`: runs, layers, notes and steps are the same at start and end).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: setup `florentine-ranked.txt`.

## The answer against the key

- **Prompt chain (right).** Strozzi, Ridolfi, Medici, Salviati, Pazzi. Her elimination is sound:
  Pazzi's only tie is Salviati (`03.png`); Salviati's are Medici and Pazzi (`04.png`); Medici's six
  include Ridolfi (`05.png`), one of Strozzi's four (`02.png`: Castellani, Peruzzi, Ridolfi,
  Bischeri); Strozzi has no tie to Medici or Salviati, so no shorter chain exists.
- **Follow-up (right).** Peruzzi, Bischeri, Guadagni, Albizzi, Ginori, matching the key. Each tie
  is on screen: Peruzzi's three (`06.png`), Ginori's only tie Albizzi (`07.png`), Albizzi's three
  including Guadagni (`08.png`), Bischeri's three including Peruzzi and Guadagni (`09.png`). Her
  minimality argument (none of Albizzi's ties is a Peruzzi tie, so at least three in between)
  holds.
- **Overlap trap (Castellani on the drawn Peruzzi-Bischeri tie).** Not met: no path was drawn, and
  she read only lists.

## Measures

- **Steps:** prompt, 4 screenshots after the start (`02.png` to `05.png`), all find-box lookups.
  The key's success path is 4 (open the form, two picks, Find path), so the step count is level
  with it, but on a route the key does not grade as S. Follow-up, 4 (`06.png` to `09.png`); the
  follow-up target (success path + 1, 0 wrong turns) is met on count.
- **Wrong turns:** 0. The find-box route is the detour that makes this SD, not a wrong turn: it was
  never undone or abandoned, and it produced both answers. In the follow-up she noted a longer
  route (via Strozzi, Ridolfi, Medici) and checked Bischeri before answering; that check found the
  answer, so it is not a wrong turn.
- **Broken habit:** none. Her history's routine (look up one family, read its ties, write the chain
  down) worked end to end; it also never led her to the path tool (problem 1).
- **False "done":** none. Both "done" claims named the right chain. Her debrief claims hold on
  screen: "the picture never changed while I searched" -- the drawing area of `05.png` is
  pixel-identical to `01.png`; "no names on the circles" -- none are drawn in any screenshot.
  truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none on a success path; no commit was made (no run, no step, no note).
- **Numbers that disagree (bar 5):** none. Each find-box "Edges N" header matches its row count
  (4, 1, 2, 6, 3, 1, 3, 3).
- **Earlier work:** `work.json` lists nothing gone; the PageRank run and its three layers are kept.
- **Build-decided:** no. Every control behaved as the key describes this build; no error, broken
  control or unexpected value appears.
- **Void:** no. Every step printed its screenshot; `session.log` is empty; `leaks.json` lists no
  leaks; the follow-up was given by the tool at the first `--end` (session.json `followUp`), word
  for word as in `tasks.md`.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                 |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 2        | discoverability | A returning user who starts where her history does (the find box, one family's list of ties) gets no hint that the program can work out the chain between two families. Nadia answered both questions by hand, four lookups each, and said "If the program can do that, nothing on the screen told me." Seen also in round 2 (Ruth, `r2-s26`, the same find-box route on the same prompt): confirmed, 2 participants. | `02.png` to `09.png`; transcript wrap-up item 1                          |
| 2   | 2        | feedback        | A find-box hit marks nothing on the drawing: with Medici's row highlighted in the list, the drawing is pixel-identical to the start, and the inspector still shows PageRank. With no names drawn either, the picture cannot help her follow the chain, and she said she would have to make the alert-file picture by hand.                                                                                       | `05.png` against `01.png` (drawing area identical); wrap-up item 2       |
| 3   | 1        | evidence        | Nothing on screen proves the chain is the fewest; the proof is her own elimination. She expects QA to ask and has only her notes to show. Opinion, held one level down; it follows from problem 1, since the path run's Values and drawn chain would be the shareable proof.                                                                                                                                    | wrap-up item 3                                                           |
| 4   | 1        | memory load     | Each new search replaces the last list, so she held earlier families' ties in her head between lookups. Opinion, held one level down.                                                                                                                                                                                                                                                                          | `02.png` to `09.png` (one list at a time); wrap-up item 4                |

No severity 3 or 4: both answers were right and every problem cost confidence or effort on a task
she completed. None is an implementation fault of the build; all four are design questions.
Problem 1 is why the prompt is SD rather than S.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
