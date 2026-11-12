# Session r1-s02 -- Tom (the recipe recipient), task T15, prompt A (Les Miserables)

Participant: Tom, 52, cell-biology lab manager. He does not build networks, reads headings,
numbers and legends, skips small grey text, and gives up after about two dead ends.
Start: empty app. Tool: `design/ui/studio/tool/real.mjs`; all commands were run from
`design/ui/studio`, and `S=rounds/round-1/sessions/r1-s02`.

## Think-aloud, step by step

### 01 -- start

`node tool/real.mjs --start $S empty` (it waited a few minutes for a free browser)

Saw: the start page. Start (Open project or file, New from data), Recent projects (empty), and
Samples on the right with "Les Miserables -- 77 characters". At the bottom, a box asking to share
usage data.

Tom: "A web page, nothing to install. Good. The box at the bottom wants usage data. No thanks.
And on the right, Les Miserables, 77 characters. That's the one."

### 02 -- open the sample

`--step $S --click "No thanks" --click "Les Miserables"`

Saw: blue dots and gray lines filling the middle. On the right, Graph > Values: Nodes 77,
Edges 254. No names on the dots.

Tom: "There it is. 77 nodes, the same 77 characters. Part one, on screen: done."

### 03 -- looking for "which matter most"

Hesitated: no word on screen says "important" or "matter". He ignored the grey line at the
bottom left ("Analyze (Shift+A) to add results here"). He went for the bar of icons at the
bottom and picked the flask, because a flask means "experiment" to him.

`--step $S --click-at 659,864` (button "Analyze")

Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (with a blue "Start here" badge), Eigenvector, Katz, HITS, All-pairs distance...

Tom: "Names I don't know. Katz, HITS. I'm not learning those at 4 pm. But one says 'Start
here' in blue. PageRank. Fine, I'll do what it tells me."

### 04 -- PageRank

`--step $S --click "PageRank"`

Saw: a small form: "Damping factor 0.85", "Under a second", a blue Run button.

Tom: "Damping factor. No idea. Leave it. Run."

### 05 -- Run

`--step $S --click "Run"`

Saw: every dot turned orange. A key in the top left: "Color: Influence 0.003299 to 0.07543".
On the left, a new row "Influence 77".

Tom: "Everything's orange. Darker means more influence, I suppose, but they all look the
same orange except a couple of dark ones. And it says 'Influence', not 'PageRank'. I
assume that's the same thing. 0.003 to 0.075 means nothing to me."
(His color weakness did not matter here. The scale runs light to dark, not red to green.
The problem was that the range is so narrow he could barely see a difference.)

### 06 -- looking for "bigger dots" (dead end 1)

Tom: "Bigger dots. There's a 'Style' tab on the right. Looks live there."

`--step $S --click "Style"`

Saw: Canvas Background F5F5F5, Method "Force - Recommended", Seed 1. Nothing about dots.

Tom: "Background, method, seed. Nothing about dots. Wrong place."

### 07 -- select the result

Tom: "Maybe I have to pick the Influence thing on the left. That's what I just made."

`--step $S --click "Influence"`

Saw: the right panel now titled Influence, with a histogram and a "Top 10" list: Valjean
0.07543, Myriel, Gavroche, Marius, Javert, Thenardier, Fantine, Enjolras, Cosette,
MmeThenardier.

Tom: "Now that's useful. A list with names. Valjean first, makes sense, he's the hero. Which
characters matter most: done. I'd read this list out."

### 08 -- Style for Influence

`--step $S --click "Style"`

Saw: Nodes / Edges. Fill, Color = Influence, Shape +, Effects +, Label +, Tooltip +.

Tom: "Color, that's the orange. No 'Size'. Size of a dot is its shape, I guess? Try the plus
by Shape. Label will be the names, later."

### 09-10 -- Shape > Size

`--step $S --click-at 1419,226` (button "Add to Shape"). A menu: Size, Shape.
`--step $S --click "Size"`

Saw: a Size row with the value "1", a small down arrow and a chain-link icon. The drawing
did not change.

Tom: "Size says 1. Color says 'Influence' in its box. I want Size to say Influence too."

### 11 -- the arrow on the Size box (dead end 2)

`--step $S --click-at 1352,256` (button "Open list")

Saw: an empty dropdown, a thin dark strip with nothing in it.

Tom: "Empty. Nothing in it. That's twice now. Normally I'd stop here and ask her for a PNG.
There's a chain-link icon next to it. One more go, then I'm done with sizes."

### 12-13 -- the chain link

`--step $S --key Escape --click-at 1380,256` (button "Size by attribute")

Saw: a list, "Find an attribute": Influence, Influence rank, Influence percentile. Below it,
greyed out: "Cannot be used: Holds groups, not amounts" -- id, name.

`--step $S --click-at 1193,324` (option "Influence")

Saw: the dots took different sizes. A big dark one in the middle, another big one at the
bottom. The key now has two parts: "Size: Influence" (a gray wedge) and "Color: Influence".
The Size box reads "1 to 3".

Tom: "Now we're talking. Size and color both say Influence. Bigger and darker means matters
more. Bigger dots: done. I would never have guessed that a chain link means 'make it follow
the numbers'. I only clicked it because it was the last thing left."

### 14-15 -- names

`--step $S --click-at 1419,324` (button "Add label line"). A list: id, name, Influence,
Influence rank, Influence percentile.

Tom: "id or name. Names."

`--step $S --click-at 1117,454` (option "name")

Saw: small names above most dots (Myriel, Fantine, Cosette, Napoleon...). Under the Label
row, in small grey text: "77 labels, 6 hidden to avoid overlap".

Tom: "Names, yes. Tiny though. I need my glasses. I can read Myriel, Fantine, Cosette. The
big one in the middle I'd guess is Valjean, but his name is buried in the ball. Names on the
drawing: done, more or less." (He did not read the grey "6 hidden" line.)

### 16-18 -- picture file

Tom: "A picture to paste into a document. Where's File? The three lines top left."

`--step $S --click-at 23,20` (button "Main menu"). Saw: New project, Open project or file,
Save, Export..., Settings, Keyboard shortcuts, Help.

`--step $S --click "Export..."`

Saw: an Export dialog, Image tab: preset "To share -- PNG, 2x", view "Current view", size,
format, background, a preview with the key in its corner, and at the bottom "Saved to this
computer only; nothing is uploaded."

Tom: "To share, PNG. And nothing is uploaded. I like that line; that's the first thing I'd
ask. Export."

`--step $S --click "Export"`. The file `downloads/les-miserables_current-view.png` was saved
(1806 x 1720). A toast said "Exported les-miserables_current-view.png".

Looking at the file: the key in the top-left corner is large and readable ("Size: Influence,
0.003299 to 0.07543"; "Color: Influence", light orange to dark brown). The names on the dots
are small and fuzzy, several overlap, and Valjean's name sits on top of his own dark ball
where it can hardly be read.

Tom: "It's a picture with a key. I'm done."

`--end $S`

## What he said each part was, and what sizes and colors mean

- On screen: done, step 02.
- Which matter most: done, steps 05 and 07. He read the answer from the Top 10 list
  (Valjean, Myriel, Gavroche, Marius, Javert), not from the drawing.
- Bigger dots: done, step 13, at the third try.
- Names on the drawing: done, step 15, but hard to read.
- Picture file with its key: done, step 18.
- Sizes and colors: "Both mean the same thing: Influence. Bigger and darker means that
  character matters more. What the numbers 0.003 to 0.075 are, I couldn't tell you. And I
  asked for PageRank and it calls it Influence. I'm assuming that's the same."

## In character, at the end

**Did you finish?** Yes, all five parts. Nearly not: the size step had two dead ends before
the third try worked, and that is usually where I stop.

**How hard was it (1-7, 7 = very hard)?** 4. Opening it, the list of top characters and the
export were easy. Making dots bigger was the hard part.

**What confused me:**

- The Style tab first showed background, "Method" and "Seed", with nothing about dots. I had
  to work out that I needed to click the Influence row on the left first.
- There was no "Size" anywhere until I opened "Shape". I guessed.
- Size said "1" with an arrow, and the arrow opened an empty box. I thought it was broken.
- The chain-link icon is what actually did it. A chain link doesn't mean "follow the numbers"
  to me; I clicked it because nothing else was left.
- I clicked "PageRank" and everything after that says "Influence". Is that the same thing?
- The key's numbers (0.003299 to 0.07543) don't mean anything to me. I couldn't say in a
  sentence what one unit of influence is.
- At first only the color showed influence, and the oranges look almost the same apart from
  two or three dark ones.
- The names are small, and in the picture they are blurry. The most important character's
  name is hidden under his own dot. If the PI asked "who's the big one?", I couldn't point to
  it on the printout.
- Good: "Start here" told me which button to press, the Top 10 list gave me names and numbers,
  and the export said nothing leaves my computer.
