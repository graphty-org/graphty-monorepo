# Grades: find the groups in the Les Miserables sample and read them (round 8)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not
on your own data. Have the program pick out the circles of characters who keep turning up
together. Tell us how many circles it came up with, how big the largest one is, and which
character is at its center."

What counts as success: open the sample, open Analyze (the flask in the bottom bar), choose
Louvain or another grouping method, run it or update the existing Louvain result, and read the
answer on the run's Data tab: 6 communities, the largest with 25 characters, hub Gavroche. The
success path is the first-launch screen (app-b/#/start-screen/first-run), the opened sample
(app-b/#/graph-place/at-rest), the Analyze list (app-b/#/analyze-popover/open) and the run's Data
tab (app-b/#/inspector-run-row/data).

Success with difficulty: the same three answers read from the result already in the sample (the
Louvain row expanded in the left list, the Louvain table tab under the canvas, or the legend)
without running anything; or the success path after more than two wrong turns. Failure: a wrong
count or size, or an answer read off the colors by eye.

How this was graded. In the skeleton, "Update Louvain row" updates the existing result in place
and shows "Updated just now: 6 communities, the same as before". "Run as copy" and "Run" on a
method with no existing result only show a "Would add ..." message and add nothing; a participant
who pressed one of them hit a skeleton stop, and is graded on what they did next. Opening Analyze
by hovering the unlabeled flask to read its tooltip is how the icon is meant to be learned, and
is not counted as a wrong turn.

## Outcomes

| Participant | They said | Graded | Why |
|---|---|---|---|
| Nadia, the alert reviewer | success | **success** | Direct path: sample, Analyze, the Louvain entry described "Which nodes form densely connected groups", Update Louvain row, read 6 / Community 1 25 / hub Gavroche on the run's Data tab. Then clicked Community 1 to confirm (25 nodes, Gavroche 16 links inside). No wrong turns. |
| Grace, the nonprofit operations analyst | success with difficulty | **success** | Same direct path, ended on the run's Data tab with the "Updated just now" banner (render 07). Checked 25+17+10+10+9+6 = 77. Her difficulty was choosing among four things named Louvain, which cost a moment, not a wrong turn. |
| The class-project student | success with difficulty | **success (hedged)** | First read the answer from the existing result (Louvain table tab, Community 1, the hub link), then went to Analyze, searched "modularity", found Louvain under "Find groups", pressed Update Louvain row and ended on the run's Data tab, 6 / 25 / Gavroche. Hedged because she spent four steps on the existing result before running; none of them was wrong, and she ended where the task ends. |
| Explorer Elena | success with difficulty | **success with difficulty** | Read 6 and 25 from the Louvain table tab and Gavroche from Community 1. Tried to run it herself: Analyze, typed "groups", chose Leiden ("Start here"), Run -- a skeleton stop ("Would add Leiden..."). Fell back on the existing result. Answers right, nothing run. |
| Tom, the recipe recipient | success with difficulty | **success with difficulty** | Never looked for a way to run it. Clicked "6 groups" in the list, then the left-rail Data by mistake (a wrong turn), then the Table tab: 6, 25; Community 1: hub Gavroche. Right answers from the existing result. |
| Renata, the Cytoscape holdout | success with difficulty | **success with difficulty** | Three wrong turns (looking for "Expand", clicking "6 groups" to open the row, the left-rail Data), then Analyze, Louvain, Run as copy (skeleton stop). Read the answers from the table tab and Community 1. Right answers, nothing run. |
| Ruth, the data journalist | success with difficulty | **success with difficulty** | Analyze; "groups of characters" got no match; "group" found the family; chose Leiden, Run (skeleton stop). Then read the Louvain table tab and Community 1: 6, 25, Gavroche. About 70 percent sure, because of the file's "group 8" next to Gavroche. |
| Jordan, the marketing analyst | success with difficulty | **success with difficulty** | Read 6 and 25 from the table tab, Gavroche from Community 1; "Show in table" did not list the 25 members; Analyze, Louvain, Run as copy (skeleton stop). Answered from the existing result. |
| Expert Emma | success with difficulty | **success with difficulty** | Read the answer on the existing run's Data tab (via the Louvain row's "from Louvain, Sep 28"), including modularity 0.565 and seed 7. Pressed Rerun there; the skeleton started a "Betweenness 2" row instead (render 08). Then Analyze, Louvain, Run as copy (skeleton stop). Right answers, nothing run. |
| Joaquin, the Gene Ontology Cytoscape user | success | **success with difficulty** | Read 6 and 25 from the table tab, Gavroche from Community 1; "Show in table" lost the selection; Analyze, Louvain, Run as copy (skeleton stop). He answered from the result already in the sample, which is the with-difficulty path. |
| Marcus, the intelligence analyst | success with difficulty | **success with difficulty** | Table tab, Community 1, the hub link, then the left-rail Data by mistake, "Show in table" (lost the selection), Analyze, Louvain, Run as copy (skeleton stop). 6 / 25 / Gavroche "with doubt". |
| Min-ji, the knowledge engineer | success with difficulty | **success with difficulty** | Table tab, Community 1, Analyze, Louvain, Run as copy (skeleton stop), "Show in table" (did not filter). 6 / 25 / Gavroche; would not sign off on Gavroche without the member list. |

**Totals: 3 success (one hedged), 9 success with difficulty, 0 failure, 0 gave up.**

Every one of the twelve gave the right three answers (6, 25, Gavroche). No one read the groups
off the colors -- they could not have, because the canvas stayed colored by PageRank throughout.

Only 3 of 12 ran or updated the grouping. The other 9 read a result that was already in the
sample. Of those 9, 8 tried to run it themselves and were stopped by the skeleton: 6 pressed
"Run as copy", 2 pressed Run on Leiden. Only Tom never tried. So the low success count is mostly
the skeleton, not the design: what separated the three successes from the rest was which of the
two buttons they pressed. All three pressed "Update Louvain row" because it was the blue button,
not because they understood it; the six who pressed "Run as copy" chose it deliberately, to avoid
overwriting someone else's work (Renata, Joaquin, Marcus, Min-ji, Jordan said so in nearly the
same words). Expect most real users of a shared or sample project to choose "Run as copy", so it
needs to work and land on its Data tab the way Update does.

Joaquin rated himself higher than graded (he read an existing result). Grace and the student
rated themselves lower than graded; both ran the method and ended on the run's Data tab, and
their doubts were about the canvas and the "Group 2 / Group 8" rows, not about the answer.

Single Ease Question: 4 to 5 of 7 for everyone (median 4.5).

## Skeleton stops and defects seen

- "Run as copy" adds no row (6 participants). Known skeleton limit; graded on what came next.
- Run on Leiden adds no row (2). Same limit, on a method with no existing result.
- Rerun on the Louvain run's Data tab starts a row named "Betweenness 2" and moves the inspector
  to the whole-graph summary (Expert Emma, render 08). This is a wiring defect in the skeleton,
  not a stop: the Rerun link should rerun Louvain. She said it was "exactly the kind of thing that
  makes me close a tool".
- The kind line "Run from Louvain" without its settings: no participant commented on it. Emma
  and Joaquin found the settings elsewhere (the run's "Made with" and the Analyze Recent entry's
  "Last run: Resolution 1.0, weight value"), and both valued that provenance.
- The note badge hidden while the row is selected: no participant commented on it.

## Findings on the graded routes

Severity uses Nielsen's 0-4 scale. Counts are participants out of 12 who raised it unprompted.

1. **The canvas never shows the groups** (sample, run Data tab, community inspector). 12 of 12.
   PageRank owns color and covers Louvain on 77 of 77 nodes; running or selecting Louvain does
   not change the picture. "Covered by PageRank for Color" was read by those who saw it but
   nobody understood how to bring the groups forward. Four said this blocks the figure they
   actually need (Grace's board slide, the student's report, Nadia's alert file, Jordan's deck).
   Severity 3.

2. **The file's own "group" column and the "For the report" Group 2 / Group 8 rows look like a
   rival answer** (node table, left list). 10 of 12. The file's "group" column uses the same
   swatch colors as the communities, so Gavroche, hub of the orange Community 1, wears a blue
   "8". Only Renata and Marcus worked out (from the Data page) that "group" came with the file.
   Ruth: "exactly the kind of thing that gets a correction printed." This is the main reason
   self-confidence sat at 70 to 80 percent. Severity 3.

3. **"Run as copy" versus "Update Louvain row" is a choice about someone else's work, not about
   running** (Louvain form from Analyze). 9 of 12 hesitated or chose by risk. Nadia: "Does Update
   overwrite what somebody else made?" The student: "'row'? I just want to run it." Nothing on
   the form says what Update replaces or that the old result is kept anywhere. Severity 2.

4. **"Show in table" from a community does not list its members** (community inspector). 5 of 5
   who pressed it (Renata, Joaquin, Marcus, Min-ji, Jordan). It shows all 77 nodes sorted by
   degree and drops the community selection, so nobody could check the hub against the 25
   members. Severity 3 for anyone who must verify before reporting.

5. **The grouping method is found by its surname** (Analyze list, left list). 8 of 12. "Louvain"
   names a list row, a bottom tab, a Recent entry and an Analyze entry; the plain description
   "Which nodes form densely connected groups" appears only on the lower entry. Search worked
   for single keywords ("groups", "group", "modularity": 3 of 3) but "groups of characters" got
   no match although the box says "say what to find" (Ruth). Severity 2.

6. **"Hub" is the only word for the center, and its meaning is one click or a hover away**
   (run Data tab, community inspector). 7 of 12 asked whether hub means center; the table
   below says "Valjean is first on all three measures", which made Tom and Jordan doubt
   Gavroche. "16 links inside" was praised by those who reached it (Ruth: "something I could
   say to an editor"). Severity 2.

7. **Two controls named "Data"** (left rail and the inspector tab). 3 of 12 clicked the left rail
   meaning the tab, and lost their selection (Tom, Renata, Marcus). Severity 2.

8. **The sample opens full of someone else's work** (opened sample). 11 of 12 questioned whether
   reading the existing "Louvain 6 groups" counted as having the program do it. This is what
   pushed 8 of them into Analyze; it is a fair consequence of the task wording plus a busy
   sample, and not a defect by itself, but it amplifies finding 2. Severity 1.

9. **No seed on the Louvain form** (Analyze form), though the run record shows seed 7. Raised by
   Emma, Renata and Min-ji (Louvain is not deterministic, so "the same as before" needs a seed to
   mean anything). Severity 1.

## What worked

- The run's Data tab: 6 communities, modularity with a plain-language sentence, sizes with a hub
  per community -- "exactly what I need, all in one place" (student); every participant who
  reached it read the answer correctly at once.
- "Updated just now: 6 communities, the same as before" made all three who saw it trust the
  result more.
- The Louvain table tab (size, density, edges inside, edges leaving) gave 9 of 12 the count and
  the size in one click; three experts called it better than clusterMaker's or Gephi's output.
- "All 254 edges have value set; none is left out" and the Stronger / Farther / Capacity
  explanations on the form.
- "Local only" and "never uploaded" on the first screen (raised by 7 unprompted).
