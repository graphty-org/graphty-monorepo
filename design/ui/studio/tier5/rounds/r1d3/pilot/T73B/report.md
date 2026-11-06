# T73B pilot (targeted re-walk), build c3100058ab

Task: put Cedar Bend and every gauge within two stretches of river of it in orange, and report the
count. Start: `gauges-clean.txt` (gauges.csv joined with flows.csv, the table open). The walk
started from that setup, by pointer only, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T73B/ (not in git).

Result: **reached**. The walk ends with Layer 1 "Within 2 hops of Cedar Bend", 7 of 11 nodes,
fill FFA500, and the canvas draws 7 orange gauges. The data stayed the task's own 11 gauges and 13
stretches throughout (data.json: 11 nodes, 13 edges, all visible, nothing selected).

## Walks

### success -- the success path by pointer

+ > Layer; Which nodes; type "within"; Enter; Enter (the reference picker opens, its search
focused); type "Cedar"; Enter; Done; Fill's + ("Add to node fill"); type orange; Enter. 12 steps,
as the answer key says. Replayed from the previous pass's success walk: all 8 recorded steps
matched their screens on this build, and the session ended cleanly.

- 06.png: header "Which nodes -- Layer 1 7 of 11", row "Within 2 hops of Cedar Bend", "No match 4";
  the preview draws 7 green matches and 4 pale non-matches.
- 07.png: after Done, the workspace closes; Layer 1 counts 7, the inspector reads "Within 2 hops of
  Cedar Bend".
- 09.png: 7 orange nodes, key card "Color: Layer 1, 7 of 11 nodes", inspector "Which nodes 7 of
  11", Color FFA500, Layer 1 counts 7.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T73B/success

### The routes the fix pass touched

None of the listed routes belongs to this task: they are filter-card routes (a new or existing
filter card's Cancel, Undo after Cancel, focus after a new card goes, Done on 50,000 nodes, a card
from Quick actions) and other tasks' success paths. T73B builds a style layer's Which nodes and
uses no filter card, so only the success path was walked.

## Mismatches with the answer key

None. The key's "Fill; hex" is, on screen, Fill's + button ("Add to node fill") and a text field
that takes a color name or hex; both reach FFA500.

## Defects

Nothing crashes, blocks the task or spoils its grade on this walk. As on the last pass, the canvas
toolbar sits over the lowest orange gauge in 07.png and 09.png; that is decided (the toolbar is an
overlay and framing never avoids it), and the key card and Layer 1 both read 7.
