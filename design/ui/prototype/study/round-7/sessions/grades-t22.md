# Grades: size hosts by long-unfixed critical vulnerabilities

The task: "Among the 69 things recorded about each host, pick out the one that tallies serious
security holes left unfixed for more than a month, and make hosts with more of them look bigger in
the drawing." The data is a sample IT estate: 300 hosts, 1,105 network connections, 69 columns.

The intended path: open Data, search the Attributes list with a word start ("vuln", "vu cr",
"unrem") down to vuln_count_critical_unremediated_over_30_days (46 characters), open that
attribute's menu (the "..." on its inspector, named More actions), choose Size by. The hosts are
then drawn by size, a new row named after the column sits above Everything in the Graph list, and
a legend over the drawing reads "Size: vuln_count_...er_30_days, 0 / 2 / 4 / 6, Linear scale
(radius), 0 to 6".

Grading rule: success means the right column was found by search and sized through its menu with
no wrong turn. Success with difficulty means the end state was reached after wrong turns, a long
hunt, a guess at an unlabeled control, scrolling instead of searching, or after binding the wrong
property first and correcting it. Failure means ending with a different column or a different
property bound, or concluding wrongly. Gave up means stopping with nothing applied. Two other
routes reach the same end state and are graded the same as the intended one: the table column
menu's Size by, and the data button beside Size on the Everything row (that one edits the default
row instead of adding a row; see finding 7). Grades go by the last render and what the participant
concluded, not by their own rating.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | success with difficulty | success with difficulty | Found the column by search at once, then spent most of the session getting to Size by: Style tab, the canvas chip, the column picker, then six attempts to open her own column's header menu by name (every chevron is called "Column menu", so she kept getting id's). Reached it through the Alt+Down shortcut printed in a tooltip. Last render (19.png): hosts sized, legend naming the column, a new row in the Graph list. Concluded correctly. |
| Knowledge engineer | success with difficulty | success with difficulty | Search found the column in one step. Then the chip, the Style tab, the Size data button (could not learn its name), the table column menu (opened id's) -- all dead ends. Found Size by on the intended path, behind the unlabeled "..." on the attribute's inspector. Last render (22.png): sized, legend, new row. Concluded correctly, and added the most precise critique of the result (radius scale, unitless "0.5 to 3"). |
| ML engineer (recommendation systems) | success with difficulty | success with difficulty | Same dead ends, then guessed thirteen names for the data button beside Size. Pressing it with the keyboard opened "Color from data" and he set an orange-to-brown palette by accident, backed out, and on a second Tab got "Use a field or result for Size". Last render (25.png): sized, legend, bound on the Everything row; fill unchanged. Concluded correctly. Bound the wrong property first and corrected it, which the rule names as difficulty. |
| Supply chain analyst | success with difficulty | success with difficulty | Chip, Style tab, column picker (only adds a table column; Escape then closed the table too), then Data, search, the attribute inspector, More actions, Size by -- the intended path, reached on the fourth try. Last render (12.png): sized, legend, new row. Concluded correctly, and named the zero-valued hosts shrinking to specks. |
| Screen-reader analyst | success with difficulty | success with difficulty | Chip and Style tab dead ends, then guessed that "row" meant the left list and opened Everything, tabbed from Size to the correctly named data button and clicked it. The search box took no input (the study tool's typing command, not the design), so she arrowed through about 30 numeric fields and picked the right one by reading the names, explicitly rejecting vuln_count_critical and patch_pending_critical_count. Last render (13.png): sized, legend. Scrolling instead of searching is difficulty under the rule even though the cause was the tool. |
| Analyst Alex | failure | failure | Found the right column by search and read its inspector (27 hosts with at least 1). Then pressed the data button beside Size with the keyboard and got "Color from data"; finishing it colored every host orange to brown with Size still 1 (17.png). Three more attempts at size failed (table header menu unreachable by name, Tab landed on a host). Last render (23.png) has nothing applied; his closest result was the wrong property. He concluded correctly that he had failed. Most of this failure is the skeleton defect in finding 1, not his reading of the screen. |
| Explorer Elena | failure | gave up | Found and identified the column by search (guessing correctly that "unremediated" means not fixed), added it to the table and sorted it. Saw Size by once, in the id column's menu, and could never open her own column's menu: its chevron is half clipped at the table's right edge and every chevron shares the name "Column menu". A Tab from the header selected a random host. Stopped at step 19 with nothing sized (19.png). Graded gave up rather than failure: nothing wrong was applied and she concluded correctly that she had not done it. |

Totals: 0 success, 5 success with difficulty, 1 failure, 1 gave up. Ease scores: 4, 3, 4, 4, 4,
2, 2 out of 7 (median 4).

What went well, with counts:

- **Finding the column was easy (7 of 7 identified the right column; 6 of 7 by search).** Typing
  "vuln" cut 69 names to 7 everywhere a search box appeared. Nobody picked vuln_count_critical or
  patch_pending_critical_count; two participants named and rejected them aloud. The two similar
  names were never confused, even with the long one cut in the middle on screen.
- **The attribute inspector was praised (4 of 4 who opened it: Alex, knowledge engineer, supply
  chain analyst, and the cybersecurity analyst's sort).** "Number, every host has a value,
  histogram 0 to 6, 27 have at least 1" was called better than Gephi and "exactly what I check
  first".
- **The legend landed (5 of 5 who got there).** The screen-reader analyst called it "the first
  thing in a graph tool that has told me what a visual encoding is without me asking".

The trouble is entirely between "I found the column" and "size by it": no participant reached
Size by on the first try, and the median participant hit four dead ends first.

## Findings

Severity is Nielsen's 0 to 4 scale.

1. **The Size data button, pressed with Enter, opens "Color from data" (2 of 7 hit it: Alex, ML
   engineer; reproduced by the grader).** Click Everything, click Size, press Tab: the focused
   button is correctly named "Use a field or result for Size". Press Enter instead of clicking it,
   and the popover is titled "Color from data" and lists every field, text included; finishing it
   binds fill color. A mouse click on the same button opens "Size from data" with numbers only.
   This caused Alex's failure and the ML engineer's accidental palette. Severity 4 for the
   skeleton: a keyboard user cannot bind size this way at all, and it must be fixed before the
   next round so the round measures the design, not this defect. Likely cause: the section that
   draws the binding popover (app-b/sections/style-pickers.js) records which property was pressed
   only on a mouse click, so a keyboard press falls back to color.
2. **Size by is only behind unnamed or hidden controls (7 of 7 lost time here).** Three routes
   exist and each hides it: the inspector's "..." has no visible label (knowledge engineer, supply
   chain analyst found it by guessing "More actions"); the data button beside Size appears only
   when the Size box has focus and has no visible label (Alex, knowledge engineer, ML engineer,
   screen-reader analyst); and the table's column chevrons all share the name "Column menu" with
   nothing tying one to its column (cybersecurity analyst, Elena, knowledge engineer, ML engineer,
   Alex all opened id's menu instead of their own). The attribute inspector says "Painted by: No
   row paints from this attribute" and offers no way to make one -- the place three participants
   expected a Size by button (Alex, knowledge engineer, supply chain analyst). Severity 3: five of
   seven got there, none directly. Part of the column-menu trouble is the study tool, which can
   only press controls by name; a sighted mouse user would click the chevron on the right header.
   The shared name is still a real accessibility defect for a screen reader.
3. **The canvas chip "Nothing is colored or sized by a row" names the job and is not a control
   (7 of 7 clicked or hovered it, most as their first move).** It has no tooltip and no action.
   Severity 3: it is the most-tried entry point in the session. Making it open the place where
   sizing is done (or say where that is) would have saved every participant a dead end.
4. **The Style tab with the graph selected has no node size or color-by (7 of 7 tried it).** It
   shows canvas background, print-safe colors, layout and seed. Every participant read "Style" as
   the place for node appearance. Severity 3.
5. **"Row" means a style layer, and nobody read it that way (5 of 7 said so: Alex, knowledge
   engineer, ML engineer, screen-reader analyst, supply chain analyst).** On a screen with a
   table, a row is a host. Participants called the thing a column, an attribute, a field and a
   property; the screen itself uses column, attribute and field for the same thing (screen-reader
   analyst). Severity 2.
6. **The Columns picker looks like the attribute list but only shows and hides table columns,
   and Escape closes the table with it (5 of 7: cybersecurity analyst, Elena, knowledge engineer,
   ML engineer, supply chain analyst).** Clicking an attribute's name ticks its box instead of
   opening it, and the added column lands off the right edge with its chevron clipped. Severity 2.
7. **Two of the three routes put the result in different places.** Size by from the inspector or
   the column menu adds a row named after the column; the data button on Everything changes the
   default row, and its confirmation "Your change is in the Everything lay..." is cut off (ML
   engineer, screen-reader analyst could not read it). Both draw the same picture, but the second
   leaves no row in the Graph list that names what sizes the hosts. Severity 2. A studio question
   for the next spec revision, not a grading matter.
8. **Value 0 shrinks to a speck (3 of 5 who finished: cybersecurity analyst, knowledge engineer,
   supply chain analyst).** 273 of 300 hosts are zero, so most of the network nearly vanished.
   They wanted the clean hosts kept visible. Severity 2.
9. **The legend and every list cut the column name in the middle (4 of 7: Alex, cybersecurity
   analyst, screen-reader analyst, supply chain analyst).** "vuln_count_...er_30_days" in a legend
   is not enough for a report to a manager. Nobody chose the wrong column because of it, so the
   rule's "cannot tell the two similar names apart" did not happen. Severity 2.
10. **Units are unclear (2: knowledge engineer, ML engineer).** The Size box reads "1" with no
    unit, the popover "0.5 to 3 px", the legend "Linear scale (radius)". Severity 1.
11. **The Everything row's fill swatch reads 6366F1, a purple, while every node is drawn gray (2:
    knowledge engineer, ML engineer).** The knowledge engineer said she would not show the tool to
    anyone until the swatch agrees with the drawing. Severity 2 for trust; it may be a skeleton
    fidelity gap rather than a design choice.

Not counted as design evidence: the study tool's typing command does nothing (5 of 7 lost a step
to it, and it forced the screen-reader analyst to scroll), and its press-by-name model inflates the
column-menu trouble in finding 2.
