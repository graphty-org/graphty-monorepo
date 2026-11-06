# Session r1-s25 -- Grace, returning

## Step 01 (start)
Command: REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <folder> setup:volunteers-thanks.txt
Screenshot 01.png. Grace: "Okay, the thank-you project is open. Top bar says 14 of 24 nodes, 22 of 63 edges, so something is narrowing it -- that's the 10-hour rule. There's a 'Staff' layer, orange, 4 people, 'role staff'. First I need to find where the 10 hours lives. There's a funnel icon next to the count at the top -- I'll try that."

## Step 02
Command: --step <folder> --click-at 223,20  (the funnel button "Filter: 14 of 24 nodes ... showing only trained Yes, hours 10 or m...")
Screenshot 02.png. Grace: "It took me to the Data place, where I narrowed things last month. Under Filters there's one card, 'trained Yes', 14 of 24. The tooltip said it includes hours 10 or more, so the hours rule must be inside that card. I'll click the card."

## Step 03
Command: --step <folder> --click-at 160,375
Screenshot 03.png. Grace: "There it is: 'trained Yes' and 'hours min 10'. Plain enough. There's an Edit button on the card -- I'll press Edit to change 10 to 20."

## Step 04
Command: --step <folder> --click "Edit"  -> ambiguous (Edit trained Yes / Edit Which nodes), nothing happened. 04.png.
Grace: "Clicked the wrong-ish thing; I'll point at the Edit on the filter card itself."

## Step 05
Command: --step <folder> --click "Edit trained Yes"
Screenshot 05.png. Grace: "A big editor opened: on the left, 'trained Yes' and 'hours min 10' as two rows; the right side shows the 'trained' / 'Yes' condition, and a table below with hours. I'll click the 'hours min 10' row to change it."

## Step 06
Command: --step <folder> --click-at 390,164  (treeitem "hours min 10, 14 of 24 nodes so far")
Screenshot 06.png. Grace: "Now the right side shows hours, By value, a slider from 2 to 52 and two boxes: 10 to 52. Just like a min/max in Excel. I'll click the 10 box, select it and type 20."

## Step 07
Command: --step <folder> --click-at 1203,304 --key Control+a --type "20" --key Tab
Screenshot 07.png. Grace: "The row now reads 'hours min 20' and the count went from 14 to 10 of 24 (13 of 63 edges). The table starts at James Carter 48, Aisha 22, Priya 31... all 20 or more. Good. I'll press Done."

## Step 08
Command: --step <folder> --click "Done"
Screenshot 08.png. Grace: "Filter card says 'trained Yes, hours min 20'; top bar 10 of 24 nodes, 13 of 63 edges. First half done. Now the orange: the Staff layer on the right says 'Which nodes: role staff, 4 of 10'. I need to add 'or 30 hours and up'. There was an 'Edit Which nodes' button earlier -- I'll use that."

## Step 09
Command: --step <folder> --click "Edit Which nodes"
Screenshot 09.png. Grace: "Same kind of editor for the Staff layer: 'role staff', 4 of 10 -- James Carter, Hannah Weiss, Ken Ito, Ben Adler. Up top there are 'Condition...' and 'Or...'. I want staff OR 30 hours, so 'Or...' sounds exactly right."

## Step 10
Command: --step <folder> --click "Or..."
Screenshot 10.png. Grace: "It made group A (role staff, 4) 'or' group B (0), and opened a list of columns. 'hours, 2 to 52' -- that's the one. Click hours."

## Step 11
Command: --step <folder> --click-at 946,268  (option "hours, 2 to 52")
Screenshot 11.png. Grace: "Group B is now 'hours' with a slider 2 to 52 and boxes 2 to 52. It says '0 so far', which is a bit odd since 2 to 52 is everybody, but maybe it waits for me. I'll put 30 in the first box."

## Step 12
Command: --step <folder> --click-at 963,274 --key Control+a --type "30" --key Tab
Screenshot 12.png. Grace: "Now 'hours min 30', B says 6, A 4, and the header says Staff 6 of 10. The staff all have 40+ hours so they're in both; the new ones are Priya Nair (31) and Lucy Grant (35). 6 of 10, no match 4 -- adds up. Done."

## Step 13
Command: --step <folder> --click "Done"
Screenshot 13.png. Grace: "Back to the map. Filter card: trained Yes, hours min 20, 10 of 24. Top bar: 10 of 24 nodes, 13 of 63 edges. Staff layer: A role staff (4) or B hours min 30 (6); the legend box says 'Color: Staff, 6 of 10 nodes'. Autosave says saved, and the corner says Local only. That's it."

## Wrap-up (in character)
- Finished: yes. The picture now has 10 people (trained, 20 hours or longer), and 6 of them are orange (the 4 staff plus Priya Nair at 31 and Lucy Grant at 35 hours).
- Ease: 6 of 7. The funnel next to the count took me straight to the filter, and 'hours min 10' was plain words I could change like a cell. 'Or...' did exactly what I meant.
- What confused me:
  - Pressing 'Edit' was ambiguous -- there were two Edit buttons (the filter card and the Staff layer) on screen at once; I had to aim for the one on the card.
  - When I first picked 'hours' for the new group it said '0 so far' while the boxes read 2 to 52, which would be everybody. It only counted once I typed 30.
  - The groups are called 'A' and 'B' and the legend still says 'Color: Staff' even though it now includes the 30-hour volunteers. For the board I'd want to rename it to something like 'Staff and 30+ hours'; I didn't look for where to rename it.
  - Small thing: the group colors in the editor (green/brown) are not the orange the people actually get, so for a moment I wondered whether I'd changed the color.

## Follow-up
Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Grace: "2. Mostly calm -- the funnel next to the count took me right to the filter, and 'hours min 10' read like a cell I could change. The moment I was least sure was right after I clicked 'Or...' and picked 'hours' for the new group. The Staff editor showed group A, 'role staff, 4', 'or' group B, and B had the hours slider with the two boxes reading 2 to 52 -- which is everybody -- but next to it it said '0 so far'. I didn't know whether it was broken, whether I had to press something to apply it, or whether it was waiting for me to type. I guessed and typed 30, and only then did it count 6. A close second was a minute earlier: I pressed 'Edit' and nothing happened, because there were two Edit buttons on screen at once (the filter card and the Staff layer) and I had to work out which one was the filter's."
