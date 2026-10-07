# Session r1-s01 -- Elena (first-time graph user), Les Miserables, a whole first session

Participant: Explorer Elena, a product manager with no graph training, on a laptop with a trackpad.
Task: open the Les Miserables sample that comes with the app, have the app work out which
characters matter most, make the dots bigger for those that matter more, put the names on the
drawing, and save a picture with its key that could go into a document. Say what the sizes and
colors stand for.

Start: empty app. All commands are run from `design/ui/studio`, with
`S=rounds/round-1/sessions/r1-s01`.

## Steps

### 1. First look -- `node tool/real.mjs --start $S empty` (01.png)

Think-aloud: "OK, a dark start page. Open, New from data... and on the right there's a Samples list,
and Les Miserables is the first one, '77 characters'. Good, that's what I'm after. There's also a
box at the bottom asking about usage data. I'll leave that alone -- not why I'm here."

Saw: start page with Start, Recent projects, Samples (Les Miserables, Zachary's karate club,
College football, Florentine families), and a usage-data consent box at the bottom.
No hesitation. I did not answer the usage-data question.

### 2. Open the sample -- `--step $S --click "Les Miserables"` (02.png)

Think-aloud: "There it is. Blue balls and grey lines, a bit of a hairball in the middle, but I can
see a cluster at the top and a fan at the bottom. On the right: Nodes 77, Edges 254, Density,
Components... I guess nodes are the characters. 'Undirected, from the file: directed 0' -- no
idea what that means. Bottom left says 'Analyze (Shift+A) to add results here'. That sounds like
where the 'who matters' part lives."

**Part 1 done: the network is on screen.** The usage-data box disappeared on its own once the
graph opened.

Hesitated: the right panel's statistics (density, "Edges per ...") mean nothing to me, and
"Undirected, from the file: directed 0" reads like a sentence with words missing.

### 3. Find the analyze button -- `--step $S --hover-at 659,864`, then `--click-at 659,864` (03.png, 04.png)

Think-aloud: "Which of these little icons at the bottom is Analyze? The flask, probably. Hovering
-- yes, 'Analyze Shift+A'. Click."

Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank with a "Start here" tag, Eigenvector, Katz, HITS, All-pairs distance, and some greyed-out
ones further down.

Think-aloud: "Lots of words I don't know. But each has a one-line explanation, and one says
'Start here'. I'll do what it says."

Hesitated: briefly, over the jargon. The "Start here" tag decided it for me.

### 4. Pick PageRank -- `--step $S --click-at 536,600` (05.png)

Saw: PageRank card, "Which nodes are connected to other well-connected nodes", Damping factor 0.85,
"Under a second", Run.

Think-aloud: "Damping factor -- no clue, leave it. Run."

### 5. Run it -- `--step $S --click "Run"` (06.png)

Saw: all the dots turned orange. A key in the top left: "Color: Influence 0.003299 -- 0.07543". A new
row "Influence 77" in the left list.

Think-aloud: "Huh, it's called 'Influence' now, not PageRank. Fine, that's actually a better word.
Everything is orange. A few dots are darker -- one in the middle and one at the bottom. So darker =
more influence? The numbers on the key are tiny decimals, they don't tell me anything. I still
don't know WHO matters. Let me click 'Influence' on the left."

Hesitated: the color change is subtle; only two or three dots stand out as darker.

### 6. Open the result -- `--step $S --click "Influence"` (07.png)

Saw: the right panel became "Influence", with a little histogram and a "Top 10" list: Valjean
0.07543, Myriel, Gavroche, Marius, Javert, Thenardier, Fantine, Enjolras, Cosette, MmeThenardier.

Think-aloud: "THERE we go. Valjean is number one by a lot, then Myriel. That makes sense, he's the
main character. **Part 2 done: the program worked out who matters most** -- it's a ranked list."

### 7. Look for size -- `--step $S --click "Style"` (08.png)

Think-aloud: "Now bigger dots. There's a Style tab next to Values. Inside: Fill / Color: Influence,
Shape, Effects, Label, Tooltip. No 'Size' anywhere. Hmm. Is size a shape thing? Let me try the
plus next to Shape."

Hesitated: about 10 seconds. "Size" is not visible until you open Shape; I guessed.

### 8. `--step $S --click-at 1419,226` (09.png)

Saw: a small menu with "Size" and "Shape". "Good guess."

### 9. `--step $S --click-at 1307,262` (10.png)

Saw: a Size row with "1" in a box and a chain-link icon beside it.

Think-aloud: "It's set to 1 for everything. I don't want one number, I want it to follow the
influence. What's the chain icon?"

### 10. `--step $S --hover-at 1381,256`, then `--click-at 1381,256` (11.png, 12.png)

Saw: tooltip "Size by attribute". Clicking it showed a list: Influence, Influence rank, Influence
percentile; greyed out below "Cannot be used: Holds groups, not amounts": id, name.

Think-aloud: "'Attribute' is a bit techie but 'Size by Influence' is exactly what I want."

Hesitated: had to hover to learn what the chain icon does -- I would not have guessed "link" means
"tie it to a column".

### 11. `--step $S --click-at 1193,324` (13.png)

Saw: Size now "1 to 3". Valjean in the middle is a big dark ball, Myriel at the bottom is big too,
a handful of mid-sized ones. The key gained a "Size: Influence" row with a grey wedge.

Think-aloud: "**Part 3 done: bigger dots for the characters that matter more.** Now it actually
reads -- the big one in the middle jumps out."

### 12. Names -- `--step $S --click-at 1419,324` (14.png)

Think-aloud: "Label, plus." Saw a list: id, name, Influence, Influence rank, Influence percentile.
"Name, obviously."

### 13. `--step $S --click-at 1117,454` (15.png)

Saw: names appeared above the dots. A note in the panel: "77 labels, 6 hidden to avoid overlap".

Think-aloud: "**Part 4 done: names on the drawing.** But they're really small -- on a call I
couldn't read them. And which 6 are hidden? I can't find Valjean's name; the biggest, most
important dot seems to have its name covered by the ball itself. That's the one name I'd want."

Hesitated: I looked for a way to make labels bigger but didn't try one -- the task didn't ask, and
I wanted to finish.

### 14. Picture -- `--step $S --click-at 23,20` (16.png)

Think-aloud: "Saving a picture -- the menu, top left." Saw New project, Open, Save, Export...,
Settings, Keyboard shortcuts, Help. "Export."

### 15. `--step $S --click "Export..."` (17.png)

Saw: an Export dialog. Image / Data on the left. Preset "To share -- PNG, 2x", View "Current view",
sizes, format PNG, background, and a preview -- with the key visible in the top-left corner of the
preview.

Think-aloud: "Nice, it defaults to 'to share', and I can see the key is in the picture. Export."

### 16. `--step $S --click "Export#2"` (18.png) -- the tool could not resolve that name; nothing happened.

Then `--step $S --click-at 1065,750` (19.png): "a file was saved: les-miserables_current-view.png,
1806 x 1720".

Think-aloud: "**Part 5 done: I have a picture file with its key.**"

Looking at the saved file: the key is there ("Size: Influence", "Color: Influence", each from
0.003299 to 0.07543). The dots and colors match the screen. But the names are tiny and blurry, and
Valjean's name is unreadable under his own ball.

### 17. `--end $S`

## What the sizes and colors stand for (said out loud, in character)

"Both the size and the color show the same thing: 'Influence', which is what the app calls PageRank
-- how connected a character is to other well-connected characters. Bigger and darker = more
influential. Valjean is by far the biggest, then Myriel, then Gavroche, Marius and Javert. The
numbers on the key (0.003 to 0.075) are just the influence scores; I couldn't tell you what a 0.03
means, only that higher is more."

## At the end, in character

- **Did I finish?** Yes, all five parts, in about 16 actions, with no dead ends.
- **How hard was it? 3 out of 7.** Easier than I expected. "Start here" on PageRank and the Top 10
  list carried me. The slow parts were finding Size and the chain icon.
- **What confused me:**
  1. **"Size" is hidden under "Shape".** I had to guess that the plus next to Shape held it. Size is
     the first thing I'd look for under Style.
  2. **The chain icon for "Size by attribute"** only made sense after I hovered it, and "attribute"
     is a database word.
  3. **The name changed from PageRank to Influence** between the menu and the result. I worked it
     out, but for a second I wondered if I'd run something else.
  4. **The color alone told me almost nothing.** After running the analysis, nearly every dot was
     the same orange; only the Top 10 list (one click away) said who mattered.
  5. **Labels are too small, and the most important name is missing.** Valjean's label is hidden
     behind his own big ball, on screen and in the picture. "6 hidden to avoid overlap" doesn't say
     which. In the exported picture the names are blurry.
  6. **The key's numbers have no meaning to me.** "0.003299 -- 0.07543" with no "low/high" or
     "less/more influential" wording.
  7. **"Undirected, from the file: directed 0"** in the overview reads like a broken sentence.
  8. **The Export button in the dialog has the same name as the menu item**, so the first try
     (asking for the second "Export") did nothing; I had to aim at it.
