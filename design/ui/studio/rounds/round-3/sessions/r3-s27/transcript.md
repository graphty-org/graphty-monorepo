# Session r3-s27 -- Ruth (reporter), T9 prompt B (Florentine families)

Task: "You have never used this program before. You will practice on the ready-made network of the
leading families of Renaissance Florence and the marriages between them that comes with the
program, not on your own data. Make the drawing show which families the network depends on most:
the more it depends on a family, the bigger that family's dot. Then tell us what the sizes and the
colors on the drawing now stand for."

Start: empty.

## Step 0 -- start

Command: `node tool/real.mjs --start <session> empty`
Saw (01.png): a start page. Start: "Open project or file...", "New from data...". Recent projects
empty. Samples list on the right including "Florentine families -- 15 families -- Marriages between
the leading families of Renaissance Florence. Good for finding who brokers between groups." A banner
at the bottom asks to share usage data. The lock and "Local only" up top reassure me.

## Step 1

Ruth: "I'm not sharing anything about my usage -- No thanks. Then I'll open the Florentine
families sample, which is exactly what they told me to use."
Command: `--step --click "No thanks" --click "Florentine families"`
Saw (02.png): a drawing of 15 blue dots joined by gray lines, no names on any of them, all about
the same size. On the right, "Graph / Values / Overview": Nodes 15, Edges 20, Density 0.1905,
Components 1, "Edges per n... 1 to 6, mean 2.667". Left: a find box, "Selection", "Everything",
and at the bottom a hint: "Analyze (flask icon) in the toolbar (Shift+A) to add results here".
Hesitation: no family names on the dots bothers me -- I can't tell who is who. But the hint tells
me where analysis lives.

## Step 2

Ruth: "The hint says the flask in the toolbar is where you analyze. 'Which families the network
depends on most' sounds like an analysis, so I'll click the flask."
Command: `--step --click-at 679,864`
Saw (03.png): a list "Rank nodes and edges": Degree, Betweenness ("Which nodes sit on the most
shortest paths between others"), Edge betweenness, Closeness, PageRank with a "Start here" tag,
Eigenvector, Katz, HITS, All-pairs distance, and grayed ones further down.
Hesitation: "Start here" on PageRank pulls me, but "connected to other well-connected nodes"
isn't what "depends on" means to me. A network depends on whoever sits on the paths between
everyone else -- take them out and the chains break. That is Betweenness, and the sample's own
description said "good for finding who brokers between groups".

## Step 3

Ruth: "Betweenness -- the ones sitting in the middle of the chains. That's what 'depends on' means."
Command: `--step --click "Betweenness"`
Saw (04.png): a small card "Betweenness -- Which nodes sit on the most shortest paths between
others", a collapsed "Advanced", "Under a second", and a blue Run button.

## Step 4

Ruth: "Under a second, fine. I'll leave Advanced alone and press Run."
Command: `--step --click "Run"`
Saw (05.png): all dots turned shades of orange to dark brown. A key top-left: "Color: Betweenness
0 -- 47.5". One dot near the middle is almost black-brown -- the darkest, so presumably 47.5.
The left list now has a row "Betweenness 15". The dots are still all the same size, which is what
the task asks me to change. The key box also covers the top-left dot I saw before.
Hesitation: the colors are done for me, but nothing about size. Where do I tell it "bigger"?

## Step 5

Ruth: "The new 'Betweenness' row on the left is the result. I'll click it and see if it offers to
use it for size."
Command: `--step --click "Betweenness"`
Saw (06.png): the row is highlighted, and the right panel changed to "Betweenness -- Measure from
Betweenness, Oct 7", with Style selected, Nodes/Edges, then "Fill: Color = Betweenn..." and
"Shape +", "Effects +", "Label +", "Tooltip +". No word "Size" anywhere.
Hesitation: size isn't listed. Of these, "Shape" is the closest guess -- a dot's size is part of
its shape, I suppose. "Effects" might also be it but sounds like glow.

## Step 6

Ruth: "No 'Size'. I'll try the plus next to Shape and hope size lives there."
Command: `--step --click-at 1419,234`
Saw (07.png): a small menu with "Size" and "Shape". Good guess.

## Step 7

Ruth: "There it is -- Size."
Command: `--step --click "Size"`
Saw (08.png): a box "Size by attribute": a find box, "Fixed size", then under "Betweenness":
"Betweenness", "Betweenness rank", "Betweenness percentile"; grayed out "id" and "name" under
"Cannot be used: Holds groups, not amounts". Clear enough.
Hesitation: rank vs plain value -- I want the plain number so it matches the color key (0 to 47.5).

## Step 8

Ruth: "Plain Betweenness, same as the color, so the two agree."
Command: `--step --click "Betweenness#2"` (the first is the left-panel row behind)
Actual command run: `--step --click "Betweenness"` -- the tool said "ambiguous: matches 5 controls
... took the first" (the left-panel row), so my pick missed. This is a driving slip, not something
a real person pointing at the option would do; I will redo it.
Saw (09.png): the list box closed. A new row "Size [1] (link icon) -" now sits under Shape. The dots
are unchanged in size.

## Step 9

Ruth: "The little chain-link button beside the size box is what opened that 'Size by attribute'
list, I think. I'll click it and pick Betweenness again."
Command: `--step --click-at 1380,264`
Saw (10.png): the same "Size by attribute" list reopened.

## Step 10

Ruth: "Betweenness, the plain one."
Command: `--step --click "role=option:Betweenness"`
Saw (11.png): now the dots differ in size. One big dark dot in the middle, two more fairly big
ones (right of center and lower right), the rest small. The key top-left now has two bars:
"Size: Betweenness 0 -- 47.5" (a gray wedge) and "Color: Betweenness 0 -- 47.5". The Size box on
the right reads "1 to 3". So size and color both say the same thing: betweenness.
Hesitation: I still don't know WHICH family is the big dot. No names on the drawing. And what
does 47.5 count -- 47.5 of what? I'd have to explain that to an editor.

## Step 11

Ruth: "Who is the big one? I'll hover over it and see if it tells me."
Command: `--step --hover-at 700,378`
Saw (12.png): nothing appeared on hover -- no tooltip, no name. (The tool privately reports the
dot's id; Ruth sees nothing on screen.)
Hesitation: mildly annoying; I expected a name on hover.

## Step 12

Ruth: "Hovering does nothing. I'll click the big dot."
Command: `--step --click-at 700,378`
Saw (13.png): the big dot got a yellow ring, and the right panel says "Medici -- Node", Summary:
id Medici, name Medici, Results: "Betweenness 47.5, #1 of 15", "Degree 6". So the Medici are the
family the network depends on most, and 47.5 is the top of the key. "#1 of 15" is exactly the kind
of line I can say to an editor.
Hesitation: I still can't say in plain words what "47.5" is a count of. The analysis card earlier
said "sit on the most shortest paths between others", so I'll take it as roughly "how many of the
shortest chains between other families go through this one". There was no unit or explanation
next to the number itself.

## Step 13

Ruth: "Let me check the second-biggest dot, so I can rank at least the top two."
Command: `--step --click-at 825,365`
Saw (14.png): "Guadagni -- Betweenness 23.17, #2 of 15, Degree 4". Medici went back to its dark
brown, biggest. While a dot is selected its color turns yellow-gold under the ring, so I can't
read its color against the key while it's picked -- minor.
I'm done: the drawing shows what I was asked for.

## End

Command: `--end`

## Debrief (in character)

**Did I finish?** Yes. The dots are now sized by Betweenness, and colored by Betweenness too.

**What the sizes and colors stand for:** both stand for the same thing, "Betweenness" -- how
often a family sits on the shortest chain of marriages between two other families. The bigger
and darker the dot, the more the network runs through that family. The key says both run from 0
to 47.5. The Medici are the biggest and darkest (47.5, #1 of 15); the Guadagni are second (23.17,
#2 of 15).

**Ease: 5 of 7.** Getting a result was quick: the hint at the bottom left pointed me to the flask,
the list of analyses had one-line descriptions, and after Run the colors appeared by themselves
with a key. Getting the sizes took a guess: nothing says "Size" until you open the plus beside
"Shape".

**What confused or slowed me:**

- "Size" is hidden under "Shape". I only found it by trying the closest-sounding plus button.
- "PageRank -- Start here" pulled me away from what "depends on" means; I had to choose between
  PageRank and Betweenness on my own reading of one-line descriptions.
- No family names on the dots, and hovering a dot shows nothing. I had to click each dot to learn
  who it is. For an editor's picture I'd need names on it.
- I can't say what 47.5 is a count of. The number has no unit or explanation next to it; I'm
  relying on the one-line description I saw before pressing Run. I'd want "how is this counted"
  one click away from the number.
- The key box in the top-left corner sits on top of a dot (the one I saw there before the
  analysis), so that family's size and color are hidden.
- A selected dot turns gold, so its color can't be read against the key while it's selected.
- Both size and color say the same thing; fine for this task, but the key doesn't say which
  families are at either end.

Tool note (not the participant): one step missed because `--click "Betweenness"` matched five
controls and took the left-panel row instead of the list option; redone with
`role=option:Betweenness`.
