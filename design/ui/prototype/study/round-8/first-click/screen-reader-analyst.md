# First-click test -- Morgan Reyes (screen-reader analyst)

Each answer is from one still render, read the way a sighted colleague would describe it to me.
I cannot hear tooltips in a picture, so icon-only buttons are guesses, and I count each one
against the tool. Confidence is 1 (pure guess) to 7 (certain).

## r8-fc01 -- see it working on something right away (start page)
Click: "Les Miserables" in the Samples list (77 characters).
Confidence: 6
The line "Files are read on this computer and never uploaded" answers my first question before I
ask it, which is the right order. The samples list says what each one is good for, in words. I
would have to get past the usage-data box at the bottom first; if focus lands in that box before
anything else, I answer "No thanks" and move on. Not a bad first minute.

## r8-fc02 -- bring in my spreadsheet from Downloads (start page)
Click: "Open project or file..." (Ctrl+O).
Confidence: 5
I would press Ctrl+O rather than click; it is printed next to the command, good. "New from
data..." is the other candidate and I cannot tell from the words which one is for a raw edge
list and which is for a saved project. Two names that both sound like "bring a file in" -- I
picked the one with a keystroke.

## r8-fc03 -- work out which characters the story depends on most
Click: the flask icon, first button in the floating toolbar at the bottom of the drawing.
Confidence: 2
There is no word "Analyze" or "Measures" anywhere I can click, except the small link
"from Analyze" under PageRank on the right, which looks like it explains where PageRank came from
rather than starting something new. A flask means "experiment" or "lab" to most people, so I
guess it is where the measures live. If its button has no spoken name, this is a dead end.
And I would want to know whether "depends on most" means degree, betweenness or PageRank, and
whether betweenness is normalized.

## r8-fc04 -- pick out circles of characters who keep turning up together
Click: the "Louvain -- 6 groups" row in the left list.
Confidence: 4
Louvain is a community method I know from NetworkX, and the row says 6 groups, so it seems to be
done already. If the task means "run it fresh", I would go to the flask icon instead, same guess
as before. I would also ask whether the six groups come back the same on a second run.

## r8-fc05 -- every character's name beside its dot ("Everything" selected)
Click: the "+" beside "Label" in the right-hand panel.
Confidence: 5
"Everything" is selected and the panel says it paints 77 nodes, 254 edges; Label with a plus is the
obvious place. "Labels show... 1 node" in the left list is a second candidate that sounds like the
same job. I would not know which one wins.

## r8-fc06 -- bigger dots for the characters this measure scores highest (PageRank selected)
Click: the "+" beside "Shape" in the right-hand panel.
Confidence: 4
Size is not listed by name. On the previous screen Size sat under Shape, so I go there. If size
is not under Shape for a measure, I have no other word on this screen to follow.

## r8-fc07 -- arrange the dots a different way
Click: the "..." button next to "Find rows and notes" at the top of the left list.
Confidence: 2
Nothing here says "layout" or "arrange". The bottom toolbar is five unlabeled icons (flask, play,
cube, list, lightning); play might restart the arrangement and cube might be 3D, but neither says
"a different way". I would tab through and listen for a name. Honestly, a guess.

## r8-fc08 -- jump straight to Javert
Click: the "Find rows and notes" search box at the top of the left list.
Confidence: 4
It is the only search field. "Rows" could mean my data rows or the rows of this list of layers;
if it only searches the layer list, Javert will not be found and I would open the Table at the
bottom and look there instead.

## r8-fc09 -- a picture of the drawing for a slide
Click: the menu button with three lines at the very top left.
Confidence: 3
Export usually lives in the main menu. Nothing on the screen says "export" or "image". A colleague
would make the picture for me anyway, but they would need to find it here too.

## r8-fc10 -- the numbers for each character, in Excel
Click: "Table" at the bottom left of the drawing.
Confidence: 5
A table is where I trust numbers. I expect to open it and then find an export or copy in the
"..." at the bottom right beside "Columns: 9 of 9". If the table cannot be copied as text, I
fall back to the main menu.

## r8-fc11 -- stop now, pick up tomorrow exactly as it is
Click: the menu button with three lines at the top left (I would press Ctrl+S first).
Confidence: 3
I see no "Save" and no saved/unsaved status in words. The project name "Les Miserables" has a
dropdown arrow and might hold save too. "Local only" tells me where it lives but not whether it is
saved. Recent projects on the start page "are kept in this browser", which makes me nervous about
whether clearing the browser loses my work.

## r8-fc12 -- check the whole file came through
Look: the line at the top of the table, "Les Miserables: 77 nodes, 254 edges".
Confidence: 6
That is exactly the summary I want first. The list on the left repeats it (nodes 77, edges 254,
both with a check mark) and the "Match report" at the bottom says every id is unique. What I
cannot see is what the file itself claimed, so 77 agrees with the tool, not necessarily with the
file. "Showing the first 8 of 77 rows" -- I hope the rest are reachable with the arrow keys.

## r8-fc13 -- who this character is directly tied to (Valjean selected)
Click: the "Data" tab in the right-hand panel.
Confidence: 3
"Valjean, 36 connections" is written under the drawing, which is good, but the buttons that pop up
with it are five unlabeled icons (a target, a path, a check with sparkles, a crossed-out eye, a
speech bubble). The target might select the neighbors. I go for the Data tab because I want the 36
names as text, not as highlighted dots. If the Data tab holds only Valjean's own attributes, the
target icon is my second try.

## r8-fc14 -- this month's transfers file in place of last month's, keeping everything
Click: the "..." beside "transfers-2026-03.csv" under Sources.
Confidence: 5
The file is listed as a source with its own menu, so replace should be in there. I would want it
to tell me, in words, what changed: how many transfers added and dropped, and whether my Louvain
result and filter still apply or need re-running.

## Overall
The text parts carry the screen: counts in words, "Local only", the summary panel. The floating
toolbars are all icon-only and I lost confidence every time an answer depended on one. Would I use
this instead of my scripts? For a first look at an unfamiliar file, maybe. For anything I report,
not until I know what each measure computed and with which settings.
