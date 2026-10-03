# Session: first sitting with the Les Miserables sample -- Ruth, the reporter with a contacts sheet

Task as given by the moderator: "You have never used this program before. A friend said it turns a
list of connections into a picture that shows who matters and how people cluster. You have no file
of your own today, so you will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program. In one sitting: get that network on screen, have the
program work out something about the characters (for example who matters most, or which of them
belong together), make the drawing show that result in its colors or sizes, get the characters'
names written on the drawing, and finish with a picture file you could paste into a document. Say
out loud when you think each part is done."

Start screen: shots/tasks/r8-t01/01.png. Renders are in tmp/round-8-sessions/r8-t01--data-journalist/.
Every command was run from design/ui/prototype; each one replays from the start screen.
`$D` below is `$PWD/tmp/round-8-sessions/r8-t01--data-journalist`.

## Step 1 -- start screen (01.png)

Think-aloud: "OK. Open a file, New from data, and on the right a list of samples. Les Miserables,
77 characters -- that's the one. There's a big box at the bottom asking to collect how I use the
app. 'We will never see the data you analyze' -- I'll take your word for nothing. No thanks. Good
that it says files are read on this computer and never uploaded; I'll want that for real names."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

"There it is. A web of dots, a few names -- Valjean, Javert, Cosette, Marius. And a lot of stuff
on the left I didn't ask for: PageRank, Louvain, Shortest paths, Watchlist, 'For the report'... The
sample card did say it opens with worked examples. It's already colored, 'Color: PageRank, 0.00330
to 0.0754'. I don't know what PageRank is beyond Google.

**Part one, network on screen: done.**

But I'm supposed to have the program work something out myself. I'm not printing a number someone
else computed before I got here."

## Step 3 -- looking for where you compute things (03.png, 04.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    -> tooltip: "Analyze Shift+A"
    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

"The panel on the right says 'Measure from Analyze', so I went looking for something called
Analyze. The little flask at the bottom of the picture is it. A list: PageRank 'Start here',
Degree, Total value, Betweenness -- 'Which nodes sit on the most shortest paths between others.'
That's my question exactly: who sits in the middle of many chains. Betweenness."

## Step 4 -- run Betweenness (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness"
    -> the click went to the Betweenness row in the left list behind the dialog and timed out
    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"
    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"Settings page. Weight 'value (loaded weight)', 'Higher means Stronger / Farther / Capacity'. I
don't know what I'd change, and it says all 254 edges have a value and none is left out -- good,
that's the kind of thing I want told. 'Betweenness reads a weight as distance: it uses 1/value.'
Fine, whatever. It says under a second. Run.

A new row 'Betweenness 2' appeared at the top of the list with a spinning circle and a blue
bar. The picture didn't change. Why '2'? Is there already a Betweenness? ... Yes, at the bottom,
under 'For the report', with a crossed-out eye. So which one is mine?"

## Step 5 -- trying to see my result (07.png - 09.png)

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t01 ... --click "Betweenness 2" --hover "More"   -> tooltip "More actions Shift+F10"
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t01 ... --click "Betweenness 2" --click "More actions"

"Clicked the row. It's still spinning, the right side still talks about the whole graph, not
my result. 'Under a second' it said. I tried the three dots and got a menu about the whole graph
-- Select all, Re-run layout, Clear graph data -- and my 'Betweenness 2' row is just gone from the
list. Did it finish? Did it fail? Did it fold into the old one? Nothing told me."

## Step 6 -- the old Betweenness row, 'Move above', the eye (10.png - 14.png)

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t01 ... --click "Run" --key Escape --click "Betweenness"
    timeout 120 node app-b/study.mjs --try $D/11.png task:r8-t01 ... --click "Betweenness" --click "Move above"
    timeout 120 node app-b/study.mjs --try $D/12.png task:r8-t01 ... --click "Move above" --hover "Show"   -> tooltip "Show Betweenness  Alt-click or Alt+Space: show only this row"
    timeout 120 node app-b/study.mjs --try $D/13.png task:r8-t01 ... --click "Move above" --click "Show Betweenness"
    timeout 120 node app-b/study.mjs --try $D/14.png task:r8-t01 ... --click "Show Betweenness" --click "PageRank" --click "Hide PageRank"

"I clicked the old Betweenness. Now it explains itself: 'Paints 77 nodes, none visible. Covered by
PageRank for Color' and a 'Move above' button. OK, that I understand -- PageRank is sitting on top.
Move above. A message: 'Moved Betweenness above PageRank'. But in the list it's still at the
bottom, the eye is still crossed out, the picture is still orange, and the key at the top still
says 'Color: PageRank'.

So I turned its eye on. The panel now says 'Covers PageRank for Color'. The picture: same orange.
The key: still PageRank. Then I hid PageRank itself. Still orange, still 'Color: PageRank'.

The panel says one thing, the picture shows another. For my job that's the worst case: I can't
tell an editor what the colors mean if the program contradicts itself."

## Step 7 -- trying size instead of color (15.png - 21.png)

    timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Color: PageRank"   (clicking the key does nothing new)
    timeout 120 node app-b/study.mjs --try $D/16.png task:r8-t01 ... --click "Show Betweenness" --click "Shape"   (nothing opens)
    timeout 120 node app-b/study.mjs --try $D/17.png task:r8-t01 ... --hover "Add"   -> tooltip "Add to Shape"
    timeout 120 node app-b/study.mjs --try $D/18.png task:r8-t01 ... --click "Add to Shape"   -> menu: Shape, Size
    timeout 120 node app-b/study.mjs --try $D/19.png task:r8-t01 ... --click "Add to Shape" --click "Size"
    timeout 120 node app-b/study.mjs --try $D/20.png task:r8-t01 ... --click "Size" --hover "data"   -> no tooltip
    (loop) --hover "column" / "Bind" / "value" / "Size"   -> no tooltip / nothing called that
    timeout 120 node app-b/study.mjs --try $D/21.png task:r8-t01 ... --click "Size" --click "column"   -> opened the table and its Columns list instead

"Fine, forget color, make the important ones bigger. 'Shape' plus, 'Size'. Now there's 'Size 1'
and a little database-cylinder icon. I assume that's 'size from a column', but resting on it tells
me nothing, and I couldn't find out what it is called. What I did open by accident was the table
at the bottom -- and honestly that's the best thing I've seen: 'Valjean is first on all three
measures; Gavroche is in the top 3 on all three', degree, rank, PageRank, with notes counts.
That's a table a fact-checker can read.

I never got sizes from Betweenness."

## Step 8 -- accept the coloring that was already there (22.png)

    timeout 120 node app-b/study.mjs --try $D/22.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Louvain 6 groups"   -> nothing is called that

"I'll be practical. The drawing is colored by PageRank, which the program says is 'which nodes
are connected to other well-connected nodes' -- that's a version of 'who matters most'. Valjean is
the darkest dot. I didn't make it, it came that way, and my own Betweenness run never reached the
picture.

**Part two, the program worked something out: I think done -- I ran Betweenness and it said under a
second, but I never saw its numbers.**
**Part three, drawing shows a result: only because the sample came pre-colored. Not by me.**"

## Step 9 -- names on the drawing (23.png - 26.png)

    timeout 120 node app-b/study.mjs --try $D/23.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels shown anyway"
    -> message: "Labels shown anyway (this file): Valjean. Opens in the inspector (not available yet)"
    timeout 120 node app-b/study.mjs --try $D/24.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything" --click "Add to Label"   -> menu: Label line, Show labels
    timeout 120 node app-b/study.mjs --try $D/25.png task:r8-t01 ... --click "Show labels"
    timeout 120 node app-b/study.mjs --try $D/26.png task:r8-t01 ... --click "Show labels" --click "Show labels"

"'Labels show... 1 node' -- I clicked it and got 'Labels shown anyway (this file): Valjean ... not
available yet'. No idea what 'anyway' means. 'Everything' at the bottom sounds like the setting
for all dots. Label plus, 'Show labels', a checkbox, ticked. The picture: the same dozen or so
names as before. Nothing changed that I can see.

**Part four, names on the drawing: some names. Not all. I don't know why.**"

## Step 10 -- export (27.png - 32.png)

    timeout 120 node app-b/study.mjs --try $D/27.png task:r8-t01 ... --hover "Menu"   -> tooltip "Main menu"
    timeout 120 node app-b/study.mjs --try $D/28.png task:r8-t01 ... --click "Main menu"
    timeout 120 node app-b/study.mjs --try $D/29.png task:r8-t01 ... --click "Main menu" --click "Export..."
    timeout 120 node app-b/study.mjs --try $D/30.png task:r8-t01 ... --click "Export..." --click "show list"
    timeout 120 node app-b/study.mjs --try $D/31.png task:r8-t01 ... --click "Export..." --click "Print"
    timeout 120 node app-b/study.mjs --try $D/32.png task:r8-t01 ... --click "Export..." --click "Export"
    -> "Exported les-miserables.png to Downloads"

"The three lines at the top left: Export, Ctrl+E. Image .png, 'Full graph, with the legend', a
preview. And here, finally, the answer to the names: '64 labels hidden to avoid overlap'. So 13
of 77 get a name. The list shows who's missing -- Thenardier, Joly, Mabeuf. Thenardier! That's a
main character. There's no button to say 'show them anyway' that I can see. Why tell me this only
in the export box and not when I ticked 'Show labels'?

Print look shows me the gray version, with the legend in gray steps. That's thoughtful -- our
print pages are black and white. 'Saved to this computer only; nothing is uploaded' -- good.
Export. 'Exported les-miserables.png to Downloads.'

**Part five, a picture file: done.** It has the PageRank colors and about a dozen names."

## Verdict

Did I succeed? Partly. I got the network up and a PNG out, and the PNG is colored by a measure and
has some names. But the coloring was the sample's, not mine: the Betweenness I ran never showed up
in the picture, the 'Move above' and the eye changed the words in the panel but not the drawing,
and 64 of 77 names are missing from the picture with no way I found to put them back.

Single Ease Question: 3 of 7.

Would I use this instead of what I have (a spreadsheet, and Gephi on a bad day)? Not yet. Things
I liked: it tells me it never uploads anything, it tells me no edges were left out, the table
with ranks and 'Valjean is first on all three measures' is exactly what a fact-checker wants, and
the black-and-white print preview is smart. But I can't hand an editor a picture whose colors I
can't explain, and today the side panel and the picture disagreed about what the colors were. If
I can't trust that what the panel says is what the picture shows, I can't use it for a story.
