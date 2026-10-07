# Session transcript: Dana Okafor (supply chain risk analyst), task T3 "Your own list of ties"

Task: bring friends.csv into the program, get it drawn, and check that all of it arrived (how many
people, how many ties, nothing dropped). Start: empty app. Tool: `real.mjs`, one step at a time;
screenshots 01.png to 08.png in this folder. All commands were run from
`design/ui/studio` with `S=rounds/round-1/sessions/r1-s33b`.

## Step by step

### 1. Start

`node tool/real.mjs --start $S empty` -> 01.png (the start waited a few minutes for a free browser
slot before it opened).

Saw: a start page with "Open project or file...", "New from data...", "or drop a file anywhere",
and the line "Files are read on this computer and never uploaded." Top right says "Local only".
Recent projects is empty. Four samples on the right. A box at the bottom: "Your data is yours, but
please help us" with "Share usage data" / "No thanks".

Think-aloud: "'Files are read on this computer and never uploaded' -- that is the first thing IT
asks me, and it answers it on the front page. Good. Share usage data? No. I don't share anything
until IT says so."

### 2. Decline usage data

`--step $S --click "No thanks"` -> 02.png. The box went away.

### 3. Open the file

Think-aloud: "Two choices: 'Open project or file' and 'New from data'. I have a file, so 'Open
file'. I hesitated a second -- 'New from data' also sounds like import -- but 'open file' is what
every program calls it."

`--step $S --click "Open project or file..." --upload friends.csv` -> 03.png

Saw: it opened straight into a drawing. 20 blue balls with arrows between them in a ring-ish
shape. Right panel "Graph, From friends.csv", Overview: Nodes 20, Edges 41, Direction Directed,
Density 0.1079, Components 1, Edges per node 3 to 6, mean 4.1. Left: a search box, "Selection",
"Everything". No names on the dots.

Think-aloud: "It just drew it. No dialog asking which column is 'from' and which is 'to'. That's
fast, but it also means it guessed and didn't tell me what it guessed. 20 nodes -- I assume
'nodes' means people. 41 edges -- ties. 'Directed'? My friend's list is who knows whom; knowing
someone goes both ways. I'll let it go but I'd want to know why it decided that. Density,
components -- don't know, skipping. And no names on any dot, so I can't tell if the names came
through."

Hesitation: whether the counts match the file. The overview gives totals but nothing about how many
rows were in the file or whether any were thrown away.

### 4. Look for the data

`--step $S --click "Data"` -> 04.png

Saw: left panel now shows "Sources: friends.csv 20 nodes, 41 edges", below it "Node ... 20 rows,
20 nodes" and "Edge t... 41 rows, 41 edges". "Attributes: Nodes: id; Edges: weight".

Think-aloud: "This is what I wanted. 41 rows in, 41 edges out. That's my 'nothing dropped' --
though I had to work it out myself by comparing two numbers; it doesn't say 'all rows loaded' in
words. And the weight column came along. The labels are cut off: 'Node ...', 'Edge t...'. On my
laptop screen with these tiny grey letters I'd be squinting. Where did a 'node table' with 20 rows
come from? My file only has the links. I guess it made the people list up from the links."

### 5. Try to see the rows

Think-aloud: "I want to see the actual table -- that's where I check things."

`--step $S --click-at 160,200` -> 05.png. The tool reported: treeitem "Edge table".

Saw: the whole screen changed to "Add to friends -- Tables + -- Drop a file here, or choose a
file... -- Direction: As the file says -- Cancel / Load (Load greyed, 'Choose a file first')".

Think-aloud: "What? I clicked my table and it wants me to add another file. I wanted to look at my
rows, not load more. That's confusing -- I almost thought I'd broken something. Cancel."

Hesitation: the biggest one in the session. Clicking a loaded table opens an "add a file" screen,
with no view of the rows already loaded.

### 6. Back out

`--step $S --click "Cancel"` -> 06.png. Back to the drawing with the same Data panel. Nothing was
changed.

### 7. Check that names arrived

Think-aloud: "The dots still have no names. Let me click one."

`--step $S --click-at 640,578` -> 07.png. The tool reported: node with id "Ava".

Saw: the dot is highlighted yellow; right panel "Ava, Node", Summary: id Ava, Degree 6.

Think-aloud: "OK, Ava. So names did come in, they're just not drawn. 'Degree 6' -- I don't know
that word; I'd guess six ties. I'd want the names on the dots by default -- otherwise this is a
picture of balls."

### 8. One more try for a table

Think-aloud: "The Graph side had 'Everything'. Maybe that lists everyone."

`--step $S --click "Graph" --click "Everything"` -> 08.png. (The tool noted "Graph" matched two
controls and took the first, the left-hand button.)

Saw: right panel "Everything -- Style / Values -- Nodes / Edges -- Fill Color #63..., Shape Size 1,
Shape Icosphere, Effects, Label, Tooltip".

Think-aloud: "That's colors and shapes. 'Icosphere' -- no idea. Not a list of people. I'll stop
here, I have my numbers."

### 9. End

`node tool/real.mjs --end $S`

## Verdict, in character

- **Did I finish?** Yes, mostly. It's in, it's drawn, 20 people, 41 ties, and the Data screen says
  41 rows became 41 ties, so nothing was dropped. I never saw the rows themselves, and I'm taking
  the "people" count on faith because nobody told me it built the people list out of the links.
- **How hard (1-7, 7 = very hard):** 3. Loading was easy -- easier than Power BI or Gephi ever
  was. Checking it arrived was the hard part.
- **What confused me:**
  1. It never asked which column was "from" and which was "to", and never told me what it guessed.
     It also decided the ties were "Directed" without saying why; for "who knows whom" that's
     wrong for me.
  2. "Nothing dropped" is something I had to work out by comparing "41 rows" with "41 edges" in
     small grey text. One line like "41 of 41 rows loaded" would have answered it.
  3. Clicking my edge table opened an "Add to friends / drop a file" screen instead of showing me
     the rows. I could not find a table of my data anywhere.
  4. No names on the dots; I had to click one to learn it was "Ava".
  5. Labels cut off ("Node ...", "Edge t...") and tiny low-contrast text throughout the panels.
  6. Words I don't use: nodes, edges, degree, density, components, icosphere.
- **What I liked:** "Files are read on this computer and never uploaded" on the front page -- that
  answers IT before they ask. And it opened the file and drew it in one step.
