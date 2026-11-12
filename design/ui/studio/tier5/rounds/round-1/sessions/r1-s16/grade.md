# Grade: session r1-s16 (task T74B, Alex, returning)

Grade: SD
False done: no
Wrong turns: 3
Steps: 27 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T74 B is 13, so 14 over; the key's "also success" Analyze route is about 14)
Overwhelm: 3 (least sure: screenshot 12, right after "By position" -- an empty, focused count box with only "of all nodes" beside it, no example, no top-or-bottom choice, header still "11 of 11"; this is the selection editor's By position count box. Second: screenshot 19, after "Stop varying node color by data" the three went back to the same blue as every other node)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 48 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 23 and the end-state records hold the answer key's B result, made by a route the key
lists as success:

- Style layer "Betweenness" (the run's layer), Which nodes "Betweenness top 3", "3 of 11"; Fill
  color FF8000. `styles.json`: selector a `threshold` rule on `results.betweenness.value` with
  `top: 3`, `ties: "all"`, `node.color` #FF8000, matched 3, visible 3 of 11. `work.json`: run
  "betweenness" kept.
- `key.json`: the canvas key reads "Color: Betweenness, 3 of 11 nodes"; 3 nodes drawn #ff8000,
  the other 8 in the default #6366f1. No filter; 11 of 11 nodes visible.
- Reported: Cedar Bend (25), Fox Creek (24), Mill Pond (21), with Upper Falls (16) next, no tie at
  the cut -- the key's three (G03, G04, G02). The table on screen, sorted by Betweenness, shows
  the same values, so the claim of done matches the screen.

Why SD: the route is the answer key's "also success" for B (Analyze > Betweenness > Run, then the
run layer's "Betweenness has a value" step By position 3, "Stop varying node color by data" and
the hex). The participant reached it after three detours recovered alone, including a rejected
"top 3" in the count box.

## Path and wrong turns

Steps are numbered as `route.jsonl` records them: step n leaves screenshot n+1.

Analyze (step 2), Betweenness (3), Run (4: every node colored on a 0-25 ramp), drag the table
scrollbar to the new column (5), sort by Betweenness (6), the column's "..." menu (7), Escape and
the Betweenness layer (8), Which nodes (9), the mode select (10), By position (11), "top 3" (12),
Enter (13: error), Control+A, 3, Enter (14: 3 of 11), Done (15: the three in the ramp's dark
brown), the Fill color (16: Color by Betweenness panel), close it and hover the icon beside the
swatch (17), Stop varying node color by data (18: 6366F1), the swatch (19: picker), the hex box,
FF8000, Enter (20). Success state reached at step 20 (screenshot 21). Step 21 ("Close") was
refused by the tool as ambiguous and did nothing; Escape (22) closed the picker.

- Wrong turn 1: step 7 opened the Betweenness column's "..." menu (Hide / Sort / Move) and closed
  it with nothing chosen (screenshot 08).
- Wrong turn 2: steps 12-13 typed "top 3" in the By position count box; it was refused and
  replaced with 3 (screenshots 13-15).
- Wrong turn 3: step 16 opened the "Color by Betweenness" panel and closed it with nothing changed
  (screenshot 17).
- Not wrong turns: the hover on Main menu (step 1, a hover); scrolling and sorting the table (used
  to name the three, never taken back); the ambiguous "Close" (a tool refusal, after success).

## Follow-up

Present in the transcript. Rating 3. Least sure: screenshot 12, after picking "By position" --
an empty, focused box followed by "of all nodes", an Except switch, Done/Cancel, header "11 of 11"
and the whole graph highlighted; no example and no top-or-bottom choice, so "3", "3%", "top 3" or
a range were all possible. Typing "top 3" did nothing until Enter, then the error said it was
using "the highest 10" while the header still read 11 of 11. Second: "Stop varying node color by
data" (screenshot 19) returned the three to the same blue as everything else. The By position
count box is a selection editor element, and r1-s13 and r1-s15 (T74 A) name the same box: named
by sessions on both task halves, it counts toward bar 9's allowance.

## Problems

1. Severity 2, behavior. The By position count box is empty with no visible hint of what it takes
   (a number, of the highest, not a percent), and a non-number sits in it with no response until
   Enter. Evidence: steps 11-13, screenshots 12-14; the follow-up's least-sure moment. Also
   r1-s13 and r1-s15 (T74 A). Selection editor element: bar 9.
2. Severity 2, build-defect. With a non-number in the By position box, the error says "The count
   and drawing still use the highest 10" while the header reads "11 of 11" and all 11 nodes are
   drawn as matches; one of the two is wrong. Evidence: step 13, screenshot 14. Repro:
   `rounds/round-1/repro/r1-s16/repro.sh`, 06.png (also `repro/r1-s13`, T74 A).
3. Severity 2, build-defect. "Stop varying node color by data" on a run's layer sets the flat color
   to 6366F1, the default node color, so the matched nodes look exactly like every other node and
   the layer seems lost. Evidence: step 18, screenshot 19. Repro:
   `rounds/round-1/repro/r1-s16/repro.sh`, 09.png; its `key.json` draws all 11 nodes #6366f1 while
   the key says "3 of 11 nodes".
4. Severity 2, behavior. Narrowing the run's layer to the top 3 leaves them on the ramp's dark
   brown, and the only way to one flat color is an unlabeled icon beside the swatch, found by
   hovering after a detour through the "Color by Betweenness" panel. Evidence: steps 15-18,
   screenshots 16-19; the answer key's build notes for this route. The Fill color, not the
   selection editor: backlog.
5. Severity 1, wording. The mode select's "By position" did not read as "the highest N"; the
   participant guessed. Evidence: step 10, screenshot 11.
6. Severity 1, behavior. The color picker's swatches (blue, grays, a darker blue, yellow, black)
   hold no orange, so a person without a hex code has to drag the hue bar. Evidence: step 19,
   screenshot 20. Also r1-s01.
7. Severity 1, behavior. After Run, the new Betweenness column is off-screen to the right of the
   node table and 10 of 11 rows fit, so the reader scrolled and sorted to read the top three.
   Evidence: steps 4-6, screenshots 05-07. Also r1-s14.

The study tool refused one step: step 21's "Close" (both "Close table" and "Close panel" matched);
the app did nothing, and the participant used Escape.
