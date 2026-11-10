# T74 A pilot, targeted re-pilot on build 47c95a09fc

Task: put the five people who matter most (by the PageRank run the volunteers start already holds)
in orange, leave everyone else as they are, and name the five. Start: setup `volunteers.txt`.
Build: 47c95a09fc, served from the frozen copy named in criteria.md.

This re-pilot walks only the pointer success path and the one re-walk route listed for this task
(the T74 A success path on a small graph, where no change was expected). The other routes in the
re-walk list belong to other tasks.

## Success path, by pointer (success)

Replayed from the previous pass's success walk; all 13 steps matched their check points and the
session ended.

Route: + > Layer; Which nodes; type "page"; Enter (PageRank: Influence); the mode select (a click
on the words "By value" misses, a click on the box opens it); By position; type 5; Enter; Done;
Add to node fill; type FFA500, Enter; Escape.

- After Enter on 5 the editor reads "PageRank: Influence top 5", 5 of 24, and the table lists
  James Carter, Priya Nair, Hannah Weiss, Seun Okoro and Ben Adler -- the answer key's five.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74A/success/10.png
- At the end, Layer 1 covers 5 nodes with Fill FFA500; the other 19 keep the PageRank layer's
  colors; the volunteers data is unchanged (24 nodes, PageRank column intact).
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74A/success/14.png

Reached: yes. No mismatch with the answer key.

## Re-walk: T74 A success path (touched-18)

Its own session, replayed from the walk above: all 13 steps matched and the session ended. As
expected, nothing changed on this small graph.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T74A/touched-18/14.png

## Defects

None new that crash, block the task or spoil its grading. Already recorded and unchanged: the mode
select is named "PageRank test" rather than by the value it shows, so a click on the words "By
value" misses (success/06.png); the color key card titled "Color: Layer 1" shows the PageRank
gradient (success/14.png).
