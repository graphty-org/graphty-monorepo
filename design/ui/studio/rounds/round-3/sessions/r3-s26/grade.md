# Grade: session r3-s26 -- Morgan Reyes (screen-reader analyst), task T9 A, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), screen-reader mode,
keyboard only, 1440 x 900. Graded from the accessibility tree and focus the tool printed, the last
screenshot (37.png), the binding screenshot (32.png) and the transcript. The session saved no files
(there is no `downloads/` folder). Not graded from the participant's rating (5 of 7).

## Grade: S (success)

Every part of the success definition holds, in the text Morgan read and in 37.png:

1. **A ranking was run.** Steps 11-18: Shift+A, typed "betw", Enter, Run. The tool printed
   "Betweenness finished" and the legend read "Color: Betweenness 0 1624" (19.png). Betweenness is
   in the "Rank nodes and edges" group. Morgan picked it over the "Start here" PageRank because
   "depends on most" means "if this character were gone, paths would break" -- a sound reading,
   and Betweenness is a ranking, so it is on the success path.
2. **Sizes are bound to it.** Steps 28-32: Tab to "Add to Shape", Enter, Enter on "Size" (the
   from-data list opened at once with "Fixed size" highlighted), typed "betw", Enter. Focus landed
   on "1 to 3, variable Betweenness" (32.png). The legend read "Size: Betweenness" with its range
   ("Size: Betweenness 0 1624", step 35). In 37.png the dots visibly differ: Valjean large and dark
   in the middle, Myriel and Gavroche medium, most small.
3. **Meaning stated from the screen.** Debrief: "Size and color now both stand for the same thing:
   betweenness -- how many shortest paths between other characters run through each character."
   Read from the legend text (both rows "Betweenness", step 35) and the Analyze card's line "Which
   nodes sit on the most shortest paths between others" (step 12). Correct. Her named ranks
   (Valjean 1,624, Myriel 504, Gavroche 470.6) were in the tree printed at step 37 before she
   stated them, and match the reference values.

**Screen-reader check:** both texts exist on the build and Morgan read both: the legend's "Size:
Betweenness" with its range 0 to 1624 (step 35) and the Size line's value "1 to 3" (step 33).
Nothing was announced when the size bound; recorded against bar 8, not against Morgan.

- **The size list:** used, answered directly with "Betweenness". Never closed, "Fixed size" never
  chosen, chain-link not needed.
- **Did she mention the sizes not changing:** yes, in effect: after Run, "Nothing about size yet.
  The task wants size" (step 20), read from the legend having only a color row.
- **Usage card:** declined ("No thanks", step 6).
- **Undo:** none in this session.
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. Every key the tool pressed is one a person could press; nothing reached a place a
  keyboard user could not.

## Counts

| | This session | Reference (round 3 keyboard path) |
|---|---|---|
| Step commands to the success state | 31 (to 32.png), 8 of them reads | -- |
| Step commands in the whole session | 36, 11 of them reads | -- |
| Key and type actions in the whole session | 50 (a typed word counts as one) | 57 keys |
| Wrong turns | 1 | -- |

- **The wrong turn:** step 24. Shift+Tab into the outline tree landed on its first item,
  "Selection", and Morgan's Enter selected it instead of "Betweenness" (24.png). Corrected at step
  25 with Down Arrow and Enter.
- **Not counted as wrong turns:** expanding "Advanced" on the Betweenness form to check settings
  (steps 16-17, a deliberate check); the Shift+Tab walk from the Analyze button back to the tree
  (steps 20-22), which is how a keyboard user reaches the run row; the Shift+A then Escape shortcut
  back to the legend (step 34); reading the Values tab (steps 36-37) after the success state.
  Choosing Betweenness over PageRank is on the success path.

## False "done"

None. "Did I finish? Yes. The dots are now sized by betweenness, and the drawing's legend says so
in text" -- the legend reads "Size: Betweenness" and the Size line "1 to 3, variable Betweenness"
(steps 33, 35; 37.png). She said plainly what she could not learn (the color ramp's direction,
what "1 to 3" is in, whether the values are normalized); none of those is a claim the screen
contradicts.

## Bars touched

- **Bar 4 (silent commit):** none. Run recolored every dot and added the color legend; binding the
  size changed the dot sizes and added the size legend.
- **Bar 5 (counts and key against the drawing):** the legend range 0 to 1624 matches the reference
  maximum (Valjean 1,624). "77 of 77 have a value" matches the 77 characters. Top 10 order matches
  the reference. No mismatch.
- **Bar 8 (screen reader):** focus lost twice, binding the size not announced, the histogram read as
  unnamed rows, one confirmation that many screen readers will not speak (problems 1-4).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Problems marked
build-defect were reproduced by the scripted path
`rounds/round-3/repro/r3-s26/repro.sh` (output in `run.log`, PNGs in `run/`), which repeats
Morgan's keys in screen-reader mode on the same build.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Focus falls to the page itself after "No thanks" on the usage card and again after opening a sample. A screen-reader user loses their place and has to find the way back from the top each time. | Session: steps 6 and 9 ("focus: nothing (the page itself)"), 06.png, 09.png; debrief. Repro: run.log after the "No thanks" Enter (run/02.png) and after the sample's Enter (run/04.png), both "focus: nothing (the page itself)". |
| 2 | 2 | build-defect | Binding Size to an attribute announces nothing. Focus moves to "1 to 3, variable Betweenness" with no live text, so the user must read the panel to learn the binding happened. | Session: step 32, 32.png (no "live:" line); debrief. Repro: run.log at the "betw" Enter in the attribute list (run/12.png), no "live:" line. |
| 3 | 2 | build-defect | On the Values tab the distribution chart reads as twenty "row (no name)" items before the summary and the Top 10. | Session: step 37, 37.png. Repro: run.log final read, 20 "read: row (no name)" lines (run/16.png). |
| 4 | 2 | build-defect | After "No thanks", the confirmation "Usage data stays off. Change this in Settings > Privacy" arrives in a live region that already holds the text, so many screen readers never speak it; and the first Tab stop is then a stray "Change this in Settings > Privacy" button ahead of the page's own controls. | Session: steps 6-7, 06.png, 07.png. Repro: run.log, the "unconfirmed" live line and "focus: button \"Change this in Settings > Privacy\"" as the first Tab (run/02.png, run/03.png). |
| 5 | 2 | accessibility | The color legend reads as text only "Color: Betweenness 0 1624"; it says nothing about which end of the ramp is high, so a screen-reader user cannot say what a given color means. | Step 35 read; debrief "which color is high and which is low". Repro: run.log read after binding (run/14.png). |
| 6 | 2 | wording | Betweenness's only advanced setting is "Sample size", value 1, with no unit or explanation. To an analyst it reads as "estimated from one source node", yet the results are exact; the label misleads or is wrong for this graph. | Step 17, 17.png; debrief. |
| 7 | 2 | wording | Nothing on the result says whether betweenness is normalized or raw, or whether the graph was treated as directed. Morgan had to do the arithmetic against NetworkX to know the numbers were raw. | Steps 19, 37; debrief. |
| 8 | 1 | wording | Size sits under "Shape", behind "Add to Shape"; there is no "Size" on the Style tab until one is added. Morgan found it only because Shape was the one plausible heading. | Steps 27-29, 27.png, 28.png. |
| 9 | 1 | wording | The Size line's value "1 to 3" has no unit; "1 to 3 of what" was not answerable from the screen. | Step 33; debrief. |
| 10 | 1 | behavior | The outline tree is one Tab stop and Shift+Tab into it lands on the first item, not the run row the user last left, so Enter selected "Selection" by accident. | Step 24, 24.png. |
| 11 | 1 | accessibility | Once a sample is open the screen has no headings at all, only buttons, a tree and tabs; heading navigation finds nothing. | Step 10 read, 10.png. |

**What worked:** opening the sample announced "77 nodes, 254 edges", and the overview gave nodes,
edges, direction, density and components as text. Shift+A opened a filterable list with a
one-line description for each analysis, and typing "betw" found it. After Run, "Betweenness
finished" was said once and focus returned to the Analyze button. "Add to Shape" opened a menu with
"Size" first, and Size opened the from-data list at once, so typing "betw" bound it in two keys.
The legend is real text, and the Values tab has a readable Top 10.
