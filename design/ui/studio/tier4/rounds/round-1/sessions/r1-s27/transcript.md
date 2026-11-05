# Session r1-s27 -- Sam, keyboard-only analyst (returning user)

Task: put pantries.csv (sites) and deliveries.csv (routes) together as one network; report site count, route count, and whether any route did not fit the site list.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> empty --keys`
Screenshot 01.png: start screen. "Open a file", "Open network data", "Samples", "New project". No focus ring visible anywhere -- nothing has focus yet. Next: Tab once to find where focus starts.

## Step 2 -- Tab (1 press)
Command: `--step <session> --key Tab`
02.png: focus ring on "Samples" in the top bar. Clear ring, good. "Open a file" is down in the card; the top bar and the demo toolbar sit between. No shortcut hint printed on "Open a file". Next: Tab six more times and look.

## Step 3 -- Tab x6 (total 7)
Command: `--step <session> --key Tab x6`
03.png: a big dark ring around the whole demo picture area -- focus is on the demo canvas region, not on the card. The demo toolbar got skipped or focus went past it. "Open a file" still not reached. Next: Tab once more.

## Step 4 -- Tab (total 8)
04.png: focus on "Communities" in the demo toolbar. Demo is in the Tab order before the main card. Hoping the toolbar is one stop. Next: Tab.

## Step 5 -- Tab (total 9)
05.png: focus on "Key players". Each demo button is its own Tab stop. Shortest path, 2D, pause still ahead. Next: Tab x4, hoping to land on "Open a file".

## Step 6 -- Tab x4 (total 13)
06.png: focus is on "Open a file" (a thin dark ring, faint against the green but there). Thirteen tabs to reach the main button, because the top bar and the whole demo come first. Next: Enter, then pick pantries.csv in the file chooser (the site list first).

## Step 7 -- Enter + choose pantries.csv (2 key presses incl. Enter)
Command: `--step <session> --key Enter --upload pantries.csv`
07.png: the workspace opened with pantries: 12 nodes, 0 edges, table of sites below (P01 Central Warehouse...). "With issues 2" chip on the table -- something in families/site columns has warnings. Focus looks to be on the drawing (dark border around the canvas). Now I need to bring in deliveries.csv into the same network. I have never added a second file. Next: F6 to move between regions, as I did last month, and look for a Data / add-file place.

## Step 8 -- F6 (1)
08.png: focus moved to the floating toolbar on the canvas, first button (flask icon). I want the "Data" item on the left rail -- that sounds like where files go. Next: F6 again.

## Step 9 -- F6 (2)
09.png: focus is on the divider between drawing and table (a green bar under the toolbar). Not where I want. Next: F6 again.

## Step 10 -- F6 (3)
10.png: focus is on the left panel heading "Graph pantries.csv". The rail with Graph / Data / Notes is just left of it. Next: Shift+Tab to step back into the rail.

## Step 11 -- Shift+Tab
11.png: focus ring on the "Graph" rail button. Next: ArrowDown to "Data" (rails usually take arrows), then Enter.

## Step 12 -- ArrowDown, Enter
12.png: Data panel open. "Sources" with a "+" beside it, one source "pantries... 12, warning 2". Below: "pantries.csv / Rows are: nodes", Id: id, Latitude, Longitude. Focus ring on the Data rail button. The "+" next to Sources must be how a second file goes in. Next: Tab and watch where it lands.

## Step 13 -- Tab
13.png: focus on the "Sources" heading (collapse toggle). The "+" is next. Next: Tab, then Enter.

## Step 14 -- Tab
14.png: focus ring on the "+" beside Sources. No tooltip or key hint shows on focus. Next: Enter.

## Step 15 -- Enter
15.png: a menu: File... (Ctrl+O), Samples..., Server..., Network data..., Paste (Ctrl+V). "File..." is highlighted. Good -- a printed shortcut, Ctrl+O; I will remember it. Getting here: F6 x3, Shift+Tab, ArrowDown, Enter, Tab x2, Enter = 9 presses. Next: Enter on File..., choose deliveries.csv.

## Step 16 -- Enter on File..., chose deliveries.csv
16.png: a "Join deliveries.csv -> pantries.csv" view opened in place of the drawing. It already guessed: rows are Edges, Source "from" = Id, Target "to" = Id. Chips: "18 edges added", "1 new node", "1 not in graph", warning "1 repeated key". deliveries.csv has 19 rows. Left: the 12 sites; right: the 19 routes (P01-P02 trips 14, ...). Focus ring appears to be on the green "Join" button at top right. Nice that it guessed the columns. 19 rows but 18 edges -- the repeated key is probably the gap. "1 new node" suggests a route names a site not in the list. Next: Enter to Join, then read the totals.

## Step 17 -- Enter on Join
17.png: joined. Drawing now shows the sites connected. Overview: Nodes 13, Edges 18, Components 1, "From 2 files". Sources: pantries.csv 12; "d.." (deliveries) 13 nodes, 18 edges, warning 1. Focus landed on the new deliveries source row -- good, not thrown to the top. 13 nodes but the site list has 12 -- so one route points at a site that is not in pantries.csv. And 19 rows became 18 edges. I want to see exactly which. Next: Enter on the deliveries source row to see its details/warning.

## Step 18 -- Enter on the source row
18.png: right panel now shows "deliveries.csv Source -- Loaded: Nodes 1, Edges 18". So the route file added 1 node of its own and 18 edges. It does not say which node, nor why 19 rows gave 18 edges. The warning "1" on the source row is the next thing to read. Next: Tab, hoping it reaches the warning.

## Step 19 -- Tab
19.png: focus ring on the warning chip "1" in the deliveries row. Next: Enter to open it.

## Step 20 -- Enter on warning chip
20.png: a popup "Issues in deliveries.csv": "edges -- 1 unknown end", with buttons "Add nodes" (green, looks like the current choice), "Leave out", "Ignore", and "Ignore in all columns". So: one route has an end that is not in the site list, and the app added it as an extra node -- that is the 13th node. I cannot see a focus ring anywhere in the popup. It does not name which site/route. Nothing about the 19 rows vs 18 edges here. Next: Tab once to find focus inside the popup.

## Step 21 -- Tab
21.png: focus now on the popup's close X. So when the popup opened, focus was on the popup itself with no visible ring. Next: Tab twice to reach the "edges" chip, hoping it lists the offending row.

## Step 22 -- Tab x2
22.png: focus on "Ignore in all columns". Not that. Next: Tab once more to the "edges" chip.

## Step 23 -- Tab
23.png: focus went straight to "Add nodes"; the "edges" chip is not a stop, so the popup cannot show me which route or which site is the unknown end. Add nodes appears already in effect (13 nodes). I leave it as is. To name the extra site I will look at the bottom of the Nodes table. Next: Escape to close the popup and see where focus goes.

## Step 24 -- Escape
24.png: popup closed and focus came back to the warning chip. Good, that is how it should work. Now the table: 13 nodes listed, only P01-P10 visible. Next: F6 to move toward the table region.

## Step 25 -- F6
25.png: focus jumped to the right panel ("Loaded" toggle). Next: F6 again, looking for the table.

## Step 26 -- F6
26.png: focus on the drawing (ring around canvas). Last time F6 went canvas -> toolbar -> divider -> left panel; the table never got its own F6 stop. Next: F6 twice to the divider, then Tab into the table.

## Step 27 -- F6, F6, Tab
27.png: focus on the "Nodes" tab of the table. Next: Tab several times to get into the grid itself, then go to the last row.

## Step 28 -- Tab x3
28.png: focus on the "..." button by "Columns: 8 of 8". Expand and close are next, then (I hope) the grid. Next: Tab x3, then Control+End to jump to the last row.

## Step 29 -- Tab x3, Control+End
29.png: the grid scrolled to the bottom; a cell in the last row has a green ring. The last row is P13 -- id only, every other column blank (no lat, lon, families, site name, zip). That is the site the route list mentions but the site list does not have. Control+End worked as I expected in a grid. Finding P13 cost: Escape, F6 x4, Tab x7, Control+End = 13 presses. The F6 cycle has no stop for the table, which is why it cost so much.

I have what I was asked for. Stopping here.

## Wrap-up (Sam, in character)

**Answer for the food bank:**
- Put together: pantries.csv as the sites, deliveries.csv joined on as the routes (from -> id, to -> id).
- The network has **13 sites (nodes) and 18 routes (edges)**, all in one connected piece.
- **Something did not fit:** one route ends at **P13**, which is not in the site list. The app added P13 as a 13th site with no name or details, so the real site list is 12 and one route points outside it. Also, deliveries.csv has 19 rows but only 18 routes came in: the join preview flagged "1 repeated key", so one route appears twice in the route list and was counted once. (The site list also has 2 issues of its own -- a "0" and an "n/a" in families, flagged on the families and site columns -- but that is not about the routes.)

**Did I finish?** Yes.

**Ease: 5 of 7.** The core of the job worked entirely from the keyboard, and the join itself was very good: it guessed the from/to columns, showed me "18 edges added, 1 new node, 1 repeated key" before I committed, and put focus on the Join button. Focus came back to the right place after the join and after Escape on the popup. The "+" menu printed Ctrl+O beside File..., which I will use next time.

**Key presses:** reaching "Open a file" from the start page: 13 Tabs (top bar and every demo button come first). Adding the second file: 9 presses plus choosing the file. Joining: 1. Finding which site did not fit: about 20 presses including detours.

**What confused me / costs:**
1. The start page puts the top links and five demo buttons ahead of "Open a file" -- 13 Tabs to the main action, with no shortcut printed on it.
2. "Add a file to this network" lives behind an unlabeled "+" next to "Sources" in the Data panel; nothing on the Graph view pointed me there. I found it because I guessed "Data".
3. The "Issues in deliveries.csv" popup says "1 unknown end" but never says which end (P13) or which route. The "edges" chip in it is not a Tab stop, so I could not open the rows from there. I had to go find P13 at the bottom of the node table.
4. When that popup opened, no focus ring was visible inside it; the first Tab went to the close X.
5. "1 repeated key" was only shown in the join preview; after joining I found no place that tells me which route was repeated. 19 rows vs 18 edges I had to work out myself.
6. F6 cycles canvas, toolbar, divider, left panel, right panel -- but not the table. Getting into the grid takes F6 to the divider then Tab x4 past the table's header buttons.

## Follow-up

**Facilitator:** "How many of the routes came from the second spreadsheet, and where did you read that?"

**Sam:** 18. All 18 routes in the network came from deliveries.csv -- pantries.csv brought in 12 sites and 0 routes, so none came from the first file. I read the 18 in three places. First, the join preview before I pressed Join: the chip "18 edges added" (with "1 new node" and "1 repeated key" beside it). Second, after the join, the deliveries row under Sources in the Data panel: "13 nodes, 18 edges", and the Overview said Edges 18, "From 2 files". Third, when I pressed Enter on that source row, the right panel said "deliveries.csv Source -- Loaded: Nodes 1, Edges 18". That last one is the clearest: it says the file loaded 18 routes and one node of its own (P13). The Sources row's "13 nodes" confused me for a second, since the file only added one -- I think it counts every site its routes touch. And the file itself has 19 rows; the 19th was the repeated route, which I only saw counted in the preview, not afterwards.
