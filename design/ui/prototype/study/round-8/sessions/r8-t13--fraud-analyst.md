# Session: export a picture with its key, and per-character numbers for Excel

Participant: Sarah, fraud detection analyst (persona: study/personas/fraud-analyst.md)
Mode: first use, not mandated (about five minutes of goodwill).
Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. You need two things for a report: a picture file of the drawing as it looks now, with its
key to the colors, and the numbers the program worked out for each character in a file Excel can
open."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t13--fraud-analyst/. Every run replays from the start screen; the
prefix PREFIX below stands for:
`timeout 120 node app-b/study.mjs --try <render> task:r8-t13 --click "No thanks" --click "Les Miserables"`

## Steps

01 -- Start screen (shots/tasks/r8-t13/01.png). A banner asks to share usage data. "No thanks."
Samples on the right; Les Miserables is the first one. "Files are read on this computer and never
uploaded" -- good, that's my first question answered.

02 -- `PREFIX` -> 02.png. A lot on screen: a long list on the left (PageRank, Louvain, Shortest
paths, Watchlist...), a drawing, settings on the right. There's a key in the top corner,
"Color: PageRank 0.00330 to 0.0754". I don't know what PageRank is, but it is the key, and the
task says "as it looks now", so I leave it. No Export button anywhere I can see. File menus live
top-left, so I try the menu icon.

03 -- `PREFIX --hover "Menu" --click "Menu"` -> 03.png. Tooltip "Main menu". Menu has New, Open,
Save, "Export... Ctrl+E". That's the word I want.

04 -- `PREFIX --click "Main menu" --click "Export..."` -> 04.png. Dialog: Image .png, "Full graph,
with the legend", preview with the key in its corner. "Saved to this computer only; nothing is
uploaded." Good. "64 labels hidden to avoid overlap" -- on a real case I'd want names on it, but
not today.

05 -- `... --click "Export"` -> 05.png. Toast: "Exported les-miserables.png to Downloads". Picture
done.

06 -- `... --click "Export" --click "Main menu" --click "Export..." --click "Data"` -> 06.png.
I meant the "Data" row in the dialog's left list. (The tool reported four things called
"Data" and clicked one behind the dialog; in real life I'd have clicked the right one, so I went
by keyboard instead.)

07 -- `PREFIX --click "Main menu" --click "Export..." --click "Image" --key ArrowDown x4` ->
07.png. Data, CSV. Excel opens CSV, fine. But it's set to "Table: Edges", "254 edges". I want one
row per character -- 77. Lots of fine print about rank and tie columns; I skip it.

08 -- `... --click "Nodes" --click "Every column"` -> 08.png. Tool could not tell which "Nodes"
I meant (there's a Nodes tab under the drawing too). Nothing changed.

09 -- `... --click "Every column" --key Shift+Tab --key Shift+Tab --key ArrowRight` -> 09.png.
"Every column" took ("every attribute and run result" in the header). But Shift+Tab went to the
Copy button at the bottom, not back up to Table. Still Edges.

10 -- `... --click "Every column" --click "Adjacency" --key ArrowLeft` -> 10.png. Clicked
Adjacency to get near Nodes, arrow left did nothing. Now a yellow box: "CSV cannot hold
everything -- an adjacency table holds who links to whom ... every node attribute and run result
is not written." So that's the wrong one, and the Columns choice has vanished.

11 -- `... --click "Adjacency" --key Shift+Tab --key Enter` -> 11.png. I expected Enter to pick
Nodes. It EXPORTED instead: "Exported les-miserables_adjacency.csv to Downloads". The one file the
dialog had just warned me has none of the numbers. Now there's a wrong file in my Downloads and
nothing asked me first. That's the kind of thing that ends up attached to a case by mistake.

12 -- Gave up on that dialog. `PREFIX --click "Table"` -> 12.png. The Table at the bottom opens:
"77 nodes", label, group, Degree, Rank by degree, PageRank, Rank by PageRank... This is the
spreadsheet I wanted to see in the first place. There's a "..." next to "Columns: 9 of 9".

13 -- `PREFIX --click "Table" --hover "Table actions" --click "Table actions"` -> 13.png. Nothing
called that.

14 -- `PREFIX --click "Table" --hover "More" --hover "Table options"` -> 14.png. "More": nothing.
"Table options": that's its name.

15 -- `PREFIX --click "Table" --click "Table options"` -> 15.png. Menu: "Time slider" (greyed),
"Export table as CSV...". There it is.

16 -- `... --click "Export table as CSV..."` -> 16.png. The same Export dialog, but already set to
Nodes, 77 rows, "9 of 9, as the table's Columns shows them". So this is what the main menu should
have opened to.

17 -- `... --click "Every column" --click "Export"` -> 17.png. I pick Every column -- I'd rather
delete a column in Excel than have the reviewer ask for one I didn't send. Toast: "Exported
les-miserables_nodes.csv to Downloads". Done.

## Did I succeed?

Yes, I think so: les-miserables.png with the key, and les-miserables_nodes.csv with 77 rows.
I also have a stray les-miserables_adjacency.csv I didn't want, which I'd have to delete.
I haven't opened the CSV, so I'm trusting it has the PageRank and rank numbers the table shows.

Single Ease Question: 5 of 7. The picture was easy. The numbers took a detour.

## What got in my way

- Main menu > Export > Data opens on Edges (254 rows), not the characters. The task is about
  characters; I had to go find the table to get the right setting.
- Enter on the table-type buttons exported the file instead of choosing an option. No
  confirmation, wrong file saved -- right after a warning that it was the wrong file.
- Arrow keys don't move between Edges / Nodes / Adjacency, and Shift+Tab jumped to Copy. I use the
  keyboard a lot; this dialog fought me.
- The dots button by the table has no visible name; I only found "Export table as CSV" by guessing.
- The picture hides 64 of 77 names. For a case file I'd need them, or at least the ones that matter.
- The key says "PageRank" with no plain words. If I paste that into a report, my reviewer asks
  what it is and I can't answer.

## What was good

- "Nothing is uploaded" said in the dialog, and "Local only" at the top. That's the first thing I
  would be asked.
- The image comes with the key built in. I don't have to screenshot and crop in Paint.
- The table's own export lands on exactly the 77 rows I see. Rank as "#1 of 77" is readable.

## Would I use this instead of my current tool?

Not instead. For a case that needs a picture plus the numbers, this beats i2 on getting a picture
with the key out, and the CSV goes straight into Excel, which is where I'd do the real work
anyway. But Excel is still where the analysis happens, so this would sit next to it, not replace
it -- and only on the few cases with enough linked accounts to need a picture. And nobody asks me;
IT would. "Fine" is the word.
