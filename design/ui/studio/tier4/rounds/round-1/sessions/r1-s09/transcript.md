# Session r1-s09 -- Grace, returning

Task: show only volunteers who are trained AND gave 10+ hours (nobody deleted); then among those, mark the staff as the ones I'm working with, without removing anyone else. Report how many are in the picture and how many marked.

## Step 1 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../design/ui/studio/tool/real.mjs --start .../r1-s09 setup:volunteers.txt`
Screenshot 01.png. My volunteers map is open, colored by PageRank like I left it. Nodes 24, Edges 63. Okay. There's a funnel icon in the bottom toolbar -- that looks like a filter. I'll try that first.

## Step 2 -- Filters button
Command: `--step ... --click-at 832,840` (printed: button "Filters")
Screenshot 02.png. It jumped me to the Data place and opened a "Filters" list with a picker: role, hours, trained, phone... Good, plain column names from my spreadsheet. I'll pick "trained" first.

## Step 3 -- pick "trained"
Command: `--step ... --click-at 322,565` (printed: option "trained, 2 values")
Screenshot 03.png. A "trained" filter card appeared with an empty dropdown. Nothing changed on the map yet. I'll open the dropdown to pick yes/true.

## Step 4 -- open the trained dropdown
Command: `--step ... --click-at 180,406` (printed: combobox "trained: how to match")
Screenshot 04.png. Yes / No / Has a value / Has no value. Plain words, nice. Picking "Yes".

## Step 5 -- trained = Yes
Command: `--step ... --click-at 120,441` (printed: option "Yes")
Screenshot 05.png. Now it says "15 of 24 nodes, 25 of 63 edges" at the top and "Hide" is the mode -- the others are out of the picture but the full graph still says 24. Good, nobody deleted. 15 trained. Now the hours. There's "Add a condition" inside the same card -- I'll use that so both rules apply together.

## Step 6 -- Add a condition
Command: `--step ... --click "Add a condition"`
Screenshot 06.png. Same attribute list; it even says "trained (already a condition)". Picking "hours".

## Step 7 -- hours condition
Command: `--step ... --click-at 134,625` (printed: option "hours, 2 to 52")
Screenshot 07.png. Card is now "trained, hours", hours "Between 2 to 52". I'll change the 2 to 10 -- "10 hours or longer" means 10 counts.

## Step 8 -- hours from 10
Command: `--step ... --click-at 125,541 --key Control+a --type 10 --key Enter` (printed: input "hours from, number")
Screenshot 08.png. 14 of 24 nodes, 22 of 63 edges. Only one dropped, so most trained people did 10+. "Between" -- does it count exactly 10? I'd rather it say "at least". Let me look at that dropdown.

## Step 9 -- hours match options
Command: `--step ... --click-at 180,501` (printed: combobox "hours: how to match")
Screenshot 09.png. Between / Highest / Has a value / Has no value. No "at least". Between 10 and 52 it is. I'll close this and check the table to see if someone with exactly 10 is kept.

## Step 10 -- table
Command: `--step ... --key Escape --click-at 792,840` (printed: button "Table")
Screenshot 10.png. Table opened with "14 of 24 nodes", "Shown" selected. Everyone listed says Yes and 12+ hours so far. I want to see if anyone with exactly 10 was hidden -- I'll switch to "All".

## Step 11 -- All rows
Command: `--step ... --click-at 551,448` (printed: label "All")
Screenshot 11.png. Now 24 rows; the hidden ones are here too (Tobias 6 No, Leo 3 No, Omar 9 No). Hidden rows don't look different from shown ones, which is a bit confusing. I'll sort by hours to find anyone right at 10.

## Step 12 -- sort by hours
Command: `--step ... --click-at 688,509` (printed: button "hours")
Screenshot 12.png. Sorted highest first. Zara Ahmed, staff, 38 hours, trained No -- correctly out. Scrolling down to see the people around 10 hours.

## Step 13 -- scroll down
Command: `--step ... --wheel 740,750,500`
Screenshot 13.png. Nobody has exactly 10 hours (12, then 11 No, 9 No), so "Between 10 and 52" is fine either way. Paul Dubois is trained but only 5 hours -- that's the one that dropped from 15 to 14. Counts make sense: 14 in the picture.
Now the staff. On the filter card there's "Select" next to "Hide". I think a second filter on role = staff set to "Select" will mark them without hiding anyone else. Clicking the + next to Filters.

## Step 14 -- Add filter
Command: `--step ... --click-at 275,351` (printed: button "Add filter")
Screenshot 14.png. Same attribute list. Picking "role".

## Step 15 -- role filter
Command: `--step ... --click-at 314,509` (printed: option "role, 3 values")
Screenshot 15.png. New "role" card: "Is any of" with volunteer 16, staff 5, board 3. The first card folded up and now reads "trained is Yes and hours is between 10 and 52" -- nice plain sentence. Ticking "staff". I'm worried it'll hide everyone who isn't staff, so I'll watch the count.

## Step 16 -- tick staff
Command: `--step ... --click-at 85,542` (printed: input "staff, 5 nodes")
Screenshot 16.png. Oops -- as I feared, it hid everyone else: "4 of 24 nodes, 2 of 63 edges". The role card defaulted to "Hide". It says 5 of 24 on the card (Zara is staff but not trained), 4 on the map. I'll switch this card to "Select".

## Step 17 -- role card to Select
Command: `--step ... --click-at 208,500` (printed: label "Select")
Screenshot 17.png. Everyone came back: "14 of 24 nodes, 22 of 63 edges" at the top again, and four dots now have a yellow glow. The right panel says "4 nodes selected", role staff (4), hours 40 to 52, trained Yes (4). The role card says "4 of 14" -- so it only marked staff among the 14 showing, and Zara (untrained) stayed out. That's what I wanted. Done.

## Wrap-up (in character)
- Did I finish? Yes. 14 people are still in the picture (trained and 10+ hours; nobody deleted, the full graph still says 24), and 4 are marked -- the staff: Hannah Weiss, James Carter, Ken Ito, Ben Adler.
- Ease: 5 out of 7.
- What went well: the funnel button took me right to Filters; column names and choices were plain words (Yes / No, Between); "Add a condition" combined trained and hours in one card, and the folded card read back "trained is Yes and hours is between 10 and 52" -- I could paste that on a slide. The counts "15 of 24", then "14 of 24" were always in view, and "Full graph 24" reassured me nobody was deleted.
- What confused me:
  1. A new filter card starts on "Hide", so ticking "staff" wiped everyone else off the map (down to 4). I had to notice the small Select / Hide switch and flip it. The task literally said "without taking anyone else away" and the default did the opposite.
  2. For hours there's no "at least" -- only "Between", so I had to type 10 into the low box and leave 52 as the top. Would it still work next quarter if someone logs 60 hours? I'm not sure.
  3. Not sure if "Between 10 and 52" includes exactly 10; nobody had exactly 10 so I couldn't tell.
  4. In the table on "All", hidden people look the same as shown ones -- no dimming or mark -- so I had to work out who was out from the numbers.
  5. "Select" is the word for marking; I'd have called it "highlight" or "mark", but the yellow glow and the "4 nodes selected" panel made it clear.

## Follow-up

Facilitator: "Would it have made any difference if you had done those the other way round? How can you tell?"

(Looked at the screen again: 18.png, nothing changed.)

Grace: "Honestly, I think the picture would end up the same -- 14 people showing, and the four trained staff glowing -- but I'm not sure the count of marked people would be, and the screen doesn't let me prove it either way without redoing it.

Here's what I'm going on. The two cards are stacked, trained-and-hours on top, role underneath, and the role card says '4 of 14', not '4 of 24' or '5 of 24'. So the bottom card is only counting the people the top card left in. That tells me the cards work top to bottom, like steps in a recipe. And when I ticked staff it said 5 next to 'staff' in the list -- that's all five staff in the spreadsheet, Zara included -- but only 4 got marked, because Zara isn't trained and was already out.

If I'd done it the other way round -- marked the staff first, then hidden the untrained and under-10-hours people -- the role card would have been on top and would have marked all 5, Zara too. Then the hide card underneath takes Zara out of the picture. What I can't tell is whether she'd still count as 'selected' while she's hidden. If she did, the right panel would say '5 nodes selected' with only 4 glowing dots, and I'd have reported 5 to you -- which would be wrong for 'among those still in the picture'. Or maybe the program drops her from the selection when she's hidden and it says 4. Nothing on the screen tells me which; there's no note on the cards saying the order matters, and I don't see a way to drag them up or down to swap them.

So: probably the same picture, maybe a different number, and the only way I'd know is to build it the other way and read the counts. For the board I'd keep doing it the way I did -- narrow first, then mark -- because then the '4 of 14' on the card and the '4 nodes selected' on the right agree, and that's a sentence I can defend."
