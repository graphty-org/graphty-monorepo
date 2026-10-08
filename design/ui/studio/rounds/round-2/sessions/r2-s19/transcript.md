# Session r2-s19 -- Tom (recipe recipient), task T12 prompt A (Les Miserables)

Task: open the ready-made Les Miserables network, go to the police inspector Javert, read what the
program knows about him, and see which characters he shares chapters with. Tell who and how many.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s19 empty` -> 01.png

Saw: a dark start page. "Start" with Open project or file / New from data, "Recent projects" empty,
and on the right "Samples": Les Miserables (77 characters) is the first one. A box at the bottom
asks to share usage data. Top right says "Local only" with a lock -- good, that is what I like to see.

Next: say "No thanks" to the usage box (I don't share anything I don't have to), then open Les Miserables.

## Step 2 -- open the sample

Command: `--step --click "No thanks" --click "Les Miserables"` -> 02.png

Saw: a cloud of blue dots joined by grey lines, no names on any of them. Right side says Nodes 77,
Edges 254, Density, Components -- numbers I don't need. "Undirected, from the file: directed 0"
means nothing to me. Top left there is a box "Find nodes, edges, values". That's the obvious place.

Next: click the Find box and type Javert.

## Step 3 -- try the Find box by its words

Command: `--step --click "Find nodes, edges, values" --type "Javert"` -> 03.png

Tool said nothing is called that (the grey words in the box are only a hint), so nothing was typed.
(Tool mechanics, not the app.) Pointing at the box instead.

## Step 4 -- type Javert

Command: `--step --click-at 176,90 --type "Javert"` -> 04.png

Saw: under the box, "Elements: Javert" and "Values: Select where name is Javert (1)". Good, he is in
there. The picture has not changed yet. The first one, plain "Javert", looks like him.

Next: click "Javert" under Elements.

## Step 5 -- pick Javert

Command: `--step --click-at 114,153` (option "Javert") -> 05.png

Saw: the picture shifted a bit and one dot near the middle is now yellow -- I assume that's him. The
right side now says "Javert, Node", and under "Summary": id Javert, name Javert, Degree 17 with a
little arrow. So that is "what the program knows about him": his name twice and a "Degree". I don't
know what Degree means here -- a degree in what? Maybe 17 is how many characters he's tied to, but
I'm guessing. Nobody's name is on the picture, so I can't see who his neighbors are.

Next: the arrow next to Degree 17 is the only thing that looks like it goes further. Click it.

## Step 6 -- click the arrow by Degree

Command: `--step --click-at 1410,236` -> 06.png (tool: landed on group "Summary values")

Saw: the Degree row got a lighter background, nothing else changed. No list opened. "I clicked it.
Nothing moved. Did it do anything?"

Next: one more try -- click the word "Degree" itself.

## Step 7 -- click the word "Degree"

Command: `--step --click "Degree"` -> 07.png

Saw: that did it. The right side now says "Javert, Neighborhood" and "Javert's 17 connections",
with a list of names; about 17 dots in the picture went yellow. I counted the list myself:
Babet, Bamatabois, Claquesous, Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer,
MmeThenardier, Montparnasse, Simplice, Thenardier, Toussaint, Valjean, Woman1, Woman2 -- 17. It
matches the heading and the "Degree 17" from before, so Degree must mean "how many he's tied to".

Hesitation: on the left, "Selection" now says 18, not 17. I'd guess that's the 17 plus Javert
himself, but nothing says so, and two different numbers on one screen is exactly what makes me
look foolish in a meeting. Also the list says "connections", not "shares chapters with" -- the
sample's description on the start page said characters who share a chapter, so I'll take it that a
connection means that, but the screen itself doesn't say it. And who are "Woman1" and "Woman2"?
That's the file's names, not mine.

Part one (go to Javert, read what it knows): done -- it knows his name and a Degree of 17, nothing
else. Part two (who he shares chapters with, how many): done -- 17, listed above.

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s19`

## At the end, in Tom's words

Did I finish? Yes. Javert shares chapters with 17 characters: Babet, Bamatabois, Claquesous,
Cosette, Enjolras, Fantine, Fauchelevent, Gavroche, Gueulemer, MmeThenardier, Montparnasse,
Simplice, Thenardier, Toussaint, Valjean, Woman1 and Woman2.

How easy: 5 out of 7. Finding him was easy -- I typed his name in the box and there he was. The
"Local only" lock at the top was reassuring. What cost me was the next bit: the panel showed "Degree
17" and I didn't know that was the number I wanted, and the little arrow beside it did nothing when
I clicked it. I only got the list on my second try by clicking the word itself. If that second try
had failed too I'd have asked her for a spreadsheet.

What confused me:

- "Degree" -- a word I'd never use for "how many characters he's tied to". The answer was sitting
  there and I didn't recognize it.
- The arrow next to Degree looked clickable; clicking it only shaded the row.
- The list heading says "connections", the task and the sample description say "share a chapter".
  I assumed they're the same thing.
- "Selection 18" on the left against "17 connections" on the right. I guessed the extra one is
  Javert, but I'd have to ask.
- No names on the dots, so the picture itself told me nothing; the list on the right did all the
  work.
- The overview numbers when the file opened (density, "Undirected, from the file: directed 0") --
  I skipped them; they mean nothing to me.
