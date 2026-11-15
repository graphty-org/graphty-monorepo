# T78 A pilot on build c3100058ab (targeted re-walk)

Task: on the volunteers network with `shifts` on each tie, put in orange everyone with more than
two ties of 2 or more shifts, and report the count. Answer key: 11 of 24.

The study build is c3100058ab (`.study-builds/tier5-r1d3-c3100058ab`). Every walk starts from the
task's real start (`rounds/tier-5/setups/volunteers-shifts.txt`: volunteers-shifts.graphml opened).
Screenshots stay out of git, under
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/<walk>/`.

This pass walks the pointer success path and the routes the last fixes touched (taking back a new
filter card leaves no undo step; "Drawing" stays on screen until a closing repaint is painted),
each on this task's own data. Routes tied to the 50,000-node datasets (touched-9, touched-11,
touched-12, touched-13: the Otter Creek tick, filter card Done and Cancel on 50,000 nodes, Done on
staff-50k) belong to T79's data and its own pilots; they were not walked here. The detours and the
keyboard walk were not asked for this pass; their last reading stands.

## Result

Reached. 11 of 24 on the success path and on the filter-card path. No crash, no script error or
failed request, nothing that blocks the task or spoils its grade on any route walked.

## Walks

### success -- the pointer success path

Replayed the previous pass's 15 steps (+ > Layer; Which nodes; "degree"; Enter; 3 Enter; Advanced;
Edges where ...; Edge value...; shifts; 2 Enter; Done; Fill; orange Enter); every check point
matched.

- Before Done: title "Which nodes -- Layer 1 11 of 24", row "Degree min 3 Edges", Advanced's right
  "Edges: shifts min 2", "No match 13".
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/success/12.png
- End: Layer 1 at 11, key "Color: Layer 1, 11 of 24 nodes", 11 orange nodes, fill FFA500.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/success/16.png
- The data stayed the task's own (24 nodes, 63 edges) throughout. No mismatch with the answer key.

### touched-1 -- new card, tick, Cancel, Undo

Data > Add filter; role; tick staff (top bar "5 of 24 nodes, 3 of 63 edges", card "role staff");
Cancel. The card is gone, the Filters section is empty, the top bar's filter mark is gone, and the
graph is back to 24 nodes and 63 edges. Undo reads "Nothing to undo"; clicking it and Ctrl+Z change
nothing.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-1/06.png,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-1/07.png,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-1/10.png

### touched-2 -- Cancel on a new card then Ctrl+Z (after the task's own layer)

The success path first (11 of 24, orange), then Data > Add filter; role; tick staff; Cancel. The
layer keeps its 11 and its orange; Undo now names the participant's last real action, "Undo
changing node color on Layer 1", so the cancelled card left no undo step. Ctrl+Z then takes back
the orange ("Undid changing node color on Layer 1.", Redo offered), which is what that Undo said
it would do; Which nodes stays 11 of 24.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-2/18.png,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-2/20.png

### touched-3 -- Cancel on a new (empty) card then Ctrl+Z

Data > Add filter; Cancel; "Nothing to undo"; Ctrl+Z changes nothing. No card, no filter mark.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-3/05.png

### touched-4 -- Quick actions card, Cancel (announcements, screen-reader mode)

Ctrl+K, "filter": the only option is "Filters"; Enter opens a new filter card with focus on
"Find attributes, results" and announces "Editing New filter, Filters". Escape: "Filter not
added", focus on "Add filter". Enter on Add filter again, Shift+Tab back to the header (focus
order: Condition..., the table's "id", Fit, the card treeitem, Done, Cancel, Clear, Table of
matches), Enter on Cancel: "Filter not added", focus on "Add filter", no card left. Ctrl+Z says
nothing and changes nothing. Focus never fell to the page body.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-4/25.png

### touched-5 -- Cancel on a new card with a step (announcements, screen-reader mode)

Ctrl+K "filter" Enter; type "role" Enter (focus to checkbox "volunteer, 16 nodes"); Space ticks it
("16 of 24 nodes"); Shift+Tab to Cancel; Enter: "Filter not added", focus on "Add filter", no
card, nothing to undo.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-5/16.png

### touched-6 -- Cancel on an existing card (regression check)

Replayed the previous pass's route: a filter card "shifts min 2" (31 of 63 edges), Edit, change
the min to 3 (20 of 63), Cancel. All 5 steps matched. The card is back to "shifts min 2" and the
top bar to "24 of 24 nodes, 31 of 63 edges"; Undo names "editing the filter "shifts 2 or more"",
not the cancelled edit.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-6/05.png,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-6/06.png

### touched-7 -- focus after a new card goes (regression check)

Replayed the previous pass's route (Add filter; Cancel; Tab; Shift+Tab, read): all 4 steps
matched. After Cancel, and after Add filter then Escape, focus is in the Data place on "Add
filter"; Enter there opens a new card again. Focus never fell to the page body.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-7/03.png,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-7/08.png

### touched-8 -- the filter card path

Replayed the previous pass's 10 steps (Data > Add filter > Edges > shifts 2 or more; Done; Graph;
a Degree min 3 layer; orange); every check point matched. Top bar "24 of 24 nodes, 31 of 63
edges", layer 11 of 24: the answer key's "also success".
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-8/11.png

### touched-10 and touched-14 -- Done with glances, on this small graph

The success path replayed twice, saving the frame 1 s (touched-10) and 300 ms (touched-14) after
each input; every check point matched both times. 300 ms after Done the workspace is closed and
the layer row reads 11 with Which nodes "Edit"; no "Drawing" left and no preview look on the
canvas. Every input was taken within about 80 ms and drew its first frame within about 130 ms.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-14/13-glance.png,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/touched-10/13-glance.png

## Defects

None that crash, block or spoil the grade on these routes.
