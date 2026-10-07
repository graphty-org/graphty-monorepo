# Pilot: T11, untangle the drawing (Les Miserables)

Build under study: commit b7590f8de, graphty@0.8.53, no uncommitted app changes, `/?next`,
1440 x 900, empty start. Two sessions were walked with `real.mjs`:

- `main/` (01.png to 07.png): the answer key's main path -- open the sample, Layout, pick a
  method, Apply -- with Spectral, then Circle.
- `groups/` (01.png to 11.png): the group-layout path the answer key lists for round 3 -- run
  Louvain from Analyze, then Layout, Rings by group, Apply, then Columns by group, Apply.

Every command exited 0. No step missed, nothing was ambiguous, and no script error, console error,
failed request or "still moving" warning was printed.

## Result

**The end state is reached on both paths.** A method other than Force was applied and every node
moved.

| Path | Steps after the start | Evidence |
| --- | --- | --- |
| Main (Spectral) | 4: No thanks + Les Miserables; Layout; Spectral; Apply | `main/02.png` Force drawing; `main/05.png` every node moved |
| Main, second method (Circle) | 2 more: Layout; Circle + Apply | `main/07.png` every node moved again |
| Groups (Rings by group) | 8: No thanks + Les Miserables; Shift+A; type Louvain; Louvain; Run; Layout; Rings by group; Apply | `groups/06.png` six colored groups (20, 17, 11, 11, 10, 8); `groups/09.png` each group on its own ring |
| Groups (Columns by group) | 2 more: Layout + Columns by group; Apply | `groups/11.png` six colored columns, one per group |

The round 3 change landed: before any community run, Rings by group, Two columns and Columns by
group are greyed with "Needs a node attribute to group by" (`main/03.png`, correct: the sample has
nothing to group by). After Louvain finished, Rings by group and Columns by group are enabled and
their forms open with "Group by: Communities" already chosen (`groups/07.png`, `groups/08.png`,
`groups/10.png`). Two columns stays greyed on Louvain's six groups, as the answer key predicts.

Did it help (an opinion, not graded):

- Spectral: no. About 70 of 77 nodes fall into one knot at the bottom of the canvas, half under
  the toolbar, with two long chains of minor characters stretching away (`main/05.png`).
- Circle: no. In the default 3D view the nodes land on a sphere, which reads as a filled disc of
  crossing edges (`main/07.png`).
- Rings by group: partly. Each color sits on its own ring, but the rings are concentric, so every
  group surrounds the ones inside it and the edges cross the whole drawing (`groups/09.png`).
- Columns by group: yes. Each group is its own column and the groups are clearly apart
  (`groups/11.png`). This is the only arrangement on this build that makes the clusters easier to
  tell apart.

## Blockers

None. Nothing below stops a participant from reaching the end state.

### Element defects (not blocking)

1. **Refusal reasons are graphty-element's own English, shown as is.** "No crossings" reads 'the
   layout "planar" cannot draw this graph without crossings: G is not planar.' (`main/03.png`) and
   "Two columns" after Louvain reads 'the layout "bipartite" needs exactly two groups, and
   "results.louvain.group" names 6' (`groups/07.png`). Both expose internal names ("planar",
   "bipartite", "G", an attribute path) to a first-time reader. The element builds these sentences
   as strings (`graphty-element/src/session/planning.ts`, the planar and bipartite branches)
   instead of returning a code and its parameters for the app to word, which also breaks the
   rule that graphty-element returns neutral facts. A participant confused by them is a wording
   finding the app cannot fix without the element change.
2. **Layout descriptions are element English with British spelling.** The Rings by group form
   says "around a shared centre" (`groups/08.png`; `graphty-element/src/catalog/layouts.ts`).
3. **Spectral frames a knot under the toolbar.** The fit includes the far pendant characters, so
   the dense part is a few pixels across and partly hidden (`main/05.png`). Unchanged from the
   earlier walks.
4. **Circle draws a sphere in 3D.** The method named "Circle" gives a filled disc in the default
   3D view (`main/07.png`), although Spectral and the group layouts say "Draws flat". Unchanged.
5. **Columns by group does not keep the groups' order.** The form says "in the order the groups
   are given", but the columns run Group 6, 1, 5, 3, 4, 2 from left to right (`groups/11.png`),
   not the order of the legend and the left panel (Group 1 to 6). A reader matching columns to the
   legend has to read colors, not positions.

### App defects (not blocking)

6. **The color legend covers part of the drawing.** After the Louvain run the legend box sits
   over the top-left of the canvas and hides nodes and edges there (`groups/06.png`; in
   `groups/09.png` the outer ring's top-left nodes are under it). Seen on earlier walks too.
7. **The group is named three ways.** The run is "Louvain" in the panel and the legend, its groups
   are "Group 1" to "Group 6", and the layout form's Group by says "Communities"
   (`groups/08.png`). A participant can still connect them (it is the only choice), but the
   form does not name the run it groups by.
8. **The Overview's direction row still shows raw file syntax.** "Undirected, from the file:
   directed 0", clipped at the panel edge, with no row name (`main/02.png`). Unchanged; not on
   this task's path.

### Answer-key notes

9. The main path is 4 steps on this build, as `answers.md` says for round 2's build (Layout opens
   the list, picking a method opens its form, Apply draws it). Reopening Layout after an apply
   opens the list again with the applied method checked (`main/06.png`), not the last form.
10. The group-layout path walks as written (8 steps) and its end state holds for both Rings by
    group and Columns by group. "Groups sit apart" is plainly true for Columns by group; for Rings
    by group the groups are separated only as concentric rings, so a grader should accept either
    but expect "helped" opinions to differ between them. Worth saying in the key.
11. The note that "Two columns" may stay refused on Louvain's six groups is confirmed; the
    refusal text is the element's sentence quoted in finding 1, not "Needs a node attribute to
    group by".

### Tool and task wording

No tool defect: every named control resolved on the first try, and both sessions ended cleanly.
No task-wording problem found; this walk follows the success path, so it cannot show whether a
first-time participant reaches the group layouts by way of Analyze unprompted.
