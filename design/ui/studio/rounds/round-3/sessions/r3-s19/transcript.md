# Session r3-s19 -- Ruth (the reporter with a contacts sheet), task T12 prompt A (Les Miserables)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Go to the police inspector Javert, read what the program knows about him, and see which
characters he shares chapters with. Tell us who they are and how many."

Start: empty. Commit f108a235091e81cd23687ecc4c0b2370490a6498, build b7590f8de22b graphty@0.8.53.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s19 empty` -> 01.png

Saw: a start page. Left "Start" column (Open project or file..., New from data...), middle
"Recent projects" (empty), right "Samples" with Les Miserables (77 characters) listed first, with
a line "Characters who share a chapter of the novel." Bottom: a usage-data consent box with
"Share usage data" / "No thanks".

Ruth: "I don't share anything I don't have to. No thanks first, then the Les Miserables sample."

## Step 2 -- decline usage data, open the sample

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the network drawn as blue balls with gray lines, no names on any of them. Left panel: a
search box "Find nodes, edges, values", then "Selection" and "Everything". Right panel "Graph,
From Les Miserables" with Nodes 77, Edges 254, "Undirected, from the file: directed 0", Density,
Components, "Edges per ..." (cut off). Toolbar at the bottom with four icons.

Ruth: "No names on the dots, so I can't just find him by eye. There's a search box top left --
I'll type his name there."

## Step 3 -- try the search box by its placeholder

Command: `--step --click "Find nodes, edges, values" --type "Javert"` -> 03.png

Tool: `nothing on screen is called "Find nodes, edges, values"`; nothing typed. (The placeholder
text is not the box's name for the tool; a person would simply click in the box.) Pointing at
the box instead.

## Step 4 -- type his name in the search box

Command: `--step --click-at 175,90 --type "Javert"` -> 04.png (tool: `at 175,90: combobox "Find"`)

Saw: a drop-down under the box: "Elements -- Javert" (with a target icon) and "Values -- Select
where name is Javert (1)". The drawing has not changed yet.

Ruth: "Good, he's in there, one match. The top one, 'Javert' under Elements, looks like the
person himself. Clicking that."

## Step 5 -- pick Javert from the list

Command: `--step --click-at 114,153` -> 05.png (tool: `option "Javert"`)

Saw: the camera moved a little; one ball near the middle is now ringed in yellow. Left panel
"Selection 1". Right panel now reads "Javert -- Node" with Style / Values tabs; Values shows a
Summary box: id Javert, name Javert, Degree 17 with a ">" arrow.

Ruth: "So that's everything the program knows about him: an id, a name and 'Degree 17'. I don't
know what degree means here -- 17 of what? The arrow suggests I can open it. That's the
'how do I know' question, so I'll click it."

## Step 6 -- open "Degree 17"

Command: `--step --click-at 1320,236` -> 06.png (tool: `button "Degree 17"`)

Saw: the right panel switched to "Javert -- Neighborhood", heading "Javert's 17 connections", and
an alphabetical list: Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent,
Gavroche, Gueulemer, MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean,
Woman1, Woman2. I counted them: 17, matching the heading. In the drawing those characters are
now ringed in yellow, and the left panel says "Selection 18" (him plus his 17, I assume).

Ruth: "There it is -- so 'Degree' meant the number of people he's tied to. The start page said a
tie here is 'characters who share a chapter', so these are the 17 he shares chapters with. I'd
like to see it as a table I can hand a fact-checker, and to know whether a tie says how many
chapters. Trying the Data button on the left."

Hesitation: nothing on the Javert summary said that "Degree" means "the characters he shares a
chapter with"; I only found the list because the row had an arrow.

## Step 7 -- the Data view

Command: `--step --click "Data"` -> 07.png

Saw: the left panel became a data outline: Sources -- "Les Mis... 77 nodes, 254 edges", a node
table "77 rows, 77 nodes", an edge table "254 rows, 254 edges"; Attributes -- Nodes: id, name;
Edges: shared_chapters (a number). The Javert list on the right stayed put.

Ruth: "That settles what a tie is: every line carries a 'shared_chapters' number, so a line
between two people means they share chapters. And 77 rows in, 77 characters on the start page --
nothing dropped. I have what I was asked for. I'd want per-tie chapter counts for my own notes,
but the question is who and how many, and I have that. Stopping here."

Command: `--end rounds/round-3/sessions/r3-s19`

## Result, in character

**Did I finish?** Yes. Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous,
Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse,
Simplice, Thenardier, Toussaint, Valjean, Woman1 and Woman2. What the program knows about him
itself: an id and a name (both "Javert") and a "Degree" of 17.

**How easy: 6 out of 7.** Typing his name into the first search box I saw found him at once, and
the list of his 17 was one click away, with a count I could check by hand against the list.

**What confused me or slowed me down:**

- "Degree 17" is a math word. Nothing beside it said it was the number of characters he shares a
  chapter with; I opened it only because the row had an arrow. A reporter who doesn't click arrows
  would stop at "17" and not know what it counted.
- The list heading says "connections", not "shares a chapter with". I had to go to the Data view
  and find the edge column "shared_chapters" to be sure a connection meant shared chapters.
- His own page showed no chapter counts: I can't tell from the list whether he shares one chapter
  with Woman2 or ten with Valjean, which is what I'd want before quoting it.
- The drawing has no names on it, so I could not have found him by looking; the search box was
  the only way in.
- "Selection 18" on the left versus "17 connections" on the right: I assumed the 18 includes him,
  but nothing said so.
- (Tool note, not the app: the search box could not be clicked by its placeholder text, so I
  pointed at it instead.)
