# Session: first sitting with Les Miserables -- supply chain risk analyst (Dana)

Task as given: get the Les Miserables network on screen, have the program work out something
about the characters, make the drawing show that result in its colors or sizes, get the
characters' names written on the drawing, and finish with a picture file for a document.

All commands were run from design/ui/prototype. D stands for
tmp/round-8-sessions/r8-t01--supply-chain-analyst (absolute path used in the real runs).
Every run starts again from the start screen.

## Start screen (shots/tasks/r8-t01/01.png)

"OK. Start, Recent projects, Samples. Les Miserables, 77 characters -- that's the one. There's a
box at the bottom asking to collect usage data. Supplier lists are under NDA where I work, so
the answer is no, out of habit. Good that it says files are read on this computer and never
uploaded -- that's the first thing IT will ask me."

## Step 1 -- open the sample

    timeout 120 node app-b/study.mjs --try D/01.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"Picture's up. Orange dots, lines, a few names. Part one is done -- the network is on screen.

But hold on, it's already busy. The left list has PageRank, Louvain, Shortest paths, Density,
Link prediction, Watchlist, a folder called 'For the report'... Somebody has already done
things to this. A box at the top says 'Color: PageRank 0.00330 to 0.0754'. I don't know what
PageRank is. Google? So the colors already mean something, but I didn't ask for it. The task
says have the program work something out, so I want to do one myself and see it change."

## Step 2 -- find where to work something out

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    (tooltip: "Analyze Shift+A")
    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"The right panel said 'Measure from Analyze', and the little flask at the bottom says Analyze.
A menu. 'Rank nodes and edges': PageRank (Start here), Degree, Total value, Betweenness,
Closeness, Eigenvector. I know betweenness -- from a vendor webinar, it's the chokepoint score.
'Which nodes sit on the most shortest paths between others.' That's who holds things together.
That's the one I'd actually use at work, so I'll pick it."

## Step 3 -- run Betweenness

    timeout 120 node app-b/study.mjs --try D/04.png ... --click "Analyze" --click "Betweenness"
    (the tool said "Betweenness" matched two things, the menu item and a row already in the list,
    and the click timed out; I clicked the menu entry by its sentence instead)
    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

"Weight, 'Higher means: Stronger, Farther, Capacity', and a paragraph about 1/value. I don't
know what weight these characters have and I'm not reading that. Leave the defaults. 'Under a
second'. Run."

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"A new row at the top of the list, 'Betweenness 2', with a spinner and a blue progress line.
Why 2? I only ran it once. The picture hasn't changed. Legend still says PageRank. It said under
a second."

    timeout 120 node app-b/study.mjs --try D/06.png ... --click "Run" --click "Betweenness 2"
    timeout 120 node app-b/study.mjs --try D/07.png ... --click "Run" --hover "Betweenness 2" --click "Betweenness 2" --click "Run"
    (tooltip on the row: "This name cannot be changed: a run is named by its algorithm, and a
    second run of the same algorithm is numbered (Louvain 2)")

"I click it. Still spinning. The right panel doesn't even switch to it. The tooltip tells me I
can't rename it -- I didn't want to rename it, I wanted to see it. So there must already be a
Betweenness somewhere -- yes, down in 'For the report' there's a Betweenness row with a crossed
eye."

## Step 4 -- try the Betweenness that was already there

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness"

"Right panel: 'Covered by PageRank for Color' and a button 'Move above'. 'Paints 77 nodes, none
visible.' OK, so PageRank is sitting on top of it. Move above."

    timeout 120 node app-b/study.mjs --try D/09.png ... --click "Betweenness" --click "Move above"

"Message: 'Moved Betweenness above PageRank'. The panel now says it covers PageRank. But the row
is still at the bottom of the list, the dots are the same orange, and the legend still says
PageRank. It says it moved and nothing moved."

    timeout 120 node app-b/study.mjs --try D/10.png ... --click "Move above" --hover "Show"
    (tooltip: "Show Betweenness Alt-click or Alt+Space: show only this row")
    timeout 120 node app-b/study.mjs --try D/11.png ... --click "Move above" --click "Show Betweenness"

"The crossed eye -- maybe it's switched off. Show Betweenness. Eye is open now. Picture: same.
Legend: PageRank. Yellow to orange is what it's supposed to be and I see orange to brown."

    timeout 120 node app-b/study.mjs --try D/12.png ... --click "Show Betweenness" --click "PageRank" --click "Hide PageRank"

"Fine, I'll switch off PageRank so there's nothing on top. Now the 'Betweenness 2' row I ran has
disappeared from the list entirely, PageRank shows a crossed eye, and the picture -- still the
same orange, legend still 'Color: PageRank'. I've now clicked five things and the drawing has
not changed once. If this were my supplier data I would stop trusting every color on it.

I'm calling this part: the program worked something out, I think -- I never saw a number from
my own run. The drawing shows PageRank, which was already there when I opened it. The legend at
least says what the color is and darker means higher. So 'colors show a result' -- yes, but not
the one I asked for, and I didn't do it."

## Step 5 -- names on the drawing

    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Label"
    timeout 120 node app-b/study.mjs --try D/14.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Add label"
    (nothing on screen is called "Add label")
    timeout 120 node app-b/study.mjs --try D/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels shown anyway (this file)"

"About fifteen names are already showing: Valjean, Javert, Cosette, Marius... I want all of
them. Right panel has 'Label' with a plus. Clicked it -- nothing opened. Left list has 'Labels
show... 1 node'. Click it: message says 'Labels shown anyway (this file): Valjean. Opens in the
inspector (not available yet)'. Not available yet. OK."

    timeout 120 node app-b/study.mjs --try D/16.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try D/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu"

"Main menu: New project, Open, Save, Export, Select where, Settings, Help. Nothing about names.
Export is here though, good to know."

    timeout 120 node app-b/study.mjs --try D/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --key Escape --click "Style"
    timeout 120 node app-b/study.mjs --try D/19.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything"
    timeout 120 node app-b/study.mjs --try D/20.png ... --click "Everything" --hover "Label"
    timeout 120 node app-b/study.mjs --try D/21.png ... --click "Everything" --click "Label"

"'Everything' sounds like the whole drawing. Right panel: Fill, Shape, Size, Effects, Label +,
Tooltip +. Click Label. Nothing. No tooltip on it either. I've tried four places for names. I'm
done with that -- the fifteen big names will have to do. That part I did not finish."

## Step 6 -- picture file

    timeout 120 node app-b/study.mjs --try D/22.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."

"Export: Image .png, 'Full graph, with the legend', a preview. 'To share -- PNG, 2x'. 'Saved to
this computer only; nothing is uploaded' -- I like that line. And here: '64 labels hidden to
avoid overlap: show list'. So 64 of 77 names won't be on it. That answers why I couldn't get
names on -- it's hiding them on purpose, and it's telling me only now, on the last screen."

    timeout 120 node app-b/study.mjs --try D/23.png ... --click "Export..." --click "show list"

"A list: Thenardier degree 16, Joly degree 12, Mabeuf... It tells me who is missing but there's
no 'show them anyway' button that I can see. I'm not going to scroll the settings. Export."

    timeout 120 node app-b/study.mjs --try D/24.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

"'Exported les-miserables.png to Downloads.' Picture file done. That part was the easiest thing
today."

## Wrap-up

**Did I succeed?** Partly. On screen: yes. Picture file: yes. Colors showing a result: only the
PageRank coloring the sample came with -- the Betweenness I ran myself never finished or never
showed, and 'Move above' and 'Show' told me they worked while the drawing stayed the same. Names:
no -- about 13 of 77, and I couldn't find a way to put the rest on. I would hand this picture to
nobody, because I can't say which number the colors are or that I chose it.

**Single Ease Question:** 3 out of 7. Opening and exporting were easy; the middle was not.

**Would I use this instead of my current tool?** Not on this showing. The 'nothing is uploaded'
promise is the best thing I saw, and the export dialog is clear. But the moment the picture
didn't change after the program said it had, I stopped believing it -- with supplier data that's
fatal: I'd be walking a VP through colors I can't explain. The sample is also so crowded with
someone else's work (PageRank, Louvain, groups, a watchlist, a report folder) that I couldn't
tell what was mine. And it still isn't Power BI. For now, my pivot table.
