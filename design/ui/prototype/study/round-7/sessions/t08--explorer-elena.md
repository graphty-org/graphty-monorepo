# Session: Explorer Elena, "try a different arrangement, then stop it moving"

Participant: Explorer Elena (first-time graph user, product manager, trackpad only).
Task as given: "The drawing of the characters is hard to read. Try a different way of arranging
it, and once it looks better, stop it moving so you can study it."
Start screen: shots/tasks/t08/01.png. Renders: tmp/round-7-sessions/t08--explorer-elena/.
All commands were run from design/ui/prototype.

Outcome: gave up. The picture never changed in any render. SEQ 2.

## Transcript (thinking aloud)

**Start screen (shots/tasks/t08/01.png).**
"OK, a big orange blob with names on it. Valjean is the dark one in the middle, so I guess he's
the most important. There's a long list on the left, a panel on the right that's all about color,
and five little icons at the bottom. Nothing says 'arrange' or 'layout'. The icons at the bottom
look like the controls for the picture, so I'll start there. The triangle looks like a play
button."

**01. `--hover "play"`** -> nothing on screen is called "play".
"Hm, resting on it doesn't tell me anything that way."

**02. `--hover "Arrange"`** -> nothing called "Arrange".
**03. `--hover "Run"`** -> nothing called "Run".
"Nothing called 'arrange'. The Gephi video said 'lay it out', so maybe it's called layout."

**04. `--hover "Layout"`** -> tooltip on the triangle: "Resume layout".
"Resume layout. So it's... paused already? It didn't look like it was moving. OK, that's the
'stop it moving' half, I think. But where do I pick a different arrangement?"

**05. `--click "Resume layout"`** -> the triangle turns into a pause icon. The picture looks
exactly the same.
"I pressed play and nothing moved. Maybe it's already settled. Fine. I still need a different
arrangement."

**06. `--click "Co-appearances"`** (the dropdown next to "Graph" at the top of the left panel)
-> a menu with "Co-appearances 77 nodes" and "Compare graphs...". The right panel switched to
numbers about the graph (nodes, edges, density, a little stair-step chart).
"That's just the name of the data. Compare graphs, no. The right side has a 'Style' tab though.
Maybe arranging is in there?"

**07. `--click "Co-appearances" --key Escape --click "Style"`** -> the right panel is back to
PageRank colors.
**08. `--click "Co-appearances" --click "Co-appearances" --click "Style"`** -> same, PageRank
colors (Fill, Shape, Effects, Label, Tooltip).
"Every time I click Style it goes back to that PageRank thing. Fill, shape, label. That's how the
dots look, not where they go. I don't think it's here."

**09. `--hover "More"`** -> "More actions" tooltip on the three dots in the right panel.
"That's the dots for the PageRank thing. Not touching it."

**10. `--click "Menu"`** (the three lines, top left) -> New project, Open, Open recent,
Select where, Settings, Keyboard shortcuts, Help.
"File-menu stuff. No arrange. I'm not opening Settings, that's where I get lost."

**11. `--click "Co-appearances" --click "Style"`** -> nothing called "Style" (the dropdown was
covering it).

**12. `--hover "Analyze"`** -> the flask icon is "Analyze".
**13. `--hover "3D"`** -> nothing. **14. `--hover "Layers"`** -> nothing.
**15 / 16. `--hover "View"`** -> the cube icon is "View".
"Analyze is the math, I don't want math. View, maybe that changes how it looks?"

**17. `--click "View"`** -> a menu: Fit, Front, Side, Top, Isometric, "Whole cast",
"Valjean's circle", "From above", Save view, Switch to 2D, Enter VR, Enter AR.
"Front, side, top... this is turning the camera, not moving the dots around, I think. 'Whole
cast' sounds like a nice saved picture someone made. Switch to 2D? It already looks flat to me.
I don't want to break anything, so I'll leave this."

**18. `--click "Graph"`** -> no change.

**19. `--hover "Actions"`** -> the lightning icon is "Quick actions (Ctrl+K)".
"Quick actions! Maybe I can just type what I want."

**20. `--click "Quick actions"`** -> a search box, "Type a command or a place". Recent:
"Re-run layout -- Canvas menu > Re-run layout", PageRank, Data: Attributes; then a list of places.
"Re-run layout. That's the same arrangement again, right? I want a different one."

**21. `--click "Quick actions" --key a --key r --key r --key a --key n --key g --key e`**
-> typed "arrange". Results: under "Layout", only "Re-run layout"; and "Find 'arrange'" in rows.
"So the only arranging thing is re-run. There's no list of other ways to arrange it. OK, let me
see what re-run does."

**22. same, then `--key Enter`** -> instead of re-running, a menu popped up over the picture:
"Co-appearances: Select all visible, Invert selection, Reselect previous, Fit, Re-run layout,
Reshuffle layout seed, Unpin all, Compute the overview, Add node..., Add note, Clear graph data".
"Oh, it opened a menu instead. 'Reshuffle layout seed' -- I don't know what a seed is, but
reshuffle sounds like 'give me a different arrangement'. That's the closest thing. 'Clear graph
data' at the bottom scares me, I'll stay away from that."

**23. ... `--click "Reshuffle layout seed"`** -> a little black message "Reshuffle layout seed".
The picture is exactly the same: Valjean in the middle, Fantine top left, Myriel top right,
Marius and the bunch at the bottom.
"It says it did it. Nothing moved. Is it still paused? That's probably why."

**24. ... `--click "Resume layout" --hover "Pause layout"`** -> pause icon, tooltip "Pause
layout". Picture still identical.
"Playing now. Still the same picture. Every dot is where it was."

**25. ... `--click "Pause layout"`** -> back to the play icon. Same picture.
"OK, I paused it. So it's 'stopped', I guess, but it was stopped when I came in. I never got a
different arrangement. Either I did reshuffle wrong or it doesn't actually change anything. Yeah.
Not sure."

(Engagement dropped here: shorter answers, no new attempts.)

## Debrief

- **Did I succeed?** No. I found how to pause and play it, and I found something called
  "Reshuffle layout seed", but the picture never looked any different, so I didn't get a
  different arrangement and it was never actually moving that I could see.
- **Single Ease Question (1 = very hard, 7 = very easy):** 2.
- **Would I use this instead of my current tool?** Not for this. In Slides I pick a chart type
  from a list with little pictures. Here there was no list of arrangements anywhere I looked --
  only "re-run" and "reshuffle seed", which I had to find by typing into a command box, and that
  box opened a menu instead of doing the thing. The play button said "Resume" when nothing was
  moving, which made me unsure what "stop it" even meant.

## Observations for the study (what happened, in plain terms)

1. No visible way to choose a different arrangement. Nothing on screen says "arrange" or
   "layout" until you rest the pointer on the play icon; the inspector "Style" tab only offers
   colors, shapes, labels.
2. The only arranging commands she found ("Re-run layout", "Reshuffle layout seed") live in a
   canvas menu she reached only through Quick actions; she would not right-click on her trackpad.
3. Pressing Enter on "Re-run layout" in Quick actions opened the canvas menu rather than running
   the command.
4. "Reshuffle layout seed" showed a confirmation message but the picture did not change, even
   after resume and pause. She concluded either she did it wrong or it does nothing.
5. The play/pause control started as "Resume layout" while the picture looked still, so "stop it
   moving" had no visible starting state to stop.
6. "Seed" is a word she does not know; she chose it only because "reshuffle" sounded right.
7. Clicking the graph name selected the graph in the right panel, but clicking its "Style" tab
   switched the panel back to the PageRank layer, so she never saw the graph's own style options.
8. Misreading: she took Valjean, the dark dot in the middle, as "the most important" from color
   and position without reading the legend.

## Commands run

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/01.png task:t08 --hover "play"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/02.png task:t08 --hover "Arrange"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/03.png task:t08 --hover "Run"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/04.png task:t08 --hover "Layout"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/05.png task:t08 --click "Resume layout"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/06.png task:t08 --click "Co-appearances"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/07.png task:t08 --click "Co-appearances" --key Escape --click "Style"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/08.png task:t08 --click "Co-appearances" --click "Co-appearances" --click "Style"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/09.png task:t08 --hover "More"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/10.png task:t08 --click "Menu"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/11.png task:t08 --click "Co-appearances" --click "Style"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/12.png task:t08 --hover "Analyze"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/13.png task:t08 --hover "3D"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/14.png task:t08 --hover "Layers"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/15.png task:t08 --hover "Switch to 3D"   (also "View", "Shape" to the same file)
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/16.png task:t08 --hover "View"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/17.png task:t08 --click "View"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/18.png task:t08 --click "Graph"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/19.png task:t08 --hover "Actions"   (also tried "Quick actions", "Commands", "Run")
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/20.png task:t08 --click "Quick actions"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/21.png task:t08 --click "Quick actions" --key a --key r --key r --key a --key n --key g --key e
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/22.png task:t08 --click "Quick actions" --key a --key r --key r --key a --key n --key g --key e --key Enter
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/23.png task:t08 --click "Quick actions" --key a --key r --key r --key a --key n --key g --key e --key Enter --click "Reshuffle layout seed"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/24.png task:t08 --click "Quick actions" --key a --key r --key r --key a --key n --key g --key e --key Enter --click "Reshuffle layout seed" --click "Resume layout" --hover "Pause layout"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t08--explorer-elena/25.png task:t08 --click "Quick actions" --key a --key r --key r --key a --key n --key g --key e --key Enter --click "Reshuffle layout seed" --click "Resume layout" --click "Pause layout"
```

Note on the method: the click-through tool can show an icon's tooltip only when given a name,
so finding what the four unlabeled bottom icons do took guessed names; a real person would rest
the pointer on each. That made discovery slower here than it would be in a browser, but it did
not hide any control that has a visible label.
