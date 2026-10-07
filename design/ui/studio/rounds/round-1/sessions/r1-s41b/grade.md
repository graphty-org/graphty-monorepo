# Grade: session r1-s41b -- Jordan, circles of characters on Les Miserables

**Grade: S** (success). A Louvain grouping run finished; the participant gave the number of
groups (6) and the largest group's size (20) as the screen shows them, and named three members
of that group (Valjean, Fauchelevent, MlleBaptistine), each visible in the group's Members list
before being stated.

## The parts of the task

1. **A grouping run.** `06.png`: after Run on Louvain the dots are colored, the canvas key reads
   "Color: Communities" with Group 1 to Group 6, and the left list has a "Communities 6" row.
2. **Number of groups and largest size.** `06.png`: Communities 6; Group 1 20, Group 2 17,
   Group 3 11, Group 4 11, Group 5 10, Group 6 8. `07.png`: Group 1's Summary reads Size 20, Made
   by Communities. Answer "6 circles; the largest has 20" matches the screen.
3. **Three members of the largest group, shown before stated.** `07.png`: Group 1's Members
   ("First 10") list MlleBaptistine, MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau,
   Gervais, Fauchelevent, Bamatabois. All three named members are in it.

There are no downloads; the task does not need any.

## Measures

- **Steps:** 7 (`01.png` to `07.png`): start, decline the usage card and open the sample,
  Analyze, filter "communit", Louvain, Run, Group 1. The success path is 7. The participant used
  the toolbar's Analyze button instead of Shift+A and skipped selecting the run row, reading the
  count and sizes from the list instead; both are equivalent.
- **Wrong turns:** 0.
- **False "done":** none. The closing "Done" at step 7 is true on screen (`07.png`).
  truth_on_screen: not applicable.
- **Build-decided:** no. **Void:** no (no tool fault; clicks by position landed on the named
  controls, `Analyze` and `Group 1`).

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Choosing Group 1 in the list does not change the drawing (no highlight, outline or dimming), so the participant matched the group's color by eye to find it on the canvas. | step 7: `06.png` and `07.png` canvases are identical |
| 2 | 1 | behavior | The group's Members list shows only the "First 10" of 20, with no visible way to see or copy all of them. Did not block this task (three names needed). | step 7 `07.png` |
| 3 | 1 | behavior | Analyze opens on ranking measures; grouping methods are not visible until the list is scrolled or filtered. The participant found Louvain by typing "communit". | step 3 `03.png`, step 4 `04.png` |
| 4 | 1 | wording | Toolbar icons carry no words; the participant chose the flask only because of the "Analyze (Shift+A)" hint. | step 2 `02.png` |
| 5 | 0 | opinion | Groups are named "Group 1" to "Group 6"; the participant wanted names drawn from their members for a report. | step 6 `06.png` |

No problem here is a build defect under the criteria (no crash, dead control, wrong count or
keyboard block): the Group 1 click does select the group and fills the right panel; only the
drawing does not reflect the selection. So there is no repro directory for this session.
Problem 1 counts toward confirmation as behavior if another participant meets it.
