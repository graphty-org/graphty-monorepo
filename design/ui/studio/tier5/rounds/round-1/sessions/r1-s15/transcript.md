# Session r1-s15 -- Dana Okafor (returning user)

Task: put just the five people who matter most in orange, leave everyone else as they are, say who the five are.

## Step 0 -- start
Command: REAL_DIST=... REAL_TIER=5 node .../real.mjs --start <folder> setup:volunteers.txt
Screenshot 01.png. The volunteers project is open. Every dot is already some shade of orange-to-brown, with a "Color: PageRank" key on top and a "PageRank" style layer (24) in the left list. So the "who matters most" work from last time is a PageRank layer coloring everybody. I need the top five, by name. Tables are where I live, so I'll open the table view first.

## Step 1
Command: --step <folder> --click-at 793,840  (button "Table")
Screenshot 02.png. Good, a table: id, name, role, hours, trained, phone, PageRank. Says "In the order loaded". I want it sorted by PageRank, biggest first. I'll click the PageRank column header like in Excel.

## Step 2
Command: --step <folder> --click-at 1125,509  (button "PageRank")
Screenshot 03.png. "Sorted by PageRank, highest first". Top five: Ben Adler (0.05862), Seun Okoro (0.05601), Priya Nair (0.05494), Hannah Weiss (0.05473), James Carter (0.05452). Next is Paul Dubois at 0.05125, so a clean gap. That was a two-click job, fine.
Now the coloring. Everybody is already orange-to-brown from the PageRank layer, so "orange" on five will not even stand out. Still, the job says leave the rest as they are. I've never picked colors by hand. The "+" next to Style layers looks like where a new color rule goes. Trying that.

## Step 3
Command: --step <folder> --click-at 276,122  (button "Add a layer or a folder")
Screenshot 04.png. Menu: Layer, Folder, Hover highlight, Analyze... "Layer" sounds like a new color rule. Clicking Layer.

## Step 4
Command: --step <folder> --click "Layer"
Screenshot 05.png. A "Layer 1" appeared above PageRank with its name selected for editing. Right side: "Which nodes 24 of 24 -- All nodes", then Shape, Visibility, Text, Fill. I'll name it "Top 5" and then narrow "Which nodes".

## Step 5
Command: --step <folder> --type "Top 5" --key Enter --click "Which nodes"
Screenshot 06.png. Layer is now "Top 5". A "Which nodes -- Top 5" editor opened with a "Value..." list: Data (Node id, name, role, hours, trained, phone, Degree) and "Results" further down. PageRank should be under Results. I'll type PageRank in the find box.

## Step 6
Command: --step <folder> --type "PageRank"
Screenshot 07.png. One hit under Results: "PageRank 0.02796 to 0.05862". Pressing Enter to take it.

## Step 7
Command: --step <folder> --key Enter
Screenshot 08.png. Now "PageRank: Influence", "By value", a range slider 0.02796 to 0.05862 with from/to boxes. I could type a cutoff, but I'd rather say "top 5" than fiddle with decimals. Checking what else the "By value" box offers.

## Step 8
Command: --step <folder> --click-at 1040,190  (combobox "PageRank test")
Screenshot 09.png. Options: "By value" and "By position". By position sounds like rank -- top N. Picking it.

## Step 9
Command: --step <folder> --click "By position"
Screenshot 10.png. Now there's an empty box with a cursor and tiny grey text "of all nodes" next to it. No hint what goes in it -- a number? "top 5"? Is it a list? I'll click on it to see if it offers choices.

## Step 10
Command: --step <folder> --click-at 985,218  (input "PageRank: how many")
Screenshot 11.png. It is a plain box; the tool says it's "how many" but the screen does not say that -- just a blank box and "of all nodes" in tiny grey. Nothing says top or bottom either. I'll type 5 and see which five it picks.

## Step 11
Command: --step <folder> --type "5"
Screenshot 12.png. Box says 5, but the header still says "24 of 24" and the table still has everyone. Maybe it needs Enter. Pressing Enter.

## Step 12
Command: --step <folder> --key Enter
Screenshot 13.png. Now "5 of 24", "PageRank: Influence top 5", "No match 19". Table shows James Carter, Priya Nair, Hannah Weiss, Seun Okoro, Ben Adler -- same five as my sorted table. Good, it took the top, not the bottom. Clicking Done, then I'll look for color under Fill.

## Step 13
Command: --step <folder> --click "Done"
Screenshot 14.png. Layer "Top 5" with 5 in the left list, "Which nodes: PageRank: Influence top 5" on the right. Now the color. "Fill" with a plus -- that's where color goes. Clicking the plus by Fill.

## Step 14
Command: --step <folder> --click-at 1404,401  (button "Add to node fill")
Screenshot 15.png. A "Color" row with an empty box appeared under Fill. Clicking the color box to pick orange.

## Step 15
Command: --step <folder> --click-at 1312,435  (input "Node color, not set")
Screenshot 16.png. Just a text cursor in the box, no color swatches popped up. I'll type the word orange and press Enter and see if it understands.

## Step 16
Command: --step <folder> --type "orange" --key Enter
Screenshot 17.png. It understood: box now shows FFA500 with an orange swatch. The key at the top says "Color: Top 5 -- 5 of 24 nodes", then the PageRank scale with "5 nodes covered by Top 5". On the picture five dots went a lighter, brighter orange; the rest kept their PageRank orange-to-brown shades. That is what was asked. I'm done.

## End (in character)

Finished: yes. The five who matter most (by the PageRank score from last time) are:
1. Ben Adler (0.05862)
2. Seun Okoro (0.05601)
3. Priya Nair (0.05494)
4. Hannah Weiss (0.05473)
5. James Carter (0.05452)
They are now orange (FFA500) through a new layer called "Top 5"; everyone else is still colored by the PageRank layer as before.

Ease: 5 of 7.

What worked: sorting the table by PageRank was two clicks and gave me the list straight away -- that alone answers "who" and I could do it in Excel too, but it was faster. "By position" plus a number gave a real "top 5" rule instead of me guessing a decimal cutoff, and the editor showed the five names so I could check it against my sorted table. Typing "orange" was understood.

What confused me / complaints:
- The color job is a bit pointless on this picture: everyone was already orange-to-brown from the PageRank coloring, so my five "orange" people only look a shade lighter. On a 14-inch laptop in a meeting I doubt anyone would spot them. I followed the instruction, but I'd have picked a color that stands out.
- "By position" is not a phrase I'd connect with "top 5"; I only tried it because "By value" was the other choice.
- After "By position" I got a blank box with no label and tiny grey "of all nodes" text. Nothing said "how many" and nothing said top or bottom. I typed 5 and it did nothing until I pressed Enter -- no hint that Enter was needed.
- The color box is a bare text field. No swatches appeared when I clicked it; I only got orange because I guessed I could type the word.
- Lots of small grey text (layer subtitles, "of all nodes", "Edges: not styled") -- hard to read without my glasses.

## Follow-up

Q: On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen.

A: 3. Mostly calm -- the table sort and the "Top 5" layer went the way I expected. The moment I was least sure was right after I picked "By position" (screenshots 10 to 12). The panel on the right showed "PageRank: Influence", the "By position" box, and then just an empty text box with a cursor and tiny grey "of all nodes" next to it. Nothing told me it wanted a number, nothing said top or bottom, and when I typed 5 the header still said "24 of 24" and the table still listed everybody. I sat there wondering whether I had it wrong until I pressed Enter on a hunch and it jumped to "5 of 24". A smaller wobble was the color box: I clicked it expecting swatches and got only a text cursor, so I guessed and typed "orange".
