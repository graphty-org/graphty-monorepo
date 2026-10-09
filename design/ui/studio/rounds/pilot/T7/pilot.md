# Pilot of the "who matters most" task on the real app

The task asks a first-time user to have the program rank the characters (A: Les Miserables
sample) or the running-club members (B: `friends.csv`) by how much the network depends on them,
then say the top three in order and what the order was based on. Walked on graphty@0.8.53, build
0196d46212aa, commit a1e6b91ff, at `/?next`, with `tool/real.mjs`. No code was changed.

## Result

**The end state is reached on both datasets**, but not by the answer key's path: the keyboard
step that picks PageRank from the filtered list does nothing, so the path needs a click.

| Dataset           | What the screen shows after the run                                      | Screenshot |
| ----------------- | ------------------------------------------------------------------------ | ---------- |
| A, Les Miserables | Top 10 of "Influence": Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 | `A/09.png` |
| B, friends.csv    | Top 10 of "Influence": Farah 0.06608, Ava 0.06423, Hana 0.05883          | `B/05.png` |

Names, not ids, appear in both lists. No script error, console error or failed request was
printed at any step of either session.

Independent check (NetworkX, `design/ui/studio/tmp/t7-pagerank-ref.py`): both lists equal
**unweighted** PageRank, damping 0.85, to the fifth digit. B also equals PageRank on a
**directed** graph; on the same file read as undirected the top three would be Ava, Ivan, Farah.

## Steps walked

Session A (`A/`):

1. `--start empty` -- the empty app with the usage card (`01.png`).
2. `--click "No thanks" --click "Les Miserables"` -- sample opens: 77 nodes, 254 edges, one
   component (`02.png`).
3. `--key Shift+A` -- the analyses list opens; PageRank carries "Start here" (`03.png`).
4. `--type PageRank` -- the list filters to PageRank alone (`04.png`).
5. `--key Enter` -- **nothing happens**; the list stays open (`05.png`).
6. `--key ArrowDown --key Enter` -- **nothing happens** (`06.png`).
7. `--click "PageRank"` -- the PageRank card opens with Damping factor 0.85 and Run (`07.png`).
8. `--click "Run"` -- a row named **"Influence"** appears with 77; nodes turn orange; a color key
   "Color: Influence 0.003299 - 0.07543" (`08.png`).
9. `--click "Influence"` -- the inspector shows Values, Top 10, and "Made with: Analysis
   Influence, Damping Factor 0.85" (`09.png`).

Session B (`B/`), started with a corrected setup (below):

1. `--start setup:` (No thanks, Open project or file..., upload `friends.csv`) -- 20 nodes, 41
   edges, Direction **Directed** (`01.png`).
2. `--key Shift+A --type PageRank --key Enter` -- **Enter does nothing again** (`02.png`).
3. `--click PageRank` (`03.png`), then `--key Enter` -- Enter on the card does run it; the
   "Influence" row appears with 20 (`04.png`).
4. `--click Influence` -- Top 10 with names (`05.png`).

## Blockers and findings

### 1. Enter (and the arrow keys) cannot choose an analysis from the filtered list -- app defect

- **Evidence:** A steps 5 and 6 (`A/05.png`, `A/06.png`), B step 2 (`B/02.png`): with
  "PageRank" typed and it the only entry, Enter and ArrowDown+Enter leave the list unchanged.
- **Cause:** `graphty/src/workspace/analyze/AnalyzePopover.tsx` line 126, the popover's only key
  handler, returns on every key but Escape; the entries are plain buttons with no active-item
  handling, so a keyboard user must Tab through every entry to reach one.
- **Effect on the study:** the answer key's five-step path fails at step 4; a keyboard-only or
  screen-reader participant may stall here. Enter on the parameters card does run (`B/04.png`).

### 2. The measure's name changes from "PageRank" to "Influence" once run -- app wording, a risk for the task

- **Evidence:** `A/07.png` (card titled PageRank) then `A/08.png` and `A/09.png` (row,
  inspector header, color key and "Made with: Analysis" all say "Influence"). The word
  "PageRank" is nowhere on screen after the run.
- **Effect:** the task asks "what the order was based on". A participant will answer
  "Influence". The answer key must decide whether "Influence" alone names the measure; if the
  grader expects "PageRank", every answer read off the screen fails.

### 3. The answer key says friends.csv uses weight by default -- wrong answer key

- **Evidence:** `answers.md`, reference values, "friends.csv: top 3 for each ranking offered
  (weight used by default)". The app's values are unweighted: weighted directed PageRank gives
  Farah, Hana, Milo; the app shows Farah, Ava, Hana (`B/05.png`). The PageRank card offers no
  weight choice (`A/07.png`). Les Miserables is likewise unweighted (its `shared_chapters` weight
  would put Marius second).
- **Also:** the reference-value rows for both rankings are still "(rehearsal)" blanks. Values to
  record from this build: A Valjean, Myriel, Gavroche; B Farah, Ava, Hana.

### 4. friends.csv loads as a directed graph, so the B ranking follows the order of each row -- graphty-element defect (import default), affects the answer

- **Evidence:** `B/01.png` Direction "Directed", arrows drawn on every edge. The file is "who
  knows whom", a symmetric tie with columns `source,target,weight`. Read as undirected, the top
  three are Ava, Ivan, Farah; the app's directed run gives Farah, Ava, Hana.
- **Effect:** the screen's answer is internally consistent, so grading against the screen still
  works, but the ranking depends on which person each row happened to list first. A CSV edge list
  with no direction stated defaulting to directed is a graphty-element import decision, not an
  app one.

### 5. The setup's "Load" step does not exist -- task wording (setup) defect

- **Evidence:** `B-setup-failed/setup.log`: "nothing on screen is called "Load"". The file opens
  straight into the graph after the upload (`B-setup-failed/01.png`); there is no import page.
- **Fix to the task:** drop `--click Load` from the B setup in `tasks.md`. The corrected setup
  file used here is `setup-B2.txt`.

### 6. The answer key's path omits selecting the row -- answer key wording

- The path ends "read Top 10 on the run row's Values", but after Run the inspector still shows
  the Graph overview (`A/08.png`); the participant must click the "Influence" row first
  (`A/09.png`). The real path is six steps with a click for step 4: open the sample; Shift+A;
  type PageRank; click PageRank; Run (or Enter); click the Influence row.

### 7. Minor, not blocking

- **Histogram of B is uninformative (possible graphty-element defect):** `B/05.png` draws 20
  bars of equal height for 20 distinct values; the result's histogram appears to fall into its
  one-bar-per-value mode for a continuous score, so it shows nothing about the spread.
- **Les Miserables overview reads "Undirected, from the file: directed 0"** (`A/02.png`), an
  unclear sentence, while the edges are drawn with arrowheads.
- **The drawing turns or re-settles between every step** (compare `A/02.png`, `A/03.png`,
  `A/05.png`, `A/08.png`, `A/09.png`), though the tool never reported "still moving". Harmless
  for this task; it would hurt any task that clicks a node by position across steps.
