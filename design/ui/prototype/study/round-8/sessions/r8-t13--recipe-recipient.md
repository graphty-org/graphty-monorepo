# Session: export a picture with its key and the per-character numbers (Les Miserables sample)

Participant: Tom, lab manager, never builds networks (persona: recipe recipient).
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your
own data. You need two things for a report: a picture file of the drawing as it looks now, with
its key to the colors, and the numbers the program worked out for each character in a file Excel
can open."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t13--recipe-recipient/. Every command starts from the start screen and
replays the listed steps.

## Step 1 -- the start screen (shots/tasks/r8-t13/01.png)

Think-aloud: "Start page. Big box at the bottom asking about usage data. It says they never see
my data and nothing is collected until I answer. Fine, 'No thanks'. On the right, Samples, and
Les Miserables is the first one, 77 characters. Good, that's the one. Also: 'Files are read on
this computer and never uploaded.' I like that it says it up front, even if this is only the
practice file."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t13 --click "No thanks" --click "Les Miserables"

Think-aloud: "Okay, a picture. All orange dots, some darker. There's a little box top-left:
'Color: PageRank, 0.00330 to 0.0754'. So that's the key. I don't know what PageRank is -- the
Google thing? -- but that's the key, and that's what the report wants. The list on the left is
a lot of rows: Louvain, Shortest paths, Link prediction, Watchlist... I'm not reading all that.
Some of those rows have their own colors, yellow, blue, pink, but the drawing is just orange.
I'll take 'as it looks now' to mean what's on screen."

## Step 3 -- look for File (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Menu"

(The tool reported two matches, "Main menu" and the project-name menu; it opened the main menu,
the three lines in the top corner, which is what I was going for.)

Think-aloud: "This is the File menu, more or less. New project, Open, Save, Export. 'Export...'
is what I want. The panel on the right changed to some numbers about the whole network when I
did that -- density, components. Not mine to worry about."

## Step 4 -- Export dialog, Image (04.png)

    ... --click "Main menu" --click "Export..."

Think-aloud: "Image is already picked. 'Image .png -- Full graph, with the legend.' Good, it says
with the legend, that's the key. The little preview is tiny, I can barely see it, but there's
the key box in the corner. '64 labels hidden to avoid overlap' -- okay, the names won't all be on
it. That's fine for a report, I suppose. 'To share -- PNG, 2x.' Don't care. And at the bottom it
says saved to this computer only, nothing uploaded. Export."

## Step 5 -- export the picture (05.png)

    ... --click "Export..." --click "Export"

Think-aloud: "'Exported les-miserables.png to Downloads.' Good, it told me the name and where it
went. One down."

## Step 6 -- back into Export for the numbers (06.png, 07.png, 08.png)

    ... --click "Export" --click "Main menu" --click "Export..." --click "Data"
    ... --click "option Data"
    ... --click "Recipe" --key ArrowDown

(Moderator note: the first attempt to click "Data" hit the Data button on the left edge of the
main screen instead of the Data entry in the dialog -- the tool picked the first of four controls
with that name -- and timed out; "option Data" matched nothing. Going through "Recipe" and the
down-arrow landed on Data. A real pointer would have hit the dialog entry directly, so this is a
harness collision, not something Tom experienced.)

Think-aloud on 08.png: "Data. 'Full graph, 77 nodes, 254 edges.' Then 'Rows: every one in the
scope, with no cap: 254 edges'. 254? There are 77 characters. I want one row per character.
Then there's a lot of text in typewriter font about 'run columns' and 'betweenness rank low ...
sampled from 20 sources'. I'm not reading that. 'Table: Edges, Nodes, Adjacency.' I'd guess Nodes
are the characters -- the dots."

## Step 7 -- try to switch to Nodes (09.png, 10.png, 11.png)

    ... --click "Recipe" --key ArrowDown --click "Nodes"
    ... --click "Recipe" --key ArrowDown --click "Adjacency" --key ArrowLeft
    ... --click "Recipe" --key ArrowDown --click "Adjacency" --key ArrowLeft --key Space

(Moderator note: "Nodes" also matched the Nodes tab behind the dialog first, and timed out. I
tried to reach it via Adjacency and the arrow keys; the selection stayed on Adjacency. Again a
harness collision; a real click on "Nodes" would have worked.)

Think-aloud on 10.png: "Adjacency says 77 nodes, one row and one column each, and then a yellow
warning: 'CSV cannot hold everything -- an adjacency table holds who links to whom ... every node
attribute and run result is not written.' So that one does NOT have the numbers. Wrong one. I
can't get this to go to Nodes. Second thing that hasn't worked. I'll back out and try another way
before I give up and ask the postdoc."

## Step 8 -- the table at the bottom (12.png)

    ... --click "Export" --click "Table"

Think-aloud: "Oh, now this is useful. A table: label, group, Degree, Rank by degree, PageRank. 77
nodes, rows 1 to 77 of 77. Valjean first. That is 'the numbers the program worked out for each
character'. Above it, a sentence in plain English: 'Valjean is first on all three measures.' I
can read that. The three dots next to 'Columns: 9 of 9' -- that's usually where Export lives in a
spreadsheet thing."

## Step 9 -- table menu (13.png, 14.png)

    ... --click "Table" --click "More"            (nothing on screen is called "More")
    ... --click "Table" --click "Table options"

Think-aloud on 14.png: "Two things: Time slider, greyed out, and 'Export table as CSV...'. CSV opens
in Excel, the plate reader gives us those all the time. Click."

## Step 10 -- the same Export dialog, now set up for characters (15.png)

    ... --click "Table options" --click "Export table as CSV..."

Think-aloud: "Same box as before, but now it says Nodes, 'Rows: every one in the scope, with no
cap: 77 nodes'. 77. That matches the 77 characters on the start page. 'Columns: shown in the
table, 9 of 9.' Good. It still says 'betweenness' in that typewriter paragraph -- there's a
Betweenness row on the left with its eye crossed out, so I don't know if that column is in my file
or not. I'll find out when I open it in Excel. Export."

## Step 11 -- export the numbers (16.png)

    ... --click "Export table as CSV..." --click "Export"

Think-aloud: "'Exported les-miserables_nodes.csv to Downloads.' Done. Two files: the picture and
the CSV."

## Wrap-up

Did I succeed? "I think so. I've got les-miserables.png with the key in the corner, and
les-miserables_nodes.csv with 77 rows. I'd still open the CSV in Excel before I sent it, to check
the character names didn't turn into something stupid and whether betweenness is in there."

Single Ease Question (1-7): 4.
"The picture was easy -- File, Export, Export, and it told me where it went. The numbers were
not. The obvious way, the same Export box, starts on 'edges' with 254 rows, which is not 'each
character', and switching it didn't work for me. I only got there because I happened to open the
table at the bottom and found the three dots. If I hadn't, I'd have given up and emailed her."

Would I use this instead of my current tool? "For this kind of thing my current tool is the
postdoc sending me a PNG and an Excel file. This came close to doing that myself, and it said
twice that nothing gets uploaded, which matters to me. But the key just says 'PageRank' -- the PI
will ask me what that is and I can't tell him. And I had to hunt for the numbers. I'd use it for
the picture. For the numbers I'd still ask her, unless someone shows me the table trick once."

## Observations (what happened, not what to change)

- The image export said up front "Full graph, with the legend" and showed where the file went;
  no hesitation there.
- The data export reached from the main menu opened on the Edges table (254 rows) when the task
  was per character; Tom read 254 against 77 and knew it was wrong, but it cost him an attempt.
- The Adjacency option showed a clear warning that it drops the computed numbers; Tom read the
  first line and understood it was the wrong file.
- The route that worked (bottom Table, then its three-dot menu, "Export table as CSV...") opened
  the same dialog already set to Nodes with 77 rows -- that count matched the sample's 77
  characters and is what convinced him.
- The "What is written" paragraph in monospace with quoted column headers was skipped entirely.
- The only key on the picture is "Color: PageRank" with a number range; Tom does not know what
  PageRank means and expects to be asked about it.
- Several rows in the left list carry their own colors (yellow, blue, pink) that do not appear on
  the drawing; Tom noticed and decided "as it looks now" meant the orange drawing on screen.
- Betweenness appears in the export dialog's text while its row on the left is shown as hidden;
  Tom could not tell whether that column would be in his file.
- Harness note: "Data" and "Nodes" inside the Export dialog share names with controls behind it,
  so the study tool clicked the background control first; this was not a participant experience.
