# Session r1-s46 -- Analyst Alex

Task: open the ready-made Zachary's karate club network and make every member yellow.

## Step 1 -- start
Command: real.mjs --start <folder> empty
Screenshot 01.png. Landing page: "Analyze any network. Free and open source." Good: "It never leaves your computer" under the open box, and MIT licensed -- answers my data and cost questions. There is a "Samples" button. The karate club is a sample, so I'll click Samples.

## Step 2
Command: --click "Samples" -> ambiguous (a top-bar link and the big button share the name); nothing happened. 02.png.
I meant the big green Samples button in the open box. Clicking that one.

## Step 3
Command: --click-at 455,540 (big Samples button). 03.png: Sample library. Second card "A club that split in two -- Zachary's karate club -- 34 nodes, 78 edges". Counts shown up front, good. Clicking that card.

## Step 4
Command: --click-at 447,480 (karate card). 04.png: karate club loaded, all purple-blue nodes. Right panel says Nodes 34, Edges 78 -- matches the card, I trust it. Left has "Style layers" with Hovered / Selected / Everything (34). "Style layers" is a bit developer-speak, but "Everything 34" looks like all the members. Clicking "Everything" to see if I can set its color.

## Step 5
Command: --click "Everything". 05.png: right panel now shows the Everything layer: "styles all 34 nodes". Fill > Color 6366F1 with a swatch. That's the color. I'll click into the hex box and type a yellow.

## Step 6
Command: --click-at 1318,483 (hex box, "Node color, set here, indigo"). 06.png: the hex 6366F1 is selected, no picker popped up. I'll just type FFD700 (yellow) and press Enter.

## Step 7
Command: --type "FFD700" --key Enter. 07.png: all 34 nodes are yellow, hex box shows FFD700 with a yellow swatch, "Autosave: saved" at the top. Done.

## Wrap-up (in character)
- Finished: yes. Karate club open (34 nodes, 78 edges, matches the card) and every member is yellow.
- Ease: 6 out of 7. About six actions.
- What took longest / confused me:
  - "Samples" is both a top-bar link and the big button on the start page; minor.
  - I had to guess that "Everything" in "Style layers" is where all-node color lives. "Style layers" reads like developer-speak; I'd have looked for a "Color" or "Appearance" control first. The "styles all 34 nodes" line once I clicked it did confirm it.
  - Color is set by typing a hex code. Fine for me, but I didn't see a swatch palette pop up when I clicked the box -- someone who doesn't know hex codes would be stuck. Clicking the little swatch might open one; I didn't try.
  - Good: "never leaves your computer" and "Local only" up front, and counts shown immediately -- that's what Gephi doesn't give me.

## Follow-up

Facilitator: "The coach liked the picture better the way it was when you opened it. Put it back exactly as it was."

Steps:
- --click-at 1318,483 (the Fill color hex box, now "gold", FFD700). 08.png: hex text selected.
- --type "6366F1" --key Enter. 09.png: all 34 nodes back to the original purple-blue, hex box shows 6366F1 with an indigo swatch, "Autosave: saved". Layout, sizes and edges unchanged.

Answer (in character): Done -- two actions. I'd noted the original color when I first opened the Everything layer: 6366F1. So I clicked the hex box and typed that back in. All 34 nodes are the same purple-blue as when the sample loaded; nothing else moved. I could probably have used the undo arrow at the top too, but I didn't trust undo to stop at exactly the right point, and typing the known value is certain. The catch: I only got it exact because I happened to read the hex code before overwriting it. Someone who didn't would have no "reset to default" on that field that I could see -- that would worry me with a coach looking over my shoulder.
