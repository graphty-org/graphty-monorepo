# Session: export a picture with its key, and the per-character numbers (Explorer Elena)

Task as read by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. You need two things for a report: a picture file of the drawing as it looks now,
with its key to the colors, and the numbers the program worked out for each character in a file
Excel can open."

Participant: Explorer Elena (first-time graph user, product manager). Renders are in
`tmp/round-8-sessions/r8-t13--explorer-elena/`. Every command was run from
`design/ui/prototype`, with `D=$PWD/tmp/round-8-sessions/r8-t13--explorer-elena`.

## Start screen (shots/tasks/r8-t13/01.png)

> OK, a start page. There's a big box at the bottom asking about usage data. "No thanks." Then on
> the right, Samples -- "Les Miserables, 77 characters". That's the one he said. Clicking it.

## Step 1 -- open the sample (01.png)

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t13 --click "No thanks" --click "Les Miserables"

> Ooh, OK, it's already drawn. Lots of orange dots, Valjean right in the middle -- so he's the
> main guy, makes sense. There's a little box top-left, "Color: PageRank, 0.00330 to 0.0754".
> I guess that's the key? Everything is basically the same orange though, so I'm not sure what
> it's telling me. Darker is more... page rank. Whatever that is. Fine, I don't need to understand
> it, I need to save it.
>
> The left side has a long list -- PageRank, Louvain, Shortest paths, Density... no idea, not
> touching that. Where's save or download? Usually it's under the file name. Clicking
> "Les Miserables" at the top.

## Step 2 -- the menu under the project name (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables"

> Rename, Open, Save, Export... There. Export.

## Step 3 -- the Export window (03.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..."

> "Image .png -- Full graph, with the legend." Great, that's literally what I need, key included.
> The preview is tiny, I can see the little key card in the corner. "64 labels hidden to avoid
> overlap" -- fine, good actually, I don't want names everywhere. "To share -- PNG, 2x" sounds
> right for a slide. Export.

## Step 4 -- export the picture (04.png)

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Export"

> "Exported les-miserables.png to Downloads." One down. That was easy.
>
> Now the numbers. That same Export window had "Data" in the list on the left. Going back there.

## Step 5 -- Export, Data (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Export" --click "Les Miserables" --click "Export..." --click "Data"
    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown

Session-runner note: in the first run the click on "Data" landed on the "Data" button in the
left rail behind the dialog (the tool matched four controls), so the dialog stayed on Image
(05.png). The second run reached the Data page through the list with the keyboard (06.png). A
real person would have clicked the word in the dialog; this is a harness limit, not her mistake.

> Data. CSV -- Excel opens CSVs, good. But... "Rows: every one in the scope, with no cap: 254
> edges." I have 77 characters. 254 of what? Edges. Is an edge a character? I don't think so,
> the start page said 77 characters and the top says 77 nodes. So nodes are the characters,
> maybe? Then there's a lot of text about "Run columns" and "Rank" with stuff in quotes,
> "betweenness rank low (full graph, sampled from 20 sources)" -- I'm skipping that.
>
> Table: Edges, Nodes, Adjacency. I'll try Nodes since that's the 77.

## Step 6 -- try to switch to Nodes (07.png, 08.png)

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Nodes"
    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Adjacency" --key ArrowLeft
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Les Miserables" --click "Export..." --click "Recipe" --key ArrowDown --click "Adjacency" --key ArrowLeft --key Space

Session-runner note: "Nodes" also matched the Nodes tab behind the dialog, and the click timed
out. Reaching Nodes by keyboard from Adjacency left the screen in a mixed state (07.png, 08.png):
the Adjacency button stayed highlighted and a yellow "CSV cannot hold everything -- an adjacency
table holds who links to whom ... every node attribute and run result is not written" warning
showed, while the line above it said "77 nodes, one row and one column each" and the subtitle said
"every attribute and run result". Whether that mix is the skeleton or the keyboard path is for the
designers; what Elena saw is below.

> Hmm. Now it says 77 nodes, good, but there's a yellow warning: "CSV cannot hold everything."
> And it says the run result is not written? The numbers ARE the run results, I think. And the
> highlighted button says Adjacency, not Nodes. I don't know what I did. I'm not exporting
> something with a warning on it. Cancel.
>
> The numbers were in a table somewhere -- there's a "Table" thing at the bottom of the screen.
> Let me look at that instead.

## Step 7 -- the table at the bottom (09.png)

    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table"

> Oh, this is nice. It's a spreadsheet. Name, group, Degree, Rank by degree "#1 of 77", PageRank
> 0.0754... "Valjean is first on all three measures; Gavroche is in the top 3 on all three." OK,
> THAT is a sentence I could put in a report. 77 nodes, 77 rows. This is what I want in Excel.
>
> There's a "..." up by "Columns: 9 of 9". That's usually where download lives.

## Step 8 -- find the table's menu (10.png)

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "More"
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table actions"
    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "..."
    (loop over "More actions", "Table options", "Options", "Export table", "Export" -- only "Table options" matched)
    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --hover "Table options" --click "Table options"

Session-runner note: the three-dot button has no visible text; the harness needed its name, so
the runner guessed names until "Table options" matched. A person would simply have clicked the
dots. Those misses are harness cost, not her dead ends.

> Two things in the menu: "Time slider -- this data has no time attribute" (grayed) and "Export
> table as CSV...". Yes.

## Step 9 -- Export table as CSV (11.png)

    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..."

> It's the same Export window as before, but now it's on Nodes, "77 nodes", "Shown in the table,
> 9 of 9", and no yellow warning. Oh -- so that's what it was supposed to look like. I just had to
> click Nodes before, I guess I messed it up. Export.

## Step 10 -- export the CSV (12.png)

    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"

> "Exported les-miserables_nodes.csv to Downloads." Done. Picture and spreadsheet.

## Wrap-up

**Did I succeed?** Yes, I think so. I have les-miserables.png, which said it had the legend, and
les-miserables_nodes.csv with a row per character. I didn't open either file, so I'm trusting
the little previews and the messages.

**Single Ease Question (1-7):** 5. The picture was a 7 -- one menu, it said "with the legend",
done. The spreadsheet was more like a 3 the first way: it started on 254 "edges" when I wanted
77 characters, and when I tried to fix that I got a warning and a button I didn't pick. The
table at the bottom saved it -- that's where the numbers obviously are, and its export started on
the right thing.

**Would I use this instead of what I use now?** For a quick picture for a deck, maybe, yes --
the export was easier than screenshotting a Slides chart. The color key worried me a little:
"PageRank 0.00330 to 0.0754" means nothing to anyone in my meeting, and the dots all look the
same orange. If I paste that, someone will ask "what's PageRank" and I won't know. The table's
one-line summary ("Valjean is first on all three measures") is the thing I'd actually quote.

## Observations for the study team (session runner, not participant)

- Image export from the project-name menu took four clicks and was understood at once; the
  "Full graph, with the legend" subtitle answered her main worry before she asked it.
- The Data export opened on the Edges table (254 rows) when the task was per-character numbers.
  She worked out from "77 characters" and "77 nodes" that nodes were what she wanted, but only
  because the counts matched; the words edge and node meant nothing to her.
- The mixed state in 07/08.png (Adjacency highlighted, Nodes described, adjacency warning shown)
  made her abandon the dialog. It may be a keyboard-path artifact; worth checking that a mouse
  click on Nodes gives the clean state seen in 11.png.
- Entering export from the table's own menu preset the right table and columns and showed no
  warning. She succeeded through that path.
- The legend shows a measure name and a raw number range with no plain-language meaning; she
  could export it but could not explain it.
