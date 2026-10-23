# Session r1-s52 -- Dev (returning student), T24 prompt B (bus stops)

Build: frozen build 946256efb876 (`.study-builds/tier2-r1d4-946256efb/`). Setup: `bus-stops-ranked-names.txt`.
All commands run from `design/ui/studio/tier2` with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/` and `S=rounds/round-1/sessions/r1-s52`.

## Steps

### 01 -- start

Command: `node ../tool/real.mjs --start $S setup:bus-stops-ranked-names.txt`

Okay, the bus stops are open, every stop has its name, and they're sized and colored by PageRank like my last assignment. I need the link between Station and Stadium. There's a short line going from Stadium up to Station, right under the "Station" ball. Last time I only ever clicked on dots... wait, can I click a line? I'll just try clicking right on that short line between them.

### 02 -- click the line between Station and Stadium

Command: `node ../tool/real.mjs --step $S --click-at 760,150` -> "edge with id 15"

Oh nice, the line went blue and the right side says "Station -> Stadium", From Station, To Stadium, minutes 4. So that link takes 4 minutes. Essay sentence: "The Station-Stadium link takes 4 minutes." Wait, the arrow says Station -> Stadium, so it's one way? Fine, the question was just how many minutes.

Now I need Station and Stadium to stand out, and nothing else. The panel is about the line, not the stops. There's a "..." in the top right of the panel, apps hide stuff there. I'll try that before going hunting in Style.

### 03 -- open "Edge actions" (the ... button)

Command: `node ../tool/real.mjs --step $S --click-at 1419,73` -> button "Edge actions"

A menu: "Select endpoints", "Frame selection", "Add note". Endpoints... I guess that means the two stops at the ends of the line, Station and Stadium? Selecting isn't "standing out" exactly, but last time I made a selection and then styled it, so let's try "Select endpoints".

### 04 -- "Select endpoints"

Command: `node ../tool/real.mjs --step $S --click "Select endpoints"`

Okay! Station and Stadium have yellow glows now, and the right says "2 nodes selected", Nodes 2, "Edges joining these nodes 1". So endpoints = the two stops, good. They do stand out... but wait, that's just the selection glow, right? If I click somewhere else it'll go away, and it won't be in my figure. Last time I made things bigger and colored from a Style tab. There's a "Style" tab right here next to Values for the selection, so I'll try that and give these two a color of their own.

### 05 -- Style tab of the selection

Command: `node ../tool/real.mjs --step $S --click "role=tab:Style"`

Style for "2 nodes selected": Fill, Shape, Effects, Label, Tooltip, each with a plus. Fill is color, that's what I want, a bright color nobody else has. Click the plus next to Fill.

### 06 -- plus next to Fill

Command: `node ../tool/real.mjs --step $S --click-at 1419,136` -> button "Add to Fill"

Little menu: Color, Opacity. Color.

### 07 -- "Color"

Command: `node ../tool/real.mjs --step $S --click "Color"`

Whoa, it made a new thing on the left called "2 nodes" and the key on the drawing says "Color: 2 nodes" with a purple square. The color box says 6366F1. But wait, Station and Stadium on the drawing look kind of grayish-tan, not purple? Maybe the yellow selection glow is mixing in. Let me press Escape to drop the selection and see what they really look like.

### 08 -- Escape to drop the selection

Command: `node ../tool/real.mjs --step $S --key Escape`

Oh nice, that's it. With the glow gone, Station and Stadium are blue-purple and every other stop is still orange. A little message says "Selection cleared: 2 nodes", and the left side still has my "2 nodes" thing, so the color stays. The key on the drawing has "Color: 2 nodes" in purple. Done, I think.

Hmm, one thing: the key box on the drawing got taller and now covers the top of the "Depot" name, it reads "epot". If I exported this for my essay that would look sloppy. And the key just says "2 nodes"; my instructor wouldn't know that means Station and Stadium unless they look at the drawing.

Command: `node ../tool/real.mjs --end $S`

## End

**Did I finish?** Yes. The Station-Stadium link takes 4 minutes (the panel said "minutes 4" when I clicked the line). Station and Stadium are now blue-purple and no other stop is.

Essay sentence: "The bus link from Station to Stadium takes 4 minutes; I highlighted those two stops in purple."

**Ease: 6 / 7.** I did not know I could click a line, but it just worked, and the numbers came up right away with the column name from my file ("minutes"). Eight steps, no wrong turns.

**What confused me:**

- "Select endpoints" -- I had to guess that "endpoints" means the two stops at the ends of the line. It turned out right, but "Select Station and Stadium" or "select both stops" would have told me for sure.
- After I picked Color, the two stops looked grayish-tan, not the purple shown in the box, until I cleared the selection. For a second I thought the color hadn't worked.
- The selection glow alone already made them "stand out", so I wasn't sure whether selecting was enough or I had to color them. I colored them because a selection goes away when you click elsewhere.
- The key box on the drawing grew when my new color was added and now hides the start of the "Depot" name.
- The key and the left list call my coloring "2 nodes", not which two; I would rename it to "Station and Stadium" if I knew how.
- The panel title said "Station -> Stadium" with an arrow; I wondered whether the other direction might take a different number of minutes, but the question did not need it.
