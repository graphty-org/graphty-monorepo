# Transcript -- r1-s03b (Tom, the recipe recipient)

Task: open the ready-made Les Miserables network; for a printed handout, make every character dark green.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session folder> empty`
Screenshot: 01.png
Notes: A landing page. "graphty", big green "Open a file" button, and a "Samples" button. There's a colorful network on the right already. No sign-in, good. "It never leaves your computer" -- fine. The postdoc said Les Miserables is a ready-made one, so I'll try "Samples".

## Step 2-3 -- "Samples" (two tries refused by the tool as ambiguous; no screen change)
Commands: `--step <folder> --click "Samples"` (ambiguous, 02.png), `--click "Samples#1"` (ambiguous, 03.png)
Notes: There's a "Samples" up top and one in the middle box. I meant the big one in the middle.

## Step 4 -- the Samples button
Command: `--step <folder> --click "role=button:Samples"`
Screenshot: 04.png
Notes: "Sample library". First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges". That's the one. I'll click it.

## Step 5 -- open Les Miserables
Command: `--step <folder> --click "Who holds the novel together"`
Screenshot: 05.png
Notes: It opened. "Les Miserables", 77 nodes, 254 edges -- matches the card. All the dots are blue-purple. "Local only" at the top, good. There's a black bar about the browser clearing things; I'll leave it. On the right there's "Style" next to "Values". Colour sounds like Style. Trying that.

## Step 6 -- Style tab
Command: `--step <folder> --click "role=tab:Style"`
Screenshot: 06.png
Notes: This is "Canvas" -- background colour, lighting. That's the background, not the dots. Not what I want. On the left there's a list with "Everything 77". 77 is the number of characters, so "Everything" must be all of them. I'll click that.

## Step 7 -- "Everything"
Command: `--step <folder> --click "Everything"`
Screenshot: 07.png
Notes: Right side now says "Everything styles all 77 nodes". Under "Fill" there's "Color" with a blue box and "6366F1". That's the colour of the dots. I'll click the little colour box and hope there's a picker.

## Step 8 -- the colour box
Command: `--step <folder> --click-at 1268,483` (button "Pick node color")
Screenshot: 08.png
Notes: A colour picker. The little swatches at the bottom are blue, grey, blue, yellow, black -- no green. There's a rainbow bar. I'll click where the green is on the bar, then go darker in the big square.

## Step 9 -- green on the rainbow bar
Command: `--step <folder> --click-at 1052,760` (slider "Hue")
Screenshot: 09.png
Notes: All the dots changed at once -- good, it worked on everything. But it's a bright lime/yellow green (D0F163), not dark green. On a printout that'll be pale. I'll nudge the bar a bit further toward green, then click lower in the big square to make it darker.

## Step 10 -- nudge the hue
Command: `--step <folder> --click-at 1070,760` (slider "Hue")
Screenshot: 10.png
Notes: Now it's a proper green (6FF163) but light, like a highlighter. The big square goes dark at the bottom. I'll click near the bottom right of it for dark green.

## Step 11 -- darker in the square
Command: `--step <folder> --click-at 1170,680` (slider "Saturation and brightness")
Screenshot: 11.png
Notes: Every dot is dark green now (0B4A05). That's it. I'll close the colour box with the X and make sure it stays.

## Step 12 -- close the colour box
Command: `--step <folder> --click-at 1179,496` (button "Close panel")
Screenshot: 12.png
Notes: Box closed, colour stayed: 0B4A05, every dot dark green, "Everything styles all 77 nodes", top says "Autosave: saved". That's the job. I'm done. (I did not touch the black bar about saving a copy, or anything else.)

## Wrap-up (in character)
- Did I finish? Yes. Les Miserables opened from Samples, and all 77 characters are dark green.
- Ease: 5 out of 7.
- What went fine: the sample was easy to find and opened with no install or sign-in, and "Local only" at the top was reassuring. Once I found the colour box, the whole picture changed at once, and "Everything styles all 77 nodes" told me it was all of them -- I read that number and it matched the 77 on the card.
- What confused me: the "Style" tab on the right first showed "Canvas" and "Background color" -- I thought that was where the dot colour would be and it wasn't. I only found the dot colour because "Everything 77" on the left looked like "all of them"; "Style layers" means nothing to me. The colour picker had no green in its little swatches, so I had to fiddle with the rainbow bar: the first click gave me a lime/yellow green, which I could easily have printed by mistake, especially with my eyes. I'd have liked to just say "dark green". I'm also not sure whether "Everything" is the lab's file or just my copy -- it says autosaved, but I didn't save anything myself. She could have just sent me a PNG.
