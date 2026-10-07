# Grade: session r3-s25 -- Nadia (level-1 alert reviewer), task T9 A, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (12.png, identical to 11.png) and the transcript. The
session saved no files. Not graded from the participant's rating (5 of 7).

## Grade: SD (success with difficulty)

Every part of the success definition holds in 12.png:

1. **A ranking was run.** Steps 4-6: Analyze, PageRank, Run. The legend reads "Color: PageRank
   0.003299 to 0.07543", and the outline gains a "PageRank 77" row (06.png). PageRank is an
   accepted ranking.
2. **Sizes are bound to it.** Steps 9-11: "Add to Shape", Size, then the option "PageRank" in the
   from-data list. The Size line reads "1 to 3". The dots differ visibly: one large dark dot in the
   middle, a second at the lower hub, most stay small. The legend gains "Size: PageRank 0.003299
   to 0.07543" above the color row.
3. **Meaning stated from the screen.** In the debrief she said both size and color stand for
   PageRank, read from the key ("Size: PageRank" and "Color: PageRank"), and that bigger and darker
   means higher PageRank, "connected to other well-connected nodes". Correct.

**Why SD and not S:** one wrong turn before the success path. After Run she opened the graph's
Style tab (step 7, 07.png), found only background and layout settings, and abandoned it. She then
found the path by clicking the PageRank row in the outline.

- **The size list:** used, not closed. "Fixed size" was not chosen. The chain-link was never needed.
- **Did she mention the sizes not changing:** yes, at step 6 ("They asked for bigger dots, not
  colors. The sizes didn't change.").
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. Every command did what a person could do. The hover at step 12 reached the node
  (the tool reports "Valjean"). The app showed nothing, because no tooltip line was set. That is
  how the build behaves, not a tool fault.

## Counts

| | This session | Reference (round 3 path) |
|---|---|---|
| Commands after the start, to the success state | 10 step commands (11 actions) to step 11 | 8 steps, 10 commands |
| Commands in the whole session | 11 step commands (12 actions) | -- |
| Wrong turns | 1 | -- |

- **The wrong turn:** step 7, the graph-level Style tab (07.png). No size control there. She left
  it on the next step.
- **Not counted as wrong turns:** declining the usage card (step 2, part of the start page). A stray
  hover on Main menu (step 3, nothing changed). Hovering the biggest dot after success (step 12),
  which is exploration and changed nothing.

## False "done"

None. She said "the sizes are done" (step 12) and "Did I finish? Yes, I think so" (debrief). The
screen agrees: Size reads "1 to 3", the key shows "Size: PageRank", and the dots differ. She
said plainly that she could not name the large dots and that her choice of measure followed the
"Start here" tag. Neither is a claim the screen contradicts.

## Bars touched

- **Bar 4 (silent commit):** none. Run changed every dot's color (05.png to 06.png). Binding the size
  changed the dot sizes and the key (10.png to 11.png).
- **Bar 5 (counts and key against the drawing):** the key's range, 0.003299 to 0.07543, matches the
  reference values for PageRank on Les Miserables. "PageRank 77" matches the 77 nodes. No mismatch.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Each is seen in this one
participant. None is a build defect: each control did what it was built to do, so no repro script
was written.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | After Run, the inspector stays on the graph (Values tab), not on the new PageRank row. The graph's own Style tab has no size control, and nothing points to the run row as the place to style the result. This caused the session's only wrong turn. | Steps 6-8: 06.png (right panel "Graph / From Les Miserables"), 07.png (graph Style: background and layout only), 08.png (the row's Style with Fill, Shape, Label). |
| 2 | 2 | behavior | Hovering a dot shows nothing, not even its name. She could not say who the biggest, most important characters are, which is the point of sizing them. The "Tooltip +" line is the only way, and she chose not to set it up. | Step 12: 11.png against 12.png, identical; the tool reports the node "Valjean" under the pointer. Debrief: "I could not tell you their names from the screen." |
| 3 | 2 | wording | The task's "depends on most" is closer to Betweenness's line ("sit on the most shortest paths between others") than to PageRank's. She took PageRank only because of the "Start here" tag and could not justify the choice ("the app said start here"). For an alert reviewer, that is an unexplained basis for a report. | Step 4, 04.png; debrief first confusion point. |
| 4 | 1 | wording | Size sits under "Shape", behind a "+". She guessed "a dot's size is kind of its shape" and found it, but said "Size as its own row would have been obvious". | Steps 8-9, 08.png, 09.png. |
| 5 | 1 | wording | The size list offers "PageRank", "PageRank rank" and "PageRank percentile" without saying whether rank 1 makes the largest or the smallest dot. She avoided "rank" for that reason. | Step 10, 10.png. |
| 6 | 1 | wording | The key shows raw PageRank values (0.003299 to 0.07543) with no hint of what the numbers mean. She said she could not put them in an alert file without explaining them. | Step 11, 11.png; debrief. |
| 7 | 0 | opinion | Size and color now encode the same measure. She was unsure whether she should leave the color or change it to mean something else. Held one level down as an opinion. | 11.png; debrief. |

**What worked:** the start-page hint "Analyze (flask icon) in the toolbar (Shift+A)" led her
straight to Analyze. Each analysis has a one-line definition, and the "Start here" tag removed
the choice for a newcomer. Run colored the dots and added a key at once. On the run row, Size
under "Add to Shape" opened the from-data list at once, with the run's own PageRank first in its
group. Choosing it sized the dots and added "Size: PageRank" to the key in one click.
