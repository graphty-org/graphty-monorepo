# Session r3-s31 -- Nadia (level-1 alert reviewer), task: untangle the drawing (Les Miserables)

Session folder: design/ui/studio/rounds/round-3/sessions/r3-s31

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s31 empty`
Saw (01.png): a start page. Left: "Open project or file...", "New from data...". Right: a "Samples" list with Les Miserables (77 characters) at the top. At the bottom a box asking to share usage data.
Nadia: "OK, the practice data is right there. I'll say no to the data thing -- the bank wouldn't let me anyway -- and open Les Miserables."

## Step 2

Command: `--step --click "No thanks" --click "Les Miserables"`
Saw (02.png): the network drawn in the middle -- blue dots, gray lines, a dense knot in the middle, a fan of dots at the bottom and two small groups top-left and right. Left panel: a search box, "Selection", "Everything". Right panel: numbers (77 nodes, 254 edges, density). Bottom toolbar: a flask icon, an icon that looks like a little chart with dots, "3D", a magnifier. No labels on the icons.
Nadia: "Nothing says 'arrange' or 'layout'. The flask is probably the analyze thing the left panel mentions. The second icon looks like a scatter chart -- maybe that's how dots get placed. I'll hover it before I click anything."

## Step 3

Command: `--step --hover-at 728,864`
Result: tooltip "Layout".
Nadia: "Layout. That's it. Click it."

## Step 4

Command: `--step --click "Layout"`
Saw (04.png): a menu opened over the drawing. "Force -- Recommended" is ticked. Others: Circle, Rings around a node (grayed, "Select a node first"), Grid, Rings by group (grayed, "Needs a node attribute to group by"), Spiral, Spectral, No crossings (grayed, "the layout "planar" cannot draw this graph without crossings: G is not planar."), Random, Tree (grayed, "Select a node first"), Two columns and Columns by group (grayed, "Needs a node attribute to group by"), Keep positions.
Hesitation: the ones with "group" in the name sound like what I want (clusters), but they're grayed and say I need a "node attribute to group by" -- I don't know what that means here or where I'd get one. "G is not planar" means nothing to me. "Spectral" sounds like a physics word.
Nadia: "The current one is the recommended one. Let me just try Circle -- it's the one I can picture."

## Step 5

Command: `--step --click "Circle"`
Saw (05.png): the menu turned into a "Circle" panel: "Places every node on one circle, in the order the nodes were loaded." Shape 3D / 2D (3D selected), Scale 1, Advanced, "Under a second", and a blue Apply button. The drawing did not change yet.
Nadia: "'In the order they were loaded' -- that doesn't sound like it'll group anything, but it's under a second. I'll just Apply and look."

## Step 6

Command: `--step --click "Apply"`
Saw (06.png): the dots are now spread over a round blob -- it looks like a ball seen from the front, not a ring, because "3D" was picked. Lines go everywhere through the middle. The panel closed. No message that anything happened, but the change is obvious.
Nadia: "That's worse. Now it's one big hairball. Any groups the first picture had are gone. I'll go back to the Layout menu and try one of the others -- Spectral, since the rest are 'Random' and 'Grid', which won't group anything either."

## Step 7

Command: `--step --click "Layout"`
Saw (07.png): same menu, now Circle is ticked. Still grayed: the "group" ones.
Nadia: "Spectral. Let's see what that is."

## Step 8

Command: `--step --click "Spectral"`
Saw (08.png): "Spectral" panel: "Places nodes from the graph's own structure, so densely connected groups land near each other without any grouping being named." "Draws flat", Scale 1, Advanced, Apply.
Nadia: "OK -- that's literally what I was asked for: groups land near each other. Wish the menu had said that before I clicked. Apply."

## Step 9

Command: `--step --click "Apply"`
Saw (09.png): almost every dot is squashed into one small lump at the bottom-left, half hidden behind the toolbar. Two lines stick out: one long arm straight up with two dots, one arm to the right with three dots. The view did not zoom to fit the lump. Nothing tells me which characters are in the arms.
Nadia: "That's the opposite of what it promised. Everything is in one blob and I can't see any groups at all. Two tries, both worse than what I started with. I'll go back to the one it called Recommended and compare."

## Step 10

Command: `--step --click "Layout" --click "Force"`
Saw (10.png): "Force" panel: "Pulls connected nodes together and pushes unconnected ones apart until the shape stops moving, in three dimensions or, with 'dim: 2', flat." Shape 3D / 2D, Spring length 30, Gravity -1.2, Advanced, Apply.
Hesitation: "'dim: 2' -- is that something I'm supposed to type? I guess it means the 2D button. Spring length, gravity minus 1.2 -- not touching those." The original drawing was 3D; for a screenshot in an alert file I'd rather have it flat, so 2D is still a "different arrangement" and maybe easier to read.
Nadia: "Pick 2D and Apply."

## Step 11

Command: `--step --click "2D" --click "Apply"`
Saw (11.png): a flat drawing that fills the canvas. Now I can pick out groups: a tight knot top-right, a smaller knot on the left, a knot at the bottom, a fan of single dots hanging off one dot on the far left, a short chain on the right, and a busy middle where most lines meet. Lines cross less than in the first picture. The toolbar button at the bottom still says "3D" even though I chose 2D and the drawing is flat -- not sure what that button means now.
Nadia: "That's better. Flat, I can see four or five groups and the one guy everybody in the left fan hangs off. That's a screenshot I could put in a file. I'm done."

## Step 12

Command: `--end rounds/round-3/sessions/r3-s31`

## Debrief (in character)

**Did I finish?** Yes. The flat (2D) version of the "Force" arrangement made the clusters easier to tell apart than the drawing the app opened with: four or five separate knots, plus the fan on the left, where the starting picture had one big tangle in the middle with the groups piled on each other in depth.

**Did it help?** The last one did. The first two I tried made it worse: "Circle" turned it into a round hairball (in 3D it isn't even a circle), and "Spectral" crushed nearly every dot into one lump in the bottom corner, half under the toolbar, with two long arms sticking out -- even though its description promised exactly what I wanted ("densely connected groups land near each other").

**Ease: 4 out of 7.** Finding the Layout button took one hover, and the menu was easy to use. But I needed three tries and the one that worked was the one I already had, with a different setting.

**What confused me:**

- The bottom toolbar icons have no words; I had to hover to learn one was "Layout".
- The menu doesn't say what each arrangement is good for until you click it. Spectral's description ("groups land near each other") was the best match for my task, and I'd only have known that by clicking in.
- The options with "group" in the name -- the ones that sound right for clusters -- are grayed out with "Needs a node attribute to group by". I don't know what an attribute is here or how to get one, so I skipped them.
- "No crossings" is grayed with "the layout "planar" cannot draw this graph without crossings: G is not planar." -- that's programmer talk.
- The Force description says "with 'dim: 2', flat" -- looks like code. I guessed it meant the 2D button.
- After Spectral, the view didn't zoom to the dots; most of the drawing sat under the toolbar.
- The "3D" button in the toolbar still said 3D after I applied the flat version, so I'm not sure if I changed the drawing or just the view.
- Nothing told me what changed after Apply -- no message -- though I could see it.

**In minutes per alert:** about three or four minutes of trial and error for something that should be one click. If I'd had to do this on a live alert, I'd have kept the first picture and moved on.
