# Grade: session r1-s28 (task T79B, Tom, returning)

Grade: SD
False done: no
Wrong turns: 1
Steps: 16 (counted from `route.jsonl` as `tool/steps.mjs` counts them; the answer key's path for T79 B is 10, so 6 over)
Overwhelm: 3 (least sure: step 3, a click on the Style layers "+" while the search results were open closed the list, opened no menu and moved the "+" to the top of the sidebar)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 33 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)
Tool refusal: none

## The last screen and the records

Screenshot 13 and the end-state records agree with the answer key's B values:

- A new style layer "Otter Creek orange", 1,050 in the layer list; its Which nodes reads
  "1,050 of 50k", rule "basin Otter Creek"; Fill Color F17F63.
- The key: "Color: Otter Creek orange, 1,050 of 50,000 nodes".
- `key.json`: 1,050 nodes drawn F17F63, 48,950 drawn 6366F1; all 100,000 edges unchanged.
- `styles.json` / `work.json`: one layer added (two layer ids, node and edge halves, both named
  "Otter Creek orange"); no other layer changed, no run made. `data.json`: no filter card; all
  50,000 nodes and 100,000 edges visible, so this is a style layer, not a filter.
- F17F63 is a light red-orange (hue about 12 degrees, the same hue as the setups' E4572E at about
  13 degrees, lighter). The answer key counts any visibly orange or red-orange hue as orange, so
  the color is right. The participant called it "salmon", which is a remark on its lightness, not
  a wrong color.
- Reported: "1,050 sensors are in orange." Right count, and the screen shows it.

## Path and wrong turns

Path taken: search "Otter Creek" (2 steps); Style layers "+" (swallowed, see problem 1); "+" again;
Layer; type a name and Enter (2); Which nodes; basin; click the checklist search and type "Otter"
(2); tick Otter Creek; Done; Fill "+"; the color swatch; one click on the Hue strip. Success state
reached at step 13 (the Hue click committed F17F63).

- Wrong turn 1: the sidebar search for "Otter Creek" (step 2). The task does not need it; the
  participant left it and went to the style layers. It did give the participant the count 1,050
  ahead of time, which they used as a cross-check.
- Not counted: the second "+" click (step 4). The first click was on the right control; the app
  swallowed it (problem 1), and the repeat is the path's step.
- The other extra steps are equivalents: naming the layer (type and Enter, 2), a click into the
  checklist search before typing (1), and the swatch plus Hue click in place of typing a hex and
  Enter (same count).
- Waits on the path (from `route.jsonl`, totals per step): opening Which nodes 9.5 s, the tick
  5.6 s, Done 7.0 s, adding the layer 5.1 s. None over 10 s, and the participant did not retry
  during any of them.

## Follow-up

Present in the transcript. Rating 3. Least sure: step 3, after clicking the Style layers "+" with
the 1,050 search results still open; the list vanished, the Style layers jumped to the top, no menu
came up and the picture did not change, so the participant could not tell whether something had
been added, broken or missed. A close second: the Color picker, with no orange among its six
swatches, which closed after one click on the Hue strip and left a color the participant would not
have chosen.

## Problems

1. Severity 2, build-defect. With the sidebar's search results open, a click on the Style layers
   "+" (Add a layer or a folder) closes the results list and opens no menu; the list collapses
   under the pointer and the "+" moves to the top of the sidebar, so a second click is needed. It
   does not depend on graph size. This is the follow-up's least-sure moment, but the "+" belongs to
   the style layer list, not the selection editor. Evidence: step 3, screenshots 02 and 03.
   Repro: `design/ui/studio/tier5/rounds/round-1/repro/r1-s28/repro.sh` (11-node gauges graph,
   search "G", click "+" at 276,793: `plus/03.png` shows the list gone, no menu, "+" at 276,122).
2. Severity 2, build-defect. On a new layer whose Fill color is still empty, one click on the color
   picker's Hue strip commits a color (the hue applied to the picker's starting 6366F1, here F17F63)
   and closes the picker, so the hue cannot be adjusted without reopening it. The swatches offer no
   orange. The participant ended with a lighter red-orange than intended and said they would not
   fiddle further. Evidence: steps 12-13, screenshots 12 and 13. Same mechanism as session r1-s22,
   reproduced by `design/ui/studio/tier5/rounds/round-1/repro/r1-s22/repro.sh`.
3. Severity 1, opinion. The sidebar search lists the 1,050 "basin: Otter Creek" nodes but leaves
   the picture unchanged and offers no way from the list to a layer; the participant was not sure
   whether searching was the same as coloring. Evidence: step 2, screenshot 02.
4. Severity 1, behavior. While Which nodes is open the whole picture turns green (009E73) as the
   preview; the participant was unsure whether this was changing the colleague's colors until Done
   brought the blue back. Evidence: steps 6-9, screenshots 06-09.
