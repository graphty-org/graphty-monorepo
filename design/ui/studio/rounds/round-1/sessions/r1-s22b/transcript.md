# Session: Grace, the Medici family and who they married into (Florentine families)

Participant: Grace, operations and data coordinator at a small nonprofit. She uses Excel every
day and has never used a network tool. Start: the empty app, nothing loaded.

Prompt: "You have never used this program before. You will practice on the ready-made network
of the leading families of Renaissance Florence and the marriages between them, which comes with
the program, not on your own data. Go to the Medici family, read what the program knows about
them, and see which families they married into. Tell us who they are and how many."

All commands were run from the worktree root, with
`S=design/ui/studio/rounds/round-1/sessions/r1-s22b`.

## Think-aloud and steps

**01.png -- `--start $S empty`.** A start page with "Open project or file...", "New from data...",
"Recent projects" and "Samples". The first thing I read was "Files are read on this computer and
never uploaded", which I'm glad to see because donor names are sensitive. Under Samples there's
"Florentine families, 15 families". That's the one I want. There's also a usage-data box at the
bottom.

**02.png -- `--click "No thanks"`.** I'd say no to sharing data before I knew the tool anyway.
The box went away.

**03.png -- `--click "Florentine families"`.** A drawing of 15 blue balls joined by lines. None of
them have names on them, so I can't tell which ball is the Medici. On the right the panel says
Nodes 15 and Edges 20. I guess nodes are the families and edges are the marriages. There's also
"Density 0.1905" and "Edges per n... 1 to 6, mean 2.667", which mean nothing to me. On the left
there's a search box: "Find nodes, edges, values".

**04.png -- `--click "Find nodes, edges, values" --type "Medici"`.** This failed: the tool says
nothing on screen has that name, so it typed nothing. (The visible text is placeholder text, not
the box's name.) Nothing changed on screen.

**05.png -- `--click-at 176,90 --type "Medici"`.** I clicked right on the search box and typed.
I got a list with "Elements: Medici" and "Values: Select where name is Medici (1)". Good, it
found them.

**06.png -- `--click-at 116,153` (the Medici result).** One ball near the middle is now yellow
and ringed. The right panel says "Medici, Node" and lists id Medici, name Medici, Degree 6. I
don't know the word "Degree". My guess is that it means six lines go out from this ball, which
would be six marriages. A small round button showed up above the toolbar.

**07.png -- `--hover-at 749,812`.** The tooltip says "Neighborhood" with a "G" after it. I think
that's the keyboard shortcut, but it reads as "NeighborhoodG". "Neighborhood" sounds like "who is
next to them", so I'll try it.

**08.png -- `--click "Neighborhood"`.** Seven balls are yellow now: the Medici and six around
them. That matches Degree 6, so I'm fairly sure there are six families. The panel header says
"7 nodes, 0 edges", but a row below it says "Edges among them 7". Zero edges and seven edges in
the same panel confused me. The id and name rows only show "Acciaiuoli (1)", which is one name,
not the list of seven I wanted.

**09.png -- `--click-at 1380,276` (the "Acciaiuoli (1)" value).** I hoped it would open into the
full list. Nothing happened.

**10.png -- `--click-at 28,132` (Data on the left rail).** I expected a spreadsheet, like Excel.
Instead I got a tree: Sources (Florentine..., Node t... 15 rows, Edge... 20 rows) and Attributes
(Nodes: id, name). There was no table.

**11.png -- `--hover-at 789,864`.** The blue button on the bottom toolbar is "Legend" (tooltip
"LegendL"). It doesn't help me get names.

**12.png -- `--hover-at 753,252` (one of the yellow balls).** I hovered a ball, hoping a name
would pop up. Nothing showed on the screen.

**13.png -- `--click-at 1420,74` (the "..." on the selection panel).** The only option was "Frame
selection". No "show as list" and no "copy names".

**14.png -- `--key Escape --click-at 160,168` ("Node t... 15 rows").** I thought this would open
the table of 15 families. Instead a screen called "Add to Florentine families" came up, asking me
to drop a file and press Load. That isn't what I asked for, and it made me nervous that I might
add something by accident.

**15.png -- `--click "Cancel"`.** I'm back at the drawing, but my yellow selection is gone, so all
the balls are plain again. I lost my place.

**16.png -- `--click-at 1222,104` (Style tab, with nothing selected).** It shows Canvas,
Background, Method "Force - Recommended" and Seed 1. There's nothing about putting names on the
balls.

**17.png -- `--click-at 151,349` ("name" under Attributes).** The panel shows Table Nodes,
"Has a value 100%" and "Distinct values 15". That confirms there are 15 names, but it still
doesn't let me see them or put them on the drawing.

**18.png -- `--rclick-at 749,470` (right-click the Medici ball).** No menu appeared. It just
selected the Medici again, and the panel shows Degree 6.

**19.png -- `--click-at 1222,104` (Style tab for the Medici).** It shows "Why this look: Node
defaults (Color, Size, Shape)". Labels aren't mentioned.

**20.png -- `--click-at 838,864` (Quick actions).** A command list: Go to Graph or Data, Find,
"Add label line" (greyed out), Analyze, and New from data... "Add label line" sounds like what I
want, but I can't click it and nothing tells me why.

**21.png -- `--key Escape --click-at 753,252`.** I gave up on getting a list and started clicking
the balls that had been yellow, one at a time, reading the name at the top of the right panel
each time.

- 21.png: **Salviati** (Degree 2)
- 22.png, `--click-at 571,357`: **Acciaiuoli** (Degree 1)
- 23.png, `--click-at 697,416`: **Tornabuoni** (Degree 3)
- 24.png, `--click-at 584,549`: **Ridolfi** (Degree 3)
- 25.png, `--click-at 791,545`: **Barbadori** (Degree 2)
- 26.png, `--click-at 913,603`: **Albizzi** (Degree 3)

I had to remember the six positions from screenshot 08, because the yellow highlight was gone by
then. Each click gave me one name, and I wrote them down on paper.

**`--end $S`.** Session ended.

## Where I hesitated

- **No names on the drawing.** Every ball is the same blue, so I couldn't find anyone just by
  looking. Search was the only way to find the Medici.
- **The search box's placeholder text isn't its name.** My first attempt to type into it went
  nowhere.
- **"Degree".** This is jargon. I only trusted it after the Neighborhood selection also showed six
  others.
- **"7 nodes, 0 edges" next to "Edges among them 7".** These read as contradictory.
- **The selection summary shows one name with "(1)".** I wanted all seven names. Clicking it did
  nothing.
- **Clicking "Node t..." opened "Add to Florentine families".** I wanted to look at the data, not
  add to it. Cancelling also threw away my selection.
- **Hovering a ball shows nothing.** I expected a name.
- **"Add label line" is greyed out** with no reason given.
- **No way to copy the list.** I'd want to paste these six names into Excel. In the end I copied
  them by hand, one click at a time.

## In character, at the end

**Did I finish?** Yes. The Medici married into **6** families: **Salviati, Acciaiuoli,
Tornabuoni, Ridolfi, Barbadori and Albizzi**. I'm confident in the count because Degree 6 and the
Neighborhood selection agree. I'm confident in the names because I clicked each highlighted ball
and read the panel. What the program knows about the Medici: their id and name ("Medici") and
"Degree 6", which I take to mean six marriages.

**How hard was it (1-7):** 5. Finding the Medici was easy once I used search, and the
Neighborhood button was a good find. Getting the names was the hard part. The program clearly
knows them, but it never showed them all in one place, never put them on the drawing, and never
let me copy them.

**What confused me:** the drawing has no names on it; "Degree" and "Edges per n..." are jargon;
"0 edges" next to "Edges among them 7"; the summary showing one family with "(1)" when I'd picked
seven; "Node table" opening an add-a-file screen and losing my selection; and "Add label line"
being greyed out with no reason. If I had to do this for the board with 200 donors, clicking one
ball at a time wouldn't work.
