# Rating check: can the overwhelm rating tell the rejected cards from the frozen build?

Date: 2026-11-03. The rating check of bar 9 (`../../criteria.md`, "The rating check"), with the
frozen build's two sessions walked again on 1e123d7d33, the build the round runs on. The rejected
build's two sessions are the ones of 2026-11-02 (`../round-1-void/rating-check.md`): that build did
not change.

## Result

**The rating check does not hold. The rejected build's two ratings average 1.5 points above the
frozen build's, short of the 2 points the criteria require.** So, as before, the median overwhelm
rating is reported as a measure only this tier, and bar 9 rests on the calm-first check and the
screen elements participants name. No bar or target was changed.

| Task half | Persona | Frozen build 1e123d7d33 | Rejected cards 7ca4cae647 | Difference |
| --------- | ------- | ----------------------- | ------------------------- | ---------- |
| T70 A     | Grace   | 2                       | 3                         | 1          |
| T70 B     | Tom     | 3                       | 5                         | 2          |
| Mean      |         | 2.5                     | 4.0                       | 1.5        |

Both reached the right answer: 15 in the picture and 4 orange (A), 7 in the picture and 2 orange
(B). Their own ease ratings (1 very difficult to 7 very easy): 6 (A) and 5 (B).

## The participants' own words (the `Overwhelm:` line of each transcript)

- T70 A, frozen: "2 -- the PageRank orange-brown coloring and its key card still showing under my
  new orange staff -- I could hardly tell my orange people from everyone else and nothing told me
  the old coloring was still on"
- T70 B, frozen: "3 -- the dots going all green, then back to blue after Done, with nothing orange
  yet -- I couldn't tell if green was the colour it would use or just "picked", and after Done it
  looked like nothing had happened"

Neither named crowding, layout or disorganization. A's reason is the setup's own coloring under the
new layer, outside the selection editor; B's names the editor's preview colors and the step after
Done (where to add the color). Both also named the Fill color box (A: "no colors came up, and I just
guessed by typing orange"; B: "no orange square ... so I clicked the rainbow bar and hoped").

**The owner's question about the drawing while picking** (the second half of T70's follow-up). Both
read the green as "these are the ones picked" and the pale nodes as "not picked", and both checked
it against the count and the table. Both were thrown for a moment by green when they had asked for
orange. A would rather see the picked people in the color about to be given, with the rest of the
picture as it was; B would rather the pick look unlike a final color, and be asked for the color
straight after Done.

## How it ran

- Each session a separate participant with no memory of the others, briefed by
  `real.mjs --brief --task T70A|T70B --persona <name>`, started from the round's own setups
  (`setup:volunteers.txt`, `setup:gauges-clean.txt`) on a copy of the frozen build in a neutral
  folder (the main checkout's `tmp/design-studio/tier5/rating/b3`), in session folders named
  `rating-p5` and `rating-p6` while they ran and renamed `rating-frozen` after the ratings were in.
- **The follow-up was asked after the session had closed**, as on 2026-11-02: the runner did not
  read the participant's conversation id, so it ended the session before asking. Each participant
  answered in its own resumed conversation, from memory and its own screenshots.
- **Leak check**: `real.mjs --leaks` on each: 40 tool calls each, none opened a file outside the
  session's own folder.

## Where the sessions are

Main checkout, `tmp/design-studio/tier5/r1/pilot/T70A/rating-frozen/` and
`T70B/rating-frozen/` (git ignores them): screenshots, `transcript.md` with the follow-up and the
`Overwhelm:` line, `session.json`, `leaks.json`; beside each, its `.run1.json` and `.run2.json`.
The earlier frozen-build sessions, on d3fda9f2b6, are set aside beside them as
`rating-old-d3fda9f2b6`.
