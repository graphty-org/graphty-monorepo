# Session r1-s07 -- Dana Okafor (returning user)

Task: keep only board members and anyone with 30+ hours this quarter in the picture, without deleting anyone; report how many remain.

## Step 0 -- start
Command: `REAL_DIST=... REAL_TIER=5 node .../real.mjs --start <folder> setup:volunteers.txt`
Screenshot 01: the volunteers list is open, 24 people, colored by PageRank. Last month I narrowed the picture with a filter card in the Data place, so I will go there.

## Step 1
Command: `--step <folder> --click Data`
Screenshot 02: Data place. There is a "Filters" row with a plus. That is the filter card from last month. Clicking the plus next to Filters.

## Step 2
Command: `--step <folder> --click-at 275,333` (button "Add filter")
Screenshot 03: a "New filter" editor, with a list of columns: role (3 values), hours (2 to 52), trained... and a table underneath. Good, a table. I need "role is board" OR "hours 30+". Starting with role.

## Step 3
Command: `--step <folder> --click-at 1180,268` (option "role, 3 values")
Screenshot 04: role has checkboxes volunteer 16, staff 5, board 3. There is "Condition..." and "Or..." at the top -- "Or" is exactly what I need for the hours. Ticking board first.

## Step 4
Command: `--step <folder> --click-at 1143,235` (board, 3 nodes)
Screenshot 05: 3 of 24 -- Maria Lopez, Seun Okoro, Paul Dubois, all board, and their hours are low (12, 8, 5). So I need the "Or" part. Clicking "Or...".

## Step 5
Command: `--step <folder> --click-at 1238,100` (button "Or...")
Screenshot 06: now group A (role board, 3) "or" group B (empty, 0), and the column list is open again. Picking hours for group B.

## Step 6
Command: `--step <folder> --click-at 1186,268` (option "hours, 2 to 52")
Screenshot 07: a range 2 to 52 with two boxes; B still says "0 so far". Typing 30 in the left (from) box.

## Step 7
Command: `--step <folder> --click-at 1203,274 --key Control+a --type "30" --key Tab` (input "hours from, number")
Screenshot 08: B now reads "hours min 30", 7 people; total "10 of 24 nodes" at top. 3 board + 7 at 30 hours or more, no overlap since the board people all have under 30. "min 30" reads to me as 30 included. The card on the left still only says "role board" which is a bit misleading, but the count is right. Clicking Done.

## Step 8
Command: `--step <folder> --click Done`
Screenshot 09: back on the picture with 10 people showing. Right side says "Nodes showing 10 of 24", full graph still 24 -- so nobody was deleted. The filter card now spells it out: A role board 3, or B hours min 30 7. Done.

## End (in character)
- Did I finish: yes. 10 people are still in the picture (3 board members + 7 people with 30 hours or more; none of the board members had 30+ hours, so no overlap). The other 14 are hidden, not deleted (full graph still 24).
- Ease: 6 of 7. The filter card from last month was where I expected, "Or..." was right there and plain English, and the table under the picture showed me who was in which group, which is what I actually trust.
- What confused me:
  - The filter card's title stayed "role board" even after I added the hours part; on the left it looks like I only filtered board members until you open it up.
  - "hours min 30" -- I read "min" as "30 counts", but I would rather it said "30 or more" so I don't have to wonder about someone with exactly 30.
  - The "A" / "B" group letters and the "Group colors" button: I didn't ask for colors, and while editing the picture went green/orange; I wasn't sure if that would stick after Done (it didn't, which is fine).
  - Small grey text ("0 so far", "7 so far", "2 to 52") is hard to read without my glasses.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: while you were deciding who stays in the picture, what on the screen besides the drawing did you look at, and did it help or get in the way?"

Dana: 2. Mostly calm -- the Filters card was where I left it last month and "Or..." said what I needed.

Least sure: right after I picked "hours" for group B (screenshot 07). The right side showed a little bar strip and a slider from 2 to 52 with two boxes, "2" and "52", and "0 so far" in small grey next to the column name. B on the left still said 0 and the left card still said "role board". The picture still had only the three green board people. Nothing told me whether picking the column had done anything yet or which box to type into; I guessed the left box was "from". Typing 30 and tabbing out fixed it -- B went to 7 and the top went to 10 of 24 -- but for a second I wondered if the hours part was stuck on 0.

Besides the drawing: mostly the table under the picture -- Group, name, role, hours. That is what I actually trusted: I could read Maria Lopez, Seun Okoro, Paul Dubois, all board, hours 12, 8, 5, so I knew nobody would be counted twice. That helped a lot. I also watched the A/B counts in the middle list (3, 0, then 7, and "No match 21") and the "3 of 24 nodes" / "10 of 24" count in the top bar -- helpful, though the grey numbers are small for me. What got in the way: the "Group colors" / "Styled" buttons and the green/orange group colors -- I didn't ask for colors and wasn't sure they'd stick. And the card on the left still saying "role board" while I was adding hours made me second-guess for a moment.
