# Grade: session r2-s41 -- Tom (returning), office spreadsheets (T4 A), two spreadsheets as one network

**Grade: S** (success). The last screen (`10.png`) shows one drawing named "people and messages"
with 13 dots, and p11 selected: name "Kemi Bello", team "Operations", Degree 4. The screen before
it (`08.png`) shows the Overview right after Load: "From 2 files", Nodes 13, Edges 23, Directed,
Density 0.1474, Components 1, "Edges per node 1 to 6, mean 3.538". Tom stated the counts (13
people, 23 links) and named the row that did not fit: line 24, p11 (Kemi Bello) to p13, six emails,
and p13 is not on the staff list (`06.png`). He chose "Add", so p13 became a node with no name and
every one of the 23 rows arrived. The answer key accepts either Add or Leave out when the
participant says which row did not fit ("Choosing 'Add' instead loads 13 nodes and 23 edges").

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: empty, no setup.

## The answer against the key

- **Both files in, drawn (right).** `08.png`: header "people and messages", subtitle "From 2
  files", 13 nodes and 23 edges drawn. `work.json` end: one source, "people.csv and messages.csv".
- **Counts stated (right).** 13 and 23, read from the import summary ("the load makes 13 nodes and
  23 edges", `07.png`) and the Overview (`08.png`), and checked against his own files (12 staff
  plus p13; 23 rows in messages.csv). He also counted the dots: 13 in `08.png`, which is correct.
- **Unmatched row named (right).** `06.png`: "24 | p11 | p13 (no node row) | 6" under "1 unmatched
  row: p13 has no node row". He named it in full in his report, with the sender's looked-up name.
- **Staff attributes arrived (right).** `10.png`: p11 shows name and team from people.csv; `09.png`:
  p13 shows only its id, as the key says for an added node.
- **Not a failure mode.** Not `false-done` (he did not claim 23 links with 22 loaded; with Add, 23
  is true), not `never-found` (both files in), not wrong counts.

## Route

Tom opened people.csv from "Open project or file..." (his habit) rather than "New from data...".
On this build that route opened the same import page, "Open as a new graph", with the staff table
and "the load makes 12 nodes and 0 edges" (`03.png`), so from there he followed the success path:
the "+" beside Tables, File..., messages.csv, "Show the 1 unmatched row", Add, Load. Note for the
answer key: its "Other routes" line says this route "loads it straight in (12 nodes, no ties)"; on
8f0d5a6f7791 it does not, it opens the import page. The participant met no detour from this.

## Measures

- **Steps:** 9 `real.mjs` steps after the start (`02.png` to `10.png`): 6 to Load (No thanks,
  Open with people.csv, "+", File... with messages.csv, Show the unmatched row, Add) plus Load, then
  2 clicks on nodes to check. The key's path to Load is 7 steps; his is 7. The two node clicks are
  checking, not detours. About 1.0x to Load.
- **Wrong turns:** 0.
- **False "done":** none. "I'm done" (`10.png`) with "13 people, 23 links, matching the 23 rows" is
  true on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. The import page stated the counts before Load and Add changed
  them visibly (12/22 to 13/23, warning triangle to green tick, `05.png` to `07.png`).
- **Numbers that disagree (bar 5):** none. Import summary, Tables list and Overview agree (13, 23).
- **Broken habit:** none. His habitual "Open project or file..." led to the import page and on.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and its target; no
  refusals.
- **Scripted exit:** not applicable; he finished.
- **Stopped for names or weight:** he noticed both (no names drawn; "Weight: none") and left them
  alone, as the key asks to record. Neither cost a step.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                 | Evidence                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The only way to add the second file is a bare "+" beside "Tables" with no words, at the top of an otherwise empty column. Tom found it but said he nearly missed it. Load is already enabled with one file and "0 edges", so a user who misses the "+" can load an edgeless graph. | `03.png` (the "+" at 271,107; Load enabled, "makes 12 nodes and 0 edges"); debrief: "I nearly missed it; it is a tiny mark" |
| 2   | 2        | comprehension   | "Add" and "Leave out" sit side by side with no word on what "Add" adds; which one is chosen is shown only by a white fill. Tom guessed Add meant "add p13 as a person" and pressed it only because the counts would let him check; he said he would not have pressed it otherwise. | `05.png`, `06.png` (Add / Leave out); `07.png` (counts 13 / 23 after Add); debrief: "I would not have pressed it if the count had not been there" |
| 3   | 1        | legibility      | No names are drawn on the nodes, and a selected node's inspector heading reads its id ("p11"), not its name ("Kemi Bello"), so Tom had to click dots one by one and read the Values to learn who was who.                                                                | `08.png`, `10.png` (heading "p11", name below); debrief: "the heading ... still said 'p11', not her name"        |
| 4   | 1        | comprehension   | "Weight: none (each edge counts 1)" left Tom unsure whether the email counts were thrown away or only unused. Outside the task; he left it.                                                                                                                              | `05.png`, `07.png`; debrief: "I don't know if that means the email counts were thrown away"                      |
| 5   | 1        | consistency     | After Add, the unmatched-row view still shows p13 in warning color with "(no node row)" and the caption "1 unmatched row: p13 has no node row", while the summary says the load makes 13 nodes and 23 edges and both tables have green ticks. It did not mislead Tom.        | `07.png`                                                                                                         |
| 6   | 0        | wording         | "Direction: As the file says": Tom did not know what else it could be and left it.                                                                                                                                                                                      | `07.png`; debrief                                                                                                |

No severity 3 or 4: the counts were right and stated, the row that did not fit was found before
Load and named, and every doubt Tom raised was about wording or discoverability on a path he
completed.
