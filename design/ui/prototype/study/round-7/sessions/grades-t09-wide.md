# Grades: shade the hosts by peak processor load (wide data)

The task: "Shade the hosts by how hard their processors work at their busiest moments, so the
overloaded ones stand out. The data on screen is a sample: a company's IT estate, hosts and the
network connections between them, with dozens of things recorded about each. If that is not your
line of work, treat it as your own wide spreadsheet."

The intended path: select the hosts' style row, press the small database icon beside Fill > Color
(its accessible name is "Use a field or result for Color"), type in the "Find attribute" box of
the list of 69 attributes to reach cpu_util_p95_pct, pick it, and see the painted row's panel on
the right show "Color from cpu_util_p95_pct".

Grading rule: success means a Color binding from cpu_util_p95_pct, reached by typing in that
list's search box, with the painted row's panel showing the binding. Success with difficulty
means the same end state after first choosing another column, browsing the list, or another wrong
turn. Failure means they ended on another column, or sized instead of shading without noticing.
Grades go by what was on screen at the end and what they concluded, not by how they rated
themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Analyst (Gephi background) | success with difficulty | success with difficulty | Ends with hosts colored from cpu_util_p95_pct, legend "10.5 to 79.1", and the "Color from cpu_util_p95_pct" panel open (18.png). Got there in 18 tries: Style tab, Everything's color picker, guessed names for the database icon, the canvas status note, Table, the graph's actions menu and Analyze were all dead ends. Reached it through Data in the left rail, the attribute's panel, then its three-dots menu > Color by. Chose p95 over max on purpose and said why. |
| Threat hunter (security operations) | success with difficulty | failure | Ends with hosts colored from cpu_util_max_pct, legend "20.1 to 94.4" (20.png). The binding works and she read it correctly, but it is the maximum, not the 95th percentile. She knew both and picked max because the task says "busiest moments". The wrong column is a consequence of the task wording more than of the design (see the note under the totals). About 20 steps, including six guessed names for the database icon and a column menu she could not name. |
| Knowledge engineer | success with difficulty | success with difficulty | Ends with hosts colored from cpu_util_p95_pct and the binding panel open (19.png). On the way she colored the whole graph by id by mistake: the table's column menu she opened for cpu_util_p95_pct came up headed "id", and Color by painted 300 unique ids with no warning. She started over from Data > cpu_util_p95_pct > More actions > Color by. Said she would sharpen the range to make the busy ones stand out, but did not. |
| ML engineer (recommendation systems) | success with difficulty | success with difficulty | Ends with hosts colored from cpu_util_p95_pct, the row's panel reading "Paints 300 hosts" and Fill "Orange to brown" (19.png). Did not open the binding panel itself, but the row's panel names the column through its title and the legend names it too, so the binding is visible. About 19 steps: nine guessed names for the database icon, the column menu opened for id instead of the CPU column, and typing in the column chooser's search did not register. Finished through the Data page. |
| Supply chain risk analyst | success with difficulty | failure | Ends with hosts colored from cpu_util_max_pct and the "Color from cpu_util_max_pct" panel open (16.png). Read "busiest moments" as the maximum; p95 was "a statistics thing". Reached it through Data > attribute > three dots > Color by after the Style tab, the status note, the table and the color picker failed. |

Totals: 0 success, 3 success with difficulty, 2 failure, 0 gave up.

Note on the two failures: both are the right kind of binding on a defensible column. If the task
had asked for "typical busy load" or named the 95th percentile, the grades would very likely be
5 of 5 success with difficulty. Of the three who picked p95, one said she would have asked the
moderator which was meant and another said someone could reasonably pick max. The task wording is the main cause; the design is a secondary
one, because nothing on screen helps a reader choose between max, p50 and p95 (finding 6). The
next round should either reword the task or accept cpu_util_max_pct as a success.

No one used the intended path. All five ended on the same route: Data in the left rail, the
attribute's own panel, its three-dots menu, Color by. The search box in the binding list was
never reached from the color field.

## Findings

1. **The control that starts "color from data" was never found (5 of 5).** All five noticed the
   small database icon beside Fill > Color, four guessed it meant "use a value from the data", and
   all five tried to reach it by name: "From data", "Bind to data", "Color by column", "Map to
   data", "Use data" and a dozen more. None matched its actual name, "Use a field or result for
   Color". Hovering the Color label gives "The default look; change it to override", which says
   nothing about the icon. The icon also appears only after the color picker is opened. This is
   the intended path, and it did not work for anyone. Severity 4 (catastrophe for this path). A
   visible text label ("Color by...") or a tooltip on the icon that says what it does is the
   smallest change to test.
2. **The Style tab has nothing about coloring nodes (5 of 5 went there first).** With the graph
   selected, Style shows only background, print-safe colors and layout. Every participant read
   "Style" as the place to shade nodes and left empty-handed. Severity 3.
3. **The canvas note "Nothing is colored or sized by a row" looks like a way in but does nothing
   (5 of 5 clicked it or remarked on it).** Two also read "row" as a table row, not a style
   row, which made the note harder to understand. Severity 3.
4. **The attribute panel's "Painted by: No row paints from ..." states the gap but offers no
   action (5 of 5 reached it; 4 said this is where they wanted the button).** Color by sits behind
   the three-dots menu at the top of that panel. The attribute panel itself was the best-liked
   screen in the session: 300 of 300 filled, range, median, imported rather than computed.
   Severity 3.
5. **The default ramp does not make the overloaded hosts stand out (5 of 5).** Linear orange to
   brown, fit to the data, on small dots: every participant said the high end does not pop, and
   one said the darkest end reads like the old gray. The legend shows the two end values but does
   not mark which color is high. Nobody changed the range or the palette. The task asked for the
   overloaded ones to stand out, so all five ended only partly satisfied. Severity 3.
6. **Nothing helps choose between cpu_util_max_pct, cpu_util_p50_pct and cpu_util_p95_pct
   (5 of 5 had to choose; 3 chose p95, 2 chose max).** No description, unit or time window is
   shown for any of them; one participant asked what period "max" covers. Severity 2; it is
   mostly a task-wording problem (see the note above) but a column description would help any
   reader of a wide table.
7. **The table's column menu opens for the first column, not the one pointed at (2 of 2 who
   used it).** It came up headed "id" both times, and for the knowledge engineer Color by then
   painted 300 unique ids with no warning that this encoding is meaningless. Severity 3. Caveat:
   the study tool's --click picks the first control with a given name, so the "id" heading may be
   partly the tool. The missing warning on a 300-category color is a design issue either way.
8. **Escape closes the color picker and also drops the selected row (3 of 5).** Severity 2.
9. **"Everything" shows Fill Color 6366F1 (indigo) while the nodes on screen are gray (3 of 5
   noticed).** Severity 2; this looks like a mock inconsistency rather than a design choice, but
   participants who check numbers lost trust over it.
10. **Smaller single reports:** the color-blindness warning names "group 2 and group 3" that do
    not exist on this graph (2 of 5); "Readings not computed" reads like sensor readings in an IT
    dataset (1 of 5); Clamp and Detach in the binding panel are unexplained (2 of 5); typing in
    the column chooser's search did not filter (2 of 5, likely the study tool's typing, since
    single key presses worked for the other two). Severity 1 to 2.

## Ease and preference

Single Ease Question: 3, 3, 3, 3, 3 out of 7. No participant would switch from their current tool
for this job; each said a sorted table column or a one-line notebook plot is faster. What each of
them liked was the attribute panel and a legend that names the column and its range.
