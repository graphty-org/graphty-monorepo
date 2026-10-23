# Session r1-s47b -- Tom, the recipe recipient

Task: open the ready-made Les Miserables network and make every character red.

## Step 1 (start)
Command: real.mjs --start <folder> empty -> 01.png
Tom: A landing page. Big green "Open a file", then "Open network data" and "Samples". The task says "ready-made", so I'll try Samples, that sounds like ready-made ones.

## Step 2
Command: --step --click "Samples" -> 02.png (refused: ambiguous, two controls called Samples; nothing happened)
Tom: Nothing happened. Maybe I clicked the wrong one.

## Step 3
Command: --step --click-at 455,540 -> 03.png (button "Samples")
Tom: A sample library. First card says "Les Miserables -- 77 nodes, 254 edges", titled "Who holds the novel together". That's the one. I'll click that card.

## Step 4
Command: --step --click-at 183,480 -> 04.png (button "Open the Les Miserables sample")
Tom: It opened. "Les Miserables", 77 nodes, all blue-purple dots. "Autosave: saved", "Local only" up top -- good, nothing leaving. On the left there's a row "Everything 77" -- 77 is the number of characters, so that must be all of them. There's also a "Style" tab on the right. I'll click "Everything" first, that sounds like all the characters.

## Step 5
Command: --step --click-at 125,216 -> 05.png (treeitem "Everything, node and edge layer, 77 nodes, 254 edges")
Tom: The right side now says "Everything styles all 77 nodes". Under "Fill" there is "Color" with a little blue square and "6366F1" -- I don't know what that number is, but the square is the colour. I'll click the little blue square.

## Step 6
Command: --step --click-at 1268,483 -> 06.png (button "Pick node color")
Tom: A colour picker popped up. Five little colour squares at the bottom -- blue, grey, a darker blue, yellow, black. No red. There's a rainbow bar; red is at the left end. I'll click the red end of the rainbow bar.

## Step 7
Command: --step --click-at 1016,760 -> 07.png (slider "Hue")
Tom: Every dot went red straight away -- a bit of a salmon red, but red, and the label now says F16363. That's done. I'll close the colour box with the X.

## Step 8
Command: --step --click-at 1180,496 -> 08.png (button "Close panel")
Tom: Colour box closed, all 77 dots are still red, "Autosave: saved", "Local only". I'm done.

## Wrap-up (in character)
- Did I finish? Yes. The Les Miserables network is open and every character is red.
- Ease: 6 out of 7.
- What went fine: the sample card said "Les Miserables" right on it, and the "Everything 77" row matched the 77 nodes, so I could tell it meant all of them. The colour changed the moment I touched the rainbow bar, so I didn't have to wonder whether it applied.
- What confused or annoyed me:
  - The first time I went for "Samples" nothing happened (there are two things called Samples on that first page -- the top link and the big button). I had to try again.
  - The little row of ready colours under the picker had no red in it, so I had to use the rainbow bar. What I got is more of a salmon/pinkish red than a proper red; if the PI wanted "red" red I'm not sure how I'd get it -- I wouldn't type a code like F16363.
  - The colour is shown as "6366F1"/"F16363" with no name; I don't know what those are.
  - The panel on the right has a lot of rows (Shape, Visibility, Text, Fill, Effects, Rendering) and the help line under "Style nodes" is in tiny grey text I'd need my glasses for. I only found Colour because I was looking for a coloured square.
  - "Everything" is listed next to "Hovered" and "Selected" under "Style layers" -- I guessed it meant all the characters only because of the 77.

## Follow-up
Facilitator: "Your editor liked the picture better the way it was when you opened it. Put it back exactly as it was."

Command: --step --wait 200 -> 09.png (still all red, colour box says F16363)
Command: --step --click-at 197,20 -> 10.png (button "Undo changing node color on Everything")

Tom: I wasn't going to fiddle with the rainbow bar to find that blue again, and I'm not typing codes. Up top next to the name there's a little curved back-arrow, like Word's undo, so I clicked that once. All 77 dots went straight back to the blue-purple they were when I opened it. A black box at the bottom said "Undid changing node color on Everything", the arrow now says "Nothing to undo", and the colour box reads 6366F1 again -- I don't know what that number means, but it's the same one that was there at the start, and "Nothing to undo" tells me there's nothing else of mine left on it. So yes, it's back exactly as it was. Good that it was one click -- if that arrow hadn't been there I'd have asked the postdoc to send me the file again.
