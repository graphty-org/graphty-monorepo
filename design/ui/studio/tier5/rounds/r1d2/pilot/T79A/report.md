# T79A pilot (targeted re-walk), build d3fda9f2b6

Task: in the research office's 50,000-person staff network, make the people in the Grants
department stand out in orange and report how many are orange. Start: `staff-50k.txt` (the
50,000-node file opened and drawn by the Random layout). Every walk began from that setup and was
driven only by the pointer or keys, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T79A/ (not in git).
The folders there with no suffix (success, keyboard, detour-3, touched-8, touched-30, touched-32)
are walks on the earlier build 47c95a09fc; this build's walks carry the suffix `-d3fda9f2b6`.

Result: **reached**. The walk ends with Layer 1 (dept Grants), "Which nodes 1,076 of 50k", Color
E4572E, and the key card "Color: Layer 1, 1,076 of 50,000 nodes", as the answer key says. The data
stayed the task's own staff file the whole way (data.json: 50,000 nodes, 100,000 edges, all
visible, none selected, no filter).

## success -- the success path by pointer

+ > Layer; Which nodes; dept; type "Grants"; tick Grants; Done; Fill's +; type E4572E; Enter; then
the field checks (type 00FF00 and Escape; Tab). All 10 steps replayed and matched their screens.

- 01.png: the setup start; Undo and Redo drawn disabled.
- 04.png: dept's checklist, "Search 40" focused, 8 rows and "32 more".
- 06.png: "Which nodes -- Layer 1 1,076 of 50,000", "dept Grants", "No match 48,924".
- 07.png: Done closes the workspace; Layer 1 counts 1,076. The Which nodes row shows Edit in place
  of the count while focused (known, in the answer key).
- 09.png: Enter commits E4572E; key card "Color: Layer 1, 1,076 of 50,000 nodes".
- 10.png: 00FF00 then Escape puts the field back to E4572E. 11.png: Tab goes to the link button.

Waits: opening Which nodes 16 s, the tick 15 s, Done 16 s; every other step under 6 s.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T79A/success-d3fda9f2b6

## touched-12 -- Undo after Cancel on a new filter card

Data > Add filter; dept; Grants; tick (03.png: "1,076 of 50,000", top bar "1,076 of 50,000 nodes,
44 of 100,000 edges"); Cancel.

- 04.png: the card is gone, no filter mark, all 50,000 drawn; Undo and Redo disabled.
- 06.png: Undo's tooltip "Nothing to undo"; 07.png Control+Z changes nothing; 08.png Redo "Nothing
  to redo"; 09.png a click on Undo changes nothing; 10.png Control+Shift+Z changes nothing.
- 11.png: the success path built from there (1,076, E4572E).
- 12.png: Escape then Control+Z undoes the participant's own color ("Undid changing node color on
  Layer 1.", fill 6366F1); 13.png Control+Shift+Z redoes it ("Redid ...", E4572E).

The cancelled card never returns; the participant's own steps still undo and redo.

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T79A/touched-12-d3fda9f2b6

## touched-8 -- every setup start (the tool's self-test)

`real.mjs --prove` on this build, sessions under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T79A/touched-8-d3fda9f2b6/prove,
output in /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T79A/touched-8-d3fda9f2b6.prove.txt.
Every setup-start check passed: a setup start runs its steps before 01.png, the sample is open on
arrival, the pointer is over nothing, Undo is disabled with "Nothing to undo", the open work lists
the setup's source and layers, and a setup step that misses fails the start loudly. 61 checks ok
at the time of writing (the run was still in its last checks).

Two checks failed, both in the tool, not the app: the slot-pool checks ("with every slot full, a
bounded start gives up with exit 4" and "the same start, run again, starts once the slot frees")
exited 2 with "a session is already running in .../tmp/studio-sessions/tmp/prove/rounds/round-9/
sessions/r9-s04". That participant folder sits at a fixed path in the worktree that
REAL_PROVE_DIR does not move, so two self-tests running at once (another task's ran beside this
one) share it and the second finds the first's session. An earlier, interrupted self-test of this
task had also left a session (prove/session-a) holding a browser slot; it was ended first.

The other routes the fix pass touched are other tasks' routes (T71, T72, T75, T76, T77, T79 B).

## Defects

None that crash, block the task or would spoil its grade.
