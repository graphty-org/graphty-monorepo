# Pilot: T18, the fewest people in between

Walked on build graphty@0.8.55 (ca8b3b916c22) at commit 6eba30d4e, both datasets, following the
success path in `../../answers.md`. Screenshots are in `A/` and `B/`.

## Result

Both variants reach the answer key's chain, and the run's Values show it plainly.

- **A (running club, setup `friends.txt`):** `--key p`, type Chloe, pick the option, To, type
  Milo, pick the option, Find path, Values. Values read "Route 5 nodes, 4 edges" and Nodes in
  order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5 (`A/08.png`). Made with reads "Weight: not read --
  weight has no meaning chosen, and a path needs a distance", as the key says.
- **B (Florentine families, setup `florentine.txt`):** the same steps. Values read "Route 5
  nodes, 4 edges" and Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5 (`B/07.png`); Made
  with "Weight: none (each edge counts 1)".

## What a participant will meet on the way

1. **The Weight box says one thing and the run does another (A).** In the Path popover the
   Weight box is preset to "weight (loaded)" (`A/02.png`), so a reader expects the tie numbers to
   be used as distances. The run then ignores them ("Weight: not read ..."), and the Made with
   section shows both the "not read" line and, just below it, the same box still reading
   "weight (loaded)" (`A/08.png`). The answer is right, but a careful participant may stop to
   change the box to None, or doubt the result. Grade such a detour as caused by the build.
2. **Enter in From still does not move to To (B).** Typing "Strozzi", pressing Enter, then
   typing "Pazzi" leaves "StrozziPazzi" in From and To empty (`B/03.png`, `B/04.png`). This is
   the build defect the key already lists; it is still there.
3. **The run opens on its Style page, not its Values.** After Find path the inspector shows the
   run's Style (`A/07.png`, `B/06.png`); the chain in order needs one more click on Values. The
   highlighted drawing alone has no names (friends.csv and the sample draw none), so a
   participant who stops there cannot name the chain.
4. **Numbers that are not the answer, as the key warns.** The legend reads "Shortest route
   (edges) 24" in both variants, and the Graph tree row reads "Shortest path 61" in A and
   "Shortest path 35" in B. The key gives 61 only; add 35 for B.
5. **Florentine Overview row is garbled (B, before the task starts).** The direction row has no
   label and runs past the panel edge: "Undirected, from the file: directed 0"; "Edges per
   n..." is cut off (`B/01.png`). Not on the task's path.
6. **Tool note.** One step that only typed into the To box (`B/05.png`) printed "the drawing is
   still moving"; the screenshot shows the same drawing as the step before. Graders should not
   read it as the participant disturbing the graph.

## Verdict

Ready to run. The prompt words avoided ("shortest", "path", "route", "find") are absent from both
prompts. Add "Shortest path 35" (B) to the key's list of wrong numbers, and expect detours from
the preset Weight box in A.

## Re-walk, 2026-10-07 (after the tier 2 fixes)

Walked again with `tool/real.mjs` on a frozen copy of the served build (graphty 0.8.55 at commit 4c8d9eb2a plus the uncommitted fixes then in the worktree), both datasets,
from the same setups. Screenshots and the printed steps are in `rewalk/A/` and `rewalk/B/`
(`steps.log`); `../rewalk.sh T18A T18B` repeats it. No step printed a script error, a console
error, a failed request or "the drawing is still moving".

**Result: reached on both datasets**: Values "Route 5 nodes, 4 edges", Chloe, Ava, Ivan, Kofi, Milo
(`rewalk/A/08.png`) and Strozzi, Ridolfi, Medici, Salviati, Pazzi (`rewalk/B/08.png`).

| Earlier observation | Now |
|---|---|
| The Weight box read "weight (loaded)" while the run ignored it (A) | The popover says "Not read -- weight has no meaning chosen, and a path needs a distance" above a box reading "weight (loaded, not read)" (`rewalk/A/02.png`), and Made with repeats both (`rewalk/A/08.png`) |
| Enter in From left focus there ("StrozziPazzi") | Enter picks Strozzi and moves on to To; "Pazzi" lands in To (`rewalk/B/05.png`) |
| A false "the drawing is still moving" while typing in To | Not printed at any step |

Still so, as the answer key lists: the run opens on Values only after a click; the tree row reads
"Shortest path 61" (A) and "35" (B); the legend "Shortest route (edges) 24".
