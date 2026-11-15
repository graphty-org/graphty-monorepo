# T79 B targeted re-pilot (build 47c95a09fc)

Start: `rounds/tier-5/setups/sensors-50k.txt` (50,000 sensors, 100,000 stretches, drawn at random).
Prompt B: the sensors in the Otter Creek basin in orange, and how many. Walk folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T79B/.

Result: **reached**. The success path gives 1,050 of 50,000, as the answer key says. Nothing
crashed or blocked, and no walk gave a wrong count. The data stayed the task's own file the whole
way (50,000 nodes, 100,000 edges).

## Routes walked

| Folder | Route | What happened |
| --- | --- | --- |
| success | Success path by pointer: + > Layer; Which nodes; basin; type Otter Creek; tick; Done; Fill +; FFA500 Enter; then 00FF00 Escape and Tab | Replayed with every step matching. Layer 1 reads 1,050 and the key reads "1,050 of 50,000 nodes". Escape in the color box keeps FFA500 (13.png); Tab moves on to the link button (14.png). |
| touched-13 | New layer, then Which nodes; the Otter Creek tick (with the frame drawn 1 s after each input) | Matched. Opening Which nodes shows the workspace with "Drawing" in its header within 0.5 s (05-glance.png). The tick shows its box ticked and "Drawing" within 1 s (08-glance.png). Done: see the first defect. |
| touched-14 | The T79 B success path | The same route as `success` and `touched-13`; both were walked. |
| detour-3 | A Data place filter card: basin, Otter, tick Otter Creek, Done; Style tab; the top bar's x | Matched. The top bar reads "1,050 of 50,000 nodes, 42 of 100,000 edges" (06.png). The x switches the card off, and the card stays as "1,050 of 50k" (10.png). Filter cards fail the grade, as the answer key says. |
| touched-16 | New layer; Which nodes; "within"; Enter twice; a reference typed as "Sensor 0001", then n38; Enter; Cancel | Matched. "Within 2 hops of n38" gives 26 of 50,000 (09.png). Cancel puts the layer back to All nodes, with nothing painted (10.png). |
| touched-3 | Cancel on a new filter card (Data place Add filter, then Cancel) | Fixed. The card is gone, the top bar shows no filter mark, and Filters is empty (03.png). Focus is on Add filter: Shift+Tab lands on the "+" just before it (05.png). |
| touched-4 | The canvas toolbar's Filters, then Escape on the new card's picker | The card is gone, and focus is back on the toolbar's Filters button (03.png). |
| touched-6 | Cancel on an existing card: an Otter Creek card; Edit; tick Lower Delta (12,690); Cancel | The card goes back to Otter Creek alone, and the top bar reads 1,050 again (05.png). |
| touched-7 | Keyboard only: Ctrl+K, "filter", Enter, then Escape; again Ctrl+K, "filter", Enter, Shift+Tab to Cancel, Enter | Each time the card is taken away and focus lands on Add filter (04.png, 13.png). Shift+Tab out of the new card's picker closes the picker and keeps the card ("All nodes"), with focus on "Condition..." (07.png). Four more Shift+Tab presses reach Done, and the fifth reaches Cancel (11.png, 12.png). |
| keyboard | The success path by keyboard only (40 keys) | Matched and reached the end: Layer 1 is painted orange on 1,050 nodes (41.png). Focus never fell to the page body after the first Tab. |

## Defects (none spoils the grade)

1. **Done on 50,000 nodes shows no sign of work.** After Done, the workspace closes at once, but
   for about 13 s the canvas keeps the preview look: the picks green and every other node dimmed.
   No "Drawing" shows anywhere, because the header that carried it is gone. A person may click
   again, or read the dimmed canvas as the result. Under decided.md ("An edit that blocks input
   shows that it is working first"), Done is one of the edits that must show it.
   touched-13/09-glance.png; settle 13.0 s (success: 15.4 s).
2. **The waits on the success path.** Opening Which nodes 16 to 20 s, the tick 15 to 18 s, and
   Done 13 to 15 s (route.jsonl `settleDom` in success and touched-13). The first two show
   "Drawing" within 1 s.
3. **After Done, Which nodes' title row shows "Edit" in place of its count while it has focus**
   (success/09.png). An existing filter card also shows "Edit" in place of "1,050 of 50k" while it
   has focus (touched-6/02.png). The count shows once focus moves (success/12.png). This was seen
   in earlier passes.
4. **The tick is announced twice**, in two formats: "1050 of 50000 nodes", then "1,050 of 50,000
   nodes" (keyboard step 29, keyboard/30.png).
5. **Two names that are not drawn.** Before a color is committed, the new color box is named "Node
   color, not set, drawn #6366F1 indigo" (keyboard/40.png). The tree row is named "Which nodes,
   1050 of 50000 nodes", without the thousands separators the screen shows (keyboard step 31).
6. **Shift+Tab out of a new filter card's picker keeps the card**, as "All nodes", and Escape at
   that point is not the way out: Cancel takes it away (touched-7/07.png). A person who leaves the
   picker with Shift+Tab and then closes the place by some other means could keep an empty card.
   This route was not walked further.

## Mismatches with the answer key

None. Count, path and timing are as `answers.md` T79 describes, now with "Drawing" shown when
Which nodes opens and on the tick.
