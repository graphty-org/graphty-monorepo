# Session r2-s29 -- Tom (recipe recipient), task T9 Prompt A (Les Miserables)

Task as read to me: practice on the ready-made Les Miserables network that comes with the program. Make the
drawing show which characters the network depends on most -- the more it depends on a character, the bigger
the dot. Then say what the sizes and the colors now stand for.

Commands run from design/ui/studio with S=rounds/round-2/sessions/r2-s29.

## Step 1 -- start

`node tool/real.mjs --start $S empty` -> 01.png

What I see: a dark start page. "Open project or file", "New from data", and on the right "Samples" with
Les Miserables (77 characters) at the top. A box at the bottom asks about usage data. Top right says
"Local only" with a lock, and "Files are read on this computer and never uploaded" -- good, though I have
no data of my own today anyway. I'll say no thanks to the usage data first, then open Les Miserables.

## Step 2 -- No thanks

`node tool/real.mjs --step $S --click "No thanks"` -> 02.png

The usage box should be gone. Next I click the Les Miserables sample, the biggest obvious thing for this task.

## Step 3 -- open the sample

`node tool/real.mjs --step $S --click "Les Miserables"` -> 03.png

What I see: a picture of blue dots and grey lines, all the same blue, all about the same size, no names on
them. Right side says 77 nodes, 254 edges, density, components -- numbers I don't need. Bottom left, in small
grey, "Analyze (a flask) in the toolbar (Shift+A) to add results here". There's a flask button at the bottom
of the picture. "The network depends on most" -- I suppose that's something it has to work out, so I'll try
the flask, since the page itself points me there.

## Step 4 -- the flask

`node tool/real.mjs --step $S --click "Analyze"` -> 04.png

What I see: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank,
Eigenvector, Katz, HITS, All-pairs distance... These are names I don't know and I'm not learning them at 4 pm.
The small grey lines under each are hard to read. None of them says "depends on". One has a blue tag, "Start
here" -- PageRank. I'm not going to compare nine of these. I'll take the one the program says to start with.
(Hesitation: Betweenness's grey line mentions "sit on ... paths between others", which might be closer, but
I can't tell, and "Start here" is what my eye goes to.)

## Step 5 -- PageRank

`node tool/real.mjs --step $S --click "PageRank"` -> 05.png

What I see: a small box "PageRank" asking "Damping factor 0.85" and "Weight: None", an "Advanced" fold, and
a blue "Run" button with "Under a second". I don't know what damping factor is and I'm not touching it. Leave
everything as it is and press Run -- it's the blue button.

## Step 6 -- Run

`node tool/real.mjs --step $S --click "Run"` -> 06.png

What I see: every dot went from blue to orange. A box top left says "Color: Influence" with a bar from
0.003299 to 0.07543. On the left a new row "Influence 77". The dots are all still the same size. Some dots
look a darker brown than others but honestly the difference is slight -- two or three look darker, the rest
look the same orange to me. So it worked something out and called it "Influence" (not PageRank -- I assume
that's the same thing?). But I was asked for bigger dots, and nothing got bigger. I'll click the "Influence"
row on the left to see what it offers.

## Step 7 -- the Influence row

`node tool/real.mjs --step $S --click "Influence"` -> 07.png

What I see: the right side changed to "Influence", "Measure from Influence, Oct 6", a Style tab with Nodes /
Edges, then Fill (+), Color: Influence (-), Shape (+), Effects (+), Label (+), Tooltip (+). There's no word
"Size" anywhere. Color is already set to Influence, that's the orange. Size of a dot... I'd guess it lives under
"Shape". I'll press the + next to Shape.

## Step 8 -- + next to Shape

`node tool/real.mjs --step $S --click-at 1419,234` -> 08.png ("Add to Shape")

What I see: a little menu with "Size" and "Shape". There it is -- Size was hiding under Shape. I'll click Size.

## Step 9 -- Size

`node tool/real.mjs --step $S --click "Size"` -> 09.png

What I see: a new row "Size" with a box saying "1", a little chain-link symbol, and a minus. The dots didn't
change. A "1" makes every dot the same, which is what I already have. The Color row above says "Influence"
in a little chip; the Size row doesn't. The only other thing on the Size row is that chain symbol, so I'll
try it -- hoping it hooks the size to Influence the way color is. (Hesitation: I don't know what a chain
means here; I'm a bit worried it links something to her file.)

## Step 10 -- the chain symbol

`node tool/real.mjs --step $S --click-at 1380,264` -> 10.png ("Size by attribute")

What I see: a box "Size by attribute" with a list: Influence, Influence rank, Influence percentile; and greyed
out "id" and "name" with "Cannot be used: Holds groups, not amounts". Good -- that answers what the chain
was. "Attribute" isn't my word, but "Influence" is right there and it's what the colors use. I'll pick plain
"Influence".

## Step 11 -- Influence for size

`node tool/real.mjs --step $S --click "Influence#2"` -> 11.png

What I see: now the dots are different sizes. One big dark-brown dot in the middle, a fairly big one at the
bottom with a fan of small dots around it, a few medium ones up top. The box top left now has two lines:
"Size: Influence 0.003299 to 0.07543" and "Color: Influence 0.003299 to 0.07543". The Size row on the right
says "1 to 3". So the bigger-dots part is done. But nothing tells me who the big dot is -- there are no
names. I'll click the big middle dot to see who it is.

## Step 12 -- the big dot

`node tool/real.mjs --step $S --click-at 768,447` -> 12.png (node "Valjean")

What I see: the big dot lit up yellow and the right side says "Valjean", Node, and under Results: "Influence
0.07543, #1 of 77", Degree 36. So Valjean is the one the network leans on most -- that matches what I
remember of the book, which makes me trust it a little. "#1 of 77" is the part I can actually read out in a
meeting. I think I'm done.

## End

`node tool/real.mjs --end $S`

## In my own words, at the end

**Did I finish?** Yes, I think so. The dots are now sized by what the program calls "Influence": the bigger
the dot, the more the network depends on that character. Valjean is the biggest, "#1 of 77"; there's another
big one at the bottom with a fan of small ones round it.

**What the sizes and colors stand for:** both stand for the same thing, "Influence". The box in the top left
says "Size: Influence" and "Color: Influence", both running from 0.003299 to 0.07543. Bigger dot = higher
influence; darker brown = higher influence. So the color isn't telling me anything the size doesn't. What
"Influence" means in plain English, I can only go on the grey line in the list: "which nodes are connected to
other well-connected nodes". The numbers 0.003299 and 0.07543 mean nothing to me -- I couldn't tell the PI
what a 0.07 is. I'd say "bigger and darker means more central, Valjean is top".

**How easy: 4 out of 7.** The middle bit was fine once I found it, but two places I was guessing.

**What confused me:**

- The list behind the flask is nine names I don't know (Degree, Betweenness, Closeness, PageRank, Katz,
  HITS...). Nothing says "who the network depends on". I only picked PageRank because it had "Start here" on
  it. I honestly don't know whether Betweenness was the right one instead -- its grey line sounded closer.
- I picked PageRank but on the drawing and on the left it's called "Influence". I assumed they're the same
  thing; nothing said so where I was looking.
- Running it changed the colors but not the sizes, and the task was about size. For a moment I thought it
  hadn't done what I asked.
- "Size" was hidden under the + next to "Shape". I'd not have thought to look there if there'd been anything
  else to try.
- After adding Size it said just "1" and nothing changed. I had to click a chain symbol with no words on it
  to get "Size by attribute". I nearly didn't, because a chain makes me think it links to something.
- The orange shades are hard for me to tell apart; it was the sizes that made it readable, not the color.
- No names on the dots. I had to click the big one to find out it was Valjean.

She could have just sent me a PNG with the top ten circled -- but this time I got there without asking her.
