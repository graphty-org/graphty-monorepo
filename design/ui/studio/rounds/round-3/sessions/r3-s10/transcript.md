# Session r3-s10 -- first whole session on my own file (friends.csv, keys only)

Participant: Sam, 20, second-year sociology undergraduate (a social network analysis elective;
two Gephi lab sessions, one of which crashed; knows node, edge, degree; Windows laptop; Ctrl+Z
for everything; low confidence). Has never seen this app.

Task: "A friend kept a list of who in your running club knows whom; it is saved as friends.csv in
your Downloads folder. Get it on screen, have the program work out which people matter most in
the club, make the dots bigger for the people who matter more, get everyone's name written on the
drawing, and finish with a picture file, with its key, that you could paste into a document. Say
out loud when each part is done, and what the sizes and the colors on the drawing stand for."

File used: `Downloads/friends.csv` in this folder -- the club's links spreadsheet with only the two
name columns (`source,target`, 41 rows, 20 people), no weight column.

Commands run from `design/ui/studio`, with `S=rounds/round-3/sessions/r3-s10`.

## Start

`node tool/real.mjs --start $S empty` -> 01.png

Sam: "OK, dark screen. Start, Recent projects, Samples. There's a box at the bottom asking about
my data -- I don't want anyone collecting anything off my laptop, so 'No thanks'. Then 'Open
project or file...' is the obvious one, my file's in Downloads."

### Step 2
`node tool/real.mjs --step $S --click "No thanks"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/02.png
Saw: the banner is gone; the same Start / Recent / Samples page.

Sam: "Now open my file."

### Step 3
`node tool/real.mjs --step $S --click "Open project or file..." --upload $S/Downloads/friends.csv`
a file chooser is open (answer it with --upload <file>)
chose the file friends.csv
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/03.png
Saw: it went straight to a drawing -- 20 blue balls with arrows, right panel says Nodes 20,
Edges 41, Direction Directed, Components 1. No import questions at all.

Sam: "Oh, that was easy. Part one done: it's on screen, 20 people and 41 links. It says
'Directed' -- arrows -- which is a bit weird because knowing someone goes both ways, but I'll
leave it. No names on the balls yet. Bottom left says 'Analyze ... in the toolbar (Shift+A) to add
results here', and the flask at the bottom is probably Analyze. 'Which people matter most' --
that's centrality from class. Click the flask."

### Step 4
`node tool/real.mjs --step $S --click-at 680,864`
at 680,864: button "Analyze"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/04.png
Saw: a list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank
(with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, ...

Sam (hesitates): "Lots of these. I know Degree from lectures -- that's just how many friends you
have. PageRank says 'Start here' and 'which nodes are connected to other well-connected nodes',
which sounds more like 'matters'. I'm not confident, so I'll do what it tells me: PageRank."

### Step 5
`node tool/real.mjs --step $S --click "PageRank"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/05.png
Saw: a PageRank box with "Damping factor 0.85", "Weight: None", "Advanced", "Under a second", Run.

Sam: "Damping factor -- no idea, leave it. Weight None, fine, my list doesn't have any numbers
anyway. Run."

### Step 6
`node tool/real.mjs --step $S --click "Run"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/06.png
Saw: all the balls turned orange to dark brown. Top left of the drawing a little key: "Color:
PageRank 0.04382 [orange-to-brown bar] 0.06608". Left panel now has a row "PageRank 20" between
Selection and Everything.

Sam: "OK, it colored them. So darker brown = higher PageRank = matters more, if I read the bar
right (the dark end is on the 0.066 side). Part two done, I think. The numbers are tiny though;
I wouldn't know what 0.066 means. Now 'make the dots bigger'. There's a PageRank row on the left,
maybe clicking it gives me options."

### Step 7
`node tool/real.mjs --step $S --click "PageRank"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/07.png
Saw: the right panel switched to "PageRank -- Measure from PageRank, Oct 7", Style tab with Nodes /
Edges, then Fill (+), Color = PageRank (-), Shape (+), Effects (+), Label (+), Tooltip (+).

Sam (hesitates): "There's no 'Size' anywhere. Fill, Color, Shape, Effects, Label. Size of a ball
is kind of its shape? I'll try the plus next to Shape."

### Step 8
`node tool/real.mjs --step $S --click-at 1419,234`
at 1419,234: button "Add to Shape"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/08.png
Saw: a small menu: Size, Shape.

Sam: "Size! Good guess."

### Step 9
`node tool/real.mjs --step $S --click "Size"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/09.png
Saw: "Size by attribute" box: Fixed size; under PageRank: PageRank, PageRank rank, PageRank
percentile; "Cannot be used: Holds groups, not amounts -- id".

Sam: "Size by PageRank, obviously. Not sure what rank or percentile would do differently; plain
PageRank."

### Step 10
`node tool/real.mjs --step $S --click "PageRank#2"` (the first "PageRank" is the row in the left list)
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/10.png
Saw: the balls now differ in size -- two big dark brown ones near the bottom, a few medium, most
small and lighter orange. The key on the drawing now has two lines: "Size: PageRank 0.04382 to
0.06608" (a gray wedge) and "Color: PageRank" (orange bar). The right panel shows a new row
"Size 1 to 3".

Sam: "Nice, that's the bigger dots. Part three done: bigger and darker both mean higher PageRank,
so the same thing twice. Now names. 'Label' with a plus -- that must be it."

### Step 11
`node tool/real.mjs --step $S --click-at 1419,332`
at 1419,332: button "Add label line"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/11.png
Saw: a "Label" picker: Attributes -- id; PageRank -- PageRank, PageRank rank, PageRank percentile.

Sam (hesitates): "Hmm, no 'name'. My file is just two columns of names, source and target, so
there isn't a name column. 'id' is the only thing that isn't a number... the ids are probably the
names, Ava and Ben and so on. Try id; Ctrl+Z if it's wrong."

### Step 12
`node tool/real.mjs --step $S --click "id"`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/12.png
Saw: names appear above every ball: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sana, Theo, Ava,
Ivan, Hana, Gus, Kofi, Jada, Ben, Dev, Eli, Farah, Chloe. Right panel: "Label: Above, Abc id",
"20 labels, 0 hidden", "Show all labels" checkbox. Ava is the biggest, darkest ball; Farah (bottom)
is the other big one. Chloe's name sits right on top of Farah's ball, a bit messy at the bottom.

Sam: "Yes! id was the names. Part four done, everyone's named. Ava matters most, then Farah, then
Ivan and Hana. The bottom-left cluster is a bit squashed (Eli and Dev overlap) but readable. Last
thing: a picture file. No Export button visible. The three lines top left are usually the menu."

### Step 13
`node tool/real.mjs --step $S --click-at 24,20`
at 24,20: button "Main menu"
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/13.png
Saw: menu: Back to start, New project, Open project or file..., Open sample, Save, Save as...,
Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Sam: "Export... -- that's the picture."

### Step 14
`node tool/real.mjs --step $S --click "Export..."`
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/14.png
Saw: an Export dialog. Image (selected) / Data. "A picture of the drawing, 2x, PNG". Preset "To
share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400 x 300, Format PNG/JPEG/WebP, Background
Canvas color/Transparent. A preview: the drawing on white with a tiny box in the top-left corner
that looks like the key. "Saved to this computer only; nothing is uploaded." Cancel / Copy / Export.

Sam (squints): "The preview's tiny but there's the little key box in the corner, so it does come
with the key. PNG is what I'd paste into Google Docs. Defaults look fine. Export."

### Step 15
`node tool/real.mjs --step $S --click "Export"`
ambiguous: "Export" matches 2 controls (button "Export", dialog "Export Image Data Image A picture of the"); took the first
a file was saved: friends_current-view.png, 1806 x 1720 (/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/downloads/friends_current-view.png)
/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10/15.png
Saw: toast "Exported friends_current-view.png". The saved file (1806 x 1720) has the drawing with
all 20 names and, top left, a white key box: "Size: PageRank" (a gray wedge, 0.04382 to 0.06608)
and "Color: PageRank" (light orange to dark brown, 0.04382 to 0.06608).

Sam: "Part five done: friends_current-view.png, with the key in the corner. That's what I'd paste
into the doc."

### End
`node tool/real.mjs --end $S`
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s10

## Wrap-up, in Sam's words

**Did I finish?** Yes, all five parts:

1. On screen -- opened friends.csv with "Open project or file..." and it just drew it, 20 people,
   41 links. No questions about columns or separators, which in Gephi is where I always mess up.
2. Who matters most -- Analyze (the flask), then PageRank because it said "Start here". Ava comes
   out on top, then Farah, then Ivan and Hana.
3. Bigger dots -- Style, the plus next to Shape, Size, PageRank.
4. Names -- the plus next to Label, then "id".
5. Picture with its key -- menu, Export..., Export. The PNG has the key in the top-left corner.

**What the sizes and colors stand for:** both are the same thing, PageRank -- roughly how
well-connected someone is to other well-connected people in the club. Bigger and darker brown means
a higher score; small light orange means lower. The key says the scores run from 0.04382 to
0.06608, which I could not explain to anyone in words.

**Rating: 6 out of 7 (easy).** Every step was one or two clicks and nothing broke.

**What confused me or made me hesitate:**

- **Which analysis.** A long list of measures with short descriptions. I know Degree from class; I
  went with PageRank only because of the "Start here" tag. I could not say why PageRank and not
  Degree is "who matters most" in a running club.
- **Size lives under "Shape".** There was no Size row until I guessed that the plus next to Shape
  would have it. That was a guess, not something the screen told me.
- **"id" for names.** My file has no name column, only two columns of names, so the label picker
  offered only "id". I guessed id would be the names and it was, but a newcomer might not.
- **"Directed".** The panel says the network is directed and draws arrows, but "knows" goes both
  ways. Nobody asked me, and the arrows make it look like Ava knows Ben but Ben does not know Ava.
  If I had noticed earlier I would have wanted to change it, and I don't know whether that changes
  who comes out on top.
- **The key's numbers.** 0.04382 to 0.06608 means nothing to a reader of my document. "Higher =
  more central" or a rank would read better.
- **Crowded corner.** Bottom left, Eli and Dev overlap, and Chloe's name sits on top of Farah's big
  ball, in the app and in the exported picture. I left it because I didn't know how to fix it.
- **The colors came on their own.** Running PageRank colored everyone before I asked, so the
  picture ended up saying the same thing twice (size and color). That's fine, but I didn't choose
  it.
