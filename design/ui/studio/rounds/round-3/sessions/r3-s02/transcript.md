# Session r3-s02 -- Elena (first-time graph user), task T15 prompt A (Les Miserables)

Participant: Explorer Elena, product manager, never used the app. Short-clock first contact.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s02 empty` -> 01.png

Saw: a dark start page. "Open project or file...", "New from data...". On the right, "Samples":
Les Miserables (77 characters), Zachary's karate club, College football, Florentine families.
A "Your data is yours, but please help us" box at the bottom with "Share usage data" / "No thanks".

Elena: "Oh good, Les Miserables is right there under Samples. I'll just click it. I'll ignore the
data box for now."

## Step 2 -- open the sample

Command: `--step --click "Les Miserables"` -> 02.png

Saw: a light canvas with lots of blue dots and thin grey lines, all the same size, no names. Left
panel: a search box "Find nodes, edges, values", "Selection", "Everything". Right panel: "Graph,
From Les Miserables", Style / Values tabs, Overview: Nodes 77, Edges 254, Density 0.08681,
Components 1. A small toolbar at the bottom of the canvas with icons (a flask, a chart, "3D", a
magnifier). Bottom-left text: "Analyze (flask) in the toolbar (Shift+A) to add results here".

Elena: "OK, it's on screen. That's part one done. It's a hairball, no names. All the dots look
the same. Which one is Valjean? Let me click that one in the middle where all the lines meet."

## Step 3 -- click the dot in the middle

Command: `--step --click-at 768,447` -> 03.png (tool: node "Valjean")

Saw: the middle dot got a yellow ring. Right panel now says "Valjean, Node", Summary: id Valjean,
name Valjean, Degree 36 (with an arrow). Selection 1 on the left.

Elena: "Ha, I was right, the one in the middle is Valjean, the main guy. 'Degree 36' -- no idea
what degree means, 36 of what? Anyway. Now I need it to work out who matters most. There's a
little toolbar at the bottom with a flask icon -- and the text on the left says Analyze is the
flask. Let me try that."

## Step 4 -- the flask (Analyze)

Command: `--step --click-at 680,864` (tool: button "Analyze") -> 04.png

Saw: a pop-up list "Filter analyses", heading "Rank nodes and edges": Degree, Betweenness, Edge
betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS,
All-pairs distance, Depth-first order, Most flow... each with a small grey line of description.

Hesitation: a long list of words she cannot pronounce. "Betweenness. Eigenvector. Katz?" She
almost closed it.

Elena: "Ugh, this is the Gephi thing. Don't make me pick... oh wait, PageRank says 'Start here'.
PageRank I've heard of, that's the Google thing. Fine, they picked one for me. Clicking that."

## Step 5 -- PageRank

Command: `--step --click "PageRank"` -> 05.png

Saw: the pop-up became a PageRank form: "Damping factor 0.85", "Weight: None", "Advanced", "Under
a second", and a blue "Run" button.

Elena: "Damping factor? I'm not touching that. Leave everything as it is. 'Under a second', good.
Run."

## Step 6 -- Run

Command: `--step --click "Run"` -> 06.png

Saw: every dot turned orange (some slightly darker). A small key top-left of the canvas: "Color:
PageRank, 0.003299 [orange bar] 0.07543". Left panel gained a row "PageRank 77". Right panel for
Valjean: "Results: PageRank 0.07543, #1 of 77".

Elena: "Ooh, everything changed color. OK, it worked something out -- Valjean is '#1 of 77', so he
matters most. Part two done, I think. But honestly all the dots look the same orange to me, I
can't tell which are the important ones from the picture. 0.003 to 0.075 -- is that a lot?
Now: make the important ones bigger. There's a new 'PageRank' thing on the left, let me click it
and see if it has a size option."

## Step 7 -- click the PageRank row

Command: `--step --click "PageRank"` -> 07.png (tool: ambiguous, took the left-panel row)

Saw: the PageRank row is highlighted, with an eye icon. The right panel switched to "PageRank,
Measure from PageRank, Oct 7", Style tab, Nodes / Edges. Rows: Fill (+), Color [PageRank] (-),
Shape (+), Effects (+), Label (+), Tooltip (+).

Hesitation: she scanned for the word "Size" and did not find it.

Elena: "OK, Style. Color is PageRank, that's the orange. No 'Size' anywhere... Shape maybe? Size
is kind of a shape thing. Label is probably the names, that's for later. Let me press the plus
next to Shape."

## Step 8 -- plus beside Shape

Command: `--step --click-at 1420,234` (tool: button "Add to Shape") -> 08.png

Saw: a small menu: "Size" (highlighted), "Shape".

Elena: "There it is, Size. Hiding under Shape. Click."

## Step 9 -- Size

Command: `--step --click "Size"` -> 09.png

Saw: a pop-up "Size by attribute": a search box, "Fixed size", a group "PageRank" with PageRank,
PageRank rank, PageRank percentile; then greyed-out "Cannot be used: Holds groups, not amounts"
with id, name.

Hesitation: "rank" vs "percentile" vs plain -- she does not know the difference and takes the
plain one, the same word as the color.

Elena: "Size by... PageRank. Same as the color. The other two sound like the same thing in
different clothes. Plain PageRank."

## Step 10 -- size by PageRank

Command: `--step --click "PageRank#2"` -> 10.png

Saw: the dots now have different sizes. Valjean in the middle is big (yellow ring), one at the
bottom (the hub of the fan of dots) is big, a few others in the middle are medium. The key
top-left now has two rows: "Size: PageRank 0.003299 [grey wedge] 0.07543" and "Color: PageRank
0.003299 [orange bar] 0.07543". Right panel: "Size 1 to 3".

Elena: "Ooh, now that's better, you can actually see who's important. Part three done: bigger
dots are the characters that matter more. The big one at the bottom with all the spokes must be
someone important too. Now names. 'Label' -- plus."

## Step 11 -- plus beside Label

Command: `--step --click-at 1420,332` (tool: button "Add label line") -> 11.png

Saw: a "Label" pop-up: "Find an attribute", Attributes: id, name; PageRank: PageRank, PageRank
rank, PageRank percentile.

Elena: "'name'. Obviously. (id and name were both Valjean earlier, so either probably works.)"

## Step 12 -- label by name

Command: `--step --click "name"` -> 12.png

Saw: small names appear above the dots: Myriel at the bottom hub, Fantine, Thenardier, Cosette,
Javert-ish names in the middle, Valjean barely readable over the yellow ring. Names are tiny, some
overlap in the middle. Right panel: "Label: Aa Above, Abc name", "77 labels, 6 hidden", a "Show
all labels" checkbox.

Hesitation: did not notice "6 hidden" / "Show all labels" (small grey text in the side panel).

Elena: "There are the names. Tiny, but there. Part four done. So the big one at the bottom is
Myriel -- the bishop! That makes sense, he's important at the start. Valjean is the biggest.
Now the picture file. I'd expect Export or Download in the main menu -- the three lines top
left."

## Step 13 -- main menu

Command: `--step --click-at 24,20` (tool: button "Main menu") -> 13.png

Saw: a menu: Back to start, New project, Open project or file..., Open sample, Save, Save as...,
Save local copy..., Export... (Ctrl+E), Rename, Settings..., Keyboard shortcuts, Help.

Elena: "Export. That's the one."

## Step 14 -- Export dialog

Command: `--step --click "Export..."` -> 14.png

Saw: an "Export" dialog. Left: Image (selected), Data. "Image -- a picture of the drawing, 2x,
PNG". Preset "To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format
PNG/JPEG/WebP, Background Canvas color/Transparent. A preview of the picture; in its top-left
corner there seems to be a tiny box that could be the key. Buttons Cancel, Copy, Export. "Saved
to this computer only; nothing is uploaded."

Hesitation: she squints at the preview to check the key is in it -- too small to read, but there
is something in the corner where the key is on screen.

Elena: "Defaults look fine, PNG to share. I think the key is in the corner of the preview. Export."

## Step 15 -- Export

Command: `--step --click "Export"` -> 15.png (tool: ambiguous, took the button; a file was saved:
`downloads/les-miserables_current-view.png`, 1806 x 1720)

Saw: the dialog closed and a message at the bottom: "Exported les-miserables_current-view.png".
Opening the file: the drawing with names, and in the top-left corner a white key box: "Size:
PageRank 0.003299 ... 0.07543" with a grey wedge, and "Color: PageRank 0.003299 ... 0.07543"
with an orange-to-dark-brown bar. The key is crisp; the character names are small and a bit blurry
(readable for the outer ones like Myriel, Napoleon, Old Man; the middle ones run together).
Valjean still has the yellow ring from when I clicked him, and his name sits under it and is
hard to read in the picture.

Elena: "Got it, there's the file, and the key is in the corner. Part five done. Hmm, Valjean
has that yellow glow in the picture -- I guess that's because I clicked him. It kind of looks
like I'm highlighting him on purpose, which is fine, he's the main guy. His name is hard to read
under it though."

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s02`

## Wrap-up (in character)

**Did I finish?** Yes, all five parts:

1. On screen -- clicked "Les Miserables" under Samples. Instant.
2. Worked out who matters most -- flask button at the bottom, picked PageRank because it said
   "Start here", pressed Run. Valjean came out "#1 of 77".
3. Bigger dots for the ones that matter -- clicked the PageRank row on the left, then the plus
   next to "Shape", then "Size", then "PageRank".
4. Names -- plus next to "Label", picked "name".
5. Picture with its key -- main menu, Export..., Export. The PNG has the key in the corner.

**What the sizes and colors stand for:** both are PageRank -- the program's score for how
important a character is (how connected they are to other well-connected characters). Bigger
and darker means more important. The scale runs from 0.003299 to 0.07543, which honestly means
nothing to me as numbers; I just read it as "small = minor character, big = major". Valjean is
the biggest, then Myriel (the bishop, bottom), Fantine, Marius-ish ones in the middle, Javert.
(I said "the big one at the bottom must be important" before I knew who it was; I'm reading the
size as "how much they matter in the story", which might not be exactly what the score means.)

**How easy, 1 (very difficult) to 7 (very easy): 5.**

**What confused me:**

- The list behind the flask is a wall of words I don't know (Betweenness, Eigenvector, Katz,
  HITS). The "Start here" tag on PageRank is the only reason I didn't close it.
- After Run, everything turned the same-ish orange; I couldn't see who was important until I
  made the sizes change. The light-to-dark orange is hard to tell apart.
- "Size" is hidden under "Shape" -- I had to guess. I looked for the word Size first and it
  wasn't there.
- Size choices "PageRank / PageRank rank / PageRank percentile" -- no idea what the difference is.
- The key's numbers (0.003299 to 0.07543) don't tell me anything. Is 0.07 a lot?
- Names are tiny, overlap in the middle, and in the exported picture they're a bit blurry. The
  selected dot's yellow ring ended up in the picture and covers Valjean's name. I didn't notice
  "6 hidden" labels until afterwards.
- "Degree 36" when I clicked Valjean -- don't know what degree is.
