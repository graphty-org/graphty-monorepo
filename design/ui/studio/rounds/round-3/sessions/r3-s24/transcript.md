# Session r3-s24 -- Explorer Elena, Les Miserables (bigger dots for the characters that matter)

Participant: Elena, a product manager who has never used this program. Start: empty.

Task as given: practice on the ready-made Les Miserables network. Make the drawing show which
characters the network depends on most -- the more it depends on a character, the bigger that
character's dot. Then say what the sizes and the colors on the drawing now stand for.

## Start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s24 empty` -> 01.png

Saw: a start page. "Open project or file...", "New from data...", Recent projects (empty), and on
the right "Samples" with Les Miserables (77 characters) at the top. A usage-data banner at the
bottom asks me to share usage data.

Elena: "OK, there's Les Miserables right there. First let me get rid of this data-sharing box --
no thanks -- then open the sample."

## Step 2

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the network opened. Lots of blue dots, all about the same size, gray lines, no names. Left
panel: a search box, "Selection", "Everything". Right panel: "Graph", Nodes 77, Edges 254, Density
0.08681 (no idea), Components 1. Bottom center a little toolbar with a flask, a chart-ish icon,
"3D" and a magnifier. Bottom left a faint line about "Analyze ... in the toolbar".

Elena: "Ooh, OK, it's a web of dots. They're all the same size and color, so nothing's worked out
yet. Let me click the one in the middle where everything crosses and see who that is."

## Step 3

Command: `--step --click-at 768,447` -> 03.png (tool: node "Valjean")

Saw: the middle dot got a yellow ring. The right panel now says "Valjean", Node, with id, name and
"Degree 36" with a little arrow.

Elena: "Valjean -- the main guy, makes sense he's in the middle. Degree 36, I guess that's... his
score? So he matters. But all the dots are still the same size. I need something that makes the
important ones bigger. There's a little toolbar at the bottom -- what's the flask one?"

## Step 4

Command: `--step --hover-at 680,864` -> 04.png (tooltip "Analyze Shift+A")

Elena: "Analyze. That sounds like where it works things out. Let's click it."

## Step 5

Command: `--step --click "Analyze"` -> 05.png

Saw: a long pop-up list, "Rank nodes and edges": Degree, Betweenness, Edge betweenness,
Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance,
Depth-first order, Most flow... each with a small gray line under it.

Hesitated here. Elena: "Oof, that's a lot of words. Betweenness, Katz, HITS... I don't know which
one is 'who the network depends on'. Degree I saw on Valjean. But this one says 'Start here' --
good, someone picked for me. PageRank. Like Google? Fine."

## Step 6

Command: `--step --click "PageRank"` -> 06.png

Saw: the pop-up became a PageRank form: "Which nodes are connected to other well-connected
nodes." Damping factor 0.85, Weight None, "Advanced" (collapsed), "Under a second", and a blue
Run button.

Elena: "Damping factor? No idea, leave it. Weight none, fine. Not touching Advanced. Run."

## Step 7

Command: `--step --click "Run"` -> 07.png

Saw: all the dots turned orange, some darker brown (Valjean's area, and the hub at bottom left).
A small box top-left of the drawing: "Color: PageRank, 0.003299 [orange bar] 0.07543". The left
panel got a new row "PageRank 77" between Selection and Everything. Valjean's panel now says
"PageRank 0.07543, #1 of 77".

Elena: "OK! Valjean is number 1 of 77, that's the answer I wanted. But it colored them, it didn't
make them bigger. Darker means more, I think. The task wants size. Hmm. There's this new
'PageRank' row on the left -- maybe clicking it gives me options."

## Step 8

Command: `--step --click "PageRank"` -> 08.png (tool: ambiguous, took the left-panel row)

Saw: the PageRank row is highlighted. The right panel switched to "PageRank, Measure from
PageRank, Oct 7", Style tab, Nodes/Edges. Rows: Fill (+), Color = PageRank (-), Shape (+),
Effects (+), Label (+), Tooltip (+). No word "size" anywhere.

Hesitated. Elena: "So this is where its looks are set. Color is PageRank, that's the orange.
I want size... there's no 'Size'. Shape is the closest -- a bigger circle is still a shape?
Let me hit the plus next to Shape."

## Step 9

Command: `--step --click-at 1419,233` -> 09.png (tool: button "Add to Shape")

Saw: a little menu: "Size" (highlighted) and "Shape".

Elena: "There it is -- Size. Hidden under Shape, but OK."

## Step 10

Command: `--step --click "Size"` -> 10.png

Saw: a pop-out "Size by attribute": a search box, "Fixed size", then under "PageRank": PageRank,
PageRank rank, PageRank percentile. Grayed out below: "Cannot be used: Holds groups, not
amounts" -- id, name.

Elena: "Size by... PageRank. Rank and percentile, I don't know the difference, the plain one is
the score I saw on Valjean. Pick plain PageRank."

## Step 11

Command: `--step --click-at 1195,416` -> 11.png (tool: option "PageRank")

Saw: the dots changed size. Valjean is now a huge dot in the middle; a big one at the bottom left
where the fan of lines meets; a few medium ones up top and around the middle; most are small.
The box top-left now has two lines: "Size: PageRank 0.003299 [gray wedge] 0.07543" and
"Color: PageRank 0.003299 [orange bar] 0.07543". The right panel shows "Size 1 to 3".

Elena: "Ooh, there we go. Valjean is the giant one. And that other big one at the bottom left
with all the lines fanning out -- who's that? Let me click it."

## Step 12

Command: `--step --click-at 631,676` -> 12.png (tool: node "Myriel")

Saw: Myriel, "PageRank 0.04278, #2 of 77", Degree 10. With the yellow ring gone, Valjean's dot
in the middle is now the darkest brown and biggest.

Elena: "Myriel, number 2. OK. I think that's it -- the big dots are the ones that matter."

Command: `--end rounds/round-3/sessions/r3-s24`

## Wrap-up (in character)

**Did I finish?** Yes, I think so. The dots are now sized by PageRank: Valjean is by far the
biggest, Myriel (bottom left, with the fan of characters only connected to him) is second, and a
handful of medium ones sit in the middle and top clusters.

**What the sizes and colors stand for, as I'd say it:** "Size and color both show the same
thing, PageRank -- how much a character is connected to other well-connected characters. Bigger
and darker brown means the story leans on them more. Valjean is #1 by a mile." I'd also have said
"it's basically how many people they're connected to" -- but Myriel only has 10 connections and
is #2, so I'm not totally sure that's right. I didn't dig into it.

Slack sentence: "Valjean and Myriel hold the Les Mis network together -- biggest dots by PageRank."

**How easy, 1 (very difficult) to 7 (very easy): 5.**

**What went well:** the sample was one click from the start page. The flask button said
"Analyze" when I hovered it. The "Start here" tag on PageRank saved me from choosing between a
dozen words I don't know. Running it colored everything right away, with a little key in the
corner, and Valjean's panel told me "#1 of 77", which is the kind of number I trust.

**Where I hesitated / what confused me:**

- The Analyze list is a wall of jargon (Betweenness, Katz, HITS, Eigenvector...). Without the
  "Start here" tag I'd have guessed or quit. I still don't know if PageRank is the right one for
  "depends on most" -- I just trusted the tag.
- Running it made the dots _colored_, not _bigger_. I had to figure out on my own that clicking
  the new "PageRank" row on the left opens its look on the right.
- There was no "Size" in that panel. It was hidden under the plus next to "Shape". I only found
  it because Shape was the closest word.
- The size list offered "PageRank", "PageRank rank" and "PageRank percentile" -- no idea what
  the difference is. I picked the plain one.
- The key in the corner shows 0.003299 to 0.07543. Is 0.07 a lot? I only understood it through
  "#1 of 77" in the side panel.
- The PageRank form asked about a "Damping factor" -- I left it alone, but it made me nervous.
- Clicking a dot paints a big yellow ring that hides its color, so I couldn't see Valjean's own
  shade while he was selected.
