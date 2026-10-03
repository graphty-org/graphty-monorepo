# Session: picture with its color key, and the per-character numbers for Excel

Participant: the reporter with a contacts sheet (study/personas/data-journalist.md), first time in the app.
Task as given: "You have never used this program before. You will practice on the ready-made network of characters from the novel Les Miserables that comes with the program, not on your own data. You need two things for a report: a picture file of the drawing as it looks now, with its key to the colors, and the numbers the program worked out for each character in a file Excel can open."

All commands run from design/ui/prototype. Renders are in tmp/round-8-sessions/r8-t13--data-journalist/.

## Start screen (shots/tasks/r8-t13/01.png)

"OK, a start page. There's a big box at the bottom asking to collect usage data. I don't want anything leaving my machine, so No thanks. Les Miserables is right there under Samples, 77 characters. Good."

## 01 -- open the sample

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t13 --click "No thanks" --click "Les Miserables"

"The drawing is up. Top left of the drawing there's a little box: 'Color: PageRank, 0.00330 to 0.0754', orange to brown. That's the key, I guess. I don't know what PageRank means for a novel, but that's not today's job. The left list is long -- Louvain, Shortest paths, Watchlist, 'For the report'... lots of stuff already done for me. Now where is 'save a picture'? No File menu. The name 'Les Miserables' at the top has a little arrow, so that's probably the file menu."

## 02 -- the menu under the project name

    ... --click "No thanks" --click "Les Miserables" --click "Les Miserables"

"Yes: Rename, Open, Save, Export... Ctrl+E. Export it is. (The panel on the right also changed to a summary of the graph when I clicked the name -- didn't ask for that, but fine.)"

## 03 -- Export dialog, Image

    ... --click "Export..."

"Image .png, 'Full graph, with the legend'. That's exactly what I asked for in plain words, which I like. The preview has the key in the corner. It's small, I can't really read it -- the key in the preview seems to have more text than the one on screen, a sentence under the scale? I'd want to zoom on that preview. '64 labels hidden to avoid overlap' -- so most names won't be in the picture. For an editor that's fine, the graphics desk will redo it anyway. 'Saved to this computer only; nothing is uploaded.' Good, that's what I check for."

## 04 -- export the picture

    ... --click "Export..." --click "Export"

"'Exported les-miserables.png to Downloads.' Picture done. One down."

## 05 to 08 -- Export dialog, Data

    ... --click "Les Miserables" --click "Export..." --click "Data"          (05: the click did not land)
    ... --click "Recipe" --key ArrowDown                                    (06: Data page)
    ... --click "Nodes" --click "Every column"                              (07: Nodes click did not land)
    ... --click "Adjacency" --key ArrowLeft --click "Every column"          (08)

"Back to Export, the Data entry on the left. It says CSV -- Excel opens that. But it's set to 'Table: Edges', 254 rows. That's the ties, not the characters. I want one row per character, so Nodes. [The study tool could not press the dialog's Nodes button here, because the table tab behind the dialog has the same name -- a tool limit, not something a person would hit.] I ended up on Adjacency by accident and got a yellow warning that a CSV can't hold everything. Also the top line said 'every attribute and run result' while the warning said node results are NOT written -- those two contradict each other. That kind of thing makes me nervous about what's actually in the file."

"The 'What is written' block is good in principle -- ids, ranks, how a column is headed -- but it talks about 'betweenness (full graph, exact)' and then 'sampled from 20 sources'. Which one is it? I'd have to open the file to know."

## 09 -- try the table instead

    ... --click "No thanks" --click "Les Miserables" --click "Table"

"The Table button at the bottom opens a spreadsheet of characters: label, notes, group, degree, rank by degree, PageRank, rank... 77 nodes. These ARE the numbers I want. There's even a line 'Valjean is first on all three measures'. If I can get this table out, that's my file."

## 10 to 11 -- Export again with the nodes table open

    ... --click "Table" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown
    ... --click "Adjacency" --key ArrowLeft --key ArrowLeft

"I hoped Export would now pick the characters table since that's what I'm looking at. No -- still Edges. Annoying: it says 'the columns the table shows' but picks the other table."

## 12 to 15 -- the table's own menu

    ... --click "Table" --click "Table options"
    ... --click "Table options" --click "Export table as CSV..."
    ... --click "Export table as CSV..." --click "Every column"
    ... --click "Every column" --click "Export"

"The three dots next to 'Columns: 9 of 9' -- 'Export table as CSV...'. That's what I'd look for in Excel too. It opens the same Export box, but now Nodes is chosen, 77 rows, '9 of 9, as the table's Columns shows them'. I'll take 'Every column' to be safe, since I want every number it worked out -- but then there's ALSO 'Hidden columns too'. Isn't every column every column? I didn't pick that one; I hope I didn't leave something out. Export: 'Exported les-miserables_nodes.csv to Downloads.'"

## Result

- Did I succeed? I think so: les-miserables.png ("full graph, with the legend") and les-miserables_nodes.csv (77 characters, every column). I am not 100% sure the CSV has the betweenness numbers -- that layer was switched off on the left, and "Every column" vs "Hidden columns too" left me unsure.
- Single Ease Question: 5 of 7. The picture was easy. The table defaulted to the ties instead of the characters, even when I was looking at the characters, and the wording about what goes in the file contradicted itself.
- Would I use it instead of what I use now? Probably yes for this kind of job. Gephi would have had me hunting through the Data Laboratory for the export button; here the Export box tells me in words what lands in the file and that nothing is uploaded, which I need for unpublished names. I'd want the "what is written" text to be consistent before I trust it with a story.

## Problems seen

1. Export > Data defaults to the Edges table (ties), not the characters, even when the characters table is open on screen. Someone asking for "numbers for each character" gets 254 tie rows unless they notice.
2. With Adjacency picked, the header said "every attribute and run result" while the warning below said node attributes and run results are not written.
3. "Every column" and "Hidden columns too" sit side by side; "every" should mean every.
4. The "What is written" example mixes "full graph, exact" and "sampled from 20 sources" for betweenness without saying which applies to this file.
5. The image preview is too small to read the color key that will be in the file; the preview key appears to carry an extra sentence the on-screen key does not show.
6. Clicking the project name also switched the right-hand panel to a graph summary.

Tool note (not a design finding): the dialog's "Nodes" and "Data" choices could not be clicked by name because covered controls behind the dialog share those names.
