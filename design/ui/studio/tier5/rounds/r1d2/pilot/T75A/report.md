# T75 A pilot on build d3fda9f2b6 (targeted re-walk): the co-author network made readable

The study build is d3fda9f2b6 (`.study-builds/tier5-r1d2-d3fda9f2b6`). Every walk starts from the
task's real start (`rounds/tier-5/setups/researchers.txt`: the Graph researchers sample open, 549
nodes, 2,084 edges, one piece), at 1440 x 900. Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75A/<walk>/. Walks of
an earlier build in that folder are kept as `success-47c95a09fc` and `touched-8-47c95a09fc`.

This pass walks the pointer success path and the routes in the touched list that belong to T75 A:
"every setup start" (touched-8: the tool's self-check and T75 A's own start) and "T75 A detour:
Cancel then Control+Z spoken count" (touched-14). The other routes name another task and its own
data (T71, T72, T76, T77, T79) and are walked in those tasks' pilots. The detours and the keyboard
walk were not asked for this pass; their last reading (dry run pass 3) stands.

## Result

Reached. The answer key's value holds: "105 of 549 nodes, 869 of 2,084 edges" in the top bar, one
filter card "Degree min 10" with the steps Degree min 10 and Connected components (So far). The data
stayed the task's own the whole way: the end record reads 549 nodes and 2,084 edges in all, 105
nodes and 869 edges showing; the source's count, recount and chips are all 549 / 2,084 (nothing
deleted). No crash, no script error.

## Walks

### success -- the pointer success path

Replayed dry run pass 3's route; all 8 steps matched. Data; Add filter; "degree"; Enter; 10;
Enter (112 of 549); Condition...; "component"; click Connected components: Piece size; Advanced;
So far; click the from box; 100; Enter; Done.

- After "degree" and 10: "Degree min 10 -- Filters 112 of 549", top bar "112 of 549 nodes, 896 of
  2,084 edges" (success/03.png).
- The picker after "component" lists "Connected components: Piece" (highlighted), "Connected
  components: Piece size" and Structure "Largest component" (success/04.png).
- So far on: the range reads 2 to 105 (success/07.png); 100 in the from box: "105 of 549", No
  match 444, top bar "105 of 549 nodes, 869 of 2,084 edges" (success/08.png).
- End: the card lists its two steps; the node table "105 of 549 nodes", Shown; Values "Nodes
  showing 105 of 549", "Edges showing 869 of 2,084" (success/09.png).
- No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75A/success/01.png
to 09.png.

### touched-14 -- Cancel on a new card, then Control+Z (keyboard, screen reader)

Replayed dry run pass 3's route (58 steps, all matched), then carried on by hand. By keyboard:
Data; Add filter; Escape ("Filter not added"); Add filter; "degree"; 10; Escape twice ("Done, 112
of 549"); Add filter; "largest"; Enter (a new card "Largest component, being edited"); Tab across
the panel to the workspace's Cancel; Enter.

- Cancel removes the new card: "Filter not added", focus on Add filter, the Degree card stays at
  112 of 549 (touched-14/58.png).
- Control+Z then undoes the participant's own last step, not the Cancel: toast "Undid editing the
  filter "Degree 10 or more".", spoken "Filter on: 549 of 549 nodes, 2,084 edges"; the cancelled
  Largest component card does not come back (touched-14/59.png). The spoken count keeps the
  thousands separator and names the count after the undo.
- Control+Shift+Z redoes it: spoken "Filter on: 112 of 549 nodes, 896 edges" (60.png). A second
  Control+Shift+Z, with nothing to redo, says nothing (61.png).
- Control+Z twice more: "Undid adding the filter "Degree any value"."; Filters empty, Undo off
  (63.png). Control+Z with nothing to undo says nothing (64.png, 65.png).

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75A/touched-14/01.png
to 65.png.

### touched-8 -- every setup start

- T75 A's own start (touched-8/setup-start): Graph researchers, 549 nodes, 2,084 edges,
  Components 1; Undo's tooltip reads "Nothing to undo"; Control+Z changes nothing; Undo is off
  (setup-start/02.png to 04.png).
- The tool's self-check (`real.mjs --prove` on this build, log touched-8/prove.log): 50 checks ok
  and none failed when this report was written, including the setup starts (one that works and
  leaves Undo off, one whose step names nothing, one whose click never becomes clickable). An
  earlier run that was stopped partway is kept as prove-interrupted.log.

## Defects and candidates

Nothing on these walks crashes, blocks the task or spoils its grade.

- Spoken counts after undo and redo are worded two ways: "549 of 549 nodes, 2,084 edges" after
  Control+Z, "112 of 549 nodes, 896 edges" after Control+Shift+Z, where the screen reads "896 of
  2,084 edges" (touched-14/59.png, 60.png).
- Control+Z or Control+Shift+Z with nothing to undo or redo says nothing (touched-14/61.png,
  64.png); already recorded for this build.
