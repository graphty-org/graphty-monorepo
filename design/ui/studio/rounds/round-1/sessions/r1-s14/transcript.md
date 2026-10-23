# Session r1-s14: Grace, "Names on every dot", College football

Participant: Grace, the operations and data coordinator at a small nonprofit, a first-time user of
graph tools. Task prompt: "You have never used this program before. You will practice on the
ready-made network of American college football teams and the games they played, which comes with
the program, not on your own data. Right now no names are written on the drawing. Get every team's
name written next to its dot." Start: empty app.

Commands are run from the studio worktree as `node design/ui/studio/tool/real.mjs ...` with the
session folder `design/ui/studio/rounds/round-1/sessions/r1-s14` (shortened to `$S` below).

Note on setup: the start waited roughly an hour for a free browser slot (about twenty sessions
were queued for four slots). That is a study logistics fact, not part of the app.

## Steps

### 1. Start (01.png)

`--start $S empty`

Saw: a start page. "Open project or file...", "New from data...", "Files are read on this computer
and never uploaded." On the right, Samples: Les Miserables, Zachary's karate club, College football
(115 teams), Florentine families. At the bottom, a box "Your data is yours, but please help us"
with "Share usage data" and "No thanks". "Local only" at the top right.

Grace: "Good, it says files are never uploaded and 'Local only' -- that's what I'd need for donor
names. There's a data-sharing box. I'll say no thanks. Then the College football sample on the
right."

### 2. Decline usage data (02.png)

`--step $S --click "No thanks"`

The box went away.

### 3. Open the sample (03.png)

`--step $S --click "College football"`

Saw: the drawing of about a hundred blue balls with gray lines, no names on any of them. Left
panel: a search box "Find nodes, edges, values", "Selection", "Everything". Right panel: "Graph,
From College football", tabs "Style" and "Values" (Values open): Nodes 115, Edges 613, Density
0.09352, Components 1, "Edges per ..." 7 to 12. A small toolbar at the bottom with icons only.

Grace: "115 nodes -- matches the 115 teams it promised. No names anywhere. 'Style' sounds like how
it looks, and names are part of the look, so I'll try that."

### 4. Style tab (04.png)

`--step $S --click "Style"`

Saw: Canvas, Background F5F5F5; Method "Force - Recommended"; Seed 1. Nothing about the dots or
names.

Grace: "Just the background color and some 'Method' and 'Seed' thing I don't understand. Nothing
about the dots. On the left there's 'Everything' -- maybe I have to pick all the teams first."
(Hesitation: the Style tab at the graph level had no names option, so she had to guess that the
dots live under "Everything".)

### 5. Everything (05.png)

`--step $S --click "Everything"`

Saw: the right panel changed to "Everything", Style tab, a Nodes / Edges switch (Nodes on). Fill:
Color #63...; Shape: Size 1, Shape Icosphere; Effects +; Label +; Tooltip +.

Grace: "There it is -- 'Label' with a plus. That's the names."

### 6. Add a label (06.png)

`--step $S --click-at 1419,356` -- printed `button "Add label line"`

Saw: a pop-up "Find an attribute" listing id, label, value. A row "Pick an attribute" under Label.

Grace (hesitating): "id, label, value... In our database id is just a number. 'label' sounds like
the name. I'll take label." She was not sure which one held the team names; nothing in the list
showed an example value.

### 7. Pick "label" (07.png)

`--step $S --click-at 1115,486` -- printed `option "label"`

Saw: names appeared above the dots across the drawing: GeorgiaTech, Maryland, Virginia, Arkansas,
Florida, NewMexicoState, Arizona, California, Stanford, and so on. They are very small, many
overlap or sit on top of lines, and some are too small to read at all. Under the Label row: "Aa
Above Abc label" and the note "115 labels, 14 hidden to avoid overlap".

Grace: "Names! Tiny, but they're there. But it says 14 are hidden. The job was every team. A board
member would ask 'where's our team?' Can I show the hidden ones?"

### 8. Try the "Aa" button (08.png)

`--step $S --click-at 1220,386` -- printed `button "Label position"`

Saw: a small grid of dots, one with lines highlighted -- where the name sits relative to the dot.

Grace: "That's just where the name goes. Not what I want."

### 9. Point at the "14 hidden" note (09.png)

`--step $S --key Escape --hover-at 1290,411` -- printed `group "Label"`, `tooltip: null`

Nothing happened; no explanation, no link.

Grace: "Nothing. I'd hoped it would say how to show them."

### 10. Click "Abc label" (10.png)

`--step $S --click-at 1348,386` -- printed `button "Label, Above: label"`

Saw: the same attribute list again, now "In use: label" and "Attributes: id, value". No text size,
no "show all" option.

Grace: "Same list again. No size, no 'show all'."

### 11. Zoom in (11.png)

`--step $S --key Escape --wheel 740,470,-500`

The drawing looked the same as before; it did not zoom in, and the note still said 14 hidden.

Grace: "Maybe if I made it bigger there'd be room for them. Zooming didn't do anything. That's
three dead ends. I'll stop."

### 12. End

`--end $S`

## Grace, afterward

**Did I finish?** Mostly, not fully. Names went onto the drawing: the app says 115 labels, but 14
of them are hidden on purpose and I could not find any way to make every team show, which is what
I was asked to do. I also could not tell which 14 were missing.

**How hard was it (1 = very easy, 7 = very hard):** 4. Getting most of the names on was about four
clicks once I found it. The hard parts were finding it and the last 14.

**What confused me:**

- The first "Style" tab I opened had nothing about the dots -- only background, "Method" and
  "Seed". I only found the names by guessing that I had to click "Everything" on the left first.
  Nothing told me that.
- When I added a label I had to choose between "id", "label" and "value" with no example of what
  each contains. I guessed "label" was the team name. A peek at a value ("Georgia Tech") would have
  made it obvious.
- "14 hidden to avoid overlap" told me there was a problem but not what to do about it. No link,
  no tooltip, no "show all", and the "Aa" and "Abc label" buttons only changed position and
  attribute.
- Zooming the drawing with the wheel did nothing that I could see.
- The names are very small and pile on top of each other. I could not put this on a slide for the
  board as it is; I would want a text size control near the label.
- Team names run together with no spaces ("NewMexicoState", "GeorgiaTech"); that is the data, but it
  looks odd to a reader.
- Good: "Files are read on this computer and never uploaded" and "Local only" were right where I
  look first, and the 115 count matched what the sample promised.
