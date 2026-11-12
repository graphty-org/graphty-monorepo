# Session r1-s13 -- Grace, returning

Task: put just the five people who matter most in orange, leave everyone else as they are, and say who the five are.

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <folder> setup:volunteers.txt
Screenshot 01.png. The volunteer project is open: 24 nodes, 63 edges -- matches the volunteer list. Everyone is already shaded orange to dark brown by PageRank (my "who matters most" from before). Layers: Hovered, Selected, Pinned, PageRank (24), Everything (24). No names on the dots. First I need to know who the top five are -- I'll try the table button in the bottom toolbar, like a spreadsheet.

## Step 2
Command: --step <folder> --click-at 793,840  (Table button)
Screenshot 02.png. A table opened under the map: 24 nodes, columns id, name, role, hours, trained, phone, PageRank. Like Excel. I'll click the PageRank header to sort it so the biggest numbers are on top.

## Step 3
Command: --step <folder> --click-at 1125,509  (PageRank header)
Screenshot 03.png. "Sorted by PageRank, highest first". Top five: Ben Adler (0.05862), Seun Okoro (0.05601), Priya Nair (0.05494), Hannah Weiss (0.05473), James Carter (0.05452). Sixth is Paul Dubois at 0.05125, so a clear gap -- good. Now how do I paint just those five orange? I've never picked people by hand for a color. I'll try the "+" next to Style layers.

## Step 4
Command: --step <folder> --click-at 276,122  (Add a layer or a folder)
Screenshot 04.png. A menu: Layer, Folder, Hover highlight, Analyze... "Layer" sounds like a new color rule. Clicking Layer.

## Step 5
Command: --step <folder> --click "Layer"
Screenshot 05.png. "Layer 1" added above PageRank, its name is selected for typing. Right panel: "Which nodes 24 of 24 / All nodes" and Fill. I'll name it "Top five" so I recognise it next quarter.

## Step 6
Command: --step <folder> --type "Top five" --key Enter
Screenshot 06.png. Layer renamed "Top five", 24 nodes. It says "Which nodes 24 of 24 / All nodes" -- I need it to be just five. Clicking "Which nodes".

## Step 7
Command: --step <folder> --click "Which nodes"
Screenshot 07.png. A full "Which nodes -- Top five 24 of 24" editor opened with a "Value..." list: Data (Node id, name, role, hours...) and "Results" further down. PageRank is a result. I'll type PageRank in the find box so I can say "PageRank at least 0.05452" -- the top five.

## Step 8
Command: --step <folder> --type "PageRank"
Screenshot 08.png. Results: "PageRank 0.02796 to 0.05862" highlighted. Pressing Enter to take it.

## Step 9
Command: --step <folder> --key Enter
Screenshot 09.png. Condition "PageRank: Influence", "By value", a slider 0.028 to 0.0586 and From/to boxes. Before I type a number I'll peek at the "By value" list -- maybe there's a "top 5" choice, which would hold up next quarter better than a number.

## Step 10
Command: --step <folder> --click-at 1040,190  (the "By value" list, named "PageRank test")
Screenshot 10.png. Two choices: "By value" and "By position". "By position" might mean ranking -- like top 5. Trying it.

## Step 11
Command: --step <folder> --click "By position"
Screenshot 11.png. Now there's an empty box "___ of all nodes" with the cursor in it. No hint whether it means top or bottom, or a number or a percent. I'll type "top 5" and see what it makes of it.

## Step 12
Command: --step <folder> --type "top 5"
Screenshot 12.png. Box says "top 5 of all nodes" but the count at the top still reads 24 of 24 and nothing changed. Maybe it waits for Enter.

## Step 13
Command: --step <folder> --key Enter
Screenshot 13.png. Red message: '"top 5" is not a number. Type a number, like 10. The count and drawing still use the highest 10.' Good -- one clear change to make, and it tells me it means "highest", so it's top-N. Odd though: it says it uses the highest 10 but the header still says 24 of 24. I'll clear the box and type just 5.

## Step 14
Command: --step <folder> --key Control+a --type "5" --key Enter
Screenshot 14.png. "5 of 24", "PageRank: Influence top 5", "No match 19". The table shows James Carter, Priya Nair, Hannah Weiss, Seun Okoro, Ben Adler -- the same five I read off the sorted table. Five plus nineteen is 24, everyone accounted for. Clicking Done.

## Step 15
Command: --step <folder> --click "Done"
Screenshot 15.png. Back to the map. "Top five" layer shows 5; right panel "Which nodes: PageRank: Influence top 5". No color set yet. Clicking the + next to Fill.

## Step 16
Command: --step <folder> --click-at 1404,401  (Add to node fill)
Screenshot 16.png. A "Color" box appeared, empty. Everyone's already in orange-to-brown shades, so I want a plain bright orange that stands out. I'll click the box and type "orange".

## Step 17
Command: --step <folder> --click-at 1318,435 --type "orange" --key Enter
Screenshot 17.png. It took "orange" and turned it into FFA500. The key now says "Color: Top five -- 5 of 24 nodes" above "Color: PageRank", with "5 nodes covered by Top five". On the map five dots are now bright orange and the rest still have their PageRank shades. Let me hover one bright dot to make sure it's one of my five.

## Step 18
Command: --step <folder> --hover-at 810,116
Screenshot 18.png. The bright dot is v13 -- Seun Okoro, one of my five. No tooltip with the name, I had to match the id myself. Autosave says saved. The other 19 dots still have their PageRank shades, and the PageRank layer still says 24. I'm done.

## End of session (in character)

Did I finish? Yes. The five people who matter most (by PageRank, which the program calls "Influence") are now plain orange (FFA500); everyone else keeps their old PageRank shading:
1. Ben Adler (staff) 0.05862
2. Seun Okoro (board) 0.05601
3. Priya Nair (volunteer) 0.05494
4. Hannah Weiss (staff) 0.05473
5. James Carter (staff) 0.05452
(Sixth, Paul Dubois at 0.05125, is not included.)

Ease: 6 of 7. Sorting the table gave me the five straight away, and "+ > Layer > Which nodes > PageRank > By position > 5" did it, with the right five shown in a little table before I pressed Done. Nice that it's "top 5" rather than a number cut-off, so next quarter it should still be the top five.

What confused me:
- "By position" doesn't say "highest" anywhere; the box just says "___ of all nodes". I only learned it meant "the highest N" from the red error after typing "top 5". A word like "Top" or "Highest" next to the box would have saved a try.
- That error said "The count and drawing still use the highest 10", but the header right above it said 24 of 24 -- the two didn't agree, which made me unsure what it was actually doing.
- The combobox is called "PageRank test" for a screen reader, and the result is called "PageRank: Influence" in the picker but just "PageRank" in the table and layer list -- three names for one thing.
- The bright orange is close to the light end of the PageRank orange scale, so on a slide the five don't pop as much as I'd like. Fine for the task, but I'd pick a stronger color for the board.
- Hovering a dot showed no name, only the id in the tool; I had to check it against the table.

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Grace: 3. Mostly calm -- the table sorted like Excel and gave me my five right away, and once I found "+ > Layer" each screen led to the next. The moment I was least sure was right after I picked "By position" (step 11). The "Which nodes -- Top five" editor showed the condition "PageRank: Influence" with the list now set to "By position", and under it one empty box with the cursor blinking and the words "___ of all nodes" after it. Nothing said whether it wanted a number or a percent, or whether it meant the top or the bottom, and the count at the top still said 24 of 24. I guessed "top 5", and only the red error after Enter told me it meant "the highest" -- and even that said "still use the highest 10" while the header said 24 of 24, so for a moment I didn't know which one to believe. A second, smaller wobble was before that, at step 3: I had my five names from the sorted table but no idea where you paint people by hand, so I just tried the "+" next to Style layers.
