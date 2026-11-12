# Session r1-s14 -- Maren, checking the gauge list

Task: before passing the gauge list on, check whether the program thinks anything in it looks wrong; fix what it can fix; say what it found and what changed.

## Step 0 -- start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../design/ui/studio/tool/real.mjs --start .../r1-s14 setup:gauges.txt`

01.png: Gauge list is open. 11 nodes, no edges (fine, it's just the gauge list). The source row says "gauges..." with a blue 11 and a warning triangle with 3. The table also has warning triangles on depth_cm and station, and a chip "With issues 11". G07 depth is "-". So the program does think something is off. In Cytoscape I'd have to eyeball this myself. I'll click the warning 3 on the source first.

## Step 1
Command: `--step ... --click-at 232,134`
02.png: An "Issues in gauges.csv" panel. Three things, each with a count and a fix button:
- depth_cm: 1 not a number -> "Make blank" / Ignore (that's G07's "-", which is just a missing reading)
- station: 1 value with padded spaces -> "Trim" / Ignore
- telemetry: 11 values could be yes/no -> "Read as yes/no" / Ignore
That's what I want: counts, not "check your key column". Also glad it did NOT touch code (0041 kept its leading zeros) -- Excel would have eaten those. The "-" really is a missing depth, so Make blank is right.

## Step 2
Command: `--step ... --click "Make blank"`
03.png: depth_cm is now a number column (# icon, right-aligned), G07 is blank, warning count went 3 -> 2, "Resolved 1" shown. Good, and Undo is lit at the top. Next: trim the padded station name.

## Step 3
Command: `--step ... --click "Trim"`
04.png: Station trimmed, count 1 left, "Resolved 2". Last one: telemetry, "11 values could be yes/no". I can't see the telemetry column -- it's off to the right of the table. Before I let it convert anything, I want to see what's actually in there (if it's "Y"/"N" fine; if it's something else I don't want it guessed). I'll close the issues panel and scroll the table right.

## Step 4
Command: `--step ... --click "Close" ` (issues panel X) then drag the table's scrollbar right
05.png: Now I can see telemetry: plain "yes"/"no" text, with a warning triangle in the header. That's honestly a yes/no column, so reading it as yes/no is correct. I'll click the triangle on the telemetry header and see if the fix is offered there too.

## Step 5
Command: `--step ... --click-at 1145,509`
06.png: Same fix offered right at the column: "11 values could be yes/no -- Read as yes/no / Ignore / Show rows / Ignore all". Values are all yes or no, so I'll read it as yes/no.

## Step 6
Command: `--step ... --click "Read as yes/no"`
07.png: telemetry now shows Yes/No with a different (yes/no) icon, the warning on the source is gone (just "gauges.csv  11"), and the "With issues 11" chip on the table is gone too. Autosave says saved. Nothing left flagged. I'm done.

## Wrap-up (in character, Maren)

Did I finish? Yes.

What the program found in the gauge list (3 issues, shown as a count on the source and on each column):
1. depth_cm: 1 value that was not a number (G07 Stone Weir had "-"). I chose "Make blank" -- it's a missing reading, not a zero. depth_cm is now a proper number column, G07 is blank.
2. station: 1 value with padded spaces. I chose "Trim".
3. telemetry: 11 values that could be yes/no (they were the text "yes"/"no"). I checked the column first, then chose "Read as yes/no"; it now shows Yes/No.
Things it left alone, correctly: code keeps its leading zeros (0041 etc.), installed stays as written dates. Nothing was dropped -- still 11 gauges.

Ease: 6 out of 7. One click on the warning count gave me a list with counts and a fix button each, and each fix updated the count and the table right away with Undo available. That's what I never get in Cytoscape.

What confused me / what I'd want:
- The telemetry column was off-screen to the right on my laptop, so I couldn't see what "11 values could be yes/no" meant until I scrolled the table. The issues panel doesn't show a sample value; "Show rows" only exists in the column's own popup, not in the source's list.
- The issues list said which rows only by count ("1 not a number"); I had to find G07 myself. A row id next to the one-off issues would help.
- No obvious record of what I changed that I could hand to my colleague with the file ("Resolved 2" disappears once everything is fixed). For a methods note I'd want that list.
- Small thing: the side panel still says "Direction: Directed" for a list with no edges; not wrong, just odd.
