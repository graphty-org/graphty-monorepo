# Session r1-s43 -- Nadia (L1 alert reviewer), first time

Task: open the Les Miserables sample, find circles of characters who appear together (each its own color), make Javert's circle bright red, leave others, count characters in Javert's circle.

## Step 1 -- start
Command: real.mjs --start <folder> empty
Screenshot 01.png: landing page. Big green "Open a file", "Open network data", "Samples", "New project". A demo graph on the right with a "Communities" button.
Nadia: "OK, a home page. No search box for an account number. The task says ready-made network -- 'Samples' is the obvious button."

## Step 2 -- click Samples
Command: --step --click "Samples#2" -> refused as ambiguous (button vs link). Then --click "role=button:Samples" (03.png)
Screenshot 03.png: "Sample library". First card: "Who holds the novel together -- Les Miserables, 77 nodes, 254 edges".
Nadia: "There it is, top left. I'll click the Les Miserables card."

## Step 3 -- open the Les Miserables card
Command: --click-at 180,480 (button "Open the Les Miserables sample") -> 04.png
Screenshot 04.png: graph open, all nodes one purple. Left: style layers (Hovered, Selected, Everything). Right: Overview numbers. Bottom toolbar of icons with no words; first one looks like a lab flask.
Nadia: "Loaded fast, good. No labels on the toolbar. The flask probably means 'run something'. I'll hover it to check."

## Step 4 -- hover flask
Command: --hover-at 615,864 -> tooltip "Analyze Shift+A" (05.png)
Nadia: "Analyze. That's where 'figure out the circles' should be. Clicking it."

## Step 5 -- click Analyze
Command: --click "Analyze" -> 06.png
Screenshot 06.png: a long list with a "Filter analyses" box. Rankings: Degree, Betweenness, Closeness... nothing about groups visible yet.
Nadia: "Long list. The home page said 'Communities', so I'll type that into the filter instead of scrolling."

## Step 6 -- type "communit"
Command: --type "communit" -> 07.png
Screenshot 07.png: "Find groups": Louvain (highlighted, "Which nodes form densely linked groups"), Leiden, Label propagation, Girvan-Newman, Markov, Spectral, Hierarchical.
Nadia: "Seven ways to find groups and I know none of these names. The first one is highlighted and its line says exactly what I want. Taking Louvain."

## Step 7 -- click Louvain
Command: --click "Louvain" -> 08.png
Screenshot 08.png: Louvain panel: Resolution 1, Weight None, a small gear, "Under a second", green Run.
Nadia: "Resolution, weight -- no idea, leaving the defaults. 'Under a second' is the kind of thing I like to read. Run."

## Step 8 -- Run
Command: --click "Run" -> 09.png
Screenshot 09.png: graph now in 6 colors; a legend "Color: Louvain" Group 1..6; a "Louvain" folder layer appeared in the left list.
Nadia: "That was quick, six circles, six colors. No names on the dots though. Which one is Javert? I'll do what I always do -- put the name in the first search box."

## Step 9 -- search "Javert"
Command: --click "Find nodes, edges, values" --type "Javert" -> 10.png
Screenshot 10.png: Nodes 1: Javert. Edges 17: Javert -- Valjean, etc. Graph unchanged; nothing highlighted yet.
Nadia: "Found him like an account number, good. Click the node row to see where he is and which group."

## Step 10 -- click the Javert row
Command: --click-at 114,153 (option "Javert") -> 11.png
Screenshot 11.png: right panel now "Javert, Node": Degree 17, Memberships: Louvain = Group 3. Graph recentered, Javert ringed; he is a green dot. Legend: Group 3 = green.
Nadia: "Group 3, green. That's the 'defensible reason' I need -- it's written down right there. Now make green red. The legend swatch is the obvious thing to click."

## Step 11 -- click the Group 3 swatch in the legend
Command: --click-at 338,151 (img "green") -> 12.png
Screenshot 12.png: nothing changed. The legend is just a picture.
Nadia: "Dead click. OK. On the left there's a 'Louvain' folder with a little arrow -- maybe the groups are in there. Opening it."

## Step 12 -- expand the Louvain folder
Command: --click-at 65,216 (treeitem "Louvain, folder, 6 layers") -> 13.png
Screenshot 13.png: six rows Group 1 (20), Group 2 (17), Group 3 (11), Group 4 (11), Group 5 (10), Group 6 (8), each with a swatch and an eye.
Nadia: "There's the count: Group 3, 11. So Javert's circle has 11 characters. Now the color -- click the Group 3 row and see if it lets me change it."

## Step 13 -- click the Group 3 row
Command: --click-at 165,312 (treeitem "Group 3, node layer, 11 nodes") -> 14.png
Screenshot 14.png: right panel "Group 3, Node layer", Style tab: Which nodes "Louvain: Group 3, 11 nodes", Fill Color 009E73 in a text box.
Nadia: "A hex code. I'll select it and type FF0000 -- that's bright red, I know that much from spreadsheets."

## Step 14 -- set the fill to red
Command: --click-at 1320,415 (input "Node color, set here, green") --key Control+a --type "FF0000" --key Enter -> 15.png
Screenshot 15.png: Group 3's 11 dots are now bright red, including Javert (ringed). Legend and the layer row both show red for Group 3. Groups 1, 2, 4, 5, 6 kept their colors.
Nadia: "Done. Javert's circle is red, the others are untouched. Group 5 is a burnt orange that sits close to the new red in the middle of the cluster, but in the legend they're clearly different."

Stopping here: task complete. (Session not ended -- facilitator ends it.)

## Wrap-up (in character)

**Did I finish?** Yes. Javert's circle (Louvain Group 3) has **11 characters**, and it is now bright red (FF0000); the other five circles kept their colors.

**Ease: 6 / 7.** About ten clicks, a couple of minutes -- inside my "one alert" patience.

**What worked**
- Typing the name in the first search box found Javert straight away, and clicking him told me "Louvain: Group 3" in plain words. That is something I could write in an alert file.
- Typing "communit" in the Analyze filter got me to the group tools without scrolling. The one-line description under each was what let me pick.
- The layer list showed the count next to each group (11), so I did not have to count dots.
- The color is a hex box I can type into. No fiddly picker.

**What confused me / cost time**
- The bottom toolbar is icons only; I had to hover to learn the flask is "Analyze".
- Seven group-finding methods (Louvain, Leiden, Label propagation, Girvan-Newman...) with jargon names. I took the first one because it was highlighted. Would a different one give a different answer for "Javert's circle"? Nothing tells me, and QA would ask why I picked that one.
- The floating legend looks clickable but clicking a color swatch does nothing. I expected to change the color there.
- The groups were hidden inside a collapsed "Louvain" folder on the left; I found them by guessing at the little arrow.
- Resolution and Weight on the Louvain panel -- no idea what they do; left defaults.
- I was not sure whether changing the color changed the data or just the picture. It looks like just the picture (a style layer), but nothing says so.
- No names on the dots, so I can't tell from the picture alone who the 11 are -- for an alert file screenshot I'd want the labels.
