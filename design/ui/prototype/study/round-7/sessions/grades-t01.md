# Round 7 grades: t01, "what did my colleague hand me?"

The task: a colleague handed over the Les Miserables co-appearance network. Before building on it,
the participant works out how many characters and connections there are, whether the network is
one connected piece, and whether anything about how it came in looks wrong.

What counts as success: the graph's own inspector (nothing selected), on its Data tab, is on
screen; the participant reports 77 nodes, 254 edges, undirected, 1 connected component and the
density or the degree range; and they either compute the four readings that start uncomputed
(Average clustering, Transitivity, Diameter, Degree assortativity -- through the graph's "..."
menu > Compute the overview, or the "4 more readings not computed" link) or say why they are not
needed. Success with difficulty is the same end after reading a ranking's inspector as the graph's,
or after two or more wrong places. Failure is reporting a ranking's or a group's numbers as the
graph's, or being unable to say whether the graph is one piece.

The designed path is: the graph at rest -> the graph's inspector, Data tab -> the graph's "..."
menu -> the inspector with all readings computed.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating. Opening the import editor ("Edit: miserables.gexf") is not counted as a wrong place:
the task asks how the data came in, and that screen answers it.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Gephi holdout | success | **success** | One click on Data put the graph's Summary on screen; reported 77 / 254 / undirected / 1 component / density 0.0868 / highest degree 36, checked them by hand, then computed the remaining readings (their last render shows all four filled in). The Table and import-editor visits were deliberate checks, not a search. |
| Expert Emma | success with difficulty | **success** | Summary on the first click, all required facts reported and verified, readings computed. She rated herself lower because the edge-weight question stayed open; that question is outside the success bar. Her last screen is the edge table, reached after the computed state. |
| Explorer Elena | success with difficulty | **success** | Summary on the first click; reported the counts, undirected, one component and density (while saying she does not know if 0.0868 is high or low). Computed the readings, then confirmed "one piece" by opening the component's 77-node table. |
| Marketing analyst | success | **gave up** (on the readings) | The counts, undirected, one component, density and degree range were all reported correctly from the right panel. But the "4 more readings" link opened a menu holding "Clear graph data", and she pressed Escape: "I'm not clicking things in a menu that also has 'Clear graph data' in it." She never computed the readings and did not say they were unneeded; she said she was afraid to. Her last screen is the import editor. |
| Screen-reader analyst | success with difficulty | **success** | Summary on the first click, all facts reported in text and checked against NetworkX, readings computed through the link and menu (run twice because the panel switch surprised her). The surprise is real, but the link and menu are the designed path, so no wrong place was visited. |
| Intelligence analyst | success with difficulty | **gave up** (on the readings) | Same as the marketing analyst: every required fact reported correctly from the graph's Data tab, then the link opened the menu, he refused "Compute the overview" because "it's in the same menu as 'Clear graph data'", and pressed Escape. Last screen is a hover tooltip on the weight value. |
| Knowledge engineer | success with difficulty | **success** | Summary on the first click, all facts reported (density checked by hand), readings computed after the link opened the menu. |

**Tally: 5 success, 0 success with difficulty, 0 failure, 2 gave up (7 sessions).**

No one read a ranking's or a group's numbers as the graph's. Two people looked at the start
screen's only count, "Paints 77 nodes", and set it aside as a statement about color, not an
inventory. Everyone found the Summary with one click on Data in the left rail, and everyone could
say the graph is one piece.

The two who gave up are not failures under the rubric: they concluded nothing wrong. They stopped
one step short because the step looked dangerous. The rubric has no slot for "right answer,
abandoned the last step", so it is recorded as giving up on that step, and the finding below
carries the weight.

## What the sessions show

Counts are out of 7.

1. **The "4 more readings not computed" link opens a menu instead of computing.** 7 of 7 clicked
   it. It switches the left panel from Data to Graph and opens the graph's "..." menu, which
   contains "Clear graph data" and has "Add node..." highlighted. 2 of 7 refused to go further
   and never got the readings; the other 5 hunted down the menu for "Compute the overview" and
   called it a detour. Nielsen severity 3 (major): it is the only step two participants could not
   finish, and it put a destructive command in front of people who were explicitly auditing, not
   editing.

   A note on the "Add node..." highlight: in the designed path's render
   (shots/tasks/t01/03.png) nothing is highlighted. In every participant render the highlight is
   there because the pointer, left where "4 more readings not computed" was clicked, lands on that
   row when the menu opens. That is a hover, not keyboard focus, so pressing Enter would not
   have added a node -- the screen-reader analyst's "focus sitting on Add node" is not what the
   render shows. But the coincidence would happen in a real browser too, so the fear it caused is
   not only an artifact. The severity rests on the link opening an unrelated menu, not on the
   highlight.

2. **The two weight readings disagree.** 7 of 7 noticed that the Summary says "Weight: value,
   stronger" while the import editor's edges table says "Weight: none (each edge counts 1)" with
   value as a plain attribute. No one could settle which is true. Several said this alone would
   keep them from trusting any weighted result. This may be a prototype inconsistency rather than
   a design decision, but participants cannot tell the difference, so it should be fixed either
   way: one place should own the weight, and the other should say where it was set. Severity 3 for
   trust, though it does not block this task's success bar.

3. **The "value, stronger" link lands on the wrong table.** 6 of 7 clicked it (all but the
   marketing analyst). It opens the import editor on the nodes table, where weight is not
   mentioned. Severity 2. The hover tooltip ("Change it on the Data page") deepened the
   contradiction for the one person who read it.

4. **The degree chart's "0 / degree 0" readout reads as noise.** 6 of 7 commented on it (all but
   the screen-reader analyst, who read the caption instead). Guesses ranged from "a typo" to "no
   isolated nodes". Severity 1 to 2.

5. **No self-loop or duplicate-edge line in the match report.** 3 of 7 (Expert Emma, the
   screen-reader analyst, the knowledge engineer) wanted it; "every edge has both ends" is not
   that check. Severity 2 for audit work.

6. **Computed columns listed beside file columns.** 4 of 7 (Gephi holdout, Expert Emma,
   marketing analyst, intelligence analyst) could not tell whether "betweenness" and "degree"
   came with the file or were computed later. Severity 2.

What worked, 7 of 7: the Data rail item as the place for counts, the Summary's labeled counts and
connected components, and the match reports' plain sentences ("every id is unique", "every edge
has both ends"). Several said these beat what Gephi or a spreadsheet gives them. Every Single Ease
rating was 5 of 7.

## Caveats

These are simulated participants. Their agreement on the weight contradiction and on the menu is
strong evidence that the screens show those things, not evidence of how often real users would
notice them. The weight contradiction may come from mock fidelity (two states built
separately), so it should be checked against the spec before it is treated as a design defect.
