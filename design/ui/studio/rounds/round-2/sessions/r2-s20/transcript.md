# Session r2-s20 -- Dev (class-project student), T12 Prompt A (Les Miserables)

Start: empty.

## Step 1

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s20 empty`
Saw (01.png): a start screen with Start (Open project or file..., New from data...), Recent projects (empty) and Samples on the right: Les Miserables (77 characters, "Characters who share a chapter of the novel"), Zachary's karate club, College football, Florentine families. A usage-data card at the bottom asks to share usage data.
Dev: "Okay, it says Les Miserables right there, 77 characters, characters who share a chapter -- that's exactly what I need. I'll say no thanks to the data thing first and then open the sample."

## Step 2

Command: `--step --click "No thanks" --click "Les Miserables"`
Saw (02.png): the network drawn as blue dots and gray lines, no names on any dot. Left: a box "Find nodes, edges, values", Selection, Everything. Right: Graph / Values with Overview: 77 nodes, 254 edges, undirected, density, 1 component. A small toolbar at the bottom (flask, chart, 3D, magnifier).
Dev: "Wait, there are no names on the dots, so I can't just see Javert. But there's a box that says Find nodes -- I'll type his name there."

## Step 3

Command: `--step --click "Find nodes, edges, values" --type "Javert"`
Result: the tool said nothing on screen is called "Find nodes, edges, values" (the gray text is only a placeholder, not the box's name), so nothing was typed. Screen unchanged (03.png).
Dev: "Huh, it didn't take it. I'll just click right inside the box and type."

## Step 4

Command: `--step --click-at 176,90 --type "Javert"`
Result: at 176,90 is combobox "Find". Saw (04.png): the box shows "Javert" and a list: Elements -- Javert; Values -- "Select where name is Javert (1)".
Dev: "Oh nice, there he is under Elements. I'll click Javert."

## Step 5

Command: `--step --click "Javert"`
Saw (05.png): Javert's dot is now highlighted yellow in the middle of the drawing (the camera moved a bit). The right side now says "Javert -- Node" with a Summary: id Javert, name Javert, Degree 17, and the Degree row has a small ">" arrow. Selection on the left shows 1.
Dev: "Okay, so what the program knows about him: his id and name are Javert and his Degree is 17. Degree... my tutorial said size by degree, I think that's how many lines he has. That would be the 'how many'. But I need the WHO. The Degree row has an arrow, so maybe it opens the list. I'll click it."
Part 1 (read what the program knows about Javert) -- done, I think: id, name, Degree 17.

## Step 6

Command: `--step --click "Degree"`
Saw (06.png): the right side switched to "Javert -- Neighborhood" with the heading "Javert's 17 connections" and a list of names: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2. On the drawing, those dots light up yellow around Javert. Selection on the left now says 18.
Dev: "Oh nice, that's it! It lists everyone. Let me count... 17 names, same as the 17 at the top and the Degree. Selection says 18 -- wait, why 18? Oh, that's probably Javert plus his 17. Okay."
Part 2 (who he shares chapters with, and how many) -- done.

## Step 7

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s20`
Session ended.

## Answer

Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1 and Woman2. The program knows his id (Javert), his name (Javert) and his Degree (17).

Essay sentence: "Javert, the police inspector, shares chapters with 17 other characters (degree 17), from Valjean and Cosette to the Thenardiers and the Patron-Minette gang (Babet, Claquesous, Gueulemer, Montparnasse)."

## Debrief (in character)

- Finished: yes.
- Rating: 6 out of 7 (easy).
- What went well: the sample was right on the first screen; typing his name into the Find box found him at once; clicking him showed what the program knows; the Degree row's arrow opened the list of names with the count in its heading, and the dots lit up on the drawing.
- Hesitations and confusion:
    - The drawing has no names on the dots, so I could not find Javert by looking; I had to use the Find box.
    - My first try at the Find box did not take (the gray "Find nodes, edges, values" text is only a hint, not the box's name), so I clicked straight into it.
    - "Degree" is a word from my tutorial, but nothing on the Summary said it means "how many characters he is tied to"; I guessed, and only the small ">" arrow told me there was more behind it. If I had not tried the arrow I would have had a number and no names.
    - Selection said 18 while the list said 17; I worked out it counts Javert too, but for a second I wondered which number was right.
    - The Summary for Javert only has id, name and Degree, which felt thin for "what the program knows about him" -- I was not sure whether there was more somewhere (the Data button?) and did not check.
