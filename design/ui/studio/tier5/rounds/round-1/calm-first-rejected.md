# Calm-first check on the rejected build (cards, 7ca4cae647)

Date: 2026-11-02. The owner-lens expert check of bar 9 (`../../criteria.md`, "The calm-first
check"), run on the cards the owner rejected on 2026-11-01, to see whether the check can find what
he complained about before it is trusted to gate. Run by the UX Researcher. Carried into the
rerun of round 1 unchanged from `../round-1-void/`: it reads only the rejected build, which the
refreeze to 1e123d7d33 did not touch.

## Result

**The check finds the owner's complaint on the rejected build: 2 findings of severity 3 and 6 of
severity 2.** The criteria ask for at least one severity 3 or more than three severity 2 before the
check gates, so it gates as written; its limits stay as they are. None is confirmed yet: the
screenshot audit confirms counts, gaps and alignment, and has not read these screenshots.

## How it ran

The build served from the kept copy (`tmp/design-studio/tier5/prep/build-7ca4cae647` of the main
checkout), from the round's own setup `volunteers.txt`, at 1440 x 900 and 1280 x 800. The
screenshots are in the main checkout's `tmp/design-studio/tier5/rating/calm/rejected-1440/` and
`rejected-1280/` (git ignores them). The controls each step needs come from the T70 A path
(`../../answers.md`): a new layer's Which nodes, `role`, tick staff, Done; then a filter card on
`trained`, Yes, Done.

Screens walked: a new rule with its picker open (05), a step selected (07), Except on (12), an Or
group (13, 14), a new filter card with its picker open (17, 18) and the filter card at rest (20),
and the same new rule, step and Or group at 1280 x 800 (rejected-1280 03 to 05). Not on this build:
Advanced with Edges where (a step's menu holds Duplicate, Move, Hide, Include not measured and
Delete, 15), and the reference picker. Not walked: a reopened colleague's card (the round's
`volunteers-thanks.txt` setup drives the workspace's controls, which this build lacks; the filter
card at rest, 20, stands in) and the 50,000-node screens.

## Per screen

| Screen                         | Where the eye lands first                                     | Next step's control the most prominent?                                      |
| ------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| New rule, picker open (05)     | The canvas, all green, and the preview key over it            | Yes: the open picker, though it hangs off the inspector with a sideways scrollbar |
| Step selected (07)             | The five green nodes on a faded canvas                        | No: the staff box is 13 px text in a 200 px column under a second copy of the step |
| Except on (12)                 | The canvas                                                    | Not applicable; Except shows only as a changed icon, the step still reads "role staff" |
| Or group (13, 14)              | The canvas, then the preview key covering a node              | Yes: the picker, crowded by two group headers, two base toggles and two add rows |
| New filter card (17, 18)       | The whole canvas faded to "No match 24" before any choice     | Yes: the picker, spilling out of the sidebar over the canvas                |
| Filter card at rest (20)       | The selected nodes' yellow rings                              | Not applicable                                                                |

## Findings

| #   | Sev | Finding                                                                                                                                                                                                 | Screens                            |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | 3   | Two things doing one job: a step is drawn twice while it is open, as its summary row ("role staff", "Degree No test") and again as its open card with the same name.                                    | 07, 12, 14, 18; 1280 04            |
| 2   | 3   | Two counts of one result, drawn four or five times at once: the card's "5 of 24", the layer row's "5", the preview key's "Which nodes 5", the step's "5"; in an Or group "19 of 24" three times plus 19 twice. | 07, 13, 14; 1280 05                |
| 3   | 2   | The value picker does not fit its column: a sideways scrollbar inside it, and on a filter card it spills out of the sidebar over the canvas.                                                           | 05, 13, 17; 1280 05                |
| 4   | 2   | The preview key is drawn over the drawing and covers a node.                                                                                                                                             | 13, 14; 1280 05                    |
| 5   | 2   | An Or group repeats every control per group: two "No nodes / All nodes" toggles, two add rows ("Keep", "Add"), two checkboxes and two "..." beside the counts.                                         | 13, 14; 1280 05                    |
| 6   | 2   | Controls out of line with their rows: verb icons, the "Keep" add row and the chips "A: role staff" and "B: Degree No test" each start at a different indent; the rule's chips wrap their icons inline. | 13, 14, 17, 18                     |
| 7   | 2   | Drawn at rest that nothing needs: "Select", "Filter to" and "Filter out" in 8 px grey on every filter card at rest (also a bar 6 word violation), and the inspector switched to a selection summary.   | 20                                 |
| 8   | 2   | The whole canvas fades as soon as a new card opens, before anything is chosen: a pane of washed-out nodes the step does not use yet.                                                                    | 17, 18                             |

Progressive disclosure: this build has no Advanced; every option a step has is drawn or in its
"..." menu. Words at rest were not counted against the budget (the content designer's count), so
that limit is reported as not re-tested.
