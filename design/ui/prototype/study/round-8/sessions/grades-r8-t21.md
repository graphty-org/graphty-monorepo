# Grades: the fewest go-betweens from Fantine to Gavroche (round 8)

Task given to participants: "The Les Miserables network is open (example data, not your own).
Work out how Fantine and Gavroche are connected through the smallest number of go-betweens: say
who the go-betweens are, in order, and how many links it takes."

What counts as success: open the Path between form (Analyze > Shortest path, or by selecting the
two and using the selection bar or node menu), fill From Fantine and To Gavroche, set Weight to
None (fewest steps), run it, and read the result in the right panel: one go-between, 2 links. Three
routes tie (through Valjean, Thenardier or Javert); naming any one of them is success, and saying
that three tie is noted but not required. The success path is the open sample
(app-b/#/graph-place/at-rest), the Path between form (app-b/#/path-popover/from-analyze), the found
path (app-b/#/path-popover/found) and the path's panel (app-b/#/inspector-group-set-path-row/path-lesmis-found).

Success with difficulty: first reports the route the loaded weight gives (Valjean then Marius, 3
links) and then corrects it; reaches the form after detours; reads the go-between off the canvas
instead of the panel; or more than two wrong turns. Failure: no result, stopping at the weighted
3-link route as the fewest go-betweens, or naming the wrong go-between.

How this was graded. The weight that comes with the file ("value (set at load)") is a deliberate
trap in the task, not a defect: left alone, it answers "the lightest route", which here is 3 links.
Clicking a name on the drawing is reported by the study tool as "nothing on screen is called ..."
because the drawing's labels are not text targets in the skeleton; that is a limit of the
click-through, so it is counted as a wrong turn only when the participant then lost their way.
Clicking the "Type a name" placeholder, which did nothing, is not counted either. Each participant's
last render was checked against what they reported.

## Outcomes

| Participant | They said | Graded | Why |
|---|---|---|---|
| Dr. Mara Lindqvist, the Gephi holdout | success | **success** | One wrong turn (the Shortest paths row, which showed Louvain), then Analyze > Shortest path. Read the weight note and switched to None before filling the names. Typed Fantine and Gavroche with Enter, Find path, read "2 steps. 3 routes tie" and the panel's path order, stepped Next route twice. Answer: 2 links, one go-between, Valjean, Thenardier or Javert, read from the panel. Last render shows route 3 of 3. |
| Expert Emma | success with difficulty | **success** | Same single wrong turn (the Shortest paths row). She found Analyze by guessing its name from another panel's "Measure from Analyze" link, because her hover on the unlabeled flask could not be aimed; that is discoverability cost, not a wrong turn. Switched Weight to None unprompted, typed both names, ran it, stepped all three ties, and cross-checked against what she knows of the data. Answer correct and read from the panel. She rated herself lower because getting to the form was guesswork; the record shows one wrong turn. |
| Dr. Chen, the bioinformatics researcher | success | **success** | Shortest paths row (Louvain shown) was the one wrong turn, then Analyze > Shortest path, Weight None, both names by typing with Enter, Find path, Next route twice. Answer: 2 links, one go-between, three tied routes via Valjean, Thenardier or Javert. Read from the panel; noted the drawing was ambiguous for route 2. |
| Ruth, the data journalist | success with difficulty | **success with difficulty** | Three wrong turns before the answer: the "Find rows and notes" box (it does not find people), the Shortest paths row and its More actions menu (both headed Louvain), and in the form clicking To after typing Fantine, which silently dropped Fantine until she guessed Enter. She did catch the weight and set None before running. Answer correct (three ties, all named), from the panel. |
| Dev, the class-project student | failure | **failure** | Reached the form via one wrong turn (the Shortest paths row and its menu, both Louvain). Read the weight note, did not understand "1/value", and left Weight at the loaded value ("the defaults are probably the normal way"). Ran it and answered "Valjean, then Marius, 3 links" with confidence. Last render shows exactly that: 4 nodes, 3 edges, "3 steps. Weakest value on the path: 4", Made with "All at their defaults". That is the weighted route stated as the fewest go-betweens. |
| Morgan, the screen-reader analyst | success with difficulty | **success with difficulty** | After the Shortest paths row, three dead ends in the form: activating To left nothing to type into, Tab landed on a "To: not chosen" button that swallowed the typing, and Tab then Enter turned To into a text box but dropped Fantine without a word. Found by luck that Enter commits a name. Activating the "Weight" label did nothing; opened it by its value instead. Then None, Find path, Next route twice. Answer correct (three ties), read from the panel. Last render shows route 3 of 3 with "None: fewest steps (this run's override)". |

**Totals: 3 success, 2 success with difficulty, 1 failure, 0 gave up.**

Five of six named a correct go-between and the right length; all five also found and named all
three tied routes, though the task did not require it. Every one of the five read the answer from
the path's panel, not the drawing.

## The weight

All six read the weight note in the form. Five understood it and switched Weight to None before
ever pressing Find path, so nobody took the "report the weighted route, then correct it" path.
The sixth, the student, read the same note, could not parse "reads a weight as distance: it uses
1/value", trusted the default, and gave the weighted 3-link answer with full confidence. Nothing on
his result hinted that a shorter route exists: "3 steps" and "Made with: All at their defaults"
read as reassurance. Four of the five who caught it said unprompted that a student or a hurried
user would fall in, and one did. As a trap in the task this behaved as intended; as a design
observation, the people least able to read the note are the ones it costs.

## Problems, with counts

| Problem | Who hit it | Severity (Nielsen 0-4) |
|---|---|---|
| Selecting the "Shortest paths" group row shows Louvain in the right panel; its More actions menu is also headed Louvain, and the row offers no way to start a new path | 6 of 6 (the menu: 2) | 3 -- every participant's first move; it cost each one a wrong turn and dented trust in the panel |
| Default weight answers "lightest route", not "fewest steps"; the note explaining it is jargon to a novice | 6 of 6 saw it, 1 of 6 fell in (and failed) | 3 -- silent wrong answer for the least expert user |
| Typing a name gives no list of matches and no sign it resolved to a node; only Find path turning blue confirms | 6 of 6 remarked on it | 2 -- with Thenardier and Mme.Thenardier both present, a real risk on other data |
| A typed name not committed with Enter is silently dropped when focus moves | 2 of 6 (journalist, screen-reader analyst) | 3 -- data loss without notice; Enter was found by guessing |
| To is a "pick on the canvas" button, not a text field, from the keyboard, though its tooltip says "or type a name" | 1 of 6 (screen-reader analyst) | 3 for keyboard and screen-reader users (single voice, but a hard blocker for that group) |
| On tied route 2 the middle node (Thenardier) has no label and sits by the Javert and Mme.Thenardier labels, so the drawing suggests the wrong person | 4 of 6 noticed; none was misled because they read the panel | 2 |
| "Click a node for From" prompts and the banner speak only to pointer users | 1 of 6 (screen-reader analyst); 4 others tried clicking names on the drawing, which the click-through cannot do | 1 (mock-fidelity limit for the four; real for the keyboard user) |
| Two controls named "Shortest path" in Analyze, two named "Next route" on the result; the "Weight" label is not tied to its control | 1 of 6 (screen-reader analyst) | 2 |
| Tied routes can only be stepped one at a time; no single copyable list of all three | 1 of 6 asked for it; 2 others asked for an export of the path | 1 |

## What worked

- "2 steps. 3 routes tie" with a route stepper: every successful participant called out the tie
  report as better than their usual tool (Gephi, networkx, igraph each show one path by default).
  Ruth: "If it had only shown me Valjean I would have written 'the link is Valjean', and that would
  have been wrong."
- "None (fewest steps)" is worded so that all five who opened the menu picked it immediately.
- The result records what it was made with ("None: fewest steps (this run's override)") and the
  override is scoped to this path; four participants named that as what they would cite.
- The panel's "in path order" list with start / hop 1 / end was trusted over the drawing by all five.
