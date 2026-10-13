**DRAFT -- not frozen.** Success paths are written against the panel as designed in `design.md` and
built through iteration 3; they are rewritten from the pilots of the build the owner approves.
Every value marked "record on the frozen build" is read there before any session.

# Tier 3 answer key -- GRADERS ONLY

Participants never see this file. Tasks: `tasks.md`. Bars: `criteria.md`. Grading follows tier 2
(`../tier2/answers.md`, its opening sections): S, SD, F, G; an answer counts only when it was on
screen first; graded from the last screenshot, the downloads, the transcript and the scripted
style-tree dump at the session's start and end, never from a self-rating.

**Where the values come from.** The counts below were taken from the study files and the sample
files (`graphty/public/samples/*.gml`, `tool/files/`) by counting ties and names, not from the app.
Before round 1 each is read again from the frozen build through graphty-element (a probe through
its public API) and from the pilots' screens; where they differ, the build's value is the key's and
the difference is a finding. Values that depend on a run's output (community sizes, re-run groups)
are only recorded on the frozen build.

**A look counts by the tree, not only the picture.** Where two layer stacks draw the same picture,
the grade says which stacks are S, which are SD and which are F. The rule throughout: the look the
prompt asks for is on the canvas, every other element is drawn as it was at the start (bar 2), and
the participant's answer to the question matches the screen.

## Facts no briefing may hold

What a task asks a participant to find. `real.mjs --brief` refuses a briefing that holds one;
`--leaks` voids a session whose briefing does.

- `Mme Magloire`, `Mme Thenardier`, `Mme Hucheloup` -- names in T29 A's answer
- `GAL80`, `GAL10` -- names in T29 B's answer
- `Valjean`, `Gavroche` -- the top of T32 A's answer (Valjean also appears in no prompt)

## Reference values

| What                                                      | Value                                                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Les Miserables                                            | 77 characters, 254 ties                                                                               |
| Les Miserables, characters with 10 or more neighbors      | 22                                                                                                    |
| Les Miserables, the five with the most neighbors          | Valjean 36, Gavroche 22, Marius 19, Javert 17, Thenardier 16 (next: Fantine and Enjolras, 15)         |
| Les Miserables, names holding "Mme"                       | 6: Mme Magloire, Mme de R, Mme Thenardier, Mme Burgon, Mme Pontmercy, Mme Hucheloup                   |
| Les Miserables, names holding "Mlle"                      | 3: Mlle Baptistine, Mlle Gillenormand, Mlle Vaubois                                                   |
| Zachary's karate club                                     | 34 members (ids 1 to 34), 78 ties                                                                     |
| Karate, odd-numbered members                              | 17                                                                                                    |
| Karate, members with 6 or more neighbors                  | 7 (34, 1, 33, 3, 2, 4, 32)                                                                            |
| Karate, the five with the most neighbors                  | 34 (17), 1 (16), 33 (12), 3 (10), 2 (9); next 4 and 32 at 6                                           |
| College football                                          | 115 teams (ids 0 to 114), 613 ties, conference numbers 0 to 11 in the `value` column                  |
| Football, odd-numbered teams                              | 57                                                                                                    |
| Football, Florida State's conference                      | value 0, 9 teams                                                                                      |
| Football, conference sizes                                | 0:9, 1:8, 2:11, 3:12, 4:10, 5:5, 6:13, 7:8, 8:10, 9:12, 10:7, 11:10                                   |
| Florentine families, Strozzi to Pazzi                     | Strozzi, Ridolfi, Medici, Salviati, Pazzi: 4 marriages, the only chain of that length (tier 2, T18 B) |
| Running club, Chloe to Milo                               | Chloe, Ava, Ivan, Kofi, Milo: 4 ties, the only chain of that length (tier 2, T18 A)                   |
| Yeast genes                                               | 331 genes, 361 interactions (direction dropped, one repeat merged)                                    |
| Yeast, names beginning with GAL                           | 8: GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80 (no other name holds GAL)                        |
| Yeast, `gal1RGexp`                                        | -2.426 to 2.058; 167 genes below 0; no missing values                                                 |
| Les Miserables, Louvain circles; Javert's circle and size | record on the frozen build (the run's grouping, and whether it is the same on every run)              |
| Karate, Louvain groups; member 34's group                 | record on the frozen build                                                                            |

## T25. Each group its own color, one group in red

- **Success (S):** every circle (A) or conference (B) drawn in its own color, each element of the
  named one bright red (any red a reader would call bright red) and every other group still in its
  own, distinct color; the count named is the group's size on screen (A: record on the frozen
  build; B: 9).
- **Stacks that count:**
    - S: the group's color as an entry of the group color's category list (the red chit on that
      group's row), or a new layer above whose rule picks that group ("New layer for <value>", or a
      rule written by hand) and sets Color red. Both are ordinary layers; record which.
    - SD: the same end after a detour (a wrong group recolored first, then fixed).
    - F: the palette changed so that the group happens to be red while others changed too; the named
      group's members painted by a fixed list of names typed or clicked one by one where the list
      misses members; any other group's color changed by the act.
- **Success path (A), as built through iteration 3:** Analyze, run community detection (Louvain);
  the run lands on top as a layer (named "Communities" in iteration 3) whose node color varies by
  community, each community its own color. Open the color's category popover from its value pill;
  find the row that holds Javert (the Values tab's group list selects a group on the canvas; or
  click Javert on the canvas and read his community in the inspector); set that row's chit to red.
  The count is on the row. Steps: record on the frozen build.
- **Success path (B):** Add layer on nodes (or Everything), Color, vary by `value`, "One color per
  value" (a categorical palette in iteration 4); in the category popover, the row for 0 (Florida
  State's, read from its inspector), chit to red; count 9 on the row.
- **Traps to recognize:** in iteration 3 a number column colored "One color per value" drew twelve
  oranges (fixed in iteration 4); a participant who reads two oranges as one conference is not at
  fault. Football names are written without spaces ("FloridaState").

## T26. Pale to dark by how connected

- **Success (S):** node color driven by each node's number of neighbors, from a pale color at the
  fewest to a dark one at the most, with every node at or above the cap (A 10, B 6) at the darkest
  color, and the answer A 22, B 7.
- **What counts as the cap:** the ramp's top end set at 10 (A) or 6 (B), or a clamp at that value;
  either draws every node at or above it fully dark. A top end that is reached only by the maximum
  (36, 17) is F. A stepped ramp whose top step starts at the cap is S.
- **Success path (A):** Analyze, Degree; the run's layer ("Connections") colors nodes by degree with
  a sequential ramp. Open the ramp popover from the color's pill; drag (or type) the top handle to
  10; the histogram counts the nodes at the top. Count 22 from the histogram, the Values tab, or a
  rule. Steps: record on the frozen build.
- **Traps:** iteration 3's start handle could not step back after one step (fixed in iteration 4).
  A participant who sizes rather than colors is F for the color, recorded as a wording slip.

## T27. The chain that stands out

- **Success (S):** the chain's nodes and edges orange, its edges wider than every other edge, every
  other node and edge drawn as at the start; the chain is the one in the reference table.
- **Stacks that count:** the route's own layer edited (color and width set on it), or a new layer
  whose rule picks the chain. Both S.
- **F:** orange on the whole graph's edges; the run's black left and orange added to only nodes or
  only edges; any other node or edge changed.
- **Success path (A):** `p` (or Analyze, Shortest path), From Strozzi, To Pazzi, Find path; the
  route's layer lands on top (one row, nodes and edges). In its Style tab: node Color orange, edge
  Color orange, edge Width larger than the graph's. Steps: record on the frozen build.

## T28. Every odd number

- **Success (S):** exactly the odd-numbered nodes green (A 17, B 57), every other node as at the
  start, and that count named.
- **Stacks that count:** a layer whose rule reads the id (iteration 3: `Node id` / `matches
pattern` / `[13579]$`, or any equivalent pattern), Color green. SD: the right set reached by a
  longer route (a selection of the odd nodes clicked by hand, made into a layer, where the count
  is right). F: the wrong set, or a hand selection that misses any member.
- **Success path (A):** Add layer, Nodes; Which elements, Add condition, `Id`, "matches pattern",
  `[13579]$`; the count reads 17; Done; Color green.
- **Traps:** a reader who does not know patterns has no other way to say "odd" (no remainder test,
  by decision). Record every participant who looks for one, what they typed, and where. On B, the
  team names hide the numbers; the id is a value of each team in the inspector.

## T29. Every name with some letters in it

- **Success (S):** exactly the matching nodes purple (A 6, B 8), every other node as at the start,
  and the count named.
- **Stacks that count:** a layer whose rule is name contains "Mme" (A) or name starts with (or
  contains, or matches `^GAL`) "GAL" (B), from conditions or from the search offering a rule; or
  "These 6 nodes" (a fixed list) from search. All S; record which.
- **F:** a case-insensitive "mme" that also matches another name (none in Les Miserables does, so
  record it but it is not F there); a hand-picked list missing one.
- **Success path (A):** Add layer, Nodes; type "Mme" in Which elements' find; pick "Nodes where
  name contains Mme, 6 nodes"; Done; Color purple. By conditions: Add condition, `name`,
  "contains", "Mme".
- **Traps:** in Les Miserables the node id ("MmeDeR") and the name ("Mme de R") differ; find in
  iteration 3 named nodes by id.

## T30. Two looks that go together

- **Success (S):** a folder named "Women" (A) or "Shifts" (B) holds both layers; at the end both
  layers are drawn (the folder on); the transcript shows one action that switched both off and one
  that switched both on.
- **SD:** a folder made and named, but each layer switched off one at a time before the folder was
  used.
- **F:** both layers merged into one layer by rewriting a rule; layers left outside the folder;
  either layer's values changed.
- **Success path:** select both rows (Shift-click), row menu "Move to folder", new folder; or "+",
  Add folder, rename, drag each row in (or the keyboard move); the folder's eye off, then on.

## T31. A dark room

- **Success (S):** the canvas background black (or near-black); every edge light gray; with Javert
  (A) or the Medici (B) selected at the end, the selected node visibly marked against black (the
  Selected layer's look at least 3:1 against the background and against the node's own color, by
  the bar script's contrast reading).
- **Stacks that count:** edge color set on Everything, or on a layer whose rule covers every edge.
  The selection's look changed on the Selected layer. Both S. A layer that paints Javert alone is
  F for the second half (it is not "how a clicked character looks").
- **Success path:** Graph settings (no row selected), Background black. Everything, Edges, Color
  light gray. Click Javert; if the halo does not read, Selected, Effects, the halo's color to white
  or yellow.
- **Traps:** iteration 3's Selected ring barely showed on a black hub under dense edges (Valjean);
  iteration 4 changes the starting look. Record whether the participant changed the selection's
  look at all, and whether the build's starting look already passed.

## T32. Names that a room can read

- **Success (S):** every node's name (A) or number (B) drawn, at a size larger than the starting
  size (screen pixels when the label is sized in screen pixels; record the threshold on the frozen
  build), and exactly the five in the reference table bold.
- **Stacks that count:** a label on Everything (or a layer on every node) plus a layer whose rule
  is the top five by neighbors (a "Top N by" rule over the Degree run, or a rule naming the five)
  setting the label's weight bold. S either way; record which.
- **Success path (A):** Everything, Nodes, Text "+", Label, source `name`; its size up. Analyze,
  Degree. Add layer, Nodes, Top 5 by Connections; Text "+", Label, Label settings, Type, weight
  bold.
- **Traps:** two labels on the same node from two layers: the upper layer's wins whole, so the
  bold layer must name the label source too, or the five lose their names. Record a participant
  who meets this; it is a design question, not their error.

## T33. Readable without color

- **Success (S):** each group (12 conferences in A, the run's circles in B) drawn in a different
  node shape, the colors unchanged.
- **Stacks that count:** Shape varied by the same value on the same layer as the color, or on a new
  layer on every node. S either way.
- **F:** one shape for everyone; shapes that repeat across groups when enough shapes exist; any
  color changed.
- **Success path (A):** the conferences' layer, Nodes, Shape, vary glyph, `value`; the shape
  scheme gives one shape per value (graphty-element's `proposeEncoding` lets a number with few
  distinct values take a shape in iteration 4).

## T34. Find the circles again, keep the red

- **Success (S):** the community run done again with a finer setting; afterwards the group holding
  Javert (A) or member 34 (B) is red, every other group in its own color, and its new size named.
- **Stacks that count:** the red follows the group by graphty-element's matching of old to new
  groups (design 1.7); S with no further act. If the matching cannot follow it, the participant
  recolors the new group: SD.
- **F:** red left on a group that no longer holds Javert, with a participant claiming it is his
  (also a false "done").
- **Values:** record on the frozen build, for the setting the success path uses.

## T35. Back to the group's own color

- **Success (S):** the Key people layer still makes those nodes bigger, writes no color, and the
  nodes show their group's color; nothing else changed.
- **Ways that count as S:** the minus at the Color row's end; the color field emptied and Enter;
  Delete or Backspace on the focused color field. Record which.
- **SD:** the layer's color removed after a detour that changed nothing in the end (the layer hidden
  and shown again, a value tried and undone).
- **F:** the Key people layer deleted or hidden (the size is lost); its color set to some group's
  color (only one group would match); a new layer of the groups' colors added on top (the work is
  doubled, and the old orange still sits in the stack); the groups' layer moved above Key people
  (the groups would then cover nothing the prompt asked, but Key people still writes orange: F by
  the tree, SD only if the participant names the order as the reason and the tree shows Key
  people's color unset -- it will not).
- **Success path:** select the Key people row; Nodes, Color shows orange with a minus at its end
  whose tooltip names what comes back ("back to the groups' colors, from Communities"); press it.
  One step after selecting the row.
- **Traps:** the dimmed painted-over value (iteration 4) applies to layers beneath, not this one.

## T36. The expression figure

- **Success (S):** node color driven by `gal1RGexp` through a diverging blue-white-red palette whose
  middle is at 0 (the key shows white at 0, blue below, red above), every gene colored, and the
  key on screen.
- **SD:** a diverging palette centered on the data's middle (about -0.18) rather than 0, corrected
  after the participant read the key.
- **F:** a sequential palette; a diverging palette centered off 0 at the end; colors swapped
  (red for down).
- **Success path:** Everything (or a new layer on nodes), Color, vary glyph, `gal1RGexp`; in the
  ramp popover, a diverging palette (blue to red), the midpoint handle at 0.
