# Session r1-s10 -- Dev (returning student), task T17, Prompt B (Les Miserables)

Build: frozen build 946256efb876 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/).
Run from design/ui/studio/tier2 with S=rounds/round-1/sessions/r1-s10.

Prompt as given: "You have used this program a few times. The ready-made network of characters
from Les Miserables is already open; each tie counts the chapters two characters share. For a short
essay you care only about pairs who share 5 or more chapters. Change the drawing so it has only
those pairs, tell us how many characters are still in it, and then bring every character back."

## Steps

### 01 -- start
`REAL_DIST=... ../tool/with-browser.sh node ../tool/real.mjs --start $PWD/$S setup:lesmis-ranked.txt`

Okay, Les Mis is open, already ranked by PageRank -- big dark dot in the middle, colored and sized,
a key in the corner. Left side: the find box, Selection, PageRank (77), Everything. Right side the
Style tab I know. Toolbar at the bottom: a flask, a chart thing, 3D, a magnifier. 77 is probably the
number of characters. I need to get rid of the weak ties... in the tutorial that was the "filter"
thing in Gephi. First I want to see the tie numbers, so I'll look at Data on the left.

### 02 -- `--click "Data"`
Oh nice, Data shows "77 nodes, 254 edges", and under Edges there's a number column
"shared_chapters" -- that's the chapter count. And wait, there's "Filters" with a plus! That's the
Gephi word from the tutorial. I'll click the plus next to Filters.

### 03 -- `--click-at 276,285` (tool: button "Add filter step")
A "New filter step" panel on the right: "Keep" is "an attribute's value", then "Attribute" is
empty, and "Add step" is grayed out. Okay, so I pick the attribute. I'll open the Attribute box.

### 04 -- `--click "Attribute"`
The list shows Nodes (id, name) and Edges (shared_chapters). I want shared_chapters.

### 05 -- `--click "shared_chapters"` (tool note: name matched the option and the Data tree item; it took the option)
Attribute is shared_chapters, "Is" already says "at least" -- that's what I want, 5 or more. Value
is empty. The little line says "Keeps edges that pass and the nodes at their ends." Okay, so
characters with no strong tie should drop out. I'll type 5 in Value.

### 06 -- `--click "Value" --type "5"`
Value says 5, "Add step" turned blue. The drawing hasn't changed yet, so I guess it doesn't preview.
Clicking Add step.

### 07 -- `--click "Add step"`
Oh nice, that's it. The drawing thinned out to three clumps. The top bar says "26 of 77 nodes", the
filter row on the left says "shared_chapters is at least 5 -- 77 to 26 nodes", and the Values tab on
the right says "Nodes showing 26 of 77", "Edges showing 51 of 254". All three agree: 26 characters.
(Wait, Components says 1 but I see three separate pieces -- oh, it says "the counts below are for
the whole graph". Okay.) This is the proof I'd show the instructor: the rule is written out right
there. Essay sentence: "Keeping only pairs who share 5 or more chapters leaves 26 of the 77
characters (51 of 254 ties)."

Now bring everyone back. There's a checkbox on the filter row -- I'll uncheck it, that seems the
safe way (I don't want to delete it in case I need it again).

### 08 -- `--click-at 274,326` (tool: input "Apply step: shared_chapters is at least 5")
Everyone is back: the whole drawing returned, the "26 of 77" in the top bar is gone, Values says
Nodes 77, Edges 254, and the filter row now says "off". Good -- and the filter is still there if I
need it. That's the prompt done: 26 characters, and all 77 back.

Follow-up given: "Now the same for pairs who share 8 or more chapters: how many characters are in the
drawing then? Bring every character back when you are done."

Okay, I'd rather change the 5 to an 8 than make a new one. I'll click the filter row itself to see
if it opens for editing.

### 09 -- `--click-at 180,320` (tool: treeitem "shared_chapters is at least 5")
The right panel opened the same filter: Value 5, and the button says "Save and turn on" -- that's
clear, it'll switch the filter back on too. I'll replace the 5 with an 8.

### 10 -- `--click "Value" --key Control+a --type "8"`
Value now 8 (the heading still says "at least 5" since I haven't saved). Clicking "Save and turn on".

### 11 -- `--click "Save and turn on"`
Top bar "17 of 77 nodes", the row reads "shared_chapters is at least 8 -- 77 to 17 nodes", Values
says "Nodes showing 17 of 77", "Edges showing 19 of 254". So 17 characters at 8 or more chapters.
Essay sentence: "At 8 or more shared chapters only 17 of the 77 characters remain (19 ties)."
Now everyone back -- unchecking the box again like before.

### 12 -- `--click-at 274,326` (tool: input "Apply step: shared_chapters is at least 8")
All 77 back, Values says Nodes 77 / Edges 254, the row says "off". Done.

### end -- `node ../tool/real.mjs --end $PWD/$S`

## Debrief (in character)

**Did I finish?** Yes, both parts. 5 or more shared chapters: 26 of 77 characters (51 of 254 ties).
8 or more: 17 of 77 characters (19 ties). Both times I brought all 77 back by unticking the filter,
and the drawing, the top bar and the Values numbers all went back to 77 / 254.

**Ease: 6 out of 7.** I went to Data only to look at the tie numbers and the word "Filters" was
right there -- the exact Gephi word from the tutorial -- so I never had to hunt. Picking the column,
"at least" already chosen, typing 5: that was it. The rule written out as a sentence on the left
("shared_chapters is at least 5, 77 to 26 nodes") is exactly what I'd screenshot for my instructor
as proof. Changing 5 to 8 was easy because clicking the row opened it again, and "Save and turn on"
told me what would happen.

**What confused me / small things:**
- I'd never have looked for "Filters" from the toolbar or the Graph panel, where I usually start.
  I only found it because I opened Data to look at the numbers. If I'd stayed on the Graph view I
  would have tried the toolbar first.
- Nothing changed in the drawing while I typed 5; I had to press "Add step" to see it. I'd have
  liked a "this would keep N characters" before committing, but it was one click so not a big deal.
- On the Values tab "Components 1" sat right under "Nodes showing 26 of 77" while I could see three
  separate clumps. There is a line saying the lower counts are for the whole graph, but I had to
  read it twice. For an essay I'd want the number of groups in what's showing.
- The checkbox is tiny and has no label I could see; I guessed it turned the filter on and off. It
  did, and "off" appeared under the rule, so the guess was safe.
- When I edited the value to 8, the heading still said "at least 5" until I saved, which made me
  double-check I was typing in the right place.
