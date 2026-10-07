# Grade: session r2-s31 -- Grace (nonprofit operations analyst), bigger dots for the ones that matter, Florentine families

Graded from the last screenshot (13.png), the transcript and the screenshots before it. No files
were downloaded (the task asks for none). The participant's own rating (5 of 7) was not used.

## Grade: SD (success with difficulty)

- **Success definition met.** A ranking was run: Betweenness, shown as "Bridges". Betweenness is
  one of the ranking measures the answer key accepts for "how much the network depends on a node",
  and its values match the reference (Medici 47.5, Guadagni 23.17, Albizzi 19.33). In 13.png the
  dots visibly differ in size (Medici large and dark in the middle, two medium dots to its right,
  small light dots at the edges), and the key reads "Size: Bridges 0 ... 47.5" above
  "Color: Bridges 0 ... 47.5". At step 11 (11.png) the Size line read "1 to 3", bound to Bridges.
- **Meaning stated from the screen.** "Both stand for the same thing, Bridges ... Bigger dot =
  more of a bridge; darker orange = more of a bridge." That matches the answer key's meaning with
  this measure: bigger means a higher value of the run's result, and the colors are the same ramp.
  Her plain-language reading of Betweenness ("how often a family sits on the shortest path between
  two other families") is correct. She also named the top family from the Top 10 list (Medici
  47.5, about twice Guadagni), which matches the reference values.
- **Why SD, not S:** she needed a tooltip to finish. At step 8 she did not know what the small
  chain-link icon beside the Size box did, hovered it (step 9) to read "Size by attribute", and
  only then clicked it. She also made one wrong turn: hovering the biggest dot (step 12), which
  showed nothing, so she abandoned it and went to the Values tab.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 12 (10 to the end state, 2 more to find who the big dot is) | about 9 steps, 11 commands |
| Wrong turns | 1 (hover on the big dot, step 12) | -- |

Steps to the end state: decline the usage card and open the sample (2), Analyze, Betweenness,
Run, the Bridges row, + beside Shape, Size, hover the chain-link (tooltip), click it, pick
Bridges. She opened Analyze with the flask button instead of Shift+A and picked from the list
instead of typing; both are the same path by pointer. Picking Betweenness over PageRank is not a
wrong turn: it is an accepted ranking, chosen because its description matched "depends on". The
Values tab (step 13) is an extra check that answered her own question, not a wrong turn.

## False "done"

None. "The sizing part is DONE" (step 11) and "I'm done" (step 13) are both true of the screen:
the dots differ in size, the Size line reads "1 to 3" and the key shows "Size: Bridges". At
step 5 she saw that the run changed only the colors and said "Colors are done, sizes are not"; she
did not take the automatic coloring as the finished task.

## Silent commits and key agreement

- Run (step 5): the dots turned from blue to an orange-to-brown ramp and the key appeared with
  "Color: Bridges". Not silent.
- Size bound to Bridges (step 11): the dots changed size and the key gained "Size: Bridges". Not
  silent.
- Adding the Size line (step 8) changed nothing on the canvas (it holds the constant "1"). It only
  adds a line and does not bind it, so the silent-commit bar does not count it.
- The key's ranges (0 to 47.5), the Size line's "1 to 3" and the Values tab's "15 of 15 have a
  value, 0 to 47.5" agree with each other and with the drawing.

## Problems

Severity 0-4 (Nielsen); opinion-only findings are held one level down. Behavior and opinion
findings from this one participant stay unconfirmed until a second participant hits them, except
where another session's grade already records the same thing (noted).

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | Once a run adds the key box, the box covers a whole node of the drawing. Before the run 15 dots are visible (a dot at the top left, joined to the dot below it); after it only 14 can be seen, with an edge running under the key to the hidden one. She noticed ("the key box covers the top-left dot"). Nothing offers to move the key. The same box covering names on Les Miserables is recorded in r2-s03, r2-s05 and others; here it hides a dot, not only a name. Reproduced the same on two fresh loads. | Step 5 (05.png) through 13.png; repro below. |
| 2 | 2 | behavior | After adding Size, the line shows only a "1" box. The only way to tie it to the result is an unlabeled chain-link icon; she guessed and needed its tooltip, which says "Size by attribute", a database word to her. A participant who does not hover may type a number and leave every dot the same size. Same finding as r2-s29 problem 1. | Step 8 (08.png), step 9 (tooltip), step 10 (10.png). |
| 3 | 2 | behavior | Size is hidden behind the + beside "Shape"; the Style tab never shows the word "Size" until that menu opens. She found it by guessing. Same finding as r2-s29 problem 2. | Step 6 (06.png), step 7 (07.png): "No 'Size' word anywhere ... Guessing." |
| 4 | 1 | behavior | Hovering a dot shows nothing (no name, no value), so she could not tell which family the biggest dot is from the drawing and had to find the Values tab's Top 10. Labels and tooltips are not part of this task; there is a "Tooltip +" line she did not try. | Step 12 (12.png), step 13 (13.png). |
| 5 | 1 | behavior | No method in the Analyze list is described in the task's terms ("which families the network depends on"). "PageRank -- Start here" pulled her, but she chose Betweenness because its one-line description fit better. Nothing told her which one answers her question. Similar to r2-s29 problem 3. | Step 3 (03.png), step 4 (04.png). |
| 6 | 1 | opinion | The key's numbers (0 to 47.5) have no unit or plain sentence; she could say only "higher = more of a bridge". Held down from 2. | 11.png, 13.png: "what is 47.5? Not a count of anything I know." |

## Repro of problem 1

`rounds/round-2/repro/r2-s31/repro.sh` walks her path by `real.mjs` (open Florentine families,
Shift+A, Betweenness, Run, the Bridges row, Add to Shape, Size, Size by attribute, Bridges) twice,
each on a fresh load, into `run-1/` and `run-2/`. In both, `02.png` (before the run) shows 15 dots
including one at the top left of the canvas, and `10.png` (the end state) shows the key box over
that spot, an edge running under it, and 14 visible dots. Both runs give the same picture, on
commit 4a7a1a7fb (the session's build).
