# Session transcript: names on every dot, Les Miserables

Participant: Tom, 52, cell biology lab manager. He receives network files from a postdoc and never
builds them. Mild red-green color weakness, reading glasses, trackpad user.

Task prompt: "You have never used this program before. You will practice on the ready-made network
of characters from the novel Les Miserables that comes with the program, not on your own data.
Right now no names are written on the drawing. Get every character's name written next to its dot."

Start: empty app, clean storage.

Note on the session itself: the start waited about 40 minutes for a free browser slot before the
app opened. That wait is not part of the participant's experience and is left out of the timings.

## Steps

### 01 -- start

`node tool/real.mjs --start rounds/round-1/sessions/r1-s11b empty`

Saw: a start screen. Left: "Open project or file...", "New from data...". Middle: Recent projects
(empty). Right: Samples -- Les Miserables (77 characters), Zachary's karate club, College football,
Florentine families. Bottom: a box asking to share usage data.

Tom: "OK, a start page. There's the Les Miserables one, top right. First that box at the bottom -- no,
I don't want anything leaving the building."

### 02 -- decline usage data

`--step ... --click "No thanks"`

Saw: the box went away.

### 03 -- open the sample

`--step ... --click "Les Miserables"`

Saw: about 77 blue balls joined by grey lines, no names. Left: a search box, "Selection",
"Everything". Right: "Graph / From Les Miserables" with "Style" and "Values" tabs; Values shows
Nodes 77, Edges 254, density and so on. A toolbar at the bottom with five icons.

Tom: "Lots of blue balls, no names, as they said. On the right there's Style. Writing names on the
dots sounds like how it looks, so Style."

### 04 -- Style tab of the graph

`--step ... --click "Style"`

Saw: Canvas Background color, Method "Force - Recommended", Seed 1. Nothing about names.

Tom: "Background color and some 'Method' thing. Nothing about names." (Hesitated here: Style was
the right idea but the wrong thing selected.) "On the left it says 'Everything' -- maybe that means
all the dots."

### 05 -- select Everything

`--step ... --click "Everything"`

Saw: the right panel now says "Everything", with Nodes / Edges switch and rows Fill (Color), Shape
(Size, Shape: Icosphere), Effects, Label, Tooltip. Label has a small plus at the far right.

Tom: "There -- 'Label'. That's the word I want. The plus is tiny, I have to squint at it."

### 06 -- add a label

`--step ... --click-at 1419,342` (button "Add label line")

Saw: a dropdown "Find an attribute" listing "id" and "name"; a row "Pick an attribute" appeared
under Label.

Tom: "id or name. I want the character's name, so name."

### 07 -- pick name

`--step ... --click "name"`

Saw: names appear above the dots across the whole drawing (Blacheville, Myriel, Napoleon, Old Man,
Gervais...). The Label row now reads "Aa Above Abc name" with a minus. Under it, in small grey
text: "77 labels, 7 hidden to avoid overlap". The middle of the drawing is a knot where names are
crammed and some dots have none.

Tom: "Names! Small, but there. The middle is a mess though." Leaned in to read the grey line:
"'77 labels, 7 hidden to avoid overlap.' So seven aren't showing. They asked for every name."

### 08 -- try to zoom into the knot

`--step ... --wheel 740,400,-600`

Saw: nothing changed. Same view.

Tom: "Scrolling did nothing. Hm." (Dead end 1. On the trackpad he would have expected a pinch or
scroll to zoom.)

### 09 -- try the "Aa" box

`--step ... --click-at 1220,372` (button "Label position")

Saw: a small popup with a 3x3 grid of dots, the top-center one highlighted.

Tom: "That's just where the name sits. Not a 'show them all' switch." (Dead end 2.)

### 10 -- try the "Abc name" chip

`--step ... --key Escape --click-at 1349,372` (button "Label, Above: name")

Saw: the same attribute list again ("In use: name", "Attributes: id").

Tom: "Same list again." (Dead end 3.)

### 11 -- close and stop

`--step ... --key Escape`, then `--end`.

Tom: "I've done what they asked as far as I can. The names are on. Seven are hidden and I can't
find how to bring them back. For lab meeting I'd call this good enough and ask the postdoc about
the other seven."

## Afterwards, in Tom's words

- **Did you finish?** Mostly. Names are on the drawing. But the program itself told me 7 of 77
  were hidden, and I could not make them show. So not "every" name, strictly. (Partial.)
- **How hard was it (1 = very easy, 7 = very hard)?** 3. Getting names on was quick once I clicked
  "Everything". Getting all of them on, I could not do.
- **What confused me:**
    - Style on the first screen only had background and "Method". I had to guess that "Everything"
      on the left was what I should click to get at the dots.
    - The plus next to Label is very small and faint; the row looks like a heading, not a button.
    - The names are tiny, serif, and black on light grey. With my glasses up on my head I could not
      read most of them, especially in the middle.
    - "7 hidden to avoid overlap" is in tiny grey text, and it tells me there is a problem without
      telling me what to do about it. I wanted a "show all" or "bigger names" or at least a hint
      that zooming in would show them.
    - Scrolling on the drawing did not zoom in, so I could not get closer to the crowded middle.
    - The "Aa" and "Abc name" boxes looked like they would have text settings (size, show all) but
      one was position and the other was the same list again
