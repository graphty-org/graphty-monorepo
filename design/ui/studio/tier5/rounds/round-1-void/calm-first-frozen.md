# Calm-first check on the frozen build (workspace, d3fda9f2b6)

Date: 2026-11-02. Bar 9's owner-lens expert check (`../../criteria.md`, "The calm-first check") on
the round's frozen build, by the same rules and the same person as on the rejected build
(`calm-first-rejected.md`). Run by the UX Researcher, before any round session was read.

## Result

**The frozen build does not pass bar 9's calm-first limits yet: 2 candidate findings of severity 3
and 5 of severity 2, where the bar allows 0 and at most 3.** Both severity 3 candidates are the
same kind: two counts of one result drawn at once. None is confirmed; the screenshot audit
confirms counts, gaps and alignment and has not read these screenshots. The eye lands first on the
graph, the rule's rows or the next step's control on every screen walked, and Advanced is closed
at rest, so the other two calm-first tests pass.

Against the rejected build the difference is real but smaller than it looks from the outside: the
step drawn twice, the picker spilling out of its column, the controls repeated per Or group and
the preview key over the drawing are gone; double counts and unused space remain.

## How it ran

The build served from `.study-builds/tier5-r1d2-d3fda9f2b6` of the main checkout, from the
round's setups `volunteers.txt` and `volunteers-thanks.txt` (a colleague's project), at
1440 x 900 and 1280 x 800. Screenshots in the main checkout's
`tmp/design-studio/tier5/rating/calm/frozen-1440/`, `frozen-1280/` and `frozen-t77/` (git ignores
them). The controls each step needs come from the T70 A path and T77 A (`../../answers.md`).

Screens walked: a new rule with its picker open (04), a step selected (07), Except on (08), an Or
group with its picker open (11) and with a step (12), Advanced with Edges where (13), a new filter
card (18), both hosts' outline at rest (15, 19), a reopened colleague's card at rest and opened
(frozen-t77 02, 04), and the new rule, step, Except, Or group and Advanced at 1280 x 800
(frozen-1280 02 to 06). Not walked: the reference picker on 11 and on 50,000 nodes, and the
50,000-node checklist; they are reported as not re-tested.

## Per screen

| Screen                          | Where the eye lands first                          | Next step's control the most prominent?                    |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| New rule, picker open (04)      | The open picker beside the canvas                  | Yes: the picker                                            |
| Step selected (07)              | The five green nodes on a faded canvas, then Done  | Yes: the checklist and Done                                |
| Except on (08)                  | The canvas                                         | Yes: the switch reads "Except", the outline "Except role staff" |
| Or group (11, 12)               | The picker, then the outline's A and B             | Yes: the picker                                            |
| Advanced, Edges where (13)      | The canvas                                         | Yes: "All edges / Edges where ..." under Advanced          |
| New filter card (18)            | The canvas, then the value field                   | Yes: "Value..." directly under the test                    |
| Outlines at rest (15, 19, t77 04) | The graph                                        | Not applicable                                             |

## Findings

| #   | Sev | Finding                                                                                                                                                                                                | Screens                            |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 1   | 3   | Two counts of one result while a filter is edited and at rest: the top bar's "24 of 24 nodes" and the workspace header's "24 of 24"; at rest the top bar's "14 of 24 nodes" and the card's "14 of 24". | 18; t77 02                         |
| 2   | 3   | Two counts of one result in an Or group with one step: the group's "B 0" in the outline and the step's "0 so far" in its pane.                                                                         | 12, 13; 1280 06                    |
| 3   | 2   | A blank pane the step does not use: under the step's pane, about 320 x 600 px at 1440 x 900 (and 320 x 500 at 1280 x 800), on every workspace screen.                                                  | 07, 08, 12, 13, 18; 1280 03 to 06  |
| 4   | 2   | Drawn while the workspace is open that no workspace step needs: the inspector beside it, with Node / Edge, Style nodes, Shape, Visibility, Text, Fill, Shaders and Edit edges.                          | 04 to 13; 1280 02 to 06            |
| 5   | 2   | Drawn at rest that nothing needs on a new rule: "Group colors / Styled" and Clear with nothing to clear, before anything is picked.                                                                     | 04, 18                             |
| 6   | 2   | Rows out of line in the outline: "Except" pushes "role staff" left of the "All nodes" row above it, and "or" sits in a column of its own left of B.                                                     | 11, 12, 13; 1280 06                |
| 7   | 2   | A reopened card's title repeats its first step: "trained Yes" as the title and again as the first row.                                                                                                 | t77 04                             |

To check next: whether the Graph place at rest draws the layer row's count and the inspector's
Which nodes count together (the rejected build does, inside its finding 2); here the one screen
with both had the pointer on Which nodes, which shows Edit in place of the count (15).

Not counted: the matches strip under the canvas (the step reads its rows, and the owner's own
question asks whether it helps); the picker's "Results" heading cut at the list's foot (a scroll
list, not a calm-first test). Words at rest were not counted against the budget (the content
designer's count): not re-tested.

## What would bring it inside the limits

- One count per result on screen: drop the workspace header's count while the top bar shows the
  same filter's count, or the reverse; show a one-step group's count once.
- Use or close the blank space under the step pane, and hide the inspector while the workspace is
  open (it has nothing the workspace's steps need).
- Draw "Group colors / Styled" and Clear only once there is a pick.
- Align the outline's rows on one start column whatever the leading word ("Except", "or").
