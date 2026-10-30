# Pilot: T60 B (yeast gene network from a web address), targeted re-walk after the fix pass

Build: a53beb7179 (frozen, .study-builds/tier4-r1d3-a53beb7179). Start: empty. Every session was
ended. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B (folders whose
names start rp4-).

Result: reached. The loaded network is the task's own file the whole way: 331 nodes and 361 edges
(Overview, the Sources row, the source's Loaded section and the Edges table agree). These are the
answer key's counts (331 genes, 361 interactions).

## Routes walked

1. Success path by pointer (rp4-success): replayed from the last walk of this route; all 10 steps
   matched and the session ended.
   - The web address typed into "Web address of a graph file" in Open network data (rp4-success/05.png).
   - Enter opens project "yeast-galactose"; Overview shows Nodes 331, Edges 361 (rp4-success/06.png).
   - Data: the Sources row shows the link glyph, 331 and 361, no issue chip (rp4-success/07.png).
   - The source's inspector shows Loaded Nodes 331, Edges 361; Table > Edges reads "361 edges" with no
     warning marks (rp4-success/09.png, rp4-success/11.png).
2. Keyboard only, started --keys --sr (rp4-keyboard): replayed from the last keyboard walk; all 50
   steps matched (the dialog's tab order, Escape with text typed, the address typed again, Enter,
   then Data by arrow key) and the session ended. --read at the end lists the Sources row as
   "yeast-galactose.graphml 331 nodes, 361 edges" (rp4-keyboard/51.png).
3. Detours (rp4-detours): replayed the detour walk that covers Open a file and cancel, the Web API
   card's Server form, Sources "+" > Server... and Network data..., Enter in the address box inside
   an Untitled project, Main menu > Open project or file... and Escape, the address pasted into Find,
   and a right-click on empty canvas. All 32 steps matched and the session ended. Find answers
   "No match for ..." and leaves the data unchanged (rp4-detours/30.png).

## Routes the fix pass touched

None of the fourteen listed routes (the keep card and its chip's count, a style layer's Which
nodes, the Data source card's count and the source row's issue chip, the narrowed Hide card's
count, the Edges "With issues" filter, the deliveries/pantries detour and the column issue marks)
belongs to this task: each starts from another task's own data and setup (T61, T65, T66, T67,
T68) and none lies on this task's path from the start screen to a network opened from a web
address. They are walked in those tasks' own pilot folders, not here.

## Mismatches between the answer key and the screen

None that change the grading. The source's inspector shows a file glyph and "Source", not the web
address (rp4-success/09.png), as the key already says.

## Defects

1. After Enter in the address box on the keyboard walk, focus falls to the page itself; the next Tab
   starts again at Main menu (rp4-keyboard/31.png, rp4-keyboard/32.png). Already in the backlog.
2. The load's status is announced "yeast-galactose: 331 nodes, 361 edges" then "331 nodes, 361
   edges" twice (the third arrives with the text already in the region, so many screen readers will
   not read it) (rp4-keyboard/31.png).
3. The only control beside the web address box is the file-upload icon button; Enter is the only
   way to open the address (rp4-success/05.png). Already in the backlog.
4. The Edges table's "Columns: 2 of 2" reads grayed as if disabled (rp4-success/11.png).

No defect blocks the task or changes the counts.
