# Grade: session r4-s49 -- Dev (tier 1 graduate), office (T4 A), two spreadsheets as one network

**Grade: S** (success). Both files went in through the Data page as one network. Dev stated the
counts and named the row that did not fit before loading. Dev found the unmatched row on the import
page with no detour: "Show the 1 unmatched row" showed line 24, `p11 | p13 (no node row) | 6`
(`09.png`). Dev then chose "Add" rather than the default "Leave out". The answer key accepts either
choice when the participant says which row did not fit, and with "Add" it expects 13 nodes and 23
edges. The last screen (`14.png`) shows the graph "people and messages", "From 2 files", Overview
Nodes 13, Edges 23, Directed, Components 1. The Edges table below it reads "23 edges" with the
emails column (p01 -> p02 14, p01 -> p03 9, p02 -> p03 11, p03 -> p12 4). The wrap-up names the row
in full: "messages.csv line 24 is Kemi Bello (p11) -> p13, 6 emails, and p13 is not in people.csv".
It also says what was done about it: "I chose Add, so p13 is in the network as a person with no name
and no team".

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Both files in (right).** `10.png`: Tables list "Nodes: people.csv / 12 rows" and "Edges:
  messages.csv / 23 rows", both with green checks, heading "people and messages: 13 nodes, 23
  edges", summary "12 node rows and 23 edge rows read; the load makes 13 nodes and 23 edges."
- **Counts (right for the choice made).** Before Add: "12 nodes, 22 edges" and "23 rows, 1 left
  out" (`08.png`), as the key says. After Add and Load: 13 and 23 (`11.png`, `14.png`), the key's
  "Add" values. Dev compared the import page's promise with the Overview and found they agree.
- **Unmatched row named (right).** Line 24, from p11 (Kemi Bello, looked up from people.csv), to
  p13, 6 emails. The key accepts either the id or the looked-up name.
- **p13 checked (right).** `13.png`: the node table's last row is p13 with an empty name and team,
  below p12 Lars Nilsen.
- **Drawn (right).** `11.png` shows 13 spheres with arrowheads, one component. Counted by the
  grader: 13.
- **Work kept.** `work.json` end: one source "people.csv and messages.csv", the two default layers,
  no runs, notes or steps. Nothing gone.

## Measures

- **Steps:** 13 `real.mjs` steps after the start (`02.png` to `14.png`). The success path is 8 to
  load. The extra steps were checks the task asked for: the unmatched row, the node table, a scroll
  and the Edges tab. Two were hovers to find the "+" beside Tables, and one was the "Add a table"
  click that opened the menu.
- **Found "Add a table":** yes, by hovering it (`06.png`, tooltip "Add a table") after a first
  hover on the wrong icon, the main menu (`05.png`). Dev expected the "+" to open a file window
  directly; it opened the File... / From a URL... / Paste... menu (`07.png`). The tool reported that
  no file chooser opened, and the next step used "File...". This is the app's designed path, not a
  wrong turn.
- **Read which of Add and Leave out was chosen:** correctly. Step 8 reads "Leave out (selected)".
  Dev did not misread the unfilled-versus-outlined drawing that the key asks graders to watch.
- **Wrong turns:** 0. The mis-aimed hover (`05.png`) changed nothing and counts as exploration.
- **False "done":** none. "every person and link arrived" holds for the "Add" choice: 13 nodes
  (12 staff plus p13) and 23 edges, on `14.png`. Dev said that p13 is a nameless node made for the
  missing person, so the claim does not hide the mismatch. truth-on-screen holds.
- **Data page Sources:** not visited. It was not needed: Dev found and named the row on the import
  page before Load.
- **Stopped to set the weight or put names on:** no. Dev noticed "Weight: none (each edge counts
  1)" and left it, saying it was not asked.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot. The tool reported the
  "Add a table" upload as "no file chooser open, nothing uploaded", which is what a person would
  see. `leaks.json` shows no leaks over 31 calls.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                   | Evidence                                                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | risk            | "Leave out" is chosen by default for an edge row whose end is not in the node table. A reader who loads without reading the summary strip loses a link. Dev caught it from the red triangle and "1 left out" in the Tables list, so the outcome was not affected. | `08.png` ("23 rows, 1 left out", "Leave out" chosen); wrap-up: "If I hadn't read the bottom line I'd have lost a link without noticing"       |
| 2   | 1        | discoverability | The "+" beside "Tables" has no words on screen. Its name shows only on hover, and the pointer stays an arrow over it. It opens a menu rather than a file window, which Dev did not expect. It cost two hovers and one extra click.                                        | `05.png` (wrong icon hovered), `06.png` (tooltip "Add a table"), `07.png` (menu File... / From a URL... / Paste...); transcript steps 6 and 7 |
| 3   | 1        | wording         | "Weight: none (each edge counts 1)" left Dev unsure whether the email counts had "arrived" or whether they should have been the weight. The import page does not say that the column is kept as an attribute and can be read later. Opinion, held one level down.          | `08.png`, `10.png`; wrap-up: "I'm not sure if that counts as everything 'arriving'"                                                            |
| 4   | 1        | visual          | The drawing shows no names, so the added person p13 could be found only in the table, not on the drawing. Nothing on the Graph page marks the node that "Add" created.                                                                                       | `11.png`, `13.png`; wrap-up: "I couldn't find p13 on the drawing, only in the table"                                                          |

All four problems come from this one participant, so this session alone does not confirm any of them. None is a build defect.
