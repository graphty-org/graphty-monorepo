# Session: export a picture with its color key and the per-character numbers (alert reviewer)

Participant: Nadia, level-1 transaction monitoring analyst (study/personas/alert-reviewer.md).
Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. You need two things for a report: a picture file of the drawing as it looks
now, with its key to the colors, and the numbers the program worked out for each character in a
file Excel can open."

Start screen: shots/tasks/r8-t13/01.png. Renders: tmp/round-8-sessions/r8-t13--alert-reviewer/.
Every command was run from design/ui/prototype; `T=tmp/round-8-sessions/r8-t13--alert-reviewer`
and the prefix `timeout 120 node app-b/study.mjs --try $T/NN.png task:r8-t13` are written as `try NN`.

## Steps, thinking aloud

**Start.** Home screen. Open, New, Recent, Samples. A box at the bottom wants me to share usage
data. No thanks, I don't share anything at work. Les Miserables is right there under Samples.

    try 01 --click "No thanks" --click "Les Miserables"

**01.** That's a lot of stuff. A list down the left with PageRank, Louvain, shortest paths,
"Watchlist", "For the report". The drawing in the middle is all orange, and a small box at the top
says "Color: PageRank 0.00330 to 0.0754". I guess that's the key to the colors. I don't need to
understand any of the left list. I need a picture file and a spreadsheet. Pictures are always
under File. I don't see the word File, but there's the three-lines thing at the top left.

    try 02 ... --hover "Menu"          (tooltip: "Main menu")
    try 03 ... --click "Main menu"

**03.** New project, Open, Save, Export... Ctrl+E. Export is the word I wanted.

    try 04 ... --click "Main menu" --click "Export..."

**04.** An Export box. Image, Video, Report (grayed out), Recipe, Data. Image is already picked:
"Image .png -- Full graph, with the legend". Legend, so the color key goes in. I can see it in the
corner of the little preview. It's tiny in the preview, but it's there. "64 labels hidden to avoid
overlap". The screen only shows a few names too, so I take that as "as it looks now". Preset "To
share -- PNG, 2x". I don't care. Export.

    try 05 ... --click "Export..." --click "Export"

**05.** "Exported les-miserables.png to Downloads." Good. Picture done. It didn't ask where to
save, which is fine; Downloads is where I'd look.

**Now the numbers.** That Export box had "Data" on its left side, so I'll go back and click it.

    try 06 ... --click "Export" --click "Main menu" --click "Export..." --click "Data"
    (the tool reported "Data" matches 4 controls and the click timed out)

**06.** The box opened again, but Image was still picked. My click on Data didn't land. There's a
"Data" button on the far left of the screen too, and a "Data" tab on the right. Three Datas.

    try 07 ... --click 'option "Data"'   (nothing on screen is called that)

**07.** No change. OK, forget that box. Down at the bottom there's "Table". The numbers per
character should be in a table, and a table is basically Excel.

    try 08 ... --click "Export" --click "Table"

**08.** Here they are. One row per character: label, Notes, group, Degree, Rank by degree,
PageRank, and more off to the right. "77 nodes", so 77 characters. Now, how do I get it out? The
only menu up here is the "..." next to "Columns: 9 of 9".

    try 09 ... --click "Table" --hover "More"          (nothing called that)
    try 10 ... --click "Table" --hover "Table options"  (tooltip: "Table options")
    try 10 ... --click "Table" --hover "Table menu"     (nothing called that)
    try 10 ... --click "Table" --hover "Options"        (tooltip: "List options"; another button)
    try 11 ... --click "Table" --click "Table options"

**11.** "Time slider -- this data has no time attribute" (grayed) and "Export table as CSV...".
CSV opens in Excel. That's it.

    try 12 ... --click "Table options" --click "Export table as CSV..."

**12.** Oh, it's the same Export box from before, already on Data this time. "Full graph, 77
nodes, 254 edges -- the columns the table shows -- CSV". Then a "What is written" paragraph about
ids, run columns and ranks, "never 4=", "sampled from 20 sources". I'm not reading that. QA
won't ask me about it. Format CSV, Scope Full graph, Table: Nodes. Fine. Columns: "Shown in the
table" or "Every column". The table said 9 of 9, so maybe they're the same? I don't know if
something is left out. On the left, "Betweenness" has an eye with a line through it, so maybe that's
hidden and wouldn't come out? I'll take "Every column" so I can't miss anything.

    try 13 ... --click "Export table as CSV..." --click "Every column"

**13.** The top line changed to "every attribute and run result". Run result must mean the
numbers it worked out, so good. But now a third button, "Hidden columns too", has appeared next to
it. Wait, so "every column" isn't every column? I didn't hide anything, so I'll leave it. There's
also an "Earlier version" box I can't tick. Not my problem. Export.

    try 14 ... --click "Every column" --click "Export"

**14.** "Exported les-miserables_nodes.csv to Downloads." Done.

## Result

- Do I think I succeeded? Yes, mostly. I have les-miserables.png, which the box said includes
  the legend, and les-miserables_nodes.csv with a row per character. I'm not 100 percent sure the
  CSV has Betweenness in it. It was crossed out on the left, and "Every column" turned out not to
  include "hidden columns". I'd open the file in Excel to check before it goes in a report.
- Single Ease Question: 5 out of 7. The picture took four clicks and was easy. The spreadsheet was
  harder. My first try at Data in the Export box went nowhere, I had to find a "..." menu by
  hovering, and then the columns choice changed under me.
- Would I use this instead of what I use now? Not for my alerts. For an alert file I take a
  screenshot of the case system and that's one keystroke. But if someone asked me for a picture
  and the numbers for a report, yes, this beats retyping numbers into Excel. Exporting the table
  straight to CSV is the part I'd actually want. It isn't my decision anyway.

## Problems noticed

1. "Data" appears three times on screen at once: the left rail, a tab in the right panel, and
   the item inside the Export box. My first attempt to pick Data in the Export box did not take,
   and I went the long way round through the table.
2. The only way out of the table is an unlabeled "..." button. I had to hover it to learn it was
   "Table options", and Export is hidden inside it next to a grayed-out "Time slider".
3. Columns: "Shown in the table" versus "Every column" doesn't say what is different. Picking
   "Every column" made a third choice, "Hidden columns too", appear. Now I'm not sure whether
   "every" means every.
4. The "What is written" Rank paragraph (quoted column headers, "never 4=", "sampled from 20
   sources") is for someone else. I skipped it.
5. The legend in the image preview is too small to read, so I am trusting the words "with the
   legend" rather than seeing it.

## What worked

- Main menu > Export... is where I expected it, and Image was already picked with "with the legend"
  stated outright.
- The confirmation messages named the file and the folder ("Exported les-miserables.png to
  Downloads"), so I knew where to find both files.
- The table's Export opened the same Export box already set to the node table, so both files came
  from one place.
