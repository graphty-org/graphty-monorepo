Grade: S
False done: no
Wrong turns: 1

# r1-s07b -- T40 A (Les Miserables, every "Mme" in purple, count them), persona Ruth

- Participant model: opus (claude-opus-5-5 in the participant transcript).
- Build: 758b8e8081 (session.json buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
- Leaks: none (`leaks.json`: 35 calls, transcript found, `leaks: []`). Not VOID.
- Merged: no (a sample task; nothing was brought in).

## Outcome against the success definition

- Last screenshot (17.png): layer "Married women (Mme)", Which nodes "name contains Mme, 6 nodes",
  "6 of 77 nodes", Fill Color `800080`, key "Color: Married women (Mme) 6 of 77 nodes".
- Style tree (`key.json` drawn): nodes `#800080` x 6, `#6366f1` x 71 (the sample's default, as at
  04.png before any styling); edges `#a9a9a9` x 254, untouched. `800080` is the CSS keyword
  purple, which the app's color-name function names "purple": the asked hue holds.
- Exactly the 6 the answer key lists (Mme Magloire, Mme de R, Mme Thenardier, Mme Burgon,
  Mme Pontmercy, Mme Hucheloup), everyone else unchanged.
- Count said: 6, read from the screen (the find list's "Nodes 6" at 05.png, the card's "6 of 77
  nodes" at 12-13.png, and the key at 16.png). Matches the key.
- `work.json` "gone" lists the start page demo's Louvain run and layers; those belonged to the start
  page's turning demo, not to the opened sample (styles-steps shows the sample opening at 04.png on
  the single default color), so nothing the participant arrived to was lost.
- Match case was ticked; it changes nothing on this data (still 6).

Grade S.

## Steps and wrong turns

Success path: 11 steps. Taken: about 20 person actions (tool refusals not counted: the ambiguous
"Samples" at step 1 and the ambiguous "Fill" at step 13).

1. Samples (click-at). 2. The Les Miserables card. 3-4. Find box, type `Mme` (a detour, used to
count; not on the path, not wrong). 5. "+" by Style layers at its bottom position: the find list
collapsed, the "+" moved to the top and no menu opened -- **wrong turn 1** (caused by the build,
see problem 1). 6. "+" again. 7. Layer. 8. Rename and Enter (extra). 9. Which nodes. 10. Add a
condition. 11. name. 12-13. Click the text box (focus was already there) and type `Mme`. 14. Match
case click landed on the open suggestion list (problem 3). 15. Escape. 16. Match case (extra).
17. Done. 18. Fill "+". 19. `purple`, Enter. 20. Hover a purple dot to check it (extra).

## Problems

1. **Style layers "+" moves out from under the pointer while the find list is open** -- severity 2,
   build-defect. With "Mme" in the find box the "+" sits at the foot of the left panel (276,799).
   Clicking it collapses the find results, the layer list jumps to the top, and no menu opens; the
   button must be found and clicked a second time. Evidence: participant step 5 (05.png -> 06.png).
   Repro: `rounds/round-1/repro/r1-s07b/` 04.png (list open, the tool resolves 276,799 to button
   "Add a layer or a folder") -> 05.png (list collapsed, "+" at 276,122, no menu). One
   participant plus a scripted repro: confirmed.
2. **Hovering a node shows nothing on screen** -- severity 2, behavior. On the opened sample the
   pointer over a node raises the Hovered layer's count to 1 but draws no name and no tooltip, so a
   reader cannot check who a colored dot is without clicking. Evidence: step 16 (17.png); repro
   06.png (`--hover-at 711,523`: "tooltip: null", Hovered 1, no label drawn). Recorded as a design
   problem with one session plus a repro.
3. **Name suggestions open over Match case and Done** -- severity 1, behavior. Typing in the
   condition's text box opens the suggestion list over the Match case box; the click on it hit the
   list, and Escape was needed first. Evidence: steps 11-12 (12.png, 13.png). Already described in
   the answer key's success path (known).
4. **The color box shows a hex code and starts on the default indigo** -- severity 1, wording /
   opinion. Fill "+" opens Color `6366F1`, the same bluish purple every node already has; the
   participant did not expect a color word to be accepted, and purple beside the default indigo
   reads only as "darker dots". Evidence: steps 14-15 (15.png, 16.png).
5. **Find list and condition suggestions spell names differently** -- severity 1, wording. The find
   list shows ids ("MmeMagloire"), the card's suggestions show names ("Mme Magloire"); the
   participant asked which is the real name. Evidence: 05.png against 12.png. Known in the answer
   key.
6. **Two controls named "Samples" on the start page, three named "Fill" in the style panel** --
   severity 1, accessibility. The tool refused both clicks as ambiguous (tool events, not reader
   confusion), but same-named controls are also ambiguous to a screen reader. Evidence: step 1
   (02.png), step 13 (14.png).
