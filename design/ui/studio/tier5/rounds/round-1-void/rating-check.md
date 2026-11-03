# Rating check: can the overwhelm rating tell the rejected cards from the frozen build?

Date: 2026-11-02 (sessions ran 2026-11-03 UTC). Run by the UX Researcher.

## Result

**The rating check does not hold. The rejected build's two ratings average 1.5 points above the
frozen build's, short of the 2 points `../../criteria.md` requires.** So the median overwhelm
rating does not gate bar 9 this tier: it is reported as a measure, and bar 9 rests on the
calm-first check (`calm-first-frozen.md`) and the reasons participants name. No bar or target was
changed.

| Task half | Persona | Frozen build d3fda9f2b6 | Rejected cards 7ca4cae647 | Difference |
| --------- | ------- | ----------------------- | ------------------------- | ---------- |
| T70 A     | Grace   | 2                       | 3                         | 1          |
| T70 B     | Tom     | 3                       | 5                         | 2          |
| Mean      |         | 2.5                     | 4.0                       | 1.5        |

The ratings also do not point at the owner's complaint. On the rejected build, the larger gap
(Tom's 5) came from a defect, not from crowding: the date test's "Between" did not take, twice,
so the test stayed on "Before". Grace's 3 there named the card's grey "Add" that did nothing. On
the frozen build both reasons named the Fill color box, which is outside the selection editor.
No participant on either build named crowding, layout or disorganization, the things the owner
called overwhelming. So even the 1.5-point gap is evidence of a bug on the old build, not of the
rating seeing what the owner saw. **Bar 9's median is uninformative this tier.**

## The participants' own words (the `Overwhelm:` line of each transcript)

- T70 A, frozen: "2 -- the Fill "Color" box with the default 6366F1 -- the new color didn't show
  on any dot, so I couldn't tell if the staff layer was working until I typed my own orange"
- T70 A, rejected: "3 -- the "Which nodes" box with its gray Add on the new layer -- it started on
  All nodes with no way to add a rule until I clicked No nodes, and the Add word itself did
  nothing"
- T70 B, frozen: "3 -- the node color picker (rainbow strip and hex code, no orange swatch) --
  there was no orange to just pick, I had to guess on a strip and it closed after one click"
- T70 B, rejected: "5 -- the "installed: how to match" box (Before/Between) -- I chose Between
  twice and it stayed on Before, and that is where I'd normally give up and email her"

All four reached the right answer (15 in the picture and 4 orange for A; 7 and 2 for B). Their
own ease ratings (1 very difficult to 7 very easy): frozen 6 and 5, rejected 5 and 3.

**The owner's question about the drawing while picking** (the second half of T70's follow-up).
All four noticed the picked nodes turn green and the rest fade, and read it as "these are the
ones picked", correctly. All four were thrown by green when they had asked for orange, and three
asked for the picked nodes to show in the color the layer will give them. Two (one per build)
read the whole picture fading before anything was picked as "something went wrong".

## How it ran

- **Blind to the build.** Each session was a separate participant with no memory of the others.
  Both builds were copied to neutral folders (`tmp/design-studio/tier5/rating/b1` and `b2` of the
  main checkout, assigned at random), so neither the start command nor the folder named a build;
  the session folders were named `rating-p1` to `rating-p4` while they ran and renamed
  `rating-rejected` and `rating-frozen` only after the ratings were in.
- **Same tasks, personas and follow-up.** T70 A as Grace and T70 B as Tom on both builds, from the
  round's own setups (`setup:volunteers.txt`, `setup:gauges-clean.txt`); both setups start on the
  rejected build with every step working (`setupOk`). Each participant was briefed by
  `real.mjs --brief --task T70A|T70B --persona <name>`, with the start command pointed at its
  neutral build folder and `--task` added so the tool holds the follow-up.
- **Leak check:** `real.mjs --leaks` on each session: 40, 46, 40 and 52 tool calls, none opened a
  file outside the session's own folder.
- **One departure.** The follow-up was asked after the session had closed rather than in the open
  session: the runner's first pass did not resume the participant's conversation, so the tool's
  `--end` handed out the follow-up and the second `--end` closed the browser. Each participant then
  answered in its own resumed conversation, from memory and its own screenshots. The ratings were
  given after the work, as the follow-up intends; only a second look at the live screen was lost.

## Where the sessions are

Main checkout, `tmp/design-studio/tier5/r1/pilot/` (git ignores it), where the gate finds them:

- `T70A/rating-frozen/`, `T70A/rating-rejected/`, `T70B/rating-frozen/`, `T70B/rating-rejected/`:
  screenshots, `transcript.md` (with the follow-up and the `Overwhelm:` line), `session.json`,
  `leaks.json`.
- Beside each, `<folder>.run1.json` and `<folder>.run2.json`: the participant's run and its
  follow-up answer.
- The runner scripts: `tmp/design-studio/tier5/rating/participant.sh` and `followup.sh`.
