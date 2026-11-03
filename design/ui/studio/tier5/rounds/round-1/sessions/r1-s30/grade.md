# Grade: session r1-s30 (task T71A, Sam, keyboard only)

Grade: S
False done: no
Wrong turns: 1
Steps: 29 tool steps (64 key presses and typed strings, from `route.jsonl`; the answer key's path for T71 A is 9 pointer steps, so 20 steps over -- a keyboard session, not counted against the pointer bars)
Overwhelm: 3 (least sure: after the hours Min box took 30 and Enter, screenshots 20 to 25 -- the green Done button in plain sight at the top right, but nine Shift+Tabs dropped into the matches table's Group header and three F6 presses went drawing, status bar, Main menu without ever stopping on the bar holding Done)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 67 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`, keyboard-only mode), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 30 and the end-state records agree with the answer key's A values:

- Top bar: "10 of 24 nodes, 14 of 63 edges". The Values tab: "Nodes showing 10 of 24", "Edges
  showing 14 of 63", "Full graph: Nodes 24". `data.json`: 24 nodes in all, 10 visible; nobody was
  deleted.
- One filter card, on: an Or group, A "role board" (3) or B "hours min 30" (7). `work.json`: one
  filter, `union` of branch A keeping `data.role` in [board] and branch B adding `data.hours` min 30.
  Exactly the key's success shape, one card, not two.
- The members, read from the matches strip at step 20 (screenshot 20/22): Maria Lopez, Seun Okoro
  (board) and James Carter, Priya Nair, Hannah Weiss among the 30-or-more group -- consistent with
  the key's ten (v01, v13, v23 and v02, v05, v09, v16, v17, v21, v24).
- Reported: 10 still in the picture, 3 board and 7 with 30 or more hours, the other 14 hidden and
  not deleted. Right, and the screen shows it.

The sidebar card keeps its first step's name ("role board") after the Or group was added, as the
key's final-screen notes describe for this build.

## Path and wrong turns

The participant took the answer key's path by keyboard: Filters (the canvas toolbar's button, an
equal route to Data then Add filter), `role`, board, Or..., `hours`, 30, Enter, Done. The success
state was reached at step 30 (Enter on Done); the count was already 10 of 24 in the workspace at
step 20.

- Wrong turn (1): steps 21 to 22, nine Shift+Tabs from the hours box looking for Done, which ended
  in the matches table's Group header (screenshot 22) and was abandoned for F6. The route there is
  forced by the build (Done is not reachable backwards), but the walk left the path and was given
  up.
- Not wrong turns: the five F6 presses to reach the drawing (steps 2 to 6, the only way to the
  toolbar), the off-by-one Shift+Tab count to Or... (step 16 finished the same walk), and the F6
  plus Tab walk to Done (steps 23 to 29), which is the only keyboard route to Done on this build.
- Where the extra steps went: about 11 keys to reach Filters, about 34 keys from the hours box to
  Done.

## Follow-up

Present in the transcript. Rating 3. Least sure: the walk to Done after setting hours to 30
(screenshots 20 to 25); for about a dozen keys the participant did not know whether Done was
reachable at all. Besides the drawing: the workspace's group counts (A 3, B 7) helped most; the
matches strip helped check names, roles and hours; the top bar's "10 of 24 nodes" and its tooltip
"role board or hours 30 or more" (screenshot 26) settled that "min 30" includes 30. In the way: the
Value list sliding up over the Done button (screenshot 11), and the table sitting in the Tab order
between the participant and Done. The drawing was barely used: with the others faded rather than
gone, the counts were trusted over the picture.

## Problems

1. Severity 3, build-defect. In the filter workspace the bar holding Group colors, Styled, Table,
   Clear, Cancel and Done is not an F6 stop, and Shift+Tab from the right panel goes into the
   matches table, not up to Done. The only keyboard route to Done is Tab from the header through
   the whole left panel. Evidence: steps 21 to 29, screenshots 21 to 29, about 34 keys from the
   hours box to Done. Repro: `rounds/round-1/repro/r1-s30/` (README.md there): with focus in the
   hours box, six F6 presses go drawing, "Local only", Main menu, the Graph rail button, Data
   sources, and back to the hours box (screenshots 05 to 10), never the Done bar. Also no key
   (for example Control+Enter) finishes the card.
2. Severity 2, accessibility. No visible focus after Enter on Filters: the Value list's "Find
   attributes, results" box had focus but showed no ring and no caret (screenshot 10, step 10); the
   participant guessed.
3. Severity 1, behavior. Typing 30 into the hours Min box changed nothing (B still "0 so far", the
   slider handle still at 2) until Enter, and nothing said so (screenshot 19, step 19). The key
   notes that the date box on the same workspace applies as typed, so the two kinds of bound box
   disagree.
4. Severity 1, behavior. Typing "role" in the Value list moved the list up over the workspace's
   Done button (screenshot 11, step 11).
5. Severity 1, accessibility. F6 order puts the drawing (and the canvas toolbar behind it) last,
   after the right panel, so reaching Filters took five F6, Tab and five arrows; the toolbar
   tooltips ("Layout", "Filters") show no key (screenshots 05 to 09, steps 5 to 9).
6. Severity 1, wording. "hours min 30" in the workspace and on the card does not say whether 30
   itself counts; the top bar's tooltip "hours 30 or more" (screenshot 26) settled it.
