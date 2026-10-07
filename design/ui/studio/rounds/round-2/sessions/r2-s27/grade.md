# Grade: session r2-s27 -- Ruth (data journalist), bigger dots for the ones that matter, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json, no uncommitted changes). Graded from the last
screenshot (16.png), 13.png where the sizes were bound, and the transcript. No files were
downloaded (the task asks for none).

## Grade: SD (success with difficulty)

- **Ranking run.** Ruth chose Betweenness from the Analyze list's "Rank nodes and edges" group
  (05.png) and ran it (07.png). It is a ranking, and its description ("Which nodes sit on the most
  shortest paths between others") fits "which characters the network depends on most" at least as
  well as the success path's PageRank. Not a partial.
- **Sizes bound to it.** 13.png and 16.png: the dots visibly differ (Valjean very large in the
  middle, Myriel and Gavroche medium, most small); the key reads "Size: Bridges 0 to 1624" above
  "Color: Bridges 0 to 1624"; the Size line read "1 to 3" (13.png). "Bridges" is the on-screen name
  of the Betweenness run, as "Influence" names a PageRank run.
- **Meaning stated from the screen.** "Bigger dot = more of the network's shortest routes go
  through that person"; colors "say it again: light orange at 0, dark brown at the top (1,624,
  Valjean)". Both correct, and she named the link Bridges = Betweenness from "Made with: Analysis
  Betweenness" (16.png).
- **Why SD, not S:** the size step needed a tooltip. At step 11 she hovered the unlabeled
  chain-link icon to learn it meant "Size by attribute" before clicking it. Criteria count a
  tooltip as SD, the same as sessions r2-s02, r2-s03, r2-s05 and r2-s10 on this task.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no. At step 3 the tool did not find a control named "Find nodes,
  edges, values" (the search box's placeholder; its accessible name is "Find") and typed nothing;
  nothing reached the app, and Ruth clicked the box by position at step 4, as a person would.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 12 to the success state (02.png-13.png), 15 in all after the start | about 9 steps, 11 commands |
| Wrong turns | 1 | -- |

Wrong turns against the success path:

1. Steps 3-4 (03.png, 04.png): searched for Valjean before starting the task; it changed nothing
   in the drawing (the first attempt also missed the box).

Not counted: the hover at step 11 is help (the reason for SD). Steps 14-16 came after the success
state and were checks of who the big dot is and what the number counts; the hover at step 14
showed nothing and she recovered with a click at step 15.

The path itself matched the reference after the method choice: Run, the result row, Add to Shape,
Size, Size by attribute, the result's own attribute.

## False "done"

None. "Part 2 done" at step 13 and "Did I finish? Yes" at the end are both true of 13.png and
16.png: sizes bound to the ranking, the key shows size. Her caveat that the unit of 1,624 is not on
screen is accurate, not a claim.

## Problems

Severity 0-4 (Nielsen). No build defect was found, so no repro script was written; every item
below is behavior, wording, opinion or accessibility.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | The method picked is "Betweenness", but its result is "Bridges" everywhere after: the row, the key, the Style tab and the size picker. Ruth linked the two only from "Made with: Analysis Betweenness" at the bottom of the Values tab; a reader of the key alone sees "Bridges" and nothing else. Confirmed: r2-s06 problem 3 and the PageRank-to-"Influence" rename in r2-s05. | Steps 7-8, 16; 07.png, 08.png, 16.png |
| 2 | 2 | wording | The key gives "0 to 1624" with no unit, and the fractional values in the Top 10 (470.6, 376.3) suggest split paths that nothing on screen explains. She said she could not print the number without knowing what it counts. | Steps 7, 13, 16; 07.png, 13.png, 16.png |
| 3 | 2 | behavior | Size lives under "Shape", behind a "+", and binding it to data needs an unlabeled chain-link icon that made sense only after hovering ("Size by attribute"). Seen on this task in r2-s02, r2-s03, r2-s05 and r2-s10 as well. | Steps 8-11; 08.png-11.png |
| 4 | 2 | behavior | Hovering a dot shows nothing: no tooltip, no name. She had to click the big dot to learn it was Valjean. | Steps 14-15; 14.png, 15.png |
| 5 | 1 | behavior | Running a ranking colors the dots but leaves sizes alone; the task's "bigger dot" half had to be found separately. She said so but was not blocked. | Step 7; 07.png |
| 6 | 1 | wording | Once bound, the Size box reads "1 to 3" with no word for what the numbers are (times the base size?). | Step 13; 13.png |
| 7 | 1 | accessibility | The search box's visible text is "Find nodes, edges, values" (a placeholder) while its accessible name is "Find"; a voice-control or screen-reader user who says what they see does not reach it. | Steps 3-4; 03.png, 04.png |
| 8 | 1 | opinion | The "Start here" badge on PageRank pulled at her though its description did not fit "depends on"; she thinks a less careful reader would take it. (Held one level down: opinion.) | Step 5; 05.png |

What worked, for the record: every analysis has a one-line description, and "between others"
decided her choice; the result is dated ("Oct 6"); "77 of 77 have a value" and "#1 of 77" let her
check coverage and rank; the size picker grays out id and name with the reason "Holds groups, not
amounts"; Valjean's Degree 36 matched the overview's "1 to 36", so two parts of the screen agreed.
