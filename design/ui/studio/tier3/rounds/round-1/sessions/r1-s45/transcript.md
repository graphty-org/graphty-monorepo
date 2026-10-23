# Session r1-s45 -- Dev (student), task: open the Les Miserables ready-made network and make every character red

## Step 1 -- start
Command: real.mjs --start <session> empty
Screen: graphty landing page. "Open a file", "Open network data", "Samples", "New project". A demo network on the right.
Dev: "Okay, it says Samples -- the task says a ready-made network, that sounds like a sample. Clicking Samples."
Command: --click "Samples" -> ambiguous (button and top link). Nothing happened.

## Step 2
Dev: "I'll click the big Samples button in the box, at the spot on the screen."
Command: --click-at 455,540
Result (03.png): Sample library. First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges".

## Step 3
Dev: "Oh nice, Les Miserables is right there, first one. Clicking that card."
Command: --click-at 183,410
Result (04.png): Les Miserables open, 77 nodes, all blue-purple. Left: "Style layers" with Hovered, Selected, Everything (77). Right panel: Graph, tabs Style / Values. A notice at the bottom about saving a copy.

## Step 4
Dev: "Okay it's open, 77 nodes like the card said. Now I need to color them -- in the tutorial it's 'Appearance'. Here there's a 'Style layers' list and 'Everything 77' -- that sounds like all the characters. Clicking Everything."
Command: --click "Everything"
Result (05.png): Right panel now "Everything -- Node and edge layer", Style tab, Node. Text says "Everything styles all 77 nodes". Under Fill: Color 6366F1 with a purple swatch.

## Step 5
Dev: "Oh nice, 'styles all 77 nodes' -- that's exactly what I want. Fill, Color, 6366F1 -- that's a hex code, like in PowerPoint. I'll click in the code box and change it to red."
Command: --click-at 1320,483
Result (06.png): The code 6366F1 is highlighted, ready to type over.

## Step 6
Dev: "It's highlighted, so I just type. Red is FF0000, I remember that from a web class. Then Enter."
Command: --type "FF0000" --key Enter
Result (07.png): Every node on the canvas is red. Color box shows FF0000 with a red swatch. "Autosave: saved" at the top, and the undo arrow is now active.

Dev: "Oh nice, that's it! All of them went red at once. And there's an undo arrow at the top, so I could go back if I messed up -- that's a relief. Essay-ish sentence: 'I opened the Les Miserables sample (77 characters, 254 links) and colored every character red using the Everything style layer.'"

## End of session (in character)
- Did I finish? Yes. All 77 characters are red.
- Ease: 6 out of 7 (easy).
- What confused me:
  - "Samples" appears twice on the first screen (top bar link and the big button), I just picked the big one.
  - I was looking for the word "Appearance" (from the Gephi tutorial) or "Color"; here it is "Style layers", and I had to guess that the layer called "Everything" meant all the nodes. Once I clicked it, the line "Everything styles all 77 nodes" made it clear.
  - The color is a hex code (6366F1). I knew FF0000 is red, but a classmate who doesn't know hex might not; I didn't try clicking the little swatch to see if there's a color picker.
  - The "This browser may clear what it keeps..." notice made me a bit nervous about losing work, but I didn't need to save for this task.

## Follow-up
Facilitator: "Your editor liked the picture better the way it was when you opened it. Put it back exactly as it was."

Command: --click "Undo"
Result (08.png): All 77 nodes are blue-purple again. Fill Color on the Everything layer shows 6366F1 with the purple swatch, the same code as when I opened it. A notice at the bottom: "Undid changing node color on Everything." The undo arrow's tooltip now says "Nothing to undo".

Dev: "Oh, easy -- I saw that undo arrow earlier, so I just clicked it. Wait, let me check... yep, all the dots are that blue-purple again, and the color box says 6366F1, which is what it said before I typed FF0000. And the little message says 'Undid changing node color on Everything', so it undid exactly my one change. The tooltip says 'Nothing to undo' now, which I think means I'm back at the start -- I only made that one change. That's a relief, honestly, this is the thing I was scared of in Gephi. Sentence for my notes: 'I reverted the color with Undo; the Everything layer is back to its original 6366F1.'"
