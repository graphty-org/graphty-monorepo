# Session r3-s16 -- Grace (nonprofit operations analyst), task T10 B (College football)

Task as given: practice on the ready-made network of American college football teams that comes
with the program. No names are written on the drawing right now. Get every team's name written
next to its dot.

Start: empty. Build under study: commit f108a235091e81cd23687ecc4c0b2370490a6498, graphty@0.8.53.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s16 empty` -> 01.png

Saw: a start page. Left: "Open project or file...", "New from data...", "Files are read on this
computer and never uploaded" (good -- I look for that). Middle: Recent projects (empty). Right:
Samples, including "College football -- 115 teams". At the bottom a box asking to share usage data.

Next: I'll say "No thanks" to the usage box first, then open the College football sample.

## Step 2 -- decline usage data, open the sample

Command: `--step ... --click "No thanks" --click "College football"` -> 02.png

Saw: a drawing of 115 blue dots joined by gray lines, no names anywhere. Right side says
"Nodes 115, Edges 613" -- good, 115 teams matches the sample card. Right panel has two tabs,
"Style" and "Values" (Values is selected). Bottom toolbar has four icons (a flask, a chart, "3D",
a magnifier) that don't say what they do.

Thinking: names on the dots sounds like how the drawing looks, so "Style" is my best guess.

Next: click "Style".

## Step 3 -- Style tab

Command: `--step ... --click "Style"` -> 03.png

Saw: Style tab for "Graph": Canvas background color, then "Method: Force - Recommended", Shape
3D/2D, Spring length, Gravity, Advanced. That's about the arrangement, nothing about names or
the dots themselves. Hesitated here -- I expected something like "Labels" or "Show names".

On the left there's "Selection" and "Everything". "Everything" might mean all the dots.

Next: click "Everything" and see if the right side changes to the dots' look.

## Step 4 -- Everything

Command: `--step ... --click "Everything"` -> 04.png

Saw: right panel now says "Everything", Style tab, Nodes/Edges switch (Nodes picked). Fill color,
Shape (Size 1, Icosphere -- whatever that is), Effects +, **Label +**, Tooltip +. "Label" is the
word I wanted.

Next: click the + beside "Label".

## Step 5 -- the + beside Label

Command: `--step ... --click-at 1419,362` (tool: button "Add label line") -> 05.png

Saw: a small "Label" box popped up: "Find an attribute", and a list: id, label, value. Hesitated:
none of these says "team name". "id" in my donor database is a number, so I won't pick that.
"label" sounds most like the name. "value" -- no idea what that is.

Next: pick "label".

## Step 6 -- pick "label"

Command: `--step ... --click-at 1115,532` (tool: option "label") -> 06.png

Saw: team names appeared next to the dots -- Georgia Tech, Maryland, Florida, Arizona State,
Stanford... They are written in a squashed way ("GeorgiaTech", "NorthCarolinaState", no spaces)
but they are clearly team names. The panel now has a Label line "Aa Above | Abc label" and under
it, small text: "115 labels, 14 hidden" and a checkbox "Show all labels".

115 is the number of teams, but 14 are hidden, and I was asked for every team. Several names in
the crowded middle are tiny or overlapping.

Next: tick "Show all labels".

## Step 7 -- Show all labels

Command: `--step ... --click "Show all labels"` -> 07.png

Saw: the checkbox is ticked and the small text now says just "115 labels" -- no "hidden" any more.
115 matches the team count on the sample card and in the Values overview, so every team should
have its name. A few more names appeared (San Diego State, Washington, Colorado State...). Some
now sit on top of each other (around Oregon State / Southern Cal, and lower middle near Colorado
State), and at this zoom the small ones are hard to read.

Next: zoom in on the crowded lower middle to check the names there are really separate and readable.

## Step 8 -- zoom in

Command: `--step ... --wheel 720,620,-400` -> 08.png

Saw: the drawing got a little bigger. The names grow with it but are still small, in a thin serif
font, and written without spaces ("NewMexicoState", "SouthernCalifornia"). A few still sit on top
of each other: "SouthernCalifornia" over "OregonState", "Washington" over its neighbor, and two
names near "ColoradoState" and "NewMexicoState". The panel still says "115 labels" with "Show all
labels" ticked. Every dot I look at has a name next to it.

I'm stopping here: the task was to get every team's name written next to its dot, and the program
says all 115 are shown, which matches the 115 teams.

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s16`

## Wrap-up (in character)

**Did I finish?** Yes. Every team's name is written next to its dot: "115 labels" with "Show all
labels" ticked, and 115 is the team count the program gave me on the sample card and in the
overview.

**How easy was it?** 5 out of 7 (somewhat easy).

It took six clicks and one dead end. Once I found "Label" it went smoothly, and I liked that the
program told me "14 hidden" and gave me a checkbox to fix it. That count was exactly what I'd
check against.

**What confused me:**

- Where to start. My first guess was the "Style" tab with the whole graph selected, but that only
  had background color and how the dots are arranged ("Force - Recommended", spring length,
  gravity). Nothing told me that the dots' own look lives under "Everything" on the left. "Everything"
  doesn't sound like a place to click; it sounds like a filter.
- The list of choices for the label: "id", "label", "value". None of them says "name" or "team".
  I guessed "label" because "id" is a number in my donor database. If the teams' names had been
  under "id" I would have been lost. A one-line preview (for example "label -- e.g. Georgia Tech")
  would have saved the guess.
- "Add label line" -- it's a "line"? I only found that wording because the button said it when I
  pointed at it. The + itself has no words.
- After turning on all labels, some names overlap each other and they are small and in a thin
  serif font. For a board slide I'd need to make them bigger and readable; I didn't see a size
  option right next to the label line, only "Aa Above". The names have no spaces in them
  ("NorthCarolinaState"), which looks like it's the data, but it would look odd on a slide.
- Small words I didn't understand along the way: "Icosphere", "Density", "Edges per ...". I
  ignored them.
