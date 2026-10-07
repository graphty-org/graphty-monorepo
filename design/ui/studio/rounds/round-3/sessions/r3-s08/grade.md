# Grade: session r3-s08 -- Nadia, T15 B (a whole first session on her own file, friends.csv)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, sighted mouse participant.

## Result

- **Grade: S** (success). All five parts reached in one sitting, none undone later.
- **Parts reached:** 5 of 5.
- **Steps:** 14 real.mjs commands (the start plus 13 steps) against the round 3 success path of
  13 commands on B. The extra is the two-click export route (Main menu, then Export...).
- **Wrong turns:** 0. Hesitations at the measure list (step 3), the "+" beside Shape (step 6) and
  the "id" label attribute (step 10), but every choice was the right control; nothing was undone.
- **False "done":** none. Each "done" claim matches its screenshot: file on screen (02.png, Nodes
  20, Edges 41); "bigger dots -- done" with "Size 1 to 3" and "Size: PageRank" in the key
  (09.png); "names are on" with "20 labels, 0 hidden" and every name drawn (11.png); "picture file,
  with its key -- done" with the saved file holding both key lines.
- **Ease (from the transcript):** 6 of 7.
- **Failure codes:** `meaning-wrong` on one claim, not on the task: in the wrap-up she named Ava as
  the person who matters most, from dot size alone. On this build Farah is first (0.06608) and Ava
  second (0.06423); Ava's dot is drawn larger only because the default 3D view puts it nearer the
  camera. Her reading of what the sizes and colors stand for (both PageRank, bigger and darker =
  higher) is correct, so step 3 of the task holds. Not `ids-not-names`: the `id` column holds the
  names, which is the right binding on B.
- **Build-decided:** no. **Void:** no.

## The five parts, checked on screen

1. **File drawn.** 02.png: 20 dots, Nodes 20, Edges 41, Directed, opened at the first try by
   "Open project or file...".
2. **A ranking run finished.** PageRank (the "Start here" choice) from Analyze, defaults kept
   (Weight: None). 05.png: the outline row "PageRank 20" and the key "Color: PageRank 0.04382 to
   0.06608".
3. **Sizes bound to that result, visibly different.** 09.png and 14.png: "Size 1 to 3" on the
   PageRank row's Style tab, the key reads "Size: PageRank 0.04382 to 0.06608", dots visibly
   differ. Meaning stated: "Both are PageRank. The bigger and the darker the dot, the higher that
   person's PageRank" -- correct.
4. **Names drawn.** 11.png and 14.png: label line "Above, id" on the PageRank row, which covers
   all 20 nodes; "20 labels, 0 hidden", every name drawn. "Show all labels" was not used (not
   needed: nothing was hidden).
5. **Image downloaded, picture checklist passed.** `downloads/friends_current-view.png`
   (1806 x 1720):
   - same nodes and arrangement as 14.png: yes;
   - sizes visibly different: yes;
   - names drawn on screen drawn in the image: yes, all 20 ("Chloe" sits on Farah's dot, Eli and
     Dev overlap, as on screen);
   - key names every channel in use: "Size: PageRank" and "Color: PageRank", both 0.04382 to
     0.06608.

## Other measures

- **Usage card:** declined ("No thanks", step 2) on reflex ("I say no to everything"); no detour,
  no wrong belief stated about what is sent.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes, by
  the "Start here" tag. She said Degree's description fit "who knows the most people" better and
  she could not defend her choice to a reviewer.
- **Watch on B (Ava drawn larger than Farah in 3D):** met. At step 11 ("Ava is the biggest and
  darkest") and in the wrap-up ("Ava matters most, then the big dark one at the bottom (Farah, I
  think ...)") she ranked Ava first from the drawing. She never opened Values or any per-node
  number, so the true order was never on her screen; not `truth-on-screen`. On 14.png Ava's dot
  is about 70 px across and Farah's about 60 px, with Chloe's dot drawn in front of Farah's.
- **Silent commits:** none. Run (04 to 05), size binding (08 to 09) and label attribute (10 to 11)
  each changed the canvas and the key or label count.
- **Counts that disagree with the drawing:** none. "20 labels, 0 hidden" counts labels the
  overlap rule hid; the half-covered "Chloe" is occlusion by a dot, not hiding.
- **Run name:** no pause or question about the run's name; she read "PageRank" throughout.
- **Tool prints:** "Export" matched the dialog title and the button at step 14; the tool took the
  button, as a person would. Not a tool fault.

## Problems

| # | Sev | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | In the default 3D view perspective makes nearer dots look bigger, so the size channel misranks: Ava (PageRank 0.06423, second) is drawn larger than Farah (0.06608, first), and Farah is partly behind Chloe's dot. The participant reported Ava as the most important person, a wrong result she did not know was wrong. Nothing on screen warns that 3D size is not comparable. Seen in this participant only (the other T15 B session named Ava and Farah together), so not yet confirmed. | Steps 11, wrap-up; 11.png, 14.png; downloaded PNG around (690, 1080) and (870, 1410) |
| 2 | 2 | behavior | Labels and dots collide where nodes sit close: "Chloe" is drawn on Farah's dot and half covered, Eli and Dev overlap, on screen and in the picture, while the line reads "0 hidden". The participant could not tell whether the second-ranked dot was Farah or Chloe. Also seen in the other T15 B session, so confirmed. | Steps 11, 14; 11.png, 14.png; downloaded PNG around (840, 1380) |
| 3 | 2 | behavior | "Size" is reachable only through "+" beside Shape; she looked for the word Size and guessed. Also seen in other T15 sessions, so confirmed. | Steps 6-7; 06.png, 07.png |
| 4 | 2 | wording | The label picker offers only "id" under Attributes, with no sample value; to this participant an id is an account number, and she picked it only because nothing else was offered. Also seen in the other T15 B session, so confirmed. | Steps 10-11; 10.png |
| 5 | 1 | behavior | The Export dialog never says the key is included and its preview is too small to read; she trusted the tiny box in the corner. Also seen in other T15 sessions. | Step 13; 13.png |
| 6 | 1 | opinion | The key gives raw PageRank scores (0.04382 to 0.06608); she could not turn them into a sentence ("Ava scored X") for someone else. | Steps 5, 9, 14; 05.png, 09.png, downloaded PNG |
| 7 | 1 | opinion | Analyze's list is jargon (Betweenness, Eigenvector, Katz, HITS, Damping factor); the "Start here" tag carried the choice and she could not justify it. | Steps 3-4; 03.png, 04.png |
| 8 | 1 | opinion | The PageRank form offers "Weight: None" while the file has a weight column; she did not know whether leaving it changed the answer. | Step 4; 04.png |
| 9 | 0 | opinion | The colors appeared on their own after Run; she never chose them and was unsure whether she had caused them. Did not slow her. | Step 5; 05.png |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written for this session.
Problem 1 is a rendering behavior of the default 3D view, the same on every load of this drawing,
and is recorded as behavior pending a second participant.
