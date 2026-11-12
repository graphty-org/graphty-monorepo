# Grade: session r3-s10 -- Sam, T15 B (a whole first session on the own file, friends.csv)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, screen-reader mode off.

## Void: the session did not play Sam

**Void: yes -- re-run it.** Sam is the sighted keyboard-only participant (`personas/keyboard-only-sam.md`;
roster: "never uses the mouse (`--key` and `--type` only)"), and this session is the one that
puts Sam on T15 for the keyboard bar (bar 7: Sam S or SD on T10, T12 and T15). Two things are
wrong:

- **Every step was a pointer action.** Steps 2-15 are all `--click` or `--click-at` (for example
  step 4 `--click-at 680,864` on the Analyze button, step 8 `--click-at 1419,234` on "Add to
  Shape", step 13 `--click-at 24,20` on "Main menu"). Not one `--key` or `--type` was used. The
  transcript's own title says "keys only".
- **The participant is not Sam.** The transcript describes "Sam, 20, second-year sociology
  undergraduate ... Ctrl+Z for everything"; the persona file's Sam is a 41-year-old
  business-intelligence analyst with a repetitive strain injury who uses no mouse.

Under criteria.md "Tool fault" this is a run that did something the person could not (a
keyboard-only user clicking), so the session is void and must be re-run with Sam on keys only.
**Bar 7 for Sam on T15 is not measured by this session.** The task result below is recorded
because it is what the screen shows, not as a keyboard result; it should not be counted toward
bar 1 or bar 7 until the orchestrator decides how void sessions are tallied.

## Result (as a pointer session)

- **Grade: S** (success). All five parts reached in one sitting, none undone later.
- **Parts reached:** 5 of 5.
- **Steps:** 15 real.mjs commands (the start plus 14 steps) against the round 3 success path of
  13 commands on B. The extras are the separate "No thanks" click and the two-click export route
  (Main menu, then Export...). Keys: none (the keyboard path is 103 keys on the own file).
- **Wrong turns:** 0. Hesitations at the measure list (step 4), the "+" beside Shape (step 7) and
  the "id" label attribute (step 11), but each choice was the right control and nothing was undone.
- **False "done":** none. Every "done" matches its screenshot: file on screen (03.png: Nodes 20,
  Edges 41); "part two done, I think" with the outline row "PageRank 20" and the key "Color:
  PageRank 0.04382 to 0.06608" (06.png); bigger dots with "Size 1 to 3" and "Size: PageRank" in
  the key (10.png); "everyone's named" with "20 labels, 0 hidden" and all 20 names drawn (12.png);
  the picture with its key (15.png toast, saved file).
- **Ease (from the transcript):** 6 of 7.
- **Failure codes:** `meaning-wrong` on one claim, not on the task (see "Watch on B"). Not
  `ids-not-names`: the `id` column holds the names, the right binding on B. Plus
  `void-persona` (the session is void, above).
- **Build-decided:** no.

## The five parts, checked on screen

1. **File drawn.** 03.png: 20 dots, Nodes 20, Edges 41, Directed, Components 1, opened at the
   first try by "Open project or file...".
2. **A ranking run finished.** PageRank (the "Start here" choice) from Analyze, defaults kept.
   06.png: outline row "PageRank 20", key "Color: PageRank 0.04382 to 0.06608".
3. **Sizes bound to that result, visibly different.** 10.png and 15.png: "Size 1 to 3" on the
   PageRank row's Style tab; key "Size: PageRank 0.04382 to 0.06608"; dots visibly differ. Meaning
   stated: "both are the same thing, PageRank ... Bigger and darker brown means a higher score" --
   correct.
4. **Names drawn.** 12.png and 15.png: label line "Above, Abc id" on the PageRank row (all 20
   nodes); "20 labels, 0 hidden"; every name drawn. "Show all labels" not used (nothing hidden).
5. **Image downloaded, picture checklist passed.** `downloads/friends_current-view.png`
   (1806 x 1720):
    - same nodes and arrangement as 15.png: yes;
    - sizes visibly different: yes;
    - names drawn on screen drawn in the image: yes, all 20 ("Chloe" over Farah's dot, Eli and Dev
      overlapping, as on screen);
    - key names every channel in use: "Size: PageRank" and "Color: PageRank", both 0.04382 to
      0.06608.

## Other measures

- **Usage card:** declined ("No thanks", step 2): "I don't want anyone collecting anything off my
  laptop". No detour; no wrong belief stated about what is sent.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes, by
  the "Start here" tag; the participant said Degree was the measure they knew and could not say
  why PageRank is "who matters most".
- **Watch on B (Ava drawn larger than Farah in 3D):** met. At step 12 and in the wrap-up: "Ava
  matters most, then Farah, then Ivan and Hana." PageRank on this file (recomputed from
  `Downloads/friends.csv`, directed, damping 0.85; the extremes match the key's 0.04382 and
  0.06608) is Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575. So the claimed order is
  wrong twice: Ava before Farah, and Ivan before Hana. No per-node value was ever on screen (Values
  never opened), so not `truth-on-screen`. On 15.png Ava's dot is about 70 px across and Farah's
  about 60 px, with Chloe's dot in front of Farah's.
- **Silent commits:** none. Run (05 to 06), size binding (09 to 10) and label attribute (11 to 12)
  each changed the canvas and the key or label count.
- **Counts that disagree with the drawing:** none. "20 labels, 0 hidden" is true; the covered
  "Chloe" is occlusion by a dot, not a hidden label.
- **Tool prints:** step 15 "Export" matched the dialog and the button; the tool took the button,
  as a person would. Not a wrong turn.

## Problems

| #   | Sev | Kind     | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                            |
| --- | --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | 4   | behavior | In the default 3D view, perspective makes nearer dots look bigger, so the size channel misranks: Ava (0.06423, second) is drawn larger than Farah (0.06608, first). The participant reported Ava as the most important person, and Ivan above Hana, a wrong result they did not know was wrong. Nothing on screen says 3D sizes are not comparable. Also met in r3-s08; this session is void for its persona, so whether it confirms the finding is the orchestrator's call. | Step 12, wrap-up; 12.png, 15.png; downloaded PNG around (685, 1075) and (870, 1410) |
| 2   | 2   | behavior | Labels and dots collide where nodes sit close: "Chloe" is drawn on Farah's dot, Eli and Dev overlap, on screen and in the exported picture, while the line reads "0 hidden". The participant left it, not knowing how to fix it.                                                                                                                                                                                                                                             | Steps 12, 15; 12.png, 15.png; downloaded PNG around (840, 1380) and (555, 1430)     |
| 3   | 2   | behavior | "Size" is reachable only through the "+" beside Shape; the participant looked for the word Size, found none, and guessed.                                                                                                                                                                                                                                                                                                                                                    | Steps 7-8; 07.png, 08.png                                                           |
| 4   | 2   | wording  | The label picker offers only "id" under Attributes, with no sample value; the participant guessed id held the names.                                                                                                                                                                                                                                                                                                                                                         | Step 11; 11.png                                                                     |
| 5   | 1   | behavior | The file is read as directed and drawn with arrows, though "knows" goes both ways; nobody asked, and the participant did not know whether it changed who comes out on top (it does: PageRank on a directed graph).                                                                                                                                                                                                                                                           | Step 3, wrap-up; 03.png                                                             |
| 6   | 1   | behavior | The Export dialog never says the key is included and its preview is too small to read; the participant trusted a tiny box in the corner.                                                                                                                                                                                                                                                                                                                                     | Step 14; 14.png                                                                     |
| 7   | 1   | opinion  | The key gives raw PageRank scores (0.04382 to 0.06608), which the participant "could not explain to anyone in words".                                                                                                                                                                                                                                                                                                                                                        | Steps 6, 10, 15; 06.png, 10.png, downloaded PNG                                     |
| 8   | 1   | opinion  | Analyze's list is jargon (Betweenness, Eigenvector, Katz, HITS, Damping factor); the "Start here" tag carried the choice.                                                                                                                                                                                                                                                                                                                                                    | Steps 4-5; 04.png, 05.png                                                           |
| 9   | 0   | opinion  | Colors arrived on their own after Run, so size and color say the same thing twice; the participant did not choose it.                                                                                                                                                                                                                                                                                                                                                        | Step 6; 06.png                                                                      |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written. Whether any step
of T15 B can be done by keyboard is exactly what this session should have tested and did not.
