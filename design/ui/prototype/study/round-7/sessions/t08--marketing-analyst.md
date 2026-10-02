# Session: change the arrangement and stop it moving -- Jordan, marketing network analyst

Task as given by the moderator: "The drawing of the characters is hard to read. Try a different
way of arranging it, and once it looks better, stop it moving so you can study it. The data on
screen is a sample: characters of the novel Les Miserables, linked when they appear in the same
chapter. If that is not your line of work, treat them as your own people or things."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t08--marketing-analyst/ (D below).

## Start screen (shots/tasks/t08/01.png)

Jordan: "OK, the hairball. Orange blobs, a few names. In Gephi I'd go to the Layout panel, pick
ForceAtlas2 and hit Run. Where's layout here? Left side is a list of... layers? PageRank,
Louvain, shortest paths. Right side is styling for PageRank. Bottom toolbar is five little icons
with no labels. Of course it is. One of them is a play button, so maybe that's the layout."

## Step 1 -- guess a control called "Layout"

    timeout 120 node app-b/study.mjs --try D/01.png task:t08 --hover "Graph"
    timeout 120 node app-b/study.mjs --try D/02.png task:t08 --click "Layout"

(01 was a stray hover on the Graph rail button, nothing changed.)
02: the play icon turned into a pause icon. Nothing else changed.
Jordan: "So 'Layout' is the play button. It just started... running whatever it was already
running. That's not a different arrangement, that's the same one again."

## Step 2 -- what is that button actually called

    timeout 120 node app-b/study.mjs --try D/03.png task:t08 --hover "Layout"

03: tooltip "Resume layout".
Jordan: "Resume. So it was already stopped when I came in? Then the 'stop it moving' half is
already done, which is weird. Fine. I still need a different arrangement."

## Step 3 -- the hamburger menu

    timeout 120 node app-b/study.mjs --try D/04.png task:t08 --click "Menu"

04: New project, Open, Open recent, Select where..., Settings, Keyboard shortcuts, Help. No
layout. The right panel switched to a summary of the graph while the menu was open.
Jordan: "Nope. Settings maybe, but layout isn't a setting, it's the main thing you do."

## Step 4 -- the graph name at the top of the left panel

    timeout 120 node app-b/study.mjs --try D/05.png task:t08 --click "Co-appearances"
    timeout 120 node app-b/study.mjs --try D/06.png task:t08 --click "Co-appearances" --key Escape --click "Style"
    timeout 120 node app-b/study.mjs --try D/12.png task:t08 --click "Co-appearances" --click "Style"

05: a little dropdown (Co-appearances, 77 nodes / Compare graphs...). The right panel showed the
graph with Style and Data tabs -- "Style on the graph, maybe layout is in there."
06: pressed Escape to close the dropdown and clicked Style -- but the right panel had already
flipped back to PageRank, so I got PageRank's style.
12: tried clicking Style without closing the dropdown: "nothing on screen is called Style".
Jordan: "So the graph's settings only show up while a menu is open, and vanish the moment I
close it. That's maddening. I can see the door but it shuts when I walk at it."

## Step 5 -- the other dock icons

    timeout 120 node app-b/study.mjs --try D/07.png task:t08 --hover "Actions"
    timeout 120 node app-b/study.mjs --try D/08.png task:t08 --hover "Analyze"
    timeout 120 node app-b/study.mjs --try D/14.png task:t08 --hover "3D"
    timeout 120 node app-b/study.mjs --try D/15.png task:t08 --hover "Legend"
    timeout 120 node app-b/study.mjs --try D/16.png task:t08 --hover "More"

07: lightning bolt is "Quick actions Ctrl+K". 08: flask is "Analyze". 14: nothing is called
"3D" (I'd never click a 3D thing anyway, my VP won't wear a headset). 15: list icon is
"Legend". 16: "More actions" is the three dots on the right panel.
Jordan: "Five icons and I had to hover every one to learn what they are. This is exactly the
Gephi Lite complaint."

## Step 6 -- Quick actions

    timeout 120 node app-b/study.mjs --try D/09.png task:t08 --click "Quick actions"
    timeout 120 node app-b/study.mjs --try D/10.png task:t08 --click "Quick actions" --click "Re-run layout"

09: a command box, "Type a command or a place". First recent item: "Re-run layout -- Canvas
menu > Re-run layout". 10: clicking it opened a canvas menu: Select all visible, Invert
selection, Fit, Re-run layout, Reshuffle layout seed, Unpin all, Compute the overview, Add
node, Add note, Clear graph data.
Jordan: "Re-run and reshuffle. Reshuffle the seed -- that's the same algorithm with different
dice. I want a different METHOD. And 'Clear graph data' sitting right there at the bottom of
the same menu is terrifying."

## Step 7 -- Analyze

    timeout 120 node app-b/study.mjs --try D/13.png task:t08 --click "Analyze"

13: a list of measures -- Louvain, PageRank, Shortest path, Links, Betweenness, Closeness...
Jordan: "That's the metrics, which is fine and actually nicely worded, but not layout."

## Step 8 -- Views, by accident

    timeout 120 node app-b/study.mjs --try D/17.png task:t08 --click "Views"
    timeout 120 node app-b/study.mjs --try D/18.png task:t08 --click "Views" --click "Style"

17: Views are saved camera shots (Whole cast, Valjean's circle, From above). Not what I want --
but the right panel now showed the graph, and it STAYED.
18: clicked Style on the right: Canvas settings, and below them "Layout -- Method: Spread Out,
Seed: 7".
Jordan: "There it is. Layout lives under Style, on the graph, and I only got to it because I
wandered into Views. I'd never have looked under 'Style' for layout -- style is colors."

## Step 9 -- pick a different method

    timeout 120 node app-b/study.mjs --try D/19.png task:t08 --click "Views" --click "Style" --click "Spread Out"
    timeout 120 node app-b/study.mjs --try D/20.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Natural Grouping"

19: a Layout window with a list of methods (Spread Out -- Recommended, Spread Out Flat, Ring,
Rings from a Node, Grid, Concentric Rings, Spiral, Natural Grouping, No Crossings, Scattered,
Tree, Two Columns, Columns by Group, Keep Positions) with Size and Weights columns, and a wall of
engine options on the right (spring length, gravity, theta, drag coefficient...). The left panel
jumped back from Views to the Graph list on its own.
Jordan: "OK, this list is good -- plain names, I can guess what 'Ring' and 'Grid' do. No
ForceAtlas2 by name, which I'd miss a bit. 'Natural Grouping' sounds like it pulls the
clusters apart, which is what I want for segments. I'm not touching the right side, that's
physics homework."
20: picked Natural Grouping. A message: "Laid out again: Natural Grouping" with Undo. Engine
Spectral, "Ignores edge weights."
Jordan: "Undo right there, good, I'd actually click things because of that."

## Step 10 -- close it and look

    timeout 120 node app-b/study.mjs --try D/21.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Natural Grouping" --key Escape
    timeout 120 node app-b/study.mjs --try D/22.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Natural Grouping" --click "Close"
    timeout 120 node app-b/study.mjs --try D/23.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Ring" --click "Close"

21, 22: the window closed. The drawing looks exactly the same as before -- same blob, same
Fantine cluster top left, Myriel top right.
23: tried Ring instead to be sure. Still the same picture.
Jordan: "It told me it laid it out again and... nothing moved. Ring should be a circle, that's
not a circle. Either it didn't apply, or Escape undid it, or I'm looking at the wrong thing. If
this were my data I'd assume it was broken. I'd give it one more go and then I'm back in
Gephi."

## Step 11 -- stop it moving

    timeout 120 node app-b/study.mjs --try D/24.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Natural Grouping" --click "Close" --hover "Layout"
    timeout 120 node app-b/study.mjs --try D/25.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Natural Grouping" --click "Close" --click "Layout" --hover "Layout"
    timeout 120 node app-b/study.mjs --try D/26.png task:t08 --click "Views" --click "Style" --click "Spread Out" --click "Natural Grouping" --click "Close" --click "Layout" --click "Pause layout" --hover "Layout"

24: after the new layout, the button still says "Resume layout" -- so it isn't running.
25: I started it anyway ("Pause layout" now).
26: paused it again; back to "Resume layout".
Jordan: "So: it was never moving, I made it move, I stopped it. Technically that's the task.
Play and pause I get -- same as a video. But I never saw anything move, and I couldn't tell you
whether 'Natural Grouping' is a thing that moves at all or a one-shot."

## Wrap-up

Did I succeed? "Sort of. I picked a different method and the button says it's paused. But the
picture never changed, so I can't tell you it looks better, which was the whole point."

Single Ease Question (1 = very difficult, 7 = very easy): **3**. Finding the layout setting
was the hard part; it took about a dozen tries and I only found it by accident.

Would I use this instead of my current tool? "Not on this. In Gephi layout is a panel with its
own name on the left and a big Run button. Here it's hidden under 'Style' on the graph, which I
can only reach when the right panel happens to show the graph. The method list itself is nicer
than Gephi's -- plain names, an Undo, a 'Recommended' tag -- and if the picture had actually
changed I'd have been impressed. But I'd have to show my manager where layout lives, and she'd
forget by Thursday."

Off-topic: "Honestly half my job right now is just getting data at all since the Twitter API
went paid. I don't need ten layouts, I need one that makes the clusters readable on a slide."
