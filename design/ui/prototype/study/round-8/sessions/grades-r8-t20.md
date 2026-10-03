# Grades: set aside the minor characters, then count what is left (Les Miserables)

The task asked the participant to set aside every character who shares chapters with fewer than
five others, for every count and drawing from now on, and then say how many characters are left.
The intended path is the Data place: add a step under Filters that keeps nodes with degree at
least 5, then read "41 of 77" from the step row, the inspector's "This step" line or the top-bar
chip.

Grading rules applied:

- Success: a filter step on degree at least 5 added from Filters ("+" or "Add filter step"),
  answer 41 of 77 read from the step, the inspector or the chip.
- Success with difficulty: reached the step through a column's "Filter to..." or the degree
  attribute's menu after detours, hid characters on the canvas first, or took more than two wrong
  turns.
- Failure: only hid characters on the canvas, or answered 77.
- Not graded (prototype limits): the canvas keeps drawing all 77 dots after the step, and the
  Graph place shows "Full graph" again. Recomputing the graph's readings on the filtered graph is
  not testable this round.
- A click on "degree" that opened the degree attribute's own page instead of filling the step is
  logged as a prototype defect, not a wrong turn. Grading depends only on whether the keep rule
  "degree is at least 5" was set.

## Results

| Participant | Graded outcome | Their own view | Answer | Final screen |
|---|---|---|---|---|
| Expert Emma | success | success with difficulty | 41 | Graph place, filter set (09) |
| Gephi holdout | success | success with difficulty | 41 | Data place, step "degree is at least 5 -- 41 of 77", chip "41 of 77 nodes" (11) |
| Marketing analyst | success | success with difficulty | 41 | Node table, header "41 of 77 nodes" (11) |
| Class-project student | success | success with difficulty | 41 | Data place, step and chip at 41 of 77 (08) |
| Screen-reader analyst | success | success with difficulty | 41 | Data place, step, inspector "This step: 41 of 77 nodes" and chip (07) |
| Knowledge engineer | success | success with difficulty | 41 | Node table, header "41 of 77 nodes" (10) |

Success 6 of 6. Success with difficulty 0, failure 0, gave up 0.

All six took the same route: the "Full graph" chip in the top bar, then "Add filter step", then
"By an attribute or computed value", then degree, then "is at least" 5 and Enter. All six read 41
from the step row and the chip; the screen-reader analyst also read it from the inspector's "This
step" line. No one hid characters on the canvas, no one used a column menu, and no one chose
k-core. Four of the six (the expert, the Gephi holdout, the screen-reader analyst and the knowledge
engineer) named k-core as a trap because it gives a different number, and avoided it.

Every participant rated their own result lower than the grade, and every one gave the same reason:
after the filter, the drawing, the summary panel and the Graph place still showed 77. That doubt
comes from prototype limits that are not graded. It is still the strongest signal in the round,
so it is reported below.

## Per participant

**Expert Emma -- success.** She went straight to the chip, rejected k-core on purpose, and set
degree at least 5 on her second try at the picker. The first "degree" click opened the attribute
page; this is the prototype defect. She answered 41 and checked it against the median of 6. She
then checked the summary (77 nodes) and the Graph place ("Full graph"), and stopped because she
could not tell whether the filter applied everywhere.

**Gephi holdout -- success.** Same route and the same "degree" defect. She answered 41. After
that she spent four steps on checks the prototype cannot pass: the drawing, the Graph place, the
summary and the table. She praised the "(full graph)" labels on the table columns.

**Marketing analyst -- success.** Same route and the same "degree" defect. Typing 5 changed
nothing until he pressed Enter, which cost him a moment of doubt. He answered 41 and said he
would not put it on a slide while the picture still showed 77 dots.

**Class-project student -- success.** He found the filter only by guessing that the funnel icon
meant filter, and the guess was right. Same "degree" defect. He answered 41 and said he would
trust the drawing over the count, so he would not use the figure for the assignment yet.

**Screen-reader analyst -- success.** Shortest session: she stopped at the step, with 41 of 77
shown in three places. The "degree" defect is worse for her than for the others. The two options
were announced as "degree, Nodes" and "degree, nodes", which sound the same in speech, so she had
to start over. She also reported an unnamed number box, two buttons both named "Add filter step",
and nothing announcing whether the drawing changed.

**Knowledge engineer -- success.** Same route. She used the wrong "degree" click on purpose: the
attribute page showed "imported, not computed" and a range of 1 to 36, which let her check the
column's provenance. Typing 5 without Enter left "This step: 77 of 77" with no Apply button. She
answered 41, then checked the summary and the table and found that they disagree with it.

## Findings

Each finding gives its evidence count (participants who hit it) and Nielsen severity (0 to 4).

1. **After the filter, nothing outside the Data place shows 41 -- 6 of 6, severity 4 for the
   real product (prototype limit, not graded).** All six questioned whether the filter applied
   to "every count and every drawing." The specific complaints:
   - the canvas still draws every node: 5 participants (the screen-reader analyst could not
     check it and asked how she would know)
   - the summary still reads 77 nodes, density 0.0868 and average degree 6.60, beside an active
     filter whose own text says filters change what is computed: 4
   - the chip reads "Full graph" on the Graph place: 4
   - the table header says "41 of 77" while its pager says "Rows 1 to 77 of 77": 3

   The real product must change the drawing and every count together, or label each count that
   still describes the full graph. The table columns already carry a "(full graph)" label, and
   three participants praised it.

2. **The "degree" in the open picker shares its name with the "degree" in the Attributes list,
   and a click on the visible one opens the attribute page -- 6 of 6, severity 3 (prototype
   defect, not graded).** It cost every participant one retry. The click-through tool picks the
   first match, so some of this comes from the tool. For a screen reader, though, the two names
   ("degree, Nodes" and "degree, nodes") cannot be told apart by ear, and that problem is real.
3. **The threshold does not apply until Enter is pressed, and nothing says so -- 2 of 6,
   severity 2.** The step name and "This step: 77 of 77" lag behind the box, and there is no
   Apply button.
4. **There is no way to tell whether the imported "degree" column is the true neighbor count --
   4 of 6, severity 2.** The column is listed under "Other attributes" and the tool did not
   compute it. The knowledge engineer confirmed it from the attribute page (maximum 36 matches
   the summary). The screen-reader analyst asked for a degree the tool computes itself.
5. **Two buttons are named "Add filter step" -- 2 of 6 (from the tool's warning and from the
   screen reader), severity 2.**
6. **The number box in the condition has no accessible name -- 1 of 6, severity 3 (accessibility
   blocker for screen-reader users).**
7. **Some "Keep" options have unexplained icons -- 2 of 6, severity 1.**
8. **No Filters entry in the Graph tree; the only way in is the funnel chip -- 1 of 6 commented,
   severity 1.** Every participant found the chip on the first try, so this did not block anyone.

No participant missed the file and table lines on the Data place that are set in caption gray.
All six read "miserables.gexf, 77 nodes, 254 edges" or the table lines without trouble.

## What worked (6 of 6 unless noted)

- The top-bar chip led everyone to Filters in one click.
- The empty state's sentence, "Filters change what is computed; the eye in the Graph tree only
  hides", was quoted with approval by all six.
- The default "is at least" was the right comparison, and no one had to reverse the logic.
- The step reads back in plain words: "degree is at least 5 -- 41 of 77 nodes (the full graph)".
- The k-core option sits apart from the attribute filter, and the four expert participants named
  that separation as a safeguard.
