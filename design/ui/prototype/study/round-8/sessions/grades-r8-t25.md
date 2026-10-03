# Grades: weighting the badge-swipe data before loading

Task given to participants: "The badge-swipe spreadsheets are open on the import page (example data
if you do not work with building access). In every analysis from now on, a person and a building
that appear together many times should count as more tightly tied than a pair seen once, and a
taller building should count for more than a small one. Set that up before you load, then check it
took."

What counts as success: on the swipes table (entries) the participant either picks the weight
"Number of rows per pair" or switches "One edge per" to Pair, which makes the derived count column
the Weight, and reads the one line saying what that did; on the buildings table floors is the node
weight; after Load the graph's Data tab reads Weight "count, stronger" and Node weight "floors
(building)". Looking first for an existing column holding the count, or setting the building weight
only after Load through the source editor, is success with difficulty. No weight set, or a weight on
the wrong table, is failure. The "Higher means" control under the count column appears only once
Pair is chosen, and a node weight has no meaning control; both are correct.

Expected path: import page on entries -> One edge per Pair -> buildings table -> Load -> graph with
the Data tab summary. Reference renders: shots/tasks/r8-t25/01.png to 05.png.

## Results

| Participant | Their own call | Grade | Pair chosen | Opened buildings before Load | Checked after Load | Went further |
|---|---|---|---|---|---|---|
| Cybersecurity analyst (bank SOC) | success | **success** | yes, first click | yes | Summary: "count, stronger", "floors (building)" | weight link, Analyze, PageRank form |
| Knowledge engineer | success | **success** | yes, first click | yes | Summary, both lines | node-weight link, Analyze, PageRank form |
| Supply chain analyst | success | **success** | yes, first click | yes | Summary, both lines | weight link, Analyze list |
| Nonprofit operations analyst | success | **success** | yes, on a guess | yes | Summary, both lines | weight link |
| Gephi holdout (academic) | success | **success** | yes, first click | yes (and people) | Summary, edge table | Analyze, PageRank form, node-weight link |
| Bioinformatics researcher | success | **success** | yes, first click | yes | Summary, both lines | Analyze, PageRank form |

Totals: 6 success, 0 success with difficulty, 0 failure, 0 gave up. Six of six chose Pair on the
first try and none looked for an existing count column. Six of six read the Data tab summary after
Load and quoted both weight lines. Four of six opened an analysis to confirm the weights carry into
it; three opened PageRank and read "count (loaded weight)" and "floors (building, loaded)".

Mean Single Ease Question 5.8 of 7 (6, 6, 6, 5, 6, 6).

## Why each grade

- **Cybersecurity analyst -- success.** Pair (02.png: 1,306 edges, count marked Weight, Stronger
  chosen, toast read aloud), buildings (03.png: floors tagged Weight, B9 reads 1), Load (04.png:
  Summary shows both lines). Then followed the weight link back into "Edit: entries" and opened
  PageRank (07.png) with both loaded weights pre-filled. Every step in order, no wrong turn.
- **Knowledge engineer -- success.** Same path, read the Pair banner and called it a GROUP BY,
  confirmed both summary lines after Load (04.png), opened the node-weight link and PageRank
  (07.png). Raised two side questions (412 rows vs 411 person nodes; "count" colliding with the
  degree wording in the Analyze list) that did not affect the outcome.
- **Supply chain analyst -- success.** Pair, buildings, Load; read both summary lines (04.png) and
  ended on the Analyze list (06.png). Concluded correctly that both weights are set. Her remaining
  doubt -- nothing in the Analyze list says which analyses use the floors weight -- is a finding,
  not a wrong conclusion; she did not open an analysis form, where it is stated.
- **Nonprofit operations analyst -- success.** Clicked Pair on a guess ("whether that also counts
  the swipes I can't tell from the word alone"), then read the result correctly. Buildings (03.png),
  Load, summary (04.png), weight link back into "Edit: entries" (05.png, ended there, nothing
  changed). The guess at Pair is not a wrong turn: it was her first click and it was right. Graded
  success, but her hesitation is the clearest signal on the Pair label (see below).
- **Gephi holdout -- success.** Pair, buildings, people (checking nothing else was weighted), Load
  (05.png: both summary lines), edge table sorted by count, PageRank form (08.png), node-weight link
  (09.png). Her Load command chain skipped the buildings click, but the floors weight is set on that
  table either way and she had already inspected it in 03.png; the summary proves it carried.
- **Bioinformatics researcher -- success.** Pair, buildings, Load, summary, PageRank (06.png). Read
  the "Stronger" default as the correct reading for a co-occurrence count and named the risk of
  "Farther" inverting shortest-path results.

## Caveat on what this task measured

The node-weight half was not really tested. In the skeleton the buildings table arrives with floors
already tagged Weight (shots/tasks/r8-t25/03.png), so all six participants confirmed a choice the
import page had made rather than making it. Six of six noticed the guess, and five of six said they
did not choose it and would want to know when a weight was guessed for them. The success rate for
"make a column the node weight" is therefore unknown. A follow-up task where the guessed column is
wrong (two numeric columns, the tool picks the other one) would test it.

## Findings, with counts and severity

Severity is Nielsen's 0-4 scale.

1. **The automatic node weight is invisible from where the task starts** -- 6 of 6 noticed it was
   pre-set; 5 of 6 objected that nothing marks it as a guess, and 3 (bioinformatics, Gephi
   holdout, cybersecurity) said that if they had loaded straight from entries they would not have
   known a node weight was set. The entries page and the "Makes" line do not mention it; the
   column header does not say "auto" the way the CSV dialect chip does. Severity 3: a wrong guess
   would silently change every node-weighted analysis.
2. **Node weight becomes PageRank restart weights by default** -- 3 of 3 who opened PageRank read it;
   2 (Gephi holdout, bioinformatics) called it a methods decision they would want to be asked
   about, not inherit. The dialog states it plainly, which all three credited. Severity 2.
3. **Nothing says which analyses will use the floors weight until you open one** -- 2 of 6
   (supply chain, nonprofit) said they had to take "every analysis" on trust from the summary
   wording; supply chain stopped at the Analyze list for that reason. Severity 2.
4. **"One edge per: Row | Pair" does not promise a count** -- 1 of 6 (nonprofit) clicked it on a
   guess; 1 (cybersecurity) said she found it only because she was hunting for "weight". The other
   four recognized it from a merge or group-by they already know. Severity 2; single-voice on the
   label itself, but the result line after the click resolved it for everyone.
5. **"Higher means: Stronger / Farther / Capacity" vocabulary** -- 6 of 6 left Stronger and agreed it
   was right; 3 (nonprofit, Gephi holdout, supply chain) found Farther or Capacity unclear, and 1
   (nonprofit) worried one wrong click would invert results with no warning. 3 credited the tool
   for asking at all. Severity 1.
6. **A missing floors value reads 1** -- 6 of 6 saw it and kept 1; 2 (knowledge engineer, Gephi
   holdout) wanted "unknown" kept distinct from "one floor", and 1 (bioinformatics) wanted it in the
   analysis description. Severity 1.
7. **Directed is the default for a person-to-building network** -- 4 of 6 (bioinformatics,
   cybersecurity, Gephi holdout, knowledge engineer) said undirected is the usual choice here and
   the Direction switch at the foot of the import page is easy to miss; it changes PageRank. Out of
   this task's scope. Severity 2.
8. **412 people rows vs 411 person nodes, unexplained in the graph summary** -- 2 of 6 (knowledge
   engineer, nonprofit). The people table's match report does name the repeated key (the Gephi
   holdout read it), so the explanation exists but not where the count is checked. Severity 1.
9. **"count" collides with the degree wording in the Analyze list** -- 1 of 6 (knowledge engineer):
   "Links total (count)" next to "Total count in and out". Single voice. Severity 1.
