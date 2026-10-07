# Session r3-s07 -- Tom, the lab manager who receives files -- task T15, version B (friends.csv)

Participant: Tom, 52, lab manager, not a network builder, reading glasses, little patience for
software, careful about where data goes. Task: get the running club list (friends.csv) on screen,
find who matters most, make the dots bigger for those people, get names on the drawing, and save a
picture with its key; say what sizes and colors stand for.

Tool: design/ui/studio/tool/real.mjs, session folder rounds/round-3/sessions/r3-s07 (S below).

## Step 1 -- start

Command: `node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png

Saw: a dark page. "Start" with "Open project or file..." and "New from data...", "or drop a file
anywhere in this window", and a small grey line "Files are read on this computer and never
uploaded." Top right "Local only". Samples on the right. A box at the bottom asking to share
usage data.

Tom: "Right. First thing -- the grey line says files are read on this computer and never
uploaded, and it says Local only up top. That's what I'd want to know before putting anything in.
It's tiny print though, I had to lean in. I'm not sharing usage data, so No thanks. Then I'll
open the file -- 'Open project or file' looks like the obvious one."

## Step 2 -- decline usage data

Command: `--step $S --click "No thanks"` -> 02.png. The box went away.

## Step 3 -- open the file

Tom: "Open project or file, then pick friends.csv from Downloads."

Command: `--step $S --click "Open project or file" --upload friends.csv` -> 03.png

Saw: a drawing of blue balls joined by grey arrows, no names. Right side: "Graph, From
friends.csv", Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per
node "3 to 6, mean 4.1". Bottom-left grey text: "Analyze (a flask icon) in the toolbar (Shift+A)
to add results here". A small dark toolbar at the bottom with a flask, a chart-ish icon, "3D" and
a magnifier.

Tom: "Okay, it opened, first try. 41 -- that's how many rows the spreadsheet has, and 20 people,
fine, the counts match. Nobody's name is on it though, it's just blue balls. I don't know what
density is and I'm not going to find out. Now, 'which people matter most'. The note bottom-left
says Analyze is the flask in the toolbar. The flask at the bottom is the only flask, so I'll
press that." (Part 1, getting it on screen: done.)

## Step 4 -- the flask

Command: `--step $S --click-at 680,864` (button "Analyze") -> 04.png

Saw: a list popped up over the drawing, "Rank nodes and edges": Degree, Betweenness, Edge
betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS,
All-pairs distance, and more below, each with a grey line under it.

Tom: "Oh. A list of names I don't know. Katz? HITS? I'm not learning these at 4 pm. But one of
them says 'Start here' -- PageRank. That's the only thing on this list telling me what to do, so
that's the one. Its line says 'which nodes are connected to other well-connected nodes', which
sounds like 'who matters'. I'll take it." (Hesitated here about 20 seconds reading the list.)

## Step 5 -- PageRank

Command: `--step $S --click "PageRank"` -> 05.png

Saw: a small box: "PageRank", "Damping factor 0.85", "Weight None" (a drop-down), "Advanced",
"Under a second", and a blue "Run" button.

Tom: "Damping factor. No idea, and I'm not touching it -- whoever set it to 0.85 knows better
than me. Weight, None. The file has a weight column, I think, but I don't know if that's what it
means, so I leave it. 'Under a second' -- good. Run."

## Step 6 -- Run

Command: `--step $S --click "Run"` -> 06.png

Saw: the balls turned orange, some darker brown. A box top-left of the drawing: "Color: PageRank"
with a bar from 0.04382 (orange) to 0.06608 (dark brown). On the left a new row "PageRank 20"
with an orange-to-brown swatch.

Tom: "Something happened, at least -- they all changed color, and it says 20 next to PageRank, so
all twenty got a number. The key says color is PageRank, from 0.04 to 0.066. Those numbers mean
nothing to me, but darker is higher, I suppose. Honestly the oranges and browns are hard for me
to tell apart -- I can pick out maybe three dark ones near the bottom. So: the program worked out
who matters, I'll call that part done, but the colors aren't doing it for me. The task wants the
dots BIGGER for people who matter more. Nothing got bigger. I'll click the PageRank line on the
left, since that's the thing I just made."

## Step 7 -- click the PageRank row

Command: `--step $S --click "PageRank"` -> 07.png

Saw: the row is highlighted, with an eye icon. The right side changed: "PageRank, Measure from
PageRank, Oct 7", tabs Style / Values, Nodes / Edges, then rows: Fill (+), Color -- PageRank (-),
Shape (+), Effects (+), Label (+), Tooltip (+). Small grey text.

Tom: "Now there's a list on the right. Color says PageRank, so that's the orange. I'm looking for
the word Size and it's not there. Fill, Shape, Effects, Label, Tooltip. Label -- that's probably
the names, I'll come back for that. Size... I suppose how big a ball is might count as its shape?
That's a guess. I'll press the plus next to Shape." (Hesitated: no row says size.)

## Step 8 -- plus next to Shape

Command: `--step $S --click-at 1419,234` (button "Add to Shape") -> 08.png

Saw: a little menu with "Size" (highlighted) and "Shape".

Tom: "There it is -- Size. It was hiding under Shape. Good guess, but a guess. Size."

## Step 9 -- Size

Command: `--step $S --click "Size"` -> 09.png

Saw: a box "Size by attribute" with "Find an attribute", "Fixed size", then under "PageRank":
PageRank, PageRank rank, PageRank percentile. Below in grey: "Cannot be used: Holds groups, not
amounts -- id".

Tom: "'Attribute', fine. Three PageRanks -- plain, rank, percentile. I don't know which is
right; I want the plain one, the same thing the colors are. The grey bit at the bottom about
groups and amounts I'm skipping. PageRank."

## Step 10 -- size by PageRank

Command: `--step $S --click-at 1195,416` (option "PageRank") -> 10.png

Saw: two balls near the bottom middle are now much bigger and dark brown; a few others medium.
The key top-left now has two lines: "Size: PageRank 0.04382 to 0.06608" (a grey wedge) and
"Color: PageRank" (the orange bar). On the right, "Size 1 to 3".

Tom: "Now THAT I can see. Two big ones at the bottom, a couple of middle-sized ones. The key says
size is PageRank too, same numbers as the color. So color and size are both saying the same
thing -- who matters most. That's fine, actually, for my eyes the size is the part that works.
Bigger dots: done. Now the names. 'Label' -- plus."

## Step 11 -- plus next to Label

Command: `--step $S --click-at 1419,332` (button "Add label line") -> 11.png

Saw: a box "Label", "Find an attribute", under "Attributes" only "id", then the three PageRank
entries.

Tom: "There's no 'name' here. Just 'id'. In the spreadsheet the columns were the people's names,
I'm fairly sure -- source and target. Is 'id' the name, or some number the program made up? I'll
try id; if it puts numbers on, that's the wrong one." (Hesitated: the word "id" did not say
"name".)

## Step 12 -- label by id

Command: `--step $S --click-at 1106,470` (option "id") -> 12.png

Saw: names over every ball: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sana, Kofi, Jada, Theo,
Ava, Ivan, Hana, Gus, Ben, Farah, Chloe, Dev, Eli. On the right: "Above, Abc id", "20 labels, 0
hidden", "Show all labels".

Tom: "Right, so 'id' WAS the names. It could have just said names. 20 labels, 0 hidden -- 20
people, all there, good, I like a count. The two big ones are Ava and Farah; Ivan and Hana next.
The writing is small, black on grey, and at the bottom it's a pile-up -- Farah, Chloe, Dev, Eli
are on top of each other and Chloe's name is half under Farah's ball. I can read most of it with
my glasses on. Names: done, mostly. Now a picture file I can paste. I'd look under the menu, the
three lines top-left, like File."

## Step 13 -- main menu

Command: `--step $S --click-at 23,20` (button "Main menu") -> 13.png

Saw: a menu: Back to start, New project, Open project or file..., Open sample, Save, Save as...,
Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help.

Tom: "Save, Save as, Save local copy -- three saves, I don't want any of them, I want a picture.
'Export' is the word Prism uses for a picture. Export."

## Step 14 -- Export

Command: `--step $S --click "Export..."` -> 14.png

Saw: an "Export" box: Image / Data on the left; "Image -- A picture of the drawing, 2x, PNG";
Preset "To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400 x 300, Format PNG/JPEG/WebP,
Background Canvas color/Transparent; a preview of the picture with something small in its top
left corner; "Saved to this computer only; nothing is uploaded."; Cancel, Copy, Export.

Tom: "A preview. I can see a tiny box in the corner of it, which I take is the key, but at that
size I can't read it. 'Nothing is uploaded' -- good. PNG is what goes into PowerPoint. I'm not
touching the rest. Export."

## Step 15 -- Export (the blue button)

Command: `--step $S --click "Export"` -> 15.png. The tool noted the name "Export" matched both
the button and the dialog's title and took the button. A file was saved:
downloads/friends_current-view.png, 1806 x 1720.

Saw: the box closed, a black note at the bottom: "Exported friends_current-view.png". Opening the
saved file: the drawing with the names, and in the top-left corner a white box with "Size:
PageRank" (grey wedge, 0.04382 to 0.06608) and "Color: PageRank" (orange to brown bar, 0.04382
to 0.06608). In the file the key is readable; the names are still small, and at the bottom Chloe
sits on top of Farah's big ball so "Chloe" is half hidden, and Eli and Dev overlap.

Tom: "It says it exported, and it told me the file name. I opened it: there's the picture with
the key in the corner, and the key is readable in the file, which it wasn't in the preview. I'd
paste that into a slide. Picture with key: done. I'd still have to explain to anyone what
'PageRank 0.04 to 0.066' means -- the key tells you which measure, not what it means in plain
words. And the bottom of the picture is a muddle; someone will ask me who's under Farah."

## End

Command: `node design/ui/studio/tool/real.mjs --end $S`

### In Tom's words, at the end

Did I finish? Yes. All five parts: the club on screen (20 people, 41 links, which matches the
rows); the program worked out who matters (PageRank, the one marked "Start here"); the dots are
bigger for the people who matter more; everyone's name is on it; and there's a PNG with a key in
my downloads.

What the sizes and colors stand for: both stand for the same thing, the PageRank number the
program worked out for each person -- bigger and darker brown means more connected to other
well-connected people, the way the list described it. Ava and Farah matter most, then Ivan and
Hana. The colors alone I couldn't have read -- orange to brown all looks alike to me -- it was the
size that told me.

How easy: 5 out of 7. It never broke and it never asked me anything I couldn't answer by
leaving it alone, and it told me twice that nothing gets uploaded, which I look for.

What confused me or slowed me down:
- The list of analyses is a wall of names I don't know (Katz, HITS, Eigenvector). I only got
  through because one said "Start here".
- There was no row called Size. I found it under Shape, by guessing.
- The names were under "id", not "name". I picked it hoping it wasn't a number.
- The key says "PageRank 0.04382 to 0.06608". That's the program's word and the program's
  numbers; I couldn't tell the PI what a 0.06 means.
- Names on the drawing are small, and at the bottom they pile up -- Chloe is half hidden behind
  Farah, Eli and Dev overlap. That carries through into the picture file.
- The preview in the Export box is too small to check the key before saving.
- Three different Saves in the menu; I didn't know which, if any, I'd need to keep this for next
  week. I didn't save the project, so I don't know if it'll look the same if I open the csv again.
