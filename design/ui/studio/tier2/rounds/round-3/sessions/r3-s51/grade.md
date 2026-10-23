# Grade: session r3-s51 -- Dana, a supply-chain risk analyst, joins the office staff list and email counts into one network (people.csv, messages.csv)

**Grade: S** (success). Both files are in one drawn network, the counts are stated, and the row
that did not fit is named. Dana loaded people.csv through "New from data...", added messages.csv
with the "+" beside Tables ("Add a table", then "File..."), opened "Show the 1 unmatched row",
read line 24 (`p11, p13 (no node row), 6`: Kemi Bello emails p13, who is not on the staff list),
chose "Add", and loaded 13 nodes and 23 edges. The answer key accepts either Add (13 and 23) or
Leave out (12 and 22) as long as the participant names the row that did not fit; she named it at
step 6 and in her closing statement.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json "buildStamp"), the frozen build the
criteria name, at 1440 x 900, task T4A, empty start, no setup. Every command produced the screen
its step describes, leaks.json records no leaks, and work.json's end state (source "people.csv
and messages.csv", no runs, no notes, only the two default style layers) matches the screens. The
session is not void.

## What the last screen shows (`12.png`)

- Header "people and messages"; the inspector reads Graph, "From 2 files", Overview Nodes 13,
  Edges 23, Direction Directed, Density 0.1474, Components 1, "Edges per node 1 to 6, mean 3.538".
  Density 23 / (13 x 12) = 0.1474 and mean 46 / 13 = 3.538 agree with the counts.
- The find box holds "p13" and lists "Nodes 1: p13" and "Edges 1: p11 -> p13", so the added node
  and its link are in the graph.
- The drawing holds 13 nodes with arrows, all drawn alike, with no labels.
- The screen before (`11.png`, Data page) shows Sources "people.csv and messages.csv / 13 nodes,
  23 edges" with people.csv and messages.csv under it, and node attributes name 92% and team 92%
  (12 of 13: p13 has neither).
- These match the answer key's Add values (13 nodes, 23 edges; p13 a node with no name).

## Measures

- **Steps:** 11 after the start. The success path is about 8; the extra steps were a hover to
  read the "+" tooltip and her own checks (Data page, the name attribute, a search for p13).
- **Wrong turns: 0.** She found the bare "+" with one hover (`04.png`) and read the unmatched-row
  report before loading. The Data page, attribute and search visits were checks the task asks for
  ("make sure every person and every link arrived"), not detours.
- **False "done": none.** Her claims -- 12 staff plus p13, all 23 email rows, Overview 13 / 23 /
  1 component, 13 dots, name and team at 92% because p13 has neither, search finds p13 and
  p11 -> p13 -- all match `08.png` to `12.png`. truth-on-screen: no wrong claim.
- **Self-rating** (6 of 7) was not used in grading.
- **Not a scripted exit.** She finished; no give-up.

## Problems

Severity runs from 0 to 4 (Nielsen). An opinion-only finding is held one level down.

1. **Severity 2 -- "Leave out" is the default for the unmatched row, and which of Add and Leave
   out is in effect is shown only by a white fill, with no words.** Loading at once would have
   dropped the 23rd link; the only other signs are the counts line ("the load makes 12 nodes and
   22 edges") and the Tables list's "23 rows, 1 left out" with a warning triangle. Dana read them,
   but said it was "only in small print at the bottom". Evidence: `06.png` (Leave out filled),
   `08.png` (Add filled), debrief. The answer key lists the same no-words choice.
2. **Severity 2 -- after "Add", the loaded graph keeps no record that p13 came from an edge row
   with no node row.** The Sources list shows only the two files and "13 nodes, 23 edges"
   (`10.png`, `11.png`); there is no "1 row added" counterpart to Leave out's "1 row left out".
   Dana inferred it from "name 92%". A colleague opening the project later could not tell.
3. **Severity 2 -- the edge table's caption says "All 23 rows" while the preview is cut at line
   15**, so line 24, the unmatched row, is below the pane with only the whole pane's scrollbar
   to show it. Dana did not trip on it because the summary strip offered "Show the 1 unmatched
   row". Evidence: `06.png`. Known on this build (answer key).
4. **Severity 1 -- the emails column comes in as a plain Attribute with "Weight: none (each edge
   counts 1)" and nothing on the import page says how to make it the weight.** Not part of the
   task; Dana noticed and wondered whether a later ranking by email volume would use it.
   Evidence: `06.png`, `08.png`, step 5 remark, debrief.
5. **Severity 1 (opinion) -- the dots carry no names, and picking p13 in the find box did not
   mark it on the drawing,** so she could not point at Alma, Lars or the stray p13 on the
   picture. In `12.png` the p13 row is highlighted in the results list while every node on the
   canvas is drawn alike. Evidence: `09.png`, `12.png`, debrief.
6. **Severity 1 -- the "name" attribute's summary reads "Kind: Groups"** for a column of 12
   distinct personal names; she called it odd ("a name isn't a group"). Evidence: `11.png`.
7. **Severity 1 (opinion) -- small gray labels** ("Each row is", "File settings", the 92%
   figures) are hard to read on a laptop. Evidence: `06.png`, `11.png`, debrief.

What worked: the "+" beside Tables (found with one hover), the import page guessing the edge
table's from and to columns and stating what the load would make before Load, the warning on the
edge table, the unmatched row shown with its line number and the missing id in red-orange, and the
counts agreeing across the import page, the Overview, the Sources row and the find box.

## What this says about the round

No build defect blocked the task: every control did what the answer key says. The findings are
about how visibly the import page shows the Add / Leave out choice that changes the counts,
whether the loaded graph keeps a record of rows the user chose to add, the caption that claims
every row is shown, and an unused weight column. Simulated participant: a pass is weak evidence
until real people confirm it; keyboard and screen-reader access are untested by sessions.
