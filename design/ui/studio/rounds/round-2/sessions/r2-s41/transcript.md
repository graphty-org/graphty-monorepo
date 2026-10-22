# Session r2-s41 -- Jordan (marketing network analyst), task T11 "Untangle the drawing"

Dataset: Les Miserables (built-in sample). Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s41 empty` -> 01.png

Seen: a start screen. Left "Open project or file...", "New from data...". Right: "Samples" with Les Miserables (77 characters) at the top. A usage-data banner at the bottom ("Share usage data" / "No thanks"). "Local only" lock in the top right -- good, that's my first worry answered.

Next: say "No thanks" to the banner, then open Les Miserables.

## Step 2 -- dismiss banner, open the sample

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Seen: the network is drawn right away -- all blue dots, one color, with a dense knot in the middle and a couple of fan-shaped groups (bottom left, right). Right panel says 77 nodes, 254 edges, 1 component. Bottom toolbar has four buttons: a flask, a little chart/graph icon, "3D" with a dropdown, and a magnifier. No word "layout" anywhere I can see.

Hesitation: which of these little icons is the layout? The chart-looking one is my best guess. I'll hover it before clicking.

## Step 3 -- hover the chart icon

Command: `--step --hover-at 728,864` -> 03.png. Tool said: button "Layout", tooltip "Layout".

Seen: good, it is the layout button. Next: click it.

## Step 4 -- open the Layout menu

Command: `--step --click "Layout"` -> 04.png

Seen: a list of arrangements. "Force" is ticked and marked "Recommended". Others: Circle, Rings around a node (grayed, "Select a node first"), Grid, Rings by group (grayed, "Needs a node attribute to group by"), Spiral, Spectral, No crossings (grayed, with a message "the layout "planar" cannot draw this graph without crossings: G is not planar" -- that reads like a programmer's error message, not for me), Random, Tree (grayed), Two columns and Columns by group (grayed), Keep positions.

Hesitation: no ForceAtlas2 by name, and no settings for Force (in Gephi I'd crank up repulsion). "Rings by group" sounds most like what I actually want -- clusters pulled apart -- but it needs a group attribute I don't have yet. Spectral is the one I've heard separates clusters, so I'll try that first since it's one click.

## Step 5 -- pick Spectral

Command: `--step --click "Spectral"` -> 05.png

Seen: not applied yet -- a small panel: "Places nodes from the graph's own structure, so densely connected groups land near each other without any grouping being named." "Draws flat". A Scale box (1), an "Advanced" section, "Under a second" and an Apply button. Nice that it says how long it'll take. The explanation is exactly what I want.

Next: click Apply.

## Step 6 -- apply Spectral

Command: `--step --click "Apply"` -> 06.png

Seen: that's much worse. Almost every character is crushed into one tiny blob in the top left, and a few stragglers are flung way out on long lines (one at the bottom, three off to the right). I can't tell any clusters apart now. The view also didn't zoom to fit, so the blob is tiny. The description promised "densely connected groups land near each other" -- what I got is one dot-pile plus outliers.

Next: give up on Spectral. The "Rings by group" option wants a group attribute, so I'll try to make one: the flask button is "Analyze", and in Gephi I'd run modularity/community detection first. Click the flask.

## Step 7 -- open Analyze

Command: `--step --click-at 679,864` (button "Analyze") -> 07.png

Seen: a searchable list, "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS, ... It scrolls. No communities visible yet. There's a "Filter analyses" box with focus, so I'll type "community".

## Step 8 -- type "community"

Command: `--step --type "community"` -> 08.png

Seen: "No analysis matches "community"". Hmm. That's the word I'd use. Maybe it's called something else. Next: clear the box and try "cluster".

## Step 9 -- type "cluster"

Command: `--step --key Control+a --type "cluster"` -> 09.png (tool noted "the drawing is still moving" with no input)

Seen: now there's a "Find groups" section: Louvain ("Start here"), Leiden, Label propagation, Markov clustering, Spectral clustering, Hierarchical clustering. Louvain is what Gephi's modularity uses, so I know it. Odd that "community" found nothing when this section is literally community detection -- that's the word everyone in my field uses.

Next: click Louvain.

## Step 10 -- pick Louvain

Command: `--step --click "Louvain"` -> 10.png

Seen: a Louvain panel: "Which nodes form densely linked groups.", Resolution 1, Advanced, "Under a second", Run. Defaults are fine. Next: Run.

## Step 11 -- run Louvain

Command: `--step --click "Run"` -> 11.png

Seen: dots are now colored, and a legend appeared top-left of the canvas ("Color: Communities", Group 1-6). The left list now has "Communities 6" with sizes 20, 17, 11, 11, 10, 8. That's what I expected from Gephi, and a legend for free is a nice surprise. But the drawing is still the squashed Spectral one, so I can't see the groups apart yet.

Next: back to Layout; "Rings by group" should now have something to group by.

## Step 12 -- Layout menu again

Command: `--step --click "Layout"` -> 12.png

Seen: Spectral is ticked now. But "Rings by group", "Two columns" and "Columns by group" are STILL grayed out with "Needs a node attribute to group by" -- even though I just made 6 communities and they're sitting in the left list. That's confusing: isn't the community a node attribute? Did Louvain not save it on the nodes?

Next: click "Rings by group" anyway, in case it's only styled gray but still opens.

## Step 13 -- click "Rings by group"

Command: `--step --click "Rings by group"` -> 13.png

Seen: nothing happens -- the row just highlights. It's really disabled. Dead end: the app made groups for me but its own group layout doesn't see them. I don't know what "node attribute" it wants or where to get one.

Next: go back to "Force" (the recommended one, which was the start) and see if it has knobs, like Gephi's ForceAtlas2 repulsion -- now that the colors are on, maybe the groups will show in it.

## Step 14 -- pick Force

Command: `--step --click "Force"` -> 14.png

Seen: a Force panel with knobs: "Pulls connected nodes together and pushes unconnected ones apart until the shape stops moving, in three dimensions or, with 'dim: 2', flat." (the 'dim: 2' bit is code-speak, but there's a 3D/2D toggle right under it so I get it). Shape 3D/2D, Spring length 30, Gravity -1.2, Advanced, Apply.

Thinking: this goes in a slide, so flat is what I want. Gravity is negative, which is odd -- in Gephi gravity pulls things to the center. I'll leave it. Next: click 2D.

## Step 15 -- choose 2D

Command: `--step --click "2D"` -> 15.png

Seen: 2D is selected. Nothing redrawn yet (needs Apply). I'll leave spring length and gravity at defaults first to see the baseline. Next: Apply.

## Step 16 -- apply Force in 2D

Command: `--step --click "Apply"` -> 16.png

Seen: now we're talking. Flat drawing, fills the view, and with the community colors I can see distinct clumps: the light-blue group tight in the top right, the orange group top left, the pink characters fanning out on the left around one hub, the yellow group at the bottom. The middle is still a tangle where the green and dark-blue groups sit on top of each other, crossed by lines from the big yellow hub. The toolbar button still says "3D" even though I just picked 2D -- small mismatch, made me second-guess whether it took.

Next: one more try to loosen the middle -- open Force again and make the spring length longer (30 -> 60).

## Step 17 -- reopen Force settings

Command: `--step --click "Layout" --click "Force"` -> 17.png

Seen: the Force panel remembers 2D, spring 30, gravity -1.2, and the button now reads "Applied" (grayed). Good feedback that what I see is the current setting. Next: click into Spring length and change 30 to 60.

## Step 18 -- change Spring length to 60

Command: `--step --click "Spring length" --key Control+a --type "60"` -> 18.png (tool: "Spring length" matched the box and its label; took the box)

Seen: the box now says 60, but the button at the bottom still reads "Applied" and is grayed out. Did it notice my change? I'd expect it to turn back into a blue "Apply". Next: press Enter to commit the number, which usually does it.

## Step 19 -- press Enter

Command: `--step --key Enter` -> 19.png

Seen: now the button is a blue "Apply" again, and a little "x" appeared beside the box (reset to default, I guess). So the change only counts after Enter or leaving the box -- easy to miss. Next: Apply.

## Step 20 -- apply spring length 60

Command: `--step --click "Apply"` -> 20.png

Seen: what?? It's a mess -- colors are scattered all over, no clumps at all, lines everywhere, it looks like a random layout, not a stretched-out version of the last one. The dots also got smaller and some are hiding under the legend box. All I did was double the spring length. Maybe it's still settling?

Next: wait a few seconds and look again before deciding.

## Step 21 -- wait 5 seconds

Command: `--step --wait 5000` -> 21.png

Seen: identical. It's settled into a scrambled, random-looking picture. So "spring length 60" didn't spread the clusters out, it wrecked them. I don't understand why a slightly longer spring would destroy the grouping -- in Gephi, more spacing just spreads things.

Next: undo (the curved arrow at the top) to get back to the good 2D picture.

## Step 22 -- undo

Command: `--step --click-at 165,20` (button "Undo", Ctrl+Z) -> 22.png

Seen: the good 2D force picture is back with the community colors -- light blue top right, orange top left, pink fan on the left, yellow at the bottom, green and dark blue still overlapping in the middle. It's drawn smaller than before (didn't re-zoom to fill the space) and partly tucked near the legend, but it's the arrangement I want. Undo worked in one click, which is reassuring.

That's my answer. I'm stopping here.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s41`

## Wrap-up (in character)

**Did I finish?** Yes. I found a different arrangement (flat 2D Force, after coloring by communities) where most of the clusters are easy to tell apart, compared with the starting 3D drawing where everything was one blue knot.

**Did it help?** Yes, mostly. Four of the six groups are clearly separate clumps now: the light-blue group, the orange group, the pink characters around one hub and the yellow group at the bottom. Two groups (green and dark blue) still sit on top of each other in the middle. Honestly, the coloring did as much work as the rearranging -- without the colors, the 2D force picture would still look like one big net. The other arrangement I tried on its own, Spectral, made things much worse (one crushed blob plus a few stragglers on long lines).

**Ease: 4 out of 7.** The Layout button was easy to find once I hovered it, and the Force panel with a 2D switch and an "Under a second" estimate was clear. What cost me:

- "Rings by group" -- the option that sounded exactly right -- stayed grayed out with "Needs a node attribute to group by" even after I had run Louvain and had 6 communities listed in the left panel. I never found out what it wanted.
- Searching the analysis list for "community" found nothing; I had to guess "cluster". Community detection is the standard name in my field.
- Spectral's description promised that connected groups land near each other; the result was a crushed blob with outliers, and the view didn't zoom to fit.
- Changing Spring length from 30 to 60 didn't light up Apply until I pressed Enter, and then the result was a scrambled, random-looking picture instead of a looser version of the same one. I have no idea why; I'd be scared to touch that setting on real data.
- The toolbar kept saying "3D" after I chose 2D.
- The "No crossings" row shows a programmer's error ("the layout "planar" cannot draw this graph... G is not planar") and the Force description says "with 'dim: 2'".

**What confused me most:** that the app's own groups weren't usable by its own "group" layouts, and that a small spacing change destroyed the clusters.
