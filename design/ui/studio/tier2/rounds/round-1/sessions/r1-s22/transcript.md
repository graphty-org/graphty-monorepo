# Session r1-s22 -- Dev (returning student), task T18, dataset B (Florentine families)

Build: tier2-r1d4-946256efb (frozen). Tool: real.mjs, commands run from design/ui/studio/tool.

Prompt: "You have used this program a few times. The ready-made network of marriages between the
leading families of Renaissance Florence is already open. The Strozzi want a message carried to the
Pazzi, passed only between families joined by marriage, through as few families as possible. Which
families does it pass through, in order?"

## Start

    REAL_DIST=<frozen build> ./with-browser.sh node real.mjs --start $S setup:florentine-ranked.txt
    -> 01.png

01.png: Florentine families is open, colored and sized by PageRank like I left it. There are no names
on the dots, so I cannot even tell which one is Strozzi. Okay, first I need to figure out how to ask
"how do I get from one family to another". Last time the ranking lived behind the flask button in the
bottom toolbar, so that is the obvious door. Trying it.

## Step 2 (02.png) -- accidental hover

    node real.mjs --step $S --hover-icon 1   -> tooltip "Main menu: open, save, export, settings"

(I pointed at the menu icon first by mistake; nothing changed.)

## Step 3 (03.png)

    node real.mjs --step $S --click-at 679,864   -> button "Analyze"

A list of analyses opened: Recent PageRank, then "Rank nodes and edges" -- Degree, Betweenness,
Edge betweenness, Closeness, PageRank, Eigenvector, Katz, HITS, All-pairs distance. Betweenness says
"shortest paths" but it ranks nodes, that's not what I want. "All-pairs distance" is "how far each
node is from all the others" -- close, but I want one pair. The list is cut off at the bottom, so
I'll scroll it to see the rest before picking.

## Step 4 (04.png)

    node real.mjs --step $S --wheel 680,700,600

Scrolled past the group ones (Louvain, Leiden ...). Under "Find paths and edge sets" there's
"Shortest path -- Start here -- The fewest steps, or the shortest route by weight, between two
nodes." Oh nice, "the fewest steps" is exactly "as few families as possible". Clicking it.

## Step 5 (05.png)

    node real.mjs --step $S --click "Shortest path"

A small form: From ("Where the path starts"), To ("Where the path ends"), Weight = None, Advanced,
and a "Find path" button. Weight None is fine -- marriages don't have a number, I just want the
fewest families. I'll click the From box and type Strozzi.

## Step 6 (06.png)

    node real.mjs --step $S --click "Where the path starts" --type "Strozzi"

It suggests "Strozzi" right under the box. Picking it.

## Step 7 (07.png)

    node real.mjs --step $S --click-at 557,679   -> option "Strozzi"

From says Strozzi, and the To box is already highlighted, nice, it moved me there. Typing Pazzi.

## Step 8 (08.png)

    node real.mjs --step $S --type "Pazzi"

"Pazzi" is suggested. Picking it, then I'll press Find path.

## Step 9 (09.png)

    node real.mjs --step $S --click-at 552,733   -> option "Pazzi"

From Strozzi, To Pazzi, Weight None. Find path is focused. Pressing it.

## Step 10 (10.png)

    node real.mjs --step $S --click "Find path"

Oh nice. The path is drawn in black and thick, the rest of the dots kept their PageRank orange, and
the right side lists "Nodes in order": Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. Summary
says "5 nodes, 4 edges", and the left list has a new "Shortest path -- 4 hops". Under "Made with" it
says From Strozzi, To Pazzi, Weight None, "Each edge counts as 1" -- so that's my proof that it
counted marriages, not some number. The drawing has no names, so I want to check the black dot at
the very top end is really one of the ends. Hovering it.

## Step 11 (11.png)

    node real.mjs --step $S --hover-at 569,157   -> (tool: node "Pazzi", cursor pointer, tooltip null)

Wait, nothing popped up -- no name, no tooltip, the screen looks the same. The pointer turns into a
hand, so it's something, but it doesn't tell me which family it is. I can't check the drawing
against the list without names on it. I'd have to turn labels on from the Style tab like last time,
but the list on the right already says it in order, and "Made with" shows what it used, so I'll
trust that. I'm done.

    node real.mjs --end $S

## End (in character)

**Did I finish?** Yes. The message goes Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi: it passes
through the Ridolfi, the Medici and the Salviati, four marriages in all.

Essay sentence: "Using the program's Shortest path analysis with every marriage counted as one step,
a message from the Strozzi reaches the Pazzi through three families -- the Ridolfi, the Medici and
the Salviati (4 ties) -- so the Medici sit in the middle even of this route."

**Ease: 6 / 7.** It was behind the same flask button as the ranking, which is where I'd look. I had
to scroll the list past a lot of group stuff to find it, but "Shortest path -- the fewest steps"
said exactly what I wanted. Typing the family names with suggestions was easy, and the answer came
as a numbered list, with "Each edge counts as 1" as proof of how it counted. My PageRank colors
stayed on everything else.

**What confused me:**

- The analysis list is long and opens on ranking stuff; the path one is at the bottom under "Find
  paths and edge sets", below all the group methods. I only found it because I scrolled. I didn't
  try typing in "Filter analyses", and wouldn't have known which word to type.
- The drawing has no names, so the black line means nothing on its own. Hovering a black dot showed
  nothing at all (the pointer changed to a hand, but no name appeared), so I couldn't check the
  picture against the list.
- On the path the dots went solid black, so I can no longer see their PageRank color -- fine for
  this, but for the figure I'm not sure the Medici still looks like the big one.
- "4 hops" in the left list vs "5 nodes, 4 edges" on the right -- hops, edges, marriages, I worked
  out they mean the same thing, but it's three words for one idea.
