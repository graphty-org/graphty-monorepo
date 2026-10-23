# Session r2-s11 -- Dana (supply chain risk analyst), task T22, dataset A (bus stops)

Build: tier2-r2d4-8f0d5a6f7 (commit 8f0d5a6f7791). Window 1440 x 900.

## Start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ ../tool/with-browser.sh node ../tool/real.mjs --start rounds/round-2/sessions/r2-s11 setup:bus-stops-ranked.txt` -> 01.png

01.png: My colleague's bus-stops file is open, ten orange dots colored and sized by the PageRank thing I usually run, a key at top left. The links are thin grey arrows, all the same. Nothing says how many minutes each link takes. The left list has Selection, PageRank (10), Everything. I need the links at 10 minutes or more. First I want to see the actual numbers -- I'll go to the Data place, where the table is.

## Step 1

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "Data"` -> 02.png

02.png: The Data place: bus-stops.csv, 10 nodes, 17 edges. There is a Filters "+" but filtering would take links off, and the colleague said not to. Under Attributes, Edges, there is "minutes". That's my column. I'll click on "minutes" and see what it offers -- maybe a breakdown or a color option.

## Step 2

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "minutes"` -> 03.png

03.png: Right panel says minutes is an Amount on Edges, range 2 to 15, 10 distinct values. Fine, but no table and no count of how many are 10 or more. There's a "..." at the top right of that panel. I'll open it -- maybe "color by" or "show table" lives there.

## Step 3

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 1419,74` (the "..." -- Attribute actions) -> 04.png

04.png: Two choices: "Filter to..." and "Show in table". Filter would cut links out, and I was told not to. A table is where I'm at home -- I'll take "Show in table" and count the 10-plus rows myself, then figure out the coloring.

## Step 4

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "Show in table"` -> 05.png

05.png: A table at the bottom: From, To, minutes, 17 edges, "in the order loaded". Only four rows fit; tiny window. I'll click the minutes heading to sort it, like in Excel, so the big ones come together.

## Step 5

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 1130,742` (the minutes heading) -> 06.png

06.png: "Sorted by minutes, highest first": Depot-Station 15, Station-Harbor 14, School-Harbor 12, then Depot-School 9. So three links are 10 or more -- the fourth is already under. That's my count: 3. Now to make them stand out on the map. In Excel I'd select the rows. I'll click the first row, then shift-click the third, and see whether the map picks them up.

## Step 6

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 600,775 --shift-click "School"` -> 07.png (the row click worked; the shift-click name was ambiguous and did nothing)

07.png: Clicking the 15-minute row lit that link up thick and blue on the map, and the right panel shows Depot -> Station, 15 minutes. That's what I want, for all three. I'll shift-click the 12-minute row to grab the range.

## Step 7

Commands: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --shift-click-at 600,841` (no such step; nothing happened, no screenshot), then `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --shift-click "12"` -> 08.png

08.png: "3 edges selected" -- School->Harbor, Depot->Station, Station->Harbor -- all three thick blue on the map, everything else still there. The table also shows the browser's own blue text highlight over the cell words where I shift-clicked, which looks messy but is harmless. Count confirmed: 3. But blue selection goes away the moment I click anything else, and my colleague needs to look at it later. There's a Style tab on this selection -- I'll open it and give these a color that stays.

## Step 8

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "role=tab:Style"` -> 09.png

09.png: Style for the 3 selected edges: Line, Arrows, Label, each with a "+". The labels are tiny and grey, I'm squinting. Line sounds like color and thickness. I'll press the "+" next to Line.

## Step 9

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 1419,136` ("Add to Line") -> 10.png

10.png: A menu: Color, Width, Opacity, Pattern, Curved. Color first -- red for slow links, the way I'd do a heat map.

## Step 10

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "Color"` -> 11.png

11.png: The panel title changed to "3 edges -- Layer", and the key at top left now has "Edge color: 3 edges" with a grey swatch. The color box says A9A9A9, which is the same grey as every other link, so nothing changed yet. I'll click in that hex box, clear it and type a red.

## Step 11

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 1265,160 --key Control+a --type "E00000" --key Enter` -> 12.png

12.png: The three links now have a red core inside the blue selection outline, and the key says red = "3 edges". The red line is thin though -- on my laptop screen in a meeting it would disappear. I'll add Width as well from the Line "+".

## Step 12

Commands: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 1419,112` ("Add to Line", 13.png: the same menu as before) then `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "Width"` -> 14.png

14.png: A Width row appeared with "8" in it, but the links on the map look the same thickness as before -- the blue selection outline is on top so I can't really judge. No idea what 8 is in (pixels? points?). I'll click an empty spot on the map to drop the selection and see what actually stays.

## Step 13

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 450,500` (empty canvas) -> 15.png

15.png: Selection gone. Depot->Station, Station->Harbor and School->Harbor are red; the other 14 links are grey; the panel still says 10 nodes, 17 edges, so nothing was taken off. That's the job. Two things bug me: the red lines are no thicker than the grey ones -- the "8" in Width did nothing I can see -- and the key says red = "3 edges", which tells my colleague nothing. It should say "10 minutes or more". I'll look at the Graph place to see if I can rename that.

## Step 14

Commands: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "Graph"` (ambiguous, did nothing; 16.png unchanged) then `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click "Graph#1"` -> 17.png

17.png: The Graph list now has "3 edges" between Selection and PageRank -- that's my red thing. I'll double-click it to rename it, the way I rename a sheet tab in Excel.

## Step 15

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --dblclick "3 edges"` -> 18.png

18.png: It went into a rename box with "3 edges" highlighted, just like Excel. The right panel shows my red and Width 8 again. I'll type a name that means something and press Enter.

## Step 16

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --type "Slow links (10+ min)" --key Enter` -> 19.png

19.png: Renamed. The key now reads "Slow links (10+ min)" with the red swatch -- that I can put in front of someone. Last annoyance: Width still says 8 and the red lines are as thin as the grey ones. One try: put a bigger number in Width.

## Step 17

Command: `node ../tool/real.mjs --step rounds/round-2/sessions/r2-s11 --click-at 1333,194 --key Control+a --type "20" --key Enter` (the Width box) -> 20.png

20.png: Now the three slow links are thick red lines and stand out clearly; all 10 stops and the other 14 grey links are still on the map. The red lines seem to have lost their arrowheads compared with the grey ones, which I only half notice -- direction isn't what my colleague asked about. I'm done.

Command: `node ../tool/real.mjs --end rounds/round-2/sessions/r2-s11`

## Wrap-up (in character)

**Did I finish?** Yes. There are 3 links of 10 minutes or more: Depot -> Station (15), Station -> Harbor (14), School -> Harbor (12). They're thick red on the map, nothing was taken off, and the key reads "Slow links (10+ min)".

**Ease: 5 out of 7.**

How I did it: Data place, clicked the minutes column, "..." -> Show in table, sorted by minutes, clicked the top row and shift-clicked the third, then Style on the selection -> Line + -> Color, typed a red hex, then Width. That's basically my Excel habit -- sort, eyeball, select -- and the app went along with it, which I liked. The table selecting the links on the map is the best thing I've seen in here.

What confused or bothered me:
- I never used the search box. Nothing told me it could do "minutes 10 or more"; I counted by eye from a sorted table. Fine for 17 rows. With 1,400 suppliers I'd want to type the condition, not scroll and shift-click, and I wouldn't trust my own shift-click range.
- What I made is a fixed list of three links, not a rule. If my colleague sends next month's file with different minutes, I suspect the red stays on these three and doesn't follow the 10-minute cutoff. Nothing on screen tells me which it is.
- The colored thing was named "3 edges" in the key until I renamed it. My colleague would have no idea what that meant.
- Adding Width put an 8 in the box and the lines did not get any thicker. I had to guess a bigger number (20) before anything showed. No units shown.
- Before I clicked away, the selection's blue outline covered my red, so I couldn't judge the color or the width while I was setting them.
- Shift-clicking table rows also lit up the cell text in browser blue, which looked like a glitch.
- The labels in the right panel (Line, Arrows, Label, Width) are tiny grey text -- hard to read without my glasses.
- The red links seem to have lost their arrowheads once they got thick.
