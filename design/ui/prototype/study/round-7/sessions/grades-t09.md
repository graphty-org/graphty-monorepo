# Grades: shade the kept list of researchers by how much each has published

The task: "Shade the researchers on the list you kept by how much each one has published, so the
most productive stand out. The data on screen is a sample: one export from a research database,
researchers and institutions with records inside records."

The intended path: the kept set "Machine learning researchers" (23 nodes) is already open in the
right panel on its Style tab. On its Fill Color line, the bind icon (a small database cylinder that
appears when the pointer is on the line, tooltip "Use a field or result for Color") opens "Color
from data" with a list of fields. Pick the number of papers, attributes.profile.metrics.papers,
either by opening attributes > profile > metrics or by typing in the list's search box. The set's
label already shows a citations number (citations.last_5_years); that is not the answer, because
citations measure impact, not output.

Grading rule: success means the set's Color line was bound to papers through that field list.
Success with difficulty means papers was picked there after a wrong turn, a long search, a hover
hint, or a citations number first. Failure means a citations number or another non-output value
was picked, or the binding was made somewhere other than the set's Color line, or the list could
not be got past. Grades go by what was on screen at the end and what was concluded, not by how
participants rated themselves.

Two conditions set before grading:

- Browsing nested values as folders of name parts (attributes > profile > metrics) is already
  replaced by a decided change that is not drawn yet: nested values will be listed by their full
  stored name under their parent's heading. Any difficulty opening those folders is graded as a
  mock artifact, and the search-box route is the design under test.
- The list was expected to open with its disabled group ("Not usable here") first and
  highlighted, against the field list's own ordering rule. That is a mock artifact; this file
  counts how many participants it stopped.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Bioinformatics researcher | failure | success with difficulty | From the set's Style tab, found the bind icon's name only after guessing about twenty names for it (the tooltip "Use a field or result for Color" finally showed it, 16.png), opened metrics and picked papers (18.png). Rejected citations explicitly ("Published means papers. Not citations"). Concluded the shading landed on all researchers, not the 23; that is what the screen showed (19.png, 22.png), and the cause is a skeleton defect (Findings 1). |
| Expert user (Emma) | failure | success with difficulty | Same route: about thirty name guesses for the icon, a detour through the color picker's Libraries palettes, then the tooltip (09.png), metrics, papers (12.png). Considered last_5_years and set it aside as possibly citations. Same accurate reading of the end screen (13.png): the whole ring shaded, the set's panel still "Paints 23 nodes", 009E73. |
| Marketing analyst | failure | success with difficulty | Same route after about twenty guesses and a detour through Analyze; the tooltip came at 10.png. Nearly concluded papers did not exist, because metrics was folded and showed "1" with only citations visible below it (11.png); opening metrics revealed papers (12.png), picked at 13.png. The folded-metrics stumble is a mock artifact under the decided change. Same accurate reading of the end screen (14.png). |
| Genomics Cytoscape user | failure | failure | Never used the set's Color line: would not click "a mystery icon next to my data". Went to the Data page, found papers (range 4 to 300, 170 of 170), and used its menu's Color by (12.png). That painted all 170 researchers through a new row, and the kept set disappeared from the left list with Undo reporting "Nothing to undo" (16.png). Right value, wrong place, wrong scope. |
| Gephi user | gave up | gave up | Never found the bind icon's name after about twenty guesses; tried the label, the Table, the Columns chooser, the "..." menu and the Libraries palettes. Clicking "Purple to yellow" did nothing (14.png). Stopped with the set still flat green. |

Totals: 0 success, 3 success with difficulty, 1 failure, 1 gave up. No one picked a citations
number. Every participant who reached a field list named papers as the answer and said why
citations is not; the value itself is not the problem. Self-ratings: 2, 3, 2, 2, 2 out of 7.

Mock artifact count (disabled group first): **0 of 5 stopped by it.** The click-through never
showed it: the list opened on "researchers, In use" with "Not usable here (3)" last, as the rule
asks (marketing analyst 11.png). Only the canned render of the intended path
(shots/tasks/t09/02.png) opens on the disabled group highlighted. The defect is real in that state
but met no participant.

Folder-browsing mock artifact count: **1 of 3** who reached the list was slowed by it (marketing
analyst). No one tried the search box; all three who got there opened the folders.

## Findings

1. **After binding, the screen contradicts itself, and every participant who bound the set's
   Color line judged themselves failed for it (3 of 3).** The canvas shades every researcher,
   about 170 nodes; the set's green is gone from the canvas; the set's panel still says "Paints 23
   nodes" with Fill 009E73 and no sign of the binding; the legend lists both the green set and the
   papers ramp; and the field list then labels papers "Color (Everything)" (bioinformatics 22.png).
   **Graded as a skeleton defect, not the design.** The skeleton's stand-in for style layers
   records a binding against the inspector it was made on, but it paints the field's whole table
   and labels any binding not made through an attribute's Color by as Everything's. Binding a
   set's line is not modeled. Even so, it is the most expensive thing in the round for this task:
   it turned three completions into three reported failures and three trust statements ("One of
   them is lying", "a count I can't reconcile ends the session"). The skeleton must draw a set's
   binding painting only the set's members, show it on the set's Color line, and say the range's
   denominator ("4 to 300 over 23 nodes"). Two participants asked for that denominator
   independently. Severity 4 until drawn, because the study cannot measure the task without it.
2. **The bind icon has no visible label and appears only under the pointer (5 of 5 struggled to
   find it).** Three found it only by its tooltip after long guessing; one refused to click an
   unnamed icon beside their data; one never found it. Part of the guessing is the study tool,
   which needs a control's name, and two participants said so ("a real person would simply have
   moved the mouse onto the icon"). But the unanimous point is that nothing on the line says
   "from a field" until you are on it, and the three experienced users each looked first for a
   named "map to column" or "Ranking". Severity 3 (major): the only route to the task's core
   action is invisible at rest.
3. **The color picker's Libraries tab looks like the start of a data mapping (4 of 5 tried
   it).** "Purple to yellow", "Blues" and "Greens" are sequential palettes; clicking one changes
   nothing and never asks for a field. Severity 2.
4. **Color by from an attribute's menu on the Data page painted all 170 and made the kept set
   vanish, with Undo saying "Nothing to undo" (1 of 5, the genomics user).** Painting everyone is
   by design for that route ("Paints 170 researchers (every researcher with a value)"), but the
   set leaving the left list and Undo having nothing to undo read as data loss. Likely a skeleton
   artifact (the route jumps to a canned left list without the set); it must be checked and drawn
   before it is counted against the design. Opening the Data page also turned the set gray
   ("Nothing is colored or sized by a row") without saying why. Severity 3 if real.
5. **The set's "..." menu is headed "Community 3" and offers "Keep as set" (3 of 5).** It looks
   like the menu of a different object. Severity 2. Likely the skeleton reusing a canned menu.
6. **The label's value is truncated to "a...last_5_years" everywhere (3 of 5 noticed).** Two
   could not tell whether it was papers or citations until a hover; one called it unusable in a
   methods section. Severity 2.
7. **The legend title is the raw stored path "attributes.profile.metrics.papers" (2 of 5).**
   Wanted "Papers" for a figure or a deck. Severity 1.
8. **Defaults on the mapping: Linear on a skewed count (2 of 5).** Both asked for log or
   percentiles. Severity 1.

## What worked

- Choosing the value. All four who saw the nested fields picked papers and said why citations is
  wrong. The nested tree was praised by four ("better than flattening in Excel first").
- The mapping popover: scale, palette, Fit to data / Percentiles / Typed, range, clamp, and the
  explicit "No value: Nothing" were called better than Gephi's and Cytoscape's (3 of 3 who saw it).
- The Data page's attribute summary (170 of 170 have a value, range, median) and the colorblind
  warning in the picker were singled out as things the participants' current tools lack.
