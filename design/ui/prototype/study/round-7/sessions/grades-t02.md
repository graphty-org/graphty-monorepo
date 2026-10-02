# Round 7 grades: who the teammate's work ranks highest (Les Miserables)

Task as given: "Someone on your team already worked on this project. Work out which five
characters their work says matter most to the whole story, in order, and how the drawing shows it."

Grading bar:

- Success: the PageRank row is selected and its Data tab (Values and Top 10) is on screen; the
  participant names Valjean, Myriel, Gavroche, Marius, Javert in that order and says the
  orange-to-brown color shows the score.
- Success with difficulty: the same order read from the node table, or reached after a wrong turn;
  or the order found but the color link not made.
- Failure: answers with Louvain groups, degree, or the hidden Betweenness ranking, or stops on the
  Style tab without the order.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | Answer |
|---|---|---|---|---|
| Computational biologist (Dr. Chen) | success | success with difficulty | PageRank Data tab with Top 10, reached through a note's "Earlier run" link | correct order, color named |
| Gephi holdout (Dr. Lindqvist) | success with difficulty | success with difficulty | Analyze menu, after the order was read from the sorted table | correct order, color named |
| Marketing analyst (Jordan) | success with difficulty | success with difficulty | PageRank Style tab with the hidden Betweenness row highlighted; order read from the table | correct order, color named, Betweenness caveat |
| Genomics postdoc (Maren) | success with difficulty | success with difficulty | node table with the Watchlist selection, sorted by degree; order read earlier from the table | correct order, color named |
| Screen-reader analyst (Morgan) | success with difficulty | success with difficulty | PageRank Data tab with Top 10 and the options popover open | correct order, color named, settings quoted |
| Curious first-timer (Elena) | success with difficulty | success with difficulty | Notes list; order read from the sorted table | correct order, color named, after a wrong first guess by size |

Totals: 0 success, 6 success with difficulty, 0 failure, 0 gave up. Every participant gave the
right five in the right order and tied the order to the orange-to-brown color. Nobody reached the
PageRank Data tab by the intended path (select PageRank, then its Data tab).

## Why each grade

**Computational biologist -- success with difficulty, down from their own "success".** Their
final screen (render 06) is exactly the success screen: PageRank selected, Data tab, Top 10
matching the table. But they got there by a detour: they clicked "Data" meaning the inspector tab,
landed in the left-rail Data section, then read the order off the table, and only reached the Top
10 by following a note's "Earlier run" link to check the run. A wrong turn plus an indirect route
is the definition of success with difficulty. (Renders 07 to 09 in their folder are not narrated
in the transcript -- a Data-rail screen, the earlier Style tab, and the Analyze menu. They do not
change the grade; the transcript's last step and answer are what count.)

**Gephi holdout -- success with difficulty.** Answer correct, read from the table sorted by
"PageRank (full graph)". Never saw the Top 10: their "Data" click went to the rail, and "from
Analyze" opened the algorithm menu instead of the run's settings. Ended on that menu.

**Marketing analyst -- success with difficulty.** Answer correct and reasoned from the legend
("the key is what my VP reads"). Sorted by Betweenness too and noted that number five flips to
Fantine, but chose PageRank as the answer, so this is not the Betweenness failure. Ended on the
PageRank Style tab with Betweenness highlighted in the tree; would have been a failure ("stops on
the Style tab without the order") had they not already read the order from the table.

**Genomics postdoc -- success with difficulty.** Order read from the table sorted by "Rank by
PageRank". Spent three steps on the Watchlist suspecting it was the teammate's top five; selecting
it highlighted nothing on the drawing or in the table. Answer unaffected, ending screen is not the
target.

**Screen-reader analyst -- success with difficulty.** Ended on the target screen (PageRank Data
tab, Top 10) with the strongest answer of the six: order, values and run settings. Same detour as
the biologist: the "Data" click went to the rail, the order came from the table, the Top 10 came
through the note's "Earlier run" link.

**Curious first-timer -- success with difficulty.** Her first answer, from the start screen, was
the degree top five (Valjean, Gavroche, Marius, Javert, Cosette) because she read dot size as
importance. The table's "Rank by PageRank" gap (1, 3, 4, 5, 6) led her to sort and correct it, and
her final answer explicitly says size is not importance. Final answer correct; ended on Notes.

## What the grades show

| Finding | Evidence | Severity (Nielsen 0-4) |
|---|---|---|
| Two controls named "Data" (left rail section and the inspector tab); asking for "Data" with PageRank open left the run and opened the file summary | 5 of 6 clicked "Data" meaning the tab; all 5 landed on the rail. The marketing analyst never tried | 3 |
| Nothing says which measure is the teammate's headline; PageRank paints the drawing, but a Betweenness note and a hidden Betweenness row in "For the report" compete | 6 of 6 hesitated over it; all chose PageRank because it paints the color, none from anything that said so | 3 |
| The node table opens sorted by degree while PageRank is selected, so the PageRank order has to be found by noticing rank 2 is missing | 6 of 6 got the order from the table and all 6 had to re-sort it; 4 of 6 found Myriel by noticing rank 2 was missing | 2 |
| Color is PageRank and size is degree; size draws the eye and gives a different top five | 1 of 6 answered by size first (the first-timer); the other 5 all remarked on Myriel being small but dark | 2 |
| The run's settings: "Defaults" with no weight or damping shown, then "Weight: None: no weight loaded" while the graph summary lists a weight column | 3 of 6 looked for the settings (biologist, Gephi holdout, screen-reader analyst); 1 found them, and that one called the weight line contradictory | 2 |
| "Earlier run" on a note opens the measure without saying whether the note's run is the current one | 2 of 2 who clicked it said so | 2 |
| Selecting the Watchlist (5 nodes) highlights nothing on the drawing or in the table | 1 of 6 (genomics postdoc); single voice, but a direct observation of the render | 2 |

## Caveats on the evidence

- The "Data" result is partly a study-tool effect. `--click "Data"` presses the first control with
  that name, which is the left rail. A sighted mouse user aims at the tab and would probably reach
  it. The name clash is still real for the screen-reader analyst and for anyone who sees two
  "Data" labels at once, so the finding stands, at a lower confidence than "5 of 6" suggests.
- The ramp-legibility complaint (ranks 3 to 5 indistinguishable by eye, light end blends into the
  default orange) came from 2 participants reading a static render; it needs a check against the
  actual ramp before it is acted on.
- All six are simulated personas; agreement among them is weaker evidence than six real people.
