# Session r1-s10b -- Elena, names on every dot (Les Miserables)

Participant: Elena, a product manager with no graph training, first time in this app.
Task: "Right now no names are written on the drawing. Get every character's name written next to
its dot." Start: empty app. Tool commands are run from `design/ui/studio`, with
`S=rounds/round-1/sessions/r1-s10b`.

## Steps

### 1. Start

`node tool/real.mjs --start $S empty` -> 01.png

Saw: a start page with Start (Open project or file, New from data), Recent projects (empty) and
Samples on the right: Les Miserables, Zachary's karate club, College football, Florentine
families. A "Your data is yours, but please help us" box at the bottom.

Think-aloud: "There's a box asking about data. No thanks. Les Miserables is right there under
Samples, that's the one I'm supposed to use."

### 2. Open the sample

`--step $S --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: a drawing of blue dots and gray lines, no names. Left panel: a search box, "Selection",
"Everything". Right panel headed "Graph / From Les Miserables" with "Style" and "Values" tabs;
Values was showing (Nodes 77, Edges 254, Density, Components...). A floating toolbar of five icons
at the bottom.

Think-aloud: "Lots of blue dots, no names. Putting names on the dots feels like a look thing, so
Style."

### 3. Style tab

`--step $S --click "Style"` -> 03.png

Saw: Canvas > Background (F5F5F5), then Method (Force - Recommended) and Seed (1). Nothing about
dots or names.

Hesitation: "This Style is about the background and a 'Method'. Nothing about the dots. The panel
says 'Graph' at the top, so maybe it's the whole picture's settings. On the left there's
'Everything' -- maybe if I pick everything I get settings for the dots." (Guess, not obvious.)

### 4. Everything

`--step $S --click "Everything"` -> 04.png

Saw: right panel now headed "Everything", with Nodes / Edges switch and rows Fill (Color),
Shape (Size, Shape: Icosphere), Effects +, Label +, Tooltip +.

Think-aloud: "Now there's Nodes and Edges, and a 'Label' row with a plus. Label must be the name."

### 5. Add a label

`--step $S --click-at 1419,342` (button "Add label line") -> 05.png

Saw: a popup "Find an attribute", list "Attributes": id, name.

Think-aloud: "It wants an 'attribute'. Not my word, but 'name' is right there and I want names."

### 6. Pick name

`--step $S --click-at 1117,472` (option "name") -> 06.png

Saw: names appear above most dots (Blacheville, Myriel, Napoleon, Old Man, Gervais...). Very small
text, the crowded middle is hard to read. Under the label line: "Aa Above Abc name" and a small
gray note "77 labels, 7 hidden to avoid overlap". I could spot dots with no name next to them
(one bottom-middle near 686,583, one left of center near 623,498).

Think-aloud: "Names! Tiny though. Wait, it says 7 are hidden. The task says every character. Maybe
if I zoom into the crowded middle they'll show up."

### 7. Try to zoom

`--step $S --wheel 700,420,-400` -> 07.png

Saw: no change at all. The drawing did not zoom.

Hesitation: "Scrolling did nothing. Odd -- every map I use zooms on scroll."

### 8. Label options

`--step $S --click-at 1220,372` (button "Label position") -> 08.png

Saw: a small 3x3 grid of dots, the top-middle one highlighted. Only where the name sits.

Think-aloud: "That's just where the name goes. Not what I need."

### 9. The "7 hidden" note

`--step $S --key Escape --click-at 1290,397` -> 09.png

Saw: nothing happened; the note is plain text, not a link.

Think-aloud: "It tells me 7 are hidden but gives me no way to show them."

### 10-11. Toolbar, zoom again

`--step $S --hover-at 708,864` -> 10.png, tooltip "Layout"
`--step $S --click-at 708,864 --wheel 650,430,-500` -> 11.png

Saw: a "Layout" popup (Method: Force - Recommended, Seed: 1). The wheel again did not zoom.

Think-aloud: "I thought the arrows were move/zoom. It's 'Layout'. Still can't zoom."

### 12. End

`--step $S --key Escape` -> 12.png; `--end $S`

## In character, at the end

**Did I finish?** Mostly. Names are on 70 of the 77 dots. The app says it hides 7 on purpose
"to avoid overlap", and I found no way to make it show them, so strictly I did not get every
character's name on.

**How hard (1 = very easy, 7 = very hard):** 4. Getting names on was quick once I found it; the
last bit was impossible for me.

**What confused me:**

- Style on the first screen was about the background and a "Method", not the dots. I only found
  the dot settings by guessing that "Everything" on the left would change the right panel.
- "Attribute" is not my word, but the list was short and "name" was obvious.
- "7 hidden to avoid overlap" told me about a problem without offering a fix: no "show all",
  and the note is not clickable.
- Scrolling over the drawing did not zoom, twice, so I could not get closer to the crowded middle
  to read or reveal names.
- The names are very small; on a shared screen most would be unreadable.
- The arrows icon at the bottom looked like "move" but is "Layout".
