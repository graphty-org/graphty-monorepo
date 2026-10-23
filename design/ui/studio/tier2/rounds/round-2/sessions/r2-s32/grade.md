# Grade: session r2-s32 -- Elena (returning), Florentine families (T18 B), the fewest families in between

**Grade: SD** (success after a detour). Both answers are right and match the answer key's only
chain of that length: Strozzi, Ridolfi, Medici, Salviati, Pazzi (three families in between), and
for the follow-up Peruzzi, Bischeri, Guadagni, Albizzi, Ginori. Elena never ran Shortest path. She
worked out each chain by hand from the find box's lists of ties, one family at a time, holding the
lists in her head. The key's S needs the chain read off the run's Values or off the drawing with
names on; the key grades neighbors read from the find box's ties as SD, and a chain assembled from
those lists is the same kind of reading. It is not F: every tie she used was on screen
(`02.png` to `09.png`), nothing was guessed from the drawing, and the chains are not longer than
the shortest.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes sized and colored by it,
no names drawn, `01.png`). `session.log` is empty: no script, console or request errors. Not void.

## The answer against the key

- **Main prompt (right).** The lists on screen: Strozzi's four ties, Castellani, Peruzzi, Ridolfi,
  Bischeri (`02.png`); the Pazzi's one, Salviati (`03.png`); the Salviati's two, Medici and Pazzi
  (`04.png`); the Medici's six, including Ridolfi and Salviati and not Strozzi (`05.png`). Her
  argument that nothing shorter exists is sound from those lists: any chain must end Medici,
  Salviati, Pazzi, and the Strozzi are not tied to the Medici.
- **Follow-up (right).** Ginori's one tie, Albizzi (`06.png`); Albizzi's three, Medici, Ginori,
  Guadagni (`07.png`); Peruzzi's three, Castellani, Strozzi, Bischeri (`08.png`); Guadagni's four,
  including Bischeri and Albizzi (`09.png`, the last screenshot). Her minimality argument holds
  against the Medici list in `05.png`.
- **The last screenshot** shows only Guadagni's ties, not the whole chain; no screen in the
  session shows either chain as one. The grade rests on the transcript's reasoning checked against
  every list it cites, all of which are on screen and agree with the dataset.
- `work.json`: start and end identical (one PageRank run, three layers, one source); nothing gone,
  and no new run, since she made none.

## Measures

- **Steps, main prompt:** 4 `real.mjs` steps after the start (`02.png` to `05.png`), the same as
  the key's count of 4, by a route the key does not list.
- **Steps, follow-up:** 4 (`06.png` to `09.png`).
- **Wrong turns:** 0. Every look-up moved her on.
- **False "done":** none. Both "done" claims are true. truth-on-screen holds in the sense that each
  link of each chain is on a screen she took; the chain itself is never on one screen.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none; she changed nothing.
- **Earlier work kept (bar 2):** yes; `work.json` shows nothing gone.
- **Numbers that disagree (bar 5):** none seen.
- **Wrong weight reading without a sign (bar 7b):** not applicable; the Path popover was never
  opened.
- **"From" field straight after reading the prompt:** no. First move: the find box, from her
  history ("used the find box to jump to a name", `../../../roster.md`, Elena).
- **Broken habit:** none. The find box, a place her history names, led on to an answer.
- **Never found the analysis:** yes. She did not look for Shortest path and did not know the
  program had one ("I didn't see anything that would just work out the chain for me, and I didn't
  go looking").
- **Implementation defects hit:** none. No error, no control that failed to respond, and every
  find-box screen matches the key's description of its list of ties (`answers.md`, T12R, "The find
  box lists ties too").
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; she finished.
- **Roster note:** the roster's T18 table puts Elena on the running-club half (A), but this session
  ran the Florentine half (B). The grade stands on B's key; the round's tally should count this
  session under B.

## Screens that differ from the answer key

- None. The key's walk never uses the find box for T18; what the find box showed here matches the
  key's find-box notes (lists of ties under "Edges N", a "Values" group below). Typing without
  Enter selects nothing, so no halo appeared on the drawing, consistent with the key (the halo
  comes with Enter).

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Nothing on the screen she worked in (the find box and its lists, the PageRank inspector) points to Shortest path. She solved a path question as a hand puzzle and was left unsure the chain was the fewest; she said she could not do it this way on a larger network. Nothing in the find box's list of a node's ties offers "path from here". | `02.png` to `09.png` (no path entry near the lists); transcript end: "I'm not 100 percent sure it's the fewest" |
| 2   | 1        | legibility      | No names are drawn on the nodes, so the drawing gave her nothing; she "never once looked at the drawing" and could not point at the chain to show a colleague.                                                                                                                                                                                  | `01.png` to `09.png`; transcript end                                                                           |
| 3   | 1        | feedback        | Typing a name lists the node but marks nothing on the drawing until Enter picks it, so the highlighted list row gives no clue where the family sits.                                                                                                                                                                                             | `02.png` (Strozzi row highlighted, no halo on the drawing); transcript end                                      |
| 4   | 1        | wording         | Each tie is written "A -- B" in the dataset's order, so the searched family is sometimes first, sometimes second ("Castellani -- Strozzi", "Strozzi -- Ridolfi"); she had to read both sides of every row to find the other family.                                                                                                              | `02.png`, `05.png`, `09.png`; transcript end                                                                   |

No severity 3 or 4: both chains were right and the doubt she raised did not lead to a wrong
answer. Problem 1 is the one that matters for a returning user: the answer was reachable without
the analysis here only because the Florentine graph is small and its target families have one or
two ties.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
