# Session r4-s11 -- Dana Okafor (returning user)

Task: in the colleague's bus-stops.csv (already open), mark on the drawing every link of 10 minutes or more, without removing any stop or link, and say how many there are.

Commands use: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs <cmd> $S (S = this session folder)

## Step 1 -- start
`--start $S setup:bus-stops-ranked.txt` -> 01.png
Dana: The bus file is open, sized and colored by a PageRank ranking someone already ran. Ten stops, arrows between them, no minutes visible anywhere on the lines. I need the slow links. Toolbar at the bottom has a funnel (filter) and a magnifier, and a "Find nodes, edges, values" box top left. Filter worries me -- the task says don't take anything off. I'll first look at the table to see the minutes.

## Step 2 -- hover the grid icon
`--step $S --hover-at 793,864` -> 02.png. Tooltip "Table Shift+T".

## Step 3 -- open the table
`--step $S --click "Table"` -> 03.png
Dana: A table opened under the drawing, Nodes tab, ten stops with PageRank. Tables I can read. There is an Edges tab -- the links and minutes should be there. Clicking it.

## Step 4 -- Edges tab
`--step $S --click "Edges"` -> 04.png
Dana: 17 edges, From / To / minutes. Only four rows show. I'll sort by minutes so the slow ones bunch together -- click the minutes header.

## Step 5 -- sort by minutes
`--step $S --click "minutes"` -> 05.png
Dana: "Sorted by minutes, highest first": Depot-Station 15, Station-Harbor 14, School-Harbor 12, then Depot-School 9. So three links are 10 or more. That's the count. Now I need them marked on the drawing. Easiest guess: click the rows and see whether they light up in the picture. Clicking the first row.

## Step 6 -- click the 15-minute row
`--step $S --click-at 700,775` -> 06.png
Dana: The Depot-Station link turned thick blue in the drawing and "Selection 1" shows on the left. Good. I'll shift-click the 14 and 12 rows to add them, like in Excel.

## Step 7 -- shift-click the 14 and 12 rows
`--step $S --shift-click "14" --shift-click "12"` -> 07.png
Dana: Three links are thick blue now: Depot-Station, Station-Harbor, School-Harbor. Right panel says "3 edges selected". (The shift-click also smeared browser text highlighting over the From/To cells -- cosmetic, but it looks like a glitch.) Trouble is, a selection goes away the moment my colleague clicks anything. I want it to stay. There's a Style tab for the selection -- let's see if I can paint them.

## Step 8 -- Style tab of the selection
`--step $S --click "Style"` -> 08.png
Dana: Line, Arrows, Label, each with a plus. I'll press the plus next to Line and make these three red and thick so they stay.

## Step 9 -- plus next to Line
`--step $S --click-at 1419,142` ("Add to Line") -> 09.png
Dana: A menu: Color, Width, Opacity, Pattern, Curved. Color.

## Step 10 -- Color
`--step $S --click "Color"` -> 10.png
Dana: It made a layer called "3 edges" in the left list and a legend entry "Edge color: 3 edges". Color is black (000000) -- black on grey isn't loud enough. I'll type red into the box.

## Step 11 -- type red
`--step $S --click-at 1265,160 --key Control+a --type "e00000" --key Enter` -> 11.png
Dana: Red now, under the blue selection outline; legend shows a red "3 edges" swatch. Let me click empty canvas to drop the selection and see whether the red stays on its own.

## Step 12 -- clear the selection
`--step $S --click-at 1050,200` -> 12.png
Dana: The three slow links stay red on their own: Depot->Station, Station->Harbor, School->Harbor. Panel still says 10 nodes, 17 edges -- nothing taken off. Legend reads "Edge color: 3 edges" in red. That's the job. Ending.

## End
`--end $S` -> session ended, no further request.

## Debrief (Dana, in character)

- **Did I finish?** Yes. Three links take 10 minutes or more: Depot -> Station (15), Station -> Harbor (14), School -> Harbor (12). They are red on the drawing; all 10 stops and 17 links are still there.
- **Ease: 5 out of 7.** The table with a sortable minutes column is what got me there -- that is the part that feels like Excel. Click a row, the link lights up in the picture: that's genuinely useful.
- **What confused me / what I didn't like:**
  - I never found a way to say "minutes 10 or more" as a rule. I hand-picked three rows. Next month, when my colleague's times change, the red layer will still be those same three links whether they're slow or not, and I'd redo it by hand. That's exactly the monthly chore I already hate.
  - The new layer is called "3 edges". That tells nobody what it means. I'd want it to say "10+ minutes" (I didn't try renaming it).
  - Default color for the new line was black, which barely stands out against grey links; and the red line is thin. I had to know to type a hex code.
  - Shift-clicking rows also painted browser text highlighting over the From/To cells -- looks like a glitch.
  - The drawing has no stop names on it, so "pointing out" a link on the picture only works if you also read the table.
  - Didn't touch the funnel button: on a task that says "don't take anything off", a filter felt risky and nothing told me it wouldn't hide things.
