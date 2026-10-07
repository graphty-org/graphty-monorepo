# Session r3-s08 -- Nadia (level-1 alert reviewer), task T15 B (friends.csv)

Participant: Nadia, transaction monitoring analyst, never used a graph tool herself. Patience: about
the length of one alert (five to ten minutes) before she would go back to what she knows.

Task as given: get my running club's friends.csv on screen, have the program work out who matters
most, make the dots bigger for people who matter more, get everyone's name on the drawing, finish
with a picture file with its key. Say what sizes and colors stand for.

Tool: `T=design/ui/studio/tool; S=rounds/round-3/sessions/r3-s08` (run from design/ui/studio).

## Step 1 -- start

Command: `node $T/real.mjs --start $S empty` -> 01.png

Saw: a dark start page. "Open project or file..." top left, "New from data...", "or drop a file
anywhere in this window". Samples on the right. A data-sharing box at the bottom with "Share usage
data" / "No thanks".

Nadia: "Usage data box first -- I'm on a bank laptop, I say no to everything. Then 'Open project or
file' -- that's where my file goes."

## Step 2 -- decline usage data, open the file

Command: `--step $S --click "No thanks" --click "Open project or file..." --upload friends.csv` -> 02.png

Saw: the file opened straight away, no questions. 20 blue dots with arrows, no names. Right panel
says Nodes 20, Edges 41, Directed, Density, Components 1. Bottom left: "Analyze (flask icon) in the
toolbar (Shift+A) to add results here". A toolbar at the bottom middle: flask, a chart icon, "3D",
magnifier.

Nadia: "OK, it's on screen. Part one done -- that was quick. 20 people, matches the club. No names
though. 'Work out who matters most' -- the hint says Analyze, the flask. I'll click the flask."

## Step 3 -- open Analyze

Command: `--step $S --click-at 679,864` (the flask) -> 03.png. Tool: `button "Analyze"`.

Saw: a list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank
(with a "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, ... more below.

Nadia (hesitating): "Lots of words I don't know. Degree is 'how many edges each node has' -- that's
basically 'who knows the most people', which I'd understand. But PageRank says 'Start here', and I
don't know which one my boss would want. I'll do what it tells me: PageRank."

## Step 4 -- PageRank settings

Command: `--step $S --click "PageRank"` -> 04.png

Saw: a small form: "Damping factor 0.85", "Weight: None", "Advanced", "Under a second", a blue Run.

Nadia: "Damping factor -- no idea, leave it. Weight None... the file has a weight column, but I
don't know if 'weight' means how well they know each other. Leave defaults. Run."

## Step 5 -- Run

Command: `--step $S --click "Run"` -> 05.png

Saw: dots turned orange, some darker brown. A key top left: "Color: PageRank 0.04382 [orange bar]
0.06608". Left list now has "PageRank 20" with an orange swatch.

Nadia: "So it worked something out and colored them -- darker means higher? The bar goes from light
orange to dark, so dark brown = matters more, I think. Part two done, sort of. The numbers mean
nothing to me (0.04 to 0.066?). But they asked for BIGGER dots, not colors. Sizes all look the same.
I'll click the PageRank line on the left and see if it lets me change how it shows."

## Step 6 -- select the PageRank line

Command: `--step $S --click-at 155,156` -> 06.png. Tool: `treeitem "PageRank"`.

Saw: right panel switched to "PageRank -- Style": Nodes / Edges; Fill: Color = PageRank (minus);
Shape +; Effects +; Label +; Tooltip +.

Nadia: "Good, here's the look of it. No 'Size' word anywhere. Size of a dot... is that 'Shape'? Label
is surely the names, I'll do that after. Try the plus next to Shape."

## Step 7 -- plus next to Shape

Command: `--step $S --click-at 1419,234` -> 07.png. Tool: `button "Add to Shape"`.

Saw: a small menu: "Size", "Shape".

Nadia: "There it is -- Size, hiding under Shape. Click Size."

## Step 8 -- Size

Command: `--step $S --click "Size"` -> 08.png

Saw: a "Size by attribute" picker: Fixed size; under "PageRank": PageRank, PageRank rank, PageRank
percentile; greyed "id" ("Cannot be used: Holds groups, not amounts").

Nadia: "Size by PageRank -- that's exactly what they asked. 'Rank' and 'percentile' I'd skip, plain
PageRank. Click it."

## Step 9 -- size by PageRank

Command: `--step $S --click-at 1195,416` -> 09.png. Tool: `option "PageRank"`.

Saw: dots now different sizes; two big dark ones near the bottom middle. Size row says "1 to 3". The
key top left now has two rows: "Size: PageRank 0.04382 -- 0.06608" (a grey wedge getting thicker)
and "Color: PageRank 0.04382 -- 0.06608".

Nadia: "Bigger dots for the ones that matter more -- done. Both size and color are the same thing,
PageRank: big and dark = matters more. Now names. 'Label' plus."

## Step 10 -- plus next to Label

Command: `--step $S --click-at 1419,332` -> 10.png. Tool: `button "Add label line"`.

Saw: a "Label" picker: Attributes: id; PageRank: PageRank, PageRank rank, PageRank percentile.

Nadia (hesitating): "No 'name'. Just 'id'. In my world an id is an account number, not a person.
But the file was just names in two columns, so the 'id' is probably the person's name. Try id and
see what shows up."

## Step 11 -- label by id

Command: `--step $S --click-at 1106,470` -> 11.png. Tool: `option "id"`.

Saw: names on every dot: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sam, Theo, Ava, Ivan, Hana, Gus,
Kofi, Jada, Ben, Dev, Eli, Farah, Chloe. Panel says "20 labels, 0 hidden". Small serif text; at the
bottom Chloe's name sits on top of the big dark dot and Farah's name crowds it -- hard to read
there.

Nadia: "Names are on. 'id' was the name after all -- it should just say name. Ava is the biggest and
darkest, and the one at the bottom (Farah? or Chloe? the names overlap) is the second. Now a picture
file. No 'Export' button anywhere I can see. Try the menu at top left."

## Step 12 -- main menu

Command: `--step $S --click-at 23,20` -> 12.png. Tool: `button "Main menu"`.

Saw: menu: Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save
local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Nadia: "Export -- that's the picture. Click it."

## Step 13 -- Export dialog

Command: `--step $S --click "Export..."` -> 13.png

Saw: Export dialog, "Image -- A picture of the drawing, 2x, PNG". Preset "To share -- PNG, 2x", View
"Current view", Size 1x/2x/4x/400 x 300, Format PNG/JPEG/WebP, Background Canvas color/Transparent.
A preview: white picture with the dots and, in the top left corner, a tiny box that looks like the
key. Buttons: Cancel, Copy, Export. "Saved to this computer only; nothing is uploaded."

Nadia: "Nothing here says 'include the key', but the little preview has the key box in its corner,
so I think it's in. 'Copy' is tempting for pasting into the alert file, but they asked for a picture
FILE. Defaults, Export."

## Step 14 -- Export

Command: `--step $S --click "Export"` -> 14.png. Tool: `ambiguous: "Export" matches 2 controls (button
"Export", dialog "Export ..."); took the first` (a tool-naming note, not something Nadia saw), then
`a file was saved: friends_current-view.png, 1806 x 1720` (downloads/friends_current-view.png).

Saw: the dialog closed; a toast at the bottom: "Exported friends_current-view.png". Opening the file:
the drawing with every name, and the key in the top left in a white box: "Size: PageRank" with a grey
wedge, 0.04382 to 0.06608, and "Color: PageRank" with the light-to-dark orange bar, same numbers.
Arrows and names are readable except at the bottom, where Chloe's dot sits in front of the big dark
dot and her name is half covered; Farah's name is small above it. Dev and Eli overlap a bit too.

Nadia: "Picture file, with its key -- done. That's something I could drop in a document."

## Step 15 -- end

Command: `node $T/real.mjs --end $S`

## Wrap-up (in character)

**Finished?** Yes, all five parts: the file was on screen right after opening it; PageRank worked
out who matters; dots sized by PageRank; names on via Label = id; a PNG exported with the key in it.
About 13 clicks and well inside my "one alert" patience -- maybe four or five minutes.

**What the sizes and colors stand for (said out loud):** "Both are PageRank. The bigger and the
darker the dot, the higher that person's PageRank -- which the menu said is 'connected to other
well-connected people'. Ava matters most, then the big dark one at the bottom (Farah, I think --
Chloe's dot is sitting on top of it so I'm not 100 percent sure), then Ivan and Hana. Size and color
say the same thing twice."

**Rating:** 6 out of 7 (easy).

**What confused me or slowed me down:**
- Choosing the measure. The list had about ten words I don't know (Betweenness, Eigenvector, Katz,
  HITS). I only picked PageRank because it said "Start here". Degree ("how many edges each node
  has") I would actually have understood better for "who knows the most people"; I don't know if I
  picked the right one, and QA would ask me why I picked it.
- The key's numbers (0.04382 to 0.06608) mean nothing to me. I can tell bigger = more, but I could
  not write "Ava scored X" in a sentence anyone understands. Something like "higher = more
  important" or a rank would help.
- Size lives under "Shape" behind a plus. I had to guess that; I was looking for a word "Size".
- The label choice was "id", not "name". In my job an id is an account number; I only tried it
  because the file had nothing else.
- I didn't know whether the colors appeared by themselves because of PageRank or because of
  something I did -- they just showed up after Run. Fine, but I never chose them.
- Weight: the file has a weight column and the PageRank form asked "Weight: None". I left it, but I
  don't know if the answer would be different with it, or what my friend meant by weight.
- The export dialog never says "the key is included"; I trusted the tiny preview. It was included.
- In the picture, at the bottom, two names and dots overlap (Chloe on top of the big dark dot,
  Dev/Eli), so the second most important person is the hardest name to read.
