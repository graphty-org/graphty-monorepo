# Session r1-s08 -- Jordan (marketing network analyst), friends.csv

Task: a first sitting with my own file, friends.csv (who in the running club knows whom). Get it
on screen, have the program work out who matters most, make the dots bigger for the people who
matter more, put everyone's name on the drawing, and finish with a picture file, with its key,
for a document.

Every command was run from `design/ui/studio` as
`node tool/real.mjs <command> rounds/round-1/sessions/r1-s08 <steps>`.

## Step by step

### 01 -- start: `--start ... empty`

What I saw: a start page with "Open project or file...", "New from data...", "or drop a file
anywhere in this window", four samples on the right, and a usage-data banner at the bottom.

Thinking aloud: "First thing I look for is whether my data leaves the laptop. Top right says
'Local only', and under the open button: 'Files are read on this computer and never uploaded.'
Good, that answers it before I even ask. That banner wants usage data -- no thanks. I'm not
here for the samples, I've got my own file."

### 02 -- `--step --click "No thanks" --click "Open project or file" --upload friends.csv`

What I saw: the graph drawn straight away -- 20 blue balls, arrows between them, no names. On
the right, an Overview: Nodes 20, Edges 41, Directed, Density 0.1079, Components 1, Edges per
node 3 to 6, mean 4.1. Bottom toolbar with five icons; a hint at the bottom left: "Analyze
(Shift+A) to add results here".

Thinking aloud: "OK, that opened on the first try, no schema questions. Not a hairball, it's
small. But no names on anything, so I can't check anyone I know yet. Which of these little
icons does the analysis? The hint says Analyze -- the flask, probably."

### 03 -- `--step --click-at 659,864` (the flask)

Printed: `button "Analyze"`. What I saw: a list headed "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz,
HITS, All-pairs distance, and more below. Each has a one-line plain description.

Thinking aloud: "It's algorithm names, not 'find influencers', but at least each one has a
sentence under it. PageRank says 'Start here'. Hmm. In a club, the people I care about are the
ones sitting between the groups -- that's betweenness, 'which nodes sit on the most shortest
paths between others.' I'll take that over the suggested one."

Hesitation: a few seconds deciding between the "Start here" tag and what I actually wanted.

### 04 -- `--step --click "Betweenness"`

What I saw: a small card -- the description again, "Under a second", and a Run button.

Thinking aloud: "It tells me how long it'll take. Nice. Run."

### 05 -- `--step --click "Run"`

What I saw: every ball turned orange, two of them dark brown. A key appeared top left of the
drawing: "Color: Bridges", 2.583 to 51.27. A row "Bridges 20" appeared in the left list.

Thinking aloud: "It's called 'Bridges' now, which is actually my word for it. Fine. It colored
everything without me asking. The oranges are all very close, though -- on a projector or
printed in gray I'd only see 'two dark ones and the rest'. The 'matters most' part is done:
the dark ones are the bridges. But I still don't know who they are."

### 06 -- `--step --click "Bridges"`

What I saw: the right panel switched to the result: a Values strip (2.583 to 51.27, "20 of 20
have a value, median 11.2") and a Top 10 list with names: Ava 51.27, Ivan 40.02, Sana 21.35,
Kofi 18.31, Jada 16.1, Theo 15.71, Ravi 14.28, Lena 13.37, Quinn 12.55,
