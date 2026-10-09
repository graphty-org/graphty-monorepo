# Session r3-s17 -- Ruth (reporter with a contacts sheet), task T10 B (College football)

Task as given: "You have never used this program before. You will practice on the ready-made
network of American college football teams and the games they played, which comes with the
program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot."

Start: empty. Build under study: commit f108a235091e, graphty@0.8.53.

## Steps

### 1. Start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s17 empty` -> 01.png

Saw: a dark start page. Left: "Open project or file...", "New from data...". Middle: "Recent
projects" (empty). Right: "Samples" -- Les Miserables, Zachary's karate club, College football
(115 teams), Florentine families. At the bottom a box asking to share usage data, with "Share
usage data" and "No thanks".

Ruth: "Good -- the football one is right there. First I'll say no to the usage data thing; I don't
share anything from my work machine."

### 2. Decline usage data

Command: `--step --click "No thanks"` -> 02.png
Saw: the box closed (only a screenshot printed). Ruth: "Now the football sample."

### 3. Open the College football sample

Command: `--step --click "College football"`
-> 03.png
Saw: the graph opened: blue balls joined by gray lines in a box shape, no names anywhere. Left:
a "Find nodes, edges, values" search box, "Selection", "Everything". Right panel "Graph -- From
College football" with tabs "Style" and "Values" (Values is open: Nodes 115, Edges 613, Density,
Components 1, "Edges per ..." 7 to 12). Bottom toolbar: a flask icon, a chart icon, "3D", a
magnifier.

Ruth: "115 teams, matches the sample card -- good. No names on the dots, like they said. Names on
dots sounds like a look-of-the-picture thing, so I'll try the 'Style' tab on the right."

### 4. Open the Style tab

Command: `--step --click "Style"`
-> 04.png
Saw: Style tab for "Graph": Canvas background color F5F5F5, then "Method: Force - Recommended",
Shape 3D/2D, Spring length, Gravity, Advanced, "Applied". Nothing about names or labels.

Ruth (hesitating): "This is about the background and how the dots are arranged -- no names here.
This panel is for the whole graph. On the left there's 'Everything' with a stack icon -- maybe
that's 'all the dots', and its style has the names. I'll click it."

### 5. Click "Everything" on the left

Command: `--step --click "Everything"`
-> 05.png
Saw: right panel now "Everything", Style tab, Nodes/Edges toggle (Nodes on). Fill: Color 6366F1
100%. Shape: Size 1, Icosphere. Then collapsed rows each with a "+" on the right: Effects,
Label, Tooltip.

Ruth: "There it is -- 'Label'. That's what a name on a dot would be called. It has a plus, so I
think I add one. I'll press the plus beside Label."

### 6. Press the "+" beside Label

Command: `--step --click-at 1420,362`
-> 06.png (tool: button "Add label line")
Saw: a pop-up "Label" with a "Find an attribute" box and a list "Attributes": id, label, value.
Behind it, the Label row now has a "Pick an attribute" box and a minus.

Ruth (small hesitation): "It wants me to pick a column, like in a spreadsheet. 'id' might be a
number or a code; 'label' sounds like the name; I don't know what 'value' is in a football
network. I'd want the team name, so 'label'."

### 7. Pick "label"

Command: `--step --click "label"`
-> 07.png
Saw: team names appeared above the dots (Georgia, Florida, Arkansas, NewMexicoState, Arizona,
ArizonaState ...), small, some overlapping in the busy middle. The Label row now reads "Aa Above
| Abc label" and under it, in small gray text, "115 labels, 14 hidden" and a checkbox "Show all
labels".

Ruth: "Names! But it tells me straight out 14 are hidden -- so not every team. I like that it
says so instead of quietly dropping them. They want every team, so I'll tick 'Show all labels'."

### 8. Tick "Show all labels"

Command: `--step --click "Show all labels"`
-> 08.png
Saw: the checkbox is ticked and the gray text now reads "115 labels" (the "14 hidden" is gone).
More names showed up on the drawing (SanDiegoState, Washington, ColoradoState, OregonState...).
In a few busy spots two names now print on top of each other (around SanDiegoState and
OregonState, lower right) and the text is tiny at this size.

Ruth: "115 labels, 115 teams -- the numbers match, so every team has its name. Some are stacked
on each other and hard to read. Before I call it done I'll zoom in on the crowded lower middle to
check the names are really there and readable."

### 9. Zoom in on the crowded lower middle

Command: `--step --wheel 760,600,-600`
-> 09.png
Saw: the drawing grew only a little. The names grew with it but are still small serif text.
Most read fine (Arizona, California, Stanford, WashingtonState, AirForce, BoiseState). A few
places are still a smudge of two names on top of each other: Washington with a neighbor, and
SouthernCalifornia over OregonState in the lower right; the Mississippi area on the left. Names
are written run together with no spaces ("NewMexicoState", "BrighamYoung") -- that's how the data
has them, I assume.

Ruth: "Every team has its name; the count says 115 of 115. The overlaps are a readability thing,
not a missing-name thing -- I could zoom in further or move dots if I needed a clean picture for
the graphics desk. For this task I'm done."

### 10. End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s17`

## Debrief (in character)

**Did you finish?** Yes. Every team's name is written next to its dot, and the panel confirms
"115 labels" against the 115 teams the sample said it had.

**How easy or difficult, 1 (very difficult) to 7 (very easy):** 6.

**What went well**

- The football sample was right on the first page; opening it was one click.
- Once I clicked "Everything" on the left, "Label" was a plainly named row with a plus. The
  attribute list was short (id, label, value), and "label" was a sensible guess for a name.
- The best part: after names appeared it said "115 labels, 14 hidden" instead of silently
  leaving some out. That's exactly the kind of honesty I need -- and "Show all labels" fixed it,
  with the count changing to "115 labels".

**Where I hesitated or was confused**

- The first place I looked, the "Style" tab of the Graph panel, was about the background and the
  arrangement method -- nothing about the dots' names. I had to guess that "Everything" on the
  left meant "all the dots" to reach the node style. Nothing on the Graph style tab pointed me
  there.
- The attribute list said "id", "label" and "value" with no sample of what's in each. I guessed
  "label"; a peek at one example value ("Georgia") would have made it certain. I still don't know
  what "value" holds for a football team.
- "Show all labels" is in tiny gray text under the row; I nearly missed the "14 hidden" note.
- With every name on, some names print on top of each other in crowded spots and the text is
  small, so not every name is actually readable without zooming. Zooming with the wheel only grew
  the drawing a little. For a picture I'd hand an editor, I'd need a way to make names bigger or
  stop them overlapping.
- The names run together with no spaces (NewMexicoState); probably the data, but it looks odd.
