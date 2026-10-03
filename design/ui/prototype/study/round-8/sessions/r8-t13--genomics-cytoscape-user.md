# Session: picture with its key, and the numbers as a spreadsheet file (Les Miserables sample)

Participant: Maren, cancer genomics postdoc who uses Cytoscape a few times a month (persona file: study/personas/genomics-cytoscape-user.md).

Task as given by the moderator: "You have never used this program before. You will practice on the ready-made network of characters from the novel Les Miserables that comes with the program, not on your own data. You need two things for a report: a picture file of the drawing as it looks now, with its key to the colors, and the numbers the program worked out for each character in a file Excel can open."

Start screen: shots/tasks/r8-t13/01.png. Renders: tmp/round-8-sessions/r8-t13--genomics-cytoscape-user/NN.png.
Every command was run from design/ui/prototype; S stands for tmp/round-8-sessions/r8-t13--genomics-cytoscape-user.

## Step 1 -- start screen (01.png)

Think-aloud: "Start, recent projects, samples. Les Miserables, 77 characters, is right there on the right. There's a big banner at the bottom asking for usage data. 'Your data is yours' -- fine, but no. I click No thanks. I don't want anything leaving my laptop, even for a practice network. Good that it says files are never uploaded, and there's a 'Local only' up top."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try $S/02.png task:r8-t13 --click "No thanks" --click "Les Miserables"

Think-aloud: "Okay, flat, 2D, white-ish background. Not spinning. Good. Nodes are orange to brown and there's a little box top-left: 'Color: PageRank, 0.00330 to 0.0754'. So that's the key. The left list is long -- PageRank, Louvain, shortest paths, top 9 by degree, a watchlist, 'For the report'... someone has already done a lot here. I don't need to understand all of it. The task says 'as it looks now', so I'm not touching anything. In Cytoscape I'd go File > Export > Network to Image. Let me find the File menu."

## Step 3 -- the menu (03.png, 04.png)

    timeout 120 node app-b/study.mjs --try $S/03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try $S/04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu"

Think-aloud: "The three lines top-left is 'Main menu'. New project, Open, Save, Export... Ctrl+E. That's my File menu. Export."

## Step 4 -- export the picture (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try $S/05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."
    timeout 120 node app-b/study.mjs --try $S/06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

Think-aloud: "Image, .png. 'Full graph, with the legend.' That is the sentence I've wanted Cytoscape to say for years. The preview has the key box in the corner. I can't read the text in the preview at that size, though -- I'm trusting that it says PageRank. '64 labels hidden to avoid overlap' -- okay, honest, at least it tells me. Preset 'To share -- PNG, 2x'. For a report a PNG is fine. For a paper I'd want a PDF or SVG and I didn't check whether the Format box has one. Export."
"'Exported les-miserables.png to Downloads.' Done with the picture."

## Step 5 -- the numbers, first try (07.png, 08.png)

    timeout 120 node app-b/study.mjs --try $S/07.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export" --click "Main menu" --click "Export..." --click "Data"
    timeout 120 node app-b/study.mjs --try $S/08.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export" --click "Main menu" --click "Export..." --click "option Data"

Think-aloud: "The Export window had 'Data' in its left list. I went back and clicked it... and nothing changed, it's still on Image." (Moderator note: the click tool could not reach the Data item in the dialog's list because the sidebar's Data button behind the dialog has the same name; a real pointer would have reached it. Not a design finding.) "Fine. In Cytoscape the numbers live in the node table and you export the table. Let me do that."

## Step 6 -- the node table (09.png)

    timeout 120 node app-b/study.mjs --try $S/09.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table"

Think-aloud: "There's the table. 77 nodes, 'Rows 1 to 77 of 77' -- good, a count. Label, Notes, group, Degree (full graph), Rank by degree '#1 of 77', PageRank (full graph). 'Valjean is first on all three measures' -- three measures? I see degree and PageRank; the third must be off to the right. 'Columns: 9 of 9'. There's a three-dot button next to that."

## Step 7 -- table menu (10.png, 11.png)

    timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --hover "More"
    (nothing on screen is called "More")
    timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --hover "Table options"
    timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --hover "Table menu"
    timeout 120 node app-b/study.mjs --try $S/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --hover "Export"
    timeout 120 node app-b/study.mjs --try $S/11.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options"

Think-aloud: "The dots are 'Table options'. 'Time slider' (grayed out) and 'Export table as CSV...'. CSV opens in Excel. Click."
Side note: "When I opened that menu the PageRank row on the left stopped being highlighted and the right panel jumped to the network summary. Didn't matter for me, but I noticed it change under me."

## Step 8 -- the data export (12.png, 13.png)

    timeout 120 node app-b/study.mjs --try $S/12.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..."
    timeout 120 node app-b/study.mjs --try $S/13.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..." --click "Every column"

Think-aloud: "Ah, it's the same Export window, now on Data. 'Every one in the scope, with no cap: 77 nodes.' Good, 77 is the number I saw. 'Ids as loaded, never renumbered.' That matters to me -- with genes, renumbered ids are how you lose the join. 'Rank -- a whole number with a separate Tie column, never 4=, so the column stays numeric in a spreadsheet.' Somebody here has been burned by Excel too. The column headers say how they were computed, 'betweenness (full graph, exact)'. I'd paste that into methods.
"Columns: 'Shown in the table, 9 of 9' or 'Every column'. If the table shows 9 of 9, what is 'every column' adding? I'll take Every column, I'd rather delete in Excel than miss something.
"...and now a third button appeared, 'Hidden columns too'. So 'Every column' wasn't every column. That's a bit silly. The heading now says 'every attribute and run result', and run results are what I'm after. I'm not going hunting for hidden ones. There's also something about 'Compared with earlier version' -- skipping that."

## Step 9 -- export (14.png)

    timeout 120 node app-b/study.mjs --try $S/14.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..." --click "Every column" --click "Export"

Think-aloud: "'Exported les-miserables_nodes.csv to Downloads.' That's both. I'd open the CSV in Excel now to check the betweenness column is actually in there -- the Betweenness row on the left had a crossed-out eye, and I'm not sure if hidden there means hidden from the file."

## Debrief

Succeeded? "Yes, I think so. les-miserables.png with the key, and les-miserables_nodes.csv with 77 rows. I'd still open both to check before I put them in a report."

Single Ease Question: 6 of 7. "The picture was easy, File menu, Export, done, and it said the legend was in. The numbers took one detour, and the Columns buttons made me second-guess -- 'every column' and then 'hidden columns too'."

Would she use it instead of Cytoscape? "For this kind of thing -- picture plus table out -- it's quicker than Cytoscape, and I like that it says the legend is in the image and that ranks stay numbers. But I exported a PNG; for a paper I need vector, and I didn't see whether it does PDF. And none of my pipeline is here that I could see -- no STRING, no clustering I know, no enrichment. So no, not instead. Maybe for a quick look or for a collaborator's figure. The paper figure stays in Cytoscape, because that's what my PI and reviewers expect, and I'd need something to cite."

## Observations for the studio

- The image export says "Full graph, with the legend" and the preview shows the key: the participant's top complaint about Cytoscape was answered in one screen.
- The Columns choice in the Data export is confusing: "Every column" adds a third option, "Hidden columns too", which makes "Every column" read as untrue. With the table at "9 of 9", the difference between "Shown in the table" and "Every column" was not clear before clicking.
- The participant could not tell whether a measure hidden on the canvas (Betweenness, crossed-out eye in the left list) is included in the CSV.
- The legend text in the export preview is too small to read; she trusted the caption instead of the picture.
- Opening the table's options menu changed the left-list selection and the right panel.
- She exported PNG by default and did not find out whether a vector format exists.
- Harness limitation (not a design finding): the Data item inside the Export dialog could not be clicked by name because the sidebar's Data button shares it.
