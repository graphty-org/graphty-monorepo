Grade: S
False done: 0
Wrong turns: 0
Steps: 6 (path steps: 4 with Read as yes/no; 2 more to scroll the table to the telemetry column and reopen the issue list the scroll had closed)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 15 calls checked over 1 transcript)

# r1-s16 -- T67 B, Tom (returning user), build 79ed770292

## Result

The last screenshot (06.png) shows gauges.csv in Data with the issue list open: "Issues in
gauges.csv", Issues, "Resolved 3". The table above it no longer has the "With issues 11" button, no
column header carries a warning mark, G07 Stone Weir's depth_cm cell is empty, depth_cm is a number
column (`#`, values right-aligned) and telemetry reads Yes / No. `data.json` agrees: depth_cm is
`integer`, telemetry is `boolean`, station is text, and the source still holds 11 nodes. Station's
padded value (Willow Run) cannot be seen in a picture, but the issue was resolved by Trim in step 3
(03.png: the station mark is gone and the count by the file dropped from 3 to 2).

The participant's report names all three issues the key lists -- depth_cm 1 not a number (Stone
Weir, "-", made blank), station 1 value with padded spaces (trimmed), telemetry 11 values could be
yes/no (read as yes/no) -- and says what was changed for each. Every part of the success
definition holds, including the optional yes/no fix: S.

## Route against the success path

The path is Data (already showing) > the source row's issues chip > Make blank > Trim > Read as
yes/no (4 steps). The participant took:

1. The chip "3 issues in gauges.csv" (02.png: the three issues, each with its fix and Ignore).
2. Trim (03.png: station resolved, chip 2).
3. Make blank (04.png: depth resolved, G07's depth empty, chip 1).
4. Dragged the table's scrollbar to see the telemetry column before changing it (05.png). The issue
   list closed when the table was dragged.
5. and 6. The chip again ("1 issue in gauges.csv") and Read as yes/no (06.png: Resolved 3).

Steps 4 and 5 are off the path but were not taken back or abandoned: looking at the column before
applying a change to it is a reasonable check, and the reopen was forced by the list closing. No
wrong turn. 6 steps against a path of 4 is within bar 7's path plus 3.

The participant said done when the screen showed every issue resolved: no false "done"
(truth_on_screen: "Resolved 3" and no warning mark left on any column).

## Problems

1. **Severity 2, build defect -- a warning mark with "0" stays on the source row after every
   issue is fixed.** 06.png shows the yellow triangle and 0 next to gauges.csv, read as the button
   "0 issues in gauges.csv". The participant: "A warning sign with nothing in it makes me look
   twice -- is there still something wrong or not?" He trusted the list's "Resolved 3" instead.
   Repro: `repro/r1-s16-script/repro.sh` (output in `repro/r1-s16/`): 04.png and 05.png show the
   mark with 0 after Trim, Make blank and Read as yes/no, and the step log lists
   "button 0 issues in gauges.csv".
2. **Severity 2, build defect -- dragging the table's scrollbar closes the open issue list.** In
   step 4 (05.png) the participant wanted to see the telemetry column next to its fix; the list
   closed, and he had to reopen it (one extra step). Repro: the same script, 03.png -- the list
   shown in 02.png is gone after the drag, with the chip still "3 issues in gauges.csv".
3. **Severity 2, behavior -- the source row's issue list does not say which rows an issue is
   in.** 02.png: "1 not a number" and "1 value with padded spaces" name no row and offer no way to
   show it from this list (the column header's mark offers Show rows; this list does not). The
   participant found Stone Weir's "-" by reading the table, and could not find the padded station
   at all ("I couldn't see any spaces in the table, so I just trusted it").
4. **Severity 1, wording -- nothing says whether a fix changes the file on disk or only the
   project.** After Make blank (04.png) and at the end (06.png) the screen gives no sign either
   way; the participant would ask before sending the list on.
