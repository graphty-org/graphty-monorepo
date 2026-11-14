# Pilot: T92 B, two facts about the yeast genes (targeted re-pilot)

Build 48879618c4, served from .study-builds/tier6-r1d1-48879618c4, start `setup:connected-yeast.txt`.
Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T92B/ (each path below is
relative to that folder). The walks of the previous build moved to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build-3549e11129/pilot/T92B/.

Result: the task can be finished, but not cleanly. Fact 1 came back as YMR043W on every walk, and the
right 7 with the right seven genes was reached on every walk that went that far. When fact 1's reply
leaves a selection on, the first answer to fact 2 is "at least 6", with no chip: both walks that met
that state gave it, and a reader who stops there reports a wrong number.

The frozen build holds none of the fix for that state. `git diff 3549e11129 48879618c4` on `graphty`,
`graphty-element`, `compact-mantine` and `pnpm-lock.yaml` is empty, and the two served folders differ
only in `index.html` and two source maps. So this walk measures the previous build's code again: the
binding fix and the chip row fix that `dry-run-r1-2.md` asks for were never committed.

Every session held 331 nodes and 361 edges at its end, each `--end` passed its key check, and no step
printed a script error or a failed request.

## Routes walked

| Folder     | Route                                                                             | Outcome                                                          |
| ---------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| success    | Pointer: Assistant, fact 1, steps, Open run, Values, fact 2, ask again, chip, table | Reached, on a third message; "at least 6" first, then 7 with chip |
| touched-6  | No Assistant: Find with a rule, right-click, Analyze, Quick actions, a question   | All 13 steps matched the previous walk; Find selects the 7       |
| touched-31 | Success path, fact 2, with the selection fact 1 left on                           | "at least 6 above 1.1"; 7 on asking again, with no chip          |
| touched-32 | Starter, fact 2 with Selection 5 on, then the scope x                             | "None of the 5 selected", honest; 7 and the chip after the x     |

The keyboard walk was not asked for here: none of this task's touched routes is a keyboard route.

Gemini calls: success 16, touched-6 9, touched-31 16, touched-32 15.

## Pointer success path

1. Assistant, then fact 1. "The gene that the most connections between other genes pass through is
   YMR043W", with "Computed Bridges for 331 nodes", "Selected 1 node", Open run and Undo. The network
   repaints with the key "Color: Betweenness, 0 to 16,124", the inspector opens on YMR043W (name MCM1,
   Betweenness 16,124, #1 of 331) and the scope reads Selection 1 (success/03.png).
2. 3 steps opens Bridges, Query data, Select (success/04.png). Open run, then Values, shows Top 10,
   YMR043W 16,124 then YGL035C 12,500 (success/06.png).
3. Fact 2 with Selection 1 on: "Within the previously selected gene, none have a gal80Rexp above 1
   (its value is 0.457). Across the entire network, there are at least 6 genes with gal80Rexp above 1,
   led by GAL7 at 3.126. I cleared the selection to inspect the full dataset." and "Selected 0 nodes".
   No chip, no Show in table, and the scope turns to Whole graph (success/07.png). 8 steps holds three
   "No matches." and two chips of 1, the one gene that was selected (success/08.png).
4. "Exactly how many genes in the whole network have gal80Rexp above 1?": "Exactly 7 genes ... GAL7,
   GAL1, GAL10, YNL164C, ADE4, ICL1, and BAS1. No changes were made to the graph." with the chip 7 and
   Show in table (success/10.png). The reply landed below the fold and took a scroll (success/09.png).
5. The chip's hover peeks the seven on the canvas and selects nothing (success/11.png). Show in table
   selects them, the inspector reads gal80Rexp 1.101 to 3.126 and the scope reads Selection 7; the
   table stays in load order (success/12.png). One click on the gal80Rexp heading brings the seven to
   the top, shaded, and the next row is 0.991 (success/13.png).

## Touched routes

**Find with a rule (touched-6).** Replayed, every step matching. "gal80Rexp > 1" offers the rule and
Enter selects the seven: gal80Rexp 1.101 to 3.126 (04.png). The numeric rule still works. A question
with a stray edge selected gave YMR043W, 16,124.36, with "Selected 0 nodes" (12.png).

**Fact 2 with fact 1's selection on (touched-31).** The same state as the success path, the same
result: eight steps, four "No matches.", then "In the previously selected gene, gal80Rexp is 0.457, so
none were above 1. Across the entire graph, gal80Rexp ranges up to 3.126, with at least 6 genes above
1.1 and up to 17 above 0.88; I cleared the selection so we can query the full graph if you would like
the exact count." and "Selected 0 nodes" (04.png). "Across the full dataset, please." then gave
"Exactly 7 genes ..." and "Selected 7 nodes". This time the turn has no chip and no Show in table,
outside or inside its steps (05.png, 06.png). What backs the 7 there is the inspector: 7 nodes,
gal80Rexp 1.101 to 3.126.

**Fact 2 with a selection on (touched-32).** The starter itself selected five this time (03.png), so
the walk's "Select those five." was not needed. Fact 2 read "None of the 5 selected genes have a
gal80Rexp above 1; values range from -0.28 to 0.457, with MCM1 having the highest value at 0.457.",
with the chip 5 and Show in table (04.png, 05.png). The selection held, so the reads stayed limited to
it and the reply says so. The scope x and the same question for the whole network gave "There are 7
genes ..." with the chip 7 and Show in table; the x lasted for that message and the line went back to
Selection 5, as settled (06.png).

## The answer key against the screen

1. The key's fact 2 is 7, and its notes allow a chip, neither, or a chip in the steps. They do not
   name "at least 6", the first reply on both walks with a selection on. It is true as far as it goes
   and is not a count; the key should say that a report of 6 is F.
2. `dry-run-r1-2.md` says the key's line on a turn ending in "Selected 0 nodes" should go. It must
   stay: this build still shows that turn, once, not twice (success/07.png, touched-31/04.png).
3. Every other value matches: YMR043W is MCM1, 16,124 and 12,500 before dividing by the pairs, and the
   seven genes. Fact 1 repainted and selected on the success path, which the key allows.

## Defects

Severity 0 to 4. Only what blocks the task or spoils its grading.

1. Severity 3. With fact 1's selection on, fact 2's first answer is "at least 6 genes", with no chip
   and no Show in table, on 2 of 2 walks. A reader who reports 6 is F, with a wrong belief, on the
   commonest route of the task. The acceptance for this route fails: the turn shows "Selected 0 nodes"
   and no count. Mechanism, read in the source of this build: `runChecked` in `ToolExecutor.ts` hands
   every call the ids bound when the message was sent, and `settleTarget` in `fields.ts` narrows every
   rule to them, so after the model clears the selection the reads stay on one gene while the line
   reads Whole graph. `decided.md` settles the opposite ("Once it is empty the message is about the
   whole graph"), but the fix is not in the build. success/07.png, success/08.png, touched-31/04.png.
2. Severity 2. A turn that selects its answer has no chip: "Exactly 7 genes" with "Selected 7 nodes"
   carries no chip and no Show in table, even in its steps, against `decided.md` ("A selection is not
   a change to the graph, so it does not hide a turn's chip row"). The fix was reverted (baeb532d60)
   and not replaced. The inspector still backs the 7, so the task survives. touched-31/05.png, 06.png.
3. Severity 2. "Selected 0 nodes" still draws, against `decided.md` ("a selection of nothing draws no
   line"), under an answer on the success path and on a turn about something else. success/07.png,
   touched-31/04.png, touched-6/12.png.
