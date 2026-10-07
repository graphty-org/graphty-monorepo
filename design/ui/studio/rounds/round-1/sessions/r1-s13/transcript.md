# Session r1-s13: Nadia, names on every dot (College football)

Participant: Nadia, a level-1 transaction monitoring analyst at a bank, fourteen months in. No
graph tools of her own; she clicks what is in front of her and gives a new tool about the length
of one alert.

Task (as given): "You have never used this program before. You will practice on the ready-made
network of American college football teams and the games they played, which comes with the
program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot."

Start: the empty app. Tool: `T=design/ui/studio/tool`, `S=rounds/round-1/sessions/r1-s13`.

## Steps

### 1. Start

```
node $T/real.mjs --start $S empty
```

Saw (01.png): a start page. Start column (Open project or file..., New from data...), Recent
projects (empty), and a Samples column listing Les Miserables, Zachary's karate club, College
football (115 teams), Florentine families. A "Your data is yours, but please help us" box at the
bottom with "Share usage data" and "No thanks".

Think-aloud: "Bank laptop. I don't share usage data with anything, compliance would kill me. No
thanks. And there's College football right there under Samples, 115 teams. That's the one."

### 2. Decline usage data, open the sample

```
node $T/real.mjs --step $S --click "No thanks" --click "College football"
```

Saw (02.png): the graph drawn in the middle, a big ball of blue dots and gray lines, no names
anywhere. Left panel: "Graph College football", a search box, "Selection", "Everything". Right
panel: "Graph / From College football", tabs Style and Values; Values is open showing an
Overview: 115 nodes, 613 edges, density, 1 component. A toolbar of five icons at the bottom.

Think-aloud: "OK, dots, no names. How the dots look would be 'Style', not 'Values'. Try Style on
the right."

### 3. Style tab of the graph

```
node $T/real.mjs --step $S --click "Style"
```

Saw (03.png): Style shows only Canvas (Background F5F5F5), Method (Force - Recommended) and Seed
(1). Nothing about dots or names.

Hesitation: "That's the background and how it's arranged. Nothing about the dots themselves. So
this panel is about the whole picture, not the teams." About ten seconds looking around.

Think-aloud: "On the left there's 'Everything'. If I want every team's name, everything sounds
like all of them. Click that."

### 4. Everything

```
node $T/real.mjs --step $S --click "Everything"
```

Saw (04.png): right panel now titled "Everything", Style tab, a Nodes / Edges switch with Nodes
on. Sections: Fill (Color #63...), Shape (Size 1, Icosphere), Effects, Label with a plus, Tooltip
with a plus.

Think-aloud: "There, Label. Nodes are the dots, I'm guessing. Label, plus. Click the plus."

### 5. Add a label

```
node $T/real.mjs --step $S --click-at 1419,356     # button "Add label line"
```

Saw (05.png): a row "Pick an attribute" appeared under Label and a list popped up beside it:
"Find an attribute", then Attributes: id, label, value.

Hesitation: "id, label, value. The id is probably a number, like an account number. 'value'
I don't know. 'label' -- that's probably the name. Label inside Label, a bit funny."

### 6. Pick "label"

```
node $T/real.mjs --step $S --click-at 1115,486     # option "label"
```

Saw (06.png): names appeared next to the dots: GeorgiaTech, Maryland, Florida, Georgia,
Tennessee, Arkansas, Virginia, Arizona, California, Stanford and so on. Small but readable for
the bigger ones; many in the middle are tiny and pile on each other. The right panel now says
"Aa Above   Abc label" and under it "115 labels, 14 hidden to avoid overlap". A small dot appeared
on the Nodes switch.

Think-aloud: "Names are on. But it says 14 are hidden. The task said every team. If QA asked me,
I'd have to say fourteen are missing. Can I make it show them?"

### 7. Look for a way to show the hidden ones

```
node $T/real.mjs --step $S --click-at 1220,386     # button "Label position"
```

Saw (07.png): a little 3 x 3 grid of dots, one highlighted (the top-middle). It is where the name
sits, not whether it shows.

```
node $T/real.mjs --step $S --key Escape --hover-at 1330,411   # group "Label", no tooltip
```

Saw (08.png): nothing; the "14 hidden" line is plain text, no tooltip, nothing to click.

Hesitation: "Where it sits, not how many. And the 14 hidden line doesn't do anything. Maybe if I
zoom in there's room for them."

### 8. Zoom in

```
node $T/real.mjs --step $S --wheel 750,470,-400
node $T/real.mjs --step $S --wheel 750,470,-1500
```

Saw (09.png, 10.png): the drawing did not change at all either time. Same size, same names, same
"14 hidden".

Think-aloud: "Scroll does nothing. I'm not going to go hunting through every menu. Most of the
names are there, that's what I'd screenshot. I'm stopping here."

```
node $T/real.mjs --end $S
```

## In character, at the end

- Did I finish? Mostly. Every dot got a name turned on in about a minute, but the panel itself
  says 14 of the 115 are hidden, so strictly not every team's name is written. I could not find
  how to show those 14.
- How hard (1 = very easy, 7 = very hard): 3. Getting names on was quick once I clicked
  "Everything"; the last bit (the hidden 14) I could not do at all.
- What confused me:
  - The first Style tab (the graph's) has only background and arrangement. I had to guess that
    "Everything" on the left is where the dots' look lives. "Everything" does not sound like a
    place you go to style things.
  - Three attribute choices, "id", "label" and "value", with no example values. I guessed "label"
    held the team name. Picking "label" under a heading called "Label" read oddly.
  - "14 hidden to avoid overlap" tells me something is missing but gives me no way to fix it: not
    clickable, no tooltip, and the position button next to it only moves the name.
  - Scrolling the mouse wheel over the drawing did nothing, so I could not zoom in to make room.
  - Many names in the middle are tiny and sit on top of each other; for an alert file screenshot
    I would not trust a reviewer to read them.
