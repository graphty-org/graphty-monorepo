# Session r3-s55 -- Tom (the recipe recipient), task T16 "First look"

Participant: Tom, 52, lab manager of a cell biology lab. Never built a network; receives files
from the lab's postdoc. 13-inch laptop, reading glasses, mild red-green color weakness.
Task: just installed the program, a short while to decide whether it could help; try it on a
sample or on friends.csv (running club: who knows whom). Start: empty.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s55 empty` -> 01.png

Saw: a dark page. Top left "graphty". Three columns: "Start" (Open project or file..., New from
data..., "or drop a file anywhere in this window", "Files are read on this computer and never
uploaded."), "Recent projects" (empty), "Samples" (Les Miserables, Zachary's karate club,
College football, Florentine families, each with a line of grey description). Top right a lock
and "Local only". A box at the bottom: "Your data is yours, but please help us." with "Share usage
data" and "No thanks".

Tom: "Files are read on this computer and never uploaded. Good, that's the first thing I'd want
to know. And 'Local only' up top. The grey text is small, I had to lean in. The box at the bottom
wants to collect something -- I'm not sharing anything, no thanks."

## Step 2 -- dismiss the usage box

Command: `--step --click "No thanks"` -> 02.png

Saw: the box went away; bottom line now says "Usage data stays off. Change this in Settings >
Privacy." Nothing else changed.

Tom: "Fine. It remembered I said no. Now -- it says drop a file anywhere. The running club file
isn't anything sensitive, so I'll just drag it in from Downloads, that's what I always try first."

## Step 3 -- drag friends.csv onto the window

Command: `--step --drop friends.csv` -> 03.png

Saw: straight to a drawing, no questions asked. Title top left "friends". Light canvas with 20
blue balls joined by grey arrows, in a loose ring. Left panel: "Graph friends.csv", a find box,
"Selection", "Everything", and at the bottom "Analyze (flask) in the toolbar (Shift+A) to add
results here". Right panel: "Graph / From friends.csv", tabs "Style" and "Values", "Overview":
Nodes 20, Edges 41, Direction Directed, Density 0.1079, Components 1, Edges per node "3 to 6,
mean 4.1". Toolbar at the bottom center: a flask, a chart-ish icon, "3D", a magnifier.

Tom: "Well, that opened, first time, no 'select key column'. That already beats what happened
with the .cys. 41 edges -- the file has 41 rows, so it took all of them. 20 people. But they're
all the same blue ball and there are no names on them. Who's who? And 'Directed' -- knowing
someone goes both ways, why are there arrows? Density 0.1079, I don't know what I'd do with that.
Let me click one of the balls and see if it tells me who it is."

## Step 4 -- click a ball in the lower middle

Command: `--step --click-at 640,578` -> 04.png (tool: node "Ava")

Saw: the ball turned brownish with a yellow ring. Right panel now "Ava / Node": id Ava, Degree 6
with a little arrow. Left panel "Selection 1".

Tom: "So that's Ava. Degree 6 -- I'm guessing that means six people she's connected to; there are
six lines on her. OK. But I had to click to find out who she was. I'm not going to click twenty
balls. The thing at the bottom left keeps telling me to press the flask to 'add results'. It's
the biggest thing on the toolbar. Let's see what it offers -- if it's a list of algorithm names
I'm out."

## Step 5 -- open the flask (Analyze)

Command: `--step --click-at 680,864` -> 05.png (tool: button "Analyze")

Saw: a list popped up over the drawing, "Filter analyses" box at the top, heading "Rank nodes and
edges", then Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a blue "Start here"
tag), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order, Most flow... each with a
grey line under it.

Hesitation: this is the list of names I said would end it. Katz, HITS, Eigenvector -- no idea.
"Start here" is on PageRank, which I've heard of from Google and that's all.

Tom: "There it is, a page of algorithm names. I'm not learning Katz at 4 pm. But the first one is
Degree, and I just saw Degree on Ava -- 'how many edges each node has'. That one I understand. If
I pick it, maybe it shows everyone's number at once instead of me clicking each ball. The 'Start
here' one I'd skip; I don't know what PageRank would tell me about a running club."

## Step 6 -- pick Degree (the tool clicked the wrong "Degree")

Command: `--step --click "Degree"` -> 06.png. Tool note: "ambiguous: matches 2 controls (button
'Degree 6' in the right panel, option 'Degree' in the list); took the first". So the click
landed on the "Degree 6" row of Ava's panel, not on the Degree entry in the list I meant. This
is a tool misfire, not something Tom did; a person pointing at the list would have hit the list.

Saw anyway: the list closed. Ava and six other balls now have yellow rings. Right panel: "Ava /
Neighborhood", "Ava's 6 connections", a table Neighbor / weight: Chloe 5, Ben 3, Dev 2, Ivan 1,
Sana 1, Theo 1. Left panel "Selection 7".

Tom: "Huh, that's not what I meant, but it's useful: those are Ava's six people, with names, and
a 'weight'. Chloe 5. I don't know what weight is in a running club -- how well they know each
other? How many runs together? The file didn't say, so I can't tell. Anyway, I still want
everyone's number at once. Let me open the flask again and actually pick Degree from that list."

## Steps 7 and 8 -- reopen the flask, pick Degree from the list

Commands: `--step --click-at 680,864` -> 07.png (the same list as before);
`--step --click "role=option:Degree How many edges each node has."` -> 08.png

Saw: a small card above the toolbar: "< Degree", "How many edges each node has.", "Under a
second", and a blue "Run" button. Ava's neighbor table and the yellow rings are still there.

Tom: "It wants me to press Run. 'Under a second', fine, at least it tells me it's not going to
spin for ten minutes. Run."

## Step 9 -- Run

Command: `--step --click "Run"` -> 09.png

Saw: all the balls changed from blue to shades of brown and orange. A small box top left of the
drawing: "Color: Degree", a bar from 3 (dark brown) to 6 (bright orange). Left panel gained a
row "Degree 20" with a little orange bar. Ava's seven are still ringed in yellow, and those look
brighter than the rest.

Hesitation: I can't really tell 3 from 6 by the shade. Brown, orange, they all look about the
same to me, and the yellow rings on the ones I'd clicked make those look like the "high" ones --
are they high, or just still selected?

Tom: "So it did something -- it colored them, and there's a little legend: 3 to 6. That's
honest, at least it says what the color is. But I can't read a shade of brown from across a
table, and nothing here says who has 6. The ringed ones look the brightest; I'd guess that's
just because I clicked them. On the left there's 'Degree 20' now -- 20, that's how many people
there are. Let me click that; maybe it lists them."

## Step 10 -- click "Degree 20" on the left

Command: `--step --click-at 148,156` -> 10.png (tool: treeitem "Degree")

Saw: the Degree row is highlighted with an eye icon. Right panel now "Degree / Measure from
Degree, Oct 7", tabs Style (selected) and Values, Nodes / Edges switch, then Fill +, Color
"Degree" -, Shape +, Effects +, Label +, Tooltip +. Drawing unchanged.

Tom: "This is the styling page -- shape, effects. That's the postdoc's job, not mine. I wanted a
list of who's got what. There's a 'Values' tab next to Style; values is numbers. Try that."

## Step 11 -- Values tab

Command: `--step --click "Values"` -> 11.png

Saw: "Values": a small grey bar chart from 3 to 6, under it in tiny grey "20 of 20 have a value,
3 to 6, median 4". "Top 10": Ava 6, Ivan 5 -- and nothing else. "Made with": Analysis Degree,
Ran Oct 7.

Hesitation: it says Top 10 and shows two names. Where are the other eight? Is that a mistake, or
does it only show the ones that stand out?

Tom: "Now that's what I wanted -- names and numbers. Ava has the most, 6, then Ivan, 5. 'Median
4', so most people know about four others. 20 of 20 have a value -- good, nobody fell out. But
'Top 10' with two names in it -- I'd count, and that's two, not ten. If I put that on a slide
somebody would ask where the rest are. I'd probably ask her about this bit."

Tom (reading the result back): "So Ava's the best connected in the club, Ivan's next, and
everyone else knows three or four people."

Next: "If I were going to show this to anyone, I'd want the names on the balls, not just in the
side panel. There was a 'Label' with a plus on that Style page. That's plain English. One try."

## Step 12 -- back to Style

Command: `--step --click "Style"` -> 12.png

Saw: the Style page again; "Label" with a + at the right edge.

Tom: "There, Label, plus. Click the plus."

## Step 13 -- the + next to Label

Command: `--step --click-at 1420,298` -> 13.png (tool: button "Add label line")

Saw: a box "Label" with "Find an attribute", then "Attributes: id", then "Degree: Degree, Degree
rank, Degree percentile, Degree in degree, Degree out degree". In the side panel a new row
"Pick an attribute".

Hesitation: there's no "name". "Attribute" is a word I wouldn't use. But on Ava's panel earlier,
"id" said "Ava" -- so id is the name.

Tom: "No 'name' in there. 'id'... when I clicked Ava it said id: Ava. So id is the name. Pick id."

## Step 14 -- pick "id"

Command: `--step --click-at 1106,436` -> 14.png (tool: option "id")

Saw: names appeared above the balls: Omar, Pia, Quinn, Ravi, Nora, Milo, Lena, Sara, Kofi, Theo,
Jada, Ivan, Ava, Hana, Gus, Ben, Chloe, Dev, Eli... In the side panel: "Aa Above", "Abc id",
"20 labels, 1 hidden", a "Show all labels" box. Some names are very small (Hana, Jada, Lena) and
two at the bottom overlap (Dev and Eli).

Tom: "There. Now it's a picture I could put in front of somebody: names, and the legend says the
color is how many people they know. Some of the names are tiny -- I'd need my glasses for Hana
and Jada -- and down at the bottom Dev and Eli are on top of each other. '1 hidden', so somebody's
name isn't showing at all and I'd have to go hunting for who. That's enough for today."

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s55`

## Verdict, in character

**Did I finish?** Yes, as far as this task goes. I opened the running club file by dragging it
in, it drew straight away with nothing to set up, it took all 41 rows and 20 people, I ran one
analysis (Degree), and I read the answer: Ava knows the most people (6), Ivan next (5), and most
people know about four (median 4). I got the names onto the picture. About five minutes.

**Would I keep using it?** "For opening what she sends me -- probably yes. It opened first time,
nothing to install, and it says on the front page the files stay on this computer, which is the
first thing I'd have asked. I wouldn't go looking for things to do in it on my own; that list of
analyses is her world, not mine. But if she sends me a file and it opens like this one did, I'd
use it instead of asking for a PNG."

**Ease: 5 out of 7.** Opening was a 7. Getting an actual answer out of it took more poking than
it should.

**What confused me:**

- The balls had no names until I went into the styling page and added a "label" from something
  called "id". I had to remember that clicking Ava had said "id: Ava" to know id meant the name.
- The flask opened a page of algorithm names (Katz, HITS, Eigenvector). I only picked Degree
  because I'd seen the word on Ava a minute before. "Start here" was on PageRank and I didn't
  know what that would tell me.
- After Run, the colors went brown to orange, and I could not tell 3 from 6 by the shade. The
  balls I'd clicked earlier still had yellow rings, so they looked like the "high" ones. The
  legend saying 3 to 6 helped; the drawing on its own didn't.
- "Top 10" listed two people. I'd count, and two isn't ten. I don't know if the rest are missing
  or if it only shows the ones that stand out.
- The file is "who knows whom", but the drawing has arrows and the overview says "Directed".
  Knowing someone goes both ways, so the arrows made me wonder if it had read the file wrong.
- Ava's people had a "weight" (Chloe 5, Ben 3). Nothing told me what weight meant.
- Clicking the Degree result on the left took me to Style (fill, shape, effects) when I wanted
  the list of who has what; the list was under the other tab, "Values".
- Small grey text everywhere (the sample descriptions, "20 of 20 have a value", "20 labels, 1
  hidden"); some name labels were tiny, two overlapped, and one was hidden.
- "Density 0.1079" and "Edges per node 3 to 6, mean 4.1" -- I didn't know what I'd do with those.

Session note (not Tom): at step 6 the tool resolved the name "Degree" to the "Degree 6" row in
the right panel instead of the Degree entry in the Analyze list, which opened Ava's neighbor
list; the participant then reopened the list and picked Degree by its full option name.
