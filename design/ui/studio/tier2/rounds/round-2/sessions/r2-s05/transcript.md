# Session r2-s05 -- Nadia (bank alert reviewer, returning), task T20 A (bus-stops.csv)

Build: 8f0d5a6f7791 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/), viewport 1440 x 900.

Disclosure for graders: while locating the task section, this participant also read the task's
"Words avoided" note, which names two controls on the target path ("Higher means" and the choice
"Farther"). Treat any direct jump to those controls with that in mind; the notes below say when a
step was guided by what was on screen.

Prompt: "You have used this program a few times. A colleague sent bus-stops.csv, in your Downloads
folder: each row is a bus link between two stops and the minutes it takes. Bring it into the program
so that every calculation treats more minutes as a longer trip, then work out the quickest way from
Depot to Harbor: which stops, in order, and how many minutes in all. Show us where the program says
it used the minutes."

Commands run from design/ui/studio/tool with REAL_DIST set; S=../tier2/rounds/round-2/sessions/r2-s05.

## Step 01 -- start
`node real.mjs --start $S empty` -> 01.png

Start screen with the usage-data box at the bottom. Normally I open the alert file with "Open
project or file...". There is also "New from data..." which I have not used. First I dismiss the
data box with "No thanks".

## Step 02 -- dismiss data box
`node real.mjs --step $S --click "No thanks"` -> 02.png

Box gone. I open the file the way I always do.

## Step 03 -- open the file
`node real.mjs --step $S --click "Open project or file" --upload bus-stops.csv` -> 03.png

New to me: a screen "Open as a new graph" before the drawing. It shows the rows: from, to, minutes.
Under minutes it says "Attribute", and right below: "Weight: none (each edge counts 1)". That is
the problem in one line -- the minutes would not count. I'll open the dropdown under "minutes" and
see what it can be.

## Step 04 -- click "minutes" (refused)
`node real.mjs --step $S --click "minutes"` -> 04.png (tool: ambiguous, the column header button
and the combobox "Role of minutes"; nothing happened)

## Step 05 -- open the role list for minutes
`node real.mjs --step $S --click "Role of minutes"` -> 05.png

The list: From, To, Weight, Date or time, Edge id, Attribute (ticked). "Weight" is the word the
line above the table used ("Weight: none"). I'll pick Weight.

## Step 06 -- minutes as Weight
`node real.mjs --step $S --click "Weight"` -> 06.png

Now it says "Weight: minutes", and a new row "Higher means: Not set | Closer | Farther | Capacity",
with a sentence: "Until you do, a path counts every edge as one step, and PageRank and communities
read a higher weight as closer." So picking Weight alone is not enough -- good that it says so.
More minutes is a longer trip, so for me higher means farther apart. (I knew from the task notes
that a "Farther" choice exists; the sentence on screen would have led me to it anyway.) Click
Farther.

## Step 07 -- Farther
`node real.mjs --step $S --click "Farther"` -> 07.png

"Weight: minutes (farther)". Sentence: "A higher weight means farther apart, such as a longer
distance or travel time; a path takes the smallest total." That is exactly my case. Direction at
the bottom says "As the file says" -- I don't know if buses run both ways; I leave it. Load.

## Step 08 -- Load
`node real.mjs --step $S --click "Load"` -> 08.png

Drawing with 10 dots and arrows, no names on them. On the right, Graph > Values > Overview: Nodes
10, Edges 17, Direction Directed, "Loaded weight: minutes (farther)". Good, that's one place it says
it took the minutes. Now the quickest way from Depot to Harbor. I have only ever used the analysis
button in the toolbar (the flask) to rank people; I'll look there for something about routes.

## Step 09 -- analysis list
`node real.mjs --step $S --click-at 679,864` -> 09.png (button "Analyze")

The list I know, "Rank nodes and edges": Degree, Betweenness, ... PageRank "Start here". Nothing
says route on screen. There's a "Filter analyses" box at the top with the cursor in it. I'll type
what I'm after: "quickest".

## Step 10 -- type "quickest"
`node real.mjs --step $S --type "quickest"` -> 10.png

It found one: "Shortest path -- The fewest steps, or the shortest path by weight, between two
nodes." under "Find paths and edge sets". That's it. Click it.

## Step 11 -- Shortest path form
`node real.mjs --step $S --click-at 565,806` -> 11.png

A small form: From "Where the path starts", To "Where the path ends", Follow "Out | All" (All is on),
Weight "minutes (farther, loaded)" already filled in, Advanced, "Find path". Weight is already
minutes -- nice, I didn't have to do anything. "Follow Out / All" -- not sure; out from what? I
leave it as it is. Type Depot into From.

## Step 12 -- type Depot
`node real.mjs --step $S --click "Where the path starts" --type "Depot"` -> 12.png

A suggestion "Depot" drops down. Pick it.

## Step 13 -- pick Depot
`node real.mjs --step $S --click-at 556,627` -> 13.png (option "Depot")

From says Depot, and the To box is highlighted for me. Type Harbor.

## Step 14 -- type Harbor
`node real.mjs --step $S --type "Harbor"` -> 14.png

Suggestion "Harbor". Pick it.

## Step 15 -- pick Harbor
`node real.mjs --step $S --click-at 557,681` -> 15.png (option "Harbor")

Depot to Harbor, minutes as the weight. "Find path" is highlighted. Click it.

## Step 16 -- Find path
`node real.mjs --step $S --click "Find path"` -> 16.png

The route is drawn in black, thick arrows, with a small key "Shortest path -- On the path". Left
list now has "Shortest path  4 hops". Right side, Summary: "Path 5 nodes, 4 edges", "Total minutes
14". "Nodes in order": Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. "Made with": Analysis Shortest
path, From Depot, To Harbor, Follow All, Weight "minutes (farther)".

I checked it against the rows I saw on the load screen: Depot-Market 4, Market-Park 3, Park-Clinic
4, Clinic-Harbor 3 = 14. The other obvious route, Depot-Market-Library-Harbor, is 4+6+5 = 15, and
Depot-School-Harbor is 21. So 14 holds up.

Where it says it used the minutes: "Total minutes 14" in the Summary, "Weight: minutes (farther)"
under "Made with", and "Loaded weight: minutes (farther)" in the graph's Overview. That's enough for
QA: one picture plus those lines.

I'm done. `node real.mjs --end $S`

## End of session, in character

**Finished?** Yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all. The
program shows it used the minutes in three places: the load screen ("Weight: minutes (farther)"),
the graph's Overview ("Loaded weight: minutes (farther)") and the result itself ("Total minutes 14";
"Made with ... Weight: minutes (farther)").

**Ease: 6 of 7.** About two minutes, which is an alert's worth. I'd take this over writing the chain
down from lists of connections.

**What confused me or slowed me down:**
- The load screen is new to me (before, opening a file just drew it). It was clear, but the minutes
  column came in as "Attribute" with "Weight: none (each edge counts 1)" -- if I hadn't read that
  line I would have loaded it as-is and every calculation would have ignored the minutes. Nothing
  stops you; it's one small grey line.
- Picking "Weight" was not enough on its own: the "Higher means" row then appeared with "Not set"
  chosen, and the sentence said a path would still count every edge as one step. The sentence
  explained it well, but it's a second decision hidden behind the first.
- The analysis list did not show anything about routes on its first screen; I only found "Shortest
  path" because I typed "quickest" in the filter box. Someone who scrolls might find it under "Find
  paths and edge sets" further down; I didn't check.
- "Follow: Out / All" -- I don't know what that means here. All was on and I left it. Are the buses
  one-way? The file had arrows (Overview said Directed). If "All" lets the route go backwards along
  a one-way link, QA would ask. I can't tell from the screen whether the answer would differ with
  "Out".
- The left list says "4 hops" right next to a result I think of in minutes. "Hops" is the word I
  never know -- here it's the number of rides, I think, but it sits where I expected the 14.
- No stop names are drawn on the map, so the picture alone doesn't say which dot is Depot or
  Harbor; I'd need the names on for the alert file.
