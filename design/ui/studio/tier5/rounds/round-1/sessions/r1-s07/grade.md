# Grade: session r1-s07 (task T71A, Dana, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 11 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T71 A is 9, so 2 over)
Overwhelm: 2 (least sure: right after picking `hours` for group B -- the step pane showed the range 2 to 52 with two boxes and "0 so far", B read 0 and the drawing still showed only the three board members; this is the selection editor's new-group step pane)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 25 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 09 and the end-state records agree with the answer key's A values:

- Top bar: "10 of 24 nodes, 14 of 63 edges". The Values tab: "Nodes showing 10 of 24", Full graph
  Nodes 24, so nobody was deleted.
- The sidebar filter card's outline: "A 3 / role board / or B 7 / hours min 30" -- the key's final
  outline. `data.json`: one filter card, on, a union of two groups (A keeps `data.role` board; B
  adds `data.hours` min 30); visible nodes 10, total 24.
- Members, read from the matches strip (screenshots 07 and 08): A is Maria Lopez, Seun Okoro, Paul
  Dubois (v01, v13, v23); B's first rows are James Carter, Priya Nair, Hannah Weiss (v02, v05, v09),
  matching the key's seven.
- Reported: "10 people are still in the picture (3 board members + 7 people with 30 hours or
  more)", hidden, not deleted. Right, and the screen shows it.
- Styling: `work.json` lists the same layers at the start and the end, and the drawing returned
  to the PageRank colors after Done (`styles-steps.jsonl`, 09.png), so the preview's group colors
  did not stay.

## Path and wrong turns

The answer key's path, in order: Data, Add filter, `role`, board, Or..., `hours`, 30, Done. Success
state reached at step 7 (10 of 24) and kept by Done at step 8.

- Wrong turns: none.
- The 2 extra steps: a click in the Min box and Control+A before typing 30 (the box already held
  focus after the pick); Tab in place of the path's Enter is an equal step.

## Follow-up

Present in the transcript. Rating 2. Least sure: right after picking `hours` for group B
(screenshot 07): the step pane showed the strip, a slider from 2 to 52, two boxes "2" and "52"
and "0 so far" in small gray; B read 0 in the outline, the sidebar card still read "role board",
and the drawing still showed only the three board members. Nothing said whether the pick had done
anything or which box to type in; the participant guessed the left box was "from". On the table
question: the participant mostly read the matches strip under the drawing (Group, name, role,
hours) and trusted it most -- it showed the three board members all under 30 hours, so nobody was
counted twice -- and also watched the A/B counts and the top bar's count. In the way: the "Group
colors" / "Styled" buttons and the green/orange preview colors, which nobody asked for, and the
card still titled "role board" while the hours group was being added.

## Problems

1. Severity 2, behavior. A new Or group's range step, right after its column is picked, reads
   "0 so far" with both bounds at the column's full range and the group contributing nothing; the
   pane gives no sign that a bound must be typed, or which box is the lower one (the boxes are
   unlabeled on screen, "2" to "52"). The participant was unsure whether the group was stuck at 0.
   Evidence: step 6, screenshot 07; the follow-up's least-sure answer. This is a selection editor
   element named as least sure, so it is coded for bar 9; the answer key already notes "a new
   group's step reads 0 so far until its bound is typed".
2. Severity 2, wording. The filter card keeps its first step's name, "role board", as its title in
   the sidebar and the workspace header after the Or group is added, so at a glance the card reads
   as a board-only filter. Evidence: steps 5-8, screenshots 06, 07, 08 (sidebar "role board
   Editing", header "role board -- Filters 10 of 24") and 09 (sidebar title "role board" over the
   A/B outline). Known in the answer key's final-screen note.
3. Severity 1, wording. "hours min 30" leaves the reader unsure whether exactly 30 counts; the
   participant would rather read "30 or more". Evidence: step 7, screenshots 08 and 09.
4. Severity 1, behavior. The workspace preview opens in "Group colors" (A green, B orange), which
   the participant did not ask for and was unsure would stay after Done (it did not). Evidence:
   steps 3-7, screenshots 04-08.
5. Severity 1, accessibility. The small gray counts and range labels ("0 so far", "7 so far", "2",
   "52", "No match 14") are hard to read for a person without reading glasses. Evidence:
   screenshots 07 and 08; the participant's end notes.

No build defect needed a scripted repro: each problem is screenshot-visible or already in the
answer key. The study tool refused nothing (no FAIL or refusal line in `route.jsonl` or
`setup.log`).
