# Session r2-s21 -- Grace (nonprofit operations analyst), task T12 Prompt A (Les Miserables)

Task as given: practice on the ready-made Les Miserables network; go to the police inspector Javert, read what the program knows about him, and see which characters he shares chapters with. Tell who they are and how many.

## Step 1 -- start
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s21 empty`
Saw (01.png): a start page. Left: "Open project or file...", "New from data...", "Files are read on this computer and never uploaded" (good -- I look for that). Middle: Recent projects, empty. Right: Samples -- Les Miserables, 77 characters, "Characters who share a chapter of the novel." A usage-data box at the bottom asking me to share or not.
Next: say "No thanks" to the usage data (I don't share anything from the office laptop), then click Les Miserables.

## Step 2 -- open the sample
Command: `--step --click "No thanks" --click "Les Miserables"`
Saw (02.png): the network opened. 77 nodes, 254 edges on the right -- matches the "77 characters" on the card, good. Lots of blue dots, but no names on any of them, so I can't just spot Javert. Top left there's a box "Find nodes, edges, values". Right panel has some words I'd skip on a slide ("Density", "Components").
Next: click the Find box and type Javert.

## Step 3 -- try the Find box by its words
Command: `--step --click "Find nodes, edges, values" --type "Javert"`
Result: the tool said nothing on screen is called that (the grey text inside the box is only a hint, not its name), so nothing was typed. Tooling miss, not an app problem I would notice as a person -- for me I'd just click into the box.
Next: click right on the box at 176,90 and type Javert.

## Step 4 -- type Javert
Command: `--step --click-at 176,90 --type "Javert"`
Saw (04.png): the box (it's called "Find") shows a dropdown: under "Elements" one entry "Javert"; under "Values" "Select where name is Javert (1)". The drawing hasn't changed yet. Good, he's in there.
Next: click the "Javert" entry under Elements -- that sounds like "go to him".

## Step 5 -- go to Javert
Command: `--step --click-at 114,153` (the "Javert" option)
Saw (05.png): one dot near the middle turned yellow -- that must be him. "Selection 1" on the left. Right panel now says "Javert, Node" with a Summary: id Javert, name Javert, Degree 17 with a little arrow. That's all the program "knows" about him: his name and "Degree 17". "Degree" is not a board word; I'm guessing it means he's tied to 17 characters. The camera did not zoom in on him, and he's in the crowded middle, so I can't see who his lines go to.
Next: click the arrow next to "Degree 17" -- hoping it lists the 17.

## Step 6 -- the arrow next to Degree
Command: `--step --click-at 1410,236`
Saw (06.png): the Degree row got a lighter background, but nothing opened. The tool says I hit the "Summary values" group, so maybe I missed the arrow itself. Hesitated here.
Next: hover the Degree row to see if it says anything, then click on the word "Degree".

## Step 7 -- hover, then click the Degree row
Commands: `--step --hover-at 1300,236` (07.png; it's a button "Degree 17", no tooltip), then `--step --click-at 1252,236`
Saw (08.png): that did it. The right panel now says "Javert -- Neighborhood" and "Javert's 17 connections", with a plain list of names:
Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2.
I counted them myself: 17. The left says "Selection 18" -- that's him plus the 17, which adds up. On the drawing those 18 dots are ringed in yellow. "17 connections" is a word I can use with the board; "Degree" alone I could not.
The task is done: Javert shares chapters with 17 characters, listed above.
Next: end the session.

## Step 8 -- end
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s21`

## Wrap-up, in Grace's words

**Did I finish?** Yes. Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1 and Woman2.

**How easy was it?** 5 out of 7. Opening the sample and finding him by typing his name was quick. The list of his 17 connections was exactly what I wanted, in plain words. It lost points because getting to that list was a guess.

**What confused me:**
- None of the dots had a name, so I couldn't find Javert by looking. I had to search for him.
- After I picked him, all the program "knew" about him was "id", "name" and "Degree 17". I had to guess that "Degree" means how many people he's tied to. I wouldn't put that word on a slide.
- I didn't know you could click "Degree 17" to get the list. The little arrow didn't work the first time: I clicked near it and nothing opened. Clicking the word "Degree" itself opened "Javert's 17 connections". If the row had said "17 connections" in the first place, I'd have clicked it straight away.
- When I picked him, the view didn't move to him. He stayed a small yellow dot in the busiest part of the drawing, so I couldn't follow his lines with my eyes.
- "Selection 18" on the left made me count twice before I saw that it was him plus the 17.
- It was reassuring that the start page said files are never uploaded, and that the top bar says "Local only".
