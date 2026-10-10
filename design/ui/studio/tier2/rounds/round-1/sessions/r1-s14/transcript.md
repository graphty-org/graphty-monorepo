# Session r1-s14 -- Grace (returning), task T17, dataset B (Les Miserables)

Build: tier2-r1d4-946256efb (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb)

Tool: `node real.mjs` run from design/ui/studio/tool; `S` below is this session folder.

## Start

`REAL_DIST=... ./with-browser.sh node real.mjs --start S setup:lesmis-ranked.txt` -> 01.png

01.png: Les Miserables is open, dots colored and sized by PageRank. Left side: Graph, with a find
box, "Selection", "PageRank 77", "Everything". Right side shows PageRank's Style (Color: PageRank,
Size 1 to 3). Bottom toolbar: flask, chart, 3D, magnifier. "Okay, it's the ranked map like last
time. 77 characters. I need only pairs sharing 5 or more chapters. Where do I narrow things down?"

## Steps

### Step 1 -- `--hover-at 728,864` -> 02.png

"What's the second button in the toolbar? I remember the flask is the analysis one." Tooltip says
"Layout". Not what I want.

### Step 2 -- `--click "Everything"` -> 03.png

"I'll go to Everything, where I did the styling before; maybe there's a way to work on the ties
there."

03.png: Everything shows only Style (fill color, size, shape, effects, label, tooltip) and Values.
"This is all about how the dots look. Nothing about leaving ties out."

### Step 3 -- `--click "Data"` -> 04.png

"I think in columns. Data listed my columns last time; maybe the chapter count is there and I can
narrow it down from the column."

04.png: Data shows Sources (Les Miserables, 77 nodes, 254 edges; node table 77 rows, edge table 254
rows), a "Filters" row with a plus, and Attributes: Nodes id, name; Edges shared_chapters.
"77 characters and 254 ties, noted. There's shared_chapters on the ties, that's my number. And
'Filters' with a plus -- that sounds exactly like Excel's filter. Let me press the plus."

### Step 4 -- `--click-at 276,285` -> 05.png

05.png: Right side now says "New filter step", "Keep: an attribute's value", an empty "Attribute"
box, and a grayed "Add step" button. "Keep an attribute's value -- fine. Attribute is blank; I want
shared_chapters."

### Step 5 -- `--click "Attribute"` -> 06.png

06.png: A list opens: Nodes (id, name), Edges (shared_chapters). "There it is."

### Step 6 -- `--click "shared_chapters"` -> 07.png

07.png: Attribute shared_chapters, "Is: at least" already chosen, an empty Value box, and a line
"Keeps edges that pass and the nodes at their ends." "At least is what I want -- 5 or more. And it
says it keeps the characters at the ends of the ties that pass, so the ones with no strong ties
drop out. Good, that's how I'd count it."

### Step 7 -- `--click "Value" --type "5"` -> 08.png

Tool printed: `Could not click "Value": elementHandle.click: Timeout 3000ms exceeded` (the element
was reported visible, enabled and stable, yet the click never landed). The typed "5" went into the
Attribute box instead, which now reads "shared_chapters5"; Value is still empty.
"Oops, my 5 ended up in the wrong box. The Attribute now says shared_chapters5. I'll click right in
the Value box and see whether the attribute fixes itself."

### Step 8 -- `--click-at 1320,266` -> 09.png

09.png: Attribute went back to "shared_chapters" on its own; the Value box is highlighted.
"Phew, it put itself right. Now the 5."

### Step 9 -- `--type "5"` -> 10.png

10.png: Value 5; "Add step" is now blue. The drawing has not changed yet. "shared_chapters at
least 5. Add step."

### Step 10 -- `--click "Add step"` -> 11.png

11.png: The drawing thins out to a few clusters. Top bar now says "26 of 77 nodes" beside a funnel
icon. Left, under Filters: "shared_chapters is at least 5 -- 77 to 26 nodes" with a ticked box.
Right: Graph, Values, Overview -- "Nodes showing 26 of 77", "Edges showing 51 of 254", then "The
counts below are for the whole graph" (Nodes 77, Edges 254, Components 1...).
"There we go. 26 characters left, out of 77, with 51 ties. It says it three times so I believe
it. The colors and sizes stayed from my ranking, good. One small thing: it says Components 1 but I
see two separate bits in the drawing -- oh, it says those counts are for the whole graph. Fine.
Now bring every character back. The tick box next to the rule looks like an on/off switch, like
Excel's filter, so I'll untick it rather than delete it."

### Step 11 -- `--click-at 274,326` -> 12.png

12.png: Whole drawing back. Top bar no longer shows a count; Overview says Nodes 77, Edges 254. The
rule stays in the list marked "off" with an empty box.
"All 77 back, 254 ties, same as when I started, and the rule is kept but off. That's done: 26
characters share 5 or more chapters with someone."

**First prompt done.** Answer given: 26 characters (51 ties) remain; every character brought back.

Follow-up read to me: "Now the same for pairs who share 8 or more chapters: how many characters
are in the drawing then? Bring every character back when you are done."

"I'd rather change the 5 to an 8 than build a new rule. Let me click on the rule itself."

### Step 12 -- `--click "shared_chapters is at least 5"` -> 13.png

13.png: The right side opens the rule ("shared_chapters is at least 5, Filter step, Off") with the
same boxes, Value 5, and a button "Save and turn on". "Nice, I can just change it. Swap the 5 for
an 8."

### Step 13 -- `--click-at 1320,266 --key Control+a --type "8"` -> 14.png

14.png: Value reads 8; the title still says "at least 5" until I save. "Save and turn on."

### Step 14 -- `--click "Save and turn on"` -> 15.png

15.png: "17 of 77 nodes" in the top bar; the rule now reads "shared_chapters is at least 8 -- 77 to 17
nodes", ticked; Overview "Nodes showing 17 of 77", "Edges showing 19 of 254".
"17 characters share 8 or more chapters with someone, 19 ties. Now untick to bring everyone back."

### Step 15 -- `--click-at 274,326` -> 16.png

16.png: Everything back. Overview: Nodes 77, Edges 254; no count in the top bar; the rule is kept,
reading "shared_chapters is at least 8 -- off".
"All 77 back, 254 ties. Done."

**Follow-up done.** Answer given: 17 characters (19 ties) remain at 8 or more shared chapters;
every character brought back.

`node real.mjs --end S`

## At the end, in character

- **Did I finish?** Yes, both parts. 5 or more chapters: 26 characters (51 ties). 8 or more: 17
  characters (19 ties). Every character back after each, 77 and 254 again.
- **Ease: 6 of 7.**
- **What went well:** Once I found it, "Filters" with a plus felt like Excel's filter. "Keep an
  attribute's value", my column name, "at least" and a number was exactly how I think about it.
  The line "Keeps edges that pass and the nodes at their ends" told me how characters would be
  counted before I pressed anything. The answer was in three places (top bar "26 of 77 nodes", the
  rule's "77 to 26 nodes", and "Nodes showing 26 of 77"), and my ranking colors and sizes stayed.
  The tick box to switch it off, and changing the 5 to an 8 in place with "Save and turn on", meant
  I never had to rebuild anything.
- **What confused me:**
  1. Finding it. I went first to the toolbar (the second button is Layout) and to Everything
     (only how dots look). I found "Filters" only because I went to Data to look at my columns. I
     would not have guessed that narrowing the picture lives under Data rather than Graph or the
     toolbar.
  2. My first "5" landed in the Attribute box, which then read "shared_chapters5". When I clicked
     into the Value box it put itself back to shared_chapters, so no harm, but for a moment I
     thought I had broken the column choice. (The tool reported that clicking the "Value" label
     timed out although the box was visible and enabled, so the typing went to the box that still
     had focus; clicking the box itself worked.)
  3. With the rule on, Overview says "Components 1" while I can see two separate pieces on the
     screen. The note says those counts are for the whole graph, so it is right, but it made me
     look twice.
  4. "Filter step" and "Add step" -- I don't think of a filter as a step; "Add filter" or "Apply"
     would have read more plainly to me.
