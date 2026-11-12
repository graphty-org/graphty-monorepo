# Grade: session r1-s05 (task T71A, Grace, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 11 (counted as `tool/steps.mjs` counts, from `route.jsonl`; the answer key's path for T71 A is 9, so 2 over)
Overwhelm: 2 (least sure: right after Or... -- the workspace outline showing group A "role board 3", group B "Value..." 0 and "No match 21", with the column picker open again and group colors on the dots; this is the selection editor's Or group)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 24 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 09 and the end-state records agree with the answer key's A values:

- Top bar: "10 of 24 nodes, 14 of 63 edges"; the Values panel: "Nodes showing 10 of 24", "Edges
  showing 14 of 63", Full graph Nodes 24, Edges 63, so nobody was deleted.
- One filter card in the Data place, on, its outline "A 3 / role board / or B 7 / hours min 30" --
  the key's final outline word for word. `data.json`: one filter, a union of branch A (keep
  `data.role` in [board]) and branch B (add `data.hours` min 30), count 10 of 24; visible nodes
  10, total 24.
- The drawing shows 10 nodes, still colored by PageRank (`key.json`: "Color: PageRank, full
  graph", 19 node colors over 21 drawn entries; the style layers are the same before and after,
  `work.json`).
- Members, read from the matches strip at step 7 (screenshot 08): board v01, v13, v23 and the
  hours rows v02, v05, v09 visible, B 7 -- the key's 3 + 7 with no overlap.
- Reported: "10 people are still in the picture (3 board members and 7 people with 30 hours or
  more); the other 14 are out of the picture but still in the data." Right, and the screen shows it.

## Path and wrong turns

The participant walked the answer key's path: Data; Add filter; `role`; board; Or...; `hours`;
30 in the Min box; Done. Success state reached at step 7 (10 of 24 with one card), confirmed by
Done at step 8.

- Wrong turns: none. No place left the path, nothing was closed empty or undone.
- The 2 extra steps are both in step 7: a click into the Min box and Control+A before typing 30
  (the Min box already had focus after the pick, screenshot 07), with Tab in place of the path's
  Enter (equal).

## Follow-up

Present in the transcript. Rating 2. Least sure: right after Or..., when the outline grew a group
A, a group B reading "Value..." 0, a "No match 21" row, the column picker reopened on the right and
the dots took group colors; for a moment the participant could not tell whether a second filter
had been started or the same one extended, or whether B had to be set up before anything counted.
Picking `hours` and seeing the slider settled it. Besides the drawing: the counts (top bar 3 of 24
then 10 of 24; A 3 / B 7 / No match 14 in the outline) and the matches strip's names, roles and
hours helped most -- the participant added 3 + 7 + 14 = 24 and checked no board member had 30
hours. In the way: the group colors in the editor (wondered whether the picture's colors had
changed) and the card still named only "role board".

## Problems

1. Severity 2, behavior. After Or..., the new group B sits at 0 with "Value..." and the picker
   reopens, the dots switch to group colors, and nothing says this is a second way into the same
   filter rather than a new filter; the participant paused here (the follow-up's least-sure
   moment, a selection editor element for bar 9's coding). Evidence: step 5, screenshot 06.
2. Severity 2, behavior. "Group colors" is on in the workspace preview, so the A/B colors read as
   a possible change to the picture's own colors; the participant only learned otherwise after
   Done. Evidence: steps 5-7, screenshots 06 and 08; screenshot 09.
3. Severity 1, wording. The card and the workspace header keep the first step's name "role board"
   after the Or group is added ("role board -- Filters 10 of 24"; the Filters card title), so the
   name does not say the hours half is in there. Known in the answer key. Evidence: screenshots 08
   and 09.
4. Severity 1, wording. "hours min 30" does not say whether 30 itself is in; no one in the
   visible rows had exactly 30, so the participant could not check. Evidence: step 7, screenshots
   08 and 09.
5. Severity 1, behavior. "Condition..." and "Or..." read as headings rather than buttons at first
   glance (plain text, no button frame). Evidence: screenshot 08.
6. Severity 0. The 2 extra steps: a click into the Min box and Control+A, although the box
   already showed focus after picking `hours` (outline and caret, screenshot 07). It held "2", so
   selecting it before typing was a reasonable precaution, not a product problem. Evidence: step 7,
   screenshot 07.

No build defect needed a scripted repro: every problem is screenshot-visible or in the follow-up.
The study tool refused nothing (no FAIL or refusal line in `route.jsonl`; every step code 0, 0
missed).
