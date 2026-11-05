# Pilot walk: T91 B, make the yeast genes stand out (re-walk after the fixes)

Build 3549e11129, served from `.study-builds/tier6-r1d1-3549e11129`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T91B/ (written below as
`<walk>/<n>.png`). The data stayed yeast-galactose.graphml, 331 nodes and 361 edges, on every walk.

Result: the task is reached by pointer. A numeric rule still works: the layer's rule is
`data.gal4RGexp < -1`, matched 9, painted 9 (`success/styles.json`). All four routes of this task
that the fixes touched were walked. One new wrong result turned up on the stray selection route; it
does not touch the success path and a new message recovers it.

## Success path, by pointer (success/, 7 model calls)

Replayed from the earlier walk up to the point the reply arrived sooner, then by hand.

1. Assistant, typed "Make every gene with gal4RGexp below -1 stand out from the rest of the network",
   Enter.
2. Reply: "Found 9 genes...", "Sized 9 nodes", "Colored 9 nodes", Open layer, Undo. Key card "Color:
   Low gal4RGexp, 9 of 331 nodes". I counted nine red dots (05.png).
3. The 9 chip in the opened steps selects them; the inspector reads gal4RGexp -2.406 to -1.004
   (07.png). Open layer shows "Rule: data.gal4RGexp < -1, 9 nodes" (08.png). The x on the scope line
   gives Whole graph and Use selection (09.png). Close gives Graph, with Low gal4RGexp 9 (10.png).

## Mismatches with the answer key

None. The key's path, change line, optional "Sized 9 nodes" and "9 of 331 nodes" all match
(success/05.png).

## Routes the fixes touched

**T91B detour-2: Show in table (touched-14/, 6 model calls).** The whole route replayed and matched.
"how many genes have gal4RGexp below -1?" answers 9 with the chip and Show in table (03.png). Show in
table selects nodes, not edges: 9 nodes selected, Nodes tab (04.png). Two clicks on the gal4RGexp
heading bring up the nine, shaded: GAL1, GAL7, GAL10, HOM3, ADE4, HIS7, GLN1, MET16, GAL3 (06.png).
"make them stand out" paints those nine, by id, matched 9 (08.png). Escape during the next message
stops it, with the words kept in the turn and the text back in the composer (10.png). Opening in load
order stays as triaged, for later.

**T91B detour-2: asking first (touched-34/, 7 model calls).** The same route, its own session, and
matched. The turn shows the chip and Show in table with no change line (03.png). The steps open to one
Query data with a 9 chip (12.png). Undo on the make-them-stand-out turn takes the nine back and reads
Undone, and the turn keeps its words (12.png).

**T91B detour-3: stray selection, Send again (touched-27/, touched-27-send-again/,
touched-27-x-send-again/; 13, 14 and 2 model calls).** The earlier route's failed turn no longer comes:
the model now answers without a failure row, so Send again was not offered in two sessions, and the
offer was reached in a third session by a real failed message.

- touched-27/: an edge left selected by a right-click, then the request. The reply says the selection
  holds only an edge, with a 1 chip, Show in table and no change (10.png). The same request again: the
  model clears the selection and asks how to apply it (11.png). "Apply styling to the entire graph",
  Answer: the reply says the selection holds only an edge, "No matches.", no change, under a line
  reading Whole graph (12.png, steps 13.png). See the first defect below. A new message under Whole
  graph then works: 9 of 331, the rest gray (14.png).
- touched-27-send-again/: the same start. The reply clears the selection and asks whether to go across
  the whole graph (04.png). "yes" works: 9 of 331, the rest gray (05.png).
- touched-27-x-send-again/: to reach a real failure, the provider was moved to OpenAI with a made-up
  key, as on T90. With the edge still selected the request fails: "Could not reach OpenAI", Send again,
  Selection 1 on the scope line (05.png). Back on Google, the x gives Whole graph (08.png). Send again
  then goes across the whole graph: 2 steps, "Found 9 genes... out of 331", Colored 331, Colored 9
  (09.png), rule matched 9. The failure's words stay in its turn, the composer empties, and the
  selection and its scope line come back, which `decided.md` says the x does.

## Defects

1. **Severity 3. An answer is still bound to a selection the model cleared.** touched-27/11.png to
   13.png. After the model cleared the edge, the scope line read Whole graph and the model's own
   question offered "Apply styling to the entire graph". Choosing it changed nothing: the steps read
   "No matches." four times, and the reply says the selection holds only an edge. The reader did what
   the screen offered, under a line saying the opposite of what ran. Mechanism, as far as the record
   shows: the turn stays bound to the selection after the model clears it, and an answer goes on with
   the message it answers, so reads narrow to the bound ids (the shared cause `rejected-fixes.md` names
   in graphty-element). A new message recovers it. Stray selection only; the success path never meets it.
2. **Severity 2. "Selected 0 nodes" still draws, and the model still clears the reader's selection.**
   touched-27/11.png, touched-27-send-again/04.png. `decided.md` says a selection of nothing draws no
   line; that fix was reverted (`rejected-fixes.md`), so this is known and open, not a regression.
3. **Severity 1. A bare "No matches." ends a turn with no way forward offered.** touched-27/12.png. No
   Send again, and the warning does not say what found nothing. Same turn as the first defect.

Earlier items seen again and left as triaged: Show in table in load order (touched-14/04.png), the
small drawing with the table open (touched-14/04.png), the selection shifting the drawing
(success/07.png), the chip with no tooltip, and the undo notice wording (touched-34/12.png).
