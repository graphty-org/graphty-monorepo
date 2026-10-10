# Grade: session r1-s24 -- Tom (returning), T18 prompt B (Florentine families)

Build 946256efb876 graphty@0.8.56 (session.json buildStamp matches the frozen build in
`criteria.md`); setup `florentine-ranked.txt`; 18 screenshots, no tool errors, no console or
setup errors logged. Not void.

## Grade: SD

- **Main prompt.** Answer: Strozzi, Ridolfi, Medici, Salviati, Pazzi (three families in between).
  This is the key's only chain of that length. Every tie he used is on screen in the find box's
  edge lists: Strozzi -- Ridolfi (`03.png`), Pazzi's single tie Salviati -- Pazzi (`06.png`),
  Medici -- Ridolfi and Medici -- Salviati (`10.png`). His argument that it is the fewest is
  valid from what he saw: the Pazzi have one tie (Salviati), the Salviati have only the Medici
  besides, and the Strozzi's four ties do not include the Medici.
- **Follow-up.** Answer: Peruzzi, Bischeri, Guadagni, Albizzi, Ginori -- matches the key. Ties on
  screen: Peruzzi's three (`12.png`), Ginori's single tie to Albizzi (`14.png`), Albizzi's three
  (`16.png`), Guadagni -- Bischeri (`18.png`, the last screenshot). The minimality argument
  (none of the Peruzzi's three ties reaches the Medici or the Albizzi) is again correct.
- **Why SD, not S.** S requires the chain read off the run's Values or a drawing with names on.
  Tom never found or used the path feature (no `p`, no "Path between...", no Analyze "Shortest
  path"); he worked a breadth-first search by hand through nine find-box lookups. Right chain
  after a detour is SD. The method holds here only because the Pazzi and Ginori each have a
  single tie; he says himself that with a bigger list he would have got it wrong.
- The last screenshot (`18.png`) shows no run, no path on the drawing and nothing marked; the
  answer lives only in his words. The task asks for an answer, not a saved state, so this does
  not change the grade.

## False "done" claims

None. Both claims of completion match the key, and nothing on screen contradicts them.

## Wrong turns

0 in the sense of a wrong step. Step 05 is a redundant click into a box that already had focus
(harmless). The whole session is one detour of method: the manual search instead of the path
feature.

## Problems

| Sev | Problem | Evidence |
| --- | ------- | -------- |
| 3 | The path feature was not discovered. A returning user who has only ranked before found nothing that offers "the shortest way between these two", and would not explore the analysis button beyond what he had used. The answer was right only because the graph is small with two single-tie ends; on a larger graph this method gives a longer chain without knowing it. | Transcript, "I never found anything that said 'here's the shortest way between these two'"; no path run in any screenshot (`01.png` to `18.png`). |
| 2 | Typing a name in the find box does not mark that node on the drawing, and the drawing has no names, so the drawing cannot be used to trace a chain. | `03.png`, `10.png`, `18.png`: the search lists "Nodes 1" with the family, the drawing is unchanged. Transcript: "I couldn't see that family light up on the picture". |
| 2 | Nothing in the find results leads on from a tie to the next family: he cleared and retyped nine times. Whether clicking an edge row navigates was not tried; nothing suggested it could. | Steps 04 to 18 alternate clear and type; transcript, "I couldn't click a name in a marriage line ... nothing told me I could". |
| 1 | The edge heading says "Edges 4", not a word in the data's terms (marriages). Opinion-only, held one level down. | `03.png`; transcript remark. |
| 1 | The screen never confirms "fewest": the participant carries the proof of minimality himself. Follows from the first problem (a path run reports it). | Transcript, "Being sure it was the shortest was on me." |

## Implementation issues

None seen. No control failed, no wrong count, no build defect, no tool fault: every lookup
returned the right ties (checked against the key's chains). The problems above are about
finding and using features, not about a broken build.

Participant is simulated; a pass is weak evidence until real people confirm it. Keyboard and
screen-reader access untested by this session.
