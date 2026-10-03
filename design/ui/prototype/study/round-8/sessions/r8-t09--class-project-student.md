# Session: size the Les Miserables dots by how much the network depends on each character

Participant: the student with a class project (Dev), first time in the app.

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on
a character, the bigger that character's dot. Leave the colors as they are."

Outcome: gave up. Every dot was still the same size at the end. Colors were never changed.
Single Ease Question: 2 of 7.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t09--class-project-student/. `S` below stands for
`timeout 120 node app-b/study.mjs --try <render> task:r8-t09`.

## Steps, thinking aloud

**01 (start screen, shots/tasks/r8-t09/01.png).** "I read everything. There's a pop-up asking about
usage data; no thanks. Samples on the right: Les Miserables, '77 characters'. 'Who holds the
story together' sounds like my assignment. Click it."

**02** `S 02.png --click "No thanks" --click "Les Miserables"`
"Whoa, it's already full of stuff: PageRank, Louvain, Shortest paths, Density, a folder 'For the
report'... All the dots are orange because of PageRank. At the bottom of the list is
'Betweenness', which is the word from my tutorial ('Betweenness centrality' finds the connectors,
the people the network depends on). Its eye has a line through it, so it's turned off."

**03** `S 03.png ... --click "Betweenness"`
"The right side now shows Betweenness. It colors 'Yellow to orange' but says 'Covered by
PageRank for Color'. There's a 'Move above' button, but that would probably make everything
yellow, and I'm told to leave the colors. I want SIZE. There's no Size row, only Shape, Effects,
Label, Tooltip. Size is sort of shape? Try Shape."

**04** `S 04.png ... --click "Shape"` -- nothing happened.

**05, 06** `--hover "Add Shape"` -> "nothing on screen is called Add Shape";
`--click "+"` -> "nothing on screen is called +".
"I can't figure out what that little plus is called. Two tries and nothing."

**07** `--hover "Add"` -> tooltip "Add to Shape".

**08** `S 08.png ... --click "Add to Shape"`
"A little menu: Shape, Size. So Size WAS hiding under Shape. I'd never have guessed that."

**09** `... --click "Size"`
"Now Size = 1 in a box. One number for every dot is not what I want. Next to it is a
stack-of-disks icon. Database? Maybe 'use the data'."

**10-15** Trying to find out what the icon is: `--hover "data"` (hit the Data tab instead),
`"column"` (hit 'Columns: 9 of 9' at the bottom), `"value"`, `"measure"`, `"from data"`, `"Use"`,
`"Bind"`, `"Size"`, `"from"` (got the color chip, tooltip 'From Betweenness'), `"Link"` (got a
tooltip about names that cannot be changed), `"Map"`, `"Vary"`, `"Fixed"`, `"Switch"`, `"Set"`,
and finally `"attribute"` -> tooltip "Size by attribute".
"Ugh. That took forever. 'Attribute' is the Gephi word, so OK."

**16** `... --click "Size by attribute"`
"A popup 'Size by attribute' with a list: nodes > betweenness, degree; Results > PageRank;
Notes > Note count. Pick betweenness."

**17** `... --click "betweenness"`
"'Size by betweenness', Linear, Sizes 0.5 to 3 px, Values from 'Fit to data / Percentiles /
Typed', Clamp, 'Below 0', 'Smallest mark 2 px print 1 pt', Detach. I don't know what most of that
means, so I leave it. But the dots look EXACTLY the same."

**18** `... --key Escape`
"Popup closed. Same dots. And the Size box says '1' again. Did it forget my choice? The panel
says 'Paints 77 nodes, none visible'. Oh, it's because the row is hidden (the slashed eye)."

**19** `--hover "Show"` -> tooltip "Show Betweenness  Alt-click or Alt+Space: show only this row".

**20** `... --key Escape --click "Show Betweenness"`
"Eye is open now (hover says 'Hide Betweenness'). Still no change. Still 'none visible'. Size
still '1'."

**21** `S 21.png ... --click "Betweenness" --click "Show Betweenness" --click "Add to Shape"
--click "Size" --click "Size by attribute" --click "betweenness"`
"Redid it, turning the row on first and not pressing Escape. Popup says Size by betweenness.
Drawing: same."

**22** `... --click "Close"` -- "Closed with the X. Same dots, Size box says '1', 'none visible'."

**23** `S 23.png --click "No thanks" --click "Les Miserables" --hover "Analyze"`
"New idea: the flask in the bottom toolbar might be Gephi's 'Statistics'." Tooltip:
"Analyze Shift+A".

**24** `--click "Analyze"`
"A list. PageRank has a 'Start here' tag. Betweenness: 'Which nodes sit on the most shortest
paths between others.' That's the connectors. My tutorial says betweenness, so I take that."

**25** `--click "Which nodes sit on the most shortest paths"`
"Weight, 'Higher means: Stronger / Farther / Capacity', 'Betweenness reads a weight as
distance: it uses 1/value.' No idea; leave the default. Run."

**26** `--click "Run"`
"A new row, 'Betweenness 2', at the top with a loading bar. So there already was one and now
I've got two?"

**27** `--click "Betweenness 2"`
"Still spinning; the right panel didn't even switch to it. All dots still the same size."

Stopped here.

## After the session

**Did you succeed?** "No. I tried two different ways and the drawing never changed. Every dot is
the same size. I'd go ask the TA."

**Single Ease Question (1 = very hard, 7 = very easy):** 2. "I found the right words eventually
(betweenness, size by attribute) but I never saw the dots change, so I don't know if I did it
right or wrong."

**Would you use this instead of your current tool?** "Not for this assignment, not yet. It has
everything my tutorial talks about, and I liked that the sample already had examples in it, and
the Analyze list explaining each measure in a sentence. But in Gephi, Ranking > Size >
Betweenness > Apply makes the dots change right away. Here size was hidden under 'Shape', the
button that does it is an unlabeled icon I only found by guessing, and once I picked betweenness
nothing visible happened and the box went back to '1'. If I can't see the result, I can't put it
in my essay."

## Problems seen, in Dev's words

1. "Size" lives inside a menu behind the "+" next to "Shape". Nothing labeled Size shows until
   you open that menu. "I looked for Size first and there was no Size."
2. The icon that switches Size from a fixed number to data has no visible label. Its tooltip,
   "Size by attribute", only appears when you hover exactly on it. About 15 tries to find it.
3. After picking betweenness as the size source, the drawing did not change, and after closing
   the popup (Escape or the X) the Size box showed "1" again, which looks like the choice was
   thrown away.
4. The panel kept saying "Paints 77 nodes, none visible" even after the row was shown. "What does
   'none visible' mean if the eye is on?"
5. The Betweenness row starts hidden and "Covered by PageRank for Color", so a first-timer has to
   work out layers, covering and the eye before any size change can show at all.
6. Running Betweenness again from Analyze made a second copy, "Betweenness 2", which stayed on a
   loading bar; the right panel did not open it.
7. The size popup is full of terms a student doesn't know: Clamp, Below 0, Percentiles, Typed,
   Smallest mark / print, Detach.

## What Dev liked

- The Les Miserables sample opens with worked examples already present.
- Analyze explains each measure in one plain sentence ("Which nodes sit on the most shortest
  paths between others").
- Tooltips, once found, used words he knew ("Size by attribute", "Show Betweenness").
