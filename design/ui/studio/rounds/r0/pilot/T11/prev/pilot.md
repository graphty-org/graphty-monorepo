# Pilot: T11, untangle the drawing

The pilot walked the task "try a different way of arranging the dots so the clusters of characters
are easier to tell apart, and tell us whether it helped" on the real graphty app (graphty 0.8.53,
commit 9d6598ee, build 9d6598eea3e9), starting from an empty app, with the study tool
`tool/real.mjs`. The screenshots are in this folder. No script errors, console errors or failed
requests were printed at any step.

## Verdict

The graded end state is reached: a different layout method was applied and the node positions
changed visibly (03.png to 06.png with Spectral, and again to 08.png with "Force, flat"). The
answer key's 3-step path works as written: open the sample, `--click "Layout"`, pick another
method.

The answer to "did it help" is "no" on this build, which the answer key already expects. Every
alternative tried is worse than the default drawing, and one of them ("No crossings") silently
does nothing, because the message that says so is hidden behind the Layout popover.

## Steps

| Step | Command | Screenshot | What it shows |
| ---- | ------- | ---------- | ------------- |
| 1 | `--start ... empty` | 01.png | Start screen; Les Miserables under Samples, "77 characters"; usage-data notice |
| 2 | `--click "No thanks"` | 02.png | Notice dismissed |
| 3 | `--click "Les Miserables"` | 03.png | The default "Force - Recommended" drawing; visible groups (top-left knot, right-hand group, a fan of leaves at the bottom) |
| 4 | `--click "Layout"` | 04.png | Layout popover above the bottom toolbar: Method "Force - Recommended", Seed 1 |
| 5 | `--click "Method"` | 05.png | Method list: Force - Recommended, Force flat, Circle, Grid, Spiral, Spectral, No crossings, Random, Keep positions |
| 6 | `--click "Spectral"` | 06.png | Graph collapsed into an L: about 70 nodes in one clump top left, a short chain to the right, a long chain down to one node at the bottom canvas edge beside the toolbar. The Seed field is gone (Spectral takes none) |
| 7 | `--click "Method"` | 07.png | List reopened, Spectral checked |
| 8 | `--click "Force, flat"` | 08.png | A uniform disk of nodes, long crossing edges, no groups; Seed 1 |
| 9 | `--wait 10000` | 09.png | Identical to 08.png: the settled result |
| 10 | `--click "Method" --click "No crossings"` | 10.png | Nothing changed: Method still "Force, flat". A lone close button ("x") pokes out to the right of the popover at about 852,811 |
| 11 | `--click "Method" --click "Force - Recommended"` | 11.png | Exactly the drawing of 03.png: the default is reproducible |
| 12 | `--key Escape --hover "Layout"` | 12.png | The four-arrow toolbar icon's tooltip reads "Layout" |
| 13-15 | `--click "Layout"`, `--click "Method"`, `--click "No crossings"` (one per step) | 13.png to 15.png | Same as step 10: method stays "Force - Recommended", the same "x" appears beside the popover |

## Blockers and findings

### 1. "No crossings" fails with a message nobody can read (app defect)

- Evidence: 10.png and 15.png. Picking "No crossings" leaves the method and the drawing unchanged;
  the only sign is a close button showing past the right edge of the Layout popover.
- Cause, from the source: `graphty/src/workspace/layout/LayoutGroup.tsx` catches the element's
  refusal and sets the notice "The layout could not be changed". The notice is drawn under the open
  popover, so only its close button shows. It also gives no reason; the Les Miserables network has
  crossings that cannot be removed, so the planar arrangement cannot exist for it. If the element
  rejects with a code for that, the app should word it; if it rejects without one, the missing code
  is an element defect.
- Effect on the study: a participant who picks the method whose name best matches "untangle" sees
  nothing happen and no explanation. Record it as a dead end, not as a participant error.

### 2. Spectral still collapses the graph (element defect, in the layout package it uses)

- Evidence: 06.png. The shape changed since the earlier pilot (an L instead of a diagonal line)
  but the result is still nearly every node in one clump with a few strung out on two arms, one of
  them at the canvas edge under the toolbar. It is not a usable drawing.

### 3. "Force, flat" spreads nodes evenly and shows no clusters (element defect)

- Evidence: 08.png and 09.png (the same picture 10 seconds apart). Its seed now shows 1, like the
  default, which fixes the seed-0 oddity of the earlier pilot. The even disk is unchanged: a method
  offered as a force layout that ignores who is tied to whom.

### 4. No offered method separates clusters better than the default (task wording, not blocking)

- The prompt asks for an arrangement that makes clusters easier to tell apart; nothing in the list
  (05.png) is aimed at that, and the default is the best on offer. The answer key already records
  "it did not help" as the expected answer and grades only the method change, so grading is not
  affected.

### 5. The Layout control has no visible label (app, discoverability)

- 03.png: a four-arrow icon in the bottom toolbar; the name appears only as a tooltip (12.png).
  Record time-to-find.

### 6. Overview panel text (app, minor, not on this task's path)

- 03.png, Values > Overview: "Undirected, from the file: directed 0" still reads as a garbled
  sentence, and "Edges per ..." is truncated.

## Study-tool notes

- `--click "Method"` prints `ambiguous: ... took the first` every time and works.
- The tool printed nothing about the notice in step 10; a notice that appears and is covered is
  only visible in the screenshot. Graders should look for the stray close button.
- No tool defects found.
