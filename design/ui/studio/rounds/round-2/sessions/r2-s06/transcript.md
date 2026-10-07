# Session r2-s06 -- Mara (Gephi holdout), task T15 Prompt A (Les Miserables)

Participant: Dr. Mara Lindqvist, associate professor, Gephi user since 0.8. Never seen this app.
Task: with the bundled Les Miserables network, get it on screen, have the program work out which
characters matter most, size dots by importance, show names, and export a picture file with its
key. Say when each part is done and what sizes and colors stand for.

## Step 1 -- start

Command: `node tool/real.mjs --start $S empty` -> 01.png

Saw: a start page. Start column (Open project or file, New from data, drop a file), Recent projects
(empty), Samples on the right: Les Miserables (77 characters), Zachary's karate club, College
football, Florentine families. A "Your data is yours, but please help us" usage-data box at the
bottom with Share usage data / No thanks. "Local only" with a lock top right -- good, nothing
uploaded.

Mara: "77 characters. NetworkX's les_miserables_graph has 77 nodes and 254 edges, I'll check the
edge count. First, close the usage box -- No thanks."

## Step 2 -- decline usage data

Command: `--click "No thanks"` -> 02.png. The box closed; the start page is otherwise the same.

Mara: "Now the sample. Les Miserables."

## Step 3 -- open the sample

Command: `--click "Les Miserables"` -> 03.png

Saw: the graph drawn at once, blue shaded spheres with gray edges, on a light canvas. Right panel
"Graph -- From Les Miserables", tabs Style / Values, Overview: Nodes 77, Edges 254, "Undirected,
from the file: directed 0", Density 0.08681, Components 1, "Edges per ..." (truncated label)
"1 to 36, mean 6.597". Left: Graph / Data rail, a search box, Selection, Everything, and a hint at
the bottom "Analyze (flask) in the toolbar (Shift+A) to add results here". Bottom toolbar: flask,
a chart icon, "3D" dropdown, search. Undo and redo arrows at top left -- noted.

Mara: "77 and 254 -- matches NetworkX. Density 254 over 2926 is 0.0868, right. Max degree 36 is
Valjean, mean 6.597 is 2m/n. Good, it didn't lose my data. The 'Edges per ...' label is cut off;
I assume 'edges per node', i.e. degree. Those are shaded spheres and the toolbar says 3D -- I don't
want 3D; I'll check that later. No layout name anywhere. Part 1 (on screen) is done. Now
'which characters matter most': the flask is Analyze. Clicking it."

Part done: get it on screen.

## Steps 4-5 -- the Analyze button

Commands: `--hover-at 680,864` (tooltip "Analyze Shift+A") -> 04.png; `--click-at 680,864` -> 05.png

Saw: a popover with "Filter analyses" and a list under "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank (tagged "Start here"), Eigenvector, Katz, HITS,
All-pairs distance, Depth-first order (grayed, "Select a node first"), Most flow... One-line
descriptions under each.

Mara: "So this is my Statistics panel. 'Start here' on PageRank -- I skip recommendations. For
'who matters' in Les Mis I want betweenness: who bridges the chapters. I know the NetworkX
numbers, Valjean is about 0.570 normalized. Betweenness."

## Step 6 -- Betweenness chosen

Command: `--click "Betweenness"` -> 06.png

Saw: the popover now shows Betweenness, its one-line description, a collapsed "Advanced", "Under a
second" and a Run button.

Mara: "Before I run anything I want the parameters -- normalized or not, weighted or not. Advanced."

## Step 7 -- Advanced

Command: `--click "Advanced"` -> 07.png

Saw: one field, "Sample size", value 0. Nothing about normalization or edge weights.

Mara (hesitating): "Sample size zero. I read that as 'exact, no sampling' -- the k parameter in
NetworkX -- but it doesn't say. And no normalized toggle, no 'use weights'. The Les Mis edges have
weights in NetworkX. I'll run it and see if the result says what it did."

## Step 8 -- Run

Command: `--click "Run"` -> 08.png

Saw: all dots turned orange; one in the middle (the hub at about 768,447) is darker, near black.
A key appeared top left of the canvas: "Color: Bridges", a 0 to 1624 orange ramp. Left panel now
lists "Bridges" with an orange swatch and 77, between Selection and Everything.

Mara: "1624 at the top. NetworkX unnormalized betweenness for Valjean: 0.5699 normalized times
(76*75/2 = 2850) is 1624.3. So it's exact, unnormalized, unweighted. Good -- it checks. But it
renamed my betweenness to 'Bridges'. That's a new word for something I have a word for. And it
colored the graph by itself without asking; the ramp is so flat I can only see one dark dot --
everything else is the same orange. Colors now stand for betweenness (called Bridges), 0 to 1624.
Part 2 -- the program worked out who matters -- is done, pending a look at the table. Let me
click Bridges in the left panel to see what it is."

Part done: which characters matter most (betweenness).

## Step 9 -- the Bridges result selected

Command: `--click "Bridges"` -> 09.png

Saw: Bridges highlighted in the left list, with an eye icon. Right panel switched to "Bridges --
Measure from Bridges, Oct 6", Style tab, Nodes / Edges switch, rows Fill, Color = Bridges (with a
minus), Shape +, Effects +, Label +, Tooltip +.

Mara: "So this is my Appearance panel, attached to the result. Color is already 'ranked' by
Bridges. I want size ranked by it too. No 'Size' row -- I'd guess it's under Shape. Plus on Shape."

## Step 10 -- plus on Shape

Command: `--click-at 1419,234` ("Add to Shape") -> 10.png

Saw: a small menu: Size, Shape.

Mara: "Size is under Shape. Fine. Size."

## Step 11 -- Size added

Command: `--click "Size"` -> 11.png

Saw: a Size row with a number field "1" (focused) and a chain-link icon, plus a minus. Dots
unchanged.

Mara: "A fixed size of 1 -- that's not a ranking. The color row shows 'Bridges', so the link icon
is probably 'bind to a value'. Hovering it first."

## Steps 12-13 -- Size by attribute

Commands: `--hover-at 1381,264` (tooltip "Size by attribute") -> 12.png; `--click-at 1381,264` -> 13.png

Saw: a "Size by attribute" picker: search box, group "Bridges" with Bridges, Bridges rank, Bridges
percentile; then "Cannot be used: Holds groups, not amounts" with id and name grayed out.

Mara: "Good, it tells me why id and name are out -- that's honest. Raw Bridges, not rank. In Gephi
I'd want min and max size next."

## Step 14 -- size by Bridges

Command: `--click "Bridges#2"` (the raw Bridges row in the picker) -> 14.png

Saw: the hub in the middle is now a big dark ball; a few others (Myriel-like hub at the bottom
left, one top center) are mid-size; most stay small. Size row now reads "1 to 3" with a small
gear/adjust icon. The key at top left grew a second entry: "Size: Bridges, 0 to 1624" with a gray
wedge, above "Color: Bridges, 0 to 1624".

Mara: "That's a ranking, size 1 to 3 -- the range is shown, which is more than Gephi's Appearance
shows at a glance. Linear, I assume. Sizes and colors now both stand for betweenness ('Bridges'),
0 to 1624, the same thing twice. Part 3 done. Now labels: plus on Label."

Part done: dots bigger for characters that matter more.

## Step 15 -- plus on Label

Command: `--click-at 1419,332` ("Add label line") -> 15.png

Saw: a "Label" picker: Attributes id, name; Bridges group: Bridges, Bridges rank, Bridges
percentile. The row underneath says "Pick an attribute".

Mara: "name."

## Step 16 -- labels by name

Command: `--click "name"` -> 16.png

Saw: names drawn above the dots in a small serif font (Myriel, Napoleon, Fantine, Valjean partly
under the big ball, Gervais, Isabeau, Old Man ...). Label row: "Aa Above", "Abc name", and a note
"77 labels, 7 hidden to avoid overlap". The key box at top left sits over the top-left corner of
the drawing; "Blacheville" and "Listolier" peek out from behind it.

Mara: "Names are on. 'Seven hidden to avoid overlap' -- thank you for saying so; Gephi just
draws them on top of each other. The text is tiny, I'd want it bigger for a figure, but it's
there. Valjean's label is half-hidden by his own ball. And the key covers the top-left cluster --
in an export that would be a problem. Part 4 done. Now the picture with its key. No File menu
visible; the hamburger at top left is the obvious place."

Part done: names on the drawing.

## Step 17 -- main menu

Command: `--click-at 23,20` ("Main menu") -> 17.png

Saw: a menu: Back to start; New project, Open project or file (Ctrl+O), Open sample; Save
(Ctrl+S), Save as, Save local copy, Export... (Ctrl+E); Rename (F2); Settings, Keyboard shortcuts,
Help.

Mara: "Export, Ctrl+E. Let's see if there's SVG or it's a PNG screenshot."

## Step 18 -- Export dialog

Command: `--click "Export..."` -> 18.png

Saw: an Export dialog with Image and Data on the left. Image: "A picture of the drawing, 2x, PNG".
Preset "To share -- PNG, 2x"; View "Current view"; Size 1x / 2x / 4x / 400 x 300; Format PNG /
JPEG / WebP; Background Canvas color / Transparent. A preview thumbnail shows the drawing with the
key in its top-left corner. Footer: "Saved to this computer only; nothing is uploaded." Cancel,
Copy, Export.

Mara (frowning): "PNG, JPEG, WebP. No SVG, no PDF. Raster only. The key is in the preview, at
least. Let me check the Preset list in case vector hides there."

## Step 19 -- Preset list

Command: `--click "Preset"` (tool note: ambiguous, took the combobox) -> 19.png

Saw: presets To share -- PNG 2x; For print -- PNG, 4x, sharper; Thumbnail -- JPEG 400 x 300; For
documentation -- PNG 2x transparent; Custom.

Mara: "'For print' is a 4x PNG. That's the answer: there is no vector export. For a journal figure
that's disqualifying -- I can't fix labels in Inkscape on a bitmap. For what the task asks, a
picture to paste into a document, a 4x PNG will do. For print, then Export."

## Step 20 -- For print preset

Command: `--click "For print -- PNG, 4x, sharper"` -> 20.png

Saw: Preset "For print -- PNG, 4x, sharper", Size 4x selected, PNG, Canvas color. Same preview with
the key in the corner. Nothing in the dialog about the key -- no toggle for it -- but the preview
shows it.

Mara: "Export."

## Step 21 -- Export

Command: `--click "Export"` (tool note: ambiguous with the dialog itself, took the button) -> 21.png
Tool output: a file was saved: les-miserables_current-view.png, 3612 x 3440 (downloads/).

Opened the file. Saw: the drawing with the key in a white box at top left -- "Size: Bridges" with
a gray wedge 0 to 1624, "Color: Bridges" with the orange-to-dark-brown ramp 0 to 1624. In the
export the key sits clear of the nodes (on screen it covered the top-left cluster). Names are on
every labeled dot, but the label text is blurry, smeared serif glyphs even at 4x -- "Valjean" is
barely legible, half under his own dark ball; "Mme Hucheloup", "Mother Plutarch" are smudges.
The key text is crisp; the node labels are not.

Mara: "There's my figure, with a key -- in the file, not added in Inkscape. That alone is
something Gephi's Preview has never done for me. But the labels look like they were rendered
small and scaled up; I couldn't send this to a journal. Part 5 done for a document; not for a
paper."

Part done: picture file with its key.

Command: `--end $S`

## Verdict (in character)

**Finished?** Yes, all five parts of the task.
- On screen: the sample opened in one click; 77 nodes and 254 edges, density 0.08681, max degree
  36 -- all match NetworkX.
- Who matters most: Betweenness, exact and unnormalized (Valjean 1624, which is NetworkX's 0.5699
  times 2850). The app calls the result "Bridges".
- Sizes: dot size stands for betweenness ("Bridges"), 0 to 1624, mapped to sizes 1 to 3.
- Colors: also betweenness, light orange (0) to near-black brown (1624). The program applied the
  color on its own the moment the statistic finished; I added the size.
- Names: on, with 7 of 77 hidden "to avoid overlap", and it told me so.
- Picture: a 3612 x 3440 PNG with the size and color key in it.

**Ease: 5 of 7.** Fast. Sample to finished figure in about twenty clicks, no dead ends, no crash,
nothing uploaded. Faster than Gephi for this, honestly.

**What confused or bothered me:**
1. "Bridges" is a new word for betweenness. The menu said Betweenness, the result came back as
   Bridges. I had to infer they are the same thing from the number.
2. The only Advanced setting was "Sample size: 0". No word on what 0 means (exact?), whether it
   is normalized, or whether edge weights were used. I had to check the max against NetworkX by
   hand to know. The result should say: exact, unnormalized, unweighted, whole graph.
3. Color was applied without my asking, and the ramp is so flat that almost every dot is the same
   orange; only Valjean stands out. Color and size both encode the same measure, which is
   redundant on the figure.
4. Size lives under "Shape", behind a plus, then a link icon "Size by attribute". Three hops for
   what Gephi calls Ranking > Size. Findable, not obvious.
5. No vector export: PNG, JPEG, WebP only. "For print" is a 4x PNG. For a journal figure that is
   the deal-breaker -- I can't fix a label on a bitmap. And the node labels in the export are
   blurry, while the key is sharp.
6. On screen the key box covers the top-left corner of the drawing (Blacheville, Listolier).
7. The drawing is shaded 3D spheres and the toolbar says "3D". I never found which layout made it
   or whether I could set ForceAtlas2 parameters -- I didn't need to for this task, but I would
   ask before citing it.
8. The overview's "Edges per ..." label is truncated.

**What earned credit:** counts right, statistic checkable, a key inside the exported picture,
"7 labels hidden" stated plainly, "Cannot be used: holds groups, not amounts" stated plainly,
"nothing is uploaded" stated plainly, undo visible in the title bar.

Closing line: "Good for teaching and a slide. For a paper figure, without SVG and with those
labels, I'd stay on Gephi."
