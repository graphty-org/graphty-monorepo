# Session: size dots by how much the network depends on each character

Participant: the nonprofit operations analyst (Grace), first-time user.
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on
a character, the bigger that character's dot. Leave the colors as they are."

Outcome: gave up. No dot ever changed size. Colors were left alone.
Single Ease Question: 2 of 7.

All commands were run from design/ui/prototype. `D` is
tmp/round-8-sessions/r8-t09--nonprofit-operations-analyst (absolute path used in the real runs).
Every run started with `timeout 120 node app-b/study.mjs --try $D/NN.png task:r8-t09`, followed by the steps listed.

## Steps, thinking aloud

**01 (start screen, shots/tasks/r8-t09/01.png).** "There's a big box at the bottom asking about my
usage data. No thanks. On the right under Samples is Les Miserables, 77 characters. The
description says 'who holds the story together', which sounds like what I'm after. And good, it
says files are read on this computer and never uploaded."

**02** `--click "No thanks" --click "Les Miserables"`
"Wow, that's a lot. The list on the left has PageRank, Louvain, Shortest paths, Density, Link
prediction, Top 9 by de..., Watchlist, For the report, Betweenness. I don't know what most of these
are. The dots are all orange-to-brown and all the same size. The box at the top says 'Color:
PageRank'. On the right, PageRank has Fill, Shape, Effects, Label, Tooltip. Size is probably under
Shape."

**03** `... --click "Shape"`
"I clicked the word Shape. Nothing happened."

**04** `... --click "Add Shape"` -> "nothing on screen is called 'Add Shape'"; `--click "+"` -> nothing;
`--click "Add"` (the tool found 'Add to Shape', 'Add to Effects', and so on, and used the first)
"So the little plus next to Shape is the button. It drops down 'Shape' and 'Size'. Size! That's
it."

**05** `... --click "Add to Shape" --click "Size"`
"Now there's a Size box with '1' in it, and a little cylinder icon, and a minus. A 1 would make
everyone the same size. I need it to come from something."

**06-07** `--hover "Size"` (no tooltip). `--hover` "column", "data", "value" (no tooltip). Then
`--click "column"`, which opened a 'Columns' list over the table at the bottom, and the right side
switched to the whole graph.
"Oops, that wasn't it. Now I'm somewhere else completely and my Size line is gone from the right."

(Several more `--hover` tries on the cylinder: "Use a column", "From data", "Size from", "Link",
"Map", "measure", "Bind", "Remove", "Set", "Drive", "attribute", "field". Its tooltip turned out
to be "Size by attribute". "Link" showed a tooltip on something unrelated.)
"If I'd just put my mouse on it I'd have seen 'Size by attribute'. 'Attribute' isn't my word. I'd
say 'column'."

**08** `... --click "Add to Shape" --click "Size" --click "Size by attribute"`
"A list: betweenness, degree, 'Not a number (2)', then under Results, PageRank, and under Notes, Note
count. None of them says 'depends on' or 'most connected'."

**09** `... --hover "betweenness"` (no tooltip)
"No explanation. I've heard of PageRank, it's Google's way of ranking what matters most. And it's
the row I'm already on, the one doing the colors. I'll take that."

**10** `... --click "PageRank, Results"`
"The box now says 'Size by PageRank': Scale Linear, Sizes 0.5 to 3 px, Values from 'Fit to data /
Percentiles / Typed', Clamp, 'Below 0: Sized by absolute value', 'Smallest mark 2 px, print 1 pt',
and a Detach button. That's a lot of words I don't know. 0.5 to 3 sounds OK. But the dots behind it
look the same."

**11** `... --key Escape`
"I closed it. Nothing changed. Every dot is still the same size, the Size box still says 1, and the
box at the top still only mentions color."

**12** `... --click "Close"` (the X instead of Escape)
"Same. Nothing."

**13** `... --click "Close" --click "Size by attribute"`
"I opened it again and it says 'Pick an attribute'. It forgot what I picked. Did I do something
wrong, or does it just not work?"

**14** `--click "No thanks" --click "Les Miserables" --click "Betweenness"`
"There's a hidden row called Betweenness. Maybe someone already set it up for sizes. No, it's
another coloring, yellow to orange, 'Covered by PageRank for Color'. Turning it on would change the
colors, and I was told not to."

**15** `--hover "Analyze"` -> tooltip "Analyze Shift+A"
**16** `--click "Analyze"`
"Finally there are explanations. PageRank: 'Which nodes are connected to other well-connected
nodes', marked 'Start here'. Betweenness: 'Which nodes sit on the most shortest paths between...'
(cut off). Degree: how many edges each node has. Closeness, Eigenvector... 'Depends on most' could
be any of these. The program says start with PageRank."

**17** `--click "Start here"` (the tool found four 'Start here' badges and used the first, the
PageRank one)
"It's just settings for running PageRank again: Weight, 'Higher means Stronger / Farther /
Capacity', Damping 0.85, 'Run as copy' or 'Update PageRank row'. Nothing about dot size. PageRank
is already worked out, it's what the colors use. My problem is getting the dots to grow, and the
one place that offered that didn't do anything. I'm stopping."

## After the task

**Did I succeed?** No. I found a 'Size' setting and pointed it at PageRank, but the drawing never
changed and the setting forgot my choice when I reopened it. I'm also not sure PageRank is even the
right measure for 'depends on'. The only place that explained the measures was the Analyze box, and
that box doesn't do sizes.

**Ease (1-7):** 2. Finding Size under a plus sign next to 'Shape' was a guess that paid off. Then
'attribute', a cylinder icon, a page of scale settings, and no visible result.

**Would I use this instead of what I use now?** Not yet. Excel and slides are what I have, and
NodeXL if IT would let me install it. I liked that it says my data stays on this computer, and the
Analyze descriptions were the first plain sentences I saw. But I couldn't do something as basic as
'make the important ones bigger', and I couldn't tell whether I'd done it. I'd need a plain 'Size
dots by...' with words like 'most connected' or 'key go-between', and I'd need to see the dots
change the moment I picked one.
