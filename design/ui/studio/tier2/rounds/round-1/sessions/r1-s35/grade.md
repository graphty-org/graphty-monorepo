# Grade: session r1-s35 -- Dana, a supply-chain risk analyst, joins the office staff list and email counts into one network (people.csv, messages.csv)

**Grade: S** (success). Both files are in one drawn network, the counts are stated, and the row
that did not fit is named. Dana loaded people.csv and messages.csv through "New from data...",
opened the unmatched-row report, saw line 24 (`p11, p13, 6`: Kemi Bello emails p13, who is not on
the staff list), chose "Add", and loaded 13 nodes and 23 edges. The answer key accepts either Add
(13 and 23) or Leave out (12 and 22) as long as the participant names the row that did not fit,
which she did both at step 6 and in her closing statement.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build the criteria name. Every command produced the screen its step
describes; the tool did nothing a person could not. The session is not void.

## What the last screen shows (`14.png`)

- Header "people and messages"; the drawing holds 13 nodes. Kemi Bello is selected (yellow ring):
  inspector "p11, Node", id p11, name Kemi Bello, team Operations, Degree 4.
- The node above her, tied to her by one edge, is p13. On the screen before (`13.png`) it is
  selected: id p13, Degree 1, no name and no team.
- Two screens earlier the Overview reads Nodes 13, Edges 23, Direction Directed, "Loaded weight
  emails (closer)", Density 0.1474, Components 1, "Edges per node 1 to 6, mean 3.538", header
  "From 2 files" (`11.png`). The Data page's Sources reads "people.csv and messages.csv / 13
  nodes, 23 edges", with people.csv and messages.csv under it (`12.png`).
- These match the answer key's Add values (13 nodes, 23 edges; p13 a node with no name).
  Density 23 / (13 x 12) = 0.1474 and mean edges per node 46 / 13 = 3.538 agree with the counts.

## Measures

- **Steps:** 14 after the start. The success path is about 9; the extra steps were her own checks
  (setting the weight, the Data page, two searches).
- **Wrong turns: 0.** She found the bare "+" beside Tables (`04.png`) with no trouble.
  Setting emails as the weight with "Closer" (`08.png` to `10.png`) went beyond the task but is
  correct for email counts and harmed nothing. The Data page visit and the two searches were
  her way of checking that every row arrived, which the task asks for.
- **False "done": none.** Her claims, "13 dots and 23 links", "all 12 staff plus one extra, p13",
  "every one of the 23 email rows", "emails loaded as the weight, emails (closer)", all match
  `11.png` to `14.png`. Kemi's four ties (Ines, Jonah, Lars, p13) match Degree 4 on `14.png`.
  truth-on-screen: no wrong claim.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). An opinion-only finding is held one level down.

1. **Severity 2 (confirmed: this session and r1-s34, same task, same control) -- which of "Add"
   and "Leave out" is in effect is shown only by a thin outline, with no words.** Dana read the
   outline correctly, but said she would miss it on a laptop and that "the 23rd link would have
   gone missing if I hadn't looked". The counts line above the buttons does change ("the load
   makes 12 nodes and 22 edges" to "13 nodes and 23 edges"), which is the only other sign.
   Evidence: `06.png` (outline on Leave out), `07.png` (outline on Add), debrief.
2. **Severity 2 (confirmed with r1-s33) -- a whole-number column named "emails" comes in as a
   plain Attribute, and the import page shows "Weight: none (each edge counts 1)" with no prompt to
   use it.** Dana noticed and set it; a user who did not would get every later ranking treating 2
   emails the same as 18. This does not affect T4's grade (the task does not ask for a weight).
   Evidence: `05.png`, `06.png`, `08.png`, debrief.
3. **Severity 2 -- after "Add", nothing on the loaded graph records that p13 was created from an
   edge row with no node row.** On Leave out the Data page lists "1 row left out" under the source
   (answer key, `rounds/r1d4/pilot/T4A/10.png`); on Add the Sources list shows only the two files
   and "13 nodes, 23 edges" (`12.png`), and p13's inspector shows just id and Degree (`13.png`).
   Dana inferred it from "name 92%" and "team 92%". The decision made at load is not kept where a
   returning user, or a colleague, would look for it later.
4. **Severity 1 (opinion) -- no row-by-row table of what loaded.** She wanted to tick the loaded
   rows off against her spreadsheet and had to check people one at a time through the find box
   and the inspector. Evidence: `12.png` to `14.png`, debrief.
5. **Severity 1 (opinion) -- the dots carry no names, so the picture alone cannot show who is who
   or which dot is the stray p13.** Evidence: `11.png`, step 11 remark.
6. **Severity 1 (opinion) -- the import page's small gray labels** ("Each row is", "Direction",
   "Higher means", "text", "whole number") are hard to read. Evidence: `05.png`, `09.png`.
7. **Severity 1 -- "Direction: As the file says" is not explained.** She left it because she did
   not know what else it would do; for email it happens to be right. Evidence: `09.png`, debrief.
8. **Severity 1 -- "Capacity" in "Higher means" is not explained for this kind of data**, and the
   "Not set" sentence (paths, PageRank, communities) is long. "Closer" with its example sentence,
   "such as more emails between two people", was clear. Evidence: `09.png`, `10.png`.

What worked: the import page said what it guessed (id as the key, from and to), counted rows and
stated what the load would make before Load, flagged the unmatched row with a warning on the edge
table, and showed the row itself with its line number. "Loaded weight emails (closer)" and "From 2
files" on the Overview confirmed the load afterward.

## What this says about the round

No build defect showed up: every control did what the answer key says, and the session spent no
time on a broken control. The findings are about how clearly the import page shows a choice that
changes the counts (Add or Leave out), whether it offers an obvious weight column, and whether the
loaded graph keeps a record of rows the user chose to add.
