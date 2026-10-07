# Pilot of the "who matters most" task on the rebuilt app

The task asks a first-time user to have the program rank the characters (A: the Les Miserables
sample) or the running-club members (B: `friends.csv`, drawn by the setup start in `setup-B.txt`)
by how much the network depends on them, then say the top three in order and what the order was
based on. Walked on graphty@0.8.53, build 452285142099, commit 452285142 (no uncommitted changes),
at `/?next`, with `tool/real.mjs`. No code was changed.

The sessions of this walk are `A2/`, `B2/` and `A2-keyboard/`. The folders `A/`, `B/` and
`A-keyboard/` hold the same walk on the earlier commit 9d6598eea; it reached the same values.

## Result

**The end state is reached on both datasets, by the answer key's path, by mouse and by keyboard.**

| Dataset | What the screen shows after the run | Matches the key | Screenshot |
|---|---|---|---|
| A, Les Miserables | Top 10 of "Influence": Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 | yes | `A2/08.png` |
| B, friends.csv | Top 10 of "Influence": Farah 0.06608, Ava 0.06423, Hana 0.05883 | yes | `B2/06.png` |

Names, not ids, appear in both lists. The measure is named on screen as "Influence" (the run row,
the inspector title, the color key and "Made with: Analysis Influence"); the participant picked it
as "PageRank". No script error, console error or failed request was printed at any step.

## Steps walked

Session A (`A2/`), the answer key's mouse path:

1. `--start empty` -- the empty app with the usage card (`01.png`).
2. `--click "No thanks"` -- the card closes; "Usage data stays off" shows at the bottom (`02.png`).
3. `--click "Les Miserables"` -- the sample opens: 77 nodes, 254 edges, one component; no labels
   are drawn on the dots (`03.png`).
4. `--key Shift+A` -- the analyses list opens under "Rank nodes and edges"; PageRank carries
   "Start here" (`04.png`).
5. `--type PageRank` -- the list filters to PageRank alone (`05.png`).
6. `--click "PageRank"` -- the PageRank card: Damping factor 0.85, "Under a second", Run
   (`06.png`). The tool printed "the drawing is still moving" here (see Smaller findings).
7. `--click "Run"` -- a row "Influence 77" appears; dots turn orange; color key "Color: Influence
   0.003299 - 0.07543" (`07.png`).
8. `--click "Influence"` -- the inspector shows Values, Top 10 and Made with (`08.png`).

Session B (`B2/`, setup: No thanks, Open project or file..., upload `friends.csv`): the drawing is
there at once, 20 nodes, 41 edges, Directed (`01.png`); the same five steps (`02.png` to
`06.png`) give the Top 10 above.

Session A-keyboard (`A2-keyboard/`): open the sample (`02.png`), `--key Shift+A --type PageRank`
(`03.png`), `--key Enter` opens the PageRank card with Run focused (`04.png`), `--key Enter` runs
it: the "Influence 77" row and the orange drawing appear (`05.png`).

## Blockers

None. The task can be done and graded as written.

## Smaller findings (do not block the task)

- **App, Les Miserables Overview:** the direction row still reads "Undirected, from the file:
  directed 0" as one run-on line with no label, pushed against the right edge, and the last row's
  label is cut to "Edges per ..." (`A2/03.png`). On `friends.csv` the same rows read "Direction
  Directed" and "Edges per node" cleanly (`B2/01.png`). "directed 0" looks like a raw value
  leaking into the sentence.
- **App, naming:** the participant chooses "PageRank", and after Run that word is gone; every
  later screen says "Influence", and the inspector subtitle reads "Measure from Influence, Oct 6",
  which repeats the name. The card says "Damping factor", the inspector "Damping Factor". The key
  accepts either name as the answer to "what was the order based on".
- **App, B histogram:** the Values chart for `friends.csv` is 20 equal bars (`B2/06.png`), one
  per node, so it shows nothing about the spread; on Les Miserables it is a real histogram
  (`A2/08.png`).
- **Tool:** "the drawing is still moving" was printed after opening the PageRank card by mouse
  (`A2/06.png`), where the drawing is plainly settled and unchanged from `A2/05.png`; on the
  earlier commit it was printed after the keyboard Run instead. The check seems to fire on a
  card or color transition, not on real canvas motion. A participant does not see the tool's
  print, so it does not affect the task, but a grader may mistake it for a defect.
