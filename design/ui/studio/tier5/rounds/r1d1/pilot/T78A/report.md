# T78 A pilot on build 797a4f6b47 (targeted re-walk)

Task: on the volunteers network with `shifts` on each tie, put in orange everyone with more than
two ties of 2 or more shifts, and report the count. Answer key: 11 of 24.

Every walk started from the task's real start (`setup:volunteers-shifts.txt`) on the frozen build
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-797a4f6b47`, by replaying the same
walk from the round 1 pilot on build baac78342b. Every step of every walk matched the earlier
screens, so the earlier pilot's notes stand for these walks. The screenshots were looked at where
the route reaches something new (the count, the Advanced edge condition, the end state).

None of the routes the fix pass touched belongs to this task (they are T70 to T77 and T79 routes, and
T78 B); none was walked here.

## Success path, by pointer -- reached

+ > Layer; Which nodes; type "degree"; Enter; 3, Enter; Advanced; Edges where ...; Edge value...;
`shifts`; 2, Enter; Done; Fill's +; "orange", Enter. 15 steps, all matched.

- The workspace title reads "Which nodes -- Layer 1 11 of 24"; the row reads "Degree min 3 Edges";
  Advanced's right reads "Edges: shifts min 2", as the answer key says.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/success/12.png
- End: Layer 1 at 11, the key "Color: Layer 1, 11 of 24 nodes", 11 orange nodes on the canvas.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/success/16.png
- The data stayed the task's own (24 nodes, 63 edges) throughout.
- No mismatch with the answer key.

## Detours

- **detour-1: a filter card on the ties first, then Degree on the filtered graph** (Data > Add
  filter > Edges > Value > `shifts` 2 or more; Done; Graph; a Degree min 3 layer; orange). The
  top bar reads "24 of 24 nodes, 31 of 63 edges"; the layer gives 11 of 24, the answer key's "also
  success" with an equal count. All 10 steps matched.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/detour-1/11.png
- **detour-2: `shifts` from the value picker first, then Condition... Degree, then Advanced's edge
  condition.** Steps "shifts min 2" and "Degree min 3 Edges"; 11 of 24 (the Advanced condition
  rescues the near miss). All 6 steps matched.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/detour-2/07.png
- **detour-3: the find box and the canvas.** "shifts" in the find box selects all 63 edges and
  lists each tie's shifts in the inspector; a right-click on a node and the Neighborhood view show
  its connections. A participant learns the values here but not the count. All 6 steps matched.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/detour-3/03.png,
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/detour-3/07.png

## Keyboard -- reached

The same path by Tab, Enter, typing, arrows and Escape; 64 steps, every focus line matched. The
live region reads "11 of 24 nodes", then "Done, 11 of 24", then "Node color now orange, on 11
nodes". End: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78A/keyboard/64.png

Unchanged from the earlier build, none of which blocks the task:

- Tab from Advanced's "All edges" radio leaves the workspace for the status bar's "Local only";
  "Edges where ..." is reached only by ArrowRight on the radio group, and its "Edge value: none"
  picker by Shift+Tab back from "Local only". The page also scrolls up 1 px (64.png).
- After Done by Escape, focus lands on "Edit Which nodes"; the count shows in place of Edit once
  focus moves.

## Crashes, blocks, wrong results

None on any walk. No script error or failed request was printed.
