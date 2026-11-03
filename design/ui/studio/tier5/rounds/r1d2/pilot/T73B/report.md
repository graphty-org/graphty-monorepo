# T73B pilot (targeted re-walk), build 47c95a09fc

Task: put Cedar Bend and every gauge within two stretches of river of it in orange, and report the
count. Start: `gauges-clean.txt` (gauges.csv joined with flows.csv, the table open). The walk
started from that setup, by pointer only, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73B/ (not in git).

Result: **reached**. The walk ends with Layer 1 "Within 2 hops of Cedar Bend", 7 of 11 nodes,
fill FFA500, and the canvas draws 7 orange gauges. The data stayed the task's own 11 gauges and 13
stretches throughout (data.json: 11 nodes, 13 edges, nothing hidden or selected).

## Walks

### success -- the success path by pointer

+ > Layer; Which nodes; type "within"; Enter; Enter (the reference picker opens, its search
focused); type "Cedar"; Enter; Done; Fill's + ("Add to node fill"); type orange; Enter. 12 steps,
as the answer key says. Replayed from the previous pass's success walk: every one of the 8
recorded steps matched its screen on this build.

- 06.png: header "Which nodes -- Layer 1 7 of 11", row "Within 2 hops of Cedar Bend", "No match 4";
  the preview draws 7 green matches, the lower table lists the matched gauges.
- 09.png: 7 orange nodes, key card "Color: Layer 1, 7 of 11 nodes", inspector "Which nodes 7 of
  11", Color FFA500, Layer 1 counts 7.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T73B/success

### The routes the fix pass touched

None of the listed routes belongs to this task: they are filter-card routes (Cancel on a new or
existing filter card, the toolbar's Filters with Escape, a card from Quick actions) and other
tasks' success paths and detours. T73B uses no filter card, so only the success path was walked.

## Mismatches with the answer key

None. The key's "Fill; hex" is, on screen, Fill's + button ("Add to node fill") and a text field
that takes a color name or hex; both reach FFA500.

## Defects

Nothing crashes, blocks the task or spoils its grade on this walk. One thing a participant could
trip over: in 09.png the canvas toolbar sits over the lowest orange gauge (near 677,368), so only
part of it shows; a participant counting dots on the canvas could see 6 and a sliver. The key card
and Layer 1's count both read 7.
