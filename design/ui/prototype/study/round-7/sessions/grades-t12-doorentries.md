# Round 7 grades: t12 on the door entries, "how are Ana Ruiz and Priya Nair linked?"

The task: in a month of a company's door swipes (412 people, 9 buildings), the participant works
out the chain that links Ana Ruiz to Priya Nair with as few go-betweens as possible, and names the
building it runs through.

What counts as success: the shortest route from Ana Ruiz to Priya Nair is worked out and its row
read: 3 nodes, 2 edges, via B1. Success with difficulty is reaching that row after first opening
Neighborhood or the table, or after weighing whether often-used buildings count as closer and
reading the Weight line before deciding. Failure is concluding the two are unconnected, or
reading the building as the destination.

The designed path is: the door-entries graph at rest -> the graph with the Ana Ruiz to Priya Nair
path drawn -> the path's own inspector, which reads "3 nodes, 2 edges", From Ana Ruiz, To Priya
Nair, Via B1.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating. As in the earlier grades of this round, a participant who gives the right answer but
stops before the tool produces it is graded "gave up", not "failure": the rubric's failure is a
wrong conclusion, and none of them concluded anything wrong.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | success with difficulty | **success with difficulty** | The only one to reach the success screen. Last render shows the path's inspector: "3 nodes, 2 edges", From Ana Ruiz, To Priya Nair, Via B1, members in order Ana Ruiz (start), B1 (hop 1), Priya Nair (end), Weight "None (this run's override)". Got there after the node table, the edge table, a failed attempt to start from the selected node, and a detour into the wrong project through Ana's note. Found by trial that the From field accepts a typed full name plus Enter. Read the Weight line and switched it to None before running, as the rubric's second route describes. |
| Intelligence analyst | success with difficulty | **gave up** | Correct answer (Ana Ruiz -> B1 -> Priya Nair), but read off the edge table, not from the path tool, which never ran. Never typed into From; concluded it could not be filled. Last render is the Les Miserables project, reached by clicking Ana's "1 note"; he stopped there ("I'm stopping here"). |
| Knowledge engineer | success with difficulty | **gave up** | Same answer, same source (the edge table). Her one typing attempt used an option the study tool does not have, so no keys reached the field: "typing does nothing" is an artifact of the session, not of the design. Last render is the Les Miserables project after "1 note"; she stopped there. |
| Expert Emma | success with difficulty | **gave up** | Same answer from the edge table, argued correctly as the minimum (two people in a person-building graph cannot be closer than one building apart). Never typed into From. Last render is the empty left search box with the edge table collapsed; she stopped there. |

**Tally: 0 success, 1 success with difficulty, 0 failure, 3 gave up (4 sessions).**

All four gave the right answer: Ana Ruiz -> B1 -> Priya Nair, one go-between, and the building is
B1. No one read B1 as the destination or concluded the two were unconnected. But only one of four
got the shortest-path tool to produce it, and every one called the tool, not the question, the
hard part. Single Ease ratings: 4, 3, 2 and 4 of 7.

## A warning about the answer source

Three of the four answers came from the edge table, and that table is very likely a prototype
artifact. It claims 1,306 edges, shows four rows sorted by count (22, 9, 6, 4), and two of the four
are exactly Ana's and Priya's entries into B1. A real table of 1,306 rows sorted by count would not
put a count-6 row in the top four. 4 of 4 noticed the four rows did not add up and said so. In the
real product these participants would have had to filter or search the table, so "the table gave
it away" should not be read as evidence that the table is an easy route. It is evidence that the
path tool lost three people who then took the only other road visible.

## What the sessions show

Counts are out of 4.

1. **The From field does not look or behave like something you can type into.** 4 of 4 clicked
   it and saw no list, no suggestions and no cursor change. Only 1 of 4 discovered that typing a
   full name and pressing Enter works, and even then "Ana" alone gave no suggestions, so the
   participant was guessing at spelling. The other three concluded the only way in was clicking an
   unlabeled dot among 421. Nielsen severity 4 (catastrophe): it is the step that stopped three of
   four from using the tool built for this task.

2. **Starting the path from a selected node does not fill From.** 3 of 4 (cybersecurity analyst,
   intelligence analyst, knowledge engineer) selected Ana from the table, then opened "Path
   between" from the selection toolbar or from Analyze, and found From still empty. All three
   called it plainly wrong. Severity 3: it removes the natural recovery from problem 1.

3. **Opening the path form switches the bottom table from Nodes to Edges and the table cannot be
   used while the form is open.** 4 of 4. The names they had just found vanished, and clicking a
   row could not set an endpoint. Severity 3.

4. **Ana's "1 note" opens a different project.** 3 of 4 clicked it (all but Expert Emma) and
   landed in Les Miserables with no warning. Two of them stopped the session there, and all three
   said it would end their trust in the tool on real case data. This is probably a gap in the
   prototype (the note's route belongs to the Les Miserables dataset) rather than a design
   decision, but it must be fixed before the next round because it ends sessions. If it were
   real, severity 4.

5. **The default weight answers a different question.** 4 of 4 read "count (loaded weight),
   Stronger ... uses 1/count" and said that would give the most-swiped route, not the fewest
   go-betweens the task asks for. All four found "None" in the list. Everyone praised the line for
   stating the transform; the problem is the default for a question phrased in hops. Here the
   answer is the same either way (one building), so the default did no harm in this task, but
   on any graph with more than one route it would silently answer the weighted question.
   Severity 2.

6. **The From and To placeholders follow focus.** 3 of 4 (Expert Emma, intelligence analyst,
   knowledge engineer) clicked To and saw the placeholders swap ("Type a name" moved to To, "Click
   to pick" to From), and could not tell which field was active or what each one wanted. The
   banner "Click a node or set for From" also mentions a "set" no one could find. Severity 2.

7. **Node toolbar and node count did help.** 3 of 4 used "Ana Ruiz, 1 connection" to reason that
   B1 is her only building, so no other route could exist. That is a good sign for the canvas
   label.

What worked, 4 of 4: "Shortest path" was found at once under Analyze, with a description that
names both readings ("the fewest steps, or the lightest route"); Direction defaulting to "Either
way" was praised by all four as the right call for a person-to-building graph, where a directed
search finds nothing; "Local only" in the top bar answered the first question three of them ask.
The one participant who reached the result said the path inspector (members in order, "Via B1",
the weight override stated) is something they would paste straight into a case.

## Caveats

These are simulated participants, and the strongest single fact in this task, that the answer was
readable from four table rows, comes from the prototype rather than the design. The study tool's
missing typing option also distorted one session. Before the next round: give the edge table
realistic contents, make Ana's note open on the door entries, and make the From field's typing
behavior visible in a render, so the next grades measure the design and not the mock.
