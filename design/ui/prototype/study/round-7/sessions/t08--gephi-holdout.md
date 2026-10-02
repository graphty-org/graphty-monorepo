# Session: change the layout and freeze it -- Gephi holdout

Participant: Dr. Mara Lindqvist (simulated; persona in study/personas/gephi-holdout.md), 1440x900.

Task as given by the moderator: "The drawing of the characters is hard to read. Try a different
way of arranging it, and once it looks better, stop it moving so you can study it. The data on
screen is a sample: characters of the novel Les Miserables, linked when they appear in the same
chapter."

Start screen: shots/tasks/t08/01.png. All renders are in
tmp/round-7-sessions/t08--gephi-holdout/. Every command was run from design/ui/prototype/ and
starts again from the start screen. `D` below is the absolute path of that render folder.

## Think-aloud

**Start (t08/01.png).** Les Miserables, the usual hairball around Valjean. PageRank color, degree
size, there's a legend -- fine. In Gephi I go to the Layout panel at bottom left, pick ForceAtlas 2,
press Run, and press Stop when it settles. I don't see a Layout panel. There's a floating toolbar
at the bottom with five unlabeled icons. A flask, a play button, a cube, a list, a lightning bolt.
Let me rest on them.

**01** `timeout 120 node app-b/study.mjs --try $D/01.png task:t08 --hover "Layout"`
The play button says "Resume layout". So it's paused already? Paused on what? It does not say which
algorithm. That's my Run/Stop button, but where do I pick the algorithm?

**02-04** `--hover "Lab"`, `--hover "3D"`, `--hover "Run"`
"Lab" landed on "Add to Label" in the right panel -- not what I meant. Nothing called 3D or Run.
I can't read these icons by guessing names. Cube is probably a 3D toggle and I am not touching 3D.

**05** `--click "Co-appearances"`
The graph name dropdown. It only offers the one graph and "Compare graphs...". But the right panel
switched to a graph summary: 77 nodes, 254 edges, undirected, density 0.0868. Good, the counts are
right. That panel has a Style tab. Maybe the layout lives under the graph's Style.

**06** `--click "Co-appearances" --key Escape --click "Style"`
Escape threw me back to PageRank's style. The panel follows whatever row is highlighted on the
left, and PageRank is stuck highlighted.

**07** `--click "Resume layout"`
Pressed play. The icon turned to pause. Nothing on the screen tells me what is running. In Gephi
the button says the algorithm's name. Not helpful.

**08** `--click "Menu"`
The hamburger: New project, Open, Select where..., Settings, Keyboard shortcuts, Help. No Layout.
No "Window > Layout" equivalent.

**09** `--click "Menu" --click "Style"`
Menu covers everything; can't reach Style.

**10** `--click "Co-appearances" --click "77 nodes" --click "Style"`
Picked the graph from its own dropdown hoping it would stay selected. It snapped back to PageRank
again. Three tries to select "the graph" and it won't stay.

**11-13** `--hover "Commands"`, `--hover "Arrange"`, `--hover "Algorithms"`
Nothing called any of those.

**14-15** `--hover "Analyze"`, `--hover "Actions"`
Flask is "Analyze (Shift+A)". Lightning is "Quick actions (Ctrl+K)".

**16** `--click "Analyze"`
That's my Statistics panel: Louvain, PageRank, shortest path, betweenness, closeness. No layouts.
Fine, statistics and layout are separate in Gephi too.

**17** `--click "Analyze" --click "Style"` -- the dialog blocks. 

**18** `--click "Quick actions"`
A command palette. The first recent item is "Re-run layout -- Canvas menu > Re-run layout". So
layout is on a canvas menu, which I suppose is right-click on the background. Re-run is not
"choose a different one", though.

**19** `--click "Canvas menu"` -- nothing called that.

**20** `--click "Quick actions" --click "Re-run layout"`
It opened the canvas menu: Select all visible, Fit, Re-run layout, Reshuffle layout seed, Unpin
all, Compute the overview, Add node, Add note, Clear graph data. Still no "Layout: choose...".
Reshuffle seed is the same algorithm with a different start. Not what I want.

**21** same plus `--click "Style"` -- the menu blocks again.

**22** `--click "Quick actions" --click "Re-run layout" --click "Re-run layout"`
What? "Reading miserables.gexf, 77 nodes, 254 edges..." with a progress bar, and the left panel
emptied -- PageRank, Louvain, my paths, gone, "Add data to start". I asked it to re-run the layout
and it is reloading my file. If that wipes my statistics I am done. This is exactly the kind of
thing I'd test with Ctrl+Z.

**23** same plus `--click "Style"`
With nothing else selected, the graph's Style tab finally shows: Canvas settings, and a **Layout**
section -- Method "Spread Out", Seed 7. So that's where it lives: select the graph, Style tab,
scroll to Layout. I only got here because the reload deselected everything. I would not find this
deliberately. And "Spread Out" -- what algorithm is that?

**24** `--click "Analyze" --click "Close" --click "Style"` -- tried to get there a cleaner way.
Back to PageRank. **25** `--click "Everything"` -- "Everything" is a default style row, not the
graph. No.

**26** (path from 23) `--click "Spread Out"`
A Layout dialog. Methods: Spread Out (Recommended), Spread Out Flat, Ring, Rings from a Node, Grid,
Concentric Rings, Spiral, Natural Grouping, No Crossings, Scattered, Tree, Two Columns, Columns by
Group, Keep Positions. Every one renamed into plain English. Engine: "NGraph Force". Options:
spring length, gravity -1.2, spring coefficient, theta, drag coefficient, time step, pre-steps,
steps per frame, stop threshold... At least the parameters are visible and numeric. The graph came
back on the canvas behind it, so the reload didn't kill my layers. Relief, but I don't trust it.

**27** `... --click "NGraph Force"`
Engine list: NGraph Force, D3 Force, ForceAtlas2, Spring, Kamada-Kawai, Spring Electrical. There
it is. ForceAtlas2 is an "engine" under a method called "Spread Out". Fine, I'll translate.

**28** `... --click "ForceAtlas2"`
Toast: "Laid out again: ForceAtlas2" with Undo. Good, there's an undo on a layout -- that's more
than Gephi gives me. But the options did not change: still spring length, theta, drag
coefficient. Those are not ForceAtlas2 parameters. Where is scaling, stronger gravity, LinLog,
prevent overlap, dissuade hubs? If I can't set LinLog it is not my ForceAtlas2, whatever it's
called. "Honors edge weights" is the only thing that changed.

**29** `... --click "Close"`
The canvas looks exactly as it did at the start. Same positions, pixel for pixel as far as I can
tell. Either FA2 converged to the identical picture -- impossible -- or it didn't run. And the
right panel jumped back to PageRank, so the line that said "ForceAtlas2" is gone from view.

**30** `... --hover "layout"`
Play button still says "Resume layout". So it is stopped. Did it run and stop? Did it never start?
I can't tell. In Gephi I watch it move and I press Stop. Here I picked an algorithm and got the
same hairball, already frozen.

I'm stopping. I found the algorithm, but I can't confirm it ran, the drawing didn't get any more
readable, and I couldn't set the parameters that actually make ForceAtlas2 readable.

## Verdict

- **Succeeded?** Not really. I found ForceAtlas2 and the layout appears stopped, but nothing on
  screen changed, so I can't say I arranged it differently. Half credit at best, and only because
  an accidental reload got me to the graph's settings.
- **Single Ease Question:** 2 of 7.
- **Would I use this instead of Gephi?** No. I'd stay on Gephi. The layout control is buried two
  levels under the graph's Style tab, which I could only open by accident; the algorithm is
  renamed "Spread Out" with ForceAtlas2 hidden as an "engine"; the ForceAtlas2 options shown are
  someone else's parameters; and "Re-run layout" looked like it re-read my file. The undo toast on
  a layout change is the one thing I'd want Gephi to copy.
