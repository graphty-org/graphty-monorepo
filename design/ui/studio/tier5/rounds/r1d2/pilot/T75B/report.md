# T75 B pilot on build d3fda9f2b6 (targeted re-walk): the yeast network made readable

The study build is d3fda9f2b6 (`.study-builds/tier5-r1d2-d3fda9f2b6`). Every walk starts from the
task's real start (`rounds/tier-5/setups/yeast.txt`: the yeast network open, 331 genes, 361
interactions, 26 separate pieces), at 1440 x 900. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75B/<walk>/. The
walks of an earlier build that sat in that folder are kept in its `old-47c95a09fc/`.

This pass walks the pointer success path and the routes the last fixes touched that belong to
T75 B. Of the routes asked for, only "every setup start" applies to T75 B's own start; the others
name another task and its own data (T71, T72, T76, T77, T79) and are walked in those tasks'
pilots. The T75 A route "Cancel then Control+Z" was also walked on T75 B's data, since a T75 B
participant can take the same wrong turn. The detours and the keyboard walk were not asked for
this pass; their last reading (dry run pass 3, build c3100058ab) stands.

## Result

Reached. The answer key's value holds: the top bar reads "24 of 331 nodes, 4 of 361 edges", one
filter card "Largest component" with its three steps. The data stayed the task's own the whole way:
the end record reads 331 nodes and 361 edges in all, 24 nodes and 4 edges showing; the source's
count, recount and chips are all 331 / 361 (nothing deleted). No crash, no script error.

## Walks

### success -- the pointer success path

Replayed dry run pass 3's route (15 steps); every check point matched. Data; Add filter; type
"largest"; Enter (249 of 331); Condition...; "degree"; Enter; 2; Enter (170 of 331); Condition...;
"gal80"; Enter; 0.5; Enter; Tab; Done.

- Before Done: workspace "Largest component -- Filters 24 of 331"; outline Largest component /
  Degree min 2 / gal80Rexp min 0.5 / No match 307; top bar "24 of 331 nodes, 4 of 361 edges"
  (success/15.png).
- End: the card lists its three steps; top bar "24 of 331 nodes, 4 of 361 edges"; Values "Nodes
  showing 24 of 331", "Edges showing 4 of 361" (success/16.png).
- No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75B/success/01.png
to 16.png.

### touched-8 -- the setup start leaves no undo history

Started from the yeast setup; hovered Undo: "Nothing to undo"; Control+Z: nothing changed (331 of
331 nodes, no filter, the drawing as loaded, Undo and Redo both dimmed, touched-8/03.png); Redo:
"Nothing to redo"; Undo again: "Nothing to undo". End record 331 / 361, no filter card.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75B/touched-8/01.png
to 05.png.

### touched-14 -- Cancel on a new filter card, then Control+Z (on T75 B's data)

Data; Add filter; "largest"; Enter: the new card reads 249 of 331, the top bar "249 of 331 nodes,
298 of 361 edges", the node table open (touched-14/02.png). Cancel: the card is gone, the Filters
section empty, the top bar has no filter mark (03.png). Control+Z: nothing comes back -- no card,
331 of 331, Undo dimmed with "Nothing to undo" (04.png, 05.png). End record 331 / 361, no filter
card. Spoken counts were not read on this walk (pointer session); the T75 A pilot reads them.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75B/touched-14/01.png
to 05.png.

## Defects

None on these walks: nothing crashed, blocked the task or gave a count that would spoil its grade.
The keyboard defect from the last pass (Enter on Largest component in a new card's picker sends
focus to the sidebar's Add filter) was not re-walked this pass.
