# Grade: session r5-s53b -- Dana (regular analyst), office (T4 A), two spreadsheets as one network

**Grade: S** (success). Dana loaded people.csv and messages.csv as one network and drew it, stated
the counts, and named the row that did not fit before loading: messages.csv line 24, p11 (Kemi
Bello) to p13, 6 emails, with p13 not on the staff list. She chose "Add", so the load made 13 nodes
and 23 edges; the key accepts either Add or Leave out "if the participant says which row did not
fit", and she did. After Load the Overview reads Nodes 13, Edges 23, Directed, Components 1
(`14.png`). The last screen (`19.png`) shows the drawing with p13 selected and ringed (the lone node
at the top, one arrow in), the inspector reading id p13, Degree 1, and the Edges table "23 edges"
with the emails counts as numbers.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty (`setup: []`). Tool commit `753bae997bc6`, no uncommitted
changes.

## The answer against the key

- **Both files in, drawn (right).** `07.png`: Tables list "Nodes: people.csv / 12 rows" and "Edges:
  messages.csv / 23 rows, 1 left out", from/to guessed right. `14.png`: the graph "people and
  messages", "From 2 files", drawn.
- **Unmatched row (right, found with no detour).** `08.png`: line 24, `p11 | p13 (no node row) | 6`,
  caption "1 unmatched row: p13 has no node row". Dana read it off the summary line on the first
  screen after the second file and named it in her wrap-up with the sender and the count.
- **Add chosen, and read correctly.** The key asks graders to record anyone who reads "Add" as
  chosen when it is not. Dana clicked Add and checked the result in words: the heading turned to
  "people and messages: 13 nodes, 23 edges", both table checks went green and the summary read "the
  load makes 13 nodes and 23 edges" (`09.png`). Her expectation (p13 becomes a bare node) matches
  what loaded (`16.png`: p13 with blank name and team).
- **Counts (right for her choice).** 13 nodes, 23 edges, stated from the Overview and both tables
  (`14.png`, `15.png`, `17.png`).
- **Work kept.** `work.json` has no start list (empty start); the end list holds the one source
  "people.csv and messages.csv" and the two default style layers. Nothing to lose.

## Measures

- **Route:** the key's success path through Load (No thanks, New from data..., choose a file with
  people.csv, the "+" ("Add a table"), File... with messages.csv, Show the 1 unmatched row, Load),
  with Add instead of Leave out. She did not open the Data page's Sources list after Load; she
  checked instead through the table under the drawing and the find box.
- **Steps:** 18 `real.mjs` steps after the start. The key's path to Load is 7; she added a hover on
  the "+" (1), Add (1), four steps setting the weight (10 to 13), and five checks after Load
  (table, scroll, Edges tab, search, click p13).
- **Off-task stop (recorded, as the key asks):** she stopped to make emails the weight ("Weight:
  emails", "Higher means: Closer", steps 10 to 13). Not part of the task; it changed nothing the
  grade depends on, and the Overview shows "Loaded weight emails (closer)".
- **Wrong turns:** 0. Step 06 (`--click "Add a table" --upload messages.csv`) opened the "+" menu
  instead of a file picker, which is the key's own next step, not a wrong direction. Step 10 was an
  ambiguous tool click that changed nothing (two controls share the name "emails").
- **False "done":** none. "13 people and 23 links ... every message row arrived, including the one
  that did not match" is true on `14.png` and `17.png` given her Add choice. truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none. The preview's 13 / 23 equals the Overview's 13 / 23.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Scripted exit:** not applicable; Dana finished.
- **Void:** no. The end check printed "VOID: the participant opened a studio file,
  .../design/ui/studio/tool (Bash)" and `leaks.json` lists one leak, "a studio file", for the tool
  folder. The transcript's tool calls show no read of any file under the tool folder or any other
  studio file: every Bash command naming that folder is a `node design/ui/studio/tool/real.mjs`
  call, the form the briefing gives (its line 312 and the `T=design/ui/studio/tool` example), and
  every Read is the briefing or a session screenshot. The check matched the folder's path inside the
  briefed command line. That is a false positive in the leak check, not a leak, so the session
  stands. The leak check should stop flagging `real.mjs` invocations.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                    | Evidence                                                                                              |
| --- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | findability   | The drawing shows no names, so a reader cannot check which person is which, or find the unmatched p13, from the picture. Dana guessed p13 from the layout and needed the table, a scroll and the find box (four steps) to confirm it.                       | `14.png` (unlabeled nodes); transcript steps 14 to 19; wrap-up "no names on the circles"              |
| 2   | 1        | defaults      | A column of counts comes in as a plain attribute with "Weight: none (each edge counts 1)" and nothing suggests making it the weight; Dana stopped to do it herself and said she would have missed it.                                                       | `07.png`, `09.png` ("Weight: none"); transcript steps 9 to 13; wrap-up                                |
| 3   | 1        | wording       | "Higher means: Not set / Closer / Farther / Capacity": "Capacity" meant nothing to her for emails; only the sentence after choosing "Closer" settled it.                                                                                                   | `12.png`, `13.png`; transcript step 12 and "What confused or bothered me"                             |
| 4   | 1        | layout        | The table under the drawing shows only four rows at a time, so finding p13 among 13 nodes took a scroll.                                                                                                                                                  | `15.png`, `16.png`; transcript steps 15 and 16                                                        |
| 5   | 1        | expectation   | The bare "+" beside Tables opens a menu (File..., From a URL..., Paste...) rather than a file picker; one extra click, noticed as minor.                                                                                                                   | `05.png`, `06.png`; transcript step 6                                                                 |
| 6   | 1        | legibility    | The small gray labels on the import page ("Each row is", "text", "whole number", the drop-zone text) are hard to read.                                                                                                                                     | `03.png`, `07.png`; transcript step 3 and wrap-up                                                     |
| 7   | 1        | accessibility | Two controls on the edge table share the accessible name "emails" (the column's header button and the "Role of emails" box), so a click by name was ambiguous and did nothing.                                                                            | `10.png` (unchanged from `09.png`); transcript steps 10 and 11                                        |
| 8   | 0        | tool          | The session's leak check flags the briefed `real.mjs` command as opening a studio file because the command's path contains the tool folder. No file was read; the check needs to tell an invocation from a read.                                           | `leaks.json`; transcript "End"; tool calls in the session transcript                                  |
