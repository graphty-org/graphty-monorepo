# Grade: session r5-s24b -- Tom (tier 1 graduate), Florentine families (T18 B), the fewest families in between

**Grade: SD** (success after a detour). Both answers are right and match the answer key's only
chain of that length: Strozzi, Ridolfi, Medici, Salviati, Pazzi (3 families in between), and for
the follow-up Peruzzi, Bischeri, Guadagni, Albizzi, Ginori. Tom never ran Shortest path and never
opened the path popover. He worked out each chain by hand from the find box's lists of a family's
ties, one family at a time. The key's S needs the chain read off the run's Values or off the
drawing with names on; a chain assembled from the find box's tie lists is graded SD, as the same
route was in round 2 (session r2-s32). It is not F: every tie he used is on a screen he took,
nothing was guessed from the drawing (which has no names), and neither chain is longer than the
shortest.

Build seen: `8c015b806086 graphty@0.8.65` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `753bae997bc6`, no uncommitted changes. Start: setup
`florentine-ranked.txt` (PageRank run, nodes colored and sized by it, no names drawn, `01.png`).
`session.log` is empty: no script, console or request errors. `leaks.json`: no leaks over 21 calls.
Not void.

## The answer against the key

- **Main prompt (right).** The lists on screen: Strozzi's four ties, Castellani, Peruzzi, Ridolfi,
  Bischeri (`02.png`); the Pazzi's one, Salviati (`03.png`); the Salviati's two, Medici and Pazzi
  (`04.png`); the Medici's six, Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati, with
  no Strozzi (`05.png`). His argument that nothing shorter exists is sound from those lists: any
  chain must end Medici, Salviati, Pazzi, and the Strozzi are not tied to the Medici.
- **Follow-up (right).** Ginori's one tie, Albizzi (`06.png`); Albizzi's three, Medici, Ginori,
  Guadagni (`07.png`); Peruzzi's three, Castellani, Strozzi, Bischeri (`08.png`); Guadagni's four,
  Tornabuoni, Albizzi, Bischeri, Lamberteschi (`09.png`, the last screenshot). His minimality
  argument holds: no Peruzzi tie is Albizzi, and of Albizzi's other ties only Guadagni meets a
  Peruzzi tie (Bischeri); the Medici list in `05.png` holds none of Castellani, Strozzi or Bischeri,
  so the chain is also the only one of that length.
- **The last screenshot** shows only Guadagni's ties, not the whole chain; no screen in the session
  shows either chain as one. The grade rests on the transcript's reasoning checked against every
  list it cites, all of which are on screen and agree with the key.
- **Known traps not met.** The Castellani overlap on the drawn Peruzzi-Bischeri tie never applied:
  no run was made, so nothing was highlighted, and he never read the drawing.
- **Work kept.** `work.json`: start and end identical (one PageRank run, three layers, one source,
  no notes, no steps); nothing gone. He changed nothing.

## Measures

- **Steps, main prompt:** 4 `real.mjs` steps after the start (`02.png` to `05.png`), equal to the
  key's count of 4, by a route the key does not list.
- **Steps, follow-up:** 4 (`06.png` to `09.png`); the second-time target (the follow-up's success
  path + 1, 0 wrong turns) holds on steps.
- **Wrong turns:** 0. Every look-up moved him on.
- **Broken habit:** none. The find box is not named in Tom's history (`roster.md`, Tom), but it
  gave him what he looked for on his first move.
- **"From" field straight after reading the prompt:** no; first move was the find box.
- **Door used for Path:** none (no `p`, no node menu, no Analyze). Never found the analysis: yes.
  He did not look for a tool that works out the chain ("nothing told me whether I had the shortest
  way").
- **False "done":** none. Both "done" claims name the right chain. His wrap-up claims hold on
  screen: no names on the nodes (`01.png` to `09.png`); typing a family marks nothing on the
  drawing (`02.png` to `09.png`, drawing pixel-for-pixel the same layout with no halo). truth-on-
  screen holds in the sense that each link of each chain is on a screen he took.
- **Silent commit (bar 4):** none; he changed nothing.
- **Earlier work kept (bar 2):** yes; `work.json` shows nothing gone.
- **Numbers that disagree (bar 5):** none seen.
- **Wrong weight reading without a sign (bar 7b):** not applicable; the path popover was never
  opened.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot; the first `--end`
  delivered the follow-up prompt (session.json `followUp`), the second closed the session (exit 0).
- **Participant priming:** none found. The briefing does not mention Shortest path, the path
  popover or the find box.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Nothing on the screen he worked in (the find box, its lists of ties, the PageRank inspector) points to Shortest path. He solved a path question as a hand puzzle and was left unsure the chain was the fewest ("if I'd missed one I'd never know. I'd be nervous saying it out loud in lab meeting"). Nothing in a family's list of ties offers a path from here. Seen also in r2-s32 (Elena, same half): confirmed. | `02.png` to `09.png` (no path entry near the lists); transcript, "What confused me"                                                       |
| 2   | 1        | legibility      | No names are drawn on the nodes, so the drawing gave him nothing; he could not tell which ball is the Strozzi or the Pazzi and worked "like working it out from an Excel sheet".                                                                                                                                                                                                                | `01.png` to `09.png`; transcript, "What confused me"                                                                                      |
| 3   | 1        | feedback        | Typing a name lists the node with its row highlighted but marks nothing on the drawing, so the list gives no clue where the family sits. Seen also in r2-s32: confirmed.                                                                                                                                                                                                                        | `02.png` (Strozzi row highlighted, no halo on the drawing; drawing unchanged from `01.png`); transcript: "nothing lit up on the picture" |
| 4   | 1        | wording         | The start's legend and inspector say "PageRank" with bare numbers (0.03066 to 0.1458) and no plain meaning; he did not know what it was and ignored it. Opinion only, held one level down from 2.                                                                                                                                                                                              | `01.png` legend; transcript                                                                                                               |

No severity 3 or 4: both chains were right and the doubt he raised did not lead to a wrong answer.
Problem 1 is the one that matters for a returning user: the answer was reachable without the
analysis only because the Florentine graph is small and the end families have one or two ties.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
