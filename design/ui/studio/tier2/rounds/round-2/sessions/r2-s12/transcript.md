# Session r2-s12 -- Jordan (marketing network analyst), task T22, dataset B (Les Miserables)

Build: `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/` (from the first line of tier2/criteria.md).
Commands run from `design/ui/studio/tier2`, with `S=rounds/round-2/sessions/r2-s12` and
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`.

Task as given: the Les Miserables network is open; each tie counts chapters two characters share.
Without taking any character or tie off the drawing, make every tie of 10 or more shared chapters
stand out from the rest, and say how many there are.

## Start

`REAL_DIST=... ../tool/with-browser.sh node ../tool/real.mjs --start $S setup:lesmis-ranked.txt`
(waited for a free browser slot first)

Screenshot 01: Les Miserables is open, nodes sized and colored orange by PageRank, a PageRank run
in the left list, its Style on the right. Ties are thin gray lines, all alike.

## Step 2

Jordan: "OK, Les Mis again. Ties all look the same. I've only ever used the find box for names,
but it says 'nodes, edges, values', so maybe I can just ask it for the big ties. Let me type the
chapter count and see what comes back."

`node ../tool/real.mjs --step $S --click "Find nodes, edges, values" --type "chapters 10"`

could not click "Find nodes, edges, values": elementHandle.click: Timeout 3000ms exceeded.
    - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
nothing that takes text has focus (focus is on the page); typed nothing, not "chapters 10"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/02.png

Screenshot 02: nothing changed. The click on the find box did not go through (the tool reports a
3-second timeout although the box was visible, enabled and stable), so nothing was typed.

## Step 3

Jordan: "Huh, it didn't take my click. Let me click right in the box itself."

`node ../tool/real.mjs --step $S --click-at 180,90 --type "chapters 10"`

at 180,90: combobox "Find"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/03.png

Screenshot 03: the box took the text and says 'No match for "chapters 10"'. No hint about what it
does understand.

## Step 4

Jordan: "No match. Fine, it doesn't know the word 'chapters'. Maybe the number column has a
different name. I'll clear it and try a comparison like I'd type in a spreadsheet: >= 10."

`node ../tool/real.mjs --step $S --key Control+a --type ">= 10"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/04.png

Screenshot 04: 'No match for ">= 10"'. Same dead end.

## Step 5

Jordan: "Still nothing. I don't even know what the tie number is called in this file. The Data
tab on the left showed me columns before -- let me look there for the edge column's name."

`node ../tool/real.mjs --step $S --click "Data"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/05.png

Screenshot 05: Data shows the source (77 nodes, 254 edges), a Filters section with a plus, and
Attributes: Nodes id, name; Edges shared_chapters (a number).

## Step 6

Jordan: "There it is, 'shared_chapters'. 'Filters' is right here too, but filters take things away
and I'm told not to hide anyone. Let me click the column itself and see what it offers."

`node ../tool/real.mjs --step $S --click "shared_chapters"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/06.png

Screenshot 06: the right panel shows a summary of shared_chapters: Edges, Amount, from the file,
17 distinct values, range 1 to 31. Nothing to act on except a "..." menu at the top right.

## Step 7

Jordan: "Range 1 to 31, good to know. No way to style from here though. Let me check that dots
menu."

`node ../tool/real.mjs --step $S --click-at 1419,74`

at 1419,74: button "Attribute actions"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/07.png

Screenshot 07: the menu has two items, "Filter to..." and "Show in table".

## Step 8

Jordan: "'Filter to' would take the small ties off, which is exactly what I'm not supposed to do.
A table I understand -- I can at least sort and count the 10-plus ties there."

`node ../tool/real.mjs --step $S --click "Show in table"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/08.png

Screenshot 08: an edge table opened under the canvas (254 edges, "In the order loaded"), columns
From, To, shared_chapters. The canvas shrank to the top half.

## Step 9

Jordan: "Now we're talking. Sort by shared_chapters, biggest first, and count down to 10."

`node ../tool/real.mjs --step $S --click "shared_chapters#2"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/09.png

Screenshot 09: nothing changed; still "In the order loaded".

## Step 10

Jordan: "Didn't sort. I'll click right on the column heading in the table."

`node ../tool/real.mjs --step $S --click-at 1107,742`

at 1107,742: button "shared_chapters"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/10.png

Screenshot 10: sorted, "highest first": Cosette-Valjean 31, Marius-Cosette 21, Marius-Valjean 19,
Javert-Valjean 17. Only four rows fit; the table strip is short. There is a small caret beside the
column heading.

## Step 11

Jordan: "Sorted. Four rows on screen at a time is stingy -- my laptop is going to hate this.
There's a little arrow next to the heading; maybe that has more to offer."

`node ../tool/real.mjs --step $S --click-at 1167,742`

at 1167,742: button "Options for shared_chapters"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/11.png

Screenshot 11: the caret only offers "Move left" and "Move right" (both look grayed out).

## Step 12

Jordan: "Just column shuffling. Forget it. When I color by group I go to Everything and its Style
tab -- maybe ties have a style there I can tie to shared_chapters. Back to Graph."

`node ../tool/real.mjs --step $S --key Escape --click "Graph"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/12.png

Screenshot 12: back on Graph: Selection, PageRank, Everything; the right panel shows the Graph
overview (77 nodes, 254 edges). The edge table is still open below.

## Step 13

Jordan: "Before I dig in Style -- now that I know the column is 'shared_chapters', let me give the
find box one more go with its real name."

`node ../tool/real.mjs --step $S --click-at 180,90 --type "shared_chapters >= 10"`

at 180,90: combobox "Find"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/13.png

Screenshot 13: this time the box answers with a hint: "Start with = to select by a value:
=shared_chapters >= `10`" (in code font, with backticks around the 10).

## Step 14

Jordan: "Oh, NOW it tells me. Needs an equals sign in front, and apparently little tick marks
around the number? Odd, but I'll copy it exactly and hit Enter."

``node ../tool/real.mjs --step $S --key Control+a --type "=shared_chapters >= `10`" --key Enter``

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/14.png

Screenshot 14: "13 edges selected". The 13 ties are drawn thick and blue on the map; every other
character and tie is still there in gray. The right panel lists them with their counts
(Cosette -- Valjean 31 down to MmeMagloire -- Myriel and Bossuet -- Enjolras at 10), and the
matching rows in the table below are highlighted. Selection in the left list now shows 13.

## Step 15

Jordan: "There we go -- 13, and they light up blue right on the map, nothing hidden. The list
matches my sorted table, I can see the 10s at the bottom, so I believe it. My worry is that blue
disappears the second I click anything else. The selection has a Style tab -- let me peek whether
I can make it stick."

`node ../tool/real.mjs --step $S --click "role=tab:Style"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/15.png

Screenshot 15: the selection's Style tab offers Line, Arrows and Label, each with a plus.

## Step 16

Jordan: "Line, plus. If I give these a line color here, I'd hope it stays when I click away."

`node ../tool/real.mjs --step $S --click-at 1419,136`

at 1419,136: button "Add to Line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/16.png

Screenshot 16: a menu: Color, Width, Opacity, Pattern, Curved.

## Step 17

Jordan: "Width -- thicker lines will survive a grayscale printout better than a color."

`node ../tool/real.mjs --step $S --click "Width"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/17.png

Screenshot 17: a new item "13 edges" appeared in the left list (with a brush icon), and the right
panel calls it a Layer with Line Width 8. The ties still show selection blue, so I cannot tell
what the width did yet.

## Step 18

Jordan: "It made its own item, '13 edges'. Good sign. Let me clear the selection and see whether
those ties still stand out without the blue."

`node ../tool/real.mjs --step $S --click-at 276,90`

at 276,90: button "Clear search"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/18.png

Screenshot 18: the find box is empty, but Selection still says 13 and the ties are still blue.
Clearing the search did not clear the selection.

## Step 19

Jordan: "Still selected. I'll click an empty bit of the map, that usually lets go."

`node ../tool/real.mjs --step $S --click-at 1050,500`

at 1050,500: empty canvas
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/19.png

Screenshot 19: selection cleared (Selection shows no count), "13 edges" still in the list. But
the map looks exactly as it did at the start: every tie thin and gray. A close crop of the lower
half (the Valjean hub and the long tie down to the bottom cluster, which were thick blue a moment
ago) shows no tie any wider than the rest. The "Width 8" did nothing visible.

## Step 20

Jordan: "Wait. The width I set did nothing -- they're all hairlines again. Maybe 8 is in some unit
that means nothing. Color will at least show. Open '13 edges' and add a line color."

`node ../tool/real.mjs --step $S --click "13 edges"`

/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/20.png

Screenshot 20: the "13 edges" layer is open (eye icon shows it is on), Line Width 8. Map unchanged.

## Step 21

Jordan: "Layer is on, width says 8, the map says otherwise. Add Color."

`node ../tool/real.mjs --step $S --click-at 1419,112 --click "Color"`

at 1419,112: button "Add to Line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/21.png

Screenshot 21: Color added, but it starts as A9A9A9 -- the same gray as every other tie -- so
nothing changes on the map. The legend now has an "Edge color: 13 edges" entry with a gray swatch.

## Step 22

Jordan: "It defaulted to the same gray as everything else, which is pointless. I'll type a red in
there."

`node ../tool/real.mjs --step $S --click-at 1268,160 --key Control+a --type "D62828" --key Enter`

at 1268,160: input "Color hex value"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/22.png

Screenshot 22: the 13 ties are now red on the map, with a red "13 edges" swatch in the legend, and
everything else is still drawn. But they are still hairlines -- as thin as the gray ones -- so on
a projector they'd be easy to miss.

## Step 23

Jordan: "Red, finally. Still hairlines though; that width box is lying to me. One more try: crank
it way up and see if anything moves."

`node ../tool/real.mjs --step $S --click-at 1334,194 --key Control+a --type "30" --key Enter`

at 1334,194: combobox "Width"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12/23.png

Screenshot 23: at width 30 the 13 ties are clearly thick and red; every character and every other
tie is still on the map in gray. So width 8 was not broken, it was just too small to see any
difference from the default hairline -- the box gives no idea what a sensible number is.

## End

Jordan: "That's it. 13 ties of 10 or more chapters, red and thick, nobody taken off the map. Done."

`node ../tool/real.mjs --end $S`

session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tier2/rounds/round-2/sessions/r2-s12

## Debrief (in character)

**Did you finish?** Yes. There are 13 ties of 10 or more shared chapters (from Cosette -- Valjean
at 31 down to MmeMagloire -- Myriel and Bossuet -- Enjolras at 10). They are red and thick on the
map, with every character and tie still drawn, and the legend has a "13 edges" entry. The count
matched what I could see in the sorted edge table, so I trust it.

**Ease: 3 out of 7.**

**What confused me:**

- The find box. I've only ever typed names in it. "chapters 10" and ">= 10" both just said "No
  match" with no hint. Only once I'd gone to Data, found the column was called
  "shared_chapters", and typed that name did the box finally tell me the trick: start with "=".
  If it had said that the first time I typed a number or a ">", I'd have saved five minutes.
- The tick marks around the 10 in the hint (`` `10` ``). I copied them because I didn't know if
  they mattered. It worked, but it looks like code, and I'd never remember to type it.
- The first click on the find box didn't register at all; I had to click again.
- The column's own menu only offered "Filter to..." (which would hide things, the opposite of
  what I wanted) and "Show in table". There's no "make these stand out" next to the column, which
  is where I looked first.
- Clearing the find box didn't clear the selection. I had to click empty map to let go.
- Making it stick: selecting turned the ties blue, but I knew blue would vanish on the next click.
  Adding a Line style from the selection made its own "13 edges" item -- good -- but the width
  started at 8 and looked exactly as thin as every other tie, so I thought it was broken. The
  color started as the same gray as every other tie. I had to type a hex red and a width of 30
  before anything actually stood out. A starting color and width that look different from the
  rest would have saved me two rounds of "did that do anything?".
- The edge table only shows four rows at a time at this screen size, and the map shrinks to the
  top half. On my laptop in a meeting that's a squeeze.

**Off topic:** "Honestly this is the kind of thing my listening suite should let me do on reply
counts and won't, because it wants a Boolean query for everything."
