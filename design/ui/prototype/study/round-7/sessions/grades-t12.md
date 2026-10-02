# Round 7 grades: the shortest path from Fantine to Gavroche (Les Miserables)

Task as given: "Which characters link Fantine to Gavroche through as few others as possible? Show it
in the drawing. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter."

Grading bar:

- Success: Fantine and Gavroche are selected, "Path between" opens with both filled in, its Find
  path button is pressed, and the new path's row is selected with the right panel listing its
  members in path order.
- Success with difficulty: opens "Path between" from Analyze > Shortest path (or the P key) and
  fills From and To by hand, then finds the path.
- Failure: traces the chain by eye, or reads an existing path between other characters as the
  answer.
- Known prototype limit (discounted, not held against anyone): the prototype draws every new path
  as the existing Valjean to Javert path, and fills a selection-opened "Path between" with Valjean
  and Javert. In a moderated session the facilitator would say those names stand in for the ones
  asked. The intended path itself shows those stand-in names (shots/tasks/t12/03.png and 05.png).

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | Answer |
|---|---|---|---|---|
| Screen-reader analyst (Morgan) | failure | success with difficulty | the result screen: "Path added", "1 edge, total value 17", right panel listing members in path order | none; read the stand-in result as the wrong path |
| Intelligence analyst (Marcus) | gave up | gave up | the same result screen, reached with only Gavroche selected and the stand-in ends left in place | none |
| Gephi holdout (Dr. Lindqvist) | gave up | gave up | "Path between" opened from a selection, stand-in ends filled, Find path not pressed | eyeball guess Fantine - Valjean - Gavroche, called unverified |
| Computational biologist (Dr. Chen) | failure | gave up | "Path between" from Analyze, Weight set to None, both ends empty, Find path grayed | eyeball guess Fantine - Valjean - Gavroche, called unverified |
| Curious first-timer (Elena) | gave up | gave up | "Path between" from Analyze, both ends empty, after trying the Assistant | guess "Valjean" from his size, called a guess |

Totals: 0 success, 1 success with difficulty, 0 failure, 4 gave up (5 participants). Nobody took
the intended route (select both characters, then Path between). All five found the path tool
quickly through Analyze; four of five never got a name into From or To.

## Why each grade

**Screen-reader analyst -- success with difficulty, up from their own "failure".** Morgan did
exactly the success-with-difficulty route: Analyze > Shortest path, typed "Fantine" Enter and
"Gavroche" Enter into the fields (renders 08 to 10), set Weight to None for fewest steps, pressed
Find path (render 11). The ending screen matches the intended final screen: "Path added", the
result chip, and the right panel with Size, From, To and members in path order. What she read
there was Valjean to Javert, which is the prototype's stand-in result, and that is why she called
it a failure. Under the discount rule that conclusion is a prototype effect, not a wrong reading of
the product. Two things in her session are not stand-in effects and stay as findings: no new row
appeared under Shortest paths and the existing row was not shown selected, so "where did my path
go" is a real gap in the prototype's result state; and nothing she could hear told her what the
path's middle members were.

**Intelligence analyst -- gave up, as he called it.** He found Analyze > Shortest path fast, then
could not fill From: clicking Fantine's label on the drawing did nothing, and his typed name did
not land (render 08 shows the field still empty; see the note on typing below). He then selected
Gavroche alone in the table, pressed "Path between" from the selection toolbar, got the stand-in
ends, pressed Find path and reached the result screen. This is not success with difficulty even
with the discount: he never designated Fantine anywhere, so a real build would have had From
Gavroche and To empty. He stopped with no answer.

**Gephi holdout -- gave up, as she called it.** Closest of the five to the intended route: she
found the selection toolbar's "Path between (P)" by hovering, and selected Fantine and then
Gavroche in the table. But each plain click replaced the selection (render 20 shows Selection 1),
so she never had both selected. The popover then showed the stand-in ends, which she read as the
tool ignoring her, and she quit before Find path. A facilitator's stand-in explanation would very
likely have carried her through, but she still had only one character selected. Her eyeball answer
(one character, Valjean, between them) is correct for this data, but she explicitly refused to
treat it as an answer, so this is giving up, not the eyeball failure.

**Computational biologist -- gave up, down from their own "failure".** Same reasoning as the Gephi
holdout: stopped at an empty "Path between" with Weight correctly set to None, and offered
"Fantine to Valjean to Gavroche" as "me reading a hairball, not the tool". A guess the participant
disowns is not a concluded answer, so this is giving up rather than failure. Chen never tried the
selection toolbar.

**Curious first-timer -- gave up, as she called it.** Found "Shortest path" only by guessing the
word Analyze from a "from Analyze" link, then could not fill either end by clicking, typing or the
table, tried the Assistant (off), and stopped. Her "Valjean" guess came from reading his size and
darkness as importance; she offered it only as a guess. She also would have run the weighted
default without noticing it is not "fewest steps".

## How much of this is the prototype, not the design

- **Typing a name.** The click-through tool's `--type` did not put text in the field for the
  intelligence analyst and gave "No match for """ for the first-timer; `--key` presses worked for
  the screen-reader analyst. The empty fields in two sessions are at least partly a tool limit.
  Still a real finding: the field offers no list of matching names, and the error message on a
  failed match names nothing.
- **Clicking a node on the drawing.** The drawing is not clickable by name in the prototype, so
  "click a node", the banner's own instruction, could never work. Four of five tried it first.
  Whether a real canvas click would have worked is untested here.
- **Stand-in names.** The stand-in ends and the stand-in result turned one probable success
  (Morgan) into a self-reported failure and pushed the Gephi holdout to quit. Future rounds of this
  task need either a Fantine to Gavroche result state or a facilitator line at the popover.

## Findings that survive the discount (evidence counts out of 5)

| Problem | Seen by | Severity (Nielsen 0-4) |
|---|---|---|
| The way to fill From and To is not discoverable: the banner says "Click a node or set for From", the field says "Type a name", and the selection-toolbar route is the only working one but nobody was pointed to it | 5 | 4 |
| Plain-clicking a second row in the table replaces the selection; nothing says how to select two | 1 (the only one who tried) | 3 |
| Opening "Path between" from Analyze closes the node table, so the table cannot be used to pick ends | 3 (biologist, first-timer, Gephi holdout) | 2 |
| The default Weight is the loaded weight read as 1/value; "as few others as possible" needs None, and None does not say "count steps"; the first-timer would have run the weighted path unknowingly | 5 noticed the mismatch or its cause; 1 would have missed it | 3 |
| A finished path is not visible in the drawing (PageRank color sits above it; "Covered for Color by PageRank") | 3 (biologist, first-timer, intelligence analyst) | 3 |
| Selecting the "Shortest paths" group row, or a path's "from Shortest paths" link, shows Louvain in the right panel | 4 (all but Gephi holdout) | 3 |
| After Find path, no new row appears in the list, so the result cannot be found again | 1 (screen-reader analyst) | 2, possibly a prototype gap |
| "Made with: All at their defaults" does not say which weight was used | 1 (Gephi holdout) | 1 |
