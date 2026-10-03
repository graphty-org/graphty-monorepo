# Round 8 grades: make the important characters' dots bigger, leave the colors alone

The task: a first-time user opens the Les Miserables sample, which arrives with its nodes already
colored by PageRank. They are asked to make the drawing show which characters the network depends
on most -- the more it depends on a character, the bigger the dot -- and to leave the colors as
they are. The wording names no measure, so any ranking result or numeric attribute counts.

What counts as success: on the PageRank row (or Everything), the participant adds a Size line
(the "+" beside Shape, then Size), opens the Size line's bind icon ("Size by attribute"), and picks
a ranking result or a number such as degree, so the dots would grow with the value while the color
stays PageRank's. Success with difficulty is reaching the same binding through the Binding popover,
a row's Data tab, after first changing the color, or on a row that does not paint by itself (one
that covers only some characters, or one that is hidden) and then fixing that. Failure is one
fixed size for everyone, changing the color instead, or stopping at an unbound Size line.

The designed path is: the start screen -> the sample at rest -> the PageRank row's Style tab ->
the "Size by attribute" list.

## Read this before the tally

**The skeleton never applies a size binding on the Les Miserables sample.** Picking a source in
the "Size by attribute" list re-titles the popover ("Size by PageRank") and nothing else: the dots
do not change, the Size line goes back to reading "1" when the popover closes, reopening it shows
"Pick an attribute" again, and the legend over the canvas never mentions size. The picker in
app-b/sections/style-pickers.js commits a pick only in the loaded-project datasets (wide, nested,
plain JSON); the Les Miserables sample is left a picture. The spec says the opposite: every
change applies live, and a bound Size line shows its range ("0.5 to 6 px").

So eleven of the twelve participants reached the right control, ten of them made a pick that
satisfies the task, and every one of them watched the drawing ignore it. Every participant rated
the task a failure or gave up, and every one of those ratings traces to the missing redraw. The
grades below follow the grading instruction for this task: grade the walk, not the rendering the
skeleton could not do. Both counts are given so the round is not read as a pass.

A second smaller artifact sits on the same screen: after "Show Betweenness" the Betweenness row
still reads "Paints 77 nodes, none visible". The eye in the list does open, so the text is stale,
not the row.

## Grades

| Participant | Their rating | Grade (walk) | Why |
|---|---|---|---|
| Explorer Elena | gave up | **success with difficulty** | On the PageRank row: clicked the word Shape (no response), found the "+" by hovering ("Add to Shape"), added Size, found "Size by attribute" only by resting on the icon after about a dozen tries, picked PageRank under Results (render 17 shows "Size by PageRank" over the PageRank row's Size line). Later re-picked degree. Gave up only because the dots never changed. |
| Recipe recipient | gave up | **gave up** | Clicked the word Shape, never found the "+" (his hover landed on the heading, which has no tooltip), then clicked something answering to "Size" that cleared the selection and swapped the right panel to the graph summary. Stopped there, before any Size line existed. |
| Alert reviewer | failure | **success with difficulty** | On the PageRank row: Shape heading, then "+", Size, a long hover search, "Size by attribute", PageRank under Results. Closed by Escape and then by the X; saw Size read 1. Then bound size to betweenness on the hidden Betweenness row without showing it. Her binding on the PageRank row is the designed result; the later attempt on a hidden row adds nothing and, in the design, takes nothing away. |
| Class-project student | gave up | **success with difficulty** | On the hidden Betweenness row: Shape heading, "+", Size, about 15 hover probes, "Size by attribute", betweenness. Then showed the row and redid the binding with the row on (render 21), which in the design paints sizes while PageRank still covers color. Then reran Betweenness from Analyze and got a second, spinning "Betweenness 2" row. |
| Nonprofit operations analyst | gave up | **success with difficulty** | On the PageRank row: Shape heading, "+", Size, a wrong click on "column" that opened the table and lost her place, hover search, "Size by attribute", PageRank. Reopened the list and found it reset; went to Analyze looking for an explanation and stopped. |
| Data journalist | gave up | **failure** | On the Betweenness row: added a Size line, showed the row, but never found the bind icon -- every hover probe missed it, and clicking "Size" put the cursor in the number box. Ended on a shown Betweenness row with Size 1 and no binding (render 16), concluding "I could not make Size follow Betweenness". That is the "stops at an unbound Size line" failure. |
| Genomics Cytoscape user | gave up | **success with difficulty** | Wrong turns first: Analyze > Degree, whose Style tab claimed "Size 0.5 to 3" while dots were uniform, and clicking that value opened "Color by PageRank". Then on the PageRank row: "+", Size, hover search, "Size by attribute", degree. The exact designed path with degree as the source. |
| Cytoscape holdout | gave up | **success with difficulty** | On the hidden Betweenness row: a click on "Size" cleared her selection; then "+", Size, hover search, "Size by attribute", betweenness; then showed the row. Bound with the row shown in her next pass. Then reran Betweenness from Analyze and stopped on the duplicate spinning row. |
| Gephi holdout | gave up | **success with difficulty** | On the Betweenness row: four dead ends (Shape heading, unnamed icon, number box, the row's color swatch opening "Color by PageRank" and switching the panel to PageRank), an Analyze rerun, then a brute-force search named the icon. Final pass: row shown first, then Size by betweenness (render 22). Valid in the design. |
| Analyst Alex | gave up | **success with difficulty** | On the Betweenness row: "+", Size, hover search (one wrong click into the table), "Size by attribute", betweenness, Escape; showed the row; rebound with the row shown and closed with the X. Then reran Betweenness from Analyze and stopped on the spinner. |
| Marketing analyst | gave up | **success with difficulty** | Bound betweenness on the Betweenness row, showed it, rebound with the row shown; reran Betweenness in Analyze; finally added Size on the PageRank row and bound it to betweenness -- the designed path exactly. |
| Screen-reader analyst | failure | **success with difficulty** | On the Betweenness row: a guess at "Size" cleared the selection and moved focus to the graph summary ("Bring it back" recovered it); then the named "Add to Shape", Size, the icon heard as "Size by attribute", betweenness, Close, then "Show Betweenness". In the design that order paints sizes. Stopped because nothing she could read said size was bound, and the moderator told her the dots had not changed. |

**Tally by walk: 0 success, 10 success with difficulty, 1 failure, 1 gave up (12 sessions).**

**Tally by what the screen showed at the end: 0 of 12 saw a single dot change size.**

Mean Single Ease Question: 2.0 of 7 (all twelve gave 2).

No one changed a color, and no one set a fixed size thinking it answered the task: all eleven
who reached a Size line read "1" as "the same for everyone" at once.

Grading calls, labeled as studio decisions:

- A binding made on the Betweenness row and followed (or preceded) by "Show Betweenness" is
  graded success with difficulty. The rubric names the PageRank row and Everything, but the
  Betweenness row says "Covered by PageRank for Color on 77 of 77", so once shown it paints size
  and leaves the PageRank color on top. That is the rubric's "row that does not paint by itself,
  fixed" case. Reason: it produces the asked-for picture in the design.
- Every success here is "with difficulty", not plain success, because every participant needed a
  hover to learn the bind icon's name and every one first clicked the Shape heading. Much of the
  hover search is the study tool needing a name before it can point at something; a person would
  have rested the pointer on the icon once. The grade stands either way: the rubric counts a hover
  as help.

## What the sessions show

Counts are out of 12. Nielsen severity: 0 not a problem, 1 cosmetic, 2 minor, 3 major,
4 catastrophe. Findings caused by the skeleton rather than the design are marked as such and
carry no severity.

### Skeleton defects to fix before this task is run again

- **A size pick on the sample does nothing (12 of 12 affected; 11 of 11 who reached the list
  concluded it did not take).** No redraw, the line reverts to "1", the list resets, no size
  legend. This is what ended ten of the twelve sessions. Until the Les Miserables sample commits a
  Color or Size pick the way the loaded datasets do, this task cannot measure anything after the
  pick, and the at-a-glance outcome will keep reading as total failure.
- **"none visible" stays after the row is shown (7 of 12 saw it).** Class-project student,
  journalist, Cytoscape holdout, Gephi holdout, Alex, marketing analyst, screen-reader analyst.
  Several took it as proof their change could not show.
- **"Betweenness 2" spins forever after a run promised "Under a second" (6 of 12).** The spinner
  is a static render; the finding about a second row is below.

### What the design itself got wrong

- **The Shape heading looks like the way in and does nothing (12 of 12 clicked it; severity 3).**
  Everyone looked for "Size" first, guessed it lived under Shape, clicked the word, and got no
  response. Only the "+" beside it opens Shape / Size. The recipe recipient never got past this.
  "Size is under Shape" itself drew complaints from the Gephi, Cytoscape and Alex sessions (3 of
  12), who expect Size as its own property.
- **A bound value gives no readable trace (11 of 11 who bound; severity 3, partly an artifact).**
  Even with the redraw fixed, the screen-reader analyst's point stands: the line must say what
  size now comes from ("Size, PageRank, 0.5 to 3 px") and the legend over the canvas should name
  size as well as color. The spec covers the line; whether the legend lists size is not settled.
  The popover has no Apply, so 9 of 12 closed it twice, once by Escape and once by the X, unsure
  which one keeps the choice.
- **"Attribute" is not the participants' word (5 of 12 said so; severity 2).** Nonprofit analyst,
  alert reviewer, Cytoscape holdout and marketing analyst would say "column"; the Cytoscape holdout
  noticed the app's own bottom bar says "Columns". The screen-reader analyst noted "attribute" is
  odd for a computed measure. (Whether the bind icon shows at rest is a decided change the
  skeleton does not draw, and this task does not test it.)
- **The Binding popover is dense with unexplained terms (7 of 12; severity 2).** Clamp, Below 0,
  Percentiles, Typed, Smallest mark / print, Detach. Three ideas of size in one box -- "1", "0.5
  to 3 px" and "Smallest mark 2 px" -- confused Alex and the screen-reader analyst; the Gephi
  holdout said 3 px for the most central character would be invisible on a projector.
- **Clicking a value on one row opens another row's binding (2 of 12; severity 3).** The Gephi
  holdout clicked the Betweenness row's color swatch and got "Color by PageRank" with the
  inspector switched to PageRank; the genomics user clicked "0.5 to 3" on the Degree panel and got
  the same. Both said "that is not what I clicked". This matches the reference render of the bind
  route, which shows "Color by attribute" over the Everything row when loaded directly.
- **Two betweenness sources with no stated relation (5 of 12; severity 2).** The row is
  "Betweenness, Measure from Analyze", but the list offers lowercase "betweenness" under the
  node's attributes and only PageRank under Results. Alex, marketing analyst, screen-reader
  analyst, Gephi and Cytoscape holdouts asked whether they are the same numbers; the screen-reader
  analyst also could not learn whether it is normalized or weighted.
- **Rerunning a measure that already exists makes a silent copy (6 of 12; severity 2).** Analyze
  gave "Betweenness 2" without saying a Betweenness row already existed, and selecting the new row
  left the right panel on the graph summary.
- **A guess at "Size" cleared the selection and swapped the right panel (4 of 12; severity 2,
  possibly a tool artifact).** Recipe recipient, journalist, Cytoscape holdout, screen-reader
  analyst. The tool may have clicked empty canvas; whatever was hit, the jump to the graph summary
  felt like losing their place. "Bring it back" was noticed and valued by the screen-reader
  analyst.
- **Which measure means "depends on" is left to the reader (no severity; a content point).** Seven
  chose betweenness, four PageRank, one degree. The Analyze list's one-line definitions were where
  most of them decided; nothing on the Style tab or in the attribute list explains a measure.
  Explorer Elena's plain-words search ("depends on most") in Analyze returned no match.

### What worked

- **Analyze's one-line definitions (7 of 12 praised them).** "Which nodes sit on the most shortest
  paths between others" is what turned the journalist, student, Alex, marketing analyst and both
  holdouts toward betweenness; the weight note ("reads a weight as distance: it uses 1/value") was
  called better than Gephi and NetworkX by three.
- **"Covered by PageRank for Color" (3 of 12 read it correctly as "your colors are safe").** The
  journalist, the Cytoscape holdout and Alex took it that way; the alert reviewer and the student
  feared "Move above" would repaint, so the line reassures experts more than first-timers.
- **The attribute list itself.** Typed, grouped, unsuitable values listed and explained ("Not a
  number"). The Cytoscape holdout and the genomics user called it a better mapping picker than
  Cytoscape's.
- **Named controls for keyboard and screen reader.** "Add to Shape", "Size by attribute", "Remove
  Size", "Show Betweenness" were all announced, and focus returned to the opener after the popover
  closed.

## Recommendation

Fix the two stale renders (commit and redraw a Color or Size pick on the sample, refresh the
Paints line after Show), then run this task again with a fresh set of sessions. As it stands the
round shows the path is findable -- 11 of 12 reached the right list, 10 of 12 made a valid pick --
but says nothing about whether people would recognize the result, because nobody ever saw one.
