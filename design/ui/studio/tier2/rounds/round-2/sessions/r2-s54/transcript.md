# Session r2-s54 -- Dana, T24 (bus stops)

Command run from design/ui/studio:

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7 node tool/real.mjs --start tier2/rounds/round-2/sessions/r2-s54 setup:bus-stops-ranked-names.txt

## 01.png
The bus stops are open, names drawn, ranked and colored like my supplier work. Station is at the top,
Stadium just below and to the left, with a short line between them. I want the minutes on that
link, so I will click right on that short line between the two dots.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click-at 757,160
    -> at 757,160: edge with id "15"

## 02.png
That worked first time. The link turned blue and the right panel says "Station -> Stadium",
From Station, To Stadium, minutes 4. So the link takes 4 minutes. Now I need Station and Stadium to
stand out. There is a three-dot menu next to the link's name at the top right; I will try that to
see if it offers something for the two stops.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click-at 1419,73
    -> button "Edge actions"

## 03.png
A small menu: "Select endpoints", "Frame selection", "Add note". "Endpoints" is a bit techy, but
the two ends of a link are the two stops, so that should grab Station and Stadium. I will click it.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click "Select endpoints"

## 04.png
Station and Stadium now have a yellow glow, and the panel says "2 nodes selected". They do stand out
a little, but a glow from clicking feels like it will vanish the moment I click somewhere else. For
my VP I would want them actually colored. The panel has a Style tab for this selection, so I will
open Style and look for a color.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click "role=tab:Style"

## 05.png
Style for the selection shows Fill, Shape, Effects, Label, Tooltip, each with a plus. Fill sounds
like the color of the dot. I will press the plus next to Fill.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click-at 1419,135
    -> button "Add to Fill"

## 06.png
It offers Color or Opacity. Color.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click "Color"

## 07.png
Station and Stadium turned blue right away; every other stop is still orange. A new row "2 nodes"
appeared in the left list and the key now has "Color: 2 nodes". Before I call it done I want to make
sure the blue stays when I click away, so I will click an empty spot of the drawing.

    node tool/real.mjs --step tier2/rounds/round-2/sessions/r2-s54 --click-at 1050,400
    -> empty canvas

## 08.png
The glow is gone, but Station and Stadium are still blue and nothing else is. The panel went back
to the overview of the whole network. That is what I wanted, so I am done.

    node tool/real.mjs --end tier2/rounds/round-2/sessions/r2-s54
    -> session ended

## Wrap-up (Dana, in my own words)

- **Did I finish?** Yes. The Station to Stadium link takes 4 minutes, and Station and Stadium are
  now blue while every other stop stays orange, and it stayed that way after I clicked away.
- **Ease:** 6 out of 7.
- **What went well:** clicking right on the line just worked, and the panel told me the two stops
  and the minutes without my opening any table. Coloring the two stops was the same Fill and Color
  I would expect anywhere.
- **What confused me or slowed me down:**
  - "Select endpoints" is jargon. I guessed it meant the two stops at each end, and it did, but
    "Select Station and Stadium" or "Select both stops" would have been obvious.
  - After selecting, the stops only glowed. I was not sure whether that glow counted as "standing
    out" or would disappear on the next click; I had to go into Style to make it stick. Nothing
    told me the glow was temporary until I tried.
  - The new key entry just says "2 nodes". If I came back next month I would not know which two or
    why. I would want to name it, but I did not see where at a glance.
  - The key box on the drawing sits over the top of the "Depot" name once it grows a row.
