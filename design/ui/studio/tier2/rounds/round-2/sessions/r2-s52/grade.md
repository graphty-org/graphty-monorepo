# Grade: session r2-s52 -- Ruth (returning reporter) reads the Station-Stadium bus link and makes its two stops stand out (T24 B, bus-stops.csv)

**Grade: SD** (success with difficulty).

- **The number is right and was read from the screen.** Her second click on the line (763,141;
  the tool printed `edge with id "15"`) opened the edge inspector "Station -> Stadium", subtitle
  "Edge", From Station, To Stadium, minutes 4, the line drawn with a blue band and the Selection
  row at 1 (`03.png`). Ruth answered 4 minutes, the answer key's value.
- **Why SD, not S.** Her first click aimed at the middle of the line (751,168) landed on the top
  edge of the white "Stadium" label and selected the stop Stadium instead (`02.png`; the tool
  printed `node "Stadium"`). This is the point the answer key names as one that "picks Stadium
  instead" on a build where names take clicks. The key grades success "right after a detour (a
  missed click on the line)" as SD. She recognized the miss herself and aimed nearer Station.
- **Station and Stadium, and no other stop, stand out at the end.** She took the key's path to the
  selection ("Edge actions", "Select endpoints"; `04.png`, `05.png`): exactly the two ringed in
  yellow, "2 nodes selected", Nodes 2, "Edges joining these nodes 1", Selection row 2. She then
  gave the selection a Fill color (selection Style tab, "Add to Fill", "Color"; `06.png` to
  `08.png`) and clicked empty canvas to check it held (`09.png`).
- **The end state is a color, not a selection.** On the last screen nothing is selected, which
  read literally against the key's S line ("exactly the two ends selected") would be "fewer than
  the two". But the key grades other routes by their end state, and the task asks only that the
  two "stand out". On `09.png` Station and Stadium are the only blue-purple stops; every other stop
  keeps the PageRank orange, the left list has a "2 nodes" layer and the key reads "Color: 2
  nodes". That separates exactly the two and survives a click elsewhere. Graded the same way as
  the other round 2 sessions that ended on this state after reaching the selection (`../r2-s51/grade.md`,
  `../r2-s54/grade.md`) and round 1's r1-s51.

Run: build `8f0d5a6f7791 graphty@0.8.61` (`session.json`), the frozen build the criteria name, no
uncommitted changes, 1440 x 900. The setup `bus-stops-ranked-names.txt` ran to its end (`01.png`;
`setup.log` shows the file chosen). Every step's screenshot matches its command and the tool's
report of what was hit. Not void.

## What the last screen shows (`09.png`)

- Station and Stadium drawn blue-purple; the other eight stops in the PageRank shading (Harbor
  darkest and largest).
- Left list: Selection (no count), "2 nodes", PageRank 10, Everything.
- Key at the top left: "Color: 2 nodes" with a purple square, then "Size: PageRank" and "Color:
  PageRank", both 0.04282 to 0.3273. The taller key box covers the top of the "Depot" label; the
  word still reads.
- Right panel on the graph Overview: Nodes 10, Edges 17, Directed, Density 0.1889, Components 1.
- `work.json`: the PageRank run and every starting layer still there, plus one new layer
  `nodes_1 2 nodes`; nothing gone.

## Claims

- "So the link takes 4 minutes" (`03.png`): true, the inspector reads minutes 4.
- "Glow gone, Station and Stadium still blue, the other eight stops orange ... Done" (`09.png`):
  true.
- "10 nodes, 17 edges -- matches the colleague's 10 stops and 17 links" (`09.png`): true.
- **False "done" claims: 0.**

## Wrong turns: 1

- The first line click (751,168) selected the stop Stadium instead of the line (`02.png`).
  Recovered in one move.

## Measures

- **Clicked the line itself:** yes; 2 tries. The first hit the "Stadium" label's top edge, the
  second (763,141, on the plainly visible part near Station) hit the line.
- **How she got from "the two on this link" to "Select endpoints":** she opened the three-dot
  button at the top right of the inspector to "see what it offers", and read "endpoints" as "the
  two stops at the ends of this link" (`04.png`).
- Steps: 8 (key's success path: 4). Ease (self-rated, not used in grading): 6 of 7.
- Did not read the tie as running to another stop. She noticed the arrow and wondered whether a
  Stadium -> Station link with another time exists; there is none (the key's find-box route for
  "Stadium" lists only School -> Stadium, Stadium -> Harbor and Station -> Stadium), and she did
  not act on the doubt, so no wrong conclusion.

## Problems

| # | Severity | Problem | Evidence |
|---|----------|---------|----------|
| 1 | 2 | The middle of a short line is covered by its end's name: a click aimed at the Station-Stadium line's middle lands on the white "Stadium" label and selects the stop. Nothing on the line (no hover change, no tooltip) tells the user before the click whether they are on the line or the label. Seen on this build in the key's own pilot point (752,170) and here; a build-side cause (label hit area over the line), repeatable at that point. | `02.png`; tool output `node "Stadium"` at 751,168; answer key T24 B success path note. |
| 2 | 2 | The style layer made from a selection is named only "2 nodes", in the left list and on the key ("Color: 2 nodes"). A reader of the key alone cannot tell which two stops are marked or why. Also seen in r2-s54 (Dana). | `08.png`, `09.png`; wrap-up: "a reader of the key alone could not; I want names." |
| 3 | 1 | After "Select endpoints" the yellow ring looks like a temporary mark, and nothing suggests how to make it lasting; Ruth had to find Style, "+", Color herself. Opinion plus 4 extra steps that did not hurt the outcome; held one level down. Also seen in r2-s54. | `05.png`; transcript at step 5: "a glow from selecting goes away the moment I click anything else". |
| 4 | 1 | "Select endpoints" is a technical word; she guessed it right and suggested "Select both stops". Opinion only; held one level down. Also seen in r2-s54. | `04.png`; wrap-up second bullet. |
| 5 | 1 | When the key gains a row its box covers the top of the "Depot" label. The word still reads. Also seen in r2-s54. | `08.png`, `09.png` (compare `03.png`, where "Depot" is clear). |
| 6 | 0 | The tie's title arrow ("Station -> Stadium") made her wonder whether the reverse link has its own time. It is the file's column order, which the key records as known on this build; she drew no wrong conclusion. | Wrap-up last bullet. |

No severity 3 or 4 problem in this session.

## What kind of problems these are

Problems 1, 2 and 5 are flaws in how the build behaves or draws (a hit area, a default layer name,
an overlapping box), not findings about what a reporter needs. Problem 1 is the one that decided
the grade (SD instead of S). Problems 3 and 4 are wording and guidance; problem 6 is the one
observation about need: a reporter who will print a number wants to know whether the link has a
direction that matters.

## Notes for the round

- The third T24 session to end on a lasting color layer instead of a selection after reaching the
  selection first. The answer key's S wording (a selection) does not name this end state; the
  task's "stand out" covers it, and every grade so far has counted it.
- The simulated participant is told she has used the program before; her history names nothing on
  this path, and she was no faster than a new user on the edge menu.
