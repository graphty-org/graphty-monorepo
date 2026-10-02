# Grades: label each host by its everyday name (wide IT estate sample)

The task: "Have each host in the drawing show what people call it, not its inventory number. The
data on screen is a sample: a company's IT estate, hosts and the network connections between them,
with dozens of things recorded about each." The sample has 300 hosts and 69 columns, among them
`id` (the inventory number), `hostname` (the everyday name) and a long run of `cmdb_` and
`backup_` columns.

The intended path: on the graph with the hosts, press the plus next to Label on a row that paints
every host, which opens the list of columns with a search box; pick `hostname` (not `id`, not
`fqdn`). The panel then reads "Label: Above -- hostname".

Grading rule: success means the plus next to Label opened the column list and `hostname` was the
pick. Success with difficulty means they got there after a wrong turn, a long search, help from a
hover, or after picking `id` or `fqdn` first and changing it. Failure means they could not single
out the everyday name among the 69 columns, or ended somewhere else. Grades go by what was on
screen at the end and what they concluded, not by how they rated themselves.

Two notes on equivalence:

- All four set the label on the built-in "Everything" row, which paints all 300 hosts, rather than
  on the row the reference renders use. Both rows paint every host, so this counts as the intended
  outcome, not as a detour.
- The success criterion mentions the list's search box. Nobody used it, and nobody needed to:
  the list puts `hostname` second, under "In use", tagged "Name". Not using the search box is not
  counted against anyone.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | success with difficulty | success with difficulty | Clicked the word "Label" (does nothing), guessed the plus's name twice, found "Add to Label" only by hovering the Effects plus. Took "Show labels" first, which added a checkbox in the off state, ticked it, then went back for "Label line" and picked `hostname`. End screen (11.png): Everything row, "Above: hostname", Show labels ticked. Concluded correctly that `hostname` is the name and `id` the inventory number. |
| Knowledge engineer | success with difficulty | success with difficulty | Same detours: the word "Label", then a stray plus that opened the Analyze palette, then the Effects menu, then a hover to learn the name. Took "Show labels" first, saw a switch with no source, backed out and chose "Label line", picked `hostname` reading the Key and Name tags. Her last command pressed the plus once more, which added a second, empty label line with the field list open (13.png); the first line still reads "Above: hostname". The stray empty line is left over, not a wrong choice; graded on the `hostname` line she set and named as her answer. |
| Analyst Alex | success with difficulty | success with difficulty | Clicked the word "Label", hit the wrong plus (Analyze), hovered to find "Add to Label". Took "Show labels" first, ticked it, then reached the field list through the plus and picked `hostname` from "In use", reading the "Name" tag. End screen (10.png): "Above: hostname", Show labels ticked. Concluded correctly that the setting is right. |
| Supply-chain analyst | success with difficulty | success with difficulty | Clicked the word "Label", three wrong guesses at the plus's name, a hover on the Effects plus to learn it. Took "Show labels" first and ticked it, then "Label line" and `hostname`, identifying `id` as the inventory number from its "Key" tag. End screen (13.png) matches the others. Concluded correctly. |

Totals: 0 success, 4 success with difficulty, 0 failure, 0 gave up. Ease scores: 3, 4, 3, 3 out
of 7.

The column choice itself was easy for everyone: 4 of 4 picked `hostname` on the first look at
the list, none picked `id` or `fqdn`, and 4 of 4 named the "Key" and "Name" tags on `id` and
`hostname` as the thing that made it obvious. All the difficulty sat before the list opened.

## Findings

1. **"Show labels" is the wrong first door, and it was taken by 4 of 4.** The plus next to Label
   offers "Label line" and "Show labels". Nobody knew what "Label line" meant (two read it as a
   leader line), so everyone took "Show labels", which adds a checkbox that is off and never asks
   which column. Each then had to tick it and come back for "Label line" to reach the field list.
   After a label line exists the menu stops offering "Show labels" and the plus goes straight to a
   new label line, so the plus behaved differently on the second press (noticed by 3 of 4), and the
   knowledge engineer ended with a stray empty label line from it. Severity 3 (major): every
   participant took a detour, the term in the right choice is not understood, and the two items'
   relationship stayed unclear to everyone. Direction: one item that adds a label line and opens the
   field list with the "Name" column preselected, and labels on as a consequence of adding one.
2. **The plus buttons have no visible name and look identical (4 of 4).** Everyone first clicked
   the word "Label", which does nothing, then guessed names; two hit a plus that opened the Analyze
   palette, one opened the Effects menu, and all four learned the name "Add to Label" by hovering a
   different plus. Two called the wording "Add to Label" odd ("I am not adding to a label, I am
   adding a label"). Severity 3: it cost each participant several steps on the most common styling
   action. Direction: make the section heading itself open the same menu as its plus.
3. **No labels appear on the canvas after the setting is made (4 of 4), and the start screen shows
   no inventory numbers either (1 of 4 said so).** All four ended doubting their own success: "the
   panel and the picture disagree", "I wouldn't bet the Thursday slide on it". The reference end
   state renders no labels either, so this is a gap in the mock, not a measured design behavior,
   and it did not change any grade. It is still a real risk for the product: if labels are hidden
   at this zoom or by overlap, the app has to say so. Must be fixed in the mock before this task is
   run again, or the next round measures the same doubt. Severity 2 as a mock defect; the question
   of what the product shows when labels are on but hidden stays open.
4. **Fill color reads 6366F1 (indigo) while every host is gray (2 of 4 remarked: Analyst Alex,
   knowledge engineer).** Off the task's path, but it compounds finding 3: two disagreements between
   panel and picture in one session. Severity 2; a mock defect.
5. **What worked (4 of 4):** "Everything" was found as the row for all hosts without help, its
   "Paints 300 nodes" matched the summary count, and the field list's "In use" group with "Key" and
   "Name" tags made the right column obvious among 69. The knowledge engineer also valued the fill
   percentages on the date columns.
