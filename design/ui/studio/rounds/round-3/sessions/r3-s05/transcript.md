# Session r3-s05 -- Mara Lindqvist, task T15 prompt A (Les Miserables)

Persona: Mara, a long-time Gephi user, skeptical and fast. Task: load the bundled Les Miserables
network, have the program rank the characters, size dots by importance, show names, export a
picture with its key, and say what sizes and colors mean.

All commands run from the worktree root with S=design/ui/studio/rounds/round-3/sessions/r3-s05.

## Step 1 -- start

Command: `node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png
Saw: a start page with Open project or file, New from data, an empty Recent projects list, and a
Samples list with Les Miserables (77 characters) first. A usage-data consent box at the bottom.
Mara: "77 characters, that matches what I know. Dismiss the consent box first."

## Step 2

Command: `--step $S --click "No thanks"` -> 02.png. Consent box dismissed.
Mara: "Now open the Les Miserables sample."

## Step 3

Command: `--step $S --click "Les Miserables"` -> 03.png
Saw: graph drawn, all dots the same purple. Right panel Overview: Nodes 77, Edges 254, undirected,
density 0.08681, 1 component. Bottom toolbar: flask icon, a chart icon, "3D", search. A hint at
bottom left: "Analyze (flask) in the toolbar (Shift+A) to add results here".
Mara: "77 and 254, the counts are right. Good, it stays. It says 3D down there -- I hope that's not
the default. The hint tells me the flask is Analyze; that's my Statistics panel. Clicking it."
Part 1 (on screen) done.

## Step 4

Command: `--step $S --click "Analyze"` -> 04.png
Saw: a filterable list, "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (tagged "Start here"), Eigenvector, Katz, HITS, All-pairs distance, more below.
Mara: "A proper list of statistics with one-line definitions. I ignore the 'Start here' badge --
for 'who matters' in Les Mis I want betweenness, it's the one I can check against NetworkX.
Clicking Betweenness."

## Step 5

Command: `--step $S --click "Betweenness"` -> 05.png
Saw: a Betweenness card: one-line definition, a collapsed "Advanced", "Under a second", Run.
Mara: "Before I run anything I want the parameters -- normalized or not, weighted or not. Opening Advanced."

## Step 6

Command: `--step $S --click "Advanced"` -> 06.png
Saw: Advanced has one field, "Sample size" = 0. Nothing about normalization or weights.
Hesitation: "Sample size 0 -- I assume 0 means exact, all pairs, but it does not say so. And is it
normalized? I'll find out from the numbers. Run."

## Step 7

Command: `--step $S --click "Run"` -> 07.png
Saw: all dots turned orange, shades barely distinguishable except one dark dot in the middle. A
key at top left: "Color: Betweenness, 0 to 1624". Left panel gained a row "Betweenness 77".
Mara: "1624 at the top -- that's raw, unnormalized betweenness, and it's Valjean's value in
NetworkX, roughly 0.57 times 2850 pairs. The number checks out. Part 2 done: it worked out who
matters, by betweenness. But it painted a ranking into color without asking, and the ramp is so
pale I can't read it. I want size, not color. I'll click the Betweenness row on the left -- that
looks like my Appearance entry."

## Step 8

Command: `--step $S --click "Betweenness"` -> 08.png
Saw: right panel now "Betweenness -- Measure from Betweenness, Oct 7", Style tab, Nodes/Edges.
Sections: Fill (Color: Betweenness), Shape +, Effects +, Label +, Tooltip +.
Mara: "This is the Appearance panel. No 'Size' heading -- in Gephi size is its own tab. I'd guess
size lives under Shape. Clicking the + next to Shape."

## Step 9

Command: `--step $S --click-at 1419,234` (button "Add to Shape") -> 09.png
Saw: a small menu: Size, Shape. Guess was right.
Mara: "Size. Choosing it."

## Step 10

Command: `--step $S --click "Size"` -> 10.png
Saw: a "Size by attribute" picker: Fixed size; Betweenness group with Betweenness, Betweenness
rank, Betweenness percentile; greyed id and name ("Holds groups, not amounts").
Mara: "This is a Gephi ranking on size. Raw betweenness -- I want it to match the color key. Clicking
Betweenness."

## Step 11

Command: `--step $S --click-at 1207,416` (option "Betweenness") -> 11.png
Saw: the central character is now a big dark dot, the hub at bottom left medium, the rest small.
Panel shows "Size 1 to 3". The key at top left now has two rows: "Size: Betweenness 0 to 1624" and
"Color: Betweenness 0 to 1624".
Mara: "There. Valjean in the middle, Myriel's star at the bottom. Part 3 done: dot size is
betweenness. Size and color both encode the same thing now, which is redundant but honest, and the
key says so. Now names. Label + in the same panel."

## Step 12

Command: `--step $S --click-at 1419,332` (button "Add label line") -> 12.png
Saw: a "Label" picker: Attributes id, name; Betweenness, rank, percentile.
Mara: "name is the Label column. Choosing name."

## Step 13

Command: `--step $S --click-at 1117,502` (option "name") -> 13.png
Saw: names drawn above the dots in a small serif font. Panel: "Label: Above, name", "77 labels, 7
hidden" and a "Show all labels" checkbox.
Mara: "Names are on, and it hides seven that would collide -- that's what I'd want for a figure,
I don't need to tick 'show all'. Small, but readable when zoomed. Part 4 done. Now the export --
my Preview. I look in the menu at top left."

## Step 14

Command: `--step $S --click-at 24,20` (button "Main menu") -> 14.png
Saw: a menu: Back to start, New project, Open project or file, Open sample, Save, Save as, Save
local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help.
Mara: "Export. Let's see if it's more than a screenshot."

## Step 15

Command: `--step $S --click "Export..."` -> 15.png
Saw: Export dialog, Image and Data on the left. Image: Preset "To share -- PNG, 2x", View "Current
view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP, Background canvas color/transparent. A preview
thumbnail with the key visible in its top-left corner. Footer: "Saved to this computer only;
nothing is uploaded." Cancel / Copy / Export.
Mara: "The key is in the picture -- that's the Inkscape step gone. But PNG, JPEG, WebP. Where's SVG?
Let me check the Preset list before I judge."

## Step 16

Command: `--step $S --click "Preset"` -> 16.png
Saw: presets To share (PNG 2x), For print (PNG 4x, sharper), Thumbnail (JPEG 400x300), For
documentation (PNG 2x transparent), Custom. No SVG or PDF anywhere.
Mara: "No vector. For a paper that's a problem; for pasting into a document, as asked, a 4x PNG
will do. 'For print' it is."

## Step 17

Command: `--step $S --click "For print -- PNG, 4x, sharper"` -> 17.png
Saw: 4x selected, PNG, canvas-color background; preview still shows the key in the corner.
Mara: "Export."

## Step 18

Command: `--step $S --click "Export"` -> 18.png. The tool noted "Export" matched the button and the
dialog and took the button. A file was saved: downloads/les-miserables_current-view.png, 3612 x 3440.
Opened the file: the drawing with the key boxed in the top-left corner ("Size: Betweenness 0 to
1624", a gray wedge; "Color: Betweenness 0 to 1624", an orange-to-dark-brown ramp), names above the
dots. Valjean is the big dark dot in the middle, Myriel the second-largest at the bottom, Fantine
and Gavroche next.
Mara: "Part 5 done -- a picture with its key, no Inkscape. But the names are soft. At 4x the dots are
crisp and the label text is blurry, like it was drawn small and scaled up. Valjean's own name sits
on top of his dot, half hidden. And the drawing sits left of center with empty space on the right."

## End

Command: `node design/ui/studio/tool/real.mjs --end $S`

## Verdict (in character)

Finished: yes, all five parts.

- On screen: the Les Miserables sample, 77 nodes and 254 edges, which matches what I know.
- Who matters: Betweenness, from the Analyze (flask) list. The top value, 1624, is Valjean's raw
  (unnormalized) betweenness, and it matches NetworkX.
- Bigger dots: Style > Shape + > Size > Betweenness. The size range is 1 to 3.
- Names: Label + > name. It shows 77 labels and hides 7 where they would collide.
- Picture: Menu > Export..., the "For print" preset, a 4x PNG with the key in the corner.

What the sizes and colors stand for: both stand for betweenness, the number of shortest paths
between other characters that pass through that character. It runs from 0 to 1624. Bigger and
darker means more of a go-between. The program colored by betweenness on its own when the
statistic finished. I added size on top, so the two encode the same thing twice.

Ease: 6 out of 7. Every step was one panel away. The key coming out with the image is the thing I
have wanted from Gephi for ten years.

What confused or bothered me:

- Running the statistic recolored the whole graph without asking. Gephi computes the number and
  lets me decide what to paint, so I did not expect it. The default orange ramp is so pale at the
  low end that only the top two or three characters stand out.
- Size sits under a heading called "Shape". I found it on the first guess, but only because I
  guessed.
- In the Betweenness options, "Sample size 0" does not say that 0 means exact. Nothing says
  whether the result is normalized or weighted. I only worked that out by checking the maximum.
- Export offers only PNG, JPEG and WebP. For a document that is fine. For a paper I need SVG or
  PDF, and without them this is not my figure tool.
- The labels in the 4x PNG are blurry while the dots are sharp. Valjean's label is drawn over his
  own dot. A reviewer would ask for this to be redone.
- The bottom toolbar says "3D". I never touched it, and I want to know the drawing is flat before
  I publish it.
- I did not test undo, filtering or the node table this time.

Overall: "Faster than Gephi for a first look, and the legend is a real win. For a paper I'd still
finish in Gephi until there's vector export with crisp labels."
