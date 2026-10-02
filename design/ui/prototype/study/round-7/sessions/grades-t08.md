# Grades: try a different arrangement, then stop it moving

The task: "The drawing of the characters is hard to read. Try a different way of arranging it,
and once it looks better, stop it moving so you can study it."

The intended path: select the graph so the right-hand panel shows it, open that panel's Style
tab, press the Layout Method button ("Spread Out") to open the Layout picker, choose another
method (the drawing starts moving and the bottom toolbar's layout button becomes "Pause layout"),
then press that button so the drawing holds still. Renders: shots/tasks/t08/01.png to 05.png.

Grading rule: success means a different method was chosen in the Layout picker and the layout
button was then pressed to pause. Success with difficulty means the same end after a wrong turn,
a long search or a hover hint, or re-arranging through the canvas menu's "Re-run layout" or
"Reshuffle layout seed" instead of choosing a method. Failure means they could not change the
arrangement, or ended somewhere else. On the start screen the layout has already settled and
the button reads "Resume layout"; pressing it before changing the method starts motion and is a
detour, not the pause. Grades go by what was on screen at the end and what they concluded, not
by how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Gephi user | failure | success with difficulty | Picked ForceAtlas2 in the Layout picker (28.png, notice "Laid out again: ForceAtlas2"); the button still read "Resume layout" at the end (30.png), so the drawing was still. She changed the engine under "Spread Out" rather than the method. She reached the graph's Style tab only by accident: "Re-run layout" in the canvas menu reloaded the file (22.png), which cleared the selection so the graph's own panel stayed up. Her two attempts to get back there on purpose failed (24, 25). Pressed "Resume layout" early as a detour (07). Concluded, correctly, that nothing on screen changed. The weakest grade of the six. |
| First-time explorer | gave up | success with difficulty | The rubric's canvas-menu route: "Reshuffle layout seed", then "Resume layout", then "Pause layout"; ended paused (25.png). Never found the Layout picker; reached the canvas menu only through Quick actions, by typing "arrange". Pressed "Resume layout" early as a detour (05). Concluded she "never got a different arrangement", which matches the screen: the drawing never changed. |
| Cytoscape user | success with difficulty | success with difficulty | Chose Natural Grouping in the Layout picker (25.png); the Method field kept it (28.png). Reached the graph's Style tab by accident, through the Views rail (23.png), after about twenty tries. Never pressed pause: the button read "Resume layout" after the change (29.png) and she concluded "it was apparently already stopped". That was true of the screen she had, but only because the prototype did not start the layout after the change (finding 3). Pressed "Layout" early as a detour (01). |
| Marketing analyst | success with difficulty | success with difficulty | Chose Natural Grouping (20.png), closed the picker, pressed "Resume layout" then "Pause layout"; ended paused (26.png). Reached the graph's Style tab by accident, through the Views rail (18.png). Hovered all five toolbar icons to learn their names and pressed play early as a detour (02). |
| Recipe recipient | gave up | gave up | Never found the Layout picker. Pressed play early (03), hovered every toolbar icon, opened Quick actions, then pressed "Re-run layout" in the canvas menu. That opened the file-loading screen (18.png: blank canvas, the list down to three rows, "Reading miserables.gexf"). He believed he had wiped the file and stopped. |
| Network scientist | success with difficulty | success with difficulty | Chose Natural Grouping (25.png), closed the picker, pressed "Resume layout" then "Pause layout"; ended paused (30.png). Reached the graph's Style tab through the Data rail (22, 23.png) after 21 steps that took in the main menu, the shortcut sheet, Settings, Quick actions, the canvas menu, View and Analyze. Pressed play early as a detour (01). |

Totals: 0 success, 5 success with difficulty, 0 failure, 1 gave up.

Read the five with caution. On a strict reading -- a different method chosen in the picker and
the pause pressed afterward -- only two qualify (the marketing analyst and the network
scientist), and both pressed pause only after starting the layout themselves. Nobody found the
Layout picker on purpose: of the four who reached it, two arrived through the Views rail, one
through the Data rail and one through a file reload. Ease ratings were 2, 2, 3, 3, 2, 3 out of
7. Not one participant saw the drawing change.

## Findings

Severity is Nielsen's 0 to 4. Counts are participants out of 6.

1. **Nothing visible leads to the layout settings (6 of 6 searched; 0 of 6 found them on
   purpose).** The word "Layout" appears on screen only as the play button's tooltip. Every
   participant looked first in the bottom toolbar, the main menu, Analyze, View or Quick actions.
   The settings sit two levels down under the graph's Style tab. Three participants said outright
   they would never look under "Style" for arrangement ("style is colors"). Two who know Gephi or
   Cytoscape expected a top-level Layout panel or menu. Severity 4: this is the main blocker for
   the task.

2. **The graph's own panel will not stay open (6 of 6).** Choosing the graph's name in the
   switcher at the top of the left panel shows the graph's summary on the right. Closing the
   switcher, with Escape or by picking the graph, puts the right panel back on the PageRank row,
   so its Style tab shows PageRank's fill and shape. Clicking the "Graph" rail button changes
   nothing (3 of 6 tried it). The panel only stays with the graph when no row is selected,
   which happened through the Views rail, the Data rail or a reload. Severity 3. This is what
   turns finding 1 from "hidden" into "reachable only by accident".

3. **In the prototype, choosing a method neither starts the layout nor redraws (4 of 4 who
   chose one).** After "Laid out again: ..." the drawing was identical to the start screen and
   the button still read "Resume layout". Three of the four doubted the change had been applied
   at all; the marketing analyst tried Ring "to be sure" and still saw the same blob. The spec
   intends the drawing to start moving with "Pause layout" showing (shots/tasks/t08/04.png).
   This is a defect in the click-through, not a design finding, but it made the second half of
   the task meaningless: there was never any motion to stop, and the "looks better" judgment was
   impossible. Fix the skeleton before t08 runs again: a method change should go to the
   toolbar's running state and show a changed drawing.

4. **"Re-run layout" in the canvas menu opens the file-loading screen (2 of 6 pressed it; 1 gave
   up because of it).** The canvas menu routes this item to the loading state, so the screen
   empties and reads "Reading miserables.gexf". Both who saw it believed their work was being
   reloaded or wiped. This is also a click-through defect, but its effect was real: it ended
   the recipe recipient's session. Severity 3 as experienced.

5. **Neither Quick actions nor the canvas menu offers "change the layout method" (6 of 6 opened
   one or both).** Quick actions lists "Re-run layout" first among recent items, and choosing
   it opens the canvas menu instead of running it (5 of 6). Typing "arrange" found only "Re-run
   layout". The canvas menu has "Re-run layout" and "Reshuffle layout seed" but no way to pick a
   method, and four participants said reshuffling the seed is not a different arrangement.
   Severity 3. The network scientist's suggestion was to put "change layout" next to the
   play/pause button or in the canvas right-click menu.

6. **The play button greets the reader with "Resume layout" (6 of 6; 5 pressed it before
   changing anything).** The layout had settled, so "stop it moving" had nothing to act on, and
   pressing play changed nothing that anyone could see. Four participants said they could not
   tell whether the drawing had ever been moving. Severity 2. The button is the obvious handle
   for "the thing that moves", yet it gives no sign of which method is running and no way to
   change it.

7. **The method names hide the algorithm (3 of 3 who know the algorithms).** ForceAtlas2 is an
   "engine" under the method "Spread Out". The Gephi user found that ForceAtlas2 then listed
   another engine's options (spring length, theta, drag) and none of its own (scaling, LinLog,
   prevent overlap). The network scientist found pacing options (pre-steps, stop threshold)
   offered for a spectral embedding, which is computed in one shot. She also pointed out that
   the recommended engine ignores edge weights on a weighted graph. Severity 2. Single voices on
   the parameter mismatches. The less technical participants praised the plain names (2 of 6).

8. **"Clear graph data" sits in the same canvas menu as the layout items (4 of 6 remarked on
   it, unprompted).** Severity 2.

9. **The View menu reads as an arrangement menu until opened (3 of 6 opened it hoping it
   was).** Front, Side, Top and "Switch to 2D" turn the camera. Two participants were also
   surprised that "Switch to 2D" means the flat-looking drawing is in 3D. Severity 1.

What worked: the "Undo" on the "Laid out again" notice was praised by 3 of the 4 who saw it, and
the Layout picker's columns (size limit, whether weights are used) were read as clear by every
participant who reached it.
