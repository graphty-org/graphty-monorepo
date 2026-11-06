# Grade: session r1-s24 (task T75B, Maren, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 19 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T75 B is 15, so 4 over)
Overwhelm: 2 (least sure: right after Largest component, the workspace read "249 of 331 nodes, 298 of 361 edges" with "Condition..." and "Or..." under the one row, and nothing said which of them meant "and also")
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 31 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 13 and the end-state records agree with the answer key's B values:

- Top bar: "24 of 331 nodes, 4 of 361 edges". The Values tab: "Nodes showing 24 of 331", "Edges
  showing 4 of 361", Full graph 331 nodes and 361 edges, so nothing was deleted.
- `data.json`: one filter card, on, keeping Largest component, then `graphty.degree` min 2, then
  `data.gal80Rexp` min 0.5; count 24 of 331. Total nodes 331, visible 24, visible edges 4.
- The running counts read along the way match the key: 249 (largest piece), 170 (Degree 2 or
  more), 24 (gal80Rexp 0.5 or more).
- Reported: "24 genes are still in the picture (24 of 331 nodes, 4 of 361 edges); the full network
  is still 331 nodes / 361 edges, nothing deleted." Right count, and the screen shows it.
- `styles.json` and `work.json`: the style layers are unchanged and no run was made; the task asks
  for none.

## Path and wrong turns

The participant took the answer key's path in the key's order: Data, Add filter, "component",
Largest component, Condition..., Degree, 2, Condition..., gal80Rexp, 0.5, Done. Success state
reached at step 12 (Done).

- Wrong turns: none. Every step stayed on the path.
- The 4 extra steps are equivalents, not detours: a click into the picker's search box before
  typing (1), a click on "Largest component" that the study tool reported as ambiguous and did
  nothing (it matched both the list option and a "Largest component 249 nodes" button; the next
  step named the option) (1), and a click into the number box plus Control+A before each of the
  two values, with Tab in place of Enter (2).

## Follow-up

Present in the transcript. Rating 2. Least sure: step 5, after Largest component, choosing between
"Condition..." and "Or..." to add an AND condition; the participant guessed Condition... and
believed it only when the count fell from 249 to 170. A smaller doubt at the end: the Values tab's
Degree card read 0 to 2 with most of the 24 genes at degree 0, and for a moment the participant
wondered whether "Degree min 2" had been applied.

## Problems

1. Severity 2, wording. Nothing in the workspace says that "Condition..." narrows what is already
   kept (an AND) while "Or..." widens it; the participant guessed and confirmed it only from the
   count. This is the follow-up's least-sure moment. Evidence: steps 5-6, screenshots 06 and 07;
   transcript step 5 and the follow-up.
2. Severity 2, wording. After Done, the Values tab's Degree card (0 to 2, median 0, mean 0.3)
   counts degree inside what is showing, while the filter's "Degree min 2" counted it in the whole
   graph, and nothing on the card says which graph it counts in. A reader checking the result sees
   kept genes at degree 0 and doubts the filter. Evidence: step 12, screenshot 13; the follow-up.
3. Severity 1, wording. The gal80Rexp row shows "Not measured: 2", but nothing says whether those
   two genes are kept or dropped at "min 0.5" (they are dropped: the count is 24). Evidence: steps
   10-11, screenshots 11 and 12.
4. Severity 1, wording. The picker offers "Connected components: Piece" and "Connected components:
   Piece size" under Find groups and "Largest component" under Structure, three names in two groups
   for one idea; the highlighted first option is Piece, not the largest piece. Evidence: step 4,
   screenshot 05; the answer key notes the same picker for T75 A.
5. Severity 1, opinion. After Done the 24 kept genes stay spread over the full graph's old
   positions; the participant wanted a fit or a new layout for a figure. Evidence: step 12,
   screenshot 13.

No build defect needed a scripted repro: every problem is visible in the screenshots. The study
tool refused nothing: the one "ambiguous" line in `route.jsonl` (step 5) is a targeting message for
an unclear click, not a refusal of the session, and the session went on.
