# Session r1-s54 -- Alex (returning operations analyst), task T24 prompt B (bus stops)

Build: 946256efb876 (frozen, served from .study-builds/tier2-r1d4-946256efb/).

## Start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ node ../tool/real.mjs --start rounds/round-1/sessions/r1-s54 setup:bus-stops-ranked-names.txt`

01.png -- bus-stops is open, every stop named, sized and colored by PageRank (legend top left). I
can see Station at the top and Stadium just under it with a short gray arrow between them. The
question is the minutes on that link. In Gephi I'd click the edge or look in the edges table. I'll
just try clicking on the line itself, roughly halfway between the two dots.

## Step 1

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click-at 752,165` -- tool said "edge with id 15".

02.png -- Good, that worked first try. The line turned blue and the right panel says
"Station -> Stadium", Edge, From Station, To Stadium, minutes 4. So the link takes 4 minutes.
That's the first half. Now I need Station and Stadium to stand out and nothing else. There's a
three-dot menu at the top right of the panel next to the edge's name; I'll see what's in there
before I go hunting in Style.

## Step 2

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click-at 1419,73` -- "Edge actions" button.

03.png -- Menu: "Select endpoints", "Frame selection", "Add note". "Endpoints" is a bit
developer-y but I get it -- the two stops on either end. Selecting them is a start; whether that
counts as "standing out" we'll see. Clicking "Select endpoints".

## Step 3

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click "Select endpoints"`

04.png -- Station and Stadium now have yellow rings around them, nobody else does. Panel says
"2 nodes selected", Nodes 2, Edges joining these nodes 1. That does make them stand out. My worry:
a selection is gone the second I click somewhere else, and I'd want this to stay for a screenshot.
Since I color things from Style every week anyway, I'll peek at the Style tab for this selection
to see if I can give the two of them their own color.

## Step 4

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click "role=tab:Style"`

05.png -- Style for "2 nodes selected": Fill, Shape, Effects, Label, Tooltip, each with a plus.
Same kind of panel I use on Everything. I'll hit the plus next to Fill to give these two a color
of their own.

## Step 5

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click-at 1419,136` -- "Add to Fill".

06.png -- A little menu: Color, Opacity. Color.

## Step 6

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click "Color"`

07.png -- It made a new entry on the left called "2 nodes", above PageRank, with color 6366F1, and
the legend got a "Color: 2 nodes" row with a purple swatch. Station and Stadium look a dull
grayish-purple under the yellow ring -- hard to tell with the selection ring on top. I'll click on
empty canvas to drop the selection and see whether the color stays on its own.

## Step 7

Command: `node ../tool/real.mjs --step rounds/round-1/sessions/r1-s54 --click-at 1050,300` -- "empty canvas".

08.png -- Selection gone, and Station and Stadium are still blue-purple while every other stop is
the PageRank orange. That's what I wanted: those two stand out and nobody else does, and it isn't
going to vanish on the next click. The legend now has "Color: 2 nodes" at the top. The legend box
has also grown and now sits over the top of Depot's label. Done.

Command: `node ../tool/real.mjs --end rounds/round-1/sessions/r1-s54`

## Debrief (in character)

**Did you finish?** Yes. The Station -> Stadium link takes **4 minutes** (from the panel that
opened when I clicked the line: From Station, To Stadium, minutes 4). Station and Stadium are now
colored blue-purple on their own; every other stop keeps the PageRank orange.

**Ease: 6 out of 7.**

What went well: clicking the line itself just worked -- that's the thing I'd expect and Gephi makes
you go to the data table for it. The panel told me exactly which two stops and the minutes, with
the column name from my file. "Select endpoints" in the three-dot menu got me the two stops in one
click.

What confused me or slowed me down:
- "Select endpoints" was tucked behind the three-dot menu; I only found it because I poke at menus.
  And "endpoints" is a bit programmer-speak -- "select Station and Stadium" or "select both stops"
  would read faster.
- After selecting, the yellow ring did make them stand out, but I couldn't tell whether that
  counts or whether it disappears on the next click (it does). I had to go to Style and add a color
  to make it stick. Fine for me since I do that weekly, but it's four more clicks.
- When the color first landed, the two dots looked muddy gray-purple under the yellow ring; I
  couldn't see what color I'd actually given them until I clicked away.
- The new color entry is called "2 nodes", in the left list and in the legend. On a slide that
  legend row says nothing. I'd want it to say "Station, Stadium" or let me name it right there.
- The legend box grew and now covers the top of Depot's label.
