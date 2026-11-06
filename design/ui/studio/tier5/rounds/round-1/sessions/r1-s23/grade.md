# Grade: session r1-s23 (task T75A, Alex, returning)

Grade: P
False done: no
Wrong turns: 7
Steps: 42 (counted from `route.jsonl` in `tool/steps.mjs`'s units; the answer key's path for T75 A is 14, so 28 over)
Overwhelm: 5 (least sure: steps 21-23, picking "Connected components -- 3 values" in the filter's value picker and getting a step that read "Group 1 -- 549", with two same-named entries in the picker and "(visible)" / "(whole graph)" columns only in the table)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 68 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 32 and the end-state records hold the answer key's named partial result, not the
success state:

- Top bar: "112 of 549 nodes, 896 of 2,084 edges". The Values tab: "Nodes showing 112 of 549",
  Full graph 549 nodes and 2,084 edges, so nothing was deleted.
- `work.json`: two filter cards. The first keeps `graphty.degree` min 10, then Largest component
  (computed over the full graph, which is one piece, so it keeps all 112). The second keeps
  Connected components' piece size min 50, computed "so far" -- within that card, whose start is
  all 549 nodes, so it keeps everyone ("549 of 549 nodes so far", screenshot 31).
- The canvas still draws the 5-node bunch and the 2-node pair beside the big tangle (screenshot 32).
- `work.json` also holds two Connected components runs: one on the 112 showing (3 pieces: 105, 5,
  2) that the participant ran from Analyze, and one on the whole graph that picking the result in
  the filter's picker started. `styles.json` gained the first run's Group 1-3 layers; the task
  asks for no style.
- Reported: "What the screen shows is 112", with "probably 105" offered as a guess the participant
  would not stand behind. The answer key: a Largest component step over the full graph keeps 112,
  "that is P (the count is 112, the stranded 7 stay)". The degree half is right; the big-tangle
  half is not on screen.

## Path and wrong turns

The participant reached the key's first half on its path (Filters, Degree, 10, Enter: 112 of 549 at
step 4), then never reached the success state. The key's second half -- Condition... in the same
card, Connected components: Piece size, Advanced, So far, a minimum -- was never taken in the
Degree card: So far was only ever set in a second card, where it covers nothing before it.

Wrong turns (7), all abandoned approaches before any success state:

1. Largest component as a Condition in the Degree card (steps 6-8): changed nothing; left in place
   once the participant saw stragglers.
2. A second filter card (step 11), meant to run on what the first left; it previews over the full
   graph.
3. The second card's "More" menu opened and closed with nothing chosen (steps 13-14).
4. Analyze > Connected components > Run (steps 15-18), a place the task does not need.
5. Picking "Connected components, 3 values" (step 21), abandoned when it read Group 1 549.
6. The same pick again (step 23).
7. Switching the step back to Largest component (step 28), abandoned at once.

Not wrong turns: hovers (steps 5, 10), the 3-second wait (27). The Piece size picks, Advanced and
So far (steps 24-31) are the key's controls, used in the wrong card; they stand as the end state.

## Follow-up

Present in the transcript. Rating 5 (the degree half "maybe a 2 on its own"). Least sure: steps
21-23. The filter editor read "Connected components: Piece" with one checkbox "Group 1 -- 549"
after the participant had picked the option labeled "3 values"; the preview table had just grown
"Connected components (visible)" and "Connected components" columns; reopening the picker showed
two entries named "Connected components" (3 values / 1 value) and two named "Piece size" (2 to 105
/ 549 to 549) with no tag telling them apart. Picking "3 values" again gave the 549 one again. "So
far" under Advanced then made it worse: it said So far and still "549 of 549 nodes so far".

## Problems

1. Severity 3, build-defect. In a filter step's value picker, after Connected components has been
   run on the nodes showing, the Results entries "Connected components, 3 values" and "Piece size,
   2 to 105" describe that run, but picking either binds the step to a new whole-graph computation
   ("Group 1 -- 549", "549 to 549") and starts a second run. The option's hint promises one result
   and the step uses another. This is what stopped the participant. Evidence: steps 20-24,
   screenshots 20-24 (the route's out lines confirm the option clicked); `work.json` end runs
   `components` and `components_2`. Repro: `rounds/round-1/repro/r1-s23/repro.sh`, screenshots
   `repro/r1-s23/run/09.png` (Group 1, 549) and `run/10.png` (549 to 549), top bar 112 of 549.
2. Severity 3, behavior. Largest component as a step computes over the full graph and has no
   Advanced, so it cannot be computed on what the steps before it left; over a one-piece graph it
   changes nothing, yet the outline lists it under "Degree min 10" as if it narrowed, and nothing
   says it kept everyone. The participant noticed only from the stray dots. Evidence: steps 6-9,
   screenshots 08-09; step 28, screenshot 28 (no Advanced). The answer key names this outcome P.
3. Severity 3, behavior. A second filter card's "So far" covers only that card's own earlier steps
   (none), so it reads "549 of 549 nodes so far" while the top bar reads 112; the workspace shows a
   second card's preview over the full graph ("549 of 549") with nothing saying whether cards stack
   or what "so far" counts from. Evidence: step 11, screenshot 11; steps 25-31, screenshots 26, 27,
   31.
4. Severity 2, wording. "Computed on: Full graph / So far", the one control that makes a structure
   step depend on the steps before it, sits under a closed Advanced; the participant opened it only
   after the plain path failed. Evidence: step 25, screenshot 25.
5. Severity 2, wording. The picker names the two runs' results identically ("Connected components",
   "Piece size") with only a values hint to tell them apart, while the table under it names the same
   columns "(visible)" and "(whole graph)". Evidence: step 22, screenshot 22; screenshot 32's table
   tabs.
6. Severity 1, wording. The second card's outline row is cut to "Connected compon... m... So far",
   so its bound cannot be read without opening it (the key notes the same). Evidence: steps 30-32,
   screenshots 30 and 32.
7. Severity 1, opinion. The Values tab gives Components only for the full graph (1), not for what is
   showing, the number the participant wanted to check. Evidence: step 14, screenshot 14; screenshot
   32.
8. Severity 1, wording. The canvas key lists "Draw order: graphty.style.json.node.el.drawOrder", an
   internal name (known on this build). Evidence: `key.json`; screenshot 32.
9. Severity 1, behavior. After Done the second card shows "Edit" where its count goes, so the card
   gives no count (known on this build). Evidence: step 32, screenshot 32.

The study tool refused nothing: every step in `route.jsonl` exited 0 with nothing missed.
