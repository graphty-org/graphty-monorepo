# Pilot of the "who matters most" task on the rebuilt app

The task asks a first-time user to have the program rank the characters (A: the Les Miserables
sample) or the running-club members (B: `friends.csv`) by how much the network depends on them,
then say the top three in order and what the order was based on. Walked on graphty@0.8.53, build
b7590f8de22b, commit b7590f8de (no uncommitted changes), at `/?next`, with `tool/real.mjs`. No code
was changed.

## Result

**The end state is reached on both datasets.** A run is now named by its method everywhere: the
left-panel row, the color key, the inspector title, the "from" line and "Made with: Analysis" all
say "PageRank", so the measure can be named straight off the result screen.

| Dataset | What the screen shows after the run | Screenshot |
|---|---|---|
| A, Les Miserables | Top 10 of PageRank: Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577; key 0.003299 - 0.07543 | `A/08.png` |
| B, friends.csv | Top 10 of PageRank: Farah 0.06608, Ava 0.06423, Hana 0.05883; key 0.04382 - 0.06608 | `B/05.png` |

Both match the reference values in `answers.md`, and both lists show names, not ids. No script
error, console error or failed request was printed in either session; every step exited 0.

## Steps walked

Session A (`A/`, start empty):

1. `--start empty` -- the start screen with the usage card (`01.png`).
2. `--click "No thanks" --click "Open the Les Miserables sample"` -- 77 nodes, 254 edges, one
   component (`02.png`).
3. `--key Shift+A` -- the analysis list; PageRank carries "Start here" (`03.png`).
4. `--type PageRank` -- the list filters to PageRank alone (`04.png`).
5. `--click "PageRank"` -- the PageRank card: Damping factor 0.85, Weight None, "Under a second",
   Run (`05.png`).
6. `--click "Run"` -- a row "PageRank" with 77 in the left panel; nodes turn orange; key "Color:
   PageRank 0.003299 - 0.07543" (`06.png`).
7. `--click "PageRank"` -- selects the run row; the inspector opens on its Style tab (Color:
   PageRank) (`07.png`).
8. `--click "role=tab:Values"` -- histogram, Top 10, "Made with: Analysis PageRank" (`08.png`).

Session B (`B/`, setup `setup-B.txt`: No thanks, Open project or file..., upload `friends.csv`):

1. Start -- 20 nodes, 41 edges, Directed, one component (`01.png`).
2. `--key Shift+A --type PageRank --key Enter` -- the PageRank card (`02.png`).
3. `--key Enter` -- runs it; row "PageRank" with 20, key 0.04382 - 0.06608 (`03.png`). The tool
   printed "the drawing is still moving".
4. `--click PageRank` -- selects the run row, Style tab (`04.png`).
5. `--click "role=tab:Values"` -- Top 10 with names (`05.png`).

## Blockers

None blocks the end state. The two findings of the previous pilot that this build was meant to fix
are fixed: clicking "PageRank" after the run now selects the run row instead of hanging on a hidden
analysis-list entry, and the method name no longer disappears after the run. Remaining findings,
most important first:

### 1. The round 3 path in the answer key is ambiguous about the Values tab -- answer key

- **Evidence:** `A/07.png`, `B/04.png`: selecting the run row still opens the inspector on its
  Style tab, so the Top 10 needs `--click "role=tab:Values"` (`A/08.png`, `B/05.png`). The key's
  "Round 3 path (7, not yet walked)" says "the same, with `--click "PageRank"` in place of
  `--click "Influence"`"; the count of 7 only works if "the same" means round 2's path including
  the Values-tab step. Say so explicitly, and mark the round 3 path walked (this folder).

### 2. "The drawing is still moving" after Run -- tool defect or app animation, unconfirmed

- **Evidence:** B step 3. Comparing `B/03.png` with `B/04.png`, no node moved; only the recolor
  happened. Session A's Run step did not print it this time. It does not affect the task.

### 3. Minor text on screens the task passes through -- app defect, not blocking

- `A/02.png`: the Overview line "Undirected, from the file: directed 0" runs to the panel edge, and
  "Edges per ..." is truncated (on `B/01.png` "Edges per node" fits).
- `A/07.png`, `B/04.png`: the inspector subtitle reads "Measure from PageRank, Oct 7", which names
  the row after itself.
- `B/05.png`: the Values histogram for 20 distinct values draws 20 bars of equal height, which says
  nothing about the distribution.

## Answer key

The success path holds on this build with `--click "PageRank"` to select the run row followed by
`--click "role=tab:Values"`, 7 commands from the opened sample on A. The keyboard route through
Enter (B steps 2 and 3) works as written. The reference values are unchanged.
