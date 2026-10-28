# Session r1-s29b: Tom, Florentine families, bigger dots for the families that matter

Participant: Tom, 52, lab manager, does not build networks, reads headings and numbers, skips
small grey text and hover tips. Never used this program before.

Task (prompt B): using the ready-made network of the leading families of Renaissance Florence
and the marriages between them, make the drawing show which families the network depends on
most -- the more it depends on a family, the bigger that family's dot. Then say what the sizes
and the colors now stand for.

Start: empty. Tool: `design/ui/studio/tool/real.mjs`, session folder
`rounds/round-1/sessions/r1-s29b`.

## Steps

### 1. Start

`node tool/real.mjs --start rounds/round-1/sessions/r1-s29b empty` -> 01.png

Saw: a start page. "Open project or file...", "New from data...", a "Recent projects" column
that is empty, and "Samples" on the right: Les Miserables, Zachary's karate club, College
football, Florentine families ("15 families. Marriages between the leading families of
Renaissance Florence. Good for finding who brokers between groups."). At the bottom, a box asking
to share usage data.

Think-aloud: "There it is, Florentine families, on the right. First the box at the bottom -- I
don't want to send anything anywhere. 'No thanks'." The line "Files are read on this computer and
never uploaded" and "Local only" at the top reassured him.

### 2. Decline usage data, open the sample

`--step --click "No thanks" --click "Florentine families"` -> 02.png

Saw: 15 blue dots joined by grey lines, no names on any dot. Right panel "Graph": Nodes 15,
Edges 20, Density 0.1905, Components 1, "Edges per n... 1 to 6, mean 2.667". Left panel:
Selection, Everything. Bottom left in small text: "Analyze (Shift+A) to add results here". A
toolbar of five icons at the bottom.

Think-aloud: "All the same size, all blue, and no names. Which one is the Medici? The right side
is statistics, I'm not reading density. It says 'Analyze' bottom left -- the beaker icon is
probably that."

### 3. Open Analyze

`--step --click-at 659,864` (the beaker) -> 03.png, "button Analyze"

Saw: a list titled "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, more below.
Each with a one-line grey description.

Think-aloud: "I don't know any of these and I'm not learning them at 4 pm. One says 'Start here'.
I'll do what it tells me." Hesitated a few seconds over the names; did not read the descriptions.

### 4. Pick PageRank

`--step --click-at 536,600` -> 04.png (tool noted the drawing was still moving briefly)

Saw: a small "PageRank" card: "Damping factor 0.85", "Under a second", a blue "Run" button.

Think-aloud: "Damping factor. No idea. Leave it alone. Run."

### 5. Run

`--step --click "Run"` -> 05.png

Saw: every dot turned orange, in shades from light orange to dark brown; one dot in the middle is
nearly black-brown. A box at the top left of the drawing: "Color: Influence 0.03066 [bar]
0.1458". The left list gained a row "Influence 15". The dots are all still the same size. The
color box sits on top of the top-left dot and hides it.

Think-aloud: "It colored them. It didn't make anything bigger. And it calls it 'Influence', not
PageRank -- I assume that's the same thing? The task says bigger dots, so I'm not done." Also:
"Orange to brown. Fine for me, it's light to dark, not red and green."

### 6. Look at the Influence row

`--step --click-at 122,156` -> 06.png

Saw: right panel now "Influence, Measure, from Influence, Oct 6" with a Values tab: a bar of 15
equal grey blocks, "15 of 15 have a value, 0.03066 to 0.1458, median 0.06886", and "Top 10":
Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881, Albizzi 0.07912, Tornabuoni 0.07128, Ridolfi,
Castellani, Bischeri, Peruzzi, Salviati. "Made with: Analysis Influence, Ran Oct 6, Damping
Factor 0.85".

Think-aloud: "Good, a list with names and numbers. Medici on top, by a lot. That is what I'd tell
the PI. But I still need bigger dots. There's a 'Style' tab."

### 7. Style tab

`--step --click-at 1222,96` -> 07.png

Saw: Nodes / Edges. Rows: Fill (+), Color = Influence (-), Shape (+), Effects (+), Label (+),
Tooltip (+). No row says "Size".

Think-aloud: "No 'size' anywhere. Shape? Size is a kind of shape, maybe." Hesitated here.

### 8. Plus next to Shape

`--step --click-at 1419,226` -> 08.png, "button Add to Shape"

Saw: a little menu: Size, Shape.

Think-aloud: "There it is, hiding under Shape."

### 9. Size

`--step --click-at 1307,262` -> 09.png

Saw: a new row "Size" with a box showing "1" and a small arrow, a chain-link icon, and a minus.
The dots did not change.

Think-aloud: "Size 1. That's not what I want, I want it to follow the influence like the color
does. The arrow, maybe."

### 10. The arrow on the Size box (dead end)

`--step --click-at 1352,256` -> 10.png, "button Open list"

Saw: an empty dark sliver under the box. Nothing to choose.

Think-aloud: "It opened... nothing. Empty. Did I do that wrong?" First dead end.

### 11. The chain-link icon

`--step --key Escape --click-at 1380,256` -> 11.png, "button Size by attribute"

Saw: a list "Find an attribute": under "Influence": Influence, Influence rank, Influence
percentile. Below, greyed: "Cannot be used: Holds groups, not amounts" -- id, name.

Think-aloud: "Second try, the chain thing. Now it wants an 'attribute'. Influence -- same word as
the color, so that one." Did not consider rank or percentile.

### 12. Choose Influence

`--step --click-at 1193,324` -> 12.png

Saw: the dots changed size. The dark middle dot is now by far the biggest; a second large dot to
its right; others medium; several small ones at the edges. The Size box reads "1 to 3". The box
at the top left now has two lines: "Size: Influence 0.03066 [grey wedge] 0.1458" and "Color:
Influence 0.03066 [orange bar] 0.1458". It still covers the top-left dot.

Think-aloud: "That's it. Big and dark means the network leans on that family. The biggest one is
probably the Medici, because they were at the top of the list -- but the dots have no names, so I
can't point to it on a slide."

### 13. End

`--end rounds/round-1/sessions/r1-s29b`

## Answer, in character

"The size and the color both show the same thing, what it calls 'Influence': bigger and darker
means the network depends on that family more. The numbers go from about 0.03 to 0.15. The
Medici are the top one, 0.1458, well ahead of Guadagni and Strozzi. I can't tell you what 0.15
means in English -- it's a score, higher is more."

## Debrief, in character

- Finished? Yes, I think so. The dots are sized and colored by the same thing.
- How hard (1 = very easy, 7 = very hard): 4.
- What confused me:
    - The list of analyses was all names I don't know. I only got past it because one said "Start
      here".
    - I asked for PageRank and everything after that called it "Influence". I assumed it was the
      same thing.
    - Running it colored the dots but did not size them. The task said bigger, so I had to go
      looking.
    - Size is hidden under "Shape". I would not have guessed that if I hadn't tried the plus.
    - The arrow on the Size box opened an empty list. That was a dead end; the chain-link icon was
      the one that worked, and nothing tells you that.
    - No names on the dots. The list on the right says Medici is top, but I can't show which dot is
      the Medici without pointing.
    - The legend box covers the top-left dot.
    - What the number 0.1458 means in plain words: nothing on screen told me.
    - Color and size now say the same thing twice. Fine by me, but I'd ask her whether that's what
      she meant.
