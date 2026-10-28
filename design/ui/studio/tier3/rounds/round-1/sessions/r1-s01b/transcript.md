# Session r1-s01b -- Explorer Elena (first-time user)

Task: Open the ready-made Les Miserables network; make every character dark green for a printed handout.

## Step 1 (start)
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Screenshot 01.png: Landing page. Big green "Open a file", "Open network data", "Samples", "New project". A colorful spinning dot picture on the right.
Elena: "Ooh, colorful dots. OK -- 'ready-made network', that sounds like 'Samples'. I'll click Samples."
Command: `--step --click "Samples"` -> ambiguous (a button and a top-bar link share the name); nothing happened (02.png same page).

## Step 2
Elena: "I mean the big Samples button under 'Open a file'. Clicking that one."
Command: `--step --click-at 455,540`
Screenshot 03.png: "Sample library" with cards. First card: "Who holds the novel together -- Les Miserables -- 77 nodes, 254 edges".
Elena: "There it is, first one, Les Miserables. Clicking the card."

## Step 3
Command: `--step --click-at 184,410`
Screenshot 04.png: Les Miserables opened. Purple-blue dots, lines. Left: "Style layers" with Hovered / Selected / Everything 77. Right: Graph panel with "Style" and "Values" tabs, numbers (Nodes 77...). A notice at the bottom about the browser clearing data, with Save.
Elena: "OK, it's open, all purple. The big one in the middle must be the main character. I need them green... there's a 'Style' tab on the right. Trying that."

## Step 4
Command: `--step --click "role=tab:Style"`
Screenshot 05.png: Style tab shows only Canvas (background color, lighting, outline width) and Labels. Nothing about the dots' color.
Elena: "Hmm, that's the background, not the dots. On the left there's 'Everything' with 77 -- 77 is how many characters. Maybe that's all of them. Clicking it."

## Step 5
Command: `--step --click "Everything"`
Screenshot 06.png: "Everything" selected; right panel shows Node/Edge, "Everything styles all 77 nodes", Shape, Fill -> Color 6366F1 with a purple square.
Elena: "Fill, Color, purple square -- that's it! I'll click the little purple square and hopefully get a color picker."

## Step 6
Command: `--step --click-at 1268,483`
Screenshot 07.png: A "Color" picker popped up: big square, rainbow slider, Hex 6366F1, and five swatches (purple, gray, blue, yellow, black). No green swatch.
Elena: "No green in the little squares. I'll click the green part of the rainbow bar first."

## Step 7
Command: `--step --click-at 1050,760`
Screenshot 08.png: All the dots changed right away -- now a yellowy lime (DCF163). Hue slider moved to yellow-green.
Elena: "Ooh, they all changed at once. But that's lime, not green. A bit further right on the rainbow."

## Step 8
Command: `--step --click-at 1075,760`
Screenshot 09.png: Dots are now a light minty green (63F174). The big square is green, dark at the bottom.
Elena: "Green! But it's bright, it'd look washed out on paper. It said dark green. I'll click low on the right of the big square where it's dark green."

## Step 9
Command: `--step --click-at 1165,690`
Screenshot 10.png: All 77 dots now a deep dark green (063D0C). Field next to Color shows 063D0C.
Elena: "That's dark green. Pretty dark, but definitely green, good for printing. I'll close the color box with the X and look at it."

## Step 10
Command: `--step --click-at 1180,496`
Screenshot 11.png: Picker closed. All dots dark green, Color field reads 063D0C, top bar says "Autosave: saved".
Elena: "There. Every character is dark green, it says saved. That's what I was asked. Done."

## End (in character)
- Finished: yes. The Les Miserables sample is open and all 77 characters are dark green (063D0C).
- Ease: 6 out of 7.
- What confused me:
  - Clicking "Samples" by name hit two things (a top-bar link and the big button); I had to aim at the big button.
  - The "Style" tab on the right first showed only the background and labels, not the dots. I had to guess that "Everything" on the left (with the 77) was all the characters before the dot color showed up.
  - The color box had no green swatch, so I had to fiddle with the rainbow bar and the big square; the first tries gave lime and mint. A "dark green" swatch or a name would have been quicker.
  - Nice: the dots changed color the moment I clicked, so I could see what I was getting.
