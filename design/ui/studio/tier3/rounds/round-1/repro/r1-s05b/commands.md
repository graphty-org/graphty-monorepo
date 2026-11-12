# Repro: Control+A on the color box's swatch selects the whole graph (build 758b8e8081)

Run from design/ui/studio/tool with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3`.

1. `./with-browser.sh node real.mjs --start <this folder> empty` -> 01.png
2. `--step --click "Samples#2"` -> 02.png
3. `--step --click "Open the Les Miserables sample"` -> 03.png (04.png: a refused, ambiguous click)
4. `--step --click-at 125,216` (the Everything row) -> 05.png
5. `--step --click "Pick node color" --key Escape` -> 06.png. Focus is on the swatch button
   "Pick node color" inside Fill > Color. The whole color box gets the green focus border, the
   same border the hex text box gets when it has focus, and no ring marks the swatch itself.
6. `--step --key Control+a` -> 07.png. The app's select-all runs: "77 nodes, 254 edges selected",
   and the inspector changes from the Everything layer to the selection's Values tab.
7. `--step --key Escape` -> 08.png. "Selection cleared: 77 nodes, 254 edges". The inspector shows
   the Graph view, not the layer that was open.
8. `--step --click-at 125,216 --click "Pick node color" --key Escape --key Tab` -> 09.png. Focus is
   in the hex text box (value highlighted). The border looks the same as in 06.png.
9. `--step --key Control+a` -> 10.png. The text box keeps the key: nothing in the graph is selected.
10. `--end`

Mechanism: `isTypingTarget` in graphty/src/workspace/keys/keys.ts treats a button as "not
typing", so Control+A on the swatch goes to the app's select-all, which is correct for a button.
The defect is the focus indicator. compact-mantine's CompactColorInput draws the swatch's focus
as the border of the whole box, so a keyboard user cannot tell the swatch button (one Tab stop)
from the hex text box (the next one) except by the highlighted value.
