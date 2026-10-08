# Session r3-s36 -- Elena (first-time graph user), task "What did I get?", Les Miserables

Task in my words: open the sample Les Miserables network, then find how many characters, how many
connections, whether everyone can reach everyone, and what facts are recorded about each
character and each connection.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s36 empty` -> 01.png

Saw: a start page. Left "Open project or file...", "New from data...". Middle "Recent projects"
(empty). Right "Samples": Les Miserables (77 characters), Zachary's karate club, College football,
Florentine families. A usage-data banner at the bottom with "Share usage data" / "No thanks".

Thought: Nice, there's a sample list, and it already says 77 characters -- that's one answer
before I even open it. First I'll dismiss the data banner ("No thanks") and click Les Miserables.

## Step 2 -- dismiss banner, open the sample

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: the network drew right away, a blue dot-and-line picture, with a dense middle and a fan of
dots hanging off the bottom. Right panel "Graph / From Les Miserables", tabs Style and Values,
an "Overview" section: Nodes 77, Edges 254, a line "Undirected, from the file: directed 0",
Density 0.08681, Components 1, "Edges per ..." (cut off) "1 to 36, mean 6.597".

Thought: OK, so 77 characters ("nodes" = dots, I assume) and 254 connections ("edges" = lines).
"Undirected, from the file: directed 0" I can't parse -- is it undirected or directed? Zero what?
"Components 1" -- I'm guessing that means it's all one piece, so everyone can reach everyone, but
I'm not sure that's what "components" means. "Edges per ..." is cut off; I'd hover it later.
Hesitation: the jargon. Now, what is recorded about each character? There's a "Data" icon on the
left rail -- that sounds like a spreadsheet. I'll click it.

## Step 3 -- the Data panel

Command: `--step --click "Data"` -> 03.png

Saw: the left panel changed to "Les Miserables". "Sources": Les Mis... 77 nodes, 254 edges, with
"Node t..." 77 rows and "Ed..." 254 rows under it (names cut off -- node table and edge table, I
guess). "Attributes": under Nodes, "id" and "name"; under Edges, "shared_chapters" (with a # icon,
so a number).

Thought: That's the "what's recorded" answer, and it was quick: each character has an id and a
name, and each connection has a "shared chapters" number -- matching the sample's description
("characters who share a chapter"). The counts agree too: 77 and 254. The one thing I'm still
unsure of is "Components 1" meaning everyone can reach everyone. I'll hover "Components" on the
right to see if it explains itself.

## Step 4 -- does "Components" explain itself?

Commands: `--step --hover "Components"` -> 04.png (tool said the name matched two things, took
the first; tooltip: null), then `--step --hover-at 1266,300` -> 05.png (group "Components 1";
tooltip: null).

Saw: nothing new. No tooltip, no explanation of "Components", "Density" or the cut-off "Edges
per ..." row.

Thought: Hovering doesn't help. I'll go with my guess: "Components 1" = one connected piece, and
the picture agrees -- I can't see any dot floating off by itself, everything has a line to
something. But I'd be guessing if my boss asked. Last check: I want to see what's actually
recorded on one real character, not just column names. I'll click the big dot in the middle
where lots of lines meet.

## Step 5 -- one character

Command: `--step --click-at 768,447` -> 06.png (tool: node "Valjean")

Saw: the dot got a yellow ring. Right panel now "Valjean / Node", Summary: id Valjean, name
Valjean, Degree 36 (with a little arrow).

Thought: Good -- so each character really has just an id and a name (here both "Valjean"), and
the app adds "Degree" 36, which I'd guess is how many lines he has (the overview said "1 to 36",
so he's the most connected). Degree isn't in the attribute list on the left, so I think the app
worked it out rather than it being in the file -- but nothing tells me that. One more: I'd like
to see one connection's shared_chapters value. The lines are hairline thin; I'll try clicking the
middle of one of the lines at the bottom fan.

## Step 6 -- try to click a line

Command: `--step --click-at 574,660` -> 07.png (tool: empty canvas)

Saw: missed the line; Valjean got deselected and the right panel went back to the Overview.

Thought: The lines are too thin to hit on a trackpad, I'm not going to keep stabbing at them.
Instead I'll click "shared_chapters" in the Attributes list on the left -- maybe it shows me the
values.

## Step 7 -- the connection fact

Command: `--step --click "shared_chapters"` -> 08.png

Saw: the row highlighted; right panel "shared_chapters / Attribute", Summary: Table Edges, two
tags "Amount" and "From the file", Has a value 100%, Distinct values 17, Range 1 to 31.

Thought: That settles it. Every connection carries a number of shared chapters, from 1 to 31,
and it came from the file. "From the file" is exactly the reassurance I wanted -- I wish the same
tag were on Valjean's "Degree" so I'd know that one was worked out by the app. I'm done.

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s36`

## Wrap-up (in character)

**Did I finish?** Yes. My answers:

- 77 characters (the sample list said so before I even opened it; the Overview says Nodes 77).
- 254 connections (Edges 254).
- Everyone can reach everyone: "Components 1" -- I read that as "all one connected piece", and
  the picture has no stray dots. That's a guess at the word, though; nothing confirmed it.
- Each character has an id and a name (in this file they're the same thing, e.g. "Valjean").
  Each connection has "shared_chapters", a number from 1 to 31, present on every line.

**How easy, 1 (very difficult) to 7 (very easy):** 6. It opened in one click and the counts
were sitting right there; the Data panel's "Attributes" list answered "what's recorded" in one
more click. Seven clicks total including a miss.

**What confused me / where I hesitated:**

- "Components 1" is a math word. To answer "can everyone reach everyone?" I had to guess. Hovering
  it showed nothing. Something like "all connected" or "1 group" would have been plain.
- "Undirected, from the file: directed 0" -- I couldn't tell what this line meant. Undirected
  or directed? Directed zero of what?
- "Edges per ..." is cut off, and hovering doesn't show the rest. "Density 0.08681" means nothing
  to me.
- "Nodes" and "edges" vs. the sample card's "characters" -- I had to translate. Fine for me, but
  I noticed.
- The source rows on the left are cut off too ("Les Mis...", "Node t...", "Ed...").
- Valjean showed a "Degree 36" that isn't in the Attributes list. I guessed the app calculated it;
  the attribute page labels things "From the file", but the node page doesn't say where Degree
  came from.
- Clicking a line to inspect one connection didn't work -- the lines are hairline thin and my
  click landed on empty canvas (and deselected what I had). I got the answer from the attribute
  list instead.
