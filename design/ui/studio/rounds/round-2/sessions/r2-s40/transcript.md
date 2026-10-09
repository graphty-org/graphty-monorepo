# Session r2-s40 -- Elena (first-time graph user), task T11 "Untangle the drawing"

Dataset: Les Miserables sample. Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s40 empty` -> 01.png

Seen: a dark start page. "Start" (Open project or file, New from data), "Recent projects" (empty),
"Samples" with Les Miserables at the top (77 characters, "Good for a first look at communities").
A usage-data banner at the bottom asks me to share or decline.

Elena: "Oh nice, the Les Mis one is right there. First I'll get rid of the data banner -- No thanks."

## Step 2 -- decline banner, open the sample

Command: `--step ... --click "No thanks" --click "Les Miserables"` -> 02.png

Seen: the graph opened. Blue dots and grey lines, all one color. A dense knot in the middle, a
fan of dots at the bottom-left hanging off one dot, a smaller group at the top and one on the right.
Right panel says 77 nodes, 254 edges, Components 1. Bottom toolbar has four icons: a flask, a
little chart-ish icon, "3D" with a dropdown, and a magnifier. Left panel: Find, Selection, Everything.

Elena: "OK, it loaded. The middle is a hairball. I want to rearrange the dots -- I don't see the
word 'layout' or 'arrange' anywhere. The second icon in the toolbar looks like it could be about
arranging. Let me hover it before clicking."

## Step 3 -- hover the second toolbar icon

Command: `--step ... --hover-at 728,864` -> 03.png

Seen: tooltip "Layout".

Elena: "Layout -- that's the arranging thing, I think. Clicking it."

## Step 4 -- open the Layout menu

Command: `--step ... --click "Layout"` -> 04.png

Seen: a menu. "Force -- Recommended" is ticked (that's what I have now). Then Circle, Rings around
a node (grey, "Select a node first"), Grid, Rings by group (grey, "Needs a node attribute to group
by"), Spiral, Spectral, No crossings (grey, with the note 'the layout "planar" cannot draw this graph
without crossings: G is not planar.'), Random, Tree (grey), Two columns (grey), Columns by group
(grey), Keep positions.

Hesitation: "Rings by group" sounds exactly like what I want -- clusters, separated -- but it's
greyed out and says it needs a "node attribute to group by". I don't know what that is or where I'd
get one. The "No crossings" note reads like an error message from a programmer ("G is not planar"?).
"Spectral" means nothing to me. Circle and Grid are words I know.

Elena: "Rings by group is what I want but it's locked. I'll try Circle first -- that I understand."

## Step 5 -- pick Circle

Command: `--step ... --click "Circle"` -> 05.png

Seen: it didn't rearrange yet; the menu turned into a small "Circle" form: "Places every node on one
circle, in the order the nodes were loaded." Shape 3D/2D, Scale 1, Advanced, "Under a second", Apply.

Elena: "Hmm, 'in the order the nodes were loaded' -- so it won't put friends together, it'll just
string everyone around a ring. That won't separate clusters. Good that it told me before I applied.
Let me go back (the little arrow) and read what Spectral is."

## Step 6 -- back, then Spectral

Command: `--step ... --click-at 555,632 --click "Spectral"` -> 06.png (the arrow was "Back to layouts")

Seen: "Spectral -- Places nodes from the graph's own structure, so densely connected groups land near
each other without any grouping being named." "Draws flat", Scale 1, Advanced, Under a second, Apply.

Elena: "Oh -- that's literally what I asked for: densely connected groups land near each other. The
name 'Spectral' would never have told me that, but the description does. Apply."

## Step 7 -- apply Spectral

Command: `--step ... --click "Apply"` -> 07.png

Seen: much worse. Almost every dot is crushed into one tiny blob in the top right corner of the
canvas, with a short chain of three dots trailing off to the left and two lone dots pulled far down
to the bottom. The camera didn't refit to anything sensible either -- most of the canvas is empty.
No message about what happened.

Elena: "Well, that's the opposite of untangled. The description promised groups near each other, and
instead everyone is squashed into one dot-pile and a couple of stragglers are stretched across the
screen. Did I do something wrong? I'll undo (the arrow at the top) and get back to the first picture."

## Step 8 -- undo

Command: `--step ... --click-at 165,20` -> 08.png (button "Undo", tooltip "Undo Ctrl+Z")

Seen: the original shape is back (the fan at the bottom, the knot in the middle), but the view is
shoved up -- the top of the drawing is cut off at the top edge and the bottom half of the canvas is
empty. The camera kept the Spectral framing instead of fitting the restored drawing.

Elena: "Phew, undo works, though now half of it is off the top of the screen. Anyway -- the sample
card said 'good for a first look at communities', and the locked 'Rings by group' wants something to
group by. The flask button is 'Analyze' according to the hint at bottom left. Maybe that's how I get
groups. Clicking the flask."

## Step 9 -- open Analyze

Command: `--step ... --click-at 680,864` -> 09.png

Seen: a list with a "Filter analyses" box. Heading "Rank nodes and edges": Degree, Betweenness, Edge
betweenness, Closeness, PageRank ("Start here"), Eigenvector, Katz, HITS, All-pairs distance... more
below. Each has a one-line explanation. Nothing about groups visible yet.

Elena: "These are all about ranking who's important. I want groups. There's a filter box -- I'll
type 'group'."

## Step 10 -- filter for "group"

Command: `--step ... --type "group"` -> 10.png (the tool also reported "the drawing is still moving",
though to me the dots looked where they were)

Seen: "Find groups": Louvain ("Start here", "Which nodes form densely linked groups."), Leiden, Label
propagation, Girvan-Newman, Markov clustering, Spectral clustering, Hierarchical clustering.

Elena: "There we go. I have no idea who Louvain is, but it says Start here and 'densely linked
groups'. Clicking it."

## Step 11 -- Louvain

Command: `--step ... --click "Louvain"` -> 11.png

Seen: a small form: "Which nodes form densely linked groups." Resolution 1, Advanced, Under a second, Run.

Elena: "I don't know what Resolution means; leaving it at 1. Run."

## Step 12 -- run Louvain

Command: `--step ... --click "Run"` -> 12.png

Seen: the dots are now colored. A legend in the top-left of the canvas, "Color: Communities", Group 1
to Group 6, and the left panel lists Communities 6 with counts (20, 17, 11, 11, 10, 8). The fan at the
bottom is pink (Group 6). The layout itself has not changed and the drawing is still pushed off the
top. Group 1 (amber) and Group 5 (orange) look nearly the same to me; so do Group 2 (light blue) and
Group 4 (darker blue).

Elena: "Now I have groups, at least as colors. But they're still all mixed up in the knot. Rings by
group needed something to group by -- maybe now it'll work. Back to Layout."

## Step 13 -- Layout menu again, after finding groups

Command: `--step ... --click "Layout"` -> 13.png

Seen: exactly the same menu. "Rings by group", "Two columns" and "Columns by group" are still grey and
still say "Needs a node attribute to group by".

Elena: "What? I literally just made six groups and they're sitting in the left panel. Why doesn't
the layout know about them? Maybe the grey text is just stale. Let me click Rings by group anyway."

## Step 14 -- click the grey "Rings by group"

Command: `--step ... --click "Rings by group"` -> 14.png

Seen: nothing happens; the row just highlights. Still "Needs a node attribute to group by".

Elena: "Dead end. The groups I made don't count as 'a node attribute', apparently, and nothing tells
me what would. OK -- last idea: the Force one is 'Recommended', and it's what I already have. Maybe
it has settings to spread things out more. Clicking Force to look."

## Step 15 -- Force settings

Command: `--step ... --click "Force"` -> 15.png

Seen: "Pulls connected nodes together and pushes unconnected ones apart until the shape stops moving,
in three dimensions or, with 'dim: 2', flat." Shape 3D/2D, Spring length 30, Gravity -1.2, Advanced,
button "Applied" (greyed).

Hesitation: "with 'dim: 2'" reads like code. Gravity is negative, which is odd. Spring length I can
guess at: longer springs, more space between things.

Elena: "Let me make the springs longer so the knot opens up -- 80 instead of 30 -- and apply."

## Step 16 -- type 80 into Spring length

Command: `--step ... --click "Spring length" --key Control+a --type "80"` -> 16.png

Seen: the field now reads 80, but the button at the bottom still says "Applied" and is grey, as if
nothing changed.

Elena: "Hmm, it still says Applied. Maybe it hasn't noticed my typing yet. I'll press Tab to leave
the field."

## Step 17 -- Tab out

Command: `--step ... --key Tab` -> 17.png

Seen: now the button is blue "Apply", and a small x appeared next to the 80 (to reset, I guess).

Elena: "OK, it needed me to leave the field before it believed me. Apply."

## Step 18 -- apply Force with spring length 80

Command: `--step ... --click "Apply"` -> 18.png

Seen: this is the worst yet. The whole thing is a big square-ish cloud of tiny dots with lines
criss-crossing everywhere. The colors are completely mixed -- amber, blue, green and pink dots
sit side by side all over. The pink fan that used to hang off the bottom is gone; pink dots are
scattered. The dots got much smaller (further away, I suppose). No message.

Elena: "Oh no. It's more tangled, not less. Maybe it's still settling? I'll give it a few seconds
before I judge."

## Step 19 -- wait 4 seconds

Command: `--step ... --wait 4000` -> 19.png

Seen: identical to before. It is not settling; it stays a scrambled cloud. It honestly looks like the
dots were thrown down at random and never pulled together -- the dots linked to each other are not
near each other at all.

Elena: "That's three tries that made it worse: Spectral squashed everything, the grouping layouts
stay locked even after I made groups, and longer springs turned it into confetti. I'll undo back to
the colored original and call it there."

## Step 20 -- undo the spring change

Command: `--step ... --click "Undo"` -> 20.png

Seen: the original drawing is back, now small and centered (the camera stayed zoomed out from the
confetti). With the group colors on, the original picture is actually readable: an orange bunch at the
top, the pink fan at the bottom, amber on the right, blues on the left, green in the middle. The
middle is still a knot of blue, green and amber.

Elena: "Funny -- the thing that helped wasn't a new arrangement at all, it was the colors. I'm
stopping here."

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s40`

## End of session (in character)

**Did I finish?** Partly. I tried three different arrangements (Spectral, the locked Rings by group,
and Force with longer springs) and none of them made the clusters easier to tell apart -- two made it
clearly worse. What did help was coloring the dots by group (Analyze, Louvain), which I found by
typing "group" in the Analyze list. So my answer to "did a different arrangement help": no; the
default arrangement plus colors was the best picture I got.

**Ease: 2 out of 7.** Finding the Layout button and reading the descriptions was easy. Everything
after that worked against me.

**What confused me:**

- "Rings by group", "Columns by group" and "Two columns" sound exactly like what I wanted, but stay
  greyed out with "Needs a node attribute to group by" -- even after I had made six groups with
  Louvain and they were listed in the left panel. Nothing tells me what a "node attribute" is or how
  to make one.
- Spectral's description promised "densely connected groups land near each other". In practice it
  crushed almost everyone into one tiny blob in a corner with a couple of dots flung far away, and
  the view did not refit.
- Raising Spring length from 30 to 80 turned the drawing into a scrambled cloud where linked dots are
  nowhere near each other and the groups are fully mixed; waiting did not change it.
- After typing a new Spring length, the button kept saying "Applied" until I tabbed out of the box.
- The Force description says "with 'dim: 2'", which looks like code; Gravity is a negative number
  with no explanation. "No crossings" shows a programmer error: 'the layout "planar" cannot draw this
  graph without crossings: G is not planar.'
- After Undo, the camera did not refit: once the drawing was pushed off the top, once it was tiny.
- Group 1 (amber) vs Group 5 (orange), and Group 2 (light blue) vs Group 4 (dark blue), are hard to
  tell apart.
- Names like Spectral, Louvain and Resolution mean nothing to me; the one-line descriptions saved me.
