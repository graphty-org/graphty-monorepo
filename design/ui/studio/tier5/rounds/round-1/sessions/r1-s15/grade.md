# Grade: session r1-s15 (task T74A, Dana, returning)

Grade: S
False done: no
Wrong turns: 1
Steps: 19 (inputs in `route.jsonl`, counted as `tool/steps.mjs` counts them: clicks, keys, typed text; the answer key's path for T74 A is 13, so 6 over)
Overwhelm: 3 (least sure: the By position count box -- an empty box with only small gray "of all nodes" beside it, and typing 5 left the header at "24 of 24" until Enter; this is part of the selection editor)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 40 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 17 and the end-state records agree with the answer key's A values:

- Style layer "Top 5": Which nodes "PageRank: Influence top 5", "5 of 24"; fill #FFA500 (orange).
  `styles.json`: the layer's selector keeps `pagerank` with test `top 5, ties all`, matched 5.
- `key.json`: "Color: Top 5, 5 of 24 nodes"; the PageRank entry reads "5 nodes covered by Top 5";
  the drawing counts exactly 5 nodes #ffa500 and the other 19 in PageRank's ramp colors, so
  everyone else was left as they were. The PageRank layer is still on and unchanged.
- The five, read in the editor at step 12 and named at the end: Ben Adler, Seun Okoro, Priya
  Nair, Hannah Weiss, James Carter -- the key's five (v21, v13, v05, v09, v02).
- `data.json`: no filter card, 24 of 24 nodes, nothing deleted.

## Path and wrong turns

The participant took the answer key's path: + > Layer, Which nodes, typed "PageRank", Enter, the
mode select, By position, 5, Enter, Done, Add to node fill, the color box, a color. Success state
reached at step 16 (the color committed).

- Wrong turn (1): steps 1-2 opened the node table and sorted it by PageRank, a place the task does
  not need (the layer's selection is what the task asks for). The table was left open and used to
  check the editor's five, but the route never needed it.
- Not wrong turns: naming the layer "Top 5" with Enter (an equivalent extra step), a click in the
  count box that already held focus (step 10), and typing the color name "orange" rather than a hex
  (the box accepted it as FFA500).

The 6 extra steps: the table and its sort (2), typing the layer name, Enter (2), the click in the
focused count box (1), the click in the color box (1).

## Follow-up

Present in the transcript. Rating 3. Least sure: right after picking By position (screenshots 10 to
12) -- the panel showed "PageRank: Influence", the By position select, then an empty box with a
cursor and small gray "of all nodes". Nothing on screen said it wanted a number or whether it took
the top or the bottom, and after typing 5 the header still said "24 of 24" and the table still
listed everyone, until Enter on a hunch made it "5 of 24". A smaller wobble: the color box gave
only a text cursor, no swatches.

## Problems

1. Severity 2, behavior. The By position count box has no visible label and no direction: an empty
   box and small gray "of all nodes" (its accessible name "PageRank: how many" is not drawn), and
   nothing says top or bottom. Evidence: steps 9-10, screenshots 10 and 11; the follow-up answer.
   This is the selection editor element the "least sure" answer names, so it counts toward bar 9's
   allowance if another task half names it too.
2. Severity 2, behavior. Typing the number does not apply it: the header stayed "24 of 24" and the
   matches table unchanged until Enter, with nothing on screen saying Enter is needed. Evidence:
   steps 11-12, screenshots 12 and 13.
3. Severity 2, behavior. The new orange (FFA500) sits inside the PageRank layer's orange-to-brown
   ramp, so the five are only "a shade lighter" in the drawing; the key's "5 nodes covered by Top
   5" is the only sign. The participant judged it hard to spot in a meeting. Evidence: step 16,
   screenshot 17. Same mechanism as the known T70 A note (a new color inside a lower layer's range);
   the Fill color and the drawing, not the selection editor, so it goes to the backlog.
4. Severity 1, behavior. Clicking the Fill color box gives a text cursor and no swatches; the
   participant got orange only by guessing that a color name would be understood. Evidence: steps
   15-16, screenshots 16 and 17. Not part of the selection editor; backlog.
5. Severity 1, wording. "By position" did not read as "top N" to the participant; chosen only
   because "By value" was the other option. Evidence: steps 8-9, screenshots 09 and 10.
6. Severity 1, behavior. Much small gray text at rest (layer subtitles, "of all nodes", "Edges: not
   styled") hard to read. Evidence: screenshots 10 and 17; the participant's complaints.

No build defect needed a scripted repro: every problem is visible in the session's own screenshots.
The study tool refused nothing (no FAIL or refusal line in `route.jsonl`).
