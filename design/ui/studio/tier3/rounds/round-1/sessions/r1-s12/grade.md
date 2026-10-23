Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s12 (task T40 B, persona Grace)

Participant model: claude-opus-5-5 (the participant log records Opus, not Sonnet).
Build: 758b8e8081 (graphty 0.8.91), the frozen tier 3 build. Merged: no (the session opened on
the empty start page, so the file was opened alone).

## Leak check

`leaks.json` read the participant's log (94 tool calls) and lists no leak: nothing was opened
outside the session folder. Not VOID.

## Outcome against the success definition

T40 B: bring in yeast-galactose.graphml, draw exactly the 8 genes whose name starts with GAL in
purple, leave everyone else unchanged, and give the count from the screen.

- **Last screenshot (16.png):** the layer "GAL genes" (8) sits above Everything (331); the
  inspector shows "name starts with GAL, 8 nodes", "8 of 331 nodes", Fill > Color `800080`; the
  key reads "Color: GAL genes, 8 of 331 nodes"; a small cluster of dark purple dots is drawn in
  the middle and every other dot keeps the default indigo.
- **Style tree (`styles.json`):** layer `layer-1_2` "GAL genes", node target, rule `data.name`
  starts-with `GAL`, matched 8, sets `node.color` `#800080` on 8. Everything still paints
  `#6366F1` on the other 323; no other layer was added or changed. The drawing (`key.json`
  `drawn`): 8 nodes `#800080`, 323 `#6366f1`, edges untouched.
- **Drawn color:** `#800080`, whose `colorWord` is purple: the asked hue holds.
- **Count:** "8" was on screen before the participant said it -- the picker's "8 of 331 nodes"
  and the suggestion list of the eight names in 11.png, and the key afterwards. The participant's
  answer (8, named GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80, the other 323 left as they
  were) matches the screen and the answer key.

So the success state was reached on the success path and said correctly: S.

## Steps and wrong turns

The key's path with "Starts with" is 13 steps. The participant took 16 to reach the success state,
plus 2 wheel turns afterwards to look closer (18 in all):

1. Open a file (with the file chosen) -- 2. Load -- 3. "+" beside Style layers -- 4. Layer --
5. typed the name "GAL genes", Enter (not on the key's path; optional, not a wrong turn) --
6. Which nodes -- 7. Add a condition -- 8. `name` -- 9. the match menu -- 10. Starts with --
11. a click in the text box (focus was already there) -- 12. typed `GAL` -- 13. Escape (closes
the suggestions) -- 14. Done (Enter alone would have done both) -- 15. Fill "+" -- 16. typed
`purple`, Enter. Then two wheel turns (steps 14 and 15 of the transcript), which barely zoomed.

Every extra step is on the success path (a rename, a redundant click, Escape before Done); none
led away from the success state, so the route counts as the success path and wrong turns are 0.

## False done

None. The participant said done at 16.png, where the screen and the style tree both show the
8 GAL genes purple and the rest unchanged.

## Problems

1. **The wheel barely zooms the drawing** -- severity 2, kind behavior.
   Step 14 (wheel -600 at the drawing's middle, 15.png) and step 15 (wheel -3000, 16.png): the
   drawing grew about 1 to 2 percent between 14.png and 16.png, so the participant could not get a
   closer look at the eight marked dots to check them. The answer key already records the same on
   this build (15 notches grew the drawing about 15 percent on the T44 walks), so it is a known
   behavior of the build rather than a new defect; not marked build-defect because no scripted
   repro of this session ran (every browser slot was taken while grading).
2. **`800080` on small dots barely stands out from the default indigo** -- severity 2, kind
   opinion. 14.png and 16.png: the 8 purple dots read as slightly darker dots inside a cloud of
   `#6366F1` blue-violet ones; the participant said a board audience would not see them without
   bigger or brighter marks. The asked hue is drawn correctly; the problem is the contrast between
   "purple" and the default node color, which any reader who picks a neighboring hue meets.
3. **"Style layers" and "Layer" vs "Folder" are guesses for a spreadsheet user** -- severity 1,
   kind wording. Steps 3 and 4 (04.png): the participant mapped "Style layers" to conditional
   formatting and picked Layer by guess; it worked first time.
4. **Color lives under "Fill", and its "+" sits far from the word** -- severity 1, kind
   behavior. Step 12 (12.png): the participant had to infer that color is a Fill property and
   click a "+" at the panel's right edge, not the word "Fill".
5. **The color box shows a hex code (`800080`) after the word "purple" was typed** -- severity 1,
   kind wording. Step 13 (14.png): the word was accepted, but the box then shows only the code,
   which the participant said a board member would not read.
