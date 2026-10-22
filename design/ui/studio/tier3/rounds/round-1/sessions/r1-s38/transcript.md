# Session r1-s38 (Tom)

Task: open Les Miserables sample; make ties with >=5 shared chapters thick and blue; leave everything else.

## Step 1
Command: --start empty
Saw: a welcome page with a big green "Open a file", "Samples" and a pretty coloured network. Says nothing leaves my computer - good.
Next: I need the ready-made Les Miserables network. Clicking "Samples".

## Step 2
Command: --step --click "Samples"
ambiguous: "Samples" matches 2 controls, so the step did nothing; name one: "Samples#1" button "Samples", "Samples#2" link "Samples"
the drawing is still moving (the canvas kept changing for a second with no input)
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/02.png

## Step 3
Clicking the green Samples button in the box (point at it).
Command: --step --click-at 455,540
at 455,540: button "Samples"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/03.png
Saw: a sample library; first card "Les Miserables -- 77 nodes, 254 edges". That's the one.

## Step 4
Command: --step --click-at 183,410
at 183,410: button "Open the Les Miserables sample"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/04.png
Saw: network open, 77 nodes, 254 edges, all blue dots with grey lines. Left side has "Style layers" with a plus. I need to change some ties' look, so the plus next to Style layers seems the place.

## Step 5
Command: --step --click-at 276,122
at 276,122: button "Add a layer or a folder"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/05.png
Saw: a small menu: Layer, Folder, Select layers..., Analyze. "Layer" is highlighted - taking that.

## Step 6
Command: --step --click-at 210,158
at 210,158: menuitem "Layer"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/06.png
Saw: a "Layer 1" appeared; right side shows Node / Edge. It's on Node and says "All 77 nodes". I want ties, not characters, so "Edge".

## Step 7
Command: --step --click-at 1292,142
at 1292,142: tab "Edge"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/07.png
Saw: Edge tab: "All 254 edges: add a condition to narrow", "Which edges". I only want ties with 5 or more shared chapters, so I open "Which edges".

## Step 8
Command: --step --click "Which edges"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/08.png
Saw: "Add a condition". Clicking it.

## Step 9
Command: --step --click "Add a condition"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/09.png
Saw: one choice, "shared_chapters 1 to 31". That's plainly it.

## Step 10
Command: --step --click-at 1300,344
at 1300,344: option "shared_chapters, 1 to 31"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/10.png
Saw: "shared_chapters Between 1 to 31". The 1 box looks ready. I'll make it 5 (up to 31 is the top, fine).

## Step 11
Command: --step --click-at 1265,304 --key Control+a --type "5" --key Tab
at 1265,304: input "shared_chapters from, number"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/11.png
Saw: "51 of 254 edges" - a number, good. I'll press Done and then look for the line look ("Line +").

## Step 12
Command: --step --click "Done"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/12.png
Saw: summary "shared_chapters 5 to 31, 51 edges". Nothing has changed on the picture yet. "Line" with a plus - clicking the plus.

## Step 13
Command: --step --click-at 1404,340
at 1404,340: button "Add to edge line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/13.png
Saw: menu Color, Width, Pattern, Pattern count, Curved. Color first.

## Step 14
Command: --step --click-at 1340,376
at 1340,376: menuitem "Color"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/14.png
Saw: a Color row with "A9A9A9" and a little grey square. I don't speak in codes; I'll click the little colour square hoping for a palette.

## Step 15
Command: --step --click-at 1268,374
at 1268,374: button "Pick edge color"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/15.png
Saw: a colour picker with a few swatches at the bottom; the third one is a plain blue. Clicking that.

## Step 16
Command: --step --click-at 1031,736
at 1031,736: button "blue 0077BB"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/16.png
Saw: some ties went blue and a key appeared top-left: "Edge color: Layer 1, 51 of 254 edges". Good. Now thick: Line plus again, then Width.

## Step 17
Command: --step --click-at 1404,340
at 1404,340: button "Add to edge line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/17.png

## Step 18
Menu open again (Color, Width...). Choosing Width.
Command: --step --click "role=menuitem:Width"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/18.png
Saw: a Width box with "8" in it, but the blue lines look as thin as before. 8 of what? Did it do anything? I'll put a bigger number in and see if they get fatter.

## Step 19
Command: --step --key Control+a --type "20" --key Enter
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier3/tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s38/19.png
Saw: at 20 the blue ties are now visibly thicker; the other ties are still thin grey and the characters are still the same purple-blue dots. The key top-left says "Edge color: Layer 1, 51 of 254 edges". I'm stopping here: the job is done.

## End (in character, Tom)

Did I finish? Yes. The 51 ties where two characters share 5 or more chapters are thick and blue; the characters and the other ties look as they did.

Ease: 5 out of 7.

What went well: Samples was right on the front page and Les Miserables was the first card. Picking "shared_chapters" was the only choice offered, and it told me "51 of 254 edges" straight away - a number I can repeat. The blue swatch was there without typing a code. "Local only" at the top was reassuring.

What confused me:
- Width came in at "8" and nothing on the picture looked any different. "8 of what?" I only saw a change when I typed 20, and I still don't know what 20 means or whether 8 had done anything at all.
- The colour box opened showing a code, "A9A9A9". I found the swatches by clicking the little square; if I hadn't, I'd have been stuck.
- I had to know to click a plus next to "Style layers", then "Layer", then switch to "Edge". Nothing said "change the ties here"; I guessed.
- The new thing is called "Layer 1" and the key on the picture says "Edge color: Layer 1". The PI won't know what "Layer 1" is, and the key says nothing about them being thicker or meaning 5 or more chapters. I'd have to stand next to the slide and explain it.
- "Between 5 to 31" - I only wanted "at least 5". It worked because 31 is the top, but I had to think about it.
- The first "Samples" I tried was ambiguous: there are two of them (top bar and the box).
