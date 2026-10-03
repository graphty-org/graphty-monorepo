# Session: size the Les Miserables characters by how much the network depends on them

Participant: Jordan, marketing network analyst (persona: study/personas/marketing-analyst.md)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Make the drawing show which characters the network depends on most: the more it depends on
a character, the bigger that character's dot. Leave the colors as they are."

Outcome: gave up. No dot ever changed size.

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t09--marketing-analyst/. Every command starts with
`timeout 120 node app-b/study.mjs --try <render> task:r8-t09`, followed by the steps listed.

## 01 -- start screen (shots/tasks/r8-t09/01.png)

"OK, a start page. 'Files are read on this computer and never uploaded' and 'Local only' up top
-- good, that's the first thing legal asks me. There's a usage-data banner, I'll say no. Les
Miserables is right there under Samples."

## 02 -- open the sample

Steps: `--click "No thanks" --click "Les Miserables"`

"It opens already colored -- 'Color: PageRank' in the corner, orange to brown. That's the color I
have to leave alone. Big list on the left: PageRank, Louvain, Shortest paths, Density... and down
at the bottom 'Betweenness', with a crossed-out eye. 'Depends on most' -- that's the bridge
people, the ones sitting between the groups. That's betweenness in my book, not PageRank. PageRank
is the 'who knows the popular kids' one. So I want dots sized by betweenness."

## 03 -- click the Betweenness row

Steps: `... --click "Betweenness"`

"The right side changed to Betweenness. 'Paints 77 nodes, none visible', 'Covered by PageRank for
Color'. Fine, I don't want its color anyway. There's Fill, Shape, Effects, Label, Tooltip. Size is
probably under Shape."

## 04-06 -- find how to add a size

Steps: `--click "Shape"` (nothing happened); `--click "Add shape"` -> "nothing on screen is called
'Add shape'"; `--hover "Add"` -> tooltip "Add to Shape".

"Clicking the word Shape does nothing. The little plus is 'Add to Shape'. OK."

## 07-08 -- Add to Shape, Size

Steps: `--click "Add to Shape"` (menu: Shape, Size), then `--click "Size"`.

"Size, there we go. It put in a box that says 1 and a little database-can icon. One is one size
for everybody, that's not what I want. I assume the can means 'from data'."

## 09-12 -- what is the can icon?

I rested the pointer on several things trying to get the can's name. Commands (each after the
same steps through `--click "Size"`): `--hover "Size from data"` (nothing called that),
`--hover "Size"` (no tooltip), `--hover "column"` (hit the Columns button at the bottom),
`--hover "data"` (hit the Data tab), `--hover "Bind"`, `"Vary"`, `"Map"`, `"value"`, `"Use"`,
`"Drive"`, `"Size from"`, `"Use a"` (nothing), `"from"` (hit the color chip, "From Betweenness"),
`"Link"` (hit a lock: "This name cannot be changed..."), `"Remove"` ("Remove Size", the minus),
and finally `--hover "Size by"` -> "Size by attribute".

"In real life I'd have just clicked the can. It's 'Size by attribute'. Attribute, sure, I'd
have called it a column."

## 13 -- Size by attribute

Steps: `... --click "Size by attribute"`

"A picker. Under 'nodes': betweenness, degree. Under 'Results': PageRank. Huh -- why is
betweenness a node column and PageRank a result, when they're both sitting in the same list on
the left looking the same? Whatever, betweenness is there."

## 14 -- pick betweenness

Steps: `... --click "betweenness"`

"'Size by betweenness', Linear, sizes 0.5 to 3 px, fit to data, clamp... I'm not touching any of
that. Defaults. But -- the map didn't change. Nothing got bigger. Maybe it applies when I close
this."

## 15 -- close it

Steps: `... --key Escape`

"Closed. Size box still says 1. Every dot is the same size. Did it just throw my choice away?
And that row still says 'none visible'. Oh -- the eye is crossed out. Maybe the whole Betweenness
row is switched off."

## 16-17 -- turn the row on

Steps: `--hover "Show"` (could not hover; it hit "Show Betweenness" under the popup), then
`... --key Escape --click "Show Betweenness"`.

"Eye's on now -- tooltip says 'Hide Betweenness', so it's showing. Still no change. Still says
'none visible'. Size still 1."

## 18 -- try again in a different order

Steps: `--click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Show
Betweenness" --click "Add to Shape" --click "Size" --click "Size by attribute" --click
"betweenness" --click "Close"`

"Eye on first, then size, then the X instead of Escape. Same thing: Size 1, same dots. That's two
failures on this path."

## 19-23 -- try computing it fresh from Analyze

Steps: `--click "No thanks" --click "Les Miserables" --click "Analyze"`, then
`--click "Which nodes sit on the most shortest paths"`, then `--click "Run"`, then
`--click "Betweenness 2"`, then `--hover "Betweenness 2"` (no tooltip).

"The flask is Analyze. Nice that it has a one-line description per measure -- 'Which nodes sit on
the most shortest paths between others', that's the bridges. A weight question with Stronger /
Farther / Capacity -- I'll take the default. It says 'Under a second'. Run. A new row 'Betweenness
2' at the top with a spinner and a little bar under it. I clicked it -- the right side still shows
the graph summary, not my run. Still spinning. It said under a second. I've seen this movie,
that's the closeness-before-lunch thing."

## 24 -- last try: put the size on the PageRank row

Steps: `--click "No thanks" --click "Les Miserables" --click "PageRank" --click "Add to Shape"
--click "Size" --click "Size by attribute" --click "betweenness" --key Escape`

"PageRank is the one that's actually painting, so maybe the size has to live there. Same picker,
picked betweenness, closed it... Size box: 1. Dots: all the same. OK, I'm done."

## Debrief

Did I succeed? "No. I found where size is, I found betweenness, I picked it -- three times -- and
not one dot changed. The box kept saying 1, so either it didn't take or it doesn't show. The fresh
run just spun."

Single Ease Question (1 = very difficult, 7 = very easy): 2.

"The pieces are there and some of it reads well: the Analyze descriptions are in plain words, and
'Local only' up top is what I need for customer data. But: the 'size from data' button is an
unlabeled can icon, it's three clicks deep behind a plus, the popup doesn't change the map while
I'm in it, and after I close it the field still says 1, so I have no idea if I did anything. There
are two betweenness things -- a hidden row on the left and a 'betweenness' node column -- and no
hint which one I'm supposed to use. And 'none visible' with the eye on makes no sense to me."

Would I use this instead of my current tool? "Not today. In Gephi, 'size by betweenness' is the
ranking tab, pick the column, min and max, Apply, and I see it. Here I couldn't make a dot bigger
on a 77-node sample. If I can't do that, I'm not trusting it with a real mention export -- and
honestly, my VP only looks at slide one anyway, so the one thing the picture has to do is make
the big bridges big."
