# Grade: session r4-s51 -- Jordan (regular analyst), office (T4 A), two spreadsheets as one network

**Grade: S** (success). Both files went in through "New from data..." as one network. Jordan read
the import page's report and named the row that did not fit before loading. messages.csv line 24,
`p11 | p13 (no node row) | 6`, appears under the caption "1 unmatched row: p13 has no node row"
(`07.png`, `08.png`). Jordan chose "Add" rather than the default "Leave out". The answer key accepts
either choice when the participant says which row did not fit, and with "Add" it expects 13 nodes
and 23 edges.

The Overview after Load reads "people and messages", "From 2 files", Nodes 13, Edges 23,
Directed, Components 1 (`13.png`). The last screen (`18.png`) has the node p13 selected (inspector
"p13, Node", id p13, Degree 1), with the Edges table open on "23 edges" and its last row reading
p11 -> p13, 6. The wrap-up states the counts and names the row in full: "messages.csv line 24 says
Kemi Bello (p11) sent p13 six emails, but people.csv has no p13. I chose Add, so p13 is in the
network with no name and no team".

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Both files in (right).** `08.png`: the Tables list shows "Nodes: people.csv / 12 rows" and
  "Edges: messages.csv / 23 rows", both with green checks. The heading reads "people and messages:
  13 nodes, 23 edges", and the summary reads "12 node rows and 23 edge rows read; the load makes 13
  nodes and 23 edges."
- **Counts (right for the choice made).** Before Add, the page read "12 nodes, 22 edges" and "23
  rows, 1 left out" (transcript step 6), as the key says. After Add and Load the counts are 13 and
  23 (`13.png`), the key's values for "Add".
- **Unmatched row named (right).** Line 24, from p11 (Kemi Bello, looked up from people.csv), to
  p13, 6 emails. The key accepts either the id or the looked-up name.
- **Every person and link checked (right).** The node table ends with p10, p11, p12 and p13, and
  p13 has an empty name and team (`15.png`). The edge table reads "23 edges" and ends with p11 ->
  p13, 6 (`17.png`, `18.png`). Clicking the lone node at the top of the drawing confirmed that it
  is p13 (`18.png`).
- **Drawn (right).** `13.png` shows 13 spheres with arrowheads in one component (the grader
  counted 13).
- **Work kept.** At the end, `work.json` holds one source, "people.csv and messages.csv", plus the
  two default layers, with no runs, notes or steps. Nothing is gone.

## Measures

- **Steps:** 17 `real.mjs` steps after the start (`02.png` to `18.png`). The success path takes 8
  steps to load. The extra steps were:
  - checks that the task asks for: the unmatched row, the node table and a scroll, the Edges tab
    and a scroll, and the click on p13;
  - one hover on the wrong icon;
  - one click on the "+" that opened a menu;
  - one ambiguous click target;
  - three steps to set the weight.
- **Found "Add a table":** yes. Jordan first hovered the wrong icon, the main menu (`04.png`). The
  "+" opened the menu File... / From a URL... / Paste..., and the upload attached to that click
  went nowhere (`05.png`). The next step used "File..." (`06.png`). This is the app's designed path,
  not a wrong turn.
- **Read which of Add and Leave out was chosen:** correctly. After the click, Jordan read "Add" as
  chosen ("'Add' shown pressed") and the counts as 13 and 23, which the summary confirms
  (`08.png`).
- **Stopped to set the weight:** yes, and the key asks graders to record it. Jordan set the role of
  "emails" to Weight and then chose "Closer" (`10.png` to `12.png`). After Load the Overview reads
  "Loaded weight emails (closer)" (`13.png`). The task did not ask for this. It is correct for the
  data and changes none of the counts.
- **Wrong turns:** 0. The hover on the wrong icon (`04.png`) changed nothing. The "+" click opened
  the designed menu. The ambiguous "emails" click (`09.png`) was refused by the tool, changed
  nothing and was repeated with the full name.
- **False "done":** none. "all 12 staff, all 23 email rows" holds for the "Add" choice: 13 nodes
  (12 staff plus p13) and 23 edges (`13.png`, `18.png`). Jordan says that p13 is a nameless node
  made for the missing person, so the claim does not hide the mismatch. truth-on-screen holds.
- **Data page Sources:** not visited. It was not needed: Jordan found and named the row on the
  import page before Load.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot. `leaks.json` shows no
  leaks over 41 calls.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                           | Evidence                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | missing-info    | After Load, nothing on the Graph page marks the node that "Add" created. p13's inspector shows only its id and Degree 1, and its table row has a blank name and team, with nothing to say it came from messages.csv and not from people.csv. A colleague who receives the graph could read it as a lost name. | `15.png` (p13 row blank), `18.png` (inspector: id p13, Degree 1); wrap-up: "the loaded graph forgets it"       |
| 2   | 1        | default         | A "how often" column comes in as a plain attribute, with "Weight: none (each edge counts 1)". Making it the weight took three steps, through "Role of emails". The wording there was clear.                                                                                                                         | `08.png` ("Weight: none"), `10.png` to `12.png`; wrap-up: "a new user would load without doing it"             |
| 3   | 1        | visual          | The default drawing shows no names and the same thin line for every tie, so an 18-email tie looks like a 2-email one and p13 can be found only by clicking.                                                                                                                                               | `13.png`, `18.png`; transcript step 13                                                                         |
| 4   | 1        | missing-info    | The Edges table shows From and To only as ids (p01, p13), not names, so reading who emails whom means cross-checking the Nodes tab.                                                                                                                                                                         | `16.png`, `17.png`                                                                                             |
| 5   | 1        | discoverability | The "+" beside "Tables" has no words on screen and opens a menu rather than a file window. Jordan expected a file window. It cost one hover on the wrong icon and one extra click.                                                                                                                         | `04.png`, `05.png` (menu File... / From a URL... / Paste...), `06.png`                                         |
| 6   | 1        | layout          | At 1440 x 900 the table panel shows about four rows, so checking 13 nodes and 23 edges took two scrolls.                                                                                                                                                                                                  | `14.png` to `17.png`                                                                                           |

All six problems come from this one participant, so this session alone does not confirm any of them. None is a build defect.
