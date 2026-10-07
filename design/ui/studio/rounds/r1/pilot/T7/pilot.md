# Pilot of the "who matters most" task on the rebuilt app

The task asks a first-time user to have the program rank the characters (A: the Les Miserables
sample) or the running-club members (B: `friends.csv`) by how much the network depends on them,
then say the top three in order and what the order was based on. Walked on graphty@0.8.53, build
e82708488eea, commit e82708488, at `/?next`, with `tool/real.mjs`. No code was changed.

## Result

**The end state is reached on both datasets, and the keyboard path now works.** Enter on the
filtered analysis list opens the PageRank card, and Enter on the card runs it, so dataset B was
walked with no click before the result row.

| Dataset | What the screen shows after the run | Screenshot |
|---|---|---|
| A, Les Miserables | Top 10 of "Influence": Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 | `A/08.png` |
| B, friends.csv | Top 10 of "Influence": Farah 0.06608, Ava 0.06423, Hana 0.05883 | `B/04.png` |

Both match the reference values in `answers.md` (PageRank, "Influence"), and both lists show
names, not ids. No script error, console error or failed request was printed in either session.

## Steps walked

Session A (`A/`, start empty):

1. `--start empty` -- the start screen with the usage card (`01.png`).
2. `--click "No thanks" --click "Les Miserables"` -- 77 nodes, 254 edges, one component
   (`02.png`).
3. `--key Shift+A` -- the analysis list opens; PageRank carries "Start here" (`03.png`).
4. `--type PageRank` -- the list filters to PageRank alone, shown highlighted (`04.png`).
5. `--key Enter` -- the PageRank card opens: Damping factor 0.85, "Under a second", Run
   (`05.png`).
6. `--click "Run"` -- a row "Influence" with 77 appears in the left panel; nodes turn orange; a
   color key "Color: Influence 0.003299 - 0.07543" (`06.png`). The tool printed "the drawing is
   still moving".
7. `--click "PageRank"` -- **timed out** ("elementHandle.click: Timeout 3000ms exceeded"); the
   screen is unchanged (`07.png`).
8. `--click "Influence"` -- the inspector shows Values (histogram), Top 10, and "Made with:
   Analysis Influence, Damping Factor 0.85" (`08.png`).

Session B (`B/`, setup `setup-B.txt`: No thanks, Open project or file..., upload `friends.csv`):

1. Start -- 20 nodes, 41 edges, Direction Directed, one component (`01.png`).
2. `--key Shift+A --type PageRank --key Enter` -- the PageRank card opens (`02.png`).
3. `--key Enter` -- runs it; row "Influence" with 20, color key 0.04382 - 0.06608 (`03.png`).
   The tool again printed "the drawing is still moving".
4. `--click Influence` -- Top 10 with names (`04.png`).

## Blockers

None blocks the end state. Remaining findings, most important first:

### 1. A click on "PageRank" after the run times out instead of missing -- tool defect

- **Evidence:** A step 7 (`A/07.png`): the analysis list is closed and nothing on screen says
  "PageRank", yet the tool found an element of that name and hung for 3 seconds on clicking it,
  instead of printing `nothing on screen is called "PageRank"`.
- **Why it matters:** the answer key's path tells a round 2 participant to click "PageRank" to
  select the run row. On this build the row is "Influence", and the participant gets a Playwright
  timeout rather than the miss a person would experience. The likely cause is that the closed
  analysis popover's entries stay in the page, hidden, and the tool's name lookup does not skip
  hidden elements. If those hidden entries are still exposed to assistive technology, that part is
  also an app defect; this pilot did not check.

### 2. The method name PageRank disappears once it has run -- task wording / answer key note

- **Evidence:** `A/08.png`, `B/04.png`: the row, the color key, the inspector title and "Made
  with: Analysis" all say "Influence"; "PageRank" appears only in the list and card before the
  run (`A/04.png`, `A/05.png`). The answer key already accepts "Influence" as the measure name,
  so this is not a grading problem, but a participant asked "what the order was based on" can
  only name the method by remembering the card they ran.

### 3. "The drawing is still moving" after Run -- tool defect or app animation, unconfirmed

- **Evidence:** A step 6 and B step 3. Comparing `A/06.png` with `A/07.png` and `B/03.png` with
  `B/04.png`, no node moved; only the color change happened. Either the recolor animates for more
  than a second or the tool's settle check counts the recolor as motion. It does not affect the
  task.

### 4. Minor text on screens the task passes through -- app defect, not blocking

- `A/02.png`: the Overview line reads "Undirected, from the file: directed 0", cut off at the
  panel edge, and "Edges per ..." is truncated.
- `A/08.png`, `B/04.png`: the inspector subtitle reads "Measure from Influence, Oct 6", which names
  the row after itself.
- `B/04.png`: the Values histogram for 20 distinct values draws 20 bars of equal height, which
  says nothing about the distribution.

## Answer key

The success path in `answers.md` holds on this build when "Influence" is used to select the run
row, as the key already says for this build. Its keyboard path (open, rank, select the row) now
works through Enter as written.
