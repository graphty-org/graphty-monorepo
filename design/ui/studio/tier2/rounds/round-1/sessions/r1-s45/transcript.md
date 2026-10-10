# Session r1-s45 -- Jordan (returning marketing network analyst), task T22, dataset A (bus stops)

Build: frozen build named on the first line of tier2/criteria.md (946256efb876).

## Start

Command: `REAL_DIST=<frozen build> tool/with-browser.sh node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s45 setup:bus-stops-ranked.txt`

01.png: bus-stops.csv is open. Left: Selection, PageRank (10), Everything. The right panel shows
the PageRank layer's Style with Nodes and Edges toggles. Drawing of 10 stops with arrows.

## Steps

### Step 1

Thinking (as Jordan): "OK, the colleague's bus file, already ranked. I need the links of 10 minutes
or more to pop. Normally I'd color from the Style tab of Everything -- let me go there and look at
Edges, maybe I can color links by the minutes."
Command: `--step <session> --click Everything`
Result 02.png: Everything's Style tab. Nodes is chosen; Fill color 6366F1, size 1, Icosphere. There
is an Edges toggle.

### Step 2

Thinking: "There's Edges next to Nodes. The links are what I care about, so switch to Edges."
Command: `--step <session> --click Edges`
Result 03.png: Edges style: Line color A9A9A9, width 8, Pattern Solid, Arrows and Label with plus
buttons. A little chain-link icon sits beside Color and Width.

### Step 3

Thinking: "That chain icon is how I colored by group last time -- it ties a color to a column.
Let me click the one next to Color and see if 'minutes' is offered."
Command: `--step <session> --click-at 1381,191`
Result 04.png: a "Color by attribute" popover with one attribute: minutes.

### Step 4

Thinking: "minutes -- good. A gradient isn't exactly 'the slow ones stand out', but let's see what
it gives me; maybe there's a cutoff."
Command: `--step <session> --click minutes`
Result 05.png: links are now shades of orange, legend "Edge color: Everything, 2 to 15". Every link
is some orange, so I can't tell a 9 from a 10 -- this does not make the slow ones stand out. (Odd: the
key says "Everything", not "minutes".) The Color box now reads "min..." with a small icon beside it.

### Step 5

Thinking: "A ramp isn't what my colleague wants. Maybe the 'min...' box opens settings where I can
set a cutoff at 10."
Command: `--step <session> --click-at 1334,174`
Result 06.png: "Color from data" popover: Source minutes, Scale Linear, Palette Orange to brown,
Reverse, Values from the data (checked), No value: Leave as is, Detach.

### Step 6

Thinking: "Scale: Linear. Maybe there's a 'steps' or 'cutoff' scale in there that would split at 10."
Command: `--step <session> --click Linear`
Result: the tool said nothing is called "Linear" (it is a select box showing that value). 07.png.
Command: `--step <session> --click-at 1180,276`
Result 08.png: Scale choices: Linear, Logarithmic, Negative logarithmic, Square root, Power, Equal
bins, Quantiles, One color per value, As written. Nothing like "a cutoff" or "above a number". And
even if I bent "Equal bins" into it, it would not tell me how many links there are.

### Step 7

Thinking: "None of these is '10 and up'. Close this. The find box says 'Find nodes, edges, values' --
values! I usually type a name there; maybe I can ask it about minutes."
Command: `--step <session> --key Escape --click "Find nodes, edges, values" --type "minutes"`
Result 09.png: "No match for "minutes"". No hint of what else I could type.

### Step 8

Thinking: "It searches values, not column names. I write SQL at work -- let me just try the obvious
thing and see if it understands a condition."
Command: `--step <session> --key Control+a --type "minutes >= 10"`
Result 10.png: "No match for "minutes >= 10"". Nothing to say it understood a condition or how to
write one.

### Step 9

Thinking: "Maybe it needs Enter to run it."
Command: `--step <session> --key Enter`
Result 11.png: unchanged, still "No match". The find box does not do conditions, as far as I can tell.

### Step 10

Thinking: "Fine, back to basics: the Values tab of Everything should list the links with their
minutes. At least I can count the 10-and-ups myself. Clear the search first."
Command: `--step <session> --key Escape --click Values`
Result 12.png: Values only has a Summary: "Covers every node and edge: 10 nodes, 17 edges." No list.

### Step 11

Thinking: "17 links. There's a Data button on the left rail -- a table of the links would let me at
least read the minutes."
Command: `--step <session> --click Data`
Result 13.png: Data place: source bus-stops.csv (10 nodes, 17 edges), Filters (+), Attributes: Nodes
id, Edges minutes. "Filters" would take links away, and I was told not to remove anything.

### Step 12

Thinking: "There's 'minutes' under Edges. Clicking it may show me its values or offer something to do
with it."
Command: `--step <session> --click minutes`
Result 14.png: minutes attribute summary: Table Edges, Kind Amount, From the file, 100% have a value,
10 distinct values, Range 2 to 15. No list of values, no count above a number.

### Step 13

Thinking: "There's a '...' menu top right of this panel. Maybe it has something like 'select
where' or 'show values'."
Command: `--step <session> --click-at 1419,74`
Result 15.png: menu: "Filter to..." and "Show in table". Filter sounds like it hides the others,
which I was told not to do.

### Step 14

Thinking: "Show in table -- at least I can sort by minutes and count."
Command: `--step <session> --click "Show in table"`
Result 16.png: a table opened under the drawing: Edges, 17 edges, "In the order loaded", columns
From, To, minutes. Only 4 rows fit on screen.

### Step 15

Thinking: "Sort by minutes, biggest first, then count down to 10."
Command: `--step <session> --click-at 1145,742`
Result 17.png: "Sorted by minutes, highest first": Depot-Station 15, Station-Harbor 14,
School-Harbor 12, then Depot-School 9. So 3 links take 10 minutes or more. I have the count -- by
reading a table, not by the program telling me.

### Step 16

Thinking: "Now make those three stand out on the map. Maybe picking rows in the table marks them on
the drawing. Click the first, shift-click the third."
Command: `--step <session> --click-at 340,775 --shift-click-at 340,841` (shift-click-at may not exist; see result)
Result 18.png: Depot -> Station is selected in the table and drawn thick blue on the map; right panel
shows that edge (minutes 15). That's the kind of "stand out" I want -- now for all three.

### Step 17

Thinking: "Shift-click the third row (School-Harbor, 12) to take all three, like in a spreadsheet."
Command: `--step <session> --shift-click-at 340,841`
Result: the study tool has no shift-click at a point (tool limitation, not the app). Retrying by
name: the "12" cell is unique.
Command: `--step <session> --shift-click "12"`
Result 19.png: "3 edges selected": School -> Harbor, Depot -> Station, Station -> Harbor, all thick
blue on the map; the rest of the network is still drawn. Side effect: the shift-click also
text-highlighted the words in the table cells, like a web page selection.

### Step 18

Thinking: "That's it on screen. But a selection disappears the moment someone clicks elsewhere. My
colleague wants to see them -- can I make it stick? Selection has a Style tab."
Command: `--step <session> --click Style`
Result 20.png: the selection's Style: Line +, Arrows +, Label +.

### Step 19

Thinking: "Add a Line style for these three -- a bold color that stays put."
Command: `--step <session> --click-at 1419,136`
Result 21.png: menu: Color, Width, Opacity, Pattern, Curved.

### Step 20

Thinking: "Color first."
Command: `--step <session> --click Color`
Result 22.png: a new layer "3 edges" was made; its edge Color starts at A9A9A9 (gray) -- a gray that
would make my slow links duller than the orange ones, the opposite of standing out. The key now has
"Edge color: 3 edges". The selection blue still covers the lines.

### Step 21

Thinking: "Gray is no good. Type a strong blue-ish red... say bright red FF0000."
Command: `--step <session> --click-at 1265,191 --key Control+a --type "FF0000" --key Enter`
Result 23.png: the layer color is FF0000; the key shows "Edge color: 3 edges" in red. The three
lines show a thin red core inside the blue selection outline. Red next to orange isn't much
contrast; for a deck I want them fatter too.

### Step 22

Thinking: "Add Width to this layer and make it thick."
Command: `--step <session> --click-at 1419,144 --click Width`
Result 24.png: Width added at 8, which is what every link already had -- no change. No hint of what
the numbers mean (pixels? something else?).

### Step 23

Thinking: "Make it much bigger -- try 30."
Command: `--step <session> --click-at 1334,226 --key Control+a --type "30" --key Enter`
Result 25.png: odd. The blue selection band around the three lines got huge (a fat blue ribbon), but
the red line inside it is still fairly thin. I can't tell what the link itself will look like while
it's selected.

### Step 24

Thinking: "Click an empty spot on the map to drop the selection and see what my colleague will
actually see."
Command: `--step <session> --click-at 1050,300`
Result 26.png: selection dropped. The three slow links (Depot-Station 15, Station-Harbor 14,
School-Harbor 12) are now thick red lines; all 10 stops and the other 14 links are still drawn in
orange. The key reads "Edge color: 3 edges" with a red swatch. Right panel shows the graph overview
(10 nodes, 17 edges).

Thinking: "Done. Three links take 10 minutes or more, and they're marked in red on the full map."

Command: `--end <session>`

## End of session (in character)

**Finished?** Yes. My answer: 3 links take 10 minutes or more -- Depot to Station (15), Station to
Harbor (14), School to Harbor (12) -- and they are drawn thick red, with nothing removed from the map.

**Ease: 3 of 7.** I got there, but by a back road: I counted the rows myself in a sorted table and
hand-picked them, then styled the picked set. That works on 17 links. On my real files with
thousands of links, reading a table and shift-clicking is not a method.

**What confused me or slowed me down:**

- I never found a way to say "minutes 10 or more" to the program. The find box says it searches
  "values", so I typed `minutes` and then `minutes >= 10` -- both just said "No match", with no hint
  that conditions can be written there, or how. If there is a way, nothing on screen told me.
- Coloring by minutes from the Style tab gave a smooth orange ramp (2 to 15). Every link is some
  orange, so the 9-minute and 10-minute links look the same. None of the Scale choices (Linear,
  Logarithmic, Equal bins, Quantiles, ...) lets me set a cutoff at 10, and none gives a count.
- The map key for that ramp said "Edge color: Everything" instead of "minutes", so a reader of the
  picture would not know what the colors mean.
- The attribute's summary in Data told me the range (2 to 15) and distinct values (10) but not how
  many links are above a number; its menu offered only "Filter to..." (which I took to mean hiding
  the rest, which I was told not to do) and "Show in table".
- When I added a color for the selected links, it started as gray (A9A9A9) -- duller than the other
  links, the opposite of what you add a color for.
- The new width started at 8, the same as every link, so adding it changed nothing until I typed a
  bigger number; I had no idea what units the number is in.
- While the links were selected, raising the width blew up the blue selection band into fat ribbons
  and hid what the line itself would look like; I had to deselect to see the real result.
- Shift-clicking table rows also highlighted the text in the cells, like selecting text on a web
  page.
- The key now says "3 edges" for my red links, not "10 minutes or more"; I'd have to rename it
  before this goes in a deck, and I didn't see where.
- (Study tool, not the app: the driving tool had no shift-click at a point, so I shift-clicked the
  "12" cell by its text.)
