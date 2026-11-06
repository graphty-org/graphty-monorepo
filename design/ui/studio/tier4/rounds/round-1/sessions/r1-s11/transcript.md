# Session r1-s11 -- Dana Okafor (returning user)

Task: show only volunteers who are trained and gave 10+ hours (without deleting anyone), then mark the staff members among them as "working with now". Report count in picture and count marked.

## Step 0 -- start
Command: REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> setup:volunteers.txt
Screenshot 01.png. The volunteer project is open: 24 nodes, 63 edges, orange dots colored by PageRank. Left: style layers (Hovered, Selected, Pinned, PageRank, Everything). Bottom toolbar has a funnel icon -- that looks like "filter", which is what I want. Nothing moving that I care about.

## Step 1
Command: --step --click-at 832,840 (funnel button "Filters")
Screenshot 02.png. It jumped me to the Data place with a "Filters" section and a list of columns: name, role (3 values), hours (2 to 52), trained (2 values), phone, PageRank. Good -- the columns I need are there. I'll pick "trained" first.

## Step 2
Command: --step --click-at 322,565 (option "trained, 2 values")
Screenshot 03.png. A "trained" card appeared under Filters with an empty dropdown. Nothing changed in the picture yet (still 24). Odd aside: above it says "Coordinates: phone" -- a phone number as coordinates? Not my problem today. I'll open the dropdown on the trained card.

## Step 3
Command: --step --click-at 180,407 (combobox "trained: how to match")
Screenshot 04.png. Options: Yes, No, Has a value, Has no value. Plain enough. Yes.

## Step 4
Command: --step --click-at 120,441 (option "Yes")
Screenshot 05.png. Now the top says "15 of 24 nodes, 25 of 63 edges", the card says 15 of 24, and there's a Select / Hide toggle with Hide on. Untrained people dropped out of the drawing -- and the full graph still says 24 nodes, so nobody was deleted. Good. Now hours. The card has "Add a condition" -- I'll use that so both apply together.

## Step 5
Command: --step --click "Add a condition"
Screenshot 06.png. Same column picker, "trained (already a condition)" marked. I'll pick hours (2 to 52).

## Step 6
Command: --step --click-at 135,625 (option "hours, 2 to 52")
Screenshot 07.png. Card now reads "trained, hours" with an hours "Between 2 to 52" slider and two boxes. I'll change the low box from 2 to 10 -- "10 hours or longer" means 10 counts.

## Step 7
Command: --step --click-at 125,541 --key Control+a --type "10" --key Enter
Screenshot 08.png. Now 14 of 24 nodes, 22 of 63 edges. Full graph still 24. I am not sure "Between 10 to 52" includes exactly 10 -- I'll check the table at the end. Next: the staff. That's a different job -- not hiding, marking. I see each filter card has Select / Hide. I'll add a second filter with the Filters "+" and set it to role = staff, Select.

## Step 8
Command: --step --click-at 276,351 (button "Add filter")
Screenshot 09.png. Column list again. Pick role (3 values).

## Step 9
Command: --step --click-at 315,509 (option "role, 3 values")
Screenshot 10.png. First card folded to one line: "trained is Yes and hours is between 10 and 52" -- nice, a sentence I can read back. New "role" card: Is any of, with checkboxes volunteer 16, staff 5, board 3 (counts for everyone, it seems). Tick staff.

## Step 10
Command: --step --click-at 85,542 (checkbox "staff, 5 nodes")
Screenshot 11.png. Whoa -- the picture dropped to 4 of 24. The new card defaulted to Hide, so it took everyone else away. Not what I want. I'll flip this role card to "Select".

## Step 11
Command: --step --click-at 208,500 (label "Select" on the role card)
Screenshot 12.png. Back to 14 of 24 nodes, 22 of 63 edges in the picture. The role card now says "4 of 14" and four dots have yellow rings. Right panel: "4 nodes selected", role staff (4), trained Yes (4), hours 40 to 52. So 5 staff overall, 4 of them pass the trained/10-hours cut, and those 4 are marked. Nobody deleted -- full graph still 24. Done; I stop here.

## Wrap-up (in character, Dana)
- Finished: yes. In the picture: 14 people. Marked (staff): 4.
- Ease: 6 of 7. The funnel button took me straight to filters, the column list showed me what's in each column (2 to 52, 2 values), and the folded card sentence "trained is Yes and hours is between 10 and 52" is exactly what I'd want to paste on a slide.
- What confused me:
  - A new filter card defaults to Hide. My second card wiped the picture down to 4 before I noticed the Select/Hide switch. The switch is small and grey; "Select" in light grey text is easy to miss with my eyes. It would help if the card asked "hide or mark?" or if the default were obvious.
  - I was not sure "Between 10 and 52" counts someone with exactly 10 hours until I read the folded sentence -- and even that says "between", not "10 or more". I'd prefer "at least 10".
  - The counts next to volunteer/staff/board (16/5/3) are for the whole list, not for the 14 still showing; the card then says "4 of 14". Mixed bases -- fine once you read it, but I had to read twice.
  - "Coordinates: phone" in the Data panel looks like a mistake (a phone number as a location?). Didn't touch it, but it makes me wonder what else got guessed.
  - Small grey labels (Select/Hide, the per-value counts, "Add a condition") are hard to read at this size.

## Follow-up

Facilitator: "Would it have made any difference if you had done those the other way round? How can you tell?"

Looked again (13.png, a hover on the role card's "Select", nothing changed): top still "14 of 24 nodes, 22 of 63 edges"; trained/hours card "14 of 24", Hide on; role card "4 of 14", Select on; right panel "4 nodes selected", role staff (4), trained Yes (4), hours 40 to 52.

Dana: For what's on the screen now, I don't think it matters, and I can point to why. The role card counts "4 of 14", not "4 of 24" -- its base is the 14 left after the trained/hours card, so the marking sits on top of the hiding. And the selection panel says all 4 marked are trained Yes with 40 to 52 hours, while the role list says there are 5 staff overall. So the fifth staffer -- the one who fails the cut -- is not marked and not in the picture. If the order mattered in a bad way, I'd expect 5 selected, or a staffer with under 10 hours or untrained in that panel. I don't see that.

What I can't tell from here is the in-between. If I'd made the staff card first, I'd guess it would have marked all 5 staff, and then the trained/hours card would hide one of them. Is that hidden person still "marked" behind the scenes? Would the count say 5 selected or 4? Nothing on the screen tells me whether the cards apply in order or all together -- there's no "then" between them, no number on the cards. If I needed to be sure I'd swap them on a copy and compare the "nodes selected" count; if it read 5 while the picture showed 4 yellow rings, that's a hidden marked person, and I would not want that going into a report. Also, the way it went for me, my staff card started as Hide and wiped the picture down to 4 -- that was an order trap of a different kind, and doing it the other way round would have hit me the same way.
