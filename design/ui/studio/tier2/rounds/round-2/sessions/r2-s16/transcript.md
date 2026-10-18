# Session r2-s16 -- Alex (returning operations analyst), task T22, dataset B (Les Miserables)

Build: frozen build 8f0d5a6f7791 (`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`).
Tool: `node ../tool/real.mjs` run from `design/ui/studio/tier2`, session folder `rounds/round-2/sessions/r2-s16`.

Task (as given): the Les Miserables network is open; each tie counts the chapters two characters share.
Without taking any character or tie off the drawing, make every tie of 10 or more shared chapters stand
out from the rest, and say how many there are.

## Steps

### Start
`node ../tool/real.mjs --start rounds/round-2/sessions/r2-s16 setup:lesmis-ranked.txt` -> 01.png

01.png: Les Miserables is open, colored and sized by PageRank (77 in the left list). Left panel has a
find box "Find nodes, edges, values", Selection, PageRank, Everything. Right panel shows PageRank's Style.
Alex: "OK, the usual. In Gephi I'd go to Appearance, edges, ranking by weight. Here... the find box says
it finds values. Let me see if it knows about the chapter counts on the ties. I'll click into it first."

### Step 1
`--step ... --click "Find nodes, edges, values"` -> 02.png

02.png: the box has focus, nothing dropped down. Alex: "No hints. My edge column is always 'weight', let
me type that and see if it offers the tie column."

### Step 2
`--step ... --type "weight"` -> 03.png

03.png: 'No match for "weight"'. Alex: "So it's not called weight in this file. I don't know what the tie
column is called. The Data place on the left should show me the columns. Let me look there."

### Step 3
`--step ... --click "Data"` -> 04.png

04.png: 77 nodes, 254 edges. Edge attribute is "shared_chapters". There's a "Filters" section with a plus,
but filtering would take ties off the drawing, which I was told not to do. Alex: "shared_chapters, fine.
Let me click it and see what it tells me about the values -- maybe a histogram, maybe a way to color by it."

### Step 4
`--step ... --click "shared_chapters"` -> 05.png

05.png: a summary on the right: Edges, Amount, from the file, 100% have a value, 17 distinct values,
range 1 to 31. No histogram and no count above a value. Alex: "Range 1 to 31, OK. Doesn't tell me how many
are 10 or more. There's a three-dot menu up there -- maybe 'select where' or 'color by' lives in it."

### Step 5
`--step ... --click-at 1419,74` (Attribute actions) -> 06.png

06.png: menu with "Filter to..." and "Show in table". Alex: "Filter would take ties off -- not what I
want. But it's the only thing here that takes a number. Let me just peek at it; if it shows me a count
before it applies, I can get the 'how many' part and back out."

### Step 6
`--step ... --click "Filter to..."` -> 07.png

07.png: "New filter step" panel: Keep an attribute's value, shared_chapters, at least, Value (empty),
"Keeps edges that pass and the nodes at their ends.", Add step. Alex: "'Keeps edges that pass' -- so it
drops the rest. I'll type 10 and see if it previews a count before I commit. I won't press Add step."

### Step 7
`--step ... --click "Value" --type "10"` -> 08.png

08.png: Value 10, Add step lit up. No preview count, no "would keep N". Alex: "Nothing tells me how many
before I commit, and committing drops the rest. Not doing that. Back to the Graph side -- the find box
said 'values'. Now I know the column name, let me try it there."

### Step 8
`--step ... --click "Graph"` -> 09.png

09.png: back on Graph; the filter panel I left closed without adding anything (good). The find box is
empty again. Alex: "Let me type the real column name in the find box and see what it offers."

### Step 9
`--step ... --click "Find nodes, edges, values" --type "shared"` -> 10.png

10.png: 'No match for "shared"'. So the find box doesn't know column names. Alex: "Hm. It says 'values'.
I write SQL all day -- let me just try a condition, like a WHERE clause, and see if it understands."

### Step 10
`--step ... --type "_chapters >= 10"` (box now reads "shared_chapters >= 10") -> 11.png

11.png: a hint under the box: "Start with = to select by a value: =shared_chapters >= `10`". Alex: "Oh, so
it does take a condition, it just wants an equals sign in front. The backticks round the 10 are weird --
is that literal? I'll copy what it shows me exactly, backticks and all, so I don't second-guess it."

### Step 11
`--step ... --key Control+a --type '=shared_chapters >= `10`'` -> 12.png

12.png: "Rule: press Enter to select matches". No count yet. Alex: "OK, Enter."

### Step 12
`--step ... --key Enter` -> 13.png

13.png: "13 edges selected". The 13 ties are drawn thick and blue on the full drawing; nothing was taken
off (still 77 characters). The right panel lists every selected tie with its shared_chapters, from
Cosette -- Valjean 31 down to two at exactly 10 (MmeMagloire -- Myriel, Bossuet -- Enjolras), so the
10s are included. Alex: "There. 13. And it lists them with the numbers, which I can actually check --
that's better than Gephi, where I'd be squinting at a ranking slider. The blue is fine against the orange,
I can tell those apart. My worry is it's only a selection -- one stray click and it's gone before my
colleague sees it. Let me look at the Style tab here to see if I can make it stick."

### Step 13
`--step ... --click "role=tab:Style"` -> 14.png

14.png: the selection's Style tab: Line +, Arrows +, Label +. Alex: "Line, plus. Let me see if giving these
a line style makes it a real style, not just a selection highlight."

### Step 14
`--step ... --click-at 1419,136` (Add to Line) -> 15.png

15.png: menu: Color, Width, Opacity, Pattern, Curved. Alex: "Width. Thicker lines are what I'd use in the
deck anyway."

### Step 15
`--step ... --click "Width"` -> 16.png

16.png: a new item "13 edges" appeared in the left list, labeled Layer on the right, with Line Width 8.
Alex: "Oh, it made it its own thing, '13 edges'. Good -- that's a saved style, not just a highlight. Let me
click empty canvas to drop the selection and check the thick lines stay."

### Step 16
`--step ... --click-at 1100,750` (empty canvas) -> 17.png

17.png: selection cleared. "13 edges" is still in the left list (no count beside it), but on the drawing
I can't see any thick ties any more -- everything looks the same gray thin lines as before. Width 8 did
nothing I can see. Alex: "Wait. So the blue was just the selection. The width I set doesn't show. Let me
open '13 edges' and give it a color too -- color I'll definitely see."

### Step 17
`--step ... --click "13 edges"` -> 18.png

18.png: "13 edges" Layer, Line Width 8, an eye icon beside it in the list (it's on). The drawing still shows
no thick ties. Alex: "It's on and it says 8, and I see nothing. Line plus, Color."

### Step 18
`--step ... --click-at 1419,112 --click "Color"` -> 19.png

19.png: Color added, but it defaults to A9A9A9 -- gray, the same as every other tie, so still nothing
stands out. The legend gained "Edge color: 13 edges" with a gray swatch. Also the whole drawing jumped:
it got smaller and the shape changed (the cluster at the top-left moved), as if it re-laid itself out.
Alex: "Why did the picture move? I didn't touch the layout. And gray on gray, great. I'll type a blue in
there -- blue I can see against the orange."

### Step 19
`--step ... --click-at 1265,160 --key Control+a --type "1F77B4" --key Enter` -> 20.png

20.png: the swatch and legend are blue now, and I can just make out a few blue ties (the one at the bottom
down to the lower hub, a couple near the big hub) -- but they are hairline thin, same as the gray ones.
Width 8 still isn't doing anything. At this zoom you'd miss them. Alex: "Blue, but thin as thread. The
width box says 8 and they look like 1. Let me crank it and see if the box does anything at all."

### Step 20
`--step ... --click-at 1333,194 --key Control+a --type "20" --key Enter` -> 21.png

21.png: at width 20 the 13 ties finally show as clearly thicker blue lines on top of the thin gray ones:
the cluster round the big hub, the Enjolras / Courfeyrac / Combeferre / Bossuet triangle on the left, and
the long one down to the lower hub. Every character and tie is still drawn. Alex: "There. Now they stand
out, they stay after the selection's gone, and the legend says what blue means. Done."

### End
`node ../tool/real.mjs --end rounds/round-2/sessions/r2-s16` -- session ended.

## Debrief (in character)

**Did I finish?** Yes. 13 ties have 10 or more shared chapters. They're drawn thick and blue on the full
drawing, nothing taken off, and they're saved as their own item ("13 edges") with a legend entry.

**Ease: 4 out of 7.**

**What confused me / took longest:**

- I didn't know what the tie column was called, so my first try in the find box ("weight") got "No match".
  I had to go to the Data side to learn it was "shared_chapters". Typing the column name in the find box
  ("shared") also said "No match" -- the box that says it finds values doesn't know the column names.
- The only thing that obviously takes a number is "Filter to..." on the attribute, and that removes the
  rest. It also doesn't tell you how many it would keep before you commit, so I couldn't even use it to
  just count.
- I only found the "type a condition" trick because I tried a SQL-style condition by habit and the box
  answered with a hint ("Start with = ..."). If I hadn't tried that, I'd never have known. The backticks
  round the 10 in the hint looked like something I'd get wrong; I copied them blind.
- Once I pressed Enter it was great: "13 edges selected", the ties lit up, and a list of every one with its
  number, so I could see the two at exactly 10 were included. That part beat Gephi.
- Then the trap: the bright blue was only the selection. When I gave it a width (8) and clicked away, the
  ties went back to looking like every other tie. Width 8 looked like nothing; I had to go to 20.
- Adding a color gave me gray (A9A9A9), the same gray as every other tie, so adding it did nothing until I
  typed a hex code myself. I had to know a hex code.
- When I added the color the whole picture jumped -- smaller, different shape -- and I hadn't touched the
  layout. That would worry me if I'd already arranged it for a slide.
- The new "13 edges" item in the list shows no count beside it, unlike Selection (13) and PageRank (77),
  so after the selection's gone the count isn't visible anywhere.

"It got there, and the list of ties with numbers is the bit I'd actually show my colleague. But making
it stick took me five more clicks than the selection, and if I do this weekly I'd want the highlight to
just be the style."
