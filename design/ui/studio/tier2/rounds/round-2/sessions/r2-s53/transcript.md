# Session r2-s53 -- Jordan (returning marketing analyst), task T24 prompt A (running club)

Build: frozen build named on the first line of tier2/criteria.md (tier2-r2d4-8f0d5a6f7).

## Start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node tool/real.mjs --start rounds/round-2/sessions/r2-s53 setup:friends-ranked-names.txt` -> 01.png

01.png: My running club file is open, names on every dot, colored and sized by PageRank like last time. Gus is low in the middle, Ivan just up and to the right of him, and there is a line running between them. I want to know how many runs they did together, so I will click right on that line, halfway between the two dots.

## Step 1

Command: `--step --click-at 755,585` -> "at 755,585: edge with id "13"" -> 02.png

02.png: The line lit up blue and the right panel now says "Gus -> Ivan, Edge", Values tab, with From Gus, To Ivan, weight 1. The weight column in my sheet is how many runs two people did together, so Gus and Ivan ran together once. Answer to the first part: 1 run. Now I need Gus and Ivan to stand out. There is a "..." at the top of this panel; I will see what it offers for this tie.

## Step 2

Command: `--step --click-at 1419,73` -> "button "Edge actions"" -> 03.png

03.png: A small menu: "Select endpoints", "Frame selection", "Add note". "Endpoints" is a techy word, but I guess it means the two people at the ends of this tie. Getting Gus and Ivan selected sounds like the first move, then I can color the selection. Clicking "Select endpoints".

## Step 3

Command: `--step --click "Select endpoints"` -> 04.png

04.png: Gus and Ivan have a yellow glow now and the panel says "2 nodes selected", Selection, 2 nodes, 1 edge joining them. The glow goes away as soon as I click anywhere else, so that is not "standing out" for a slide. Like I color by group from the Style tab, I will open this selection's Style tab and give the two of them a color of their own.

## Step 4

Command: `--step --click "role=tab:Style"` -> 05.png

05.png: Style for the selection: Fill, Shape, Effects, Label, Tooltip, each with a plus. Fill is the color, so I will press the plus next to Fill.

## Step 5

Command: `--step --click-at 1419,136` -> "button "Add to Fill"" -> 06.png

06.png: A little menu: Color, Opacity. Color.

## Step 6

Command: `--step --click "Color"` -> 07.png

07.png: Gus and Ivan turned purple-blue right away, everyone else stays orange. A new entry "2 nodes" appeared in the left list, and the key on the drawing gained "Color: 2 nodes" with the purple swatch. The name "2 nodes" is bland for a deck, but it works. I want to be sure it stays when I am not selecting them, so I will click on an empty bit of the drawing.

## Step 7

Command: `--step --click-at 1050,700` -> "at 1050,700: empty canvas" -> 08.png

08.png: Nothing is selected now (the panel shows the whole graph's overview) and Gus and Ivan are still purple-blue while everyone else is orange. The key says "Color: 2 nodes". That is what I wanted. Done.

Command: `--end rounds/round-2/sessions/r2-s53`

## Wrap-up (in character)

- **Finished?** Yes. Gus and Ivan ran together once (the tie's "weight" is 1), and the two of them
  are now the only purple dots on the drawing; it stays after I click away.
- **Ease:** 6 of 7.
- **What confused me:**
  - The tie's panel calls my runs-together column "weight", which is just my column name, fine,
    but the title reads "Gus -> Ivan" with an arrow, as if one of them ran with the other and not
    both together. I let it go.
  - "Select endpoints" is engineer talk; "Select Gus and Ivan" or "Select both people" would have
    been clearer. I guessed right.
  - The new color entry is named "2 nodes", in the list and in the key on the drawing. For a deck I
    would want to call it "Gus and Ivan", and I did not see where to rename it.
  - The yellow glow after selecting looked like "standing out" for a moment, but it disappears when
    you click away, so I knew I still had to color them.
