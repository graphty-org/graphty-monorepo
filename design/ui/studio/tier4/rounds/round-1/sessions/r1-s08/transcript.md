# Session r1-s08 transcript (Tom, lab manager, returning user)

## Start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../design/ui/studio/tool/real.mjs --start .../r1-s08 setup:gauges.txt
Screenshot: 01.png

Notes (Tom): The gauge list is open, 11 dots and a table underneath. The "installed" column has dates in it but the little "Aa" mark next to it looks like the other word columns (station, code). On the right there is a line "Time: installed" with a button "Set in Data". That mentions my column by name, so I'll try that first.

## Step 1
Command: --step <folder> --click "Set in Data"
Screenshot: 02.png
What happened: no message. On the left a new row "Time: installed" appeared, and the table's "installed" heading now has a little "Time" tag. A clock button showed up in the toolbar. But the heading still has the same "Aa" mark as the word columns. Did it actually understand they are days, or did it just label the column? Nothing said "done". 
Next: I'll click the "installed" heading to put them in order and see if the newest comes out on top.

## Step 2
Command: --step <folder> --click-at 1125,509   (the "installed" heading)
Screenshot: 03.png
What happened: sorted. Small grey line says "Sorted by installed, A to Z". 1995 at top. "A to Z" is what you say for words, not days, so I'm not sure it treats them as days -- though for these year-first dates it comes out the same either way. The bottom rows are cut off.
Next: click the heading again to get the newest on top.

## Step 3
Command: --step <folder> --click-at 1125,509   (the heading again)
Screenshot: 04.png
What happened: "Sorted by installed, Z to A". Top row is G10, Birch Hollow, 2018-06-27. So that's the newest. But it still says Z to A and the heading still has the "Aa" word mark next to "Time", so I can't tell if the program really took them as days or just sorted the text. That clock button that showed up after I pressed "Set in Data" might tell me.
Next: click the clock button in the toolbar.

## Step 4
Command: --step <folder> --click-at 812,391   (the clock button, "Timeline")
Screenshot: 05.png
What happened: a strip opened above the table: "Jun 30, 1995 - Jun 27, 2018, 11 nodes, 0 edges", with a tick for each gauge spread out along it. It wrote the days out as real dates with month names, so now I believe it knows they are calendar days. The last one, Jun 27, 2018, matches G10 Birch Hollow at the top of my sorted table.
I'm done. I did not press anything else.

## End (in character)
Did I finish? Yes. The newest gauge is G10, Birch Hollow, put in on 2018-06-27.

How easy, 1 (very difficult) to 7 (very easy): 5.

What confused me:
- Pressing "Set in Data" gave me no message at all. Things moved (a "Time" line on the left, a "Time" tag on the column, a new clock button), but nothing said "these are now dates". I had to go looking to be sure it worked.
- The column heading still shows the same "Aa" mark the word columns have, next to the new "Time" tag. So which is it, words or days?
- The sort line says "A to Z" / "Z to A", which is how you talk about words. For a date column I expected oldest/newest. It made me doubt the change took.
- Only the timeline strip, with "Jun 30, 1995 - Jun 27, 2018", convinced me. I found it by luck because a clock button appeared.
- "Set in Data" -- I wasn't sure if that would change the colleague's saved project for good. The undo arrow lit up, which was a small comfort. Autosave says "saved", so I suppose it did change the project; I'd have liked to be told.
