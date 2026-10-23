# Session r3-s06 -- Alex (intermediate analyst), task T15 prompt A (Les Miserables)

Participant: Alex, data analyst, Gephi habit, NetworkX for numbers, mild red-green color deficiency.
Task: first sitting with the bundled Les Miserables network: get it on screen, have the program
work out which characters matter most, make dots bigger for those that matter more, get names
on the drawing, finish with a picture file with its key; say what sizes and colors stand for.

T=design/ui/studio/tool; S=rounds/round-3/sessions/r3-s06

## Step 1 -- start

Command: `node $T/real.mjs --start $S empty` -> 01.png
Saw: a start page. "Open project or file...", "New from data...", "Files are read on this computer
and never uploaded", a "Local only" lock top right. Samples list on the right with Les Miserables
(77 characters). A usage-data banner at the bottom.
Alex: "OK, 'never uploaded' right where you load, and 'Local only' up top. That's the first thing I
look for. Good. I'll say no to the usage data -- not sharing anything from a work laptop."

## Step 2 -- decline usage data

Command: `--step $S --click "No thanks"` -> 02.png
Saw: banner gone, same start page.
Alex: "Now the sample. Les Miserables, 77 characters -- I know that one from the NetworkX docs, 77
nodes, 254 edges. Let's see if the counts match."

## Step 3 -- open the sample

Command: `--step $S --click "Les Miserables"` -> 03.png
Saw: the network drawn, all dots the same blue, no names. Right panel "Overview": Nodes 77, Edges 254,
"Undirected, from the file: directed 0", Density 0.08681, Components 1, "Edges per ... 1 to 36, mean
6.597". Bottom left: "Analyze (flask) in the toolbar (Shift+A) to add results here". Bottom toolbar:
flask, a chart icon, "3D", a magnifier.
Alex: "77 and 254. That matches NetworkX. Good, it's on screen -- part one done. No hairball, it's a
readable shape. Now 'who matters most'. The hint says Analyze is the flask. I'd rather type
'betweenness' but let's open it."

## Step 4 -- open Analyze

Command: `--step $S --click "Analyze"` -> 04.png
Saw: a popup list with a "Filter analyses" box (focused), heading "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS,
All-pairs distance, Depth-first order (grayed, "Select a node first"), Most flow... Each has a
one-line description.
Alex: "There's a search box, good. PageRank says 'Start here' but for 'who matters' in a story I'd
go betweenness -- who holds the story together, and it's what I'd defend to a director. Typing it."

## Step 5 -- run Betweenness

Command: `--step $S --type "betweenness" --key Enter` -> 05.png
Saw: Enter opened a Betweenness card, not a run: description, "Advanced" (collapsed), "Under a
second", a blue "Run" button. Drawing unchanged.
Alex: "'Under a second' -- nice, that's the thing I always want to know before I click. Enter
didn't run it, it just picked it. One more click then. Leaving Advanced alone."

## Step 6 -- Run

Command: `--step $S --click "Run"` -> 06.png
Saw: the dots turned orange; one dot in the middle and one at the bottom are darker brown. A key
top left of the drawing: "Color: Betweenness", a bar from 0 to 1624. Left list gained
"Betweenness 77" with an orange swatch, above "Everything".
Alex: "OK, it ran and it actually painted the graph, with a key. 1624 at the top -- that's raw, not
normalized; in NetworkX the top one, Valjean, is about 0.57 normalized, and 0.57 times 76*75/2 is
about 1624. So it matches. Fine, 'which characters matter most' is worked out. But honestly
the colors are nearly all the same orange -- I can only pick out two dark ones. That's why I want
size. Next: make the big ones bigger. I'll click the Betweenness row on the left and see what it
offers."

## Step 7 -- open the Betweenness row

Command: `--step $S --click "Betweenness"` -> 07.png
Saw: right panel switched to "Betweenness", Measure "from Betweenness, Oct 7", tabs Style / Values,
Nodes / Edges. Rows: Fill (+), Color = "Betweenn..." swatch (-), Shape (+), Effects (+), Label (+),
Tooltip (+).
Alex: "There's no 'Size' row. Size is probably under Shape -- in Gephi it's its own tab, but fine.
I'll hit the plus next to Shape."

## Step 8 -- plus next to Shape

Command: `--step $S --click-at 1419,234` -> 08.png
Saw: a small menu: "Size", "Shape".
Alex: "There it is. Size."

## Step 9 -- Size

Command: `--step $S --click "Size"` -> 09.png
Saw: a "Size by attribute" picker: Find an attribute box, "Fixed size" (highlighted), group
"Betweenness": Betweenness, Betweenness rank, Betweenness percentile; then "Cannot be used: Holds
groups, not amounts": id, name (grayed).
Alex: "Good, it even tells me why name is grayed out. Plain Betweenness -- same number as the
color, so one key covers both."

## Step 10 -- size by Betweenness

Command: `--step $S --click-at 1208,416` -> 10.png
Saw: one big dark dot in the middle, one medium at the bottom, a few slightly bigger ones, the rest
small. New row "Size: 1 to 3". The key now has two entries: "Size: Betweenness 0 .. 1624" with a
wedge, and "Color: Betweenness 0 .. 1624".
Alex: "That's what I wanted -- now you can actually see the hub. Size done. Both size and color
are betweenness, the key says so. Now names. There's a 'Label' row with a plus."

## Step 11 -- plus next to Label

Command: `--step $S --click-at 1419,332` -> 11.png
Saw: a "Label" picker: Attributes: id, name; Betweenness: Betweenness, rank, percentile.
Alex: "'name', obviously."

## Step 12 -- label by name

Command: `--step $S --click-at 1117,502` -> 12.png
Saw: names appear above the dots (Myriel, Fantine, Valjean, Napoleon, Gervais...). They are very
small, and in the dense middle they overlap. Label row: "Aa Above", "Abc name"; under it "77
labels, 7 hidden" and a "Show all labels" checkbox.
Alex: "Names are on. Tiny, but they're there. '7 hidden' -- at least it tells me, I hate when stuff
just disappears. For a slide I'd want everybody named, and the middle will be a mess either way.
Let me tick 'Show all labels' and see how bad it gets."

## Step 13 -- Show all labels

Command: `--step $S --click "Show all labels"` -> 13.png
Saw: now "77 labels", checkbox ticked; a few more names appear in the middle (Gillenormand, Mother
Innocent, Mlle Gillenormand). The middle is still a pile of tiny overlapping text, and the label of
the biggest dot (should be Valjean) sits on top of the dot and is barely readable.
Alex: "OK, every name is written. Readable? Middle, no. But that's every network tool. Names part
done. Last thing: a picture file with the key. I'd expect 'Export' in the main menu -- the three
lines top left."

## Step 14 -- main menu

Command: `--step $S --click-at 23,20` -> 14.png
Saw: menu: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save
local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.
Alex: "Export, Ctrl+E. Good, I'll remember that one."

## Step 15 -- Export

Command: `--step $S --click "Export..."` -> 15.png
Saw: Export dialog, Image tab: "A picture of the drawing, 2x, PNG", Preset "To share -- PNG, 2x",
View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background Canvas color/
Transparent. A preview thumbnail -- I can see the key's little box top left in it. Footer: "Saved
to this computer only; nothing is uploaded." Buttons Cancel, Copy, Export.
Alex: "The preview has the key in the corner, good -- in Gephi I'd have to stitch the legend in by
hand in PowerPoint. PNG 2x is fine for a slide. Export."

## Step 16 -- Export the PNG

Command: `--step $S --click "Export"` -> 16.png
Tool output: `a file was saved: les-miserables_current-view.png, 1806 x 1720 (downloads/...)`
(it also printed `ambiguous: "Export" matches 2 controls ... took the first` -- the button and the
dialog share the name).
Saw (app): toast "Exported les-miserables_current-view.png" with a close X; dialog closed.
Saw (the file, opened as Alex would): a light-gray picture of the network with a white key box top
left: "Size: Betweenness" wedge 0 .. 1624 and "Color: Betweenness" orange-to-dark-brown bar 0 ..
1624, in large clear type. All names are written, but the name text on the drawing is small and
soft/blurry next to the crisp key; in the middle many names overlap, and the biggest dot's name
(Valjean) is drawn on top of the dot and cannot be read. Myriel and Fantine read fine.
Alex: "File's there, with the key baked in. That's the picture part done -- I can paste that. The
names are fuzzy at slide size though, and the one name everyone wants -- the big guy in the
middle -- I can't read. I'd have to type 'Valjean' on the slide myself."

## Step 17 -- end

Command: `node $T/real.mjs --end $S`

## Debrief (in character)

**Did I finish?** Yes, every part:

- On screen: step 3 (77 nodes, 254 edges, matches NetworkX).
- Who matters most: step 6, betweenness, under a second. Top value 1624, which matches NetworkX's
  unnormalized betweenness for Valjean.
- Bigger dots for the ones that matter more: step 10 (Size -> Betweenness).
- Names on the drawing: step 12, all 77 after step 13.
- Picture with its key: step 16, a PNG with the key in the corner.

**What the sizes and colors stand for:** both are betweenness -- how often a character sits on the
shortest route between two other characters, from 0 to 1624. Bigger and darker means more of those
routes go through them: Valjean in the middle by far, then Myriel (bottom) and Fantine (top). The
color says the same thing as the size, so only the size really helps me; the orange shades are
nearly all alike except the top two or three.

**Rating: 6 out of 7.** 16 actions, nothing went wrong and I never had to back out. It was quicker
than Gephi, and the key coming out with the picture saves me a step every month.

What took longest or confused me:

- Enter in the analysis search picked Betweenness but did not run it; I had to click Run as well.
  The "Under a second" estimate was worth the stop.
- There is no "Size" row in the style panel. Size is hidden behind the plus next to "Shape". I found
  it on the first guess, but only because Gephi trained me to look for size near shape.
- The values are raw, not 0-to-1. I could match them to NetworkX only because I did the arithmetic in
  my head. A director will ask "1624 what?".
- In the exported picture, the names are small and blurry compared to the crisp key, the middle is
  a pile of overlapping names, and Valjean's name sits on top of his own dot and cannot be read. For a
  slide that is the one name that matters.
- Color and size both default to betweenness, so the color adds nothing. Orange to brown is fine for
  my eyes (no red against green), but the middle shades all look the same.
- Small thing: the "Export" menu item, the dialog title and the button all say "Export".
