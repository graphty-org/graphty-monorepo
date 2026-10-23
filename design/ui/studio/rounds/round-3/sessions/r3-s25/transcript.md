# Session r3-s25 -- Nadia (level-1 alert reviewer), task T9 A (Les Miserables)

Task as given: practice on the ready-made Les Miserables network; make the drawing show which
characters the network depends on most (more dependence = bigger dot); then say what the sizes
and colors now stand for. Start: empty app.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s25 empty`

Screenshot 01.png: start page. Left "Start" (Open project or file, New from data), middle
"Recent projects" (empty), right "Samples" with Les Miserables (77 characters) listed first. A
"Your data is yours, but please help us" banner at the bottom asking to share usage data.

In character: "Bank laptop, I'm not sharing usage data with anybody. No thanks. Then the Les
Miserables one on the right."

## Step 2 -- decline sharing, open Les Miserables

Command: `--step --click "No thanks" --click "Les Miserables"`

Screenshot 02.png: the network is drawn, all dots blue and roughly the same size. Left panel
has a search box, "Selection", "Everything". Right panel "Graph / From Les Miserables" with
Style and Values tabs and an overview (77 nodes, 254 edges, density, components). Bottom-left
hint: "Analyze (flask icon) in the toolbar (Shift+A) to add results here". Bottom toolbar: a
flask, a chart-ish icon, "3D", a magnifier.

In character: "All the dots are the same. Nothing's worked out yet. The note at the bottom says
Analyze is the flask, so that's where you work something out. Clicking the flask."

## Step 3 -- (accidental) hover on the first icon

Command: `--step --hover-icon 1` -- tooltip "Main menu: open, save, export, settings". Screenshot
03.png, nothing changed. Not a decision, just a stray look at the hamburger.

## Step 4 -- open Analyze

Command: `--step --click-at 679,864` (button "Analyze")

Screenshot 04.png: a list pops up, "Filter analyses", heading "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here" tag), Eigenvector,
Katz, HITS, All-pairs distance, Depth-first order (grayed, "Select a node first"), Most flow...

In character: "Lots of words I don't know. 'Depends on most'... Betweenness says 'sit on the
most shortest paths between others' -- that sort of sounds like everybody has to go through
them. But PageRank says Start here, and I'm new, so I'll do what it tells me. If it's wrong,
it's their label that was wrong." (Hesitated between Betweenness and PageRank; took the tag.)

## Step 5 -- pick PageRank

Command: `--step --click "PageRank"`

Screenshot 05.png: the popup turns into a PageRank form: "Which nodes are connected to other
well-connected nodes.", Damping factor 0.85, Weight None, Advanced (collapsed), "Under a
second", blue Run button.

In character: "Damping factor, no idea, leaving it. Weight None is fine. Run."

## Step 6 -- Run

Command: `--step --click "Run"`

Screenshot 06.png: all dots turned orange, a few darker (one in the middle, one at the bottom
hub). A legend top-left of the drawing: "Color: PageRank 0.003299 [orange bar] 0.07543". Left
panel now has a "PageRank 77" row between Selection and Everything. The dots are still all the
same size.

In character: "OK, it colored them. Darker means more, I guess. But they asked for bigger dots,
not colors. The sizes didn't change. There's a Style tab up on the right -- styles is probably
where size lives."

## Step 7 -- Style tab (graph level)

Command: `--step --click "Style"`

Screenshot 07.png: right panel Style: Canvas background color, Method "Force - Recommended",
Shape 3D/2D, Spring length, Gravity, Advanced, "Applied". Nothing about dot size.

In character: "This is background and the layout thing. No size. Dead end. Let me click the
PageRank row on the left, that's the thing I just made."

## Step 8 -- click the PageRank row

Command: `--step --click "PageRank"`

Screenshot 08.png: the row is highlighted with an eye icon. Right panel now titled "PageRank /
Measure from PageRank, Oct 7", Style tab, Nodes/Edges switch. Sections: Fill (+), Color =
PageRank (with a minus), Shape (+), Effects (+), Label (+), Tooltip (+).

In character: "Now we're talking. Color is PageRank, that's the orange. No 'Size' anywhere
though. Shape is the closest thing -- a dot's size is kind of its shape. Plus next to Shape."

## Step 9 -- plus next to Shape

Command: `--step --click-at 1419,234` (button "Add to Shape")

Screenshot 09.png: a small menu: "Size" (highlighted) and "Shape".

In character: "There it is, Size. Hidden under Shape, but OK."

## Step 10 -- Size

Command: `--step --click "Size"`

Screenshot 10.png: a "Size by attribute" popup: search box, "Fixed size", group "PageRank" with
PageRank, PageRank rank, PageRank percentile; then grayed "Cannot be used: Holds groups, not
amounts" -- id, name.

In character: "Three PageRanks. Rank and percentile -- rank 1 is the top one, so would rank make
the top one small? I don't want to think about that. Plain 'PageRank', same thing the color
uses."

## Step 11 -- size by PageRank

Command: `--step --click-at 1195,416` (option "PageRank")

Screenshot 11.png: dots now differ in size. One big dark-brown dot in the middle, a second big
one at the bottom hub, a few medium ones up top; most stay small. Right panel shows "Size 1 to
3" next to Color PageRank. The legend box now has two rows: "Size: PageRank 0.003299 (gray
wedge) 0.07543" and "Color: PageRank 0.003299 (orange bar) 0.07543".

In character: "That's it, the big ones pop now. Before I write anything down I want to know who
the big one is -- hovering it."

## Step 12 -- hover the biggest dot

Command: `--step --hover-at 768,447` (the tool reports node id "Valjean"; on screen nothing
appeared, tooltip null)

Screenshot 12.png: identical to 11.png. No name, no box, no value when hovering the big dot.

In character: "Nothing. It doesn't tell me who it is when I point at it. There's a 'Tooltip +'
on the right so I suppose I'd have to set that up myself. Not today -- the job was the sizes,
and the sizes are done."

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s25`

## Debrief (in character)

**Did I finish?** Yes, I think so. The dots are now sized by PageRank and the biggest ones are
the characters the network leans on most (if PageRank is the right measure for "depends on" --
I took it because the list said "Start here").

**What the sizes and colors stand for now:** both stand for the same thing, PageRank -- the
little box in the top-left corner says "Size: PageRank" and "Color: PageRank", both running from
0.003299 to 0.07543. Bigger and darker = higher PageRank, which the menu described as "connected
to other well-connected nodes". So the big dark dot in the middle is the most important
character and the big one at the bottom hub is second. I could not tell you their names from the
screen.

**Rating: 5 of 7.** Running the analysis was quick and the color came by itself. Making the
sizes was three clicks once I found it, but I found it on the second try.

**What confused me / where I hesitated:**

- Which analysis means "depends on". Betweenness ("sit on the most shortest paths between
  others") sounded closer to "depends on" than PageRank ("connected to other well-connected
  nodes"). I went with the "Start here" tag, not because I understood the difference. QA would
  ask me why PageRank, and my honest answer is "the app said start here".
- Running it colored the dots but did not size them, and the task was sizes. I first went to
  the Style tab on the right, which only had background and layout settings -- a dead end.
- Size lives under "Shape", behind a plus button. I only found it after clicking the PageRank
  row on the left. "Size" as its own row would have been obvious.
- The size picker offered PageRank, PageRank rank and PageRank percentile. I wasn't sure whether
  "rank" would make number 1 big or small, so I avoided it.
- Size and color now say the same thing twice. Fine, but I wasn't sure if I was supposed to
  leave the color as it was or make it mean something else.
- The legend numbers (0.003299 to 0.07543) mean nothing to me; I couldn't put them in an alert
  file without explaining them.
- Hovering the biggest dot shows nothing, so I can't say who the important characters are
  without more digging.
