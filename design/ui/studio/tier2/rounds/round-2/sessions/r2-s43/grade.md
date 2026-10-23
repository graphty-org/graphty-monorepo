# Grade: session r2-s43 -- Dev (returning class-project student), office (T4 A), two spreadsheets as one network

**Grade: S** (success). Both files are in one graph, the counts are stated, and the unmatched row
is named. Dev read the import report, opened "Show the 1 unmatched row" (`06.png`: line 24,
`p11 -> p13 (no node row)`, 6 emails, caption "1 unmatched row: p13 has no node row"), kept
"Leave out", and loaded. After Load the Overview reads Nodes 12, Edges 22, Directed, Density
0.1667, Components 1, "From 2 files" (`07.png`). The last screen (`09.png`) is the Data page:
the source row "people.csv and messages.csv / 12 nodes, 22 edges" with people.csv, messages.csv
and "1 row left out" (red-orange warning triangle) under it, and node p12 selected in the inspector
(name Lars Nilsen, team Director, Degree 6). In the wrap-up Dev names the row: messages.csv,
p11 (Kemi Bello) to p13, 6 emails, p13 not on the staff list, left out, so 23 rows became 22
links.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: empty, no setup. Not void: every step produced its screen and the log has no
errors.

## The answer against the key

- **Counts (right for the Leave out path).** 12 nodes, 22 edges, on the import page (`06.png`:
  "12 node rows and 23 edge rows read; the load makes 12 nodes and 22 edges."), the Overview
  (`07.png`) and the Data page source row (`08.png`, `09.png`). `work.json` agrees: one source,
  "people.csv and messages.csv", no runs, only the two default style layers.
- **Unmatched row named (right).** Line 24, p11 to p13, 6 emails, p13 missing from people.csv.
  Dev also named the sender (Kemi Bello) from the sheet.
- **Not a wrong answer.** Not `false-done`: "both sheets are in as one network ... 12 people,
  22 links" with the left-out row stated, which is what the screen shows. Not `never-found`: the
  second file came in through the "+" beside Tables. Counts right.
- **Extra check (correct).** Dev verified p12's degree of 6 against the sheet by hand; the
  inspector shows Degree 6 (`09.png`).

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`). The success path is about
  8 (No thanks, New from data, choose people.csv, Add a table, File messages.csv, Show the
  unmatched row, Load, Data). Dev reached the Data page through the blue "From 2 files" link
  instead of the "Data" rail button, which is an equal route. 1.0x.
- **Wrong turns:** 0.
- **"Add a table" found:** yes, first try, by clicking the bare "+" (`04.png`), not by hovering it.
  Dev said the "+" has no words and its name was known only after the click.
- **Report read before Load:** yes, including the unmatched row.
- **Left-out row seen after Load:** yes, the "1 row left out" row in Sources (`08.png`); its
  inspector was not opened, which the task does not need.
- **False "done":** none. truth_on_screen holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Work kept (bar 2):** nothing to lose. Start was empty.
- **Silent commit:** none.
- **Numbers that disagree:** none. Import page, Overview and Data page agree on 12 and 22.
- **Mis-clicks on "File settings" / "CSV auto":** none.
- **Clicked "12 node rows" / "23 edge rows":** no.
- **Stopped to add names or set the weight:** noticed both, did neither.
- **Scripted exit:** no.

## Problems

1. **The "Add a table" control is a bare "+" (severity 1).** `03.png`, `04.png`: the only way
   to add the second file is an unlabeled "+" beside "Tables". Dev guessed it from the word
   "Tables" and clicked it; "I only knew it was 'Add a table' after clicking." Found first try, so
   it cost nothing here, but a reader who does not guess can load one file and stop (the key's
   `never-found` trap: Load is enabled with 0 edges and nothing warns).
2. **"New from data..." against "Open project or file..." does not say which one takes two
   files (severity 1).** `01.png`, `02.png`. Dev's history used "Open" for one sheet; Dev chose
   "New from data..." by the wording and was unsure until the "Tables" list and its "+" appeared.
3. **"Weight: none (each edge counts 1)" beside an emails count column (severity 1, outside the
   task).** `05.png`, `06.png`. Dev: "I wondered if I was supposed to make that the weight.
   Nothing told me whether that matters for 'every link arrived'." Left as is; the key records
   this line. It did not change the answer.
4. **No names on the drawing, and the node inspector is headed by the id (severity 1).**
   `07.png`, `09.png`: plain spheres; the inspector heading reads "p12" with "Lars Nilsen" a row
   below. Dev: "to check people arrived I had to click them one at a time." The key notes that
   name is an attribute, not the label, by default. Outside the question the task asks.
5. **"Direction: As the file says" does not say what it will choose (severity 0).** `06.png`:
   Dev learned it meant Directed only after Load (`07.png`). No effect on the answer.

## Build-level notes for the round

- No implementation fault was hit: every click landed, every screen matched the answer key's
  description of this build, and the participant's problems are wording and labeling, not defects.
- Simulated participant: a returning user's briefing, not a memory. A pass here is weak evidence
  until a real person confirms it. Keyboard and screen-reader access were not tested by this
  session.
