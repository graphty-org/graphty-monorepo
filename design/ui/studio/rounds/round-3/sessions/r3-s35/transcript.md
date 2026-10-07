# Session r3-s35 -- Mara (the Gephi holdout), task T11: untangle the drawing (Les Miserables)

Start: `node tool/real.mjs --start rounds/round-3/sessions/r3-s35 empty` -> 01.png

## Step 1 (01.png)
Sees: a start screen with Start (Open project or file, New from data), Recent projects (empty), Samples
(Les Miserables, 77 characters; karate club; College football; Florentine families), and a usage-data
consent box at the bottom. "No account, local only. Good. The consent box I dismiss -- No thanks."
Next: click "No thanks", then open the Les Miserables sample.

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

## Step 2 (02.png)
Sees: the graph loaded. Right panel says 77 nodes, 254 edges, undirected, density 0.08681, 1 component.
"77 and 254 -- that matches the Les Mis graph I know. Fine." The drawing is a force-ish layout with
a dense center; it says "3D" in the bottom toolbar, which I do not want. No layout name anywhere. The
bottom toolbar has a flask (Analyze, per the hint at left), a scatter-chart-looking icon, a "3D" menu
and a magnifier. "Where is my Layout panel? That second icon might be it."
Next: hover the second toolbar icon to see what it is.

Command: `--step --hover-at 728,864` -> 03.png. Printed: button "Layout", tooltip "Layout".

## Step 3 (03.png)
"Layout. That is my Spatialize panel." Next: click it.

Command: `--step --click "Layout"` -> 04.png

## Step 4 (04.png)
Sees: a menu of layouts. Force (checked, "Recommended"), Circle, Rings around a node (needs a selected
node), Grid, Rings by group (needs a node attribute), Spiral, Spectral, No crossings (greyed, with the
raw message 'the layout "planar" cannot draw this graph without crossings: G is not planar.'), Random,
Tree, Two columns, Columns by group, Keep positions.
Hesitation: "No ForceAtlas2 by name. 'Force' -- which force? Fruchterman-Reingold? ForceAtlas2? Can I
set gravity, scaling, LinLog? And that greyed planar line reads like a Python traceback leaking through."
Next: hover "Force" to see if it says what algorithm it is.

Command: `--step --hover-at 594,446` -> 05.png. Printed: option "Force Recommended", tooltip null.

## Step 5 (05.png)
"No tooltip. It will not tell me what 'Force' is. Fine -- the current drawing is presumably this Force
already, and its middle is a hairball. Spectral embedding is a real method that pulls communities
apart along the eigenvectors; I know what it does, so I'll try it as the alternative."
Next: click "Spectral".

Command: `--step --click "Spectral"` -> 06.png

## Step 6 (06.png)
Sees: a settings card for Spectral: one-line description ("densely connected groups land near each
other"), "Draws flat", a Scale field (1), "Advanced", "Under a second", and an Apply button.
"OK, so each layout has a parameter page. That's better than I expected. It even says it draws flat."
Next: click Apply.

Command: `--step --click "Apply"` -> 07.png

## Step 7 (07.png)
Sees: almost every node crushed into one blob at the bottom, with two thin arms (a chain of three or
four nodes going up and one going left). Also the view did not reframe: the blob sits under the toolbar.
"Ha. Of course -- spectral is dominated by the pendant chains; the Fiedler vector just isolates the
leaves. That's what the math does, but it is useless as a map. Much worse than before."
Next: test undo with Ctrl+Z -- does it cover a layout?

Command: `--step --key Control+z` -> 08.png

## Step 8 (08.png)
Sees: the old force drawing came back (redo is now enabled at top) -- but the camera stayed where the
spectral blob was, so the graph sits half off screen at the bottom right.
"Undo covers a layout. That alone is more than Gephi does. But it left my view pointed at nothing; I'd
have to find the 'center on graph' button myself."
Next: open Layout again and choose Force, to see whether it has parameters like ForceAtlas2's.

Command: `--step --click "Layout" --click "Force"` -> 09.png

## Step 9 (09.png)
Sees: Force card. "Pulls connected nodes together and pushes unconnected ones apart until the shape
stops moving, in three dimensions or, with 'dim: 2', flat." Shape 3D / 2D toggle (3D selected),
Spring length 30, Gravity -1.2, Advanced, and a greyed "Applied" button.
Hesitation: "'with dim: 2' -- that's a config key, not a sentence. And gravity is negative? In
ForceAtlas2 gravity pulls toward the center and is positive; a negative gravity means this is some
other model, probably a d3-style charge. Still no algorithm name. It is not ForceAtlas2, I'd bet."
Next: switch Shape to 2D (I never want 3D for reading clusters) and open Advanced to look for LinLog
or a repulsion/scaling setting.

Command: `--step --click "2D" --click "Advanced"` -> 10.png

## Step 10 (10.png)
Sees: 2D selected; Advanced opened: Spring Coefficient 0.0008, Theta 0.8, Drag Coefficient 0.02, Time
Step 20, Seed 1 with a clear button and "Reshuffle". Apply is now enabled.
"Spring coefficient, Barnes-Hut theta, drag, time step -- this is a spring-electrical model, the
ngraph kind, not ForceAtlas2. No LinLog, no 'prevent overlap', no 'dissuade hubs'. But at least the
parameters and the seed are visible -- I can write those in a methods section, which is more than an
unnamed 'auto layout' would give me." The labels are inconsistent in case ("Spring length" vs
"Spring Coefficient").
Next: Apply as is in 2D, to see the flat version of the default.

Command: `--step --click "Apply"` -> 11.png

## Step 11 (11.png)
Sees: a flat drawing that fills the canvas. Clear groups now: a tight clique top right, another on the
left, one at the bottom, a star of leaves off a hub on the left (the bishop and his household, I'd
guess), a hairy core in the middle where the big hubs sit. The settings card closed itself.
"That is noticeably more readable than the 3D one -- the three cliques read as clusters. The center
is still a knot of hubs, which is what happens without LinLog." Odd: the toolbar chip still says "3D"
even though the drawing is flat.
Next: push the clusters further apart -- more repulsion. Open Force again, set Gravity to -4 and Apply.

Command: `--step --click "Layout" --click "Force"` -> 12.png

## Step 12 (12.png)
Sees: the Force card again, remembering 2D, spring length 30, gravity -1.2, "Applied".
Next: replace Gravity with -4 (more push apart) and Apply.

Command: `--step --click "Gravity" --key Control+a --type "-4" --click "Apply"` -> 13.png.
Printed: nothing on screen is called "Apply".

## Step 13 (13.png)
Sees: Gravity now reads -4, but the button still says "Applied" and is greyed.
Hesitation: "I changed a number and the button still claims it's applied. Is it waiting for me to
leave the field? Did it reject the minus sign?" This is the first real friction.
Next: press Enter in the field (what I'd do in Gephi's property sheet).

Command: `--step --key Enter` -> 14.png

## Step 14 (14.png)
Sees: Enter committed the value -- Apply is now blue and a little reset "x" appeared next to Gravity.
"So the field commits on Enter, not on typing. Learned. Not obvious, but OK."
Next: click Apply.

Command: `--step --click "Apply"` -> 15.png

## Step 15 (15.png)
Sees: a re-run with more repulsion. Slightly airier -- the left clique and the top-right clique sit a
bit further from the core, the bishop's star is cleaner -- but structurally the same picture as step 11.
"Diminishing returns. The repulsion knob does what it says, a little. What actually separates the
clusters here is going flat; the 3D default was the problem. Without LinLog the hubs in the middle
still knot together, and without labels or modularity colors I am judging clusters by eye."
Decision: I've done what was asked -- tried other arrangements and can say whether they helped. Stop.

Command: `--end`

## Verdict (in character)
- **Finished?** Yes. Spectral made it far worse (everything collapsed into one blob with the pendant
  chains stretched out). The flat 2D version of "Force" helped clearly: three cliques and the bishop's
  star read as separate groups instead of a 3D hairball. Raising the repulsion (gravity -1.2 to -4)
  helped only a little.
- **Ease: 5 of 7.** Finding Layout and switching it took seconds, the parameters and the seed are on
  the card, and undo covered the layout change -- which Gephi still cannot do.
- **What confused or annoyed me:**
  - "Force" never says which algorithm it is. The parameters (spring coefficient, Barnes-Hut theta,
    drag, time step, negative gravity) tell me it is a spring-electrical model, not ForceAtlas2, and
    there is no LinLog, prevent overlap or dissuade hubs. I could not cite it in a methods section
    without a name.
  - The Force description contains the config key "with 'dim: 2'", and the greyed "No crossings"
    option shows a raw error ("the layout 'planar' ... G is not planar."). Implementation text leaking.
  - Typing a new Gravity value left the button reading "Applied" until I pressed Enter.
  - After undoing the Spectral layout the view stayed pointed where the blob had been; the graph was
    half off screen.
  - The toolbar chip still says "3D" after I chose a 2D layout.
  - Spectral is offered with no warning that it degenerates on graphs with pendant chains; a student
    would think the tool broke.
- **Overall:** "It's a respectable spring layout with honest knobs and real undo. It is not
  ForceAtlas2, and until it names what it runs, my figures stay in Gephi."
