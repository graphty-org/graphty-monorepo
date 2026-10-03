# Session: export a picture with its key and the numbers as a spreadsheet file (Les Miserables sample)

Participant: Dev, the student with a class project (study/personas/class-project-student.md)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. You need two things for a report: a picture file of the drawing as it looks now, with its
key to the colors, and the numbers the program worked out for each character in a file Excel can
open."

Renders: tmp/round-8-sessions/r8-t13--class-project-student/NN.png
All commands were run from design/ui/prototype. P below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t13--class-project-student

## Steps

### 1. Start screen (shots/tasks/r8-t13/01.png)

"I read the whole screen. On the left: Start, Open project or file, New from data. In the middle:
Recent projects, which is empty. On the right are Samples, and Les Miserables is the first one,
'77 characters'. Good, that's the one the task means. A big box at the bottom asks about usage
data. I don't want to think about it, so: No thanks."

### 2. Open the sample

    timeout 120 node app-b/study.mjs --try P/02.png task:r8-t13 --click "No thanks" --click "Les Miserables"

"It went straight to a drawing. Orange dots with names on the big ones (Valjean, Javert, Marius,
Fantine). In the top corner is a little box, 'Color: PageRank, 0.00330 to 0.0754', with an orange
to brown bar. That must be the key to the colors. On the left is a long list (PageRank, Louvain,
Shortest paths, Density, a folder called For the report...). I have no idea what half of it is,
but I don't need it. The task says 'as it looks now', so I won't touch anything. Now I need to save
it. In Gephi the word is Export, so I'm looking for that."

### 3. Look for Export

    timeout 120 node app-b/study.mjs --try P/03.png task:r8-t13 --click "No thanks" --click "Les Miserables" --hover "Menu"
      (tooltip: "Main menu")
    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu"

"The three lines at the top left are the 'Main menu'. It looks like a File menu: New project, Open,
Save, Export... Ctrl+E. There it is."

### 4. Export the picture

    timeout 120 node app-b/study.mjs --try P/05.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..."

"A box called Export. Image is already picked: 'Image .png -- Full graph, with the legend'.
'Legend' is the key, so that's what I want. The preview is small, but I can see the key box in
its corner. It says '64 labels hidden to avoid overlap', which bugs me a bit. Will my picture only
have some names? The screen only shows some names too, though, so I guess that IS how it looks
now. Preset 'To share -- PNG, 2x' is fine. Export."

    timeout 120 node app-b/study.mjs --try P/06.png task:r8-t13 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Export..." --click "Export"

"Message at the bottom: 'Exported les-miserables.png to Downloads'. One down."

### 5. Try to export the numbers from the same box (blocked by the test tool, not by the app)

    timeout 120 node app-b/study.mjs --try P/07.png task:r8-t13 ... --click "Main menu" --click "Export..." --click "Data"
      (the tool reported "Data" matches 4 controls, tried the left rail's Data button behind the
      dialog, and timed out; the dialog stayed on Image)
    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t13 ... --click "Main menu" --click "Export..." --click "option Data"
      ("nothing on screen is called "option Data"")

"The Export box had a 'Data' choice on its left, so I opened it again and clicked Data." The
click did not go through. That is a limit of the test tool: the left rail also has a button
called Data. A real person would have landed on the Data page here. Dev did not see the problem.
For him it was just a click that did nothing, so he tried somewhere else.

### 6. Find the numbers in the table instead

    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t13 ... --click "Export" --click "Table"

"There's a 'Table' button at the bottom. Numbers live in tables. It opened a spreadsheet-looking
thing: label, group, Degree, Rank by degree, PageRank, Rank by PageRank... '77 nodes', one row per
character. These are the numbers. Now how do I get them out? There's a '...' next to 'Columns: 9
of 9'."

    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t13 ... --click "Table" --hover "More"
      ("nothing on screen is called "More"")
    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t13 ... --click "Table" --hover "Table actions"
      ("nothing on screen is called "Table actions"")
    timeout 120 node app-b/study.mjs --try P/11.png task:r8-t13 ... --click "Table" --hover "options"
      (matched three buttons; showed "List options"; the one for the table is "Table options")
    timeout 120 node app-b/study.mjs --try P/12.png task:r8-t13 ... --click "Table" --click "Table options"

"I hovered the three dots and it's 'Table options'. The menu has two things: a grayed-out Time
slider and 'Export table as CSV...'. We used CSV in class, and Excel opens it."
(Side note: opening that menu also switched the right panel from PageRank to the graph's summary.
I didn't ask for that, but it didn't matter for my task.)

### 7. Export the CSV

    timeout 120 node app-b/study.mjs --try P/13.png task:r8-t13 ... --click "Table options" --click "Export table as CSV..."

"It's the same Export box, now on 'Data'. So that's what the Data choice was. 'Full graph, 77
nodes, 254 edges -- the columns the table shows -- CSV.' Then a section, 'What is written', that I
mostly can't follow: 'Ids: As loaded, never renumbered: "0" stays Myriel's id', 'Run columns ...
betweenness (full graph, exact)', and a Rank paragraph about ties and 'sampled from 20 sources'.
Then options: Table Edges / Nodes / Adjacency, File shape Generic / Neo4j, Columns 'Shown in the
table' or 'Every column'. Nodes and CSV are already picked, which is what I want. I almost clicked
'Every column' to be safe, because 'the numbers the program worked out' might include more than
what's showing. But the table already had degree and PageRank, so I left it. Export."

    timeout 120 node app-b/study.mjs --try P/14.png task:r8-t13 ... --click "Export table as CSV..." --click "Export"

"'Exported les-miserables_nodes.csv to Downloads.' Done."

## Outcome

- Did I succeed? "Yes, I think so. I've got les-miserables.png with the color key on it and
  les-miserables_nodes.csv with a row for every character." Not checked: whether the CSV holds
  every number the program worked out (the left list also has a hidden Betweenness entry, and
  the table showed 9 columns), and whether the PNG's missing labels matter for the report.
- Single Ease Question: 6 of 7. "The picture was easy. The spreadsheet took a detour because the
  Data choice in the Export box didn't respond for me. The table route worked, though, and the
  dialog after it was full of words I don't know."
- Would I use this instead of my current tool (Gephi, from the class tutorial)? "For this, yes.
  The sample opened already colored with a key, and the picture export puts the key in by itself.
  In Gephi I'd have to sort that out in Preview. I'd only trust the CSV after opening it in Excel,
  though, because I couldn't tell which numbers 'Shown in the table' leaves out."

## Observations for the designers (in Dev's words where possible)

1. Picture export was found on the first try: Main menu, Export..., and Image comes with "with the
   legend" already picked. No problem.
2. "64 labels hidden to avoid overlap" in the image preview made me unsure the picture would be
   good enough. There was no obvious "keep all names" choice next to it, only "show list".
3. The CSV export dialog's "What is written" block (Ids, Run columns, Rank with sampled ranges)
   is written for a data person. A student skips it and has to guess between "Shown in the table"
   and "Every column". He can't tell which one has "all the numbers".
4. The table's "..." only says "Table options" when you hover it. It's easy to find once you look
   there.
5. Opening the table's options menu changed what the right panel showed (from the PageRank
   inspector to the graph summary). That was unexpected, but it did no harm.
6. Study-tool note, not an app finding: the --click "Data" inside the Export dialog could not be
   targeted, because the left rail's Data button matches first. It forced a detour that a real
   participant would probably not have taken.
