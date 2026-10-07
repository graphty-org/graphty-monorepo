# Session r2-s12 -- Nadia (level-1 alert reviewer), task T10 prompt A (Les Miserables)

Task as given: practice on the ready-made Les Miserables network; no names are written on the
drawing; get every character's name written next to its dot.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s12 empty`

Saw (01.png): a start page. Left: "Open project or file...", "New from data...". Right: "Samples"
with Les Miserables (77 characters) at the top. A usage-data box at the bottom with "Share usage
data" / "No thanks".

Nadia: "Usage data box first -- No thanks. Then the Les Miserables sample, it's right there."

## Step 2 -- open the sample

Command: `--step --click "No thanks" --click "Les Miserables"`

Saw (02.png): the network drawn as blue dots and gray lines, no names anywhere. Left: a search box
"Find nodes, edges, values", "Selection", "Everything". Right panel: "Graph / From Les
Miserables", two tabs "Style" and "Values" (Values open: 77 nodes, 254 edges...). Toolbar at the
bottom: a flask, a chart, "3D", a magnifier.

Nadia: "Dots, no names. Names are how it looks, so Style, not Values. Trying the Style tab."

## Step 3 -- Style tab of the graph

Command: `--step --click "Style"`

Saw (03.png): Style shows "Canvas / Background F5F5F5", then "Method: Force - Recommended",
Shape 3D/2D, Spring length, Gravity, Advanced. Nothing about names or labels.

Nadia (hesitating): "This is the whole graph -- background and how it's laid out. Names belong to
the dots. On the left there's 'Everything'; maybe that's all the dots. Clicking it."

## Step 4 -- Everything

Command: `--step --click "Everything"`

Saw (04.png): right panel now "Everything", Style tab, Nodes/Edges switch (Nodes on). Fill color
6366F1, Shape size 1, Icosphere, then "Effects +", "Label +", "Tooltip +".

Nadia: "Label. That's it. There's a plus next to it -- clicking the plus."

## Step 5 -- the plus beside Label

Command: `--step --click-at 1419,362` (tool: button "Add label line")

Saw (05.png): a "Label" popup with "Find an attribute" and a list: "id", "name". A row "Pick an
attribute" with a minus appeared under Label.

Nadia: "Name. Obviously name, not id. Clicking name."

## Step 6 -- pick "name"

Command: `--step --click "name"`

Saw (06.png): names appear above the dots -- Blacheville, Myriel, Napoleon, Gervais... Panel row
now "Aa Above | Abc name" with a minus, and under it small gray text: "77 labels, 7 hidden to
avoid overlap". Names in the dense middle are tiny and stacked on each other.

Nadia: "Most of them are there. But it says 7 are hidden, and the task says every name. The
middle is a mess anyway -- zooming in on the middle to see if the hidden ones come back."
Part one (names on) is done; checking "every".

## Step 7 -- zoom in

Command: `--step --wheel 700,420,-600`

Saw (07.png): zoomed in a little. Still "77 labels, 7 hidden to avoid overlap". Some dots still
have no name (one below the left cluster around 607,501, one right of Bamatabois, one beside
Mme Magloire).

Nadia: "Zooming didn't bring them back. The settings next to the label say 'Aa Above' -- maybe
there's an option in there for overlap. Clicking 'Above'."

## Step 8 -- click "Above"

Command: `--step --click-at 1250,392` (tool: group "Label")

Saw (08.png): nothing changed. "Above" is just text, not a control.

Nadia: "Not a button. The little 'Aa' in front of it, maybe that's the settings."

## Step 9 -- "Aa"

Command: `--step --click-at 1220,392` (tool: button "Label position")

Saw (09.png): a "Label position" popup with a 3 by 3 grid of dots (top middle is chosen). Only
where the name sits, nothing about hidden names.

Nadia: "That's just where the name goes. Closing it. Let me hover the '7 hidden' line, maybe it
explains or does something."

## Step 10 -- Escape, hover "7 hidden"

Command: `--step --key Escape --hover-at 1286,417` (tool: group "Label", tooltip "Label position"
-- probably the Aa button still focused)

Saw (10.png): popup closed. The "77 labels, 7 hidden to avoid overlap" line is plain text, no
help of its own.

Nadia: "Nothing there. Last thing in that row is 'Abc name' -- maybe clicking it opens the label's
settings, like size or 'show all'."

## Step 11 -- "Abc name"

Command: `--step --click-at 1348,392` (tool: button "Label, Above: name")

Saw (11.png): the same attribute list again ("In use: name", "Attributes: id"). No size, no
"show all".

Nadia: "Same list. No switch for the hidden ones. One more try: zoom right into the crowded middle
-- if the names fit when the dots spread out, maybe the hidden ones show up."

## Step 12 -- Escape, zoom hard

Command: `--step --key Escape --wheel 640,420,-2500`

Saw (12.png): zoomed in only a bit more, even with a big wheel turn. The line now says "77 labels,
5 hidden to avoid overlap" -- two came back (Gillenormand, Mlle Gillenormand now show). The middle
is still a pile of tiny names, and a few dots still have none (beside Bamatabois, beside Mme
Magloire).

Nadia: "So zooming is the trick -- they come back when there's room. It's slow though. One more
big zoom to see if I can get it to zero."

## Step 13 -- zoom more

Command: `--step --wheel 700,420,-5000`

Saw (13.png): zoomed in a bit more; the bottom of the drawing is now cut off. The line is back to
"77 labels, 7 hidden to avoid overlap" -- more zoom, and the hidden count went back UP from 5 to
7. Still unnamed dots: right of Bamatabois (about 965,391), left of Mme Magloire (660,630), the
one beside Labarre ("Mme..." cut off), and several in the dense middle are stacked unreadably.

Nadia: "Now it says 7 again. I zoomed in and it got worse? I don't get the rule. I've done what
the panel offers -- Label, name -- and there's no 'show all' anywhere. That's where I stop."

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s12`

## End -- in character

**Did I finish?** Mostly. Names went on in four clicks: Everything, the plus next to Label, name.
70 of 77 show. The app itself says 7 are hidden "to avoid overlap", and I could not find a way to
force them on. Zooming brought two back, then zooming further brought the count back to 7. So:
"every character's name" -- no, not quite.

**Rating: 5 out of 7.** Getting names on was easy once I clicked "Everything" -- that part took
under a minute. Losing time after that, hunting for the hidden 7, is what costs.

**What confused me:**
- The first Style tab (the graph's) was all background and layout, nothing about names. I had to
  guess that "Everything" on the left was where the dots' own settings live.
- "77 labels, 7 hidden to avoid overlap" tells me something is missing but gives me nothing to
  click. If QA asked "why is that dot unnamed?", I could not answer.
- Zooming changed the hidden count down then back up, so I can't tell what decides it.
- "Aa Above" looks like one control; only "Aa" is a button and it only moves the name around the
  dot. "Above" does nothing.
- In the crowded middle the names that do show are too small and piled on each other to read; as
  a screenshot for an alert file it would not hold up for the middle cluster.
