# Session: size the Les Miserables nodes by how much the network depends on them -- Gephi holdout

Participant: Dr. Mara Lindqvist (fictional), Gephi user for a decade, played at 1440x900.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on
a character, the bigger that character's dot. Leave the colors as they are."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t09--gephi-holdout/. Every command
was run from design/ui/prototype; the long path prefix of the output file is shortened to
`.../r8-t09--gephi-holdout/` here.

## Steps

**01 (start screen, shots/tasks/r8-t09/01.png).** "Usage-data banner at the bottom. No thanks.
Samples on the right, Les Miserables, 77 characters. Good, I know that one: 77 nodes, 254
edges."

**02.**
`timeout 120 node app-b/study.mjs --try .../r8-t09--gephi-holdout/02.png task:r8-t09 --click "No thanks" --click "Les Miserables"`

"It opens full of someone else's work: PageRank is coloring everything orange to brown, plus
Louvain, shortest paths, watchlists, a folder 'For the report'. 'Depends on most' is betweenness
-- who sits on the shortest paths. In Gephi: Appearance, Nodes, Size, Ranking, Betweenness. And
I must not touch the PageRank color. There's a Betweenness row in 'For the report', switched
off."

**03.** `... --click "Betweenness"`

"Betweenness row: Fill Color yellow to orange, 'Covered by PageRank for Color', hidden. I don't
want its color. There's no Size heading -- Shape, Effects, Label, Tooltip. Size is probably under
Shape, which is an odd place for it."

**04.** `... --click "Betweenness" --click "Shape"`

"Clicking the word Shape does nothing. Dead end one."

**05.** `... --hover "Add shape"` -> nothing on screen is called "Add shape".
`... --hover "Add"` -> tooltip "Add to Shape".

"The plus is 'Add to Shape'."

**06.** `... --click "Add to Shape"`

"A menu: Shape, Size. There it is."

**07.** `... --click "Add to Shape" --click "Size"`

"Size, 1. A constant. I want a ranking. There's a little cylinder icon next to it -- that usually
means 'from data'."

**08-09.** Tried to read the cylinder's tooltip by pointing at it: `--hover "data"` (lit up the
Data place on the left instead), `--hover "column"` (lit up 'Columns: 9 of 9' at the bottom),
`--hover "value"`, `"Size from"`, `"Use"`, `"measure"`, `"Bind"`, `"from data"`, `"Drive"`,
`"Map"` -- none reached it.

"I can't get that icon to tell me what it is. Dead end two."

**10.** `... --click "Size" --click "Size"` (into the size box)

"It's just a number box. No dropdown, no Ranking. Dead end three."

**11-12.** `... --click "Betweenness" --click "Yellow to orange"` (click timed out; the cylinder
appeared next to Color on hover). `--hover "from"` -> tooltip "From Betweenness" on the color
swatch. Then `... --click "Color: Yellow to orange"`.

"The swatch says 'from Betweenness'. So the cylinder ties a property to a column. Clicking the
Betweenness swatch opened a box titled 'Color by PageRank' and the right panel jumped to
PageRank. That is not what I clicked. But at least I see the pattern: Source, Scale, Palette,
Values from. That's my Ranking panel."

**13.** `... --click "Size" --click "measure"` -> nothing changed. "Dead end four."

**14.** `... --click "Betweenness" --click "from Analyze"`

"The 'Measure from Analyze' link opens a statistics list with one-line definitions. This is my
Statistics panel."

**15.** `... --click "Which nodes sit on the most shortest paths"`

"Betweenness, weight 'value (loaded weight)', higher means stronger, and it says betweenness
reads a weight as distance, 1/value. That I respect -- it tells me what it computed. Gephi
doesn't."

**16-17.** `... --click "Run"`, then `--click "Betweenness 2"`

"A new row 'Betweenness 2', still spinning after 'Under a second'. Clicking it doesn't change the
right panel. And now I have two betweenness rows, which is how a reviewer ends up asking which
column the figure used."

**18.** Pointed at the cylinder again with broader names (`--hover "Size "`, `"to"`, `"e"`).
The last one listed every control; the cylinder is called "Size by attribute".

"'Size by attribute'. Gephi's word. Fine. But I had to find it by brute force."

**19.** `... --click "Size" --click "Size by attribute"`

"Source: pick an attribute. nodes: betweenness, degree. Results: PageRank. Notes: Note count.
The lowercase 'betweenness' must be from the file, not computed here. I'd want to know who
computed it and how, but I'll take it."

**20.** `... --click "Size by attribute" --click "betweenness"`

"Size by betweenness, linear, 0.5 to 3 px, fit to data, clamp. That's min/max size in Gephi's
Ranking. But the drawing didn't change -- the row is switched off, 'none visible'."

**21.** `... --click "betweenness" --key Escape --click "Show Betweenness"`

"Eye open now -- tooltip says 'Hide Betweenness'. Every dot is still the same size. The Size box
still says 1, the panel still says 'none visible'. Did Escape throw away the binding?"

**22.** `... --click "Les Miserables" --click "Show Betweenness" --click "Betweenness" --click "Add to Shape" --click "Size" --click "Size by attribute" --click "betweenness"`

"Other order: row on first, then bind size, box left open. Same picture. All dots identical, the
panel still says 'none visible'. And 3 px for the most central character would be invisible on a
projector anyway. I can't tell whether I did it or whether I've been editing a row that doesn't
paint. In Gephi this is thirty seconds. I'm stopping."

## Verdict

- **Succeeded?** No. I set something called 'Size by betweenness' on a row I switched on, but
  the dots never changed size, and the panel kept telling me the row paints nothing. As far as
  the screen shows, I did not do the task. Colors were left alone, at least.
- **Single Ease Question:** 2 out of 7.
- **Would I use this instead of Gephi?** No. I'd stay on Gephi. Two things were genuinely good:
  the statistic told me how it treats edge weight, and the 'Size by' box is a recognizable
  Ranking panel with min and max. But size-by-a-column is the most basic thing in visual network
  analysis, and here it sits under 'Shape', behind an unlabeled cylinder, on a row that was
  switched off and covered by another row, and when I finished it the drawing did not change.

## Problems observed

1. Size lives under the 'Shape' heading, and clicking the heading does nothing; only its plus
   ('Add to Shape') reveals Size.
2. The 'Size by attribute' control is an unlabeled cylinder icon; found only by brute force.
3. The new Size starts as a constant (1) with no sign that it can follow a column.
4. Clicking the Betweenness row's color swatch opened 'Color by PageRank' and switched the
   inspector to PageRank.
5. After binding size to betweenness and showing the row, the drawing did not change and the
   inspector still said 'none visible'; no feedback that the binding took effect.
6. Default size range 0.5 to 3 px is too small to read.
7. Running Betweenness from Analyze made a second 'Betweenness 2' row that stayed spinning, and
   the lowercase 'betweenness' file column is not explained as file data versus computed.
8. The sample opens with many pre-made rows; the one I needed was buried, hidden and covered.
