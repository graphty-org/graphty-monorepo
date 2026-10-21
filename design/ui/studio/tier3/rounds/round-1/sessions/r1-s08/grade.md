Grade: S
False done: no
Wrong turns: 0

# r1-s08 -- T40 B (yeast-galactose.graphml, genes whose name begins with GAL), Maren

- **Participant model:** opus (the transcript records only `claude-opus-5-5`; no sonnet).
- **Build:** 758b8e8081 (`session.json`), the frozen build `criteria.md` names. Start: `empty`, pointer, 1440 x 900.
- **Leaks:** none. `leaks.json` found the transcript (50 calls) and lists no file opened outside the session folder.
- **Merged:** no. The file was opened from the start page, so it replaced the demo sample (`work.json`: the only source at the end is yeast-galactose.graphml).

## What the last screen and the saved state show

- `19.png`: the layer "GAL pathway" is selected. Its Which nodes chip reads "name starts with GAL, 8 nodes" and the header reads "8 of 331 nodes". Fill > Color is `800080`. The key at the top left reads "Color: GAL pathway, 8 of 331 nodes".
- `key.json` drawn colors: 8 nodes `#800080`, 323 nodes `#6366f1` (the default), and 361 edges `#a9a9a9`. The other nodes and every edge keep their start colors.
- `styles.json`: the node layer `layer-1_2` "GAL pathway" uses the rule `data.name` starts-with `GAL`, sets `node.color #800080`, and matches and paints 8 nodes. Its edge half, `layer-1_1`, sets nothing. Everything, Selected and Hovered are unchanged, and nothing is left selected (Selected matches 0).
- The drawn hex is `800080`. compact-mantine's `colorWord` gives "purple", which contains the asked hue.

## Against the success definition

- **Exactly the 8 drawn purple, everyone else unchanged:** yes (see above).
- **The count came from the screen:** yes. The find list showed "Nodes 8" (`04.png`, step 4), the condition card showed "8 of 331 nodes" (`14.png`, step 14), and the key showed it too (`17.png`). The eight names Maren gave (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80) were all listed on screen in `04.png` and again in `14.png` before she gave them.
- **Nothing wrong said:** her statements were that there are 8, that they are purple through a layer with "name starts with GAL", and that everything else was left as it was. The screen and the style tree bear out all three. She said she could count "about six or seven" dots at step 18, but took the answer from the count line, as the answer key expects: two of the 8 dots overlap.
- **Route:** the success path with "Starts with" (the answer key's 13 steps), plus a look in the find box first. The look changed nothing and she left it, so it is not counted as a wrong turn. Grade S.

## Steps

The participant took 20 steps, 18 of them up to the first screenshot with the 8 nodes purple (`17.png`). The answer key takes 13.

1. Open a file with the upload. 2. Load. 3. Find box, typed `GAL` (the extra look). 4. A click on the Style layers "+" that was lost, because the button moved (problem 1). 5. "+" again. 6. Layer. 7. Renamed the layer "GAL pathway" and pressed Enter (an extra step the task did not need). 8. Which nodes. 9. Add a condition. 10. `name`. The tool could not click "Contains" by name, so that step is not counted. 11. The match menu. 12. Starts with. 13. A click in the text box (not needed, because Starts with already puts focus there). 14. Typed `GAL`. 15. Escape. 16. Done. 17. Fill "+". 18. Typed `800080` and pressed Enter. 19 and 20. Two wheel turns to check the drawing, which barely zoomed.

## Problems

1. **A click on the Style layers "+" is lost while the find list is open** -- severity 2, build-defect.
   - What happened: at step 5, the "+" was drawn at 276,705, below the open find list (`04.png`). The click closed the list, and the Style layers section jumped back to the top of the panel (y 122). No menu opened and no layer was added (`05.png`). The press closes the list and the panel lays itself out again before the button is released, so the click lands where the button no longer is.
   - Repro: `rounds/round-1/repro/r1-s08/`. The steps were Open a file with yeast-galactose.graphml, Load, click the find box and type `GAL`, then `--click-at 276,705`. The tool reports the point as on the button "Add a layer or a folder", and `05.png` shows the list closed, the button moved, and no menu or layer.
2. **The mouse wheel barely zooms** -- severity 2, build-defect.
   - What happened: at steps 18 and 19, Maren wanted to check that all 8 nodes were purple. Two wheel turns (-600 and -3000) left the drawing about the same size (`18.png`, `19.png`), so she could not see the 8 nodes one by one on the drawing.
   - Repro: in the same folder, `--wheel 780,470,-3000` changed the drawing's width from 580 px to 585 px (`05.png` to `06.png`), under 1%.
   - Already recorded: `answers.md` notes the same on this build from the pilot walks.
3. **Fill starts at the color every node already has, and gives no hint that a color name is accepted** -- severity 2, behavior.
   - What happened: at step 16, Fill > Color opened at `6366F1`, the default that every node is already drawn in, so nothing visibly changed (`16.png`). No swatches and no color names were offered. She typed a hex code from memory (`800080`), although the box accepts `purple`.
   - Who else would hit this: a newcomer without a hex code in mind has nothing on screen to start from.
4. **Purple on the default indigo is hard to tell apart at the default node size** -- severity 1, opinion (`17.png` to `19.png`).
   - What happened: `800080` next to `6366F1` reads as slightly darker dots in the middle of the drawing. Maren said she would want labels and bigger nodes for a figure.
   - Not graded: the drawn color is what was asked.
5. **"3D" is shown for a drawing that looks flat** -- severity 1, opinion (`19.png`, the toolbar). Maren asked whether 3D tells her anything here.
6. **"Contains" could not be clicked by its name** (step 12) -- severity 0. The tool could not resolve the click, so this is a tool event, not reader confusion. The match menu shows its value, "Contains", but its accessible name differs. Maren then clicked the menu by its position.

Reported apart because Maren already knows Cytoscape. Before she loaded the file, she praised the read counts on the import preview ("331 node rows and 361 edge rows read; the load makes 331 nodes and 361 edges"), the live "8 of 331" on the condition card, and the key that appeared on its own.
