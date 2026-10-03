# First-click test: the Gephi holdout (Dr. Mara Lindqvist, fictional)

Each answer comes from the still screen only. Confidence is 1 (pure guess) to 7 (certain).

## r8-fc01 -- see it working on something right away
Click: the "Les Miserables" sample (thumbnail or title) under Samples, top right. Confidence 6.
"Les Mis, 77 characters. I know those numbers by heart, so it doubles as a count check. I'd
dismiss the usage-data box first with No thanks; I don't share anything before I know what it is."

## r8-fc02 -- bring in the spreadsheet from Downloads
Click: "Open project or file..." (Ctrl+O) under Start. Confidence 6.
"That's File > Open. 'New from data' sounds like building something, which I don't want yet. If
the dialog is fussy I'll just drag the CSV onto the window, it says I can."

## r8-fc03 -- which characters the story depends on most
Click: the flask icon, far left in the floating toolbar at the bottom of the drawing. Confidence 3.
"Where is Statistics? There's no panel called that. The flask is the closest thing to 'run
something'. 'from Analyze' on the right tells me Analyze exists somewhere; I'm betting it's the
flask. In Gephi this is one click on the Statistics tab. I want betweenness, and I want to know
what it ran on."

## r8-fc04 -- circles of characters who keep turning up together
Click: the flask icon in the bottom toolbar again. Confidence 3.
"That's modularity. I see a 'Louvain, 6 groups' row already in the list, so somebody ran it, but
I'd rerun it myself to see the resolution and the seed. I'm going to the same place I'd run any
statistic, assuming the flask is it."

## r8-fc05 -- every name written beside its dot
Click: the "+" beside "Label" in the right panel (with Everything selected). Confidence 5.
"Everything is selected, the right side has Label with a plus. That's the obvious one. In Gephi
it's the T at the bottom of the graph window, which I don't see here."

## r8-fc06 -- bigger dots for the highest scorers
Click: the "+" beside "Shape" in the right panel, with PageRank selected. Confidence 3.
"This is a ranking on size. With PageRank selected the panel only has Fill, Shape, Effects,
Label. Size isn't listed, so I'm guessing size lives under Shape. In Gephi it's Appearance,
Nodes, the size icon, Ranking. Here I'm hunting."

## r8-fc07 -- arrange the dots a different way
Click: the play triangle in the bottom toolbar. Confidence 4.
"I want Layout, ForceAtlas2. There's no Layout panel anywhere I can see. The play button is what
runs a layout in Gephi, so that's my bet. I'd want it to show me which algorithm and the
gravity and scaling before it moves anything."

## r8-fc08 -- jump straight to Javert
Click: the "Javert" label on the drawing, just right of Valjean. Confidence 5.
"He's labeled, right there. If he weren't, I'd use the search box, but 'Find rows and notes' does
not say nodes, so I'm not sure it would find him."

## r8-fc09 -- a picture for a slide
Click: the three-line menu icon at the top left. Confidence 4.
"No Preview tab, no export button in view. File menu is the hamburger, export is usually there.
I want SVG, not a PNG, and the labels had better come through."

## r8-fc10 -- the numbers for each character in Excel
Click: "Data" in the left rail (the database cylinder icon). Confidence 4.
"That's my Data Laboratory, where Export table lives in Gephi. Could also be the 'Table' tab at
the bottom; I'd try Data first."

## r8-fc11 -- stop now, pick up tomorrow exactly as is
Click: the three-line menu at the top left, looking for Save. Confidence 4.
"There's no save button. 'Local only' worries me: is it saved in the browser, or gone if I clear
the cache? I'd hit Ctrl+S first by reflex, then the menu. I'd want an actual file on my disk."

## r8-fc12 -- check every character and connection came through
Look: the line at the top of the table, "Les Miserables: 77 nodes, 254 edges", and the 77 and
254 beside nodes and edges on the left. Confidence 6.
"77 and 254. That matches what I know for Les Mis. Good. Now show me that the attribute columns
all made it, not just id, label and group."

## r8-fc13 -- who this character is directly tied to
Click: the target icon (concentric circles), first in the small toolbar that appeared above the
main one. Confidence 3.
"Valjean is selected and a little row of icons popped up. The circles look like 'neighbors'.
In Gephi I'd right-click, Select in data lab, or use the ego filter. I'd honestly try a right
click on the node before any icon I can't read."

## r8-fc14 -- this month's transfers file in place of last month's
Click: the "..." beside "transfers-2026-03.csv" under Sources. Confidence 5.
"That row is last month's file, the dots should have Replace. In Gephi I'd import into the same
workspace with 'append' and pray. If this really swaps the file and keeps my styling, that's
something Gephi doesn't do."
