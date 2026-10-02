# Grades: add the April transfers, which turn out to be unreadable

The task as given: "Bring the April transfers you were just sent into this project alongside
March's. The data on screen is a sample: one month of card and bank transfers between accounts."

The intended path: the "+" beside Sources opens the Data page with the April spreadsheet, and the
Data page refuses it as unreadable. The problem block says what went wrong ("Lines 2 and 5 have 5
columns where the header has 4: an amount holds a comma.") and what to do ("Quote the amounts in
the file, or choose Semicolon in File settings if the file uses it."), and Load stays off.

Grading rule: success means the participant reached the refusal and could state both lines in
their own words. Success with difficulty means they retried before reading the message. Failure
means they believed it loaded or could not say what to do next. Grades go by what was on screen at
the end and what they concluded, not by how they rated themselves.

## The refusal could not be reached

No participant ever saw the refusal, and none could have. In the skeleton, "+" then File... then
"Data file: CSV, JSON, GEXF or GraphML" opens the Data page with a clean, readable copy of the
March transfers file (transfers-2026-03.csv, 9,113 rows, Load enabled). "Set collection..." opens
the same screen. The screen with the refusal exists in the skeleton but no click leads to it from
this start. The stand-in file chooser also offers only one data file, so nobody could pick an
"April" file.

So this task tells us nothing about whether the refusal message is understood. It has to be run
again with File... leading to the refusal, and with the chooser naming the April file, before
anything is concluded about the problem block.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Fraud analyst | gave up | gave up (the skeleton led nowhere) | Found the Sources "+" by hovering ("Add data to this graph"), took File... and the data file, and got March's file under the heading "Open as a new graph". She tried the March file's edit screen and its "Add a table" (a toast, "Opens the file picker", and nothing else), the unnamed dots on the source row, "Set collection..." and the project menu. Then she pressed Load and saw "Reading transfers-2026-03.csv, 3,000 nodes, 9,113 edges" over an emptied canvas with the filter chip showing "Full graph" (18.png). She concluded correctly that this was March loading again, not April, and stopped. She never thought April had loaded. |
| Alert reviewer | gave up | gave up (the skeleton led nowhere) | Same route to the same March import screen (05.png). She would not press Load because the heading contradicted the button she had pressed and the chip had gone from "812 of 3,000 nodes" to "Full graph". She also tried "Add a table" (toast only), "Set collection..." (the same screen) and the project menu, and stopped at about the length of one alert. She ended on the project menu (15.png) and correctly concluded that April was not in. |
| Analyst Alex | gave up | gave up (the skeleton led nowhere) | Same route (05.png). He read the March dates in the preview, "nodes of type node" and the "Full graph" chip, and refused to press Load ("a second copy of March in a new graph"). He found the edit screen with both tables by clicking the file name, called it "the right place", and hit the same "Opens the file picker" dead end there twice. He ended on the project menu (15.png) and correctly concluded that April was not in. |

Totals: 0 success, 0 success with difficulty, 0 failure, 3 gave up. The skeleton caused all three:
none of them had a path to the April file. None concluded wrongly. All three knew that nothing new
had loaded, and the one who pressed Load recognized it as March again.

Ease scores: 2, 2, 2 out of 7. These rate the dead end, not the refusal message, which nobody saw.

## Design findings that hold up anyway

These come from parts of the screen that are real design, not stand-ins. Each was raised by all
three participants on their own unless noted.

1. **The heading contradicts the menu item (3 of 3, severity 3, major).** "Add data to this graph"
   opens a screen headed "Open as a new graph". All three stopped there and lost trust in what
   Load would do. Two refused to press it for that reason.
2. **The view chip changes as the import screen opens (3 of 3, severity 3).** "812 of 3,000 nodes"
   became "Full graph" before anything was loaded. Everyone read that as their filter being
   thrown away. The one who pressed Load saw the canvas emptied with the chip still on "Full
   graph", with no warning first.
3. **There is no way to say "more rows of the same table" (3 of 3, severity 3).** All three
   described the job as appending April's rows to the existing transfers table, with the same
   accounts matched up. Nothing on the import screen or the edit screen offers that. The import
   maps ids to "nodes of type node" instead of the existing accounts, and "Add a table" reads as a
   separate April table. Two of the three said a match report ("matches your transfers table: N
   new rows, M accounts already present") would have finished the job in a minute.
4. **"Set collection..." means nothing (3 of 3, severity 2).** None of the three could guess what
   it was, and it led to the same screen as File....
5. **The dots on a source row have no name (2 of 3, severity 2).** Hovering "More" found the
   graph panel's "More actions", not the row's menu. Neither participant learned what the row
   menu offers.
6. **The edit screen is found only by accident (1 of 3, severity 2).** Alex called the edit
   screen, which shows both tables and the account-to-account line, the right place to add a
   month, but he reached it only by clicking the file name.

"Add a table" then File... showing only the toast "Opens the file picker" is a stand-in limitation
and is not counted as a design finding. Neither is the chooser offering the March file.

## What has to change before this task is run again

- File... then the data file (and "Set collection...") should lead to the refused April
  spreadsheet, not to a clean March file, and the stand-in chooser should name the April file.
- Fix the heading contradiction first, or the rerun will measure it again instead of the
  refusal: all three stopped at it before they looked at anything else on the screen.
