# Session r3-s42 -- Tom (lab manager, recipe recipient), task T7 prompt B (running club)

Task as given: "You have never used this program before. A friend's list of who in your running
club knows whom is already drawn in it. Have the program put the people in order of how much the
whole club depends on them, and tell us the top three, in order, and what the order was based on."

## Step 1 -- start

Command: `node tool/real.mjs --start <session> setup:rounds/round-3/setups/T7-B.txt`

Saw (01.png): a drawing of blue dots joined by arrows, titled "friends". Left panel: a search box,
"Selection", "Everything". Right panel: Graph, From friends.csv, Overview: Nodes 20, Edges 41,
Directed, Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. Bottom left in small grey:
"Analyze (flask) in the toolbar (Shift+A) to add results here". A toolbar at the bottom with a flask,
a chart icon, "3D" and a magnifier. "Local only" up top -- good, the club list stays here.

Tom: "OK, so that's the club. Twenty people, 41 connections. No names on the dots, though. The
little note at the bottom says the flask thing analyzes. That's the only hint I've got, so I'll press
the flask."

## Step 2 -- click the flask

Command: `--step <session> --click-at 679,864` -> `at 679,864: button "Analyze"`

Saw (02.png): a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness,
Closeness, PageRank (with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance,
then grey ones (Depth-first order "Select a node first", Most flow). Each has a small grey line under it.

Hesitation: a wall of names. Tom: "I don't know what any of these are, and I'm not learning them
at 4 pm. 'Rank' is the word I want, at least. One of them says 'Start here', so somebody thinks that's
the one. I'll take the one it tells me to." (He did not read the grey lines under each name; they are
small and grey.)

## Step 3 -- click PageRank

Command: `--step <session> --click "PageRank"`

Saw (03.png): a small box "PageRank -- Which nodes are connected to other well-connected nodes."
Fields: "Damping factor 0.85", "Weight: None", a collapsed "Advanced", "Under a second", a blue Run.

Hesitation: "Damping factor? Weight? This is the 'choose your mapping type' stuff I can't answer.
I'm not touching those. It already has numbers in, so I'll leave them and press Run."

## Step 4 -- press Run

Command: `--step <session> --click "Run"`

Saw (04.png): the dots turned orange to dark brown. A box top left: "Color: PageRank 0.04382 [orange
bar] 0.06608". Left panel gained a row "PageRank 20". Still no names on any dot.

Tom: "Well, it did something -- they changed color, so I know it ran. Darker is presumably more.
But orange to brown, three or four of them look about the same dark to me, and the numbers are
0.04 to 0.066 -- I can't rank twenty dots by shade, and I don't know who any of them are. I need a
list. There's a 'PageRank 20' line on the left now; that's the thing I just made, I'll open it."

## Step 5 -- click "PageRank" on the left

Command: `--step <session> --click-at 155,156` -> `treeitem "PageRank"`

Saw (05.png): the row is highlighted with an eye icon. Right panel now says "PageRank -- Measure
from PageRank, Oct 7", with Style selected: Nodes/Edges, Fill, Color: PageRank, Shape, Effects,
Label, Tooltip, each with a plus.

Tom: "That's the colors page. I don't want to restyle anything. Next to 'Style' it says 'Values' --
values are numbers, that's what I'm after."

## Step 6 -- click "Values"

Command: `--step <session> --click-at 1272,104` -> `tab "Values"`

Saw (06.png): a row of bars (0.04382 to 0.06608, "20 of 20 have a value ... median 0.04736"), then
"Top 10" with names and numbers: Farah 0.06608, Ava 0.06423, Hana 0.05883, Ivan 0.05575,
Gus 0.0547, Jada 0.0483, Theo 0.04826, Sana 0.04806, Ravi 0.04785, Quinn 0.04758. Below, "Made
with: Analysis PageRank, Ran Oct 7, Damping factor 0.85, Weight None".

Tom: "There. Names and numbers, in order. That's what I wanted from the start. Farah, Ava, Hana.
And it says underneath what it was made with -- PageRank. Good, I can write that down."

Hesitation, said out loud: "Whether PageRank is really 'how much the club depends on them', I
couldn't tell you. The line said 'connected to other well-connected' people. That's popular, not
necessarily depended on. It said 'Start here', so I went with it. I'd probably ask her about that bit."

## End

Command: `node tool/real.mjs --end <session>`

### Answer, in character

Top three: 1. Farah (0.06608), 2. Ava (0.06423), 3. Hana (0.05883). The order is based on PageRank,
which the program describes as "which nodes are connected to other well-connected nodes" (damping
factor 0.85, no weight), run from the flask (Analyze) button.

### Did I finish?

Yes, in five clicks after the drawing appeared. I have an answer and I can say what it was based on.
I am not sure it is the right measure for "depends on"; I picked the one marked "Start here".

### Ease: 5 out of 7

### What confused me

- The list of analyses was a page of names I do not know (Betweenness, Katz, HITS, Eigenvector).
  The grey lines under them are small; I only went with PageRank because of the "Start here" tag,
  not because it matched my question. Nothing told me which one answers "who does the club depend on".
- After Run, all I got was a color change, orange to brown. Several dots looked the same shade to
  me, and none had a name, so the drawing alone could not give me an order. The ranked list was two
  more clicks away: the "PageRank" row on the left, then a "Values" tab on the right. The first of
  those landed on a Style page with colors and pluses, which is not what I was looking for.
- "Damping factor" and "Weight" on the Run box: questions I cannot answer. I left them alone and it
  worked, which is fine, but I did not know whether leaving them was right.
- The dots never showed names on the drawing, so I cannot point at Farah in the picture.
- Good: "Local only" at the top, so the club's list did not go anywhere. Good: the "Made with" box
  under the list told me what the order was based on without my having to remember.
