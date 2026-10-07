# Pilot: Untangle the drawing (Les Miserables)

Build under study: graphty@0.8.53, commit e82708488eea, opened at `/?next` from an empty start.

## Result

The end state is reached in three steps, as the answer key's path says: open the sample, open
Layout in the bottom toolbar, pick another method. Spectral replaced the default Force method and
every node moved (02.png against 05.png and 06.png). Whether it helped is an opinion: on this
build Spectral does not help. It pulls almost every character into one knot at the bottom of the
canvas, with two long chains of minor characters stretching away, so clusters are harder to tell
apart than before.

## Walk

| Shot | Step | What the screen showed |
| --- | --- | --- |
| 01 | start, empty | Start page, the usage card, four samples; Les Miserables first, "77 characters". |
| 02 | No thanks; Les Miserables | The sample drawn with Force; Values panel: 77 nodes, 254 edges, 1 component. |
| 03 | Layout | A popover over the toolbar: Method "Force - Recommended", Seed 1. |
| 04 | Method | The method list: Force - Recommended, Force flat, Circle, Grid, Spiral, Spectral, No crossings, Random, Keep positions. |
| 05 | Spectral | Positions changed at once. Most nodes are packed into a small knot at the bottom, partly under the Layout popover and the toolbar. |
| 06 | Escape | The popover closes; the knot sits just above the toolbar, still partly hidden by it. |
| 07 | Layout; Method; No crossings | Drawing unchanged. Under Method, in red: "No crossings could not lay out this graph, so the drawing is unchanged". Method shows Spectral again. |
| 08 | Method; Circle | Every node moved, but into a filled disc, not a ring: node sizes vary with depth, so the 3D view places them on a sphere. |
| 09-16 | hover each header and toolbar icon | Tooltips: Main menu, Undo Ctrl+Z, Nothing to redo, Analyze Shift+A, Layout, View, Legend L, Quick actions Ctrl+K. |
| 17 | View | Fit 0, Frame selection (disabled), Front, Side, Top, Isometric, Switch between 2D and 3D 5. The sample opens in 3D. |

No script errors, console errors or failed requests were printed at any step.

## Findings

1. **Answer key, the "No crossings" refusal words.** The key expects the words "Could not draw
   with No crossings". This build prints "No crossings could not lay out this graph, so the drawing
   is unchanged" under Method. The behavior matches the key (drawing kept, method named, reason
   given); only the words differ. Grade against the printed sentence.
2. **Element, Spectral framing on this graph.** Spectral puts roughly 70 of 77 nodes into a knot a
   few pixels wide, because a few pendant characters land far away and the fit has to include them.
   The knot ends up under the toolbar (06.png). Not a blocker for the task (the key expects "it did
   not help"), but a participant cannot see the knot well enough to judge it.
3. **Element, Circle draws a sphere in 3D.** With the default 3D view, "Circle" places nodes on a
   sphere, which reads as a filled disc, not a circle (08.png). A participant reading "Circle" will
   expect a ring. Either the method should stay planar in 3D or its name should say what it does in
   3D. Not a blocker.
4. **Tool, select by label prints "ambiguous".** `--click "Method"`, the documented way to open a
   select, printed `ambiguous: "Method" matches 2 controls (combobox ..., label "Method"); took the
   first` every time. It opened the right list, so it is only noise, but a combobox and its own label
   should count as one control.

Task wording: no problem. The prompt led straight to Layout; "clusters" did not pull toward
Analyze in this walk.
