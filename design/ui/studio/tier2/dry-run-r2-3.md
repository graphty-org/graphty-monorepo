# Tier 2 third dry run before round 2: every task half on build d5a3bee20b61

Every tier 2 task half (A and B of T4, T17 to T24 and T12R, 20 in all, T21B included) was walked
on the frozen build d5a3bee20b61, which holds the fixes the second dry run asked for
(`dry-run-r2-2.md`). Each half followed its success path from `answers.md`, from the start
`tasks.md` gives it, plus the steps that reach the screens those fixes changed. The script is
`pilot/repilot.sh`; the sessions are in `rounds/r2d2/pilot/<task><half>/`, each with its step log
beside it (`<task><half>.log`). Every step of every half landed; no log holds a missed step.

## The second dry run's fixes, checked on this build

| #      | What was wrong on fabc16247403                                                  | On d5a3bee20b61                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5      | Add and Leave out moved about 150 px left after "Show the 1 unmatched row"      | Gone. Add and Leave out stay at the same place before and after (`T4A/06.png` against `07.png`)                                                                                              |
| 7, 57  | A preview that scrolls showed no scrollbar                                      | Gone. The edge preview draws its scrollbar (`T4A/06.png`, `T4B/06.png`), as does the preview once "Higher means" appears (`T20B/06.png`)                                                     |
| 8      | The "1 row left out" inspector showed the whole source's counts                 | Gone. It holds only its "Left out" section (`T4A/11.png`)                                                                                                                                    |
| 14, 23 | `work.json` named the run "Influence"                                           | Gone. `pagerank PageRank (label Influence)`: the screen's name first (`T17A/work.json`, `T17B/work.json`)                                                                                    |
| 15, 23 | `work.json` cut a step's rule mid-value                                         | Gone. The whole rule, `{"kind":"range","attribute":"data.weight","min":4,"nodes":"ends"}` (`T17A/work.json`; B `data.shared_chapters`, min 5)                                                |
| 25     | The run's weight note was drawn small and left of the row names                 | Gone. "Each edge counts as 1. A path needs a distance..." is at row size and starts under "Weight" (`T18A/05.png`); the same for "The counts below are for the whole graph." (`T23B/09.png`) |
| 43     | The tool named one control at two lengths                                       | Gone. Names are quoted up to 80 characters in every report (`T23A.log`, the group's name)                                                                                                    |
| 66     | Enter on a rule already selected left "Rule: press Enter to select matches"     | Gone. After the second Enter the line reads "3 edges selected" (`T22A/06.png`; B "13 edges selected", `T22B/06.png`)                                                                         |
| 68     | "shared_chapters >= 10x" suggested a rewrite the app then refused               | Gone. The refusal offers no rewrite: "Not a rule Find can read (at character 21)" (`T22B/03.png`)                                                                                            |
| 71     | The red refusal started about 8 px left of the gray hint                        | Gone. Both start at x 73 (`T22A/03.png` against `04.png`)                                                                                                                                    |
| 76     | A cut section title showed no tooltip                                           | Gone. Hovering "Medici and 11 connections within 2 ho..." shows the whole title in the shared tooltip (`T23B/06.png`); the uncut A title shows none                                          |
| 77     | The heading's words were exposed four times                                     | Gone. The tool finds two controls of that name, the group and its visible title (`T23A.log`, `T23B.log`)                                                                                     |
| 78     | At Hops 1, "Filter to neighbors" read off while this node's 2-hop filter was on | Gone. At Hops 1 the button is pressed, tooltip "Showing only the neighborhood 2 hops out. Press again to show every node" (`T23A/08.png`, `T23B/08.png`)                                     |

None of the 15 fixed items came back.

## The answer key's four claims that did not hold

Each is now written as this build shows it, with a screenshot of this build:

- T12R: the Medici find list's scrollbar is right, not a bar drawn when every row fits: a
  "Values" group sits below the six ties (`T12RB/02.png`, a longer thumb than Javert's in
  `T12RA/02.png`).
- T23: the left panel's graph title opens the graph's Overview, with the filter and selection
  kept (`T23B/09.png`).
- T19: after save and reopen the drawing keeps its shape, framed a little smaller (A) or smaller
  and lower (B) (`T19A/11.png` against `13.png`, `T19B/11.png` against `13.png`). The framing is
  the open camera question for the owner.
- T19: the saved note's ring lasts through Escape Escape (`T19A/06.png`) and is gone once `n`
  opens the next form, whose text box holds the focus (`T19A/07.png`, `T19B/07.png`).

T21B, which never got a browser on fabc16247403, gives the key's values: Top 10 "Hal 0.1293"
before, "Di 0.1339" and "14 of 14 have a value" after Rerun (`T21B/02.png`, `07.png`).

## New on this build

| What                                                                                                                         | Class  | Reason                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "File settings" moves about 15 px right when "Show the 1 unmatched row" shortens the preview (`T4A/06.png` against `07.png`) | polish | The scrollbar that is now drawn takes its width from the pane; the button sits at the pane's right edge. Small, and only on a click the participant made; record any who mis-click it |
| Between Replace and Rerun on T21B, Mo and Nia are drawn in blue, about the size of the smallest orange nodes (`T21B/06.png`) | design | Already in the key as a watch item; only its size changed on this build                                                                                                               |

Nothing else new was seen. The design questions the second dry run left to the sessions were not
touched.
