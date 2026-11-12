# Session r2-s14 -- Grace (returning), task T22, dataset B (Les Miserables)

Build: 8f0d5a6f7791 (frozen copy at /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/).
Commands run from `design/ui/studio/tier2` with `REAL_DIST` set to that folder; `T=../tool`, `S=rounds/round-2/sessions/r2-s14`.

## Start

`node $T/real.mjs --start $S setup:lesmis-ranked.txt` -> 01.png

01: Okay, Les Miserables is open, the dots are orange and sized by PageRank -- someone already ran
a ranking. Left side has Selection, PageRank (77) and Everything. My job is the ties, not the
people: every tie of 10 or more shared chapters has to stand out. I remember Data listed the columns
of my file, so first I want to see what the tie column is called and what numbers it has.

## Steps

### Step 1
`--step $S --click "Data"` -> 02.png

02: Good, 77 characters and 254 ties, both tables agree with themselves. The tie column is
`shared_chapters`, a number. There is a Filters section with a plus, but filters are for taking
things away and I am told not to take anyone off. Let me click `shared_chapters` and see what it
tells me about the numbers.

### Step 2
`--step $S --click "shared_chapters"` -> 03.png

03: The right side shows a summary: edges, an amount, every tie has a value, 17 distinct values,
range 1 to 31. Useful, but nothing here says how many are 10 or more, and nothing to color them.
In Excel I would do conditional formatting. Back on the Graph side the box says "Find nodes,
edges, values" -- "values" sounds like it could take a condition. I will try typing it the way I
would say it in a spreadsheet.

### Step 3
`--step $S --click "Graph" --click "Find nodes, edges, values"` -> 04.png

04: The find box is focused, nothing drops down to tell me what it takes. The right side now shows
the whole graph: 77 nodes, 254 edges -- matches. I will type the condition like a spreadsheet
filter: the column name, then 10 or more.

### Step 4
`--step $S --type "shared_chapters >= 10"` -> 05.png

05: Oh nice, it understood what I was after: "Start with = to select by a value:" and then it
shows `=shared_chapters >= `10`` with little tick marks around the 10. Starting with = is just like
an Excel formula, I get that. The tick marks I don't understand -- in Excel you don't quote a
number. I will put the = in front and leave the ticks off first, the way I would write it.

### Step 5
`--step $S --key Control+a --type "=shared_chapters >= 10"` -> 06.png

06: Red text: "Put numbers in backticks:" and the example again. So the ticks are required and
they are called backticks. Odd -- I had to go hunting for that key, top left under Escape -- but
at least it told me exactly what to change, in one line. Fine, I will type it the way it shows.

### Step 6
`--step $S --key Control+a --type '=shared_chapters >= `10`'` -> 07.png

07: Now it says "Rule: press Enter to select matches". No count yet -- I would have liked it to
say how many before I press. Pressing Enter.

### Step 7
`--step $S --key Enter` -> 08.png

08: There it is. "13 edges selected" under the box, Selection shows 13, and on the drawing those
ties are thick and blue while every character and every other tie is still there. The right side
lists all 13 with their shared chapters: 10, 13, 12, 31, 17, 12, 21, 19, 15, 17, 13, 12, 10. Let me
count the rows -- 13, and none is under 10, and the two 10s are in, so "or more" worked. Most sit
in the middle cluster around Valjean, the students' group (Enjolras, Combeferre, Courfeyrac,
Bossuet), and one long one down to the bottom cluster.
My worry: blue is "selected", and the moment I click somewhere else it will probably go away.
For my colleague I want it to stay. The right side has a Style tab for this selection -- I will
look whether I can make it stick from there.

### Step 8
`--step $S --click "role=tab:Style"` -> 09.png

09: Style for the 13 selected edges: Line, Arrows, Label, each with a plus. Line is what I want --
a color that stays. Clicking the plus next to Line.

### Step 9
`--step $S --click-at 1419,135` -> 10.png (the tool: button "Add to Line")

10: A menu: Color, Width, Opacity, Pattern, Curved. Color first.

### Step 10
`--step $S --click "Color"` -> 11.png

11: It made a new line on the left, "13 edges", above PageRank, and the key at the top now has
"Edge color: 13 edges". The drawing also jumped smaller and moved -- a bit unsettling, but every
dot is still there. The color it gave me is A9A9A9, a gray, which is what ties already are, so
that would not stand out once the blue selection goes away. I will type a strong color into that
box: a red, like I would use for a flag in Excel.

### Step 11
`--step $S --click-at 1265,160 --key Control+a --type "D62828" --key Enter` -> 12.png (the tool: input "Color hex value")

12: The key now has a red square for "13 edges", but the lines on the drawing are still blue,
because they are still selected. Let me click on an empty part of the drawing to let go of the
selection and see whether red is what is left.

### Step 12
`--step $S --click-at 1080,780` -> 13.png (the tool: empty canvas)

13: The red stayed -- the "13 edges" line is still on the left and in the key. But they are hair
thin; on a slide nobody would see them next to the orange dots. I can only really spot the long
one at the bottom. They need to be thicker too. Opening "13 edges" again to add a width.

### Step 13
`--step $S --click "13 edges"` -> 14.png

14: The "13 edges" settings are back on the right with my red. Line has a plus; I will add Width.

### Step 14
`--step $S --click-at 1419,111 --click "Width"` -> 15.png (the tool: button "Add to Line")

15: A Width row appeared with 8 in a box that has the cursor in it. But the red lines on the
drawing look just as thin as before. Maybe it waits for Enter, like the color did. Pressing Enter.

### Step 15
`--step $S --key Enter` -> 16.png

16: Enter just highlighted the 8. Lines are still hair thin. Maybe 8 is what they already are.
I will try a much bigger number, 20, and see if anything moves.

### Step 16
`--step $S --key Control+a --type "20" --key Enter` -> 17.png

17: That did it: the 13 ties are now clearly red and thicker than the gray ones, everyone and every
other tie is still on the drawing, and the key says red = "13 edges". You can see where they sit:
a knot in the middle-left (the students around Enjolras), several running into Valjean, and the
one long red tie down to the cluster at the bottom. I'm done -- the answer is 13.

`--end $S`

## Debrief (in character)

**Did I finish?** Yes. 13 ties have 10 or more shared chapters. They are red and thicker on the
whole drawing, with nobody taken off, and the key names them.

**Ease: 5 of 7.**

**What confused me:**

- The find box gives no hint that it takes a condition until you start typing. I typed a
  spreadsheet-style condition on a guess. Without "values" in the placeholder I would have gone to
  Filters, and that takes things away.
- I don't understand the backticks around the number. The first hint showed them, I left them out
  the way you would in Excel, and it told me in red to put them in. The message was clear and I
  fixed it in one go. But it is a key I never use, and I couldn't explain it to a colleague.
- "press Enter to select matches" gives no count until after I press. I'd like to see "13
  edges" before I commit.
- When I added a Color to the selection, it started me on gray (A9A9A9), the color the ties already
  are. If I had stopped there, nothing would have stood out once I clicked away.
- The drawing jumped smaller and moved when the "13 edges" layer was made. Everything was still
  there, but it made me look twice.
- Width started at 8, and the lines were still hair thin at 8. Pressing Enter did nothing. Only
  when I typed 20 did they get thicker. I couldn't tell what the number means or what the plain
  ties are set to.
- The selection drew the ties thick and blue, which looked great. Then they went thin when I
  clicked away. I had to find out on my own that a selection doesn't stay and the style is what
  stays.

**What went well:** The Data side showed me the column name and its range (1 to 31) straight
away. After Enter, the right side listed all 13 ties with their numbers, so I could count them and
check none was under 10, the way I would check rows in Excel.
