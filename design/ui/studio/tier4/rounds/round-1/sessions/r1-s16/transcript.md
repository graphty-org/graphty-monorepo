# Session r1-s16 -- Tom, the recipe recipient (returning user)

Task: before passing the gauge list on, check whether the program thinks anything in it looks wrong; fix what it can fix for me; report what it found and what I changed.

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../design/ui/studio/tool/real.mjs --start <session folder> setup:gauges.txt
Screenshot: 01.png
Notes (Tom): The gauge list is open, eleven dots, a table underneath. "Local only" at the bottom right -- good, so nothing leaves my laptop. Next to gauges.csv on the left there is a warning triangle with a 3, and the table has a "With issues 11" button and warning triangles on depth_cm and station. That looks like the program is telling me something is wrong. I'll click the triangle with the 3 first.

## Step 2
Command: --step <folder> --click-at 232,134   (printed: button "3 issues in gauges.csv")
Screenshot: 02.png
Notes (Tom): A box "Issues in gauges.csv" with three lines: depth_cm "1 not a number" (Make blank / Ignore), station "1 value with padded spaces" (Trim / Ignore), telemetry "11 values could be yes/no" (Read as yes/no / Ignore). That's what I was asked to find. Padded spaces sounds harmless to fix, so I'll press Trim first.

## Step 3
Command: --step <folder> --click Trim
Screenshot: 03.png
Notes (Tom): The station line went away, the count by the file went from 3 to 2, and it says "Resolved 1". The warning on the station column is gone too. Good, that told me it did something. Next, depth_cm "1 not a number": in the table G07 Stone Weir has a "-" for depth, which to me just means nobody had a reading. Blank seems right for that, so I'll press Make blank.

## Step 4
Command: --step <folder> --click "Make blank"
Screenshot: 04.png
Notes (Tom): "Resolved 2", count by the file is 1 now. G07's depth is empty in the table and the depth column now has a # and the numbers sit to the right, like numbers in Excel. Last one is telemetry, "11 values could be yes/no". I can't see a telemetry column -- the table is cut off on the right. Before I let it change something I haven't looked at, I want to see what's in that column. I'll slide the table over with the scrollbar at the bottom.

## Step 5
Command: --step <folder> --drag 600,868 1150,868
Screenshot: 05.png
Notes (Tom): The issues box closed when I moved the table. Telemetry column is just "yes" and "no" in every row, so having it read as yes/no is what it already is -- that's fine with me. The code column kept its zeros (0041), which I'm glad of after the SEPT business. I'll open the warning by the file again (it says 1 now) and press "Read as yes/no".

## Step 6
Command: --step <folder> --click-at 232,134 --click "Read as yes/no"
Screenshot: 06.png
Notes (Tom): The box now just says "Resolved 3", the "With issues 11" button above the table is gone, and telemetry shows "Yes"/"No" with capitals. Autosave says saved, and it still says Local only. One odd thing: next to the file there is still the yellow warning triangle, now with a 0 beside it. A warning sign with nothing in it makes me look twice -- is there still something wrong or not? The box says resolved, so I'll take the box's word for it. I'm done.

## End of session (in character)

Did I finish? Yes.

What the program found in the gauge list (3 things):
1. depth_cm: 1 value that was not a number -- Stone Weir (G07) had a "-". I pressed Make blank, so its depth is now empty.
2. station: 1 name with extra spaces around it. I pressed Trim.
3. telemetry: all 11 values could be read as yes/no. I scrolled over to check the column was really just yes and no, then pressed Read as yes/no.
After that it said "Resolved 3".

Ease: 6 out of 7. The triangle with the number by the file was the obvious place to click, each problem was one line with a button next to it, and the count went down every time I pressed one, so I knew it had done something.

What confused me:
- After everything was fixed, the yellow warning triangle stayed beside the file with a "0". A warning sign with zero next to it -- I wasn't sure at first if it was still unhappy.
- The issues box closed by itself when I moved the table to look at the telemetry column, so I had to open it again. I wanted to look at the column and the box at the same time.
- The box doesn't say which row the "not a number" was; I had to find the "-" in the table myself. Same for which station had the spaces -- I couldn't see any spaces in the table, so I just trusted it.
- I'm not sure whether "Make blank" changed the gauges.csv file itself or only this project. Nothing said. I'd probably ask her about that before sending it on.
