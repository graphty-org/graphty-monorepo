# Pilot walk: T91 B, make the yeast genes stand out (targeted re-walk)

Build 48879618c4, served from `.study-builds/tier6-r1d1-48879618c4`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T91B/. Each walk folder
carries the build in its name (`success-48879618c4`, and so on), because the plain names hold the
walks of the earlier build 3549e11129, which were the replay sources and are left as they were. Below,
`<walk>/<n>.png` means `<walk>-48879618c4/<n>.png`. The data stayed yeast-galactose.graphml, 331 nodes
and 361 edges, on every walk.

Result: the task is reached by pointer, and the number is right. The nine genes the answer key names
are the nine the layer matched. One wrong result remains on the stray selection route. It does not
touch the success path, and a new message recovers it.

**This build holds no app change from the last one.** `git diff 3549e11129 48879618c4` on `graphty`,
`graphty-element`, `compact-mantine` and `pnpm-lock.yaml` is empty, and the two frozen builds' `assets`
folders are identical apart from source maps. Every commit between them is documents or the study tool. So the
fixes planned for the routes below are not in what was walked. `decided.md`'s "A message is limited
to its selection only while that selection holds something" is not built: `settleTarget` in
`graphty-element/src/ai/tools/fields.ts` narrows to the bound ids with no check that the selection
still holds anything, and `runChecked` in `ToolExecutor.ts` passes those ids whatever the selection is
now. The same is true of "a selection of nothing draws no line".

## Success path, by pointer (success/, 1 message; touched route 5, a numeric rule still works)

The earlier route replayed to its end, all 9 steps matching.

1. Assistant, typed "Make every gene with gal4RGexp below -1 stand out from the rest of the network",
   Enter.
2. Reply: "Found 9 genes...", "Sized 9 nodes", "Colored 9 nodes", Open layer, Undo. Key card "Color:
   Low gal4RGexp, 9 of 331 nodes". Nine red dots counted by eye (05.png).
3. The 9 chip in the opened steps selects them; the inspector reads gal4RGexp -2.406 to -1.004
   (07.png).
4. Open layer shows "Rule: data.gal4RGexp < -1, 9 nodes", size 2.5, color F43F5E (08.png, 09.png). The
   x on the scope line gives Whole graph with Use selection (09.png).

`styles.json`: layer "Low gal4RGexp", selector `data.gal4RGexp < -1`, matched 9, painted 9 for size and
color.

## Mismatches with the answer key

None. The path, "Colored 9 nodes", the allowed "Sized 9 nodes" and "9 of 331 nodes" all match.

## Touched routes

**T91B detour-2: Show in table (touched-14/).** Replay stopped at step 2 only because the reply was
slower than the recorded wait (03.png); 15 seconds more brought it, then by hand. "how many genes have
gal4RGexp below -1?" gave 9 with the chip and Show in table (04.png). Show in table selected the nine
and opened the table in load order, with none of them on screen (05.png). Two clicks on the gal4RGexp
heading brought them up, shaded: GAL1, GAL7, GAL10, HOM3, ADE4, HIS7, GLN1, MET16, GAL3, the key's nine
(06.png). Close table, then "make them stand out" under Selection 9: Colored 9, Sized 9, key card 9 of
331 (07.png). The layer's selector lists the nine ids, which the key allows. Escape during the next
message: "Stopped. Changes taken back.", my text back in the composer, look unchanged (09.png). The
aborted request is printed as a failed request; that is the abort itself.

**T91B detour-2: asking first (touched-34/).** All 11 steps matched. The turn shows the chip and Show
in table with no change line (03.png). Steps open to one Query data with a 9 chip. Undo on the
make-them-stand-out turn takes the nine back and reads Undone, and the turn keeps its words (12.png).

**T91B detour-3: stray selection, Send again (touched-27/, touched-27-send-again/,
touched-27-x-send-again/).** An edge left selected by a right-click, then "color genes with gal4RGexp
below -1 red and make everything else gray".

- touched-27/: matched to the request, then went another way. The model cleared the selection and
  the line read Whole graph (09.png). The reply then said "Filtering for genes with gal4RGexp below -1
  matched zero nodes, so no styling was applied; would you like to target a different threshold or
  select specific genes?", with "Selected 0 nodes" (10.png). The steps read "No matches." four times
  (11.png). Nothing was painted. The same request as a new message worked: 9 of 331, the rest gray,
  matched 9 (12.png). The question "Apply styling to the entire graph" of the earlier pass was not
  offered this time, so an answer under it was not reached.
- touched-27-send-again/: the model cleared the selection and asked in prose whether to go across the
  full graph, with "Selected 0 nodes" (03.png). "yes" worked: 9 of 331, the rest gray, matched 9
  (04.png). No failed turn came, so Send again was not offered here.
- touched-27-x-send-again/: to reach a real failure, the provider was moved to OpenAI with a made-up
  key. With the edge selected the request failed: "Could not reach OpenAI", Send again, Selection 1
  (05.png). Back on Google, the x gave Whole graph (08.png). Send again went across the whole graph:
  3 steps, "Found 9 genes", Colored 331, Colored 9 (09.png), matched 9. The failure's words stay in its
  turn, and the selection and its scope line come back, as `decided.md` says of the x. The replay
  stopped at the failure only because the local port in the browser's error differs between runs.

## Defects

1. **Severity 3. A false count under a line reading Whole graph.** touched-27/10.png, 11.png. The
   reply says the rule matched zero genes and suggests another threshold; nine match. A reader who
   trusts it gives up or changes the rule, and nothing on screen says the selection was why.
   Mechanism, read from the code and the steps (the tool calls are not logged): the message was bound to the edge when sent, and after the model clears it, reads still
   narrow to the bound ids, which hold no node, so each comes back "No matches.". This is the earlier
   defect in a stronger form: it now needs no answer, and it happens inside the first message. 1 of 2
   natural sessions; the other ended in a question. Stray selection only; a new message recovers it.
2. **Severity 2. "Selected 0 nodes" still draws, and the model still clears the reader's selection
   unasked.** touched-27/10.png, touched-27-send-again/03.png. `decided.md` says a selection of nothing
   draws no line. Not built in this build.
3. **Severity 1. A bare "No matches." four times with no way forward.** touched-27/11.png. It does not
   say what found nothing. Same turn as the first defect.

Seen again and left as triaged: Show in table in load order (touched-14/05.png), the small drawing
with the table open (touched-14/05.png), selecting shifting the drawing (success/07.png), and the undo
notice wording (touched-34/12.png).
