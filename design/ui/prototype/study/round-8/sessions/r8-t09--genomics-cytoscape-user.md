# Session: size characters by how much the network depends on them (Maren, genomics Cytoscape user)

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Make the drawing show which characters the network depends on most: the more it
depends on a character, the bigger that character's dot. Leave the colors as they are."

Start screen: shots/tasks/r8-t09/01.png. Renders: tmp/round-8-sessions/r8-t09--genomics-cytoscape-user/NN.png.
All commands were run from design/ui/prototype; `$D` is
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t09--genomics-cytoscape-user.
Each run starts again from the start screen.

## Steps, thinking aloud

### 01 -- start screen
"A start page with samples on the right. Les Miserables, 77 characters. There's a usage-data box at
the bottom; I'll say no, I don't send anything anywhere. 'Files are read on this computer and never
uploaded' -- good, my PI would like that line."

### 02 -- open the sample
`timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t09 --click "No thanks" --click "Les Miserables"`

"OK, a network, flat, 2D, good -- not spinning. But it's already full of stuff: a long list on the
left, PageRank, Louvain, shortest paths, a 'For the report' folder. Everything's orange, and the
box at the top says Color: PageRank. Task says leave the colors, fine. 'Which characters the
network depends on most' -- that's the hubs. Hubs are the ones with the most connections. Degree.
There's a 'Top 9 by de...' row; probably degree, but that's a highlight, not size."

### 03 -- the flask button at the bottom
`timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Analyze"`

"An Analyze menu. PageRank says 'Start here'. Then Degree, Total value, Betweenness, Closeness,
Eigenvector. No MCC -- in cytoHubba I'd take top ten by MCC or Degree. Degree it is. The right
panel also flipped to a summary: highest degree 36. Fine."

### 04 -- Degree
`... --click "Analyze" --click "Degree"`

"Oh, nice: a histogram, '77 of 77 have a value', and a top 10 with numbers. Valjean 36, Gavroche
22, Marius 19. That's basically my cytoHubba table. But the drawing didn't change, and there's no
Degree row on the left like PageRank has. Is it a measure now or just a readout?"

### 05 -- Style tab of Degree
`... --click "Degree" --click "Style"`

"Style tab says 'Paints 77 nodes', Shape, Size '0.5 to 3'. So it IS sized by degree already? Then
why is every dot the same size? Valjean isn't any bigger than the leaf nodes. This is the
'preview looked fine, then the table was just headers' feeling."

### 06 -- click the size value
`... --click "Style" --click "0.5 to 3"`

"What? I clicked the size and I'm in 'Color by PageRank' and the right panel says PageRank now.
That's not what I clicked. I don't want to touch colors."

### 07 -- click the word Size instead
`... --click "Style" --click "Size"`

"Now a little cylinder icon and a minus appear next to Size. The drawing still hasn't changed."

### 08 -- rest on the Size row
`... --click "Size" --hover "Size"` (output: `tooltip: null`)

"No tooltip. Nothing."

### 09 -- click Shape
`... --click "Style" --click "Shape"`

"Clicking the Shape heading does nothing either. The panel keeps saying it paints 77 nodes and the
picture says it doesn't."

### 10, 11 -- the menu and the 'Paints 77 nodes' link
`... --click "Style" --hover "More"` -> "nothing on screen is called More"
`... --click "Style" --click "Paints 77 nodes (every node with a value)"`

"The link opened the node table sorted by degree, with 'Valjean is first on all three measures'.
That's actually a good supplementary table. But it's not what I asked for: still no sizes."

### 12 -- go through the PageRank row instead
`... --click "Les Miserables" --click "PageRank" --click "Shape"`

"PageRank is the row that's actually painting. Maybe the settings live on a row, and the Degree
panel is just a readout. Clicking 'Shape' does nothing; it's the plus that does something."

### 13 -- find out what the plus is
Hover probes on the plus: "Add Shape", "Add shape", "Add size" -> nothing called that;
`--hover "Add to Shape"` -> `tooltip: "Add to Shape"`.

### 14, 15 -- Add to Shape, then Size
`... --click "PageRank" --click "Add to Shape"` -> a small menu, Shape / Size.
`... --click "Add to Shape" --click "Size"`

"Size field now says 1. A constant. The cylinder icon must be 'use a column'."

### 16 -- what is the cylinder icon called
Hover probes: "Use data", "From data", "Bind to data", "Use a column", "Map to data", "Data"
(tooltip null), "Size from data", "Size by data", "Set from data", "Link to data", "Size by a
column", "Bind", "Set by data", "Vary by data", "From a column", "Data-driven", "Use values from
data", "Map Size", "Bind Size", "Size from a column" -> nothing; "Remove Size" is the minus;
`--hover "Size by"` -> `tooltip: "Size by attribute"`.

"(Resting the pointer on it, which a real person just does.) 'Size by attribute'. That's
Cytoscape 2 language -- I know that one."

### 17 -- Size by attribute
`... --click "Size" --click "Size by attribute"`

"A column list, like the Cytoscape mapping dropdown, and my columns are actually in it:
betweenness, degree, PageRank, note count. Good. Hubs are degree."

### 18 -- degree
`... --click "Size by attribute" --click "degree"`

"'Size by degree', linear, 0.5 to 3 px, fit to data. Fine, that's a continuous mapping. But the
dots... still identical. And behind the popup the Size field still says 1."

### 19 -- close with Escape
`... --click "degree" --key Escape`

"Popup gone. Size: 1. No size legend under the color one. Every dot the same size. Did it keep
'size by degree' or throw it away? Nothing tells me."

### 20 -- close with the X
`... --click "degree" --click "Close"`

"Same. Size 1, no legend, same dots. I'm stopping. If I can't tell whether my mapping was saved,
I can't trust the figure."

## Outcome

- Succeeded? No, I don't think so. I got as far as a 'Size by degree' setting, but the network
  never showed bigger dots for Valjean or Gavroche, the Size field went back to "1", and there was
  no size legend. As far as I can see, nothing was applied. (I also picked degree, because to me
  "the characters the network depends on" are the hubs -- the ones with the most connections. If
  the moderator meant something else, nothing on screen told me so.)
- Single Ease Question: 2 out of 7.
- Would I use this instead of Cytoscape? No. Some pieces were better than Cytoscape: the degree top
  10 with numbers, "77 of 77 have a value", the table sorted by degree, and the column dropdown that
  actually listed my columns. But I clicked the size number and landed in the PageRank color
  settings, the Degree panel said "Paints 77 nodes" while nothing changed, the most important
  button was an unlabelled cylinder icon, and in the end I couldn't tell whether my mapping existed.
  In Cytoscape it's Style tab, Size, pick the column, continuous mapping, done, and I can see it.
  And even if it worked, I'd still redo the paper figure in Cytoscape, because that's what the lab
  protocol and the reviewers know.
