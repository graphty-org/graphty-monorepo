# Session r2-s52 -- Ruth (returning), T24 prompt B (bus stops)

Build: tier2-r2d4-8f0d5a6f7 (commit 8f0d5a6f7791). Setup: bus-stops-ranked-names.txt.

## Steps

### 1. Start
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ node ../tool/real.mjs --start rounds/round-2/sessions/r2-s52 setup:bus-stops-ranked-names.txt` -> 01.png

Ruth: The colleague's bus map is up, every stop named, sized and colored by a PageRank I did not ask for. Station is at the top, Stadium just under it, and a gray line runs between them. I want to know what that line is. Last time I learned about a person by clicking them; I'll try clicking the line itself, in the middle, and see if the right side tells me anything.

### 2. Click the line's middle
`--step --click-at 751,168` -> 02.png. Tool: "at 751,168: node "Stadium"".

Ruth: Missed -- that took Stadium itself, which is highlighted, and the right side shows Stadium: Degree 3, PageRank #4 of 10. Fair; the line is short and Stadium's ball is close. I'll try the line again nearer Station, where it is clear of both balls.

### 3. Click the line nearer Station
`--step --click-at 763,141` -> 03.png. Tool: "at 763,141: edge with id "15"".

Ruth: That's the line, drawn blue now. Right side: "Station -> Stadium", Edge; From Station, To Stadium, minutes 4. So the link takes 4 minutes -- straight from the colleague's column, "minutes", and I can see which two stops it joins, so I'd put that in print. Now to make just those two stops stand out. There's a "..." at the top right of that panel; I'll see what it offers.

### 4. Open "Edge actions" (the "...")
`--step --click-at 1419,73` -> 04.png. Tool: "button "Edge actions"".

Ruth: A short menu: "Select endpoints", "Frame selection", "Add note". "Endpoints" is jargon, but I read it as the two stops at the ends of this link. Selecting them is not the same as making them stand out, but it is the first step I can see. Trying it.

### 5. "Select endpoints"
`--step --click "Select endpoints"` -> 05.png.

Ruth: "2 nodes selected", and Station and Stadium both have a yellow glow; "Edges joining these nodes 1". Good -- the right two. But a glow from selecting goes away the moment I click anything else, so that's not "standing out" for an editor. The panel has a Style tab for this selection; I'll look there for a color.

### 6. Style tab of the selection
`--step --click "role=tab:Style"` -> 06.png.

Ruth: Fill, Shape, Effects, Label, Tooltip, each with a "+". Color is the obvious way to make two dots stand out against all that orange. I'll press the "+" by Fill.

### 7. "+" by Fill
`--step --click-at 1419,136` -> 07.png. Tool: "button "Add to Fill"".

Ruth: A small list: Color, Opacity. Color.

### 8. "Color"
`--step --click "Color"` -> 08.png.

Ruth: Station and Stadium have turned blue (6366F1); every other stop stays orange. On the left a new entry "2 nodes" sits above PageRank, and the key in the corner now says "Color: 2 nodes". The key box has grown and now covers the top of the "Depot" label -- I can only just read it. Before I call this done I want to see the blue survive without the selection glow: I'll click an empty bit of the drawing.

### 9. Click empty drawing
`--step --click-at 1050,300` -> 09.png. Tool: "at 1050,300: empty canvas".

Ruth: Glow gone, Station and Stadium still blue, the other eight stops orange. The right side is back to the whole map: 10 nodes, 17 edges -- matches the colleague's 10 stops and 17 links. Done. I'm stopping here.

`--end rounds/round-2/sessions/r2-s52`

## At the end (Ruth)

**Did I finish?** Yes. The Station-Stadium link takes **4 minutes** (read from the panel: From Station, To Stadium, minutes 4). Station and Stadium are colored blue and no other stop is; it stays after the selection is cleared.

**Ease:** 6 of 7.

**What confused me or slowed me down:**
- My first click on the line took Stadium instead: the line between them is short and Stadium's ball sits on one end of it, so I had to aim at the bit near Station. Nothing told me lines could be clicked at all; I tried because it was the obvious thing to try.
- "Select endpoints" is a programmer's word. I guessed it meant the two stops at each end, and it did, but "Select both stops" would have saved me the guess.
- Selecting made them glow, which looks like standing out but isn't kept; I had to know to go on to Style, Fill, Color myself. The panel did not suggest the next step.
- The new key entry says "2 nodes", not "Station, Stadium". On the drawing I can see which two are blue, but a reader of the key alone could not; I want names.
- Once the key grew to three entries it covered the top of the "Depot" label on the drawing.
- The link reads "Station -> Stadium" with an arrow, so the colleague's sheet has a direction; I did not check whether there is also a Stadium -> Station link with a different time. If I were printing the number I'd want to check that.
