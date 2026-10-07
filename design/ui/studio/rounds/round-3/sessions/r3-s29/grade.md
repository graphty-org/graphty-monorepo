# Grade: session r3-s29 -- Tom (the recipe recipient), task T9 B, Florentine families

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
mode, 1440 x 900. Graded from the last screenshot (12.png), the size-binding screenshots (08.png
to 11.png) and the transcript. The session saved no files (there is no `downloads/` folder). Not
graded from the participant's rating (5 of 7).

## Grade: SD (success with difficulty)

Every part of the success definition holds in 12.png:

1. **A ranking was run.** Steps 3-5: Analyze (the flask), PageRank (the "Start here" entry), Run.
   The outline gains a "PageRank 15" row and the key reads "Color: PageRank 0.03066 to 0.1458"
   (05.png). He chose PageRank because of the "Start here" tag, not because he matched it to
   "depends on most"; it is a ranking from the "Rank nodes and edges" list, so it counts.
2. **Sizes are bound to it.** Steps 6-11: the run row (opens on Style), "Add to Shape", Size,
   then (after the slip below) the chain-link and the option "PageRank". The Size line reads
   "1 to 3"; the key gains "Size: PageRank 0.03066 to 0.1458" above the color row; the dots
   visibly differ, Medici largest in the middle, the edge families small (11.png, 12.png).
3. **Meaning stated from the screen.** Step 11 and debrief: size and color both stand for the
   family's PageRank; a bigger, darker dot means higher PageRank, about 0.03 to 0.15; "a big dark
   dot is a family married into other well-married families", taken from the Analyze card's line
   "Which nodes are connected to other well-connected nodes" (04.png). Matches the key's two rows
   ("Size: PageRank", "Color: PageRank"). Correct.

**Why SD and not S:** one detour then a correction on the size step. At step 9 the click meant for
the option "PageRank" in the "Size by attribute" list matched five controls and landed on the
outline's "PageRank" row. The list closed and left a Size line with a fixed "1" and unchanged
dots (09.png). He saw that ("It closed and it just says 1"), pressed the chain-link beside the
Size box (step 10, 10.png) and chose the option (step 11, 11.png). The answer key scores reaching
the binding by the chain-link after the list closed as a detour then a correction: SD on round 3.
The slip came from an ambiguous tool command, not from his reading of the screen; discounted, the
session is an S. Either way it is a success.

- **The size list:** used, then closed by the slip (not by Escape, not by "Fixed size"), reopened
  by the chain-link and answered with "PageRank". "Fixed size" was never chosen.
- **Did he mention the sizes not changing:** yes, twice: after Run ("Dot sizes look the same as
  before", "I was told bigger dots, not darker dots", step 5) and after the slip ("Dots unchanged
  in size", step 9).
- **Usage card:** declined ("No thanks", step 2). No detour.
- **Choice among the three PageRank values:** he hesitated over "PageRank", "PageRank rank" and
  "PageRank percentile" (step 8) and picked plain PageRank to match the color row.
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. The step 9 click reached a real, visible, enabled control (the outline row), and
  the tool printed the ambiguity; he recovered on screen and the end state is unaffected. The
  hover at step 12 reached the Medici node; nothing showed because no tooltip line is set, which
  is how the build behaves, not a tool fault.

## Counts

| | This session | Reference (round 3 path) |
|---|---|---|
| Commands to the success state | 10 step commands (11 actions) to step 11 | 8 steps, 10 commands |
| Commands in the whole session | 11 step commands (12 actions) | -- |
| Wrong turns | 1 | -- |

- **The wrong turn:** step 9, the click that closed the size list (09.png); corrected at steps
  10-11.
- **Not counted as wrong turns:** declining the usage card (step 2); the hover at step 12, which
  came after the success state and changed nothing.

## False "done"

None. He said "That's it -- bigger dots ... big and dark means more PageRank" (step 11) and "The
dots are sized, I'm stopping" (step 12); in the debrief, "Did I finish? Yes, I think so." The
screen agrees: Size reads "1 to 3", the key shows "Size: PageRank" and "Color: PageRank", the dots
differ (12.png). He also said plainly what he could not do (name the biggest family, say whether
PageRank is what "depends on most" means); neither is a claim the screen contradicts.

## Bars touched

- **Bar 4 (silent commit):** none. Run changed every dot's color (04.png to 05.png). Binding the
  size changed the dot sizes and the key (10.png to 11.png). The fixed "1" at step 9 was not a
  commit he made, and he did not believe it had sized anything.
- **Bar 5 (counts and key against the drawing):** "PageRank 15" matches the 15 families; the key's
  range 0.03066 to 0.1458 runs light to dark and small to large, matching the drawing. No
  mismatch.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. One problem is a build
defect reproduced by a scripted path; the rest are seen in this one participant (several also in
r3-s27 and the other T9 sessions).

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | The key in the canvas's top-left corner covers a family's dot (Pazzi, about 531,84). Visible on load; hidden under the key from the moment the run finishes, and still hidden after sizes are bound, so that family's size and color cannot be read. Same on every run. | Session: 02.png against 05.png, 11.png, 12.png; debrief "That dot is gone from the picture". Repro: `rounds/round-3/repro/r3-s29/repro.sh` -- hovering 531,84 reports `node with id "Pazzi"` before the run (run/03.png) and `div` (the key) after the run (run/07.png) and after sizes are bound (run/12.png). |
| 2 | 2 | behavior | No family names on the dots, and hovering the biggest dot shows nothing. He can say "the big one in the middle" but not which family it is ("The PI will ask"). | Step 12: 11.png against 12.png, identical; the tool reports Medici under the pointer. |
| 3 | 2 | wording | Three values under the "PageRank" heading in the size list -- PageRank, PageRank rank, PageRank percentile -- with nothing saying how they differ or which to use. He guessed by matching the color row. | Step 8, 08.png; debrief. |
| 4 | 1 | wording | The same word "PageRank" names the outline row, the color chip, the list heading and the option, side by side. A click meant for the option landed on the outline row, closed the list and left a fixed "1". | Step 9, 09.png (tool printed the ambiguity). |
| 5 | 1 | wording | Size sits under "Shape", behind a "+". With no word "Size" on the Style tab he found it by a guess. | Steps 6-7, 06.png, 07.png. |
| 6 | 1 | wording | The Analyze list is algorithm names (Katz, HITS, Eigenvector) with nothing matching the task's "depends on most"; he chose PageRank only because of the "Start here" tag and could not judge whether Betweenness fit better. | Step 3, 03.png; debrief. |
| 7 | 1 | behavior | Run colors the dots but does not size them; he expected bigger dots and had to find size himself. Credited to the design (color is the run's default), recorded because he said it at once. | Step 5, 05.png. |
| 8 | 0 | opinion | Size and color encode the same measure, so the colors add nothing the sizes do not already say. Held one level down as an opinion. | 11.png; debrief. |

**What worked:** the start-page hint "Analyze [flask] in the toolbar (Shift+A)" sent him straight
to Analyze; the "Start here" tag let a non-specialist pick at once; Run colored the dots and added a
key; the run row opened on Style; Size under "Add to Shape" opened the from-data list at once with
the run's own measure first; and the chain-link brought the list back after it closed by accident.
The orange-to-dark-brown ramp was readable to him ("light to dark, not red and green").

## Tool note

`--click "PageRank"` at step 9 matched five controls and took the outline row instead of the list
option; the participant recovered with a coordinate click on the option. Recorded as a tool print,
not a tool fault: the click reached a real, visible control.
