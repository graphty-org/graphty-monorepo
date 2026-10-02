# Session: change the layout, then freeze it -- genomics Cytoscape user (Maren)

Task as given by the moderator: "The drawing of the characters is hard to read. Try a different way of arranging it, and once it looks better, stop it moving so you can study it. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t08/01.png. All commands run from design/ui/prototype; renders in tmp/round-7-sessions/t08--genomics-cytoscape-user/ (D below). Every command was wrapped in `timeout 120 node app-b/study.mjs --try $D/NN.png task:t08 ...`.

## Think-aloud

**Start (shots/tasks/t08/01.png).** Fine, a hairball. Orange-to-brown by PageRank, size by degree, legend top left -- good, there is a legend. In Cytoscape I would go straight to the Layout menu and pick something else, like Prefuse or the group-attributes one. There is no Layout menu at the top here. Just a project name, undo, redo, "Local only" (good, I like that), "Full graph". There's a little floating bar at the bottom with five icons and no words. I don't click unlabelled icons as a rule, but I'll try saying what I want.

**01** -- `--click "Layout"`. Something reacted: the second icon at the bottom turned into a pause sign. The picture is identical. So I think I just started something called a layout, not chose one. Not what I meant.

**02** -- `--hover "Layout"`. Tooltip: "Resume layout". So that button is play/pause for the layout. Fine, that is probably my "stop it moving" later. But where do I pick a different one?

**03** -- `--click "Menu"` (the three lines top left). New project, Open, Open recent, Select where, Settings, Keyboard shortcuts, Help. No Layout. In Cytoscape that is a whole top-level menu. Odd: the right panel switched to the network summary when I opened this menu.

**04** -- `--click "Co-appearances" --click "Style"`. Clicking the network name opened a little list (Co-appearances, Compare graphs). "nothing on screen is called Style" -- the list was covering things.

**05** -- `--click "Co-appearances" --key Escape --click "Style"`. Escape threw me back to PageRank's style. Fill, Shape, Effects, Label, Tooltip. That's the style of the PageRank coloring, not the network. Not here.

**(probing)** -- `--hover` on "Arrange", "3D", "Layout settings", "Change layout", "Experiment", "Physics", "Simulation", "Labs", "Run", "Camera", "Force", "Dimensions", "2D", "Perspective", "Canvas": nothing called any of those. I am basically pointing at icons and waiting for tooltips.

**06** -- `--hover "Lab"`. Landed on "Add to Label" on the right. Not useful.

**07** -- `--hover "Quick"`. Lightning bolt is "Quick actions Ctrl+K".

**08** -- `--click "Quick actions"`. A command box: "Type a command or a place". Top recent entry: "Re-run layout -- Canvas menu > Re-run layout". So there is a canvas menu somewhere with layout in it. I tried to type "layout" (**16**, `--click "Quick actions" --type "layout"`) and nothing filtered.

**09** -- `--click "Canvas menu"`. Nothing called that.

**10** -- `--hover "Analyze"`. The flask is "Analyze Shift+A".

**11 / 12** -- `--hover "Tools"`, then `--click "Tools"`. The cube is "View". The menu: Fit, Front, Side, Top, Isometric, saved views, "Switch to 2D", Enter VR, Enter AR. Hang on -- "Switch to 2D" means this is 3D right now? It looks flat. That makes me a bit suspicious. Anyway these are camera angles, not arrangements.

**13** -- `--hover "Legend"`. Blue icon is the legend toggle.

**14** -- `--click "Analyze"`. A list of algorithms: Louvain, PageRank, Shortest path, Links (count), Betweenness, Closeness, Eigenvector. That's Cytoscape's Tools/Apps stuff, not layout.

**15** -- `--click "More"`. The three dots on the PageRank row: Rename, Select top N, Show in table, Lock, Delete. No.

**17** -- `--click "Menu" --key Escape --click "Style"`. Still PageRank. Going around in circles.

**18** -- `--click "Everything"`. The base style row: color 6366F1, faceted sphere, size 1. Still no layout.

**19** -- `--click "Quick actions" --click "Re-run layout"`. That popped up the canvas menu (the one you'd get from right-clicking the background, I guess). Select all visible, Invert selection, Fit, Re-run layout, Reshuffle layout seed, Unpin all, Compute the overview, Add node, Add note, Clear graph data. Still no "choose a layout". "Clear graph data" sitting right there makes me nervous.

**20** -- same, then `--click "Style"`: nothing called Style while that menu is open.

**21** -- `... --click "Reshuffle layout seed"`. A toast said "Reshuffle layout seed". The picture looks the same. A new random seed for the same algorithm is not a different arrangement anyway.

**22** -- `--click "Views"`. Saved views (Whole cast, Valjean's circle, From above) with "In tour" checkboxes. But the right panel now shows the network itself, Co-appearances, with Style and Data tabs.

**23** -- `--click "Views" --click "Style"`. There it is. Network style: Canvas (background, print-safe colors, hide overlapping labels...) and then **Layout: Method "Spread Out", Seed 7**. That took me far too long. In Cytoscape it's a menu at the top; here it's in the style of the network, which I only reached by accident through Views.

**24** -- `... --click "Spread Out"`. A big Layout window: a list of methods with Size and Weights columns (Spread Out "Recommended", Spread Out Flat, Ring, Rings from a Node, Grid, Concentric Rings, Spiral, Natural Grouping, No Crossings, Scattered, Tree, Two Columns, Columns by Group, Keep Positions), and on the right Engine "NGraph Force" with spring length, gravity, theta, drag coefficient, time step, pacing... I'm skipping all of those numbers. "Natural Grouping" sounds like it puts the clusters together, which is what I'd want for a hairball.

**25** -- `... --click "Natural Grouping"`. Toast: "Laid out again: Natural Grouping" with Undo. Engine "Spectral, the only engine for Natural Grouping. Ignores edge weights." Good that it tells me it ignores weights. Behind the window, the bit of network I can see looks the same.

**26** -- `... --key Escape`. Window closed and... everything is back to PageRank and the drawing is exactly the starting picture. Did Escape undo it?

**27** -- `... --click "Close"` instead. Same: the drawing is identical to the start, pixel for pixel as far as I can tell. Fantine top left, Myriel top right, Marius cluster at the bottom.

**28** -- `... --click "Close" --click "Views" --click "Style"`. The Method now says "Natural Grouping". So the setting stuck. But the picture did not change at all. Either the new arrangement looks exactly like the old one, which I don't believe, or nothing was redrawn.

**29** -- `... --click "Close" --hover "layout"`. The play button still says "Resume layout". So it is... already stopped? I never saw it move in the first place. If it's paused, then "stop it moving" is already done, I guess. I'm not clicking play just to click pause again.

I'm stopping here.

## Outcome

Did I succeed? Partly, I think. I found where the layout is chosen and switched it to Natural Grouping, and the setting says so. But the drawing never changed in front of me, so I can't say it "looks better" -- I can't tell it did anything. And for freezing it, the button said "Resume layout" the whole time, so it was apparently already stopped; I didn't have to do anything and I'm not sure that's right.

Single Ease Question: **3 / 7.** Finding the layout took about twenty attempts. It isn't in the main menu, not under the bottom bar's icons, not in Analyze; it's inside the network's own Style tab, and I only got the network into that panel by accident by opening Views. The canvas menu had "Re-run layout" and "Reshuffle layout seed" but no way to pick a different one, which is the one thing I actually wanted.

Would I use this instead of Cytoscape? Not for this. In Cytoscape, Layout is a top-level menu and I pick one and watch it rearrange. Here I changed a setting and the picture stayed the same, so I can't trust that it did what it said. The list of layouts itself is fine -- plain names, and it told me which ones ignore weights, which is more than Cytoscape does. But the network showing up as "3D" with a "Switch to 2D" option makes me wary for figures, and a whole panel of spring and drag coefficients is not something I'd touch. Nice for poking around, maybe; my figure stays in Cytoscape.
