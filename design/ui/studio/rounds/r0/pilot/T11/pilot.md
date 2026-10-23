# Pilot: T11, untangle the drawing

The pilot walked the task "try a different way of arranging the dots so the clusters of characters
are easier to tell apart, and tell us whether it helped" on the real graphty app (graphty 0.8.53,
commit 452285142, build 452285142099, no uncommitted changes), starting from an empty app, with the
study tool `tool/real.mjs`. The screenshots are in this folder; an earlier pilot on build
9d6598eea3e9 is kept in `prev/`. No script errors, console errors or failed requests were printed
at any step.

## Verdict

The graded end state is reached: a different layout method was applied and the node positions
changed visibly (03.png to 06.png with Spectral, to 07.png with "Force, flat", to 11.png with
Circle). The answer key's 3-step path works as written: open the sample, `--click "Layout"`, pick
another method.

The answer to "did it help" is "no" on this build, which the answer key already expects. Every
alternative tried is worse than the default drawing. "No crossings" does nothing, and the message
that says so is hidden behind the Layout popover until the popover closes.

## Steps

| Step | Command                                                | Screenshot | What it shows                                                                                                                                                        |
| ---- | ------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                                    | 01.png     | Start screen; Les Miserables under Samples, "77 characters"; usage-data card                                                                                         |
| 2    | `--click "No thanks"`                                  | 02.png     | Card gone; footer "Usage data stays off. Change this in Settings > Privacy"                                                                                          |
| 3    | `--click "Les Miserables"`                             | 03.png     | The default "Force - Recommended" drawing: a knot top left, a group to the right, a fan of leaves at the bottom                                                      |
| 4    | `--click "Layout"`                                     | 04.png     | Layout popover above the bottom toolbar: Method "Force - Recommended", Seed 1 with a clear "x"                                                                       |
| 5    | `--click "Method"`                                     | 05.png     | Method list: Force - Recommended, Force flat, Circle, Grid, Spiral, Spectral, No crossings, Random, Keep positions                                                   |
| 6    | `--click "Spectral"`                                   | 06.png     | Nearly every node in one clump at the bottom right, partly behind the toolbar; two nodes strung up a long line to the top edge, one off to the left. Seed field gone |
| 7    | `--click "Method" --click "Force, flat"`               | 07.png     | An even disk of nodes filling the canvas, long crossing edges, no groups; Seed 1                                                                                     |
| 8    | `--click "Method" --click "No crossings"`              | 08.png     | Nothing changed: Method still "Force, flat". A close button ("x") pokes out to the right of the popover at about 852,811                                             |
| 9    | `--wait 3000`                                          | 09.png     | Same drawing; the stray "x" is gone, so the hidden notice closed on its own                                                                                          |
| 10   | `--click "Method" --click "No crossings" --key Escape` | 10.png     | With the popover closed the notice reads "The layout could not be changed", with no reason                                                                           |
| 11   | `--click "Layout" --click "Method" --click "Circle"`   | 11.png     | Not a ring: nodes scattered through a disk with sizes varying by depth (the 3D view lays a circle out on a sphere); no groups                                        |
| 12   | `--click "Method" --click "Force - Recommended"`       | 12.png     | Exactly the drawing of 03.png: the default is reproducible with seed 1                                                                                               |

## Blockers and findings

None of these block the graded end state.

### 1. "No crossings" fails with a message nobody can read, and gives no reason (app defect)

- Evidence: 08.png (the notice's close button peeks out beside the popover), 09.png (it closed
  itself while hidden), 10.png (only after Escape: "The layout could not be changed").
- Cause, from the source: `graphty/src/workspace/layout/LayoutGroup.tsx` catches the element's
  refusal and sets that fixed notice, which is drawn under the open popover. It says nothing about
  why; the Les Miserables network cannot be drawn without crossings. If the element rejects with a
  code for that, the app should word it; if it rejects without one, the missing code is an element
  defect. The app could also leave out a method the element says cannot apply to this graph.
- Effect on the study: a participant who picks the method whose name best matches "untangle" sees
  nothing happen and no explanation. Record it as a dead end, not a participant error.

### 2. Spectral collapses the graph (element defect, in the layout it uses)

- Evidence: 06.png. Worse than the earlier pilot: about 74 nodes in one clump at the bottom right,
  partly under the toolbar, and a long arm to the top edge. Not a usable drawing, and part of it is
  hidden behind the app's own toolbar (the camera does not frame the result away from it).

### 3. "Force, flat" spreads nodes evenly and shows no clusters (element defect)

- Evidence: 07.png to 10.png. A method offered as a force layout gives an even disk that ignores
  who is tied to whom. Unchanged from the earlier pilot.

### 4. "Circle" does not draw a circle in the 3D view (app wording, minor)

- Evidence: 11.png. In 3D the element's circular layout places nodes on a sphere, so the drawing
  is a ball of dots. The app's name "Circle" (`graphty/src/workspace/layout/methods.ts`) promises
  a ring. Either the name should follow the view, or the method should say it is 2D only.

### 5. No offered method separates clusters better than the default (task wording, not blocking)

- Nothing in the list (05.png) is aimed at separating groups, and the default is the best on
  offer. The answer key already records "it did not help" as the expected answer and grades only
  the method change, so grading is not affected.

### 6. Earlier-noted app issues still present (app, minor, not on this task's path)

- 03.png, the Layout control in the bottom toolbar is a four-arrow icon with no visible label.
- 03.png, Values > Overview: "Undirected, from the file: directed 0" still reads as a garbled
  sentence, and "Edges per ..." is truncated.

## Study-tool notes

- `--click "Method"` prints `ambiguous: ... took the first` every time and works.
- The tool printed nothing about the notice in step 8; a notice that appears while covered is only
  visible in the screenshot. Graders should look for the stray close button.
- No tool defects found.
